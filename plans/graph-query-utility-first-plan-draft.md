# Plan092: Preserve typed graph-neighbor results and prove the pure utilities

DRAFT for primary and fresh independent DESIGN review. Source execution is not authorized until both approve this entire packet. A separate sole executor will use an isolated checkout; advisor edits plans only. Read every section before execution. The coordinator owns the index. Keep implementation uncommitted and stop on the conditions below.

## Status and exact input

Priority P1, effort M, risk MED, category type correctness and parity evidence. Planned against main `841be137e253cf19c665269eaaa79edc19abf3c3`,2026-10-02. This is a bounded072 child after accepted087, independent of moving086/089/090/091. Whole057/066/069/072 remain open.

The sole proposed input is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, with sibling `typed-factory-evidence/final-freeze.json` hash `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. It contains1492source/planning and122evidence entries. Root rehashed all entries while drafting with zero mismatch. Main alone lacks accepted085/087 changes and is not an alternative input. Accepted087 primary source review is `plans/typed-factory-primary-source-review.md` hash `ca6f5eceb19463141c7015532f4acb44c7469aeca2b0bc468ec979be628c5960`; independent review is `plans/typed-factory-independent-source-review.md` hash `c6c7b6214c68266dfb50cd345a3f03d0b4adce74ac91ee683eeb208564859b47`.

Root must provide a fresh detached managed checkout at the exact baseline after design approval. Copy complete selected nonignored source byte-for-byte; independently rehash all1492source/122evidence inputs, preserve them externally and record the exact assembly before adding this packet. Do not copy ignored node_modules/dist, credentials, moving candidate source or main edits. Frozen install is executor-only. Effect/platform4.0.0-rc.116, Foldkit0.163.0, Vue3.5.43, TypeScript5.9.3 and lockfile stay unchanged.

| Selected file | SHA256 |
| --- | --- |
| packages/core/src/domain/flow-graph.ts | 5b229ed00e07ac47d80fcd513a3ab977fc7c7cec6d7c352526cfa7a800a4ad44 |
| packages/core/src/domain/flow-graph.test.ts | 4c5455f39b11ab45fdc901b692be5dc98b56d99841991680ce2a05ca830fde77 |
| packages/core/src/public.ts | 3ebe97996606ee5056dfa5db6e104a704ec2d1121e9cfefdb8be0ab7fecb29a3 |
| scripts/check-api-member-contracts.ts | 6ab74a86988a44bb9edeb2f2aa32a14626f35005850c2c224575dadb9beaa97b |
| plans/057-member-closure.json | 36b6f9019d7799e51dcf6ef1a14c4ebb1fec52d0feeffbdc60039747ac043643 |
| research/catalogs/api-members.json | 018ac2c23664ac9f28763abd02535b0176345a4c4f01655ad87c2dffd2e5b4d3 |
| scripts/check-packed-consumer.ts | 1d43b65b88b69f5b5d971a19745679aac9c82fe87080cf363a0d324b17161fe6 |

## Personally verified problem and boundaries

Current public core exports route to three pure helpers at `flow-graph.ts:269-315`. getIncomers/getOutgoers accept readonly FlowNode arrays and return readonly FlowNode arrays; getConnectedEdges similarly returns readonly FlowEdge arrays. They use only Schema-derived branded IDs and filter caller arrays. The runtime retains element references and input order, but the concrete return annotations erase a supplied typed variant's payload. Existing unit cases at `flow-graph.test.ts:481-612` verify ordering/selfloops/subsets/reference inclusion and nonmutation. Installed probes at `tests/consumer/consumer.typecheck.ts:165-181` assert only concrete FlowNode/FlowEdge results. They do not preserve Date/private-class payloads or exact custom unions.

Pinned immutable source `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/graph.ts:80-98,121-139,332-341` preserves NodeType or EdgeType in the corresponding output. The first two short-circuit falsy node IDs; Flow's accepted branded IDs are nonempty, so that branch is outside the accepted Flow argument domain. This is source comparison, not executable parity. Root read the three full functions, selected native functions/tests, relevant installed probes and all11 catalog raw rows. No new capture, typecheck or product gate ran while drafting.

Impact is loss of type-safe access to the caller's original payload despite the actual elements being unchanged. Confidence HIGH for type erasure. Runtime algorithms appear aligned for accepted IDs; executable results remain unverified. Fix risk is MED because output mutability and generic inference are public contracts.

Proposed production path is public core helper import, accepted branded ID membership, native filter, fresh array containing the original supplied elements. There is no state, geometry projection, DOM, scheduler, host lifecycle, codec service execution or observer in this path. Unit tests use the actual core implementation; all three installed contexts import actual @flow/core tarballs. Pinned capture must call real built @xyflow/react12.11.6, never copied formulas. Host renderer/query-controller parity remains out of scope.

## Proposed generic and reference-identity contract

Use Schema-derived Pick types from existing FlowNode/FlowEdge; add no parallel record interface/schema. Proposed exact signatures:

```ts
export const getIncomers = <
  N extends Pick<FlowNode, 'id'> = FlowNode,
  E extends Pick<FlowEdge, 'source' | 'target'> = FlowEdge,
>(
  node: Pick<FlowNode, 'id'>,
  nodes: readonly N[],
  edges: readonly E[]
): N[] => {
  /* existing algorithm unchanged */
}

export const getOutgoers = <
  N extends Pick<FlowNode, 'id'> = FlowNode,
  E extends Pick<FlowEdge, 'source' | 'target'> = FlowEdge,
>(
  node: Pick<FlowNode, 'id'>,
  nodes: readonly N[],
  edges: readonly E[]
): N[] => {
  /* existing algorithm unchanged */
}

export const getConnectedEdges = <
  N extends Pick<FlowNode, 'id'> = FlowNode,
  E extends Pick<FlowEdge, 'source' | 'target'> = FlowEdge,
>(
  nodes: readonly N[],
  edges: readonly E[]
): E[] => {
  /* existing algorithm unchanged */
}
```

Full input N/E types survive inference, including correlated variants, brands, whole extra fields, Date/private classes and optional/no-data branches. IDs remain branded; unknown/string-only data must pass its owning Schema before a typed Flow call. Readonly arrays are accepted as an intentional additional Flow input capability; newly allocated result arrays are mutable, matching actual filter behavior and pinned output. Existing uses assigning the results to readonly FlowNode/FlowEdge remain valid. Explicit old nongeneric calls compile unchanged. Both explicit node/edge generic parameters and their defaults are retained in the reference order, including cases where only N is supplied. Generic argument functions must be independently compiled before adopting these exact shapes; STOP if inference needs a cast/any/output widening or changes accepted brand authority.

No runtime decode, clone, freeze, guard, new Effect failure API or C/isolation parameter is added. The query does not call any payload getter, decoder, custom checker or private-class method. It returns original elements by identity. Mutating a result array never changes input collections; mutating an element can affect the caller's original element, as for the pinned utility. Actor detached-read guarantees are a separate069 boundary. Do not mislabel aliasing here as actor ownership or silently clone payloads.

Preserve existing Set/filter algorithms byte-for-byte except type signature text. Do not change graphIncomers/graphOutgoers, getHandleConnections, createFlowGraph, geometry, bounds, isNode/isEdge, connection/edit/array-change utilities, missing-ID policy or generic factory. A reference mismatch requires root review before any semantic source change; this plan grants no automatic formula/ID repair.

## Exact11-member and33-cell metadata amendment

These exact pages and singleton members are the complete allowlist:

| Page suffix | Core helper | Members |
| --- | --- | --- |
| utils/get-connected-edges | getConnectedEdges | edges, getConnectedEdges, nodes |
| utils/get-incomers | getIncomers | edges, getIncomers, node, nodes |
| utils/get-outgoers | getOutgoers | edges, getOutgoers, node, nodes |

Every full URL begins `https://reactflow.dev/api-reference/`; owner is072 and group ID is `<page suffix>::072::<member>`. Preserve all original URL/member/group/host identities and2692members/8076cells. No original row is added for a returned payload field or compiler case.

After explicit design approval only, these11 groups' targets become `packages/core/src/public.ts`, the corresponding helper export, operation equal to the particular member, productionTest `packages/core/src/domain/flow-graph.test.ts`, capture `scripts/capture-graph-query-reference.ts`, for all three installed host contexts. Amend their obligation to this pure typed-filter argument/result contract. Remove069 ONLY from these11 groups once independent design review confirms full supplied N/E preservation without an actor/native state contract. Every other dependency/target stays intact.

Add ONLY a fixed exact11 exception to the selected checker. Validate full URL, literal member allowlist, exact groupID, owner072, singleton length and literal helper/public/test/capture paths before granting the core target. Keep existing path-safety/source-existence/export and all default native-target checks. Add meaningful positive11 and negative wrong-owner/member/group/page/export/test/capture/path cases. No generic publicmodule escape.

All33cells remain open until actual particular-member proof review. Executor sends a source/unit/reference/installed proof map for each member/host, with exact path:line assertions and IDs; root alone approves transitions. Only then may the executor update those33cells and their11catalog members' host evidence/status/equivalent/remainingDecision, preserving rawSourceRow and every unrelated field. Exact old/new33-cell and11-decision records accompany the proposal. Selected087 contains7887OPEN cells; this standalone candidate would leave7854 after reviewed33 closure. Separately accepted088 closes96, so cumulative integration of both would leave7758. Neither count is current main ledger acceptance, and whole072 remains open.

## Hard source allowlist

Only the following delta is proposed:

- flow-graph.ts: ONLY three signatures above; no algorithm/import/other helper edits. flow-graph.test.ts: additive exact-type/public-operation/query tests, inherited cases unchanged.
- NEW research/harnesses/graph-query/cases.ts and main.ts; scripts/capture-graph-query-reference.ts; research/fixtures/graph-query-reference.json; packages/conformance/src/graph-query-reference.test.ts.
- NEW tests/consumer/graph-query.types.ts and graph-query.runtime.ts. Three existing consumer tsconfig include lists: only these two common entries. scripts/check-packed-consumer.ts: copy those2files and run new runtime after unchanged factory fixture, preserving all archive/peer/compiler/browser/style/cleanup logic.
- scripts/check-api-member-contracts.ts and its existing test file: ONLY exact11 exception and meaningful tests. plans/057-member-closure.json/research/catalogs/api-members.json: ONLY conditional exact11group/33cell changes above. Copied072: only coordinator-provided bounded appendix, not executor parent policy.
- docs/public-api.md and docs/react-flow-api-correspondence.md: additive pure-query contract/presence/identity/generic boundaries; generated api-reference only existing generator output. NEW research/traces/graph-query-utilities.md; fixture README helper addition; append research/PROGRESS.md; verification.config.json exact scope.
- Owned copies of this complete plan, primary/cold design approvals, NEW plans/graph-query-utility-execution.md and graph-query-utility-provenance.json. Original references and accepted source/evidence immutable.

No core barrel change is needed: existing exports remain. All other source/tests, declarations/config policies/manifests/lock, imported/generated evidence, old reference fixtures, native/app adapters, actor/factory/domain schemas, ports/persistence/measurements/registry and sibling candidates are protected. No assertions removed, timeout/tolerance/skip added, hand-edit of generated docs, global listener reuse, private Model or testing production API. Future cumulative assembly must combine accepted088's different fixed checker/capture/member hunks with these11, not overwrite either candidate.

## Required matrix and proof tool

Build a single Schema-derived case/capture contract in NEW cases.ts, shared by genuine upstream-only harness, conformance and installed comparison. No helper implementation in that contract. Use tagged absent values only for reference observations outside accepted types, never manufacture Flow brands for invalid IDs. Main harness dynamically imports built actual pinned @xyflow/react. Capture twice in independent processes, compare full normalized results and observed input/reference identity indices. Source identity indices distinguish duplicate object references from distinct objects with equal ID. Keep input node and edge order independent. Capture script checks exact SHA, package12.11.6, clean tracked source before build and identical tracked hashes afterward, using existing frozen pnpm10.33.4 system/react build pattern. Fresh disposable checkout is coordinator-supplied; do not reuse incomplete `/tmp/flow-052-xyflow` or mutate another owner. Existing accepted088 capture script is read-only pattern evidence, not a file to copy as unchecked oracle.

Mandatory cases: empty collections; absent selected ID; ID-only/full selected node with sameID but different object; incoming/outgoing/self-loop; duplicate parallel edges; both endpoints selected; hidden nodes/edges; selected subsets with missing opposite endpoints; reversed node order and separately reversed edge order; duplicate selected IDs; duplicate node IDs with distinct payloads and repeated identical object entries; duplicate edge IDs/distinct endpoints; cyclic graph; unknown endpoint IDs; source/target equality; handle presence/undefined/empty has no role in endpoint filter; unrelated payload fields untouched. Assert exact ordered results, preserved multiplicity of duplicate input nodes/edges, fresh output container even empty, all returned elements' original identity, and no mutation of input arrays/fields. No integrity redecoder is implied; these helpers do not own graph validation.

Flow-only type/runtime matrix uses actual accepted087 Schema factory variants with branded IDs, correlated node/edge data, nested Date and private Counter, metadata/optional/untagged/no-data. Assert N/E output types by bidirectional assignment, discriminator-based narrowing, readonly-input acceptance and mutable result-array operations. Verify zero payload hook execution during query and exact private instance identities; mutation of result container leaves originals unchanged. Positive baseline concrete calls remain. At least10 meaningful negatives independently diagnose unbrandedID, missingID/node ID wrongtype, missing source/target, wrong result discriminator/data, encoded Date used as decoded output, wrong brand, writing foreign variant to mutable result, and passing a readonly array as an explicitly mutable result contract. Malformed payload-pair negatives must use explicit authoritative N/E or a precise result assignment; an inferred minimal-ID passthrough intentionally does not validate arbitrary payload contents. Do not fabricate a negative of arbitrary unknown because inputs are already typed. Root exact-optional probes remain separate from actual consumer compiler modes. Use actual own compiler diagnostics/positive controls, not blind directive counts.

Every original member gets a particular assertion mapping; a shared case may cover several members only if the map names each precise input/result obligation. Pure archive proof applies to all three installed contexts, not mounted renderers. Outside-type malformed/falsy ID observations are labeled separately, never presented as accepted Flow parity or silently used to broaden Schema IDs.

## Ordered execution and gates

1. Read entire packet/standards/selected reviews, freeze exact input/approvals and baseline identities, frozen install. Run existing two member checkers exit0. Write fixtures and type-preserving signatures, then `bun run typecheck` and targeted actual units exit0. Save original type-erasure diagnostic first through actual public helper, not duplicate implementation.
2. Build new proof tool, independently capture genuine pin twice and compare conformance. On any runtime mismatch preserve actual pre-fix output and STOP for root. Run `bun run test -- packages/core/src/domain/flow-graph.test.ts packages/conformance/src/graph-query-reference.test.ts scripts/check-api-member-contracts.test.ts`, no skips.
3. Complete installed fixtures/docs/trace/config. `bun run check`, `bun run check:architecture`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, both member checkers and catalog checker exit0. All old byte hashes and accounting stay intact.
4. Request coordinator's sole shared consumer/browser/focused lease and WAIT. `bun run test:consumer` must pass all3actualtarballs, oldfactory140/28 and newmeaningfulqueries/types plus unchanged compiler/peer/style/Chromium/disposal. No workspace alias proof.
5. Submit particular33cell proposal to root; wait for proof approval before any status transition. Rerun member/catalog controls after approved bookkeeping. Save focused active092, checks docs/contracts/api-members/catalog/traces/consumer, browserTests[]eachhost, baseline quality/architecture/package/types/allunits unchanged. `bun run verify --list`, then actual `bun run verify`, both exit0/fullSuitefalse. No hidden full-suite acceptance.
6. Update only owned execution/provenance, final `bun run check` and `git diff --check`, freeze complete source/evidence externally with exact selected/inherited/delta manifests and all failures. Release ownedleaseexplicitly with emptyportchecks. Root independently reproducesfocused, coldSOURCE reads all source/assertions/fullscope before boundedDONE. No post-check edits.

Commands for new capture/conformance exist only after step2 implementation. Required actual pin command is `bun run scripts/capture-graph-query-reference.ts --checkout /absolute/owned/disposable/xyflow`; expected exit0/two byte-identical semantic samples/exactSHA. Verification uses the existing root scripts in package.json; no new package scripts/policy. Whole full/release gate belongs future cumulative integration and broad parity acceptance.

## Done, STOP and maintenance

Completion requires exact selected source/approvals, fully preserved N/E variants without casts/output erasure, unchanged algorithms, meaningful real upstream+installed+unit+compiler matrix, particular reviewed33cell proof, every required actual gate exit0, complete frozen hashes and primary/coldSOURCE acceptance. Current draft closes no cell. Future generic factory changes must re-run these public passthrough probes; these APIs intentionally do not assume JSON payloads, class cloning, actor state or DOM publication.

STOP for drift/missing exact assembly/pin, generic inference or brands requiring casts, automatic runtime decode/clone or changed algorithm, unsupplied metadata policy, identity/presence loss, weak oracle/captured Flow-as-reference, wrong original identity/count, unapproved host/factory/actor/source change, collector claim, foreign listener or additional architecture requirement. Preserve first actual failed receipt and independent work; mechanical diagnostics may be repaired only within scope. At most two formal source review revision rounds. Never commit/merge/push/publish/cleanup or silently reopen stopped candidates.

## Conformity and deviations

Proposed conforming behavior is generic typed passthrough filtering with ordered/multiplicity/reference identity and mutable fresh arrays, backed by genuine pinned and installed proof. Current type erasure is nonconforming and is the bounded target. Readonly inputs, branded IDs and minimal schema-derived structural argument requirements are proposed intentional Flow extensions/differences requiring cold design approval. They do not replace native069/072 acceptance.

Unverified are draft signatures under real declarations, actual upstream/native/installed runtime, particular original11/33closure, whole072/069 and cumulative088integration, host controllers/rendering/DOM/lifecycle, fullsuite/release/CI/devices/performance/collector. This advisor draft performed only read-only source/catalog/hash investigation and wrote this plans-owned packet.
