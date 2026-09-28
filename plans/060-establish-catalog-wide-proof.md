# Plan 060: Establish catalog-wide behavior, device, accessibility, and performance proof

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/conformance/src/ apps/shared-e2e/ apps/vanilla/e2e/ apps/vue/e2e/ apps/foldkit/e2e/` and inspect `git status --short`. Check the remaining in-scope paths below as well. Prerequisite changes are expected: record their SHAs and compare their contracts against this plan. Stop for an ownership or scope mismatch; revise later-stage details against the landed implementation before writing code.

## Status

- Priority: P2
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Proof infrastructure plus environment-specific acceptance
- Depends on: phase A infrastructure/device strategy/budgets after 053-056; phase B final coverage after 057-059. Plan 059 stress depends only on phase A budgets, avoiding a cycle.
- Planned at: `f8b73f2`, 2026-09-27
- Status: TODO

## Why this matters

Feature tests must grow with the catalogs instead of accumulating blanket parity claims. This chunk closes the known native-input, browser, accessibility, performance-budget, and telemetry-delivery evidence gaps and makes supported claims mechanically reviewable.

## Current state and exemplars

`packages/conformance/src/index.ts:73-80` explicitly keeps mechanics in production drivers:

```ts
/** DOM selectors and browser-specific mechanics belong in an adapter implementation. */
export interface ConformanceAdapter {
  mount: (fixture: ConformanceFixture) => Promise<void>
  perform: (action: ConformanceAction) => Promise<void>
  snapshot: () => Promise<ConformanceSnapshot>
```

`apps/vanilla/e2e/performance.e2e.ts:354-372` samples 250/1000/4000 nodes and denser 1000-node edge sets. It asserts minimap mutations but currently sets no latency threshold. `docs/browser-and-accessibility.md:5-7` records Chromium-only automation, two unavailable native-pointer cases, and no screen-reader review. `scripts/verify.ts:5-32` runs local gates serially. `flow-telemetry.ts:1-31` provides named spans; transport success alone does not prove collector processing/storage/query.

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

- packages/conformance/src/, apps/shared-e2e/, apps/vanilla/e2e/, apps/vue/e2e/, apps/foldkit/e2e/
- Root/host Playwright configurations, `.github/workflows/ci.yml`, `scripts/verify.ts`, benchmark scripts and new proof-registry/checker scripts/tests.
- New `research/catalogs/proof-matrix.json`, `research/benchmarks/`, `research/traces/catalog-proof.md`, and local collector test configuration under `research/harnesses/telemetry/`.
- `docs/browser-and-accessibility.md`, `docs/observability.md`, `docs/tooling.md`, dependency docs and optional test-only dependencies.
- Production changes limited to deterministic observability hooks using existing capabilities; correctness/performance fixes beyond a small directly proven defect require a separate scoped plan.
- Out of scope: changing expected results to match regressions, weakening skipped-device claims, production spatial indexing without benchmark justification, arbitrary hardware budgets, public CI/release claims without hosted runs.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New file names below describe proposed artifacts, not existing APIs.

## Ordered work packages

### 1. Create an evidence registry and executable checker

Map capability/member/example IDs to host, browser/device, input kind, visual/behavior/accessibility/performance evidence, source revision, artifact, and classified result. Link upstream tests to Flow behaviors; unused tests remain explicitly unmapped. Add `scripts/check-proof-matrix.ts` and negative tests rejecting absent evidence, stale paths, and unsupported complete/reference claims. Reuse member/example registries rather than duplicating their status authority. Tests should compare fixed expected observations with real host outputs.

**Verify:** `bun run test -- scripts/check-proof-matrix.test.ts` passes all positive/negative fixtures; `bun run scripts/check-proof-matrix.ts` exits 0. A fabricated parity row and missing supported-host result must fail.

### 2. Expand browser, visual, and native-input coverage

Run Chromium, Firefox, and WebKit smoke/interaction subsets using actual Playwright configurations. Choose and record precise supported versions after observing results; WebKit automation is not an iOS device claim. Extend image baselines for each completed feature in each host with stable fonts/time/animations. Use a native-capable device/browser harness for simultaneous pointer capture and two-contact pinch, documenting event trust/capture evidence and cancellation. Retain the original skips until genuine cases pass in that environment.

**Verify:** explicit browser projects pass with commands recorded in the execution record; new device evidence includes captured/released IDs, cancel reason, restored DOM, and a valid subsequent gesture. Unavailable device access leaves this package incomplete, not green by emulation.

### 3. Complete accessibility and lifecycle review

Automate role/name/keyboard/focus/contrast checks where reliable; test canvas, custom controls, handles, labels, panels, resizing, selection, minimap, and UI recipes in every host. Conduct documented keyboard-only and screen-reader journeys on actual named browser/OS/reader versions. Expand invalid input, observer/listener/frame cleanup, mount failure, and repeated create/destroy tests. Extend existing generated graph invariants with measurement/viewport/edit properties and recorded seeds; don't add tests that restate implementation details.

**Verify:** all targeted browser/unit gates pass; manual reports record expected and observed announcements, focus order, errors, and retests. Do not label DOM roles as a complete accessibility audit.

### 4. Establish defensible performance budgets

Reuse the existing workloads in all three hosts. Record hardware/runtime, warm-up, sample counts, median/p95, node/edge density, culling/minimap mode, input latency, and retained resources after teardown. Gather at least three independent warmed runs per workload before proposing numeric budgets. Separate deterministic mutation/resource assertions from timing on controlled hardware. Add a checked-in budget file and a validator that rejects missing environments or insufficient samples. Failed budgets yield a profiled optimization child plan; spatial indexing is chosen only when measured against the scan on the same workload.

**Verify:** benchmark commands and budget validation pass on the declared environment; attach raw samples. A deliberate budget breach fails the validator. General CI does not enforce uncalibrated laptop timings.

### 5. Prove telemetry beyond transport

Provide an isolated collector plus queryable local sink, configured through app composition. Trigger decode failure, mount, edit, cancellation, and destroy, then assert correlated spans/logs were received, processed, retained, and queryable after flush. Use a unique run ID; do not scrape raw user documents or high-frequency pointer payloads. Add `scripts/check-collector-delivery.ts` with explicit collector startup requirements and time-bounded cleanup.

**Verify:** run the collector integration command against the real local collector/sink and assert named spans/attributes plus shutdown flush. A stopped collector or missing query result must fail. Keep this external-service gate separate from ordinary offline tests and disclose whether CI runs it.

### 6. Close catalog-wide claims and integrate stable gates

Register deterministic checks in verify and hosted CI; run costly device/hardware/service gates in explicit jobs or documented workflows. Preserve narrower historical evidence. Reconcile every open proof row in PROGRESS, including visual/input/lifecycle, performance, test mapping, and collector delivery. Full parity requires completed member/example/UI coverage and reproducible reference evidence, not merely a green shared Flow suite.

**Verify:** all common gates plus declared browser/device/performance/collector gates pass; retain hosted run URLs when CI is actually executed. If any required environment is unavailable, leave its row open and the complete-proof milestone incomplete.

## Plan-specific done criteria

- [ ] Every completed capability has scoped proof for every supported host, with fixed source/browser/device versions.
- [ ] Native-pointer, broader accessibility, performance budgets, invalid-state/lifecycle, and collector evidence are completed or explicitly block this milestone.
- [ ] Checkers reject invented full-parity claims and lost catalog entries.
- [ ] Hosted CI results, local results, and external environment results are reported separately.

## Plan-specific STOP conditions

- Required hardware, screen reader, or collector is unavailable: stop only the dependent proof cell; retain its exact missing evidence.
- A regression needs an architectural rewrite or unplanned runtime dependency: create a scoped fix plan and preserve failing proof.
- Timings vary too much for a stable budget: diagnose the environment/workload instead of choosing a permissive threshold.

## Maintenance and follow-up

Collect proof with every feature from 053 onward; this plan consolidates and expands it, not postpones testing until the end. Budget and support-policy changes require new measurements. Plan 062 must not present missing external evidence as a released support guarantee.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
