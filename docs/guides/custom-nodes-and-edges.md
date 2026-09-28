# Custom nodes and edges

Node and edge renderers belong to the browser host. Core retains typed graph data and geometry; the renderer receives decoded node or edge values.

The vanilla demo registers a `demo-card` node renderer and a `demo-edge` path renderer in [`apps/vanilla/src/main.ts`](../../apps/vanilla/src/main.ts). The [canvas tests](../../apps/vanilla/e2e/canvas.e2e.ts) exercise custom node rendering, while [movement tests](../../apps/vanilla/e2e/movement-slices.e2e.ts) verify that renderer updates follow graph changes.

Keep custom node data JSON-compatible if it belongs in `FlowNode.data`. Put DOM listeners, framework state, and cleanup handles in the renderer lifecycle. Return `update` and `destroy` hooks for renderers that own resources. Do not store DOM elements or callbacks in a serialized document.

For custom node content, add `data-flow-drag-handle` to a descendant when only a specific part of the node should start pointer dragging. Once a marker exists, pointerdown elsewhere in that node content does not start a drag; nodes without a marker keep the normal node-body behavior. Add `data-flow-no-drag` to a nested control to suppress dragging even inside a marked handle. No-drag controls keep their normal click and focus behavior. The host reads these attributes from the current DOM on each pointerdown, so renderer updates can add or remove markers without replacing the keyed node. `draggable: false` still prevents movement regardless of the marker.

Custom edge renderers provide path geometry from measured endpoints. The renderer should not reimplement connection validation or mutate the graph directly. Dispatch a Flow command or publish a semantic change through the adapter contract instead.

For Vue, use the typed component slots on [`FlowCanvas`](../../packages/vue/src/flow-canvas.ts); the [Vue conformance suite](../../apps/vue/e2e/shared-conformance.e2e.ts) checks the browser-facing contract through `@flow/vue`.

## Per-type renderers and measured handles

Vanilla mount options accept `nodeRenderers` and `edgeRenderers` records keyed by each node or edge `type`. A renderer instance keeps its resources in the host and implements `update` and `destroy`; same-ID, same-type updates reuse it, while a type change destroys it once and mounts the replacement. An absent or unknown type uses the built-in fallback. The demo uses the public [`mountFlow` API](../../apps/vanilla/src/public.ts) and shows both registrations.

Vue `FlowCanvas` accepts `nodeTypes` and `edgeTypes` component records. The older `nodeComponent` and `edgeComponent` props remain as fallback options, and the default renderer remains the final fallback. Vue keys preserve component identity across data updates; changing the registered type replaces the component. Components receive the decoded graph value and custom edge context with the computed path and marker IDs. See the [Vue playground](../../apps/vue/src/main.ts) and [renderer contract E2E](../../apps/vue/e2e/renderer-contract.e2e.ts).

Foldkit keeps `nodeTypes` and `edgeTypes` in the `createProgram` host configuration, outside the serializable graph model. Its keyed HTML views receive graph values and measured edge geometry, and rebuilt views retain keyed identity. The [Foldkit playground](../../apps/foldkit/src/main.ts) demonstrates both registries.

Declared handle IDs and sides belong to graph data; actual handle bounds belong to host measurement state. When custom node content moves a handle, notify the host's measurement refresh API or let its observer report the changed bounds. Incident edge endpoints are then recalculated from the measured handle boundary. Markers are defined per host SVG, SVG paths expose selectable hit targets, and default edge labels use the host's HTML overlay in graph coordinates. This lets label text use ordinary HTML without transferring pointer or keyboard ownership away from node controls and the canvas.

A registry is host configuration rather than saved document data. Keep `FlowNode.data` and `FlowEdge.data` JSON-compatible; renderer functions, VNodes, DOM nodes, and measured dimensions are not serialized.
