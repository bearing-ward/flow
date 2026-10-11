# 067 connection identity, loose policy and persistence supplement

Read-only architect investigation, 2026-09-30, baseline `841be13`. This is a proposed amendment requiring independent review before connection source execution. It retains all 74/471/1,413 original067 obligations and the held069/074 dependencies. Only this planning supplement and `plans/067-connection-compatibility-probe.ts` were written. No product source, dependencies, locked formats or frozen fixture were changed.

## Recommendation

Separate gesture direction from stored endpoint identity. A stored edge's source/target labels express graph direction; the explicit handle ID identifies its physical endpoint independently of the handle declaration's source/target capability. Strict/loose governs **new interaction eligibility**, not how an already accepted edge is geometrically interpreted. Resolve explicit stored endpoint IDs by identity across kinds; retain canonical first-source/first-target fallback for absent IDs. Noncanonical explicit endpoints require the single unreleased v2 format because the frozen v1 reader rejects them. Keep one accepted document and one current-generation geometry authority.

This removes the present source-source validation → graph rejection/render disappearance seam and supports target-target eligibility without quietly omitting that original loose requirement. It does not promise pinned target-target rendered conformity: pinned source lookup remains source-kind-only even in loose mode. Flow should render the actual validated accepted endpoint identities consistently; compare and document that concrete output difference after executable proof.

Default/null public **Connection** handles can denote canonical fallback to existing declared handles. This can be implemented without fake IDs. Genuine unnamed/null-ID **Handle declarations** are a separate remaining original obligation: they require a reviewed physical-address schema/measurement migration. Do not hide that obligation behind the Connection fallback implementation or claim native Handle.id nullable branches complete. See the bounded address follow-up below.

## Evidence and reproduced lower-boundary probe

`bun run plans/067-connection-compatibility-probe.ts` exited0 against the actual frozen fixture and current source. It used Effect Schema public contracts without casts and produced:

| Input pair | Current loose validator | Current graph integrity | Current edge resolver | Current writer | Frozen/current reader |
| --- | --- | --- | --- | --- | --- |
| source→target | accepted | accepts | resolves | emits v1 | accepts/accepts |
| source→source | accepted | rejects | fails | emits v1 | rejects/rejects |
| target→target | unsupported-handle-combination | rejects | fails | emits v1 | rejects/rejects |

The writer currently accepts structural values which graph integrity would reject; the probe deliberately exposes that lower-layer inconsistency. It does not claim these values currently enter production accepted state. A public Runtime/browser producer still has to prove its actual path.

Current validator normalizes target-origin gestures (`packages/core/src/domain/flow-connection.schema.ts:60-85`), permits loose source-source, rejects target-target (`:132-141`). Current document integrity rejects any explicit handle whose declared kind differs from the endpoint label (`flow.schema.ts:284-326`). Current renderer requires endpoint kind even for an explicit ID (`flow-edge.schema.ts:52-76`). Reconnection resolves the old edge first, validates a derived connection but discards the returned normalization, then edits endpoint fields (`flow-reconnection.schema.ts:42-81`); it must consume the same reviewed directed-connection contract.

The immutable frozen v1 reader really contains the endpoint-kind guard (`packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js:368-403`) and applies it after envelope decode (`:1051-1064`). It is not merely a literal-version check. The current v1 decoder calls expanded live decode (`flow-persistence.ts:163-178,190-209`), so generalizing live integrity alone would unintentionally expand the current legacy reader's accepted v1 set. A distinct frozen-v1 validation seam is required before generalized live decode; do not modify or import the test fixture as production implementation.

Pinned checkout `/tmp/flow-052-xyflow` is full SHA `0a1f9575b25679f2880175de8d3eae21aedde921`, clean at inspection. `packages/system/src/xyhandle/XYHandle.ts:267,298-315` reverses endpoint order when the initiating handle is target; strict allows opposite kinds, loose only excludes same node+handle. This eligibility accepts source-source and target-target. Pinned renderer **always** searches source bounds for source (`system/src/utils/edges/positions.ts:34-44`), while loose target search concatenates target then source. Thus a valid loose target-target gesture can yield a source endpoint the pinned renderer cannot find (`:46-57`). Do not infer a successfully rendered target-target edge from the eligibility branch.

Pinned explicit IDs use equality lookup and missing IDs use first handle (`positions.ts:127-133`). Pointer gesture lookup differs: strict searches requested kind; loose concatenates source then target (`system/src/xyhandle/utils.ts:78-95`). These orderings are real and distinct. Flow existing fallback first-kind behavior is `flow-edge.schema.ts:52-70`. Named declaration IDs are currently unique per node (`flow.schema.ts:264-278`); preserve that invariant, so explicit cross-kind lookup is unambiguous.

Pinned public Connection handle IDs are nullable strings (`system/src/types/general.ts:75-83`); Handle.id is optional string|null (`system/src/types/handles.ts:8-16`), actual native Handle normalizes omitted/empty id to null (`react/src/components/Handle/index.tsx:88-106`). Native addEdge removes null sourceHandle/targetHandle from stored edge (`system/src/utils/edges/general.ts:166-172`; reread exact lines if drifted). Null Connection input and genuinely unnamed physical Handle are related but different contracts.

## Frozen directed policy for review

### Gesture → directed connection occurs once

Proposed core boundary `connectionFromHandleGesture({document, fromNodeId, fromHandleId, toNodeId, toHandleId})` resolves each physical handle, then chooses direction from the initiating handle kind:

- Start source: source=from, target=to.
- Start target: source=to, target=from.

Both same-kind pairs remain valid in loose when node+handle differs. Target-target direction is destination→initiator, matching pinned gesture orientation. Strict allows only opposite kinds; starting at target still yields canonical source→target after this construction. Same physical node+handle is rejected in loose; existing exact same-handle guard can continue in strict for named identical identity, which cannot be an opposite-kind pair under unique-ID invariants.

The resulting `FlowConnection` is **already directed**. Validators must not normalize it again. Repeated normalization of target-target would alternate direction, since both source handles are targets; normalization cannot be idempotent with that ambiguous input shape. Migrate every gesture caller to this boundary and delete/restrict the old ambiguity in the same change. Do not add a second graph, direction flag hidden in adapters, or mutable “already normalized” marker.

Direct public connection/edge input already supplies source/target direction and must never be reversed solely because its source handle is declared target. `validateFlowConnection(document, connection, mode)` validates this given direction, node/ID existence, eligible kinds by mode, same endpoint and duplicate policy; it returns the same directed connection, not an unexpectedly swapped one. Existing duplicate checks remain meaningful; compare duplicate absence/null request projections by **resolved physical identity**, not just raw null versus named IDs.

Affected callers: Vanilla `mount-flow.ts:2706,2801,6544`, Vue `flow-canvas.ts:2887-2894,2981,3175`, Foldkit `graph.ts:792-806,2657-2677,2706`. Audit click, pointer, keyboard and reconnect separately. Graph edits/transitions already use ordinary integrity; no special private insertion path.

### Stored edge identity and resolver

For each stored endpoint:

- Explicit branded ID: find that ID in the endpoint node's declarations regardless of kind; missing ID rejects integrity. Its exact declared side and current-generation measured geometry determine rendering.
- Absent ID: preserve first source-kind for source and first target-kind for target, preserving declaration order within kind. If none exists, preserve existing unrenderable/missing-fallback behavior rather than fabricating a handle; a new interactive connection requiring a physical endpoint fails eligibility.
- No persisted host/global `connectionMode` is needed. Existing edge geometry cannot jump when the host's current gesture mode changes. Strict mode can render a previously accepted explicit same-kind edge; it only restricts new connect/reconnect eligibility. A strict reconnect creating a new noncanonical pair rejects and leaves the edge unchanged.

Do not copy pinned target-side loose fallback concatenation into a global renderer policy: this would make an edge with omitted targetHandle change physical identity when a host option toggles, and persistence has no mode metadata. New interactions resolve selected physical handles and store explicit IDs; existing absent-ID fallback stays canonical. If a caller requires persisted noncanonical default fallback, it must identify that physical handle explicitly or await the address follow-up.

Core graph integrity after this change validates existing explicit IDs rather than source/target capability. Capability checks belong at the connection boundary. Resolve explicit identities once in `flow-edge.schema.ts`; every renderer/preview/reconnect uses it. Vanilla currently has native lookup paths beyond resolveEdgeHandles; audit those physical-ID readers too. Vue uses resolveEdgeHandles at `flow-canvas.ts:2861,3141,3296,4529,4643,4760,4912`; Foldkit at `graph.ts:2439`. Do not introduce host variants of the resolver.

## Exact 070/075 amendment required

Proposed new format failure code:

```ts
'noncanonical-handles-require-versioned-session'
```

Add it to the existing Schema-derived SavedFlowFormatFailureCodeSchema (`flow-save-format-error.ts:3-6`), the shared correlated failure port and the same snapshot client's failed union (which already derives the core union). Preserve old literal-v1 success types and existing reason literals. Legacy failure precedence becomes:

1. any own origin metadata → origin-requires-versioned-session;
2. any reviewed native extension key/empty string → native-fields-require-versioned-session;
3. any explicit valid endpoint ID whose declaration kind differs from its source/target endpoint label → noncanonical-handles-require-versioned-session.

The additive writer selects2 for **any** of those predicates; unchanged old-only canonical graphs remain1. Explicit metadata own-undefined origin/native rules remain unchanged. The noncanonical predicate is semantic and graph-resolved; it is not Object.hasOwn of a new edge flag. Do not add per-edge kind metadata or serialize connectionMode: declared handle kinds plus explicit endpoint IDs already retain the needed meaning in the existing body. This extends the supported semantics of the one unreleased v2 body; it does not introduce v3 or an origin-only intermediate2.

Missing nodes/IDs remain ordinary invalid graph errors, not this supported-format failure. Evaluate the noncanonical predicate on a validated live accepted document or distinguish “identity missing” from “identity exists but kind differs”; never silently emit2 for an invalid graph and pretend that fixes integrity. This recommendation does not retroactively promise the legacy encoder validated all graph integrity before this change—the existing writer behavior is reproduced above.

Legacy encoders reject supported noncanonical accepted state before emitting bytes. Frozen/current v1 readers must both reject noncanonical explicit endpoints. Current legacy decode should perform:

1. decode frozen v1 field schemas/constraints and preserve unknown-key stripping;
2. validate frozen v1 endpoint-kind invariants against the decoded declarations;
3. pass the resulting document through normal generalized live integrity.

Use a small pure/read-only endpoint check shared by current legacy encode compatibility and legacy decode; return existing MissingEdgeHandle-compatible typed failures on decode, and format code on supported accepted-state encode. This is not another graph authority: it owns only the old format's invariant. Do not import the immutable frozen JS fixture in production or duplicate general parent/node/edge integrity. The fixture remains the independent oracle.

Additive decode1 also runs the same frozen endpoint validation plus existing known-extension-in-v1 guard before expanded live decode. Additive decode2 permits explicit cross-kind endpoints through generalized integrity. Unrelated legacy excess keys keep stripping behavior. Current old-format schemas still reject null endpoint IDs and literal2. Formats never silently downgrade noncanonical identities to absent IDs.

**Old-reader guarantee:** every supported newly emitted v1 graph still passes the frozen reader. Every newly emitted noncanonical graph is2 and the frozen reader rejects version2. A forged v1 noncanonical graph fails both frozen/current legacy readers. A forged v1 containing unknown native/origin fields has the already documented old stripping limitation; only the additive reader detects known extension keys. Do not turn that existing limitation into a promise of strict unknown-key rejection.

Foldkit emits exactly one correlated legacy failure, no snapshots success and no accepted-state notification; its Runtime remains alive and future reads succeed. Vanilla/Vue synchronous legacy saves throw the documented format error without graph/viewport mutation. Versioned requests read accepted state through existing selectors and shared client. Migrate any unconditional legacy save inside public observer/harness before same-kind edge activation, just as origin activation requires client migration.

## Null public Connection handles and remaining unnamed Handle identity

A proposed **additive** Schema-derived public Connection input/output uses nullable sourceHandle/targetHandle. Core physical resolved connections retain branded IDs for the current named declarations. Null requests mean “resolve canonical default at that endpoint”; undefined is not part of native Connection's required field type. Resolve null to the existing first endpoint-kind declaration before graph validation/duplicate checks; do not produce synthetic IDs, and reject if no eligible physical handle exists. Preserve supplied null only in the separate public request/callback projection. Store the resolved named ID in accepted and persisted edges so declaration reorder cannot retarget the selected physical handle. Existing caller-supplied absent/own-undefined endpoint edges keep their established fallback behavior. This intentionally differs from pinned addEdge's omission of null keys. Null-request and explicit-A duplicate identity, declaration reorder, mode toggle and restored measured endpoints require separate proof; genuinely unnamed declarations remain held.

The public facade and internal resolved connection must have distinct Schema-derived types; do not widen existing FlowConnection transient schema and then pretend all callers still receive guaranteed HandleId. If a public API replacement is needed, migrate all internal callers/packed probes rather than maintaining an untyped compatibility layer. Typed edge-versus-connection callback overloads and generic data payloads retain069 dependency. Public null fallback on a named default is a resolver instruction, not proof that fromHandle.id is null.

**Genuine unnamed declarations still need a bounded explicit child.** Recommended physical identity shape is a Schema union:

```ts
HandleAddress =
  | { kind: 'named'; id: HandleId }
  | { kind: 'default'; handleType: 'source' | 'target' }
```

Accepted Flow handle declarations allow optional/null public id. Permit at most one unnamed declaration of each kind per node; named IDs remain unique across kinds. Address conversion happens from validated declarations and never inserts synthetic IDs into public graphs. DOM lookup, generation-tagged measurements, active sessions, connection targeting, reconnect and readonly projections use this one serializable address. Public handle id remains null/absent exactly as declared; physical kind identifies source-default versus target-default internally. This needs an independent reviewed Schema/measurement migration because065's accepted measured schemas currently require branded handleId (`flow-edge.schema.ts:18-24`, `flow-measurement.schema.ts:233-300`, `flow-connection-radius.schema.ts:18-23`). No side map or selector-time fake brand is allowed.

If executing that child before070 first format release, extend the same v2 predicate for any unnamed declaration (missing/own undefined/null id) and add a fourth legacy code `default-handles-require-versioned-session` after noncanonical. Frozen v1 Handle.id is required NonEmptyString (`baseline-reader-writer.js:211-214`); old reader cannot consume unnamed declarations. V2 stores original missing/null IDs plus the declaration kind, not derived runtime measurement addresses; frozen2 projection must be reviewed once with this exact addition. Supported old named graphs keep1. Required known-extension-in-v1 guard must reject unsupported missing/null declaration IDs through the frozen schema; it need not invent a field-name excess-key guard for absence.

This address migration is a necessary original067 Handle.id/default-handle follow-up, not authorized by silently relaxing065's types. Coordinator must name/review it under066 and preserve all original cells. Until accepted, null Connection fallback may be implemented but Handle.id/NodeHandle.id nullable/optional runtime/type cells remain open. If the user-required overall067 completion is the goal, this follow-up cannot be omitted. It should precede the final single2 schema freeze; otherwise070 final compatibility acceptance remains staged/open.

Potential same-node unnamed pairs need explicit reference tests: pinned loose excludes same node+public id even across source/target kinds (`XYHandle.ts:313`), while strict allows opposite kinds. Internal address inequality alone must not accidentally change this public eligibility rule. Named equal-ID cross-kind declarations are impossible under Flow's preserved uniqueness invariant; report that native declaration difference rather than removing the invariant unnoticed.

## Self-contained executor scope and gates

After independent review, the bounded **named-handle loose slice** changes existing `flow-connection.schema.ts`/test, `flow-edge.schema.ts`/test, `flow.schema.ts`/test, `flow-reconnection.schema.ts`/test, `flow-connection-radius.schema.ts`/test where eligibility needs explicit kind, `flow-persistence.ts`/test and save-format schema, existing host gesture/preview/edge-reader paths and corresponding interaction/renderer/public-state tests, public exports/packed probes, shared Foldkit snapshot client tests/failure transport. No arbitrary schema fields, native role/description rendering, second graph, dependency change, origin formula changes, measurement identity migration or frozen fixture edits. The unnamed-address child has a separate reviewed scope.

Acceptance cases before activation:

- Strict start source/target opposite pairs produce the same directed edge; source-source/target-target reject. Loose named source-source, target-target and both opposite directions validate, commit and render measured endpoints/declared sides across all hosts; exact same handle rejects. Graph publication goes through ordinary integrity.
- A target-target gesture produces destination→initiator exactly once; submitting the resulting directed connection to validator twice does not flip it. Reconnection preserves the chosen unchanged endpoint and consumes the validated returned edge, including both controlled proposal and acknowledged commit.
- Explicit wrong-kind endpoint lookup resolves correct physical declaration; explicit missing ID rejects. Absent source/target IDs preserve first canonical-kind order and no matches never fabricate geometry. Switching host strict/loose changes future eligibility but leaves stored edge DOM coordinates unchanged.
- Named null-default public requests resolve first canonical physical handle; no handle fails atomically; null versus explicit same resolved identity is a duplicate; public callbacks/types retain documented nullable fields. This does not assert unnamed Handle projection.
- Legacy writer canonical old graphs matches frozen fields/output/types; noncanonical writer rejects with exact new code; origin/native/noncanonical combined cases prove precedence. Frozen/current/additive1 readers reject forged same-kind explicit edges; additive2 accepts exact same graph and restored rendered geometry.
- Failures leave graph/viewport/revision unchanged, emit no accepted-state notification; Foldkit failure settles matching client once, duplicate/foreign/late success ignored, fresh request succeeds and disposal unsubscribes. Origin-aware/noncanonical observers consume versioned reads before activation.
- Packed public positive/negative probes retain literal1 return inference, narrow versioned1|2 and nullable Connection fields without casts or phantom generics. Original069/074-dependent fields remain unresolved until their source contracts integrate.

Commands: rerun read-only probe to confirm current drift before edits; add meaningful unit assertions then `bun run test -- packages/core/src/domain/flow-connection.schema.test.ts packages/core/src/domain/flow-edge.schema.test.ts packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-reconnection.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/foldkit/src/snapshot-client.test.ts`; typecheck/quality/architecture; production three-host interaction-lifecycle, renderer-contract and public-state browser suites serially; packed consumers; update active verification scope and run `bun run verify`. Use `bun run verify:full` at combined067/070 integration, plus release dry run. Focused pass has explicit scope and cannot close full acceptance. Captures use clean full pinned SHA and two stable public samples; no imported artifact edits.

STOP if reviewing demands a different direction policy; if explicit identity still depends on host mode after acceptance; if current legacy reader begins accepting a frozen-rejected v1 graph; if noncanonical v1 emission slips through; if unnamed addresses require an unreviewed065 change; if generics require casts/any/phantom type promises; after two focused repair attempts for a required failed gate; or if a new public client/graph store would duplicate ownership. Preserve completed source and report the exact blocking seam.

## Conformity and deviations

- **Source-derived eligibility conformity; public runtime unverified:** strict opposite kinds, loose same-kind eligibility excluding the same endpoint, and target-origin gesture direction follow pinned XYHandle cited above. Fresh captures/native host tests are required.
- **Deliberate proposed rendering difference requiring independent approval and proof:** Flow resolves every accepted explicit endpoint identity regardless capability kind. Pinned source-kind-only renderer can fail an eligible target-target edge. Flow's reason is consistent accepted-state geometry; test boundary is all-host saved/restored endpoints compared with the pinned actual output/failure, not the eligibility branch alone.
- **Preserved legacy format behavior:** old v1 endpoint-kind constraints and unknown-key policy remain frozen. New noncanonical accepted identity requires2 and correlated legacy rejection. This is Flow envelope policy; native toObject has no format version.
- **Unverified original obligations retained:** genuine unnamed Handle/NodeHandle IDs, their current-generation measurements, all069 generic payloads,074 nested fields, and original067 member closure. Null Connection default resolution does not close unnamed physical Handle cells. No missing loose behavior is relabeled intentional to force acceptance.

## Coordinator-selected boundary,2026-09-30

Coordinator reserved078 for the bounded named-handle directed integrity/persistence amendment, PENDING independent review. Its exact predicate is defined explicit endpoint IDs whose resolved declaration kind mismatches the endpoint; own undefined is absent, not noncanonical. Genuine unnamed Handle-address extension is **not selected for this source slice**; original nullable/optional Handle members remain held under their069/074 dependencies and a later reviewed domain extension. No fourth error code or unnamed schema enters078 or070 through this proposal. The exploratory address design above is an alternative for a future explicit review only.
