# Plan 144: fitView padding semantics

Starting point: `0c82a414313ecfe250a382fb3ae28c4fb8a3b2e5`. User decision dated 2026-10-22: match pinned xyflow padding in every host. Imported artifacts remain immutable.

## Scope and acceptance

Read pinned `packages/system/src/utils/general.ts:196-259,304-343` at revision `0a1f9575b25679f2880175de8d3eae21aedde921`. Implement padding once in core, shared by fitView, fitViewOptions, fitBounds, and getViewportForBounds. Numeric values resolve to `floor((size - size / (1 + padding)) * 0.5)`; strings use floored pixels or pane percentages. Side objects support x/y fallbacks and explicit-side precedence. Preserve clamping and upstream asymmetric corrections, including exhausted padding.

Compare numeric inputs 0, 0.1, 0.5, 1, and 2 with the pinned formula and literal viewport outcomes, including measured, fallback, and hidden node bounds. Cover strings, mixed sides, clamping, rounding, and all public hosts. Migrate every in-repo numeric pixel-side caller to px strings and retain its previous viewport assertions. Audit examples, recipes, Schema Studio, tests, docs, and ledger references. Never change imported evidence or weaken upstream assertions; change UP-128-056 only after unchanged tests pass.

## Migration

Breaking change: old uniform per-side pane fraction `f` maps to new numeric `2*f/(1-2*f)` for `0 <= f < 0.5`, before upstream pixel flooring. For exact old whole-pixel gutters use `${paneSize*f}px` per axis; upstream floors fractional pixel requests, so exact subpixel preservation is not general. Old `{ left: 80 }` pixels becomes `{ left: '80px' }`; numeric sides now use the upstream formula. Existing numeric callers adopt the new semantics; callers needing old gutters use explicit unit strings.

## Execution

Add only to verification.config.json. Run every upstream runner and affected viewport, fit, public-state, minimap, recipe, and Schema Studio suite in Vanilla/Vue/Foldkit under `scripts/with-flow-browser-lock.sh`, one worker. Rerun known flakes first. Remap shifted trace citations; run research:check-traces and docs:check. Finish with the locked focused verifier, report exact scope and limits, and commit on `plan/144-fitview-padding` with the requested co-author trailer. No push or merge.

## Changed tests and callers

Padding expectation changes cite `packages/system/src/utils/general.ts:196-259,304-343`; integration tests cite their pinned owners below. The revision is `0a1f9575b25679f2880175de8d3eae21aedde921`. Locations below are the final declarations or assertions. Upstream component assertions and their literal padding input remain unchanged.

| Test | Old → new |
| --- | --- |
| `packages/core/src/domain/flow-fit-view.test.ts:108` | Default fit `(180,60,1.6)` → `(136,27,1.82)`. |
| `packages/core/src/domain/flow-fit-view.test.ts:167` | Measured/fallback fit `(100,100,1.6)` → `(45,72.5,1.82)`. |
| `packages/core/src/domain/flow-fit-view.test.ts:224` | Reject 0.5 → accept finite numeric values including 0.5, 1, 2; reject invalid units and non-finite values. |
| `packages/core/src/domain/flow-fit-view.test.ts:48` | New five-case mixed measured/fallback/hidden graph comparison against the pinned formula, including actual-edge flooring. |
| `packages/core/src/domain/flow-viewport-operation.schema.test.ts:72` | Default bounds fit `(-240,-20,3.2)` → `(-328,-64,3.64)`; numeric side pixels → px strings with unchanged `(-260,-40,3.4)` and `(-280,-60,3.6)`. |
| `packages/core/src/domain/flow-viewport-operation.schema.test.ts:144` | Decode four numeric pixel sides → decode their px-string equivalents. |
| `packages/core/src/domain/flow-viewport-operation.schema.test.ts:25` and `:58` | New literal pinned results for numeric 0/0.1/0.5/1/2, units, axis fallbacks, numeric sides, exhausted gutters, and rounding. Four `'20px'` sides retain the old 20-pixel viewport `(-360,-80,3.8)` used by the Vue harness. |
| `packages/core/src/domain/flow-viewport-contract.test.ts:31` and `:46` | Shared default fixture adopts the new numeric result; four pixel sides become strings with the old upstream reference result unchanged. Extend the fixture with all pinned forms. The captured reference artifact is unchanged. |
| `packages/foldkit/src/viewport-client.test.ts:8` | Four numeric pixel sides → px strings; keep `(-260,-40,3.4)`. |
| `apps/vanilla/e2e/viewport-operations.e2e.ts:421` | Shared default fixture changes to the pinned numeric result; preserve the pixel result and add exact outputs for all forms. |
| `apps/vue/e2e/viewport-operations.e2e.ts:71` | One default fit → all fixture forms through public fitBounds, resetting between cases; preserve terminal-status assertions. `apps/vue/e2e/viewport-harness.ts:150` changes four 20-pixel sides to `'20px'`, retaining the pixel geometry. |
| `apps/foldkit/e2e/public-state.e2e.ts:858` | One default fit → all fixture forms through Runtime requests; final read still equals the last accepted target. |
| `apps/shared-e2e/schema-studio-contract.ts:738` and `apps/shared-e2e/schema-studio-contract.ts:738` | Old `0.8*paneSize` usable space → `paneSize - 2*floor((paneSize-paneSize/1.1)*0.5)`, including pinned asymmetric corrections. Existing 0.1/0.8/500ms inputs remain unchanged. |
| `apps/vanilla/src/upstream-examples-padding.test.ts:15` | New preservation test for the shared Basic adapter at 960×640 and 803×607: `(-336,-80,4)` and `(-361.5,-58,3.615)`. |

The Basic caller at `apps/shared/upstream/examples.ts:23` now passes upstream units directly: top 100 → `'100px'`, left 0 → `'0%'`, precomputed right pixels → `'10%'`, and precomputed bottom pixels → numeric 0.1. Each has the same resolved gutters as before. Its three hosts no longer pass a DOM root solely for unit conversion. Other uniform numeric recipe/example and Schema Studio inputs adopt the requested semantic change, except the Feature Overview gutter migration documented below. The inventory also checks positional pixel-side arguments such as Foldkit's client test. Group, edge-label, and CSS padding are separate contracts and remain unchanged.

## Ledger

Only UP-128-056 moves from intentional difference to pass in all hosts, after the unchanged assertion produces an unexpected pass with its old test.fail flag. The complete probe reports are `/tmp/plan144/probe-{vanilla,vue,foldkit}.json`. No other case cites the old padding rule, and no upstream assertion, wait, threshold, fixture padding value, or guard changes.

Counts below are pass / fail / intentional difference / not applicable. Phase 128 includes 31 shared utility tests in addition to each host's 76 browser component cases.

| Phase | Host    | Before          | After           |
| ----- | ------- | --------------- | --------------- |
| 126   | Vanilla | 44 / 3 / 3 / 0  | 44 / 3 / 3 / 0  |
| 126   | Vue     | 48 / 0 / 2 / 0  | 48 / 0 / 2 / 0  |
| 126   | Foldkit | 47 / 0 / 3 / 0  | 47 / 0 / 3 / 0  |
| 127   | Vanilla | 65 / 0 / 2 / 0  | 65 / 0 / 2 / 0  |
| 127   | Vue     | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0  |
| 127   | Foldkit | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0  |
| 128   | Vanilla | 98 / 1 / 6 / 2  | 99 / 1 / 5 / 2  |
| 128   | Vue     | 100 / 2 / 3 / 2 | 101 / 2 / 2 / 2 |
| 128   | Foldkit | 102 / 2 / 3 / 0 | 103 / 2 / 2 / 0 |

## Integration causes and repairs

The first affected runs found six regressions. Both Vanilla failures reproduced 3/3, and all four Foldkit failures reproduced 3/3, before repairs. Vue passed its affected run without repair. Raw reports are `/tmp/plan144/affected-{vanilla,vue,foldkit}.json` and `/tmp/plan144/rerun-{vanilla,foldkit}.json`.

- The Vanilla Feature Overview's new denser fit placed its resize corner under the minimap after Zoom In. A real hit stack identifies `flow-minimap-viewport` above the resize button in `/tmp/plan144/diagnostics-vanilla.json`. Migrate its intended old 0.2 pane gutter to `'20%'` in `apps/vanilla/src/ui/feature-overview-recipes.ts:219`. The fixed 900×540 pane keeps viewport `(180,155.9154929577465,0.7605633802816901)`. `apps/vanilla/e2e/feature-overview-recipes.e2e.ts:54` adds that literal preservation assertion and retains the original resize/zoom assertions and gestures. Its pinned-source comment cites unit parsing and geometry.
- Foldkit Controls cached zoom 1 at mount. After fitting to 1.32022, Zoom In targeted 1.2. `packages/foldkit/src/ui.ts` now reads the current public client zoom for each action, matching pinned `packages/react/src/hooks/useViewportHelper.ts:24-39` and `packages/react/src/additional-components/Controls/Controls.tsx:43-53`. `apps/foldkit/e2e/feature-overview-recipes.e2e.ts:38` strengthens the old greater-than check to the actual live zoom multiplied by 1.2. The old/new rendered transforms are retained in `/tmp/plan144/diagnostics-foldkit.json`.
- Foldkit's layout tests assumed the native handle center was the outer border. Existing CSS has a 1px node border, 11px handle, and right -6px, so the center is 0.5 graph units inside that edge. The old fit zoom hid the offset below the unchanged 0.5-pixel tolerance. `apps/foldkit/e2e/layout-recipes.e2e.ts:109` now expects `root.right - 0.5*zoom`, retaining the same tolerance. Its comment cites pinned padding and `packages/foldkit/src/style.css:275,350-373`. No handle geometry or CSS changes. The two scenes' old outer-edge expectation becomes the existing native CSS center, which the probe measures independently.
- UP-126-037 exposed a fixture input mismatch. `packages/conformance/src/upstream-generic/pane/general.ts` injected 150×40 sizes absent from pinned `examples/react/src/generic-tests/pane/general.ts:1-37`. At 1280×720 that synthetic graph fits to y=127.20000000000002. CSS serializes before/after as 127.2/227.2; the test's subtraction is 99.99999999999999 and floors to 99. Faithful browser receipts are `/tmp/plan144/faithful-pan-{vanilla,foldkit}-{0,1,2}.json`. Remove only the invented sizes, letting each public host measure its native nodes as the source input requires. Keep every upstream gesture, assertion, parser, padding value, and ledger status unchanged. No rounding adjustment enters fit or pan math, and no claim equates Flow's native theme dimensions with React's theme.

The Foldkit controls/layout repair passes all 33 repeated checks in `/tmp/plan144/foldkit-repair.json`. The unchanged pane assertion passes 3/3 per repaired host. An intermediate Vanilla preservation check used an incorrect last decimal in a newly added expectation; the literal was corrected to the independently computed pinned result, without changing the production target or comparison precision.

The live Controls repair exposed one further Foldkit defect in the complete retained-page Cypress sequence: Zoom Out by 1/1.2 followed by the old double-click factor 1.2 restored the starting transform, failing UP-127-062. An isolated filtered run passes 3/3 without the earlier enabling toggle and is explicitly not acceptance evidence. The complete 67-case runner reproduces the failure 3/3 in `/tmp/plan144/double-click-sequence-before.json`. Pinned `packages/system/src/xypanzoom/XYPanZoom.ts:103,220-225` retains d3-zoom 3.0.0's factor 2, or 0.5 with Shift (`https://github.com/d3/d3-zoom/blob/v3.0.0/src/zoom.js#L303-L313`). No existing Foldkit test or documentation specifies the old 1.2 target. Forward the native Shift flag through its schema variant and correct the target in `packages/foldkit/src/graph.ts:3585`. `apps/foldkit/e2e/viewport-controls.e2e.ts:25` adds a native empty-canvas test through the public Runtime harness: viewport `(0,0,0.5)` becomes `(-250,-200,1)` about pointer `(250,200)`, then Shift double-click restores `(0,0,0.5)`. Both targets avoid zoom limits so clamping cannot mask a wrong factor. The comment cites the pinned adapter and dependency handler. Existing viewport-control and upstream assertions remain unchanged; d3's transition-frame timing remains unverified.

The complete repaired Cypress runner and native viewport file pass 207/207 repeated outcomes in `/tmp/plan144/double-click-sequence-after.json`. This includes all 67 Cypress cases three times, plus both viewport tests three times. The final Foldkit affected pass adds interaction-lifecycle coverage for the changed native event path and preserves every Phase 126/127/128 outcome. Vanilla and Vue affected inputs remain unchanged by this Foldkit-only follow-through.

The first required verifier passed all 15 non-browser gates, then found a Flow-owned selection setup still tied to the old padding. Its fixed 425×225 marquee selected Node-1/2/3 but missed the drag-handle node under the denser fit; the failure snapshot records those exact pressed states. `/tmp/plan144/verify-first-attempt.log` retains the rejected verifier receipt. `apps/shared-e2e/node-input-contract.ts:8` changes only this Flow test's setup to the rendered union of those same four subjects plus a 12-pixel margin. It retains the literal count 4, union-bounds checks, 100-pixel pan, unchanged dimensions, and final single-selection behavior, and strengthens selected-ID assertions. Its new comment cites pinned `packages/system/src/utils/general.ts:196-259,304-343`; the existing pinned nodes-spec comment remains. No upstream assertion or selection implementation changes. This helper serves all three hosts, so its repair is repeated in each before the verifier rerun.

The first dynamic-union attempt passed Vanilla/Vue 3/3 but Foldkit only 2/3. Its top margin lay inside the existing 40-pixel selection auto-pan band. Core calculates a 15-pixel viewport shift for start `(423,20)`, versus zero for `(423,100)`. The final Flow setup first makes 80 pixels of working room through a native middle-button pan, verifies that actual movement, then measures the subjects and draws the marquee. This preserves auto-pan behavior and avoids sampling its transient motion as a setup assumption. All nine final host repetitions pass in `/tmp/plan144/selection-final-{vanilla,vue,foldkit}.json`. The original selection assertions remain unchanged and selected IDs are checked explicitly.

## Results

The final affected runs pass every complete upstream runner in all hosts, with retained expected failures and existing skips separated below. Phase 128's 31 utility cases run separately in the unit suite. Its browser runner contains 76 cases per host.

| Host | Phase 126 pass / expected failure | Phase 127 pass / expected failure | Phase 128 pass / expected failure / skip |
| --- | --- | --- | --- |
| Vanilla | 44 / 6 | 65 / 2 | 68 / 6 / 2 |
| Vue | 48 / 2 | 67 / 0 | 70 / 4 / 2 |
| Foldkit | 47 / 3 | 67 / 0 | 72 / 4 / 0 |

| Host | Affected files | Outcomes | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla | 22 | 418 | 400 | 14 | 4 | 0 / 0 |
| Vue | 20 | 281 | 273 | 6 | 2 | 0 / 0 |
| Foldkit | 23 | 343 | 336 | 7 | 0 | 0 / 0 |

The affected selection covers viewport operations, fit view, viewport controls, public state, minimaps, all recipe files, Schema Studio where present, and every upstream runner. Foldkit adds interaction-lifecycle after the native double-click repair. There is no standalone `fit-view.e2e.ts` or Vanilla `minimap.e2e.ts`; fit coverage is in core, advanced-gestures, flow-followups, and the public viewport suites, while Vanilla minimap coverage is in ui-controls and recipes. Receipts are `/tmp/plan144/affected-final-{vanilla,vue}.json` and `/tmp/plan144/affected-current-foldkit.json`.

The independent pre-verifier checks pass quality, typechecking, 2,592 unit tests across 105 files, documentation, and research citations. Direct execution of the pinned helper and Flow helper agrees exactly in 1,344 combinations of pane sizes, bounds, zoom limits, and padding forms. The saved focused configuration retains all prior checks and browser files and adds only the Vanilla/Vue computing-flows recipe files; it now selects 53 Vanilla, 51 Vue, and 62 Foldkit files. The required `scripts/with-flow-browser-lock.sh bun run verify` passes all 18 gates with this saved focused profile. It passes 2,592 unit tests across 105 files, 3,318 research citations across 88 traces, and the documentation checks. Post-receipt clarification removes two superseded historical citations; the final citation check passes 3,316 citations across the same 88 traces. All 166 saved browser files run with one worker. No unexpected or flaky result remains.

| Host | Saved files | Browser cases | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla | 53 | 853 | 835 | 14 | 4 | 0 / 0 |
| Vue | 51 | 983 | 975 | 6 | 2 | 0 / 0 |
| Foldkit | 62 | 619 | 612 | 7 | 0 | 0 / 0 |

The verifier completes in 1,224,616ms. `/tmp/plan144/verify.log` is the raw receipt; its SHA-256, individual gate names, per-host outcomes, repeated repairs, earlier rejected attempts, ledger counts, and 29 tested source/input hashes are retained in `research/catalogs/fitview-padding-evidence.json`. The first rejected verifier is kept separately. Final receipt prose and metadata are the only changes after the successful verifier; every tested TypeScript, fixture, config, and ledger input hash still matches. Both named known Vanilla flakes pass in the final run. Source assertions and imported artifacts remain unchanged.

## Conformity and deviations

Conforming: shared numeric padding, px/percent strings, explicit sides, x/y fallbacks, flooring, zoom clamping, and asymmetric corrections match pinned xyflow at the named core and public fixed-bounds test boundaries. Numeric 0/0.1/0.5/1/2 and mixed measured/fallback/hidden bounds have independent expected values. Migrated pixel callers retain their literal viewports, and the Vanilla recipe retains its intended gutter and viewport. UP-128-056 passes its complete unchanged assertion in all hosts before its ledger promotion. Every Phase 126/127/128 runner completes with the recorded classifications. Foldkit live controls and normal/Shift double-click terminal targets have native browser proof; no source assertion is weakened.

Intentionally different: invalid units and non-finite input are rejected at Flow's decode boundary instead of logged with a zero fallback. Existing empty/zero-area handling, unmeasured-node fallback, explicit terminal statuses, controlled proposals, Vanilla programmatic pan constraints, native host themes, and other retained ledger differences remain unchanged. Removing invented pane-fixture sizes preserves upstream input fidelity and does not claim native theme geometry equivalence. Only UP-128-056 changes ledger status.

Unverified: full-profile/release acceptance, every option combination, CSS-transformed hosts, d3 transition frames and interruption timing, other browser engines, physical devices, CI, and collector-side OTLP delivery. The focused local Chromium pass establishes the named scope only. No push or merge is performed.
