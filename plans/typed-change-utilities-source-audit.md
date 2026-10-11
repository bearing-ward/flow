# Typed change utilities source audit

Read-only future parity audit, 2026-10-02. Main baseline is `841be137e253cf19c665269eaaa79edc19abf3c3`. This report selects no implementation, dispatch or verification gate and closes no member cells.

## Inspected source and evidence boundary

Product citations below refer to accepted087 candidate `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, unless marked main or reference. Main is the report destination, not the execution base. Accepted087 primary approval is main `plans/typed-factory-primary-source-review.md:3-15`; cold approval and excluded scope are main `plans/typed-factory-independent-source-review.md:3-7`.

Rehashed external `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json` to `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. Independently matched eight relevant candidate files against that freeze: change implementation and unit test, data-contract implementation and schema, flow schema, public entry, member ledger and API catalog. This is a scoped identity check, not a new full candidate inventory or acceptance reproduction. Candidate HEAD matches main baseline; its accepted source is uncommitted.

Read the improve skill and audit-playbook Correctness / Bugs, Test Coverage, Tech Debt & Architecture and Finding format; applied TypeScript, type-system and unslop guidance. Followed `docs/standards.md:7-16,58-76`. No install, build, compiler, test, browser, port, shared lease or child-agent operation ran. No source, imported evidence, candidate or existing plan changed. Repository material was treated as evidence, not instructions. No secret values are reproduced.

Reference citations abbreviate immutable directory `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/` as `reference/`. This exact pin is the comparison target, not a current-site claim.

## Production call paths

Flow's real public entry is `packages/core/src/public.ts:335-349,374-382`. It exports concrete change schemas, generic `NodeChange`/`EdgeChange` and synchronous `applyNodeChanges`/`applyEdgeChanges`. Node application enters `domain/flow-change-compatibility.ts:205-208`, edge application enters `:265-268`, and both call `applyArrayChanges` at `:116-203`.

The algorithm groups changes by supplied item ID, collects additions separately, replaces each queued sequence on remove/replace, traverses the supplied array, then inserts additions. Unchanged items retain exact identity at `:158-160`; changed items start with a shallow copy at `:181`; replacements and additions use shallow spreads at `:175,193`. Node updates touch selected, position, dragging, measured, width, height and resizing at `:210-256`. Edge selection touches selected at `:269-270`. Nested caller data is neither decoded nor copied. No contract, codec, isolation service or graph actor is called.

This path owns no graph state, scheduling, DOM effects, rendered output, mounted delivery or saved session. It returns a new mutable array derived from readonly inputs. Partial arrays, unknown removal IDs and replacement items with a different ID are allowed; the result need not be an integrity-valid whole document.

Reference public entry `reference/packages/react/src/index.ts:36` exports the helpers, with changes types at `:94,101`. Helpers enter `reference/packages/react/src/utils/changes.ts:182-186,220-224`, then `applyChanges` at `:19-104` and `applyChange` at `:107-149`. Reference preserves unchanged item identity and shallow-copies changes, replacement and addition items. It takes mutable arrays and returns mutable arrays. Reference uses `any` and casts; Flow's architecture does not authorize copying those escape hatches.

## Findings

### [TYPE-01] Let pure change utilities retain factory-derived decoded items

- Evidence: `packages/core/src/domain/flow-change-compatibility.ts:43-67,80-102,108-114,205-208,265-268` ties both item schemas and public generic bounds to concrete `FlowNode`/`FlowEdge`. `domain/flow.schema.ts:64-88,115-141` restricts their optional data to `S.JsonObject`. Accepted087 defines data-independent geometry and exact codec-derived node/edge types at `domain/flow-data-contract.schema.ts:11-33`; its builders replace type/data without widening the remaining authoritative fields at `domain/flow-data-contract.ts:33-80`.
- Impact: a factory-derived item containing a decoded Date or private Counter cannot satisfy the public change generic or utility bound. These items are real accepted factory output, illustrated by `domain/flow-data-contract.test.ts:42-103`. The helper could preserve their nested payloads at runtime, but callers cannot express that operation safely through the exported API. Casting to concrete Flow types would erase the schema distinction and admit false JSON claims.
- Effort: M, including public type probes and identity/reference tests.
- Risk: MED. Changing generic bounds and schema construction can widen inference, break existing defaults, or silently re-decode decoded payloads.
- Confidence: HIGH for the source contract mismatch. No new compiler reproduction ran in this audit.
- Fix sketch: derive utility bounds from the accepted geometry contracts, retain concrete defaults, and derive item-bearing change variants from generic Schema construction with an explicit `itemSchema`. Use that supplied schema only when the caller explicitly requests change decoding. Rewrite the shared collection logic around a real discriminated union so `:129-133,164-167,192` no longer assert optional structural fields. The pure apply functions must never invoke a payload codec, `S.toType`, isolation, graph validation or cloning.

This is an existing069/072 gap, not a regression introduced by087. Main `plans/069-support-schema-backed-data-extensions.md:19-39` already assigns these transformation paths to typed data. Accepted087 explicitly excludes reducers/actors/persistence in main `plans/typed-factory-design.md:3,19-21`; factory approval closes none of these contracts. Main `plans/072-close-instance-utility-contracts.md:95,103-105,115-131` retains typed data prerequisites and independent matrix review. A bounded future child needs its own design approval; this audit does not authorize one.

### [TEST-01] Prove payload identity and terminal-change precedence through the public utilities

- Evidence: `packages/core/src/domain/flow-change-compatibility.test.ts:22-34,37-187` uses concrete fixtures without node payload data, tests values and one changed-node identity, and checks only limited ordering combinations. `packages/conformance/src/api-utility-reference.test.ts:144-189,251-284` replays one fixed JSON fixture, rather than nested Date/class identity. Reference harness `research/harnesses/api-utilities/main.tsx:11-55,103-116` serializes fixed utility outputs. Imported upstream tests `reference/examples/react/cypress/components/utils/apply-changes.cy.ts:29-175` cover basic add/remove/select/position/dimensions/replace, not the complete mixed precedence or identity matrix.
- Impact: a future generic refactor could accidentally clone or strip caller payloads, apply changes after a terminal replacement, change insertion order, or widen return types while existing tests still pass. JSON equality does not establish reference identity or private-class preservation.
- Effort: M, shared with TYPE-01 rather than an independent implementation project.
- Risk: LOW. Keep new assertions on actual public functions and genuine pinned functions; do not implement an oracle reducer in tests.
- Confidence: HIGH for the missing assertions. Runtime parity for the newly proposed cases remains unverified.
- Fix sketch: cover both node and edge unchanged identity, changed shallow item copies with exact data/Date/class references, add/replace item copies, unknown IDs, duplicate IDs, multiple additions and native splice index behavior. Record genuine pinned identity observations as explicit booleans/class method results rather than serializing the payload itself. Add positive/negative installed compiler probes preserving correlated type/data, no-data variants, readonly arguments and mutable output arrays.

## Runtime semantics inspected and rejected bug claims

| Behavior | Flow evidence | Exact pinned evidence | Assessment |
| --- | --- | --- | --- |
| New output array, unchanged item references | `flow-change-compatibility.ts:153-160,202` | React `utils/changes.ts:20,60-63,103` | Source correspondence; missing dedicated unchanged-identity assertion |
| Changes preserve nested payload references through shallow item copies | `:175,181,193,212-256` | `:71,80,96-98,109-146` | Source correspondence; decoded class/Date runtime proof missing |
| Remove/replace discard earlier queued changes; later ordinary changes remain queued but terminal first change wins | `:140-149,169-178` | `:32-49,65-73` | Source correspondence; full permutation proof missing |
| Last remove/replace supersedes previous terminal operation | `:140-142` | `:32-37` | Source correspondence; both directions need proof |
| Adds run after existing-item changes, in original addition order using splice/push | `:135-137,190-199` | `:28-31,93-100` | Source correspondence; add/remove same ID and index matrix need proof |
| Select false, optional dragging, dimensions and width/height flags | `:211-256` | `:109-146` | Selected fixed cases exist; all flags and omitted-field cases remain unverified |
| positionAbsolute ignored | `:215-226`; unit `:114-138` | `:114-123` | Existing selected test boundary; this is reference behavior, not a missing absolute-position assignment |
| Reset | unions `:55-62,92-97` | system `types/changes.ts:51-57,81-85` | Neither pinned union contains reset. Do not invent a reset member or fifth edge variant |

No high-confidence runtime ordering, removal, selection or clone defect was found within the typed variants inspected. Flow's extra per-change outer copies differ from reference's single mutable outer copy but do not, by themselves, establish an observable payload defect. Reference only writes resizing for a boolean; Flow writes a defined resizing value. Their typed schemas admit booleans, so malformed untyped values are outside this finding's proof boundary.

## Default domains and candidate design boundary

Reference system `types/nodes.ts:11-23` has plain string IDs and required `Record<string, unknown>` node data; `types/edges.ts:3-24` has optional record data and nullable handle strings. Dates/private instances inside a record are permitted. Arbitrary top-level data, no-data node schemas and scalar transformations are not automatically reference-equivalent just because accepted087 permits them.

Flow's concrete defaults use branded nonempty IDs, a required top-level node label, optional JSON object data, nonempty optional types and branded optional handles. See `domain/flow-values.ts:3-13` and `domain/flow.schema.ts:64-86,115-139`. Those are existing native domain differences. Broadening the pure generic bound must preserve the concrete defaults and record remaining differences. The current conformance fixture copies `data.label` to Flow's required top-level label and removes it in comparison; it also normalizes nullable handles. See `packages/conformance/src/api-utility-reference.test.ts:78-96,109-142`. That projection is selected evidence, not default type-domain parity.

Both public change generic add variants admit `index?: number`, matching the pinned declarations at system `types/changes.ts:32-35,61-64`, while Flow's concrete add schemas decode only `S.Int` at `flow-change-compatibility.ts:43-46,80-83`. Pure application delegates to native splice and does not decode its index. A future schema factory must explicitly review this schema/runtime domain distinction; silently changing the existing decoder or claiming full number-domain equality would exceed this audit.

The smallest useful future scope is the two pure helpers, Schema-derived change types and explicit generic change-schema builders, their core public exports, owned unit/reference fixtures, installed compiler/runtime probes and documentation. Use accepted087 geometry/type contracts without importing or creating actor authority. Preserve exact caller schema Type, Encoded, decoding services and encoding services in explicit `itemSchema` composition; callers with already decoded values can explicitly choose their decoded-side schema at a boundary. Do not add automatic decode/encode/detach calls to apply functions. Keep synchronous returns and readonly input/mutable output array signatures, with no casts, `any`, compiler overrides or payload clone policy. Newly supported nested private state must stay the exact caller reference. Caller mutation of it afterward is consistent with this shallow utility contract and is not an actor isolation guarantee.

Design review should also state that utility output is a partial collection, not automatic proof that every extra caller schema refinement still holds after position/dimension/selection changes. Preserving type/data correlations is a narrower claim than preserving arbitrary literal or dependent refinements of fields the algorithm updates. Do not promise general decoded-schema validity by returning a generic type and testing only JSON examples.

Typed actor isolation, mounted selectors/renderers/events, checkpoint encoding, persistence and Foldkit Model placement are outside this scope. Main `plans/codec-boundary-design.md:11,172,200-206` owns the separate trusted-isolation and encoded-persistence boundaries. Public supplied-array behavior must not inherit those ownership rules implicitly.

## Actual member identities inspected

There is no justified eleven-member allowlist. The narrow payload/application set inspected is the following twelve original identities, all currently `implementation-gap` in main ledger. These are findings' mapping, not proposed closure or a substitute for the larger variant matrix.

| Original page suffix | Owner/group | Exact member identities | Main ledger evidence |
| --- | --- | --- | --- |
| `types/node-change` | `069`, `types/node-change::069::NodeChange` | `NodeChange#1.<union:5>.<type:NodeAddChange>.item.<type:NodeType>`; `NodeChange#1.<union:6>.<type:NodeReplaceChange>.item.<type:NodeType>`; `NodeChange#1.NodeType` | `plans/057-member-closure.json:20064-20073` |
| `types/edge-change` | `069`, `types/edge-change::069::EdgeChange` | `EdgeChange#1.<union:3>.<type:EdgeAddChange>.item.<type:EdgeType>`; `EdgeChange#1.<union:4>.<type:EdgeReplaceChange>.item.<type:EdgeType>`; `EdgeChange#1.EdgeType` | `:14398-14407` |
| `utils/apply-node-changes` | `072`, three singleton groups | `applyNodeChanges`; `changes`; `nodes` | `:26612-26617,26643-26648,26674-26679` |
| `utils/apply-edge-changes` | `072`, three singleton groups | `applyEdgeChanges`; `changes`; `edges` | `:26519-26524,26550-26555,26581-26586` |

Every page is under `https://reactflow.dev/api-reference/`. Utility singleton groups require069 and still target the original three mounted host entry/tests. Generic groups retain their original public-state targets. A future pure child must obtain reviewed target/obligation changes for exact identities before using installed pure calls to close those host cells. No ledger fields or prerequisites changed here. The enclosing072 node union has46 original members and edge union22, plus separately catalogued field members; source inspection of the union does not prove those members or all three host cells. Counts establish inventory only.

## Future verification requirements

No verification profile passed in this audit. The saved accepted087 focused result is historical evidence at main `plans/typed-factory-primary-source-review.md:17-23`, not a gate rerun or approval of change utilities.

Any approved executor should prove new behavior from `@flow/core`, execute genuine pinned reference comparisons in independent processes, and preserve existing concrete tests. Add owned checks/consumer probes to the active focused scope in `verification.config.json`, then run `bun run test -- packages/core/src/domain/flow-change-compatibility.test.ts packages/conformance/src/api-utility-reference.test.ts`, `bun run test:consumer`, and required `bun run verify`. Exact additional reference/type fixture paths require design review first. Report the focused profile and selected scope. Full-suite, mounted/native, broad generic, CI, devices and collector claims need their separate gates; integration milestones require `bun run verify:full`.

## Conformity and deviations

Conforming within existing selected executable evidence: fixed JSON node/edge update outputs, basic removal/add ordering and selected dimension/position behavior, through the existing public conformance replay. This audit read those assertions and the saved boundary; it did not rerun them.

Intentionally different: Flow accepts readonly supplied arrays, returns mutable arrays, and preserves its concrete branded/JSON/label domain. Its Effect Schema architecture replaces reference handwritten type declarations; pure application retains synchronous supplied-array ownership. The test boundary is existing concrete units/public packed fixtures and the normalized fixed reference replay. Per-change outer copies are a source difference with no confirmed semantic defect in this scope.

Unverified: caller-generic Date/private-class types through public utilities, explicit generic item-schema composition, nested identity against genuine pinned functions, all terminal/add index permutations, arbitrary caller refinements, original member-specific host cells, mounted/save/actor contracts and full parity. Those limits are why a bounded typed utility design is useful, and why accepted087 or inventory counts cannot close069/072.
