# Plan 157 layout engine selection and force controls

Plan 157 implements unit 4 of Plan 149 under maintainer D4. The existing measured Dagre/ELK and dynamic scenes remain available. Auto Layout gains same-document engine selection; Force Layout gains common live controls.

## Public reference evidence

On 2026-10-25 the public [Auto Layout description](https://reactflow.dev/examples/layout/auto-layout) listed runtime selection among Dagre, d3-hierarchy and ELK. The public [Force Layout description](https://reactflow.dev/examples/layout/force-layout) listed adjustable force strength and distance. The [layout guide](https://reactflow.dev/learn/layouting/layouting) describes D3's single-root tree requirement and uniform layout cells, measured engine integration, async ELK and force dragging.

The accessible [force demo](https://example-apps.xyflow.com/react/pro/force-layout/index.html) rendered strength and distance text inputs. A collaborative-browser DOM read observed values `-1000` and `150`, with empty min/max/step attributes. Its visible instructions described adding nodes and connections. Those creation interactions are outside unit 4. Subscription source was not downloaded. Hidden algorithm parameters and exact coordinate parity remain unverified. Flow's finite strength range -2000..0 and distance range 20..400 are explicit integration policy; the observed defaults are reused.

## Production path and ownership

Vanilla enters the Auto Layout scene at `apps/vanilla/src/ui/layout-recipes.ts:368`; its owner bridges the public controller at `apps/vanilla/src/ui/layout-recipes.ts:321`. Vue enters the same scene through `apps/vue/src/layout-recipes.ts:307`; its mounted controls bridge `useFlow()` at `apps/vue/src/layout-recipes.ts:221`. Foldkit enters through `apps/foldkit/ui-recipes/layout/main.ts:527`; its owner uses public snapshots, edit, history and viewport clients at `apps/foldkit/ui-recipes/layout/main.ts:322`.

The actual engine selector and spacing inputs enter the shared browser owner at `apps/shared/layout/browser.ts:161`. A measured input key excludes the layout's own positions; an authored revision includes node positions, opaque fields, complete edges and measured geometry at `packages/core/src/domain/flow-layout-request.ts:73`. Settings are schema decoded at `packages/core/src/domain/flow-layout-request.ts:99`. The session at `packages/core/src/domain/flow-layout-request.ts:122` decodes output, checks the active generation, revision and settings, and discards stale results.

The optional integration starts at `packages/layout/src/public.ts:34`. Dagre reads measured boxes and converts centers. ELK consumes measured sizes and returns top-left positions. Hierarchy rejects unsupported topology at `packages/layout/src/public.ts:17`, uses maximum measured breadth/depth for its cells, and offsets each node by its own half-size. Core position application retains authored node data and rounds accepted positions at `packages/core/src/domain/flow-layout.ts:132`. Each host submits one public atomic edit and fits the viewport. Measurement identity uses whole graph units, matching the established recipe keys and rounded position application; the engines still receive the actual measured boxes. This prevents fit-related floating-point noise from starting another layout. Vue reads after its framework tick at `apps/vue/src/layout-recipes.ts:258`, so synchronous state callbacks do not reuse the previous reactive document after a removal.

The accepted position transaction follows the normal host state and renderer paths, in production as well as in the browser tests:

- Vanilla's public edit delegates at `apps/vanilla/src/mount-flow.ts:14428` to the serial edit owner at `apps/vanilla/src/mount-flow.ts:12110`. That owner prepares and publishes the semantic proposal. The uncontrolled host reconciles accepted graph geometry and writes absolute node positions at `apps/vanilla/src/mount-flow.ts:8347`; the DOM helper writes the node transform at `apps/vanilla/src/mount-flow.ts:1759`. Edge endpoint resolution reads the accepted document at `apps/vanilla/src/mount-flow.ts:6410`.
- Vue prepares the transaction at `packages/vue/src/flow-canvas.ts:4609` and replaces the uncontrolled `ownedDocument` at `packages/vue/src/flow-canvas.ts:4678`. Node VNodes receive graph-space left/top styles at `packages/vue/src/flow-canvas.ts:9583`. The edge renderer resolves the current document and measured handle anchors at `packages/vue/src/flow-canvas.ts:9760` and writes the SVG path at `packages/vue/src/flow-canvas.ts:9835`.
- Foldkit's port message enters `EditRequest` at `packages/foldkit/src/graph.ts:3850` and prepares the atomic edit at `packages/foldkit/src/graph.ts:1354`. Its uncontrolled model accepts the resulting document. The view combines it with measurements at `packages/foldkit/src/graph.ts:7509`, then writes node position and size styles at `packages/foldkit/src/graph.ts:7582`. Edge geometry uses the new absolute node positions and measured handles at `packages/foldkit/src/graph.ts:5507`, with SVG output at `packages/foldkit/src/graph.ts:6026`.

Foldkit retains Plan 146's original render waits for the existing scenes at `apps/foldkit/ui-recipes/layout/main.ts:159`. Its new shared-control owner also waits for rendered node positions and handle sides, remeasures, fits, and waits for the browser-normalized transform before completion. Model acknowledgment alone does not publish layout readiness.

Force controls enter at `apps/shared/layout/browser.ts:351`; the optional solver at `packages/layout/src/force.ts:26` owns only D3 data and manual ticks. The browser owns requestAnimationFrame, active-drag pause, accepted drop pinning, epoch cancellation, and disposal. The framework host supplies accepted reads and edits. The force settings boundary at `packages/layout/src/force.ts:64` reconfigures link distance and charge strength in the existing simulation. The solver cools and stops scheduling. No worker or transport is introduced.

Accepted force frames opt into a continuous history context. Core chooses that gesture baseline at `packages/core/src/domain/flow-history.ts:181`; ordinary unopened gesture IDs still do not coalesce. A fresh run gets a fresh ID. Automatic layout joins its originating graph edit, and force relaxation joins its accepted drop through the explicit continuation mode. Another semantic edit or replay ends the previous coalescing sequence. Recipe replay pauses scheduling and restores the accepted solver coordinates. No document schema fields are added. Node spreads preserve opaque data, and clipboard retains its existing document contract.

Settings decode uses `documentDecode`; latest-result preparation uses `editPrepare` with semantic-change/node-count attributes. Host public edits retain their existing controller, semantic commit and lifecycle telemetry. The browser failure boundary uses `editFailure` with structured error text at `apps/shared/layout/browser.ts:62`. No per-pointer-move logging is added. OTLP delivery is not claimed.

## Test path and results

Pure request tests are separate from browser delivery at `packages/core/src/domain/flow-layout-request.test.ts:1`. They use a deliberately delayed engine capability to prove out-of-order completion, document-edit invalidation, cancellation and disposal. An integration test also holds a real ELK result until a real hierarchy request finishes, then asserts that the ELK result is discarded. Real Dagre, D3 hierarchy, ELK and force unit tests run at `packages/layout/src/layout.test.ts:1`. The unchanged history suite protects explicit gesture boundaries.

The host wrappers `apps/vanilla/e2e/layout-engines.e2e.ts:1`, `apps/vue/e2e/layout-engines.e2e.ts:1` and `apps/foldkit/e2e/layout-engines.e2e.ts:1` run shared browser acceptance at `apps/shared/layout/layout-engine-acceptance.ts:1`. Tests gesture through the real engine/direction/spacing and force controls, compare rendered positions and edge ordering, exercise rapid real ELK switches, undo/redo, active force drag, settling and pagehide disposal. Adversarial measured-size, edge-only, multi-root, cyclic and empty-document changes use the recipe inspection handle, which forwards each host's public edit API. The measured-size test submits a border-box style edit and asserts an actual untransformed DOM width of 300 pixels before checking relayout. Foldkit gives an existing measurement precedence over declared `node.size` at `packages/foldkit/src/graph.ts:7560`; direct declared-size adoption is a separate renderer boundary. The test exercises new browser measurement, not that adoption rule. Delayed completion is deterministic in the pure session test; the browser race uses real ELK without an artificial timeout.

All 43 scoped browser cases pass: 13 Vanilla, 13 Vue and 17 Foldkit. These include 21 new acceptance cases and 22 existing regression cases, including the three Plan 146 readiness cases. The focused unit run passes 53 cases; the full unit run passes 2,702 cases across 118 files.

The commands below ran from the worktree root. Every browser command acquired and released its own lock and used one worker.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed initial setup. |
| `bun install` | Passed after adding the optional integration and hierarchy pins; updated bun.lock. |
| `bun run typecheck` | Passed package builds and strict checks, including the newly covered Foldkit layout entry. |
| `bun run test packages/core/src/domain/flow-layout-request.test.ts packages/core/src/domain/flow-history.test.ts packages/layout/src/layout.test.ts` | 53 passed. |
| `bun run test` | 2,702 passed across 118 files. |
| `bun run check` | Passed quality and formatting. |
| `bun run check:architecture` | Passed. |
| `bun run --cwd apps/foldkit build` | Passed app build and app typecheck. |
| `bun run docs:generate-api` | Updated the generated transaction-context fields. |
| `bun run docs:check` | Passed. |
| `bun run research:check-traces` | Passed. |
| `scripts/with-flow-browser-lock.sh bun run playwright test layout-recipes.e2e.ts layout-engines.e2e.ts --workers=1` | 13 passed. |
| `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts layout-recipes.e2e.ts layout-engines.e2e.ts --workers=1` | 13 passed. |
| `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts layout-recipes.e2e.ts layout-engines.e2e.ts layout-readiness.e2e.ts --workers=1` | 17 passed. |

Initial runs exposed missing measurement subscriptions, incomplete DOM-position assertions, a force node outside the usable view, fit measurement feedback, and an early Vue removal read. Diagnostics traced the feedback to exact floating-point keys; whole-unit identity and framework-tick reads resolved it. The size test now explicitly controls the box model and verifies a real new browser measurement. The unchanged regression assertions and Foldkit readiness waits remain intact. Temporary diagnostic files were removed.

Only additions are made to verification.config.json. The final repository gate is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`, issued after this evidence/catalog update. It uses the entire configured focused scope, including all previously selected checks and browser files. Its outcome is reported with the commit; the focused profile is not the full profile.

The catalog sets Auto Layout and Force Layout to C in every host. Counts are recomputed from all 200 entries: 195 parity entries, 187 close in all hosts, three stretch entries and two intentional gaps. Pro counts per host are eight C, five P and three G. Dynamic Layouting stays P.

## Conformity and deviations

- Conforming to the accessible public outcomes: same-document engine selection, measured layout, adjustable force strength/distance, interactive force dragging and solver settling. Acceptance compares structural output and documents, not identical coordinates across algorithms.
- Intentionally different: Dagre is the default under D4; ELK is opt-in; hierarchy rejects unsupported graphs visibly. Maximum measured cells accommodate variable node sizes. Flow's validated parameter ranges, explicit cooling, session-only settings and bounded history policy are documented local choices.
- Unverified: hidden Pro source, exact engine coordinates, undocumented reference slider ranges, workers, saved engine settings, animation/expand-collapse outcomes in units 5 and 6, and collector-side telemetry delivery. Dynamic Layouting remains partial. A focused verification pass does not establish full-suite or broad upstream parity.
