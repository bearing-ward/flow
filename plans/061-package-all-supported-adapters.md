# Plan 061: Package Foldkit and verify every adapter from tarballs

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/foldkit/ apps/foldkit/ packages/vue/ apps/vue/ scripts/check-packed-consumer.ts` and inspect `git status --short`. Check the remaining in-scope paths below as well. Prerequisite changes are expected: record their SHAs and compare their contracts against this plan. Stop for an ownership or scope mismatch; revise later-stage details against the landed implementation before writing code.

## Status

- Priority: P2
- Effort: L, execute in the bounded work packages below
- Risk: MED
- Category: direction
- Execution mode: Extraction and consumer verification
- Depends on: 053-058 public contracts; may proceed alongside later 059 recipes and 060 proof
- Planned at: `f8b73f2`, 2026-09-27
- Status: DONE. Current public exports are reusable through all four archives; all three native consumers, separate Foldkit HMR probe, release dry-run, and the final common verifier passed. Packages remain private `0.0.0`; release licensing, publication, registry availability, complete recipe matrices, and upstream runtime parity belong to later work.

## Why this matters

Reusable delivery requires real package consumers. WP2 has promoted the Foldkit prototype into a native adapter package; WP3 must extend clean-consumer proof to Vue and Foldkit, including types, styles, peer dependencies, lifecycle, and HMR behavior.

## Current state and exemplars

At this plan's baseline, `packages/vue/package.json` exports `dist/public.js`, declarations, and `./style.css`, with Vue as a peer. Foldkit's then-current `apps/foldkit/package.json` was also named `@flow/foldkit` and had only app dev/build scripts, so packaging required renaming that app workspace. WP2 now records that migration. `scripts/check-packed-consumer.ts:65-74` currently packs only core and vanilla:

```text
yield* run(
  'bun',
  ['pm', 'pack', '--destination', packagesDirectory],
  path.join(root, 'packages/core')
)
```

`docs/standards.md` explicitly permits a reusable framework adapter in `packages/<framework>` with application demos in `apps/<framework>`. The existing Vue adapter is the layout precedent. Preserve Foldkit Vite plugin 0.24.0 and `foldkit/brand` cold prebundle configuration; a normal app build does not prove Model preservation across reloads.

## Architecture and evidence rules

The product target is every capability in the React Flow API, examples, and UI sidebars across plain JavaScript, Vue, and Foldkit. The dated inventory is `research/catalogs/react-flow-2026-09-26.json`; `research/PROGRESS.md` owns current status. Catalog ownership in `plans/next-chunks-coverage.json` is planning coverage, never a parity percentage.

Follow `docs/standards.md`: Effect v4 owns workflows and scoped resources; Effect Schema owns data contracts and derived types. Decode external unknown values once. Keep graph meaning, geometry calculations, and serializable transitions in `packages/core`; keep DOM, framework rendering, callbacks, and scheduling in their adapter. Vue integration lives in `packages/vue`; Foldkit reusable adapter integration lives in `packages/foldkit`, while `apps/foldkit` owns the `@flow/foldkit-demo` application. Do not mount the vanilla DOM renderer inside another framework. Preserve the exact Effect/platform `4.0.0-rc.116`, Foldkit `0.163.0`, and Vue `3.5.43` baseline unless a separately reviewed dependency change is required.

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
| Packed consumer | `bun run test:consumer` | Exit 0; all four archives across Vanilla, Vue, and Foldkit |
| Foldkit cold start/HMR | `bun run test:foldkit:hmr` | Packed consumer mounts, actual plugin handshake and one Vite reload restore semantic Model state; plugin-absent warning is visible |
| Complete local gate | `bun run verify` | Exit 0 |

After exported schemas change, run `bun run docs:generate-api` before the docs check. Let `verify` regenerate research inventory; never hand-edit generated research output. Run browser suites serially, with strict ports and no foreign server reuse. Keep the two existing native-pointer skips explicit; never add skips to make a gate green. At milestone closure run the catalog checker with `--upstream`; record drift without deleting the dated baseline or dropping capabilities.

Use an isolated checkout on `codex/<plan-number>-<slug>` when execution is dispatched. Preserve unrelated changes. Do not commit, merge, push, publish, or open a PR unless separately instructed. The latest recorded baseline is `f8b73f2`: Plan 052 records a successful full gate on 2026-09-27, with 146 unit tests and 203 vanilla browser passes plus two existing skips. This planning pass did not rerun that implementation gate. Reproduce a clean baseline before implementation and record actual counts afterward.

## Scope

- packages/foldkit/, apps/foldkit/, packages/vue/, apps/vue/, scripts/check-packed-consumer.ts
- Package manifests/build configs, root `package.json`/`bun.lock`/TypeScript references, `scripts/architecture-rules.ts`/checker tests, `scripts/release-dry-run.ts`, and `.github/workflows/ci.yml` for package consumers.
- Clean fixtures under `tests/consumer/` (read by `scripts/check-packed-consumer.ts:95-98`); add separate native Vue/Foldkit consumer subdirectories.
- `docs/guides/adapters.md`, `docs/dependencies.md`, `docs/release-process.md`, `research/traces/adapter-package-delivery.md`.
- Out of scope: changing graph semantics, replacing framework lifecycle with vanilla, framework upgrades, package visibility/version/license decisions, publication.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New file names below describe proposed artifacts, not existing APIs.

## Ordered work packages

### 1. Freeze native package contracts and migration inventory

Inventory the landed Foldkit Model/Message/OutMessage, view configuration, ports, measurements, selectors/actions, renderer/UI exports, and lifecycle resources. Identify which pieces are reusable and which belong to demo/application composition. Choose `packages/foldkit` as the public adapter, rename the demo workspace to a non-conflicting app name, and keep import specifier `@flow/foldkit` for the package. Preserve supported types and give migration examples. Match Vue's peer ownership; exact Effect compatibility remains checked rather than bundling duplicate runtimes.

**Verify:** `bun run docs:check` and `bun run research:check-traces` pass for the proposed export/lifecycle ownership table. Record expected package names before moving files.

### 2. Move adapter ownership and migrate all callers together

Move only reusable Foldkit graph/runtime integration into the new package. Keep application demo data, controls, optional telemetry exporter, and app bootstrap in apps/foldkit. Export supported public entry points and stylesheet paths; update app, E2E harnesses, examples, and architecture checks to consume the package. Remove legacy implementation-relative imports in the same slice. Do not maintain two independent copies of the adapter.

**Verify:** `bun run check:architecture` and `bun run typecheck` pass; all Foldkit conformance/renderer/viewport/interaction/UI suites pass serially through package exports. Architecture negative probes reject apps-to-package implementation imports and core-to-framework dependencies.

### 3. Extend real packed-package consumers

Build and pack core, vanilla, Vue, Foldkit and any public UI entry points. Install archives into separate temporary consumer roots without workspace aliases or access to source. Resolve archive names/versions from pack output instead of hard-coded 0.0.0 names. Typecheck actual imports and compile/run native framework examples. Verify stylesheet availability, custom renderers, geometry/fit, state/edit operations, controlled ownership, two instances, and disposal. Test that core can import in a non-DOM runtime.

**Verify:** `bun run test:consumer` exits 0 after covering all four archives and all three hosts. A missing declaration/CSS export or accidental source/workspace import makes the consumer fail. Assert a single compatible Effect/framework peer resolution.

### 4. Verify Foldkit cold start and reload separately

Run the dev consumer with a fresh ignored Vite cache, plugin enabled, and explicit foldkit/brand prebundle. Observe the actual plugin handshake and modify a Model value before a Vite-triggered reload. Assert preservation where supported and clear warning behavior when the plugin is absent. Keep this test separate from production tarball correctness; the consumer application owns Vite configuration.

**Verify:** a dedicated `package-hmr.e2e.ts` or equivalent isolated consumer probe passes both cold-start and reload behavior without repeated reoptimization reloads. All existing app conformance suites still pass.

#### WP4 execution record — isolated packed-consumer probe (2026-09-29)

Added `scripts/check-foldkit-hmr.ts` and `scripts/foldkit-hmr-server.mjs`, with a packed public-package fixture under `tests/consumer/foldkit-hmr/`. The probe packs core and Foldkit, installs them with Foldkit 0.163.0, Effect and browser-platform 4.0.0-rc.116, Vite 8.0.13, and `@foldkit/vite-plugin` 0.24.0 in a temporary consumer. Each Vite run gets its own new cache directory and plugin-enabled or plugin-absent config; the source edit targets only the temporary consumer's watched `revision.ts`. The Node server runner launches the temporary consumer's installed Vite; Bun handles packaging and Playwright.

`bun run test:foldkit:hmr` built both packages and installed the temporary consumer, then failed during plugin-enabled cold start before the graph node mounted. Vite reported `RangeError: Maximum call stack size exceeded` in the optimized `foldkit_brand.js?v=37f01ba2`, alternating `brandViewResult` and `isVNode`; Playwright then timed out after 10 seconds waiting for `[data-status="hmr-node"]`. Runtime versions were Bun 1.3.14, Node 24.17.0, Vite 8.0.13, `@foldkit/vite-plugin` 0.24.0, and Foldkit 0.163.0. An earlier attempt to load Vite/Rolldown in the Bun process crashed Bun 1.3.14 with `Segmentation fault at address 0x40` while loading `@rolldown/binding-darwin-arm64/rolldown-binding.darwin-arm64.node`; moving Vite to its own Node process removed that runner crash but exposed the cold-start failure.

The plugin-enabled Model edit, preserve/request/restore message assertions, single reload, post-reload semantic state, Runtime identity change, and plugin-absent warning case did not execute. Do not claim cold-start, HMR, or warning behavior as verified. Focused formatting, lint, and runner TypeScript checks passed. WP4 remains partial and Plan 061 remains IN PROGRESS; this probe must be rerun after the optimized `foldkit/brand` recursion is resolved.

#### WP4 resolution — packed HMR cold start and reload (2026-09-29)

The follow-up run recorded in `/tmp/flow-foldkit-hmr-cache-and-mount-fix.log` exited 0. Diagnosis: the plugin transforms/brands the optimized `foldkit_brand` module outside `node_modules`; the fixture's existing `.vite-hmr-*` cache paths bypassed the plugin's expected behavior. Caches now live at `node_modules/.vite-hmr-enabled` and `node_modules/.vite-hmr-disabled`. The fixture keeps persistent `#canvas` and targets an identified Runtime child, accommodating Foldkit's host-attribute replacement and the plugin's Runtime identity requirement. Assertions were unchanged. Independent review approved the fix. The packed probe passed plugin-enabled cold start, one full reload, WebSocket preserve/request/restore, semantic state restoration, Runtime replacement, and the plugin-absent warning/normal initial-state boot. The earlier cold-start recursion/time-out evidence above is superseded for this probe; its historical diagnosis is retained.

The packed consumer's earlier stalled invocation is separate from this HMR cache fix. A resumed `DEBUG=pw:api,pw:browser FLOW_CONSUMER_HOST=foldkit bun run scripts/check-packed-consumer.ts` run exited 0, with the log confirming packed Foldkit install, peer resolution, typecheck, styles, browser behavior, and disposal. The earlier `page.goto` stall did not reproduce; the HMR cache change is not claimed as its cause because the packed consumer does not use the HMR plugin. A later full `bun run verify` passed as recorded below. WP4 is verified at this scoped probe boundary, but Plan 061 remains IN PROGRESS.

#### WP5a execution record — archive and release dry-run (2026-09-29)

`bun run release:dry-run` exited 0 after building and packing `flow-core-0.0.0.tgz`, `flow-vanilla-0.0.0.tgz`, `flow-vue-0.0.0.tgz`, and `flow-foldkit-0.0.0.tgz`. The manifest-derived archive validator accepted package roots and public metadata/distribution files, and rejects source, app, research, tests, demos, examples, fixtures, dependencies, and repository metadata paths. The dry-run checked declared peer constraints and dependency license notices; the nested packed consumers resolved exact installed peer versions, including Vue 3.5.43. All four packages remain private version `0.0.0`; Flow's release license remains deferred. No publish or tag command ran.

### Latest common verification and packed UI boundary (2026-09-30)

The recorded `bun run verify` checkpoint exited 0 (session 13179) for the then-current source snapshot: quality 625 files, architecture 166 production sources, docs 19, React catalog 208 entries / 200 capabilities, API inventory 114 pages / 2,692 members, traces 2,203 citations / 67 traces, Vitest 41 files / 302 tests, all three installed archive consumers passed, Vanilla 299 passed / 2 expected native-device skips, Vue 112 passed, and Foldkit 117 passed. Calibration appended Vanilla `dc7b521c-c729-405b-aecc-8ac3d77b7b70`, Vue `79ac2054-6f3b-4ad2-9b8b-7e99608db096`, and Foldkit `7371ecda-8abd-4a22-a9f0-f9f46059a525`; the registry held 118 runs at that checkpoint and timing budgets were empty/pending. This supersedes earlier full-verification failure history for that snapshot, but the parent is running a final verifier after the current packed UI type/API repair.

The runtime UI archive smoke is being added separately from type declarations. In `/tmp/flow-packed-ui-runtime-2.log`, Vanilla and Vue packed consumer browser runs passed; Foldkit reached Chromium but its real pointer action was intercepted by the Runtime viewport overlay, so the host's packed UI smoke failed without a forced click. The focused Foldkit rerun in `/tmp/flow-packed-ui-runtime-foldkit-3.log` exited 0 after the fixture corrected its owned-panel stacking, and the packed archive passed install, peers, typecheck, styles, browser behavior, and disposal. Independent review of that latest stacking fix is pending. This focused Foldkit result does not turn the three-host packed UI smoke green; a final all-host consumer run, release dry-run, and full verify after the current repair are pending. WP4 HMR remains independently verified as documented above. Plan 061 remains IN PROGRESS.

The latest nested `bun run test:consumer` passed for all three packed browser consumers, including public imports, peer resolution, stylesheet behavior, editing/owner acknowledgement, measurement/viewport behavior, and disposal. Each packed consumer's typecheck now references its new Base Handle export; the Vanilla tutorial snippet is also checked against its fixture and included in the Vanilla typecheck. Focused archive tests passed 3/3. Scoped gates passed after the WP5a changes: `bun run check` (517 files), `bun run typecheck`, `bun run check:architecture` (132 production files), `bun run docs:check` (19 Markdown files), `bun run research:check-traces` (2,178 citations / 59 traces), the example/API/plan checkers, and `git diff --check`. The latest release dry-run passed after the Base Handle exports landed, validated all four archives, and confirmed they remain private version `0.0.0`; no publication ran. Independent review found no implementation blocker. The common gate has not passed as a whole: the latest `bun run verify` failed in Vue conformance with the Promise-GC error recorded in Plan 060; the focused shared-state case passed 1/1 in isolation. WP4's cold-start failure and full-plan verification remain open; Plan 061 stays IN PROGRESS.

### 5. Update archive checks and reusable delivery docs

Include all supported package archives in release:dry-run, inspect files for source research/demo leakage, and verify public imports in tutorial snippets. Leave packages private with current versions; release metadata belongs to 062. Document supported peers, browser requirements, SSR/import boundaries, style loading, resource ownership, and known capability gaps.

**Verify:** `bun run release:dry-run`, `bun run test:consumer`, and all common completion gates pass. Actual publication remains absent.

## Plan-specific done criteria

- [x] Foldkit is reusable from a package, with a separately named app and no duplicate adapter implementation.
- [x] Core/vanilla/Vue/Foldkit tarballs support typechecked real consumers and declared style exports.
- [x] Consumer tests exercise public editing, renderer, measurement, viewport, and lifecycle behavior.
- [x] Cold-start/HMR evidence is separate from production-package evidence; no publication is claimed.

## Plan-specific STOP conditions

- A move requires changing validated graph semantics: stop the extraction and create a separate behavior plan.
- The chosen package name collides with the existing app: rename the private app in the same change before installing.
- Clean consumers only work with workspace aliases/source access, duplicate Effect runtimes, or skipped peer checks: fix packaging before claiming delivery.

## Maintenance and follow-up

Future adapter capabilities must be exercised through a packed native consumer as well as workspace E2Es. Public examples must never import app internals. Keep package version compatibility separate from saved-document format version.

## Common completion gate

- [x] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [x] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [x] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [x] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [x] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [x] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.

## Execution record — WP1 Foldkit ownership and migration inventory (2026-09-29)

WP1's source-backed inventory and migration examples are recorded in [`research/traces/adapter-package-delivery.md`](../research/traces/adapter-package-delivery.md). The selected names are `@flow/foldkit` for the new package and `@flow/foldkit-demo` for the app workspace, which currently occupies the package name. The trace classifies the Foldkit graph Model/Message/OutMessage/update/view, renderer registry, typed application/viewport/measurement ports, reusable observer/UI resources, delete client, and adapter stylesheet as package-owned. It keeps demo graph data, renderer callback values, controls, page structure, app-specific styles and canvas dimensions/skin, pane metrics, saved-state behavior, and page lifecycle composition in the app.

The target package peers exact Foldkit 0.163.0, depends on `@flow/core` and exact Effect 4.0.0-rc.116, and keeps those package imports external; the packed consumer must prove a single compatible Effect runtime. This follows Vue's current dependency/peer pattern. No files were moved and no product code or imported evidence was edited. The E2E harness's current source-relative imports and CSS import are identified for the later migration.

WP1 evidence uses production source paths and current E2E harness paths separately. Package manifests, export declarations, app rename, source moves, architecture rules, archive content, consumer installs, and HMR are still unimplemented and unverified. WP1 is complete; WP2–WP5 remain open.

## Execution record — WP2 package extraction and app migration (2026-09-29)

WP2 moved the inventoried reusable Foldkit application/runtime, graph model and view, UI mounts, owner-scoped observers, keyboard observer, delete client, and option contracts into `packages/foldkit/src/`. `packages/foldkit/src/public.ts` now exposes the supported package root; `packages/foldkit/package.json` declares `@flow/foldkit`, Effect `4.0.0-rc.116`, and exact `foldkit@0.163.0` plus `@effect/platform-browser@4.0.0-rc.116` peers, with externalized runtime packages and `./style.css`. The `@flow/foldkit-demo` app declares both Foldkit runtime peers directly; bun.lock records the dependency graph. The existing app workspace is now `@flow/foldkit-demo` and depends on `@flow/foldkit`; `apps/foldkit/src/main.ts` retains demo graph data, renderer callbacks, pane metrics, saved-state UI, telemetry and page lifecycle composition. Generic adapter CSS is in `packages/foldkit/src/style.css`; canvas sizing, demo controls, playground layout and skin remain in `apps/foldkit/src/playground.css`. App and E2E integration now import adapter APIs through `@flow/foldkit`; the test harness loads app CSS separately where demo-sized canvas behavior is needed. No graph semantics changed by the move.

Focused evidence: `bun run typecheck` passed after migration, `bun run check:architecture` passed for the app/package boundary, and the initially failing browser subset (87/103 passed before adding app-owned harness CSS) was corrected by importing the demo stylesheet into the app E2E harness. The 16 affected tests passed serially with `bun run test:conformance:foldkit -- --workers=1 --grep <focused-title-regex>`. Thus all 103 tests were covered across the full run and targeted rerun, not by one all-green suite invocation. The final WP2 local gates passed: `bun run check`, typecheck, architecture, docs, trace, API-member, benchmark-calibration, and diff-check. Focused geometry E2Es passed 2/2; the 16 CSS-related failures from the initial full run passed in the focused rerun. Workspace peer declarations and lock consistency are verified, but packed-consumer peer resolution, archive, cold-start, HMR, and publication claims remain unverified; WP3–WP5 remain open.

#### Post-integration verification update (2026-09-29)

After package/API integration, the non-calibration Foldkit serial suite passed 102/102. The latest `bun run verify` passed static, build, and typecheck stages, then failed during the parallel Vanilla browser stage (280 passed, 2 skipped, 8 failed); the same eight cases passed 8/8 in a serial title-grep rerun. Vue and Foldkit full-suite verify stages did not run. This is not a green full verify; see Plan 060's latest verification outcome. Local WP2 lint, typecheck/build, architecture, docs, trace, API-member, benchmark, and diff gates passed. The checker validates 77 benchmark runs (30 Vanilla, 26 Vue, 21 Foldkit); budgets remain pending-calibration. Packed-consumer/archive proof, HMR, and WP3–WP5 remain open, so Plan 061 stays IN PROGRESS.

## Execution record — WP3 packed consumers (2026-09-29)

`bun run test:consumer` passed for actual pack output `flow-core-0.0.0.tgz`, `flow-vanilla-0.0.0.tgz`, `flow-vue-0.0.0.tgz`, and `flow-foldkit-0.0.0.tgz`. The runner derives those names from `bun pm pack`, installs archives in three distinct temporary consumer roots, copies only each consumer fixture into its root, rejects workspace aliases, and limits the Vite server's filesystem access to that root (`scripts/check-packed-consumer.ts:82-97,102-130,233-279`). Every clean consumer imported `@flow/core` in Bun without a DOM, resolved the required package peers from the same root/version as the adapter, typechecked public imports, and passed Chromium browser behavior, stylesheet, and disposal checks. Vanilla covered initial snapshot, editing, utility exports, and teardown; Vue covered two independent canvases and controlled proposal/owner acknowledgement; Foldkit covered two separately rendered Runtime instances, the public measurement observer with measured bounds, package stylesheet, `fitView`, public edit acceptance, state isolation after Runtime A's edit, and disposal. The Foldkit consumer uses rendered instance roots because Foldkit replaces the caller's host element during mount (`tests/consumer/foldkit/main.ts:39-68,99-139`; browser assertions in `scripts/check-packed-consumer.ts:174-230`). The adapter peer roots/versions were Effect 4.0.0-rc.116 for Vanilla; Effect 4.0.0-rc.116 and Vue 3.5.43 for Vue; Effect 4.0.0-rc.116, Foldkit 0.163.0, and `@effect/platform-browser` 4.0.0-rc.116 for Foldkit. Local archive dependencies and an archive-only `@flow/core` override are used because these packages are private and unpublished; no workspace aliases or source fallbacks are used. Verification passed: `bun run check` (495 files), `bun run test:consumer`, `bun run typecheck`, `bun run check:architecture` (127 production files), `bun run docs:check` (19 Markdown files), `bun run research:check-traces` (2,176 citations / 58 traces), API-member checker (114 pages / 2,692 members), and `git diff --check`. WP3 is verified for this source snapshot. The latest full `bun run verify` result remains the earlier Vanilla-stage failure recorded above; no full verify was rerun for WP3. WP4 cold-start/HMR and WP5 release checks remain open, so Plan 061 stays IN PROGRESS.

## Final verification and scoped closure (2026-09-30)

`bun run verify` exited 0 in session 68756, recorded in `/tmp/flow-verify-wrap-final-3.log`, after the package UI runtime and Placeholder focus repairs. Results: quality 625 files, architecture 166 production sources, docs 19 Markdown files, React catalog 208 entries / 200 capabilities, API inventory 114 pages / 2,692 members, traces 2,203 citations / 67 traces, Vitest 41 files / 302 tests, all three installed archive consumers passed, Vanilla 299 passed / 2 existing native-device skips, Vue 112 passed, and Foldkit 117 passed. This is the final source snapshot's full gate. The earlier session 67160 Placeholder failure and session 78886 generated-calibration formatting failure remain historical evidence and are superseded by this result. No source changed between the calibration-format repair and the successful verifier.

The fresh `bun run release:dry-run` exited 0 in `/tmp/flow-release-wrap-final-2.log`, packing core, Vanilla, Vue, and Foldkit and running all three installed native UI consumers. The earlier Foldkit panel-stacking repair and the packed consumer acceptance boundary received independent review; the final combined run supersedes the earlier partial UI smoke. Native fixture `main.ts` files import the archive APIs, exercise real UI actions, observe output, and clean up. Vanilla additionally verifies two instances, controlled proposal/owner acknowledgement, custom-renderer DOM updates, public measurement, nontrivial fit state, and the actual rendered viewport transform. The CSS transform oracle uses browser-canonical serialization because raw numeric text such as `17.2644628` serializes as `17.2645`; accepted state and exact renderer output remain asserted. This bounded package proof does not establish complete UI recipe option matrices or upstream runtime parity.

The separate packed Foldkit HMR probe passed in `/tmp/flow-foldkit-hmr-cache-and-mount-fix.log` and received independent review. It covers cold start, one reload, preservation handshake, restored semantic state, Runtime replacement, and the absent-plugin warning/initial-state case. The release dry-run validated four private `0.0.0` archives and dependency notices; Flow release licensing remains deferred. No publish or tag ran.

All four plan-specific criteria and the common gate are met for the currently supported public exports. Plan 061 is DONE. Plans 057–060 remain IN PROGRESS and Plan 062 remains TODO; package closure does not close their catalog-wide or release criteria. Current-site catalog metadata verification exited 0 in `/tmp/flow-catalog-wrap-upstream.log` for 208 entries / 200 capabilities and is separate from runtime parity. Collector delivery remains proved only for the local Vanilla composition; all-host/hosted delivery, native devices, broader accessibility, and isolated timing calibration remain open.

The verifier began with 119 calibration records and appended Vanilla `eec8b940-2ba1-4083-83e8-2d08374a472b`, Vue `5254c477-f726-4216-8e4c-e20e3e43f822`, and Foldkit `2227e78b-aa02-4378-9013-80b1b0897d42`. The registry now holds 122 runs from the dirty `working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898` snapshot. Timing budgets remain empty/pending-calibration; these observations do not establish hosted or native-device calibration.

Final tracking-only checks exited 0: `bun run check` checked 625 files, `bun run docs:check` checked 19 Markdown files, `bun run research:check-traces` checked 2,205 citations across 67 traces after these evidence additions, `bun run plans/check-next-chunks.mjs` checked 10 plans / 200 capabilities / 8 navigation entries, and `git diff --check` passed. `bunx oxfmt research/benchmarks/calibration.json` retained all JSON values and all 122 runs: 47 Vanilla, 41 Vue, 34 Foldkit. This wrap changed only the assigned plan/progress/trace records and calibration formatting; source and tests remained fixed, and no browser, build, or full-verifier rerun was needed.
