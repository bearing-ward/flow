# Plan 135: Node selection input (upstream Cypress follow-up)

## Problem and scope

Separate zero-threshold click admission with selectNodesOnDrag=false from marquee admission. Investigate pane dismissal independently in controlled Vue and Foldkit. Preserve the source sequence, including failures that abort before later deletion or lock actions.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-003 | selects two nodes by clicks | vanilla | A native Meta down/click/up reaches measured Node 1, but threshold-zero selection with selectNodesOnDrag=false leaves its wrapper unselected; the second-node assertions are not reached. |
| UP-127-004 | selects a node by click | vanilla | Forced subject pointer and mouse events reach Node 1 without movement, but its wrapper stays unselected with nodeDragThreshold=0 and selectNodesOnDrag=false. |
| UP-127-005 | deselects node | vue | The native bottomLeft canvas click reaches the rectangular, borderless pane, but Node 1 remains selected. |
| UP-127-005 | deselects node | foldkit | The native bottomLeft click targets the rendered viewport, but Node 1 retains selected after the retrying assertion. |
| UP-127-007 | deselects edge | foldkit | The native bottomLeft pane click arrives, but e1-2 retains selected rather than being deselected. |
| UP-127-008 | selects one node with a selection | vanilla | Shift is present on the native (1,10) to (1000,200) sequence, but selectNodesOnDrag=false admits pane pan; Node 1 moves outside the marquee instead of acquiring selected. |
| UP-127-009 | selects all nodes | vanilla | Shift is present from topRight to bottomLeft, but the pane pans with selectNodesOnDrag=false and no node acquires selected; persistent-selection assertion is not reached. |
| UP-127-010 | removes selection | vanilla | After the native bottomLeft pane click, one .flow-selection-box remains attached with hidden presentation; upstream requires no selection rectangle DOM. |
| UP-127-013 | removes a node | vanilla | The native click reaches Node 1, but threshold-zero/selectNodesOnDrag=false leaves it unselected; Backspace and the node/edge count assertions are not reached. |
| UP-127-023 | uses interactive control - not interactive | vanilla | The initial click reaches Node 1 but leaves it unselected with threshold zero and selectNodesOnDrag=false; pane dismissal and the lock toggle are not reached. |
| UP-127-023 | uses interactive control - not interactive | vue | Node 1 is selected, but the native topLeft pane click leaves it selected; the lock toggle is not reached. |
| UP-127-023 | uses interactive control - not interactive | foldkit | Node 1 selects correctly, but a native topLeft pane click leaves it selected; the control toggle is not reached. |
| UP-127-024 | uses interactive control - interactive | vanilla | UP-127-023 aborted before its lock toggle; this case therefore toggles the still-enabled control off, and the forced Node 1 click remains unselected. |
| UP-127-034 | selects all nodes by drag | vanilla | The topLeft-to-bottomRight gesture reaches the Figma canvas, but selectNodesOnDrag=false suppresses marquee selection; no selected node is rendered. |
| UP-127-035 | removes selection | vue | After Figma selection, a native topLeft pane click leaves Nodes 1 and 2 selected rather than clearing all selection. |
| UP-127-035 | removes selection | foldkit | After Figma selection, the native topLeft canvas click leaves Nodes 1 and 2 selected. |
| UP-127-036 | drags using right click | vue | Right-button panning occurs, but the two nodes retained from UP-127-035 remain selected; the outside-viewport assertion is not reached. |
| UP-127-036 | drags using right click | foldkit | The right-button pan moves the graph, but the two nodes retained from UP-127-035 remain selected; the final outside-viewport assertion is not reached. |

## Execution

1. Read each ledger entry, its pinned source, and its diagnostic receipt. Run the complete corresponding spec sequence through `/upstream-examples/<name>`; these Cypress files preserve page state across cases.
2. Temporarily rate the target case as pass to reproduce its unchanged assertion as an ordinary failure. Prove prerequisite state and pointer targets before attributing a new defect. Record the exact received value and any earlier case that blocked the intended state.
3. Trace the public browser entry, accepted document, geometry, DOM effects, and rendered output with exact source locations. Keep production and synthetic test paths separate. Follow `docs/standards.md` and existing observability ownership.
4. Implement only the proven repair in the appropriate package or host. Keep titles, assertions, numbers, commands, default release positions, and source timing unchanged. Add a focused regression only when the upstream case does not prove the cause.
5. Update only proven ledger outcomes. Retain unresolved failures and existing documented deviations. Add verification scope without removing any prior checks or browser files.

## Acceptance

Run each complete affected host runner with `--repeat-each=3`, then the saved focused verifier. Use `scripts/with-flow-browser-lock.sh` and `--workers=1` for every browser invocation. Preserve every previously passing contract. Report ordinary passes, expected failures, skipped cases, unexpected results, and differences between repeats. Remap shifted trace citations and run `bun run research:check-traces`. Commit or publish only with the authority granted for the follow-up.

## Instrumented baseline and repairs

The complete ordinary-failure diagnostics at `6c934d7` produced 57 expected outcomes and 10 unexpected failures in Vanilla, 62 and 5 in Vue, and 62 and 5 in Foldkit. Each runner has 67 cases. These counts include retained expected failures. Temporarily marking a failure as pass makes Playwright restart its worker after the failure. Later diagnostic cases therefore do not prove the shared-page dependency. The original expected-failure receipts remain in `research/catalogs/upstream-cypress-evidence.json`; the current native captures and that limitation are recorded in `research/catalogs/node-input-evidence.json`.

The first candidate run had 231 expected outcomes and five unexpected failures in Vanilla, had 68 expected outcomes and one unexpected failure in Vue, and had 71 expected outcomes and no unexpected failures in Foldkit. Vanilla included both node-input and node-threshold suites. Vue and Foldkit included node-input. The new failures after selection became reachable were investigated separately.

Vue and Foldkit pane dismissal is a product defect. At the exact Cypress corner points, `(0,719)` and `(0,0)`, `elementsFromPoint` finds the canvas in Vue. Foldkit finds its empty viewport at bottom-left and the canvas at top-left. Neither Controls nor MiniMap covers these points. The old handlers cleared only the bounds flag. The repaired handlers propose an empty `selection-set`; controlled acceptance remains in the fixtures.

Vanilla and Vue have a second product defect in UP-127-036. Native input moves from `(640,360)` to `(640,719)`, then releases at `(640,360)` without an intervening move. Before release, the rendered transform is `translate(-85px,401px) scale(2)`. After release, it incorrectly returns to `translate(-85px,42px) scale(2)`. The pinned `packages/system/src/xypanzoom/eventhandler.ts:238` consumes `event.transform` at pan end. Both hosts now retain the transform produced by the last pointermove. Foldkit already does so.

UP-127-013 first failed at selection. After the click repair, instrumentation found Node 1 selected, but Backspace left all four nodes attached. The Vanilla example fixture omitted the upstream default `deleteKeyCode: 'Backspace'`, defined by pinned `packages/react/src/container/ReactFlow/index.tsx:68`. Vanilla's undefined-key compatibility path deletes a focused edge only. The fixture now maps Backspace explicitly, preserving the host default.

After UP-127-023 passed through its lock toggle, UP-127-024 still failed. Boundary logs show all three interactivity switches true, `trusted: false` on the simulated press, `capture failed`, then a `click-suppression` receipt. This is a forced-click port defect. The translator now uses native input when `elementsFromPoint` confirms the subject contains the exact hit. Covered forced subjects retain targeted dispatch. Position, force semantics, assertions, and the existing 50ms command delay remain unchanged.

The complete production and test paths, types, geometry, DOM effects, acceptance ownership, and telemetry are in [the node-input trace](../research/traces/cypress-node-input.md).

## Foldkit public option

`GraphInteractionOptions.selectNodesOnDrag` is an optional Boolean derived from the model schema. Startup defaults it to false, preserving Foldkit's prior click-selection behavior. `CanvasOptionsSchema` derives the patch field from the same Boolean schema; omitted values preserve the current setting. Explicit true selects at pointer drag activation. False selects on a stationary click, including threshold zero. Marquee admission remains independent.

The example fixture explicitly forwards the option and defaults missing values to false. Basic and Figma both supply false. The two obsolete Foldkit `unmappedProps` entries are removed. Public API documentation and both correspondence rows describe the option and its host-specific default. The generated core schema reference is unchanged.

Eight new pure application tests cover threshold-zero and positive-threshold activation, explicit false, runtime enable/disable patches, pane dismissal in controlled and uncontrolled modes, locked selection preservation, and empty-selection no-ops. Those tests establish reducer and publication behavior. They do not claim native input proof for explicit true.

## Existing test changes

The pinned selection authority is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:109`.

| Existing test | Before | Change and retained boundary |
| --- | --- | --- |
| `apps/vanilla/e2e/node-threshold.e2e.ts:147`, native capture release ordering | Exact receipt ended after native capture loss, omitting click selection with threshold zero and `selectNodesOnDrag: false`. | Append the observed `node-selection` after capture loss, with `held: false`. Every prior receipt and its order remains. Add a pinned-source citation comment. |
| `apps/vanilla/e2e/gesture-ownership.e2e.ts:534`, old reset timer preserves successor suppression, fixture in `apps/vanilla/e2e/gesture-ownership-harness.ts:601` | Stationary zero-threshold presses created suppression receipts. The test failed with `Missing A reset timer` after the repair. | Add a one-pixel pointermove to both synthetic drag sequences before release. This creates real drag suppression receipts. Preserve all test expectations, capture history, stale-timer replay, and click propagation assertions. Add a pinned-source citation comment. |

The second Vanilla diagnostic reached UP-127-014 and passed its unchanged connection assertion, exposing its retained expected-failure marker. UP-127-015 has the same recorded deletion prerequisite. Both entries are re-evaluated in the complete repeated sequence. The second diagnostic also exposed six legacy viewport cases that had represented movement only through changed pointerup coordinates. `viewportContinuationProof` now dispatches actual pointermoves before releasing the original pan and each successor. The strict viewport values, capture histories, callback ownership, and event ordering remain asserted. The expected streams add the movement notifications from these new inputs. Citation comments name pinned `packages/system/src/xypanzoom/eventhandler.ts:238`.

Two other diagnostic failures reported `Execution context was destroyed` while local files and package outputs were changing. Those cases are rerun without worktree writes during browser execution. No retry, delay, or assertion change masks those errors.

No upstream assertion, title, threshold, delay, or shared-page reset is changed.

## Per-case host classification

The labels describe the baseline cause. Preserved means the ledger was already pass. A knock-on is evaluated in the complete original sequence after its prerequisite succeeds. The acceptance counts below establish the final result; an ordinary-failure diagnostic alone does not.

| Case | Vanilla | Vue | Foldkit | Evidence and repair |
| --- | --- | --- | --- | --- |
| UP-127-003 | Root cause | Preserved | Preserved | Native Meta click reaches Node 1 but zero-threshold activation suppresses its click. Admit stationary click selection with the false option. |
| UP-127-004 | Click root and port bug | Preserved | Preserved | Forced click reaches the wrapper. The repaired translator uses native input when the subject contains the hit. Selection also has the independent native capture-order regression. |
| UP-127-005 | Preserved | Pane root cause | Pane root cause | Exact bottom-left hit stacks reach empty pane content. Publish an empty selection rather than only clearing bounds. |
| UP-127-007 | Preserved | Preserved | Same pane root | The original edge retains selected after the bottom-left click. Clear node and edge selection together. |
| UP-127-008 | Marquee root | Preserved | Preserved | Shift is present, but the node drag-selection option incorrectly gates pane admission. Remove that gate. |
| UP-127-009 | Same marquee root | Preserved | Preserved | Top-right to bottom-left pans instead of selecting. Independent admission restores the original sequence. |
| UP-127-010 | DOM root cause | Preserved | Preserved | The hidden bounds element remains attached, received count 1 instead of 0. Detach inactive bounds. |
| UP-127-013 | Click root, then port bug | Preserved | Preserved | After selection works, Backspace still leaves four nodes. Map upstream's Backspace default in the example fixture. |
| UP-127-014 | Deletion knock-on | Preserved | Preserved | The ledger records three edges instead of one because Node 1 was not removed. Re-evaluate unchanged connection assertions after UP-127-013. |
| UP-127-015 | Deletion knock-on | Preserved | Preserved | The ledger records two remaining edges because Node 1 was not removed. Re-evaluate unchanged edge deletion assertions after UP-127-013 and -014. |
| UP-127-023 | Click root | Pane root cause | Pane root cause | Vanilla initially never reaches the lock toggle. Vue and Foldkit reach the exact top-left pane but retain selection. |
| UP-127-024 | Knock-on, then port bug | Preserved | Preserved | After -023 reaches its lock toggle, all switches are true, but the simulated forced press fails capture. Use native input for an unobstructed forced subject. The ordinary baseline's Vue and Foldkit failures follow worker restart and are not accepted as product defects. |
| UP-127-034 | Marquee root | Preserved | Preserved | Figma primary selection is suppressed by the false node drag-selection option. Keep pane admission independent. |
| UP-127-035 | Preserved | Pane root cause | Pane root cause | The top-left click leaves Nodes 1 and 2 selected. Publish and acknowledge empty selection. |
| UP-127-036 | Pan-release root | Pane knock-on, then pan-release root | Pane knock-on | Original Vue and Foldkit receipts stop at retained selection. Once dismissal succeeds, Vanilla and Vue expose the center-release rollback. Keep the last move transform; Foldkit already does so. |

Root source locations and native hit/transform receipts are linked in [the research trace](../research/traces/cypress-node-input.md) and retained in `research/catalogs/node-input-evidence.json`. None of these cases introduces an intentional difference.

## Acceptance regressions and bounded corrections

The first complete affected Vue scope had 569 expected outcomes and 20 unexpected failures. Four were unchanged Phase 126 edge-selection contracts, and three were reconnect/resize lifecycle contracts. The initial pane repair used the click target alone. A fresh native probe recorded pointerdown at `(578.45,131.88)` on `.flow-vue-edge-hit-target`, then pointerup and click on the canvas while `elementsFromPoint` still found the edge. Pointer capture had retargeted the events. Vue now records whether the primary press began on the pane in capture phase, before child handlers can stop propagation. Dismissal requires that origin. All original edge, reconnect, resize, keyboard-toggle, and acceptance assertions remain unchanged.

The other 13 failures were legacy pan-release expectations. The upstream authority remains pinned `packages/system/src/xypanzoom/eventhandler.ts:238`.

| Existing Vue tests | Correction | Retained proof |
| --- | --- | --- |
| Synthetic pan continuation, pan-nested callback oracles, joined pan/request oracles, literal pan continuations | With no pointermove, change only literal expected viewport values from release displacement to the retained initial transform. Add source comments. The bounded AST edit changed eight viewport objects, 16 numeric literals, in the two named oracle maps. | Exact complete callback streams, capture counts, callback ownership, request results, accepted/proposed control modes, and stale continuation barriers. |
| Ordinary wheel, double-click, and editor writes joined to a pan; round-four partial editor continuation | Release retains the current edited transform instead of resetting to the press transform. Controlled expectations retain the accepted transform. Add source comments. | Exact callback order, publications, status, capture release, frames, and final literal viewport. |
| Ownership round-five plain-pan and request-during-pan | Add an actual pointermove before release and expect its additional Change/Move pair. Preserve the original 20px/10px displacement and complete typed accepted-state oracles. Add a source comment. | State subscriptions, request results, original full documents, callback order, capture history, disposal, and frame histories. |
| Vanilla round-three V5 viewport continuation, six affected variants | Add actual pointermoves for the original pan and successor, with their exact additional movement notifications. Preserve all displacement, capture, and ownership assertions. | The original strict full event streams plus the new movement notifications. |

All 23 focused Vue regression checks passed after these corrections. At that stage, the corresponding four Foldkit Phase 126 edge checks passed without a Foldkit press-origin change. No upstream assertion or input sequence was edited. Temporary instrumentation was removed. The broader affected and repeated runs below are the acceptance boundary.

A later Vue affected run had 588 expected outcomes and one failure in the immediate unmount/remount synthetic capture test. The diagnostic recorded event stamp and node listener attachment both equal to `1792682999785`, with no callbacks or captures. Vue 3.5.44's installed `runtime-dom.esm-bundler.js:745` skips a listener when a previous invoker stamped that event in the attachment millisecond. The new VNode capture hook caused this regression. The final implementation records the origin with a native canvas capture listener, registered by the canvas ref and removed through the existing typed disposal packet. It preserves same-tick synthetic node admission without changing private framework fields, adding a delay, or changing the remount assertions. Both unmount phases passed 3/3. The test now attaches its complete remount receipt.

The first Foldkit affected run had 154 expected outcomes and one failure in `events-and-changes.e2e.ts`, interaction event fields. That test selected A, clicked the pane, dragged A with Foldkit's default `selectNodesOnDrag: false`, then toggled B. Its old `['a', 'b']` expectation depended on the missing pane dismissal. It now explicitly asserts empty selection after the pane click and expects `['b']` after the toggle. The source comment cites pinned `packages/react/src/container/Pane/index.tsx:107`. Mouse coordinates, drag IDs, callback fields, and later edge-selection assertions remain unchanged. The focused test passed.

The first verifier attempt to reach browser tests passed Vanilla's 758 expected outcomes with two existing skips, then had 884 expected outcomes and one Vue failure at `apps/vue/e2e/canvas-options.e2e.ts:516`. The test explicitly sets `paneClickDistance: 100` and `selectionOnDrag: true`. A native probe records a 50px pane movement, a zero-width selection rectangle, Node A selected before release, an admitted `pane-click`, and an empty selection after release. The exact point's hit stack contains only the empty canvas. Pinned `packages/react/src/container/Pane/index.tsx:299` keeps selection inactive below the configured distance; its release path at `:340` calls the pane click handler, and `:107` resets selection. No documented intentional difference requires preserving the old expectation. The test now expects A to be unselected after this admitted click, with a citation comment. Its rectangle widths, Shift bypass, input sequence, and all other assertions remain unchanged. The diagnostic receipt is retained in the evidence catalog. This correction changes only that existing test, not production code.

The next complete verifier attempt passed all 758 Vanilla and 885 Vue expected outcomes, then recorded 535 expected outcomes and one Foldkit failure in the unchanged connection cancellation contract at `apps/shared-e2e/connection-threshold-contract.ts:826`. An escaped pending reconnection emitted an empty selection change. A native probe at `(365,172)` records pointerdown, pointerup, and click all targeting the reconnect button with `data-edge-id="edge"` and `data-edge-endpoint="target"`. This is not pane retargeting. The mouse observer identified edges only through the edge hit-path selector, so an edge control fell through to onPaneClick. It now identifies edge ownership first, selects only the actual edge hit path, and returns without a pane event for other edge-owned targets. The existing cancellation assertions remain unchanged and pass 3/3. The complete Foldkit connection-threshold suite is added to the affected scope. The diagnostic receipt is retained in the evidence catalog; non-interactive edge labels remain non-interactive.

## Results

All 15 listed node-input and deletion-dependent cases pass 3/3 in every host in the complete unchanged Cypress runners. None has an active expected-failure classification. Complete host reports, individual case outcomes, ledger deltas, and tested source hashes are retained in `research/catalogs/node-input-results.json`.

| Host | Cypress repeated outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 201 | 159 | 42 | 0 | 0 / 0 |
| Vue | 201 | 162 | 39 | 0 | 0 / 0 |
| Foldkit | 201 | 180 | 21 | 0 | 0 / 0 |

Every retained expected failure has the same classification in all three repetitions. The 13 requested cases and two deletion dependents each have three ordinary passes per host, with no difference between repetitions. This is 135 scoped ordinary case executions.

| Host | Affected expected outcomes | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 368 | 362 | 6 | 2 | 0 / 0 |
| Vue | 589 | 587 | 2 | 0 | 0 / 0 |
| Foldkit | 215 | 212 | 3 | 0 | 0 / 0 |

Every affected scope contains the complete 50-case Phase 126 runner plus node-threshold, node-input, events-and-changes, interaction-lifecycle, and shared-conformance suites. Vanilla additionally runs advanced-gestures and movement-slices; Vue runs viewport-operations; Foldkit runs selection-rect-race, pane-input, viewport-controls, and the complete connection-threshold suite. Phase 126 has 44 ordinary passes and 6 retained expected failures in Vanilla, 48 and 2 in Vue, and 47 and 3 in Foldkit. No previously passing Phase 126 contract regresses. The two existing Vanilla skips are the concurrent native connection/node cancellation and native two-contact pinch cancellation cases requiring real pointer capture. Neither is a node-input or upstream contract.

All eight new unit tests pass. The focused Foldkit unit slice passes 77 tests, and the complete unit suite passes 2,522 tests across 97 files. The 14 focused Vanilla lifecycle rechecks and 23 Vue regression rechecks pass. Both unchanged immediate Vue unmount/remount variants pass 3/3 after the native listener repair. The corrected Foldkit event test also passes. The corrected Vue pane-distance test and the unchanged Foldkit connection cancellation test each pass 3/3.

Ledger counts below use pass / fail / intentional difference. Only 21 host entries change from fail to pass: 12 Vanilla, 4 Vue, and 5 Foldkit. The unchanged adapter derives `test.fail(false)` for those entries; remaining failures retain their existing classifications. The two Foldkit unmapped `selectNodesOnDrag` entries are removed.

| Phase | Host    | Before      | After       |
| ----- | ------- | ----------- | ----------- |
| 126   | Vanilla | 44 / 3 / 3  | 44 / 3 / 3  |
| 126   | Vue     | 48 / 0 / 2  | 48 / 0 / 2  |
| 126   | Foldkit | 47 / 0 / 3  | 47 / 0 / 3  |
| 127   | Vanilla | 41 / 24 / 2 | 53 / 12 / 2 |
| 127   | Vue     | 50 / 17 / 0 | 54 / 13 / 0 |
| 127   | Foldkit | 55 / 12 / 0 | 60 / 7 / 0  |

Phase 128 remains 107 not-ported cases in each host. No imported artifact changes. Existing trace references are remapped after source edits; the final trace checker covers 82 traces.

The first verifier invocation stopped at the quality gate before executing browser tests because the new results section needed formatting and the new unit setup needed one blank line. Those formatting issues were fixed without changing production behavior. The final required `scripts/with-flow-browser-lock.sh bun run verify` passed all 18 gates with the focused profile, every saved check, and every saved browser file. It passed package builds, typechecking, architecture, quality, packed consumers, documentation, the ledger, 2,522 unit tests across 97 files, and 3,038 citations across 82 traces. No unexpected or flaky browser outcome remains. The config appends Plan 135 to activeWork and retains all prior checks and files: 47 Vanilla, 42 Vue, and 57 Foldkit files. The default remains focused.

| Host | Saved browser cases | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 760 | 738 | 20 | 2 | 0 / 0 |
| Vue | 885 | 870 | 15 | 0 | 0 / 0 |
| Foldkit | 536 | 526 | 10 | 0 | 0 / 0 |

This is local focused-profile acceptance. The default remains focused; full-profile, CI, deployment, and native-device acceptance are separate. The final verifier completed in 1,149,288ms. The exact gate names, host outcomes, source hashes, and earlier failed attempts are retained in the results catalog. Existing trace changes remap shifted citations; one implicit context-menu line reference is expanded to a complete checked path and line.

Reproduce acceptance with the matching host config and one worker:

```sh
scripts/with-flow-browser-lock.sh bunx playwright test upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bun run verify
```

Raw native and diagnostic reports are `/tmp/plan135-baseline-{host}.json`, `/tmp/plan135-first-{host}.json`, `/tmp/plan135-control-probe.json`, `/tmp/plan135-vue-pane-origin.json`, `/tmp/plan135-vue-remount-diagnostic.json`, `/tmp/plan135-repeat-{host}.json`, and `/tmp/plan135-affected-{host}.json`. Earlier failed affected receipts are preserved with `pre-origin-failure`, `pre-native-capture-failure`, and `pre-expectation-failure` suffixes. Two failed starts executed zero tests because another worktree left an orphaned Vite listener on port 4176. Its launcher had parent PID 1 and no active Playwright owner. Only that verified orphan was stopped under the lock. No active test run was cancelled and no server reuse was enabled.

## Conformity and deviations

Conforming: the 13 requested contracts and the two deletion dependents each pass their unchanged assertions 3/3 in Vanilla, Vue, and Foldkit. The Phase 126 runner preserves all previously passing contracts. The comparison boundary is local Chromium mouse and CDP input through the pinned ports, controlled acknowledgements, rendered selection classes and bounds, node/edge counts, and viewport output. Expected failures elsewhere remain expected failures, not conformance claims.

Intentionally different internally: Flow retains framework-owned lifecycle code, controlled acceptance, typed Effect publication, and the existing host defaults. Vue and Foldkit default selectNodesOnDrag to false; Vanilla enables it unless false. Fixtures explicitly map the compared configuration. Vue uses an owned native capture listener to preserve the original press and avoid framework timestamp mutation. These implementation choices do not establish broader React lifecycle parity. Non-interactive edge labels, Vanilla shared-SVG edge stacking, Foldkit mounted-hidden toolbars, and instance-scoped marker IDs remain unchanged.

Unverified: live React execution, other engines, physical devices, native explicit-true Foldkit drag-selection parity beyond the synthetic option tests, Phase 128 component contracts, full-profile acceptance, CI, deployment, and collector-side OTLP delivery. No push or merge was performed.
