# Plan 120: Foldkit closing gaps

Status: review fixes verified, 2026-10-14. Repeated checks passed 126 browser executions (42 cases × 3) and 24 unit executions (8 × 3). Focused verification passed 2,492 unit tests and 422 Vanilla, 667 Vue and 291 Foldkit browser cases. Complete Foldkit passed 372 cases excluding calibration.

Close the nine remaining Foldkit parity entries from the independent re-audit on `wave/120-foldkit-closing`. Leave core, imported research and the audit catalog unchanged.

1. Map remaining canvas, accessibility, interaction and renderer options.
2. Gate non-focusable/editable keyboard input, preserve native scrolling and compose deletion approval.
3. Complete Delete Edge on Drop, Drag and Drop, Turbo Flow and Download Image via public APIs; keep html-to-image app-only.
4. Observe pane dimensions in the mounted browser resource, store them in the graph model and retry pending initial fitting on nonzero dimensions. Culling reads model dimensions and retains crossing edges. During expandParent drag, freeze only accepted parent dimensions and retain live child/handle measurements. Announce accepted keyboard edits only.
5. Repeat changed tests three times; run focused and complete Foldkit verification; commit without pushing or merging.

## Conformity and deviations

Conforming review fixes: `canvas-options.e2e.ts` covers non-focusable nodes, editable/.nokey/shadow-input ownership, non-draggable click distance, modifier deletion, shadow-root deletion, late pane sizing, resize culling and crossing edges. `closing-options.test.ts` proves individual keyboard snapping/clamping and parent-only measurement freezing. Pointer dragging retains group constraints; keyboard moves use independent node constraints, matching React `react/src/hooks/useMoveSelectedNodes.ts:49` versus `system/src/xydrag/XYDrag.ts:178`. Controlled keyboard proposals do not announce an unaccepted move.

Intentional default changes to match React, all retained and tested in `canvas-options.e2e.ts`:

- Shift+pane drag selects even with panning enabled, matching `react/src/container/ReactFlow/index.tsx:69`. The default-key test proves this with `selectionOnDrag:false`.
- The platform modifier (Meta on macOS, Control elsewhere) activates wheel zoom, matching `react/src/container/ReactFlow/index.tsx:74`. The default-key test proves activation while Foldkit's existing `zoomOnScroll:false` remains.
- Backspace deletes when the approval client is composed, matching `react/src/container/ReactFlow/index.tsx:68`. Default shadow-root deletion and approval-rejection tests prove both outcomes.
- Enter toggles selection, matching `react/src/components/NodeWrapper/index.tsx:131` and `system/src/constants.ts:40`. The default-key test proves select and deselect.
- Node drag, selection and focus auto-pan default to true, matching `react/src/store/initialState.ts:142` and `react/src/container/ReactFlow/index.tsx:135`. Each auto-pan test includes an unset-default case and explicit true/false cases.

Pinned paths above are under `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/`. Production uses Runtime programs and clients; browser fixtures mount that public Runtime in `/test.html`. Recipe tests remain in `closing-recipes`, `delete-edge-on-drop-recipe` and `drag-and-drop-recipe`.

Mounted size observations initialize each host; `renderer-contract.e2e.ts` waits for both onInit receipts before asserting gesture isolation.

Intentionally different: Foldkit uses ports/Html, composes deletion, retains release-time proposals and controlled viewport ownership, and refreshes registries explicitly. Initial fitting is once-only and does not animate. Multi-selection retains both modifier alternatives. Zero node click distance retains captured clicks under the existing threshold contract. Attribution, proOptions and debug remain unmapped branding/diagnostics.

Unverified: live React comparison, collector delivery, cross-host parity and release acceptance.
