# Graph clipboard

Each mounted Flow canvas has an internal session clipboard. Copy selects nodes from the accepted document and includes their descendants and every edge whose endpoints are both copied. Selected edges with an uncopied endpoint are excluded. Copy strips selection and measurements while preserving authored fields and opaque JSON data.

Pasting allocates unused node and edge IDs, remaps declared handles and edge endpoints, and remaps copied parents. A copied root with an absent parent becomes top-level at its original absolute graph position. Descendants retain their parent-relative positions. Each paste offsets the copied roots by another 20 graph units. An explicit `position` places the minimum copied root anchor at a graph-space point. Pan and zoom do not alter these graph coordinates.

## Vanilla

The public controller exposes `copySelection()`, `pasteSelection(options?)`, and `setClipboardFragment(input)`. Copy returns a detached version-1 fragment, or null after disposal. Paste returns the ordinary atomic edit result. The mounted controller owns the session and its DOM listeners.

## Vue

`useFlow()` exposes `copySelection()`, `pasteSelection(options?)`, and `setClipboardFragment(input)`. `useFlowClipboard()` returns just these actions. The canvas owns the session. Multiple composable consumers share it, and scope teardown removes its keyboard listeners and disables edits.

## Foldkit

`createFoldkitClipboardClient(runtime.ports)` exposes `copySelection()`, `pasteSelection(options?)`, and `setClipboardFragment(input)`. These commands return the port send result. The client has no independent state or subscriptions. `HostAction.Clipboard` routes copy, paste and fragment replacement to the model-owned session. Read accepted output through the snapshot/accepted-state ports; a successful send is not controlled-owner acceptance. Runtime disposal releases keyboard subscriptions.

## Shortcuts and history

A focused canvas handles Ctrl or Meta with C and V. Input, textarea, select, contenteditable and `.nokey` controls retain their native editing commands. Copy starts the repeat offset at zero. Empty paste has no semantic effect. Reload starts an empty clipboard. There is no system clipboard permission or browser clipboard read/write.

Every paste submits one atomic transaction. Undo removes that paste in one step and redo restores it. Controlled canvases propose the same transaction and record only the owner's accepted document, as described in [transaction history](transaction-history.md).

## Fragment and extension contracts

`FlowGraphFragmentSchema` defines `{ version: 1, document }`. `decodeFlowGraphFragment` decodes unknown values with Effect Schema and checks graph integrity. Invalid versions, duplicate IDs, missing parents, dangling edges, cycles and invalid handles fail without replacing the current clipboard or changing the graph.

Core exports `createFlowClipboard`, `copyFlowSelection`, `extractFlowGraphFragment`, and `pasteFlowGraphFragment`. The pure paste reducer returns the next clipboard state and one edit transaction. `createFlowClipboardSession` binds it to a host's accepted document and serial edit capability.

Extensions call `pasteFlowGraphFragment` with explicit `FlowClipboardExtension` hooks. `FlowClipboardReferences` supplies node, edge and per-node handle ID maps. Hooks update only references their extension owns, then the ordinary edit validator checks the final document. Strings in opaque data are never interpreted as references. No engine, transport, storage or framework dependency is added.

The `/clipboard/` recipe in all three hosts demonstrates copy, paste, undo, redo, transformed placement and invalid-fragment rejection. [Plan 153's trace](../research/traces/153-graph-clipboard.md) separates production paths, acceptance evidence and the public-reference boundary.
