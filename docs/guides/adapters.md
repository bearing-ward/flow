# Adapter integration

Adapters translate framework or application lifecycle into the shared Flow contracts. They do not define a second graph model.

## Vanilla

Use `mountFlow` for synchronous acquisition or `createFlow` for Promise-based acquisition. The returned controller exposes updates, commands, subscriptions, and idempotent teardown. See the [JavaScript API](../public-api.md) and the [packed consumer fixture](../../tests/consumer/main.ts).

## Vue

`@flow/vue` provides `FlowCanvas`, `useFlow`, the editor injection key, and the adapter stylesheet. It accepts controlled document, node, edge, and viewport bindings and exposes typed node and edge component slots. The [Vue demo](../../apps/vue/src/main.ts) imports that package; the [shared conformance test](../../apps/vue/e2e/shared-conformance.e2e.ts) exercises mount, update, event acknowledgement, and unmount behavior.

## Foldkit

The Foldkit adapter maps a typed Model/Message/update/view program to Flow schemas and transitions. Browser events become messages; commands and subscriptions carry effects at the Foldkit boundary. The [Foldkit application](../../apps/foldkit/src/application.ts), [graph child model](../../apps/foldkit/src/graph.ts), and [conformance test](../../apps/foldkit/e2e/shared-conformance.e2e.ts) show the current implementation.

All adapters run the shared conformance scenarios, but that does not establish full parity with another framework library. The checked cases and known gaps are listed in the tests themselves.
