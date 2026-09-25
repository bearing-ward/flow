# Plan 038: Capture comparable reference resize output

> **Executor:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, `research/fixtures/README.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- research/fixtures research/traces/interaction-parity-next.md apps/vanilla/e2e/advanced-gestures.e2e.ts`. STOP if the comparison input or Flow resize contract changed.

## Status

- **Priority:** P2; **Effort:** M; **Risk:** LOW; **Category:** tests, direction
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** TODO

## Why this matters

Flow's eight-direction resize has extensive local browser proof, but the pinned xyflow source has no equivalent browser output capture. The project cannot label resize conforming from similar formulas. A reproducible, narrow output comparison will either support a specific parity claim or document a deliberate difference.

## Current state and conventions

- `research/traces/interaction-parity-next.md:7-9,44-53` cites the reference resizer source and labels resize, bounds, and child compensation unverified. `apps/vanilla/e2e/advanced-gestures.e2e.ts:370-396` provides a concrete left-resize Flow case with parent/child positions, size, and controlled acknowledgement.
- `research/fixtures/reference-captures.json` records the exact pinned commit, input action, command, environment, raw browser-observed values, and normalized result for two drag cases. `research/fixtures/README.md:1-14` explains that the imported tree is incomplete and captures require a disposable full checkout at the pinned commit.
- `docs/standards.md:10-13,40-54` requires behavior/output evidence for parity; `research/artifacts/` is immutable. Match fixture style and end the new trace section with `Conformity and deviations`.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Flow focused browser | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts --workers=1` | exit 0, existing native skips only |
| Fixture unit | `bunx vitest run packages/conformance/src/index.test.ts` | exit 0 |
| Trace check | `bun run research:check-traces` | exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `research/fixtures/reference-captures.json`, its README, `packages/conformance/src/index.test.ts`, `research/traces/interaction-parity-next.md`, a narrowly scoped Flow browser case if needed, `research/PROGRESS.md`, and this index row. **Out of scope:** modifying imported `research/artifacts/`, changing production resize geometry to chase a capture, blanket xyflow parity, and installing/building the reference inside the user's checkout.

## Steps

1. In a disposable full checkout of xyflow at commit `0a1f9575b25679f2880175de8d3eae21aedde921`, run the pinned reference host. Define one left/top resize with a parent, direct child, fixed viewport, explicit starting sizes, and exact pointer coordinates. Capture before/after rendered bounds and document-local positions; record command, browser version, and raw output. **Verify:** repeat the capture twice with identical normalized position/size values; if the host cannot run, STOP and record the blocker.
2. Run the same input geometry in Flow's vanilla browser harness. Normalize only units and browser layout offsets justified in the fixture; compare parent bounds and child world/local positions. Do not substitute source-derived expected values for observed reference output. **Verify:** fixture unit exits 0 and explicitly asserts the chosen normalized fields.
3. Update the trace classification to conforming, intentionally different, or unverified for this exact case, with reason and test boundary. Leave checklist 116 open unless its entire resize scope is accepted and proved. **Verify:** focused browser, fixture unit, trace check, full gate, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Reproducible reference command and two matching observed captures are recorded.
- [ ] Flow and reference use equivalent input geometry and compare the same observable fields.
- [ ] Classification is limited to the captured case; full verify and trace check pass.

## STOP conditions and maintenance

STOP if the reference host cannot be reproduced, equivalent inputs cannot be constructed, or observed output varies between repeats. Keep such a cell unverified. Future parity claims must link a separate captured output, not extrapolate from this one.
