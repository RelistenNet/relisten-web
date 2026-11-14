"""Validate trusted-build provenance and copy OCI bytes; never start branch images."""

import json
import base64
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request
import zipfile
import uuid

from github import BUILD_PATH, DEFAULT, REPO, REPO_ID, SHA

PACKAGE = "relisten-web-preview"
IMAGE = "ghcr.io/relistennet/" + PACKAGE
# Official Skopeo v1.22.0, resolved and pinned; image parsing stays in this container.
SKOPEO = "quay.io/skopeo/stable@sha256:06dd47ee861e143268f0b811cdf1f9d6509b097945de447dbcdfb668ca15364c"
MAX_ARCHIVE = 2 * 1024**3


def unique_properties(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate artifact metadata property")
        result[key] = value
    return result


class DownloadRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.startswith("https://"):
            raise ValueError("Artifact redirect must use HTTPS")
        # Signed storage URLs receive no GitHub Authorization header.
        return urllib.request.Request(
            newurl, headers={"Accept": "application/octet-stream"}
        )


def validate_metadata(metadata, run, default_sha):
    keys = {
        "version",
        "repositoryId",
        "pr",
        "headSha",
        "authorId",
        "orchestrationSha",
        "runId",
        "runAttempt",
    }
    if not isinstance(metadata, dict) or set(metadata) != keys:
        raise ValueError("Invalid build metadata schema")
    if (
        any(
            type(metadata[k]) is not int
            for k in [
                "version",
                "repositoryId",
                "runId",
                "runAttempt",
                "pr",
                "authorId",
            ]
        )
        or metadata["version"] != 1
        or metadata["repositoryId"] != REPO_ID
        or metadata["runId"] != run["id"]
        or metadata["runAttempt"] != run["run_attempt"]
        or metadata["orchestrationSha"] != default_sha
        or not SHA.fullmatch(metadata["headSha"])
        or type(metadata["pr"]) is not int
        or type(metadata["authorId"]) is not int
    ):
        raise ValueError(
            "Build provenance does not match current trusted orchestration"
        )


def validate_run(run, workflow, default_sha):
    if (
        run["repository"]["id"] != REPO_ID
        or run["head_repository"]["id"] != REPO_ID
        or run["event"] != "workflow_dispatch"
        or run["conclusion"] != "success"
        or run["head_branch"] != DEFAULT
        or run["head_sha"] != default_sha
        or run["path"] != BUILD_PATH
        or run["workflow_id"] != workflow["id"]
    ):
        raise ValueError("Run was not a successful current default-ref preview build")


def extract_artifact(archive, directory):
    # Do not extract names or symlinks chosen by an artifact. Copy two exact files.
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if len(entries) != 2 or {i.filename for i in entries} != {
            "image.oci.tar",
            "metadata.json",
        }:
            raise ValueError("Unexpected artifact files")
        for item in entries:
            if item.is_dir() or (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Artifact links/directories are not allowed")
            limit = 16 * 1024 if item.filename == "metadata.json" else MAX_ARCHIVE
            if not 0 < item.file_size <= limit:
                raise ValueError("Artifact file exceeds limit")
            count = 0
            with (
                source.open(item) as incoming,
                (directory / item.filename).open("xb") as output,
            ):
                while chunk := incoming.read(1024 * 1024):
                    count += len(chunk)
                    if count > limit:
                        raise ValueError("Artifact file exceeds limit")
                    output.write(chunk)


def download(gh, artifact, destination):
    if artifact["expired"] or artifact["size_in_bytes"] > MAX_ARCHIVE:
        raise ValueError("Unusable artifact")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/artifacts/{artifact['id']}/zip",
        headers={"Authorization": "Bearer " + gh.token},
    )
    opener = urllib.request.build_opener(DownloadRedirect())
    count = 0
    with opener.open(request, timeout=30) as response, destination.open("xb") as output:
        while chunk := response.read(1024 * 1024):
            count += len(chunk)
            if count > MAX_ARCHIVE:
                raise ValueError("Artifact archive exceeds limit")
            output.write(chunk)


def skopeo(directory, arguments, network=True):
    # OCI archives need extraction scratch space. Keep the container root read
    # only and use a task-owned disk directory, removed with the surrounding
    # TemporaryDirectory. A tmpfs would count the whole image against RAM.
    (directory / "scratch").mkdir(exist_ok=True)
    name = "preview-oci-" + uuid.uuid4().hex
    command = [
        "docker",
        "run",
        "--rm",
        "--name",
        name,
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--memory=512m",
        "--cpus=1",
        "--pids-limit=64",
        "--user",
        f"{os.getuid()}:{os.getgid()}",
        "--mount",
        f"type=bind,src={directory},dst=/work",
    ]
    if not network:
        command.append("--network=none")
    try:
        result = subprocess.run(
            command + [SKOPEO, "--tmpdir", "/work/scratch"] + arguments,
            check=True,
            timeout=600 if network else 60,
            text=True,
            stdout=subprocess.PIPE,
        )
        return result.stdout
    finally:
        # Killing a Docker CLI on timeout does not prove its container stopped.
        subprocess.run(
            ["docker", "rm", "-f", name],
            timeout=15,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def copy_oci(gh, directory, tag, before_publish=None):
    auth = directory / "auth.json"
    auth.write_text(
        json.dumps(
            {
                "auths": {
                    "ghcr.io": {
                        "auth": base64.b64encode(
                            (os.environ["GITHUB_ACTOR"] + ":" + gh.token).encode()
                        ).decode()
                    }
                }
            }
        )
    )
    auth.chmod(0o600)
    actual = skopeo(
        directory,
        [
            "inspect",
            "--format",
            "{{.Architecture}}/{{.Os}}",
            "oci-archive:/work/image.oci.tar",
        ],
        network=False,
    ).strip()
    if actual != "amd64/linux":
        raise ValueError("Preview image must target linux/amd64")
    # Inspection can take time; renew eligibility/privacy immediately before
    # the network write, rather than relying on the earlier admission check.
    if before_publish:
        before_publish()
    # Flatten to one manifest. No branch image is ever started here.
    skopeo(
        directory,
        [
            "copy",
            "--override-os",
            "linux",
            "--override-arch",
            "amd64",
            "--format",
            "v2s2",
            "--authfile",
            "/work/auth.json",
            "--digestfile",
            "/work/digest",
            "oci-archive:/work/image.oci.tar",
            "docker://" + IMAGE + ":" + tag,
        ],
    )
    digest = (directory / "digest").read_text().strip()
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
        raise ValueError("Invalid published digest")
    return digest


def require_private_package(gh):
    expected = os.environ.get("PREVIEW_PACKAGE_ID", "")
    if not re.fullmatch(r"[1-9][0-9]{0,19}", expected) or os.environ.get(
        "GITHUB_REPOSITORY_ID"
    ) != str(REPO_ID):
        raise ValueError(
            "Preview package access requires the operator-verified package ID and source repository"
        )
    package = gh.request("/orgs/RelistenNet/packages/container/" + PACKAGE)
    # GitHub's workflow token omits the linked repository field even with
    # contents:read. The operator verifies that link once with its account and
    # pins the immutable package ID in this environment. Deletion/recreation or
    # visibility drift must not silently substitute a different resource.
    if (
        package["visibility"] != "private"
        or package["id"] != int(expected)
        or package["name"] != PACKAGE
    ):
        raise ValueError(
            "Preview package identity or visibility differs from the operator-verified package"
        )


def publish(gh, run, default_sha):
    workflow = gh.request(f"/repos/{REPO}/actions/workflows/preview-build.yml")
    validate_run(run, workflow, default_sha)
    artifacts = gh.pages(
        f"/repos/{REPO}/actions/runs/{run['id']}/artifacts", "artifacts"
    )
    selected = [
        a
        for a in artifacts
        if a["name"] == f"preview-oci-{run['id']}-{run['run_attempt']}"
    ]
    if len(selected) != 1:
        raise ValueError("Expected one exact run artifact")
    artifact = selected[0]
    with tempfile.TemporaryDirectory(prefix="preview-publish-") as temporary:
        directory = Path(temporary)
        download(gh, artifact, directory / "artifact.zip")
        extract_artifact(directory / "artifact.zip", directory)
        metadata = json.loads(
            (directory / "metadata.json").read_text(),
            object_pairs_hook=unique_properties,
        )
        validate_metadata(metadata, run, default_sha)
        pr = gh.require(metadata["pr"], metadata["headSha"])
        if pr["user"]["id"] != metadata["authorId"]:
            raise ValueError("PR author identity changed")
        tag = f"pr-{metadata['pr']}-{metadata['headSha']}"

        def authorize_publication():
            gh.require(metadata["pr"], metadata["headSha"])
            require_private_package(gh)

        authorize_publication()
        digest = copy_oci(gh, directory, tag, before_publish=authorize_publication)
        require_private_package(gh)
        gh.require(metadata["pr"], metadata["headSha"])
        candidate = {
            "headSha": metadata["headSha"],
            "image": IMAGE + "@" + digest,
            "branch": pr["head"]["ref"],
            "runId": run["id"],
        }
    return candidate, artifact["id"], metadata["pr"]
