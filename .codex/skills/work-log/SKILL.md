---
name: work-log
description: Use when maintaining project work logs, TODO/DONE handoff notes, or rules for recording completed work in this repository.
metadata:
  short-description: Keep work logs and handoff notes consistent
---

# Work Log

Use this skill when the user asks to record work, update TODO/DONE notes, preserve original requests, or define how future Codex work should leave a handoff trail.

## Repository Convention

- In this repository, work logs live in `TODO.md`.
- Preserve the user's original request text as `原文`.
- Move completed work into `DONE` under the date it was completed.
- Keep `TODO` for unfinished or explicitly deferred work only.
- Include the practical implementation summary, key files, verification performed, and any residual risk or unverified manual checks.
- Do not invent facts. If the original request was not recorded, write `原文: （未記録...）` and explain the source of the work briefly.

## When Updating Logs

Write enough detail for a later Codex or human to resume without rereading the whole diff:

- what changed and why
- the important files or commands
- validation results
- known gaps, blockers, or manual checks still needed

Prefer concise bullets. Avoid turning logs into full design documents; link to `CLAUDE.md`, `DESIGN.md`, or source files when the detail already belongs there.
