# Implementation plans

Written with the improve skill on 2026-09-23 against an unborn `main` branch.
The source checkout has no Git commit, so plan 001 records baseline file hashes
for drift detection. Read the entire plan and its STOP conditions before work.

## Execution order and status

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-stabilize-graph-and-rendering-contracts.md) | Stabilize the graph document and extensible rendering contracts | P1 | L | none | DONE — `bun run verify` passed in the isolated worktree |

Status values: TODO, IN PROGRESS, DONE, BLOCKED with a reason, or REJECTED with
a reason. Complete the graph semantics steps before the renderer steps within
plan 001. Foldkit and Vue adapter work follows this contract milestone.

## Findings considered and rejected

No audit findings were considered. This was a requested `plan` invocation, so
the improve skill skipped the broader audit.
