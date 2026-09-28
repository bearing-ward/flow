# Viewport operations

Viewport operations change or inspect the canvas session. The flow document does not contain the viewport, and viewport changes are not persisted with nodes and edges.

## Read and convert positions

The JavaScript controller exposes `getViewport()` and `getZoom()`. Vue exposes the same reads through `useFlow()`. Foldkit's app-scoped `ViewportClient` provides request-based reads. A viewport is `{ x, y, zoom }`; `x` and `y` are pane-local translations, and `zoom` is positive.

`screenToFlowPosition()` accepts client coordinates. Hosts subtract the canvas's `getBoundingClientRect().left` and `.top`, then apply the viewport inverse. `flowToScreenPosition()` applies the forward transform and adds that canvas origin. This supports page scrolling and canvases placed inside offset containers. CSS scaling and rotation of the canvas are unsupported because a bounding rectangle alone cannot recover the pre-transform coordinate basis.

`viewportInitialized` becomes true when the host pane has positive width and height. Bounds fitting returns no target before initialization, for zero-sized bounds, or for an empty pane. `fitView()` preserves the current viewport when there are no eligible nodes. Unmeasured nodes use the documented fallback dimensions; measured sizes take precedence.

## Set and fit

Use `setViewport()`, `zoomIn()`, `zoomOut()`, `zoomTo()`, `setCenter()`, `fitBounds()`, or `fitView()` for public operations. `getViewportForBounds()` calculates a target without changing the session. Zoom-to operations anchor at the pane center unless an adapter exposes an explicit zoom point.

Fit padding accepts a number from zero to less than one half, applied as a fraction on each side, or `{ top, right, bottom, left }` values in pane pixels. The bounds helper first centers the content in the pane, then shifts it only when an edge would violate its requested padding. Zoom is clamped to the host's configured limits.

Pan extent remains adapter-specific by decision. Preserve Vanilla's existing constraint on programmatic viewport targets. Do not add a new Vue or Foldkit extent option in this slice; those targets remain unconstrained. This differs from xyflow, where `translateExtent` configures pan bounds but `fitView()` uses the unconstrained viewport setter. Core constraint math has unit coverage, while host enforcement through the viewport operation fixture and the Vue/Foldkit cells remain unverified. See the conformance trace before relying on extent behavior.

`setViewport()`, zoom operations, `setCenter()`, `fitBounds()`, and `fitView()` return a promise with a terminal status and target viewport. Owner replacement methods remain synchronous; when they replace a running operation, its promise settles as `superseded`.

| Status | Meaning |
| --- | --- |
| `accepted` | An uncontrolled host committed the resulting viewport. |
| `proposed` | A controlled host emitted a candidate; the owner still decides whether to update the viewport. |
| `unchanged` | The request did not change the viewport. |
| `rejected` | The host could not apply the request. |
| `unavailable` | Required pane dimensions are not available. |
| `superseded` | A newer request or external viewport update replaced the request. |
| `disposed` | The host ended while the request was active. |

The promise settles when the operation finishes or reaches one of those terminal conditions. It never waits indefinitely for a controlled owner. Animation duration defaults to zero. Hosts that animate own frame scheduling; core provides pure interpolation only. Controlled hosts send one proposal and resolve `proposed`; they do not animate against a viewport the owner has not accepted. An owner may acknowledge by supplying a new viewport. In an uncontrolled host, a newer operation, an external controlled update, or host disposal settles the prior request exactly once.

## Observe movement

Viewport movement observations are host-local start, change, and end signals. They report operation proposals or animation frames and remain separate from accepted-state notifications. Use the accepted-state stream when the caller needs the authoritative viewport after a controlled update.

## Conformance and deviations

The operation names, bounds fitting, pane-offset conversion, and animation options follow the pinned xyflow API where the input shapes overlap. Flow uses finite result statuses instead of a boolean promise so controlled proposals, superseding operations, and disposal do not claim unacknowledged state or leave promises pending. Flow's public padding subset is a uniform fraction or four pixel sides; string percentages, legacy `x`/`y` padding, and custom easing functions are intentionally not accepted. CSS-transformed host coordinates remain unverified and unsupported. See [`public-viewport-contract.md`](../../research/traces/public-viewport-contract.md) for source and test boundaries.
