# JavaScript public API

`@flow/core` owns schema-derived graph, change, command, geometry, persistence, and transition contracts. `@flow/vanilla` owns DOM acquisition and rendering. The packages also retain the native Effect host API: `createFlowHost` builds a host from decoded values, while `acquireFlowHost` ties its `destroy` method to the caller's Effect scope.

## Mounting

`mountFlow(root, input, options)` is the synchronous JavaScript entry point. It decodes `input` and schema-backed options before constructing the host, then returns a `JavaScriptFlowController`. Invalid input or options throw synchronously. Renderer errors and `BrowserCapabilityError` can also escape during mounting; a renderer failure closes the partially mounted host and removes its DOM before the error escapes.

`createFlow(root, input, options)` is the Promise-based entry point for callers who prefer async acquisition. Its input is `unknown` and validation failures reject the Promise with the same schema or host error that `mountFlow` would throw. It delegates to the same synchronous mount and cleans host resources on a mount failure. After resolution, controller methods remain synchronous; an exception from `dispatch`, `update`, or another controller method is thrown by that call and is not converted into a later Promise rejection.

Pass `onChange` in `createFlow` options to subscribe during acquisition. Destroying the returned controller removes that subscription and releases the host. Both entry points also expose `subscribe(listener)`, which returns an unsubscriber for a caller-owned subscription.

```ts
const controller = await createFlow(root, unknownDocument, {
  documentMode: "controlled",
  viewport: {
    mode: "uncontrolled",
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
  onChange(change) {
    // Validate/acknowledge controlled changes in the application.
  },
});

controller.update(nextDocument);
const stopListening = controller.subscribe(handleChange);
stopListening();
controller.destroy();
```

## Ownership and acknowledgement

Document and viewport control are configured independently at mount. In controlled document mode, a semantic change is proposed to subscribers and the supplied document remains authoritative until the caller invokes `update`. Uncontrolled mode adopts valid changes before notifying subscribers. `updateViewport` follows the separate viewport mode. `fitView`, `dispatch`, `update`, `updateViewport`, `subscribe`, and `destroy` remain synchronous in both facades.

The controller is one host lifetime. `destroy` is idempotent, removes rendered DOM, closes browser listeners and observers, and stops notifications. Applications should call it when their root is no longer owned. The host does not serialize measurements, viewport state, pointer sessions, callbacks, or DOM into the Flow document.

## Package entry points

The packages ship JavaScript and declaration files under `dist/`; package exports do not point at TypeScript source. `bun run build:packages` creates these local outputs. `bun run test:consumer` packs both packages into a clean temporary consumer, installs the tarballs, checks runtime and declaration imports, and mounts the vanilla adapter in Chromium. This verifies the package artifacts without publishing them.
