# Plan 042: Expose completed vanilla interactions in the playground

> **Executor:** Use an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- apps/vanilla/src/main.ts apps/vanilla/src/style.css apps/vanilla/e2e research/PROGRESS.md`. STOP if the demo becomes a different product surface or the host API changes.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** LOW; **Category:** direction, docs
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** DONE — `c1ff849`; focused scene coverage and `bun run verify` passed in the isolated worktree.

## Why this matters

The playground currently demonstrates graph navigation, visibility, and connection rules, while completed resize, custom drag handles, nested graphs, and placed panels are mostly visible only through focused browser harnesses. A compact set of named scenes would make the shipped vanilla behavior inspectable without reading tests or adding new host capabilities.

## Current state and conventions

- `apps/vanilla/src/main.ts:201-238` mounts the host with custom renderers, controls, and minimap; `:240-255` adds Main graph, Distant graph, Fit, validator, and visibility actions. `:380-448` applies semantic changes, including `node-bounds`, to the demo document. Preserve that document update path when switching scenes.
- `apps/vanilla/e2e/graph-renderers.e2e.ts:143` shows a marked `data-flow-drag-handle`; `advanced-gestures.e2e.ts:370-396` shows a selected parent with child and atomic resize; `canvas-ui.e2e.ts:166-217` shows caller-owned panel placement. `research/fixtures/README.md:38-41` says these are vanilla-only proofs.
- Browser lifecycle belongs in `apps/`; graph meaning belongs in `packages/` (`docs/standards.md:5-11`). Use the existing `playgroundCopy` and `data-action` pattern at `apps/vanilla/src/main.ts:127-188,240-255` for scene labels and help text.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Focused demo browser | `bunx playwright test apps/vanilla/e2e/playground.e2e.ts --workers=1` | exit 0 after the test is added |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `apps/vanilla/src/main.ts`, its styles, a focused playground browser test, an optional short README paragraph, and this index row. **Out of scope:** changing core contracts, adding new adapter capabilities, rebuilding the vanilla host, storing DOM elements in graph documents, imported artifacts, and claiming feature or pixel parity from a demo scene.

## Steps

1. Define three small named scenes using the existing host API: nested selected node for eight resize controls and child world-position behavior; a custom renderer with marked drag region and nested no-drag control; and a panel/toolbar placement scene. Keep Main/Distant graph controls available and make scene descriptions state what can be tried. **Verify:** `bun run build` exits 0 and the playground browser test finds each named scene/control.
2. Switch scenes without leaking caller panels, renderer listeners, or stale subscriptions. Either update one host where contracts permit or destroy/recreate it with explicit cleanup; keep document state and status reporting coherent after a `node-bounds` change. **Verify:** browser test switches scenes repeatedly, exercises one action in each, and sees no duplicate controls or post-destroy changes.
3. Check keyboard navigation, focus restoration, and the current demo at the development viewport. Add one stable screenshot of the scene chooser and one interaction scene if they aid regression review. **Verify:** focused browser test, `bun run verify`, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] The main page exposes resize, drag-handle/no-drag, and placed panel behavior through named scenes.
- [ ] Scene switching leaves one active host and no leaked panel/listener/subscription; graph changes remain reflected in demo state.
- [ ] Existing Main/Distant/Fit behavior and keyboard access still work.
- [ ] Full verify passes; copy does not claim unproved adapter or reference parity.

## STOP conditions and maintenance

STOP if scene switching requires a new public host lifecycle API or mutating core graph meaning. Keep the playground as an inspectable consumer of existing contracts. Update it when a later host feature becomes part of the supported public API.
