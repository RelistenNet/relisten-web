"""Fail closed if the real CI identity has excess Kubernetes authority."""

import subprocess


def allowed(*args):
    result = subprocess.run(
        ["kubectl", "--context", "relisten3-k3s", "auth", "can-i", *args],
        text=True,
        capture_output=True,
        timeout=20,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError("RBAC inspection failed")
    return result.stdout.strip() == "yes"


def main():
    for args, expected in [
        (["patch", "deployments", "-n", "web-previews"], True),
        (["patch", "configmap/relisten-preview-web-origins", "-n", "default"], True),
        (["patch", "ingresses", "-n", "preview-system"], True),
        (["get", "pods", "-n", "preview-system"], True),
        (["get", "secrets", "-n", "web-previews"], False),
        (["get", "secrets", "-n", "default"], False),
        (["create", "pods/exec", "-n", "web-previews"], False),
        (["create", "pods/exec", "-n", "preview-system"], False),
        (["patch", "deployment/relisten-user-service", "-n", "default"], False),
        (
            ["patch", "deployment/relisten-preview-gateway", "-n", "preview-system"],
            False,
        ),
        (["patch", "ingresses", "-n", "default"], False),
        (["patch", "configmap/unrelated", "-n", "default"], False),
        (["create", "clusterroles"], False),
    ]:
        if allowed(*args) != expected:
            raise RuntimeError("Preview CI RBAC contract failed: " + " ".join(args))
    print("Preview CI RBAC checks passed")


if __name__ == "__main__":
    main()
