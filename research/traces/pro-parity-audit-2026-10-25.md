# Pro parity audit, 2026-10-25

Plan 149 at `957e93e`. Inspected local source at that commit on `plan/149-pro-audit`. This is a research-only re-audit of the 16 Pro entries, not a runtime comparison against React Flow. Imported artifacts were not changed.

## Method and rating boundary

All example URLs below were fetched and their public article HTML read on **2026-10-25**. Each response exposed the description, dependencies and Pro license; its unauthenticated Download ZIP control was disabled. The subscription source was unavailable. Public descriptions and linked docs establish the outcomes below; bundled/minified demo scripts were not treated as licensed source. No upstream video or live demo interaction was observed. The listed iframe URLs are page metadata, not evidence of a driven session.

C means the main outcome is achievable through current public APIs or an implemented recipe. P means related capability exists with a material missing composition or gesture. G means no public equivalent for that outcome. An entry is C only when all primary documented outcomes are close; otherwise P when useful outcome-specific support exists, or G when its essential capability is absent. Local atomic edits alone do not make undo, collaboration or a server renderer partial implementations. Vanilla and Foldkit do have app-specific Schema Studio history, which earns P for those hosts; Vue does not. Entry ratings are judgments over the outcomes, not averages. All three hosts were inspected independently even where ratings coincide.

Upstream production entry is the public example page and its linked React demo. The described hooks are React integration seams, not Flow API requirements. Subscription production call paths and Pro tests were unavailable, so neither is reconstructed from the open-source xyflow artifacts. No Svelte Pro implementation was supplied or inspected; Svelte parity is outside this three-host audit.

Persistence and unspecified edge cases are recorded as unverified rather than invented upstream promises. Extra delivery cases, such as history branching, are identified as recommendations. Each catalog outcome records its basis as `public-description`, `linked-public-docs` or `delivery-edge-case`; the latter includes derived clipboard safety requirements and Flow force-drag regression behavior. C is not a reference-conformity claim. The catalog retains the original 2026-10-13 audit date; each changed entry has a 2026-10-25 `reaudit` record and its former ratings.

## Public documentation consulted

Accessed 2026-10-25: [custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [layout and edge routing](https://reactflow.dev/learn/layouting/layouting), [SSR configuration and static markup](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration), and [multiplayer state ownership](https://reactflow.dev/learn/advanced-use/multiplayer). The layout guide states that libavoid avoids node intersections as a diagram changes. The multiplayer guide separates durable nodes/edges, transient presence and local selection/measurements. The SSR guide requires explicit dimensions/handle positions. These docs describe requirements, not Flow behavior.

## Shared production and test paths

Real browser entries are the recipe HTML module scripts: `apps/vanilla/ui-recipes/subflows/index.html:10`, `apps/vue/ui-recipes/subflows/index.html:54`, and `apps/foldkit/ui-recipes/subflows/index.html:10`. Layout and whiteboard use sibling recipe HTML entries. These runnable recipes exercise public host APIs; their status elements are test instrumentation, not separate graph implementations.

Vanilla recipes mount with `mountFlow`, for example `apps/vanilla/src/ui/subflows-recipes.ts:153`. `setNodes` creates an edit transaction at `apps/vanilla/src/mount-flow.ts:14319`; `applyEditResolved` reads the current authoritative document, prepares it and publishes an edit proposal at `apps/vanilla/src/mount-flow.ts:13842`. Uncontrolled proposals are accepted and reconciled at `apps/vanilla/src/mount-flow.ts:8467`. Core decodes the transaction, applies operations and validates the final document at `packages/core/src/domain/flow-edit.ts:241`. Node projection uses graph absolute positions at `apps/vanilla/src/mount-flow.ts:8564` and applies the DOM transform at `apps/vanilla/src/mount-flow.ts:1714`. Custom SVG content is owned by the recipe renderer, for example `apps/vanilla/src/ui/whiteboard-recipes.ts:62`.

Vue recipes compose `FlowCanvas` and `useFlow`, for example `apps/vue/src/subflows-recipes.ts:227`. Public `setNodes` maps to editor transactions at `packages/vue/src/use-flow.ts:661`; `FlowCanvas` prepares them at `packages/vue/src/flow-canvas.ts:4391`. Controlled mode emits proposals instead of silently accepting them at `packages/vue/src/flow-canvas.ts:4423`; these recipes use an uncontrolled default document, accepted into `ownedDocument` at `packages/vue/src/flow-canvas.ts:4452`. Rendering assigns absolute positions to node DOM styles at `packages/vue/src/flow-canvas.ts:9116`. Vue waits a frame after a committed drop before reading reparent bounds at `apps/vue/src/subflows-recipes.ts:205`.

Foldkit recipes embed the reusable program through `mountRecipeHost` at `apps/foldkit/ui-recipes/recipe-host.ts:96`, decoding the initial document and selecting uncontrolled document/viewport ownership at line 124. Edits reach the adapter command handler at `packages/foldkit/src/graph.ts:1282`, which prepares the core transaction and reports its result. The recipe sends edit requests at `apps/foldkit/ui-recipes/recipe-host.ts:176` and receives accepted documents at `apps/foldkit/ui-recipes/recipe-host.ts:261`. Graph projection selects absolute position and node size at `packages/foldkit/src/graph.ts:7419`; the DOM styles and custom renderer are at `packages/foldkit/src/graph.ts:7437` and `packages/foldkit/src/graph.ts:7582`. Layout acknowledges a result only after the DOM and fitted viewport match at `apps/foldkit/ui-recipes/layout/main.ts:219`.

Input contracts are schema-derived `FlowNode`, `FlowEdge` and `FlowDocument`, with JSON node/edge data at `packages/core/src/domain/flow.schema.ts:145`, `packages/core/src/domain/flow.schema.ts:307` and `packages/core/src/domain/flow.schema.ts:338`. Grouping consumes nodes plus measured bounds and emits replacement nodes or a rejection at `packages/core/src/domain/flow-grouping.ts:73`. Layout consumes measured `FlowLayoutInput` at `packages/core/src/domain/flow-layout.ts:50` and produces positions applied at `packages/core/src/domain/flow-layout.ts:132`. Freehand consumes graph-space points and emits a quadratic SVG path at `packages/core/src/domain/flow-freeform.ts:229`. Versioned persistence encodes/decodes documents at `packages/core/src/domain/flow-persistence.ts:424` and `packages/core/src/domain/flow-persistence.ts:478`; it does not save recipe closures, history stacks or network rooms.

Production paths above are separate from the browser tests. Tests navigate to those real HTML pages, use mouse/keyboard input and inspect both status attributes and rendered bounds/paths. Grouping tests do not exercise ungroup controls; layout tests do not exercise engine switching or sliders; whiteboard tests do not compare perfect-freehand pixels. Renderer-props tests are evidence of customization contracts only and are not Pro recipe tests. Unit tests verify core grouping/layout/freeform/edit behavior. No new tests or product code were added for this audit.

Negative findings come from the public exports, schemas, recipe registry and these full recipe implementations, plus a scoped search of `packages/`, `apps/` and `tests/` for history/clipboard/CRDT/routing/control-point/alignment implementations. A similarly named snapshot or fixed grid is not a substitute for history or alignment snapping.

### Schema Studio production and tests

Schema Studio is a separate app-domain path, not the generic recipe controller path. Browser entries are `apps/vanilla/schema-studio/index.html:10` and `apps/foldkit/schema-studio/index.html:10`. Its `History` owns `Studio` snapshots, not arbitrary `FlowDocument` snapshots, at `apps/shared/schema-studio/model.ts:230`. `record` bounds history to 100 and clears future at `apps/shared/schema-studio/model.ts:242`; undo/redo are at `apps/shared/schema-studio/model.ts:251` and `apps/shared/schema-studio/model.ts:263`.

Vanilla shortcut input at `apps/vanilla/schema-studio/main.ts:1447` calls `applyHistory` at `apps/vanilla/schema-studio/main.ts:394`. That persists the present Studio, projects it through `graph` at `apps/vanilla/schema-studio/main.ts:185` and repaints through the public controller `update` at `apps/vanilla/schema-studio/main.ts:357`. Copy stores selected tables at `apps/vanilla/schema-studio/main.ts:1465`; paste duplicates them and remaps internal relationship table IDs with a 40-unit offset at `apps/vanilla/schema-studio/main.ts:541`. It is not a generic parent/child graph fragment.

Foldkit shortcut input at `apps/foldkit/schema-studio/main.ts:812` sends model messages. Undo/redo updates app-owned history and invokes host persistence/paint at `apps/foldkit/schema-studio/model.ts:525`. Graph projection at `apps/foldkit/schema-studio/main.ts:118` produces the Flow document; host paint sends `HostAction.ReplaceDocument` at `apps/foldkit/schema-studio/main.ts:301`. Copy/Paste handles selected tables at `apps/foldkit/schema-studio/model.ts:563`, with remapped relationship IDs and 40-unit placement at `apps/foldkit/schema-studio/model.ts:266`. Both hosts then reach the ordinary graph renderers described above. No Vue Schema Studio counterpart or clipboard/history recipe was found.

Tests are separate: `apps/vanilla/e2e/schema-studio.e2e.ts:1013` and `apps/foldkit/e2e/schema-studio.e2e.ts:1031` drive table drag, Ctrl+Z, Ctrl+Shift+Z and present-document reload. `apps/vanilla/e2e/schema-studio.e2e.ts:1078` and `apps/foldkit/e2e/schema-studio.e2e.ts:1100` exercise table copy/paste. `apps/shared/schema-studio/model.test.ts:206` checks undo, redo, no-ops and abandoned future states. These tests do not prove generic Flow graph history or clipboard coverage. Empty-stack button disabling and general gesture grouping remain unverified.

## Evidence groups

Every outcome table names an evidence group. The same groups, expanded to exact shared and host citations, are stored on each outcome in the catalog. Production and checked-in test pointers are separated here.

### edit

- shared production: `packages/core/src/domain/flow-edit.ts:241`, `packages/core/src/domain/flow.schema.ts:338`.
- vanilla production: `apps/vanilla/src/mount-flow.ts:13840`, `apps/vanilla/src/mount-flow.ts:14319`.
- vue production: `packages/vue/src/use-flow.ts:660`, `packages/vue/src/flow-canvas.ts:4406`.
- foldkit production: `packages/foldkit/src/instance.ts:409`, `packages/foldkit/src/graph.ts:1282`.

### render

- shared production: `packages/core/src/domain/flow.schema.ts:145`.
- vanilla production: `apps/vanilla/src/ui/whiteboard-recipes.ts:62`, `apps/vanilla/src/mount-flow.ts:8556`.
- vue production: `apps/vue/src/whiteboard-recipes.ts:63`, `packages/vue/src/flow-canvas.ts:9116`.
- foldkit production: `apps/foldkit/ui-recipes/whiteboard/main.ts:62`, `packages/foldkit/src/graph.ts:7582`.

### preview

- shared production: `packages/core/src/domain/flow-edge-path.ts:26`.
- vanilla tests: `apps/vanilla/e2e/renderer-props.e2e.ts:124`.
- vue tests: `apps/vue/e2e/renderer-props.e2e.ts:96`.
- foldkit tests: `apps/foldkit/e2e/renderer-props.e2e.ts:121`.

### group

- shared production: `packages/core/src/domain/flow-grouping.ts:73`, `packages/core/src/domain/flow-grouping.ts:220`.
- vanilla production: `apps/vanilla/src/ui/subflows-recipes.ts:50`, `apps/vanilla/src/ui/subflows-recipes.ts:90`.
- vanilla tests: `apps/vanilla/e2e/subflows-recipes.e2e.ts:60`.
- vue production: `apps/vue/src/subflows-recipes.ts:81`, `apps/vue/src/subflows-recipes.ts:113`.
- vue tests: `apps/vue/e2e/subflows-recipes.e2e.ts:76`.
- foldkit production: `apps/foldkit/ui-recipes/subflows/main.ts:73`, `apps/foldkit/ui-recipes/subflows/main.ts:102`.
- foldkit tests: `apps/foldkit/e2e/subflows-recipes.e2e.ts:77`.

### group-ui

- shared production: `packages/core/src/domain/flow-grouping.ts:107`.
- vanilla production: `apps/vanilla/src/ui/subflows-recipes.ts:197`.
- vue production: `apps/vue/src/subflows-recipes.ts:179`.
- foldkit production: `apps/foldkit/ui-recipes/subflows/main.ts:73`.

### parent

- shared production: `packages/core/src/domain/flow-grouping.ts:192`, `packages/core/src/domain/flow-grouping.ts:220`.
- vanilla production: `apps/vanilla/src/ui/subflows-recipes.ts:90`.
- vanilla tests: `apps/vanilla/e2e/subflows-recipes.e2e.ts:114`.
- vue production: `apps/vue/src/subflows-recipes.ts:113`.
- vue tests: `apps/vue/e2e/subflows-recipes.e2e.ts:128`.
- foldkit production: `apps/foldkit/ui-recipes/subflows/main.ts:102`.
- foldkit tests: `apps/foldkit/e2e/subflows-recipes.e2e.ts:127`.

### layout

Layout direction controls and their tests are also at `apps/vanilla/src/ui/layout-recipes.ts:233`, `apps/vanilla/e2e/layout-recipes.e2e.ts:98`, `apps/vue/src/layout-recipes.ts:144`, `apps/vue/e2e/layout-recipes.e2e.ts:101`, `apps/foldkit/ui-recipes/layout/main.ts:373` and `apps/foldkit/e2e/layout-recipes.e2e.ts:109`.

- shared production: `packages/core/src/domain/flow-layout.ts:50`, `packages/core/src/domain/flow-layout.ts:132`.
- vanilla production: `apps/vanilla/src/ui/layout-recipes.ts:105`, `apps/vanilla/src/ui/layout-recipes.ts:312`.
- vanilla tests: `apps/vanilla/e2e/layout-recipes.e2e.ts:170`.
- vue production: `apps/vue/src/layout-recipes.ts:85`, `apps/vue/src/layout-recipes.ts:208`.
- vue tests: `apps/vue/e2e/layout-recipes.e2e.ts:177`.
- foldkit production: `apps/foldkit/ui-recipes/layout/main.ts:185`, `apps/foldkit/ui-recipes/layout/main.ts:389`.
- foldkit tests: `apps/foldkit/e2e/layout-recipes.e2e.ts:188`.

### force

- shared production: `packages/core/src/domain/flow-layout.ts:119`.
- vanilla production: `apps/shared/layout/browser.ts:351`, `apps/shared/layout/browser.ts:351`.
- vanilla tests: `apps/vanilla/e2e/layout-recipes.e2e.ts:209`.
- vue production: `apps/shared/layout/browser.ts:351`, `apps/shared/layout/browser.ts:351`.
- vue tests: `apps/vue/e2e/layout-recipes.e2e.ts:222`.
- foldkit production: `apps/shared/layout/browser.ts:351`, `apps/shared/layout/browser.ts:351`.
- foldkit tests: `apps/foldkit/e2e/layout-recipes.e2e.ts:228`.

### dynamic

- shared production: `packages/core/src/domain/flow-layout.ts:132`.
- vanilla production: `apps/vanilla/src/ui/layout-recipes.ts:388`, `apps/vanilla/src/ui/layout-recipes.ts:488`.
- vanilla tests: `apps/vanilla/e2e/layout-recipes.e2e.ts:263`.
- vue production: `apps/vue/src/layout-recipes.ts:297`, `apps/vue/src/layout-recipes.ts:316`, `apps/vue/src/layout-recipes-components.ts:30`.
- vue tests: `apps/vue/e2e/layout-recipes.e2e.ts:270`.
- foldkit production: `apps/foldkit/ui-recipes/layout/main.ts:421`, `apps/foldkit/ui-recipes/layout/main.ts:51`.
- foldkit tests: `apps/foldkit/e2e/layout-recipes.e2e.ts:291`.

### draw

- shared production: `packages/core/src/domain/flow-freeform.ts:229`.
- shared tests: `packages/core/src/domain/flow-freeform.test.ts:109`.
- vanilla production: `apps/vanilla/src/ui/whiteboard-recipes.ts:359`, `apps/vanilla/src/ui/whiteboard-recipes.ts:424`.
- vanilla tests: `apps/vanilla/e2e/whiteboard-recipes.e2e.ts:193`.
- vue production: `apps/vue/src/whiteboard-recipes.ts:259`, `apps/vue/src/whiteboard-recipes.ts:326`.
- vue tests: `apps/vue/e2e/whiteboard-recipes.e2e.ts:179`.
- foldkit production: `apps/foldkit/ui-recipes/whiteboard/main.ts:285`, `apps/foldkit/ui-recipes/whiteboard/main.ts:393`.
- foldkit tests: `apps/foldkit/e2e/whiteboard-recipes.e2e.ts:180`.

### path

- shared production: `packages/core/src/domain/flow-edge-path.ts:26`, `packages/core/src/domain/flow-edge-geometry.ts:618`.
- vanilla tests: `apps/vanilla/e2e/renderer-props.e2e.ts:153`.
- vue tests: `apps/vue/e2e/renderer-props.e2e.ts:125`.
- foldkit tests: `apps/foldkit/e2e/renderer-props.e2e.ts:150`.

### grid

- shared production: `packages/core/src/domain/flow-snap-grid.schema.ts:34`.
- vanilla production: `apps/vanilla/src/mount-flow.ts:468`.
- vue production: `packages/vue/src/flow-canvas.ts:879`.
- foldkit production: `packages/foldkit/src/graph.ts:936`.

### shape-minimap

- vanilla production: `apps/vanilla/src/minimap.ts:50`.
- vue production: `packages/vue/src/minimap.ts:112`.
- foldkit production: `packages/foldkit/src/ui/minimap.ts:44`.

### visibility

- shared production: `packages/core/src/domain/flow.schema.ts:159`, `packages/core/src/domain/flow-graph.ts:151`, `packages/core/src/domain/flow-edge-geometry.ts:183`. Host edit/persistence entry points are listed under `persist`.

### export

- shared production: `packages/core/src/domain/flow-persistence.ts:424`.
- vanilla production: `apps/vanilla/src/ui/closing-recipes.ts:352`.
- vue production: `apps/vue/src/closing-recipes.ts:228`.
- foldkit production: `apps/foldkit/ui-recipes/download-image/main.ts:31`.

### persist

- shared production: `packages/core/src/domain/flow-persistence.ts:424`, `packages/core/src/domain/flow-persistence.ts:478`.
- vanilla production: `apps/vanilla/src/mount-flow.ts:14319`.
- vue production: `packages/vue/src/use-flow.ts:661`.
- foldkit production: `packages/foldkit/src/instance.ts:409`.

### studio-history

- shared production: `apps/shared/schema-studio/model.ts:230`.
- shared tests: `apps/shared/schema-studio/model.test.ts:206`.
- vanilla production: `apps/vanilla/schema-studio/main.ts:394`, `apps/vanilla/schema-studio/main.ts:1447`.
- vanilla tests: `apps/vanilla/e2e/schema-studio.e2e.ts:1013`.
- vue production: `packages/vue/src/use-flow.ts:660`, `packages/vue/src/flow-canvas.ts:4406`.
- foldkit production: `apps/foldkit/schema-studio/model.ts:525`, `apps/foldkit/schema-studio/main.ts:812`.
- foldkit tests: `apps/foldkit/e2e/schema-studio.e2e.ts:1031`.

### studio-clipboard

- shared production: `apps/shared/schema-studio/model.ts:242`.
- vanilla production: `apps/vanilla/schema-studio/main.ts:541`, `apps/vanilla/schema-studio/main.ts:1465`.
- vanilla tests: `apps/vanilla/e2e/schema-studio.e2e.ts:1078`.
- vue production: `packages/vue/src/use-flow.ts:660`, `packages/vue/src/flow-canvas.ts:4406`.
- foldkit production: `apps/foldkit/schema-studio/model.ts:266`, `apps/foldkit/schema-studio/model.ts:563`.
- foldkit tests: `apps/foldkit/e2e/schema-studio.e2e.ts:1100`.

## Per-example outcomes

The columns are Vanilla, Vue and Foldkit. Rows labeled as delivery edge cases extend the test plan without claiming undocumented reference behavior.

### Node Position Animation

Source: [Node Position Animation](https://reactflow.dev/examples/nodes/node-position-animation), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/node-position-animation/index.html](https://example-apps.xyflow.com/react/pro/node-position-animation/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Switch between horizontal and vertical layout destinations. | C | C | C | `layout` |
| Interpolate node positions over time when layout is toggled. | G | G | G | `layout` |
| Keep edges attached while positions change. | C | C | C | `path` |
| Retarget an animation while another transition is running. | G | G | G | `layout` |

Remaining work: Layout destinations and attached edges exist; no node-position tween or interruption lifecycle.

Unverified boundary: Public page does not specify duration, easing, interruption, reduced motion or persistence. Reentry is a delivery edge case, not an observed upstream guarantee.

### Shapes

Source: [Shapes](https://reactflow.dev/examples/nodes/shapes), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/shapes/index.html](https://example-apps.xyflow.com/react/pro/shapes/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Render data-driven custom SVG node content. | C | C | C | `render` |
| Provide circle, diamond and hexagon shape choices through one node type. | P | P | P | `render` |
| Create shape nodes through a shape sidebar. | G | G | G | `render` |
| Change shape color using a node toolbar. | P | P | P | `edit` |
| Render matching custom minimap shapes. | P | P | P | `shape-minimap` |

Remaining work: Custom node/data APIs exist; no composed shape library, sidebar, color toolbar or matching minimap recipe.

Unverified boundary: Shape resizing, handle placement, shape/color save-load and exact sidebar gesture are not specified by the page.

### Edge Routing

Source: [Edge Routing](https://reactflow.dev/examples/edges/edge-routing), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/edge-routing/index.html](https://example-apps.xyflow.com/react/pro/edge-routing/index.html). Not driven in this audit.

Entry rating: **G / G / G**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Automatically route edges around node obstacles. | G | G | G | `path` |
| Recompute obstacle-avoiding paths as the diagram changes. | G | G | G | `path` |

Remaining work: Endpoint-based path helpers and path intersections do not perform obstacle-aware routing.

Unverified boundary: No-route fallback, routing constraints, resize timing and saved route policy need reference or maintainer decisions.

### Editable Edge

Source: [Editable Edge](https://reactflow.dev/examples/edges/editable-edge), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/editable-edge/index.html](https://example-apps.xyflow.com/react/pro/editable-edge/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Render a custom connection preview. | C | C | C | `preview` |
| Drag path control points and retain the edited route. | G | G | G | `path` |
| Hold Space during connection to draw a freeform edge. | G | G | G | `preview` |
| Keep edited points attached to ordinary selectable edges as endpoints move. | P | P | P | `edit` |

Remaining work: Custom edge/preview APIs exist; no draggable path-point model or Space freeform connection recipe.

Unverified boundary: Point deletion, point order, route save-load and cancellation semantics are not disclosed.

### Helper Lines

Source: [Helper Lines](https://reactflow.dev/examples/interaction/helper-lines), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/helper-lines/index.html](https://example-apps.xyflow.com/react/pro/helper-lines/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Show horizontal and vertical alignment guides while dragging nodes. | G | G | G | `grid` |
| Snap the drag to other nodes rather than only a fixed grid. | P | P | P | `grid` |
| Keep guides and alignment accurate after pan and zoom. | G | G | G | `grid` |

Remaining work: Fixed-grid snapping exists; no node-relative alignment solver, guide overlay or snapping lifecycle.

Unverified boundary: Tolerance, center/edge preference, multiple selected nodes and cancellation need explicit tests.

### Collaborative

Source: [Collaborative](https://reactflow.dev/examples/interaction/collaborative), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read.

Entry rating: **G / G / G**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Join an isolated room from a shareable URL or a second tab. | G | G | G | `edit` |
| Synchronize node/edge edits and live movement between users. | G | G | G | `edit` |
| Right-click the shared pane to add a node visible to peers. | G | G | G | `edit` |
| Converge after concurrent edits and connection loss. | G | G | G | `persist` |
| Show peer presence while keeping selection and measurements local. | G | G | G | `render` |

Remaining work: Local edits and persistence do not supply rooms, shared state, awareness, transport or conflict resolution.

Unverified boundary: Reconnect and presence requirements come from linked multiplayer guidance, not an inspected Pro implementation. Backend durability/authentication are integration decisions.

### Copy and Paste

Source: [Copy and Paste](https://reactflow.dev/examples/interaction/copy-paste), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/copy-paste/index.html](https://example-apps.xyflow.com/react/pro/copy-paste/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Select multiple nodes before copying. | C | C | C | `group` |
| Copy and paste a selected graph fragment including its edges. | P | G | P | `studio-clipboard` |
| Allocate fresh IDs and remap copied edge endpoints and parents. | P | G | P | `studio-clipboard` |
| Place repeated pastes predictably without changing the original fragment. | P | G | P | `studio-clipboard` |

Remaining work: Vanilla/Foldkit Schema Studio copies selected tables and their internal relationships with fresh IDs and a 40-unit offset; no generic fragment/parent remapping. Vue has selection and edits but no clipboard recipe.

Unverified boundary: Exact shortcuts, clipboard persistence, dangling-edge inclusion and paste placement are unspecified. Shift box selection is public guidance; existing group tests use Meta/Control clicks. Schema Studio copy/paste is table-specific; no general hierarchy copy, extension reference remapping or independent edge selection clipboard is supplied. Repeated pastes use the same offset from the copied originals.

### Undo and Redo

Source: [Undo and Redo](https://reactflow.dev/examples/interaction/undo-redo), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/undo-redo/index.html](https://example-apps.xyflow.com/react/pro/undo-redo/index.html). Not driven in this audit.

Entry rating: **P / G / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Track past/future states for moving, adding and deleting nodes and edges. | P | G | P | `studio-history` |
| Undo and redo through controls with empty-stack states. | P | G | P | `studio-history` |
| Undo with Ctrl+Z and redo with Ctrl+Shift+Z. | C | G | C | `studio-history` |
| Clear redo after a new edit; coalesce one drag into one history action. | P | G | P | `studio-history` |

Remaining work: Vanilla/Foldkit Schema Studio has bounded app-domain history and shortcuts; no generic FlowDocument history integration. Vue has no history recipe.

Unverified boundary: Branch clearing and drag coalescing are necessary delivery cases, not disclosed internals. Reload persistence and local versus remote undo need decisions. Schema Studio tests exercise table drag undo/redo and the shared helper clears future on a new record. Generic node/edge coverage and complete gesture transaction grouping remain unverified. History stacks are not persisted, only the current Studio document.

### Selection Grouping

Source: [Selection Grouping](https://reactflow.dev/examples/grouping/selection-grouping), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/selection-grouping/index.html](https://example-apps.xyflow.com/react/pro/selection-grouping/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Select multiple nodes and create a containing group without moving them. | C | C | C | `group` |
| Move the group and its members together. | C | C | C | `group` |
| Offer grouping from a toolbar associated with the current selection. | P | P | P | `group-ui` |
| Select a group and ungroup all children through its toolbar. | P | P | P | `group-ui` |
| Automatically resize a group when its child bounds change. | P | P | P | `group-ui` |

Remaining work: Initial grouping and group dragging are tested; contextual ungrouping and ongoing child-driven group sizing are absent.

Unverified boundary: The page describes Shift-click; recipes use Meta/Control multi-select. Exact modifier parity, nested-group auto-sizing and save-load are unverified. Re-audit of prior C: downgrade to P. Group bounds are calculated once at creation; the sole group action is a fixed page button. There is no contextual Ungroup action or subscription that refits the group to changed child bounds.

### Parent Child Relation

Source: [Parent Child Relation](https://reactflow.dev/examples/grouping/parent-child-relation), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/parent-child-relation/index.html](https://example-apps.xyflow.com/react/pro/parent-child-relation/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Drop a node into a group and attach it as a child. | C | C | C | `parent` |
| Convert absolute and parent-relative positions without a visible jump. | C | C | C | `parent` |
| Move children with their parent. | C | C | C | `parent` |
| Detach a child using a toolbar while keeping its absolute position. | P | P | P | `parent` |

Remaining work: Drop-to-attach and drop-outside-to-detach are tested; the described detach toolbar is absent.

Unverified boundary: Flow requires full containment and chooses the smallest containing group. Upstream overlap threshold, nested targets and persistence are not disclosed. Re-audit of prior C: downgrade to P. Dropping outside a group detaches a child, but it does not exercise the public example's detach button. Position preservation remains close.

### Expand and Collapse

Source: [Expand and Collapse](https://reactflow.dev/examples/layout/expand-collapse), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/expand-collapse/index.html](https://example-apps.xyflow.com/react/pro/expand-collapse/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Represent hidden nodes while retaining the complete graph. | C | C | C | `visibility`, `persist` |
| Click a parent to hide or reveal its descendants and incident edges. | P | P | P | `layout` |
| Keep expanded/collapsed state in node data. | P | P | P | `render` |
| Add a child and recalculate the visible tree layout. | P | P | P | `dynamic` |

Remaining work: Hidden/data fields and layout APIs exist; no tree visibility reducer or expand/collapse/add-child composition.

Unverified boundary: DAG/shared descendants, cycles, child state under collapsed ancestors and save-load are unspecified.

### Auto Layout

Source: [Auto Layout](https://reactflow.dev/examples/layout/auto-layout), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/auto-layout/index.html](https://example-apps.xyflow.com/react/pro/auto-layout/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Lay out measured nodes automatically and rerun after graph changes. | C | C | C | `layout` |
| Switch between Dagre, d3-hierarchy and ELK at runtime in one flow. | P | P | P | `layout` |
| Configure the active layout algorithm interactively. | P | P | P | `layout` |

Remaining work: Dagre automatic relayout and separate Dagre/ELK scenes exist; no d3-hierarchy adapter or same-flow engine selector.

Unverified boundary: Engine output equality, async stale-result cancellation, saved engine choice and unsupported graph inputs are unverified. Re-audit of prior C: downgrade to P. Separate Dagre and ELK pages plus automatic Dagre relayout do not implement same-document switching among three engines.

### Force Layout

Source: [Force Layout](https://reactflow.dev/examples/layout/force-layout), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/force-layout/index.html](https://example-apps.xyflow.com/react/pro/force-layout/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Run a d3-force layout and show successive positions. | C | C | C | `force` |
| Let the user change force strength. | P | P | P | `force` |
| Let the user change link distance. | P | P | P | `force` |
| Allow node dragging, pin a dropped node and settle the simulation. | C | C | C | `force` |

Remaining work: Each host has a live measured simulation with hard-coded force/distance values; no interactive parameter controls.

Unverified boundary: Drag/pin is Flow regression evidence, not a documented Pro guarantee. Parameter persistence, numeric range and exact force output are unspecified. Re-audit of prior C: downgrade to P. All three simulations fix distance and strength in code. Successful settling and pinning do not establish interactive parameter changes.

### Dynamic Layouting

Source: [Dynamic Layouting](https://reactflow.dev/examples/layout/dynamic-layouting), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/dynamic-layouting/index.html](https://example-apps.xyflow.com/react/pro/dynamic-layouting/index.html). Not driven in this audit.

Entry rating: **P / P / P**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Click a placeholder to promote it to a node and create another placeholder. | C | C | C | `dynamic` |
| Click a regular node to add a child placeholder. | C | C | C | `dynamic` |
| Click the plus button on an edge to insert a node between endpoints. | G | G | G | `dynamic` |
| Recalculate tree positions after graph changes. | C | C | C | `dynamic` |
| Animate nodes smoothly to their new layout positions. | G | G | G | `dynamic` |

Remaining work: Placeholder promotion/branching and Dagre relayout are tested; edge insertion, d3-hierarchy and animated transitions are missing.

Unverified boundary: Current Dagre use is an implementation difference, not proof of d3-hierarchy output parity. Branch order, cancellation and persistence are unspecified. Re-audit of prior C: downgrade to P. All hosts grow placeholders and branches, but none renders an edge insertion button or interpolates destination positions.

### Freehand Draw

Source: [Freehand Draw](https://reactflow.dev/examples/whiteboard/freehand-draw), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/freehand-draw/index.html](https://example-apps.xyflow.com/react/pro/freehand-draw/index.html). Not driven in this audit.

Entry rating: **C / C / C**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Draw a smoothed curve on the pane, including at a transformed viewport. | C | C | C | `draw` |
| Convert the drawing to a custom node with local stroke coordinates. | C | C | C | `draw` |
| Expose the drawing through ordinary node data, styling, selection and movement APIs. | C | C | C | `render` |

Remaining work: No primary public-description gap identified. Exact upstream stroke output remains unverified.

Unverified boundary: Browser tests check stroke creation, quadratic path commands and bounds; post-draw dragging/styling, save-load and pixel comparison with perfect-freehand were not specifically tested. Pressure and exact stroke silhouette are unverified. Re-audit of prior C: retain C for achievable smooth drawing and ordinary custom-node behavior. Flow uses a quadratic centerline with a fixed stroke instead of the example's perfect-freehand dependency. Ordinary node manipulation is available by API; the cited browser tests prove creation and bounds only.

### Server Side Image Creation

Source: [Server Side Image Creation](https://reactflow.dev/examples/misc/server-side-image-creation), accessed **2026-10-25**. Subscription source unavailable; public description and dependency list read. Public embed listed by page: [https://example-apps.xyflow.com/react/pro/server-side-image-creation/index.html](https://example-apps.xyflow.com/react/pro/server-side-image-creation/index.html). Not driven in this audit.

Entry rating: **G / G / G**.

| Outcome | Vanilla | Vue | Foldkit | Evidence group |
| --- | --- | --- | --- | --- |
| Generate a static graph image on a backend. | G | G | G | `export` |
| Edit the graph and display the corresponding server image beside it. | G | G | G | `export` |
| Render with declared node/handle geometry without relying on the interactive client DOM. | G | G | G | `export` |
| Provide a runnable backend and container deployment for image generation. | G | G | G | `export` |

Remaining work: Client-side html-to-image downloads exist; no backend image renderer, side-by-side server preview or container.

Unverified boundary: The public example names Puppeteer and static React rendering. Flow core persistence/geometry is not an SSR renderer; custom node support and production service policy need decisions.

## Counts and delivery handoff

Five former C entries become P in every host. Freehand Draw retains C. The Pro subset is **1 C, 12 P, 3 G in Vanilla and Foldkit**, and **1 C, 11 P, 4 G in Vue**. Collaborative moves from P to G in all hosts. Undo and Redo moves from P to G only in Vue; the app-specific Studio history keeps Vanilla and Foldkit at P. The full catalog remains 200 entries, with 195 in scope, 3 stretch and 2 intentional gaps. Close in every host changes from 185 to **180 of 195**. The 179 non-Pro close entries were not re-audited here.

The ordered [delivery plans](../../plans/149-pro-delivery.md) cover every missing outcome and keep wire ties outside the parity denominator. Ratings alone are not release acceptance.

## Verification

Passed on 2026-10-25 with `scripts/with-flow-browser-lock.sh bun run verify`, exit 0, focused profile, one worker per host. The wrapper acquired and released its own shared browser lock and disabled OTLP export. Scope was the baseline quality/architecture/package-build/typecheck/unit checks plus docs, catalog and research trace checks, with these existing browser files:

- Vanilla: `subflows-recipes.e2e.ts`, `layout-recipes.e2e.ts`, `whiteboard-recipes.e2e.ts`, `schema-studio.e2e.ts`. **53 passed**.
- Vue: `subflows-recipes.e2e.ts`, `layout-recipes.e2e.ts`, `whiteboard-recipes.e2e.ts`. **13 passed**.
- Foldkit: `subflows-recipes.e2e.ts`, `layout-recipes.e2e.ts`, `whiteboard-recipes.e2e.ts`, `schema-studio.e2e.ts`. **55 passed**.

Unit tests: **2,595 passed across 105 files**. Browser tests: **121 passed**, with no retries or failures in this run. Standalone `bun run docs:check`, `bun run scripts/check-react-flow-catalog.ts`, `bun run research:check-traces` and `bun run scripts/check-example-recipes.ts` also passed. Additional read-only JSON assertions checked the 16 Pro records, per-host outcome ratings, citation ranges, unchanged non-Pro entries and recalculated summary counts. Public page fetches confirmed disabled unauthenticated ZIP controls for all 16 examples.

A fresh `bun install --frozen-lockfile` supplied this worktree's pinned TypeScript 5.9.3 before verification. The initial docs attempt without local dependencies had resolved an incompatible TypeScript 7 module; it passed after the frozen install. No lockfile or dependency declarations changed.

This is local focused evidence, not `verify:full` acceptance, a paired React Flow comparison or collector-side telemetry proof. Renderer-props citations outside the selected browser files are checked-in test evidence, not browser cases rerun in this profile. Verification output for this run was captured locally at `/tmp/flow149-verify.log`.

Plan 157 replaced the three force-loop files after this audit. Their production citations above now point to the shared browser owner; the original findings describe the pre-157 recipes. See [Plan 157](157-layout-engines.md) for current acceptance.

## Conformity and deviations

- **Conforming:** no new complete Pro reference-conformance claim. No paired upstream/local runtime comparison was performed. C records achievable functional closeness under the catalog definition.

- **Intentionally different:** Flow keeps pure grouping, layout inputs, SVG path geometry, schema decoding and Effect edit preparation in core. Host adapters and apps own lifecycle and DOM work instead of React hooks. Freehand uses a quadratic centerline to avoid requiring a drawing library for the documented smooth-curve outcome; exact pressure/silhouette parity is unverified. Tests cover local path commands and rendered stroke bounds, not a perfect-freehand screenshot comparison.

- **Unverified:** all subscription implementation details; all G outcomes and missing P compositions; exact modifier/toolbar/overlap behavior; undisclosed persistence and edge cases; renderer pixel parity; network/service delivery. Drop-outside detachment, fixed-grid snapping, Dagre-based dynamic layout and client image download are existing alternatives that explain the old optimistic ratings. They do not close the described gaps. Future intentional product deviations need maintainer approval and their own named test boundary.

- Test boundary: the focused local suites named above exercise current recipes. They cannot establish full-suite acceptance or Pro conformance. No telemetry delivery claim is made.
