# State updates and session snapshot

The three playgrounds demonstrate the same bounded workflow through their host APIs: edit a node label, toggle that node's hidden state, inspect node and edge records plus directed neighbors, save the document with the viewport, make changes, restore, and reset. The inspector reads accepted Flow state through the host API; it does not infer graph state from rendered DOM or maintain a second authoritative graph. Hiding a node also hides its incident edge output under Flow's visibility rules, while the document record remains inspectable.

This is a focused state and persistence example, not a recreation of every upstream [Updating Nodes](https://reactflow.dev/examples/nodes/update-node) or [Save and Restore](https://reactflow.dev/examples/interaction/save-and-restore) option. It does not add upstream styling controls, browser storage, file export, or a ReactFlowJsonObject-compatible format. The saved snapshot is held in application memory for the current page session. Reloading the page discards it.

## Host entry points

- **Vanilla:** the playground reads and updates through its JavaScript controller.
- **Vue:** a descendant of `FlowCanvas` uses the canvas-scoped `useFlow` composable and normal Vue component state.
- **Foldkit:** the app reads its model with selectors and sends typed messages through runtime ports; the example remains app-scoped.

Labels and hidden state are fields of the existing Flow graph document. The inspector presents nodes, edges, and incoming/outgoing neighbors from supported state and query APIs.

## Saved value

Core persistence remains the versioned document format in [`flow-persistence.ts`](../../packages/core/src/domain/flow-persistence.ts). That format deliberately omits viewport and transient selection. The playground wraps the existing saved document and viewport in an app-owned, schema-validated envelope. It does not change the reusable core format.

Version 1 documents now allow optional JSON-object data on edges and an optional node `deletable` flag. Existing version 1 documents that omit these fields still decode. A reader built before these fields existed may discard them when it decodes and re-encodes a document; this is additive input compatibility, not a promise that older readers preserve new fields.

Save reads the current document and viewport, encodes the document with the core persistence API, and validates the application envelope. The examples edit JSON data on a straight edge before saving, replace that data afterward, and verify that restore returns the saved edge data in Vanilla, Vue, and Foldkit. Restore decodes the envelope, then restores document and viewport through the host API. Selection and preview state remain transient and are not restored as saved graph state. Reset returns the playground to its initial document and viewport and clears the in-memory snapshot. If no snapshot has been saved, restore reports that state and leaves the current graph unchanged.

The envelope belongs to the application example. It does not promise storage across reloads. Browser storage and export/import are later integrations.

## Evidence boundary

The example exercises only the named actions and host-specific routes above. It does not claim complete behavior or visual parity with the upstream pages. See the [coverage catalog](../../research/catalogs/react-flow-coverage.md#state) for per-host production and browser-test evidence, and [project progress](../../research/PROGRESS.md) for verification status.
