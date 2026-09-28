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
- Status: TODO

## Why this matters

Reusable delivery requires real package consumers. Promote the Foldkit prototype into a native adapter package and extend clean-consumer proof to Vue and Foldkit, including types, styles, peer dependencies, lifecycle, and HMR behavior.

## Current state and exemplars

`packages/vue/package.json` exports `dist/public.js`, declarations, and `./style.css`, with Vue as a peer. Foldkit's current `apps/foldkit/package.json` is also named `@flow/foldkit` but has only app dev/build scripts. A new package cannot keep that duplicate workspace name. `scripts/check-packed-consumer.ts:65-74` currently packs only core and vanilla:

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

### 5. Update archive checks and reusable delivery docs

Include all supported package archives in release:dry-run, inspect files for source research/demo leakage, and verify public imports in tutorial snippets. Leave packages private with current versions; release metadata belongs to 062. Document supported peers, browser requirements, SSR/import boundaries, style loading, resource ownership, and known capability gaps.

**Verify:** `bun run release:dry-run`, `bun run test:consumer`, and all common completion gates pass. Actual publication remains absent.

## Plan-specific done criteria

- [ ] Foldkit is reusable from a package, with a separately named app and no duplicate adapter implementation.
- [ ] Core/vanilla/Vue/Foldkit tarballs support typechecked real consumers and declared style exports.
- [ ] Consumer tests exercise public editing, renderer, measurement, viewport, and lifecycle behavior.
- [ ] Cold-start/HMR evidence is separate from production-package evidence; no publication is claimed.

## Plan-specific STOP conditions

- A move requires changing validated graph semantics: stop the extraction and create a separate behavior plan.
- The chosen package name collides with the existing app: rename the private app in the same change before installing.
- Clean consumers only work with workspace aliases/source access, duplicate Effect runtimes, or skipped peer checks: fix packaging before claiming delivery.

## Maintenance and follow-up

Future adapter capabilities must be exercised through a packed native consumer as well as workspace E2Es. Public examples must never import app internals. Keep package version compatibility separate from saved-document format version.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
