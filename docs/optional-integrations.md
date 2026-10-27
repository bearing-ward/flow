# Optional integrations

Application composition opts into these packages. Core and reusable host adapters consume engine-neutral contracts. Their source and manifest boundaries are checked by `bun run check:architecture`.

| Capability | Entry and distribution | Contract and usage |
| --- | --- | --- |
| Obstacle routing | `@flow/routing-libavoid`, packed ESM and declarations; `@flow/routing-libavoid/libavoid.wasm` asset | [Adapter contract and LGPL notices](../packages/routing-libavoid/README.md), [routing guide](edge-routing.md) |
| Collaborative rooms | `@flow/collaboration-yjs`, packed ESM and declarations | [Room protocol and lifecycle](../packages/collaboration-yjs/README.md). Hosting, authentication, durability, and offline retention remain application decisions. |
| Server PNG export | `@flow/image-service`, Bun ESM, declarations, and `flow-image-service` binary | [Service API](../packages/image-service/README.md), [renderers, assets, and deployment](server-image-service.md). The service owns Chromium. |
| Measured layout | `@flow/layout`, private source-only workspace integration | [Exports](../packages/layout/README.md), [layout engines](layout-engines.md). It is not a packed consumer package. |
| Workflow and offline AI | `@flow/workflow`, packed browser-independent ESM and declarations | [Configuration and provider contracts](../packages/workflow/README.md), [workflow guide](workflows.md). Runs remain transient. |

The [dependency registry](dependencies.md) records each owner, purpose, alternatives, versions, and removal boundary. Vanilla combines its adapter and demo in one workspace. Its layout development dependency belongs to the demo; published runtime dependencies and adapter source cannot import `@flow/layout`. Existing direct engine recipes remain app code.

`bun run test:consumer` builds and installs archives outside the workspace. It checks all four distributable optional packages, including workflow with every adapter. Routing checks its exported WASM header. Collaboration and image-service checks exercise typed rejection before opening transport or Chromium. These package checks complement the real routing, room-transport, and capture acceptance suites; import success alone does not establish service behavior.
