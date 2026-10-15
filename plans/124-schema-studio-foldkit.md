# Plan 124: Schema Studio on Foldkit

Port Schema Studio (Plan 121) to the Foldkit host. The Vanilla app is the behavioural spec, and ChartDB's captured behaviour (`research/references/chartdb/REFERENCE.md`, `results/S*.json`) remains the reference. ChartDB is AGPL-3.0: work from the Vanilla clone and the recorded reference only, never from ChartDB source.

## Scope

- **Shared domain:** reuse `apps/shared/schema-studio/` (model, seed, DBML sample, history, JSON import/export, nearest-side rule) unchanged. If a change is needed, keep it host-neutral and keep the Vanilla suite green.
- **App:** `apps/foldkit/schema-studio/`, served at `http://127.0.0.1:4175/schema-studio/` and added to the Foldkit Vite build inputs. Write it the Foldkit way: model, messages, update and view, with Flow state owned through the Foldkit package's public API. Do not wrap the Vanilla app or reach into Flow's private DOM.
- **Feature parity with the Vanilla Schema Studio:** every feature listed in Plan 121 step 2, including the extras beyond ChartDB, plus the fixes since:
  - blank-pane left-drag pans, Shift-drag draws a Full-mode box;
  - relationship edges follow tables every frame during drag (Plan 122);
  - pane and table right-clicks suppress the browser menu (Plan 123).

## Known Foldkit gaps to check first

Record each as a finding with `path:line`. Fix in `packages/foldkit` when the change is small and generic, otherwise report it.

1. **Runtime canvas options.** Vanilla needed `setCanvasOptions` for snap, scroll, zoom and culling changes without remounting. Confirm Foldkit model-driven options change mid-gesture (Shift-held snap) without resetting the drag.
2. **Per-field handle placement.** Vanilla added `onHandleRender`. Find Foldkit's way to place source/target handles on field rows and refresh them when fields collapse.
3. **Live internal-node reads.** Foldkit drag reads are live; resize reads are not (`plans/122-live-internal-node.md`). Relationship geometry during a table resize needs them. Close this gap.
4. **Custom edge geometry, markers and HTML edge labels** at the fidelity Schema Studio uses.
5. **Context-menu suppression** (Plan 123 says Foldkit already prevents default; confirm in the app).

## Tests

`apps/foldkit/e2e/schema-studio.e2e.ts`: the same scenarios as `apps/vanilla/e2e/schema-studio.e2e.ts` (S1–S16, blank-pane pan, edge follows drag, context menu), with real browser input and the same asserted values. Where a selector or seam must differ, keep the asserted contract identical. Add a test that relationship edges follow a table during a resize. Add the file to `browserTests.foldkit`.

## Comparison

Add a Foldkit column (or a sibling trace) to `research/traces/schema-studio-vanilla-comparison.md` and end with `Conformity and deviations`. Any intentional difference from the Vanilla app must be stated with a reason.

## Verification

`bun run verify` with the existing broad browser scope. Never remove existing entries from `verification.config.json`; only add.
