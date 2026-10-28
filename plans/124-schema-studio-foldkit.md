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

## Implementation record

The implementation uses branch `wave/124-schema-studio-foldkit` in the assigned worktree, starting from `30901c92c9a0d853adcebd04ac8d2aa76fb66061`. It does not push or merge. No ChartDB source, CSS, icon, or template was fetched, read, or copied. The port uses the Vanilla app and its suite, the recorded reference results, and the existing Foldkit recipes. `apps/shared/schema-studio/`, Vanilla source/tests, and imported research artifacts remain unchanged.

### Application and ownership

`apps/foldkit/schema-studio/` contains the HTML entry, application model/messages/update/view, schema-to-graph projection, declarative node/edge renderers, and original Schema Studio styles. A persistent application Runtime owns history and UI state. A persistent graph Runtime owns Flow state and gestures through `@flow/foldkit`. Native callbacks send typed application messages; host commands use public graph actions, instance/viewport clients, and the public measurement observer. There is no Vanilla wrapper, node-content lookup, private DOM reach, or settings-triggered remount.

The Foldkit Vite build includes `/schema-studio/`, served by the development host on 4175. The normal browser suite uses the existing isolated Foldkit test server on 4178. Root and app TypeScript configurations include the new application and fixture. The verifier retains the focused default, names Plan 124 as active work, preserves every prior check and browser file, and adds the Schema Studio suite, live-instance host suite, Foldkit app build, and trace validation. Browser scope is 30 Vanilla files, 25 Vue files, and 32 Foldkit files.

### Foldkit findings and package fixes

- Runtime options were consumed at `createProgram` construction, `packages/foldkit/src/application.ts:3635` and line 3651. There was no public post-mount snap/scroll/culling patch. `HostAction.SetCanvasOptions` now decodes a partial at `packages/foldkit/src/application.ts:179`, routes it at line 2233, and updates current graph settings at `packages/foldkit/src/graph.ts:3401`. Omitted/undefined fields retain their values; disabled snapping retains its grid. The active pointer session and elements survive. The new unit test and Schema Studio S2 prove a snap change during a held drag. S11 and culling tests cover live scroll/render options.
- Runtime-owned handles had side-only placement. The registry now accepts declarative `handleAttributes(node, handle, h)` at `packages/foldkit/src/graph.ts:4953`, applied at line 7165. Applications supply row offsets and application attributes while the runtime keeps connection messages and handle identity. Registry replacement clears this new callback alongside the other optional renderers. Schema Studio S3 proves field spacing, connection validation, collapse and refreshed anchors; S2/S7 assert retained node identity.
- The Plan 122 resize instance gap is closed. `selectLiveModel` at `packages/foldkit/src/graph.ts:2692` now combines built-in pointer resize, held-key resize, and custom resizer previews with the current document and measurement generations. `previewMeasurements` at line 2643 carries handle offsets to resized borders. The view uses that projection at line 7085; snapshot-backed instance reads use it at `packages/foldkit/src/application.ts:945`. Accepted state remains separate until release. Three public-instance browser cases compare single/bulk reads with the DOM while input remains held, verify unchanged accepted bounds, and restore through Escape.
- Custom edges already supported SVG markers, HTML labels and interaction paths. Their synchronous geometry had endpoint bounds but lacked the complete live field-handle projection available through the asynchronous instance. `FoldkitEdgeGeometry.sourceNode`/`targetNode` at `packages/foldkit/src/graph.ts:4939` expose detached internals from the current render graph, constructed at line 5189. Relationships use those projections to recompute sides, paths and markers during drag/resize. App browser tests compare the held path with the post-drop path exactly.
- Context-menu suppression already existed at `packages/foldkit/src/mouse-observation.ts:198`; no cancellation fix was needed. The app test observes `defaultPrevented` at window for both pane and table right-clicks. A native-event probe additionally found macOS Chromium delivers Control-click as button-0 `contextmenu` without `click`. With Control configured for multiselection, `packages/foldkit/src/graph.ts:3120` now applies the selection toggle on that event. Button-2 context menus retain their existing behavior. A unit test covers both inputs, and S7 proves 2/3/4 selected tables plus Full box selection in the browser.
- Keyboard announcements reported the old absolute position. `packages/foldkit/src/graph.ts:3365` now reads the placed absolute position. The existing unit expectation changes from x 20 to x 40 for the actual group move. The existing custom-callback browser assertion in `apps/foldkit/e2e/canvas-options.e2e.ts:202` now expects `Live right 105/100` after moving from x 100 to x 105, matching the node position already asserted in that test. The application browser test asserts resulting positions and native announcements for 5px and snapped 20/80px movement.

`docs/public-api.md` documents each package change. No blocking Plan 124 gap remains. Arbitrary minimap dimensions remain outside the existing Foldkit API, whose fixed size is declared at `packages/foldkit/src/ui/minimap.ts:27` and line 29; the app uses its public helper's fixed default dimensions.

### Intentional differences from Vanilla

- The Foldkit application uses messages, update, view, and asynchronous public ports. The uncontrolled reconnection acknowledgement is `accepted`; Vanilla reports the application proposal as `proposed`. Final relationship endpoints, validation, undo behavior and counts remain the tested contract.
- Foldkit's public minimap helper uses 180x120; Vanilla requests 180x110. S14 therefore starts at a different bare-pane coordinate and asserts the same original-pointer mapping and native cancellation. The dedicated pan test retains the exact (-100,-50) pointer delta and explicitly excludes the minimap.
- The editor belongs to the application view instead of being imperatively inserted into a node. Draft field text may be empty while editing; Save normalizes it against the existing field before committing the shared model.
- Foldkit uses its own element classes, resize attributes and animation name. Browser selectors use those host seams. The settle helper first allows the queued application message to run, then waits for the same viewport busy flag; resize path comparison additionally waits for the final drawn width and observer frames while the pointer is held.
- Note text publishes on input through the application model, so history records those input changes. Vanilla commits note text on change/blur. This keeps the controlled Foldkit textarea synchronized across runtime renders; the inherited suite checks the resulting text and editable-key protection, not note undo grouping.
- Show overlaps preserves the camera while toggling highlights. Auto-arrange uses the application Show All fit policy instead of Vanilla's shorter layout fit. These camera choices are not asserted by the inherited overlap/layout cases. Area bodies permit pane gestures; headers and resize controls remain interactive.
- Persistence uses `flow-schema-studio-foldkit-v1`, keeping the two demos' documents independent. PNG export normalizes the cloned root's physical and logical insets without changing the live canvas.

Differences from ChartDB remain those already accepted for Vanilla: original visuals/marker artwork/seed layout, retained drag selection, row-click focus, original-pointer context creation, localStorage, and Beyond features. The recorded ChartDB Control-click menu differs from Schema Studio's requested multiselection. See `research/traces/schema-studio-foldkit-comparison.md` for the scenario columns, production/test call paths, and conformity boundary.

### Development failures and corrections

All failures below are implementation or test-composition failures; none is classified as an unrelated baseline failure. Raw logs remain at the listed `/tmp` paths. They are not acceptance receipts.

| Log | Observed output | Correction |
| --- | --- | --- |
| `plan124-browser-first.log` | `3 failed`, `27 did not run`; `getByTestId('studio-status') ... element(s) not found`; `viewportRequests ... SchemaError` | Give both Runtime mount elements stable IDs; use `originX`/`originY` metrics. |
| `plan124-browser-second.log` | `5 failed`, `1 passed`, `24 did not run` | Keep an app-owned wrapper around the Runtime root; correct host selector seams. |
| `plan124-browser-third.log` | `5 failed`, `2 passed`, `23 did not run`; S2 expected x 160, received 140; S6 note expected `keep m`, received original text | Synchronize the application viewport from port notifications and keep controlled note text in application state. |
| `plan124-browser-fourth.log` | `6 failed`, `6 passed`, `22 did not run`; fixture drawn width expected 250, received 280; stale accepted handle IDs | Declare border-box sizing in the fixture; publish the projected application diagnostic document. |
| `plan124-browser-fifth.log` | `14 failed`, `20 passed`; edge stroke expected 1.5px, received 1px; box expected two selected, received zero | Apply original edge styles explicitly; correct canvas/viewport layout and hit testing, modifiers, and host seams. |
| `plan124-browser-sixth.log` | `8 failed`, `23 passed`; collapsed handle comparison used bounds from before focus finished; wheel expected (-40,-60), status unchanged | Wait for queued Foldkit viewport operations; include accepted viewport changes in app state; avoid minimap interception for pane context input. |
| `plan124-browser-seventh.log` | `3 failed`, `28 passed`; missing floating cursor, final resize path differed, PNG pattern pixel assertion failed | Skip studio handle decoration for the cursor node; wait for the final drawn resize width and observer delivery; inspect exported image geometry. |
| `plan124-browser-eighth.log` | `1 failed`, `2 passed`; PNG `Expected: > 1`, `Received: 1` | Retain decoded-pixel proof and export/screenshot artifacts to trace the remaining layout fault. |
| `plan124-repeated.log` | `3 failed`, `99 passed (3.0m)`; all three failures were the same PNG pixel assertion | Do not count this repeat attempt as acceptance. The cloned root still had logical offsets. |

The export diagnosis at `/tmp/plan124-export-census.log` compares native and serialized properties. The first position override produced physical `left: 0px; top: 0px`, but retained `inset-inline-start: 205px; inset-block-start: 64px`. Resetting `inset`, `insetInline`, and `insetBlock` removed that second positioning source. The complete native PNG test then passed its signature, 4940x3616 dimensions, opacity, background color, and patterned-pixel assertions. The diagnostic script is retained at `/tmp/plan124-export-debug.e2e.ts`; the original model and live canvas position are untouched.

Build/type/lint diagnostics were also corrected before acceptance: v4 schema optionality and measured-handle types; public viewport/port/minimap signatures; inclusion of DBML raw declarations; fixture HTMLElement narrowing; callback error naming; and required formatting/spacing. Logs include `/tmp/plan124-build.log`, `/tmp/plan124-type*.log`, `/tmp/plan124-lint*.log`, and `/tmp/plan124-quality*.log`. The final standalone Foldkit unit run passed 18 files and 202 tests.

### Files changed

- Application: `apps/foldkit/schema-studio/index.html`, `main.ts`, `model.ts`, `graph.ts`, `renderers.ts`, and `style.css`.
- Browser proof: `apps/foldkit/e2e/canvas-options.e2e.ts`, `apps/foldkit/e2e/schema-studio.e2e.ts`, `apps/foldkit/e2e/live-internal-node.e2e.ts`, and `apps/foldkit/live-internal-node/index.html` plus `main.ts`.
- Package: `packages/foldkit/src/application.ts`, `graph.ts`, `renderer-registry.ts`, `live-resize.test.ts`, and `closing-options.test.ts`.
- Composition and verification: `apps/foldkit/vite.config.ts`, `apps/foldkit/tsconfig.json`, root `tsconfig.json`, and `verification.config.json`.
- Documentation: `docs/public-api.md`, `research/traces/schema-studio-foldkit-comparison.md`, and this plan.

### Acceptance evidence

Every browser command, including the verifier and packed-consumer browsers, runs under the requested owner-token `/tmp/flow-browser.lock` shell wrapper with `OTEL_SDK_DISABLED=true`. The final changed-file command is:

```sh
bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/schema-studio.e2e.ts apps/foldkit/e2e/live-internal-node.e2e.ts --workers=1 --repeat-each=3
```

`/tmp/plan124-repeated-final.log` ends with `102 passed (3.0m)`, exit 0. Schema Studio passes **31 tests in each of three complete runs, 93 total**. The public resize suite passes **3 in each run, 9 total**. There are no skips in either suite. This final receipt includes the corrected PNG export, context deletion, temporary empty editor drafts, live snap, Full selection, blank-pane pan, held drag/resize relationships, and both native-menu cancellation checks.

The first broad focused verifier, `/tmp/plan124-verify.log`, exited 1 in Vanilla after **497 passed, 2 skipped, 1 failed**. Its unchanged minimap case failed before the node was rendered:

```text
apps/vanilla/e2e/canvas-configuration.e2e.ts:752:3
Vanilla MiniMap component > onClick reports flow points, zoomStep scales wheel zoom, drags update live
Error: Expected a rendered element
  at box (.../apps/vanilla/e2e/canvas-configuration.e2e.ts:185:11)
  at .../apps/vanilla/e2e/canvas-configuration.e2e.ts:757:19
1 failed
2 skipped
497 passed (3.0m)
Error: vanilla browser tests failed with exit code 1
```

The verifier stopped there; that attempt did not run Vue or Foldkit browser gates. All 30 Vanilla Schema Studio tests passed in it. No file or scope was changed to bypass the failure.

The case was rerun ten times from an archive of main's exact commit `30901c92c9a0d853adcebd04ac8d2aa76fb66061`, with its own frozen dependency install inside the assigned worktree's ignored test output directory. The command was `bunx playwright test apps/vanilla/e2e/canvas-configuration.e2e.ts --workers=1 --repeat-each=10 -g 'onClick reports flow points'`, under the same browser lock. `/tmp/plan124-main-minimap.log` ends with **`10 passed (13.9s)`**. The test, fixture, Vanilla minimap implementation, and core minimap projection were also checked byte-for-byte against the archive and matched. The original failure is recorded as transient and not reproduced on main, not asserted to be a proven main failure. The complete verifier is rerun unchanged below.

The next verifier invocation stopped at quality because this appended record needed formatting. `/tmp/plan124-verify-quality-retry.log` reports `Format issues found in above 1 files` for `plans/124-schema-studio-foldkit.md`, followed by `Error: quality check failed with exit code 1`. Formatting was corrected before the next complete run; no source or scope changed for this correction.

The subsequent complete run reached all three hosts. `/tmp/plan124-verify-aria.log` records **Vanilla 498 passed with 2 existing skips, Vue 721 passed, Foldkit 324 passed with 1 failure**. That failure belongs to this implementation's intentional announcement correction, not to an unrelated baseline problem:

```text
apps/foldkit/e2e/canvas-options.e2e.ts:202:1
keyboard node movement uses the custom aria-live callback
Expected: "Live right 100/100"
Received: "Live right 105/100"
1 failed
324 passed (3.1m)
Error: foldkit browser tests failed with exit code 1
```

The test already asserts the node moves from x 100 to x 105. Its callback expectation is updated to x 105, consistent with the corrected built-in announcement and Schema Studio's required new-position assertions. Runtime source and the repeated Schema Studio receipt are unchanged. The full saved verifier scope is rerun, without a skip or filter for this case.

Final `OTEL_SDK_DISABLED=true bun run verify`, inside the same owner-token lock, passed **all 16 selected checks**, exit 0. `/tmp/plan124-verify-final.log` ends with:

```text
Test Files  96 passed (96)
     Tests  2510 passed (2510)
2 skipped
498 passed (3.0m)
721 passed (3.6m)
325 passed (3.0m)
Verification passed {
  profile: "focused",
  fullSuite: false,
  elapsedMs: 621089,
}
```

| Host    | Saved browser files | Passed | Skipped | Failed |
| ------- | ------------------: | -----: | ------: | -----: |
| Vanilla |                  30 |    498 |       2 |      0 |
| Vue     |                  25 |    721 |       0 |      0 |
| Foldkit |                  32 |    325 |       0 |      0 |
| Total   |                  87 |  1,544 |       2 |      0 |

The two unchanged Vanilla skips are the real-pointer-capture concurrent connection/drag cancellation and real-touch two-contact pinch cancellation cases in the two throwing placeholders removed by Plan 179. No new test is skipped. The final verifier includes all 30 Vanilla Schema Studio cases and all 31 Foldkit Schema Studio cases. Quality, architecture, package builds, typechecking, API/catalog inventories, packed consumers, documentation, recipe registry, both selected app builds, and research citations also pass. Packed-consumer invalid-input probes intentionally log typed rejection errors while their gates pass; Foldkit emits framework slow-update diagnostics without test failures or a performance claim.

The saved scope was checked against the base configuration: every original browser file remains in the same host list and order, and every original check remains. Shared domain/DBML, Vanilla implementation/tests, reference records, and imported evidence have no diff. All browser locks are released. This is focused acceptance with broad saved browser scope, not `verify:full`, a release decision, a native-device result, full pixel parity, or collector-side OpenTelemetry proof.
