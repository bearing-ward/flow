# Plan 070: Migrate origin-aware persistence while preserving legacy v1 contracts

> Separate executor only. Read the full plan, compare source excerpts, and run each gate. Do not commit, merge, push, or publish. The advisor maintains the index. This is a required child of 067 and 057, with acceptance owned by 066.

## Status

- Priority: P1
- Effort: M
- Risk: HIGH
- Category: migration
- Planned at: `de36b4f`, 2026-09-29
- Status: APPROVED architecture, independently reviewed by `review_070` on 2026-09-29 after one focused revision. 075 exact staged amendment independently approved on recheck. Shared legacy projection/guard/client implementation may precede origin geometry after that approval; final v2 implementation waits for the accepted origin/native field snapshot. No implementation or compatibility proof is claimed.
- Depends on: approved 066 decomposition; approved 067 origin design. The frozen legacy prerequisite precedes origin/native live fields; final additive migration follows067 origin and068/074 native schemas in the same reviewed snapshot. Plan 067 requires approval of this design, not completed migration code, so there is no circular implementation prerequisite.

## Why this matters

Origin changes the meaning of stored positions. A v1 reader that ignores an added origin field interprets those positions incorrectly. Versioning must make that failure explicit while preserving old saved graphs and existing public v1 signatures.

## Current state

- `packages/core/src/domain/flow-persistence.ts:13-24` builds saved nodes from the live node schema after removing selection, then saves nodes and edges only. Extending the live schema without changing this projection would also extend the v1 format.
- `flow-persistence.ts:27-40` exports document/session schemas with `version: S.Literal(1)`. Existing public encoded types derive from these schemas.
- `flow-persistence.ts:43-57` encodes v1 synchronously and decodes through an Effect, then graph integrity. `:61-77` composes session viewport without a second graph owner.
- `packages/core/src/domain/flow.schema.ts:63-84,138-141` has no node or document origin. Plan 067 adds the finite, unclamped origin tuple and its geometry semantics.
- `packages/core/src/domain/flow-persistence.test.ts:14-118` verifies nested graph round trips, graph metadata and exclusion of selection. `:120-151` checks unsupported versions and parent integrity.
- `packages/core/src/public.ts:374-384` exports the existing v1 schemas, encoders, decoders and types.
- Parent 057 WP3 currently requires sessions without changing saved-document v1. This amendment permits an additive origin-aware format; it does not change the legacy v1 API contract.

Match the existing Effect Schema-derived types and graph validation. New saved data enters as unknown and crosses one version/schema boundary. Measurements, DOM, renderer functions, transient previews and selection remain outside persistence.

## Proposed parent 057 policy amendment

Replace the v1-only instruction for new origin-aware content with this exact policy after independent approval:

"Preserve existing saved-document/session v1 APIs, output and reader behavior for origin-free content. Add separate origin-aware document/session schemas and APIs with an explicit v2 envelope. A new additive reader accepts supported v1/v2 envelopes and applies normal graph integrity. Existing v1 readers keep rejecting v2. Never serialize origin semantics inside a v1 envelope. Origin-aware host save/restore uses the additive APIs only after geometry and migration proof pass."

Legacy API signatures and their literal version types remain stable. Existing v1 encoders fail explicitly when asked to encode a graph containing any own origin metadata, including explicit [0,0]; they must not silently discard it. Origin-free calls retain their current behavior. Document this failure boundary and test the public functions.

After approval the coordinator replaces parent 057 WP3's sentence at `plans/057-finish-public-api-correspondence.md:104` with the quoted policy, records the reviewer/verdict here and in central section 067, and updates Plan 067's prerequisite to this reviewed child. Historical Round2 rejection records remain dated history; append the superseding reviewed decision rather than erasing it.

## Approved contract required before execution

The following names are proposed exports, not current APIs:

- `SavedOriginFlowDocumentSchema` and `SavedOriginFlowSessionSchema` use literal version2 and preserve optional document nodeOrigin/node origin plus exactly075's reviewed node connectable, node/edge ariaRole and empty node description/node/edge label branches. The unreleased body is expanded once; no intermediate v2 compatibility claim or v3 is introduced.
- `SavedVersionedFlowDocumentSchema` and `SavedVersionedFlowSessionSchema` are v1/v2 unions with schema-derived encoded types.
- `encodeVersionedFlowDocument` and `encodeVersionedFlowSession` choose v1 only when075's exact extension predicate is absent; choose v2 for any own document nodeOrigin/node origin/node connectable/node ariaRole/edge ariaRole, or empty node ariaDescription/node-or-edge ariaLabel. Own undefined of a new field name requiresv2 and is omitted in JSON, without an own-presence round-trip promise. Do not infer this choice from effective default coordinates or normalize explicit [0,0] away.
- `decodeVersionedFlowDocument` and `decodeVersionedFlowSession` decode unknown supported envelopes, then validate graph integrity; v1 restores with implicit [0,0] and no injected origin keys, v2 preserves exact explicit metadata.
- Existing `SavedFlow*` schemas/functions/types remain v1. Freeze their field projection rather than deriving new semantic fields into v1. Their decoders reject v2 by version literal.
- No implicit downgrade. Converting v2 to v1 is outside scope because flattening anchors to top-left requires explicit geometry and loses origin intent.

Export `SavedOriginFlowDocument`, `SavedOriginFlowSession`, `SavedVersionedFlowDocument` and `SavedVersionedFlowSession` from their authoritative schemas. Versioned encoder results are the v1/v2 discriminated union, narrowed by `version`. Do not promise conditional literal inference from the static `FlowDocument` argument. Existing legacy results remain literal 1.

### Additive host entry points and Foldkit failure handling

Vanilla controllers and Vue `useFlow` add `getVersionedSavedSession(): SavedVersionedFlowSession` and `prepareVersionedRestore(saved: unknown): Promise<FlowSnapshot>`. Keep `getSavedSession(): SavedFlowSession` and `prepareRestore(saved: SavedFlowSession): Promise<FlowSnapshot>` unchanged. Legacy save rejects an origin-bearing graph with an explicit documented format error; versioned methods support it. Every origin-aware demonstration and consumer must call the new methods. Origin-free callers keep their existing APIs and literal-v1 inference.

Foldkit adds `VersionedSnapshotRequestSchema`, `VersionedSnapshotResponseSchema`, schema-derived types, `versionedSnapshotRequests` inbound and `versionedSnapshots` outbound ports. Versioned response contains the current snapshot/query projections and a `SavedVersionedFlowSessionSchema` saved session. Reuse graph selectors on the same Runtime authority. Add public `prepareVersionedSavedSession(saved: unknown)` Effect helper in graph.ts. Existing `SnapshotRequestSchema`, `SnapshotResponseSchema`, ports and v1 success response remain unchanged for origin-free graphs.

Existing Foldkit `SnapshotRequest` unconditionally runs the v1 encoder (`application.ts:1844-1846`). Guard the unsupported origin case before building that response. Add LegacySnapshotFailureSchema with requestId and code union origin-requires-versioned-session | native-fields-require-versioned-session, and outbound snapshotFailures. Reuse064's snapshot client; map code to its failed reason union with the existing invalid-request/send-failed literals, and dispose both subscriptions. Origin wins if both metadata families occur. Emit one correlated failure for that case and no success, without throwing or updating the graph. Document that new origin-aware clients must use versioned ports, and expose an additive public request client that listens for correlated success/failure, settles the pending read with a Schema-derived typed failed result, and settles on disposal. Migrate every repository asynchronous snapshot consumer to this client or the versioned ports when it can receive origins, including accepted-state observers. Raw port integrations must subscribe to both response and failure channels when using new origin-bearing graphs; the legacy protocol remains complete for its original origin-free domain. Do not claim an old raw-port client can understand a new error channel automatically.

Tests must prove ordinary versioned reads, a legacy request's explicit correlated failure, fresh requests after failure, no Runtime-loop defect, no leaked pending client request and no accepted notification caused by failed save. If the existing Runtime cannot represent or deliver this separate failure channel safely, STOP and report that concrete seam before implementing origin support.

Reader matrix:

| Reader | Origin-free v1 | Origin-aware v2 | Unknown version |
| --- | --- | --- | --- |
| Frozen baseline reader at de36b4f | Accept unchanged | Reject literal version | Reject |
| Current legacy v1 reader | Accept unchanged | Reject literal version | Reject |
| Additive versioned reader | Accept without injecting origin | Accept and preserve metadata | Reject |

For each API error, failed restore must leave accepted graph/viewport unchanged and emit no accepted-state notification. Controlled restore returns a proposal; acknowledgement remains owner-owned. A format change never creates a second graph authority.

## Scope

- `packages/core/src/domain/flow-persistence.ts`, its tests, `packages/core/src/public.ts`.
- New `packages/core/src/domain/flow-origin-persistence.test.ts` and a frozen v1 test fixture under `packages/conformance/src/fixtures/legacy-v1-persistence/`. Capture that fixture from de36b4f with its source revision; do not import the expanded current schemas into the frozen reader.
- Existing host save/restore public boundaries in Vanilla mount/public, Vue use-flow/canvas/public, Foldkit application/graph/public/observers; the existing064 Foldkit snapshot-client.ts and its tests, extended with the reviewed failure and versioned channels; matching public-state and public-edit fixtures/tests and packed-consumer probes. Existing repository snapshot consumers in apps/foldkit source and E2E harnesses may change only to consume the explicit success/failure client or additive versioned ports.
- Existing declaration/document generators and their authorized outputs; docs/public-api.md, docs/react-flow-api-correspondence.md, research/traces/public-api-completion.md, research/PROGRESS.md, member catalog/066 manifest, this plan and parent/067 planning records.
- Extend the pinned origin reference fixture/capture owned by 067 only for persistence observations needed here. Upstream React `toObject` has no Flow format version; its payload is reference evidence for origin retention, not evidence for Flow envelope compatibility.

Out of scope: origin geometry implementation already owned by 067, arbitrary downgrade, dependency/lock changes, private store writes, imported evidence edits, publication, unrelated recipes. Do not change legacy saved public types to a union merely to make host integration convenient.

## Steps and verification

1. Before live origin/native field changes, execute075's shared legacy prerequisite: freeze the de36b4f v1 reader/writer fixture and representative nested saved document/session; freeze every original field/constraint; guard legacy encoders with075's exact extension predicate; add the correlated failure port and extend/migrate064's same client. This stage does not require geometry or versioned response ports. Inspect the fixture rather than recreating a reader from new schemas. Record allowed field projection and source revision. Verify `bun run test -- packages/core/src/domain/flow-persistence.test.ts` passes and the frozen reader rejects a v2 literal.
2. Add separate v2 schemas, versioned unions and additive functions. Make legacy projections independent of new origin fields and reject attempted v1 origin serialization. Test explicit [0,0], global/per-node precedence metadata, negative/outside-unit origins, nested parent data, unknown versions, invalid dimensions/tuples, missing parents, measurement/selection exclusion and immutable inputs. Verify `bun run test -- packages/core/src/domain/flow-origin-persistence.test.ts packages/core/src/domain/flow-persistence.test.ts` and `bun run typecheck` pass.
3. Wire host origin-aware save/restore through the exact additive methods/ports/client above. Origin-free host saves still return version 1. Test actual accepted graph/viewport before and after restore, controlled proposal versus acknowledgement, rejected version/integrity input, two independent owners, legacy Foldkit correlated format failure and disposed operations. Run the three public-state browser filters serially and `bun run test:consumer`; expect all pass without new skips. Consumer probes must also retain existing literal-v1 API inference and narrow additive union outputs by version.
4. Reconcile origin persistence members to exact public exports/tests. Update the trace from host public entry through version decode, graph integrity, owner acknowledgement and rendered restored bounds. End with Conformity and deviations; separate upstream origin retention from Flow's intentionally different format and test boundary. Run `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, both member checkers and `git diff --check`.
5. Run `bun run verify` and `bun run release:dry-run`. Independently review full scope/diff/tests before proposing 070 DONE. Plan 067 and parent 057 remain open if other required cells or generic integration are missing.

## Commands and done criteria

Install fresh isolated dependencies with `bun install --frozen-lockfile`, unchanged lock. Quality `bun run check`, types `bun run typecheck`, architecture `bun run check:architecture`, unit `bun run test`, packed `bun run test:consumer`, complete local `bun run verify`, dry-run `bun run release:dry-run` all exit 0. Browser commands are `bun run test:browser -- public-state.e2e.ts`, `bun run test:conformance:vue -- public-state.e2e.ts`, `bun run test:conformance:foldkit -- public-state.e2e.ts`, serially on strict ports.

- [ ] Independently approved parent amendment and central 067/070 contract are recorded before product source execution.
- [ ] Reader matrix passes against frozen de36b4f and current readers through real public exports.
- [ ] Origin-free v1 fields/output/types remain unchanged; v1 rejects origin metadata; additive APIs select and preserve v2 explicitly.
- [ ] Three host public save/restore paths preserve rendered origin geometry, proposal ownership and failure atomicity.
- [ ] Member-specific evidence, generators, scope/whitespace, packed consumer and full verify pass.

STOP on unapproved contract changes, unsupported codec requirements from 069, out-of-scope geometry edits, repeated gate failures after two focused repairs, silent origin loss, hidden legacy signature changes or private graph access. Report actual failed command and preserve independent work. Do not make skipped native device/collector/hosted CI claims.

## Maintenance

Any future semantic field needs its own version/projection compatibility review. Tests must keep the old reader frozen; importing current node schemas into it would erase the compatibility proof. Origin-aware and legacy consumer fixtures must remain separate.

## Snapshot-client integration checkpoint, 2026-09-29

064 now owns the reusable createFoldkitSnapshotClient: it preserves raw success ports and wraps correlated outcomes in a Schema-derived succeeded/disposed/failed result.070 reuses that client and adds an explicit origin-format failure variant when the legacy failure port exists, settling the pending read once. Native consumers handle that typed failure; no second request client is introduced. The pending v2 body also needs075's native-field compatibility review before first implementation.075 does not authorize expanding v1 or silently dropping newly accepted fields.

## 075 staged compatibility amendment, 2026-09-29

The complete frozen projection, live/presence/default and old/new reader/writer matrices, exact failure protocol and acyclic stages are embedded in Plan075 and its independent review artifact. They supersede origin-only version selection and the earlier competing-client scope. Existing literal-v1 readers retain their actual unknown-key stripping behavior; they rejectv2 by its literal version but cannot promise to reject forged v1 unknown extensions. Only the new additive reader rejects known extension semantics insidev1 before stripping, while retaining unrelated excess-key behavior. Supported legacy writers reject such semantics before output. Empty edge labels are an approved Flow policy difference from pinned endpoint-text fallback, requiring computed-name proof. Independent amendment recheck is APPROVE. Stage1 fabricated update inputs are unit evidence only; real public format-failure production proof waits for live fields. Final migration and member acceptance remain open.

## Checked legacy prerequisite boundary, 2026-09-30

The bounded075 frozen legacy projection/guard/failure-client prerequisite is independently approved after fullverify. It preserves literal-v1 behavior and supports safely correlated failure without adding live fields orv2. Raw success-only delete/placeholder consumers remain in their original domain and require explicit migration before live activation. Final additive migration still waits for accepted067 geometry/origins and068/074 native schema snapshots; those source prerequisites are blocked/open. See legacy-prerequisite-execution.md for actual stage counts, test boundaries and supplemental runner limitation.

## Complete source-stage execution and shared-client clarification, 2026-09-30

Accepted isolated080 origin/native source and078 directed named-handle core now satisfy source inputs for the complete unreleasedv2 body. Accepted065 proof and independently reviewed33-scenario pinned capture join the isolated complete-persistence-integration assembly; preserve exact patch/file hashes and overlap decisions. Existing histories remain unchanged. Source/method/port/client acceptance precedes081 activation; final rendered070 acceptance follows081 to avoid a circular prerequisite.

The independent reviewer approved this exact additive clarification: overload the same createFoldkitSnapshotClient factory with complete versioned ports first, returning FoldkitVersionedSnapshotClient with requestVersioned and the unchanged legacy request. Legacy three-port inputs retain FoldkitSnapshotClient and literal-v1 result inference. Derive versioned query/result data from authoritative request/response schemas. One owner, request sequence and protocol-tagged pending map correlates both channels; a matching ID on the wrong protocol channel is ignored before decode or settlement, including a legacy failure during a versioned request. Dispose all subscribed channels and settle each pending request exactly once. Reuse existing format/invalid-request/send-failed reasons; no competing factory/client ownership.

Required proof covers installed declaration inference, the real complete Runtime ports, legacy failure followed by versioned success on the same owner, wrong-channel then correct-channel success, foreign/duplicate/late responses, disposal and send failure. Migrate actual extension-capable repository readers and accepted observers before081 activation. Do not weaken old legacy signatures or frozen v1 reader/writer behavior.

The complete v2 selection additionally includes valid explicit named endpoint identities that are noncanonical for their directed endpoint kinds, as approved078. Legacy reason precedence is origin, native fields, noncanonical handles, after ordinary graph integrity validation. Additive v1 decode checks known extension semantics and noncanonical kinds before old projection strips fields; v2 uses accepted live integrity. Saved configuration, selection, preview, DOM measurements and style remain excluded. One complete unreleasedv2, no intermediate2 or v3.

## Saved-output ownership correction, 2026-09-30

Primary independently reproduced nested aliases in current supported legacy and new additive encoders: Schema JsonObject encoding copies the outer data object while retaining nested object/array references. A caller mutating returned saved data can thereby modify a mutable accepted document without a command. Authorize a narrow detachment correction at the shared saved-output boundary in the already scoped persistence file. Preserve exact serialized values, raw own undefined, version selection, frozen reader/writer output oracle, literal-v1 signatures and all format/error behavior. Cover legacy document/session and both additive v1/v2 branches with meaningful returned nested object/array mutation assertions against unchanged input and actual public accepted state. No generic/class codec or new schema/version is introduced.

The same ownership correction includes the existing shared Foldkit snapshot/query output projection in application.ts. A primary constructed-model update followed by the actual VersionedSnapshotResponseSchema decode retained nested authority references through snapshot, node and nodesData fields; this is lower unit-boundary evidence, not a mounted Runtime claim. Detach the complete shared output projection before either protocol's delivery, preserving all selectors/values/types and one Runtime authority. Actual client/Runtime mutation assertions must prove delivered nested node/edge/array data can change independently while a fresh public read, accepted revision and notifications remain unchanged. Development model freezing must not substitute for an independently owned delivery. No framework port redesign or generic codec is authorized.

## Existing demo save/restore consumers, 2026-09-30

Primary inspected three real save buttons that bypass supported writers by encoding `{version:1, document:liveDocument}` through the frozen schema: Vanilla main.ts:587,898-949; Vue main.ts:487,637-700; Foldkit main.ts:552,1159-1203. After live activation they can silently strip known semantics. Authorize exactly these existing apps/vanilla/src/main.ts, apps/vue/src/main.ts and apps/foldkit/src/main.ts save/restore imports, local payload and handlers to consume the approved additive session methods/response/helper. Vanilla host.getVersionedSavedSession/prepareVersionedRestore and Vue useFlow methods preserve proposal/owner acknowledgement; Foldkit uses the actual versioned response savedSession and public prepareVersionedSavedSession Effect helper, then existing owner actions. Their ephemeral local wrapper is not a public saved format. Preserve current button behavior/messages, viewport restoration, transient exclusion and reset; do not add a new UI or bypass writer/version selection. Existing explicit legacy API tests remain separate. These files are included solely as real existing persistence consumers before081 activation; no unrelated demos are in scope.

## Directed gesture consumer prerequisite, 2026-09-30

The composed source stage's saved focused gate exposed an existing caller dependency on the accepted 078 change. In Vanilla `apps/vanilla/src/mount-flow.ts:6540-6561`, fresh `commitConnection` constructs initiating endpoints and passes them directly to directed validation. Vue `packages/vue/src/flow-canvas.ts:2972-2987` does the same in `proposeConnection`. Foldkit `packages/foldkit/src/graph.ts:805-827` uses explicit normalization in `finishConnection`. Primary personally inspected all three paths and the accepted core `connectionFromHandleGesture` constructor at `flow-connection.schema.ts:199-228`.

For a fresh gesture begun from a target handle, the initiating physical endpoint is the directed target. The accepted constructor chooses that direction once. The existing shared loose-reversed-kind test correctly expects this; its assertion must not change. Vanilla's observed initiating-target-as-source edge is a migration defect, not an intentional new contract.

Permit exactly the existing fresh commit routes in those three files, their required public helper imports and direct use of the constructor's validated result as a prerequisite to source-stage verification. This adds `packages/vue/src/flow-canvas.ts` to the bounded 070 allowlist solely for `proposeConnection`. Vanilla and Foldkit files are already in scope. Pass the accepted document, initiating node/handle IDs, hovered node/handle IDs and current mode to `connectionFromHandleGesture`; consume its successful directed value for validators, callbacks, edge construction and existing lifecycle results. Do not normalize it again. Foldkit must consume the returned validated value rather than retaining a separately normalized candidate. No duplicated local direction algorithm, second authority, unchecked cast or assertion changes.

This is the exact fresh-commit migration already approved in Plan 081 architecture, brought forward to keep the 070-to-081 order executable. It does not authorize new preview payloads, thresholds, start eligibility, radius, origin rendering or reconnect behavior in this stage. Those remain Plan 081. Preserve the failed focused log and every shared test expectation; rerun targeted shared connection cases through all three production hosts, then the saved focused gate. Freeze and independently review this prerequisite with complete 070 source before 081 activation.
