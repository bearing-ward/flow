# Plan 004: Cancel a group drag when any participant becomes invalid

> **Executor instructions:** Follow the steps and gates below; update only this row in `plans/README.md` after full success. **Drift check first:** `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/graph-renderers.e2e.ts`. Compare the current drag shape and reconciliation excerpt; stop if the participant contract changed.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** LOW; **Category:** bug
- **Depends on:** Plan 002 (and completed Plan 001) for shared position reconciliation
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

A group drag holds an initial list of node IDs. If an external document update removes a nonanchor participant, the host keeps previewing movement for survivors, but `applyNodePositionsChange` rejects the final change because one ID no longer exists. Cancellation should happen at the update boundary and restore authoritative positions.

## Current state

- `apps/vanilla/src/mount-flow.ts:483` stores `activeDrag`; `:1350-1355` cancels only if `dragAnchorId(activeDrag)` is not visible. `:1925-1938` previews every ID in the stored group positions.
- `:1169-1202` has `cancelActiveDrag(reason)`: it releases pointer capture, clears drag state, restores authoritative positions, rerenders graph positions and edges. Reuse it, including structured cancellation telemetry at `:1203-1215`.
- `packages/core/src/domain/flow-runtime.schema.ts:55-64` defines the group drag with participant positions. `:627-641` rejects a `node-positions` change if any ID is absent.
- `apps/vanilla/e2e/canvas.e2e.ts:1982-2029` tests removal of a single dragged anchor; it does not cover a surviving anchor with a removed group member. `docs/standards.md:7-16` keeps this browser lifecycle decision in `apps/`.

```ts
// apps/vanilla/src/mount-flow.ts:1350-1355
if (activeDrag !== null && !visibleNodes.has(dragAnchorId(activeDrag))) {
  cancelActiveDrag("node-removed");
}
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, and this plan's index row. Do not make core accept partial group changes, alter semantic change payloads, or add broad gesture lifecycle handling from Plan 007. Use `codex/004-cancel-group-drag` if isolated; no commit/push/PR without instruction.

## Steps

1. Add a controlled host browser case with two selected nodes. Start a group drag from one anchor, move enough to show preview, then call `controller.update` removing the other participant. Assert preview resets to the authoritative surviving position and pointer release emits no `node-positions` change. Add a companion case where both participants remain to keep normal group completion. **Verify:** focused browser command → removal case fails on old host, normal case passes.
2. At reconciliation, derive participant IDs from `activeDrag.positions` when present and the single node ID otherwise. Cancel if any participant is absent from the next visible graph, or its active drag contract is no longer valid; use the existing `cancelActiveDrag` path before entries are removed. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Run full verification. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Model the public `update` mid-gesture on `canvas.e2e.ts:1982-2029`; inspect browser preview and `flowChanges`, not only pure validation.
- [ ] Removing or hiding any group participant cancels the whole gesture and restores surviving nodes.
- [ ] A valid group drag still publishes exactly one final semantic change.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if group drag participants are no longer snapshotted, if the existing cancellation helper cannot restore all previews, if verification fails twice, or if core contract changes appear necessary. Any future controlled selection or visibility update during drag should be checked against this participant validity rule.
