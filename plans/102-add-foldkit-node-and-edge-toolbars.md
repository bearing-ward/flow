# Plan 102: Foldkit node and edge toolbars

Status: complete, 2026-10-13.

## Goal

Give Foldkit equivalents of React Flow's [`<NodeToolbar />`](https://reactflow.dev/api-reference/components/node-toolbar) and [`<EdgeToolbar />`](https://reactflow.dev/api-reference/components/edge-toolbar). Vue has both (`FlowNodeToolbar`, Plan 101 `FlowEdgeToolbar`), and Vanilla has `toolbarContainers`.

## Reference contract

Pinned source: `packages/react/src/additional-components/NodeToolbar/` and `EdgeToolbar/`, plus `packages/system/src/utils/edge-toolbar.ts`.

- **Node toolbar.** The toolbar takes a `nodeId`, a `position` (`top`, `right`, `bottom` or `left`; default `top`), an `align` (`start`, `center` or `end`; default `center`) and an `offset` (default 10). It is visible when `isVisible` is true. Otherwise it is visible only when its node is the single selected node. It keeps a fixed screen size.
- **Edge toolbar.** The toolbar takes an `edgeId` and a flow-space point (`x`, `y`). It accepts `alignX` and `alignY`, both defaulting to `center`. It is visible when `isVisible` is true; otherwise it follows `edge.selected`. It keeps a fixed screen size, with a z-index of `edge.zIndex + 1`.

## Design

Foldkit canvas UI uses imperative, app-fed mounts. For example, `createFlowMiniMap` returns `update(graph, viewport)`, and the app calls it from Runtime accepted states. The toolbars follow the same shape.

- **New file.** `packages/foldkit/src/toolbar.ts` keeps this work clear of `graph.ts`, which is under active Plan 100 work.
- **Mount API.** It exports `mountFlowNodeToolbar(canvas, content, options)` and `mountFlowEdgeToolbar(canvas, content, options)`. Each returns `{ element, update(graph, viewport), dispose }`. The edge mount also accepts an optional new point in `update`.
- **Layer.** Content moves into a canvas-scoped screen layer, `.flow-foldkit-toolbar-layer`. The layer carries the no-pan, no-drag and no-wheel markers, and `update` re-attaches it if the canvas re-rendered.
- **Visibility.** A toolbar that is not visible is set to `hidden`. Hidden or missing targets also hide it.
- **Disposal.** `dispose` restores the content to its original parent, like `mountFlowPanel`. It removes the layer once the last toolbar is gone. Mounting content that is already mounted throws, like `mountFlowViewportPortal`.
- **Hidden styling.** A `[hidden]` style rule keeps caller `display` classes from revealing a hidden toolbar.
- **Positioning.** Core gains `nodeToolbarTranslate(position, align)`, which returns the self-translation percentages that Vue already uses. Placement comes from the core `nodeToolbarAnchor` and `edgeToolbarPlacement`.

## Tests

- **Core unit tests.** Cover `nodeToolbarTranslate` for all 12 combinations.
- **Foldkit browser test.** Mount both toolbars on the real demo canvas and feed them graph and viewport updates. Check:
  - placement at zoom 1 and 2;
  - fixed size;
  - single-selection default visibility, and visibility forced on or off;
  - edge selection visibility and its z-index style;
  - hidden and missing targets;
  - layer and content ownership, including content restored on dispose;
  - child click delivery.

## Conformity and deviations

- **Conforming.** Props and defaults, visibility rules, anchor and alignment geometry, and fixed screen size.
- **Intentionally different: app-fed updates.** Updates come from the app, not reactive selection, which matches Foldkit's other canvas UI mounts.
- **Intentionally different: stacking.**
  - The screen-space layer (z-index 14) stacks above nodes and below the minimap, panels and controls, matching React Flow's panel-over-renderer order. Vue instead puts toolbars above its panels.
  - Inside the layer, edge toolbars use `edge.zIndex + 1` and node toolbars use `node.zIndex + 1`. React uses the node's internal z, which includes selection elevation.
  - These values order toolbars only among themselves.
- **Intentionally different: hidden and missing targets.** These hide the toolbar even when it is forced visible.
- **Unverified.** A live React Flow runtime comparison, the demo-app integration, and automatic disposal when the canvas leaves the document. Unlike the viewport portal, these toolbars are not disposed automatically when the canvas leaves the document.
