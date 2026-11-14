# Trusted preview control

These workflows are prepared for the web default branch. See the
[operator runbook](https://github.com/RelistenNet/relisten-flux/blob/codex/private-branch-previews/previews/pilot/README.md)
for current activation status and live evidence (infrastructure repository access required).
Once activated, the web repository runs this reviewed bundle from its default branch.
PR source is checked out separately and used only as the Docker build context.
The bundle never executes PR scripts, local actions, manifests, or workflow YAML.
`sync.py` vendors these files plus the fixed renderer/identity into the web repo;
its manifest records the infrastructure commit and SHA-256 of every copied file.
There is no cross-repository credential in CI.

Three workflows separate authority:

- `preview-dispatch.yml`: metadata-only PR events; dispatches the trusted build
  at `master`. No Tailscale, cluster, package, or environment credential.
- `preview-build.yml`: validates current same-repository PR, `preview` label and
  author's current effective push permission; builds the exact source head in
  Docker with read-only repository access. Exports one-day OCI artifacts. A
  separate notification runner has only Actions write access and explicitly
  dispatches control; branch code never runs on that runner.
- `preview-control.yml`: serialized default-ref dispatched/scheduled/manual
  reconciliation. Rechecks run identity, orchestration/source heads, author ID
  and current permission before publishing or deploying. Copies bytes through
  pinned Skopeo without starting the branch image. Uses preview-scoped cluster
  credentials in the `relisten-previews` environment.

The control identity is limited by environment branch policy, OIDC repository
ID/default-ref/workflow claims, a separate Tailscale tag, and Kubernetes RBAC.
No Secrets, pod exec, production Deployment changes or public Ingress writes
are permitted. The sole production exception updates the precreated auth-origin
ConfigMap. Effective authority must be tested with the actual CI credential.

The registry records working, rollback and pending candidates before side
effects. A failed candidate is recorded before cleanup/rollback. Repair resumes
interrupted recovery and never repeatedly deploys a known failed head. Explicit
manual retry or a new source head permits another attempt. Retirement removes
routes and waits for NGINX drain, retires auth origins, then deletes the private
Ingress and workload resources with UID preconditions. An independent sweep
finds labelled resources missing from the registry. Failed GitHub reads abort;
they are never interpreted as an empty eligible set.

The operator verifies the private preview package repository link once and pins
its immutable ID in environment variable `PREVIEW_PACKAGE_ID`. Publishing and
deletion fail closed on an ID or visibility change.

Package cleanup retains deployed, rollback and pending digests, plus any actual
preview Deployment image. First-observed-unreferenced marks persist across runs;
versions become eligible after 15 minutes. Marks drain in batches of 128 so an
outage backlog cannot prevent its own cleanup. Logs report the waiting backlog;
index children remain protected while a surviving parent references them, then
receive their own grace. Authenticated manifest reads
before and after pruning check protected digests. Consumed/superseded OCI artifacts
are deleted immediately; completed orphan artifacts after one hour. Every cleanup
failure fails the control run and retries on the next scan. Reconciliation emits
the earliest persisted image deadline. A separate Actions-only job waits for that
deadline and dispatches another scan; it has its own concurrency group and does
not block deployments. At most one wakeup runs and one waits. A full deletion
batch enrolls the next batch before scheduling, so cleanup continues without
cron. This may occupy one public-repository runner for up to fifteen minutes.
The five-minute cron remains a fallback and may be delayed by GitHub.

Reviewers opt in with the `preview` label on a same-repository PR whose author
currently has effective repository write access. `preview/private/pr-N` links to
the private URL only after deployment and smokes pass. The runtime indicator names
the PR/commit and reminds reviewers that account writes are shared with production.
A missing UI reader in an older branch is not patched by CI.

Before the first opt-in, run `preview-control.yml` manually with
`package_proof=true` and require successful publication/deletion of its exact
disposable private image version. For a known failed head, dispatch the same
workflow with `retry=N`; ordinary scans preserve the working image and do not
retry that head repeatedly. A new source head also permits another attempt.
