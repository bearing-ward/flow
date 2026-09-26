# Plan 011: Establish spatial and gesture baselines before changing core state

> **Executor instructions:** Work in an isolated checkout. Follow each step and its verification gate. Record observed behavior and measured results, including failures; do not change production code to make this characterization pass. If a STOP condition occurs, report it instead of broadening scope. A reviewer may maintain `plans/README.md`; otherwise update this plan's status row only after all done criteria pass.
>
> **Drift check (run first):** `git diff --stat 5274aef..HEAD -- packages/core/src/domain/flow-graph.ts packages/core/src/domain/flow-visibility.schema.ts packages/core/src/domain/flow-graph.test.ts apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/next-slices.e2e.ts research/PROGRESS.md research/generated/SUMMARY.md research/traces research/spatial-gesture-baseline.md scripts/bench-flow-geometry.ts plans/README.md` Compare any changed implementation or test path with the excerpts below. Stop if the entry points, geometry ownership, or test fixture have changed in a way that invalidates this plan. Also inspect `git status --short` and preserve unrelated dirty work; `HANDOFF.md` was already modified in the advisor checkout.

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** LOW
- **Depends on:** plans 001-010 (all DONE)
- **Category:** direction, tests, perf
- **Planned at:** commit `5274aef`, 2026-09-23

## Why this matters

The graph contract exists, but `createFlowGraph` rebuilds derived geometry and several queries scan all nodes or edges. The vanilla host calls these paths during reconciliation, selection, and viewport changes. The checklist still leaves measured geometry and spatial-index state, gesture states, resizing, drag auto-pan, and a performance budget open. This slice establishes precise behavior and repeatable measurements so the next implementation plan can choose an index and gesture design based on evidence rather than copying reference internals.

## Current state and constraints

- `research/PROGRESS.md:3-5` says checked items work today and unchecked items remain planned. Its open spatial and interaction items are at lines 46, 48, 53, 71-72, 105, 110, 116, and 133. The proof work remains open at lines 216-224. Read the entire checklist before changing it.
- `packages/core/src/domain/flow-graph.ts:24-30` constructs a pure view from a validated document, measurements, and position overrides. Lines 51-67 use a positive live measurement, then a declared size, then the 150 by 44 fallback; they resolve parent-local positions into absolute positions and inherit hidden state. Lines 75-90 establish stable graph order. Lines 125-151 show bounds, intersections, incomers, and outgoers currently scanning ordered nodes or document edges. Relevant current shape:

  ```ts
  export const graphNodesIntersecting = (
    graph: FlowGraphView,
    rect: FlowRect
  ) =>
    graph.orderedNodes.filter(
      (node) => !node.hidden && intersects(graphNodeBounds(node), rect)
    )
  export const graphIncomers = (graph: FlowGraphView, id: NodeId) =>
    graph.document.edges.filter((edge) => edge.target === id)
  ```

- `packages/core/src/domain/flow-visibility.schema.ts:25-35` converts viewport pixels into flow coordinates; lines 46-93 test node and edge visibility; `selectionInRect` at lines 95-140 scans ordered nodes and edges and excludes hidden or nonselectable elements. Its partial-overlap rule uses strict overlap, while graph intersection at `flow-graph.ts:141-145` includes a touching edge. Do not collapse these two contracts in the characterization.
- `apps/vanilla/src/mount-flow.ts:488-491` creates the graph view from current host measurements and preview positions. Lines 1296-1340 use that view for viewport culling and retain endpoints of visible edges. Lines 2226-2240 build a graph for rectangle selection. Lines 2539-2643 centralize gesture cancellation, including blur, pointer-capture loss, and pointer cancellation.
- `apps/vanilla/e2e/next-slices.e2e.ts:168-257` mounts 200 offscreen nodes and a crossing edge, then asserts culling as the viewport changes. It proves visibility behavior but has no latency budget. Use its `resetDemo`, public `mountFlow`, `page.evaluate`, and DOM locator pattern for the browser case. `packages/core/src/domain/flow-graph.test.ts:75-112` demonstrates `decodeFlowDocument` plus pure geometry assertions; extend that pattern.
- The pinned reference is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. In `packages/system/src/utils/graph.ts:264-303`, `getNodesInside` converts a screen rectangle to flow coordinates, scans `nodeLookup`, uses measured or declared dimensions, and temporarily includes unmeasured or dragging nodes. In `packages/system/src/xyresizer/XYResizer.ts:141-205`, resize start records measured size and position and examines parent and child extents. In `packages/system/src/xydrag/XYDrag.ts:324-380`, drag handles the threshold, auto-pan, node removal, and multi-touch abort. These are leads for tracing, not proof of parity.
- `docs/architecture.md:83-91` fixes ownership: `FlowNode.position` is parent-local for children; live measurement belongs to host runtime and is never saved; pure geometry stays in core; DOM, gestures, and renderer lifetime stay in the host. Preserve Effect v4 RC.117 and schema-derived public types. Follow `docs/standards.md` and the trace order in `research/traces/README.md`. Each trace ends with `## Conformity and deviations`, with named test limits.

## Checklist coverage and later sequence

This plan can close `research/PROGRESS.md:46` **only** when the spatial trace is complete and trace-checked. Leave `:48`, `:52-53`, `:71-72`, `:105`, `:110`, `:116`, `:133`, and `:216-224` unchecked: this slice does not cover their full contracts. In particular, a proposed core-query budget does not cover every performance-sensitive path at `:53`; a large-graph characterization test does not complete `:224`; and existing Escape/blur cases do not complete the composite cancellation item at `:133`.

After this slice, use the evidence to plan the measured-geometry/index and gesture/resize implementation. The remaining checklist groups then cover shared fixtures and conformance, a JavaScript facade and clean package consumer, reusable canvas UI, Foldkit and Vue adapters, and delivery work such as CI, lint baseline, docs, licensing, and releases. This ordering follows the current `HANDOFF.md:283-296` sequence and keeps adapters behind stable core and browser contracts. Do not treat the nine scopes in an earlier roadmap as nine already implemented features.

## Commands you will need

| Purpose | Command | Expected result |
| --- | --- | --- |
| Trace citations | `bun run research:check-traces` | exit 0; every new citation resolves |
| Focused core tests | `bunx vitest run packages/core/src/domain/flow-graph.test.ts` | exit 0; all tests pass |
| Focused browser tests | `bunx playwright test apps/vanilla/e2e/next-slices.e2e.ts` | exit 0; all tests pass |
| Geometry benchmark | `bun run scripts/bench-flow-geometry.ts` | exit 0; prints all fixture sizes and operations |
| Full gate | `bun run verify` | exit 0; research, typecheck, unit, build, and browser pass |
| Diff hygiene | `git diff --check` and `git status --short` | no whitespace errors; only scoped changes plus preserved pre-existing work |

`bun run verify` invokes `research:inventory`, which regenerates `research/generated/SUMMARY.md` from `research/PROGRESS.md`. Never hand-edit that generated file. The initial Ultracite findings are open at `research/PROGRESS.md:22`; `bun run check` is not part of the current gate.

## Scope and Git workflow

**In scope (the only paths to create or edit):**

- `research/traces/spatial-lookups.md` (new)
- `research/traces/gesture-resize-lifecycle.md` (new)
- `research/spatial-gesture-baseline.md` (new)
- `research/PROGRESS.md`
- `research/generated/SUMMARY.md` (generated by `research:inventory` only)
- `scripts/bench-flow-geometry.ts` (new)
- `packages/core/src/domain/flow-graph.test.ts`
- `apps/vanilla/e2e/next-slices.e2e.ts`
- `plans/README.md` (status row only, after completion)

**Out of scope:** production implementation in `packages/` or `apps/`, schema changes, a new index, a new gesture machine, resize controls, adapter scaffolds, new dependencies, imported files under `research/artifacts/`, `HANDOFF.md`, and any separate generated artifact. If characterization reveals a defect or missing contract, record it as a follow-up with a reproduction; do not fix it here.

Use an isolated worktree and a `codex/011-spatial-gesture-baseline` branch if a branch is needed. Preserve unrelated work. Do not commit, push, merge, or open a PR without operator instruction.

## Steps

### 1. Trace the real production paths

Write `research/traces/spatial-lookups.md` from the pinned reference's public entry points for `getNodesInside` and `getNodesBounds`, through adapter calls, lookup state, geometry, visible DOM, and named upstream tests. Trace Flow separately from `mountFlow` or another public host entry through `createFlowGraph`, culling/selection, and rendered output. Include fit-view's `graphBounds` call path and distinguish its return for an empty graph from the reference's zero rectangle. Cite exact `path:line` for each link. Do not infer runtime behavior from the generated `CALLS.tsv` index.

Write `research/traces/gesture-resize-lifecycle.md` for drag, keyboard move, auto-pan, resize, and cancellation. Start reference paths at their browser or public entry, then trace store/gesture state, geometry, scheduler/DOM effect, and output. Trace Flow's existing drag and cancellation paths separately; mark absent resize and drag/keyboard auto-pan paths **Unverified**. Put tests under the paths they actually exercise. End each file with `## Conformity and deviations` and classifications **Conforms**, **Deviates**, or **Unverified**, with the reason and test boundary.

**Verify:** `bun run research:check-traces` exits 0 and reports both new traces without invalid citations. Check each cited line's meaning manually; the checker cannot prove a call path.

### 2. Characterize semantic geometry at the core and browser boundaries

In `flow-graph.test.ts`, add focused cases for (a) parent-local child coordinates plus a position override, (b) measured > declared > fallback size precedence affecting bounds/intersection, and (c) hidden descendants excluded from spatial results while directed edge queries still follow document edges. Assert actual ids and rectangles; avoid timing assertions or tests that merely reimplement the filter. Keep fixture values small and fixed.

In `next-slices.e2e.ts`, add one 1,000-node culling case derived from the existing 200-node fixture. Use the public `mountFlow` call and a deterministic viewport. Assert that a near node is rendered, far nodes are absent after measurement, visible crossing-edge endpoints remain mounted, a viewport move changes the rendered set, and returning restores it. Use Playwright's waiting assertions, not a fixed sleep or elapsed-time pass/fail threshold. Record the exact fixture construction in the baseline note so another adapter can use the same semantic case later.

**Verify:** the focused Vitest and Playwright commands above exit 0, including the new cases. If a new expected semantic result differs from current behavior, record the observed failure and STOP rather than modifying production code.

### 3. Measure the current cost without adding a flaky CI clock gate

Create `scripts/bench-flow-geometry.ts` using only existing dependencies. Use fixed, decoded documents with 250, 1,000, and 4,000 nodes; one edge for each pair; stable positions, a mix of roots/children, declared sizes, and a fixed subset of measurements. Build each document once outside the timed loops. For each size, warm up and report at least 30 timed samples of each operation: `createFlowGraph`, `graphBounds`, `graphNodesIntersecting`, and `selectionInRect`. Reuse a prebuilt graph for individual query samples; report graph-construction cost separately. Use `performance.now()`, print JSON with fixture size, operation, sample count, median, and p95 milliseconds. Exit nonzero for a missing/nonfinite measurement. Do not make wall-clock timings a CI pass/fail gate in this slice.

Run the script three times on the same machine. In `research/spatial-gesture-baseline.md`, record the command, runtime/OS/CPU, fixture rules, three result sets or a compact min/median/max table, and the largest-to-smallest growth ratio for each operation. Record a proposed measurement budget for the next implementation slice, naming the fixture, statistic, threshold, and where it will run. If no reliable threshold is defensible across three runs, state that and leave PROGRESS `:53` open.

**Verify:** `bun run scripts/bench-flow-geometry.ts` exits 0 and prints four operations at each of the three sizes, each with at least 30 finite samples.

### 4. Record the design decision and reconcile the checklist

Finish `research/spatial-gesture-baseline.md` with a bounded recommendation for the next implementation slice: whether current scaling warrants a spatial index now; which state owns a candidate index; how document updates, measurement, drag previews, nested positions, hidden ancestors, and viewport changes would invalidate it; and which gesture states and cancellation edges need explicit modeling before resize or drag auto-pan. Keep it a recommendation, not an implemented API. Link exact evidence from the two traces, new tests, and benchmark results. Give the next plan a single first deliverable and test gate.

Update `research/PROGRESS.md:46` only if the spatial trace is complete. Leave the other named items open. Run `bun run research:inventory` to regenerate the summary if PROGRESS changed. Preserve checked items and unrelated prose. The generated summary must reflect the checklist, not an independently edited account.

**Verify:** `bun run research:check-traces`, both focused tests, and `bun run verify` all exit 0. `git diff --check` has no errors. Inspect `git diff --name-only` and `git status --short`; all new or changed files are in scope and pre-existing `HANDOFF.md` work is unchanged.

## Test plan

- Follow `packages/core/src/domain/flow-graph.test.ts:75-112` for decoded, schema-valid fixtures and exact graph assertions. Test outputs, not the internal loop structure.
- Follow `apps/vanilla/e2e/next-slices.e2e.ts:168-257` for real-browser visibility after viewport updates. A large fixture is a semantic regression case here; performance numbers belong in the benchmark report.
- Cite existing drag/cancellation tests in the gesture trace, but do not add a test for an unimplemented resize or auto-pan feature in this slice.
- `bun run verify` is the completion gate, not a build or typecheck alone.

## Done criteria

- [ ] Both new traces cite production and test paths separately and end in `## Conformity and deviations`; `bun run research:check-traces` exits 0.
- [ ] New core tests pass for the three named geometry semantics, and the 1,000-node real-browser culling case passes.
- [ ] The benchmark prints 12 size/operation rows with at least 30 finite samples each; the baseline note records three runs and a proposed budget or an explicit reason a budget cannot yet be set.
- [ ] The baseline note recommends one next implementation slice with state ownership and invalidation rules tied to measured evidence.
- [ ] `research/PROGRESS.md` changes only for complete checklist items; generated summary was regenerated, never hand-edited.
- [ ] `bun run verify` and `git diff --check` exit 0.
- [ ] No files beyond the in-scope list changed, except preserved pre-existing user work; the `plans/README.md` row becomes DONE only after verification.

## STOP conditions

Stop and report instead of improvising if the pinned reference files are missing; the current geometry or lifecycle behavior contradicts a new semantic test; the source paths have drifted; three benchmark runs cannot produce finite measurements; the work needs production changes or a new dependency; or a gate still fails after one focused correction to in-scope test/research code. Do not weaken a semantic assertion or invent a performance threshold to claim success.

## Maintenance notes

If later work introduces a spatial index, preserve measured-over-declared geometry, parent-local coordinates, inherited hidden state, stable stacking, visible-edge endpoints, and the distinct rectangle intersection rules. Update the benchmark fixture when those inputs change, and review whether invalidation is tied to the host's measured geometry and drag preview, not persistence. Before claiming adapter conformity or performance success, run the shared scenario on each adapter and turn the proposed budget into a stable gate on a specified runner. This plan does not establish those later claims.
