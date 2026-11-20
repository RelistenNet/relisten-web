# lb Task Template

When creating lb tasks, follow this structure:

```bash
lb create "Short descriptive title" \
  -d "$(cat <<'ENDDESC'
## Context

What exists today, what's missing, and why this task matters.
Reference the specific files/lines where the gap is.
Always cite design docs: docs/<topic>.md

## Approach Constraints

DO:
- Specific technical requirements
- Patterns to follow

DO NOT:
- Anti-patterns to avoid
- Scope boundaries

## Files

MODIFY: path/to/file.ts (what changes)
CREATE: path/to/new-file.test.ts
READ-ONLY: docs/relevant-doc.md

## Done When

- Observable outcome (a test, a page behaving a certain way)
ENDDESC
)" \
  -p 2 \
  --discovered-from RE-XXX
```

## Key rules:

- **Context**: Explain the current state, the gap, and cite design docs
- **Approach Constraints**: DO/DO NOT lists with specific technical guidance
- **Files**: MODIFY/CREATE/READ-ONLY with parenthetical explanation
- **Done When**: what a reviewer checks to close it
- **Deps**: Use `--discovered-from RE-XXX` for follow-up tasks, `--blocks RE-XXX` / `--blocked-by RE-XXX` for ordering, `--parent RE-XXX` for an epic's tasks
- Priority: P0 (critical), P1 (high), P2 (normal), P3 (low), P4 (backlog)
