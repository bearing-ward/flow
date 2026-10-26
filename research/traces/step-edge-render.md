# Step and smooth-step edge paths

Status: traced from pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow has core geometry and browser integration tests; reference-output comparison remains separate. All upstream paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `ReactFlow` passes edges into its wrapper and store updater at `packages/react/src/container/ReactFlow/index.tsx:180` and `packages/react/src/container/ReactFlow/index.tsx:193`. `EdgeRenderer` mounts wrappers keyed by edge ID at `packages/react/src/container/EdgeRenderer/index.tsx:59` and `packages/react/src/container/EdgeRenderer/index.tsx:66`. `EdgeWrapper` resolves the endpoint nodes and measured handle positions through `getEdgePosition` at `packages/react/src/components/EdgeWrapper/index.tsx:74` and `packages/react/src/components/EdgeWrapper/index.tsx:81`; unresolved positions suppress output at `packages/react/src/components/EdgeWrapper/index.tsx:120`. Its built-in type registry selects step or smooth step at `packages/react/src/components/EdgeWrapper/utils.ts:13` and `packages/react/src/components/EdgeWrapper/utils.ts:14`.

`StepEdge` delegates to `SmoothStepEdge` with `borderRadius: 0` at `packages/react/src/components/Edges/StepEdge.tsx:12` and `packages/react/src/components/Edges/StepEdge.tsx:16`. `SmoothStepEdge` sends handle coordinates, sides, and path options to `getSmoothStepPath` at `packages/react/src/components/Edges/SmoothStepEdge.tsx:30`, then passes the returned path and label position to `BaseEdge` at `packages/react/src/components/Edges/SmoothStepEdge.tsx:45`. `BaseEdge` writes the SVG path at `packages/react/src/components/Edges/BaseEdge.tsx:49`.

## Svelte production path

The public `SvelteFlow` accepts edges and mounts `EdgeRenderer` inside its viewport at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:72` and `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:185`. The visible-edge store computes positioned edges at `packages/svelte/src/lib/store/visibleElements.ts:129` and `packages/svelte/src/lib/store/visibleElements.ts:139`. `EdgeRenderer` keys wrappers by ID at `packages/svelte/src/lib/container/EdgeRenderer/EdgeRenderer.svelte:21`. The type registry selects step and smooth step at `packages/svelte/src/lib/store/initial-store.svelte.ts:87` and `packages/svelte/src/lib/store/initial-store.svelte.ts:89`.

Both Svelte variants call `getSmoothStepPath`. `StepEdgeInternal` supplies `borderRadius: 0` at `packages/svelte/src/lib/components/edges/StepEdgeInternal.svelte:22`, while `SmoothStepEdgeInternal` leaves the default at `packages/svelte/src/lib/components/edges/SmoothStepEdgeInternal.svelte:22`. The public components accept path options at `packages/svelte/src/lib/components/edges/StepEdge.svelte:24` and `packages/svelte/src/lib/components/edges/SmoothStepEdge.svelte:24`. `BaseEdge` renders the resulting path at `packages/svelte/src/lib/components/edges/BaseEdge.svelte:21`.

## Shared geometry and upstream tests

`getSmoothStepPath` defaults to a 20-unit endpoint gap, midpoint step, and 5-unit corner radius at `packages/system/src/utils/edges/smoothstep-edge.ts:266` through `packages/system/src/utils/edges/smoothstep-edge.ts:278`. The routing helper offsets each handle in its declared direction at `packages/system/src/utils/edges/smoothstep-edge.ts:82`, selects one or two orthogonal bends from handle sides at `packages/system/src/utils/edges/smoothstep-edge.ts:106` and `packages/system/src/utils/edges/smoothstep-edge.ts:142`, and adjusts nearly coincident same-side endpoints at `packages/system/src/utils/edges/smoothstep-edge.ts:153`. Mixed sides may flip the bend at `packages/system/src/utils/edges/smoothstep-edge.ts:168`. The helper removes duplicate gap points at `packages/system/src/utils/edges/smoothstep-edge.ts:200`, rounds corners using a radius capped by adjacent segment lengths at `packages/system/src/utils/edges/smoothstep-edge.ts:214`, and builds the SVG string at `packages/system/src/utils/edges/smoothstep-edge.ts:289`.

The pinned browser suite covers generic edge attachment and properties at `tests/playwright/e2e/edges.spec.ts:5` and `tests/playwright/e2e/edges.spec.ts:43`. It does not directly assert the step or smooth-step path string. Source matching and Flow-only tests do not prove rendered parity.

## Flow production and test paths

Public `mountFlow` decodes path choices at `apps/vanilla/src/mount-flow.ts:1628` and `packages/core/src/domain/flow.schema.ts:53`. The renderer reads measured attachments and selects step or smooth-step at `apps/vanilla/src/edge-renderer.ts:136`, `apps/vanilla/src/edge-renderer.ts:203`, and `apps/vanilla/src/edge-renderer.ts:210`; it writes the result to the keyed SVG path at `apps/vanilla/src/edge-renderer.ts:283`. Core routing handles backward, mixed, and same-side cases at `packages/core/src/domain/flow-step-edge.schema.ts:15` and `packages/core/src/domain/flow-step-edge.schema.ts:75`; the variants use zero or five-unit corner radius at `packages/core/src/domain/flow-step-edge.schema.ts:230` and `packages/core/src/domain/flow-step-edge.schema.ts:237`. Labels use the same route at `packages/core/src/domain/flow-step-edge.schema.ts:244`.

Core tests assert full SVG strings and label points at `packages/core/src/domain/flow-step-edge.schema.test.ts:10` and `packages/core/src/domain/flow-step-edge.schema.test.ts:56`. A browser test starts at public mount and verifies route strings, label positions, live drag, and viewport transform at `apps/vanilla/e2e/canvas.e2e.ts:435`. Pointer movement is not logged; reconciliation owns DOM counters. No direct xyflow output comparison has run.

## Conformity and deviations

- **Conforming behavior:** Flow uses the reference default endpoint gap and corner radius and verifies its own path and label output in core and browser tests. Reference output parity remains unverified.
- **Intentionally different:** Flow has a small path choice rather than xyflow's edge type registry and configurable routing options.
- **Unverified:** Pixel output against xyflow and custom gap, radius, and step-position behavior remain outside this slice.
