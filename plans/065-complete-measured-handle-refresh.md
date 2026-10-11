# Plan 065: Refresh measured handle centers and dynamic edge endpoints

> Executor: read this entire file, execute steps in order and record every result. This is a required child of 057; completion of this bounded child does not close the parent. The coordinator maintains the index when dispatch says so.
>
> Drift check: `git diff --stat 77a725e..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/src apps/vue/e2e apps/foldkit/src apps/foldkit/e2e scripts research/catalogs/api-members.json research/traces/public-api-completion.md docs plans` and `git status --short`. Reconciled against committed Plan 076 on main. Inspect working-tree differences too. Compare quoted contracts, not just SHA; source-contract disagreement is STOP.

## Status

- Priority: P1
- Effort: L, execute sequential bounded steps
- Risk: HIGH
- Category: direction
- Execution mode: Implementation after architectural contract review
- Parent:057; parent remains IN PROGRESS
- Depends on: 066 decomposition approval; architecture section 065 approval; 053 measured geometry baseline; 054 custom renderer baseline; 057 accepted refresh facade
- Planned at: `77a725e`, 2026-09-30 reconciliation; original baseline was `ce9210e61a7dcb370a45b91632c19d7e017e4898`
- Status: DONE in isolated acceptance candidate — primary reproduced414unit/62browser/threeconsumer focused gate and exact pinned capture; original63members/189cells retained,18implemented and171reviewed differences; acceptance patch awaits integration

## Why this matters

Plan 076 implements dynamic measured handles through one owner-scoped, generation-tagged authority in all three hosts. Rendered endpoints, batching and disposal now have production proof. This plan remains open to reconcile the original API members, especially nullable/optional geometry and React handleBounds versus Flow's native projection. Measurements remain transient and never enter persistence.

## Current state and source excerpts

Reconciled against `77a725e` on 2026-09-30. Historical checkpoints below retain their original evidence; the source failures and uncommitted prerequisite assumptions are superseded.

- `packages/core/src/domain/flow-runtime.schema.ts:56-62` includes optional `handles: S.Array(MeasuredHandleSchema)` in transient MeasuredNode.
- `packages/core/src/domain/flow-measurement.schema.ts:51-58` carries generation-tagged optional handles. `:234-305` filters current generation, accepted declarations and visibility; `:335-383` returns detached frozen FlowInternalNode geometry.
- `packages/core/src/domain/flow-measurement.schema.ts:16-23` exposes flat `handles`, numeric width/height and measurementStatus. React's optional measured dimensions, nullable bounds and split source/target handleBounds are not the same public structure.
- `apps/vanilla/src/mount-flow.ts:8609-8643`, `packages/vue/src/flow-canvas.ts:2485-2508`, and `packages/foldkit/src/update-node-internals.ts:37-155` implement native batch refresh. Vue's public signature is `packages/vue/src/use-flow.ts:210-212`.
- Pinned `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useUpdateNodeInternals.ts:51-68` accepts one/several IDs and schedules a frame without fitView. This is evidence for observable comparison, not a reason to put DOM in core.
- `plans/065-member-reconciliation.json` enumerates all 63 original members and their 189 open host cells in five groups. Native mappings are inspected; unresolved nested variants remain explicit. `bun run plans/check-065-reconciliation.mjs` checks identity retention and local citation ranges, not semantic parity.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- Core `flow-edge.schema.ts`, `flow-edge.schema.test.ts`, `flow-runtime.schema.ts`, `flow-measurement.schema.ts`, `flow-graph.ts`, `flow-graph.ts` and `flow-fit-view.ts`, connection/reconnection geometry consumers and corresponding tests; `packages/core/src/public.ts`.
- Vanilla measurement/mount/public files; Vue measurement observer/canvas/use-flow/public files; Foldkit measurement observer/update-node-internals/application/graph/public files and unit tests.
- All hosts' `measured-geometry.e2e.ts`, dynamic custom renderer production fixtures; packed-consumer script/fixtures.
- `scripts/capture-handle-refresh-reference.ts`, `research/harnesses/handle-refresh/`, fixture and conformance test (create).
- This plan/index/parent 057/Plan 053 evidence appendix, public docs, API catalog/correspondence, named trace and PROGRESS; generated API docs. Plan-owned reconciliation JSON/checker and the 065 cells in `plans/057-member-closure.json` are included for acceptance bookkeeping.

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
| Vanilla production browser | `bun run test:browser -- measured-geometry.e2e.ts` | All selected pass, no new skips |
| Vue production browser | `bun run test:conformance:vue -- measured-geometry.e2e.ts` | All selected pass |
| Foldkit production browser | `bun run test:conformance:foldkit -- measured-geometry.e2e.ts` | All selected pass |
| Packed artifacts | `bun run test:consumer` | Every host install/typecheck/mount passes |
| Generated API | `bun run docs:generate-api` | Exit 0 |
| Docs | `bun run docs:check` | Exit 0 |
| Trace | `bun run research:check-traces` | Exit 0 |
| Member inventory | `bun run scripts/check-api-members.ts` | Exit 0; every dated API page retained |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0 |
| Reconciliation identities | `bun run plans/check-065-reconciliation.mjs` | Exit 0; 63 members / 189 cells retained |
| Member accounting | `bun run scripts/check-api-member-contracts.ts` | Exit 0; all original cells retained, gaps allowed |
| Final development gate | `bun run verify` | Exit 0; saved focused scope plus any new relevant files; no newly skipped tests |
| Integration or broad acceptance | `bun run verify:full` | Required at integration/release milestones and before broad parity claims |
| Diff whitespace | `git diff --check` | Exit 0 |

Record actual commands/counts, failures and environment limits. A hung or stopped verify is incomplete. Let generators update generated outputs; never hand-edit `research/generated/`. Existing two native-pointer skips stay explicit. Hosted CI, trusted devices, upstream runtime and collector-side telemetry are separate evidence.

## Git workflow and common done criteria

Use an isolated `codex/065-complete-measured-handle-refresh` worktree for future implementation. Accepted geometry and prerequisites are committed at `77a725e`; no archived patch recovery is needed. Reconciliation itself edits only plans/. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 065 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are committed at `77a725e`; compare the isolated checkout against that baseline. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

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

## Authorized resumption and bounded source acceptance, 2026-09-30

The maintainer selected the remaining snapshot callers and measured-handle refresh for execution through Plan 076 against accepted baseline `2128b9e`. The old exhausted revision record above remains historical. The isolated candidate carries accepted measurement state through typed Foldkit pointer input, uses one generation-scoped geometry authority across all three hosts, and exposes detached frozen measured handle output without changing saved-v1 data.

Primary independently ran the saved focused `bun run verify` in `/Users/richardmcandrews/.codex/worktrees/snapshot-and-handle-refresh/flow`: exit0, `/tmp/flow-076-review-verify.log`,409 unit tests across46 files,43 selected browser tests and all three packed consumers. Quality,architecture,builds,TypeScript,docs,catalog,member inventory,structural ownership and traces passed. Primary also generated API docs and reproduced the clean pinned reference capture with two matching samples. All-host actual public geometry and SVG endpoints are compared against that reference under an explicitly equivalent caller layout. Native-layout cases cover zoom0.5/2,nested offsets,controlled stability,addition/removal,real pointer candidate/commit and disposal.

Verdict: APPROVE the bounded implementation and evidence. It remains uncommitted in the isolated worktree. This does not close the original member reconciliation, the8076 semantic cells,parents057/066/075,React hook scheduling,full-suite/native-device/CI or collector-delivery acceptance. The previous compiler/browser/packed blockers are resolved for this candidate. Plan076 records the complete execution and reviewer evidence.

## Reconciliation on main, 2026-09-30

Plan 076 is integrated by commit `77a725e`, present on main and `codex/snapshot-and-handle-refresh`. Both checkouts were clean at review start. The latest status supersedes the earlier isolated/uncommitted candidate descriptions. Do not repeat Steps 1-3 or recover the old failed candidate.

Read-only source review confirmed the measurement schemas, current-generation projection, public batch entry points and actual browser endpoint assertions. `bun run verify` was independently rerun in the existing executor checkout at this same commit. Exit 0, focused profile, fullSuite=false, 49.315 seconds, log `/tmp/flow-065-reconcile-verify.log`. It passed quality, architecture, package builds, types, 409 unit tests across 46 files, docs/catalog/API-member accounting/contracts/traces, three packed consumers and 43 selected browser tests. Scope was Vanilla measured-geometry, Vue measured-geometry, and Foldkit measured-geometry/delete-approval/placeholder-recipe. No source files changed during verification.

Stored pinned conformance fixtures and all-host rendered comparisons were rerun by that gate. The capture generator was inspected but not rerun in this advisor reconciliation because it writes the tracked reference fixture and invokes formatting. Fresh two-capture reproduction remains the separately recorded Plan 076 evidence. No full-suite, current-site refresh, CI, native-device or collector-delivery acceptance is claimed here.

### Remaining acceptance work, in order

1. Run `bun run plans/check-065-reconciliation.mjs` and `bun run scripts/check-api-member-contracts.ts`. Expect 5 groups, 63 original members, 189 host cells for this family, and 8,076 total original cells. Preserve every original member/host identity. The manifest currently has 3 evidence-gap and 186 implementation-gap cells for 065; these are acceptance categories, not a claim that 186 product behaviors are absent.
2. Review the five mappings in `plans/065-member-reconciliation.json` against the exact pinned types and current public schemas. The remaining families are one refresh member, two dimension rows, six nullable bounds records, four measured-object records and fifty handleBounds records. Explicitly resolve null/undefined/empty, optional IDs, all four positions, source/target partitioning, fallback dimensions and callback identity/timing. The source implements numeric geometry and a flat native handle projection; rendered endpoint equality alone cannot settle these original structural variants. STOP and request a named child if new public behavior or a changed architecture is required. Do not approve a native difference merely because it removes a gap.
3. Bind each decided member to its own implementation, actual public production assertion and exact reference. Add positive/negative installed-consumer probes where a declaration or optional/union branch is the contract. Reuse the current measurement authority and existing measured-geometry browser fixture. Refresh stale catalog links to the batch implementations and shared dynamic assertions; the existing hook row still cites pre-migration ranges such as Vanilla `:8521-8555`. Follow the existing Schema-derived `Proof` and `DifferenceCell` contracts in `scripts/check-api-member-contracts.ts:33-73`. Units are separate evidence from public browser assertions.
4. Update only the reviewed 065 closure cells and corresponding inventory evidence. `implemented-with-evidence` requires an assertion tied to that original member. `reviewed-native-difference` requires a named reviewer, architecture reason and actual test boundary. Keep unproved cells open. Rerun both member checker suites, targeted type/browser probes, packed consumers and `bun run verify` with saved scope extended for any new files. Refresh the reconciliation artifact/checker after deliberate cell transitions. Do not require whole-parent `--require-closed` success to assess this child, because other owners remain open; retain that command as the separate parent gate.
5. Independent acceptance may mark 065 DONE only when all 189 owned cells are resolved with reviewed proof or reviewed native differences, all original requirements hold and the relevant gates pass. Parent 057/066 remains IN PROGRESS. Geometry is already an accepted prerequisite for 067 source work; 067 final acceptance still depends on its own origin/persistence/generic requirements. Run the full profile at the next integration milestone as required by current project policy.

### Conformity and deviations

- Conforming within the tested boundary: all-host public geometry and SVG endpoints match the stored pinned equivalent caller layout; batches preserve document/viewport and addition/removal/disposal update transient state. Production assertions are `apps/shared-e2e/handle-refresh-contract.ts:141-210` and `:370-403`, registered by each host's measured-geometry suite.
- Intentionally different within the approved native design: Flow owns a flat, detached frozen center-based handle projection and returns per-ID asynchronous results. React exposes optional source/target handleBounds and a void-return hook. Core and public runtime paths remain separate from DOM collection. The Plan 076 geometry acceptance does not automatically review every nested original type variant.
- Unverified: the remaining optional/null and nested member mappings, exact React callback/frame scheduling, all 189 semantic closure cells, full-suite acceptance at this HEAD, and current upstream drift. This reconciliation audited Plan 065 and its direct measurement/test boundaries only; unrelated plans and feature families were not re-audited.

## Superseding original-member acceptance, 2026-09-30

Primary independently APPROVED the bounded original-member closure in `/Users/richardmcandrews/.codex/worktrees/contract-acceptance/flow`:189originalcells retained,18implemented-with-evidence and171reviewed-native-difference; other7887cells unchanged/open. Saved focused verifier exited0 in54.075seconds:414unit tests,62selected browsers and allthree packed consumers. Primary reproduced the exact pinned two-capture output and checked the complete diff and strict closure checker. See that candidate's primary review record. This is isolated candidate acceptance; main closure JSON has not been integrated and full-suite acceptance remains separate.

## Execute invocation revalidation, 2026-09-30

The maintainer requested `execute065` after the bounded candidate was already approved. Primary revalidated that existing isolated candidate rather than repeating completed source implementation. Fresh saved `bun run verify` exited0 in52.599seconds, focused profile, fullSuite=false:414unit tests across46files,62browser tests comprising21Vanilla/15Vue/26Foldkit, and allthree packed consumers. Quality, architecture, package builds, TypeScript, docs, catalog, member inventory/contracts and trace checks passed. Log `/tmp/flow-065-execute-revalidation-verify.log`. Candidate `git diff --check` also exited0; strict4176/4177/4178 ports were released after verification.

Verdict remains APPROVE for bounded065 acceptance. Geometry source is already integrated at77a725e; original-member acceptance edits remain isolated and uncommitted. No source edits, commits, merge or cleanup were performed for this invocation. Fresh full-suite and upstream capture were not rerun; the earlier exact pinned reproduction remains separately recorded evidence. Parents057/066 and other children remain open. The later081same-ID native generation-registration failure is an additional unresolved replacement boundary, not evidence that065's existing public measurement assertions failed.

Primary additionally reran `bun run plans/check-065-reconciliation.mjs --require-closed` and `bun run scripts/check-api-member-contracts.ts`, both exit0:5groups,63members,189hostcells,0ownedunresolved;2,692totalmembers/8,076totalcells with7,887otherrequiredcells open. Independent read-only review confirmed only the189065cells and63catalog memberrecords differ from baseline, with all original identities and other members/cells/metadata retained. See `plans/measured-handle-execute-revalidation-review.md` for scope and evidence limits. Checker success is accounting evidence; public behavior evidence comes from the reviewed and reproduced tests.
