# Plan 047: Expose authoritative state through the JavaScript controller

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- packages/core/src/domain/flow-snapshot.ts packages/core/src/domain/flow-snapshot.test.ts packages/core/src/public.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/public.ts apps/vanilla/e2e/public-state.e2e.ts tests/consumer/main.ts tests/consumer/consumer.typecheck.ts scripts/check-packed-consumer.ts scripts/generate-api-reference.ts docs/public-api.md docs/api-reference.md docs/react-flow-api-correspondence.md research/traces/public-state-contract.md research/catalogs/react-flow-coverage.md research/PROGRESS.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P1
- Effort: L
- Risk: MED
- Depends on: 044, 045, 046
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: TODO

## Why this matters

Applications need current graph and viewport reads to build inspectors, save flows, and respond to updates. A shared snapshot contract avoids exposing the host's internal interaction state and gives framework adapters a precise target.

## Current state

`apps/vanilla/src/mount-flow.ts:424,464` has Effect-host and JavaScript controller interfaces without getters. The controller at 5846 owns destruction; at 5956 it subscribes semantic listeners; at 5963 authoritative update replaces `document` and reconciles. The JavaScript wrapper near 6090 forwards subscribe. These are the production boundaries to extend, not test-window globals.

```ts
subscribe: (listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
},
```

`FlowChangeSchema` is a semantic proposal union. State acceptance notifications need a distinct contract. `scripts/check-packed-consumer.ts:21` copies the real consumer fixtures and proves imports from packed packages.

## Scope

Only modify the following files or explicitly named directory subsets:

- `packages/core/src/domain/flow-snapshot.ts`
- `packages/core/src/domain/flow-snapshot.test.ts`
- `packages/core/src/public.ts`
- `apps/vanilla/src/mount-flow.ts`
- `apps/vanilla/src/public.ts`
- `apps/vanilla/e2e/public-state.e2e.ts`
- `tests/consumer/main.ts`
- `tests/consumer/consumer.typecheck.ts`
- `scripts/check-packed-consumer.ts`
- `scripts/generate-api-reference.ts`
- `docs/public-api.md`
- `docs/api-reference.md`
- `docs/react-flow-api-correspondence.md`
- `research/traces/public-state-contract.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/047-expose-javascript-state-reads` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Add the shared data contract

Implement Plan 045's approved `FlowSnapshotSchema` and derived type in `packages/core/src/domain/flow-snapshot.ts`, composed from FlowDocumentSchema and ViewportSchema. Export it. Add pure selectors only where they are reused by adapters; avoid a new store or event bus. Exclude transient preview, measurements, and DOM state.

Verify `bun run test -- packages/core/src/domain/flow-snapshot.test.ts` and `bun run typecheck` pass, covering the chosen snapshot ownership and lookup rules.

### 2. Wire reads and accepted-state notifications

Extend both controller interfaces and the JavaScript wrapper with the approved getSnapshot/getNodes/getEdges/getNode/getEdge/getViewport and state-subscription contract. Trace every authoritative document/viewport assignment, including external updates, accepted dispatch, pointer commit, and fitView. Notify only under Plan 045's accepted-state rules. Keep semantic subscriptions compatible. Centralize publication to avoid one host path omitting notifications.

Add `apps/vanilla/e2e/public-state.e2e.ts`. Mount through `createFlow` or the exported public facade. Prove initial reads, external updates, controlled proposal versus acknowledgement, uncontrolled commit, viewport changes, cancellation, multiple hosts, missing IDs, hidden/culled reads, unsubscription, and destruction. Include reentrant callback and listener-failure cases using the approved policy.

Verify `bun run test:browser -- public-state.e2e.ts` passes. Use production reads for assertions and rendered DOM for visual outcomes, not a test-only shadow document.

### 3. Prove package consumption and document ownership

Extend packed-consumer fixtures to call getters and subscribe/unsubscribe through public imports, asserting observable values and cleanup. Extend the consumer runner only if it needs additional result fields. Add the new snapshot schema to the explicit schema list in `scripts/generate-api-reference.ts`, regenerate API docs, and document getters, subscriptions, and ownership in `docs/public-api.md`. Update correspondence and the selected catalog evidence links, with exact tested limits. Verify `bun run test:consumer`, `bun run check`, and `bun run verify` pass.

## Test plan

A controlled drag proposal must not appear as accepted state before acknowledgement. Uncontrolled changes must be readable after commitment. Removing a hidden node must affect reads even if it had no DOM element. No observer fires after destruction, and one host cannot affect another. Test the approved mutation-safety policy by attempting consumer mutation and verifying live host state remains protected. Keep DOM cancellation tests separate from snapshot assertions.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Plan 045 has unresolved event ordering, mutation ownership, reentrancy, or post-destroy rules.
- A new global store, new dependency, broad host extraction, persistence migration, or DOM data in core is needed.
- A getter can only be implemented by scraping rendered elements.

## Maintenance notes

Any future authoritative state mutation must pass the same publication boundary. New semantic changes must preserve controlled ownership. Full drag/move lifecycle callbacks remain a later implementation slice.
