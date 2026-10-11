# Independent scope review of origin and native test integration

Date: 2026-09-30. Reviewed `plans/080-integrate-origin-native-test-contracts.md` at main base841be137e253cf19c665269eaaa79edc19abf3c3. Actual candidates inspected: `/Users/richardmcandrews/.codex/worktrees/native-schema-retention/flow`, `/Users/richardmcandrews/.codex/worktrees/origin-integration/flow`, and the original frozen `/Users/richardmcandrews/.codex/worktrees/origin-contracts/flow`.

**APPROVE the amended architecture and exact three test dependencies.** This is planning/scope approval only. The amendment authorizes assembly of reviewed 079 origin source with the explicit public measurement-readiness repair, while source acceptance remains gated on green 080 integration verification and independent primary review. Neither stopped candidate is accepted by this design review. No product source, candidate, test, dependency, fixture or verification configuration was changed; no test/build/verifier was run. This nonnumeric review record is the only authored artifact.

## Inspected candidate identity

Both candidate HEADs are `841be137e253cf19c665269eaaa79edc19abf3c3` with uncommitted changes. Read-only SHA256 checks identify the exact inspected overlap inputs:

| Candidate | Path | SHA256 |
| --- | --- | --- |
| Frozen 077 | packages/core/src/domain/flow.schema.ts | eafa37913605a929c9cb59eddf8425c8d1d16ea7010f92033d9c773229da857d |
| Frozen 077 | packages/core/src/domain/flow-persistence.test.ts | f8c5a41fbf6301487f8a70abd49c40e7d494ee5ef94eb5eb553525434f480a51 |
| Stopped 079 assembly | packages/core/src/domain/flow.schema.ts | 8c08716c6df581aca42df07aaf454b7d499144ebe997d9f8767e0009558c8838 |
| Stopped 079 assembly | packages/core/src/domain/flow-persistence.test.ts | 60e32b3cac309ab7365394219ed0cd45063745611687ae87f675513ff48ee101 |
| Both | packages/core/src/domain/flow-edge.schema.test.ts | 422aeae5f657c18cc799f3182e42bc2ef944d356fe86cf1237e50d8adbd52bf7 |

## Exact live edge test dependency

The unchanged baseline/native candidate test at `packages/core/src/domain/flow-edge.schema.test.ts:190-213` lists empty ariaLabel among invalid arrow/color/width/reconnection inputs at line 197. The 077 live schema deliberately changes edge ariaLabel from optional NonEmptyString to optional String at native `packages/core/src/domain/flow.schema.ts:134`. The actual required verifier failed precisely at this throw expectation in `/tmp/flow-077-verify.log`, with 494 passing and 1 failing unit tests. Updating the live test is an integration dependency of the approved contract, not a change to renderer behavior.

Approved minimal repair:

- Remove only the empty ariaLabel row from that invalid matrix. Preserve markerStart triangle, invalid stroke, zero strokeWidth/interactionWidth and reconnectable both rejection.
- Add a positive assertion through real full decodeFlowDocument that the edge retains ariaLabel exactly empty, including own key presence where inspected. Do not test only a bare String schema.
- Retain/add null and wrong-primitive label rejection through the same full decoder. False or a number must still fail; null is not optional absence.
- Preserve frozen-v1 empty node/edge label constraints and independent baseline reader rejection. Those remain at `packages/core/src/domain/flow-persistence.ts:47-48,75`; native frozen-reader assertions at `packages/core/src/domain/flow-persistence.test.ts:557-608,771-795` are separate from live decode.

This repair adds no edge ariaDescription, role enum, effective defaults, format relaxation or accessibility rendering claim.

## Exact origin constructor dependency

The new 077 combined precedence test decodes live native fields first at native `packages/core/src/domain/flow-persistence.test.ts:696-709`, then creates two origin-bearing writer inputs at lines 712-717. The own document nodeOrigin undefined row remains valid and must remain present. The node origin literal at line 716 is inferred as number[] in that mapped fixture and becomes incompatible once the live origin field is an exact tuple.

Actual 079 production origin uses `NodeOriginSchema = S.Tuple([S.Finite, S.Finite])` at origin-integration `packages/core/src/domain/flow-origin.schema.ts:8`, derives its type at line 10 and exports it through `packages/core/src/public.ts:2-8`. The 079 assembly has already migrated the old legacy guard constructors at origin-integration `packages/core/src/domain/flow-persistence.test.ts:407,423,431` and the constructed Foldkit model origin at `packages/foldkit/src/application.test.ts:34`.080 must retain those repairs when combining persistence test hunks.

Use the existing imported Schema namespace and actual NodeOriginSchema decoder for the new node origin at native line 716. Preserve exact [0,0], both writer assertions and origin-requires-versioned-session expected code. Do not change origin precedence, delete the own-undefined row, annotate arbitrary number arrays, cast, or change production types. The combined assertion remains a unit writer-boundary test, not a mounted origin geometry proof.

Do not rewrite every raw origin literal. The forged-v1 reader payload at origin-integration `packages/core/src/domain/flow-persistence.test.ts:524` enters an unknown external envelope and intentionally tests frozen stripping; it does not require construction as accepted FlowDocument. A blanket array migration would confuse those separate boundaries.

## Assembly and required evidence

The plan's three explicit assembly decisions are the correct ones:

1. Live flow.schema.ts retains both 079 document/node origins and 077 exact connectable/role/label/description fields. Types continue to derive from those schemas. No origins or native fields enter frozen-v1 schemas.
2. Persistence tests retain 079 authoritative constructors and the entire 077 live retention/legacy matrix, adding only the new combined fixture constructor. Foldkit's existing constructed-model test stays separate from 077's actual public createProgram/Runtime.embed/ports/client fixture. Preserve both new browser files and all three installed consumer probes.
3. Regenerate docs/api-reference.md through the existing generator. Merge authored documentation and the saved verification scope; record exact input hashes and overlap choices without hand-merging generated output or renaming historical failures into success.

Use the exact reviewed 079 origin-integration source as the origin assembly input under the newly approved readiness amendment. The original origin-contracts candidate and native-schema-retention candidate stay frozen. If origin acceptance requires a separately authorized correction,080 must record the actual accepted revision/diff/hash rather than silently taking new changes from a moving directory.

One inherited test comment needs accurate wording during assembly documentation: current 079 `packages/foldkit/src/application.test.ts:70-71` says native extensions remain reserved. After 077 assembly they are live schema fields. Preserve its key statement that explicitly constructed models prove only the unit branch; describe both origins and native fields as live in the execution trace rather than claiming that test is actual public Runtime evidence. This is an evidence-label correction, not a request to change the unit expectations or broaden production scope.

The actual origin unit filename is flow-origin.schema.test.ts. Include it and preserve all targeted geometry/extent/runtime/measurement/visibility assertions from 079, in addition to the080listed native/persistence/application/client dependencies. The saved focused browser union must include measured-geometry, renderer-contract and interaction-lifecycle in all three hosts, public-state in every host, and the Foldkit native-schema proof. The required all-unit baseline remains part of bun run verify. Consumer/docs/catalog/API/member contracts/traces stay selected. Validate the actual merged list before running serial strict-port suites.

## Amended browser readiness dependency

Primary amended 080 after independently reproducing the reconnection-cancellation discrepancy. I read both actual logs, `/tmp/flow-079-primary-reconnection-browser.log` and `/tmp/flow-079-primary-baseline-reconnection.log`. Candidate repeat produced 1 failure/2 passes; the pre-origin contract-acceptance checkout produced 2 failures/1 pass. Both logged the same exact expected fallback SVG `M 255.5,162L 354.5,162` and measured output `M 255,162L 355,162`. These are inspected primary executions, not browser runs by this reviewer. They establish the failure exists at the baseline boundary; they do not establish full-suite source acceptance.

The unchanged test captures originalPath immediately after mount at `apps/vanilla/e2e/interaction-lifecycle.e2e.ts:457`. Fallback handle geometry has 11 by 11 dimensions at `packages/core/src/domain/flow-edge.schema.ts:48-49`. Actual handle measurement reads DOM bounds and converts through zoom at `apps/vanilla/src/edge-renderer.ts:35-69`. The ResizeObserver callback installs the current-generation measurement state at `apps/vanilla/src/mount-flow.ts:2449-2456`, then repaints edges at line 2462. Reconnection cancellation clears the active session/preview and releases pointer ownership at `apps/vanilla/src/mount-flow.ts:3208-3227`, and reports cancellation at lines 3229-3257 without an accepted graph edit.

The proposed public readiness precondition is supported by the actual public APIs. getInternalNode reads getFlowInternalNode through the owning measurement state at `apps/vanilla/src/mount-flow.ts:8597-8602`; nodesInitialized delegates through the same state at lines 8604-8608. The internal-node projection returns accepted measured handles or an empty list, rather than fallback handles, at `packages/core/src/domain/flow-measurement.schema.ts:362-368`. It detaches/freezes their offsets at lines 374-379. Thus checking the actual source out and original-target in handles, with positive sizes and current declared IDs, excludes the fallback-only capture state.

APPROVE this exact additional edit to the single reconnection-cancellation test. Poll nodesInitialized and the two endpoint getInternalNode projections before reading originalPath; capture the accepted snapshot at that same readiness boundary. Assert the snapshot is identical after Escape and preserve exact SVG equality, removed preview, zero semantic changes and fresh successful reconnection. Missing controller, internal node or required handle must keep readiness false or fail visibly; it must not make the assertion vacuously pass. Use the existing public controller, no private measurements, arbitrary sleeps, tolerance, retry policy, skips, production changes or changed expected path formula. Repeat the repaired case three times and run the full lifecycle file before the mandatory saved integration verifier.

This fixes a test lifecycle precondition while retaining its original cancellation guarantee and adding an accepted-state assertion. It does not grant authority to change origin formulas, measurement generation, reconnection semantics or framework implementation. If the explicit readiness repair fails, report the new exact boundary instead of classifying it away or broadening source scope.

## Revised assembly and acceptance gate

The previous version of this review held execution until 079 was independently accepted. That condition is superseded only by primary's newly recorded baseline reproduction and exact 080 readiness supplement. 080 may now assemble the reviewed 079source and frozen 077 candidate with the three named test dependencies. The historical stopped records and both original candidates remain unchanged. Source acceptance still requires the merged focused verifier, primary full-diff inspection and independent reproduction; inspected baseline failures or the new unit fixes cannot substitute for that evidence.

Actual 079 record `plans/origin-integration-execution.md:41-49` still reports its stopped mandatory verifier, and Vue/Foldkit browser scopes were not reached there.080 must preserve that history and run its full saved focused union, all-host public-state, mounted native proof and installed consumers. No origin or native source acceptance is claimed in this review. A green focused verifier does not establish full-suite acceptance, 070 round trips, 068/074 native rendering, generic 069 or original member closure.

## Conformity and deviations

- Conforming to the approved Flow contracts by source inspection: finite Schema-derived tuple origins, live String empty-label retention, frozen-v1 empty rejection and origin-first writer failure. No new test or runtime result was produced in this review.
- Intentionally different test boundaries: raw unknown forged-v1 envelopes, accepted full-document decode, constructed writer/model fixtures, actual mounted Foldkit producer/client and installed declarations each prove their own contract. Preserve those labels and independent frozen oracle.
- Unverified and held: origin/native source acceptance, 080 assembly/verifier, 070 versioned round trips, 068/074 computed rendering and all generic/parent member cells, full-suite/CI/device/collector evidence. Planning approval closes none of these boundaries.
