# Plan 111: Vanilla host hardening

Status: implemented, 2026-10-13.

## Goal

Close five Vanilla host gaps that the Plan 109 recipe work had to work around, then remove those workarounds. Audit entries: Dynamic Layouting · Pro, Auto Layout · Pro, Floating Edges.

References in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`: `packages/react/src/components/NodeWrapper/index.tsx:123-124` (`onNodeClick` on every click), `packages/system/src/utils/store.ts:484-489` (`dimensions` change on measurement), `packages/react/src/components/Edges/BaseEdge.tsx:44-55` (interaction path), `packages/react/src/additional-components/NodeResizer/NodeResizer.tsx:55-76` (opt-in resize controls).

## Design

1. **First click.** Every render pass re-appended every node element to keep DOM order. Selecting a node on press re-rendered and moved the pressed node out of the DOM and back, and Chrome then drops the pending `click`. The pass now skips `append` for an element that already sits in order (`nodeElementInPlace` in `mount-flow.ts`). While a node drag or resize is active, it keeps the old append-everything order.
2. **`dimensions` changes.** While a pointer or keyboard resize is active, the report waits for the gesture to end, checked again each frame. A controlled owner applying the change would replace the document, and that cancels the resize. `measured-dimensions.ts` tracks the last reported size per node. Each measurement site (render-pass measurement, ResizeObserver batch, `updateNodeInternals`, resize restoration) schedules one microtask. The microtask reports `{ type: 'dimensions', id, dimensions }` through `onNodesChange` for every new or changed size, including the first. Because it is a microtask, a controlled `onNodesChange` never re-enters a render pass.
3. **Typing and exports.** `createFlowBackground` takes `Pick<FlowController, 'getViewport' | 'subscribeViewport'>`, which `JavaScriptFlowController` satisfies. `public.ts` exports `FlowNodeDragPayload`, `FlowNodeDragStopPayload` and `FlowCanvasEventPayload`.
4. **Custom edge hit path.** A throwing `interactionPath` is reported through the host's boundary callback reporter (telemetry and `onError`), and the edge keeps the handle route. `FlowEdgeRendererInstance.interactionPath?: () => string | undefined`. For custom renderers the host hit path uses that value first. Next it uses the `createFlowBaseEdge` interaction path drawn in the visual, with its stroke width unless the edge sets `interactionWidth`. Last it falls back to the handle route.
5. **Resize controls.** New mount option `nodesResizable`, named as on the Vue branch. It defaults to off, as in React, where controls appear only with a `NodeResizer`. The playground, the Feature Overview recipe and the browser tests that resize opt in. On a side that has connection handles, the mid-side control gets `flow-node-resize-clear` and moves 20px out, past the handle. A selected node's handles then start connections, and every resize control stays reachable by pointer.
6. **Recipes.** Dynamic layouting uses `onNodeClick`. Auto, tree and dynamic layouts re-run on `dimensions` and `remove` node changes instead of per-frame polling. Edge recipes drop the CSS that hid resize controls.
7. **Click suppression.** The canvas `onNodeClick`/`onEdgeClick`/`onPaneClick` dispatch honours the same suppression receipt as selection. Before this, drags, resizes and connection drags left the receipt for selection only.

## Tests

`apps/vanilla/e2e/host-hardening.e2e.ts`, with fixture `apps/vanilla/src/host-hardening-fixture.ts`, covers:

- the first-click `onNodeClick`;
- `dimensions` changes, from first measurement through growth, applied by a controlled `createFlowNodesState`;
- floating-edge hit testing, hover and selection for the BaseEdge and returned paths;
- resize controls being opt-in, and a selected node's right handle starting a connection;
- controlled pointer and keyboard resizes that complete while every change is applied;
- no `onNodeClick` after a node drag, a resize or a handle connection drag, while a plain click still reports;
- an `interactionPath` that throws, which reports through `onError` and keeps the handle route.

The recipe suites `layout-recipes.e2e.ts` and `edge-recipes.e2e.ts` cover the removed workarounds.

## Conformity and deviations

- **Conforming.**
  - `onNodeClick` fires on the selecting click.
  - `dimensions` changes carry `id`, `type` and `dimensions`, and React's `applyNodeChanges` semantics store them as `measured`.
  - BaseEdge's interaction path is the hit target.
- **Intentionally different.**
  - React draws side resize lines under the handles. Vanilla keeps square mid-side buttons and moves one outward when its side has handles.
  - Vanilla does not emit `dimensions` changes with `resizing` or `setAttributes` for resize gestures. Resize commits still arrive as `replace` (Plan 108), and measured sizes wait until the gesture ends. React's resizer streams dimension changes during the gesture.
  - The change arrives one microtask after measurement, not inside the measurement pass.
  - Vanilla's pointer contract in `node-threshold-contract.ts` now expects the down-node click on a release over another node, as Vue and Foldkit already did. The old empty expectation recorded the first-click bug.
- **Unverified.** There is no live React runtime comparison. Reconnect anchors still sit on the handle route for floating edges.
