# React Flow catalog coverage

Captured 2026-09-26 against Flow commit `9a583d7`, with pre-existing working-tree edits left intact. This is a discovery map for the definitive goal in [project progress](../PROGRESS.md). It maps sidebar entries to current building blocks and evidence, without claiming that a whole page's API or example has been reproduced.

## Baseline and counts

The [dated JSON snapshot](react-flow-2026-09-26.json) retains upstream URLs, labels, source-page SHA-256 values, capture date, and public Pro-list membership. Sources are the complete desktop sidebars of the [API reference](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI catalog](https://reactflow.dev/ui), plus the public [Pro examples listing](https://reactflow.dev/examples/pro-examples). The listed Pro entries are already included in the examples sidebar and are counted once.

| Catalog | Capability entries | Navigation entries | Total |
| --- | --- | --- | --- |
| API reference | 114 | 5 | 119 |
| Examples | 67 | 2 | 69 |
| UI components and templates | 19 | 1 | 20 |
| Total | 200 | 8 | 208 |

The API count includes 2 primary interfaces, 14 components, 19 hooks, 64 types, and 15 utilities. UI includes 17 components and 2 templates. Sixteen examples are marked Pro. Section headings without links and the external "Request a Component" action are navigation furniture, not capability pages. Every internal sidebar link is retained, including overview pages. This inventory does not count the individual props or methods inside an API page; that detailed correspondence remains open.

## Reading the map

- **P**: partial correspondence or a usable building block was located. This never means the entire upstream entry is implemented. For shared core types and helpers, P means the same import is available to callers in all three frameworks; adapter UI and integration still need proof.
- **G**: no matching public contract or complete recipe was identified in the inspected exports, host code, and checked-in examples. Related primitives may exist. This is a work item, not a claim that the capability is impossible.
- **N**: navigation entry; excluded from capability totals.
- **U**: full-entry reference parity is unverified. The two narrow comparisons described below remain useful evidence without closing their complete catalog entries.

Each row links to a local evidence section. Production pointers identify implementation contracts. Test pointers identify checked-in tests, not tests rerun for every row during this inventory. The three adapter columns are independent. No full-entry parity percentage can be inferred from these counts.

## API reference


### api-reference overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [API Reference](https://reactflow.dev/api-reference) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |
| [&lt;ReactFlow /&gt;](https://reactflow.dev/api-reference/react-flow) | [mountFlow / FlowCanvas / Foldkit View](#host) | P | P | P | U | Map every prop and event; current hosts expose different subsets. |
| [&lt;ReactFlowProvider /&gt;](https://reactflow.dev/api-reference/react-flow-provider) | [Controller lifetime / FlowEditorKey / Foldkit model](#host) | P | P | P | U | Map provider scope and outside-canvas access using native ownership. |
| [Components](https://reactflow.dev/api-reference/components) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |

### api-reference components

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [&lt;Background /&gt;](https://reactflow.dev/api-reference/components/background) | [CanvasBackgroundSchema](#canvas-ui) | P | G | G | U | Compare patterns/options; provide framework APIs. |
| [&lt;BaseEdge /&gt;](https://reactflow.dev/api-reference/components/base-edge) | [FlowEdgeRenderer / Vue default SVG path](#rendering) | P | P | G | U | Expose a reusable edge primitive and complete its props. |
| [&lt;ControlButton /&gt;](https://reactflow.dev/api-reference/components/control-button) | [No standalone exported control primitive](#open-api) | G | G | G | U | Define reusable button integration for each framework. |
| [&lt;Controls /&gt;](https://reactflow.dev/api-reference/components/controls) | [CanvasUISchema.controls](#canvas-ui) | P | G | G | U | Compare controls and options; framework controls remain open. |
| [&lt;EdgeLabelRenderer /&gt;](https://reactflow.dev/api-reference/components/edge-label-renderer) | [Custom edge label host](#labels) | P | G | G | U | Compare HTML label placement, portals, and interaction ownership. |
| [&lt;EdgeText /&gt;](https://reactflow.dev/api-reference/components/edge-text) | [SVG text labels](#labels) | P | G | G | U | Map text/background props and expose reusable components. |
| [&lt;EdgeToolbar /&gt;](https://reactflow.dev/api-reference/components/edge-toolbar) | [toolbarContainers.edges](#toolbars) | P | G | G | U | Compare placement/visibility API and port to adapters. |
| [&lt;Handle /&gt;](https://reactflow.dev/api-reference/components/handle) | [FlowHandle + host-rendered buttons](#connections) | P | P | P | U | Map handle props, modes, measurement, and interactions per adapter. |
| [&lt;MiniMap /&gt;](https://reactflow.dev/api-reference/components/minimap) | [CanvasUISchema.minimap](#canvas-ui) | P | G | G | U | Compare node rendering/options and framework support. |
| [&lt;NodeResizeControl /&gt;](https://reactflow.dev/api-reference/components/node-resize-control) | [Directional host resize controls](#resize) | P | G | G | U | Expose configurable controls in each adapter; compare callbacks and constraints. |
| [&lt;NodeResizer /&gt;](https://reactflow.dev/api-reference/components/node-resizer) | [Eight-direction vanilla resize](#resize) | P | G | G | U | Compare full API and lifecycle; implement adapter equivalents. |
| [&lt;NodeToolbar /&gt;](https://reactflow.dev/api-reference/components/node-toolbar) | [toolbarContainers.nodes](#toolbars) | P | G | G | U | Compare placement/visibility API and port to adapters. |
| [&lt;Panel /&gt;](https://reactflow.dev/api-reference/components/panel) | [panels / CanvasPanelPlacement](#panels) | P | G | G | U | Compare props/placement and add framework components. |
| [&lt;ViewportPortal /&gt;](https://reactflow.dev/api-reference/components/viewport-portal) | [overlayPortal is only a related building block](#panels) | P | G | G | U | Provide graph-coordinate content that follows the viewport transform. |

### api-reference overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Hooks](https://reactflow.dev/api-reference/hooks) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |

### api-reference hooks

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [useConnection()](https://reactflow.dev/api-reference/hooks/use-connection) | [ActiveConnection is internal state backing](#open-api) | G | G | G | U | Expose a reactive connection-state API. |
| [useEdges()](https://reactflow.dev/api-reference/hooks/use-edges) | [Caller document.edges / Vue document / Foldkit model](#state) | P | P | P | U | Define dedicated reactive edge access and update semantics. |
| [useEdgesState()](https://reactflow.dev/api-reference/hooks/use-edges-state) | [Controlled/uncontrolled document ownership](#state) | P | P | P | U | Map array/change-handler convenience without requiring React state. |
| [useHandleConnections()](https://reactflow.dev/api-reference/hooks/use-handle-connections) | [Graph topology and handle IDs are backing](#open-api) | G | G | G | U | Provide handle-filtered reactive connection access. |
| [useInternalNode()](https://reactflow.dev/api-reference/hooks/use-internal-node) | [Graph view and measured geometry](#measurements) | P | P | G | U | Expose stable observable internal-node access without DOM in core. |
| [useKeyPress()](https://reactflow.dev/api-reference/hooks/use-key-press) | [Host keyboard handlers only](#open-api) | G | G | G | U | Provide a reusable key-state API with focus rules. |
| [useNodeConnections()](https://reactflow.dev/api-reference/hooks/use-node-connections) | [Graph topology is backing](#open-api) | G | G | G | U | Provide node-filtered reactive connection access. |
| [useNodeId()](https://reactflow.dev/api-reference/hooks/use-node-id) | [Renderer/slot receives node.id explicitly](#open-api) | G | G | G | U | Decide idiomatic descendant node context for each framework. |
| [useNodes()](https://reactflow.dev/api-reference/hooks/use-nodes) | [Caller nodes / Vue useFlow().nodes / Foldkit model](#state) | P | P | P | U | Match subscription and ownership semantics. |
| [useNodesData()](https://reactflow.dev/api-reference/hooks/use-nodes-data) | [FlowNode.data through document state](#state) | P | P | P | U | Add selective data observation and typed update semantics. |
| [useNodesInitialized()](https://reactflow.dev/api-reference/hooks/use-nodes-initialized) | [Host measurement lifecycle](#measurements) | P | P | G | U | Expose readiness with equivalent hidden-node semantics. |
| [useNodesState()](https://reactflow.dev/api-reference/hooks/use-nodes-state) | [Controlled/uncontrolled document ownership](#state) | P | P | P | U | Map node/change-handler convenience per framework. |
| [useOnSelectionChange()](https://reactflow.dev/api-reference/hooks/use-on-selection-change) | [SelectionSetChange / node and edge selection](#changes) | P | G | G | U | Map selected collections and callback timing across adapters. |
| [useOnViewportChange()](https://reactflow.dev/api-reference/hooks/use-on-viewport-change) | [ViewportChange / Vue viewport updates](#changes) | P | P | G | U | Define start/change/end subscription semantics. |
| [useReactFlow()](https://reactflow.dev/api-reference/hooks/use-react-flow) | [Controller / useFlow / Model and Message](#state) | P | P | P | U | Map instance methods, query access, and reactivity differences. |
| [useStore()](https://reactflow.dev/api-reference/hooks/use-store) | [No equivalent store selector contract](#open-api) | G | G | G | U | Define supported reactive selection without adopting React store internals. |
| [useStoreApi()](https://reactflow.dev/api-reference/hooks/use-store-api) | [No equivalent public store access](#open-api) | G | G | G | U | Decide supported imperative access and lifetime. |
| [useUpdateNodeInternals()](https://reactflow.dev/api-reference/hooks/use-update-node-internals) | [ResizeObserver-fed measurements](#measurements) | P | P | G | U | Expose an explicit refresh operation and dynamic handle proof. |
| [useViewport()](https://reactflow.dev/api-reference/hooks/use-viewport) | [Viewport state / Vue useFlow().viewport / Foldkit model](#state) | P | P | P | U | Compare subscriptions and viewport ownership. |

### api-reference overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Types](https://reactflow.dev/api-reference/types) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |

### api-reference types

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Align](https://reactflow.dev/api-reference/types/align) | [No matching exported contract identified](#open-api) | G | G | G | U | Map toolbar alignment options. |
| [AriaLabelConfig](https://reactflow.dev/api-reference/types/aria-label-config) | [Per-node ariaLabel / ariaDescription and host strings](#input) | P | G | G | U | Add complete localized canvas, edge, control, and live-region labels. |
| [BackgroundVariant](https://reactflow.dev/api-reference/types/background-variant) | [CanvasBackgroundSchema.pattern](#canvas-ui) | P | G | G | U | Compare complete variant vocabulary and API shape. |
| [ColorMode](https://reactflow.dev/api-reference/types/color-mode) | [No matching exported contract identified](#open-api) | G | G | G | U | Add system/light/dark appearance control. |
| [Connection](https://reactflow.dev/api-reference/types/connection) | [FlowConnection](#schema) | P | P | P | U | Compare field and nullability contracts. |
| [ConnectionLineComponent](https://reactflow.dev/api-reference/types/connection-line-component) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose custom connection preview rendering. |
| [ConnectionLineComponentProps](https://reactflow.dev/api-reference/types/connection-line-component-props) | [No matching exported contract identified](#open-api) | G | G | G | U | Define preview renderer context. |
| [ConnectionLineType](https://reactflow.dev/api-reference/types/connection-line-type) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose all configurable preview path choices. |
| [ConnectionMode](https://reactflow.dev/api-reference/types/connection-mode) | [connectOnClick is related but not equivalent](#input) | P | G | G | U | Map strict/loose handle direction semantics separately from click mode. |
| [ConnectionState](https://reactflow.dev/api-reference/types/connection-state) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose reactive connection state. |
| [CoordinateExtent](https://reactflow.dev/api-reference/types/coordinate-extent) | [NodeExtent / PanExtent](#schema) | P | P | P | U | Compare tuple versus object representation and infinity handling. |
| [DefaultEdgeOptions](https://reactflow.dev/api-reference/types/default-edge-options) | [No matching exported contract identified](#open-api) | G | G | G | U | Define reusable edge defaults. |
| [DeleteElements](https://reactflow.dev/api-reference/types/delete-elements) | [No matching exported contract identified](#open-api) | G | G | G | U | Add the full element-deletion operation and result. |
| [Edge](https://reactflow.dev/api-reference/types/edge) | [FlowEdge](#schema) | P | P | P | U | Compare fields, extensibility, defaults, and typed data. |
| [EdgeChange](https://reactflow.dev/api-reference/types/edge-change) | [FlowChange edge variants](#schema) | P | P | P | U | Compare variants and incremental versus final event timing. |
| [EdgeMarker](https://reactflow.dev/api-reference/types/edge-marker) | [FlowEdgeMarker](#schema) | P | P | P | U | Current marker enum lacks the full marker options object. |
| [EdgeMouseHandler](https://reactflow.dev/api-reference/types/edge-mouse-handler) | [No matching exported contract identified](#open-api) | G | G | G | U | Map edge pointer callback payloads. |
| [EdgeProps](https://reactflow.dev/api-reference/types/edge-props) | [FlowEdgeRenderContext / Vue edge slot](#rendering) | P | P | G | U | Map renderer props and update lifecycle. |
| [EdgeTypes](https://reactflow.dev/api-reference/types/edge-types) | [edgeRenderers / Vue edgeComponent](#rendering) | P | P | G | U | Add typed registry equivalence; Vue currently takes one component. |
| [FitViewOptions](https://reactflow.dev/api-reference/types/fit-view-options) | [FitViewOptionsSchema / fitViewportToNodes](#resize) | P | G | G | U | Map full options; reusable Vue and Foldkit fit API remains open. |
| [Handle](https://reactflow.dev/api-reference/types/handle) | [FlowHandle / MeasuredHandle](#schema) | P | P | P | U | Compare identity, position, measurement, and direction fields. |
| [HandleConnection](https://reactflow.dev/api-reference/types/handle-connection) | [FlowEdge endpoint IDs](#schema) | P | P | P | U | Define connection query return records. |
| [InternalNode](https://reactflow.dev/api-reference/types/internal-node) | [FlowGraphNode / MeasuredNode](#schema) | P | P | P | U | Map internal geometry and observable update semantics. |
| [IsValidConnection](https://reactflow.dev/api-reference/types/is-valid-connection) | [FlowConnectionValidator / Vue predicate / Foldkit allowed targets](#connections) | P | P | P | U | Unify candidate payload and acceptance semantics across adapters. |
| [KeyCode](https://reactflow.dev/api-reference/types/key-code) | [No matching exported contract identified](#open-api) | G | G | G | U | Define consumer keyboard configuration. |
| [MarkerType](https://reactflow.dev/api-reference/types/marker-type) | [FlowEdgeMarker](#schema) | P | P | P | U | Compare marker values and exported names. |
| [MiniMapNodeProps](https://reactflow.dev/api-reference/types/mini-map-node-props) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose minimap node rendering customization. |
| [Node](https://reactflow.dev/api-reference/types/node) | [FlowNode](#schema) | P | P | P | U | Compare all fields; arbitrary framework data and style remain adapter concerns. |
| [NodeChange](https://reactflow.dev/api-reference/types/node-change) | [FlowChange node variants](#schema) | P | P | P | U | Compare every node-change variant and event timing. |
| [NodeConnection](https://reactflow.dev/api-reference/types/node-connection) | [FlowEdge endpoint IDs](#schema) | P | P | P | U | Define connection query result types. |
| [NodeHandle](https://reactflow.dev/api-reference/types/node-handle) | [FlowHandle / MeasuredHandle](#schema) | P | P | P | U | Compare serializable versus measured handle fields. |
| [NodeMouseHandler](https://reactflow.dev/api-reference/types/node-mouse-handler) | [No matching exported contract identified](#open-api) | G | G | G | U | Map node pointer callback payloads. |
| [NodeOrigin](https://reactflow.dev/api-reference/types/node-origin) | [No matching exported contract identified](#open-api) | G | G | G | U | Define node origin/anchor semantics. |
| [NodeProps](https://reactflow.dev/api-reference/types/node-props) | [FlowNodeRenderer / Vue node slot](#rendering) | P | P | G | U | Map renderer props and reactive context. |
| [NodeTypes](https://reactflow.dev/api-reference/types/node-types) | [nodeRenderers / Vue nodeComponent](#rendering) | P | P | G | U | Add typed registry equivalence; Vue currently takes one component. |
| [OnBeforeDelete](https://reactflow.dev/api-reference/types/on-before-delete) | [No matching exported contract identified](#open-api) | G | G | G | U | Add asynchronous deletion veto/transform semantics. |
| [OnConnect](https://reactflow.dev/api-reference/types/on-connect) | [edge-add semantic change](#changes) | P | P | P | U | Compare callback payload and timing. |
| [OnConnectEnd](https://reactflow.dev/api-reference/types/on-connect-end) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose connection completion/cancellation callbacks. |
| [OnConnectStart](https://reactflow.dev/api-reference/types/on-connect-start) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose connection-start callbacks. |
| [OnDelete](https://reactflow.dev/api-reference/types/on-delete) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose aggregate deletion callback. |
| [OnEdgesChange](https://reactflow.dev/api-reference/types/on-edges-change) | [FlowChange / Vue update:edges / Foldkit OutMessage](#changes) | P | P | P | U | Map full edge delta semantics. |
| [OnEdgesDelete](https://reactflow.dev/api-reference/types/on-edges-delete) | [edge-remove semantic change](#changes) | P | G | G | U | Map deleted collection and callback ordering. |
| [OnError](https://reactflow.dev/api-reference/types/on-error) | [No matching exported contract identified](#open-api) | G | G | G | U | Define public diagnostic callback semantics. |
| [OnInit](https://reactflow.dev/api-reference/types/on-init) | [No matching exported contract identified](#open-api) | G | G | G | U | Define initialization callback and instance readiness. |
| [OnMove](https://reactflow.dev/api-reference/types/on-move) | [ViewportChange](#changes) | P | P | G | U | Map start/move/end events and browser event metadata. |
| [OnNodeDrag](https://reactflow.dev/api-reference/types/on-node-drag) | [Final node-position changes](#changes) | P | P | P | U | Compare start/drag/stop callbacks and incremental events. |
| [OnNodesChange](https://reactflow.dev/api-reference/types/on-nodes-change) | [FlowChange / Vue update:nodes / Foldkit OutMessage](#changes) | P | P | P | U | Map full node delta semantics. |
| [OnNodesDelete](https://reactflow.dev/api-reference/types/on-nodes-delete) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose deleted node collections. |
| [OnReconnect](https://reactflow.dev/api-reference/types/on-reconnect) | [edge-reconnect semantic change](#changes) | P | G | G | U | Map endpoint callback payload and lifecycle. |
| [OnSelectionChangeFunc](https://reactflow.dev/api-reference/types/on-selection-change-func) | [SelectionSetChange](#changes) | P | G | G | U | Map selected object arrays and callback timing. |
| [PanOnScrollMode](https://reactflow.dev/api-reference/types/pan-on-scroll-mode) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose directional scroll-panning modes. |
| [PanelPosition](https://reactflow.dev/api-reference/types/panel-position) | [CanvasPanelPlacement](#panels) | P | G | G | U | Compare six placement values and component API. |
| [Position](https://reactflow.dev/api-reference/types/position) | [FlowHandle.side](#schema) | P | P | P | U | Map positional enum names and consumer types. |
| [ProOptions](https://reactflow.dev/api-reference/types/pro-options) | [No matching exported contract identified](#open-api) | G | G | G | U | Map relevant attribution options; subscription metadata is upstream-specific. |
| [ReactFlowInstance](https://reactflow.dev/api-reference/types/react-flow-instance) | [Controller / useFlow / Foldkit Model and Message](#changes) | P | P | P | U | Inventory each method and map missing operations. |
| [ReactFlowJsonObject](https://reactflow.dev/api-reference/types/react-flow-json-object) | [SavedFlowDocument](#persistence) | P | P | P | U | Versioned document omits viewport and selection; map save/restore contracts. |
| [Rect](https://reactflow.dev/api-reference/types/rect) | [FlowRect](#schema) | P | P | P | U | Compare accepted values and API usage. |
| [ResizeParams](https://reactflow.dev/api-reference/types/resize-params) | [NodeBoundsChange / resize calculation](#schema) | P | P | P | U | Map resize callback payloads and direction fields. |
| [SelectionDragHandler](https://reactflow.dev/api-reference/types/selection-drag-handler) | [No matching exported contract identified](#open-api) | G | G | G | U | Expose selection drag callback context. |
| [SelectionMode](https://reactflow.dev/api-reference/types/selection-mode) | [SelectionMode](#schema) | P | P | P | U | Compare values and default behavior in adapters. |
| [SnapGrid](https://reactflow.dev/api-reference/types/snap-grid) | [SnapGrid](#schema) | P | P | P | U | Compare representation and option placement. |
| [Viewport](https://reactflow.dev/api-reference/types/viewport) | [Viewport](#schema) | P | P | P | U | Compare defaults, constraints, and public usage. |
| [XYPosition](https://reactflow.dev/api-reference/types/xy-position) | [XYPosition](#schema) | P | P | P | U | Compare exported shape and numeric validation. |
| [ZIndexMode](https://reactflow.dev/api-reference/types/z-index-mode) | [No matching exported contract identified](#open-api) | G | G | G | U | Map configurable stacking mode; zIndex alone is insufficient. |

### api-reference overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Utils](https://reactflow.dev/api-reference/utils) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |

### api-reference utils

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [addEdge()](https://reactflow.dev/api-reference/utils/add-edge) | [nextConnectionEdge / edge-add](#changes) | P | P | P | U | Map duplicate handling and return semantics. |
| [applyEdgeChanges()](https://reactflow.dev/api-reference/utils/apply-edge-changes) | [applyEdgeSelectionChange / reconnect / remove](#changes) | P | P | P | U | Provide full ordered change-array behavior. |
| [applyNodeChanges()](https://reactflow.dev/api-reference/utils/apply-node-changes) | [applyNodePositionChange / size / bounds / selection](#changes) | P | P | P | U | Provide full ordered change-array behavior. |
| [getBezierPath()](https://reactflow.dev/api-reference/utils/get-bezier-path) | [bezierEdgePath + edgeLabelPosition](#geometry) | P | P | P | U | Compare parameters and tuple outputs; current path helper returns a path string. |
| [getConnectedEdges()](https://reactflow.dev/api-reference/utils/get-connected-edges) | [Document edge endpoints; no same-name helper](#geometry) | P | P | P | U | Add equivalent incident-edge query with identical input/output semantics. |
| [getIncomers()](https://reactflow.dev/api-reference/utils/get-incomers) | [graphIncomers](#geometry) | P | P | P | U | Current helper returns incoming edges; upstream utility returns nodes. |
| [getNodesBounds()](https://reactflow.dev/api-reference/utils/get-nodes-bounds) | [graphBounds](#geometry) | P | P | P | U | Compare origins, measured sizes, hidden nodes, and empty input. |
| [getOutgoers()](https://reactflow.dev/api-reference/utils/get-outgoers) | [graphOutgoers](#geometry) | P | P | P | U | Current helper returns outgoing edges; map to outgoing nodes. |
| [getSimpleBezierPath()](https://reactflow.dev/api-reference/utils/get-simple-bezier-path) | [simpleBezierEdgePath + edgeLabelPosition](#geometry) | P | P | P | U | Compare params and tuple outputs. |
| [getSmoothStepPath()](https://reactflow.dev/api-reference/utils/get-smooth-step-path) | [smoothStepEdgePath + stepEdgeLabelPosition](#geometry) | P | P | P | U | Compare route options and tuple outputs. |
| [getStraightPath()](https://reactflow.dev/api-reference/utils/get-straight-path) | [straightEdgePath + edgeLabelPosition](#geometry) | P | P | P | U | Compare params and tuple outputs. |
| [getViewportForBounds()](https://reactflow.dev/api-reference/utils/get-viewport-for-bounds) | [fitViewportToNodes](#geometry) | P | P | P | U | Provide direct bounds input and compare padding/zoom behavior. |
| [isEdge()](https://reactflow.dev/api-reference/utils/is-edge) | [Schema decoding is related validation](#open-api) | G | G | G | U | Add public narrowing predicate with matching discrimination semantics. |
| [isNode()](https://reactflow.dev/api-reference/utils/is-node) | [Schema decoding is related validation](#open-api) | G | G | G | U | Add public narrowing predicate with matching discrimination semantics. |
| [reconnectEdge()](https://reactflow.dev/api-reference/utils/reconnect-edge) | [reconnectFlowEdge / applyEdgeReconnectChange](#connections) | P | P | P | U | Compare IDs, replacement options, and document update semantics. |

## Examples


### examples overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [All Examples](https://reactflow.dev/examples) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |
| [Pro Examples](https://reactflow.dev/examples/pro-examples) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |
| [Feature Overview](https://reactflow.dev/examples/overview) | [Three runnable hosts](#host) | P | P | P | U | Build and compare the complete feature overview per framework. |

### examples nodes

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Add Node On Edge Drop](https://reactflow.dev/examples/nodes/add-node-on-edge-drop) | [No equivalent example identified](#open-example) | G | G | G | U | Add node creation from failed connection drop. |
| [Connection Limit](https://reactflow.dev/examples/nodes/connection-limit) | [Connection validators](#connections) | P | P | P | U | Implement and demonstrate per-handle limits. |
| [Custom Nodes](https://reactflow.dev/examples/nodes/custom-node) | [Custom renderer / Vue component and slot](#rendering) | P | P | G | U | Build equivalent interactive custom-node example. |
| [Delete Middle Node](https://reactflow.dev/examples/nodes/delete-middle-node) | [No equivalent example identified](#open-example) | G | G | G | U | Add deletion plus reconnection recipe. |
| [Drag Handle](https://reactflow.dev/examples/nodes/drag-handle) | [data-flow-drag-handle marker](#drag) | P | G | G | U | Port custom-handle ownership to adapters; retain narrow pinned proof. |
| [Easy Connect](https://reactflow.dev/examples/nodes/easy-connect) | [Handle connection gestures](#connections) | P | P | P | U | Demonstrate the exact node-body connection recipe. |
| [Intersections](https://reactflow.dev/examples/nodes/intersections) | [graphNodesIntersecting](#geometry) | P | P | P | U | Build rendered intersection-feedback recipe per framework. |
| [Node Resizer](https://reactflow.dev/examples/nodes/node-resizer) | [Eight-direction resize demo](#resize) | P | G | G | U | Build equivalent controls and callbacks in all adapters. |
| [Node Toolbar](https://reactflow.dev/examples/nodes/node-toolbar) | [Anchored toolbar containers](#toolbars) | P | G | G | U | Build toolbar recipe per framework. |
| [Proximity Connect](https://reactflow.dev/examples/nodes/proximity-connect) | [No equivalent example identified](#open-example) | G | G | G | U | Implement nearest-node connection recipe. |
| [Rotatable Node](https://reactflow.dev/examples/nodes/rotatable-node) | [No equivalent example identified](#open-example) | G | G | G | U | Implement rotation, handle geometry, and controls. |
| [Node Position Animation · Pro](https://reactflow.dev/examples/nodes/node-position-animation) | [No equivalent example identified](#open-example) | G | G | G | U | Implement layout transition animation. |
| [Stress Test](https://reactflow.dev/examples/nodes/stress) | [Vanilla 250/1000/4000-node benchmark](#performance) | P | G | G | U | Match stress scenario and establish adapter-specific budgets. |
| [Updating Nodes](https://reactflow.dev/examples/nodes/update-node) | [Controlled keyed document updates](#state) | P | P | P | U | Map all demonstrated data/style/visibility changes. |
| [Shapes · Pro](https://reactflow.dev/examples/nodes/shapes) | [No equivalent example identified](#open-example) | G | G | G | U | Provide graph-specific shape nodes. |

### examples edges

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Animating Edges](https://reactflow.dev/examples/edges/animating-edges) | [No equivalent example identified](#open-example) | G | G | G | U | Implement edge animation recipe. |
| [Custom Connection Line](https://reactflow.dev/examples/edges/custom-connectionline) | [No equivalent example identified](#open-example) | G | G | G | U | Expose custom connection preview renderer. |
| [Custom Edges](https://reactflow.dev/examples/edges/custom-edges) | [Edge renderer / Vue edge component](#rendering) | P | P | G | U | Demonstrate custom edge behavior and interactions. |
| [Delete Edge on Drop](https://reactflow.dev/examples/edges/delete-edge-on-drop) | [No equivalent example identified](#open-example) | G | G | G | U | Implement reconnection-drop deletion policy. |
| [Edge Label Renderer](https://reactflow.dev/examples/edges/edge-label-renderer) | [Custom edge labels](#labels) | P | G | G | U | Build equivalent interactive HTML-label example. |
| [Edge Intersection](https://reactflow.dev/examples/edges/edge-intersection) | [No equivalent example identified](#open-example) | G | G | G | U | Implement edge intersection detection and display. |
| [Edge Toolbar](https://reactflow.dev/examples/edges/edge-toolbar) | [Anchored edge toolbar](#toolbars) | P | G | G | U | Port and demonstrate toolbar interactions. |
| [Edge Types](https://reactflow.dev/examples/edges/edge-types) | [Core paths / vanilla renderer / Vue SVG default](#rendering) | P | P | G | U | Compare every path type and styling option. |
| [Edge Routing · Pro](https://reactflow.dev/examples/edges/edge-routing) | [No equivalent example identified](#open-example) | G | G | G | U | Integrate obstacle-aware routing. |
| [Floating Edges](https://reactflow.dev/examples/edges/floating-edges) | [No equivalent example identified](#open-example) | G | G | G | U | Implement dynamic boundary attachment. |
| [Edge Markers](https://reactflow.dev/examples/edges/markers) | [Arrow marker support](#labels) | P | G | G | U | Compare all marker customization shown in the example. |
| [Multi Connection Line](https://reactflow.dev/examples/edges/multi-connection-line) | [No equivalent example identified](#open-example) | G | G | G | U | Implement concurrent connection preview recipe. |
| [Reconnect Edge](https://reactflow.dev/examples/edges/reconnect-edge) | [Vanilla endpoint reconnection](#connections) | P | G | G | U | Build equivalent reconnection recipe and adapter interactions. |
| [Simple Floating Edges](https://reactflow.dev/examples/edges/simple-floating-edges) | [No equivalent example identified](#open-example) | G | G | G | U | Implement simplified boundary-attached edges. |
| [Temporary Edges](https://reactflow.dev/examples/edges/temporary-edges) | [No equivalent example identified](#open-example) | G | G | G | U | Implement temporary edge lifecycle. |
| [Editable Edge · Pro](https://reactflow.dev/examples/edges/editable-edge) | [No equivalent example identified](#open-example) | G | G | G | U | Implement draggable path control points. |

### examples interaction

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Computing Flows](https://reactflow.dev/examples/interaction/computing-flows) | [No equivalent example identified](#open-example) | G | G | G | U | Implement data propagation and reactive computations. |
| [Connection Events](https://reactflow.dev/examples/interaction/connection-events) | [edge-add semantic changes](#changes) | P | P | P | U | Add start/end/cancel event coverage and example output. |
| [Context Menu](https://reactflow.dev/examples/interaction/context-menu) | [No equivalent example identified](#open-example) | G | G | G | U | Provide context-menu event and overlay recipe. |
| [Contextual Zoom](https://reactflow.dev/examples/interaction/contextual-zoom) | [No equivalent example identified](#open-example) | G | G | G | U | Render content conditioned on viewport zoom. |
| [Drag and Drop](https://reactflow.dev/examples/interaction/drag-and-drop) | [No equivalent example identified](#open-example) | G | G | G | U | Add external palette drop and coordinate conversion recipe. |
| [Preventing Cycles](https://reactflow.dev/examples/interaction/prevent-cycles) | [No equivalent example identified](#open-example) | G | G | G | U | Add directed-edge cycle prevention; parent-cycle validation is a different contract. |
| [Save and Restore](https://reactflow.dev/examples/interaction/save-and-restore) | [SavedFlowDocument](#persistence) | P | P | P | U | Build browser recipe; explicitly map viewport persistence. |
| [Touch Device](https://reactflow.dev/examples/interaction/touch-device) | [Vanilla touch pan/pinch tests](#input) | P | G | G | U | Add complete touch recipe; native multi-contact lifecycle remains unverified. |
| [Validation](https://reactflow.dev/examples/interaction/validation) | [Host-specific validators](#connections) | P | P | P | U | Align candidate contracts and demonstrate the recipe per framework. |
| [Helper Lines · Pro](https://reactflow.dev/examples/interaction/helper-lines) | [No equivalent example identified](#open-example) | G | G | G | U | Add alignment guides and snapping. |
| [Collaborative · Pro](https://reactflow.dev/examples/interaction/collaborative) | [No equivalent example identified](#open-example) | G | G | G | U | Add collaboration integration and shared-state ownership. |
| [Copy and Paste · Pro](https://reactflow.dev/examples/interaction/copy-paste) | [No equivalent example identified](#open-example) | G | G | G | U | Add graph clipboard, identifier remapping, and paste placement. |
| [Undo and Redo · Pro](https://reactflow.dev/examples/interaction/undo-redo) | [No equivalent example identified](#open-example) | G | G | G | U | Add graph command history and restoration. |

### examples grouping

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Selection Grouping · Pro](https://reactflow.dev/examples/grouping/selection-grouping) | [No equivalent example identified](#open-example) | G | G | G | U | Add dynamic grouping/ungrouping from selection. |
| [Parent Child Relation · Pro](https://reactflow.dev/examples/grouping/parent-child-relation) | [No equivalent example identified](#open-example) | G | G | G | U | Add drag-driven attachment and detachment. |
| [Sub Flow](https://reactflow.dev/examples/grouping/sub-flows) | [Parent-relative nested documents](#hierarchy) | P | P | P | U | Build complete subflow interaction example per adapter. |

### examples layout

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Dagre Tree](https://reactflow.dev/examples/layout/dagre) | [No equivalent example identified](#open-example) | G | G | G | U | Provide Dagre integration recipe. |
| [Elkjs Tree](https://reactflow.dev/examples/layout/elkjs) | [No equivalent example identified](#open-example) | G | G | G | U | Provide ELK integration recipe. |
| [Elkjs Multiple Handles](https://reactflow.dev/examples/layout/elkjs-multiple-handles) | [No equivalent example identified](#open-example) | G | G | G | U | Provide ELK multiple-handle recipe. |
| [Horizontal Flow](https://reactflow.dev/examples/layout/horizontal) | [No equivalent example identified](#open-example) | G | G | G | U | Provide horizontal layout recipe. |
| [Expand and Collapse · Pro](https://reactflow.dev/examples/layout/expand-collapse) | [No equivalent example identified](#open-example) | G | G | G | U | Provide hierarchical expand/collapse and layout. |
| [Auto Layout · Pro](https://reactflow.dev/examples/layout/auto-layout) | [No equivalent example identified](#open-example) | G | G | G | U | Provide automatic layout integration. |
| [Force Layout · Pro](https://reactflow.dev/examples/layout/force-layout) | [No equivalent example identified](#open-example) | G | G | G | U | Provide force simulation integration. |
| [Dynamic Layouting · Pro](https://reactflow.dev/examples/layout/dynamic-layouting) | [No equivalent example identified](#open-example) | G | G | G | U | Provide layout updates during graph edits. |
| [Node Collisions](https://reactflow.dev/examples/layout/node-collisions) | [No equivalent example identified](#open-example) | G | G | G | U | Provide collision response recipe; rectangle queries alone are insufficient. |

### examples styling

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Base Style](https://reactflow.dev/examples/styling/base-style) | [Separate adapter CSS](#styles) | P | P | P | U | Compare base styling hooks and theming contract. |
| [Dark Mode](https://reactflow.dev/examples/styling/dark-mode) | [No equivalent example identified](#open-example) | G | G | G | U | Provide theme switching. |
| [Tailwind](https://reactflow.dev/examples/styling/tailwind) | [No equivalent example identified](#open-example) | G | G | G | U | Provide framework-appropriate styling integration. |
| [Turbo Flow](https://reactflow.dev/examples/styling/turbo-flow) | [No equivalent example identified](#open-example) | G | G | G | U | Reproduce the composed custom visual example. |

### examples whiteboard

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Eraser Tool](https://reactflow.dev/examples/whiteboard/eraser) | [No equivalent example identified](#open-example) | G | G | G | U | Add eraser gesture and deletion behavior. |
| [Lasso Selection](https://reactflow.dev/examples/whiteboard/lasso-selection) | [No equivalent example identified](#open-example) | G | G | G | U | Add free-form selection geometry. |
| [Rectangle](https://reactflow.dev/examples/whiteboard/rectangle) | [No equivalent example identified](#open-example) | G | G | G | U | Add rectangle drawing; selection rectangle is a different capability. |
| [Freehand Draw · Pro](https://reactflow.dev/examples/whiteboard/freehand-draw) | [No equivalent example identified](#open-example) | G | G | G | U | Add stroke drawing, storage, and interaction. |

### examples misc

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Download Image](https://reactflow.dev/examples/misc/download-image) | [No equivalent example identified](#open-example) | G | G | G | U | Provide client image export. |
| [Server Side Image Creation · Pro](https://reactflow.dev/examples/misc/server-side-image-creation) | [No equivalent example identified](#open-example) | G | G | G | U | Provide server rendering/capture integration. |

## UI components and templates


### ui overview

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Introduction](https://reactflow.dev/ui) | [Catalog navigation](#navigation) | N | N | N | N | Retained to make sidebar coverage auditable; not a feature denominator. |

### ui templates

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [AI Workflow Editor](https://reactflow.dev/ui/templates/ai-workflow-editor) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build AI Workflow Editor equivalent in each framework; renderer primitives alone do not close this entry. |
| [Workflow Editor](https://reactflow.dev/ui/templates/workflow-editor) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Workflow Editor equivalent in each framework; renderer primitives alone do not close this entry. |

### ui components

| Entry | Flow starting point and evidence | Vanilla | Vue | Foldkit | Reference | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| [Base Node](https://reactflow.dev/ui/components/base-node) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Base Node equivalent in each framework; renderer primitives alone do not close this entry. |
| [Status Indicator](https://reactflow.dev/ui/components/node-status-indicator) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Status Indicator equivalent in each framework; renderer primitives alone do not close this entry. |
| [Appendix](https://reactflow.dev/ui/components/node-appendix) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Appendix equivalent in each framework; renderer primitives alone do not close this entry. |
| [Tooltip](https://reactflow.dev/ui/components/node-tooltip) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Tooltip equivalent in each framework; renderer primitives alone do not close this entry. |
| [Database Schema](https://reactflow.dev/ui/components/database-schema-node) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Database Schema equivalent in each framework; renderer primitives alone do not close this entry. |
| [Placeholder](https://reactflow.dev/ui/components/placeholder-node) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Placeholder equivalent in each framework; renderer primitives alone do not close this entry. |
| [Labeled Group](https://reactflow.dev/ui/components/labeled-group-node) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Labeled Group equivalent in each framework; renderer primitives alone do not close this entry. |
| [Base Handle](https://reactflow.dev/ui/components/base-handle) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Base Handle equivalent in each framework; renderer primitives alone do not close this entry. |
| [Labeled Handle](https://reactflow.dev/ui/components/labeled-handle) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Labeled Handle equivalent in each framework; renderer primitives alone do not close this entry. |
| [Button Handle](https://reactflow.dev/ui/components/button-handle) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Button Handle equivalent in each framework; renderer primitives alone do not close this entry. |
| [Edge with Button](https://reactflow.dev/ui/components/button-edge) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Edge with Button equivalent in each framework; renderer primitives alone do not close this entry. |
| [Edge with Node Data](https://reactflow.dev/ui/components/data-edge) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Edge with Node Data equivalent in each framework; renderer primitives alone do not close this entry. |
| [Animated SVG Edge](https://reactflow.dev/ui/components/animated-svg-edge) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Animated SVG Edge equivalent in each framework; renderer primitives alone do not close this entry. |
| [Node Search](https://reactflow.dev/ui/components/node-search) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Node Search equivalent in each framework; renderer primitives alone do not close this entry. |
| [Zoom Slider](https://reactflow.dev/ui/components/zoom-slider) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Zoom Slider equivalent in each framework; renderer primitives alone do not close this entry. |
| [Zoom Select](https://reactflow.dev/ui/components/zoom-select) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build Zoom Select equivalent in each framework; renderer primitives alone do not close this entry. |
| [DevTools](https://reactflow.dev/ui/components/devtools) | [No catalog component/template identified](#open-ui) | G | G | G | U | Build DevTools equivalent in each framework; renderer primitives alone do not close this entry. |

## Evidence and discovery boundaries

The following sections are starting points for later contract work. They distinguish production code from test evidence and name gaps. They do not replace a feature's complete call-path trace. P cells for core helpers mean consumers can import the shared code; they do not imply that an adapter already exposes a matching component, hook, or recipe.

### Host

Production: [vanilla public entry points](../../apps/vanilla/src/public.ts#L1), [controller contract](../../apps/vanilla/src/mount-flow.ts#L424), [Vue public entry points](../../packages/vue/src/public.ts#L1), [Vue canvas props and events](../../packages/vue/src/flow-canvas.ts#L160), and [Foldkit View](../../apps/foldkit/src/graph.ts#L320). Vanilla has a controller lifetime, Vue uses injection, and Foldkit owns a Model/Message program. None is a complete drop-in React Flow API.

Tests: the [shared fixture definitions and limits](../fixtures/README.md) describe eight scenarios driven by [vanilla](../../apps/vanilla/e2e/shared-conformance.e2e.ts#L7), [Vue](../../apps/vue/e2e/shared-conformance.e2e.ts#L13), and [Foldkit](../../apps/foldkit/e2e/shared-conformance.e2e.ts#L10). Vue has additional [canvas-scoped injection checks](../../apps/vue/e2e/shared-conformance.e2e.ts#L59). These are Flow conformance tests, not full reference comparisons.

### State

Production: vanilla callers retain their supplied document and can [subscribe to changes](../../apps/vanilla/src/mount-flow.ts#L424). Vue's [useFlow](../../packages/vue/src/use-flow.ts#L25) exposes computed document, nodes, and viewport with dispatch/update actions. It has no dedicated edge or node-data selector hooks. [Foldkit's model](../../apps/foldkit/src/graph.ts#L31) holds document and viewport. These are starting points for idiomatic state APIs, not equivalent React hooks or store APIs.

Tests: [Vue split bindings](../../apps/vue/e2e/shared-conformance.e2e.ts#L85), [Foldkit controlled connection acknowledgement](../../apps/foldkit/e2e/shared-conformance.e2e.ts#L139), and the shared keyed-update and controlled-acknowledgement fixtures. Selector granularity, subscription behavior, and the complete instance-method list remain unmapped.

### Schema

Production: [FlowNode and handles](../../packages/core/src/domain/flow.schema.ts#L48), [FlowEdge](../../packages/core/src/domain/flow.schema.ts#L110), [viewport and measured-node schemas](../../packages/core/src/domain/flow-runtime.schema.ts#L29), and [core exports](../../packages/core/src/public.ts#L1). All three hosts consume the shared graph contracts. The schemas deliberately encode Flow's domain rather than every React-specific field. The table points to related types; fields, generics, defaults, and nullability still need detailed comparison.

Tests: [document schema tests](../../packages/core/src/domain/flow.schema.test.ts), [generated graph invariants](../../packages/core/src/domain/flow-graph.test.ts#L20), and [runtime schema tests](../../packages/core/src/domain/flow-runtime.schema.test.ts#L49). Passing a schema test does not prove an upstream public type is compatible.

### Changes

Production: [FlowChangeSchema](../../packages/core/src/domain/flow-runtime.schema.ts#L819) names semantic changes; [Vue emits](../../packages/vue/src/flow-canvas.ts#L202) adds typed model update events; [Foldkit OutMessage](../../apps/foldkit/src/graph.ts#L42) carries a semantic change. Core exports separate change-application helpers. Final-only movement events differ from React Flow's richer callback lifecycle, as recorded in [architecture](../../docs/architecture.md#conformity-and-deviations).

Tests: [core change/drag behavior](../../packages/core/src/domain/flow-runtime.schema.test.ts#L1112), [vanilla controlled keyboard movement](../../apps/vanilla/e2e/movement-slices.e2e.ts#L515), [Vue local-coordinate drag](../../apps/vue/e2e/shared-conformance.e2e.ts#L183), and [Foldkit local-coordinate drag](../../apps/foldkit/e2e/shared-conformance.e2e.ts#L189). Complete upstream callback ordering and change-array equivalence remain unverified.

### Geometry

Production: [graph bounds and queries](../../packages/core/src/domain/flow-graph.ts#L206), [edge path helpers](../../packages/core/src/domain/flow-edge.schema.ts#L78), [step paths](../../packages/core/src/domain/flow-step-edge.schema.ts#L230), and [fitViewportToNodes](../../packages/core/src/domain/flow-fit-view.ts#L42). `graphIncomers` and `graphOutgoers` return edges, so they require adaptation to node-returning utilities. Path and label helpers are separate. Fit accepts a document and measurements rather than only bounds.

Tests: [graph query cases](../../packages/core/src/domain/flow-graph.test.ts#L251), [edge geometry tests](../../packages/core/src/domain/flow-edge.schema.test.ts), [fit tests](../../packages/core/src/domain/flow-fit-view.test.ts#L43), and [vanilla fit behavior](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L2098). These helpers are available through core in all three frameworks. Recipe-level rendering and reference output comparisons remain open.

### Connections

Production: [core connection contracts](../../packages/core/src/domain/flow-connection.schema.ts), [reconnection](../../packages/core/src/domain/flow-reconnection.schema.ts), [vanilla validator options](../../apps/vanilla/src/mount-flow.ts#L382), [Vue target-node predicate](../../packages/vue/src/flow-canvas.ts#L191), and [Foldkit allowed targets](../../apps/foldkit/src/graph.ts#L470). Validator inputs differ. Basic connections exist in all three hosts; rich reconnection and click interactions are currently evidenced in vanilla.

Tests: [shared connection-validity fixture](../fixtures/README.md), [Vue rendered connection](../../apps/vue/e2e/connection.e2e.ts#L3), [Foldkit controlled connection](../../apps/foldkit/e2e/shared-conformance.e2e.ts#L139), [vanilla validator](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L2216), and [reconnection validation](../../apps/vanilla/e2e/validator-followups.e2e.ts#L120). Limits, reactive query APIs, and connection lifecycle callbacks require further work.

### Rendering

Production: [vanilla node and edge renderer contracts](../../apps/vanilla/src/mount-flow.ts#L273), [renderer registries](../../apps/vanilla/src/mount-flow.ts#L402), [Vue component/slot props](../../packages/vue/src/flow-canvas.ts#L183), and [Vue node/edge rendering](../../packages/vue/src/flow-canvas.ts#L868). Foldkit's current [fixed node and edge view](../../apps/foldkit/src/graph.ts#L320) exposes no equivalent custom registry. Vue accepts a component per kind, not a node-type registry matching React Flow.

Tests: [vanilla typed renderers and cleanup](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L1348), [Vue component identity](../../apps/vue/e2e/shared-conformance.e2e.ts#L59), and [Vue default edge rendering](../../apps/vue/e2e/connection.e2e.ts#L3). All renderer props, edge component primitives, and complete example interactions remain open.

### Labels

Production: [vanilla edge labels and markers](../../apps/vanilla/src/edge-renderer.ts#L52) and the [edge renderer context](../../apps/vanilla/src/mount-flow.ts#L283). A built-in SVG label and custom renderer are useful starting points, but do not establish a compatible HTML label portal or reusable EdgeText component.

Evidence: [edge label trace](../traces/edge-label-render.md), [marker trace](../traces/edge-markers-styling.md), and [custom renderer browser tests](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L1348). Vue's default edge renderer and Foldkit's textual edge labels do not establish equivalent catalog label/marker components.

### Canvas-ui

Production: [background and controls/minimap options](../../apps/vanilla/src/mount-flow.ts#L125) and [createCanvasUI](../../apps/vanilla/src/canvas-ui.ts#L220). Vanilla has dots, lines, and none background choices, plus optional controls and minimap. The Vue playground has application controls; these do not constitute reusable exported Controls or MiniMap components.

Tests: [vanilla canvas UI](../../apps/vanilla/e2e/canvas-ui.e2e.ts#L56) and [interaction mode](../../apps/vanilla/e2e/canvas-ui.e2e.ts#L136). Reusable Vue/Foldkit equivalents and complete option-by-option reference comparison remain open.

### Resize

Production: [resize contracts](../../packages/core/src/domain/flow-runtime.schema.ts#L103), [resize calculation](../../packages/core/src/domain/flow-runtime.schema.ts#L666), and the [vanilla resize scene](../../apps/vanilla/src/main.ts#L125). The fit-options row refers separately to [FitViewOptionsSchema](../../apps/vanilla/src/mount-flow.ts#L254), a host fit operation rather than resizing.

Tests: [directional resize](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L1117), [keyboard resize](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L1531), and [controlled left resize with a child](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L939). The last case matches one normalized pinned capture. It does not close the entire NodeResizer/NodeResizeControl API, all directions, or other adapters.

### Toolbars

Production: [core toolbar anchors](../../packages/core/src/domain/flow-toolbar-anchor.ts#L21) and [vanilla toolbar containers](../../apps/vanilla/src/mount-flow.ts#L397). Tests: [toolbar updates on viewport, drag, culling, and removal](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L1729). Full alignment/visibility props and reusable Vue/Foldkit toolbars remain open.

### Panels

Production: [panel and overlay contract](../../docs/public-api.md#ownership-and-acknowledgement), [panel placements](../../apps/vanilla/src/mount-flow.ts#L156), and [controller overlayPortal](../../apps/vanilla/src/mount-flow.ts#L424). Flow's host-local overlay is a useful primitive; the inventory does not assert that it implements the transformed coordinate system of ViewportPortal.

Tests: [placement and restoration](../../apps/vanilla/e2e/canvas-ui.e2e.ts#L409), [host isolation](../../apps/vanilla/e2e/canvas-ui.e2e.ts#L752), and [six positions](../../apps/vanilla/e2e/canvas-ui.e2e.ts#L832). Viewport-coordinate portal behavior and reusable framework components remain open.

### Hierarchy

Production: [nested graph view](../../packages/core/src/domain/flow-graph.ts#L31), parent-relative document fields, and inherited visibility. Tests: [three-level graph positions](../../packages/core/src/domain/flow-graph.test.ts#L125), [vanilla descendant updates](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L1105), and shared nested/hidden fixtures in [all adapters](../fixtures/README.md). Drag-driven reparenting and selection grouping are separate examples and remain G.

### Drag

Production: vanilla renderer drag markers are part of the [renderer contract](../../apps/vanilla/src/mount-flow.ts#L273). Tests: [custom drag handle and nested controls](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L297). The [reference capture](../fixtures/README.md) compares only unchanged/changed transforms outside/inside the handle. Vue and Foldkit basic dragging does not prove custom-handle behavior.

### Measurements

Production: [FlowBrowser observation capability](../../apps/vanilla/src/flow-browser.ts), [measured-node schema](../../packages/core/src/domain/flow-runtime.schema.ts#L50), and [Vue measurement-fed edge rendering](../../packages/vue/src/flow-canvas.ts#L904). Internal measurements exist, but readiness, explicit refresh, and internal-node subscription APIs still need public contracts.

Tests/evidence: [measurement trace](../traces/node-measurement.md), [unmeasured fit](../../apps/vanilla/e2e/flow-followups.e2e.ts#L155), and [Vue default measured edge](../../apps/vue/e2e/connection.e2e.ts#L3). Foldkit's current view uses fixed dimensions; measurement parity is unverified.

### Persistence

Production: [versioned document persistence](../../packages/core/src/domain/flow-persistence.ts#L23) deliberately omits viewport and transient selection. Tests: [round-trip persistence](../../packages/core/src/domain/flow-persistence.test.ts#L12). Core serialization is usable by each framework, but there is no complete catalog save/restore recipe or matching ReactFlowJsonObject contract.

### Styles

Production: separate [vanilla CSS](../../apps/vanilla/src/style.css), [Vue adapter CSS](../../packages/vue/src/style.css), and [Foldkit CSS](../../apps/foldkit/src/style.css). Tests: [vanilla playground scenes](../../apps/vanilla/e2e/playground.e2e.ts#L11), [Vue playground](../../apps/vue/e2e/demo.e2e.ts#L3), and [Foldkit smoke](../../apps/foldkit/e2e/shared-conformance.e2e.ts#L44). These establish inspectable host styling; dark mode, styling integrations, and composed visual recipes remain open.

### Input

Production: [vanilla host input options](../../apps/vanilla/src/mount-flow.ts#L382), [node accessibility fields](../../packages/core/src/domain/flow.schema.ts#L63), and core interaction sessions. Tests: [touch viewport gestures](../../apps/vanilla/e2e/movement-slices.e2e.ts#L655), [native keyboard ownership](../../apps/vanilla/e2e/graph-renderers.e2e.ts#L571), and [two skipped native multi-pointer cases](../../apps/vanilla/e2e/advanced-gestures.e2e.ts#L914). A per-node label is not the complete AriaLabelConfig contract; click connection mode is not strict/loose ConnectionMode. Full type and native device equivalence remains open.

### Performance

Production scenario: [browser benchmark](../../apps/vanilla/e2e/performance.e2e.ts#L346). Its current [recorded boundaries](../PROGRESS.md) describe Chromium reconciliation/drag samples and the absence of a stable large-graph latency budget. The stress example still needs matching workloads, adapter runs, and target-hardware budgets. Existing sample sizes are not an upstream stress-test pass.

### Open-api

Discovery inspected [core exports](../../packages/core/src/public.ts), [vanilla exports](../../apps/vanilla/src/public.ts), [Vue exports](../../packages/vue/src/public.ts), and [Foldkit's app-scoped exports](../../apps/foldkit/src/graph.ts#L470). G identifies a missing direct contract in that inspected API, not a compiler-level proof that no internal helper exists. Each row names the next contract question. No complete reference test is assigned to these entries yet.

### Open-example

Discovery inspected the runnable [vanilla](../../apps/vanilla/src/main.ts), [Vue](../../apps/vue/src/main.ts), and [Foldkit](../../apps/foldkit/src/main.ts) applications and their browser-test suites. The listed recipe has no equivalent checked-in demonstration identified in this pass. Generic node rendering, custom controls, and graph queries are useful prerequisites but do not establish the named outcome. Pro membership comes from the public listing only; private source and full Pro behavior were not audited.

### Open-ui

No dedicated equivalent catalog components or templates were identified in the inspected [vanilla](../../apps/vanilla/src/public.ts), [Vue](../../packages/vue/src/public.ts), and [Foldkit](../../apps/foldkit/src/graph.ts#L470) APIs. Custom node/edge renderers can host these experiences, but they do not complete the UI recipes. This applies to the UI catalog's Base Node, handles, controls, and DevTools as well as its templates. Existing Flow controls and telemetry are related building blocks, not these catalog components. Follow the [UI reuse/licensing record](../../docs/ui-licensing.md) when implementation starts.

### Navigation

Landing pages and API category indexes are retained as links for inventory completeness. They carry no framework implementation status and are excluded from capability totals.

## Rechecking and updating

Run the offline check from the repository root:

```sh
bun run scripts/check-react-flow-catalog.ts
```

It rejects missing/duplicate/unknown rows, missing framework statuses, invalid evidence links and line numbers, and lost Pro labels. The initial baseline accepts only P/G implementation states and U reference status. When later work proves a complete entry, extend the status vocabulary and require a specific proof link before changing that row.

Compare the saved baseline with current upstream navigation without modifying it:

```sh
bun run scripts/check-react-flow-catalog.ts --upstream
```

The live check compares labels and canonical URLs under each complete desktop sidebar, plus public Pro membership. It reports additions, removals, and renames; a failed fetch or empty sidebar fails the command. Raw page hashes document the captured responses but are not compared on every run because unrelated HTML can change. This command does not detect prop-level changes inside an existing page.

At the next milestone, review detected changes, retain the dated snapshot, add a new dated baseline, and update this map and the checker's snapshot path together. Never delete an open capability because it lacks reference access. Keep aggregate project status in [PROGRESS](../PROGRESS.md); this file owns the individual catalog rows.

## Verification of this inventory

On 2026-09-26, the offline row/evidence check and live upstream comparison passed for all 208 entries. The three landing-page article bodies contained no additional catalog URLs missing from the sidebar snapshot. Deliberately omitted/duplicated rows, blank framework status, unsupported parity claims, and missing evidence mappings were rejected in focused checker probes. Scoped Oxlint and Oxfmt checks passed for the new checker and verification integration, and the existing Markdown checker passed.

`bun run verify` was attempted and stopped at the documentation gate because the pre-existing edited `docs/api-reference.md` is stale. A separate `tsc --noEmit` run also reports errors in existing application, test, and benchmark files; it reports none in the new catalog checker. No runtime or full-project verification success is claimed for this inventory. The pre-existing edits were preserved.

## Conformity and deviations

The catalog map classifies all full-entry reference comparisons as **unverified**. Implementation discovery was limited to public contracts, current hosts, examples, and checked-in tests; it was not an exhaustive prop-by-prop audit or a run of all upstream examples.

Two narrow behaviors are **conforming** within [recorded capture boundaries](../fixtures/README.md): custom drag-handle transform-change booleans and one left-edge resize with direct-child compensation. They do not close their complete catalog rows or prove matching Vue/Foldkit behavior.

The native framework APIs, final semantic changes, schema validation, and versioned persistence are **intentionally different** in the current [architecture](../../docs/architecture.md). Their rationale is framework-independent graph meaning and explicit ownership. Future mapping must decide whether adapter-level equivalents can preserve the requested public behavior. An intentional internal difference does not remove an unmet capability from the project goal.
