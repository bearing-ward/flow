# Plan 161: get the full verification profile green

Starting point: main after Plan 160. `bun run verify:full` has not passed since Plan 151. The record is in `plans/152-resize-completion-node-changes.md` (lines 46–72 on the Plan 152 branch, merged into main):

- `apps/vanilla/e2e/performance.e2e.ts` times out at its 180-second deadline during fixture setup.
- Run on its own, the test passed on `c6cee41`, which is before Plan 152. It timed out on the Plan 152 tree.
- Unfiltered full runs also showed intermittent failures: Vanilla calibration navigation, `[UP-128-075]` setup, `[UP-126-003]` selection, and two Vue connection-threshold harness mount timeouts.

## Scope and acceptance

1. **Bisect the timeout.** Find the first commit between `c6cee41` and current main where the isolated performance test fails. Run it under `scripts/with-flow-browser-lock.sh` with one worker, three runs per commit, and record the timings in `/tmp/plan161/`.
2. **Profile and fix the root cause.** Profile the fixture setup at the first failing commit, using the CPU profile or trace and Flow telemetry spans. Fix the cause in product code. If a merged plan added work per node or per edge on mount, measure, or render, make it proportionate.
   - Do not raise the deadline.
   - Do not shrink the fixture.
   - Do not weaken the assertions.
3. **Fix the intermittent failures.** For each one, reproduce it with `--repeat-each` inside the full ordering, then fix its cause by waiting on observable readiness, as Plans 130 and 146 did. Do not use sleeps, retries or wider tolerances.
4. **Acceptance.**
   - The isolated performance test passes 5 out of 5 runs, and its timing is within 10% of the `c6cee41` baseline. If it isn't, report the remaining gap with a profile.
   - Two consecutive locked `bun run verify:full` runs pass.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each command, and never wrap an interactive shell in it.
- Write a research trace that ends with a Conformity and deviations section.
- Commit on `plan/161-full-profile` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
