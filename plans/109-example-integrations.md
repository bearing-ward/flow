# Plan 109: Example integrations and recipes

Status: complete, 2026-10-13.

## Goal

Show that the wave 6 example entries of `research/catalogs/react-flow-parity-audit-2026-10-13.json` are achievable with public APIs in Vanilla, Vue and Foldkit: the layout integrations (Dagre Tree, Elkjs Tree, Elkjs Multiple Handles, Auto Layout, Force Layout, Dynamic Layouting), the whiteboard tools (Lasso Selection, Eraser Tool, Rectangle, Freehand Draw), the sub-flow recipes (Selection Grouping, Parent Child Relation), Computing Flows and Feature Overview. The host files `apps/vanilla/src/mount-flow.ts`, `packages/vue/src/flow-canvas.ts` and `packages/foldkit/src/graph.ts` stay untouched.

References: the pinned `examples/react/src/examples/Layouting`, `Intersection`, `Overview`, `Subflow` and `UseNodesData`. The Pro and whiteboard examples are not in the pinned artifacts.

## Design

- **Core helpers, host-neutral and unit tested.**
  - `flow-intersection.ts`: `getIntersectingNodes(candidates, rect, { partially, excludeIds })`, `isRectIntersecting` and `getRectOverlapArea` follow React Flow's `getIntersectingNodes`/`isNodeIntersecting` rule. `getInternalNodeBounds` turns an internal node into a candidate. The instance-API wave can wrap these.
  - `flow-freeform.ts`: lasso, eraser, rectangle and freehand geometry: point in polygon, segment and polyline crossing, `getNodesInsideLasso` (full or partial), `getRectFromPoints`, `getPointsBounds` and `getFreehandPath`.
  - `flow-grouping.ts`: `groupNodes` wraps nodes that share a parent in a padded parent node, `getDropParentId` picks the smallest group that contains a dropped node, and `reparentNode` changes a parent while keeping the absolute position.
  - `flow-layout.ts`: `getFlowLayoutInput` builds engine input from measured internal nodes, including handle boxes; `applyFlowLayoutPositions`, `layoutCenterToTopLeft` and `orientFlowHandles` apply results.
- **Example-only dependencies.** `@dagrejs/dagre`, `elkjs` and `d3-force` are dev dependencies of the three apps, never of a package (`docs/dependencies.md`).
- **One recipe page per host and group,** `ui-recipes/<group>/`:
  - `layout/?scene=` `dagre-tree`, `elk-tree`, `elk-multiple-handles`, `auto-layout`, `force-layout` and `dynamic-layouting`. Every engine reads measured node sizes, and ELK reads measured handle boxes as fixed ports, from the host's internal-node API. Foldkit reads them through `createFoldkitSnapshotClient`. Results go back through public edits. Force layout runs a d3-force simulation that writes positions every frame through public edits, then stops when it cools; a dropped node is pinned. Dynamic layouting turns a placeholder into a node, adds a new placeholder and lays out again.
  - `whiteboard/`: a tool bar and a pane tool overlay that owns its pointer events and pointer capture. Lasso selects the nodes inside the drawn polygon, fully or partly. The eraser deletes nodes and edges its trail crosses, using measured node bounds and the rendered edge paths. Rectangle creates a node from a dragged rectangle. Freehand creates a node holding the stroke.
  - `subflows/`: group the selected nodes into a new parent; dropping a node inside a group reparents it, and dropping it outside detaches it.
  - `computing-flows/`: the pinned UseNodesData flow. Text nodes edit their own data, an uppercase node computes from its upstream node data, and a result node shows its inputs. In Foldkit the page writes node data through the typed edit port.
  - `feature-overview/`: custom nodes and edges, minimap, controls, background, panels, toolbars and resizing on one canvas.

## Tests

- Core unit tests for each helper module.
- One browser test per host and group: `e2e/{layout,whiteboard,subflows,computing-flows,feature-overview}-recipes.e2e.ts`, each run three times in a row.

## Conformity and deviations

- **Review gaps, 2026-10-13 (recorded as partial in the audit).**
  - The eraser finds edge geometry by reading each host's private rendered edge classes, because no host offers a public edge-geometry query. Wave 4 adds that to the instance API. Until then, Eraser Tool is partial in every host.
  - Auto Layout and Dynamic Layouting check measurements every animation frame, because no host emits an event when measurements change. Vue additionally waits out early 0x0 measurements.
  - Vue and Foldkit select nodes through node-click events plus edits, because plain click-to-select is missing there. This affects Selection Grouping and Feature Overview.
  - The Vue ELK ports scene stays at zoom 1, because handle offsets go stale after `fitView`.
  - These are host hardening items, not recipe defects.

- **Conforming.**
  - `getIntersectingNodes` and `isRectIntersecting` follow React Flow's overlap rule for `getIntersectingNodes` and `isNodeIntersecting` (`packages/react/src/hooks/useReactFlow.ts:210`). Unit tests cover it.
  - Dagre Tree follows the pinned `Layouting` example: TB and LR layouts, with handles that move with the direction. It uses measured sizes where the example uses a fixed 150x50.
  - Computing Flows follows the pinned `UseNodesData` flow: text input, then uppercase, then result.
  - In every host, the layout engines read measured node sizes from the host's internal-node API, and ELK reads measured handle boxes as fixed ports.
- **Intentionally different.**
  - Zero-area rectangles never intersect. React counts a zero-area rect as contained.
  - Partial lasso also takes a node that the lasso outline crosses. React tests only node corners.
  - Freehand draws a smoothed quadratic path. React's Pro example uses `perfect-freehand`.
  - Whiteboard tools use an app-owned overlay with pointer capture, not pane events. This works the same in all hosts, including Foldkit.
  - Several handles on one side are spaced by page CSS, because every host stacks same-side handles at one point.
  - No host has an `animated` edge flag, so Feature Overview animates a custom edge with a CSS dash.
- **Host gaps found.** The host files were out of scope, so these are not fixed here.
  - Vanilla: `onNodeClick` does not fire for the click that selects a node, so Dynamic Layouting detects the click itself. `createFlowBackground` is typed against `FlowController`, not the `JavaScriptFlowController` that `mountFlow` returns. Drag payload types are not exported.
  - Vue: a node click does not select the node, so pages select through `@nodeClick` plus `setNodes`. Right after mount, `getInternalNode` can report `measured` with a 0x0 size and no handles. Handle offsets measured just after `fitView` can use a stale zoom, so the ELK ports scene stays at zoom 1.
  - Foldkit: a node click does not select the node, so pages select through `onNodeClick` interaction events. Node views cannot write data, so text input goes through the typed edit port from page code. That path works.
  - No host emits an event when measured sizes change, so Auto Layout and Dynamic Layouting poll internal nodes once per animation frame.
  - Vue and Foldkit commit drags on release, so reparenting and force-layout pinning run after the drop.
- **Unverified.** The Pro and whiteboard examples and the ELK and force layouts are not in the pinned artifacts. The recipes follow the public example descriptions, and there is no runtime comparison with React.
- **Test boundary.** `packages/core/src/domain/flow-{intersection,freeform,grouping,layout}.test.ts` and `apps/{vanilla,vue,foldkit}/e2e/{layout,whiteboard,subflows,computing-flows,feature-overview}-recipes.e2e.ts`.
