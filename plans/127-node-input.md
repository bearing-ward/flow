# Plan 127: Node selection and deletion (upstream follow-up)

## Problem and scope

Prove threshold-zero click selection and deletion, selected-node markup, persistent multi-selection bounds, and middle-button pan from those bounds. Retain the React-guarded case as an executed host test.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 imported these tests without changing product behavior. This follow-up repairs the listed node-input failures. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Baseline failing hosts |
| --- | --- | --- |
| UP-126-021 | selecting a node by click | vanilla, foldkit |
| UP-126-022 | selecting multiple nodes with shift drag | vanilla, vue, foldkit |
| UP-126-023 | panning from a multi-selection rectangle with the middle mouse button | vanilla, vue, foldkit |
| UP-126-028 | deleting a node and its edges | vanilla, foldkit |

## Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

## Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

## Results

Implementation stopped at the required compatibility conflict. The work remains uncommitted on `plan/127-node-input`, based on `9789ec95874948fe617d479047bd40a7d01f3abb`. All four target cases pass unchanged in each host. Their titles, inputs, assertions, thresholds, and the shared selector adapter are unchanged. The ten formerly failing host/case outcomes now have `pass` status; Vue's two existing passes remain passes. UP-126-023 executes in every host, with its React guard retained only as ledger metadata.

The root causes and changes are:

- **UP-126-021:** Vanilla activated a zero-threshold drag on pointerdown, skipped its pending-release selection branch, and suppressed the trailing click. The release now recognizes stationary client-space travel at `apps/vanilla/src/mount-flow.ts:9214` and selects at `apps/vanilla/src/mount-flow.ts:9297` while completing the existing drag lifecycle. Foldkit already selected internally, as the baseline browser probe's selected stacking and retained focus showed. Its wrapper omitted the selected class, now rendered at `packages/foldkit/src/graph.ts:7324`. Vue's existing pre-press-document click selection at `packages/vue/src/flow-canvas.ts:2778` already passed.
- **UP-126-022:** All hosts discarded their temporary marquee without a persistent selected-node bounds renderer. Vanilla retains the presentation at `apps/vanilla/src/mount-flow.ts:9710` and renders it at `apps/vanilla/src/mount-flow.ts:3901`. Vue retains it at `packages/vue/src/flow-canvas.ts:7792` and projects bounds at `packages/vue/src/flow-canvas.ts:10400`. Foldkit retains it at `packages/foldkit/src/graph.ts:4243` and derives bounds at `packages/foldkit/src/graph.ts:7559`; its missing selected class was an additional earlier assertion failure. All hosts reuse core's measured absolute `graphBounds` contract.
- **UP-126-023:** The missing bounds prevented the input gesture in every baseline. The default host pointer filters also admitted only primary-button panning. Vanilla's button policy is repaired at `apps/vanilla/src/mount-flow.ts:1098`, Vue's at `packages/vue/src/flow-canvas.ts:8285`, and Foldkit's native press routing at `packages/foldkit/src/graph.ts:6615`. The retained overlay moves with the selected graph geometry and leaves pointer input to existing host pan admission.
- **UP-126-028:** Vanilla deletion received no selected node because of UP-126-021. The same stationary-release repair restores its existing deletion path. Foldkit's upstream fixture omitted the existing keyboard-delete approval client; `apps/foldkit/src/upstream-fixture.ts:99` now connects it and disposes it with the host. The runtime already emitted the request at `packages/foldkit/src/application.ts:824`. Vue's existing click selection and deletion paths already passed.

The complete production and test paths, upstream selection timing, geometry, publication ownership, DOM output, and observability boundaries are recorded in `research/traces/node-input.md`. Existing trace citations were remapped after source edits. Imported evidence remains unchanged.

### Browser evidence

Before the repair, temporarily setting the four entries to `pass` produced **Vanilla 4 failed**, **Vue 2 failed / 2 passed**, and **Foldkit 4 failed**. Vanilla click selection lacked `selected`; deletion left the node attached. Its selection cases reached missing persistent bounds. Vue reached missing persistent bounds. Foldkit click and Shift selection lacked the class, middle pan reached missing bounds, and deletion left the node attached. The separate Foldkit probe retained focus and selected stacking, and deletion still failed after an explicit focus, which refuted a shared selection-state cause.

The unchanged complete upstream runners each pass **50 tests**, with no unexpected failures, unexpected passes, or skips. Playwright includes expected failures in that count:

| Host    | Ordinary passes | Expected failures | Total |
| ------- | --------------: | ----------------: | ----: |
| Vanilla |              36 |                14 |    50 |
| Vue     |              39 |                11 |    50 |
| Foldkit |              34 |                16 |    50 |

The expected failures include one documented intentional difference per host. No scoped case remains failing. Unrelated ledger failures remain unchanged.

| Host    | Before pass / intentional / fail | After pass / intentional / fail |
| ------- | -------------------------------- | ------------------------------- |
| Vanilla | 32 / 1 / 17                      | 36 / 1 / 13                     |
| Vue     | 37 / 1 / 12                      | 39 / 1 / 10                     |
| Foldkit | 30 / 1 / 19                      | 34 / 1 / 15                     |

Phases 127 and 128 retain all 174 not-ported cases per host. Plan numbering does not change ledger phases.

Focused regressions were added in each host's `node-input.e2e.ts` for measured bounds, an exact 100-pixel middle pan, preserved selection and dimensions, and dismissal. Vanilla's native zero-threshold down/up test passes, including selected markup, focus, and unchanged node geometry. The new shared bounds regression fails in Vanilla because it assumes exactly three selected nodes, while the gesture selects four. The unchanged upstream case asserts that the first three are selected without asserting an exact count. The added regression therefore needs correction before it can establish bounds geometry. Foldkit's added explicit-selection deletion test isolates approval-client wiring from click selection, but was not executed before the stop.

### Verification

The complete upstream runners passed as recorded above. The selected Vanilla affected suites ran **212 tests: 203 passed, 9 failed, 0 skipped**. Eight failures are existing Flow tests, which remain unchanged:

- `apps/vanilla/e2e/node-threshold.e2e.ts:105` expects only the two position changes in the mounted-Stop replacement proof. The repair adds node selection.
- Five cases at `apps/vanilla/tests/ownership/gesture-oracles.ts:225` cover node threshold 0, connection thresholds 5 and 0, and reconnection thresholds 5 and 0. They require the previous selection and publication stream to survive the old stationary release. The repair selects `a`, clears the selected edge and `b`, and prevents the reconnection successor from acquiring capture.
- The real-browser stationary down/up test at `apps/vanilla/e2e/node-threshold.e2e.ts:147` expects position publication without selection publication. The repair inserts `node-selection` into that native receipt.
- `apps/vanilla/tests/ownership/gesture-oracles.ts:452` explicitly expects `[false, false, false]` selection after the first threshold-zero release and suppressed click. The repair instead returns `[false, true, false]`.

The ninth failure is the new bounds regression's incorrect exact-count assumption described above. No existing test was changed. Per the task's explicit stop rule, implementation stopped rather than changing those opposing contracts. The queued Vue and Foldkit affected suites were cancelled before execution. `bun run verify` was not run after discovering the conflict, and no commit was created.

Before that stop, lint, package builds, typechecking, **97 unit files / 2,512 unit tests**, the upstream ledger check, and **2,651 citations across 75 research traces** passed. These are partial checks, not focused-profile acceptance. Full-profile acceptance was not attempted.

Commands already executed, each prefixed with `scripts/with-flow-browser-lock.sh`:

```sh
bun run playwright test apps/vanilla/e2e/upstream-playwright.e2e.ts --workers=1
bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1
bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1
bun run playwright test apps/vanilla/e2e/node-input.e2e.ts apps/vanilla/e2e/node-threshold.e2e.ts apps/vanilla/e2e/gesture-options.e2e.ts apps/vanilla/e2e/input-configuration.e2e.ts --workers=1
```

Local receipts are `/tmp/plan127-red-{vanilla,vue,foldkit}.log`, `/tmp/plan127-upstream-{vanilla,vue,foldkit}.log`, and `/tmp/plan127-affected-vanilla.log`. The baseline Foldkit diagnosis is `/tmp/plan127-probe-foldkit.log`. No known-flake rerun applies: neither named flaky file was part of the failed invocation.

All browser commands use `scripts/with-flow-browser-lock.sh`, which sets `OTEL_SDK_DISABLED=true` and releases only its owner token. Each Playwright command uses `--workers=1`; the saved verifier supplies that flag to every host invocation. The scope adds only the three new `node-input.e2e.ts` entries to `verification.config.json`. Every existing check, browser file, and configuration value is retained.

## Conformity and deviations

Conforming within the unchanged ported contracts: selected markup after a threshold-zero click, selected-node bounds after Shift selection, middle-button panning from those bounds, and `d` deletion of a selected node and its incident edges. All four cases pass in Vanilla, Vue, and Foldkit. The additional native regressions remain partially verified as detailed above.

The proposed architecture uses Flow's core graph bounds and existing host pan admission with a non-intercepting overlay. React gives its persistent rectangle a separate drag handler. Vanilla's proposed stationary-release selection matches the upstream click outcome but conflicts with existing native and synthetic Flow lifecycle contracts. That conflict is unresolved and blocks acceptance. No new ledger outcome is classified as an intentional difference to bypass it. Precise React pointerdown selection timing and direct primary-button rectangle dragging remain outside this test boundary.

Live React comparison, other browser engines, full-profile integration/release acceptance, and Cypress phases 127 and 128 remain unverified. No collector-side OpenTelemetry delivery is claimed.

## Round 2: option-aware activation

Round 2 starts from the round-1 WIP commit `15bb340` on `plan/127-node-input-r2`. The round-1 results above are historical. This section records the final implementation and supersedes the compatibility-stop conclusion.

### Upstream order and the eight existing conflicts

The pinned root is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. `packages/system/src/xydrag/XYDrag.ts:316` calls `startDrag` immediately for threshold zero. `packages/system/src/xydrag/XYDrag.ts:282` gates `onNodeMouseDown` on `isSelectable && selectNodesOnDrag`, before `onDragStart` at line 297 and `onNodeDragStart` at line 298. `packages/react/src/components/Nodes/utils.ts:38` adds an unselected node. Thus the selection publication precedes the drag-start callbacks. `packages/react/src/components/NodeWrapper/index.tsx:111` instead admits click selection when drag selection is disabled. `packages/system/src/xydrag/XYDrag.ts:307` supplies `nodeClickDistance` to the drag click-suppression filter.

The eight conflicts all disable drag selection in their harnesses. Changing their expected selection would violate round-2 constraint 4. They remain byte-for-byte unchanged, including every capture, release, lifecycle, cancellation, geometry, held-count, and suppression-timer assertion:

| Existing test | Configuration evidence | Decision and upstream citation |
| --- | --- | --- |
| `apps/vanilla/e2e/node-threshold.e2e.ts:87`, mounted Stop replacement | `apps/vanilla/e2e/node-reentry-harness.ts:14` sets false for the node actor | Keep only the two position changes. XYDrag.ts:282 gates selection on the option. |
| `apps/vanilla/tests/ownership/gesture.browser.test.ts:1`, pointerup to node 0 | `apps/vanilla/tests/ownership/gesture-fixture.ts:19` | Keep selection and complete capture/publication history. XYDrag.ts:282. |
| Same generated test, pointerup to connection 5 | Same false option | Keep selection and connection capture. XYDrag.ts:282. |
| Same generated test, pointerup to connection 0 | Same false option | Keep selection and connection capture. XYDrag.ts:282. |
| Same generated test, pointerup to reconnection 5 | Same false option | Keep selected edge and reconnection capture. XYDrag.ts:282. |
| Same generated test, pointerup to reconnection 0 | Same false option | Keep selected edge and reconnection capture. XYDrag.ts:282. |
| `apps/vanilla/e2e/node-threshold.e2e.ts:147`, native capture release order | `apps/vanilla/tests/ownership/gesture-fixture.ts:303` defaults its new optional argument to false | Keep native set, start, up, release, position, stop, loss with no selection insertion. XYDrag.ts:282. |
| `apps/vanilla/tests/ownership/gesture-oracles.ts:444`, old reset timer | `apps/vanilla/tests/ownership/gesture-fixture.ts:601` | Keep first selection flags `[false, false, false]`, final `[false, true, false]`, and both click propagation sequences. XYDrag.ts:282 and :307. |

The eight disabled-option expectations above are unchanged. Two additional default-option projection cases need selection-only updates, listed below. Vue's physical-reentry coverage at `apps/vue/e2e/node-threshold.e2e.ts:152` configures drag selection by disposal mode at `apps/vue/e2e/node-reentry-harness.ts:34`; the terminal reentry fixture explicitly disables it at `apps/vue/e2e/node-reentry-harness.ts:155`. Foldkit's native release-publication cases at `apps/foldkit/e2e/node-threshold.e2e.ts:136` use the unchanged release fixture and a real move. The shared native threshold contract at `apps/shared-e2e/node-threshold-contract.ts:149` observes lifecycle and position output in all hosts. None requires an expectation update. Complete affected-suite runs below check those boundaries.

### Changed existing tests

Both generated cases are at `apps/vanilla/e2e/renderer-ownership.e2e.ts:333`:

- `projection cancel-control`: the final document previously kept B and its edge selected. It now selects A and clears B, C, and the edge. The state stream gains the initial selection notification before the original viewport notification; the change stream gains `node-selection` before the existing viewport change.
- `projection cancel-restore`: the restored and final documents receive those same selection flags. The state stream previously had no notification; it now has the selection notification. The change stream gains `node-selection` before the viewport change. The cancellation and restoration callbacks stay in the same order with the same geometry and viewport values.

Their shared one-line comment cites pinned `packages/system/src/xydrag/XYDrag.ts:282`. Selection precedes drag start at :298, and the harness dispatches its viewport wheel only after the press and move. The node/edge flags follow `packages/react/src/store/index.ts:306` and :307, which select the requested nodes and clear the edges. The Flow-specific state/publication shapes retain their existing owner. No capture, release, lifecycle, cancellation, geometry, suppression-timer, or held-count assertion changes.

The initial targeted run was **211 passed / 2 failed / 0 skipped / 0 expected-fail**. All eight round-1 conflicts and all three new Vanilla node-input checks passed. The two failures were these enabled-option projection cases, whose unchanged cancellation/capture/geometry receipts matched; the assertion diff contained selection flags and the resulting state/change publications.

The existing keyboard-status test at `apps/vanilla/e2e/viewport-operations.e2e.ts:305` also gains a setup-only visibility wait before its original `source.focus()` call. All assertions remain unchanged. Its one-line comment cites pinned `packages/react/src/components/NodeWrapper/index.tsx:207`, which hides nodes until dimensions exist. Flow's own initial hidden style is `apps/vanilla/src/style.css:441`; its resize observer exposes measured nodes at `apps/vanilla/src/mount-flow.ts:4715`. Native focus does not wait for visibility. The failed diagnostic captured Enter targeting the body without a preceding handle focus event. Waiting for the actual visible handle supplies that missing input precondition, with no sleep or relaxed assertion. The exact hidden-at-focus timing was not directly captured and remains an inference from that trace and the source.

`apps/vanilla/e2e/graph-renderers.e2e.ts:949` gains the same initial-visibility setup barrier before its existing `elementFromPoint` hit test and focus-retention checks. The old setup read bounding boxes and hit-tested immediately after mounting; the new setup waits for the topmost child to be visible first. Its one-line comment cites pinned `packages/react/src/components/NodeWrapper/index.tsx:207`. Every graph order, hit target, retained element, controlled update, focus, lifecycle, and geometry assertion remains unchanged.

The Foldkit handle-refresh fixture at `apps/foldkit/e2e/handle-refresh-fixture.ts:175` now waits for the declared handles of visible nodes to exist in the DOM after a replacement snapshot acknowledgement. Acknowledgement previously proved model acceptance while the framework patch could still be pending. An Effect-backed MutationObserver at `apps/foldkit/e2e/handle-refresh-fixture.ts:96` supplies an actual DOM handoff without counting frames or sleeping; it disconnects on completion or interruption. Hidden nodes are intentionally excluded from that DOM wait. The comment cites pinned `packages/react/src/hooks/useUpdateNodeInternals.ts:67`, which measures DOM after an update. Shared assertions at `apps/shared-e2e/handle-refresh-contract.ts:288`, all four Foldkit variants at `apps/foldkit/e2e/measured-geometry.e2e.ts:349`, the equivalent-layout case at :394, and both hidden-member cases at :401 are unchanged.

### Changed round-1 tests

- `apps/vanilla/e2e/node-input.e2e.ts:8`: selection was asserted only after release; it is now also asserted while the primary button is held. The added one-line comment cites `packages/system/src/xydrag/XYDrag.ts:282`.
- `apps/shared-e2e/node-input-contract.ts:8`: the selected-node count, measured-box count, and retained count after pan change from three to four. The fixture includes an additional intersecting node at this marquee size. The unchanged upstream contract at `apps/shared-e2e/upstream/nodes.ts:23` asserts the first three selected nodes without asserting an exact count. The one-line comment cites pinned `tests/playwright/e2e/nodes.spec.ts:20`. This corrects a new Flow regression; it changes no upstream assertion.

The new native receipt at `apps/vanilla/e2e/node-input.e2e.ts:30` asserts `native:set`, `change(node-selection)`, then `nodeStart`, each with capture held. Its comment cites XYDrag.ts:282 and :298. `mountNativeCaptureProof(true)` opts into selection; the existing receipt still uses the false default.

### Implementation

Vanilla selects during zero-threshold activation, before notifying the drag-start callback, only when `selectNodesOnDrag` is enabled and the node is selectable. It uses the existing selection publication and telemetry owner. It checks that the drag still owns the interaction after selection listeners return. The round-1 stationary activated-release selection is removed. This preserves the disabled-option and real-drag click-suppression contracts instead of rewriting their receipts.

Round-1 bounds rendering, selected markup, and Foldkit fixture deletion wiring remain. The middle-button exception over graph elements is narrowed to button 1: the initial broad exception also admitted right-button node presses, letting Vanilla canvas capture retarget their context menus to the pane. The unchanged `[2]` and `[0, 2]` context-menu cases at `apps/vanilla/e2e/context-menu-event.e2e.ts:103` reproduced that regression. The existing primary/right-button graph-target guards remain in place, while middle-button presses can reach pan admission. Verification scope only grows. The saved focused scope includes all prior files, all host test files mentioning selection or pan, and the requested lifecycle, threshold, movement, selection-and-culling, event, and renderer-props suites where present.

### Results

The fourth `bun run verify` passed the **focused** profile with all saved checks and the complete saved browser scope. The baseline and all ten extra checks passed: quality, architecture, package builds, workspace typechecking, unit tests, API inventory, catalog coverage, packed consumers, documentation, example registry, application builds, trace citations, and the upstream ledger. Unit results are **97 files / 2,512 tests passed**. Final documentation-only trace validation passed **2656 citations across 75 traces**.

| Host    | Files | Ordinary passed | Skipped | Failed | Expected-fail | Total |
| ------- | ----: | --------------: | ------: | -----: | ------------: | ----: |
| Vanilla |    44 |             634 |       2 |      0 |            14 |   650 |
| Vue     |    35 |             791 |       0 |      0 |            11 |   802 |
| Foldkit |    47 |             418 |       0 |      0 |            16 |   434 |

The two Vanilla skips are unchanged native multi-pointer proofs in the two throwing placeholders removed by Plan 179. No unexpected failure or unexpected pass remains. This is focused-profile acceptance of the saved 126-file browser scope, not full-profile integration or release acceptance.

The three independent unchanged upstream runners also passed with no skips or unexpected results:

| Host    | Ordinary passed | Skipped | Failed | Expected-fail | Total |
| ------- | --------------: | ------: | -----: | ------------: | ----: |
| Vanilla |              36 |       0 |      0 |            14 |    50 |
| Vue     |              39 |       0 |      0 |            11 |    50 |
| Foldkit |              34 |       0 |      0 |            16 |    50 |

All four target cases pass in all hosts, including UP-126-023 with its React guard retained only as metadata. Ledger pass / intentional difference / fail counts remain **Vanilla 36 / 1 / 13**, **Vue 39 / 1 / 10**, and **Foldkit 34 / 1 / 15**. The 174 unported cases per host are unchanged.

The complete affected host scopes passed before the final verifier expanded them to all saved files:

| Host    | Files | Ordinary passed | Skipped | Failed | Expected-fail | Total |
| ------- | ----: | --------------: | ------: | -----: | ------------: | ----: |
| Vanilla |    32 |             591 |       2 |      0 |            14 |   607 |
| Vue     |    28 |             705 |       0 |      0 |            11 |   716 |
| Foldkit |    32 |             300 |       0 |      0 |            16 |   316 |

The initial affected Vanilla run had 589 ordinary passes, 2 skips, 2 failures, and 14 expected failures. Both failures were unchanged right-button context-menu cases, repaired by restricting graph-target pan admission to the middle button. The initial Vue run had 703 ordinary passes, 2 failures, and 11 expected failures. Both failures reported destroyed execution contexts; one coincided with a package build run in parallel with the browser. Complete reruns passed after builds were kept outside active browser sessions. No assertion was relaxed. Foldkit's first complete affected run passed.

#### Verifier retries and fixture handoffs

The first three verifier attempts passed every non-browser check but exposed additional fixture readiness gaps. Counts below are ordinary passed / skipped / failed / expected-fail.

| Attempt | Vanilla | Vue | Foldkit | Stopping case |
| --- | --- | --- | --- | --- |
| 1 | 633 / 2 / 1 / 14 | Not reached | Not reached | `viewport-operations.e2e.ts:305`, empty connection status after Enter |
| 2 | 633 / 2 / 1 / 14 | Not reached | Not reached | `graph-renderers.e2e.ts:949`, initial hit test before visible nodes |
| 3 | 634 / 2 / 0 / 14 | 791 / 0 / 0 / 11 | 417 / 0 / 1 / 16 | `measured-geometry.e2e.ts:347`, new handle absent after model acknowledgement |

The first status reproduction produced 4 passes and 1 failure. A diagnostic run using the original focus action produced 9 passes and 1 failure, capturing Enter on the body without a prior handle focus event. A deeper focus probe passed 30 times and did not capture the exact hidden-at-focus instant. The initial-visibility diagnosis is therefore an inference from that trace and the initial hidden-node source. All temporary instrumentation was removed. The visible-handle setup barrier then passed 10 repetitions and the complete flow-followups suite passed all 10 tests, preserving every assertion.

The visible-child setup barrier passed 10 repetitions and the complete graph-renderers suite passed all 13 tests, preserving every graph order, retained-element, geometry, and focus assertion.

The Foldkit replacement bridge now waits for actual visible-node handle declarations after snapshot acknowledgement. The first draft incorrectly waited for hidden nodes and timed out in the two hidden-member cases. Restricting this DOM handoff to visible nodes preserves their original internal-geometry fallback checks. The corrected bridge passed 20 repetitions across all four dynamic variants and the complete measured-geometry suite passed all 14 tests. No production keyboard, connection, or internals-refresh behavior changed for these fixture repairs.

The final fourth verifier passed every saved scope with these readiness barriers. Neither named known-flake case required an isolated rerun.

#### Commands and receipts

Every browser command ran through `scripts/with-flow-browser-lock.sh` with `--workers=1`; the verifier supplies that worker flag itself. Later grouped checks used a temporary `caffeinate -i` process inside the lock to prevent idle system sleep. No foreign lock was removed. The saved focused scope in `verification.config.json` is the rerunnable superset of every affected host suite.

```sh
scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

Final verifier log: `/tmp/plan127-r2-verify-attempt4.log`. Earlier verifier logs are `/tmp/plan127-r2-verify.log`, `/tmp/plan127-r2-verify-attempt2.log`, and `/tmp/plan127-r2-verify-attempt3.log`.

Independent runner receipts are `/tmp/plan127-r2-upstream-{vanilla,vue,foldkit}.{log,json}`. Affected receipts are `/tmp/plan127-r2-affected-{vanilla,vue,foldkit}.{log,json}` and `/tmp/plan127-r2-affected-{vanilla,vue}-rerun.{log,json}`. Exact affected file lists are `/tmp/plan127-r2-affected-<host>-files.json`.

Targeted readiness receipts are `/tmp/plan127-r2-status-fixed-repeat.log`, `/tmp/plan127-r2-flow-followups-complete.log`, `/tmp/plan127-r2-stacking-fixed-repeat.log`, `/tmp/plan127-r2-graph-renderers-complete.log`, `/tmp/plan127-r2-handle-refresh-fixed-repeat.log`, and `/tmp/plan127-r2-measured-geometry-complete.log`.

### Conformity and deviations

Conforming source order: Vanilla's enabled zero-threshold selection precedes its drag-start callback, as XYDrag.ts:282 and :298 require. Disabled drag selection publishes no node selection on activation. The unchanged upstream contracts remain the acceptance boundary for click selection, measured persistent bounds, middle-button pan, and `d` deletion in all hosts.

Intentionally different architecture: selection bounds reuse Flow core geometry and existing host pan admission. React gives its rectangle a separate drag handler. The middle-button contract and measured-bounds regression test that choice.

Unverified beyond this scope: Vue and Foldkit's precise pointerdown timing, positive-threshold select-on-drag-start timing, upstream deselection of other nodes with drag selection disabled, direct primary-button bounds dragging, live React comparison, other engines, full-profile integration acceptance, and the unported Cypress phases. No collector delivery claim is made.
