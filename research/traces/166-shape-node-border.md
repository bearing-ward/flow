# Plan 166: shape-node wrapper border

This repair follows `plans/166-shape-node-border.md` at `a6c4eab`. Imported evidence stays unchanged.

## Cause and production path

The Vue image-service entry point registers `FlowFigureNode` under the shape discriminator at `apps/vue/src/image-service-demo.ts:90`. Its document supplies a hexagon with bounds and data, without the inline chrome overrides emitted by `prepareFlowFigureEdit` at `packages/core/src/domain/flow-shape.ts:79`.

`FlowCanvas` owns accepted node state and constructs each wrapper at `packages/vue/src/flow-canvas.ts:9830`. It applies the generic `flow-vue-node` class and authored styles. `FlowFigureNode` at `packages/vue/src/shape-node.ts:15` renders only the SVG and centered label. The SVG uses `flowFigurePath` and scales to the wrapper bounds. The generic CSS at `packages/vue/src/style.css:273` supplied a 1px border and rectangular background. The old image-service override targeted `.flow-node[data-node-type='shape']`; that selector did not match the Vue wrapper. The new browser assertion reproduced the unselected Vue wrapper's 1px border before the fix.

The export service loads the real host route at `packages/image-service/src/public.ts:167`, invokes `flowImageHost.render`, and captures Chromium pixels at `packages/image-service/src/public.ts:223`. The RPC at `apps/shared/image-service/bridge.ts:115` decodes the request, mounts the selected adapter, publishes handle geometry, and waits for refreshed measurements and frames. Image composition did not introduce the border. It captured the live wrapper's CSS.

## Fix and ownership

Adapter styles recognize the renderer's existing `data-shape-svg` marker. Vanilla at `apps/vanilla/src/style.css:702`, Vue at `packages/vue/src/style.css:314`, and Foldkit at `packages/foldkit/src/style.css:296` remove wrapper padding, border, background, and box shadow, and use border-box sizing. This covers ordinary decoded documents as well as recipe-created nodes. The ineffective image-service override is removed.

The renderers retain their existing geometry and label ownership at `apps/vanilla/src/shape-node.ts:36`, `packages/vue/src/shape-node.ts:15`, and `packages/foldkit/src/shape-node.ts:7`. Selection or keyboard focus adds a blue 2px wrapper outline with a 3px offset. Hover alone adds no rectangle. Graph meaning, hit testing, resize behavior, handles, and authored document fields retain their existing owners. This CSS-only production change adds no Effect workflow or logging boundary.

## Test path and samples

The three host `shapes.e2e.ts` entry points run the shared browser acceptance at `apps/shared/shapes/acceptance.ts:181`. Circle, diamond, and hexagon assertions check all four border widths, transparent background, absent box shadow on hover, absent resting outline, visible keyboard-focus and selection outlines, and outline removal after deselection. Existing gesture, minimap, color, history, clipboard, persistence, and teardown cases still run.

The three host `server-image.e2e.ts` entry points run the real backend acceptance at `apps/shared/image-service/acceptance.ts:147`. The initial unselected hexagon must have no border, background, box shadow, or outline. Existing tests compare the returned PNG against live-render pixels, require repeated captures to be byte-identical, and verify geometry, dimensions, edit history, failure, cancellation, and context cleanup. Each backend stops in `finally`; Playwright owns host-server teardown.

`FLOW_IMAGE_SAMPLE_DIR=/tmp/plan166` directs the existing capture tests to write `vanilla.png`, `vue.png`, and `foldkit.png`, plus their `-live.png` comparisons. The default remains `/tmp/plan165` for existing callers. The samples use the unchanged image-service document and real Chromium service.

Verification scope only appends Plan 166 to `activeWork`. All existing checks and browser files remain selected, including shapes and server-image acceptance in all three hosts. The required final command is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. Every browser command acquires its own lock and uses one worker. Focused verification does not establish full-profile acceptance.

## Conformity and deviations

- Conforming to Plan 158's Flow contract: unselected shapes display SVG geometry and fill without rectangular wrapper chrome, in live views and exported images. The test boundary is the three host shape suites and real image-service suites, including live-image pixel comparison.
- Intentionally different from shape-following indicators: focus and selection use a rectangular outline because Flow retains rectangular interaction bounds. The outline appears only during selection or keyboard focus; browser assertions cover both states and deselection.
- Unverified: exact upstream Pro pixels, private upstream implementation, arbitrary custom renderer styling, full-profile acceptance, production container regeneration, and collector-side telemetry delivery. No upstream parity or new telemetry claim is made.
