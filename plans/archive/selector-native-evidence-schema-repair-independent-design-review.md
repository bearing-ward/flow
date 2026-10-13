# 095 independent descriptor-safe schema repair design review

2026-10-02. Verdict: **REVISE** the exact successor design. The descriptor boundary, callback contracts, native phase retention and evidence preservation requirements are suitable for this bounded repair. The proposed factory-derived recursive output type is not yet suitable for an implementation release. Its runtime import graph is acyclic, but its type-resolution graph has a circular dependency through the inferred class constructor. The documented STOP on compiler failure does not resolve that architectural concern.

This is a cold DESIGN review only. It consumes zero formal SOURCE rounds, closes zero member cells, grants no local implementation or shared execution release, and accepts no source or runtime behavior. Same095 stays STOPPED; 091 retains the exclusive shared verification lease.

## Exact input and reading boundary

I personally read all 330 lines of main `plans/archive/selector-native-evidence-schema-repair-design.md`, including every code block and the complete execution, quality, verification and conformity sections. Independently calculated SHA256: `53ac78f02defd85c127edca727206b5936bfed7052eac15fb9136aee06e4d8e6`.

Main is `/Volumes/Sync/codex/9-19-26/flow`. Candidate W is `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`. E is `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence`. Source and installed dependency citations below resolve in W; `plans/` citations resolve in main.

I fully read the eight controlling packet files listed at design lines 25-34 and independently matched each SHA256 to that table:

- `selector-proof-payload-and-promotion-proposal.md`, `5168c3461bfc7efe53180f1ff267df72a763a371cb6db390edeb7926b483ddc5`.
- `selector-proof-payload-and-promotion-revision.md`, `bb3b20222d3d70dde1d0a306737d543190a20e2d37e9110e8b1ce11abd7c2799`.
- `selector-proof-foldkit-handle-path-amendment.md`, `fc51f43eab545cab76c85d1c9abbfc03baf8c261c4fc3f2dea905fe4dfed28d6`.
- `selector-proof-recording-number-amendment.md`, `2037b92b055d7958e0f26f666ef05b9afc63c3b8822b9a39e4eb443b6da83c65`.
- `selector-proof-payload-and-promotion-primary-approval.md`, `19d2d5c97d13662094039209b4154db4d32b297c3e4b93d423c92e94105e31c6`.
- `selector-proof-recording-number-primary-approval.md`, `25ae00adf0da6782a62f56d8d904ed3ffe5d7849f7524247edb9bd91ca7ca3d7`.
- `selector-proof-foldkit-handle-path-independent-review.md`, `a21be91395329ba33fc7a721fad110e9d0e64020f3cf60752f69995bd58950d3`.
- `selector-proof-recording-number-independent-review.md`, `5078e2b1e41eb7fdcf779fb4b62fbec0e13bb7e4c455adf342ff6c363420f2ce`.

I read the actual `.agents/skills/improve/SKILL.md` and `references/closing-the-loop.md` in full, and the correctness, testing, architecture and Finding format sections of its audit playbook. I read `AGENTS.md`, `docs/standards.md`, and the installed TypeScript best-practices, type-system-discipline and unslop skill files. I inspected the complete current fixture schema and independent transport tests, actual callback declarations and affected Vue expressions, recording entry points, capture ownership/promotion source, local anti-slop rules, and the relevant installed RC116 and TypeScript declarations/checker source.

The actual E STOP SHA256 matches `6519afde3d2cc37b5c1a132fa01bc407a899e6336e3e9111f9e7e6e42b82a9e7`. Its identity records 1516 source files and the ten amendment paths. I independently rehashed all ten current amendment files against its recorded hashes; all matched. Both proposed helper files are absent. The quality log hash matches `01b235984499ac416184b7d08332f681046aeb14abcfe35fe6baaeccbd89fe85`. I read the actual native type log, which reports the two Vue diagnostics described by the design. I did not independently rehash the entire 1516-current/1516-copy/11086-E corpora. Main's complete integrity receipt remains a separate input, not a new result of this review.

No tests, builds, compilers, formatters, installs, browsers, servers, archives, pin operations or verification gates were executed. No source or immutable evidence was changed. This review file is the only write.

## Blocking finding

### [ARCHITECTURE-01] Remove or prove the circular factory-return inference before releasing this architecture

- **Evidence:** `plans/archive/selector-native-evidence-schema-repair-design.md:148` gives each factory a child capability typed as `S.Codec<NativeEvidenceValue>`, then defines class fields from that capability. At `:157-160`, `NativeEvidenceValue` derives its container branches with `InstanceType<ReturnType<typeof createNativeEvidenceArraySchema>>` and the equivalent object factory. At `:178`, the return is the actual local `S.Class<Self>` constructor with inferred fields. At `:184`, exact inference is explicitly uncompiled.
- **Impact:** Deriving the aggregate requires obtaining the factory's inferred constructor type and its instance signature. That constructor's base already depends on the aggregate through its fields. A compiler failure or inferred `any` here prevents the proposed schema from satisfying its central Schema-derived type requirement and blocks native typechecking before the rest of the twelve-file repair can be accepted.
- **Effort:** M for an honest recursive Schema construction and its bounded compiler/runtime proof. The mechanical corrections are secondary to this type definition.
- **Risk:** MED. A replacement must preserve all literal tags, class constructor contracts, lazy initialization, runtime import acyclicity and existing quality rules without a handwritten recursive DTO, cast, unknown alias or mutable holder.
- **Confidence:** HIGH that the proposed definitions contain this type dependency; MED that the exact implementation produces a circular-base/alias/return diagnostic. No compiler execution occurred, so no exact TypeScript error or guaranteed compile failure is claimed.
- **Fix sketch:** Revise the recursive section so the aggregate's definition can be obtained without resolving an inferred constructor base that needs that aggregate first. Supply the complete actual factory/type declarations and explain the type-resolution boundary, not only the ESM import boundary. If the proposed shape is retained, handle it as a separately bounded feasibility decision with exact declaration/compiler/quality/import/transport evidence after the applicable release; do not approve the wider source repair by treating a predictable structural STOP as its design solution.

The source-backed dependency is:

```text
NativeEvidenceValue
  -> InstanceType<ReturnType<typeof array factory>>
  -> returned local class constructor and its construct signature
  -> S.Class<LocalClass> with inferred Struct fields
  -> Array<suspend<Codec<NativeEvidenceValue>>>
  -> NativeEvidenceValue
```

The object factory closes the same dependency through its tuple entries. `ReturnType` and `InstanceType` are conditional types that infer a return/construct result, not named class declarations that independently terminate the aggregate definition. Their installed definitions are `node_modules/typescript/lib/lib.es5.d.ts:1650,1655`.

RC116 makes the dependency material. `node_modules/effect/src/Schema.ts:14123-14126` returns `Class<Self, Struct<Fields>, Brand>` from the inferred field map. The class's construct signature at `:13669-13672` returns `S['Type'] & Inherited`, where S is that Struct; it does not simply return the nominal Self. Struct exposes its field-derived Type and constructor input at `:3298-3304`. The suspended child exposes `S['Type']` at `:4899`, which is `NativeEvidenceValue` for the specified child capability. Supplying the local class as Self therefore does not visibly sever the constructor-result dependency.

The installed checker explicitly resolves base constructors and their structured members at `node_modules/typescript/lib/_tsc.js:57058-57079`, infers unannotated function returns from their bodies at `:59713-59718`, and emits circular return/base/alias diagnostics when those resolution stacks recur at `:59724-59739`, `:57077-57079`, and `:57313-57341`. These declarations justify treating the design as likely to fail, but inspecting the checker is not an execution of this exact snippet. A revised review must keep that evidence distinction.

The explicit annotation on `buildNativeEvidenceValueSchema` at design line 162 comes after the aggregate and names that aggregate. It constrains the builder result; it does not annotate or independently establish either factory constructor type. Moving declarations, retaining lazy `suspend`, or adding type-only imports leaves the type dependency described above.

## Supported design decisions and remaining boundaries

The runtime import arrangement at design lines 146-180 is sound by inspection. Fixture-schema imports factories; their aggregate imports are type-only. Installed Ultracite enables `import/no-cycle` at `node_modules/ultracite/config/oxlint/core/index.mjs:260`, and installed Oxlint defaults `ignoreTypes` to true at `node_modules/oxlint/configuration_schema.json:14001-14005`. This resolves the specified runtime import concern. It says nothing about TypeScript's need to resolve the referenced types.

Lazy runtime construction is supported separately. `S.suspend` wraps a thunk at `node_modules/effect/src/Schema.ts:4932-4933`; `SchemaAST.Suspend` caches its AST and compiles its parser only on input at `node_modules/effect/src/SchemaAST.ts:3898-3915`. The class marker accepts constructor identity or its stable identifier marker at `Schema.ts:13878-13880`, and immediate Struct sentinel collection does not recursively traverse array children at `SchemaAST.ts:3353-3365`. These facts support the intended deferred runtime graph. They do not prove the factory type declaration compiles, nor provide a native import/transport result.

The descriptor-safe source contract fixes a real current recording defect. Current `fixture-schema.ts:110-125` does not reject Date, Map, Set or ordinary class prototypes before recording their string keys, so an unsupported empty instance can look like a supported empty object. The proposed source filter explicitly rejects these categories, functions including null-prototype functions, exotic array prototypes, all own symbols/accessors and extra array keys. `S.ObjectKeyword` does include functions at `Schema.ts:3102-3110`, so the explicit official callable guard is necessary. Its base refinement preserves the input through `SchemaAST.ts:4689-4696`; deriving a source type from this checked Schema is a real boundary contract, even though `.check` does not give the TypeScript type extra refinement precision.

The design correctly forbids reading raw values through property lookup, spread, JSON, `Object.values` or raw record/array decoding. Full descriptor capture before child traversal, immediate decode of descriptor values, active source identities in an ancestor set and `finally` removal retain the intended distinction between back-edges and repeated aliases. Nonenumerable data keys, own undefined, holes, null, canonical index rules, ordering, collision keys and signed zero are covered by independent proposed controls. Ordinary caller getters must remain uncalled; arbitrary proxy metadata traps are explicitly outside the guarantee. The exact filter/encoder implementation and type narrowing remain unverified.

The callback contracts match actual source. Vanilla node observers deliver `readonly FlowNodeConnection[]` at `apps/vanilla/src/mount-flow.ts:927-938`; handle observers deliver `readonly FlowEdge[]` at `:944-952`. Foldkit delivers the same distinct contracts at `packages/foldkit/src/observers.ts:94-122`, selects full handle edges at `:442-448`, and invokes disconnected/connected callbacks with the selected values at `:344-368`. Vue node and handle callbacks both carry `readonly FlowNodeConnection[]` at `packages/vue/src/use-flow.ts:345-368`. Keeping these public types and decoding at actual recording boundaries is correct. The replacement for `values: unknown` at `apps/foldkit/e2e/test-harness.ts:370` must derive from those callbacks.

The Vue repairs are precisely scoped. The current literal target at `apps/vue/src/test-harness.ts:714` has no NodeId brand, and `:1577` indexes `onConnect` before excluding the optional options argument. Reading the accepted target node's existing branded id and excluding undefined before indexing repair the actual diagnostics without changing an API or fixture input.

The original native sequences remain binding. Design lines 211-220 retain each owner's public state, accepted readiness, query/callback replacement silence, controlled refusal and real acceptance, old/new callback identity, handle edge values, unsubscribe/disposal and six actual frames. Converting stateful loops into `Promise.all` would violate those obligations. The suggested bounded straight awaits or genuine sequential Effect workflow preserve them in principle. Actual browser order, recorded full values, attachments and quiescence still need leased native execution.

Capture promotion remains after the enclosing browser/server cleanup at `scripts/capture-selector-lifecycle-reference.ts:458-486`. Adding both helper paths to the source closure at `:159-165` is necessary if the approved revision imports them. Two internal mounts remain additional repeatability evidence; they cannot replace the two separately required CLI acquisitions. Plain reference JSON still has its disclosed own-presence/sign limitations.

The proposed independent tests are meaningful and remain distinct from genuine reference acquisition. Existing required fixture-dependent test lines `packages/conformance/src/selector-lifecycle-reference.test.ts:8-46` must remain unchanged and unskipped. The proposed controls check explicit envelopes, errors, getter counters, source own-property distinctions, signs, detached delivery and index progression, including index 2 after a failed callback. The current original recorder test at `:81-99` checks only indexes 0/1 after failure and compares encoded values through the same transport helper, so those stronger checks are necessary. No test pass follows from this review.

## Required revision and acceptance boundary

Resolve ARCHITECTURE-01 before primary approval or same095 implementation resume. A revision must preserve the exact ten existing amendment paths and two named test-only additions, keep every other STOP source path protected, retain the complete approved packet and every original/historical/installed test obligation, and keep the same wire protocol. It must not use another source path, production/API edit, policy change, handwritten recursive interface, suppression, cast, unknown alias, mutable schema holder or runtime aggregate import to force the type through.

The revised plan should distinguish three proofs explicitly: runtime imports contain no cycle; runtime schema construction remains lazy; the exact recursive types are accepted with precise fields by the actual compiler. Only the first two currently have source-backed support. If the third needs a separately authorized feasibility phase, specify that phase's exact files and evidence boundaries before releasing it. No such phase was performed here.

The current STOP still has actual quality exit 1 and native typecheck exit 2. Proposed local type/build, quality, architecture, filtered transport and preserved units remain future checks. Native/browser suites, the React declaration compiler, genuine expanded units, two separate reference captures, installed archives, focused `bun run verify`, root reproduction and fresh SOURCE review remain withheld. `bun run verify:full` remains an integration/release gate. None of the 513 parent cells, parent-plan acceptance, CI, native-device or collector delivery is established.

## Conformity and deviations

- **Conforming by inspected design:** descriptor-only synchronous native evidence capture, distinct actual node/handle payload contracts, complete tags and own-property/sign requirements, immutable STOP evidence, original phase/assertion retention, controlled proposal/acceptance separation, disposal, cleanup-before-promotion and transitive capture provenance. The boundary is design/source inspection, not executed source acceptance.
- **Intentionally different:** test evidence rejects classes, exotic arrays, functions and decorated containers rather than silently recording incomplete values. Production graph policy remains unchanged. Native silent query reset and Vue live readonly-ref context retain the existing reasons for differing from pinned React changed-query callbacks and keyed remount. Tagged native transport preserves presence and sign that plain reference JSON cannot establish.
- **Unverified:** the exact factory recursive TypeScript inference, descriptor filter/encoder implementation, quality acceptance, actual imports/JSON transport, full native values/generation/order/attachments/cleanup, genuine reference/React compilation, separate captures and failure-preserving promotion, archives, focused/full/root/SOURCE/parent acceptance, all 513 cells, CI, devices and collector delivery. The source-visible type dependency is a design blocker; no guaranteed compiler diagnostic or executed parity claim is supplied.
