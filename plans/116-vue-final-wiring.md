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

7. **Review fixes.**
   - Multi-part commits (a drop that grows parents, a resize with `expandParent`) go through `publishAll`. Each change applies to the previous one's result, and the owner sees one `update:document`/`update:nodes` proposal or one accepted state.
   - The provider passes `measuredSizes` through. Several canvases below one provider follow the latest still-mounted one.
   - Elevated edge labels render in their edge's z layer.
   - Keyboard focus on an edge hit target or reconnect anchor survives a layer move.
   - `FlowZoomSlider` buttons read `ariaLabelConfig`.

`<ReactFlow />` props added in the review: `deleteKeyCode` (default `Backspace`, acting while focus is inside the canvas), `selectionKeyCode`, `multiSelectionKeyCode`, `zoomOnPinch`, `preventScrolling`, `autoPanSpeed` (connection auto-pan) and `connectionLineStyle`. Already present under Vue names: `onNodesChange`/`onEdgesChange` → `nodesChange`/`edgesChange`, `onMove*` → `move*`, `onSelection*` → `selection*`/`selectedNodes*`, `onInit` → `init`, `onError` → `error`, `onlyRenderVisibleElements` → `renderOnlyVisible`, `minZoom`/`maxZoom` → also `viewportLimits`. Delete callbacks (`onBeforeDelete`, `onNodesDelete`, `onEdgesDelete`, `onDelete`) stay `deleteElements` lifecycle options.

Real gaps, so `<ReactFlow />` stays P:

- `autoPanOnNodeDrag`, `autoPanOnSelection`, `autoPanOnNodeFocus`: Vue auto-pans only connections.
- `paneClickDistance`, `nodeClickDistance`;
- `connectionLineContainerStyle`, `reconnectRadius`;
- `attributionPosition`, `proOptions`, `width`/`height`, `debug`.

`nodeOrigin` stays on the document.

## Tests

- Unit: `packages/vue/src/drag-constraints.test.ts` covers snap, group `nodeExtent`, the parent clamp, `expandParent` growth and label style mapping.
- Browser: `apps/vue/e2e/canvas-configuration.e2e.ts`, 12 tests, 3 of 3 runs. The tests cover:
  - provider, composables, instance helpers and `fitView`;
  - Base Style and Updating Nodes;
  - Dark Mode;
  - z-index, panels, aria and `dragHandle`;
  - snap and extents;
  - MiniMap options and gestures;
  - the resizer components, the switch relationship, and Labeled Group.
- Review tests in `canvas-configuration.e2e.ts`:
  - a two-parent mixed-selection drag and an `expandParent` resize, each in uncontrolled, controlled and split models, with one proposal per drop;
  - provider sibling `measured` and the two-canvas fallback;
  - edge and label layers in `basic` and `auto` modes, and focus kept across an `elevateEdgesOnSelect` move;
  - the delete, multi-selection and pinch keys.
- Updated: `minimap`, `canvas-ui-contract`, `base-edge`, `renderer-contract` and `versioned-persistence`, for React default labels, the themed stroke, marker ids and the v3 envelope.

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
  - The provider holds a canvas editor, not a store: reads before a canvas mounts show an empty graph, and commands throw. One canvas per provider is the supported use; with several, the latest mounted one wins.
  - `deleteKeyCode` acts only while focus is inside the canvas; React listens on the document.
  - Control + wheel is a pinch unless Control is the configured pan or zoom activation key, which keeps Vue's existing activation-key contract.
  - Canvas default edge stroke and node look now follow the React theme. FlowBaseEdge without a caller stroke uses the themed CSS stroke instead of the `#64748b` attribute.
  - `nodesResizable` remains a canvas switch alongside the components.
- **Unverified.** No live React runtime comparison. The `node.a11yDescription.ariaLiveMessage` key is unused because Vue has no keyboard node move.
- **Test boundary.** `apps/vue/e2e/canvas-configuration.e2e.ts`, `packages/vue/src/drag-constraints.test.ts`.
