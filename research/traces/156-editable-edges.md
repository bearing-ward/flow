# Plan 156: editable and freeform edges

Plan 156 implements unit 9 and adopted D9 from Plan 149. Source baseline is commit `0864a33`. Imported evidence in `research/artifacts/` is unchanged. This trace separates production paths from test entry points. It makes no obstacle-router or wire-tie acceptance claim.

## Public reference and design decision

The [public Editable Edge page](https://reactflow.dev/examples/edges/editable-edge) and its [accessible demo](https://example-apps.xyflow.com/react/pro/editable-edge/index.html) were read on 2026-10-25. The demo renders Catmull-Rom, Bezier Catmull-Rom, Step, and Linear examples. A separately locked Playwright probe selected the Linear edge with a native click, observed focusable control circles, then dragged an active circle by 35/25 screen pixels. Its visible M/L path changed at that control. Other examples used C or Q segments. The probe captured before/after screenshots under `/tmp/plan156-reference-*.png`; these are local observations, not imported evidence. The unauthenticated page does not disclose the subscription implementation or its tests.

Three design candidates compared inline edge ownership, a document route table, and route-intent operations. An independent reviewer favored the inline schema plus route-only patches. The document table would require references, ID allocation, orphan cleanup, clipboard closure, and a new transaction attachment for single-edge ownership. Flow instead exports reusable finite graph-point and ordered-point schemas. Unit 11 can own bundle points using those schemas without changing an edge's independent route owner.

The chosen type sketch is `route?: { mode: 'automatic' } | { mode: 'manual', points: NonEmptyArray<FlowRoutePoint> }`. `FlowRoutePointSchema` validates finite absolute graph coordinates at `packages/core/src/domain/flow-route.schema.ts:4`. Ordered points reject adjacent duplicates at `packages/core/src/domain/flow-route.schema.ts:9`. Endpoints remain current handle anchors. Route intent is distinct from opaque edge data. Manual polylines and explicit editing gestures are Flow policy, not undisclosed Pro constants.

## Shared production contracts

`FlowEdgeSchema` composes the route contract at `packages/core/src/domain/flow.schema.ts:307`. Existing external document and edge-update decoders therefore validate stored routes. `editEdgeRoute` at `packages/core/src/domain/flow-route.ts:69` decodes a route command, resolves current edge geometry, checks index and geometry validity, and returns one route-only `update-edge` patch. The existing `prepareFlowEdit` at `packages/core/src/domain/flow-edit.ts:242` remains the proposal boundary. No route history or independent accepted-document owner exists.

`getManualRouteGeometry` at `packages/core/src/domain/flow-route-geometry.ts:5` derives the SVG path and arc-length midpoint. It coalesces coincident rendered endpoint segments without rewriting authored points. `hitTestRoutePoint` and `sampleRoutePoint` in that module operate in graph coordinates. `getEdgesGeometry` at `packages/core/src/domain/flow-edge-geometry.ts:178` supplies the same manual path to distance, rectangle-selection, and intersection helpers. Automatic edges preserve their previous path and label formulas.

Node movement changes only measured endpoint attachments. Existing reconnection spreads the edge at `packages/core/src/domain/flow-reconnection.schema.ts:79`, retaining the route and opaque data. Route commands reject malformed coordinates, adjacent duplicates, invalid indices, and truly degenerate requested geometry. A later endpoint coincidence collapses only the derived segment.

History projects all authored edge fields at `packages/core/src/domain/flow-history.ts:85`. A point drag keeps a local preview and submits once on release. Only accepted semantic documents enter history. Controlled rejection continues to use the existing acceptance boundary.

V4 saved documents and sessions at `packages/core/src/domain/flow-persistence.ts:439` extend the frozen v3 projection with route intent. Version selection at `packages/core/src/domain/flow-persistence.ts:487` uses v4 for any authored route key, including automatic. Legacy writers and mislabeled old envelopes reject route-bearing content. The frozen v1, v2, and v3 edge projections remain unchanged. Clipboard paste translates every manual interior point by the root placement offset before extension hooks at `packages/core/src/domain/flow-clipboard.ts:287`.

## Vanilla production path

The public `createFlow`, `mountFlow`, and `createFlowHost` option `editableEdges` defaults to false. `createFlowHost` starts at `apps/vanilla/src/mount-flow.ts:2240`. Saved manual routes render independently of that flag.

The real captured pointer entry checks Space before pane pan at `apps/vanilla/src/mount-flow.ts:10463`, then enters the existing native connection lifecycle at `apps/vanilla/src/mount-flow.ts:6520`. Preview samples pass through shared path geometry at `apps/vanilla/src/mount-flow.ts:5616`. Valid completion adds route intent in the same edge-add proposal at `apps/vanilla/src/mount-flow.ts:11469`. Escape, pointer cancellation, blur, failed targets, and disposal discard transient samples.

Point events enter the scoped route resource at `apps/vanilla/src/editable-edge-routes.ts:299`. It owns capture, viewport conversion, auto-pan frames, competing-route cancellation, and focus. Release submits one route command through the existing serial edit resolver. Double-click insertion enters at `apps/vanilla/src/editable-edge-routes.ts:390`. The renderer uses shared path and label output at `apps/vanilla/src/edge-renderer.ts:738`, including drag previews, visible SVG, interaction path, and label placement.

## Vue production path

`FlowCanvas.editableEdges` defaults to false. The canvas composes its route resource at `packages/vue/src/flow-canvas.ts:4738`. The resource captures point drags at `packages/vue/src/editable-edges.ts:190` and commits once at `packages/vue/src/editable-edges.ts:161`. Reactive preview points are presentation state. Canvas teardown, accepted document replacement, Escape, lost capture, blur, and pointer cancellation release them.

Native handle admission latches Space into the pending connection. `pendingAsConnection` at `packages/vue/src/flow-canvas.ts:6188` transfers that intent into the native session. Completion attaches sampled route points at `packages/vue/src/flow-canvas.ts:7370` before the ordinary edge-add proposal. `resolveRenderedEdge` at `packages/vue/src/flow-canvas.ts:9898` and the label calculation consume the same shared manual geometry. Existing custom geometry overrides remain explicit.

## Foldkit production path

`GraphInteractionOptions.editableEdges` defaults to false and passes through `createProgram`. Native listeners are owned by `createEditableEdgesResource` at `packages/foldkit/src/editable-edges.ts:45`. Space is latched at physical pointer admission through `freeformPress` at `packages/foldkit/src/graph.ts:6823`. The model retains transient route samples in the existing connection session.

Point previews use the `RoutePreview` message at `packages/foldkit/src/graph.ts:3729`. A released gesture sends `RouteCommand` at `packages/foldkit/src/graph.ts:3732`, which checks the gesture claim, clears preview state, prepares the shared route edit, and calls the existing accepted edit owner. Native capture, focus, auto-pan, cancellation, and disposal stay in the adapter resource. `calculateEdgeGeometry` at `packages/foldkit/src/graph.ts:5432` uses shared manual path and label output. The ordinary edge hit target follows that path.

## Test paths and observed results

The pure test entry is `packages/core/src/domain/flow-route.test.ts:70`. It exercises schema failure, literal paths and midpoint labels, point hit testing, intersections, sample omission, route commands, moved and reconnected endpoints, v4 persistence, and clipboard translation. Coincident endpoint segments have an explicit fixture. Storage-specific tests begin at `packages/core/src/domain/flow-route-persistence.test.ts:87`, including raw and JSON sessions, frozen projections, mislabeled old envelopes, malformed routes, nested clipboard offsets, and extension ordering. These two suites passed 34 tests.

Foldkit's model tests start at `packages/foldkit/src/editable-edges.test.ts:110` and separately exercise accepted-state ownership, one-step history, cancellation with stale release, disabled editing, last-point removal, and native freeform creation. They do not substitute for browser capture proof.

All three browser wrappers invoke `editableEdgesAcceptance` at `apps/shared/editable-edges/acceptance.ts:140` against their own `/editable-edges/` recipe. The shared suite drives real mouse and keyboard input. It asserts stored graph points, visible and interaction SVG paths, labels measured against the browser's path midpoint, transformed drag previews, one-step undo and redo, insertion and keyboard removal, native reconnection, save/load, translated clipboard routes with opaque data, Space freeform previews, cancellation, and disposal.

Initial browser failures exposed fixture issues: transient selection had to be restored after save/load before copying, and each recipe needed the same explicit canvas bounds. Foldkit needed an ID on its Runtime container and border-box sizing to avoid measurement feedback. Its asynchronous ports also required waiting for rendered viewport, path, and selection changes before the next native input. The loose-mode fixture permits both connection directions. Browser instrumentation also found a production issue: Space scrolled the page and changed graph conversion during sampling. Each host now suppresses that default when the editable canvas owns the key interaction, while text inputs keep native handling. Exact graph-point assertions were retained.

Independent implementation review found a source-to-target ordering bug in backward freeform gestures in Vanilla and Foldkit. Their native completion now reverses samples when endpoint normalization reverses direction, matching Vue's policy. A native loose-mode backward draw asserts the final ordered path in all three hosts.

Latest scoped browser results: **10/10 Vanilla, 10/10 Vue, 10/10 Foldkit**. Tests include keyboard insertion, last-point automatic mode, stationary auto-pan, and both freeform directions. All **2,718 unit tests across 118 files** pass. One older unknown-version fixture moved from version 4 to version 5 because v4 is now supported; frozen old-format rejection remains separately tested.

The catalog entry `Editable Edge · Pro` changes P→C in all hosts after these passes. Its prior audit is retained in `reauditHistory`; the Plan 156 reaudit cites the production contract and gesture evidence. Summary counts are recomputed from entries: 185/195 in-scope entries close in every host, and each host has Pro counts C6/P7/G3 across 16 Pro entries.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; no dependency changes |
| `bun run check` | Passed |
| `bun run check:architecture` | Passed, 463 production files |
| `bun run build:packages` | Passed |
| `bun run tsc --noEmit` | Passed |
| `bun run vitest run` | Passed, 2,718 tests / 118 files |
| `bun run docs:generate-api` | Generated public route API reference |
| `bun run docs:check` | Passed |
| `bun run research:check-traces` | Passed |
| Locked `playwright test apps/vanilla/e2e/editable-edges.e2e.ts --workers=1` | 10 passed |
| Locked `playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/editable-edges.e2e.ts --workers=1` | 10 passed |
| Locked `playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/editable-edges.e2e.ts --workers=1` | 10 passed |
| Locked public reference probe | Native selection and point drag changed the Linear path |
| `scripts/with-flow-browser-lock.sh bun run verify --check reference-host` | Passed focused profile; counts below |
| Scoped `bun run oxlint --fix` and `bun run oxfmt` | Passed on changed files |
| `git diff --check` | Passed |

The required final command `scripts/with-flow-browser-lock.sh bun run verify --check reference-host` **passed** with the focused profile on 2026-10-25 in 1,311,265 ms. It retained every prior selected check and browser file. Results: 2,718 unit tests; React reference host check passed (238 tests under its recorded classifications); Vanilla 916 passed / 4 skipped; Vue 1,050 passed / 2 skipped; Foldkit 674 passed. The new ten-case suite passed inside each host run. This is focused verification, not the full profile.

The first verifier attempt stopped at old packed-consumer fixtures that excluded v4. The three installed-package fixtures now accept `1 | 2 | 3 | 4` and retain the negative unsupported-version assertion using v5. The succeeding verifier passed all packed consumers. After that pass, only these fixture comments and this result record were updated; documentation and quality checks were repeated.

## Observability and verification boundary

Route preparation and failure use `FlowSpan.editPrepare` and `FlowSpan.editFailure` with existing edge/change/failure attributes. Host lifecycle, accepted edit publication, connection completion, and cancellation retain the existing spans and structured logs. Pointer samples and drag frames emit no per-frame logs. Application composition still owns OTLP export and shutdown. Collector-side delivery was not tested.

The verification config only adds Plan 156 and its three browser wrappers. Existing checks and browser scope are preserved. Every browser command takes `scripts/with-flow-browser-lock.sh` separately with one Playwright worker. The required final command is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. A focused pass does not establish full-suite acceptance or obstacle-routing parity.

## Conformity and deviations

- **Conforming to adopted D9:** explicit route modes, ordered graph-space interiors, retained points on endpoint changes, shared built-in path/label geometry, and one accepted history transaction per drag. Boundary: core tests and the shared public gesture suite in each host.
- **Intentionally different:** Flow uses manual polylines, double-click or Enter insertion, Delete/Backspace removal, and one/ten-unit keyboard movement. These keep the route contract deterministic and accessible. They do not claim exact Pro interpolation or hidden gesture rules. Removing the last point selects automatic mode.
- **Unverified:** subscription implementation details, exact Pro spline/control UX, arbitrary custom renderer geometry, unit 10 obstacle routing, and unit 11 wire ties. Custom renderers can explicitly override their interaction geometry and remain outside the built-in route-path comparison. Full-suite acceptance and collector delivery require their separate gates.
