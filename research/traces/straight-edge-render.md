# Straight edge rendering

Status: production paths traced from xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow's straight-path behavior is tested in its own core and browser host; no reference output comparison has run.

All reference paths are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

The public `ReactFlow` receives `edges` and passes them to its wrapper and store updater at `packages/react/src/container/ReactFlow/index.tsx:180` and `packages/react/src/container/ReactFlow/index.tsx:193`. `EdgeRenderer` reads visible edge identifiers and renders a keyed `EdgeWrapper` for each at `packages/react/src/container/EdgeRenderer/index.tsx:59` and `packages/react/src/container/EdgeRenderer/index.tsx:66`. `EdgeWrapper` finds source and target internal nodes and calls `getEdgePosition` with the edge's handle identifiers at `packages/react/src/components/EdgeWrapper/index.tsx:73` and `packages/react/src/components/EdgeWrapper/index.tsx:81`. It omits an edge with unresolved positions at `packages/react/src/components/EdgeWrapper/index.tsx:120`.

The wrapper passes the resolved coordinates to its selected edge component at `packages/react/src/components/EdgeWrapper/index.tsx:218`. `StraightEdge` calls the shared `getStraightPath` at `packages/react/src/components/Edges/StraightEdge.tsx:27` and passes its result to `BaseEdge` at `packages/react/src/components/Edges/StraightEdge.tsx:31`. `BaseEdge` writes that string into an SVG `path` at `packages/react/src/components/Edges/BaseEdge.tsx:47`.

## Svelte production path

The public `SvelteFlow` accepts bindable `edges` at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:72` and mounts `EdgeRenderer` inside the viewport at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:185`. The store derives visible edge layouts by looking up each endpoint node, calling `getEdgePosition`, and keeping successful results at `packages/svelte/src/lib/store/visibleElements.ts:88`, `packages/svelte/src/lib/store/visibleElements.ts:129`, and `packages/svelte/src/lib/store/visibleElements.ts:139`. `EdgeRenderer` iterates those layouts with the edge identifier as key at `packages/svelte/src/lib/container/EdgeRenderer/EdgeRenderer.svelte:21`.

`EdgeWrapper` passes layout coordinates to its selected edge component at `packages/svelte/src/lib/components/EdgeWrapper/EdgeWrapper.svelte:146`. `StraightEdge` derives `getStraightPath` from those coordinates at `packages/svelte/src/lib/components/edges/StraightEdge.svelte:21`, and `BaseEdge` writes the result into an SVG path at `packages/svelte/src/lib/components/edges/BaseEdge.svelte:21`.

## Shared geometry and test boundary

`getEdgePosition` waits for node measurement, resolves source and target handles, and returns no edge geometry when either handle is unavailable at `packages/system/src/utils/edges/positions.ts:19`, `packages/system/src/utils/edges/positions.ts:37`, and `packages/system/src/utils/edges/positions.ts:46`. An omitted handle identifier selects the first matching handle at `packages/system/src/utils/edges/positions.ts:127`. `getHandlePosition` places the endpoint on the measured handle's declared side at `packages/system/src/utils/edges/positions.ts:99`. `getStraightPath` returns an SVG move and line command at `packages/system/src/utils/edges/straight-edge.ts:43`.

The upstream browser edge suite checks edge attachment, styling, selection, and hidden state at `tests/playwright/e2e/edges.spec.ts:5` and `tests/playwright/e2e/edges.spec.ts:43`. Its connection suite asserts a new visible edge after a handle drag at `tests/playwright/e2e/nodes.spec.ts:200`. Flow tests the initial path, keyed identity, resizing, node dragging, viewport movement, and connection-created edges in its own browser host. This does not establish pixel or full feature parity with either reference adapter.

## Flow design

The core resolves declared handle identities and calculates a straight SVG path from numeric positions and measured handle dimensions. The vanilla host owns a map of measured handle offsets. Its one SVG layer reuses paths by edge identifier and removes paths when the document removes an edge or an endpoint cannot be measured. Node dragging updates a transient rendered position; the document changes only at the existing semantic acknowledgement boundary. The viewport transforms the entire edge layer with the nodes, so pan and zoom do not rewrite graph coordinates.

### Flow production path

The public `mountFlow` decodes the document and creates the host at `apps/vanilla/src/mount-flow.ts:1614` and `apps/vanilla/src/mount-flow.ts:1623`. The host creates the edge renderer inside the viewport at `apps/vanilla/src/mount-flow.ts:165`, and its observer and reconciliation pass measure handles and update edges at `apps/vanilla/src/mount-flow.ts:666`. The renderer resolves both handles and measurements, derives attachment positions, and writes a keyed SVG path at `apps/vanilla/src/edge-renderer.ts:134` and `apps/vanilla/src/edge-renderer.ts:278`. Pure handle resolution, attachment, and path formatting live at `packages/core/src/domain/flow-edge.schema.ts:37`, `packages/core/src/domain/flow-edge.schema.ts:55`, and `packages/core/src/domain/flow-edge.schema.ts:78`. Pointer dragging supplies transient positions; viewport updates transform the common parent at `apps/vanilla/src/mount-flow.ts:246`.

### Flow test path

Core tests exercise omitted handle identifiers and measured side attachment at `packages/core/src/domain/flow-edge.schema.test.ts:33` and `packages/core/src/domain/flow-edge.schema.test.ts:46`. Browser tests start at the public mount and check path omission after edge removal or missing handles, keyed path identity, resizing, live drag, viewport movement, connection-created edges, and controlled acknowledgement in `apps/vanilla/e2e/canvas.e2e.ts`. These tests run Flow's own host. No test launches the pinned React or Svelte adapter for direct output comparison.

`flow.dom.reconcile` records bounded edge counts for document reconciliation. Handle measurement remains part of `flow.geometry.measure`. Pointer movement changes path geometry without a log per event. Labels, markers, selection, interaction width, step and Bezier paths, and reconnection have separate implementation traces. Custom paths and viewport culling remain open.

## Conformity and deviations

- **Conforms:** Both reference adapters resolve edge endpoints from measured handles and render the resulting straight path in SVG. Flow tests the same broad behavior through its own browser host; reference parity remains unverified.
- **Conforms:** Unresolved handles or missing measurements leave the persistent edge path out of rendered output. Flow's browser tests cover absent handles; deferral before the first observer delivery is implemented but untested directly.
- **Conforms:** An omitted handle identifier selects the first declared handle of the required kind. Flow uses document order, and its browser tests cover that rule.
- **Deviates:** Flow stores handle measurements as host-owned numeric offsets and computes the path in its core package. The reference stores handle bounds in framework internal nodes. Flow's browser tests cover its chosen ownership boundary.
- **Deviates:** Flow defaults to a straight path, while the reference defaults to Bezier. Flow also supports explicit Bezier and step variants and edge interactions in separate slices.
- **Unverified:** No test compares Flow's SVG path or pixels directly with the pinned reference, and edge stacking and culling remain untested. Accessibility DOM checks and reconnection have separate Flow tests.
