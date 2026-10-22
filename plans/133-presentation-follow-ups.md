# Plan 133: Presentation follow-ups

Round 2 preserves documented shared-SVG stacking in Vanilla and hidden mounted toolbars in Foldkit. Classification requires the measured visual and accessibility checks below.

## Plan 126 follow-up: Edge SVG stacking

### Problem and scope

Reconcile the per-edge z-index contract with each host SVG layer. Prove normal, explicit, normal-to-child, and child-to-child stacking against the unchanged CSS assertions.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case       | Upstream title                               | Failing hosts |
| ---------- | -------------------------------------------- | ------------- |
| UP-126-012 | zIndex sets z-index of edge svgs             | vanilla       |
| UP-126-016 | z-index                                      | vanilla, vue  |
| UP-126-017 | sub flow: normal node to child node, z-index | vanilla       |
| UP-126-018 | sub flow: child node to child node, z-index  | vanilla       |

### Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

### Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

### Conformity and deviations

The listed failures remain unverified until their public browser paths pass. Any intentional difference requires an existing documented reason with an exact citation; a failing test alone is not such a reason. Live React comparison, other browser engines, and Cypress phases 127 and 128 remain separate work.

## Plan 126 follow-up: Background centering and offsets

### Problem and scope

Match the pinned half-cell centering and offset transforms in Vue and Foldkit. Retain the literal patternTransform assertions.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-001 | centers the dot pattern with default gap and no offset (zoom 1, pan 0,0) | vue, foldkit |
| UP-126-002 | applies both the offset and the half-cell centering for a non-zero offset | vue, foldkit |

### Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

### Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

### Conformity and deviations

The listed failures remain unverified until their public browser paths pass. Any intentional difference requires an existing documented reason with an exact citation; a failing test alone is not such a reason. Live React comparison, other browser engines, and Cypress phases 127 and 128 remain separate work.

## Plan 126 follow-up: Toolbar alignment and lifecycle

### Problem and scope

Investigate default toolbar attachment in Vanilla and Foldkit. Preserve the passing alignment permutations across all hosts. Preserve public ownership and disposal contracts while satisfying or explicitly deciding the upstream lifecycle contract.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case       | Upstream title            | Failing hosts    |
| ---------- | ------------------------- | ---------------- |
| UP-126-020 | toolbar default behaviour | vanilla, foldkit |

### Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

### Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

### Conformity and deviations

The listed failures remain unverified until their public browser paths pass. Any intentional difference requires an existing documented reason with an exact citation; a failing test alone is not such a reason. Live React comparison, other browser engines, and Cypress phases 127 and 128 remain separate work.

## Round 2 decisions and implementation

Round 2 preserves Vanilla's documented shared-SVG design and Foldkit's hidden mounted toolbar policy. The original acceptance sections above are amended by the planner's measured-visual-order rule: a representation difference can be intentional only where the measured visual behavior agrees. A visual stacking gap remains fail without reversing the approved architecture. All other measured product gaps in this plan are fixed.

Vue's base SVG stylesheet now uses z-index 0. Its core stacking calculation and separate elevated edge layers already model the tested levels correctly. Both Vue and Foldkit now scale gaps and pattern geometry, apply pan remainders separately, subtract offset plus half-cell dimensions, use size as the dot diameter, and center line/cross paths like pinned upstream. They emit the exact upstream patternTransform form. Foldkit retains each background's renderer in a weak map so both initial creation and app-fed viewport updates use its original options. Caller-created SVGs retain the existing transform-only alignment behavior.

Vanilla's reusable node toolbar now retains its host and caller content while detaching inactive output. Selection reattaches the same host. Its subscriptions, rendered-node observation, fixed-size anchors, content restoration, and disposal remain. Edge toolbar lifetime is unchanged. Foldkit toolbars continue to use hidden according to Plan 102.

No upstream assertion, title, threshold, fixture option, or selector adapter changes. Imported upstream artifacts remain immutable. Verification configuration only adds Vue node-toolbar/edge-toolbar suites and the Foldkit hidden-toolbar regression. Every pre-existing check, file selection, activeWork value, and the focused default remains.

## Results

The production paths, distinct test paths, complete measurement method, and pinned React harness are in `research/traces/presentation-followups.md`. There are no port bugs among these cases. Already passing hosts remain conforming; the a/c labels below classify the originally failing hosts.

| Case | Vanilla | Vue | Foldkit |
| --- | --- | --- | --- |
| UP-126-001 | Existing conforming pass, translate(-10,-10). | a. Product gap fixed. Before: translate(0 0) scale(1), dot center 10/radius 1. After: translate(-10,-10), center/radius 0.5. `packages/vue/src/ui.ts:318`. | a. Product gap fixed. Before: no transform, dot center 10/radius 1. After matches pinned geometry and translation. `packages/foldkit/src/ui.ts:141`. |
| UP-126-002 | Existing conforming pass, translate(-52,-52). | a. Product gap fixed. Before: translate(2 2) scale(1), corner-origin line path. After: translate(-52,-52), centered path. `packages/vue/src/ui.ts:363`. | a. Product gap fixed. Before: no transform, x/y 2/2 and corner-origin path. After: x/y 0/0, translate(-52,-52), centered path. `packages/foldkit/src/ui.ts:150`. |
| UP-126-012 | a. Measured visual product gap retained. CSS receives auto versus 3141592; the edge also paints below node 8 instead of above it. Shared-SVG decision preserved at `research/traces/edge-visibility-stacking.md:34`, sort at `apps/vanilla/src/edge-renderer.ts:568`. | Existing conforming pass, 3141592. | Existing conforming pass, 3141592. |
| UP-126-016 | c. Intentional shared-SVG difference. CSS receives auto versus 0. Edge/edge order and the controlled ordinary-node overlap agree with pinned React. Same decision and sort citations as above. | a. Product gap fixed. CSS receives 1 before and 0 after. Base/elevated split at `packages/vue/src/flow-canvas.ts:10164`; corrected base rule at `packages/vue/src/style.css:454`. | Existing conforming pass, 0. |
| UP-126-017 | a. Measured visual product gap retained. CSS auto versus 1, and parent 12 paints above subflow-edge instead of below. Shared-SVG decision preserved. | Existing conforming pass, 1; measured edge above parent 12. | Existing conforming pass, 1; measured edge above parent 12. |
| UP-126-018 | a. Measured visual product gap retained. CSS auto versus 1, and parent 12 paints above subflow-edge-2 instead of below. Shared-SVG decision preserved. | Existing conforming pass, 1; measured edge above parent 12. | Existing conforming pass, 1; measured edge above parent 12. |
| UP-126-020 | a. Product gap fixed. Before: one attached, invisible unselected toolbar. After: absent while unselected, attached after native selection. `apps/vanilla/src/ui/toolbar.ts:175`, `apps/vanilla/src/ui/toolbar.ts:185`. No documented keep-mounted decision was found for this helper. | Existing conforming pass, absent while unselected. | c. Intentional difference. One toolbar remains attached with hidden, no accessible buttons or accessibility output, and no focus transfer. Policy `plans/102-add-foldkit-node-and-edge-toolbars.md:23`, implementation `packages/foldkit/src/toolbar.ts:200`, regression `apps/foldkit/e2e/presentation-followups.e2e.ts:5`. |

### Measured visual boundary

The probe uses document.elementsFromPoint at sampled path positions and records front-to-back owners. Vanilla keeps edge-with-style in front of edge-with-class at 619.367188,109.991313, matching React at 616.515386,69.688244. The original normal-edge fixture has no interior node overlap. A separate controlled probe moves existing node 3's DOM transform to the path midpoint, preserves semantic state and path geometry, measures, and restores the exact style synchronously. Both renderers put node 3 in front of the ordinary edge.

For the natural subflow overlap, Vanilla at 671.443231,565.335702 orders parent 12 before subflow-edge; React at 675.991332,593.642339 reverses that order. Vanilla at 668.847595,628.813375 orders parent 12 before subflow-edge-2; React at 672.856059,664.246821 puts the edge first. The extra explicit-z probe finds node 8 before z-index in Vanilla at 537.142866,396.205714, versus z-index before node 8 in React at 522.857134,403.502152. UP-126-012 therefore also remains fail under the planner's visual-gap rule rather than receiving an unsupported intentional classification. No stacking source changes are made in Vanilla.

The background difference is positional. At zoom 1, pinned dots have phase 10.5 modulo 20, versus 10 in old Vue/Foldkit; their radii are 0.5 versus 1. Pinned lines have phase -2 modulo 100, versus +2 in old Vue/Foldkit. The comma form is cheap to match, but changing only the attribute string would leave the wrong dot/path geometry.

Raw receipts are `/tmp/flow-133/red-{vanilla,vue,foldkit}.json`, `/tmp/flow-133/measure-{vanilla,vue,foldkit}.log`, and `/tmp/flow-133/reference.log`. The disposable reference harness uses the pinned React/system source and generic edge fixture with React 18.3.1 and pinned styles. Its corrected run passes one probe, including both literal background transforms. The first harness setup fails before rendering due to an unavailable upstream workspace tsconfig, then passes after adapting only disposable build configuration. The initial Vue diagnostic records the relevant edge/background measurements before timing out when reading the correctly absent toolbar; Vue's unchanged toolbar contract independently passes. These diagnostic setup errors are not product failures.

### Existing tests changed

Both fixture option sets are non-default, but pinned upstream unambiguously defines their radius, path extent, and offset geometry too. No documented opposite policy was found. Changes are limited to those presentation expectations and the corresponding viewport-output samples. Citation comments identify the pinned source.

| Existing test | Old expectation | New expectation | Pinned reason |
| --- | --- | --- | --- |
| `apps/vue/e2e/canvas-ui-contract.e2e.ts:36` | radius 2 for size 2 | radius 1 | `packages/react/src/additional-components/Background/Background.tsx:76` and `packages/react/src/additional-components/Background/Patterns.tsx:29`. |
| `apps/vue/e2e/canvas-ui-contract.e2e.ts:37` | M 18 0 L 0 0 0 24 | M 9 0 V 24 M 0 12 H 18 | Centered intersections at `packages/react/src/additional-components/Background/Patterns.tsx:16`. |
| `apps/vue/e2e/canvas-ui-contract.e2e.ts:41` | M 8 12 h 2 M 9 11 v 2 | M 1 0 V 2 M 0 1 H 2 | Cross dimensions use size at `packages/react/src/additional-components/Background/Background.tsx:44`, with the same centered path. |
| `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:116` | Cross path contains H 14 | Contains H 6 | Complete size 6 is the path extent, rather than a radius around the gap center. Same upstream dimension/path citations. |
| `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:136` | pattern x/y 2/3 for offset 2/3 | x/y 0/0 at pan 0, with new literal translations -10/-15 for dots/lines and -5/-6 for cross | Pan belongs in x/y and offset belongs in negative translation, `packages/react/src/additional-components/Background/Background.tsx:45`, `packages/react/src/additional-components/Background/Background.tsx:68`. Dot radius 0.5 is also checked. |
| `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:181` and `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:239` | Pattern translate/scale equals viewport translate/scale | Scaled gap, pan remainders, and half-gap translation match the viewport, including every captured intermediate animation frame | `packages/react/src/additional-components/Background/Background.tsx:40` and `packages/react/src/additional-components/Background/Background.tsx:68`. The 0.01 tolerance and requirement for intermediate frames remain. |

The new Foldkit hidden-toolbar regression checks all three descendant buttons individually within one DOM evaluation and then selects the real node with native input. The upstream UP-126-020 assertion remains unchanged and intentionally fails for Foldkit's retained attachment policy.

### Ledger changes

Only these seven case IDs change. Six host outcomes move from fail to pass after the unchanged assertion is observed succeeding. Vanilla UP-126-016 and Foldkit UP-126-020 move from fail to intentional-difference with policy and measurement citations. Vanilla UP-126-012/-017/-018 remain fail, with measured visual reasons replacing the previous CSS-only observation. No other outcome changes.

| Host    | Phase-126 before, pass / fail / intentional | After      |
| ------- | ------------------------------------------- | ---------- |
| Vanilla | 39 / 9 / 2                                  | 40 / 7 / 3 |
| Vue     | 42 / 6 / 2                                  | 45 / 3 / 2 |
| Foldkit | 40 / 8 / 2                                  | 42 / 5 / 3 |

### Verification

All browser invocations use `scripts/with-flow-browser-lock.sh` and one worker. The wrapper sets OTEL_SDK_DISABLED=true. Baseline red runs temporarily expose the listed ledger failures as normal failures, record the unchanged assertions, and restore the original ledger. After implementation, all six newly successful unchanged assertions produce Expected to fail, but passed with the old ledger, recorded in `/tmp/flow-133/new-pass-{vanilla,vue,foldkit}.log`. Only then are their ledger entries flipped.

| Host | Complete upstream runner | Actual pass outcomes | Retained expected failures | New passes repeated |
| --- | --- | --- | --- | --- |
| Vanilla | 50 passed, exit 0 | 40 | 7 fail plus 3 intentional | UP-126-020: 20/20 |
| Vue | 50 passed, exit 0 | 45 | 3 fail plus 2 intentional | UP-126-001, UP-126-002, UP-126-016: 20/20 each, 60 total |
| Foldkit | 50 passed, exit 0 | 42 | 5 fail plus 3 intentional | UP-126-001, UP-126-002: 20/20 each, 40 total |

These runs have zero skips and zero unexpected failures. Logs are `/tmp/flow-133/upstream-{vanilla,vue,foldkit}.log` and `/tmp/flow-133/repeat-{vanilla,vue,foldkit}.log`.

Standalone affected suites select complete edge-recipes, edge-geometry-recipes, subflows-recipes, canvas-ui-contract, ui-controls, renderer-contract, and renderer-props files in every host. Vanilla also selects styling-recipes, next-slices, final-wiring, and graph-renderers; Vue selects node-toolbar, edge-toolbar, and final-wiring; Foldkit selects toolbars, model-styling, and presentation-followups. Logs are `/tmp/flow-133/affected-{vanilla,vue,foldkit}.log`.

The uninterrupted standalone affected runs passed with Vanilla 68, Vue 44, and Foldkit 34 tests, all with zero skips and zero unexpected failures.

The final focused verifier passed all 18 gates. All 15 non-browser gates passed, including 97 unit files and 2,514 tests, package and app builds, typechecking, architecture, packed consumers, docs, catalogs, ledger validation, formatting, and lint. Research validation passed 2,902 citations across 80 traces.

| Host    | Saved focused files | Browser result | Skips | Unexpected failures |
| ------- | ------------------- | -------------- | ----- | ------------------- |
| Vanilla | 45                  | 690 passed     | 2     | 0                   |
| Vue     | 41                  | 818 passed     | 0     | 0                   |
| Foldkit | 55                  | 463 passed     | 0     | 0                   |

The two Vanilla skips are the pre-existing native concurrent-pointer and two-contact-pinch capture cases at apps/vanilla/e2e/advanced-gestures.e2e.ts:914 and :918. The terminal run passed the named Vanilla next-slices and graph-renderers checks and Foldkit layout-recipes checks without a flake rerun. It includes all three unchanged upstream runners, the added Vue toolbar files, the revised geometry/animation expectations, and the new Foldkit hidden-toolbar regression.

Two earlier affected-suite attempts hit startup and action timeouts during repeated machine maintenance sleep. Their unchanged logs are retained in /tmp/flow-133/attempt1 and /tmp/flow-133/attempt2; power events are in /tmp/flow-133/power-events.log. The first had a Vanilla startup timeout, four Vue timeouts, and two Foldkit timeouts; the second had Vanilla/Foldkit startup timeouts and one Vue action timeout. No source, assertion, timeout, retry, or browser configuration was changed in response. The successful run uses an AC system-sleep assertion as well as an idle-sleep assertion, both bound to the validation process. Those assertions and the owner-token browser lock end with that process.

The exact final command is scripts/with-flow-browser-lock.sh caffeinate -is sh /tmp/flow-133/affected.sh. That script runs every selected affected file with --workers=1 and, only if every affected host passes, runs bun run verify under the same lock. The terminal verifier log is /tmp/flow-133/verify.log, with profile focused and fullSuite false. This is bounded local development acceptance; the retained visual gaps prevent broad presentation parity acceptance. Formatting, docs, ledger, and trace validation are checked again after this results-only documentation update.

## Conformity and deviations

Conforming for the unchanged pinned UP-126-001 and UP-126-002 initial Background contracts across all three hosts, the corrected Vue UP-126-016 base level, and Vanilla UP-126-020 default toolbar lifecycle. Existing conforming host outcomes remain passing. Production pan/zoom, non-default background geometry, toolbar alignment, renderer contracts, subflows, and styling receive the affected suites and saved focused scope.

Vanilla UP-126-016 is intentionally different in its shared-SVG representation with matching measured fixture and controlled overlap order. Foldkit UP-126-020 intentionally preserves hidden mounted caller content under Plan 102, with explicit visible, accessibility, focus, and selection checks.

Vanilla UP-126-012, UP-126-017, and UP-126-018 remain measured product gaps in visual stacking. Their shared-SVG design is preserved as instructed, but that design does not establish parity. No live deployed React comparison, other-engine, full-profile, integration, release, Cypress-phase, or broad parity claim is made. OpenTelemetry delivery remains unverified without a collector-side test.
