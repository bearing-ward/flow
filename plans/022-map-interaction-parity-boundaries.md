# Plan 022: Map the next interaction parity boundaries

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `CONTEXT.md`, `docs/standards.md`, `research/PROGRESS.md`, and this whole plan. Preserve unrelated work. Update only this plan's index row after the gates pass. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- research/traces/gesture-resize-lifecycle.md research/traces/reusable-canvas-ui.md research/fixtures/README.md research/PROGRESS.md packages/core/src/domain/flow-runtime.schema.ts apps/vanilla/src/mount-flow.ts` and `git status --short -- research/PROGRESS.md research/fixtures/README.md`. The advisor checkout already had uncommitted documentation edits on 2026-09-24; compare the live files and preserve them. STOP if an earlier slice has already settled the same behavior matrix.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** LOW; **Depends on:** none
- **Category:** direction, tests; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The remaining checklist mixes unimplemented behavior with behavior that exists but lacks direct reference proof. A finite interaction matrix gives the resize, gesture, drag-handle, and overlay executors exact behavior cells and prevents source similarity from being reported as parity. The pinned reference is evidence, not Flow's architecture.

## Current state

- `research/PROGRESS.md:47-53,116,133,158,218-224` leaves input/UI traces, broader resize, gesture cancellation, portals, and proof open.
- `research/fixtures/README.md:3-16,20-31` records only two browser-observed reference captures. The six shared scenarios run on Flow's three adapters but were not run against xyflow.
- `research/traces/gesture-resize-lifecycle.md:5-7,33-40` traces reference resize and Flow's lower-right handle; no imported resize browser test was found. Native concurrent pointer and two-contact pinch cancellation remain unverified.
- `research/traces/reusable-canvas-ui.md:3-15,21-31` traces upstream UI and Flow's first layer, including intentional minimap and portal differences.

`docs/standards.md:12-15` states: "The pinned xyflow artifacts are evidence. They are not the architecture of the replacement." It requires a reference behavior/output test for a parity claim and one of three classifications for every researched behavior.

Use the terms in `CONTEXT.md:9-15`: document is serializable, session and gesture are transient, geometry is derived, and parity requires tested equivalence.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Trace citation check | `bun run research:check-traces` | exit 0 |
| Fixture shape | `bunx vitest run packages/conformance/src/index.test.ts` | exit 0 |
| Full gate | `bun run verify` | exit 0 |
| Whitespace | `git diff --check` | exit 0 |

**In scope:** create `research/traces/interaction-parity-next.md`; edit `research/fixtures/README.md`; edit `research/PROGRESS.md` only if an entire checklist item is proved; regenerate `research/generated/SUMMARY.md` only through `bun run research:inventory` if progress changes; update `plans/README.md` row. **Out of scope:** production code, test behavior, imported `research/artifacts/**`, dependency changes, claims of full xyflow parity.

## Steps

1. Trace each selected behavior from the pinned React/Svelte or system entry point through state, geometry, DOM effect, and output, then separately trace the current Flow production and test path: eight-direction resize and nested extent; pointer ownership/cancellation including two touches; custom drag handle; panel/toolbar placement. Put exact `path:line` citations in the new trace. **Verify:** `bun run research:check-traces` exits 0 and the new trace ends in `Conformity and deviations`.
2. Add a table with one row per observable behavior cell. Record input, expected output, reference source/test, Flow source/test, classification, reason for any intentional difference, and the missing test boundary. Use `unverified` where the pinned reference was not run with equivalent inputs. **Verify:** every selected cell has all table columns filled; `rg -n 'Unverified|Intentionally different|Conforms' research/traces/interaction-parity-next.md` finds the classifications.
3. Choose a small deterministic acceptance set for Plans 024-028: resize from left/top and one corner, cancellation of two disjoint sessions and pinch, custom drag initiation, and overlay ownership. Record exact expected DOM/semantic outcomes and which later plan owns each test. Update the fixture guide's coverage mapping; do not invent browser captures. **Verify:** fixture shape test and citation check exit 0.
4. Check a progress item only if its full wording is satisfied; otherwise leave it open and explain the remaining rows. If progress changed, run `bun run research:inventory`. **Verify:** `bun run verify` and `git diff --check` exit 0, and `git diff --name-only -- research/artifacts` is empty.

## Test plan and done criteria

- [ ] The trace cites real production and test paths separately, including React/Svelte seams where applicable.
- [ ] Every matrix row has a test boundary and honest classification.
- [ ] No new parity claim is based solely on source inspection.
- [ ] The scoped commands pass; only in-scope files and generated summary from inventory change.

## STOP conditions

STOP if the pinned source path is missing from immutable artifacts, if the current Flow behavior contradicts a recorded assumption, or if an equivalent reference run needs mutation of `research/artifacts/**`. Mark that cell unverified and report the precise blocker. Do not expand into implementation.

## Maintenance notes

Later plans should link to the matrix and revise its classification only when equivalent behavior or output is captured and compared. Keep the matrix separate from the whole-project checklist: a checked Flow capability is not automatically a parity claim.
