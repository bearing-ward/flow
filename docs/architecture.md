# Runtime ownership for the first interaction slice

The measurement, viewport, and dragging traces support four separate state categories.

| State | Owner | Persistence |
| --- | --- | --- |
| Flow document, including node positions | Caller | Serializable |
| Viewport session | Core contract, host instance | Session only |
| Measured node geometry | Host-fed core runtime state | Rebuilt from DOM |
| Active pointer drag | Core transition functions, host instance | Gesture only |

The core accepts numbers and schema-derived values. It does not accept DOM elements or browser events. The vanilla host converts `ResizeObserverEntry` and `PointerEvent` values at the browser boundary.

The public `FlowChange` union currently contains `NodePositionChange`, `ViewportChange`, `EdgeAddChange`, `EdgeSelectionChange`, `EdgeReconnectChange`, and `EdgeRemoveChange`, `NodeSelectionChange`, and `SelectionSetChange`. They name final semantic state. Pointer events, wheel events, client coordinates, and element references do not cross the boundary.

The host applies transient node and viewport positions so interactions stay responsive. In uncontrolled mode it adopts the final change before notifying subscribers. In controlled mode it restores the last caller-supplied state until `update` or `updateViewport` acknowledges the change.

## Rejected alternatives

- Storing measured width and height on `FlowNode` would mix caller data with browser-derived geometry.
- Passing elements into the core would make the graph engine depend on the DOM and prevent non-browser tests.
- Emitting raw pointer events would force Foldkit and Vue callers to reproduce coordinate conversion and gesture rules.
- Copying xyflow's mutable lookup maps would preserve its adapter-store coupling instead of defining Flow's contract.
- Pan, zoom, snapping, extents, and auto-pan remain separate core calculations and host gestures. Each now has Flow browser coverage.

## Conformity and deviations

| Classification | Behavior | Reason and evidence boundary |
| --- | --- | --- |
| Conforms | Caller document stays separate from measured geometry. | Both reference adapters keep user nodes and internal measured nodes separate. Flow encodes the split in separate schemas and browser tests measurement. |
| Conforms | One observer measures all rendered nodes and disconnects with the host. | Both reference adapters share one observer per renderer. Flow's teardown test proves that the host runs its cleanup path. |
| Conforms | Nodes stay hidden until their first valid measurement. | Both reference node wrappers avoid displaying unmeasured nodes. Flow reveals each node in the observer callback. |
| Conforms | Screen-to-flow conversion subtracts viewport translation and divides by zoom. | Flow uses the same formula and unit-tests a round trip. |
| Deviates | Flow uses native pointer capture instead of d3-drag. | Browser tests cover single and selected-group pointer drags. |
| Deviates | Flow emits a final `node-position` or atomic `node-positions` change; the reference emits position changes during and after drag. | Final-only emission keeps the semantic contract bounded. The controlled keyboard and uncontrolled pointer paths are browser-tested. |
| Deviates | Flow's public node schema excludes framework style and DOM attribute fields. | Hosts own framework rendering. The core keeps serializable graph meaning independent of React, Svelte, Vue, and Foldkit. |
| Unverified | Exact reference parity for drag thresholds, snapping, and extents. | Flow browser tests cover the 8px threshold boundary, group and keyboard snapping, and constrained pan/zoom; the pinned reference was not run side by side. |

These classifications compare behavior and ownership. They do not claim pixel or API parity.

## Reusable vanilla controller

The vanilla adapter now fixes its ownership mode at mount:

- `controlled` keeps the last document supplied through `update` authoritative. A command or gesture emits a change, then the rendered node returns to that document until the caller acknowledges the change with `update`.
- `uncontrolled` applies a valid command or completed gesture to the controller-owned document before notifying subscribers.

Document and viewport ownership modes are independent. Both use the same schema-derived `FlowCommand` and `FlowChange` unions. `mountFlow` is the ordinary JavaScript boundary and decodes unknown documents, options, updates, viewport updates, and commands. `createFlowHost` is the native Effect program for already decoded inputs and application-supplied telemetry execution.

The DOM lookup is keyed by `NodeId`. Reconciliation creates resources for new identifiers, updates content and position in place, reorders existing elements, and releases listeners and observation for removed identifiers. Removing the active node cancels pointer capture before removal and does not publish a position change.

### Controller conformity and deviations

| Classification | Behavior | Reason and evidence boundary |
| --- | --- | --- |
| Conforms | Controlled changes require a caller-supplied document update; uncontrolled changes update owned state. | This preserves React's `nodes` versus `defaultNodes` ownership distinction. Browser tests prove both Flow modes. |
| Conforms | Node DOM identity and the shared observer survive keyed field updates and reordering. | React renders wrappers by `key={nodeId}` and Svelte uses a keyed each block. The conformance scenario marks and checks an existing element. |
| Conforms | Removing the active node aborts the gesture without a final position change. | The shared reference drag engine aborts when the active node disappears. Flow's browser test removes the node between pointer down and pointer up. |
| Deviates | Mode is explicit at mount rather than inferred from framework props or bindings. | A framework-neutral API cannot rely on React prop names or Svelte bindability. |
| Deviates | Controlled drag completion visibly restores the authoritative position until `update`. | The acknowledgement boundary is deterministic and does not assume a framework render cycle. |
| Deviates | The command vocabulary contains only `set-node-position` and `set-viewport`. | Edge selection and reconnection are also emitted by gestures; dimensions remain open. |

The reusable scenario lives in `apps/vanilla/e2e/controller-conformance.ts`. Future adapters should drive the same observable contract rather than copy the vanilla implementation.

## Scoped browser capabilities

`FlowBrowser` is an application-owned Effect service. It registers DOM listeners, owns resize observation, measures elements, and performs pointer capture. Core functions still receive only schema-derived graph values and numbers.

Each flow host owns a closeable Effect scope. Each node owns a child scope for its listeners. Node removal closes the child scope. Host destruction closes the host scope and releases the observer, every listener, subscriptions, and rendered DOM. `acquireFlowHost` connects the same cleanup to Effect completion, failure, and interruption.

One cohesive service won over separate event, measurement, and pointer services. Those capabilities share one DOM lifetime today. Splitting them now would add dependencies without hiding more behavior. The service can split when another adapter needs different implementations.

This design intentionally differs from the reference pan and zoom helper, which retains one observer until garbage collection. Flow closes every observer explicitly because `destroy` means the host lifetime has ended. The reference comparison and exact source paths are in `research/traces/browser-lifecycle.md`.

## Graph document integrity

`decodeFlowDocument` first decodes node and edge records with Effect Schema. It then calls `validateFlowDocument` in the same Effect workflow. The integrity step rejects duplicate node identifiers, duplicate edge identifiers, and edges whose source or target node is missing.

The structural schema and the cross-record validator stay separate. Schema decoding owns field shapes and branded identifiers. Domain validation owns relationships between records and returns schema-backed tagged errors. A successful validation returns the same document object.

This design intentionally differs from the reference. Its lookup maps replace earlier entries with the same identifier, and its renderers omit edges with missing endpoints. Flow rejects both cases before adapter state exists because a framework-neutral document must have one meaning. The source comparison is in `research/traces/document-integrity.md`.

## Interactive viewport ownership

The viewport has its own mount-time ownership mode, initial value, and schema-validated zoom limits. Primary-pointer movement on the pane applies a transient screen-pixel translation. Wheel input uses a d3-compatible exponential scale factor, clamps it to the configured limits, and preserves the flow coordinate below the cursor.

The core owns pure pan, clamp, and cursor-anchored zoom transitions. The vanilla host owns DOM events, pointer capture, the CSS transform, and cleanup. The browser suite proves uncontrolled pan and wheel input, controlled acknowledgement, mixed document and viewport ownership, limit clamping, and node-drag coordinate conversion through the current viewport.

### Viewport conformity and deviations

| Classification | Behavior | Reason and evidence boundary |
| --- | --- | --- |
| Conforms | Translation and scale are applied to one container around rendered nodes. | This matches both reference adapters, and the browser test asserts exact transform matrices. |
| Conforms | Viewport ownership is independent from document ownership. | React determines viewport control separately from node control. Flow proves a controlled document with an uncontrolled viewport. |
| Conforms | Wheel zoom preserves the cursor's flow coordinate and clamps minimum and maximum zoom. | Pure unit tests and native browser input cover the supported calculations. |
| Deviates | Flow uses native pointer and wheel events instead of d3-zoom. | This exposes the browser lifecycle and keeps the first adapter free of an interaction dependency. |
| Deviates | Pane pan emits only its final viewport change; wheel emits once per wheel event. | The first contract does not expose reference start, continuous move, and end callbacks. |
| Unverified | Mouse-button configuration, double-click zoom, and general animation. | Flow browser tests cover measured and unmeasured-node fit, translation extents, touch pan, fixed-midpoint pinch, and selection auto-pan. |

`fitView` derives bounds from document nodes, including nodes culled from the DOM, then publishes one viewport change. Measured dimensions take precedence; an optional caller fallback or the host's 150 by 44 initial size covers unmeasured nodes. Hidden nodes remain excluded. The result centers those bounds with fractional pane padding, zoom limits, and the optional pan extent. Browser tests cover all-node and selected-node fit before distant nodes mount; the development page exposes a Fit graph button.

## Handles and connections

`FlowNode.handles` contains optional, serializable declarations with a branded identifier, source or target kind, and a side. `FlowEdge` may name a source and target handle. Document integrity rejects repeated handle identifiers on one node and edge references to missing or wrong-kind handles. Nodes without handles retain their existing behavior.

The vanilla host renders declared handles but owns their DOM bounds. It converts the source handle center and pointer position to flow coordinates for an SVG gesture preview. The preview and active pointer identifier exist only for the host lifetime. Neither enters `FlowDocument`.

`validateFlowConnection` owns the source-to-target rule, membership checks, and duplicate endpoint-pair check. On success, the host allocates the next available `edge-N` identifier and publishes an `edge-add` change. An uncontrolled host adds the edge to its owned document before notifying listeners. A controlled host waits for `update` and can propose the same connection again until the caller acknowledges it. Browser tests cover both modes.

Strict source-to-target is the first contract. The reference defaults to strict but also offers loose mode, which accepts two handles of the same kind. A loose connection still needs a stable direction in Flow's document, so it remains a separate policy decision. Flow supports optional two-click connection and connection auto-pan. Native handle buttons also let a focused source start with Enter and a focused target finish with Space. Pointer gestures prefer the handle directly under the pointer, then select the nearest target within a configurable flow-unit radius scaled by zoom; click connections require an exact handle. A valid hover snaps the preview to the handle; an invalid hover stays at the pointer and receives visible feedback. After core validation, an optional caller callback can reject a new or reconnected edge. A persistent live status announces pending click connections and completion or cancellation, while focus returns to the source handle or canvas. Browser tests cover radius at two zoom levels, callback rejection and acceptance including reconnection and thrown callbacks, keyboard activation, announcements, and focus. Touch connection and exact reference parity remain unverified. The source paths and test boundaries are in `research/traces/handles-and-connections.md`, `research/traces/click-to-connect.md`, `research/traces/connection-auto-pan.md`, `research/traces/connection-radius.md`, `research/traces/connection-validators.md`, and `research/traces/keyboard-click-connect.md`.

## Persistent edge paths

The core resolves each edge's declared handles and calculates an SVG path from flow positions, measured handle bounds, and an optional path choice. An omitted choice keeps the existing straight path. `path: "bezier"` uses two side-directed cubic controls at the reference default curvature. `step` and `smoothstep` use orthogonal routing with 20-unit endpoint gaps and zero or five-unit corner radius. The host owns DOM measurements. It stores handle offsets separately from the serializable document and keeps one SVG path per edge identifier. Missing handles or measurements defer rendering; removing an edge removes its path.

During a drag, the host supplies a transient node position to edge reconciliation so the path follows the visible node. The existing controlled or uncontrolled document boundary still decides the final position. The edge SVG shares the viewport transform with nodes, so pan and zoom move them together without changing path coordinates. `research/traces/straight-edge-render.md`, `research/traces/bezier-edge-render.md`, and `research/traces/step-edge-render.md` record the reference paths and behavior limits.

## Edge labels, markers, selection, and reconnection

The edge document holds plain-text labels, arrow kinds, validated six-digit stroke color and positive width, and a selected flag. Core geometry computes label anchors for each built-in path. The browser host reconciles keyed SVG text, path groups, and instance-scoped marker definitions; labels and markers update without replacing the edge path. Markers are removed when unused.

A transparent interaction stroke defaults to 20 pixels and can be set per edge. `selectable`, `focusable`, `deletable`, and `reconnectable` flags constrain actions and focus. Reconnection can be enabled for only one endpoint. Pointer activation or `Enter`/space publishes `edge-selection`; `Escape` and pane activation clear selection. Selected state is authoritative in the document, so controlled mode waits for `update`. The host renders reconnect anchors above nodes for selected edges. A pointer gesture retains the opposite endpoint, validates the candidate against the document excluding the old edge, and publishes `edge-reconnect` with the original ID and metadata. Uncontrolled mode applies the replacement immediately. Invalid drops, cancellation, and removal leave the edge unchanged.

These are Flow browser and core tests, not a direct output comparison with xyflow. The reference and Flow boundaries are recorded in `research/traces/edge-label-render.md`, `research/traces/edge-markers-styling.md`, `research/traces/edge-selection-focus.md`, and `research/traces/edge-reconnection.md`.

## Edge deletion and accessibility

The core owns an `edge-remove` change and a transition that rejects missing or nondeletable edges. The host publishes it for `Delete` or `Backspace` on a focused selected edge. Uncontrolled mode removes the keyed SVG group, label, and unused marker immediately and moves focus to the canvas; controlled mode waits for a document update. The host does not delete connected nodes or invoke a before-delete callback.

The renderer gives selectable edges a button role and `aria-pressed`; nonselectable edges use an image role. `focusable: false` removes the edge from Tab order. Each edge can supply an accessible name; the default uses source and target node labels. Browser checks cover role, name, tab stop, keyboard actions, focus transfer, and a pointer click within a 42-pixel hit stroke. They do not establish screen-reader announcements or direct xyflow parity. See `research/traces/edge-deletion.md`, `research/traces/edge-interaction-options.md`, and `research/traces/edge-accessibility.md`.

## Visibility, stacking, and node activation

The graph document now carries node selection and edge visibility and stacking fields. `applyNodeSelectionChange` keeps one selected node and clears selected edges. The host owns pointer and keyboard focus, DOM attributes, and gesture handling.

Edge ordering is a pure core calculation from explicit `zIndex` and selected elevation. The vanilla renderer writes that order into keyed SVG groups and removes all output for hidden edges. The browser test confirms the explicit high-level edge is last in path-group order; overlap hit order and computed CSS z-index parity are not established.

Optional viewport culling uses a core rectangle calculation and measured node dimensions. The host retains measurement records when it removes offscreen DOM and promotes the endpoints of a visible edge. This keeps the document intact and lets nodes return after a viewport change. The browser test verifies a distant cluster leaves and re-enters the DOM. Browser tests now cover zoom, drag completion, and viewport return. Culling during active drags and performance at scale remain open test boundaries.

## Hidden nodes and multi-selection

`FlowNode.hidden` is document data. The vanilla host omits its DOM element and connected edge output, releases observation and cached handle measurements, and restores both after a document update. This follows Svelte's explicit hidden-endpoint edge rule; the pinned React path does not establish the same blanket rule.

`SelectionSetChange` atomically replaces selected node and edge IDs. The core rejects hidden or nonselectable targets. Modifier clicks toggle one ID while preserving the rest; a Shift pane drag displays a rectangle and commits selectable nodes plus their connected selectable edges. The mount option chooses full containment or positive partial overlap, with full as the API default. The development page opts into partial overlap. The core owns selection geometry; the host owns the temporary rectangle, pointer capture, and animation frame. When the pointer rests near an edge, the host pans the viewport while retaining the rectangle's origin in flow coordinates. It cancels the frame on release, cancellation, or destroy. Flow commits selection on pointer release; the reference updates it during movement. Browser tests cover partial overlap and viewport movement, while selection of newly revealed nodes and frame cancellation remain unverified in the browser.

Selected nodes share one `node-positions` semantic change for keyboard movement or group dragging. The host previews a selected group during a pointer drag and commits its positions together on release; controlled documents retain authority until `update`. Arrow keys move the focused selected group by 5 flow units, or 20 with Shift. The core computes both transitions. Browser tests cover the keyboard group, controlled keyboard acknowledgement, and uncontrolled pointer group drag. Controlled pointer group drag remains an open browser boundary.

An optional node extent constrains initial, externally controlled, pointer, and keyboard positions using measured node dimensions, with provisional zero dimensions before measurement. The host adopts bounded visual positions without changing caller document data. A selected group keeps one shared delta so its spacing survives a boundary hit. If a node or group is larger than the extent, core geometry centers it on that axis. See `research/traces/node-extents.md` for the reference difference and browser boundary.

The host switches a one-touch pane pan to a two-touch pinch when a second touch arrives. Core geometry preserves the flow point under the gesture midpoint while enforcing zoom limits. The browser test uses real CDP touch input and verifies one-touch translation plus pinch zoom and midpoint translation. The host releases both captures on pointer cancellation or destroy; those cleanup paths have not been asserted by a browser test. Direct output parity with xyflow's d3 zoom path remains unverified.
