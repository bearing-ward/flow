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
