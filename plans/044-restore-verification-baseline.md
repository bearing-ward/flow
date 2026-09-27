# Plan 044: Restore the verification baseline

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- apps/foldkit/src/application.ts apps/vanilla/src/main.ts apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/graph-renderers.e2e.ts packages/conformance/src/index.test.ts packages/core/src/domain/flow-persistence.ts packages/core/src/domain/flow-persistence.test.ts scripts/bench-flow-geometry.ts scripts/check-react-flow-catalog.ts scripts/verify.ts docs/api-reference.md docs/tooling.md research/catalogs/react-flow-coverage.md research/PROGRESS.md plans/*.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P1
- Effort: M
- Risk: MED
- Depends on: none; supersedes the remaining work in 036 and unblocks acceptance of 043
- Category: dx
- Planned at: `1aa5915`, 2026-09-26
- Execution status: DONE — reviewed in isolated worktree; full `bun run verify` passed

### Execution record (2026-09-26)

- Status: DONE after review. Initially implemented and reviewed in the isolated worktree at `/Users/richardmcandrews/.codex/worktrees/flow-044-051/flow`; the scoped changes were later consolidated with Plans 045-051 on `codex/051-demonstrate-state-api-in-playgrounds` for the requested commit and merge.
- `bun run docs:generate-api`, `bun run docs:check`, `bun run check`, offline catalog checker (208 entries / 200 capabilities), `bun run typecheck`, and `bun run test` (129/129) passed. Targeted gesture/renderer tests passed (98) with two existing native skips; focused canvas tests passed (46/46). Full `bun run verify` passed with 185 browser tests and two existing native multi-pointer skips; Vue and Foldkit conformance gates passed. `git diff --check` passed; `bun.lock` was unchanged.
- Review confirmed the diff stayed within the revised scope. Native multi-pointer proof, hosted CI, package publication, and collector-side telemetry delivery remain unverified.

## Why this matters

New API work needs a passing baseline so regressions can be attributed. Lint cleanup has already landed independently; this plan repairs the remaining documented failures and puts quality checks in the main gate.

## Current state

Read-only checks at the planned commit found:

- `bun run docs:check` fails because `docs/api-reference.md` is stale.
- `bun run check` fails on formatting in `research/catalogs/react-flow-coverage.md`. Separately, `bun run lint` passes. The old Plan 036 count of 1,999 diagnostics is historical.
- `bunx tsc --noEmit` fails at the locations below. Its missing `@flow/core` output may be caused by absent package builds, so reproduce using `bun run typecheck` before assigning that error to source.

Concrete excerpts:

```ts
// apps/foldkit/src/application.ts:157, value used as a type
 toParentMessage: (message: Graph.Message) =>
// apps/vanilla/e2e/advanced-gestures.e2e.ts:333, append returns void
 globalThis.document.body.append(globalThis.document.createElement('div'))
// same file:829, drag is a function, not a locator
 await expect(drag).toHaveCount(0)
// packages/conformance/src/index.test.ts:85, old Effect Schema signature
 observed: S.Record({ key: S.String, value: S.Unknown }),
// packages/core/src/domain/flow-persistence.ts:43, boundary too narrow
 export const decodeSavedFlowDocument = (
   input: typeof SavedFlowDocumentSchema.Encoded
 ) =>
```

Other diagnostics: `graph-renderers.e2e.ts:1045,1085` reads dataset on Element; lines 1194 and 2175 widen handle literals. `main.ts:307` omits node-size in its exhaustive reducer. Persistence tests at 59, 61, 105, 167, 182 confuse optional, encoded, invalid, and decoded values. `bench-flow-geometry.ts:21` omits `storedCellEntries` supplied at 125. `scripts/verify.ts:5` has no quality-check entry. The catalog check's row regex at `scripts/check-react-flow-catalog.ts:30` requires exactly one space after the Markdown link, which must be checked against formatter padding.

## Scope

Only modify the following files or explicitly named directory subsets:

- `apps/foldkit/src/application.ts`
- `apps/vanilla/src/main.ts`
- `apps/vanilla/src/mount-flow.ts` (only the `createFlow` Promise facade)
- `apps/vanilla/e2e/canvas-ui.e2e.ts` (only the `viewportData` browser argument)
- `apps/vanilla/e2e/canvas.e2e.ts` (only Promise-facade rejection coverage)
- `apps/vanilla/e2e/advanced-gestures.e2e.ts`
- `apps/vanilla/e2e/graph-renderers.e2e.ts`
- `packages/conformance/src/index.test.ts`
- `packages/conformance/package.json`
- `packages/core/src/domain/flow-persistence.ts`
- `packages/core/src/domain/flow-persistence.test.ts`
- `packages/core/src/domain/flow-runtime.schema.test.ts` (only the three stale error-message expectations demonstrated by the baseline test output)
- `scripts/bench-flow-geometry.ts`
- `scripts/check-react-flow-catalog.ts`
- `scripts/verify.ts`
- `oxfmt.config.ts` (exclude only the generated API reference from formatting)
- `docs/api-reference.md`
- `docs/tooling.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`
- `plans/*.md`
- `bun.lock` only if Bun changes workspace metadata while resolving the internal dependency

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/044-restore-verification-baseline` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Reproduce the current failures

Run `bun run typecheck`, `bun run docs:check`, `bun run check`, and `bun run lint` separately. Record each result. Typecheck builds package outputs first. Expected initial failures are the named stale docs, formatting, and source diagnostics; lint should pass. Preserve the output and do not start a new repository-wide cleanup.

### 2. Repair source and test intent

Use `Graph.GraphMessageData` or the schema-derived exported type actually present. Create the toolbar element before appending it. Read the surrounding cancellation test and assert disappearance of its real preview locator, not the `drag` function. Narrow DOM elements correctly and type fixture objects at construction. Handle node-size with the existing domain reducer. Use the pinned Effect Record signature. Let the saved-document decoder accept `unknown`, retaining its validation. Decode positive persistence fixtures before encoding; keep malformed version tests malformed. Use explicit existence assertions with control-flow narrowing for optional fixtures. Record the benchmark metric honestly in its result type.

Do not use `as never`, broad casts, suppression comments, disabled rules, or deleted assertions to silence errors. Verify with `bun run typecheck` and `bun run test`; both must pass. Run `bun run test:browser -- advanced-gestures.e2e.ts graph-renderers.e2e.ts`; toolbar and cancellation assertions must execute, with only the existing native skips retained.

### 3. Make catalog validation survive normal formatting

Run the offline catalog checker before formatting and preserve its row count. Make Markdown row recognition tolerate cell padding without accepting unknown, duplicate, or missing URLs. Format the catalog map, changed files, `plans/README.md`, and `plans/050-prove-shared-read-contract.md`; the quality check identified those two plan files as malformed. Keep their content unchanged apart from formatting and the 044 status row. Add only `docs/api-reference.md` to Oxfmt's ignore patterns because it is generated and formatting it makes `docs:check` fail; document `docs:check` as its validation gate. Verify `bun run check` and the offline catalog checker both pass on the same tree. Do not weaken the coverage count or ignore the catalog map.

### 4. Restore and wire the complete gate

Declare `@flow/core` as `workspace:*` in the conformance package manifest so its existing public import resolves after package builds. If Bun updates `bun.lock`, keep only the corresponding workspace metadata change. Update the three stale assertions in `flow-runtime.schema.test.ts` to assert the actual validation failures without depending on a removed generic `Expected` prefix; retain each malformed input and negative assertion. Exclude generated `docs/api-reference.md` from Oxfmt while retaining `docs:check` as its freshness gate. Add `bun run check` to the checks array in `scripts/verify.ts` before expensive browser work. Update `docs/tooling.md` and `research/PROGRESS.md` to describe only observed results. Repair `viewportData` so its `key` argument is passed into the Playwright browser callback. Update `createFlow` to return a rejected Promise when synchronous mounting or decoding throws; preserve renderer-failure cleanup and verify invalid documents reject without mounting a canvas. Verify `bun run docs:check`, `bun run check`, `bun run typecheck`, `bun run test`, full `bun run verify`, and `git diff --check` pass. Reconcile 036 as superseded and 043's acceptance against this full result; retain their historical records.

## Test plan

Keep the existing negative persistence tests and verify invalid version/data still fail at runtime. Update only three stale message expectations in `flow-runtime.schema.test.ts`, preserving the decoder/reducer failure assertions. The toolbar and cancellation browser cases must assert rendered state, not just compile. Compare catalog checker output before and after formatting. Full verify is mandatory; a clean standalone tsc invocation is insufficient.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- Additional failures require files outside the revised baseline repair set, a third-party dependency upgrade, or a graph behavior redesign.
- The cancellation test's intended preview cannot be identified from its setup and current browser output.
- Catalog formatting and the offline checker cannot both pass without relaxing semantic validation.

## Maintenance notes

Future schema/export edits must regenerate API docs. Keep quality checks in verify. Do not close native-pointer Plan 037 or broaden parity claims because this gate passes.
