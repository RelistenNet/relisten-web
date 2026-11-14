"""GitHub is authoritative for preview eligibility; failed reads never mean absence."""

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

REPO = "RelistenNet/relisten-web"
REPO_ID = 88315752
DEFAULT = "master"
BUILD_PATH = ".github/workflows/preview-build.yml"
SHA = re.compile(r"[a-f0-9]{40}\Z")


class GitHubError(RuntimeError):
    def __init__(self, method, status):
        self.status = status
        super().__init__(f"GitHub {method} failed with HTTP {status}")


class GitHub:
    def __init__(self, token=None):
        self.token = token or os.environ["GH_TOKEN"]

    def request(self, path, method="GET", data=None, limit=4 * 1024 * 1024):
        if not path.startswith("/"):
            raise ValueError("GitHub path must be relative")
        request = urllib.request.Request(
            "https://api.github.com" + path,
            data=json.dumps(data).encode() if data is not None else None,
            method=method,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read(limit + 1)
        except urllib.error.HTTPError as error:
            # Do not log response bodies or URLs containing arbitrary PR metadata.
            raise GitHubError(method, error.code) from None
        if len(raw) > limit:
            raise ValueError("GitHub response exceeds limit")
        return json.loads(raw) if raw else None

    def pages(self, path, key=None):
        result = []
        for page in range(1, 101):
            data = self.request(
                path + ("&" if "?" in path else "?") + f"per_page=100&page={page}"
            )
            batch = data[key] if key else data
            if not isinstance(batch, list):
                raise ValueError("Expected paginated collection")
            result.extend(batch)
            if len(batch) < 100:
                return result
        raise ValueError("GitHub collection exceeds pagination limit")

    def current_default(self):
        repo = self.request("/repos/" + REPO)
        if repo["id"] != REPO_ID or repo["default_branch"] != DEFAULT:
            raise ValueError(
                "Repository identity/default branch changed; review trust configuration"
            )
        return self.request("/repos/" + REPO + "/commits/" + DEFAULT)["sha"]

    def pull(self, number):
        if type(number) is not int or not 1 <= number <= 9_999_999_999:
            raise ValueError("Invalid PR")
        return self.request(f"/repos/{REPO}/pulls/{number}")

    def eligible(self, pr):
        if (
            pr["state"] != "open"
            or (pr["head"].get("repo") or {}).get("id") != REPO_ID
            or "preview" not in [label["name"] for label in pr["labels"]]
        ):
            return False
        user = pr["user"]
        permission = self.request(
            f"/repos/{REPO}/collaborators/{urllib.parse.quote(user['login'], safe='')}/permission"
        )
        actual = permission.get("user", {})
        return (
            actual.get("id") == user["id"]
            and actual.get("permissions", {}).get("push") is True
        )

    def desired(self):
        # Finish every lookup before the caller mutates any applied state.
        pulls = self.pages(f"/repos/{REPO}/pulls?state=open")
        return {p["number"]: p for p in pulls if self.eligible(p)}

    def require(self, number, head):
        pr = self.pull(number)
        if not self.eligible(pr) or pr["head"]["sha"] != head:
            raise ValueError("PR no longer eligible at this head")
        if not SHA.fullmatch(head):
            raise ValueError("Invalid source SHA")
        return pr

    def status(self, number, head, state, description, url=None):
        if not SHA.fullmatch(head):
            raise ValueError("Invalid status commit")
        value = {
            "context": f"preview/private/pr-{number}",
            "state": state,
            "description": description,
        }
        if url:
            value["target_url"] = url
        previous = self.request(f"/repos/{REPO}/commits/{head}/status")["statuses"]
        latest = next(
            (item for item in previous if item["context"] == value["context"]), None
        )
        if (
            latest
            and all(latest.get(key) == expected for key, expected in value.items())
            and latest.get("target_url") == url
        ):
            return
        self.request(f"/repos/{REPO}/statuses/{head}", "POST", value)

    def dispatch(self, number, head, force=False):
        if not force:
            default_sha = self.current_default()
            runs = self.pages(
                f"/repos/{REPO}/actions/workflows/preview-build.yml/runs?event=workflow_dispatch&head_sha={default_sha}",
                "workflow_runs",
            )
            for run in runs:
                if (
                    run["display_title"] != f"Preview PR {number} {head}"
                    or run["head_sha"] != default_sha
                ):
                    continue
                if run["status"] != "completed":
                    return "building"
                if run["conclusion"] != "success":
                    # A known failed build needs a new head or explicit retry.
                    return "failed"
                artifacts = self.pages(
                    f"/repos/{REPO}/actions/runs/{run['id']}/artifacts", "artifacts"
                )
                if any(
                    a["name"] == f"preview-oci-{run['id']}-{run['run_attempt']}"
                    and not a["expired"]
                    for a in artifacts
                ):
                    return "built"
                # Only the newest outcome for this source/orchestration is
                # authoritative. Older failures cannot veto a later success.
                break
        self.require(number, head)
        self.request(
            f"/repos/{REPO}/actions/workflows/preview-build.yml/dispatches",
            "POST",
            {"ref": DEFAULT, "inputs": {"pr": str(number), "head": head}},
        )
        return "dispatched"
