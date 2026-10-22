# Plan 137: MiniMap viewport tracking (upstream Cypress follow-up)

## Problem and scope

Preserve the dynamic upstream viewBox assertions and the originally retained minimap DOM rectangle. Vanilla and Foldkit redraw via replaceChildren; re-querying a replacement would weaken the retained-object contract. The mask assertion is unverified when the earlier viewBox assertion fails.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-065 | changes zoom level | vanilla | The wheel is delivered and node screen bounds change, but minimap SVG viewBox stays 0 0 200 150; the later mask assertion is not reached. |
| UP-127-065 | changes zoom level | vue | After wheel input changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-065 | changes zoom level | foldkit | The minimap SVG retains viewBox 0 0 180 120 after the wheel; the later mask assertion is not reached. |
| UP-127-066 | changes node position | vanilla | The graph node moves, but the original retained minimap rect keeps its old x attribute after redraw; Vanilla replaces minimap nodes at apps/vanilla/src/minimap.ts:272. |
| UP-127-066 | changes node position | foldkit | The graph node moves after native drag, but the original retained minimap rectangle keeps its old x attribute because update redraws the SVG with replaceChildren at packages/foldkit/src/ui/minimap.ts:220. |
| UP-127-067 | changes node positions via pane drag | vanilla | The native topLeft-to-bottomLeft pan changes graph screen bounds, but minimap SVG viewBox remains 0 0 200 150; the later mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | vue | After the pane pan changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | foldkit | The pane input changes graph screen bounds, but minimap SVG viewBox stays 0 0 180 120; the mask assertion is not reached. |

## Execution

1. Read each ledger entry, its pinned source, and its diagnostic receipt. Run the complete corresponding spec sequence through `/upstream-examples/<name>`; these Cypress files preserve page state across cases.
2. Temporarily rate the target case as pass to reproduce its unchanged assertion as an ordinary failure. Prove prerequisite state and pointer targets before attributing a new defect. Record the exact received value and any earlier case that blocked the intended state.
3. Trace the public browser entry, accepted document, geometry, DOM effects, and rendered output with exact source locations. Keep production and synthetic test paths separate. Follow `docs/standards.md` and existing observability ownership.
4. Implement only the proven repair in the appropriate package or host. Keep titles, assertions, numbers, commands, default release positions, and source timing unchanged. Add a focused regression only when the upstream case does not prove the cause.
5. Update only proven ledger outcomes. Retain unresolved failures and existing documented deviations. Add verification scope without removing any prior checks or browser files.

## Acceptance

Run each complete affected host runner with `--repeat-each=3`, then the saved focused verifier. Use `scripts/with-flow-browser-lock.sh` and `--workers=1` for every browser invocation. Preserve every previously passing contract. Report ordinary passes, expected failures, skipped cases, unexpected results, and differences between repeats. Remap shifted trace citations and run `bun run research:check-traces`. Commit or publish only with the authority granted for the follow-up.

## Instrumented baseline and root causes

The base is `6c934d7ac5c31596875cbb600ee044aab59241b0`. Only the eight scoped failing host entries were temporarily marked pass for baseline runs. The unchanged five-case MiniMap sequence failed 3/5 in Vanilla, 2/5 in Vue, and 3/5 in Foldkit. Temporary diagnostics captured the rendered graph transform, SVG viewBox and mask, retained rectangle attributes, connectivity, and replacement attributes. Product code was unchanged. All temporary diagnostic code was removed before acceptance runs. The receipts are `/tmp/plan137-baseline-{vanilla,vue,foldkit}.log`; the captured values are saved in `research/catalogs/minimap-viewport-evidence.json`.

The first Vue and Foldkit invocations stopped before tests because this fresh worktree had no dependencies. `bun install --frozen-lockfile` resolved that prerequisite without changing the lockfile. The counts above come from the subsequent executable baselines, not those setup failures.

| Case | Vanilla baseline | Vue baseline | Foldkit baseline | Cause and repair |
| --- | --- | --- | --- | --- |
| UP-127-065 | Fixed `0 0 200 150` | Fixed `0 0 180 120` | Fixed `0 0 180 120` | Shared core fitted only node bounds into a static pixel viewBox. Core now unions visible node and viewport bounds, fits the physical SVG aspect ratio, applies upstream offset scaling, and exposes the graph-space viewBox and mask to all hosts. |
| UP-127-066 | Original rect detached, x 69.33333333333334 unchanged; replacement x 149.89113157464564 | Original rect connected, x changes from 62.66666666666667 to 136.07542597291234 | Original rect detached, attributes unchanged | The test retains a synchronous jQuery collection. Vanilla and Foldkit now update default rectangles keyed by node id in place. Vue already retains keyed VNodes. |
| UP-127-067 | Fixed `0 0 200 150` | Fixed `0 0 180 120` | Fixed `0 0 180 120` | Same shared geometry defect. Viewport translation now changes the union and viewBox. The unchanged mask assertion can then execute. |

Cypress alias semantics do not justify re-querying UP-127-066. The pinned example uses Cypress 13.6.6 at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/examples/react/package.json:37`. [Its alias query implementation](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/cy/commands/querying/querying.ts#L92-L103) replays subject query chains. However, `minimap.cy.ts:37` stores `const minimapNode = Cypress.$(...)`; lines 45-46 read that same jQuery collection. There is no alias in this test. The retained ElementHandle is faithful, and the shared port is unchanged.

The exact production paths, reference formulas, host DOM effects, and distinct test paths are in [the research trace](../research/traces/minimap-viewport-tracking.md). Geometry stays in core; DOM reconciliation stays in each host. Existing Effect workflows, publication order, telemetry, and shutdown ownership remain unchanged. No high-frequency diagnostic log ships.

## Existing differences and test changes

The correspondence table contains no fixed-viewBox MiniMap decision. `research/traces/reusable-canvas-ui.md` documents the earlier boolean Vanilla `ui.minimap` as a small, fixed overview with simple rectangles and click centering. That path in `apps/vanilla/src/canvas-ui.ts` remains unchanged. The upstream fixture uses the separate standalone `createFlowMiniMap`. Its physical SVG remains 200 by 150; Vue and Foldkit retain their documented 180 by 120 dimensions.

No existing test directly asserts a fixed viewBox. The related-suite run exposed a fixed mask path and an assertion that an unmoved node rescales when another node moves. Those undocumented projection assumptions also conflict with the pinned formula. These local expectations change because SVG attributes now use graph units:

| Test | Previous assertion | New assertion and authority |
| --- | --- | --- |
| `packages/core/src/domain/flow-minimap.test.ts` | Viewport width was `(600 / 2) * (164 / 350)` projected pixels. | Assert `{ x: 10, y: 5, width: 300, height: 200 }` in graph units. Citation comment names pinned `packages/react/src/additional-components/MiniMap/MiniMap.tsx:19-24`. All visible-node, bounds, center, inverse-pointer, empty/hidden, and presentation assertions remain. |
| `apps/foldkit/e2e/minimap.e2e.ts` | Accepted measured width and height multiplied by `projection.scale`. | Compare the same live SVG attributes directly with accepted measured dimensions. Citation comment names pinned `packages/react/src/additional-components/MiniMap/MiniMapNodes.tsx:94-115`. The DOM resize, accepted measurement, original rectangle change, and precise dimension assertions remain. |
| `apps/vanilla/e2e/final-wiring.e2e.ts` | A mask regex required a fixed 200 by 150 pixel outer path. The live-preview test expected dragging A to rescale B's x attribute. | Assert exact initial and panned viewBox/mask values from pinned `MiniMap.tsx:107-116,212-215`. Assert A's live rectangle changes while B stays at graph x=600, citing `MiniMapNodes.tsx:94-115`. Keep accepted-document-before-drop and live-instance assertions. Custom colors, position, aria, click, wheel, and pan coverage remain. |
| `packages/foldkit/src/ui/minimap.test.ts` | One direct string assertion covered the removed host-local fixed mask helper. | Remove the obsolete helper and its direct unit test. The shared core's new literal mask assertion covers the production owner, including offset and viewport coordinates from pinned `MiniMap.tsx:212-215`. Three Foldkit accessible-label tests remain. |

Four added core regressions fail before the repair and pass afterward. They assert literal zoom and pan viewBoxes, hidden-node omission, unchanged graph-space node dimensions, the padded mask path, and inverse clicks through SVG letterboxing. They do not derive expected geometry by calling the implementation. The focused units pass 13/13 across two files.

## Results

The first Vanilla related-suite run passed 24 cases and failed the two obsolete projection expectations described above. Those failures did not require another product change. Receipts are `/tmp/plan137-minimap-vanilla.json` and the subsequent `/tmp/plan137-minimap-rerun-vanilla.json`. The complete upstream runners passed in all hosts with no skips, unexpected results, or flakes. Playwright's reported passed count includes retained expected failures; the table separates them.

| Host | Cypress repeats | Ordinary Cypress passes | Retained expected failures | Phase 126 ordinary passes | Phase 126 expected failures |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 3, 201 results | 132 | 69 | 44 | 6 |
| Vue | 3, 201 results | 156 | 45 | 48 | 2 |
| Foldkit | 3, 201 results | 174 | 27 | 47 | 3 |

Every scoped case passes 3/3 in every host. All cells are reference-conforming at the unchanged translated Chromium assertion boundary.

| Case       | Vanilla    | Vue            | Foldkit    |
| ---------- | ---------- | -------------- | ---------- |
| UP-127-065 | Fixed, 3/3 | Fixed, 3/3     | Fixed, 3/3 |
| UP-127-066 | Fixed, 3/3 | Preserved, 3/3 | Fixed, 3/3 |
| UP-127-067 | Fixed, 3/3 | Fixed, 3/3     | Fixed, 3/3 |

Only the eight scoped failing host entries change. The ledger counts below use pass / fail / intentional difference / not ported. Phase 126 remains unchanged and its complete 50-case runner passes in every host.

| Phase | Host    | Before          | After           |
| ----- | ------- | --------------- | --------------- |
| 126   | Vanilla | 44 / 3 / 3 / 0  | 44 / 3 / 3 / 0  |
| 126   | Vue     | 48 / 0 / 2 / 0  | 48 / 0 / 2 / 0  |
| 126   | Foldkit | 47 / 0 / 3 / 0  | 47 / 0 / 3 / 0  |
| 127   | Vanilla | 41 / 24 / 2 / 0 | 44 / 21 / 2 / 0 |
| 127   | Vue     | 50 / 17 / 0 / 0 | 52 / 15 / 0 / 0 |
| 127   | Foldkit | 55 / 12 / 0 / 0 | 58 / 9 / 0 / 0  |
| 128   | Vanilla | 0 / 0 / 0 / 107 | 0 / 0 / 0 / 107 |
| 128   | Vue     | 0 / 0 / 0 / 107 | 0 / 0 / 0 / 107 |
| 128   | Foldkit | 0 / 0 / 0 / 107 | 0 / 0 / 0 / 107 |

All related suites passed with no skips, expected failures, unexpected results, or flakes:

| Host | Related-suite ordinary passes | Receipt |
| --- | --- | --- |
| Vanilla | 26 | `/tmp/plan137-minimap-rerun-vanilla.json` |
| Vue | 29 | `/tmp/plan137-minimap-vue.json` |
| Foldkit | 10 | `/tmp/plan137-minimap-foldkit.json` |

The complete upstream receipts are `/tmp/plan137-cypress-{host}.json` and `/tmp/plan137-playwright-{host}.json`. They preserve all three Cypress repeats separately. The required `scripts/with-flow-browser-lock.sh bun run verify` exited 0 on its first invocation. All 18 focused gates passed, including quality, architecture, package and app builds, typechecking, 97 unit files / 2,517 tests, packed consumers, docs, examples, the ledger, and 3,015 citations across 82 research traces. No known-flake rerun was needed. The receipt is `/tmp/plan137-verify.log`.

| Focused verifier host | Reported passed | Existing skips | Retained expected failures included | Ordinary passes | Selected files |
| --- | --- | --- | --- | --- | --- |
| Vanilla | 758 | 2 | 29 | 729 | 47 |
| Vue | 885 | 0 | 17 | 868 | 42 |
| Foldkit | 536 | 0 | 12 | 524 | 57 |

All browser gates used one worker and passed with zero unexpected failures or flakes. The expected failures are the unchanged ledger failures and intentional differences in phases 126 and 127. The original Vanilla related-suite failures are explicitly recorded above; they were repaired by correcting local projection expectations, without changing product code again or weakening the upstream port. The Plan 134 index links now point to this renamed plan.

Every browser command uses `scripts/with-flow-browser-lock.sh` and one worker. For each host, the acceptance batch runs the complete `upstream-cypress.e2e.ts` with `--repeat-each=3`, the complete `upstream-playwright.e2e.ts`, and filename filters `minimap ui-controls.e2e.ts canvas-ui-contract.e2e.ts final-wiring.e2e.ts`. Vanilla has no separate minimap-named file; its standalone component cases live in `final-wiring.e2e.ts`. Vue and Foldkit use their host config paths.

```sh
scripts/with-flow-browser-lock.sh bunx playwright test upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3
scripts/with-flow-browser-lock.sh bunx playwright test upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test minimap ui-controls.e2e.ts canvas-ui-contract.e2e.ts final-wiring.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts minimap ui-controls.e2e.ts canvas-ui-contract.e2e.ts final-wiring.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts minimap ui-controls.e2e.ts canvas-ui-contract.e2e.ts final-wiring.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

Verification config changes only append Plan 137 to activeWork. Every prior check and browser filename remains. The profile stays focused, with 47 Vanilla, 42 Vue, and 57 Foldkit files. All requested MiniMap and related suites were already selected. Full-profile acceptance remains separate.

## Conformity and deviations

Conforming: UP-127-065, UP-127-066, and UP-127-067 each pass 3/3 in every host through the unchanged translated Chromium runner. UP-127-065 and UP-127-067 now reach and pass the mask assertions after their viewBox assertions. UP-127-066 reads the same retained default rectangle throughout. Vue's existing identity behavior remains passing. Literal core tests separately check geometry and inverse pointer conversion. The complete phase 126 runners preserve their prior ledger outcomes.

Intentionally different: the documented legacy Vanilla boolean MiniMap stays a fixed simple overview. Vue and Foldkit retain their 180 by 120 physical dimensions. Existing inert empty-graph accessibility and keyboard/default-click centering remain Flow affordances because this repair preserves established local contracts. Effect workflow and framework lifecycle ownership remain as required by the project architecture. No new user-visible deviation is introduced in the three compared contracts.

Unverified: live React comparison, other engines, physical devices, exhaustive MiniMap options, retained custom-renderer identity, full-profile acceptance, and collector-side OpenTelemetry delivery. Focused local acceptance is distinct from a full parity or release claim.
