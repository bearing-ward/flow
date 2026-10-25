# Grouping actions

The subflow recipes expose Group selection, Ungroup, and Detach when the current selection supports each action. Meta-click adds or removes nodes from the selection in all three recipes. Shift-drag draws a selection box.

## Public APIs

Vanilla exports `createFlowGrouping(controller)`. Vue exports `useFlowGrouping()` inside the canvas provider. Foldkit exports `createFoldkitGroupingClient(runtime.ports)`. Each returns `execute(action)` with these actions:

- `{ kind: 'group', groupId, nodeIds }` wraps selected siblings in a new group.
- `{ kind: 'ungroup', groupId }` moves every direct child to the wrapper's parent and removes the wrapper.
- `{ kind: 'detach', nodeIds }` moves the named children to the top level.

The `FlowGroupingActionInput` contract accepts string IDs and decodes them with `NodeIdSchema`. Each command submits one ordinary edit transaction. The host retains its controlled or uncontrolled acceptance policy and records accepted commands as one history step. Foldkit's client also exposes `dispose()`, which releases its snapshot and edit subscriptions and settles outstanding edit responses.

Core exports `FlowGroupingActionSchema`, `FlowGroupSizingSchema`, `prepareFlowGrouping`, `refitGroupNodes`, and `refitFlowGroups`. `prepareFlowGrouping(document, measuredBounds, action)` is an Effect workflow that decodes the action and prepares the transaction. Bounds are absolute graph-space rectangles keyed by node ID. Missing measurements reject commands that need them. The existing sibling-grouping, containment, cycle rejection, and reparenting functions remain available.

## Sizing and coordinates

New groups carry `data.flowGrouping: { autoFit: true }`. This explicit extension survives existing versioned document saves through JSON data. Applications can opt existing wrappers into the same rule. Manually sized groups retain their authored size until opted in.

An opted-in group fits its direct children with 20 graph units of padding. Nested groups fit from the inside out. Refitting moves the wrapper and adjusts direct-child coordinates by the opposite amount, so descendants retain their absolute positions and edge attachments. Empty groups retain their last size until an explicit Ungroup removes them. Removing a wrapper preserves edges between surviving children.

Accepted membership, position, and authored-size changes refit before history records the semantic change. DOM measurements supply intrinsic child sizes. Foldkit observer batches register newer DOM generations before accepting their measurements; older receipts remain stale. Authored size changes invalidate old dimensions, and the recipe resamples after accepted rendering. Later measurement corrections update the current history snapshot without adding a step or clearing redo. Measurements of a wrapper do not override its authored fitted size.

The recipes retain drop-outside detachment. Drop hit testing uses the group bounds captured at drag start, before fitting changes the wrapper. Attachment requires full containment and selects the smallest eligible group, excluding the dropped node and its descendants.

The [Plan 154 trace](../research/traces/154-grouping-actions.md) records production paths, test paths, reference evidence, and verification results.
