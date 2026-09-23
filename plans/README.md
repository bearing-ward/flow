# Implementation plans

Plan 001 was written against the original unborn `main` and is complete at
`e393e3e`. Plans 002-010 were written with the improve skill on 2026-09-23
against that commit after a standard audit; the user selected all nine vetted
findings. Read each plan fully, run its drift check and STOP conditions, and
update its status row after the complete verification gate passes. Preserve
unrelated work. Do not commit, push, or open a PR without operator instruction.
Plan 011 was added on 2026-09-23 against `5274aef` as the next bounded slice
from `research/PROGRESS.md` and the current handoff.

## Execution order and status

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-stabilize-graph-and-rendering-contracts.md) | Stabilize the graph document and extensible rendering contracts | P1 | L | none | DONE — `bun run verify` passed in the isolated worktree |
| [002](002-reposition-descendants-on-update.md) | Reposition descendants after an authoritative parent update | P1 | S | 001 | DONE — `0f4fef2`, reviewed; verify passed |
| [003](003-render-graph-stacking-order.md) | Render nodes in the graph's stacking order | P1 | S | 002 | DONE — `090aeb1`, reviewed; verify passed |
| [004](004-cancel-invalid-group-drag.md) | Cancel a group drag when any participant becomes invalid | P1 | S | 002 | DONE — `7e31770`, reviewed; verify passed |
| [005](005-clean-up-failed-renderer-mount.md) | Clean up a host when its initial renderer mount fails | P1 | M | 001 | DONE — `ed89b4b`, reviewed; verify passed |
| [006](006-unify-saved-document-contract.md) | Derive the saved-document contract from the domain schema | P1 | M | 001 | DONE — `2bb0933`, reviewed; verify passed |
| [007](007-cancel-gestures-on-lifecycle-loss.md) | Cancel active gestures on Escape, blur, and pointer capture loss | P1 | M | 004, 005 | DONE — `a44a5df`, reviewed; verify passed |
| [008](008-refresh-project-status-docs.md) | Refresh the handoff, progress checklist, and dependency record | P2 | S | 001; schedule after 002-007 | DONE — `72db1db`, reviewed; verify passed |
| [009](009-index-visible-edge-endpoints.md) | Remove repeated edge scans from viewport culling | P2 | S | 003, 004 | DONE — `a58a3a5`, reviewed; verify passed |
| [010](010-update-only-affected-edges-during-drag.md) | Update only affected edges during a node drag | P2 | M | 002-005, 009 | DONE — `a1e1e3a`, reviewed; verify passed |
| [011](011-characterize-spatial-and-gesture-contracts.md) | Establish spatial and gesture baselines before changing core state | P1 | M | 001-010 | DONE — `b41072a`, reviewed; verify passed |

Status values: TODO, IN PROGRESS, DONE, BLOCKED with a reason, or REJECTED with
a reason.

Plans 002-010 were executed and reviewed in the isolated worktree
`/Users/richardmcandrews/.codex/worktrees/flow-plans-002-010/flow`, based on
`e393e3e`. Their nine commits are now on `main` through fast-forward `a1e1e3a`.

## Dependency notes

- Land 002 before 003 and 004: all three touch node reconciliation, and 002
  establishes the absolute-position update behavior they must preserve.
- Land 004 and 005 before 007: general gesture cancellation should build on
  correct group cancellation and guaranteed mount cleanup.
- Run 008 after the P1 implementation plans if its handoff should describe
  their results; it can be moved earlier for a documentation-only handoff.
- Land 003 and 004 before 009, then 009 before 010, to keep the culling and
  drag-edge performance work grounded in a stable browser reconciliation path.
- 006 is independent of the browser plans and should land before freezing or
  distributing the public persistence contract.
- Foldkit and Vue adapter work should wait for the graph/browser contract fixes
  and shared conformance design. The separate direction suggestions from the
  audit were not part of the nine selected defect/maintenance findings.
- 011 is the next characterization slice: it traces spatial and gesture paths,
  adds semantic cases, and measures graph-query scaling before specifying a
  spatial index or gesture-state implementation. It maps completed work back to
  `research/PROGRESS.md`; the remaining checklist scopes stay open.

## Findings considered and rejected

- Split the 3,556-line vanilla host immediately: structural cost is real, but
  a broad extraction before these contract fixes would add high regression
  risk. Reconsider after interaction characterization and a shared suite.
- Change Playwright's unconditional `reuseExistingServer: true` now: a stale
  server could weaken local evidence, but the audit did not reproduce a wrong
  server being used. Investigate if a gate behaves inconsistently.
- No security issue met the evidence threshold in the audited host and core
  paths. Imported upstream artifacts and dependency advisories were not audited.
