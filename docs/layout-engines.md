# Layout engines and force controls

The `/ui-recipes/layout/?scene=auto-layout` recipe in Vanilla, Vue and Foldkit switches the same measured document among Dagre, hierarchy and ELK. Dagre is the default. Direction selects top-to-bottom or left-to-right layout. Node and rank spacing accept finite values from 0 to 500 graph units, initially 30 and 60.

Hierarchy requires a nonempty single-root tree with one parent per node and no cycles. Invalid input produces a visible error and keeps the accepted positions. Its D3 tree uses the largest measured box for each axis as its cell size, then converts centers using each node's actual measured size. This retains variable-sized nodes without overlap. ELK is opt-in and asynchronous. A request captures authored document state, measurements and settings; a superseded, edited or disposed request cannot apply its result. Measurement keys use whole graph units, as the existing recipes did, while engines retain the actual measured sizes. This prevents fit-related floating-point noise from causing repeated layouts. Engine coordinates need not match each other.

The `force-layout` scene has live force-strength and link-distance controls. Defaults are -1000 and 150, observed in the public reference demo. Flow validates strength from -2000 to 0 and distance from 20 to 400; these ranges are Flow policy because the reference inputs declare no limits. Changes reconfigure the current simulation and reheat it. Browser animation frames drive manual solver ticks until it settles. Drag pauses ticking, pins the accepted drop, and reheats. Settling fits the initial or reconfigured graph; a drag continuation retains the viewport so the dropped node stays under the pointer. History replay restores the simulation coordinates before another run. Disposal stops the scheduler and releases subscriptions.

## Integration APIs

Core exports `FlowLayoutSettingsSchema`, `FlowForceSettingsSchema`, their inferred types and defaults, decoding workflows, `FlowLayoutResultSchema`, `FlowLayoutRequest`, `flowLayoutRevision`, `flowLayoutInputKey` and `createFlowLayoutSession`. A session runs an Effect engine capability and returns `accepted` or `discarded`. Cancellation invalidates delivery even when an engine cannot stop its computation. Results are schema decoded before acceptance. Existing `getFlowLayoutInput`, `applyFlowLayoutPositions` and `orientFlowHandles` share measurement and position behavior.

The optional private `@flow/layout` workspace exports `runLayoutEngine(request)` and `createForceSimulation(input, document, center)`. The simulation exposes `configure(settings)`, `tick()`, `settled()`, `pin(id, position)`, `restore(document)` and `dispose()`. It schedules no timers. Framework and browser composition own scheduling and cleanup.

Vanilla reads `controller.getSnapshot()` and `getInternalNode`, commits through `controller.applyEdit`, and uses `undo`, `redo` and `fitView`. It subscribes through `subscribeState` and destroys on pagehide.

Vue reads the reactive `useFlow()` document and `getInternalNode`, commits through `flow.applyEdit`, and uses the same composable's `undo`, `redo`, `fitView` and `subscribeState`. The recipe waits for Vue's next framework tick before reading accepted reactive state. Scope disposal releases the recipe; app unmount releases the canvas.

Foldkit reads `createFoldkitSnapshotClient` through the recipe host, commits one public `editRequests` transaction, and uses `createFoldkitHistoryClient` and `createViewportClient`. The recipe keeps Plan 146's rendered position, handle-side and browser-normalized fit-transform waits before publishing completion. Runtime disposal resolves pending waits and releases clients and subscriptions.

Every layout destination is one edit. Force frames use a fresh continuous history gesture per run. Engine and force settings are session controls, not new document fields. Layout writes preserve node fields, edge data and opaque metadata; clipboard serialization therefore needs no new document extension. Undo restores documents and rendered positions; it does not store toolbar settings.

The recipe-only `globalThis.flowLayoutRecipe` handle exposes `read()` and `edit(transaction)` for inspecting the same public host APIs. Acceptance uses it for adversarial topology and size edits; normal engine and force controls use browser gestures. It is not an exported framework adapter API.

[Plan 157's trace](../research/traces/157-layout-engines.md) records the production paths, test paths, reference observations and verification boundaries.

Accepted layout results can be delivered to the [node position animation](node-animation.md) APIs. The `/node-animation/` recipe uses the same revision/session contracts and commits one destination while frames remain presentation state.
