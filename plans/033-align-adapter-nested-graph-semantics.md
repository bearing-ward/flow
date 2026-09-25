# Plan 033: Align framework adapters with core nested-graph semantics

> **Executor:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, and this plan. Change only the scope below. Do not push, merge, or open a PR without operator instruction. Update this plan's index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- packages/conformance/src apps/vue/src/FlowCanvas.ts apps/foldkit/src/graph.ts apps/{vanilla,vue,foldkit}/e2e research/fixtures/README.md`. Re-read cited paths if changed; STOP if the core hierarchy contract differs.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Category:** bug, architecture
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** DONE — `7bb52bb`; verified by `bun run verify` in the isolated worktree.

## Why this matters

Core treats node positions as parent-local, resolves every ancestor, and propagates hidden state. Vue and Foldkit add only one parent's coordinates and check only the node's own `hidden` flag. A third-level node can appear in the wrong place, and descendants can remain visible after their parent hides. The six shared fixtures cover only one parent level.

## Current state and conventions

- `packages/core/src/domain/flow-graph.ts:46-68` is the authoritative pure graph view: `const parent = node.parentId === undefined ? undefined : resolve(node.parentId)`; `absolutePosition` adds the parent's absolute position; `hidden` includes `parent?.hidden`.
- `apps/vue/src/FlowCanvas.ts:135-145,186-199` and `apps/foldkit/src/graph.ts:72-75,159-176` hand-roll one-level coordinates and local visibility. Browser and framework lifetime stays in `apps/`; graph meaning stays in `packages/core` per `docs/standards.md:5-11`.
- `packages/conformance/src/index.ts:68-76` checks a single child; the three `shared-conformance.e2e.ts` files run the same fixtures. Follow `packages/core/src/domain/flow-graph.test.ts:16-33,53-73` for three-level and inherited-hidden examples.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Shared fixture unit | `bunx vitest run packages/conformance/src/index.test.ts` | exit 0 |
| Three adapter browsers | `bun run test:browser && bun run test:conformance:vue && bun run test:conformance:foldkit` | exit 0, existing native skips only |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `packages/conformance/src/index.ts`, its test, the three shared browser drivers and harnesses if needed, `apps/vue/src/FlowCanvas.ts`, `apps/foldkit/src/graph.ts`, `research/fixtures/README.md`, `research/PROGRESS.md`, and this index row. **Out of scope:** core graph semantics, vanilla interaction behavior, new framework features, imported `research/artifacts/`, and a claim of xyflow parity.

## Steps

1. Add shared scenarios with root, child, and grandchild in deliberately non-ancestral document order; assert absolute positions before and after an authoritative parent update. Add a hidden-parent scenario and assert that all descendants and their incident edges disappear. **Verify:** fixture unit exits 0; the new browser scenarios fail on Vue and Foldkit before the fix, while vanilla passes.
2. Replace adapter-local absolute-position and hidden calculations with `createFlowGraph` results from `@flow/core`; use each resolved node's `absolutePosition` and inherited `hidden` in render and culling, and omit edges whose endpoints inherit hidden state. Keep existing DOM and framework ownership in the adapters. **Verify:** three adapter browser commands exit 0 with exact expected positions and visibility.
3. Check that parent updates preserve keyed nodes, controlled acknowledgement still waits for the caller, and the Foldkit pointer path emits parent-local positions. Update the evidence matrix only for the newly proved Flow scenarios. **Verify:** `bun run verify` and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Shared fixtures assert three-level coordinates, ancestor-hidden descendants/edges, and parent-update output for all three adapters.
- [ ] No adapter-local one-level geometry or `node.hidden`-only render rule remains on these paths.
- [ ] Existing six fixtures retain their outputs; three browser gates and full verify pass.
- [ ] The capability matrix says Flow cross-adapter coverage, not reference parity.

## STOP conditions and maintenance

STOP if using core graph results requires changing core's hierarchy semantics, if an adapter cannot express the same observable fixture, or if keyed DOM identity changes unexpectedly. Report the exact case; do not weaken fixture expectations. Future adapter features should consume the same core graph view rather than recreate ancestry math.
