# JavaScript public API

`@flow/core` owns schema-derived graph, change, command, geometry, persistence, and transition contracts. `@flow/vanilla` owns DOM acquisition and rendering. The packages also retain the native Effect host API: `createFlowHost` builds a host from decoded values, while `acquireFlowHost` ties its `destroy` method to the caller's Effect scope.

## Base Node recipes

The UI recipe APIs expose caller-composed node shells while leaving node positioning, dragging, handles, and keyboard interaction to the owning canvas. Vanilla exports `createFlowBaseNode(document, { title, content?, ariaLabel?, className? })` from `@flow/vanilla`; Vue exports the `FlowBaseNode` component from `@flow/vue` with a required `title` and default content slot; Foldkit exports `createFoldkitBaseNode(title, h, content?, ariaLabel?)` from `@flow/foldkit` for use inside a typed node renderer. Each renders original host-native markup with a `group` role and title-derived accessible name. These are host-native surfaces with equivalent bounded outcomes, not a shared component contract or a React parity claim.

## Mounting

`mountFlow(root, input, options)` is the synchronous JavaScript entry point. It decodes `input` and schema-backed options before constructing the host, then returns a `JavaScriptFlowController`. Invalid input or options throw synchronously. Renderer errors and `BrowserCapabilityError` can also escape during mounting; a renderer failure closes the partially mounted host and removes its DOM before the error escapes.

`createFlow(root, input, options)` is the Promise-based entry point for callers who prefer async acquisition. Its input is `unknown` and validation failures reject the Promise with the same schema or host error that `mountFlow` would throw. It delegates to the same synchronous mount and cleans host resources on a mount failure. After resolution, controller methods remain synchronous; an exception from `dispatch`, `update`, or another controller method is thrown by that call and is not converted into a later Promise rejection.

Pass `onChange` in `createFlow` options to subscribe during acquisition. Destroying the returned controller removes that subscription and releases the host. Both entry points also expose `subscribe(listener)`, which returns an unsubscriber for a caller-owned subscription.

## Canvas mouse and context-menu callbacks

Vanilla's `onPaneClick`, `onPaneContextMenu`, `onPaneMouseEnter/Move/Leave`, `onNodeClick`, `onNodeDoubleClick`, `onNodeContextMenu`, `onNodeMouseEnter/Move/Leave`, and corresponding edge callbacks receive `FlowCanvasEventPayload`. It contains the original `event: MouseEvent`, the canvas-relative `position`, and `nodeId` or `edgeId` for element callbacks. Call `payload.event.preventDefault()` synchronously to suppress the browser's native context menu. `onPaneScroll` retains its narrower `event: WheelEvent`. `onSelectionContextMenu` also receives the original `event: MouseEvent` alongside selected IDs and position; its existing automatic cancellation remains.

Vue emits `paneContextMenu(position, event)`. The first argument remains the flow-coordinate position, and the second is the original `MouseEvent`. Existing `nodeContextMenu(node, event)` and `edgeContextMenu(edge, event)` signatures remain unchanged. Call `event.preventDefault()` synchronously in these handlers to suppress the native menu.

In Vanilla and Vue, an explicit `panOnDrag` button array containing `2` suppresses the native pane context menu and skips the pane context-menu callback. Boolean `true` enables primary-button panning and leaves context-menu cancellation to the application. Vue also accepts explicit button arrays for panning. Node and edge context-menu callbacks remain available when right-button pane panning is enabled.

## Accepted-state reads

Both controller facades expose `getSnapshot()`, `getNodes()`, `getEdges()`, `getNode(id)`, `getEdge(id)`, and `getViewport()`. They read the current accepted document and viewport. Snapshots contain all document nodes and edges, including hidden items and items omitted from rendering by viewport culling. Node positions remain parent-relative. Missing IDs return `undefined`.

Each getter returns a detached, deeply frozen point-in-time value. Object identity is not stable between reads. These values exclude DOM nodes, measured geometry, pointer sessions, and uncommitted preview positions; mutating a returned value cannot change live host state.

`subscribeState(listener)` reports `{ previous, current, cause }` synchronously after a distinct accepted document or viewport value is installed. It has no initial delivery, deduplicates schema-equal values, and returns an immediate unsubscriber. Semantic `subscribe` proposals remain separate: controlled proposals do not change reads until the owner acknowledges them with `update`; uncontrolled changes are installed before accepted-state notification. For an uncontrolled semantic change, the existing semantic listener runs first. Reentrant updates queue FIFO until current listeners finish. Listener failures are reported and isolated so remaining listeners still run. Destroy invalidates subscriptions; a subscription created after destroy is inert.

### Retained native metadata and legacy format boundary

The canonical full-document decoder retains optional node `connectable` as Boolean, node and edge `ariaRole` as String, node `ariaDescription` as String, and node and edge `ariaLabel` as String. Empty, whitespace and custom strings remain exact. Missing fields stay missing; explicit null and wrong primitive values fail decoding. An own undefined key remains present in validated full documents and detached in-memory snapshots. JSON omits undefined and cannot restore that key's presence. No global defaults are materialized into stored records, and edge ariaDescription is outside this contract.

Existing literal-v1 save methods reject any own connectable/ariaRole key and explicit empty labels/descriptions through SavedFlowFormatError. Own origin metadata takes precedence in the failure code. Original old-field undefined/nonempty inputs and frozen-v1 readers remain unchanged. Foldkit's shared snapshot client returns a correlated failed result for extension-bearing legacy requests; it returns no SnapshotResponse for those requests. The additive save/prepare API retains these live fields. Native renderer acceptance remains separate.

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

The package also exports `addEdge`, `reconnectEdge`, `getFlowEdgeId`, `isNode`, and `isEdge`. IDs are schema-derived branded values. `reconnectEdge` retains the caller's null/undefined handle values in its `ReconnectedEdge` result type; validate a resulting graph before installing it. These graph utilities have fixed reference-derived unit cases and a packed-consumer check.

`getStraightPath`, `getBezierPath`, `getSimpleBezierPath`, and `getSmoothStepPath` accept one readonly coordinate/options object and return a fresh mutable `[path, labelX, labelY, offsetX, offsetY]` tuple. `getEdgeCenter` accepts the same four required coordinates and returns `[centerX, centerY, offsetX, offsetY]`. Callers supply graph coordinates; these synchronous helpers do not measure handles or change graph state. Their existing parameter types derive from private Effect Schemas without per-call decoding.

Side-aware helpers default to source bottom and target top. Bezier curvature defaults to `0.25`; smooth routing defaults to border radius `5`, offset `20`, and step position `0.5`, with independent optional `centerX`/`centerY`. Bezier offsets are absolute label-to-source distances; straight and smooth offsets are absolute endpoint half-distances, even when smooth center overrides move the label. Numeric inputs retain raw JavaScript arithmetic, including NaN, infinities, negative values and options outside conventional ranges. Callers choose suitable coordinates and options; these helpers do not clamp them or promise finite outputs.

The dedicated [path-helper trace](../research/traces/path-helpers.md) separates complete pinned numeric tuples, malformed JavaScript observations and installed package/compiler probes from mounted renderer behavior. Helper-only aliases select Bezier for `default`, simple Bezier for `simplebezier`, smooth radius zero for `step`, smooth defaults for `smoothstep`, and straight for `straight`. This mapping does not add a connection-preview dispatcher or a `getStepPath` export.

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

Legacy saved-document/session fields and nested constraints remain frozen to the original version-1 contract. Supported legacy writers first validate graph integrity, then reject valid origin, native metadata, or explicit noncanonical directed handle semantics through `SavedFlowFormatError`, in that precedence order. The three failure codes are `origin-requires-versioned-session`, `native-fields-require-versioned-session`, and `noncanonical-handles-require-versioned-session`. Existing readers retain original unknown-key stripping and reject version 2. Literal1 integrity uses the frozen global and per-edge order in one shared traversal, including canonical endpoint kinds. The additive reader validates the complete stored plus known-extension envelope and session viewport before that traversal, then rejects known semantic extensions before frozen field projection. Live/v2 integrity resolves explicitly named physical IDs across handle kinds.

Vanilla and Vue expose `getVersionedSavedSession()` and `prepareVersionedRestore(saved: unknown)`. The writer returns literal1 for legacy-representable content or the single complete literal2 body for origins, exact native metadata, and valid explicit noncanonical handles. Own undefined on new fields selects2; raw returned values retain presence while JSON omits undefined. Defined false, empty strings and finite origin tuples retain their exact values. Selection, measurements, gesture state and other transient/excess fields remain excluded. Every saved output detaches nested node/edge JSON from accepted authority. Preparation returns a detached frozen snapshot proposal; the controlled owner acknowledges document and viewport through existing updates.

Foldkit exports `prepareVersionedSavedSession(saved: unknown)` as an Effect and adds `versionedSnapshotRequests`/`versionedSnapshots` with schema-derived request and response contracts. `createFoldkitSnapshotClient(runtime.ports)` returns the additive `requestVersioned` method when both versioned ports are present. Three-port legacy callers keep their existing result and literal1 inference. One owner and sequence correlate both protocols; wrong-channel matching IDs are ignored before decoding or settling. The shared snapshot/query output boundary detaches nested data in snapshot, node, edge, internalNode.node, nodesData, handleConnections and savedSession; nodeConnections remains the flattened identity projection. Dispose the client before its Runtime so all subscribed channels unsubscribe and pending reads settle once. Demo and generic harness saves use the supported additive writer rather than constructing a version1 body directly.

This source stage does not establish all-host rendered origin restoration, native accessibility rendering, generic/class codec isolation or broad original-member closure. Final Plan070 acceptance also requires Plan081 rendering proof, full verification and release dry run.

React-specific Zustand `useStore`/`useStoreApi` mutation and equality callbacks have no direct Flow API. Flow deliberately does not expose the host's mutable internals; use the read projections and state subscriptions supported by each adapter. Provider properties that configure React-only context, server dimensions, or default element behavior remain individually mapped as gaps where Flow has no tested host-native equivalent.

## Runtime Vanilla canvas options

Vanilla controllers expose `setCanvasOptions(partial: FlowCanvasOptionsInput)`. It decodes the partial with `FlowCanvasOptionsSchema`, derived from the mount-option fields, before applying it. Invalid input throws without changing settings. Omitted fields keep their configured values. Explicit `undefined` restores that field's mount default. No mount default changes.

Supported fields are `snapToGrid`, `snapGrid`, `panOnScroll`, `panOnScrollSpeed`, `panOnScrollMode`, `zoomOnScroll`, `zoomOnPinch`, `zoomOnDoubleClick`, `preventScrolling`, and `renderOnlyVisible`. Snap grids accept `{ x, y }` or `[x, y]`. `snapToGrid: false` disables snapping while retaining the configured grid; enabling it again uses that grid, or 15×15 when no grid is configured. A grid alone keeps the existing mount behavior of enabling snapping.

The controller, selection, and viewport remain in place. Drag and scroll handlers read the current settings on their next event without replacing node elements or interrupting those gestures. Changing `renderOnlyVisible` immediately reconciles visibility, retaining elements that remain visible. Vanilla's `closing-options.e2e.ts` tests mid-drag changes, scroll modes with element identity, culling, decode rejection, snap defaults, built-in keyboard steps, and handle identity during a connection. Vue does not expose this setter. Foldkit exposes the port-based canvas patch described below.

## Measured handle refresh

`updateNodeInternals(id)` and `updateNodeInternals([id, ...])` request host measurements. Vanilla and Vue expose this through their controller/composable; Foldkit exports `createFoldkitNodeInternalsRefresher` with owner-local lookup and observer dispatch callbacks. Each call deduplicates IDs in input order. Overlapping calls coalesce in one animation frame and all callers settle. Results are `requested`, `missing`, `failed`, or `disposed`; `requested` means the host dispatched measurement, not a new document edit.

Vanilla mount options also accept `onHandleRender(node, handle, element)`. The host calls it on each newly created handle button and again on existing buttons when node data changes. Data-only refreshes retain button identity, including the source of an active connection. Changed handle declarations recreate the buttons. Use the supplied button to set field-row offsets or accessible labels, then call `updateNodeInternals` after changing layout. The host keeps ownership of the button and its connection lifecycle. The callback is opt-in and does not change default placement. Schema Studio's S3 browser test checks field spacing and collapsed-handle refresh; Vue does not expose this hook. Foldkit uses declarative `handleAttributes` described below.

`getInternalNode(id)` in Vanilla and Vue reads the current drag or resize preview. `node.position` is the live parent-relative anchor, `absolutePosition` includes movement inherited from a dragged ancestor, and `width`/`height` reflect resize previews. `node.size` and the `measured` dimensions returned by `getNode`/`getNodes` also reflect a resize preview. Reads remain detached and frozen as before. Escape restores accepted geometry when it cancels the gesture. Without a preview, reads retain their accepted-document behavior. Vue's bulk `getInternalNodes` uses the same projection; Vanilla has no public bulk internal-node method.

Vanilla custom edge `geometry` hooks can call these methods during a drag to obtain the same preview positions as the edge paint pass. The host reuses that pass's graph instead of building a graph for each endpoint read. `getNode` and `getNodes` also expose live positions in Vanilla and Vue. Accepted snapshots, saved sessions, and `toObject()` retain their document serialization semantics, so a canceled preview is never persisted. The host browser tests in `live-internal-node.e2e.ts` cover single nodes, carried children, Escape, pointer resize, and held-key resize. Schema Studio tests cover field relationships and Catalog-area dragging.

Foldkit snapshot-backed instance methods now share the view projection for drag and resize. Its public instance resize tests cover native pointer and held-key input, with accepted-state and Escape checks. These tests establish that bounded host contract, not full React Flow parity.

`getInternalNode(id).handles` exposes detached frozen node-local centers and dimensions from the current measurement generation. Arrays, handle objects and offsets are frozen. Removed declarations, changed kind/side, hidden ancestors and old generations cannot expose stale handles. Rendered edge endpoints and pointer connection targeting consume the same projection. Measurements never enter saved-v1 data. DOM rectangles convert through the owning viewport zoom once.

All three hosts compare actual public geometry and rendered SVG endpoints with the pinned React reference under an explicit equivalent caller layout of 10px borderless handles and borderless nodes. Native CSS cases instead assert their actual DOM center, because native handle size/padding differs. Tests also cover nested positions, zoom 0.5/2, controlled graph stability, handle addition/removal and disposal. These bounds do not establish complete InternalNode shape, React hook subscription behavior, native device timing, collector delivery or broader parity.

The native internal-node contract has required numeric `width`/`height`, `measurementStatus`, `absolutePosition`, `node` and a readonly `handles` array. It does not expose React's `measured` object or `internals.bounds`/`handleBounds` wrappers. Current samples supply dimensions; absent or stale samples use declared/default dimensions. Zero measurements are valid. Hidden status empties handles; dimensions still use a current sample if available. Vue ends the element generation on hide/unmount, so its tested hide path falls back. Vanilla and Foldkit retain the current sample in that tested path.

Each measured handle has required nonempty `handleId`, `nodeId`, numeric size and node-local center `offset`. Handle kind and side belong to `internal.node.handles` declarations. Join by ID to partition source/target geometry or recover `top`, `right`, `bottom` and `left`. No handles produces `[]`, including omitted declarations and hidden/stale samples. Recover rectangle top-left by subtracting half the width/height from the center. Null or omitted declaration IDs are rejected at the public input boundary without changing the accepted document. Nullable connection-handle queries remain a separate contract.

The original 065 member tests exercise both kinds on every side at zoom 0.5/2, exact public fields, hidden lifetime variants, callback retention and rejected IDs. Packed consumers independently compile positive and negative public declaration probes. These establish the named native mappings; exact React callback/frame timing and raw nullable/optional object shapes are deliberate differences, not parity claims.

## Vue selection, drags and measurement

A Vue node click selects the node; Meta or Ctrl toggles it in the current selection, and a plain click on a selected node keeps the selection. Clicks on controls inside a node (buttons, inputs, links, handles, resize controls) do not select it. An edge is selected when a press is released over the same edge without moving. Pressing a selected node drags every selected, draggable node whose ancestors are not also dragged; the drop commits each moved node, and drags of two or more nodes report `selectedNodesDragStart`, `selectedNodesDrag` and `selectedNodesDragStop` with the dragged `nodes`. Nodes and edges, including custom edge renderer props, follow a drag every frame, and every dragged node reports `dragging`. Positions still reach `nodesChange` only at the drop.

Resize controls show on selected nodes only when `nodesResizable` is set, and only on nodes that do not render their own resizer. A custom node renders `FlowNodeResizer` (four lines and four handles) or `FlowNodeResizeControl` (one control) for React `NodeResizer` options: min/max size, `keepAspectRatio`, `isVisible`, `resizeDirection`, `shouldResize`, `autoScale` and `resizeStart`/`resize`/`resizeEnd` emits with `ResizeParams`. Such a node opts out of the `nodesResizable` controls. Each resize step commits `node-bounds`, together with any `expandParent` growth, as one owner update; test boundary `apps/vue/e2e/final-wiring.e2e.ts`. Measured size changes, including the first, arrive on `nodesChange` as `{ type: 'dimensions' }` changes. Vue measures a node once its canvas is in the document; a connected node with an empty or hidden box measures as zero. Sizes and handle offsets divide client rectangles by the zoom of the rendered viewport transform. `FlowBaseEdge` reports its path, so a custom edge's hit target, hover and focus follow the drawn path. Test boundary: `apps/vue/e2e/host-hardening.e2e.ts`.

## Typed-data contract factory

Core exports `defineFlowDataContract`, `createFlowNodeVariantSchema`, `createFlowEdgeVariantSchema`, `createFlowDataDocumentSchema`, and `validateFlowGraphDocument`. This factory foundation records a caller codec and isolation capability. Construction runs neither capability and creates no graph authority. Existing concrete JSON APIs retain their signatures and behavior.

```ts
import {
  createFlowDataDocumentSchema,
  createFlowEdgeVariantSchema,
  createFlowNodeVariantSchema,
  defineFlowDataContract,
  validateFlowGraphDocument,
} from '@flow/core'
import { Effect, Schema as S, SchemaGetter as G } from 'effect'

const date = S.String.pipe(
  S.decodeTo(S.Date, {
    decode: G.transformEffect((value) =>
      Effect.sleep(1).pipe(Effect.as(new Date(value)))
    ),
    encode: G.transformEffect((value) =>
      Effect.sleep(1).pipe(Effect.as(value.toISOString()))
    ),
  })
)
const Node = createFlowNodeVariantSchema({
  type: S.Literal('dated'),
  data: S.Struct({ created: date }),
})
const Edge = createFlowEdgeVariantSchema({
  type: S.Literal('weighted'),
  data: S.Struct({ weight: S.Number }),
})
const Document = createFlowDataDocumentSchema({ nodes: Node, edges: Edge })
const contract = defineFlowDataContract({
  id: 'dated-document',
  document: Document,
  isolation: {
    detach: (value: typeof Document.Type) =>
      Effect.sync(() => ({
        ...value,
        nodes: value.nodes.map((node) => ({
          ...node,
          data: { created: new Date(node.data.created.getTime()) },
        })),
        edges: value.edges.map((edge) => ({
          ...edge,
          data: { ...edge.data },
        })),
      })),
  },
})
const decoded = S.decodeUnknownEffect(contract.document)({
  nodes: [
    {
      id: 'one',
      label: 'One',
      position: { x: 0, y: 0 },
      type: 'dated',
      data: { created: '2026-10-02T00:00:00.000Z' },
    },
  ],
  edges: [],
})
const checked = decoded.pipe(Effect.flatMap(validateFlowGraphDocument))
```

`Document.Type` contains Date instances; `Document.Encoded` contains strings. `FlowNodeOf<C>` and `FlowEdgeOf<C>` extract the exact decoded subtypes from a graph codec. `FlowNodeGeometry`, `FlowEdgeGeometry`, and `FlowGraphGeometry` derive from the concrete contracts and retain document/per-node origins. Builders replace only type/data or nodes/edges and preserve every other authoritative field schema. A whole-document codec can have a different encoded shape and additional decoded metadata; using these builders is optional.

Supply exact field schemas for optional/default discriminators and data. Use ordinary `S.Union` for optional/default/untagged branches and narrow every branch in caller code. `S.toTaggedUnion('type')` requires a discriminator on every decoded branch. An untagged discriminator or no-data field uses `S.optional(S.Undefined)` so a foreign value fails instead of being stripped. `S.optionalKey` permits absence and rejects own undefined at runtime. `S.optional` permits both. Caller-selected key/value defaults and passthrough/omit encoding strategies remain unchanged.

Decoding requires only `C.DecodingServices`, encoding only `C.EncodingServices`, and `isolation.detach` only its declared isolation environment. Compose and provide those Effects at the application boundary. Parser errors remain `S.SchemaError`. Service-free parsers can still suspend, so a `never` service environment does not make synchronous parsing safe. `S.decodeUnknownEffect(S.toType(C))` validates decoded classes without running encoding transforms. `validateFlowGraphDocument` runs the existing ordered physical-ID integrity traversal and returns the exact supplied document reference; it does not decode data, invoke isolation, or create authority.

`FlowIsolation<C, RI>` is trusted caller code. Schema validates the decoded output shape but cannot certify independent Date values or private class slots. Supply a class-specific copy capability and mutation tests for those states. Successful codec roundtrips, `instanceOf`, and freezing cannot establish independence. The example capability copies its selected data classes; it is not a general deep-cloner for every mutable geometry extension.

`FlowTypedFailureSchema` derives the five approved failure variants: codec, callback, disposed, revision conflict and projection. Codec operations are decode, validate-decoded, encode and isolate. `FlowTypedError` adds the existing document integrity failures. These schemas define future workflow data; the factory implements no actor, revision owner, callback delivery or native projection orchestration.

### Conformity and deviations

The factory's production path is public exports to the core builders/constructor or shared integrity validator. Units exercise real Schema parsers and class capabilities. Installed archive consumers compile correlated variants, brands and service negatives, then execute the public factory/runtime matrix. Current consumer compiler options omit exact optional property assignment enforcement; runtime optional-key rejection remains tested. Existing versioned-persistence browser suites guard shared concrete integrity only.

Schema-derived contracts, accepted geometry/metadata and ordered integrity conform to the selected core contract. Effectful codec composition and trusted class isolation are intentional adaptations for services, suspension and mutable private state. Typed actors, reducers, getters, subscriptions, native canvas/render/lifecycle, typed persistence, pinned generic parity, all original generic members, full integration, CI, devices and collector delivery remain unverified.

## Scoped typed Flow actor

`makeTypedFlow` creates one scoped core graph owner from a `FlowDataContract` and an encoded or decoded initial document. The actor retains the codec's exact decoded node, edge and whole-document metadata types. Its methods return Effects; provide services when executing each method. The actor captures that execution's Context, including services supplied after construction.

```ts
import { makeTypedFlow } from '@flow/core'
import { Effect } from 'effect'

const program = Effect.scoped(
  Effect.gen(function* () {
    const initial = yield* decoded
    const flow = yield* makeTypedFlow({
      contract,
      initial: { kind: 'decoded', input: initial },
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    const snapshot = yield* flow.readSnapshot()
    yield* flow.replaceDecoded(snapshot.document, snapshot.revision)
    return yield* flow.encodeDocument()
  })
)
```

The example uses the contract and decoded Effect from the factory example. Run `program` with the services required by that contract. Decoded construction requires encoding services, decoded isolation services and `Scope`. Encoded construction also requires decoding services and the optional encoded-input capture service. A dynamically selected initial kind requires both channels.

`readSnapshot`, `readNodes`, `readEdges`, `readNode`, `readEdge` and `readSelected` require decoded isolation services. Missing branded node or edge IDs produce `Option.none`. Each read captures one accepted revision and document together, then detaches its delivery outside the writer. A newer accepted revision does not invalidate that captured read; actor closure rejects unfinished delivery. Selector defects produce `FlowCallbackFailure`.

`replaceEncoded(input, expectedRevision)` requires decoding, encoding, isolation and encoded-capture services. `replaceDecoded(document, expectedRevision)` requires encoding and isolation. `updateDecoded(snapshot => Effect)` adds the updater's services, runs the updater once on a detached snapshot and attempts one revision comparison afterward. An awaited nested update can accept; the outer update then conflicts. There is no callback replay. Stale revisions produce `FlowRevisionConflict`; invalid expected revisions and revision exhaustion produce `FlowCallbackFailure`. Every accepted write increments the revision and returns `{ revision, changed: true }`, including equal documents.

`encodeDocument` requires encoding and isolation services and returns checked finite JSON from an independent private copy. Decoded reads, writes and saves do not acquire the encoded-input capture service. The default encoded capture copies plain JSON through property descriptors before invoking the document codec. It rejects accessors, custom prototypes, symbol keys, cycles, undefined, functions, bigint, nonfinite numbers and sparse arrays without executing getters. Special own keys remain intact. For an encoded class or own-undefined/default branch, supply `FlowTypedEncodedInputCapture<RC>` with a trusted copy that preserves private state and absence. Schema validation cannot establish that capability's ownership promise.

The isolation capability must detach Date values and private class slots at every input and delivery boundary. Custom checkers, encoders, updaters, selectors and observers receive private copies. A singleton copy capability violates that promise even if its class passes Schema validation. Containers are frozen after preparation; freezing does not prove private class independence.

`FlowTypedSnapshot<C>` derives from `createFlowTypedSnapshotSchema(C)`. Its document Type and Encoded channels both retain exact `C.Type`; its outer document key is required and readonly without inheriting a codec key default. The exported schema metadata represents that field as a singleton Union: `fields.document.members[0]` is `S.toType(C)` and its `schema` is the original codec. Nested optional, default, no-data, class and branded fields remain unchanged.

Initialization captures and validates the viewport before any document hook or staging call. `FlowTypedCheckpointSchema` refines the authoritative viewport with finite x and y checks, in that order. NaN and either infinity fail with `FlowCodecFailure`, operation `encode`, and `Checkpoint viewport.x must be finite` or `Checkpoint viewport.y must be finite`. Other viewport capture, shape or zoom failures use `Invalid checkpoint viewport`. The existing concrete `ViewportSchema` remains unchanged. Initialization and every write validate and copy the complete finite JSON checkpoint before acceptance.

An optional `FlowTypedCheckpointGate` stages a separate frozen checkpoint and returns only after its required staging acknowledgement. Its reservation supplies a short, pure, nonthrowing `isCurrent`, an idempotent non-reverting `abort` Effect, and an `accepted` Effect. Staging and caller preparation run outside the writer; the final revision comparison and acceptance run together inside it. A staging failure rejects that request with `FlowProjectionFailure` at its prospective revision. Expired or throwing reservation checks reject before acceptance.

After core acceptance, an independent ordered worker runs `accepted` and releases the transient staging identity once. Activation failure stores `FlowProjectionFailure` at the failed accepted revision with `Checkpoint activation failed`, rejects pending and new writes, and stops queued activation. Already accepted graph, revision and observer history remain available to reads, encoding and observation. The commit receipt establishes core acceptance. Native render, port acknowledgement, reload and durable persistence require their own integration evidence. Trusted abort defects are unsupported provider violations whose actual causes remain visible during cleanup; no liveness guarantee covers a nonterminating capability.

`observe(snapshot => Effect)` captures each registration's Context and scope, requires isolation and listener services, and remains active until failure, cancellation or actor closure. Each registration receives an initial snapshot and every subsequent accepted revision through its own ordered unbounded queue. Slow listeners do not block acceptance or other listeners and may await updates. Pending deliveries retain private accepted references until delivery; cancellation, failure and disposal clear that queue. Listener failure removes that registration. Cancellation remains interruption; actor closure completes healthy observers normally.

Closing the construction scope forbids acceptance, settles still-pending calls with `FlowDisposed` without replacing an earlier terminal gate failure, interrupts cooperative work and joins owned cleanup and late reservation handoffs. Input services and capabilities must cooperate with cancellation. No JavaScript blocking-code interruption guarantee is provided.

### Conformity and deviations

The production path is the public actor export through owned capture and preparation, mandatory checkpoint staging, one core acceptance writer and independent observer and activation workers. Owned units call that same source entry; packed fixtures import installed `@flow/core` exports. Existing concrete browser and versioned-persistence suites are separate regression boundaries.

Typed core ownership, Schema-derived values, service composition and ordered graph integrity follow the core architecture. Effectful methods, trusted capture and isolation, revision conflicts without replay, initial observation and separate core acceptance and activation are intentional policies. Native typed transitions, renderer and framework lifecycle, typed persistence, pinned library parity, original generic members, full integration, CI, devices and collector delivery remain unverified.

## Standalone marker configuration schemas

`FlowEdgeMarkerConfigurationSchema` and its derived `FlowEdgeMarkerConfiguration` type validate a standalone configuration. `FlowEdgeMarkerValueSchema` and derived `FlowEdgeMarkerValue` accept that configuration or any string, including an empty logical reference. Since Plan 114, graph edges, default edge options and typed factory edges accept `FlowEdgeMarkerOptionSchema`: the `arrow` and `arrowclosed` literals or a configuration object. They still reject arbitrary references, empty strings and null. Documents with a marker configuration save in the v3 envelope (see below). Hosts render the configured kind through `flowEdgeMarkerType` until they wire `resolveFlowEdgeMarker`.

Configuration requires `type: 'arrow' | 'arrowclosed'`. Optional `color` accepts strings, null and own undefined. Optional `width`, `height` and `strokeWidth` accept finite nonnegative numbers, including zero. Optional `markerUnits` and `orient` accept any string, including empty and nonstandard strings. Ordinary null in those five nonnullable fields fails. Decoding injects no defaults, preserves optional own undefined and strips unrelated unknown keys. Live `colorPresence` is reserved and rejected even when its value is undefined.

The configuration is a validating Declaration, so it has no public Struct `fields` or `mapFields` methods. Callers may compose it inside their own genuine Structs. Both new schemas have identical ordinary Type and Encoded contracts and require no decoding or encoding services. Their canonical JSON codecs retain the live Type, have public Encoded `Schema.Json`, and likewise require no services.

```ts
import { FlowEdgeMarkerConfigurationSchema } from '@flow/core'
import { Schema } from 'effect'

const live = Schema.decodeUnknownSync(FlowEdgeMarkerConfigurationSchema)({
  type: 'arrow',
  color: undefined,
  width: undefined,
  orient: '',
})
const jsonCodec = Schema.toCodecJson(FlowEdgeMarkerConfigurationSchema)
const wire = Schema.encodeUnknownSync(jsonCodec)(live)
// wire is { type: 'arrow', colorPresence: 'explicit-undefined', width: null, orient: '' }
const restored = Schema.decodeUnknownSync(jsonCodec)(
  JSON.parse(JSON.stringify(wire))
)
// restored owns color and width, each with value undefined; orient remains empty.
```

Ordinary decode and encode preserve live fields without wire flags or null sentinels. Canonical JSON encodes each own undefined nonnullable field, `width`, `height`, `strokeWidth`, `markerUnits` and `orient`, as an own null field. JSON decoding restores that null to own undefined. Field absence stays absent. Raw own undefined passed directly to JSON decoding fails because undefined is not a JSON value. JSON encoding still rejects invalid live null, negative or nonfinite numeric fields and invalid string fields.

Color needs its own flag because actual color null is valid:

| Live color | Canonical JSON | Restored live color |
| --- | --- | --- |
| Absent | Neither color nor colorPresence | Absent |
| Own undefined | colorPresence explicit-undefined, no color | Own undefined |
| Own null | color null, no flag | Own null |
| Empty or other string | Exact color, no flag | Exact color |

Wire flag-only explicit-undefined succeeds. A wrong or undefined flag fails. Flag plus any own color fails. Valid JSON null or string color conflicts contain `Marker color flag/value conflict`. Raw undefined or another invalid color fails during structural parsing before that filter; its formatter text is not a stable contract. High-level Schema operations fail with `Schema.SchemaError`; internal SchemaParser and checked transformation operations fail with `SchemaIssue.Issue`. Invalid synchronous operations do not suspend, defect or fall back to a valid configuration.

A caller-owned optional value field can use canonical JSON null for outer own undefined because direct live marker null is invalid. That recursive composition preserves each nested configuration's five field sentinels and separate color flag. It does not establish preservation through Flow documents, Application.Model, Runtime, ports, saved formats, HMR or native renderers. All original marker/MiniMap parity members remain open.

## Presentation fields, canvas options and resizer contracts

Plan 114 adds core contracts and pure helpers; host wiring follows the checklist in `plans/114-core-model-styling-options.md`.

- **Node fields.** `style` (`FlowStyleSchema`, a string-or-finite-number record), `className`, `sourcePosition`/`targetPosition` (`FlowHandleSideSchema`), `dragHandle` (a CSS selector), `expandParent` and the transient `measured` read model. `flowStyleDeclarations` and `flowStyleText` serialize a style record with React DOM rules: camelCase becomes kebab-case and non-zero numbers gain `px` unless the property is unitless or custom. `flowNodeHandles(node)` returns the declared handles, or a default target and source handle (ids `target` and `source`) at `targetPosition` (top) and `sourcePosition` (bottom) when a node declares none but sets either; every core handle read (edge integrity, connections, measurement, renderer props, layout) uses it. `createFlowGraph` sizes a node from DOM measurements, then `measured`, then `size`.
- **Compatibility.** Decoding is stricter for these keys: a node or edge carrying, for example, `className: ['a']` used to decode with the key stripped and now fails. Flow is unpublished, so this break is accepted.
- **Edge fields.** `style`, `className`, `animated`, `labelStyle`, `labelShowBg`, `labelBgStyle`, `labelBgPadding` (`[x, y]`), `labelBgBorderRadius`, and marker configurations. `resolveFlowEdgeMarker` applies React `Marker` defaults (12.5 x 12.5, `strokeWidth` units, `auto-start-reverse`) and returns a DOM-safe id; `collectFlowEdgeMarkers` lists the unique markers of a set of edges. `FlowDefaultEdgeOptionsSchema` accepts the same presentation fields.
- **Persistence.** Documents with any presentation field or marker configuration save as `version: 3` (`SavedPresentationFlowDocumentSchema`, `SavedPresentationFlowSessionSchema`); others keep the v1 or v2 envelope byte for byte. The literal-v1 writer rejects presentation fields with `presentation-fields-require-versioned-session`. v1 and v2 readers strip presentation keys, as the frozen readers do. `selected` and `measured` are never saved.
- **Color mode.** `FlowColorModeSchema` (`light`, `dark`, `system`) and `resolveFlowColorMode(mode, prefersDark)`. `flowThemeTokens` lists every themable value with React's light and dark defaults. Hosts style with `flowThemeValue(name)`, which reads `--flow-<name>` and falls back to `--flow-<name>-default`; `flowThemeStylesheet(selector)` emits the defaults for `selector` and `selector.dark`.
- **Stacking.** `FlowZIndexModeSchema` and `computeFlowStacking({ nodes, edges, zIndexMode, elevateNodesOnSelect, elevateEdgesOnSelect })` return node and edge z-indices with React semantics: selected elevation by 1000, children above their parent, root sub-flow separation in `auto` mode, and edge elevation over child or selected endpoints.
- **Viewport options.** `FlowFitViewOptionsSchema` adds `includeHiddenNodes`, `minZoom`, `maxZoom` and `nodes: { id }[]` to the existing shorthands; `fitViewportToNodes` honours them and `resolveFitViewNodeIds` maps the `nodes` option. `CoordinateExtentSchema` is React's `[[minX, minY], [maxX, maxY]]`; `FlowExtentInputSchema` and `FlowSnapGridInputSchema` accept either the React tuple or the Flow record and decode to the record.
- **Panels and accessibility.** `FlowPanelPositionSchema` includes `center-left` and `center-right`; `flowPanelPlacement` returns React's classes and a 15px-margin inline placement. `defaultFlowAriaLabelConfig` holds React's keys and English defaults; `resolveFlowAriaLabelConfig(partial)` merges a localized override.
- **MiniMap.** `FlowMiniMapOptionsSchema` covers the serializable MiniMap props; `FlowMiniMapOptions` also accepts per-node functions for `nodeColor`, `nodeStrokeColor` and `nodeClassName`. `selectFlowMiniMapProjection({ ..., options })` now returns `FlowMiniMapNodeProps` per node (colour, fill fallback to `style.background`, stroke, class, radius, selection). `flowMiniMapPanViewport` and `flowMiniMapWheelZoom` are the XYMinimap pan and wheel formulas.
- **Resizer.** `FlowResizeParams`, `FlowResizeParamsWithDirection`, `FlowNodeResizeConstraintsSchema` (React defaults 10, 10, `Number.MAX_VALUE`, no aspect lock), `calculateFlowNodeResizerDimensions` (a port of `getDimensionsAfterResize`), and the session pair `startFlowNodeResize`/`stepFlowNodeResize`, which produce the `onResizeStart`, `shouldResize`/`onResize` and commit values. `calculateFlowExpandParent` ports `handleExpandParent`; `calculateFlowExpandParentDrag` adds React's drag-step clamp of the dragged child to `Math.max(0, …)`.

## Foldkit events, element changes and interaction switches

`@flow/foldkit` Runtimes publish React Flow style deltas on the `elementChanges` port (`{ nodes: NodeChange[], edges: EdgeChange[] }`), next to the unchanged `changes` port. Each delta set is derived with `flowChangeElementChanges` from the document the change was proposed against, so controlled owners can apply it before accepting: `document = applyFoldkitElementChanges(document, changes)` followed by `HostAction.ReplaceDocument({ document })`. Deltas describe semantic changes only: drags arrive as one `position` change on drop, and host document replacements publish none.

`GraphInteractionOptions` accept `nodesDraggable`, `nodesConnectable` and `elementsSelectable` (default `true`); `HostAction.SetInteractivity` changes them at runtime, and `createFoldkitInteractivity(runtime.ports, initial)` wraps that action with a getter. Element flags win (`draggable`, `selectable`, `connectable`, and handle `connectable`/`connectableStart`/`connectableEnd`). Handle buttons carry React's `connectable`, `connectablestart` and `connectableend` classes. A node that cannot be dragged does not block the pane: with `panOnDrag` a press on it pans. Node clicks still report when selection is off. `createFlowControls(owner, viewport, { interactivity })` starts its lock from the switches and sets all three together; disposing the controls leaves the switches as they are.

`GraphInteractionOptions.isValidConnection(connection, document)` runs for previews, pointer, click and keyboard connections and reconnections. `createProgram` registers it per Runtime outside the schema-checked model. When it is set it replaces the static `allowedConnectionTargets` list; without it the list applies as before.

The `connectionStates` port publishes React's `ConnectionState` while a pointer connection or reconnection runs and once when it ends; `createFoldkitConnectionObserver(runtime.ports.connectionStates)` returns `getConnection()` and `subscribeConnection(listener)`, the `useConnection` equivalent.

Foldkit interaction events are serializable records instead of DOM events. The canvas observer synchronously prevents the native menu for every context menu inside its canvas before sending messages, including when no subscriber is present. Applications need no extra cancellation option. Node, edge and pane mouse events (`onNodeClick`, `onNodeMouseEnter/Move/Leave`, `onEdgeClick`, `onEdgeMouse*`, `onPaneClick`, `onPaneMouse*`, and the new `onNodeContextMenu`, `onEdgeContextMenu` and `onPaneContextMenu`) carry `clientX`, `clientY`, `button`, `altKey`, `ctrlKey`, `metaKey` and `shiftKey`. Every canvas context menu also still reports `onSelectionContextMenu`. Node drag events carry `nodeIds`. `onConnectEnd` and `onReconnectEnd` carry the release `clientX`/`clientY` and a `connectionState` summary (`isValid`, `fromNodeId`, `fromHandleId`, `fromHandleType`, `toNodeId`, `toHandleId`, `toHandleType`); `isValid` is `null` when the gesture ended away from a handle. `onSelectionChange` reports the selected `nodeIds` and `edgeIds` whenever the accepted document's selection changes.

## Foldkit runtime canvas options and renderer geometry

`runtime.ports.actions.send(HostAction.SetCanvasOptions({ options }))` changes `snapToGrid`, `snapGrid`, `panOnDrag`, `selectionOnDrag`, `panOnScroll`, `panOnScrollSpeed`, `panOnScrollMode`, `zoomOnScroll`, `zoomOnDoubleClick`, and `onlyRenderVisibleElements`. The inbound port decodes the patch before dispatch. Omitted or undefined values retain the current setting. Snap grids accept `{ x, y }` or `[x, y]`; disabling snapping retains the grid. Patches preserve the active gesture, viewport, selection, and node elements. The next pointer or wheel event uses the new settings.

A `FoldkitRendererRegistry` can supply `handleAttributes(node, handle, h)`. It returns declarative attributes for the runtime-owned handle button on each render. Use `h.Style` for field-row offsets and attributes for application labels or test IDs. The runtime retains the connection messages, handle ID and side, and keyed node lifecycle. Existing nodes update without remounting. `createFoldkitNodeMeasurementObserver` measures the changed layout after resize or collapse.

`FoldkitEdgeGeometry.sourceNode` and `targetNode` are detached internal-node projections from the current render graph, including live drag and resize geometry and measured field handles. A custom renderer can recompute its path and pass it to `edgeInteraction(path)` so the built-in hit target uses that path. HTML labels continue through `edgeLabelRenderer(content)`. Marker definitions are ordinary Foldkit SVG views.

Foldkit instance `getInternalNode`, `getInternalNodes`, `getNode`, and `getNodes` share the view's preview projection for built-in pointer resize, held-key resize, and custom `NodeResizer` gestures. Accepted state remains unchanged before release, and Escape restores the accepted bounds. Current measurement generations and handle declarations remain authoritative. Schema Studio tests exercise changing field-edge geometry while a table is dragged or resized. `live-internal-node.e2e.ts` separately reads the public instance during held native inputs.

On macOS Chromium, a Control-click can arrive as a button-0 `contextmenu` without a click. When `Control` is configured in `multiSelectionKeyCode`, Foldkit applies the node selection toggle on that event and retains the existing context-menu notification and synchronous native-menu cancellation. A button-2 right-click retains its context-menu behavior. Keyboard movement announcements report the resulting absolute position after the move, as Vanilla does (`apps/vanilla/e2e/closing-options.e2e.ts:725`). This intentionally differs from React, which announces "New position" with the pre-move `internals.positionAbsolute` (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:148-159`), and supersedes the pre-move choice in Plan 096.
