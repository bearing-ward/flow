# Graph editing

The JavaScript controller and Vue `useFlow()` expose named edit requests for adding, replacing, updating, and deleting nodes and edges. Foldkit exposes the same schema-backed operations through the package-owned typed edit request/result ports, consumed by `@flow/foldkit-demo`. All edits are validated against the complete candidate document before they are proposed or accepted.

```ts
await controller.updateNodeData('middle', { reviewed: true })
await controller.updateEdgeData('edge-ab', { weight: 2 })

const result = await controller.applyEdit({
  operations: [
    { kind: 'delete-elements', nodeIds: ['middle'] },
    {
      kind: 'add-edges',
      edges: [
        {
          id: 'edge-ac',
          source: 'first',
          target: 'last',
        },
      ],
    },
  ],
})
```

The reconnect transaction is an application policy. It uses a snapshot taken before deletion to choose the replacement edge; ordinary deletion removes the requested nodes, descendants, and incident edges without inferring how the remaining graph should be connected.

`updateNode` and `updateEdge` shallow-patch by default. Set `replace: true` to replace the targeted object while retaining its ID. The data-specific methods shallow-merge JSON-object keys by default and discard absent keys when `replace: true`. Missing update IDs are no-ops. Invalid data or graph references reject the whole transaction without partially changing accepted state.

JavaScript and Vue setters and update methods accept functional updaters. They run once when the request executes against a frozen view of the then-accepted graph. A controlled proposal does not become the base for another updater until the owner acknowledges it. Call `applyEdit` when related node and edge changes must commit together.

In controlled mode, an edit is a proposal. Getters remain on the last accepted document until the owner acknowledges the proposed document. The deletion result describes the validated proposal and is not an acknowledgement. In uncontrolled mode, a valid transaction is accepted atomically. See [the API reference](../api-reference.md) for operation types and [the contract trace](../../research/traces/public-edit-contract.md) for ownership and failure semantics.

Each playground includes a bounded “Delete Middle Node” recipe. It reads the pre-edit graph, computes its incoming and outgoing neighbors, then submits deletion and reconnection in one transaction. The per-host E2E checks exercise the controls with keyboard activation and at a narrow viewport. These examples do not establish parity for the complete upstream shell, styling controls, or lifecycle callbacks.
