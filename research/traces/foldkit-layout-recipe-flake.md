# Foldkit layout recipe measurement and rendered readiness

## Browser entry and diagnosis

The ordinary test opens `/ui-recipes/layout/?scene=...` at `apps/foldkit/e2e/layout-recipes.e2e.ts:13`. The recipe mounts its public Foldkit host at `apps/foldkit/ui-recipes/layout/main.ts:69` and starts the layout controller at `apps/foldkit/ui-recipes/layout/main.ts:142`. It runs Dagre or ELK over measured input, updates positions and handle orientation, refreshes measurements, fits, and exposes the completion count.

The untouched `bd87f43` baseline ran 15 complete file repetitions under the browser lock with one worker and no retries. Thirteen passed. Repetitions 0 and 7 failed the exact `data-layouts="2"` assertion at `apps/foldkit/e2e/layout-recipes.e2e.ts:117`, receiving `4`. There were 103 passing cases and two failures. Reports, all 105 traces, diagnostic probes, and reduced results are in `/tmp/plan146/`.

The route-injected probe subscribed to public measurement, accepted-state, viewport, and interaction events without editing source. In diagnostic Dagre repetition 1, node `2b` measured `105.5` at 858.1, 869, and 896.8 ms. After fitting, it measured `105.49999371040158` at 997.2 ms and `105.48437703262138` at 1038.5 ms. JavaScript rounds these widths from 106 to 105. The layout key includes rounded dimensions at `apps/foldkit/ui-recipes/layout/main.ts:115`, so this false size change starts another layout. The probe records completion count 2 at 1023.6 ms, a changed input key at 1029.8 ms, and completion count 3 at 1041.8 ms. The initial fit response also reports zoom `1.1794318590435096` while the DOM still has zoom 1.

This run did not reproduce the historically reported auto-child geometry assertion. The captured failures establish measurement feedback; the separate held-patch regressions establish premature readiness. They do not establish a new controlled-selection ordering defect.

## Production measurement path

`mountRecipeHost` composes the public program, snapshot client, viewport client, and observer at `apps/foldkit/ui-recipes/recipe-host.ts:99`. Its observer dispatches typed `HostAction.MeasureNodes` requests at `apps/foldkit/ui-recipes/recipe-host.ts:244`. The package observer reads node and handle DOM at `packages/foldkit/src/measurement-observer.ts:89`, preserves generation and request correlation at `packages/foldkit/src/measurement-observer.ts:126`, and publishes request batches at `packages/foldkit/src/measurement-observer.ts:145`. The application reduces them at `packages/foldkit/src/application.ts:2298`, retains per-request acknowledgements, and logs dimension publication through the existing geometry span at `packages/foldkit/src/application.ts:915`.

Foldkit renders accepted measurements back into node styles at `packages/foldkit/src/graph.ts:7369`. Previously, measuring a transformed rectangle divided by accepted zoom introduced floating-point error, then CSS layout quantization fed the error into the next measured width. A size near a rounding boundary could therefore change the recipe's input key without a user size edit.

The observer now reads untransformed `offsetWidth` and `offsetHeight` at `packages/foldkit/src/measurement-observer.ts:130`. This follows the pinned upstream dimension reader at `packages/system/src/utils/dom.ts:30`. Handle centers still use rendered rectangles and zoom. The recipe host supplies the actual rendered viewport scale at `apps/foldkit/ui-recipes/recipe-host.ts:237`, so a model response ahead of its DOM patch cannot rescale those samples incorrectly. The accepted document remains separate from transient measurements.

## Recipe completion path

The layout controller reads public snapshots at `apps/foldkit/ui-recipes/layout/main.ts:185`, constructs edits at `apps/foldkit/ui-recipes/layout/main.ts:206`, and awaits their model acknowledgement at `apps/foldkit/ui-recipes/layout/main.ts:215`. Before remeasurement, it now observes the expected node positions and handle sides at `apps/foldkit/ui-recipes/layout/main.ts:228`. It then fits through the public viewport client at `apps/foldkit/ui-recipes/layout/main.ts:255` and observes the browser-normalized returned transform at `apps/foldkit/ui-recipes/layout/main.ts:259`. Only that rendered state publishes completion at `apps/foldkit/ui-recipes/layout/main.ts:271`. The observer disconnects and settles an outstanding wait on disposal at `apps/foldkit/ui-recipes/layout/main.ts:176`.

The old two animation-frame waits did not acknowledge either DOM patch. The public viewport terminal response describes model state, as traced in [Foldkit selection rectangle readiness](foldkit-selection-rect-race.md). Foldkit can defer rendering while its message queue drains. The repair waits for observable DOM state and leaves product scheduling unchanged. Node selection still chooses the next child's parent, placeholder clicks still convert and grow the tree, and edge edits still trigger layout. The original layout test, exact counts, geometry tolerances, and retry policy remain unchanged.

## Deterministic test paths

The observer regression at `apps/foldkit/e2e/layout-readiness.e2e.ts:3` imports a browser fixture through Vite. That fixture calls the public production observer on a real fractional-width DOM node under fractional zoom and writes each reported width back into CSS at `apps/foldkit/e2e/layout-measurement-fixture.ts:22`. Baseline reports `105.49998838822296` followed by `105.48438385462715`; the repaired observer reports exactly `[106, 106, 106, 106, 106]`. This isolates the production measurement feedback independently of layout engine scheduling.

The two regressions at `apps/foldkit/e2e/layout-readiness.e2e.ts:20` hold the real viewport CSS patch for the multiple-handle and dynamic scenes while animation frames continue. Baseline announces completion count 1 with the fit still held. The repair keeps count 0 until release, then exposes count 1 with the expected rendered scale. This test-only CSS interception is separate from the ordinary layout file, which uses unmodified rendering and public user gestures. All three regressions fail before the repair and pass afterward.

## Conformity and deviations

Conforming at the deterministic browser observer boundary: node dimensions follow pinned xyflow offset dimensions. Conforming at the local recipe test boundary: the existing selected-parent, placeholder-growth, edge-triggered layout, exact layout-count, and geometry assertions remain intact. These tests preserve the cited React-example semantics; they do not establish live React parity.

Intentionally different internally: Foldkit retains typed queued model updates, detached publication, and batched DOM rendering. Application recipe code acknowledges its rendered positions, handles, and fit transform because public model completion does not promise a committed DOM patch. Existing structured measurement telemetry remains in place; no high-frequency logging is added.

Unverified: other browser engines, live React comparison, full-profile acceptance, CI, and collector-side OpenTelemetry delivery. Acceptance results and exact commands are recorded in `/tmp/plan146/` and the implementation report.
