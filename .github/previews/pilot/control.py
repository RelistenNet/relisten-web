#!/usr/bin/env python3
"""Operator-only pilot status and route-first synthetic cleanup; never runs PR code."""
import argparse
import json
import subprocess
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "gateway"))
from gateway import parse_snapshot


class Cluster:
    def __init__(self, context):
        self.context = context

    def kubectl(self, *args, payload=None, deadline=None):
        timeout = 15 if deadline is None else min(15, deadline - time.monotonic())
        if timeout <= 0:
            raise TimeoutError("Gateway acknowledgment deadline expired")
        return subprocess.check_output(
            [
                "kubectl",
                "--context",
                self.context,
                f"--request-timeout={max(0.001, min(10, timeout)):.3f}s",
                *args,
            ],
            input=payload,
            text=True,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )

    def status(self, deadline=None):
        # Operator access only. CI will use private HTTPS acknowledgments;
        # preview-controller RBAC deliberately does not grant pod exec.
        pods = json.loads(
            self.kubectl(
                "-n",
                "preview-system",
                "get",
                "pods",
                "-l",
                "app=relisten-preview-gateway",
                "--field-selector=status.phase=Running",
                "-o",
                "json",
                deadline=deadline,
            )
        )
        script = "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8081/status',timeout=3).read().decode())"
        return [
            {
                "pod": pod["metadata"]["name"],
                **json.loads(
                    self.kubectl(
                        "-n",
                        "preview-system",
                        "exec",
                        pod["metadata"]["name"],
                        "--",
                        "python",
                        "-c",
                        script,
                        deadline=deadline,
                    )
                ),
            }
            for pod in pods["items"]
        ]

    def gateway_absent(self, deadline):
        resources = self.named_objects(
            "preview-system", "deployment,service", "relisten-preview-gateway", deadline
        )
        pods = json.loads(
            self.kubectl(
                "-n",
                "preview-system",
                "get",
                "pods",
                "-l",
                "app=relisten-preview-gateway",
                "-o",
                "json",
                deadline=deadline,
            )
        )
        return not resources and not pods["items"]

    def named_objects(self, namespace, kinds, name, deadline=None):
        output = self.kubectl(
            "-n",
            namespace,
            "get",
            kinds,
            name,
            "--ignore-not-found=true",
            "-o",
            "json",
            deadline=deadline,
        )
        # kubectl returns empty stdout, a single object, or a List depending on
        # the number of matches. Errors must propagate rather than mean absence.
        if not output.strip():
            return []
        resource = json.loads(output)
        return resource["items"] if resource["kind"] == "List" else [resource]

    def wait_rollout(self, namespace, deployment):
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline:
            try:
                self.kubectl(
                    "-n",
                    namespace,
                    "rollout",
                    "status",
                    "deployment/" + deployment,
                    "--timeout=5s",
                    deadline=deadline,
                )
                return
            except subprocess.CalledProcessError:
                # A short watch fits the command timeout; retry while the
                # Deployment controller converges on the desired generation.
                time.sleep(min(1, max(0, deadline - time.monotonic())))
        raise TimeoutError("Desired Deployment did not roll out: " + deployment)

    def publish_synthetic(self, active):
        config = json.loads(
            self.kubectl(
                "-n",
                "preview-system",
                "get",
                "configmap",
                "preview-gateway-routes",
                "-o",
                "json",
            )
        )
        snapshot = json.loads(config["data"]["routes.json"])
        parse_snapshot(json.dumps(snapshot))
        routes = [route for route in snapshot["routes"] if route != {"synthetic": True}]
        if active and {"synthetic": True} in snapshot["routes"]:
            routes = snapshot["routes"]
        elif active:
            routes.append({"synthetic": True})
        if routes != snapshot["routes"]:
            snapshot = {
                **snapshot,
                "revision": snapshot["revision"] + 1,
                "routes": routes,
            }
            patch = [
                {
                    "op": "test",
                    "path": "/metadata/resourceVersion",
                    "value": config["metadata"]["resourceVersion"],
                },
                {
                    "op": "replace",
                    "path": "/data/routes.json",
                    "value": json.dumps(snapshot),
                },
            ]
            self.kubectl(
                "-n",
                "preview-system",
                "patch",
                "configmap",
                "preview-gateway-routes",
                "--type=json",
                "--patch-file=/dev/stdin",
                payload=json.dumps(patch),
            )
        return snapshot["revision"]

    def wait_revision(self, revision, allow_absent=False):
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline:
            try:
                statuses = self.status(deadline=deadline)
            except subprocess.CalledProcessError:
                # A Running Pod may not yet have its local status server, or
                # may be between workers. No acknowledgment is inferred.
                statuses = []
            # A failed first bootstrap may never have created the gateway. Only
            # authoritative absence of its Deployment, Service and all Pods can
            # replace the acknowledgment; API failure is never treated as absence.
            if allow_absent and not statuses and self.gateway_absent(deadline):
                break
            if statuses and all(
                status["ready"]
                and status["revision"] == revision
                and status["sourceState"] == "ready"
                for status in statuses
            ):
                break
            time.sleep(min(2, max(0, deadline - time.monotonic())))
        else:
            raise RuntimeError(
                "Gateway retirement not acknowledged; synthetic resources retained for retry"
            )

    def retire_synthetic(self):
        revision = self.publish_synthetic(False)
        self.wait_revision(revision, allow_absent=True)
        ingress = self.named_objects(
            "preview-system", "ingress", "relisten-preview-probe"
        )
        backend = self.named_objects(
            "web-previews", "deployment,service", "relisten-preview-synthetic"
        )
        for resource in ingress + backend:
            labels = resource["metadata"].get("labels", {})
            owned = (
                (
                    labels.get("app") == "relisten-preview-frontdoor"
                    and labels.get("relisten.net/preview-kind") == "synthetic"
                )
                if resource["kind"] == "Ingress"
                else labels.get("app") == "relisten-preview-synthetic"
            )
            if not owned:
                raise RuntimeError(
                    "Synthetic resource ownership changed; refusing deletion"
                )
        for resource in ingress + backend:
            collection, kind = {
                "Deployment": ("/apis/apps/v1", "deployments"),
                "Service": ("/api/v1", "services"),
                "Ingress": ("/apis/networking.k8s.io/v1", "ingresses"),
            }[resource["kind"]]
            metadata = resource["metadata"]
            path = f"{collection}/namespaces/{metadata['namespace']}/{kind}/{metadata['name']}"
            # UID precondition prevents deleting a replacement created after the read.
            self.kubectl(
                "delete",
                "--raw",
                path,
                "-f",
                "-",
                payload=json.dumps(
                    {
                        "apiVersion": "v1",
                        "kind": "DeleteOptions",
                        "preconditions": {"uid": resource["metadata"]["uid"]},
                    }
                ),
            )
        # Tailscale's Ingress finalizer owns proxy/device teardown. Do not report
        # completed retirement while that asynchronous cleanup is still pending.
        deadline = time.monotonic() + 150
        while self.named_objects(
            "preview-system", "ingress", "relisten-preview-probe", deadline
        ):
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    "Synthetic ingress cleanup still pending; retry retirement"
                )
            time.sleep(min(2, max(0, deadline - time.monotonic())))
        print(json.dumps({"retiredSynthetic": True, "gatewayRevision": revision}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["status", "retire-synthetic"])
    parser.add_argument("--context", default="relisten3-k3s")
    args = parser.parse_args()
    cluster = Cluster(args.context)
    if args.command == "status":
        print(json.dumps(cluster.status(), indent=2))
    else:
        cluster.retire_synthetic()


if __name__ == "__main__":
    main()
