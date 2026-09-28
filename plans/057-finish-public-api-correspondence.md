# Plan 057: Complete remaining public contracts and member-level correspondence

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/core/src/domain/ packages/core/src/public.ts packages/core/src/telemetry/ packages/conformance/src/` and inspect `git status --short`. Expected prerequisite changes are not an automatic stop: compare them against the contract below and record their landed SHAs. If ownership, public contracts, or scope differ, revise this plan before implementation. Check every remaining in-scope path listed below as well.

## Status

- Priority: P1
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation
- Depends on: 053-056
- Planned at: `f8b73f2`, 2026-09-27
- Status: TODO

## Why this matters

Top-level catalog pages conceal many individual props, utility variants, and hook behaviors. Finish the member inventory and implement the remaining graph-change, store-observation, persistence, and deletion contracts without replacing Flow's validated ownership model.

## Current state and exemplars

`docs/react-flow-api-correspondence.md:1-9` explicitly calls itself a bounded member inventory. The catalog contains 114 API capability pages, not a complete count of members. Plan 052 delivered named edit operations but deferred NodeChange/EdgeChange utilities and asynchronous deletion hooks. Core deletion in `packages/core/src/domain/flow-edit.ts:35-39` is an Effect:

```ts
): Effect.Effect<FlowDocument, ProtectedDeletionConflict> =>
  Effect.gen(function* deleteElementsWorkflow() {
```

It expands descendants and checks protected nodes/edges before accepting the candidate. Vue `packages/vue/src/use-flow.ts:93-109` separates reactive accepted state from edit application. Match `packages/core/src/domain/flow-edit.test.ts`, public-edit browser tests, and the packed consumer instead of testing private host mutations.

## Architecture and evidence rules

The product target is every capability in the React Flow API, examples, and UI sidebars across plain JavaScript, Vue, and Foldkit. The dated inventory is `research/catalogs/react-flow-2026-09-26.json`; `research/PROGRESS.md` owns current status. Catalog ownership in `plans/next-chunks-coverage.json` is planning coverage, never a parity percentage.

Follow `docs/standards.md`: Effect v4 owns workflows and scoped resources; Effect Schema owns data contracts and derived types. Decode external unknown values once. Keep graph meaning, geometry calculations, and serializable transitions in `packages/core`; keep DOM, framework rendering, callbacks, and scheduling in their adapter. Vue integration already lives in `packages/vue`; Foldkit remains in `apps/foldkit` until its packaging plan. Do not mount the vanilla DOM renderer inside another framework. Preserve the exact Effect/platform `4.0.0-rc.116`, Foldkit `0.163.0`, and Vue `3.5.43` baseline unless a separately reviewed dependency change is required.

`docs/architecture.md:5-16` separates caller documents, viewport sessions, host-fed measured geometry, and transient gestures. Controlled operations propose changes; only owner acknowledgement changes accepted state. Uncontrolled operations validate, commit, and notify. Preserve Plan 052 atomic edits, protected deletion, FIFO/reentrancy, frozen updater inputs, and disposal settlement. Do not serialize functions, DOM nodes, measured geometry, or transient previews into the saved document.

Use the existing `FlowSpan` and `FlowAttribute` constants in `packages/core/src/telemetry/flow-telemetry.ts:1-56`; add named constants only for new boundaries. Trace decode, lifecycle, semantic change, and failure; do not log each pointer move. Application composition owns optional export and shutdown flushing.

A trace starts at the actual public/browser entry point and follows accepted state, geometry, scheduling, DOM effects, and rendered output with exact file:line citations. Describe test paths separately. End it with `Conformity and deviations`, classifying selected comparisons as conforming, intentionally different with a reason, or unverified. Pinned upstream source is `0a1f9575b25679f2880175de8d3eae21aedde921`; it is distinct from the current website contract. Leave `research/artifacts/` immutable. Use a disposable full upstream checkout for executable comparisons, following `scripts/capture-graph-edit-reference.ts`; imported research files alone are not a runnable upstream build.

## Commands and execution discipline

Run from the repository root. These scripts exist at the planning baseline; proposed new test files are named in the steps.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Fresh executor dependencies | `bun install --frozen-lockfile` | Exit 0, unchanged lockfile unless the plan explicitly adds a dependency |
| Quality | `bun run check` | Exit 0 |
| Architecture | `bun run check:architecture` | Exit 0 |
| Build-aware types | `bun run typecheck` | Exit 0 |
| Unit suite | `bun run test` | All tests pass |
| Vanilla browser | `bun run test:browser -- <test-basename>` | Selected tests pass, no new skips |
| Vue browser | `bun run test:conformance:vue -- <test-basename>` | Selected tests pass |
| Foldkit browser | `bun run test:conformance:foldkit -- <test-basename>` | Selected tests pass |
| Docs and traces | `bun run docs:check` and `bun run research:check-traces` | Both exit 0 |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0, every dated entry retained |
| Packed consumer | `bun run test:consumer` | Exit 0; currently core/vanilla only until Plan 061 |
| Complete local gate | `bun run verify` | Exit 0 |

After exported schemas change, run `bun run docs:generate-api` before the docs check. Let `verify` regenerate research inventory; never hand-edit generated research output. Run browser suites serially, with strict ports and no foreign server reuse. Keep the two existing native-pointer skips explicit; never add skips to make a gate green. At milestone closure run the catalog checker with `--upstream`; record drift without deleting the dated baseline or dropping capabilities.

Use an isolated checkout on `codex/<plan-number>-<slug>` when execution is dispatched. Preserve unrelated changes. Do not commit, merge, push, publish, or open a PR unless separately instructed. The latest recorded baseline is `f8b73f2`: Plan 052 records a successful full gate on 2026-09-27, with 146 unit tests and 203 vanilla browser passes plus two existing skips. This planning pass did not rerun that implementation gate. Reproduce a clean baseline before implementation and record actual counts afterward.

## Scope

- packages/core/src/domain/, packages/core/src/public.ts, packages/core/src/telemetry/, packages/conformance/src/
- Public API and observation/edit boundaries in vanilla, Vue, and Foldkit; corresponding unit/E2E/consumer fixtures.
- New `research/catalogs/api-members.json`, `scripts/check-api-members.ts`, `scripts/check-api-members.test.ts`, and `research/traces/public-api-completion.md`.
- `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, `scripts/verify.ts` to include the new offline checker.
- Out of scope: features assigned to 053-056/058 implemented a second time, backend collaboration, layout engines, arbitrary hidden store writes, renderer rewrites, publication.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New files named below are proposals, not existing APIs.

## Ordered work packages

### 1. Complete a member inventory and a bounded implementation queue

Read every API capability page in the dated catalog, current official docs, and pinned source where available. Record each prop/method/type variant/utility and hook behavior, source revision, target host equivalent, owner plan, current implementation/reference evidence, and remaining decision. Provider, store, keypress, state helper, node ID/data/connection, persistence, and default options must not disappear behind a broad page row. Add a Schema-checked offline checker that rejects absent/duplicate pages, unowned members, invalid evidence links, and unsupported complete claims. Preserve framework-native equivalents as explicit mappings, not automatic exclusions.

The rest of this plan implements the named batches below. If this inventory reveals a new architectural capability not covered by any current batch/plan, write a numbered self-contained child plan and mark this parent IN PROGRESS until it lands. Do not invent undocumented semantics to satisfy a row.

**Verify:** `bun run test -- scripts/check-api-members.test.ts` passes negative probes for missing/duplicate/unowned/unsupported claims; `bun run scripts/check-api-members.ts` exits 0 with every dated API capability assigned.

### 2. Add change-array and utility compatibility

Define NodeChange/EdgeChange variants and applyNodeChanges/applyEdgeChanges, addEdge/reconnectEdge utility semantics, type predicates, and remaining geometry wrappers not already supplied by 053/055. Separate pure collection transformations from validated document transactions: partial collections can be utility inputs, while installed graphs must satisfy integrity. Capture ordering, replacement/add/remove interactions, duplicate endpoint handling, missing IDs, and dimensions/selection fields. Do not route dimension changes into persistence by accident.

**Verify:** new `packages/core/src/domain/flow-change-compatibility.test.ts` covers fixed reference-derived arrays and immutable inputs; `bun run test` and `bun run typecheck` pass. Packed consumer type tests execute real public exports.

### 3. Finish provider, selectors, and instance persistence contracts

Map provider-scoped store access to supported read projections and validated actions. Implement node-ID context, data/key/connection selectors, state helpers, default node/edge options, and missing public fields identified in Step 1. Do not expose mutable internal Maps to imitate a React-specific store. Define toObject/session save-restore as a document-plus-viewport composition without changing saved-document version 1. Define server/import safety and initial declared geometry for non-browser consumers; DOM mounting stays client-only.

**Verify:** add `public-api-completion.e2e.ts` in all hosts. Assert provider isolation, readonly/mutation protection, selector notification behavior, controlled acknowledgement, persistence round-trip, hydration or explicitly documented non-browser boundary, and disposal. `bun run test:consumer` passes.

### 4. Add async pre-delete and deletion event contracts

At the host boundary accept an async pre-delete decision with typed result/error. Capture document revision and operation ID; on resolution, revalidate against current accepted state under an explicit no-silent-rebase policy. Cancellation/disposal settles the request once. A hook cannot remove protected descendants, race another edit into a partial graph, or emit deletion events before acceptance. Foldkit uses typed request/response messages; no functions cross ports. Specify onBeforeDelete/onDelete/onNodesDelete/onEdgesDelete payload and ordering differences against the reference.

**Verify:** the new browser suites cover allow/deny/modified candidate/rejection, concurrent edits, stale approval, controlled rejection, protected descendants, reentrant deletion, and unmount. Existing public-edit suites and core edit tests still pass.

### 5. Close API correspondence with reference evidence

Run selected pinned captures for utilities and async deletion, then link actual host observations. Extend catalog status vocabulary only alongside validation requiring precise evidence and per-host coverage. A complete API row requires all its inventoried members, or an explicitly maintained open difference; count-level coverage is not proof.

**Verify:** the new member checker, existing catalog checker, `bun run test:consumer`, and every common gate pass. Exported docs have no unsupported generic promise of React Flow compatibility.

## Plan-specific done criteria

- [ ] Every dated API page has a member inventory with per-host mapping and owned remaining work.
- [ ] Named utility, provider/selector, persistence, and async-delete batches have public tests and selected reference comparisons.
- [ ] New discoveries have executable child plans; this parent remains open while required children remain incomplete.
- [ ] The member checker is part of verify and rejects fabricated complete coverage.

## Plan-specific STOP conditions

- An async hook needs unbounded pending state, implicit rebasing, or unsafe graph installation: stop and settle the contract.
- An API requires exposing the private mutable host store to appear identical: specify a framework-native public equivalent and its limits first.
- Inventory reveals an unplanned subsystem: create a bounded child plan rather than implementing it in this catch-all batch.

## Maintenance and follow-up

The member inventory is a living acceptance surface, separate from the dated sidebar baseline. Later upstream prop changes must update it even if sidebar URLs are unchanged. Recheck TypeScript consumer examples whenever a mapped signature changes.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
