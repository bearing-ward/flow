# Plan 009: Remove repeated edge scans from viewport culling

> **Executor instructions:** Read all sections and run the stated gates. Update only this plan's index row after success. **Drift check first:** `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/selection-and-culling.e2e.ts`. Compare the culling excerpt; stop if the host now uses a different visibility algorithm.

## Status

- **Priority:** P2; **Effort:** S; **Risk:** MED; **Category:** perf
- **Depends on:** Plans 003 and 004 (and completed Plan 001); they stabilize node reconciliation first
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

With `renderOnlyVisible`, the host first finds visible edges, then scans the entire edge array again for every node to see whether it touches one. This makes the node visibility pass grow with nodes × edges even though the relevant endpoint IDs can be gathered in one pass. The change should preserve visibility behavior while making that pass linear in node and edge counts.

## Current state

- `apps/vanilla/src/mount-flow.ts:1295-1331` builds `visibleEdges`, then `next.nodes` uses `next.edges.some(...)` for each node. The `visibleEdges` set is also passed to `edgeRenderer.setVisibleEdges` at `:1340`.
- `packages/core/src/domain/flow-visibility.schema.ts:46-93` owns `nodeIntersectsViewport` and `edgeIntersectsViewport` over the graph. Keep those semantics in core; this plan changes host lookup only.
- `apps/vanilla/e2e/selection-and-culling.e2e.ts:99` tests culling with two nodes and no edges. Add a real browser case containing measured offscreen nodes joined by an edge whose bounding area intersects the viewport, plus unrelated offscreen nodes. Unmeasured nodes intentionally mount initially, so await measurements before asserting culling.
- `docs/architecture.md:85,110` describes graph visibility and fit using derived geometry. Keep graph meaning in `packages/` and lifecycle in `apps/` per `docs/standards.md:7-16`.

```ts
// apps/vanilla/src/mount-flow.ts:1320-1327
if (
  !measurements.has(node.id) ||
  nodeIntersectsViewport(graph, node.id, rect) ||
  next.edges.some(
    (edge) =>
      visibleEdges?.has(edge.id) &&
      (edge.source === node.id || edge.target === node.id)
  )
) {
  visibleNodes.add(node.id)
}
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/selection-and-culling.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/selection-and-culling.e2e.ts`, and this plan's index row. Do not change core intersection math, edge renderer visibility, culling defaults, or package APIs. Use `codex/009-culling-index` if isolated; no commit/push/PR without instruction.

## Steps

1. Add a browser visibility case with hundreds of nodes and edges, including: a measured node inside the viewport, measured endpoints outside it whose visible edge crosses the viewport, and unrelated measured offscreen nodes. Assert node and edge counts/IDs before and after viewport changes, then return the viewport. **Verify:** focused browser command → all assertions pass on the old host (behavior characterization).
2. While gathering visible edges in `operations.reconcile`, also gather their source and target IDs in a `Set<NodeId>`. Replace `next.edges.some` inside the node loop with `visibleEndpointIds.has(node.id)`. Preserve hidden-ancestor, unmeasured, and viewport-intersection checks. **Verify:** `bun run typecheck` and focused browser command → exit 0; `rg -n 'next\.edges\.some' apps/vanilla/src/mount-flow.ts` → no culling-loop match.
3. Run full verification. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Follow `selection-and-culling.e2e.ts:168-229`; the added test must assert browser output, not just a helper Set. Use deterministic graph positions and no timing threshold in CI.
- [ ] Visible-edge endpoints remain mounted, unrelated measured offscreen nodes are culled, and viewport return restores them.
- [ ] The culling node loop has no edge-array scan; it uses precomputed endpoint membership.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the new large fixture cannot produce stable measured/culling assertions, if edges no longer determine endpoint visibility, if a dependency changes the culling contract, or if another file must change. Future culling changes should maintain a clear linear pass over edges and nodes.
