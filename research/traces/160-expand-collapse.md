# Plan 160: Dynamic tree editing and expand/collapse

Baseline: `8df5cce`, Plan 160 and unit 6 of Plan 149. D6 was adopted on 2026-10-25. This implementation reuses Plans 150, 153, 157, and 159. Imported `research/artifacts/` evidence is unchanged.

## Public reference and design boundary

The [Expand and Collapse page](https://reactflow.dev/examples/layout/expand-collapse) describes retained complete graph state, node-data expansion, click toggles, and child controls. Its [public demo](https://example-apps.xyflow.com/react/pro/expand-collapse/index.html) allows collapse, restoration, and child creation. The [Dynamic Layouting page](https://reactflow.dev/examples/layout/dynamic-layouting) describes node actions, placeholder promotion, edge plus insertion, d3-hierarchy, and animated positions. Its [public demo](https://example-apps.xyflow.com/react/pro/dynamic-layouting/index.html) exposes those gestures. Both pages and demos were accessed on 2026-10-26. Private subscription source and implementation constants were not accessed.

The collaborative preview snapshot failed twice with `Preview automation snapshot timed out after 15000ms.` The fallback was the repository's locked Playwright workflow. Initial inspection observed two dynamic nodes becoming three after a regular-node click, and six expand/collapse nodes becoming four after a parent click. The checked-in public fixture at `research/fixtures/tree-reference/reference.e2e.ts` then passed both cases: collapse/restore/add-child, and node growth/placeholder promotion/edge insertion with multiple intermediate DOM styles. It observes rendered output, not private store state.

D6 selects a single-root tree and versioned expansion data. Core owns the complete graph, validation, projection, edits, and Effect workflow. Host composition supplies accepted document reads, measured geometry, the optional hierarchy engine, and animation. Extending the animation request with an optional edit avoids separate topology and layout history steps.

## Shared production path

Public pointer and keyboard gestures enter `apps/shared/tree/demo.ts:458`. Explicit controls enter the same submit function at `apps/shared/tree/demo.ts:111`. Dynamic Layouting uses regular-node actions to create placeholders. Expand and Collapse toggles regular nodes. Promotion creates the next placeholder atomically. Application controls contain no tree reducer or layout algorithm.

`FlowTreeDataSchema` at `packages/core/src/domain/flow-tree.schema.ts:6` reserves `node.data.tree` with version, kind, and expanded state. The live node schema validates that envelope without projecting away opaque JSON data. `decodeFlowTree` at `packages/core/src/domain/flow-tree.ts:21` validates all nodes and edges, including hidden descendants. An empty tree is valid. Nonempty trees require one root, one parent per nonroot node, no cycles, no missing endpoints, and no group-relative parent coordinates. Placeholders are leaves. These are explicit tree API rules, not an interpretation of arbitrary graph documents.

`prepareFlowTreeEdit` at `packages/core/src/domain/flow-tree.ts:208` decodes a command, validates the current tree, creates one candidate, and validates the result. Commands cover root creation, toggle, promotion, child creation, edge insertion, and subtree deletion. Promotion retains the original node and data, then allocates a collision-free child placeholder. Insertion at `packages/core/src/domain/flow-tree.ts:148` keeps the original edge ID and metadata on the source segment, copies metadata and the original target handle to the downstream segment, and clears the endpoint handles that now belong to the inserted node. No arbitrary JSON strings are remapped.

The complete document remains authoritative. `flowTreeCollapsedIds` at `packages/core/src/domain/flow-tree.schema.ts:25` derives collapse visibility. `projectFlowTree` at `packages/core/src/domain/flow-tree.schema.ts:62` filters a read projection. The complete expansion map comes from `flowTreeExpandedState` at `packages/core/src/domain/flow-tree.schema.ts:75`. `createFlowGraph` at `packages/core/src/domain/flow-graph.ts:79` combines collapsed IDs with authored hidden flags at `packages/core/src/domain/flow-graph.ts:153`. No collapse command writes `hidden`, removes descendants, or changes their own expansion state.

`createFlowTreeEditor` at `packages/core/src/use-cases/tree-editor.ts:72` owns the Effect workflow. It prepares the tree command, constructs the candidate layout input, captures revision identity, runs the Plan 157 session, and submits one animated edit. `getFlowTreeLayoutInput` at `packages/core/src/use-cases/tree-editor.ts:25` includes projected nodes, measured surviving boxes, and explicit authored boxes for new or restored nodes. Missing bounds and invalid visible hierarchies reject without a semantic commit. Unrelated hidden flags remain authoritative. A hidden intermediate node can produce an unsupported visible forest, which the engine rejects rather than inventing parent relationships.

The optional `@flow/layout` engine still owns d3-hierarchy. Core receives it as a capability. Stale revisions, disposal, and engine failures cannot apply the prepared tree edit. Concurrent tree submissions receive an explicit busy failure while a gesture is pending. The default linear 300 ms transition and reduced-motion behavior come from Plan 159.

`FlowNodeAnimationRequestSchema` at `packages/core/src/domain/flow-node-animation.ts:16` now accepts optional `edit`. `prepareFlowNodeAnimationEdit` at `packages/core/src/domain/flow-node-animation.ts:124` combines topology/data operations and destination positions in one transaction. The shared animator at `packages/core/src/use-cases/node-animation.ts:104` prepares that transaction before changing presentation. Its acceptance check at `packages/core/src/use-cases/node-animation.ts:152` compares the complete semantic destination. A rejected data-only proposal cannot appear accepted because its positions happened to match.

Existing `editPrepare`, `documentDecode`, `controllerUpdate`, `gestureCancel`, and `editFailure` spans cover decode, semantic submission, cancellation, and failure. Logs use the existing input/change/count/failure attributes. Pointer moves and animation frames add no logs. Host composition retains lifecycle spans and owns optional export and shutdown. Collector delivery was not tested.

## Host production paths

### Vanilla

`apps/vanilla/src/tree-demo.ts:1` creates the public controller and binds its accepted snapshot, measured internal nodes, and animation command to the shared editor. `apps/vanilla/src/mount-flow.ts:12476` accepts the complete animated transaction through the existing edit owner. History observes that accepted document once. The render graph at `apps/vanilla/src/mount-flow.ts:4248` shares collapsed visibility and animated coordinates among node wrappers, edges, and labels. Node reconciliation uses graph visibility, so a collapsed subtree leaves the DOM while remaining in the snapshot.

The controller still exposes `animateNodePositions`, `applyEdit`, undo/redo, clipboard, and destruction. The recipe's browser observer tracks keyed action controls through animation. It retains focus state when Vanilla moves focus to its canvas after removing a focused descendant, then restores the nearest visible tree ancestor. Pagehide disposes both controls and the controller.

### Vue

`apps/vue/src/tree-demo.ts:1` composes `FlowProvider`, `FlowCanvas`, and `useFlow()`. Reads wait for the accepted reactive tick before obtaining the document and internal nodes. `packages/vue/src/flow-canvas.ts:5742` accepts the same complete animated transaction and waits for `nextTick()`. The reactive graph at `packages/vue/src/flow-canvas.ts:1752` calls shared `createFlowGraph`, so nodes, edges, and labels use the same visibility and positions. The shared browser controls provide pointer/keyboard actions and focus restoration. Scope disposal releases controls, the editor, and canvas animation.

### Foldkit

`apps/foldkit/src/tree-demo.ts:1` composes the Runtime and public instance, history, clipboard, measurement, viewport, and animation clients. Accepted-state ports own the complete document. `createFoldkitNodeAnimationClient` routes the same request through `HostAction.AnimateNodePositions`. `packages/foldkit/src/application.ts:2409` prepares the atomic transaction. The complete accepted-document check at `packages/foldkit/src/application.ts:2432` also rejects data-only controlled mismatches.

The model owns transition frames and history. `packages/foldkit/src/graph.ts:2111` supplies the live document and `packages/foldkit/src/graph.ts:2951` supplies live geometry. The node view at `packages/foldkit/src/graph.ts:7738` and visible edges at `packages/foldkit/src/graph.ts:7968` consume shared graph visibility. Completion retains Plan 159's paint acknowledgment. Controls use the same focus behavior as the other hosts. Pagehide releases the editor, clients, measurement observer, and Runtime subscriptions.

## Test paths and acceptance

`packages/core/src/domain/flow-tree.test.ts:25` constructs explicit tree fixtures and calls the public reducers. Six tests cover nested expansion, authored hidden flags, opaque data, versioned persistence, placeholder promotion, child creation beneath collapsed parents, metadata-preserving insertion, invalid topology and versions, duplicate IDs, missing/deleted targets, empty trees, clipboard remapping, and stale/disposed workflows. Core animation tests separately cover one atomic topology/destination history entry and rejection of data-only controlled proposals. The targeted tree, core animation, and Foldkit animation suites passed 26 tests. The complete unit run passed 125 files and 2,781 tests.

Production reads accepted host state. Browser tests inspect that state through the recipe-only `globalThis.flowTreeDemo` handle, which binds the same public APIs. Normal actions use browser pointer and keyboard controls. Adversarial hidden-flag and deleted-parent inputs use public edit/tree APIs. No test mutates a private store.

The shared browser body at `apps/shared/tree/acceptance.ts:138` runs through `apps/vanilla/e2e/expand-collapse.e2e.ts:1`, `apps/vue/e2e/expand-collapse.e2e.ts:1`, and `apps/foldkit/e2e/expand-collapse.e2e.ts:1`. Nine cases per host passed. They assert placeholder replacement, branch growth, edge plus insertion and retained edge data, nested expansion, focus stability and ancestor fallback, collapsed-parent additions, separate hidden flags, intermediate DOM positions, SVG endpoint attachment under pan/zoom, exact destinations, save/load, clipboard state, one-step history, empty/root/deleted-parent behavior, keyboard activation, disposal, and clean remount.

The unchanged Plan 159 browser suite also passed six cases in each host. Combined acceptance passed 15 cases per host, 45 total. The reference fixture passed two cases. Earlier implementation runs caught a late disposal callback overwriting the disposed status and Vanilla's canvas focus fallback. Both were fixed with the acceptance assertions retained.

Each browser command acquired and released the lock separately:

- `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/expand-collapse.e2e.ts apps/vanilla/e2e/node-animation.e2e.ts --workers=1`: 15 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/expand-collapse.e2e.ts apps/vue/e2e/node-animation.e2e.ts --workers=1`: 15 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/expand-collapse.e2e.ts apps/foldkit/e2e/node-animation.e2e.ts --workers=1`: 15 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config research/fixtures/tree-reference/playwright.config.ts --workers=1`: 2 passed.

`bun install --frozen-lockfile` installed the locked dependencies. Package builds, TypeScript checking, targeted units, and repository lint passed during implementation. The documentation/API generation, docs check, research trace check, and catalog checks run before the final gate. The final gate is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`; its terminal report records the result. Verification retains every previous check and browser file, adds the three tree test files, and appends Plan 160 to activeWork. This is the configured focused profile, not `verify:full` acceptance.

## Catalog changes

After all-host acceptance passed, Expand and Collapse and Dynamic Layouting became C in all three hosts. Their reaudit records cite this trace, shared core operations, public-host composition, and the browser tests. Every named outcome now has current evidence. Summary counts were recomputed from entries: 192 of 195 in-scope entries are C in all hosts, and 13 of 16 Pro entries are C per host. The recipe registry now points to runnable routes and the same acceptance files. These are functional-closeness ratings, not universal upstream parity claims.

## Conformity and deviations

- **Conforming under the public comparison:** parent collapse/restore and child creation; node and placeholder growth; edge plus insertion; visible animated relayout. The public fixture observes these gestures and DOM changes. Flow's all-host tests separately establish retained documents, valid endpoints, and attached rendered paths.
- **Intentionally different:** D6 restricts the shared API to an empty or single-root tree, uses version-1 node data, and selects d3-hierarchy for both recipes. The expand/collapse reference lists Dagre. Flow uses explicit authored boxes before new nodes can be measured, a configurable 300 ms transition, native keyboard buttons, ancestor focus fallback, atomic history, and strict malformed-tree rejection. The full tree is validated before every command. Unsupported visible forests fail explicitly. These policies follow the maintainer decisions and are tested by Flow's unit and DOM suites.
- **Unverified:** private Pro source, exact reference coordinates and constants, internal expansion/history/persistence/clipboard behavior, and OpenTelemetry collector delivery. Local persistence, clipboard, hidden-data preservation, controlled acceptance, and undo are Flow acceptance results. The focused verifier does not establish full-suite or broader reference parity.
