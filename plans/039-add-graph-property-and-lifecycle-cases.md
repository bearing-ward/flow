# Plan 039: Add property and lifecycle proof for graph contracts

> **Executor:** Use an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- packages/core/src/domain apps/vanilla/e2e research/PROGRESS.md`. Re-read the core contracts if changed; STOP if the planned invariants no longer hold.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** LOW; **Category:** tests
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** TODO

## Why this matters

The core has focused examples for nested graph, resize, and coordinate conversion; the checklist still lacks broad property and invalid-state coverage. Deterministic generated cases can catch combinations of hierarchy, visibility, positions, and viewport values that examples miss. Browser lifecycle cases should prove that invalid updates and interruption do not leave resources or stale previews.

## Current state and conventions

- `packages/core/src/domain/flow-graph.test.ts:16-33,53-73` tests one three-level tree and inherited hidden state. `packages/core/src/domain/flow-graph.ts:46-68` derives the reusable graph view.
- `packages/core/src/domain/flow-runtime.schema.ts:759-773` defines inverse screen/flow conversion; `flow-runtime.schema.test.ts:360-370` tests one round trip. `research/PROGRESS.md:222-224` leaves property, invalid-state/lifecycle, and performance proof open.
- `apps/vanilla/e2e/advanced-gestures.e2e.ts:343-353,370-396` checks cancellation and controlled resize. Use deterministic seeded generation inside tests; avoid a new dependency unless its owner and removal boundary are recorded in `docs/dependencies.md`.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Core properties | `bunx vitest run packages/core/src/domain/flow-graph.test.ts packages/core/src/domain/flow-runtime.schema.test.ts` | exit 0 |
| Browser lifecycle | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts --workers=1` | exit 0, documented native skips only |
| Full gate | `bun run verify` | exit 0 |

**In scope:** the named core test files or adjacent new test files, focused vanilla E2E, `research/PROGRESS.md`, and this index row. **Out of scope:** core semantic rewrites, new dependencies by default, native device proof (Plan 037), imported artifacts, and closing checklist items without their full matrices.

## Steps

1. Add deterministic generated acyclic trees of depths 1-5 in scrambled document order; assert each resolved absolute position equals the sum of local positions along its ancestor chain, hidden ancestry propagates, and graph queries retain stable IDs. Log the seed when a case fails. **Verify:** core property command exits 0 over a fixed seed set.
2. Generate finite positions and positive zoom values across translation/sign extremes; assert `screenToFlowPosition(flowToScreenPosition(p,v),v)` is within a documented floating-point tolerance. Add invalid graph inputs for cycles, missing parent, duplicate IDs, and malformed bounds using existing decode rejection patterns. **Verify:** core property command exits 0 and each invalid case rejects through the typed boundary.
3. Add browser cases for invalid controlled update and removal/unmount during an active preview: assert no semantic completion, no stale transform/capture/observer, and a fresh mount or gesture succeeds. **Verify:** focused browser command, `bun run verify`, and `git diff --check` exit 0. Update only checklist cells fully covered.

## Test plan and done criteria

- [ ] Fixed seeds and tolerance make property failures reproducible.
- [ ] Hierarchy, hidden state, coordinate inverse, and invalid decode boundaries have generated assertions.
- [ ] Lifecycle browser cases assert rendered state and resources, not only event counts.
- [ ] Full verify passes; checklist wording matches actual coverage.

## STOP conditions and maintenance

STOP if a generated counterexample reveals a production bug; preserve the seed and failing input, then open a separate fix. Do not weaken the generator or tolerance to hide a real failure. Keep property cases fast enough for `bun run verify`.
