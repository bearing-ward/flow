# Plan 179: browser test consolidation

The maintainer approved consolidating and removing low-value browser tests on 2026-10-28. The host suites hold 270 files and about 77k lines, and they are the main cost of `verify:full`.

The goal is fewer, behaviour-named tests. Where hosts share a contract, `apps/shared-e2e/*-contract.ts` holds it and each host runs it. Core logic moves to unit tests.

## Rules

- Before deleting or merging any browser test, map each distinct assertion to the place that still covers it: a kept browser test, a shared contract, or a new unit test. If an assertion is intentionally dropped, record why.
- Record the mapping in `research/traces/179-browser-test-consolidation.md`, and end that trace with a Conformity and deviations section.
- Native pointer and keyboard coverage must stay per host. Synthetic `dispatchEvent` coverage of core logic may move to unit tests.
- Do not touch `upstream-playwright.e2e.ts` or other upstream-ledger ports.
- When a file or test title is renamed or removed, update every reference to it:
  - the catalog evidence, `proof-matrix.json`, the API member contracts and the example-recipe registry;
  - `verification.config.json`.

## Changes

1. **`node-threshold.e2e.ts` in Vue (6,729 lines) and Vanilla (4,714 lines), plus each host's `node-reentry-harness.ts`.**
   - The tests are named after review rounds ("round four Q-E…"). The nested loops expand to about 350 cases, for example `liveClaimCases` at about Vue line 1238: 11×2×3×2.
   - Move the reentry and disposal ordering logic into unit tests in the package that owns it.
   - In the browser, keep:
     - one representative case per matrix axis;
     - the shared `nodeThresholdContract`, which Foldkit already runs in 465 lines.
   - Target at least a 70% line reduction across the two files and their harnesses.
2. **Cross-host copies.**
   - `intersection-recipes` differs only by its node selector. Make it one shared contract.
   - Do the same for `edge-geometry-recipes`.
   - `schema-studio` (Foldkit vs Vanilla, a 143-line diff): put the shared app's behaviour in one contract. Each host keeps its host-specific cases.
   - `interaction-lifecycle` in Vue and Foldkit is about 3.2k lines each, written separately against `apps/shared-e2e/interaction-lifecycle-contract.ts`. Drive both from shared contract code.
   - Delete the Vanilla test that only checks the contents of the fixture array (about lines 996–1011).
3. **Files named after delivery phases.**
   - Move the unique cases from these files into behaviour-named files, and drop the overlaps:
     - `next-slices`
     - `final-wiring` (Vanilla, Vue)
     - `movement-slices`
     - `flow-followups`
     - `closing-options`
     - `closing-gaps` (Vue, Foldkit)
     - `closing-recipes`
   - Known overlaps:
     - selection and culling with `canvas`;
     - resize and `expandParent` with `interaction-lifecycle`;
     - auto-pan between `movement-slices` and `closing-options`;
     - viewport operations with `viewport-operations`.
   - Deduplicate `canvas`, `canvas-ui` and `canvas-ui-contract`. They overlap on the background, controls and panels.
4. **Small items.**
   - Delete the two `test.fixme` placeholders in Vanilla `advanced-gestures.e2e.ts` (about lines 914 and 918), whose bodies only throw.
   - Replace fixed `waitForTimeout` calls with `expect.poll` or frame waits.
   - Where `toHaveClass(/selected/)` stands in for selection state, assert `aria-selected` or the public change event instead.
   - Reduce `vue/e2e/demo.e2e.ts` and `vanilla/e2e/playground.e2e.ts` to one smoke test each.

## Execution

- Prepend `$HOME/.bun/bin` to `PATH`, so that Bun 1.4.3 is used.
- Before any change, run each host's full browser suite once, locked, and record its test count and wall-clock. After the work, do the same again and report both.
- Take the browser lock separately for each browser command (`scripts/with-flow-browser-lock.sh`). Stop only the processes you started, using their recorded PIDs. Never kill processes by name or port, and never wrap an interactive shell in the lock.
- Tests use `it` inside `describe` for vitest. Playwright files keep their existing style.
- Plan 177 is replacing the focused-list model in `verification.config.json`. Edit that file only to rename or remove entries for files you rename or delete.
- Finish with a locked `bun run verify --full`.
- Commit on `plan/179-browser-test-consolidation` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
