# Plan 005: Clean up a host when its initial renderer mount fails

> **Executor instructions:** Read every section; perform the drift check, steps, and gates in order. Update only this row in `plans/README.md` after success. **Drift check first:** `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/graph-renderers.e2e.ts`; compare changed paths with the excerpts and stop if mount ownership has changed.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Category:** bug
- **Depends on:** Plan 001 (DONE)
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

`mountFlow` can invoke caller supplied renderers before it returns a controller. If one throws during initial reconciliation, the caller has no controller to destroy. The host has already replaced the root content and acquired observer/listener resources, while its main cleanup finalizer is registered only after reconciliation.

## Current state

- `apps/vanilla/src/mount-flow.ts:340-347` creates `hostScope` inside `createFlowHost`; `:564-615` acquires the resize observer in that scope. Node entries acquire their own listener scopes at `:2078-2117`.
- `:1788-1790` calls `options.nodeRenderers?.[type]` during entry creation. `:3306-3319` appends canvas, replaces root, reconciles, **then** adds the finalizer that clears entries, destroys edges, clears subscribers, and empties root.
- `:3522-3531` calls the host Effect synchronously and only returns a controller after success. `apps/vanilla/e2e/graph-renderers.e2e.ts:53` contains a reusable custom renderer mount pattern.
- `docs/architecture.md:91` assigns renderer lifecycle and teardown to the vanilla host. Preserve Effect scope ownership and `FlowSpan` lifecycle telemetry; do not silently swallow the original renderer error.

```ts
// apps/vanilla/src/mount-flow.ts:3306-3313
canvas.append(viewport, connectionStatus)
root.replaceChildren(canvas)
authoritativeViewport = constrainViewport(authoritativeViewport)
renderViewport(authoritativeViewport)
operations.reconcile(document)
yield *
  Scope.addFinalizer(
    hostScope,
    Effect.sync(() => {
      /* cleanup */
    })
  )
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Typecheck | `bun run typecheck` | Exit 0 |
| Focused browser test | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, and this plan's index row. Do not change public renderer signatures, core schemas, or error meaning. Use `codex/005-mount-cleanup` if isolated; no commit/push/PR without instruction.

## Steps

1. Add a browser case where a custom node renderer throws on first mount. Catch the thrown error at the public `mountFlow` call, then assert no canvas/edge nodes remain, no renderer/listener callbacks fire on a later event, and a subsequent normal mount into the same root succeeds. Include a case where a later node renderer throws after an earlier renderer returned an instance; assert its `destroy` runs once. Add an initial custom edge-renderer failure case if it reaches the same mount path. **Verify:** focused browser command → cleanup assertions fail on old host.
2. Register a finalizer before any renderer callback can run, and ensure failure of initial reconciliation closes `hostScope` exactly once while rethrowing the original failure. Put the synchronous reconciliation in an Effect boundary so thrown defects enter an `Exit`; use `Effect.onExit`/`Exit.isFailure` or an equivalent pinned-Effect pattern to close the detached host scope on failure. Make cleanup release every registered entry through its `release()` method, destroy edge renderer state, and clear root/subscribers. Do not let cleanup exceptions replace the primary failure without reporting them. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Check ordinary `destroy()` remains idempotent and does not double-call renderer destruction. **Verify:** focused browser command and `bun run verify` → all stages pass.

## Test plan and done criteria

- Use the renderer lifecycle recorder in `graph-renderers.e2e.ts:53-110` and public `mountFlow` entry; do not test only the internal `createFlowHost` helper.
- [ ] Initial renderer failure leaves no mounted canvas, observed node, or live listener and preserves the renderer error.
- [ ] Already acquired renderer instances receive one destroy call; a later mount succeeds; normal destroy remains idempotent.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if `Scope.make` has become tied to an enclosing managed scope, if a failing renderer now returns a usable controller, if cleanup requires a public API change, or if a gate fails twice. Future renderer hooks must be registered only after cleanup ownership is established.
