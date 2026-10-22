# Plan 136: Interaction policy styling (upstream Cypress follow-up)

## Problem and scope

Map disabled global switches and conditional callback presence through public APIs. The following observations describe the baseline. UP-127-048 passes its absence-of-marquee assertion but pans the disabled graph in Vanilla and Vue; subsequent tests begin offscreen. The downstream failures therefore need a pane-admission investigation before any independent drag, selection, or connection diagnosis. Foldkit has no public callback-presence rendering prop.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
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

## Execution

1. Read each ledger entry, its pinned source, and its diagnostic receipt. Run the complete corresponding spec sequence through `/upstream-examples/<name>`; these Cypress files preserve page state across cases.
2. Temporarily rate the target case as pass to reproduce its unchanged assertion as an ordinary failure. Prove prerequisite state and pointer targets before attributing a new defect. Record the exact received value and any earlier case that blocked the intended state.
3. Trace the public browser entry, accepted document, geometry, DOM effects, and rendered output with exact source locations. Keep production and synthetic test paths separate. Follow `docs/standards.md` and existing observability ownership.
4. Implement only the proven repair in the appropriate package or host. Keep titles, assertions, numbers, commands, default release positions, and source timing unchanged. Add a focused regression only when the upstream case does not prove the cause.
5. Update only proven ledger outcomes. Retain unresolved failures and existing documented deviations. Add verification scope without removing any prior checks or browser files.

## Acceptance

Run each complete affected host runner with `--repeat-each=3`, then the saved focused verifier. Use `scripts/with-flow-browser-lock.sh` and `--workers=1` for every browser invocation. Preserve every previously passing contract. Report ordinary passes, expected failures, skipped cases, unexpected results, and differences between repeats. Remap shifted trace citations and run `bun run research:check-traces`. Commit or publish only with the authority granted for the follow-up.

## Instrumented baseline and root causes

The baseline is main `6c934d7`. An ordinary-failure run temporarily set the six scoped cases to pass without changing their assertions. Vanilla reproduced four style failures plus the worker-restart-dependent edge-selection failure. Vue reproduced the four style failures. Foldkit reproduced the same four style failures. Ordinary failures restart the worker and rerun beforeAll, so their later passing cases do not establish the shared-page sequence.

A second run retained the original ledger and attached computed styles, rendered bounds, viewport transforms, and native pointer targets after every Interaction case. All 21 outcomes matched the original classifications in every host. Vanilla and Vue changed their viewport from (0, 0) to (-999, 150) in UP-127-048 while creating no marquee. Node 1 then had x=-749. UP-127-053 pressed html at (-674, 174), and UP-127-055 could not reach the node. Foldkit retained (0, 0), and both later cases already passed.

The source decides the pane policy unambiguously. Pinned `packages/react/src/container/FlowRenderer/index.tsx:99` passes `panOnDrag={!selectionKeyPressed && panOnDrag}` independently of `packages/react/src/container/Pane/index.tsx:94` gating selection on elementsSelectable. Vanilla and Vue now suppress pane pan while the configured selection key is held. Foldkit already did this. A native pane regression also found a Foldkit port configuration bug. The hit target was the viewport, but a temporary rendered-model probe showed panOnDrag=false and selectionKeyPressed=false. The example fixture had inherited Foldkit's public false default instead of upstream's true default. The fixture now forwards options.panOnDrag ?? true, matching the existing generic fixture without changing Foldkit's public default. The probe was removed before acceptance. The node and edge styles were separate defects in every host. Handles explicitly re-enabled auto hit testing instead of inheriting disabled connectability.

The full browser, public API, state, geometry, DOM, acknowledgement, and test paths are in [the research trace](../research/traces/interaction-policy-styling.md). Baseline receipts are `/tmp/plan136-baseline-{host}.json` for ordinary failures and `/tmp/plan136-sequence-{host}.json` for the retained-page sequence. Temporary afterEach instrumentation was removed before acceptance.

## Public signal and styling

Vanilla uses its existing mount callbacks. Vue declares rendering-sensitive callbacks as props. Vue skips component updates for listeners declared only in emits, which left a disabled node at none when only onNodeClick changed. The added callback-only fixture reproduced this before the fix and passed afterward. Vue invokes those declared callback props with the same names and payloads. Foldkit now exposes `createFoldkitInteractionHandlers(runtime.ports, handlers)`. The handler names match Vanilla and Vue: onNodeClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, and onEdgeClick. The client's set method replaces handlers. dispose unsubscribes and clears their pointer admission. One client owns these callbacks per Runtime.

Foldkit keeps callback functions outside its Model and messages. A typed HostAction carries only nodePointerHandlers and edgeClickHandler Booleans through the existing application/reducer path. The callback client decodes serialized InteractionEvent records, invokes matching handlers, and uses existing Effect span names for presence changes and failures. It adds no normal pointer-move logs. Direct raw event-port subscriptions continue to observe admitted input without enabling disabled wrappers.

All hosts derive node pointer events from effective draggable/selectable flags and callback presence. Active nodes compute all, disabled nodes compute none. Edges compute visibleStroke when selectable or when an edge-click handler is present, and otherwise none. Hit paths inherit the wrapper policy. Disabled handles compute none and connectable handles opt into pointer input. User node style precedence is preserved. The draggable/selectable/no-pan classes follow the compared policy; the upstream middle-button exception is retained ahead of no-pan filtering.

The two obsolete Foldkit conditional-callback unmapped entries are removed from the ledger. The public API and correspondence docs describe the callback client. This introduces no new intentional difference.

## Changed tests

No upstream title, assertion, command, coordinate, delay, or release position was changed. The shared helper's temporary baseline attachments and round 2 diagnostic probes were restored before acceptance.

The added native interaction-policy contract checks ordinary pane pan through a disabled node, dynamic callback hit testing and delivery, callback removal, and a stationary viewport during disabled Shift selection. The new Vue-specific fixture changes only node and edge callback presence while keeping graph props stable. Its node assertion failed with received none before the declared-prop fix; the original callback-only check then passed. Round 2 loaded the package stylesheet in that fixture so its edge CSS assertion tests the shipped styles.

One existing Flow test changed: `apps/vue/e2e/events-and-changes.e2e.ts:196`. It first turns off `nodesConnectable` while leaving dragging on. The pinned handle CSS makes that handle `pointer-events: none`, and NodeWrapper still admits a draggable node (`packages/system/src/styles/init.css:233`; `packages/react/src/components/NodeWrapper/index.tsx:90,206`). A native attempt to connect therefore drags node `a`. The test now asserts that observed drag, checks that the later locked pan adds no node movement or drag-start event, clicks the disabled handle through a native screen point, and uses untouched node `s` for the later restored-connection check. The original `a` and `b` handles had become exactly coincident after the drag. No upstream assertion changed.

The existing Foldkit Flow test at `apps/foldkit/e2e/events-and-changes.e2e.ts:244` still expects a raw node-click report with all three interactivity switches off and no callback client. `docs/public-api.md:417` documents node clicks with selection off. The pinned NodeWrapper gives this wrapper `pointer-events: none` without a callback (`packages/react/src/components/NodeWrapper/index.tsx:90,206`). The test and the documented contract were left unchanged under the plan's conflict rule; the conflict remains open.

Two existing Vanilla Flow tests changed. `apps/vanilla/e2e/canvas.e2e.ts:339` now checks that clicking an inactive edge causes no graph change or edge selection; the pinned EdgeWrapper and CSS (`packages/react/src/components/EdgeWrapper/index.tsx:194`; `packages/system/src/styles/init.css:144`) let that click reach the pane, which may publish an unchanged viewport. `apps/vanilla/e2e/ui-controls.e2e.ts:70` sends a native click at the disabled node's screen point because the pinned NodeWrapper makes locator clicking non-actionable. After proving that a locked-node drag pans the viewport, it centers the viewport before its independent connection assertion; the prior panned position put the target at the edge where connection auto-pan moved it during the drag. Both changes retain their original behavioral intent.

Two additional Vue Flow tests changed after broad verification. `apps/vue/e2e/activation-callbacks.e2e.ts:13` gives its custom nopan marker a unique test ID because the pinned NodeWrapper also applies the configured nopan class to draggable node wrappers (`packages/react/src/components/NodeWrapper/index.tsx:191`). `apps/vue/e2e/ui-controls.e2e.ts:44` clicks the disabled node at its native screen point under the pinned NodeWrapper pointer policy (`packages/react/src/components/NodeWrapper/index.tsx:90,206`). Its disabled-handle drag now pans the pane, so it centers the endpoints before the later independent restored-connection check. The two files passed 9/9 on a focused rerun.

## Results

The complete unchanged Cypress port passed 201/201 in each host with `--repeat-each=3` and one worker. Every scoped assertion passed 3/3 per host. The 201 includes retained ledger expected failures: Vanilla 45, Vue 24, Foldkit 15. Ordinary passing assertions were respectively 156, 177, and 186. No upstream assertion, title, or helper changed. The Foldkit first attempt exposed regressions in UP-127-012 and UP-127-015. Native hit instrumentation found its canvas-sized edge SVG above the node and the visual path above the interaction path. The final one-pixel SVG viewport and interaction-path ordering passed all 17 unchanged Basic cases plus Phase 126 edge visibility case UP-126-019, then the complete 201-case three-repeat runner.

The affected scopes, including the unchanged upstream Playwright runner, completed as follows. Foldkit's first run on the final SVG shape had one additional UP-126-037 pane-pan failure; a probe found the expected viewport hit, and the unchanged case passed 3/3 on immediate rerun. This first failure is retained as a flaky outcome, not hidden in a pass count.

A later focused verifier reached three additional Vanilla Flow tests. The native probes found that Pan mode's automatic draggable-node nopan class blocked its capture path; the host now lets Pan mode own that node gesture while embedded nopan controls still opt out. The edge and UI-control tests had the pointer-policy consequences described above. The three tests reproduced in isolation before repair and passed on focused reruns after repair. The initial verifier stopped after Vanilla with 759 passed, two skipped, and three unexpected failures; it did not run Vue or Foldkit browser gates. Its full rerun result is recorded below.

The next focused verifier passed Vanilla with 762 browser tests and two skips, then stopped in Vue with 892 passed and two unexpected Flow test failures. The activation marker locator and UI-control knock-on described above passed 9/9 together after repair. A direct Foldkit broad browser run completed 548 passed and one failure: the documented raw-click conflict. The final focused verifier rerun is recorded below.

| Host | Selected scope | Playwright passed | Retained expected failures included | Unexpected failures |
| --- | --- | --: | --: | --: |
| Vanilla | Upstream Playwright, renderer props, gesture options, events and changes, interaction lifecycle, styling, handle and connection, new policy | 165 | 6 | 0 |
| Vue | Upstream Playwright, renderer props, events and changes, interaction lifecycle, edge styling, gesture controls, handle and connection, new policy | 163 | 2 | 0 |
| Foldkit | Upstream Playwright, renderer props, events and changes, interaction lifecycle, model styling, handle and connection, new policy | 176 | 3 | 2 |

Foldkit's unexpected failures were the documented raw-click conflict and the single UP-126-037 result above. The six scoped cells are reference-conforming at the unchanged local Chromium Cypress port boundary:

| Case       | Vanilla             | Vue                 | Foldkit        |
| ---------- | ------------------- | ------------------- | -------------- |
| UP-127-043 | 3/3, fixed          | 3/3, fixed          | 3/3, fixed     |
| UP-127-046 | 3/3, fixed          | 3/3, fixed          | 3/3, fixed     |
| UP-127-047 | 3/3, fixed          | 3/3, fixed          | 3/3, fixed     |
| UP-127-049 | 3/3, fixed          | 3/3, fixed          | 3/3, fixed     |
| UP-127-053 | 3/3, fixed knock-on | 3/3, fixed knock-on | 3/3, preserved |
| UP-127-055 | 3/3, fixed knock-on | 3/3, fixed knock-on | 3/3, preserved |

Phase 126 ledger totals did not change. Its Vanilla pass/intentional-difference/fail counts remain 44/3/3, Vue 48/2/0, and Foldkit 47/3/0. Phase 127 changed from Vanilla 44/2/21 to 52/2/13, Vue 52/0/15 to 59/0/8, and Foldkit 58/0/9 to 62/0/5. UP-127-058 also passed after the pane repair in Vanilla and Vue; UP-127-062 passed in Vanilla. The two obsolete Foldkit callback-presence unmapped entries were removed, leaving five. The focused verification config only adds files and keeps all previous checks and browser files.

The final required `scripts/with-flow-browser-lock.sh bun run verify` used the saved focused profile with 18 selected gates and one browser worker. All 15 non-browser gates passed, including 97 unit-test files and 2,517 unit tests, package and app builds, typechecking, architecture, quality, docs, ledger, and 3,090 trace citations. Browser results were:

| Host | Passed | Skipped | Unexpected failures | Result |
| --- | --: | --: | --: | --- |
| Vanilla | 762 | 2 | 0 | Passed |
| Vue | 894 | 0 | 0 | Passed |
| Foldkit | 540 | 0 | 1 | Failed at `apps/foldkit/e2e/events-and-changes.e2e.ts:244` |

UP-126-037 passed in all three hosts in this final run. The only failed focused gate was Foldkit browser tests; the documented raw-click conflict remains unchanged. The verifier therefore exited 1, and focused-suite acceptance is incomplete. Full-profile integration acceptance is separate.

## Conformity and deviations

Conforming: UP-127-043, UP-127-046, UP-127-047, UP-127-049, UP-127-053, and UP-127-055 each pass 3/3 in Vanilla, Vue, and Foldkit against the unchanged pinned Cypress port. New native-input contracts separately cover pane panning through disabled nodes and callback hit testing. Foldkit's per-edge SVG uses a one-pixel visible viewport with overflow paths rather than upstream's shared SVG group; the unchanged Basic and Phase 126 cases bound this host adaptation.

Intentionally different internally: Flow keeps framework-owned lifecycle, Effect workflows, Foldkit's typed ports and callback client, controlled acknowledgements, non-interactive edge labels, Vanilla shared-SVG stacking, Foldkit hidden toolbars, and instance-scoped marker IDs. These do not change the six passing Cypress assertions.

Unverified: the documented Foldkit raw-click conflict prevents focused-suite acceptance. Live React comparison, other engines, physical devices, full-profile integration/release acceptance, and collector-side OTLP delivery remain separate work. The focused profile cannot establish broad parity.
