# Plan 110: Core instance and query helpers

Status: complete, 2026-10-13.

## Goal

Close the wave 4 intersection entries of `research/catalogs/react-flow-parity-audit-2026-10-13.json`: `getNodesBounds()`, the `getIntersectingNodes`/`isNodeIntersecting`/`toObject`/`getNodesBounds` parts of `useReactFlow()` and `ReactFlowInstance`, Intersections, Node Collisions, Edge Intersection and Proximity Connect. Also give recipes a public edge-geometry query, so the Plan 109 eraser no longer reads private edge DOM. The host files `apps/vanilla/src/mount-flow.ts`, `packages/vue/src/flow-canvas.ts` and `packages/foldkit/src/graph.ts` stay untouched; host instance wiring comes later.

References: the pinned `packages/react/src/hooks/useReactFlow.ts` (`toObject` at 150, `getIntersectingNodes` at 210, `isNodeIntersecting` at 238, `getNodesBounds` at 270), `packages/system/src/utils/graph.ts:192` (`getNodesBounds`) and `examples/react/src/examples/Intersection`.

## Design

All helpers are pure functions in `packages/core`, so a host instance can wrap them over its snapshot and internal nodes.

- `flow-intersection.ts`: `getIntersectingNodes` gains the React form `(nodeOrRect, partially, nodes)`, which skips the node itself, while keeping the Plan 109 form `(candidates, rect, options)`. It also adds `isNodeIntersecting(nodeOrRect, area, partially)`. Nodes are internal nodes or `{ id, bounds }` candidates.
- `flow-instance.ts`: `getNodesBounds(nodes, { nodeLookup, nodeOrigin })` takes plain nodes, ids, internal nodes or candidates. `toFlowObject(snapshot)` returns detached nodes, edges and viewport. `graphBounds` stays.
- `flow-edge-geometry.ts`: `getEdgesGeometry(document, { measurements, positionOverrides })` and `getEdgeGeometry(document, edgeId, ...)` return each rendered edge's path, endpoints, sides, handle ids and label point. Paths come from the same core path functions the hosts draw with. `flowMeasurementsFromInternalNodes` turns host internal nodes into measurements. `getPathPolylines` flattens SVG path data, and `getEdgePolylines`, `getEdgeDistanceToPoint`, `isPointNearEdge`, `isEdgeIntersectingRect` and `getEdgeIntersections` are the hit tests.
- `flow-collision.ts`: `resolveNodeCollisions` pushes overlapping nodes apart along the cheaper axis, with margin, threshold and fixed nodes. `getClosestNode` and `getProximityConnection` implement the Proximity Connect rule.
- **Recipes.** Each host gets `ui-recipes/intersections/?scene=` `intersections`, `node-collisions`, `edge-intersection` and `proximity-connect`. Live drag bounds come from Vanilla `onNodeDrag` positions, Vue `nodeDrag` positions and, in Foldkit, pointer travel since press, added to the snapshot bounds. Crossing markers and the proximity preview are drawn in a page overlay. All three whiteboard erasers now hit-test edges with `getEdgesGeometry`.

## Tests

- Unit tests: `packages/core/src/domain/flow-{intersection,instance,edge-geometry,collision}.test.ts`.
- Browser tests: `apps/{vanilla,vue,foldkit}/e2e/intersection-recipes.e2e.ts` (5 tests each), plus the existing `whiteboard-recipes.e2e.ts`. All passed three runs in a row.

## Conformity and deviations

- **Conforming.**
  - `getIntersectingNodes(nodeOrRect, partially, nodes)` and `isNodeIntersecting` follow `useReactFlow.ts:210-252`: partial means any overlap; otherwise one rectangle contains the other; the node itself is skipped.
  - `getNodesBounds` follows `graph.ts:192`. It returns a zero rectangle for no nodes, skips unresolved ids, resolves through a lookup, and applies the node origin to plain nodes. The unit tests reproduce the documented example.
  - `toFlowObject` returns detached nodes, edges and viewport, like `toObject` (`useReactFlow.ts:150`).
  - Edge geometry reuses the core path and label functions that Vanilla, Vue and Foldkit draw with. The eraser e2e tests erase an edge at its rendered midpoint in all three hosts.
- **Intentionally different.**
  - Core functions take nodes explicitly; there is no store. Host instance methods will supply them.
  - Zero-area rectangles still never intersect (Plan 109).
  - `toFlowObject` also keeps a document `nodeOrigin`, so a round trip is lossless. Its arrays are deep copies; React copies shallowly.
  - The edge-geometry query skips edges whose handles do not resolve. Foldkit still draws those from default sides.
  - It gives the built-in path for the edge's `path` kind. Custom edge renderers that draw their own path, or Vue's `data.labelAnchor`, are not reflected.
  - With fixed nodes, `resolveNodeCollisions` moves only the others. The recipes fix the dropped node.
  - Proximity distance compares top-left corners by default, like the React example; `measure: 'center'` is available.
  - Recipes draw the proximity preview in a page overlay instead of adding a temporary edge to the document.
- **Unverified.** The Node Collisions, Edge Intersection and Proximity Connect examples are not in the pinned artifacts. Their behavior follows the public example descriptions, with no runtime comparison with React.
- **Host gaps found** (huge files out of scope):
  - Foldkit `onNodeDrag` carries the pointer's flow position, not the dragged node's, and snapshot reads return the committed pre-drag position. The Foldkit recipes therefore add the pointer travel since press to the snapshot bounds. That works for single-node drags without snapping, but it is a workaround.
  - Vue can report measured 0x0 sizes right after mount (Plan 109), so the Vue page re-renders when measured sizes change.
  - Erasers still mark candidates through host DOM classes for preview styling; only the hit test moved to the public query.
- **Test boundary.** Unit tests above; `apps/{vanilla,vue,foldkit}/e2e/{intersection,whiteboard}-recipes.e2e.ts`.
