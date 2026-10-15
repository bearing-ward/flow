# ChartDB reference for Schema Studio

ChartDB commit `c24936a402bb3e24b4858f05282d69a04fcfe25b`, outside Flow at `/tmp/chartdb-ref/src`. The lockfile installs React Flow 12.10.0 and xyflow system 0.0.74. Capture: 2026-10-15T00:59:42.325Z, darwin/arm64, 151.0.7922.34, 1600 × 1000 CSS pixels, DPR 1.

This is the reference half of Plan 121. It makes no Schema Studio or Flow parity claim. [README.md](README.md) documents the commands. [Source hashes](results/sources.json) bind these citations to the installed checkout and lockfile. ChartDB paths below are relative to that checkout. React Flow citations refer to the shipped, readable ESM runtime under node_modules, not Flow's older imported research artifacts.

## Fixture and evidence boundary

The real UI entry is an empty PostgreSQL diagram, then Actions → Import → DBML. The editable Monaco input receives apps/shared/schema-studio/sample-schema.dbml. The import path is src/pages/editor-page/top-navbar/menu/menu.tsx:180-211 → src/dialogs/common/import-database/import-database.tsx:90-180,287-295 → src/dialogs/import-database-dialog/import-database-dialog.tsx:63-139 → src/lib/dbml/dbml-import/dbml-import.ts:372-426. It adds the parsed entities to ChartDB state and IndexedDB, then the controlled React Flow canvas measures and renders them at src/pages/editor-page/canvas/canvas.tsx:343-405,596-673,1672-1704.

Both areas and all ten memberships, both original notes, and bestsellers with dependencies on books and order_items are created through UI controls. No requested canvas-only element is missing. The areas are placed apart so automatic containment does not reassign members between overlapping groups. [fixture.json](results/fixture.json) records the completed fixture; [import.json](results/import.json) records the imported schema before canvas-only additions.

The production path is browser input → ChartDB state/history → React Flow node and edge changes → geometry, DOM transforms, SVG paths, and marker definitions. The test path in scenarios.spec.mjs builds the fixture once, captures storageState including IndexedDB, and reloads that fixture in a fresh browser context for each scenario. This initialization restores persistence directly; every scenario action then uses browser mouse, keyboard, wheel, or editable-control events. Evaluation reads DOM and read-only IndexedDB transactions. A one-shot pointer observer records the trusted context-menu input and its click-time viewport. It does not mutate React state or call private app functions.

Before/after states contain graph positions, CSS-pixel rectangles, sizes, node selection, node and edge wrapper z-indices, endpoint coordinates and sides, marker URLs, settings, and persistence records. DOM lists contain only rendered nodes; persistence records are not proof of rendered output. Readings wait past the app's documented debounce or animation boundaries. These are settled-state captures, not frame-order, performance, or in-drag publication proofs.

## Settings and defaults

Source-defined defaults are labeled separately from exercised behavior. The JSON version is [settings.json](results/settings.json).

| Setting | Value | Origin and source | Runtime boundary |
| --- | --- | --- | --- |
| minZoom | 0.1 | explicit; `src/pages/editor-page/canvas/canvas.tsx:1684` | S10 |
| maxZoom | 5 | explicit; `src/pages/editor-page/canvas/canvas.tsx:1683` | S10 |
| snapGrid | [20,20] | explicit; `src/pages/editor-page/canvas/canvas.tsx:1698` | S2 |
| snapToGrid | "button enabled OR Shift held; button starts false" | explicit; `src/pages/editor-page/canvas/canvas.tsx:360,1697` | S2 |
| selectionMode | "Full" | explicit; `src/pages/editor-page/canvas/canvas.tsx:1699` | S7 |
| multiSelectionKeyCode | ["Shift","Meta","Control"] | explicit; `src/pages/editor-page/canvas/canvas.tsx:1703` | S7 |
| selectionKeyCode | "Shift" | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3576` | S7 |
| selectionOnDrag | false | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3576` | S7 |
| deleteKeyCode | ["Backspace","Delete"] | explicit; `src/pages/editor-page/canvas/canvas.tsx:1702` | S6 |
| editableDeleteExemptions | "INPUT, SELECT, TEXTAREA, contenteditable, .nokey" | React Flow implementation; `node_modules/@xyflow/system/dist/esm/index.mjs:845-854` | S6 tests input and textarea only |
| panOnScroll | "scroll_action === pan; fresh provider defaults pan" | explicit; `src/pages/editor-page/canvas/canvas.tsx:1696; src/context/local-config-context/local-config-provider.tsx:22-24` | S11 |
| panOnScrollSpeed | 0.5 | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | S11 |
| panOnScrollMode | "free" | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | S11 |
| zoomOnScroll | true | React Flow default, panOnScroll chooses the pan handler; `node_modules/@xyflow/react/dist/esm/index.mjs:1283; node_modules/@xyflow/system/dist/esm/index.mjs:2908-2958` | S11 |
| zoomOnPinch | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | unverified pinch input |
| zoomOnDoubleClick | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | unverified canvas double-click zoom |
| panOnDrag | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | setup uses canvas scrolling; unverified dedicated pan gesture |
| panActivationKeyCode | "Space" | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3576` | unverified |
| preventScrolling | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:1283` | S11 |
| onlyRenderVisibleElements | true | explicit; `src/pages/editor-page/canvas/canvas.tsx:1673` | S12 |
| fitView | false | explicit; initial and button fits happen separately; `src/pages/editor-page/canvas/canvas.tsx:1689,395-405; src/pages/editor-page/canvas/toolbar/toolbar.tsx:72-80` | S1 |
| showAllFit | "padding 0.1, maxZoom 0.8, duration 500ms" | explicit; `src/pages/editor-page/canvas/toolbar/toolbar.tsx:72-80` | S1 S12 |
| sideListFocus | "minZoom 1, maxZoom 1, duration 500ms; selects table" | explicit; `src/hooks/use-focus-on.ts:53-86` | S13 |
| tableResize | "width 224 to 450; only dy=0; corner handles hidden" | explicit; `src/pages/editor-page/canvas/table-node/table-node.tsx:464-471; src/lib/domain/db-table.ts:13-15` | S9 |
| noteResizeMinimum | {"width":200,"height":150} | explicit; `src/pages/editor-page/canvas/note-node/note-node.tsx:161-168` | S9 |
| areaResizeMinimum | {"width":100,"height":100} | explicit; `src/pages/editor-page/canvas/area-node/area-node.tsx:162-167` | S9 |
| zIndex | "area -10; note 50; table base 0; connected highlighted edge 1" | explicit and React Flow base; `src/pages/editor-page/canvas/canvas.tsx:125-126,249-267,518-584` | S5 S8 S9 |
| elevateNodesOnSelect | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3189` | S5 |
| elevateEdgesOnSelect | true | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3190` | S5 |
| nodeDragThreshold | 1 | React Flow default; `node_modules/@xyflow/react/dist/esm/index.mjs:3179` | source-defined; no threshold-boundary test |
| showMiniMapOnCanvas | true | fresh provider default; `src/context/local-config-context/local-config-provider.tsx:48-51` | S15 |
| showDBViews | false | fresh provider default; fixture enables through UI; `src/context/local-config-context/local-config-provider.tsx:26-28` | fixture and S15 |
| showCardinality | true | fresh provider default; `src/context/local-config-context/local-config-provider.tsx:30-32` | S3 S4 S5 |
| theme | "system; harness browser light; explicit UI light/dark captures" | fresh provider default; `src/context/local-config-context/local-config-provider.tsx:18-20` | S15 and screenshot pairs |
| export | "PNG, scale 4, background pattern true, transparent false" | dialog defaults; `src/dialogs/export-image-dialog/export-image-dialog.tsx:31-34` | S16 |
| newRelationshipCardinality | ["one","one"] | ChartDB createRelationship defaults; `src/context/chartdb-context/chartdb-provider.tsx:1317-1348` | S3 |

New pointer-created relationships default to one → one at src/context/chartdb-context/chartdb-provider.tsx:1317-1348. The 14 DBML relationships include many → one and one → one. MarkerDefinitions draws a circle and the text 1 or N at src/pages/editor-page/canvas/marker-definitions.tsx:9-71. These are not crow's-foot glyphs.

## Scenarios

### S1: load and fit

Steps: Create the fixture through the UI. Reload its saved diagram in a fresh browser context and click Show All.

Observed outcome: The sample imports 12 tables and 14 relationships. The completed fixture also has two areas, two notes, and one view with two dependencies. Show All settles at zoom 0.179.

Evidence: [S1.json](results/S1.json), [light screenshot](results/screenshots/S1-light.png), [dark screenshot](results/screenshots/S1-dark.png). Test entry: `scenarios.spec.mjs:520`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:395-405,1672-1703`: controlled canvas, delayed initial fit, explicit options.
- `src/pages/editor-page/canvas/toolbar/toolbar.tsx:72-80`: Show All.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1193-1209`: fitView schedules the fit.
- `node_modules/@xyflow/system/dist/esm/index.mjs:740-765`: viewport bounds and clamp geometry.

### S2: drag with grid toggle and Shift

Steps: Drag authors by 43 × 27 screen pixels without snapping, with the magnet toggle, and with Shift pressed after the first 4px of an active drag. Release Shift after pointer-up.

Observed outcome: free: (409.281, -683.491) → (638.212, -543.899). toggle: (638.212, -543.899) → (860, -400). shift: (860, -400) → (1080, -260). Toggle and active-drag Shift endpoints are multiples of 20 in graph space. Authors is selected before each trial and loses selection after the position update, as recorded in selectedBefore and selectedAfter.

Evidence: [S2.json](results/S2.json), [light screenshot](results/screenshots/S2-light.png), [dark screenshot](results/screenshots/S2-dark.png). Test entry: `scenarios.spec.mjs:534`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:360,1509,1697-1698`: button and Shift snap state.
- `src/pages/editor-page/canvas/canvas.tsx:596-673,1028-1320`: node changes persist geometry and rebuild controlled nodes.
- `node_modules/@xyflow/system/dist/esm/index.mjs:626-639,2062-2285`: grid rounding, pointer conversion, node drag.

### S3: connect fields

Steps: Select authors. Drag its country_code source handle onto publishers.country_code.

Observed outcome: One relationship is created between the two char(2) fields. Its cardinality defaults to one → one. Imported DBML relationships retain their own cardinality. The markers are circles containing 1 or N.

Evidence: [S3.json](results/S3.json), [light screenshot](results/screenshots/S3-light.png), [dark screenshot](results/screenshots/S3-dark.png). Test entry: `scenarios.spec.mjs:588`.

Production locations:

- `src/pages/editor-page/canvas/table-node/table-node-field.tsx:21-31,81-140,372-416`: field handle IDs and target activation.
- `src/pages/editor-page/canvas/canvas.tsx:801-867`: connection dispatch and type check.
- `src/context/chartdb-context/chartdb-provider.tsx:1317-1360`: new relationship defaults.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1734-1830`: Handle starts and completes pointer connections.

### S4: edge side flip

Steps: Drag publishers to the left of books. Read the books.publisher_id → publishers.id SVG path and marker sides before and after.

Observed outcome: The relationship changes sides from right → left to left → right. Both the SVG path and marker variants change. ChartDB minimizes the distance among four side pairs, rather than comparing node centers.

Evidence: [S4.json](results/S4.json), [light screenshot](results/screenshots/S4-light.png), [dark screenshot](results/screenshots/S4-dark.png). Test entry: `scenarios.spec.mjs:618`.

Production locations:

- `src/pages/editor-page/canvas/relationship-edge/relationship-edge.tsx:216-304`: internal dimensions, nearest-side rule, smooth-step arguments.
- `src/pages/editor-page/canvas/relationship-edge/relationship-edge.tsx:315-331,376-395`: marker IDs and rendered path.
- `node_modules/@xyflow/system/dist/esm/index.mjs:1337-1395`: smooth-step path geometry.

### S5: selection highlights connected edges

Steps: Select books and inspect connected edges. Click an unobstructed point on one connected relationship and inspect the selected edge.

Observed outcome: Selecting books raises connected edges to z-index 1 and animates them. Relationship strokes stay gray. Clicking the relationship selects it, changes its stroke to pink, and changes its marker variants. The selected table has z-index 1000.

Evidence: [S5.json](results/S5.json), [light screenshot](results/screenshots/S5-light.png), [dark screenshot](results/screenshots/S5-dark.png). Test entry: `scenarios.spec.mjs:643`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:487-584`: selected table IDs raise and animate connected edges.
- `src/pages/editor-page/canvas/relationship-edge/relationship-edge.tsx:315-331,376-412`: edge selection owns pink stroke and marker variants.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1563-1580,2794-2885`: node/edge selection and elevated edge rendering.

### S6: delete keys and editable exemptions

Steps: For Backspace and Delete, edit the sidebar Filter input, delete inventory on the canvas, and undo. Repeat the keys inside a note textarea.

Observed outcome: Both Backspace and Delete remove inventory on the canvas. Undo restores it. Neither key removes the table while the Filter input has focus, nor a note while its textarea has focus. Input text changes according to ordinary text editing. 6 key/target observations are recorded.

Evidence: [S6.json](results/S6.json), [light screenshot](results/screenshots/S6-light.png), [dark screenshot](results/screenshots/S6-dark.png). Test entry: `scenarios.spec.mjs:685`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:1702,871-925,1028-1320`: delete key wiring and removal effects.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1220-1235`: global key handler deletes selected entities.
- `node_modules/@xyflow/react/dist/esm/index.mjs:419-436`: editable target guard.
- `node_modules/@xyflow/system/dist/esm/index.mjs:845-854`: input, contenteditable, and nokey recognition.

### S7: multi-select clicks and box

Steps: Click authors, then books while holding Shift, Meta, or Control. Dismiss any context menu. Shift-drag a full box around inventory, then a box intersecting only part of it.

Observed outcome: Shift: selected ["authors","books"]. Meta: selected ["authors","books"]. Control: selected ["authors"], with a context menu. Full box: ["inventory"]. Partial box: []. Control-click is interpreted by macOS Chromium as a context click in this run, despite Control being configured as a multi-selection key.

Evidence: [S7.json](results/S7.json), [light screenshot](results/screenshots/S7-light.png), [dark screenshot](results/screenshots/S7-dark.png). Test entry: `scenarios.spec.mjs:754`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:1699-1703`: Full selection and all three modifiers.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1407-1549`: capture-phase box selection.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1220-1235,1563-1580`: multi-selection key state and toggles.
- `node_modules/@xyflow/system/dist/esm/index.mjs:354-379`: full containment test.

### S8: area drag carries member tables

Steps: Drag the Catalog grip by 44 × 33 screen pixels and compare all six member tables with nonmembers.

Observed outcome: Catalog moves by (228.93, 173.094) graph units. All 6 member tables receive the same delta. Nonmember positions are recorded separately. The area's base z-index is −10.

Evidence: [S8.json](results/S8.json), [light screenshot](results/screenshots/S8-light.png), [dark screenshot](results/screenshots/S8-dark.png). Test entry: `scenarios.spec.mjs:795`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:1028-1080,1100-1202`: visual and persisted member deltas.
- `src/pages/editor-page/canvas/canvas.tsx:748-798`: debounced containment membership updates.
- `src/lib/utils/area-utils.ts:15-78`: full table containment and area priority.
- `node_modules/@xyflow/system/dist/esm/index.mjs:2062-2285`: pointer drag and graph-space conversion.

### S9: resize constraints

Steps: Select inventory, a note, and Sales. Drag the table right resize line or the note/area bottom-right handle smaller, then larger.

Observed outcome: table: 224 × 176 → 224 × 176 → 450 × 176. note: 200 × 150 → 200 × 150 → 1316 × 931. area: 1344 × 630 → 100 × 100 → 1216 × 881. Table height stays fixed; its horizontal width is constrained to 224–450. Note minimum is 200 × 150; area minimum is 100 × 100. No explicit upper size limit is supplied for notes or areas.

Evidence: [S9.json](results/S9.json), [light screenshot](results/screenshots/S9-light.png), [dark screenshot](results/screenshots/S9-dark.png). Test entry: `scenarios.spec.mjs:834`.

Production locations:

- `src/pages/editor-page/canvas/table-node/table-node.tsx:464-471`: horizontal table resizer.
- `src/lib/domain/db-table.ts:13-15`: 224 and 450 width limits.
- `src/pages/editor-page/canvas/note-node/note-node.tsx:161-168`: 200 × 150 note minimum.
- `src/pages/editor-page/canvas/area-node/area-node.tsx:162-167`: 100 × 100 area minimum.
- `node_modules/@xyflow/react/dist/esm/index.mjs:4639-4778,4810-4815`: resize controls produce node changes.
- `node_modules/@xyflow/system/dist/esm/index.mjs:3149-3240,3318-3520`: resize geometry and constraints.

### S10: zoom clamps

Steps: Click Zoom Out through its lower clamp and once more. Click Zoom In through its upper clamp and once more.

Observed outcome: The minimum is 0.1, and another Zoom Out leaves 0.1. The maximum is 5, and another Zoom In leaves 5.

Evidence: [S10.json](results/S10.json), [light screenshot](results/screenshots/S10-light.png), [dark screenshot](results/screenshots/S10-dark.png). Test entry: `scenarios.spec.mjs:895`.

Production locations:

- `src/pages/editor-page/canvas/canvas.tsx:1683-1684`: 0.1 and 5 limits.
- `src/pages/editor-page/canvas/toolbar/toolbar.tsx:55-62`: 200ms zoom buttons.
- `node_modules/@xyflow/react/dist/esm/index.mjs:503-526`: zoom helpers call pan/zoom.
- `node_modules/@xyflow/system/dist/esm/index.mjs:2875-3030`: D3 zoom scale extent.

### S11: scroll setting

Steps: Set View → Zoom on Scroll to Off, then On. Apply the same pixel-mode wheel input, deltaX 80 and deltaY 120, over an empty pane.

Observed outcome: Zoom on Scroll Off: viewport {"x":80.067,"y":467.303,"zoom":0.179} → {"x":40.067,"y":407.303,"zoom":0.179}; document scroll (0, 0). Zoom on Scroll On: viewport {"x":40.067,"y":407.303,"zoom":0.179} → {"x":197.794,"y":360.078,"zoom":0.152}; document scroll (0, 0). Off means pan-on-scroll. On means wheel zoom.

Evidence: [S11.json](results/S11.json), [light screenshot](results/screenshots/S11-light.png), [dark screenshot](results/screenshots/S11-dark.png). Test entry: `scenarios.spec.mjs:927`.

Production locations:

- `src/context/local-config-context/local-config-provider.tsx:22-24,68-70`: pan default and persistence.
- `src/pages/editor-page/top-navbar/menu/menu.tsx:400-418`: setting controls.
- `src/pages/editor-page/canvas/canvas.tsx:1696`: panOnScroll option.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1283-1372`: scroll options and defaults.
- `node_modules/@xyflow/system/dist/esm/index.mjs:2689-2740,2908-2958`: pan wheel scaling and handler choice.

### S12: filter and lost-in-canvas recovery

Steps: Open Filter Tables. Search for books, toggle its eye off and on, and close the filter. Wheel-pan far away and click the out-of-view Show All button.

Observed outcome: Typing books narrows the filter tree without hiding the diagram. The eye toggle hides books. The reference calls fit after filter changes, although the measured transform may stay the same when outer bounds do not change. The far-away viewport renders 0 nodes; Show All restores zoom 0.179.

Evidence: [S12.json](results/S12.json), [light screenshot](results/screenshots/S12-light.png), [dark screenshot](results/screenshots/S12-dark.png). Test entry: `scenarios.spec.mjs:951`.

Production locations:

- `src/pages/editor-page/canvas/canvas-filter/canvas-filter.tsx:134-163`: search filters the filter tree.
- `src/pages/editor-page/canvas/canvas-filter/filter-item-actions.tsx:136-195`: eye toggles canvas visibility.
- `src/pages/editor-page/canvas/canvas.tsx:710-743`: filter-triggered fit.
- `src/pages/editor-page/canvas/hooks/use-is-lost-in-canvas.tsx:7-91`: viewport-end visibility check.
- `src/pages/editor-page/canvas/show-all-button.tsx:22-30`: recovery fit.
- `node_modules/@xyflow/react/dist/esm/index.mjs:2010-2035`: render culling uses the viewport.

### S13: focus from side list

Steps: Hover books in the sidebar and click its circular focus icon.

Observed outcome: The focus icon selects ["books"] and changes zoom from 0.179 to 1. It centers books at 1×. Clicking the row label alone opens its details; the focus icon is the tested entry point.

Evidence: [S13.json](results/S13.json), [light screenshot](results/screenshots/S13-light.png), [dark screenshot](results/screenshots/S13-dark.png). Test entry: `scenarios.spec.mjs:999`.

Production locations:

- `src/pages/editor-page/side-panel/tables-section/table-list/table-list-item/table-list-item-header/table-list-item-header.tsx:93-100,320-322`: focus icon entry.
- `src/hooks/use-focus-on.ts:53-86`: selection and animated fit fixed at zoom 1.
- `node_modules/@xyflow/react/dist/esm/index.mjs:1193-1209`: fit scheduling.
- `node_modules/@xyflow/system/dist/esm/index.mjs:740-765`: viewport transform.

### S14: context add at pointer

Steps: Right-click an empty pane point near the right edge. Click New Table and rename it context_table. Compare pane-pointer and menu-item coordinates.

Observed outcome: The pane pointer is (1518.75, 145.844) screen pixels. The created table is at (4953.732, -1938.353) graph coordinates. The trusted menu-input receipt records the actual input coordinates and click-time DOM transform. mappingDeltaGraph records the residual between the created position and the estimate from that rendered transform. Exact subpixel agreement with React Flow's internal camera is unverified. The handler uses the menu item's click coordinates, (1416.58, 166), so the creation point can differ from the original context-click point when the menu is repositioned near a window edge.

Evidence: [S14.json](results/S14.json), [light screenshot](results/screenshots/S14-light.png), [dark screenshot](results/screenshots/S14-dark.png). Test entry: `scenarios.spec.mjs:1018`.

Production locations:

- `src/pages/editor-page/canvas/canvas-context-menu.tsx:69-104,299-303`: menu item click coordinates create the table.
- `src/hooks/use-update-table.ts:12-31`: one-second name save debounce.
- `node_modules/@xyflow/react/dist/esm/index.mjs:548-564`: screenToFlowPosition reads pane bounds and viewport.
- `node_modules/@xyflow/system/dist/esm/index.mjs:632-639`: coordinate conversion.

### S15: minimap and dark theme

Steps: Hide and show the minimap through View. Choose Dark, then Light through View → Theme.

Observed outcome: Minimap presence changes to false after Hide and to true after Show. The root class becomes "dark" in Dark and "" in Light. Paired screenshots record both themes.

Evidence: [S15.json](results/S15.json), [light screenshot](results/screenshots/S15-light.png), [dark screenshot](results/screenshots/S15-dark.png). Test entry: `scenarios.spec.mjs:1095`.

Production locations:

- `src/pages/editor-page/top-navbar/menu/menu.tsx:395-398,443-482`: minimap and theme menu actions.
- `src/context/local-config-context/local-config-provider.tsx:18-20,48-51,65-67,80-85`: defaults and local settings.
- `src/pages/editor-page/canvas/canvas.tsx:1674,1869-1881`: effective theme and minimap rendering.
- `node_modules/@xyflow/react/dist/esm/index.mjs:4537-4630`: MiniMap reads node and viewport state.

### S16: undo redo and image export

Steps: Drag inventory, press Meta+Z, then Meta+Shift+Z. Choose Actions → Export as → PNG, retain dialog defaults, click Export, and inspect the downloaded PNG header.

Observed outcome: Inventory moves (900, 600) → (1168.016, 756.343). Undo restores (900, 600), and redo restores (1168.016, 756.343). The downloaded PNG is 4605 × 3816 pixels, 2735909 bytes. Defaults are 4×, patterned, and opaque. Export captures the current canvas viewport, not the full graph bounds.

Evidence: [S16.json](results/S16.json), [light screenshot](results/screenshots/S16-light.png), [dark screenshot](results/screenshots/S16-dark.png). Test entry: `scenarios.spec.mjs:1110`.

Production locations:

- `src/context/keyboard-shortcuts-context/keyboard-shortcuts-provider.tsx:23-37`: keyboard dispatch.
- `src/context/history-context/history-provider.tsx:64-69,274-286,384-413`: replay state changes.
- `src/dialogs/export-image-dialog/export-image-dialog.tsx:31-60,168-173`: PNG dialog defaults and export action.
- `src/context/export-image-context/export-image-provider.tsx:39-47,69-100,254-302`: current viewport rasterization and actual download.
- `node_modules/@xyflow/react/dist/esm/index.mjs:528-531`: React Flow state access for export.

## Conformity and deviations

Reference-conforming: S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16 have real-browser records. The exercised options, geometry, selection, deletion, area movement, size limits, zoom limits, settings, history, and download are reference observations at the pinned versions. Source/runtime agreement establishes only these bounded reference facts.

Intentionally different test setup: each scenario reloads the same UI-built persistence snapshot in a fresh context. Groups are separated for stable membership. This avoids cumulative scenario changes and overlapping-area priority affecting later captures. It does not test import and history as one continuous editing session. The one-time star request is dismissed after its 30-second timer at src/pages/editor-page/editor-page.tsx:30,50-65.

Unverified comparison: all Flow and Schema Studio conformity remains open. No Flow browser suite ran, no implementation was changed, and no comparison trace was written outside this authorized folder. The reference differs from some Plan 121 assumptions: markers are circular 1/N badges, edge-side choice minimizes side-pair distance, new relations default one-to-one, table selection leaves connected strokes gray, Control-click has a macOS context-menu effect, and context-menu creation uses the menu-item click. Whether Schema Studio intentionally differs must be decided against its own browser evidence.

Unverified variants: Firefox, Safari, Windows/Linux shortcuts, mobile/touch, pinch zoom, Space panning, canvas double-click zoom, input SELECT/contenteditable/nokey deletion exemptions, all relationship-validation cases, schema-based filtering, nested/overlapping-area priority, upper bounds for note/area sizes, and JPG/SVG export were not exercised. Their source defaults do not constitute runtime coverage. Shift snapping is tested after drag activation; Shift held before pointer-down also activates selection and is covered by S7's selection path.

Verification boundary: Focused verification passes in the temporary copy after normalizing the pre-existing one-line Plan 121 formatting issue there. The original worktree quality gate still fails on that unchanged plan. Root lint and formatting excluding that plan pass. The exact scope and exception are in results/verification-scope.json; results/verification.log includes the original failure and the focused pass. A temporary copy runs bun run verify --focused because this checkout has no browser-skip CLI. This is not full-suite, integration, collector, or release acceptance.
