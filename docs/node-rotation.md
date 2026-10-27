# Node rotation

Each host has a `/rotatable-node/` recipe. An explicit `node.rotation` renders a rotation handle above the node. The field accepts finite clockwise degrees around the center of the unrotated measured box. Omitting the field means zero rotation and hides the control. Gestures emit angles in `[0, 360)` and preserve the angle between the initial grab and the node center.

## Public contract

Vanilla uses `controller.updateNode(id, { rotation })` or `controller.applyEdit(transaction)`. Vue exposes those methods through `useFlow()`. Foldkit exposes them through `createFoldkitFlowInstance(runtime.ports)`. These commands use the existing decoded edit and controlled-owner acceptance paths. No separate rotation state is required in application data.

Core exports `FlowNodeRotationSchema`, `FlowRotationGestureSchema`, `FlowRotationEventSchema`, `startFlowRotation`, `reduceFlowRotation`, `normalizeFlowRotation`, `rotateFlowPoint`, `rotatedFlowBounds`, and `unrotateFlowHandle`. The reducer accepts move, complete, and cancel events. A terminal gesture ignores subsequent events. A pointer sample at the center retains the last angle. Cancel restores the original angle.

Each host owns capture, native event admission, frame scheduling, and cleanup. Preview angles affect its rendered graph without changing the accepted document. A successful release submits one `update-node` edit. Undo restores the previous angle, and redo restores the completed angle. Escape, blur, pointer cancellation, capture loss, document replacement, and disposal cancel the preview. Auto-pan follows the existing 40-pixel edge band, configured speed, and `autoPanOnNodeDrag` switch. Cancellation restores the starting viewport.

## Geometry

Positions, origins, and measured dimensions remain unrotated layout values. The enclosing rotated rectangle supplies graph bounds, culling, fitView, intersections, public node bounds, helper-line anchors, and image framing. The minimap uses this enclosing rectangle. `getInternalNodeLayoutBounds` returns the physical box for parent-relative coordinate conversion.

Connection handles rotate with the complete node wrapper. DOM samples are inverse-rotated into local coordinates before entering the measurement state. Edge attachment points rotate the complete local offset, including the half-handle displacement. Built-in Bezier and orthogonal paths retain the declared cardinal handle sides for their tangent policy. Custom floating-edge renderers receive enclosing rectangles and own their path policy.

Grouping encloses both rotated visuals and physical layout boxes, so existing parent extents remain valid while physical positions stay fixed. Parent transforms remain translation-only, so rotating a group does not rotate its descendants. Parent extents and resizing constrain unrotated layout boxes. Shape nodes rotate their SVG, label, and handles together without changing shape data. Rotation does not invoke helper-line snapping; dragging a rotated node aligns its enclosing rectangle.

## Storage and export

Versioned saves use v6 when any node owns `rotation`, including zero. Documents without rotation retain the oldest compatible v1-v5 envelope. The v6 document and session schemas preserve earlier fields, routes, bundles, and rotation. Older envelopes containing rotation fail decoding instead of discarding it. Legacy save APIs reject rotation with `rotation-requires-versioned-session`.

Clipboard, history, and collaboration preserve the ordinary node field. Only the completed edit enters history or the room document. Image export stores the accepted rotation in its detached revision and fits the rotated enclosure. Each host's existing image renderer applies the same wrapper and edge geometry. Capture pages hide the interactive rotation control.

The [Plan 167 research trace](../research/traces/167-rotatable-node.md) records the reference boundary and acceptance evidence.
