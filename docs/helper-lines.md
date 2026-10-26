# Alignment helper lines

`helperLines: true` enables node-relative alignment during pointer drags. The default is false. The shared solver uses measured absolute node bounds, including parent offsets and node origins. It compares each dragged member's center and two edges with each visible stationary node's center and edges. Dragged members and their descendants cannot become targets.

The activation distance is at most six CSS pixels, converted through the current viewport zoom. Each axis chooses the nearest candidate. Equal distances prefer centers, then leading edges, then trailing edges, followed by target and source IDs. The chosen delta moves the entire selection together.

An active guide overrides fixed-grid snapping on its axis. An unmatched axis retains the configured grid. Existing extent constraints and parent expansion still apply after alignment. Guides whose alignment is invalidated by those constraints are hidden. Guides are graph-space presentation state. They clear after commit, cancellation, or disposal, and never enter a saved document or clipboard fragment.

## Vanilla

`createFlow(element, document, { helperLines: true })` enables alignment. `controller.setCanvasOptions({ helperLines: false })` changes the option for subsequent drag samples. The controller renders the overlay and uses the same solver for preview and pointer release.

## Vue

`FlowCanvas` accepts the Boolean `helperLines` prop. The canvas owns guide presentation and disposes it with the pointer session. The shared solver feeds the existing drag constraints for both preview and release.

## Foldkit

`createProgram` accepts `helperLines: true` in its interaction-options argument. `HostAction.SetCanvasOptions({ options: { helperLines: false } })` updates it. The model's accepted document and pointer session determine both guide output and drag positions. Runtime disposal removes the rendered overlay and input subscriptions.

## History and clipboard

A complete aligned drag remains one transaction through the existing history owner. Undo and redo restore authored positions and rendered geometry. Copy and paste preserve the final positions and existing document fields. This feature introduces no document fields.

Each host exposes a `/helper-lines/` recipe. The [Plan 155 trace](../research/traces/155-helper-lines.md) records acceptance and the public-reference boundary. The six-pixel tolerance and tie order are Flow's adopted D8 policy. They do not assert undocumented Pro constants.
