# JavaScript public API

`@flow/core` owns schema-derived graph, change, command, geometry, persistence, and transition contracts. `@flow/vanilla` owns DOM acquisition and rendering. The packages also retain the native Effect host API: `createFlowHost` builds a host from decoded values, while `acquireFlowHost` ties its `destroy` method to the caller's Effect scope.

## Base Node recipes

The UI recipe APIs expose caller-composed node shells while leaving node positioning, dragging, handles, and keyboard interaction to the owning canvas. Vanilla exports `createFlowBaseNode(document, { title, content?, ariaLabel?, className? })` from `@flow/vanilla`; Vue exports the `FlowBaseNode` component from `@flow/vue` with a required `title` and default content slot; Foldkit exports `createFoldkitBaseNode(title, h, content?, ariaLabel?)` from `@flow/foldkit` for use inside a typed node renderer. Each renders original host-native markup with a `group` role and title-derived accessible name. These are host-native surfaces with equivalent bounded outcomes, not a shared component contract or a React parity claim.

## Mounting

`mountFlow(root, input, options)` is the synchronous JavaScript entry point. It decodes `input` and schema-backed options before constructing the host, then returns a `JavaScriptFlowController`. Invalid input or options throw synchronously. Renderer errors and `BrowserCapabilityError` can also escape during mounting; a renderer failure closes the partially mounted host and removes its DOM before the error escapes.

`createFlow(root, input, options)` is the Promise-based entry point for callers who prefer async acquisition. Its input is `unknown` and validation failures reject the Promise with the same schema or host error that `mountFlow` would throw. It delegates to the same synchronous mount and cleans host resources on a mount failure. After resolution, controller methods remain synchronous; an exception from `dispatch`, `update`, or another controller method is thrown by that call and is not converted into a later Promise rejection.

Pass `onChange` in `createFlow` options to subscribe during acquisition. Destroying the returned controller removes that subscription and releases the host. Both entry points also expose `subscribe(listener)`, which returns an unsubscriber for a caller-owned subscription.

## Accepted-state reads

Both controller facades expose `getSnapshot()`, `getNodes()`, `getEdges()`, `getNode(id)`, `getEdge(id)`, and `getViewport()`. They read the current accepted document and viewport. Snapshots contain all document nodes and edges, including hidden items and items omitted from rendering by viewport culling. Node positions remain parent-relative. Missing IDs return `undefined`.

Each getter returns a detached, deeply frozen point-in-time value. Object identity is not stable between reads. These values exclude DOM nodes, measured geometry, pointer sessions, and uncommitted preview positions; mutating a returned value cannot change live host state.

`subscribeState(listener)` reports `{ previous, current, cause }` synchronously after a distinct accepted document or viewport value is installed. It has no initial delivery, deduplicates schema-equal values, and returns an immediate unsubscriber. Semantic `subscribe` proposals remain separate: controlled proposals do not change reads until the owner acknowledges them with `update`; uncontrolled changes are installed before accepted-state notification. For an uncontrolled semantic change, the existing semantic listener runs first. Reentrant updates queue FIFO until current listeners finish. Listener failures are reported and isolated so remaining listeners still run. Destroy invalidates subscriptions; a subscription created after destroy is inert.

### Selection and key observers

Vanilla controllers and Vue's canvas-scoped `useFlow()` expose `subscribeSelection(listener)` and `observeKeyPress(keyCode, options, listener)`. Foldkit binds the same owner-scoped observers to a Runtime's accepted-state port and disposes them with that Runtime. Selection subscriptions immediately report the selected node and edge arrays from the current accepted document, then report only when ordered selected IDs change. A controlled proposal does not notify until its owner acknowledges it. Unsubscribe or owner disposal stops later callbacks.

Key observers immediately report `false`, then report pressed-state transitions for a key, key combination, or alternatives array. `target` accepts a Window, Document, HTMLElement, ShadowRoot, or null; an omitted or null target uses the host's default document. Editable controls are ignored unless a modifier is held and `actInsideInputWithModifier` is true. INPUT, SELECT, TEXTAREA, `[contenteditable]`, and `.nokey` descendants are filtered. Matching keydown prevents the browser default unless `preventDefault` is false or an unmodified key targets a BUTTON or A. Blur and contextmenu clear pressed state. These APIs are host-owned subscriptions, not React rerender hooks; selector callbacks, React effect timing, and arbitrary selection equality are not exposed.

### Node connection observers

Vanilla controllers expose `observeNodeConnections({ nodeId, type?, handleId? }, { onConnect?, onDisconnect? })`; the disposer ends observation. Vue exports `useNodeConnections({ nodeId?, type?, handleId?, onConnect?, onDisconnect? })`, which returns the computed `FlowNodeConnection[]` projection and can use the custom-node ID context when `nodeId` is omitted. The `@flow/foldkit` package exports `createFoldkitObservers`, which binds callbacks to one Runtime's accepted-state port. Callback functions remain in the host and do not cross Runtime ports.

Observation starts from the current projection without calling either callback. Later accepted-state changes report removed or changed projections through `onDisconnect` before additions or replacements through `onConnect`. Controlled proposals stay silent until the owning application acknowledges them; rejecting a proposal emits nothing. If a callback throws, the same-delta connect callback is still attempted and the error is sent through the host error boundary. Disposing the observer, canvas scope, or Runtime stops further notifications. These APIs pass Flow's `FlowNodeConnection[]` projection (edge ID, endpoints, and handle IDs); they do not claim payload parity with React's `HandleConnection[]`.

```ts
const stop = controller.observeNodeConnections(
  { nodeId: 'node-1', type: 'target', handleId: 'in' },
  {
    onDisconnect(connections) {
      // Connections removed from the last accepted document.
    },
    onConnect(connections) {
      // Connections added to the latest accepted document.
    },
  }
)
stop()
```

```ts
const controller = await createFlow(root, unknownDocument, {
  documentMode: 'controlled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
  onChange(change) {
    // Validate/acknowledge controlled changes in the application.
  },
})

controller.update(nextDocument)
const stopListening = controller.subscribe(handleChange)
const stopState = controller.subscribeState(({ current }) => {
  saveFlow(current.document, current.viewport)
})
stopListening()
controller.getNode('node-1')
stopState()
controller.destroy()
```

## Ownership and acknowledgement

Document and viewport control are configured independently at mount. In controlled document mode, a semantic change is proposed to subscribers and the supplied document remains authoritative until the caller invokes `update`. Uncontrolled mode adopts valid changes before notifying subscribers. `updateViewport` follows the separate viewport mode. `fitView`, `dispatch`, `update`, `updateViewport`, `subscribe`, and `destroy` remain synchronous in both facades.

The controller is one host lifetime. `destroy` is idempotent, removes rendered DOM, closes browser listeners and observers, and stops notifications. Applications should call it when their root is no longer owned. The host does not serialize measurements, viewport state, pointer sessions, callbacks, or DOM into the Flow document.

## Graph edits

The controller exposes `setNodes`, `addNodes`, `setEdges`, `addEdges`, `updateNode`, `updateNodeData`, `updateEdge`, `updateEdgeData`, `deleteElements`, and `applyEdit`. Each method returns a Promise for its validated result. `applyEdit({ operations })` applies related operations to one candidate document, so a caller can replace an edge in the same transaction that removes a node it references. Node and edge inputs are schema-decoded; node and edge data must be JSON objects.

Patch methods shallow-merge by default. `{ replace: true }` replaces the target object or data object while retaining the element ID. Missing update targets are no-ops. Duplicate IDs, invalid endpoints, invalid handles, invalid parent relationships, or non-JSON data reject the entire transaction. `deleteElements` deletes requested nodes, their descendants, and incident edges. A `deletable: false` descendant or edge that prevents a valid result rejects the transaction. Its result lists deleted node and edge IDs in document order. Foldkit edit responses encode validation failures and runtime disposal in `FlowEditErrorSchema`; JavaScript and Vue reject their edit promises with host-disposed errors if disposal wins the race.

Vanilla `deleteElements(input, lifecycle?)` and Vue `useFlow().deleteElements(input, lifecycle?)` accept an optional async `onBeforeDelete(candidate)` decision. `true` approves the eligible candidate, `false` denies it, and `{ nodes, edges }` narrows it. The decision may not add IDs, bypass protected elements, or cause an unapproved descendant/incident edge to be deleted. Hosts capture a monotonic accepted-document revision before awaiting approval; if any accepted document transition occurs before approval completes, the request rejects as stale, even if the document later returns to its earlier contents. Abort and host disposal settle a pending request once.

After approval and revision validation, host lifecycle callbacks run in edge, node, then combined order, omitting per-kind callbacks for empty lists. Their payloads contain only entities in the validated deletion result. In controlled mode these callbacks and the returned delete result describe the validated proposal; they do not mean the owner accepted it. The controlled owner update/accepted-state observer remains the acceptance boundary. Uncontrolled mode installs the proposal before the call resolves. Callback order follows the pinned reference; candidate narrowing and stale-revision rejection are Flow additions. Foldkit exposes `flowFoldkitOptions.beforeDelete`, `onEdgesDelete`, `onNodesDelete`, and `onDelete` as host-local callbacks. Foldkit sends only schema-checked requests and responses through Runtime ports; callback functions stay in host composition. Callback exceptions differ by host: Vanilla rejects and Vue fails publication (reported by its no-hook path as `UnknownFlowEditFailure`); Foldkit catches/reports each error through `onCallbackError` (or `console.error` when no handler is configured), continues later callbacks, and settles the proposal/deletion result. These are host-specific error-handling semantics.

A deletion request that resolves to an empty candidate is a no-op. It skips `beforeDelete` and all lifecycle callbacks.

Controlled edits return the validated proposal result while getters continue to expose the last owner-accepted document. The owner must acknowledge a proposal through `update`. Uncontrolled edits install the complete candidate before the Promise resolves. `setNodes`, `setEdges`, and the node/edge update methods also accept updater callbacks. Each callback runs once when its request executes, receives a frozen snapshot of then-accepted values, and remains adapter-only; functions never enter core commands. Controlled proposals do not become an updater base until the owner acknowledges them. Vue scheduler and Foldkit port details are documented in [graph editing](examples/graph-editing.md).

## Collection and geometry utilities

`@flow/core` exports schema-backed `NodeChange` and `EdgeChange` unions with `applyNodeChanges` and `applyEdgeChanges`. These are immutable helpers for partial collections: missing IDs are ignored, ordered add/remove/replace/select changes are applied, and dimension changes update transient measurements without changing persisted `size`. They do not validate graph integrity; use the host edit APIs when installing a candidate document.

The package also exports `addEdge`, `reconnectEdge`, `getFlowEdgeId`, `isNode`, `isEdge`, and the `getStraightPath`, `getBezierPath`, `getSimpleBezierPath`, and `getSmoothStepPath` geometry helpers. IDs are schema-derived branded values. `reconnectEdge` retains the caller's null/undefined handle values in its `ReconnectedEdge` result type; validate a resulting graph before installing it. These utilities have fixed pinned-reference-derived unit cases and a packed-consumer check, while full live React Flow runtime parity remains unverified.

The vanilla host accepts a legacy `panel` element or a `panels` array of `{ id, element, placement }` entries. Panel ids must be unique; placements are `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, or `bottom-right`. Each panel slot is inset 12 CSS pixels from its named canvas edges; center placements are horizontally centered. Slots do not automatically avoid overlap when caller content is larger than the available canvas. Supply only one form: using both throws `CanvasUIOptionsError`. Panel elements remain caller-owned and are restored to their original parent and sibling position, with their class, style, and hidden attributes, when the controller is destroyed. The `overlayPortal` element on the returned controller is a host-local container for arbitrary caller DOM while mounted; it is detached on destroy and is never added to the Flow document. Any children remain available through the detached portal reference. Overlay targets do not begin canvas pointer gestures.

### Background and controls

`createFlowBackground(container, controller, options)` mounts an SVG pattern inside a Vanilla canvas. It follows the controller's viewport: zoom scales the pattern gap and mark size, while pan updates its graph-space offset. The options support `dots`, `lines`, and `cross` variants, numeric or two-axis `gap` and `offset`, `size`, `color`, `bgColor`, `lineWidth`, `id`, `className`, `patternClassName`, and inline `style`. The caller must use a unique `id` when setting one. Call the returned mount's `destroy()` to remove the SVG and stop viewport updates.

`createFlowControls(controller, options)` mounts native zoom-in, zoom-out, and fit buttons in the controller's overlay portal. It supports six canvas positions, vertical or horizontal orientation, `showZoom`, `showFitView`, supported `fitViewOptions`, an accessible group label, styles, caller buttons, and additive action callbacks. Zoom buttons disable at the controller's actual zoom limits. The control factory does not add an interactivity toggle because Vanilla has no public interactivity state contract. Call `destroy()` to remove its listener and portal element; caller buttons return to their original DOM positions and classes.

```ts
import {
  createFlowBackground,
  createFlowControls,
  mountFlow,
} from '@flow/vanilla'
import '@flow/vanilla/style.css'

const controller = mountFlow(canvas, documentValue)
const background = createFlowBackground(canvas, controller, {
  variant: 'dots',
  gap: [20, 24],
})
const controls = createFlowControls(controller, {
  position: 'bottom-right',
  fitViewOptions: { padding: 0.12 },
})

// When the canvas leaves the page:
controls.destroy()
background.destroy()
await controller.destroyAsync()
```

These exports are browser APIs. The background and controls are implemented and tested for Vanilla. Foldkit currently has a separate app-level slice; it is not a packed adapter API yet.

Vue exports `FlowPanel` for use in a `FlowCanvas` default slot. Its `position` accepts the same six placements, inset 12 CSS pixels from the named canvas edges, with center placements horizontally centered. The component renders its default slot in a screen-space overlay, forwards native element attributes (including `class` and `style`), and participates in normal keyboard tab order. It defaults to an accessible `group`; provide an `aria-label` when the group needs a name. Vue owns the panel element through the canvas component tree, so it is removed when the panel or canvas unmounts. This is a Vue component lifecycle contract, not a host-neutral portal API.

## Package entry points

The packages ship JavaScript and declaration files under `dist/`; package exports do not point at TypeScript source. `bun run build:packages` creates these local outputs. `bun run test:consumer` packs both packages into a clean temporary consumer, installs the tarballs, checks runtime and declaration imports, and mounts the vanilla adapter in Chromium. This verifies the package artifacts without publishing them.

## React Flow member inventory

The [member inventory](../research/catalogs/api-members.json) covers all 114 API capability pages in the dated sidebar catalog. It records each documented prop, component field, method, hook behavior, type field or variant, and pinned declaration member with its upstream page, pinned revision, owner plan, per-host mapping status, and remaining decision. The inventory was checked against current website pages on 2026-09-28; the recorded upstream page update date is separate.

Run `bun run scripts/check-api-members.ts` to validate page URL coverage against the dated catalog, unique members, existing plan ownership, upstream anchors, evidence links, and supported completion claims. The checker verifies recorded catalog counts; it does not re-fetch pages or independently prove member-level exhaustiveness, and it does not semantically validate implementation claims. The capture metadata identifies 255 rows with lost name/type/prose/default separators. Those records are labeled `Unparsed captured row` and preserve their original text in `rawSourceRow`; the inventory does not infer field splits. Its negative probes run with `bun run test -- scripts/check-api-members.test.ts`, and the offline checker is part of `bun run verify`.

Inventory membership does not mean the host behavior has been verified. Only 120 entries match existing rows in the curated correspondence matrix; page-level mappings are retained as context and remaining member mappings stay unassessed until separately traced and tested. The live `DeleteElements` shape and `ReactFlowInstance.fitView` are recorded separately from the pinned source revision where they differ.

## Provider-scoped reads and saved sessions

Each host owns its own accepted state and lifecycle. Vanilla exposes snapshot, node-data, connection, and saved-session reads on its controller. Vue provides reactive projections through the injected editor, including node data, connections, and `useNodeId()` inside a custom node renderer. Foldkit serves the same projection types through snapshot requests handled by each Runtime model; it does not expose a mutable state object or Map. Data and connection selectors read accepted documents only. Mutations continue through validated edit/owner APIs.

`getSavedSession()` composes the accepted document with the accepted viewport in a version-1 session envelope. Selection, measured geometry, and gesture state are excluded. `prepareRestore(saved)` validates and returns a detached frozen snapshot proposal; it does not mutate accepted state. In controlled mode, the owner acknowledges the proposal through its normal document and viewport updates. The saved-document version-1 envelope remains unchanged.

Legacy saved-document/session fields and nested constraints are frozen to the original version-1 contract. Both writers synchronously throw `SavedFlowFormatError` when explicit document/node origin or reserved node connectability/element roles would be lost, or when an existing element ARIA label/node description is explicitly empty. Its `code` is `origin-requires-versioned-session` or `native-fields-require-versioned-session`, with origin taking precedence. An own `undefined` for a new reserved name counts as explicit semantics; existing optional label/description `undefined` retains the original behavior. Legacy readers still strip unknown keys and reject version 2. Versioned persistence and live native fields remain planned.

Foldkit exports `createFoldkitSnapshotClient(runtime.ports)`. The owner subscribes to both `snapshots` and mandatory correlated `snapshotFailures`. Its request result is `succeeded`, `disposed`, or `failed` with `invalid-request`, `send-failed`, or either format code. Dispose the client before its Runtime to unsubscribe both channels and settle pending reads. Ordinary Runtime reads and disposal are tested. Because current live schemas cannot accept the reserved fields yet, format-failure production through a mounted Runtime remains a later acceptance gate; controlled application branch tests establish only unit behavior. The delete-approval harness and Placeholder recipe also use this client, with explicit failed/disposed results and client-before-Runtime teardown. Mounted tests cover pending shutdown, new owner correlation and late UI reply suppression.

React-specific Zustand `useStore`/`useStoreApi` mutation and equality callbacks have no direct Flow API. Flow deliberately does not expose the host's mutable internals; use the read projections and state subscriptions supported by each adapter. Provider properties that configure React-only context, server dimensions, or default element behavior remain individually mapped as gaps where Flow has no tested host-native equivalent.

## Measured handle refresh

`updateNodeInternals(id)` and `updateNodeInternals([id, ...])` request host measurements. Vanilla and Vue expose this through their controller/composable; Foldkit exports `createFoldkitNodeInternalsRefresher` with owner-local lookup and observer dispatch callbacks. Each call deduplicates IDs in input order. Overlapping calls coalesce in one animation frame and all callers settle. Results are `requested`, `missing`, `failed`, or `disposed`; `requested` means the host dispatched measurement, not a new document edit.

`getInternalNode(id).handles` exposes detached frozen node-local centers and dimensions from the current measurement generation. Arrays, handle objects and offsets are frozen. Removed declarations, changed kind/side, hidden ancestors and old generations cannot expose stale handles. Rendered edge endpoints and pointer connection targeting consume the same projection. Measurements never enter saved-v1 data. DOM rectangles convert through the owning viewport zoom once.

All three hosts compare actual public geometry and rendered SVG endpoints with the pinned React reference under an explicit equivalent caller layout of 10px borderless handles and borderless nodes. Native CSS cases instead assert their actual DOM center, because native handle size/padding differs. Tests also cover nested positions, zoom 0.5/2, controlled graph stability, handle addition/removal and disposal. These bounds do not establish complete InternalNode shape, React hook subscription behavior, native device timing, collector delivery or broader parity.
