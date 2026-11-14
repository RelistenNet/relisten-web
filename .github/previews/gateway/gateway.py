"""Reload exact preview routes behind Tailscale HTTPS; branch code never runs here."""

import argparse
from dataclasses import dataclass
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import uuid

from identity import CONTROL_HOST, PROBE_HOST, listener_port, preview_host

MAX_BYTES = 16 * 1024
AUTH_UPSTREAM = "relisten-user-service-srv.default.svc.cluster.local:8080"
SYNTHETIC_UPSTREAM = "relisten-preview-synthetic.web-previews.svc.cluster.local:8080"


def unique_properties(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate property")
        result[key] = value
    return result


def read_bounded(path, limit):
    with path.open("rb") as source:
        value = source.read(limit + 1)
    if len(value) > limit:
        raise ValueError("Input exceeds size limit")
    return value


@dataclass(frozen=True, order=True)
class Route:
    host: str
    upstream: str
    slot: int
    synthetic: bool = False
    control: bool = False


@dataclass(frozen=True)
class Snapshot:
    revision: int
    routes: tuple[Route, ...]


def parse_snapshot(value):
    source = json.loads(value, object_pairs_hook=unique_properties)
    if not isinstance(source, dict) or set(source) != {"version", "revision", "routes"}:
        raise ValueError("Invalid snapshot shape")
    if type(source["version"]) is not int or source["version"] != 1:
        raise ValueError("Unsupported schema version")
    revision = source["revision"]
    if type(revision) is not int or not 1 <= revision <= 2**63 - 1:
        raise ValueError("Invalid revision")
    entries = source["routes"]
    if not isinstance(entries, list) or len(entries) > 5:
        raise ValueError("Invalid route set")
    routes = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid route")
        if set(entry) == {"control"} and entry["control"] is True:
            route = Route(CONTROL_HOST, "", 0, control=True)
        elif set(entry) == {"synthetic"} and entry["synthetic"] is True:
            route = Route(PROBE_HOST, SYNTHETIC_UPSTREAM, 0, True)
        elif (
            set(entry) == {"pr", "slot"}
            and type(entry["pr"]) is int
            and 1 <= entry["pr"] <= 9_999_999_999
            and type(entry["slot"]) is int
            and 1 <= entry["slot"] <= 4
        ):
            number = entry["pr"]
            route = Route(
                preview_host(number),
                f"relisten-web-preview-pr-{number}.web-previews.svc.cluster.local:3000",
                entry["slot"],
            )
        else:
            raise ValueError("Routes must select a PR/slot or the synthetic backend")
        routes.append(route)
    if (
        len({route.host for route in routes}) != len(routes)
        or len({route.slot for route in routes}) != len(routes)
        or sum(not route.synthetic and not route.control for route in routes) > 4
    ):
        raise ValueError("Duplicate routes or preview cap exceeded")
    return Snapshot(revision, tuple(sorted(routes)))


def proxy_location(prefix, upstream, host, auth=False):
    trusted_host = "accounts.relisten.net" if auth else host
    relay = f'"https://{host}"' if auth else '""'
    return f"""
        location {prefix} {{
            proxy_pass http://{upstream};
            proxy_http_version 1.1;
            proxy_set_header Host {trusted_host};
            proxy_set_header Forwarded "";
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Host {trusted_host};
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-Port 443;
            proxy_set_header X-Forwarded-Prefix "";
            proxy_set_header X-Relisten-Web-Origin {relay};
            proxy_set_header Upgrade {"\"\"" if auth else "$http_upgrade"};
            proxy_set_header Connection {"\"\"" if auth else "$connection_upgrade"};
            proxy_ignore_headers X-Accel-Redirect;
            proxy_buffering off;
            proxy_request_buffering off;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
            {"proxy_hide_header Cache-Control; add_header Cache-Control 'private, no-store' always; add_header X-Robots-Tag 'noindex, nofollow, noarchive' always;" if auth else ""}
        }}
"""


def nginx_configuration(snapshot, state_directory, generation):
    servers = []
    for route in snapshot.routes:
        host = route.host
        host_pattern = host.replace(".", r"\.")
        # The synthetic probe never sends requests or credentials to shared auth.
        locations = (
            "location / { return 404; }"
            if route.control else proxy_location("/", route.upstream, host)
        )
        if not route.synthetic and not route.control:
            for prefix in [
                "= /auth/session",
                "^~ /auth/session/",
                "= /api/user/v1/csrf",
                "= /v1/me",
                "= /v1/library",
                "^~ /v1/library/",
            ]:
                locations += proxy_location(prefix, AUTH_UPSTREAM, host, auth=True)
        servers.append(
            f"""
    server {{
        listen {listener_port(route.slot)};
        server_name {host};
        if ($http_host !~* "^{host_pattern}(:443)?$") {{ return 421; }}
        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
        location = /__preview/auth {{
            proxy_pass http://relisten-user-service-srv.default.svc.cluster.local:8082;
            proxy_set_header Host accounts.relisten.net;
            proxy_pass_request_headers off;
            add_header Cache-Control "private, no-store" always;
        }}
        location = /__preview/gateway {{ proxy_pass http://127.0.0.1:8081/status; }}
        {locations}
    }}
"""
        )
    # Each Tailscale Ingress targets one fixed slot. Host checks at that listener
    # bind the forwarded request to its ingress even though TLS ended at the proxy.
    defaults = "".join(
        f"server {{ listen {listener_port(slot)} default_server; server_name _; return 421; }}"
        for slot in range(5)
    )
    return f"""
worker_processes 1;
pid {state_directory}/nginx.pid;
error_log stderr crit;
worker_shutdown_timeout 10s;
events {{ worker_connections 1024; }}
http {{
    access_log off;
    # Runtime errors can include OAuth query strings. The wrapper emits sanitized
    # reload states; request details must not enter the NGINX error log.
    error_log /dev/null;
    server_tokens off;
    client_max_body_size 10m;
    client_body_temp_path {state_directory}/body;
    proxy_temp_path {state_directory}/proxy;
    fastcgi_temp_path {state_directory}/fastcgi;
    uwsgi_temp_path {state_directory}/uwsgi;
    scgi_temp_path {state_directory}/scgi;
    map $http_upgrade $connection_upgrade {{ default upgrade; '' close; }}
    {defaults}
    server {{
        listen 127.0.0.1:8091;
        location = /generation {{ return 200 '{{"generation":"{generation}","pid":$pid}}'; }}
        location / {{ return 404; }}
    }}
    {''.join(servers)}
}}
"""


class Gateway:
    def __init__(self, snapshot, state_directory, nginx):
        self.source = snapshot
        self.directory = state_directory
        self.nginx = nginx
        self.process = None
        self.active = None
        self.fingerprint = None
        self.current_directory = None
        self.generation = None
        self.status = {"revision": 0, "sourceState": "waiting", "ready": False}
        self.stopping = threading.Event()

    def mark_state(self, state):
        old = self.status
        self.status = {**old, "sourceState": state}
        if old["sourceState"] != state:
            print(
                json.dumps(
                    {
                        "component": "preview-gateway",
                        "state": state,
                        "revision": old["revision"],
                    }
                ),
                flush=True,
            )

    def apply(self):
        snapshot = parse_snapshot(read_bounded(self.source, MAX_BYTES))
        if self.active and (
            snapshot.revision < self.active.revision
            or (snapshot.revision == self.active.revision and snapshot != self.active)
        ):
            raise ValueError("Stale or changed-in-place revision")
        fingerprint = hashlib.sha256(repr(snapshot).encode()).digest()
        if (
            fingerprint == self.fingerprint
            and self.process is not None
            and self.process.poll() is None
        ):
            self.mark_state("ready")
            return
        candidate = Path(tempfile.mkdtemp(prefix="generation-", dir=self.directory))
        try:
            generation = uuid.uuid4().hex
            config = candidate / "nginx.conf"
            config.write_text(nginx_configuration(snapshot, self.directory, generation))
            subprocess.run(
                [self.nginx, "-e", "stderr", "-t", "-c", str(config)],
                check=True,
                capture_output=True,
                timeout=10,
            )
            current = self.directory / "current"
            previous = self.current_directory
            link = self.directory / "next"
            link.unlink(missing_ok=True)
            link.symlink_to(candidate)
            os.replace(link, current)
            try:
                previous_workers = (
                    self.worker_pids() if self.process is not None else set()
                )
                if self.process is None:
                    self.process = subprocess.Popen(
                        [
                            self.nginx,
                            "-e",
                            "stderr",
                            "-c",
                            str(current / "nginx.conf"),
                            "-g",
                            "daemon off;",
                        ]
                    )
                else:
                    self.process.send_signal(signal.SIGHUP)
                self.wait_for_generation(generation, previous_workers)
            except BaseException:
                try:
                    if previous is None:
                        raise RuntimeError("No previous generation to restore")
                    link.symlink_to(previous)
                    os.replace(link, current)
                    previous_workers = self.worker_pids()
                    self.process.send_signal(signal.SIGHUP)
                    self.wait_for_generation(self.generation, previous_workers)
                except BaseException:
                    # Never continue reporting ready with unknown serving state.
                    self.status = {**self.status, "ready": False}
                    self.stop_nginx(graceful=False)
                raise
            self.active = snapshot
            self.fingerprint = fingerprint
            self.current_directory = candidate
            self.generation = generation
            self.status = {
                "revision": snapshot.revision,
                "sourceState": "ready",
                "ready": True,
            }
            print(
                json.dumps(
                    {
                        "component": "preview-gateway",
                        "state": "applied",
                        "revision": snapshot.revision,
                    }
                ),
                flush=True,
            )
            # Retain current and previous acknowledged configurations only.
            # Old workers have a bounded ten-second drain.
            for path in self.directory.glob("generation-*"):
                if path not in {candidate, previous}:
                    shutil.rmtree(path)
        except BaseException:
            if candidate != self.current_directory:
                shutil.rmtree(candidate, ignore_errors=True)
            raise

    def worker_pids(self):
        # This image runs Linux with one NGINX worker and no cache helper processes.
        # The child list lets us prove old workers have drained, rather than sample
        # one new worker while an old one can still accept connections.
        master = self.process.pid
        return {
            int(pid)
            for pid in Path(f"/proc/{master}/task/{master}/children")
            .read_text()
            .split()
        }

    def wait_for_generation(self, generation, previous_workers):
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError("NGINX exited")
            connection = http.client.HTTPConnection("127.0.0.1", 8091, timeout=1)
            try:
                connection.request(
                    "GET", "/generation", headers={"Connection": "close"}
                )
                observed = json.loads(connection.getresponse().read())
                if (
                    observed["generation"] == generation
                    and observed["pid"] not in previous_workers
                    and self.worker_pids() == {observed["pid"]}
                ):
                    return
            except (OSError, http.client.HTTPException, ValueError):
                pass
            finally:
                connection.close()
            time.sleep(0.05)
        raise RuntimeError("NGINX did not acknowledge reload and drain")

    def stop_nginx(self, graceful=True):
        if self.process is not None:
            if self.process.poll() is None:
                self.process.send_signal(signal.SIGQUIT if graceful else signal.SIGTERM)
                try:
                    self.process.wait(timeout=15 if graceful else 3)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait()
            self.process = None

    def run(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        gateway = self

        class StatusHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                alive = gateway.process is None or gateway.process.poll() is None
                status = {**gateway.status, "ready": gateway.status["ready"] and alive}
                if self.path not in {"/health/live", "/health/ready", "/status"}:
                    self.send_error(404)
                    return
                code = (
                    200
                    if (alive if self.path == "/health/live" else status["ready"])
                    else 503
                )
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(json.dumps(status).encode())

            def log_message(self, *_):
                pass

        server = ThreadingHTTPServer(("0.0.0.0", 8081), StatusHandler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        for event in [signal.SIGTERM, signal.SIGINT]:
            signal.signal(event, lambda *_: self.stopping.set())
        try:
            while not self.stopping.is_set():
                if self.process is not None and self.process.poll() is not None:
                    raise RuntimeError("NGINX exited")
                try:
                    self.apply()
                except (
                    OSError,
                    ValueError,
                    subprocess.SubprocessError,
                    RuntimeError,
                ):
                    self.mark_state("rejected")
                self.stopping.wait(1)
        finally:
            server.shutdown()
            server.server_close()
            self.stop_nginx()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=Path("/config/routes.json"))
    parser.add_argument(
        "--state-directory", type=Path, default=Path("/run/preview-gateway")
    )
    parser.add_argument("--nginx", default="/usr/sbin/nginx")
    args = parser.parse_args()
    Gateway(args.snapshot, args.state_directory, args.nginx).run()


if __name__ == "__main__":
    main()
