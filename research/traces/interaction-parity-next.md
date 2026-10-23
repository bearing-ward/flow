# Interaction parity boundaries for Plans 024–032

This trace revisits the observable cells selected in Plan 022 after the resize, renderer, overlay, and native-keyboard slices. It separates source evidence from browser output; source resemblance alone does not establish parity. The pinned tree is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921`.

## Reference paths

### Resize geometry and hierarchy

React's `NodeResizeControl` creates an `XYResizer` and provides node lookup, viewport transform, snapping, node origin, and pane geometry; its callback translates size and position changes to the store (`packages/react/src/additional-components/NodeResizer/NodeResizeControl.tsx:62`, `packages/react/src/additional-components/NodeResizer/NodeResizeControl.tsx:91`). Svelte's `ResizeControl.svelte` obtains geometry from its store, wires the same resizer, and maps updates into `store.nodes` (`packages/svelte/src/lib/plugins/NodeResizer/ResizeControl.svelte:60`, `packages/svelte/src/lib/plugins/NodeResizer/ResizeControl.svelte:75`). The shared system captures local position and measured size, resolves extents, calculates direction-specific dimensions, and offsets child-local positions for top/left resize (`packages/system/src/xyresizer/XYResizer.ts:141`, `packages/system/src/xyresizer/XYResizer.ts:172`, `packages/system/src/xyresizer/XYResizer.ts:219`). A pinned Chromium capture now compares one left-edge +20 px resize at zoom 1 with a 90×60 parent and direct child; its observed normalized parent bounds and child world/local positions match Flow (`research/fixtures/reference-captures.json:77`). This is a single output cell, not evidence for other directions, bounds, cancellation, or adapter behavior.

### Pointer ownership and cancellation

The reference `XYDrag` aborts node dragging if a touch move reports multiple touches or the dragged node disappears; its end path restores the recorded drag items (`packages/system/src/xydrag/XYDrag.ts:324`, `packages/system/src/xydrag/XYDrag.ts:364`). This does not establish the native capture lifecycle for a viewport pinch, nor independent pointer-session ownership. No equivalent imported browser test is present for either output.

### Custom drag handle

The React/Svelte node wrapper supplies a DOM selector to the shared drag code. The pinned browser test compares an outside-handle press, which leaves the node transform unchanged, with a handle press, which changes it (`tests/playwright/e2e/nodes.spec.ts:136`). The imported `reference-captures.json` stores both observed transforms and normalized change booleans from that test (`research/fixtures/reference-captures.json:26`, `research/fixtures/reference-captures.json:43`). The observable cell here is only the normalized transform-change result, not exact coordinates, timing, persistence, or every drag option.

### Panels and toolbars

React `Panel` positions an absolute wrapper at one of six corners or centers (`packages/react/src/components/Panel/index.tsx:16`, `packages/react/src/components/Panel/index.tsx:41`); Svelte uses corresponding placement classes (`packages/svelte/src/lib/container/Panel/Panel.svelte:1`). React node toolbars compute a transform from node bounds and viewport before rendering through `NodeToolbarPortal` (`packages/react/src/additional-components/NodeToolbar/NodeToolbar.tsx:108`); Svelte computes the anchor and uses its portal action (`packages/svelte/src/lib/plugins/NodeToolbar/NodeToolbar.svelte:46`, `packages/svelte/src/lib/plugins/NodeToolbar/NodeToolbar.svelte:71`). The imported browser tests do not capture equivalent placement, restoration, or portal output.

## Flow production paths

### Resize and keyboard ownership

Core derives the resize direction, node position and size, min/max bounds, constraint issues, and child compensation through `calculateNodeResize`; the public semantic change is one schema-derived `node-bounds` value with child-local positions (`packages/core/src/domain/flow-runtime.schema.ts:311`, `packages/core/src/domain/flow-runtime.schema.ts:363`). The vanilla renderer creates eight labeled resize buttons (`apps/vanilla/src/mount-flow.ts:472`, `apps/vanilla/src/mount-flow.ts:485`). Pointer start validates the selected owner and gesture slot, previews node and child geometry through one candidate, cancels bounds conflicts, and emits the atomic change at completion (`apps/vanilla/src/mount-flow.ts:2532`, `apps/vanilla/src/mount-flow.ts:2559`, `apps/vanilla/src/mount-flow.ts:2599`). Keyboard resize has its own host session and candidate lifecycle (`apps/vanilla/src/mount-flow.ts:1648`, `apps/vanilla/src/mount-flow.ts:1708`, `apps/vanilla/src/mount-flow.ts:4094`). The host gives active Flow Escape and resize controls precedence, then leaves supported native renderer controls and editing targets to own their keys (`apps/vanilla/src/mount-flow.ts:4094`, `apps/vanilla/src/mount-flow.ts:4175`).

### Renderer drag rules

The vanilla node pointer path suppresses drag for a nested `data-flow-no-drag` target and, when the renderer contains a `data-flow-drag-handle`, starts drag only from that marked descendant (`apps/vanilla/src/mount-flow.ts:2650`, `apps/vanilla/src/mount-flow.ts:2658`). Those markers are DOM conventions and are not fields in `FlowNodeSchema`. Native renderer keyboard ownership is also host-owned (`apps/vanilla/src/mount-flow.ts:4175`).

### Canvas UI and placements

`createCanvasUI` builds an overlay root, six positioned caller-panel slots, and a host-local portal while retaining caller elements for destruction-time restoration (`apps/vanilla/src/canvas-ui.ts:36`, `apps/vanilla/src/canvas-ui.ts:96`, `apps/vanilla/src/canvas-ui.ts:134`). The mount options pass panel entries through the vanilla boundary (`apps/vanilla/src/mount-flow.ts:4503`); six CSS selectors place the slots relative to the canvas (`apps/vanilla/src/style.css:52`, `apps/vanilla/src/style.css:57`). The host excludes canvas UI targets from graph interaction and captures/restores panel focus around teardown (`apps/vanilla/src/mount-flow.ts:2881`, `apps/vanilla/src/mount-flow.ts:4548`, `apps/vanilla/src/mount-flow.ts:4603`).

## Flow test paths

- Resize browser tests assert bounds conflicts, controlled acknowledgement, direct-child world-position stability, toolbar/minimap refresh, culling, nested extent cancellation, exact directional output at two zooms, and keyboard behavior (`apps/vanilla/e2e/advanced-gestures.e2e.ts:362`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:371`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:400`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:418`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:434`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:585`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:648`). The same file keeps native concurrent-pointer and two-contact cases skipped because this Playwright environment does not provide the required real pointer-capture behavior (`apps/vanilla/e2e/advanced-gestures.e2e.ts:357`, `apps/vanilla/e2e/advanced-gestures.e2e.ts:360`).
- Renderer tests exercise outside/inside drag-handle actions, nested no-drag, selected-group movement, keyed marker updates, and keyboard movement. They reduce the before/after transform to the same booleans stored by the reference capture (`apps/vanilla/e2e/graph-renderers.e2e.ts:143`, `apps/vanilla/e2e/graph-renderers.e2e.ts:246`). Native button, link, input, select, textarea, and inherited contenteditable keyboard paths run in controlled and uncontrolled modes in the latter test.
- Canvas UI tests check six measured placements, non-overlap at the fixture viewport, two focused placement snapshots, caller identity/focus/action restoration, portal isolation, teardown, and the original-parent ordering case (`apps/vanilla/e2e/canvas-ui.e2e.ts:166`, `apps/vanilla/e2e/canvas-ui.e2e.ts:291`, `apps/vanilla/e2e/canvas-ui.e2e.ts:335`, `apps/vanilla/e2e/canvas-ui.e2e.ts:401`).
- The six shared Flow fixtures remain unchanged and run through the vanilla, Vue, and Foldkit browser drivers (`apps/vanilla/e2e/shared-conformance.e2e.ts:6`, `apps/vue/e2e/shared-conformance.e2e.ts:5`, `apps/foldkit/e2e/shared-conformance.e2e.ts:5`). They do not exercise the host-specific features above.

## Observable behavior matrix

| Behavior cell | Reference evidence | Flow evidence | Classification | Remaining boundary |
| --- | --- | --- | --- | --- |
| Left-edge resize by +20 px at zoom 1; parent bounds and direct-child world/local positions | Pinned Chromium output capture, repeated twice with matching normalized results (`research/fixtures/reference-captures.json:77`) | Controlled left resize E2E checks the same initial geometry, delta, acknowledged parent bounds, and child world/local positions (`apps/vanilla/e2e/advanced-gestures.e2e.ts:371`) | **Conforms for this captured case** | Does not cover other directions, other deltas, bounds, cancellation, or other adapters |
| Other directional resize, fixed opposite edge, and direct-child compensation cases | React/Svelte adapters and shared `XYResizer` source above; no equivalent pinned output for these cases | `calculateNodeResize`; pointer E2E at zoom 1/2; keyboard tests cover all eight directions and controlled acknowledgement | **Unverified** | No equivalent pinned reference output beyond the single left-edge case, especially for bounds and cancellation |
| Parent extent and nested geometry during resize/cancel | Shared reference geometry source only; no matching output fixture | Core calculation tests and vanilla nested-parent browser case | **Unverified** | Need a reproducible reference run with the same geometry and normalized DOM/document outputs |
| Disjoint pointer sessions and native pinch cancellation | `XYDrag` touch-move abort source; no equivalent capture lifecycle test | Core models pointer ownership; native browser cases remain skipped | **Unverified** | A browser/device harness with real pointer capture and equivalent reference inputs |
| Custom drag initiation outside and inside marked handle | Pinned Chromium test plus captured transform strings and booleans | Vanilla browser test asserts unchanged outside and changed inside transform booleans | **Conforms for the normalized transform-change outcomes only** | Selector and host details, absolute positions, timing, and other drag options are not compared |
| `draggable: false` in a mixed selected group | Pinned capture covers a standalone locked node | Vanilla mixed-group test keeps the locked node stationary while moving the other selected member | **Unverified** | Inputs differ; an equivalent mixed-group reference fixture is missing |
| Panel placement and caller-owned overlay restoration | React/Svelte source shows placements/portals, but no equivalent output capture | Vanilla six-position bounds test, screenshots, identity/focus/action restoration, and portal tests | **Unverified** | No reproducible reference output for placement, overlap, focus, or restoration |
| Shared adapter scenarios | No equivalent reference suite run | Six same Flow fixtures pass in vanilla, Vue, and Foldkit | **Conforms within Flow only** | Does not establish xyflow parity or cover host-specific feature cells |

## Acceptance evidence for Plans 024–032

These cases are Flow acceptance tests, not additional pinned reference captures.

| Case | Current evidence | Status |
| --- | --- | --- |
| Left/top/corner resize, direct-child compensation, zoom scaling, and atomic change | `advanced-gestures.e2e.ts:370-579` | Covered in vanilla |
| Controlled resize waits for acknowledgement; absent acknowledgement restores authority | `advanced-gestures.e2e.ts:496-516`, `advanced-gestures.e2e.ts:653-694` | Covered in vanilla |
| Bounds conflict, nested extent, cancellation, culling, toolbar, minimap | `advanced-gestures.e2e.ts:361-430`, `advanced-gestures.e2e.ts:696-790` | Covered in vanilla; native pointer-only cases remain skipped |
| Custom drag handle, outside-body idle state, nested no-drag pointer suppression, group move, keyed marker update, keyboard movement | `graph-renderers.e2e.ts:143-267` | Covered in vanilla; normalized outside/inside outcomes match pinned capture |
| Native renderer keyboard activation, text editing, focus, active Escape, resize arrow precedence | `graph-renderers.e2e.ts:246-412`, `advanced-gestures.e2e.ts:590-775` | Covered in vanilla controlled and uncontrolled cases |
| Six panel placements, overlay interaction exclusion, identity/focus/selection restoration, portal teardown | `canvas-ui.e2e.ts:166-434` | Covered in vanilla; no reference output comparison |

## Conformity and deviations

- **Conforms for one normalized cell:** the pinned custom-handle capture and Flow browser test both observe no transform change outside the handle and a transform change inside it. The fixture unit test validates the reference booleans, while the Flow E2E asserts matching booleans. This claim excludes exact geometry, event timing, and unrelated drag behavior.
- **Conforms for one resize case:** two repeated pinned Chromium captures and Flow's controlled left-resize browser test agree on parent position `(100, 100)`, size `70×60`, child world position `(95, 115)`, and derived child-local position `(-5, 15)` after a +20 px left-edge drag at zoom 1. The boundary is the single 90×60 parent with one 20×20 direct child and no extent constraints; it does not establish other directions, deltas, bounds, cancellation, or adapter parity.
- **Conforms within Flow only:** the six shared scenarios pass through all three Flow adapters. Their outputs were not compared with xyflow; the test boundary is `packages/conformance` plus the three adapter browser drivers.
- **Unverified:** resize directions beyond the captured left-edge case, nested bounds, mixed-group `draggable: false`, native concurrent pointer/pinch cancellation, panels and portals, and broader accessibility lack an equivalent reference output run. Source similarities are not treated as parity.
- **Intentionally different architecture:** Flow represents resize as a schema-derived atomic `node-bounds` change and keeps caller DOM in the vanilla host; xyflow maps resize and overlay state through framework stores/components. This describes ownership seams, not an assertion that the user-visible behaviors differ.
