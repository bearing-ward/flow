# Plan 103: Vue BaseEdge and EdgeText

Status: complete, 2026-10-13.

## Goal

Provide Vue `FlowBaseEdge` and `FlowEdgeText`, equivalents of React Flow's [`<BaseEdge />`](https://reactflow.dev/api-reference/components/base-edge) and [`<EdgeText />`](https://reactflow.dev/api-reference/components/edge-text). Custom `edgeTypes` components can then build edges the way React Flow examples do. Vanilla and Foldkit follow in Plan 104.

## Reference contract

The pinned source is `packages/react/src/components/Edges/BaseEdge.tsx` and `EdgeText.tsx`.

`BaseEdge`:

- It renders a visible `path`, with remaining SVG attributes and `className` forwarded to it.
- It renders an invisible interaction path with `interactionWidth` (default 20, falsy omits it), `stroke-opacity` 0 and `fill` none.
- It renders an `EdgeText` when `label` is set and `labelX` and `labelY` are numeric.

`EdgeText`:

- It measures its text with `getBBox` whenever the label changes.
- It translates its group to `(x - width/2, y - height/2)` and stays hidden until it has a measured width.
- Unless `labelShowBg` is false, it draws a background rect. The rect is padded by `labelBgPadding` (default `[2, 4]`) and rounded by `labelBgBorderRadius` (default 2).
- The text sits at `y = height / 2` with `dy="0.3em"`, and children render after the text.

## Design

- **Core.** Add `edgeTextLayout({ x, y, width, height }, padding)` to core. It returns the group translation, the background rect and the text baseline, so every host shares the arithmetic.
- **Vue.** Add `packages/vue/src/base-edge.ts`, which exports `FlowBaseEdge` and `FlowEdgeText`.
  - `FlowEdgeText` measures its text in `onMounted` and after any update that changes the label.
  - `FlowBaseEdge` forwards attributes such as `markerStart`, `markerEnd` and `style` to the visible path.
  - Neither component touches `flow-canvas.ts`.

## Tests

- **Core unit tests.** Layout for a known bounding box, default and custom padding, and the unmeasured (zero-width) case.
- **Vue browser test.** A canvas registers three `edgeTypes` components. Two use `FlowBaseEdge` with a label point taken from edge data, and one uses a standalone `FlowEdgeText` with a child element. The test checks:
  - the visible and interaction paths share the same `d`;
  - the interaction width is 20 and its opacity 0, and the path is omitted at width 0;
  - the class, stroke and marker are forwarded;
  - labels are centered on their flow point in screen space at zoom 1 and 1.25;
  - the background rect matches the measured text plus padding and radius, both default and custom;
  - `labelShowBg: false` removes the background, and children render;
  - the label re-centers after its text changes.

## Conformity and deviations

- **Conforming.** Element structure, class roles, label defaults, the measurement-driven centering, the visibility rule, and attribute precedence on the label group (caller attributes win).
- **Intentionally different.** Class names use the `flow-vue-` prefix instead of `react-flow__`, and `label` is a string, number or slot rather than a React node.
- **Intentionally different: default stroke.** The visible path gets width 1.5 as a presentation attribute. Since Plan 116 its colour comes, like React's, from library CSS: the themed `--flow-edge-stroke` applies when the caller sets no `stroke`. Caller attributes and styles override both.
- **Intentionally different: interaction path.** The interaction path is rendered for structural parity, but it is not the hit area. Vue's edge SVG layer ignores pointer events, and FlowCanvas's own per-edge hit target (sized by `edge.interactionWidth`) owns click, selection and focus. `FlowBaseEdge`'s `interactionWidth` therefore changes no behaviour.
- **Intentionally different: label pointer events.** Labels inherit the layer's `pointer-events: none`, so clicks pass through to the canvas. React's label wrapper sets `pointer-events: all`.
- **Gap.** Vue `edgeTypes` components receive `edge`, `path` and markers, but not endpoint coordinates or a label point. They cannot yet call `getBezierPath(props)` the way React's `EdgeProps` allow. This belongs to the custom edge props contract and is out of scope here.
- **Measured once, as in React.** Text is measured when it mounts and when its label changes, but not when `labelStyle` changes. Chromium's live text metrics vary slightly with zoom, so the background keeps the size measured at label time, as React's does.
- **Unverified.** A live React runtime comparison, and text measurement across fonts and engines.
