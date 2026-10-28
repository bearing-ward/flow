# Plan 180: ownership suite reduction

Status: implemented and fully verified. Ownership source is 18,484 to 2,303 lines; all e2e TypeScript is 103,000 to 86,680 lines. See the [assertion map and verification evidence](../research/traces/180-ownership-suite-reduction.md).

Plan 179 item 1 asked for at least a 70% line reduction in the Vue and Vanilla `node-threshold` suites and their reentry harnesses. The plan said to keep one representative case per matrix axis and to move the synthetic ordering logic into unit tests.

What happened instead is that most of that code moved into new behavior-named suites. Those suites and their harnesses now total 18,484 lines:

- `apps/vanilla/e2e/renderer-ownership{,-harness}.ts`
- `apps/vanilla/e2e/gesture-ownership{,-harness}.ts`
- `apps/vue/e2e/gesture-ownership{,-harness}.ts`
- `apps/vue/e2e/viewport-ownership{,-harness}.ts`
- any other `*-ownership*` files

They still carry the generated matrices, for example `completion watcher ${route} mounted ${mounted} controlled ${controlled} threshold ${threshold}` and `literal drain ${claimRoute} ${liveCase.live} …`. Only 224 lines of unit tests were added (`packages/core/src/domain/flow-interaction-order.test.ts`). This plan finishes the reduction.

## Target

Cut the `*-ownership*` suites and harnesses by at least 70% in total, from 18,484 lines to about 5,500 or fewer.

- **Collapse each generated matrix.** A nested loop over independent axes becomes one case per axis value. Keep the full cross product only for a pair of axes that actually interacts, and record the reason in the trace.
- **Move synthetic ordering into unit tests.** That covers reentry, disposal, supersession and watcher-drain checks driven by `dispatchEvent` or `page.evaluate`. Put the tests in the package that owns the logic: `packages/core`, or `packages/vue` / `packages/foldkit` adapter tests for host lifecycle.
- **Keep per-host browser cases** for native pointer and keyboard paths, real DOM effects, and React-parity values.
- **Merge the harnesses.** The Vanilla and Vue harnesses repeat each other; where they do, share them through `apps/shared-e2e`.

## Rules

- Extend `research/traces/179-browser-test-consolidation.md`, or add `research/traces/180-ownership-suite-reduction.md`. Map every removed assertion to a kept browser test, a unit test, or a recorded deliberate drop. End the trace with a Conformity and deviations section.
- Update the catalog, proof-matrix, contract and example-recipe evidence references for any titles or files that change.
- Report the following before and after: lines per file, browser test count per host, unit tests added, and the locked wall-clock per host.

## Execution

- Prepend `$HOME/.bun/bin` to `PATH` so that the pinned Bun 1.4.3 is used.
- Take the browser lock separately for each browser command (`scripts/with-flow-browser-lock.sh`). Stop only processes you started, by their recorded PIDs. Never kill processes by name or port, and never wrap an interactive shell in the lock.
- Unit tests use `it` inside `describe`.
- Finish with a locked `bun run verify --full`.
- Commit on `plan/180-ownership-suite-reduction` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
