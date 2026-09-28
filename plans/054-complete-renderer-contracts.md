# Plan 054: Complete node, edge, and handle renderer contracts

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/core/src/domain/ packages/core/src/public.ts packages/conformance/src/` and inspect `git status --short`. Expected prerequisite changes are not an automatic stop: compare them against the contract below and record their landed SHAs. If ownership, public contracts, or scope differ, revise this plan before implementation. Check every remaining in-scope path listed below as well.

## Status

- Priority: P1
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation
- Depends on: 053
- Planned at: `f8b73f2`, 2026-09-27
- Status: DONE — implemented in `/Users/richardmcandrews/.codex/worktrees/flow-roadmap-053-062/flow` and approved after two focused review rounds. All three hosts consume the shared renderer fixture and assert normalized semantics and measured endpoints; Vue label anchoring/visibility, Foldkit keyboard activation/marker paint, and the straight default for omitted paths are covered. Independent `bun run verify` passed: 156 unit tests, Vanilla 208 passed with 2 existing skips, Vue 32/32, Foldkit 28/28; docs, 2,142 trace citations across 51 traces, upstream catalog (208 entries/200 capabilities), and `git diff --check` passed. No commit created.

## Why this matters

Variable-sized custom nodes, dynamic handles, and real edge rendering are prerequisites for the catalog examples and UI recipes. Bring Vue and Foldkit to a common rendering contract while preserving each framework's own rendering lifecycle.

## Current state and exemplars

`apps/vanilla/src/mount-flow.ts:357-365` provides explicit renderer lifetime:

```ts
export interface FlowNodeRendererInstance {
  readonly update: (node: FlowNode) => void
  readonly destroy: () => void
}
```

`packages/vue/src/flow-canvas.ts:214-220` accepts one `nodeComponent` and one `edgeComponent`, not per-type registries. Foldkit `apps/foldkit/src/graph.ts:544-552` currently renders `h.keyed('div')` with `[edge.label ?? '']`. Retaining that output cannot prove actual edge-path parity. Existing core path calculations, vanilla edge renderer, and Vue measured-edge implementation are the starting points. Follow Vue's keyed component identity tests and vanilla `graph-renderers.e2e.ts`; preserve native controls' keyboard ownership.

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

- packages/core/src/domain/, packages/core/src/public.ts, packages/conformance/src/
- `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/edge-renderer.ts`, `apps/vanilla/src/public.ts`, `packages/vue/src/`, `apps/foldkit/src/graph.ts`, `apps/foldkit/src/application.ts`; add adapter-local renderer modules when they own a clear lifecycle.
- All three host styles, demo entry points, and E2E drivers for renderer scenes only.
- New `research/traces/shared-renderer-contract.md`, `research/fixtures/renderer-contract.json`, each host's `renderer-contract.e2e.ts`, and relevant custom-renderer guide updates.
- New `scripts/capture-renderer-contract-reference.ts`, `research/harnesses/renderer-contract/`, and `research/fixtures/renderer-contract-reference.json` for this plan's bounded upstream capture.
- `scripts/check-research-traces.ts` only if its local-source path predicate must recognize `packages/vue/` so the required production trace can cite the Vue adapter accurately; keep the fix limited to citation classification.
- Out of scope: interaction state-machine expansion, minimap/toolbars, new UI catalog recipes, execution engines, packaging.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New files named below are proposals, not existing APIs.

## Ordered work packages

### 1. Specify renderer correspondence and lifetime

Map NodeProps/EdgeProps, NodeTypes/EdgeTypes, Handle, BaseEdge, EdgeText, EdgeLabelRenderer, built-in edge paths, marker IDs, selection/visibility/stacking, and connection-preview renderer inputs to concrete host contracts. Node/edge data remains serializable; functions and component registries are host configuration. Decide unknown-type fallback, registry replacement, node ID context, interactive descendants, and label portal ownership. Extend edge type metadata only if required after inspecting `flow.schema.ts`; use additive version-1 persistence tests.

**Verify:** `bun run research:check-traces` passes for the new trace, and its matrix lists JS/Vue/Foldkit entry points and one test for each selected contract family.

### 2. Implement typed registries and measured node/handle rendering

Keep vanilla's update/destroy contract, add a compatible contextual path where needed, and make Vue choose by node type with explicit fallback to its current single-component API. Give Foldkit a caller-supplied typed view registry outside its serialized Model, with messages mapped through its graph child boundary. Use Plan 053 refresh and readiness for dynamic handle count/offset changes. Preserve keys across data changes and dispose an old renderer exactly once when its type changes.

**Verify:** `bun run typecheck`; run each host's new `renderer-contract.e2e.ts` serially. Assert identity on data update, replacement on type change, duplicate/unknown type policy, dynamic handles, two-canvas isolation, and native input/button behavior.

### 3. Render edges from shared geometry in every host

Replace Foldkit textual edges with SVG paths driven by measured endpoints and core path functions. Expose native custom edge registration and equivalent base path, marker, label, and hit-target primitives. Support the already-declared straight, Bezier, simple-Bezier, step, and smooth-step paths; route custom paths through caller rendering. Scope SVG definitions per host to prevent duplicate marker IDs. Render HTML edge labels in an owned overlay that tracks graph coordinates and preserves pointer/keyboard ownership.

**Verify:** the new renderer suites assert actual SVG `d`, endpoint coordinates, labels, markers, hidden incident edges, stacking, and clickable hit targets. Run `bun run test -- packages/core/src/domain/flow-edge.schema.test.ts packages/core/src/domain/flow-step-edge.schema.test.ts` with all tests passing.

### 4. Demonstrate and compare rendering contracts

Add a custom-node/multiple-handle scene and built-in/custom-edge scene in each playground. Exercise label editing, resize-induced endpoint updates, edge data, invalid type fallback, remove/re-add, and teardown. Fixed shared fixtures compare rendered geometry and semantic identity, allowing only documented framework timing differences. Use pinned captures for selected path/label/handle outputs; whole-page parity remains open where props are missing.

**Verify:** each host's `renderer-contract.e2e.ts` and existing `shared-conformance.e2e.ts` pass. Inspect normal/narrow screenshots; controls and handles remain reachable. `bun run test -- packages/conformance/src/index.test.ts` passes.

### 5. Publish the correspondence and run the full gate

Update custom-node/edge guides, exported types, and affected catalog rows. Document framework component/view examples through public exports. Close only proven renderer options and examples.

**Verify:** `bun run test:consumer` and all common completion commands exit 0.

### Reference capture command

Create `scripts/capture-renderer-contract-reference.ts` by following the existing graph-edit capture script's pinned-checkout validation, isolated build/server lifetime, normalization, and cleanup. Mount real upstream public components and replay the selected cases through their public entry points. Run `bun run scripts/capture-renderer-contract-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout` twice against commit `0a1f9575b25679f2880175de8d3eae21aedde921`; both runs must exit 0 and produce matching normalized observations. The checkout path is supplied by the executor, never the immutable imported artifact directory. Keep volatile timings out of equality assertions, but retain raw evidence with environment metadata. Flow fixtures must observe its production APIs separately and compare the same inputs. A missing reference result blocks a conforming claim, not the ability to test Flow behavior.

## Plan-specific done criteria

- [ ] Every host renders actual measured edge paths and exposes per-type node and edge customization.
- [ ] Renderer lifetime, handle refresh, label ownership, marker isolation, and interactive descendants have production browser tests.
- [ ] Fixed rendering fixtures and bounded upstream comparisons name their exact option coverage.

## Plan-specific STOP conditions

- Foldkit registry design requires serializing callbacks or routing all rendering through vanilla: stop and redesign the adapter boundary.
- New renderer types would silently change existing saved documents or delete the existing Vue single-component option: report a migration decision first.
- A label portal steals native focus or canvas gestures from its contents: fix ownership before expanding the scene.

## Maintenance and follow-up

Plan 056 adds gesture semantics on top of these renderer boundaries. Plan 058 builds reusable UI from these public primitives. Do not let demo rendering become a private alternative contract.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
