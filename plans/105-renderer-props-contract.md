# Plan 105: Custom renderer props contract

Status: complete, 2026-10-13.

## Goal

Give custom node renderers, edge renderers and connection previews React Flow style props in Vanilla, Vue and Foldkit, so developers can write the same custom nodes, custom edges and connection lines as React Flow. Audit entries: `EdgeProps`, `NodeProps`, `EdgeTypes`, `NodeTypes`, `ConnectionLineComponent`, `ConnectionLineComponentProps`, `ConnectionLineType` and `<EdgeLabelRenderer />`.

The reference types are `packages/react/src/types/edges.ts` (`EdgeProps`, `ConnectionLineComponentProps`), `packages/system/src/types/nodes.ts` (`NodeProps`) and `packages/react/src/components/EdgeLabelRenderer`.

## Design

- **Core: `packages/core/src/domain/flow-renderer-props.ts`.**
  - `flowEdgeRendererProps` returns `FlowEdgeRendererProps`: `id`, `type`, `source`, `target`, handle ids, `sourceX/Y`, `targetX/Y`, `sourcePosition`, `targetPosition`, `selected`, `selectable`, `deletable`, `data`, `label`, marker URLs, `interactionWidth`, the built-in `labelX/labelY`, and `sourceNode`/`targetNode` bounds for floating edges. The result feeds `getBezierPath(props)` directly.
  - `flowNodeRendererProps` returns `FlowNodeRendererProps`: `id`, `type`, `data`, `selected`, `dragging`, `positionAbsoluteX/Y`, `isConnectable`, `zIndex`, and measured `width`/`height`.
  - `flowConnectionLineProps` returns `FlowConnectionLineProps`: `fromNode`, `fromHandle`, `fromX/Y`, `toX/Y`, `fromPosition`, `toPosition`, `toNode`, `toHandle`, `connectionStatus`, `connectionLineType`, `pointer`, the original `preview`, and the built-in `path`. Reconnections derive the fixed end from the edge.
  - `connectionLinePath` builds that path per `FlowConnectionLineTypeSchema` value the way React Flow's `ConnectionLine` does.
- **Vue.**
  - `edgeTypes`, `nodeTypes` and `connectionPreview` components get the props they declare, plus the existing `edge`/`path`/markers, `node` or `preview`. Undeclared props are not passed, so they never fall through as DOM attributes. Functional components without declared props get everything.
  - The new `connectionLineType` prop sets the built-in preview path.
  - `FlowEdgeLabelRenderer` registers its slot with the canvas, which renders it in an HTML layer that follows pan and zoom. Teleport is not used because it would keep the SVG namespace.
  - Types `FlowNodeProps`, `FlowEdgeProps`, `FlowConnectionLineComponentProps`, `FlowNodeTypes` and `FlowEdgeTypes` are exported.
  - Node and edge renderer props are memoized per id (`sameFlowNodeRendererProps`, `sameFlowEdgeRendererProps`), so pan and zoom do not re-render custom renderers. Declared prop names are cached per component and include `extends`, `mixins` and a loaded async component's props.
- **Vanilla.**
  - `FlowEdgeRenderContext` gains `props` and `edgeLabelRenderer`, a per-canvas HTML layer.
  - Node renderers get `props` as a third argument and in `update(node, props)`. `update` runs only on document changes, as before. Per-frame props (`dragging`, position) go to an optional `updateProps(props)` on the instance; renderers without it are not called per drag frame.
  - Custom edge instances may add `updateProps(props, context)`. When present it replaces `update` on position-only passes (node drag frames), skipping frames whose props did not change. Without it, edges keep the old behavior: `update` runs on drag frames.
  - Connection line props are built only when a custom preview or `connectionLineType` needs them, from a graph cached per document, measurements and rendered positions (`apps/vanilla/src/flow-graph-cache.ts`).
  - `connectionPreview` gets `line` as a third argument.
  - A new `connectionLineType` option sets the built-in preview path.
- **Foldkit.**
  - `FoldkitEdgeGeometry.props` carries the edge props.
  - Edge renderers get a fourth `edgeLabelRenderer` callback whose HTML goes to a keyed group in the label layer.
  - Node renderers get `props` as a third argument, and `connectionPreview` gets `line` as a third argument.
  - The registry gains `connectionLineType`.
  - The registry and renderer types are now exported publicly.

## Tests

- **Core unit tests** (`flow-renderer-props.test.ts`): edge props feed `getBezierPath` and match `bezierEdgePath`, node props, connection line props for a connect and a reconnect, and the step path.
- **Vue unit tests** (`packages/vue/src/edge-label-renderer.test.ts`): declared props through `extends`, mixins and async components, and the props cache.
- **Browser tests per host** (`renderer-props.e2e.ts`), with shared helpers in `apps/shared-e2e/renderer-props.ts`:
  - A `getBezierPath(props)` custom edge matches the built-in edge after dragging its target node; Vanilla also checks during the drag frames, and that `update` is not called for them.
  - A renderer written against the original contract still renders. Vanilla checks its `update(node)` is not re-run per drag frame; Vue checks no renderer props fall through and that pan/zoom do not re-render custom nodes or edges.
  - The custom edge's `getBezierPath(props)` path equals the built-in bezier edge's `d`.
  - The custom node reports `dragging` true during a drag and false after it, along with its position, selection, z-index and size.
  - The built-in bezier preview's `d` equals core's `connectionLinePath('bezier', …)` for its endpoints.
  - A custom preview receives `fromNode`, `fromHandle`, the positions, `toNode` and `connectionStatus`.
  - The HTML edge label sits on its flow point at zoom 1 and 1.5 and scales with zoom.

## Conformity and deviations

- **Conforming.**
  - The props match React Flow names and semantics. Custom-path-equals-built-in is tested in every host, including after a node drag.
  - Connection line paths per type match React Flow's `ConnectionLine` switch, with step using a smooth step at radius 0.
  - `toPosition` is the hovered handle's side only when the connection is valid, else the opposite of `fromPosition`, as in `XYHandle.ts:192` (`packages/core/src/domain/flow-renderer-props.ts`, unit-tested).
  - `fromNode` and `toNode` have the same shape, `FlowNodeBounds`, as React's are both `InternalNode`.
  - Vue drags one node at a time, so the dragged node is the one reporting `dragging`, as in React.
- **Intentionally different.**
  - `animated` is omitted because Flow edges have no `animated` field.
  - `NodeProps` omits `sourcePosition`, `targetPosition` and `dragHandle`: Flow nodes declare handle sides on `handles` and have no drag-handle selector field (Vanilla marks drag handles with `data-flow-drag-handle`).
  - `sourceHandleId`/`targetHandleId` are the resolved handle ids. Vanilla and Vue only render edges whose handles resolve, so they are never null there. Foldkit draws an edge from a default side when a handle does not resolve and passes null, which matches React's `string | null`.
  - The default `connectionLineType` stays straight to keep existing previews. React Flow defaults to bezier.
  - `fromNode`/`toNode` are node bounds plus the Flow node, not React's internal node.
  - Vanilla and Foldkit nest edge props under `props`, because Vanilla's `source`/`target` were already endpoint points.
  - Vanilla delivers per-frame props only through the opt-in `updateProps`, to keep `update` off the drag path for renderers that rebuild DOM. React re-renders the component instead.
  - The label layer sits above edges in every host. In Foldkit it shares z-index 1 with the built-in label layer.
  - Only the drag anchor reports `dragging` in Vanilla and Foldkit, so in a multi-node drag the other moved nodes report false; React marks every dragged node. Vue moves the dragged node by transform and Foldkit on release, so there `positionAbsolute` and edges update after the drop. Vanilla updates them per frame.
  - A Vue async component (`defineAsyncComponent`) receives only `node`, `edge` or `preview` until it has loaded; the next canvas render passes its declared props.
- **Unverified.**
  - There is no live React runtime comparison.
