# Flow Chromium image service

`@flow/image-service` is an optional Bun server integration. `createFlowImageService(options)` acquires Chromium in an Effect scope and returns `render(unknown)` and `activeContexts()`. `serveFlowImages(options)` also acquires a Bun HTTP server. Closing the enclosing scope closes the server, outstanding connections and Chromium. Each render uses its own context; two captures can run concurrently. Cancellation interrupts queued and running work. A request deadline includes queue time.

Playwright 1.64.1 is a runtime dependency here. The workspace's `@playwright/test` development dependency cannot supply a production installation. Core and all host adapters remain independent of Playwright and this package. Install Chromium with `bunx playwright install chromium` for a local backend, and install the browser's system dependencies on Linux. The container already includes those dependencies.

From the repository root:

```sh
bun install --frozen-lockfile
bun run build:packages
bun run --cwd packages/image-service start
```

Run the three host demos on ports 4176, 4177 and 4178, and open `/image-service/`. Their preview controls POST to port 4191. The service uses only administrator-configured `FLOW_IMAGE_VANILLA_ORIGIN`, `FLOW_IMAGE_VUE_ORIGIN` and `FLOW_IMAGE_FOLDKIT_ORIGIN`; request bodies cannot select a URL. `FLOW_IMAGE_BIND`, `FLOW_IMAGE_PORT` and `FLOW_IMAGE_TIMEOUT_MS` configure the listener and deadline. The default listener is loopback. Application composition owns authentication and optional OTLP export.

## Container

Build from the workspace root. The image builds all three host pages and installs only `@flow/core`, Effect and Playwright in its runtime directory. It uses the matching Playwright 1.64.1 Chromium image and Bun 1.4.3. The final stage serves prebuilt host assets on ports 8081 through 8083 and the image API on 8080. It requires no Vite server or development dependency at runtime.

```sh
docker build -f packages/image-service/Dockerfile -t flow-image-service:plan165 .
docker run --rm --init -p 127.0.0.1:8080:8080 -p 127.0.0.1:8081:8081 -p 127.0.0.1:8082:8082 -p 127.0.0.1:8083:8083 flow-image-service:plan165
```

Open `http://127.0.0.1:8081/image-service/`, `http://127.0.0.1:8082/image-service/` or `http://127.0.0.1:8083/image-service/`. Container host pages select port 8080 for previews. SIGINT/SIGTERM release the Effect scope. To run the repeatable container acceptance and stop its container afterwards:

```sh
scripts/with-flow-browser-lock.sh bun run scripts/check-image-service-container.ts
```

See [the export contract and host APIs](../../docs/server-image-service.md) and [dependency ownership](../../docs/dependencies.md#plan-165-optional-image-service).
