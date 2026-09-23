# Plan 020: Build a Vue adapter against the shared contract

> **Executor:** Use an isolated worktree. Read `docs/standards.md`,
> `docs/architecture.md`, `research/PROGRESS.md`, the final shared suite from
> Plan 016, and the packed core exports from Plan 017. **Drift check first:**
> `git diff --stat 6e84008..HEAD -- packages/core/src/public.ts packages/conformance apps/foldkit apps/vanilla/src/public.ts research/PROGRESS.md`. Re-read the final contracts after earlier plans; STOP if the shared runner is not passing on vanilla and Foldkit.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** HIGH; **Depends on:** 016-019
- **Category:** feature, adapter; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`research/PROGRESS.md:199-208` lists a Vue host, components and injection,
bindings, typed composables, custom components, shallow keyed updates, unmount
disposal, and the shared suite. No `apps/vue` exists at this commit. The core
already exports schema-derived `FlowDocument`, `FlowChange`, `FlowCommand`,
and `Viewport` types (`packages/core/src/public.ts:31-44,171-194`). Vanilla
demonstrates the public observable controller at
`apps/vanilla/src/mount-flow.ts:190-197`, but its DOM, pointer capture, and
renderer lifetime belong to that host. Vue must translate the same graph
contract into its own component and reactive lifetime, not wrap a hidden
vanilla canvas.

```ts
// packages/core/src/public.ts:171-180 (excerpt)
export type {
  ActiveNodeDrag,
  ActiveNodeGroupDrag,
  ActiveViewportPan,
  ActivePinch,
  ActiveSelectionRect,
  FlowChange,
  FlowCommand,
  FlowControlMode,
  MeasuredNode,
} from "./domain/flow-runtime.schema.ts";
```

## Scope and gates

Only create/edit `apps/vue/` with manifest, components, composables, demo, and
browser driver; update root `package.json`/lockfile for one pinned Vue version;
edit `scripts/verify.ts` to include the Vue suite and use an adapter-local
Playwright configuration/dev server under `apps/vue/`;
edit `docs/dependencies.md`, `docs/architecture.md`, shared conformance
registration, `research/PROGRESS.md`, generated summary via inventory, and
index row. Do not edit core graph schemas or use a vanilla DOM renderer under
Vue. Use `codex/020-vue-adapter` if needed; no commit/push/merge/PR without
operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| App build | `bun run --cwd apps/vue build` | exit 0 |
| Shared suite | `bun run test:conformance:vue` | exit 0; same fixture definitions |
| Complete | `bun run verify` | exit 0 after Vue suite is wired |

## Steps

1. Pin the current Vue version and record dependency rationale and removal
   boundary. Create a `FlowCanvas` component with a typed injection key for
   one editor instance; provide a composable for read-only state and typed
   actions. Keep caller document ownership and viewport ownership explicit,
   using the same controlled/uncontrolled semantics already exercised by the
   shared suite. **Verify:** app build and a two-node smoke test pass.
2. Render nodes and edges with stable keys from schema ids. Expose typed
   model bindings for nodes/edges/viewport and slots/components for custom
   node and edge visuals. Keep updates shallow enough that changing one node
   does not recreate unrelated node components; measure via mount/unmount
   counters in the demo test. Scope DOM listeners, observers, watchers, and
   subscriptions to component unmount. **Verify:** browser smoke tests prove
   keyed preservation, custom visual update, and zero retained host DOM after
   unmount.
3. Implement the Plan 016 conformance driver for Vue and run every shared
   fixture. Reuse expected outputs; record any intentional difference with
   reason and test boundary rather than weakening the suite. Give Vue its own
   Playwright server/configuration and wire it into root verification; the
   current root Playwright config searches only vanilla tests. **Verify:**
   `bun run test:conformance:vue` exits 0 and the vanilla/Foldkit suites still
   pass.
4. Check only completed PROGRESS Vue items 201-208 and regenerate summary.
   **Verify:** `bun run verify` and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Vue smoke tests cover injection isolation for two canvases, keyed update,
  controlled binding, custom component update, and unmount disposal.
- [ ] Vue executes all shared fixtures with the same expected event and DOM
  contracts; no hidden vanilla host is used.
- [ ] Version/dependency rationale is recorded; full gate passes; only scoped
  files changed.

## STOP and maintenance

STOP if Vue bindings produce an ownership ambiguity not represented by the
current contract, if unrelated keyed components remount on a one-node update,
or if a fixture requires changing core meaning. Report the smallest failing
scenario. Future shared fixtures must run on all three hosts before claiming
adapter conformance.
