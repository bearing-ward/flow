# Plan 155 alignment helper lines

Plan 155 implements unit 8 of `plans/149-pro-delivery.md` at the plan baseline `0864a33`. The adopted D8 policy supplies the six CSS pixel tolerance and deterministic nearest-candidate rule. The feature adds presentation state and a drag solver, with no document fields or dependencies.

## Public evidence

The [public Helper Lines page](https://reactflow.dev/examples/interaction/helper-lines) and its [accessible demo](https://example-apps.xyflow.com/react/pro/helper-lines/index.html) describe horizontal and vertical helper lines and snapping during node movement. Access date is 2026-10-25. Subscription source and private implementation are outside this comparison. A native-pointer probe at viewport zoom 0.933333 displayed a vertical guide and snapped node 5's right edge to node 2's left edge at 671.333 CSS pixels. Further 4, 5, 6, and 7 CSS pixel pointer offsets retained a neighboring alignment candidate rather than isolating one activation boundary. This confirms visible node-relative guide/snapping behavior, but does not establish the demo's exact tolerance. Exact upstream tolerance, tie ordering, group behavior, parent behavior, cancellation, and grid precedence require separate evidence. Flow uses the adopted D8 policy for these decisions.

## Shared contracts and ownership

`packages/core/src/domain/flow-helper-lines.ts:9` defines the schema-derived guide contract. `packages/core/src/domain/flow-helper-lines.ts:47` accepts a `FlowGraphView`, dragged node IDs, graph-space pointer delta, viewport zoom, and an optional grid. The pure solver returns a shared delta and up to one guide for each axis. It uses physical absolute top-left positions and measured dimensions from the graph, including node-origin and ancestor offsets. It excludes dragged nodes, carried descendants, and hidden candidates.

Every source center and edge competes with every target center and edge. Distance is measured before grid snapping and multiplied by viewport zoom. A distance of six CSS pixels is included. Nearest distance wins, followed by source anchor rank, target anchor rank, target ID, and source ID. Rank orders center, leading edge, then trailing edge. An active guide wins over the grid on its axis. Unmatched axes use the shared grid delta. Existing host extents and parent expansion run afterward. The shared `resolveFlowAlignmentGuides` projection removes guides invalidated by constrained placement and derives their endpoints from rendered bounds.

The solver remains framework-independent. It neither mutates documents nor runs browser effects. Existing semantic commit and history workflows retain ownership. No pointer-move logging is added. Empty guide state returns before building additional browser geometry, including when the feature is disabled. Existing `nodeDragStart`, `nodeDragComplete`, `gestureCancel`, `controllerUpdate`, and edit failure boundaries retain their telemetry. This work makes no collector-delivery claim.

## Vanilla production path

`apps/vanilla/src/mount-flow.ts:484` decodes the optional `helperLines` mount option. The public controller also accepts it through `setCanvasOptions`. The pointer move handler calls `apps/vanilla/src/mount-flow.ts:9718`, entering `updateNodeDragPreview` at `apps/vanilla/src/mount-flow.ts:6998`, then `alignedDragPoint` at `apps/vanilla/src/mount-flow.ts:6919`, then the shared solver, followed by existing bounds and parent-expansion rules. The preview updates node DOM positions and attached edge geometry. The viewport contains a pointer-transparent guide layer, so pan and zoom affect both guides and nodes.

Pointer release at `apps/vanilla/src/mount-flow.ts:9723` recomputes the same aligned point before the atomic drag commit at `apps/vanilla/src/mount-flow.ts:9872`. It clears the guide layer. Cancellation at `apps/vanilla/src/mount-flow.ts:10903` clears the layer with the captured actor, and destruction removes the canvas and frame resources. The complete drag remains one accepted history transaction.

## Vue production path

`FlowCanvas` exposes the Boolean `helperLines` prop at `packages/vue/src/flow-canvas.ts:899`. Its pointer path at `packages/vue/src/flow-canvas.ts:6766` enters `constrainedDragStep` at `packages/vue/src/flow-canvas.ts:6484`, using the graph captured at drag start, current zoom, and current grid. The result enters `constrainFlowVueDrag`, which produces the accepted candidate positions and parent expansion. Preview and release at `packages/vue/src/flow-canvas.ts:8381` call the same function. The visible guide projection at `packages/vue/src/flow-canvas.ts:1819` validates against `renderGraphNode`, including drag previews rather than only the accepted graph. Reactive guide state renders inside the transformed viewport at `packages/vue/src/flow-canvas.ts:11602`. Detaching the node session at `packages/vue/src/flow-canvas.ts:5061` clears that state, and unmount removes the viewport.

## Foldkit production path

`createProgram` interaction options at `packages/foldkit/src/graph.ts:947` and `HostAction.SetCanvasOptions` at `packages/foldkit/src/graph.ts:3655` expose `helperLines`. `nodeDragAlignment` at `packages/foldkit/src/graph.ts:1800` converts captured client travel and accumulated auto-pan into graph units, then invokes the shared solver against the accepted document and measured geometry. `nodeDragPositions` at `packages/foldkit/src/graph.ts:1877` feeds the returned delta into existing placement constraints. Preview selection at `packages/foldkit/src/graph.ts:2103` and pointer release at `packages/foldkit/src/graph.ts:2129` use that placement path. `renderHelperLines` at `packages/foldkit/src/graph.ts:1833` derives guide output from the same model and pointer session. Clearing the pointer session removes guides, and Runtime disposal removes subscriptions and DOM output.

## Test path and acceptance boundary

The production browser entry points are `/helper-lines/` in all three hosts. The recipes enter through `apps/vanilla/src/helper-lines-demo.ts:16`, `apps/vue/src/helper-lines-demo.ts:37`, and `apps/foldkit/src/helper-lines-demo.ts:33`. Each creates its own public host instance and uses ordinary pointer gestures, buttons, and public snapshot/history APIs. The shared suite is `apps/shared/helper-lines/acceptance.ts:1`; per-host test files invoke that suite without substituting production drag logic. It checks edge and center guides, inclusive tolerance, multiple selection, nested parents, pan and zoom, grid conflict, cancellation, disposal, auto-pan, copy/paste positions, and one-step undo/redo. It asserts saved positions and rendered node and guide coordinates.

The pure suite `packages/core/src/domain/flow-helper-lines.test.ts:1` separately covers tolerance at three zooms, nearest-candidate ties, measured sizes, rigid group delta, hidden and dragged candidate exclusion, grid fallback, and parent/origin coordinates.

All nine browser scenarios passed in each host, for 27 total. The eight pure solver/projection tests passed. The first Vue run identified validation against accepted geometry rather than rendered preview geometry. The fixed projection passed all scenarios. The first Foldkit run observed accepted model updates before DOM paint in two checks. Polling for the same literal rendered coordinates fixed that readiness boundary without changing expected positions.

The catalog entry is C in all three hosts. Recomputed counts are 185 of 195 in-scope entries C in all hosts. The 16 Pro entries contain 6 C, 7 P and 3 G per host. No other entry rating changed.

The verification commands are:

- `bun install --frozen-lockfile`: passed.
- `bun run test packages/core/src/domain/flow-helper-lines.test.ts`: 8 tests passed after implementation corrections.
- `bun run test`: 116 files and 2685 tests passed before the last two solver/projection cases were added. The final verifier reruns the complete unit suite.
- `bun run typecheck`: passed after fixing the initial drag-union narrowing and import errors.
- `bun run check:architecture`: passed.
- `bun run scripts/check-react-flow-catalog.ts` and `bun run scripts/check-api-members.ts`: passed.
- `bun run research:check-traces` and `bun run docs:check`: passed. Final updated trace anchors are checked again before the verifier.
- `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/helper-lines.e2e.ts --workers=1`: 9 passed.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/helper-lines.e2e.ts --workers=1`: 9 passed after the projection fix.
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/helper-lines.e2e.ts --workers=1`: 9 passed after waiting for rendered output.
- The public-demo probe ran under its own browser lock, using native pointer gestures and rendered DOM inspection. The temporary probe was removed afterward.
- One final-verifier attempt was deliberately interrupted after 785 Vanilla browser passes to add the empty-guide early return found during review. It was restarted with the same complete scope. The required final command is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. Its focused profile preserves every existing check and browser filename and adds `helper-lines.e2e.ts` to all three hosts. The final report records its result. A focused pass covers the preserved configured scope plus helper-line acceptance. It does not establish full-suite or exact Pro implementation parity.

## Conformity and deviations

- Conforming at the public outcome boundary: visible node-relative guides and snapping were observed in the accessible demo, and all local helper-line acceptance scenarios passed. Horizontal, vertical, transformed, group, lifecycle, and history behavior are proven by the named local suites. C records functional closeness, not exact hidden implementation parity.
- Intentionally different policy uses the adopted D8 six CSS pixel inclusive tolerance, deterministic anchor and ID ties, group delta, and per-axis guide precedence. These are explicit Flow contracts because hidden Pro constants are unavailable.
- Unverified behavior includes private source structure and exact React or Svelte implementation seams. The public browser output is the comparison boundary. No subscription source was accessed or copied.
- History and clipboard integration retain their existing accepted-state contracts. Guides are transient, so no persistence migration or clipboard extension is required.
