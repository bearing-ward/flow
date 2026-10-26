# Plan 150 transaction history

Plan 150 implements unit 1 of Plan 149 under the adopted D1 policy. The plan source is `plans/150-transaction-history.md` from commit `60a6400`. History is session-only, bounded to 100 transactions by default, configurable by applications, and excludes viewport and selection.

## Reference and research boundary

The public [Undo and Redo description](https://reactflow.dev/examples/interaction/undo-redo), accessed 2026-10-25, describes snapshots of past and future graph states, move/add/delete operations on nodes and edges, toolbar controls, Ctrl+Z, and Ctrl+Shift+Z. The subscription implementation was unavailable. Imported evidence in `research/artifacts/` was not changed.

The repeatable live comparison is `research/fixtures/transaction-history-reference/reference.e2e.ts:5`. It exercises the linked public demo independently of Flow. No source-level resemblance establishes reference conformity.

## Design decision

The Studio history at `apps/shared/schema-studio/model.ts:230` supplies bounded past/present/future semantics. Core promotes those semantics for graph documents without importing Studio types. One pure reducer owns semantic projection, recording, capacity, branch clearing, gesture grouping, replay reservations, rejection, and disposal.

Three independent sketches considered a pure reducer embedded in each host, a mutable history service beside host state, application-owned stacks, and inverse-operation journals. All chose the embedded reducer. Independent judgment favored the richer receipt-state design. Implementation keeps its acknowledgement-gated replay and compact reducer while using the simpler accepted-document events of the other sketches. This avoids a second state owner in Foldkit and preserves operations-only callers. Origin metadata remains independent of history.

Controlled proposal preparation is distinct from acceptance in all hosts. Recording preparation would include proposals the owner rejects. Replay therefore reserves its target, publishes a proposal, and moves stacks only after matching accepted state. Explicit foreign-origin changes establish a new baseline because whole-document snapshots cannot preserve concurrent peer work.

## Shared contracts and ownership

The transaction context schema at `packages/core/src/domain/flow-transaction-context.schema.ts:3` defines origin independently of history. Atomic transactions accept optional context at `packages/core/src/domain/flow-edit.schema.ts:80`. The Effect preparation workflow decodes and validates the complete candidate at `packages/core/src/domain/flow-edit.ts:241`, then preserves context in the result at `packages/core/src/domain/flow-edit.ts:289`. Preparation does not record history.

History state, status, and event types derive from Effect Schemas at `packages/core/src/domain/flow-history.ts:18`, `packages/core/src/domain/flow-history.ts:41`, and `packages/core/src/domain/flow-history.ts:53`. The semantic projector at `packages/core/src/domain/flow-history.ts:84` removes transient fields and clones retained snapshots. Restoration at `packages/core/src/domain/flow-history.ts:108` retains current selection by ID and keeps current measurements only when the node's non-position semantics still match.

`createFlowHistory` initializes the bounded cursor at `packages/core/src/domain/flow-history.ts:145`. The accepted transition at `packages/core/src/domain/flow-history.ts:180` acknowledges replay, ignores noise, resets foreign semantic baselines, and records local semantic changes. The pure reducer at `packages/core/src/domain/flow-history.ts:245` owns reservations, rejection, explicit gesture boundaries, and disposal. The host remains the sole document authority and holds one instance of this state.

React and Svelte adapters can consume this framework-independent reducer, context, and status contract at the same accepted-document boundary. This unit integrates only Vanilla, Vue, and Foldkit. No local React or Svelte history adapter, private Pro source, or private upstream test fixture is claimed verified. The checked-in network comparison exercises the accessible React demo.

## Production paths

### Vanilla

The browser entry is `apps/vanilla/history/index.html:18`. The page acquires the public JavaScript controller at `apps/vanilla/src/history-demo.ts:66` and binds status to the toolbar at `apps/vanilla/src/history-demo.ts:224`. Public edit calls enter `applyEditResolved` at `apps/vanilla/src/mount-flow.ts:14137`, prepare an atomic candidate, and publish it through `operations.publishChange` at `apps/vanilla/src/mount-flow.ts:8341`.

The uncontrolled publisher installs the candidate. A controlled owner instead echoes its accepted document and context through `update` at `apps/vanilla/src/mount-flow.ts:14101`. Only `publishAcceptedState` at `apps/vanilla/src/mount-flow.ts:3904` sends the accepted document to the shared reducer through `publishHistory` at `apps/vanilla/src/mount-flow.ts:3817`. A prepared or rejected proposal does not advance history.

Undo and redo enter the existing mutation queue at `apps/vanilla/src/mount-flow.ts:11882`, cancel active previews, reserve a target, preserve current presentation through core restoration, and publish an ordinary proposal. The controlled owner retains authority. Reconciliation resolves the document, measurements, and preview overrides through `captureProjection` at `apps/vanilla/src/mount-flow.ts:3532` and `createFlowGraphCache` at `apps/vanilla/src/flow-graph-cache.ts:34`. Absolute positions reach node CSS translation at `apps/vanilla/src/mount-flow.ts:1738`; edge attachment/path geometry uses `apps/vanilla/src/edge-renderer.ts:617`. Destroy revokes actions and releases history at `apps/vanilla/src/mount-flow.ts:13465`.

### Vue

The browser entry is `apps/vue/history/index.html:11`. The toolbar obtains public actions from `useFlow` at `apps/vue/src/history-demo.ts:85` and mounts the canvas at `apps/vue/src/history-demo.ts:283`. Atomic edits enter `applyEditResolvedNow` at `packages/vue/src/flow-canvas.ts:4563`. The accepted authority is `activeDocument` at `packages/vue/src/flow-canvas.ts:1298`, selected from owned or controlled bindings.

`acceptHistoryDocument` at `packages/vue/src/flow-canvas.ts:1519` feeds the shared reducer. Controlled history waits for the complete document/context or split nodes/edges prop patch through the post watcher at `packages/vue/src/flow-canvas.ts:1560`. Existing accepted-state subscriber notifications remain synchronous. Uncontrolled semantic acceptance remains synchronous. Missing receipt metadata records an accepted replacement as an ordinary edit, while a rejected proposal changes no authority or stacks.

Replay enters the serialized queue at `packages/vue/src/flow-canvas.ts:5456`, cancels previews, validates the restored document, and emits through the usual controlled or owned path. Accepted documents and measurements build graph geometry at `packages/vue/src/flow-canvas.ts:1728`. Rendering places nodes with CSS left/top at `packages/vue/src/flow-canvas.ts:9480`; the node wrapper and edge renderers consume this graph geometry. Scope disposal captures authority first at `packages/vue/src/flow-canvas.ts:10277`, settles queued promises, and releases history resources. `useFlowHistory` shares the canvas owner rather than creating another stack.

### Foldkit

The browser entry is `apps/foldkit/history/index.html:10`. The app embeds `createProgram` at `apps/foldkit/history/main.ts:108`, binds Undo at `apps/foldkit/history/main.ts:148`, and subscribes toolbar state at `apps/foldkit/history/main.ts:305`. `createFoldkitHistoryClient` at `packages/foldkit/src/history-client.ts:26` sends public history requests at `packages/foldkit/src/history-client.ts:98`. It owns request correlation and subscriptions, not snapshots.

The application stores the core history schema directly in its model at `packages/foldkit/src/application.ts:728`. The inbound subscription at `packages/foldkit/src/application.ts:2082` produces `HistoryRequest`, handled at `packages/foldkit/src/application.ts:3100`. Replay cancels previews and either replaces the uncontrolled document or emits a context-bearing controlled proposal. Controlled acceptance enters through `HostAction.ReplaceDocument`, whose context is observed by `prepareHistoryInput` at `packages/foldkit/src/application.ts:2798`; graph replacement is at `packages/foldkit/src/graph.ts:3668`. `withAcceptedHistory` at `packages/foldkit/src/application.ts:2857` reduces the final accepted graph document. Status publication uses the dedicated command at `packages/foldkit/src/application.ts:1156`, preserving existing graph-publication ordering.

Ordinary edits prepare through `packages/foldkit/src/graph.ts:1339`. Pointer movement produces a live document projection at `packages/foldkit/src/graph.ts:1975` while accepted authority remains unchanged. The renderer builds graph geometry at `packages/foldkit/src/graph.ts:7418` and applies absolute node positions at `packages/foldkit/src/graph.ts:7466`. Program construction and browser subscriptions belong to the adapter at `packages/foldkit/src/application.ts:4006`; scope teardown releases program resources and logs disposal at `packages/foldkit/src/application.ts:4058`. Client disposal settles its pending requests and removes listeners at `packages/foldkit/src/history-client.ts:155`. Status transport activates on an explicit history request at `packages/foldkit/src/application.ts:3100`; the client requests initial status after installing its listeners. Accepted history recording remains unconditional, and runtimes without history consumers retain existing graph-publication scheduling.

Telemetry names and attributes come from `packages/core/src/telemetry/flow-telemetry.ts:1` and `packages/core/src/telemetry/flow-telemetry.ts:36`. History transitions use the existing `controllerUpdate`, `hostMount`, `hostDestroy`, `gestureCancel`, and failure telemetry vocabulary. Semantic noops and pointer previews do not add history transition logs. Application composition still owns optional OTLP export and flushing.

## Test paths

Pure reducer tests and public browser acceptance are separate evidence. `packages/core/src/domain/flow-history.test.ts:488` verifies that replay needs a context echo. `packages/core/src/domain/flow-history.test.ts:504` covers explicit rejection and delayed acceptance. `packages/core/src/domain/flow-history.test.ts:751` checks current selection and safe measurements. Context propagation and operations-only compatibility begin at `packages/core/src/domain/flow-history.test.ts:852`.

The 38 new unit cases cover default100/0/1 retention, atomic edits and failure, semantic noise and structural equality, branches, grouped repeats and return to baseline, replay identity/target mismatches, rejection, foreign updates, disposal, cloning, runtime schemas, and legacy callers. The core-only run passed 1,560 tests across 59 files. That establishes core behavior without claiming host DOM integration.

Host browser paths are distinct from the pure reducer path:

- Vanilla's public action cases start at `apps/vanilla/e2e/transaction-history.e2e.ts:151`. Native drag/keyboard grouping is at `apps/vanilla/e2e/transaction-history.e2e.ts:367`; controlled replay acceptance/rejection is at `apps/vanilla/e2e/transaction-history.e2e.ts:513`. The fixture supplies real connection handles, snapshots await the public measurement refresh, and initial edge assertions wait for actual rendering. Keyboard movement selects the node through a native click before the held-arrow gesture.
- Vue's public action cases start at `apps/vue/e2e/transaction-history.e2e.ts:111`. Native drag/cancel/repeats are at `apps/vue/e2e/transaction-history.e2e.ts:167`; controlled and split acceptance/rejection are at `apps/vue/e2e/transaction-history.e2e.ts:248`; native reconnect and restored SVG output are at `apps/vue/e2e/transaction-history.e2e.ts:350`. Position assertions check left/top and viewport-relative DOM geometry, matching the actual renderer. Rejected remote-proposal receipt regressions at `apps/vue/e2e/transaction-history.e2e.ts:417` prove that a later local acceptance retains its own origin and undo cursor.
- Foldkit's public edit sequence starts at `apps/foldkit/e2e/transaction-history.e2e.ts:87`. Native drag/reconnect coverage is at `apps/foldkit/e2e/transaction-history.e2e.ts:190`; controlled acceptance/rejection is at `apps/foldkit/e2e/transaction-history.e2e.ts:397`; bounded retention, isolation after disposal, and reload reset are at `apps/foldkit/e2e/transaction-history.e2e.ts:445`. Controlled native keyboard repeats at `apps/foldkit/e2e/transaction-history.e2e.ts:350` assert one step for the complete movement. The application attaches the same unique held-key context to graph publication at `packages/foldkit/src/application.ts:2949`. Reducer and client unit tests exercise messages and ports separately from the browser.

All browser suites assert restored semantic documents and rendered positions or edge membership/path. Rejected-edit coverage uses typed invalid graph edits. Malformed-patch error serialization in Foldkit is an existing separate boundary and is not claimed fixed by this unit.

## Verification

Every added browser test is appended to `verification.config.json`. All existing check and browser scope remains. Browser commands use `scripts/with-flow-browser-lock.sh` and one worker. The final configured verifier is a focused profile, even though its preserved browser selection is broad. It does not establish full-profile acceptance.

Commands and results before the final verifier:

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed. |
| `bun run build:packages` | Passed after the final host corrections. |
| `bun run tsc --noEmit --pretty false` | Passed after the final host corrections. |
| `bun run check` | Passed lint and formatting. |
| `bun run check:architecture` | Passed 429 production files and rule fixtures. |
| `bun run scripts/check-api-members.ts` | Passed 114 API pages and 2,692 members. |
| `bun run scripts/check-api-member-contracts.ts` | Passed 8,076 host cells and 868 owned groups; this is structural ownership evidence. |
| `bun run test` | Passed 2,653 tests in 110 files, including 38 new shared-history tests and 234 Foldkit tests. |
| `bun run docs:check` | Passed generated API, links, snippets, and examples checks. |
| `bun run research:check-traces` | Passed citation checks across 92 traces. |
| `bun run verify --list` | Confirmed the focused profile and 179 selected browser files: 57 Vanilla, 55 Vue, and 67 Foldkit. |
| Scope comparison against `60a6400` | Passed: all previous checks and browser files retained in order; only new scope appended. |
| `git diff --check` | Passed. |

Locked acceptance results: Vanilla 19/19, Vue 20/20, Foldkit 7/7, and the independent public-reference comparison 1/1 passed. The host cases cover public node/edge moves, additions and deletions; native pointer and keyboard gestures; exact restored documents and rendered positions/paths; empty stacks, branches, cancellation, rejection, controlled acknowledgement, capacity, selection/viewport exclusion, isolation, disposal and reload reset.

Existing nested renderer keyboard ownership cases passed 2/2 after the shortcut guard correction.

The catalog's Undo and Redo Pro row moves from P/G/P to C/C/C with a Plan 150 reaudit record. The in-scope all-host close count moves from 180 to 181 of 195. Other entry ratings retain their existing evidence boundaries.

The finishing gate is `bun run verify`, executed under the same `scripts/with-flow-browser-lock.sh` owner after these acceptance results and catalog evidence are written. The verifier supplies `--workers=1` to all selected host commands. Its terminal result is reported with the commit delivery. Each host invocation is `scripts/with-flow-browser-lock.sh bun run playwright test`, with its host config and `transaction-history.e2e.ts` path, plus `--workers=1`. The independent live-reference command uses `--config research/fixtures/transaction-history-reference/playwright.config.ts --workers=1`.

Initial browser runs exposed fixture and test setup errors: Vanilla omitted the handles required to render its edges and attempted keyboard movement without selecting the node; Vue expected a transform instead of its renderer's left/top geometry and used Ctrl+Z rather than the platform-native text undo shortcut on macOS. The Vue demo also formats typed failures with `String(error)` because some typed graph errors have an empty `.message`. Corrected tests retain literal movement, stack, document, and DOM assertions; Vanilla additionally verifies reconnect path changes and exact restoration, capturing actual measured handle geometry rather than the initial inferred handle bounds. An independent final source review also found stale Vue proposal receipt metadata and missing Foldkit controlled keyboard grouping metadata. Both production defects gained regression cases before acceptance reruns.

The first broad verifier caught an early history input guard suppressing Escape cancellation from nested renderer controls. Scoping the editable/composition guard to undo/redo restores the established cancellation path. The existing controlled and uncontrolled assertions at `apps/vanilla/e2e/graph-renderers.e2e.ts:577` remain unchanged.

The expanded gate also exercises accepted-edit callback disposal at `apps/vue/e2e/interaction-lifecycle.e2e.ts:246`. Disposal now rejects only edits still waiting in the queue; an edit accepted before its callback unmounts the canvas retains its successful result. Active preparation keeps its own disposal check before publication. The existing test assertions remain unchanged.

The Foldkit gate exposed an unsolicited status publication adding a microtask to the established node-release stream. Status transport now activates through explicit history requests, including the client's initial status read, while accepted history recording remains unconditional. The unchanged queued-deliver and queued-dispose cases at `apps/foldkit/e2e/node-threshold.e2e.ts:136` verify publication compatibility.

A standalone attempt to typecheck the packed-consumer fixtures directly in the repository failed because `@flow/*` archive packages are installed only by the supported packed-consumer runner. That command did not establish consumer acceptance; the final verifier's isolated archive-install gate is the consumer boundary.

## Conformity and deviations

- **Conforming:** the live public demo restores node creation and a complete drag through toolbar controls and Ctrl shortcuts, including empty-stack controls. All 46 public host acceptance cases pass for the implemented node/edge history outcomes. These are functional claims within the named public browser boundary, not private-source or catalog-wide reference conformance.
- **Intentionally different:** D1 explicitly chooses bounded session-only history, configurable capacity, and no viewport or selection history. Explicit controlled acknowledgement protects rejected replay. Foreign-origin updates reset the snapshot baseline until a collaborative undo integration exists.
- **Unverified:** private Pro implementation details, selective collaborative undo, and collector-side OpenTelemetry delivery. Effect telemetry uses existing spans; no collector test is part of this unit.
