# Typed-data factory design for Plan 087

Draft for primary and independent review, 2026-10-02, main `841be137e253cf19c665269eaaa79edc19abf3c3`. This narrows the approved 069 codec design's first product step. It does not reopen codec placement or implement actors, adapters, reducers or persistence. No product source or verification changed during planning.

The approved design is `plans/archive/codec-boundary-design.md`, SHA256 `cdf05648d7984e19f3907690f9c15b4ed4f127cdd9ec830e15df9120fd1399a3`. Its primary approval is `plans/archive/codec-boundary-primary-design-review.md`, SHA256 `46acaf25398d7ff4d212003e86135687e025388ca534aea12d7539354992ede2`. Preserve its explicit Effect APIs, isolation trust boundary, default concrete JSON APIs and eventual single decoded authority. The scalar prototype's commit-before-send ordering remains unsuitable for production and is outside 087.

## Source boundary

Primary selected accepted 085 at `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow` as the sole execution input. Its external final-freeze SHA256 is `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`, with 128 reviewed changed paths and a 1477-file candidate manifest. Main `plans/archive/origin-edit-resumption-primary-review.md:14-22`, SHA256 `3beafc370472c74388284c517eae230e029f49642427e8b55dd39e008556b1ae`, and `plans/archive/origin-edit-resumption-independent-source-review.md:3-17`, SHA256 `cdac72ce35d3efb62c59d9bb96efd5fa338d2cba929b2e6f4b1b2402122a64fc`, accept that exact source scope. Both records were read in full. Plan 087 specifies independent input rehashing and complete acceptance receipts; there is no automatic fallback to accepted 082, main or a new unreviewed 085 freeze.

Initial product citations below were read from accepted 082 at `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow` and match selected 085. Main lacks this origin metadata and cannot be substituted. Both candidates have identical `flow.schema.ts` SHA256 `e16ec445c9cdb041ca1da01633a2a041f43498cb9a52ba85640014aaab7379a6`; relevant persistence/public/lock hashes were also rechecked against selected 085.

- `packages/core/src/domain/flow.schema.ts:64-86` owns node origin, connectable, empty-capable ARIA strings, flags and geometry; `:115-139` owns native edge role/label and geometry. Type and data are the only variant-builder replacements.
- `:143-149` owns optional document nodeOrigin. A document builder must spread its existing fields after omitting only nodes/edges; it must not reconstruct a nodes/edges-only document.
- `:168-364` contains one ordered integrity traversal; `:414-468` adds its Effect error/log/span workflow and physical-ID versus legacy canonical-kind policies. Preserve that single traversal and order.
- Installed Effect sources are read from main, pinned 4.0.0-rc.116. `node_modules/effect/src/Schema.ts:820-825` retains Type, Encoded and separate decoding/encoding services; `:1473-1479` and `:1878-1884` expose parser service channels and SchemaError; `:2468-2495` defines decoded-side toType with no transform services; `:3298-3328` exposes exact Struct.fields; `:4673-4686,4756-4760` preserves tuple Union views/services.
- `plans/069-codec-boundary-probe.ts:23-40` already demonstrates field reuse, correlated explicit variants and optional/default/untagged cases. Its document at :35 lacks post067 metadata and is a compiler experiment, not a product template.

## Proposed exports

087 exports only the contract/schema foundation below. Names introduced here require cold review before execution. The existing approved `defineFlowDataContract`, `FlowIsolation`, `FlowDataContract` and failure union retain their signatures and semantics. Do not export makeTypedFlow, typed getters, native render registries, actors or persistence here.

```ts
import { Effect, Schema as S, Struct } from 'effect'

import type {
  FlowDocument,
  FlowDocumentIntegrityError,
  FlowEdge,
  FlowNode,
} from './flow.schema.ts'
import {
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
} from './flow.schema.ts'

export type FlowNodeGeometry = Omit<FlowNode, 'data' | 'type'> & {
  readonly type?: FlowNode['type']
}
export type FlowEdgeGeometry = Omit<FlowEdge, 'data' | 'type'> & {
  readonly type?: FlowEdge['type']
}
export type FlowGraphGeometry = Omit<FlowDocument, 'nodes' | 'edges'> & {
  readonly nodes: readonly FlowNodeGeometry[]
  readonly edges: readonly FlowEdgeGeometry[]
}
export type FlowGraphCodec = S.ConstraintCodec<
  FlowGraphGeometry,
  unknown,
  unknown,
  unknown
>
export type FlowNodeOf<C extends FlowGraphCodec> = C['Type']['nodes'][number]
export type FlowEdgeOf<C extends FlowGraphCodec> = C['Type']['edges'][number]

export const FlowTypedFailureSchema = S.Union([
  S.TaggedStruct('FlowCodecFailure', {
    operation: S.Literals(['decode', 'validate-decoded', 'encode', 'isolate']),
    message: S.String,
  }),
  S.TaggedStruct('FlowCallbackFailure', { message: S.String }),
  S.TaggedStruct('FlowDisposed', {}),
  S.TaggedStruct('FlowRevisionConflict', {
    expected: S.Number,
    actual: S.Number,
  }),
  S.TaggedStruct('FlowProjectionFailure', {
    revision: S.Number,
    message: S.String,
  }),
])
export type FlowTypedFailure = typeof FlowTypedFailureSchema.Type
export type FlowTypedError = FlowTypedFailure | FlowDocumentIntegrityError

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

type VariantTypeCodec = S.ConstraintCodec<
  string | undefined,
  unknown,
  unknown,
  unknown
>

export function createFlowNodeVariantSchema<
  const T extends VariantTypeCodec,
  const D extends S.Constraint,
>(options: { readonly type: T; readonly data: D }) {
  return S.Struct({
    ...Struct.omit(FlowNodeSchema.fields, ['type', 'data']),
    type: options.type,
    data: options.data,
  })
}
export function createFlowEdgeVariantSchema<
  const T extends VariantTypeCodec,
  const D extends S.Constraint,
>(options: { readonly type: T; readonly data: D }) {
  return S.Struct({
    ...Struct.omit(FlowEdgeSchema.fields, ['type', 'data']),
    type: options.type,
    data: options.data,
  })
}
export function createFlowDataDocumentSchema<
  const N extends S.ConstraintCodec<
    FlowNodeGeometry,
    unknown,
    unknown,
    unknown
  >,
  const E extends S.ConstraintCodec<
    FlowEdgeGeometry,
    unknown,
    unknown,
    unknown
  >,
>(options: { readonly nodes: N; readonly edges: E }) {
  return S.Struct({
    ...Struct.omit(FlowDocumentSchema.fields, ['nodes', 'edges']),
    nodes: S.Array(options.nodes),
    edges: S.Array(options.edges),
  })
}
```

Split this outline into the new `.schema.ts` contract/failure/type definitions and `.ts` factory/builders to avoid a cycle. The schema module depends on existing flow.schema; flow.schema must not import the typed contract module. Factory functions keep inferred Struct returns, never annotate them as a broad Constraint that loses fields, optionality, discriminants or services. These declarations were source-vetted against installed APIs but were not compiled during this read-only planning pass. Their actual exported implementations and installed declarations must pass 087's compiler gates before acceptance.

The whole-document caller API remains supported. `defineFlowDataContract` accepts any graph-shaped codec C, including an encoded representation unlike its decoded graph. Builders are conveniences, not a mandatory restricted schema grammar. Construction does not run decode, encode, detach, a global runtime or application services. ID remains a string as approved; no registry, new contract-ID policy or persistence lookup is introduced.

The caller's type and data schemas own their transforms, defaults, exact absence and constraints. The builder preserves all other base fields verbatim. Do not infer a native renderer's fallback semantics from schema defaulting or silently replace a caller codec with base JsonObject/type decoding. Legacy concrete schemas retain all their existing restrictions. Optional/default/untagged unions use ordinary Union and caller narrowing; `toTaggedUnion('type')` at installed Schema.ts:6126-6129 requires a property-key discriminator on every decoded branch and is only appropriate for the explicit-discriminator fixture.

## Required variant construction

Use the same node and edge APIs for every branch; do not create a separate weak default path.

| Branch | Supplied type schema | Supplied data schema | Required distinction |
| --- | --- | --- | --- |
| Explicit | `S.Literal('dated')` | Date/class/serviceful struct | Wrong type/data pair rejected in decoded and encoded views |
| Optional literal | `S.optional(S.Literal('default'))` | Distinct Date data | Absent and own undefined remain permitted; no implicit default insertion |
| Decoding default | `S.Literal('default').pipe(S.withDecodingDefaultKey(Effect.succeed('default')))` | Distinct data | Absent encoded type decodes to required default; own undefined is rejected by this exact-key helper |
| Undefined-aware default | `S.Literal('default').pipe(S.withDecodingDefault(Effect.succeed('default')))` | Distinct data | Absent/own undefined decode to default, according to installed helper semantics |
| Untagged | `S.optional(S.Undefined)` | Distinct Count data | A foreign explicit discriminator is rejected, not stripped and accepted |
| No data | Required, optional or untagged type as above | `S.optional(S.Undefined)` | Absent/own undefined data allowed; object/string/null data rejected |
| Exact optional data | Any above | `S.optionalKey(customData)` | Absent allowed, own undefined rejected; exact markers/services preserved |

Installed key/value defaults are separate APIs at Schema.ts:5724-5734 and :5827-5837. Tests must cover passthrough and omit encoding strategies for the caller-selected default schema. Data defaulting also needs encoded-versus-decoded fixtures. This slice does not select native fallback rendering or serialized session policy.

## Shared structural integrity

Add the following derived structural types and a generic live validator in existing `flow.schema.ts`. This is the only existing production module whose implementation changes, apart from public exports.

```ts
export type FlowIntegrityNode = Pick<
  FlowNode,
  'id' | 'parentId' | 'extent' | 'handles'
>
export type FlowIntegrityEdge = Pick<
  FlowEdge,
  'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'
>
export type FlowIntegrityDocument = {
  readonly nodes: readonly FlowIntegrityNode[]
  readonly edges: readonly FlowIntegrityEdge[]
}
export declare function validateFlowGraphDocument<
  D extends FlowIntegrityDocument,
>(document: D): Effect.Effect<D, FlowDocumentIntegrityError>
```

Generalize the existing helpers' input/map types to these Pick-derived fields, keeping indexDocumentNodes generic in N so its map retains actual nodes. Generalize validateDocumentWithPolicy to `<D extends FlowIntegrityDocument>` and return the same D reference. The new public validator delegates to it with physical-id policy. Keep existing public validateFlowDocument/decodeFlowDocument concrete signatures and their bodies' delegation; existing decodeLegacyFlowDocument remains internal to the package and delegates with canonical-kind policy. It is not newly exported from public.ts.

No helper reads data, type, geometry dimensions or metadata, so no new Schema decode is required inside this validated structural traversal. Typed caller decoding happens once through C. Returning the original typed document keeps its complete variant data, prototypes and metadata; projecting a second graph or returning a base-only result is prohibited.

The frozen order remains duplicate nodes; parent reference/extent/self; parent cycles; duplicate edges; duplicate handles; then each edge in document order, source node, target node, source handle identity/kind, target handle identity/kind. Live physical-ID policy accepts an existing named opposite-kind handle. Literal1 canonical-kind policy rejects it at the same position in the shared traversal. Complete stored envelope/schema validation still precedes legacy graph integrity. Do not modify flow-persistence.ts, repeat its decode or move a kind pre-scan before ordinary failures.

Reuse the current integrity error classes, logs, attributes and FlowSpan.documentIntegrity. The new generic validator is a typed decoded-value integrity check, not a decoder or authority creator. It does not certify codec isolation or native geometry readiness.

## Service and failure boundaries

| Operation actually executed in 087 fixtures | Success | Failure | Environment |
| --- | --- | --- | --- |
| defineFlowDataContract | FlowDataContract<C,RI> | No execution channel | None; no codec/capability is invoked |
| `S.decodeUnknownEffect(C)` | C.Type | S.SchemaError | C.DecodingServices |
| `S.encodeUnknownEffect(C)` | C.Encoded | S.SchemaError | C.EncodingServices |
| `S.decodeUnknownEffect(S.toType(C))` | C.Type | S.SchemaError | never |
| validateFlowGraphDocument | Exact D, same reference | Existing FlowDocumentIntegrityError | never |
| caller isolation.detach | C.Type | FlowTypedFailure | RI |

087 does not add parser wrappers or silently map SchemaError into every failure. The approved FlowTypedFailureSchema is defined and tested now so future actors can use it. Callback/disposed/revision/projection variants are data contracts only at this stage. Tests invoke caller isolation with a private fixture, then decoded-side validation; that is test composition, not production acceptance/encoding orchestration. Distinct Context services must prove decoder, encoder and isolation environments independently. No service-free bound claims non-suspension; an async service-free Date codec must work through Effect parsers and remain unsuitable for synchronous execution.

Caller isolation is trusted for independence. A test Counter with private state and Date-specific copy demonstrates one supplied capability; Schema validation only detects an invalid cloned type and cannot certify private independence. A singleton-returning codec test must preserve that distinction. Never put decoded data into structuredClone, JsonObject or synchronous saved-v1/port parsers to force a gate green.

## Evidence and review boundary

Production entry points are the exported factory/builders and generic validator. Tests invoke public core exports, installed Effect parsers and actual shared integrity. Installed consumer probes install the generated core archive, import these exports, build a graph schema, execute codec/isolation/integrity fixtures and compile negative cases. They do not mount a typed Flow canvas. Existing adapter consumers and selected existing persistence suites guard the shared concrete integrity refactor only.

All 34 original 069 groups, 100 members and 300 host cells remain open: 264 implementation gaps and 36 evidence gaps in both inspected 082/085 inputs. The selected closure JSON hash is `36b6f9019d7799e51dcf6ef1a14c4ebb1fec52d0feeffbdc60039747ac043643`. 087 must not modify that file or api-members.json. Default structural checker success is separate from semantic closure.

Review must decide the exact new export names, confirm the builder constraint signatures preserve optional/default services under actual TypeScript, and verify shared integrity generalization leaves literal1 reader order intact. If a signature cannot compile without casts or hidden generic erasure, submit the actual diagnostic and bounded correction for primary design review. This is not authority to omit a default/no-data branch.

## Conformity and deviations

Conforming design targets are accepted post067 geometry/metadata field reuse, Schema-derived views and failures, complete correlated node/edge variants, explicit service channels and one ordered integrity traversal. Source feasibility is supported by installed declarations and the approved prior probe; new implementation is unverified.

The approved Effectful typed API and caller isolation intentionally differ from ordinary upstream synchronous generic ergonomics to preserve services, scheduling, failures and transformed class independence. 087 only defines their contract foundation. Actors, generic transitions, native rendering/observation, checkpoint delivery, versioned typed persistence, pinned typed-data capture, original-member closure, full integration, CI/devices/collector and broad parity remain unverified and owned by later 069 slices.

## Compiler-mode acceptance clarification

Root tsc enables exactOptionalPropertyTypes; current installed consumer tsconfigs omit it. Keep those policies unchanged. Shared copied fixtures must preserve the schema's exact optional markers and compare Type/Encoded assignability with the same authoritative schemas under each current mode. They cannot use @ts-expect-error for an own-undefined optional object assignment that the installed mode permits. The actual optionalKey decoder must reject own-undefined in all runtime fixtures; optional versus optionalKey absence semantics remain tested. Other correlated-pair/class/brand/required/service negative cases still need their meaningful diagnostics. No installed exact-optional assignment claim follows from these consumers.
