# Plan 158: shape nodes and palette

Plan 158 implements unit 7 of Plan 149 and adopted D7, including resize. The source baseline is `10ff2de`. Imported `research/artifacts/` evidence remains unchanged. This trace separates production paths from tests.

## Public reference and design decision

The [public Shapes page](https://reactflow.dev/examples/nodes/shapes) was read on 2026-10-25. It advertises circle, diamond, and hexagon shapes, a sidebar, custom minimap nodes, and a color toolbar. It describes one custom node type with `type: 'shape'` and `data: { type: 'diamond', color: '#ff0071' }`. The [public demo](https://example-apps.xyflow.com/react/pro/shapes/index.html) is linked from that page. A separately locked Playwright probe opened the public demo, selected a node with a native click, and captured its SVG, six color controls, ten displayed nodes, resize controls, and custom minimap. Its local screenshot is `/tmp/plan158-reference.png`, with DOM observations in `/tmp/plan158-reference.json`. Circle, diamond, and hexagon are visible in both graph and minimap. The demo also offers additional shapes outside unit 7's required set. Subscription source and hidden tests were not accessed.

Three read-only design candidates compared reserved recipe data with central validation, host-specific recipe validation, and a first-class node field with a new persistence version. An independent reviewer selected central validation with the existing public data keys. Host-only validation could be bypassed by ordinary document or clipboard decoding. A first-class field would add migration and projection work without adding graph meaning needed by this recipe. The synthesis retains one accepted-state owner, one history owner, and one clipboard owner per host.

The chosen caller sketch is `prepareFlowFigureEdit(document, { kind: 'create', id, position, figure: { type: 'diamond', color: '#ff0071' } })`, followed by the host's ordinary edit API. Recoloring uses `{ kind: 'color', nodeId, color }`. The repository's identifier rule rejects `Shape` in symbols, so exported helper names use `Figure`; the public node discriminator and data keys match the described recipe.

## Shared production contract

`FlowFigureDataSchema` at `packages/core/src/domain/flow-shape.schema.ts:23` derives kind and color types from the fixed palette. `flowFigurePath` in that module supplies circle, diamond, and hexagon paths in normalized 100-unit bounds. SVG stays a host output; no DOM object or arbitrary path enters the graph document.

`FlowNodeSchema` at `packages/core/src/domain/flow.schema.ts:140` conditionally validates the reserved `'shape'` type. It requires explicit finite positive bounds and valid shape type and color. Other node types retain opaque JSON data. The original data object retains unrelated metadata. `decodeFlowDocument` at `packages/core/src/domain/flow.schema.ts:688` remains the external boundary, with existing decode, integrity, and failure telemetry. Ordinary edit candidate validation at `packages/core/src/domain/flow-edit.ts:242`, persistence decoding, and fragment decoding therefore share this invariant. Physical dimensions resolve at `packages/core/src/domain/flow-graph.ts:120`. Edge geometry at `packages/core/src/domain/flow-edge-geometry.ts:239` uses `edgeAttachmentPosition` at `packages/core/src/domain/flow-edge.schema.ts:80`, keeping data, bounds, and rendered endpoints on the normal graph path.

`prepareFlowFigureEdit` at `packages/core/src/domain/flow-shape.ts:51` decodes commands, rejects duplicate IDs and missing shape targets, and emits one ordinary add or data-update transaction. It uses `FlowSpan.editPrepare` and `FlowSpan.editFailure` with input and failure attributes. Creation sets explicit bounds, zero wrapper padding and border, and stable left-target/right-source handles. Recoloring merges only color; opaque data remains intact.

Geometry scales affinely to `node.size`, including nonsquare circle bounds. Every outline meets the horizontal side-center anchors. Existing physical-handle geometry owns the outward half-handle displacement of edge endpoints. Bounds, selection, hit testing, layout, and resize remain rectangular. No shape-intersection edge router is introduced.

History's authored document projection at `packages/core/src/domain/flow-history.ts:85` already preserves these fields. Clipboard cloning and remapping at `packages/core/src/domain/flow-clipboard.ts:241` preserves shape data, sizes, and handle roles. Saved node projections already include these fields at `packages/core/src/domain/flow-persistence.ts:30`; no persistence version or new document field is required.

## Vanilla production path

The real `/shapes/` entry registers `flowFigureNodeRenderer` and enables canvas resize controls at `apps/vanilla/src/shapes-demo.ts:23`. Its renderer at `apps/vanilla/src/shape-node.ts:36` owns SVG content, updates path and fill from accepted data, and releases DOM on renderer destruction. Host-owned handles and canvas resize controls remain siblings.

The minimap callback at `apps/vanilla/src/shape-node.ts:9` uses the same normalized path and resolves data from the current controller. Accepted-state, viewport, and rendered-position subscriptions in the existing minimap mount drive updates. Sidebar and color commands reach `controller.applyEdit` at `apps/vanilla/src/mount-flow.ts:14700`, then the serial edit resolver at `apps/vanilla/src/mount-flow.ts:12283`, shared preparation, and accepted-history owner. The accepted document reconciles through the custom renderer selection at `apps/vanilla/src/mount-flow.ts:8959`, which calls this renderer's update lifecycle.

## Vue production path

`FlowFigureNode` at `packages/vue/src/shape-node.ts:7` is the one custom node component. `renderFlowFigureMiniMapNode` at `packages/vue/src/shape-node.ts:59` supplies the custom minimap slot. The recipe registers both through public `@flow/vue` exports at `apps/vue/src/shapes-demo.ts:64`. The slot reads data by ID from the same reactive accepted document. The first gesture run reproduced a production bug: SVG path presses never started node drags because the public pointer entry required an HTMLElement. The pointer entry at `packages/vue/src/flow-canvas.ts:7030` and its existing no-drag/drag-handle helpers now accept Element targets, retaining native-control exclusions. The same unmodified movement assertions cover the fix.

The recipe uses `FlowCanvas.nodesResizable`, whose canvas session keeps resize previews and commits at the gesture boundary. It deliberately does not compose `FlowNodeResizer`, which publishes intermediate accepted bounds and would need separate history grouping. This distinction is tested through the real recipe. Shared creation and color transactions use `useFlow().applyEdit`, whose canvas entry at `packages/vue/src/flow-canvas.ts:4727` reaches the serial resolver at `packages/vue/src/flow-canvas.ts:4618`. Native node presses enter at `packages/vue/src/flow-canvas.ts:7018`; the release handler at `packages/vue/src/flow-canvas.ts:8359` commits the gesture. The normal node renderer path at `packages/vue/src/flow-canvas.ts:9502` uses the same accepted state and geometry. Scope teardown removes browser controls and their observers.

## Foldkit production path

The real Runtime composition at `apps/foldkit/src/shapes-demo.ts:47` registers `foldkitFigureNodeRenderer` from `packages/foldkit/src/shape-node.ts:7` and enables model-owned resize controls. The HTML builder creates SVG from the shared path and color. The renderer owns no graph state.

`createFoldkitFigureMiniMapNode` at `packages/foldkit/src/shape-node.ts:50` receives data from the recipe's current accepted document. Accepted-state publication updates that lookup before the minimap projection. The instance client sends shared edit operations through its public edit method at `packages/foldkit/src/instance.ts:322`, application routing at `packages/foldkit/src/application.ts:3304`, and the graph edit handler at `packages/foldkit/src/graph.ts:3918`. The accepted graph renders through the registry selection at `packages/foldkit/src/graph.ts:7874`, preserving the existing model-owned gesture and history boundaries. Runtime disposal releases state, measurement, history, viewport, instance, minimap, and browser-control subscriptions.

## Browser application controls

The shared app module at `apps/shared/shapes/demo.ts:64` creates sidebar buttons and a selected-node color toolbar. It submits the shared transactions rather than changing document arrays. The toolbar follows the physical selected-node rectangle through a frame-coalesced MutationObserver. Disposal disconnects the observer, cancels the frame, removes listeners, and clears the demo bridge.

Save and load use the public versioned document functions. A malformed-load control demonstrates rejection before edit submission and leaves the accepted graph and history unchanged. The controls are application composition under `apps/`; graph contracts and geometry stay under `packages/core`.

## Test paths and results

The pure entry `packages/core/src/domain/flow-shape.test.ts:1` covers all three creations, literal normalized paths, invalid discriminators and colors, malformed live/persisted/clipboard documents, missing or invalid bounds, nonsquare affine circles, opaque nonshape nodes, duplicate and missing targets, rejected edits, opaque metadata, persistence, clipboard remapping, endpoint geometry, and existing history replay. Its 14 tests pass.

The three host wrappers invoke `figuresAcceptance` at `apps/shared/shapes/acceptance.ts:186` against their real `/shapes/` entry points. Tests use native mouse and button gestures. They assert each shape and color, sidebar creation, matching minimap SVG, one-step creation/color/move/resize history, real connections, rendered endpoints against physical handle boxes, transformed resize, affine bounds, clipboard remapping, save/load, malformed-load rejection, native pan and wheel zoom, and disposal. The endpoint comparison at `apps/shared/shapes/acceptance.ts:128` uses the browser's SVG path and screen matrix, separately from pure core geometry.

Vanilla passes all 20 acceptance cases. The first Vanilla run passed 19 and exposed an ambiguous test status locator; selecting the recipe output resolved it without changing the rejection assertion. The first Vue run passed 17 and reproduced the three SVG drag failures described above. The corrected Vue run passes all 20 cases. Foldkit also passes all 20 after configuring its connection policy and pane options, selecting resize controls by their accessible name, and clipping the canvas so transformed viewport content cannot intercept external controls. Its traced intermediate failure showed the viewport covering Dispose after zoom. No assertion about graph state, history, size, or edge attachment was weakened. The required final locked verifier passes with the focused profile on 2026-10-26. Results are 2,740 unit tests across 120 files, 238 React reference-host tests under their recorded classifications, Vanilla 945 passed with 4 skipped, Vue 1,079 passed with 2 skipped, and Foldkit 703 passed. All 20 shape cases pass inside each host run. All retained focused checks also pass. This is focused verification, not full-profile acceptance. After that pass, only this result record and its source citations were updated; documentation and trace checks were repeated.

## Catalog and commands

The catalog's "Shapes · Pro" entry changes P to C in Vanilla, Vue, and Foldkit. The prior audit remains in `reauditHistory`. The Plan 158 reaudit cites the production modules, core suite, and all-host gesture wrappers, including resize and data integrity. Recomputed counts are 187 of 195 in-scope entries close in every host. Each host has Pro counts C8/P5/G3 across 16 Pro entries.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed, no dependency changes |
| `bun run check` | Passed after scoped lint and formatting fixes |
| `bun run check:architecture` | Passed, 477 production source files |
| `bun run build:packages` and `bun run tsc --noEmit` | Passed |
| `bun run --cwd apps/vanilla build`, Vue and Foldkit equivalents | Passed |
| `bun run vitest run packages/core/src/domain/flow-shape.test.ts` | 14 passed |
| `bun run vitest run` | 2,740 passed across 120 files |
| `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/shapes.e2e.ts --workers=1` | 20 passed |
| `scripts/with-flow-browser-lock.sh bun run playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/shapes.e2e.ts --workers=1` | 20 passed |
| `scripts/with-flow-browser-lock.sh bun run playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/shapes.e2e.ts --workers=1` | 20 passed |
| Foldkit suite with `--trace on` | Diagnosed viewport interception and host-specific control selector before the successful rerun |
| `scripts/with-flow-browser-lock.sh bun /tmp/plan158-reference.mjs` | Passed, public reference DOM and screenshot captured |
| `bun run docs:generate-api` | Generated shape data and command reference |
| `bun run research:check-traces` and `bun run docs:check` | Passed |
| Scoped `bun run oxlint --fix` and `bun run oxfmt` | Passed, no rule suppressions or config changes |
| `git diff --check` | Passed |
| `scripts/with-flow-browser-lock.sh bun run verify --check reference-host` | Passed focused profile; all retained checks and browser files, plus all three shape suites |

## Observability and verification boundary

Shape commands use existing preparation and failure spans. Shared decode, host lifecycle, accepted semantic publication, gesture completion, and cancellation retain existing structured telemetry. No per-pointer-frame logs are added. Applications retain ownership of optional OTLP export and shutdown. Collector-side delivery was not tested.

`verification.config.json` only appends Plan 158 and `shapes.e2e.ts` in every host. All previous checks and files remain selected. Every browser command uses its own `scripts/with-flow-browser-lock.sh` invocation with one worker. The final required command is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. Focused results do not establish full-profile acceptance.

## Conformity and deviations

- **Conforming to the public description and adopted D7 by contract:** one data-driven node type, circle/diamond/hexagon choices, shared SVG geometry, explicit bounds, fixed palette, sidebar, contextual color toolbar, and matching minimap. Boundary: 14 pure tests and 20 native gesture cases in each host pass. These establish the named functional outcomes, not identical private Pro internals.
- **Intentionally different or explicitly chosen Flow policy:** the three-shape delivery subset, fixed four colors, 120-unit initial bounds, affine scaling at nonsquare bounds, rectangular interaction bounds, left/right ports, button-based creation, and session history. These make the recipe deterministic and preserve current host interaction semantics. Resize is included by Plan 158 even though the public description does not specify it.
- **Unverified:** hidden Pro implementation and tests, exact Pro palette and geometry proportions, its creation gesture and resize policy, shape-aware obstacle routing, full-suite acceptance, and OpenTelemetry collector delivery. Functional catalog closeness is distinct from exact reference conformance.
