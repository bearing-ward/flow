# Foldkit adapter package delivery: current ownership and migration trace

This trace records the WP1 ownership inventory, WP2 extraction of the Foldkit adapter into @flow/foldkit, and bounded WP3 packed-consumer and WP4 HMR evidence. It does not establish publication or registry availability.

## Current production entry and composition

The browser entry is `apps/foldkit/src/main.ts`. It imports the application, graph defaults, observers, UI mounts, and delete client from `@flow/foldkit` (`apps/foldkit/src/main.ts:21-37`), and loads the package stylesheet plus the app-owned playground stylesheet (`apps/foldkit/src/main.ts:40-43`). `packages/foldkit/src/public.ts:1-34` is the package root; `packages/foldkit/package.json:2-26` declares `@flow/foldkit`, Effect/core dependencies, exact Foldkit and browser-platform peers, and the stylesheet export. `apps/foldkit/package.json:2-24` declares the renamed `@flow/foldkit-demo` and direct Foldkit/browser-platform dependencies; workspace declarations do not prove packed-consumer resolution. The entry builds the playground graph fixture and the state, viewport, and interaction panels directly in the app (`apps/foldkit/src/main.ts:44-141`). It keeps custom node and edge renderer callbacks in a local `rendererRegistry` (`apps/foldkit/src/main.ts:165-189`), then calls `createProgram` and embeds the returned Foldkit element in the Runtime (`apps/foldkit/src/main.ts:191-211`). This is the real host composition path; demo graph data, renderer callback values, panels, and app lifecycle stay in the app.

`createProgram` selects a per-instance renderer view, creates the element with the Runtime model schema and typed ports, and aggregates app-level and graph subscriptions (`packages/foldkit/src/application.ts:2461-2515`). Its public configuration includes the initial document and viewport, allowed target IDs, controlled/uncontrolled modes, renderer registry, limits, selection mode, and interaction options (`packages/foldkit/src/application.ts:2463-2474`). The application `ModelSchema` combines the graph child model with viewport animation, limits, lifecycle readiness, accepted revision, and pending deletion state (`packages/foldkit/src/application.ts:568-579`).

## Runtime data and transition path

The child Foldkit `ModelSchema` owns the decoded Flow document and viewport, host interaction options, measured geometry state, and transient pointer/gesture/keyboard sessions (`packages/foldkit/src/graph.ts:179-205`). Its `Message` union contains serializable action and interaction messages, such as document/viewport replacement, command dispatch, node measurement, pointer input, and keyboard resize; it does not store browser event objects (`packages/foldkit/src/graph.ts:294-413`). `OutMessage` carries semantic changes, accepted-state snapshots, edit completion, edit failure, and gesture cancellation (`packages/foldkit/src/graph.ts:276-292`). `Graph.update` reduces graph messages (`packages/foldkit/src/graph.ts:1109-1113`); `Application.update` wraps child transitions, derives lifecycle events, and runs app-level requests (`packages/foldkit/src/application.ts:1622-1642`).

The app-facing schema boundary includes `HostAction`, snapshot/edit requests and results, viewport requests/results/events, and measurement results (`packages/foldkit/src/application.ts:151-261`). `ports` defines typed inbound action/state requests and outbound changes, snapshots, accepted state, edit/delete results, measurements, viewport results/events, and interaction events (`packages/foldkit/src/application.ts:291-314`). The `HostAction.MeasureNode` path reduces the input through the graph update and reports measured, stale, or missing geometry from the resulting Runtime model (`packages/foldkit/src/application.ts:903-955`). Snapshot requests project nodes, edges, measured/internal nodes, initialization, connections, preview, and saved session from that accepted model (`packages/foldkit/src/application.ts:1769-1834`). These host-neutral requests and reducers are reusable Foldkit adapter contracts; the playground's data and request choices are app composition.

Viewport operations have an adapter-owned request facade. `createViewportClient` attaches one listener to the Runtime result port, carries pane metrics into schema-shaped requests, resolves completed requests, and settles outstanding requests as disposed when its owner is disposed (`packages/foldkit/src/application.ts:316-394,405-415,417-466,545-565`). The app supplies the DOM-derived pane dimensions and origin (`apps/foldkit/src/main.ts:216-232`). The client and request schemas belong with the package; the app's choice of pane element and its measurement callback stay in app composition.

## Geometry, DOM, rendering, and lifecycle resources

The graph view builds the core graph and computes which measured or declared nodes are mounted (`packages/foldkit/src/graph.ts:2822-2842`). It passes node/edge/connection-preview renderer callbacks through the typed `FoldkitRendererRegistry` rather than storing functions in the model (`packages/foldkit/src/graph.ts:2256-2285`). The graph subscription maps browser pointer events into serializable messages, does hit-testing and viewport-coordinate conversion at the Foldkit boundary, and scopes pointer-up connection lookup by `instanceId` (`packages/foldkit/src/graph.ts:3308-3320,3307-3346,3348-3434`). The update loop owns the interaction transitions; the renderer owns the Foldkit HTML/SVG view. Both are reusable framework integration and belong in `packages/foldkit`.

`createFlowBackground`, `createFlowMiniMap`, `createFlowControls`, and `mountFlowCanvasUI` construct DOM-owned UI and return disposable mounts (`packages/foldkit/src/ui.ts:57-61,217-235,375-380,475-515`). The MiniMap reads the shared core projection and sends center requests through the viewport client (`packages/foldkit/src/ui.ts:249-255,308-345`). Their generic behavior, option types, and mount/dispose contracts belong in the adapter package. The package stylesheet contains generic MiniMap, controls, panel, viewport, selection, node, handle, edge, resize, and label styles (`packages/foldkit/src/style.css:1-243`). Canvas sizing/skin, playground grid and panels, demo node/edge styling, and interaction-mode classes stay in app CSS (`apps/foldkit/src/playground.css:1-178`).

The playground observes rendered `[data-node-id]` elements with `ResizeObserver` and `MutationObserver`, sends measured sizes through `HostAction.MeasureNode`, and separately updates its MiniMap projection (`apps/foldkit/src/main.ts:372-386,388-451`). The generic rendered-node ResizeObserver/MutationObserver bridge now lives in `createFoldkitNodeMeasurementObserver`; the app provides its owner root and dispatches typed MeasureNode requests while keeping MiniMap cache/reconciliation in composition (`packages/foldkit/src/measurement-observer.ts:1-116`, `apps/foldkit/src/main.ts:390-405`). The selection/key observer and key-press listener implementation are generic owner-scoped resources (`packages/foldkit/src/observers.ts:18-43,49-70,114-129`, `packages/foldkit/src/key-press-observer.ts:81-113,178-195`) and belong in the package. The app's `disposeRuntime` coordinates pagehide cleanup of its mounts, subscriptions, observers, viewport client, pending measurement/edit requests, and delete client (`apps/foldkit/src/main.ts:495-532`); package resources own their individual idempotent `dispose()` methods, while the demo entry remains responsible for composition and page lifecycle.

Deletion uses typed request/approval/result schemas and a host client. The callback options and client API are exported by the package root from `packages/foldkit/src/host-options.ts:1-54`; the client subscribes to approval/results, awaits host approval, sends the typed decision, runs delete callbacks, and settles pending operations on disposal (`packages/foldkit/src/delete-approval.ts:95-131,147-171,252-319,511-537`). These contracts and resource belong in the package, while callback implementations and fallback policy are selected by the app (`apps/foldkit/src/main.ts:199-208`).

## WP1 ownership and migration decision

| Current source/contract | Package ownership | App ownership | Migration boundary |
| --- | --- | --- | --- |
| `graph.ts`: graph `ModelSchema`/`Model`, `Message`, `OutMessage`, update, graph subscriptions, selectors/actions, and renderer registry | Move the Foldkit-specific graph child model, transitions, renderer implementation, and supported renderer/interaction option types into `packages/foldkit`. Keep reducer implementation details and raw child `Model` private to the package. | Supply initial graph data and option values. | Replace app E2E deep imports with package entry APIs and real mounted Runtime interactions. Any remaining reducer-only checks should live as package-owned tests, not create a second public reducer surface. |
| `application.ts`: application model, `HostAction`, snapshot/edit/delete/viewport/measurement schemas, ports, command/update routing, `createProgram`, `createViewportClient` | Move the reusable Foldkit Runtime element, typed host boundary, viewport client, and response schemas into package modules and expose supported contracts from the package root. | Choose initial document, viewport, modes, limits, allowed targets, and pane metrics. | App embeds the package-created Runtime and sends/reads its supported ports. Keep `ModelSchema`, application `update`, and selector implementation private. |
| `delete-approval.ts` and `public.ts`: approval schemas/client and host callback types | Move deletion contracts/client and `FoldkitHostOptions` into package root exports. | Provide `beforeDelete`, delete callbacks, and callback-error policy; preserve the playground's current default auto-approval only in the demo. | Consumer code imports host options/client from `@flow/foldkit`; do not attach app defaults to package behavior. |
| `observers.ts`, `key-press-observer.ts`, measurement observer bridge | Move generic selection/key observers and reusable rendered-node measurement binding with explicit owner/disposal contracts. | Select owner DOM root, initial snapshot, host selectors/target, and application behavior. | Package helpers receive ports/DOM owner values; they do not query `#app`, demo panels, or demo fixtures. |
| `ui.ts` and adapter-owned CSS | Move generic background, controls, MiniMap, mount/update/dispose types, and structural/input styles; `selectFlowMiniMapProjection` stays in `@flow/core`. | Choose placement/options and whether/where to mount UI. | Publish package stylesheet as `@flow/foldkit/style.css`; app imports its own shell stylesheet separately. |
| `main.ts`, app-only CSS, renderer callbacks, demo saved-state envelope and controls | Keep in `apps/foldkit`. | Own all demo graph data, `#app` markup, state/viewport/interaction panels, local save/restore, renderer registry values, demo canvas dimensions/skin, error/status output, pane lookup, and pagehide orchestration. | Rename workspace package from colliding `@flow/foldkit` to `@flow/foldkit-demo`; import adapter via `@flow/foldkit`. |
| Current test harness imports | Package consumer boundary is root import only for app integration tests; package unit tests may import package-local source. | E2E fixtures and Playwright page control remain app-owned. | `apps/foldkit/e2e/test-harness.ts` imports adapter APIs and CSS from `@flow/foldkit` (`apps/foldkit/e2e/test-harness.ts:17-48`) and separately imports app sizing/skin CSS (`apps/foldkit/e2e/test-harness.ts:49`). Do not preserve test-only source access via a package subpath unless WP2 proves a consumer-facing need. |

### Expected names and dependency contract

- Public package: `@flow/foldkit`, sourced from `packages/foldkit`, private `0.0.0` until release decisions in Plan 062.
- Demo workspace: `@flow/foldkit-demo`, sourced from `apps/foldkit`; this mirrors the existing `@flow/vue-demo` naming (`apps/vue/package.json:2`).
- The existing `apps/foldkit/package.json` already claims `@flow/foldkit` (`apps/foldkit/package.json:2`), so the package cannot be introduced until that workspace name changes.
- Current package declarations are `@flow/core` and exact `effect@4.0.0-rc.116` dependencies plus exact peers `foldkit@0.163.0` and `@effect/platform-browser@4.0.0-rc.116`. Keep Effect, core, and Foldkit external in the package bundle. The demo declares Foldkit and browser-platform directly; clean packed-consumer peer resolution remains WP3 evidence, not established here.
- Foldkit 0.163.0 has exact `effect` and `@effect/platform-browser` 4.0.0-rc.116 peers (`node_modules/foldkit/package.json:163-171`). `packages/foldkit` declares both Foldkit and browser-platform peers, and the demo directly declares both (`packages/foldkit/package.json:23-26`, `apps/foldkit/package.json:14-22`). The browser-platform dependency is required by Foldkit even though app source does not import it by name.

### Migration examples

Current app code reaches through source files (`apps/foldkit/src/main.ts:24-42`):

```ts
import {
  createProgram,
  createViewportClient,
  HostAction,
} from './application.ts'
import * as Graph from './graph.ts'
import { createFoldkitObservers } from './observers.ts'
import { createFlowMiniMap, mountFlowCanvasUI } from './ui.ts'
```

After WP2, supported adapter imports use the package specifier. The graph fixture and renderer callback values stay in the app:

```ts
import {
  createProgram,
  createViewportClient,
  HostAction,
  createFoldkitObservers,
  createFlowMiniMap,
  mountFlowCanvasUI,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type {
  FoldkitPorts,
  FoldkitInteractionOptions,
  FoldkitRendererRegistry,
  FoldkitHostOptions,
} from '@flow/foldkit'

import '@flow/foldkit/style.css'
import './playground.css'
```

The corresponding workspace manifests keep the public package and runnable app distinct:

```json
// packages/foldkit/package.json
{ "name": "@flow/foldkit", "version": "0.0.0", "private": true }

// apps/foldkit/package.json
{ "name": "@flow/foldkit-demo", "dependencies": { "@flow/foldkit": "workspace:*" } }
```

These are the implemented WP2 import/manifest shapes. The moved code builds from the package root, and app/E2E callers use that root; archive installation and packed-consumer behavior remain WP3 evidence.

## Test boundary

Production paths expose the package root and declared style entry: `@flow/vanilla` (`apps/vanilla/package.json:2-26`), `@flow/vue` (`packages/vue/package.json:2-26`), and `@flow/foldkit` (`packages/foldkit/package.json:2-27`). The workspace E2E harness still imports Foldkit APIs/style through `@flow/foldkit` and loads app-owned sizing/skin CSS separately (`apps/foldkit/e2e/test-harness.ts:17-49`); that workspace E2E is distinct from tarball evidence.

WP3's production consumer fixtures are copied into three independent temporary roots by `scripts/check-packed-consumer.ts:243-279`; each installs only archives, imports `@flow/core` in a non-DOM Bun process, checks public peer resolution, typechecks copied public imports, and serves with Vite file access limited to that consumer root (`scripts/check-packed-consumer.ts:99-130,272-279`). The pack command supplies archive names at runtime (`scripts/check-packed-consumer.ts:82-97,233-241`). The Vanilla fixture mounts and edits a packed controller (`tests/consumer/main.ts:38-92`); Vue uses two canvases and controlled proposal/owner acknowledgement (`tests/consumer/vue/main.ts:65-104`); Foldkit uses package `createProgram`, public Runtime ports, and two separately rendered Runtime instances (`tests/consumer/foldkit/main.ts:39-68`). Its measurement path constructs the exported owner-scoped observer, forwards measured geometry through public `HostAction.MeasureNode`, and disposes it (`tests/consumer/foldkit/main.ts:96-151`). The browser assertions verify both Runtime roots, positive measured bounds, `fitView`, accepted editing without state leakage to Runtime B, stylesheet, and disposal (`scripts/check-packed-consumer.ts:174-230`). CSS imports are exercised by all fixtures (`tests/consumer/main.ts:21`, `tests/consumer/vue/main.ts:8`, `tests/consumer/foldkit/main.ts:5`).

`bun run test:consumer` passed after packing `flow-core-0.0.0.tgz`, `flow-vanilla-0.0.0.tgz`, `flow-vue-0.0.0.tgz`, and `flow-foldkit-0.0.0.tgz`. Each host passed archive install, non-DOM core import, public typecheck, browser behavior, stylesheet, and disposal assertions. Peer checks confirmed one root and the expected version for Vanilla Effect 4.0.0-rc.116; Vue Effect 4.0.0-rc.116 and Vue 3.5.43; Foldkit Effect 4.0.0-rc.116, Foldkit 0.163.0, and `@effect/platform-browser` 4.0.0-rc.116. Consumers use file dependencies and an archive-only `@flow/core` override because the packages are private and unpublished; they do not use workspace aliases or source imports. The focused WP4 cold-start/HMR probe and WP5a release dry-run have since passed; see their separate evidence below and in Plan 061.

### WP4 packed HMR cold-start and reload

The first probe failed before mount because the plugin transforms/brands optimized `foldkit_brand` outside `node_modules`, while the fixture placed Vite caches in external `.vite-hmr-*` directories. The follow-up uses `node_modules/.vite-hmr-enabled` and `node_modules/.vite-hmr-disabled`, plus a persistent `#canvas` and a selected Runtime child to account for Foldkit replacing mount-host attributes and the plugin's Runtime identity requirement. The assertions were unchanged. The successful run in `/tmp/flow-foldkit-hmr-cache-and-mount-fix.log` passed cold start, one full reload, WebSocket preserve/request/restore, semantic state restoration, Runtime replacement, and plugin-absent warning with normal initial-state boot. An independent review approved the resolution. `/tmp/flow-foldkit-hmr-transform-diagnostic.log` records the optimized `foldkit_brand` transform location used in the diagnosis. This supersedes the earlier cold-start failure for the bounded probe; it does not claim published-package or full-repository verification.

The earlier packed Foldkit Chromium `page.goto` stall later completed on a resumed independent run: `DEBUG=pw:api,pw:browser FLOW_CONSUMER_HOST=foldkit bun run scripts/check-packed-consumer.ts` exited 0 and confirmed install, peer resolution, typecheck, stylesheet, browser behavior, and disposal. The stall did not reproduce. Do not attribute this recovery to the HMR cache fix: the packed consumer does not load the HMR plugin. The later repository-wide verify checkpoint passed on its recorded source snapshot; a fresh final run after the current packed UI type/API repair remains pending.

The bounded packed UI runtime smoke extends the Foldkit archive fixture to import package UI factories and render them through the archive consumer. In `/tmp/flow-packed-ui-runtime-2.log`, Vanilla and Vue passed; Foldkit reached Chromium but its pointer action was covered by the Runtime viewport, so that all-host invocation failed at the Foldkit browser assertion without force-click. The focused retry `/tmp/flow-packed-ui-runtime-foldkit-3.log` passed Foldkit's install, peer, typecheck, styles, browser, and disposal checks after correcting the fixture's owned-panel stacking; review of that latest stacking fix is pending. This remains partial evidence until the combined all-host consumer, release dry-run, and final full verify run on the same stable snapshot.

### Final installed-archive UI and common-gate evidence (2026-09-30)

The final `bun run release:dry-run` exited 0 in `/tmp/flow-release-wrap-final-2.log`; final `bun run verify` session 68756 exited 0 in `/tmp/flow-verify-wrap-final-3.log`. Both exercised all three installed native archive consumers. This supersedes the earlier partial UI smoke and pending-review record above. Independent review approved the fixture/consumer repairs and bounded Plan 061 closure. Four archives remain private `0.0.0`; release licensing, publication, and registry availability remain open.

The consumer uses actual native entry files and public imports. Vanilla imports its helpers and stylesheet from the archive (`tests/consumer/main.ts:19-34`), constructs app-owned UI (`tests/consumer/main.ts:243-305`), mounts controlled and independent canvases with public custom rendering (`tests/consumer/main.ts:307-368`), and exercises owner acknowledgement, public measurement, fit state, rendered viewport serialization, and exact renderer output (`tests/consumer/main.ts:371-451`). It destroys helpers/controllers and removes roots (`tests/consumer/main.ts:454-464`). The browser independently checks actions, visible output, custom-renderer DOM, and cleanup (`scripts/check-packed-consumer.ts:98-145,148-202`). The transform comparison uses browser-canonical CSS serialization; the log records raw numeric precision versus the actual canonical text without weakening accepted-state or rendered-data assertions.

Vue renders native public UI inside its consumer canvas (`tests/consumer/vue/main.ts:65-180`), mounts a controlled second instance with owner acknowledgement (`tests/consumer/vue/main.ts:197-233`), and exposes app unmount (`tests/consumer/vue/main.ts:237-239`). Foldkit constructs its public native UI, drives real callbacks/disclosure/tooltip output, and scopes cleanup with its Runtime resources (`tests/consumer/foldkit/main.ts:298-350`). The shared browser probe uses real pointer actions and observes callback/output state (`scripts/check-packed-consumer.ts:98-145`); the Foldkit panel is intentionally above the Runtime viewport (`tests/consumer/foldkit/main.ts:302`). These smoke cases prove tested public archive behavior; they do not cover complete recipe option matrices or React runtime parity. The separate successful HMR probe remains development-reload evidence.

## Conformity and deviations

- **Conforming:** the extracted boundary follows `docs/standards.md`: Flow graph meaning remains in `@flow/core`; Foldkit Model/Message/Update/view, typed ports, renderers, and owner-scoped browser resources belong in the framework adapter package; the app retains demo composition and data. Current public exports pass installed-archive native consumer checks and the final full verifier.
- **Intentionally different:** Foldkit keeps its native typed Model/Message/Update and Runtime-port interface. Each host uses its native consumer composition and resource lifecycle. Foldkit's app-owned UI panel sits above the Runtime viewport so the native pointer action can reach it.
- **Unverified:** release licensing/completion, publication, registry availability, complete UI recipe option matrices, external devices, and React runtime/output comparison remain open. The packed consumers and separate HMR probe establish only their tested local snapshots and bounded actions; no parity claim is made.
