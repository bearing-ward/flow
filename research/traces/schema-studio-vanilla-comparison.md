# Schema Studio (Vanilla Flow) compared with ChartDB (React Flow)

Plan 121, step 4. This page puts two runs of the same scenarios side by side:

- **Reference:** ChartDB `c24936a402bb3e24b4858f05282d69a04fcfe25b` on React Flow 12.10.0 / xyflow system 0.0.74. The evidence is `research/references/chartdb/REFERENCE.md` and `results/S*.json`.
- **Clone:** Schema Studio on the Vanilla host. The evidence is `apps/vanilla/e2e/schema-studio.e2e.ts`, and the call paths are in `plans/121-schema-studio-vanilla.md`.

Both load `apps/shared/schema-studio/sample-schema.dbml` and drive the scenarios with real browser input. Neither run loads the other app. Every comparison below is between two independent observations: no test asserts a ChartDB value against Flow at runtime.

The two apps lay the sample out differently, so absolute coordinates, fit zoom and PNG pixel sizes are not compared. Contracts are: rules, limits, options and outcomes.

| # | Behaviour | ChartDB (React Flow) | Schema Studio (Flow Vanilla) | Flow API exercised | Result |
| --- | --- | --- | --- | --- | --- |
| S1 | Load and fit | 12 tables, 14 relationships, 2 areas, 2 notes, 1 view; Show All fits with padding 0.1, max zoom 0.8 over 500 ms | Same content; the initial fit and Show All use padding 0.1, max zoom 0.8 and 500 ms | `fitView` options, `nodeRenderers` | Conforming |
| S2 | Snap and Shift | 20×20 grid from the toggle or from Shift pressed mid-drag; selection is cleared after the drag | 20×20 from the toggle or mid-drag Shift without interrupting the drag; selection is kept | `setCanvasOptions({ snapToGrid, snapGrid })` (added in Plan 121) | Conforming snap; selection kept intentionally |
| S3 | Connect fields | Field-to-field drag creates a one→one relationship; imported relationships keep their cardinality | Same, with validation for self-field and duplicate connections | Field `Handle`s via `onHandleRender` (added), `isValidConnection`, custom connection line | Conforming |
| S4 | Edge side flip | The nearest of four side pairs; right→left becomes left→right | Same rule (shared helper, unit-tested); the same flip with side-specific markers | `getInternalNode`, `getSmoothStepPath`, custom edge renderer | Conforming |
| S5 | Selection styling | Selected table at z 1000; connected edges at z 1, animated, stroke unchanged; a selected edge turns accent with selected markers | Same values | Manual `zIndex`, edge `animated`, edge renderer | Conforming (the app sets z values manually) |
| S6 | Delete keys | Backspace and Delete remove selected items; inputs and textareas are exempt | Same, also exempting select, contenteditable, shadow-DOM inputs and `.nokey` | `deleteKeyCode` | Conforming |
| S7 | Multi-select and box | Shift and Meta add to the selection; Shift-drag draws a Full-mode box; a partial box selects nothing | Same after the review adjustment | `multiSelectionKeyCode`, `selectionMode: 'full'` | Conforming; Control-click is OS-dependent (see below) |
| — | Blank-pane drag | Pans (React Flow default `panOnDrag`) | Pans by exactly the pointer delta; zoom and selection unchanged | Default `panOnDrag` | Conforming |
| S8 | Area carries tables | Dragging an area moves fully contained tables by the same delta; area z is −10 | Same | Node drag changes, `getIntersectingNodes` | Conforming |
| S9 | Resize limits | Table width 224–450, horizontal only; note at least 200×150; area at least 100×100; no maximums | Same | `NodeResizer` constraints | Conforming |
| S10 | Zoom clamps | 0.1–5, holding at each limit | Same | Viewport `limits` | Conforming |
| S11 | Scroll setting | Default is pan-on-scroll (speed 0.5, free); the "zoom on scroll" setting switches to wheel zoom | Same; a (80, 120) wheel input gives a (−40, −60) pan with no page scroll | `setCanvasOptions({ panOnScroll, zoomOnScroll })` (added) | Conforming |
| S12 | Filter and lost-canvas | Search narrows only the list; the eye hides the table and refits; Show All appears when no nodes are rendered | Same | `renderOnlyVisible`, viewport subscription, `fitView` | Conforming |
| S13 | Focus from list | A separate icon selects the table and fits at zoom 1 over 500 ms | Clicking the row selects the table and fits at zoom 1 over 500 ms | `fitView({ nodes, minZoom: 1, maxZoom: 1 })` | Conforming fit; entry point intentionally different |
| S14 | Context-menu add | Creates the table at the menu item's click point (a ChartDB quirk) | Creates it at the original right-click point | `screenToFlowPosition` | Intentionally different |
| S15 | Minimap and theme | The minimap toggles; dark mode switches the root class | Same | Minimap, `setColorMode` | Conforming |
| S16 | Undo/redo and export | Meta+Z and Meta+Shift+Z restore positions; the PNG is 4× the current view, opaque and patterned | Same contract (PNG size follows each canvas size) | Change subscriptions, `html-to-image` on the canvas | Conforming |

## What the clone found in Flow

- **Gap, fixed: runtime canvas options.** Vanilla could not change snap, scroll or culling settings after mount. React Flow props are reactive. The first build remounted the canvas on every Shift press. Plan 121 added `setCanvasOptions`, which takes effect mid-gesture as React's XYDrag does, and has host tests in `closing-options.e2e.ts`. Vue and Foldkit need to be checked for the same gap before their ports start.
- **Gap, fixed: per-field handle placement.** There was no public way to position host-owned handles per field row. Plan 121 added the opt-in, Vanilla-only `onHandleRender`.
- **No gap: keyboard movement.** Flow's built-in movement already matches React (`useMoveSelectedNodes.ts:29-33`). An app-level override in the first build was a planning error and has been removed.

## Conformity and deviations

- **Conforming:** S1–S12, S15 and S16, plus blank-pane panning. Each row above names its test boundary in `schema-studio.e2e.ts` and its reference record in `results/S*.json`. Agreement is between two independent runtime observations at the pinned versions, not pixel or timing parity.
- **Intentionally different:**
  - **Visuals:** original styling, the 1/N marker artwork and the seed layout. This is a clean-room requirement, since ChartDB is AGPL-3.0.
  - **App interaction choices:**
    - selection is kept after a drag (S2);
    - the list row is the focus entry point (S13);
    - context-menu creation uses the right-click point (S14);
    - persistence uses localStorage.
  - **Beyond ChartDB:**
    - toolbars and HTML cardinality labels;
    - reconnection and floating relationships;
    - copy/paste, overlap deletion and auto-arrange.

  None of these reflects a Flow limitation.

- **Unverified:**
  - **Control-click on macOS:** ChartDB's capture opened a context menu, while Schema Studio's Playwright Control-click added to the selection. This depends on how the OS and Chromium deliver the event to each app's menu handling, and a physical macOS Control-click was not tested on either side.
  - **Also untested:** touch, pinch and other browsers; overlapping-area priority; frame order; pixel parity; and the Vue and Foldkit ports.
