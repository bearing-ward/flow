# Typed change utility index signature feasibility

Bounded stopped design diagnostic, 2026-10-02. Main baseline remains `841be137e253cf19c665269eaaa79edc19abf3c3`. Accepted087 is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`; final-freeze SHA256 remains `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. This report is new. It neither revises the completed compiler/Schema reports nor authorizes Plan094, production changes, decoder/API policy or member closure.

## Result

Neither competing correction is ready for adoption over the currently admitted generic caller domain. A drops broad string/number/symbol signatures and compiles complete generic bodies, but leaves overlapping template-pattern signatures unsound. B can widen broad and ordinary template signatures while preserving named keys, typed payloads and generic bodies; however direct `Extract` matching misses opaque branded string keys that physically alias a written key. The conservative key-intersection B correction fails both complete generic apply bodies. That failed correction is retained exactly; work stopped rather than introducing casts, broadening options, narrowing caller domains or hiding the body behind declarations.

The original broad-string counterexample is a plain own record, so the earlier ordinary-shell precondition does not remove it. The smallest safe current conclusion is to withhold the generic output recommendation and review another Schema-derived output construction. An explicitly restricted finite-key domain could be a separate design, but it is not an established current caller restriction and was not adopted. Retaining immutable required geometry fields explicitly alongside the honest widened rest is an untested future lead, not a result of this diagnostic.

## Immutable evidence and reproduction

External owned scratch is `/Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s`, abbreviated `scratch/` below. Before this followup, the complete directory and both completed reports were copied to `/Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s-raw-before-index-followup`. The new runner checks all 202 prior snapshot files, including prior source copies, prototypes, diagnostics, manifests and reports, before and after execution. It checks all 41 original accepted inputs against `before.json` and verifies the freeze hash. All comparisons passed. Prior reports remain SHA256 `0e34798e4bb280300aacee3d246650051c93562ec1a30bdc67b132551ecf7a6d` and `48dbca04cbc2a321e18b3176c48697510b11922785a932ecdfb295234233bc21` respectively.

Exact canonical command:

```sh
cd /Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s
python3 run-index-signatures.py
```

`commands-index-signatures.json` records every argument vector, actual exit, diagnostic count and output filename. The run made 54 compiler invocations, four AST checks and eight runtime calls. Positive compiler runs exit 0; negative/failing runs exit 1. `manifest-index-signatures.json` records all 164 new evidence files, exact byte sizes and SHA256 hashes, including preliminary failures and raw competing variants. Its SHA256 is `27670372d80969bb3314ab931a87e596cc8c11d955a6881e7b8e5442fad4bd09`. It is separate from all prior manifests.

`compile.mjs:6-13` uses installed TypeScript 5.9.3 and passes the two accepted compiler option sets unchanged. Root mode retains exact optional properties, unchecked indexed access and unused checks. Installed strict mode retains NodeNext and `skipLibCheck: false`; it is a consumer compiler-mode proof, not an installed Flow artifact proof. Installed Effect remains 4.0.0-rc.116. The read-only dependency symlink and previously documented module-path-only `.ts` to `.js` source-copy adaptation remain unchanged.

Improve's correctness/type-escape and Finding format guidance, `docs/standards.md`, plan template and TypeScript/type-system instructions were readable and applied. Repository content is evidence rather than instructions; no secret values are reproduced. Explicit delegation authorized these external diagnostic files. No accepted/product source, imported artifact, dependency, compiler configuration, verification scope or prior report was edited. No install, build, server, port, shared lease, child agent, focused/full/pack gate, mounted host, actor or device operation ran.

## Actual counterexamples and competing variants

### [CORRECTNESS-INDEX-01] Stop advertising the original broad index range after writes

- **Evidence**: `scratch/index-counterexample.ts:5-9` admits geometry intersected with `Readonly<Record<string, string | false>>`; the previous Schema/private-push body advertises a dynamic string lookup as `string | false | undefined`. Both original modes compile without diagnostics. `runtime-index-counterexample-final.json` observes `true` at a dynamically constructed `selected` key on the copied plain own record.
- **Impact**: Code can make a false type-level assumption about a value returned by public-style synchronous apply operations, even within the ordinary own-record shell domain.
- **Effort**: M for a replacement output design and compiler/runtime probes; implementation remains separately authorized.
- **Risk**: HIGH; changes affect generic return compatibility, payload correlation and indexed consumers.
- **Confidence**: HIGH; actual two-mode compiler and runtime counterexample.
- **Fix sketch**: Widen every retained index domain that can physically contain a written property, or remove that domain through an explicitly reviewed contract. Named immutable keys and exact payload branches must remain precise.

A's `prototype-index-drop.ts:14-19` remaps keys to remove rewritten named fields and broad `string`, `number`, `symbol` signatures, then intersects the rest with Schema-derived NodeWrites/EdgeWrites. Complete projection, update and collection bodies compile. Broad dynamic lookups now produce TS7053 while named metadata, numeric literal 7, unique-symbol fields, private payloads and discriminants retain exact types. This is meaningful evidence for broad signatures only.

### [CORRECTNESS-INDEX-02] Include overlapping template patterns in the output decision

- **Evidence**: `scratch/index-pattern-counterexample-drop.ts:4-7` supplies ``Readonly<Record<`sel${string}`, false>>``, calls A with selected true and still compiles a `false | undefined` pattern lookup in both modes. `runtime-index-pattern-drop-final.json` observes true on the copied plain record.
- **Impact**: Removing only broad signatures leaves an admitted domain falsely narrow.
- **Effort**: M, combined with the return design above.
- **Risk**: HIGH; over-removal could discard unrelated pattern and named-key information.
- **Confidence**: HIGH.
- **Fix sketch**: Determine possible overlap with each authoritative written key rather than checking only whether the domain is all strings, numbers or symbols. Preserve non-overlapping domains.

The first B broad-guard source is preserved at `prototype-index-widen-broad-guards.ts`; it compiles full bodies but has the same template omission. The next B uses `W[Extract<keyof W, K>]` at `prototype-index-widen-direct-extract.ts:14-16`. This compiles full bodies and widens broad string lookups with the relevant authoritative writes. Numeric and symbol signatures receive no unrelated string-key writes. Exact unrelated named metadata and private payload fields retain their types.

`index-pattern-fixtures-direct.ts:11-26` checks an overlapping `sel${string}` edge pattern, a non-overlapping `custom-${string}` private-Counter node pattern, and a node union of `pos${string}`, `wid${string}`, `meas${string}` patterns. Multiple-domain lookup includes source values plus position, number and dimensions; it does not gratuitously include selected/dragging/resizing true values. Named data retains Date/Counter, and type remains literal dated. All positive bodies compile both modes. `index-pattern-negatives-direct.ts:6-9` gives four real diagnostics per mode: old overlap range, old multiple-write range, false non-overlap boolean range and Date-as-private-Counter. Runtime observations of all these domains match actual native/public and pinned source behavior.

### [CORRECTNESS-INDEX-03] Account for opaque branded keys without hiding generic body failures

- **Evidence**: `scratch/index-brand-counterexample-direct.ts:5-10` uses an actual Effect Schema String brand and a branded record key made from selected. Direct-Extract B compiles the lookup promise `string | false | undefined` under both modes. `runtime-index-brand-counterexample-final.json` observes true at that branded key.
- **Impact**: Type-level assignability of an unbranded literal to a key domain does not establish physical string-key disjointness. Direct Extract therefore still promises an unsound index range.
- **Effort**: M for a distinct generic construction; current correction is blocked.
- **Risk**: HIGH; conservative overlap inference can lose required geometry information.
- **Confidence**: HIGH for the counterexample and compiler blocker; future replacement remains unverified.
- **Fix sketch**: Review a conservative overlap construction together with explicit preservation of immutable required geometry fields. Do not adopt a type-only overlap formula until its full generic bodies and all existing boundaries compile.

The stopped `prototype-index-widen.ts:14-17` tries:

```ts
export type PossibleWriteKeys<W, K> = {
  [P in keyof W]: [P & K] extends [never] ? never : P
}[keyof W]
export type IndexWrites<W, K> = W[PossibleWriteKeys<W, K>]
```

Both original modes produce exactly two TS2344 errors, at `prototype-index-widen.ts:83` and `:86`:

```text
Type 'NodeResult<N>' does not satisfy the constraint '{ readonly id: string; }'.
  Types of property 'id' are incompatible.
    Type 'unknown' is not assignable to type 'string'.
Type 'EdgeResult<E>' does not satisfy the constraint '{ readonly id: string; }'.
  Types of property 'id' are incompatible.
    Type 'unknown' is not assignable to type 'string'.
```

These are the genuine generic collection-helper invocations, whose Output must satisfy the identified-item bound and whose Input must extend Output. The result did not pass the full-body prerequisite; concrete successful cases cannot promote it to a feasible generic API. No correction was tried after this failure. Primary independently reproduced identical full compiler results; its separate receipt is main `plans/typed-change-utilities-primary-index-intersection-blocker.json`, SHA256 `ec0d1c720838d04bb8fe56e55b08771e936502f862607dfc3a17a39194871ef8`.

## Compiler obligation matrix

A and direct-Extract B each repeat the complete old positive and negative inventory against their own NEW files. Constructors remain private and public pure aliases still derive from the real generic constructor ReturnType; no fake codec, handwritten public add/replace union, overload, any, cast, assertion predicate, ignored error, non-null assertion or unchecked Object.assign exists in any of the four proposed bodies. AST results are empty. Private nonempty tuple queues retain push accumulation.

| Entry family | Root | Installed | Interpretation |
| --- | --: | --: | --- |
| A full body; broad-guard B full body; direct-Extract B full body | 0 each | 0 each | Compiling, but counterexamples limit soundness |
| Conservative intersection B full body | 2 | 2 | Generic identified Output bound fails; stopped |
| Original broad, A template, direct-B branded counterexamples | 0 each | 0 each | Unsound static promises accepted |
| A/direct-B ordinary fixtures | 0 each | 0 each | Typed unions, Date/private payload, defaults, readonly inputs/mutable output, alias and codec views |
| A/direct-B original negatives | 25 each | 24 each | Wrong pairs/encoded substitutions/lookalikes/brands/narrow assignments; root-only old optional return incompatibility |
| A/direct-B inference positive / negative | 0 / 2 each | 0 / 2 each | Caller source inventory and add/replace distinction preserved |
| A/direct-B whole-shell class counterexample | 0 each | 0 each | Types still admit shells whose copied members disappear |
| A/direct-B explicit optional index / concrete Schema index | 1 each | 0 each | Existing optionality policy remains undecided |
| A/direct-B indexed positives | 0 each | 0 each | Named keys, numeric/symbol domains, exact branch payloads |
| A index negatives / direct-B index negatives | 8 / 6 | 8 / 6 | Missing or honestly widened lookups, wrong pairs, old narrow output rejected |
| Direct-B pattern positives / negatives | 0 / 4 | 0 / 4 | Ordinary overlap, disjoint patterns and multiple written domains |

`fixtures-index-drop.ts:87-94` and `fixtures-index-direct.ts:87-94` separately prove real private constructor Type/Encoded equality and exact decoding/encoding service views for tested serviceful codecs. Generic constructor-field preservation bodies remain unchanged in the frozen prior proof. These successful A/direct-B checks are not attributed to the failed conservative variant. Its full body already blocks adoption; downstream boundaries for a repaired conservative construction remain required, not silently passed.

`NodeWritesSchema` remains the actual seven field schema (position, selected, dragging, measured, width, height, resizing); `EdgeWritesSchema` retains selected only. Type-only `ConstraintCodec<N/E>` aliases preserve decoded inventory without manufacturing runtime codecs. Existing concrete change decoders retain `S.optional(S.Int)`; private prototype derivation still uses `S.optionalKey(S.Int)` to match absent-only public index. No decoder policy was chosen. Existing old default NodeUtilityItem identity is retained, while honest own-undefined transient output widening continues to reject assignment back to that old narrow default under root exact optional mode. No blanket N[] or N & Writes return was adopted.

## Runtime and source boundaries

The actual accepted public exports at `packages/core/src/public.ts:348-349` lead to `domain/flow-change-compatibility.ts:205,265`. Native select/geometry changes and the generic array helper preserve terminal precedence, original addition order and shallow copy semantics. Accepted source helper queue copying at `:149` is pre-existing O(m²) for repeated same-ID live changes. The unchanged pin uses push at `packages/react/src/utils/changes.ts:46`; these new bodies retain the previously tested private nonempty tuple push. No benchmark or new algorithm/performance parity claim follows.

`runtime-index-drop-final.json` and `runtime-index-direct-final.json` each compare 135 node and 30 edge cases. Actual values, unchanged identity, changed/add/replace outer copies, terminal ordering, selected native indices, nested Date/private-Counter/data identity and caller mutation aliases match actual accepted public and genuine pinned source functions. Decode/encode/isolation counters remain zero. Whole-item classes still lose methods/prototype/non-enumerable members when copied; no guard or prototype clone was introduced. This is a separate limitation from index soundness.

`runtime-index-domain-final-drop-final.json` and its direct counterpart check plain own records, runtime selected true and width 7, named metadata, nested Date/private payload identity, literal numeric keys, arbitrary enumerable symbols, timed edge data and add/replace copies. `runtime-index-pattern-domains-final.json` separately checks template/branded lookup values and disjoint private-class alias retention across all three real functions. All eight canonical runtime calls exit 0. A is runtime-equivalent on these cases while statically unsound for templates; direct B is runtime-equivalent while statically unsound for branded keys. Runtime equality cannot repair a false declaration.

Runtime provenance is direct unchanged accepted `public.ts` import and immutable genuine pin `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts`, plus the owned external prototype. Pin SHA256 remains `1ffafc9000f4ba67a4b487527126b076a30b68b3226c9e3fd05a031568b2c5fb`, 9499 bytes. Bun direct-source execution is distinct from an independently owned verified full-pin checkout/build, actual built-function artifact, packed public package or repeated independent reference capture. Those earlier utility acceptance obligations remain required. Whole-shell descriptors, hidden caller Schema refinements, actor isolation, checkpoint encoding, persistence, mounted/UI output and telemetry delivery remain outside this diagnostic.

## Exact new evidence

All paths below are relative to the absolute owned scratch directory named above. The separate manifest contains every source, fixture, preliminary/current diagnostic and runtime result; no earlier raw variant was deleted or overwritten by correction. The canonical runner protects the completed earlier phases rather than regenerating their manifests.

| External file | Bytes | SHA256 |
| --- | --: | --- |
| `prototype-index-drop.ts` | 6803 | `6d1d261fb27b637bbc2b438914d839b5cf70a5da596d9dc233ca0e741c82c047` |
| `prototype-index-widen-broad-guards.ts` | 6902 | `c576cb23f8172ba4eb53ef82859cf2896aa623060b82fecd57a3302527062bee` |
| `prototype-index-widen-direct-extract.ts` | 6774 | `b170cb216fa3235ec0ccd762648b6199494e48705b8ef1cd2525a89cac0d2071` |
| `prototype-index-widen.ts` | 6873 | `6ba6d54fcb4b7dcbb160849bd5eccb4a35d182b4b9e0b596270d0bbcce33cec3` |
| `index-counterexample.ts` | 775 | `28a58df9f8917711415ad338d3c8a96ae23928066a9bbf8135e00b431aa41f20` |
| `index-pattern-counterexample-drop.ts` | 704 | `3d60b6128aedd20706bdc8d642fd7b0ff207f7c287d8d485843c873dc3816038` |
| `index-brand-counterexample-direct.ts` | 863 | `cd7c6d5b84e4c277ed469b091264210da5dd3997c940bd91abe4d108f43c54fe` |
| `index-pattern-fixtures-direct.ts` | 2364 | `02564be17e09b2972c0be060447622ad824802847f102191cdef1abb77133a05` |
| `index-pattern-negatives-direct.ts` | 826 | `114254541fb0a6164936f29d854726fc826c79231d93aa7586cafa41762b7d1b` |
| `index-fixtures-drop.ts` | 3895 | `567a844f62071657ecaa710a4daccb2daad8926643d186c4df470f28e884c5ab` |
| `index-fixtures-index-direct.ts` | 4456 | `e9f9224cfcbd7129f18c418b62a66c4e4767b2104adcceeb52774c9a6985b9dc` |
| `run-index-signatures.py` | 4226 | `d2f99405013f3ff2407edafcbb5d3a39f89c49b99f471f9d15b5a2fa9b9927e6` |
| `commands-index-signatures.json` | 14704 | `bd0f59fba1978eeef4edbb3418f4e24df78d9a28df1b2194f0c82f960d0461c4` |
| `after-index-signatures.json` | 6512 | `382541405800a2a4a1d7de6d8b7944cbb838eea0187002ae016ae5c34257fa2e` |

## Original identities and next design boundary

All twelve exact identities from `plans/typed-change-utilities-source-audit.md:76-87` remain OPEN: `NodeChange#1.<union:5>.<type:NodeAddChange>.item.<type:NodeType>`, `NodeChange#1.<union:6>.<type:NodeReplaceChange>.item.<type:NodeType>`, `NodeChange#1.NodeType`, `EdgeChange#1.<union:3>.<type:EdgeAddChange>.item.<type:EdgeType>`, `EdgeChange#1.<union:4>.<type:EdgeReplaceChange>.item.<type:EdgeType>`, `EdgeChange#1.EdgeType`, plus `applyNodeChanges`, its `changes`, its `nodes`, `applyEdgeChanges`, its `changes`, its `edges`. Their owners remain 069/072 and existing prerequisites/public-state/mounted targets remain unchanged. No child plan or approval was created.

Next review must resolve index overlap soundness and full generic body feasibility together, then repeat the full original obligations, Type/Encoded/services, all index domains and executable counterexamples against any distinct replacement. Public runtime generic Schema constructors remain only a proposed private alternative; required whole-item metadata and optional-index policy are still open. Product exports, installed/packed declarations and runtime, reference provenance/repeated captures and relevant focused `bun run verify` acceptance remain future implementation requirements. No verification profile passed here.

## Conformity and deviations

Conforming within these bounded direct-source cases: supplied-array ordering, terminal precedence, native insertion behavior, outer-copy/unchanged identity, exact nested Date/private-class/data identity and caller aliases. Both compiling A/direct-B bodies pass original two-mode regression obligations. This is selected diagnostic behavior, not built-reference, broad algorithm, mounted-host or member-level acceptance.

Intentionally different proposed declarations: readonly inputs, mutable returns and schema-derived honest write widening; A removes broad index domains and direct B widens only matched domains. These are competing proposals, not approved APIs. None changes concrete decoder policy, whole-shell runtime behavior or caller ownership.

Disproved: universal soundness of A for admitted template-pattern keys, universal soundness of direct-Extract B for branded keys, and current conservative B generic body feasibility. Failed diagnostics and executable counterexamples remain immutable evidence. Unverified: any repaired conservative/stable-geometry construction, a supported restricted index domain, arbitrary caller refinements/descriptors, all actual new exports/packed consumers, full-pin built artifacts/repeated captures, broader parity, performance, CI/devices/collector delivery and all twelve closure cells. No Plan094 source approval, implementation or acceptance transition follows.
