# Plan 012: Decide spatial state from a core-only prototype

> **Executor:** Use an isolated worktree. Read this file, `docs/standards.md`,
> `research/spatial-gesture-baseline.md`, and `research/PROGRESS.md`. Run each
> gate before continuing. Update the index status only after all gates pass.
> **Drift check first:** `git diff --stat 6e84008..HEAD -- packages/core/src/domain/flow-graph.ts packages/core/src/domain/flow-visibility.schema.ts packages/core/src/domain/flow-graph.test.ts scripts/bench-flow-geometry.ts research/spatial-gesture-baseline.md research/PROGRESS.md`. Compare any changed path with the excerpts below; STOP if its contract changed.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Depends on:** 011
- **Category:** direction, performance; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

Plan 011 measured median `graphNodesIntersecting` at about 0.03 ms and
`selectionInRect` at about 0.15 ms for 4,000 nodes on one M4 Max
(`research/spatial-gesture-baseline.md:13-20`). That does not justify committing
an index yet. Its recommendation at lines 22-30 is a core-only correctness and
cost comparison, including measurement, override, ancestry, and hidden-state
invalidation. `research/PROGRESS.md:71` still leaves measured geometry and
spatial-index state open.

`packages/core/src/domain/flow-graph.ts:15-20` holds `document`, a node map,
children, and `orderedNodes`; `createFlowGraph` at lines 24-90 derives them from
the validated document, measurements, and overrides. `graphNodesIntersecting`
at lines 141-145 filters ordered nodes. `selectionInRect` at
`flow-visibility.schema.ts:95-140` scans nodes and edges, with strict partial
overlap. Current tests at `flow-graph.test.ts:115-151` cover child overrides,
size precedence, hidden ancestors, and directed topology. The benchmark at
`scripts/bench-flow-geometry.ts:10-64` uses 250/1,000/4,000-node decoded
fixtures and 31 samples per operation. Preserve the existing public result
order and touching-edge rule; `graphNodesIntersecting` includes boundary touch
while partial selection excludes it.

```ts
// packages/core/src/domain/flow-graph.ts:144-145
export const graphNodesIntersecting = (graph: FlowGraphView, rect: FlowRect): readonly FlowGraphNode[] =>
  graph.orderedNodes.filter((node) => !node.hidden && intersects(graphNodeBounds(node), rect));
```

`docs/standards.md:5-16` requires pure graph meaning in packages, schema-derived
types, and the existing `bun run verify` gate. The host owns live DOM
measurements; do not put an index or measurement into saved `FlowDocument`
(`docs/architecture.md:83-91`).

## Scope and commands

Only edit/create `packages/core/src/domain/flow-spatial-prototype.ts`, its
`.test.ts`, `scripts/bench-flow-geometry.ts`,
`research/spatial-gesture-baseline.md`, and the Plan 012 row in
`plans/README.md`. Do not wire the prototype into `flow-graph.ts`, the public
API, or the vanilla host; do not add a dependency or edit imported research.
Use a `codex/012-spatial-prototype` isolated branch if needed. Do not commit,
push, merge, or open a PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Focused tests | `bunx vitest run packages/core/src/domain/flow-spatial-prototype.test.ts packages/core/src/domain/flow-graph.test.ts` | exit 0 |
| Benchmark | `bun run scripts/bench-flow-geometry.ts` | exit 0, finite rows for baseline and candidate |
| Full gate | `bun run verify` | exit 0, including browser tests |
| Hygiene | `git diff --check` | exit 0 |

## Steps

1. Add a **non-exported-from-package** candidate in
   `flow-spatial-prototype.ts`: a 128-flow-unit grid over each visible graph
   node's absolute bounds. For each occupied cell store node ids; a rectangle
   query unions candidate ids, applies the existing inclusive intersection
   predicate, and sorts matches by their `graph.orderedNodes` index; do not
   scan every ordered node during the candidate query. Build the grid
   from a fresh `FlowGraphView` on each document/measurement/override revision;
   viewport translation only changes the query rectangle. Document how nodes
   spanning many cells are represented and de-duplicated. **Verify:** focused
   Vitest compiles and passes after the tests in step 2 are added.
2. In `flow-spatial-prototype.test.ts`, compare candidate ids to
   `graphNodesIntersecting` on fixed fixtures after separate rebuilds for node
   add/remove, parent movement, child override, measurement change, hidden
   ancestor, and boundary touch. Assert exact ordered ids, not only set
   equality. Add at least one fixed-seed generated case with 100 rectangles;
   print the seed on failure. **Verify:** focused Vitest exits 0.
3. Extend the existing benchmark with candidate build and query rows for the
   same three fixture sizes and 31 samples. Keep document decode outside
   timed loops and report candidate build cost separately; never fold it into
   query time. Run three times on the same machine. **Verify:** benchmark exits
   0 with finite medians/p95 for each candidate row and retains all 12
   baseline rows.
4. Append a decision to `research/spatial-gesture-baseline.md`: compare
   candidate and scan semantics, build and query costs, memory proxy (number
   of stored cell/id entries), and invalidation complexity. Default to the
   existing scan unless candidate query median improves by at least 2x on the
   4,000-node fixture **and** rebuild cost does not outweigh 20 typical queries
   per document change. Label this heuristic as a local decision rule, not a
   cross-machine CI budget. If the candidate wins, propose a separate
   integration plan; do not wire it here. **Verify:** full gate and hygiene
   commands exit 0.

## Test plan and done criteria

- [ ] Candidate matches the existing scan, in order, for every named revision
  and the fixed-seed rectangle series.
- [ ] Three benchmark runs include baseline and candidate build/query rows;
  the decision note reports the measured comparison and chosen next step.
- [ ] `bun run verify` and `git diff --check` pass; no out-of-scope file changed.
- [ ] `research/PROGRESS.md:71` remains open: this prototype alone does not
  define supported production spatial state or a performance budget.

## STOP and maintenance

STOP if an exact-result comparison fails, rebuilding requires host DOM data,
the candidate needs a new dependency, the benchmark cannot produce finite
numbers, or a correction would touch out-of-scope production code. Future
index work must preserve order, measurement precedence, descendant movement,
hidden ancestry, and the distinction between inclusive intersection and
strict partial selection. Review candidate memory growth before adoption.
