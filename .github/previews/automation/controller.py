#!/usr/bin/env python3
"""Serialized desired-state reconciliation. GitHub owns intent; ConfigMaps record recovery."""

import argparse
import json
from datetime import datetime
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "gateway"), str(ROOT / "pilot")]
from control import Cluster
from gateway import parse_snapshot, unique_properties
from identity import CONTROL_HOST, preview_host, assigned_to
from render import render
from github import GitHub, REPO, SHA
from publish import publish

CONTROL = "https://" + CONTROL_HOST
LABEL = "relisten.net/preview-pr"


def poll(operation, timeout=180):
    deadline = time.monotonic() + timeout
    while True:
        result = operation()
        if result:
            return result
        if time.monotonic() >= deadline:
            raise TimeoutError("Preview operation acknowledgement expired")
        time.sleep(2)


def get_https(url):
    with urllib.request.urlopen(url, timeout=10) as response:
        if response.status != 200:
            raise ValueError("Unexpected private response")
        raw = response.read(16 * 1024 + 1)
    if len(raw) > 16 * 1024:
        raise ValueError("Private response exceeds limit")
    return json.loads(raw)


def read_state(raw):
    if len(raw.encode()) > 64 * 1024:
        raise ValueError("Registry exceeds limit")
    state = json.loads(raw, object_pairs_hook=unique_properties)
    if (
        set(state)
        not in (
            {"version", "revision", "previews"},
            {"version", "revision", "previews", "unreferencedImages"},
        )
        or type(state["version"]) is not int
        or state["version"] != 1
        or type(state["revision"]) is not int
        or not 1 <= state["revision"] < 2**63
        or not isinstance(state["previews"], list)
        or len(state["previews"]) > 4
    ):
        raise ValueError("Invalid registry")
    marks = state.setdefault("unreferencedImages", {})
    if not isinstance(marks, dict) or len(marks) > 128:
        raise ValueError("Image cleanup registry exceeds limit")
    for digest, stamp in marks.items():
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
            raise ValueError("Invalid cleanup digest")
        if not isinstance(stamp, str) or datetime.fromisoformat(stamp).tzinfo is None:
            raise ValueError("Cleanup time must include timezone")
    numbers = set()
    slots = set()
    for entry in state["previews"]:
        if set(entry) != {
            "pr",
            "slot",
            "working",
            "rollback",
            "candidate",
            "failedHead",
            "phase",
        }:
            raise ValueError("Invalid registry entry")
        if entry["phase"] not in {"pending", "ready", "retiring", "failed"}:
            raise ValueError("Invalid phase")
        if entry["pr"] in numbers or entry["slot"] in slots:
            raise ValueError("Duplicate registry identity")
        numbers.add(entry["pr"])
        slots.add(entry["slot"])
        for key in ["working", "rollback", "candidate"]:
            candidate = entry[key]
            if candidate is not None:
                if (
                    set(candidate) != {"headSha", "image", "branch", "runId"}
                    or type(candidate["runId"]) is not int
                ):
                    raise ValueError("Invalid candidate")
                render(
                    {
                        "pr": entry["pr"],
                        "slot": entry["slot"],
                        **{k: candidate[k] for k in ["headSha", "image", "branch"]},
                    }
                )
        if entry["failedHead"] is not None and not SHA.fullmatch(entry["failedHead"]):
            raise ValueError("Invalid failed SHA")
        # Validate even an entry left with no image after a failed first deployment.
        preview_host(entry["pr"])
        if type(entry["slot"]) is not int or not 1 <= entry["slot"] <= 4:
            raise ValueError("Invalid slot")
    return state


class Controller:
    def __init__(self, cluster, gh):
        self.cluster = cluster
        self.gh = gh
        self.document = self.cm("preview-system", "preview-registry")
        self.state = read_state(self.document["data"]["registry.json"])
        self.build_states = {}
        self.current_heads = None

    def cm(self, namespace, name):
        return json.loads(
            self.cluster.kubectl(
                "-n", namespace, "get", "configmap", name, "-o", "json"
            )
        )

    def save(self):
        self.state["revision"] += 1
        read_state(json.dumps(self.state))
        self.document["data"]["registry.json"] = json.dumps(
            self.state, separators=(",", ":")
        )
        self.document = json.loads(
            self.cluster.kubectl(
                "replace", "-f", "-", "-o", "json", payload=json.dumps(self.document)
            )
        )

    def snapshot(self, namespace, name, key, field, values):
        document = self.cm(namespace, name)
        old = json.loads(document["data"][key], object_pairs_hook=unique_properties)
        if old[field] == values:
            return old["revision"]
        for value in values:
            if value in old[field]:
                continue
            if field == "routes":
                if "pr" not in value:
                    continue
                number = value["pr"]
            else:
                number = next(
                    (
                        entry["pr"]
                        for entry in self.state["previews"]
                        if value == "https://" + preview_host(entry["pr"])
                    ),
                    None,
                )
                if number is None:
                    raise ValueError("Unknown additive auth origin")
            if self.current_heads is not None:
                if number not in self.current_heads:
                    raise ValueError("Cannot reactivate an ineligible preview")
                head = self.current_heads[number]
            else:
                head = self.gh.pull(number)["head"]["sha"]
            # Snapshot additions are promotion side effects even during repair.
            # Gate them here so no call path can reactivate a closed/revoked PR.
            self.gh.require(number, head)
        new = {"version": 1, "revision": old["revision"] + 1, field: values}
        if field == "routes":
            parse_snapshot(json.dumps(new))
        document["data"][key] = json.dumps(new, separators=(",", ":"))
        self.cluster.kubectl("replace", "-f", "-", payload=json.dumps(document))
        return new["revision"]

    def gateway_pod(self):
        pods = json.loads(
            self.cluster.kubectl(
                "-n",
                "preview-system",
                "get",
                "pods",
                "-l",
                "app=relisten-preview-gateway",
                "-o",
                "json",
            )
        )["items"]
        running = [p for p in pods if p["status"]["phase"] == "Running"]
        if len(running) != 1 or running[0]["metadata"].get("deletionTimestamp"):
            return None
        return running[0]["metadata"]["uid"]

    def acknowledge(self, path, revision, auth=False):
        def check():
            before = self.gateway_pod()
            if not before:
                return False
            try:
                status = get_https(CONTROL + path)
            except (OSError, ValueError):
                return False
            field = "appliedRevision" if auth else "revision"
            return (
                status.get(field) == revision
                and status.get("sourceState") == "ready"
                and (auth or status.get("ready") is True)
                and before == self.gateway_pod()
            )

        poll(check)

    def routes(self, active):
        values = [{"control": True}] + [
            {"pr": e["pr"], "slot": e["slot"]}
            for e in sorted(active, key=lambda e: e["pr"])
        ]
        revision = self.snapshot(
            "preview-system", "preview-gateway-routes", "routes.json", "routes", values
        )
        self.acknowledge("/__preview/gateway", revision)

    def origins(self, active):
        values = [
            "https://" + preview_host(e["pr"])
            for e in sorted(active, key=lambda e: e["pr"])
        ]
        revision = self.snapshot(
            "default", "relisten-preview-web-origins", "origins.json", "origins", values
        )
        self.acknowledge("/__preview/auth", revision, auth=True)

    def reconcile_snapshots(self, active):
        document = self.cm("preview-system", "preview-gateway-routes")
        current = parse_snapshot(document["data"]["routes.json"])
        serving = {(route.host, route.slot) for route in current.routes}
        retained = [
            entry
            for entry in active
            if (preview_host(entry["pr"]), entry["slot"]) in serving
        ]
        # First remove unknown/retired routes and drain. Then acknowledge the
        # complete auth set before adding any missing working routes.
        self.routes(retained)
        self.origins(active)
        self.routes(active)

    def active(self, exclude=None):
        return [
            e
            for e in self.state["previews"]
            if e["pr"] != exclude
            and (self.current_heads is None or e["pr"] in self.current_heads)
            and e["working"] is not None
            and e["phase"] in {"ready", "pending"}
        ]

    def owned(self, resource, number):
        metadata = resource["metadata"]
        if metadata.get("labels", {}).get(LABEL) != str(number):
            raise ValueError("Refusing foreign preview resource")
        expected = (
            "relisten-preview-pr-"
            if resource["kind"] == "Ingress"
            else "relisten-web-preview-pr-"
        ) + str(number)
        if metadata["name"] != expected:
            raise ValueError("Unexpected owned resource name")

    def apply(self, resource, number, head):
        self.gh.require(number, head)
        metadata = resource["metadata"]
        existing = self.cluster.named_objects(
            metadata["namespace"], resource["kind"], metadata["name"]
        )
        for item in existing:
            self.owned(item, number)
        self.cluster.kubectl("apply", "-f", "-", payload=json.dumps(resource))

    def delete(self, resource, number):
        self.owned(resource, number)
        metadata = resource["metadata"]
        payload = {
            "apiVersion": "v1",
            "kind": "DeleteOptions",
            "preconditions": {"uid": metadata["uid"]},
        }
        # kubectl delete does not expose a UID precondition. Raw API keeps a
        # replaced resource safe after an uncertain/interrupted cleanup.
        plural = {
            "Ingress": "ingresses",
            "Deployment": "deployments",
            "Service": "services",
            "ConfigMap": "configmaps",
        }[resource["kind"]]
        group = {
            "Ingress": "/apis/networking.k8s.io/v1",
            "Deployment": "/apis/apps/v1",
        }.get(resource["kind"], "/api/v1")
        path = f"{group}/namespaces/{metadata['namespace']}/{plural}/{metadata['name']}"
        self.cluster.kubectl(
            "delete", "--raw", path, "-f", "-", payload=json.dumps(payload)
        )
        poll(
            lambda: (
                not self.cluster.named_objects(
                    metadata["namespace"], resource["kind"], metadata["name"]
                )
            )
        )

    def retire(self, entry):
        entry["phase"] = "retiring"
        self.save()
        others = self.active(exclude=entry["pr"])
        self.reconcile_snapshots(others)
        self.remove_resources(entry["pr"])
        self.state["previews"].remove(entry)
        self.save()
        for candidate in [entry["working"], entry["candidate"]]:
            if candidate:
                self.gh.status(
                    entry["pr"],
                    candidate["headSha"],
                    "failure",
                    "Private preview retired",
                )

    def frontdoor_ready(self, number):
        def check():
            resources = self.cluster.named_objects(
                "preview-system", "Ingress", f"relisten-preview-pr-{number}"
            )
            if not resources:
                return False
            if not assigned_to(resources[0], preview_host(number)):
                return False
            peers = json.loads(
                subprocess.check_output(
                    ["tailscale", "status", "--json"], text=True, timeout=10
                )
            ).get("Peer", {})
            devices = [
                p
                for p in peers.values()
                if p.get("DNSName", "").rstrip(".") == preview_host(number)
            ]
            return len(devices) == 1 and devices[0].get("Tags") == [
                "tag:relisten-preview"
            ]

        poll(check, timeout=240)

    def smoke(self, entry):
        # Controller-owned Deployment/Pod identity proves what rolled out. A
        # branch-provided /api/status constant alone cannot supply that evidence.
        candidate = entry["candidate"] or entry["working"]
        number = entry["pr"]
        deployment = json.loads(
            self.cluster.kubectl(
                "-n",
                "web-previews",
                "get",
                "deployment",
                f"relisten-web-preview-pr-{number}",
                "-o",
                "json",
            )
        )
        if (
            deployment["spec"]["template"]["spec"]["containers"][0]["image"]
            != candidate["image"]
        ):
            raise ValueError("Rolled-out image identity mismatch")
        origin = "https://" + preview_host(number)
        with urllib.request.urlopen(origin + "/api/status", timeout=15) as response:
            if response.status != 200 or response.read(128) != b"success":
                raise ValueError("Web startup smoke failed")
        request = urllib.request.Request(origin + "/auth/session/start?return_to=%2F")

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None

        try:
            urllib.request.build_opener(NoRedirect()).open(request, timeout=15)
        except urllib.error.HTTPError as response:
            location = response.headers.get("Location", "")
            if response.code != 302 or not location.startswith(
                "https://auth.relisten.net/connect/authorize?"
            ):
                raise ValueError("Shared auth start smoke failed") from None
        else:
            raise ValueError("Expected shared auth redirect")

    def promote(self, entry):
        candidate = entry["candidate"]
        number = entry["pr"]
        head = candidate["headSha"]
        self.gh.require(number, head)
        resources = render(
            {
                "pr": number,
                "slot": entry["slot"],
                **{k: candidate[k] for k in ["headSha", "image", "branch"]},
            }
        )["items"]
        try:
            for resource in resources[:3]:
                self.apply(resource, number, head)
            self.cluster.wait_rollout(
                "web-previews", f"relisten-web-preview-pr-{number}"
            )
            self.apply(resources[3], number, head)
            self.frontdoor_ready(number)
            self.gh.require(number, head)
            active = self.active(exclude=number) + [entry]
            self.origins(active)
            self.gh.require(number, head)
            self.routes(active)
            self.smoke(entry)
            self.gh.require(number, head)
        except Exception:
            entry["failedHead"] = head
            entry["phase"] = "failed"
            self.save()
            self.recover(entry)
            raise
        entry["rollback"] = entry["working"]
        entry["working"] = candidate
        entry["candidate"] = None
        entry["failedHead"] = None
        entry["phase"] = "ready"
        self.save()

    def recover(self, entry):
        number = entry["pr"]
        others = self.active(exclude=number)
        self.reconcile_snapshots(others)
        if entry["working"] is None:
            self.remove_resources(number)
            entry["candidate"] = None
            self.save()
            return
        old = entry["working"]
        current = self.gh.pull(number)
        if not self.gh.eligible(current):
            self.retire(entry)
            return
        current_head = current["head"]["sha"]
        for resource in render(
            {
                "pr": number,
                "slot": entry["slot"],
                **{k: old[k] for k in ["headSha", "image", "branch"]},
            }
        )["items"][:3]:
            self.apply(resource, number, current_head)
        self.cluster.wait_rollout("web-previews", f"relisten-web-preview-pr-{number}")
        entry["candidate"] = None
        self.save()
        try:
            self.gh.require(number, current_head)
            self.origins(others + [entry])
            self.gh.require(number, current_head)
            self.routes(others + [entry])
            self.smoke(entry)
            self.gh.require(number, current_head)
        except Exception:
            self.routes(others)
            self.origins(others)
            raise
        entry["phase"] = "ready"
        self.save()

    def remove_resources(self, number):
        for namespace, kind, name in [
            ("preview-system", "Ingress", f"relisten-preview-pr-{number}"),
            ("web-previews", "Deployment", f"relisten-web-preview-pr-{number}"),
            ("web-previews", "Service", f"relisten-web-preview-pr-{number}"),
            ("web-previews", "ConfigMap", f"relisten-web-preview-pr-{number}"),
        ]:
            for resource in self.cluster.named_objects(namespace, kind, name):
                self.delete(resource, number)

    def repair(self, entry, current_head):
        working = entry["working"]
        resources = render(
            {
                "pr": entry["pr"],
                "slot": entry["slot"],
                **{key: working[key] for key in ["headSha", "image", "branch"]},
            }
        )["items"]
        for resource in resources[:3]:
            self.apply(resource, entry["pr"], current_head)
        self.cluster.wait_rollout(
            "web-previews", f"relisten-web-preview-pr-{entry['pr']}"
        )
        self.apply(resources[3], entry["pr"], current_head)
        self.frontdoor_ready(entry["pr"])
        self.gh.require(entry["pr"], current_head)

    def sweep(self):
        represented = {e["pr"] for e in self.state["previews"]}
        orphans = {}
        for namespace, kinds in [
            ("web-previews", "deployment,service,configmap"),
            ("preview-system", "ingress"),
        ]:
            resources = json.loads(
                self.cluster.kubectl(
                    "-n", namespace, "get", kinds, "-l", LABEL, "-o", "json"
                )
            )["items"]
            for resource in resources:
                number = int(resource["metadata"]["labels"][LABEL])
                self.owned(resource, number)
                if number not in represented:
                    orphans.setdefault(number, []).append(resource)
        if orphans:
            # Derived snapshots come only from the durable registry, so orphan
            # reachability is retired before deleting actual resources.
            self.reconcile_snapshots(self.active())
            for number, resources in orphans.items():
                for resource in sorted(resources, key=lambda x: x["kind"] != "Ingress"):
                    self.delete(resource, number)

    def accept_completed_builds(self, desired, run_id):
        default_sha = self.gh.current_default()
        # Full scans repair a missed workflow_run delivery. Artifacts disappear
        # only after their candidate has been durably recorded.
        artifacts = self.gh.pages(f"/repos/{REPO}/actions/artifacts", "artifacts")
        run_ids = {
            artifact["workflow_run"]["id"]
            for artifact in artifacts
            if re.fullmatch(r"preview-oci-[1-9][0-9]*-[1-9][0-9]*", artifact["name"])
            and not artifact["expired"]
        }
        if run_id:
            run_ids.add(run_id)
        # Existing artifacts bound the work. Consumed build history causes no
        # per-run API traffic and cannot exhaust the repository token budget.
        runs = [
            self.gh.request(f"/repos/{REPO}/actions/runs/{identifier}")
            for identifier in sorted(run_ids, reverse=True)
        ]
        seen = {
            c["runId"]
            for e in self.state["previews"]
            for k in ["working", "rollback", "candidate"]
            if (c := e[k])
        }
        accepted_heads = {
            (entry["pr"], candidate["headSha"])
            for entry in self.state["previews"]
            for key in ["working", "candidate"]
            if (candidate := entry[key])
        }
        for run in runs:
            if (
                run["conclusion"] != "success"
                or run["path"] != ".github/workflows/preview-build.yml"
                or run["event"] != "workflow_dispatch"
            ):
                continue
            owned = [
                a
                for a in artifacts
                if a["workflow_run"]["id"] == run["id"]
                and a["name"] == f"preview-oci-{run['id']}-{run['run_attempt']}"
                and not a["expired"]
            ]
            if not owned:
                continue
            if run["id"] in seen:
                for artifact in owned:
                    self.gh.request(
                        f"/repos/{REPO}/actions/artifacts/{artifact['id']}", "DELETE"
                    )
                continue
            match = re.fullmatch(
                r"Preview PR ([1-9][0-9]{0,9}) ([a-f0-9]{40})", run["display_title"]
            )
            number = int(match[1]) if match else None
            entry = next((e for e in self.state["previews"] if e["pr"] == number), None)
            # This is only a rejection filter. Publication independently checks
            # run identity and artifact metadata against GitHub again.
            wanted = (
                match
                and number in desired
                and desired[number]["head"]["sha"] == match[2]
                and run["head_sha"] == default_sha
                and (number, match[2]) not in accepted_heads
                and (not entry or entry["failedHead"] != match[2])
            )
            if not wanted:
                if (
                    run["path"] == ".github/workflows/preview-build.yml"
                    and run["event"] == "workflow_dispatch"
                ):
                    for artifact in owned:
                        self.gh.request(
                            f"/repos/{REPO}/actions/artifacts/{artifact['id']}",
                            "DELETE",
                        )
                continue
            if entry is None and len(self.state["previews"]) == 4:
                continue
            candidate, artifact_id, number = publish(self.gh, run, default_sha)
            self.gh.require(number, candidate["headSha"])
            if entry is None:
                slot = next(
                    i
                    for i in range(1, 5)
                    if i not in {e["slot"] for e in self.state["previews"]}
                )
                entry = {
                    "pr": number,
                    "slot": slot,
                    "working": None,
                    "rollback": None,
                    "candidate": None,
                    "failedHead": None,
                    "phase": "pending",
                }
                self.state["previews"].append(entry)
            if (
                not entry["working"]
                or entry["working"]["headSha"] != candidate["headSha"]
            ):
                entry["candidate"] = candidate
                entry["phase"] = "pending"
                self.save()
            accepted_heads.add((number, candidate["headSha"]))
            self.gh.request(f"/repos/{REPO}/actions/artifacts/{artifact_id}", "DELETE")

    def report(self, desired):
        for number, pr in desired.items():
            head = pr["head"]["sha"]
            self.gh.require(number, head)
            entry = next(
                (item for item in self.state["previews"] if item["pr"] == number), None
            )
            if entry and entry["failedHead"] == head:
                self.gh.status(
                    number,
                    head,
                    "failure",
                    "Preview update failed; inspect Preview control",
                    None,
                )
            elif (
                entry
                and entry["phase"] == "ready"
                and entry["working"]["headSha"] == head
            ):
                self.gh.status(
                    number,
                    head,
                    "success",
                    "Private preview ready; Tailscale required",
                    "https://" + preview_host(number),
                )
            elif self.build_states.get(number) == "failed":
                self.gh.status(
                    number,
                    head,
                    "failure",
                    "Preview build failed; retry Preview control with this PR",
                )
            else:
                message = "Waiting for a successful preview build"
                if entry is None and len(self.state["previews"]) == 4:
                    message = "Waiting for one of four preview slots"
                self.gh.status(number, head, "pending", message)

    def reconcile(self, run_id=None, retry=None):
        desired = self.gh.desired()
        self.current_heads = {
            number: pr["head"]["sha"] for number, pr in desired.items()
        }
        for entry in list(self.state["previews"]):
            if entry["pr"] not in desired or entry["phase"] == "retiring":
                self.retire(entry)
        self.sweep()
        for entry in self.state["previews"]:
            candidate = entry["candidate"]
            if (
                candidate
                and candidate["headSha"] != desired[entry["pr"]]["head"]["sha"]
            ):
                # GitHub's successful full read proves supersession. A failed
                # read never reaches this path and preserves existing state.
                entry["phase"] = "failed"
                self.save()
                self.recover(entry)
        for entry in self.state["previews"]:
            if entry["phase"] == "failed" and (entry["candidate"] or entry["working"]):
                self.recover(entry)
        if retry:
            for entry in self.state["previews"]:
                if entry["pr"] == retry:
                    entry["failedHead"] = None
                    self.save()
        self.accept_completed_builds(desired, run_id)
        for entry in self.state["previews"]:
            if entry["candidate"] is not None:
                self.promote(entry)
        for entry in self.active():
            self.repair(entry, desired[entry["pr"]]["head"]["sha"])
        self.reconcile_snapshots(self.active())
        for number, pr in desired.items():
            entry = next((e for e in self.state["previews"] if e["pr"] == number), None)
            if entry is None and len(self.state["previews"]) == 4:
                continue
            if entry and (
                entry["failedHead"] == pr["head"]["sha"]
                or (
                    entry["working"]
                    and entry["working"]["headSha"] == pr["head"]["sha"]
                    and number != retry
                )
            ):
                continue
            self.build_states[number] = self.gh.dispatch(
                number, pr["head"]["sha"], force=number == retry
            )
        self.report(desired)
        return desired


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", type=int)
    parser.add_argument("--retry", type=int)
    parser.add_argument("--context", default="relisten3-k3s")
    args = parser.parse_args()
    controller = Controller(Cluster(args.context), GitHub())
    controller.reconcile(args.run_id, args.retry)
    from cleanup import Registry, cleanup_images, cleanup_artifacts

    protected = {
        candidate["image"]
        for entry in controller.state["previews"]
        for key in ["working", "rollback", "candidate"]
        if (candidate := entry[key])
    }
    actual = json.loads(
        controller.cluster.kubectl(
            "-n", "web-previews", "get", "deployments", "-l", LABEL, "-o", "json"
        )
    )
    for deployment in actual["items"]:
        protected.update(
            c["image"] for c in deployment["spec"]["template"]["spec"]["containers"]
        )

    def checkpoint_marks(marks):
        if controller.state["unreferencedImages"] != marks:
            controller.state["unreferencedImages"] = marks
            controller.save()

    images = cleanup_images(
        controller.gh,
        Registry(controller.gh, os.environ["GITHUB_ACTOR"]),
        protected,
        controller.state["unreferencedImages"],
        checkpoint_marks,
    )
    artifacts = cleanup_artifacts(controller.gh)
    print(
        json.dumps(
            {
                "previews": [
                    {
                        "pr": e["pr"],
                        "headSha": e["working"]["headSha"] if e["working"] else None,
                        "phase": e["phase"],
                        "failedHead": e["failedHead"],
                    }
                    for e in controller.state["previews"]
                ],
                "deletedImages": images,
                "deletedArtifacts": artifacts,
            }
        )
    )


if __name__ == "__main__":
    main()
