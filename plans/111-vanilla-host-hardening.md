# Plan 111: Vanilla host hardening

Status: implemented, 2026-10-13.

## Goal

Close five Vanilla host gaps that the Plan 109 recipe work had to work around, then remove those workarounds. Audit entries: Dynamic Layouting · Pro, Auto Layout · Pro, Floating Edges.

References in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`: `packages/react/src/components/NodeWrapper/index.tsx:123-124` (`onNodeClick` on every click), `packages/system/src/utils/store.ts:484-489` (`dimensions` change on measurement), `packages/react/src/components/Edges/BaseEdge.tsx:44-55` (interaction path), `packages/react/src/additional-components/NodeResizer/NodeResizer.tsx:55-76` (opt-in resize controls).

## Design

1. **First click.** Every render pass re-appended every node element to keep DOM order. Selecting a node on press re-rendered and moved the pressed node out of the DOM and back, and Chrome then drops the pending `click`. The pass now skips `append` for an element that already sits in order (`nodeElementInPlace` in `mount-flow.ts`). While a node drag or resize is active, it keeps the old append-everything order.
2. **`dimensions` changes.** `measured-dimensions.ts` tracks the last reported size per node. Each measurement site (render-pass measurement, ResizeObserver batch, `updateNodeInternals`, resize restoration) schedules one microtask. The microtask reports `{ type: 'dimensions', id, dimensions }` through `onNodesChange` for every new or changed size, including the first. Because it is a microtask, a controlled `onNodesChange` never re-enters a render pass.
3. **Typing and exports.** `createFlowBackground` takes `Pick<FlowController, 'getViewport' | 'subscribeViewport'>`, which `JavaScriptFlowController` satisfies. `public.ts` exports `FlowNodeDragPayload`, `FlowNodeDragStopPayload` and `FlowCanvasEventPayload`.
4. **Custom edge hit path.** `FlowEdgeRendererInstance.interactionPath?: () => string | undefined`. For custom renderers the host hit path uses that value first. Next it uses the `createFlowBaseEdge` interaction path drawn in the visual, with its stroke width unless the edge sets `interactionWidth`. Last it falls back to the handle route.
5. **Resize controls.** New mount option `nodeResizeControls` (default `true`; nine browser files and `docs/guides/gestures.md` rely on the controls). On a side that has connection handles, the mid-side control gets `flow-node-resize-clear` and moves 20px out, past the handle. A selected node's handles then start connections, and every resize control stays reachable by pointer.
6. **Recipes.** Dynamic layouting uses `onNodeClick`. Auto, tree and dynamic layouts re-run on `dimensions` and `remove` node changes instead of per-frame polling. Edge recipes pass `nodeResizeControls: false` and drop the CSS that hid resize controls.

## Tests

`apps/vanilla/e2e/host-hardening.e2e.ts`, with fixture `apps/vanilla/src/host-hardening-fixture.ts`, covers:

- the first-click `onNodeClick`;
- `dimensions` changes, from first measurement through growth, applied by a controlled `createFlowNodesState`;
- floating-edge hit testing, hover and selection for the BaseEdge and returned paths;
- a selected node's right handle starting a connection, and `nodeResizeControls: false`.

The recipe suites `layout-recipes.e2e.ts` and `edge-recipes.e2e.ts` cover the removed workarounds.

## Conformity and deviations

- **Conforming.**
  - `onNodeClick` fires on the selecting click.
  - `dimensions` changes carry `id`, `type` and `dimensions`, and React's `applyNodeChanges` semantics store them as `measured`.
  - BaseEdge's interaction path is the hit target.
- **Intentionally different.**
  - Resize controls stay on by default, unlike React's opt-in `NodeResizer`, because existing Vanilla tests and docs rely on them. React draws side resize lines under the handles. Vanilla keeps its square mid-side buttons and moves one outward when its side has handles.
  - Vanilla does not emit `dimensions` changes with `resizing` or `setAttributes` for resize gestures; resize commits still arrive as `replace` (Plan 108).
  - The change arrives one microtask after measurement, not inside the measurement pass.
  - Vanilla's pointer contract in `node-threshold-contract.ts` now expects the down-node click on a release over another node, as Vue and Foldkit already did. The old empty expectation recorded the first-click bug.
- **Unverified.** There is no live React runtime comparison. Reconnect anchors still sit on the handle route for floating edges.
