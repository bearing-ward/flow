# Plan 108: Events, changes, connection rules and interaction switches

Status: in progress, 2026-10-13.

## Goal

Bring the wave 2 entries of `research/catalogs/react-flow-parity-audit-2026-10-13.json` to C in Vanilla, Vue and Foldkit: `OnNodesChange`, `OnEdgesChange`, `<Handle />`, `useConnection()`, `ConnectionState`, `IsValidConnection`, `NodeMouseHandler`, `EdgeMouseHandler`, `OnError`, `OnReconnect`, `OnSelectionChangeFunc`, `SelectionDragHandler`, and the examples Add Node On Edge Drop, Temporary Edges, Connection Limit, Context Menu, Preventing Cycles and Validation. Rebuild the Plan 106 Controls lock on real switches.

Reference: `packages/system/src/types/general.ts` (`OnConnectEnd`, `ConnectionState`, `FinalConnectionState`, `OnReconnect`), `packages/react/src/components/Handle/index.tsx`, `packages/system/src/xyhandle/XYHandle.ts:204-227,291-307`, `packages/react/src/components/Controls/Controls.tsx`.

## Design

- **Core.**
  - `flow-element-changes.ts`: `flowElementChanges(previous, current)` diffs two documents into `NodeChange[]`/`EdgeChange[]` (`add` with index, `remove`, `position`, `select`, otherwise `replace`). `flowChangeElementChanges(document, change)` derives the deltas a `FlowChange` proposes, so controlled hosts can deliver them before accepting. `applyFlowElementChanges(document, changes)` is the whole-document update helper.
  - `flow-interactivity.ts`: `FlowInteractivity` (`nodesDraggable`, `nodesConnectable`, `elementsSelectable`), `isFlowInteractive`, `flowInteractivityFor`, and per-element resolution where an element's own flag wins (`isNodeDraggable`, `isNodeSelectable`, `isEdgeSelectable`, `isNodeConnectable`, `isHandleConnectable`).
  - `FlowHandleSchema` gains `connectable`, `connectableStart`, `connectableEnd`. `connectionFromHandleGesture` rejects with the new issue `handle-not-connectable`; `handleGestureConnectable` serves previews. Programmatic edges skip this check, as React's `addEdge` does.
  - `flow-connection-state.ts`: `flowConnectionState({ document, preview, origin })` returns React's `ConnectionState` fields; `flowFinalConnectionState` gives the `onConnectEnd` shape.
- **Every host.**
  - Deltas are delivered next to the existing `FlowChange` stream (Vanilla `onNodesChange`/`onEdgesChange` options; Vue `nodesChange`/`edgesChange` emits; Foldkit outbound ports), with `useNodesState`/`useEdgesState` equivalents.
  - Runtime switches: options or props plus a runtime setter. Controls' lock calls the setter, starts from the current switches, and the DOM event gates are deleted.
  - Connection end payloads carry `connectionState` and the release `clientPosition`; a connection state getter plus subscription is public.
- **Foldkit.** An `isValidConnection` callback, node, edge and pane context menu events, a selection change event, and serializable mouse event fields on interaction events.

## Tests

- Core unit tests: `packages/core/src/domain/flow-element-changes.test.ts` (round trips, controlled deltas, switches, handle connectability, connection state).
- One browser file per host, `events-and-changes.e2e.ts`, each passing three runs in a row. It covers controlled deltas, runtime switches and the lock, Connection Limit, Add Node On Edge Drop, Temporary Edges and event payloads. Foldkit also covers validation, cycles, context menu and selection change.

## Conformity and deviations

- **Conforming.** Element flags win over canvas switches; `isConnectable`, `isConnectableStart` and `isConnectableEnd` semantics; `ConnectionState` field names and the `toPosition` rule; `FinalConnectionState` drops `inProgress` and nulls `toPosition` without a target handle; the lock's initial state is `nodesDraggable || nodesConnectable || elementsSelectable`, as in React's Controls.
- **Intentionally different.**
  - Deltas describe semantic changes, not per-frame drags or measurements: no `dimensions` changes, and positions arrive with the host's existing drag commits, without `dragging`. Node `size` changes arrive as `replace`, because `applyNodeChanges` writes `measured`, not `size`.
  - Handle connectability lives on handle data in the document, since Flow handles are data rather than components. Per-handle `isValidConnection`/`onConnect` are covered by the canvas callbacks, which receive handle ids.
  - Vanilla `onReconnect` keeps its first argument, the new edge, and adds `{ oldEdge, newConnection }` as a second argument, to stay compatible.
  - Foldkit events are serializable records with client coordinates, button and modifier keys instead of DOM events.
- **Unverified.** There is no live React runtime comparison.
