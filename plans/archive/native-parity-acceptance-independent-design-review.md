# Native parity acceptance independent design review

2026-10-02. **APPROVE the amended design.** The complete amended plan resolves all four concrete execution ambiguities below. Lease authority, deterministic assembly, scalar isolation, preservation, retained matrix and acceptance gates are executable within the named scope. This review is source-independent design approval; the primary owns executor dispatch and final source acceptance.

Reviewed the complete initial Plan 086 at SHA256 `74548435cdb0bc6a3671c5cb3b3beecd022762f5c79381af04d2eabc65a35cca`, reread the complete amended plan at `c25f4f8a8b06ab4995f821af7ab809fba399ebff56b7c01e83a2ceecf69d96f0`, and reread the complete final actual plan at approved SHA256 `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f`. Independently inspected frozen 083 observer/client/application/Graph and six composition paths, immutable capture helper caller, scalar browser assertions, packed restoration runner, installed Runtime/plugin, verification planner/tooling, and frozen 085 origin-edit prerequisite. All source citations below refer to `/Users/richardmcandrews/.codex/worktrees/native-blocker-resumption/flow`. No source, install, build, test, browser, port, index, commit, or subagent action was performed. This review file is the sole write.

## Assembly and approved architecture

The complete 171-path 083 manifest plus exact three 085 core files and only the added packet-test hunk is the correct assembly. Independently rehashed the 085 freeze as `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef` and all three specified core files; every specified hash matches. Application packet tests at accepted 085 application.test.ts:266-342 are genuine public core edit/delete results encoded and decoded through production response Schemas. Applying their delta preserves 083 lifecycle/creation coverage. Acceptance records remain distinct from historical inputs, and the historical repair budget is not silently reset.

Pending to acknowledged to active to retired is sufficient: acknowledged stores the exact issued lease before ownership lookup/construction; late ACK for a retired slot conditionally releases without reopening it; only active owned slots emit geometry. Ownership must apply the lease instance in both acknowledged and active states. Release scheduling must survive disconnect and optional error-reporter exceptions. Disposed must be set before walking slots and mutation disconnect attempted regardless of individual retirement failure. No core generation, wire, Model, or public creation contract change is needed.

The allowed observer plus six existing composition files is sufficient for the diagnosed setup/cleanup repair, provided the execution details below are explicit. Existing client late ACK, conditional invalidation, fixed deadline and teardown units remain required; client production changes need a reproduced source fault and primary review. The real Runtime response hold seam and native constructor/observe/disconnect wrappers distinguish mounted cleanup proof from transport units. No new lifecycle framework or graph authority is needed.

## Resolved execution requirements

These findings described the initial draft. The approved amended plan now explicitly supplies their remedies. Synchronous failure schedules an observed Effect drain with guaranteed teardown and rethrows the original cause; resource and native observations can verify completion without adding a public cleanup API or fabricated success. Early main rollback names its previously acquired observer/listeners. Raw creation preserves actual optional-key presence and the fixture can enable auto-pan. Saved verifier checks are supported names and ordinary HMR remains standalone.

### [CORRECTNESS-01] Preserve synchronous origin-fixture semantics during rollback

- **Evidence:** origin-connection-fixture.ts:56-63 exports a synchronous factory. The byte-identical capture helper at origin-connection-capture.e2e.ts:267 assigns its immediate return to window.originConnectionFoldkit. Plan step 4 tells origin/refresh/consumer factories to await registration drain and then rethrow while also preserving the immutable helper and existing semantics.
- **Impact:** converting the origin factory to async would assign a Promise to the helper's fixture field and break all unchanged capture cases. Simply applying the instruction literally requires changes forbidden by hard scope.
- **Effort:** S clarification and bounded cleanup proof.
- **Risk:** MED; cleanup must remain reachable without changing caller contracts.
- **Confidence:** HIGH; exact caller and signature read.
- **Fix sketch:** explicitly retain mountOriginConnectionFixture's synchronous signature and the helper bytes. On setup failure, synchronously detach owned resources, initiate registration drain, guarantee Runtime/root teardown through the scheduled cleanup, and synchronously rethrow the original setup cause. Provide an observable bounded cleanup completion for the fault test within the already allowed fixture/contract files; normal async disposal still awaits its drain. Async factories may await before rethrowing. Do not convert the helper or whole fixture API to async.

### [CORRECTNESS-02] Include main's already acquired observer and listeners in early rollback

- **Evidence:** main.ts:268-278 creates labeledHandleObserver and registers an anonymous pagehide callback before measurement observer construction at :496. Pre-setup viewport buttons register anonymous click handlers at :413. Later measurement setup failure currently aborts before disposeRuntime/pagehide at :574-626. The plan names UI mounts/subscriptions, viewport/delete clients and measurement subscription, but does not explicitly include these earlier observer/listener resources.
- **Impact:** rollback that only implements the enumerated resource list leaves the labeled MutationObserver and attached handlers alive after the failed composition. Calling the later disposer would also encounter its known temporal-dead-zone boundary.
- **Effort:** S within already allowed main.ts.
- **Risk:** LOW to MED; retain normal host behavior and acquire only concrete local cleanup handles.
- **Confidence:** HIGH; exact acquisition order read.
- **Fix sketch:** add labeledHandleObserver plus its pagehide callback and already attached viewport handlers to the explicit early-resource rollback list, retaining local removable listener functions. Include them in normal shutdown as appropriate. Early rollback accesses only resources already acquired at :496, sets runtimeDisposed first, settles pending measurements, drains while ports are live, and guarantees Runtime disposal. It must not reference later snapshot/edit/refresher bindings.

### [TEST-COVERAGE-01] Pass actual absent options and enabled auto-pan through the public fixture

- **Evidence:** origin fixture options Schema :35-41 omits autoPanOnConnect. creationOptions :126-135 spreads defaultInteractionOptions and hardcodes autoPanOnConnect:false before calling createProgram :137-148. The raw matrix asserts own presence on its caller options at origin contract :1449, not the actual public creation argument. Plan steps 6/8 require actual absent/own-undefined raw creation and pending no-auto-pan with autoPanOnConnect:true.
- **Impact:** absent scalars currently become present defaults before the actual entry, and enabled auto-pan cannot reach it. A passing test could prove neither requested boundary.
- **Effort:** S within the existing allowed fixture and contract files.
- **Risk:** LOW; preserve normal fixture defaults and strengthen proof only.
- **Confidence:** HIGH; actual Schema/construction path read.
- **Fix sketch:** explicitly authorize adding autoPanOnConnect to this fixture's Schema using the existing Schema-derived Boolean contract and passing it through with false as the omitted fixture default. For rawCreation, do not prepopulate the five scalar defaults before createProgram; pass raw optional-key presence through and assert own-key status at that actual call. Normal fixture default behavior stays intact. This needs no package/API Schema change.

### [TEST-COVERAGE-02] Name the supported saved verifier checks exactly

- **Evidence:** scripts/verification-plan.ts:5-19 and docs/tooling.md:52 list supported extra checks; hmr is not one. Plan step 9 says focused config includes docs/contracts/consumer/hmr relevant checks, while later commands correctly name standalone test:foldkit:hmr.
- **Impact:** an executor could add an unsupported hmr check and fail verifier selection before required tests start, or incorrectly assume saved verify automatically includes that command.
- **Effort:** S wording only.
- **Risk:** LOW.
- **Confidence:** HIGH; config Schema and tooling read.
- **Fix sketch:** list actual supported saved checks explicitly, keeping ordinary test:foldkit:hmr as a separately required command. Native preservation remains part of packed test:consumer. The full verifier, focused verifier, and standalone HMR receipts remain distinct.

The final plan also corrects the nonblocking citation: frozen observer :353 sets disposed after the retirement loop and before MutationObserver.disconnect at :354. Retirement errors can therefore prevent delivery from closing. No unresolved design finding remains.

## Scalar, preservation and acceptance review

Positive-threshold click-false plus same-threshold click-true control removes the threshold-zero confound. Caller snapshot and restored Model proofs must separately observe same-kind loose versus strict validity, outside-physical/inside-conflicting-radius candidate rejection and direct-hit recovery, zero-threshold immediate activation, exact straight preview path, document origin, and restored viewport. The raw null check must use otherwise valid options and happen after real reload but before valid embed sends its restored Model request.

The approved isolated temporary packed consumer, installed plugin, stable mount id and real revision change can prove genuine restoration. Require navigation/boot/revision and producer measurement evidence from the second Runtime, actual preserve/request/restore events per runtime/boot, and public semantic edits that would be absent from fresh initialization. Retain ordinary HMR as well. A first Runtime snapshot or dispose/re-embed does not qualify. No private Model or fabricated payload is needed.

All retained rows and unchanged capture helper remain mandatory. Opposite-kind/accepted-order ties, explicit-id reorder/mode toggle, cross-kind/colon reconnection, direct-hit priority, two zooms, pending enabled auto-pan, native style removal, and all nine mounted ownership projections must map to concrete assertions. Select exact existing filenames for final saved scope; a future required path outside the hard delta needs an exact amendment before edits. Do not expand member closure from matrix names or test counts.

The full/focused/packed/ordinary HMR/native HMR/release/docs/reconciliation gates, final-record quality, source freeze, port release and independent primary reproduction are clear. Mechanical repairs may continue under the fresh authorization; unknown architecture and out-of-scope production changes require source-backed review. No assertion, skip, tolerance, timeout, lint or dependency weakening is authorized.

## Conformity and deviations

Conforming design: authoritative core Schema and issued generations remain stable; adapter owns ephemeral browser lifetimes and composition owns cleanup. Production entry points, mounted faults, protocol units and installed restoration are separate evidence paths.

Intentionally different: Flow's native lifecycle/timing policy and pinned same-entry old-finalizer ordering are reviewed native behavior. The unreachable old-finalizer-after-new-acquire case does not remove ordinary owner/removal/loss/fault/disposal proof. Isolated packed HMR protects the genuine reload from shared server activity.

Unverified: implementation, all final matrix/gate proofs and final source acceptance. No library-wide parity, CI/device/accessibility/performance/collector claim follows from this design review.
