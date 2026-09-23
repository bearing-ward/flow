# Initial node render

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Browser behavior is covered by upstream visibility tests, but upstream does not provide a pixel baseline for this path.

All paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Shared data preparation

```text
caller supplies nodes
  -> framework store initialization
    -> @xyflow/system adoptUserNodes
      -> derive absolute position, measured state, z-index, and user-node reference
        -> populate nodeLookup and parentLookup
```

`NodeBase` owns the framework-neutral input shape. It requires `id`, `position`, and `data`, then adds optional interaction and layout fields at `packages/system/src/types/nodes.ts:11`. `InternalNodeBase` replaces the loose measured field and adds absolute position, z-index, handle bounds, bounds, and the original user node at `packages/system/src/types/nodes.ts:90`.

`adoptUserNodes` clears and rebuilds the lookup maps at `packages/system/src/utils/store.ts:129`. For each user node, it calculates origin-aware and extent-clamped position, then creates the internal record at `packages/system/src/utils/store.ts:146`. This function mutates the supplied maps. The arrays remain framework-owned.

This is the first important seam. Public graph data and internal geometry are separate representations, but both framework stores own the mutable maps that connect them.

## React production path

```text
<ReactFlow nodes edges>
  -> Wrapper
    -> ReactFlowProvider
      -> createStore
        -> getInitialState
          -> adoptUserNodes
  -> GraphView
    -> FlowRenderer
      -> Viewport
        -> NodeRenderer
          -> NodeWrapper
            -> selected node component
              -> browser DOM
```

The root passes configuration to `GraphView` and wraps the tree at `packages/react/src/container/ReactFlow/index.tsx:200`. `Wrapper` creates a provider only when no parent store exists at `packages/react/src/container/ReactFlow/Wrapper.tsx:39`. `ReactFlowProvider` creates the Zustand store once at `packages/react/src/components/ReactFlowProvider/index.tsx:89`.

`getInitialState` creates node, parent, connection, and edge maps. It sends the initial node array to `adoptUserNodes` at `packages/react/src/store/initialState.ts:50`. When `fitView` has dimensions, initialization also derives the starting viewport transform at `packages/react/src/store/initialState.ts:69`.

`GraphView` places edges, the connection preview, labels, nodes, and the viewport portal inside `Viewport` at `packages/react/src/container/GraphView/index.tsx:117`. `Viewport` reads the initial transform for first paint. It then subscribes to the store and writes later pan and zoom transforms directly to the DOM, outside React rendering, at `packages/react/src/container/Viewport/index.tsx:14`.

`NodeRenderer` subscribes only to visible node IDs and creates one shared `ResizeObserver` at `packages/react/src/container/NodeRenderer/index.tsx:38`. The source comments identify this as a drag-performance decision. Individual `NodeWrapper` components subscribe to their own internal node records.

`NodeWrapper` reads the internal node from `nodeLookup`, resolves the configured or built-in node component, installs measurement and drag behavior, then emits the positioned node element at `packages/react/src/components/NodeWrapper/index.tsx:44`. The DOM transform comes from `internals.positionAbsolute`; visibility stays hidden until the node has measured dimensions at `packages/react/src/components/NodeWrapper/index.tsx:184`.

### React type seam

React extends `NodeBase` with `CSSProperties`, React class names, ARIA roles, and React DOM attributes at `packages/react/src/types/nodes.ts:13`. `InternalNode` remains an alias of the shared `InternalNodeBase` at `packages/react/src/types/nodes.ts:51`. The renderer registry maps node type strings to React components.

Framework ownership therefore enters the public node type before rendering. The shared system type is framework-neutral, but the complete document type is not.

## Svelte production path

```text
<SvelteFlow bind:nodes bind:edges>
  -> createStore
    -> SvelteFlowStore.nodesInitialized derived value
      -> adoptUserNodes
  -> Zoom and Pane
    -> Viewport
      -> NodeRenderer
        -> NodeWrapper
          -> selected Svelte node component
            -> browser DOM
```

`SvelteFlow` creates one store with getter and setter bridges to the bound node, edge, and viewport values at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:72`. It exposes that store through context at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:104`.

The store uses a Svelte-reactive class. Reading `nodesInitialized` calls `adoptUserNodes` and updates the shared lookup maps at `packages/svelte/src/lib/store/initial-store.svelte.ts:111`. Its `visible` derived value returns the full node lookup or a viewport-filtered map at `packages/svelte/src/lib/store/initial-store.svelte.ts:227`.

`SvelteFlow` places `NodeRenderer` within the same viewport group as edges and the connection preview at `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte:174`. `Viewport` binds its CSS transform directly to the reactive viewport at `packages/svelte/src/lib/container/Viewport/Viewport.svelte:12`.

`NodeRenderer` creates one `ResizeObserver`, converts observations into `InternalNodeUpdate` maps, and iterates `store.visible.nodes` at `packages/svelte/src/lib/container/NodeRenderer/NodeRenderer.svelte:25`. `NodeWrapper` derives interaction flags and the component from the node plus store defaults at `packages/svelte/src/lib/components/NodeWrapper/NodeWrapper.svelte:37`. It installs drag behavior and renders the positioned element at `packages/svelte/src/lib/components/NodeWrapper/NodeWrapper.svelte:238`.

### Svelte type seam

Svelte extends `NodeBase` with Svelte class, style, role, and DOM attribute types at `packages/svelte/src/lib/types/nodes.ts:17`. `InternalNode` also aliases the shared `InternalNodeBase`. The current `NodeProps` and node component registry contain explicit `any` fields at `packages/svelte/src/lib/types/nodes.ts:46`.

## Reference tests and fixtures

The shared Playwright suite runs the node scenarios for both frameworks. It loads `/tests/generic/nodes/general`, asserts that the first three nodes become visible, and then exercises selection at `tests/playwright/e2e/nodes.spec.ts:6`.

The React fixture defines nodes, edges, flags, types, classes, and styles at `examples/react/src/generic-tests/nodes/general.ts:3`. Its host keeps nodes and edges in React state, applies emitted changes, and renders `ReactFlow` at `examples/react/src/generic-tests/Flow.tsx:20`.

The Svelte fixture carries equivalent node and edge data at `examples/svelte/src/generic-tests/nodes/general.ts:3`. Its host binds node and edge arrays to `SvelteFlow` at `examples/svelte/src/routes/tests/generic/[topic]/[example]/Flow.svelte:13`.

Relevant upstream coverage found in the imported tree includes:

- node visibility, selection, drag, drag handles, deletion, connections, hidden nodes, classes, and styles in `tests/playwright/e2e/nodes.spec.ts`;
- React component tests for basic props, handlers, controlled changes, remounting, controlled and uncontrolled state, and view props under `examples/react/cypress/components/reactflow/`;
- shared utility tests for node adoption, node position, bounds, graph utilities, and node internals under `examples/react/cypress/components/utils/`.

The upstream node tests assert behavior and selected CSS properties. They do not lock a screenshot of the initial node render. Flow's first slice adds a screenshot baseline for its own current output, not a parity claim against xyflow.

## Shape identified by this trace

Both adapters share the same domain and geometry helpers but own separate reactive stores and render trees. They converge on these operations:

1. accept a framework-specific public node array;
2. convert it to shared internal nodes by mutating lookup maps;
3. derive the visible-node set;
4. choose a framework component by node type;
5. render a positioned wrapper;
6. measure that wrapper and feed the result back into the store.

The replacement can preserve this behavior without preserving the structure. The extraction boundary is a Schema-derived document plus pure geometry and gesture transitions. Hosts own component selection and DOM lifecycle.

## Conformity and deviations

- **Conforms:** Flow decodes caller-owned nodes into a framework-neutral document before a host renders them.
- **Conforms:** The plain host positions nodes with a viewport-contained DOM transform and hides them until measurement.
- **Deviates:** Flow's public node schema does not include React, Svelte, style, or DOM attribute types. This keeps graph meaning independent of the host framework.
- **Unverified:** Custom node selection, visibility culling, parent nodes, handles, and initial fit view have no Flow implementation or conformance test.

These source comparisons do not claim parity with the upstream fixtures.
