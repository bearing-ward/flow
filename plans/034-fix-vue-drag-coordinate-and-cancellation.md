# Plan 034: Fix Vue child dragging and preview cleanup

> **Executor:** Use an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- apps/vue/src/FlowCanvas.ts apps/vue/e2e packages/conformance/src`. If gesture ownership or the parent-local contract changed, STOP and report.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Category:** bug
- **Depends on:** 033; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** DONE — `8549283`; cumulative `bun run verify` passed in the isolated worktree.

## Why this matters

Vue captures a child's absolute position at drag start and publishes it as a parent-local `node-position`, so the child jumps after completion. Its transient transform remains after Escape or pointer cancellation because only normal pointerup removes it. A valid node ID containing CSS selector punctuation can also break the current DOM lookup.

## Current state and conventions

- `apps/vue/src/FlowCanvas.ts:147-168`: drag start stores `originX: nodePosition(node).x`; pointerup publishes `originX + dx`. Core's `FlowNode.position` is parent-local (`packages/core/src/domain/flow-graph.ts:52-65`). Keep the local position in the semantic change.
- `apps/vue/src/FlowCanvas.ts:164,230-234`: pointerup and move use an interpolated `querySelector`; Escape and pointercancel only clear `session.value`. `packages/core/src/domain/flow-values.ts:3` accepts any nonempty node ID, including selector punctuation.
- `apps/vue/e2e/shared-conformance.e2e.ts:5` drives shared fixtures; `apps/vue/e2e/conformance.ts:37-49,61-70` performs a drag and snapshots `left/top` but not `transform`. The test must assert actual visual restoration as well as emitted changes. Follow the existing controlled acknowledgement test at `apps/vue/e2e/shared-conformance.e2e.ts:42`.

## Commands and scope

| Purpose     | Command                        | Expected |
| ----------- | ------------------------------ | -------- |
| Vue browser | `bun run test:conformance:vue` | exit 0   |
| Full gate   | `bun run verify`               | exit 0   |

**In scope:** `apps/vue/src/FlowCanvas.ts`, `apps/vue/e2e/shared-conformance.e2e.ts`, `apps/vue/e2e/conformance.ts` and its harness if required, `packages/conformance/src/index.ts` only for a cross-adapter case every host can run, `research/fixtures/README.md`, and this index row. **Out of scope:** core schemas, vanilla/Foldkit gesture redesign, framework feature parity, imported research artifacts.

## Steps

1. Add a Vue browser case for dragging a nested child in controlled and uncontrolled modes. Record the emitted local position and final rendered world position; use a nonzero parent origin so absolute/local confusion fails. **Verify:** Vue browser command demonstrates the pre-fix failure, then passes after the change.
2. Store the active node's local drag origin and its DOM element in the session, or use another selector-free stable reference. Preview signed deltas in both directions; publish one parent-local change on completion. **Verify:** Vue browser command exits 0 for left/up and right/down drags, including a valid ID with selector punctuation.
3. Route Escape, pointercancel, relevant node removal, and unmount through one preview cleanup path that removes the transform, releases capture where owned, and emits no position change. Assert style/bounding box restoration, not only `left/top`; then prove a fresh drag works. **Verify:** Vue browser command, `bun run verify`, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Child drag publishes local coordinates and renders at parent absolute position plus new local position.
- [ ] Cancelled preview restores actual pixels and emits no `node-position` in all listed paths.
- [ ] Valid selector-punctuation IDs do not throw or target another node.
- [ ] Negative preview deltas work; a second gesture works after cancellation; full verify passes.

## STOP conditions and maintenance

STOP if Plan 033 changes the semantic position contract or if cleanup requires modifying core gestures. Preserve Vue's existing controlled acknowledgement rule. Do not use escaped selectors as an excuse to keep duplicate DOM state without a clear lifetime.
