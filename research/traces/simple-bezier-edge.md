# Simple-Bezier edge path

Status: traced from pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow implementation is pending. All upstream paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `ReactFlow` passes its edges to `Wrapper` and `StoreUpdater` at `packages/react/src/container/ReactFlow/index.tsx:180` and `packages/react/src/container/ReactFlow/index.tsx:193`. `EdgeRenderer` maps visible edge IDs to keyed `EdgeWrapper` instances at `packages/react/src/container/EdgeRenderer/index.tsx:59` through `packages/react/src/container/EdgeRenderer/index.tsx:69`. `EdgeWrapper` reads the edge type and resolves the built-in component at `packages/react/src/components/EdgeWrapper/index.tsx:39` through `packages/react/src/components/EdgeWrapper/index.tsx:49`; the registry maps `simplebezier` to `SimpleBezierEdgeInternal` at `packages/react/src/components/EdgeWrapper/utils.ts:10` through `packages/react/src/components/EdgeWrapper/utils.ts:16`. It resolves measured endpoint positions with `getEdgePosition` at `packages/react/src/components/EdgeWrapper/index.tsx:73` through `packages/react/src/components/EdgeWrapper/index.tsx:89`, suppresses edges without positions at `packages/react/src/components/EdgeWrapper/index.tsx:120`, and passes positions and handle sides to the component at `packages/react/src/components/EdgeWrapper/index.tsx:218` through `packages/react/src/components/EdgeWrapper/index.tsx:239`.

`SimpleBezierEdgeInternal` calls `getSimpleBezierPath` with both endpoint coordinates and sides at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:111` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:118`. It passes the returned path and label point to `BaseEdge` at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:122` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:138`. `BaseEdge` writes the SVG path, interaction path, and optional label at `packages/react/src/components/Edges/BaseEdge.tsx:47` through `packages/react/src/components/Edges/BaseEdge.tsx:70`. The utility and public component are also exported at `packages/react/src/index.ts:7`.

## Geometry

`getSimpleBezierPath` defaults to bottom and top handle sides when callers omit them at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:47` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:54`. For a left or right handle, `getControl` places the control point halfway between the endpoint X coordinates while retaining that endpoint's Y. For a top or bottom handle, it retains the endpoint's X and uses the midpoint Y at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:26` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:32`. The source and target apply that rule independently at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:55` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:68`.

The utility returns a cubic `M... C...` path plus label coordinates and absolute offsets at `packages/react/src/components/Edges/SimpleBezierEdge.tsx:80` through `packages/react/src/components/Edges/SimpleBezierEdge.tsx:86`. `getBezierEdgeCenter` computes the label at cubic parameter `t = 0.5`, using endpoint weights of `1/8` and control-point weights of `3/8` at `packages/system/src/utils/edges/bezier-edge.ts:38` through `packages/system/src/utils/edges/bezier-edge.ts:66`. This is the cubic's parameter midpoint, not necessarily its half-arc-length point.

## Upstream test path

The pinned React example includes an edge with `type: 'simplebezier'` at `examples/react/src/examples/Edges/index.tsx:114` through `examples/react/src/examples/Edges/index.tsx:120`. The generic browser edge suite starts from `/tests/generic/edges/general` at `tests/playwright/e2e/edges.spec.ts:5` through `tests/playwright/e2e/edges.spec.ts:12` and checks selection and generic edge properties at `tests/playwright/e2e/edges.spec.ts:14` through `tests/playwright/e2e/edges.spec.ts:68`. A search of the pinned `tests/` and package test files found no simple-Bezier-specific path or label assertion. The example is a usage reference, not a geometry test.

## Flow production and test paths

Public `mountFlow` decodes the `simplebezier` path choice in `FlowEdgePathSchema` at `packages/core/src/domain/flow.schema.ts:57`. The core path uses midpoint controls by handle side at `packages/core/src/domain/flow-edge.schema.ts:132`, and `edgeLabelPosition` uses the same cubic controls at `packages/core/src/domain/flow-edge.schema.ts:144`. The vanilla renderer chooses that path from measured handle attachments at `apps/vanilla/src/edge-renderer.ts:208` and writes the resulting SVG. Unit output is checked at `packages/core/src/domain/flow-visibility.schema.test.ts:52`; the served demo checks a cubic path at `apps/vanilla/e2e/canvas.e2e.ts:2051`.

## Conformity and deviations

- **Conforming:** Midpoint cubic controls and label computation follow the traced simple-Bezier rule; Flow renders the path choice from measured handles.
- **Intentionally different:** Flow uses its own schema-decoded path name and keyed DOM renderer.
- **Unverified:** The pinned suite has no exact simple-Bezier path assertion. Flow's current browser test checks a cubic command, not exact path or label coordinates across movement.
