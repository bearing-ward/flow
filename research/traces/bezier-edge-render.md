# Bezier edge rendering

Status: production paths traced from pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow's own core and browser behavior is tested; no reference output comparison has run. All reference paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `ReactFlow` passes `edges` to the wrapper and store updater at `packages/react/src/container/ReactFlow/index.tsx:180` and `packages/react/src/container/ReactFlow/index.tsx:193`. `EdgeRenderer` obtains visible identifiers and mounts keyed wrappers at `packages/react/src/container/EdgeRenderer/index.tsx:59` and `packages/react/src/container/EdgeRenderer/index.tsx:66`. A wrapper looks up endpoint nodes and calls `getEdgePosition` at `packages/react/src/components/EdgeWrapper/index.tsx:74` and `packages/react/src/components/EdgeWrapper/index.tsx:81`. The default edge type selects `BezierEdgeInternal` at `packages/react/src/components/EdgeWrapper/utils.ts:10`. `BezierEdge` passes attachment coordinates, sides, and optional curvature to `getBezierPath` at `packages/react/src/components/Edges/BezierEdge.tsx:30`, then passes its path to `BaseEdge` at `packages/react/src/components/Edges/BezierEdge.tsx:43`. `BaseEdge` writes the SVG path at `packages/react/src/components/Edges/BaseEdge.tsx:47`.

## Svelte production path

The public `SvelteFlow` accepts edges and mounts an edge renderer within the viewport at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:72` and `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:185`. The store derives positioned edges at `packages/svelte/src/lib/store/visibleElements.ts:129` and `packages/svelte/src/lib/store/visibleElements.ts:139`. The renderer keys them by edge identifier at `packages/svelte/src/lib/container/EdgeRenderer/EdgeRenderer.svelte:21`. Its default edge type is Bezier at `packages/svelte/src/lib/store/initial-store.svelte.ts:85`. The Bezier component derives a path with `getBezierPath` at `packages/svelte/src/lib/components/edges/BezierEdge.svelte:24` and sends it to `BaseEdge` at `packages/svelte/src/lib/components/edges/BezierEdge.svelte:37`, which renders the SVG path at `packages/svelte/src/lib/components/edges/BaseEdge.svelte:21`.

## Shared geometry and reference tests

`getEdgePosition` defers unresolved or unmeasured endpoints at `packages/system/src/utils/edges/positions.ts:27` and `packages/system/src/utils/edges/positions.ts:46`; `getHandlePosition` selects the declared attachment side at `packages/system/src/utils/edges/positions.ts:99`. `getBezierPath` defaults to curvature `0.25`, calculates one control point from each handle side, and formats a cubic SVG path at `packages/system/src/utils/edges/bezier-edge.ts:121`, `packages/system/src/utils/edges/bezier-edge.ts:130`, and `packages/system/src/utils/edges/bezier-edge.ts:157`. A forward distance uses half the separation; a backward distance uses curvature times `25` times the square root of the reversed distance at `packages/system/src/utils/edges/bezier-edge.ts:69`. The helper also calculates a curve center and offsets for label positioning at `packages/system/src/utils/edges/bezier-edge.ts:38` and `packages/system/src/utils/edges/bezier-edge.ts:146`.

The reference browser suite covers general edge attachment, styling, selection, and hidden state at `tests/playwright/e2e/edges.spec.ts:5` and `tests/playwright/e2e/edges.spec.ts:43`. No pinned test directly asserts `getBezierPath`'s returned string or control points. A source trace alone does not prove Flow output parity.

## Flow production path and test boundary

The public `mountFlow` decodes the document at `apps/vanilla/src/mount-flow.ts:1628` and `apps/vanilla/src/mount-flow.ts:1637`. The optional path choice is decoded at `packages/core/src/domain/flow.schema.ts:53` and `packages/core/src/domain/flow.schema.ts:83`. The host measures handles and reconciles keyed edges at `apps/vanilla/src/mount-flow.ts:670` and `apps/vanilla/src/edge-renderer.ts:136`. The renderer selects Bezier geometry at `apps/vanilla/src/edge-renderer.ts:195` and writes it to the existing SVG path at `apps/vanilla/src/edge-renderer.ts:283`. Core calculates side-directed controls and formats the cubic command at `packages/core/src/domain/flow-edge.schema.ts:93` and `packages/core/src/domain/flow-edge.schema.ts:111`. Flow keeps its default straight path when the option is omitted; labels, markers, selection, and reconnection are separate, tested edge behaviors.

Core tests cover schema decoding and forward, backward, vertical, and mixed-side controls at `packages/core/src/domain/flow-edge.schema.test.ts:94`. A browser test starts through the public mount and checks path output, keyed identity, resize, drag, viewport movement, and switching to an explicit straight path at `apps/vanilla/e2e/canvas.e2e.ts:1044`. These are Flow tests, not a reference-adapter comparison.

## Conformity and deviations

- **Conforming by design:** The Bezier formula uses two side-directed controls and the reference default curvature. Flow tests its own numeric and SVG output; direct parity with xyflow remains unverified.
- **Intentionally different:** Existing Flow edges remain straight when no path choice is supplied. xyflow's default edge is Bezier. This preserves already shipped Flow document behavior; browser tests cover both omitted and explicit choices.
- **Intentionally different:** Flow exposes a small path choice rather than the reference's edge type registry and `pathOptions.curvature`. The first option is bounded to one curve and one fixed curvature.
- **Unverified:** Reference pixel output, label center and offsets, custom curvature, markers, interaction width, selection, culling, and reconnection are outside this slice.
