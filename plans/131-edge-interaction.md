# Plan 131: Edge interaction and accessibility (upstream follow-up)

## Problem and scope

Investigate multi-selection, selected-state markup, interaction width, and edge aria-label publication. Trace the browser action to the public host selection and deletion boundaries before choosing a fix.

Plan 126 recorded these failures from the pinned upstream port. This follow-up fixes the authorized product gaps and records the label-interaction difference established by browser measurement. The ledger contains the host outcomes and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-003 | selecting an edge by click | foldkit |
| UP-126-004 | selecting multiple edges by meta-click | foldkit |
| UP-126-010 | deleting edges is possible | foldkit |
| UP-126-011 | deletable=false prevents deleting of edges | foldkit |
| UP-126-013 | aria-lable is working | vue |
| UP-126-014 | interactionWidth is working | vanilla, vue, foldkit |

## Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

## Acceptance

Every fixed product gap passes its unchanged upstream contract. UP-126-014 may retain its expected failure only after measured proof of the documented noninteractive-label difference. All previously passing cases remain passing. Record exact host counts, expected failures, repeat runs, focused verification scope, and remaining boundaries. Commit on `plan/131-edge-interaction-r2`; do not push or merge.

## Initial evidence boundary

Round 1 reproduced Foldkit UP-126-003, UP-126-004, UP-126-010, and UP-126-011, Vue UP-126-013, and UP-126-014 in every host with unchanged upstream assertions. Vanilla UP-126-004 already passed after Plan 128's fixture correction. Round 2 is authorized to fix selected-state publication, multi-selection, Foldkit interaction width, and Vue wrapper ARIA. Built-in label pointer events remain unchanged by explicit planner decision.

## Implementation

Foldkit publishes `selected` on the edge wrapper and applies the configured multi-selection key to edge clicks. Multi-selection preserves other selected elements and toggles the clicked edge through core's selection-set operation. Controlled selection proposals wait for the host's document acknowledgement. Edge SVGs stay in document order; core stacking already supplies CSS z-index. This prevents selection from moving the focused SVG and losing keyboard ownership before deletion. The hit path uses the configured interaction width, with upstream's default of 20. Removing the CSS override allows that SVG attribute to control hit testing.

Vue publishes the explicit edge aria-label, or the existing generated endpoint label, on the wrapper as well as the hit path. No upstream test title, assertion, gesture coordinate, threshold, or selector mapping changes. The imported upstream evidence remains immutable.

The focused Foldkit width regression tests computed widths of 42 and 20 and selects the configured edge 15 path units from its center. UP-126-014 cannot pin this CSS cause because its click lies outside the scaled interaction stroke.

## Results

The production and fixture paths are traced in `research/traces/edge-interaction.md`. Classifications below distinguish the originally failing host cases from already conforming hosts. No case is a port bug.

| Case | Vanilla | Vue | Foldkit |
| --- | --- | --- | --- |
| UP-126-003 | Existing conforming pass. Wrapper class at `apps/vanilla/src/edge-renderer.ts:976`. | Existing conforming pass. Wrapper classes at `packages/vue/src/canvas-presentation.ts:147`. | a. Product gap. Wrapper omitted selected; fixed at `packages/foldkit/src/graph.ts:7506`. |
| UP-126-004 | Existing conforming pass after Plan 128. Click owner at `apps/vanilla/src/mount-flow.ts:11416`. | Existing conforming pass. Selection owner at `packages/vue/src/flow-canvas.ts:2835`. | a. Product gap. SelectEdge always applied exclusive edge-selection. Configured multi-key now toggles a selection-set at `packages/foldkit/src/graph.ts:4439`. |
| UP-126-010 | Existing conforming pass. | Existing conforming pass. | a. Product gaps. Missing selected class hid native focus loss when orderFlowEdges moved the selected SVG. The same path retained its identity, but activeElement became BODY and the d event had no canvas in its composed path. Stable DOM order at `packages/foldkit/src/graph.ts:7398` preserves focus; CSS stacking remains at `packages/foldkit/src/graph.ts:7434`. |
| UP-126-011 | Existing conforming pass. | Existing conforming pass. | a. Product gap. Missing wrapper selected class prevented reaching the protected-delete assertion. Fixed wrapper publication and stable focus allow the unchanged assertion to pass. Core deletion protection remains unchanged. |
| UP-126-013 | Existing conforming pass. Wrapper ARIA at `apps/vanilla/src/edge-renderer.ts:1022`. | a. Product gap. ARIA was only on the hit path. Wrapper publication added at `packages/vue/src/flow-canvas.ts:9559`. | Existing conforming pass. Wrapper label resolved at `packages/foldkit/src/graph.ts:7432`. |
| UP-126-014 | c. Intentional noninteractive-label difference, measured below. | c. Intentional noninteractive-label difference, measured below. | c. Intentional noninteractive-label difference after fixing a separate product gap: CSS forced every hit stroke to 16px. `packages/foldkit/src/style.css:418` now lets `packages/foldkit/src/graph.ts:5707` honor configured width and default to 20. |

### UP-126-014 measurements

Each probe uses the unchanged host adapter's bbox center x plus 21, center y, for interaction-width with interactionWidth 42. It records document.elementsFromPoint, computed stroke width, the hit path d and screen CTM, and the nearest distance over 10,001 getPointAtLength samples. Distances below are rounded; raw logs retain the measurements. All paths are vertical at local x = -25. SVG stroke width is in local path units, so its 21-unit half-width must be multiplied by viewport scale before comparison with a screen-pixel click.

| Host | Click x, y in screen px | Scale | Distance in screen px | Distance in path units | Rendered half-width in screen px | Computed width |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla | 558.142868, 458.742874 | 0.822857141 | 20.999985 | 25.520815 | 17.280000 | 42px |
| Vue | 558.428574, 460.109711 | 0.820571423 | 20.999985 | 25.591904 | 17.232000 | 42px |
| Foldkit after fix | 558.142853, 460.388565 | 0.822857141 | 20.999969 | 25.520796 | 17.280000 | 42px |
| Pinned React harness | 543.857132, 470.582855 | 0.937142849 | 21.000015 | 22.408553 | 19.680000 | 42px |

Geometry and transforms, with CTM b = c = 0 and a = d = scale:

| Host         | Hit path d                        | CTM translation e, f  |
| ------------ | --------------------------------- | --------------------- |
| Vanilla      | M-25,445 C-25,470 -25,470 -25,495 | 557.714294, 72        |
| Vue          | M-25,449 C-25,472 -25,472 -25,495 | 557.942871, 72.800003 |
| Foldkit      | M-25,449 C-25,472 -25,472 -25,495 | 557.714294, 72        |
| Pinned React | M-25,439 C-25,468 -25,468 -25,497 | 546.285706, 32        |

The elementsFromPoint stacks, from front to back, are:

- Vanilla: DIV.flow-viewport, SECTION.flow-canvas, root DIV, BODY, HTML.
- Vue: DIV.flow-vue-canvas.light, root DIV, BODY, HTML.
- Foldkit: DIV.flow-foldkit-viewport, DIV.flow-foldkit-canvas.light, DIV.flow-foldkit-root, root DIV, BODY, HTML.
- Pinned React: rect.react-flow__edge-textbg, DIV.react-flow__pane.draggable, DIV.react-flow__renderer, DIV.react-flow.light, two ancestor DIVs, BODY, HTML.

No Flow hit path is under the test point. Its 21-screen-pixel distance exceeds the rendered half-width in each host, and its local distance exceeds 21 path units. Foldkit's baseline computed width was 16px despite stroke-width=42; removing the override changes it to 42px but cannot make this outside-stroke point hit.

A disposable Vite harness copies the immutable pinned React and system source plus the generic edge config and generic Flow component into `/tmp/flow-131-reference`. It uses React 18.3.1, the source's controlled handlers, and compiled pinned styles. The original imported edges.spec.ts:134 test passes unchanged in Chromium. The measurement probe also passes its selection assertion, removes the SVG label wrapper, clears selection with a pane click, and clicks the identical recorded point again. The edge stays unselected. These two checks pass, proving the upstream label background accounts for this fixture's selection. This is a local pinned-source harness, not a deployed reference app or other-browser claim.

The intentional policy is `research/traces/edge-label-render.md:26`, with the unchanged DIV and pointer-events contract at `apps/vanilla/e2e/renderer-contract.e2e.ts:164`. That trace now describes current HTML DIV labels instead of obsolete SVG text. Label pointer events remain unchanged in all hosts.

Raw measurement logs are `/tmp/flow-131-measure-vanilla-red.log`, `/tmp/flow-131-measure-vue-red.log`, `/tmp/flow-131-measure-foldkit-red.log`, `/tmp/flow-131-measure-foldkit-green.log`, and `/tmp/flow-131-reference.log`. Native focus evidence is `/tmp/flow-131-delete-diagnostic.log`. The focused width regression failed before the fix with received 16px versus expected 42px in `/tmp/flow-131-width-red.log` and passes after the fix. Temporary probes and diagnostic fixture logging are removed.

### Ledger changes

Only the requested cases change. Foldkit UP-126-003, UP-126-004, UP-126-010, and UP-126-011 move from fail to pass. Vue UP-126-013 moves from fail to pass. UP-126-014 moves from fail to intentional-difference in every host, with distance, scale, stroke, stack, and policy citation in each reason. Each passing ledger flip follows an observed successful unchanged assertion. Before the flip, Playwright reports the success as Expected to fail, but passed because the old ledger marked it as an expected failure.

| Host    | Phase-126 ledger before, pass / fail / intentional | After      |
| ------- | -------------------------------------------------- | ---------- |
| Vanilla | 39 / 10 / 1                                        | 39 / 9 / 2 |
| Vue     | 41 / 8 / 1                                         | 42 / 6 / 2 |
| Foldkit | 36 / 13 / 1                                        | 40 / 8 / 2 |

### Verification

All commands use `scripts/with-flow-browser-lock.sh`, which sets OTEL_SDK_DISABLED=true. Standalone Playwright commands specify --workers=1, and the saved verifier supplies one worker internally.

| Host | Complete upstream runner | Actual pass outcomes | Retained expected failures | New passes repeated | Affected suites |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 50 passed, exit 0 | 39 | 9 fail plus 2 intentional | None newly passing | 93 passed, exit 0 |
| Vue | 50 passed, exit 0 | 42 | 6 fail plus 2 intentional | UP-126-013: 20/20 | 94 passed, exit 0 |
| Foldkit | 50 passed, exit 0 | 40 | 8 fail plus 2 intentional | UP-126-003, UP-126-004, UP-126-010, UP-126-011: 20/20 each, 80 total | 125 passed, exit 0 |

The upstream runners and repeated new passes have zero unexpected failures and zero skips. Expected failures remain explicit in the ledger. Logs are `/tmp/flow-131-upstream-{vanilla,vue,foldkit}.log` and `/tmp/flow-131-repeat-{vue,foldkit}.log`. The pinned React harness separately passed two tests, including the original imported UP-126-014 assertion and the causal label-removal probe.

```sh
scripts/with-flow-browser-lock.sh bunx playwright test -c playwright.config.ts apps/vanilla/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1 --repeat-each=20 -g UP-126-013
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1 --repeat-each=20 -g 'UP-126-(003|004|010|011)'
scripts/with-flow-browser-lock.sh bun run verify
```

Affected standalone runs select complete edge-recipes, renderer-contract, renderer-props, events-and-changes, and edge-geometry-recipes files in every host. They also select a11y and selection coverage in Vanilla canvas-ui-contract, shared-conformance, closing-options, and interaction-lifecycle; Vue closing-gaps, shared-conformance, interaction-lifecycle, and node-input; and Foldkit closing-gaps, shared-conformance, interaction-lifecycle, model-styling, node-input, and the new edge-interaction regression. Logs are `/tmp/flow-131-affected-{vanilla,vue,foldkit}.log`.

The config only adds Vue renderer-contract and shared-conformance, plus Foldkit edge-interaction. Existing checks, browser files, activeWork, and focused default remain. The resulting saved browser scope has 45 Vanilla files, 39 Vue files, and 53 Foldkit files. Existing trace citations are mechanically remapped after the source edits. Formatting, lint, docs validation, ledger validation, and research citation checks pass before the final verifier.

The final focused verifier passed all 18 gates with exit 0. All 15 non-browser gates passed, including 97 unit files and 2,514 tests, package builds, typechecking, packed consumers, architecture, docs, catalogs, ledger validation, formatting, and lint. Research validation passed 2,811 citations across 78 traces.

| Host    | Saved focused files | Browser result | Skips | Unexpected failures |
| ------- | ------------------- | -------------- | ----- | ------------------- |
| Vanilla | 45                  | 690 passed     | 2     | 0                   |
| Vue     | 39                  | 816 passed     | 0     | 0                   |
| Foldkit | 53                  | 461 passed     | 0     | 0                   |

The standalone affected suites passed with Vanilla 93, Vue 94, and Foldkit 125 tests, all with zero skips and zero unexpected failures. The saved verifier repeats the new width regression, the affected edge contracts, a11y and selection coverage, and all three upstream runners. The two Vanilla skips are pre-existing native multi-pointer-capture cases. No named flake required a rerun, including Foldkit UP-126-022, which remains passing and unchanged. No unrelated ledger outcome changes.

The terminal verifier log is `/tmp/flow-131-verify.log`, with profile focused and fullSuite false. An outer caffeinate idle-sleep assertion covers the queued validation process and ends automatically with it. Formatting, docs, ledger, and citation validation are rerun after the final results-only documentation update. This is focused local development acceptance, not full-profile or release acceptance.

## Conformity and deviations

Conforming for the unchanged pinned UP-126-003, UP-126-004, UP-126-010, UP-126-011, and UP-126-013 Chromium contracts in Vanilla, Vue, and Foldkit. The newly fixed hosts are the ones identified in the classification table; the remaining hosts retain their existing passes. Foldkit's dedicated regression separately proves configured and default hit widths with native input.

UP-126-014 is intentionally different in all hosts because Flow keeps built-in labels noninteractive. Its exact point is outside the scaled stroke. The pinned React label background receives the click, and removing that label makes it miss. The approved label policy and renderer-contract assertion remain unchanged.

The verification boundary is the focused development profile with the saved scope plus additions listed above. Full-profile, integration, release, and broad parity acceptance remain separate. The ledger's Cypress phases 127 and 128, deployed reference apps, other engines, and arbitrary labels remain unverified by this work. OpenTelemetry delivery is unverified without a collector-side test.
