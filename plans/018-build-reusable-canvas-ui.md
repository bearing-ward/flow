# Plan 018: Build the first reusable canvas UI layer

> **Executor:** Use an isolated worktree. Read `docs/standards.md`, `docs/architecture.md`, `research/PROGRESS.md`, and the public controller contract after Plan 017. **Drift check first:** `git diff --stat 6e84008..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/src/main.ts apps/vanilla/src/style.css packages/core/src/domain/flow-fit-view.ts packages/core/src/domain/flow-toolbar-anchor.ts research/PROGRESS.md`. STOP if viewport or toolbar ownership has changed materially.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** MED; **Depends on:** 015-017
- **Category:** feature, UI; **Planned at:** `e709097`, refreshed 2026-09-23 after Plans 012-017

## Resolved interaction-mode behavior

The interaction control switches between `select` and `pan`. `select` preserves existing node, edge, resize, selection, and pane interactions. `pan` makes primary pointer drags on the canvas, including over nodes and edges, move the viewport without selecting, connecting, or resizing graph items. UI controls, panels, and caller toolbars retain their own pointer behavior. The mode is transient host state and is not serialized into `FlowDocument`; keyboard commands remain available in both modes.

## Why and current state

`research/PROGRESS.md:82,88,153-160` leaves configurable canvas options, control/double-click zoom, backgrounds, minimap, panels, node/edge toolbars, and attribution open. Today `.flow-canvas` uses a fixed dot pattern in `apps/vanilla/src/style.css:26-35`. The host already exposes `fitView` at `mount-flow.ts:190-197` and computes toolbar anchors at lines 496-503. `apps/vanilla/src/main.ts:127-145` renders demo-only toolbar buttons from those anchors; they are not reusable UI. Core `flow-fit-view.ts:41-84` and `flow-toolbar-anchor.ts:15-52` provide geometry without DOM. Keep control markup and lifecycle in apps, while pure geometry stays in packages.

```css
/* apps/vanilla/src/style.css:26-35 */
.flow-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f8fafc;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
  touch-action: none;
}
```

## Scope and gates

Only edit `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`, `apps/vanilla/src/main.ts`, `apps/vanilla/src/style.css`, create `apps/vanilla/src/canvas-ui.ts` and its browser spec `apps/vanilla/e2e/canvas-ui.e2e.ts`, edit `packages/core/src/domain/flow-toolbar-anchor.ts` and `packages/core/src/domain/flow-toolbar-anchor.test.ts` only if a pure anchor rule is missing, create `research/traces/reusable-canvas-ui.md` and `docs/ui-licensing.md`, edit `docs/dependencies.md` only for a justified dependency, edit `research/PROGRESS.md`, regenerate summary via inventory, and update index row. Do not add a UI framework, global CSS reset, minimap-specific graph copy, or dependency without `docs/dependencies.md` justification. Use `codex/018-canvas-ui` if needed; no commit/push/merge/PR without instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Browser | `bunx playwright test apps/vanilla/e2e/canvas-ui.e2e.ts` | exit 0 |
| Trace | `bun run research:check-traces` | exit 0 |
| Complete | `bun run verify` | exit 0 |

## Steps

1. Trace pinned reference background, controls, minimap, panels, and toolbar entry points in `research/traces/reusable-canvas-ui.md`. Trace Flow's public mount → options → viewport/anchor state → DOM output separately. Cite production and test paths, and end with `## Conformity and deviations`. **Verify:** trace checker passes.
2. Add schema-backed host options for background pattern (`dots`, `lines`, `none`), spacing/color, and opt-in controls. Render CSS variables on the host root rather than changing global styles. Controls have accessible names for zoom in/out and fit, plus a pressed-state interaction toggle with the behavior defined above. Verify that pan mode does not select, connect, or resize graph items. Double click zooms around the clicked canvas coordinate via existing core viewport math. Honor min/max zoom, pan extent, and controlled acknowledgement. **Verify:** browser spec asserts exact transform and accessible names for each control and double click at zoom bounds.
3. Add a minimap using the same pure graph bounds/geometry and current viewport; indicate visible region and let pointer navigation request a semantic viewport change. Add a host overlay/panel slot whose DOM is owned by the caller and survives keyed node updates. Turn the existing toolbar anchor callback into opt-in node/edge toolbar containers, preserving caller supplied buttons and avoiding duplicate focus targets after reconciliation. **Verify:** browser spec checks minimap viewport rectangle, navigation, panel persistence, toolbar anchors after drag/zoom/culling, and destroy cleanup; snapshot one stable UI state.
4. Remove or clearly label demo-only toolbar duplication in `main.ts`. Document attribution and notice decision in `docs/ui-licensing.md` before copying any visual/source assets. Check only fully proven PROGRESS entries, regenerate summary, and run the full gate. **Verify:** `bun run verify`, `git diff --check`, and trace checker pass.

## Test plan and done criteria

- [ ] Background options and controls change visible output and preserve zoom limits; double click anchors zoom to the clicked flow point.
- [ ] Minimap navigation, panel persistence, toolbar anchor updates, keyboard focus, and destroy cleanup pass real-browser assertions.
- [ ] One stable screenshot covers the new UI and the trace has an explicit conformity boundary; no reference parity is claimed without direct test.
- [ ] Full gate passes; only scoped files change; licensing decision is written.

## STOP and maintenance

STOP if a reusable UI option requires changing saved graph data, if toolbar content cannot be owned safely by the caller, if minimap geometry drifts from core graph bounds, or if imported assets raise unresolved license questions. Keep UI optional so Foldkit/Vue can compose their own controls against the same core viewport contract. Do not declare every visual-check item complete from one screenshot.
