# Plan 058: Deliver reusable canvas UI and catalog components

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- apps/vanilla/src/ packages/vue/src/ apps/foldkit/src/ packages/conformance/src/` and inspect `git status --short`. Check the remaining in-scope paths below as well. Prerequisite changes are expected: record their SHAs and compare their contracts against this plan. Stop for an ownership or scope mismatch; revise later-stage details against the landed implementation before writing code.

## Status

- Priority: P2
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation in six sequential UI batches
- Depends on: 053-056; 057 contracts needed by data-driven UI and DevTools
- Planned at: `f8b73f2`, 2026-09-27
- Status: TODO

## Why this matters

Vanilla canvas UI and application demo buttons do not provide reusable Vue or Foldkit components. Build framework-native controls and graph UI recipes from the public contracts, then compose the catalog templates. This enables consumers to reproduce the UI catalog without depending on playground internals.

## Current state and exemplars

`apps/vanilla/src/canvas-ui.ts:220-225` owns a DOM UI factory:

```ts
export const createCanvasUI = (
  settings: CanvasUISettings,
  actions: CanvasUIActions,
  panel?: HTMLElement,
  panelParent?: Node,
  panelNextSibling?: Node | null
) => {
```

It dispatches zoom/fit actions around lines 239-248. `flow-toolbar-anchor.ts` supplies core anchor geometry; panel ownership and restoration already have browser tests in `apps/vanilla/e2e/canvas-ui.e2e.ts`. The dated UI catalog contains 17 components and two templates. `docs/ui-licensing.md:3-5` records original Flow UI and requires review of any copied upstream assets. Follow the public API ownership from Plans 053-057, existing keyboard ownership tests, and the desktop/narrow playground tests; do not lift private app state into a component.

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

- apps/vanilla/src/, packages/vue/src/, apps/foldkit/src/, packages/conformance/src/
- Adapter-local `ui/` modules and stylesheet exports; `packages/core/src/domain/flow-toolbar-anchor.ts` and its tests only for shared geometry corrections.
- New `research/catalogs/ui-recipes.json`, `research/traces/shared-canvas-ui.md`, `docs/guides/canvas-ui.md`, host `canvas-ui-contract.e2e.ts` and `ui-recipes.e2e.ts` tests; host demo/gallery modules.
- Dependency/manifest/lockfile changes only for an explicitly recorded optional UI integration, with justification in `docs/dependencies.md`; no framework upgrade.
- Out of scope: a mandatory React/Tailwind/component-library dependency, copying restricted assets, a real AI service or workflow backend, package publication, graph runtime rewrites.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New file names below describe proposed artifacts, not existing APIs.

## Ordered work packages

### 1. Specify reusable UI contracts and the full catalog matrix

Map Background, ControlButton/Controls, MiniMap, Panel, NodeToolbar, EdgeToolbar, NodeResizer/NodeResizeControl, and ViewportPortal option-by-option. Keep screen-space overlay portals distinct from transformed viewport portals. Record placement, zoom scaling, visibility, keyboard ownership, focus restoration, disabled state, and lifetime. Add all 19 dated UI entries to ui-recipes.json with host export/recipe paths, tests, dependencies, and reference evidence status. Choose original CSS and native framework markup as the default; optional style integrations stay separate.

**Verify:** `bun run docs:check` and `bun run research:check-traces` exit 0; `bun run plans/check-next-chunks.mjs` confirms every UI entry remains owned. The recipe file retains all 19 entries without marking unimplemented ones complete.

### 2. Deliver controls, backgrounds, minimap, and panels

Extract or wrap the existing vanilla factory behind supported public exports. Implement Vue components/composables and Foldkit typed views/actions with the same options and per-instance scope. Minimap must reflect measured/nested/hidden graph state and use public viewport operations for navigation. Allow caller rendering where the reference exposes it. Panels must restore caller-owned DOM on destroy in vanilla; native framework children follow their framework lifecycle.

**Verify:** run each host's `canvas-ui-contract.e2e.ts` serially. Assert every supported background mode, fit/zoom limits, minimap navigation, selection/hidden updates, six panel positions, two hosts, removal and remount, and no duplicated listeners. Existing vanilla canvas UI tests still pass.

### 3. Deliver anchored toolbars, resize controls, and viewport portals

Use measured anchors from 053 and gestures from 056. Distinguish fixed-size screen UI from graph-scaled children. Cover all toolbar alignments/positions and selection/visibility rules; resizing uses public actions with accessible keyboard controls. HTML edge labels and viewport portals must not create a second event-routing layer that swallows interactive descendants.

**Verify:** three canvas UI suites assert DOM position through pan, zoom, node/parent movement, culling, resize, hide/remove, and host teardown. Screenshots at desktop/narrow widths show canvas tools unobstructed.

### 4. Build the 17 catalog components as recipes with native exports

Implement in dependency order: Base Node, Base Handle; Status Indicator, Appendix, Tooltip; Labeled Handle and Button Handle; Database Schema, Placeholder, Labeled Group; Edge with Button, Edge with Node Data, Animated SVG Edge; Node Search, Zoom Slider, Zoom Select; DevTools. UI actions use the public editing/measurement/viewport/query APIs. Data stays app-owned. DevTools reads supported snapshots/diagnostics and routes writes through validation; it must not reach into mutable internal Maps. Animations honor reduced motion; tooltip/search support focus and keyboard use.

**Verify:** `ui-recipes.e2e.ts` exists in all hosts and exercises each recipe's actual user outcome, not only its presence. Assert graph effects, accessible names/focus, keyboard activation, data updates, reduced motion, and teardown. Update the recipe matrix with test IDs and runnable routes.

### 5. Compose both templates and compare reference outcomes

Build Workflow Editor and AI Workflow Editor examples from the completed public recipes. Keep workflow execution and AI transport behind example-owned interfaces with deterministic local implementations; label simulation honestly. If a real integration is requested later, specify authentication, cancellation, failure, and cost separately. Reproduce publicly observable template outcomes; unavailable Pro source is an evidence boundary, not permission to omit the template. Review exact licensing before copying any source or asset; original equivalents are the default.

**Verify:** the UI recipe suites run both templates through add/connect/configure/delete/save/restore and failed/cancelled simulated execution in every host. Inspect screenshots. Repeated pinned/public reference observations are linked where obtainable; blocked comparisons remain unverified.

### 6. Document reusable consumption and close the chunk

Publish framework-specific import examples and customization boundaries. Run tests through public exports, and update catalog rows only to their supported evidence level. Package extraction remains 061.

**Verify:** `bun run test:consumer` and all common completion gates pass; no demo-only import is required by a public recipe.

## Plan-specific done criteria

- [ ] Every built-in canvas UI family has a native host equivalent and option matrix.
- [ ] All 19 dated UI entries have runnable equivalents and per-host user-outcome tests, or the plan remains open with the blocked entry named.
- [ ] Templates compose public APIs, keep execution app-owned, and identify simulated services.
- [ ] Desktop/narrow controls remain reachable and keyboard/focus behavior is tested.

## Plan-specific STOP conditions

- A recipe requires a missing public contract: return a concrete dependency to its owner plan before using a private store.
- Reference behavior is inaccessible or license permission is unclear: implement an original observable equivalent where possible and keep reference status open; do not claim matching private implementation.
- A template needs a real backend or credentials to meet newly requested outcomes: write a separate integration plan, retaining deterministic local template proof.

## Maintenance and follow-up

Keep recipe code opt-in and independent of core geometry. Adding future UI entries requires a native equivalent and tests in each supported framework. Packaging must export CSS and optional recipes without bundling unnecessary framework runtimes.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
