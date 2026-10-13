# Plan 101: Vue edge toolbar

Status: complete, 2026-10-13.

## Goal

Provide a Vue `FlowEdgeToolbar` equivalent to React Flow's [`<EdgeToolbar />`](https://reactflow.dev/api-reference/components/edge-toolbar). Vanilla already exposes edge toolbars through `toolbarContainers.edges`. Foldkit edge and node toolbars are a separate later slice.

## Reference contract

Pinned source: `packages/react/src/additional-components/EdgeToolbar/EdgeToolbar.tsx` and `packages/system/src/utils/edge-toolbar.ts`.

- **Props.** `edgeId` is required. `x` and `y` are a flow-space point, usually the label point of a path helper. `alignX` is `left`, `center` (default) or `right`; `alignY` is `top`, `center` (default) or `bottom`. `isVisible`, `className` and `style` are optional.
- **Visibility.** The toolbar is visible when `isVisible` is true. When `isVisible` is not a boolean, it follows `edge.selected`.
- **Placement.** The toolbar has a fixed screen size. Its alignment point is translated by the align percentages, and its z-index is `edge.zIndex + 1` within React Flow's unstacked edge label layer.

## Design

- **Core helper.** Add `edgeToolbarPlacement(point, viewport, alignX, alignY)` to `packages/core/src/domain/flow-toolbar-anchor.ts`. It returns the screen position and the alignment translation percentages, so that Foldkit can reuse it later.
- **Vue component.** Add `FlowEdgeToolbar` in a new file, `packages/vue/src/edge-toolbar.ts`. It reuses the existing per-canvas toolbar context and screen-space layer that `FlowNodeToolbar` uses. A separate file keeps it out of `flow-canvas.ts`, which is under active Plan 100 work.
- **Hidden or missing edges.** These render nothing.
- **Stacking.** The toolbar sets `z-index: edge.zIndex + 1` inside the toolbar layer.

## Tests

- **Core unit tests.** Cover placement at several zoom levels and all nine alignments.
- **Vue browser test.** Use a `FlowEdgeToolbar` fixture with selection-driven visibility, forced visibility, and centered and right/bottom alignment. Check that the toolbar follows combined pan and zoom transforms at zoom 2 and 0.5 with a fixed screen size, and carries the `edge.zIndex + 1` style. Also check that it isolates per canvas and responds to selection, hiding and removal of the edge. Painted stacking against nodes is not tested.

## Conformity and deviations

- **Conforming.** Props, defaults, the visibility rule, alignment percentages, and fixed screen size.
- **Intentionally different.** The toolbar renders in the canvas's screen-space toolbar layer, positioned at the transformed point. React Flow instead uses `scale(1/zoom)` inside the edge label layer. The two produce the same screen geometry. Vue's layer ownership matches `FlowNodeToolbar`.
- **Also intentionally different: stacking.** The toolbar layer stacks above every node (`z-index: 8`), so `edge.zIndex + 1` orders toolbars only among themselves. In React Flow the value competes with node z-indexes, so a higher node can cover the toolbar. In Vue the toolbar always paints above nodes.
- **Also intentionally different: hidden and missing edges.** A hidden or missing edge renders no toolbar, even with `isVisible`. React Flow's toolbar lives inside the custom edge, which is not rendered when the edge is hidden. When the edge is missing, React still renders a forced toolbar with an empty `data-id`.
- **Unverified.** Live React Flow runtime comparison.
