# Plan 014: Add a first node resize contract through the core and vanilla host

> **Executor:** Use an isolated worktree and read `research/traces/gesture-resize-lifecycle.md`, `docs/architecture.md`, and `research/PROGRESS.md`. **Drift check first:** `git diff --stat 6e84008..HEAD -- packages/core/src/domain/flow.schema.ts packages/core/src/domain/flow-runtime.schema.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/style.css research/PROGRESS.md`. Plan 013 changes the gesture paths by design: re-read its final implementation before applying this plan; STOP if it does not expose a resize-compatible lifecycle.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 013
- **Category:** feature, architecture; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`research/PROGRESS.md:116` leaves resizing open. Nodes already have a declared positive `size` in `packages/core/src/domain/flow.schema.ts:56-75`; live DOM measurements belong to host state and take precedence for geometry (`docs/architecture.md:83-91`). The current change union at `flow-runtime.schema.ts:92-173` has node-position changes but no size change. The host applies declared wrapper size at `mount-flow.ts:330-338`, observes it at 2112, and updates edge geometry from measured positions. The reference resizer captures measured width/height and position, then considers parent and child extents (`research/traces/gesture-resize-lifecycle.md:7`); its browser output is unverified in the imported Playwright suite. This plan implements a small, explicit Flow contract, not a parity claim.

```ts
// packages/core/src/domain/flow.schema.ts:64-67
size: S.optional(S.Struct({
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
})),
```

## Scope, conventions, and gates

Only edit `packages/core/src/domain/flow.schema.ts` if a schema refinement is needed, `packages/core/src/domain/flow-runtime.schema.ts`, its `.test.ts`, `packages/core/src/public.ts`, `packages/core/src/domain/flow-persistence.test.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/style.css`, `apps/vanilla/e2e/advanced-gestures.e2e.ts`, `research/traces/gesture-resize-lifecycle.md`, `research/PROGRESS.md`, generated summary via inventory, and the index row. Keep renderer callbacks and DOM in the host; keep `FlowNode.size` serializable and measured dimensions transient. Do not add top/left handles, aspect-ratio locking, multi-node resize, parent auto-expansion, or a new dependency. Use branch `codex/014-node-resize` if needed; no commit, push, merge, or PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Core | `bunx vitest run packages/core/src/domain/flow-runtime.schema.test.ts packages/core/src/domain/flow-persistence.test.ts` | exit 0 |
| Browser | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts` | exit 0 |
| Trace | `bun run research:check-traces` | exit 0 |
| Complete | `bun run verify` | exit 0 |

## Steps

1. Add `node-size` semantic change and a pure `resizeNode` helper with an explicit lower-right handle contract. Input is initial declared or measured size, pointer delta in flow coordinates, and minimum `{width:40,height:24}`; output is positive finite width/height with unchanged position. Derive types from Effect Schemas and include the change in `FlowChangeSchema` and the exported public contract. Preserve controlled mode: emit the candidate but await caller `update`; uncontrolled mode applies it to `FlowNode.size`. **Verify:** core gate passes, including encoded/decoded size and saved document round-trip.
2. Add one visible, keyboard-focusable lower-right resize handle to selected nodes. Use the Plan 013 gesture state and scoped pointer capture; convert screen delta by viewport zoom. Preview wrapper size and incident edges during drag, then emit exactly one size change on completion. Escape, blur, pointer cancel, node removal, and destroy restore the authoritative size and release capture. A resize must not also start a node drag or pane pan. **Verify:** browser gate passes for uncontrolled and controlled cases at zoom 1 and 2, cancellation, and edge endpoint updates.
3. Extend `gesture-resize-lifecycle.md` with the exact Flow entry → state → geometry → DOM → change path, separate production and test citations, and an updated final `## Conformity and deviations` section. Mark reference resize output unverified until a direct reference fixture is available. Check `PROGRESS.md:116` only if the documented first-contract scope meets the project's intended definition; otherwise leave it open and say why. Regenerate summary if PROGRESS changes. **Verify:** trace and full gates pass; `git diff --check` exits 0.

## Test plan and done criteria

- [ ] Unit tests cover minimum size, zoom-independent flow delta, unchanged position, invalid size rejection, and persistence of declared size only.
- [ ] Browser tests cover preview, one final change, controlled acknowledgement, incident edge movement, no drag conflict, and every cancellation route.
- [ ] Trace checker and `bun run verify` pass; only in-scope files changed.

## STOP and maintenance

STOP if size preview requires writing a DOM measurement into `FlowNode`, if Plan 013's state cannot represent resize safely, if controlled acknowledgement cannot restore the old size, or if the implementation needs top/left/parent expansion semantics. Report the new requirement as a follow-up. Future resize handles must define position and child-coordinate adjustments separately; do not silently generalize this lower-right contract.
