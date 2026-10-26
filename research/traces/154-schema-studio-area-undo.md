# Plan 154 Schema Studio area undo regression

Undo restores the Schema Studio note's authored size, but Plan 154 leaves its enlarged DOM measurement in the Foldkit graph. Both fitting and rendering prefer that measurement. The stale measurement makes Show all fit the enlarged bounds and leaves the Sales heading outside the rendered viewport.

## Comparison and observed evidence

The unchanged Foldkit S9 browser test passes at `3c8d895`, the commit before Plan 154, and fails at `da9acb9`. Both runs use the same locked dependencies, Chromium, and one worker. The failure waits for `heading-sales-area` at `apps/foldkit/e2e/schema-studio.e2e.ts:604` and the snapshot contains Lost in canvas.

Temporary browser diagnostics at the measurement and fit entry points on `da9acb9` capture these values:

- The first Prices note DOM wrapper has generation 16 and dimensions 260 by 150. After culling and recreation, its wrapper has generation 27.
- During the huge resize, generation 27 reports dimensions up to 12,791 by 12,741.
- After Undo, the Studio document contains Prices note dimensions 200 by 150. Both areas still have their original 980 by 720 dimensions and positions.
- Show all finishes at viewport x = -82.05, y = -229.05, zoom = 0.1. The Studio visibility calculation reports no visible items.

The diagnostics were removed. The new reducer regression reproduces the stale 12,791-unit internal width without a browser. It fails before the fix and passes afterward.

The relevant difference between the commits is observer-generation registration. Before Plan 154, `MeasureNodes` forwards samples without registering newer DOM generations. Core rejects receipts that differ from the registered generation at `packages/core/src/domain/flow-measurement.schema.ts:165`. Plan 154 correctly registers newer wrapper generations at `packages/foldkit/src/application.ts:2360` through `packages/foldkit/src/grouping-model.ts:84`, so recreated wrappers' resize samples now become accepted geometry. Keeping that fix exposes the missing invalidation on document replacement. Reverting generation registration would mask the stale-size problem and break wrapper recreation.

Plan 154 also adds size and content invalidation in `packages/foldkit/src/grouping-model.ts:13`, but returns immediately for documents without explicit `data.flowGrouping.autoFit`. Schema Studio's shared projection authors parent relationships and sizes, with no auto-fit metadata, at `apps/vanilla/schema-studio/graph.ts:69`. Group auto-fit does not change the areas or their children in this failure. Measurement-aware Flow history is also not the Studio Undo owner.

## Production call path

1. The Studio Undo button dispatches `Msg.Undo`. The reducer restores the Studio history document and calls `host.paint` at `apps/foldkit/schema-studio/model.ts:525`. This is the Studio's own history, separate from Flow transaction history.
2. `host.paint` projects the restored Studio model and sends `HostAction.ReplaceDocument` at `apps/foldkit/schema-studio/main.ts:301`. `projectGraph` produces schema-decoded `FlowDocument` nodes, authored sizes, parent-relative positions, and opaque renderer data at `apps/vanilla/schema-studio/graph.ts:69`.
3. The public host action reaches `Graph.Message.ReplaceDocument` at `packages/foldkit/src/application.ts:2304`, then the accepted graph replacement at `packages/foldkit/src/graph.ts:3701`. `measurementsForDocument` owns the measurement transition at `packages/foldkit/src/graph.ts:2478`.
4. Before this fix, a replacement without a pending resize acknowledgement only prunes samples for removed node IDs. The surviving note retains its enlarged measurement. `fitGroupingModel` returns without invalidation because the document has no auto-fit metadata.
5. Show all calls the host's `instance.fitView` at `apps/foldkit/schema-studio/main.ts:334`. `calculateFitView` builds bounds from the accepted document and runtime measurements at `packages/foldkit/src/application.ts:2180`. Core geometry prefers measurements over authored sizes at `packages/core/src/domain/flow-graph.ts:120`.
6. Foldkit's view builds the same measured graph and filters mounted IDs at `packages/foldkit/src/graph.ts:7453`. The node renderer also prefers the measurement for its inline size at `packages/foldkit/src/graph.ts:7485`. Thus an old measurement can keep the note's DOM enlarged even after the authored size shrinks. Culling and the fit result then remove the Sales heading from the DOM.
7. The DOM observer reports replacement generations and dimensions through `HostAction.MeasureNodes` at `apps/foldkit/schema-studio/main.ts:614`. The observer owns browser reads and generation assignment at `packages/foldkit/src/measurement-observer.ts:69` and `packages/foldkit/src/measurement-observer.ts:204`.

## Fix and ownership

`measurementsForDocument` now discards a sample when an uncontrolled replacement changes that node's authored size and the sample does not match the replacement size. Until the observer measures the new DOM, geometry and rendering use the restored authored size. The measurement revision advances and generation registrations remain intact, so fresh samples from the same wrapper are accepted and older wrappers remain rejected.

Unchanged sizes and samples that already match the replacement survive. Controlled replacements retain their existing CSS measurement contract, and pending resize acknowledgements still use `measurementsForResize`. These cases are covered by `packages/foldkit/src/resize-measurement.test.ts:96`. An experiment that invalidated every document's samples through the grouping helper broke those existing contracts; the fix belongs at the uncontrolled document-replacement boundary.

No graph semantics or Effect workflows move into the browser application. The existing host-action lifecycle retains its structured telemetry. No additional pointer logs or OTLP delivery claims are introduced.

## Test paths and Vanilla comparison

The focused regression at `packages/foldkit/src/grouping-measurement.test.ts:82` invokes the real application reducer with public `MeasureNodes` and `ReplaceDocument` actions. It covers a manually sized group and a note without auto-fit metadata. It asserts the restored internal dimensions before observer redelivery, exact document preservation, retained generation registration, fresh same-generation measurement, and rejection of an older receipt. It does not replace the browser gesture path.

The unchanged Foldkit S9 at `apps/foldkit/e2e/schema-studio.e2e.ts:536` drives pointer resizes, Undo, Show all, heading selection, and the next area resize. It passes five consecutive runs after the fix. Its assertions, waits, and inputs are unchanged.

Vanilla uses its own Studio history at `apps/vanilla/schema-studio/main.ts:394`, then calls `current.update(graph())` at `apps/vanilla/schema-studio/main.ts:357`. Its reconciler applies the authored DOM size at `apps/vanilla/src/mount-flow.ts:8199`, then records the DOM measurement during that reconciliation at `apps/vanilla/src/mount-flow.ts:8255`. This differs from Foldkit's measured view and asynchronous observer path. The Vanilla Schema Studio and grouping suites provide the separate browser boundary; no Vanilla product change is needed for this regression.

## Verification

The focused verification configuration retains every existing check and all 182 browser files: 58 Vanilla, 56 Vue, and 68 Foldkit. Only its active-work description is extended. No existing browser assertion, input, or wait changes.

Commands and captured results:

- `bun install --frozen-lockfile`: passed in the fix checkout and the detached `3c8d895` baseline checkout. The temporary baseline worktree was removed after comparison.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts schema-studio.e2e.ts --grep 'S9 enforces' --workers=1`: failed at the reported Sales heading click on `da9acb9`; passed on `3c8d895`. Two temporary diagnostic runs on `da9acb9` reproduced the failure without changing the test. The diagnostics were removed.
- `bun run test packages/foldkit/src/grouping-measurement.test.ts`: the initial new manual-size regression failed before the fix, reporting measured width 12,791 instead of restored width 200.
- `bun run test packages/foldkit/src/grouping-measurement.test.ts packages/foldkit/src/resize-measurement.test.ts`: 14 passed after the fix, including both new parameterized regression cases. The existing core grouping tests also passed in the earlier focused unit run.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts schema-studio.e2e.ts --grep 'S9 enforces' --repeat-each=5 --workers=1`: 5 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts schema-studio.e2e.ts grouping-actions.e2e.ts subflows-recipes.e2e.ts --workers=1`: 49 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/schema-studio.e2e.ts apps/vanilla/e2e/grouping-actions.e2e.ts apps/vanilla/e2e/subflows-recipes.e2e.ts --workers=1`: 48 passed.
- `bun run test`: all 2,666 tests passed in 113 files.
- `bun run check`, `bun run research:check-traces`, and `bun run docs:check`: passed after cleanup and formatting.
- `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`: passed with exit 0 using the preserved focused profile. Quality, architecture, builds, typechecking, all unit tests, consumer packaging, documentation, inventories, traces, ledgers, and public contracts passed. React reference: 228 passed. Vanilla: 884 passed and 4 skipped. Vue: 1,018 passed and 2 skipped. Foldkit: 642 passed. The existing ledger's expected-failure classifications remain in force. S9 also passed within this broad Foldkit run.

Every browser command acquired and released the lock independently and used one worker. The shared lock was occupied by another worktree's verifier before the final acceptance runs; no lock was removed or bypassed. This is a focused-profile pass with preserved scope, not a full-profile or upstream parity claim.

## Conformity and deviations

- **Conforming to Flow's authored-size and history contract:** Undo restores the note's dimensions before the next fit, and manual areas retain their dimensions. The boundaries are the public-action reducer regression and unchanged Schema Studio browser suites.
- **Intentionally different host lifecycles:** Vanilla samples during DOM reconciliation, while Foldkit uses asynchronous measurement actions. The fix invalidates stale Foldkit geometry before rendering without replacing either lifecycle.
- **Intentionally different from auto-fit groups:** Schema Studio areas remain manually sized and do not opt into Plan 154's child-driven sizing. Existing grouping and subflow suites protect the separate auto-fit contract.
- **Unverified:** upstream xyflow behavior for this exact application sequence, full-profile acceptance, and collector-side OpenTelemetry delivery. This fix makes no upstream parity or collector-delivery claim.
