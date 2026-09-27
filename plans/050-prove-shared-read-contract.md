# Plan 050: Prove shared state and query behavior across all hosts

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- packages/conformance/src/index.ts packages/conformance/src/index.test.ts apps/vanilla/e2e/controller-conformance.ts apps/vanilla/e2e/shared-conformance.e2e.ts apps/vue/e2e/conformance.ts apps/vue/e2e/shared-conformance.e2e.ts apps/vue/src/test-harness.ts apps/foldkit/e2e/conformance.ts apps/foldkit/e2e/shared-conformance.e2e.ts apps/foldkit/e2e/test-harness.ts research/fixtures/public-state-contract.json research/fixtures/README.md research/traces/public-state-contract.md research/catalogs/react-flow-coverage.md research/PROGRESS.md README.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P2
- Effort: M
- Risk: MED
- Depends on: 046, 047, 048, 049
- Category: tests
- Planned at: `1aa5915`, 2026-09-26
- Execution status: COMPLETE

## Why this matters

A common fixture set will prevent the new getters and framework bindings from drifting. Cross-host agreement proves the Flow contract; upstream conformity requires a separately identified reference comparison.

## Current state

The cross-host value, event and lifecycle expectations are settled by [Plan 045's trace](../research/traces/public-state-contract.md). Fixture expectations must include complete hidden/culled document values, parent-relative positions, missing-ID results, accepted-state sequence separate from proposals, no initial callback, equal-value deduplication, controlled acknowledgement timing, cancellation, unsubscribe/disposal, and mutation-safety limits per host.

`packages/conformance/src/index.ts:1-80` defines encoded fixture documents, actions, rendered snapshots, and ConformanceAdapter. The existing adapter contract includes:

```ts
snapshot: () => Promise<ConformanceSnapshot>
changeKinds: () => Promise<readonly string[]>
destroy: () =>
  Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
  }>
```

It records rendered node IDs, positions, identity markers, and semantic kinds. It does not yet compare public accepted-state reads. `apps/vanilla/e2e/shared-conformance.e2e.ts:8` runs fixtures through a real controller adapter. Vue and Foldkit drivers reach their actual component/Runtime via test harnesses. PROGRESS records eight shared scenarios; older README language must be reconciled with the live suite.

## Scope

Only modify the following files or explicitly named directory subsets:

- `packages/conformance/src/index.ts`
- `packages/conformance/src/index.test.ts`
- `apps/vanilla/e2e/controller-conformance.ts`
- `apps/vanilla/e2e/shared-conformance.e2e.ts`
- `apps/vue/e2e/conformance.ts`
- `apps/vue/e2e/shared-conformance.e2e.ts`
- `apps/vue/src/test-harness.ts`
- `apps/foldkit/e2e/conformance.ts`
- `apps/foldkit/e2e/shared-conformance.e2e.ts`
- `apps/foldkit/e2e/test-harness.ts`
- `research/fixtures/public-state-contract.json`
- `research/fixtures/README.md`
- `research/traces/public-state-contract.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`
- `README.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/050-prove-shared-read-contract` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Extend the fixture model without weakening existing proof

Add a versioned shared read-contract fixture set with Schema-derived input and expected-output data. Keep the existing eight rendering cases. Extend the adapter with public state/query observation and accepted-state sequences. Preserve tests for controlled proposals and DOM snapshots as separate channels. Normalization may remove framework scheduling details, but must preserve values and acceptance order. Assert the shared initial-delivery, deduplication, event ordering, cancellation and controlled-ack rules; host-specific mutation protections are tested in each adapter plan.

Add at least four named cases: initial/hidden/missing-ID reads; external replacement; controlled proposal followed by acknowledgement; uncontrolled commit plus viewport update. Add disposal and neighboring-node/connected-edge expectations. Verify `bun run test -- packages/conformance/src/index.test.ts` passes and checks unique fixture IDs and populated expectations.

### 2. Drive production APIs in all three hosts

Implement the new driver methods using the JavaScript public controller, Vue descendant composables, and Foldkit selectors/typed ports produced by prerequisite plans. Test bridges may transport observations; they must not calculate expected state from fixture inputs. Read the same fixture from each host and assert its published state, semantic sequence, and rendered outcome.

Run these commands serially: `bun run test:browser -- shared-conformance.e2e.ts`, `bun run test:conformance:vue -- shared-conformance.e2e.ts`, and `bun run test:conformance:foldkit -- shared-conformance.e2e.ts`. All must pass. Retain adapter-specific lifecycle tests from Plans 047-049.

### 3. Record the actual proof boundary

Update fixtures README, root README scenario counts, PROGRESS, and catalog links. Store Flow fixture data in `research/fixtures/public-state-contract.json`; do not label it an upstream capture. Where Plan 046 has executable pinned outputs, cite them narrowly. End the trace with `## Conformity and deviations` and keep unexecuted reference cells unverified. Do not invent a full-entry conformity status unsupported by the current catalog checker.

Verify `bun run research:check-traces`, the offline catalog checker, `bun run check`, and `bun run verify` pass.

## Test plan

Assert exact snapshots and accepted-state sequences, including unchanged reads before controlled acknowledgement. Distinguish no semantic event from no accepted-state update. Test two independent hosts and disposal observation. A test that compares a fixture object with another copy of itself does not qualify. Keep the original rendering assertions so new APIs cannot pass while the visible graph regresses.

## Done criteria

- [x] Every step's named verification command passes and its output is recorded.
- [x] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [x] `git diff --check` exits 0; `git status --short` contains the scoped Plan 050 edits plus inherited completed-plan changes.
- [x] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [x] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Making the suite pass requires modifying production behavior outside the listed drivers/harnesses; return that defect to the responsible implementation plan.
- A host cannot expose the real public contract and a shadow test store is proposed.
- The reference capture lacks equivalent inputs or a reproducible revision.

## Maintenance notes

Future adapters must implement this driver contract and run the same fixtures. Add cases when public ownership or state read semantics change. Keep Flow conformance and React Flow reference proof separate.

## Execution record (2026-09-26)

- Scope files changed: `README.md`; conformance schema/fixture validation; vanilla, Vue, and Foldkit production-driver E2Es and harnesses; `research/fixtures/public-state-contract.json`; fixture README; public-state trace; React Flow coverage catalog; and `research/PROGRESS.md`. The original eight rendering fixture definitions remain unchanged. No production source was changed for Plan 050.
- Fixture unit validation: `bun run test -- packages/conformance/src/index.test.ts` — 1 file, 4 tests passed. Full unit suite: `bun run test` — 19 files, 136 tests passed.
- Browser commands ran serially: vanilla `bun run test:browser -- shared-conformance.e2e.ts` — 2 passed; Vue `bun run test:conformance:vue -- shared-conformance.e2e.ts` — 6 passed; Foldkit `bun run test:conformance:foldkit -- shared-conformance.e2e.ts` — 6 passed. Full verifier browser suite — 192 tests, 190 passed, 2 skipped.
- `bun run check`, `bun run typecheck`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces` (2,039 citations across 48 traces), and `bun run scripts/check-react-flow-catalog.ts` (208 entries, 200 capabilities, upstream check disabled) passed. `bun run verify` returned exit code 0; its Vue conformance suite passed 11 tests and Foldkit conformance passed 9 tests. `git diff --check` passed.
- `research/generated/SUMMARY.md` was regenerated by verify and restored because it is generated and outside this plan's scope. `plans/README.md` remains reviewer-owned.
- Limits: fixture JSON is Flow-authored, not an upstream capture. No new React Flow runtime equivalence, hosted CI, package publication, collector delivery, or native multi-pointer proof is claimed. The full verify retained two existing skipped browser cases.
