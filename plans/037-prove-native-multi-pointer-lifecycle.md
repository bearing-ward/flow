# Plan 037: Prove native multi-pointer cancellation

> **Executor:** Work in an isolated worktree. Read `AGENTS.md`, `docs/browser-and-accessibility.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/src/mount-flow.ts docs/browser-and-accessibility.md`. STOP if the native pointer behavior or test environment has changed without characterization.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Category:** tests
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** BLOCKED — this environment is macOS 27.2 ARM64 with Playwright 1.62.1 and no configured native-capable device harness. The existing browser route uses CDP and cannot prove native concurrent pointer capture or two-contact touch.

## Why this matters

Deterministic tests cover cancellation on Escape, blur, capture loss, removal, and destroy, but concurrent native pointer capture and two-contact pinch cancellation are still unverified. The available Playwright/CDP touch injection does not preserve the required capture behavior. This is an evidence gap, not a known product defect.

## Current state and conventions

- `apps/vanilla/e2e/advanced-gestures.e2e.ts:356-359` holds two `test.fixme` cases for concurrent connection/node drag and two-contact pinch. Do not replace them with synthetic events that miss native capture.
- `docs/browser-and-accessibility.md:5` states the Chromium/CDP limitation. `research/traces/interaction-parity-next.md:48-50,69-74` labels native multi-pointer parity unverified.
- `apps/vanilla/e2e/advanced-gestures.e2e.ts:285-340` is the deterministic cancellation pattern: inspect rendered state, semantic changes, and ability to begin a fresh gesture. `docs/tooling.md:23-27` assigns vanilla Playwright port 4176 with strict binding.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Existing focused gate | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts --workers=1` | exit 0; the two native skips remain until a capable harness proves them |
| New device gate | `bun run test:native-pointer` | exit 0 on the recorded capable device after the script is added; otherwise report BLOCKED |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `package.json` for the named device command, a separate native-capable device/browser harness under `apps/vanilla/e2e/` or `scripts/`, the two focused test cases, `docs/browser-and-accessibility.md`, `research/traces/interaction-parity-next.md`, `research/PROGRESS.md`, and this index row. **Out of scope:** changing gesture production behavior without a reproduced failure, counting synthetic CDP touch as native proof, imported xyflow artifacts, and claims about untested browsers.

## Steps

1. Select a reproducible browser/device route that reports real `PointerEvent.pointerId`, `isPrimary`, pointer capture ownership, and two simultaneous contacts. Expose it as `bun run test:native-pointer`; document device, browser version, and why capture is native. **Verify:** the command records two distinct native IDs and capture transitions; if none is available, STOP with the tested environments.
2. Exercise simultaneous connection and node drag, then two-contact pinch cancellation. Assert capture release, no post-cancel semantic change, restored previews, and a fresh gesture. Keep the ordinary Chromium suite's skips only when that suite still cannot supply native capture. **Verify:** the device test command exits 0 twice consecutively.
3. Record observed Flow behavior separately from reference comparison. If behavior fails, preserve the failing case and open a scoped production fix rather than marking coverage complete. **Verify:** focused gate, device command, `bun run verify`, and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] A repeatable native-capable command and environment record exist.
- [ ] Both formerly unverified interactions have native capture assertions and two passing runs, or remain explicitly blocked with exact environment evidence.
- [ ] No synthetic-only test is labeled native proof; production code changes require a separately reviewed defect.

## STOP conditions and maintenance

STOP if no suitable hardware/browser harness is available, if the two cases cannot produce real simultaneous capture, or if a production defect appears. This plan may end BLOCKED with a precise device requirement; do not remove `test.fixme` merely to make a checklist box green.
