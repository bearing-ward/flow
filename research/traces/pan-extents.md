# Viewport translation extents

Status: production and test paths traced from pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`.

Upstream citations are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. Flow citations are relative to the repository root.

## Public contract and production path

`ReactFlow` exposes `translateExtent` as a top-left and bottom-right boundary in flow coordinates. It defaults to an infinite extent; `nodeExtent` is a separate option for node placement (`packages/react/src/types/component-props.ts:485`, `packages/react/src/container/ReactFlow/index.tsx:87`). The public component passes the value to both the store updater and graph view (`packages/react/src/container/ReactFlow/index.tsx:220`, `packages/react/src/container/ReactFlow/index.tsx:278`).

```text
ReactFlow translateExtent
  -> GraphView / FlowRenderer / ZoomPane
    -> XYPanZoom d3 zoom translateExtent and pane dimensions
      -> constrained transform events
        -> React store transform
          -> viewport CSS translate and scale
```

`GraphView` forwards the extent to `FlowRenderer`, which forwards it to `ZoomPane` (`packages/react/src/container/GraphView/index.tsx:145`, `packages/react/src/container/FlowRenderer/index.tsx:101`). `ZoomPane` constructs `XYPanZoom` with the extent and pane element, then writes the resulting initial transform into the store (`packages/react/src/container/ZoomPane/index.tsx:70`, `packages/react/src/container/ZoomPane/index.tsx:97`). The shared adapter caches a pane extent, updates it from `ResizeObserver`, configures d3 zoom with scale and translation extents, and constrains the initial viewport against the measured pane (`packages/system/src/xypanzoom/XYPanZoom.ts:56`, `packages/system/src/xypanzoom/XYPanZoom.ts:83`, `packages/system/src/xypanzoom/XYPanZoom.ts:89`).

Pointer, wheel, and pinch input reach d3 zoom through the adapter's installed handlers and filter (`packages/system/src/xypanzoom/XYPanZoom.ts:170`, `packages/system/src/xypanzoom/XYPanZoom.ts:201`). Each zoom event forwards its constrained transform to `onTransformChange` (`packages/system/src/xypanzoom/eventhandler.ts:188`). `ZoomPane` writes that transform to the store when viewport ownership is uncontrolled (`packages/react/src/container/ZoomPane/index.tsx:59`). The `Viewport` subscriber applies store `[x, y, zoom]` as one CSS translate-and-scale transform (`packages/react/src/container/Viewport/index.tsx:20`).

Prop changes update the live pan-zoom instance through `StoreUpdater` and the store setter (`packages/react/src/components/StoreUpdater/index.tsx:140`, `packages/react/src/store/index.ts:371`, `packages/system/src/xypanzoom/XYPanZoom.ts:308`). This setter changes the d3 constraint; the cited path does not itself recompute an existing viewport transform.

Programmatic panning uses the same extent. The store's `panBy` reads the current transform, pane width and height, and `translateExtent` (`packages/react/src/store/index.ts:417`). The system helper adds the screen-space delta, calls `setViewportConstrained` with pane and translation extents, and reports whether the transform changed (`packages/system/src/utils/store.ts:510`, `packages/system/src/utils/store.ts:529`, `packages/system/src/utils/store.ts:542`). `setViewportConstrained` delegates the actual constraint to d3 zoom's `constrain` method (`packages/system/src/xypanzoom/XYPanZoom.ts:233`). Selection auto-pan consumes that boolean so it updates selection geometry only after a real pan (`packages/react/src/container/Pane/index.tsx:259`).

The generic `setViewport` and `syncViewport` methods use d3's transform path without an explicit call to the constrained helper (`packages/system/src/xypanzoom/XYPanZoom.ts:248`, `packages/system/src/xypanzoom/XYPanZoom.ts:256`). Do not infer that every programmatic transform is extent-clamped from the `panBy` path.

## Test path

The React component test mounts `ControlledFlow` with `[[0, 0], [1000, 1000]]`, drags the pane from `(0, 0)` toward `(100, 100)`, and asserts that the viewport CSS transform is unchanged (`examples/react/cypress/components/reactflow/view-props.cy.tsx:177`). This proves rejection of that outward pan in the mounted React scenario. It does not prove all four boundaries, wheel or pinch at a boundary, resizing, dynamic extent changes, or the unconstrained `setViewport` path.

## Flow production path

The public mount options accept an optional, schema-validated `viewport.extent` independently of the document and node options (`apps/vanilla/src/mount-flow.ts:78`). The core schema rejects non-finite or inverted bounds (`packages/core/src/domain/flow-pan-extent.schema.ts:5`). Its pure `constrainViewportToExtent` calculates screen-space translation bounds from the extent and current zoom, clamps each axis, and centers an extent smaller than the visible pane (`packages/core/src/domain/flow-pan-extent.schema.ts:20`, `packages/core/src/domain/flow-pan-extent.schema.ts:37`).

The vanilla host measures the canvas, first clamps zoom, then constrains translation when an extent is supplied (`apps/vanilla/src/mount-flow.ts:252`). `renderViewport` sends that result to the viewport CSS transform and visibility reconciliation (`apps/vanilla/src/mount-flow.ts:370`). The initial viewport is constrained after the canvas is mounted and measured (`apps/vanilla/src/mount-flow.ts:2762`). Every semantic viewport change is constrained before publishing; uncontrolled mode adopts it, while controlled mode renders the authoritative viewport until the caller updates it (`apps/vanilla/src/mount-flow.ts:1153`). Explicit `updateViewport` also constrains the caller's value (`apps/vanilla/src/mount-flow.ts:2848`). Pointer pan and pinch reach `renderViewport` during the gesture (`apps/vanilla/src/mount-flow.ts:1980`, `apps/vanilla/src/mount-flow.ts:2009`), and wheel changes publish through the same viewport change path (`apps/vanilla/src/mount-flow.ts:2666`). Selection and connection auto-pan also call `renderViewport` (`apps/vanilla/src/mount-flow.ts:698`, `apps/vanilla/src/mount-flow.ts:1711`).

## Flow test path

Core tests reject invalid bounds and cover positive and negative overpan, zoom-dependent bounds, and centering when the viewport is larger than the extent (`packages/core/src/domain/flow-pan-extent.schema.test.ts:11`, `packages/core/src/domain/flow-pan-extent.schema.test.ts:26`, `packages/core/src/domain/flow-pan-extent.schema.test.ts:36`, `packages/core/src/domain/flow-pan-extent.schema.test.ts:42`). The mounted browser test configures a finite extent, checks outward and opposite-boundary pointer pans, then zooms with the wheel and asserts the rendered translation remains within the zoomed limits (`apps/vanilla/e2e/gesture-options.e2e.ts:62`, `apps/vanilla/e2e/gesture-options.e2e.ts:170`). The browser test does not exercise touch pinch, controlled acknowledgement, resize after mount, or extent changes after mount.

## Conformity and deviations

- **Conforms:** Flow constrains pan translation against a finite flow-coordinate extent using pane dimensions, and the mounted browser test demonstrates rejected outward panning. The compared upstream path also uses pane dimensions and translation extents (`packages/system/src/xypanzoom/XYPanZoom.ts:83`, `examples/react/cypress/components/reactflow/view-props.cy.tsx:177`); Flow's path is `apps/vanilla/src/mount-flow.ts:252` and `apps/vanilla/e2e/gesture-options.e2e.ts:170`.
- **Intentionally different:** Flow uses pure core geometry and native browser events rather than d3 zoom. It explicitly centers an extent smaller than the pane (`packages/core/src/domain/flow-pan-extent.schema.ts:20`); xyflow delegates its exact constraint to d3 (`packages/system/src/xypanzoom/XYPanZoom.ts:233`).
- **Unverified:** The Flow browser boundary covers pointer panning and wheel zoom with an extent, plus pure centering tests (`apps/vanilla/e2e/gesture-options.e2e.ts:170`, `packages/core/src/domain/flow-pan-extent.schema.test.ts:42`). It does not establish identical d3 behavior for touch pinch, controlled acknowledgement, resize, dynamic extent changes, or programmatic viewport methods.

The test boundary is pure extent geometry plus mounted pointer and wheel gestures and their rendered transform. Source similarity does not establish full xyflow parity.
