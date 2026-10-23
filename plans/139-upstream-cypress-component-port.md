# Plan 139: Upstream Cypress component port

## Why and scope

Port ledger phase 128, the 107 executable component cases at immutable xyflow revision `0a1f9575b25679f2880175de8d3eae21aedde921`. Follow Plans 126 and 134. Preserve upstream titles, literal expectations, commands, and source citations. Product behavior and imported artifacts do not change.

## Deliverables

1. Port 31 utility cases to `packages/conformance/src/upstream-component/*.test.ts`, using public core or adapter exports. Record upstream-to-Flow API mappings, including data-shape translations and test boundaries.
2. Port 76 hook and component cases to shared browser contracts in `apps/shared-e2e/upstream-component/`, with one runner per host. Extend development fixture routes and mount through Vanilla controllers, Vue components/composables, and Foldkit Runtime ports/clients. Port ControlledFlow ownership and support commands with citations. Preserve retrying Cypress checks with web-first expectations.
3. Populate all phase 128 ledger outcomes and exact test locations. Use `test.fail()` for evidenced failures and cited intentional differences. Reserve not-applicable for framework-only mechanics with no developer-visible equivalent. Test populated state after remount through host lifecycle equivalents.
4. Audit fixture readiness, forwarded props, controlled updates, selector mappings, and delivered events before attributing mismatches to product behavior. Retain full assertions. Group product failures into `139-follow-up-<cluster>.md` specs with receipts and unresolved boundaries.

## Verification

Only add the three runners to `verification.config.json`; preserve existing checks and files. Serialize every browser command with `scripts/with-flow-browser-lock.sh` and `--workers=1`. Run each runner three times with `--repeat-each=3`, record varying cases, validate ledger and remap affected citations, then run the locked focused verifier. Report per-host ordinary passes, expected failures, skips, and exact scope. Known next-slices and Vanilla graph-renderers flakes are rerun before diagnosis. Commit to `plan/139-cypress-component-port` with the requested message and co-author trailer. Do not push or merge.

## Results

Implemented on `plan/139-cypress-component-port`, based on `d6ced9e`. The 18 upstream component files contain 107 executable cases: 31 utility cases and 76 browser cases. Every case retains its leaf title, its `UP-128-NNN` prefix, and an upstream `path:line` comment. Imported artifacts and product behavior remain unchanged.

### Public API mapping for utility cases

All six utility test files import supported exports from `@flow/core`. They run once in the common Vitest gate; the ledger assigns that common result to each host. The data translation follows `docs/api-reference.md:32`: Flow nodes require `label`, retain `data`, use `size` for intrinsic dimensions, and use branded identifiers. `measured` remains runtime geometry.

| Upstream function | Flow public equivalent | Port boundary and correspondence |
| --- | --- | --- |
| `isNode`, `isEdge` | `isNode`, `isEdge` | Structural predicates. `docs/react-flow-api-correspondence.md:392`. |
| `getOutgoers`, `getIncomers` | `getOutgoers`, `getIncomers` | Directed node queries over the original four nodes and three edges. `docs/react-flow-api-correspondence.md:401`. |
| `addEdge` | `addEdge` | Original append, duplicate, and malformed JavaScript cases. `docs/react-flow-api-correspondence.md:391`. The malformed source case asserts only if a call throws; the port preserves that conditional acceptance. |
| `applyNodeChanges`, `applyEdgeChanges` | Matching exports | Ordered immutable array reducers, including transient measured dimensions and replace behavior. `docs/react-flow-api-correspondence.md:382,390`. |
| `adoptUserNodes` | `createFlowGraph`, `projectFlowInternalNode`, `constrainNodePosition` | Public graph and internal-node projections replace mutable upstream lookups. Global extent is a separate constraint operation in Flow. Tests preserve all absolute positions and parent/origin expectations. `packages/core/src/public.ts:244,298,331`. |
| `calculateNodePosition` | `createFlowGraph`, `constrainNodePosition` | Resolve the parent's intrinsic `size` and the child's measured dimensions, then constrain the proposed absolute position. No DOM measurement is supplied for the parent. `packages/core/src/public.ts:298,331`. |
| `getNodesBounds` | `getNodesBounds` | Plain nodes plus the public internal lookup in the first five cases; resolvable and stale IDs in the sixth. `packages/core/src/public.ts:688`. The older correspondence row at `docs/react-flow-api-correspondence.md:325` predates this export. |
| `updateNodeInternals` | `applyNodeMeasurement`, `emptyFlowMeasurementState` | The source's no-throw assertion runs at Flow's measurement-update boundary with the missing parent preserved. Browser DOM measurement, observer ordering, and a later orphan projection query are outside this unit assertion. `packages/core/src/public.ts:239,241`. |

### Fixture and assertion boundaries

The development route is `/upstream-component/<case-number>`. It shares the existing upstream HTML entry and Vite middleware. Vanilla mounts the public controller. Vue mounts `FlowCanvas`, uses `defaultDocument` for uncontrolled cases, and observes `useNodes`, `useEdges`, `useViewport`, and `useFlow`. Foldkit mounts `createProgram` through `Runtime.embed`, observes public stores and ports, and reads or edits through the instance and viewport clients. Its stable owner contains the Runtime mount target so measurements continue after Runtime replaces that target.

Controlled ownership follows `examples/react/cypress/support/ControlledFlow.tsx:16`. Node and edge reducers apply only enabled handlers. Connection additions have one owner, `onConnect`; Flow's additional connection-add deltas are not applied a second time through the edge-change stream. The source commands at `examples/react/cypress/support/commands.ts:1` reuse Plan 134's gesture translation, including the retained drag subject, offset coordinates, and original 50ms and 250ms waits. Update and remount buttons call public host operations.

The browser viewport is 500 by 500. The pinned React Cypress configuration overrides only e2e dimensions. Cypress 13.6.6 sets distinct component defaults in [its configuration source](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/config/src/options.ts#L451-L458). An earlier diagnostic used e2e defaults and is excluded from final receipts. The `onlyRenderVisibleElements` prop maps to `renderOnlyVisible` in Vanilla and Vue, and to the identically named Foldkit option. A culling case waits for the mounted canvas rather than requiring measurements from nodes it must not mount.

Each case gets a fresh browser page. Callback histories retain the actual callback arguments, like Cypress spies. Viewport lifecycle counts have one Foldkit owner, the viewport event port, even when a gesture also publishes interaction telemetry. Foldkit initialization counts come from the real interaction port; store readiness does not synthesize another initialization callback. Histories contain values read from public APIs; the fixture does not seed empty collections or readiness transitions to satisfy assertions. The remount cases execute each host's lifecycle equivalent and require every post-remount custom-node read to see two nodes. Pure React hook ordering is not claimed. The scroll-enabled source case UP-128-073 contains no active scroll assertion; its port exercises the same wheel command without inventing a result assertion.

The initial audits caught fixture errors in selector translation, the component viewport, controlled connection ownership, visibility prop names, and Foldkit's detached measurement owner. Those attempts are excluded from product-failure evidence. Invalid default viewport and rejected fit options remain observable at the public mount, operation, and rendered-output boundaries. A rejected mount has a fixture receipt but no successful canvas claim.

### Phase 128 ledger

| Host    | Pass | Intentional difference | Fail | Not applicable | Total |
| ------- | ---: | ---------------------: | ---: | -------------: | ----: |
| vanilla |   87 |                      4 |   16 |              0 |   107 |
| vue     |   93 |                      2 |   12 |              0 |   107 |
| foldkit |   93 |                      2 |   12 |              0 |   107 |

The 31 common utility passes are credited to each host. The browser results are 56 ordinary passes for Vanilla and 62 for each of Vue and Foldkit, before counting declared expected failures. No component case is skipped or not-ported. The ledger checker re-enumerates all 224 executable pinned cases and now requires phase 128 ports. Every flowTest points to its exact declaration title.

### Confirmed failure follow-ups

Every fail is retained below. The table names the first failing assertion, and does not claim that later assertions passed. The checked-in evidence catalog retains actual public callback arguments, node boxes, viewport values, input targets, and the Runtime crash output.

#### [Public state and viewport observers](139-follow-up-observers.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-128-002 | handles defaultEdges | vanilla | The controller starts with the supplied edge; its getter/subscription history never contains the upstream empty edge array. |
| UP-128-002 | handles defaultEdges | vue | The defaultDocument edge composable starts with the supplied edge and never emits the upstream empty edge array. |
| UP-128-003 | handles nodes | vue | useNodes() omits measured from its node snapshots even after dimensions events report 100x50 for both nodes, so the literal measured-node array is absent. |
| UP-128-004 | handles defaultNodes | vanilla | The default document is populated synchronously; node history never contains []. The later measured-node equality is not reached. |
| UP-128-004 | handles defaultNodes | vue | The defaultDocument node composable never emits []; the later measured-node equality is not reached. |
| UP-128-005 | returns false for no nodes | vanilla | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-005 | returns false for no nodes | vue | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-010 | handles zoom in | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-010 | handles zoom in | foldkit | The wheel changes the viewport zoom above 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-011 | handles zoom out | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-011 | handles zoom out | foldkit | The wheel changes the viewport zoom below 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-040 | handles onMove handlers | vanilla | onMove has already fired once at mount, violating the initial zero-call assertion before the pane drag is attempted. |

#### [Declared dimensions and measurement batches](141-component-measurements-and-renderers.md#declared-node-dimensions-and-initial-measurement-batches)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-128-003 | handles nodes | vanilla | Both nodes declare style width 100 and height 50, but their public measured widths and DOM boxes are 150 rather than 100. |
| UP-128-043 | receive initial dimension change | vanilla | The single initial dimensions batch reports 150x44 and 150x50, rather than the literal 100x40 and 80x50. |
| UP-128-043 | receive initial dimension change | vue | The single initial dimensions batch reports Node 1 as 100x44 rather than 100x40; Node 2 reports the required 80x50. |
| UP-128-043 | receive initial dimension change | foldkit | Initial measurements arrive as two separate one-node callback batches rather than the required single batch. The literal dimension equality is not reached. |

#### [Node change payloads](139-follow-up-change-events.md)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-128-044 | receive replace and dimension change | vanilla | After the update button and all three callback batches, the retained replacement item still has measured 150x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | vue | After the update button and all three callback batches, the retained replacement item still has measured 100x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | foldkit | Two initial measurement callbacks shift the source order: the second recorded call contains Node 2 dimensions rather than the expected replacement. Later payload checks are not reached. |
| UP-128-045 | receive select and unselect change | vanilla | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | vue | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | foldkit | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-046 | receive position change | vanilla | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | vue | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | foldkit | The completed position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |

#### [Node input callbacks](142-component-viewport-and-input.md#input-follow-up)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-128-035 | handles onNodeClick | vanilla | A native stationary click reaches Node 1 with nodeDragThreshold=0, selects it, and leaves the registered onNodeClick count at 0 rather than 1. |
| UP-128-037 | handles onNodeMouse handlers | foldkit | Native contextmenu and dblclick both reach Node 1; onNodeContextMenu fires once, but onNodeDoubleClick stays at 0. Later hover assertions are not reached. |

#### [Default edge renderer registration](141-component-measurements-and-renderers.md#default-edge-renderer-registration)

| Case | Upstream title | Host | One-line evidence |
| --- | --- | --- | --- |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | vanilla | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | foldkit | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |

#### [Viewport options and initial extents](142-component-viewport-and-input.md#viewport-follow-up)

| Case | Upstream title | Host | One-line evidence |
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

### Intentional differences and not-applicable cases

| Case | Upstream title | Hosts | Reason and citation |
| --- | --- | --- | --- |
| UP-128-069 | displays no nodes | vanilla | The node starting at x=500 remains inside Vanilla's documented overscan. The unchanged assertion requires zero nodes; Flow renders one. `research/traces/viewport-culling.md:30`. |
| UP-128-070 | displays one node | vanilla | The same overscan retains Node 2 alongside the node at the origin. The unchanged assertion requires one node; Flow renders two. `research/traces/viewport-culling.md:30`. |
| UP-128-075 | displays it on the bottom right | vanilla, vue, foldkit | Flow intentionally has no attribution mechanism, so there is no branding element to place. `research/catalogs/react-flow-parity-audit-2026-10-13.json:1839`. |
| UP-128-076 | displays it on the top left | vanilla, vue, foldkit | The same attribution policy excludes an element to reposition and the attributionPosition prop. `research/catalogs/react-flow-parity-audit-2026-10-13.json:1839`. |

No case is not-applicable. The three React store-remount cases port the visible populated-state outcome through host lifecycle equivalents. Vanilla and Vue count public internal projections for the supplied nodes, while Foldkit enumerates its public internal-node result. This does not claim access to a private React store or parity for hidden stale entries.

### Files added

- `apps/foldkit/e2e/upstream-component.e2e.ts`
- `apps/foldkit/src/upstream-component-fixture.ts`
- `apps/shared-e2e/upstream-component/components.ts`
- `apps/shared-e2e/upstream-component/events.ts`
- `apps/shared-e2e/upstream-component/helpers.ts`
- `apps/shared-e2e/upstream-component/hooks.ts`
- `apps/shared-e2e/upstream-component/view.ts`
- `apps/shared/upstream/component.ts`
- `apps/vanilla/e2e/upstream-component.e2e.ts`
- `apps/vanilla/src/upstream-component-fixture.ts`
- `apps/vue/e2e/upstream-component.e2e.ts`
- `apps/vue/src/upstream-component-fixture.ts`
- `packages/conformance/src/upstream-component/adopt-user-nodes.test.ts`
- `packages/conformance/src/upstream-component/apply-changes.test.ts`
- `packages/conformance/src/upstream-component/calculate-node-position.test.ts`
- `packages/conformance/src/upstream-component/fixtures.ts`
- `packages/conformance/src/upstream-component/geometry.ts`
- `packages/conformance/src/upstream-component/get-nodes-bounds.test.ts`
- `packages/conformance/src/upstream-component/graph-utils.test.ts`
- `packages/conformance/src/upstream-component/update-node-internals.test.ts`
- `plans/139-follow-up-change-events.md`
- `plans/142-component-viewport-and-input.md`
- `plans/141-component-measurements-and-renderers.md`, measurements and default renderers.
- `plans/139-follow-up-observers.md`
- `plans/139-upstream-cypress-component-port.md`
- `research/catalogs/upstream-component-evidence.json`

### Repeat stability

The final runs use Cypress's four-second action and assertion retry budget, a 30-second fixture navigation/readiness budget, and the default Playwright test timeout. Source assertion values and explicit waits remain unchanged. Foldkit node drags wait for a public instance query and its rendered frame after native release. That completion barrier prevents a queued controlled preview from being mistaken for a permanent position change.

| Host | Ordinary passes | Expected failures | Skipped | Unexpected | Executions | Differing outcomes |
| --- | --: | --: | --: | --: | --: | --: |
| vanilla | 168 | 60 | 0 | 0 | 228 | 0 |
| vue | 186 | 42 | 0 | 0 | 228 | 0 |
| foldkit | 186 | 42 | 0 | 0 | 228 | 0 |

Each of the 76 browser cases ran exactly three times per host. Expected failures include both fail and intentional-difference ledger statuses; they are not conformity. No test was retried or skipped. The common utility run passed all 31 cases in six files.

First-assertion boundary variation: none.

Rerun Vanilla with `scripts/with-flow-browser-lock.sh bunx playwright test apps/vanilla/e2e/upstream-component.e2e.ts --workers=1 --repeat-each=3`. Vue and Foldkit use `scripts/with-flow-browser-lock.sh bunx playwright test -c apps/<host>/playwright.config.ts upstream-component.e2e.ts --workers=1 --repeat-each=3`. Terminal receipts are `/tmp/plan139-<host>-repeat4.json`; the checked-in evidence catalog retains the three outcomes and diagnostic state for every nonpassing case. Preliminary five-second-budget runs and fixture audits are excluded from this table.

### Focused verification

`scripts/with-flow-browser-lock.sh bun run verify` passed with exit code 0 on 2026-10-22. It selected the focused profile, all 18 saved gates, and `fullSuite: false`. The configuration preserves every existing check, file, and metadata field, adding only the three component runners. Browser commands use one worker under the shared lock.

The common unit gate passed 2,556 tests in 103 files, including all 31 new utility cases in six files. Quality, architecture (417 production source files and rule fixtures), package builds, typechecking, API inventory, catalog coverage, packed consumers, documentation, recipe registry, three app builds, 3,162 citations across 84 traces, and the 224-case upstream ledger passed.

| Host | Saved browser files | Ordinary passes | Expected failures | Skipped | Unexpected | Total | Reporter duration |
| --- | --: | --: | --: | --: | --: | --: | --- |
| vanilla | 51 | 809 | 29 | 2 | 0 | 840 | 7.9m |
| vue | 49 | 950 | 20 | 0 | 0 | 970 | 7.0m |
| foldkit | 62 | 600 | 17 | 0 | 0 | 617 | 7.2m |

Playwright's terminal accepted totals (838, 970, and 617) include expected failures. The table separates them using the reporter's individual result lines. The two skipped cases predate this port; phase 128 skips none. No retry was needed for the named existing flakes. The terminal verifier receipt is `/tmp/plan139-verify-final.log`; elapsed time was 1,367,446ms. Only result prose and the evidence catalog's verification metadata were added after this run. This is focused acceptance, not a full-profile or release-parity claim.

## Conformity and deviations

**Conforming within the named boundaries:** all 107 executable source cases have verbatim leaf titles, ledger identifiers, source citations, and public Flow test locations. The 31 common utility cases pass at the documented public core boundaries. The three hosts exercise all 76 browser cases through public mounts and native gestures. Source literals and retrying assertions remain intact. Imported research artifacts and product implementations do not change.

**Intentionally different:** the eight host/case cells in the intentional-difference table retain their literal expected-failure assertions and their existing policy citations. They are not counted as conforming. No case is not-applicable: the visible remount outcomes have host equivalents.

**Observed failures:** the 40 host/case cells in the six follow-up clusters remain `fail` in the ledger and `test.fail()` in the browser contracts. Each receipt records the first failed assertion and public or rendered evidence. Later assertions after that boundary remain unverified. Expected-failure acceptance by Playwright does not establish upstream conformity.

**Unverified:** private React store enumeration, React hook scheduling, DOM orphan refresh and later projection after the utility measurement boundary, inactive source assertions, live upstream execution, other browser engines/devices, the full verification profile, release acceptance, and collector-side OpenTelemetry delivery. The focused verification and three-repeat component runs establish only their reported scope. Source resemblance is not a parity claim.
