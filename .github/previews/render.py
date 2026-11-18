#!/usr/bin/env python3
"""Render fixed preview resources from verified metadata; performs no I/O to a cluster.

This is a data renderer, not an authorization check. Trusted control must verify
current PR eligibility, author write permission, provenance, and head before apply.
"""

import argparse
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / "gateway"))
from identity import frontdoor, preview_host, session_upstream

REPOSITORY = "RelistenNet/relisten-web"
IMAGE = re.compile(r"ghcr\.io/relistennet/relisten-web-preview@sha256:[0-9a-f]{64}\Z")
HEAD = re.compile(r"[0-9a-f]{40}\Z")


def render(metadata):
    if not isinstance(metadata, dict) or set(metadata) != {
        "pr",
        "slot",
        "headSha",
        "image",
        "branch",
    }:
        raise ValueError("Expected exactly pr, slot, headSha, image, branch metadata.")
    pr, head, image, branch = (
        metadata[key] for key in ("pr", "headSha", "image", "branch")
    )
    if type(pr) is not int or not 1 <= pr <= 9_999_999_999:
        raise ValueError("PR must be a positive integer of at most ten digits.")
    if not isinstance(head, str) or not HEAD.fullmatch(head):
        raise ValueError("headSha must be a full lowercase commit SHA.")
    if not isinstance(image, str) or not IMAGE.fullmatch(image):
        raise ValueError("image must be a digest in the dedicated preview package.")
    if (
        not isinstance(branch, str)
        or not 1 <= len(branch) <= 1024
        or any(ord(char) <= 32 or ord(char) == 127 for char in branch)
    ):
        raise ValueError("branch must be bounded text without control characters.")

    name = f"relisten-web-preview-pr-{pr}"
    labels = {
        "app": "relisten-web-preview",
        "relisten.net/preview-pr": str(pr),
        "relisten.net/environment": "preview",
    }
    identity = {
        "relisten.net/repository": REPOSITORY,
        "relisten.net/head-sha": head,
        "relisten.net/image": image,
    }

    def object_metadata():
        return {
            "name": name,
            "namespace": "web-previews",
            "labels": dict(labels),
            "annotations": dict(identity),
        }

    # ConfigMap imports preserve literal $(...) text. A direct env.value would
    # participate in kubelet variable expansion and could change a branch name.
    context = {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": object_metadata(),
        "data": {
            "RELISTEN_DEPLOYMENT_ENV": "preview",
            "RELISTEN_PREVIEW_PR_NUMBER": str(pr),
            "RELISTEN_PREVIEW_BRANCH": branch,
            "RELISTEN_PREVIEW_HEAD_SHA": head,
            "RELISTEN_PREVIEW_URL": f"https://{preview_host(pr)}",
        },
    }
    container = {
        "name": "web",
        "image": image,
        "imagePullPolicy": "IfNotPresent",
        "ports": [{"name": "http", "containerPort": 3000}],
        "envFrom": [{"configMapRef": {"name": name}}],
        "env": [
            {"name": key, "value": value}
            for key, value in {
                "NODE_ENV": "production",
                "NODE_OPTIONS": "--max-old-space-size=1024",
                "PORT": "3000",
                "HOST": "0.0.0.0",
                "HOSTNAME": "0.0.0.0",
                "RELISTEN_API_URL": "http://relistenapi-srv.default.svc.cluster.local:3823",
                # Trusted gateway path for this PR; the gateway fixes the session relay.
                "RELISTEN_USER_SERVICE_URL": session_upstream(pr),
            }.items()
        ],
        "resources": {
            "requests": {"cpu": "250m", "memory": "512Mi"},
            "limits": {"cpu": "1", "memory": "2Gi"},
        },
        "securityContext": {
            "allowPrivilegeEscalation": False,
            "readOnlyRootFilesystem": True,
            "capabilities": {"drop": ["ALL"]},
        },
        "startupProbe": {
            "httpGet": {"path": "/api/status", "port": "http"},
            "periodSeconds": 2,
            "failureThreshold": 60,
        },
        "readinessProbe": {
            "httpGet": {"path": "/api/status", "port": "http"},
            "periodSeconds": 5,
        },
        "volumeMounts": [{"name": "tmp", "mountPath": "/tmp"}],
    }
    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": object_metadata(),
        "spec": {
            "replicas": 1,
            "revisionHistoryLimit": 1,
            "progressDeadlineSeconds": 300,
            "strategy": {
                "type": "RollingUpdate",
                "rollingUpdate": {"maxSurge": 1, "maxUnavailable": 0},
            },
            "selector": {"matchLabels": labels},
            "template": {
                "metadata": {"labels": labels, "annotations": identity},
                "spec": {
                    "serviceAccountName": "preview-workload",
                    "automountServiceAccountToken": False,
                    "enableServiceLinks": False,
                    "nodeSelector": {"relisten.net/nodepool": "app-db-local"},
                    "imagePullSecrets": [{"name": "relisten-preview-ghcr"}],
                    "securityContext": {
                        "runAsNonRoot": True,
                        "runAsUser": 1001,
                        "runAsGroup": 1001,
                        "fsGroup": 1001,
                        "seccompProfile": {"type": "RuntimeDefault"},
                    },
                    "terminationGracePeriodSeconds": 30,
                    "containers": [container],
                    "volumes": [{"name": "tmp", "emptyDir": {"sizeLimit": "256Mi"}}],
                },
            },
        },
    }
    service = {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": object_metadata(),
        "spec": {
            "type": "ClusterIP",
            "selector": labels,
            "ports": [{"name": "http", "port": 3000, "targetPort": "http"}],
        },
    }
    return {
        "apiVersion": "v1",
        "kind": "List",
        "items": [context, deployment, service, frontdoor(pr, metadata["slot"])],
    }


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate metadata property.")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "metadata",
        type=Path,
        help="Verified PR/head/digest/branch JSON, at most 16 KiB",
    )
    args = parser.parse_args()
    try:
        with args.metadata.open("rb") as file:
            data = file.read(16 * 1024 + 1)
        if len(data) > 16 * 1024:
            raise ValueError("Metadata exceeds size limit.")
        resources = render(json.loads(data, object_pairs_hook=reject_duplicate_keys))
    except (OSError, ValueError, TypeError, RecursionError):
        parser.exit(2, "Invalid preview metadata; no resources rendered.\n")
    json.dump(resources, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
