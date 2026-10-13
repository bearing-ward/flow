# Plan 113: Foldkit host hardening

Status: implemented, 2026-10-13.

## Goal

Close the Foldkit gaps the recipe agents found: live drag, click selection, multi-node selection drags, measurement changes, custom edge hit areas and node-view data writes. Then drop the recipe workarounds those gaps forced.

Reference: `packages/system/src/xydrag/XYDrag.ts` and `utils.ts` (`getDragItems`), `packages/react/src/components/Nodes/utils.ts` (`handleNodeClick`), `packages/react/src/components/Edges/BaseEdge.tsx` (interaction path), `packages/react/src/hooks/useReactFlow.ts` (`updateNodeData`), and `packages/react/src/store/index.ts` (`updateNodeInternals` dimension changes).

## Design

- **Live drag (graph.ts).** The `node-drag` session gains `nodeIds` and the pointer's `currentX`/`currentY`. `NodeDragMoved` updates them each frame. `selectLiveDocument` applies the session's positions with the same core appliers the release uses, so the preview equals the commit. The view, node `dragging` props, edge geometry and renderer node bounds all read the live document. Snapshot responses (document, node, internal node, bounds) read it too. Accepted state, `stateChange` and change diffs keep the accepted document.
- **Drag set.** Pressing a selected node drags every selected, draggable, visible node without a selected ancestor, as React's `getDragItems` does. An unselected node drags alone. Release commits `node-position` for one node and `node-positions` for several.
- **Drag events (application.ts).** `onNodeDragStart`/`onNodeDrag`/`onNodeDragStop` keep `x`/`y` as the pointer's flow point. They add `position`, `positionAbsolute`, `nodeIds` and `nodePositions` for every dragged node. With two or more nodes, `onSelectionDragStart`/`onSelectionDragMove`/`onSelectionDragStop` carry the same payload, mirroring Vanilla.
- **Click selection.** A node click that is not on a Foldkit control selects only that node and clears every other selection. With Meta or Control held, it toggles that node. A click that ends a real drag is suppressed, as d3-drag suppresses it.
- **Dimensions.** A `MeasureNode` that changes a node's measured size, including the first measurement, publishes `{ id, type: 'dimensions', dimensions }` on `elementChanges`.
- **Custom edge hit area.** Edge renderers get a fifth argument, `edgeInteraction(path)`. When a renderer calls it, the built-in hit target uses that path.
- **Node data.** Node views can already send `Message.DispatchCommand` with an `update-node-data` edit, but it is verbose. `updateNodeData(nodeId, data, options?)` builds that typed message.
- **Recipes.** Feature Overview and Subflows select by click. Layout reruns on `dimensions` changes instead of every measurement result. Computing Flows text nodes write data from the node view. The floating-edge recipes set their interaction path.

## Tests

- New `apps/foldkit/e2e/live-drag.e2e.ts`: a node, a built-in edge and a floating custom edge track the pointer mid-drag; `dragging` is set; snapshots return live positions; `onNodeDrag` carries node positions; click and Meta-click selection; a multi-node selection drag with selection-drag events; `dimensions` changes; custom edge hit area.
- Updated edge-recipes, feature-overview, subflows, layout and computing-flows recipe tests, and a unit test for `updateNodeData`.

## Conformity and deviations

- **Conforming.** Drag items follow `getDragItems`. Click selection follows `handleNodeClick` and `addSelectedNodes`. `dimensions` changes carry the measured size. The interaction path follows the custom path, as with `BaseEdge`. `updateNodeData` merges by default and replaces with `{ replace: true }`.
- **Intentionally different.**
  - Foldkit does not emit per-frame `position` changes with `dragging: true`. Positions commit on release, as before Plan 113. The live document is a preview owned by the Runtime, in controlled mode too.
  - `selectNodesOnDrag` is not modelled: dragging an unselected node leaves the selection unchanged.
  - Both Meta and Control toggle, instead of the platform's single `multiSelectionKeyCode`.
  - Clicks on handles, resize controls and the selection toggle button do not select through the node click.
  - Computing-node derivations stay in app code, because Foldkit node views are pure and cannot run effects.
- **Unverified.** There is no live React runtime comparison.
