# Fit to view

Pinned upstream revision: `0a1f9575b25679f2880175de8d3eae21aedde921`. Upstream paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. Plan 144 supersedes the old pane-fraction padding policy by user decision dated 2026-10-22.

## Upstream production path

The public React instance queues fit requests in `packages/react/src/hooks/useReactFlow.ts:294-304`. The store resolves them through the live node lookup, pane size, and pan-zoom adapter in `packages/react/src/store/index.ts:56-80`. Shared `fitViewport` derives eligible node bounds and calls the viewport helper, then the unconstrained viewport setter in `packages/system/src/utils/graph.ts:344-410`. Renderer state reaches the DOM through `packages/react/src/container/ZoomPane/index.tsx:59` and `packages/react/src/container/Viewport/index.tsx:20-39`.

The padding parser at `packages/system/src/utils/general.ts:196-259` floors numeric padding to `floor((size-size/(1+p))*0.5)` pixels per side. A px string floors its numeric prefix; a percent string floors `size*value*0.01`. Sides default through x/y then zero; an explicit side takes precedence. `getViewportForBounds` subtracts combined gutters, takes the lesser axis zoom, clamps to limits, centers bounds, floors actual edge distances, and corrects short sides at `packages/system/src/utils/general.ts:304-343`. Exhausted padding still produces a minimum-zoom target. Numeric side values have the same formula as uniform numbers.

## Flow production path

Vanilla's public facade decodes fit options at `apps/vanilla/src/mount-flow.ts:14734-14740`. The host resolves node selection and passes measurements, position overrides, pane dimensions, limits, and padding to core at `apps/vanilla/src/mount-flow.ts:13709-13747`. The operation dispatcher publishes accepted viewport changes or controlled proposals at `apps/vanilla/src/mount-flow.ts:12926-13024`. Rendering applies the accepted viewport at `apps/vanilla/src/mount-flow.ts:4965-4966` through the CSS transform helper at `apps/vanilla/src/mount-flow.ts:1728`.

Vue exposes the method through useFlow at `packages/vue/src/use-flow.ts:658`. Its canvas decodes options, resolves node selection, builds measured geometry, and invokes core at `packages/vue/src/flow-canvas.ts:4257-4311`. `requestViewport` owns terminal promises, updates, and animation at `packages/vue/src/flow-canvas.ts:3952-4119`; the rendered CSS transform reads active viewport at `packages/vue/src/flow-canvas.ts:10522`.

Foldkit's public client encodes fit options into a request at `packages/foldkit/src/application.ts:639-671`. The application computes graph bounds and delegates to the same core viewport helper at `packages/foldkit/src/application.ts:2169-2201`. Initial fitting follows the same path after readiness at `packages/foldkit/src/application.ts:2205-2243`. Accepted viewport lives in graph state; the render reads it into CSS at `packages/foldkit/src/graph.ts:7832`.

Core node fitting uses measured or fallback dimensions and visible graph bounds at `packages/core/src/domain/flow-fit-view.ts:91-138`; graph construction and bounds filtering live at `packages/core/src/domain/flow-graph.ts:46-129,234-263`. The shared padding schema, resolution, and viewport helper are at `packages/core/src/domain/flow-viewport-operation.schema.ts:15-41,114-214`. Pure geometry adds no lifecycle or logging. Existing decode and viewport semantic-change workflows retain telemetry ownership; no collector delivery claim follows.

## Test paths

The unchanged upstream component case mounts literal padding 0.5 and checks containment at `examples/react/cypress/components/reactflow/view-props.cy.tsx:29-35`. Its shared Flow port remains `apps/shared-e2e/upstream-component/view.ts:27-31`; the literal fixture option remains `apps/shared/upstream/component.ts:243`. Host fixtures acquire the actual public APIs after measurement. This proves that the public fitView option accepts 0.5 and places the node in view after measurement; the Flow fixture uses an imperative call and does not establish React initial-prop queue timing or exact transform equality for every option.

Core tests compare numeric 0, 0.1, 0.5, 1, and 2 against literal pinned outputs and the pinned formula, including a mixed measured/fallback/hidden graph. Separate tests cover px/percent strings, numeric sides, x/y fallback precedence, clamping, exhausted padding, and pixel migration. The shared fixture in `research/fixtures/viewport-contract.json` feeds exact expected values to all hosts' public viewport suites. Pixel-side fixtures keep the old viewport while their inputs become px strings. `apps/vanilla/src/upstream-examples-padding.test.ts` preserves the Basic adapter's old output at two pane sizes. Schema Studio's existing 0.1 callers adopt the new semantics; its Vanilla and Foldkit suites assert the pinned formula and rendered viewport. See Plan 144 for exact changed test lines and final run receipts.

## Integration boundaries

The denser numeric fit exposed three old assumptions beyond padding parsing. Foldkit Controls now reads live zoom for each action in `packages/foldkit/src/ui.ts:544-567`, as the pinned helper reads current pan-zoom state in `packages/react/src/hooks/useViewportHelper.ts:24-39`. The native layout test expects the existing half-unit handle inset instead of the outer node border; handle CSS remains unchanged. Vanilla's Feature Overview explicitly requests its old 20% gutter, preserving its initial viewport and keeping its resize control clear of the minimap. Plan 144 records literal viewport and hit-target proof.

The generic pane input now omits invented node dimensions, matching `examples/react/src/generic-tests/pane/general.ts:1-37` at `packages/conformance/src/upstream-generic/pane/general.ts:1-94`. This corrects test input fidelity without changing the upstream pan assertion, its parser, fit formula, or production pan math. Public hosts still measure their own native theme, so this does not establish theme geometry parity.

The live Controls repair exposed Foldkit's old double-click factor during the complete shared Cypress sequence: zoom-out by 1/1.2 followed by double-click by 1.2 restored the starting transform. The pinned d3 handler uses 2 or 0.5 with Shift, retained through `packages/system/src/xypanzoom/XYPanZoom.ts:103`. Foldkit forwards Shift in the native observer and applies those terminal targets in `packages/foldkit/src/graph.ts:3585-3605`. The new native test verifies literal zoom and pointer anchor endpoints; transition frames remain unverified. Isolated UP-127-062 runs do not replay earlier shared-page toggles and are not acceptance evidence.

The shared Flow selection-bounds test now pans natively to make working room, then measures the same four subjects before drawing its marquee at `apps/shared-e2e/node-input-contract.ts:8`. The old fixed pixel window depended on the old fit zoom; a near-edge replacement also activated the existing auto-pan band. The final setup preserves the count, selected identities, union bounds, and later 100-pixel pan assertions without changing production selection behavior. Plan 144 records the rejected verifier attempt and all-host repeated setup proof.

## Conformity and deviations

Conforming: valid numeric, px/percent, and per-side padding follows the pinned formula, flooring, axis defaults, zoom clamping, and asymmetric correction. Exact geometry is bounded by the named core and public host fixture tests. UP-128-056 classification requires the unchanged browser assertion to pass in every host; Plan 144 records that evidence separately from source inspection.

Intentionally different: Flow rejects malformed strings and non-finite inputs at its schema boundary; upstream logs invalid units and substitutes zero. Flow preserves its existing empty/zero-area result, fallback node dimensions, explicit terminal statuses, controlled proposals, and Vanilla programmatic pan extent. These support deterministic ownership and existing documented contracts; this padding decision does not broaden their parity claims.

Unverified: every upstream option combination, transition frames, CSS-transformed hosts, other browser engines, physical devices, CI, and collector delivery. Local focused verification does not establish full-profile or release acceptance.
