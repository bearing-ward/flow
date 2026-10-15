# Plan 121: Schema Studio, a ChartDB-style app on Vanilla Flow

Build a real-app stress test. Schema Studio clones the ChartDB canvas editor on the Vanilla host and exercises as much of Flow's public API as a database diagram editor naturally uses. Vanilla comes first. Vue and Foldkit ports wait until the comparison in step 4 is reviewed.

Reference: ChartDB `c24936a402bb3e24b4858f05282d69a04fcfe25b` (`@xyflow/react` ^12.8.2), canvas in `src/pages/editor-page/canvas/`. ChartDB is AGPL-3.0, so this is a clean-room clone of observable behaviour. Do not copy its source, CSS, icons, copy text or templates. Keep the reference checkout outside the repo.

## 1. Shared domain (`apps/shared/schema-studio/`, no DOM)

Schema model (tables, fields, relationships with cardinality, views with dependencies, areas, notes), an original sample schema of about 12 tables with 2 areas, 1 view and 2 notes, and a DBML rendering of the same sample for importing into ChartDB. Add pure helpers: overlap detection, area membership, the relationship-side rule (left or right from relative node centres), history (undo/redo of model commands) and JSON import/export. Vue and Foldkit reuse it later.

## 2. Vanilla app (`apps/vanilla/schema-studio/`, served on 4173)

ChartDB parity, each item through public Flow APIs:

- **Table node:** coloured header, field rows with PK/FK/nullable marks, left and right handles per field, a top handle for view dependencies, "show more" collapse with handle refresh, width resizer when selected, inline edit mode for name and fields.
- **Relationship edge:** smooth-step path between field handles, sides recomputed from internal node geometry, custom crow's-foot/one marker definitions, a cardinality popover on click, and highlighting plus raised z-index when either end is selected.
- **Dependency edge:** view edges with a visibility toggle.
- **Area node:** z-index −10, resizable, inline rename, colour. Dragging an area moves the tables inside it.
- **Note node:** resizable, editable text, colour.
- **Connecting:** drag field to field with a custom connection line and validation (no self-field, no duplicates). Also a click-started "create relationship" mode with a floating edge to a cursor node that follows `screenToFlowPosition`.
- **Canvas:**
  - **View and theme:** light/dark colour mode, zoom range 0.1–5, dots background.
  - **Snapping:** 20×20 snap, toggled by a button or by holding Shift, with the cursor class changing while Shift is held.
  - **Selection and deletion:** Full selection mode; multi-select with Shift, Meta or Ctrl; delete with Backspace or Delete, but never while focus is in an input.
  - **Scroll and rendering:** a pan-on-scroll setting and render-only-visible.
  - **Minimap and controls:** minimap toggle; top-left controls (snap, show all, zoom in and out, auto-arrange) with layout via the existing dagre or elk dependency.
- **Panels:**
  - **Table list:** a side list that focuses a table with an animated fit to that node.
  - **Filter and overlap:** a filter that hides tables by schema or name, followed by a fit; a "lost in canvas" show-all button driven by viewport changes; overlap highlighting with a "show overlaps" control.
  - **Menus:** pane and node context menus (add table, note or area at the pointer; edit; duplicate; delete; add relationship).
  - **Persistence and history:** undo/redo with keyboard shortcuts, PNG export with `html-to-image`, and localStorage persistence.

Beyond ChartDB, where the editor naturally uses them, add:

- a node toolbar on the selected table;
- edge labels rendered as HTML for cardinality;
- edge reconnection by dragging an endpoint to another field;
- the selection-change callback driving the side list;
- the selection rectangle;
- keyboard node moves and an accessibility announcement;
- copy/paste of selected tables;
- delete-intersecting checks using `getIntersectingNodes`.

Where Flow lacks an API this needs, record it as a finding with `path:line` instead of working around it with private DOM access. Fix it in Vanilla only if the change is small and generic, and say so in the report.

## 3. Tests

`apps/vanilla/e2e/schema-studio.e2e.ts` covers the scenarios S1–S16 below. Add it to `browserTests.vanilla` in `verification.config.json`.

1. **S1:** load and fit.
2. **S2:** drag with snap on and with Shift.
3. **S3:** connect field to field.
4. **S4:** edge side flips when the target crosses the source.
5. **S5:** selection highlights connected edges.
6. **S6:** delete keys, with editable targets exempt.
7. **S7:** multi-select by click and by box.
8. **S8:** an area drag carries its tables.
9. **S9:** resize a table, note or area.
10. **S10:** zoom clamps at 0.1 and 5.
11. **S11:** pan-on-scroll setting.
12. **S12:** filter, then lost-in-canvas show-all.
13. **S13:** focus from the side list.
14. **S14:** context-menu add at the pointer.
15. **S15:** minimap and dark mode.
16. **S16:** undo/redo and PNG export.

## 4. Reference capture and comparison (separate worktree)

Under `research/references/chartdb/`, add a Playwright harness that runs pinned ChartDB from `/tmp` on port 4190, imports the sample DBML and drives S1–S16, recording observable outcomes and screenshots. Never use ports 4173–4178. Then write `research/traces/schema-studio-vanilla-comparison.md`. It has one row per scenario with ChartDB and Schema Studio outcomes and the Flow APIs used, and ends with a `Conformity and deviations` section (conforming, intentionally different or unverified).

## Verification and delivery

Run the focused `bun run verify` with the new suite in scope, using the shared browser lock. Make one Claude review. Merge. Run the comparison. The user decides when the Vue and Foldkit ports start.

## Steps 1–3 implementation record

The implementation branch is `wave/121-schema-studio-vanilla`. The app runs at `http://127.0.0.1:4173/schema-studio/` through the existing Vanilla Vite server. Its HTML entry is also included in the Vite production build. The shared schema, pure operations, JSON boundary, and history live in `apps/shared/schema-studio/`. The application owns DOM, persistence, export, and lifecycle in `apps/vanilla/schema-studio/`.

The seed parses the fixed sample DBML at startup. It loads 12 tables, 51 fields, 14 relationships, two areas, two notes, and the `bestsellers` view with two dependencies. The DBML is unchanged, with SHA-256 `4f91390aca7ede6b79c9103bcc5b08054337d9af39a573718162637ac3b27f1e`. Its canvas annotations supply the areas, notes, and view. Unqualified table declarations use the public schema. Catalog contains the six named catalog tables; Sales contains only customers, addresses, orders, and order_items. Reviews and inventory sit outside both areas. No ChartDB source, stylesheet, icon, string, or template was used. No reference checkout, reference harness, or comparison trace was added.

Every step 2 feature is implemented, including the Beyond ChartDB list. Selected table toolbars open inline editors. Relationship cardinality uses HTML labels and original SVG marker definitions. Pointer reconnection updates field endpoints. Selection callbacks update the table list. Rectangle selection uses Full mode. Keyboard moves and accessibility announcements use Flow's built-in handler. It moves 5px unsnapped or one grid step snapped, multiplied by four with Shift. Schema Studio also enables snapping while Shift is held, so Shift-arrow moves 80px on its 20px grid. Copy/paste duplicates selected tables and their internal relationships. Delete intersecting uses the public `getIntersectingNodes` query. Dagre and `html-to-image` reuse the existing application dependencies.

Delete handling checks `event.composedPath()[0]` before processing either deletion key or a shortcut. Inputs, textareas, selects, and editable content retain their editing keys. No Flow defaults were changed. The app explicitly chooses its selection, deletion, snap, scroll, background, connection, and zoom settings.

### API gaps found

- Field-row handle placement lacked a public styling callback. The small, generic, Vanilla-only `onHandleRender(node, handle, element)` option supplies host-owned buttons from `apps/vanilla/src/mount-flow.ts:1812`. Handle declaration changes recreate buttons. Data-only changes call the callback on existing buttons at `apps/vanilla/src/mount-flow.ts:7794`, preserving the source of an in-progress connection. The host browser test at `apps/vanilla/e2e/closing-options.e2e.ts:900` edits source-node data during a native connection, asserts button identity and updated callback output, and completes the edge. S3 continues to cover field spacing, connection validation, collapse, and measured anchor refresh. Default placement is unchanged.
- Runtime snap, scroll, and culling settings were an API gap, now fixed by Vanilla's `setCanvasOptions(partial)`. The partial schema derives from the mount schema fields at `apps/vanilla/src/mount-flow.ts:1115`. Both controller interfaces expose the setter, and `mountFlow` forwards it at `apps/vanilla/src/mount-flow.ts:13852`. The setter decodes before changing state, retains omitted fields and the configured disabled grid, resolves the same defaults, and reconciles changed culling at `apps/vanilla/src/mount-flow.ts:12757`. `docs/public-api.md` documents its fields, errors, defaults, and lifecycle. No default changed.
- Built-in keyboard movement conforms to the pinned React Flow source and is not an API gap. React chooses grid velocity or 5px in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useMoveSelectedNodes.ts:29` and supplies the Shift multiplier in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:158`. Flow already computes those steps at `apps/vanilla/src/mount-flow.ts:11720`. Round 2 deletes the app-level arrow handler and uses built-in movement and announcements. The host browser test at `apps/vanilla/e2e/closing-options.e2e.ts:875` proves 5/20 unsnapped and 20/80 snapped; the application test at `apps/vanilla/e2e/schema-studio.e2e.ts:611` proves the resulting model, native announcements, and copy/paste.

### Review-fix round 2 call paths

Production settings enter through the snap button at `apps/vanilla/schema-studio/main.ts:1157`, scroll/culling settings at `apps/vanilla/schema-studio/main.ts:1257`, or Shift keydown/keyup at `apps/vanilla/schema-studio/main.ts:1448` and `apps/vanilla/schema-studio/main.ts:1476`. They call `updateCanvasOptions` at `apps/vanilla/schema-studio/main.ts:817`, then the decoded host setter at `apps/vanilla/src/mount-flow.ts:12757`. Pointer movement reads the current grid at `apps/vanilla/src/mount-flow.ts:6487` and `apps/vanilla/src/mount-flow.ts:6514`, through core drag geometry at `packages/core/src/domain/flow-runtime.schema.ts:1303` and `packages/core/src/domain/flow-runtime.schema.ts:1326`, then publishes preview positions to `renderedNodePositions` and renders the DOM at `apps/vanilla/src/mount-flow.ts:6499` and `apps/vanilla/src/mount-flow.ts:6525`. Wheel input reads current scroll settings at `apps/vanilla/src/mount-flow.ts:12087`. Culling calls the existing document visibility reconciliation at `apps/vanilla/src/mount-flow.ts:9348`. The canvas mounts once at `apps/vanilla/schema-studio/main.ts:1517`; settings, Shift-click, and JSON import no longer remount it. Pinned React XYDrag reads its current grid from the store per update at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/xydrag/XYDrag.ts:130`.

The host test path mounts the public controller through `apps/vanilla/src/closing-options-fixture.ts`, then sends native browser pointer, wheel, and keyboard events from `apps/vanilla/e2e/closing-options.e2e.ts:731`. It separately invokes the public setter and checks rendered position, node identity, scroll output, culling, decode rejection, default grid, and active connection completion. The app path starts at `/schema-studio/`. S2 at `apps/vanilla/e2e/schema-studio.e2e.ts:118` presses Shift after an unsnapped drag starts, asserts two further snapped preview positions without releasing the pointer, then verifies the committed final position and node identity. S7 at `apps/vanilla/e2e/schema-studio.e2e.ts:300` checks identity across Shift-click multi-selection. Preview assertions inspect rendered bounds because the saved application model updates on drag completion. Neither path loads React Flow or ChartDB.

### Scope and deferred work

No item in steps 1–3 is deferred. Step 4, the pinned ChartDB harness and comparison trace, remains assigned to the separate worktree. A Claude review and integration are parent-level delivery work; this implementation task does not merge or push. Collector delivery, cross-host Schema Studio ports, and a full-suite parity claim remain outside this task.

### Verification evidence

Round 1 evidence, retained as history: the final `bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts --workers=1` suite passed three consecutive runs, 24 tests per run and 72 passes in total. The standalone domain suite passed 11 tests. Each browser command acquired `/tmp/flow-browser.lock` as a directory, wrote an owner token to its `owner` file, and used a shell trap to verify ownership before releasing the lock in the same command. Focused `OTEL_SDK_DISABLED=true bun run verify` passed all 14 selected gates. The unit suite passed 2,505 tests across 95 files. Browser results were Vanilla 476 passed with two existing skips, Vue 709 passed, and Foldkit 291 passed. Scope was 28 Vanilla files, 23 Vue files, and 30 Foldkit files, preserving every previous entry. The focused checks included quality, architecture, package builds, typechecking, unit tests, API members, catalog, packed consumers, documentation, example recipes, the Vanilla app build, and all three saved browser scopes. This is focused acceptance, not `verify:full` or a parity claim. Complete Vanilla `OTEL_SDK_DISABLED=true bunx playwright test --workers=1 --grep-invert calibration` passed 651 tests with two existing skips, 653 selected tests across 55 files. Its existing performance fixture completed; timing output is diagnostic and establishes no speedup or latency budget. All owner-token browser locks were released. The sample SHA-256 was rechecked after verification. Development runs exposed and corrected handle refresh, label click propagation, cursor hit-testing, sample area membership, default schema names, and test locator mistakes. Those runs are not the final acceptance evidence.

Round 2 acceptance: `OTEL_SDK_DISABLED=true bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts apps/vanilla/e2e/closing-options.e2e.ts --workers=1 --repeat-each=3` passed all 159 cases. Schema Studio passed 24 tests per repeat, 72 total; the host file passed 29 per repeat, 87 total, including five new host tests. The final repeated run includes decode failure logging; the later lint-only suppression changes no runtime behavior. Earlier failed or interrupted development runs are excluded from these counts.

Focused `OTEL_SDK_DISABLED=true bun run verify` passed all 14 selected gates, including quality and oxfmt, architecture, package builds, typechecking, 2,505 unit tests across 95 files, API members, catalog, packed consumers, documentation, example recipes, the Vanilla app build, and all saved browser scopes. Browser counts were Vanilla 481 passed with two existing skips, Vue 709 passed, and Foldkit 291 passed. Scope remained 28 Vanilla files, 23 Vue files, and 30 Foldkit files; both changed Vanilla files were already in that saved scope. `verification.config.json` identifies review-fix round 2 as the active work and retains the focused default.

Complete Vanilla `OTEL_SDK_DISABLED=true bunx playwright test --workers=1 --grep-invert calibration` passed 656 tests with two existing skips, 658 selected tests across the existing 55 files. The performance fixture completed; its timing output is diagnostic and establishes no performance change or budget. The repeated files and both verification commands acquired `/tmp/flow-browser.lock` with unique owner tokens and released only their own locks through shell traps in the same commands. All locks were released. The sample DBML hash remains `4f91390aca7ede6b79c9103bcc5b08054337d9af39a573718162637ac3b27f1e`. Both review findings and the active-handle concern are resolved within this scope. These results establish focused acceptance and the complete Vanilla suite excluding calibration, not `verify:full` or ChartDB parity. Step 4 remains separate.

### Conformity and deviations

- **Conforming to the pinned React keyboard and dynamic-snap contract:** Flow retains its built-in grid-step/5px movement and Shift multiplier. The host browser tests prove 5/20 unsnapped and 20/80 snapped, native announcements, and snap changes on the next move of an active drag. Schema Studio S2 proves uninterrupted Shift snapping mid-drag, and S7 proves no remount on Shift-click. These tests exercise Flow; the React comparison is source-backed, with no runtime React or ChartDB parity claim.
- **Conforming to the requested Flow application contract:** the shared domain unit tests cover the fixed seed, field constraints, overlap geometry, area membership, relative-centre side selection, connection validation, history, and JSON import/export. S1–S16 exercise native browser inputs against the public Vanilla host. Additional browser tests cover toolbars, HTML cardinality, reconnection, a floating cursor node, keyboard announcements, copy/paste, inline editing, overlap deletion, layout, and culling. These are Flow-only tests, not ChartDB comparison evidence.
- **Intentionally different:** the UI, marker drawings, copy, and styles are original clean-room work. Schema Studio adds the Beyond ChartDB behaviors requested by this plan. It stores a versioned application model in localStorage and exports the current caller-owned canvas to PNG. Domain tests and the extra browser tests define these application boundaries. No source-similarity or pixel-parity claim is made.
- **Unverified versus ChartDB:** all direct ChartDB comparisons for S1–S16, including exact selection thresholds, pointer timing, layout, marker appearance, area semantics, and persistence behavior, await step 4. The implementation tests do not load ChartDB. Native touch devices, complete Vue/Foldkit application parity, and OpenTelemetry collector delivery are also unverified.
