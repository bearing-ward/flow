# Adapter integration

Adapters translate framework or application lifecycle into the shared Flow contracts. They do not define a second graph model.

## Vanilla

Use `mountFlow` for synchronous acquisition or `createFlow` for Promise-based acquisition. The returned controller exposes updates, commands, subscriptions, and idempotent teardown; the application that creates the controller owns calling `destroy()` when the root is retired. Import `@flow/vanilla/style.css` through the consumer's CSS pipeline. See the [JavaScript API](../public-api.md) and the [packed consumer fixture](../../tests/consumer/main.ts).

## Vue

`@flow/vue` provides `FlowCanvas`, `FlowMiniMap`, `useFlow`, the editor injection key, and the adapter stylesheet. Import `@flow/vue/style.css` through the consumer's CSS pipeline. Render `FlowMiniMap` as a default-slot child of `FlowCanvas` to show visible node geometry and the current viewport. Pointer activation recenters on the clicked map point; keyboard focus followed by Enter or Space centers the graph. The empty map remains an accessible, inert image. It accepts controlled document, node, edge, and viewport bindings and exposes typed node and edge component slots. The owning Vue app controls the component lifetime; unmount it through the normal Vue lifecycle. The [Vue demo](../../apps/vue/src/main.ts) imports that package; the [shared conformance test](../../apps/vue/e2e/shared-conformance.e2e.ts) exercises mount, update, event acknowledgement, and unmount behavior.

## Foldkit

The Foldkit adapter maps a typed Model/Message/update/view program to Flow schemas and transitions. Browser events become messages; commands and subscriptions carry effects at the Foldkit boundary. Import `@flow/foldkit/style.css` through the consumer's CSS pipeline and dispose the Runtime through the application lifecycle that created it. Foldkit `0.163.0` and `@effect/platform-browser` `4.0.0-rc.116` are peers. The [Foldkit application](../../packages/foldkit/src/application.ts), [graph child model](../../packages/foldkit/src/graph.ts), and [conformance test](../../apps/foldkit/e2e/shared-conformance.e2e.ts) show the current implementation.

These adapters are browser integrations. Core's non-DOM import is checked separately; SSR import/render behavior for the adapters is not established. All adapters run shared or host-specific conformance scenarios, but those tests do not establish complete parity with React Flow or another framework library. Consult the [API correspondence](../react-flow-api-correspondence.md) and coverage catalog for known partial mappings and gaps.
