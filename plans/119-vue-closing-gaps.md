# Plan 119: Vue closing gaps

Status: complete, including independent review fixes, 2026-10-14.

## Scope and delivery

1. Close Vue canvas auto-pan, click distances, connection container style, reconnect radius, document delete keys and keyboard/ARIA gaps. Preserve core and public signatures.
2. Deliver public-API recipes for Delete Edge on Drop, Contextual Zoom, Drag and Drop, Preventing Cycles, Turbo Flow and Download Image. Keep `html-to-image` in the demo app.
3. Fix the independent review: keyboard steps and per-node snapping, editable deletion, canvas ownership, focusability, draggable-only click distances and empty descriptions.
4. Run changed tests three times, focused `bun run verify` with unchanged main scope plus Vue additions, and the complete Vue suite excluding calibration. Use the owner-token lock. Make a new commit on `wave/119-vue-closing`; do not push or merge.

## Implementation and evidence

- Production keyboard path: focused node keydown (`packages/vue/src/flow-canvas.ts:8991`) calls `moveSelectedNodesByKey` (`:6032`), scales direction by 5px or the grid and Shift factor 4 (`:6070`), constrains/snaps each absolute position (`packages/vue/src/drag-constraints.ts:79`), publishes position changes (`packages/vue/src/flow-canvas.ts:5975`, `:6029`), and renders left/top coordinates (`:8899`). Pointer drags retain anchor/group snapping. Shared core `snapGroupDelta` supplies the snap math; Vanilla already uses 5/20px and result snapping through `moveSelectedNodes` (`apps/vanilla/src/mount-flow.ts:11413`, `packages/core/src/domain/flow-runtime.schema.ts:1352`). Vanilla is unchanged.
- Production deletion path: window capture (`packages/vue/src/flow-canvas.ts:10370`) reads the composed path (`:7858`), ignores all contenteditable attributes and native fields, chooses the nearest canvas or last focused canvas (`:7874`), matches the exact pressed-key set (`:2607`), then prepares and applies deletion (`:7812`). Focus ownership (`:10569`) excludes nested/other canvases; deletion prevents default and stops propagation.
- Rendering applies draggable-only click distances, omits focus/key handlers and tabindex for unfocusable nodes, and treats an empty node description as unset (`packages/vue/src/flow-canvas.ts:8921`, `:8958`). Default reconnect anchors visibly changed from radius 7/offset 12 to radius 10/offset 10 (`:960`, `:9206`, `:9334`), matching React.
- Production recipes load `apps/vue/src/closing-recipes.ts`. Browser tests mount the public-package fixture `apps/vue/src/closing-gaps-test.ts`; real recipe pages are exercised by `apps/vue/e2e/interaction-recipes.e2e.ts`. Editable guards confirm a subsequent real deletion before asserting the protected node remains. Tests cover shadow inputs, panels, edge labels, siblings and nested canvases.
- Regression verification passed three consecutive runs: 36 closing-gaps browser tests, 108/108; changed interaction-lifecycle focus test, 3/3; eight drag-constraints unit tests, 24/24. Focused verification passed: 2,486 unit tests; Vanilla 422 passed/2 skipped, Vue 709 passed, Foldkit 238 passed. Scope is the unchanged main configuration plus closing-gaps and closing-recipes. Complete Vue suite excluding calibration: 798 passed.

## Conformity and deviations

- Conforming within regression tests: React 5/20px arrow movement, grid velocity and result snapping, focusability, draggable-only click suppression, all contenteditable values, shadow targets and exact delete combinations. Pinned evidence: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useMoveSelectedNodes.ts:29`, `packages/react/src/components/NodeWrapper/index.tsx:219`, `packages/system/src/utils/dom.ts:42`, and `packages/react/src/hooks/useKeyPress.ts:170` under that same pinned root.
- Intentionally different: Vue keeps drop-time graph commits and payload-first events; auto-pan uses Flow's existing edge-zone delta. Nonempty `ariaDescription` replaces the shared description. Nearest/last-focused canvas owns document deletion to prevent cross-canvas destructive edits. PNG export clones separate render layers. `nodeOrigin` remains on the document; dimensions use Vue styles; no licensed attribution/proOptions banner; structured Effect telemetry replaces `debug`.
- Unverified: no live React runtime, collector delivery or full multi-host release acceptance. Test boundary: closing-gaps, closing-recipes, the changed interaction-lifecycle focus test, drag-constraints unit tests, focused checks and the complete Vue suite.
