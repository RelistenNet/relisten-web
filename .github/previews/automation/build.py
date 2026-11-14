"""Runs from trusted default-ref orchestration, never from the source checkout."""

import argparse
import json
import os
from pathlib import Path
from github import GitHub, REPO_ID


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["gate", "metadata", "dispatch"])
    parser.add_argument("--pr", type=int)
    parser.add_argument("--head")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    gh = GitHub()
    if args.mode == "dispatch":
        pr = gh.pull(args.pr)
        if gh.eligible(pr):
            gh.dispatch(args.pr, pr["head"]["sha"], force=True)
        return
    pr = gh.require(args.pr, args.head)
    orchestration = gh.current_default()
    if (
        os.environ["GITHUB_SHA"] != orchestration
        or os.environ["GITHUB_REF"] != "refs/heads/master"
    ):
        raise ValueError("Preview orchestration must use current default commit")
    metadata = {
        "version": 1,
        "repositoryId": REPO_ID,
        "pr": args.pr,
        "headSha": args.head,
        "authorId": pr["user"]["id"],
        "orchestrationSha": orchestration,
        "runId": int(os.environ["GITHUB_RUN_ID"]),
        "runAttempt": int(os.environ["GITHUB_RUN_ATTEMPT"]),
    }
    if args.mode == "metadata":
        args.output.write_text(json.dumps(metadata))
    else:
        with open(os.environ["GITHUB_OUTPUT"], "a") as output:
            output.write("head=" + args.head + "\n")


if __name__ == "__main__":
    main()
