# Independent review of exact number transport

2026-10-02. Verdict: **APPROVE** the additive test-only recording amendment. It makes the existing supported-DTO transport requirement precise without changing production numeric policy, public callback types, or source scope. The previously approved combined recording, native phase, actual Foldkit handle path, and promotion design remains approved. This is pre-lease DESIGN approval only, consumes zero formal SOURCE rounds, and supplies no cells, runtime acceptance, or implementation/shared-work release.

I read the complete `plans/selector-proof-recording-number-amendment.md` and reviewed it against the combined packet already fully read in the preceding reviews. Its SHA256 independently matches `2037b92b055d7958e0f26f666ef05b9afc63c3b8822b9a39e4eb443b6da83c65`. I inspected the actual relevant source and matched those files to receipt `1fbde98287156c15a1ffe7fc4e5dda1f1632f5b98b48c8620c84143959dbb4ef`. I ran no gates or shared work and changed only this main plans review.

Source citations resolve in `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`; planning citations resolve in main `/Volumes/Sync/codex/9-19-26/flow`.

## Assessment

The precision correction is relevant to full actual edge payloads. `packages/core/src/domain/flow.schema.ts:124` allows JSON object data, and `:138` allows finite zIndex values; `:141` derives the native FlowEdge type from that Schema. Finite negative zero must not become positive zero merely because a test collector transports its number envelope through JSON.

Amendment line5 specifies a distinct negative-zero envelope selected by `Object.is(value, -0)`, ordinary finite numbers in number/value, and explicit rejection of NaN/infinities at the evidence boundary. The prescribed transport/Schema-decode checks independently distinguish both signs, with `Object.is` when reconstructed values are compared. These requirements serve the already approved lossless native evidence contract. They do not redefine which values production graph decoding accepts.

Amendment line7 closes a silent-loss gap in arrays. Inspecting own keys and descriptors, rejecting symbol/accessor/extra non-index properties, and retaining indexed order, holes and length is a concrete supported-array boundary. Collection failure remains missing evidence/STOP. Arbitrary decorated JavaScript arrays need not be accepted by the test encoder. Existing own string data-property object entries and envelope-key collision controls stay intact.

The additions belong in the existing test-only recursive Schema/encoder and separate conformance transport tests named by `plans/selector-proof-payload-and-promotion-revision.md:7-9`. Current reference event strings at `research/harnesses/selector-lifecycle/fixture-schema.ts:25-40` remain unchanged. The genuine fixture-dependent conformance case at `packages/conformance/src/selector-lifecycle-reference.test.ts:8-21` must remain required and unrun before its reference lease; the new controls do not stand in for it.

There are no remaining design objections to this amendment. Implementation still must prove exact signed-zero transport, finite-number handling, extra-array-key rejection, existing own-undefined/hole/collision controls, and real attached payload collection. Do not transfer evidence-encoder rejection rules into production decoding or normalize native/reference observations to hide differences.

## Conformity and deviations

- **Conforming in design:** distinct signed-zero encoding and explicit unsupported-array rejection refine the existing supported native DTO recording requirement. All real node/handle paths, historical assertions, lifecycle ownership, promotion sequencing, two genuine CLI invocations and original gates remain required.
- **Intentionally different:** the test-only tagged representation preserves signed zero and own undefined that current plain reference JSON cannot preserve. This is an evidence representation difference, not a production/API behavior change or parity result. Previously classified native query/context differences remain unchanged.
- **Unverified:** implemented encoding/transport/rejection correctness, actual attached native payloads, runtime callback order/generation/lifecycles, promotion failure preservation, reference captures/repeatability and signed-zero/optional-presence parity, actual React TSX declaration compilation, archives, focused/full/root reproduction, fresh SOURCE acceptance, all 513 cells and parent/069 closure, CI, devices, and collector delivery.
