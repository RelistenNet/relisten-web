"""Bootstrap a zero-layer package anchor or prove disposable version deletion."""

from datetime import datetime, timezone
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile

from github import GitHub, REPO, REPO_ID
from publish import PACKAGE, copy_oci, require_private_package


def create_empty_oci(path, *, anchor=False):
    def encoded(value):
        return json.dumps(value, separators=(",", ":")).encode()

    config = encoded(
        {
            "created": datetime.now(timezone.utc).isoformat(),
            "architecture": "amd64",
            "os": "linux",
            "config": {
                "Labels": {
                    "org.opencontainers.image.source": "https://github.com/" + REPO,
                    **(
                        {"relisten.net/preview-package-anchor": "1"}
                        if anchor
                        else {
                            "relisten.net/disposable-cleanup-proof": os.environ["GITHUB_RUN_ID"]
                        }
                    ),
                }
            },
            "rootfs": {"type": "layers", "diff_ids": []},
        }
    )
    digest = lambda raw: "sha256:" + hashlib.sha256(raw).hexdigest()
    manifest = encoded(
        {
            "schemaVersion": 2,
            "mediaType": "application/vnd.oci.image.manifest.v1+json",
            "config": {
                "mediaType": "application/vnd.oci.image.config.v1+json",
                "digest": digest(config),
                "size": len(config),
            },
            "layers": [],
        }
    )
    index = encoded(
        {
            "schemaVersion": 2,
            "manifests": [
                {
                    "mediaType": "application/vnd.oci.image.manifest.v1+json",
                    "digest": digest(manifest),
                    "size": len(manifest),
                    "platform": {"architecture": "amd64", "os": "linux"},
                }
            ],
        }
    )
    files = {
        "oci-layout": encoded({"imageLayoutVersion": "1.0.0"}),
        "index.json": index,
        "blobs/sha256/" + digest(config).split(":")[1]: config,
        "blobs/sha256/" + digest(manifest).split(":")[1]: manifest,
    }
    with tarfile.open(path, "w") as archive:
        for name, raw in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(raw)
            info.mode = 0o644
            archive.addfile(info, io.BytesIO(raw))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bootstrap-anchor", action="store_true")
    args = parser.parse_args()
    gh = GitHub()
    gh.current_default()
    require_private_package(gh)
    if args.bootstrap_anchor and any(
        "package-anchor" in v["metadata"]["container"]["tags"]
        for v in gh.pages("/orgs/RelistenNet/packages/container/" + PACKAGE + "/versions")
    ):
        raise ValueError("Package anchor already exists; verify its pinned digest instead")
    tag = (
        "package-anchor"
        if args.bootstrap_anchor
        else "cleanup-proof-" + os.environ["GITHUB_RUN_ID"]
    )
    with tempfile.TemporaryDirectory(prefix="preview-package-proof-") as temporary:
        directory = Path(temporary)
        create_empty_oci(directory / "image.oci.tar", anchor=args.bootstrap_anchor)
        digest = copy_oci(
            gh,
            directory,
            tag,
            before_publish=lambda: require_private_package(gh),
        )
    package = gh.request("/orgs/RelistenNet/packages/container/" + PACKAGE)
    require_private_package(gh)
    versions = gh.pages("/orgs/RelistenNet/packages/container/" + PACKAGE + "/versions")
    matches = [
        v
        for v in versions
        if v["name"] == digest
        and v["metadata"]["container"]["tags"]
        == [tag]
    ]
    if len(matches) != 1:
        raise ValueError("Cannot identify disposable cleanup proof version")
    version = matches[0]
    if args.bootstrap_anchor:
        print(json.dumps({
            "packageId": package["id"],
            "packageAnchorDigest": digest,
            "emptyImage": True,
            "versionId": version["id"],
        }))
        return
    gh.request(
        f"/orgs/RelistenNet/packages/container/{PACKAGE}/versions/{version['id']}",
        "DELETE",
    )
    remaining = gh.pages(
        "/orgs/RelistenNet/packages/container/" + PACKAGE + "/versions"
    )
    if any(v["id"] == version["id"] for v in remaining):
        raise ValueError("Disposable version remains after DELETE")
    print(
        json.dumps(
            {
                "privatePackage": PACKAGE,
                "sourceRepositoryId": REPO_ID,
                "packageId": package["id"],
                "disposableVersionDeleted": version["id"],
            }
        )
    )


if __name__ == "__main__":
    main()
