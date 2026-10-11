# Native public query isolation independent design review

2026-10-02. Verdict **APPROVE**, design only.

Reviewed the complete revised amendment at SHA256 `c7b4b15dfe4c4138bf586f452c800aeba6134de0390bfee8c05199f7e812568b`. It includes the explicit supplementary public-host revision route and updated candidate citations. Approve only deep `structuredClone` of the complete existing selected result at Vanilla's public `getNodesData` and `getHandleConnections` boundaries. Preserve their signatures and validation, core selectors, Vue behavior and Foldkit's existing nine transport assertions. The test routes and fixed nested-JSON contracts below are required acceptance details. This is a bounded ownership repair under 086, not full 064 closure or source acceptance.

## Actual source and failure receipt

Candidate citations refer to `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Current public boundaries are `apps/vanilla/src/mount-flow.ts:8988-8992,9140-9144`; frozen snapshot/node reads are 8970-8987, and frozen edge read is 9289-9292. These match the revised amendment's named checkpoint paths. The implementation remains unfixed at this review's source receipt.

`getNodesData` passes the private accepted document to `selectNodesData`. The selector creates new outer projection records but retains `node.data` at `packages/core/src/domain/flow-selectors.ts:130-143`. `getHandleConnections` returns selected private document edges at `apps/vanilla/src/mount-flow.ts:9140-9144`, through `packages/core/src/domain/flow-selectors.ts:187-199` and `packages/core/src/domain/flow-graph.ts:321-334`. The graph helper filters without copying the matching edge records. These two adapter returns therefore expose nested accepted data to caller mutation.

The synchronous public production route is `apps/vanilla/src/public.ts:1-9` -> `createFlow` at `apps/vanilla/src/mount-flow.ts:10298-10314` -> `mountFlow` at 9630-9649 -> `createFlowHost` -> the two host queries. JavaScript controller forwarding at 9718 and 9722 exposes the same results. Cloning the entire selected output there detaches nested JSON and preserves array order, duplicate requested nodes, missing-node omission, edge direction and handle aggregation. It copies only the selected result. No new decoding, dependency, asynchronous API or internal authority is needed.

The source data contract is currently JSON. Node and edge data use `S.JsonObject` at `packages/core/src/domain/flow.schema.ts:71,124`, and the remaining node/edge fields at 64-139 are serializable scalar or schema-defined record/array values. The existing snapshot path already uses synchronous `structuredClone` at `packages/core/src/domain/flow-snapshot.ts:49-56`. This approval makes no arbitrary class, generic decoded-value or 069 capability promise.

Failure receipt `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence/vanilla-native-second.log` has SHA256 `57472caa1b89f75886417fd35403efae3691691ed0465c8ca6cc010236fd8df1`. I read its startup and relevant failures/results. Lines 126-135 report `Mounted public nodes-data projection mutation changed authority`; 139-143 report three failures and 62 passes. The other two failures concern direct-hit/reconnect tests, so this amendment cannot claim to repair them.

The current mutation path is actual `getNodesData(['node'])[0].data` at `apps/vanilla/src/versioned-persistence-fixture.ts:18`, collected with the other eight projections at 8-23 and passed to the helper at 93-102. The helper mutates the returned nested object and list and checks authority at `apps/shared-e2e/versioned-persistence-proof.ts:75-98,149-182`. The earlier frozen/internal-node checks completing before nodes-data failure is an inference from that ordered source path, not a separate independently reproduced result. The log does not print the exact before/after snapshots; preserve it and add exact observations to the new proof rather than inventing a historical receipt. No browser reproduction was run by this reviewer.

## Fixed contracts and types

This table specifies the expected runtime contract of each named projection's nested JSON object and list. It does not declare every surrounding array, record or framework wrapper mutable or deeply frozen.

| Actual JSON projection | Vanilla after repair | Vue unchanged | Foldkit transport unchanged |
| --- | --- | --- | --- |
| Snapshot node data | Frozen, reject mutation | Frozen, reject mutation | Mutable, detached |
| Snapshot edge data | Frozen, reject mutation | Frozen, reject mutation | Mutable, detached |
| Named node data | Frozen, reject mutation | Frozen, reject mutation | Mutable, detached |
| Internal-node node data | Mutable, detached | Mutable, detached | Mutable, detached |
| Named edge data | Frozen, reject mutation | Frozen, reject mutation | Mutable, detached |
| Nodes-data query data | Mutable, detached | Frozen, reject mutation | Mutable, detached |
| Handle-connections query data | Mutable, detached | Frozen, reject mutation | Mutable, detached |
| Versioned saved node data | Mutable, detached | Mutable, detached | Mutable, detached |
| Versioned saved edge data | Mutable, detached | Mutable, detached | Mutable, detached |

Vanilla signatures remain readonly outer arrays at `apps/vanilla/src/mount-flow.ts:932-934,961-963,1134-1144`. A cloned runtime array does not authorize changing those declaration contracts or casting away readonly to push onto the outer result. The actual mutable-list check concerns nested JSON lists, using proper runtime narrowing as the current helper does. `getFlowInternalNode` detaches `node` but shallow-freezes that wrapper at `packages/core/src/domain/flow-measurement.schema.ts:362-383`; its nested cloned JSON remains mutable. Calling the entire internal node mutable would overstate the contract.

Vue's nodes-data return is `ComputedRef<readonly ...[]>` at `packages/vue/src/use-flow.ts:237-239`, produced from the frozen snapshot at 392-398. Its handle-connections query is a direct readonly-array result at 245-247,422-426. Only nodes-data needs `.value`; do not unwrap handle-connections or cast either host to Vanilla's controller type. The snapshot is created by `createFlowSnapshot` at `packages/vue/src/flow-canvas.ts:1001-1005` and exposed at `packages/vue/src/use-flow.ts:365-376`. Core selection creates a fresh outer nodes-data array/record but retains frozen data. Tests must check the nested JSON contract, not incorrectly demand that computed result wrappers are deeply frozen. Vue internal-node uses the existing detached core path at `packages/vue/src/flow-canvas.ts:2791-2802`.

Foldkit's projection is cloned before transport at `packages/foldkit/src/application.ts:734-789`; its existing public response data list at `apps/foldkit/e2e/versioned-persistence-fixture.ts:76-87` and mutation proof at 169-197 cover nine actual JSON projections. Preserve the mutation, same-client failure/recovery, fresh authority, saved state and notification assertions. Do not replace them with a projection count.

## Required acceptance proof

Use fixed method names and host expectations from the table. The existing frozen-index lists are predetermined, but the current helper only re-reads aggregate authority. Supplement it with fresh same-method output and explicit method receipts. No runtime freeze detection may select whichever contract happens to pass.

For each mutable Vanilla JSON projection, capture accepted snapshot, saved output and accepted-notification count. Mutate the actual returned nested object and list, prove changed values and increased list length, then prove original fresh method values, unchanged accepted/saved state and unchanged notification count. The supplementary low-level public-host proof must also require exact unchanged revisions for both cloned query boundaries. Also retain a result acquired before another read; mutation of one read must leave that separate read's result and future results unchanged. Do not clone the mutation target in the fixture. Frozen cases must prove rejected actual nested/list writes and deep child freezing, then original fresh output and authority.

The revision route must be explicit. `createFlow` returns `JavaScriptFlowController` at `apps/vanilla/src/mount-flow.ts:10299-10303`, whose interface at 1118-1150 does not expose `getDocumentRevision`; its public object forwarding at 9703-9723 does not add it. Preserve the existing JavaScript `createFlow` nine-projection proof. Add a supplementary proof through the already public exported `createFlowHost`, using the genuine `FlowController.getDocumentRevision` at 923 and 8971. Existing browser fixture precedent is `apps/vanilla/e2e/origin-connection-fixture.ts:151,221`. This fits authorized fixture assertions and needs no production API, private access, controller cast or invented revision counter. Keep the public JavaScript path and low-level revision proof separately identified in receipts. Vue and Foldkit have different public contracts; do not add a uniform revision method to satisfy a shared helper.

Use two actual independently mounted owners with matching IDs and distinct nested data. Prove mutation of one owner's query leaves both owners' accepted/saved state, fresh outputs and notifications unchanged. Scope queries and DOM ownership to each owner. For nodes-data, include duplicate IDs, requested order and a missing ID. Preserve duplicates rather than deduplicating the clone. A single structured clone may retain alias relationships between repeated entries within the caller-owned result; this amendment does not require each duplicate row to have independent data from its sibling.

For handle-connections include source and target directions, explicit IDs, absent ID, null ID, empty ID, unknown node/handle and multiple edges in document order. Null/empty/absent aggregate handles at `packages/core/src/domain/flow-selectors.ts:194-197`; do not substitute the different null semantics of `getNodeConnections`. Retain unchanged selector unit coverage at `packages/core/src/domain/flow-selectors.test.ts:125-135,178-222` and add boundary assertions for duplicate/order/null cases that the existing single-node/self-edge fixture cannot distinguish.

Keep internal reactive selector behavior unchanged. The Vanilla handle observer seeds its prior result with the public query at `apps/vanilla/src/mount-flow.ts:9081`, then selects current snapshot edges at 9089 and compares projected endpoint/edge identities at 9091-9094. A clone of the initial public result preserves that comparison's values; it does not justify changing callback delivery, core selector identity or equality. Final native tests must confirm no spurious query-mutation notification. This approval does not certify isolation of every callback or other selector API.

Retain declaration tests, actual public imports, Vanilla ownership/public-edit suites, unchanged selector units and all 086 focused/full/packed/HMR/release gates. Review final source hunks and independently rerun required acceptance against the frozen candidate. No skips, timeout/tolerance changes, assertion weakening, new dependency or signature change.

## Reads and evidence limits

I read the complete amendment, complete shared ownership helper, complete three host versioned-persistence fixtures and browser suites, the cited adapter public interfaces/implementations, Vue snapshot composition, core selector/query/snapshot/JSON/internal-node paths, Foldkit response projection and relevant selector units. The previously read complete standards and 086 scope remain the review basis. Applied audit-playbook correctness/test-coverage/finding guidance and closing-the-loop policy, plus TypeScript/type-system and unslop guidance.

Source SHA256 receipts at review: Vanilla mount `5dbfc9d335854dc1c83420f9760144ff10ae169fea3a8d1fee41b3f7f7d61ba0`; core selectors `88fc6e3d6716b107c0d88781e4c85a33ac9361da5ddada4f86f3c8f542a44b3a`; Vue use-flow `abf4c45476d3dceb659035bf06ae29b1d04390a9ba32c715b74454058e90c2dc`; shared ownership helper `ea52880eb3e097df046ec55d7bc2bc9b6f6ef714725fac0891c0fe6950e1fd06`; Vanilla fixture `27f3f6e6bac9ed5cfc796f530abf8768c2f39f10bc0eb084647b8f887113dde2`; Vue fixture `9e8f6cdb70924fded90bc0086caff772074b421ad51ec4cc4b0024cad761f027`; Foldkit fixture `c4e24b6c07b73b9110fecc5f75b5e04219be3e0af4102801e8deb20133787d3d`.

Only this review file was written for this task. Searches, line reads, status/hashes and the failure receipt are read-only evidence. No source edit, gate, build, install, server/port action, commit or index change occurred. No independent runtime reproduction or full inherited-source audit occurred. New assertions and clone changes remain pending.

## Conformity and deviations

Conforming design: detach a public query from the adapter's private accepted document while preserving schema-owned contracts and core pure selectors, consistent with `docs/standards.md:7-16,50-56`. Runtime authority, revision and event isolation are unverified until the named tests pass.

Intentionally different: Vanilla and Vue retain frozen snapshot-derived JSON where already implemented; Vue preserves computed nodes-data reads; Foldkit preserves mutable detached transport output. The reason is each host's existing public ownership and reactive contract. The test boundary is each actual public host method or transport response, with the fixed nine nested-JSON expectations above.

Unverified: final implementation, 086 integration, full 064/069/072 or member-cell closure, reference/library parity, CI, devices and collector delivery. Approval of this repair policy closes none of them.
