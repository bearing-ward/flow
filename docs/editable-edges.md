# Editable and freeform edges

`FlowEdge.route` stores route intent independently of opaque `FlowEdge.data`. All built-in hosts render saved manual routes, including when point editing is disabled.

## Route schema

`FlowEdgeRouteSchema` defines two modes. An absent route uses automatic mode for existing documents.

```ts
type Route =
  | { readonly mode: 'automatic' }
  | {
      readonly mode: 'manual'
      readonly points: readonly [Point, ...Point[]]
    }

type Point = { readonly x: number; readonly y: number }
```

`FlowRoutePointSchema` requires finite coordinates. `FlowRoutePointsSchema` requires at least one point and rejects adjacent duplicates. Array order runs from source to target. Points are absolute graph coordinates, including for edges between nested nodes. Source and target anchors come from current handle measurements and never enter the stored point list.

`FlowRoutePoint`, `FlowRoutePoints`, `FlowEdgeRoute`, and `FlowRouteChange` derive from their Effect schemas. Later document bundles can reuse the point schemas while owning their own membership and point order. This contract contains no bundle references, generated router paths, or browser measurements.

Manual routes produce an SVG polyline through the current anchors and interior points. A [wire bundle](wire-ties.md) takes precedence while the edge is bundled; unbundling restores its retained manual intent. Labels sit at half the total path length. Coincident endpoint segments collapse in rendered geometry without changing authored points. Edge distance, rectangle selection, and intersection helpers consume the same path. Automatic routes retain the edge's existing `path` algorithm.

## Host APIs and gestures

| Host | Editing option | Programmatic edits |
| --- | --- | --- |
| Vanilla | `editableEdges: true` on `createFlow`, `mountFlow`, or `createFlowHost` | Controller `applyEdit` or `updateEdge` |
| Vue | `editableEdges` on `FlowCanvas` | `useFlow().applyEdit` or `updateEdge` |
| Foldkit | `GraphInteractionOptions.editableEdges`, passed to `createProgram` | `createFoldkitFlowInstance().applyEdit` or `updateEdge`, or the Runtime edit ports |

The editing option defaults to false. Point handles are focusable. A pointer drag previews the route and commits one edit on release. Escape, pointer cancellation, lost capture, blur, and disposal cancel the active preview. Hosts own capture, graph coordinate conversion, auto-pan, focus, and cleanup.

Double-clicking an edge inserts a point in the nearest segment's order. Enter on a focused edge inserts a point at its label anchor. Delete or Backspace on a point removes that point. Removing the last point returns the edge to explicit automatic mode. Arrow keys move a focused point by one graph unit. Shift increases that step to ten units.

Holding Space before a pointer connection begins selects freeform mode for that gesture. The preview follows sampled graph positions. Loose-mode gestures started at a target reverse their samples when the connection normalizes its source and target, so saved points always run source to target. A valid release creates an ordinary edge with manual route intent in the same edge-add commit. Space ownership is resolved before pane pan and keyboard connection activation. Cancelled or rejected connections add no edge.

`editEdgeRoute(document, edgeId, command, geometryOptions?)` returns an Effect containing one route-only `update-edge` transaction. Commands are `manual`, `automatic`, `insert`, `move`, and `remove`. Invalid indices, malformed points, unresolved edges, and degenerate routes fail before submission. Applications submit the transaction through their existing host edit API. Preparation alone does not imply controlled-owner acceptance.

`getManualRouteGeometry(source, target, points)` returns the shared path and label. `hitTestRoutePoint(points, position, tolerance)` returns the nearest point index within graph-space tolerance, with the lowest index winning ties. `sampleRoutePoint(points, position, minimumDistance?)` retains points in traversal order and omits short repeated samples.

## History, persistence, and clipboard

Point previews do not change accepted state. Each committed point drag, insertion, removal, or keyboard action uses the existing [transaction history](transaction-history.md). Reconnection and endpoint motion retain interior graph coordinates. A rejected controlled proposal records no history entry.

`encodeVersionedFlowDocument` and `encodeVersionedFlowSession` choose version 4 when an edge owns a route field, including explicit automatic mode, and no newer semantics are present. V4 extends the frozen v3 saved edge projection. Documents that own wire bundles use v5; documents with [node rotation](node-rotation.md) use v6, which preserves both routes and bundles. Older writers and mislabeled older envelopes reject route-bearing input with `route-requires-versioned-session` rather than discard route intent.

The [session clipboard](graph-clipboard.md) preserves route fields and opaque data. Paste translates manual points by the same graph-space offset as the copied roots, before extension hooks. Endpoint and handle ID remapping remains unchanged.

The `/editable-edges/` recipe is available in Vanilla, Vue, and Foldkit. [Plan 156's trace](../research/traces/156-editable-edges.md) records production paths, acceptance evidence, and the public reference boundary.
