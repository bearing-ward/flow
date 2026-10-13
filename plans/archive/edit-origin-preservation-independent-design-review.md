# Independent design review of edit origin preservation

Date: 2026-10-01. Verdict: **APPROVE Plan 084 for isolated execution**. No design revision remains required. Source acceptance and required checks remain pending.

Reviewed full final `plans/084-preserve-origin-through-edits.md`, SHA256 `9d88ad5738b55eb66e6f40c93d0073a1cd965cec49683ba0b3300dda38a68622`. This approval covers that exact content. The sole source input is accepted082 at `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow`, baseline `841be137e253cf19c665269eaaa79edc19abf3c3`. Independently rehashed its provenance record as `143fc0430e8dee2da7bd6a2c02404162d268f992f0475b6fbca6f5d784caa9ce` and all 116 listed output files. There were zero mismatches. Copying those outputs plus the unchanged provenance record gives the specified 117-path input. This does not assemble or accept a new candidate.

Read project standards, supplied AGENTS requirements, improve and its closing-the-loop guidance, audit Correctness / Bugs, Test Coverage and Finding format, and applicable TypeScript/type-system guidance. Inspected actual accepted082 source, existing edit tests, packet consumers, and selected browser-test boundaries. No source/test edits, builds, gates, installs, ports, browser activity, commits, or cleanup occurred. This record is the only written file. 083 remains frozen and unaccepted.

## Confirmed defect and scope

The source citations are accurate. `packages/core/src/domain/flow.schema.ts:143-149` owns document nodes, edges and optional nodeOrigin. `flow-edit.ts:113-116` reconstructs deletion output from only nodes and edges. `:259-285` validates the complete candidate and then projects only nodes and edges into every returned result. The node/edge mappings at `:263-284` preserve unaffected references and should remain byte-for-byte behaviorally equivalent. Ordinary operation branches at `:129-224` already spread the document. Adding the two specified spreads repairs both metadata losses without changing edit ordering, integrity, deletion protection or mutation ownership.

`flow-edit.schema.ts:93-101` independently narrows the result document to nodes and edges. Replacing that field with the existing FlowDocumentSchema is necessary even after the two runtime spreads. It preserves the authoritative decoded and encoded types and rejects invalid defined origins through their existing Schema. It adds no metadata copy, validator or configuration authority. Spreading the validated document also ensures unknown external fields do not become an accidental metadata channel.

Actual callers were inspected separately from tests. Vanilla prepares the transaction at `apps/vanilla/src/mount-flow.ts:8977-8986` and publishes its returned document. Vue prepares at `packages/vue/src/flow-canvas.ts:2181-2183`, then proposes or accepts that result at `:2189-2218`. Foldkit command and request routes call prepareFlowEdit at `packages/foldkit/src/graph.ts:669,719`; the request result becomes the accepted or proposed document and EditCompleted output at `:738-761`. Core command conversion at `flow-runtime.schema.ts:1377-1382` also consumes it. Approved deletion prepares and finalizes through `flow-edit.ts:304-312,378-386`; denial returns the original document at `:341-345`. These paths justify a core repair independent of the stopped083 candidate.

## Transport proof and test adequacy

Core result encode/decode regression tests prove the repaired shared contract, but do not alone execute the exact Foldkit packet schemas. The revised plan's bounded additions to existing `packages/foldkit/src/application.test.ts` are appropriate and sufficient for the declared protocol-unit boundary.

Inspected actual consumers: Graph EditCompleted embeds FlowEditResultSchema at `graph.ts:289-294`, and ApplyDeleteResult embeds it at `:329-331`. Application EditResponseSchema embeds it at `application.ts:186-195`. EditCompleted constructs RespondFlowEdit at `:969-979`; command arguments use that actual packet schema at `:802-805`, then emit through outbound editResults at `:809`. DeleteResultSchema embeds the same result at `delete-approval.ts:76-85`. No additional narrower result document or custom transport encoder was found on these inspected paths. The edit-proposal document already uses authoritative FlowDocumentSchema at `packages/core/src/domain/flow-runtime.schema.ts:840-843`.

Use genuine prepareFlowEdit and finalizeFlowDeleteCandidate results for packet regression inputs. Round-trip them through the imported application EditResponseSchema and delete-approval DeleteResultSchema. Assert retained origin, correlation ID, result document, and deletion contents, rather than only checking that decoding succeeds. Label them protocol units. A mounted origin-edit test is not necessary to approve this narrow core correction; mounted origin rendering and genuine HMR restoration remain future host integration requirements.

The planned unit matrix covers the actual loss points and meaningful adjacent invariants: unclamped/nonzero and explicit-zero origin, every collection/data/edit family, no-op and compound transactions, deletion preparation/finalization, unaffected references, input immutability, denial, protected failure and invalid-final-graph rollback. Absent inputs must stay absent; own undefined must follow authoritative Schema behavior rather than an invented normalization policy. The intentional regression run is distinguished from required gate failures. The existing eight core tests remain intact.

Existing selected public-edits suites exercise real adapter edits and ordinary packet delivery. The inspected Foldkit tests and fixed public-edit fixture do not contain nodeOrigin assertions. Its existing versioned-persistence test proves extended document storage/ownership, not an origin-preserving public edit. Those tests and packed consumers are valuable regression guards; the plan correctly avoids claiming they supply new mounted origin or HMR evidence.

## Execution and acceptance boundary

The final scope clearly permits only the two production core files, the core regression test, the named Foldkit packet-unit addition, verification scope, conditional generated API output, and owned plan/provenance records. The earlier blanket adapter-test wording and imprecise Vue citation were corrected before this approval. No production adapter or browser-test change is needed.

The saved focused verifier must select docs, contracts and consumers plus existing public-edits and versioned-persistence browser files for every host. It still includes baseline quality, architecture, builds, types and all units. Exact input/delta inventories, unchanged browser assertions, strict-port ownership and actual exit results remain acceptance requirements. Full verification is correctly deferred to the future host integration milestone. The stopped083 lint budget and frozen source are untouched; this separate plan repairs a different concrete cause on accepted082 inputs.

## Conformity and deviations

Conforming design: one existing document Schema, Schema-derived result types, Effect-owned edit validation and spans, unchanged atomicity/deletion rules and structural sharing, and metadata-preserving document transformations. No intentional semantic deviation is introduced.

Approved evidence boundaries: core edit units and actual packet Schema units prove the narrow repair; unchanged mounted edit/persistence tests and packed consumers guard existing consumers. Runtime delivery with origins, rendered origin geometry, genuine preserved-Model restoration, full host integration, CI/devices/collector and broad parity remain unverified.
