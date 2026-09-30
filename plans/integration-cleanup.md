# Approved integration and cleanup, 2026-09-30

The maintainer authorized commit, merge, and cleanup after the bounded approvals. The integration joins two approved snapshots:

- `074e8cfd0b7bcabd13535218283747b4601554fe` records Plan 066 structural ownership checks, the initial Plan 063 provider reference evidence, and current planning records.
- `f2b02d8d6553f30f311beceb5e089731eb1840bb` records the bounded Plan 075 legacy persistence guard, frozen baseline fixtures, and correlated snapshot client.

Stopped product changes from extended Plan 063 and Plans 064, 065, and 068 are excluded. Plan 069 remains blocked. The approved Plan 073 artifact is a design prerequisite. All 2,692 original members and 8,076 host cells remain accounted for, and all 8,076 semantic cells remain open.

## Merge review

There were four conflicts, all in evidence records. Both appended narratives survive in `research/PROGRESS.md` and `research/traces/public-api-completion.md`. `research/generated/SUMMARY.md` was regenerated with `bun run research:inventory`. Calibration started from the latest approved guard snapshot and retains the subsequent verifier records. Formatting preserved every decoded calibration value. No imported `research/artifacts/` file changed.

Root independently compared 84 non-evidence paths against the approved snapshot commits. Every path matched an approved snapshot. The sole additional source change is the separately reviewed two-line measurement wait described below. Production behavior and semantic member statuses were not extended during integration.

## Verification and the measurement race

The first combined `bun run verify` passed 381 unit tests, all three installed packed consumers, and Vanilla's 299 browser tests with two existing skips. Vue passed 111 tests and failed its shared connection test during `page.evaluate` with "Resulting promise was garbage collected." The failure occurred in the unchanged mount path at `apps/vue/e2e/conformance.ts:33`. A transient browser lifecycle failure remains an inference, with no root-cause fix claimed.

One unchanged full rerun failed an existing Vanilla Button Handle assertion. The initial style was read before asynchronous measurement. Measurement subsequently added `visibility: visible` while keeping dimensions and transform unchanged. The production callback sets measured-width, measured-height, and visibility together at `apps/vanilla/src/mount-flow.ts:2360-2363`. The reviewed test now waits for measured width 190 and height 100 before capturing initial style at `apps/vanilla/e2e/button-handle-recipe.e2e.ts:9-11`. Both exact style assertions, action counts, keyboard behavior, pointer drag, and connection targeting assertions remain intact. Production code, retries, skips, and browser configuration are unchanged.

The focused command `bun run test:browser -- button-handle-recipe.e2e.ts --repeat-each=5 --workers=1` passed all five runs. The subsequent mandatory `bun run verify` completed with exit 0:

- Quality, package builds, TypeScript, architecture across 194 production sources, documentation, catalogs, ownership, and research traces passed.
- Vitest passed 44 files and 381 tests. The normal suite includes the 13 ownership-checker tests and the 14 additional approved provider reference tests. The earlier cross-worktree checker exit-139 attempts remain historical failures.
- All three installed packed consumers passed installation, peer resolution, typecheck, styles, browser behavior, and disposal.
- Vanilla passed 299 browser tests with two existing native-device skips. Vue passed 112. Foldkit passed 118. Total browser passes were 529.
- The original Vue connection testcase passed unchanged in the final full run. Its initial failure remains recorded.

The final full log is `/tmp/flow-approved-integration-verify-measurement-fix.log`. The first failure and unchanged rerun logs are `/tmp/flow-approved-integration-verify.log` and `/tmp/flow-approved-integration-verify-rerun.log`. The focused recipe log is `/tmp/flow-integration-button-handle-measurement.log`. These logs are also preserved in the task archive below. Local verification does not establish CI, deployment, native-device, collector delivery, calibrated timing budgets, or complete Plan 075 acceptance.

## Recoverable cleanup

The four blocked execution worktrees were archived through Codex managed worktree tools. Their Git snapshots preserve changes and untracked source files. Ignored browser evidence and 167 earlier temporary evidence files were copied before removal to `/Users/richardmcandrews/.codex/task-archives/flow-2026-09-30-approved-integration`. This directory also holds both failed integration logs, browser failure artifacts, the successful final log, and the focused recipe log.

Worktree paths in earlier plans and progress notes identify where historical checks ran. They are not promises that those checkouts still exist after cleanup. Attached archived worktrees remain recoverable through Codex's artifact list and restore-worktree operation. The two approved integration commits remain in Git history. Main integration and cleanup of the approved staging checkouts follow the final reviewed integration commit. No push or publication is authorized or claimed here.
