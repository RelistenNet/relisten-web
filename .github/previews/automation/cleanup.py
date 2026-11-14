"""Bounded cleanup for the dedicated preview package and preview OCI artifacts."""

import base64
from datetime import datetime, timezone
import hashlib
import json
import math
import re
import urllib.request

from github import BUILD_PATH, REPO
from publish import IMAGE, PACKAGE, require_private_package

GRACE_SECONDS = 900


def next_cleanup_at(marks):
    """First whole UTC second when a persisted unreferenced image is eligible."""
    if not marks:
        return None
    return math.ceil(
        min(datetime.fromisoformat(stamp).timestamp() for stamp in marks.values())
        + GRACE_SECONDS
    )


def age_seconds(value, now):
    return (now - datetime.fromisoformat(value.replace("Z", "+00:00"))).total_seconds()


class Registry:
    def __init__(self, gh, actor):
        request = urllib.request.Request(
            "https://ghcr.io/token?service=ghcr.io&scope=repository:relistennet/"
            + PACKAGE
            + ":pull",
            headers={
                "Authorization": "Basic "
                + base64.b64encode((actor + ":" + gh.token).encode()).decode()
            },
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            self.token = json.load(response)["token"]

    def manifest(self, digest):
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
            raise ValueError("Unexpected package digest")
        request = urllib.request.Request(
            "https://ghcr.io/v2/relistennet/" + PACKAGE + "/manifests/" + digest,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/vnd.docker.distribution.manifest.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json",
            },
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read(1024 * 1024 + 1)
        if (
            len(raw) > 1024 * 1024
            or "sha256:" + hashlib.sha256(raw).hexdigest() != digest
        ):
            raise ValueError("Registry manifest digest mismatch")
        return json.loads(raw)


def cleanup_images(gh, registry, protected, marks=None, checkpoint=None, now=None):
    now = now or datetime.now(timezone.utc)
    require_private_package(gh)
    versions = gh.pages("/orgs/RelistenNet/packages/container/" + PACKAGE + "/versions")
    # Keep children while any surviving index references them, including partial
    # publishes that never became a deployed image.
    available = {version["name"] for version in versions}
    children = {
        version["name"]: {
            child["digest"]
            for child in registry.manifest(version["name"]).get("manifests", [])
        }
        for version in versions
    }
    protected_digests = set()
    for image in protected:
        if not image.startswith(IMAGE + "@"):
            raise ValueError("Unexpected protected image")
        digest = image.split("@")[1]
        if digest not in available:
            raise ValueError("Protected image is absent from preview package")
        protected_digests.add(digest)

    def unreferenced_images():
        referenced = set(protected_digests)
        for parent in available:
            referenced.update(children[parent])
        return available - referenced

    # Persist when protection was first observed absent, rather than using
    # publication age. An old working image still receives a full grace period
    # after retirement or replacement.
    marks = marks or {}
    unreferenced = unreferenced_images()
    # Drain bounded batches so a prolonged outage cannot fill the registry and
    # permanently prevent the cleanup that would shrink that backlog.
    updated = dict(
        sorted(
            (
                (digest, stamp)
                for digest, stamp in marks.items()
                if digest in unreferenced
            ),
            key=lambda pair: pair[1],
        )[:128]
    )
    def enroll_unreferenced():
        for digest in sorted(unreferenced - updated.keys()):
            if len(updated) == 128:
                break
            updated[digest] = now.isoformat()

    enroll_unreferenced()
    if checkpoint:
        checkpoint(dict(updated))
    require_private_package(gh)
    deleted = []
    for version in versions:
        if (
            version["name"] not in updated
            or age_seconds(updated[version["name"]], now) < GRACE_SECONDS
        ):
            continue
        gh.request(
            f"/orgs/RelistenNet/packages/container/{PACKAGE}/versions/{version['id']}",
            "DELETE",
        )
        deleted.append(version["id"])
        updated.pop(version["name"], None)
        available.remove(version["name"])
    # A deleted index can expose children that were protected at scan admission.
    # Enroll those only after successful parent deletion, with a fresh grace.
    unreferenced = unreferenced_images()
    # A full batch must leave another timed wakeup, even without cron/events.
    enroll_unreferenced()
    awaiting_batch = len(unreferenced - updated.keys())
    if checkpoint:
        checkpoint(dict(updated))
    print(
        json.dumps(
            {
                "imageCleanup": {
                    "unreferenced": len(unreferenced),
                    "marked": len(updated),
                    "deleted": len(deleted),
                    "awaitingBatch": awaiting_batch,
                }
            }
        )
    )
    # Re-read protected manifests after deletion: fail the run on a lost image.
    for image in protected:
        registry.manifest(image.split("@")[1])
    return deleted


def cleanup_artifacts(gh, now=None):
    now = now or datetime.now(timezone.utc)
    deleted = []
    for artifact in gh.pages(f"/repos/{REPO}/actions/artifacts", "artifacts"):
        if not re.fullmatch(r"preview-oci-[1-9][0-9]*-[1-9][0-9]*", artifact["name"]):
            continue
        if age_seconds(artifact["created_at"], now) < 3600:
            continue
        run = gh.request(f"/repos/{REPO}/actions/runs/{artifact['workflow_run']['id']}")
        if run["path"] != BUILD_PATH or run["event"] != "workflow_dispatch":
            continue
        if run["status"] != "completed":
            continue
        gh.request(f"/repos/{REPO}/actions/artifacts/{artifact['id']}", "DELETE")
        deleted.append(artifact["id"])
    return deleted
