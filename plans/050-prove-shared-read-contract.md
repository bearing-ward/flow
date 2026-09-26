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
- Execution status: TODO

## Why this matters

A common fixture set will prevent the new getters and framework bindings from drifting. Cross-host agreement proves the Flow contract; upstream conformity requires a separately identified reference comparison.

## Current state

`packages/conformance/src/index.ts:1-80` defines encoded fixture documents, actions, rendered snapshots, and ConformanceAdapter. The existing adapter contract includes:

```ts
snapshot: () => Promise<ConformanceSnapshot>
changeKinds: () => Promise<readonly string[]>
destroy: () => Promise<{
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

Add a versioned shared read-contract fixture set with Schema-derived input and expected-output data. Keep the existing eight rendering cases. Extend the adapter with public state/query observation and accepted-state sequences. Preserve tests for controlled proposals and DOM snapshots as separate channels. Normalization may remove framework scheduling details, but must preserve values and acceptance order.

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

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Making the suite pass requires modifying production behavior outside the listed drivers/harnesses; return that defect to the responsible implementation plan.
- A host cannot expose the real public contract and a shadow test store is proposed.
- The reference capture lacks equivalent inputs or a reproducible revision.

## Maintenance notes

Future adapters must implement this driver contract and run the same fixtures. Add cases when public ownership or state read semantics change. Keep Flow conformance and React Flow reference proof separate.
