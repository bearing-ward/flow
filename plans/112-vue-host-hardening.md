# Plan 112: Vue host hardening

Close six Vue host gaps that recipe agents found, and drop the recipe workarounds that hid them. Scope is `packages/vue` and `apps/vue`.

## Changes

1. **Click selection.** A node click (no drag past the threshold) selects the node; Meta or Ctrl toggles it in the current selection. Clicking a selected node without a modifier keeps the selection. An edge is selected when a press is released over the same edge without moving, with the same modifier rule. A click reads the selection from the press, so a threshold-0 drag that selects on press (`selectNodesOnDrag`) does not change the click's outcome. Clicks on controls inside a node (buttons, inputs, links, handles, resize controls) do not select it. Vue never had click selection: Plan 108 only added the event argument to the existing `nodeClick` emit, and Plan 099's "click policy" was the no-selection policy. The `@nodeClick` + `setNodes` workarounds in the feature overview and layout recipes go away, and the subflows grouping test selects by click and Meta-click.
2. **Live drag geometry.** A drag writes a preview position map instead of a DOM transform. Rendering (nodes, edges, labels, renderer props, floating-edge node bounds) reads a preview graph built from it, so edges follow every frame. `dragging` is true on every dragged node.
3. **Selection drags.** Pressing a selected node drags every selected, draggable node whose ancestors are not also dragged. The drop commits every moved member, never the anchor by assumption: dragging a child together with its selected parent commits the parent. A pointer move only offsets the dragged nodes and their descendants; the rest of the graph is not rebuilt. New `selectedNodesDragStart`, `selectedNodesDrag` and `selectedNodesDragStop` emits carry the dragged `nodes`. They fire only for drags of two or more nodes, as Vanilla's do.
4. **Measurement.** A node is not measured until its canvas is in the document, so the reading taken while Vue mounts a detached tree is skipped. A connected node's box is real even when it is empty or hidden, so zero sizes are measured. Sizes and handle offsets are divided by the zoom read from the rendered viewport transform, not by the reactive viewport, which can be ahead of the DOM after `fitView`. Measured size changes, including the first, are emitted as `{ type: 'dimensions' }` NodeChanges on `nodesChange`, batched per microtask. The layout recipes react to that emit instead of polling every frame, and the ELK multiple-handles scene fits the view again.
5. **Custom edge hit area.** `FlowBaseEdge` reports its path to the canvas through an edge scope, and the canvas hit target uses it. Selection, hover and focus then follow the drawn edge.
6. **Resize controls.** New `nodesResizable` prop, default `false`. Resize controls show on selected nodes only when it is on. Fixtures and recipes that resize opt in. The edge recipe CSS that hid resize controls goes away.

## Tests

`apps/vue/e2e/host-hardening.e2e.ts` with fixture `apps/vue/src/host-hardening-test.ts` covers click and modifier selection for nodes and edges, mid-drag geometry of a built-in edge and a floating custom edge, `dragging` on all members, group drag with its events, the first measurement and `dimensions` changes, measurement after `fitView` at non-1 zoom, the custom edge hit path, and handles on selected nodes. Each test passes three runs in a row. The existing Vue files listed in the task stay green.

## Conformity and deviations

- **Conforming.** Click selects and the multi-selection key toggles (React `handleNodeClick` and edge `onClick`). Edges and edge renderer props follow a drag every frame. All dragged nodes report `dragging`. A selected-node drag moves the whole selection. Zero sizes are valid measurements (`docs/public-api.md`). `dimensions` NodeChanges arrive on `nodesChange`. Custom edges' `BaseEdge` path is the interaction path. Resize controls appear only when asked for.
- **Intentionally different.**
  - Either Meta or Ctrl toggles. React uses one platform key (`multiSelectionKeyCode`), and Vue has no such prop.
  - Clicks on controls inside a node don't select it, so click-connect, resize and in-node buttons keep their existing contracts. React selects on any click that bubbles to the node.
  - Selection drag emits are named `selectedNodes*`, because Vue's `selectionDrag*` emits already report the selection rectangle. Flow has no `NodesSelection` box.
  - The pane captures the pointer on press, so edges select on a release over the same edge without movement instead of on the browser's `click`.
  - Drag positions reach `nodesChange` only at the drop, as before (Plan 108); there are no per-frame `position` changes with `dragging`.
  - `nodesResizable` is a canvas switch rather than a `<NodeResizer>` component per node, and has no resizer options.
- **Unverified.** There is no live React runtime comparison. Test boundary: `host-hardening.e2e.ts`.
