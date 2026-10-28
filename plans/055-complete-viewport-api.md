# Plan 055: Complete viewport operations and coordinate contracts

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/core/src/domain/flow-runtime.schema.ts packages/core/src/domain/flow-fit-view.ts packages/core/src/domain/flow-pan-extent.schema.ts packages/core/src/public.ts` and inspect `git status --short`. Expected prerequisite changes are not an automatic stop: compare them against the contract below and record their landed SHAs. If ownership, public contracts, or scope differ, revise this plan before implementation. Check every remaining in-scope path listed below as well.

## Status

- Priority: P1
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation
- Depends on: 053; 054 for renderer-driven fit examples
- Planned at: `f8b73f2`, 2026-09-27
- Status: DONE — reviewed in `/Users/richardmcandrews/.codex/worktrees/flow-roadmap-053-062/flow`. Public viewport operations, host conversions, fit/zoom, controlled outcomes, cancellation, animation replacement, and disposal are implemented and covered. The cross-host policy preserves Vanilla's existing programmatic pan-extent constraint; Vue/Foldkit do not gain a new extent API, and cross-host extent parity remains explicitly unverified. CSS-transformed hosts are unsupported. Independent `bun run verify` passed; the pinned upstream capture repeated with matching normalized results; `bun run check`, docs, trace, architecture, upstream catalog, and `git diff --check` passed.

## Why this matters

Fit, zoom, coordinate conversion, and viewport events must have predictable behavior in every host before minimap, search, drag/drop, and contextual zoom can be portable. Reuse shared math and explicitly define async completion and controlled acknowledgement.

## Current state and exemplars

The current controller has a synchronous fit operation in `apps/vanilla/src/mount-flow.ts:508-525`:

```ts
readonly getViewport: () => Viewport
readonly fitView: (options?: FitViewOptions) => boolean
readonly updateViewport: (viewport: Viewport) => void
```

Vue `packages/vue/src/use-flow.ts:93-109` exposes accepted viewport and `updateViewport`; Foldkit has typed viewport replacement. Core `flow-fit-view.ts:12-24` receives pane dimensions, measurement maps, limits, padding, and fallback dimensions. Coordinate helpers in `flow-runtime.schema.ts:1098-1106` handle viewport transforms; public client/screen conversion must also account for the host element's offset. Match the existing core viewport tests and `apps/vanilla/e2e/viewport-operations.e2e.ts` unmeasured-fit behavior.

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

- packages/core/src/domain/flow-runtime.schema.ts, packages/core/src/domain/flow-fit-view.ts, packages/core/src/domain/flow-pan-extent.schema.ts, packages/core/src/public.ts
- Matching core unit tests and a new `flow-viewport-operation.schema.ts` only if serializable operation/result contracts need a distinct owner.
- Vanilla public/controller/browser capability files, Vue public/composable/canvas files, Foldkit graph/application files, their demos and viewport E2Es.
- `packages/conformance/src/`, `research/fixtures/viewport-contract.json`, `research/traces/public-viewport-contract.md`, each host's `public-viewport.e2e.ts`.
- New `scripts/capture-viewport-contract-reference.ts`, `research/harnesses/viewport-contract/`, and `research/fixtures/viewport-contract-reference.json` for this plan's bounded upstream capture.
- Out of scope: adding all UI controls, spatial indexing, renderer registries, unrelated gesture rewrites, package releases.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New files named below are proposals, not existing APIs.

## Ordered work packages

### 1. Freeze operation signatures and timing

Map getZoom, getViewport, setViewport, zoomIn/out/to, setCenter, fitBounds, fitView, viewportInitialized, screenToFlowPosition, flowToScreenPosition, and getViewportForBounds. Distinguish core pane-local math from client-coordinate public methods. Specify zoom limits, extents, padding, hidden/selected node inclusion, empty/unmeasured/zero-sized pane outcomes, animation duration/easing, reduced motion, superseding requests, and disposal. Resolve the existing synchronous fitView signature against the target async shape explicitly in the trace; include a migration path and migrate all local consumers in this plan if changed.

**Verify:** `bun run research:check-traces` and `bun run docs:check` pass; every method has result, failure, controlled-mode, and cancellation semantics recorded.

### 2. Implement validated core math and host operation lifecycle

Keep interpolation/math pure; hosts own requestAnimationFrame and interruption. Expose JS promises, Vue actions/readonly viewport projections, and Foldkit serializable requests/results with request IDs. An external controlled update or new operation must have a deterministic priority over in-flight animation. Do not resolve an operation as accepted when the controlled owner has only received a proposal; document result distinction without unbounded waiting for an acknowledgement.

**Verify:** `bun run test -- packages/core/src/domain/flow-runtime.schema.test.ts packages/core/src/domain/flow-fit-view.test.ts packages/core/src/domain/flow-pan-extent.schema.test.ts` passes; `bun run typecheck` exits 0.

### 3. Add lifecycle observations and real viewport scenes

Expose start/move/end viewport observation separately from accepted-state events; include programmatic operations as specified by the reference. Keep callbacks local to hosts and use serializable projections for Foldkit. Add visible center, fit-selection, zoom-to, conversion-marker, and animation cancellation controls, using custom-sized nodes from 054. Scope callbacks to one canvas and never emit after disposal.

**Verify:** all three `public-viewport.e2e.ts` suites pass. Exercise non-zero page scroll, offset containers, CSS-scaled host if supported, fractional zoom, resize, controlled rejection/delayed acknowledgement, rapid operation replacement, and reduced motion. Mark unsupported host CSS transforms explicitly instead of silently miscomputing.

### 4. Compare normalized viewport results

Add shared fixture inputs and expected accepted/result/event sequences. Assert actual DOM transforms and round-trip point conversion, plus content containment after fit. Capture pinned upstream equivalent operations twice, including duration-zero and interrupted animation. Do not use screenshot similarity as the only coordinate assertion.

**Verify:** `bun run test -- packages/conformance/src/index.test.ts`; serial new viewport and shared-conformance E2Es; all pass. Record desktop/narrow screenshot inspection.

### 5. Update public docs and close the milestone

Explain readiness, viewport ownership, async timing, and changed fitView usage. Update all local examples and the packed consumer if signatures changed. Only mark tested viewport members implemented.

**Verify:** `bun run test:consumer` and all common completion commands exit 0.

### Reference capture command

Create `scripts/capture-viewport-contract-reference.ts` by following the existing graph-edit capture script's pinned-checkout validation, isolated build/server lifetime, normalization, and cleanup. Mount real upstream public components and replay the selected cases through their public entry points. Run `bun run scripts/capture-viewport-contract-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout` twice against commit `0a1f9575b25679f2880175de8d3eae21aedde921`; both runs must exit 0 and produce matching normalized observations. The checkout path is supplied by the executor, never the immutable imported artifact directory. Keep volatile timings out of equality assertions, but retain raw evidence with environment metadata. Flow fixtures must observe its production APIs separately and compare the same inputs. A missing reference result blocks a conforming claim, not the ability to test Flow behavior.

## Plan-specific done criteria

- [ ] Every named viewport operation has a public equivalent in every host and documented completion/cancellation semantics.
- [ ] Actual container-offset conversion, measured fit, controlled ownership, animation replacement, and teardown pass fixed cross-host fixtures.
- [ ] Existing fitView callers compile and their browser behavior passes after any approved signature migration.

## Plan-specific STOP conditions

- Async viewport completion requires claiming unacknowledged controlled state is accepted: stop and revise results.
- Animation introduces a second viewport store that can diverge from accepted state and a bounded preview: stop.
- Reference options cannot map to current padding/extents without a behavior decision: document and resolve before widening schemas.

## Maintenance and follow-up

Plan 058 minimap/search/zoom UI must call these public operations. Keep pure conversion helpers distinct from host screen-coordinate methods; future CSS transforms and browser support must extend the conversion tests.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
