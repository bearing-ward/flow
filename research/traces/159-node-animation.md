# Plan 159: Node position animation

Implementation baseline: Plan 159 at `5199b06`, unit 5 of Plan 149, maintainer D5 adopted on 2026-10-25. This trace separates production behavior, test composition and reference observations. Imported `research/artifacts/` files are unchanged.

## Public reference boundary

The [public example page](https://reactflow.dev/examples/nodes/node-position-animation) and [accessible demo](https://example-apps.xyflow.com/react/pro/node-position-animation/index.html) are the reference boundary. The page was read on 2026-10-26. It describes position interpolation between horizontal and vertical layouts. Subscription ZIP source and hidden implementation constants were not accessed. The locked browser fixture at `research/fixtures/node-animation-reference/reference.e2e.ts` passed on 2026-10-26. It observes five nodes, intermediate position frames, a changed destination, and return to the original positions after another toggle. The demo renders zero edges. An initial moving-edge probe therefore failed and was replaced with an explicit zero-edge boundary assertion; no reference edge attachment claim is made. The collaborative preview timed out twice while requesting a snapshot; the repository's locked Playwright workflow is the browser evidence path.

## Shared contracts and ownership

The public request is a Plan 157 `FlowLayoutResult` plus optional duration. The recipe's public buttons enter `apps/shared/node-animation/demo.ts:104`, capture the accepted document and measured layout input, and use `createFlowLayoutSession` with `flowLayoutRevision`. A stale engine result cannot become an animation destination. Core request decoding uses Effect Schema and the `documentDecode` span at `packages/core/src/domain/flow-node-animation.ts:105`.

`createFlowNodeTransition` at `packages/core/src/domain/flow-node-animation.ts:38` records from/to maps keyed by node ID and retains the result's target revision. `stepFlowNodeTransition` at `packages/core/src/domain/flow-node-animation.ts:56` is pure linear interpolation. Completion returns the exact target, including zero duration and reduced motion. `finishFlowNodeTransition` at `packages/core/src/domain/flow-node-animation.ts:90` returns an explicit finished/cancelled/superseded/disposed result. The transition holds presentation coordinates; `nodeAnimationDocument` at `packages/core/src/domain/flow-node-animation.ts:95` constructs the single semantic destination.

The Effect workflow at `packages/core/src/use-cases/node-animation.ts:19` owns decode, supersession, commit, failure and completion. It receives scheduling and rendering capabilities from the host; it imports no DOM, framework or engine integration. The destination passes through each host's accepted edit/history owner. Frames update only presentation. Removed IDs are filtered, a conflicting accepted position edit cancels delivery, and a later transition rebases on current display. Decode, cancellation, semantic edit and failure use the existing telemetry span/attribute vocabulary. No per-frame log is added. No collector delivery claim is made.

No document schema fields are added. Saved documents and clipboard fragments retain accepted destination positions and opaque data. History records one destination transaction and one additional accepted manual drag; selection, viewport and frame updates remain outside history.

## Production call paths

### Vanilla

The JavaScript controller exposes `animateNodePositions` at `apps/vanilla/src/mount-flow.ts:15701`; its typed contract is at `apps/vanilla/src/mount-flow.ts:1207`. The controller's animator at `apps/vanilla/src/mount-flow.ts:12442` reads current displayed parent-relative coordinates, submits one `set-nodes` edit and supplies browser frame scheduling. Presentation maps enter `captureProjection` at `apps/vanilla/src/mount-flow.ts:3596` and `graphFor` at `apps/vanilla/src/mount-flow.ts:4248`. The same projection drives node wrappers, edge geometry and label positions. The projection dependency check at `apps/vanilla/src/mount-flow.ts:3385` compares the same combined preview/animation positions so current animated edges are not discarded as stale paints.

A draggable node press at `apps/vanilla/src/mount-flow.ts:9661` stops scheduling while retaining the current display as drag origins. An accepted position change releases that held presentation. Destruction disposes the animator and cancels its browser frame. The demo composition is `apps/vanilla/src/node-animation-demo.ts:1`; it uses only public controller commands.

### Vue

`useFlow()` exposes the commands at `packages/vue/src/use-flow.ts:704`; `FlowProvider` delegates them to the mounted canvas at `packages/vue/src/provider.ts:116`. The canvas owns its animator at `packages/vue/src/flow-canvas.ts:5733`. It waits for Vue's accepted edit tick, schedules browser frames and registers scope cleanup. The reactive presentation map at `packages/vue/src/flow-canvas.ts:1748` changes the shared render graph, so node wrappers, edges and labels consume identical interpolated coordinates. Accepted document reads remain unchanged.

Pointer admission at `packages/vue/src/flow-canvas.ts:7010` freezes the displayed node and takes its displayed position as the drag origin. Existing drag preview and completion own subsequent pointer geometry. The demo composition is `apps/vue/src/node-animation-demo.ts:1`; its scope and app unmount own cleanup.

### Foldkit

`createFoldkitNodeAnimationClient` at `packages/foldkit/src/node-animation-client.ts:1` routes commands through `HostAction` and resolves request-keyed responses. The application handles `AnimateNodePositions` at `packages/foldkit/src/application.ts:2396`, captures live positions, supersedes its previous transition, and submits one graph edit. The model owns transition state. `nodeAnimationFrames` at `packages/foldkit/src/application.ts:2210` activates a Runtime animation-frame subscription only while a transition exists. `NodeAnimationFrame` at `packages/foldkit/src/application.ts:3824` applies the shared pure interpolator. `RespondNodeAnimation` at `packages/foldkit/src/application.ts:1201` waits for `Render.afterPaint` before acknowledging completion.

`Graph.selectLiveDocument` at `packages/foldkit/src/graph.ts:2111` overlays presentation independently of accepted state. `selectLiveModel` at `packages/foldkit/src/graph.ts:2951` supplies the shared graph view and geometry. Pointer takeover at `packages/foldkit/src/application.ts:3236` ends scheduling while holding its displayed frame; `nodeDragStart` at `packages/foldkit/src/graph.ts:1671` takes origins from that same frame. A semantic drop clears held presentation. Runtime disposal releases subscriptions; client disposal releases pending requests and its response listener. The demo composition is `apps/foldkit/src/node-animation-demo.ts:1`.

## Test paths and acceptance

Pure/workflow tests are in `packages/core/src/domain/flow-node-animation.test.ts:1`. They assert literal intermediate and final positions, target revision, default duration, invalid input, supersession, reduced motion, removed IDs, held takeover, rejected/failed commits, history and isolation/disposal. Foldkit reducer tests at `packages/foldkit/src/node-animation.test.ts:1` separately inspect accepted and live documents, frame messages and history. They do not claim DOM paint from reducer output.

The shared browser body is `apps/shared/node-animation/acceptance.ts:1`; each host's `node-animation.e2e.ts` invokes the same cases. Public buttons and pointer gestures drive destination changes, pan/zoom, removal, drag, history, clipboard and disposal. Read-only inspection uses the recipe handle backed by public host APIs. DOM samples compare actual wrapper coordinates, SVG endpoints and label centers in the same browser read. Final coordinates are compared with accepted document destinations. These are distinct from pure interpolation assertions.

Acceptance covers intermediate node positions; attached paths and labels; exact final layout; rapid retargeting; removal during animation; transformed viewport; manual takeover and accepted drop; reduced motion; one-step destination history and one-step drag history; clipboard preservation; frame cleanup and clean remount. Focused acceptance passed: six browser cases in each host, 18 total. Each command took and released the browser lock separately with one worker:

- `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/node-animation.e2e.ts --workers=1`
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/node-animation.e2e.ts --workers=1`
- `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/node-animation.e2e.ts --workers=1`
- `scripts/with-flow-browser-lock.sh bun run playwright test --config research/fixtures/node-animation-reference/playwright.config.ts --workers=1`: one public-reference case passed.

Earlier runs found a retained Vanilla position cache overriding animation, and Foldkit demo mount/measurement and accepted-versus-live read boundaries. Those defects were repaired before the passing runs. DOM attachment assertions target the outside face of the actual handle, matching the existing shared anchor contract; centers are not edge endpoints.

`bun install --frozen-lockfile`, `bun run check:architecture`, `bun run typecheck`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, `bun run scripts/check-api-members.ts`, and `bun run scripts/check-proof-matrix.ts` passed during implementation. The final full unit run passed 124 files and 2,773 tests. The animation-specific core and Foldkit reducer suites passed 18 tests, including active-frame saved-session output and controlled proposal context. The final gate is the unchanged focused profile plus `reference-host`, invoked as `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. All preexisting configured checks and browser files remain selected; only this plan's three browser files and active-work description are added. The first final-gate attempt caught a missing `dist/use-cases` entry in the core package file manifest. The manifest now includes the exported workflow declarations. A broader Vanilla run then caught dormant animator cleanup repainting existing renderer owners. The animator now leaves unused instances untouched, and the original production position map remains in use outside animation. The unchanged node-threshold ownership suite and animation suite passed together, 172 tests, after that correction. The terminal report records the final verifier result. This scope is not a `verify:full` claim.

## Conformity and deviations

- **Conforming behavior under comparison:** horizontal/vertical destinations and visible node-position interpolation. The public page describes linear interpolation, and the public demo toggle passes the DOM observation. Flow's edge paths and labels follow its same interpolated geometry in all-host DOM acceptance; the reference demo has no edges, so upstream edge attachment remains unverified.
- **Intentionally different policy:** configurable 300 ms default, immediate reduced-motion completion, explicit cancellation/supersession outcomes, destination-only history and no saved progress implement adopted D5 and Plans 150/153. The public description does not establish those constants or semantics. Their test boundary is Flow's pure workflow and all-host browser acceptance.
- **Unverified:** private Pro implementation, exact reference coordinates, exact duration constants, hidden interruption/reduced-motion/persistence behavior and OpenTelemetry collector delivery. Dynamic Layouting remains partial because unit 6's tree editing and expansion outcomes are outside this implementation.
