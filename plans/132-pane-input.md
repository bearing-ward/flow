# Plan 132: Pane input and zoom limits (upstream follow-up)

## Problem and scope

Address wheel limits, touch pan and selection, primary-button selection with button arrays, and the Control pan override. Preserve passing immediate pan and node autopan cases. Add missing Foldkit public options without silently substituting booleans.

These are observed failures from the pinned upstream port. Plan 126 recorded them without changing product behavior; Plan 132 implements the bounded follow-up. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-039 | minZoom | foldkit |
| UP-126-040 | maxZoom | foldkit |
| UP-126-045 | touch drag pans when primary mouse drag is reserved for selection | vanilla, vue, foldkit |
| UP-126-046 | selection key keeps touch drag in selection mode | vanilla, vue, foldkit |
| UP-126-047 | primary mouse drag still creates a selection marquee | vanilla |
| UP-126-048 | Control and primary-button drag pans the pane | vanilla, vue, foldkit |

## Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

## Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

## Instrumented baseline and root causes

The untouched upstream assertions were run with the 12 scoped failing host entries temporarily set to `pass`. The scoped six-case baseline failed 4/6 in Vanilla, 3/6 in Vue, and 5/6 in Foldkit. The other six host/case combinations passed. Temporary capture listeners and reducer logging recorded pointer identity, key events, target markup, accepted gesture options, selection DOM, and viewport transforms. All diagnostic code was removed before acceptance runs.

The disputed Vue activation test starts on the empty `.flow-vue-canvas` at canvas +20,+20. `document.elementFromPoint` found no `.test-no-pan`, `[data-flow-no-pan]`, or `.flow-vue-nopan` ancestor. Its no-pan marker is created later. The original test passed with `panOnDrag: true` and no Control, demonstrating the undocumented key-required behavior rather than an excluded target.

The hybrid-touch probe recorded `keydown Shift` with `shiftKey: true`, then CDP `pointerdown` with `pointerType: touch`, `button: 0`, and `shiftKey: false` in every host. The reference uses observed key state, so no upstream action or assertion needs changing. Foldkit's reducer observed `selectionKeyPressed: true`; its FIFO did not lose the key during controlled acknowledgement.

| Case | Vanilla | Vue | Foldkit | Root cause and change |
| --- | --- | --- | --- | --- |
| UP-126-039 | Existing pass preserved | Existing pass preserved | Fail, observed scale 0.1 | The fixture already forwards 0.25/4 at `apps/foldkit/src/upstream-fixture.ts:80`. `packages/foldkit/src/graph.ts:2342` hard-coded the wheel clamp. Forward the application limits into the graph model and use them for anchored wheel and double-click zoom. |
| UP-126-040 | Existing pass preserved | Existing pass preserved | Fail, observed scale 2 | Same wheel helper and forwarding path as UP-126-039; configured maximum is 4. |
| UP-126-045 | Fail, no pan | Fail, touch created a marquee | Fail, array became false and touch selected | Vanilla's array gate rejected touch button 0; Vue admitted implicit mouse selection for touch; Foldkit discarded the array at fixture line 95 and dropped pointer type in its native view. Mouse arrays now restrict mouse input, and implicit selection yields to enabled touch pan. See `apps/vanilla/src/mount-flow.ts:1113`, `packages/vue/src/flow-canvas.ts:8290`, `packages/foldkit/src/graph.ts:3218`, and `apps/foldkit/src/upstream-fixture.ts:95`. |
| UP-126-046 | Fail at pane selection-class assertion | Fail at pane selection-class assertion | Fail at pane selection-class assertion | Render the selection state class in every host. Default Vanilla modifiers use its existing scoped key/blur handlers at `apps/vanilla/src/mount-flow.ts:3033`; Vue uses observed keys at `packages/vue/src/flow-canvas.ts:2606`; Foldkit retains queued keys and selects at `packages/foldkit/src/graph.ts:3231`. This also preserves Shift selection when CDP touch modifier flags are false. |
| UP-126-047 | Fail, no marquee | Existing pass preserved | Existing pass preserved | Vanilla required the selection modifier even for explicit `selectionOnDrag: true` with a button array. Its selection policy at `apps/vanilla/src/mount-flow.ts:1122` now admits primary mouse marquee selection under that configuration. |
| UP-126-048 | Fail, 0px instead of 100px | Fail, 0px instead of 100px | Fail, 0px instead of 100px | Vanilla and Vue combined button admission and activation with AND; Foldkit had no key option and discarded the array. Use the activation key as an OR override at `apps/vanilla/src/mount-flow.ts:1113`, `packages/vue/src/flow-canvas.ts:8283`, and `packages/foldkit/src/graph.ts:3218`. |

The corresponding baseline locations at commit `778da3d` are `packages/foldkit/src/graph.ts:2338` for the fixed zoom clamp, `apps/foldkit/src/upstream-fixture.ts:54` and `:95` for the dropped key/array, `packages/vue/src/flow-canvas.ts:8277` for touch-as-primary selection and `:8286` for the required key, and `apps/vanilla/src/mount-flow.ts:1109`, `:9862`, and `:9910` for modifier-required selection and conjunctive pan admission. The table cites the repaired boundaries in this branch.

The complete production, geometry, DOM, fixture, and acknowledgement paths are in [the research trace](../research/traces/pane-input-zoom-limits.md). Document acknowledgements retain their existing ownership and ordering; upstream fixtures use uncontrolled viewports. No scheduler or acknowledgement workaround was added.

## Public options and fixtures

Foldkit `GraphInteractionOptions.panOnDrag` now derives from `ModelSchema.fields.panOnDrag` at `packages/foldkit/src/graph.ts:509`: Boolean or an array of integers from 0 through 4. The decoded type is `boolean | readonly number[]`; the default remains `false`. The same schema feeds `CanvasOptionsSchema`, so runtime patches also accept arrays.

Foldkit `GraphInteractionOptions.panActivationKeyCode` inherits the existing `KeyCodeSchema` from `ClosingOptionsSchema` at `packages/foldkit/src/closing-options.ts:26`: `string | readonly string[] | null`, default `null`. It shares the other key options' observation, queued messages, blur reset, and disposal. `keyboardActivation` retains its separate connection/keyboard meaning.

All three fixtures preserve supplied `panOnDrag` values. Foldkit now forwards arrays and the activation key exactly; unspecified values receive upstream defaults. Vanilla maps the generic Control key to its existing `panActivationModifier: 'control'`, and Vue forwards its existing `panActivationKeyCode`. The three obsolete `unmappedProps` entries and Plan 126's Unmapped generic props note are removed after proof. The host API reference, its generated schema-reference link, and the correspondence table document the options.

## Existing test changes

The pinned authority for both changes is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/container/FlowRenderer/index.tsx:81`, which computes `panActivationKeyPressed || _panOnDrag`. The selection/touch rules are at the same renderer's lines 83 and 99, `packages/react/src/container/Pane/index.tsx:143`, and `packages/system/src/xypanzoom/filter.ts:97` and 108 under the pinned artifact root.

| Existing test | Old configuration and assertion | New configuration and retained assertions | Added coverage |
| --- | --- | --- | --- |
| `apps/vue/e2e/activation-callbacks.e2e.ts:13`, setup at line 92 | `panOnDrag: true`, Control configured; plain drag must not pan | Set `panOnDrag: false`; retain plain-drag no-pan and Control-drag pan assertions unchanged. One-line source comment cites FlowRenderer line 81. | Restore `panOnDrag: true` and assert plain drag pans. Later no-pan and wheel assertions use the viewport after this added pan. |
| `apps/vanilla/e2e/events-and-changes.e2e.ts:411`, setup at line 415 | Implicit enabled pan, Shift configured; plain fixed-node drag must not pan | Set `panOnDrag: false`; retain plain-drag no-pan, Shift-drag pan, no-pan target, and unmoved-node assertions. Rename the title and add the source comment. | Remount with `panOnDrag: true` and assert plain fixed-node drag pans despite the configured Shift modifier. |

No equivalent key-required test exists in Foldkit or the shared contracts. The audit included activation callbacks, advanced gestures, gesture options, lifecycle, viewport, touch, and selection paths. Other explicit selection activation modifiers remain supported. The unchanged `advanced-gestures.e2e.ts:2431` teardown test caught an extra blur subscription in the first candidate; the fix reuses Vanilla's existing scoped window listeners and preserves its exact one-removal assertion.

The new `apps/foldkit/e2e/pane-input.e2e.ts` covers the additive Control key with `false`, `true`, `[1]`, and `[1, 2]`, plus native middle/right mouse panning. The upstream shared pane suite, its assertions, inputs, numbers, and timeouts remain unchanged. The first Vue affected run also caught that the added plain-pan step had replaced its prior gesture settings: `apps/vue/src/test-harness.ts:818` assigns the whole options object. The corrected test restores the full configured key, no-pan, and wheel options before the added drag; no no-pan or wheel assertion was removed.

## Results

Acceptance is complete for the focused scope below. Baseline diagnostic receipts are `/tmp/plan132-baseline-{vanilla,vue,foldkit}.log`. Real-worktree package builds, workspace typechecking, 29 focused Foldkit units, documentation checks, and quality checks passed.

All affected host scopes passed with no unexpected failures or flaky outcomes:

| Host | Playwright passed | Existing skips | Retained expected failures included in passed | Actual passing assertions |
| --- | --- | --- | --- | --- |
| Vanilla | 196 | 2 | 7 | 189 |
| Vue | 90 | 0 | 6 | 84 |
| Foldkit | 99 | 0 | 9 | 90 |

Each scope includes the complete unchanged 50-case upstream runner. Its actual passing upstream assertions are Vanilla 43, Vue 44, and Foldkit 41; all six scoped pane cases pass in every host. The remaining expected failures match the ledger and were retained. The unchanged Vanilla teardown assertion and the corrected full-options Vue activation test both passed. All six new Foldkit public-option tests passed. All six cases passed 20/20 in every host with `--repeat-each=20`, zero skips, zero unexpected failures, and zero flaky outcomes. All cells below are reference-conforming at the unchanged Chromium port boundary; fixed/preserved describes their baseline ledger status.

| Case       | Vanilla          | Vue              | Foldkit          |
| ---------- | ---------------- | ---------------- | ---------------- |
| UP-126-039 | 20/20, preserved | 20/20, preserved | 20/20, fixed     |
| UP-126-040 | 20/20, preserved | 20/20, preserved | 20/20, fixed     |
| UP-126-045 | 20/20, fixed     | 20/20, fixed     | 20/20, fixed     |
| UP-126-046 | 20/20, fixed     | 20/20, fixed     | 20/20, fixed     |
| UP-126-047 | 20/20, fixed     | 20/20, preserved | 20/20, preserved |
| UP-126-048 | 20/20, fixed     | 20/20, fixed     | 20/20, fixed     |

The required `scripts/with-flow-browser-lock.sh bun run verify` exited 0 on its first invocation. All 18 focused gates passed, including 97 unit files / 2,514 tests, all packed consumers, documentation, architecture, builds, types, the ledger, and 2,841 citations across 79 research traces. No known-flake rerun was needed.

| Focused verifier host | Playwright passed | Existing skips | Retained upstream expected failures included | Selected files |
| --- | --- | --- | --- | --- |
| Vanilla | 691 | 2 | 7 | 46 |
| Vue | 805 | 0 | 6 | 37 |
| Foldkit | 467 | 0 | 9 | 54 |

The earlier affected-suite attempts and their two resolved causes are recorded above; neither is hidden by a retry setting or an assertion change. The required verifier itself had no failure or rerun. Its evidence is `/tmp/plan132-verify.log`; affected-suite and repeat receipts are `/tmp/plan132-focused-{host}.json` and `/tmp/plan132-repeat-{host}.json`.

Rerun the complete upstream runner with the matching host config, or select the six scoped cases with `--repeat-each=20 -g 'UP-126-0(39|40|45|46|47|48)'`. Every browser invocation uses the owner-checked wrapper and one worker:

```sh
scripts/with-flow-browser-lock.sh bunx playwright test upstream-playwright.e2e.ts --workers=1 --repeat-each=20 -g 'UP-126-0(39|40|45|46|47|48)'
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-playwright.e2e.ts --workers=1 --repeat-each=20 -g 'UP-126-0(39|40|45|46|47|48)'
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-playwright.e2e.ts --workers=1 --repeat-each=20 -g 'UP-126-0(39|40|45|46|47|48)'
scripts/with-flow-browser-lock.sh bun run verify
```

Phase 126 ledger changes are Vanilla 39 pass / 10 fail / 1 intentional difference to 43 / 6 / 1; Vue 41 / 8 / 1 to 44 / 5 / 1; Foldkit 36 / 13 / 1 to 41 / 8 / 1. Only the 12 scoped failures changed status; the three obsolete Foldkit unmapped-prop entries were removed. Dynamic `test.fail` is now false for these cases; the unchanged adapter retains it for unrelated ledger failures. Phases 127 and 128 remain not ported.

The verification config retains every previous check and browser filename, appends Plan 132 to activeWork, and adds only Vanilla `touch-ready-mobile.e2e.ts` and Foldkit `pane-input.e2e.ts`. The scope is 46 Vanilla, 37 Vue, and 54 Foldkit files. The profile remains focused; full-profile acceptance is separate.

## Conformity and deviations

Conforming: UP-126-039, UP-126-040, and UP-126-045 through UP-126-048 each pass 20/20 in Vanilla, Vue, and Foldkit against the unchanged pinned port. The new Foldkit native mouse tests additionally cover the Boolean/array pan policy and additive Control key. The comparison boundary is local Chromium mouse/CDP-touch input, rendered transforms, and active selection rectangles.

Intentionally different internally: Flow retains framework-owned lifecycle code, typed Effect workflows, Foldkit's queued input and publication ownership, Vanilla's modifier option name, and existing host defaults. These choices follow `docs/standards.md`; upstream fixtures explicitly map the compared configuration. They do not establish a user-visible deviation in the six passing contracts.

Unverified: live React comparison, other engines, physical devices, Cypress phases 127/128, full-profile acceptance, and collector-side OTLP delivery remain separate work.
