# Plan 032: Preserve native keyboard activation in custom nodes

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, Plans 027, 029, and 031, and this whole plan. Plan 032 is a host keyboard-routing fix. Do not change the graph schema or pointer gesture ownership. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** inspect `apps/vanilla/src/mount-flow.ts:3958-4165,4338-4348`, `apps/vanilla/e2e/graph-renderers.e2e.ts:143`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:653`, and the Plan 029 browser failure. STOP if the host event path or resize key ownership changed.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** MED; **Depends on:** 027, 031
- **Category:** accessibility, interaction; **Planned at:** `5e5d496`, 2026-09-24
- **Execution:** IN PROGRESS — accepted scope; host keyboard routing and regression coverage are underway.

## Why this matters

The node keyboard handler treats a focused native control inside a custom renderer as if the node itself received its keys. It applies graph shortcuts to the enclosing node and can suppress native activation. Plan 029's browser run reproduced the Enter case with a focused `button[data-flow-no-drag]` inside a custom node renderer.

## Current event path

- The vanilla host registers `onCanvasKeyDown` on the canvas element (`apps/vanilla/src/mount-flow.ts:3958-3966,4346`). Keyboard events from descendants bubble to this listener.
- The handler gives `.flow-node-resize-handle` arrow keys a dedicated path first (`apps/vanilla/src/mount-flow.ts:3967-4000`). Preserve that path and its propagation rules.
- For other targets, the handler finds the closest `.flow-node`, then applies arrow movement and Enter/Space selection (`apps/vanilla/src/mount-flow.ts:4046-4069,4080-4112,4147-4159`). It does not distinguish the node wrapper from a focused interactive renderer descendant.
- Custom renderer content and drag markers live inside `.flow-node-content`; pointer behavior treats `[data-flow-no-drag]` as a drag exclusion (`apps/vanilla/src/mount-flow.ts:2595-2609`). That marker does not currently change keyboard routing.
- `custom drag handle gates pointer movement and keeps its visual state stable` covers a mouse drag marker and a keyboard action. It currently fails when Enter does not activate the focused button (`apps/vanilla/e2e/graph-renderers.e2e.ts:143`).
- `keyboard resize ...` cases prove direction-specific arrow handling and focus retention for resize controls (`apps/vanilla/e2e/advanced-gestures.e2e.ts:653`).

## Proposed keyboard contract

Recognize focused native interactive descendants inside `.flow-node-content` before the general node keyboard branch. Support `button`, `a[href]`, `input`, `select`, `textarea`, and editing hosts for which `Element.isContentEditable` is true. Use the DOM property so inherited `contenteditable` state works for descendants without an explicit attribute. Do not emulate keyboard behavior for custom `div[role=button]` widgets in this plan.

When any key targets one of those descendants, let the control handle its keys. This includes typing, arrow keys, Escape, Enter, and Space. The canvas handler must not call `preventDefault()`, move the enclosing node, change its selection, or move focus to the node. Return from the host handler without stopping propagation or preventing the browser default.

Apply the same rule when the descendant also has `data-flow-no-drag`, including when nested inside a `data-flow-drag-handle`. That marker continues to affect pointer drag initiation only. Native keyboard activation must fire once and keep focus on the control.

Keep the existing global Escape cancellation check first. If Escape reaches the canvas while a Flow gesture is active, cancel that gesture and preserve the current `preventDefault()` behavior, even when focus is inside an editor. Next keep the `.flow-node-resize-handle` branch ahead of the general descendant rule, including its arrow `preventDefault()` and `stopPropagation()` behavior. Then route native interactive descendants away from general node keyboard handling. When no Flow gesture is active, controls and editable descendants own Escape and all other keys. Enter and Space on a resize button must not select or move the node. Arrow keys on resize buttons must continue to resize through Plan 031's host-owned session. Arrow keys on the node wrapper must continue to move the selected node group.

Do not change pointer capture, pointer sessions, graph document state, or renderer lifecycle. An inner control's native action must not emit a Flow change unless the control's own callback explicitly calls the host API. Verify the keyboard behavior in both controlled and uncontrolled modes.

## Scope and verification

**In scope:** `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/graph-renderers.e2e.ts`, `apps/vanilla/e2e/node-movement.e2e.ts` or `apps/vanilla/e2e/advanced-gestures.e2e.ts` for regressions, and `docs/guides/custom-nodes-and-edges.md` or `docs/browser-and-accessibility.md` if needed.

**Out of scope:** core schemas, persisted graph data, pointer drag/resize session semantics, custom ARIA widget emulation, framework adapters, and broad keyboard shortcut redesign.

| Purpose | Command | Expected |
| --- | --- | --- |
| Renderer and keyboard regressions | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts apps/vanilla/e2e/node-movement.e2e.ts apps/vanilla/e2e/advanced-gestures.e2e.ts --workers=1` | exit 0; only the two documented native pointer skips remain |
| Full gate | `bun run verify` | exit 0 |
| Whitespace | `git diff --check` | exit 0 |

1. Preserve global active-gesture Escape handling and the resize-button branch. Route keys from supported native descendants around general node key handling only after those branches.
2. Add a representative browser matrix:

   | Target | Keys | Expected result |
   | --- | --- | --- |
   | Renderer button and nested no-drag button inside a drag handle | Enter, Space | One native click per key press; focus stays on the button; no graph change |
   | Renderer link | Enter | Native link activation; no node selection or movement |
   | Renderer input and textarea | Text, arrows, Escape | Text editing and caret movement work; node remains selected and stationary |
   | Renderer select | Arrow keys, Escape | Native selection behavior; node remains selected and stationary |
   | Inherited contenteditable descendant | Text, arrows, Escape | Editor owns input; node remains selected and stationary |
   | Interactive descendant during active Flow gesture | Escape | Flow cancels the active gesture first; no semantic completion |
   | Focused node wrapper | Arrow key | Selected group moves as Plan 027 specifies |
   | Resize button | Direction arrow, Enter, Space | Direction arrow resizes; Enter and Space do not move/select the node |

3. Run native activation/state assertions in controlled and uncontrolled document modes. Count actual click events for Enter and Space separately. Assert focus, node positions, selected state, and emitted Flow changes. Keep the node-wrapper and resize-button keyboard regressions in the focused suite.
4. Run the focused browser suite, `bun run verify`, and `git diff --check` sequentially. After Plan 032 is reviewed and its regressions pass, mark Plan 029 IN PROGRESS and resume its remaining proof. Plan 029 stays incomplete until its own acceptance criteria and review pass.

## Done criteria

- [ ] The supported native descendants own all keys, except global Escape cancellation for an active Flow gesture and the resize-button branch.
- [ ] Enter and Space activate renderer buttons exactly once each, with actual click counts asserted.
- [ ] `data-flow-no-drag` does not prevent keyboard activation, including beneath a marked drag handle.
- [ ] Typing, arrows, and Escape on inputs, selects, textareas, and inherited contenteditable descendants preserve focus, graph position, selection, and Flow change count.
- [ ] Escape still cancels an active Flow gesture while focus is inside a native editor.
- [ ] Selected-node arrow movement and all eight resize-control keyboard paths retain their Plan 031 behavior.
- [ ] Controlled and uncontrolled hosts pass the same native activation assertions.
- [ ] Focused tests, full `bun run verify`, and `git diff --check` pass.

## STOP conditions

STOP if native activation cannot be preserved without changing the public renderer contract, graph schema, pointer session ownership, or Plan 031 keyboard resize behavior. Report the exact browser event sequence and test output. Do not replace native activation with a synthetic click or weaken the keyboard assertion.

## Maintenance notes

The host should consume only keyboard input that belongs to graph behavior. Native controls inside custom renderers own their native keys and focus.
