# Desired features

These are features the maintainer wants that go beyond React Flow and React Flow Pro. They are not part of the parity denominator. Each entry is a behavioural breakdown, written so it can become a plan.

## Wire ties (edge bundling by gesture)

Source: maintainer screen recording, 2026-10-25, of a node-graph editor ("Code Review" canvas, Edit mode). Nodes have many labelled ports, and colored edges cross the canvas between them.

### Observed behaviour

1. **Slash to tie.** In empty canvas space, the user drags a straight line across several edges. A thin guide line follows the pointer. While the line crosses edges, a tooltip next to the pointer reports the result, such as "Tie 3 wires". Releasing creates a tie.
2. **Bundled ribbon.** The tied edges no longer take independent curves. They run parallel, at a fixed small spacing, through the tie point, forming a ribbon. Each edge keeps its own color and stroke. The edges fan out smoothly from the ribbon to their own source and target handles.
3. **Tie marker.** A short bar drawn perpendicular to the ribbon marks the tie.
4. **Add a second tie.** Slashing across an existing ribbon shows "Add a second tie". Releasing adds another tie point to the same bundle, so the ribbon passes through several waypoints in order.
5. **Drag a tie.** Dragging a tie marker moves that waypoint. The whole ribbon reroutes live, which lets the user steer bundles around nodes.
6. **Persistence across viewport changes.** Ties keep their graph-space positions while panning and zooming, and the bundle continues to route as nodes move.
7. **Mixed bundles.** A tie can hold edges with different sources and targets and different colors. The ribbon order follows the order in which the edges crossed the slash.

### Not shown, so these decisions are open

- How a tie is removed: by deleting the marker, by slashing again, or with a modifier.
- How a tie is selected, and what keyboard and accessibility affordances it has.
- Whether one edge can belong to several bundles at once.
- Whether removing one edge from a bundle is supported.
- What the gesture's activation key is, and how it is kept separate from selection-box drag and pane pan. The recording starts in empty space with the plain pointer.
- What happens to ties when an edge is reconnected or deleted.
- Whether ties are serialised in the document.

### Capabilities it needs from Flow

- **Data model.** A document-level `bundle` record listing its edge IDs in order and its tie points as an ordered list of graph positions. It is versioned and schema-decoded in core like other document fields, and it produces change events (add, update, remove).
- **Geometry.**
  - Route each edge as a spline through each tie point, offset sideways by its lane index times the spacing.
  - Make the fan-in and fan-out smooth and tangent-continuous.
  - Expose the result as a pure core function so all hosts share it.
- **Hit testing.** A segment-versus-rendered-edge-path intersection test in graph space, which returns the crossed edge IDs in crossing order. It reuses the existing edge path geometry.
- **Interaction.**
  - A pane slash gesture with a live guide line and a live count tooltip.
  - A draggable tie handle.
  - Integration with the existing pointer-capture, cancellation and auto-pan rules.
- **Hosts.** Vanilla, Vue and Foldkit. Each needs a recipe, and each needs browser tests covering the slash, the count, the second tie, dragging, and pan/zoom.
- **Edges.** Bundled edges stay ordinary edges for selection, labels and events. Only their path changes.

### Related Pro and React Flow capabilities

- **Editable Edge (Pro)** provides draggable path control points. Wire ties generalise this to many edges sharing control points.
- **Edge Routing (Pro)** provides obstacle-aware paths.
