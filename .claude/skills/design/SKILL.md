---
name: design
description: Design and build new UI with the complete ui.sh design guideline system.
---

# Design

Use this when the user wants to create new UI that follows the full ui.sh design guideline system.

## Activation

### Use For

- designing new UI, layouts, sections, components, or pages from scratch
- implementing visually polished Tailwind CSS UI
- adding a new section or page to an existing UI
- applying reusable design, markup, and Tailwind authoring rules while building UI

### Do Not Use For

- UI picker scaffolding only
- semantic unstyled markup from screenshots, Figma exports, mockups, wireframes, or UI images
- component extraction or code organization only
- Tailwind class cleanup only
- adding dark mode to an existing UI only
- making an existing desktop-oriented UI responsive only

## Load First

- Read [UI Design Guidelines](./design-guidelines.md) before writing UI code.
- Scan the rule-file index and load every guideline file that could apply.
- Load reference modules only when the request needs that reference material.

## Progress Updates

Keep the user informed so longer runs do not look stuck.

- One-line status update before each major phase.
- Concrete and lightweight: what you are doing now, not verbose logs.

## Workflow

1. Inspect the user's request, target files, existing design conventions, and available components.
2. Load [UI Design Guidelines](./design-guidelines.md) plus every applicable rule file.
3. Implement the UI using the project's existing framework, component patterns, assets, and Tailwind conventions.
4. Check the result across responsive breakpoints and interaction states.

## Rules

- Treat the guideline files in this skill as the source of truth for new UI design work.
- Err on the side of loading too many applicable guideline files rather than too few.
- Preserve user constraints unless a guideline explicitly requires asking about a design conflict.

## Verify

- Check desktop and mobile layouts.
- Confirm every applicable guideline file was loaded and followed.
- Run relevant formatting, lint, typecheck, or tests when available.
