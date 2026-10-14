# Plan 116: Vue final parity wiring

Status: complete, 2026-10-13.

## Goal

Bring the open in-scope Vue entries of `research/catalogs/react-flow-parity-audit-2026-10-13.json` to C. This wires the Plan 114 core contracts and the Plan 110 instance helpers into `packages/vue`, following the Plan 114 host wiring checklist. Core is unchanged.

## Changes

1. **Provider and composables.**
   - New `provider.ts`: `FlowProvider` holds the editor of the canvas below it, so `useFlow`, `useStore` and the other composables work in canvas siblings (React `ReactFlowProvider`). Reads show an empty graph until a canvas mounts.
   - New `use-store.ts`:
     - `useStore(selector, equality = Object.is)` returns a ref that is replaced only when `equality` reports a change.
     - `useKeyPress(keyCode, options)` returns a readonly boolean ref.
   - `useFlow()` gains `getNodes`, `getEdges`, `toObject`, `getIntersectingNodes`, `isNodeIntersecting`, `getNodesBounds` and `ariaLabelConfig`. `getNode`/`getNodes` set `measured`.
2. **Model and styling** (`flow-canvas.ts`, new `canvas-presentation.ts`).
   - Nodes:
     - node `style`/`className` and a `selected` class;
     - default handles from `flowNodeHandles` at every handle read;
     - `dragHandle`.
   - Edges:
     - edge group classes (`selected`, `animated`, `className`);
     - the path `style`;
     - the `animated` dash animation, off under reduced motion;
     - HTML label text and background styles with React padding and radius defaults;
     - markers from `collectFlowEdgeMarkers`/`resolveFlowEdgeMarker`.
   - Theme: `--flow-*` tokens via `flowThemeStylesheet('.flow-vue-canvas')`, injected once per document. Canvas, nodes, edges, handles, selection, controls, background, minimap and labels read them.
   - Stacking: node z-index from `computeFlowStacking`. Edges above z 0 render in per-z SVG layers inside the node stacking context, as React's z-level edge SVGs.
   - New canvas props:
     - `colorMode` (`system` follows `matchMedia`);
     - `zIndexMode`, `elevateNodesOnSelect`, `elevateEdgesOnSelect`;
     - `snapToGrid`, `snapGrid`, `translateExtent`, tuple `nodeExtent`;
     - `ariaLabelConfig`, `defaultMarkerColor`;
     - `fitView`, `fitViewOptions`, `minZoom`, `maxZoom`;
     - `nodesFocusable`, `edgesFocusable`, `edgesReconnectable`.
   - `fitView` decodes `FlowFitViewOptionsSchema`, including `{ id }[]` nodes, `includeHiddenNodes`, `minZoom` and `maxZoom`.
   - Panels and controls accept `center-left`/`center-right`. Controls, minimap and node/edge `aria-describedby` texts come from `ariaLabelConfig`.
3. **Drag constraints** (new `drag-constraints.ts`). Each drag step snaps the anchor's absolute position, keeps root members in `nodeExtent` as a group and clamps `extent: 'parent'` children. `expandParent` children go through `calculateFlowExpandParentDrag`. The preview renders the grown parent; the drop commits each grown parent as one `node-bounds` change with its children. Split-model canvases now emit `update:nodes` for `node-bounds`.
4. **MiniMap.** `FlowMiniMap` accepts the `FlowMiniMapOptions` props: node colour, stroke and class as a value or function, border radius, stroke width, `bgColor`, mask colour/stroke, `position`, `pannable`, `zoomable`, `inversePan`, `zoomStep` and `ariaLabel` (`null` removes the title). It adds a mask path and takes custom nodes through a `node` slot or `nodeComponent`, both given `FlowMiniMapNodeProps`.
5. **Resizer** (new `node-resizer.ts`).
   - `FlowNodeResizer` and `FlowNodeResizeControl` render inside custom nodes, as React. They support min/max, `keepAspectRatio`, `isVisible`, `color`, line/handle classes and styles, `position`, `variant`, `resizeDirection`, `autoScale`, `shouldResize`, and `resizeStart`/`resize`/`resizeEnd` emits with `ResizeParams`.
   - Gestures run `startFlowNodeResize`/`stepFlowNodeResize` with the parent extent, child extent, children, `expandParent` and snapped pointers. Each step commits `node-bounds`, plus parent growth from `calculateFlowExpandParent`.
   - **`nodesResizable`** keeps its built-in controls on selected nodes that do not render a resizer of their own. A node that renders `FlowNodeResizer` or `FlowNodeResizeControl` opts out.
6. **Labeled Group.** New `FlowLabeledGroupNode` UI renderer and the `/ui-recipes/labeled-group/` recipe.

`<ReactFlow />` props deliberately not mapped:

- `paneClickDistance`, `nodeClickDistance`;
- `connectionLineStyle`, `connectionLineContainerStyle`;
- `deleteKeyCode`, `selectionKeyCode`, `multiSelectionKeyCode`;
- `autoPanOnNodeFocus`, `autoPanOnNodeDrag`, `autoPanOnSelection`, `autoPanSpeed`;
- `preventScrolling`, `zoomOnPinch`, `reconnectRadius`;
- `attributionPosition`, `proOptions`, `width`/`height`, `debug`;
- `onBeforeDelete`/`onNodesDelete`/`onEdgesDelete`/`onDelete` as canvas props. They stay `deleteElements` lifecycle options.

`nodeOrigin` stays on the document.

## Tests

- Unit: `packages/vue/src/drag-constraints.test.ts` covers snap, group `nodeExtent`, the parent clamp, `expandParent` growth and label style mapping.
- Browser: `apps/vue/e2e/final-wiring.e2e.ts`, 12 tests, 3 of 3 runs. The tests cover:
  - provider, composables, instance helpers and `fitView`;
  - Base Style and Updating Nodes;
  - Dark Mode;
  - z-index, panels, aria and `dragHandle`;
  - snap and extents;
  - MiniMap options and gestures;
  - the resizer components, the switch relationship, and Labeled Group.
- Updated: `minimap`, `canvas-ui-contract` and `base-edge`, for React default labels and the themed default stroke.

## Conformity and deviations

- **Conforming.**
  - Style, className and default handles, as React `NodeWrapper`.
  - Edge `animated` dash keyframes and React label padding/radius defaults.
  - Marker geometry and ids from the core marker contract.
  - Theme tokens with React light and dark values.
  - z-index for selection and children.
  - `dragHandle`.
  - Snapping (absolute anchor), `nodeExtent` and `extent: 'parent'` clamps, `expandParent` growth (`updateNodePositions`/`handleExpandParent`) and `translateExtent` on every viewport write and request.
  - MiniMap options, pan and wheel formulas.
  - Resizer clamps, aspect ratio, `shouldResize` veto, child compensation and `autoScale`, matching React `NodeResizeControl`.
  - `useStore` equality semantics, `useKeyPress` combos and provider sibling access.
- **Intentionally different.**
  - Labels are HTML, so `labelStyle.fill` maps to `color` and `labelBgStyle.fill` to `background-color`.
  - A multi-node snap moves the group by the anchor's snapped delta; React rounds each node.
  - Drags still commit at the drop (Plan 108/112). Parent growth is previewed and committed with the drop as `node-bounds` changes per grown parent, not per step.
  - Resizer emits are payload-first `(params, event)`, and `shouldResize(params, event)`.
  - Handle `aria-label` stays `"<kind> handle <id>"` unless `ariaLabelConfig['handle.ariaLabel']` is set.
  - The minimap keeps its interactive button role; `ariaLabel` replaces its leading text.
  - The provider holds a canvas editor, not a store: reads before a canvas mounts show an empty graph, and commands throw.
  - Canvas default edge stroke and node look now follow the React theme. FlowBaseEdge without a caller stroke uses the themed CSS stroke instead of the `#64748b` attribute.
  - `nodesResizable` remains a canvas switch alongside the components.
- **Unverified.** No live React runtime comparison. The `node.a11yDescription.ariaLiveMessage` key is unused because Vue has no keyboard node move.
- **Test boundary.** `apps/vue/e2e/final-wiring.e2e.ts`, `packages/vue/src/drag-constraints.test.ts`.
