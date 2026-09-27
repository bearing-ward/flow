# React Flow API correspondence

Captured 2026-09-26. This is a member inventory, not a parity claim. The current website references below describe the live public surface. The dated catalog is research/catalogs/react-flow-2026-09-26.json. The pinned source at research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/ is historical evidence for that revision only. No member listed as planned is implemented by this documentation change.

For each row, J means JavaScript, V means Vue, and F means Foldkit. Shared local evidence: core schema is packages/core/src/domain/flow.schema.ts:48-141; vanilla controller is apps/vanilla/src/mount-flow.ts:424-476,6051-6124; Vue props/setup are packages/vue/src/flow-canvas.ts:159-315 and composable is packages/vue/src/use-flow.ts:7-90; Foldkit model/selectors are apps/foldkit/src/graph.ts:37-145 and typed ports/runtime composition are apps/foldkit/src/application.ts:34-71,221-255. Full state decisions and separate production/test traces are in research/traces/public-state-contract.md.

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
| onViewportChange | ViewportChange proposal | subscribe | update:viewport/change emit | SemanticChange port | Proposal only; separate accepted-state event contract in trace. |
| fitView | fitViewportToNodes | fitView method | gap | gap | Core geometry / host measurement; Vue and Foldkit method gap. |
| fitViewOptions | FitViewOptionsSchema | method argument partial | gap | gap | Host startup/API mapping remains open. |
| minZoom | ViewportLimitsSchema | option | gap | gap | Core clamp math; host option mapping. |
| maxZoom | ViewportLimitsSchema | option | gap | gap | Core clamp math; host option mapping. |
| width | no graph field | mount root CSS/layout | canvas layout | container layout | Host DOM/layout ownership; unassessed. |
| height | no graph field | mount root CSS/layout | canvas layout | container layout | Host DOM/layout ownership; unassessed. |
| nodeTypes | node.type only | nodeRenderers | renderer registration | view renderer registry | Host rendering; names differ. |
| edgeTypes | edge.type only | edgeRenderers | renderer registration | view renderer registry | Host rendering; names differ. |
| colorMode | gap | gap | gap | gap | Host theming; unassessed. |
| debug | gap | structured telemetry, not equivalent | gap | gap | Host observability; not equivalent. |
| ariaLabelConfig | individual ARIA fields only | partial labels | partial labels | partial labels | Host accessibility/localization; global config gap. |
| nodeOrigin | gap | gap | gap | gap | Core coordinate convention; no prop equivalence. |
| nodeDragThreshold | gesture threshold primitive | related host option | host gesture behavior | host gesture behavior | Host lifecycle; exact semantics unverified. |
| connectionDragThreshold | gap | connection-session threshold | connection-session threshold | pointer session | Host lifecycle; exact API gap. |
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
| defaultEdgeOptions | edge fields, no default merge contract | gap | gap | gap | Host initialization; unassessed. |
| reconnectRadius | ConnectionRadiusSchema | option | gap | gap | Core radius math; option mapping incomplete. |
| edgesReconnectable | Edge.reconnectable | host option | gap | gap | Host interaction plus per-edge core field; config gap. |
| autoPanOnNodeFocus | viewport pan on focus | host option | gap | app focus behavior | Host lifecycle; focus-triggered viewport behavior unverified. |
| nodesDraggable | FlowNode.draggable | global host option | canvas/per-node | model/app interaction | Core flag + host policy; precedence needs tests. |
| nodesConnectable | handles/connection model | host option | partial connection props | targets/handles | Host policy; partial only. |
| nodesFocusable | FlowNode.focusable | host option | canvas/node behavior | app interaction | Core flag + host accessibility. |
| edgesFocusable | FlowEdge.focusable | partial DOM behavior | partial DOM behavior | partial DOM behavior | Core field exists; exact host behavior unverified. |
| elementsSelectable | node/edge selectable flags | host option | canvas option | app interaction | Core flags + host policy; precedence open. |
| autoPanOnConnect | connection/viewport ops | host option | partial | partial | Host lifecycle; option semantics unverified. |
| autoPanOnNodeDrag | drag/viewport ops | host option | partial | partial | Host lifecycle; option semantics unverified. |
| autoPanOnSelection | selection/viewport ops | host option | gap | gap | Host lifecycle; unassessed. |
| autoPanSpeed | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| panOnDrag | viewport pan session | host option | canvas option | canvas interaction | Host lifecycle; mouse-button semantics open. |
| selectionOnDrag | selection rectangle | host option | canvas option | canvas option | Host lifecycle; modifier semantics open. |
| selectionMode | selection geometry | host option | partial | partial | Core geometry; host parity unverified. |
| panOnScroll | viewport pan command | host option | canvas option | canvas option | Host lifecycle; exact config unverified. |
| panOnScrollSpeed | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| panOnScrollMode | gap | host option | gap | gap | Host lifecycle tuning; unassessed. |
| zoomOnScroll | viewport zoom operation | host option | canvas option | canvas option | Host lifecycle; exact config unverified. |
| zoomOnPinch | pinch session/zoom | host pinch option | partial | partial | Host lifecycle; native multipointer unverified. |
| zoomOnDoubleClick | viewport zoom command | host option | canvas option | gap | Host lifecycle; Vue gap. |
| selectNodesOnDrag | node selection change | host behavior | partial | partial | Host lifecycle; exact behavior unverified. |
| elevateNodesOnSelect | node.zIndex | render behavior | gap | app rendering | Host render policy; order equivalence unverified. |
| connectOnClick | click-connection session | host option | host interaction mode | partial | Host lifecycle; callback family later. |
| connectionMode | handle kind/validation | host option | allowed-target option | target validation | Core validation + host config; strict/loose semantics differ. |
| zIndexMode | node/edge zIndex | host z-order | gap | gap | Host rendering policy; unassessed. |
| connectionLineStyle | gap | renderer style option | gap | gap | Host rendering; unassessed. |
| connectionLineType | FlowEdgePathSchema | connection option | partial | partial | Host renderer; path semantics need validation. |
| connectionRadius | ConnectionRadiusSchema | option | partial | partial | Core behavior; adapter prop equivalence unverified. |
| connectionLineComponent | gap | custom renderer option | gap | gap | Host renderer API; unassessed. |
| connectionLineContainerStyle | gap | gap | gap | gap | Host DOM style; unassessed. |
| deleteKeyCode | delete commands | keyboard option | partial | partial | Host keyboard lifecycle; syntax/equivalence open. |
| selectionKeyCode | selection commands | keyboard option | partial | partial | Host keyboard lifecycle; equivalence open. |
| multiSelectionKeyCode | selection-set change | keyboard option | partial | partial | Host keyboard lifecycle; equivalence open. |
| zoomActivationKeyCode | viewport commands | gap | gap | gap | Host keyboard lifecycle; unassessed. |
| panActivationKeyCode | viewport commands | gap | gap | gap | Host keyboard lifecycle; unassessed. |
| disableKeyboardA11y | gap | gap | gap | gap | Host accessibility policy; unassessed. |
| noPanClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| noDragClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| noWheelClassName | gap | host class behavior | gap | gap | Host DOM interaction; unassessed. |
| onNodesChange | FlowChange subset | subscribe | change event | SemanticChange port | Proposal API; per-variant mapping open. |
| onEdgesChange | FlowChange subset | subscribe | change event | SemanticChange port | Proposal API; per-variant mapping open. |
| onMoveStart | viewport session start | gap | gap | gap | Lifecycle callback deferred. |
| onMove | viewport proposal | subscribe | change event | SemanticChange port | State proposal is not lifecycle callback replacement. |
| onMoveEnd | viewport session end | gap | gap | gap | Lifecycle callback deferred. |
| onPaneClick | gap | gap | gap | gap | Host UI event; unassessed. |
| onPaneContextMenu | gap | gap | gap | gap | Host UI event; unassessed. |
| onPaneScroll | gap | gap | gap | gap | Host UI event; unassessed. |
| onPaneMouseMove | gap | gap | gap | gap | High-frequency host UI event; unassessed. |
| onPaneMouseEnter | gap | gap | gap | gap | Host UI event; unassessed. |
| onPaneMouseLeave | gap | gap | gap | gap | Host UI event; unassessed. |
| onNodeDragStart | node drag session start | gap | gap | gap | Lifecycle callback deferred. |
| onNodeDrag | node-position proposal/preview | subscribe proposal | change emit | change port | Not a lifecycle preview callback; deferred. |
| onNodeDragStop | node drag finish | gap | gap | gap | Lifecycle callback deferred. |
| onConnectStart | connection session start | gap | gap | gap | Lifecycle callback deferred. |
| onConnect | edge-add proposal | subscribe | change emit | change port | Proposal correspondence partial. |
| onConnectEnd | connection finish/cancel | gap | gap | gap | Lifecycle callback deferred. |
| onClickConnectStart | click-connection session start | gap | gap | gap | Lifecycle callback deferred. |
| onClickConnectEnd | click-connection session finish | gap | gap | gap | Lifecycle callback deferred. |
| onReconnectStart | reconnection session start | gap | gap | gap | Lifecycle callback deferred. |
| onReconnect | edge-reconnect proposal | subscribe | change emit | gap | Proposal partial; Vue gap. |
| onReconnectEnd | reconnection session finish | gap | gap | gap | Lifecycle callback deferred. |
| onSelectionChange | selection change | subscribe | change emit | change port | Semantic proposal exists; scheduling differs. |
| onSelectionContextMenu | gap | gap | gap | gap | Host selection UI event; unassessed. |
| onSelectionStart | selection session start | gap | gap | gap | Lifecycle callback deferred. |
| onSelectionEnd | selection session end | gap | gap | gap | Lifecycle callback deferred. |
| onSelectionDragStart | selection preview start | gap | gap | gap | Preview lifecycle deferred. |
| onSelectionDrag | selection preview | gap | gap | gap | Preview lifecycle deferred. |
| onSelectionDragStop | selection preview finish | gap | gap | gap | Preview lifecycle deferred. |
| onBeforeDelete | delete validation | gap | gap | gap | Host callback semantics unassessed. |
| onDelete | removal changes | FlowChange removal | subscribe | change/port | Callback payload differs; later mapping. |
| onNodesDelete | node removal change | subscribe | change | change/port | Payload/order unverified. |
| onEdgesDelete | edge removal change | subscribe | change | change/port | Payload/order unverified. |
| onError | Effect failure boundary | partial telemetry/error path | partial app boundary | gap | Host failure callback mapping unassessed. |
| onInit | host initialization | createFlow promise resolution | component setup/mount | Runtime handle | Host lifecycle; shape differs. |
| onNodeClick | selection/focus | partial DOM event | partial component event | partial DOM behavior | Host UI event; unassessed. |
| onNodeDoubleClick | gap | gap | gap | gap | Host UI event; unassessed. |
| onNodeMouseEnter | gap | gap | gap | gap | Host UI event; unassessed. |
| onNodeMouseMove | gap | gap | gap | gap | High-frequency host UI event; unassessed. |
| onNodeMouseLeave | gap | gap | gap | gap | Host UI event; unassessed. |
| onNodeContextMenu | gap | gap | gap | gap | Host UI event; unassessed. |
| onEdgeClick | gap | gap | gap | gap | Host UI event; unassessed. |
| onEdgeDoubleClick | gap | gap | gap | gap | Host UI event; unassessed. |
| onEdgeMouseEnter | gap | gap | gap | gap | Host UI event; unassessed. |
| onEdgeMouseMove | gap | gap | gap | gap | High-frequency host UI event; unassessed. |
| onEdgeMouseLeave | gap | gap | gap | gap | Host UI event; unassessed. |
| onEdgeContextMenu | gap | gap | gap | gap | Host UI event; unassessed. |
| ...props (HTML div attributes) | none | mount root attributes | canvas root props | container props | Host DOM ownership; unassessed. |

## Node members

Source: [current Node type](https://reactflow.dev/api-reference/types/node). Every current field is named below. Core evidence is FlowNodeSchema at packages/core/src/domain/flow.schema.ts:63-81; J consumes decoded document/controller, V active FlowCanvas/useFlow, F Model.document.nodes through app-level selectors and typed requests. These bounded reads are implemented in the hosts; a reusable Foldkit package adapter remains out of scope.

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

Source: [current ReactFlowInstance](https://reactflow.dev/api-reference/types/react-flow-instance). The JavaScript, Vue, and Foldkit hosts now implement bounded accepted-state reads. Remaining instance methods are explicitly inventoried as partial or gaps; Foldkit access is through an app-scoped typed port, not a package adapter.

| Member | Core | J | V | F | Owner / boundary |
| --- | --- | --- | --- | --- | --- |
| getNodes | FlowDocumentSchema.nodes | `getNodes()` returns complete accepted nodes | useFlow nodes computed | selectNodes / snapshot request | Host reads include hidden and culled nodes; Foldkit E2E exercises real Runtime ports. |
| getNode | FlowDocumentSchema node lookup | `getNode(id)` returns node or undefined | lookup function | selectNode / optional snapshot-request result | Missing IDs return undefined; Foldkit E2E exercises real Runtime ports. |
| getInternalNode | gap | gap | gap | gap | Private internal-store data intentionally excluded. |
| getEdges | FlowDocumentSchema.edges | `getEdges()` returns complete accepted edges | useFlow edges computed | selectEdges / snapshot request | Host reads include hidden and culled edges; Foldkit E2E exercises real Runtime ports. |
| getEdge | FlowDocumentSchema edge lookup | `getEdge(id)` returns edge or undefined | lookup function | selectEdge / optional snapshot-request result | Missing IDs return undefined; Foldkit E2E exercises real Runtime ports. |
| setNodes | edit transaction | `setNodes` | `useFlow().setNodes` | typed edit request | Valid full-collection field-update subcase matches the pinned capture; membership changes, dangling endpoints, and controlled setter behavior remain unverified. |
| addNodes | edit transaction | `addNodes` | `useFlow().addNodes` | typed edit request | Append; duplicate IDs reject atomically. |
| setEdges | edit transaction | `setEdges` | `useFlow().setEdges` | typed edit request | Valid full-collection field-update subcase matches the pinned capture; full candidate validation rejects dangling endpoints. |
| addEdges | edit transaction | `addEdges` | `useFlow().addEdges` | typed edit request | Append with duplicate-ID validation; distinct-ID parallel edges permitted. |
| toObject | persistence envelope differs | persistence APIs | gap | gap | Serialization compatibility separate plan. |
| deleteElements | cascading edit transaction | async deletion result | async deletion result | request/result ports | Requested nodes, descendants, and incident edges; protected references conflict; controlled result means proposal only. |
| updateNode | edit transaction | `updateNode` | `useFlow().updateNode` | typed edit request | Shallow patch by default; replacement preserves ID and validates fully. |
| updateNodeData | JSON-object edit | `updateNodeData` | `useFlow().updateNodeData` | typed edit request | Shallow merge by default; replacement drops absent keys. |
| updateEdge | edit transaction | `updateEdge` | `useFlow().updateEdge` | typed edit request | Shallow patch by default; replacement preserves ID and validates fully. |
| updateEdgeData | JSON-object edit | `updateEdgeData` | `useFlow().updateEdgeData` | typed edit request | FlowEdge.data is additive in version-1 persistence. |
| getNodesBounds | graphBounds/fit partial | fitView partial | gap | gap | Return/signature differs; Plan 046. |
| getHandleConnections | graph query partial | partial core query | gap | partial graph query | Result contract not matched. |
| getNodeConnections | graph query partial | partial core query | gap | partial graph query | Result contract not matched. |
| getIntersectingNodes | intersection helper partial | core geometry partial | core geometry partial | core geometry partial | Full signature/semantics unverified. |
| isNodeIntersecting | intersection helper partial | core geometry partial | core geometry partial | core geometry partial | Full signature/semantics unverified. |
| zoomIn | zoomViewportAt math | viewport controls | gap | gap | Animated instance method absent. |
| zoomOut | zoomViewportAt math | viewport controls | gap | gap | Animated instance method absent. |
| zoomTo | set-viewport command | updateViewport | updateViewport | ReplaceViewport | Animation/easing promise absent. |
| getZoom | Viewport.zoom | available via `getViewport()` | useFlow viewport | selectViewport | Scalar convenience absent. |
| setViewport | set-viewport command | updateViewport | updateViewport | ReplaceViewport | Animation options differ. |
| getViewport | ViewportSchema | `getViewport()` returns accepted viewport | useFlow viewport | selectViewport / snapshot request | JS, Vue, Foldkit accepted reads are covered by local adapter tests. |
| setCenter | viewport calculations partial | gap | gap | gap | Instance helper absent. |
| fitBounds | fit helper partial | gap | gap | gap | Low-level instance method absent. |
| screenToFlowPosition | core conversion helper | partial host helper | gap | gap | Core function exists; instance method absent. |
| flowToScreenPosition | core conversion helper | partial host helper | gap | gap | Core function exists; instance method absent. |
| viewportInitialized | gap | host lifecycle state | component mount | Runtime embed | Host lifecycle, not snapshot. |
| fitView | fitViewportToNodes | fitView method | gap | gap | Core helper; JS method only. |

## Hooks and remaining unassessed members

| Current member | Reference | J / V / F | Boundary |
| --- | --- | --- | --- |
| useReactFlow | [hook](https://reactflow.dev/api-reference/hooks/use-react-flow) | controller with bounded getters and accepted-state subscription / `useFlow` with readonly reactive snapshot and lookups / selectors and typed state ports | JS reads are point-in-time; Vue reads are computed and canvas-local; Foldkit is app-scoped. None is a complete React Flow instance. |
| useNodes | [hook](https://reactflow.dev/api-reference/hooks/use-nodes) | `getNodes()` plus `subscribeState` / `useNodes()` computed readonly array / `selectNodes` and accepted-state port | No granular node-only subscription; Vue invalidates with accepted document state; Foldkit selects from the model. |
| useEdges | [hook](https://reactflow.dev/api-reference/hooks/use-edges) | `getEdges()` plus `subscribeState` / `useEdges()` computed readonly array / `selectEdges` and accepted-state port | No granular edge-only subscription; Vue invalidates with accepted document state; Foldkit selects from the model. |
| useViewport | [hook](https://reactflow.dev/api-reference/hooks/use-viewport) | `getViewport()` plus `subscribeState` / `useViewport()` computed readonly value / `selectViewport` and accepted-state port | JS remains point-in-time; Vue invalidates reactively; Foldkit selects from the model. |
| useEdgesState, useNodesState, useConnection, useHandleConnections, useInternalNode, useKeyPress, useNodeConnections, useNodeId, useNodesData, useNodesInitialized, useOnSelectionChange, useOnViewportChange, useStore, useStoreApi, useUpdateNodeInternals | [current Hooks catalog](https://reactflow.dev/api-reference) | Unassessed in each host | Keep open in dated coverage map. |
| Other ReactFlow props not named in the preceding member table | [current ReactFlow props](https://reactflow.dev/api-reference/react-flow) | Unassessed in each host | Dated catalog retains every URL; map at later API milestones. |
| Other components, types, and utilities in current API sidebar | [API reference](https://reactflow.dev/api-reference) | Unassessed in each host | Broad API checklist remains open. |

The live pages were checked 2026-09-26; Node, Edge and ReactFlowInstance pages report last updated August 31, 2026. The catalog checker validates dated URLs/counts, not these member semantics. The pinned instance declaration at research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/instance.ts:25 remains separate historical evidence. This matrix records names and local analogues only; it does not establish live-site runtime parity, full API coverage, or equal semantics.

## Graph query utility correspondence

These three utilities accept already decoded Flow values and preserve the order and object identity of the supplied collections. Their public types use FlowNode and FlowEdge; Pick<FlowNode, 'id'> permits a node or ID-bearing selection. They do not apply hidden-state filtering. The legacy graphIncomers and graphOutgoers functions remain graph-view queries returning incident edges and are not aliases for the node-returning React Flow utilities.

| Current utility | Flow equivalent | Result ordering | Boundary |
| --- | --- | --- | --- |
| [getIncomers](https://reactflow.dev/api-reference/utils/get-incomers) | getIncomers(node, nodes, edges) | Unique supplied nodes in node input order | Pinned algorithm inspected; executable reference comparison remains unverified. |
| [getOutgoers](https://reactflow.dev/api-reference/utils/get-outgoers) | getOutgoers(node, nodes, edges) | Unique supplied nodes in node input order | Pinned algorithm inspected; executable reference comparison remains unverified. |
| [getConnectedEdges](https://reactflow.dev/api-reference/utils/get-connected-edges) | getConnectedEdges(nodes, edges) | Incident supplied edges in edge input order | Pinned algorithm inspected; executable reference comparison remains unverified. |

Flow utility tests cover directed endpoints, parallel edges, self-loops, hidden nodes, empty collections, missing IDs, selection subsets, stable ordering, and input immutability. This bounded implementation does not close graph bounds, intersection, or edge-path utility correspondence.
