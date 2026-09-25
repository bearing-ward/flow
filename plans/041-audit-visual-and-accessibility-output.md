# Plan 041: Broaden visual and accessibility evidence

> **Executor:** Work in an isolated worktree. Read `AGENTS.md`, `docs/browser-and-accessibility.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- apps/vanilla/e2e apps/vue/e2e apps/foldkit/e2e docs/browser-and-accessibility.md research/PROGRESS.md`. STOP if the supported browser matrix or accessible interaction contract changed.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** LOW; **Category:** tests, accessibility
- **Depends on:** 033, 034; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** TODO

## Why this matters

Focused Chromium tests cover roles, names, focus, keyboard behavior, and several snapshots, but they do not cover every completed feature, other browsers, or a screen reader. A recorded review matrix will expose regressions and let the checklist describe exact evidence rather than imply a complete accessibility audit.

## Current state and conventions

- `docs/browser-and-accessibility.md:1-7` explicitly limits current proof to Chromium automated checks; Safari/Firefox, mobile touch, and screen-reader review are absent.
- `apps/vanilla/e2e/canvas-ui.e2e.ts:26-38,210-217` shows existing role/name assertions and scoped screenshots. `advanced-gestures.e2e.ts:590-612` checks all eight named resize buttons and keyboard focus. `research/PROGRESS.md:218-221` leaves broad visual/input/accessibility work open.
- `research/fixtures/README.md:31-45` separates vanilla-specific evidence from Vue/Foldkit and from xyflow parity. Preserve those boundaries.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Vanilla browser | `bun run test:browser` | exit 0, documented native skips only |
| Vue/Foldkit browser | `bun run test:conformance:vue && bun run test:conformance:foldkit` | exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** focused browser test files and reviewed snapshots in all three apps, `docs/browser-and-accessibility.md`, `research/fixtures/README.md`, `research/PROGRESS.md`, and this index row. **Out of scope:** changing production behavior without a separate defect, blanket snapshot regeneration, calling automated checks a WCAG or screen-reader pass, changing imported artifacts.

## Steps

1. Inventory completed user-facing features against existing visual, keyboard, and focus assertions. Add deterministic scoped screenshots and semantic assertions for missing high-value cells: nested graph, selected/hidden states, connection feedback, resize, toolbar/panel placement, and empty/invalid states where rendered. Review every new baseline at fixed viewport/font settings. **Verify:** focused browser commands exit 0 twice without snapshot updates on the second run.
2. Run a keyboard-only traversal on the vanilla playground and each adapter test host. Record reachable controls, names, focus order, activation, and Escape behavior; add automated assertions for stable failures. If a supported screen reader and browser are available, record device/browser/version, steps, and spoken output for graph node, handle, edge, resize control, and panel; otherwise label that review unverified. **Verify:** the documented matrix links each tested claim to an automated test or a dated manual observation.
3. Add Firefox/WebKit Playwright checks only after their environment is installed and test outputs are stable; otherwise keep those browser cells unverified. Update checklist 218/219/221 only for complete stated scope. **Verify:** `bun run verify` and `git diff --check` exit 0; no unsupported parity or accessibility claim appears.

## Test plan and done criteria

- [ ] New screenshots are scoped, inspected, and stable across two runs.
- [ ] Keyboard and focus matrix names exact hosts and test paths; screen-reader/browser gaps remain explicit where unavailable.
- [ ] Any production defect has a separate failing test and follow-up, rather than an assertion weakened to pass.
- [ ] Full verify passes; checklist boxes reflect only completed scope.

## STOP conditions and maintenance

STOP if a screenshot is nondeterministic after controlling viewport/font/animation, or if a tested interaction exposes a production defect. Report the failing artifact and open a scoped fix. Re-run this matrix when renderer semantics or supported browsers change.
