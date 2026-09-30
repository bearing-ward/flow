# Plan 067: Complete node origin and connection rendering public contracts

> Executor: read this entire file, execute steps in order and record every result. This is a required child of 057; completion of this bounded child does not close the parent. The coordinator maintains the index when dispatch says so.
>
> Drift check: `git diff --stat ce9210e61a7dcb370a45b91632c19d7e017e4898..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/src apps/vue/e2e apps/foldkit/src apps/foldkit/e2e scripts research/catalogs/api-members.json research/traces/public-api-completion.md docs plans` and `git status --short`. This plan was written over an uncommitted implementation snapshot, so inspect working-tree differences too. Compare quoted contracts, not just SHA. Existing accepted prerequisites are expected; source-contract disagreement is STOP.

## Status

- Priority: P1
- Effort: L, execute sequential bounded steps
- Risk: HIGH
- Category: direction
- Execution mode: Implementation after architectural contract review
- Parent:057; parent remains IN PROGRESS
- Depends on: 053/054/056 accepted baselines;065 measured handle contract; member decomposition phase of 066; reviewed 070 persistence migration design before geometry, and 070 implementation before final origin save/restore acceptance
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: TODO — 070 migration design and explicit parent WP3 amendment approved by independent `review_070`, 2026-09-29; source execution still awaits checked 066 decomposition and 065 geometry prerequisites

## Why this matters

Node origin and connection-line member families remain poorly mapped in the API inventory. Native preview renderers already exist; their semantics must be completed and documented rather than replaced. Origin must change coordinate meaning consistently in geometry, drag, hierarchy and endpoints across hosts.

## Current state and source excerpts

- `packages/core/src/domain/flow.schema.ts:63-81` defines position/parentId/size/handles but no origin. `docs/react-flow-api-correspondence.md:38` records nodeOrigin gap.
- `docs/react-flow-api-correspondence.md:80-84` records style/container gaps and custom connection native renderers. Vanilla has `options.connectionPreview` at `apps/vanilla/src/mount-flow.ts:781` and rendering invocation `:2657-2664`; reuse it.
- `packages/core/src/domain/flow.schema.ts:48-52` defines handle kind and side; sourcePosition/targetPosition and default handle semantics must be mapped explicitly.
- Pinned ReactFlowProvider type `packages/react/src/components/ReactFlowProvider/index.tsx:34-42` gives example origins `[0,0]`, `[0.5,0.5]`, `[1,1]`. Pinned connection component is `packages/react/src/components/ConnectionLine/index.tsx`; inspect actual path/prop assembly before choosing target shape.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- Exact existing core semantic paths: `packages/core/src/domain/flow.schema.ts`, `flow-values.ts`, `flow-runtime.schema.ts`, `flow-runtime.schema.test.ts`, `flow-graph.ts`, `flow-graph.test.ts`, `flow-measurement.schema.ts`, `flow-measurement.schema.test.ts`, `flow-fit-view.ts`, `flow-fit-view.test.ts`, `flow-visibility.schema.ts`, `flow-visibility.schema.test.ts`, `flow-interactions.schema.test.ts`, `flow-node-extent.schema.ts`, `flow-node-extent.schema.test.ts`, `flow-viewport-operation.schema.ts`, `flow-viewport-operation.schema.test.ts`, `flow-connection.schema.ts`, `flow-connection.schema.test.ts`, `flow-reconnection.schema.ts`, `flow-reconnection.schema.test.ts`, `flow-connection-preview.schema.ts`, `flow-connection-preview.schema.test.ts`, `flow-persistence.ts`, `flow-persistence.test.ts`, `packages/core/src/public.ts`. New `flow-origin.schema.ts`/test may hold the reviewed finite, unclamped origin contract. If another semantic reader needs changes, revise scope under 066 before coding.
- Vanilla mount/measurement/public files; Vue canvas/use-flow/preview components/public files; Foldkit graph/application/preview-renderer/public files and tests.
- Production renderer-contract, measured-geometry, interaction-lifecycle and public-state suites/fixtures in all hosts; packed-consumer fixtures/script.
- New origin/connection-reference capture script/harness/fixture/conformance test; public docs/catalog, trace, PROGRESS; plans 067/index/057/066 manifest, generated API docs.

Out of scope: other feature families, renderer replacement, second graph/store authority, dependency upgrades, backend collaboration, publication, imported evidence, and unrelated dirty work. New required architecture discovered here gets a numbered child under 066; neither this child nor 057 closes before its required follow-up does.

## Architecture, evidence, and execution rules

The destination is every dated API capability across Vanilla, Vue and Foldkit, not the currently passing subset. Follow `docs/standards.md:7-16`: “Graph meaning does not depend on a UI framework”; “Effect Schema owns runtime data contracts”; “A parity claim requires a test against reference behavior or output.” Derive types from Effect Schema. Decode external unknown once. Core owns graph/geometry/serializable transitions; adapter packages own framework integration; apps own DOM/application composition and demonstrations. `packages/foldkit` is the current reusable adapter; do not move it back into apps. Vanilla's public adapter remains in `apps/vanilla`; Plan 061 packages it without relocating that source.

Pin the existing manifest baseline: Effect and platform `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`; do not change dependencies or lockfile for this plan. Keep saved-document v1 compatible. Controlled actions are proposals until owner acknowledgement; uncontrolled actions validate, commit, notify. No second document authority, mutable store exports, private store setters, or mounting the Vanilla renderer inside Vue/Foldkit. Caller functions remain host-local; Foldkit ports carry schema-derived serializable requests/results.

Use spans/attributes from `packages/core/src/telemetry/flow-telemetry.ts`; trace decode/lifecycle/semantic-change/failure boundaries, not pointer moves. A research trace starts at the actual public/browser entry, follows state/geometry/DOM/rendered output, separates production/test paths, cites exact lines, and ends with `Conformity and deviations`. Leave imported `research/artifacts/` immutable. Pinned upstream SHA is `0a1f9575b25679f2880175de8d3eae21aedde921`, React 12.11.6; source inspection is distinct from current-site contract and executable comparison. Use disposable full checkouts and existing `scripts/capture-provider-session-reference.ts` / `scripts/capture-graph-edit-reference.ts` patterns. Do not publish generic parity claims or mark partial gaps intentional merely to close this plan.

## Commands and required expected results

Run from repository root. Browser suites run serially and alone with strict configured ports; do not reuse foreign servers.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Fresh dependencies | `bun install --frozen-lockfile` | Exit 0; unchanged lockfile |
| Quality | `bun run check` | Exit 0 |
| Public builds/types | `bun run typecheck` | Exit 0 |
| Architecture | `bun run check:architecture` | Exit 0 |
| Unit suite | `bun run test` | All pass |
| Vanilla production browser | `bun run test:browser -- public-state.e2e.ts` | All selected pass, no new skips |
| Vue production browser | `bun run test:conformance:vue -- public-state.e2e.ts` | All selected pass |
| Foldkit production browser | `bun run test:conformance:foldkit -- public-state.e2e.ts` | All selected pass |
| Packed artifacts | `bun run test:consumer` | Every host install/typecheck/mount passes |
| Generated API | `bun run docs:generate-api` | Exit 0 |
| Docs | `bun run docs:check` | Exit 0 |
| Trace | `bun run research:check-traces` | Exit 0 |
| Member inventory | `bun run scripts/check-api-members.ts` | Exit 0; every dated API page retained |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0 |
| Final local gate | `bun run verify` | Exit 0; no newly skipped tests |
| Diff whitespace | `git diff --check` | Exit 0 |

Record actual commands/counts, failures and environment limits. A hung or stopped verify is incomplete. Let generators update generated outputs; never hand-edit `research/generated/`. Existing two native-pointer skips stay explicit. Hosted CI, trusted devices, upstream runtime and collector-side telemetry are separate evidence.

## Git workflow and common done criteria

Use an isolated `codex/067-complete-origin-connection-contracts` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 067 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Confirm the independently approved domain and rendering architecture

Enumerate node origin, sourcePosition/targetPosition defaults, ConnectionMode/ConnectionLineType/ConnectionState and custom-line props from member manifest and official/pinned docs. Confirm the reviewed Schema-derived serializable coordinates/origin/preview state; rendering callbacks/styles remain adapter-local. Use independently approved section 067 for exact per-node/global precedence, parent-relative coordinates, opposite-corner resize anchors and explicit old/new reader serialization policy; inspect explicit handles and imports against those frozen rules. Use the reviewed coordinate convention shared by all core callers; adding origin cannot be a renderer-only transform.

**Verify:** architecture table/trace/member checker exit 0; new core contract tests encode exact origins and expected absolute positions/endpoints. Stop if safe v1 migration requires another plan; create it without dropping origin scope.

### 2. Implement origin across the actual call path

Update bounds, parent transforms, movement, resize anchor policy, fit/intersections/visibility, endpoint fallback and measurements to share the chosen origin semantics. Default origin keeps existing saved graphs unchanged. New reader must decode unchanged legacy v1; nondefault origin format requires separately reviewed explicit version compatibility and must round-trip; measured DOM values remain excluded. Native host input/update paths validate the same origin schema.

**Verify:** core geometry/runtime/persistence tests plus all three measured-geometry and renderer-contract suites pass; production cases cover 0/0,0.5/0.5,1/1, parented nodes, changed origins, zoom and controlled acknowledgement.

### 3. Complete native connection line options and renderer payloads

Expose line path/type/style/container style and valid/invalid/null preview fields through existing native extension points, with current semantic fields source/target IDs/handles/nodes/positions matched where meaningful. Style forwarding must preserve caller values and avoid changing interaction hit areas. Complete strict/loose connection policies against current graph validation and pointer/click/keyboard/reconnect paths; no graph edits on invalid or cancelled preview. Align generic payload extensions with 069.

**Verify:** all three interaction-lifecycle/renderer-contract suites pass; tests assert actual SVG paths/styles and custom renderer payloads during connect/reconnect, rejection, cancellation and disposal; packed public options compile and render.

### 4. Capture origin/preview reference and reconcile all variants

Run fresh pinned production capture for representative origins, explicit/default handles and connection-line variants/statuses. Compare graph-space/DOM endpoints and actual custom renderer state. Keep unimplemented variants open and assign a required child instead of excluding them.

**Verify:** two stable captures; new conformance tests and common final gates pass; 066 manifest marks only proven cells complete.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-origin-connection-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/origin-connection-reference.test.ts`; expect every comparison assertion to pass. For 067, the named capture/test is a proposed new file and must be created before these commands run.

## Plan-specific done criteria and STOP boundaries

- [ ] 066 decomposition approval and this section's independent architecture approval are recorded; any requested contract revision is independently reviewed before source changes.
- [ ] 063/064/067 final acceptance includes 069 integration where typed contracts affect their public outputs; implementation may start against accepted concrete schemas without claiming final generic closure.

- [ ] Every behavior/case named in Steps has exact implementation and public production test evidence; existing passing cases alone do not satisfy new variants.
- [ ] Every API/member family named in Current state and Steps is reconciled in 066's closure manifest with no dropped records.
- [ ] Selected upstream comparisons named in Steps are executable/reproduced, with explicit normalizations and native lifecycle limits.
- [ ] Every common done criterion holds and independent review approves the source, assertions and scope.

STOP if achieving these contracts requires unchecked casts, private mutable store access, unsafe graph publication, cross-owner DOM queries, persisting measurements/functions/DOM, or redefining the original API target as the currently easy subset. Report exact blocker and next required child.

## Maintenance

Revisit this child when public defaults/options/schemas, owner lifecycle or pinned/current upstream contract changes. Record capture dates and revisions independently. Evidence links require semantic review after line changes; count/checker success does not establish member behavior.

## Superseding persistence review, 2026-09-29

Independent `review_070` approved the named [070 migration child](070-migrate-origin-aware-persistence.md) and explicit amendment to parent 057 WP3 after a focused revision. Legacy saved APIs/types stay literal v1; additive v2 APIs preserve origin metadata, versioned host methods/ports are explicit, and Foldkit legacy snapshot failures settle through a correlated failure client without defecting the Runtime. The frozen de36b4f reader matrix and actual three-host restored geometry remain implementation gates. This supersedes the persistence planning blocker below, not its historical findings.065, checked 066 decomposition, all connection contracts and 069 integration remain required before this child's final acceptance.

## Round1 origin and reader compatibility

No normalized [0,1] restriction exists in pinned getNodePositionWithOrigin (system/utils/graph.ts:136-140): use finite coordinates and test negative/>1 origins. The central design explicitly distinguishes old-reader/old-v1, new-reader/old-v1, new-reader/origin format and old-reader/origin-format rejection. Current v1 saved body does not carry global origin and old node schemas may drop added node fields. Nondefault origin must not silently enter v1. An opt-in version2 extension needs independent approval before source changes; legacy origin-free version1 APIs/output remain unchanged. If this extension conflicts with parent policy, source execution stops pending a required migration child, with 067 still open.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: BLOCKED — Round2 final review: named persistence migration child and explicit parent v1 policy amendment required

Required next action: source/reference-grounded named migration child “Migrate origin-aware persistence while preserving legacy v1 contracts” (number unassigned/design pending), plus independently reviewed parent 057 v1-policy amendment. Version2 proposal is unapproved; source origin/persistence execution remains blocked. No capability is dropped or declared intentional to close the plan.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.
