# Plan 002: Reposition descendants after an authoritative parent update

> **Executor instructions:** Read this plan in full. Work through the steps in order, run each gate, and update only this plan's row in `plans/README.md` when the final gate passes. Stop under the conditions below. **Drift check first:** run `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/graph-renderers.e2e.ts`. If either file changed, compare the excerpts below with live code. Stop if the described reconciliation path has changed.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** MED; **Category:** bug
- **Depends on:** Plan 001 (DONE)
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

`FlowNode.position` is parent-local for a child. A controlled update that moves only a parent changes the child's derived absolute position, but the existing child DOM element keeps its old transform. Edges derive the new position and can detach visually from the child. Keep DOM node positions consistent with the core graph on every authoritative reconciliation.

## Current state

- `apps/vanilla/src/mount-flow.ts:3428-3435` assigns `document = nextDocument` and calls `operations.reconcile(document, previous)` from the public controller update.
- `:1297` derives `graph = createFlowGraph(next, measurements, renderedNodePositions)`. `:1430-1454` applies `graphNode.absolutePosition` only inside `!sameNode(previousNodes.get(node.id), node)`; an unchanged child skips that branch.
- `:514-520` already has `renderGraphPositions`, which positions every retained entry and updates toolbar anchors. Preserve drag previews held in `renderedNodePositions`; do not derive positions from raw child coordinates.
- `apps/vanilla/src/edge-renderer.ts:162,202-211` uses the newly derived graph positions for endpoints.
- `apps/vanilla/e2e/graph-renderers.e2e.ts:10-51` tests a parent pointer drag, not a parent-only controlled `update`. Follow its real `mountFlow` and bounding-box pattern.
- `docs/architecture.md:85-87` says parent movement moves descendants and the core graph owns absolute geometry. Keep browser lifecycle in `apps/` and graph meaning in `packages/` per `docs/standards.md:7-16`.

Current branch condition:

```ts
// apps/vanilla/src/mount-flow.ts:1430-1454
} else if (!sameNode(previousNodes.get(node.id), node)) {
  // renderer and wrapper updates
  const graphNode = graph.nodes.get(node.id);
  if (graphNode !== undefined) applyNodePosition(entry.element, graphNode.absolutePosition);
  updated += 1;
}
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | Inventory, trace check, typecheck, unit, build, and browser stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, and this plan's status row in `plans/README.md`. Do not alter the core graph, persisted coordinates, CSS stacking, or renderer API. Use an isolated `codex/002-reposition-descendants` branch/worktree if the operator wants one. The observed commit style is `feat(flow): ...`; do not commit, push, or open a PR without operator instruction.

## Steps

1. Add a browser case with a controlled document containing a parent, unchanged child, and an edge with measured handles. Move only the parent's position through `controller.update`. Assert parent and child bounding boxes shift by the same delta, the child's local document position stays unchanged, and the edge path endpoint tracks the moved child. **Verify:** `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` → the new case fails on the old implementation and existing cases pass.
2. In `operations.reconcile`, apply each visible entry's `graph.nodes.get(node.id)?.absolutePosition` after keyed creation/update, including retained nodes whose own fields did not change. Keep renderer `update` gated on node field changes, and preserve `renderedNodePositions` during an active drag. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Check controlled parent acknowledgment, parent-only update with a culled then revealed child, and toolbar anchor behavior using the same browser file. Avoid extra tests that only repeat the new branch. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Follow `graph-renderers.e2e.ts:10-51`. The regression case must exercise public `mountFlow`/`update` and rendered positions, not only `createFlowGraph`.
- [ ] A parent-only controlled update moves every visible descendant by the parent's delta and keeps its connected edge attached.
- [ ] No spurious custom renderer `update` occurs for an unchanged child; drag preview and toolbar tests still pass.
- [ ] Focused browser command, `bun run typecheck`, and `bun run verify` exit 0.
- [ ] Compared with the recorded preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the current host has moved to nested DOM positioning, if applying graph positions would overwrite an active preview, if a step fails twice after a reasonable correction, or if another file must change. Future graph features should distinguish changes to declared node fields from changes to derived absolute geometry; reviewers should inspect both.
