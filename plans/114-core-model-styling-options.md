# Plan 114: Core model fields, styling and canvas options

Status: core complete, 2026-10-13. Host wiring follows in three per-host plans.

## Goal

Give every host the same schema-derived contracts and pure helpers for the remaining wave 3 and wave 5 parity entries in `research/catalogs/react-flow-parity-audit-2026-10-13.json`: Node, Edge, EdgeMarker, DefaultEdgeOptions, ColorMode, ZIndexMode, SnapGrid, FitViewOptions, CoordinateExtent, PanelPosition, AriaLabelConfig, MiniMap, MiniMapNodeProps, NodeResizer, ResizeParams, Base Style, Dark Mode and Updating Nodes. Only `packages/core` changes, plus three one-line host compile fixes.

References (pinned xyflow): `system/src/types/{general,nodes,edges}.ts`, `react/src/types/{nodes,edges}.ts`, `system/src/utils/store.ts:116-400` (z-index, `handleExpandParent`), `system/src/utils/edges/general.ts:27-60` (`getElevatedEdgeZIndex`), `system/src/utils/marker.ts`, `system/src/xyresizer/{XYResizer,utils}.ts`, `system/src/xyminimap/index.ts`, `react/src/additional-components/MiniMap/*`, `system/src/constants.ts:42` (`defaultAriaLabelConfig`), `system/src/styles/{init,style}.css`.

## Design

- **Schema** (`flow.schema.ts`, `flow-style.schema.ts`): node `style`, `className`, `sourcePosition`, `targetPosition`, `dragHandle`, `expandParent`, `measured`; edge `style`, `className`, `animated`, label styling and `FlowEdgeMarkerOptionSchema` (kind or the existing marker configuration). `flowNodeHandles` (`flow.schema.ts`) derives default handles from source/target positions and is the single handle resolver for every core read: edge integrity, connection validation and gestures, connection state, connection requests, measured-handle filtering, renderer props and layout. `orientFlowHandles` sets source/target positions on nodes without declared handles. `createFlowGraph` reads `measured`.
- **Persistence** (`flow-persistence.ts`): a v3 envelope stores presentation fields; v1/v2 output and the frozen readers are unchanged; the v1 writer rejects presentation fields with a new failure code.
- **Compatibility note.** Decoding is stricter for the new keys. A node or edge that carried, for example, `className: ['a']` or `sourcePosition: 'middle'` used to decode with the unknown key stripped; it now fails. Flow is unpublished, so this is accepted.
- **Pure helpers**: `flow-edge-marker.ts`, `flow-theme.ts`, `flow-z-index.ts`, `flow-coordinate-extent.ts`, `flow-panel-position.ts`, `flow-aria-label-config.ts`, `flow-node-resizer.ts`, `flow-expand-parent.ts`; extensions to `flow-fit-view.ts`, `flow-minimap.ts`, `flow-snap-grid.schema.ts`, `flow-default-edge-options.ts`.

## Tests

Unit tests: `flow-{style.schema,edge-marker,theme,z-index,canvas-options,node-resizer,expand-parent,default-handles,presentation}.test.ts`, plus additions to `flow-{fit-view,minimap,default-edge-options,edge.schema}.test.ts` and the persistence suites (frozen v1 equality kept through `packages/conformance/src/legacy-v1-input.ts`). The packed-consumer fixtures in `tests/consumer` now expect the v3 envelope and edge marker configurations.

After merging main (Plans 111-113, 112b), focused `bun run verify` passed with the union scope in `verification.config.json`: 2427 unit tests; Vanilla 338 passed, 2 skipped; Vue 637 passed; Foldkit 206 passed. One earlier run failed Foldkit `shared-conformance` "nested drag emits a parent-local position candidate" (snapshot read the dragged position); it passed 3 of 3 runs alone and on the full rerun, so it looks like an existing timing flake. Full-suite acceptance is not established.

## Host wiring checklist

Each host agent does every item below for its host, exposes it through its public API (Vanilla `apps/vanilla/src/public.ts` options/controller, Vue props/composables, Foldkit init options/view helpers) and adds browser tests.

1. **Node presentation.** Apply `node.style` via `flowStyleDeclarations` and `node.className` via `flowClassNames` to the node wrapper. Render `flowNodeHandles(node)` instead of `node.handles ?? []` in the default node, handle measurement and connection hit-testing. Honour `dragHandle`: start a node drag only when the pointer-down target is inside `closest(dragHandle)` within the node. Populate `measured` on `getNodes()`/`getNode()` reads (and Vue/Foldkit equivalents) from host measurements.
2. **expandParent.** On each drag step, pass every dragged node's proposed stored position to `calculateFlowExpandParentDrag(graph, items)` and commit all returned changes in one transaction. It clamps an `expandParent` child to `Math.max(0, …)` in its parent and grows/shifts the parent and siblings, as React `updateNodePositions`. Do not apply the `extent: 'parent'` clamp to `expandParent` children (React `calculateNodePosition` skips it). On resize, the `stepFlowNodeResize` session handles the child; commit the parent growth from `calculateFlowExpandParent(graph, [{ id, parentId, rect }])` with the resized child's absolute rect.
3. **Edge presentation.** Apply `edge.style` to the visible path (after stroke defaults), `edge.className` and an `animated` class (dashed, moving stroke, React `dashdraw` keyframes) to the edge group. Labels: `labelStyle` on the text, background rect shown unless `labelShowBg === false`, with `labelBgStyle`, `labelBgPadding` (default `[2, 4]`) and `labelBgBorderRadius` (default 2).
4. **Markers.** Replace the `flowEdgeMarkerType` stopgap with `collectFlowEdgeMarkers(edges, { scope, defaultColor, defaultMarkerStart, defaultMarkerEnd })` for `<defs>` and `resolveFlowEdgeMarker(marker, { scope, defaultColor: stroke }).id` for `url(#id)`. Honour width, height, markerUnits, orient and strokeWidth. Add a `defaultMarkerColor` option.
5. **defaultEdgeOptions.** Render the new presentation fields for edges that take them from defaults.
6. **colorMode.** Add `colorMode` (default `light`). Toggle a `dark` class on the canvas root from `resolveFlowColorMode`; for `system`, subscribe to `matchMedia(flowColorModeMediaQuery)` and dispose the listener. Include `flowThemeStylesheet('<root selector>')` in host CSS (or inject once) and replace hard-coded canvas, node, edge, handle, selection, controls, minimap and background colours with `flowThemeValue(name)`.
7. **zIndexMode.** Add `zIndexMode` (default `basic`), `elevateNodesOnSelect` (default true) and `elevateEdgesOnSelect` (default false). Set node and edge CSS `z-index` from `computeFlowStacking`; keep DOM order.
8. **Viewport options.** Decode `snapGrid`, `nodeExtent` and `translateExtent` options through `FlowSnapGridInputSchema` and `FlowExtentInputSchema`; Vue and Foldkit add `snapGrid`/`snapToGrid` and `translateExtent`, Foldkit adds `nodeExtent`. Decode fit options through `FlowFitViewOptionsSchema` (keep host-specific fields such as `fallbackDimensions`), map `nodes` with `resolveFitViewNodeIds` and pass `includeHiddenNodes`, `minZoom`, `maxZoom` to `fitViewportToNodes`.
9. **Panels.** Use `FlowPanelPositionSchema` for every panel, controls, minimap and UI-component position prop; add CSS for `center-left`/`center-right` (or use `flowPanelPlacement(position).style`).
10. **ariaLabelConfig.** Add `ariaLabelConfig` (partial), resolved with `resolveFlowAriaLabelConfig`. Source controls, zoom/fit/interactive buttons, minimap title, handle labels, node/edge `aria-describedby` texts and the keyboard-move live message from it. Explicit component `ariaLabel` props still win.
11. **MiniMap.** Accept `FlowMiniMapOptions`. Pass node options to `selectFlowMiniMapProjection` and draw each `FlowMiniMapNodeProps` (`fill`, stroke, class, `rx`); allow a custom node renderer receiving `FlowMiniMapNodeProps` (Vanilla callback, Vue slot/component, Foldkit view function). Apply mask colour/stroke, `bgColor` and `position`. When `pannable`, drag pans with `flowMiniMapPanViewport` (then the host extent constraint); when `zoomable`, wheel zooms to `flowMiniMapWheelZoom` around the pane centre. `ariaLabel: null` removes the title.
12. **NodeResizer.** Accept `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `keepAspectRatio`, `isVisible`, `color`, `handleStyle`/`lineStyle`/class names, `shouldResize`, `onResizeStart`, `onResize`, `onResizeEnd`, and a single-control form (`position`, `variant`, `resizeDirection`). Drive gestures with `startFlowNodeResize` and `stepFlowNodeResize`. At start pass: `extent` as the parent box (`[0, 0]` to parent size) for `extent: 'parent'`, or the node's coordinate `extent` (React XYResizer.ts:174); `childExtent` from `graphResizeChildExtent`; children with stored positions; and `expandParent: true` when the node has a parent and `expandParent`. Compute the pointer delta from pointer positions snapped to `snapGrid` when `snapToGrid` is on (React `getPointerPosition`); skip commit when `shouldResize(params)` is false but keep the returned session; commit `position`, `size` and `childPositions` together.

## Conformity and deviations

- **Conforming (unit-level).** z-index values for basic/auto/manual, including React's root-counter reuse, match hand-derived results of `adoptUserNodes`/`calculateChildXYZ`/`getElevatedEdgeZIndex`. Resizer clamps, aspect ratio, origin and child compensation follow `getDimensionsAfterResize`/`XYResizer`. Expand-parent follows `handleExpandParent`. MiniMap pan and wheel formulas, theme defaults, aria defaults and marker defaults are copied from the pinned source.
- **Intentionally different.**
  - Marker kinds stay the Flow built-ins; React treats a string marker as a user marker id. A missing marker colour defaults to the edge stroke (Flow's existing literal behaviour), not `#b1b1b7`.
  - `style` is a serializable record, not arbitrary `CSSProperties`; empty keys and values are dropped.
  - Default handles from `sourcePosition`/`targetPosition` appear only when a node declares no `handles`. Edges to them must omit handle ids.
  - `computeFlowStacking` is a pure recompute; React keeps internals between updates, so its auto-mode root indices can depend on history.
  - A child listed before its parent: React warns and leaves the child's z unadjusted (`updateChildNode` finds no parent yet); Flow visits the parent first, so the child still stacks above it.
  - `CoordinateExtent` must be finite; omit the option for an unbounded canvas instead of `infiniteExtent`. Child extents use top-left boxes (Flow) rather than anchor positions.
  - Theme variables are `--flow-*` with `-default` fallbacks; `reactVariable` records the `--xy-*` counterpart.
  - Presentation fields need the v3 envelope; v1/v2 stay frozen.
- **Unverified.** No browser comparison with React yet; every host entry stays at its current status until host wiring lands with browser tests.
- **Test boundary.** Core unit tests listed above; host behaviour belongs to the per-host plans.
