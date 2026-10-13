# Plan 107: Edge and connection recipes

Status: complete, 2026-10-13.

## Goal

Show that wave 1 edge and connection entries of `research/catalogs/react-flow-parity-audit-2026-10-13.json` are achievable with public APIs in Vanilla, Vue and Foldkit. The entries are: UI "Edge with Button", "Edge with Node Data" and "Animated SVG Edge", and the examples "Floating Edges", "Simple Floating Edges", "Easy Connect", "Edge Markers" and "Multi Connection Line". Each host gets a recipe page and a browser test. The work builds on the renderer props from [Plan 105](105-renderer-props-contract.md) and the BaseEdge primitives from Plans 103 and 104.

References: `examples/react/src/examples/FloatingEdges` and `EasyConnect` in the pinned xyflow artifacts, plus the React Flow UI docs for `ButtonEdge`, `DataEdge` and `AnimatedSvgEdge`. The Simple Floating Edges, Edge Markers and Multi Connection Line examples are not in the pinned artifacts.

## Design

- **Core: `packages/core/src/domain/flow-floating-edge.ts`.**
  - `getNodeIntersection`, `getEdgePosition` and `getFloatingEdgeParams` port the example's `getEdgeParams` intersection math.
  - `getSimpleFloatingEdgeParams` snaps each end to the midpoint of the side facing the other node.
  - `getFloatingConnectionStart` gives a floating start point for connection lines.
  - The results use path-helper names (`sourceX`, `sourcePosition` and so on), so they go straight into `getBezierPath`. Inputs are plain rects, so `FlowNodeBounds` from edge props fits.
- **One recipe page per host: `ui-recipes/edge-recipes/?scene=<scene>`.** The scenes are `button-edge`, `data-edge`, `animated-svg-edge`, `floating-edges`, `simple-floating-edges`, `easy-connect`, `edge-markers` and `multi-connection-line`. The recipe code is app code, not new package API.
  - **Edge with Button.** BaseEdge plus a button in the host's edge label layer at `labelX/labelY`. The button deletes its edge through the host's public delete or edit API.
  - **Edge with Node Data.** The label reads `sourceNode.node.data[data.key]` from edge props, and re-renders when a page control changes that node's data through the public API.
  - **Animated SVG Edge.** A shape moves along the edge path with `<animateMotion>`. Under `prefers-reduced-motion: reduce`, the recipe drops the animation and parks the shape at the label point. It follows changes to the media query.
  - **Floating and Simple Floating Edges.** Custom edges compute their endpoints from `sourceNode`/`targetNode` bounds with the core helpers, and recompute them on every props update, including during drags.
  - **Easy Connect.** The whole node acts as a handle. Each node has a source and a target handle that CSS stretches over the node body, and a drag strip on top moves the node. The canvas uses loose connection mode where that is needed. New edges are floating edges. A custom connection line draws a straight line and a circle at the pointer.
  - **Edge Markers.** Built-in `arrow`/`arrowclosed` markers sit next to a custom edge that defines its own `<marker>` elements, such as a circle, a diamond and a colored, resized arrow, from edge `data`, and references them with `url(#id)`. The marker model is unchanged.
  - **Multi Connection Line.** A custom connection preview draws a line from every selected node's handle that matches `fromHandle.id` to the pointer. On connect, the page adds one edge per selected node.

## Tests

- Core unit tests in `flow-floating-edge.test.ts`.
- One browser test per host, `e2e/edge-recipes.e2e.ts`, covering each scene's journey:
  - Delete by click and by keyboard.
  - Label text after a data change.
  - Animation present, then removed under emulated reduced motion.
  - Endpoints on the facing border, before and during a drag and after the drop.
  - A body-to-body connection that creates a floating edge.
  - Marker elements and references.
  - Preview line count and endpoints, then the edges created.

## Conformity and deviations

- **Conforming.**
  - The floating-edge intersection and side math matches the pinned `FloatingEdges/utils.ts` and `EasyConnect/utils.tsx`. Unit tests cover it.
  - Button, data and animated edges follow the React Flow UI component behavior: delete from the label layer, a label from the source node's data, and `<animateMotion>` along the edge path.
  - Easy Connect connects from the node body, rejects drops on the pane and self-connections, and creates floating edges.
  - Multi Connection Line draws one preview line per selected node to the pointer and creates one edge per selected node.
- **Intentionally different.**
  - The recipes are app code in each host's `ui-recipes/edge-recipes` page, not packaged components.
  - `getNodeIntersection` aims at the other node's true center. React offsets the other node's top-left by the intersecting node's half size, which only matches for nodes of equal size.
  - Easy Connect uses loose connection mode with one body-sized handle per node, not React's stacked source and target handles.
  - Custom markers come from a custom edge that owns its `<marker>` defs. The edge marker model still has only `arrow` and `arrowclosed`, and React's marker `color`, `width` and `strokeWidth` options are not on `FlowEdge`.
  - Animated SVG Edge drops the animation under `prefers-reduced-motion`, which React Flow UI does not do.
  - Vanilla edges follow a drag live through the opt-in `updateProps` from Plan 105b.
  - Vue and Foldkit floating edges update after the drop. Both hosts commit node moves on release, and their built-in edges behave the same way, so the tests assert during-drag stability and post-drop geometry there.
  - In Vue, multi-connection extra edges are added on `connectEnd`.
  - The Vue recipe hides the resize handle that covers a selected node's right-hand handle.
- **Unverified.**
  - The Simple Floating Edges, Edge Markers and Multi Connection Line references are not in the pinned artifacts. The scenes follow the public example descriptions, and there is no runtime comparison with React.
- **Host change.** Vue `edge-label-renderer.ts` now renders each label in its own view, which updates with its edge. Before this, a node-data-only change never reached the HTML label.
- **Test boundary.** `apps/{vanilla,vue,foldkit}/e2e/edge-recipes.e2e.ts`, one test per scene.
