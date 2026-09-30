# Plan 049: Add Foldkit model queries and typed state observation

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- apps/foldkit/src/graph.ts apps/foldkit/src/application.ts apps/foldkit/e2e/test-harness.ts apps/foldkit/e2e/public-state.e2e.ts docs/react-flow-api-correspondence.md research/traces/public-state-contract.md research/catalogs/react-flow-coverage.md research/PROGRESS.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P2
- Effort: M
- Risk: MED
- Depends on: 045, 047
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: COMPLETE (2026-09-26)

## Why this matters

Foldkit should use pure model reads and typed message/port observation for the shared contract. This proves the capability in the real host while keeping package extraction a separate, visible roadmap item.

## Current state

Plan 045's selected contract is recorded in [the public state trace](../research/traces/public-state-contract.md): pure selectors over complete accepted model state, typed read/accepted-state messages and ports, proposals separate from acceptance, value equality for deduplication, no initial event, and FIFO event processing. Return readonly model values by immutable convention; no runtime freeze or private store exposure is promised.

`apps/foldkit/src/graph.ts:31` uses a Schema-derived model with document, viewport, ownership modes, and a pointer session. `Graph.update` at 254 replaces authoritative state and dispatches semantic commands. Application ports at `apps/foldkit/src/application.ts:38` currently expose only actions and changes:

```ts
export const ports = {
  inbound: { actions: Port.inbound(HostAction) },
  outbound: { changes: Port.outbound(FlowChangeSchema) },
}
```

The test harness runs createProgram with Foldkit Runtime and subscribes through ports. `docs/standards.md` explicitly describes this Foldkit host as an app-scoped prototype pending a separate package promotion.

## Scope

Only modify the following files or explicitly named directory subsets:

- `apps/foldkit/src/graph.ts`
- `apps/foldkit/src/application.ts`
- `apps/foldkit/e2e/test-harness.ts`
- `apps/foldkit/e2e/public-state.e2e.ts`
- `docs/react-flow-api-correspondence.md`
- `research/traces/public-state-contract.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/049-add-foldkit-state-queries` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Implement native reads

Use Plan 045's selected API names and Plan 047's snapshot type. Add pure Graph selectors for accepted snapshot, nodes, edges, node, edge, and viewport. Read the existing model; include hidden/culled entries and parent-relative positions; missing IDs return `undefined`; exclude pointerSession previews. Return readonly references under the immutable-model contract, with no identity guarantee. Do not introduce mutable refs, a JavaScript controller, or another authoritative store.

Verify `bun run typecheck` and `bun run check:architecture` pass. Keep the app-only layout explicitly documented; do not create a nominal package that still imports from apps.

### 2. Add typed observation at the host boundary

Implement the approved typed snapshot request/response and accepted-state notification messages/ports. Reuse Foldkit Message, Port, and Command patterns from application.ts. Ensure initial reads are obtainable after Runtime embedding, accepted updates use the latest model, controlled proposals do not masquerade as accepted changes, and emission follows the shared ordering/deduplication, no-initial-delivery, exception, reentrancy and disposal rules in Plan 045. Keep SemanticChange separate.

Extend the harness using these real ports, then add `public-state.e2e.ts`. Cover initial request, update/dispatch in both ownership modes, viewport changes, cancellation, two programs, unsubscribe, and disposal. Assert observer emissions as well as rendered output. Verify `bun run test:conformance:foldkit -- public-state.e2e.ts` passes.

### 3. Record prototype capability and limits

Update correspondence and evidence links for the Foldkit host. State that package consumers cannot yet import a reusable Foldkit adapter. Keep that packaging gap open. Verify `bun run check`, the offline catalog checker, and `bun run verify` pass.

## Test plan

Use the actual Runtime embed handle and typed ports, not direct calls to Graph.update as the sole proof. After disposal, send a formerly valid inbound action and verify no observer output or DOM returns. Compare pure query results with host output for hidden nodes, missing IDs, and controlled acknowledgements. Foldkit browser tests run with the existing strict port 4178 config.

## Done criteria

- [x] Every step's named verification command passes and its output is recorded.
- [x] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [x] `git diff --check` exits 0; Plan 049 files are within scope. The worktree also contains previously authorized edits from Plans 044-048 and 050; `plans/README.md` remains reviewer-owned.
- [x] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [x] This plan's execution status was updated after the required evidence existed; the reviewer-owned `plans/README.md` index remains untouched for this plan.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- The Foldkit runtime cannot support the approved observation lifetime without private API access.
- The work requires promoting the prototype to a reusable package, a new global store, or a framework version upgrade.
- Pure core tests are being presented as production Foldkit port/lifecycle proof.

## Maintenance notes

A later package-promotion plan must carry these contracts and tests across the app/package boundary. Do not label an app prototype a released adapter.

## Execution record

- **Status:** complete, with local verification only.
- **Changed for Plan 049:** `apps/foldkit/src/graph.ts`, `apps/foldkit/src/application.ts`, `apps/foldkit/e2e/test-harness.ts`, `apps/foldkit/e2e/public-state.e2e.ts`, `docs/react-flow-api-correspondence.md`, `research/traces/public-state-contract.md`, `research/catalogs/react-flow-coverage.md`, and `research/PROGRESS.md`. The execution record is this plan file. The reviewer-owned `plans/README.md` was not changed for this plan.
- **Implementation:** pure selectors expose the complete accepted model value; typed Runtime ports expose correlated snapshot/optional lookup requests and accepted-state notifications. Schema equality deduplicates equal values, semantic proposals remain distinct from accepted updates, and the app-scoped host preserves ordering and lifecycle behavior.
- **Evidence:** `bun run check` passed; `bun run typecheck` passed; `bun run check:architecture` passed (65 production files); `bun run test` passed (19 files, 135 tests); `bun run docs:generate-api` passed; `bun run docs:check` passed (16 Markdown files); `bun run scripts/check-react-flow-catalog.ts` passed (208 entries, 200 capabilities); `bun run research:check-traces` passed (2,039 citations across 48 traces); `bun run test:conformance:foldkit -- public-state.e2e.ts` passed (3 tests); `git diff --check` passed; `bun run verify` exited 0 (189 vanilla browser tests passed, 2 native-pointer cases skipped, 10 Vue tests passed, and 8 Foldkit tests passed).
- **Remaining gaps and limits:** At this plan’s execution date, Foldkit was still an app-scoped prototype; Plan 061 WP2 later moved the reusable adapter to `packages/foldkit` and renamed the demo workspace. Packed-consumer behavior remains unverified. The checks do not prove hosted CI, publication, current React Flow runtime equivalence, collector delivery, or native multi-pointer behavior. The full local browser gate skipped two native pointer-capture cases.
