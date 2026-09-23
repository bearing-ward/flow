# Spatial and gesture baseline

This note records the current semantic and timing baseline before adding an index or changing gesture state. Call paths and behavior boundaries are in [spatial-lookups](traces/spatial-lookups.md) and [gesture-resize-lifecycle](traces/gesture-resize-lifecycle.md).

## Characterization coverage

Core cases in `packages/core/src/domain/flow-graph.test.ts` verify parent-local child positions with a child override, measured over declared over fallback dimensions in bounds and intersection, hidden descendants omitted from spatial results, and directed incomer/outgoer results continuing to follow document edges. The browser case in `apps/vanilla/e2e/next-slices.e2e.ts` mounts through public `mountFlow` with 1,000 nodes, of which the first 3 are `near`, `cross-source`, and `cross-target`; it adds `far-0` through `far-999` at `(3000 + index * 200, 180)`, with the crossing source at `(-300, 420)` and target at `(1400, 420)`. At viewport `{x:0,y:0,zoom:1}` it asserts near and both crossing endpoints plus their edge are mounted and `far-0` is absent. It moves to `{x:-3000,y:0,zoom:1}`, asserts `far-0` is present and near/crossing absent, then returns and asserts the initial semantic set. Playwright waiting assertions are used; there is no timing gate.

## Geometry timings

Command: `bun run scripts/bench-flow-geometry.ts`, run three times consecutively in the same session. Runtime: Bun 1.3.14 on Darwin 27.0.0, arm64, Apple M4 Max. Each fixture is decoded once before timed loops. It has 250, 1,000 or 4,000 nodes with stable grid positions, all nodes declared at a fixed small size pattern, every second node after `n0` parented to `n0`, every fourth node given a fixed measurement, and one directed edge per node pair. Each operation is warmed five times and has 31 timed samples. Query samples reuse a prebuilt graph. Values below are the min / median / max of the three run medians in milliseconds; p95 is the highest p95 across those runs.

| Operation | 250 median min / median / max (p95 max) | 1,000 median min / median / max (p95 max) | 4,000 median min / median / max (p95 max) | 4,000 / 250 median growth per run |
| --- | ---: | ---: | ---: | ---: |
| `createFlowGraph` | 0.0424 / 0.0448 / 0.0453 (0.0644) | 0.1500 / 0.1550 / 0.1660 (0.7642) | 0.5341 / 0.5496 / 0.5581 (0.8064) | 11.80x / 12.96x / 12.45x |
| `graphBounds` | 0.0100 / 0.0105 / 0.0109 (0.0140) | 0.0075 / 0.0077 / 0.0091 (0.0150) | 0.0348 / 0.0354 / 0.0369 (0.0714) | 3.20x / 3.71x / 3.37x |
| `graphNodesIntersecting` | 0.0067 / 0.0071 / 0.0082 (0.0135) | 0.0078 / 0.0078 / 0.0166 (0.0190) | 0.0253 / 0.0303 / 0.0318 (0.0421) | 3.79x / 4.27x / 3.89x |
| `selectionInRect` | 0.0183 / 0.0187 / 0.0193 (0.0255) | 0.0450 / 0.0470 / 0.0494 (0.0690) | 0.1440 / 0.1455 / 0.1551 (0.1997) | 7.56x / 8.31x / 7.87x |

All 12 operation-size pairs produced 31 finite samples in each of three runs. Timings are sub-millisecond and show outliers, particularly for 1,000/4,000-node graph construction, so this machine-specific sample does not support a stable wall-clock CI threshold. Proposed next-slice measurement budget: keep the same 4,000-node fixture and benchmark command as an informational benchmark in local review, track 31-sample median and p95 for each operation, and do not fail CI on elapsed time until repeated runs on supported CI hardware establish a defensible limit. `research/PROGRESS.md` performance-budget item remains open.

## Recommendation for the next slice

The observed query scaling is roughly linear in node count and remains small on this single machine; current measurements alone do not justify introducing a spatial index. First deliver an invalidation model and a focused prototype comparison before selecting one. A candidate index belongs in the pure core graph view as derived state, rebuilt or updated from the authoritative document and current measurements; it must never become saved document state or host-owned DOM state.

Any incremental design must state how it handles document node add/remove/position/size/hidden changes, positive measurement updates, drag preview overrides, parent-local changes that shift descendant absolute coordinates, hidden ancestors, and viewport-only changes (which should alter the query rectangle rather than invalidate geometry). A full immutable rebuild avoids stale index state but retains construction cost; incremental maintenance needs explicit evidence that it improves the measured path without changing traversal order or touching-edge semantics.

Before adding resize or node-drag auto-pan, model idle, pressed-before-threshold, active drag, active multi-node drag, selection drag, cancelled, and completed states, along with Escape, blur, pointer cancellation, lost capture, node removal, unmount, and multi-touch abort transitions. Keyboard movement is an immediate command path rather than an active pointer gesture. Keep resize and drag auto-pan separate until their ownership and cancellation behavior are specified. Evidence and limits are documented in the gesture trace and existing browser cases.

The next plan's single first deliverable should be a core-only spatial-query prototype with a reproducible correctness comparison against the existing scan on the same fixed graph fixture; its first gate should be focused Vitest tests covering nested positions, measurement changes, hidden ancestry, override updates, stable order, and boundary-touch semantics. Do not add a gesture machine or resize controls in that first deliverable.
