# Plan 028: Add placed panels and overlay portals to vanilla

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `CONTEXT.md`, `docs/standards.md`, Plan 022's accepted UI matrix, and this whole plan. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- apps/vanilla/src/canvas-ui.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/style.css apps/vanilla/e2e/canvas-ui.e2e.ts docs/public-api.md research/PROGRESS.md`; compare live options after earlier plans. STOP if another slice already defines a placed overlay contract.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** MED; **Depends on:** 022, 023
- **Category:** direction; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

Vanilla can preserve one caller panel and position keyed toolbar containers, but it has no general placement or portal API. Callers cannot attach several persistent controls to canvas corners without hand-positioning them outside the host. A host-owned overlay layer should keep caller DOM identity and pointer behavior while the graph pans, culls, reconciles, and unmounts.

## Current state

- `apps/vanilla/src/mount-flow.ts:194-215` exposes one `panel?: HTMLElement`, keyed toolbar containers, and `onToolbarAnchors`. The unknown-input facade passes panel and toolbar values at `:4240-4253` after decoding serializable options.
- `apps/vanilla/src/canvas-ui.ts:19-34` accepts one panel and its former parent/sibling; `:116-133` reparents keyed toolbar elements, and its returned destroy path restores caller elements.
- `apps/vanilla/e2e/canvas-ui.e2e.ts:93-145` proves a panel and caller toolbar survive keyed update, viewport change, culling, and destroy.
- `research/traces/reusable-canvas-ui.md:5-15,21-31` compares reference panels/toolbars and records the missing general portal/placement API. `research/PROGRESS.md:158` is open.

```ts
// apps/vanilla/src/canvas-ui.ts:28-34
export const createCanvasUI = (
  settings: CanvasUISettings,
  actions: CanvasUIActions,
  panel?: HTMLElement,
  panelParent?: Node,
  panelNextSibling?: Node | null
) => {
```

Keep DOM elements in host options, never in `FlowDocument`; the host owns restoration on `destroy` (`docs/architecture.md:5-16,104-110`). Use no new UI framework dependency.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Canvas UI browser | `bunx playwright test apps/vanilla/e2e/canvas-ui.e2e.ts --workers=1` | exit 0 |
| Docs | `bun run docs:check` | exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `apps/vanilla/src/canvas-ui.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/style.css`, `apps/vanilla/e2e/canvas-ui.e2e.ts`, `docs/public-api.md`, `docs/guides/custom-nodes-and-edges.md` if a toolbar example changes, `research/traces/reusable-canvas-ui.md`, `research/PROGRESS.md`, summary via inventory, index row. **Out of scope:** React-style portal implementation, Foldkit/Vue UI, minimap redesign, core graph schemas, third-party overlay packages, imported artifacts.

## Steps

1. Add an explicit host-only `panels` option with stable ids, one caller `HTMLElement` per entry, and placement among top-left, top-center, top-right, bottom-left, bottom-center, bottom-right. Keep the existing single `panel` option working; document precedence if both forms are supplied. Reject duplicate ids and reusing the same element twice at the mount boundary with a typed failure, not silent reparenting. **Verify:** typecheck and a browser invalid-input case pass.
2. Build a fixed canvas overlay root outside the transformed viewport with six slots. Reparent caller elements once and store parent, next sibling, class/style/hidden state needed for exact restoration. Preserve focus, event listeners, and element identity through update, culling, and viewport changes. Exclude all overlay targets from pan/selection/drag capture while retaining their own button actions. **Verify:** browser tests assert placement, DOM identity, control clicks, and unchanged node geometry/semantic change count.
3. Provide a named host overlay portal container that callers can populate with arbitrary DOM while the host is mounted. Make its lifetime and restoration explicit; it must not turn into document data or let an overlay pointer start a graph gesture. Verify two hosts can mount simultaneously without sharing containers. **Verify:** browser test proves separate roots, teardown restoration, and no surviving listeners or mounted overlay nodes after destroy.
4. Update public API and trace with source/test paths, classifications, and intentional differences from the pinned reference. Check `PROGRESS.md:158` only if panel placement and portal lifecycle are both proved. Regenerate summary through `bun run research:inventory` if changed. **Verify:** docs check, full gate, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Six placements, duplicate validation, keyed survival, multi-host isolation, pointer exclusion, and exact restoration have browser assertions.
- [ ] Existing single-panel and node/edge toolbar behavior still passes.
- [ ] DOM content remains caller-owned and the graph document/persistence format is unchanged.
- [ ] Full local gate passes; checklist 158 closes only if its whole wording is met.

## STOP conditions

STOP if moving caller elements changes their meaningful focus behavior in a way the host cannot restore, if the public facade cannot reject invalid element reuse without breaking its current signature, or if a portal requires modifying core or framework adapters. Report the smallest alternative contract instead.

## Maintenance notes

A future framework adapter may expose slots/components over the same placement semantics, but should own its own lifecycle. Keep overlay coordinates in screen space and toolbar anchors in core-derived flow-to-screen geometry.
