# Plan 024: Define multi-direction node resize geometry in core

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `CONTEXT.md`, `docs/standards.md`, Plan 022's accepted interaction matrix, and this whole plan. Update this plan's index row only after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- packages/core/src/domain/flow-runtime.schema.ts packages/core/src/domain/flow-runtime.schema.test.ts packages/core/src/domain/flow-graph.ts packages/core/src/domain/flow.schema.ts research/PROGRESS.md` plus `git status --short -- research/PROGRESS.md`. Compare the live resize API against the excerpts below. STOP if Plan 022 changed the accepted resize semantics.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 022
- **Category:** direction, tech-debt; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The current pure resize helper changes size only from the lower-right corner. Left/top handles must also change local position, and a nested node must remain constrained by its parent or declared extent. Put this math in core before the vanilla host adds more pointer handlers.

## Current state

- `packages/core/src/domain/flow-runtime.schema.ts:95-102` stores pointer and starting size but no resize direction or starting position.
- `packages/core/src/domain/flow-runtime.schema.ts:287-306` has `NodeSizeChange` and `resizeNode`, which clamp width to 40 and height to 24 and never update position:

```ts
// packages/core/src/domain/flow-runtime.schema.ts:295-306
export const resizeNode = (
  nodeId: NodeId,
  initialSize: NodeSize,
  delta: XYPosition
): NodeSizeChange => ({
  kind: "node-size",
  nodeId,
  size: S.decodeUnknownSync(NodeSizeSchema)({
    width: Math.max(40, initialSize.width + delta.x),
    height: Math.max(24, initialSize.height + delta.y),
  }),
});
```

- `packages/core/src/domain/flow.schema.ts:63-81` stores optional declared `size`, parent-local `position`, and `extent: "parent"`. `docs/architecture.md:104-110` says measured dimensions stay outside the document and a parent does not auto-expand.
- `packages/core/src/domain/flow-runtime.schema.test.ts:94-117` covers the first lower-right helper. `research/traces/gesture-resize-lifecycle.md:35-37` records the deliberate first-slice limits.

Follow `docs/standards.md:7-11`: graph math and Schema-derived types live in `packages/`; DOM events and measurements enter as numbers at a host boundary. Preserve the existing exact Effect RC pin and add no dependency.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Core tests | `bunx vitest run packages/core/src/domain/flow-runtime.schema.test.ts packages/core/src/domain/flow-graph.test.ts` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `packages/core/src/domain/flow-runtime.schema.ts`, its test, `packages/core/src/domain/flow-graph.ts` and its test only if a pure bound helper is needed, `packages/core/src/public.ts` for a public helper/type, `research/PROGRESS.md` only for fully proved work, generated summary through inventory only, and `plans/README.md`. **Out of scope:** vanilla DOM, Foldkit/Vue, persistence envelope changes, copying `XYResizer`, adding new runtime dependencies.

## Steps

1. Define a Schema-derived direction union for the four sides and four corners, plus a pure resize calculation input containing starting local position, starting measured-or-declared size, flow-space pointer delta, minimum size, and optional resolved bounds. Return the candidate local position and size together with the local-position delta. Preserve the lower-right helper as a compatibility case in this step; do not change public `FlowChange` yet. **Verify:** typecheck and focused tests exit 0.
2. Implement signed deltas: left/top move the origin and shrink/grow the opposite dimension; right/bottom retain origin. Clamp by 40x24 minimum so the opposite edge stays fixed after the clamp. Constrain the resulting rectangle to an optional parent/global extent without putting DOM measurements in core. When the target origin moves, return the inverse local-position delta that Plan 025 must apply to its direct children so their world positions stay fixed; deeper descendants then remain fixed through their unchanged parent positions. The parent does not auto-expand. **Verify:** exact unit cases for all eight directions, zoom-normalized deltas, min-size crossing, parent-local position, bounds, child-position compensation, and no-op pass.
3. Cover invalid/non-finite input at the decode boundary and invariants: positive finite size, finite local position, unchanged document input. Export only the necessary pure contract from `packages/core/src/public.ts`. **Verify:** focused tests, `bun run typecheck`, and `bun run verify` exit 0.
4. Leave `PROGRESS.md:116` open until Plan 025 proves browser behavior. Update the index row and generated summary only if another entire item actually closes. **Verify:** `git diff --check` exits 0; no imported artifact changes.

## Test plan and done criteria

- [ ] Eight directions, clamp boundaries, parent-local positions, and extents have exact core tests.
- [ ] The calculation returns one atomic position-and-size candidate without DOM types.
- [ ] Existing lower-right tests still pass; no document shape or saved-envelope version changes.
- [ ] Full local gate passes and only in-scope files change.

## STOP conditions

STOP if an extent cannot be resolved without DOM state in core, if preserving direct children's world positions requires changing descendant geometry beyond the inverse local-position delta, or if a public change migration is required to add the pure candidate. Parent auto-expansion remains out of scope. Report the concrete mismatch and proposed contract; do not silently change hierarchy semantics.

## Maintenance notes

Plan 025 must use this one calculation for previews and commits, including controlled acknowledgement. Review signed-delta clamps carefully: a left/top resize must keep the far edge fixed. An index or hit-test optimization is unrelated to this work.
