# Plan 140: Component observers and changes

Start at `0507d7f547cb262916162404b24cf754508f17f9`. Preserve upstream assertions, immutable research evidence, documented differences, and all existing verification scope.

The two following sections preserve the Plan 139 follow-up specifications and historical failures. The implementation decisions and results below record the current outcome.

## Public state and viewport observers

### Goal

Match the source observer histories through host-native public APIs. Resolve the empty-graph readiness contract, the initial default-document emissions, measured node metadata, and unsolicited or missing viewport lifecycle notifications.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-002 | handles defaultEdges | vanilla | The controller starts with the supplied edge; its getter/subscription history never contains the upstream empty edge array. |
| UP-128-002 | handles defaultEdges | vue | The defaultDocument edge composable starts with the supplied edge and never emits the upstream empty edge array. |
| UP-128-003 | handles nodes | vue | useNodes() omits measured from its node snapshots even after dimensions events report 100x50 for both nodes, so the literal measured-node array is absent. |
| UP-128-004 | handles defaultNodes | vanilla | The default document is populated synchronously; node history never contains []. The later measured-node equality is not reached. |
| UP-128-004 | handles defaultNodes | vue | The defaultDocument node composable never emits []; the later measured-node equality is not reached. |
| UP-128-005 | returns false for no nodes | vanilla | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-005 | returns false for no nodes | vue | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-010 | handles zoom in | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-010 | handles zoom in | foldkit | The wheel changes the viewport zoom above 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-011 | handles zoom out | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-011 | handles zoom out | foldkit | The wheel changes the viewport zoom below 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-040 | handles onMove handlers | vanilla | onMove has already fired once at mount, violating the initial zero-call assertion before the pane drag is attempted. |

### Scope and acceptance

Start with Vanilla controller getters and viewport subscriptions, Vue useNodes/useEdges/useViewport/useFlow, and Foldkit store and viewport ports. UP-128-003 on Vue is a composable projection issue: dimensions arrive at 100x50 while useNodes has no measured field. Do not add synthetic empty snapshots or suppress actual lifecycle calls in the fixture.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Node change payloads

### Goal

Match the literal source onNodesChange batches, their order, and retained replacement item values after measurement. Preserve immutable document ownership and core reducer guarantees.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-044 | receive replace and dimension change | vanilla | After the update button and all three callback batches, the retained replacement item still has measured 150x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | vue | After the update button and all three callback batches, the retained replacement item still has measured 100x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | foldkit | Two initial measurement callbacks shift the source order: the second recorded call contains Node 2 dimensions rather than the expected replacement. Later payload checks are not reached. |
| UP-128-045 | receive select and unselect change | vanilla | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | vue | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | foldkit | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-046 | receive position change | vanilla | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | vue | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | foldkit | The completed position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |

### Scope and acceptance

Record the actual callback argument references, as Cypress spies do. Separate the initial dimension batches, replacement publication, and later dimensions. Check that select batches omit unchanged nodes and that completed position batches include dragging:false and positionAbsolute. Do not strip fields or filter valid extra entries in assertions.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Implementation decisions

The baseline uses the complete original expected-failure declarations. Vanilla reproduces all ten selected failures. Vue reproduces seven expected failures and preserves its three viewport passes. Foldkit reproduces five expected failures and preserves five passes. Exact public receipts and the pinned reducer probe are in `research/catalogs/component-observers-and-changes-evidence.json`. The production and test paths are separate in `research/traces/component-observers-and-changes.md`.

| Contract | Source decision and implementation |
| --- | --- |
| Initial nodes/edges | `useNodes` and `useEdges` select the current store value. The pinned provider initial state chooses supplied defaults. Vanilla's returned mounted controller and Vue's child composable do not expose a pre-population hook render. UP-128-002 and UP-128-004 become not-applicable for these two hosts, with whole-case skips and no fabricated empty values. Foldkit preserves its genuine pending-store emissions and unchanged passing tests. The skipped cases' later assertions are not counted as passing. |
| Empty readiness | The pinned `packages/system/src/utils/store.ts:140` starts with `nodes.length > 0`. Core now requires a nonempty graph. This repairs Vanilla/Vue UP-128-005 and preserves Foldkit's passing assertion while keeping readiness false for the empty graph. Hidden-node and mounted-node options are unchanged. |
| Vue measurements | `useFlow` already projects current measured sizes for getters. `useNodes` now uses the same measurement projection and tracks measurement revisions. It does not persist measurements into graph authority. Vanilla's separate UP-128-003 width issue remains outside this task. |
| Viewport mount | `useOnViewportChange` registers handlers without invoking them. Vanilla previously sent change from its initial equal-transform render. The initial viewport paint now renders without lifecycle publication; later update notifications, including equal-transform writes, retain their existing behavior, repairing UP-128-010, UP-128-011, and UP-128-040. |
| Foldkit wheel | Browser ViewportWheel messages changed the graph but bypassed the pan-only viewport port adapter. The application now publishes start/change/end for changed discrete wheel operations, using the existing command and port owner. No-op/controlled wheel messages remain silent. UP-128-010 and UP-128-011 exercise this boundary. D3's idle-burst coalescing is not claimed. |
| Selection | Core node, edge, and selection-set reducers preserve absent false flags for unchanged entities. The derived callback batches contain only actual selection changes. UP-128-045 retains its literal one-node select and unselect assertions in every host. |
| Position | Core semantic proposal deltas include `dragging: false` and physical `positionAbsolute` at commit. Hosts pass current measured geometry so nesting and nonzero origins use physical dimensions. Generic document-diff round trips and the reducer's positionAbsolute metadata policy remain unchanged. Flow's documented commit-only position emission stays intact. |
| Replacement | The exact pinned applyChanges/applyChange probe yields retained measured 100x40 and accepted measured 200x100. The source shallow-copies replacements and assigns a new measured object for dimensions. Flow documents immutable reducers and detached frozen public reads in `docs/public-api.md:112` and `docs/public-api.md:201`. The old Cypress assertion expects the retained item to acquire future dimensions, which the pinned reducer alone does not establish. Record this conflict and retain UP-128-044 as fail in every host. Foldkit also retains its earlier separate initial-measurement batching failure. No mutable payload, delayed replacement callback, fixture history rewrite, or assertion weakening is introduced. |

## Changed Flow tests and conflicts

- The default empty-graph expectation in `packages/core/src/domain/flow-measurement.schema.test.ts` changes from true to false with a pinned `packages/system/src/utils/store.ts:140` citation comment. It sets no non-default readiness option, and no current documentation promises empty readiness true.
- The semantic-position expectation in `packages/core/src/domain/flow-element-changes.test.ts` gains false dragging and absolute position, with citation comments to pinned `packages/react/src/store/index.ts:211-230` for dragging and `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:86` for positionAbsolute. The current store producer omits the optional absolute field; this task implements the user-requested literal Cypress contract rather than claiming live React producer equivalence. It sets no non-default option. Generic document-diff assertions remain unchanged.
- The existing controlled split-binding browser assertion in `apps/vue/e2e/events-and-changes.e2e.ts:86` also expected the incomplete terminal position payload. Its fixture at `apps/vue/src/events-and-changes-test.ts:378` sets controlled split ownership but no non-default drag, origin or viewport option that removes metadata. It now asserts the same exact terminal dragging and absolute fields, with pinned producer/Cypress citation comments. The first affected run is retained as `/tmp/plan140-affected-vue-before-expectation.json`; phases 126 and 127 passed on that run. The test continues through its original rendering, selection and connection assertions.
- Four held-publication variants in `packages/foldkit/src/node-publication.test.ts:600` used a shared expected positionDelta object without terminal metadata. Their viewport replacement, animation, equivalent-value and unchanged-request options do not change world-space node coordinates or disable position metadata. The expected object now includes literal false dragging and the fixture absolute coordinates, with pinned producer/Cypress citation comments. Queue ordering, mutation rejection, accepted-state snapshots and port assertions remain intact. The failed built-package unit run is retained as `/tmp/plan140-verify-before-publication-expectations.log`; the early standalone run had imported the pre-build package artifact for this path. The complete unit suite is rerun against freshly built packages.
- New core cases verify changed-only selection and unselection, parent-relative positions, and measured origins in multi-node moves. Four checks fail on the untouched product baseline before repair. The final extra measured-origin check passes with actual geometry.
- `apps/shared-e2e/upstream-component/helpers.ts` skips only ledger not-applicable cases, carrying the precise reason. The upstream hooks and events contract files and all their assertions are unchanged.
- UP-128-044 is the documented/ambiguous conflict retained under the conflict rule. It is not reclassified as conforming or intentional-difference.

- The broad Vanilla gate exposed 27 node-threshold oracle conflicts. The first no-op filter was too broad because it suppressed later equal-transform callbacks used by actual reentrant operations. It is narrowed to an explicit initial/update paint mode, used only at the mount paint. `apps/vanilla/e2e/node-threshold.e2e.ts` removes only obsolete mount-move prefixes, with pinned `packages/react/src/hooks/useOnViewportChange.ts:37` comments, and preserves all later callback/capture/ownership assertions. Its non-default pan/scroll/capture/reentry options do not request mount delivery. Two literal selection-document builders preserve untouched C's absent flag, with `packages/react/src/utils/changes.ts:245-257` comments; B and the edge start selected and still explicitly become false. The original broad failure is retained at `/tmp/plan140-verify-before-node-contract-expectations.log`. The complete node-threshold suite, complete Vanilla upstream/affected scope and three component repetitions are rerun after narrowing.

- The complete Vue node-threshold probe confirms five strict snapshot conflicts at two expected-document builders. A/C start with no selected flag; B and the edge start selected. Ordinary semantic deselection and pointer/keyboard moved-selection termination now preserve A/C and explicitly clear B/edge, as pinned `packages/react/src/utils/changes.ts:245-257` specifies. Only these literal builders change in `apps/vue/e2e/node-threshold.e2e.ts`, with citation comments; all events, captures and ownership assertions remain. The failed first probe is retained at `/tmp/plan140-node-threshold-vue-before-flags.json` and the entire suite is rerun.

## Required verification

All browser invocations use `scripts/with-flow-browser-lock.sh`, wait for its owner token, and select `--workers=1`. Complete component runners use `--repeat-each=3`. Complete phase 126 Playwright and phase 127 Cypress runners run in all three hosts, alongside events-and-changes, public-state and interaction-lifecycle; Foldkit also runs viewport-observer. The final required command is `scripts/with-flow-browser-lock.sh bun run verify`. The saved configuration only appends this task to activeWork, retaining every check and browser filename. Full-profile, CI, other engines and collector delivery are separate boundaries.

Only proven complete unchanged source cases become pass. Not-applicable cases remain skips. Existing non-interactive labels, enabled-elevation Vanilla shared-SVG stacking, Foldkit hidden toolbars, marker IDs, viewport culling overscan and attribution policies stay intact. Re-run the two named known flakes first if they fail. Remap shifted citations and run `bun run research:check-traces`. Commit on `plan/140-component-observers` with the requested co-author trailer; do not push or merge.

- The complete Vue gate found two further selection expectations. In `apps/vue/e2e/activation-callbacks.e2e.ts:256`, the 20,20-to-100,90 rectangle encloses neither fixture node under the default full-containment selection mode. Its adoption assertion had depended on stamping false onto untouched nodes. The rectangle now encloses the first node at 40,50, preserving every proposal/adoption/terminal ordering assertion and both ownership modes. Its non-default `selectionOnDrag: true`, `panOnDrag: false` and `selectNodesOnDrag: false` options do not request false flags for untouched nodes. In `apps/vue/e2e/canvas-options.e2e.ts:200`, disabling auto-pan leaves the offscreen node untouched, so the exact expected flag changes from false to undefined; the enabled variant still requires true. Both changes cite pinned `packages/react/src/utils/changes.ts:245-257`. The prior verifier log is `/tmp/plan140-verify-before-vue-selection-expectations.log`; the complete two-file rerun passes 44/44 with zero unexpected or flaky outcomes. No upstream assertion changes.

## Results

Implemented on `plan/140-component-observers`, based on `0507d7f`. Every repaired host entry passes its complete unchanged source case in all three component repetitions. Exact case/worker outcomes, source hashes, ledger transitions and report hashes are retained in `research/catalogs/component-observers-and-changes-results.json`. Baseline public receipts and the exact pinned reducer probe are in `research/catalogs/component-observers-and-changes-evidence.json`. Production and test call paths are separate in `research/traces/component-observers-and-changes.md`.

| Case | Vanilla | Vue | Foldkit | Evidence and change |
| --- | --- | --- | --- | --- |
| UP-128-002 | Not applicable, 3 skips | Not applicable, 3 skips | Preserved pass, 3/3 | Current store reads do not guarantee a pre-population empty render. Vanilla/Vue native mounted acquisition has no such moment; Foldkit exposes genuine pending state. |
| UP-128-003 | Retained fail, 3/3 expected | Fixed pass, 3/3 | Preserved pass, 3/3 | Vue useNodes now projects measured dimensions. Vanilla retains its separate 150 versus 100 width failure. Foldkit remains passing. |
| UP-128-004 | Not applicable, 3 skips | Not applicable, 3 skips | Preserved pass, 3/3 | Same native acquisition boundary as 002. The entire Vanilla/Vue source case is skipped; its later measured assertion is not credited. Foldkit remains passing. |
| UP-128-005 | Fixed pass, 3/3 | Fixed pass, 3/3 | Preserved pass, 3/3 | Core requires a nonempty graph for readiness; empty readiness stays false. Foldkit retains its passing history assertion with the corrected shared selector. |
| UP-128-010 | Fixed pass, 3/3 | Preserved pass, 3/3 | Fixed pass, 3/3 | Vanilla suppresses the initial-paint notification; Foldkit publishes changed wheel viewport phases. Vue preserves its pass. |
| UP-128-011 | Fixed pass, 3/3 | Preserved pass, 3/3 | Fixed pass, 3/3 | Same viewport boundary as 010, with the unchanged zoom-out assertion. |
| UP-128-040 | Fixed pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Vanilla onMove is silent on mount, then reports actual pan movement. Vue and Foldkit preserve passing lifecycle assertions. |
| UP-128-044 | Retained fail, 3/3 expected | Retained fail, 3/3 expected | Retained fail, 3/3 expected | Retained replacement measurements conflict with documented immutable snapshots and the pinned reducer probe. Foldkit also retains its initial measurement batching failure. No assertion or payload history is rewritten. |
| UP-128-045 | Fixed pass, 3/3 | Fixed pass, 3/3 | Fixed pass, 3/3 | Shared selection reducers omit unchanged unselected nodes. Both literal select and unselect arrays pass in every host. |
| UP-128-046 | Fixed pass, 3/3 | Fixed pass, 3/3 | Fixed pass, 3/3 | Shared semantic position proposals include terminal false dragging and measured physical absolute coordinates. The complete literal arrays pass in every host. |

The pre-promotion trials retain the original expected-failure flags. Their successful unchanged assertions therefore report 6 unexpected passes in Vanilla, 4 in Vue and 4 in Foldkit. These are the proof used for promotion, not final acceptance failures. Final complete repetitions have no unexpected or flaky outcomes. Not-applicable cases are skipped, never promoted to pass.

| Host | Component outcomes, three repeats | Ordinary passes | Retained expected failures | Not-applicable skips | Unexpected / flaky |
| --- | --: | --: | --: | --: | --- |
| vanilla | 228 | 186 | 36 | 6 | 0 / 0 |
| vue | 228 | 198 | 24 | 6 | 0 / 0 |
| foldkit | 228 | 198 | 30 | 0 | 0 / 0 |

| Host | Affected outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --: | --: | --: | --: | --- |
| vanilla | 172 | 164 | 8 | 0 | 0 / 0 |
| vue | 154 | 152 | 2 | 0 | 0 / 0 |
| foldkit | 178 | 175 | 3 | 0 | 0 / 0 |

The affected scope contains complete Phase 126 and Phase 127 runners in every host, events-and-changes, public-state and interaction-lifecycle. Foldkit also runs viewport-observer. The first Vue affected run retained in `/tmp/plan140-affected-vue-before-expectation.json` passed both upstream phases and failed only the old incomplete Flow test expectation described above. The final complete rerun passes all of that test's remaining rendering, selection and connection assertions.

Ledger cells below are pass / fail / intentional difference / not applicable. The 31 common component utility cases run in the unit gate and contribute to each host's ledger; they are not part of the 76-case browser runners. Only 14 host entries move to pass. Four initial-render host entries move to not applicable. No Phase 126 or 127 entry changes or regresses.

| Phase | Host    | Before          | After          |
| ----- | ------- | --------------- | -------------- |
| 126   | vanilla | 44 / 3 / 3 / 0  | 44 / 3 / 3 / 0 |
| 126   | vue     | 48 / 0 / 2 / 0  | 48 / 0 / 2 / 0 |
| 126   | foldkit | 47 / 0 / 3 / 0  | 47 / 0 / 3 / 0 |
| 127   | vanilla | 65 / 0 / 2 / 0  | 65 / 0 / 2 / 0 |
| 127   | vue     | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0 |
| 127   | foldkit | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0 |
| 128   | vanilla | 87 / 16 / 4 / 0 | 93 / 8 / 4 / 2 |
| 128   | vue     | 93 / 12 / 2 / 0 | 97 / 6 / 2 / 2 |
| 128   | foldkit | 93 / 12 / 2 / 0 | 97 / 8 / 2 / 0 |

Every browser invocation waits for `scripts/with-flow-browser-lock.sh` and uses one worker. Reproduce the required scope with:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/vue/playwright.config.ts upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/foldkit/playwright.config.ts upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test upstream-playwright.e2e.ts upstream-cypress.e2e.ts events-and-changes.e2e.ts public-state.e2e.ts interaction-lifecycle.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/vue/playwright.config.ts upstream-playwright.e2e.ts upstream-cypress.e2e.ts events-and-changes.e2e.ts public-state.e2e.ts interaction-lifecycle.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/foldkit/playwright.config.ts upstream-playwright.e2e.ts upstream-cypress.e2e.ts events-and-changes.e2e.ts public-state.e2e.ts viewport-observer.e2e.ts interaction-lifecycle.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

The saved scope retains all original checks and 51 Vanilla, 49 Vue and 62 Foldkit browser filenames. Only the activeWork description is appended. All imported artifacts and shared upstream hooks/events assertions remain unchanged. Initial shifted citations are remapped in 35 traces, with 322 updates. Narrowing the initial-paint repair and updating node-threshold expectations remaps another 103 citation locations in 23 traces. The later Vue snapshot correction remaps two further locations in two traces, and the final selection-test correction remaps one location in one trace.

The complete targeted node-threshold suites pass after the scoped expectation updates: Vanilla 166/166, Vue 494/494 and Foldkit 40/40, with no skips, unexpected or flaky outcomes. Vanilla's three-repeat component runner and complete upstream/affected runner are then confirmed again against initial-paint-only suppression. Vue's first targeted run retains five stale-flag failures in the results catalog, followed by the complete 494-case passing rerun. No runtime change is needed for those Vue snapshot expectations.

The final required `scripts/with-flow-browser-lock.sh bun run verify` passes all 18 gates with the focused profile, every saved check and every saved browser file. Quality, architecture, package/app builds, workspace typechecking, packed consumers, documentation, catalogs, the upstream ledger, 2,559 unit tests across 103 files, and 3,290 citations across 86 traces pass. This is local focused acceptance, not full-profile or CI acceptance.

| Host | Saved browser outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --: | --: | --: | --: | --- |
| vanilla | 840 | 816 | 20 | 4 | 0 / 0 |
| vue | 971 | 959 | 10 | 2 | 0 / 0 |
| foldkit | 617 | 604 | 13 | 0 | 0 / 0 |

The required verifier completes in 1,269,904ms. Its report is `/tmp/plan140-verify.log`; the results catalog retains exact gate names, scope, counts and the log hash. Earlier attempts and their failed receipts are retained separately. Corrections covered Markdown formatting, four built-package held-publication payload expectations, 27 Vanilla node-threshold conflicts, and two Vue selection conflicts.

The Vanilla failures exposed an overbroad no-op filter. The production repair is narrowed to initial paint, preserving later equal-transform callbacks. Its test oracles remove only obsolete mount prefixes and untouched selection flags, with source comments. The complete Vanilla upstream, affected, node-threshold and three-repeat component scopes pass after narrowing. The Vue fixes make the adoption-order gesture select a real node and assert an absent flag on an untouched offscreen node. Their complete two-file rerun passes 44/44. All 2,559 built-package units pass before the final verifier. The earlier Vue payload and snapshot conflicts and their passing complete reruns are also retained.

An additional complete attempt passed Vanilla and Vue but found one Foldkit layout-recipes child/parent geometry failure. Its unchanged matching tests then passed six outcomes over three repetitions. The final complete verifier also passes that unchanged test. The earlier failure remains recorded with its cause unconfirmed. No rule, check or upstream assertion is suppressed.

Only result prose and receipt metadata change after this verifier. Every recorded production and test source hash matches the tested files. The two existing Vanilla native pointer/touch capture skips and the four initial-render not-applicable host entries remain distinct from passes. The final verifier and required repeated component runs contain no flaky outcomes; the earlier unconfirmed layout failure remains recorded.

## Conformity and deviations

Conforming at the local Chromium source-test boundary: all 14 repaired host entries pass complete unchanged assertions 3/3. Vue measured observations, empty readiness, Vanilla default-mount silence, Foldkit discrete wheel notifications, changed-only selection arrays, and completed drag payloads have executable proof. Every previously passing Phase 126 and 127 contract remains passing in all hosts. Core units additionally prove parent-relative coordinates and nonzero origins using actual measured geometry.

Not applicable: Vanilla and Vue UP-128-002 and UP-128-004 require a pre-population React hook render absent from their mounted native acquisition. The hooks read the current provider value; they do not guarantee an empty value. No synthetic empty snapshots are added. These entire cases are skips, and later assertions after the skipped boundary are not credited.

Unresolved: UP-128-044 remains fail in all hosts under the documented-contract conflict rule. The retained replacement item does not acquire later dimensions, and the pinned reducer probe also retains old dimensions. Foldkit's earlier initial batching failure remains. Vanilla UP-128-003 retains its separate measured-width gap. Other existing component failures remain outside this scope. The literal terminal positionAbsolute field follows the requested Cypress API contract; the current React store producer does not directly emit it, so live producer equivalence is not claimed.

Intentionally different: existing non-interactive edge labels, enabled-elevation Vanilla shared-SVG stacking, hidden Foldkit toolbars, marker IDs, viewport culling overscan and no attribution remain unchanged. Flow still publishes node positions at commit, as documented. Foldkit wheel port events follow its existing discrete interaction operation boundary; D3 idle-burst coalescing is not established by these single-wheel cases.

Unverified: live pinned React execution, full-profile acceptance, CI, other browser engines, physical devices, detailed wheel burst timing, mount-time clamping with non-default constraints and collector-side OTLP delivery. This is local focused-profile evidence. No push or merge is performed.
