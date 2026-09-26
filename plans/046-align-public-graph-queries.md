# Plan 046: Add reference-shaped graph query helpers

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- packages/core/src/domain/flow-graph.ts packages/core/src/domain/flow-graph.test.ts packages/core/src/public.ts tests/consumer/consumer.typecheck.ts docs/api-reference.md docs/react-flow-api-correspondence.md research/traces/public-graph-queries.md research/catalogs/react-flow-coverage.md research/PROGRESS.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: 044, 045
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: TODO

## Why this matters

The current helpers are useful edge queries but their names are easy to confuse with React Flow's node-returning helpers. Add the public equivalents selected by Plan 045 without silently changing an existing function's return semantics.

## Current state

`packages/core/src/domain/flow-graph.ts:253` currently implements edge queries:

```ts
export const graphIncomers = (
  graph: FlowGraphView,
  id: NodeId
): readonly FlowEdge[] =>
  graph.document.edges.filter((edge) => edge.target === id)
```

The outgoer helper at 259 filters source. `flow-graph.test.ts:251` explicitly tests directed neighboring edges. In the pinned system `utils/graph.ts:76,118`, getOutgoers/getIncomers collect endpoint IDs into a Set and filter the supplied nodes in input order. Its getConnectedEdges at 332 returns edges touching any supplied node.

## Scope

Only modify the following files or explicitly named directory subsets:

- `packages/core/src/domain/flow-graph.ts`
- `packages/core/src/domain/flow-graph.test.ts`
- `packages/core/src/public.ts`
- `tests/consumer/consumer.typecheck.ts`
- `docs/api-reference.md`
- `docs/react-flow-api-correspondence.md`
- `research/traces/public-graph-queries.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/046-align-public-graph-queries` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

## Commands

Run from the repository root. Install only if the executor checkout needs dependencies.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Dependencies | `bun install --frozen-lockfile` | Exit 0; lockfile unchanged |
| Quality | `bun run check` | Exit 0 |
| Typecheck, including package builds | `bun run typecheck` | Exit 0 |
| Unit tests | `bun run test` | Exit 0 |
| Generated API docs | `bun run docs:generate-api` then `bun run docs:check` | Generated file agrees with exports; exit 0 |
| Coverage map | `bun run scripts/check-react-flow-catalog.ts` | Exit 0 |
| Complete local gate | `bun run verify` | Exit 0; report existing skips explicitly |

Full browser gates must run serially, with strict test ports 4176, 4177, and 4178. Do not reuse the user's port 4173 server. Local gates do not establish hosted CI, publication, collector delivery, or native multi-pointer proof.

## Steps

### 1. Establish the exact contract

Read Plan 045's correspondence and final signatures. Add pure getIncomers, getOutgoers, and getConnectedEdges exports, accepting node or ID-bearing node inputs and supplied node/edge collections according to that contract. Preserve readonly inputs and supplied element identity/order. Keep the existing graphIncomers/graphOutgoers as the explicitly documented Flow edge-query API for this slice. Do not add aliases claiming they are equivalent.

Before implementation, add cases to `flow-graph.test.ts` following the decoded-document fixture at line 251. Verify `bun run test -- packages/core/src/domain/flow-graph.test.ts` exposes the missing new behavior while existing query assertions remain intact.

### 2. Implement and export the pure helpers

Use endpoint membership sets, retain input order, deduplicate neighboring node results through membership rather than returning one node per parallel edge. Do not add DOM visibility filtering. Confirm self-loops, hidden nodes, disconnected nodes, empty inputs, parallel edges, and edges referencing a node absent from the supplied subset match pinned behavior. Keep Flow schema-derived node/edge types; do not copy upstream generic architecture or import upstream implementation into production.

Verify the focused graph test and `bun run typecheck` pass. Add packed-consumer imports and type assertions for the new functions; `bun run test:consumer` must pass.

### 3. Record the comparison boundary

Create `research/traces/public-graph-queries.md` with equivalent input/output cases from the pinned implementation and Flow. Separate executable comparison from source inspection. If reference execution is unavailable, label those cells unverified while retaining Flow contract tests. End with `## Conformity and deviations`. Update the selected catalog entries and API correspondence, regenerate API docs, and run `bun run verify` and `bun run check`.

Do not close bounds/intersection/path-helper coverage or claim all graph utilities match.

## Test plan

At minimum test incoming and outgoing direction, stable node order differing from edge order, duplicate endpoints, self-loops, empty selection, absent selected IDs, hidden nodes, and connected-edge order with both endpoints selected. Assert no input mutation and retain old edge-query tests. Use independently specified expected outputs, not the new implementation to calculate expectations.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Plan 045 has not settled signatures or requires changing the old edge-returning helpers.
- The comparison would require mutating imported reference files or claiming parity from source inspection alone.

## Maintenance notes

Review future naming changes against consumers. Public document queries include hidden elements; rendering visibility and intersection measurement rules are separate APIs.
