# Plan 066: Decompose and close every remaining public member acceptance cell

> Executor: read this entire file, execute steps in order and record every result. This is a required child of 057; completion of this bounded child does not close the parent. The coordinator maintains the index when dispatch says so.
>
> Drift check: `git diff --stat ce9210e61a7dcb370a45b91632c19d7e017e4898..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/src apps/vue/e2e apps/foldkit/src apps/foldkit/e2e scripts research/catalogs/api-members.json research/traces/public-api-completion.md docs plans` and `git status --short`. This plan was written over an uncommitted implementation snapshot, so inspect working-tree differences too. Compare quoted contracts, not just SHA. Existing accepted prerequisites are expected; source-contract disagreement is STOP.

## Status

- Priority: P1
- Effort: L, execute sequential bounded steps
- Risk: HIGH
- Category: direction
- Execution mode: Acceptance decomposition and delegated implementation
- Parent:057; parent remains IN PROGRESS
- Depends on: 057 WP1/WP2 and accepted slices; completion phase requires 063–065 and 067–069 plus any discovered required child
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: IN PROGRESS — structural decomposition phase executed and coordinator accepted the reviewed 065 subset; strict closure and remaining implementation/evidence phases are open

## Why this matters

Page-level correspondence has been copied to thousands of members without source-specific proof. This plan turns the remaining inventory into explicit executable work and reconciles actual implementation/reference evidence. It is a required acceptance owner and stays open while any original capability lacks an implemented mapping or reviewed justified difference.

## Current state and source excerpts

- **Current audit timestamp 2026-09-30T00:16:32Z (2026-09-29 local):** the earlier ARIA remainingDecision/citation defect is already fixed in the current working tree. The first record now states global ARIA/localization defaults and overrides remain open. Do not replay or label that old defect current. Recompute counts at execution because parallel reconciliation may continue.
- Source-only audit refreshed 2026-09-30T00:16:32Z: 2,563 owner 057 members across 100 pages; 4,684 partial and 3,005 gap host cells; 2,484 generic remaining decisions; 7,432 cells lack implementation or production-test evidence. These counts locate documentation work, not the count of missing features.
- `scripts/check-api-members.ts:186-239` validates complete claims structurally: required implementation/production-test/reference kinds, local source/test paths and exact upstream member URL. It cannot prove the cited lines describe the claimed member.
- Parent 057 `:82-84` requires numbered executable children for discoveries; `:140` requires all inventoried members or explicitly maintained open differences before complete API rows.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- `research/catalogs/api-members.json`, `scripts/check-api-members.ts`, `scripts/check-api-members.test.ts`; new `scripts/check-api-member-contracts.ts`, its tests, `plans/057-member-closure.json` (create).
- `plans/` for required children/index and parent bookkeeping; docs public API/correspondence; trace/public-api-completion, fixture README and PROGRESS.
- Existing capture scripts/harnesses/fixtures and conformance tests only for evidence reconciliation; new `scripts/capture-public-member-reference.ts`, corresponding harness/fixture/test if an uncovered reference batch requires it.
- No product implementation source edits in this plan. Dispatch missing product code to named children. `scripts/verify.ts` is explicitly in scope only to integrate the new closure checker; existing offline inventory and acceptance checkers remain distinct gates. Generated docs/research only through generators.

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

Use an isolated `codex/066-close-public-member-acceptance` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Exact checker commands and staged prerequisites

`bun run scripts/check-api-member-contracts.ts` must exit 0 after decomposition with every original cell accounted/owned, while preserving open gaps. `bun run test -- scripts/check-api-member-contracts.test.ts` must pass negative probes. `bun run scripts/check-api-member-contracts.ts --require-closed` must exit nonzero during open implementation, then exit 0 only after every required child/proof and reviewed difference passes. `bun run verify` includes the default structural checker; parent closure separately requires `--require-closed`. Do not wire require-closed into intermediate verify and block independent slices before completion.

Decomposition can execute now as a plans/catalog acceptance task; product source execution in 063–065/067–069 waits for independent approval of the named central design sections and this family's decomposition matrix.066 closure waits for all children. Architecture review is a concrete pending prerequisite, not user permission or claimed readiness.

## Ordered steps and behavior acceptance

### 1. Repair corrupt decisions and build a reproducible decomposition

Add a Schema-checked acceptance manifest keyed by page/member/host and grouped contract ID. A group may share proof only when assertions cover that exact member shape/behavior; retain nested generic and callback variants, not just top-level names. Classify each cell implemented-with-evidence, implementation-gap, evidence-gap, or reviewed-native-difference; include owner child, exact target export and test/capture. Remove misplaced decisions and stale citations without promoting status. Verify current official pages against dated capture; current drift remains separate from pinned behavior.

**Verify:** new checker unit negative probes reject orphan/duplicate cells, gap without required executable owner, generic placeholder decisions, wrong group membership and complete without member-specific proofs; `bun run test -- scripts/check-api-member-contracts.test.ts` passes. Both inventory/closure checkers exit 0 with every original cell accounted, including still-open gaps.

### 2. Assign the complete implementation queue

Reconcile cells covered by 053–056/058/059/061 against actual acceptance, avoiding duplicate implementation. Route provider/default 063, selector 064, measured refresh 065, origin/connection 067, appearance/accessibility 068, generic-data 069. For every remaining architectural family create another numbered self-contained child with source excerpts, no private store, public ownership, tests/reference and done gates. Candidates requiring inspection include interaction prop/config variants, callback families, minimap props, markers/styles, viewport hidden/extent options, SSR/Node fields and instance method variants. Do not assume this candidate list is exhaustive. A family whose current code works still needs member-specific evidence.

**Verify:** `bun run scripts/check-api-member-contracts.ts` exits0 with every missing implementation/evidence cell owned by an existing executable child; no unresolved placeholder owner and no requirement silently dropped. Update plan index and DAG without marking 057 DONE.

### 3. Reconcile proof after children land

Read source diffs and assertions, inspect generated package declarations and actual public exports, and reproduce selected reference groups. Generic type records require compile-time positive/negative consumer probes, not DOM tests alone. Current-site/pinned differences retain separate evidence. Fix structural checker loopholes discovered by semantic review and add negative probes. Do not rename unimplemented semantics into permanent intentional differences to get zero gaps.

**Verify:** both checker suites, conformance reference tests, all public member production suites affected by children and packed consumers pass. `bun run scripts/check-api-member-contracts.ts --require-closed` exits0: the closure manifest has no required unresolved implementation/evidence cells; every difference has an explicit reviewed architecture reason and boundary. Reference capture scripts reproduce pinned samples.

### 4. Audit whole-parent completion

Check every explicit 057 step/done gate against current state and required children. Run dated catalog checker and separately `bun run scripts/check-react-flow-catalog.ts --upstream` to report drift. Update supported statuses only; parent remains IN PROGRESS if any child/gate is missing. Integrate `['bun','run','scripts/check-api-member-contracts.ts']` into `scripts/verify.ts` beside the existing member checker. A structural ownership pass does not imply semantic closure. Checker modes: default validates complete original-cell accounting and executable owners even while gaps exist; `--require-closed` rejects any required unresolved implementation/evidence cell and any unreviewed difference.

**Verify:** all common gates and final verify exit 0; requirement-by-requirement closure manifest and reviewed child records support any DONE proposal. No source similarity, count or offline checker substitutes for runtime/reference proof.

## Plan-specific done criteria and STOP boundaries

- [ ] Every behavior/case named in Steps has exact implementation and public production test evidence; existing passing cases alone do not satisfy new variants.
- [ ] Every API/member family named in Current state and Steps is reconciled in 066's closure manifest with no dropped records.
- [ ] Selected upstream comparisons named in Steps are executable/reproduced, with explicit normalizations and native lifecycle limits.
- [ ] Every common done criterion holds and independent review approves the source, assertions and scope.

STOP if achieving these contracts requires unchecked casts, private mutable store access, unsafe graph publication, cross-owner DOM queries, persisting measurements/functions/DOM, or redefining the original API target as the currently easy subset. Report exact blocker and next required child.

## Maintenance

Coordinator independent full verification of the isolated approved-prerequisite snapshot, 2026-09-29: `/Users/richardmcandrews/.codex/worktrees/accepted-public-prerequisites/flow`, branch `codex/accepted-public-prerequisites`, contains the approved066 structural phase and original063 reference subset, plus planning records. It excludes stopped065 product source and the failed extended063 candidate. `bun run verify` exited0:42 unit files/329 tests, Vanilla299 passed/two existing native-pointer skips, Vue112 passed, Foldkit117 passed. Packed consumers, types, quality, architecture, docs, accounting and trace gates passed. Log: `/tmp/flow-accepted-public-prerequisites-verify.log`. This validates the bounded prerequisites only; all8,076 semantic cells remain open. The verifier regenerated calibration/SUMMARY using their generators; a post-run check found only calibration formatting, for which a bounded generated-output formatting repair is dispatched. No commits, merges, pushes or main-checkout changes occurred.

Revisit this child when public defaults/options/schemas, owner lifecycle or pinned/current upstream contract changes. Record capture dates and revisions independently. Evidence links require semantic review after line changes; count/checker success does not establish member behavior.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: TODO — acceptance plan APPROVED Round2; decomposition is next executable stage

Required next action: execute checked decomposition and ownership/checker phase. Strict closure and parent completion wait for every required implementation/reference/gate, including blocked 063/067/069 refinement. Approval does not mean current member cells are closed.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.

## Initial structural-phase execution record, 2026-09-29

Executed steps1–2 and only the default checker integration from step4 in the isolated cumulative `codex/remaining-actionable` worktree, starting from committed prerequisite snapshot `de36b4f64fe80d99886c0b7a9fb505258b872ac9`. The old uncommitted-prerequisite assumption is reconciled. No product source was edited by this executor. Coordinator owns plans/README.md, parent057 and central architecture records.

The Schema-checked `plans/057-member-closure.json` preserves all114pages,2692members and8076host cells in868exact groups. Existing UI component work remains058; original generic/member/callback variants are retained. Primary owners are058,063,064,065,067,068,069,071,072,073,074. Required070persistence compatibility is an explicit acceptance dependency for origin groups and saved-output groups, not a replacement owner for the flat public `toObject` return shape. Origin geometry executes before070migration, then067final acceptance waits for070proof. New self-contained required children071–074 retain their architecture-review prerequisite and exhaustive assigned cells.

All8076cells remain open.7396implementation-gap cells mean the inventory has no specific implementation citation sufficient for reconciliation; this is an implementation acceptance obligation, not a finding that7396features lack code.680evidence-gap cells already have implementation citations but still need exact assertion/reference review. No statuses or evidence links were promoted or replaced.2484generic remaining decisions were replaced with exact member/owner/family obligations; specific existing decisions were preserved. The historical ARIA defect was not replayed.

Reproduce the queue with `bun plans/066-decompose-members.mjs --check` or `--write`. Explicit `plans/066-member-routing.json` has no fallback owner rules. New/dropped original requirements stop regeneration; existing proof/review records are copied whole, including future completed claims. `bun plans/066-decompose-members.probe.mjs` exercises original regeneration, dropped-cell rejection, new-unmapped-member rejection and completed-proof preservation in disposable copies. The generator uses the existing Bun runtime.

Structural checker tests reject orphan/duplicate/missing cells and groups, gaps without executable child owners, generic decisions, wrong group membership, missing/self-referential prerequisites, wrong-host public entries, nonexistent exports, unowned proposed tests/captures, incomplete/member-mismatched proofs, documentation/fixture README references presented as executable proof, and unsupported native differences. Closed proof must cite exact implementation/test lines plus an executable `packages/conformance/src/*.test.ts` reference assertion and its exact upstream member. Semantic review of those lines remains required.

Coordinator scope amendment allowed one `vitest.config.ts` hunk to include the new checker test. `scripts/verify.ts` runs default structural accounting beside the existing member inventory checker; strict closure is deliberately separate.065's reviewed subset contains5groups/63members/189cells. Its three host targets are `apps/<host>/e2e/measured-geometry.e2e.ts` and its capture target is `scripts/capture-handle-refresh-reference.ts`. Declared InternalNode initialwidth/initialheight cells belong063, not065.

Actual commands/results for this phase:

- `bun install --frozen-lockfile`: exit0, unchanged lockfile.
- `bun run scripts/check-api-members.ts`: exit0,114pages/2692members.
- `bun run scripts/check-api-member-contracts.ts`: exit0,2692members/8076cells/868owned groups;8076open cells.
- `bun run scripts/check-api-member-contracts.ts --require-closed`: expected exit1,8076required unresolved cells. This is the required negative staging result, not closure.
- `bun run test -- scripts/check-api-member-contracts.test.ts`:13tests pass.
- `bun plans/066-decompose-members.mjs --check`: exit0. Four generator subprocess probes pass.
- Scoped TypeScript command `bunx tsc --noEmit --strict --skipLibCheck --target ESNext --module Preserve --moduleResolution bundler --allowImportingTsExtensions --types bun --noUncheckedIndexedAccess --exactOptionalPropertyTypes scripts/check-api-member-contracts.ts scripts/check-api-member-contracts.test.ts scripts/check-api-members.ts`: exit0 after test-fixture narrowing repairs.
- Scoped Oxlint/Oxfmt checks for this executor's checker/tests/config/generators pass after repairs. The initial full `bun run check` and `bun run typecheck` exposed new checker/test lint/type errors, corrected in scope. A later global check observed concurrent065product edits and remained unsuccessful; no current whole-worktree green claim is made.
- `bun run scripts/check-react-flow-catalog.ts --upstream`: exit0,208dated entries/200capabilities; live sidebar identities retained.
- `bun plans/066-check-current-member-drift.mjs`: exit0,114official pages fetched,0missing dated-anchor pages,0unverified pages. Hashes/date/counts are in `plans/066-current-member-drift.json`. This checks identities only; changed prose/default/type meanings and pinned runtime equivalence remain unverified. It does not modify dated evidence.
- `git diff --check`: exit0 at the structural checkpoint.

Full unit/architecture/docs/trace/consumer/browser gates and full `bun run verify` are deferred to coordinator's cumulative final verification after source children. Running them during partial065edits would test an unfinished snapshot. The separate063reference worktree's full verify is independent evidence and does not verify this cumulative checker snapshot. Parent057/066 remain IN PROGRESS; steps3 and whole-parent step4 closure are not executed.
