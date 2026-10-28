# Plan 007: Cancel active gestures on Escape, blur, and pointer capture loss

> **Executor instructions:** Read this plan fully and run gates after each step. Update only this row in `plans/README.md` after the full gate. **Drift check first:** `git diff --stat e393e3e..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/src/flow-browser.ts apps/vanilla/e2e/advanced-gestures.e2e.ts`. Compare the cancellation functions and listener ownership below; stop if the gesture model has changed.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Category:** bug
- **Depends on:** Plans 004 and 005, which establish group-drag and mount cleanup behavior
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

The host has cancellation helpers for most gestures, but Escape currently cancels only a pending click connection. Browser blur and lost pointer capture have no host handlers. A gesture can retain transient preview or state after the browser stops delivering the pointer stream. This is also an explicit gap in `research/PROGRESS.md:133`.

## Current state

- `apps/vanilla/src/mount-flow.ts:870-1009` has connection, click-connection, and reconnection cancellation. `:1169-1247` has node-drag and viewport-pan cancellation. `:2126-2141` clears a selection rectangle; `:2501-2526` cancels pinch.
- `:2528-2555` handles `pointercancel` on canvas. `:3037-3043` handles Escape only when `activeClickConnection` exists. `:3261-3303` registers canvas listeners but no blur or `lostpointercapture` path.
- `apps/vanilla/src/flow-browser.ts:19-26,45-54` provides scoped HTMLElement listeners through `Effect.acquireRelease`. Use that resource pattern for any window/document event listener; do not add unscoped globals.
- `apps/vanilla/e2e/canvas.e2e.ts:507` shows real reconnection preview and pointer-cancel assertions; `advanced-gestures.e2e.ts:378` exercises Escape. `docs/standards.md:7-16` assigns lifecycle to apps and requires structured cancellation telemetry.

```ts
// apps/vanilla/src/mount-flow.ts:3037-3043
if (event.key === 'Escape' && activeClickConnection !== null) {
  event.preventDefault()
  cancelClickConnection('escape')
  return
}
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Focused browser tests | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts` | All cases pass |
| Typecheck | `bun run typecheck` | Exit 0 |
| Complete gate | `bun run verify` | All stages pass |

Modify only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/flow-browser.ts` if scoped global-listener typing needs it, `apps/vanilla/e2e/advanced-gestures.e2e.ts`, and this plan's index row. Do not add touch connection, resize, or drag auto-pan features here. Do not change core gesture schemas or semantic change payloads. Use `codex/007-gesture-cancellation` if isolated; no commit/push/PR without instruction.

## Steps

1. Add browser characterization for active node drag, connection/reconnection, pane pan or pinch, and selection rectangle: start the gesture, deliver Escape, window blur, or `lostpointercapture` as appropriate, then verify preview/classes reset, authoritative document/viewport remains, and pointer release emits no final semantic change. Verify ordinary focus movement inside the canvas does not cancel. **Verify:** focused browser command → at least one new lifecycle case fails on old host; existing cases pass.
2. Centralize a host-level `cancelActiveGestures(reason)` operation that calls existing per-gesture cancellation helpers and clears rectangle/touch bookkeeping. Handle Escape at the canvas even if a different gesture is active. Register blur and lost-capture handlers through the scoped browser capability; if `FlowBrowserService.listen` must cover Window/Document, extend it with accurate typed overloads rather than raw DOM listeners. On window blur, avoid refocusing a click-connection source and stealing focus back from the newly active window. Preserve idempotent repeated cancellation and the `FlowSpan.gestureCancel` attributes. **Verify:** focused browser command → all cases pass; `bun run typecheck` → exit 0.
3. Test destroy and removal paths together with the new cancellation handlers to avoid duplicate release/destroy actions. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Tests must use real `mountFlow` and browser events. The existing pointer-cancel test in `canvas.e2e.ts:504-540` is the structural example.
- [ ] Escape cancels every active pointer gesture and the pending click connection without publishing a completed change.
- [ ] Blur and lost capture clear active preview/state and restore authoritative values; repeated cancellation and destroy are safe.
- [ ] Scoped listeners are released after destroy, and focus shifts within the host do not cancel a gesture.
- [ ] Focused browser, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the browser events cannot be exercised reliably in Playwright, if global listener acquisition cannot be expressed with the existing Effect scope model, if an event must be treated as gesture completion to preserve an existing contract, or if another file must change. Future touch and resize gestures should register with the same cancellation boundary.
