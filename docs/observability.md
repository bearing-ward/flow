# Flow observability

Flow uses Effect tracing and structured logging at domain and lifecycle boundaries. Application composition can export logs, metrics, and traces through OTLP without changing graph workflows.

## Current instrumentation

The current slice creates these spans:

| Span | Boundary |
| --- | --- |
| `flow.app.start` | Demo application startup |
| `flow.document.decode` | Unknown input to `FlowDocument` |
| `flow.document.integrity` | Cross-record identifier and endpoint validation |
| `flow.connection.validate` | Proposed endpoint and duplicate-pair validation |
| `flow.connection.start` | Accepted source-handle pointer gesture |
| `flow.connection.complete` | Published edge-add semantic change |
| `flow.edge.selection` | Published edge-selection semantic change |
| `flow.node.selection` | Published node-selection semantic change |
| `flow.selection.set` | Published multi-element selection change |
| `flow.selection.rect.start` | Accepted Shift rectangle gesture |
| `flow.edge.remove` | Accepted edge removal semantic change |
| `flow.edge.reconnect.start` | Accepted selected-edge endpoint gesture |
| `flow.edge.reconnect.complete` | Validated endpoint replacement and semantic change |
| `flow.host.mount` | Plain-DOM host creation |
| `flow.interactivity.change` | Runtime `nodesDraggable`, `nodesConnectable` or `elementsSelectable` change |
| `flow.geometry.measure` | One `ResizeObserver` delivery |
| `flow.node.drag.start` | Accepted pointer drag |
| `flow.node.drag.complete` | Final semantic position change |
| `flow.host.destroy` | Listener, observer, and DOM cleanup |
| `flow.controller.update` | Caller document adoption |
| `flow.controller.dispatch` | Schema-decoded command dispatch |
| `flow.dom.reconcile` | Keyed node and edge add, update, reorder, and removal |
| `flow.gesture.cancel` | Pointer cancellation, active-node removal, or host teardown |
| `flow.viewport.pan.start` | Accepted primary-pointer pane pan |
| `flow.viewport.pan.complete` | Final semantic viewport translation |
| `flow.viewport.zoom` | Cursor-anchored wheel zoom and limit result |
| `flow.viewport.update` | Caller-supplied authoritative viewport adoption |
| `flow.browser.resize-observer.acquire` | Browser resize capability acquisition |
| `flow.browser.pointer-capture` | Pointer capture or release attempt |
| `flow.browser.lifecycle.close` | Scoped browser resource cleanup |

`packages/core/src/telemetry/flow-telemetry.ts` owns span names and custom attributes. Use these attributes on both spans and related logs:

- `flow.node.id` and `flow.node.selected`
- `flow.node.count`
- `flow.edge.count`
- `flow.edge.id`, `flow.edge.endpoint`, and `flow.edge.selected`
- `flow.document.issue`
- `flow.handle.id` and `flow.connection.issue`
- `flow.connection.target.node.id` and `flow.connection.target.handle.id`
- `flow.pointer.id`
- `flow.position.x` and `flow.position.y`
- `flow.viewport.x`, `flow.viewport.y`, and `flow.viewport.zoom`
- `flow.measurement.count`
- `flow.control.mode`
- `flow.nodes.added`, `flow.nodes.updated`, and `flow.nodes.removed`
- `flow.edges.added`, `flow.edges.updated`, `flow.edges.removed`, and `flow.edges.deferred`
- `flow.cancellation.reason`
- `flow.change.kind` and `flow.input.kind`
- `flow.interactivity.nodes-draggable`, `flow.interactivity.nodes-connectable`, and `flow.interactivity.elements-selectable`
- `flow.viewport.zoom.clamped`
- `flow.browser.capability` and `flow.browser.operation`

Do not record node labels, custom node data, pointer coordinates, document payloads, or user-provided values by default. Add a bounded diagnostic attribute only when it answers a specific debugging question.

## OTLP configuration

The vanilla application configures Effect's release-matched `Otlp.layerJson` at its composition boundary. Export remains disabled unless `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is present. Effect appends `/v1/logs`, `/v1/metrics`, and `/v1/traces` to the configured base URL.

Configure the browser runtime with Vite-prefixed variables in the workspace `.env.local`:

```sh
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
VITE_OTEL_SERVICE_NAME=flow-vanilla
VITE_OTEL_SERVICE_VERSION=0.0.0
```

The browser variables are:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` | Yes, to enable export | None | OTLP HTTP base URL without a signal suffix |
| `VITE_OTEL_SERVICE_NAME` | No | `flow-vanilla` | `service.name` resource value |
| `VITE_OTEL_SERVICE_VERSION` | No | Omitted | `service.version` resource value |
| `VITE_OTEL_EXPORT_INTERVAL_MS` | No | `1000` | Batch interval for logs, metrics, and traces |

The Vite configuration accepts `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, and `OTEL_SERVICE_VERSION` as fallbacks. New browser configuration uses the `VITE_OTEL_*` convention.

The endpoint must be safe to disclose to browser clients and must accept cross-origin requests from the application origin. Configure a server-side collector or proxy when export needs authentication. Vite does not expose `OTEL_EXPORTER_OTLP_HEADERS` or per-signal `OTEL_*` settings. The repository ignores `.env.local` and `.env.*.local` so local collector configuration cannot enter version control.

Do not add `/v1/traces`, `/v1/logs`, or `/v1/metrics` to the base endpoint. `Otlp.layerJson` adds those paths. A signal-specific URL would produce a duplicated path.

## Runtime and shutdown

`makeBrowserApplicationLayer` combines the OTLP layer with `FlowBrowserLive`. The application owns one `ManagedRuntime`. DOM callbacks run telemetry through that runtime. `beforeunload` destroys the host and disposes the runtime so pending OTLP batches can flush.

Without an endpoint, the runtime keeps structured console logging and trace-correlated diagnostic logging active. Browser capability failures record bounded capability and operation names. They do not record DOM exceptions, graph payloads, or user data.

## Verification boundaries

The Playwright server sets `OTEL_SDK_DISABLED=true` so the normal browser suite does not send test traffic to a developer's collector. The dedicated OTLP test supplies an intercepted endpoint.

Application composition owns the exporter, transport, resource attributes, sampling, and shutdown flush. The core package owns span names and bounded attributes.

The transport test verifies JSON trace payloads, log payloads, expected span names, document-integrity failure tags, and log trace and span correlation identifiers. It proves browser serialization, HTTP requests, and shutdown flush to an OTLP-compatible receiver. Connection spans and logs run in browser tests, but their remote export is not asserted by that transport test.

The configured live receiver has returned HTTP 200 for browser logs, metrics, and traces. That response proves receipt at the configured HTTP boundary. It does not prove collector processing, storage, retention, sampling, or query results.

The controller conformance tests exercise the instrumentation boundaries indirectly through real browser workflows. They prove that instrumented code runs without changing behavior. The OTLP transport test is separate so local behavior and remote-delivery claims stay distinct.

## Debugging export

Check these conditions when telemetry does not arrive:

1. Confirm that the base endpoint does not end in a signal path.
2. Confirm that the collector allows the application's origin and the `POST` content type.
3. Check the browser network panel for `/v1/logs`, `/v1/metrics`, and `/v1/traces` responses.
4. Dispose the runtime before judging short sessions. Exporters flush buffered records during shutdown.
5. Search logs by `traceId` and `spanId`, then inspect the matching `flow.*` spans.

Use `flow.document.issue`, `flow.node.id`, `flow.edge.id`, `flow.change.kind`, `flow.input.kind`, and the viewport attributes to narrow a behavior. Do not add labels, graph payloads, or pointer coordinates as ad hoc debugging attributes.

Viewport culling can reconcile DOM during every pointer move. The host suppresses reconcile spans and logs on that high-frequency path; semantic viewport changes and node selection remain bounded workflow events.

Selection spans record only bounded node and edge counts. The host does not log rectangle pointer movement, coordinates, or selected document payloads.

## Local collector delivery gate

Run `bun run test:collector` with a running Docker daemon and the Playwright Chromium installation. This explicit external-service command stays outside ordinary `bun run verify` and currently has no hosted CI job. It pulls OpenTelemetry Collector Contrib 0.123.0 pinned to digest `sha256:e39311df1f3d941923c00da79ac7ba6269124a870ee87e3c3ad24d60f8aee4d2`, binds random loopback ports, and starts an isolated OTLP HTTP receiver, batch processor, and separate trace/log file exporters.

The harness calls Vanilla's actual `makeBrowserRuntime`, core document decoder, and public `createFlowHost`/`applyEdit`/`update`/`destroyAsync` APIs. It dispatches DOM pointer events through the production node listeners to cancel an active gesture. The exporter interval is one hour: the short run must flush through runtime disposal. A unique `service.name` identifies the run without recording graph payloads. Queries decode the collector's retained JSON lines, filter by that resource, and require decode, integrity rejection, mount, document edit, cancellation, and destroy spans. Related logs must match retained trace/span IDs and expected messages. The destroy log belongs to `flow.browser.lifecycle.close`; its retained span must be the exact child of the retained `flow.host.destroy` in the same trace. Integrity issue and cancellation reason attributes are asserted. After successful queries, the collector stops and queries run again against retained records.

The script prints its temporary evidence directory. It preserves `collector.yaml`, `traces.jsonl`, `logs.jsonl`, `collector.log`, `cleanup.json`, and `report.json` (or `failure.json`), while removing the container and closing Vite/Chromium. The file exporter and structured query establish local processing, persistence, and retrieval. They do not establish a production observability backend, retention over time, sampling policies, dashboards, or delivery from Vue/Foldkit: those hosts do not yet have an equivalent exporter composition. Pointer dispatch establishes the production cancellation listener path, not trusted native-device input.

`bun run test:collector:stopped` intentionally stops the collector before driving the browser and **must exit nonzero** with retained failure evidence. Missing Docker, collector startup timeout, browser timeout, missing query results, and stopped collector are failures rather than skips. Startup, workflow, query, and cleanup waits have explicit bounds. This gate uses no intercepted endpoint and creates no synthetic spans or logs.
