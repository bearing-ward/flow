# Plan 045: Map public interfaces and decide state and event contracts

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- docs/react-flow-api-correspondence.md research/traces/public-state-contract.md research/catalogs/react-flow-coverage.md research/PROGRESS.md plans/046-align-public-graph-queries.md plans/047-expose-javascript-state-reads.md plans/048-add-vue-state-composables.md plans/049-add-foldkit-state-queries.md plans/050-prove-shared-read-contract.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P1
- Effort: L
- Risk: LOW
- Depends on: 044 for final verification; read-only mapping may begin earlier
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: TODO

## Why this matters

Resolve the public contract before three hosts implement different versions of it. This is a design and correspondence plan. It makes a small read/query subset executable while leaving the complete API, example, and UI destination explicit.

## Current state

`research/PROGRESS.md:7-21` sets the full catalog goal and leaves API correspondence open. The snapshot has 114 API capability entries; listing entries is not member-level correspondence. `apps/vanilla/src/mount-flow.ts:424` exposes:

```ts
readonly update: (document: FlowDocument) => void
readonly dispatch: (command: FlowCommand) => void
readonly subscribe: (listener: (change: FlowChange) => void) => () => void
```

There are no state getters. `packages/vue/src/use-flow.ts:26` exposes document, nodes, viewport, and commands. `apps/foldkit/src/graph.ts:31` owns a Schema model with document and viewport. `packages/core/src/domain/flow-runtime.schema.ts:819` defines semantic changes, including node-size and viewport, rather than a complete pointer lifecycle callback family. The pinned instance API is in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/instance.ts:25`; its getNodes/getNode/getEdges/getEdge are an appropriate first subset.

## Scope

Only modify the following files or explicitly named directory subsets:

- `docs/react-flow-api-correspondence.md`
- `research/traces/public-state-contract.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`
- `plans/046-align-public-graph-queries.md`
- `plans/047-expose-javascript-state-reads.md`
- `plans/048-add-vue-state-composables.md`
- `plans/049-add-foldkit-state-queries.md`
- `plans/050-prove-shared-read-contract.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/045-map-public-api-and-state-contracts` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Build the correspondence table

Create `docs/react-flow-api-correspondence.md`. Inventory members of the current ReactFlow canvas interface, Node, Edge, and ReactFlowInstance against their official documentation and the dated catalog. Separate current website scope from the pinned source revision. For each member record its upstream URL/name, Flow core equivalent, JavaScript/Vue/Foldkit equivalent or gap, ownership, reference evidence, and follow-up boundary. Map useReactFlow, useNodes, useEdges, useViewport and the change/lifecycle callback families needed to explain these interfaces. Other hooks/types remain catalog gaps.

Verify with `bun run scripts/check-react-flow-catalog.ts` and `bun run docs:check`, both exit 0. A table row means correspondence recorded, not capability implemented.

### 2. Decide the initial shared contract

Write `research/traces/public-state-contract.md` from real entry points through authoritative state, preview state, rendering, and cleanup. Cover JavaScript `createFlow`, Vue `FlowCanvas`/`useFlow`, and Foldkit `createProgram`/`Graph.update`. Describe test routes separately. End with `## Conformity and deviations`, exact path:line evidence, and reasons for differences.

Recommended bounded contract: Schema-derived `{ document, viewport }` snapshot; getSnapshot/getNodes/getEdges/getNode/getEdge/getViewport for JavaScript; readonly computed values and lookup functions in Vue; pure model selectors and typed messages/ports in Foldkit. Read authoritative state, including hidden or culled document elements. Controlled proposals leave reads unchanged until acknowledged; uncontrolled commits update reads. Missing IDs return undefined. Document coordinates remain parent-relative. Exclude measurements, DOM elements, pointer sessions, and preview positions from snapshots.

Define event ordering, notification deduplication, initial delivery, unsubscribe/disposal, listener exceptions, reentrant updates, and whether reads return detached values or protected immutable references. Retain semantic change proposals separately from accepted-state notifications. A state callback is not a substitute for onNodeDrag/onMove start/move/end. Specify proposed mappings and cancellation sequences for those callback families, but defer their implementation. Compare this recommendation with direct framework-native reads without a shared snapshot; record the chosen tradeoff.

Verify `bun run research:check-traces` exits 0. If evidence cannot settle a choice, mark the design blocked and leave dependent plans unready.

### 3. Make downstream plans executable

Update Plans 046-050 with the chosen signatures, notification sequences, disposal rules, test expectations, and any revised scopes. Remove provisional choices. Link the new matrix from the coverage map. Keep broad API correspondence and framework coverage checklist items open because this slice does not map every API member.

Verify `bun run check`, the offline catalog checker, and `bun run verify` all exit 0. Confirm `git diff --name-only` includes no production source files.

## Test plan

No production tests are added by this design plan. Supply explicit input/action/output tables for initial reads, external replacement, controlled proposal/acknowledgement, uncontrolled commit, viewport update, missing IDs, cancellation, and disposal. Downstream plans must turn them into tests. Link each interface/member row to evidence or an explicit gap.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- A chosen contract conflicts with the immutable graph document or requires full internal-store exposure.
- Lifecycle callback design is being implemented during this documentation-only scope.
- Plan 044 remains unverified when attempting final acceptance.

## Maintenance notes

Revisit correspondence at catalog milestones. New upstream members remain visible as gaps. The initial committed-state design is a bounded decision; future preview/lifecycle APIs require separate contracts and evidence.
