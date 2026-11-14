<!-- timber:start -->

This is a timber.js app. Before working, read `node_modules/@timber-js/app/agent-skill.md`.
It matches the installed timber version and updates when timber is upgraded.
<!-- timber:end -->

## House rules

- **Issues:** file them with `lb create`, not `gh issue create`.
- **Dev server:**
  - Use `npx timber dev status` to find the running one; don't start a second one.
  - Don't kill dev servers you didn't start.
  - After upgrading timber or other packages, the dev server needs a restart.
- **Tests:** browser tests intercept scrobbles (`/api/v4/live/play`) and audio (`.mp3` / `.flac`), so they don't pollute real listening data or hit `audio.relisten.net`. Only write useful tests that are worthwhile if needed.
- **URLs:** build every internal URL with `href()` and query strings with `defineSearchParams` (`buildSearchParams`), never as template strings.
- **Reviews:** check every change against `.claude/review-lessons.md`.
