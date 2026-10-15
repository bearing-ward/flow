# Plan 121: Schema Studio, a ChartDB-style app on Vanilla Flow

Build a real-app stress test. Schema Studio clones the ChartDB canvas editor on the Vanilla host and exercises as much of Flow's public API as a database diagram editor naturally uses. Vanilla comes first. Vue and Foldkit ports wait until the comparison in step 4 is reviewed.

Reference: ChartDB `c24936a402bb3e24b4858f05282d69a04fcfe25b` (`@xyflow/react` ^12.8.2), canvas in `src/pages/editor-page/canvas/`. ChartDB is AGPL-3.0, so this is a clean-room clone of observable behaviour. Do not copy its source, CSS, icons, copy text or templates. Keep the reference checkout outside the repo.

## 1. Shared domain (`apps/shared/schema-studio/`, no DOM)

Schema model (tables, fields, relationships with cardinality, views with dependencies, areas, notes), an original sample schema of about 12 tables with 2 areas, 1 view and 2 notes, and a DBML rendering of the same sample for importing into ChartDB. Add pure helpers: overlap detection, area membership, the relationship-side rule (the minimum-distance pair among the four left/right endpoint pairs), history (undo/redo of model commands) and JSON import/export. Vue and Foldkit reuse it later.

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
  - **Filter and overlap:** a schema/name search that narrows the list, with per-table eyes that hide canvas tables and trigger a fit; a "lost in canvas" show-all button driven by viewport changes; overlap highlighting with a "show overlaps" control.
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

### Round 2 conformity and deviations (historical)

- **Conforming to the pinned React keyboard and dynamic-snap contract:** Flow retains its built-in grid-step/5px movement and Shift multiplier. The host browser tests prove 5/20 unsnapped and 20/80 snapped, native announcements, and snap changes on the next move of an active drag. Schema Studio S2 proves uninterrupted Shift snapping mid-drag, and S7 proves no remount on Shift-click. These tests exercise Flow; the React comparison is source-backed, with no runtime React or ChartDB parity claim.
- **Conforming to the requested Flow application contract:** the shared domain unit tests cover the fixed seed, field constraints, overlap geometry, area membership, relative-centre side selection, connection validation, history, and JSON import/export. S1–S16 exercise native browser inputs against the public Vanilla host. Additional browser tests cover toolbars, HTML cardinality, reconnection, a floating cursor node, keyboard announcements, copy/paste, inline editing, overlap deletion, layout, and culling. These are Flow-only tests, not ChartDB comparison evidence.
- **Intentionally different:** the UI, marker drawings, copy, and styles are original clean-room work. Schema Studio adds the Beyond ChartDB behaviors requested by this plan. It stores a versioned application model in localStorage and exports the current caller-owned canvas to PNG. Domain tests and the extra browser tests define these application boundaries. No source-similarity or pixel-parity claim is made.
- **Unverified versus ChartDB:** all direct ChartDB comparisons for S1–S16, including exact selection thresholds, pointer timing, layout, marker appearance, area semantics, and persistence behavior, await step 4. The implementation tests do not load ChartDB. Native touch devices, complete Vue/Foldkit application parity, and OpenTelemetry collector delivery are also unverified.

### Round 3 captured-reference alignment

This round starts from `362a1b0`, after `git merge main` fast-forwarded the existing worktree. The evidence is `research/references/chartdb/REFERENCE.md`, `results/settings.json`, and all S1–S16 results at ChartDB `c24936a402bb3e24b4858f05282d69a04fcfe25b`, React Flow 12.10.0, and xyflow system 0.0.74. Only the captured observations and documented behavior informed this implementation. No ChartDB implementation source, CSS, icons, or strings were copied. The reference files remain unchanged.

- Edge sides now minimize endpoint distance among all four left/right pairs in the shared pure helper. Unit tests include unequal widths, overlapping bounds, both same-side pairs, and deterministic ties. S4 moves publishers to the right of books to establish the reference's starting orientation, then drags publishers to the left. It asserts right → left becomes left → right, the field handle IDs, both marker-side variants, and changed SVG geometry. The original seed layout does not match the reference's UI-arranged positions.
- New pointer-created relationships default to one → one. Imported DBML many → one and one → one relationships retain their cardinality. Original double-bar and branching glyphs distinguish 1 from N. Marker IDs include cardinality, left/right side, and normal/selected state. S3 and the cardinality popover test cover these outputs.
- Selected tables render at z-index 1000, above unselected tables at 0. Connected relationships render at 1, above unrelated relationships at 0, and animate with their normal stroke. Only a selected relationship gets the original accent stroke and selected markers. The app uses public manual stacking because its real parented area nodes would otherwise add endpoint elevation to connected edges. The projection subtracts Vanilla's reserved node-layer offset of 1 to obtain the captured rendered values. S5 checks the actual wrappers, SVG strokes, animation, and marker URLs.
- Table resize controls allow horizontal width changes from 224 to 450. Height remains unchanged. Corner and vertical controls are hidden. Note minima are 200 × 150, and area minima are 100 × 100. Notes and areas have no configured maxima. Seed notes start at height 150. S9 tests both table clamps with nonzero vertical input, undo/redo, both other minima, and note/area growth beyond 10,000 in both dimensions.
- Initial fit, Show all, visibility-eye fits, and lost-canvas recovery use padding 0.1, maxZoom 0.8, and duration 500ms. Side-list focus selects the table and fits with minZoom = maxZoom = 1 and duration 500ms. Search narrows only the list without changing the canvas or viewport. Each eye toggles its table and relationships on the canvas and triggers a fit. Default render culling is enabled. Lost-canvas recovery counts all visible studio node kinds, including notes, areas, and views. S1/S13 checks animation completion, fixed-fixture fit geometry, and centered zoom-one focus. A note-only JSON import checks that a visible note suppresses the recovery button and Show all clamps at 0.8. S12 checks search, visibility, zero rendered nodes after panning away, and recovery.
- Zoom on scroll starts Off. Wheel input pans freely at speed 0.5. On switches to wheel zoom through `setCanvasOptions`, without remounting. S11 sends the reference's (80,120) pixel-mode wheel input and asserts a (-40,-60) viewport change, unchanged zoom, and no document scroll, then tests wheel zoom and a return to panning.
- PNG export captures the current viewport at scale 4 with an opaque background and the dot pattern. S16 inspects the actual downloaded PNG dimensions, signature, opaque pixels, base background color, and differing pattern pixels. The Schema Studio canvas is 1235 × 904 CSS pixels in this test, so the PNG is 4940 × 3616. ChartDB's 4605 × 3816 file comes from its different canvas dimensions, not from a whole-graph export.
- Snapping remains the original button-or-Shift 20 × 20 grid, including uninterrupted active-drag Shift changes. Delete exemptions now include `.nokey` and descendants, alongside select, input, textarea, editable content, and shadow-DOM inputs. S2 and S6 exercise these boundaries. S14 retains creation at the original pane pointer.

### Round 3 production and test paths

Native field-pointer completion enters `apps/vanilla/schema-studio/main.ts:982`, calls `addRelationship` at `apps/vanilla/schema-studio/main.ts:750`, records application state through `commit` at `apps/vanilla/schema-studio/main.ts:376`, and projects field IDs through `apps/vanilla/schema-studio/graph.ts:135`. Native drag and resize publish host state, read by `syncGraph` at `apps/vanilla/schema-studio/main.ts:776` through the public state subscription at `apps/vanilla/schema-studio/main.ts:1079`. Geometry reads actual internal node positions, dimensions, and field handles at `apps/vanilla/schema-studio/renderers.ts:133`, chooses sides through `apps/shared/schema-studio/model.ts:109`, and passes endpoints to `getSmoothStepPath` at `apps/vanilla/schema-studio/renderers.ts:185`. Renderer updates publish the SVG path, marker URLs, and stroke at `apps/vanilla/schema-studio/renderers.ts:279`. Selection enters `apps/vanilla/schema-studio/main.ts:1038`, then graph projection supplies animation and z-indices at `apps/vanilla/schema-studio/graph.ts:151`. The host applies its node-layer offset at `apps/vanilla/src/mount-flow.ts:7830`.

List and eye clicks enter `apps/vanilla/schema-studio/main.ts:299`. Focus calls public `fitView` with fixed zoom, while eyes change the hidden-table set, update the projected document, and call `showAll` at `apps/vanilla/schema-studio/main.ts:1200`. The public fit implementation starts at `apps/vanilla/src/mount-flow.ts:13386` and uses the viewport bounds contract at `packages/core/src/domain/flow-viewport-operation.schema.ts:135`. Wheel setting changes call `updateCanvasOptions` at `apps/vanilla/schema-studio/main.ts:849`, then the decoded public host setter. Native wheel handling at `apps/vanilla/src/mount-flow.ts:12087` reads current pan speed/mode and zoom options and publishes viewport changes. Resizer registration enters `apps/vanilla/schema-studio/main.ts:1122`, uses the public control constraints, then `stepFlowNodeResize` at `apps/vanilla/src/mount-flow.ts:7255` produces bounds changes. The state subscription synchronizes those dimensions into the model and rendered node sizes. PNG export starts at `apps/vanilla/schema-studio/main.ts:1367` and rasterizes the caller-owned canvas, including its rendered viewport transform and background.

The browser test path starts at `/schema-studio/` and uses Playwright pointer, wheel, keyboard, list, menu, and file-picker inputs. Read-only DOM/model observations assert the captured contracts in `apps/vanilla/e2e/schema-studio.e2e.ts:161`, `apps/vanilla/e2e/schema-studio.e2e.ts:235`, `apps/vanilla/e2e/schema-studio.e2e.ts:271`, `apps/vanilla/e2e/schema-studio.e2e.ts:358`, `apps/vanilla/e2e/schema-studio.e2e.ts:453`, `apps/vanilla/e2e/schema-studio.e2e.ts:562`, `apps/vanilla/e2e/schema-studio.e2e.ts:603`, `apps/vanilla/e2e/schema-studio.e2e.ts:655`, and `apps/vanilla/e2e/schema-studio.e2e.ts:776`. Tests do not load ChartDB, inject its state, or call private Flow functions. The reference's independent runtime capture and these assertions establish bounded comparison facts, not pixel, timing, or complete-app parity.

### Round 3 verification evidence

`OTEL_SDK_DISABLED=true bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts --workers=1 --repeat-each=3` passed 27 tests per repeat, 81 total. Failed or interrupted development attempts are excluded from acceptance counts.

Focused `OTEL_SDK_DISABLED=true bun run verify` passed all 14 selected gates, including quality and oxfmt, architecture, package builds, typechecking, 2,506 unit tests across 95 files, API members, catalog, packed consumers, documentation, example recipes, the Vanilla app build, and all saved browser scopes. Browser counts were Vanilla 484 passed with two existing skips, Vue 709 passed, and Foldkit 291 passed. The active scope remains 28 Vanilla files, 23 Vue files, and 30 Foldkit files. `verification.config.json` names round 3 and retains the focused default.

Complete Vanilla `OTEL_SDK_DISABLED=true bunx playwright test --workers=1 --grep-invert calibration` passed 659 tests with two existing skips, 661 selected tests across 55 files. The existing performance fixture completed; its diagnostics establish no performance change or budget. Each repeated-suite, focused-verifier, and complete-Vanilla command acquired `/tmp/flow-browser.lock` with a unique owner token and released only its own lock through a shell trap in that same command. All locks were released. The sample DBML hash remains `4f91390aca7ede6b79c9103bcc5b08054337d9af39a573718162637ac3b27f1e`. These counts establish focused acceptance and complete Vanilla coverage excluding calibration. They do not establish `verify:full`, complete-app parity, cross-host Schema Studio parity, or collector delivery.

### Conformity and deviations

**Conforming:** the tested endpoint-side flip and minimum-distance rule; one → one pointer defaults and retained imported cardinality; side-specific normal/selected marker variants; connected-edge elevation and animation without accent stroke; selected-table elevation; table/note/area resize constraints; 0.1 padding, 0.8 cap, 500ms fits and zoom-one focus; separate list search and canvas visibility; recovery only when every studio node is out of view; free wheel-pan at speed 0.5 and optional wheel zoom; viewport PNG export at scale 4 with opaque patterned pixels; 20 × 20 snapping; and deletion exemptions. S1–S16 and the three added browser cases define this comparison boundary. Select, contenteditable, shadow DOM, `.nokey`, and growth beyond 10,000 have stronger Schema Studio coverage than the captured reference, whose corresponding source contracts were not all exercised.

**Intentionally different:**

- Styling, colors, UI copy, eye icon, and marker artwork remain original. Double-bar/branch glyphs represent 1/N instead of ChartDB's circular text badges. Tests assert distinguishable glyphs and marker meaning, not pixel identity.
- The fixed original seed layout, 250px initial table widths, field spacing, and card dimensions remain. ChartDB imports and arranges the fixture differently, so its absolute coordinates, Show All zoom 0.179, and PNG dimensions are not transplanted. S1/S4/S16 compare the fit, side, and scale contracts against Schema Studio's own geometry.
- Pane-context creation uses the original context pointer. ChartDB uses the menu item's eventual click point. S14 retains the pointer-mapping test because the original point is the predictable creation location.
- Table selection survives drag completion. ChartDB rebuilds its controlled table nodes and clears selection in S2. Schema Studio retains selection for follow-up operations. S2 and keyboard/copy tests keep this application behavior.
- Clicking a list row directly focuses/selects. ChartDB's row opens details and a separate icon focuses. S13 tests the requested Schema Studio side-list entry.
- Blank left-button drag starts rectangle selection, and middle-button drag pans. ChartDB's defaults use Shift for rectangle selection and left-button drag for panning. This existing application gesture choice supports the plan's explicit selection-rectangle exercise. S7 retains its click and full-box tests.
- The plan's Beyond ChartDB additions remain: selected-table toolbars, HTML cardinality labels/popovers, endpoint reconnection, a click-started floating relationship, keyboard movement and announcements, copy/paste, overlap deletion, and auto-arrange. Their named Beyond tests define the boundary.
- Schema Studio persists its versioned model in localStorage, saves inline edits on an explicit action, and keeps runtime view settings/visibility in the current session. ChartDB uses IndexedDB and its own configuration and debounced-edit persistence. S16, inline-edit, and JSON tests verify Schema Studio's original application contract.

**OS/Chromium observation:** ChartDB S7 records Control-click on macOS opening a context menu and leaving only authors selected. Schema Studio's Playwright `click({ modifiers: ['Control'] })` currently adds publishers to the selection; explicit right-click opens its app menu. S7 and S14 record the tested input boundary. No OS-level Control-click remapping was added. Physical macOS Control-click is unverified here, so the automation difference is not claimed as a Flow-versus-React gesture defect.

**Unverified:** full pixel parity, exact frame ordering and input timing, tie-breaking against ChartDB, nested/overlapping-area priority, native touch/pinch and other browsers or operating systems, complete Vue/Foldkit Schema Studio ports, OpenTelemetry collector delivery, and `verify:full` acceptance. No comparison trace outside this plan was added. Review and integration remain parent-level work. This round commits only and does not push or merge back.
