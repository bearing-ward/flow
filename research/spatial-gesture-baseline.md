# Spatial and gesture baseline

This note records the current semantic and timing baseline before adding an index or changing gesture state. Call paths and behavior boundaries are in [spatial-lookups](traces/spatial-lookups.md) and [gesture-resize-lifecycle](traces/gesture-resize-lifecycle.md).

## Characterization coverage

Core cases in `packages/core/src/domain/flow-graph.test.ts` verify parent-local child positions with a child override, measured over declared over fallback dimensions in bounds and intersection, hidden descendants omitted from spatial results, and directed incomer/outgoer results continuing to follow document edges. The browser case in `apps/vanilla/e2e/next-slices.e2e.ts` mounts exactly 1,000 nodes through public `mountFlow`: 3 named nodes (`near`, `cross-source`, `cross-target`) plus 997 far nodes (`far-0` through `far-996`) at `(3000 + index * 200, 180)`. The crossing source is at `(-300, 420)` and target at `(1400, 420)`. At viewport `{x:0,y:0,zoom:1}` it asserts near and both crossing endpoints plus their edge are mounted and `far-0` is absent. It moves to `{x:-3000,y:0,zoom:1}`, asserts `far-0` is present and near/crossing absent, then returns and asserts the initial semantic set. Playwright waiting assertions are used; there is no timing gate.

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

## Core-only spatial prototype decision

The non-integrated prototype in `packages/core/src/domain/flow-spatial-prototype.ts` indexes each visible node's absolute bounds into 128-flow-unit cells and queries only occupied query cells before exact inclusive intersection checks. It de-duplicates nodes that span cells and sorts matches by the existing graph order. Rebuild it from every fresh `FlowGraphView` after document, measurement, or override changes; viewport translation only changes the query rectangle. Its focused comparison covers node addition/removal, parent movement, child override, measurement change, hidden ancestry, boundary touch, and 100 fixed-seed rectangles. The prototype matched the scan in order in these cases. This is core-only semantic evidence, not a host lifecycle or production integration test.

The benchmark was run three times in the same session with the 250/1,000/4,000-node fixtures and 31 samples per timed operation. It reports baseline scan, prototype build, and prototype query separately; graph decoding remains outside timed loops. Across the three runs, median timings (minimum / median / maximum of run medians, milliseconds) were:

| Fixture | Scan query | Prototype build | Prototype query | Stored cell/id entries |
| ---: | ---: | ---: | ---: | ---: |
| 250 | 0.0068 / 0.0077 / 0.0081 | 0.0328 / 0.0337 / 0.0342 | 0.0352 / 0.0365 / 0.0380 | 402 |
| 1,000 | 0.0083 / 0.0085 / 0.0089 | 0.1222 / 0.1240 / 0.1341 | 0.1072 / 0.1077 / 0.1103 | 1,845 |
| 4,000 | 0.0282 / 0.0283 / 0.0322 | 0.4023 / 0.4048 / 0.4250 | 0.1947 / 0.1953 / 0.1989 | 6,898 |

The candidate does not meet the adoption heuristic: its 4,000-node query is about 6.9x slower than the scan median, rather than at least 2x faster, and rebuilding costs about 0.405 ms before queries. Twenty queries do not amortize this build cost because each candidate query is also slower. The stored-entry count is a memory proxy, not a byte estimate; large nodes occupy many cells. Full immutable rebuild makes invalidation straightforward for document, measurement, override, ancestor movement, and hidden-state changes, but no viewport-only update benefits this broad-query fixture. Keep the scan as the production default. Do not integrate this candidate; a future attempt needs a materially different query workload or index shape and a separate comparison. These timings are local heuristic evidence from one machine, not a cross-machine CI budget.

The next plan's single first deliverable should be a core-only spatial-query prototype with a reproducible correctness comparison against the existing scan on the same fixed graph fixture; its first gate should be focused Vitest tests covering nested positions, measurement changes, hidden ancestry, override updates, stable order, and boundary-touch semantics. Do not add a gesture machine or resize controls in that first deliverable.
