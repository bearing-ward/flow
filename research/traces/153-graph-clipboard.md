# Plan 153 graph clipboard

Plan 153 implements unit 2 of Plan 149 using the adopted D2 policy and Plan 150's accepted transaction history. The plan was read at commit `5be2801`. Imported evidence under `research/artifacts/` remains unchanged. No dependencies were added.

## Reference and research boundary

The public [Copy and Paste description](https://reactflow.dev/examples/interaction/copy-paste), accessed 2026-10-25, promises copying nodes and edges and recommends Shift plus pointer drag to select multiple nodes. The linked [public demo](https://example-apps.xyflow.com/react/pro/copy-paste/index.html) is the target of the independent live comparison in `research/fixtures/graph-clipboard-reference/reference.e2e.ts`. Private subscription source and private tests are unavailable. The accessible description does not specify nested-parent policy, repeat offsets, opaque data or extension contracts.

The Studio precedents remain app-specific. Vanilla table extraction and relationship remapping are at `apps/vanilla/schema-studio/main.ts:541`; Foldkit's table reducer is at `apps/foldkit/schema-studio/model.ts:266`. Generic graph clipboard semantics now live in new core modules. They do not import Studio types or alter the grouping module used by concurrent Plan 154.

## Contracts and state ownership

`FlowGraphFragmentSchema` at `packages/core/src/domain/flow-clipboard.ts:25` defines a version-1 document envelope. `FlowClipboardStateSchema` at `packages/core/src/domain/flow-clipboard.ts:32` stores a fragment or null plus the paste count. `FlowPasteOptionsSchema` at `packages/core/src/domain/flow-clipboard.ts:39` accepts an optional graph-space anchor. Public external fragment values enter as unknown and are decoded by the Effect workflow at `packages/core/src/domain/flow-clipboard.ts:70`. The ordinary document validator rejects missing parents, cycles, duplicate IDs, invalid handles and dangling endpoints.

The extraction at `packages/core/src/domain/flow-clipboard.ts:101` starts from selected nodes and closes over descendants. It uses `createFlowGraph` at `packages/core/src/domain/flow-graph.ts:68` for absolute positions. A copied root without its parent is detached at its absolute anchor; retained children keep their relative anchors. The fragment induces only edges with both endpoints copied. The history projector removes measurement and selection noise and clones JSON without interpreting its strings.

The paste reducer at `packages/core/src/domain/flow-clipboard.ts:184` allocates node and edge IDs against the destination, builds explicit per-node handle maps, remaps endpoints and parents, and offsets only roots. Repeat number one adds 20 graph units; repeat number two adds 40. Explicit placement is already in graph space. An empty fragment yields no edit operations. `FlowClipboardExtension` callbacks receive explicit ID maps and own remapping of references in their fields; arbitrary JSON strings are untouched. The final atomic edit still passes through graph integrity validation.

`createFlowClipboardSession` at `packages/core/src/domain/flow-clipboard-session.ts:40` binds the reducer to a host's accepted document and serialized edit capability. Copy returns a detached fragment. Invalid replacement does not replace session state. Vanilla and Vue each hold one session per mounted canvas. Foldkit embeds the schema state in its application model. No module-wide clipboard, browser clipboard API, storage, framework or transport dependency is introduced.

React and Svelte adapters could bind the same reducer to their accepted-state owner. This plan implements only Vanilla, Vue and Foldkit. No local React/Svelte clipboard adapter or private upstream test is claimed verified.

## Production paths

### Vanilla

The browser entry `apps/vanilla/clipboard/index.html:12` loads `apps/vanilla/src/clipboard-demo.ts:1`, which mounts the public `createFlow` API and binds toolbar buttons. Ctrl/Meta+C and Ctrl/Meta+V enter the canvas-scoped key listener at `apps/vanilla/src/mount-flow.ts:12012`. Input/composition/modifier guards run before clipboard dispatch. The existing host lifecycle owns listener removal.

The public methods at `apps/vanilla/src/mount-flow.ts:14186` delegate to the shared session. Its edit capability at `apps/vanilla/src/mount-flow.ts:11947` resolves the paste against the current accepted document inside the existing mutation queue, calls `prepareFlowEdit`, and publishes one edit proposal with local transaction context. A controlled owner accepts through `update`; uncontrolled publication installs the candidate. `publishAcceptedState` at `apps/vanilla/src/mount-flow.ts:3912` feeds `publishHistory` at `apps/vanilla/src/mount-flow.ts:3825`. Preparation alone does not record history.

Accepted documents flow through the graph cache and geometry projection. Node coordinates become CSS translation at `apps/vanilla/src/mount-flow.ts:1750`; viewport transformation is at `apps/vanilla/src/mount-flow.ts:1754`. Edge geometry at `apps/vanilla/src/edge-renderer.ts:619` resolves the newly remapped nodes/handles and writes SVG paths. Undo/redo uses Plan 150's accepted-state path, restoring the complete paste as one transaction.

### Vue

The browser entry `apps/vue/clipboard/index.html:12` loads `apps/vue/src/clipboard-demo.ts:1`, mounts `FlowProvider` and `FlowCanvas`, and obtains the public actions through `useFlow`. `useFlowClipboard` at `packages/vue/src/use-flow.ts:1236` returns those same owner-backed actions. `FlowProvider` forwards the commands to its registered canvas at `packages/vue/src/provider.ts:116`, so a toolbar above the canvas shares the same clipboard.

The canvas creates its session at `packages/vue/src/flow-canvas.ts:5574`. Keyboard dispatch uses the existing nearest/focused-canvas ownership and native-input exclusions. Paste calls `applyEditResolved`, whose serialized preparation and controlled/uncontrolled publication begins at `packages/vue/src/flow-canvas.ts:4564`. Accepted state enters history at `packages/vue/src/flow-canvas.ts:1520`, independently of proposal preparation.

Rendering projects accepted nodes through the shared geometry. The node style at `packages/vue/src/flow-canvas.ts:9516` applies absolute graph coordinates and the wrapper at `packages/vue/src/flow-canvas.ts:9533` renders them, and viewport translation/scale is at `packages/vue/src/flow-canvas.ts:10968`. The ordinary edge renderer resolves the remapped source and target nodes at `packages/vue/src/flow-canvas.ts:10058`. Scope disposal owns keyboard cleanup and revokes queued edits; composable consumers do not install extra listeners or state owners.

### Foldkit

The browser entry `apps/foldkit/clipboard/index.html:12` loads `apps/foldkit/src/clipboard-demo.ts:1` and embeds `createProgram`. `createFoldkitClipboardClient` at `packages/foldkit/src/clipboard-client.ts:8` sends `HostAction.Clipboard` through the supported action port. It stores no fragment and installs no subscriptions.

Native keys enter `historyKeyboardStream` at `packages/foldkit/src/history-keyboard.ts:6`; the composed path scopes the event to its instance and excludes native controls. The program maps these events to the same clipboard host action. `routeAction` at `packages/foldkit/src/application.ts:2286` updates the model's clipboard on copy or decoded replacement. Paste invokes the shared reducer and sends one `Graph.Message.EditRequest` with local transaction context. The graph's ordinary edit path validates and proposes or accepts the document. `withAcceptedHistory` at `packages/foldkit/src/application.ts:2922` records only accepted graph meaning.

Graph rendering applies absolute left/top at `packages/foldkit/src/graph.ts:7466`, places node wrappers at `packages/foldkit/src/graph.ts:7633`, and renders remapped edges at `packages/foldkit/src/graph.ts:7773`; the viewport transform is at `packages/foldkit/src/graph.ts:7932`. Measurements remain presentation input. Runtime shutdown releases the keyboard stream and mounted program resources at `packages/foldkit/src/application.ts:4132`. A new model starts an empty session. Restoring an earlier development model into a new Runtime also clears clipboard state at `packages/foldkit/src/application.ts:4045`.

## Test paths and acceptance boundaries

The pure core tests at `packages/core/src/domain/flow-clipboard.test.ts:1` call real schema decoding and atomic edit preparation. They cover selected-node/descendant extraction, internal edges, nested remapping, opaque JSON, fresh IDs, repeat displacement, detached roots, explicit placement, extension hooks, empty copy and malformed graph fragments. These are direct core calls, not browser proof.

`packages/foldkit/src/clipboard.test.ts:1` drives public model messages through the real reducer. It checks accepted paste history, controlled proposal rejection/acceptance, model isolation and invalid replacement retention. It does not stand in for native Foldkit input.

The three host test entries are `apps/vanilla/e2e/graph-clipboard.e2e.ts:1`, `apps/vue/e2e/graph-clipboard.e2e.ts:1`, and `apps/foldkit/e2e/graph-clipboard.e2e.ts:1`. Each invokes the shared browser body at `apps/shared/clipboard/acceptance.ts:1` on its real `/clipboard/` page. The tests use actual Shift pointer-box selection, mixed edge selection, native Ctrl/Meta copy/paste, toolbar actions and native text input. Read-only fixture access obtains accepted documents and history through each host's supported controller/composable/snapshot APIs. Tests assert authored positions, IDs, handle references, parent relationships, JSON, rendered node displacement, visible copied edges, rejection without mutation, repeat offsets, transformed graph placement, and one paste per undo step. No test sets selection or document state through hidden internals. Foldkit reads the public snapshot after gestures settle. The snapshot path at `packages/foldkit/src/application.ts:980` can expose a live drag preview, whereas copying reads the accepted model document directly.

The independent network test in `research/fixtures/graph-clipboard-reference/reference.e2e.ts` uses only React's public DOM and gestures. It checks Shift selection, copied node/edge counts, distinct rendered IDs and repeated paste. It does not inspect subscription source or infer private implementation from DOM similarity.

Verification scope is additive in `verification.config.json`. All earlier checks and browser filenames are retained, with `graph-clipboard.e2e.ts` added to each host. All browser commands, including reference checks and final verification, use `scripts/with-flow-browser-lock.sh` and one worker. The final focused verifier includes its entire saved preexisting scope. A focused pass does not imply full-suite acceptance.

## Acceptance results

The targeted browser batch passed on 2026-10-25. Each Playwright command acquired and released its own owner-token browser lock and selected `--workers=1`.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed. The fresh worktree initially lacked the local TypeScript executable; installation resolved that prerequisite. |
| `bun run check` | Passed after implementation and formatting fixes. |
| `bun run check:architecture` | Passed. |
| `bun run typecheck` | Passed, including package builds. |
| `bun run test` | 2668 passed across 113 files. |
| `bunx vitest run packages/core/src/domain/flow-clipboard.test.ts packages/foldkit/src/clipboard.test.ts` | 12 passed. |
| `bun run build` | Passed, including the Vanilla clipboard route. |
| `bun run --cwd apps/vue build` | Passed, including the Vue clipboard route. |
| `bun run --cwd apps/foldkit build` | Passed, including the Foldkit clipboard route. |
| `bunx playwright test apps/vanilla/e2e/graph-clipboard.e2e.ts --workers=1` | 6 passed. |
| `bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/graph-clipboard.e2e.ts --workers=1` | 6 passed. |
| `bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/graph-clipboard.e2e.ts --workers=1` | 6 passed. |
| `bunx playwright test -c research/fixtures/graph-clipboard-reference/playwright.config.ts --workers=1` | 1 public-reference test passed. |
| `bun run research:check-traces` | Passed. |
| `bun run docs:check` | Passed. |

Initial targeted runs exposed recipe setup issues: the Foldkit mount lacked a Runtime container ID, its legacy snapshot could not encode the nested fixture, and content-box measurement caused rendered bounds to grow. The recipe now mounts controls after the canvas appears, uses versioned snapshots and border-box sizing. The mixed-selection fixture now connects its unrelated edge between two unselected nodes, and all recipes explicitly use Meta for additive selection so macOS Control-click does not suppress Foldkit's native click. The acceptance assertions were retained. Temporary hit-stack, pointer-event and selection diagnostics were removed before final verification.

The six cases in each host cover Shift-box and mixed selection; node/edge/handle IDs and repeated offsets; nested parents and descendants; detached roots and transformed placement; valid fragment replacement followed by malformed/missing-parent/dangling rejection; native text and reload; one-step undo/redo; and disposal. The public demo independently demonstrates Shift selection, fresh rendered IDs, node/internal-edge copying and repeated paste. Private source, nesting and offset rules remain outside that reference boundary.

After this acceptance batch, the Copy and Paste Pro catalog entry and all its outcome ratings change from P/P/P to C/C/C. The reaudit cites this trace and the shared/native test entries. The recipe registry points all hosts at `/clipboard/` and records the tested APIs. C retains the catalog's functional-closeness meaning.

The final gate is `scripts/with-flow-browser-lock.sh bun run verify`, which takes a separate lock after edits and metadata checks finish. It selects the focused profile with all saved checks and 58 Vanilla, 56 Vue and 68 Foldkit browser filenames. The verifier supplies one worker to each browser command. Its final outcome is reported separately in the task report; this targeted acceptance is not a full-suite claim.

## Observability

Fragment decoding uses `FlowSpan.documentDecode` with `FlowAttribute.inputKind`, node count and edge count. Schema/integrity failures use the existing document boundary diagnostics; the shared session and Foldkit route log failures with `FlowSpan.editFailure` and the structured failure message. Successful paste uses the existing `editPrepare`, accepted semantic commit, history and `controllerUpdate` boundaries. Mounted host lifecycle and gesture cancellation retain their existing named spans. Pointer movement adds no logs. Application composition still owns optional OTLP export and flushing. No collector delivery claim is made.

## Conformity and deviations

- Conforming to the public description: Shift selection and copying nodes with induced internal edges. The all-host browser acceptance and independent public-demo test are the named test boundaries; source similarity is not evidence.
- Intentionally different or Flow-defined: D2 specifies an internal per-session clipboard, nested descendants, detached copied roots, explicit reference hooks, and 20 graph-unit repeat offsets. This avoids browser clipboard permissions and keeps opaque data unchanged. Plan 150 makes each accepted paste one undo step. The public description does not promise these exact policies, so their tests establish Flow behavior rather than private implementation parity.
- Unverified: subscription source, private tests, OS/system clipboard interoperability, cross-tab persistence, hidden upstream hierarchy/data/offset policies, and collector-side telemetry delivery. No broad reference or full-suite conformance claim is made.
