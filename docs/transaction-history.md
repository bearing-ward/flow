# Transaction history

Flow history stores accepted semantic graph changes for one mounted session. The default capacity is 100 transactions. A nonnegative integer capacity configures retention, and zero disables recording. History does not survive reloads and is absent from saved graph documents.

History excludes viewport, node and edge selection, and node measurements. Undo restores authored positions, sizes, graph data, and node and edge membership. Surviving elements retain current selection. A restored deleted element starts without historical selection or measurements.

## Vanilla

The controller exposes `undo()`, `redo()`, `getHistoryStatus()`, `subscribeHistory(listener)`, and `rejectHistory(transactionId)`. `historyCapacity` configures the mounted history. The status contains `canUndo`, `canRedo`, `pending`, `pastCount`, `futureCount`, `capacity`, and `disposed`.

## Vue

`useFlow()` exposes reactive `history`, `undo()`, `redo()`, and `rejectHistory(transactionId)`. `useFlowHistory()` returns those same history members. The canvas owns the shared history state. Composable consumers observe that same owner. The `historyCapacity` prop configures retention.

## Foldkit

The application model owns history. `createProgram` accepts `historyCapacity` in its final history-options argument. `createFoldkitHistoryClient` exposes `undo()`, `redo()`, `getStatus()`, `subscribeHistory(listener)`, `rejectHistory(transactionId)`, and `dispose()` through the Runtime's history ports. Multiple clients observe the same model-owned history. The client requests initial status after installing listeners; raw port consumers activate status publication with a status request. Recording does not depend on status subscriptions. Client disposal removes its subscriptions. Runtime disposal releases the model and keyboard subscriptions.

## Controlled acceptance

A prepared edit is a proposal. History records the accepted document rather than the preparation result. Rejected edits add no entry.

Undo and redo reserve a document target without moving either stack. The proposal carries a transaction `context`. A controlled owner echoes that context when it accepts the proposed document. Vanilla accepts `update(document, context)`. Vue accepts the `documentContext` prop alongside the controlled document. Foldkit accepts `HostAction.ReplaceDocument({ document, context })`.

A controlled owner can call `rejectHistory(transactionId)` to discard a replay reservation. Ignoring the proposal leaves replay pending, with both stacks intact. Accepting a changed document without the matching context records an ordinary new edit. Vue matches the document and context after the complete controlled prop update. Pending replay disables further undo and redo. A semantic edit after undo clears the redo branch.

## Origins and gestures

`FlowTransactionContext` carries `transactionId`, `origin`, and an optional `gestureId`. Origin identifies a `local`, `remote`, or `system` producer with an `actorId`. Clipboard code can submit its remapped operations as one transaction. The origin contract provides an integration point for future collaborative undo.

Explicit remote or system updates establish a new baseline. Snapshot history cannot selectively undo local changes while preserving concurrent peer changes. A collaborative integration must supply that behavior.

Pointer movement remains a preview until the gesture commits. One complete drag records one history step. An explicit gesture boundary coalesces repeated accepted keyboard movement. Cancellation discards uncommitted previews. Accepted keyboard changes remain undoable.

## Keyboard and lifecycle

The active canvas handles Ctrl or Meta with Z for undo and Shift+Z for redo. Ctrl+Y also performs redo. Editable controls retain native undo. Shortcuts do not intercept input, textarea, select, or contenteditable editing.

History belongs to a canvas or Runtime instance. Destroying an instance disables its history actions and removes its listeners. A new mount starts with empty stacks.

The `/history/` page in each host demonstrates controls, semantic edits, and history status. The [Plan 150 trace](../research/traces/150-transaction-history.md) records production paths, acceptance tests, and reference boundaries.

Grouping commands use one edit transaction. Later intrinsic-size corrections amend the current snapshot without adding an undo step or clearing redo. See [grouping actions](grouping-actions.md).
