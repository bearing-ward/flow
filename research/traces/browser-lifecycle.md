# Browser resource lifetime

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow tests explicit destruction and Effect interruption against its own browser host.

All reference paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Reference paths

React creates one node `ResizeObserver` and disconnects it from an effect cleanup at `packages/react/src/container/NodeRenderer/useResizeObserver.ts:9`. Svelte creates the same renderer-owned observer and disconnects it from `onDestroy` at `packages/svelte/src/lib/container/NodeRenderer/NodeRenderer.svelte:25`.

Both pane adapters use pointer capture for selection gestures. React captures the pointer at `packages/react/src/container/Pane/index.tsx:163`, releases it on completion at `packages/react/src/container/Pane/index.tsx:330`, and also releases it on cancellation at `packages/react/src/container/Pane/index.tsx:356`. Svelte follows the same sequence at `packages/svelte/src/lib/container/Pane/Pane.svelte:126`, `packages/svelte/src/lib/container/Pane/Pane.svelte:292`, and `packages/svelte/src/lib/container/Pane/Pane.svelte:314`.

The shared drag helper installs d3 listeners and removes the `.drag` namespace in `destroy` at `packages/system/src/xydrag/XYDrag.ts:411`. The shared pan and zoom helper removes its zoom handler at `packages/system/src/xypanzoom/XYPanZoom.ts:229`.

The pan and zoom helper deliberately leaves its extent observer connected because `destroy` also pauses interaction during selection. Its comment relies on garbage collection when the pane becomes unreachable at `packages/system/src/xypanzoom/XYPanZoom.ts:58`. This lifetime differs from the renderer observers, which use explicit framework cleanup.

## Flow decision

`FlowBrowser` is one application-owned Effect service. It owns listener registration, resize observation, element measurement, pointer capture, and pointer release. The core package never receives an element, browser event, or observer.

Each host creates a closeable Effect scope. Each node creates a child scope for its listeners. Removing a node closes its child scope. Destroying the host closes the host scope, which disconnects the observer, removes canvas and node listeners, clears subscriptions, and removes the DOM tree. Closing an already closed scope has no effect.

`createFlowHost` returns the existing imperative controller for ordinary application composition. `acquireFlowHost` wraps that controller in `Effect.acquireRelease`. Completion, failure, or interruption of the surrounding Effect scope calls the same idempotent `destroy` path.

Browser capability failures stay at the adapter boundary. Resize observer acquisition fails the host Effect with `BrowserCapabilityError`. Pointer capture and release failures produce bounded warning logs and spans. They do not expose DOM exceptions as graph changes.

## Alternatives

- Separate services for events, measurement, and pointer capture would allow smaller test replacements. They would also add three service dependencies to one cohesive DOM lifetime. Flow uses one service until another adapter needs an independent capability.
- A core browser port would make the capability reusable. It would also point graph packages toward DOM concepts. Flow keeps the service in the vanilla application.
- Manual cleanup arrays would preserve the old controller shape. They would not connect cleanup to Effect interruption. Flow uses scopes so explicit destroy and Effect finalization share one path.

## Tests and gaps

The browser suite retains detached elements, destroys the controller twice, dispatches a wheel event, changes node width, and verifies that neither listeners nor resize observation run. A second scenario interrupts an Effect fiber that holds `acquireFlowHost` and verifies the same cleanup.

Animation frames and focus listeners do not exist in the current feature set. Touch and pinch gestures remain unverified. A future adapter may require the service to split if it provides measurement and events through different platform APIs.

## Conformity and deviations

- **Conforms:** Flow uses one renderer-owned resize observer and disconnects it when the renderer lifetime ends.
- **Conforms:** Flow captures pointers at gesture start and releases them on completion or cancellation.
- **Conforms:** Flow removes installed event listeners when the owning node or host stops.
- **Deviates:** Flow closes every observer explicitly. The reference pan and zoom helper leaves one observer for garbage collection because its `destroy` method also pauses interaction.
- **Deviates:** Flow ties browser resources to Effect scopes as well as explicit controller destruction. React and Svelte use framework lifecycle callbacks.
- **Unverified:** Animation-frame cancellation, focus listeners, touch gestures, and pinch gestures remain outside this slice.
