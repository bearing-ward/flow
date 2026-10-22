# Plan 138: Remaining upstream Cypress follow-ups

## Problem and scope

Consolidate the remaining edge-input, viewport, and connection follow-ups from Plan 134. Preserve the unchanged upstream assertions, waits, forced-event coordinates, default subject-center releases, synchronous pre-queue reads, and shared-page sequences. Never reset graph or viewport state between cases.

The starting commit is `d6ced9e50dd5c7fbbd28f4ad9c52545a335bc4a8`. The pinned upstream is `0a1f9575b25679f2880175de8d3eae21aedde921`. Imported artifacts are immutable. Plans 135-137 already repaired several prerequisites listed in the original follow-ups; verify their current outcomes rather than reopening historical failures.

| Case | Remaining host boundary at start |
| --- | --- |
| UP-127-006, UP-127-011 | Vue selection changes wrapper order. Vanilla retains the documented shared-SVG difference only if Basic enables elevation upstream. |
| UP-127-056 | Vanilla reorders with elevation disabled. Vue has an earlier offscreen-release diagnosis that must be re-evaluated after the prerequisite repairs. |
| UP-127-062 | Vue zoom-out and double-click factors cancel. Measure the sequence and compare pinned d3 behavior before changing product or port timing. |

## Consolidated historical evidence

These observations are the original Plan 134 boundaries, not current classifications. Native input, elementsFromPoint, rendered geometry, and styles are retained in `research/catalogs/upstream-cypress-evidence.json`. The ledger provides source declarations. UP-127-014 and UP-127-015 depended on deletion; UP-127-058 depended on pane admission. Check these connections after the complete shared-page prefix. Preserve midpoint clicks on curved path bounding boxes rather than substituting curve points. Preserve Cypress 13.6.6's built-in 50ms post-click delay and all upstream waits.

| Case | Upstream title | Host | Historical observed boundary |
| --- | --- | --- | --- |
| UP-127-006 | selects an edge by click | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3; the first-wrapper assertion fails. |
| UP-127-011 | selects an edge | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3. |
| UP-127-015 | removes an edge | vanilla | The ordinary native click and Backspace delete e1-2, but UP-127-013 left the original graph intact. Two edges remain rather than zero; this is a deletion-prerequisite failure. |
| UP-127-056 | selects an edge by click | vanilla | Forced subject events select e1-2, but it moves after e1-3, so the :first assertion reads unselected e1-3. Interaction never enables edge elevation; ignoring the default-false elevation policy is not covered by the documented Basic shared-SVG exception. |
| UP-127-056 | selects an edge by click | vue | Forced pointer down/up and click reach e1-2 with selection enabled, but its wrapper stays unselected. The earlier UP-127-048 pan put the release point offscreen, where elementsFromPoint returns no hit; forced activation and native hit testing remain separate boundaries. |
| UP-127-036 | drags using right click | vanilla | Right-button center-to-bottom movement reaches the Figma canvas, but the default center mouseup returns the final viewport to its initial position; Node 4 remains partly inside instead of entirely outside. |
| UP-127-062 | zooms by double click | vanilla | Both zoom-out and native double-click arrive, but their factors cancel: the viewport transform equals the synchronously captured pre-queue transform after the original 50ms wait. |
| UP-127-062 | zooms by double click | vue | The control zoom-out and double-click factors cancel, leaving the final CSS transform equal to the synchronously captured pre-queue value after the upstream 50ms wait. |
| UP-127-014 | connects nodes | vanilla | The 3-to-4 handle sequence creates xy-edge__3-4, but UP-127-013 left the original two edges intact, so the count is 3 rather than 1; this is a deletion-prerequisite failure. |
| UP-127-058 | connects two nodes | vanilla | After the disabled-selection pan in UP-127-048, the 3-to-4 gesture starts outside the viewport on html and leaves two edges rather than three; this is a pane-admission prerequisite failure. |
| UP-127-058 | connects two nodes | vue | After UP-127-048 panned Node 3 offscreen, the handle sequence starts on html and leaves two edges rather than three; this depends on the earlier pane admission. |

## Execution

1. Read each ledger entry, its pinned source, and its diagnostic receipt. Run the complete corresponding spec sequence through `/upstream-examples/<name>`; these Cypress files preserve page state across cases.
2. Reproduce the unchanged assertion in its complete sequence. Retain baseline expected-failure classifications so Playwright preserves the page after failures. Ordinary-failure probes can restart workers and do not prove shared-page prerequisites. Record exact received values, pointer targets, and any earlier case that blocked the intended state.
3. Trace the public browser entry, accepted document, geometry, DOM effects, and rendered output with exact source locations. Keep production and synthetic test paths separate. Follow `docs/standards.md` and existing observability ownership.
4. Implement only the proven repair in the appropriate package or host. Keep titles, assertions, numbers, commands, default release positions, and source timing unchanged. Add a focused regression only when the upstream case does not prove the cause.
5. Update only proven ledger outcomes. Retain unresolved failures and existing documented deviations. Add verification scope without removing any prior checks or browser files.

## Acceptance

Run each complete affected host runner with `--repeat-each=3`, then the saved focused verifier. Use `scripts/with-flow-browser-lock.sh` and `--workers=1` for every browser invocation. Preserve every previously passing contract. Report ordinary passes, expected failures, skipped cases, unexpected results, and differences between repeats. Remap shifted trace citations and run `bun run research:check-traces`. Commit or publish only with the authority granted for the follow-up.

## Repair boundaries

- Keep Vue wrappers in document order and apply elevation through CSS z-index. Trace EdgeRenderer and EdgeWrapper before replacing the current layer grouping.
- Vanilla must preserve document order when elevation is disabled. Its shared-SVG paint ordering remains intentional when elevation is enabled. Confirm Basic's upstream prop and Flow mapping.
- Measure Vue's exact zoom transform sequence, control factor and animation defaults, and d3 double-click factor and duration. Distinguish a product defect from the port reading an animation in flight. Never change upstream waits.
- Re-check UP-127-014, UP-127-015, UP-127-036, and UP-127-058 in the full shared-page sequence after Plans 135-136.
- If an existing Flow expectation conflicts, first check non-default options. Update only an undocumented expectation contradicted unambiguously by pinned upstream, add a citation comment, and list it below. Record documented or ambiguous conflicts without reversing policy.
- Preserve non-interactive edge labels, active-elevation Vanilla shared-SVG stacking, hidden Foldkit toolbars, and instance-scoped marker IDs. Add only to `verification.config.json`.
- Run every browser command through `scripts/with-flow-browser-lock.sh` with `--workers=1`; wait for the shared lock. Re-run the known next-slices line 364 and Vanilla graph-renderers line 1977 flakes before diagnosing.

## Required verification

Run complete upstream Cypress runners in all hosts with `--repeat-each=3`, complete Phase 126 upstream Playwright runners, and affected edge-recipes, edge-interaction, renderer-contract, viewport-controls/operations, and ui-controls suites. Then run `scripts/with-flow-browser-lock.sh bun run verify`. Remap shifted research citations and run `bun run research:check-traces`. Report local focused-profile scope separately from full-suite acceptance. Commit on `plan/138-cypress-remaining` with the requested co-author trailer; do not push or merge.

## Instrumented baseline and repairs

The starting worktree was clean at `d6ced9e`. The first three browser starts executed no tests because dependencies were missing. `bun install --frozen-lockfile` installed the declared versions without changing the lockfile. The executable baseline preserves the original expected-failure flags, so failures do not restart the worker or discard shared-page state. Each complete host runner reports 67 expected outcomes, with 64 ordinary passes in Vanilla, 63 in Vue, and 67 in Foldkit. Temporary diagnostics add only style observations and event receipts. They add no waits and reset no graph or viewport state. All temporary instrumentation is removed before acceptance.

The baseline, complete transform samples, native input receipts, isolated d3 probe, and reproducible probe sources are retained in `research/catalogs/cypress-remaining-evidence.json`. The production and test call paths are traced in `research/traces/cypress-remaining.md`.

| Boundary | Evidence | Repair |
| --- | --- | --- |
| Basic elevation | Pinned `examples/react/src/examples/Basic/index.tsx:163` explicitly sets `elevateEdgesOnSelect`; Flow maps it at `packages/conformance/src/upstream-examples/basic.ts:57`. | Keep Vanilla UP-127-006 and UP-127-011 as intentional differences under the shared-SVG policy at `research/traces/edge-visibility-stacking.md:34`. |
| Vue wrapper order | Pinned `packages/react/src/container/EdgeRenderer/index.tsx:66` maps document IDs. `packages/react/src/components/EdgeWrapper/index.tsx:183` changes each SVG's CSS z-index. Vue previously remounted edges in separate z-level groups. | Render stable per-edge SVGs and label layers in document order. Apply semantic CSS levels without moving wrappers. Remove the obsolete focus-restoration workaround. |
| Vanilla disabled elevation | Interaction does not set elevation. The renderer had both an unconditional selected bonus and an orderFlowEdges pre-sort that favored selection. | Sort directly by computeFlowStacking's levels and original array index. With elevation disabled, equal-level edges retain their order. Enabled elevation keeps the shared-SVG paint-order policy. |
| Vue UP-127-056 | The complete prefix now leaves the viewport at translate(0,0), scale(1). The forced release at `(537,124)` reaches e1-2, but coordinate hit testing sees Node 3 first. The previous offscreen diagnosis is obsolete. | Resolve an edge-owned release from its delivered event target. Keep coordinate hit testing for pointer-captured canvas releases, plus the existing pointer identity and travel checks. No forced-input detection is added. |
| Vue UP-127-062 | Baseline transforms are translate(0,0), scale(0.818731), then translate(106.667,60), scale(0.682276), then translate(0,0), scale(0.818731). Both writes are immediate. | Correct the double-click factor to 2, or 0.5 with Shift, using the existing pointer anchor and viewport publication owner. Preserve every upstream wait. |
| Connections and release prerequisites | UP-127-014, UP-127-015, UP-127-036, and UP-127-058 already pass in every complete baseline runner. | No new connection, deletion, fixture, or pan repair is required. Recheck all cases in the repeated complete runners. |

The [d3-zoom 3.0.0 source](https://github.com/d3/d3-zoom/blob/v3.0.0/src/zoom.js#L303-L313) doubles around the pointer over its default 250ms transition. The native isolated probe starts at zoom 0.8187307530779818, applies Controls' divide-by-1.2 target 0.6822756275649848, samples about 0.6902457465198724 and 0.7775045664242767 during the two 50ms waits, and finishes at 1.3645512551299697. Controls supplies no duration, and pinned `packages/system/src/xypanzoom/utils.ts:26` defaults it to zero. Thus the Vue failure is an incorrect target factor, not an incorrectly superseded control animation or a missing port sleep. Vue retains its existing immediate publication, so this repair does not establish d3 transition-frame parity. Vanilla and Foldkit's passing inequality also does not prove their double-click factor or duration.

The first related Vue run found one repair-induced regression: 95 ordinary passes, two retained expected failures, and a timeout in the unchanged button-edge recipe. Per-edge SVGs were inside the viewport at z-index 2 while the interactive custom label registry remained a sibling at z-index 1. A native hit-order assertion reproduced the cause immediately. The edge hit path was first and the visible delete button fourth in elementsFromPoint. Pinned `packages/react/src/container/GraphView/index.tsx:182` places EdgeLabelRenderer inside the viewport. Vue now does the same, at z-index 0 after edges and before nodes, with no second viewport transform. The existing delete-by-click and delete-by-keyboard assertions remain unchanged. The stronger hit-order assertion fails before this repair and passes 3/3 afterward. Standard non-interactive labels retain their policy. The receipt is in the evidence catalog, with `/tmp/plan138/label-{red,green}.json` and the initial affected report retained separately.

The first required verifier passed every non-browser gate and all 764 Vanilla outcomes, then stopped after Vue's 895 cases with one existing node-connections assertion failure. Removing an edge delivered disconnect callbacks in C,A order rather than the established A,C order. The unchanged test fails 3/3 on the first renderer repair. The dynamic edge SVGs and labels had been flattened into the same child list as nodes, so an edge-count change altered Vue's sibling patch order and node watcher scheduling. A separate nested edge collection with keyed per-edge fragments keeps node child positions stable, preserves SVG document order and focus, and separates edge keys from node keys. No node-connection assertion or composable workflow changes. The first verifier receipt is `/tmp/plan138/verify-before-node-order-fix.log`; the focused before/after reports are `/tmp/plan138/node-order-{red,green}.json`. The unchanged node-connection test passes 3/3 after grouping. The combined node-connections and complete final-wiring recheck passes 63/63 outcomes. Acceptance is rerun against this final grouping.

## Changed Flow tests

No upstream port title, assertion, command, coordinate, release position, or wait changes. No existing documented difference is reversed.

| Test | Previous expectation or fixture | Change and citation |
| --- | --- | --- |
| `apps/vanilla/e2e/next-slices.e2e.ts:134` | The selected-edge elevation scenario relied on an undocumented elevation-on default. | Explicitly enable `elevateEdgesOnSelect`. Keep the original rise, multiple-selection, and focus assertions. The comment cites pinned `packages/react/src/container/ReactFlow/index.tsx:130`, whose default is false. The non-default option explains the test's intended behavior. |
| `apps/vue/e2e/node-threshold.e2e.ts:5504` and `apps/vue/e2e/node-threshold.e2e.ts:5639` | Synthetic ordinary-write and continuation scenarios expected double-click zoom 1.2 with pointer translation (-20,-10). | Expect zoom 2 and translation (-100,-50). Citation comments name d3-zoom 3.0.0 src/zoom.js:308. No option explains 1.2, and no documentation promises it. Preserve all ownership, event ordering, cancellation, and controlled-acknowledgement assertions. |
| `apps/vue/e2e/renderer-contract.e2e.ts:361` | The marker-scope test counted one edge SVG per canvas. | Query the three canvases to retain the same marker-ID uniqueness and reference assertions. The comment cites pinned EdgeWrapper's per-edge SVG at line 183. Marker policy does not change. |
| `apps/vue/e2e/final-wiring.e2e.ts:265` | Existing coverage asserted z-levels, labels, and restored focus. | Add retained original hit-path connectivity and literal document order before and after selection and auto-mode changes. Keep existing z-index, overlap, focus, and label assertions. Cite pinned EdgeRenderer line 66 and EdgeWrapper line 183. |
| `apps/vue/e2e/viewport-operations.e2e.ts:382` | No exact native double-click target regression. | Add native double-click and Shift double-click with literal viewport targets (-480,-360,2) and (10,20,1), citing d3-zoom lines 303-313. Enable double-click in the existing viewport fixture. |
| `apps/vue/e2e/edge-recipes.e2e.ts:210` | Native delete-edge button clicks timed out after the first renderer repair. | Add a literal top-hit assertion and saved hit stack before the existing click. Cite pinned GraphView line 182. Keep the original pointer-events, geometry, pointer deletion, keyboard deletion, and edge-count assertions. |

The first repaired complete Cypress runs report 65 ordinary passes and two retained expected failures in Vanilla, and 67 ordinary passes in Vue. The focused Vue regression run passes all 525 tests across node-threshold, final-wiring, renderer-contract, and viewport-operations. Vanilla's explicit-elevation regression passes 1/1. These exploratory results are separate from repeated acceptance and the required verifier below.

## Results

Every repaired host entry passes its unchanged upstream assertion 3/3 in the complete shared-page runner. The final Vue repetition follows both the custom-label repair and the isolated edge collection. The exact case outcomes, repeat and worker indexes, Phase 126 cases, ledger deltas, source hashes, and report paths are retained in `research/catalogs/cypress-remaining-results.json`.

| Case | Vanilla | Vue | Foldkit | Change and evidence |
| --- | --- | --- | --- | --- |
| UP-127-006 | Intentional difference, 3/3 expected failures | Fixed pass, 3/3 | Preserved pass, 3/3 | Basic enables elevation. Vanilla retains shared-SVG paint reordering. Vue retains wrappers and changes CSS levels. |
| UP-127-011 | Intentional difference, 3/3 expected failures | Fixed pass, 3/3 | Preserved pass, 3/3 | Same Basic ordering boundary; both first-wrapper assertions remain unchanged. |
| UP-127-056 | Fixed pass, 3/3 | Fixed pass, 3/3 | Preserved pass, 3/3 | Vanilla removes unconditional selected ordering. Vue respects the delivered covered-edge release target. |
| UP-127-062 | Preserved pass, 3/3 | Fixed pass, 3/3 | Preserved pass, 3/3 | Vue uses factor 2 about the pointer and 0.5 with Shift. Its new native test proves literal endpoints. Passing this unchanged inequality alone does not prove Vanilla or Foldkit factor or animation parity. |
| UP-127-014 | Preserved pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Connection after deletion already passes at the base; no connection change. |
| UP-127-015 | Preserved pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Deletion after connection already passes; no deletion change. |
| UP-127-036 | Preserved pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Right-click default-release behavior already passes after Plan 135. |
| UP-127-048 | Preserved pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Pane admission prerequisite remains passing. |
| UP-127-058 | Preserved pass, 3/3 | Preserved pass, 3/3 | Preserved pass, 3/3 | Connection after disabled-selection admission already passes after the earlier repairs. |

All cases above retain the same classification in each repetition. Evidence for the first-wrapper, covered-edge, viewport, and prerequisite boundaries is in the baseline catalog and `research/traces/cypress-remaining.md`. The complete upstream port sources are unchanged.

| Host | Cypress repeated outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 201 | 195 | 6 | 0 | 0 / 0 |
| Vue | 201 | 201 | 0 | 0 | 0 / 0 |
| Foldkit | 201 | 201 | 0 | 0 | 0 / 0 |

| Host | Affected outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 68 | 62 | 6 | 0 | 0 / 0 |
| Vue | 99 | 97 | 2 | 0 | 0 / 0 |
| Foldkit | 67 | 64 | 3 | 0 | 0 / 0 |

Every affected scope contains the complete 50-case Phase 126 runner, edge-recipes, renderer-contract, and ui-controls. Vanilla also runs next-slices. Vue also runs final-wiring, activation-callbacks, viewport-operations, and the unchanged node-connections regression. Foldkit also runs edge-interaction and viewport-controls. Phase 126 remains 44 ordinary passes and 6 retained expected failures in Vanilla, 48 and 2 in Vue, and 47 and 3 in Foldkit. No previously passing Phase 126 contract regresses. The final button-edge hit and deletion regression also passes 3/3 separately.

Ledger counts below are pass / fail / intentional difference. Only five host entries change, all from fail to pass. Vanilla's two Basic intentional differences retain their classification and citation. Phase 128 remains 107 not-ported cases per host, with no change.

| Phase | Host    | Before     | After      |
| ----- | ------- | ---------- | ---------- |
| 126   | Vanilla | 44 / 3 / 3 | 44 / 3 / 3 |
| 126   | Vue     | 48 / 0 / 2 | 48 / 0 / 2 |
| 126   | Foldkit | 47 / 0 / 3 | 47 / 0 / 3 |
| 127   | Vanilla | 64 / 1 / 2 | 65 / 0 / 2 |
| 127   | Vue     | 63 / 4 / 0 | 67 / 0 / 0 |
| 127   | Foldkit | 67 / 0 / 0 | 67 / 0 / 0 |

All requested browser commands use the shared lock and one worker. Reproduce the complete upstream acceptance with:

```sh
scripts/with-flow-browser-lock.sh bunx playwright test upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

Raw reports are `/tmp/plan138/repeat-{vanilla,foldkit}.json`, `/tmp/plan138/repeat-vue-grouped.json`, `/tmp/plan138/affected-{vanilla,foldkit}.json`, and `/tmp/plan138/affected-vue-grouped.json`. The initial Vue affected failure is retained as `/tmp/plan138/affected-vue-before-label-fix.json`. The plan preserves all prior verification checks and browser files, appending only this task to activeWork. The saved scope contains 50 Vanilla, 48 Vue, and 61 Foldkit files. The default remains focused.

The final required `scripts/with-flow-browser-lock.sh bun run verify` passes all 18 gates with the focused profile, every saved check, and every saved browser file. It passes package and app builds, typechecking, architecture, quality, packed consumers, documentation, catalogs, the ledger, 2,525 unit tests across 97 files, and 3,205 citations across 85 traces. No unexpected or flaky browser outcome remains.

| Host | Saved browser cases | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 764 | 754 | 8 | 2 | 0 / 0 |
| Vue | 895 | 893 | 2 | 0 | 0 / 0 |
| Foldkit | 541 | 538 | 3 | 0 | 0 / 0 |

The two existing Vanilla skips require real pointer capture for concurrent native cancellation and real touch pointer capture for two-contact pinch cancellation. Neither is an upstream or newly added contract. The final verifier completes in 1,095,596ms. Its exact gate names, host outcomes, and log hash are retained in the results catalog. The raw receipt is `/tmp/plan138/verify.log`. The prior failed verifier and both repair-induced regressions remain in the evidence catalog. Only receipt prose and result metadata change after this verifier; production and test source hashes match the tested files.

## Conformity and deviations

Conforming: Vue UP-127-006, UP-127-011, UP-127-056, and UP-127-062, plus Vanilla UP-127-056, pass unchanged assertions 3/3. All previously passing Phase 126 contracts remain passing. Connections, deletion prerequisites, and right-click release pass 3/3 in all hosts without a new connection repair. Vue's added native test proves the factor-2 and Shift factor-0.5 pointer-centred targets. Retained element, document order, focus, custom label-button hit ownership, and existing node-observer order are tested separately. The comparison boundary is local Chromium through the pinned ports and accepted host state, not source similarity.

Intentionally different: Vanilla UP-127-006 and UP-127-011 retain their shared-SVG ordering classification because upstream Basic explicitly enables elevation. Standard edge labels remain non-interactive, Foldkit toolbars retain mounted-hidden behavior, and marker IDs remain instance-scoped. Vue's existing immediate double-click viewport publication remains different from d3's 250ms transition. The corrected target factor fixes the reported failure while preserving established viewport ownership. No new intentional-difference ledger entry is introduced.

Unverified: live React execution, transition-frame and animation-interruption parity, Vanilla and Foldkit double-click factor parity beyond their passing inequality assertions, other browser engines, physical devices, Phase 128 component contracts, full-profile acceptance, CI, deployment, and collector-side OTLP delivery. This is an isolated local focused-profile result. No push or merge is performed.
