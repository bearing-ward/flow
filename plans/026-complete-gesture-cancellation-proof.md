# Plan 026: Complete deterministic gesture cancellation proof

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, Plan 022's accepted matrix, Plan 025's final resize contract, and this whole plan. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- packages/core/src/domain/flow-runtime.schema.ts apps/vanilla/src/mount-flow.ts apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/node-movement.e2e.ts research/PROGRESS.md`; inspect live code after Plans 024-025. STOP if pointer ownership changed in a way that invalidates the matrix.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 022, 023, 025
- **Category:** correctness, tests; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The interaction schema permits disjoint pointer sessions and a pinch owns two pointer IDs, but not every browser cancellation cell is proved. Completing the deterministic matrix protects against a preview or capture surviving blur, removal, Escape, and unmount. Native two-contact evidence needs an explicit device boundary rather than a synthetic test being mislabeled native.

## Current state

- `packages/core/src/domain/flow-runtime.schema.ts:104-158` describes session variants, unique pointer ownership, and tagged finish/cancel outcomes.
- `apps/vanilla/src/mount-flow.ts:3031-3139` cancels active drag, resize, connection, reconnection, pan, pinch, selection, and click connection. `:2669-2720` starts pinch; `:3145-3180` finishes it.
- `apps/vanilla/e2e/advanced-gestures.e2e.ts:653` covers a cancellation matrix but marks native concurrent pointer and two-contact pinch tests `test.fixme` because CDP injection did not preserve native capture. `:378-403` checks first-slice resize cancellation.
- `research/PROGRESS.md:133,219,223` stays open for complete cancellation, input matrix, and invalid/lifecycle tests.

```ts
// packages/core/src/domain/flow-runtime.schema.ts:141-148
export const FlowInteractionSessionsSchema = S.Array(
  FlowInteractionSessionSchema
).check(
  S.makeFilter((sessions) => {
    const owned = sessions.flatMap(pointerIdsForSession)
    return new Set(owned).size === owned.length
      ? undefined
      : 'A pointer id can belong to only one interaction session'
  })
)
```

Keep keyboard movement immediate, click-to-connect separate, no pointer-move logs, and browser resource ownership in `apps/` (`docs/architecture.md:5-16,86-90`).

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Core transitions | `bunx vitest run packages/core/src/domain/flow-interactions.schema.test.ts packages/core/src/domain/flow-runtime.schema.test.ts` | exit 0 |
| Browser gestures | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/node-movement.e2e.ts --workers=1` | exit 0, with documented native-only skips if environment still lacks capture |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `packages/core/src/domain/flow-runtime.schema.ts` and its tests; `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/e2e/advanced-gestures.e2e.ts`, `apps/vanilla/e2e/node-movement.e2e.ts`; `research/traces/gesture-resize-lifecycle.md`, `docs/browser-and-accessibility.md`, `research/PROGRESS.md`, generated summary via inventory, index row. **Out of scope:** unrelated new gestures, a new pointer library, unverified support claims for Safari/Firefox or mobile devices, imported artifacts.

## Steps

1. Make the accepted matrix executable as exact core transition cases: two disjoint sessions, duplicate pointer rejection, pan-to-pinch replacement, one pinch pointer cancellation, global cancellation, repeated cancellation, and finish-after-cancel no-op. **Verify:** core transition gate exits 0 with exact session arrays and semantic-event outcomes.
2. Extend the vanilla browser cases for every deterministic gesture/cancel pair affected by resize and concurrent sessions. Assert restored geometry, no final semantic change, capture release, zero pending frames, and a subsequent fresh gesture succeeding. Fix root causes only when a test reproduces a leak. **Verify:** focused browser gate exits 0.
3. Attempt the native two-pointer cases only in a browser/device harness that actually produces trusted pointer capture. Record the environment and observation; retain `test.fixme` and classify native behavior unverified if such a harness is unavailable. Do not convert synthetic dispatch into a native proof. **Verify:** no false native claim in trace/docs; `rg -n 'test.fixme|native' apps/vanilla/e2e/advanced-gestures.e2e.ts docs/browser-and-accessibility.md` shows the final boundary.
4. Update checklist only for complete contracts; regenerate summary if changed. **Verify:** full gate and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] Pure tests cover concurrent ownership, pinch replacement, idempotent cancellation, and no final event after cancel.
- [ ] Browser tests cover all deterministic cancellation paths plus a fresh follow-up gesture.
- [ ] Native cases are either tested with real capture or explicitly unverified; checklist 133/219 remain open if their full wording is not proved.
- [ ] Full local gate passes and only scoped files change.

## STOP conditions

STOP if the host requires changing the semantic event contract outside scope, if Playwright cannot distinguish actual capture from synthetic dispatch, or if fixing one cancellation path requires replacing the entire host interaction design. Report the minimal failing case and proposed follow-up instead.

## Maintenance notes

Preserve the `FlowInteractionSessionsSchema` unique-pointer invariant. When another gesture is added, extend the transition matrix before adding DOM handlers. Keep high-frequency moves out of telemetry logs.
