# Preview runtime verification

The live pilot deployed and updated PRs 145 and 147 through private Tailscale HTTPS on November 14, 2026. The screenshot below shows PR 145 at commit `835648a`, with the normal branch name `codex/private-preview-pilot`. At 375px wide, the metadata remained visible without horizontal overflow. Both disposable PRs were closed without merging after the checks.

![Live preview with normal branch metadata](runtime-preview-mobile.jpg)

`NODE_ENV` stays `production` so previews use the optimized server. Preview rendering is selected separately by `RELISTEN_DEPLOYMENT_ENV=preview` and allowlisted PR, branch, commit and URL variables injected at runtime. An unrelated environment sentinel did not appear in either the preview or ordinary response during the local container proof.

## Browser and auth checks

Fresh Google sign-in completed through the shared backend. The second hostname initially returned 401 while the first was signed in; after its own sign-in, both returned the same parsed user ID and library contents. Reload preserved the session. Missing/invalid CSRF tokens returned 403; a valid token reached application validation and returned 422 for an invalid empty mutation batch. Logging out the fresh test session revoked the sibling preview session. These probes did not change favorites.

## Local boundary and layout checks

The same built `linux/amd64` image was started with and without preview metadata. Both containers ran as UID/GID 1001 with a read-only root and no capabilities. The preview indicator survived hydrated navigation to `/phish`; the ordinary container had none. About fitted a 1280×720 viewport and embed fitted 375×400. Preview privacy-policy responses returned `X-Robots-Tag: noindex, nofollow, noarchive`.

A separate security fixture deliberately used the literal branch name `review/$(NODE_ENV);<b>$(id)</b>`. Chrome displayed that text without creating a `<b>` element. `NODE_ENV` in that screenshot is part of the test branch name, not an unresolved variable. The [adversarial fixture screenshot](runtime-preview-adversarial-mobile.jpg) remains as evidence.

The web suite passed 39 tests, typecheck and production build passed, and focused lint passed on changed files. Full-repository lint still reports existing About and Open Graph errors. See [the structured proof](runtime-proof.json) and the [operator runbook](https://github.com/RelistenNet/relisten-flux/blob/codex/private-branch-previews/previews/pilot/README.md) for deployment, network, retirement and image-cleanup evidence.
