# Plan 106: UI catalog controls

Status: complete, 2026-10-13.

## Goal

Bring these Wave 5 audit entries to C in Vanilla, Vue and Foldkit: Zoom Slider, Zoom Select, `<Controls />` `showInteractive`, Vanilla `<NodeToolbar />` and `<EdgeToolbar />`, Node Search, and DevTools. Everything lives in new modules; the large host files get at most export wiring.

## Reference contract

The pinned source has no UI components, so this follows the [React Flow UI](https://reactflow.dev/ui) catalog docs and the registry components they install.

- **Zoom Slider.** Zoom out button, range slider bound to the current zoom within `minZoom`/`maxZoom`, zoom in button, a percentage button that resets to 100%, and a fit view button.
- **Zoom Select.** A select showing the current zoom percentage, with presets 50%, 100%, 150%, 200% and "Fit view".
- **Controls `showInteractive`.** Default `true`. A lock button toggles `nodesDraggable`, `nodesConnectable` and `elementsSelectable` together and calls `onInteractiveChange(nextInteractive)`.
- **Node and Edge toolbar.** As recorded in plans 101 and 102.
- **Node Search.** A search input that filters nodes by lowercase label inclusion. Choosing a result selects only that node and brings the viewport to it.
- **DevTools.** Viewport logger, node inspector and change logger, each toggleable.

## Design

- **Core, `flow-ui-controls.ts`.** Pure helpers: zoom percentage and presets, `searchFlowNodes`, `selectOnlyNodeTransaction`, list navigation, the DevTools node rows and a state-change summary (`describeFlowStateChange`), and the interactivity lock decision `blocksLockedInteraction`. `nodeToolbarAnchorForBounds` is split out of `nodeToolbarAnchor` so Vanilla can anchor from `getInternalNode` bounds.
- **Interactivity lock.** No host has a runtime `nodesDraggable`/`nodesConnectable`/`elementsSelectable` switch, and adding one means editing the drag, connect and select paths in the three large host files, which are under concurrent work. Each host instead gets a small canvas-scoped DOM gate. While locked, a window capture listener stops pointer, click and activation-key events whose target is a node, handle or edge of that canvas. Pane pan and zoom stay available, as in React Flow. Form fields and no-drag content inside nodes stay usable.
- **Vanilla.** New `apps/vanilla/src/ui/` modules: `createFlowZoomSlider`, `createFlowZoomSelect`, `createFlowNodeSearch`, `createFlowDevTools`, `createFlowNodeToolbar` and `createFlowEdgeToolbar`. They subscribe to the controller, mount into `overlayPortal`, and `destroy` restores caller content. The node toolbar anchors to the rendered node's screen bounds, observed with a `MutationObserver`, because Vanilla commits drag positions to the document only on drop. `createFlowControls` gains `showInteractive` and `onInteractiveChange`.
- **Vue.** New components `FlowZoomSlider`, `FlowZoomSelect`, `FlowNodeSearch` and `FlowDevTools` use `useFlow()`. `FlowControls` gains `showInteractive` and `onInteractiveChange`. `FlowEditor` gains `getViewportLimits`, a one-line addition in `flow-canvas.ts`.
- **Foldkit.** New `mountFlowZoomSlider`, `mountFlowZoomSelect`, `mountFlowNodeSearch` and `mountFlowDevTools` take the canvas and `ViewportClient` and are app-fed (`update(...)`) like the minimap and toolbars. `createFlowControls` gains the lock.
- Every overlay carries the no-pan, no-drag and no-wheel markers, accessible names and keyboard support.

## Tests

- Core unit tests for the helpers.
- One browser test per host (`ui-controls.e2e.ts`), each passing three runs in a row. It covers the slider and select changing the viewport, the lock blocking drag and connect, search selecting and centring a node, and DevTools listing nodes and logging a change. Vanilla also covers node and edge toolbars following a node, an edge and the viewport at a fixed size.

## Conformity and deviations

- **Conforming.** Slider range and limits, presets, percentage reset, label search, single selection on choose, `showInteractive` default and callback, toolbar contracts from plans 101 and 102, and the three DevTools panels.
- **Intentionally different: the lock is an event gate.** Flow has no runtime interactivity switch, so the lock blocks node, handle and edge gestures, including `onNodeClick` callbacks, which React Flow still fires. Box selection on the pane is not blocked. Disposing the controls releases the lock.
- **Intentionally different: centring.** Node Search centres on the node at the current zoom with `setCenter`. The React registry component calls `fitView` on the node, which also changes the zoom. A centred node at a stable zoom is easier to verify and works the same in all three hosts.
- **Intentionally different: the node inspector.** It lists nodes and edges in the DevTools panel. The registry component draws per-node overlays in the viewport.
- **Intentionally different: the change logger.** It logs semantic changes derived from accepted state changes (node and edge add, remove, position, selection, data), not React `NodeChange` objects. Viewport-only updates go to the viewport logger.
- **Unverified.** A live React Flow runtime comparison and the registry components' exact markup and styling.
