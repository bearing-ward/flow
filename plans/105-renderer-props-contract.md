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
- **Vanilla.**
  - `FlowEdgeRenderContext` gains `props` and `edgeLabelRenderer`, a per-canvas HTML layer.
  - Node renderers get `props` as a third argument and in `update(node, props)`. Props are pushed again when `dragging` or the rendered position changes.
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
- **One browser test per host** (`renderer-props.e2e.ts`), with shared helpers in `apps/shared-e2e/renderer-props.ts`:
  - The custom edge's `getBezierPath(props)` path equals the built-in bezier edge's `d`.
  - The custom node reports `dragging` true during a drag and false after it, along with its position, selection, z-index and size.
  - The built-in preview draws a bezier for `connectionLineType: 'bezier'`.
  - A custom preview receives `fromNode`, `fromHandle`, the positions, `toNode` and `connectionStatus`.
  - The HTML edge label sits on its flow point at zoom 1 and 1.5 and scales with zoom.

## Conformity and deviations

- **Conforming.** The props match React Flow names and semantics. Custom-path-equals-built-in is tested in every host. Connection line paths per type match React Flow's `ConnectionLine` switch, with step using a smooth step at radius 0. `toPosition` is the hovered handle's side, or else the opposite of `fromPosition`.
- **Intentionally different.**
  - `animated` is omitted because Flow edges have no `animated` field.
  - `sourceHandleId`/`targetHandleId` are the resolved handle ids, never null.
  - The default `connectionLineType` stays straight to keep existing previews. React Flow defaults to bezier.
  - `fromNode` is node bounds, not React's internal node.
  - Vanilla and Foldkit nest edge props under `props`, because Vanilla's `source`/`target` were already endpoint points.
  - The label layer sits above edges in every host. In Foldkit it shares z-index 1 with the built-in label layer.
  - Only the drag anchor reports `dragging` in Vanilla and Foldkit. Foldkit nodes move on release, so `positionAbsolute` updates after the drop.
- **Unverified.**
  - Vanilla custom edges keep their last props during a node drag, because projection-only passes do not call `update`. This is existing behavior.
  - There is no live React runtime comparison.
