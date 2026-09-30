# Plan 065: Refresh measured handle centers and dynamic edge endpoints

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
- Depends on: 066 decomposition approval; architecture section 065 approval; 053 measured geometry baseline; 054 custom renderer baseline; 057 accepted refresh facade
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: BLOCKED — final revision exhausted; Foldkit pointer-up handler migration fails typecheck

## Why this matters

The current refresh updates node bounds while an arbitrarily relocated DOM handle can leave edge endpoints on inferred side centers. Dynamic handle layouts need measured per-handle geometry scoped to the owning canvas, stable refresh scheduling and clear disposal semantics. These measurements must never enter persistence.

## Current state and source excerpts

- `packages/core/src/domain/flow-runtime.schema.ts:56-60`: `MeasuredNodeSchema = S.Struct({ height, nodeId, width })`; no handle centers.
- `packages/core/src/domain/flow-measurement.schema.ts:47-52`: NodeMeasurementInput carries generation/height/nodeId/width, so stale generation guards can be extended rather than duplicated.
- `packages/core/src/domain/flow.schema.ts:48-52` persists handle id/kind/side only; DOM coordinates are transient host-fed geometry.
- `packages/foldkit/src/update-node-internals.ts:9-18` exposes single-ID `refresh(nodeId)` and host resolveElement/measure callbacks.
- Pinned `packages/react/src/hooks/useUpdateNodeInternals.ts:54-67` accepts `string | string[]`, scopes element lookup under domNode, batches updates and schedules requestAnimationFrame with triggerFitView:false. This is evidence, not permission to put DOM in core.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- Core `flow-edge.schema.ts`, `flow-edge.schema.test.ts`, `flow-runtime.schema.ts`, `flow-measurement.schema.ts`, `flow-graph.ts`, `flow-graph.ts` and `flow-fit-view.ts`, connection/reconnection geometry consumers and corresponding tests; `packages/core/src/public.ts`.
- Vanilla measurement/mount/public files; Vue measurement observer/canvas/use-flow/public files; Foldkit measurement observer/update-node-internals/application/graph/public files and unit tests.
- All hosts' `measured-geometry.e2e.ts`, dynamic custom renderer production fixtures; packed-consumer script/fixtures.
- `scripts/capture-handle-refresh-reference.ts`, `research/harnesses/handle-refresh/`, fixture and conformance test (create).
- This plan/index/parent 057/Plan 053 evidence appendix, public docs, API catalog/correspondence, named trace and PROGRESS; generated API docs.

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

Use an isolated `codex/065-complete-measured-handle-refresh` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 065 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Define the measurement/refresh contract

Trace actual edge endpoint and connect/reconnect candidate call paths in all hosts. Define Schema-derived handle identity (node/id/kind), node-local measured center/bounds, generation and viewport conversion. Node origin/default geometry integration belongs 067; retain fallback side-derived geometry until measured and for server consumers. Define batch-ID refresh, duplicate/missing IDs, coalescing, resize/viewport changes, node removal and disposal. Match upstream observable endpoint timing where practical; any native schedule difference needs measured evidence.

**Verify:** trace checker and typecheck exit 0; new core measurement tests assert valid/invalid data, stale generations, handle addition/removal and fallback.

### 2. Integrate measured endpoints without changing documents

Extend the existing transient measurement authority; no second map/store controlling graph meaning. All edge rendering, connection preview, hit targeting and reconnection consume the same accepted measurement projection. Removed/hidden/replaced handles cannot retain stale endpoints. Convert DOM client rectangles through owning viewport once at boundary; zoom/pan and nested node offsets must remain correct.

**Verify:** focused core geometry/measurement/connect/reconnect tests plus `bun run test` pass; saved document/session tests prove no measured data serializes; typecheck and architecture pass.

### 3. Wire public multi-ID refresh in every host

Vanilla controller, Vue useFlow and Foldkit host facade refresh IDs through native lifecycle and existing measurements. Keep functions/DOM local; Foldkit sends typed measurement actions/results, not DOM elements. Refresh should not move accepted nodes/viewport or trigger unrelated fit. Scheduled work must cancel or become harmless after node removal/disposal.

**Verify:** all three measured-geometry browser suites pass serially using the existing host commands with `measured-geometry.e2e.ts`. Cases relocate handles with unchanged node bounds, add/remove handles, batch two IDs including duplicates/missing, parent offsets, zoom 0.5/2, controlled graph stability and post-teardown late measurements. Assert exact rendered SVG endpoints plus candidate/commit target; bounding-box changes alone do not pass.

### 4. Capture dynamic handle reference and close member evidence

Capture same-size node handle movement, added/removed handles and batch refresh after a frame in pinned reference; normalize only coordinate origin and equivalent IDs. Compare actual public host endpoints and untouched graph/viewport, and document scheduling boundaries.

**Verify:** two stable captures; new conformance test passes; packed consumer exercises public batch facade; common final gates pass. Parent remains open while other children remain incomplete.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-handle-refresh-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/handle-refresh-reference.test.ts`; expect every comparison assertion to pass. For 065, the named capture/test is a proposed new file and must be created before these commands run.

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

## Round1 measurement migration requirement

Use existing MeasuredHandleSchema from flow-edge.schema.ts:18-26 as the only handle shape; offset is node-local center, width/height are graph units and side displacement remains edgeAttachmentPosition:55-75. Vue's measuredHandles map (flow-canvas.ts:1038-1045) becomes a derived readonly view of generation-tagged samples; remove independent writes rather than maintaining two authorities. Scope includes flow-edge.schema.ts and its tests, Vue measureNodeHandles and every existing map consumer. Equivalent Vanilla/Foldkit maps migrate atomically. Test removed handles/stale generations and zoom-adjusted center offsets, not just node bounds.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: TODO — architecture APPROVED Round2; source execution awaits 066 checked decomposition and coordinator dispatch

Required next action:066 checked member decomposition and accepted prerequisite snapshot. One MeasuredHandleSchema migration contract is architecture-approved; no implementation or proof of refreshed handle endpoints is claimed.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.

## Execution checkpoint and focused revision, 2026-09-29

The checked 066 decomposition and independent ownership review satisfy the staged prerequisite. All 63 original measurement records remain assigned; dynamic-handle evidence targets now name the measured-geometry suites and capture-handle-refresh-reference script. Initial source migration stopped after two typecheck failures: misplaced codemod assignments were repaired, then a remaining Vanilla resize-preview call referenced the removed edgeRenderer.measureNode method. No completion or passing verification is claimed. The coordinator will dispatch a focused revision to migrate this caller into the single authority and finish the approved steps; this is revision round1, not an automatic retry.

Public internal-node projection amendment: add Schema-derived readonly handles using the existing MeasuredHandleSchema. A single projection filters current generation, accepted handle identities and inherited graph visibility. Public dimensions and handles use this same projection; hidden/unmeasured nodes expose an empty handle array. Detach and freeze arrays, handle objects and offset objects before public delivery. Old generation, removed handles and hidden descendants cannot expose measurements. Persistence remains unchanged. Native handles differ structurally from React handleBounds; record the explicit semantic mapping and actual field test boundary rather than declaring raw-shape parity. Independent review identified these requirements before source resume.

Independent reviewer review_070 approved the public projection amendment with stale-generation/readiness, inherited visibility, detached/frozen nested geometry and unchanged persistence tests. Revision1 passed16focused unit tests but stopped at its second typecheck failure: accidental widening of unrelated nodeIds interfaces caused getNodesData's .map error at the current Vanilla source line8357. The coordinator inspected the diff and dispatched final revision2 to restore all unrelated signatures and finish the original gates. Browser/capture/packed/full verification remain unexecuted at this checkpoint.

## Final revision STOP, 2026-09-29

The first typecheck in final revision2 failed at Vue disposal waiter settlement (`packages/vue/src/flow-canvas.ts:4839`) because a string was assigned where branded NodeId was required. After that focused repair, the second `bun run typecheck` failed at `packages/foldkit/src/graph.ts:3422`: a pointer-up callback calls the new geometry helper with `model`, but that callback only has serialized view input. Core, Vanilla and Vue package builds passed before the Foldkit failure. Migration must carry accepted measurement geometry through the existing typed view input; a live DOM or fabricated coordinate fallback would evade the reviewed authority contract. The executor stopped without further edits or checks.

The coordinator read the focused unit assertions and independently reran both files: 16 tests passed. This verifies their bounded generation/visibility/mutation and failure-settlement assertions only. New dynamic browser fixtures/assertions are unrun; reference capture, packed consumers, docs and full local acceptance remain incomplete. No member cell closes. All partial source is preserved uncommitted in the isolated remaining-actionable worktree. Two review revision rounds are exhausted;065 and downstream067 implementation are blocked. Parent057 remains open.

Coordinator final cumulative `bun run verify` exited1 at the quality gate: formatting issues in21 changed files and lint violations in the unfinished065 slice. It stopped before typecheck, browser, packed or later verifier stages. This independent result does not replace the separate recorded compiler failure, and no further repair was dispatched.
