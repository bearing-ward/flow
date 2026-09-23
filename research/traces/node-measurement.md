# Node measurement and dimension updates

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The upstream tests cover dimension changes and missing-parent cleanup, but do not expose a cross-framework measurement fixture.

All paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Shared path

```text
rendered node element
  -> one adapter-owned ResizeObserver
    -> Map<node id, InternalNodeUpdate>
      -> shared updateNodeInternals
        -> offset dimensions and viewport zoom
        -> measured dimensions, handle bounds, and clamped absolute position
          -> adapter store update
            -> dimension change for caller-owned nodes
```

`InternalNodeUpdate` couples the shared operation to an `HTMLDivElement` at `packages/system/src/types/nodes.ts:132`. `updateNodeInternals` refuses to run without the `.xyflow__viewport` element, reads its CSS matrix zoom, then measures each node with `offsetWidth` and `offsetHeight` at `packages/system/src/utils/store.ts:401`. DOM measurement itself lives at `packages/system/src/utils/dom.ts:30`.

The shared update ignores zero-sized elements. For a real change or forced refresh it replaces the internal node with measured dimensions, extent-clamped absolute position, and zoom-corrected handle bounds at `packages/system/src/utils/store.ts:441`. It emits a `dimensions` change only when width or height changed at `packages/system/src/utils/store.ts:484`. Parent expansion can add position and dimension changes after that pass.

This path mixes three concerns in one shared function: browser reads, geometry derivation, and mutation of adapter-owned lookup maps. Flow should separate the browser measurement capability from the pure geometry update.

## React production path

`NodeRenderer` creates one observer for all rendered nodes. The callback extracts `data-id`, builds forced updates, and calls the store at `packages/react/src/container/NodeRenderer/useResizeObserver.ts:9`. The hook disconnects the observer when `NodeRenderer` unmounts at `packages/react/src/container/NodeRenderer/useResizeObserver.ts:31`.

Each `NodeWrapper` observes its element until dimensions and handle bounds exist. It unobserves a replaced or unmounted element and forces a fresh internal update when the node type or handle positions change at `packages/react/src/components/NodeWrapper/useNodeObserver.ts:31`.

The store delegates to the shared update, recalculates child absolute positions, resolves queued fit-view work, invalidates subscribers, and emits caller-facing changes at `packages/react/src/store/index.ts:167`.

## Svelte production path

`NodeRenderer` also creates one observer, converts entries to the same update map, and disconnects it in `onDestroy` at `packages/svelte/src/lib/container/NodeRenderer/NodeRenderer.svelte:25`.

The Svelte store delegates to the shared update and recalculates absolute positions at `packages/svelte/src/lib/store/index.ts:77`. It then applies dimension or position changes by cloning the affected caller-owned nodes and replacing the bound node array at `packages/svelte/src/lib/store/index.ts:102`.

## Tests and gaps

The closest direct shared test verifies that a late observer callback for a removed parent does not crash at `examples/react/cypress/components/utils/update-node-internals.cy.ts:16`. Change application tests verify that dimension changes populate `measured` and can set explicit width and height at `examples/react/cypress/components/utils/apply-changes.cy.ts:131`. React component coverage verifies emitted dimension changes at `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:27`.

The generic Playwright node test waits for measured nodes to become visible at `tests/playwright/e2e/nodes.spec.ts:26`, but it does not assert dimensions or observer cleanup. Flow therefore needs its own browser assertions for measured width and height, plus a cleanup test for observer disconnection.

## Flow decision

Measured dimensions belong to runtime geometry, not the serializable flow document. The vanilla host owns `ResizeObserver` and passes numeric measurements into the core. Core state accepts a schema-derived `{ nodeId, width, height }` value and never receives an element. Observer lifetime ends when the host is destroyed.

## Conformity and deviations

- **Conforms:** Flow creates one observer for the host and measures nodes with `offsetWidth` and `offsetHeight`.
- **Conforms:** Flow hides nodes until the first observer delivery and disconnects the observer when the host stops.
- **Deviates:** Flow passes numeric measurements to core contracts instead of passing `HTMLDivElement` values into a shared mutation function. This keeps DOM access in the host.
- **Unverified:** Handle bounds, parent clamping, queued fit view, zero-sized nodes, and measurement failure diagnostics are not implemented.

Flow's browser test proves initial measurement and remeasurement after a width change. It does not run against the pinned reference output.
