# Plan 134: Upstream Cypress e2e port

## Why and scope

Port ledger phase 127, the 67 executable Cypress e2e cases in the immutable xyflow pin `0a1f9575b25679f2880175de8d3eae21aedde921`. Follow Plan 126's shared-contract approach. Phase 128's 107 component cases remain `not-ported`. Product behavior and imported evidence do not change.

## Deliverables

1. Decode host-neutral Basic, DragHandle, Empty, Figma, Hidden, and Interaction configurations under `packages/conformance/src/upstream-examples/`. Preserve nodes, edges, custom node declarations, and example props. Map framework props through `docs/react-flow-api-correspondence.md`; record unsupported members explicitly.
2. Extend the existing development fixture routes to `/upstream-examples/<name>` in all hosts. Use public APIs, controlled document ownership, upstream change application and unnamed-handle `addEdge` semantics. Retain Plan 130's fitted DOM readiness barrier. Empty and initially hidden graphs must also become ready.
3. Translate all eight specs into `apps/shared-e2e/upstream-cypress/`, with one runner per host. Keep verbatim titles with ledger IDs, upstream line comments, gesture coordinates, and assertions. Preserve Cypress's per-file persistent page and ordered state transitions. Port support commands with source citations. Use web-first expectations for retrying Cypress assertions; preserve explicit upstream waits and do not introduce extra test-body sleeps.
4. Extend the ledger checker to require phase 127 ports and keep phase 128 unported. Populate exact `flowTest` locations and per-host outcomes. Mark observed failures with `test.fail()` only after fixture readiness. Diagnose readiness, props, ownership, selectors, hit targets, and event delivery before attributing a failure to product behavior. Use `intentional-difference` only with an existing documented citation.
5. Group remaining product failures into the numbered follow-up plans, including `plans/138-cypress-remaining.md` with the problem, affected cases, execution steps, acceptance, and conformity boundary. Record exact outcomes and unmapped props below.

## Verification and delivery

Only append verification scope. Run every browser command through `scripts/with-flow-browser-lock.sh` with `--workers=1`. Execute all three runners with `--repeat-each=3` and report differing repeats. Run `bun run research:check-traces` after remapping any shifted cited lines. Finish with `scripts/with-flow-browser-lock.sh bun run verify`, retaining the focused profile and all prior scope. Rerun the named known flakes before diagnosing them. Commit on `plan/134-cypress-e2e-port` with the requested message and coauthor trailer; do not push or merge.

## Results

Implemented on `plan/134-cypress-e2e-port`, based on `c0e44f5906f4ecfd06f49cf701151a834877f219`. Imported evidence and product implementation are unchanged. The six decoded example configs serve all eight Cypress specs, including the three specs that share Basic. All 67 cases have verbatim titles with ledger IDs, pinned source-line comments, and exact declaration locations checked by the ledger checker. Phase 126 outcomes are unchanged; all 107 phase 128 cases remain not-ported per host.

### Fixtures and translation boundary

The development middleware serves `/upstream-examples/<name>` through the existing separate fixture HTML. Each host's upstream entry selects a dedicated example module and uses only its public package API. All three owners explicitly use controlled documents, acknowledge ordinary upstream changes, and use the generic fixtures' unnamed-handle addEdge semantics. React defaultNodes/defaultEdges become controlled owner state as requested; this is a host composition mapping.

Readiness waits for measured visible nodes, the public fit operation, and the fitted viewport's rendered CSS transform. Empty and initially hidden graphs have their own zero-visible-node readiness path. Foldkit measures with the DOM's actual zoom because accepted viewport state can lead the framework patch. The fixtures also map upstream node dimensions, intrinsic DragHandle content, default Bezier paths, background variants, controls, minimaps, hidden-state updates, and the exercised page controls. Basic's mixed-unit fit padding converts to numeric pixel sides using the upstream unit formulas. Figma's context-menu callback cancels the native menu. Untested Basic action-panel operations, logging-only callbacks, and React DevTools UI are outside this port's exercised controls.

Each spec keeps one page for its ordered cases, as Cypress testIsolation:false requires. Each repetition receives a new context. The viewport is 1280 by 720. Empty's browser Math.random is seeded with 134; the original random-position formula and window dimensions are unchanged.

Support commands retain the upstream element-relative coordinates, including drag's calculated screen values passed back as offsets, and its default subject-center mouseup. CDP supplies native pointer and compatibility mouse events without adding a move when only release coordinates change. Held keyboard modifiers are forwarded. Forced clicks dispatch pointer and mouse events directly to the mapped subject, as Cypress does, including when covered. Drag and connection gestures use native pointer capture at the original coordinates; an offscreen start therefore remains a separately documented translation boundary. Downstream offscreen failures are recorded as prerequisite failures, not independent drag defects.

Cypress 13.6.6 is the version pinned by the upstream example package. Its [coordinate rounding](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/dom/coordinates.ts#L174) and [50ms click command delay](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/cy/commands/actions/click.ts#L151) are preserved. The [visibility implementation](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/dom/visibility.ts#L109) permits painted zero-width SVG geometry that Playwright rejects. The click helper uses the same midpoint and a retrying ownership hit test before native input for those SVGs. The corrected Vue and Foldkit UP-127-015 prefix passes with physical hit receipts.

Explicit upstream waits are preserved. No new test-body sleep or retry is added. The click helper includes the upstream driver delay; it is not an extra stabilization wait. Web-first expectations translate retrying should assertions; immediate then assertions remain immediate reads. The action timeout is Cypress's default command timeout of four seconds; test timeouts remain Playwright's default. Collection class checks retain jQuery's hasClass semantics: positive checks require a selected member and negative checks require none. Retained Cypress.$ and then DOM subjects remain retained objects. The final Interaction comparison reads before the queued zoom-out click, matching Cypress's synchronous evaluation order.

Preliminary audits corrected missing modifier forwarding, handle nesting, Foldkit edge hit targets, implicit Bezier defaults, the Foldkit zoomOnScroll default, Vue's rounded demo canvas corners, intrinsic custom-node sizing, background overlay composition, accepted-versus-rendered measurement zoom, retained minimap references, and the pre-queue transform read. Those attempts are excluded from accepted verification counts. The compact diagnostic catalog retains only the final corrected audit observations. It records received values, native and forced synthetic event sequences, hit stacks, nodes, edges, viewport CSS, and checkbox state. Failed prerequisites remain explicit in the ledger reason.

### Phase 127 ledger

| Host    | Pass | Intentional difference | Fail | Not applicable | Total |
| ------- | ---: | ---------------------: | ---: | -------------: | ----: |
| vanilla |   41 |                      2 |   24 |              0 |    67 |
| vue     |   50 |                      0 |   17 |              0 |    67 |
| foldkit |   55 |                      0 |   12 |              0 |    67 |

The ledger is [upstream-test-ledger.json](../research/catalogs/upstream-test-ledger.json). Diagnostic receipts are [upstream-cypress-evidence.json](../research/catalogs/upstream-cypress-evidence.json). The checker now requires phase 127 ports and retains the phase 128 prohibition. Its `--refresh-port-locations` option refreshes declaration lines after formatting without changing outcomes; a normal checker run validates the result.

### Intentional differences and exclusions

Vanilla UP-127-006, "selects an edge by click", and UP-127-011, "selects an edge", select e1-2 correctly, then selected elevation changes shared-SVG order so the following first-wrapper assertion reads unselected e1-3. The existing policy is `research/traces/edge-visibility-stacking.md:34`. The assertions remain expected failures. Vue has independent SVG wrappers, so its similar reordering remains a fail without extending that documented exception. No case is not-applicable.

### Unmapped props

| Host | Config | Upstream prop | Boundary |
| --- | --- | --- | --- |
| foldkit | upstream-examples/basic | selectNodesOnDrag at examples/react/src/examples/Basic/index.tsx:162 | The public Foldkit interaction options do not expose this switch. The false input is recorded in the neutral config but cannot be applied. See docs/react-flow-api-correspondence.md:72. |
| foldkit | upstream-examples/figma | selectNodesOnDrag at examples/react/src/examples/Figma/index.tsx:42 | The public Foldkit interaction options do not expose this switch. The false input is recorded in the neutral config but cannot be applied. See docs/react-flow-api-correspondence.md:72. |
| vue | upstream-examples/figma | multiSelectionKeyCode=[Meta,Shift] at examples/react/src/examples/Figma/index.tsx:39 | FlowCanvas accepts one string, not alternatives. The fixture maps Meta; the Shift alternative is unrepresentable through this public prop and is not exercised by these cases. |
| vue | upstream-examples/interaction | zoomOnPinch=false at examples/react/src/examples/Interaction/index.tsx:70 | This host has no public zoomOnPinch prop/option. The neutral config retains false; these cases exercise mouse input only. See docs/react-flow-api-correspondence.md:70. |
| foldkit | upstream-examples/interaction | zoomOnPinch=false at examples/react/src/examples/Interaction/index.tsx:70 | This host has no public zoomOnPinch prop/option. The neutral config retains false; these cases exercise mouse input only. See docs/react-flow-api-correspondence.md:70. |
| foldkit | upstream-examples/interaction | onNodeClick conditional presence at examples/react/src/examples/Interaction/index.tsx:75 | Foldkit publishes interaction events through ports but exposes no callback-presence prop that changes wrapper pointer-events. The checkbox state is ported; the CSS expectations remain failing. |
| foldkit | upstream-examples/interaction | onEdgeClick conditional presence at examples/react/src/examples/Interaction/index.tsx:76 | Foldkit publishes interaction events through ports but exposes no callback-presence prop that changes wrapper pointer-events. The checkbox state is ported; the CSS expectations remain failing. |

### Failure follow-ups

Every fail is listed below. A case that stops before a later assertion does not establish that later behavior.

#### [Node selection, pane dismissal, and deletion](135-cypress-node-input.md)

| Case | Upstream title | Host | One-line evidence |
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

#### [Edge order, midpoint clicks, and hit ownership](138-cypress-remaining.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-127-006 | selects an edge by click | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3; the first-wrapper assertion fails. |
| UP-127-011 | selects an edge | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3. |
| UP-127-015 | removes an edge | vanilla | The ordinary native click and Backspace delete e1-2, but UP-127-013 left the original graph intact. Two edges remain rather than zero; this is a deletion-prerequisite failure. |
| UP-127-056 | selects an edge by click | vanilla | Forced subject events select e1-2, but it moves after e1-3, so the :first assertion reads unselected e1-3. Interaction never enables edge elevation; ignoring the default-false elevation policy is not covered by the documented Basic shared-SVG exception. |
| UP-127-056 | selects an edge by click | vue | Forced pointer down/up and click reach e1-2 with selection enabled, but its wrapper stays unselected. The earlier UP-127-048 pan put the release point offscreen, where elementsFromPoint returns no hit; forced activation and native hit testing remain separate boundaries. |

#### [Connection completion and prerequisite failures](138-cypress-remaining.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-127-014 | connects nodes | vanilla | The 3-to-4 handle sequence creates xy-edge__3-4, but UP-127-013 left the original two edges intact, so the count is 3 rather than 1; this is a deletion-prerequisite failure. |
| UP-127-058 | connects two nodes | vanilla | After the disabled-selection pan in UP-127-048, the 3-to-4 gesture starts outside the viewport on html and leaves two edges rather than three; this is a pane-admission prerequisite failure. |
| UP-127-058 | connects two nodes | vue | After UP-127-048 panned Node 3 offscreen, the handle sequence starts on html and leaves two edges rather than three; this depends on the earlier pane admission. |

#### [Disabled interaction and callback presence](134-follow-up-interaction-policy.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-127-043 | tries to select a node by click | vanilla | With all three interactivity switches false, the measured Node 1 wrapper computes pointer-events:auto, not none. |
| UP-127-043 | tries to select a node by click | vue | With all three interactivity switches false, Node 1 computes pointer-events:auto, not none. |
| UP-127-043 | tries to select a node by click | foldkit | With all interactivity switches false, Node 1 computes pointer-events:auto, not none. |
| UP-127-046 | allows node clicks when enabled | vanilla | After the capture-element-click checkbox enables the mounted callbacks, Node 1 still computes pointer-events:auto, not all. |
| UP-127-046 | allows node clicks when enabled | vue | After enabling the capture callbacks through reactive props, Node 1 computes pointer-events:auto, not all. |
| UP-127-046 | allows node clicks when enabled | foldkit | Enabling the capture checkbox leaves Node 1 at pointer-events:auto rather than all; Foldkit has event output ports but no callback-presence rendering prop. |
| UP-127-047 | allows edge clicks when enabled | vanilla | After callback enablement, the first edge wrapper still computes pointer-events:none, not visibleStroke. |
| UP-127-047 | allows edge clicks when enabled | vue | After enabling capture callbacks, the first edge wrapper computes pointer-events:none, not visibleStroke. |
| UP-127-047 | allows edge clicks when enabled | foldkit | The first edge SVG computes pointer-events:none rather than visibleStroke after the capture checkbox; callback-presence rendering has no public Foldkit prop. |
| UP-127-049 | tries to connect to nodes | vanilla | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-049 | tries to connect to nodes | vue | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-049 | tries to connect to nodes | foldkit | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-053 | drags a node | vanilla | The earlier disabled-selection Shift gesture in UP-127-048 panned nodes left; this drag begins on offscreen Node 1 and hits html, so its retained transform is unchanged. This depends on pane admission, not a new independent drag diagnosis. |
| UP-127-053 | drags a node | vue | The disabled-selection Shift gesture in UP-127-048 panned nodes offscreen; this drag starts on html at the retained Node 1 coordinates, leaving its transform unchanged. |
| UP-127-055 | selects a node by click | vanilla | After UP-127-048 moved Node 1 offscreen, the ordinary native node click cannot become actionable; the selected assertion is not reached. |
| UP-127-055 | selects a node by click | vue | UP-127-048 moved Node 1 left of the viewport, so its ordinary click never becomes actionable; the selection assertion is not reached. |

#### [Viewport release, zoom factors, and DOM publication](138-cypress-remaining.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-127-036 | drags using right click | vanilla | Right-button center-to-bottom movement reaches the Figma canvas, but the default center mouseup returns the final viewport to its initial position; Node 4 remains partly inside instead of entirely outside. |
| UP-127-062 | zooms by double click | vanilla | Both zoom-out and native double-click arrive, but their factors cancel: the viewport transform equals the synchronously captured pre-queue transform after the original 50ms wait. |
| UP-127-062 | zooms by double click | vue | The control zoom-out and double-click factors cancel, leaving the final CSS transform equal to the synchronously captured pre-queue value after the upstream 50ms wait. |

#### [Minimap viewBox and retained node identity](137-cypress-minimap.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-127-065 | changes zoom level | vanilla | The wheel is delivered and node screen bounds change, but minimap SVG viewBox stays 0 0 200 150; the later mask assertion is not reached. |
| UP-127-065 | changes zoom level | vue | After wheel input changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-065 | changes zoom level | foldkit | The minimap SVG retains viewBox 0 0 180 120 after the wheel; the later mask assertion is not reached. |
| UP-127-066 | changes node position | vanilla | The graph node moves, but the original retained minimap rect keeps its old x attribute after redraw; Vanilla replaces minimap nodes at apps/vanilla/src/minimap.ts:272. |
| UP-127-066 | changes node position | foldkit | The graph node moves after native drag, but the original retained minimap rectangle keeps its old x attribute because update redraws the SVG with replaceChildren at packages/foldkit/src/ui/minimap.ts:220. |
| UP-127-067 | changes node positions via pane drag | vanilla | The native topLeft-to-bottomLeft pan changes graph screen bounds, but minimap SVG viewBox remains 0 0 200 150; the later mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | vue | After the pane pan changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | foldkit | The pane input changes graph screen bounds, but minimap SVG viewBox stays 0 0 180 120; the mask assertion is not reached. |

### Repeat stability

All three complete runners passed their declared outcomes with `--repeat-each=3 --workers=1`: 603 executions, zero unexpected outcomes, skips, retries, or varying cases. Each of the 67 cases ran exactly three times per host. Diagnostic and preliminary adapter audits are excluded.

| Host    | Ordinary passes | Expected failures | Executions | Differing cases |
| ------- | --------------: | ----------------: | ---------: | --------------: |
| vanilla |             123 |                78 |        201 |               0 |
| vue     |             150 |                51 |        201 |               0 |
| foldkit |             165 |                36 |        201 |               0 |

Expected failures include ledger `fail` and `intentional-difference` cases; they do not establish conformity. Rerun Vanilla with `scripts/with-flow-browser-lock.sh bunx playwright test apps/vanilla/e2e/upstream-cypress.e2e.ts --workers=1 --repeat-each=3`; Vue and Foldkit use `scripts/with-flow-browser-lock.sh bunx playwright test -c apps/<host>/playwright.config.ts upstream-cypress.e2e.ts --workers=1 --repeat-each=3`. Terminal JSON receipts were `/tmp/plan134-<host>-repeat-final.json`; the checked-in ledger and diagnostic catalog retain the case classifications.

### Focused verification

Verification remains focused. All previous checks and browser files are retained, and each host adds only `upstream-cypress.e2e.ts`. Existing trace citations shifted by the fixture route branch and adapter expansion were remapped. `bun run research:check-traces` passes 2,965 citations across 81 traces; the architecture checker passes 404 production source files and its rule fixtures.

`scripts/with-flow-browser-lock.sh bun run verify` exited 0: all 18 selected gates passed, profile `focused`, `fullSuite: false`. Quality, architecture, package builds, typechecking, all 2,514 unit tests in 97 files, API inventory, catalog coverage, packed consumers, documentation, recipes, all three application builds, trace citations, ledger, and the saved browser scope passed.

| Host | Saved files | Ordinary passes | Expected failures | Skipped | Total |
| --- | --: | --: | --: | --: | --: |
| vanilla | 47 | 726 | 32 | 2 | 760 |
| vue | 42 | 866 | 19 | 0 | 885 |
| foldkit | 57 | 521 | 15 | 0 | 536 |

There were zero unexpected failures or unexpected passes. Playwright's terminal passed totals include expected failures: Vanilla 758, Vue 885, Foldkit 536. The two pre-existing Vanilla skips are the native pointer-capture and native two-contact pinch placeholders in `apps/vanilla/e2e/advanced-gestures.e2e.ts:914,918`; neither is a phase 127 case. The named next-slices flake passed on its first attempt; no flake rerun was needed. The complete receipt is `/tmp/plan134-verify-final.log`, ending with `Verification passed` and `elapsedMs: 1251855`.

Only the receipt prose changed after this run; the source, contracts, ledger outcomes, and verification selection are the verified candidate. Focused acceptance does not establish full-profile or release acceptance.

### Files added

- `apps/foldkit/e2e/upstream-cypress.e2e.ts`
- `apps/foldkit/src/upstream-examples-fixture.ts`
- `apps/shared-e2e/upstream-cypress/basic.ts`
- `apps/shared-e2e/upstream-cypress/controls.ts`
- `apps/shared-e2e/upstream-cypress/draghandle.ts`
- `apps/shared-e2e/upstream-cypress/empty.ts`
- `apps/shared-e2e/upstream-cypress/figma.ts`
- `apps/shared-e2e/upstream-cypress/helpers.ts`
- `apps/shared-e2e/upstream-cypress/hidden.ts`
- `apps/shared-e2e/upstream-cypress/interaction.ts`
- `apps/shared-e2e/upstream-cypress/minimap.ts`
- `apps/shared/upstream/examples.ts`
- `apps/vanilla/e2e/upstream-cypress.e2e.ts`
- `apps/vanilla/src/upstream-examples-fixture.ts`
- `apps/vue/e2e/upstream-cypress.e2e.ts`
- `apps/vue/src/upstream-examples-fixture.ts`
- `packages/conformance/src/upstream-examples/basic.ts`
- `packages/conformance/src/upstream-examples/draghandle.ts`
- `packages/conformance/src/upstream-examples/empty.ts`
- `packages/conformance/src/upstream-examples/figma.ts`
- `packages/conformance/src/upstream-examples/hidden.ts`
- `packages/conformance/src/upstream-examples/index.ts`
- `packages/conformance/src/upstream-examples/interaction.ts`
- `packages/conformance/src/upstream-examples/model.ts`
- `plans/138-cypress-remaining.md`
- `plans/136-cypress-interaction-policy.md`
- `plans/137-cypress-minimap.md`
- `plans/135-cypress-node-input.md`
- `plans/134-upstream-cypress-e2e-port.md`
- `research/catalogs/upstream-cypress-evidence.json`

## Conformity and deviations

Conforming only at each passing pinned assertion and its named Chromium host boundary. The shared spec state, literal expectations, original gesture coordinates, retained DOM reads, and explicit source waits are preserved. The fixtures use controlled host-native state and fitted DOM readiness rather than React lifecycle internals.

Intentionally different only for the two cited Vanilla shared-SVG ordering cases in this phase. Every other observed mismatch remains fail with evidence, including dependent failures where an earlier case did not establish the intended state. Unsupported props are listed explicitly. Forced clicks use the original synthetic subject dispatch, while ordinary clicks and capture gestures use native input. Offscreen capture-gesture receipts identify the earlier pane-admission difference and do not claim a separate drag defect. These production input and synthetic forced-click paths remain distinct test boundaries.

Unverified beyond the executed assertions: later assertions after an earlier failure, unexercised example controls and props, complete all-node selection where the upstream collection check only proves a selected member, Cypress component phase 128, live React comparison, other engines, physical devices, full-profile integration, release acceptance, and collector-side delivery. No product behavior is repaired, and no push or merge is performed.
