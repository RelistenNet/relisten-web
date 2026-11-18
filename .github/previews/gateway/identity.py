"""Preview names and ingress slots owned by trusted infrastructure, never PR input."""

TAILNET = "tail09dbf.ts.net"
CONTROL_HOST = f"relisten-preview-control.{TAILNET}"
CONTROL_TAG = "tag:relisten-preview-control"
PROBE_HOST = f"relisten-preview-probe.{TAILNET}"


def preview_host(pr):
    if type(pr) is not int or not 1 <= pr <= 9_999_999_999:
        raise ValueError("Invalid PR identity")
    return f"relisten-web-previews-pr-{pr}.{TAILNET}"


def listener_port(slot):
    if type(slot) is not int or not 0 <= slot <= 4:
        raise ValueError("Invalid ingress slot")
    return 9000 + slot


# In-cluster listener where preview servers reach their own auth facade by path.
SESSION_PORT = 9100


def session_prefix(pr):
    preview_host(pr)
    return f"/pr-{pr}"


def session_upstream(pr):
    return (
        "http://relisten-preview-gateway.preview-system.svc.cluster.local:"
        f"{SESSION_PORT}{session_prefix(pr)}"
    )


def frontdoor(pr=None, slot=0):
    if pr is None:
        if slot != 0:
            raise ValueError("Synthetic ingress owns slot zero")
        host = PROBE_HOST
        name = "relisten-preview-probe"
        labels = {"relisten.net/preview-kind": "synthetic"}
    else:
        host = preview_host(pr)
        if slot == 0:
            raise ValueError("PR ingress requires slot one through four")
        name = f"relisten-preview-pr-{pr}"
        labels = {"relisten.net/preview-pr": str(pr)}
    return {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "Ingress",
        "metadata": {
            "name": name,
            "namespace": "preview-system",
            "labels": {"app": "relisten-preview-frontdoor", **labels},
            "annotations": {
                # Only PR frontdoors belong to the externally shared tag.
                "tailscale.com/tags": (
                    CONTROL_TAG if pr is None else "tag:relisten-preview"
                ),
                "tailscale.com/funnel": "false",
                "tailscale.com/proxy-class": "relisten-preview",
            },
        },
        "spec": {
            "ingressClassName": "tailscale",
            "tls": [{"hosts": [host.split(".")[0]]}],
            "defaultBackend": {
                "service": {
                    "name": "relisten-preview-gateway",
                    "port": {"number": listener_port(slot)},
                }
            },
        },
    }


def control_frontdoor():
    resource = frontdoor()
    resource["metadata"]["name"] = "relisten-preview-control"
    resource["metadata"]["labels"]["relisten.net/preview-kind"] = "control"
    resource["spec"]["tls"][0]["hosts"] = [CONTROL_HOST.split(".")[0]]
    return resource


def assigned_to(ingress, expected_host):
    """Check the operator's actual assignment, including its optional port metadata."""
    assigned = ingress.get("status", {}).get("loadBalancer", {}).get("ingress", [])
    if len(assigned) != 1:
        return False
    endpoint = assigned[0]
    return (
        set(endpoint) <= {"hostname", "ports"}
        and endpoint.get("hostname") == expected_host
        and endpoint.get("ports", [{"port": 443, "protocol": "TCP"}])
        == [{"port": 443, "protocol": "TCP"}]
    )
