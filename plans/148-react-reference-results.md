# Plan 148: React reference results

The reference host uses `@xyflow/react` 12.11.6 and `@xyflow/system` 0.0.82, matching revision `0a1f9575b25679f2880175de8d3eae21aedde921`. React and React DOM are pinned to 18.2.0 for the upstream Cypress React 18 lifecycle.

## Execution boundary

The private Vite app runs on port 4180. Generic fixtures and example components load directly from immutable evidence. Component fixtures extract their original setup and mount expressions. Real hook and callback arguments populate the shared receipt without cloning retained replacement objects. The shared browser contracts own gestures and assertions. The 31 utility cases execute their original source assertions against the matching xyflow packages, including real DOM geometry for UP-128-107. Flow's corresponding utility ports retain their Vitest boundary.

Every browser command runs within `scripts/with-flow-browser-lock.sh`, with `--workers=1`. `reference-host` is opt-in. `verification.config.json` retains every entry and its focused default.

## Port corrections

The shared contracts previously contained Flow-only handle selectors, custom edge markers, and edge-label layer selectors. Those selectors now pass through the host adapter. The React mount readiness check accepts the first canvas when a fixture contains multiple canvases.

UP-128-044 previously added `label`, `sourcePosition`, and `targetPosition` to the expected replacement item, although the upstream assertion contains none of those fields. The port now compares the exact upstream expected object after removing those Flow metadata extensions from the actual item. It preserves every other field and the exact `measured: { width: 200, height: 100 }` assertion.

The static selector corrections affect these cases:

- UP-126-001 and UP-126-002: readiness of the multi-canvas background page.
- UP-127-001, UP-127-032, and UP-127-042: handle discovery.
- UP-127-014, UP-127-031, UP-127-049, UP-127-058, UP-128-023, and UP-128-027: source and target handle discovery.
- UP-128-030 and UP-128-031: custom and fallback edge types.
- UP-128-042: per-instance edge-label layers.
- UP-128-003 and UP-128-004: raw React node snapshots. Flow metadata translation remains scoped to Flow hosts.
- UP-128-044: exact upstream replacement payload and raw React callback snapshots.

These corrections were found before browser execution. They are port bugs, not measured React failures. The case results below distinguish failures actually observed in Chromium.

## React results

The first complete locked Chromium run executed all 224 ledger cases without skips:

- Phase 126, Playwright: 50 passed, 0 failed.
- Phase 127, Cypress e2e ports: 67 passed, 0 failed.
- Phase 128: 102 passed, 5 failed. This includes 71 passing and 5 failing shared browser cases, plus 31 passing original utility bodies in Chromium.
- Total: 219 passed, 5 broken upstream tests, 0 not-run.

All five measured failures are broken upstream tests. Their assertions remain intact and their ledger `reference` status is `fail`. The separate threshold diagnostic passes and is excluded from these ledger counts.

### Every measured React failure

Upstream paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

| Case | Classification | Observed result and evidence |
| --- | --- | --- |
| UP-128-003 | Broken upstream test | The hook reports controlled user nodes without `measured`, while the assertion requires `100x50` measurements. The fixture supplies `nodes` and no change handler at `examples/react/cypress/components/hooks/useNodes.cy.tsx:27`. `useNodes` reads the public store nodes at `packages/react/src/hooks/useNodes.ts:27`; only default nodes auto-apply measurement changes at `packages/react/src/store/index.ts:265`. Internal DOM measurement does not repair this controlled collection. |
| UP-128-044 | Broken upstream test | Three batches arrive: initial `100x40` and `80x50` dimensions; a replacement with new `200x100` style but retained `100x40` measurement; and later `200x100` dimensions. The DOM reaches `200x100`. The assertion demands the later size in the earlier replacement at `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:36`. Applying dimensions replaces the measured object at `packages/react/src/utils/changes.ts:126`, so the retained payload stays old. |
| UP-128-046 | Broken upstream test | The final change is `{ id: '1', type: 'position', position: { x: 200, y: 25 }, dragging: false }`. The assertion additionally requires `positionAbsolute` at `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:86`. Production constructs no such field at `packages/react/src/store/index.ts:221`. |
| UP-128-053 | Broken upstream test | The original helper supplies one mousemove at `examples/react/cypress/support/commands.ts:1`; the assertion requires movement at `examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:21`. With the default positive threshold, that move starts the drag and resets its anchor at `packages/system/src/xydrag/XYDrag.ts:286` and `packages/system/src/xydrag/XYDrag.ts:346`, leaving zero movement. A faithful synthetic replay also remains at `(0,0)` after that one move. A separate second move produces `(10,0)`, proving the missing input. The upstream helper is unchanged. |
| UP-128-072 | Broken upstream test | After the shared 500 ms read, the original node is `150x36` at `(-100,14)`. Its physical right and bottom edges are both `50`. The assertion requires provisional `(50,50)` at `examples/react/cypress/components/reactflow/view-props.cy.tsx:193`. Measurement reclamps with the actual size at `packages/system/src/utils/store.ts:460`. Flow uses the same clamp with its `150x44` fixture size, giving `(-100,6)`. This proves the clamp rule, not pixel equivalence of default node styling. |

UP-128-044 and UP-128-072 therefore fail on React itself. Neither result justifies changing Flow's production behavior to satisfy these stale assertions.

### Production and test paths

The reference page dispatches component routes at `apps/react-reference/main.tsx:175`, passes the original mount to its command owner at `apps/react-reference/main.tsx:187`, and calls React's real root renderer at `apps/react-reference/component-mount.tsx:40`. Example and generic fixtures render at `apps/react-reference/main.tsx:197` and `apps/react-reference/main.tsx:209`. Utility routes execute the original source bodies at `apps/react-reference/main.tsx:158`. Vite locates the immutable source from the ledger and extracts its setup in `apps/react-reference/vite.config.ts:39` and `apps/react-reference/fixture-source.ts:75`. The receipt records real callback arguments and has no Flow runtime dependency.

The browser test paths are separate. The phase-126 runner registers the shared contracts at `apps/react-reference/e2e/upstream-playwright.e2e.ts:15`; phase 127 does so at `apps/react-reference/e2e/upstream-cypress.e2e.ts:13`; phase 128 does so at `apps/react-reference/e2e/upstream-component.e2e.ts:24`. Its 31 utility cases run at `apps/react-reference/e2e/upstream-component.e2e.ts:32`. The independent synthetic replay is `apps/react-reference/e2e/reference-drag-threshold.e2e.ts:15`.

## Flow status changes

UP-128-044 changes from `intentional-difference` to `fail` for Vanilla, Vue, and Foldkit. React demonstrates the same retained `100x40` snapshot, so this is a broken assertion rather than an intentional production difference. The existing expected-failure execution remains active. UP-128-072 stays `fail` in all hosts; its reason now cites the measured React failure. No other Flow status changes, and no Flow product implementation changed.

All three affected-host runs completed with zero unexpected failures:

- Vanilla: 193 browser cases, 184 actual passes, 7 expected failures, and 2 not-applicable skips.
- Vue: 193 browser cases, 186 actual passes, 5 expected failures, and 2 not-applicable skips.
- Foldkit: 193 browser cases, 187 actual passes, 6 expected failures, and no skips.

Every host ran all three upstream browser runners. The 31 Flow utility ports are covered separately by the passing unit suite. Expected failures remain visible executions of their original assertions.

## Commands and results

- `bun install --frozen-lockfile`: passed on the clean starting worktree.
- `bun install`: installed the exact private reference dependencies and updated `bun.lock`.
- `bun run --cwd apps/react-reference build`: passed after fixture extraction fixes.
- `bun run --cwd apps/react-reference typecheck`: passed.
- `bun run build:packages`, followed by `bun run tsc --noEmit`: passed. A preliminary direct `tsc` run before package builds failed on missing workspace declarations.
- `bun run vitest run apps/react-reference/fixture-source.test.ts scripts/verification-plan.test.ts`: 15 passed. Extraction checks cover all 107 phase-128 declarations, preserve nested fixture setup, and distinguish 76 mounts from 31 utility bodies.
- `bun run test`: 106 files and 2,598 tests passed.
- `bun /tmp/flow148-pure.ts`: the 30 pure original utility bodies passed against the pinned packages in Bun. This preliminary run excludes UP-128-107's DOM geometry and does not replace browser evidence.
- `bun run scripts/check-upstream-test-ledger.ts --refresh-port-locations`: refreshed declaration citations without changing Flow outcomes.
- `bun run scripts/check-upstream-test-ledger.ts`: passed with 224 cases.
- `bun run research:check-traces`: passed with 3,378 citations in 90 traces after citation remapping.
- `bun run docs:check`: passed.
- `bun run check`: passed.

The browser commands ran inside one owner-token session sourced from `scripts/with-flow-browser-lock.sh`. After repeated starvation behind newer jobs, this session used a 100 ms retry interval while waiting; the lock script and its owner-token release behavior remain unchanged. The final guarded shell was:

```sh
bash --noprofile --norc -c 'sleep() { command sleep 0.1; }; source scripts/with-flow-browser-lock.sh bash --noprofile --norc'
```

These commands ran sequentially inside that guard:

```sh
bun run playwright test --config apps/react-reference/playwright.config.ts --workers=1 --reporter=json
bun run playwright test --config apps/react-reference/playwright.config.ts reference-drag-threshold.e2e.ts --workers=1 --reporter=line
bun run playwright test 'apps/vanilla/e2e/upstream-(playwright|cypress|component)\.e2e\.ts$' --workers=1 --reporter=json
bun run playwright test --config apps/vue/playwright.config.ts 'upstream-(playwright|cypress|component)\.e2e\.ts$' --workers=1 --reporter=json
bun run playwright test --config apps/foldkit/playwright.config.ts 'upstream-(playwright|cypress|component)\.e2e\.ts$' --workers=1 --reporter=json
bun run verify --check reference-host
```

The first complete React run returned 1 because all five broken upstream cases were still unclassified. The subsequent ledger classifications retain those failures explicitly. The synthetic diagnostic returned 0. All three Flow browser reruns returned 0. Preliminary server-start attempts ran no cases; adding the `.e2e.ts` test pattern and correcting the server working directory resolved them. A direct TypeScript declaration check with `skipLibCheck` disabled caught and then verified the correction of a relative ambient-module import.

Final locked `bun run verify --check reference-host`: passed with exit code 0. The focused profile passed quality, architecture, package builds, typechecking, 2,598 unit tests in 106 files, the selected catalog/docs/consumer/trace gates, the reference host, and all saved Vanilla, Vue, and Foldkit browser scopes. The reference gate accepted 225 results: 219 actual upstream passes, 5 preserved expected failures, and the passing independent diagnostic. Its selection is the unchanged saved focused scope plus `reference-host`. This does not claim full-profile acceptance.

## Conformity and deviations

The 219 passing React cases conform to their exact assertions at the named browser or utility boundary. Five upstream assertions are broken on the reference itself. UP-128-044 now confirms that Flow's retained measurement matches React; UP-128-072 confirms the same maximum-minus-measured-size clamp with Flow's 44 px minimum node height. The reference shell mounts exported page components in an isolated test root and omits example-catalog navigation. That shell difference is intentional; header and navigation parity are unverified. Flow retains its own graph and lifecycle architecture. A passing assertion on a Flow host is not a production-parity claim when the reference test is broken. Svelte behavior, other React versions, and full-suite Flow acceptance remain outside this focused task. No OpenTelemetry delivery claim is made.
