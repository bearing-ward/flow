# Plan 146: Foldkit layout recipe flake

Starting point: `e780ee8`. `apps/foldkit/e2e/layout-recipes.e2e.ts` fails about one run in three, including on untouched main. Failures have been seen at :178, :209 and :281. The :209 case clicks node 3 to select it, presses add-child, and polls `layouts(page)`.

## Scope and acceptance

Diagnose before changing anything.

1. Run the file repeatedly, at least 15 times, under `scripts/with-flow-browser-lock.sh` with one worker, and record the failure rate, which assertions fail and their traces in `/tmp/plan146/`.
2. Find the race in product or fixture code. Candidates: the click-to-select acknowledgement versus the add-child command (compare Plan 129's controlled select race), layout-run counting, or measurement and fit timing after the Plan 144 padding change.
3. Name the root cause with evidence.

Fix the cause:

- If it is a product race, fix the product and add a deterministic test for it.
- If it is fixture readiness, wait on an observable readiness signal, as Plan 130 did.

Do not add sleeps, retries, wider tolerances or weaker assertions. Keep the React-example semantics cited in the file.

Acceptance: 30 consecutive passes of the file, plus the full Foldkit upstream and layout-related suites.

## Execution

- Add entries to `verification.config.json`; never remove any.
- Remap any trace citations that shift, then run `bun run research:check-traces` and `bun run docs:check`.
- Finish with the locked `bun run verify`, and report its profile and scope.
- Commit on `plan/146-foldkit-layout-flake` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
