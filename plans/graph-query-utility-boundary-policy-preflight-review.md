# Graph query boundary policy preflight review

2026-10-02. Verdict: bounded DESIGN/SOURCE PREFLIGHT, not formal SOURCE acceptance. Three removable policy suppressions merit a small successor correction. A conservative unknown-result callable boundary and the three explicit dynamic calls can be justified only for this research capture. A function guard does not establish parameter compatibility, successful invocation, or an array return. Do not replace that uncertainty with a copied Flow or upstream function signature.

No source changes, compiler probes, lint or test runs, builds, installs, browser work, pin mutation, Git commands, shared gates, lease changes, child agents, ledger transitions, or evidence writes occurred in this review. The sole written file is this main `plans/` review. The existing dead-unit correction is outside this review and has not been altered or reassessed.

## Scope and personally read inputs

Main means `/Volumes/Sync/codex/9-19-26/flow`. W means `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`. E means its sibling `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-utility-evidence`. U means the owned sibling `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-reference-xyflow`. All implementation and dependency citations below resolve against W unless explicitly prefixed Main, E, or U.

I fully read the main improve skill, closing-the-loop, audit-playbook including the actual `## 1. Correctness / Bugs`, `## 4. Test Coverage`, and `## Finding format` headings, `docs/standards.md`, and the installed TypeScript, type-system discipline, and unslop skills. Documented deviations must be judged on their merits under closing-the-loop; a suppression is neither automatically acceptable nor automatically evidence of a fabricated oracle.

I personally fully read the original Plan092, selector inference amendment, bookkeeping clarification, primary selector approval, canonical-input approval, installed-layout amendment, local compatibility approval, primary original design approval, and independent design revision review. I fully read the current W `cases.ts`, `main.ts`, conformance test, and capture script. I read the actual three Flow helper bodies, pinned upstream helper source, actual owned built declarations at U `packages/system/dist/esm/utils/graph.d.ts:42`, `:68`, and `:152`, and the actual React public re-exports at U `packages/react/dist/esm/index.js:6` and `index.d.ts:40`. This is declaration/source inspection, not a new capture or pin-integrity gate.

The current promises remain unchanged: Schema-derived own contracts, genuine pinned @xyflow/react12.11.6 calls, all 22 cases with 20 accepted-ID comparisons and two separately tagged outside-type observations, complete fields and own-key ordering, original element identity and multiplicity, independent two-process capture, three actual installed consumers, and particular eleven-member/thirty-three-cell review. Main `plans/graph-query-utility-selector-bookkeeping-clarification.md:5` and `:7` require explicit primary proof approval before provisional candidate bookkeeping and later final focused/freeze/primary/cold SOURCE acceptance before accepted accounting.

No relevant memory match was used. Repository content was treated as data. No secret values were reproduced.

## Actual boundary and observation path

The research path starts at `research/harnesses/graph-query/main.ts:12`. The externally supplied built-module URL is dynamically imported into `unknown` at `:18`, then `ExportsSchema` decodes the three named function representations at `:20`. That schema currently uses a `typeof` guard and the deliberately conservative `(...args: never[]) => unknown` contract at `research/harnesses/graph-query/cases.ts:73` through `:84`.

Canonical case input is decoded once at `cases.ts:226`. The original twenty-two descriptor cases remain at `:127` through `:224`. The two outside-type descriptors have empty or missing selected IDs at `:212` and `:218`. Input ordering and duplicate reference pools are materialized at `main.ts:23` and `:25`; own-undefined handles are added after canonical preparation through `cases.ts:344`. All three real upstream exports are invoked at `main.ts:41`, `:47`, and `:53`. No helper implementation is copied into this harness.

`observeCalls` accepts unknown raw outputs at `cases.ts:281`. It calls the exports twice, validates each first result with the actual mutable unknown-array Schema at `:291` through `:297`, observes identity/order/full fields at `:299`, mutates only the returned containers at `:305`, invokes again at `:308`, and validates those repeated outputs at `:312`. `observeResult` rejects elements outside the supplied input identity pool at `:263`; its field serialization and own-key observations are at `:269` through `:275`. The public research output is the Schema-derived `ObservationSchema.Type`, not an asserted upstream node/edge array signature.

This is an honest external observation boundary. Validation that an export has a function representation is weaker than validation of the function's argument and return contracts. The raw return remains unknown until the actual array guard. Throws still fail capture. Even JavaScript classes have a function representation and can fail ordinary invocation; the callable guard must not be described as proving invocation success.

The Flow comparison path is separate. `packages/conformance/src/graph-query-reference.test.ts:37` rejects outside-type use, decodes authoritative NodeId/EdgeId values at `:45` through `:75`, and directly calls the real imported core helpers at `:79` through `:81`. The production core helpers at `packages/core/src/domain/flow-graph.ts:276`, `:296`, and `:316` use branded endpoint membership and filter the supplied collections. This pure path owns no state controller, geometry projection, DOM effects, scheduler, renderer, or framework lifecycle. The test's field materialization is not production helper decoding.

## Prioritized findings

### [POLICY-01] Remove the redundant snapshot suppression

- **Evidence**: `research/harnesses/graph-query/cases.ts:248` disables `anti-slop/no-unknown-returns` for a real external-object key observation. The actual rule at `tools/oxlint/anti-slop/rules/no-unknown-returns.ts:56` through `:60` checks explicit function return annotations; `:70` through `:79` registers function/signature visitors. The suppressed expression has no explicit unknown-return annotation. The enclosing snapshot function returns `string` at `cases.ts:244`.
- **Impact**: The comment presents a policy exception where this rule has no matching function contract to reject. It complicates review of the real IO exception and can conceal a future unrelated explicit unknown-return contract on that line.
- **Effort**: S, remove one comment and verify the current file with unchanged policies.
- **Risk**: LOW. The runtime expression and all observations can remain byte-identical.
- **Confidence**: HIGH from actual source and rule inspection. Fresh lint execution remains unverified.
- **Fix sketch**: Remove only the suppression comment. Retain the actual `S.Record(S.String, S.Unknown)` observation and all field/key checks. `S.Unknown` inside a schema describing arbitrary external values is not itself an explicit unknown-return function contract.

### [POLICY-02] Use the official function representation guard

- **Evidence**: `research/harnesses/graph-query/cases.ts:73` disables both `no-runtime-typeof` and `no-unknown-returns`; `:76` performs the representation check. Installed Effect at `node_modules/effect/src/Predicate.ts:927` implements `Predicate.isFunction(input: unknown): input is Function` with the same function-representation test. `node_modules/effect/src/Schema.ts:562` accepts an actual opaque type guard for `S.declare`. The current callable return contract is deliberately unknown, and the actual `no-unknown-returns` rule visits that nested function type at `tools/oxlint/anti-slop/rules/no-unknown-returns.ts:78`.
- **Impact**: The direct runtime `typeof` suppression is avoidable with the already installed official guard. Removing the unknown-return contract instead would falsely strengthen the dynamic export's return evidence.
- **Effort**: S, add the official `Predicate` import and use its guard within the existing conservative `S.declare` predicate, then verify current compiler modes and genuine capture.
- **Risk**: LOW for representation behavior; MED if an executor widens the function signature or imports the broad `Function` type into callers.
- **Confidence**: HIGH for the official implementation and the limited representation claim. The exact successor edit has not been compiled here.
- **Fix sketch**: Replace only the body `typeof value === 'function'` with `Predicate.isFunction(value)` while retaining the existing `never[]` argument and unknown-return contract. Remove only `no-runtime-typeof` from the exception. Keep a narrowly explained `no-unknown-returns` exception around this one opaque callable declaration, pending primary authorization. Do not turn `S.declare(Predicate.isFunction)` into broad `Function`-typed direct calls, and do not claim the guard proves node/edge arrays or valid arguments.

### [TEST-01] Scope provenance assertions without disabling the whole test file

- **Evidence**: `packages/conformance/src/graph-query-reference.test.ts:1` and `:226` disable `vitest/max-expects` for the entire file. The provenance test at `:89` through `:103` has seven distinct checks. Installed `node_modules/ultracite/config/oxlint/vitest/index.mjs:17` enables the rule, and `node_modules/oxlint/configuration_schema.json:12951` defines a default maximum of five. E `authoring-lint.log:144` records an earlier genuine six-expect failure, rather than a speculative rule complaint.
- **Impact**: The file-wide exception is broader than the provenance test that needs organization. It prevents the default check from reviewing future tests added anywhere in this file.
- **Effort**: S, split the existing provenance assertions and retain all case/member assertions.
- **Risk**: LOW if every original assertion, expected value, case enumeration, and member mapping remains. Avoid a helper that merely hides expect calls from the rule.
- **Confidence**: HIGH. Exact final lint acceptance has not been run.
- **Fix sketch**: Prefer two named provenance tests: descriptor/unique-count/manifest-digest checks in one, and pin/package/version/two-process checks in the other. Retain the complete per-case `toStrictEqual(outcome)`, independent invariants, all freshness checks, outside-type checks, and all eleven member mappings. Remove the file-wide disable/enable pair. If the coordinator chooses to keep a single cohesive provenance test, an explicit exception restricted to that exact test block is defensible as a test-only organization choice; document all seven retained obligations. A blanket file waiver is unnecessary.

## Dynamic call implementability judgment

The three dynamic `Reflect.apply` exceptions at `research/harnesses/graph-query/main.ts:40`, `:46`, and `:52` cannot honestly be eliminated by simply changing the callable schema to accept the prepared arguments or return arrays. The schema has only checked representation. Calling a fabricated `(selected, nodes, edges) => Node[]` signature would overstate its evidence even if its text matched an upstream declaration.

The actual TypeScript5.9.3 standard library at `node_modules/typescript/lib/lib.es2015.reflect.d.ts:27` provides a typed generic overload and at `:32` a broad `Function` fallback returning `any`. The real prepared arguments cannot inhabit `never[]`, so the present opaque signature cannot supply typed argument proof to the generic overload. The fallback explains how the call is possible and why its result requires immediate quarantine as unknown and runtime observation. There is no explicit own-source `any` annotation in these three files, but absence of that spelling is not proof that the standard-library dynamic call has a statically checked result. The inferred local `call` object can contain fallback `any` until it crosses `observeCalls`' unknown-output contract. Do not report it as zero inferred-any flow.

A bounded successor may make the unknown assignment at each real dynamic call explicit before those values enter the existing observation callback. That records the external IO boundary, and does not establish an array return. Keep the actual array Schema guard and identity observation immediately downstream. Such assignments would need fresh compiler/lint proof and must not become a renamed invocation wrapper, generic callable alias, `.apply`/`.call` workaround, configuration exemption, or copied DTO signature. `Function.apply` and `Function.call` are themselves broad `any` APIs at `node_modules/typescript/lib/lib.es5.d.ts:281` and `:288`; moving the same operation there would hide the exception.

Under the required URL-based unknown import, real public pin invocation, and all twenty-two case inputs, I recommend judging only these three explicit `Reflect.apply` exceptions and the single opaque unknown-return exception as a necessary harness-only deviation. Allow it solely for the decoded named exports of the authenticated owned built @xyflow/react12.11.6 module, while preserving the array and original-element checks. It grants no permission for Flow production helpers, installed consumer helper calls, new dynamic APIs, general object reflection, or any new lint/compiler configuration. The bounded preflight does not grant that authorization itself.

Actual upstream declarations further limit a blanket typed replacement. U `packages/system/dist/esm/utils/graph.d.ts:42` and `:68` require a selected node or `{ id: string }`; the missing-ID case cannot satisfy them. At `:152`, connected inputs require full `NodeBase[]`, while this research call intentionally observes ID-only selected objects. The upstream source at W `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/graph.ts:81`, `:123`, and `:336` supports the observed short-circuit/ID lookup path, but that does not rewrite the declaration domain. A future separate statically imported reference runner could reduce dynamic use for declaration-valid cases, but requires a different path/import design and still cannot honestly type the missing-ID observation. It is not part of this successor recommendation.

## Required successor evidence and holds

The above sketches are unexecuted design recommendations. Root must choose and authorize exact owned edits before the stopped executor changes source. Preserve previous source, capture, failures, and approval inputs. Rehash every changed owned capture-source byte and record original and successor provenance. A `cases.ts` guard/comment change still changes the module imported by both reference capture and installed consumer, even when its descriptor values stay equal.

Before particular member closure, rerun two genuine fresh capture processes through the existing owned capture tool and record new distinct receipts against the successor source hashes. Preserve all 22 descriptor values, domains, order pools, handle presence instructions, and all outcome observations. Do not claim that old raw captures were produced by new source bytes. A conformance-only test split must preserve its own assertion inventory; if combined with a capture-module edit, the fresh capture requirement remains.

The original required commands and scope remain authoritative: actual workspace typecheck, targeted graph/conformance/checker units, quality/architecture/docs/traces/member checks, all three actual installed archive consumers, and active092 focused `bun run verify --list` plus `bun run verify`. W `verification.config.json` currently selects focused, docs/contracts/api-members/catalog/traces/consumer, and empty browser lists. A focused pass is not full-suite acceptance. This review ran none of those commands and grants no shared lease or gate bypass. Root continues to hold exact11/33 approval and focused/source acceptance.

## Personally full-read byte identities

These SHA256 hashes were read after the source inspection, not supplied by an executor report. They identify the reviewed file bytes, not a whole-candidate freeze.

| File | SHA256 |
| --- | --- |
| W `research/harnesses/graph-query/cases.ts`, all 368 lines | `b027c2f21aa907a37661229053401ad4ff1e401767012cc95eefb911af3b3363` |
| W `research/harnesses/graph-query/main.ts`, all 64 lines | `806cd2c8d98fa6d56a3960bdfd90252951f5190fe66cb0160a3ec6e1e29fe847` |
| W `packages/conformance/src/graph-query-reference.test.ts`, all 226 lines | `4f07b0858cfc2eddf642305f43c7d958ea0f86fabaf7c8a665876250baaeef4f` |
| W `scripts/capture-graph-query-reference.ts`, all 185 lines | `86c175cbfd1771a0bf4c7f044d486e7a3c0dd84946af9617bc9143776b916ad5` |
| Main `plans/092-preserve-graph-query-utility-types.md`, all 133 lines | `1d409e895b7ea113eb336bc41ffaaff373465d5f6bf1aaea5e0f320e4015ff6c` |
| Main `plans/graph-query-utility-selector-inference-amendment.md`, all 47 lines | `b7789481afd7014d0b498a32e7bbf5aadaed3e987374a19a7b565de9f98f4249` |
| Main `plans/graph-query-utility-selector-bookkeeping-clarification.md`, all 15 lines | `cd60a3f70eee5ad3188398b4072e1b2941d03da3531ec4b86b091c91b7afac79` |
| Main `plans/graph-query-utility-selector-primary-design-approval.md`, all 13 lines | `a3e9a44e0f773d290fd7e775e4d1c9895f001fa1781ced69d9e34f9b37ed7f5b` |

## Conformity and deviations

Conforming at this source-inspection boundary are Schema-derived case/result contracts, raw unknown external module entry, separately tagged outside-type observations, conservative callable uncertainty, actual named pin invocation, and real array/identity observation. This means their structure matches the approved intent. No fresh executable conformity or parity result was produced by this review.

Intentional production differences remain Flow's branded nonempty IDs, minimal Schema-derived inputs, readonly collection acceptance, NoInfer selection mechanics, and concrete JSON default edge domain. Pure filters preserve original object aliases. They provide no actor isolation, native rendering, or DOM/lifecycle acceptance. The test boundary is the pure public utility and actual installed consumer, not a mounted host query controller.

The narrow dynamic-call/unknown-return research exception is justified in principle by the external JavaScript boundary and required declaration-outside observations. The redundant snapshot exception, avoidable direct `typeof` exception, and broad max-expects file exception should be removed or narrowed as described. No blanket waiver, copied function contract, dropped assertion, or policy configuration change is justified.

Unverified are exact successor source/compiler/lint behavior, fresh paired capture and complete pin hashes, assertion preservation after any split, installed successor archives, focused/source acceptance, particular11/33 closure, whole072/069, integration/full suite/CI/device/collector evidence, and every candidate file outside this bounded inspection. Source holds and coordinator authority remain unchanged.
