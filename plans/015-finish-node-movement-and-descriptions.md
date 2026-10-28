# Plan 015: Finish node movement edges and custom descriptions

> **Executor:** Work in an isolated worktree. Read `research/PROGRESS.md`, `research/traces/gesture-resize-lifecycle.md`, `research/traces/selection-auto-pan.md`, and `docs/architecture.md`. **Drift check first:** `git diff --stat 6e84008..HEAD -- packages/core/src/domain/flow.schema.ts packages/core/src/domain/flow-runtime.schema.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/flow-browser.ts apps/vanilla/e2e/advanced-gestures.e2e.ts research/PROGRESS.md`. Reconcile Plan 013/014 changes before editing; STOP on incompatible gesture or size ownership.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 013, 014
- **Category:** feature, accessibility; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`research/PROGRESS.md:105,110,119` leaves node locking, auto-pan during node drag or keyboard move, and custom descriptions open. The host already supports selection auto-pan, but `research/traces/gesture-resize-lifecycle.md:11-21` shows that is separate from node movement. `FlowNodeSchema` at `packages/core/src/domain/flow.schema.ts:56-75` has `selectable`, `focusable`, and `ariaLabel`, but no `draggable` or description field. Node pointer handling at `apps/vanilla/src/mount-flow.ts:1872-1960` previews local/absolute movement; keyboard arrows are handled at lines 3124-3205. `FlowBrowserService` at `apps/vanilla/src/flow-browser.ts:19-44` scopes listeners, resize observation, and capture, but has no animation-frame or focus capability. Do not put DOM nodes, frames, or focus state into core. This plan follows the gesture state established by 013 and preserves controlled/uncontrolled change semantics.

```ts
// packages/core/src/domain/flow.schema.ts:70-74
selected: S.optional(S.Boolean),
selectable: S.optional(S.Boolean),
focusable: S.optional(S.Boolean),
ariaLabel: S.optional(S.NonEmptyString),
hidden: S.optional(S.Boolean),
```

## Scope and gates

Only edit `packages/core/src/domain/flow.schema.ts`, `packages/core/src/domain/flow-runtime.schema.ts`, `packages/core/src/domain/flow.schema.test.ts`, `packages/core/src/domain/flow-runtime.schema.test.ts`, `packages/core/src/domain/flow-persistence.test.ts`, `packages/core/src/public.ts`, `apps/vanilla/src/flow-browser.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/style.css`, `apps/vanilla/e2e/advanced-gestures.e2e.ts`, `apps/vanilla/e2e/node-movement.e2e.ts`, `research/traces/gesture-resize-lifecycle.md`, `research/traces/keyboard-node-movement.md`, `research/traces/node-dragging.md`, `research/PROGRESS.md`, generated summary via inventory, and index row. No framework adapter or new dependency. Use branch `codex/015-node-movement` if needed; no commit, push, merge, or PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Core | `bunx vitest run packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-runtime.schema.test.ts` | exit 0 |
| Browser | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/node-movement.e2e.ts` | exit 0 |
| Complete | `bun run verify` | exit 0 |

## Steps

1. Add schema-derived optional `draggable` (default true in host behavior) and `ariaDescription` (nonempty string) fields to `FlowNode`; include only declared values in saved documents. A locked node remains selectable and focusable but pointer and keyboard position commands must not move it. Define group movement when one member is locked: omit locked members from the movement set while preserving movable-member spacing. Add exact core cases for single and mixed groups. **Verify:** core gate passes.
2. Add scoped animation-frame and focus operations to `FlowBrowserService`. Use the frame capability for node drag edge-of-pane auto-pan. Move the viewport through existing `panViewport`/extent clamping; recompute the drag preview from the current viewport so the pointer remains attached to the node. Stop the loop on completion and every cancellation route, including removal and destroy. For keyboard movement, pan just enough to reveal the focused moved node after its final position is known; do not start a persistent frame loop. **Verify:** browser gate proves viewport delta, node position, edge endpoint, zoom/extent bounds, and no movement after cancel in controlled and uncontrolled modes.
3. Render the declared description through `aria-description` or a stable `aria-describedby` element according to browser support; keep default accessible name from `ariaLabel`/label. Test the computed accessible description with Playwright, including after keyed update and removal. **Verify:** browser gate passes.
4. Update the relevant traces with exact call paths and conformity limits. Check only fully verified checklist items 105, 110, 119, and 169; leave broader input/accessibility and budget items open. Regenerate summary via inventory if changed. **Verify:** `bun run research:check-traces`, full gate, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Locked single/mixed-group nodes never emit a position change for a locked id.
- [ ] Auto-pan updates viewport and visible node location at zoom 1/2, honors extents, and stops after Escape, blur, removal, or destroy.
- [ ] Keyboard move reveals the focused node without a persistent frame.
- [ ] Declared descriptions are accessible and survive keyed update.
- [ ] `bun run verify` passes; only in-scope files changed; checklist changes match complete tests.

## STOP and maintenance

STOP if a locked node must prevent movement of the entire group rather than just itself, if browser support requires a different description contract, or if controlled viewport updates cannot keep drag preview stable. Record the observed case and request a contract decision. Future gesture modes must use the same frame/focus capability and cleanup semantics; pointer-move telemetry remains disabled.
