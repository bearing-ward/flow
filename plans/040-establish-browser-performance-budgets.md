# Plan 040: Measure browser hot paths and set performance budgets

> **Executor:** Use an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- apps/vanilla/src/edge-renderer.ts apps/vanilla/src/canvas-ui.ts apps/vanilla/src/mount-flow.ts scripts/bench-flow-geometry.ts`. STOP if a new performance design already replaced either measured path.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** LOW; **Category:** perf, tests
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** DONE — `e2ac3cd`, `15e467a`; benchmark and full verification passed. The measured variance and limited 4,000-node sample do not justify a stable latency budget, so checklist 224 remains open.

## Why this matters

Core geometry has an informational benchmark, but the project has no budget for full browser reconciliation or gesture frames. Full edge reconciliation resolves endpoints with repeated node scans; minimap updates replace every SVG rect during a drag. The complexity is visible, but user-visible cost is unmeasured. Measure before choosing an index or incremental DOM strategy.

## Current state and conventions

- `scripts/bench-flow-geometry.ts:11-35,61-66` measures core graph and spatial operations at 250, 1,000, and 4,000 nodes using median/p95 samples; it does not time browser edge or minimap DOM work. Earlier Plan 012 did not justify a spatial index from core timings.
- `apps/vanilla/src/mount-flow.ts:2073` invokes full edge reconciliation. `apps/vanilla/src/edge-renderer.ts:185-196` visits ordered edges; `packages/core/src/domain/flow-edge.schema.ts:37-39` scans nodes for endpoint lookup. Drag previews use affected-edge updates (`mount-flow.ts:1453-1464`), so do not label the full O(E×N) work a per-pointer-move cost.
- `apps/vanilla/src/mount-flow.ts:772-780,1453-1464` updates the minimap during drag; `apps/vanilla/src/canvas-ui.ts:171-188` clears and recreates node rectangles. The playground enables the minimap at `apps/vanilla/src/main.ts:212`.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Existing core baseline | `bun run scripts/bench-flow-geometry.ts` | exit 0 with finite median/p95 values |
| Browser benchmark | `bunx playwright test apps/vanilla/e2e/performance.e2e.ts --workers=1` | exit 0 with finite reported samples after the test is added |
| Full gate | `bun run verify` | exit 0 |

**In scope:** a new browser benchmark under `apps/vanilla/e2e/`, an optional focused benchmark script under `scripts/`, `docs/tooling.md` or a new performance document, `research/PROGRESS.md`, and this index row. **Out of scope:** changing the edge/minimap algorithms before measurement, adding a spatial index, hardware-independent absolute latency claims, imported artifacts.

## Steps

1. Build deterministic 250/1,000/4,000-node fixtures with proportional edges and explicit viewport/minimap options. Measure full document reconciliation separately from single-node drag frames. Record median/p95, browser/OS, sample count, warmup, and DOM mutation counts; verify no non-finite sample. **Verify:** browser benchmark exits 0 twice and distinguishes the two paths in output.
2. Compare minimap enabled/disabled and edge count variants to isolate DOM and endpoint lookup costs. State relative ratios and a machine-checkable regression budget justified by observed baseline variance; keep informational absolute timings if hardware variation is too high. **Verify:** benchmark command exits 0 on two repeated runs with the chosen stable ratio/operation-count assertions.
3. Document the chosen budget and whether a follow-up optimization is warranted. If endpoint lookup or minimap churn dominates, draft a separate targeted fix plan; do not silently refactor this measurement slice. **Verify:** `bun run verify`, benchmark command, and `git diff --check` exit 0. Close checklist 224 only if a repeatable large-graph budget actually runs in the gate.

## Test plan and done criteria

- [ ] Reproducible fixture sizes and proportional edge counts cover full reconcile and gesture frames separately.
- [ ] Output includes finite median/p95 plus DOM/operation counts; no noisy absolute threshold is enforced without variance evidence.
- [ ] A justified, repeatable budget runs in the full gate, or checklist 224 stays open with the exact reason.
- [ ] No production algorithm changed in this plan.

## STOP conditions and maintenance

STOP if local noise prevents a stable threshold or if a benchmark requires a production API solely for measurement. Record the attempted environment and leave the budget open. Reassess budgets after changing rendering, culling, or minimap update paths.
