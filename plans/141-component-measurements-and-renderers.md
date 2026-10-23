# Plan 141: Component measurements and renderers

Consolidates the Plan 139 measurement and renderer follow-ups at base `0507d7f`. Preserve imported source, literal upstream assertions, documented differences, and existing verification scope.

## Declared node dimensions and initial measurement batches

### Goal

Honor the source explicit CSS dimensions and initial measurement publication. Keep dimensions transient and leave persisted Flow node size ownership intact.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-003 | handles nodes | vanilla | Both nodes declare style width 100 and height 50, but their public measured widths and DOM boxes are 150 rather than 100. |
| UP-128-043 | receive initial dimension change | vanilla | The single initial dimensions batch reports 150x44 and 150x50, rather than the literal 100x40 and 80x50. |
| UP-128-043 | receive initial dimension change | vue | The single initial dimensions batch reports Node 1 as 100x44 rather than 100x40; Node 2 reports the required 80x50. |
| UP-128-043 | receive initial dimension change | foldkit | Initial measurements arrive as two separate one-node callback batches rather than the required single batch. The literal dimension equality is not reached. |

### Scope and acceptance

Trace declared style through node wrapper CSS, observer measurement, and the public measurement or element-change output. Compare actual computed boxes with the declarations. Preserve batching differences as observed until the product contract is resolved; do not combine separate port calls in the test recorder.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Default edge renderer registration

### Goal

Apply a registered default edge renderer when the source edge omits type, while retaining independent label layers for separate instances.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | vanilla | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | foldkit | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |

### Scope and acceptance

The port supplies edgeTypes.default through each host public registry. The source edge has no explicit type. Trace registry selection into the custom renderer, its label publication, and both instance-scoped layers. Do not add type:default to the fixture to bypass the missing lookup.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Implementation and verification

1. Reproduce UP-128-003, UP-128-042, UP-128-043 and UP-128-044 in each host. Trace the public mount, CSS dimensions, measurement delivery, state and rendered labels. Classify each cause before implementation.
2. Honor declared CSS dimensions without changing the documented 150 by 44 unmeasured geometry fallback. Preserve non-interactive standard labels and instance-owned custom label layers.
3. Compare Foldkit's initial observer delivery with the pinned one-batch dimensions assertion. Keep batching in the observer and adapter, never in the fixture recorder. Retain per-request acknowledgements, stale-generation validation, and resize ownership.
4. Treat UP-128-044 replacement payload history as a separate boundary from dimensions. Fix dimension causes here; retain any remaining payload mismatch with exact evidence.
5. Run all three upstream runners in each host, repeating component runners three times. Run measured-geometry, renderer-contract, renderer-props, edge-recipes, styling, and nested-resize. Preserve and extend saved verification scope, then run the locked focused verifier. Every browser command uses `scripts/with-flow-browser-lock.sh` and one worker.
6. Record results, per-host and per-phase ledger deltas, changed assertions, conflicts and unresolved boundaries. Commit on `plan/141-component-measurements` with the requested co-author trailer. Do not push or merge.

## Results

Implemented on `plan/141-component-measurements`, based on `0507d7f`. The consolidated sections above preserve both original follow-up briefs. Their source files are deleted, and Plan 139 links to the replacement sections. The source trace is `research/traces/component-measurements-and-renderers.md`; raw report paths, baseline receipts, classifications, ledger counts and source hashes are retained in `research/catalogs/component-measurements-and-renderers-results.json`.

### Causes and changes

No case in this scope required a fixture CSS override, synthetic callback, added edge type or readiness workaround. Each host already imports its stylesheet and forwards the pinned node style. The failures are product gaps, classification (a), at the declared-dimension or renderer-selection boundary. The documented geometry fallback at `docs/architecture.md:141` is a different boundary from CSS minimum sizing. The existing core regression at `packages/core/src/domain/flow-graph.test.ts:472` retains the 150 by 44 fallback for nodes without measurements or intrinsic size.

| Case | Vanilla | Vue | Foldkit |
| --- | --- | --- | --- |
| UP-128-003 | (a) CSS minimum width clamped declared 100 to 150. Declared widths now release that minimum; the unchanged complete case passes. | Existing DOM is already 100 by 50. The separate useNodes measured-projection failure remains in the observer follow-up. | Existing complete case passes; no hook change. |
| UP-128-042 | (a) Omitted type skipped edgeRenderers.default. Select the default registry entry and retain the instance-owned custom label layer. | Existing complete case passes; no renderer change. | (a) Omitted type skipped edgeTypes.default. Select the default entry and retain per-instance label collection. |
| UP-128-043 | (a) Minimum width 150 and height 44 clamped the declared boxes. Explicit dimensions release those minimums. | (a) Minimum height 44 clamped declared height 40. Explicit height releases the minimum. | (a) Minimum height clamped to 44 and observer callbacks published per node. Explicit height releases the minimum; native observer deliveries and initial discovery publish one batch. |
| UP-128-044, dimensions | (a) Initial dimension clamps repaired. Update DOM and dimensions callback reach 200 by 100. | (a) Initial height clamp repaired. Update DOM and dimensions callback reach 200 by 100. | (a) Initial clamp and batching repaired. An old measurement no longer overrides declared CSS dimensions, so the update DOM and callback reach 200 by 100. |
| UP-128-044, complete case | Still fail: retained replacement item reports measured 100 by 40, rather than the upstream 200 by 100. | Same retained replacement payload mismatch. | Same retained replacement payload mismatch after repairing callback ordering and dimensions. |

The baseline reports reproduce all original mismatches before each owner changes. The measured-size and default-renderer causes are traced from public mount through CSS, state, observer publication and rendered output. The relevant upstream stylesheet sets padding 10, width 150 and font size 12 without Flow's minimum height 44. The declared style must determine the asserted boxes. The comparison does not require changing the hosts' default theme or the 150 by 44 unmeasured geometry fallback.

The pinned callback-count assertion makes a shared initial dimensions batch observable. Foldkit's observer now passes readonly request arrays through `onMeasure`, and all application, browser fixture and packed-consumer callers forward them using `HostAction.MeasureNodes`. Explicit refresh uses a one-request batch. The adapter reuses the existing generation, resize-buffering and acknowledgement route for each request, then emits one dimensions event for the whole delivery. The fixture recorder still records actual events without merging them.

### Tests and conflicts

The complete upstream assertions are unchanged at `apps/shared-e2e/upstream-component/hooks.ts:36`, `apps/shared-e2e/upstream-component/components.ts:201`, `apps/shared-e2e/upstream-component/events.ts:144`, and `apps/shared-e2e/upstream-component/events.ts:157`. Imported evidence remains unchanged. Six ledger host entries change from fail to pass only after the unchanged complete test passes. UP-128-044 remains fail in every host.

The added dimension-specific regression at `apps/shared-e2e/component-measurements-contract.ts:9` verifies one initial batch with the literal 100 by 40 and 80 by 50 sizes, a later 200 by 100 dimensions batch, and the updated DOM size. It runs from all three measured-geometry suites at `apps/vanilla/e2e/measured-geometry.e2e.ts:300`, `apps/vue/e2e/measured-geometry.e2e.ts:133`, and `apps/foldkit/e2e/measured-geometry.e2e.ts:410`. It supplements the still-failing complete replacement case and does not alter its assertions or ledger classification. Its values come from the pinned `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:25` and `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:36`.

The added reducer test at `packages/foldkit/src/live-drag.test.ts:474` proves a single two-node dimensions event, per-request acknowledgement commands, suppression of unchanged samples, and rejection of stale generations. The existing resize-measurement tests retain resize ownership. The focused two-file unit run passes 32 tests. Existing observer fixture changes migrate callback inputs and retain their instrumentation; they do not change assertions.

The full verifier exposed one local expectation based on the old clamp. The grower declares 80 by 40 at `apps/vue/src/final-wiring-test.ts:177`; nodeExtent and translateExtent at `apps/vue/src/final-wiring-test.ts:762` do not set a minimum height. The old assertion at `apps/vue/e2e/final-wiring.e2e.ts:581` expected parent height 254 from an 80 by 44 child. Pinned NodeWrapper applies declared dimensions at `packages/react/src/components/NodeWrapper/index.tsx:208`, and parent expansion unions the child rectangle at `packages/system/src/utils/store.ts:330`. This is an undocumented CSS clamp rather than the documented unmeasured fallback. Under the conflict rule, the local expected height changes from 254 to 250, with an upstream citation comment.

The first failed verifier is preserved at `/tmp/plan141/verify-before-conflict-fix.log`; no upstream assertion changes. The corrected complete local case passes 3/3 with an added literal 40px child DOM-height assertion at `apps/vue/e2e/final-wiring.e2e.ts:585`; the retained public parent-size assertion is at `apps/vue/e2e/final-wiring.e2e.ts:604`. Its report is `/tmp/plan141/vue-expand-parent-repeat.json`, with three ordinary passes and no unexpected or flaky outcomes.

### Ledger

Counts are pass / fail / intentional difference. Not-applicable and not-ported remain zero in all three phases. Phase 128 includes the 31 common utility passes per host.

| Phase | Host    | Before      | After       |
| ----- | ------- | ----------- | ----------- |
| 126   | Vanilla | 44 / 3 / 3  | 44 / 3 / 3  |
| 126   | Vue     | 48 / 0 / 2  | 48 / 0 / 2  |
| 126   | Foldkit | 47 / 0 / 3  | 47 / 0 / 3  |
| 127   | Vanilla | 65 / 0 / 2  | 65 / 0 / 2  |
| 127   | Vue     | 67 / 0 / 0  | 67 / 0 / 0  |
| 127   | Foldkit | 67 / 0 / 0  | 67 / 0 / 0  |
| 128   | Vanilla | 87 / 16 / 4 | 90 / 13 / 4 |
| 128   | Vue     | 93 / 12 / 2 | 94 / 11 / 2 |
| 128   | Foldkit | 93 / 12 / 2 | 95 / 10 / 2 |

### Verification

All 76 component cases run three times per host through the complete runner. Each repaired entry passes 3/3. Every retained failure keeps the same first assertion boundary in all repetitions. No case is skipped or retried, and no unexpected or flaky outcome remains.

| Host | Component outcomes | Ordinary passes | Expected failures | Skips | Unexpected or flaky |
| --- | --: | --: | --: | --: | --: |
| Vanilla | 228 | 177 | 51 | 0 | 0 |
| Vue | 228 | 189 | 39 | 0 | 0 |
| Foldkit | 228 | 192 | 36 | 0 | 0 |

The complete reports are `/tmp/plan141/repeat-vanilla.json`, `/tmp/plan141/repeat-vue.json`, and `/tmp/plan141/repeat-foldkit.json`. The results catalog retains every outcome, repetition ordinal, worker index, exact command and report hash, plus target-case callback and DOM receipts. Expected failures include existing fail and intentional-difference ledger entries and do not establish conformity.

The affected suites pass with the following outcomes. Each host runs both complete Phase 126 and Phase 127 runners, measured-geometry, renderer-contract, renderer-props, edge-recipes and nested-resize-containment. Vanilla also runs styling-recipes; Foldkit also runs model-styling. Vue has no separate styling-named suite; its declared sizing is exercised through measured-geometry and its rendering contracts. Its final affected scope also includes final-wiring after the local expansion expectation repair. The earlier 157-case Vue receipt is retained as `/tmp/plan141/affected-vue-before-final-wiring.json`; the expanded 177-case scope passes. No affected case is skipped, retried, unexpected or flaky.

| Host | Affected outcomes | Ordinary passes | Expected failures | Skips | Unexpected or flaky |
| --- | --: | --: | --: | --: | --: |
| Vanilla | 151 | 143 | 8 | 0 | 0 |
| Vue | 177 | 175 | 2 | 0 | 0 |
| Foldkit | 171 | 168 | 3 | 0 | 0 |

Phase 126 remains 44 ordinary passes and 6 retained expected failures in Vanilla, 48 and 2 in Vue, and 47 and 3 in Foldkit. Phase 127 remains 65 ordinary passes and 2 retained expected failures in Vanilla, and 67 ordinary passes in each of Vue and Foldkit. No previously passing upstream case regresses. The new dimension regression passes in every host. Reports are `/tmp/plan141/affected-vanilla.json`, `/tmp/plan141/affected-vue.json`, and `/tmp/plan141/affected-foldkit.json`.

The final `scripts/with-flow-browser-lock.sh bun run verify` passes all 18 gates with exit code 0 and the focused profile, `fullSuite: false`, in 1,331,991ms. All saved checks and browser files run with one worker. The common unit gate passes 2,557 tests in 103 files. Quality, architecture, package and app builds, typechecking, packed consumers, documentation, catalogs, API inventory and the upstream ledger pass.

| Host | Saved browser files | Cases | Ordinary passes | Expected failures | Existing skips | Unexpected or flaky |
| --- | --: | --: | --: | --: | --: | --: |
| Vanilla | 52 | 851 | 824 | 25 | 2 | 0 |
| Vue | 50 | 982 | 967 | 15 | 0 | 0 |
| Foldkit | 62 | 618 | 603 | 15 | 0 | 0 |

The final log is `/tmp/plan141/verify.log`; its hash, gate names, exact host counts and elapsed times are in the results catalog. The two existing Vanilla skips require physical pointer capture and touch pointer capture. No upstream case skips, and neither named existing flake needs a rerun. The first failed verifier remains recorded separately, along with the local expectation repair and its 3/3 proof. The exact raw dimension batches for UP-128-044 also match the literal initial and updated expectations in all nine retained component receipts.

The final source and test hashes match those captured before the successful verifier. Only report prose, source citations and results metadata are updated afterward, followed by read-only quality and trace validation. The saved default remains focused. Existing checks and browser files are preserved; only Vanilla and Vue measured-geometry are added, because Foldkit's file was already selected. The activeWork string appends this task. No full-profile acceptance is claimed.

## Conformity and deviations

Conforming: six repaired host entries pass their unchanged complete component assertions. The dimension-specific regression separately verifies the dimension portion of UP-128-044 without promoting that complete case. Foldkit's batch shape follows the pinned source and its literal callback-count assertion. Final repetitions and affected-suite results define the browser acceptance boundary.

Intentionally different: the unmeasured 150 by 44 geometry fallback, non-interactive standard edge labels, Vanilla shared-SVG stacking, Foldkit mounted-hidden toolbars, marker IDs, viewport-culling overscan and absent attribution remain unchanged. No new intentional-difference entry is introduced. Theme appearance beyond the declared boxes is outside the parity claim.

Retained failures: UP-128-044 replacement payloads in all three hosts and Vue UP-128-003 measured projections remain in the node-change and observer follow-ups. They are not promoted by the separate dimension proof.

Unverified: live React execution, arbitrary cross-frame mounting batches, other browsers or physical devices, full-profile acceptance, CI, deployment and collector-side OTLP delivery. No push or merge is performed.
