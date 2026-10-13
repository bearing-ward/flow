# Native parity continuation design review

2026-10-02. Read-only source review for the newly authorized continuation. APPROVE the two-stage assembly and the repairs below as design direction, conditional on the executable plan specifying setup rollback and independent scalar proofs. No source, gate, browser, port, install, commit, or executor action was performed by this reviewer. This is not source acceptance.

## Evidence boundary and assembly

Read the frozen 083 execution report, measurement observer/client and client tests, application creation and Graph click/threshold paths, six observer composition paths, native scalar browser tests, packed preservation source/runner, existing HMR runner, installed Runtime/plugin, and frozen 084 execution/freeze records. Production citations below refer to `/Users/richardmcandrews/.codex/worktrees/native-blocker-resumption/flow` unless marked 084 or installed. Frozen 084 is `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/flow`.

083's final source manifest SHA256 is `c2f96da7c40acc86be8986fa5da4bef77c6335b94703ea83bbfffd2089c5a746`; its patch SHA256 is `21a0f29f36e4716a3fa8aff5b7df9a900c01e4b7fe3fda4336858dc50404f310`. It has 171 output paths. 084's final freeze SHA256 is `109a4474797b0d34ebd6bac7c5773a25a8a0c423c13ce0e8c8e9d3b531b4a692`, provenance `5dbfb1a90c589cde9042580d3e5093dd63bddf712f58bbc14d6ba3ffb9ea1378`, and accepted-input delta patch `550d58810042c1a63570e2bf7a7848d723030031d2f832a147c4267880f0db66`. Original snapshots stay immutable. New user authorization permits fresh repair work; the earlier exhausted repair rounds and failed final gates remain recorded historical facts.

Phase A should begin from exact 084, repair mechanical quality and record precision, rerun final tests and the complete saved narrow focused scope, and receive independent acceptance before its result is imported. The reported 36-test success preceded the final test-shape changes; it cannot stand in for this rerun. Preserve the exact three production deltas: two metadata spreads in flow-edit.ts and the authoritative FlowDocumentSchema result field in flow-edit.schema.ts. The third core file is flow-edit.test.ts, not an additional production change.

Phase B begins from the complete exact 083 snapshot, then imports those three core files and applies only 084's added real packet-test delta to packages/foldkit/src/application.test.ts. Do not overwrite the whole test file from 084: retain 083's lifecycle/creation tests. Preserve each phase's verification config and receipts as separate evidence; final saved scope must include both stages' relevant proof. Accepted packet units prove the application EditResponseSchema and DeleteResultSchema transport fields, not mounted geometry or preservation.

## Concrete findings

### [BUG-01] Record the acknowledged lease before constructing browser resources

- **Evidence:** packages/foldkit/src/measurement-observer.ts:218-259 receives a registered lease, checks DOM ownership and constructs ResizeObserver while slot state remains pending; state becomes active only at :254. retire at :89-100 releases only active slots.
- **Impact:** an ownership-query or ResizeObserver-constructor exception after REGISTER acknowledgement retires a pending slot without invalidating the actual issued lease. The client may eventually release it during whole-client disposal, but the failed element lifetime remains current while the mounted host continues.
- **Effort:** S, including browser fault regressions.
- **Risk:** MED; registration retirement and delayed ACK races must preserve conditional generation authority.
- **Confidence:** HIGH; direct source path.
- **Fix sketch:** represent pending, acknowledged, active, and retired ephemeral slot states. Store the actual validated lease immediately after acknowledgement, before fallible ownership lookup or resource construction. Any subsequent failure retires that exact lifetime and conditionally invalidates its actual lease; do not predict a generation.

### [BUG-02] Complete retirement and shutdown despite disconnect failures

- **Evidence:** measurement-observer.ts:97-100 calls ResizeObserver.disconnect before invalidate. Mutation callback :307-330 invokes retirement without an enclosing cleanup guarantee. dispose :344-355 marks disposed and disconnects MutationObserver only after retiring all slots.
- **Impact:** one failing disconnect skips that slot's release, aborts remaining retirement, and leaves the observer open. Existing callers then fail before reaching the bounded registration drain and Runtime teardown: apps/foldkit/src/main.ts:589-622; origin-connection-fixture.ts:448-464; handle-refresh-fixture.ts:155-164; test-harness.ts:442-459; tests/consumer/foldkit/main.ts:395-407; generated packed composition scripts/check-packed-consumer.ts:649.
- **Effort:** M, including all composition/fault evidence.
- **Risk:** MED; disposal ordering must keep Runtime ports alive through the registration drain.
- **Confidence:** HIGH; direct source paths.
- **Fix sketch:** remove the exact slot and mark it retired first, attempt disconnect and actual-lease release independently, report errors after cleanup has been scheduled, and continue through all slots. Close observer delivery before disposal starts and guarantee MutationObserver disconnect. Keep the existing void observer disposal API usable, containing cleanup errors so callers can await the client drain and then dispose Runtime; ensure an optional error reporter cannot abort the remaining cleanup.

### [BUG-03] Roll back composition when initial observer setup fails

- **Evidence:** measurement-observer.ts:307-339 constructs and starts MutationObserver before returning. apps/foldkit/src/main.ts:492-510 already owns a Runtime and subscribed client when this setup is attempted; its later shutdown handler is :626.
- **Impact:** MutationObserver.observe failure leaves its constructed resource without disconnection and can abort host setup before a normal disposer is available. A factory rollback alone cannot close the caller-owned client and Runtime.
- **Effort:** M together with BUG-02.
- **Risk:** MED; existing clients, subscriptions, and UI resources must close in ownership order.
- **Confidence:** HIGH for the setup boundary; browser fault injection supplies execution proof.
- **Fix sketch:** the factory must disconnect a constructed MutationObserver when setup fails, without swallowing the setup cause. Each of the existing six composition paths must retain a reachable rollback that closes already acquired resources, drains the registration client while ports remain live, and guarantees Runtime disposal. Use those existing paths; no new graph owner or generic lifecycle framework is needed.

### [TEST-01] Isolate click, threshold, mode, and radius assertions

- **Evidence:** origin-connection-contract.e2e.ts:1541-1613 captures five scalars but independently checks only origin, threshold zero, and straight preview. Packed preservation source :621-623 uses threshold zero with click false; verifyPreservedNativeGestures :731-740 claims click precedence after a real click. Graph.ts:1755-1757 promotes threshold zero immediately, while :1915-1919 handles drag-click suppression before connectOnClick.
- **Impact:** threshold zero can suppress the physical click even if click false was lost. The caller-mutation test does not independently prove radius or mode retention. A green combined gesture therefore leaves part of the claimed contract unproved.
- **Effort:** S to M.
- **Risk:** LOW; strengthen existing public browser proof without production changes.
- **Confidence:** HIGH; actual source and assertions.
- **Fix sketch:** use a separate positive-threshold click-false case and a healthy click-true control with the same threshold. Add a same-kind candidate whose validity distinguishes loose from strict, and a point outside the physical handle but inside the conflicting radius, followed by a direct hit. Preserve threshold-zero immediate promotion and exact line-path checks in a separate gesture case.

### [TEST-02] Require a real second boot before accepting preserved Model authority

- **Evidence:** scripts/check-packed-consumer.ts:594-651 builds the public native probe; :826-883 now tests raw null before a second restore request and observes restored revision/boot. The last executed required-packed-drain-await-repair-1.log showed only the first request/restore, false null markers, and edited document without global origin. Final boot guards were added later and were not rerun. Installed runtime/runtime.js:113-119 skips init for a valid restored Model; :132-147 flushes at actual vite:beforeFullReload. Installed @foldkit/vite-plugin/dist/index.js:117-145 serves reload-qualified preserved Models. Existing scripts/check-foldkit-hmr.ts:339-395 demonstrates the actual temp revision-triggered reload route.
- **Impact:** without the second boot/flush boundary, an edited first Runtime can look like restoration. The global-origin loss in the failed probe is consistent with the separately diagnosed core metadata loss, so Phase A is necessary before judging preservation.
- **Effort:** M including unconfounded restored click evidence.
- **Risk:** LOW to MED; keep reload isolated from concurrently running shared browser fixtures.
- **Confidence:** HIGH about the current proof gap; actual restored behavior remains unverified.
- **Fix sketch:** retain the existing isolated temporary packed consumer, pinned plugin, stable mount id, and real revision write. Observe actual preservation/reload/request/restore through browser WebSocket events, a second navigation and revision/boot, and fresh native measurements. After reload, call otherwise valid actual createProgram with raw null before embed and assert it throws without another Model request; then embed valid conflicting creation options and prove accepted edits, origin, viewport, and all six restored values govern public behavior.

## Required proof and bounded scope

Use actual Runtime lifecycle ports and live DOM for observer failure tests. Existing origin fixture wraps genuine responses to hold REGISTER replies at origin-connection-fixture.ts:235-249, exposes lifecycle/measurement history :280-297, and supports observer restart :298-304; extend that seam without fabricating a lease or accepted Model. Wrap and restore only native ResizeObserver/MutationObserver capabilities in each fault test's finally. Cover ResizeObserver constructor, observe, and disconnect failures; MutationObserver initial observe and disconnect failures; and cleanup with more than one active slot. Assert the exact registered lease has an invalidate response, retirement stops further measurement, unrelated slots still clean up, client disposal completes or returns its explicit bounded failure, and a restored capability permits healthy acquisition. A synthetic callback invocation alone is not native measurement/capture evidence.

Retain unit tests for the client transport boundary in node-measurement-lifecycle.test.ts:110-154 (late actual ACK and exact release ACK), :157-190 (conditional release and pending prepare), :192-259 (malformed/mismatched ACK and send failure), and :263-280 (fixed 1000ms timer, waiter settlement and unsubscribe). Add multiple outstanding leases and prepare/register waiters so resource teardown is proved across the whole client rather than one entry. Keep failure distinct from successful disposal. No speculative unsubscribe-failure enum or changed wire authority is required by this review; the diagnosed resource exceptions are in observer setup/disconnect.

Run fresh creation caller-mutation proof independently of restoration. The absent and own-undefined scalar tests currently establish acceptance/mount, not every effective default. Link them to behavior assertions for the existing defaults. Reject invalid origin components/tuple sizes and scalar null/invalid values at the actual createProgram entry before embed. The original eager validation and immutable snapshot policy at application.ts:2671-2702 remains approved; initial Model stays lazy and a valid preserved Model retains authority.

For preservation, parameterizing two isolated probe runs is sufficient: one for threshold-zero/mode/radius/line/origin, one for positive-threshold click false and a healthy click-true control. Count actual request/restore events per boot/runtime so the test does not assume a one-Runtime total when adding a control. Keep viewport value assertions from preservedDocumentMatches :661-663. No private startup method, Model injection, fabricated preservation response, or dispose/re-embed substitute qualifies. Retain the ordinary test:foldkit:hmr command as well as the native packed proof.

Minimal production scope is measurement-observer.ts plus existing observer composition paths for setup rollback and shutdown reachability. Lifecycle-client source changes require a demonstrated client fault, not speculation; its existing units may grow within current scope. Existing application/Graph/core generation authority stays unchanged beyond the approved 084 core import. Test scope is the existing native contract/fixture, lifecycle units, packed runner/consumer, and retained matrix files already allowed by 083. A newly discovered source path or contract change needs concrete architecture review before edits.

Retain all 081 acceptance rows and assertions, including raw unregistered MeasureNode guarding, document removal invalidation on every accepted route, same-element/id/restart lifetime changes, owner uniqueness, late ACK draining, origin and targeting edge cases, and ordinary versioned restoration. Keep the capture helper byte-identical and run its 19 cases. Installed same-entry switchMap ordering makes old-finalizer-after-new-acquire unreachable under the pinned topology; this does not excuse public remove/restore, current/foreign loss, successful native capture, acquisition/finalizer failures, and disposal evidence. Do not change assertion strength, skips, tolerances, or lint policy to force acceptance.

Every retained focused browser scope, saved focused verifier, ordinary HMR test, packed consumer, full verifier, release dry run, and independent final review remains required. Preserve first failing logs, distinguish mechanical formatting repair from a new architecture cause, release owned ports, and freeze final complete inventories before primary reruns. Historical passes are checkpoints, not acceptance of the newly assembled source.

## Conformity and deviations

Conforming in design: core owns document meaning and the authoritative Schema; Foldkit adapter owns ephemeral browser lifetimes; composition owns acquired resource shutdown. Schema-derived protocol types and actual core-issued generations remain authoritative. Public production routes and transport-unit boundaries are named separately.

Intentionally different: the native lifetime protocol and public option timing policy implement Flow's reviewed native contract. Installed stream ordering is an invariant supporting the unreachable same-entry finalizer case, not React Flow parity evidence. Temporary packed HMR isolation protects the genuine restore test from unrelated server reloads.

Unverified: new failure cleanup, all newly strengthened scalar/restoration assertions, final retained matrix, focused/full/release gates, and primary source acceptance. Local integration does not establish all library API parity, CI, native-device coverage, performance, or OTLP delivery. The remaining backlog requires member-specific evidence or an explicit intentional-native-difference rationale.
