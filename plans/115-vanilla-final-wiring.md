# Plan 115: Vanilla final parity wiring

Status: implemented, 2026-10-13.

## Goal

Wire the Plan 114 core contracts and the Plan 110 instance helpers into the Vanilla host (`apps/vanilla/src/public.ts`), so the open Vanilla parity entries reach C: `<ReactFlow />`, `<MiniMap />`, `<NodeResizer />`, `<NodeResizeControl />`, `useNodesData()`, `useReactFlow()`, `useStore()`, AriaLabelConfig, ColorMode, DefaultEdgeOptions, Edge, EdgeMarker, FitViewOptions, MiniMapNodeProps, Node, PanelPosition, ReactFlowInstance, ResizeParams, ZIndexMode and the Node Resizer, Updating Nodes, Base Style, Dark Mode and Labeled Group examples. Core is unchanged.

References (pinned xyflow): `react/src/components/NodeWrapper`, `react/src/components/Edges/EdgeText.tsx`, `system/src/styles/{init,style,node-resizer}.css`, `react/src/additional-components/{MiniMap,NodeResizer}/*`, `system/src/xyresizer/XYResizer.ts`, `react/src/hooks/{useReactFlow,useStore,useNodesData}.ts`, `react/src/types/component-props.ts`.

## Design

New modules keep `mount-flow.ts` edits to small hooks.

- **Presentation** (`presentation.ts`): node `style`/`className`/z-index on the wrapper; edge `style` on the visible path, `className` and `animated` on the group; `EdgeText` styling on the HTML label (`labelStyle` on the text, `labelBgStyle`/`labelBgPadding`/`labelBgBorderRadius`, `labelShowBg`). Handles come from `flowNodeHandles` everywhere the host reads handles. `dragHandle` gates drags; a press elsewhere still selects. `getNodes`/`getNode` add `measured`.
- **Markers**: `resolveFlowEdgeMarker` ids and attributes (size, units, orient, stroke width, colour); new `defaultMarkerColor`.
- **Theme** (`color-mode.ts`): `colorMode` and `getColorMode`/`setColorMode`; `flowThemeStylesheet('.flow-canvas')` is injected once and `style.css` reads `--flow-*` tokens for canvas, nodes, edges, labels, handles, selection, controls, minimap and backgrounds.
- **Stacking**: `zIndexMode`, `elevateNodesOnSelect`, `elevateEdgesOnSelect` through `computeFlowStacking`.
- **Options**: `snapGrid` (record or tuple), `snapToGrid`, `nodeExtent`/`translateExtent` (record or tuple), `fitView`/`fitViewOptions`, `FitViewOptions` with `nodes` ids, `includeHiddenNodes`, `minZoom`, `maxZoom`; `center-left`/`center-right` for panels, controls and overlays; `nodesFocusable`, `edgesFocusable`, `onSelectionChange`.
- **ariaLabelConfig** (`aria-labels.ts`): built-in and public controls, minimap title, handle labels, node/edge `aria-describedby` texts and an assertive live region for keyboard moves.
- **expandParent**: drags preview `calculateFlowExpandParentDrag` per step and commit one `node-bounds` change; resizes commit the parent from `calculateFlowExpandParent`.
- **MiniMap** (`minimap.ts`): `createFlowMiniMap(controller, options)` with every `FlowMiniMapOptions` field, `nodeComponent(props: FlowMiniMapNodeProps)`, `onClick`, `onNodeClick`.
- **NodeResizer** (`node-resizer.ts`, `resize-controls.ts`): `createFlowNodeResizer` and `createFlowNodeResizeControl` register controls with `controller.registerNodeResizer`. The host's existing resize session drives them through `startFlowNodeResize`/`stepFlowNodeResize`, with snapped pointer deltas, the parent box for `extent: 'parent'`, child compensation and callbacks with `ResizeParams`. **`nodesResizable`**: the canvas switch remains React's "a `NodeResizer` on every node"; a node with a registered resizer shows only its own controls.
- **Instance and store** (`instance-api.ts`): `getIntersectingNodes`, `isNodeIntersecting`, `getNodesBounds`, `toObject`, `getStoreState`/`observeStore(selector, listener, equalityFn)` (useStore) and `observeNodesData` (useNodesData).
- **Examples**: `ui-recipes/styling/?scene=` `updating-nodes`, `base-style`, `dark-mode`, `node-resizer`, `labeled-group`.

## Tests

- Unit: `apps/vanilla/src/{instance-api,node-resizer}.test.ts` (Vanilla unit tests are now in `vitest.config.ts`).
- Browser: `apps/vanilla/e2e/final-wiring.e2e.ts` (17 tests) with `src/final-wiring-fixture.ts`, and `styling-recipes.e2e.ts` (5 tests). Both passed 3 runs in a row.
- Updated expectations: marker id regexes (`canvas.e2e.ts`), marker kind from `data-marker-type` (`renderer-contract.e2e.ts`), React stacking of a child above a lower sibling (`graph-renderers.e2e.ts`), z-index excluded from the button-handle style check, `measured` dropped from the shared public-state read, the `playground-scene-chooser` baseline (label backgrounds), and a v3-era invalid-version probe (`version: 99`) in `versioned-persistence-fixture.ts`.

## Conformity and deviations

- **Conforming.** Style/className semantics, default handles, `dragHandle`, `measured`, marker configs, `EdgeText` defaults, `colorMode` classes and tokens, `computeFlowStacking` node z-indices, fit options, extents and snap tuples, panel placements, `ariaLabelConfig` keys and live message, MiniMap pan/zoom formulas, node attributes and mask, resizer constraints and callbacks, expand-parent maths, and the instance helpers follow the pinned source through the core helpers. Each is covered in the browser tests above.
- **Intentionally different.**
  - Edges share one SVG layer under the nodes, so an edge `zIndex` only orders edges. A selected edge still rises within that layer (Vanilla's earlier behaviour). Node CSS `z-index` is the computed value plus one, which keeps nodes above edge labels.
  - Vanilla keeps its light palette (canvas `#f8fafc`, edge `#64748b` and so on) as light-mode token defaults. Dark mode uses React's dark defaults. Only `dark` is a class; light is unclassed.
  - Without an `ariaLabelConfig` entry, Vanilla keeps its English labels (`Zoom in`, `Graph minimap`, `source handle a`). A node's own `ariaDescription` replaces the shared description.
  - Edge labels stay HTML: `fill` maps to `color`/`background-color`, and `stroke` to the border colour.
  - Resizes commit once at the end (Plan 111), and an expand-parent resize commits the parent as a second change. Expand-parent drags preview the growth and commit with the drop: one `node-bounds` change for one parent, otherwise the drag change and then one per parent.
  - `observeStore`/`observeNodesData` are listeners, silent until a change. The store state is accepted nodes, edges, viewport, interactivity and connection. A measurement alone does not notify.
  - The MiniMap reads accepted positions, so it updates on drop rather than per drag frame.
  - `<ReactFlow />` props not mapped: `deleteKeyCode`, `selectionKeyCode`, `multiSelectionKeyCode`, `zoomActivationKeyCode`, `autoPanOnNodeDrag`, `autoPanOnSelection`, `autoPanSpeed`, `autoPanOnNodeFocus`, `reconnectRadius`, `paneClickDistance`, `nodeClickDistance`, `onPaneScroll`, `onClickConnectStart`/`End`, `preventScrolling`, `connectionLineStyle`, `connectionLineContainerStyle`, `noDragClassName`/`noWheelClassName`/`noPanClassName` (fixed classes), `edgesReconnectable`, and the React-only `attributionPosition`, `proOptions`, `width`, `height`, `debug`.
- **Unverified.** There is no side-by-side React runtime comparison. Timing of colour transitions and the exact pixel look of themed controls are not compared.
- **Test boundary.** The unit and browser tests listed above, plus the full Vanilla browser suite.
