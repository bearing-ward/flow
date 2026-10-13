# Plan 109: Example integrations and recipes

Status: in progress, 2026-10-13.

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

To be completed with the results.
