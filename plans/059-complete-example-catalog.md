# Plan 059: Complete catalog examples through supported APIs

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- apps/vanilla/src/examples/ apps/vue/src/examples/ apps/foldkit/src/examples/ docs/examples/` and inspect `git status --short`. Check the remaining in-scope paths below as well. Prerequisite changes are expected: record their SHAs and compare their contracts against this plan. Stop for an ownership or scope mismatch; revise later-stage details against the landed implementation before writing code.

## Status

- Priority: P2
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Design-first program, then sequential recipe-family implementation
- Depends on: 053-058 for dependent recipes; 060 phase A for stress budgets. Initial inventory may start immediately; 060 phase B follows this plan.
- Planned at: `f8b73f2`, 2026-09-27
- Status: IN PROGRESS — WP1 acceptance registry completed and checked; recipe implementation packages remain open.

## Why this matters

The project goal includes every example, including advanced layout, collaboration, history, whiteboard, and export experiences. A checked-in capability is insufficient until consumers can compose the full example outcome. This plan assigns all 67 dated entries to executable families and keeps optional integrations outside the graph core.

## Current state and exemplars

`apps/vanilla/e2e/graph-editing-examples.e2e.ts:4` exercises real UI:

```ts
test('vanilla Updating Nodes edits data, removes nodes, and reports protected deletion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const panel = page.locator('.flow-state-tools')
```

Plan 052's Updating Nodes and Delete Middle Node examples are bounded implementations, not complete upstream-page coverage. `research/catalogs/react-flow-2026-09-26.json` records 67 example capability entries and Pro flags. Existing `docs/examples/graph-editing.md` and `state-and-persistence.md` are public recipe patterns. The catalog checker currently permits only partial/gap implementation and unverified reference states; don't turn page existence into a parity claim.

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

- apps/vanilla/src/examples/, apps/vue/src/examples/, apps/foldkit/src/examples/, docs/examples/
- Existing app entry points/styles and host E2E directories for a navigable example gallery, plus app-owned example integration modules.
- `research/catalogs/example-recipes.json`, `scripts/check-example-recipes.ts`, its tests, `scripts/verify.ts`, `research/traces/example-catalog.md`, and Flow-authored example fixtures/capture harnesses.
- Optional example package manifests and `bun.lock` only after a dependency design step with owner/purpose/removal boundary in `docs/dependencies.md`.
- New child implementation plans under `plans/` for advanced integrations whose contracts cannot be fixed until earlier work lands.
- Out of scope: private-store access, copying restricted Pro code, collaboration/layout services in core, paid service provisioning, actual release publication.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New file names below describe proposed artifacts, not existing APIs.

## Ordered work packages

### 1. Inventory outcomes and produce the example acceptance registry

For each of the 67 dated example URLs, record the observable user journey, graph/data/visual result, public APIs used, three host routes, reset behavior, optional dependencies, licensing/reference availability, and automated/manual test boundary. Use the family allocation in plans/next-chunks-coverage.json as a starting point; preserve every URL and Pro flag. The registry must distinguish implemented recipe, tested result, and upstream comparison. Extend the example checker with negative tests for missing routes/tests, duplicate URLs, missing host coverage, and unsupported proof claims.

**Verify:** `bun run test -- scripts/check-example-recipes.test.ts` passes; `bun run scripts/check-example-recipes.ts` and `bun run plans/check-next-chunks.mjs` exit 0. Before completion the checker must reject a claimed complete example missing any supported host.

### 2. Complete node, edge, and interaction recipes

Use 053-058 primitives for custom/dynamic nodes, edge types/labels/markers/animation, drag/drop, connection events/limits/cycles/validation, intersections, reconnect/drop outcomes, context menus, contextual zoom, computing flows, and full state save/restore. Expand existing examples rather than creating a parallel editing implementation. Pure example dataflow computes from accepted graph data; cycle/error handling and cancellation belong to the example integration. Save/restore must define storage format and errors, not merely copy a variable in memory.

**Verify:** add `catalog-examples.e2e.ts` to all three hosts. Each registry case invokes actual controls/public APIs and asserts resulting data/DOM. All three suites pass serially; keyboard and narrow layout run for every interactive family.

### 3. Deliver grouping and layout integrations

Specify nested grouping/reparenting, selection grouping, expand/collapse, horizontal layout, Dagre, ELK with multiple handles, auto/dynamic/force layout, and collision outcomes. Feed measured geometry into an optional layout adapter; apply the result in one validated transaction. Late asynchronous layout results carry revision IDs and are cancelled/rejected on stale graph state. Keep dependencies optional and document the specific alternatives considered. A library dependency is justified only by the named layout family; never make it a core prerequisite.

**Verify:** add deterministic seeded layout fixtures for each integration and rendered example tests. Assert parent-relative coordinates, no dangling edges, handle alignment, cancellation on edit/unmount, and repeatable resets. `bun run check:architecture`, all example suites, and `bun run typecheck` pass.

### 4. Design and deliver advanced editing and collaboration

Before implementation, produce one self-contained child plan per unresolved integration family: undo/redo plus copy/paste, collaboration, whiteboard tools, export/server image. Each child fixes scope, protocol/dependency choice, data ownership, error behavior, and tests; record IDs in this parent. Design history around accepted transactions and controlled owner policy. Copy/paste remaps IDs and nested references atomically. Collaboration must demonstrate two independent runtime clients using a real transport, concurrent edits, disconnect/reconnect, and conflict resolution; an in-memory single-store simulation is not collaboration proof. No hosted service deployment is required for a local proof.

Whiteboard covers eraser, lasso, rectangle, and freehand drawing with explicit selection and geometry persistence. Image export covers fonts/assets/cross-origin failures and both browser and server routes without importing browser globals on the server. Do not assume a browser screenshot satisfies a public image-export contract.

**Verify:** child design docs pass `bun run docs:check`/trace checks; execute each child's complete gate before marking its family done. Parent example suites assert undo/redo state restoration, copy/paste ID integrity, two-client convergence and recovery, real whiteboard gestures, and decoded output image dimensions/content.

### 5. Finish styling, stress, and overview coverage

Implement base styling, dark mode, optional Tailwind integration, Turbo Flow, shape/rotation/position animation, and the feature overview. Stress uses Plan 060's reproducible workloads and hardware-labelled budgets, not an arbitrary large node count. A gallery links every completed example in each host, reports unsupported cells honestly, and keeps tools reachable at narrow widths. Reuse theme tokens without adding a mandatory styling framework.

**Verify:** the example registry checker finds one runnable route per supported host for every completed row; all three example suites pass. Visual/reduced-motion/focus tests pass for styles and animations; stress results satisfy the approved 060 gate.

### 6. Close the complete example inventory

Compare selected public/pinned reference outputs and retain inaccessible reference evidence as explicitly unverified. Broader example completion requires all 67 registry journeys in every host; this plan is not DONE merely because child plans exist. Record remaining reference differences separately from Flow recipe functionality.

**Verify:** all child plans' implementation gates, the example registry checker, catalog checker, and common gates pass. Record actual per-host completion counts and all unresolved reference cells.

## Plan-specific done criteria

- [ ] All 67 dated examples have acceptance journeys, assigned families, dependency decisions, and per-host routes/test evidence.
- [ ] Every implemented recipe uses public contracts; complete example claims require the full journey.
- [ ] Required child plans have been executed, not merely written; blocked reference access remains explicit.
- [ ] Collaboration, layout, storage, history, whiteboard, and export have real integration tests within their stated environment boundaries.

## Plan-specific STOP conditions

- An advanced example requires a protocol/dependency decision not grounded in current contracts: write and review its bounded child design before implementation.
- Restricted evidence is unavailable: keep the capability on the map and distinguish original equivalent functionality from unverified parity.
- A recipe needs a core mutation bypass or cannot remain coherent under controlled acknowledgement: send the missing contract to 057 instead of building a private engine.

## Maintenance and follow-up

This is a staged program, not one enormous source diff. Deliver one family at a time, validate it in all hosts, and preserve remaining families as TODO. Add new sidebar entries by dated snapshot review; never remove advanced examples because they need optional integrations. Plan 060 supplies stress budgets and broad proof; its infrastructure can run while these families are developed.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.

## Execution record — WP1 example acceptance registry (2026-09-29)

- WP1 inventory covers all 67 example capabilities from the dated baseline exactly once and preserves all 16 Pro flags. The registry allocates 37 entries to nodes/edges/interactions, 12 to grouping/layout, 9 to advanced integrations, and 9 to styling/stress/overview.
- Every entry records its observable journey and result, candidate public APIs, three host route paths, deterministic reset behavior, dependency decision, reference availability/licensing/comparison state, and separate automated and manual test boundaries. API validation remains pending for all 67 entries; routes remain planned in all three hosts. These fields describe acceptance work, not implemented gallery pages.
- Evidence audit found partial recipe/test coverage for Updating Nodes and Delete Middle Node in Vanilla, Vue, and Foldkit; the other 65 recipes have no catalog-specific tested result. All 67 upstream comparisons remain unverified. There are 59 entries with no dependency identified and 8 with a named dependency decision pending. No dependency was added.
- The checker now requires explicit dependency-decision and automated/manual test-boundary fields, checks dependency decision consistency with its rationale, and retains negative coverage for duplicate URLs, missing host routes/tests, missing host coverage, and unsupported completion/reference claims. It still rejects complete claims without existing in-scope route/test/API/reference evidence.
- Verification: `bun run test -- scripts/check-example-recipes.test.ts` passed (29 tests); `bun run scripts/check-example-recipes.ts` passed (67 dated examples across Vanilla, Vue, and Foldkit); `bun run plans/check-next-chunks.mjs` passed (10 plans, 200 capabilities, 8 navigation entries); `git diff --check` passed. `research/catalogs/react-flow-2026-09-26.json` and `research/artifacts/` were not modified.
- WP1 is complete. WP2–WP6 remain open; in particular, no per-example routes are runnable yet, the 8 optional dependency decisions need design, and reference comparison/license review remains pending. This is an inventory/checker milestone, not catalog completion or parity.

## Execution record — Custom Node recipe (2026-09-29)

- Implemented one bounded cross-host slice for the dated `https://reactflow.dev/examples/nodes/custom-node` row. The custom node displays a title, status control, and data-driven detail; activation updates accepted node data while retaining that mounted node's identity and position.
- Vanilla exercises public `mountFlow`, its `nodeRenderers` registry, and controller `updateNodeData`. Vue exercises `FlowCanvas.nodeTypes` with a controlled document owner that accepts and passes back the updated decoded snapshot. Foldkit exercises its typed node renderer and runtime `EditRequest`; its two canvas instances are independent, so only the activated instance updates.
- The recipe row in `research/catalogs/example-recipes.json` now marks implementation and all three focused mounted test results as partial. Host routes remain planned because these fixtures are not navigable user-facing gallery pages. Public API source paths are recorded for this slice; upstream reference comparison and visual/API parity remain unverified.
- Trace: `research/traces/custom-node-recipe.md`, including separate production and test paths and `Conformity and deviations`.
- Verification: final focused reruns passed Vanilla `bun run test:browser -- custom-node-recipe.e2e.ts` (1 test) and Vue `bun run test:conformance:vue -- custom-node-recipe.e2e.ts` (1 test). The Foldkit recipe passed alone with `bun run test:conformance:foldkit -- --grep 'Custom Node recipe'` (1 test); the renderer-contract suite also passed 6/6 once. A later suite rerun passed its five existing tests but timed out on the added recipe while awaiting its initial canvas; the recipe passed in isolation after that timeout. Cause is unverified, so Foldkit suite-order stability remains open. Scoped `bun run check`, `bun run typecheck`, `bun run docs:check`, `bun run research:check-traces` (2170 citations / 56 traces), `bun run scripts/check-example-recipes.ts` (67 examples), and `git diff --check` passed. No full verify was run.
- This completes only the bounded Custom Node implementation/test slice. WP2 and the other Plan 059 recipes remain in progress.

## Execution record — Drag Handle recipe (2026-09-29)

- Recorded one bounded recipe slice for `https://reactflow.dev/examples/nodes/drag-handle`. The shared `data-flow-drag-handle` and `data-flow-no-drag` contract is documented, and focused browser tests cover real mounted Vanilla, Vue, and Foldkit hosts. Vanilla verifies header movement, a nested action without movement, and scene reset; Vue verifies marked-handle movement, content suppression, normal body dragging for an unmarked node, and reload reset; Foldkit verifies content suppression, nested no-drag click/focus behavior, pointer and keyboard movement, and reload reset.
- The registry validates the actual host entry APIs and marker contract, records the three test paths as partial, and keeps all three gallery routes planned. The trace is `research/traces/drag-handle-recipe.md`; it separates production and test paths and records conformity, intentional Foldkit keyboard affordance, and unverified upstream comparison.
- Focused test results were supplied by the implementation executor: Vanilla `bun run test:browser -- playground.e2e.ts` passed 3/3, Vue focused Drag Handle test passed 1/1, and Foldkit focused Drag Handle test passed 1/1. Documentation review passed `bun run docs:check` (19 Markdown files); `bun run research:check-traces` verified 2,179 citations across 60 traces; `bun run scripts/check-example-recipes.ts` covered all 67 dated examples; `bun run plans/check-next-chunks.mjs` passed (10 plans, 200 capabilities, 8 navigation entries); `git diff --check` passed.
- This closes only the bounded Drag Handle recipe slice. WP2 remains open; the broader recipe inventory, dedicated gallery routes, cross-host connected-edge assertions, and upstream comparison are not complete.
