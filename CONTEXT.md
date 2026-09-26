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

## Project goal

Flow aims to match the [React Flow public API](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI components and templates](https://reactflow.dev/ui) as closely as each supported framework permits. Translate framework-specific hooks, providers, composition, reactivity, and lifecycle into idiomatic equivalents while preserving familiar contracts where practical. This ambition does not assert that a host currently provides a capability or that parity has been proven; the current checklist and evidence boundaries are in [project progress](research/PROGRESS.md#definitive-project-goal).
