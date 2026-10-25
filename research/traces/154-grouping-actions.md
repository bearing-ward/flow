# Plan 154 grouping actions and sizing

Plan 154 implements unit 3 of Plan 149 with the adopted D3 policy and the accepted-document history owner from Plan 150. No dependency was added. Imported evidence under `research/artifacts/` is unchanged.

## Public reference evidence

On 2026-10-25, the public [Selection Grouping description](https://reactflow.dev/examples/grouping/selection-grouping) describes selecting multiple nodes, a contextual Group action, an Ungroup action for a selected group, and automatic child-driven dimensions. The public [Parent Child Relation description](https://reactflow.dev/examples/grouping/parent-child-relation) describes drag attachment, toolbar detachment, and coordinate conversion. These descriptions are the accessible comparison boundary. Subscription source and exact overlap behavior remain unverified; this work does not infer hidden algorithms from the descriptions.

## Production paths

The browser entry points are the `/ui-recipes/subflows/` pages in Vanilla, Vue, and Foldkit. Their toolbars route to the same core command workflow, with graph semantics in core and browser/framework lifecycle in their hosts.

Vanilla's toolbar at `apps/vanilla/src/ui/subflows-recipes.ts:57` calls the public `createFlowGrouping` entry point at `apps/vanilla/src/grouping.ts:8`. The adapter reads the accepted snapshot and measured internal nodes, converts internal geometry to absolute rectangles, and runs `prepareFlowGrouping`. The resulting edit uses the controller's existing proposal and acceptance pipeline. Accepted-state publication refits groups before snapshot/history publication in `apps/vanilla/src/mount-flow.ts:3907`. The late-bound measurement lifecycle at `apps/vanilla/src/mount-flow.ts:13355` reconciles changed wrapper geometry and publishes accepted state. The DOM reconciler applies authored sizes at `apps/vanilla/src/mount-flow.ts:8199`, incorporates its own measurement changes into the current pass, and updates child transforms and edge paths. Keeping the captured document and DOM ownership claims prevents a resized parent from invalidating the remaining child updates. Browser measurement callbacks schedule refits after reconciliation rather than reentering it.

Vue's contextual toolbar at `apps/vue/src/subflows-recipes.ts:123` calls `useFlowGrouping` at `packages/vue/src/grouping.ts:8`. The composable reads the complete accepted document and measured internals from the same canvas owner and submits one `applyEdit` transaction. `packages/vue/src/flow-canvas.ts:2632` fits accepted gesture changes. `packages/vue/src/flow-canvas.ts:2376` fits intrinsic measurements into the owned document. Reactive rendering at `packages/vue/src/flow-canvas.ts:9514` updates group sizes, child positions, and edge geometry. Controlled proposals retain the existing owner-acceptance contract; the automatic measurement amendment applies to uncontrolled owned state.

Foldkit's toolbar calls `createFoldkitGroupingClient` at `packages/foldkit/src/grouping-client.ts:24`. One versioned snapshot request captures the accepted document and all internal nodes together. The client prepares and sends one edit request, correlates its result, and releases subscriptions on disposal. `packages/foldkit/src/graph.ts:1229` fits semantic changes, `packages/foldkit/src/graph.ts:1246` fits document replacements, and `packages/foldkit/src/graph.ts:4587` fits measurement updates. The graph model owns accepted geometry and the Foldkit node view at `packages/foldkit/src/graph.ts:7631` renders it. `packages/foldkit/src/application.ts:2874` records accepted semantic documents and identifies measurement-only amendments.

## Core state and geometry

`FlowGroupingActionSchema` at `packages/core/src/domain/flow-grouping-actions.ts:13` derives the action union. Inputs cross a schema-decoding boundary at `packages/core/src/domain/flow-grouping-actions.ts:182`. Group reuses `groupNodes`; Ungroup and Detach reuse `reparentNode`. Ungroup reparents all direct children before removing only the wrapper. Edges between surviving nodes remain unchanged. Prepared operations use the normal final graph validation at `packages/core/src/domain/flow-edit.ts:242`.

The sizing extension at `packages/core/src/domain/flow-grouping-actions.ts:30` is explicitly scoped to `node.data.flowGrouping`. It preserves opaque data and survives the existing versioned save format without modifying frozen envelopes. `refitGroupNodes` at `packages/core/src/domain/flow-grouping-actions.ts:38` fits direct children recursively with 20-unit padding, adjusts their relative anchors, and preserves descendant absolute bounds. Missing bounds or cycles leave the input unchanged. `refitFlowGroups` at `packages/core/src/domain/flow-grouping-actions.ts:150` builds geometry from authored sizes and available intrinsic measurements. Fallback layout dimensions are excluded from the fit bounds.

The history reducer at `packages/core/src/domain/flow-history.ts:250` accepts a derived measurement amendment without adding a transaction. Its past/future stacks remain intact. Semantic grouping commands use the ordinary transaction path. Undo/redo, rejected proposals, instance isolation, and teardown retain the Plan 150 owner.

Recipes explicitly configure Meta-click multi-selection and Shift-drag selection. Drop attachment still calls `getDropParentId`; targets use the pre-drag wrapper rectangles, full containment, and the smallest eligible target. This preserves drop-outside detachment when auto-fit changes group bounds after release.

## Observability

The grouping Effect uses `FlowSpan.editPrepare`, `FlowAttribute.inputKind`, `changeKind`, and `nodeCount`. Decode or command rejection logs failure context under `FlowSpan.editFailure`. The existing host acceptance and history pipelines retain semantic commit and lifecycle logs. Measurement updates add no high-frequency pointer logs. Application composition still owns OTLP export and shutdown. Collector delivery was not tested or claimed.

## Test paths and results

Production toolbars use the public host grouping APIs. Browser proofs import the shared contract at `packages/conformance/src/grouping-actions.ts:85` through each host's `grouping-actions.e2e.ts`. A typed recipe fixture exposes public edit, history, viewport, and save/load operations; it does not replace pointer gestures or graph reducers. The contract checks toolbar visibility, grouping, ungrouping, detachment, stable absolute positions, edges, one-step history, authored and DOM size changes, nested groups, zoom, selection, and saved-document round trips. Existing `subflows-recipes.e2e.ts` suites retain their grouping drag and drop-in/drop-out assertions.

The failed replay experiment tested the premise that wrappers only needed another measurement. The rerunnable `ungroup-state` attachment in the shared contract showed one unmeasured actor, the recreated group wrapper, while A, B, C, D, G0, and E were measured. The observer assigned the replacement DOM element a newer generation, but the model retained the old generation and rejected it. Observer batches now register monotonically newer generations at `packages/foldkit/src/grouping-model.ts:84` before applying samples. Older receipts remain rejected. The public-message regression is `packages/foldkit/src/grouping-measurement.test.ts:1`. Changes to authored sizes or intrinsic content invalidate stale dimensions before refitting or replay, through `packages/foldkit/src/grouping-model.ts:13`; the recipe resamples after accepted rendering.

Pure tests in `packages/core/src/domain/flow-grouping-actions.test.ts:63` cover literal bounds, nested sizing, centered anchors, intrinsic measurement, idempotence, missing bounds, cycles, preserved edges, and history amendments. The complete unit suite passes 2,664 tests in 113 files. The final targeted browser cycle passes 8 tests per host, 24 total, under one owner-token lock and one worker. Each host runs six shared acceptance cases plus its two unchanged subflow cases. Earlier failures exposed stale parent measurements, stale Foldkit dimensions, replacement observer generations, intrinsic replay using old content measurements, and an edge crossing a historical drag grip. The source fixes preserve the original gesture assertions; the recipe edge routes below that grip.

Commands and captured outcomes:

- `bun install --frozen-lockfile`: installed the locked workspace dependencies.
- `bun run build:packages`, `bunx tsc --noEmit`, `bun run check`, and `bun run check:architecture`: passed.
- `bun run test`: 2,664 tests passed in 113 files.
- `bun run research:check-traces` and `bun run docs:check`: passed.
- `bunx playwright test apps/vanilla/e2e/grouping-actions.e2e.ts apps/vanilla/e2e/subflows-recipes.e2e.ts --workers=1`: 8 passed.
- The same two files with `--config apps/vue/playwright.config.ts`: 8 passed.
- The same two files with `--config apps/foldkit/playwright.config.ts`: 8 passed.
- The first complete focused `bun run verify` passed the non-browser gates, including all unit tests, builds, documentation, and research checks. The React reference gate then stopped at 226 passed and two navigation failures: `reference-drag-threshold.e2e.ts` lost its execution context, and `[UP-128-007]` timed out in `page.goto`. That run did not reach the three host browser scopes and is not a focused-profile pass.
- A per-command locked retry of those two reference cases passed both tests without reference source changes. A fresh complete locked verifier follows that retry.
- The next complete verifier passed all 228 React reference tests, then reported 883 passed, 4 skipped, and one failed Vanilla case. `[UP-126-015]` timed out in `beforeEach` while waiting for the first node; its marker assertions were not reached. All grouping cases passed. Vue and Foldkit's preserved broad scopes were not reached by that run. The focused-profile result therefore remained nonzero pending retry.
- The isolated per-command locked `[UP-126-015]` retry passed under its existing ledger classification (one passed, with the known intentional marker difference). No source, assertions, ledger, or verification scope changed for that retry. The complete locked verifier is rerun after it.
- The final `scripts/with-flow-browser-lock.sh bun run verify` passed every non-browser gate and then exited 1 in the unchanged pinned React reference suite: 227 passed and `[UP-126-041] autoPanOnNodeDrag` timed out during `page.mouse.move`. No Flow host browser scope was reached in this last run. The preserved focused profile is therefore **not green**. The 24 targeted grouping/subflow passes remain the acceptance evidence; they do not establish acceptance of the full preserved browser scope.

Every browser command runs inside `scripts/with-flow-browser-lock.sh` with one worker. The initial targeted cycle used an owner-token shell; that shell has exited. Subsequent browser commands acquire and release the lock separately. The focused configuration retains all 179 prior browser files and every prior check, and adds one grouping file for each host. This scope does not establish full-suite or private-source conformance.

## Conformity and deviations

- **Conforming to the public outcome descriptions:** contextual grouping, explicit ungrouping and detachment, coordinate preservation, and automatic child-driven sizing. The test boundary is the shared host contract plus the unchanged subflow gesture suites. This classification does not claim hidden implementation parity.
- **Intentionally different:** the adopted D3 policy fixes 20-unit padding, fits direct children from the inside out, and retains full-containment/smallest-target attachment. No public reference has established another overlap rule.
- **Intentionally different:** the recipes use an explicitly configured Meta modifier for click selection and Shift for selection-box gestures. The public description mentions Shift-click. Host tests prove the configured Flow modifier instead of relying on host defaults.
- **Intentionally different:** existing manually sized groups opt into auto-fit through explicit metadata; new grouping commands create fitted groups. This preserves authored manual wrappers and avoids an implicit migration of existing documents.
- **Unverified:** subscription source details, exact upstream overlap thresholds, upstream DOM output, collaborative undo, and collector-side OpenTelemetry delivery.
