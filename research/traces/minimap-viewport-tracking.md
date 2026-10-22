# MiniMap viewport tracking

## Reference and retained subjects

The pinned reference is xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The Cypress example pins Cypress 13.6.6 at `examples/react/package.json:37`.

The zoom case reads the viewBox and mask before and after one wheel event at `examples/react/cypress/e2e/minimap.cy.ts:20`. Pane drag compares the same attributes at `examples/react/cypress/e2e/minimap.cy.ts:54`. The node case stores a synchronous `Cypress.$` jQuery collection at `examples/react/cypress/e2e/minimap.cy.ts:37`, then reads that same collection after the drag at `examples/react/cypress/e2e/minimap.cy.ts:45`. It does not use `.as()` or `cy.get('@alias')`.

[Cypress 13.6.6 querying.ts, lines 92-103](https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/cy/commands/querying/querying.ts#L92-L103) replays a subject alias's query chain. That alias behavior does not apply to the local synchronous jQuery collection. The retained Playwright ElementHandle is faithful. Re-querying it after replacement would weaken this test.

The reference selector derives graph-space viewport bounds from translation, zoom, and canvas size at `packages/react/src/additional-components/MiniMap/MiniMap.tsx:19`. It unions visible node bounds with that viewport at `packages/react/src/additional-components/MiniMap/MiniMap.tsx:44`. The aspect fit and default five-pixel offset calculation are at `packages/react/src/additional-components/MiniMap/MiniMap.tsx:112`. The mask encloses the padded viewBox with a viewport hole at `packages/react/src/additional-components/MiniMap/MiniMap.tsx:212`. Nodes use absolute graph positions and measured dimensions at `packages/react/src/additional-components/MiniMap/MiniMapNodes.tsx:94`. React keys node wrappers by id at `packages/react/src/additional-components/MiniMap/MiniMapNodes.tsx:49`.

## Existing differences

`docs/react-flow-api-correspondence.md` contains no fixed-viewBox MiniMap decision. The earlier `reusable-canvas-ui.md` trace documents the legacy Vanilla boolean `ui.minimap` at fixed dimensions, its simple viewport rectangle, and click recentering as an intentional first UI layer. That path remains in `apps/vanilla/src/canvas-ui.ts:435`. Plan 137 changes the standalone Vanilla `createFlowMiniMap` used by the upstream fixture, plus the Vue and Foldkit components. Physical SVG dimensions remain 200 by 150 in standalone Vanilla and 180 by 120 in Vue and Foldkit.

## Instrumented baseline

With only the scoped failing ledger entries temporarily marked pass, the five-case MiniMap sequence ran through each real `/upstream-examples/basic` route. Temporary diagnostics recorded viewBox, mask, node rectangles, graph transforms, retained-element connectivity, and freshly queried node attributes. Product code was unchanged. The receipts are `/tmp/plan137-baseline-{vanilla,vue,foldkit}.log`.

## Production paths

Browser wheel input enters Vanilla at `apps/vanilla/src/mount-flow.ts:12256`, computes anchored zoom, and publishes a viewport change at `apps/vanilla/src/mount-flow.ts:12347`. Viewport application updates the rendered transform and emits its change observation at `apps/vanilla/src/mount-flow.ts:4907`. MiniMap subscribes through the public viewport observer at `apps/vanilla/src/mount-flow.ts:13669`.

Vue's native wheel handler is `packages/vue/src/flow-canvas.ts:8410`. It computes anchored zoom and calls updateViewport at `packages/vue/src/flow-canvas.ts:8499`. Uncontrolled writes update owned viewport state at `packages/vue/src/flow-canvas.ts:3583`. The accepted measured graph and canvas dimensions enter MiniMap's injection context at `packages/vue/src/flow-canvas.ts:5408`.

Foldkit's native wheel view emits `ViewportWheel` at `packages/foldkit/src/graph.ts:7904`. The reducer computes the new viewport and accepts replacement state at `packages/foldkit/src/graph.ts:3488`. The example's accepted-state subscription decodes document and viewport and updates UI at `apps/foldkit/src/upstream-examples-fixture.ts:219`. MiniMap observes that accepted state through its existing helper update, without a new acknowledgement path.

The public standalone Vanilla export is `apps/vanilla/src/public.ts:49`. The upstream fixture mounts it at `apps/vanilla/src/upstream-examples-fixture.ts:95`. `createFlowMiniMap` decodes options and acquires the DOM overlay at `apps/vanilla/src/minimap.ts:155`. Rendering builds a graph from the accepted document, internal measurements, and current drag-preview positions at `apps/vanilla/src/minimap.ts:251`. It passes that graph, viewport, and canvas size to core at `apps/vanilla/src/minimap.ts:270`. State and viewport subscriptions render synchronously; preview positions coalesce through requestAnimationFrame at `apps/vanilla/src/minimap.ts:328`. The keyed default-node map retains SVG rectangles at `apps/vanilla/src/minimap.ts:288`; viewBox and mask attributes update at `apps/vanilla/src/minimap.ts:306`.

Vue's upstream fixture renders the public `FlowMiniMap` inside `FlowCanvas` at `apps/vue/src/upstream-examples-fixture.ts:153`. Its injected accepted graph and canvas size combine with the reactive viewport at `packages/vue/src/minimap.ts:178`. Core projection drives keyed node VNodes at `packages/vue/src/minimap.ts:61`, the graph-space background at `packages/vue/src/minimap.ts:340`, the mask at `packages/vue/src/minimap.ts:373`, and the SVG viewBox at `packages/vue/src/minimap.ts:426`. Vue retains keyed rectangles through its existing renderer.

Foldkit's fixture creates the public helper at `apps/foldkit/src/upstream-examples-fixture.ts:142` and calls update from accepted graph and viewport state at `apps/foldkit/src/upstream-examples-fixture.ts:145`. The helper projects accepted input at `packages/foldkit/src/ui/minimap.ts:166`. Its default-node map retains each rectangle at `packages/foldkit/src/ui/minimap.ts:178`. Render prunes removed nodes, updates the background and viewBox, appends existing nodes in document order, and sets the mask at `packages/foldkit/src/ui/minimap.ts:215`. Its public update replaces current graph and viewport before render at `packages/foldkit/src/ui/minimap.ts:458`.

The shared pure geometry derives viewport graph coordinates and unions them with visible node bounds at `packages/core/src/domain/flow-minimap.ts:162`. It fits the union to each host's physical SVG size, then applies the reference default offset at `packages/core/src/domain/flow-minimap.ts:179`. The viewBox and mask share graph units at `packages/core/src/domain/flow-minimap.ts:188`. Node geometry uses absolute positions and accepted dimensions at `packages/core/src/domain/flow-minimap.ts:224`. Click conversion accounts for SVG xMidYMid letterboxing at `packages/core/src/domain/flow-minimap.ts:198`. Pan keeps the reference pre-offset view scale. Existing state publication, Effect workflows, telemetry boundaries, and shutdown ownership remain in their current owners. No high-frequency diagnostic logging ships.

## Test boundary

The shared Cypress translation uses the real host routes, native Chromium mouse input through CDP, and synthetic wheel dispatch. It preserves the upstream waits and one-time post-action assertions. It retains the original node rectangle and runs all five cases on one page. It does not run Cypress itself or mount React. Literal core tests separately check union bounds, aspect fitting, offset scaling, graph-space node rectangles, mask geometry, and SVG letterboxing for click conversion.

## Conformity and deviations

Conforming: UP-127-065, UP-127-066, and UP-127-067 pass 3/3 in Vanilla, Vue, and Foldkit in the complete unchanged shared Cypress runner. The zoom and pane cases reach and pass both viewBox and mask assertions. The node case reads the same retained rectangle before and after native drag. Vue's original keyed identity remains conforming; Vanilla and Foldkit now retain default rectangles. Four literal core regressions separately prove union geometry, offset scaling, graph-space dimensions, mask coordinates, and letterboxed click inversion. These are translated Chromium and pure-geometry boundaries, not paired live React evidence.

Intentionally different: the documented legacy boolean Vanilla MiniMap remains a small fixed overview, preserving its existing `canvas-ui` contract. Vue and Foldkit retain their documented 180 by 120 physical dimensions instead of React's default 200 by 150. The existing inert empty-state accessibility and keyboard/default-click centering affordances remain because this bounded repair does not remove Flow's established local contracts. Custom DOM renderer lifecycle remains host-owned; this trace does not establish retained custom-renderer identity. Product workflows and publication order remain Effect-owned or framework-owned as required by project standards.

Unverified: live React comparison, other engines, physical devices, exhaustive MiniMap options, retained custom-renderer identity, full-profile acceptance, and collector-side OpenTelemetry delivery. Exact related-suite and focused-verifier results are recorded separately in Plan 137.
