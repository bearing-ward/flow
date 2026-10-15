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

Every step 2 feature is implemented, including the Beyond ChartDB list. Selected table toolbars open inline editors. Relationship cardinality uses HTML labels and original SVG marker definitions. Pointer reconnection updates field endpoints. Selection callbacks update the table list. Rectangle selection uses Full mode. Keyboard moves use 5px, or 20px with Shift, and snap the resulting position when snapping is active. Copy/paste duplicates selected tables and their internal relationships. Delete intersecting uses the public `getIntersectingNodes` query. Dagre and `html-to-image` reuse the existing application dependencies.

Delete handling checks `event.composedPath()[0]` before processing either deletion key or a shortcut. Inputs, textareas, selects, and editable content retain their editing keys. No Flow defaults were changed. The app explicitly chooses its selection, deletion, snap, scroll, background, connection, and zoom settings.

### API gaps found

- Field-row handle placement lacked a public styling callback. `apps/vanilla/src/mount-flow.ts:1792` creates host-owned handle buttons, while custom node renderers receive only their content element at `apps/vanilla/src/mount-flow.ts:780`. This branch adds the small, generic, Vanilla-only `onHandleRender(node, handle, element)` mount option. The host supplies each button when it is created and recreates buttons when their declarations or node data change. S3 tests actual field spacing, a native field connection, duplicate rejection, collapse, and refreshed handle positions. `docs/public-api.md` documents the hook. Default placement is unchanged.
- Snap, scroll, and culling settings are mount-time options. `apps/vanilla/src/mount-flow.ts:944`, `apps/vanilla/src/mount-flow.ts:1029`, and `apps/vanilla/src/mount-flow.ts:1034` expose their initial configuration; the controller has no setter for them. Schema Studio preserves the document, selection, and viewport and remounts through public APIs when these settings change. S2, S7, S11, and the culling test cover that application lifecycle choice. No host change was needed.
- Built-in keyboard movement scales by the configured grid before the Shift multiplier at `apps/vanilla/src/mount-flow.ts:11658`. A 20px grid therefore gives 20px or 80px moves. Schema Studio handles keyboard moves at its application boundary, chooses 5px or 20px, snaps the result, and announces the actual position. The keyboard browser test checks both step sizes. Flow's existing keyboard behavior is unchanged.

### Scope and deferred work

No item in steps 1–3 is deferred. Step 4, the pinned ChartDB harness and comparison trace, remains assigned to the separate worktree. A Claude review and integration are parent-level delivery work; this implementation task does not merge or push. Collector delivery, cross-host Schema Studio ports, and a full-suite parity claim remain outside this task.

### Verification evidence

The final `bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts --workers=1` suite passed three consecutive runs, 24 tests per run and 72 passes in total. The standalone domain suite passed 11 tests. Each browser command acquired `/tmp/flow-browser.lock` as a directory, wrote an owner token to its `owner` file, and used a shell trap to verify ownership before releasing the lock in the same command. Focused `OTEL_SDK_DISABLED=true bun run verify` passed all 14 selected gates. The unit suite passed 2,505 tests across 95 files. Browser results were Vanilla 476 passed with two existing skips, Vue 709 passed, and Foldkit 291 passed. Scope was 28 Vanilla files, 23 Vue files, and 30 Foldkit files, preserving every previous entry. The focused checks included quality, architecture, package builds, typechecking, unit tests, API members, catalog, packed consumers, documentation, example recipes, the Vanilla app build, and all three saved browser scopes. This is focused acceptance, not `verify:full` or a parity claim. Complete Vanilla `OTEL_SDK_DISABLED=true bunx playwright test --workers=1 --grep-invert calibration` passed 651 tests with two existing skips, 653 selected tests across 55 files. Its existing performance fixture completed; timing output is diagnostic and establishes no speedup or latency budget. All owner-token browser locks were released. The sample SHA-256 was rechecked after verification. Development runs exposed and corrected handle refresh, label click propagation, cursor hit-testing, sample area membership, default schema names, and test locator mistakes. Those runs are not the final acceptance evidence.

### Conformity and deviations

- **Conforming to the requested Flow application contract:** the shared domain unit tests cover the fixed seed, field constraints, overlap geometry, area membership, relative-centre side selection, connection validation, history, and JSON import/export. S1–S16 exercise native browser inputs against the public Vanilla host. Additional browser tests cover toolbars, HTML cardinality, reconnection, a floating cursor node, keyboard announcements, copy/paste, inline editing, overlap deletion, layout, and culling. These are Flow-only tests, not ChartDB comparison evidence.
- **Intentionally different:** the UI, marker drawings, copy, and styles are original clean-room work. Schema Studio adds the Beyond ChartDB behaviors requested by this plan. It stores a versioned application model in localStorage and exports the current caller-owned canvas to PNG. Domain tests and the extra browser tests define these application boundaries. No source-similarity or pixel-parity claim is made.
- **Unverified versus ChartDB:** all direct ChartDB comparisons for S1–S16, including exact selection thresholds, pointer timing, layout, marker appearance, area semantics, and persistence behavior, await step 4. The implementation tests do not load ChartDB. Native touch devices, complete Vue/Foldkit application parity, and OpenTelemetry collector delivery are also unverified.
