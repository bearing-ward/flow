# Optional collaborative rooms

`@flow/collaboration-yjs` implements Plan 164 and maintainer decision D12. Install it only in an application that needs rooms. Core, Vanilla, Vue and Foldkit adapters have no Yjs or transport dependency. This package keeps `@flow/core`, `effect`, `yjs` and `y-websocket` external in its distribution.

## Public API

Acquire a room inside an Effect scope with `acquireYjsRoom({ serverUrl, room, actorId, name })`. Scope release destroys the provider, awareness timers, UndoManager and Y.Doc. `FlowRoomError` is the typed failure for acquisition, semantic commits, presence and disposed lifecycle operations. Connection status remains observable while y-websocket retries an unavailable server.

The returned `FlowRoom` exposes:

- `document()`, `failure()`, `status()`, `presence()` and `subscribe(listener)` for current state and invalidation. `failure()` exposes a rejected remote document; local method failures use their Effect error channel. Subscriptions return their own cleanup function.
- `commit(before, after, context?)`, an Effect that diffs two **accepted** host documents. A rejected host proposal must never be submitted. Remote and system contexts do not produce local writes or history.
- `beginGesture()` and `endGesture()` to coalesce accepted live movement into one local undo transaction.
- `undo()`, `redo()` and `history()`. History reports the Plan 150 `FlowHistoryStatus` contract, retains up to 100 local transactions, and uses Yjs origin-scoped inverse operations. A peer's edits do not enter or clear the local stack. A superseded local entry consumes one step without skipping into an older transaction. Use these room actions for collaborative controls and keyboard shortcuts. The host's standalone snapshot history is not the collaborative history owner.
- `setPresence(presence)`, `disconnect` and `reconnect` Effects, plus idempotent `dispose()`. Scope release is the usual disposal path.

Room names are encoded as one websocket path component, so path punctuation cannot alias another room. Dot-only names `.` and `..` are rejected. Rooms start empty. Create the initial graph once through an accepted host edit. Joining clients read its state from the server. This avoids competing whole-document seed snapshots. The shared demo generates a random room URL when `room` is absent. Sharing its URL joins that room; a host's base URL can be changed while retaining the `room` and `server` query parameters.

## Sync contract

The protocol uses a Y.Map named `flow-v1`. Keys encode `[collection, entityId, field]` as JSON. Collections are `nodes`, `edges`, `bundles` and `meta`. Each authored node/edge/bundle property is one atomic Yjs register. The document's `nodeOrigin` is a metadata register. Arrays, positions, node `data`, edge `data`, routes and bundle ties each remain atomic values; the package does not merge arbitrary nested JSON keys or array elements. Independent entity fields merge. Concurrent writes to the same register follow Yjs's deterministic conflict resolution, not wall-clock order.

`$alive` is entity membership. Moving an existing entity never writes membership. Deletion therefore survives a concurrent move. Tombstones keep field values for reconnect, selective undo and orphan coordinate projection. Explicit recreation of an ID is a membership write; use fresh UUIDs for new entities and a fresh `FlowPasteOptions.idNamespace` for every room paste. The room composition applies this policy to both buttons and native shortcuts; parent, endpoint, handle and bundle references still use the shared clipboard remapper.

The boundary decodes keys, JSON values and boolean membership, and requires each live entity ID to match its map key. It then decodes the current Flow schema. The core `projectFlowRoomDocument` produces an integrity-checked document in deterministic ID order. It detaches missing/cyclic parents, projects detached coordinates using retained parent positions, hides dangling or invalid-handle edges, and prunes missing/duplicate bundle membership and bundles below two edges. These are projections; they do not write repair operations into peer history. An endpoint or parent restored by undo can make retained relations visible again. Structurally malformed updates retain the last valid document and report a structured decode failure.

All current document extensions are included: group membership, versioned tree expansion data, shape data, manual edge routes and persistence-v5 bundles with ordered edge membership and tie points. Opaque JSON stays opaque. Selection, DOM measurements, viewport, routing results and transient overlays are local. Awareness carries decoded actor/name/cursor presence and optional node-position drag previews, is outside history, and disappears on disconnect/disposal. Reconnect advances the local awareness clock before joining so peers accept restored presence after the disconnect tombstone. Browser broadcast-channel sync is disabled so acceptance exercises websocket transport, including clients on different host origins.

## Host bindings

The core `projectFlowRoomPresence` overlays decoded peer drag positions on the durable document. Conflicting previews use code-unit actor-ID order, with the last actor winning the displayed position. Unknown/deleted node IDs are ignored. Removing presence restores the durable position.

The runnable composition is in `apps/shared/collaborative/demo.ts`. It subscribes to accepted state, publishes semantic deltas and installs remote replacements with `origin.kind = 'remote'`. It samples each host's public live-node read during a local pointer gesture and sends previews through awareness. The accepted release commits once through Yjs; cancelled previews never enter durable history. Remote document application pauses during a local gesture and reconciles after it ends. It retains each host's local selection and safe measurements through `restoreFlowHistoryDocument`. Room history controls and capture-phase undo/redo shortcuts use the same selective owner. Inputs and editable text retain native keyboard undo.

| Host | Public integration APIs |
| --- | --- |
| Vanilla | `createFlow`, `getSnapshot`, `getNodes` for live positions, `subscribeState`, `update(document, context)`, `applyEdit`, `screenToFlowPosition`, `copySelection`, `pasteSelection`, `destroy` |
| Vue | `FlowProvider`, `FlowCanvas`, `useFlow` live `getNodes` and accepted-state subscription and `updateDocument(document, context)`, `applyEdit`, `screenToFlowPosition`, `useFlowClipboard`; Vue scope cleanup releases the room |
| Foldkit | `createProgram` with a stable container ID, `ports.acceptedStates`, `HostAction.ReplaceDocument({ document, context })`, `createFoldkitFlowInstance`, `createFoldkitSnapshotClient`, `createFoldkitClipboardClient`; the composition releases ports, measurement observer and Runtime |

Every host has `/collaborative/`, a share link, connection status, right-click node creation, live remote movement, remote cursors, Undo/Redo, Copy/Paste, Disconnect/Reconnect and Dispose controls. Rendering and pointer behavior stay in the existing adapters. The optional integration is imported only by the application composition.

## Local server and acceptance

Runtime dependencies are `yjs` 13.6.33 and `y-websocket` 3.1.0, both MIT. The local test server is the MIT `@y/websocket-server` 0.1.1 development dependency. Its Yjs 13 peer matches the client. Newer server releases targeting Yjs 14 are not a compatible drop-in upgrade. Effect 4.0.0 and Flow core are peers.

Run `bun run --cwd packages/collaboration-yjs server` for an anonymous, memory-only server at `ws://127.0.0.1:4193`. Stop it with Ctrl-C after the session. The Playwright configs start and stop this server themselves; do not pre-start it for tests. The transport unit tests own a separate server on 4194 and stop it in teardown.

Run `bun run build:packages` after installation, then run each standalone browser command under its own lock:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/collaborative.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/vue/playwright.config.ts collaborative.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c apps/foldkit/playwright.config.ts collaborative.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test -c scripts/collaborative.config.ts --workers=1
```

The last command starts all three hosts and a real server for mixed-host convergence. All managed servers stop after each run, including failed runs.

## Open production decisions

Hosting, authenticated room access, server durability and offline retention remain **open** and need separate approval. The anonymous localhost demo defines no production authorization policy. A room ID or share URL is not an access-control decision. Session reconnect tests prove convergence with the live in-memory server and retained client Y.Doc only. They do not promise data after server restart, page reload while offline, persistent offline storage or retention policy.

Named Flow spans cover acquire, connection, semantic edits, decode failures and release. High-frequency pointer movement has no dedicated log stream. Application composition owns optional OTLP export and shutdown flushing; collector delivery is unverified.

See the [Yjs websocket provider](https://docs.yjs.dev/ecosystem/connection-provider/y-websocket) and [selective undo documentation](https://docs.yjs.dev/api/undo-manager), and Flow's [dependency ownership](../../docs/dependencies.md).
