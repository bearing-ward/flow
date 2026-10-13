# 069 codec boundary decision and reproducible evidence

Recorded 2026-09-30 against `841be137e253cf19c665269eaaa79edc19abf3c3`. This is a proposed replacement for the blocked codec/getter paragraph of Plan 069, for independent review. It does not approve itself, close 069 or 057, or implement Flow's product APIs. Only the `plans/069-codec-boundary-*` artifacts were written by this pass. Other concurrent agents' files are outside this report.

## Recommendation

Add explicitly Effectful typed APIs. Preserve every existing synchronous JSON API. A typed contract has one decoded, Effect-owned graph authority and an explicit isolation capability. Native adapters render nonauthoritative projections and never decode an arbitrary schema inside a synchronous getter, Foldkit view, port decoder, or reload flush.

Use the projection design for Foldkit 0.163.0. A real mounted probe demonstrated initialization, an Effectful decoded update, detached Date/custom-class renderer deliveries, serializable Runtime projection publication, a Vite full reload, restoration into a fresh decoded authority, and disposal. No Foldkit change or dependency upgrade is needed for that demonstrated boundary. The full graph and all public/native contracts still need implementation and acceptance. Those remaining requirements are listed below rather than treated as already proved.

The other necessary change is explicit isolation configuration. Successful encode/decode does not prove detachment. A schema can deliberately decode every input to the same mutable singleton. The probe demonstrates this. Arbitrary private class slots cannot be inspected or generically cloned by Flow. A caller selecting such a type must supply a class-specific isolation capability and its tests. Flow validates the resulting decoded type; the capability owns independence. This is an additional required configuration contract, not a claim that Schema or `Object.freeze` can prove it.

## Current source boundaries

All paths below are relative to `/Volumes/Sync/codex/9-19-26/flow`. These locations were read in this pass.

| Path | Current behavior and implication |
| --- | --- |
| `packages/core/src/domain/flow.schema.ts:63-84`, `:111-143` | Concrete nodes/edges use optional `type` and `JsonObject` data. Types derive from schemas. A new typed path must keep geometry/identity/integrity while retaining the caller's correlated variant union. |
| `packages/core/src/domain/flow.schema.ts:160-179`, `:192-230` | Existing integrity indexing accepts concrete FlowNode. Generalize its structural geometry input rather than re-decode typed data through FlowDocumentSchema. |
| `packages/core/src/domain/flow-snapshot.ts:31-56` | Current snapshots use structuredClone plus recursive Object.freeze. Reusing this for arbitrary transformed data loses class prototypes; freeze does not make Date/private slots immutable. |
| `apps/vanilla/src/mount-flow.ts:877-884`, `:969-971`, `:8426-8427` | Existing public snapshots/node getters are synchronous and concrete. Their signatures stay intact. |
| `packages/vue/src/use-flow.ts:132-145`, `:248-263`, `:361-370` | Existing editor computed snapshots and synchronous getters return concrete data. Do not make serviceful schemas masquerade as these computed values. |
| `packages/foldkit/src/application.ts:151-160`, `:164-178`, `:2509-2560` | Current createProgram puts the concrete document in its Runtime Model and uses schema-backed messages/ports plus native graph view. Keep that default program unchanged. The typed program is a separate composition. |
| `packages/foldkit/src/graph.ts:583-605`, `:608-617`, `:2922-2945`, `:3085-3089` | Current update reports concrete snapshots and native view invokes user node renderers synchronously with document nodes. That direct document path cannot expose the typed accepted authority. |
| `packages/foldkit/src/observers.ts:38-43`, `packages/foldkit/src/snapshot-client.ts:42-61` | Current Foldkit observer ports carry encoded snapshots; request client returns Promise. Add separate typed Effect facades rather than reinterpret these concrete contracts. |
| `packages/core/src/domain/flow-persistence.ts:17-25`, `:52-63`, `:86-122` | Literal-v1 is frozen. It includes JsonObject data and explicit failures for unrepresentable semantics. Typed persistence must not widen the v1 reader or cast data into it. Plan 070 owns the versioned format. |
| `node_modules/effect/src/Schema.ts:820-843` | ConstraintCodec retains Type, Encoded, DecodingServices and EncodingServices. ConstraintDecoder's default services are never; this says nothing about suspension. |
| `node_modules/effect/src/Schema.ts:2478-2495` | `toType` validates decoded values and drops the encoding transform. Its service types are never. It is not restoration or cloning. |
| `node_modules/effect/src/Schema.ts:4673-4686`, `:4756-4760`, `:6126-6138` | Union retains tuple-correlated types/services. `toTaggedUnion("type")` supports the real discriminator. The constructor named TaggedUnion using `_tag` does not prohibit this. |
| `node_modules/foldkit/dist/runtime/makeElement.d.ts:13-25` | Its Model slot permits unknown schema services, but that declaration is not an execution guarantee. |
| `node_modules/foldkit/dist/runtime/runtime.js:82-104`, `:114-119`, `:126-157`, `:256-277` | Runtime constructs synchronous preservation parsers, restore skips init on successful decode, and synchronous beforeFullReload flush encodes Runtime Model. A JSON projection satisfies this seam; arbitrary transformed data does not belong in that Model. |
| `node_modules/foldkit/dist/runtime/start.js:65-99` | Public embed resolves preserved Model, creates the connector, returns schema-typed port handles, and interrupts its owned fiber on dispose. Use that lifecycle. |
| `node_modules/foldkit/dist/runtime/hostConnector.js:8-26`, `:39-61` | Inbound ports decode synchronously. Outbound listeners are deferred to microtasks. Typed schema execution belongs outside these port parsers. |
| `node_modules/foldkit/dist/runtime/modelPreservationBridge.js:6-34` | Vite preservation receives encoded Model. Restoration serves a checkpoint flushed by a reload; host dispose/remount has different semantics. |
| `node_modules/foldkit/dist/runtime/renderer.js:180-192` | Native rendering installs a dispatch/context frame, invokes view, and clears the frame. Invoke the synchronous Html callback here, after asynchronously preparing its own detached input. |
| `node_modules/foldkit/dist/html/index.js:1058-1107`, `:1168-1215`, `:2250-2301` | Static Html can be built outside a frame. Event-bearing Html built outside a frame binds a fallback dispatcher that throws when the event fires. Do not prepare interactive VNodes in a codec Effect. |
| `node_modules/foldkit/dist/runtime/deepFreeze.js:7-21`, `:23-54` | Freeze handles arrays/plain objects, while Date/Map/class instances remain mutable. The typed authority must never escape; each delivery owns isolated transformed instances. |
| `packages/core/src/telemetry/flow-telemetry.ts:1-32`, `:34-71` | Use the existing decode, integrity, edit, controller, mount/destroy and failure spans/attributes. Export/shutdown belongs to application composition. |

The installed versions used here are Effect `4.0.0-rc.116`, Foldkit `0.163.0`, TypeScript `5.9.3`, Vite `8.0.13`, `@foldkit/vite-plugin` `0.24.0`, and Playwright `1.62.1`. Root and Foldkit app package manifests supply those exact versions; no manifest or lockfile changed.

## Alternatives compared

| Design | What it can enforce | Tradeoff and verdict |
| --- | --- | --- |
| Trusted synchronous capability | An opaque capability created only by Flow's closed, audited synchronous builders could provide synchronous decode/encode/isolation. Reject serviceful schemas at compile time and suspended parsers at runtime. | A `Services = never` bound or one successful test input cannot prove non-suspension on all future inputs. A wrapper over arbitrary Schema cannot certify this. A closed builder grammar could support JSON and selected transforms but would narrow the original arbitrary typed-data target. Do not use this to close 069. Retain the existing JSON path as the known synchronous capability. |
| Effectful typed getters with decoded data in Foldkit Model | Explicit APIs retain services, suspension and typed errors. | Still fails at Foldkit preservation and synchronous view exposure. A new framework facility for Effectful model isolation/preservation/render preparation would be needed. This is feasible framework work, but it adds a dependency and is unnecessary for the demonstrated projection design. |
| Effectful core authority with native projections | Core owns decoded graph and all commits. Foldkit owns only JSON checkpoint/geometry/UI projection plus transient native output. Asynchronous isolation precedes callback delivery; synchronous native view consumes a one-use delivery. | Requires a separate typed adapter composition, revision/epoch checks, and explicit isolation capability. The mounted probe works with the installed framework. Recommend this design. |

Do not add an unchecked branded `SyncCodec` constructor that merely takes a schema and tests one fixture. The codec may suspend conditionally on another input. Services and scheduling are independent properties.

## Proposed exports and caller usage

The declarations below are the proposed public contract, not current package exports. Implement them in `packages/core` first, with host-specific composition in the adapter packages. Existing `FlowNode`, `FlowEdge`, controller, Vue composable, createProgram and saved-v1 APIs keep their exact concrete signatures.

```ts
import { Effect, Option, Schema as S, Scope } from 'effect'
import type {
  FlowNode,
  FlowEdge,
  FlowDocumentIntegrityError,
  Viewport,
} from '@flow/core'
import type { Html } from 'foldkit'

type NodeGeometry = Omit<FlowNode, 'data' | 'type'> & {
  readonly type?: FlowNode['type']
}
type EdgeGeometry = Omit<FlowEdge, 'data' | 'type'> & {
  readonly type?: FlowEdge['type']
}
type GraphGeometry = {
  readonly nodes: readonly NodeGeometry[]
  readonly edges: readonly EdgeGeometry[]
}
type GraphCodec = S.ConstraintCodec<GraphGeometry, unknown, unknown, unknown>
type NodeOf<C extends GraphCodec> = C['Type']['nodes'][number]
type EdgeOf<C extends GraphCodec> = C['Type']['edges'][number]

const FlowTypedFailureSchema = S.Union([
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
type FlowTypedFailure = typeof FlowTypedFailureSchema.Type
type Failure = FlowTypedFailure | FlowDocumentIntegrityError
type Snapshot<C extends GraphCodec> = {
  readonly revision: number
  readonly document: C['Type']
  readonly viewport: Viewport
}
type CommitResult = { readonly revision: number; readonly changed: boolean }
interface FlowIsolation<C extends GraphCodec, RI> {
  // Must create independent mutable state, including private class slots.
  // The implementation validates this result through S.toType(contract.document).
  readonly detach: (
    value: C['Type']
  ) => Effect.Effect<C['Type'], FlowTypedFailure, RI>
}
interface FlowDataContract<C extends GraphCodec, RI> {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}
declare function defineFlowDataContract<C extends GraphCodec, RI>(options: {
  readonly id: string
  readonly document: C
  readonly isolation: FlowIsolation<C, RI>
}): FlowDataContract<C, RI>

interface TypedFlow<C extends GraphCodec, RI> {
  readonly readSnapshot: () => Effect.Effect<Snapshot<C>, Failure, RI>
  readonly readNodes: () => Effect.Effect<readonly NodeOf<C>[], Failure, RI>
  readonly readEdges: () => Effect.Effect<readonly EdgeOf<C>[], Failure, RI>
  readonly readNode: (
    id: NodeGeometry['id']
  ) => Effect.Effect<Option.Option<NodeOf<C>>, Failure, RI>
  readonly readEdge: (
    id: EdgeGeometry['id']
  ) => Effect.Effect<Option.Option<EdgeOf<C>>, Failure, RI>
  readonly readSelected: <A>(
    selector: (snapshot: Snapshot<C>) => A
  ) => Effect.Effect<A, Failure, RI>
  readonly replaceEncoded: (
    input: unknown,
    expectedRevision: number
  ) => Effect.Effect<
    CommitResult,
    Failure,
    C['DecodingServices'] | C['EncodingServices'] | RI
  >
  readonly replaceDecoded: (
    input: C['Type'],
    expectedRevision: number
  ) => Effect.Effect<CommitResult, Failure, C['EncodingServices'] | RI>
  readonly updateDecoded: <RU>(
    update: (
      snapshot: Snapshot<C>
    ) => Effect.Effect<C['Type'], FlowTypedFailure, RU>
  ) => Effect.Effect<CommitResult, Failure, C['EncodingServices'] | RI | RU>
  readonly encodeDocument: () => Effect.Effect<
    S.Json,
    Failure,
    C['EncodingServices'] | RI
  >
  readonly observe: <RL>(
    listener: (
      snapshot: Snapshot<C>
    ) => Effect.Effect<void, FlowTypedFailure, RL>
  ) => Effect.Effect<void, Failure, RI | RL | Scope.Scope>
}
declare function makeTypedFlow<C extends GraphCodec, RI>(options: {
  readonly contract: FlowDataContract<C, RI>
  readonly initial:
    | { readonly kind: 'encoded'; readonly input: unknown }
    | { readonly kind: 'decoded'; readonly input: C['Type'] }
  readonly viewport: Viewport
}): Effect.Effect<
  TypedFlow<C, RI>,
  Failure,
  C['DecodingServices'] | C['EncodingServices'] | RI | Scope.Scope
>
```

The caller supplies a Schema for the whole document. Node/edge variant builders copy the authoritative base fields while replacing `type` and `data`; a const tuple Union retains their correlation. The compile probe has working, cast-free node/edge builders and `toTaggedUnion("type")` usage, including branded identities. These builder implementations are small enough to copy from `plans/069-codec-boundary-probe.ts:23-38`. Their geometry fields currently derive from the concrete schemas. Product implementation must derive those fields from the accepted post-067 schemas and retain their defaults.

The full generic graph factory remains a follow-up compile gate. This pass proves the discriminated tuple construction and proposed service channels, not that every current reducer accepts it. The compile probe includes optional/default discriminators, an untagged node and a union renderer; an incompatible default discriminator/data pairing fails compilation. No-data variants and complete default behavior remain required implementation cases. Do not redefine those away by treating the explicit-type demonstration as the entire factory target. A contract may contain an optional/default branch supplied by its schema; the union callback supports it without coercing it into `toTaggedUnion`'s required-discriminator constraint.

The key service distinction is deliberate. Reading already decoded authority needs the isolation environment `RI`. Encoding authority first isolates its own private delivery, so encoding needs `EncodingServices | RI`. External encoded replacement needs decoding as well. `toType` performs decoded-side validation without rerunning transforms. Its caller-supplied checks may still execute code, so it also receives a private delivery, never accepted authority. A codec-backed isolation implementation may itself need the codec service union; that becomes its inferred `RI`. An explicit class cloner can have `RI = never`. Do not add services to operations that do not execute them or erase services from operations that do.

Native composition adds these separate exports. Names may be adjusted together at review, but signatures and semantics must remain explicit.

```ts
type TypedFoldkitNodeRenderers<N extends { readonly type: string }, M> = {
  readonly [K in N['type']]?: (
    node: Extract<N, { readonly type: K }>,
    h: Html.HtmlBuilder<M>
  ) => Html.Html
}
// This complete union callback supports optional/default discriminators and
// every caller schema. The caller narrows with its own schema match/switch.
interface TypedFoldkitRendererRegistry<C extends GraphCodec, M> {
  readonly node?: (node: NodeOf<C>, h: Html.HtmlBuilder<M>) => Html.Html
  readonly edge?: (edge: EdgeOf<C>, h: Html.HtmlBuilder<M>) => Html.Html
}
interface TypedFoldkitHost {
  readonly prepareRender: () => Effect.Effect<void, FlowTypedFailure>
  readonly awaitRenderedRevision: (
    revision: number
  ) => Effect.Effect<void, FlowTypedFailure>
}
declare function mountTypedFoldkitFlow<C extends GraphCodec, RI, M>(options: {
  readonly container: HTMLElement
  readonly flow: TypedFlow<C, RI>
  readonly contract: FlowDataContract<C, RI>
  readonly renderers: TypedFoldkitRendererRegistry<C, M>
}): Effect.Effect<
  TypedFoldkitHost,
  Failure,
  C['EncodingServices'] | RI | Scope.Scope
>
```

The complete union renderer registry supports default/optional discriminators directly. A caller uses a switch or its `Nodes.match` to select subtype-specific content; the explicit-type mapped helper above supplies correlated handlers when the schema has required literal discriminators. The executor must prove optional/default unions rather than add a cast. The mapped helper already passes its positive/negative compiler tests. Vanilla and Vue add correspondingly named typed mounts/composables; they share the same core session. Vue must provide Effectful reads and host-local prepared renderer inputs rather than a persistent computed ref containing reusable mutable class instances. Typed methods must not be added to legacy interfaces with phantom generics.

Main usage is `defineFlowDataContract({ document, isolation, id })`, `makeTypedFlow(...)`, then caller-composed `Effect.scoped(...)` with the required service Layer. Reads, writes and subscriptions remain Effects. A host may offer documented Promise conveniences through its own provided Effect runtime; the core contract does not run them in an undocumented global runtime.

## Ownership, scheduling and failures

Core session owns one accepted `{ revision, decodedDocument, viewport }`. Use an Effect queue with one scoped mutation actor. All external commands, controlled owner acknowledgements, deletion approvals and reconnect completions enter that actor with an expected revision. Uncontrolled edits commit only after validation/preparation. Controlled edits return a detached proposal and wait for owner acknowledgement; the proposal is never an alternate accepted store.

For encoded input, run the caller codec once, check generic graph integrity, isolate into a private prospective candidate and validate its decoded side before acceptance. A validator may execute caller code. After validation, seal the prospective candidate by trusted isolation and never pass that sealed candidate to an untrusted codec, checker or callback. Mandatory checkpoint encoding receives another isolated delivery distinct from the sealed prospective candidate; renderer/listener preparation receives its own deliveries too. If candidate construction invokes another caller operation, validate the resulting private working value before taking the final trusted isolation copy. For decoded input, validate a private working copy through `toType`; never pass a Date/class instance into the encoded decoder. Generic integrity sees geometry/identity fields of this same decoded document. Pure geometry/reducers retain the complete typed objects; projection of base geometry does not replace authority.

Every custom encoder or checker running after acceptance receives an isolated snapshot. `encodeDocument` isolates accepted authority before running encodeUnknownEffect, even if the encoder is service-free and appears pure. Caller encoding may mutate a Date or a class's private slot and may then succeed or fail. Those mutations belong only to the encoder's private delivery. Other reads and accepted authority must remain unchanged in both cases. Clone/freeze validated JSON encoding outputs before exposing or storing checkpoints so a retained encoder result cannot mutate a published checkpoint either. The trusted isolation capability is the one explicit ownership boundary that receives the private authority; it must not mutate its input or share mutable output state. Schema validation cannot universally certify that semantic contract. Custom validation runs before the final trusted isolation copy used for acceptance or public delivery; do not run an untrusted checker on that sealed copy afterward.

Before commit, every mandatory checkpoint encoder and isolation/decoded validation must succeed. A failure keeps accepted revision/document/viewport unchanged and emits no accepted notification or save result. Codec SchemaError becomes `FlowCodecFailure`; unexpected defects from user codecs also become a typed boundary failure with the underlying cause logged. Do not treat missing services as malformed input: the probe observes missing service failure separately. Typed environment requirements prevent it in ordinary typed composition. Disposed sessions reject new reads/writes, interrupt owned work, settle pending requests and drop prepared deliveries.

Updater callbacks receive their own detached snapshot. Their returned decoded candidate is validated and isolated again before acceptance, so later caller mutation cannot affect authority. Reentrant updates queue as new operations; revision conflict is explicit. Listeners each receive a separately isolated snapshot, with plain records/arrays recursively frozen. Date/class internals remain mutable within that recipient's private delivery. No recipient receives the authoritative instance or another recipient's class instance.

Subscription registration belongs to Scope. Each listener has an ordered scoped delivery worker; listener failure settles that observer with a typed failure and a structured log without rolling back an already accepted graph. Do not hold the mutation actor while awaiting user callbacks. Encoding/isolation failure for required publication happens before commit; a later callback failure happens after commit. This distinction is part of the API. Complete `observe` only at disposal, interruption or failure.

Mounted adapters capture their composed Effect context and Scope to schedule native callbacks and bridge requests with `runForkWith`. The application supplies Layers and controls shutdown; adapters never manufacture fallback services. Native event handlers enqueue ID/geometry commands. High-frequency pointer activity can alter transient presentation geometry, but it cannot accept document data locally. Semantic changes, save, reconnect and delete require core acknowledgement. Viewport remains a separate supported native lifecycle projection of the accepted viewport rather than a second graph authority.

Use `FlowSpan.documentDecode`, `documentIntegrity`, `editPrepare`, `controllerUpdate`, `editFailure`, `hostMount`, `hostDestroy`; annotate the existing inputKind/changeKind/controlMode/entity/failure fields. Do not log pointer moves or claim collector delivery from these probes.

## Foldkit projection and real render/restore path

Runtime Model is a synchronous JSON-only presentation schema. In production it contains accepted revision, contract ID, encoded checkpoint, base geometry/render metadata, viewport and transient native UI state. It has no decoded custom data, functions, Html/VNodes, isolation capability or service handle. Runtime update may apply a core-produced projection and update transient presentation state. It cannot turn a graph edit into accepted authority.

Keep a scoped host-local one-use delivery table keyed by owner epoch, accepted revision, entity ID and render-input generation. An asynchronous Effect prepares a separate isolated decoded payload for each impending user renderer invocation. The actual native view consumes that payload once and invokes the synchronous Html renderer inside its installed frame. Clear the payload reference in a finally block. The adapter may memoize the resulting native output while its render inputs are unchanged. Reusing native output does not invoke a callback again. Every new callback invocation requires a freshly prepared delivery.

This table is temporary delivery staging, not a decoded snapshot cache. Never reuse a staged class instance across callbacks, recipients, revisions, replays or fresh render generations. Destroy the table on unmount, supersession and reload. User-created handlers may retain their own detached delivery; that cannot mutate core authority. Do not persist VNodes or replay a live event-bound VNode under a different owner. Native callbacks needing a new generation request asynchronous preparation; they do not decode in view. DevTools replay and default/selected/geometry-driven rerenders are required product tests before adapter closure.

The full production target starts at `mountTypedFoldkitFlow`, opens its scoped bridge, embeds the JSON projection program through public Runtime.embed, receives a startup checkpoint from a persistent bootstrap Subscription, decodes/restores that checkpoint through the contract in the composed Effect context, prepares one-use payloads, sends a plain JSON projection port, reaches Runtime update/native view, consumes a payload, and builds/patches native Html. Graph authority resides in core throughout. State-change callbacks and typed selectors read through core, never through Runtime Model.

Bootstrap must run on both fresh init and preserved Model restoration. Foldkit's successful restoration skips init, so an init-only restore command is insufficient. The mounted probe's Subscription emits the decoded JSON Model checkpoint; the host accepts only the first bootstrap for its epoch. A persisted checkpoint is untrusted serialized input during a new lifecycle, not the prior lifecycle's second active graph. Core then publishes a fresh native projection after async validation. Until that completes, native view renders a loading state and must not show stale data as accepted.

The persisted checkpoint is prepared before publishing an accepted projection. beforeFullReload therefore flushes only a synchronous JSON Model. It never starts an async codec. Reload while a core edit is still preparing restores the last published checkpoint; a pending edit has not yet committed. In product, an accepted core commit and mandatory checkpoint delivery must be coordinated: expose `awaitRenderedRevision`, retain pending projection messages until the port acknowledges them, and report projection delivery failure explicitly. Do not claim an exact accepted revision is reload-durable before checkpoint acknowledgement. Test reload between accepted core commit and native port acknowledgement. The probe checks settled revisions, not that interleaving.

The mounted fixture uses a scalar document-shaped payload, an in-memory authority cell and a monotonically numbered request guard. It writes that authority before inspecting projection port send failure. It does not serialize concurrent writers. Product implementation must synchronously validate the plain projection before commit, reserve delivery/generation under the owned actor, check disposal and revisions, and emit accepted notifications only after the mandatory projection bridge accepts delivery. Failed send/disposal cannot publish an accepted candidate. This is an explicit remaining integration gate. This boundary experiment does not replace the graph actor, native pointer workflows, public ports, complete program schema or conformance tests. Full arbitrary transformed schemas placed directly in the current Runtime Model remain incompatible. A future requirement that insists on that placement would require a bounded framework child for Effectful Model preservation and per-callback model isolation; the projection design avoids that placement.

## Persistence and backward compatibility

Keep saved v1 and its readers/writers byte-shape compatible. A typed document encodes through `toCodecJson(contract.document)` and returns JSON or an explicit failure. Do not place an arbitrary encoded data value into v1's JsonObject field by assertion. If the selected typed data or post-067 semantics are not representable by v1, use the Plan 070 versioned session path or return its explicit format failure.

Plan 070 owns the envelope/version migration. Integrate a contract ID/codec registry at that boundary after its base migration is accepted. Store only encoded data, viewport and allowed persistent graph fields. Measurements, pending requests, callbacks, VNodes and prepared delivery state stay out. On load, look up the named contract, reject an unknown contract or incompatible encoding, decode with its required services, check graph integrity, isolate a fresh authority and prepare native projection before presenting restored accepted data. JSON default sessions need no codec services and keep the concrete path.

Selectors, connections, deletion results and renderer props must retain `NodeOf<C>`/`EdgeOf<C>` through core operations. Foldkit ports carry synchronous JSON command envelopes with IDs, revisions and encoded payloads. Their callbacks call the Effectful contract decoder; serviceful schemas do not become port schemas. Typed host-local callbacks use detached decoded values. This preserves serializable Foldkit boundaries without erasing public custom types.

## Probes, commands and recorded results

Run from the repo root. No installs, package builds, broad verifier, product edits, commits or dependency updates ran in this bounded pass. Results are saved in `plans/069-codec-boundary-probe-results.jsonl` and `plans/069-codec-boundary-browser-results.jsonl`.

```sh
bun run plans/069-codec-boundary-probe.ts
bun node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ESNext --module ESNext --moduleResolution bundler --types bun,vite/client --allowImportingTsExtensions plans/069-codec-boundary-probe.ts plans/069-codec-boundary-runtime.ts plans/069-codec-boundary-browser.ts plans/069-codec-boundary-vite.config.ts
```

Both final commands exited 0. The compiler probe emitted no files, reported zero diagnostics and 13 checked negative type cases. It also compiles both exact declaration blocks in this document through a second virtual source file, resolving `@flow/core` to its current source public entry rather than a packed artifact. The negative cases reject wrong discriminator/data, encoded string supplied as decoded Date, Date supplied as encoded string, raw unbranded NodeId, incompatible optional/default data, missing read isolation services, missing custom isolation services, wrong replacement data, missing save encoder services, missing save isolation services when the encoder itself is service-free, unsupplied observer scope/services, synchronous serviceful decode and wrong data in a dated renderer. Positive inference includes node and edge builders, correlated Union narrowing, `type` matching, optional/default/untagged union rendering, supplied reads/subscriptions/save and preserved service unions. The outer probe has one intentional expected compiler error at the deliberate missing-service runtime call; it is not counted as an additional product API negative.

The parser/helper probe independently records service-free synchronous suspension rejection, supplied async/serviceful roundtrip, encoded-versus-decoded validation, omitted default/untagged variant decoding with wrong-pair rejection, distinct Date deliveries, the successful JSON preserveScheduler/port path, singleton aliasing, explicit class isolation, and encoder preflight failure with zero prototype publications. The untagged branch explicitly has optional Undefined type; omitting that schema field entirely could admit another variant's discriminant as an excess field and break correlation. Its `actualRuntimeMounted` is false. The installed Html frame helper fires one correctly bound dispatch and consumes one payload once. Those are helper tests, not a Runtime mount.

For actual mounted Runtime evidence, use a dedicated terminal and the owned strict port 4195:

```sh
bun node_modules/vite/bin/vite.js --config plans/069-codec-boundary-vite.config.ts
bun run plans/069-codec-boundary-browser.ts
```

Stop only that owned Vite process with Ctrl-C after the runner exits. The config uses the installed Foldkit plugin and a custom websocket event to request a real Vite full reload without rewriting product source. The browser runner starts installed headless Chromium and closes it. Final runner exited 0; zero page errors; disposal emptied the native Runtime DOM.

| Actual mounted observation | Result |
| --- | --- |
| Fresh bootstrap | initialized, revision 1, Counter 1, original Date, prefix:x, one renderer invocation |
| Two separate public test reads | Distinct Date and Counter instances. Mutating one to year 2050/Counter 2 leaves the other and authority at original Date/Counter 1. Fake class clone fails decoded validation. |
| Native tick | Runtime UI changes, core authority stays unchanged, renderer invocation count remains 1. Native output is reused without another delivery. |
| New prepared renderer generation | Invocation count becomes 2; it sees original Date/Counter 1 despite the preceding callback mutating its own delivery. |
| Effectful update | Counter 7, revision 2, supplied Prefix service, third fresh renderer delivery. Date and Counter preserve class identity. |
| Successful and failing mutating encoders | Each encoder changes only its private Date to year 2090 and private Counter from 7 to 8. One returns Success and the other returns Failure. Accepted authority, another retained read and both subsequent reads stay at original Date/Counter 7; revision stays 2. |
| Deliberate encoder rejection | Counter 99 decodes/isolation-validates, then the encoder deliberately returns a SchemaIssue. Recorded phase is encode. Revision stays 2 and accepted Counter remains 7; no new renderer delivery. |
| Real Vite full reload | fresh core lifecycle restores revision 2/Counter 7/original Date/prefix:x; renderer count restarts at 1; class identities remain correct. |
| Disposal | Native DOM empty, host authority and staged payload cleared; no page errors. |

The primary source path for the mounted experiment is `plans/069-codec-boundary-runtime.ts:5-37` schemas/isolation, `:38-65` isolated encoding/mutating encoder fixtures, `:66-88` ownership/projection, `:89-130` public Runtime/subscription/view, `:131-149` async preparation/commit/port, `:150-160` boot/read, `:187-201` mutating encoder acceptance, and its reload/disposal functions immediately following. The production Flow path is source-inspected only; no existing Flow public typed API exists yet. The browser runner uses the actual installed Runtime and plugin, not the isolated parser constructors. It does not mount Flow's canvas, run an upstream React fixture or establish packed consumer/native graph parity.

Probe development found and corrected two evidence errors. Outside-frame interactive Html construction succeeds but its event dispatcher fails when fired; the final probe fires the handler. The first browser repeat used a Promise-returning wait predicate and observed a stale renderer count; the final runner waits for the rendered synchronous count element. An invalid Date test failed at decode, so the final encoder rejection uses a valid Counter 99 whose encoder deliberately fails. All final reports distinguish those phases.

## Acyclic follow-up execution order

1. Independent review freezes this codec/isolation/projection contract and assigns the original 066 generic-member inventory. No product implementation before that decision. Keep 069 IN PROGRESS after approval until its implementation acceptance finishes.
2. Add the core contract factory, default/optional-type branch proof and schema-derived error definitions. Prove current geometry schemas and graph integrity accept typed node/edge tuples without data re-decoding, casts or widened output. This is a bounded first source child, not a new codec research round. Type probes must include every default/no-data/optional discriminator variant as well as Date/custom-class/serviceful cases.
3. Implement the scoped core authority actor, isolation-before-commit/exposure/encoding, generic reducers, selectors, edit/deletion/reconnect contracts and encoded persistence boundaries. Test revision conflicts, reentrant callbacks, delayed services, cancellation, class aliases, decoded validation, succeeding/failing mutating encoders and failed encoding before publication. Verify sealed candidate/accepted authority is never supplied to an untrusted codec or checker.
4. Implement native typed adapters on that actor. Start with Foldkit JSON projection and one-use render staging already demonstrated here, then Vanilla and Vue. Include native default rendering, geometry-triggered input changes, controlled owner acknowledgement, observer isolation, DevTools replay and teardown. Run real Flow mounts and packed exported type/consumer tests. Retain all concrete JSON fixtures.
5. Integrate 063/064/067 generic contracts and Plan 070's accepted versioned persistence. 067 concrete behavior and 070 concrete migration can execute before this generic integration; their final generic acceptance depends on it. Nothing in this design makes 069 depend on their final generic closure, so that order does not create a cycle.
6. Capture the mandatory pinned typed-data reference, reconcile every original member/host cell and run the scoped focused `bun run verify` plus full verification at the integration milestone. A checker or this probe count cannot close those member cells.

Implementation verification must include the existing Plan 069 unit, public-state/public-edits/renderer native suites, packed consumer gates, architecture and docs/member/trace checks. Update verification.config.json to the active source scope in the executor worktree. `bun run verify` is required; the focused profile must name its scope, and `bun run verify:full` is required for integration/broad claims. None ran here because this pass is a plans-only codec design/probe, not product acceptance.

## STOP conditions and remaining acceptance

- Do not close this boundary by changing a synchronous JSON getter to return Promise/Effect, erasing typed data to JsonObject, applying an unchecked assertion, or using a serviceful schema as a synchronous port/Runtime Model parser.
- Stop if a requested class/function cannot supply a valid independence-preserving isolation capability. Flow cannot prove private slots or clone closures generically. Report that exact schema/value and the required caller capability. A roundtrip fixture is not universal certification.
- Stop if an encoder, custom checker or user callback receives accepted authority or a sealed prospective candidate. Isolate a separate delivery first, preserve its required services, and take the final trusted isolation copy only after any candidate validation/user operation.
- Stop if native UI can accept document edits from its projection without core acknowledgement, or if a mutable decoded graph becomes a persistent adapter store. One-use renderer staging must be consumable only once and promptly cleared; memoizing a callback with a decoded class violates the policy.
- Stop if exact post-067 geometry/default fields cannot fit the generic codec bound without weakening branded identity, omitting public variants or dropping data. The explicit-type probe is not permission to omit optional/default typed variants.
- Stop if full graph rendering requires building interactive Html outside the native frame, replay reuses live event-bound VNodes under a new owner, or a synchronous native read requires a suspended codec. Preserve the installed framework; report a bounded framework child only if the projection implementation actually encounters that requirement.
- Still required: real Flow typed canvas/geometry, native interactions, controlled acknowledgement, general typed reducers and every callback family, default discriminator variants, multi-owner lifecycle, pending-update/reload and replay interleavings, application Layer resource acquisition/release, collector-side delivery, packed artifacts and pinned upstream typed-data comparison. The mounted boundary fixture is not proof for those paths.

## Independent review revision 1

Primary independently reran the earlier 12-negative compiler/helper, all-harness TypeScript and mounted browser probes and reported PASS. Its design verdict was REVISE because `encodeDocument` supplied accepted decoded authority to a caller encoder and omitted the isolation environment. That encoder could mutate Date/private class slots even when encoding failed. This revision adds `RI` to the exact encoding signatures, isolates existing authority and mandatory candidate checkpoints before custom encoding, distinguishes sealed candidate validation ordering, adds a service-free-encoder/required-isolation negative and successful/failing mutating Date/Counter browser probes. Final local reruns report zero diagnostics, 13 meaningful negative probes, and the mounted encoding-mutation assertions pass. Product transaction/delivery/concurrency gates remain open. This artifact does not approve its own revision; the primary reviewer owns acceptance.

## Conformity and deviations

The schema/compiler/helper observations conform to the installed Effect service typing, encoded/decoded distinction, and synchronous scheduling limits. The mounted JSON Runtime projection conforms to the installed native port/render/preservation lifecycle for the tested fresh init, settled update, full reload and disposal cases. Date and custom-class isolation is proved only for the explicit capability and fixtures used here.

The proposed separate typed Effect APIs intentionally differ from upstream synchronous generic getter ergonomics. The reason is explicit scheduling, services, failures and safe isolation of arbitrary transformed values. Existing JSON synchronous APIs remain compatible. The JSON presentation projection intentionally differs from the current concrete Foldkit document-in-Model implementation; it preserves one decoded graph authority and keeps async codecs out of synchronous framework boundaries.

Full Flow typed graph behavior, original 069 member completion, generic/native parity and upstream runtime comparison remain unverified. Test boundaries are separately the virtual TypeScript program, installed Schema/helper execution, and the actual installed Foldkit Runtime/Vite mounted fixture. This design resolves a concrete codec placement/scheduling choice for review; product completion still requires the acyclic implementation and acceptance steps above.
