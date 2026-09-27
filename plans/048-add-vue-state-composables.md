# Plan 048: Add Vue-native state reads and composables

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- packages/vue/src/use-flow.ts packages/vue/src/flow-canvas.ts packages/vue/src/public.ts apps/vue/src/test-harness.ts apps/vue/e2e/public-state.e2e.ts docs/react-flow-api-correspondence.md research/traces/public-state-contract.md research/catalogs/react-flow-coverage.md research/PROGRESS.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P2
- Effort: M
- Risk: MED
- Depends on: 045, 047
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: COMPLETE (2026-09-26)

## Why this matters

Vue consumers should read the same accepted state as JavaScript through Vue reactivity. This slice supplies edges, selected lookups, and node/edge/viewport composables without forcing a callback facade onto Vue components.

## Current state

The chosen read and notification semantics are in [Plan 045's public state trace](../research/traces/public-state-contract.md). Vue reads are readonly reactive views over accepted state, including hidden/culled entries; object identity is not stable. Semantic proposals remain separate from accepted-state notifications. No callback is delivered on subscription. Equality, acknowledgement, cancellation and disposal expectations are shared across hosts; Vue scheduler timing remains adapter-specific.

`packages/vue/src/use-flow.ts:11` defines a canvas-local injected editor. Its existing return value is:

```ts
return {
  document: editor.document,
  nodes: computed(() => editor.document.value.nodes),
  viewport: editor.viewport,
  dispatch: editor.dispatch,
  updateDocument: editor.updateDocument,
  updateViewport: editor.updateViewport,
}
```

`packages/vue/src/flow-canvas.ts:583` provides this editor and exposes it; `packages/vue/src/public.ts` exports FlowCanvas and useFlow. The app test harness imports from `@flow/vue`, allowing production composables to be exercised in a mounted descendant.

## Scope

Only modify the following files or explicitly named directory subsets:

- `packages/vue/src/use-flow.ts`
- `packages/vue/src/flow-canvas.ts`
- `packages/vue/src/public.ts`
- `apps/vue/src/test-harness.ts`
- `apps/vue/e2e/public-state.e2e.ts`
- `docs/react-flow-api-correspondence.md`
- `research/traces/public-state-contract.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/048-add-vue-state-composables` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Extend the injected public API

Implement the signatures settled in Plan 045 using Plan 047's shared snapshot type/selectors. Add edges and getSnapshot/getNode/getEdge lookups to useFlow, plus useNodes, useEdges, and useViewport as the mapped Vue equivalents. Use canvas-local deeply readonly computed projections without mutable aliases to owner props/internal state; object identity is not stable. Reactivity must follow authoritative activeDocument/activeViewport and Vue's documented tick timing. Implement the shared accepted-state event ordering, deduplication, exception isolation, reentrancy queue, no-initial-delivery and disposal policy from the state trace. Do not create another authoritative ref, singleton store, polling loop, or JavaScript host instance.

Export through `packages/vue/src/public.ts`. Verify `bun run typecheck` and `bun run check:architecture` pass.

### 2. Prove component lifecycle and ownership

Add a descendant probe to the existing app test harness using only `@flow/vue` imports. Add `public-state.e2e.ts` with controlled/uncontrolled updates, document replacement, edge removal, viewport acknowledgement, missing IDs, and hidden elements. Mount two canvases and prove injection isolation. Unmount the observer and then the canvas; assert no further observer side effects. Verify a composable outside its provider fails with an actionable error.

Verify `bun run test:conformance:vue -- public-state.e2e.ts` passes. Await Vue rendering appropriately; do not weaken controlled-state assertions to accommodate an accidental second store.

### 3. Update the correspondence

Document which Vue reads are reactive and which methods return a current snapshot. Record scheduler and disposal differences from React and JavaScript. Update the coverage links without claiming unimplemented hook families. Verify `bun run check`, the offline catalog checker, and `bun run verify` pass.

## Test plan

Use the existing `apps/vue/src/test-harness.ts` pattern of a real descendant component calling useFlow. Assert both composable output and DOM changes. A controlled proposal must leave computed accepted data unchanged until props acknowledge it. Mount/unmount checks must detect observer side effects, not only count canvas roots.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Achieving the approved contract requires replacing Vue's controlled model ownership or adding a second host runtime.
- The common snapshot design assumes synchronous Vue DOM updates.
- An unimplemented connection, store, measurement, or lifecycle hook is being included opportunistically.

## Maintenance notes

Keep computeds local to the injected canvas. Additional composables should build on this accepted-state contract. Framework-native scheduling is an explicit adaptation, not evidence of a missing synchronous API.

## Execution record

- Implemented canvas-local readonly computed `snapshot`, `document`, `nodes`, `edges`, and `viewport` projections; `getSnapshot`, `getNode`, `getEdge`, `subscribeState`; and exported `useNodes`, `useEdges`, and `useViewport`. The accepted state derives from controlled props or the existing canvas-owned refs. Snapshots are detached and deeply frozen. Notifications deduplicate equal values, deliver no initial event, isolate listener failures, preserve registration order, queue reentrant changes, and stop on unsubscription or canvas disposal.
- Added a real descendant probe using only `@flow/vue` exports. Focused browser cases cover controlled proposal/acknowledgement, uncontrolled updates, replacement and edge removal, viewport updates, missing IDs, hidden/cull reads, independent canvases, readonly values, observer unmount, canvas disposal, no-initial delivery, equality, reentrancy, exception isolation, and missing-provider guidance.
- Updated the correspondence matrix, public-state trace, coverage map and `research/PROGRESS.md`. Foldkit selectors remain open; no live React Flow runtime comparison, hosted CI, collector test, or native multi-pointer proof is claimed.
- Verification: `bun run check`, `bun run check:architecture`, `bun run typecheck`, `bun run test` (19 files, 135 tests), `bun run docs:generate-api`, `bun run docs:check`, `bun run scripts/check-react-flow-catalog.ts` (208 entries, 200 capabilities; upstream check disabled), `bun run research:check-traces` (2,039 citations across 48 traces), focused `bun run test:conformance:vue -- public-state.e2e.ts` (2 passed), `git diff --check`, and `bun run verify` all exited 0. Full verify ran 189 vanilla browser tests with 2 pre-existing native multi-pointer skips and passed Vue and Foldkit conformance gates (Foldkit: 5 passed).
- Changed files for this plan: `packages/vue/src/use-flow.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`, `apps/vue/src/test-harness.ts`, `apps/vue/e2e/public-state.e2e.ts`, `docs/react-flow-api-correspondence.md`, `research/traces/public-state-contract.md`, `research/catalogs/react-flow-coverage.md`, `research/PROGRESS.md`, and this plan. `plans/README.md` remains reviewer-owned.
