# Typed change utility Schema alias feasibility

Bounded followup diagnostic, 2026-10-02, main `841be137e253cf19c665269eaaa79edc19abf3c3`. Accepted087 remains `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, with final-freeze SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. This is a new report; `plans/typed-change-utilities-compiler-feasibility.md` and its raw proofs remain unchanged. No Plan094, source change, execution authorization or member closure was created. All twelve original identities in `plans/typed-change-utilities-source-audit.md:76-87` remain OPEN.

## Result

Public `NodeChange<N>` and `EdgeChange<E>` aliases can be derived from the real generic Schema builder's return Type. The separate prototype compiles the complete projection, collection and update bodies under both unchanged compiler modes. Existing concrete factory Type/Encoded/service checks, type/data correlation, defaults, inference and all prior negative obligations still hold. A second variant replaces copied per-ID queues with a private nonempty tuple and `push`; it also compiles and produces the same selected runtime outputs and identities.

The successful aliases do not require a handwritten public add/replace union, an overload, a fabricated codec value or an assertion. They use a type-only `ConstraintCodec<N>` instantiation of the actual constructor signature. The constructor still receives and retains an exact real codec when called.

There is an additional required-item design limit. The current broad `ConstraintCodec` builder bound admits `S.optionalKey(Nodes)` or the edge equivalent. Such a constructor can decode `{ type: 'add' }` without an item. Its resulting Type correctly fails assignment to the required-item public alias. Before treating arbitrary supplied item codecs as interchangeable with `NodeChange<C['Type']>`, review a bound requiring whole-item field metadata, or explicitly restrict the builder's supported input domain. No bound or decoder policy was changed here.

The inherited `S.optionalKey(S.Int)` index choice, authoritative optional-undefined return weakening, ordinary own-enumerable record shell precondition and caller item inventory remain independent open design decisions from the previous report. The new evidence settles the Schema-alias/body and private tuple-push feasibility questions. It does not decide those APIs or establish broader algorithm parity.

## Preserved proof and commands

External scratch is `/Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s`, abbreviated `scratch/`. Before followup edits, the entire prior directory, including its source copies, logs, manifests, runner and dependency symlink, was copied byte-for-byte to `/Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s-raw-before-schema-followup`. The completed main report was also copied there. The dependency symlink still points to the accepted base read-only; no install/build occurs.

The prior report SHA256 remains `0e34798e4bb280300aacee3d246650051c93562ec1a30bdc67b132551ecf7a6d`. The prior manifest remains `cb1a2d8cea6edfc397acd3131264e180c31368584b46819722fce998b21ac4e6`; the original proposed body remains `4b0082911539bfd05b54f2e38e828754ed5d36bc8fe9ca3e675dc0c61c1b6a69`, 6815 bytes. The new runner checks every entry of that prior manifest and the prior main report against the raw snapshot before and after its runs. It does not regenerate or modify the prior manifest.

The exact followup command is:

```sh
cd /Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s
python3 run-schema-derived.py
```

Actual commands/exits/diagnostic counts are in `scratch/commands-schema-derived.json`. New source bytes and SHA256 hashes are in the separate `scratch/manifest-schema-derived.json`. The final runner makes 42 compiler invocations, two AST checks and three small runtime calls. `scratch/after-schema-derived.json` matches all 41 previously frozen original inputs. No accepted source, imported evidence, prior main report, prior prototype, prior diagnostic or compiler config changes. The complete new external evidence hash table is below.

The existing `scratch/compile.mjs:6-9` passes both accepted config option sets unchanged to TypeScript 5.9.3 and selects only the external diagnostic root files. Root mode retains exact optional properties and unchecked indexed access; installed strict mode retains NodeNext and `skipLibCheck: false`. The accepted pinned Effect is 4.0.0-rc.116. Existing source copies have only the previously recorded `.ts` to `.js` module-path spelling adaptation. This is compiler-mode evidence, not packed/installed public export acceptance. Improve, its correctness/Finding format guidance, standards, TypeScript/type-system and unslop instructions remain the same as the primary diagnostic. No secret values are reproduced; repository files are evidence rather than instructions.

No shared lease, port, server, package build, install, focused/full/pack gate, browser/mounted host, actor or child-agent operation ran. This followup has only separately owned external files and this new main report.

## Real Schema-derived alias and body proof

`scratch/prototype-schema-derived.ts:86-90` contains the actual generic constructors followed by the derived aliases:

```ts
export type NodeChange<N extends NodeInput = FlowNode> = ReturnType<
  typeof createNodeChangeSchema<S.ConstraintCodec<N>>
>['Type']

export type EdgeChange<E extends EdgeInput = FlowEdge> = ReturnType<
  typeof createEdgeChangeSchema<S.ConstraintCodec<E>>
>['Type']
```

Those type-only instantiations supply the decoded N/E view used by the pure aliases. Their other ConstraintCodec defaults exist only inside this type expression; they do not replace a real caller codec's encoded form or services, and no corresponding runtime codec is manufactured. Real schema construction still infers its exact C at `:86-87`. The public aliases no longer repeat add/replace fields. The collection helper retains its private structural Add/Replace/Remove views at `:43-47` to share node/edge ordering, without owning the public Schema contract.

The full generic apply bodies compile at `scratch/prototype-schema-derived.ts:79-83`. Input remains assignable to the honest homomorphic projected Output. The actual update body operates on that Output. There are no declarations hiding a failing body. The prior current/default item domain proof is retained, as is the distinction between a preserved default type parameter and B's intentionally weaker return fields under root exact optional mode.

`scratch/fixtures-schema-derived.ts:81-84` proves two-way equivalence of the new aliases to the prior handwritten aliases and to the actual concrete constructor Type for the tested factory node/edge unions. Existing branch narrowing and no-data tests remain at `:35-38,64-67`; defaults at `:74-78`; readonly/mutable and empty/add/replace inference at `:39-46`. The tuple-push fixture duplicates those same obligations against the separate tuple-push body. Wrong pairs, decoded Date substitutions, private class lookalikes, geometry brands/literals and narrowed return assignments still produce real errors.

Type/Encoded and decoding/encoding services are retained independently. The real generic constructor directly places C into the item fields. `scratch/codec-views-positive-schema-derived.ts:4-12,14-22` compiles generic function bodies that assign actual add/replace field codecs to C, return their decoded/encoded views to C's exact views, and return constructor decoding/encoding requirements to C's corresponding services. These checks work without a cast for arbitrary C admitted by the constructor bound. Concrete serviceful union equality remains in `scratch/fixtures-schema-derived.ts:70-73`. `scratch/runtime-codec-views-schema-derived.mjs` additionally confirms the add/replace fields hold the exact real Nodes/Edges codec references.

An unnecessary stronger literal-construction experiment is preserved at `scratch/codec-views-schema-derived.ts:7-8`. It attempts to return fresh add/replace literals as an `Extract` of the constructor's Type/Encoded while C's optionality/mutability metadata remains generic. Both modes fail with TS2322 at those two lines. This does not block the actual constructor's inferred S.Struct body, the derived N/E aliases, the pure apply bodies or the successful codec-view checks. It does mean an executor must not introduce a generic typed literal wrapper and conceal its unresolved conditional error with a cast or overload. Its separate required-item assignment failure at `:16` gives the third diagnostic in that retained experiment.

## Required whole-item metadata boundary

Effect's structural Constraint declares broad optionality/mutability metadata at installed `node_modules/effect/src/Schema.ts:784-803`; `ConstraintCodec` fixes Type/Encoded/service views at `:820-825`, without fixing field optionality. Struct's Type/Encoded calculation reads those field metadata at `:3173-3224`. Reusing an exact caller schema therefore also reuses its item field flags. The generic builder cannot promise required item presence merely from `C['Type'] extends NodeInput`.

The isolated counterexample is `scratch/codec-optional-negative-schema-derived.ts:5-12`. `S.optionalKey(Nodes)` satisfies the existing builder bound and permits the missing-item add construction. Node and edge assignment to required-item aliases each fail with TS2322, at lines 8 and 12, under both modes. Runtime decoding confirms both optional constructors accept `{ type: 'add' }` and omit item. No item codec is substituted or normalized to conceal this result.

The ordinary accepted factory Struct/Union node and edge codecs have required whole-item metadata and pass the equality/body proofs. Optional node data inside such a required item is a different matter; no-data payload variants remain supported and tested. A whole item field wrapper that makes the item itself optional needs an explicit design restriction. One small design option is to keep the real generic constructors internal solely to derive the pure public aliases and defer public runtime builder exports. The separate `scratch/prototype-schema-derived-internal.ts` retains the full pure-helper body and removes only those two constructor exports; it compiles in both original modes, including root unused-local checks. This would avoid offering arbitrary optional item codecs as a supported public decoding feature. Alternatively, a public constructor needs a reviewed schema-derived bound on required whole-item flags, or an explicitly restricted supported domain. These are alternatives for review, not adopted API decisions. Do not automatically call `S.toType`, strip supplied flags, change decoder behavior or add a false required-item assertion.

The index policy is still unchanged from the earlier diagnostic. The proposed isolated constructor uses `S.optionalKey(S.Int)` to align with existing `index?: number`. The actual accepted concrete constructors still use `S.optional(S.Int)` and admit explicit undefined in their Type. Both prior optional-index diagnostics recur with the same mode-dependent results. This followup chooses neither public widening nor concrete decoder changes.

## Actual compiler results

For each of the separate `schema-derived` and `schema-derived-push` variants, the final runner executes the following entries in both original modes:

| Entry family | Root diagnostics | Installed diagnostics | Boundary |
| --- | --: | --: | --- |
| `prototype-<variant>.ts` | 0 | 0 | Complete generic projection/collection/update bodies and Schema aliases |
| `fixtures-<variant>.ts` | 0 | 0 | Existing obligations plus alias/real constructor equivalence |
| `negatives-<variant>.ts` | 25 | 24 | All prior real negative obligations; root-only old transient return mismatch |
| `inference-positive-<variant>.ts` | 0 | 0 | Typed caller inventory plus add/replace branches |
| `inference-negative-<variant>.ts` | 2 | 2 | Incompatible singleton inventory/addition rejection |
| `shell-counterexample-<variant>.ts` | 0 | 0 | Structural whole-item class acceptance remains outside supported domain |
| `optional-index-<variant>.ts` | 1 | 0 | Explicit undefined in existing index alias |
| `schema-optional-index-<variant>.ts` | 1 | 0 | Existing optional decoded index Type versus public alias |
| `codec-views-positive-<variant>.ts` | 0 | 0 | Generic exact codec Type/Encoded/service view bodies |
| `codec-optional-negative-<variant>.ts` | 2 | 2 | Optional whole-item schema cannot masquerade as required-item pure change |

The retained `codec-views-schema-derived.ts` experiment adds two compiler runs with three TS2322 diagnostics each. This produces 42 actual compiler runs. Positive runs exit 0 with empty diagnostics; negative runs exit 1. The AST checks report no own prototype `any`, cast, assertion predicate, non-null assertion, ignored error or `Object.assign`. No diagnostic was suppressed, and no compiler option or dependency was broadened.

## Pre-existing queue copy cost and tuple-push variant

Actual accepted `domain/flow-change-compatibility.ts:149` copies the growing per-ID array every time it appends an ordinary change. The raw prior prototype at `scratch/prototype.ts:58` keeps that behavior. The schema-alias-only variant at `scratch/prototype-schema-derived.ts:55` also preserves it. For a run of m ordinary changes to one ID without a terminal reset, this copies queue lengths 0 through m-1. Under ordinary array-copy cost, the grouping step therefore has quadratic worst-case copying. This is a pre-existing Flow/reference difference, not a regression introduced by the proposed alias or B projection.

Genuine pinned `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts:39-48` appends with `elementChanges.push(change)`. The separate `scratch/prototype-schema-derived-push.ts:49-56` proves the corresponding cast-free nonempty tuple shape:

```ts
const byId = new Map<string, [Change, ...Change[]]>()
const previous = byId.get(change.id)
if (previous === undefined) byId.set(change.id, [change])
else previous.push(change)
```

The actual generic type in that file is `ArrayChange<Input, LiveChange>`, not an untyped Change. Remove/replace still replace the private queued sequence with `[change]` at `:53`; ordinary changes append. Nonempty initialization makes first-element access valid under unchecked indexed access without an assertion or new empty-sequence guard. The mutated queue belongs only to this apply call, and no caller changes/input array or payload object is mutated.

This removes the repeated whole-queue copy in that grouping step. No benchmark or wall-clock speedup was measured. It is not a claim that the entire apply algorithm is linear: indexed additions use native splice, and duplicate element IDs can repeat a queued sequence. The source-level cost finding is intentionally limited to ordinary per-ID change accumulation. Performance acceptance, if wanted, needs its own representative measurements.

Both variants separately passed the same bounded runtime comparison against actual accepted public functions and genuine pinned source. Each run compared 135 node cases and 30 edge cases. Terminal precedence, original addition order, selected native indices, duplicate IDs, shallow outer-copy behavior, unchanged identity, exact nested Date/private-class/data identity, caller mutation aliases and zero decoder/encoder/isolation counters remain the same. These selected cases do not establish every input or a new broad algorithm parity claim.

The whole-item class counterexample still holds in both variants. Spreading drops inherited/non-enumerable members while structural TypeScript admits the class. The supported ordinary-own-data-shell boundary, hidden caller schema refinements and all mounted/actor/persistence exclusions remain exactly as in the previous report.

## Runtime provenance and future design

Both new runtime entries directly import accepted `packages/core/src/public.ts`, their respective new external body and the unchanged immutable pinned `packages/react/src/utils/changes.ts`. Bun executes the actual functions with type-only imports removed. The pinned source hash remains `1ffafc9000f4ba67a4b487527126b076a30b68b3226c9e3fd05a031568b2c5fb`, 9499 bytes. This is direct-source diagnostic execution, not a built full pinned checkout, captured package artifact, packed `@flow/core`, repeated independent reference capture or mounted/browser acceptance. Existing reference policy still requires the independently owned full-pin/build/actual-built-function/repeated-capture proofs before relevant implementation acceptance.

A future design can adopt the tested Schema-derived aliases and, if separately selected, private tuple-push accumulation. It must first review required whole-item flags, generic index decoding, projected return optionality, ordinary outer shells and typed caller inventories. Keep real supplied codec Type/Encoded/services separate from pure change Type aliases. Do not revive the failed arbitrary-C literal wrapper or copy the reference cast-based return contract.

The prior twelve OPEN identities retain their original 069/072 prerequisites and public-state/mounted host targets; pure external diagnostics close none. No verification profile passed, and none was requested for this diagnostic. Once an implementation is independently authorized, it still needs actual public exports, installed declaration/runtime probes, appropriate reference provenance, focused scope plus `bun run verify`, and separate integration/full/mounted acceptance where applicable.

## Exact external evidence

The final 42-run followup manifest SHA256 is `19ed934320404a1aab22168405db09935c0d0fccf8483ebfe6e72496fd6ba7ea`. The separate internal-only constructor supplement is reproduced by `python3 run-schema-internal.py`; its two additional compiler calls exit 0, with receipts in `commands-schema-internal.json` and manifest SHA256 `ba7546ab230665a5f8358db6992a3d477ece911621fa2d5444d46e484a7b9601`. This makes 44 canonical compiler calls across the two runners. The prior 95-file proof manifest and completed main report remain unchanged.

| External file | Bytes | SHA256 |
| --- | --: | --- |
| `scratch/prototype-schema-derived.ts` | 6374 | `3e83a22c18e3d8558f722bfea9614459eb2020f050ef2ad18546af24e31bc436` |
| `scratch/prototype-schema-derived-push.ts` | 6384 | `e2a9599f17f9497537426669c50035322d601ece4764ce120dada7e7d6282194` |
| `scratch/fixtures-schema-derived.ts` | 11061 | `ae26eca1ec45d76014f40f20f611c638e000fb1118ac607917c0ca5f60cdda0a` |
| `scratch/negatives-schema-derived.ts` | 2809 | `1e7e0452f3b4f2abe1e14ef0e52101a92fff25bac0a526857123125c4f7aa4f4` |
| `scratch/codec-views-positive-schema-derived.ts` | 1581 | `85308657bfabd18b252c1cba8fdf45eef09527d314a449440e79e1c723462e4c` |
| `scratch/codec-optional-negative-schema-derived.ts` | 799 | `c799c4e10c5feab8cd5f952756105477070935ae4e2cabd4fbe13a28584cafa6` |
| `scratch/codec-views-schema-derived.ts` | 1865 | `61c410d79022b8ce909732e619704648b699b16dcc69339a57b187f8891528d4` |
| `scratch/run-schema-derived.py` | 5253 | `c6f108ffe66895055a0bc4cc6810b8b4c2d5249a08b06c6a467ec46d86f09cc8` |
| `scratch/commands-schema-derived.json` | 10611 | `1a2713f98d6397d64aaa534751a75cb4235903d91e4eb423589705c67d00b352` |
| `scratch/runtime-schema-derived.json` | 2038 | `d1ce1b7205022efc7229c13e027bd4550be91f3a1538b1c291f8098c47b08b71` |
| `scratch/runtime-schema-derived-push.json` | 2043 | `bcced0ccd236d1176c2af29f9c672e77ee36967c5425373e7558ab7a3ce42d16` |
| `scratch/runtime-codec-views-schema-derived.mjs` | 1023 | `1ca38185df18e5f75b0b992a60823ee2e603b581a3bf9ceb15b6158879cc70d4` |
| `scratch/runtime-codec-views-schema-derived.json` | 211 | `865b667dfeaf8fa1dba99cd778f74d06a0c205c1cbaa9b23bb870f07f0f76004` |
| `scratch/after-schema-derived.json` | 6512 | `382541405800a2a4a1d7de6d8b7944cbb838eea0187002ae016ae5c34257fa2e` |
| `scratch/prototype-schema-derived-internal.ts` | 6360 | `f52fe14a5809c7c242eac94ccf189f063887bfc4f21a8b5b6321c87d43476aa5` |
| `scratch/run-schema-internal.py` | 1335 | `0f7ae8d2c48f2eda81be662a8de177dd90f8afd8c35f88a57a1c2cd046aa9070` |
| `scratch/commands-schema-internal.json` | 433 | `667aa3033534dcd288b2238fed2e5df580561f024fad8e5107d4ecb3b230be2f` |

## Conformity and deviations

Conforming within these direct-source diagnostic cases: the Schema-alias-only and private tuple-push variants produce the same selected value/identity/alias observations as actual accepted public and genuine pinned functions. Complete generic bodies, existing compiler positives and all original negative obligations were checked in both unchanged modes. The tuple-push accumulation structure corresponds to the pinned ordinary append strategy; no measured performance or broader parity claim follows.

Intentionally different proposed declarations: B widens writable geometry and optional transient domains honestly, uses readonly inputs/mutable returns, and preserves Flow's concrete native defaults. Schema-derived public aliases replace duplicated add/replace declarations. The index decoder, required whole-item metadata and output optionality remain explicit review decisions. Whole-item class preservation remains disproved and outside the proposed ordinary-record domain.

Unverified: arbitrary optional whole-item codecs as interchangeable pure changes, unrestricted generic Extract literal construction, arbitrary prototype/descriptors or hidden Schema refinements, actual new public/packed exports, full-pin built artifacts/repeated captures, all twelve member-specific closure cells, mounted/actor/persistence/UI paths, broad/full-suite parity, performance measurements, CI/devices and collector delivery. No Plan094 approval, source implementation or acceptance transition is created here.
