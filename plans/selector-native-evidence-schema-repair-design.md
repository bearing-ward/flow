# 095 descriptor-safe native evidence schema repair design

2026-10-02. Planned against main and candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. P1, M effort, MED implementation risk. **DESIGN PREPARATION ONLY.** This document neither resumes execution nor accepts source. The same095 executor remains STOPPED. Formal SOURCE rounds consumed: zero. All513 parent cells remain OPEN.091 owns the shared verification lease.

This is a bounded successor to the approved full-payload, promotion, Foldkit handle and signed-zero packet. It repairs the test recording architecture and the exact native type/quality failures without changing graph policy, package APIs, callback contracts, lifecycle semantics or verification policy. A primary and independent design review must decide whether this exact successor, including its two additional test-only files, may be implemented. A separate same095 resume message is required afterward. No child, candidate edit, gate, browser, server, install, archive, pin or publication operation was performed to prepare this design.

## Frozen inputs and drift boundary

Use these absolute paths throughout:

- Main: `/Volumes/Sync/codex/9-19-26/flow`.
- Candidate W: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`.
- Existing evidence E: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence`.
- STOP source copy: `E/recording-amendment-stop/source`.
- Earlier complete pre-amendment preservation: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-pre-recording-amendment`.

The exact current governing STOP is `E/recording-amendment-stop-freeze.json`, SHA256 `6519afde3d2cc37b5c1a132fa01bc407a899e6336e3e9111f9e7e6e42b82a9e7`. The earlier immutable proof freeze is `E/proof-source-freeze.json`, SHA256 `1fbde98287156c15a1ffe7fc4e5dda1f1632f5b98b48c8620c84143959dbb4ef`. Retain both, all old STOPs, raw logs, source copies and all failed input evidence byte-identically.

Main's exact manifests are `plans/selector-recording-stop-source-manifest.json`, SHA256 `27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4`,1516 entries, and `plans/selector-recording-stop-evidence-manifest.json`, SHA256 `4e684505cbaab9f1a4e4712cac609ebce967b0fc9e31ec94f9c67daae1c2fe71`,11086 entries. `plans/selector-recording-stop-primary-integrity.json`, SHA256 `1f85a0acb5500db2b984f620283183971cc3dc0a8c029e248d2bb1f799c95821`, records root's independent zero-mismatch rehash of all1516current,1516copy and11086E files. That receipt proves integrity only. This advisor personally re-read the exact STOP identity, the schema in full, all ten amendment deltas, the native type and quality logs, transport tests, promotion source, current contracts and installed RC declarations. The earlier independent integrity receipt is not a new source or runtime acceptance claim.

The following approved packet identities remain required inputs. Full source corrections must retain their obligations rather than replacing them with this document's narrower tests.

| Main `plans/` file | SHA256 |
| --- | --- |
| selector-proof-payload-and-promotion-proposal.md | `5168c3461bfc7efe53180f1ff267df72a763a371cb6db390edeb7926b483ddc5` |
| selector-proof-payload-and-promotion-revision.md | `bb3b20222d3d70dde1d0a306737d543190a20e2d37e9110e8b1ce11abd7c2799` |
| selector-proof-foldkit-handle-path-amendment.md | `fc51f43eab545cab76c85d1c9abbfc03baf8c261c4fc3f2dea905fe4dfed28d6` |
| selector-proof-recording-number-amendment.md | `2037b92b055d7958e0f26f666ef05b9afc63c3b8822b9a39e4eb443b6da83c65` |
| selector-proof-payload-and-promotion-primary-approval.md | `19d2d5c97d13662094039209b4154db4d32b297c3e4b93d423c92e94105e31c6` |
| selector-proof-recording-number-primary-approval.md | `25ae00adf0da6782a62f56d8d904ed3ffe5d7849f7524247edb9bd91ca7ca3d7` |
| selector-proof-foldkit-handle-path-independent-review.md | `a21be91395329ba33fc7a721fad110e9d0e64020f3cf60752f69995bd58950d3` |
| selector-proof-recording-number-independent-review.md | `5078e2b1e41eb7fdcf779fb4b62fbec0e13bb7e4c455adf342ff6c363420f2ce` |

The existing original095 plan and approved lifecycle resumption/contextual-toolbar packet continue to govern ownership, original body retention, genuine reference/installed/native proofs and eventual review. This successor authorizes no change to their broader production scope.

## Findings confirmed against actual source

All relative source locations in this document identify W's frozen source unless expressly called main or installed dependency. Line numbers describe the STOP source, not a future edited file.

| Finding | Impact | Effort / risk / confidence | Evidence |
| --- | --- | --- | --- |
| Introduced broad recorder inputs and primitive probing violate the installed rules | Current quality gate exits1; a formatter cannot repair the contract | M / MED, recording can erase distinctions / HIGH | `research/harnesses/selector-lifecycle/fixture-schema.ts:92,101,104,131,152,156`; `apps/foldkit/e2e/test-harness.ts:370`; exact raw quality log |
| Introduced recursive declarations violate class and forward-reference rules | Two classes in one file and local forward value references block quality | S / MED, lazy schema initialization / HIGH | `fixture-schema.ts:74-90`, two `S.Class` declarations and `suspend` references |
| Introduced unsupported object handling silently records empty objects | `Date`, `Map`, `Set` and ordinary class instances can become `{tag:'object',entries:[]}` and falsely look like supported evidence | S / MED, reject only at evidence boundary / HIGH | `fixture-schema.ts:110-125` checks object/symbols but no prototype or callable exclusion |
| Introduced Vue fixture expressions fail actual native tsc | Target string is not branded `NodeId`; optional hook argument is indexed before excluding undefined | S / LOW / HIGH | `apps/vue/src/test-harness.ts:714,1577`; `E/recording-complete-first-types.log` |
| Introduced formatting and mechanical quality issues obscure required sequential behavior | Blindly applying suggested parallelization would change query/frame/lifecycle order | S / MED / HIGH | All ten files in raw quality log; Foldkit handle frame/setup/query loops `handle-connections.e2e.ts:334-438` |

`docs/standards.md:9-12` requires Schema contracts and decoding once at external boundaries; `docs/standards.md:15-17` separates evidence, required verification and intentional differences. Main and W pin `effect` and platform packages to `4.0.0-rc.116` in `package.json`. Do not update them or the lockfile.

Current encoder excerpts, retained here to make the drift check concrete:

```ts
// W/research/harnesses/selector-lifecycle/fixture-schema.ts:92
const dataProperty = (value: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  // rejects missing/accessor descriptor; returns descriptor.value as unknown
}
// :101, :131
const encodeNativeValue = (
  value: unknown,
  ancestors: Set<object>
): NativeEvidenceValue => {
  /* typeof branches */
}
export const encodeNativeEvidenceValue = (
  value: unknown
): typeof NativeEvidenceValueSchema.Type => encodeNativeValue(value, new Set())
```

The actual descriptor helper does not call property getters. Preserve that property. Fixing the broad contract by decoding `S.Record` or `S.Array` directly from caller data would lose holes or evaluate accessors and is forbidden.

## Exact successor source scope

Only these ten existing paths from `STOP.deltaFromImmutableProofFreeze`, plus the two named additions, may change. Existing original095 source outside this list stays exactly at its STOP bytes for this successor.

| Path | STOP SHA256 | Permitted correction |
| --- | --- | --- |
| apps/foldkit/e2e/handle-connections.e2e.ts | `a8f946d49d01acdb684239b2b11eb5860f9cd48490142e109d935a21c83a8089` | New full-edge proof quality, sequential frame/query/setup mechanics and source decode calls |
| apps/foldkit/e2e/public-state.e2e.ts | `274c711a925ca5a9f5ffbac3460b591a3daddfd29541acedd88b92447266ab13` | Additive receipt/assertion/attachment quality and decode calls |
| apps/foldkit/e2e/test-harness.ts | `827ef09b9eacbed246acf2fbdd6847bdb659d7de3d9519662b08e383ac2d5010` | New recorder callers derive native payload types and decode at delivery/checkpoint boundaries |
| apps/vanilla/e2e/handle-connections.e2e.ts | `2a6db4eb18e3f028f5249bb82ac17a87c6b0765e62ea158ce152662106108a88` | New recording/import/attachment quality and decode calls |
| apps/vanilla/e2e/public-state.e2e.ts | `75bf3e5c00b1ecdd480625fa981d07ceef7f0d3acf387ff5a1ed25862d4011c6` | New recording/import/attachment quality and decode calls |
| apps/vue/e2e/public-state.e2e.ts | `cbfba585e342a4e97ede17727204a89cdc4e3f5864cd6b7911a73578fb96aa5a` | New full-receipt assertion/attachment quality and decode calls |
| apps/vue/src/test-harness.ts | `8ebfb42ea08952d9641c9865861a4f2f1054bb3478602fefafce96654791ce81` | Two exact type corrections and new recorder/checkpoint boundary decode |
| packages/conformance/src/selector-lifecycle-reference.test.ts | `91bfaf6c6c5576faba1a88a61d5975d976570b435d35f4104a6ff4e75b911005` | Independent transport controls and mechanical quality; genuine fixture case unchanged |
| research/harnesses/selector-lifecycle/fixture-schema.ts | `d16ffe9c3661bb4f4758fc3829d5293dc22a28ce82e8fe64800bd785a0622dd1` | Authoritative source domain, typed descriptor traversal, receipt/recorder contracts and recursive schema aggregation |
| scripts/capture-selector-lifecycle-reference.ts | `3bdca2f8e12fd1698100e2893be805403bd7cc495f6e6a6b1cd5d555b5174d63` | Formatting of amendment and add exact helper dependency hashes to owned capture closure |
| research/harnesses/selector-lifecycle/native-evidence-array.schema.ts | ABSENT, create only after approval | Factory containing exactly one honest Schema class for tagged ordered array values |
| research/harnesses/selector-lifecycle/native-evidence-object.schema.ts | ABSENT, create only after approval | Factory containing exactly one honest Schema class for tagged ordered object entries |

The two additions belong in the existing test-only research harness, because they own the recursive attachment representation, not graph meaning or public callback types. Splitting those two classes satisfies the existing one-class rule without a waiver. Preserve existing fixture-schema export names, including re-exporting the class names if moved. No new package export.

Protected scope includes all production files, `packages/core`, reusable Vue/Foldkit implementations, Vanilla host implementations, Model, persistence, snapshot client and its tests, installed consumers/archive runner, package/compiler/lint/formatter/verification config, lockfile, docs, traces, ledger, catalog, imported `research/artifacts`, React TSX harness, pins, ports and fixtures. Do not write `research/fixtures/selector-lifecycle-reference.json` during this LOCAL successor. `verification.config.json` and the original future focused scope remain untouched until the shared phase is explicitly released. Main index belongs to the coordinator.

All fourteen `STOP.protectedMatched` paths remain hash-identical, including seven versioned-persistence fixtures/tests/helper, `bun.lock`, `package.json`, both snapshot-client files, `plans/057-member-closure.json`, `research/catalogs/api-members.json`, and `research/traces/complete-versioned-persistence.md`. All other paths outside the twelve-file successor allowlist are protected by the complete1516source manifest, not only this highlighted list.

Preserve original historical test bodies, native fixture inputs, shortened histories, assertion order, gesture coordinates, polling/readiness, installed bodies and production bytes. Formatting may alter trivia only in original bodies. New amendment bodies may be corrected as specified, with exact before/after diff evidence. Do not delete an inconvenient assertion, downgrade full-value checks, change the original genuine test to skip/todo, or add a fake fixture.

## Authoritative source domain and descriptor traversal

Define the source contract in the existing `fixture-schema.ts`, before any encoder helpers that use it. It is deliberately shallow at each container: it validates its prototype and own descriptor metadata while preserving the exact source reference. Child values cross their descriptor boundary and decode recursively. No raw payload is read via `value[key]`, spread, `Object.values`, raw JSON serialization, or a raw `S.Record`/`S.Array` parser.

RC116 facts personally inspected:

- Installed `node_modules/effect/src/Schema.ts:3102-3110` defines `ObjectKeyword` as `object` and explicitly accepts functions. A prototype-only check is insufficient: a callable can have its prototype set to null.
- `SchemaAST.ts:1250-1251` uses `Predicate.isObjectKeyword`; `SchemaAST.ts:4689-4696` returns `InternalParser.sameExit` after the refinement. Thus this base does not enumerate or clone caller properties.
- `Schema.ts:6455-6459` declares `makeFilter` with a contextually typed input and `FilterOutput`; `.check` does not change the source Type. Use `S.ObjectKeyword.check(S.makeFilter(...))` so the filter callback has its actual schema-owned inferred input, not an explicit unknown/object parameter.
- `Predicate.ts:927-928` exports the official `Predicate.isFunction` guard. Call it in this input filter to reject callable values before prototype checks. Do not implement a local `typeof` replacement or a pretend generic contract.
- `Schema.ts:1811-1814` returns a decoder `(input: unknown) => S['Type']`; `SchemaParser.ts:138-139` returns a real schema type guard. Use these library boundary functions directly, and use `S.is(S.Boolean)`, `S.is(S.String)` and `S.is(S.Finite)` to narrow already decoded scalar variants.
- Local anti-slop `no-object-parameters.ts` resolves explicit broad object aliases; `no-unknown-returns.ts` resolves unknown return aliases; `no-unknown-type-aliases.ts` rejects aliases that conceal unknown. A real source Schema-derived type is justified by runtime prototype/descriptor checks, not by evading these syntax checks.

Required source shape, pseudocode rather than a tested implementation:

```ts
const NativeSourceContainerSchema = S.ObjectKeyword.check(
  S.makeFilter((container) => {
    // official Predicate.isFunction(container) => explicit filter failure
    // Capture own names, symbols and DATA descriptors before child parsing.
    // Accept ordinary arrays and Object.prototype/null-prototype objects only.
    // Ordinary array prototype is Array.prototype; reject array subclasses.
    // Reject all own symbols and all own accessor descriptors, including
    // nonenumerable accessors and indexed accessors. Never invoke a getter.
    // Array length is read from its captured own data descriptor and decoded.
    // Reject every own array name other than length or canonical index < length.
    // Return an explicit failure string or undefined for success.
  })
)
const NativeSourceValueSchema = S.Union([
  S.Undefined,
  S.Null,
  S.Boolean,
  S.Finite,
  S.String,
  NativeSourceContainerSchema,
])
type NativeSourceValue = typeof NativeSourceValueSchema.Type
type NativeSourceContainer = typeof NativeSourceContainerSchema.Type
const decodeNativeEvidenceSource = S.decodeUnknownSync(NativeSourceValueSchema)
```

Export the source schema and the generated decoder where the typed host/test boundaries need them. No function authored in this successor accepts or returns explicit `unknown` or `object`; no unknown alias, generic input escape, handwritten recursive interface, assertion function, `as`, null cast, suppression, or lint/config change. A local raw variable may remain explicitly `unknown` between `PropertyDescriptor.value` and immediate decode. `PropertyDescriptor` is the platform's descriptor contract, not a payload type. Do not return its raw value to an encoder caller.

The filter must distinguish all unsupported categories explicitly through the Schema failure path. Date/Map/Set/class instances, callable values including null-prototype functions, symbols, bigint, nonfinite numbers, own symbols, accessors and extra array properties cannot encode as an empty object or disappear. Reject nested unsupported children at their real descriptor boundary as well. This policy belongs only to test evidence; it does not change what the graph accepts.

Use noncapturing Unicode regex `/^(?:0|[1-9]\d*)$/u` for canonical decimal names, followed by numerical range < captured length. Reject `01`, `-1`, `1.0`, extra string names and the maximum non-index name rather than silently omitting them. A genuine array hole is an absent own indexed descriptor, not `undefined`. Ordinary object ordering follows captured `Object.getOwnPropertyNames` order. Keep nonenumerable data keys, own undefined, null and all string keys including tag/value/entries and `__proto__` as entries. Do not sort, normalize or merge them into envelopes.

The encoder accepts `NativeSourceValue`, returns the recursive output Schema Type, and uses `Set<NativeSourceContainer>` for active ancestors. Decode each captured descriptor.value immediately, then synchronously recurse. Capture the full own descriptor set before beginning child traversal; retain source reference identities in the ancestor set, and delete the current container in `finally`. This permits repeated non-cyclic references to appear twice while rejecting an actual back-edge. No await/yield, source clone, or asynchronous validation occurs between callback delivery and detached envelope creation.

At runtime, check undefined/null directly. Use official Schema guards to narrow booleans/strings/finite numbers. Encode `Object.is(value,-0)` as `{tag:'negative-zero'}`; finite positive zero remains `{tag:'number',value:0}`. The remaining decoded branch must narrow to the validated container without a cast. If TS cannot establish this using the actual guards, STOP with the exact diagnostic; do not annotate it into submission. Constructor/output validation may inspect the newly created envelope, never the caller's raw object.

This design guarantees no evaluation of ordinary caller property getters. JavaScript proxies can execute metadata traps and cannot be universally identified by this contract; arbitrary proxy serialization is not claimed. If real native DTOs violate the ordinary data-container boundary, preserve the actual input category and fail evidence collection. Do not introduce new proxy/class support, change graph policy, or skip the observation.

## Recursive output schemas without forward local values or runtime import cycles

Preserve the protocol exactly: literal tags undefined/null/hole/negative-zero; boolean/number/string with value; array with ordered values; object with ordered `[string, encodedValue]` entries. Preserve `NativeCallbackReceiptSchema` owner, observer, generation, kind, deliveryIndex and encodedValues; preserve `NativeCheckpointSchema` owner, phase, records and observation.

The installed Ultracite preset also enables `import/no-cycle` at `node_modules/ultracite/config/oxlint/core/index.mjs:260`. A two-module class split that imports the aggregate at runtime is therefore rejected as a design alternative even when lazy ESM evaluation would work. The actual installed Oxlint configuration schema `node_modules/oxlint/configuration_schema.json:13986-14005` defines `ignoreTypes` default true for this rule; the preset sets only error severity and W has no override. The [official Oxlint rule documentation](https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle.html) independently describes this default. Do not change that default or disable the rule.

Use two factory modules instead. Each imports `Schema` at runtime and imports ONLY the aggregate `NativeEvidenceValue` Type from fixture-schema. It exports a factory taking `getChildSchema: () => S.Codec<NativeEvidenceValue>`. Inside that factory declare exactly one honest Schema Class, then return its constructor. The array fields retain `tag: S.Literal('array')` and `values: S.Array(S.suspend(getChildSchema))`; the object fields retain `tag: S.Literal('object')` and `entries: S.Array(S.Tuple([S.String,S.suspend(getChildSchema)]))`. Class fields are still Schema-derived. No runtime aggregator import, mutable slot, initial placeholder, null cast or hand-authored recursive interface.

The existing fixture module owns the scalar Schema and the aggregate. The following is the intended declaration order and precise proposed recursive typing:

```ts
import { createNativeEvidenceArraySchema } from './native-evidence-array.schema.ts'
import { createNativeEvidenceObjectSchema } from './native-evidence-object.schema.ts'

// scalar Schema retained before this type and aggregate
export type NativeEvidenceValue =
  | typeof NativeEvidencePrimitiveSchema.Type
  | InstanceType<ReturnType<typeof createNativeEvidenceArraySchema>>
  | InstanceType<ReturnType<typeof createNativeEvidenceObjectSchema>>

function buildNativeEvidenceValueSchema(): S.Codec<NativeEvidenceValue> {
  const array = createNativeEvidenceArraySchema(buildNativeEvidenceValueSchema)
  const object = createNativeEvidenceObjectSchema(
    buildNativeEvidenceValueSchema
  )
  return S.Union([NativeEvidencePrimitiveSchema, array, object])
}
export const NativeEvidenceValueSchema: S.Codec<NativeEvidenceValue> =
  S.suspend(buildNativeEvidenceValueSchema)

// Preserve the existing test-only constructor exports for encoder use.
// These calls create schemas, not values, and do not force their child thunk.
export const NativeEvidenceArray = createNativeEvidenceArraySchema(
  buildNativeEvidenceValueSchema
)
export const NativeEvidenceObject = createNativeEvidenceObjectSchema(
  buildNativeEvidenceValueSchema
)
```

Inside each factory, use a local class name such as `NativeArrayEnvelope` or `NativeObjectEnvelope`, distinct from the exported constructor binding names, to avoid shadowing. Its `S.Class<Self>` parameter is the actual local class. Derive exported constructor-instance Types with `InstanceType` if needed; do not independently redeclare their recursive fields. Each file contains one class. The factory parameter is a real deferred schema capability; it does not hide unknown in a generic. The root builder's return annotation is the exact aggregate `S.Codec<NativeEvidenceValue>`, not a broad `S.Constraint` that loses Type evidence.

Runtime imports are acyclic: fixture-schema imports both factories, and factories import only Effect. Their type-only edges point to the authoritative derived aggregate and are omitted by the installed no-cycle default. This is not a runtime cycle waiver. All imports precede use; the builder function is defined before the aggregate/constructor bindings. The builder recursively passes itself, so it never refers to a later aggregate const. Runtime constraints are mandatory: no eager child-thunk call, decode, `.make`, class value construction or guard execution at module initialization. Do not add a mutable holder to memoize or link a schema.

The source supports deferred construction and parsing, but this exact factory return inference has not been compiled or linted in this design turn. RC116 `Schema.ts:4932-4933` wraps the thunk in `SchemaAST.Suspend`; `SchemaAST.ts:3898-3910` caches its resolution lazily, and `:3913-3915` compiles its parser only when called with input. The root builder creates one schema pair when its root Suspend is forced; each child Suspend creates a next pair only when that finite child is actually parsed. It does not construct an infinite schema tree eagerly. `Schema.ts:13761,13783-13786` makes class schema access lazy; `Schema.ts:13902` collects Struct sentinels, and `SchemaAST.ts:3353-3365` inspects immediate field literals without descending into child arrays. Each factory uses the same existing class identifier string at every recursive level. The RC's `Schema.ts:13878-13880` recognizes these generated schema-class values through the stable class identifier marker as well as constructor identity. Retain those exact existing identifiers and tagged fields. This is a bounded test representation, not a general recursive-schema generator.

Required feasibility checks after authorized implementation: real native tsc/build, exact existing quality rules including no-cycle, and actual unit import/encode/JSON/decode through the aggregate. Import both factories directly in the independent unit file, create honest schemas with the authoritative builder capability where needed, and exercise nested array/object transport through the aggregate and existing exported constructors. The precise unresolved feasibility boundary is TypeScript's inference of the local Schema Class factory return through the derived aggregate `InstanceType<ReturnType<...>>` recursion. If TS reports circular aliases, inferred-any return/base errors or loss of exact recursive Type, STOP with that diagnostic. Do not replace the derived type with an interface, widen to unknown or introduce a mutable holder. A different acyclic recursive Schema design would need a separate bounded design revision; changing the literal wire tags is not permitted. No compile-green promise follows source inspection.

Add the two helper paths to `ownedSourcePaths` in `scripts/capture-selector-lifecycle-reference.ts:159-165`, because reference fixture-schema now imports them. Both pre-capture and post-cleanup owned source inventories must cover this transitive source closure. No pinned file or upstream hash changes.

## Recorder callers and actual host contracts

Change `encodeNativeEvidenceValue`, recorder.record and recorder.checkpoint to accept the authoritative decoded source Type. Invoke the generated decoder at each raw callback/checkpoint/expected-fixture boundary before the recorder/encoder. Likewise the descriptor reader returns decoded `NativeSourceValue`, never unknown. Calling the library decoder is the actual boundary; calling a generic helper which assumes raw input is already parsed is not.

Each native callback retains its actual public payload type. Vanilla and Foldkit node callbacks deliver `readonly FlowNodeConnection[]`; their handle callbacks deliver `readonly FlowEdge[]`. Vue's node and handle hooks deliver `readonly FlowNodeConnection[]`. Evidence: W `apps/vanilla/src/mount-flow.ts:927-952`; `packages/foldkit/src/observers.ts:94-122`; `packages/vue/src/use-flow.ts:345-365`. Foldkit `observers.ts:433-456` uses node selection directly and handle selection as full edges; do not derive handle evidence from the internal node projection.

In `apps/foldkit/e2e/test-harness.ts:370`, replace `values:unknown` with a union of the actual node and handle public callback parameter Types derived through `Parameters` and `NonNullable`. This union describes two real payload contracts, not arbitrary data. Decode it at the actual `onConnect`/`onDisconnect` boundary before recording; keep its full values. The existing native owner at `test-harness.ts:1473-1524` is constructed from the real Runtime acceptedStates/connectionPreviews ports and a decoded initial snapshot. Preserve that owner, snapshot client, Runtime and actual unsubscribe/disposal paths. Do not compose another test Runtime.

Recorder ordering remains synchronous: full decode and detached encode, receipt construction, append once, then the existing shortened projection. If encoding fails, throw/retain the actual failure and no receipt/index increment; complete expected callback assertions must reveal missing evidence. Do not manufacture a receipt with empty values or catch-and-continue. One owner's index starts0 and increments only on actual callbacks across its node/handle records; checkpoints, proposals, screenshots, query replacements and silence do not increment it. Stable old/new functions close over generation identity. Never relabel stored history.

Fix only these exact Vue type expressions:

```ts
// test-harness.ts:1577: exclude optional argument BEFORE indexing onConnect
type NodeValues = Parameters<
  NonNullable<
    NonNullable<Parameters<typeof useNodeConnections>[0]>['onConnect']
  >
>[0]
```

At `test-harness.ts:710-714`, read the real accepted snapshot once, find its accepted node with id `target`, and use that node's existing branded id in `flow.updateEdge(edge.id,{target:targetNode.id})`. Fail explicitly if the required accepted node or edge is missing. The fixture's input is unchanged. Alternatively the authoritative public `NodeIdSchema` exported from `@flow/core` may decode the literal at this fixture boundary; prefer the actual accepted target node. `packages/core/src/domain/flow-values.ts:3-5` is the authoritative branded Schema. No cast, public API widening, private state setter or unrelated fixture repair.

## Preserve every sequential native phase

The following sequences are original obligations, not authorization to execute native tests during LOCAL repair. Full snapshots/preview/receipt attachments remain required and currently unrun.

- Vanilla node owner: initial active/idle silence; trusted connect target; trusted reconnect next gives old disconnect(target), old connect(next), with the original three shortened assertions at their original checkpoint. Replace callbacks silently; query missing then source silently on the same subscription, settling each. Real public first.update changes the existing accepted edge next→target, preserving ID/handles; actual accepted readiness precedes new disconnect(next), new connect(target). Idle owner stays silent. Original drag/wheel/selection, actual disposal, six frames and late input remain. Source `public-state.e2e.ts:1712-1744,1815-1836`.
- Vanilla handle: preserve all original absent/null/empty/named/direction filter assertions. Capture the actual accepted source-b full edge before removal. Existing real query and callback replacement stays silent, then real removal delivers new/disconnect with that full edge. Actual unsubscribe, late public update and six-frame disposal stay quiet. Source `handle-connections.e2e.ts:103-173,191-204`.
- Foldkit node: actual uncontrolled and controlled Runtime owners; trusted connect/reconnect; original length3 checkpoint; missing query then callback replacement in the existing order, both silent; restore source silently; real replacePublicDocument retains edge ID/handles and changes next→target; requestSnapshot/accepted readiness before new disconnect(next), new connect(target). Original idle/selector/viewport/accepted state and snapshot-client disposal remain. Source `public-state.e2e.ts:1539-1571`; fixture `test-harness.ts:2111-2158`.
- Foldkit handle: the separate actual observeHandleConnections case remains separate from the original accepted-handle-filtered node test. Setup both real Runtime documents and accepted snapshots sequentially; attach out-a old subscriptions; missing then out-a query silence on each. Uncontrolled accepted matching+other edge yields old/connect matching full accepted edge. Replace callbacks silently; missing→out-a resets silently; remove matching yields new/disconnect previous full edge; restore yields new/connect actual accepted full edge. Actual controlled requestPublicEdit gives proposal while accepted remains empty and callback history unchanged; external real replacePublicDocument accepts matching and only then new/connect occurs. Unsubscribe uncontrolled, accepted late update stays silent; dispose controlled observer owner, accepted late update stays silent; dispose both original snapshot-client/Runtime handles; six frames and late trusted input keep both histories unchanged. Source `handle-connections.e2e.ts:391-487` and approved handle amendment.
- Vue node: actual mounted scoped Probe uses getters reading native query/generation refs and stable generation functions. Controlled connect proposal/refusal has no accepted callback; actual parent acknowledgeSelectorProposal delivers old/connect. Selection ACK does not change connections. Controlled reconnect refusal retains target/history; actual ACK delivers old disconnect(target), old connect(next). Replace generation silently; missing then source query resets silently. Actual public updateEdge next→target creates a controlled proposal; accepted remains next and callbacks unchanged until actual parent ACK. Then new disconnect(next), new connect(target). Original drag/wheel/selection, plain-string/live readonly-ref context tests, both scope disposal, six frames and late input remain. Source `public-state.e2e.ts:613-735`; `test-harness.ts:1574-1585`; actual hook `packages/vue/src/use-flow.ts:987-1057`.

Quality repair must not parallelize any of these stateful sequences. Handle fixture loops currently flagged by `no-await-in-loop` are ordered experimental steps. Spell the bounded two-owner/two-query setup as straight awaited statements or use Effect.gen with `yield* Effect.promise` for a genuine ordered iteration. No `Promise.all` for frame ticks, owner lifecycle, query replacement, callbacks, documents, ACKs or capture invocations. Concurrent independent read-only attachments can use Promise.all without changing native actions or phase placement. Replacing `(await checkpoint(...)).records` with `const observed = await checkpoint(...); expect(observed.records)...` must retain each exact call's position; do not hoist reads across a native transition.

Use the existing real six-frame callback pattern already in `capture-selector-lifecycle-reference.ts:278-295`: `Promise.withResolvers<undefined>()`, callback increments count and schedules next requestAnimationFrame until six, resolves once, then await its promise. This removes the new Promise constructor and await-in-loop without making six requests concurrently. A helper wrapping it remains test-only; preserve the sixth actual frame boundary and late input checks.

## Exhaustive quality correction ledger

`E/recording-complete-first-quality.log` is273lines/44993bytes, SHA256 `01b235984499ac416184b7d08332f681046aeb14abcfe35fe6baaeccbd89fe85`. It reports formatting in all ten files and the following categories. Each must be resolved with source changes inside the allowlist, not by waiving policy.

| Category | Actual count | Required correction |
| --- | --: | --- |
| max-classes-per-file / no-use-before-define | 1 /2 | Two one-class factory modules, builder declared before uses and deferred recursive getter parameter; preserve installed import/no-cycle policy |
| no-object-parameters / no-unknown-returns / no-unknown-parameters / no-runtime-typeof | 1 /1 /6 /5 | Authoritative Schema-derived source, immediate descriptor/callback decode, actual native callback types, official guards |
| prefer-type-error | 2 | Explicit TypeError at encoder structural failure where applicable; keep generated genuine Schema failures at decode boundary |
| prefer-named-capture-group / require-unicode-regexp | 1 /3 | Noncapturing canonical-index group, Unicode flag on every introduced assertion/validation regex |
| prefer-number-properties | 1 | `Number.NaN` and finite controls; retain both infinities |
| consistent-function-scoping | 1 | Module-scope transport helper with decoded source input |
| prefer-structured-clone | 2 | Test actual JSON transport using separate serialized text and parsed unknown variables, followed by Schema decode; never replace this transport proof with structuredClone |
| no-new-array | 1 | Create actual hole without new Array: a schema-derived source-value array with length assigned2 and index1 assigned undefined, then assert own index0 absence before encode |
| no-known-value-widening | 1 | Construct real cycle via schema-derived source-value array `cycle.push(cycle)`; avoid the handwritten optional-object cycle type |
| padding-around-test-blocks / require-readable-spacing | 5 /159 | Required blank lines and scoped formatting; original body token identity unchanged |
| import/no-duplicates / no-duplicate-imports | 3 /3 | Merge duplicate @playwright/test type imports into one top-level import type and retain one runtime import; match existing import/consistent-type-specifier-style preference for top-level type imports |
| consistent-type-imports | 2 | Module-level `import type * as EvidenceModule` for typed dynamic module variables; preserve actual dynamic runtime import path |
| no-shadow | 10 | Rename newly introduced destructured parameters to callbackOwner/phaseName/queryHandleId, preserving values and boundary order |
| no-unused-vars | 3 | Avoid dropping encodedValues just to omit it; explicitly project receipt identity fields for identity assertions and retain separate full-value comparison |
| no-await-expression-member | 31 | Await into locals at the same checkpoint, then inspect member |
| no-await-in-loop | 10 | Straight bounded sequential statements or actual Effect sequential workflow; independent attachment writes may be parallel |
| promise/avoid-new / no-useless-undefined | 1 /1 | Existing withResolvers plus recursive frame callback; resolve without explicit undefined |

Do not run repository-wide autofix. After execution is authorized, target formatting to these twelve paths only. Re-check complete quality afterwards. If JSON transport's separated statements still trigger the rule, preserve the diagnostic and STOP rather than adding a suppression or replacing JSON with clone. If a helper needs new paths beyond the two specified or a structural rule cannot be met, STOP for a bounded design revision.

## Meaningful independent tests

Keep the original genuine fixture-dependent describe/test at `selector-lifecycle-reference.test.ts:8-46` unchanged and unskipped. It is required, fixture is currently absent, and its status is **UNRUN_REFERENCE_ACQUISITION_WITHHELD**. A local name filter for the independent transport describe is an explicitly scoped run, not a replacement fixture or full unit acceptance.

Transport helper must accept the actual decoded source Type, synchronously encode, assign JSON.stringify result to a text variable, assign JSON.parse result to a local unknown, then decode through NativeEvidenceValueSchema. Call decodeNativeEvidenceSource at every test input boundary. Tests assert explicit expected envelopes, own-property distinctions and actual errors rather than comparing two calls to the same implementation alone.

Required controls, each with visible independent assertions:

1. Actual absent/own undefined/null/empty/named handle values yield distinct ordered entries after JSON transport and Schema decode. Include nested own undefined and nonenumerable data key retention, null-prototype object acceptance and exact object order.
2. Collision objects with own tag/value/entries keys, including `__proto__` via a data descriptor, remain ordinary entries; caller names never overwrite tags.
3. A real two-slot array has absent index0 and own undefined index1 before encode, then hole/undefined envelopes after transport. Include nested arrays/objects and repeated shared non-cyclic source references. Direct helper-module imports plus aggregate use expose initialization problems.
4. Finite values include negative0, positive0, an ordinary positive and negative finite number. Distinct negative-zero vs number/value0 survives JSON; reconstruct signs in the test and assert Object.is. NaN/±Infinity fail both at root input decode and as actual nested descriptor values. Do not claim production numeric policy changed.
5. Date, Map, Set, an actual ordinary class instance, regular function, null-prototype function, bigint and symbol root fail. Nested instances also fail rather than becoming empty envelopes. Declare exactly one test-only ordinary rejection class in this file, reusing its instances for root/nested controls. Test the array prototype boundary with an actual array whose prototype is deliberately set to a fresh object inheriting Array.prototype, proving Array.isArray remains true while encoding rejects it. This tests the same unsupported derived-array prototype boundary without a second class or an implicit new file.
6. Object getter and nonenumerable getter, indexed getter, own symbol, decorated extra array key and invalid canonical index own names fail. Getter counters remain exactly0. Inspect data descriptors before encode as independent controls. No test may call the getter itself to form expected values.
7. An actual source cycle and nested back-edge fail; a repeated non-cyclic alias succeeds with two explicit expected children. Use a Schema-derived array type for cyclic construction; no optional handwritten object shape or casts.
8. Recorder capture is detached synchronously before a later source mutation. Assert explicit original encoded values remain, silent checkpoint adds no record/index, real node old/connect followed by handle new/disconnect yields indexes0/1, failed unsupported callback adds no record/index, and next successful callback has index2. Check actual full receipts after JSON decode. Preserve the existing separate detachment test and strengthen its expected value assertions, not just transport-to-transport comparison.

Unsupported tests must exercise actual root decoder rejection and actual recursive descriptor rejection separately. A test calling only a typed encoder with a fabricated already-valid value is insufficient boundary proof. The fifth recorder test was authored after the earlier four-test pass and remains unrun at STOP. New rejection tests, classes/prototype controls and recursive split acceptance have not run.

## Capture and publication obligations retained

Do not execute reference capture in this LOCAL successor. Current `capture-selector-lifecycle-reference.ts:458-480` writes the external fixture, stages it, validates tracked pin/source, closes browser/page and owned server, preserves stdout/stderr; `:482-486` promotes only after final post-cleanup tracked/source validation. Retain this sequencing byte-for-byte except formatting and the exact two dependency paths in ownedSourcePaths. No finally-block promotion. Any preceding failure preserves previous candidate fixture bytes or absence. Final candidate write remains conditional on successful enclosing cleanup.

Reference source observes real browser/public hooks. `capture-selector-lifecycle-reference.ts:315-336` saves complete raw JSON before Schema parsing and screenshot; `:350-407` runs the actual sequential phases; `:415-429` compares two fresh internal mounts. Original required acquisition is **two separate actual CLI invocations into separate fresh outside directories**; the two internal mounts are additional repeatability, not a substitute. All697tracked pin hashes, status and complete owned capture-source hashes must revalidate before promotion. Own strict-port listener identity and cleanup are mandatory; preserve external failed observations.

The future exact CLI form is `bun run scripts/capture-selector-lifecycle-reference.ts --checkout ABS_OWNED_PIN --evidence ABS_FRESH_EVIDENCE`. Pin is `0a1f9575b25679f2880175de8d3eae21aedde921`, owned strict port4197. Root native `bun run typecheck` excludes the React `.tsx` file: actual real React/system declarations and JSX compilation remain **UNRUN**, requiring their existing separately reviewed compiler/acquisition specification. Do not install, cast peers, stub declarations, change a pin/port, suppress errors or call Vite transpilation compiler proof.

Reference raw event strings stay byte-identical and retain their disclosed plain-JSON limitations for own undefined and signed zero. Tagged native records do not establish reference optional-presence/sign parity. Actual native/reference comparison, archives, collector/native-device/CI and member closure remain unverified.

## Ordered local execution after separate release

These are future executor steps, not commands run by this advisor. Use same095 and the same W. No new worktree, Git commit/merge/push/PR or archive operation.

1. Verify HEAD, all packet hashes and STOP hash. Run main's rerunnable integrity checker against all three frozen corpora before creating any new evidence. Expected exit0,1516/1516/11086 checked with zero mismatches. Preserve a newly named complete pre-repair snapshot outside W and E's immutable trees, such as sibling `selector095-pre-schema-repair`, failing if it already exists. Preserve all source and all old evidence bytes and manifests, not just the twelve paths. No source amendment starts until this succeeds.
2. Add the source schema/typed traversal and two honest recursive modules, adjust all new recorder/test callers at actual boundaries, and add owned capture dependency closure. Apply the exact two Vue type repairs. Preserve all original obligations and inputs. Run native types/build and independent transport checks. If the actual declarations cannot express this design without casts/waivers, STOP rather than continue mechanic work.
3. Resolve every listed mechanical quality category within the twelve paths, keeping sequential semantics and exact original body tokens. Run targeted formatter only on those paths, then complete quality and native typecheck. Do not modify lint/config or transform unrelated files.
4. Run architecture, scoped independent units, historical/installed retention and diff. Retention programs write old evidence paths today: copy those programs into a newly named successor evidence directory and change ONLY their output destination paths before invoking them. Record original helper hash and exact output-only changes. Do not rerun immutable programs so that they overwrite frozen receipts. Preserve the actual checks/allowances. Fresh receipts must show zero token mismatches and original installed statement order.
5. Freeze complete current source and complete new/old evidence, protected hashes, before/after twelve-file delta and commands/log hashes. Include added helper files in the new source count rather than asserting the old1516count remains. Independently rehash current source and snapshot copies. Retain STOP counts as historical inputs. Record exact local scope, all unrun shared/reference/compiler/archive checks and no acceptance/member promotion. Stop at LOCAL preparation.

Concrete pre-edit read-only integrity command from main:

```sh
python3 plans/check-frozen-inputs.py \
  --corpus 095-current /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow plans/selector-recording-stop-source-manifest.json 27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4 1516 \
  --corpus 095-copy /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence/recording-amendment-stop/source plans/selector-recording-stop-source-manifest.json 27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4 1516 \
  --corpus 095-evidence /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence plans/selector-recording-stop-evidence-manifest.json 4e684505cbaab9f1a4e4712cac609ebce967b0fc9e31ec94f9c67daae1c2fe71 11086
```

Commands run from W only after local resume; each requires actual exit0 and complete stdout/stderr/command/hash receipt with a fresh name. Existing `E/run-local.py` can be reused with a fresh result basename, never an existing basename.

| Purpose | Exact command / invocation | Required observation |
| --- | --- | --- |
| Native build/type | `bun run typecheck` | All package builds and actual root tsc0; React TSX/installed boundaries expressly unrun |
| Quality | `bun run check` | Complete Ultracite format/lint0, no rule/config waiver |
| Architecture | `bun run check:architecture` | Actual production architecture fixtures/check0; inspect helper import cycle separately because architecture scanner covers production src, not these research helpers |
| Independent recording units | `bun run test -- packages/conformance/src/selector-lifecycle-reference.test.ts -t 'native evidence transport'` | All current independent recording cases pass; exact count recorded; genuine named case unrun by filter, no source skip and no full-suite claim |
| Preserved scoped native units | `bun run test -- packages/foldkit/src/application.test.ts packages/foldkit/src/observers.test.ts packages/core/src/domain/flow.schema.test.ts` | Existing complete scoped tests pass, count from actual log |
| Historical token retention | Copy of `E/proof-source-preparation/audit-final-retained-proof-tokens.ts`, output destinations uniquely renamed | Original historical bodies and contextual-toolbar bodies zero token mismatches; original inputs/assertions unchanged |
| Installed token retention | Copy of `E/proof-source-preparation/audit-installed-retention.ts`, output destinations uniquely renamed | Six original installed fixture bodies and archive-runner functions/order unchanged; zero mismatches |
| Delta whitespace | `git diff --check` | Exit0; separate whole-source manifest delta proves only permitted path changes, including untracked files |

A full final source review must read the actual twelve-file source/diff and the meaningful new tests, not infer acceptance from these commands. Existing prior102scoped-unit passes and earlier four transport passes belong only to their earlier source identities.

## Withheld shared gates and completion boundary

091's sole lease remains in force. No verifier, browser/native suite, HMR, reference acquisition/server/install/listener, pin checkout/build, archive/consumer gate, React compiler preparation or cleanup is permitted by this LOCAL successor. No source/member acceptance follows a local pass.

After a separate shared release, original095 focused scope still requires checks docs/catalog/api-members/contracts/traces/consumer/build/vue-build/foldkit-build and public-state, handle-connections, interaction-lifecycle browser files in all three hosts. Save that active scope under the governing original plan, preview with `bun run verify --list`, then run `bun run verify` and record exact profile/scope/counts. Complete real native suites, three actual installed archives, two actual separate reference captures, real React declaration compilation, genuine fixture-dependent expanded units, root reproduction and fresh SOURCE review all remain obligations. `bun run verify:full` and release dry-run remain integration/release gates before any broad parity claim. No focused-only pass closes full-suite, parent, CI, device or collector acceptance.

## STOP conditions and maintenance

Stop immediately and preserve raw evidence if any frozen hash/count/HEAD/packet identity differs; original/historical/installed tokens or protected bytes drift; source correction requires a thirteenth path or any production/API/policy/compiler/dependency change; source schema calls a getter or erases source identity/hole/own undefined/sign; accepted real DTOs are outside the stated container domain; Date/Map/Set/classes/callables encode successfully; helper initialization forces a recursive binding before initialization; real guards fail to narrow types without a cast; quality needs a waiver or alias/generic concealment; any native phase would require a private setter/fake ACK/parallel stateful loop; promotion moves earlier or captures are substituted; a required unit fixture is skipped/faked; or shared work starts without lease release. Retain every failed attempt. No speculative retries across a structural STOP.

Future recording changes must preserve descriptor-only raw traversal, signed zero and ordered envelope entries. Review new native payload fields against the authoritative callbacks rather than writing a replacement DTO. Any extra helper dependency must enter owned source provenance. A new Schema or ESM initialization design needs its own bounded review if the two-file shape fails actual gates.

## Conformity and deviations

**Conforming by inspected design:** this successor retains full actual native node/handle contracts, synchronous detached delivery capture before abbreviated projection, literal collision-safe tags, own-property/hole/sign distinctions, complete provenance and cleanup-before-promotion, immutable failure evidence and required original tests. Installed RC116 declarations and actual candidate public contracts support the proposed shallow Schema boundary and lazy recursive module shape. No new runtime or source acceptance is claimed.

**Intentionally different:** native silent query baseline reset remains different from pinned React changed-query callbacks; Vue live readonly-ref context remains different from React keyed remount. Test-only evidence rejects unsupported classes, exotic containers and extra array properties instead of silently dropping them. This does not change production graph policy. Reference plain JSON retains disclosed optional-presence/signed-zero limitations.

**Unverified:** the proposed twelve-file implementation has not been authored, compiled, linted or tested; current STOP quality1/native types2 remain actual failures. Earlier four isolated transport tests passed at their earlier checkpoint; the added recorder test, new rejection controls and recursive split are unrun. All real native attachments/phase behavior, genuine acquisition/React compilation, two separate captures, failure-preserving promotion, archives, focused/full/root/SOURCE/parent/CI/device/collector acceptance and all513cells remain unverified. The test boundary for this successor is LOCAL independent recording and preserved native units only after approval/resume. Genuine fixture-dependent expanded units remain UNRUN_REFERENCE_ACQUISITION_WITHHELD.
