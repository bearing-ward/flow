# Typed Flow actor foundation design

Draft for independent architecture review, 2026-10-02. This packet proposes the bounded B2 foundation after accepted087. It authorizes no implementation itself. Plan089 is the corresponding execution handoff. No typed native host, general transition, saved-format migration or original069 member is accepted here.

## Revision history and review boundary

Revision1 responds only to the two findings in main `plans/typed-flow-actor-independent-design-review.md`, SHA256 `5244421e8efa62f424e6bf66712cd61b5b968be1290236a42a11d988fcfce444`, verdict REVISE. Original frozen design SHA256 `0e0f408e448a3886d8de4e07bfc564db7e01f78cd6fcce8649fa2c631623855a` and Plan089 `95d3320ee8a7680540b72a8a4a4004f17416eafc0b86c950176fc0ac54f9951a` remain the historical reviewed packet. This revision preserves the review file and all accepted source/frozen inputs. It changes only the two owned drafts, adding complete checkpoint finiteness and terminal gate-failure settlement; no source/probe/gate ran. The next cold decision must identify the new complete hashes.

## Decision and caller usage

Create one scoped, decoded graph owner in core. Expose separate Effectful reads, replacements, updates, encoding and observation. Preserve every existing concrete synchronous API and both existing saved-format paths. Caller Schemas determine the real node/edge union, encoded representation and services. Accepted087 already provides that factory and the shared generic integrity validator.

The writer performs short state capture, subscription registration and compare-and-swap acceptance operations. All caller code runs outside that writer: input capture, isolation, decoder, decoded checks, encoder, selector, updater, checkpoint bridge and observer. Preparation captures a finite revision, runs once, and attempts one acceptance. Conflict aborts that preparation and never automatically reruns user code. This refines the older codec design's queued-reentrant wording, which otherwise permits a callback to await the writer that is awaiting it.

Typical composition is `Effect.scoped(makeTypedFlow({ contract, initial, viewport }).pipe(Effect.flatMap(flow => callerWorkflow(flow))))`, with the caller's Layers supplied by application composition. A class-valued encoded representation adds the explicit `encodedInputCapture` option below. The default encoded route accepts plain JSON data. No global runtime or fallback service is supplied by core.

## Frozen evidence and source facts

Selected product input is exclusively `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, detached baseline `841be137e253cf19c665269eaaa79edc19abf3c3`, with accepted uncommitted assembly. External `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json` SHA256 is `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. This advisor rehashed all1492 candidate files and122 evidence files with zero mismatches. The freeze's pending-review label is historical; actual main primary/source approval supersedes it. HEAD or main alone is not the source input.

Main approval inputs, personally read, are:

| File | SHA256 |
| --- | --- |
| `plans/codec-boundary-design.md` | `cdf05648d7984e19f3907690f9c15b4ed4f127cdd9ec830e15df9120fd1399a3` |
| `plans/codec-boundary-primary-design-review.md` | `46acaf25398d7ff4d212003e86135687e025388ca534aea12d7539354992ede2` |
| `plans/069-support-schema-backed-data-extensions.md` | `09931848a276e80b48edc49ac5e9d921807d8d7e5e7b0e80948d86e7c0d264ae` |
| `plans/typed-factory-primary-design-review.md` | `25aa3a70ad458774895b4b06178e51d568f4b7191d7e0ca77e903b6706b8f0f2` |
| `plans/typed-factory-independent-design-review.md` | `5e3836d3b8561b0daad71b5e22f2d6924cc2bf9dbc68624092ffb0c0d2d04bf5` |
| `plans/typed-factory-primary-source-review.md` | `ca6f5eceb19463141c7015532f4acb44c7469aeca2b0bc468ec979be628c5960` |
| `plans/typed-factory-independent-source-review.md` | `c6c7b6214c68266dfb50cd345a3f03d0b4adce74ac91ee683eeb208564859b47` |
| `docs/standards.md` | `900c20dde3c23d173866db1853a8070cb9893bab7687ccb767e57aedb8bfd430` |

Installed versions read from the selected candidate's actual package files: Effect4.0.0-rc.116, Foldkit0.163.0 and TypeScript5.9.3. No dependency changes are proposed. Improve's full skill, audit-playbook Correctness / Bugs, Test Coverage and Finding format, plan template, architect, TypeScript/type-system and unslop guidance were applied. No source, gates, prototypes, ports or browsers were changed/run by this pass.

All source citations below refer to the selected087 candidate, except explicitly identified main planning records.

| Production or installed source | Personally inspected contract |
| --- | --- |
| `packages/core/src/public.ts:1-22` | Approved factory, geometry, node/edge extraction and typed failures are public; no actor exists. |
| `packages/core/src/domain/flow-data-contract.schema.ts:11-33` | Geometry retains document metadata; exact C retains Type, Encoded, RD and RE, with node/edge extraction from that C. |
| `flow-data-contract.schema.ts:35-66` in that directory | Five Schema-derived failure tags and decoded isolation RI are already accepted. |
| `packages/core/src/domain/flow-data-contract.ts:16-24,33-80` | Pure definition; builders reuse authoritative fields. Construction executes no codec/isolation. |
| `packages/core/src/domain/flow.schema.ts:64-86,115-147` | Current node/edge/document fields, brands, optional/default metadata and origins. No field changes in089. |
| `packages/core/src/domain/flow.schema.ts:360-379,429-452` | One ordered integrity traversal; generic physical-ID validator returns the exact D. No JsonObject redecoder or second traversal. |
| `packages/core/src/domain/flow-runtime.schema.ts:42-48` | Authoritative ViewportSchema has Number x/y and positive Finite zoom. Preserve it; refine only the new checkpoint viewport, retaining its exact Type. |
| `packages/core/src/domain/flow-snapshot.ts:31-56` | Concrete structuredClone/freeze snapshot cannot preserve arbitrary private classes. Leave it untouched. |
| `node_modules/effect/src/Schema.ts:1473-1482,1878-1887` | Effect parsers preserve independent decoding/encoding environments. |
| `node_modules/effect/src/Schema.ts:2468-2502` | toType retains C.Type and drops transforms/services; caller checks still run. |
| `node_modules/effect/src/Schema.ts:2999-3012,6455-6478`; `SchemaAST.ts:5056-5058,5132-5142` | Number accepts NaN/infinities while Json rejects them; makeFilter supports named nested failures without changing Type. |
| `node_modules/effect/src/Schema.ts:14925-14972` | toCodecJson returns a JSON codec with original declared services. Hooks may suspend/fail; undeclared hook services are unsupported. Encoding is no proof of isolation or lossless persistence. |
| `node_modules/effect/src/Queue.ts:449-469,612,646,1192-1210,1480` | Real queue constructors, offer boolean, take and shutdown. Shutdown clears queued messages; it does not settle our request Deferreds. |
| `node_modules/effect/src/Deferred.ts:172-187,499-527` | Typed completion plus await cleanup removes cancelled waiters; retained request registry still needs settlement. |
| `node_modules/effect/src/Effect.ts:11413,11793-11840,13054-13059,13238-13242,14737-14746,17430-17540` | Capture/provide Context; acquireRelease/addFinalizer; restore interruptibility; forkIn/forkScoped on real scopes. |
| `node_modules/effect/src/Scope.ts:240,456,567`; `Fiber.ts:379` | Real closeable scopes, finalizers, close and interrupt. Do not invent v3 queue/fiber APIs. |
| `node_modules/foldkit/dist/runtime/runtime.js:100-104,114-119,256-277` | Synchronous JSON preservation and restored Model path remain outside089. |
| `node_modules/foldkit/dist/runtime/hostConnector.js:8-26,39-61` | Synchronous inbound decoding and deferred outbound callbacks are not a transactional acceptance ACK. |
| `scripts/check-packed-consumer.ts:785-813` | Existing real archive fixture-copy/runtime/type/browser path. Add actor fixtures alongside existing factory fixtures. |
| `tsconfig.json:23,28-35`; `tests/consumer/tsconfig.json:2-19` and Vue/Foldkit equivalents | Root exactOptional enabled; archive modes unchanged. Root does not include shared tests/consumer directly. |
| `packages/core/src/telemetry/flow-telemetry.ts:1-71` | Existing lifecycle/decode/integrity/update/failure names and attributes. No new export/shutdown policy. |

Representative actual excerpts:

```ts
// flow-data-contract.schema.ts:56-66
export interface FlowIsolation<C extends FlowGraphCodec, RI> {
  readonly detach: (value: C['Type']) => Effect.Effect<C['Type'], FlowTypedFailure, RI>
}
// flow.schema.ts:449-452
export const validateFlowGraphDocument = <D extends FlowIntegrityDocument>(document: D)
  : Effect.Effect<D, FlowDocumentIntegrityError> =>
    validateDocumentWithPolicy(document, { kind: 'physical-id' })
// installed Effect.ts:11793-11840, one overload
<XR>(context: Context.Context<XR>): <A, E, R>(self: Effect<A, E, R>) =>
  Effect<A, E, Exclude<R, XR>>
```

## Proposed exact core exports

These are design declarations requiring compilation against real exported product source during089. They reuse accepted087 C/RI/failures unchanged. Functions/capabilities are local interfaces, never serialized Schemas. Serializable values derive from Schemas.

```ts
import { Effect, Option, Schema as S, Scope } from 'effect'
import type {
  FlowDataContract,
  FlowGraphCodec,
  FlowNodeOf,
  FlowEdgeOf,
  FlowTypedFailure,
  FlowTypedError,
  NodeId,
  EdgeId,
  Viewport,
} from '@flow/core'
// Use the core's existing ViewportSchema import in the production module.

// Production definitions use existing ViewportSchema and the authoritative C.
// RevisionSchema = S.Finite.check(S.isInt(), S.isGreaterThanOrEqualTo(0))
// FlowTypedCommitResultSchema = S.Struct({ revision: RevisionSchema, changed: S.Boolean })
// Private CheckpointViewportSchema = ViewportSchema.check(S.makeFilter(v =>
//   !Number.isFinite(v.x) ? { path: ['x'], issue: 'Checkpoint viewport.x must be finite' } :
//   !Number.isFinite(v.y) ? { path: ['y'], issue: 'Checkpoint viewport.y must be finite' } : true))
// FlowTypedCheckpointSchema = S.Struct({ contractId: S.String,
//   revision: RevisionSchema, document: S.Json, viewport: CheckpointViewportSchema })
// createFlowTypedSnapshotSchema<C extends FlowGraphCodec>(document: C)
//   returns inferred S.Struct({ revision: RevisionSchema,
//     document: S.toType(document), viewport: ViewportSchema }).
// Derive FlowTypedCommitResult/FlowTypedCheckpoint via typeof Schema.Type.
// Derive FlowTypedSnapshot<C> via that inferred schema's Type; the equivalent
// readable resulting view is shown here, not a parallel runtime contract:
// Public aliases in implementation MUST use the authoritative schemas:
// type FlowTypedSnapshot<C extends FlowGraphCodec> =
//   ReturnType<typeof createFlowTypedSnapshotSchema<C>>['Type']
// type FlowTypedCommitResult = typeof FlowTypedCommitResultSchema.Type
// type FlowTypedCheckpoint = typeof FlowTypedCheckpointSchema.Type
// These readable views are descriptive only, never duplicated product aliases.
type FlowTypedSnapshot<C extends FlowGraphCodec> = {
  readonly revision: number
  readonly document: C['Type']
  readonly viewport: Viewport
}
type FlowTypedCommitResult = {
  readonly revision: number
  readonly changed: boolean
}
type FlowTypedCheckpoint = {
  readonly contractId: string
  readonly revision: number
  readonly document: S.Json
  readonly viewport: Viewport
}

interface FlowTypedEncodedInputCapture<RC> {
  readonly capture: (
    input: unknown
  ) => Effect.Effect<unknown, FlowTypedFailure, RC>
}
interface FlowTypedCheckpointReservation {
  readonly isCurrent: () => boolean
  readonly abort: Effect.Effect<void>
  readonly accepted: Effect.Effect<void, FlowTypedFailure>
}
interface FlowTypedCheckpointGate {
  readonly stage: (
    checkpoint: FlowTypedCheckpoint
  ) => Effect.Effect<FlowTypedCheckpointReservation, FlowTypedFailure>
}
interface TypedFlow<C extends FlowGraphCodec, RI, RC = never> {
  readonly readSnapshot: () => Effect.Effect<
    FlowTypedSnapshot<C>,
    FlowTypedError,
    RI
  >
  readonly readNodes: () => Effect.Effect<
    readonly FlowNodeOf<C>[],
    FlowTypedError,
    RI
  >
  readonly readEdges: () => Effect.Effect<
    readonly FlowEdgeOf<C>[],
    FlowTypedError,
    RI
  >
  readonly readNode: (
    id: NodeId
  ) => Effect.Effect<Option.Option<FlowNodeOf<C>>, FlowTypedError, RI>
  readonly readEdge: (
    id: EdgeId
  ) => Effect.Effect<Option.Option<FlowEdgeOf<C>>, FlowTypedError, RI>
  readonly readSelected: <A>(
    selector: (snapshot: FlowTypedSnapshot<C>) => A
  ) => Effect.Effect<A, FlowTypedError, RI>
  readonly replaceEncoded: (
    input: unknown,
    expectedRevision: number
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['DecodingServices'] | C['EncodingServices'] | RI | RC
  >
  readonly replaceDecoded: (
    input: C['Type'],
    expectedRevision: number
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['EncodingServices'] | RI
  >
  readonly updateDecoded: <RU>(
    update: (
      snapshot: FlowTypedSnapshot<C>
    ) => Effect.Effect<C['Type'], FlowTypedFailure, RU>
  ) => Effect.Effect<
    FlowTypedCommitResult,
    FlowTypedError,
    C['EncodingServices'] | RI | RU
  >
  readonly encodeDocument: () => Effect.Effect<
    S.Json,
    FlowTypedError,
    C['EncodingServices'] | RI
  >
  readonly observe: <RL>(
    listener: (
      snapshot: FlowTypedSnapshot<C>
    ) => Effect.Effect<void, FlowTypedFailure, RL>
  ) => Effect.Effect<void, FlowTypedError, RI | RL | Scope.Scope>
}
interface FlowTypedActorOptions<C extends FlowGraphCodec, RI, RC = never> {
  readonly contract: FlowDataContract<C, RI>
  readonly viewport: Viewport
  readonly encodedInputCapture?: FlowTypedEncodedInputCapture<RC>
  readonly checkpointGate?: FlowTypedCheckpointGate
}
declare function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & {
    readonly initial: { readonly kind: 'encoded'; readonly input: unknown }
  }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['DecodingServices'] | C['EncodingServices'] | RI | RC | Scope.Scope
>
declare function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & {
    readonly initial: { readonly kind: 'decoded'; readonly input: C['Type'] }
  }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['EncodingServices'] | RI | Scope.Scope
>
// Final union overload supports a genuinely dynamic initial.kind without a cast.
declare function makeTypedFlow<C extends FlowGraphCodec, RI, RC = never>(
  options: FlowTypedActorOptions<C, RI, RC> & {
    readonly initial:
      | { readonly kind: 'encoded'; readonly input: unknown }
      | { readonly kind: 'decoded'; readonly input: C['Type'] }
  }
): Effect.Effect<
  TypedFlow<C, RI, RC>,
  FlowTypedError,
  C['DecodingServices'] | C['EncodingServices'] | RI | RC | Scope.Scope
>
```

Export `RevisionSchema`, `FlowTypedCommitResultSchema`, `FlowTypedCheckpointSchema`, `createFlowTypedSnapshotSchema`, their derived types, the capability/actor/options interfaces and `makeTypedFlow`. No projection Model/port/renderer, disposal setter or command injection method is exported. The factory and failure union from087 remain byte-identical. Public actor names retain the approved codec design; new capture/gate/value names are explicit cold-review decisions in this packet.

`isCurrent` is a trusted synchronous, total, nonthrowing, side-effect-free lease predicate. It must not invoke an actor or user codec. A violated predicate contract is a projection boundary defect, rejected before acceptance; never accept and then catch it. The trusted lifetime predicate and decoded/encoded ownership capabilities carry explicit caller responsibilities; their semantics are not universally certified by Schema. `abort` is idempotent, cannot fail, and must terminate under cooperative Effect interruption. Bridge functions are already provided Effects with R=never, using an application/adapter-captured Context and its live scope. Capturing them at make time is not supplying future RU/RL. No DOM/functions enter checkpoints or persistence.

`RC` is the independently inferred encoded-input capture service, defaulting to never. It affects encoded initialization and replaceEncoded only. Read/observe/decoded replacement/update/encode do not require RC, and decoded initialization does not require RD or RC. The dynamic initial union conservatively retains both. This is an explicit refinement of the earlier conservative constructor signature, requiring cold review and exact compiler proof. A contract with RI=never stays service-free for reads even when its supplied encoded capture needs RC. Do not widen the accepted contract's RI to hide RC or capture future services at construction. No extra environment is erased into a global runtime.

## Complete checkpoint JSON and finite viewport boundary

Keep existing ViewportSchema, Viewport type and concrete behavior unchanged. The private CheckpointViewportSchema uses the authoritative ViewportSchema plus the pure x-then-y finite filter shown above, retaining exact Viewport Type/Encoded and never services. The exported FlowTypedCheckpointSchema uses that refined field; a document:S.Json field alone is not sufficient. Its complete declared value contains only finite JSON leaves: finite nonnegative integer revision, string contractId, JSON document and finite x/y/positive finite zoom. An exported Schema decode of any of the six nonfinite x/y cases must fail, including when a typed Viewport was supplied from JavaScript. No string/null coercion or alteration of the concrete saved/runtime schemas is permitted.

Freeze initialization validation order: first descriptor-copy the caller viewport into a private data record without executing accessors or discarding keys; validate its ordinary shape/zoom through existing ViewportSchema; then apply the x-before-y CheckpointViewportSchema filter; only after success start caller document capture/decoder/checkers/encoder. This initial structural copy is not a JSON encoding and must preserve a nonfinite numeric leaf until the explicit finite rejection. The descriptor-based ownership helper can copy these fixed data fields to a private unknown before Schema, without a cast or validation on caller-held accessors. Invalid viewport descriptor capture/shape/zoom maps to `FlowCodecFailure{operation:'encode',message:'Invalid checkpoint viewport'}` with its actual Schema cause in structured diagnostics. Nonfinite x maps exactly to `{_tag:'FlowCodecFailure',operation:'encode',message:'Checkpoint viewport.x must be finite'}`; nonfinite y maps exactly to the corresponding `Checkpoint viewport.y must be finite`. If both coordinates are invalid, x wins. Reject before allocating a live actor/writer/activation/observer worker or calling gate.stage. Private temporary acquisition scope may exist, but no graph owner is returned and its resources must close.

For every initialization/write checkpoint, after the graph's private decoded validation/integrity/sealing, encode the separate delivery; privately finite-JSON-copy its output; assemble contractId/prospective revision/document/the fixed validated private viewport; decode that complete value through exported FlowTypedCheckpointSchema; run the finite plain-JSON copy/validation on the complete checkpoint; then freeze and stage. Writes use the same sequence even though089 has no viewport mutation method. A rejected encoded document/complete JSON capture or checkpoint Schema maps to `FlowCodecFailure{operation:'encode',message:'Checkpoint must contain only finite JSON values'}` unless the coordinate-specific case above applies. Graph/encoder failures earlier in the sequence retain their existing exact error policies. Do not validate only document, validate after stage, bypass actual initialization or treat a Schema-only test as actor proof. The accepted viewport is the same detached finite value used in snapshots and checkpoints.

Required proofs in both packet matrices are exported-checkpoint Schema plus actual makeTypedFlow for x and y independently at NaN,+Infinity,-Infinity, with the other coordinate0, zoom1 and valid document. All six initialization failures must assert the exact encode payload, no returned owner, zero caller document codec/isolation/updater execution, zero stage/activation/accepted notifications and completed temporary scope release. Finite negative and zero x/y with positive finite zoom are accepted controls. A two-invalid-coordinate case proves x-first failure. Preserve and directly assert unchanged existing ViewportSchema acceptance of those Number x/y cases as a concrete compatibility control, without claiming their existing JSON persistence is equivalent. Installed Number may derive strings for nonfinite JSON serialization, but this new checkpoint boundary rejects them before encoding its viewport.

## Encoded and decoded ownership boundaries

The approved decoded isolation capability cannot clone arbitrary `unknown` encoded inputs. A private Counter in C.Encoded is unrelated to a Counter in C.Type. This is a new explicit ownership decision, not an accepted087 factory change.

Default `replaceEncoded`/encoded initialization capture supports only plain JSON data: null, booleans, strings, finite numbers, dense arrays and own string-keyed plain data records. Copy recursively before calling caller Schema. Inspect own property descriptors without invoking accessors; reject getters/setters, custom prototypes, symbols, cycles, sparse arrays, undefined, bigint/functions/DOM and nonfinite values with `FlowCodecFailure{operation:'decode'}`. Validate the private copy with S.Json. Do not JSON.stringify unknown to copy it, silently drop own-undefined, or allow prototype methods to execute during copying. Both ordinary and null-prototype data records may be copied to safe data records with keys defined as own data properties, including `__proto__`. This default captures JSON containers, not a new document grammar.

Arbitrary original C.Encoded remains supported through required explicit `encodedInputCapture` for encoded values outside that route, including own-undefined/default cases and custom classes. The trusted capability must neither mutate its input nor share mutable state in its result; it must preserve absence/value distinctions. The caller's tests prove constructors/private slots. It runs before untrusted decoder/validator code. A caller can choose a different encoded document shape, optional/default/untagged/no-data variants or custom class data without redefining the accepted factory. Missing capability for a non-JSON encoded input fails explicitly, before executing C. No silent class narrowing or universal clone claim.

For decoded initialization/replacement, call trusted detach on the caller input before any custom checker. For encoded input, capture first, decode once through C, then trusted detach the decoder result before custom decoded validation. Decoder retention/singletons cannot become authority. Caller raw input and decoder output are never accepted by reference.

A private working candidate goes through `S.decodeUnknownEffect(S.toType(C))` and `validateFlowGraphDocument`. User checks may mutate it, so validate graph integrity after those checks and before the final trusted clone. Take the sealed candidate via trusted detach from that validated working value. Trusted detach must preserve validity and independent state; checking one fixture cannot universally establish this. Never validate the sealed candidate with a custom checker afterward. A further private copy is used for mandatory JSON checkpoint encoding; an encoder can mutate that copy and then succeed/fail without changing the sealed candidate. Encode with `S.encodeUnknownEffect(S.toCodecJson(C))`, validate/copy its JSON output and validate/copy/freeze the complete checkpoint through its refined finite Schema and full plain-JSON policy before stage, using the fixed order and encode errors above. No decode-to-encode-to-decode loop and no erased custom data.

Freezing applies to arrays and plain records only, never recursively freezing caller service objects or treating Date/class internal slots as immutable. Date and private Counter state remain recipient-owned and independently mutable. Every read, selector, updater, observer and encoder receives an independently detached graph. Isolation receives owned references because it is the explicit trusted capability; no other caller function does. Revalidate a private delivery before final trusted sealing if caller checks are required. Trusted isolation preserves metadata, optional keys, class instances and validated geometry.

`encodeDocument` captures one accepted revision/document pair, isolates and encodes it outside the writer, and returns a new detached frozen JSON value. It is a read of that captured revision, even if a concurrent commit finishes meanwhile. It does not overwrite the mandatory checkpoint or advance revision. It is not a saved-v1/v2 envelope or a reload-durability assertion. A JSON hook that requires services absent from C's declared channels violates the installed codec contract and is a STOP, not permission to cast services.

## Writer, contexts and revision policy

One private actor state contains lifecycle phase, revision, sealed decoded document, detached viewport, mandatory frozen JSON checkpoint, observer registrations, pending request identities and gate health metadata. Gate health is either healthy or terminal-failed with the exact first FlowProjectionFailure; it contains no document or callback. This plain metadata is actor-owned and derived from the existing failure union. Checkpoint is an encoded projection of the accepted graph, unable to publish edits independently. There is no exported Ref, mutable state getter, alternate accepted graph or authority in a bridge.

Use `Queue.unbounded<Effect.Effect<void>>` for small bound request closures. Each generic submit helper retains its correctly typed Deferred in a lexical closure, captures `Effect.context<R>()` at operation execution, and provides it to work before scheduling owned preparation. The queue stores environment-free completion/state actions, not erased unknown/any command payloads. A command invocation is lazy until its Effect runs; recapture Context and inputs on each execution. Do not capture RU/RL from construction. Tests must construct the actor under one service value and later operate/observe under a different supplied value.

For reads, the writer atomically captures the accepted document reference, revision and viewport into a private operation. Isolation/validation runs outside the writer in that request's Context. Retaining the old sealed reference during a concurrent replacement is safe under the trusted isolation contract: accepted instances are never edited in place. Only the detached delivery is public. After delivery preparation, reject if actor has closed; a newer revision does not invalidate a captured read. Empty node/edge lookups use Option.none and still follow disposal policy. Selectors run on a detached snapshot in the calling Effect, and may return a retained recipient-owned Date/class. Selector throw becomes FlowCallbackFailure.

For replacements, first reject actor closure/caller cancellation, then a terminal gate failure, before nonnegative integer expected revision validation or any caller preparation at the public boundary. Invalid numeric values map to FlowCallbackFailure; stale values yield FlowRevisionConflict before codecs run. Preparation then runs in its owned child scope outside the writer. Final CAS repeats the frozen order: actor closed, caller cancellation, terminal gate health, expected revision conflict, then trusted lease validity. It accepts only if all succeed. A terminal gate failure outranks a simultaneous revision conflict while the actor remains open. Exactly one competing write can accept the same expected revision. Revision starts0 after successful initialization, increments by1 for every successful replacement/update and never for reads/failures. B2 deliberately performs no arbitrary class equality/no-op detection: successful writes return changed=true, even if bytes are equal. This avoids inventing equality from JSON. Semantic no-op detection belongs to the later reviewed typed transitions. Revision exhaustion beyond Number.MAX_SAFE_INTEGER fails FlowCallbackFailure before acceptance.

`updateDecoded` captures a detached snapshot and its revision, then executes its callback exactly once outside the writer in RU|RI|RE Context. Its returned candidate is privately captured, checked, isolated and checkpoint-prepared before CAS against the captured revision. Awaited nested read/write on the same actor is allowed: a nested write can accept first; the outer write then returns FlowRevisionConflict and releases only its own preparation. No automatic retry, replay or merge. If the callback catches the nested result and returns another graph, it still uses the original captured revision and conflicts. A later explicit update is caller-controlled. An observer may await an update because its independent worker never holds the writer.

A malicious codec recursively calling itself can still recurse forever; no actor lock is held. Do not promise general termination of caller code. A cooperative suspension is interruptible and scoped. Creation initializes privately before exporting the actor; failed initialization leaves no live owner, observer or staged reservation.

## Mandatory checkpoint staging, ACK and activation

Without a gate, successful private checkpoint preparation is the mandatory core checkpoint ACK. The short CAS installs the sealed graph and its frozen checkpoint together. There is no native durability or filesystem commit in that ACK.

With a gate, pass a separate detached checkpoint to `stage`. The bridge may construct and validate a private projection and stage it under an owner epoch, preparation identity and prospective revision. It returns a reservation only after its required receiver has acknowledged staging. Before returning that reservation, stage owns cleanup of partial acquisition on failure/interruption; core cannot abort a reservation it never received. The bridge must use its live captured scope and interruptible acquisition, with release tied to this stage identity. A port.send success or scheduling a microtask is insufficient. Staging must not display the candidate as accepted or overwrite the previous accepted reload checkpoint. The receiver must retain the prior accepted presentation until activation.

The actor owns its own preparation identity and wraps each reservation with local terminal state. Aborting one lease cannot erase another lease/accepted commit, even for the same prospective revision. The native bridge must key ownership by owner epoch and that stage invocation's identity; revision alone is insufficient. `isCurrent` checks live owner/generation identity. Its identity must remain valid until acceptance or abort; native dispose synchronously invalidates it before teardown. Reject stage failure, invalidation, request cancellation, actor disposal, terminal gate failure or revision conflict before CAS, invoking idempotent abort once for that identity. Immediately upon a late stage return, register/handoff the lease and recheck closure/cancellation/gate health before requesting CAS; this guard is mandatory even if the request was already terminally settled. The exact identity release protocol below owns the returned lease. No accepted callback or checkpoint activation follows a rejected CAS.

The writer's acceptance is one short non-yielding state transition after all ACK/lease checks. An uninterruptible mask protects the state assignment and terminal Deferred completion, not arbitrary codecs/bridges. Core disposal similarly marks phase closed in a short transition. Cooperative JavaScript execution cannot interleave another task inside that transition. No caller async code runs there. Do not claim this atomically changes an independent native Runtime.

After CAS, enqueue reservation.accepted onto a separately owned ordered activation worker. It runs outside the writer and may await actor calls. The write returns the core CommitResult, not a renderer/durable receipt. Success releases its transient reservation through the same exactly-once identity release claim; abort is the non-reverting resource release, not graph rollback. Failure uses the terminal policy below. An accepted activation interrupted by scope shutdown is cleanup, not precommit rejection. Release never reverts a later native/core commit.

### Terminal gate failure and precise errors

Stage failure before acceptance is per-request and does not poison gate health. Translate typed stage failure or defect to `{_tag:'FlowProjectionFailure',revision:p,message:'Checkpoint staging failed'}`, where p is that request's prospective revision, including0 for initialization. An expired reservation produces the same tag/revision with `message:'Checkpoint reservation is no longer current'`; a thrown trusted predicate uses `message:'Checkpoint reservation check failed'`. Preserve original causes in structured logs, never unstable user text in these frozen public payloads. Initialization failures release their owned identity and return no actor. Initialization activation is postcommit revision0: if it later fails after creation, revision0 is preserved and the following terminal policy applies.

When reservation.accepted for accepted revision r fails or defects, the activation worker first requests a short serialized writer transition before taking another activation. That transition records the first sticky `{_tag:'FlowProjectionFailure',revision:r,message:'Checkpoint activation failed'}` as terminal gate metadata. Every pending unaccepted write and subsequent write while the actor remains open fails with exactly that stored payload, not its prospective revision or latest accepted revision. A failed revision1 activation therefore rejects revision4 with revision1. The metadata is serialized Schema-derived failure state, not a second authority. Later failures cannot replace its r/message. Do not keep the worker alive to call queued accepted callbacks or manufacture successful publication.

Within that transition: preserve decoded authority, checkpoint and every accepted revision; stop activation admission/dequeue; remove all queued activation identities; mark the failed active identity and every queued accepted identity for release; mark every unaccepted request terminally failed and settle its Deferred once with the sticky payload. Claim release also for any already returned reservation belonging to such an unaccepted request. No graph CAS/accepted notification is allowed after this terminal transition. New writes check health before input capture/codec/updater/stage; final CAS checks it again; a late stage-return handoff checks it even when no further CAS can occur. Reads, encodeDocument and independent observers remain usable and continue reporting the latest accepted core graph. No rollback, gate replacement/recovery API or native success claim is added.

Implement identity release with a local registry and total phases, not scattered finally booleans. A lease record tracks its stage-invocation identity/prospective revision and ownership state such as held, queued, activating, releasing, released. The writer owns status transitions. The first release claim atomically moves to releasing and assigns one cleanup job/completion Deferred; every failure/cancellation/conflict/close path joins that same release completion rather than invoking abort again. Cleanup calls that identity's nonfailing idempotent abort outside the writer, then records released/completes its release Deferred. The identity ledger remains until the associated preparation/publication is settled. Stage partial acquisition remains the bridge's responsibility before it returns a lease; no core release is claimed for a lease it never received.

Return handoff after interruptible stage must be protected narrowly against interruption until the returned lease is registered and assigned either its live preparation or its release job. Use the installed uninterruptibleMask/restore pattern for that handoff, not for the whole stage. Core must either own the returned lease or leave the still-unreturned acquisition with stage's interruption/failure cleanup; never lose a resource between them. If terminal failure wins first, the late handoff only registers/claims release, preserves the already settled rejection and performs no accepted callback/CAS. Pending preparation child scopes are interrupted/joined after terminal settlement; cooperative stage cancellation cleans partial acquisition, while an already completed stage's protected late handoff releases through core. No request Deferred waits for its provider to complete merely to report gate failure.

Cleanup jobs are scope-finalizer resources that cannot be abandoned midway after claiming release. Actor close keeps the writer/cleanup lane alive until all owned preparation handoffs and claimed releases complete, then shuts its queues. Closing first settles still-pending calls with FlowDisposed; terminal gate failure first settles them with its sticky ProjectionFailure and later close cannot overwrite that outcome. At a new call/final CAS, closed state outranks gate failure and rejects Disposed. True caller interruption remains interruption. A closing activation's ordinary interruption does not create a fake ProjectionFailure. Failure-transition and close share the release registry; each identity's abort count is exactly1 and release completion settles once. A nonterminating/defective trusted abort is a contract violation/STOP, not permission to hang a passing test or run abort twice.

Required real actor schedule: finish/release initialization reservation0; hold accepted revision1 activation on a Deferred; accept2 and3 so their distinct reservations queue behind1; start4 with a valid prepared graph and pause its public gate stage just before return/CAS; fail1 activation; observe the sticky revision1 failure; resume4. Revisions1–3 remain core-accepted, final read is3, each observer reports0,1,2,3 and never4, only activation1 was invoked among1–4, and identities1/2/3/4 each release exactly once. Revision4's pending and every subsequent write reject the exact stored payload; new writes execute zero preparation hooks. Read/encode/new-observer controls still work at3. A companion ordering resolves4 stage immediately before the terminal transition so an already returned unaccepted lease is also released. A stage-in-flight/late-return case plus scope-close before/after failure uses real fibers/Deferreds to prove handoff, exact releases, no queued activation, no post-close acceptance and no unresolved request/release wait. No test-only setter or native seam is needed. The tests may accept either actual serialization order when deliberately racing close/failure, but must assert the matching frozen terminal payload and one release per identity, never a timing-based waiver.

Native follow-up must expose `awaitRenderedRevision` and separate checkpoint/reload acceptance receipts, validate projection Schema before staging, correlate real inbound/outbound ACK identities and bind invalidation to its scope. It must prove full reload while staged, before activation and after activation. Until that follow-up succeeds, these gate tests prove only core protocol scheduling, not real Foldkit ACK/reload atomicity. Current Foldkit preservation serializes Model wholesale; a pending candidate in its preserved Model could incorrectly restore an unaccepted edit. The native implementation must keep pending stage outside preserved accepted Model or prove an equivalent explicit preservation policy. This unresolved native source seam is assigned to that follow-up, not hidden in089.

## Observers and resource ownership

`observe` is a long-lived Effect. At execution capture RI|RL Context and caller Scope; allocate a private registration child scope linked to both caller subscription lifetime and actor lifetime. Atomically register and enqueue the currently accepted revision as its first event. Each accepted CAS enqueues the accepted reference/revision in registration order. Those private references never escape; its worker trusted-detaches and validates each delivery before invoking listener. A slow listener has its own FIFO and cannot block another observer, writer or activation worker. It never receives another observer's class instance. No coalescing/drop/reordering or accepted notification on rejected preparation.

Use unbounded FIFO in this bounded foundation, explicitly retaining pending accepted versions while a listener is slow. The queues are transient delivery resources, not accepted authorities. This preserves all accepted revisions and avoids observer backpressure deadlocking a listener that awaits an update. There is no unlimited-memory claim: disposal/failure clears all retained deliveries; a later separately reviewed bounded-overflow policy may fail a slow observer explicitly. Do not silently switch to sliding/dropping queues during execution.

An observer isolation/validation failure fails only that observe Effect with FlowCodecFailure; listener typed failure propagates its exact tag, and defect becomes FlowCallbackFailure with structured cause diagnostics. Remove registration, interrupt/join its worker and clear pending references. Do not undo an already accepted graph or fail other observers. Observer callback execution is after acceptance, distinct from mandatory candidate encoding/gate preparation. Actor close completes a healthy observe normally after stopping its worker; caller cancellation remains interruption. Failure of one registration is settled once.

Actor scope finalizer first marks closed, rejects new operations with FlowDisposed, marks still-pending not-yet-accepted requests cancelled and settles their outstanding Deferreds with FlowDisposed, never replacing an earlier terminal ProjectionFailure/interruption/outcome. Then interrupt/join owned preparations, observer and activation workers, join existing identity release jobs and claim release only for outstanding leases, keeping the writer/cleanup lane available for late handoffs; only after these complete shutdown queues and clear accepted/checkpoint/registration references. Queue.shutdown alone is not request settlement. Finalization is idempotent; do not let LIFO fork finalizers race the closed flag. Use one owner finalizer plus explicit child scopes and `forkIn` so cleanup order is deliberate.

Requests belong to actor-owned preparation child scopes, with caller interruption registered to cancel that request identity and interrupt its work. Cancellation before CAS forbids acceptance even if a codec later resumes; late completion cannot overwrite a settled Deferred. Once the short CAS has accepted and completed the reply, subsequent caller cancellation cannot roll back that revision. If cancellation wins before CAS, caller observes interruption and authority stays unchanged. During actor closure a noncancelled still-pending caller receives FlowDisposed; an already completed terminal gate rejection remains its stored ProjectionFailure. No Promise/Deferred wait can remain unresolved after cooperative cleanup. Concurrent preparations may finish in any order; their final CAS, not start order, determines acceptance. Closing an actor while its callback is awaiting a request never holds the writer.

Services are borrowed from each operation/listener Context, not acquired as hidden permanent actor dependencies. Application scope must outlive provided service use; actor scope owns fibers, reservations and queues. All user failures/defects are translated at their boundary, preserving existing integrity errors. True interruption remains interruption except the explicit actor-disposal response settlement. Missing required services are composition defects, logged separately from malformed Schema input; never manufacture default services or classify them as ordinary invalid data. Trusted callbacks violating independence remain caller contract violations requiring STOP, not checks that falsely certify universal clone safety.

## Alternatives and acceptance boundary

| Alternative | Decision |
| --- | --- |
| Run user preparation inside serialized writer | Reject: updater/codec/selector or bridge can await a nested operation on that writer. Detecting only updater reentrancy is insufficient. |
| Outside-writer preparation plus one CAS actor | Recommend: callbacks run once, contexts are explicit, awaited nested calls finish, conflicts are typed. More concurrent preparations require explicit identities and shutdown tests. |
| Store decoded graph in native Runtime Model | Reject for arbitrary schemas at installed synchronous preservation and callback isolation boundaries. Existing concrete program remains unchanged. |
| Accept authority before checking projection send | Reject: already disclosed unapproved scalar-probe ordering. Stage/ACK before CAS; native activation remains separately observed. |

089 includes core actor values, ownership, reads/writes/encoding/observation and abstract checkpoint staging only. It does not include generic add/change/reconnect/delete reducers, controlled native proposals/acknowledgement, viewport mutation, render staging, default native content, public ports, schema registry/versioned typed saves or pinned captures. Its fixed initial viewport follows read/snapshot isolation; future viewport commands need their own reviewed transition. Original069 still contains100 members/300 host cells, with264 implementation and36 evidence gaps at accepted087; no cells change here.

Ordered follow-ups are: accepted089 core foundation; bounded typed transitions/selectors/delete/connection propagation; real native projection/one-use rendering/controlled command bridge on that actor; typed versioned persistence registry and reload receipts; original pinned typed-data comparison and exact member reconciliation. Native adapters can begin after089 while transitions proceed in separate owned files; final native acceptance requires those transitions. Frozen v1 and070 single-v2 format remain unchanged throughout this foundation.

## Review and STOP decisions

Cold review must explicitly approve outside-writer CAS/no-retry semantics, always-changed replacements, revision0 initialization, initial observer delivery, independent RC and exact initialization overloads, JSON-default/custom encoded capture, trusted staged reservation/guard, finite complete checkpoint/error order, terminal gate-failure metadata/guard/release policy and unbounded ordered observer queues. These are proposed policy choices, not already approved source facts. Executor must not select alternatives while coding.

STOP if exact Schema-derived snapshot inference, per-request context closures or real scoped queue/Deferred types require casts/any; encoded input cannot be isolated without executing an untrusted checker first; a callback receives authority/sealed candidate; a class isolation capability aliases private state; a lease can revert another commit; an awaited nested call can deadlock; checkpoint finiteness is not enforced by both exported Schema and actual initialization/write; terminal gate health permits a new CAS or fails to release queued/late identities once; shutdown leaves unresolved requests or post-close writes; generic graph validation erases variants or duplicates the shared validator; native preservation/ports would be needed to make a core test pass; failure is relabeled success; compiler/dependency policy or original member records must change. Report exact first failure, current source and required bounded revision.

## Conformity and deviations

Conforming proposed core boundaries derive values from Schema, retain accepted087 exact C/services/metadata, reuse one integrity traversal and one authority, and use real installed Effect Context/queue/Deferred/scope APIs. Production paths proposed here start at makeTypedFlow/public methods, capture state through the writer, prepare private values in owned Effects and accept via CAS. Planned tests exercise those actual exported paths and actual archive-installed source, separately from unchanged concrete browser regressions.

Intentional adaptations are Effectful typed APIs, trusted decoded/encoded ownership capabilities, explicit conflict rather than automatic replay, and staged core checkpoint delivery separate from native rendering/durability. They solve installed scheduling and class ownership limits. Their policy is subject to this packet's cold approval.

Unverified are actor implementation/compiler execution, full Flow native graph/render/DOM/reload, typed transformations/persistence, every original069 cell, pinned parity, full-suite/CI/devices/performance and collector delivery. The existing069 mounted scalar experiment remains feasibility evidence only. This read-only packet ran no prototype or gate and approves no product source.
