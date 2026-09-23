# Edge label rendering

Status: production source traced from pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow implementation and tests are recorded below. Reference paths are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `ReactFlow` passes edge records through its wrapper and store updater at `packages/react/src/container/ReactFlow/index.tsx:180` and `packages/react/src/container/ReactFlow/index.tsx:193`. `EdgeRenderer` mounts a keyed wrapper for each visible edge at `packages/react/src/container/EdgeRenderer/index.tsx:59` and `packages/react/src/container/EdgeRenderer/index.tsx:66`. `EdgeWrapper` resolves handle positions through `getEdgePosition` at `packages/react/src/components/EdgeWrapper/index.tsx:81` and passes geometry to the selected edge component at `packages/react/src/components/EdgeWrapper/index.tsx:218`. `StraightEdge` obtains a path and label position from `getStraightPath` at `packages/react/src/components/Edges/StraightEdge.tsx:27`; `BezierEdge` obtains them from `getBezierPath` at `packages/react/src/components/Edges/BezierEdge.tsx:30`. `BaseEdge` renders `EdgeText` when the label and numeric coordinates exist at `packages/react/src/components/Edges/BaseEdge.tsx:59`. `EdgeText` measures its text with `getBBox`, centers an SVG group, and renders text with an optional background at `packages/react/src/components/Edges/EdgeText.tsx:24`, `packages/react/src/components/Edges/EdgeText.tsx:41`, and `packages/react/src/components/Edges/EdgeText.tsx:60`.

## Svelte production path

The public `SvelteFlow` accepts edges and mounts `EdgeRenderer` within the viewport at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:72` and `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:185`. The store resolves visible edge layouts at `packages/svelte/src/lib/store/visibleElements.ts:129`; the renderer keys them by edge identifier at `packages/svelte/src/lib/container/EdgeRenderer/EdgeRenderer.svelte:21`. `BezierEdge` receives label coordinates from `getBezierPath` at `packages/svelte/src/lib/components/edges/BezierEdge.svelte:24` and passes them to `BaseEdge` at `packages/svelte/src/lib/components/edges/BezierEdge.svelte:37`. `BaseEdge` renders an `EdgeLabel` when a label is present at `packages/svelte/src/lib/components/edges/BaseEdge.svelte:42`. `EdgeLabel` portals an HTML element to the label layer and centers it with CSS transforms at `packages/svelte/src/lib/components/EdgeLabel/EdgeLabel.svelte:30` and `packages/svelte/src/lib/components/EdgeLabel/EdgeLabel.svelte:35`.

## Shared geometry and reference test boundary

`getStraightPath` uses the endpoint midpoint returned by `getEdgeCenter` at `packages/system/src/utils/edges/straight-edge.ts:43` and `packages/system/src/utils/edges/general.ts:6`. `getBezierPath` uses the cubic point at parameter `t = 0.5` calculated from both endpoints and control points at `packages/system/src/utils/edges/bezier-edge.ts:38`, `packages/system/src/utils/edges/bezier-edge.ts:61`, and `packages/system/src/utils/edges/bezier-edge.ts:146`. The pinned edge browser suite covers selection, styles, visibility, and ARIA at `tests/playwright/e2e/edges.spec.ts:5`, `tests/playwright/e2e/edges.spec.ts:43`, and `tests/playwright/e2e/edges.spec.ts:129`; it does not assert label coordinates directly.

## Flow production and test paths

The public `mountFlow` decodes the document at `apps/vanilla/src/mount-flow.ts:1584` and `apps/vanilla/src/mount-flow.ts:1593`. The edge schema accepts optional plain text at `packages/core/src/domain/flow.schema.ts:84`. Measured handle attachments reach the keyed SVG renderer at `apps/vanilla/src/edge-renderer.ts:136`, which asks core for a label point at `apps/vanilla/src/edge-renderer.ts:349`. Core chooses straight, Bezier, or routed midpoint geometry at `packages/core/src/domain/flow-edge.schema.ts:123`. The host writes keyed SVG text above the path at `apps/vanilla/src/edge-renderer.ts:367`; `apps/vanilla/src/style.css:96` supplies a legibility halo.

Core tests cover straight and cubic placement at `packages/core/src/domain/flow-edge.schema.test.ts:138` and `packages/core/src/domain/flow-edge.schema.test.ts:150`, and routed placement at `packages/core/src/domain/flow-step-edge.schema.test.ts:56`. Browser tests begin at public mount and cover controlled text updates, dragging, viewport movement, path changes, and removal at `apps/vanilla/e2e/canvas.e2e.ts:950` and `apps/vanilla/e2e/canvas.e2e.ts:425`. These are Flow output checks, not a pixel comparison against either pinned adapter.

## Conformity and deviations

- **Conforming behavior:** Flow anchors labels to the straight midpoint, Bezier half-parameter point, and routed segment midpoint, with core and browser tests for its output. Reference output parity remains unverified.
- **Intentionally different:** Flow renders noninteractive SVG text with a halo; React measures SVG text and Svelte portals HTML. This avoids an HTML portal and text measurement lifecycle.
- **Unverified:** Pixel placement against the pinned adapters, rich content, background padding, collision handling, and label interaction remain outside this slice.
