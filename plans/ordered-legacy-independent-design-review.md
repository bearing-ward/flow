# Independent architecture review: ordered legacy integrity and current gestures

2026-09-30, main `841be137e253cf19c665269eaaa79edc19abf3c3`.

**APPROVE Plan 082 architecture and bounded editable scope.** The private endpoint policy belongs in the existing ordered integrity traversal. A separate explicitly current native test projection is the right way to preserve historical evidence while asserting accepted directed gestures. This approves execution design only; the frozen complete 070 candidate remains unaccepted, and 081 must wait for the assembled source-stage verifier and primary source review.

Read the entire plan and personally inspected current/frozen integrity, persistence paths, historical and approved reference fixtures, current Schema-derived test contract, both native connection loops, all three fresh commit routes, actual Foldkit harness/client and conformance evaluator. Only this planning record was authored. No source edits, builds, tests, browsers, port reservations, dependency changes or acceptance gates ran.

## Inspected identities and boundaries

| Read input | SHA-256 |
| --- | --- |
| Main 082 plan | `2927da8beb18cf47ff8fd991d3488e7b9ee35d5112ead5834ff748010f807a88` |
| Frozen 070 candidate `flow.schema.ts` | `e6f3f97ffbaa99721b71d4e3474135e37cdf6030731f66eedb98b934e454130c` |
| Frozen 070 candidate `flow-persistence.ts` | `fb4233531b44958dc03adf71bf7cb38ee52d767571b86614f4b081f3a11a5077` |
| Independent legacy oracle | `5fddef8419c2e15a65e898a1e6578a1ec960a6574076ac2612845f93194f2998` |
| Historical interaction fixture | `7ac47c49a0d567580fb3076c7252b60b89976df9bb866ca373e07663925d7db1` |
| Approved upstream origin/connection fixture | `06d04831bd9bae9886bb8d62676ecfc44547e160cda0e7a40b0ba2fee5515643` |

Current candidate paths below are relative to `/Users/richardmcandrews/.codex/worktrees/complete-persistence-integration/flow`. Frozen fixture paths are the existing independent baseline reader/writer and immutable research fixtures. Primary separately reports verification of all 108 frozen checkpoint outputs, tracked patch `f68cb5c58ba69ea39683707fc77fa81e7116b2e52a154fcbfc54d2d6e5b84987` and provenance `39d371d41438c3936c3d32f8cb75654ee04657e2bedc79ff67bf9b5c33620ac0`. This reviewer did not reproduce that full provenance audit or the reported partial gates; neither report is final source acceptance.

## Ordered integrity policy

The frozen oracle's `findDocumentIntegrityError` first indexes duplicate nodes, then parent reference checks, parent cycles, duplicate edges and duplicate handle IDs (`packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js:293-366,407-418`). Its per-edge traversal checks source node, target node, source handle identity/kind, then target handle identity/kind, in document edge order (:368-403). Current live traversal retains the same order but checks explicit handle identity across kinds (`packages/core/src/domain/flow.schema.ts:287-354`); that generalized behavior is the accepted 078 live/v2 policy.

The defect is concretely visible in the current reader: `flow-persistence.ts:144-164` runs the separate all-edge `findLegacyEndpointKindIssue` first. That helper scans source/target handle kinds without first checking every relevant node or earlier ordinary error (`flow-legacy-handle-compatibility.ts:8-30`). For source `a` with target-kind source handle `in` and missing target `missing`, it selects MissingEdgeHandle before the frozen traversal's MissingEdgeEndpoint(target,missing). Running all live validation first would cause the reverse defect when an earlier edge has wrong kind and a later edge has an ordinary missing identity.

Approve one private discriminated policy at the existing per-endpoint check: live/v2 requires the explicit ID to exist, literal1 additionally requires its physical declaration kind to match the directed endpoint. The policy must not move checks, change absent/own-undefined behavior, or introduce a second scan/graph. Pass it through the existing shared validation/decode workflow. Keep public `validateFlowDocument(document)` and `decodeFlowDocument(input)` signatures and default generalized semantics unchanged; the module export used only by persistence must remain absent from `packages/core/src/public.ts` and public declarations/catalogs.

The existing Effect decode/validation wrapper already owns typed failure, integrity attributes, warning logs and documentDecode/documentIntegrity spans (`flow.schema.ts:357-442`). Factor that workflow privately instead of copying the frozen validator or duplicating log/span branches. Every failure retains the actual current tagged error class and exact Schema payload: nodeId/parentId/edgeId/endpoint/handleId where applicable. The historical JavaScript class identity itself is not the current constructor.

The narrow legacy-kind helper may remain the writer capability predicate after ordinary live graph validation. That checks whether valid accepted state needs another format; it cannot choose literal1 reader integrity failures. No new public policy option, error type, failure code or mode-dependent stored endpoint resolution is needed.

## Additive v1 sequence and projection

Approve preserving the known-extension stored projection before stripping. The frozen projection excludes transient selection/excess keys; invalid unrelated transient values must not suddenly become live input validation failures. Known valid origins/native metadata cannot bypass or mask ordered legacy integrity. A forged noncanonical v1 pair receives the frozen MissingEdgeHandle, while v2 continues through generalized named-ID integrity.

Implementation must obey 082's explicit **single integrity traversal** requirement. Current additive v1 `checkAdditiveLegacyBody` performs integrity then returns void, after which public legacy decode runs integrity again (`flow-persistence.ts:337-360,384-393`). Do not retain this composition merely by replacing both calls with the new ordered helper. Reuse the once-validated decoded document through the subsequent format decision and frozen field projection/schema step; construct the session snapshot from that result and decoded viewport. Schema projection is not a second whole-graph traversal, and projection must not replace validation with an unchecked assertion. Keep existing schema/envelope error sequencing and typed format decisions coherent; the required oracle/known-extension matrix settles the actual behavior.

This concretizes the plan's stated prohibition on validating the whole document twice, not an extra source path. The authorized `flow-persistence.ts` reader composition scope is sufficient. Direct legacy readers decode their frozen envelope and run the shared legacy workflow once. Additive1 checks decoded supported extension semantics only after ordered legacy integrity, then returns the valid frozen projection; additive2 uses the normal live workflow. Writers/output-detachment/version selection/client protocols remain unchanged.

The meaningful oracle matrix in step 2 is sufficient and should compare every declared payload field, not merely tag/message substrings. Include both edge-order directions, missing endpoint before wrong handle, missing source handle before target kind, duplicate/parent/cycle/handle errors before edges, absent/own-undefined IDs and unrelated invalid transient/excess fields across document/session readers. Retain existing invalid schema, valid1/2, known-extension, raw presence, literal1, output isolation, error and version tests. Use the frozen implementation as the expected producer, not a newly written copy of its conditions.

## Historical fixture and current native tests

The historical target-target record genuinely expects rejection but already stores the correct directed normalized endpoints `target/in -> loose-source/in` (`research/fixtures/interaction-lifecycle.json:207-225`). The approved new upstream capture separately records released accepted callback/storage `b/in -> a/in`, error008 and no rendered edges (`research/fixtures/origin-connection-reference.json:5533-5573`). Its native renderer limitation does not contradict accepted eligibility or authorize Flow to retain the historical rejection.

Keep both evidence files and `interactionConnectionCases` unchanged. A new current native projection in the existing shared contract module uses the existing Schema-derived fixture case type (`apps/shared-e2e/interaction-lifecycle-contract.ts:5-16`). Copy/transform only the identified target-target record: truthful current name, accepted outcome, expected edge1, existing accepted event order, and no obsolete rejection reason. Its independently stored Schema-decoded normalized endpoints can be reused without branded-ID casts; do not derive expected direction by calling a production constructor. Preserve the four other current cases by exact value and all five historical identities/records unchanged. Include explicit consistency assertions in the already authorized test scope, not an unrelated new test file.

Only the exhaustive production pointer loops in Vanilla `interaction-lifecycle.e2e.ts:959-1055` and Vue :856-929 consume the current projection. Other named historical cases, reconnection/cancellation/default assertions and the original export remain. The current conformance unit already explicitly supersedes the one historical rendering gap using literal directed endpoints (`packages/conformance/src/index.test.ts:155-185`); it is not an assertion that the historical recorded outcome has changed. Document production and historical/unit paths separately.

The three frozen fresh commit routes already construct direction once and use the successful result: Vanilla `mount-flow.ts:6538-6583`, Vue `flow-canvas.ts:2974-3005`, Foldkit `graph.ts:806-825`. Preserve them; a new target-target guard or extra normalization would undo accepted 078. This stage does not migrate preview projection, radius, threshold, strict target-start lifecycle, origin activation or reconnect policies owned by 081.

## Actual Foldkit boundary and scope

Approve the additional target-target pointer proof in the existing Foldkit interaction file. The harness already stores one complete versioned client per public Runtime handle and reads through `requestVersioned` (`apps/foldkit/e2e/test-harness.ts:322-349`); client disposal precedes Runtime disposal (:352-367). Its existing loose pointer test mounts public configuration and drives the real DOM PointerDown/release path (`interaction-lifecycle.e2e.ts:1289-1407`). Thus no new private model setter or harness source mutation is required.

Use a named target-target fixture with the actual hovered node included in the existing allowed targets configuration (`graph.ts:796-803`). Assert exact accepted edge1/node/handle direction through the public client, then repeat the same physical gesture and prove unchanged edge plus no second acceptance. Poll public nodesInitialized and positive current declared handle measurements before comparing actual SVG endpoints to the two physical declarations. Use stored edge attachment geometry, not transient preview centers. No half-pixel tolerance, readiness sleep or expected endpoints computed from production gesture construction may hide a failed identity/direction assertion. Actual rendered Flow target-target output is the approved intentional difference from upstream008, not rendered parity.

The hard allowlist is sufficient for these two dependencies: shared schema policy, persistence composition/oracle tests, existing shared fixture contract, the two loops, Foldkit proof and listed documentation/trace/scope/provenance records. New callers/files/public exports or a need to alter frozen fixtures require primary scope review. Preserve the frozen source input and exact histories. No dependency, source parity, generic/unnamed or parent/member authority is added.

## Execution gate and final scope

082 is a separate isolated executor stage assembling the complete frozen 070 input, not resuming an accepted candidate. Its saved scope must add the three relevant interaction files without reducing the complete 070 checks/packed consumers/public persistence proof. At most two focused repair attempts per failed required gate, then freeze/report. Run serial owned-host gates and saved verify only during authorized execution; this review ran none.

Primary must inspect the full assembled diff and reproduce the saved source-stage verifier before accepting complete070 or starting081. Full integration/release verification follows081 and actual rendered restoration. That order is acyclic: source schemas/methods/ports/client plus these dependencies → source approval → host activation → rendered/full acceptance. No partial gate counts, historical fixture retention or representative scenarios close the original parents.

## Complete-envelope clarification recheck, 2026-09-30

**APPROVE the appended 082 implementation clarification**, amended plan SHA-256 `767e7d0606f662a648bd921db2459d195f15149e23def70be11b5e3adf55ef29`. This makes the review's existing schema/envelope-order and single-traversal requirements concrete; it introduces no new public contract, file or format.

Personally reread the full appended clarification, frozen session envelope schema and reader (`baseline-reader-writer.js:1034-1038,1059-1065`), candidate expanded body/session schema (`flow-persistence.ts:270-284`) and additive session branch (:384-402). Frozen schema validation includes viewport before graph integrity. The current additive1 branch instead validates body/integrity before calling the complete legacy session reader, so a noncanonical handle can incorrectly precede malformed viewport. Primary's zoom0 reproduction is consistent with this inspected path; no reproduction was run by this reviewer.

Approve private complete expanded literal1 document/session schemas composing existing stored/known-extension fields and unchanged viewport schema. Decode that complete envelope first, run the shared ordered legacy integrity once, apply the established known-extension format decision before frozen stripping, and reuse the validated document through frozen field projection/session snapshot construction. A body-only precheck plus later viewport decode or a second full legacy reader call would remain incorrect. Keep public schemas/signatures, extension policy, typed failures, transient/excess stripping and v2 behavior unchanged. Add malformed/missing viewport combined with ordered graph errors to the existing authorized oracle matrix; compare schema issue paths as well as integrity tags/payloads. These are boundary/projection checks, not duplicate graph authority.

Approval remains architecture/scope only. Source activation, exact final diff, tests and saved verifier still require primary acceptance. This recheck authored only this record and ran no source edits, builds, tests, browsers or ports.

## Conformity and deviations

**Conforming after required implementation proof:** literal1 error tag/payload/order against the independent frozen reader; unchanged public live/v2 generalized identity; one ordered integrity traversal; exact once-directed current gestures through actual native commit paths. Test boundaries are the oracle matrix and three public host production suites, not this source reading.

**Intentional, explicitly preserved difference:** the historical fixture records Flow's former target-target rejection; current native expectation accepts its already documented directed pair. Pinned React accepts callback/storage but reports008/no path, while Flow renders the accepted physical identities. Keep both historical evidence and current named-native proof distinct.

**Unverified/held:** this execution and frozen complete070 source acceptance, 081 origin/preview/lifecycle activation, rendered restoration/full integration/release, original069 generic/class contracts,074 genuinely unnamed/nested and068/074 accessibility rendering, original member closure, devices/CI/collector delivery. APPROVE is architecture/scope only.
