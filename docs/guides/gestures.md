# Gestures and input

Flow stores gesture meaning in core schemas and transitions. The browser host owns pointer capture, DOM events, frame scheduling, and resource cleanup.

Supported interactions in the current vanilla host include primary-pointer node movement, group movement, pane panning, touch panning and pinch zoom, wheel zoom, handle connections, connection validation, selection, keyboard movement, and cancellation on lifecycle loss. See the [gesture trace](../../research/traces/node-dragging.md), the [advanced gesture tests](../../apps/vanilla/e2e/advanced-gestures.e2e.ts), and the [gesture option tests](../../apps/vanilla/e2e/gesture-options.e2e.ts).

Pointer ownership is explicit. A pinch session owns two pointer ids. A pointer cannot be claimed by two sessions at once. Escape, blur, unmount, and removal paths are covered separately in [lifecycle tests](../../apps/vanilla/e2e/advanced-gestures.e2e.ts).

Two native pointer scenarios remain unverified in Playwright: simultaneous connection plus node drag, and two-contact pinch cancellation. The tests are marked `test.fixme` because their proof requires native pointer capture behavior. Do not treat those cases as verified until a browser/device test covers them.

## Node resizing

Selecting a node exposes eight resize buttons for its sides and corners. Each button has an accessible name and a `data-direction` value. The host converts pointer movement to flow coordinates and uses core's `calculateNodeResize` result for the preview and the final `node-bounds` candidate. Left and top resizing updates the node's parent-local position while keeping the opposite edge fixed. Direct children receive the inverse local-position delta, so their world positions remain stable.

The same buttons support keyboard resizing. Focus a button and hold an arrow along its edge: Up moves a top edge outward, Down moves a bottom edge outward, Left moves a left edge outward, and Right moves a right edge outward; the opposite arrow moves that edge inward. Corner buttons accept the matching horizontal and vertical arrows in separate key gestures. Each repeated keydown adds 5 flow units, or 20 if Shift was held at the first keydown. One arrow owns the gesture until its keyup; other arrows and Shift changes during the hold do not alter it. Escape cancels and restores the authoritative node and child geometry. Window blur, owner removal or hidden state, owner deselection, and host destruction also cancel; viewport culling alone does not.

A completed resize publishes one atomic bounds change containing the resized node position and declared size plus compensated direct-child positions. Uncontrolled hosts adopt the complete change. Controlled hosts restore the authoritative position, size, and child positions until the caller acknowledges the candidate. If the resolved extent cannot satisfy the stationary-edge or minimum-size constraints, the host cancels the gesture and restores the authoritative geometry. Live measurements remain host-owned.

Keyboard resize follows the same controlled boundary: the host previews while the key is held, publishes one `node-bounds` change on keyup, then restores the authoritative geometry until a matching document update acknowledges the node and child positions together. Without acknowledgement, the proposed bounds are not adopted.

Escape, window blur, pointer cancellation, capture loss, node removal, and host destruction use the resize cancellation path. The vanilla browser acceptance cases live in [advanced-gestures.e2e.ts](../../apps/vanilla/e2e/advanced-gestures.e2e.ts); native pointer-capture cases remain unverified where Playwright cannot provide trusted capture.
