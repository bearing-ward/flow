# Handles and connection creation

Status: production paths traced from xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The Flow implementation and its test boundary are described below.

All reference paths are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `Handle` component accepts a handle type, identifier, connection flags, and a validator at `packages/react/src/components/Handle/index.tsx:88`. It renders handle identity and position into DOM attributes at `packages/react/src/components/Handle/index.tsx:239`. A primary mouse or touch start calls `XYHandle.onPointerDown` with the node lookup, connection mode, callbacks, and validator at `packages/react/src/components/Handle/index.tsx:139` and `packages/react/src/components/Handle/index.tsx:152`.

`XYHandle` resolves the source handle from measured node internals at `packages/system/src/xyhandle/XYHandle.ts:69`. Movement passes the pointer through the inverse viewport transform, finds a nearby measured handle, and validates it at `packages/system/src/xyhandle/XYHandle.ts:147` and `packages/system/src/xyhandle/XYHandle.ts:161`. The validation reads the handle below the cursor first at `packages/system/src/xyhandle/XYHandle.ts:272`, checks DOM connectability flags, strict or loose mode, and the caller validator at `packages/system/src/xyhandle/XYHandle.ts:287` and `packages/system/src/xyhandle/XYHandle.ts:307`. Pointer release calls `onConnect` only for a valid result, then calls `onConnectEnd` and removes document listeners at `packages/system/src/xyhandle/XYHandle.ts:201` and `packages/system/src/xyhandle/XYHandle.ts:230`.

React's `onConnectExtended` adds an edge to default-owned edges and invokes both the flow-level and handle-level callbacks at `packages/react/src/components/Handle/index.tsx:124`. Its separate click-to-connect path stores the first handle and calls the same validator for the second at `packages/react/src/components/Handle/index.tsx:185` and `packages/react/src/components/Handle/index.tsx:210`.

## Svelte production path

The public `Handle` accepts the same connection flags and a validator at `packages/svelte/src/lib/components/Handle/Handle.svelte:22`. Its mouse or touch handler passes the store's node lookup, connection mode, callbacks, and validator to `XYHandle.onPointerDown` at `packages/svelte/src/lib/components/Handle/Handle.svelte:113`. A valid connection passes through `onbeforeconnect`, then `store.addEdge`, then `store.onconnect` at `packages/svelte/src/lib/components/Handle/Handle.svelte:102`. The store's `addEdge` replaces its edge array with the result of the shared utility at `packages/svelte/src/lib/store/index.ts:57`. Svelte also has a click-to-connect path using `XYHandle.isValid` at `packages/svelte/src/lib/components/Handle/Handle.svelte:145` and `packages/svelte/src/lib/components/Handle/Handle.svelte:160`.

Svelte renders handle identity and connectability as DOM attributes and classes at `packages/svelte/src/lib/components/Handle/Handle.svelte:199`. React does the same at `packages/react/src/components/Handle/index.tsx:239`. The shared measurement path reads each handle's bounds from the DOM at `packages/system/src/utils/dom.ts:68` and stores source and target bounds in node internals at `packages/system/src/utils/store.ts:469`. The shared `addEdge` utility rejects incomplete endpoints and duplicate endpoint pairs before appending at `packages/system/src/utils/edges/general.ts:139` and `packages/system/src/utils/edges/general.ts:162`.

Strict mode accepts opposite handle types; loose mode accepts either type except the same handle at `packages/system/src/xyhandle/XYHandle.ts:307`. The reference defaults to strict mode in React at `packages/react/src/store/initialState.ts:109` and Svelte at `packages/svelte/src/lib/store/initial-store.svelte.ts:375`. Flow starts with strict source-to-target connections. A loose-mode edge would need an explicit direction rule for a framework-independent document, so it is deferred.

## Reference tests and Flow boundary

The shared Playwright suite drags between two nodes and asserts an added edge at `tests/playwright/e2e/nodes.spec.ts:200`. It tests source-to-source, target-to-target, and disabled targets at `tests/playwright/e2e/nodes.spec.ts:224`, `tests/playwright/e2e/nodes.spec.ts:252`, and `tests/playwright/e2e/nodes.spec.ts:283`. These are reference tests. Flow's tests exercise its own schema and browser host; they do not execute the pinned reference.

Flow keeps handle declarations in the caller document, measured handle positions in the host, and the active pointer connection in host session state. The core validates the proposed endpoints and produces a semantic edge-add change. The host draws only the in-progress preview in this slice. Persistent edge paths, click connection, touch, radius targeting, auto-pan, custom validators, and loose mode remain separate work.

Connection validation gets a bounded `flow.connection.validate` span and a warning with the rejection reason and handle identifiers. The host records start, completion, and cancellation at gesture boundaries. Pointer moves produce no logs, and telemetry contains no pointer coordinates or graph payloads.

## Conformity and deviations

- **Conforms:** A connection starts at a declared handle and completes only at a valid endpoint. Flow browser tests cover this behavior for strict source-to-target input, while reference tests cover React and Svelte separately. This is a behavioral comparison, not a parity claim.
- **Conforms:** Handle declarations remain separate from measured handle geometry. Flow keeps browser measurements out of the document schema.
- **Deviates:** Flow starts with strict source-to-target semantics and explicit handle identifiers. The reference also offers loose mode and implicit first-handle selection. The Flow schema and browser tests define the narrower contract.
- **Deviates:** Flow publishes an edge-add semantic change and gives the caller control through its existing document ownership mode. The reference callbacks and edge ownership vary between adapters.
- **Unverified:** Flow does not yet compare click-to-connect, touch, connection radius, auto-pan, custom validators, persistent edge rendering, or reconnection with the reference.
