# Plan 128: Connection pointer sequences (upstream follow-up)

## Problem and scope

Trace preview visibility when starting from target handles and the generated edge identifier required by the unchanged connection test. Preserve the passing invalid-connection, disabled-handle, and autopan cases. Keep production event ordering separate from reducer evidence.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-030 | connecting two nodes | vanilla, vue, foldkit |
| UP-126-031 | connecting two output handles does not work | vanilla, vue, foldkit |

## Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

## Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

## Initial evidence boundary

At plan creation, the listed failures remained unverified until their public browser paths passed. Any intentional difference requires an existing documented reason with an exact citation; a failing test alone is not such a reason. Live React comparison, other browser engines, and Cypress phases 127 and 128 remain separate work.

## Implementation

The per-host production and fixture paths are recorded in `research/traces/connection-pointer-sequences.md`. No imported upstream evidence, upstream assertion, selector mapping, gesture coordinate, or threshold changed.

| Case | Host | Classification and cause | Fix owner |
| --- | --- | --- | --- |
| UP-126-030 | Vanilla | b. The generic fixture used automatic edge-N creation instead of upstream's controlled onConnect/addEdge workflow. | `apps/vanilla/src/upstream-fixture.ts:74` |
| UP-126-030 | Vue | b. The generic fixture used automatic edge-N creation instead of upstream's controlled onConnect/addEdge workflow. | `apps/vue/src/upstream-fixture.ts:69` |
| UP-126-030 | Foldkit | b. The same missing fixture workflow, plus an empty connection-target allow-list that rejected valid drops. | `apps/foldkit/src/upstream-fixture.ts:83` and `apps/foldkit/src/upstream-fixture.ts:180` |
| UP-126-031 | Vanilla | a. Strict-mode admission and pending checks rejected target handles. Active reconciliation also required source kind. | `apps/vanilla/src/mount-flow.ts:5870`, `apps/vanilla/src/mount-flow.ts:6072`, and `apps/vanilla/src/mount-flow.ts:7605` |
| UP-126-031 | Vue | a. Strict-mode admission and pending reconstruction rejected fresh target handles. | `packages/vue/src/flow-canvas.ts:5575` and `packages/vue/src/flow-canvas.ts:6431` |
| UP-126-031 | Foldkit | a. Strict-mode pending eligibility rejected target handles. | `packages/foldkit/src/graph.ts:2042` |

`packages/conformance/src/upstream-generic/model.ts:49` now accepts controlled fixture changes and handles edge-add through the existing compatibility addEdge. The generic fixtures translate their synthetic physical in/out defaults to upstream's unnamed handles before ID generation. Flow's public automatic edge-N generator and its explicit edge-1/edge-2 assertions remain unchanged. Adopting a new public default would require a separate behavior decision; the fixture fix does not require it.

The existing start/end connectability checks and core same-kind rejection remain. The Flow-owned threshold test at `apps/shared-e2e/connection-threshold-contract.ts:870` now expects a start callback in both strict and loose modes. The unchanged upstream tests prove preview visibility, invalid-drop rejection, preview cleanup, and new-edge identity. No additional synthetic test is used as a substitute for that browser evidence.

`verification.config.json` only adds Vanilla connection-threshold and interaction-lifecycle suites, and Vue handle-connections and node-connections suites. All previous checks, browser files, activeWork, and the focused default remain. Existing research trace citations were mechanically remapped after the source edits. Plan 126 links now point to this renamed plan.

## Results

Baseline reproduction produced two ordinary browser failures per host, six total, with both ledger entries temporarily set to pass. UP-126-030 failed at the missing xy-edge__Node-1-Node-4 locator after release. UP-126-031 failed at the absent preview before release. Baseline logs are `/tmp/flow-128-red-{vanilla,vue,foldkit}.log`.

Both requested ledger entries change from fail to pass in every host. The controlled fixture workflow also makes Vanilla UP-126-004 pass its unchanged meta-click assertion. Its first complete run reported one unexpected pass; after updating that proven ledger outcome, the complete rerun passed. No other ledger outcome changed. Phase-126 ledger totals, in pass/fail/intentional-difference order, change from 32/17/1 to 35/14/1 in Vanilla, 37/12/1 to 39/10/1 in Vue, and 30/19/1 to 32/17/1 in Foldkit.

| Host | Complete upstream runner | Actual pass outcomes | Retained expected failures | Affected suites |
| --- | --- | --- | --- | --- |
| Vanilla | 50 passed, exit 0 | 35 | 14 fail plus 1 intentional difference | 79 passed |
| Vue | 50 passed, exit 0 | 39 | 10 fail plus 1 intentional difference | 86 passed |
| Foldkit | 50 passed, exit 0 | 32 | 17 fail plus 1 intentional difference | 100 passed |

All standalone runs have zero unexpected failures and zero skips. Expected failures remain explicit in the ledger. They concern pre-existing background transforms, selection, edge presentation and stacking, toolbar attachment, zoom limits, and touch or activation-key panning. UP-126-015 retains its documented instance-scoped marker-ID intentional difference in all hosts. None of the requested connection cases remains failing. Previously passing same-kind rejection, disabled-handle, and autopan cases remain passing.

Commands, each serialized by the owner-token wrapper with OTEL_SDK_DISABLED=true:

```sh
scripts/with-flow-browser-lock.sh bunx playwright test apps/vanilla/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test apps/vanilla/e2e/connection-threshold.e2e.ts apps/vanilla/e2e/interaction-lifecycle.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/connection.e2e.ts apps/vue/e2e/connection-threshold.e2e.ts apps/vue/e2e/interaction-lifecycle.e2e.ts apps/vue/e2e/handle-connections.e2e.ts apps/vue/e2e/node-connections.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/connection-threshold.e2e.ts apps/foldkit/e2e/interaction-lifecycle.e2e.ts apps/foldkit/e2e/handle-connections.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

The saved focused verifier supplies --workers=1 internally to every selected browser runner. Its scope contains 35 Vanilla files, 29 Vue files, and 36 Foldkit files. All 15 non-browser gates passed, including 97 unit files and 2,512 tests. Focused unit proof also passed two files and 39 tests, including the unchanged public automatic edge-ID assertions. Typechecking, lint, formatting, and research citation checks passed before the verifier.

The first focused verifier passed all 15 non-browser gates and Vanilla with 653 passed and two existing native multi-pointer-capture skips. Vue reported 773 passed and 12 timeouts in node-threshold.e2e.ts, so Foldkit was not reached. The errors occurred in navigation, page.evaluate, or screenshot capture, rather than assertion comparisons. macOS power logs record Clamshell Sleep at 13:59:48 and repeated sleep cycles until FullWake at 15:05:36 on 2026-10-21. The exact 12 failing cases passed unchanged on a locked --last-failed rerun. The verifier is retried with a temporary idle-sleep assertion:

```sh
scripts/with-flow-browser-lock.sh bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/node-threshold.e2e.ts --last-failed --workers=1
scripts/with-flow-browser-lock.sh caffeinate -i bun run verify
```

Initial verifier evidence is `/tmp/flow-128-verify.log`, failed-case IDs are `/tmp/flow-128-vue-verifier-failures.json`, the unchanged rerun is `/tmp/flow-128-vue-rerun.log`, and power evidence is `/tmp/flow-128-sleep-evidence.log`. Final verifier output is `/tmp/flow-128-verify-final.log`.

The fresh focused verifier passed all 18 gates with exit 0. It repeated all 15 non-browser gates, including 97 unit files and 2,512 tests. Saved browser scopes passed with Vanilla 653 passed and two existing native multi-pointer-capture skips, Vue 785 passed and zero skips, and Foldkit 415 passed and zero skips. There were zero unexpected failures. Both known flake locations passed without a flake rerun. The 12 earlier Vue timeout cases also passed inside this complete fresh verifier. No production or test change was made for those timeouts. Research validation passed 2,643 citations across 75 traces. The verifier reports profile focused and fullSuite false.

## Conformity and deviations

Conforming for the unchanged pinned UP-126-030 and UP-126-031 public Chromium browser contracts in Vanilla, Vue, and Foldkit. Pointer initiation now permits target handles while strict same-kind drops remain invalid. The generic fixtures use upstream's controlled addEdge semantics and unnamed default-handle IDs. No case in this task is classified as an intentional difference.

The existing public automatic edge-N policy stays separate from the fixture's upstream addEdge policy. Successful reverse-direction preview validity and radius behavior, live React comparison, other browser engines, and click or keyboard parity remain outside these two upstream cases. The ledger's Cypress phases 127 and 128 remain separate work despite this follow-up plan's number. This is focused development acceptance; full-profile, integration, release, and broad parity acceptance are not claimed. OpenTelemetry delivery is unverified without a collector-side test.
