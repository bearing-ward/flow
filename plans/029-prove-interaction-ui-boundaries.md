# Plan 029: Prove the new interaction and UI boundaries

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, the completed Plans 022-028, and this whole plan. This is a focused proof and documentation slice, not a license to change feature behavior. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- apps/vanilla/e2e packages/conformance/src research/fixtures docs/browser-and-accessibility.md research/PROGRESS.md`; re-read all new feature tests and the accepted matrix. STOP if upstream or Flow contracts changed beyond the planned matrix.

## Status

- **Execution:** IN PROGRESS — Plan 032 is accepted. Focused visual, keyboard, adapter-capability, and parity evidence is updated and all requested gates pass; independent review remains before completion.

- **Priority:** P2; **Effort:** L; **Risk:** LOW; **Depends on:** 023, 025-028
- **Category:** tests, docs; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The new interaction slices will add behavior faster than the six original adapter fixtures can describe. Focused visual, keyboard, and lifecycle proof can show exactly what vanilla supports and where parity remains unverified. This plan closes evidence gaps for the chunk without implying Foldkit/Vue or xyflow coverage it did not run.

## Current state

- `packages/conformance/src/index.ts:12-54` defines the shared adapter protocol and `:54-116` contains six scenarios; vanilla, Vue, and Foldkit run those same fixtures. Feature-specific vanilla cases remain outside that shared fixture contract.
- `research/fixtures/README.md` now records per-adapter evidence and the two pinned transform captures. The custom drag-handle comparison is limited to unchanged/changed transform booleans; resize, panel, native capture, and the other shared scenarios remain unverified against reference output.
- `apps/vanilla/e2e/advanced-gestures.e2e.ts` covers eight-direction pointer and keyboard resize with controlled acknowledgement, cancellation, nested geometry, culling, and derived UI. `graph-renderers.e2e.ts` covers custom drag-handle visuals and native renderer keyboard ownership. `canvas-ui.e2e.ts` covers six measured placements, two focused panel snapshots, focus/actions, identity restoration, and portals. Two native pointer cases remain `test.fixme`.
- `docs/browser-and-accessibility.md` reports the Chromium role/name/focus/keyboard boundary and preserves the missing Safari/Firefox, screen-reader, and mobile-device coverage. The project-wide visual, input, accessibility, property, lifecycle, and performance checklist items remain open.

```ts
// apps/vanilla/e2e/canvas-ui.e2e.ts:63
await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
await expect(page.getByRole('img', { name: 'Graph minimap' })).toBeVisible()
await expect(page).toHaveScreenshot('canvas-ui.png', { animations: 'disabled' })
```

Parity means tested equivalence to the pinned reference (`CONTEXT.md:14-15`). Flow browser proof alone is a Flow contract claim.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Focused browser | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/graph-renderers.e2e.ts apps/vanilla/e2e/canvas-ui.e2e.ts --workers=1` | exit 0, with any native-only skips documented |
| Shared fixture unit | `bunx vitest run packages/conformance/src/index.test.ts` | exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** focused vanilla E2E files above and their snapshots, `packages/conformance/src/index.ts` and test only for scenarios all three adapters can already run, `research/fixtures/README.md`, `research/traces/interaction-parity-next.md`, `docs/browser-and-accessibility.md`, `research/PROGRESS.md`, summary via inventory, index row. **Out of scope:** production fixes, adding unsupported features to Foldkit/Vue, blanket screenshot regeneration, invented reference output, broad performance-budget claims, imported artifacts.

## Steps

1. Add stable, narrowly cropped visual checks for multi-direction resize at two zoom levels, custom drag-handle idle/active state, and two placed panel positions. Use deterministic fonts, viewport, graph data, and animation-disabled screenshots; inspect each new baseline before accepting it. **Verify:** focused browser gate exits 0 without updating unrelated snapshots.
2. Add keyboard-only and accessible-name/focus assertions for every new resize control and panel/portal action. Assert Escape restores state and focus lands predictably after completion/cancel; test a second fresh gesture after teardown where applicable. **Verify:** focused browser gate exits 0 with no `force: true` click workaround.
3. Extend shared conformance only where all three adapters already expose the same observable behavior. Otherwise add a capability matrix in `research/fixtures/README.md` that says vanilla-only, Vue-only, Foldkit-only, or unverified and points to exact tests. Do not weaken the six existing fixtures or call capability absence a test pass. **Verify:** conformance unit and all three adapter browser gates in `bun run verify` pass.
4. Revisit Plan 022's matrix row by row. Upgrade a classification to conforming only after equivalent pinned reference and Flow outputs are compared; record test commands and normalization. Keep visual, accessibility, touch, lifecycle, property, and performance checklist boxes open unless their entire stated scope is satisfied. **Verify:** full gate, `bun run research:check-traces`, and `git diff --check` exit 0.

## Test plan and done criteria

- [x] Stable focused visual and keyboard/a11y checks cover resize at two zooms, drag-handle idle/active state, two panel placements, all named resize controls, renderer key ownership, and panel/portal focus and actions.
- [x] Shared scenarios remain equally strict on all three adapters; feature-specific evidence and unverified adapter boundaries are explicit in the capability matrix.
- [x] Each parity label has a normalized comparison or remains unverified; the custom drag-handle claim is restricted to transform-change booleans.
- [x] Focused/full gates and `git diff --check` pass; no unrelated snapshots or production changes are included in this plan's delta.

## STOP conditions

STOP if screenshot output varies across repeated runs on the same platform, if a needed assertion exposes a production defect, if a reference comparison cannot be reproduced, or if a shared fixture would require unsupported adapter features. Report the exact test/capability gap and open a separate implementation plan rather than weakening proof.

## Maintenance notes

This plan does not establish a complete WCAG audit, device matrix, or large-graph performance budget. Keep those as later dedicated scopes. When an adapter adds one of these capabilities, promote that row into the shared suite only after every adapter has an equivalent observable path.
