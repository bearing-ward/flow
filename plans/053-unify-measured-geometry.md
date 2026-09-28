# Plan 053: Unify measured geometry and readiness across hosts

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/core/src/domain/ packages/core/src/public.ts packages/core/src/telemetry/ packages/conformance/src/` and inspect `git status --short`. Expected prerequisite changes are not an automatic stop: compare them against the contract below and record their landed SHAs. If ownership, public contracts, or scope differ, revise this plan before implementation. Check every remaining in-scope path listed below as well.

## Status

- Priority: P1
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation
- Depends on: 052 complete
- Planned at: `f8b73f2`, 2026-09-27
- Status: DONE — implemented and reviewed in the managed worktree at `/Users/richardmcandrews/.codex/worktrees/flow-roadmap-053-062/flow`. The shared three-host production fixture, Foldkit observer teardown proof, two independent pinned-upstream capture comparisons, and full verification gate all pass. Independent reviewer reran `bun run verify` successfully after resolving the Chromium renderer stall and adding the missing zoom, canvas-isolation, snapshot, and disposal coverage.

## Why this matters

All hosts need the same answers about measured node bounds, handle positions, and readiness before renderer, fit, and spatial APIs can agree. Start here: it removes fixed-size assumptions without changing the persisted graph or prematurely adding a spatial index.

## Current state and exemplars

`packages/core/src/domain/flow-runtime.schema.ts:56-62` already defines runtime dimensions:

```ts
export const MeasuredNodeSchema = S.Struct({
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
})
export type MeasuredNode = typeof MeasuredNodeSchema.Type
```

Match this Schema-derived pattern. `packages/core/src/domain/flow-fit-view.ts:12-24` takes a measurement map separately from the document and supports fallback dimensions. Vanilla owns a measurement map in `apps/vanilla/src/mount-flow.ts:935` and updates it around line 1500. Vue owns handle measurements and a ResizeObserver in `packages/vue/src/flow-canvas.ts:430-574`. Foldkit's current `apps/foldkit/src/graph.ts:535-553` renders textual edge records; it has no equivalent measured-edge output. `docs/architecture.md:20-23` explicitly rejects persisted DOM measurements and core DOM elements.

Test patterns: Schema/core tests in `packages/core/src/domain/flow-runtime.schema.test.ts`; actual Vue endpoint/path assertions in `apps/vue/e2e/connection.e2e.ts`; production Runtime fixtures in `apps/foldkit/e2e/shared-conformance.e2e.ts`.

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
- `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/flow-browser.ts`, `apps/vanilla/src/edge-renderer.ts`, `packages/vue/src/`, `apps/foldkit/src/graph.ts`, `apps/foldkit/src/application.ts` for measurement wiring only.
- Each host's E2E/conformance driver and minimal measurement demo in `src/main.ts`; existing host styles only for that demo.
- New `packages/core/src/domain/flow-measurement.schema.ts`, its unit test, `research/fixtures/measurement-contract.json`, `research/traces/shared-measured-geometry.md`, and `measured-geometry.e2e.ts` in each host E2E directory.
- New `scripts/capture-measured-geometry-reference.ts`, `research/harnesses/measured-geometry/`, and `research/fixtures/measured-geometry-reference.json` for this plan's bounded upstream capture.
- Out of scope: spatial-index integration, full renderer registries, viewport animation, generic host refactors, package moves, release metadata.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New files named below are proposals, not existing APIs.

## Ordered work packages

### 1. Decide the observable measurement contract

Write `shared-measured-geometry.md` before code. Specify measurement units as unscaled local graph units, parent-local versus absolute position, handle identity/side, initial/unmeasured/hidden/culled/removed states, zero-sized nodes, and generation tokens for stale observer deliveries. Define readiness with and without hidden nodes, explicit node-internals refresh for changed handle offsets, and read-only internal-node snapshots. Distinguish declared size from measured size. Select bounded pinned reference cases for initial sizing and handle relocation; record current website differences without silently changing evidence revisions.

**Verify:** `bun run research:check-traces` and `bun run docs:check` exit 0; the trace contains a state/notification table for all listed cases.

### 2. Add host-independent measurement state and tests

Create the new Schema module; reuse existing MeasuredNode rather than introducing competing width/height types. Provide pure application/pruning and readiness/query functions. Measurement changes cannot become document-edit proposals or persisted node updates. Use separate measurement revision/notification state so accepted document snapshots do not spuriously change. Reject non-finite or invalid boundary values; ignore stale generation results after removal/replacement. Keep the existing graph scan as the baseline.

**Verify:** `bun run test -- packages/core/src/domain/flow-measurement.schema.test.ts packages/core/src/domain/flow-fit-view.test.ts` passes, including zoom-normalization, nested nodes, empty graph, stale results, and immutable input cases; `bun run check:architecture` exits 0.

### 3. Wire observation and expose readiness in each host

Adapt vanilla observation, Vue ResizeObserver/nextTick, and Foldkit scoped commands/subscriptions to feed the same contract. DOM reading and observer cleanup stay local; Foldkit messages carry schema values and request/generation IDs, never elements. Expose corresponding getInternalNode, nodes-initialized/readiness, and updateNodeInternals operations using JS methods, Vue readonly projections/actions, and Foldkit selectors/ports. Define missing IDs and disposed request results. Coalesce refresh requests per frame without unbounded retries. Deliver a visible size/handle-offset toggle in all playgrounds now, even before custom renderers land.

**Verify:** `bun run typecheck` and each host's `measured-geometry.e2e.ts` run serially and pass. Assert real bounding boxes, refreshed handles, readiness transitions, and no observer/subscriber activity after unmount.

### 4. Prove a common geometry result

Add fixed fixture data for nested, hidden, culled, zero-sized, asynchronously resized, and remove/re-add-same-ID nodes. Extend production conformance drivers to return actual host measurements; do not compute observations from expected fixture coordinates. Assert DOM-to-graph conversion at multiple zooms, two-canvas isolation, cancellation of queued refresh, and no saved-document geometry leakage. Make declared offscreen dimensions usable for fit without claiming a DOM measurement occurred. Capture and compare the selected upstream cases twice with normalized results.

**Verify:** `bun run test -- packages/conformance/src/index.test.ts` and the three `measured-geometry.e2e.ts` suites pass; reference outputs match between repeated runs. Inspect desktop and narrow screenshots and record paths.

### 5. Close only the measured-geometry portion of the checklist

Update correspondence for InternalNode, useInternalNode, useNodesInitialized, useUpdateNodeInternals, and relevant node dimensions. Keep spatial-index state and renderer breadth open. Run the full gate and record host-specific results.

**Verify:** all common completion commands exit 0; saved-document tests still prove version 1 compatibility.

### Reference capture command

Create `scripts/capture-measured-geometry-reference.ts` by following the existing graph-edit capture script's pinned-checkout validation, isolated build/server lifetime, normalization, and cleanup. Mount real upstream public components and replay the selected cases through their public entry points. Run `bun run scripts/capture-measured-geometry-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout` twice against commit `0a1f9575b25679f2880175de8d3eae21aedde921`; both runs must exit 0 and produce matching normalized observations. The checkout path is supplied by the executor, never the immutable imported artifact directory. Keep volatile timings out of equality assertions, but retain raw evidence with environment metadata. Flow fixtures must observe its production APIs separately and compare the same inputs. A missing reference result blocks a conforming claim, not the ability to test Flow behavior.

## Plan-specific done criteria

- [ ] A shared measurement fixture passes through all three production hosts.
- [ ] Bounds and handles update after DOM resize and explicit refresh; stale deliveries and disposed requests cannot resurrect nodes.
- [ ] Readiness/internal-node/refresh contracts have public host equivalents and tests.
- [ ] Measurement state is absent from persisted documents and does not invent accepted document notifications.

## Plan-specific STOP conditions

- No reliable Foldkit measurement lifecycle can be expressed without DOM values in Model or a hidden global runtime: stop that design before adding a workaround.
- A reference readiness result contradicts the proposed semantics: classify and revise before calling it parity.
- A spatial index appears necessary: collect workload evidence and propose it separately; do not fold an index into this contract plan.

## Maintenance and follow-up

Renderer changes must invalidate the correct generation and preserve refresh settlement. Plan 054 consumes measurements for real paths; Plan 055 consumes them for fit and coordinate APIs. Performance indexing remains a measured decision in Plan 060.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
