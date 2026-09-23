# Plan 003: Render nodes in the graph's stacking order

> **Executor instructions:** Read this plan fully, run gates in order, and update only its row in `plans/README.md` after success. **Drift check first:** `git diff --stat e393e3e..HEAD -- packages/core/src/domain/flow-graph.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/style.css apps/vanilla/e2e/graph-renderers.e2e.ts`. Compare changed files to the excerpts; stop if the ordering contract differs.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** MED; **Category:** bug
- **Depends on:** Plan 002 (and completed Plan 001); both touch node reconciliation
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

Core defines parent-before-child and sibling `zIndex` ordering, but the vanilla host currently stacks node elements in document-array order. Overlap can display the wrong node on top and route pointer input to a node other than the one the graph contract says is topmost.

## Current state

- `packages/core/src/domain/flow-graph.ts:75-88` sorts sibling IDs by `zIndex` then document index, then creates `orderedNodes` with each parent before descendants. `flow-graph.test.ts:48` asserts that order.
- `apps/vanilla/src/mount-flow.ts:1419-1458` loops over `next.nodes` and `viewport.append(entry.element)` for every visible node. Appending retained nodes moves them in the DOM to that array order.
- `apps/vanilla/src/style.css:108-110` assigns every `.flow-node` the same `z-index: 1`. DOM order therefore decides overlap within the node layer.
- `docs/architecture.md:85` expressly promises parent behind descendant and `zIndex` among siblings. Keep that contract rather than replacing it with per-node CSS offsets.
- `apps/vanilla/e2e/graph-renderers.e2e.ts:10-51` provides the nested-node mount pattern. Use a browser overlap assertion for paint and hit behavior, not only an array-order unit test.

```ts
// packages/core/src/domain/flow-graph.ts:75-88
const compareSiblings = (first: NodeId, second: NodeId): number => {
  const a = graphNodes.get(first)!;
  const b = graphNodes.get(second)!;
  return (a.node.zIndex ?? 0) - (b.node.zIndex ?? 0) || a.documentIndex - b.documentIndex;
};
// ... orderedNodes is filled by appendSubtree(root)
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All configured stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, and this plan's index row. Read `flow-graph.ts` and `style.css`, but do not change core ordering or add dynamic CSS `z-index` unless the DOM-order approach is disproven and the operator revises this plan. Do not change edge layering, accessibility roles, or persistence. Use `codex/003-graph-stacking` if an isolated branch is requested; no commit/push/PR without instruction.

## Steps

1. Add a browser case whose document order conflicts with sibling `zIndex` and parent-child order. Give overlapping nodes declared sizes. Assert DOM order of `.flow-node` and `document.elementFromPoint` at an overlap; include a controlled update that changes `zIndex` without replacing node elements. **Verify:** focused browser command → new assertions fail on old host.
2. Reconcile visible nodes in `graph.orderedNodes` order, using each graph node's declared `node` and the existing keyed entry lifecycle. Preserve the existing skip for hidden/culled nodes and focus restoration at `mount-flow.ts:1469-1502`. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Run the full gate. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Follow the real mount and bounding-box pattern in `graph-renderers.e2e.ts`; core ordering alone cannot prove browser paint/hit behavior.
- [ ] The topmost overlap follows `orderedNodes` for contradictory document order, `zIndex`, and parent-child input.
- [ ] A `zIndex` update reorders retained elements without remounting renderer content or losing focus.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the host now uses a different stacking context, if browser hit testing contradicts DOM order under the current CSS, if the core order contract changed, or if another file must change. Reviewers should check focus and pointer targets as well as paint: DOM reordering can affect both.
