# Flow context

## Domain

Flow renders and edits directed node graphs on a two-dimensional browser canvas.

## Terms

- **Flow document**: serializable nodes and edges owned by the caller.
- **Flow session**: viewport, selection, focus, and connection state for one editor session.
- **Geometry**: measured node, handle, and edge positions derived from the document and the DOM.
- **Gesture**: transient pointer or keyboard interaction state.
- **Host**: a plain DOM, Foldkit, Vue, or future application that composes the library and owns its lifecycle.
- **Reference**: imported xyflow source or output used as evidence for expected behavior.
- **Parity**: a behavior or rendered output that a test proves equivalent to the pinned reference.
