# Plan 064: Complete native selector and owner lifecycle contracts

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
- Depends on: 066 decomposition approval; architecture section 064 approval;069 integration before final acceptance; 057 accepted observation/key/connection slices; 056 interaction lifecycle baseline
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: BLOCKED — final review revision exhausted; browser assertion preflight fails quality

## Why this matters

Existing queries and observers cover selected accepted-state cases. Missing cross-owner active previews, reconnect reads and disposal contracts can hide another canvas's transient state or retain listeners after teardown. Complete native read/select/notification semantics without publishing mutable internal stores.

## Current state and source excerpts

- `packages/vue/src/use-flow.ts:139-148` exposes computed preview and `subscribeState`, `subscribeSelection`, `observeKeyPress`.
- `packages/foldkit/src/observers.ts:46-68` exposes `observeNodeConnections(options,callbacks): () => void` and `dispose(): void`; options carry nodeId/type/handleId and callbacks remain local.
- `packages/core/src/domain/flow-selectors.ts:68-78` derives directional options/query schemas; connection delta compares identity and reports disconnect then connect at `:49-64`.
- Pinned `packages/react/src/hooks/useConnection.ts:55-59`: `connectionSelector?: (connection: ConnectionState<InternalNode<NodeType>>) => SelectorReturn`, then `useStore(combinedSelector, shallow)`. Flow presently exposes only whole snapshots; exact React scheduling is not assumed.
- `research/traces/public-api-completion.md:194` names active owner isolation, Vue/Foldkit reconnect and disposal reads, selector equality, connection option variants and callback identity gaps.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- `packages/core/src/domain/flow-selectors.ts`, its tests, `flow-snapshot.ts` and tests, `packages/core/src/public.ts`.
- Vanilla mount/key observer/public files; Vue `use-flow.ts`, `flow-canvas.ts`, public exports; Foldkit observers/key observer/application/graph/public files and their unit tests.
- Host `public-state.e2e.ts`, `handle-connections.e2e.ts`, `interaction-lifecycle.e2e.ts`, existing test harnesses; `apps/shared-e2e/key-press-observer-contract.ts`; packed consumer fixture/script.
- `scripts/capture-selector-lifecycle-reference.ts`, `research/harnesses/selector-lifecycle/`, corresponding fixture and conformance test (create).
- This plan/index/parent 057, public docs, correspondence/API member catalog, `research/traces/public-api-completion.md`, `research/PROGRESS.md` and generated API docs.

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

Use an isolated `codex/064-complete-selector-owner-lifecycles` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 064 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Confirm the independently approved selector and callback lifecycle

Map useNodes/useEdges/useViewport/useConnection/useInternalNode/useNodesData/useNodeConnections/useHandleConnections/useOnSelectionChange/useOnViewportChange/useKeyPress plus state helpers to precise native exports. Define readonly projection, null/missing/invalid ID, initial delivery, equality, callback replacement, explicit/context ID, direction/handle filters, owner acknowledgement and teardown. Functions remain host-local; no arbitrary private store access. Support selector projection/equality over public immutable snapshots using native computed/observer APIs; a React-specific lifecycle difference must retain a reason and test boundary.

**Verify:** inventory/trace checkers exit 0 with every named member mapped; core unit cases exercise the public projection contracts.

### 2. Complete missing native projection and lifecycle behavior

Add any absent public readonly selector/observer behavior. Fix document-global lookup in affected owner paths rather than guarding away another canvas. Unsubscribe/dispose must be idempotent, settle pending resources and prevent new callback delivery; document reads after disposal follow one explicit supported terminal policy across APIs. Use Effect for scoped resources/typed failure and callbacks at adapter boundaries. Reentrant listener mutation must not corrupt delivery.

**Verify:** `bun run test` and `bun run typecheck` pass; existing core selector and host observer unit tests retain assertions.

### 3. Prove cross-owner and transient reads in production

Mount two same-host canvases with colliding node/handle IDs. Observe one active connect, reconnect, drag/wheel/selection and one idle owner; assert no foreign preview/coordinate/viewport notifications. Assert rejected controlled proposals silent, acknowledged updates once, callback replacement/disconnect-connect order, invalid/missing selectors, standalone unsubscribe, node removal, canvas unmount, late result and post-disposal behavior. Test Vue and Foldkit reconnect snapshot reads through public useFlow/Runtime ports. Extend production fixtures, never synthesize accepted state with a test reducer.

**Verify:** three public-state commands pass plus all three host `handle-connections.e2e.ts` and `interaction-lifecycle.e2e.ts` suites serially; no new skips.

### 4. Produce selected pinned observer comparisons

Capture selected initial/delta/equality/callback update/context/missing-node semantics in a clean pinned reference. Compare public native results with explicit payload mapping; React commit scheduling remains separately classified. Every previously named gap must be proven or owned by a required child.

**Verify:** two stable fresh captures; new conformance test passes, `bun run test:consumer` and common final gates pass.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-selector-lifecycle-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/selector-lifecycle-reference.test.ts`; expect every comparison assertion to pass. For 064, the named capture/test is a proposed new file and must be created before these commands run.

## Plan-specific done criteria and STOP boundaries

- [ ] 066 decomposition approval and this section's independent architecture approval are recorded; any requested contract revision is independently reviewed before source changes.
- [ ] 063/064/067 final acceptance includes 069 integration where typed contracts affect their public outputs; implementation may start against accepted concrete schemas without claiming final generic closure.

- [ ] Every behavior/case named in Steps has exact implementation and public production test evidence; existing passing cases alone do not satisfy new variants.
- [ ] Every API/member family named in Current state and Steps is reconciled in 066's closure manifest with no dropped records.
- [ ] Selected upstream comparisons named in Steps are executable/reproduced, with explicit normalizations and native lifecycle limits.
- [ ] Every common done criterion holds and independent review approves the source, assertions and scope.

STOP if achieving these contracts requires unchecked casts, private mutable store access, unsafe graph publication, cross-owner DOM queries, persisting measurements/functions/DOM, or redefining the original API target as the currently easy subset. Report exact blocker and next required child.

## Maintenance

Coordinator scope amendment, 2026-09-29: `apps/foldkit/src/main.ts` is included at its existing Runtime composition, snapshot request/read plumbing and teardown. It must supply the actual outbound connectionPreviews port to native observers, replace local pending snapshot plumbing with the approved createFoldkitSnapshotClient, and dispose that client with the owning Runtime. This exercises the production playground composition separately from harness-only wiring. No065 candidate source is a prerequisite or authorized copy.

## Concrete execution checkpoints, 2026-09-29

Initial compiler scaffolding stopped on optional query signatures and incorrect Foldkit Command.define/update-result conventions. Focused review revision1 used the existing execute callback and commands-union narrowing; required typecheck passed. The coordinator inspected the new observer/client assertions and independently reran three focused files:15 tests passed. These cover native equality, owner separation, query/callback replacement, disconnect reentrancy, terminal preview cleanup, request correlation and disposal. They do not prove production Runtime or browser behavior.

Required quality check then failed twice after focused repair. Its second run passed formatting but reported snapshot-client.ts52's instance-independent reporter scope and missing blank lines between Vue test-harness watcher registrations at1334/1337/1340. The executor stopped. Final focused review revision2 is authorized for those exact errors and completion of the original public/browser/reference/packed/docs/fullverify gates. Two new required failures after focused repair must STOP; no third automatic revision. No member cells or full064 acceptance are closed at this checkpoint.

Revisit this child when public defaults/options/schemas, owner lifecycle or pinned/current upstream contract changes. Record capture dates and revisions independently. Evidence links require semantic review after line changes; count/checker success does not establish member behavior.

## Round1 transient notification boundary

FlowSnapshotSchema contains accepted document/viewport only. The reviewed API separates accepted observeState/useFlowSelector from transient observeConnectionPreview/useConnectionPreviewSelector; transient move/cancel/reconnect notifications use the production preview source/typed Foldkit port even when accepted graph is unchanged. Tests must assert independent preview delivery, selector equality and terminal null without manufacturing accepted updates. Include snapshot/read/subscription disposal independently.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: TODO — architecture APPROVED Round2; source execution awaits 066 checked decomposition and coordinator dispatch

Required next action:066 checked member decomposition and accepted prerequisite snapshot. Architecture is approved; public implementation/tests/reference/packed/full verify gates remain incomplete.069 integration remains required before final generic acceptance.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.

Final064 revision2 STOP: required check/typecheck passed after encoded whole-event ingress and spacing repair. New real-owner browser assertion preflight then failed quality at apps/vanilla/e2e/public-state.e2e.ts1462 (no-invalid-void-type on Promise.withResolvers<void>). Executor stopped without edits/retries. Production assertions, capture, conformance, packed/docs/full verification remain incomplete. The shared browser slot was unused/released. No semantic member or full064 acceptance is closed.

Root independently ran mandatory `bun run verify` in the selector worktree after the final STOP. It exited1 at the same quality failure, `apps/vanilla/e2e/public-state.e2e.ts:1462` (`no-invalid-void-type`); log `/tmp/flow-064-final-verify.log`. No browser ran and no full acceptance is inferred from the earlier focused checks.
