# Marker codec structural preflight results

2026-10-02. Plans-only evidence for the frozen continuation design SHA `8f05f10bee7b1d926da68c82c429b87569ca7f21dc88f6df2cdd8dd16fe661e2`; predecessor SHA `d1769f5c8ff8c6d0d3747a6f9a83229c104c351cfb79e3420c58303b05ad9612`. The design itself was not amended during this preflight. No product source, dependencies, build artifacts, ports, browser, capture, Runtime lifecycle, member ledger, commits or numbered plan changed. Only the authorized probe and result files under main plans were written. Main path: `/Volumes/Sync/codex/9-19-26/flow`.

## Decision and exact evidence boundary

**Recommend the canonical public Struct plus private validating Declaration at owned composite JSON positions.** The installed API can parse and encode this representation synchronously, preserve normal Type/Encoded contracts and optional presence, and delegate equivalence to the canonical Struct. The actual prototype passes strict/exact-optional compilation with 16 meaningful negative probes and 3,092 primitive assertions in 24 test groups. This settles the bounded API viability question; it does not approve a product diff or establish mounted preservation, semantic closure or HMR.

The competing exported Declaration/fields-facade proposal is rejected. Private Declaration has neither `.fields` nor `.mapFields`; adding fields with Object.assign still lacks `.mapFields`. Three expected compiler errors and two actual property checks establish that failure. No assertion or cast presents it as S.Struct. No actual imported schema was mutated. The comparison only adds a property to the plans-only candidate instance, never to its AST.

The selected candidate preserves public canonical Struct operations, including `.fields`, `.mapFields`, `.annotate(...).fields`, `.check(...).fields`, rebuild through S.Struct and branded decoded types. It **does not change Type into Encoded**: existing branded EdgeId/NodeId decode to branded strings, while ordinary encoded identities remain strings. The initial mistaken cross-comparison was fixed, not bypassed. The successful compile independently checks each direction of the candidate's normal Encoded contract against the canonical Struct's Encoded contract and decoded compatibility against its Type. The candidate has no service requirements; actual synchronous successful/failing parsing is tested in addition to never environments.

**Remaining explicit boundary:** standalone `Schema.toCodecJson` on the widened canonical edge Struct is still lossy for own-undefined versus null color. The ignored-hook probe reproduces it. The private Declaration supplies the lossless codec only where the composite uses it. This recommendation therefore governs Flow's explicit owned save/edit/Model boundaries; it is not a guarantee for a caller independently deriving JSON from the bare Struct. Before source dispatch, the primary/cold reviewer must expressly accept that boundary or require a further nested marker-configuration Declaration probe preserving standalone derivation while retaining the canonical configuration fields authority. No silent claim of universal public Schema JSON preservation is permitted. Existing ordinary public Schema decode/encode and ports remain native-value routes with the same types. This is a real representational constraint, not a missing annotation spelling.

## Accepted inputs and versions

All **128** files in accepted 085's external freeze were rehashed by each runtime attempt. No mismatch occurred. Freeze path: `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/origin-edit-resumption-evidence/final-freeze.json`; SHA `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`. Source checkout (**A**) is `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`, detached Git baseline `841be137e253cf19c665269eaaa79edc19abf3c3` plus accepted frozen working changes. A is not clean; its accepted freeze, not HEAD alone, identifies the source.

Read and executed exact installed Effect `4.0.0-rc.116`, Foldkit `0.163.0`, TypeScript `5.9.3`. The probe imports installed A Effect dist entry, actual A core public source, actual application/graph/delete-approval modules and named actual internal schemas. Foldkit application imports `@flow/core` through its workspace symlink to the already-built core package; package exports use dist. That existing `packages/core/dist/public.js` was read/hashed, not rebuilt. Its hash and all directly inspected important source/runtime hashes are recorded in accepted runtime JSON. Synthetic candidate shapes reuse actual `.fields`; they do not replace a program Model or provide a Runtime serializer.

## Personally inspected API dispatch

Paths below are in A; installed files start at node_modules.

| Exact source | Observation and policy |
| --- | --- |
| `effect/src/internal/schema/toCodec.ts:73-118` | Declaration:75-82 consumes toCodecJson/toCodec; Objects:100-102 recurs without that hook. The original Struct annotation proposal is invalid. |
| `effect/src/Schema.ts:498-524` | declareConstructor takes schema parameters and an Issue-returning parser. Candidate parsing delegates to the resolved canonical Struct parameter. |
| `effect/src/SchemaParser.ts:262-272` | decodeUnknownEffect returns validated decoded Type with SchemaIssue.Issue; candidate invokes it for unknown input rather than asserting an unchecked type guard. |
| `effect/src/Schema.ts:562-575` | declare merely returns input after a supplied type guard. This shortcut was not used. |
| `effect/src/Schema.ts:6386-6395` | link connects the Declaration to the marker-specific wire schema with typed getter directions. |
| `effect/src/SchemaTransformation.ts:437-445` | transformEffect supplies fallible checked inverse getters. Probe getters perform synchronous SchemaParser operations only. No promise/services/suspension. |
| `effect/src/Schema.ts:3298-3368` | Struct exposes genuine fields/mapFields and reconstruction; Declaration does not acquire those operations by attaching fields. |
| `effect/src/internal/schema/toEquivalence.ts:15-25,100-114`; `Schema.ts:13900` | explicit Declaration equivalence annotation delegates to the parameter's Struct equivalence, preserving optional own-key comparisons. No reference-equality fallback. |
| `effect/src/Schema.ts:14919-14932` | hook service types alone do not guarantee synchronous execution. Concrete runSync parser checks supplement the never environment. |
| `effect/src/SchemaAST.ts:915-929` | default Undefined JSON representation is null. Actual legacy Model endpoint undefined round trips correctly through this sentinel; nullable object color is the reproduced ambiguity. Do not call every undefined sentinel a defect. |
| `foldkit/dist/runtime/runtime.js:100-104` | Runtime derives ModelJsonCodec with toCodecJson and uses decodeUnknownExit/encodeUnknownSync. Actual lifecycle was not exercised here. |
| `foldkit/dist/runtime/hostConnector.js:7-26,39-62` | inbound normal Schema decode and native outbound values/microtask listener delivery are distinct from Model canonical JSON. No host connector was executed. |

## Proven candidate representation

One canonical candidate edge **Struct** widens the actual public Struct marker fields. One canonical candidate configuration Struct contains the full proposed marker field contract; defaults reuse the actual defaults Struct fields. Known reserved marker metadata is represented with `S.optionalKey(S.Never)` in live shapes, so own metadata (including own undefined) is rejected without rejecting unrelated excess keys. This is an explicit structural implementation proposal for the already-reviewed reserved-key policy; these impossible keys have no valid live values. It changes no accepted graph meaning. The preflight does not execute a product API containing these fields.

The private edge Declaration takes `[canonicalEdgeStruct]`. Its decoder receives the resolved schema parameter and delegates parsing, so it has exactly that parameter's type/validation authority. Its JSON hook returns a link to the dedicated wire edge schema, with synchronous checked inverses; its equivalence delegates to `[shapeEquivalence]`. A matching private defaults Declaration preserves default endpoint/color presence in the Model. No metadata enters the live decoded object, normal encoded object or user data. Literal/template/string/object branches remain distinct.

Wire flags use the frozen design names `markerEndpointPresence` and `colorPresence` with `explicit-undefined`; no generic presence tag. The endpoint metadata parser validates a checked raw Record before composing into known start/end Struct fields: unknown metadata keys and undefined/wrong values fail before stripping. Whole edge and marker object checks reject flag/value conflicts, including own undefined values. Inverse encoding removes undefined endpoint/color keys and adds exact flags; decoding restores own undefined keys before validating the canonical live Struct. Unrelated normal fields retain their normal derived JSON codec.

Actual accepted canonical example:

```json
{
  "id": "e",
  "source": "a",
  "target": "b",
  "markerEnd": { "type": "arrow", "colorPresence": "explicit-undefined" },
  "markerEndpointPresence": { "start": "explicit-undefined" }
}
```

It decodes to own markerStart undefined and an object markerEnd with own color undefined. The accepted result records both edge and defaults canonical wire examples. They contain no native functions/DOM, global color/default decisions, URL, instance ID or extra graph.

## Actual reach inventory versus tested synthetic reach

Production call paths remain A's actual public composition: `application.ts:2513-2540` initialModel; `createProgram` supplies its existing Model at2576; Graph Model holds the document/defaults. Query and edit requests enter real declared ports, update cases and commands; the probe invokes **Schema paths**, never these Runtime commands, reducers, subscriptions, DOM effects or callbacks.

| Production schema/caller | Actual edge-bearing location | Probe boundary / proposed reach |
| --- | --- | --- |
| `core/domain/flow.schema.ts:115-149` | public Edge Struct; Document.edges:144 | actual public legacy baseline; candidate canonical Struct stays genuine, candidate Document item uses private Declaration |
| `foldkit/src/graph.ts:185-211` | document:187, defaultEdgeOptions:204 | actual Model fields reused; candidate private defaults wrapper is essential, not saved caller configuration |
| `core/domain/flow-default-edge-options.ts:15-34,81-85` | serializable default marker slots and normal default spread | both ordinary Schema and JSON candidate default routes; inheritance/suppression checked under absent and explicit literal defaults |
| `core/domain/flow-snapshot.ts:8-29` | Snapshot.document; StateChange.previous/current | candidate Snapshot document uses the same candidate Document, not a second graph |
| `foldkit/src/application.ts:291-299,617-626` | animation.previous snapshot; graph; pendingDeleteApprovals | source-composed **synthetic CandidateModel**, full actual top-level field reuse; all these slots round trip |
| `foldkit/src/delete-approval.ts:14-18`; `core/domain/flow-delete.schema.ts:5-16` | approval.candidate.edges; decision union | candidate Approval/candidate array tested; actual approval Runtime send/settle/cancel not exercised |
| `foldkit/src/application.ts:201-224` | SnapshotResponse.snapshot/edge/handleConnections; versioned response spread | reduced candidate Query tests all three live edge placements; it is **not** the full actual response, which additionally contains current saved schemas and other payloads |
| `core/domain/flow-edit.schema.ts:21-29,38-42,94-97` | set/add edge arrays; JSON update patch; result.document | candidate set/add arrays tested; actual update patch rejects raw undefined and accepts flags as JSON transport only; core flag interpretation still requires source implementation |
| `core/domain/flow-change-compatibility.ts:80-90` | add/replace item | candidate add/replace composite parser and canonical JSON round trips |
| `core/domain/flow-runtime.schema.ts:795-829,840-861` | add/reconnect edge; proposal.document | candidate add/reconnect JSON routes tested; proposal transitively uses Document when integrated; no gesture/reconnect behavior claim |
| `foldkit/src/application.ts:153`; `foldkit/src/graph.ts:320` | ReplaceDocument actions/messages | same actual document schema reach; no message dispatch was simulated |
| `foldkit/src/application.ts:338-363,694-698,763-809,840-869` | actions/edit/approval inbound; changes/snapshots/versioned/acceptedStates/editResults/deleteResults outbound | personally traced actual registrations and emit boundaries; ordinary Schema baseline plus candidate normal Query tested, **no actual Runtime port execution** |
| `core/domain/flow-persistence.ts:58-74,245-254,300-361` | frozen saved edges; additive v2 body/readers | current saved schemas remain actual literal-only source; dedicated candidate wire tested independently. Whole saved envelope selection/restore/persistence/client behavior not implemented or tested |

The first column abbreviates `packages/core/src/` and `packages/foldkit/src/` under A. Existing query/delete/edit result/acceptedState composites inherit Document; direct edge/item arrays require deliberate private wrapper placement only if they derive JSON. Ordinary native ports can retain the canonical Struct because their typed values preserve own keys already. Do not replace every semantic decoder simply to route JSON. The final implementation inventory must name exactly which composite canonical JSON contracts are supported, propagate wrappers there, and prove actual normal encoded types remain compatible. A caller deriving JSON from a composite left on the bare widened Struct has the same disclosed color risk.

Source scope beyond the prior 073 hard list is not silently approved: integrating all tested JSON composites could additionally touch `flow-snapshot.ts`, `flow-delete.schema.ts`, `flow-change-compatibility.ts`, `flow-runtime.schema.ts`, and Foldkit `delete-approval.ts` plus focused adjacent tests. The later source plan must choose the exact owned serialization reach, freeze this allowlist with primary/cold review and keep frozen saved-v1 schemas separate. Default/Document Model reach is mandatory. Direct native-only query/edit/change schemas must preserve ordinary contracts regardless of JSON placement.

## Actual outputs and first failures

Commands ran from main, with existing compiler only:

```sh
./node_modules/.bin/tsc --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --target ESNext --lib ESNext,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --skipLibCheck plans/marker-minimap-codec-structure-probe.ts
bun run plans/marker-minimap-codec-structure-probe.ts
```

Compiler logs are preserved, including unsuccessful attempts:

- First source SHA `8e313ebb925f10b3e17b3f42eb84d0798f1f65ce941855088d67dda1f77abfcc`: `compile-first.log` retains TS2375/2379 for incorrectly comparing plain Encoded identities with branded decoded Type and TS2345 for a heterogeneous set/add schema loop. The initial yielded session identifier was not retained, so its exact process exit is unavailable; no zero-exit claim is made. Repairs compare each contract against the correct type and use separate typed branches. `compile-repair.log` then exit0; no output.
- First runtime source SHA `41279142471d386dcf317b964e982b88918a9fed27650e9ff483c066fb299fa1`: `runtime-first.json`/`.log`, exit0, 2,870 assertions, 23 groups, no failures. This initial successful primitive output is retained.
- Assertion-strengthening source SHA `cfb166c5b1501fcd6d3138a3d1783194667d2fd8c13d3309869cca6287cb60a5`: `compile-final.log` exit2 because installed Predicate has no isRecord; `runtime-final.json`/`.log` exit1 with that exact error in the new canonical-wire assertion. It was an auditor probe mistake, not an accepted codec failure. Replaced the invented helper with actual WireEdge Schema decode, preserving validation and avoiding a cast/type guard.
- Frozen final source SHA `b822846a2c16d13ce60b4f5b6f8ae8b8274e1da6aad00fbb97e8683d92b7d5dd`: `compile-accepted.log` exit0, empty; `runtime-accepted.json`/`.log` exit0, **3,092 assertions, 24 groups, 16 negative type probes, no failures**. Hook counts: Declaration JSON hooks2; canonical edge parser903. All32 malformed decode/encode operations asserted typed failures and absence of defects/interrupts; no async-suspension success substitute.

Every receipt filename above starts with `plans/marker-minimap-codec-structure-`. Final source and all receipt hashes are in the external result JSON; that manifest does not hash itself. Failed and initial receipts were not overwritten. No lint, architecture/package build, broad verifier, test suite, release command, browser, port, device or collector check ran.

## Acceptance and remaining gates

Proven primitive cases: endpoint absent/own undefined/both own undefined/empty/arbitrary reference; both arrow symbols; object color absent/own undefined/null/empty/full CSS color; zero dimensions/strokeWidth and empty/nonstandard units/orient retained; normal encode/decode and JSON stringify/parse; effective marker default spread before/after; Model document/defaults/animation/approval; reduced query edge/connections; set/add edits; add/replace array changes; add/reconnect semantic change shapes; detached reconstructed edges; user data key colorPresence retained; presence-aware delegated equality. Assertions compare own keys independently from values and record exact canonical wire.

The real **unchanged** Application.Model baseline checks four valid legacy marker cases through installed toCodecJson→encodeUnknownSync→JSON stringify/parse→decodeUnknownExit and full Model equivalence. It proves existing legacy outer optional undefined is preserved by Effect's null sentinel. The widened synthetic candidate demonstrates API feasibility; it is not a current product Model accepting marker objects, mounted Runtime preservation or a substitute HMR harness.

Before numbered source execution: primary/cold approval of the selected representation, the standalone Schema JSON boundary, impossible reserved-key schema policy and exact source reach/allowlist. Then require actual product saved v1/v2/format/client/patch/revision compatibility, full actual Model JSON with widened values, normal port deliveries and detachment, real packed public Runtime HMR, native definition failure containment/ownership/rendering and pinned reference captures. Keep 068 global color, 074 complete node.style, 069 generic data, 058 MiniMap owner and 086 native geometry dependencies open. Keep all original 101 members/303 cells unchanged. No representative proof or structural preflight closes them.

STOP on public Type/Encoded drift, unsupported deep nested fields consumers, unreviewed serialization reach, standalone JSON policy rejection, checks lost by declaration wrapping, equivalence fallback, async/service requirement, malformed wire acceptance, metadata leaking into accepted values, full Model mismatch, new Runtime serializer/Model authority, imported evidence/dependency drift or failed mounted ownership/reload proof. A product executor cannot improvise a wrapper scope or use casts to satisfy declarations.

## Conformity and deviations

**Conforming at the compile/primitive boundary:** retained public Struct capabilities and ordinary encoded contracts, one canonical validation/type authority, marker-specific checked JSON representation, exact endpoint/color own-key distinctions and schema-derived equivalence, synchronous explicit failures. The actual legacy Model and source freeze remain unchanged.

**Intentional representation differences awaiting primary/cold approval:** private Declaration at owned composite JSON positions; live impossible reserved metadata keys; saved-v2/patch marker flags; the explicitly limited bare Struct JSON derivation boundary. No rendered/native/parity behavior was tested.

**Unverified:** actual widened product schemas and complete source placement, original marker/minimap semantics and all member cells, final persistence/protocol/controlled-owner lifecycle, native registry failure containment, actual Runtime/HMR/packed integration, global color/full CSS/generic dependencies, focused/full gates, CI/device/collector delivery.
