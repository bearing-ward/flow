# Independent review of native blocker resumption

Date: 2026-10-01. Verdict: **APPROVE the architecture and execution plan**. No design revision is required before a separate executor starts. This is not source approval, verification acceptance, or closure of 081.

## Reviewed identities and boundary

Read all of main `plans/083-resolve-native-host-blockers.md`, `plans/archive/native-generation-blocker-design.md`, and `plans/archive/native-scalar-and-finalizer-blocker-design.md`. Independently verified their SHA256 values:

| Record | SHA256 |
| --- | --- |
| 083 | `1a059a1548366999fcda29f0a42348127c6b636d4a25aaf0bbfcc9dbbcc804e0` |
| Generation design | `0caa4409a78b57beea61a3946955be56d2f79d49e364d19cc908d66f5b9e4483` |
| Scalar and finalizer design | `82e32e04dbf1fbc93a41debe0174f6b5cf88902fb79ec8a2b9929823544fca8b` |

Main HEAD was independently read as `841be137e253cf19c665269eaaa79edc19abf3c3`. The source citations below refer to frozen `/Users/richardmcandrews/.codex/worktrees/origin-connection-hosts/flow`. The capture helper was read separately in `/Users/richardmcandrews/.codex/worktrees/origin-capture-proof/flow`; its SHA256 matches `7803c8c6510c68c313d249ad0282f92ddc4c02b73ddb0686880dab7ae57bc71c`.

Read project standards and the supplied AGENTS instructions, improve's complete skill and closing-the-loop reference, the audit playbook including Correctness / Bugs, Test Coverage, and Finding format, plus TypeScript/type-system and unslop guidance. Relevant canonical 081 decisions and amendments, the current plan index, and actual source paths were inspected. No source writes, builds, tests, browsers, ports, verification commands, installs, commits, or cleanup occurred. This reviewer writes only this record. The 157-path snapshot was not independently assembled or rehashed here; executor and primary still own that receipt and drift gate.

## Architecture assessment

The generation defect has a direct source path. `measurement-observer.ts:155-164` assigns a local generation and measures without registering it. `application.ts:1061-1101` routes the public measurement and publishes its result; `graph.ts:2296-2304` calls core directly. Core rejects a mismatch at `packages/core/src/domain/flow-measurement.schema.ts:155-160` and keeps generation rows when pruning at `:216-230`. The helper's real public remove/restore path retains its readiness and positive geometry assertions at `origin-connection-capture.e2e.ts:603-677`. Approval does not replace those assertions with reducer evidence.

Prepare followed by compare-and-advance is a sound fit for the existing authority. Core's advance helper at `flow-measurement.schema.ts:67-83` chooses the next generation. Comparing the prepared instance and nullable generation in the serialized reducer prevents replay and stale registration from advancing a replacement. Exact-lease invalidation cannot revoke a later generation. Dedicated request/result ports preserve measurement-result compatibility. The normal application graph fold uses `Graph.update` at `application.ts:939-950`; installed `node_modules/foldkit/dist/runtime/messageQueue.js` buffers and drains messages in arrival order. The actual Runtime tests still need to prove transport and response ordering.

A single Graph update completion boundary is necessary and sufficient for accepted removal. Existing routes include `ReplaceDocument` at `graph.ts:1586-1604`, command transactions at `:1087-1109`, edit requests at `:1152-1202`, and approved delete results at `:1638-1660`. Comparing previous and returned accepted document references preserves the controlled proposal path and avoids scans on unchanged documents. Move the existing replacement prune into the reviewed ordering so tombstone advancement precedes pruning. Application's later accepted-document observation at `application.ts:2516-2528` cannot protect standalone Graph update calls.

The observer slot design addresses the actual gaps in `measurement-observer.ts:67-79,128,141-172`: ownership previously used containment, manual measurement could borrow a counter, detached elements stayed in the WeakSet, and data-node-id changes were unobserved. Exact element, node ID, sequence, connected owner, and nearest canvas checks must precede every delivery and repeat after asynchronous registration. Removed MutationRecords must retire slots even after same-delivery reinsertion. A pending valid manual measure may queue work; the refresher's existing requested status at `update-node-internals.ts:66-71` remains a scheduling result. No extra Model lease registry is needed.

The bounded client drain is coherent with a synchronous observer dispose. Observer retirement happens first; client close rejects ordinary new work while retaining the internal cleanup needed for issued REGISTER replies and exact INVALIDATE acknowledgements. A late register reply must use its actual returned lease. The fixed 1,000 ms deadline produces an explicit failure and ends subscription/timer retention. It never establishes release after a timeout. All six named compositions are real callers, and the shared fixture's widened disposal type and awaited call at `apps/shared-e2e/handle-refresh-fixture.ts:29` and `handle-refresh-contract.ts:394` are sufficient scoped changes. Pending-refresh assertions at `:399-403` remain unchanged.

Eager scalar validation resolves a real construction/restoration timing gap without changing the core contract. Origin and styles decode at `application.ts:2591-2611`; scalar decoding currently waits for the init thunk at `:2631-2645` and `graph.ts:4828`. Installed `node_modules/foldkit/dist/runtime/runtime.js:113-119` skips init for a decoded preserved Model. The proposed private snapshot fixes the raw creation boundary while keeping lazy fresh initialization and restored Model authority. The existing fixed typed Graph recheck is a bounded, explicitly approved exception; it does not justify a new unchecked initializer or a second configuration owner. Controlled origin remains the existing command at `application.ts:631-642,2632-2634`.

Removing the private flowPoint global fallback at `graph.ts:1497-1509` is correctly scoped. Explicit null must keep the zero-frame calculation rather than subtract another canvas's frame. Current callers already provide the owner argument. Unit conversion evidence and mounted owner-isolation evidence remain separate.

The narrow finalizer ordering clause is supported by installed source. Foldkit uses default switchMap at `node_modules/foldkit/dist/runtime/subscriptionFibers.js:42`; Effect defaults concurrency to one at `node_modules/effect/dist/Channel.js:2839-2843`, joins old interruption before replacement work at `:2903-2923`, and the candidate acquires capture lazily at `graph.ts:4254-4277`. The actual identity guard at `:4166-4182` stays necessary. This only establishes the same-entry ordering. Runtime disposal forks interruption at `node_modules/foldkit/dist/runtime/start.js:89-96`, so original native controls must still be polled independently for capture release. This reviewer read compiled source but did not rerun the primitive or native tests.

## Execution points requiring exact proof

These are placements and tests of existing 083 requirements, not new scope or acceptance conditions:

1. Enforce geometry-only delivery's no-registration rule in the Foldkit Graph measurement boundary. Unchanged core apply can bootstrap an absent generation at `flow-measurement.schema.ts:153-160,185-190`; leaving Graph's unconditional call unchanged would violate `083:43`. Prove an existing accepted node with no registered generation remains unchanged after raw MeasureNode, then prove acknowledged registration permits that sample. Do not change core bootstrap behavior.
2. A closing client must allow its internal exact-lease cleanup even while ordinary calls return disposed. Test a REGISTER ACK after observer retirement and after client close begins, conditional INVALIDATE acknowledgement, duplicate disposal, and deadline/failure resource cleanup. Returning disposed before a late issued lease is drained would violate `083:48-50`.
3. Preserve the exact helper assertion at line 636 and positive handle checks at lines 637-652. All accepted removal routes, same-element reinsertion, data-node-id change, restart, delayed callbacks, and sibling/nested owners require meaningful assertions. Passing only the original same-ID helper does not prove the complete observer protocol.
4. Raw public option cases must bypass fixture predecoding. Prove own undefined independently of JSON transport; isolate null/0/false and origin cases; mutate caller inputs before embed. Genuine preserved Model proof must use the installed preservation path. Ordinary dispose/re-embed is fresh according to `node_modules/foldkit/dist/runtime/modelPreservationBridge.js:12-15`. If genuine restoration is unavailable, preserve that acceptance gap and STOP as the approved design requires.
5. Save the updated focused scope and run focused, full, packed, and local release gates. Preserve the full retained 081 matrix, strict ports, exact assertions, and existing tolerances. Neither architectural approval nor focused success closes full integration, parent/member plans, native-device, collector, or parity boundaries.

No actionable design defect remains after interpreting the main plan as the exact scope authority over illustrative supplemental filenames and port alternatives. Historical 081 budgets and frozen inputs remain intact. The new stage's two focused repairs per concrete cause and two formal review rounds are bounded by 083; approval does not authorize additional files or redesign during execution.

## Conformity and deviations

Conforming, source-derived architecture: one existing measurement authority, Schema-derived protocol data, core-issued generations, framework lifecycle in packages/foldkit, and application-owned composition. Actual runtime and browser behavior remain unverified in this review.

Intentional native decisions approved for execution: asynchronous registration acknowledgement, exact-lease bounded draining, eager raw creation validation with preserved Model precedence, the private owned-frame correction, and the precise installed same-entry finalizer ordering classification. Their reasons and separate unit, installed primitive, and mounted test boundaries are retained.

Unverified: the new source implementation, actual protocol transport and cleanup, restored Model probe, unchanged helper's final readiness/capture case, full retained 081 matrix, saved focused/full/release acceptance, CI, devices, and collector delivery. No source similarity or compiled ordering claim establishes those results.
