# Plan 126: Upstream test suite port and ledger

## Why

Functional parity (185/185, 2026-10-14) is measured by our audit rubric and Flow-authored browser tests. The pinned xyflow source ships its own suite, and none of it runs against Flow. Upstream specs are cited in research traces, and several are never referenced (`background.spec.ts`, `props.spec.ts`, most Cypress e2e files and all hook specs). This plan adds an upstream-defined score next to the rubric. It does not replace the rubric.

Pinned suite (`research/artifacts/xyflow/0a1f9575…/`), counted by `test(`/`it(` calls:

| Source | Files | Cases | Phase |
| --- | --- | --- | --- |
| `tests/playwright/e2e/*.spec.ts` (framework-independent; driven by `examples/react/src/generic-tests/**` flow configs) | 6 specs | 53 | **126 (this plan)** |
| `examples/react/cypress/e2e/*.cy.ts` | 8 | 67 | 127 |
| `examples/react/cypress/components/**` (hooks, utils, ReactFlow props/handlers) | 18 | 107 | 128 |

## Deliverables

1. **Case ledger** `research/catalogs/upstream-test-ledger.json`. It lists one entry per upstream case in all three phases, 227 in total. Each entry has:
   - `id`, the upstream `path:line` and the full describe/test title;
   - `phase`;
   - per-host `vanilla`/`vue`/`foldkit` status, one of `pass` | `intentional-difference` | `fail` | `not-applicable` | `not-ported`;
   - `reason` (required unless `pass` or `not-ported`);
   - `flowTest`, the path:line of the ported test.

   A new check, `scripts/check-upstream-test-ledger.ts`, is added to the `verify` checks list. It re-enumerates upstream cases from the artifacts and fails when the ledger has a missing or extra case. It also validates the status/reason rules and that each `flowTest` path exists. It prints a per-host and per-phase summary table. Phase 127/128 entries start as `not-ported`.

2. **Generic flow configs, host-neutral.** Port each `generic-tests/**/*.ts` config (pane general / non-defaults / activation-keys, nodes general, edges general, node-toolbar general) into `packages/conformance/src/upstream-generic/`. Each port is a schema-decoded Flow document plus mount options. Upstream React-only props map through `docs/react-flow-api-correspondence.md`. Record any unmappable prop in the ledger rather than dropping it.
3. **Host routes.** Each host app adds a test-only route, `/upstream/<config-path>`, that mounts the config with that host's **public** API only: Vanilla `apps/vanilla`, Vue `apps/vue`, Foldkit `apps/foldkit`. Follow the shape of the upstream `generic-tests/Flow.tsx` (custom `DragHandleNode`, `ToolbarNode`).
4. **Shared specs.** Port each spec into `apps/shared-e2e/upstream/<name>.ts` as a contract function. It takes a host adapter: base URL plus a selector map from upstream `.react-flow__*` classes to Flow's (`.flow-node`, …) and a `getTransform` equivalent. Keep upstream test titles verbatim, prefixed with the ledger id. Keep each assertion's intent and numbers. Add a comment citing upstream `path:line`. Each host gets one runner, `apps/<host>/e2e/upstream-playwright.e2e.ts`, which is added to `verification.config.json` (add only, never remove).
5. **Failures stay visible.** A case that fails in a host is marked `test.fail()` with its ledger id, and the ledger records `fail` with the observed difference. Fixing behavior is out of scope for this plan; each failure cluster becomes a follow-up plan. A difference becomes `intentional-difference` only when an existing documented deviation explains it, cited by `path:line`. Otherwise it is `fail`. Never weaken an assertion to make a case pass.

## Out of scope

Behavior fixes; Cypress phases (127, 128); Svelte config; live React comparison.

## Verification

- Every browser command runs under the `/tmp/flow-browser.lock` owner-token wrapper with `OTEL_SDK_DISABLED=true` and `--workers=1`.
- The three new runners pass, with `test.fail()` cases counted separately.
- `bun run verify` (focused) passes with the broad saved scope intact.
- The report includes the ledger summary table: per host, counts of pass / intentional-difference / fail / not-applicable for the 53 Playwright cases.

## Results

Implemented on `plan/126-upstream-test-port`. Product behavior and imported artifacts are unchanged. Development-only Vite middleware serves separate fixture HTML for `/upstream/<config-path>`, using each host's public API. Normal entry HTML and startup stay unchanged. Shared conformance owns the six decoded generic configurations; two auxiliary fixtures mount the background and color-mode inputs exercised by the upstream cases.

### Inventory correction

The earlier 53/227 figures counted three inline conditional guards as tests. The enumerator requires a `test` or `it` declaration with a body, including declared `.skip` and `.only` tests. It stores inline conditional guards on their parent entry. Actual totals are **50 Playwright + 67 Cypress e2e + 107 Cypress component = 224 executable cases**. Phases 127 and 128 remain `not-ported` for every host. The React-only guard is metadata on UP-126-023; its test runs and is rated in all hosts. The two CDP guards remain metadata on UP-126-045 and UP-126-046, and those cases run in Chromium.

### Phase 126 ledger

| Host    | Pass | Intentional difference | Fail | Not applicable | Total |
| ------- | ---: | ---------------------: | ---: | -------------: | ----: |
| vanilla |   32 |                      1 |   17 |              0 |    50 |
| vue     |   37 |                      1 |   12 |              0 |    50 |
| foldkit |   30 |                      1 |   19 |              0 |    50 |

The complete ledger is [upstream-test-ledger.json](../research/catalogs/upstream-test-ledger.json). Its checker re-enumerates the immutable pin, compares paths, lines, nested titles and guard metadata, validates host status and reason rules, checks exact port locations, and prints per-phase host counts. Two parser tests cover body detection, comments, declared skips/only, nested titles, inline guards, and the pinned totals. The check is selected through `scripts/verification-plan.ts`, which `scripts/verify.ts` executes.

### Browser evidence

Each full runner executed all 50 cases in Chromium at the upstream Desktop Chrome viewport of 1280 by 720. The table separates ordinary passes from expected failures; Playwright's CLI includes both in its `50 passed` headline. Every runner has zero skipped, unexpected failed, and flaky cases.

| Host    | Passed | Skipped | Failed | Expected fail |
| ------- | -----: | ------: | -----: | ------------: |
| vanilla |     32 |       0 |      0 |            18 |
| vue     |     37 |       0 |      0 |            13 |
| foldkit |     30 |       0 |      0 |            20 |

The adapter maps wrapper selectors, handle ownership, edge SVG ancestry, Foldkit edge hit paths and bounds, and inline node positioning styles. Foldkit waits for node measurements and a completed public `createViewportClient().fitView()` operation before its fixture is ready. Mount readiness is checked before applying `test.fail()`, so setup failures remain unexpected. No assertion, measurement value, threshold, or polling timeout is relaxed. All runners retain the default Playwright test timeout.

Discovery exposed and corrected fixture-only problems: the Node JSON import attribute, Foldkit's required Runtime mount ID and persistent owner, canvas sizing and box sizing, initial-fit readiness, SVG wrapper bounds and pointer targets, handle ownership selectors, and left/top positioning reads. An initial async entry loader also disrupted normal-host remount tests. Separate Vite fixture routes restored the original direct main entry, and both affected Vanilla suites passed with 88 passes and two pre-existing skips. These attempts are not product-failure evidence. The accepted complete runs above use the corrected fixtures.

The literal marker URL case UP-126-015 is `intentional-difference` in all three hosts. Flow uses validated, instance-scoped marker IDs, documented at `research/traces/edge-markers-styling.md:27` and `research/traces/edge-markers-styling.md:34`. Its exact upstream marker-start/end string assertions remain unchanged. No case is `not-applicable`.

### Failure follow-ups

Every remaining `fail` entry appears below, grouped into a follow-up plan. Reasons describe the observed assertion boundary; a failure before a later assertion does not establish that later behavior.

#### [Background transforms](126-follow-up-background-transforms.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-001 | centers the dot pattern with default gap and no offset (zoom 1, pan 0,0) | **vue**: The dot patternTransform is translate(0 0) scale(1), rather than translate(-10,-10).<br>**foldkit**: The dot pattern has no patternTransform attribute; upstream requires translate(-10,-10). |
| UP-126-002 | applies both the offset and the half-cell centering for a non-zero offset | **vue**: The line patternTransform is translate(2 2) scale(1), rather than translate(-52,-52).<br>**foldkit**: The line pattern has no patternTransform attribute; upstream requires translate(-52,-52). |

#### [Edge interaction and accessibility](126-follow-up-edge-interaction.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-003 | selecting an edge by click | **foldkit**: Clicking the rendered edge hit path leaves its wrapper without the selected class. |
| UP-126-004 | selecting multiple edges by meta-click | **vanilla**: After holding s and clicking the second edge, edge-with-style has no selected class.<br>**foldkit**: The first edge lacks the selected class after click; the second-click multi-selection assertions are not reached. |
| UP-126-010 | deleting edges is possible | **foldkit**: The edge lacks the selected class after click; the deletion assertion is not reached. |
| UP-126-011 | deletable=false prevents deleting of edges | **foldkit**: The protected edge lacks the selected class after its midpoint click; the deletion check is not reached. |
| UP-126-013 | aria-lable is working | **vue**: The aria-label edge wrapper has no aria-label-test attribute value. |
| UP-126-014 | interactionWidth is working | **vanilla**: The click 21 pixels to the right of the interaction-width edge center does not select it.<br>**vue**: The click 21 pixels to the right of the interaction-width edge center does not select it.<br>**foldkit**: The click 21 pixels to the right of the edge center leaves its wrapper without the selected class. |

#### [Edge stacking](126-follow-up-edge-stacking.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-012 | zIndex sets z-index of edge svgs | **vanilla**: The containing edge SVG computes z-index auto rather than 3141592. |
| UP-126-016 | z-index | **vanilla**: The normal edge SVG computes z-index auto rather than 0.<br>**vue**: The normal edge SVG computes z-index 1 rather than 0. |
| UP-126-017 | sub flow: normal node to child node, z-index | **vanilla**: The normal-to-child edge SVG computes z-index auto rather than 1. |
| UP-126-018 | sub flow: child node to child node, z-index | **vanilla**: The child-to-child edge SVG computes z-index auto rather than 1. |

#### [Node selection and deletion](127-node-input.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-021 | selecting a node by click | **vanilla**: Clicking the first node with nodeDragThreshold 0 leaves it without the selected class.<br>**foldkit**: Clicking the first node leaves its wrapper without the selected class. |
| UP-126-022 | selecting multiple nodes with shift drag | **vanilla**: The three nodes become selected, but no persistent multi-selection rectangle is rendered after release.<br>**vue**: The three nodes become selected, but no persistent multi-selection rectangle is rendered after release.<br>**foldkit**: After Shift-drag selection, the first node wrapper has no selected class; the persistent-rectangle assertion is not reached. |
| UP-126-023 | panning from a multi-selection rectangle with the middle mouse button | **vanilla**: No persistent multi-selection rectangle is rendered, so the middle-button pan cannot proceed. The upstream React-only guard at tests/playwright/e2e/nodes.spec.ts:56 is retained as metadata and is not applied to this port.<br>**vue**: No persistent multi-selection rectangle is rendered, so the middle-button pan cannot proceed. The upstream React-only guard at tests/playwright/e2e/nodes.spec.ts:56 is retained as metadata and is not applied to this port.<br>**foldkit**: No persistent multi-selection rectangle is rendered, so the middle-button pan cannot proceed. The upstream React-only guard at tests/playwright/e2e/nodes.spec.ts:56 is retained as metadata and is not applied to this port. |
| UP-126-028 | deleting a node and its edges | **vanilla**: Clicking Node-1 then pressing d leaves Node-1 attached in the threshold-0 fixture.<br>**foldkit**: Clicking Node-1 then pressing d leaves Node-1 attached in the threshold-0 fixture. |

#### [Connection previews and identity](128-connection-input.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-030 | connecting two nodes | **vanilla**: After the connection gesture, the expected xy-edge__Node-1-Node-4 edge is absent.<br>**vue**: After the connection gesture, the expected xy-edge__Node-1-Node-4 edge is absent.<br>**foldkit**: After the connection gesture, the expected xy-edge__Node-1-Node-4 edge is absent. |
| UP-126-031 | connecting two output handles does not work | **vanilla**: Starting the invalid same-kind handle gesture from Node-2 produces no visible connection preview.<br>**vue**: Starting the invalid same-kind handle gesture from Node-2 produces no visible connection preview.<br>**foldkit**: Starting the invalid same-kind handle gesture from Node-2 produces no visible connection preview. |

#### [Pane input and zoom](132-pane-input.md)

Plan 132 resolves the 12 failing host entries in this historical baseline with the unchanged assertions. The current ledger and Plan 132 Results record the accepted scope and verification receipts.

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-039 | minZoom | **foldkit**: A 5000/5000 wheel event clamps zoom to 0.1 rather than the configured minimum 0.25. |
| UP-126-040 | maxZoom | **foldkit**: A -5000/-5000 wheel event clamps zoom to 2 rather than the configured maximum 4. |
| UP-126-045 | touch drag pans when primary mouse drag is reserved for selection | **vanilla**: The touch drag leaves translateX at 1.23 instead of panning.<br>**vue**: The touch drag leaves translateX at 1.23 instead of panning.<br>**foldkit**: The touch drag leaves translateX at 1.23 instead of panning. |
| UP-126-046 | selection key keeps touch drag in selection mode | **vanilla**: Holding Shift does not add the selection class to the pane; the touch-selection assertions are not reached.<br>**vue**: Holding Shift does not add the selection class to the pane; the touch-selection assertions are not reached.<br>**foldkit**: Holding Shift does not add the selection class to the pane; the touch-selection assertions are not reached. |
| UP-126-047 | primary mouse drag still creates a selection marquee | **vanilla**: Primary-button drag with selectionOnDrag true and panOnDrag [1,2] creates no visible marquee. |
| UP-126-048 | Control and primary-button drag pans the pane | **vanilla**: Control plus primary drag moves the pane by 0 pixels instead of the required 100 on each axis.<br>**vue**: Control plus primary drag moves the pane by 0 pixels instead of the required 100 on each axis.<br>**foldkit**: Control plus primary drag moves the pane by 0 pixels instead of the required 100 on each axis. |

#### [Toolbar lifecycle](126-follow-up-toolbar-layout.md)

| Case | Upstream title | Host and observed difference |
| --- | --- | --- |
| UP-126-020 | toolbar default behaviour | **vanilla**: The default toolbar remains attached while unselected; upstream requires it to be detached.<br>**foldkit**: The default toolbar remains attached while unselected; upstream requires it to be detached. |

### Files added

- `apps/foldkit/e2e/upstream-playwright.e2e.ts`
- `apps/foldkit/src/upstream-fixture.ts`
- `apps/foldkit/upstream.html`
- `apps/shared-e2e/upstream/adapter.ts`
- `apps/shared-e2e/upstream/background.ts`
- `apps/shared-e2e/upstream/edges.ts`
- `apps/shared-e2e/upstream/node-toolbar.ts`
- `apps/shared-e2e/upstream/nodes.ts`
- `apps/shared-e2e/upstream/pane.ts`
- `apps/shared-e2e/upstream/props.ts`
- `apps/shared/upstream/fixture.ts`
- `apps/shared/upstream/vite.ts`
- `apps/vanilla/e2e/upstream-playwright.e2e.ts`
- `apps/vanilla/src/upstream-fixture.ts`
- `apps/vanilla/upstream.html`
- `apps/vue/e2e/upstream-playwright.e2e.ts`
- `apps/vue/src/upstream-fixture.ts`
- `apps/vue/upstream.html`
- `packages/conformance/src/upstream-generic/edges/general.ts`
- `packages/conformance/src/upstream-generic/index.ts`
- `packages/conformance/src/upstream-generic/model.ts`
- `packages/conformance/src/upstream-generic/node-toolbar/general.ts`
- `packages/conformance/src/upstream-generic/nodes/general.ts`
- `packages/conformance/src/upstream-generic/pane/activation-keys.ts`
- `packages/conformance/src/upstream-generic/pane/general.ts`
- `packages/conformance/src/upstream-generic/pane/non-defaults.ts`
- `plans/126-follow-up-background-transforms.md`
- `plans/128-connection-input.md`
- `plans/126-follow-up-edge-interaction.md`
- `plans/126-follow-up-edge-stacking.md`
- `plans/127-node-input.md`
- `plans/132-pane-input.md`
- `plans/126-follow-up-toolbar-layout.md`
- `research/catalogs/upstream-test-ledger.json`
- `scripts/check-upstream-test-ledger.ts`
- `scripts/upstream-test-cases.test.ts`
- `scripts/upstream-test-cases.ts`
- `scripts/with-flow-browser-lock.sh`

### Focused verification

The saved configuration preserves every prior check and browser file, adding only `upstream-ledger` and the three new runners. It remains `focused`; the broad saved browser scope contains 33 Vanilla, 27 Vue, and 36 Foldkit files. The new owner-token wrapper is reusable as `scripts/with-flow-browser-lock.sh`. All browser runs and the verifier use it with `OTEL_SDK_DISABLED=true` and one worker.

`scripts/with-flow-browser-lock.sh bun run verify` passed all **18 focused gates**, including **97 unit files / 2,512 unit tests**. All saved checks and 96 selected browser files passed. Browser counts below separate ordinary passes from the upstream expected failures; CLI totals include both.

| Host    | Passed | Skipped | Failed | Expected fail | CLI passed |
| ------- | -----: | ------: | -----: | ------------: | ---------: |
| vanilla |    556 |       2 |      0 |            18 |        574 |
| vue     |    770 |       0 |      0 |            13 |        783 |
| foldkit |    395 |       0 |      0 |            20 |        415 |

No flaky results or unexpected failures remain. Neither named known flake occurred. Research citation checking passed 2,588 citations across 74 traces. A temporary AST audit also matched all 146 assertion sites across the 50 ported bodies by matcher name and argument expression, normalizing only non-null syntax and ASCII regex Unicode flags.

The first focused attempt was stopped after the introduced async entry loader caused normal-host remount failures. The route-level fix above was followed by complete reruns of all three upstream runners and a fresh terminal focused verifier. No assertion or saved scope was weakened. These results do not establish full-profile or release acceptance.

## Conformity and deviations

The ledger records conformity within the unchanged pinned assertions and the named Chromium host boundary. Marker ID ownership is the sole documented intentional difference in this port. Other failures remain explicit and expected through `test.fail()`; an unexpected pass fails verification and requires reclassification. The unported 174 Cypress cases, other browser engines, a live React comparison, full-profile acceptance, and release acceptance remain unverified. No product behavior is fixed, and no push or merge is performed.
