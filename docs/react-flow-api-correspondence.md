# React Flow API correspondence

Captured 2026-09-26. This document is the curated correspondence matrix, not a parity claim. The complete API page/member inventory is [api-members.json](../research/catalogs/api-members.json), and `bun run scripts/check-api-members.ts` validates its page ownership, unique member keys, owner plans, source anchors, evidence links, and any complete claims. The dated sidebar catalog remains [react-flow-2026-09-26.json](../research/catalogs/react-flow-2026-09-26.json). Current website docs were checked 2026-09-28; the pinned source at research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/ is historical evidence for that revision only.

The member inventory contains 114 dated API capability pages and 2,692 normalized member, field, signature, generic, and variant records. Input captures include 727 current-site table rows, 1,826 recursively expanded pinned declaration records, and 129 component member rows; these source counts overlap and are deduplicated when normalized. The normalized records include 120 exact matches to the existing correspondence matrix, 499 other documented table members, 1,978 records sourced from pinned declarations, and 95 current-site records with no same-name pinned member match. Those 95 records may reflect upstream drift or differences in declaration shape; the inventory does not presume that each is a newly added upstream API. The capture metadata also identifies 255 rows whose source extraction joined the member name, type, prose, and possible default without retaining cell boundaries. They are labeled `Unparsed captured row` and preserve the original text in `rawSourceRow`; they are not presented as clean descriptions or guessed into fields. An exact name or page-level host status is not member behavior proof. Members without a direct host mapping remain explicitly unassessed and retain an owner plan and remaining decision. No compatibility percentage is derived from these counts.

The offline checker validates page URL coverage against the dated catalog, internal uniqueness/ownership/evidence rules, and consistency with the catalog's recorded counts. It does not re-fetch current pages or prove member-level exhaustiveness, and it does not semantically validate implementation claims. The 727/255 capture counts are metadata about this capture, not an independently reproduced completeness assertion.

The inventory records source revision and check dates separately. It preserves the current-site `DeleteElements` callable contract versus the pinned `DeleteElementsOptions` shape and the current `ReactFlowInstance.fitView` member versus the pinned declaration. The utility and hook pages were directly checked against current site pages; structural HTML capture records documented tables and anchors, while code-only type members are enumerated from their pinned declarations. The live site and pinned source are not treated as interchangeable.

For each row, J means JavaScript, V means Vue, and F means Foldkit. Shared local evidence: core schema is packages/core/src/domain/flow.schema.ts:48-141; vanilla controller is apps/vanilla/src/mount-flow.ts:424-476,6051-6124; Vue props/setup are packages/vue/src/flow-canvas.ts:159-315 and composable is packages/vue/src/use-flow.ts:7-90; Foldkit model/selectors are packages/foldkit/src/graph.ts:37-145 and typed ports/runtime composition are packages/foldkit/src/application.ts:34-71,221-255. Full state decisions and separate production/test traces are in research/traces/public-state-contract.md.

## ReactFlow props

Source: [current ReactFlow props](https://reactflow.dev/api-reference/react-flow). The table enumerates current props relevant to state, rendering, viewport, selection, interaction, callbacks, and lifecycle. Each member has separate per-host correspondence/gap. Other catalog members are explicitly unassessed below.

| Member | Core | J | V | F | Ownership, evidence, follow-up |
| --- | --- | --- | --- | --- | --- |
| nodes | FlowDocument.nodes | document input/update | document/split nodes prop | initial/replace document | Host owns controlled/uncontrolled state; reads Plan 047-049. |
| edges | FlowDocument.edges | document input/update | document/split edges prop | initial/replace document | Host state; reads Plan 047-049. |
| defaultNodes | document initialization | mount document | defaultDocument only | initial Model | Host init; API shape differs, later adapter mapping. |
| defaultEdges | document initialization | mount document | defaultDocument only | initial Model | Host init; API shape differs, later adapter mapping. |
| viewport | ViewportSchema | updateViewport | controlled viewport prop | ReplaceViewport + selectViewport | Host accepted state; typed snapshot requests expose current viewport. |
| defaultViewport | initial ViewportSchema | mount options | defaultViewport prop | createProgram arg | Host initialization. |
| onViewportChange | ViewportChange proposal | `onViewport` callback + accepted-state subscription | `update:viewport` and local start/change/end emits | typed `viewportEvents` port | Movement observations are separate from accepted-state events; controlled proposals do not imply owner acknowledgement. See `research/traces/public-viewport-contract.md`. |
| fitView | `fitViewportToNodes` | Promise operation | Promise operation | request/result client operation | All hosts support all/selected/id selection, measured dimensions, zoom limits, padding, terminal status, and optional animation; exact React option compatibility remains partial. |
| fitViewOptions | operation options schema | padding, node selection, duration/easing | padding, node selection, duration/easing | padding, node selection, duration/easing | Hidden-node inclusion and upstream initialization prop are not mapped. |
| minZoom | `ViewportLimitsSchema` | mount option | `viewportLimits` prop | program configuration | Host limits now feed operation math; defaults intentionally differ by host. |
| maxZoom | `ViewportLimitsSchema` | mount option | `viewportLimits` prop | program configuration | Host limits now feed operation math; defaults intentionally differ by host. |
| translateExtent / pan extent | `PanExtentSchema` + `constrainViewportToExtent` | preserve finite extent constraint on programmatic targets | intentional gap | intentional gap | Chosen policy preserves existing Vanilla behavior and adds no Vue/Foldkit option. Core math is unit-tested; Vanilla host enforcement through viewport operations, Vue/Foldkit behavior, and the upstream extent cell remain unverified. |
| width | no graph field | mount root CSS/layout | canvas layout | container layout | Host DOM/layout ownership; unassessed. |
| height | no graph field | mount root CSS/layout | canvas layout | container layout | Host DOM/layout ownership; unassessed. |
| nodeTypes | node.type only | nodeRenderers | renderer registration | view renderer registry | Host rendering; names differ. |
| edgeTypes | edge.type only | edgeRenderers | renderer registration | view renderer registry | Host rendering; names differ. |
| colorMode | gap | gap | gap | gap | Host theming; unassessed. |
| debug | gap | structured telemetry, not equivalent | gap | gap | Host observability; not equivalent. |
| ariaLabelConfig | individual ARIA fields only | partial labels | partial labels | partial labels | Host accessibility/localization; global config gap. |
| nodeOrigin | gap | gap | gap | gap | Core coordinate convention; no prop equivalence. |
| nodeDragThreshold | validated raw client-distance threshold | mount option | nodeDragThreshold prop | interactionOptions.nodeDragThreshold | Shared default 1, finite nonnegative values, checked zero activation and strict crossing. Plan099 feature proof passes across hosts; full reference parity remains unverified. |
| connectionDragThreshold | Schema and strict client-distance predicate | mount option | prop | graph initialization option | Default 1, zero activates on down, positive movement must strictly exceed the threshold. Dedicated feature proof passed across hosts; mounted reference comparison and packed consumer compatibility remain unverified. See Plan 098. |
| paneClickDistance | gap | gap | gap | gap | Host interaction config; unassessed. |
| nodeClickDistance | gap | gap | gap | gap | Host interaction config; unassessed. |
| proOptions | gap | gap | gap | gap | Product/licensing/attribution policy; unassessed. |
| snapToGrid | SnapGrid helpers | host option | gap | gap | Core math exists; adapter API mapping open. |
| snapGrid | SnapGridSchema | host option | gap | gap | Core value; adapter API mapping open. |
| onlyRenderVisibleElements | visibility projection | renderOnlyVisible | renderOnlyVisible | view culling | Host render projection; accepted reads include culled items. |
| translateExtent | PanExtentSchema | option | gap | gap | Core constraint helper; Vue/Foldkit option gap. |
| nodeExtent | node extent helpers | option | gap | gap | Core constraint helper; Vue/Foldkit option gap. |
| preventScrolling | gap | gap | gap | gap | Host DOM event policy; unassessed. |
| attributionPosition | gap | gap | gap | gap | Host UI; unassessed. |
| elevateEdgesOnSelect | Edge.zIndex only | partial render order | gap | gap | Host render policy; not equivalent to schema field. |
| defaultMarkerColor | marker kind only | renderer style partial | gap | gap | Host rendering; color prop gap. |
| defaultEdgeOptions | schema-backed FlowEdge subset | schema-backed FlowEdge subset | schema-backed FlowEdge subset | Supported defaults fill missing fields on new edges; stored explicit fields override defaults at render. Vue updates when the prop changes. Tests do not establish overlap precedence on creation. ID/endpoints/handles/selection and React `style`/custom marker fields are excluded. |
| reconnectRadius | ConnectionRadiusSchema | option | gap | gap | Core radius math; option mapping incomplete. |
| edgesReconnectable | Edge.reconnectable | host option | gap | gap | Host interaction plus per-edge core field; config gap. |
| autoPanOnNodeFocus | viewport pan on focus | host option | gap | app focus behavior | Host lifecycle; focus-triggered viewport behavior unverified. |
| nodesDraggable | FlowNode.draggable | global host option | canvas/per-node | model/app interaction | Core flag + host policy; precedence needs tests. |
| nodesConnectable | handles/connection model | `nodesConnectable` host option | per-node `connectable` policy; no canvas prop | allowed-target policy; no canvas prop | Vanilla canvas toggle exists; Vue/Foldkit canvas-wide mapping remains open. |
| nodesFocusable | FlowNode.focusable | host option | canvas/node behavior | app interaction | Core flag + host accessibility. |
| edgesFocusable | FlowEdge.focusable | partial DOM behavior | partial DOM behavior | partial DOM behavior | Core field exists; exact host behavior unverified. |
| elementsSelectable | node/edge selectable flags | host option | canvas option | app interaction | Core flags + host policy; precedence open. |
| autoPanOnConnect | connection/viewport ops | mount option | prop, default `true` | program option, default `true` | Active-gesture auto-pan and stopping on terminal/cancel are exercised in production browser cases for all three hosts; default/disabled matrix remains incomplete. |
| autoPanOnNodeDrag | drag/viewport ops | host option | partial | partial | Host lifecycle; option semantics unverified. |
| autoPanOnSelection | selection/viewport ops | host option | gap | gap | Host lifecycle; unassessed. |
| autoPanSpeed | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| panOnDrag | viewport pan session | boolean or mouse-button array | boolean primary-button prop; no button array | boolean interaction option; no button array | Button-array configuration is absent in Vue and Foldkit. |
| selectionOnDrag | selection rectangle | host option | canvas option | canvas option | Host lifecycle; modifier semantics open. |
| selectionMode | selection geometry | mount option | prop | program configuration | Full/partial pointer selection and Vue/Foldkit keyboard rectangle selection are exercised through production host suites. |
| panOnScroll | viewport pan command | host option | canvas option | canvas option | Host lifecycle; exact config unverified. |
| panOnScrollSpeed | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| panOnScrollMode | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| zoomOnScroll | viewport zoom operation | host option | canvas option | canvas option | Host lifecycle; exact config unverified. |
| zoomOnPinch | pinch session/zoom | option is declared; execution not established | no prop | no option | Native pinch and trusted multi-pointer behavior remain unverified for 060; Vue/Foldkit have no pinch option. |
| zoomOnDoubleClick | viewport zoom command | host option | canvas option | gap | Host lifecycle; Vue gap. |
| selectNodesOnDrag | node selection change | option; enabled unless false | prop; default false | no option | Vue's default false preserves existing shared conformance semantics; explicit Vue true is tested. These defaults are intentionally host-specific, not parity. Foldkit exposes no option. |
| elevateNodesOnSelect | node.zIndex | render behavior | gap | app rendering | Host render policy; order equivalence unverified. |
| connectOnClick | click-connection session | configurable mount option | Boolean prop | program option | Each adapter can toggle click connection; callback event names/payloads differ. |
| connectionMode | handle kind/validation | mount option | prop, default `strict` | program option, default `strict` | Strict/loose production cases retain the historical fixture separately; current named target-target gestures use initiating-target direction. Physical-ID rendering is an intentional native Flow rendering difference from pinned renderer008. |
| zIndexMode | node/edge zIndex | host z-order | gap | gap | Host rendering policy; unassessed. |
| connectionLineStyle | gap | renderer style option | gap | gap | Host rendering; unassessed. |
| connectionLineType | FlowEdgePathSchema | connection option | partial | partial | Host renderer; path semantics need validation. |
| connectionRadius | ConnectionRadiusSchema | mount option, default 20 CSS px | prop, default 20 CSS px | program option, default 20 CSS px | All Flow hosts keep the radius fixed in screen-space CSS pixels at every zoom; Vue and Foldkit convert into graph coordinates. Pinned xyflow uses renderer/flow units, so its effective screen radius scales with zoom. Near/far and zoom cases are production-tested; Vanilla/Vue direct-hit priority is tested, while Foldkit does not yet establish oversized direct-hit priority. Exact browser boundary coverage remains open. |
| connectionLineComponent / custom connection preview | schema-derived preview state | optional SVG callback | optional Vue component | optional Foldkit renderer registry entry | Production lifecycle tests cover candidate/validity state and success/cancel/unmount cleanup; host APIs intentionally differ. |
| connectionLineContainerStyle | gap | gap | gap | gap | Host DOM style; unassessed. |
| deleteKeyCode | delete commands | keyboard option | partial | partial | Host keyboard lifecycle; syntax/equivalence open. |
| selectionKeyCode | selection commands | keyboard option | partial | partial | Host keyboard lifecycle; equivalence open. |
| multiSelectionKeyCode | selection-set change | keyboard option | partial | partial | Host keyboard lifecycle; equivalence open. |
| zoomActivationKeyCode | viewport commands | no key-code option | prop | no key-code option; `keyboardActivation` is Boolean | Foldkit's Boolean activation does not encode a key; exact key-code mapping remains open. |
| panActivationKeyCode | viewport commands | modifier option, not key-code prop | prop | no key-code option; `keyboardActivation` is Boolean | The Foldkit Boolean does not encode a key; exact key-code mapping remains open. |
| disableKeyboardA11y | gap | gap | gap | gap | Host accessibility policy; unassessed. |
| noPanClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| noDragClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| noWheelClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| onNodesChange | FlowChange subset | subscribe | change event | SemanticChange port | Proposal API; per-variant mapping open. |
| onEdgesChange | FlowChange subset | subscribe | change event | SemanticChange port | Proposal API; per-variant mapping open. |
| onMoveStart | viewport session start | native host callback | `moveStart` emit | serialized `interactionEvents` record for input gestures; programmatic viewport operations use `viewportEvents` instead | Vue/Foldkit event payloads are decoded values, not native DOM events. |
| onMove | viewport proposal | native host callback | `move` emit | serialized `interactionEvents` record for input gestures; programmatic changes use `viewportEvents` | Foldkit viewport event schema does not encode controlled proposal/acknowledgement status. |
| onMoveEnd | viewport session end | native host callback | `moveEnd` emit | serialized `interactionEvents` record for input gestures; programmatic operations use `viewportEvents` | Preserve separate event and accepted-state boundaries. |
| onPaneClick | no core callback | native host callback | decoded `paneClick` emit | serialized `onPaneClick` port record | Payload ownership differs by host; Foldkit record carries decoded IDs/coordinates, no DOM event. |
| onPaneDoubleClick | no core callback | native host callback | no emit in FlowCanvas | no record in lifecycle schema | Vue/Foldkit callback gap. |
| onPaneContextMenu | no core callback | native host callback | decoded `paneContextMenu` emit | no record in lifecycle schema | Foldkit context menu callback gap. |
| onPaneScroll | no core callback | native host callback | decoded `paneScroll` emit | wheel viewport behavior only | Gesture callback remains host-specific. |
| onPaneMouseMove | no core callback | native host callback | decoded `paneMouseMove` emit | serialized `onPaneMouseMove` | Foldkit record carries decoded values, not native event. |
| onPaneMouseEnter | no core callback | native host callback | decoded `paneMouseEnter` emit | serialized `onPaneMouseEnter` | Foldkit record carries decoded values, not native event. |
| onPaneMouseLeave | no core callback | native host callback | decoded `paneMouseLeave` emit | serialized `onPaneMouseLeave` | Foldkit record carries decoded values, not native event. |
| onNodeDragStart | node drag session start | native host callback | decoded `nodeDragStart` emit | serialized `onNodeDragStart` record | Foldkit port has no DOM event; lifecycle callback ordering still has unverified cases. |
| onNodeDrag | node-position proposal/preview | native host callback | decoded `nodeDrag` emit | serialized `onNodeDrag` record | Preview/proposal payload shape differs by host. |
| onNodeDragStop | node drag finish | native host callback | `nodeDragStop` and `nodeDragEnd` emits | serialized `onNodeDragStop` record | Exactly-once behavior is covered only by listed scenarios. |
| onConnectStart | connection session start | native callback with `inputKind: pointer-connect or click-connect` | decoded `connectStart` emit with activation kind | serialized `onConnectStart`; input kind is pointer, click, or keyboard | Foldkit uses the shared operation name, tags click activation with `inputKind: click`, and carries no DOM event. |
| onConnect | edge-add proposal | native host callback | decoded `connect` emit | serialized proposal record | Controlled acceptance is distinct from proposal. |
| onConnectEnd | connection finish/cancel | native callback with `inputKind: pointer-connect or click-connect` | decoded `connectEnd` emit | serialized `onConnectEnd` record | Vanilla keyboard reconnection is unsupported; native capture remains unverified. |
| onClickConnectStart | click-connection session start | `onConnectStart` with `inputKind: 'click-connect'` | `clickConnectStart` emit (alongside `connectStart`) | shared serialized `onConnectStart` record tagged `inputKind: click`; no click-specific callback | Host activation naming and payloads differ. |
| onClickConnectEnd | click-connection session finish | `onConnectEnd` with `inputKind: 'click-connect'` | `clickConnectEnd` emit (alongside `connectEnd`) | shared serialized `onConnectEnd` record tagged `inputKind: click`; no click-specific callback | Do not infer callback alias parity from the common lifecycle record. |
| onReconnectStart | reconnection session start | native host callback | decoded `reconnectStart` emit | serialized `onReconnectStart` record | Foldkit port is serializable and omits DOM events. |
| onReconnect | edge-reconnect proposal | native host callback | decoded `reconnect` emit | serialized proposal record | Acceptance/status is host-specific. |
| onReconnectEnd | reconnection session finish | native host callback | decoded `reconnectEnd` emit | serialized `onReconnectEnd` record | Per-operation/reason cross-product remains unverified. |
| onSelectionChange | selection change | subscribe | change emit | change port | Semantic proposal exists; scheduling differs. |
| onSelectionContextMenu | no core callback | native host callback | decoded `selectionContextMenu` emit | serialized `onSelectionContextMenu` record | Menu coordinates are host-decoded values in Vue/Foldkit. |
| onSelectionStart | selection session start | native host callback | decoded `selectionStart` emit | serialized `onSelectionStart` record | Native events are retained only at Vanilla boundary; other hosts emit values. |
| onSelectionEnd | selection session end | native host callback | decoded `selectionEnd` emit | serialized `onSelectionEnd` record | Listed fixed cases do not establish every terminal ordering. |
| onSelectionDragStart | selection preview start | native host callback | `selectionDragStart` emit | serialized start phase under `onSelectionStart` | Names and payloads are adapter-specific, not parity. |
| onSelectionDrag | selection preview | native host callback | decoded `selectionProgress` / `selectionDrag` emits | serialized `onSelectionDrag` record | Preview lifecycle is observable in fixed scenarios. |
| onSelectionDragStop | selection preview finish | native host callback | `selectionEnd` / `selectionDragStop` emits | serialized end phase under `onSelectionEnd` | Exact callback alias/order equivalence remains open. |
| [onBeforeDelete](https://reactflow.dev/api-reference/react-flow#onbeforedelete) | [FlowDeleteLifecycle.onBeforeDelete](../packages/core/src/domain/flow-delete.schema.ts#L45-L50), invoked by `controller.deleteElements` | `deleteElements(..., { onBeforeDelete })`; async callback receives a cloned eligible candidate and returns a boolean or narrowed candidate | `useFlow().deleteElements(..., { onBeforeDelete })`; async callback receives a cloned eligible candidate and returns a boolean or narrowed candidate | host-local `createFoldkitDeleteClient(..., beforeDelete)` receives typed request/candidate and abort signal; callback function stays outside Runtime ports | Partial member mapping. All run approval before delete callbacks; controlled owner state changes only after acknowledgement. React returns a promise of a boolean or candidate; Flow returns `FlowDeleteDecision` (boolean or Flow candidate). Source error boundaries differ: Vanilla/Vue reject through Flow deletion approval errors; Foldkit sends a typed failed response. The linked production cases cover candidate selection, controlled proposals, and lifecycle callback errors, but do not compare pre-delete rejection delivery against React. React callback scheduling and full generic payload parity remain unverified. Production paths/tests and pinned references: [deletion trace](../research/traces/public-api-completion.md#wp5-fixed-utility-and-async-delete-reference-comparison). |
| [onDelete](https://reactflow.dev/api-reference/react-flow#ondelete) | combined deletion candidate callback | `deleteElements` lifecycle callback receives the final candidate after edge/node callbacks | `useFlow().deleteElements` lifecycle callback receives the final candidate after edge/node callbacks | host-local delete client invokes `onDelete` with the final deleted candidate after the Runtime result | Partial host-native mapping. All three order callbacks edge → node → combined; in controlled mode they describe a proposal until owner acknowledgement. Vanilla/Vue callback throws reject publication; Foldkit reports via `onCallbackError` and settles the result. React change-callback interleaving remains unverified. Source/tests: Vanilla `apps/vanilla/src/mount-flow.ts:9328-9353`, `apps/vanilla/e2e/public-edits.e2e.ts:216-350,349-500,662-744`; Vue `packages/vue/src/use-flow.ts:643-710`, `apps/vue/e2e/public-edits.e2e.ts:66-126,128-157,159-184`; Foldkit `packages/foldkit/src/delete-approval.ts:311-386`, `apps/foldkit/e2e/delete-approval.e2e.ts:298-401,443-542,795-838`. |
| [onNodesDelete](https://reactflow.dev/api-reference/react-flow#onnodesdelete) | node deletion callback | `deleteElements` lifecycle callback receives deleted nodes when the candidate includes nodes | `useFlow().deleteElements` lifecycle callback receives deleted nodes when the candidate includes nodes | host-local delete client invokes `onNodesDelete` with final deleted nodes after the Runtime result | Partial host-native mapping. Node payloads and ordering are exercised, but Flow callback payloads use FlowNode rather than caller-generic React Node. Controlled callbacks still describe a proposal; Vanilla/Vue errors reject publication, while Foldkit reports callback errors and settles. React change-callback interleaving remains unverified. Source/test paths are listed in the adjacent `onDelete` row. |
| [onEdgesDelete](https://reactflow.dev/api-reference/react-flow#onedgesdelete) | edge deletion callback | `deleteElements` lifecycle callback receives deleted edges when the candidate includes edges | `useFlow().deleteElements` lifecycle callback receives deleted edges when the candidate includes edges | host-local delete client invokes `onEdgesDelete` with final deleted edges after the Runtime result | Partial host-native mapping. Edge payloads and ordering are exercised, but Flow callback payloads use FlowEdge rather than caller-generic React Edge. Controlled callbacks still describe a proposal; Vanilla/Vue errors reject publication, while Foldkit reports callback errors and settles. React change-callback interleaving remains unverified. Source/test paths are listed in the adjacent `onDelete` row. |
| onError | error boundary | host callback | `error` emit for connection-validator boundary | serialized `onError` record for edit failure only | Vue boundary is limited to validator errors; Foldkit currently reports edit failures only. Effect defects are not ordinary errors. |
| onInit | host initialization | native callback with controller | `init` emit with FlowEditor | serialized `onInit` record | Host handles differ; Foldkit emits through its event port. |
| onNodeClick | no core callback | native host callback | decoded `nodeClick` emit | serialized `onNodeClick` | Selection/focus and event observation are separate. |
| onNodeDoubleClick | no core callback | native host callback | decoded `nodeDoubleClick` emit | no record in lifecycle schema | Foldkit callback gap. |
| onNodeMouseEnter | no core callback | native host callback | decoded `nodeMouseEnter` emit | serialized `onNodeMouseEnter` | Foldkit record carries decoded values, not native event. |
| onNodeMouseMove | no core callback | native host callback | decoded `nodeMouseMove` emit | serialized `onNodeMouseMove` | High frequency; telemetry remains separate. |
| onNodeMouseLeave | no core callback | native host callback | decoded `nodeMouseLeave` emit | serialized `onNodeMouseLeave` | Foldkit record carries decoded values, not native event. |
| onNodeContextMenu | no core callback | native host callback | decoded `nodeContextMenu` emit | no record in lifecycle schema | Foldkit callback gap. |
| onEdgeClick | no core callback | native host callback | decoded `edgeClick` emit | serialized `onEdgeClick` | Selection and event observation are separate. |
| onEdgeDoubleClick | no core callback | native host callback | decoded `edgeDoubleClick` emit | no record in lifecycle schema | Foldkit callback gap. |
| onEdgeMouseEnter | no core callback | native host callback | decoded `edgeMouseEnter` emit | serialized `onEdgeMouseEnter` | Foldkit record carries decoded values, not native event. |
| onEdgeMouseMove | no core callback | native host callback | decoded `edgeMouseMove` emit | serialized `onEdgeMouseMove` | High frequency; telemetry remains separate. |
| onEdgeMouseLeave | no core callback | native host callback | decoded `edgeMouseLeave` emit | serialized `onEdgeMouseLeave` | Foldkit record carries decoded values, not native event. |
| onEdgeContextMenu | no core callback | native host callback | decoded `edgeContextMenu` emit | no record in lifecycle schema | Foldkit callback gap. |
| ...props (HTML div attributes) | none | mount root attributes | canvas root props | container props | Host DOM ownership; unassessed. |

## Gesture ownership and fixed scenarios

The interaction rows above are assigned to these work packages and host scenarios. A listed test is a planned acceptance boundary; existing characterization is not evidence for another host. The shared event ordering below is the contract for new lifecycle tests.

Vue's `isValidConnection` now receives the complete `FlowConnection` candidate, matching Vanilla and the core validator. Callers that used the old Vue-only target-ID argument must read `candidate.target`; Foldkit continues to express allowed targets as caller policy and validates the complete candidate in core. Connection limits belong in caller policy built on public connection queries, not in the core document rules.

| Family | Work package | Vanilla scenario | Vue scenario | Foldkit scenario |
| --- | --- | --- | --- | --- |
| Pane, node, and edge pointer callbacks | 1, 4 | `gesture-options.e2e.ts: pointer UI callbacks` | `FlowCanvas` emits are declared; current interaction suite does not assert their ordering | `interaction-lifecycle.e2e.ts: serialized pointer event records` |
| Node drag, group drag, custom drag handle, keyboard move | 3, 4 | `interaction-lifecycle.e2e.ts: movement` plus `movement-slices.e2e.ts` | `interaction-lifecycle.e2e.ts: movement` | `interaction-lifecycle.e2e.ts: movement` |
| Rectangle selection, full/partial mode, selection callbacks | 1, 3, 4 | `interaction-lifecycle.e2e.ts: selection` | `interaction-lifecycle.e2e.ts: selection` | `interaction-lifecycle.e2e.ts: selection` |
| Pointer/touch/click/keyboard connect, strict/loose, validation, radius, auto-pan, preview | 2, 4, 5 | `interaction-lifecycle.e2e.ts: connect` plus `advanced-gestures.e2e.ts` | `interaction-lifecycle.e2e.ts: connect` | `interaction-lifecycle.e2e.ts: connect` |
| Reconnect and dynamic handle replacement | 2, 4, 5 | `interaction-lifecycle.e2e.ts: reconnect` plus `validator-followups.e2e.ts` | `interaction-lifecycle.e2e.ts: reconnect` | `interaction-lifecycle.e2e.ts: reconnect` |
| Eight resize directions, hierarchy, constraints, keyboard | 3, 4, 5 | `interaction-lifecycle.e2e.ts: resize` plus `advanced-gestures.e2e.ts` | `interaction-lifecycle.e2e.ts: resize` | `interaction-lifecycle.e2e.ts: resize` |
| Wheel/key activation and input exclusions | 1, 3 | `interaction-lifecycle.e2e.ts: input-ownership` plus `gesture-options.e2e.ts` | `interaction-lifecycle.e2e.ts: input-ownership` | `interaction-lifecycle.e2e.ts: input-ownership` |
| Escape, blur, pointercancel, capture loss, removal, config replacement, unmount | 4 | `interaction-lifecycle.e2e.ts: cancellation` plus `advanced-gestures.e2e.ts` | `interaction-lifecycle.e2e.ts: cancellation` | `interaction-lifecycle.e2e.ts: cancellation` |

The first matrix is the target scenario assignment for every family. Its shorthand labels name intended cases; they do not assert that every case exists in each host today. The current host evidence table below identifies implemented and unverified cells.

The observed change lifecycle starts with a transient preview after its activation threshold. A valid terminal input forms a semantic proposal; uncontrolled ownership accepts it, while controlled ownership waits for the owner's acknowledgement. Accepted-state notifications follow acceptance. Cancellation removes transient preview state and emits neither a semantic proposal nor an accepted-state change. This describes the tested change/accepted-state boundary; it does not claim every host exposes the React Flow terminal callback family. Framework callbacks may receive native events at the adapter boundary, while core schemas and Foldkit messages contain decoded IDs, coordinates, and lifecycle discriminants only.

Input callback families (pane/node/edge click, context menu, enter/leave, move; drag/selection/connect/reconnect start/move/end) are host callbacks, not serializable graph changes. High-frequency move callbacks remain distinct from structured telemetry and must not generate per-move logs. Native capture behavior remains separately unverified where Playwright cannot synthesize trusted capture.

### Current host evidence and unsupported cells

| Family | Vanilla | Vue | Foldkit |
| --- | --- | --- | --- |
| Node and group movement | Pointer, nested group and keyboard movement; `movement-slices.e2e.ts`, `advanced-gestures.e2e.ts`, and `interaction-lifecycle.e2e.ts` | Pointer nested movement and keyboard single-node movement; lifecycle suite | Pointer nested movement; lifecycle and shared conformance suites |
| Rectangle selection | Full/partial pointer selection and cancellation; `movement-slices.e2e.ts`, `advanced-gestures.e2e.ts`, and lifecycle suite | Full/partial pointer selection and keyboard rectangle preview/cancel/accept; lifecycle suite | Full/partial pointer selection and keyboard rectangle selection; lifecycle suite |
| Eight-direction resize and keyboard resize | Pointer and keyboard directions, constraints, cancellation, nested child compensation; `advanced-gestures.e2e.ts` | Pointer all directions, controlled proposal, accepted geometry, cancellation, nested child compensation, focused keyboard resize, and grouped/repeated 10px proposal with Escape rollback and one keyup commit; lifecycle suite | Pointer all directions, controlled proposal, accepted geometry, cancellation, nested child compensation, and grouped/repeated keyboard resize with Escape rollback and one keyup commit; lifecycle suite |
| Connection and reconnection | Pointer/click/keyboard activation, strict/loose mode, validation, radius, auto-pan, reconnect with active dynamic-handle replacement, custom preview callback; advanced, validator, and lifecycle suites | Pointer and keyboard connect/reconnect, full-candidate validation, strict/loose mode, radius, auto-pan, controlled/uncontrolled outcomes, dynamic handle replacement, custom preview component, and synthetic touch connection; lifecycle suite | Pointer and keyboard connect/reconnect, strict/loose mode, radius, auto-pan, controlled/uncontrolled outcomes, dynamic handle replacement, custom renderer, and synthetic touch connection; lifecycle suite |
| Cancellation and host isolation | Shared cancellation reasons drive connection retries; selected reconnect/resize/selection cancellation cases and two-host isolation are tested. Native capture remains unverified. | Shared connection/reconnect/resize/selection cancellation cases are tested, including keyboard-resize blur and owner-node removal with retry. Full callback-order matrix is unverified. | Shared connection/reconnect/resize/selection cancellation cases are tested, including keyboard-resize blur and owner-document removal with retry. Full callback-order matrix is unverified. |
| Native input ownership | Six native controls and both no-drag spellings are checked for pointer/key/wheel ownership; active-gesture combinations are not part of this fixed scenario. | Six native controls and both no-drag spellings are checked for pointer/key/wheel ownership; Escape and wheel are also checked during an active connection preview for the six controls. | Six native controls and both no-drag spellings are checked for pointer/key/wheel ownership; Escape and wheel are also checked during an active connection preview for all eight targets. |
| Lifecycle callbacks/records | Native callback tests assert selected drag, connect, selection, and pointer UI sequences; keyboard reconnect is unsupported | `activation-callbacks.e2e.ts` asserts click-connect/reconnect change → adoption → terminal, drag and pointer-selection ordering, and uncontrolled keyboard-selection change → adoption → terminal | Typed serialized port tests assert `onInit`, accepted/rejected connection ordering, click `inputKind`, and selected pane/node/edge events; no native event payloads |

The three hosts have production evidence for their implemented pointer selection and resize paths, and Vue/Foldkit have production connection/reconnection and focused keyboard connection/resize coverage. Vue's new E2E asserts click-connect and reconnect ordering, drag and pointer rectangle-selection terminals, and uncontrolled keyboard rectangle-selection ordering. Remaining cells include the full operation/reason lifecycle cross-product, Foldkit's omitted callback kinds and controlled viewport event status, the full input-option matrix, Vanilla keyboard reconnection, and trusted native pointer/touch capture. These stay explicit gaps; a host-specific pass does not imply parity for another host.

### Plan 056 input and event-order evidence matrix

This is a bounded set of meaningful option combinations, not the Cartesian product of every React Flow option. “Tested” means a production adapter scenario asserts the resulting proposal, accepted state, DOM preview, or resource cleanup. An absent host option is recorded as a gap; a fixed default is not treated as equivalent configuration.

| Input/option boundary | Vanilla | Vue | Foldkit | Remaining evidence |
| --- | --- | --- | --- | --- |
| Pointer connection, strict and loose endpoint kinds | Production lifecycle fixture; strict and loose cases | Production lifecycle fixture; strict and loose cases | Production lifecycle fixture; strict and loose cases | Current target-target acceptance is a separate native expectation from historical Flow rejection. Foldkit proves exact measured physical-ID output; pinned target-target callback/storage acceptance still has renderer008 and no path. Broader matrix/081 acceptance remains pending. |
| Click/two-activation and keyboard connection/reconnection | Pointer/click/keyboard connection; keyboard reconnection unsupported | Keyboard connection/reconnection; click terminal has separate `clickConnectEnd` emit | Keyboard connection/reconnection; click uses shared operation records tagged `inputKind: click` | Synthetic touch completion is tested in Vue/Foldkit; Vanilla keyboard reconnect and trusted device input remain open. |
| Radius: direct hit, nearest within radius, outside radius, zoom conversion | `flow-followups.e2e.ts` plus lifecycle suite | Lifecycle suite | Lifecycle suite | Configured value is tested; explicit default-versus-option-off assertions are still incomplete. |
| Connection auto-pan enabled, then stop after end/cancel | `gesture-options.e2e.ts` and lifecycle suite | Lifecycle suite | Lifecycle suite | Default-versus-disabled assertions remain incomplete. |
| Full/partial rectangle selection, pointer preview and accepted result | `movement-slices.e2e.ts`, lifecycle suite | Lifecycle suite | Lifecycle suite | Keyboard rectangle selection is tested in Vue/Foldkit lifecycle suites. |
| Eight pointer resize directions, controlled/uncontrolled, parent-child compensation | `advanced-gestures.e2e.ts`, lifecycle suite | Lifecycle suite | Lifecycle suite | Vue and Foldkit test grouped/repeated keyboard resize; Foldkit verifies cancellation and a single accumulated commit. |
| Node/edge `draggable`, `focusable`, and `selectable` flags | Production render and gesture policy | Production gesture policy; lifecycle flag case | Production reducer/render policy; lifecycle flag case | Flags are per-item semantics, separate from canvas-wide activation options. |
| Native-control and no-drag ownership for key/wheel/pointer | `gesture-options.e2e.ts`: input, textarea, select, contenteditable, button, link, and both marker spellings across pointer/key/wheel | Lifecycle suite: input, textarea, select, contenteditable, button, link, and both marker spellings across pointer/key/wheel; active connection Escape/wheel for six controls | `input-ownership.e2e.ts`: input, textarea, select, contenteditable, button, link, and both marker spellings across pointer/key/wheel; active connection Escape/wheel across six controls and both markers | Other selector × active-operation combinations are outside this frozen fixed scenario set and remain unverified; no Cartesian-product claim. |
| Lifecycle output and terminal ordering | `gesture-options.e2e.ts` asserts drag, connect, selection, and pointer UI callback cases | `activation-callbacks.e2e.ts` asserts click-connect/reconnect, drag and pointer rectangle order, plus uncontrolled keyboard-selection change → adoption → terminal | Production lifecycle E2E asserts serialized event-port records for connection success/rejection and selected pointer events | Full operation × cancellation-reason callback order remains unverified; Foldkit emits no native DOM events. |
| `nodeDragThreshold` | Validated mount option | Validated prop | Validated interaction option | Shared default 1 and strict raw client-space crossing. Pending drag preserves ordinary click. Dedicated feature checks and native Chromium ordinary gestures pass; broader parity remains unverified. |
| `nodesConnectable` | Public mount option | No canvas-wide option; per-node policy only | No canvas-wide option; allowed-target policy only | Vue/Foldkit canvas-wide option mappings remain open. |
| Pan activation: `panOnDrag` and mouse-button array | Boolean or button array | Boolean only; button array absent | Boolean only; button array absent | Foldkit also has no button-array form. Activation cases are host-local. |
| Wheel/double-click activation: `panOnScroll`, `zoomOnScroll`, `zoomOnDoubleClick` | Options | Options | Options | Existing fixed behavior does not establish every default/disabled combination. |
| Pinch activation: `zoomOnPinch` | Option is declared; active implementation/evidence not established | No prop | No option | Vue pinch zoom and Foldkit pinch option are absent; trusted native multi-pointer evidence remains Plan 060. |
| `selectNodesOnDrag` | Option; enabled unless false | Prop; default false, explicit true tested | No option | Vue default intentionally preserves existing shared conformance semantics; option defaults differ by host and do not imply parity. Foldkit configuration gap. |

### Cancellation reason coverage by operation

The shared seven-reason retry fixture is exercised through production connection paths in every host. Other operations have narrower reason coverage; cells below list observed browser scenarios, and missing combinations remain unverified rather than inferred from the shared connection rows.

| Active operation | Vanilla | Vue | Foldkit |
| --- | --- | --- | --- |
| Connection | Escape, blur, pointercancel, capture loss, removal, configuration replacement, unmount; each retries successfully | Same seven shared fixture reasons; each retries successfully | Same seven shared fixture reasons; each retries successfully |
| Reconnection | All seven reasons retry; dynamic-handle replacement also cancels stale release | All seven reasons clear stale proposal/preview and retry; controlled and uncontrolled ownership tested | All seven reasons clear stale proposal/preview and retry; dynamic-handle replacement suppresses stale release |
| Pointer resize | All seven fixture reasons restore geometry and retry | Escape, blur, pointercancel, capture loss, node removal, and unmount restore geometry and retry; resize configuration replacement is not a public host operation | All seven reasons restore geometry and retry |
| Rectangle selection | All seven fixture reasons clear preview and retry | All seven fixture reasons clear preview and retry; controlled and uncontrolled ownership tested | All seven fixture reasons clear preview and retry |
| Keyboard resize | Escape, blur, removal, hidden owner, deselection, and destroy restore geometry in `advanced-gestures.e2e.ts` | Escape, blur, and owner-node removal clear preview; blur/removal retries are accepted, and stale keyup after removal emits no edit | Escape, blur, and owner-document removal clear preview; blur/removal retries are accepted, and stale keyup after replacement emits no edit |

Reentrant handler settlement and queued disposal are covered separately through the public edit/state suites in all hosts. No row claims native pointer-capture or device-trusted touch evidence.

| Event-order boundary | Vanilla evidence | Vue evidence | Foldkit evidence | Remaining limit |
| --- | --- | --- | --- | --- |
| Candidate decode/validation precedes one semantic proposal | Connection/reconnection lifecycle and validator suites | Full-candidate validator and lifecycle suite | Core validation through graph messages and lifecycle suite | Validation-failure ordering is tested in selected cases, not every input path. |
| Uncontrolled proposal is accepted; controlled proposal waits for owner acknowledgement | `public-state.e2e.ts`, lifecycle suite | `public-edits.e2e.ts`, lifecycle suite | `public-state.e2e.ts`, lifecycle suite | No adapter substitutes a test reducer for production state. |
| Cancellation clears transient preview/session, emits no semantic edit, and permits retry | Shared seven-reason connection matrix plus selected reconnect/resize/selection rows | Shared matrix plus selected reconnect/resize/selection rows | Shared matrix, reconnect blur/capture-loss, resize/selection cases | Host lifecycle callbacks/records exist, but full operation × reason callback order remains unverified; Foldkit event names/payloads are serialized and adapter-specific. |
| Reentrant accepted-state work and queued disposal | Public edit suites | Public edit suites | Public edit suites | Native pointer-capture release cannot be proven by synthetic browser events. |

Vanilla callbacks may receive native host events. Vue emits decoded component payloads. Foldkit exposes serializable lifecycle records over a typed port and never includes DOM events in its Model or message payloads. The callback inventory remains incomplete: Vue omits pane double-click, Foldkit omits pane/node/edge double-click and context-menu records, and callback ordering has only fixed-scenario evidence. Foldkit programmatic viewport operations report start/change/end through `viewportEvents`; `interactionEvents` does not synthesize a programmatic move lifecycle. Foldkit `onError` currently reports edit failures only. Do not treat matching names as parity.

## Node members

Source: [current Node type](https://reactflow.dev/api-reference/types/node). Every current field is named below. Core evidence is FlowNodeSchema at packages/core/src/domain/flow.schema.ts:63-81; J consumes decoded document/controller, V active FlowCanvas/useFlow, F Model.document.nodes through app-level selectors and typed requests. These bounded reads are implemented in the hosts; the reusable Foldkit adapter is owned by `packages/foldkit`; packed-consumer proof remains open.

| Member | Core | J | V | F | Owner / boundary |
| --- | --- | --- | --- | --- | --- |
| id | NodeIdSchema | document | active document | Model document / selectNode | Core identity; missing lookup returns undefined. |
| position | XYPositionSchema, parent-relative | document | active document | Model document / selectNode | Core graph value; render absolute coordinates differ. |
| data | optional JsonObject | document | active document | Model document / selectNode | Core JSON; arbitrary React data type differs. |
| sourcePosition | gap | gap | gap | gap | Core handle-layout follow-up. |
| targetPosition | gap | gap | gap | gap | Core handle-layout follow-up. |
| hidden | optional boolean | document/render filter | document/render filter | document/view filter; selectNodes retains it | Core semantic; read even when hidden. |
| selected | optional boolean | document/change | document/change | document/change | Core semantic selection. |
| dragging | gap persisted; session state | preview/session | transform/session | pointer session | Host transient lifecycle; excluded snapshot. |
| draggable | optional boolean | field + policy | field + policy | field + policy | Core field and host interaction. |
| selectable | optional boolean | field + policy | field + policy | field + policy | Core field and host interaction. |
| connectable | gap node field | host handles | host handles | host handles | Host interaction; no same node field. |
| deletable | gap | gap | gap | gap | Core schema/delete policy follow-up. |
| dragHandle | gap | host selector option | gap | gap | Host DOM interaction. |
| width | optional size.width | host measurement | host measurement | view geometry | Core saved size differs from measured field. |
| height | optional size.height | host measurement | host measurement | view geometry | Core saved size differs from measured field. |
| initialWidth | gap | gap | gap | gap | Initialization sizing follow-up. |
| initialHeight | gap | gap | gap | gap | Initialization sizing follow-up. |
| parentId | optional NodeIdSchema | document | document | document / selectNode | Core topology; local positions retained. |
| zIndex | optional finite | document/render order | document/render order | document/view order | Core value + host ordering. |
| extent | optional parent | document/geometry | document/geometry | document/geometry | Core only supports parent extent. |
| expandParent | gap | gap | gap | gap | Parent expansion unassessed. |
| ariaLabel | optional string | document/DOM | document/DOM | document/DOM | Core label; host DOM serialization. |
| origin | gap | gap | gap | gap | Coordinate convention gap. |
| handles | FlowHandleSchema[] | document/renderer | document/renderer | document/view | Related concept; shape differs. |
| measured | gap | host measurement | host measurement | view measurement | Host ephemeral state; excluded snapshot. |
| type | optional string | renderer registry | renderer registry | view registry | Core ID, host renderer. |
| style | gap | renderer config | component props | view config | Host presentation; no core field. |
| className | gap | renderer config | component props | view config | Host presentation; no core field. |
| resizing | gap persisted; session state | resize session | resize/session | gap | Transient lifecycle; excluded snapshot. |
| focusable | optional boolean | document/DOM | document/DOM | document/DOM | Core capability + host accessibility. |
| ariaRole | gap | host DOM default | host DOM default | host DOM default | Host accessibility follow-up. |
| domAttributes | gap | renderer DOM props | component props | view DOM props | Framework/DOM-owned. |

## Edge members

Source: [current Edge type](https://reactflow.dev/api-reference/types/edge). Core evidence is FlowEdgeSchema at packages/core/src/domain/flow.schema.ts:110-134; host document paths parallel the Node mapping. Each current base and variant field is named.

| Member | Core | J | V | F | Owner / boundary |
| --- | --- | --- | --- | --- | --- |
| id | EdgeIdSchema | document | active document | Model document | Core identity; lookup planned. |
| type | optional string | renderer registry | renderer registry | view registry | Host renderer selection; variant types differ. |
| source | NodeIdSchema | document | document | document | Core topology. |
| target | NodeIdSchema | document | document | document | Core topology. |
| sourceHandle | optional HandleIdSchema | document/renderer | document/renderer | document/view | Core endpoint; host rendered handle. |
| targetHandle | optional HandleIdSchema | document/renderer | document/renderer | document/view | Core endpoint; host rendered handle. |
| animated | gap | gap | gap | gap | Host presentation unassessed. |
| hidden | optional boolean | document/render filter | document/render filter | document/view filter | Core flag; accepted read retains it. |
| deletable | optional boolean | document/delete policy | document/delete policy | document/delete policy | Core semantic capability; delete gesture host-owned. |
| selectable | optional boolean | document/change | document/change | document/change | Core semantic capability. |
| data | gap | gap | gap | gap | Schema evolution/version decision. |
| selected | optional boolean | document/change | document/change | document/change | Core semantic state. |
| markerStart | marker enum | document/renderer | document/renderer | document/view | Core kind; color/style differ. |
| markerEnd | marker enum | document/renderer | document/renderer | document/view | Core kind; color/style differ. |
| zIndex | optional finite | document/render order | document/render order | document/view order | Core value plus host ordering. |
| ariaLabel | optional string | document/DOM | document/DOM | document/DOM | Core label + host serialization. |
| interactionWidth | optional positive finite | document/hit path | document/hit path | document/hit path | Field correspondence; browser behavior unverified. |
| label | optional string | SVG renderer | SVG renderer | view renderer | Flow string vs ReactNode. |
| labelStyle | gap | renderer style partial | gap | gap | Host rendering style. |
| labelShowBg | gap | gap | gap | gap | Host rendering feature. |
| labelBgStyle | gap | gap | gap | gap | Host rendering style. |
| labelBgPadding | gap | gap | gap | gap | Host label layout. |
| labelBgBorderRadius | gap | gap | gap | gap | Host rendering style. |
| style | gap | renderer config partial | component props partial | view config | Host presentation; no core field. |
| className | gap | renderer config partial | component props partial | view config | Host presentation; no core field. |
| reconnectable | optional bool/endpoint literal | document/interaction | document/interaction | document/interaction | Core field; gesture semantics unverified. |
| focusable | optional boolean | partial DOM | partial DOM | partial DOM | Core field; accessibility behavior unverified. |
| ariaRole | gap | host DOM | host DOM | host DOM | Host accessibility follow-up. |
| domAttributes | gap | renderer props | component props | view props | Host DOM, not serialized. |
| SmoothStep pathOptions | gap | gap | gap | gap | Renderer-specific routing; unassessed. |
| Bezier pathOptions | gap | gap | gap | gap | Renderer-specific routing; unassessed. |

## ReactFlowInstance members

Source: [current ReactFlowInstance](https://reactflow.dev/api-reference/types/react-flow-instance). The JavaScript, Vue, and Foldkit hosts now implement bounded accepted-state reads. Remaining instance methods are explicitly inventoried as partial or gaps; Foldkit access is through package-owned typed ports and selectors; packed-consumer proof remains open.

| Member | Core | J | V | F | Owner / boundary |
| --- | --- | --- | --- | --- | --- |
| getNodes | FlowDocumentSchema.nodes | `getNodes()` returns complete accepted nodes | useFlow nodes computed | selectNodes / snapshot request | Host reads include hidden and culled nodes; Foldkit E2E exercises real Runtime ports. |
| getNode | FlowDocumentSchema node lookup | `getNode(id)` returns node or undefined | lookup function | selectNode / optional snapshot-request result | Missing IDs return undefined; Foldkit E2E exercises real Runtime ports. |
| getInternalNode | `getFlowInternalNode` projection | `getInternalNode(id)` | `useFlow().getInternalNode(id)` | `Graph.selectInternalNode(model, id)` | Returns detached accepted node plus absolute position, dimensions and measurement status. Pinned initial/refresh dimensions and handle bounds are captured in `research/fixtures/measured-geometry-reference.json`. |
| getEdges | FlowDocumentSchema.edges | `getEdges()` returns complete accepted edges | useFlow edges computed | selectEdges / snapshot request | Host reads include hidden and culled edges; Foldkit E2E exercises real Runtime ports. |
| getEdge | FlowDocumentSchema edge lookup | `getEdge(id)` returns edge or undefined | lookup function | selectEdge / optional snapshot-request result | Missing IDs return undefined; Foldkit E2E exercises real Runtime ports. |
| setNodes | edit transaction | `setNodes` | `useFlow().setNodes` | typed edit request | Valid full-collection field-update subcase matches the pinned capture; membership changes, dangling endpoints, and controlled setter behavior remain unverified. |
| addNodes | edit transaction | `addNodes` | `useFlow().addNodes` | typed edit request | Append; duplicate IDs reject atomically. |
| setEdges | edit transaction | `setEdges` | `useFlow().setEdges` | typed edit request | Valid full-collection field-update subcase matches the pinned capture; full candidate validation rejects dangling endpoints. |
| addEdges | edit transaction | `addEdges` | `useFlow().addEdges` | typed edit request | Append with duplicate-ID validation; distinct-ID parallel edges permitted. |
| toObject | `getSavedSession()` | `getSavedSession()` | typed snapshot request returns `savedSession` | Partial mapping: Flow's versioned document-plus-viewport envelope differs from `ReactFlowJsonObject`; restore is a validated proposal and controlled owners acknowledge it. |
| deleteElements | cascading edit transaction | async deletion result | async deletion result | request/result ports | Requested nodes, descendants, and incident edges; protected references conflict; controlled result means proposal only. Empty candidates skip all deletion callbacks. Foldkit's production Runtime E2E compares fixture request/candidate IDs and the explicitly awaited approval/callback lifecycle after normalizing host IDs. Callback-failure handling differs by host; see the WP4/WP5 trace. React-only `onNodesChange`/`onEdgesChange` interleaving remains unverified. |
| updateNode | edit transaction | `updateNode` | `useFlow().updateNode` | typed edit request | Shallow patch by default; replacement preserves ID and validates fully. |
| updateNodeData | JSON-object edit | `updateNodeData` | `useFlow().updateNodeData` | typed edit request | Shallow merge by default; replacement drops absent keys. |
| updateEdge | edit transaction | `updateEdge` | `useFlow().updateEdge` | typed edit request | Shallow patch by default; replacement preserves ID and validates fully. |
| updateEdgeData | JSON-object edit | `updateEdgeData` | `useFlow().updateEdgeData` | typed edit request | FlowEdge.data is additive in version-1 persistence. |
| getNodesBounds | graphBounds/fit partial | fitView partial | gap | gap | Return/signature differs; Plan 046. |
| getHandleConnections | synchronous controller getter over accepted document | synchronous `useFlow()` point-in-time getter | typed `SnapshotRequest.handleConnections` → `SnapshotResponse.handleConnections` | Partial: required direction and node ID, explicit handle filtering, and null/omitted/empty ID aggregation are covered; unmatched queries return `[]`. Flow returns full `FlowEdge` records rather than React `HandleConnection` records. See the separate `useHandleConnections` callback row for accepted-state observation behavior. |
| getNodeConnections | graph query partial | partial core query | gap | partial graph query | Result contract not matched. |
| getIntersectingNodes | intersection helper partial | core geometry partial | core geometry partial | core geometry partial | Full signature/semantics unverified. |
| isNodeIntersecting | intersection helper partial | core geometry partial | core geometry partial | core geometry partial | Full signature/semantics unverified. |
| zoomIn | shared viewport operation math | Promise operation | Promise operation | client operation | 1.2 factor; clamped by configured limits; accepts animation options. |
| zoomOut | shared viewport operation math | Promise operation | Promise operation | client operation | Reciprocal 1.2 factor; clamped by configured limits; accepts animation options. |
| zoomTo | shared viewport operation math | Promise operation | Promise operation | client operation | Anchors at pane center by default; animation options and replacement statuses are Flow-defined. |
| getZoom | `Viewport.zoom` | `getZoom()` | `getZoom()` | `getZoom()` | Synchronous in Vanilla/Vue; Foldkit request client reads through typed ports. |
| setViewport | serializable target viewport | Promise operation | Promise operation | request/result client operation | Controlled mode resolves `proposed`; uncontrolled acceptance resolves `accepted`; replacement/disposal settle explicitly. |
| getViewport | `ViewportSchema` | `getViewport()` returns accepted viewport | `useFlow().getViewport()` | `getViewport()` client request | Public accepted reads are adapter-local; Foldkit uses a typed port rather than a synchronous call. |
| setCenter | shared pane-centered transform math | Promise operation | Promise operation | client operation | Pane size and optional zoom determine target; animates and settles using the shared result contract. |
| fitBounds | shared `getViewportForBounds` | Promise operation | Promise operation | client operation | Supports fractional and per-side pixel padding and configured limits; zero-area inputs are unavailable. |
| getViewportForBounds | shared pure bounds helper | synchronous controller helper | synchronous composable helper | shared helper in request path | Pane-local math; host sizing remains adapter-owned. |
| screenToFlowPosition | viewport conversion math | client-coordinate method | client-coordinate method | client request with host origin | Offset and page-scroll conversion tested; CSS transforms are unsupported. |
| flowToScreenPosition | viewport conversion math | client-coordinate method | client-coordinate method | client request with host origin | Offset and page-scroll conversion tested; CSS transforms are unsupported. |
| viewportInitialized | positive pane dimensions | readiness boolean | readiness boolean | async client query | Means the viewport pane has positive dimensions; does not prove node measurement readiness. |

## Hooks and remaining unassessed members

| Current member | Reference | J / V / F | Boundary |
| --- | --- | --- | --- |
| useReactFlow | [hook](https://reactflow.dev/api-reference/hooks/use-react-flow) | controller with bounded getters and accepted-state subscription / `useFlow` with readonly reactive snapshot and lookups / selectors and typed state ports | JS reads are point-in-time; Vue reads are computed and canvas-local; Foldkit selectors and observer APIs are package-owned. None is a complete React Flow instance. |
| useNodes | [hook](https://reactflow.dev/api-reference/hooks/use-nodes) | `getNodes()` plus `subscribeState` / `useNodes()` computed readonly array / `selectNodes` and accepted-state port | No granular node-only subscription; Vue invalidates with accepted document state; Foldkit selects from the model. |
| useEdges | [hook](https://reactflow.dev/api-reference/hooks/use-edges) | `getEdges()` plus `subscribeState` / `useEdges()` computed readonly array / `selectEdges` and accepted-state port | No granular edge-only subscription; Vue invalidates with accepted document state; Foldkit selects from the model. |
| useViewport | [hook](https://reactflow.dev/api-reference/hooks/use-viewport) | `getViewport()` plus `subscribeState` / `useViewport()` computed readonly value / `selectViewport` and accepted-state port | JS remains point-in-time; Vue invalidates reactively; Foldkit selects from the model. |
| useInternalNode | internal-node projection | controller `getInternalNode` | `useFlow().getInternalNode` | typed Runtime `SnapshotRequest.internalNode` from `Graph.selectInternalNode` | Partial mapping: Foldkit returns the measured/declared internal-node projection for valid IDs and `null` for missing or malformed query IDs. React hook subscription and rerender semantics are not claimed. |
| useNodesInitialized | measurement readiness | `nodesInitialized(options)` | `useFlow().nodesInitialized(options)` | `Graph.selectNodesInitialized(model)` | Partial host-native mapping; the shared production measurement contract checks visible readiness and hidden-node inclusion on all three hosts (`apps/shared-e2e/measured-geometry-contract.ts:58-75`). Core owns hidden-node semantics; React hook identity and rerender behavior are not claimed. |
| useUpdateNodeInternals | explicit geometry refresh | `updateNodeInternals(ids)` | `useFlow().updateNodeInternals(ids)` | `createFoldkitNodeInternalsRefresher({ resolveElement, measure })` | Vanilla, Vue, and Foldkit refresh measured node bounds by ID. Foldkit lookup and observer scheduling remain app-owned and dispatch typed `MeasureNode`; the package facade does not own DOM or scheduling. React RAF batching and arbitrary measured handle centers remain unverified. Foldkit test changes dimensions and handle CSS, then asserts measured bounds, edge path movement, no graph/viewport mutation, missing-ID, and disposal outcomes; path movement currently proves dimension-based endpoints only. See `research/traces/public-api-completion.md`. |
| useConnection | [hook](https://reactflow.dev/api-reference/hooks/use-connection) | nullable controller preview getter/subscription | nullable computed preview projection | nullable Runtime snapshot projection | Partial transient whole-snapshot mapping; Vue/Foldkit reconnect API reads, Vue cross-canvas isolation, post-disposal reads, and arbitrary selector equality remain unverified. |
| useNodeConnections | [hook](https://reactflow.dev/api-reference/hooks/use-node-connections) | explicit-ID read plus accepted-state `observeNodeConnections` callbacks | `useNodeConnections` computed value with optional explicit ID or custom-node context | package-exported `createFoldkitObservers.observeNodeConnections` from `@flow/foldkit` | Partial. Add/remove/reconnect, no initial callback, controlled accept/reject, disposal, and instance isolation have mounted host tests. Flow preserves `FlowNodeConnection[]`; React `HandleConnection[]` payload parity, callback identity/effect timing, and complete option aliasing remain unverified. |
| useHandleConnections | [deprecated hook](https://reactflow.dev/api-reference/hooks/use-handle-connections) | `observeHandleConnections(query, callbacks)` accepted-state observer; `getHandleConnections(query)` point-in-time read | `useHandleConnections(options)` computed projection and accepted-state callbacks | `createFoldkitObservers.observeNodeConnections({ nodeId, type, handleId }, callbacks)`; Runtime snapshot handle query remains point-in-time | Partial host-native query and callback mapping. All hosts start silently, emit disconnect before connect, and stay silent for rejected proposals. Vanilla callback payloads are `FlowEdge[]`; Vue and Foldkit use `FlowNodeConnection[]`. Vanilla/Foldkit require explicit node IDs; Vue also accepts node context. React hook scheduling, callback identity, exact payload shape, and exhaustive options remain unverified. |
| useKeyPress, useOnSelectionChange | [current Hooks catalog](https://reactflow.dev/api-reference) | Key and selection observer APIs | Partial host-native observers; React hook effect and rerender semantics remain open. |
| useOnViewportChange | [hook](https://reactflow.dev/api-reference/hooks/use-on-viewport-change) | `onMoveStart/onMove/onMoveEnd`, `subscribeViewport` | Partial phase mapping in all hosts; controlled proposals remain owner-controlled, with React effect/callback identity semantics unsupported. See the production trace and per-host tests in `research/traces/public-api-completion.md`. |
| Other ReactFlow props not named in the preceding member table | [current ReactFlow props](https://reactflow.dev/api-reference/react-flow) | Unassessed in each host | Dated catalog retains every URL; map at later API milestones. |
| Other components, types, and utilities in current API sidebar | [API reference](https://reactflow.dev/api-reference) | Unassessed in each host | Broad API checklist remains open. |

### WP3: provider projections and saved sessions

| Upstream member | Vanilla | Vue | Foldkit | Status and boundary |
| --- | --- | --- | --- | --- |
| `useNodesData(nodeIds)` | `controller.getNodesData(nodeIds)` | `useFlow().getNodesData(nodeIds)` computed value | typed `SnapshotRequest` returns `nodesData` from the receiving Runtime model | Partial host-native projections. Vue is reactive to its accepted canvas snapshot; Vanilla is point-in-time; Foldkit is a typed request/response. None claims React selector equality behavior. |
| `useNodeConnections(options)` | `getNodeConnections(options)` read; `observeNodeConnections(options, callbacks)` accepted-state observer | `useNodeConnections(options)` returns a computed projection and invokes callbacks on accepted deltas | package-exported `createFoldkitObservers.observeNodeConnections` binds host-local callbacks to one Runtime's accepted-state port; package exports do not establish packed-consumer behavior | Partial host-native behavior. All three suppress mount callbacks, emit disconnect before connect for a changed projection, ignore unacknowledged controlled proposals, and attempt connect callbacks even when disconnect callbacks throw. Vanilla reports through `onError` plus telemetry; Vue rethrows into Vue error handling after both callbacks; Foldkit logs through Effect. The Foldkit observer is package-public through `@flow/foldkit`; packed-consumer behavior remains unverified. Vanilla/Foldkit require explicit `nodeId`; Vue accepts `nodeId` or `FlowNodeIdKey` context. Flow callbacks carry `FlowNodeConnection[]` projections, not React's `HandleConnection[]`; React effect timing/callback identity and full parameter-shape parity remain unverified. Production coverage: `apps/vanilla/e2e/public-state.e2e.ts`, `apps/vue/e2e/node-connections.e2e.ts`, and `apps/foldkit/e2e/public-state.e2e.ts`. |
| `connectionSelector` / connection preview read | `controller.getConnectionPreview()` with `subscribeConnectionPreview()` | `useFlow().connectionPreview` computed nullable readonly projection | Runtime `SnapshotRequest` returns `connectionPreview` from its model | Partial whole-snapshot equivalent for transient connect/reconnect preview; idle is `null`, output is readonly, and preview state is not persisted. No arbitrary selector callback or selector-equality optimization is exposed. |
| `useNodeId()` | Renderer receives `FlowNode` as its first argument | `useNodeId()` reads the provided custom-node context | Renderer receives node identity in its typed node argument | Partial host equivalents; only Vue exposes a descendant context composable. |
| `useNodesState()` / `useEdgesState()` | Controller `setNodes` / `setEdges` | `useFlow().setNodes` / `setEdges` | typed Runtime actions replace validated graph documents; pure change-array helpers are separate | Partial. Flow keeps owner state and validated writes host-native; it does not return React's state tuple or `onNodesChange`/`onEdgesChange` callbacks. |
| `<ReactFlowProvider defaultNodes/defaultEdges>` | initial FlowDocument passed to `mountFlow` | initial `defaultDocument` on `FlowCanvas` | explicit initial graph passed to Runtime composition | Partial. Initial graph values are canvas/Runtime inputs, not provider-owned shared state or React context defaults. |
| `useStore`, `useStoreApi`, `getState`, `setState` | No raw store surface | No raw store surface | No raw store surface | Intentional gap: host owners remain authoritative; callers use projections, subscriptions, and validated actions rather than shared mutable internals. |
| `toObject()` | `controller.getSavedSession()` | `useFlow().getSavedSession()` | typed `SnapshotRequest` returns `savedSession` | Partial persistence mapping. Flow's versioned `SavedFlowSession` envelope composes the validated saved document and viewport; it is not shape-compatible with `ReactFlowJsonObject`. Each host decodes a proposal and applies its document and viewport through its owner update path; controlled owners remain authoritative. |
| `defaultEdgeOptions` | Partial | Partial | Partial | Schema-backed FlowEdge-supported defaults fill missing fields on new edges and project beneath stored explicit values at render. Vue prop changes update the render projection. Overlap precedence on creation is unverified. Excludes ID/endpoints/handles/selection and React-only style/custom marker fields. Provider-only initial dimensions remain a gap. |

Production mapping evidence and test boundaries are traced in [the public API completion trace](../research/traces/public-api-completion.md). The core session encoder/decoder round-trip is also distinct from each host's production read/restore API. All hosts keep their own accepted state owner; this mapping does not introduce a common mutable store.

The curated matrix's initial live pages were checked 2026-09-26; the separate page/member inventory was checked 2026-09-28. Node, Edge, and ReactFlowInstance pages report last updated August 31, 2026. The sidebar catalog checker validates dated URLs and counts; the API member checker validates the separate inventory and its evidence structure. The pinned instance declaration at research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/instance.ts:25 remains separate historical evidence. Neither checker establishes live-site runtime parity, full API implementation, or equal semantics.

## Change-array, edge, and path utility correspondence

The core exports `NodeChange`/`EdgeChange` as schema-derived variants and immutable `applyNodeChanges`/`applyEdgeChanges` reducers. They accept partial collections and ignore unknown IDs; they are not document validators. Node dimensions update transient `measured`, width/height, and resizing fields without writing persisted `size`. The position change accepts `positionAbsolute` as metadata, but the reducer intentionally applies only `position` and `dragging`, matching the pinned reducer boundary.

`addEdge` and `reconnectEdge` preserve input collections on no-op/error and copy changed arrays. Duplicate detection follows pinned endpoint semantics, including treating falsy handles as equivalent. Generated IDs are decoded through `EdgeIdSchema`; custom ID callbacks return strings at the callback boundary and their result is schema-decoded before use. Reconnect defaults to replacing the ID when options are omitted; an explicit empty options object preserves the old ID. Reconnect output is `ReconnectedEdge`, which retains the connection's nullable or undefined handle properties even though installed `FlowEdge` values do not permit null handles. `isNode`/`isEdge` are structural narrowing predicates, not full schema validators. The four exported edge-path helpers return fresh mutable five-element tuples with path, label center, and offsets. Their readonly inputs and mutable results derive from private Effect Schemas without runtime decoding. `getEdgeCenter` returns four numbers. Bezier/simple offsets measure source-to-label distance; smooth offsets remain endpoint half-distances even with explicit center overrides. Raw numeric arithmetic and unclamped options remain part of this pure boundary. See [the executable helper trace](../research/traces/path-helpers.md).

The implementation is in `packages/core/src/domain/flow-change-compatibility.ts:10-102,116-286,303-459` and `packages/core/src/domain/flow-edge-path.ts:5-44,53-65`. Fixed cases and immutability boundaries are in `packages/core/src/domain/flow-change-compatibility.test.ts:31-187,190-319` and `packages/core/src/domain/flow-edge-path.test.ts`; the packed public consumer type/runtime checks are in `tests/consumer/consumer.typecheck.ts:178-243` and `tests/consumer/main.ts:1-16`. Pinned comparisons are grounded in the pinned change reducer and edge utility modules identified in `research/traces/public-api-completion.md`.

| Current utility | Flow equivalent | Bounded result | Remaining boundary |
| --- | --- | --- | --- |
| `applyNodeChanges` / `applyEdgeChanges` | matching exports from `@flow/core` | Fixed ordered add/remove/replace/select and dimensions cases pass; input collections remain unchanged. | Not a graph-integrity transaction; exhaustive behavior beyond tested variants is unverified. |
| `addEdge` / `reconnectEdge` | matching exports from `@flow/core` | Fixed duplicate, generated ID, error callback, reconnect-ID, metadata, and nullable-handle cases pass. | Core does not emit the pinned wrapper's default development warning without an `onError` callback; installed graph validation stays at the document boundary. |
| `isNode` / `isEdge` | matching exports from `@flow/core` | Structural predicates narrow by required identity/endpoints. | They do not decode or validate a full Flow schema. |
| `getStraightPath`, `getBezierPath`, `getSimpleBezierPath`, `getSmoothStepPath` | matching exports from `@flow/core` | Exact five-tuples compare against 504 numeric cases captured twice from pinned built React12.11.6 exports; installed probes exercise the same matrix and both existing compiler modes. | Pure caller-coordinate math only. Malformed arguments are separate observations; mounted string geometry, measurements, preview and full072 remain separate. |

## Graph query utility correspondence

These three utilities accept already decoded Flow values and preserve the order and object identity of the supplied collections. Their public types use FlowNode and FlowEdge; Pick<FlowNode, 'id'> permits a node or ID-bearing selection. They do not apply hidden-state filtering. The legacy graphIncomers and graphOutgoers functions remain graph-view queries returning incident edges and are not aliases for the node-returning React Flow utilities.

| Current utility | Flow equivalent | Result ordering | Boundary |
| --- | --- | --- | --- |
| [getIncomers](https://reactflow.dev/api-reference/utils/get-incomers) | getIncomers(node, nodes, edges) | Unique supplied nodes in node input order | Pinned algorithm inspected; executable reference comparison remains unverified. |
| [getOutgoers](https://reactflow.dev/api-reference/utils/get-outgoers) | getOutgoers(node, nodes, edges) | Unique supplied nodes in node input order | Pinned algorithm inspected; executable reference comparison remains unverified. |
| [getConnectedEdges](https://reactflow.dev/api-reference/utils/get-connected-edges) | getConnectedEdges(nodes, edges) | Incident supplied edges in edge input order | Pinned algorithm inspected; executable reference comparison remains unverified. |

Flow graph-query utility tests cover directed endpoints, parallel edges, self-loops, hidden nodes, empty collections, missing IDs, selection subsets, stable ordering, and input immutability. Graph bounds and intersection utility correspondence remain open.

## Frozen legacy persistence prerequisite

Plan 075 stage 1 freezes Flow's literal-v1 fields and constraints independently of future live schemas. It rejects explicitly unrepresentable origin/native semantics with an authoritative typed format code before projection. This is a Flow persistence policy, not an upstream save-format parity claim. The same Foldkit snapshot owner consumes correlated success and failure channels and settles disposal; packed probes exercise ordinary reads from two real Runtime owners. Controlled model failure inputs remain unit evidence until live native/origin schemas can accept them. Versioned round trips, all-host unsupported-format production, and the original member acceptance cells remain open.

## Original measured-member correspondence

Plan 065 preserves all 63 original identities across three hosts. Flow's required dimension output and explicit status replace optional measured dimensions and nullable bounds. Its flat measured array joins accepted handle declarations by required nonempty ID; source/target partitions and all four positions come from those declarations. Centers replace React handleBounds top-left coordinates. Empty or hidden geometry yields `[]`. These native ownership choices were independently reviewed in `plans/measured-handle-acceptance-design.md`; all nested parent/array/union identities keep member-specific public and installed-type evidence. They do not extend acceptance to other InternalNode members.

A hidden node retains dimensions only while its measurement generation is current. Vue invalidates the element generation on unmount and falls back to declared dimensions in the tested hide route; the tested Vanilla/Foldkit hide routes retain the current sample. Native promise/status refresh exposes stable owner-local facades and explicitly settles disposal. Exact React callback/frame scheduling is a reviewed difference. Nullable connection handles remain Plan 067-owned, and persistence migration remains separately owned.

Plan070 adds one complete v2 persistence body and additive host methods/ports. This is a Flow format and ownership policy: frozen v1 readers keep their actual field stripping/kind checks; additive v1 validates the complete known-extension envelope, including viewport, before one ordered frozen-kind traversal and field stripping, and generalized directed IDs round trip in v2. Shared returned JSON is detached at encoding and Foldkit snapshot/query boundaries. Original generic/nested/unnamed069/074 and native accessibility renderer068/074 requirements remain held; source persistence does not close them. See `research/traces/complete-versioned-persistence.md` for production and test paths.
