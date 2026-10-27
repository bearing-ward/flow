# Server image creation

Plan 165 implements D13 as an optional Playwright Chromium image service. The server returns PNG bytes from Vanilla, Vue or Foldkit's actual renderer. The live client supplies a detached document and explicit geometry; the backend mounts another real host in an isolated Chromium context. This is browser image rendering. Universal SSR and DOM-free static HTML remain outside this contract.

## Export request

`FlowImageExportRequestSchema` is the Effect Schema boundary. Version 1 contains:

| Field | Contract |
| --- | --- |
| `version` | Literal `1`. |
| `host` | `vanilla`, `vue` or `foldkit`. The service chooses a configured origin. |
| `revision` | 1 to 128 ASCII letters, digits, dots, underscores, colons or hyphens. Returned as `X-Flow-Revision`. |
| `width`, `height` | Integer CSS pixels, 64 through 4096. Device scale is 1. Output has exactly these PNG dimensions. |
| `scene.document` | The current Flow document, including parent/group membership, tree data, shape data, manual routes, node rotation, and wire-tie bundles. Opaque JSON data remains attached. |
| `scene.measurements` | An array of node IDs, positive width/height and explicit handle boxes with node ID, handle ID, graph-space offset, width and height. Every visible node and declared handle needs geometry. Hidden or collapsed nodes need no measurements. |
| `scene.edgeRouting` | A routing result or `null`. Only a result matching the supplied scene revision can render. Capture preserves its interior waypoints and adapts endpoint anchors and the routing revision to native CSS measurement precision; stale routes remain rejected. Manual routes and bundle ties remain document-owned. |
| `framing` | `{ kind: 'fit', padding }`, with padding 0 through 0.4 using Flow's existing viewport fitting semantics, or `{ kind: 'viewport', x, y, zoom }`, with finite coordinates and zoom 0.01 through 10. Fit uses visible node bounds. Use an explicit viewport when routes extend outside those bounds. |
| `assets` | Relative approved capture-asset filenames. Each must load successfully. Paths, external URLs and traversal are rejected. |

`prepareFlowImageExport(unknown)` decodes the contract, checks document integrity and geometry ownership, detaches the revision and calculates the viewport. The original input can change after preparation without changing the render. Export is read-only and creates no history entry. Existing public edit APIs still commit one transaction as one undo step.

`POST /render` returns `image/png`, `Cache-Control: no-store` and `X-Flow-Revision`. Invalid requests and unsupported renderers return 400; asset or renderer failures return 502; deadlines return 504. Error bodies have `error` and `message`. `GET /health` reports readiness and active request contexts. Effect callers receive `FlowImageExportFailure` with `invalid-request`, `unsupported-renderer`, `asset`, `timeout`, `render` or `unavailable` reasons. Fiber interruption handles cancellation separately.

The preview snapshots before awaiting the server. Accepted graph changes, including gestures, invalidate the revision and abort pending work. Revision and request sequence must both match before publishing image bytes. Disposal aborts requests, releases framework resources and revokes the previous image URL.

## Public host APIs

All three adapters export request constructors without a service or Playwright dependency. They accept `FlowImageExportOptions`, which contains `revision`, `width`, `height`, `framing`, `assets` and `edgeRouting`. Request data is plain serializable JSON and can be sent with any HTTP client.

| Host | Public API | Ownership |
| --- | --- | --- |
| Vanilla | `createVanillaImageExportRequest(controller, options)` | Synchronously reads the JavaScript controller's detached object and internal nodes. |
| Vue | `useFlowImageExport()` | Returns an options-to-request function for the injected Flow editor. Call the composable in setup. |
| Foldkit | `createFoldkitImageExportRequest(instance, options)` | Asynchronously queries the public Runtime instance and snapshots its object and measured nodes. A concurrent semantic change rejects the read so the caller can request a fresh snapshot. |
| Shared core | `createFlowImageExportRequest(object, internals, host, options)` | Decodes and detaches the export request; owns no browser or server resource. |

The demo and capture route are `/image-service/` in each app. The server uses `?capture=1`, which exposes `flowImageHost.render(unknown)`. This application RPC mounts the same adapter and registered renderers as the side-by-side live graph. It waits for the bundled font, approved assets, mounted visible nodes, measured node/handle publication and subsequent render frames before reporting readiness. `flowImageDemo` is the demo control/acceptance API, not a published adapter API.

## Supported renderers and assets

The initial service composition supports built-in/default nodes, group nodes, the public shape renderer for circles, diamonds and hexagons, and the `export-card` custom HTML renderer independently registered in each framework. It supports each host's built-in edge paths, labels, markers, manual routes, generated routing results and wire-tie bundles. Unknown custom node or edge types fail explicitly rather than silently falling back. Applications can add approved renderers to their own capture composition and update its allowlist and acceptance tests together.

The font is the unmodified IBM Plex Sans variable font, bundled as `FlowSans.ttf`, under SIL OFL 1.1 with its licence file. The SVG Flow mark is a local asset. Each Vite public directory links to the single shared asset source; production builds copy those bytes. Chromium has no permission to request another origin; missing resources fail capture. Arbitrary external fonts, remote images, user scripts and other custom renderers are outside the initial supported scope. Platform font fallback glyphs outside the bundled font's coverage are unverified.

## Packaging and verification

The [optional package README](../packages/image-service/README.md) documents local startup, container build, port mapping and shutdown. The optional package also ships a compiled `flow-image-service` Bun command, with core as a peer and Playwright/Effect as runtime dependencies. A clean tarball consumer imports it without the test runner. The container's production install explicitly excludes `@playwright/test`, Vite and the framework source packages. Host scripts and styles are already built. Playwright is a pinned runtime dependency of the optional package, Apache-2.0. The [dependency record](dependencies.md#plan-165-optional-image-service) records alternatives and removal boundaries.

The live/server pixel comparison permits at most 40 pixels with a channel difference above 32 and mean channel error below 0.02 on an 800 by 500 image. It accommodates native layout fractions across capture origins. Repeated server PNGs must be byte-identical.

The shared server-image acceptance suite runs against a real Bun backend for each host. It checks a bounded pixel comparison with the live renderer capture, repeated readiness, graph content and colored pixels, groups/tree data/shapes/manual routes/bundles, exact output dimensions, explicit viewport, hidden/collapsed nodes, editing and refresh, single-step undo/redo, stale responses, invalid inputs, unsupported renderers, missing assets, timeout, cancellation and context cleanup. A separate Docker check builds on the same request fixture and captures all three production host builds twice before stopping the container. See [the source trace and results](../research/traces/server-image-service.md).

## Conformity and deviations

D13 intentionally uses Chromium and each host's real rendering lifecycle. The Pro catalog's C rating means the image-service outcome is achievable in all three hosts within the supported renderer scope. Exact rendering equality with the upstream Puppeteer example, private Pro source, universal SSR, static HTML and collector-side OpenTelemetry delivery remain unverified. The acceptance boundary is the real service, the three local host renderers and the built container.
