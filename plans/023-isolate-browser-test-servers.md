# Plan 023: Isolate browser test servers from development servers

> **Executor instructions:** Work in an isolated worktree. Read `AGENTS.md`, `docs/standards.md`, all three Playwright configs, and this whole plan. Update only this plan's index row after verification. Do not commit, push, merge, or open a PR without operator instruction.
>
> **Drift check first:** `git diff --stat 5e5d496..HEAD -- playwright.config.ts apps/vue/playwright.config.ts apps/foldkit/playwright.config.ts package.json scripts/verify.ts` and `git status --short -- playwright.config.ts apps/vue/playwright.config.ts apps/foldkit/playwright.config.ts`. STOP if another change already gives every browser suite its own verified server.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** LOW; **Depends on:** none
- **Category:** tests, dx; **Planned at:** `5e5d496`, 2026-09-24

## Why this matters

The current vanilla Playwright config reuses any listener on port 4173. On 2026-09-24 an older Vite process from this checkout retained a failed module resolution from before dependencies were installed; Playwright reused it and many tests failed with `Failed to fetch dynamically imported module`. Restarting that process made the full gate pass. Browser proof must be tied to the checkout and build under test.

## Current state

```ts
// playwright.config.ts:7-16
use: {
  baseURL: "http://127.0.0.1:4173",
  viewport: { height: 640, width: 960 },
},
webServer: {
  command: "OTEL_SDK_DISABLED=true bun run dev",
  reuseExistingServer: true,
  url: "http://127.0.0.1:4173",
},
```

- `apps/vue/playwright.config.ts` and `apps/foldkit/playwright.config.ts` have their own test server settings; inspect them before selecting ports.
- `package.json` runs vanilla, Vue, and Foldkit browser gates sequentially through `scripts/verify.ts:5-25`.
- `docs/standards.md:14` calls `bun run verify` the full local gate. A pre-existing process must not silently stand in for the test server.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Config smoke | `bunx playwright test apps/vanilla/e2e/shared-conformance.e2e.ts --workers=1` | exit 0 |
| Full gate | `bun run verify` | exit 0 |
| Docs | `bun run docs:check` | exit 0 if browser instructions change |

**In scope:** `playwright.config.ts`, `apps/vue/playwright.config.ts`, `apps/foldkit/playwright.config.ts`, `package.json` only if a test-specific launch command is needed, `docs/tooling.md` for test port instructions, and `plans/README.md`. **Out of scope:** production Vite behavior, feature tests, `research/artifacts/**`, package versions, killing an unrelated user server.

## Steps

1. Inspect all three configs and choose distinct test-only loopback ports that do not replace the documented development URL `http://127.0.0.1:4173/`. Configure each Playwright web server to start its own process with strict port binding and `reuseExistingServer: false`. Use a test command that builds needed workspace packages first, or retain the existing package build step. **Verify:** config smoke exits 0.
2. Add a focused test or repeatable shell check that occupies the development port 4173 with a simple unrelated HTTP responder, runs the vanilla conformance smoke case, and proves the test still mounts Flow from the dedicated test port. Ensure a temporary responder is cleaned up. If a user process already owns 4173, leave it running and use its current response for this check; do not kill it. **Verify:** the check exits 0 and Playwright does not reuse the 4173 response.
3. Run `bun run verify` sequentially with no separately launched Playwright suite. Document the test server ports and a port-occupied error remedy in `docs/tooling.md`. **Verify:** full gate and `git diff --check` exit 0.

## Test plan and done criteria

- [ ] No Playwright config uses `reuseExistingServer: true` for the project gate.
- [ ] A listener on development port 4173 cannot change the test result.
- [ ] Each suite starts the intended host from the checkout under test and the full local gate passes.
- [ ] Production `bun run dev` still serves 4173.

## STOP conditions

STOP if a required test port is reserved by user configuration and cannot be changed without a public contract decision, if the test server cannot resolve workspace packages after a clean frozen install, or if the isolation check would require killing a process the executor did not start.

## Maintenance notes

Hosted CI passing and local isolated Playwright passing are separate evidence. Keep test ports explicit and avoid random ports unless the base URL can be passed to every suite without hidden state.
