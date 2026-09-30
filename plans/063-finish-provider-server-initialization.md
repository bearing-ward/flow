# Plan 063: Finish provider initialization, server geometry, and defaults

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
- Depends on: 066 decomposition approval; architecture section 063 approval;069 integration before final acceptance; 053 geometry and 055 viewport accepted implementations; 057 WP1/WP2/WP3 accepted public-state/session slices
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: BLOCKED — Round2 final review: provider-only empty/all-unsized/mixed fit and settled controlled-phase captures required

## Why this matters

Provider-only initial dimensions and default-node semantics remain open in parent 057. Non-browser consumers must be able to derive the same initial graph/viewport from declared inputs without mounting DOM. Defaults must have precise precedence on initialization, rendering, connection creation and owner updates.

## Current state and source excerpts

- `packages/core/src/domain/flow-default-edge-options.ts:15-31` defines the supported defaults: `type`, `path`, `label`, `data`, markers/stroke, selectable/focusable/reconnectable, hidden and zIndex. Its comment `:12-13` excludes identity/endpoints/handles/selection. Existing creation tests do not prove overlapping explicit/default precedence (`research/traces/public-api-completion.md:194`).
- `packages/core/src/domain/flow.schema.ts:63-81` has `position`, optional `size`, parent/handles/data and flags; declared geometry remains serializable; measured geometry is separate.
- Pinned `packages/react/src/components/ReactFlowProvider/index.tsx:13-32` declares `initialEdges`, `defaultNodes`, `defaultEdges`, `initialWidth`, `initialHeight`, initial fit options/min/max zoom. Exact excerpts: `initialWidth?: number; initialHeight?: number; fitView?: boolean; initialFitViewOptions?: FitViewOptions;`. These are initialization inputs, not a new mutable store.
- `packages/conformance/src/provider-session-reference.test.ts:128-206` already compares decoded nodes, selectors, edits and session restore; reuse its public `@flow/core` imports.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- `packages/core/src/domain/flow-initialization.schema.ts`, `flow-initialization.ts`, `flow-initialization.test.ts` (create); existing `flow-default-edge-options.ts` and its tests, `flow-persistence.ts`, `flow-measurement.schema.ts`, `flow-viewport-operation.schema.ts`, `flow-fit-view.ts` and `flow-fit-view.test.ts` where needed; `packages/core/src/public.ts`.
- `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/use-flow.ts`, `packages/vue/src/public.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`.
- Host `public-state.e2e.ts` and `renderer-contract.e2e.ts`, existing host public-state/test harness fixtures; `scripts/check-packed-consumer.ts`, `scripts/consumer-fixtures/` (new compile fixtures; current packed fixture strings live in `scripts/check-packed-consumer.ts`).
- `scripts/capture-provider-session-reference.ts`, `research/harnesses/provider-session/`, its fixture and `packages/conformance/src/provider-session-reference.test.ts`.
- This plan/index/parent 057, `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, generated API docs, API member catalog, named trace and `research/PROGRESS.md`.

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

Use an isolated `codex/063-finish-provider-server-initialization` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 063 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Confirm the independently approved initialization/default contracts

Read the current official provider page and pinned component/store initialization. Enumerate initial-vs-default document precedence, one-time initialization, declared dimensions, missing dimensions, fitView precedence, zoom limits and node defaults. Do not invent a React `defaultNodeOptions` prop: reconcile the parent's phrase against actual provider/Node defaults; any Flow extension needs an explicit source-independent reason. Write proposed schema-derived pure initialization input/result and a table of member mappings in the trace. No DOM access or measured geometry in this computation.

**Verify:** `bun run scripts/check-api-members.ts` and `bun run research:check-traces` exit 0; every named provider/default member has an explicit target and remaining decision.

### 2. Implement server-safe initialization and precedence in core

Add pure validated initialization from caller document plus optional initial viewport container dimensions, declared node geometry, fit options/zoom limits. Reuse viewport math; fallback/missing geometry must follow captured behavior or retain a specific open difference. No document version change. Test positive/zero/invalid dimensions, explicit viewport plus fit policy, hidden/parented nodes, omitted sizes, deterministic output and immutable inputs. For supported edge defaults test explicit false/0/string/object, missing fields, own undefined behavior, newly connected edges and render-only defaults without changing stored explicit records.

**Verify:** `bun run test -- packages/core/src/domain/flow-initialization.test.ts` and `bun run typecheck` pass. `bun -e "await import('@flow/core'); if (typeof document !== 'undefined' || typeof window !== 'undefined') throw new Error('unexpected browser globals')"` exits0. Add packed public-export assertions; `bun run test:consumer` passes.

### 3. Wire every public host entry and owner acknowledgement

Vanilla mount options, Vue canvas props and Foldkit program initialization accept the same core data contract through native conventions. DOM mounting remains client-only; initialize independently before mount. Prop changes do not accidentally reset one-time defaults or overwrite controlled owners. Production tests use different colliding IDs in two owners, exact initial/fit viewport, changed defaults, explicit field precedence during creation/render, restore acknowledgement and teardown. Reuse each real adapter fixture rather than a test-only reducer.

**Verify:** all three `public-state.e2e.ts` commands in the table pass; run corresponding `renderer-contract.e2e.ts` filters serially and expect all pass, no new skips.

### 4. Capture server/provider/default reference and reconcile

Extend pinned capture with initial width/height, fit initialization and supported edge-default creation overlap. Compare public Flow output and actual host observations with only enumerated structural normalizations. Record unsupported upstream fields as implementation work owned by 066/067/068/069, not completed exclusions.

**Verify:** run the capture script against a clean full pinned checkout twice; capture normalization stable; `bun run test -- packages/conformance/src/provider-session-reference.test.ts` passes. Run common final gates.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-provider-session-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/provider-session-reference.test.ts`; expect every comparison assertion to pass. For 063, the named capture/test is an existing extension point.

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

## Round1 source-grounded contract corrections

Implementation must follow the reviewed design's two phases: provider default-first initialization (`initialState.ts:55-56`) versus controlled ReactFlow StoreUpdater settled props (`StoreUpdater/index.tsx:141-150`). Capture/assert both. Mixed server geometry fits the dimensioned subset immediately and reports missing geometry, rather than requiring dimensions for all nodes. Preserve own undefined override by spread before validation; absent and own undefined must remain distinguishable (`EdgeWrapper/index.tsx:40-41`, `Handle/index.tsx:125-129`). New-origin persistence requires 067's explicit reviewed format compatibility policy, not an assumed optional-v1 change.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: BLOCKED — Round2 final review: provider-only empty/all-unsized/mixed fit and settled controlled-phase captures required

Required next action: capture provider-only empty/all-unsized/mixed initialization and independently capture settled controlled StoreUpdater phase. Pinned initialState69–82 computes centered/maxzoom output for empty filtered bounds; proposed fallback is rejected. Freeze replacement only after capture/source review. No implementation or third design rewrite in this checkpoint.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.
