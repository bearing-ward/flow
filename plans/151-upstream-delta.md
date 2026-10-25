# Plan 151 upstream delta

## Pins and scope

Flow starts at `15191b9`. The old upstream revision is `0a1f9575b25679f2880175de8d3eae21aedde921`, React 12.11.6 and system 0.0.82. The new revision is release commit `3d35b57317576b0916c0bfeaaedd573aaacc2839`, tagged `@xyflow/react@12.12.0` and `@xyflow/system@0.0.83`. This is a fixed release pin.

The comparison covers every file in `packages/system`, `packages/react`, `tests/playwright`, and `examples/react`. The upstream Git diff contains five changed files, 46 insertions, and 11 deletions. They are the two package manifests, two changelogs, and `packages/system/src/xyresizer/XYResizer.ts`. No files were added or deleted. The importer also includes Svelte, whose manifest and changelog change in this release.

Both artifact revisions remain. Historical captures, fixtures, API member audit pages, and the scoped proof matrix retain their original revision and measured boundary. Changing their metadata would falsely label old observations as new captures. Active upstream test enumeration, the test ledger, React reference imports and result reasons, release license provenance, generated inventory, and relative research trace citations use the new pin. Artifacts were generated with `bun run research:import`; none were hand-edited in this plan.

The old snapshot already differs from its own `FILES.tsv` in three configuration files: `examples/react/tsconfig.node.json`, `packages/react/tsconfig.json`, and `packages/system/tsconfig.json`. Those inherited configuration edits are not upstream release changes. This plan preserves the received historical snapshot and imports the new snapshot from Git. The receipt separates these snapshot differences from the upstream tree delta.

## Upstream commits and release notes

The complete revision range has five commits:

- [`a87e24b709189e1a37bc233f93b97de90a026ffb`](https://github.com/xyflow/xyflow/commit/a87e24b709189e1a37bc233f93b97de90a026ffb) implements both resize fixes.
- [`91a4adf4f901d2c59ed77486bc0d3ec6d3843423`](https://github.com/xyflow/xyflow/commit/91a4adf4f901d2c59ed77486bc0d3ec6d3843423) adds the changesets cited by the changelogs.
- [`159995fe7af20daedd80492193023995036fa346`](https://github.com/xyflow/xyflow/commit/159995fe7af20daedd80492193023995036fa346) merges PR #5998.
- [`8716946b6b7f537a29049767f1a8d16c2965fe14`](https://github.com/xyflow/xyflow/commit/8716946b6b7f537a29049767f1a8d16c2965fe14) updates package versions and changelogs.
- [`3d35b57317576b0916c0bfeaaedd573aaacc2839`](https://github.com/xyflow/xyflow/commit/3d35b57317576b0916c0bfeaaedd573aaacc2839) merges release PR #6034.

The new imported `packages/react/CHANGELOG.md:3-20` and `packages/system/CHANGELOG.md:3-14` name both changes. The React minor release changes the callback lifecycle; its patch entry fixes rejected resize values. These links refer to the immutable new snapshot under `research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/`.

## Behavior changes

1. Every started resize now invokes `onResizeEnd`, including a press/release with no motion and a gesture where `shouldResize` rejects every proposal. Upstream removes the `resizeDetected` gate from the end handler.
2. The now-unconditional internal `onEnd` also reaches `NodeResizeControl`, which publishes a `dimensions` change with `resizing: false`, including gestures without an accepted step. This observer notification is separate from `onResizeEnd` and geometry mutation.
3. A rejected proposal restores the previous accepted rectangle, adjusted start position, and direct child positions. Upstream snapshots those values before mutation and restores them when `shouldResize` returns false. The end callback and later resize proposals therefore use accepted state.

### Fixed in Flow

All three hosts previously advanced the shared resize session before consulting `shouldResize`. They now adopt the proposed session only after acceptance. Core's immutable proposed session already contains all three rollback values, so retaining the prior session restores the complete state without mutable rollback logic. Vanilla and Foldkit also emit the end callback when no step was accepted. Vue already did so.

The React reference fixture and each Flow host test no motion, full veto, and an accepted left-edge resize followed by a veto. They assert callback names, literal final bounds, and committed geometry. These are 12 Flow-authored release regression cases, three per host including React, separate from the unchanged upstream ledger cases. Two existing Foldkit assertions now require the new end callback instead of its old suppression.

The React reference fixture extractor also moves its compiler API import from `typescript` to the existing `typescript-api` alias. TypeScript 7's runtime package lacks the AST APIs used by this extractor. This pre-existing reference-host gate failure is unrelated to the xyflow release.

### Follow-up

Follow-up plan: match completion-only `onNodesChange` notifications.

The new unconditional system end callback reaches `packages/react/src/additional-components/NodeResizer/NodeResizeControl.tsx:162`, which publishes a `dimensions` change with `resizing: false` at line 172 even when geometry did not change. Flow's existing resize protocols derive node changes from semantic geometry updates. Vanilla gates publication on changed bounds (`apps/vanilla/src/mount-flow.ts:8987`); Vue's control emits `resizeEnd` without publishing another geometry update (`packages/vue/src/node-resizer.ts:430`); Foldkit clears a session with no preview without a semantic change (`packages/foldkit/src/graph.ts:3036`), and element-change projection consumes semantic publications (`packages/foldkit/src/application.ts:1848`).

This identifies a source-path gap; executable parity for that observer notification remains unverified. Matching it needs a shared lifecycle-to-node-change contract across the three adapters while preserving atomic document updates. The follow-up packages that contract with observer tests.

The follow-up plan is:

1. Record React `onNodesChange` after initial measurements settle for no motion, full veto, and accepted-then-vetoed gestures. Preserve the original end payload, including `resizing: false` and last accepted dimensions.
2. Implement the shared completion-notification projection in `packages/`, with adapter lifecycle wiring for Vanilla, Vue, and Foldkit. Keep zero-motion/vetoed document geometry unchanged and preserve callback error boundaries.
3. Add literal cross-host observer assertions for controlled and uncontrolled flows, duplicate-end prevention, and unmount/removal. Keep the current 12 callback/geometry regressions and all upstream assertions intact. Run the locked four-host proof and full verifier.

The completed release regression boundary is Chromium mouse input, callback order, accepted rectangles, and committed geometry. Existing unverified native pointer, device, cancellation, and broad resize combinations remain outside that boundary. This plan does not convert those older gaps into parity claims.

## Public API and catalogs

New public API: none. Changed declarations, signatures, exports, and type members: none. Deleted public API: none. The behavioral changes affect existing `NodeResizer` and `NodeResizeControl` callbacks and veto semantics.

`bun run research:inventory` regenerates the API source inventory. Comparing all React and system declaration names and kinds against the baseline yields no changes. Direct source comparison confirms that the sole implementation change is inside `XYResizer`, with no public signature change. All React examples and Playwright sources are byte-identical between revisions.

Rechecked `research/catalogs/react-flow-2026-09-26.json` and `research/catalogs/api-members.json`: both affected components and their existing `onResizeEnd` and `shouldResize` members are already cataloged. No new catalog or parity audit entries are needed, so no new ratings are introduced. The dated catalog and prior ratings retain their existing evidence scope.

## Upstream tests and ledger

New tests: none. Changed tests: none. Retired tests: none. All files under `tests/playwright` and `examples/react/cypress` are unchanged. The existing phase scheme remains justified: phase 126 contains 50 Playwright tests, phase 127 contains 67 Cypress E2E tests, and phase 128 contains 107 component tests. All 224 identities, guards, titles, assertion bodies, port locations, and host classifications remain intact.

The 31 utility cases run through Vitest for Flow and original upstream bodies in Chromium for React. The other 193 ledger cases use the browser ports. React continues to run its own outcomes without inheriting Flow classifications.

Every status change is recorded in `151-upstream-evidence.json`. All 224 React reason fields now record the new-version run, including reproduction of the five expected failures. The receipt groups these reason-only updates by exact before/after text and lists every affected ID. No host or React classification changes. Current comparison against `15191b9`:

| Host | Status changes | Pass | Fail | Intentional difference | Not applicable |
| --- | --: | --: | --: | --: | --: |
| Vanilla | None | 215 | 2 | 5 | 2 |
| Vue | None | 217 | 2 | 3 | 2 |
| Foldkit | None | 218 | 2 | 4 | 0 |
| React reference | None | 219 | 5 | 0 | 0 |

These are ledger classifications, including expected failures and explicit skips. Verification results below distinguish passing test commands from universal assertion success.

## Citation remapping

`scripts/remap-upstream-citations.py` uses equal-line blocks between upstream snapshots and between Flow commit `15191b9` and the current source. It never estimates line offsets or fuzzy-matches text. It maps every cited endpoint in changed upstream files, including comma-separated ranges. A changed or deleted cited line fails for explicit research. It reads the old citations from Flow commit `15191b9`, making repeat runs idempotent, and writes only after all mappings succeed.

`151-citation-remap.json` verifies 1,077 endpoints in changed files. It records nine upstream endpoint remaps across `gesture-resize-lifecycle.md`, `interaction-parity-next.md`, and `nested-resize-containment.md`, plus 150 Flow endpoint remaps across 26 other traces. The other 918 endpoints retain their line numbers. Each old and new line has identical text. No unresolved endpoints remain. Aligned baseline trace lines make reruns idempotent even when a generated line number also appears among the old citations. Trace conclusions add the release's resize boundary; historical captures keep their older pin.

## Reproduction and verification

Regenerate the receipts with:

```sh
bun run research:inventory
python3 scripts/audit-upstream-refresh.py 15191b9 > plans/151-upstream-evidence.json
python3 scripts/remap-upstream-citations.py 0a1f9575b25679f2880175de8d3eae21aedde921 3d35b57317576b0916c0bfeaaedd573aaacc2839 --source-ref 15191b9 > plans/151-citation-remap.json
bunx oxfmt plans/151-upstream-evidence.json plans/151-citation-remap.json
bun run research:check-traces
```

The locked React release regressions pass 3/3 on 12.12.0. A detached Flow baseline at `15191b9`, with only the authored regression tests copied in, reproduces seven behavior failures:

| Baseline host | Passed | Failed | Observed mismatch |
| --- | --: | --: | --- |
| Vanilla | 1 | 2 | Missing end callback for no motion and full veto |
| Vue | 1 | 2 | End callback reports rejected bounds for full veto and accepted-then-vetoed motion |
| Foldkit | 0 | 3 | Missing end callbacks without acceptance; rejected bounds after an accepted step |

The baseline uses a separate detached worktree, a frozen install, and package builds. Every browser invocation uses `scripts/with-flow-browser-lock.sh` and `--workers=1`.

Both required final locked verification commands passed. Their results are recorded below. `verification.config.json` preserves every prior check and browser file and adds inventory, proof, and React reference checks. The existing browser scope already includes all changed Flow test files.

## Command results

- `git switch -c plan/151-upstream-12.12`: created the requested branch from `15191b9`.
- Upstream `git log`, `git diff --stat`, `git diff`, and `git tag --points-at`: confirmed the fixed release tags, five commits, five changed in-scope files, and no test or public declaration changes.
- `bun run research:import`: passed for the new release commit.
- `bun install`: updated only the reference xyflow package pins and lockfile records. The first frozen install correctly rejected the changed manifest; a final `bun install --frozen-lockfile` passed without changes.
- `bun run research:inventory`: passed; 649 source inventory files remain. `python3 scripts/audit-upstream-refresh.py 15191b9`: passed, including new artifact Git object integrity, unchanged declaration inventory, and the explicit empty new/retired/status-change lists.
- `python3 scripts/remap-upstream-citations.py OLD NEW --source-ref 15191b9 --write`: passed with 1,077 exact endpoint checks, 159 remaps, and no unresolved lines. Repeated receipt comparisons passed. Citation JSON was byte-identical before formatting, and the formatted receipt data also matches. After the local citation remaps and follow-up documentation, quality and trace checks were rerun against the updated artifacts.
- `bun run research:check-traces`: passed. The final count includes the new release trace.
- `bun run scripts/check-upstream-test-ledger.ts`: passed for all 224 cases.
- `bun run scripts/check-api-members.ts`: passed for 114 pages and 2,692 members.
- `bun run scripts/check-react-flow-catalog.ts`: passed for 208 entries and 200 capabilities. This checks the dated catalog and local evidence, not current website drift.
- `bun run scripts/check-proof-matrix.ts`: passed for the existing scoped proof record, retaining its historical pin.
- `bun run scripts/check-api-member-contracts.ts` and `bun run scripts/check-benchmark-calibration.ts`: passed their structural registry checks. They do not establish semantic closure or a new timing calibration.
- `bun run docs:check`, `bun run check:architecture`, and `bun run check`: passed after scoped edits. Early quality findings in authored tests were corrected. The owned-source whitespace check passes. `git diff --cached --check` flags original whitespace and CRLF in the imported snapshot; those bytes are preserved. All 649 staged upstream files match the exact blob IDs and modes in `FILES.tsv`.
- `bun run --cwd apps/react-reference typecheck`: passed after fixing the pre-existing compiler API import.
- `bun run build:packages` and `bun run typecheck`: passed.
- `bun run test -- scripts/upstream-test-cases.test.ts apps/react-reference/fixture-source.test.ts`: 4/4 passed.
- `bun run test -- packages/foldkit/src/canvas-options.test.ts packages/core/src/domain/flow-node-resizer.test.ts`: 34/34 passed after building packages. The first attempt lacked the core package build; an authored release-event expectation was corrected to read the release publication rather than the earlier start publication.
- `bun run test`: 2,598/2,598 passed across 106 files.
- Locked `bun run playwright test --config apps/react-reference/playwright.config.ts apps/react-reference/e2e/resize-regression.e2e.ts --workers=1`: 3/3 passed.
- Detached baseline locked Playwright runs, selecting `--grep '12.12.0 resize'` and `--workers=1`: reproduced the seven behavior failures in the table above, after correcting the authored Foldkit selector. The Vanilla command uses the root Playwright config; Vue and Foldkit use their app configs. These are negative-control results, not acceptance runs.
- First locked `bun run verify --check reference-host`: all checks, React, Vanilla, and Vue passed; the Foldkit suite reported three authored locator errors. The selector now targets the left line control exactly. The final focused run passed with all configured checks and existing browser scope preserved: 2,598 unit tests; React 228 accepted cases; Vanilla 859 accepted / 4 skipped; Vue 992 accepted / 2 skipped; Foldkit 629 accepted.
- Locked `bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/node-resizer.e2e.ts --workers=1`: 10/10 passed, including all three release regressions and the updated existing veto assertion.
- Locked React diagnostic selection `--grep '12.12.0 resize|UP-128-(003|044|046|053|072)' --workers=1 --reporter=json`: eight expected outcomes, zero unexpected outcomes. All three resize assertions pass with the exact left line control. The five recorded React failures reproduce their original assertion mismatches: missing measured fields, stale replace measurements, absent `positionAbsolute`, the sole-mousemove threshold rebase, and settled node extent position.
- Final locked `bun run verify:full`: passed. The full profile ran quality, architecture, package builds, typechecking, 2,598 unit tests, every extra registry/contract/build/consumer check, and all browser files: Vanilla 890 accepted / 4 skipped; Vue 1,020 accepted / 2 skipped; Foldkit 636 accepted. All Playwright runs used one worker. Existing expected failures and skips retain their ledger reasons.

Both final commands run sequentially inside one `scripts/with-flow-browser-lock.sh` invocation. The verifier supplies `--workers=1` to every browser suite. Full verification does not include the opt-in React check unless requested; the preceding focused reference check covers all 228 React cases. The 219 passing React ledger assertions and five recorded assertion failures are unchanged; the 228 accepted reference cases also include the existing diagnostic and three new release regressions. The full run appended three calibration records, one per host, without changing any of the existing 165 records. These are pre-commit working-tree observations; no comparative performance result is claimed.

## Conformity and deviations

The callback lifecycle and rejected-session behavior conform within the 12 authored Chromium cases across all three Flow hosts and React. Completion-only node-change notification parity remains an explicit follow-up at its separate observer boundary. Immutable session ownership is an intentional architectural difference from upstream mutable rollback; its observable bounds and callbacks must match within the stated tests. Existing ledger intentional differences and expected failures retain their explicit reasons. This refresh alone does not establish whole-library parity.
