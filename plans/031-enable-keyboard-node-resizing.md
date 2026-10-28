# Plan 031: Enable keyboard resizing for directional controls

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, Plans 024–030, and this whole plan. Plan 031 unblocks Plan 029's keyboard-only proof. Update only this plan's index row after review and verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/src/canvas-ui.ts apps/vanilla/e2e/advanced-gestures.e2e.ts packages/core/src/domain/flow-runtime.schema.ts docs/guides/gestures.md docs/browser-and-accessibility.md`; inspect the live resize event path and node keyboard movement tests. STOP if resize ownership or atomic bounds semantics changed from Plans 024–025.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Depends on:** 024–026, 030
- **Category:** accessibility, interaction; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

Plan 025 added eight named, focusable resize buttons, but they only start a resize from pointer input. Arrow keys bubble to the canvas node handler and move the selected node instead. Plan 029 requires keyboard-only proof for the new controls, so its acceptance cannot be completed until resize controls have a defined keyboard interaction.

## Current call path and gap

- `apps/vanilla/src/mount-flow.ts:457-472` renders the eight native buttons with direction-specific `data-direction` and accessible names.
- `apps/vanilla/src/mount-flow.ts:2289-2312` calculates a bounded atomic candidate, compensates child-local positions, previews the node and incident edges, and refreshes culling/derived UI.
- `apps/vanilla/src/mount-flow.ts:2330-2378` starts pointer resize sessions and captures the pointer. There is no key handler on resize controls.
- `apps/vanilla/src/mount-flow.ts:3763+` handles Escape cancellation and selected-node arrow movement, but does not distinguish a focused resize control. A focused resize button can therefore fall through to node movement.
- `apps/vanilla/src/mount-flow.ts:1535-1578` restores pointer-resize preview on cancellation. Keyboard resize must preserve the same geometry and semantic guarantees without inventing a pointer id.
- Core already provides the pure `calculateNodeResize` geometry and atomic `node-bounds` application (`packages/core/src/domain/flow-runtime.schema.ts`); do not change the document schema or saved format.
- Pointer geometry and cancellation coverage lives in `apps/vanilla/e2e/advanced-gestures.e2e.ts:653`; selected-node keyboard movement lives in `apps/vanilla/e2e/node-movement.e2e.ts`.

## Proposed keyboard contract

Focus a directional resize button and press an arrow key along one of its named edges. The arrow sign is relative to the edge's outward normal: Up moves a top edge outward and Down moves it inward; Down moves a bottom edge outward and Up moves it inward; Left moves a left edge outward and Right moves it inward; Right moves a right edge outward and Left moves it inward. A corner applies the corresponding rule independently on both axes, so a top-left control responds to Up/Left outward and Down/Right inward. Each repeated keydown for the initiating arrow previews another 5-flow-unit step, or 20 units if Shift was held when that gesture began. The first supported arrow keydown owns the gesture through its matching keyup; other arrows and Shift changes during that hold are ignored until keyup. This avoids ambiguous simultaneous-axis and changing-step semantics. Clamp, declared bounds, parent extent, and direct-child world-position compensation reuse the existing core calculation.

The host previews transient node, child, edge, culling, and derived UI geometry while the key is held. On the initiating arrow's keyup, it emits at most one atomic `node-bounds` change. In uncontrolled mode it adopts the candidate. In controlled mode it immediately restores the authoritative document geometry after publishing, then waits for a parent update: a matching update acknowledges and adopts the whole candidate, including compensated child positions; a delayed update leaves the authoritative geometry visible until it arrives; if no acknowledgement arrives, the candidate is not adopted. Tests must prove both delayed and absent acknowledgement behavior and that child compensation follows the same acknowledgement boundary.

Cancel without publishing on Escape, window blur, destroy, owner removal from the document, owner becoming hidden in the document, or owner deselection that removes its resize controls. Owner removal/hidden state refers to document state, not viewport culling: ordinary culling must not cancel the active keyboard gesture. On cancellation, restore authoritative owner and child geometry. If the initiating resize button remains connected, keep focus there; if it was removed but the canvas root remains connected, move focus to the canvas root; if neither is connected, do not force focus elsewhere. A fresh key gesture must work after commit or cancellation. Keyboard resize and pointer resize cannot own the same node concurrently; keyboard events targeting a resize button must not fall through to selected-node movement.

## Scope and verification

**In scope:** `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/advanced-gestures.e2e.ts`, `apps/vanilla/e2e/node-movement.e2e.ts` only if required to protect arrow movement, `docs/guides/gestures.md`, `docs/browser-and-accessibility.md`, and generated API docs only if public API descriptions change.

**Out of scope:** core document/session schema changes, pointer-resize redesign, Vue/Foldkit support, a full WCAG or screen-reader audit, mobile-device certification, broad keyboard shortcut redesign.

1. Add a host-owned keyboard resize session that does not impersonate a pointer session. Reuse the existing core resize calculation and bounds-change path for preview, controlled acknowledgement, and completion. **Verify:** typecheck and existing pointer/keyboard movement suites pass unchanged.
2. Handle the specified edge signs, single initiating-arrow ownership through matching keyup, captured Shift step, Escape, and focus fallback. Cancel on blur, destroy, owner removal/hidden state, or deselection; keep viewport culling from canceling. **Verify:** browser tests cover every direction, exact position/size deltas, ignored second arrow/Shift changes during a hold, culling continuity, each cancellation path, focus fallback, and a fresh gesture.
3. Test uncontrolled adoption and controlled preview → one semantic event on keyup → authoritative restoration until acknowledgement. Cover delayed and absent acknowledgement and prove direct-child compensation is acknowledged atomically. Prove pointer resize still works after keyboard completion/cancellation. Add a concise usage hint to the existing gesture guide and state the Chromium keyboard boundary in accessibility docs. **Verify:** focused browser tests, docs check, and `git diff --check` pass.
4. Run `bun run verify` sequentially. **Verify:** full gate exits 0. Then resume Plan 029's remaining visual and capability-matrix evidence.

## Done criteria

- [ ] Every directional control can resize using keyboard input and has its accessible name and focus path tested.
- [ ] Arrow input on resize controls never moves the node; ordinary selected-node keyboard movement still works.
- [ ] Escape restores resized bounds and compensated children, keeps focus predictable, emits no change, and permits a fresh gesture.
- [ ] Controlled and uncontrolled modes each preserve one atomic document meaning.
- [ ] Controlled delayed and absent acknowledgements leave authoritative geometry visible, including child positions.
- [ ] A held gesture is owned by one initiating arrow and captured Shift setting until its matching keyup.
- [ ] Viewport culling does not cancel; document removal, hidden state, deselection, blur, Escape, and destroy do cancel with the specified focus fallback.
- [ ] Existing pointer resize, panel/portal keyboard actions, and full local gate pass.

## STOP conditions

STOP if correct keyboard resize requires changing the public node-bounds contract, core pointer-id/session semantics, or an invariant that pointer sessions alone own capture. Report the smallest host-only alternative and keep Plan 029 blocked. Do not simulate pointer ids or weaken the keyboard-only assertion.

## Maintenance notes

The directional controls are host DOM, not document data. Keep the eight labels distinct, preserve the current pointer path, and keep high-frequency key repeats out of telemetry logs.
