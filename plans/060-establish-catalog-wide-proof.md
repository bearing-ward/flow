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
- Status: IN PROGRESS — phase-A proof infrastructure and calibration are active; timing budgets remain pending. A scoped Vanilla production-composition collector delivery proof now passes, while all-host/hosted/native and long-term-retention claims, Phase B, native-device evidence, and broader accessibility remain open.

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

## Execution record — Phase A performance calibration

- Status: **IN PROGRESS; timing budgets remain pending.** The live registry contains 77 host runs (30 Vanilla, 26 Vue, 21 Foldkit), with three or more warmed runs per required host/workload cell. This run count alone does not establish a defensible timing threshold.
- New balanced Vanilla captures: `bun run test:browser -- performance-calibration.e2e.ts`, run IDs `2b06051d-aa88-4a82-8f3c-22e8cc79f797` and `b151e5fd-76eb-4ea4-a661-77a13f3cfb9a`. Both passed all ten workloads, recorded 5 warmups and 20 samples per workload, and observed zero retained node, edge, minimap, or other DOM descendants at teardown. Captured environment: Chromium 151.0.7922.34, Darwin 27.2 arm64, Node 24.17.0, Bun 1.3.14, Playwright 1.62.1, Apple M4 Max (16 logical CPUs, 51,539,607,552 bytes RAM), 960×640 at device scale 1. Runs are appended without replacing earlier raw evidence in `research/benchmarks/calibration.json`.
- The previously recorded Vanilla `reconcile-1000-sparse` medians (385.4, 399.6, 394.0, 491.9, 411.0, and 395.6 ms), `reconcile-250-sparse` range (28.0–33.1 ms across six runs), `drag-1000-sparse-minimap` range (7.8–9.6 ms), and culling-enabled 4,000-node range (52.0–53.9 ms) are retained as historical raw-derived observations, not budgets. The registry now has 76 runs, including verification-generated captures and a focused Foldkit calibration capture; these earlier ranges describe their original sample basis and are not complete summaries of the current registry.
- Source inspection explains the high Vanilla unculled replacement cost: `apps/vanilla/src/mount-flow.ts` synchronously rebuilds the graph, scans the full document for visible nodes, reapplies node interaction/position state, moves each existing node through `viewport.append`, and reconciles edges. The 4,000-node workload enables culling and updates a viewport subset. This is a workload/host-path distinction, not evidence that the 1,000-node timings are interchangeable across adapters.
- The cause of the earlier 491.9 ms outlier is **unverified**. The registry's shared working-tree label does not establish identical source for every run, and the harness does not sufficiently record the working-tree dirty state or process state/load to use verifier-generated runs as isolated budget calibration. No quiet-window, thermal/power, or device-isolation conclusion is supported. No threshold was chosen.
- `bun run scripts/check-benchmark-calibration.ts` passed and validated 77 host runs (30 Vanilla, 26 Vue, 21 Foldkit) with status `pending-calibration`. Earlier verifier capture history is recorded below. The latest verifier-generated Vanilla capture `1e5a580d-b560-498b-b336-71347018b452` contains ten workloads, five warmups and 20 samples per workload, with zero retained DOM descendants, nodes, edges, and minimap elements. It is labeled `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` with dirty source state. It is an execution observation, not isolated budget calibration; `policy.timingBudgets` remains empty. Keep budgets empty until controlled, source-identical captures with adequate source and process-state records establish defensible limits. Plan 060 remains incomplete for device, accessibility, telemetry-delivery, and catalog-wide proof regardless of this calibration evidence.

### Latest verifier capture follow-up (2026-09-29)

The latest verify added exactly two dirty-snapshot captures: Vanilla `b7c35cc3-54a8-4141-a371-56912ef6336b` and Vue `0e4f44dd-d152-4177-b5ef-bd3abb7e5e98`; no Foldkit capture was produced by that verify. A later Foldkit conformance suite appended valid run `c8138716-724b-45a9-96cc-3d37561ed234` (six workloads, 20 samples per workload, zero retained DOM elements) from a dirty snapshot. At that point-in-time record, the registry totaled 76 runs (29 Vanilla, 26 Vue, 21 Foldkit). This capture is evidence of that completed workload, not timing-budget calibration. The benchmark checker passes; budgets remain `pending-calibration` and empty. These two captures are execution observations and do not establish timing thresholds.

### Focused Foldkit calibration capture (2026-09-29)

The serial Foldkit conformance run recorded `c8138716-724b-45a9-96cc-3d37561ed234`, a dirty-snapshot Foldkit capture with six workloads, five warmups and 20 measured samples per workload, and zero retained DOM descendants, nodes, edges, or minimap elements. The benchmark checker accepts the registry. The surrounding full Foldkit run had 87 passing and 16 failing tests because the test harness omitted app-owned sizing/skin CSS after package extraction; all 16 affected cases passed in a serial focused rerun after the harness loaded `apps/foldkit/src/playground.css`. This browser-suite issue does not invalidate the completed calibration capture. Timing budgets remain pending-calibration and empty; the source snapshot is dirty, so this capture is not isolated budget evidence.

### Latest verification outcome (2026-09-29)

`bun run verify` passed its static, build, and typecheck stages, then failed in the parallel Vanilla browser stage: 280 passed, 2 skipped, and 8 failed. Vue and Foldkit full-suite stages did not run. The same eight cases selected by title grep passed 8/8 when run serially. Do not treat the focused rerun as a green full verify. The verifier appended Vanilla capture `1e5a580d-b560-498b-b336-71347018b452`; the registry now has 77 runs (30 Vanilla, 26 Vue, 21 Foldkit). Timing budgets remain pending-calibration and empty.

### Full verification follow-up (2026-09-29)

The next `bun run verify` passed the 517-file quality check, architecture (132 production files), docs (19 Markdown files), React Flow catalog (208 rows), API member inventory (114 pages / 2,692 members), proof matrix, benchmark registry, 67-example registry, research inventory (649 files), 2,178 trace citations / 59 traces, package builds, typecheck, 295 unit tests, packed consumers, and the Vanilla production build/browser stage. It then failed in Vue conformance: 103 tests passed and one shared public-state contract case failed with `page.evaluate: Resulting promise was garbage collected` at `apps/vue/e2e/conformance.ts:33`. The isolated `bun run test:conformance:vue -- shared-conformance.e2e.ts --workers=1 --grep 'Vue production reads match'` passed 1/1; this does not turn the full verify green. Foldkit build/conformance stages did not run.

The verify run appended dirty-snapshot performance captures: Vanilla `b8ebd905-9e9d-4f91-9c32-fa073ac7fb9d` and Vue `5841d4bf-6b35-48aa-b9a1-95550fa621b4`. The calibration checker passes with 79 runs (31 Vanilla, 27 Vue, 21 Foldkit), but both new captures are execution observations from `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`, not isolated budget-calibration evidence. `policy.timingBudgets` remains empty and budgets remain pending-calibration.

### Full verification outcome (2026-09-29)

`bun run verify` exited 0. It passed quality (521 files), architecture (133 production files), docs (19 Markdown files), React Flow catalog (208 entries / 200 capabilities), API inventory (114 pages / 2,692 members), proof matrix (1 scoped record), benchmark validation (82 runs before capture), the 67-recipe registry, research inventory (649 files), traces (2,179 citations / 60 traces), package builds and typecheck, Vitest (39 files / 295 tests), packed Vanilla/Vue/Foldkit consumers (install, peer resolution, typecheck, styles, browser behavior, and disposal), Vanilla browser tests (291 passed / 2 existing skips), Vue browser tests (105 passed), and Foldkit browser tests (107 passed).

The verifier appended three performance records: Vanilla `2e19e266-71e8-49f1-a43b-2bd547505960`, Vue `aecfcd9a-e63d-4fe1-8a46-58e28c581c74`, and Foldkit `4f12c499-d7e0-4565-850a-9d36e1ac199b`. The registry now has 85 runs. All three identify `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` and are dirty-worktree execution observations, not isolated timing-budget evidence. Keep `policy.timingBudgets` empty and status `pending-calibration`. This local verification provides no hosted CI, collector-delivery, or trusted-device/accessibility evidence; those proof cells remain open, and Plan 060 remains IN PROGRESS.

### Subsequent full verification outcome (2026-09-29)

The latest `bun run verify` exited 0. Quality, architecture, docs/catalog checks, package builds, and typecheck passed; Vitest passed 39 files / 295 tests; the packed Vanilla, Vue, and Foldkit consumers passed install, peer resolution, typecheck, styles, browser behavior, and disposal; Vanilla passed 292 tests with 2 existing skips, Vue passed 106, and Foldkit passed 108. The benchmark checker validated 88 records before this run appended its captures; the registry now contains 91 runs.

The new captures are Vanilla `630f138a-0fdf-4ad9-9f86-c06e4ac5b015`, Vue `0f7e2472-960b-494b-bb16-f40547f2c184`, and Foldkit `7c1e47b1-c89f-4e7d-a99c-7ed1adab8853`. Each records source `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` with dirty state. They are verifier execution observations, not isolated timing-budget or device-calibration evidence. `policy.timingBudgets` remains empty and calibration status remains pending. This successful local run does not provide hosted CI, collector-delivery, or trusted-device/accessibility evidence. Those proof cells remain open; Plan 060 remains IN PROGRESS.

### Full verification follow-up after Appendix (2026-09-29)

`bun run verify` exited 0. Quality passed 547 files, architecture passed 143 production files, docs passed 19 Markdown files, the React Flow catalog passed at 208 entries / 200 capabilities, and the API inventory passed at 114 pages / 2,692 members. Research trace validation reported 2,180 citations across 62 traces. Vitest passed 39 files / 295 tests; all three packed consumers (Vanilla, Vue, and Foldkit) passed; and the Vanilla, Vue, and Foldkit browser phases passed. The benchmark registry held 91 records before the run and 94 afterward. Browser test totals are not included here because exact counts were not verified from runner output.

The new dirty-worktree performance captures are Vanilla `31c0296c-53e4-45ec-8644-332bef9432e5`, Vue `ff28df9c-c8b5-4489-af57-b1cbf2824d0d`, and Foldkit `e1551d53-1785-40fc-9e2c-e393dad645d4`. Each records `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` and `sourceTreeState: dirty`; they are execution observations, not timing-budget or device-calibration evidence. `policy.timingBudgets` remains empty and calibration remains pending. No hosted CI, collector-delivery, or trusted-device/accessibility evidence is claimed. These proof cells remain open and Plan 060 remains IN PROGRESS.

### Full verification in isolated worktree (2026-09-29)

`bun run verify` exited 0. Quality passed 557 files; architecture passed 147 production files; docs passed 19 Markdown files; React Flow catalog passed 208 entries / 200 capabilities; API inventory passed 114 pages / 2,692 members; trace validation passed 2,181 citations / 63 traces; Vitest passed 39 files / 295 tests; and all three packed consumers passed. Vue passed 108 tests and Foldkit passed 110. The Vanilla browser suite completed successfully with 296 scheduled tests; the exact pass/skip split was not verified. Benchmark validation began with 94 records and the run added three, bringing the registry to 97.

New capture IDs are Vanilla `2a5268ef-7edf-4b31-90c1-549629e17c99`, Vue `07a5137f-dc6f-4fe0-a9c3-eaa7f9c2367b`, and Foldkit `22ac9a4d-3ec9-41f6-9631-0e203f8dfd00`. Each is a dirty-worktree execution observation at `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`, not isolated timing calibration. Timing status remains pending and `policy.timingBudgets` stays empty. This local verification does not establish hosted CI, collector delivery, or trusted-device/accessibility proof; those cells remain open and Plan 060 remains incomplete.

Plan 060 latest full verification (2026-09-29): `bun run verify` exited 0 after correcting the Custom Node transform-only assertion; the previously observed Base Handle focus flake did not recur. Quality passed 557 files; architecture passed 147 production files; docs passed 19 Markdown files; React Flow catalog passed 208 entries / 200 capabilities; API inventory passed 114 pages / 2,692 members; trace validation passed 2,181 citations / 63 traces; Vitest passed 39 files / 295 tests; package builds and typecheck passed; all three packed consumers passed; Vanilla passed 294 with 2 skips, Vue passed 108, and Foldkit passed 110. The run's dirty-worktree captures are Vanilla `c000d596-6cee-4d61-b7d6-8802a73a25f0`, Vue `68b69d71-7b59-44d4-bed0-a21aef365adf`, and Foldkit `c2dbee7e-f275-4ade-bc49-2b077099da6d`, each labeled `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` with dirty source state. The calibration registry currently contains 104 records; these captures are execution observations, not timing calibration. `policy.timingBudgets` remains empty and calibration remains pending. This verifier does not establish hosted CI, collector delivery, or trusted-device/accessibility evidence. Those gates remain open and Plan 060 remains IN PROGRESS.

### Full verification after Foldkit node-internals follow-up (2026-09-29)

`bun run verify` exited 0. Quality passed 559 files; architecture passed 149 production files; docs passed 19 Markdown files; React Flow catalog passed 208 entries / 200 capabilities; API catalog passed 114 pages / 2,692 members; trace validation passed 2,181 citations / 63 traces; Vitest passed 40 files / 297 tests; package builds and typecheck passed; all three packed consumers passed; Vanilla passed 294 with 2 expected skips, Vue passed 108, and Foldkit passed 112. The verifier appended dirty-worktree captures: Vanilla `5f8726c5-2801-4240-a7e2-8cb005a0de4b`, Vue `53c33258-f8f3-453b-9190-b208040e788c`, and Foldkit `01c11686-40ae-437d-9a1f-9755bf9f92e5`, each labeled `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`; the calibration registry now contains 110 runs. They are execution observations, not isolated timing-budget evidence. `policy.timingBudgets` remains empty and pending-calibration. The Foldkit label-selector regression introduced by refresh geometry input was corrected to use `[aria-label="Node label"]`; independent review approved the correction and the two focused suites passed 4/4. Post-format checks passed `bun run check` (559), architecture (149), docs (19), trace validation (2,181 / 63), API catalog (114 / 2,692), plan-chunk validation (10 plans / 200 capabilities / 8 navigation entries), and `git diff --check`. Native-device, broader accessibility, timing-budget, and collector-delivery gates remain open; Plan 060 remains IN PROGRESS.

### Subsequent conformance-run failure (2026-09-29)

The latest `bun run verify` exited 1 in Vue at `apps/vue/e2e/interaction-lifecycle.e2e.ts:470`, through `apps/vue/e2e/conformance.ts:33`, with `page.evaluate: Resulting promise was garbage collected`. Vanilla completed 295 passed with two native-device skips; Vue completed 108 passed / 1 failed; the Foldkit full stage did not run. The exact failing test, `Vue keyboard connection uses controlled and uncontrolled public changes`, passed alone (1/1) with one worker. This is a conformance-run failure and does not establish a product regression; the full verifier was not retried. The run appended dirty-worktree captures Vanilla `83fd9766-a54b-4fe7-a87f-445c626afcf9` and Vue `a3642508-11c1-41ad-ac3d-e7259d4cf632`, bringing the registry to 112 runs. `policy.timingBudgets` remains empty and timing calibration pending. Post-format checks passed `bun run check` (569), docs (19), trace validation (2,181 / 64), API-member validation (114 / 2,692), plan-chunk validation (10 / 200 / 8), calibration validation (112 runs), and `git diff --check`. This local checkpoint does not close native-device, timing-budget, accessibility, or collector-delivery gates; Plan 060 remains IN PROGRESS.

### Final verification outcome after Labeled Handle inverse zoom (2026-09-29)

The final `bun run verify` exited 0 after the inverse-zoom behavior and Vue IDREF cleanup. It passed quality (569 files), architecture (152 production files), docs (19), React catalog (208 entries / 200 capabilities), API inventory (114 pages / 2,692 members), trace validation (2,181 citations / 64 traces), Vitest (40 files / 297 tests), all three packed consumers, Vanilla (295 passed / 2 expected skips), Vue (109 passed), and Foldkit (113 passed). This success supersedes the preceding Vue Promise-GC conformance-run failure as the latest full-verification outcome. New dirty-worktree captures are Vanilla `641861d4-adcb-4a5e-81c0-147a2d9fef90`, Vue `a9934b6c-71be-40cc-8267-1d372a174a00`, and Foldkit `e3a05776-1a77-4e77-8e19-92185b39afcf`, all labeled `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`; the registry now contains 115 runs. `policy.timingBudgets` remains empty and pending-calibration. Post-format checks passed `bun run check` (569), architecture (152), docs (19), traces (2,181 / 64), API inventory (114 / 2,692), plan chunks (10 / 200 / 8), calibration validation (115 runs), and `git diff --check`. Native-device, broader accessibility, timing-budget, hosted-CI and collector-delivery gates remain open; Plan 060 remains IN PROGRESS.

### WP5 scoped Vanilla collector delivery result (2026-09-29)

The positive `bun run scripts/check-collector-delivery.ts` run exited 0 for run `a8d8a3b2-dad6-4f5c-aa8a-fd1e07b6ce5c`. The retained artifact is `/var/folders/kd/6rwxf_c92zn45w5n_75r3gx80000gn/T/flow-collector-delivery-cBXG6j`; after shutdown and cleanup, its queryable sink retained 17 spans and 11 logs, including the expected decode, integrity, mount, controller-update, gesture-cancel, and destroy telemetry. Independent review approved the actual sink files and correlation to the parent run log.

The negative `bun run scripts/check-collector-delivery.ts --stopped-collector` run `5129cd68-971d-40e7-8bc7-c56cd8c8aa7c` exited 1 as expected because a stopped collector yielded no queryable retained output; its artifact is `/var/folders/kd/6rwxf_c92zn45w5n_75r3gx80000gn/T/flow-collector-delivery-Xnaghg`. Negative-query tests passed 5/5. This proves delivery, shutdown flush, retention, and querying only for the tested Vanilla production composition and local sink. It does not establish all-host behavior, hosted collector delivery, native-device behavior, or long-term retention. Plan 060 remains IN PROGRESS.

### Recorded full-verification and catalog checkpoint (2026-09-30)

The recorded `bun run verify` checkpoint (session 13179; `/tmp/flow-verify-wrap-checkpoint.log`) exited 0 for its then-current source snapshot. Quality passed 625 files; architecture passed 166 production sources; docs passed 19; React catalog passed 208 entries / 200 capabilities; API inventory passed 114 pages / 2,692 members; research traces passed 2,203 citations / 67 traces; Vitest passed 41 files / 302 tests; all three installed archive consumers passed; Vanilla passed 299 with 2 expected native-device skips, Vue passed 112, and Foldkit passed 117. The three new dirty-worktree calibration records are Vanilla `dc7b521c-c729-405b-aecc-8ac3d77b7b70`, Vue `79ac2054-6f3b-4ad2-9b8b-7e99608db096`, and Foldkit `7371ecda-8abd-4a22-a9f0-f9f46059a525`, each labeled `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`. The live registry currently contains 118 runs; timing budgets remain empty and pending-calibration. The final full verification after the current packed UI type/API repair is pending.

The separate milestone command `bun run scripts/check-react-flow-catalog.ts --upstream` exited 0 with 208 entries / 200 capabilities, `capturedOn: 2026-09-26`, and `upstreamChecked: true`. This validates the catalog's upstream metadata check; it is not a live React runtime or behavioral-parity result. Plan 060 remains IN PROGRESS: timing thresholds, native-device behavior, broader accessibility, and all-host/hosted/long-term collector claims remain open despite the scoped Vanilla local collector delivery proof.

### Latest full-verification attempt after Placeholder changes (2026-09-30)

The latest `bun run verify` (session 67160; `/tmp/flow-verify-wrap-final.log`) exited 1 in the Vanilla browser stage. Static checks before Playwright passed: quality 625 files, architecture 166 production sources, docs 19, catalog/API checks (208 entries / 200 capabilities; 114 pages / 2,692 members), and traces (2,203 citations / 67 traces); Vitest passed 41 files / 302 tests. Vanilla reported 298 passed, 2 skipped, and 1 failed: `apps/vanilla/e2e/placeholder-recipe.e2e.ts:3`, where `expect(locator).toBeFocused()` received an inactive node after `node.focus()` at line 14. Vue and Foldkit full browser stages did not run. The source executor is investigating; this result does not establish whether the focus assertion reflects a product issue or a test/environment issue. Calibration appended Vanilla run `7d0f82ee-19b8-42e0-8911-39629d73367e` from dirty `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898`; the registry now contains 119 records and timing budgets remain empty/pending. The successful session 13179 verification above is historical and is superseded as the latest result by this failure. Plan 060 remains IN PROGRESS.

### Final full-verification result (2026-09-30)

`bun run verify` exited 0 in session 68756, `/tmp/flow-verify-wrap-final-3.log`, with quality 625 files, architecture 166 production sources, docs 19 Markdown files, React catalog 208 entries / 200 capabilities, API inventory 114 pages / 2,692 members, traces 2,203 citations / 67 traces, Vitest 41 files / 302 tests, all three installed archive consumers passed, Vanilla 299 passed / 2 existing native-device skips, Vue 112 passed, and Foldkit 117 passed. This supersedes session 67160's Vanilla Placeholder focus failure and session 78886's generated-calibration formatting failure. The Placeholder test now awaits visible measured output before focus while retaining focus, Enter, selected-state, and single-node assertions; the focused serial repeat passed 5/5 before this full run. Source code stayed fixed during the calibration-only formatting repair.

The final run appended Vanilla `eec8b940-2ba1-4083-83e8-2d08374a472b`, Vue `5254c477-f726-4216-8e4c-e20e3e43f822`, and Foldkit `2227e78b-aa02-4378-9013-80b1b0897d42`, bringing the registry from 119 to 122 records. All values are retained during formatting. These dirty-snapshot observations keep timing budgets empty/pending-calibration. The separate current-site metadata check in `/tmp/flow-catalog-wrap-upstream.log` passed for 208 entries / 200 capabilities; it proves catalog metadata, not runtime parity. Plan 060 remains IN PROGRESS because Phase B, trusted native input, broader accessibility, timing budgets, and all-host/hosted/long-term collector evidence remain open. Local collector delivery is proved only for Vanilla.
