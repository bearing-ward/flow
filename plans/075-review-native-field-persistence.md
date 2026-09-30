# Plan 075: Review native node-option persistence before extending live schemas

## Status

- Priority: P1; effort M; risk HIGH
- Parent:057; required closure follow-up under066
- Planned at: de36b4f64fe80d99886c0b7a9fb505258b872ac9,2026-09-29
- Status: APPROVED staged architecture — independent reviewer rechecked075/070 amendment; bounded legacy guard/client source APPROVED after independent fullverify; generated-evidence postchecks passed; live schema and final versioned acceptance remain open
- Dependencies:066 checked ownership;068 field matrix; reviewed070 migration design. Design review runs before068 adds fields; implementation consumes the approved field schema snapshot. This is a staged dependency, not a requirement that068 be DONE first.

## Problem and exact source boundary

068 discovered per-node connectable and node/edge ariaRole requirements absent from the current live schemas. `packages/core/src/domain/flow.schema.ts:63-84` already owns the accepted node flags; `flow-persistence.ts:13-24` builds saved schemas directly from live fields minus selection. Adding the fields would silently extend the v1 body.070 promises stable legacy field projection and reader behavior. A host-local parallel node metadata store would evade accepted graph ownership and does not satisfy the public Node field contract.

There is also an existing-field constraint: `flow.schema.ts:80` uses `S.NonEmptyString` for node ariaDescription. Supporting an explicit empty description changes the live constraint and would also relax v1 if the saved schema remains derived from the live field. The reviewed legacy projection must retain its original nonempty constraint; the supported additive format must represent an explicit empty description. Native rendering must remove the global aria-describedby when an explicit per-element description is present, because the W3C accessible description algorithm gives aria-describedby precedence over aria-description ([standard](https://w3c.github.io/aria/accname/#mapping_additional_nd_description)). Browser proof must inspect the computed description.

Existing node ariaLabel (:79) and edge ariaLabel (:131) also use NonEmptyString. Their explicit-empty branches require the same frozen legacy constraint and additive-format review. The current edge schema has no ariaDescription field; do not add one without its actual member/contract rationale. Pinned DOM attribute overrides and074's broader DOM-attribute ownership remain separate from the existing Flow-specific node description field.

Pinned NodeWrapper renders ariaRole with explicit role overriding the focusable group fallback (`packages/react/src/components/NodeWrapper/index.tsx:222` and surrounding attributes). Inspect the exact node/edge declarations and connectability paths before freezing field defaults or persistence types. Original member identities and host cells remain open until the matrix is reviewed; the original requirement cannot be renamed into an intentional omission.

## Scope

Planning phase: this file,070 compatibility appendix,068 field dependency record,066 routing/closure dependencies and index. Source after approval: core flow.schema.ts and its tests; flow-persistence.ts and its tests;070's new origin/versioned persistence modules and frozen v1 fixture; existing host save/restore clients and public-state tests; packed consumers; docs/correspondence/PROGRESS/public-api-completion trace and generated API output. Native UI rendering remains068. No dependency changes, private state, new graph authority, imported evidence editing or publication.

## Proposed compatibility contract to review

Keep literal-v1 public schemas, functions, types and origin-free legacy output frozen to de36b4f. New accepted node/edge fields cannot leak into those projections. Do not silently discard a supported explicit new field on legacy save: reject it with a documented format error and leave graph/viewport unchanged. Define precise handling of missing, own undefined, explicit false and empty role at the validated boundary; JSON cannot promise an undefined key round-trip.

070 has not implemented or released v2. Independently review whether its pending v2 body should include these exact native fields before first implementation, reusing the same additive versioned host APIs, or needs another supported envelope. Do not claim compatibility with an unpublished intermediate reader. Whichever format is approved must preserve exact explicit false/role values, accept old v1 unchanged, reject unsupported versions in old frozen readers, and preserve origins plus native fields together. Existing legacy host methods remain literal-v1; additive methods use schema-derived supported-version unions. Foldkit correlated save-format failure must settle once without defecting its update loop or leaking pending requests. Reuse064's createFoldkitSnapshotClient rather than introducing another client.

## Ordered steps

1. Enumerate exact original member IDs assigned to these fields, field schemas, native precedence/defaults, live/public snapshot projection and persistence intent. Capture actual pinned field outputs through public props/hooks/rendering; selection, measurements and functions remain excluded from persistence. Record an input-by-reader-by-writer matrix and a proposed complete field projection. **Independent architecture approval is mandatory before live schema or save-format source changes.**
2. After approval, implement the exact legacy field projection and explicit rejection together with additive encoding/decoding. Reuse070's frozen de36b4f fixture; do not import expanded schemas into the old reader. Keep one accepted document. Test old/new readers, literal-v1 inference, selected format, false/empty/missing values, combined origin/native metadata, unknown versions and unchanged graph after failure.
3. Wire native public save/restore and correlated Foldkit failure handling. Test actual all-host reads/restores and disposed requests; migrate repository clients in the same wave.068 implements/render-tests the fields only against this approved compatibility snapshot.
4. Reconcile exact member proof and rerun local acceptance. Parent057/066/068 remain open while any assigned fields or tests are missing.

## Commands and done criteria

Run frozen install with unchanged lockfile; focused persistence/schema/client unit tests, typecheck and architecture; serial three-host public-state browser gates; packed consumer positive/negative version probes; docs generation/check, member/closure checkers, trace checker, `git diff --check` and **`bun run verify`**. Captures require clean full pinned checkout0a1f9575b25679f2880175de8d3eae21aedde921 and two stable public samples. A passing typecheck or reference-only assertion is insufficient.

- [ ] Exact field/default/undefined and reader/writer matrix independently approved.
- [ ] Frozen v1 output/types/readers remain stable; unsupported explicit semantics fail clearly.
- [ ] Supported additive format round-trips new fields and origins together through every host.
- [ ] Correlated failures/disposal settle once without accepted notification or leaked resources.
- [ ] Member-specific implementation, production assertion and reference proof inspected.
- [ ] Fullverify passes with no new skips; CI/device/collector evidence remains separate.

STOP on unreviewed format changes, silent loss, unsound casts, repeated required-check failure after focused repair, second graph authority or out-of-scope work. No commit, merge, push or publish without separate authorization. Execute in an isolated codex worktree. The coordinator owns index acceptance. Research traces start at real public entries, separate production/test paths, cite exact lines and end with Conformity and deviations.

## Exact held original cells

068 owns types/node ariarole and Node#1.<intersection:2>.ariaRole plus its AriaRole type; types/edge ariarole and Edge#1.<intersection:3>.ariaRole plus its AriaRole type. Related074 fields are types/node connectable and Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.connectable; types/internal-node connectable; types/node-props isconnectable and NodeProps#2.<intersection:3>.isConnectable. Allthreehost cells retain their original IDs/states. Their groups now require075; global nodesconnectable is separate and can execute in068. Additional generic branches preserve their actual owner and need the same final compatibility contract, not duplicate field implementations.

The existing node ariaDescription field's explicit-empty branch is held for the same compatibility review. Existing accepted nonempty descriptions and global empty labels may proceed independently; do not claim the empty per-element branch is complete.

## Exact staged review amendment

The following independent source-grounded matrix supersedes earlier unspecified format choices in this plan. The coordinator read the exact legacy schemas/persistence functions, pinned Node/Edge declarations and wrappers, and installed Effect unknown-key policy. The recommended single unreleased v2, frozen v1 field constraints, exact extension predicate and correlated client protocol are accepted for reviewer recheck. Runtime capture and implementation acceptance remain open. Only the shared legacy prerequisite is eligible to execute first;068 live fields wait for its checked implementation.

# Independent review of Plan 075: native fields and frozen persistence

Date: 2026-09-29. Reviewer: capture_063_prerequisite. **Verdict: REVISE the staged contract with the exact amendment below; APPROVE its architecture once the coordinator records that amendment.** This is a planning review, not source acceptance. No source, dependency, capture, fixture or runtime gate was changed or run for this review. Plan 063's extended capture remains STOPPED. The original 057/066/068/074 member cells remain open.

Inspected planning/source snapshot: `/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow`. The approved 064 client implementation is separately in `/Users/richardmcandrews/.codex/worktrees/selector-owner-lifecycles/flow`; it is not present in the cumulative source snapshot yet. Native source is the clean full checkout `/tmp/flow-063-provider-reference`, verified HEAD `0a1f9575b25679f2880175de8d3eae21aedde921`. Working-tree source and `git show de36b4f:packages/core/src/domain/flow.schema.ts` agree on the legacy fields below. Source inspection is not public runtime evidence.

## Findings and required amendment

Include node `connectable`, node/edge `ariaRole`, and the existing node `ariaDescription` and node/edge `ariaLabel` fields' explicit-empty branches in the pending, unreleased v2 body. The label branches follow the already approved empty per-element override policy in `plans/057-public-contract-design.md:67`. Keep Plan 070's approved additive API/export names, including `SavedOriginFlow*`, even though that body now also contains the approved native fields. Do not introduce v3 or a second envelope/client. There is no released intermediate v2 reader to preserve; do not claim one exists. Change 070's format-selection predicate from origins-only to the exact extension predicate below.

Freeze the complete v1 projection and constraints before extending live schemas. Implement legacy encoder rejection and the correlated Foldkit failure delivery in that same first stage. This stage does not require completed origins, geometry, v2 response ports or v2 codecs. Once independently reviewed, 068 may add/render the precise native fields against that frozen projection. Final versioned round-trip acceptance still waits for 070 and 067's reviewed origin snapshot.

The staged plan currently leaves four choices underspecified: role values including empty strings; own-undefined handling; which old reader rejects what; and the legacy failure reason/client protocol. The matrices below resolve them without redefining the original native members.

## Production source paths and field meaning

Native public Node declares `ariaRole?: AriaRole` at `packages/react/src/types/nodes.ts:16-25`; Edge declares it at `packages/react/src/types/edges.ts:54-72`. The pinned React declaration is not a closed role enum: `node_modules/.pnpm/@types+react@18.3.29/node_modules/@types/react/index.d.ts:2832-2902` ends in `string & {}`. Therefore use a core Schema-backed optional String, including `''`, whitespace and caller custom role strings. Do not narrow this to NonEmptyString or a selected role enumeration, import React types into core, or promise browsers recognize arbitrary role strings.

The actual node state-to-output path is public Node input, node lookup in `packages/react/src/components/NodeWrapper/index.tsx:44-53`, effective focusability/connectability at `:64-67`, then the outer div at `:185-227` and custom NodeComponent props at `:229-246`. Its role is `node.ariaRole ?? (isFocusable ? 'group' : undefined)` at `:222`. EdgeWrapper reads stored edge and spreads defaultEdgeOptions first at `packages/react/src/components/EdgeWrapper/index.tsx:39-41`, computes focusability at `:52`, and renders an SVG g with `edge.ariaRole ?? (isFocusable ? 'group' : 'img')` at `:183-216`. Empty role survives nullish fallback in these source paths. Own undefined uses fallback; an edge's own undefined also shadows a defaultEdgeOptions role in the spread before fallback. Stored edge intent and effective default-edge rendering must remain distinct; never materialize global defaults into saved edge records.

System NodeBase declares `connectable?: boolean` at `packages/system/src/types/nodes.ts:42`; public custom NodeProps requires derived `isConnectable: boolean` at `:114-125`. NodeWrapper's expression at `:66` gives explicit true/false precedence over global nodesConnectable, with undefined inheriting the global value; initial global default is true at `packages/react/src/store/initialState.ts:121`. Built-in DefaultNode forwards the derived value to both Handle components at `packages/react/src/components/Nodes/DefaultNode.tsx:6-17`. Handle defaults and resulting connectable classes are at `packages/react/src/components/Handle/index.tsx:88-103,242-268`; real connection target validation inspects those classes at `packages/system/src/xyhandle/XYHandle.ts:287-292`. Custom components must consume the supplied projection: do not infer every custom Handle automatically follows it. This proposal freezes the stored field and derived NodeProps meaning, not unverified complete gesture parity.

Pinned Node has no direct `ariaDescription` field in `packages/react/src/types/nodes.ts:16-42` or NodeBase `packages/system/src/types/nodes.ts:14-79`. The native DOM escape hatch exists at `types/nodes.ts:30-41`, and NodeWrapper spreads it after global aria-describedby at `components/NodeWrapper/index.tsx:224-226`. The dedicated Flow field is an existing native API choice, not a newly captured upstream Node member. Native descriptions originate in global configuration through `packages/react/src/components/A11yDescriptions/index.tsx:36-48`; node and edge wrappers reference the generated IDs at NodeWrapper `:224` and EdgeWrapper `:214`.

Flow currently accepts only nonempty node ariaDescription at `packages/core/src/domain/flow.schema.ts:80`, and nonempty node/edge ariaLabel at `:79,131`. Vanilla actually sets/removes aria-description at `apps/vanilla/src/mount-flow.ts:1291-1295`; its current role differs at `:1287`. Vue's node wrapper is at `packages/vue/src/flow-canvas.ts:4259-4277`; Foldkit's at `packages/foldkit/src/graph.ts:2996-3003`. This source review does not establish cross-host description or role parity. Existing detached public snapshot ownership is `packages/core/src/domain/flow-snapshot.ts:8-13,48-56`; the new fields belong in that accepted document, with no parallel host metadata store.

The approved Flow explicit-empty per-element label policy requires live optional String for both existing ariaLabel fields, while their frozen v1 constraints stay NonEmptyString. NodeWrapper forwards node ariaLabel directly at `:225`; EdgeWrapper instead treats empty ariaLabel as a falsy request for generated endpoint text at `:211-213`. Therefore Flow's proposed explicit empty edge name override is an **intentional policy difference**, already directed by central 068, not source-derived native conformity. Preserve exact raw empty label in v2 and assert actual computed empty name in each host; do not claim the pinned edge renders an empty name. There is no edge ariaDescription field in current `flow.schema.ts:111-134`, and this review adds none. Future 074 DOM-attribute ownership remains distinct from the existing Flow node description.

For the proposed Flow description override, a defined ariaDescription, including `''`, suppresses the host-owned global aria-describedby and sets aria-description exactly. Missing/undefined removes aria-description and permits the host-owned global description. The [W3C description precedence table](https://www.w3.org/TR/2026/WD-accname-1.2-20260311/#mapping_additional_nd_description) places aria-describedby before aria-description; source-only attribute assertions cannot prove the computed description. Existing caller DOM escape-hatch semantics, if separately supported, retain their own owner/test boundary; this review adds no persisted arbitrary DOM attributes. Explicit empty suppression remains a proposed native policy requiring actual computed-description browser assertions, including update back to missing and independent owners.

## Exact live/default/presence and format matrix

Types below derive from core Effect Schemas. The validated full-document boundary accepts optional own undefined without normalizing it to a missing key for the two new field names. Its public in-memory projection retains that presence. No promise is made that existing patch transports preserve undefined (Vue's JSON patch filtering is at `packages/vue/src/use-flow.ts:58-64`). JSON encoding omits undefined values; decoded JSON cannot recover their own-key presence. Undefined has inherited behavior, not an explicit empty/false value. Tests inspect raw public presence before JSON separately from semantic JSON round trips.

| Field/input | Live schema and effective native meaning | Legacy encoder | Additive encoder/body |
| --- | --- | --- | --- |
| Node connectable missing | optional Boolean; inherit global, default true | v1 allowed | v1 if no other extension |
| Node connectable own undefined | accepted optional undefined; inherit; retain in-memory own key | reject native format | choose v2; omit undefined in JSON; restored absence inherits |
| Node connectable true or false | optional Boolean; explicit value wins, including true over global false | reject native format | choose v2; preserve exact Boolean |
| Node/edge ariaRole missing | optional String; node group when focusable, otherwise no role; edge group when focusable, otherwise img | v1 allowed | v1 if no other extension |
| Node/edge ariaRole own undefined | accepted optional undefined; fallback above; edge spread shadows a default role | reject native format | choose v2; omit undefined in JSON; no presence round-trip claim |
| Node/edge ariaRole defined String, including empty | pass exact string to role; no normalization or fallback for empty | reject native format | choose v2; preserve exact String |
| Node ariaDescription missing or own undefined | existing optional field; proposed absence/inheritance behavior | retain original v1 behavior | v1 if no other extension; omit undefined in JSON |
| Node ariaDescription nonempty String | set exact description, suppress host global describedby | retain original v1 acceptance/output | v1 if no other extension; preserve String |
| Node ariaDescription empty String | expanded live optional String; proposed explicit global-description suppression | reject native format; frozen v1 NonEmptyString remains unchanged | choose v2; preserve empty String |
| Node/edge ariaLabel missing or own undefined | existing optional field; use the existing approved host name/default policy | retain original v1 behavior | v1 if no other extension; omit undefined in JSON |
| Node/edge ariaLabel nonempty String | existing per-element name wins; exact String | retain original v1 acceptance/output | v1 if no other extension; preserve String |
| Node/edge ariaLabel empty String | expanded live optional String; approved Flow explicit empty name override, including the edge policy difference above | reject native format; frozen v1 NonEmptyString remains unchanged | choose v2; preserve empty String |
| Any above with null, wrong primitive or malformed graph | decode failure; null is not absence | fail; no mutation | fail; no mutation |
| Own document nodeOrigin or node origin | exact approved 070 presence policy, including explicit [0,0]; valid values follow 067 | reject origin format | choose v2; no origin normalization; preserve valid exact tuple |

The extension predicate is evaluated on the validated in-memory document before a frozen projection or JSON serialization can drop keys: any own document nodeOrigin, any own node origin, any own node connectable/ariaRole, any own edge ariaRole, node ariaDescription exactly `''`, or node/edge ariaLabel exactly `''`. This deliberately treats own undefined for a **new field name** as requiring v2/legacy rejection while preserving old own-undefined ariaDescription/ariaLabel behavior. It avoids silently erasing a new accepted public key in a legacy save. When both origin and native reasons exist, origin takes deterministic precedence in the failure code. Empty existing label/description branches use the native failure reason. Do not derive version selection from effective role/connectability, global options, or Boolean truthiness.

An input document `{node.connectable: false, node.ariaRole: '', node.ariaDescription: '', edge.ariaRole: 'link', node.origin: [0.5,0.5]}` requires v2; all defined values survive together. Legacy save fails before output, graph mutation or accepted notification. This is a proposed usage example, not an executed round trip.

## Frozen v1 projection and constraints

Freeze from de36b4f, not from the expanded live FlowNodeSchema/FlowEdgeSchema. Keep public `SavedFlowDocument`/`SavedFlowSession` encoded types literal version 1 and all existing encode/decode names. Current public exports are `packages/core/src/public.ts:375-386`; v1 schema/body derivation and methods are `packages/core/src/domain/flow-persistence.ts:13-77`.

| Projection | Exact fields retained |
| --- | --- |
| v1 node | id, label, position, parentId, type, data, zIndex, size, extent, handles, selectable, focusable, draggable, deletable, ariaLabel, ariaDescription, hidden |
| v1 edge | id, source, target, type, sourceHandle, targetHandle, path, label, data, markerStart, markerEnd, stroke, strokeWidth, deletable, selectable, focusable, reconnectable, interactionWidth, ariaLabel, hidden, zIndex |
| v1 document/session | version literal 1; document nodes/edges; session additionally viewport |
| v2 | exact v1 node/edge projection plus the reviewed native fields/description constraint, document nodeOrigin and node origin; literal 2; same session viewport |

Retain every original constraint: nonempty branded IDs/handles; String node label and edge label; optional NonEmptyString type/ariaLabel and **v1 node ariaDescription**; JSON-object data; finite zIndex; positive finite sizes/strokeWidth/interactionWidth; original path/marker/reconnectable enums; optional Booleans; parent-only extent; handle kind/side enums; original position/viewport number contracts and positive finite zoom. Source locations: `flow.schema.ts:48-82,86-134,138-141`; `flow-values.ts:3-18`; `flow-runtime.schema.ts:36-42`. Do not silently tighten position x/y to Finite in this migration. Preserve selection omission and the original absence/default behavior. Measurements, effective global config, DOM, functions and transient previews never enter either projection.

Existing production persistence tests exercise nesting/selection exclusion at `flow-persistence.test.ts:14-118`, unsupported version/integrity at `:120-151`, and exact selection-free legacy output at `:191-249`. These are test paths, not proof of the new constraints or an old-reader fixture. Capture the independent frozen fixture from de36b4f as 070 already requires; do not import the expanded live schema into it. New v1 decode first uses that frozen projection/constraints, then the normal graph integrity workflow. It must not inject origin/native fields merely because the live type can now express them.

## Old/new reader and writer matrix

Current v1 functions do not request strict excess-key errors (`flow-persistence.ts:55-57,70-75`). Effect's default is to strip unknown keys (`node_modules/effect/src/SchemaAST.ts:461-464`). Preserve that actual frozen behavior in both the frozen baseline and current legacy reader. Changing those readers to reject every unknown v1 key would be a compatibility regression. The new additive reader may reject **known extension semantics falsely placed in v1**, at its external unknown boundary before frozen decoding. It must not reject unrelated legacy excess keys just to implement that guard.

| Serialized input | Frozen de36b4f reader | Current frozen legacy reader | New additive reader |
| --- | --- | --- | --- |
| Valid v1, declared old fields | accept unchanged | accept unchanged | accept through frozen v1; no injected extension defaults |
| v1 plus new role/connectable or origin own key, including raw own undefined | ignore/strip unknown fields; cannot preserve new semantics | same frozen behavior | reject known-extension-in-v1 format before keys are stripped |
| v1 node ariaDescription or node/edge ariaLabel empty | reject original NonEmptyString | reject original NonEmptyString | reject v1 constraint/format |
| v1 unrelated excess key | original ignore/strip behavior | original ignore/strip behavior | original ignore/strip behavior |
| Valid v2 native fields only, origins only, or both | reject literal version | reject literal version | accept exact supported v2 body and graph integrity |
| Unknown version, malformed declared field, invalid graph/session viewport | reject | reject | reject; no accepted-state change |

The additive v1 guard rejects any own known new field, matching the writer predicate; existing ariaDescription/ariaLabel empty constraints also reject v1. JSON cannot contain undefined, so raw-object and JSON reader rows need separate tests. A v2 payload missing all extension keys is still a supported literal-v2 body; it may arise after JSON omits own undefined. Accepting that body does not authorize downgrade or reconstruct missing keys.

| Accepted document presented to writer | Legacy writer/host getSavedSession | New additive writer/host getVersionedSavedSession |
| --- | --- | --- |
| Old fields only, original valid descriptions | exact original v1 output/type | v1, supported union result |
| Any own new native key or empty description | explicit native-format failure before projection | v2 |
| Any own origin metadata, with or without native fields | explicit origin-format failure before projection | v2 |
| Invalid declared data | boundary/schema failure | boundary/schema failure |

No supported new writer emits extension semantics inside v1. Consequently an old reader's unavoidable stripping of forged v1 fields is documented legacy behavior, not a supported migration path or a round-trip promise. Keep 070's exact additive host signatures and supported-version unions; do not widen existing literal-v1 public types. Versioned restores decode before returning an owner proposal; acknowledgement and accepted-state mutation remain the existing owner workflow.

## Exact correlated legacy failure/client contract

Extend the approved 070 failure schema rather than replacing raw success ports:

```ts
LegacySnapshotFailureSchema = Schema.Struct({
  requestId: Schema.String,
  code: Schema.Literals([
    'origin-requires-versioned-session',
    'native-fields-require-versioned-session',
  ]),
})
```

The core legacy format rejection carries the same code (Schema-derived typed format error); synchronous Vanilla/Vue save exposes that documented error and keeps its literal-v1 return signature. Foldkit catches/branches on the format result **before** constructing SnapshotResponse, emits exactly one outbound `snapshotFailures` event with the original requestId, emits no `snapshots` success for that request, and leaves Runtime graph/viewport/accepted notifications untouched. Existing unconditional save construction is `packages/foldkit/src/application.ts:1844-1846`; current success schema embeds the literal-v1 saved session at `:198-212`. Origin wins if both extension families apply. Unknown/malformed request failure is distinct from a supported accepted document needing another save format.

Reuse 064's `createFoldkitSnapshotClient` and extend its Schema-derived failed `reason` literal union to exactly:

```ts
;[
  'invalid-request',
  'send-failed',
  'origin-requires-versioned-session',
  'native-fields-require-versioned-session',
]
```

Keep succeeded/disposed variants. Client source in the 064 executor tree: `packages/foldkit/src/snapshot-client.ts:10-31` owns result/port types, `:36-53` owns correlation, `:56-83` registers pending before send, and `:85-92` settles disposal. Add the typed failure subscription to this same client/owner. For matching requestId, while active, map failure.code to `{status:'failed', requestId, reason:code}` and use the same settle function, which deletes pending before resolving. Late/duplicate/foreign success or failure is ignored; dispose unsubscribes **both** channels before settling all remaining requests once. The client never turns a format failure into a succeeded SnapshotResponse or a fabricated saved session.

The first stage provides a real `snapshotFailures` outbound port on the existing Runtime and adds that port to the client's port contract. Migrate every repository construction to supply it in the same stage. The new client is an approved, unreleased API; do not introduce an optional disconnected failure transport for native-field-capable owners. Raw existing success-only ports/response schema remain unchanged for their original domain; callers that can see new fields must consume the same failure channel/client. Frozen external raw readers do not learn about a new channel automatically.

This guard/client stage works for existing legacy requests before any versioned request/response implementation exists. It only needs the extension predicate, typed failure schema, existing ports and pending map. The failure tells the caller that a format is required; it does not pretend that the required versioned implementation is already available. 070 later supplies its additive versioned ports/methods and extends this same client integration. Its earlier scope reference to a separate versioned-session-client must be reconciled with its superseding snapshot-client checkpoint at `plans/070-migrate-origin-aware-persistence.md:108-110`; no competing client owns request correlation.

Required stage tests: matching native/origin failures each settle once; both-metadata deterministic origin code; success-after-failure ignored for the same ID; new request after failure succeeds; duplicate/foreign/late failure ignored; disposal settles and unsubscribes both channels; send-failed and invalid-request retain their existing reasons; no Runtime defect, graph/viewport mutation or accepted notification on failed save. These tests use real typed ports/update handling. They do not require completed origin geometry or an unavailable versioned response.

## Ownership and acyclic execution order

1. **075/070 compatibility prerequisite:** independently review this exact matrix; freeze v1 node/edge constraints/projections, legacy output/type fixture, and guarded encoders; add legacy failure port and extend the approved 064 client. Build guards using own-property presence at the existing core boundary; they can inspect those reserved names before live schemas declare them. No product feature or geometry is implemented here.
2. **068/074 native field slice:** consume that checked prerequisite; add schema-backed optional node connectable/role and edge role, expand live node description and node/edge label to String, expose actual accepted public fields/derived isConnectable, and implement independent per-host rendering. Legacy saves now reject these keys/empty description or labels safely. Do not claim completed versioned save support yet. Preserve 066's original ownership: 068 ariaRole/description/label rendering; related 074 connectable/NodeProps fields; generic variants remain owned by 069.
3. **067 origin slice:** consume approved 070 design and the same frozen compatibility prerequisite; add the approved origin schema/geometry and source/public proof. It does not wait for completed 070 migration.
4. **070/075 final migration:** against the exact accepted live origin/native schema snapshot, implement the single v2 body/union/additive public entry points, reader guard, and shared-client versioned integration. Test native-only, origin-only, combined graphs, nested parents, controlled restoration/acknowledgement, exact false/empty/custom roles, old constraints, unknown versions, JSON omission and all host rendered restoration. Run packed positive/negative probes and full verification before any completion decision.

This replaces “075 implementation waits for completed 070 origins” with a bounded shared legacy prerequisite plus later joint versioned acceptance. The prerequisite does not require 068 DONE or origin geometry. Selection/measurements/functions remain outside persistence throughout. A future field not listed here needs its own compatibility review; it cannot piggyback on v2 silently.

## Alternatives and remaining evidence

The recommended option expands unreleased v2 once and retains one supported union and migration seam. A separate v3 would impose another discriminant/reader/client branch without a released v2 compatibility obligation. Keeping these fields in host-local metadata would lose accepted public graph identity and saved semantics; rejecting all new fields forever would abandon original member requirements. These alternatives do not meet the stated scope as well as the staged v2 amendment.

No browser, capture, install, source gate or bun run verify was run for this planning review. Native source proposals need independent two-stable-sample public evidence: missing/own undefined/true/false connectability under global true/false; node/edge default roles under focusability, defined/empty/custom role and dynamic updates; edge default-role shadowing; public read own presence before JSON; and description computed output for absent/nonempty/empty followed by removal. Do not repair or reuse the stopped 063 candidate to claim these observations. Assign a separate approved capture boundary when execution resumes. Native toObject returns public arrays from accepted store (`packages/react/src/hooks/useReactFlow.ts:132-152`); its payload has no Flow format version and cannot prove the old/new envelope matrix.

Implementation acceptance requires the frozen old-reader fixture, meaningful live/schema/persistence/client tests, packed literal-v1/union probes, actual all-host saved/restored state and rendered output, reference proof for original members, generators/trace checks and `bun run verify`. The captured 063 subset remains valid only for its existing 18 observations. No original member cell is closed by this review.

## Conformity and deviations

- **Source-derived proposed conformity, runtime unverified:** declared connectability inheritance/explicit Boolean precedence; node/edge role fallback distinctions; preservation of explicit empty/custom role strings and stored metadata without injecting effective defaults. Exact source paths are above; new public reference captures and all-host production tests remain required.
- **Intentionally different format:** Flow's frozen v1 and additive v2 envelopes, explicit guarded legacy save failure, correlated Foldkit failure and owner proposals are Flow contracts. Native public reads/toObject do not define those versions. The test boundary is frozen-reader/current-reader/packed-client compatibility plus actual host save/restore.
- **Intentionally different native description API, runtime unverified:** Flow has a dedicated per-node ariaDescription; pinned Node uses global description IDs and an optional DOM escape hatch. Expanding the Flow field to explicit empty and suppressing its owned global description implements the approved native precedence intent. Browser computed-description tests must prove it; attribute similarity is insufficient.
- **Intentionally different explicit empty edge label policy, runtime unverified:** approved central 068 lets explicit per-element empty text override defaults. Pinned EdgeWrapper instead generates endpoint text for empty ariaLabel. This review preserves the approved Flow intent in live/v2 fields and keeps v1 NonEmptyString intact. Tests must inspect computed names, preserve original member identities, and record this exact difference. No top-level edge ariaDescription is introduced.
- **Preserved legacy behavior:** v1 unknown keys are stripped, original declared constraints/types/output retained. Supported writers reject new semantics before they can be stripped; only the additive reader adds the known-extension-in-v1 guard. No promise is made that a frozen old reader rejects every forged v1 extension key.
- **Unverified and still open:** new source implementation, full role/connection behavior across all native hosts, versioned round trips with origins, generic 069 integration, packed/browser/full verification, original 066 cells and parent completion. This design review establishes no parity or original-member closure.

Independent amendment recheck,2026-09-29: capture_063_prerequisite APPROVE. Stage1 can prove frozen/core/client transport and ordinary real Runtime ownership; fabricated model branch inputs are unit evidence only. Public unsupported-format producer proof waits for live fields. The self-contained execution slice islegacy-prerequisite-execution.md; final075/070/member acceptance remains open.

## Bounded stage1 independent acceptance, 2026-09-30

The frozen legacy guard/client stage received root source review and a passing mandatory full verifier. Exact gate counts, copied-prerequisite provenance and the failed supplemental checker-test rerun are in [legacy-prerequisite-execution.md](legacy-prerequisite-execution.md). This accepts that bounded prerequisite only; all8076cells remain open. 068 native source is blocked after its final required-gate failures;067 origins wait on stopped065 geometry;069 remains blocked. Final070/075 versioned migration and all-host restoration are consequently not executable in this snapshot. Stage2 must inventory and migrate raw consumers before native-field-capable reads. Original targets are retained.
