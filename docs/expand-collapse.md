# Dynamic trees and expand/collapse

The `/expand-collapse/` and `/dynamic-layouting/` recipes run in Vanilla, Vue, and Foldkit. They share the core tree reducer, hierarchy layout workflow, and node position animation. Each accepted gesture changes the complete document and its layout destination in one history transaction.

## Tree contract

A tree is empty or has one root. Directed edges define ancestry. Every nonroot node has one incoming edge. Cycles, duplicate IDs, missing endpoints, multiple parents, multiple roots, and group-relative `parentId` coordinates are rejected. Placeholders are leaves.

Every node reserves `data.tree` for `{ version: 1, kind: 'node' | 'placeholder', expanded: boolean }`. Other JSON data remains opaque. `FlowTreeDataSchema` validates this envelope. `decodeFlowTree` validates the complete tree, including collapsed descendants. Ordinary graph documents do not become trees automatically.

The document contains every node and edge. `flowTreeExpandedState` derives the complete expansion map. `flowTreeCollapsedIds` derives descendants hidden by collapsed ancestors. `projectFlowTree` returns the projection without deleting anything from the document. The shared render graph combines that derived visibility with authored `hidden` flags. Collapse never rewrites those flags or a descendant's expansion state.

`getFlowTreeLayoutInput` uses the projected nodes and edges. Existing measurements take precedence. Newly created or restored nodes use their explicit authored boxes until measured. Nodes without either bounds source produce an unmeasured layout failure. Unrelated hidden flags remain authoritative. If they split the layout input into an unsupported hierarchy, the engine rejects the request and the complete edit remains unapplied.

## Core public API

`createFlowTreeNode` creates a node with explicit 150-by-60 bounds and version-1 tree data. Applications can supply another label, position, or placeholder kind. The recipe fixes the rendered box to those authored dimensions.

`prepareFlowTreeEdit(document, command)` returns one validated `FlowEditTransaction`. `FlowTreeEditSchema` defines these commands:

- `create-root` accepts `id` and `label` for an empty tree.
- `toggle` accepts `nodeId` and preserves every descendant's state.
- `promote` accepts `nodeId` and `label`. It preserves the placeholder's ID and opaque data, changes its kind, and adds a fresh child placeholder in the same transaction. Generated placeholder IDs avoid existing node and edge IDs.
- `add-child` accepts `parentId`, `id`, `edgeId`, `label`, and an optional `placeholder` boolean. A collapsed parent stays collapsed. A placeholder requires promotion before it can accept children.
- `insert` accepts `edgeId`, `id`, `newEdgeId`, and `label`. The original edge ID and metadata remain on the source segment. The downstream segment copies the original edge metadata and target handle. The new node uses its default handles. Opaque data is never searched for references.
- `delete-subtree` accepts `nodeId` and removes every descendant and incident edge. Deleting the root produces the empty tree.

Missing or deleted command targets return `InvalidFlowTree`. Invalid commands leave the document and history unchanged.

`createFlowTreeEditor({ read, engine, animate })` binds those operations to accepted host state. Its `edit(command, duration?)` returns an Effect with the animation result. Its `dispose()` invalidates pending layout delivery. The engine capability comes from the optional `@flow/layout` integration, so core has no engine dependency. The recipe selects `hierarchy`, backed by d3-hierarchy. Revision changes during layout discard the result before submission. Another tree command during a pending gesture returns a visible busy error.

## Host public APIs

Vanilla supplies `controller.getSnapshot()`, `getInternalNode`, and `animateNodePositions` to the shared editor. Ordinary load operations use `applyEdit`. The controller owns accepted state, history, DOM rendering, frame scheduling, and destruction.

Vue supplies the accepted reactive document and measured internal nodes through `useFlow()`. Reads wait for `nextTick()`. The same composable supplies `animateNodePositions`, `applyEdit`, `undo`, and `redo`. Canvas scope disposal releases animation, and recipe scope disposal releases controls and the tree editor.

Foldkit supplies accepted-state port snapshots and `createFoldkitFlowInstance` measurements. `createFoldkitNodeAnimationClient(runtime.ports).animateNodePositions` submits the animated transaction. `HostAction.AnimateNodePositions` remains available for direct routing. `createFoldkitHistoryClient` and `createFoldkitClipboardClient` use the same model-owned document. Client and Runtime disposal release listeners, pending callers, and frame subscriptions.

All three animation APIs now accept optional `edit` alongside the layout `result` and `duration`. `prepareFlowNodeAnimationEdit` combines that edit with its destination positions before host acceptance. Controlled owners must accept the complete semantic destination. Matching positions alone cannot acknowledge a rejected topology or expansion change. Intermediate animation frames remain presentation state.

## Recipe controls and persistence

In Expand and Collapse, clicking a node or pressing Enter or Space toggles it. In Dynamic Layouting, the same regular-node gestures add a child placeholder. Placeholder gestures promote the node and create its next placeholder. Both routes also expose explicit toggle and add-child buttons, edge plus buttons, and a parent selector that includes collapsed nodes.

Buttons support native keyboard activation. A disappearing focused descendant transfers focus to the nearest visible ancestor. Returning descendants leave the current focus stable. Controls follow rendered positions during animation and viewport changes.

Save and Load use the existing versioned document format. Tree extension data has its own version, so the document envelope needs no new version. [Graph clipboard](graph-clipboard.md) preserves the extension and opaque fields without an additional reference hook. Pasting a whole copied tree into a nonempty tree creates another component. Tree commands and tree loading reject that forest until it is resolved. Generic graph APIs remain available.

[Transaction history](transaction-history.md) records each accepted command and destination once. Undo and redo restore topology, expansion, authored hidden flags, data, and rendered positions. Animation progress is never saved or copied.

The [Plan 160 trace](../research/traces/160-expand-collapse.md) records production paths, acceptance commands, and reference boundaries.
