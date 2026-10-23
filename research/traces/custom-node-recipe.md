# Custom Node recipe trace

This trace covers the dated React Flow `Custom Node` journey through Flow's existing host renderer contracts. It establishes original Flow-authored custom-node behavior; the upstream comparison remains unverified. The catalog host routes remain planned because these tests mount fixtures rather than user-facing example pages.

## Production paths

### Vanilla

`mountFlow` accepts a type-keyed `nodeRenderers` registry whose renderer receives the decoded `FlowNode` and a content element (`apps/vanilla/src/mount-flow.ts:586`, `apps/vanilla/src/mount-flow.ts:794`). When an accepted graph update arrives, the host resolves the renderer by node type and updates the existing instance; the returned update callback can refresh custom DOM from the next node data (`apps/vanilla/src/mount-flow.ts:4357`). The public controller's `updateNodeData` builds an `update-node-data` operation from the current document (`apps/vanilla/src/mount-flow.ts:9165`). Core merges this data into the matching node (`packages/core/src/domain/flow-edit.ts:189`).

### Vue

`FlowCanvas` exposes `nodeTypes` as a type-keyed component registry (`packages/vue/src/flow-canvas.ts:486`). Rendering selects the component for the node type, falling back through `nodeComponent` to the default renderer (`packages/vue/src/flow-canvas.ts:4176`); `NodeWithIdContext` mounts it with the current node snapshot (`packages/vue/src/flow-canvas.ts:4417`). The fixture uses controlled `document` ownership: its custom control asks the owner to replace the matching node data through `decodeFlowDocument`, and passes that accepted document back to `FlowCanvas` (`apps/vue/src/custom-node-test.ts:66`, `apps/vue/src/custom-node-test.ts:83`). This test does not claim a renderer component can mutate the graph independently of its owner.

### Foldkit

The renderer registry maps node types to `FoldkitNodeRenderer` callbacks receiving a `FlowNode` and Html builder (`packages/foldkit/src/graph.ts:2284`). Foldkit's graph message accepts a schema-validated `FlowEditTransaction` (`packages/foldkit/src/graph.ts:319`) and routes it through `requestEdit` (`packages/foldkit/src/graph.ts:1218`). Core applies `update-node-data` to the accepted node document (`packages/core/src/domain/flow-edit.ts:189`).

## Mounted test paths

- Vanilla mounts through public `mountFlow`, activates the custom renderer's native button, calls the controller's public `updateNodeData`, and checks status/detail, retained DOM identity, and unchanged position (`apps/vanilla/e2e/custom-node-recipe.e2e.ts:8`).
- Vue mounts `FlowCanvas` with a custom `nodeTypes` component and a controlled document owner; the test activates the rendered button and checks the accepted snapshot is reflected in status/detail without replacing the node DOM or changing position (`apps/vue/src/custom-node-test.ts:13`, `apps/vue/e2e/custom-node-recipe.e2e.ts:3`).
- Foldkit mounts two instances from its typed registry fixture; the custom control sends an `EditRequest` with a data update and the test checks only the activated instance changes, retaining its node DOM identity and position (`apps/foldkit/e2e/test-harness.ts:489`, `apps/foldkit/e2e/renderer-contract.e2e.ts:767`).

The shared observable is the accepted node snapshot rendered as a custom title, status, and detail. No new dependency or upstream asset was introduced. The fixtures are not discoverable gallery pages, do not test narrow-screen styling or accessibility beyond native button activation, and do not compare rendered output to React Flow.

## Conformity and deviations

- **Conforming:** Each host selects a custom node renderer through its existing public host surface. A status action updates the corresponding node's accepted data, updates the displayed status/detail, and retains the mounted node identity and position.
- **Intentionally different:** Vue leaves controlled graph ownership with the parent component; the custom node action requests an owner update rather than mutating FlowCanvas state. Foldkit's two renderer-contract canvases are independent runtime documents; the recipe asserts instance-local change rather than cross-canvas synchronization.
- **Unverified:** React Flow visual/API parity, reference behavior, gallery navigation, responsive layout, and a comparison against the dated public page. The exact boundary is the mounted Playwright browser fixture per host, using each host's renderer and data-update path; no upstream runtime was executed.
