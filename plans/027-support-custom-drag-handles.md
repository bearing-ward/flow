# Plan 027: Support custom drag handles in the vanilla renderer

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, `research/fixtures/README.md`, Plan 022's matrix, and this whole plan. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/graph-renderers.e2e.ts apps/vanilla/e2e/movement-slices.e2e.ts docs/guides/custom-nodes-and-edges.md research/fixtures/README.md`; STOP if another slice has introduced an equivalent handle contract.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** MED; **Depends on:** 022, 025, 026
- **Category:** direction; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The pinned reference capture proves that pressing outside a custom drag handle leaves a node stationary while pressing the handle moves it. Flow currently has no matching host contract, so custom node controls can accidentally initiate a drag. A DOM marker contract can gate drag start without adding CSS selectors or elements to the serializable graph document.

## Current state

- `research/fixtures/reference-captures.json:26-45` records the two reference actions and their different transform outcomes; `research/fixtures/README.md:16,29` calls Flow's missing custom drag handle an intentional difference.
- `packages/core/src/domain/flow.schema.ts:63-81` contains graph meaning and no DOM selector. `apps/vanilla/src/mount-flow.ts:158-166,208-214` puts custom renderer elements and registries at the host boundary.
- `apps/vanilla/src/mount-flow.ts:2226-2345` handles pointerdown for resize, handles, and node drag. `apps/vanilla/e2e/graph-renderers.e2e.ts` is the custom renderer browser pattern.

```ts
// packages/core/src/domain/flow.schema.ts:74-80
selected: S.optional(S.Boolean),
selectable: S.optional(S.Boolean),
focusable: S.optional(S.Boolean),
draggable: S.optional(S.Boolean),
ariaLabel: S.optional(S.NonEmptyString),
ariaDescription: S.optional(S.NonEmptyString),
hidden: S.optional(S.Boolean),
```

The marker is a host DOM convention, not persisted node data. Preserve selected-group dragging, locked nodes, keyboard movement, and click selection outside the handle.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Renderer browser | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts apps/vanilla/e2e/movement-slices.e2e.ts --workers=1` | exit 0 |
| Full gate | `bun run verify` | exit 0 |
| Docs | `bun run docs:check` | exit 0 |

**In scope:** `apps/vanilla/src/mount-flow.ts`, renderer browser tests above, `docs/guides/custom-nodes-and-edges.md`, `research/fixtures/README.md`, `research/PROGRESS.md` only for fully proved checklist items, generated summary via inventory, index row. **Out of scope:** changing `FlowNodeSchema`, a cross-framework selector API, rendering arbitrary user HTML, changes to imported reference artifacts.

## Steps

1. Define the host rule in the guide and code: when a custom renderer contains at least one `data-flow-drag-handle` descendant, only a pointerdown inside such a descendant may begin node drag; otherwise the existing node-body behavior applies. A `data-flow-no-drag` descendant suppresses drag, including inside a marked handle. Resolve targets only inside the current node wrapper, and do not let a toolbar/resize/connection control start drag. **Verify:** typecheck exits 0.
2. Apply the rule at the node pointerdown boundary before creating a drag session. Preserve focus and selection semantics for a non-handle click, and preserve threshold and selected-group movement when the handle starts a drag. Ensure keyed renderer updates that add/remove markers take effect without remount. **Verify:** renderer browser tests assert exact transforms and change counts for outside, inside, nested no-drag, update, and teardown cases.
3. Add a Flow browser scenario normalized to the two actions already in `reference-captures.json`. Compare the observed transform-changed booleans, not pixel coordinates or event timing. If equivalent inputs/outputs are truly matched, update only that behavior's fixture classification to conforming; otherwise keep it intentionally different or unverified and state why. **Verify:** focused browser gate and fixture unit test pass.
4. Run full gate, docs check, and `git diff --check`; update only complete progress rows. **Verify:** all commands exit 0.

## Test plan and done criteria

- [ ] Outside-handle press does not move; inside-handle press moves; no-drag child suppresses movement.
- [ ] Selection, keyboard movement, controlled acknowledgement, and group drag still pass.
- [ ] The comparison claims only normalized behavior that both browser hosts exercised.
- [ ] Full local gate passes; graph schema and saved-document format are unchanged.

## STOP conditions

STOP if the marker rule cannot coexist with existing custom renderer lifecycle, if an accessible control would lose focus/activation, or if the reference capture cannot be matched without adding selector data to the core document. Report the specific trade-off rather than silently changing persistence.

## Maintenance notes

Document marker precedence beside the renderer API. A framework adapter can adopt the same observable behavior later without copying vanilla's DOM implementation. Keep `draggable: false` authoritative over any marker.
