# Plan 161: get the full verification profile green

Starting point: main after Plan 160. `bun run verify:full` has not passed since Plan 151. The record is in `plans/152-resize-completion-node-changes.md` (lines 46 to 72 on the Plan 152 branch, merged into main):

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

## Execution record

The work starts from `7d78b9b` on `plan/161-full-profile`. The diagnostic trace and complete local timing evidence are in [full-profile-green.md](../research/traces/full-profile-green.md) and [plan161-diagnosis.json](../research/benchmarks/plan161-diagnosis.json).

The timeout did not reproduce in isolation: `c6cee41`, the Plan 152 implementation `aeabc25`, and `7d78b9b` each passed three runs in independently installed and built worktrees under `/tmp/plan161/`. There was no valid failing endpoint, so no first bad commit was established. The user attributes the historical timeout to concurrent-agent load and authorized repairing the profiled scaling problem.

CPU samples locate the cost in per-node whole document/state validation and repeated unchanged measurement projections. Internal measurement helpers now trust accepted domain values, while incoming samples retain schema validation and generation rejection. The Vanilla host retains the derived projection when measurement state is unchanged. A regression counts validation field reads for documents with 1, 100, and 1,000 nodes: all three fail before the repair and pass afterward, with zero document-validation reads and one sample validation. Existing measurement rejection assertions are unchanged.

The isolated test's median duration falls from 122.817 seconds across three current-tree runs to 13.399 seconds across the first three fixed runs. The complete fixed acceptance set passes 5/5, with median 13.492 seconds and range 13.378 to 13.660 seconds. Both CPU profiles cover the final navigation only; sampled time in `applyNodeMeasurements` falls from 18.158 to 0.253 seconds. No deadline, fixture, or benchmark assertion changes.

The ordered repeat reproduces the scoped Effect test failure as HTTP 504, `Outdated Optimize Dep`, fetching `/@id/effect`. A normal Vite-resolved fixture import fixes that failure. A Deferred and a delivered ResizeObserver cycle replace its two fixed sleeps. The saved data-only `onHandleRender` interruption was caused by the agent's deliberate SIGINT; the test passes 50 focused repetitions unchanged. Both named cases pass 100/100 focused repetitions together.

Resumption on `plan/161-full-profile-r2` merges `main` at `5fda81a`, including Plan 162 code and the Plan 163 planning document. Exact source-line remapping updates 1,030 citations in 68 traces. The two named Vanilla cases pass 20/20 merged-tree repetitions. The unchanged isolated performance test passes 5/5 merged-tree repetitions with a 13.943-second median and 13.611 to 14.683-second range. Package build, typecheck, quality check, 2,805 unit tests, calibration registry, and trace check pass. Locked focused verification passes with 981 Vanilla tests and four skips, 1,114 Vue tests and two skips, and 738 Foldkit tests.

The first resumed full attempt was invalidated by macOS Clamshell Sleep from 14:27:55 to 15:30:40. Its 11 late Vue timeouts passed in the next run at normal speed. Two consecutive locked, awake `bun run verify:full` runs then passed with 1,010 Vanilla tests and four skips, 1,141 Vue tests and two skips, and 744 Foldkit tests each. Their verifier elapsed times were 1,580.044 and 1,583.896 seconds. Configuration changes are additive, imported evidence is unchanged, and all earlier calibration records are preserved. The detailed record is in [full-profile-green.md](../research/traces/full-profile-green.md).
