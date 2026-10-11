# Plan078: Complete directed named-handle integrity and persistence compatibility

Status: **BOUNDED CORE SOURCE APPROVED; host and v2 integration pending**. Priority P1; effort M/L; risk HIGH. Planned at `841be13`,2026-09-30. Parent067/057; original acceptance owned066. Execute only after coordinator records independent approval and accepted065 source review. This source dependency precedes final070 single-v2 implementation and any same-kind public example activation. It does not close067 or authorize unnamed Handle/074/069 completion.

## Problem and reproduced baseline

Current loose validation accepts source-source but core graph integrity and edge rendering reject it; target-target is rejected outright. If graph integrity is generalized without a legacy format boundary, current v1 readers would start accepting documents rejected by the frozen old reader. This plan makes directed named identities coherent through validation, commit, render, reconnect and migration while preserving exact old-reader acceptance.

Read-only `bun run plans/067-connection-compatibility-probe.ts` exited0 at the stated baseline: canonical source-target passed validation/integrity/resolution and frozen/current readers; source-source passed loose validation but failed integrity/resolution/readers; target-target failed validator with unsupported-handle-combination and failed other stages. The current legacy writer emits1 for all three structural values; that probe does not claim invalid graphs currently enter accepted production state. Keep the probe as drift evidence, not the final test suite.

Current source references:

- `packages/core/src/domain/flow-connection.schema.ts:60-85,106-141`: target-origin normalization, loose source-source eligibility and target-target rejection.
- `flow.schema.ts:263-278,284-326`: node-wide named-handle uniqueness, explicit-ID lookup and kind guard.
- `flow-edge.schema.ts:52-76`: explicit and fallback resolver both filter by endpoint kind.
- `flow-reconnection.schema.ts:42-81`: resolves old edge, validates candidate but does not consume returned normalization.
- `flow-persistence.ts:17-78,102-124,163-178,190-209`: frozen field projections/extension guards; current legacy decode still delegates integrity to live schema.
- `flow-save-format-error.ts:3-6`: existing origin/native failure union; Foldkit `application.ts:216-221` and `snapshot-client.ts:31-34` derive that same union.
- Independent frozen oracle `packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js:368-403` really rejects explicit handles whose kind differs from directed endpoint label; `:1051-1064` applies this after envelope decode. Never edit or import this fixture into production.

Pinned clean full checkout SHA `0a1f9575b25679f2880175de8d3eae21aedde921`:

- `packages/system/src/xyhandle/XYHandle.ts:267,298-315`: target-origin gesture reverses endpoint order; strict opposite kinds, loose excludes same node+handle and allows both same-kind pairs.
- `system/src/utils/edges/positions.ts:34-57,127-133`: renderer source always searches source-kind; loose target searches target then source; explicit ID equality versus first fallback. Thus an eligible target-target gesture can still fail pinned rendered lookup.
- `system/src/xyhandle/utils.ts:78-95`: gesture lookup strict by kind, loose source then target. Gesture and stored-edge lookup are different paths.
- `system/src/types/general.ts:75-83`, `system/src/types/handles.ts:8-16`: nullable Connection IDs and optional/null Handle IDs. `react/src/components/Handle/index.tsx:106` computes id||null; `system/src/utils/edges/general.ts:166-172` removes null Connection IDs from newly stored edge.

These are pinned source facts, not runtime/current-site parity claims.

## Frozen reviewed policy required before execution

One accepted document; named handle IDs remain nonempty branded and unique per node across kinds. Graph direction is source/target labels. Handle capability kind controls **new interaction eligibility**, while an accepted explicit ID controls physical rendering independently of kind.

### Directed construction and validation

Proposed Schema-derived `connectionFromHandleGesture` takes validated from/to node+named-handle IDs. Initiating source gives source=from,target=to; initiating target gives source=to,target=from. Construct once at pointer/click/keyboard gesture boundary. Target-target therefore points destination→initiator, like pinned gesture orientation.

`validateFlowConnection(document, connection, mode)` receives already-directed input and does not normalize again. Strict requires source-kind at source and target-kind at target; loose permits any existing named kind, except exact same node+handle. Duplicate detection uses resolved physical identity. Validation returns the same given direction. Direct public source/target input cannot be reversed solely because the source declaration is target-kind.

Existing public `normalizeFlowConnection` is exported at `packages/core/src/public.ts:462`. Preserve its signature if required by approved public probes, but restrict it to **opposite-kind canonicalization only**: target-kind source + source-kind target swaps; both same-kind pairs preserve given direction. That produces an idempotent helper and retains working old opposite-kind behavior. Migrate internal gesture users to explicit gesture construction and internal validators away from normalization in this same slice. Document the helper's canonicalization semantics; do not pretend it knows gesture direction for same-kind directed input. If independent review requires deleting/replacing this export, record and migrate every declaration/consumer probe before source execution rather than removing it unnoticed.

Core reconnection changes only the user-selected directed endpoint and validates the resulting complete edge under mode. It uses the actual returned validated connection and does not silently swap an unchanged endpoint. Controlled changes are proposals until acknowledgement; rejected candidate leaves state unchanged.

### Identity resolution and current graph integrity

Explicit defined sourceHandle/targetHandle → equality lookup in that endpoint node across declaration kinds; missing identity rejects ordinary integrity. Physical side and current-generation measurement belong to that resolved declaration. Absent/own-undefined endpoint key → existing first source-kind/first target-kind fallback, preserving declaration order. Missing fallback does not fabricate a handle. Imported/programmatic edges may remain unrenderable under the existing absent-fallback behavior; interactive connect requiring a physical default rejects.

Stored geometry never depends on host connectionMode. Changing strict/loose affects new gesture eligibility, not accepted edge coordinates. Strict hosts can display an existing explicit same-kind edge restored from2, while strict new connect/reconnect requiring noncanonical kinds rejects. No connectionMode persisted, no per-edge duplicate kind field, no second store, no host resolver variant.

This intentionally improves Flow's **accepted explicit target-target rendering** over pinned source-kind-only lookup. It must receive independent approval and real output evidence; it is not a blanket parity claim or excuse to omit target-target eligibility.

## Exact070/075 amendment

Append one Schema-derived failure literal:

```ts
'noncanonical-handles-require-versioned-session'
```

Extension selection and legacy error precedence:

1. own document nodeOrigin or own node origin → origin-requires-versioned-session;
2. approved075 native key/empty-string predicate → native-fields-require-versioned-session;
3. **defined explicit endpoint ID** resolves to a valid declaration whose kind differs from its source/target endpoint label → noncanonical-handles-require-versioned-session.

Own undefined sourceHandle/targetHandle is absent and **not** noncanonical. Null stored endpoint remains invalid under current FlowEdge/v1 schema; this slice does not widen it. Missing node/ID remains ordinary integrity failure, not a supported-format reason. Never choose2 to mask invalid graph input. Evaluate semantic format selection on a validated accepted document, or explicitly distinguish identity-missing versus identity-existing-with-other-kind at the boundary.

Additive writer selects2 for any extension predicate; canonical old-only graphs still1. Legacy writer rejects valid accepted noncanonical identities before output. Additive2 keeps exact existing handle declarations and explicit endpoint IDs; no new body field is needed because kinds/IDs already encode this meaning. This expands semantics of the **one unreleased complete v2**, not an intermediate2 or version3. Origin/native presence/undefined/empty rules remain unchanged. Generic069 codec contract remains a separate gate.

Current legacy readers must decode frozen field constraints, then apply a **frozen endpoint-kind check before generalized live decode**. Shared pure/read-only compatibility helper belongs in persistence/core, returns existing MissingEdgeHandle-compatible typed decode failure; it owns only old-format explicit endpoint-kind invariants, not general graph validation. General live decode afterward still checks nodes, edges, duplicate IDs, parents, cycles and extents. Do not duplicate a graph/store, or use the test fixture as production implementation.

Additive decode1 uses this same frozen endpoint-kind check plus existing known-extension-in-v1 guard; additive decode2 uses generalized live integrity. Existing unrelated excess-key stripping remains unchanged. No current legacy reader accepts a frozen-rejected same-kind explicit graph merely because live schema expanded.

### Reader matrix

| Serialized data | Frozen old reader | Current legacy reader after078 | Additive reader after070 |
| --- | --- | --- | --- |
| Valid canonical old-only1, explicit canonical IDs | accept original | accept original | accept through frozen1 |
| Valid old-only1, omitted/own undefined endpoint IDs | original fallback/integrity behavior | same | same frozen1 behavior |
| Forged1, existing source-source or target-target explicit IDs | reject MissingEdgeHandle | reject before live decode | reject frozen1 before live decode |
| Forged1, explicit missing node/handle | reject ordinary integrity | reject ordinary integrity | reject ordinary integrity |
| Forged1, known origin/native extension | old unknown-key stripping limitation retained | same | reject known extension before stripping |
| 1 unrelated unknown keys | original stripping | same | same |
| Valid2 canonical/noncanonical explicit IDs, origin/native/combined | reject version literal | reject version literal | accept supported2 and live integrity |
| 2 missing identity, malformed declared value, bad graph/viewport | reject version | reject version | reject; no accepted mutation |
| Unknown version | reject | reject | reject |

Every supported emitted1 must pass the frozen reader; every supported noncanonical emitted graph is2. Supported writers never hide noncanonical IDs by omitting them or canonicalizing to different physical handles. Raw-object own-undefined and JSON omission are separate tests.

### Host failure/client compatibility

Vanilla/Vue synchronous legacy save retains literal1 type and exposes the documented format error. No graph/viewport/revision/accepted notification changes on failed save. Additive save supports2.

Foldkit catches this same new core format code at existing SnapshotRequest guard (`application.ts:1811-1831`), emits one correlated snapshotFailures and no snapshots success, leaves Runtime alive and state unchanged. Existing shared client's reason union derives the core schema; extend tests, not a competing request client. Matching failure settles once; foreign/duplicate/late events ignored; disposal unsubscribes all channels; fresh request after failure succeeds. Additive versioned request channels still belong070 and the same owner/client.

Migrate any observer/harness that unconditionally calls legacy save before activating same-kind accepted graphs, just as origin activation requires migration. Origin-free/canonical clients retain their current methods and literal1 contracts.

## Bounded null Connection boundary, and excluded unnamed declarations

Nullable public Connection request IDs can mean canonical default selection. Proposed **additive** public Schema-derived facade exposes required sourceHandle/targetHandle as HandleId|null, distinct from existing internally resolved FlowConnection with guaranteed branded IDs. Null resolves existing first source-kind/target-kind declarations; no matching eligible handle fails atomically; an explicitly targeted named ID remains exact. Compare duplicate identity after resolution, so null-default and explicitly named default are the same physical pair.

A null public request selects the first current canonical named declaration at the request boundary. Store that resolved declaration's explicit branded ID in the accepted edge and retain it in every supported save/restore projection. Preserve supplied null only in the separate public request/callback projection whose contract requires it. A physical handle projection retains its real named ID. Existing caller-supplied edges with absent or own-undefined endpoint IDs retain their established declaration-order fallback; creating an edge from a null request does not create another absent-ID edge. This intentionally differs from pinned addEdge's deletion of null keys to preserve the physical selection made in Flow's accepted graph. Prove null and explicit-A requests share duplicate identity, then reorder A/B declarations and toggle mode before save/restore; accepted IDs and measured endpoints still select A. Separately prove existing absent-ID edges retain fallback semantics. Genuine unnamed declarations remain held.

**Not selected:** optional/null-ID Handle declarations, relaxing FlowHandleSchema.id, synthetic ID manufacture, new HandleAddress or measurement identity migration, a fourth default-handles format code. Those genuine original nullable/optional Handle/NodeHandle fields remain explicitly held with069/074 and a later independently reviewed domain extension. A passing null Connection default test cannot close them. Keep every original member ID/host cell. Their future domain extension may affect070 body/version policy and must be reviewed before final complete closure; do not silently expand pending2 through this bounded plan.

## Exact source scope

Existing core files: `flow-connection.schema.ts`/test, `flow-edge.schema.ts`/test, `flow.schema.ts`/test, `flow-reconnection.schema.ts`/test, `flow-connection-radius.schema.ts`/test where gesture kind matters; `flow-persistence.ts`/test, `flow-save-format-error.ts`, `packages/core/src/public.ts`. A new focused `flow-legacy-handle-compatibility.ts`/test may own old-format kind check; name is proposed. A new connection public-boundary schema/test may own nullable request facade if independently approved. No current measured schema or065 projection changes.

Host source: existing Vanilla `mount-flow.ts` gesture/endpoint/read methods/public declarations; Vue `flow-canvas.ts`/use-flow/public gesture/preview/edge resolution; Foldkit `graph.ts`/application/public/snapshot-client typed gesture/read/failure routes. Exact native call sites: Vanilla `mount-flow.ts:2706,2801,2854,6544`; Vue `flow-canvas.ts:2861,2887-2894,2981,3141,3175,3296,4529,4643,4760,4912`; Foldkit `graph.ts:792-806,2439,2657-2677,2706`. Inspect before editing and keep all changes attributable to this policy.

Tests: corresponding core/Foldkit unit tests, three-host interaction-lifecycle/renderer-contract/public-state suites and their existing fixtures; packed consumer probes. Docs/catalog/trace/PROGRESS/generated API as required by public change; plan/index/central acceptance records coordinator-owned. Capture/conformance additions can extend067's clean pinned harness for same-kind direction/render output only.

Follow `docs/standards.md`: Effect Schema-derived types; unknown decoded once; graph meaning/core workflows stay in packages; native DOM and lifecycle stay with existing adapters/apps. Reuse `FlowSpan.connectionValidate`, connectionStart/Complete, edgeReconnectStart/Complete, documentDecode/documentIntegrity, controllerUpdate and editFailure with existing `FlowAttribute` nodeId/handleId/edgeId/connectionIssue/inputKind/failureName/failureMessage. Structured logs at decode, semantic-change, lifecycle and failure boundaries; no pointer-move logging. Application composition owns OTLP export/flushing; collector delivery remains unverified.

Out of scope: origin formula changes,075 native rendering, genuine unnamed physical Handles, measurement addressing, dependencies/lockfile, private store access, old-reader fixture regeneration, arbitrary graph fields, renderer replacement, unrelated dirty work, commits/merge/push/publication without separate authorization. Stop and revise scope if another necessary semantic reader exists rather than improvising.

## Ordered execution and meaningful proof

1. Inspect baseline/citations/public callers and independent approval. Record complete original named-ID ConnectionMode/Connection/Handle/preview group routing, keeping null physical Handle and generic fields held. Confirm accepted065 geometry source; no second measurement authority. Run read-only probe to record drift. STOP on source-contract mismatch.
2. Add named directed construction, idempotent opposite-kind canonical helper, directed validation and explicit-ID resolver. Extend core graph integrity while adding frozen legacy kind validation/guard in the **same slice**. Do not leave generalized live integrity committed alone. Test strict/loose all four kind pairs, target-origin once-only direction, same handle, duplicates, missing node/ID, absent/own undefined fallback, declaration ordering and mode-independent stored endpoints.
3. Add exact new format reason/selection and reader matrix tests against independent frozen fixture. Test all three precedence levels with combined origin/native/noncanonical inputs; wrong/missing IDs must remain integrity failures. Verify old canonical output/type fixtures, old excess-key stripping and forged1 rejections. Implement2 after070 consumes this reviewed dependency, not inside an origin-only staged body here.
4. Migrate all real host gesture/reconnect/renderer readers and preserve existing native custom previews. Test actual accepted graph and measured DOM endpoints/side-aware paths for source-source and target-target; controller proposals versus acknowledgement; dynamic strict/loose no geometry jump; invalid/cancel/dispose no graph edit. Add public nullable Connection facade only if independently approved; prove fallback missing failure and resolved duplicate semantics while retaining genuine unnamed cells open.
5. Prove real typed Foldkit Runtime format-failure producer and same client lifecycle; matching new code settles once, no success/accepted notification/defect, later request success, duplicate/foreign/late failure and disposal. Migrate same-kind capable consumer/harness to additive070 before activation. Synchronous Vanilla/Vue legacy saves remain unchanged for original canonical domain.
6. Capture pinned direction/eligibility/render output twice via real public React paths. Separate target-target accepted gesture from pinned unrendered source-kind error; assert Flow's approved coherent rendering difference. Public callback/type/69payload fields require their own mappings; do not mark all471 members complete from these representatives.
7. Run focused scoped verification then full integration gate. Independent review owns DONE;067/070 remain open for other cells/dependencies.

Commands and expected outcomes:

- `bun run test -- packages/core/src/domain/flow-connection.schema.test.ts packages/core/src/domain/flow-edge.schema.test.ts packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-reconnection.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/foldkit/src/snapshot-client.test.ts` → all targeted pass; include new helper/schema tests when created.
- `bun run check`, `bun run typecheck`, `bun run check:architecture` →0, no casts/any/private imports introduced.
- Three host production browser commands with `interaction-lifecycle.e2e.ts`, `renderer-contract.e2e.ts`, `public-state.e2e.ts` filters, serial strict ports → all relevant cases pass, no new skips.
- `bun run test:consumer` → each host packed probes compile/mount; legacy return still literal1; additive union narrowed by version; nullable facade distinct from branded resolved contract.
- Update `verification.config.json` activeWork/checks/browserTests before this new task; `bun run verify --list` validates scope, then `bun run verify` → focused profile/scope recorded. `bun run verify:full` and `bun run release:dry-run` at combined067/070 integration →0. Focused pass does not establish full acceptance.
- Required declaration/docs/catalog/member/trace generators/checks and `git diff --check` →0. Do not hand-edit imported/generated evidence.

No unit suite/build/browser/capture/full verifier was run for this planning artifact; only the reproducible read-only compatibility probe above. Remote CI, trusted native input and collector delivery remain unverified.

## Done criteria and STOP boundaries

## Independent review amendment, 2026-09-30

Independent078 review requested the null-identity amendment now recorded above. Additional exact execution rules: fresh target-origin gesture construction runs once; reconnect is already directed and changes only its selected endpoint, retaining the other endpoint node/ID in source-source, target-target and reversed-kind cases. Neither reconnect nor direct validation invokes a gesture constructor/canonical helper. Strict validates the complete proposed pair; a noncanonical unchanged endpoint rejects atomically. Public normalizeFlowConnection retains omitted/strict identity; loose swaps only target-kind source paired with source-kind target; same-kind and unresolved pairs stay unchanged, so repeated application is idempotent. Remove both internal normalization calls in findConnectionIssue and validateFlowConnection; migrate Vue's independent normalized callback/both-endpoint overwrite path together with core.

A fresh legacy request against an unchanged noncanonical graph must fail independently; request IDs cannot make it serializable. After an acknowledged canonical replacement, the same Runtime/client must succeed. After070, an additive request for the noncanonical graph succeeds through the same client owner. Test exact failures, recovery, additive success, unchanged accepted notifications/revisions, and disposal separately. No downgrade or second client.

Exact proposed nullable boundary names are FlowConnectionRequestSchema/derived FlowConnectionRequest and resolveFlowConnectionRequest. It carries required source/target IDs and required HandleId|null request IDs; resolved FlowConnection retains required branded IDs. Explicit names do not approve all generic or unnamed branches. Primary source review agrees with the amendment; independent reviewer recheck APPROVED the amended policy; primary approved bounded core execution on 2026-09-30.

- [ ] Independent architecture review approves exact direction/resolver/legacy amendment before source.
- [ ] Every supported named same-kind accepted edge renders consistent measured endpoints through all hosts and round-trips2 without identity loss.
- [ ] Frozen/current/additive1 acceptance remains aligned for canonical/forged-noncanonical/missing/excess/undefined cases; no unsupported v1 emission.
- [ ] Real legacy failure/client producer settles once without graph/viewport/revision/accepted-state change or Runtime defect.
- [ ] Public/type/member evidence distinguishes named null-default Connection from held genuine unnamed Handle requirements;069/074 original groups retained.
- [ ] Selected reference proof, packed consumers, docs/trace/member checks and full combined integration verification inspected by independent reviewer.

STOP on an unapproved endpoint/direction policy; changing frozen reader behavior; accepting a frozen-rejected v1 graph; silent ID omission/downgrade; genuine unnamed identity/measurement changes; repeated normalization flips; unsound generic casts; a second graph/store/client; unlisted source dependency; or a required gate failing twice after focused repair. Preserve completed independent work and report exact command/seam.

## Conformity and deviations

### Bounded core review supplement: conformance evaluator dependency

Primary inspected `packages/conformance/src/index.test.ts:106-159` and the unchanged `research/fixtures/interaction-lifecycle.json` connection cases. The core-only verifier passed quality, architecture, builds/types and438units but failed this single evaluator: it separately normalizes fixture input and compares the historical target-target rendering-gap rejection against the now-approved directed validator. The fixture is shared with still-unmigrated host browser tests and must remain unchanged in this core stage.

Independent source review round1 explicitly extends the core stage scope to **only that one conformance unit test**. Treat its fixture inputs as fresh gesture inputs, construct direction once with `connectionFromHandleGesture`, inspect the actual returned validated connection/failure, and use the returned connection for `nextConnectionEdge`. Preserve the other fixture cases' exact expected directed connections, errors and IDs. For `loose-rejects-target-to-target-rendering-gap`, explicitly assert the approved loose target-target connection is accepted with target-origin direction and generated edge ID; label this superseding Flow contract while retaining the historical fixture. Do not invoke the public canonical helper as an internal gesture/validation step, change the fixture, skip the row, or claim native rendered parity from this core test. Pure core functions do not emit host callbacks: remove fabricated event-order assertions from this unit comparison; real browser event-order proofs remain in the later host stage. The complete normalizer matrix remains tested in the new core suite.

Run the conformance file and all targeted core tests, then rerun saved core-only focused verification. Record the original failure and this exact scope amendment. This is the first primary source-review revision, not host activation or a reset of historical gate failures. Generated declarations and public documentation remain required before final integrated host acceptance.

Primary reproduced revision1's saved core verifier:439units/47files, focused,15.028seconds. Full source review found duplicate eligibility resolves both node/handle identities for every edge before comparing its endpoint node IDs (`flow-connection.schema.ts:151`). Primary revision2 FINAL requires short-circuiting different source/target node IDs before the shared resolver, avoiding repeated node scans for unrelated edges on pointer validation. Preserve physical duplicate/fallback semantics and test that identical handle IDs on an edge to another node do not reject the requested pair. This changes only the existing connection implementation/test scope. Rerun targeted tests and saved core verifier, record the revision, then freeze for final primary reproduction.

**Source-derived eligibility conformity, runtime unverified:** named strict/loose kind pairs and target-origin direction follow pinned XYHandle; fresh public capture and all-host production tests remain required. **Proposed intentionally different accepted-edge rendering:** Flow resolves explicit named identities regardless capability kind, including target-target where pinned source lookup may fail. Reason is one coherent accepted graph/geometry; boundary is actual pinned output/error and Flow measured/restored endpoints. **Preserved old-format behavior:** endpoint-kind guards, literal1 and unknown-key policy stay frozen; noncanonical graphs require2 and a correlated format error. **Held, unverified original scope:** genuine unnamed Handle/NodeHandle, nested074 fields,069generic payloads and all other067 groups; no broad parity or parent closure claim.

## Primary bounded source acceptance, 2026-09-30

Final frozen core candidate independently passed saved focused verification in18.648seconds:440 unit tests/47files, quality, architecture, four package builds and workspace types. No host browser, packed consumer or full-suite claim follows. Primary read the complete diff and meaningful tests, including unrelated-edge endpoint prefilter, physical duplicate identity and frozen legacy compatibility. See directed-handle-primary-source-review.md. Prior two executor gate failures remain preserved; primary reproduced the final frozen correction independently without another executor repair. Host migration and complete070 v2 remain pending.
