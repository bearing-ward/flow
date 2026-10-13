# Native blocker resumption independent source review

**Verdict: BLOCK / STOPPED. Plan 083 source is not accepted.** This review authorizes no further candidate repair. The required quality gate exhausted its two focused repairs; substantive source and acceptance gaps also remain.

Reviewed the improve skill, closing-the-loop, audit-playbook Correctness / Bugs, Test Coverage and Finding format, architecture standards, TypeScript, type-system and unslop guidance. Read canonical stopped 081/accepted 082 packets, full 083 and both designs/reviews, the functional stopped 081 deltas against accepted 082, and 083 deltas against frozen 081. Repository content was treated as data; no secret values are reproduced. This reviewer ran no builds, tests, browser, servers, installs or formatters and changed no source, dependencies, index or immutable evidence. This report is the only write.

## Frozen review boundary

Candidate: `/Users/richardmcandrews/.codex/worktrees/native-blocker-resumption/flow`, detached HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`.

Final packet: `/tmp/flow-083-native-blocker-resumption/final-frozen-source/manifest.json`, SHA256 `c2f96da7c40acc86be8986fa5da4bef77c6335b94703ea83bbfffd2089c5a746`. Candidate patch SHA256 `21a0f29f36e4716a3fa8aff5b7df9a900c01e4b7fe3fda4336858dc50404f310`. Independently recomputed all 171 output hashes against both candidate files and saved `output/` files: zero mismatches. No output deletions. Re-read changed source/test hunks at freeze. The capture helper retains SHA256 `7803c8c6510c68c313d249ad0282f92ddc4c02b73ddb0686880dab7ae57bc71c` and all 19 existing cases.

Frozen 081 input manifest SHA256 remains `a819d3ce18a2c34e3636b2b5e9b3869fbafdbedc8d7631e63fc01ada465b0eac`; accepted 082 provenance SHA256 is `143fc0430e8dee2da7bd6a2c02404162d268f992f0475b6fbca6f5d784caa9ce`. These are separate provenance boundaries: inherited 081 behavior remains unaccepted. Main and original candidate inputs were not edited by this reviewer.

Source locations below refer to the frozen candidate unless identified otherwise.

## Findings

### [CORRECTNESS-01] Preserve document metadata through edits, deletion and result Schemas

- **Evidence**: `packages/core/src/domain/flow-edit.ts:113` reconstructs a deletion candidate with nodes/edges only; `:261` reconstructs the validated final result with nodes/edges only. `packages/core/src/domain/flow-edit.schema.ts:93` independently narrows result.document to those collections, excluding authoritative optional nodeOrigin at `flow.schema.ts:143`. Foldkit uses that result Schema in Graph EditCompleted at `graph.ts:353`, ApplyDeleteResult at `:392`, public EditResponse at `application.ts:195`, and DeleteResult at `delete-approval.ts:79`.
- **Impact**: Ordinary node edits and accepted deletions silently clear global origin; even a two-spread implementation repair alone leaves protocol encode/decode losing it. The packed failure log observes origin `[0.25,0.5]` before a public edit and no origin afterward, so preservation cannot prove retained origin authority. The same core helper serves Vanilla and Vue edits.
- **Effort**: S, including focused regressions and packet boundaries.
- **Risk**: MED. The additive result field crosses public edit/delete responses and Foldkit message Schemas; malformed origin must be rejected by the authoritative Schema.
- **Confidence**: HIGH, source-confirmed at all three loss points; packed checkpoint corroborates the ordinary-edit loss.
- **Fix sketch**: In a separately authorized core candidate, spread the existing document before deletion's filtered collections and validated document before final mapped collections. Reuse FlowDocumentSchema for FlowEditResultSchema.document; preserve existing unaffected node/edge reference restoration. Test explicit/unclamped/zero origin, absent own-key, no-op/update/collection/compound deletion, rejection/rollback, and actual EditResponseSchema/DeleteResultSchema encode/decode retention. Existing `flow-edit.test.ts:17` fixtures contain no global origin and miss this regression. No 083 core edit is authorized by this report.

### [CORRECTNESS-02] Release the actual lease when native observer construction fails

- **Evidence**: `packages/foldkit/src/measurement-observer.ts:218` receives a registered lease, `:242` constructs ResizeObserver, and only `:254` stores that lease in active slot state. The catch at `:257` retires the still-pending slot; retire at `:89` invalidates leases only for active state at `:97`.
- **Impact**: A throwing/unavailable ResizeObserver constructor loses the observer slot while leaving the acknowledged core lease registered until whole-client disposal. Ordinary setup must retire its actual issued lease even when observer construction fails. This is a concrete failure path, not a claim of failure in healthy Chromium.
- **Effort**: S.
- **Risk**: MED. Cleanup must invalidate only the returned lease and preserve newer replacement authority, without predicting a generation.
- **Confidence**: HIGH, source-confirmed.
- **Fix sketch**: Retain acknowledged ownership across native setup and retire its actual lease on constructor/setup failure. Add a fault test in the reviewed observer boundary that observes exact invalidation, no geometry, drained cleanup and healthy replacement recovery. Client drain units cover late ACK/send failure but do not exercise this constructor gap; native old-callback test at `origin-connection-contract.e2e.ts:1770` wraps a healthy constructor only.

### [TEST-COVERAGE-01] Keep the failed final quality and unfinished gate matrix open

- **Evidence**: `/tmp/flow-083-native-blocker-resumption/required-quality-repair-2.log` ends exit1 with require-readable-spacing at `apps/foldkit/e2e/origin-connection-contract.e2e.ts:2051`, `:2078`, `:2107`. `plans/native-blocker-resumption-execution.md` records no completed 083 focused/full verification or release gate; saved verification scope still identifies 081.
- **Impact**: The candidate cannot meet 083 acceptance, regardless of earlier passing checkpoints. A third repair would exceed the authorized concrete-cause limit.
- **Effort**: M for a separately reviewed resumption and remaining verification; no further current repair is permitted.
- **Risk**: MED. Restarting proof from partial successes could conceal untested final edits or improperly reset the stopped budget.
- **Confidence**: HIGH, final log and frozen record read.
- **Fix sketch**: Preserve the STOP and all logs. A future authorized resumption must retain failed assertions and budgets, complete the retained matrix, regenerate/check API and traces, then pass focused/full/packed/unchanged HMR/release gates and independent reproduction against a new exact freeze.

### [TEST-COVERAGE-02] Distinguish all scalar snapshot and preserved-Model behaviors

- **Evidence**: `apps/foldkit/e2e/origin-connection-contract.e2e.ts:1541` mutates five scalars and origin but observes only origin, immediate threshold and straight line. Its click at `:1610` follows a threshold 0 activated gesture. `scripts/check-packed-consumer.ts:655` likewise checks clickfalse after threshold 0 native ownership; activated cleanup suppresses the physical click independently of connectOnClick. The last packed run in `required-packed-drain-await-repair-1.log` fails genuine preservation and records only one request/restore pair without preserve flush. Strengthened reload guards afterward have not run.
- **Impact**: Mode/radius snapshot precedence and clickfalse preserved precedence are not established. A threshold 0 click can pass with clicktrue, and the failed packed checkpoint does not establish a restored Model.
- **Effort**: M.
- **Risk**: MED. Test instrumentation must use actual public creation, stable mount identity and real plugin traffic, without fabricated Model/readiness or private setters.
- **Confidence**: HIGH for confounding/incomplete proof; implementation failure beyond the separately confirmed origin loss remains unverified.
- **Fix sketch**: Observe same-kind mode and outside-handle radius behavior after caller mutation. Prove clickfalse in a healthy preserved/current Runtime with nonzero threshold through an unconfounded physical click, keeping immediate threshold 0 proof separate. Complete real copied-revision preserve/request/restore traffic, raw-null-before-request, edited document/origin/viewport retention and current native observer delivery before claiming precedence.

### [TEST-COVERAGE-03] Map the remaining retained native matrix and awaited teardown

- **Evidence**: Main `plans/083-resolve-native-host-blockers.md:98` requires explicit-ID reorder/mode toggle, large direct hit/invalid priority and cross-kind/colon reconnect; `:100` requires opposite-kind then accepted declaration-order ties. These lack an exact actual-native mapping in the frozen all-host contracts. Vanilla's five-path loop at `apps/vanilla/e2e/origin-connection-contract.e2e.ts:512` mounts zoom 1; its zoom 0.5/2 loop at `:756` covers default only. Fixtures force autopan false at Foldkit `origin-connection-fixture.ts:129` and Vanilla `:160`, so pending no-autopan is unproven. No native style-removal assertion was located. Existing public-state disposal callers at `apps/foldkit/e2e/public-state.e2e.ts:30` and `:1210` still ignore the now-awaitable teardown.
- **Impact**: Filenames, unit radius policy and structural source similarity do not close native integration contracts. Client settlement in a test does not prove native lease draining and Runtime disposal completed.
- **Effort**: M.
- **Risk**: MED. Add meaningful assertions within reviewed scope; preserve frozen expectations/timeouts/skips except the specifically approved stale radius contract.
- **Confidence**: HIGH for the identified assertion/scope gaps; this is not a claim that all corresponding production behavior is broken.
- **Fix sketch**: Supply exact production-route test mappings or add native retained cases within separately reviewed scope. Exercise all five Vanilla paths at both zooms, pending no-autopan with autopan enabled, native style removal and awaited owned cleanup. Execute the final old-callback/nested-owner/duplicate-canvas and acquisition/disposal cases; added source alone is not proof.

## Repaired preliminary findings and checkpoint evidence

Canvas uniqueness now guards active ownership at `measurement-observer.ts:67-87` and post-REGISTER activation at `:235`; a pending-ACK duplicate-canvas test exists at `origin-connection-contract.e2e.ts:2030`. Source gap repaired, final native proof unexecuted. Installed request/result branch inference and negative registration probes now exist at `tests/consumer/foldkit/consumer.typecheck.ts:621-703`; final packed acceptance remains open. Public refresh acquisition now preserves disposed/missing/stale results at `test-harness.ts:1598`; the existing measured-geometry disposal test awaits cleanup at `measured-geometry.e2e.ts:328`, but its mounted rerun is pending. The narrowly approved inherited radius test now asserts GRAPH policy at `interaction-lifecycle.e2e.ts:1470-1569` and explicitly labels synthetic pointer routing; it has not rerun. Main pagehide remains an explicitly best-effort void fork, not a controlled restart proof.

Personally read checkpoint logs: 31 reducer/client/application tests passed in `required-units-quality-1.log`; unchanged 19 capture cases passed in `required-capture-1.log`; native contract was80/81 with a straight-path whitespace expectation failure in `required-foldkit-contract-1.log`; the source expectation was repaired but not rerun. Architecture/typecheck passes occurred before later edits. These checkpoints do not certify the final candidate. Required broad tests, complete consumer, API/docs/traces/member checks, reconciliation, unchanged HMR, focused/full verify and release dry-run remain incomplete.

## Conformity and deviations

**Conforming in reviewed candidate source:** Schema-derived lifecycle messages enter the serialized AppMessage route, core compare-and-advance issues generations, Graph geometry-only delivery rejects unregistered samples, accepted removals advance tombstones before pruning, exact slot ownership rejects retired/foreign geometry, and the client drains late actual leases with explicit 1000ms failure. Eager public creation snapshots raw options and removes the owned-frame global fallback. Source conformity is not final acceptance.

**Intentionally different test boundaries:** reducer/client units and synthetic inherited radius routing remain distinct from trusted native capture. The unchanged capture helper proves its local primitive cases only. The two distinct nested Runtime test does not establish safety of duplicating one preserved Model into simultaneous Runtimes.

**Unverified or deviating:** three document-origin loss boundaries, native constructor lease retirement, final quality, genuine preservation/scalar precedence, retained matrix and final gate reproduction. No CI, device, performance, collector delivery, full HMR parity, broad semantic parity or parent/member closure follows. STOP preserves all candidate work and these actionable findings without source approval.
