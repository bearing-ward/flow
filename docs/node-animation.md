# Node position animation

The `/node-animation/` recipe in Vanilla, Vue and Foldkit switches a measured graph between horizontal and vertical Dagre destinations. It uses the request/result identity and stale-result session from [layout engines](layout-engines.md). The destination is one accepted semantic edit. Animation frames are transient presentation state shared by nodes, edge paths and labels.

## Public APIs

Vanilla's controller exposes `animateNodePositions(request)` and `cancelNodeAnimation()`. Vue's `useFlow()` exposes the same commands through the canvas owner and provider. Foldkit exports `createFoldkitNodeAnimationClient(runtime.ports)` with those commands and `dispose()`. Foldkit also exposes `HostAction.AnimateNodePositions` and `HostAction.CancelNodeAnimation` for direct message routing. The animation client listens to `nodeAnimationResults`; each response carries its request ID and result after `Render.afterPaint` acknowledges the matching rendered state.

`FlowNodeAnimationRequest` contains a Plan 157 `FlowLayoutResult` in `result` and optional `duration` in milliseconds. The producer accepts the result through `createFlowLayoutSession` before delivering it to an animator. The result's `revision` identifies the target request; the animator does not run an engine or invent a new revision. Each API returns a promise for `{ revision, kind }`, where `kind` is `finished`, `cancelled`, `superseded` or `disposed`. A malformed request fails schema decoding before changing state. A failed edit releases presentation and rejects the promise. A controlled proposal that has not been accepted when submission completes cancels presentation; the owner's ordinary proposal acceptance and history policy remain authoritative. Call the animation API again after asynchronous controlled acceptance when animation is desired.

The default duration is 300 ms with linear interpolation. A finite nonnegative `duration` overrides it; zero completes immediately. Reduced motion completes at the exact destination without intermediate frames. The public reference page also describes linear interpolation. The 300 ms default and interruption behavior implement maintainer decision D5. They are not claimed as inspected Pro constants.

## Presentation and interruption

Core exports `FlowNodeAnimationRequestSchema`, `FlowNodeTransitionSchema`, `FlowNodeAnimationResultSchema`, `decodeFlowNodeAnimationRequest`, `createFlowNodeTransition`, `stepFlowNodeTransition`, `finishFlowNodeTransition`, `nodeAnimationDocument` and `createFlowNodeAnimator`. Transitions hold parent-relative positions keyed by node ID, target revision, duration and elapsed time. The pure step function clamps completion and returns exact destination coordinates. The shared animator workflow receives host scheduling and rendering capabilities; core imports no browser or framework APIs.

A superseding request starts from the currently displayed position. Its predecessor resolves as `superseded`. Removed nodes are pruned from subsequent presentation frames and never recreated by completion. An accepted position edit or history replay that changes a destination cancels its transition. Viewport changes and selection do not create animation history.

Pointer admission on a draggable node cancels scheduling and holds the displayed geometry for the drag's starting coordinates. The accepted drop clears the held presentation. This avoids a jump to the previously committed destination when the user takes over. A complete drop is one additional undo step. Explicit `cancelNodeAnimation()` clears presentation to the accepted document. A press that ends without a semantic drop can retain its held frame until another semantic position edit, explicit cancellation, animation or teardown.

Vanilla supplies `requestAnimationFrame` scheduling and releases it on controller destruction. Vue supplies frame scheduling in its canvas scope and cancels it on unmount. Foldkit owns transition state in its application model, advances it with animation-frame messages, and uses the same live graph projection for nodes, edges and labels. Runtime teardown removes that subscription. Dispose the animation client before disposing its Runtime to settle pending callers and release the response listener.

## History, persistence and clipboard

Each animation submits one `set-nodes` destination transaction through the host's existing edit API. [Transaction history](transaction-history.md) records only accepted authored state. Intermediate frames never write document positions, emit semantic edits or add history entries. Undo restores the previous destination; redo restores the new destination.

No document schema or saved field is added. Saving and [copying](graph-clipboard.md) use accepted destination positions and preserve opaque node and edge data. No animation progress survives reload or paste. Foldkit live snapshot queries can expose presentation coordinates. Its explicit saved-session response, history and clipboard read accepted documents.

The [Plan 159 trace](../research/traces/159-node-animation.md) separates production paths, local DOM acceptance and the public reference boundary. Dynamic Layouting still requires unit 6's tree editing and expand/collapse behavior.
