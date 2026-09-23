# Viewport initialization and updates

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Upstream browser tests cover initial values, pan, zoom, limits, and input variants.

All paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Shared path

```text
initial or controlled viewport
  -> adapter store
    -> XYPanZoom and browser input
      -> constrained d3 transform
        -> adapter viewport state
          -> CSS translate and scale on the viewport element
```

The shared `XYPanZoom` adapter measures the pane, creates a constrained zoom transform, installs wheel and pointer handlers, and applies the initial viewport at `packages/system/src/xypanzoom/XYPanZoom.ts:36`. Scale and translation extents constrain updates. A pane `ResizeObserver` refreshes the cached interaction extent at `packages/system/src/xypanzoom/XYPanZoom.ts:58`.

Transform events call the adapter's `onTransformChange` with `[x, y, zoom]` at `packages/system/src/xypanzoom/eventhandler.ts:188`. Programmatic viewport, scale, and extent methods delegate to d3 transitions at `packages/system/src/xypanzoom/XYPanZoom.ts:248`. `destroy` removes the zoom handler but intentionally leaves the pane observer attached at `packages/system/src/xypanzoom/XYPanZoom.ts:229`.

Coordinate conversion is independent of d3. Screen-to-flow subtracts translation and divides by zoom, with optional snapping. Flow-to-screen multiplies by zoom and adds translation at `packages/system/src/utils/general.ts:168`.

## React production path

The initial store starts at `[0, 0, 1]`. When dimensions and intrinsic node sizes are available, fit view computes a different initial transform at `packages/react/src/store/initialState.ts:67`.

`ZoomPane` creates `XYPanZoom`, writes its constrained initial transform and instance into Zustand, forwards start/move/end callbacks, and destroys the pan-zoom instance on unmount at `packages/react/src/container/ZoomPane/index.tsx:57`.

`Viewport` seeds first paint from the store and then subscribes without rerendering. It writes CSS `translate(...) scale(...)` directly only when a transform component changed at `packages/react/src/container/Viewport/index.tsx:14`.

The public helper calls the pan-zoom instance for zoom, viewport, center, and fit-bounds work. Its coordinate methods subtract the host element's client origin before applying the shared conversion at `packages/react/src/hooks/useViewportHelper.ts:84`.

## Svelte production path

The `zoom` action constructs `XYPanZoom`, reports a constrained initial viewport back to the store, and updates it when parameters change at `packages/svelte/src/lib/actions/zoom/index.ts:45`. Unlike the React hook, the action does not return a destroy handler.

`Zoom.svelte` stores every transform as `{ x, y, zoom }` at `packages/svelte/src/lib/container/Zoom/Zoom.svelte:42`. `Viewport.svelte` reacts by binding the CSS transform at `packages/svelte/src/lib/container/Viewport/Viewport.svelte:12`.

## Tests and gaps

The shared Playwright pane suite verifies panning, wheel zoom, min and max zoom, configured initial viewport, mouse-button modes, and touch behavior at `tests/playwright/e2e/pane.spec.ts:57`. React component tests cover default viewport clamping and callbacks at `examples/react/cypress/components/reactflow/view-props.cy.tsx:99`. Hook tests cover current viewport values and zoom direction at `examples/react/cypress/components/hooks/useViewport.cy.tsx:7`.

These tests prove adapter behavior, not a framework-neutral viewport state contract. Cleanup coverage also does not catch the observer retained by `XYPanZoom`.

## Flow decision

Viewport is schema-derived session state. Pure core functions own screen-to-flow conversion, flow-to-screen conversion, panning, cursor-anchored zoom, and zoom clamping. The host owns input listeners, pointer capture, and the DOM transform.

Document ownership and viewport ownership are independent. React decides viewport control from the presence of its `viewport` prop at `packages/react/src/container/GraphView/index.tsx:155`, while node ownership depends on `nodes` or `defaultNodes`. `ZoomPane` always emits the viewport and updates the store only when the viewport is uncontrolled at `packages/react/src/container/ZoomPane/index.tsx:59`. Svelte writes each transform into its bindable viewport at `packages/svelte/src/lib/container/Zoom/Zoom.svelte:75`.

Flow therefore gives the viewport its own `controlled` or `uncontrolled` mode. Both modes emit a schema-derived viewport change. Uncontrolled mode applies the change before notifying subscribers. Controlled mode restores the last viewport supplied through `updateViewport` until the caller acknowledges the change.

The first input slice supports primary-pointer pane panning and wheel zoom around the cursor. It clamps zoom to schema-validated limits. Touch panning, pinch zoom, mouse-button configuration, extents, selection interaction, double-click zoom, animation, and fit view remain separate behaviors.

### Alternatives

- A single controller mode for both the document and viewport would have fewer options. It would also forbid controlled documents with an uncontrolled viewport, even though the reference treats those ownership decisions separately.
- A browser-owned viewport with callback-only observation would make panning easy. It would prevent controlled acknowledgement and would create a second source of truth outside the core contract.
- Independent document and viewport modes preserve the reference ownership seam without copying React or Svelte props. This is the selected design.

## Conformity and deviations

- **Conforms:** Flow applies viewport translation and zoom to one container around rendered nodes.
- **Conforms:** Flow's screen-to-flow and flow-to-screen functions use the reference formulas.
- **Conforms:** Viewport ownership is independent from document ownership, and controlled input emits a change without replacing the authoritative viewport.
- **Conforms:** Primary-pointer pane movement changes translation in screen pixels, wheel input zooms around the pointer, and min and max zoom clamp changes.
- **Deviates:** Flow uses native pointer and wheel events instead of d3-zoom. This keeps the first input contract dependency-free and exposes the lifecycle that later adapters must implement.
- **Deviates:** Controlled Flow restores the authoritative viewport after each input event until `updateViewport` acknowledges the change. The reference delegates the visual timing to d3 and the framework render cycle.
- **Deviates:** Flow emits one final pan change and one change per wheel event. The reference exposes start, continuous move, and end callbacks.
- **Unverified:** Translation extents, fit view, touch panning, pinch zoom, mouse-button configuration, selection interaction, double-click zoom, and animation remain outside the conformance scenario.

The shared browser scenario proves exact native pan and cursor-anchored wheel behavior for the supported slice. It does not prove the unimplemented reference behaviors.
