# Plan 104: Vanilla and Foldkit BaseEdge and EdgeText

Status: complete, 2026-10-13.

## Goal

Give Vanilla and Foldkit equivalents of React Flow's `<BaseEdge />` and `<EdgeText />`, completing the primitive that Plan 103 delivered for Vue. The reference contract is the one recorded in [Plan 103](103-add-vue-base-edge-and-edge-text.md).

## Design

Both hosts share core `edgeTextLayout`.

### Vanilla

- **Files and API.** `apps/vanilla/src/base-edge.ts` exports `createFlowBaseEdge(document, options)` and `createFlowEdgeText(document, options)`. Each returns `{ element, update(options), dispose }`.
- **Use in renderers.** Custom `edgeRenderers` append `element` to their `visual` group and call `update` from their instance's `update`.
- **Measurement.** Text is measured with `getBBox` when the label changes, or while it is still unmeasured and connected to the document.
- **Styles.** Style objects follow the `createFlowControls` camelCase-to-kebab convention.

### Foldkit

- **Files and API.** `packages/foldkit/src/base-edge.ts` exports the view helpers `flowBaseEdge(h, options)` and `flowEdgeText(h, options)`, which edge renderers return.
- **Rendering.** The virtual DOM renders the structure and inputs only: label point and padding as data attributes, the text, and the background element.
- **Measured geometry.** An `OnMount` action owns the measured geometry: the group translation, the rect box, the text baseline and the measured flag. It holds a scoped `MutationObserver` on its own element and re-lays out when the label point, padding or text changes. The virtual DOM never sets the attributes the mount owns, so patches don't fight it.

### Shared defaults

Both hosts' visible paths default to their canvas's built-in edge stroke, `#64748b` at width 2, set as presentation attributes. Caller attributes and styles override it. The Foldkit path uses its own class, `flow-foldkit-base-edge-path`, so the canvas's `.flow-foldkit-edge-path` CSS rule does not mask caller attributes. Tests check the computed stroke, not only the attribute.

## Tests

- **Vanilla browser test.** A Vanilla canvas whose `edgeRenderers` use `createFlowBaseEdge`, plus a standalone `createFlowEdgeText`.
- **Foldkit browser test.** The same assertions on a Foldkit Runtime whose `edgeTypes` renderers use `flowBaseEdge` and `flowEdgeText`.
- **Assertions in both.**
  - Path `d`, class, stroke and marker forwarding.
  - The interaction path's width and opacity, and its omission at width 0.
  - Labels centered on their flow point at two zooms.
  - Background padding and radius, including the background turned off.
  - Re-centering after a label change, and rendering of children or extra content.

## Conformity and deviations

- **Conforming.** Element structure, label defaults, measurement-driven centering, and visibility until measured.
- **Intentionally different.**
  - Vanilla and Foldkit expose imperative or view-helper APIs, not components.
  - Classes use each host's prefix.
  - The canvas's own hit target owns pointer input, so the interaction path is structural only, as in Vue.
  - Foldkit re-measures through a mutation observer rather than on every render.
- **Caller obligations.**
  - A Vanilla caller must call `update` after appending the element, because text can only be measured once it is connected to the document.
  - Foldkit's measured geometry depends on the mount's observer, so geometry only exists after the element is inserted.
- **Unverified.** A live React runtime comparison, and text measurement across fonts and engines.
