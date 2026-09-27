# Plan 051: Demonstrate node updates and save/restore across frameworks

> Executor instructions: Read this plan fully. Work in an isolated checkout, preserve unrelated work, and stop at the conditions below. Update this plan's status in `plans/README.md` after verification, unless a reviewer owns that index.
>
> Drift check: `git diff --stat 1aa5915..HEAD -- apps/vanilla/src/main.ts apps/vanilla/src/style.css apps/vanilla/e2e/catalog-state-examples.e2e.ts apps/vue/src/main.ts apps/vue/src/style.css apps/vue/e2e/catalog-state-examples.e2e.ts apps/foldkit/src/main.ts apps/foldkit/src/application.ts apps/foldkit/src/style.css apps/foldkit/e2e/catalog-state-examples.e2e.ts docs/examples/state-and-persistence.md research/catalogs/react-flow-coverage.md research/PROGRESS.md`. Re-read changed contracts before starting. Expected changes from listed prerequisites must match their recorded decisions; unexplained contract drift requires plan revision.

## Status

- Priority: P2
- Effort: L
- Risk: MED
- Depends on: 046, 047, 048, 049, 050
- Category: direction
- Planned at: `1aa5915`, 2026-09-26
- Execution status: DONE (2026-09-26; local gates passed)

## Why this matters

A visible example catches missing public contracts early. This slice demonstrates a bounded Updating Nodes subset and save/restore in all hosts, with an inspector showing node/edge reads and graph neighbors. It does not promise that every option of the upstream examples is already supported.

## Current state

The dated catalog includes [Updating Nodes](https://reactflow.dev/examples/nodes/update-node) and [Save and Restore](https://reactflow.dev/examples/interaction/save-and-restore). These are demonstration targets, not evidence of matching behavior. `apps/vue/src/main.ts` already replaces graph documents and toggles hidden nodes/edges. `apps/foldkit/src/main.ts:1` composes a two-node program. `apps/vanilla/src/main.ts` has multiple scenes and caller panels.

`packages/core/src/domain/flow-persistence.ts:23` persists a version-1 document envelope. It deliberately omits transient selection and host viewport state:

```ts
export const SavedFlowDocumentSchema = S.Struct({
  version: S.Literal(1),
  document: SavedDocumentBodySchema,
})
```

Plans 047-049 supply supported reads of document and viewport. Those APIs must power the demonstrations.

## Scope

Only modify the following files or explicitly named directory subsets:

- `apps/vanilla/src/main.ts`
- `apps/vanilla/src/style.css`
- `apps/vanilla/e2e/catalog-state-examples.e2e.ts`
- `apps/vue/src/main.ts`
- `apps/vue/src/style.css`
- `apps/vue/e2e/catalog-state-examples.e2e.ts`
- `apps/foldkit/src/main.ts`
- `apps/foldkit/src/application.ts`
- `apps/foldkit/src/style.css`
- `apps/foldkit/e2e/catalog-state-examples.e2e.ts`
- `apps/vanilla/e2e/playground.e2e.ts-snapshots/playground-scene-chooser-darwin.png` (the generated visual evidence for the bounded Vanilla state-tools panel)
- `docs/examples/state-and-persistence.md`
- `research/catalogs/react-flow-coverage.md`
- `research/PROGRESS.md`

The `plans/README.md` row and this plan's execution record may also change. Do not modify imported `research/artifacts/`, hand-edit `research/generated/SUMMARY.md`, upgrade dependencies, publish packages, or perform unrelated refactors. A directory scope permits only files directly needed by the steps below.

## Conventions and workflow

Follow `docs/standards.md`. Effect remains pinned to `4.0.0-rc.116`. Derive runtime data types from Schema, as in `export type Model = typeof ModelSchema.Type` in `apps/foldkit/src/graph.ts:40`. Keep graph meaning in core and browser/framework lifetime in its host. Decode external values once. Keep effectful work in Effect; use existing telemetry names for lifecycle, semantic changes, decode, and failures. Do not log pointer moves. Add no dependencies for this slice.

Use branch `codex/051-demonstrate-state-api-in-playgrounds` in an isolated worktree. Inspect status first. Do not commit, merge, push, or open a PR without explicit authorization. Keep current status in `research/PROGRESS.md`; do not revive the archived handoff. A checked checklist item requires its whole stated scope, not one new fixture.

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

### 1. Define the demonstration contract

Create `docs/examples/state-and-persistence.md` with equal user actions in all three hosts: edit a node label, toggle its hidden state, inspect nodes/edges and neighbors, save document plus viewport, make changes, restore, and reset. Call out remaining upstream example differences such as styling controls. Use an app-owned Schema envelope containing the existing saved document and viewport; keep the core version-1 format unchanged. Use session-local memory for this slice, with a visible note that reload discards it. Browser storage/export is a later integration.

Verify `bun run docs:check` passes. Record the exact subset in the catalog evidence section, leaving whole example entries partial until all documented outcomes are tested.

### 2. Build visible controls through supported APIs

Add the small example to each existing playground. JavaScript reads through its controller, Vue through its composables in a descendant component, and Foldkit through model reads and typed messages/ports. Compose existing update/decode/persistence APIs; do not scrape DOM or keep a second authoritative graph. Use labels, buttons, accessible status text, and normal framework state for the saved snapshot. Keep panels within the viewport and controls reachable at narrow widths.

Verify `bun run typecheck` and each application's build through `bun run verify`. Inspect the actual three playgrounds before declaring their visual work done. No new renderer system, graph schema fields, package extraction, or UI library belongs here.

### 3. Prove the user outcomes

Add `catalog-state-examples.e2e.ts` in each host. Exercise visible controls to edit, hide, inspect, save, change graph/viewport, restore, and reset. Assert both public read values and rendered output. Verify neighbor results after an update and that selection/preview are not restored as persisted state. Test a narrow viewport where controls remain operable and canvas tools are not covered.

Run `bun run test:browser -- catalog-state-examples.e2e.ts`, `bun run test:conformance:vue -- catalog-state-examples.e2e.ts`, and `bun run test:conformance:foldkit -- catalog-state-examples.e2e.ts` serially; all must pass. Update documentation and coverage with per-framework evidence. Finish with `bun run check` and `bun run verify`.

## Test plan

Use browser interactions with actual playground controls, not test-only setter methods. Include restoration of changed viewport and graph data, hidden node incident-edge output, missing save state, reset, and keyboard access. Capture and inspect narrow and desktop output in each host. Keep reference equivalence unverified unless separately compared with the same upstream scenario.

## Done criteria

- [ ] Every step's named verification command passes and its output is recorded.
- [ ] `bun run check` and `bun run verify` exit 0 in the executor checkout.
- [ ] `git diff --check` exits 0; `git status --short` contains only scoped edits and generated outputs named in scope.
- [ ] The execution record names changed files, tests, remaining gaps, and any reference-proof limits.
- [ ] The status row is updated only after the required evidence exists.

## STOP conditions

- Unexplained contract drift, an out-of-scope edit, or a required gate still failing after two focused repair attempts.
- An outcome requires new graph fields, renderer infrastructure, unsupported host gestures, or changing core persistence semantics.
- Foldkit needs a reusable package to achieve this app-only demonstration.
- Panels obscure essential canvas tools at a tested size; fix within scoped app layout or report the dependency.

## Maintenance notes

These examples become public API smoke tests. Keep the saved app envelope separate from the reusable document format. Future catalog work should expand explicit missing outcomes and retain runnable examples with every capability slice.

## Execution record (2026-09-26)

Changed for this plan: `apps/vanilla/src/main.ts`, `apps/vanilla/src/style.css`, `apps/vanilla/e2e/catalog-state-examples.e2e.ts`, and its generated `playground-scene-chooser-darwin.png` visual evidence; `apps/vue/src/main.ts`, `apps/vue/src/style.css`, `apps/vue/e2e/catalog-state-examples.e2e.ts`; `apps/foldkit/src/main.ts`, `apps/foldkit/src/style.css`, `apps/foldkit/e2e/catalog-state-examples.e2e.ts`; `docs/examples/state-and-persistence.md`; `research/catalogs/react-flow-coverage.md`; and `research/PROGRESS.md`. The reviewer owns the `plans/README.md` index row.

Verification: all three focused example E2Es pass 1/1. `bun run check`, `bun run typecheck`, `bun run test` (136 passed), `bun run docs:generate-api`, `bun run docs:check`, `bun run scripts/check-react-flow-catalog.ts` (208 entries / 200 capabilities), `git diff --check`, and final `bun run verify` pass. Final verifier reports 191 Vanilla browser tests passed and two existing native-pointer skips, 12 Vue conformance tests passed, and 10 Foldkit conformance tests passed.

Visual inspection: the six desktop/narrow screenshots named in the Plan 051 `research/PROGRESS.md` entry were inspected locally; the Vanilla scene-chooser baseline is the one checked-in generated screenshot and the other captures are temporary. The Vanilla state panel scrolls within 280px above Transform; the Vue panel leaves the output handle clear. Foldkit demo edges omit labels because this host currently has no edge-label placement. The examples do not establish parity with the upstream pages, hosted CI, publication, collector delivery, or native multi-pointer behavior.
