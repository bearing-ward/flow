# Plan 142: Component viewport and input

Starting point: `0507d7f547cb262916162404b24cf754508f17f9`. Consolidates the two Plan 139 follow-ups below. Those sections preserve the historical Plan 139 baseline; implementation and final outcomes follow afterward. Imported upstream evidence remains immutable.

## Viewport follow-up

### Goal

Match the literal source padding and initial clamp outcomes through public host APIs. Preserve each existing translation-extent, movement, and geometry contract until compatibility is decided.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-056 | uses fitViewOptions | vanilla | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-056 | uses fitViewOptions | vue | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-056 | uses fitViewOptions | foldkit | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | vanilla | The public mount rejects default zoom -1 with a positive-zoom schema error, so no viewport is rendered at the required clamped zoom 0.5. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | vue | The rendered viewport and useViewport() retain default zoom -1 rather than clamping it to 0.5. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | foldkit | The public Runtime mount with default zoom -1 terminates in Application Crash, leaving no rendered viewport at the required clamped zoom 0.5. |
| UP-128-067 | defaultViewport: invalid { x: 0, y: 0, zoom: 100 } | vue | useViewport() retains default zoom 100 rather than clamping it to the default maximum 2. |
| UP-128-067 | defaultViewport: invalid { x: 0, y: 0, zoom: 100 } | foldkit | The public store and rendered viewport retain default zoom 100 rather than clamping it to the default maximum 2. |
| UP-128-072 | uses nodeExtent | vanilla | The initial node transform has x=-50 rather than x=50 after applying the extent to its 150-pixel width; the y assertion is not reached. |
| UP-128-072 | uses nodeExtent | vue | The initial node remains at x=200 rather than being adopted at x=50 inside nodeExtent; the y assertion is not reached. |
| UP-128-072 | uses nodeExtent | foldkit | The initial node remains at x=200 rather than being adopted at x=50 inside nodeExtent; the y assertion is not reached. |

### Scope and acceptance

The source accepts padding 0.5, clamps default zoom -1 to 0.5 and 100 to 2, and adopts the initial node at x=50 and y=50 under nodeExtent. Separate schema rejection, public port availability, Runtime crash output, rendered transforms, and later wheel-driven clamping. A successful later operation does not establish initialization parity.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Input follow-up

### Goal

Match source native input outcomes after each host has processed the input and published its view. Preserve pointer identity, gesture thresholds, controlled acknowledgements, and public event ownership.

### Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-035 | handles onNodeClick | vanilla | A native stationary click reaches Node 1 with nodeDragThreshold=0, selects it, and leaves the registered onNodeClick count at 0 rather than 1. |
| UP-128-037 | handles onNodeMouse handlers | foldkit | Native contextmenu and dblclick both reach Node 1; onNodeContextMenu fires once, but onNodeDoubleClick stays at 0. Later hover assertions are not reached. |

### Scope and acceptance

Start at the actual rendered pointer target. Retain input target and hit receipts, public terminal events, accepted state, and the final rendered transform. Use a public query and the host render frame to distinguish a queued Foldkit preview from a persistent controlled-state difference. Confirm native double-click delivery before changing node event handling.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

### Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

## Execution

Prove each cause before changing behavior. Preserve documented contracts and unchanged upstream assertions. Add only to verification scope. Run all upstream runners in every host, repeating component runners three times. Run affected viewport, extents, events, lifecycle, and public-state suites. Serialize every browser command with `scripts/with-flow-browser-lock.sh` and one worker. Finish with the locked `bun run verify`. Commit on `plan/142-component-viewport`; do not push or merge.

## Proven causes and implementation

All six selected cases were reproduced in every host with their original ledger flags before behavioral repairs. Complete baseline and probe receipts, including native input targets, CSS geometry, viewport history, schema failures, and Foldkit's crash text, are retained in `research/catalogs/component-viewport-input-evidence.json`. Raw reports are `/tmp/plan142/baseline-{vanilla,vue,foldkit}.json` and `/tmp/plan142/probe-{vanilla,vue,foldkit}.json`. The probes deliberately retain the old flags: seven unexpected passes identify the repaired entries before their ledger status changes. Production and fixture paths are separate in `research/traces/component-viewport-input.md`.

| Case | Vanilla | Vue | Foldkit | Cause, decision, and change |
| --- | --- | --- | --- | --- |
| UP-128-035 | Repaired | Preserved pass | Preserved pass | Vanilla's activated zero-threshold drag suppressed a stationary click unless selectNodesOnDrag was false. Release now checks pointer travel independently of selection ownership. Pinned `packages/react/src/components/NodeWrapper/index.tsx:123` invokes onClick even when selection already ran. |
| UP-128-037 | Preserved pass | Preserved pass | Repaired | Native dblclick reached Node 1 but Foldkit's document observer had no listener or event variant for it. Add scoped observation, schema variant, callback presence and delivery, and disposal. Preserve contextmenu and hover assertions. |
| UP-128-056 | Intentional difference | Intentional difference | Intentional difference | All fixtures pass literal padding 0.5 to the public fitView API. This is not a port bug. `docs/guides/viewport-operations.md:17` documents a per-side pane fraction below 0.5. Keep the schema and upstream containment assertion unchanged. Node 1's right edge remains -350. |
| UP-128-066 | Repaired | Repaired | Repaired | No documented policy requires rejecting finite initial zoom outside limits. Pinned `packages/system/src/xypanzoom/XYPanZoom.ts:89` clamps before initialization. Decode finite input and limits, then clamp before positive-zoom runtime state. Vanilla no longer rejects -1; Vue no longer retains it; Foldkit no longer crashes. All render and report 0.5. |
| UP-128-067 | Preserved pass | Repaired | Repaired | The same initialization boundary reports 2 for initial zoom 100. Honor Vue's effective minZoom/maxZoom overrides. Normalize Foldkit's viewport-client cache as well as its initial model. |
| UP-128-072 | Intentional difference | Deferred failure | Deferred failure | Source adoption clamps using available dimensions; the component starts unmeasured and asserts (50,50). Vanilla uses a measured 150x44 rectangle and renders (-50,6). Oversized centering is explicitly documented at `research/traces/node-extents.md:44` and asserted at `packages/core/src/domain/flow-node-extent.schema.test.ts:47`. Preserve it. Vue and Foldkit render (200,200) because initial adoption is absent. Do not label that absence intentional or change their ledger to pass. Repair is deferred under the conflict rule because implementing the literal upstream result would choose a different measured/oversized policy. |

No existing test asserts the opposite initial-zoom or stationary-click contract. No existing expectation changes. The only shared component-helper change removes the special case that treated Application Crash as mount completion. Foldkit case 66 now follows normal measurement readiness and public node sampling. All literal upstream assertions, waits, gestures, and thresholds remain unchanged. No imported artifact changes.

The shared initialization decoder records decode/clamp success and failure with the existing host-mount span and structured attributes. Export/shutdown ownership remains with application composition. This does not establish collector delivery.

## Changed tests

- `packages/core/src/domain/flow-initial-viewport.test.ts:8` adds nine cases for zoom -1, zero, an in-range value, zoom 100, preserved x/y, malformed or non-finite inputs, and inverted limits. Its citation points to pinned XYPanZoom initialization.
- `packages/foldkit/src/viewport-client.test.ts:34` proves that disposal before any Runtime response returns the clamped initial viewport.
- `apps/shared-e2e/upstream-component/helpers.ts:32` requires actual readiness for all hosts, including Foldkit case 66. It no longer accepts Application Crash as completed initialization.
- The upstream cases at `apps/shared-e2e/upstream-component/events.ts:25`, `apps/shared-e2e/upstream-component/events.ts:49`, `apps/shared-e2e/upstream-component/view.ts:27`, `apps/shared-e2e/upstream-component/view.ts:142`, `apps/shared-e2e/upstream-component/view.ts:167`, and `apps/shared-e2e/upstream-component/view.ts:225` are unchanged. Their pinned-source citation comments remain in place.

There is no `node-extents.e2e.ts` file. The affected extent boundary is exercised through Vanilla advanced-gestures/flow-followups, Vue final-wiring, Foldkit model-styling, and the shared component assertion. Every existing verification check and browser file is retained; the saved scope already includes the requested affected suites. Only activeWork is appended.

## Results

All seven repaired host/case combinations pass the complete unchanged component assertion 3/3. Preserved passes, documented differences, and deferred failures keep the same outcome in every repetition. Each host runs all 76 browser component cases three times. The 31 shared Phase 128 utility cases also run in the unit suite; they are not additional per-host browser cases.

| Host | Component outcomes | Ordinary passes | Retained expected failures | Skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 228 | 174 | 54 | 0 | 0 / 0 |
| Vue | 228 | 192 | 36 | 0 | 0 / 0 |
| Foldkit | 228 | 195 | 33 | 0 | 0 / 0 |

The affected runs include the complete Phase 126 and 127 runners in every host. Vanilla also runs flow-followups, advanced-gestures, events-and-changes, interaction-lifecycle, public-state, node-input, and node-threshold. Vue also runs viewport-operations, final-wiring, events-and-changes, interaction-lifecycle, and public-state. Foldkit also runs viewport-controls, model-styling, events-and-changes, interaction-lifecycle, and public-state.

| Host | Affected outcomes | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 438 | 428 | 8 | 2 | 0 / 0 |
| Vue | 180 | 178 | 2 | 0 | 0 / 0 |
| Foldkit | 186 | 183 | 3 | 0 | 0 / 0 |

No Phase 126 or 127 classification regresses. Their unchanged ordinary passes and retained expected failures are 44/6 and 65/2 in Vanilla, 48/2 and 67/0 in Vue, and 47/3 and 67/0 in Foldkit. The two existing Vanilla skips require native pointer capture for concurrent cancellation and native touch capture for pinch cancellation.

Ledger counts below are pass / fail / intentional difference. Seven entries move from fail to pass only after their unchanged assertion passes. Three padding entries and Vanilla's oversized-node entry move from fail to documented intentional difference. Vue/Foldkit extent entries remain fail with the proven conflict recorded. No other status changes.

| Phase | Host    | Before      | After       |
| ----- | ------- | ----------- | ----------- |
| 126   | Vanilla | 44 / 3 / 3  | 44 / 3 / 3  |
| 126   | Vue     | 48 / 0 / 2  | 48 / 0 / 2  |
| 126   | Foldkit | 47 / 0 / 3  | 47 / 0 / 3  |
| 127   | Vanilla | 65 / 0 / 2  | 65 / 0 / 2  |
| 127   | Vue     | 67 / 0 / 0  | 67 / 0 / 0  |
| 127   | Foldkit | 67 / 0 / 0  | 67 / 0 / 0  |
| 128   | Vanilla | 87 / 16 / 4 | 89 / 12 / 6 |
| 128   | Vue     | 93 / 12 / 2 | 95 / 9 / 3  |
| 128   | Foldkit | 93 / 12 / 2 | 96 / 8 / 3  |

Raw complete repeated reports are `/tmp/plan142/repeat-vanilla.json`, `/tmp/plan142/repeat-vue-final.json`, and `/tmp/plan142/repeat-foldkit.json`. The earlier complete Vue run also passed and is retained as `/tmp/plan142/repeat-vue.json`; the final run rebuilds the effective-limit adjustment. Affected reports are `/tmp/plan142/affected-{vanilla,vue,foldkit}.json`. All report hashes, per-case outcomes, worker counts, repetitions, ledger counts, and tested TypeScript source hashes are retained in `research/catalogs/component-viewport-input-evidence.json`.

The independent pre-verifier checks pass quality, architecture, package builds, typechecking, documentation, API members, catalogs, examples, the ledger, 2,566 unit tests across 104 files, and 3,255 citations across 86 traces. Shifted source citations are remapped in 65 existing traces. The saved focused scope retains all checks and all 51 Vanilla, 49 Vue, and 62 Foldkit browser files.

The final required `scripts/with-flow-browser-lock.sh bun run verify` passes all 18 gates with the focused profile, every saved check, and all 162 saved browser files. It passes 2566 unit tests across 104 files. No unexpected or flaky browser result remains.

| Host | Saved browser cases | Ordinary passes | Retained expected failures | Existing skips | Unexpected / flaky |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 840 | 812 | 26 | 2 | 0 / 0 |
| Vue | 971 | 957 | 14 | 0 | 0 / 0 |
| Foldkit | 617 | 603 | 14 | 0 | 0 / 0 |

The verifier completes in 1,308,352ms. Its raw receipt is `/tmp/plan142/verify.log`, SHA-256 `2e3fcb8d166181a86cdb7fe2f4af3f4cfaaa1f950999b166d502183511f5f636`. Exact gate names, elapsed times, and browser outcomes are retained in the evidence catalog. Playwright's final passed summary includes expected failures; the table separates actual ordinary passes from retained expected failures using the individual result markers. Both known Vanilla flakes pass without a rerun. Only result metadata and receipt prose change after this verifier; all tested TypeScript hashes and the verification-config/ledger input hashes match.

Reproduce the complete component and saved focused acceptance with:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/vue/playwright.config.ts upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/foldkit/playwright.config.ts upstream-component.e2e.ts --repeat-each=3 --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

## Conformity and deviations

Conforming: Vanilla UP-128-035, Foldkit UP-128-037, all hosts' UP-128-066, and Vue/Foldkit UP-128-067 pass the unchanged assertions 3/3. All other targeted preserved passes remain passing 3/3. The negative-zoom case now requires normal mount readiness and verifies both rendered scale and the public viewport read. Foldkit no longer reaches Application Crash. Prior Phase 126 and 127 outcomes remain unchanged through complete runners in all hosts. The boundary is local Chromium through public host fixtures, accepted state, native input, and rendered DOM. The final saved focused profile also passes all 18 gates; this remains separate from full-profile acceptance.

Intentionally different: all hosts retain the documented per-side pane-fraction padding range below 0.5. Vanilla retains measured adoption and oversized-node centering. No upstream assertion is changed to accommodate either policy. Non-interactive edge labels, active-elevation Vanilla shared-SVG stacking, Foldkit hidden toolbars, marker IDs, viewport-culling overscan, and no attribution retain their documented behavior.

Deferred and unverified: Vue/Foldkit initial nodeExtent adoption remains a failure at the documented policy conflict; later y assertions are not reached. Live React execution at the 500ms extent boundary, transition-frame parity, other browser engines, physical devices, CI, full-profile/release acceptance, and collector-side OTLP delivery remain unverified. The focused profile does not establish full-suite acceptance. No push or merge is performed.
