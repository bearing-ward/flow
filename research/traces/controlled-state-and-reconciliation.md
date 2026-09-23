# Controlled state and keyed reconciliation

This trace compares state ownership and node identity in the pinned React and Svelte adapters. It defines the reference seam for Flow's reusable vanilla controller; it is not an API-parity claim.

All paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## React production path

React initializes its user-node array from `defaultNodes` before `nodes` and records whether defaults were supplied at `packages/react/src/store/initialState.ts:55` and `packages/react/src/store/initialState.ts:99`. This flag is the ownership boundary: defaults create internally managed state, while the `nodes` prop remains caller controlled.

`StoreUpdater` watches the controlled `nodes` prop and passes a changed array to `setNodes` at `packages/react/src/components/StoreUpdater/index.tsx:140`. The store adopts that array into its internal lookup while retaining equal internal entries when possible at `packages/react/src/store/index.ts:99` and `packages/system/src/utils/store.ts:129`.

Gestures become semantic position changes in `updateNodePositions` at `packages/react/src/store/index.ts:211`. `triggerNodeChanges` applies those changes to the node array only when `hasDefaultNodes` is true, then calls `onNodesChange` in both ownership modes at `packages/react/src/store/index.ts:265`. A controlled caller applies the emitted changes and supplies a new `nodes` array; the public utility performs keyed add, remove, replace, and field updates at `packages/react/src/utils/changes.ts:30` and `packages/react/src/utils/changes.ts:106`.

The React node renderer subscribes to visible node identifiers and renders each wrapper with `key={nodeId}` at `packages/react/src/container/NodeRenderer/index.tsx:38`. Its stated goal is to rerender the list only when identifiers are added or removed while preserving per-node wrappers during field updates.

## Svelte production path

Svelte exposes `nodes`, `edges`, and `viewport` as bindable values, then gives the store getter and setter access to those bindings at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:70`. There is no separate `defaultNodes` ownership mode in this path. Store operations update the bound array directly; dragging maps the affected entries to new node objects at `packages/svelte/src/lib/store/index.ts:61`.

The Svelte renderer uses a keyed each block, `(node.id)`, and shares one `ResizeObserver` across wrappers at `packages/svelte/src/lib/container/NodeRenderer/NodeRenderer.svelte:25` and `packages/svelte/src/lib/container/NodeRenderer/NodeRenderer.svelte:50`. Destroy disconnects that observer.

## Reference tests

The uncontrolled React fixture mounts `defaultNodes`, verifies the expected node count, and confirms a drag changes the node transform at `examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:5`.

The controlled fixture stores nodes in React state, applies each `onNodesChange` payload, and passes the resulting array back to `ReactFlow` at `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:124`. It asserts exact position, replacement, dimension, selection, and removal changes at `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:25`.

The imported tests do not directly assert DOM-element identity across an update or cancellation when the active node is removed. Those behaviors follow production structure but require Flow-specific proof before Flow claims them.

## Flow decision

Flow makes ownership explicit at mount with a schema-derived `controlled` or `uncontrolled` mode. Both modes emit the same semantic changes. Uncontrolled mode applies a successful command or completed drag to the controller's document before notifying subscribers. Controlled mode notifies subscribers but keeps the last caller-supplied document authoritative until `update` supplies a replacement.

The vanilla host reconciles node elements by branded node identifier. Existing identifiers keep their element, listeners, and observation; new identifiers allocate those resources; removed identifiers release them. Removing the active node cancels the gesture without emitting a position change.

`dispatch` accepts schema-decoded commands. `update` accepts schema-decoded documents. Browser events remain adapter inputs and never become the public command contract.

## Conformity and deviations

- **Conforms:** Flow distinguishes caller-controlled state from controller-owned default state and emits semantic changes in both modes, matching React's ownership boundary.
- **Conforms:** Flow preserves rendered node identity by identifier and shares one observer across nodes, matching the structure of both reference renderers.
- **Conforms:** Add, update, reorder, and remove operations reconcile by identifier instead of rebuilding the canvas.
- **Deviates:** Flow chooses an explicit `controlled` or `uncontrolled` mode at mount. React infers ownership from `nodes` versus `defaultNodes`, while Svelte uses bindable state. The explicit mode is framework-neutral and makes ownership testable.
- **Deviates:** Controlled Flow restores the authoritative position after a completed gesture until the caller calls `update`. React commonly receives the callback and state update in the same render cycle; Flow makes that acknowledgement boundary observable.
- **Deviates:** Flow's first command vocabulary contains only `set-node-position`, and its change stream remains final-only. The reference change vocabulary and drag-time emissions are broader.
- **Unverified:** Selection, dimension changes as public events, edges, parent expansion, middleware, persistence, and batched change ordering remain outside this slice.

The Flow conformance scenario must prove two-node mount, shared measurement, exact drag output, controlled acknowledgement, uncontrolled application, element preservation, add/remove/reorder, active-drag cancellation, and teardown. It does not prove the unimplemented reference behaviors.
