# Pure path-helper public and reference contract

This trace covers the existing four public path helpers and the getEdgeCenter companion. It covers caller-supplied graph coordinates, exact mutable tuples and public declarations. No graph state or host lifecycle participates in these calls.

## Production public path

The actual package entry `packages/core/src/public.ts:327` exports getEdgeCenter from compatibility geometry. `packages/core/src/public.ts:333` exports getBezierPath, getSimpleBezierPath, getSmoothStepPath and getStraightPath, retaining the four parameter names at `packages/core/src/public.ts:340`.

Straight coordinates derive from private Number fields at `packages/core/src/domain/flow-edge-path.ts:8`. Side-aware schemas reuse FlowHandleSchema's side field and optionalKey at `packages/core/src/domain/flow-edge-path.ts:17`. Private mutable result Schema authority is at `packages/core/src/domain/flow-edge-path.ts:44`. No call invokes a decoder. Readonly arguments, strict root optionality and mutable tuple inference remain static contracts; raw arithmetic accepts numeric NaN and infinities.

Straight calls the local center calculation and writes its path at `packages/core/src/domain/flow-edge-path.ts:141`. Bezier calculates directional curvature controls, cubic labels and source-label absolute offsets at `packages/core/src/domain/flow-edge-path.ts:163`. Simple Bezier uses axis midpoint controls at `packages/core/src/domain/flow-edge-path.ts:210`. Smooth routing at `packages/core/src/domain/flow-edge-path.ts:662` chooses opposite, same or orthogonal points, adjusts short same-side gaps, rounds bends and returns labels plus endpoint half-distance offsets. Explicit centers affect opposite routes; same and orthogonal routes choose the longest segment instead. Options are not clamped. The getEdgeCenter companion reuses straight input authority and a private mutable four-number schema at `packages/core/src/domain/flow-change-compatibility.ts:469` and `packages/core/src/domain/flow-change-compatibility.ts:473`.

The helpers default source bottom/target top. Bezier curvature defaults to .25. Smooth border radius, offset and step position default to 5, 20 and .5. JavaScript own-undefined triggers the existing defaults. Root exactOptionalPropertyTypes rejects typed own-undefined optional assignments; installed consumer compiler configurations retain their existing permissive optional mode.

There is no measurement lookup, accepted state mutation, scheduler, DOM effect or rendered element in this public route. Native graph rendering still uses its separate string geometry and measured attachments. Pure calls own no Effect resource or lifecycle span; no telemetry delivery claim follows.

## Independent upstream reference path

The capture runner validates clean exact HEAD and React 12.11.6 before frozen pnpm 10.33.4 installation/build. It executes the built upstream public package twice in fresh Bun processes through `research/harnesses/path-helper/main.ts`. The harness validates the unknown module's five callable exports and applies capture-only descriptors. It imports no Flow implementation and copies no geometry formulas. Before/after tracked-file hashes are equal. The fixture is new evidence; immutable imported artifacts and earlier renderer fixtures stay unchanged.

Pinned straight, Bezier, simple Bezier and smooth entry points are `packages/system/src/utils/edges/straight-edge.ts:43`, `packages/system/src/utils/edges/bezier-edge.ts:121`, `packages/react/src/components/Edges/SimpleBezierEdge.tsx:47` and `packages/system/src/utils/edges/smoothstep-edge.ts:266`. The center is `packages/system/src/utils/edges/general.ts:6`. Helper alias selection comes from `packages/system/src/types/edges.ts:77` and `packages/react/src/components/ConnectionLine/index.tsx:99`. The step alias uses smooth radius zero; no getStepPath identity is invented.

The 628 deterministic descriptors cover coordinate perturbations, forward/reverse/coincident/axis-aligned layouts, all 16 side pairs, omission/own-undefined, backwards and positive curvature, smooth branch/options, numeric extremes, malformed diagnostics and helper aliases. Results retain full tuples using scalar tags for finite values, NaN, infinities, negative zero, undefined, null and strings. Exceptions retain stable categories rather than stack/message text. Both fresh capture records agree exactly. Numeric cases total 504; outside-type observations total 124.

## BUG-088-01 reproduction and repair boundary

Before any production or type edit, all 24 required same-side observations were compared with unmodified accepted085 Flow. Exactly four path-string differences were observed: left target-axis NaN, right source-axis NaN, top target-axis NaN and bottom source-axis NaN. Other tuple positions retained their actual tagged values. All12 finite below/equal/above gap controls passed; the remaining endpoint-NaN and four NaN-offset cases matched. The deliberate regression run failed 8 assertions because dedicated and generic tables each covered the four mismatches. Its 41 passes and 482 name-filtered cases are historical evidence, not final acceptance.

Root personally reviewed the complete tuples, source hashes and failing log in `plans/path-helper-parity-primary-prefix-review.md`. Only then was the early return changed to `!(difference <= offset)` at `packages/core/src/domain/flow-edge-path.ts:415`, matching pinned `packages/system/src/utils/edges/smoothstep-edge.ts:153`. Math.min, adjustment direction, points, labels, offsets and every other formula stayed unchanged. The original failing log and original unformatted fixture remain in the sibling evidence directory. All 504 numeric comparisons now pass.

## Test and installed package paths

Core units at `packages/core/src/domain/flow-edge-path.test.ts:10` retain hand-calculated examples and add 32 named original-member contracts with particular captured inputs/full tuples, output freshness, mutation independence and strict optional compiler negatives. Center ownership is independently exercised at `packages/core/src/domain/flow-change-compatibility.test.ts:330`.

Conformance loads/decodes the genuine fixture and imports actual core exports at `packages/conformance/src/path-helper-reference.test.ts:1`. Dedicated BUG-088-01 cases begin at `packages/conformance/src/path-helper-reference.test.ts:36`; individual original-member cases begin at `packages/conformance/src/path-helper-reference.test.ts:110`. Every numeric path character and scalar tag is compared. Outside-type observations remain a diagnostic boundary, including two invalid-side differences; they do not force new types, a guard or another formula correction.

All three installed consumers import actual archived @flow/core. Their numeric descriptor tables call the five public helpers, report tagged actual tuples and check repeated-call freshness and mutation independence. The packed checker compares each context's 504 actual records with the genuine fixture through `scripts/check-packed-consumer.ts`. Declaration probes retain all four existing parameter names, positive side/raw-number/own-undefined assignments, readonly input checks, mutable five/four tuples and meaningful compiler negatives. Installed package execution is separate from source-unit evidence and mounted renderer parity.

Only 32 existing singleton owner 072 groups use the fixed core target exception; default host target validation remains for every other group. Exact page/member/group ID/helper/operation/unit/capture predicates are required. All 2,692 original member identities and 8,076 cells stay present. Primary reviewed the expanded particular member map, all three passed installed contexts and exact proposals in `plans/path-helper-parity-primary-proof-checkpoint.md:1`, then approved only these 96 cell transitions. They are implemented with evidence, with zero owned unresolved cells and 7,791 other open cells. Whole 072 and every other dependency remain open.

## Conformity and deviations

Conforming for the captured numeric boundary: complete tuples match the independently built pinned exports after the reviewed same-side predicate correction. Schema-derived declarations preserve raw math, readonly arguments and mutable results. Exact member accounting and immutable reference/input evidence are retained.

Intentionally different: pure helpers are public through framework-independent @flow/core; no per-call unknown/finite decoding or public failure API is introduced. The two outside-type invalid-side outcomes remain diagnostics and preserve existing behavior. Installed tests cover pure exports, not measured attachments or mounted native string geometry.

The saved final focused gate passed 1,554 tests across 51 files and all three installed consumers, with 504 exact tuples per context; no mounted browser suites were selected. Unverified: final frozen source acceptance and primary/independent review remain pending in this candidate. No full 072, generic-data, native renderer, device, CI, performance or collector acceptance follows. The primary-owned index and parent statuses are unchanged.
