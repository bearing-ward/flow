# Server image service

Plan 165 implements unit 13 and maintainer D13 from `plans/149-pro-delivery.md`, using the Plan 165 instructions at commit b5059ce. The service is a separately packaged Playwright Chromium integration. No imported research artifact changed.

## Evidence and design boundary

The [public Pro example](https://reactflow.dev/examples/misc/server-side-image-creation), accessed 2026-10-26, describes backend image creation and a live graph beside the server image. Its public dependency list names Puppeteer. Private subscription source was not accessed. D13 selects Playwright Chromium for Flow. The [Playwright screenshot documentation](https://playwright.dev/docs/screenshots) describes returning image buffers, and the [Docker documentation](https://playwright.dev/docs/docker) separates installed browser binaries/system dependencies from the Playwright package.

Two designs were considered: one generic SVG renderer, or dedicated routes that mount the supported adapters. The dedicated routes preserve real custom HTML, framework rendering and the current shape/route/bundle implementations. A generic SVG renderer would require a second renderer with a narrower content contract. The chosen design keeps the document/geometry contract in core, optional server resources in `packages/image-service`, and capture/preview lifecycle in the apps. Supported renderer/font/asset scope and the runtime-dependency decision are recorded in [the contract](../../docs/server-image-service.md).

## Public export call path

Vanilla starts at `createVanillaImageExportRequest` in `apps/vanilla/src/image-export.ts:6`, reading the public controller object and internal nodes. Vue starts at `useFlowImageExport` in `packages/vue/src/image-export.ts:6`, resolving the injected editor during setup. Foldkit starts at `createFoldkitImageExportRequest` in `packages/foldkit/src/image-export.ts:6`, querying the public Runtime instance. These APIs share `createFlowImageExportRequest` in `packages/core/src/domain/flow-image-request.ts:20`. It compares document and measured-node ownership, rejects a changed read, then decodes and detaches the request. None of these modules imports the optional service.

The request and export scene schemas start at `packages/core/src/domain/flow-image-export.ts:16` and `packages/core/src/domain/flow-image-export.ts:24`. The decoder at `packages/core/src/domain/flow-image-export.ts:74` checks graph integrity, explicit visible node/handle geometry and finite coordinates, preserves the full document extensions, snapshots the request revision, sizes nodes and computes fit or explicit viewport. No document edit occurs during export. Selection and DOM measurement publication are excluded from the preview's semantic identity at `packages/core/src/domain/flow-image-export.ts:223`.

## Production server and browser call path

`serveFlowImages` in `packages/image-service/src/public.ts:277` receives HTTP JSON as unknown and passes it to the shared decoder. `createFlowImageService` in `packages/image-service/src/public.ts:53` validates configured capture origins, acquires Chromium, limits concurrent requests and gives each render an isolated Effect-scoped context. Requests select a host name, never an arbitrary URL. The browser blocks requests to other origins, treats failed assets as errors, loads `/image-service/?capture=1`, waits for the route RPC, sends the frozen request, and obtains PNG bytes with `page.screenshot`. The response carries the same revision. Each context closes on success, failure, timeout or interruption; the enclosing scope closes Chromium. Bun listener ownership and SIGTERM/SIGINT are application composition in the optional service entry points.

The browser RPC is installed in `apps/shared/image-service/bridge.ts:87`. It decodes again at the browser boundary, loads the bundled approved assets and font, mounts the selected real adapter, waits for mounted visible nodes, applies explicit handle offsets, invokes the host's public geometry refresh path and waits for measured publication and rendering frames. Parent-relative positions, group membership, derived collapsed visibility and hidden nodes stay owned by `createFlowGraph` in `packages/core/src/domain/flow-graph.ts:78`.

- Vanilla mounts `createFlow` and the real shape/custom-card registry in `apps/vanilla/src/image-service-demo.ts:13`. It uses the controller's node measurement refresh, state subscription and transaction history. The public shape renderer is `apps/vanilla/src/shape-node.ts:36`.
- Vue mounts `FlowProvider` and `FlowCanvas` in `apps/vue/src/image-service-demo.ts:39`, with real `FlowFigureNode` and Vue card components. Its editor owns document updates and history; `nextTick` and `updateNodeInternals` own geometry publication. The actual node renderer is `packages/vue/src/flow-canvas.ts:9588`, and the public shape component is `packages/vue/src/shape-node.ts:7`.
- Foldkit embeds `createProgram` in `apps/foldkit/src/image-service-demo.ts:24`. Its real registry uses `foldkitFigureNodeRenderer` and Foldkit HTML. The node observer publishes `HostAction.MeasureNodes` at `apps/foldkit/src/image-service-demo.ts:63`; accepted-state ports invalidate previews. The public shape renderer is `packages/foldkit/src/shape-node.ts:7`.

Vanilla reaches `getAutomaticRouteGeometry` through `apps/vanilla/src/edge-renderer.ts:737`; Vue reaches it at `packages/vue/src/flow-canvas.ts:1863`; Foldkit reaches it at `packages/foldkit/src/graph.ts:5583`. Those paths use `packages/core/src/domain/flow-routing-geometry.ts:66`, `packages/core/src/domain/flow-route-geometry.ts:5` and `packages/core/src/domain/flow-bundle-geometry.ts:256`. The capture projection at `packages/core/src/domain/flow-image-routing.ts:12` accepts only a result current for the supplied scene, preserves interior points and updates endpoint anchors/revision for measured native CSS fractions. Unit tests prove it cannot promote stale routing. The hosts retain their existing core edge geometry: manually authored routes, current revision-checked generated routing, and bundle ties. The service never substitutes a simplified SVG graph. Rendering remains framework-owned; the image operation changes neither documents nor undo stacks. The live edit button uses one ordinary transaction and acceptance checks undo/redo as one history step.

The preview path starts at `apps/shared/image-service/bridge.ts:230`. It snapshots the requested revision before HTTP work and guards publication by revision plus request sequence. Accepted document changes invalidate pending responses, including ordinary graph gestures. Disposal aborts the request, revokes image URLs, unsubscribes and destroys the adapter/Runtime.

## Test and deployment paths

Development browser acceptance is separate from production container serving. The three `apps/*/e2e/server-image.e2e.ts` files call `imageServiceAcceptance` in `apps/shared/image-service/acceptance.ts:143`. Playwright's existing web-server configs start the relevant real Vite host. Each test separately starts the actual optional Bun backend, invokes HTTP rendering and stops the backend in `finally`.

The test fixture contains groups, versioned tree expansion data, an approved custom card with an image/font, a shape, a manual route, two bundled edges and hidden content. Assertions compare live/server pixels with at most 40 pixels above channel difference 32 and mean channel error below 0.02, and require byte-identical repeated server captures, inspect content pixels and exact PNG dimensions, and prove edit/refresh/undo/redo, stale preview rejection, invalid input, unsupported renderers, missing assets, timeout, cancellation and zero retained contexts. The pure boundary tests live in `packages/core/src/domain/flow-image-export.test.ts:1`.

The Dockerfile builds the actual app routes and uses a production-only dependency install. `packages/image-service/src/container.ts:1` serves built host assets directly, independently of Vite. `scripts/check-image-service-container.ts` owns container startup and shutdown and invokes the real production service for all three hosts twice, checks PNG dimensions/repeatability, checks zero retained contexts and confirms the runtime imports Playwright without `@playwright/test`.

## Verification results

The focused profile retains every previous check and browser file and adds `server-image.e2e.ts` for all three hosts. No default or previous scope was narrowed. Results before the final gate:

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed. The new optional workspace was added to the lockfile with `bun install`. |
| `bun run build:packages` | Passed, including the optional service library and compiled Bun CLI. |
| `bun run check` | Passed formatting and lint. |
| `bun run check:architecture` | Passed source/manifest isolation and fixtures. |
| `bun run tsc --noEmit` | Passed. |
| `bun run test` | 2,835 tests passed across 132 files, including seven image boundary/routing tests. |
| `bun run docs:check` | Passed generated API, local links, source snippets and 32 documentation files. |
| `bun run research:check-traces` | Passed source citations and required conformity sections. |
| `scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/server-image.e2e.ts --workers=1` | Five acceptance cases passed. |
| `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts server-image.e2e.ts --workers=1` | Five acceptance cases passed. |
| `scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts server-image.e2e.ts --workers=1` | Five acceptance cases passed. |
| `docker build -f packages/image-service/Dockerfile -t flow-image-service:plan165 .` | Passed with all host production builds. |
| `scripts/with-flow-browser-lock.sh bun run scripts/check-image-service-container.ts` | Startup, all host PNGs, repeated capture equality, zero retained contexts, production-only runtime import and container shutdown passed. |
| `bun pm --cwd packages/core pack --destination /tmp/plan165/packed --quiet` and the equivalent service pack | Both tarballs created. A clean production-only consumer imports the optional package without `@playwright/test`; the unpublished core tarball uses the same explicit local override as existing packed consumers. |

Samples are `/tmp/plan165/vanilla.png`, `/tmp/plan165/vue.png` and `/tmp/plan165/foldkit.png`; production container captures use corresponding `-container.png` names. The images contain the custom card/font/asset, shape, route and wire-tie edges. Capture resources and containers were released after each command.

Initial acceptance runs exposed the fetch-blocked default port 4190, Vanilla's undefined-only routing reset, Foldkit's replacement of its mount container, host-specific canvas sizing, and native geometry precision affecting generated-route validity. These were fixed in the service/app composition and new export modules. The final local service port is 4191. No existing shared renderer or collaboration module was changed.

The catalog entry is C in Vanilla, Vue and Foldkit with a Plan 165 reaudit. Counts are recomputed from entries: 194/195 in-scope entries are C across all hosts, and 15/16 Pro entries are C for each host. Collaboration remains outside this plan's closure.

The final gate is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`, with its full output at `/tmp/plan165/verify.log` and result in the final handback. This is the focused additive profile, not `verify:full`, and does not establish full-suite acceptance.

## Conformity and deviations

The chosen architecture conforms to maintainer D13: an optional Chromium service returns backend image bytes using the real Vanilla, Vue and Foldkit renderers. Its outcome is intentionally different from an upstream React/Puppeteer implementation because Flow supports these three hosts and reuses the already installed browser automation family. Supported renderers, the bundled font and local assets have an explicit contract. Exact upstream pixel equality, private Pro implementation details, arbitrary custom renderers, universal SSR, DOM-free static HTML and collector-side OpenTelemetry delivery remain unverified. Catalog C is an achievable image-service outcome rating within the named acceptance tests, not an upstream pixel or static-HTML parity claim.
