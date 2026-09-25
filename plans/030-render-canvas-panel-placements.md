# Plan 030: Complete canvas panel placement wiring

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, Plan 028, Plan 029, and this whole plan. Complete the missing portions of Plan 028's already-declared panel contract, then prove the result. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** LOW; **Depends on:** 028
- **Category:** correctness; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

Plan 028's helper and public facade are inconsistent: `canvas-ui.ts` accepts placed panels and `public.ts` exports `CanvasPanelPlacement`, `FlowPanelOption`, and `CanvasUIOptionsError`, but `mount-flow.ts` does not define or pass those options and does not define the exported symbols. The existing CSS also positions every `.flow-panel-slot` at the same top-right coordinates. As a result, the declared API is not buildable and the six placements cannot be used through the public host.

## Current evidence

- `apps/vanilla/src/canvas-ui.ts` writes `data-placement` on each panel slot and supports caller element restoration.
- `apps/vanilla/src/public.ts` currently exports three panel symbols that are absent from `mount-flow.ts`.
- `apps/vanilla/src/style.css` gives all slots `top: 12px; right: 12px` and has no placement-specific selectors.
- `apps/vanilla/e2e/canvas-ui.e2e.ts` currently asserts placement attributes and visibility, not rendered coordinates.

## Scope and verification

**In scope:** `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/canvas-ui.ts` only as needed to align its current helper contract, `apps/vanilla/src/public.ts`, `apps/vanilla/src/style.css`, `apps/vanilla/e2e/canvas-ui.e2e.ts`, `docs/public-api.md`, and this plan's index row. Wire the existing documented `panels` option through host options and the public facade, define/export its types and typed validation error, reject duplicate ids/elements and simultaneous legacy/new options, preserve legacy `panel`, and render top/bottom × left/center/right positions distinctly. Keep panels within the canvas, center the center placements, and ensure two opposing panels at the test size do not overlap.

**Out of scope:** redesigning panel ownership or portal lifecycle, changing public placement names, production behavior outside the already-declared Plan 028 contract, framework adapters, imported evidence.

1. Complete the host-only panel type and option wiring. Keep DOM values outside Effect document schemas, validate them at the public host boundary with `CanvasUIOptionsError`, and pass the validated entries into `createCanvasUI`. Preserve the legacy single `panel` option and reject duplicate ids, duplicate elements, and using both option forms. **Verify:** typecheck and focused invalid-input/legacy browser cases pass.
2. Add CSS selectors for all six `data-placement` values, including horizontal centering for center placements and bottom anchoring for bottom placements. **Verify:** focused browser assertions read bounding boxes and confirm the expected canvas-relative edges/centers for all six positions.
3. Cover two simultaneous opposing placements and ensure their positions do not overlap when the panels fit the canvas. **Verify:** focused canvas UI browser suite exits 0.
4. Update the public API docs to describe visible placement behavior, then run `bun run docs:check`, `bun run verify`, and `git diff --check`. **Verify:** all exit 0; API and docs scope remains narrow.

## Done criteria

- [ ] The public `panels` option builds, validates input, and preserves the legacy single-panel option.
- [ ] All six placements render at their named canvas-relative position.
- [ ] Two opposing panels occupy distinct positions without overlap at the test viewport.
- [ ] Focused browser, docs, and full local gates pass.
- [ ] No changes outside the listed scope.

## STOP conditions

STOP if completing the already-declared panel API requires a panel ownership redesign, a broad responsive-layout system, or changes to core/framework adapters. Report the exact constraint and proposed next plan.
