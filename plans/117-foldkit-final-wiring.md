# Plan 117: Foldkit final parity wiring

Status: implemented, 2026-10-13.

## Goal

Bring the Foldkit host's remaining in-scope entries in `research/catalogs/react-flow-parity-audit-2026-10-13.json` to C by wiring the Plan 114 core contracts, the Plan 110 helpers and the missing canvas options into `@flow/foldkit`. Fix the `shared-conformance` nested-drag flake.

## Design

- **Program options** (`GraphInteractionOptions`, decoded once in `Graph.initialModel`): `snapToGrid`/`snapGrid` (tuple or record), `nodeExtent` and `translateExtent` (React tuple or record), `colorMode`, `zIndexMode`, `elevateNodesOnSelect`, `elevateEdgesOnSelect`, `ariaLabelConfig` (text entries) and `defaultMarkerColor`. `HostAction.SetColorMode` changes the colour mode at runtime; `system` follows `matchMedia` through a subscription.
- **Drags** (`drag-constraints.ts`): each drag origin records its size, origin, parent offset and absolute extent, so a frame stays O(dragged nodes). `placeDraggedNodes` follows `XYDrag`: absolute top-left plus pointer travel, grid snap (one shared offset for multi-node drags), `clampPosition` to the parent box (`extent: 'parent'`, not for `expandParent`) or `nodeExtent` (shifted per item for multi-node drags). A drag that moves an `expandParent` child previews and commits `calculateFlowExpandParentDrag`; growth changes sizes, so it commits as one `edit-proposal` of `update-node` patches.
- **Presentation** (`presentation.ts`, `graph.ts` view): node `style` (merged into one kebab-case `h.Style` record; position, z-index and size win), `className`, `dragHandle` (a `data-drag-handle` selector checked on press), default handles from `flowNodeHandles` everywhere handles are read. Edges: `style` on the visible path, `className`, `animated` (`flow-foldkit-dashdraw`, off under reduced motion), label styling, configured markers drawn from `resolveFlowEdgeMarker`. `computeFlowStacking` sets node and edge `z-index`. `getNode` snapshots carry `measured`. Hidden `aria-describedby` texts and handle labels come from `ariaLabelConfig`.
- **Theme** (`style.css`): `flowThemeStylesheet('.flow-foldkit-canvas')` verbatim (unit-tested) with React's light and dark defaults and no Foldkit overrides; the built-in node, handle, edge, label, selection, controls, resize and reconnect colours read `--flow-*` tokens. The canvas gets `light`/`dark`. Controls and the MiniMap use React's aria-label defaults.
- **Viewport**: user pans, wheel and double-click zooms, auto-pan and every programmatic viewport request respect `translateExtent` (`constrainViewportToExtent`). `ViewportClient.fitView` also takes React `FitViewOptions` (`nodes`, `padding`, `includeHiddenNodes`, `minZoom`, `maxZoom`, `duration`, `easing`); Controls forward theirs.
- **Contextual Zoom**: node renderers receive `FoldkitNodeRendererProps`, NodeProps plus `zoom`.
- **NodeResizer** (`node-resizer.ts`): `createFoldkitNodeResizer(options)` and `createFoldkitNodeResizeControl(options)` return a node-view helper `view(h, { zoom, isVisible? })`. Controls carry their constraints as data; a press starts a `node-resizer` gesture driven by `startFlowNodeResize`/`stepFlowNodeResize` with the parent box, child extent, children, `expandParent` and grid-snapped pointer. An `expandParent` child follows `NodeResizeControl.tsx:88-120`: each allowed step grows the parent around the child's unclamped rectangle and clamps the child to `max(origin * size, x)`; steps accumulate in a session document (the core session shifts `start` on clamped steps, as React does after committing each step), and release publishes the child, its children and every grown parent as one `edit-proposal`. The session keeps only the gesture's position and size patches, applied to the current document, so edits accepted mid-gesture survive; in controlled mode the proposed size stays pending until the owner acknowledges it. Resizes publish `onResizeStart`/`onResize`/`onResizeEnd` and no node-drag events. `shouldResize` runs synchronously from a registry (like `isValidConnection`); `onResizeStart`/`onResize`/`onResizeEnd` are published as interaction events with `ResizeParams` and run on the host from the publication lane. Relationship to Plan 113: `nodesResizable` still gates Foldkit's built-in selected-node resize controls; the resizer helpers work without it, as React's `NodeResizer` does.
- **MiniMap** (`ui/minimap.ts`): the full `FlowMiniMapOptions` contract, custom node renderer with `FlowMiniMapNodeProps`, pannable/zoomable, mask and position. Panels and Controls take all eight `PanelPosition`s and `ariaLabelConfig`.
- **Instance and store**: `createFoldkitFlowInstance(ports, { viewport })` (useReactFlow/ReactFlowInstance: reads, edits, Plan 110 helpers, viewport) and `createFoldkitStore(ports)` (`select(selector, listener, equality)`, `observeNodesData`). Reads use the versioned snapshot protocol, because the legacy one rejects v3 presentation fields. Core gains the additive `getFlowInternalNodes`.
- **Recipes**: Labeled Group (`createFoldkitLabeledGroupNode`), instance API page; Auto Layout and Dynamic Layouting now re-run on `dimensions` and `remove` node changes and on any non-selection edge change, as the layout key includes edges; Auto Layout accepts user connections, as the React example. Recipe snapshot reads use the versioned protocol, so styled documents keep their node internals.
- **Accessibility text**: node descriptions describe Foldkit's own keys (select control, Shift+Space rectangle selection, Escape) unless `ariaLabelConfig` sets the text; Foldkit has no arrow-key move or built-in Delete key. Reconnect anchors stack above every node, including elevated selected nodes.
- **Flake**: the nested-drag test read node `style.left` right after the change was published. The publication lane can run before Foldkit paints the release, so the DOM still showed the last live-drag frame. The test now polls for the controlled position.

## `<ReactFlow />` props added

`snapToGrid`, `snapGrid`, `nodeExtent`, `translateExtent`, `colorMode`, `zIndexMode`, `elevateNodesOnSelect`, `elevateEdgesOnSelect`, `ariaLabelConfig`, `defaultMarkerColor`, `fitViewOptions` (through `fitView`). Not mapped: `fitView` on init (call `viewportClient.fitView` after the first measurement), `onlyRenderVisibleElements`, `nodeTypes`/`edgeTypes` changes after creation (renderer registry is fixed per program), `disableKeyboardA11y` (use `keyboardActivation`).

## Tests

Unit: `canvas-options.test.ts` (including controlled-mode top-left and left-edge `expandParent` resizes and an `expandParent` drag, where the owner applies only the latest proposal), `presentation.test.ts`, `ui/minimap.test.ts`, `instance.test.ts`, `store.test.ts`, core `flow-measurement.schema.test.ts`. Browser: `model-styling.e2e.ts`, `node-resizer.e2e.ts`, `minimap-options.e2e.ts`, `instance-api.e2e.ts`, `labeled-group-recipe.e2e.ts`, updated `layout-recipes.e2e.ts` and `shared-conformance.e2e.ts`.

## Conformity and deviations

- **Conforming.** Drag placement, snapping and clamping follow `XYDrag`/`calculateNodePosition`/`calculateSnapOffset`; expand-parent follows `handleExpandParent`; resize steps, `shouldResize` veto, callback payloads and `autoScale` follow `XYResizer`/`ResizeControl`; z-index, markers, theme tokens and aria texts use the Plan 114 core ports; A11y description choice follows `A11yDescriptions`.
- **Intentionally different.**
  - Drags and resizes preview live and commit on release (Plan 113), so `onNodesChange`-style changes arrive once per gesture, not per frame. `onResize` still fires per step.
  - An expand-parent drag or resize commits as one `edit-proposal` change instead of separate position and dimension changes; the drag computes growth from the drag origin each frame rather than accumulating per committed frame.
  - Markers stay per-edge SVG definitions with per-edge ids (each Foldkit edge is its own SVG); a marker without a colour uses the edge stroke, then `defaultMarkerColor`, then the themed stroke.
  - The edge label box keeps Foldkit's padding and radius unless `labelBgPadding`/`labelBgBorderRadius` are set. Handles keep Foldkit's descriptive label unless `handle.ariaLabel` is configured (the pinned React `Handle` does not read it).
  - Label background styling maps `fill` to `background-color` and text `fill` to `color`, because Foldkit labels are HTML.
  - Callbacks run after the step is published, not synchronously inside the drag handler; `shouldResize` is synchronous.
  - Resize gestures still also emit the `onNodeDrag*` lifecycle events Foldkit's built-in resize already emitted.
  - Instance and store reads are Promises over ports; `deleteElements` returns the edit response.
- **Unverified.** No live React runtime comparison; React behaviour is read from the pinned source.
- **Test boundary.** The unit and browser files above; full Foldkit browser suite once.
