# Shape nodes

The `/shapes/` recipe in Vanilla, Vue, and Foldkit creates circle, diamond, and hexagon nodes from a sidebar. Selecting a shape reveals a color toolbar that follows its rendered bounds. Native canvas controls handle connections, movement, resize, pan, and zoom.

## Document contract

`flowFigureNodeType` reserves the node type `'shape'`. `FlowFigureDataSchema` requires `data.type` to be `circle`, `diamond`, or `hexagon`, and `data.color` to be one of `#ff0071`, `#1a8cff`, `#00b884`, or `#ffb300`. Other JSON data keys remain application-owned. Custom node types other than `'shape'` keep opaque data.

Shape nodes require positive, finite `node.size` bounds. Shared document decoding rejects a missing size or malformed shape data before an edit, load, or clipboard fragment replaces accepted state. Arbitrary SVG strings are outside the recipe contract.

`flowFigurePath(kind)` returns a normalized SVG path in a `0 0 100 100` view box. Every renderer scales that path affinely to the complete node bounds. A nonsquare circle therefore appears as an ellipse. The SVG and label do not determine intrinsic size. Creation removes wrapper padding, border, and rectangular background so the measured bounds match the authored size.

The initial handles are a left target and right source. Their centers lie at the outline's horizontal extrema. Edge endpoints retain Flow's normal attachment to the outside of each handle box. Handle IDs survive color and size changes. Clipboard paste can remap IDs; rendering depends on their role and side. Selection, hit testing, layout, and resizing use rectangular node bounds.

## Shared edits

`prepareFlowFigureEdit(document, command)` returns an Effect containing an ordinary `FlowEditTransaction`. The host's existing edit owner accepts that transaction.

```ts
const transaction = await Effect.runPromise(
  prepareFlowFigureEdit(document, {
    kind: 'create',
    id: 'decision',
    position: { x: 240, y: 160 },
    figure: { type: 'diamond', color: '#ff0071' },
  })
)
```

Creation defaults to 120 by 120 graph units. An optional `size` supplies different explicit bounds. Duplicate IDs fail with `InvalidFigureNode`. A color command has `{ kind: 'color', nodeId, color }`; it produces a data merge that preserves unrelated metadata and rejects a missing shape target. Public kind, color, command, and data types derive from Effect schemas.

## Vanilla API

`flowFigureNodeRenderer` registers under `nodeRenderers[flowFigureNodeType]`. `createFlowFigureMiniMapNode(props, node, owner?)` supplies custom SVG through `createFlowMiniMap`'s `nodeComponent`. The callback resolves the node from the same controller with `controller.getNode(props.id)`. `nodesResizable: true` enables the canvas resize controls. Creation and color changes use `controller.applyEdit(transaction)`.

The renderer owns its content DOM and releases it through its renderer lifecycle. The recipe disposes controls, subscriptions, minimap, and controller on teardown.

## Vue API

`FlowFigureNode` registers under `FlowCanvas.nodeTypes[flowFigureNodeType]`. `renderFlowFigureMiniMapNode(props, node)` supplies the `FlowMiniMap` node slot. The slot resolves the current node through `useFlow().getNode(props.id)`. `FlowCanvas.nodesResizable` enables the canvas resize path. Shared transactions use `useFlow().applyEdit(transaction)`.

Vue owns the component views and reactive document subscription. Scope disposal removes the recipe controls and their observers.

## Foldkit API

`foldkitFigureNodeRenderer` registers under `createProgram`'s `nodeTypes[flowFigureNodeType]`. `createFoldkitFigureMiniMapNode(props, node, owner)` supplies the custom minimap callback. The recipe updates the node lookup and minimap from the same accepted-state publication. `nodesResizable` in interaction options enables the model's resize controls. Shared transactions use `createFoldkitFlowInstance(ports).applyEdit(transaction.operations)`.

The renderer uses the Foldkit HTML builder. Runtime teardown releases the measurement observer, accepted-state subscription, viewport client, history client, instance client, and minimap.

## History, clipboard, and storage

Creation, color changes, movement, connection creation, and resize use existing accepted-state history. Each committed gesture is one undo step. Selecting a node or changing the viewport adds no history entry. Unchanged colors add no entry.

Shape intent uses existing `type`, `data`, `size`, `style`, and `handles` fields, so it introduces no saved-document version. Versioned save and load retain shape intent and opaque metadata. Session clipboard paste preserves the same fields and remaps IDs through the shared clipboard owner. See [transaction history](transaction-history.md) and [graph clipboard](graph-clipboard.md).

The [Plan 158 trace](../research/traces/158-shape-nodes.md) records production paths, gesture tests, reference evidence, and verification results.
