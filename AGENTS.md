<!-- timber:start -->

This is a timber.js app. Before working, read `node_modules/@timber-js/app/agent-skill.md`.
It matches the installed timber version and updates when timber is upgraded.
<!-- timber:end -->

## House rules

- **Issues:** file them with `lb create`, not `gh issue create`. See [Issue tracking with lb](#issue-tracking-with-lb).
- **Dev server:**
  - Use `npx timber dev status` to find the running one; don't start a second one.
  - Don't kill dev servers you didn't start.
  - After upgrading timber or other packages, the dev server needs a restart.
- **Tests:** browser tests intercept scrobbles (`/api/v4/live/play`) and audio (`.mp3` / `.flac`), so they don't pollute real listening data or hit `audio.relisten.net`. Only write useful tests that are worthwhile if needed.
- **URLs:** build every internal URL with `href()` and query strings with `defineSearchParams` (`buildSearchParams`), never as template strings.
- **Reviews:** check every change against `.claude/review-lessons.md`.

## Issue tracking with lb

This project uses **lb** for all issue tracking. Don't use markdown TODOs or other task lists. Never commit `.lb/`.

**Create every issue with the template:** [`./lb-task-template.md`](./lb-task-template.md). Design decisions live in `docs/`; issues cite them rather than restating them.

```bash
lb ready --json                                          # unblocked work
lb show RE-42 --json                                  # issue details
lb create "Title" -d "..." -p 0-4 --json                 # new issue (use the template)
lb create "Title" -d "..." -p 2 --discovered-from RE-42 --json
lb update RE-42 --status in_progress --json           # claim
lb close RE-42 --reason "Fixed in PR #123" --json     # complete
```

If an issue is already `in_progress`, someone else is on it. Pick another.

### Issue lifecycle

The issue should always reflect where the work actually is. Don't leave it for the user to tidy up.

| Work state                                 | Issue action                                                          |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Starting work                              | `lb update <id> --status in_progress --json`                          |
| PR opened                                  | `Fixes <id>` in the PR body; `lb comment add <id> "PR #<PR>"`         |
| PR merged                                  | `lb close <id> --reason "Fixed in PR #<PR>" --json`                   |
| Committed to `master` (only when told to)  | `lb close <id> --reason "Fixed in <sha>" --json` right after pushing  |
| PR closed unmerged, or work abandoned      | `lb update <id> --status open --json` and comment why                 |
| Scope or diagnosis changed from the ticket | `lb comment add <id> "..."` with what was actually found and done     |
| Out-of-scope problem found                 | `lb create ... --discovered-from <id> --json`, then keep to the issue |

### Staying in scope

- Work only on what the issue's **Files** and **Done When** cover. Anything else you notice becomes a new issue with `--discovered-from`, not part of this diff.
- If the issue turns out to be wrong, comment on it and stop, rather than widening the change.
