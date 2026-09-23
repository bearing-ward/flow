# Plan 010: Update only affected edges during a node drag

> **Executor instructions:** Read the plan fully and run each gate. Update only this plan's index row on success. **Drift check first:** `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/src/edge-renderer.ts apps/vanilla/e2e/graph-renderers.e2e.ts`. Compare the pointer and edge rendering excerpts; stop if an incremental drag path already exists or renderer ownership changed.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** MED; **Category:** perf
- **Depends on:** Plans 002-005 and 009 for stable node/edge reconciliation; Plan 001 is DONE
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

Each node pointer move invokes full `edgeRenderer.reconcile`. That builds a graph, sorts all edges, resolves each endpoint with document-array searches, and updates every custom edge renderer. A graph with many unrelated edges does nearly the same work as an authoritative document update on every drag frame. Keep full reconciliation for document and visibility changes; use a geometry-only path for affected edges during an active drag.

## Current state

- `apps/vanilla/src/mount-flow.ts:1913-1955` writes the preview positions, calls `renderGraphPositions`, then `edgeRenderer.reconcile(document, renderedNodePositions)` for every pointer move. `:514-520` already derives the graph and applies each visible node's absolute position.
- `apps/vanilla/src/edge-renderer.ts:66-71` stores measured handles and keyed edge elements. `:150-172` builds a fresh graph and iterates all ordered edges. `:202-265` computes endpoints, built-in/custom paths, and label anchors. `:337-449` updates custom visuals, hit path, reconnect anchors, and labels. Preserve one geometry calculation path so full and incremental updates cannot disagree.
- `packages/core/src/domain/flow-edge.schema.ts:37-40` uses two node-array searches per edge in `resolveEdgeHandles`; avoid that lookup on each drag frame by retaining a validated endpoint index from full reconciliation.
- `apps/vanilla/e2e/graph-renderers.e2e.ts:53-181` provides custom renderer lifecycle recording and path assertions; `:10-51` covers parent and child movement. `research/PROGRESS.md:224` calls for large-graph performance coverage. Do not equate a static code change with measured responsiveness.
- `docs/architecture.md:85,91` keeps absolute geometry in the core graph and visual SVG lifetimes in the host. Do not put DOM or renderer instances in `packages/`.

```ts
// apps/vanilla/src/mount-flow.ts:1935-1955
for (const { nodeId, position } of change.positions) {
  renderedNodePositions.set(nodeId, position);
}
renderGraphPositions();
// ... single-node branch also calls renderGraphPositions()
edgeRenderer.reconcile(document, renderedNodePositions);
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/edge-renderer.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, and this plan's index row. Do not change edge path formulas, core schemas, public renderer callbacks, document ownership, or edge stacking. Use `codex/010-drag-edge-updates` if isolated; no commit/push/PR without instruction.

## Steps

1. Add a deterministic browser fixture with many unrelated edges and a small connected set, using custom edge renderers that count `update` calls. Wait for initial handle measurements, then reset the counters before dragging. Drag one node and assert connected hit/visual paths, labels, reconnect anchors, and child-linked edges move. Assert unrelated custom renderers receive no drag-frame `update` calls. Include a full document update afterward to assert normal reconciliation still updates changed unrelated edges. **Verify:** focused browser command → the unrelated update-count assertion fails on old host.
2. In the edge renderer, build an edge-by-ID and node-to-incident-edge index at full reconciliation. Factor geometry/paint for a single existing edge so full and incremental paths share it. Expose a host-only method that accepts the current graph positions and IDs moved by the gesture, expands them to descendants whose absolute positions changed, and updates only incident visible edges. If the node host already has the graph from `renderGraphPositions`, pass that graph instead of rebuilding it in the edge method. Preserve keyed elements, custom renderer lifetimes, hit path parity, labels, markers, and toolbar anchors. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Keep the full `reconcile` path for authoritative document updates, culling, measurement changes, gesture completion/cancellation, and renderer type or stacking changes. Check group drag and parent-child movement as well as a single flat node. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Follow `graph-renderers.e2e.ts:53-181` for custom renderer call recording and DOM path assertions. The many-edge fixture is an operation-count budget: unrelated edge renderer updates during a drag move must be zero. Avoid a wall-clock CI threshold that depends on host load.
- [ ] Each drag move repaints only edges incident to nodes whose absolute positions changed; unrelated edge callbacks are untouched.
- [ ] Connected edge visual, hit path, label, and reconnect anchors track single, group, and parent drags; full document updates still reconcile all needed changes.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if incremental rendering would duplicate path/label geometry logic, if a parent drag cannot identify changed descendants, if custom renderer callbacks require every edge to update by contract, or if another file must change. Future geometry, culling, or edge decoration changes must cover both full and incremental paths with one shared calculation.
