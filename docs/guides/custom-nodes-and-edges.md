# Custom nodes and edges

Node and edge renderers belong to the browser host. Core retains typed graph data and geometry; the renderer receives decoded node or edge values.

The vanilla demo registers a `demo-card` node renderer and a `demo-edge` path renderer in [`apps/vanilla/src/main.ts`](../../apps/vanilla/src/main.ts). The [canvas tests](../../apps/vanilla/e2e/canvas.e2e.ts) exercise custom node rendering, while [movement tests](../../apps/vanilla/e2e/movement-slices.e2e.ts) verify that renderer updates follow graph changes.

Keep custom node data JSON-compatible if it belongs in `FlowNode.data`. Put DOM listeners, framework state, and cleanup handles in the renderer lifecycle. Return `update` and `destroy` hooks for renderers that own resources. Do not store DOM elements or callbacks in a serialized document.

Custom edge renderers provide path geometry from measured endpoints. The renderer should not reimplement connection validation or mutate the graph directly. Dispatch a Flow command or publish a semantic change through the adapter contract instead.

For Vue, use the typed component slots shown in [`apps/vue/src/FlowCanvas.ts`](../../apps/vue/src/FlowCanvas.ts); the [Vue conformance suite](../../apps/vue/e2e/shared-conformance.e2e.ts) checks the browser-facing contract.
