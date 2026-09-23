# Plan 019: Build a Foldkit adapter against the shared contract

> **Executor:** Use an isolated worktree. Read `docs/standards.md`,
> `docs/architecture.md`, `research/PROGRESS.md`, Plan 016's final shared
> runner, and Plan 017's built package exports. **Drift check first:**
> `git diff --stat 6e84008..HEAD -- packages/core/src/public.ts packages/conformance apps/vanilla/src/public.ts apps/vanilla/e2e/shared-conformance.e2e.ts research/PROGRESS.md`. Plans 016-018 are intended to change these paths; compare their final contracts before starting and STOP if shared conformance is not runnable on vanilla.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** HIGH; **Depends on:** 016-018
- **Category:** feature, adapter; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`research/PROGRESS.md:190-197` lists Foldkit scaffolding, schema-derived
Model/Message/OutMessage, init/update/view, commands/subscriptions, typed child
capabilities, and the shared suite. No `apps/foldkit` exists at this commit
(`rg --files apps` shows only `apps/vanilla`). `docs/standards.md:5-16` fixes
the boundary: packages own graph meaning and Effect contracts; apps own
framework lifecycle. `packages/core/src/public.ts:1-17,46-91` already exports
the document, change, viewport, and command schemas/types. Vanilla's
`FlowController` at `apps/vanilla/src/mount-flow.ts:190-197` provides the
observable operations a second host must match. The runner introduced by Plan
016 supplies the actual acceptance contract; do not copy vanilla DOM code.

```ts
// apps/vanilla/src/mount-flow.ts:190-197
export interface FlowController {
  readonly fitView: (options?: FitViewOptions) => boolean;
  readonly update: (document: FlowDocument) => void;
  readonly updateViewport: (viewport: Viewport) => void;
  readonly dispatch: (command: FlowCommand) => void;
  readonly subscribe: (listener: (change: FlowChange) => void) => () => void;
  readonly destroy: () => void;
}
```

## Scope and gates

Only create/edit `apps/foldkit/` and its package manifest, demo, and browser
driver; update root `package.json`/lockfile for one pinned Foldkit dependency;
edit `scripts/verify.ts` to include the adapter suite and use an adapter-local
Playwright configuration/dev server under `apps/foldkit/`;
edit `docs/dependencies.md`, `docs/architecture.md`, shared conformance
registration under `packages/conformance/` or `apps/foldkit/e2e/`,
`research/PROGRESS.md`, generated summary via inventory, and index row. Do not
change core graph schemas, copy the vanilla renderer, or edit sibling repos.
Use a `codex/019-foldkit-adapter` branch if needed. Do not commit, push,
merge, or open a PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| App typecheck/build | `bun run --cwd apps/foldkit build` | exit 0; mounted demo bundle |
| Shared suite | `bun run test:conformance:foldkit` | exit 0; same fixtures as vanilla |
| Complete | `bun run verify` | exit 0 after Foldkit suite is wired |

## Steps

1. Inspect the exact Foldkit version available at execution time and pin it.
   Record owner, purpose, alternatives, and removal boundary in
   `docs/dependencies.md`; do not guess APIs from old examples. Create
   `apps/foldkit` with a one-canvas demo and build script. Model
   `Model`, `Message`, and `OutMessage` from the current core Schemas or
   schema-derived types. Keep the authoritative `FlowDocument` separate from
   session viewport/selection/gesture state and DOM measurements. **Verify:**
   app build succeeds with no type assertions used to bypass model mismatch.
2. Implement init/update/view for one root and two keyed nodes, plus document
   update, viewport update, semantic change output, command dispatch, and
   unmount. Browser effects must be scoped commands/subscriptions. Child
   update capabilities are typed and limited to the child boundary; avoid a
   global mutable controller disguised as a Foldkit model. **Verify:** a
   Foldkit browser smoke test shows two nodes, a keyed update preserving
   identity, an emitted change, and clean unmount.
3. Implement the Plan 016 conformance driver for Foldkit and run the same
   fixture definitions used by vanilla. Add only host-specific selectors and
   event dispatch, not alternate expected results. Give the adapter its own
   Playwright server/configuration and wire the suite into root verification;
   do not rely on the vanilla-only `playwright.config.ts` test directory.
   Record intentional
   differences with reason and test boundary. **Verify:** shared-suite gate
   exits 0. If any fixture needs a core contract change, STOP rather than
   editing core here.
4. Update only fully proved PROGRESS Foldkit items 192-197; item 197 requires
   the full shared suite, not just smoke. Regenerate summary through inventory.
   **Verify:** `bun run verify` and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Build and browser smoke prove init/update/view, keyed identity, semantic
  output, command/subscription cleanup, and unmount.
- [ ] Foldkit runs every shared fixture with the same expected outputs as
  vanilla; failures are reported by fixture name.
- [ ] Exact Foldkit version and dependency rationale are recorded; no graph
  semantics or saved-document format were forked.
- [ ] `bun run verify` passes; only scoped files changed.

## STOP and maintenance

STOP if the chosen Foldkit version cannot express typed Model/Message/OutMessage
or scoped effects, if a shared fixture needs a host-specific expected result
without an intentional-deviation record, or if the adapter requires new core
behavior. Report the exact unsupported API/fixture. Future conformance
fixtures must run on Foldkit before marking a cross-adapter item complete.
