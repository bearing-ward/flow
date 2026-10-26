# Obstacle-aware edge routing

Automatic paths are derived presentation state. `FlowEdge.route` remains authored intent: manual points always win, and generated points never enter saved documents, clipboard data or history.

## Router capability

`FlowRouter` is a typed Effect service. Its `route` method consumes `FlowRoutingRequest` and returns `FlowRoutingResult` or `FlowRoutingFailure`. Requests contain an opaque revision, finite obstacle rectangles, directed source/target ports, clearance and port-offset constraints. Results contain the same revision and exactly one `routed` or `unreachable` outcome per requested edge. `routed` points include current endpoints. Failure reasons are `invalid-request`, `engine` and `invalid-result`.

`createFlowRoutingRequest(document, geometryOptions, constraints?)` projects current measured geometry and omits manual edges. Defaults are eight graph units of clearance and a twenty-unit port offset. `routeFlowEdges(input)` decodes the boundary, invokes the service and checks endpoints, directions, revision, orthogonality and clearance. `createFlowRoutingSession()` rejects superseded, cancelled, disposed and changed-revision results. Its result is `accepted` with a result or `cancelled` with the request revision. Native Effect interruption also applies. The optional adapter's synchronous WASM transaction cannot be preempted mid-call.

`flowRoutingRevision` is opaque. Equivalent measurements have the same key regardless of object property order. Node/handle geometry and automatic/manual mode invalidate routes. Viewport, selection and opaque data do not. Every built-in renderer rechecks current geometry before using a result, so a late result cannot draw against changed obstacles.

## Host APIs

| Host | Derived routing input |
| --- | --- |
| Vanilla | `controller.setEdgeRouting(result)` publishes derived geometry; `undefined` clears it. `getEdgeRouting()` reads it. The JavaScript setter schema-decodes external values. |
| Vue | `FlowCanvas.edgeRouting` accepts the result as a reactive prop. Omit the prop or pass `null` to clear it. The canvas decodes it once before use. |
| Foldkit | `HostAction.SetEdgeRouting({ result })` publishes a result through the Runtime; `null` clears it. Versioned snapshot responses expose derived `edgeRouting` separately from saved intent. `instance.getEdgesGeometry()` includes it. |

Applications own the Effect service, scheduling, cancellation and disposal. Hosts own framework/browser rendering. No engine is installed by these APIs. The separately installed [libavoid adapter](../packages/routing-libavoid/README.md) implements the service.

`getEdgesGeometry` and `getEdgeGeometry` accept `edgeRouting` beside measurements and position overrides. The resulting path serves label midpoints, distance queries, rectangle/path intersections and built-in SVG interaction paths. A stale, missing, unreachable or failed automatic route uses the edge's existing path algorithm. Manual geometry always takes precedence. The application must show the failure/fallback state rather than present that path as obstacle-avoiding.

## Examples and verification

All hosts expose `/edge-routing/` with the same graph and controls for obstacle movement and resizing, vertical ports, reconnection, blocked ports, manual routes, save/load and viewport transforms. The recipe reports pending, unreachable and engine-failure fallbacks. Its browser lifecycle debounces measurement changes, cancels superseded work and disposes pending requests. Test-only hooks exercise slow engines and engine failures.

The reusable suite in `tests/routing/router-contract.ts` tests alternative engines. Core tests cover common geometry and session ownership. Each host's `edge-routing.e2e.ts` wrapper runs the same eleven browser cases. The dedicated three-project config uses fresh strict ports 4186–4188, one worker and the browser lock. [Plan 162's trace](../research/traces/162-edge-routing.md) records the pre-flight, source paths and exact results.
