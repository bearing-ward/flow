# Plan 087: Create the typed-data contract factory

## Status and authorization

Priority P1, effort M/L, risk MED/HIGH. Drafted 2026-10-02 at main `841be137e253cf19c665269eaaa79edc19abf3c3`. Parent 069 remains IN PROGRESS; all 100 original members/300 host cells remain open. 086 is reserved for native integration. This plan implements B1 only, the approved codec design's first product step, without actors, adapters, reducers or persistence. Primary and independent cold design approval of this packet are pending. No source execution is approved by this draft alone.

The maintainer's request to continue all known backlog toward closest possible library parity authorizes a separately dispatched executor after design review. Primary changes main plans only; executor uses one isolated detached checkout and leaves all source uncommitted. No commit, merge, push, cleanup, publication, dependency update or modification of old stopped candidates.

The approved architecture is `plans/archive/codec-boundary-design.md`, SHA256 `cdf05648d7984e19f3907690f9c15b4ed4f127cdd9ec830e15df9120fd1399a3`, and its primary approval is `plans/archive/codec-boundary-primary-design-review.md`, SHA256 `46acaf25398d7ff4d212003e86135687e025388ca534aea12d7539354992ede2`. New exact API/traversal detail is in `plans/archive/typed-factory-design.md`; freeze its approved hash in the dispatch receipt. The source executor reads both complete approved packets. The self-contained requirements below retain the full default/no-data target.

## Input receipt and drift gate

Primary selected accepted 085 as the sole implementation input. Main alone, accepted 082 alone and the stopped 083/084 candidates are not substitutes. The source root is `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`, detached baseline `841be137e253cf19c665269eaaa79edc19abf3c3`.

The selected external freeze is `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/origin-edit-resumption-evidence/final-freeze.json`, SHA256 `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`. It contains 128 changed paths and a 1477-file complete candidate manifest. Source delta SHA256 is `a6bf7dbc4f3ec8732bad8385f602dbf94caf022f1cc1231555f34934d08b710a`.

Actual source acceptance records, read in full during final planning:

- Main `plans/archive/origin-edit-resumption-primary-review.md:14-22`, SHA256 `3beafc370472c74388284c517eae230e029f49642427e8b55dd39e008556b1ae`: APPROVE for the exact 085 core origin/edit and Schema result-contract freeze; primary independently rehashed all inventories and reproduced saved focused verification. Earlier pending statements in its historical design section are superseded only by this final acceptance section.
- Main `plans/archive/origin-edit-resumption-independent-source-review.md:3-17`, SHA256 `cdac72ce35d3efb62c59d9bb96efd5fa338d2cba929b2e6f4b1b2402122a64fc`: independent APPROVE for the same freeze. It does not accept 083, native integration or broad parity.

Before dispatch, primary supplies both exact acceptance records and approved 087/design hashes. Executor independently verifies all selected input hashes, then copies only the reviewed 128 input paths onto the detached baseline. Use the full manifest to audit assembly, not to copy ignored build/dependency outputs. No 084/083 candidate is imported separately. If the freeze, acceptance records or source inventory drift, stop the affected assembly and report the mismatch for primary review; there is no automatic fallback to 082 or an unreviewed 085 freeze. Name the isolated checkout `typed-data-factory`; no shared node_modules/dist/browser work with 086. Preserve all original source packets and logs.

Source identities read during planning:

| Input | SHA256 |
| --- | --- |
| 085 `packages/core/src/domain/flow.schema.ts` | `e16ec445c9cdb041ca1da01633a2a041f43498cb9a52ba85640014aaab7379a6` |
| 085 `packages/core/src/domain/flow-persistence.ts` | `b28e1ba66049810f61d653ad7990531201a37074bac95a860aefe4a5214628e0` |
| 085 `packages/core/src/domain/flow-persistence.test.ts` | `b781e80e4de4d5e851326f16cec42baaab56356eeebe3ac5491366e9220be95f` |
| 085 `packages/core/src/public.ts` | `7b8f02100fab59d4804e332915b37e58c0effe9877c695c6cb342be5991867a5` |
| 085 `plans/057-member-closure.json` | `36b6f9019d7799e51dcf6ef1a14c4ebb1fec52d0feeffbdc60039747ac043643` |
| 085/main `bun.lock` | `e6cd3b1436a12de7c05349f4dcb248238df53b9f93862d9f80b7c57b7cbabb4d` |
| Approved reference probe `plans/069-codec-boundary-probe.ts` | `d9689e9ea04e4917e11bf996c3bf77003d794eabe03001860738fef2fb0e7889` |

Primary supplies the two approved codec Markdown records, both 085 acceptance Markdown records, approved 087 plan/design and their exact final design review as explicitly owned planning inputs. Record all original input hashes and copied-path hashes in the initial receipt. Copied Markdown records may receive formatting-only changes needed by existing quality tooling, with original and formatted hashes recorded separately and unchanged prose/code verified. Original main records remain immutable to the executor.

Read the prior probe only at `/Volumes/Sync/codex/9-19-26/flow/plans/069-codec-boundary-probe.ts`, after checking its recorded hash. Do not copy, execute, gate, reformat or edit that raw advisor experiment in the factory checkout. Its relevant API patterns are already excerpted here and in typed-factory-design.md. All reference inputs inform the bounded implementation; none is a source template to execute wholesale. Before edits, record main baseline, all copied paths/hashes, unchanged manifests/lock, input versus extra approved planning files and selected acceptance boundary in owned provenance. Compare actual source excerpts and use `git diff --stat 841be137e253cf19c665269eaaa79edc19abf3c3..HEAD -- packages/core/src scripts/check-packed-consumer.ts scripts/consumer-fixtures tests/consumer docs verification.config.json` plus `git status --short`; uncommitted accepted composition matters more than the empty commit range.

## Current source and conventions

All product excerpts below match selected accepted 085; its schema is byte-identical to accepted 082, where the initial reads were made. Match `docs/standards.md:7-16`: Schema owns contracts, external input is unknown until decoded, Effect owns services/errors, core is framework-independent and parity requires reference proof.

Node schema at `packages/core/src/domain/flow.schema.ts:64-85` includes:

```ts
id: NodeIdSchema,
label: S.String,
position: XYPositionSchema,
origin: S.optional(NodeOriginSchema),
parentId: S.optional(NodeIdSchema),
type: S.optional(S.NonEmptyString),
data: S.optional(S.JsonObject),
// Existing flags, handles, size, connectable and ARIA fields follow.
```

The edge schema at :115-139 includes branded identity/endpoints/handles, optional type/data, path/marker/stroke/flags and empty-capable ariaRole/ariaLabel. Keep every field except caller-selected type/data identical in the variant builders. The document schema at :143-147 is:

```ts
export const FlowDocumentSchema = S.Struct({
  edges: S.Array(FlowEdgeSchema),
  nodeOrigin: S.optional(NodeOriginSchema),
  nodes: S.Array(FlowNodeSchema),
})
```

Existing `findDocumentIntegrityError` at :345-364 indexes duplicate nodes, then parents, cycles, duplicate edges, duplicate handles and ordered edge references. `validateDocumentWithPolicy` at :414-432 returns the exact document and uses existing integrity logs/span. `validateFlowDocument` at :434-437 delegates with physical-id; `decodeFlowDocument` at :463-464 and internal `decodeLegacyFlowDocument` at :467-468 select physical-id and canonical-kind respectively. 082's approved frozen order is described at `plans/082-integrate-ordered-legacy-and-current-gestures.md:19-27,74-78` and tested in `packages/core/src/domain/flow-origin-persistence.test.ts:874-1038`. Preserve it exactly, including complete session validation before graph integrity.

The installed Effect 4.0.0-rc.116 APIs support `Struct.omit(schema.fields, keys)` and inferred `S.Struct` returns. See `node_modules/effect/src/Struct.ts:336-361`, Schema.ts:3298-3328 and prior probe:23-40. `S.Union` retains const tuple Type/Encoded/DecodingServices/EncodingServices at Schema.ts:4673-4686. `S.toType` uses the decoded side, not a codec roundtrip. Schema parsers retain their own service channel and SchemaError at :1473-1479,1878-1884. A service-free schema may suspend. Do not replace Effectful parsing with synchronous adapters.

Unit convention is existing Effect/Vitest `packages/core/src/domain/flow.schema.test.ts:1-17,24-84`. New units use real Schema and shared integrity, without a mocked validator. Root Vitest auto-includes `packages/**/*.test.ts`. Root tsc includes scripts/**/*.ts, so new compile fixtures under scripts/consumer-fixtures need no tsconfig policy change. Packed runner already installs archives, imports @flow/core and typechecks three fixture projects at `scripts/check-packed-consumer.ts:774-800`. Preserve all existing native/browser consumer assertions.

## Exact implementation contract

### Contract definitions and failures

In new `flow-data-contract.schema.ts`, derive geometry aliases from accepted FlowNode/FlowEdge, replacing only data/type, and document geometry from `Omit<FlowDocument,'nodes'|'edges'>` plus typed arrays. This retains origin metadata in the bound. Define `FlowGraphCodec = S.ConstraintCodec<FlowGraphGeometry,unknown,unknown,unknown>`, `FlowNodeOf<C>` and `FlowEdgeOf<C>` through the codec's exact Type arrays.

Copy the approved failure fields exactly into one `FlowTypedFailureSchema`: FlowCodecFailure with operation decode/validate-decoded/encode/isolate and message; FlowCallbackFailure message; FlowDisposed; FlowRevisionConflict expected/actual S.Number; FlowProjectionFailure revision S.Number/message. Type derives from that Schema. `FlowTypedError` is the union with existing FlowDocumentIntegrityError. Those schemas do not claim actor behavior is implemented.

Retain the approved interfaces and pure factory:

```ts
export interface FlowIsolation<C extends FlowGraphCodec, RI> {
  readonly detach: (
    value: C['Type']
  ) => Effect.Effect<C['Type'], FlowTypedFailure, RI>
}
export interface FlowDataContract<C extends FlowGraphCodec, RI> {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}
export function defineFlowDataContract<C extends FlowGraphCodec, RI>(options: {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}): FlowDataContract<C, RI> {
  return {
    id: options.id,
    document: options.document,
    isolation: options.isolation,
  }
}
```

No codec/detach/global runtime executes during definition. A trusted capability supplies class-specific independence. Schema validates its output type but cannot certify private-slot independence. The caller may supply an arbitrary whole-document codec satisfying the geometry bound; builders are optional conveniences. Existing synchronous JSON APIs stay concrete and unchanged.

### Schema-preserving builders

Create `createFlowNodeVariantSchema({type,data})`, `createFlowEdgeVariantSchema({type,data})` and `createFlowDataDocumentSchema({nodes,edges})` in new `flow-data-contract.ts`. Use const generic type schemas constrained to `S.ConstraintCodec<string | undefined,unknown,unknown,unknown>` and exact data schema D extends S.Constraint. Node and edge factories spread `Struct.omit` of their authoritative `.fields`, removing only type/data, then install both supplied field schemas. Do not omit fields altogether for no-data/untagged branches; use explicit `S.optional(S.Undefined)` so foreign data/discriminants are rejected rather than excess-key stripped.

The document builder accepts exact N/E codecs whose decoded types satisfy FlowNodeGeometry/FlowEdgeGeometry. Its body spreads `Struct.omit(FlowDocumentSchema.fields,['nodes','edges'])` then uses `S.Array(options.nodes)` and `S.Array(options.edges)`. Keep inferred concrete Struct returns and service channels; no broad return annotation or phantom generic.

Fully explicit branches may use const tuple Union plus toTaggedUnion('type'). Optional/default/untagged unions must use ordinary Union with complete caller narrowing, since the tagged helper requires every decoded discriminator. Type/default/data field schemas retain their caller-selected constraints and transforms; do not silently impose an alternate decoder or native-renderer fallback policy. Approved design detail and exact outlines are in typed-factory-design.md.

### One shared integrity traversal

In existing flow.schema.ts, derive FlowIntegrityNode via Pick of id,parentId,extent,handles; FlowIntegrityEdge via Pick of id,source,target,sourceHandle,targetHandle; FlowIntegrityDocument is their readonly arrays. Generalize existing index/parent/cycle/duplicate/reference helpers to those fields. Keep indexDocumentNodes generic in actual N and keep exact document generic D through `validateDocumentWithPolicy<D extends FlowIntegrityDocument>`.

Add public `validateFlowGraphDocument<D extends FlowIntegrityDocument>(document:D):Effect.Effect<D,FlowDocumentIntegrityError>` delegating physical-id policy. Existing concrete validateFlowDocument/decodeFlowDocument/decodeLegacyFlowDocument keep signatures, policies, existing Schema decoder and logging. No duplicated validator or extra traversal, no concrete JSON re-decode of typed values, no base-only graph projection. Existing literal1 order and canonical-kind semantics stay unchanged; no flow-persistence.ts edits.

## Hard scope

All selected accepted input paths may be assembled unchanged. New deltas are limited to:

- New `packages/core/src/domain/flow-data-contract.schema.ts`, `flow-data-contract.ts`, `flow-data-contract.test.ts`.
- Existing `packages/core/src/domain/flow.schema.ts`, only derived structural types, helper parameter/map signatures, generic shared validator and new live export. Existing concrete schemas, policy control flow, errors, logs and decoder signatures stay unchanged.
- `packages/core/src/public.ts`, only the new schema/types/builders/factory/generic validator exports. Keep internal decodeLegacyFlowDocument private to package composition.
- New shared `scripts/consumer-fixtures/typed-data-factory.types.ts` and `typed-data-factory.runtime.ts`, both importing only public @flow/core/Effect exports. These files are included by root tsc and copied into each installed consumer.
- `scripts/check-packed-consumer.ts`, only copying these two common fixtures from scripts/consumer-fixtures into every existing temporary consumer after its ordinary fixture copy, and executing `bun typed-data-factory.runtime.ts` after existing core import/peer checks. Preserve all install/type/browser checks and server behavior. No alternate consumer runner or source alias.
- `tests/consumer/tsconfig.json`, `tests/consumer/vue/tsconfig.json`, `tests/consumer/foldkit/tsconfig.json`, only adding the two copied fixture filenames to include. Do not alter compiler options. No existing consumer main/type/browser assertions change.
- `docs/public-api.md`, append the exact factory-only usage, encoded/decoded/services/isolation trust and future boundaries. Regenerated `docs/api-reference.md` only if the existing generator changes it; do not edit the generator or generated text by hand.
- `verification.config.json`, focused activeWork087; checks docs,contracts,api-members,traces,consumer; all three hosts select only existing versioned-persistence.e2e.ts. These suites guard shared concrete integrity behavior, not typed adapter parity. No browser source/config/assertion edits.
- Owned copies of this plan, `plans/archive/typed-factory-design.md`, the exact final 087 design review, `plans/archive/codec-boundary-design.md`, `plans/archive/codec-boundary-primary-design-review.md`, `plans/archive/origin-edit-resumption-primary-review.md` and `plans/archive/origin-edit-resumption-independent-source-review.md`, plus new `plans/typed-factory-execution.md` and `plans/typed-factory-provenance.json`. Copied Markdown reference records allow only formatting changes with separately retained original input hashes. The raw 069 probe is an external immutable reference and is never copied into this checkout. Primary alone maintains main README/status/member/research updates.

No actor/Ref/queue/state owner, typed snapshots/getters/subscriptions, generic edit/delete/connection/reconnection/utility reducer propagation, renderer/native ports or lifecycle code, saved format/reader/writer, FlowDocumentSchema/FlowNodeSchema/FlowEdgeSchema fields, arbitrary validator extraction, manifests/lock/dependency/compiler/lint/Vitest/Playwright policy, imported/generated research, frozen oracle/reference fixture, api-members.json or 057-member-closure.json changes. No any/casts, private graph-state access, test-only production API, second graph authority, skips/tolerance/timeout increases or weakening old tests. The private-state Counter is a caller-owned test fixture, not access to Flow authority.

## Required runtime and compiler matrix

Every row needs meaningful positive and negative proof through the exported product factory/builders; prior virtual design probes do not satisfy it.

| Case | Runtime and public type expectation |
| --- | --- |
| Explicit node and edge variants | Correct literal/data pairing; wrong pair rejected by codec and Type/Encoded negative compiler cases; branded node/edge/handle IDs preserved |
| Optional literal discriminator | Absent and own undefined remain optional, without fabricated type; wrong nondefault literal/data rejected |
| Decoding defaults | Key-only default handles absence and rejects own undefined; value default handles both; passthrough/omit encoding remains caller-selected; decoded/encoded types differ as installed API declares |
| Untagged union branch | Explicit foreign discriminator cannot be stripped into acceptance; ordinary union retains every branch for caller narrowing |
| No-data node and edge | Absent/own undefined accepted via optional Undefined; object/string/null data rejected at runtime and incompatible Type assignment rejected; include no-data optional/default/untagged branches |
| Optional data | Exact optionalKey versus optional distinction; constructor/decode defaults and services retained without adding a second weak branch |
| Date/private Counter | Effectful string-to-Date and number-to-class decode; encoded views remain string/number; decoded-side validation accepts class instances and rejects encoded representations/plain-object class lookalikes. Do not claim instanceOf verifies private slots; the supplied class capability and its mutation tests own that proof |
| Independent services | Distinct DecodeContext, EncodeContext and IsolationContext services. Decoder needs only RD, encoder only RE, detach only RI; missing/wrong service negative cases must compile as expected errors; supplied cases execute |
| Service-free suspension | Async Date codec runs through Effect parser; services=never does not authorize sync parsing. Record sync limitation as diagnostic, not failure of Effectful path |
| Isolation boundary | Factory construction invokes no codec/detach; supplied capability makes distinct Date/Counter/private state copies; mutating one detached result leaves original/second copy unchanged; singleton codec demonstrates schema alone cannot certify independence |
| Accepted metadata/geometry | Nonzero/unclamped and explicit [0,0] global/per-node origins survive schema decode/encode; absent keys do not become defaults; current connectable/ARIA strings/handles/parent/size flags retain base constraints |
| Shared integrity | Same typed document/node/edge/data/class references returned, no custom decoder/encoder/detach reinvocation; all existing error families plus live target-target physical IDs; exact first failure order remains shared with unchanged legacy oracle tests |
| Public failure schema | All five approved tags and four codec operation literals roundtrip; malformed tag/operation/fields fail; no manual widened failure interface or hidden SchemaError erasure |
| Custom whole-document codec | Factory preserves exact Type, Encoded, RD/RE/RI and node/edge subtype extraction without requiring the convenience builder or losing document metadata |

Installed consumer tsconfigs do not enable exactOptionalPropertyTypes; root tsc does. Preserve these compiler options. Shared copied fixtures must not expect an own-undefined assignment to an optionalKey-derived object field to fail under the installed mode, or copy a root-only unused @ts-expect-error directive into those projects. Compare exact schema field markers and Type/Encoded assignability with the authoritative installed optional/default schemas under each current mode; runtime optionalKey absence-versus-own-undefined rejection remains mandatory in every installed consumer. Wrong pairs, decoded/encoded classes, brands, missing required fields and missing/wrong service negatives remain meaningful in all modes. State this boundary in the final receipt; do not claim installed exact-optional assignment enforcement.

Compiler negatives use `@ts-expect-error` only at intentional assignment/call boundaries, with a one-line reason. Unused directives must fail tsc; do not count an unrelated diagnostic as the expected failure. No ts-ignore, unchecked asserted values or casts in fixtures. Construct IDs through actual schemas. Missing fields cannot be rescued by accidental excess-key stripping: explicit Undefined fields protect untagged/no-data alternatives.

Test graph integrity through the same decoded caller graph. Include combined competing failures: duplicate nodes versus bad parents; parent error versus cycles; duplicate edges versus duplicate handles; missing source/target nodes versus wrong handles; earlier edge ordinary failure versus later wrong-kind/missing reference. Preserve existing frozen document/session/viewport-error tests unchanged. The new validator does not call persistence; the existing oracle suite demonstrates legacy behavior remains intact.

## Ordered execution and exact gates

1. Confirm primary and cold approval of 087/design, independently hash/copy the selected accepted 085 packet and all exact planning/acceptance inputs, save receipt and frozen dependency installation. `bun install --frozen-lockfile` must exit 0 without changing lock/manifests. Match the source excerpts and selected closure hashes before edits. Run `bun run check` and `git diff --check`, both exit 0; report drift rather than editing inherited functional behavior.
2. Add contract/failure definitions and inferred builder implementations plus public exports. Add meaningful factory/schema cases from the matrix, using real Date/Counter codecs and service contexts. First targeted commands are `bun run test -- packages/core/src/domain/flow-data-contract.test.ts` and `bun run typecheck`, both exit 0. Build-aware typecheck establishes public package resolution for fixtures; missing prerequisite builds are not functional defects.
3. Generalize only existing structural integrity signatures and add the new live generic validator. Add exact reference/subtype/error-order tests to the new owned test file. Run `bun run test -- packages/core/src/domain/flow-data-contract.test.ts packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-origin-persistence.test.ts packages/core/src/domain/flow-persistence.test.ts packages/core/src/domain/flow-directed-handle.schema.test.ts`, all pass with old assertions/fixtures unchanged. Run `bun run typecheck` and `bun run check:architecture`, both exit 0. Inspect the complete flow.schema diff against selected input, not just the added export.
4. Add the shared installed type/runtime fixtures and narrowly wire the existing packed runner/config includes. `bun run test:consumer` must pass every original installed consumer plus the new shared runtime fixture and negative type cases in each archive consumer. The runtime fixture imports @flow/core from the installed tarball with no source resolution override, creates/decodes/encodes/isolates/validates a typed graph and checks exact origin/class/data/identity/service/error outcomes. This is core installed-runtime evidence, not a typed native canvas.
5. Write public usage and precise boundaries; regenerate docs with `bun run docs:generate-api`, then `bun run docs:check`, both exit 0. Keep docs/api-reference unchanged if its current generator produces no change. Update focused scope as specified. `bun run verify --list` must name 087, baseline units/build/types/quality/architecture, docs/contracts/api-members/traces/consumer and exactly the three existing versioned persistence suites. `bun run verify` must finish exit 0; strict browser/consumer leases run serially and only when coordinator grants the shared test slot. Check all 4176/4177/4178 listeners before/after; do not terminate or reuse foreign servers.
6. Write owned execution/provenance records with input/output inventories, actual completed commands/logs/counts/profile, type-case identities, factory versus native boundaries and all failures. Format all owned changed files and records with existing tools before the final `bun run check` and `git diff --check`, both exit 0. Until those final commands complete, record their result as pending. Save their actual outputs/status in the external receipt without changing the frozen repository records afterward. Freeze complete final inventory/hashes and source patch in a sibling evidence directory; avoid a self-referential hash inside its own hashed file.
7. Release owned build/browser resources. Primary independently rehashes final inputs/outputs, reads full product/fixture/assertion/scope diff, reruns saved focused verifier on the exact freeze and obtains cold source approval. Only then may 087 be DONE as a factory foundation. Parents 069/057/066 and all 100/300 generic cells remain open. 086 and later generic actor/adapter integration have their own acceptance.

Additional explicit required commands are `bun run scripts/check-api-member-contracts.ts`, `bun run scripts/check-api-members.ts`, `bun run research:check-traces` and final `git diff --check`, all exit 0. The default contract checker remains structural. Do not require parent `--require-closed` to pass or edit open cells. Compare immutable selected member and persistence/reference/oracle file hashes to the input receipt. `bun run verify:full` is required at subsequent source integration, not a substitute for 087's exact factory/compiler/legacy matrix.

## Done criteria and escalation

All API and branch cases above are implemented and proved through exact exported product types/runtime. Required targeted, installed, saved focused and final quality gates pass. Original concrete signatures/fields/errors/logs, legacy validation ordering, persistence code/oracle fixtures, dependencies and 069 member identities/states remain unchanged. Exact inherited/new inventory and frozen bytes match the primary-approved scope. Primary reproduction and independent source approval are recorded.

Do not add an arbitrary mechanical retry cap for formatting, missing built packages or a diagnosed reversible fixture issue. Preserve the first failure, inspect the root cause, repair within this scope and continue authorized work. Escalate substantive functional design changes, out-of-scope requirements, input/dependency/evidence drift, foreign resources or repeatedly unexplained environment failures to primary review; continue independent work while that issue is reviewed. Improve allows at most two formal source-review revisions per candidate. If exhausted, preserve/block that candidate and refine the actual design through a separate reviewed continuation, without rewriting historical failures.

Stop the affected source operation if a default/no-data/serviceful branch needs casts or erased service/type channels; if typed values enter concrete JsonObject decoding; if integrity needs a second traversal/validator or weaker frozen ordering; if a new actor/adapter/persistence API is needed; or if a callback/codec/isolation proof requires access to accepted authority. Supply exact diagnostics and the proposed bounded correction. No failed proof is accepted, and a passing design probe does not replace product assertions.

## Conformity and deviations

Conforming target is schema-derived generic views/failures, complete caller variants, explicit services/isolation and unchanged accepted post067 metadata and ordered legacy integrity. Tests separate actual factory/public core paths, installed parser/consumer execution and existing mounted concrete regression guards. 087 does not claim full generic graph behavior from those tests.

The approved separate Effectful typed API and trusted class isolation are intentional framework-independent adaptations. Factory construction itself has no side effect or graph authority. Typed actors/transitions, native projections/render/lifecycle, observers, versioned typed persistence, pinned runtime comparison, original-member closure, full integration, CI/device/collector and broad parity remain unverified. Refresh the factory fields and compiler matrix whenever authoritative Node/Edge/document schemas, Effect parser/default/service semantics or the approved 069 contract changes.

## Final independent factory acceptance, 2026-10-02

Status DONE for the bounded factory foundation only. Historical draft prerequisites above are superseded by the final reviewed design/amendment and this source acceptance. Candidate `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow` remains detached/uncommitted; external freeze SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. All1492candidate/122evidence hashes matched primary and fresh cold audits. Root reproduced focused verify0/41.565s:765units/51files, three actual archive factory probes with140assertions/28compiler negatives each, and exactly one existing versioned-persistence test per host. FullSuitefalse. Post-reproduction candidate hashes unchanged.

Primary approval is `typed-factory-primary-source-review.md`; independent APPROVE is `typed-factory-independent-source-review.md` SHA256 `c6c7b6214c68266dfb50cd345a3f03d0b4adce74ac91ee683eeb208564859b47`. Approved relocation confines two shared probes to tests/consumer with unchanged compiler modes. Codec identity, service channels, optional/default/no-data variants, trusted class isolation and shared ordered integrity are accepted in this bounded scope. No actor/host/typed-persistence/pinned generic parity or original member closure is accepted; all100members/300cells and069/057/066 remain open. Full verification remains required at integration.

### Conformity and deviations

Factory/public compiler/runtime and concrete shared-integrity regressions conform to the reviewed design. Effectful parsers/trusted isolation/unchanged consumer optional modes are intentional adaptations. Full typed host behavior and broad parity remain unverified.
