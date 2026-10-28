# Full-profile verification diagnosis

Plan 161 starts from `7d78b9b`. The isolated timeout did not reproduce. CPU profiling identified repeated whole document validation in the measurement path, and the user authorized fixing that measured cost. The user attributes the historical timeout to concurrent-agent load. This run establishes the scaling problem and its repair, without identifying a first timeout-producing commit.

## Reproduction and commit search

Each historical checkout has its own detached worktree under `/tmp/plan161/`, a `bun install --frozen-lockfile`, and a `bun run build:packages`. Every browser command acquires the lock independently through `scripts/with-flow-browser-lock.sh` and uses one worker. No interactive shell holds the lock. No imported upstream artifact changes.

`/tmp/plan161/run.py` executes the unchanged isolated test and saves Playwright JSON and logs for each run. The complete measurements, source checksums, and CPU summaries are checked in at `research/benchmarks/plan161-diagnosis.json`. Lock wait time is excluded. The test has SHA-256 `122f93fdc8388d199019d522160850d99bf9e30f5f3d1d139610ead5e145e1b9` throughout.

| Tree | Isolated results | Median test duration | Range |
| --- | --- | --- | --- |
| Baseline `c6cee41` | 3 passed | 122.409 s | 122.384 to 123.316 s |
| Plan 152 `aeabc25` | 3 passed | 122.294 s | 121.947 to 123.010 s |
| Current `7d78b9b` | 3 passed | 122.817 s | 122.815 to 123.761 s |
| Fixed tree, first three comparison runs | 3 passed | 13.399 s | 13.378 to 13.623 s |
| Fixed tree, complete acceptance set | 5 passed | 13.492 s | 13.378 to 13.660 s |
| Plan 162 merged tree, repeat set | 5 passed | 13.943 s | 13.611 to 14.683 s |

Command duration, including server startup and package builds, was about 125 seconds before and 15.6 to 15.8 seconds after in the original comparison. The fixed test is faster than the baseline and satisfies the 10% regression limit. The first three runs per side provide the requested comparison; all five fixed runs and all five repetitions after merging Plan 162 provide Plan 161 acceptance evidence. The sets ran sequentially at different times. The validation-count regression and CPU attribution support the cause independently of machine load. These are local Chromium development-server measurements. The merged-tree repetitions are saved in `/tmp/plan161/merged-after.json` and `/tmp/plan161/merged-after.log`.

There is no failing endpoint for a valid binary search. All three tested commits passed three isolated runs, so no first bad commit was established. The repeated document validation dates to `7821da1e`, and the per-node host call to `77a725e3`, outside the requested interval. Those source locations and the measurement helper are unchanged between the baseline and starting tree. Concurrent-agent load is the user's attribution for the historical timeout, rather than a reproduced isolated regression here.

## Production path

The public browser API enters `mountFlow` at `apps/vanilla/src/mount-flow.ts:15003` and decodes the document at `apps/vanilla/src/mount-flow.ts:15040`. Public `controller.update` decodes replacement input at `apps/vanilla/src/mount-flow.ts:15746`. Edit preparation retains its schema and integrity boundaries. Accepted `FlowDocument` values and the internally constructed `FlowMeasurementState` are trusted immutable domain values.

Reconciliation measures each retained node at `apps/vanilla/src/mount-flow.ts:8521`. `recordNodeMeasurement` enters `acceptMeasurement` at `apps/vanilla/src/mount-flow.ts:2728`, which combines the current renderer generation with browser dimensions and handle geometry. Before the repair, each sample decoded the whole accepted document and measurement state again. It also rebuilt the complete measured-node projection for unchanged samples.

The core application entry at `packages/core/src/domain/flow-measurement.schema.ts:124` now validates incoming `NodeMeasurementInput` samples without revalidating accepted documents or internal state. It retains finite dimensions, nonnegative dimensions, generation checks, missing-node rejection, stale-generation rejection, current declarations, and immutable updates. Handle declarations are copied into the accepted measurement record, preserving the former decode's detached snapshot. Generation registration, pruning, readiness, and public projections also trust accepted internal values. Public detached/frozen projection behavior remains intact at `packages/core/src/domain/flow-measurement.schema.ts:335`.

An unchanged measurement returns the same state. The host checks that identity at `apps/vanilla/src/mount-flow.ts:2767`, avoiding the derived graph/map rebuild and measurement notifications when geometry did not change. Changed samples still rebuild the current-generation projection through `packages/core/src/domain/flow-measurement.schema.ts:234`. Graph meaning remains in core; browser measurement, DOM reconciliation, scopes, and scheduling remain in the host.

## CPU profile and telemetry

The diagnostic checkout at `/tmp/plan161/profile-current` starts from `7d78b9b`. `/tmp/plan161/instrument.py` adds a CDP CPU profiler around the unchanged test body and an Effect `Tracer.NativeSpan` collector to the existing runners. The after profile uses the fixed product files with the same instrumentation. The raw profiles are `/tmp/plan161/profile-current.cpuprofile` and `/tmp/plan161/profile-after.cpuprofile`. Their hashes are in the checked-in evidence. Diagnostic traces and profile durations are excluded from the timing comparison.

Chromium resets the profile on navigation. Both profiles cover the final 1,000-node, 500-edge fixture with the minimap disabled, including its one warmup and four timed updates.

| Sampled work                       | Before   | After   |
| ---------------------------------- | -------- | ------- |
| Entire final navigation            | 23.245 s | 2.072 s |
| `acceptMeasurement`, inclusive     | 20.129 s | 0.287 s |
| `applyNodeMeasurements`, inclusive | 18.158 s | 0.253 s |
| `getFlowMeasuredNodes`, inclusive  | 2.051 s  | 0.126 s |

Nested inclusive times overlap and must not be added. Before the repair, Schema parsing dominates self time. The remaining helper work includes indexing accepted records and validating incoming samples. This evidence establishes bounded sample validation, without claiming that every remaining operation is constant-time.

Existing `flow.document.decode` spans report roughly 0.2 to 0.5 ms for a 1,000-node public update. `flow.host.mount` reports about 285 ms for the sparse 1,000-node fixture. `flow.dom.reconcile` and `flow.controller.update` currently surround boundary log statements and report about zero; their duration does not enclose synchronous reconciliation. CPU samples provide that attribution. No collector-side delivery test was run.

## Regression and test paths

The regression at `packages/core/src/domain/flow-measurement.schema.test.ts:50` applies a real DOM sample to accepted documents containing 1, 100, and 1,000 nodes. Getters count reads of fields visited by document validation, and separately count the incoming sample's width read. The result must contain the literal accepted measurement and revision. Baseline reads 1, 100, and 1,000 document fields and fails all three cases. The repair reads zero document fields and validates the sample once in every case. The same file's existing rejection and generation tests remain unchanged. It passes 20/20; the complete unit suite passes 2,784/2,784.

The browser benchmark constructs its fixtures at `apps/vanilla/e2e/performance.e2e.ts:42` and mounts through the public API at `apps/vanilla/e2e/performance.e2e.ts:59`. `measureUpdates` times synchronous `controller.update` calls at `apps/vanilla/e2e/performance.e2e.ts:122`. Setup, navigation, frame waits, and drag gestures contribute to total test duration but lie outside that per-update timer. The 180-second deadline at `apps/vanilla/e2e/performance.e2e.ts:349`, fixtures, and assertions are unchanged. No-op minimap mutations remain zero in every timed sample. The existing drag timer ends in a capture-listener microtask, so it does not establish complete rendered drag latency.

## Full-order failures

### Scoped Effect host interruption

The original unfiltered Vanilla command used `--repeat-each=2 --trace=retain-on-failure --max-failures=1 --workers=1`. It passed 1,125 cases, then failed `canvas.e2e.ts:1837` in the second repetition. `/tmp/plan161/scoped-interruption-before.zip` preserves the trace. The failing request to `/@id/effect` returned HTTP 504, `Outdated Optimize Dep`, before host acquisition. This was a Vite dependency-resolution failure, not a failed resource-release assertion.

The test now imports `apps/vanilla/e2e/effect-fixture.ts:1`, whose static Effect import goes through Vite's normal dependency resolution. It waits for the scoped host's acquisition using a Deferred at `apps/vanilla/e2e/canvas.e2e.ts:1948` and `apps/vanilla/e2e/canvas.e2e.ts:1948`. After interruption, a separate ResizeObserver confirms an actual browser observation cycle at `apps/vanilla/e2e/canvas.e2e.ts:1948`. Both fixed sleeps are removed. The literal resource-release assertion at `apps/vanilla/e2e/canvas.e2e.ts:1948` is unchanged.

### Data-only handle rendering

The saved `input-configuration.e2e.ts:900` result in `/tmp/plan161/vanilla-full-order-before.log` was caused by the agent's deliberate SIGINT to prioritize profiling. It reports `Test was interrupted`, `page.goto: Test ended`, and exit 130 after 167 passes. That result is not an assertion failure or a product flake. The case passes 50/50 focused repetitions unchanged. No speculative product or assertion change was made for it.

The two named cases together pass 100/100 focused repetitions before the merge and 20/20 after the merge. Uninterrupted full-order results are recorded below. Historical calibration navigation, UP-128-075 setup, UP-126-003 selection, and Vue connection-threshold timeouts were not reproduced as isolated regressions here. Full-profile acceptance covers their unchanged tests.

## Verification

After merging `main` at `5fda81a` into `plan/161-full-profile-r2`, `bun run check`, `bun run build:packages`, `bun run tsc --noEmit`, the 2,805-test unit suite, the calibration registry, and `bun run research:check-traces` pass. This main revision contains Plan 162 code and a Plan 163 planning document. The two named Vanilla cases pass 20/20 focused repetitions; the isolated performance case passes 5/5 repetitions. A locked `bun run verify` focused pass completed with 238 React reference-host tests, 981 Vanilla tests and four skips, 1,114 Vue tests and two skips, and 738 Foldkit tests. Its wall time inside the verifier was 1,683 seconds.

The first resumed `verify:full` attempt passed Vanilla, then reported 11 late Vue failures. The macOS power log records Clamshell Sleep from 14:27:55 to the full wake at 15:30:40 on October 26. A Playwright case took 4.1 minutes despite a 30-second deadline; later cases had navigation and action timeouts while the machine slept. This interrupted run is not acceptance evidence. Every one of those 11 cases passed at normal speed in the next full run. Earlier deliberately interrupted diagnostics also remain outside acceptance.

Two consecutive `scripts/with-flow-browser-lock.sh caffeinate -di bun run verify:full` runs passed after the wake, without source or verifier-scope changes between them. Each passed 1,010 Vanilla tests with four skips, 1,141 Vue tests with two skips, and 744 Foldkit tests. Their verifier elapsed times were 1,580.044 and 1,583.896 seconds. The ordered Vanilla performance test took 13.4 and 13.6 seconds. Logs are `/tmp/plan161/verify-full-r2-awake-1.log` and `/tmp/plan161/verify-full-r2-awake-2.log`; the counts are also in `research/benchmarks/plan161-diagnosis.json`. Playwright's Vite servers on ports 4176 through 4178 were absent after both commands.

`verification.config.json` only appends Plan 161 to active work, adds the calibration check, adds both Vanilla performance files, and adds each other host's calibration file. Every prior check and browser entry remains in its original order. The default stays focused. All prior calibration records are retained; completed calibration runs append new records.

The original source-line remap verified 720 endpoints. Two pre-existing references to core line 234 had pointed inside pruning; after the repair line 234 is exactly `getFlowMeasuredNodes`, matching their intended projection claims. The Plan 162 merge shifted another 1,030 cited endpoints in 68 traces. Matching source lines established 1,029 mappings. One existing Vue selection citation pointed into edge-label code even before the merge; it now cites the actual viewport transform at `packages/vue/src/flow-canvas.ts:11355`. Imported upstream evidence is unchanged.

## Conformity and deviations

Conforming at the existing unit and browser assertion boundaries: incoming-sample rejection, stale generations, hidden geometry, detached public reads, minimap identity, and scoped resource release. The repair intentionally trusts decoded internal values, following Flow's schema boundaries; incoming unknown samples remain validated. The test fixture intentionally uses Vite-resolved imports and observable lifecycle completion. A first timeout-producing commit remains unverified because every isolated endpoint passed. The user's concurrent-load attribution is recorded explicitly. This work makes no new upstream parity or collector-delivery claim.
