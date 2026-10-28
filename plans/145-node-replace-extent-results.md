# Plan 145 implementation evidence

Pinned xyflow revision: `0a1f9575b25679f2880175de8d3eae21aedde921`. Plan source: `bd87f43:plans/145-node-replace-measurement-and-initial-extent.md`. Branch: `plan/145-node-replace-extent`.

## Root causes and decisions

UP-128-044's replacement expectation conflicts with the pinned producer. `updateNode` merges the style patch without predicting DOM dimensions (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useReactFlow.ts:97`). The diff emits that item directly (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts:300`). Applying later dimensions creates a fresh measured object (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts:126`). Direct execution of those immutable utility functions produced an emitted `100x40`, settled `200x100`, and retained replacement `100x40`. Flow's product replacement behavior remains unchanged. The case is `intentional-difference` in all hosts and continues to execute its unchanged upstream assertions under `test.fail()`.

UP-128-072 exposed missing initial extent adoption in Vue and Foldkit, plus Vanilla's oversized-centering policy. The pinned producer adopts unknown dimensions as zero (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:157`) and reclamps after DOM measurement (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:459`). Its clamp gives the maximum precedence (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/general.ts:20`). Thus `(200,200)` under a `50x50` extent first becomes `(50,50)`, then `(-100,6)` for a measured `150x44` node. All three hosts now follow that staged rule. The upstream assertion remains unchanged and status `fail` in all hosts, as requested.

The pinned Cypress case uses `.wait(500).then(...)` with synchronous `expect`, not a retrying `.should(...)` (`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/examples/react/cypress/components/reactflow/view-props.cy.tsx:207`). A retry matching a provisional frame is therefore not an established explanation. Full call paths, fixture differences, and test boundaries are in [node extents](../research/traces/node-extents.md) and [replacement measurement](../research/traces/node-replace-measurement.md).

## Ledger counts

Columns are pass, intentional difference, fail, not applicable, and not ported. All 224 executable upstream cases remain mapped.

| Phase | Host    | Before              | After               |
| ----- | ------- | ------------------- | ------------------- |
| 126   | Vanilla | 49 / 1 / 0 / 0 / 0  | 49 / 1 / 0 / 0 / 0  |
| 126   | Vue     | 49 / 1 / 0 / 0 / 0  | 49 / 1 / 0 / 0 / 0  |
| 126   | Foldkit | 48 / 2 / 0 / 0 / 0  | 48 / 2 / 0 / 0 / 0  |
| 127   | Vanilla | 67 / 0 / 0 / 0 / 0  | 67 / 0 / 0 / 0 / 0  |
| 127   | Vue     | 67 / 0 / 0 / 0 / 0  | 67 / 0 / 0 / 0 / 0  |
| 127   | Foldkit | 67 / 0 / 0 / 0 / 0  | 67 / 0 / 0 / 0 / 0  |
| 128   | Vanilla | 99 / 5 / 1 / 2 / 0  | 99 / 5 / 1 / 2 / 0  |
| 128   | Vue     | 101 / 2 / 2 / 2 / 0 | 101 / 3 / 1 / 2 / 0 |
| 128   | Foldkit | 103 / 2 / 2 / 0 / 0 | 103 / 3 / 1 / 0 / 0 |

Vanilla's phase-128 totals stay the same because the two cases exchange categories. These counts describe ledger outcomes, not successful assertions for expected failures.

## Commands and results

- `bun install --frozen-lockfile` passed. The first ledger check had failed because the existing TypeScript installation did not expose `ScriptTarget.Latest`; reinstalling resolved it without a lockfile change.
- `bun run build:packages` passed after adding `nodeExtent` to the Foldkit connection projection's typed inputs. An intermediate build exposed that missing input.
- `bun run check` passed after focused formatting and lint fixes.
- `bun run tsc --noEmit` passed.
- `bun run test` passed, 2,595 tests across 105 files. The first full unit run found one additional Flow-owned origin assertion expecting oversized centering. Its expected physical position is now `(-40,-40)` with a pinned clamp citation.
- `bun run vitest run packages/foldkit/src/canvas-options.test.ts` passed all 22 tests after adding public internal-node projection coverage.
- `bun run vitest run packages/core/src/domain/flow-node-extent.schema.test.ts packages/core/src/domain/flow-graph.test.ts packages/core/src/domain/flow-element-changes.test.ts packages/vue/src/drag-constraints.test.ts packages/foldkit/src/canvas-options.test.ts packages/foldkit/src/closing-options.test.ts` passed, 77 tests across six files.
- `bun run research:check-traces` passed, 3,351 citations across 89 traces. Existing citations shifted by these source edits were remapped; the extent trace was rewritten and a replacement trace added.
- `bun run scripts/check-upstream-test-ledger.ts` passed before and after the ledger edits. Counts are above.
- `bun run docs:check` passed, including generated-schema freshness and 20 Markdown files with source-backed examples. `docs/public-api.md` contains no centering description requiring replacement.
- `bun run verify --list` confirmed the focused profile, ten selected extra checks, and 56 Vanilla, 54 Vue, and 65 Foldkit browser files. Every existing verification entry is preserved; exactly one new browser file was appended per host.
- `git diff --check` passed. Direct comparisons confirmed both upstream assertion files and `research/artifacts/` are unchanged.

Targeted browser commands used the lock wrapper and `--workers=1`:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/node-extent-adoption.e2e.ts apps/vanilla/e2e/upstream-component.e2e.ts --grep 'UP-128-044|UP-128-072|reclamps an initially' --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/node-extent-adoption.e2e.ts apps/vue/e2e/upstream-component.e2e.ts --grep 'UP-128-044|UP-128-072|reclamps an initially' --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/node-extent-adoption.e2e.ts apps/foldkit/e2e/upstream-component.e2e.ts --grep 'UP-128-044|UP-128-072|reclamps an initially' --workers=1
```

The first Vanilla run exposed that the upstream selector adapter installs a ledger-only hook. The Flow-owned test now uses native host selectors without that classification hook. Vanilla and Vue then passed their initial three-case targeted runs, including two expected failures. The added Foldkit drag check exposed auto-pan interference near the viewport edge and the need to select the node before keyboard movement. The Flow-owned gesture now pans the node into view and selects it through a real click before keyboard input.

The queued targeted gesture reruns were cancelled before acquiring the lock, so they would not duplicate the required verification.

The first locked `bun run verify` passed the baseline and extra checks, then Vanilla completed with 856 accepted tests and 4 skips. Vue reported 987 accepted tests, 2 skips, and one unexpected failure in its existing combined extent/expandParent test. The new settled extent test passed. Foldkit was not reached in that run.

The regression came from mixing DOM measurements of an `expandParent` preview into accepted extent geometry. A repeatable actor census showed the correct preview child at absolute `(230,30)`, with the owner still holding local `(280,210)`. Clearing the preview before drop validation reclamped the old parent from `(300,80)` to `(270,80)` and cancelled the drop. The accepted graph now retains starting dimensions for unchanged parents during preview, and the drop is calculated before detachment. Live preview geometry stays separate. No assertion was weakened.

The census is committed in `apps/vue/e2e/node-extent-adoption.e2e.ts`. Its `testInfo.attach` records each actor; use `--reporter=json` to retain the snapshots. The original regression, census, and settled extent test passed together in three repetitions, 9/9:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/canvas-configuration.e2e.ts apps/vue/e2e/node-extent-adoption.e2e.ts --grep 'nodeExtent, parent extents|reclamps an initially|parent preview measurement' --workers=1 --repeat-each=3
```

The final Foldkit targeted command above passed all three cases, including its settled extent test and two expected failures. An earlier census draft had a missing test import and then used a live public read as owner state; the final census uses the controlled owner's `ownerNodes()` and separates that state from displayed geometry.

The second locked run passed Vanilla, 856 accepted and 4 skipped, and Vue, 989 accepted and 2 skipped. Foldkit completed with 622 accepted tests and one unexpected failure at `apps/foldkit/e2e/layout-recipes.e2e.ts:117`: expected layout count 2, received 3. Every Plan 145 test and all upstream runners completed with their expected ledger outcomes.

Ownership was checked in an isolated untouched `bd87f43` worktree, without any Plan 145 edits:

```sh
git worktree add --detach /tmp/flow-plan145-baseline bd87f43
# In that worktree:
bun install --frozen-lockfile
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/layout-recipes.e2e.ts --grep 'dagre-tree lays out measured' --workers=1 --repeat-each=30 --max-failures=1
```

The baseline produced 29 passes, then the identical expected-2/received-3 failure in repetition 29. The initial baseline invocation used an anchored grep that matched no test; the command above is the corrected run. This establishes that the identical layout assertion failure predates Plan 145. Plan 146 independently addresses it in commit `790db78`; that repair was not merged or copied into Plan 145. No claim about its failure frequency is made. The isolated baseline worktree is removed after use.

The final required command was:

```sh
scripts/with-flow-browser-lock.sh bun run verify
```

It ran the configured **focused** profile with all existing checks and browser selections preserved: 56 Vanilla, 54 Vue, and 65 Foldkit browser files, 175 files total. It supplied `--workers=1` to every browser runner. All three upstream runner families, Playwright, Cypress ports, and component ports, executed in all three hosts. The selected extent, drag, node-change, follow-up, and new Flow-owned suites ran as part of this scope.

Final results:

| Gate | Result |
| --- | --- |
| Quality, architecture, package builds, typecheck | Passed |
| Unit tests | 2,595 passed across 105 files |
| API members, catalog, packed consumers, docs, examples, application builds, traces, ledger | Passed |
| Vanilla browser tests | 856 accepted, 4 skipped |
| Vue browser tests | 989 accepted, 2 skipped |
| Foldkit browser tests | 622 accepted, 1 unexpected failure |
| Overall focused verifier | **Exit 1**, Foldkit layout failure |

The final failure is `apps/foldkit/e2e/layout-recipes.e2e.ts:219`, the auto-layout selected-parent child assertion. It received child y `254.9732666015625`, below the parent's bottom `288.5049743652344`. Every Plan 145 behavior test passed, including the new settled-size checks in all three hosts, Vue preview ownership, and the unchanged upstream cases with their recorded expected-failure outcomes. “Accepted” browser counts include those existing expected failures and do not mean that their assertions passed.

That exact auto-layout assertion was then checked on untouched `bd87f43`, again under the lock, with one worker:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/layout-recipes.e2e.ts --grep 'auto-layout re-runs when nodes are added or removed' --workers=1 --repeat-each=30 --max-failures=1
```

It produced 11 passes, then failed the identical line-219 assertion in repetition 11: child y `250.6696014404297` was below parent bottom `283.00921630859375`. The remaining 18 repetitions were not run because `--max-failures=1` stopped the ownership probe. This establishes that both observed layout assertions fail without Plan 145 changes. It does not establish their failure frequency or exclude timing effects on that frequency. The temporary baseline worktree was removed again. Raw validation logs are `/tmp/flow-plan145-verify-first.log`, `/tmp/flow-plan145-verify-second.log`, `/tmp/flow-plan145-verify.log`, `/tmp/flow-plan145-layout-baseline.log`, and `/tmp/flow-plan145-auto-layout-baseline.log`.

## Limits

Plan 145 behavior checks passed, but complete focused-profile acceptance remains blocked by independently reproduced Foldkit layout failures. `verify:full` was not run, and no broad xyflow parity is claimed. Expected upstream failures remain explicit. The provisional stage is deterministically asserted in core; browser coverage asserts settled measurements, movement, and a later public update. No pinned React browser replay or collector-side OpenTelemetry test was performed. Nested global extent combinations and the other unverified boundaries are listed in the extent trace. No push or merge is authorized or performed.
