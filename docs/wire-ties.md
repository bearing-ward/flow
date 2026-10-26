# Wire ties

Wire ties group ordinary edges into a ribbon. `FlowDocument.bundles` owns membership and graph-space tie positions. Edge IDs retain their meaning, colors, labels, selection, events and reconnect behavior. This desired feature comes from the maintainer's recording and is outside the React Flow parity catalog.

## Bundle contract

`FlowBundleSchema` and `FlowBundleCommandSchema` are Effect schemas. Their public TypeScript types derive from the schemas. A bundle has this shape:

```ts
type Bundle = {
  readonly id: string
  readonly edgeIds: readonly string[]
  readonly ties: readonly [
    { readonly x: number; readonly y: number },
    ...{ readonly x: number; readonly y: number }[],
  ]
}
```

A bundle needs at least two distinct existing edges and one finite graph-space tie point. Bundle IDs are unique within a document. An edge belongs to at most one bundle. `edgeIds` order determines lane order; tie order runs from source to target. The point contract reuses Plan 156's route schema and rejects adjacent duplicate ties. Spacing is four graph units, centered on the bundle's tie position.

`editWireTies(document, command)` prepares one `set-bundles` transaction. Commands are `add`, `add-tie`, `move-tie`, `remove-tie`, `remove-edge`, and `remove`. Invalid membership and indices fail before submission. `flowBundleChanges(previous, current)` projects accepted state changes as `bundle-add`, `bundle-update`, or `bundle-remove`. Preparation does not imply owner acceptance.

## Public host APIs

Submit the prepared transaction through the normal public edit API:

| Host | Submit | Observe accepted bundle changes |
| --- | --- | --- |
| Vanilla | `controller.applyEdit(transaction)` or `applyEditResolved` | `controller.subscribeState`, then `flowBundleChanges(previous.document, current.document)` |
| Vue | `useFlow().applyEdit(transaction)` or `applyEditResolved` | `useFlow().subscribeState`, then the same change projection |
| Foldkit | `instance.applyEdit(transaction.operations)` or the Runtime edit ports | Runtime `acceptedStates` port, then the same change projection |

`toObject()` in all three hosts also retains detached bundle intent, so its returned graph can be restored as a document. Use the versioned encoders for persisted envelopes.

All hosts render bundled geometry from the document without a separate rendering option. The `/wire-ties/` recipes compose the toolbar and browser gesture lifecycle in `apps/`, using each adapter's public API. `apps/shared/wire-ties/tool.ts` supplies the shared browser composition. Reusable graph meaning stays in `packages/core`.

The toolbar's **Tie wires** button activates the slash tool. A one-pixel guide follows the slash and the pointer tooltip says `Tie N wires`. Releasing across at least two unbundled edges creates a bundle. Lane order follows crossing distance from the slash start, independent of document order. Existing memberships are excluded from a new bundle. Crossing at least two lanes of one existing bundle offers `Add a second tie` and inserts a waypoint into that bundle's source-to-target order.

Markers are short perpendicular bars. They are focusable and selectable; Delete or Backspace removes the focused tie. Removing the final tie removes the bundle. **Remove selected edge from bundle** removes the selected edge's membership. Removing or deleting edges prunes any resulting singleton bundle. Reconnection retains membership and tie points.

A marker drag reroutes all lanes live. The preview belongs to the browser composition and does not enter accepted state. Release commits one edit and one undo step. Escape, pointer cancellation, lost capture, blur, mode changes, document changes and disposal cancel the preview. The composition reuses the canvas auto-pan delta and keeps positions in graph space during pan and zoom. Outside tie mode, the pane keeps its normal input ownership; markers remain draggable.

## Geometry and routing

`intersectFlowWireSlash` intersects a graph-space slash with flattened rendered paths, retains the earliest intersection per edge and sorts by slash distance. `flowWireSlash` resolves memberships, the count and the graph-space centroid of those crossings.

`getBundleRouteGeometry` produces lane-offset cubic splines. Every tie has a shared tangent and normal across its lanes. The short straight ribbon around a tie has four-unit lane spacing. Adjacent cubic segments share derivatives, including smooth fan-in and fan-out. `flowBundleFrame` exposes the same perpendicular marker endpoints. The built-in hosts, core hit testing and label midpoints consume this geometry. A bundle takes precedence over individual manual routes while retaining their authored intent, so unbundling restores those routes.

`createFlowRoutingRequest` includes optional `wireBundles`. `routeFlowEdges` routes each lane's fan sections through the configured `FlowRouter` and routes one shared center trunk between ties. The trunk reserves the bundle's half-width plus four extra clearance units for rounding, then every lane offsets that same corridor. This keeps lanes together on one side of an obstacle. Tie sections retain fixed lane spacing and are checked against obstacles. The derived `FlowRoutingResult.bundlePaths` contains the common path and label for each reachable bundled edge. These values never enter saved intent or history. A tie inside obstacle clearance is unreachable. Stale derived paths are ignored using the routing revision, which includes bundle membership and tie positions. Applications own routing scheduling and failure/fallback presentation as described in [edge routing](edge-routing.md).

## History, clipboard and persistence

Accepted bundle edits participate in [transaction history](transaction-history.md). A complete drag is one transaction. Pan, zoom, focus and previews do not create semantic history.

[Clipboard](graph-clipboard.md) extraction retains the induced bundle membership only when at least two copied edges remain. Paste allocates fresh bundle and edge IDs, remaps membership, preserves opaque edge data and translates tie points by the same graph-space offset as copied nodes. The paste remains one reversible edit.

`encodeVersionedFlowDocument` and `encodeVersionedFlowSession` choose **version 5** whenever the document owns a `bundles` field, including an empty list. V5 extends the frozen v4 body. Older envelopes with bundle fields fail with `bundles-require-versioned-session`; legacy writers also reject bundles. Documents without bundles continue using the oldest envelope that represents their semantics. Selection, measurements, generated routes and browser previews stay transient.

[Plan 163's trace](../research/traces/163-wire-ties.md) records production paths, acceptance results and the reference boundary.
