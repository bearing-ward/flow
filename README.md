# Flow

Flow is an Effect v4 graph-canvas library derived from researched xyflow behavior. The project starts with a plain DOM host, then adds Foldkit and Vue hosts after the core contracts stabilize.

See [`HANDOFF.md`](HANDOFF.md) for the current implementation state, decisions, commands, and next work.

## Current slice

The current implementation proves these contracts:

1. xyflow research evidence can be reproduced from a pinned commit.
2. graph data is decoded from Effect Schema-derived contracts.
3. a plain DOM controller can reconcile nodes, drag them, pan and zoom the viewport, and publish semantic changes.
4. Effect scopes release browser resources on explicit destruction and interruption.
5. application composition can export correlated OTLP logs, metrics, and traces.
6. graph documents reject duplicate identifiers and missing edge endpoints before adapter state exists.
7. declared handles support a strict pointer connection that emits an edge-add change.
8. measured handles anchor keyed straight SVG edges that follow node movement and viewport transforms.
9. straight, Bezier, simple-Bezier, step, and smooth-step paths render from the same measured handles.
10. keyed edge labels, arrows, and validated stroke styling update with geometry.
11. pointer and keyboard edge selection, focus, and endpoint reconnection work in controlled and uncontrolled document modes.
12. selected-edge deletion, per-edge interaction rules, configurable hit width, and accessible names are browser-tested.
13. node selection and focus, hidden and stacked edges, and opt-in viewport culling are available in the vanilla host.
14. the development page shows the current paths, interactions, edge and node visibility toggles, and a distant culling example.
15. modifier clicks and Shift-drag selection select multiple nodes and connected edges, with controlled acknowledgement.
16. arrow keys move selected nodes by 5 flow units, or 20 with Shift; dragging a selected node moves its selected group.
17. rectangle selection supports full or partial overlap, with edge-driven viewport pan.
18. one-touch pane pan and two-touch pinch publish viewport changes; the development page demonstrates the gestures.

## Commands

```sh
bun install
bun run research:import
bun run dev
bun run check
bun run fix
bun run verify
```

`bun run check` runs the Ultracite Oxlint and Oxfmt checks. `bun run fix` applies supported fixes and formatting. The Oxlint configuration also loads the vendored anti-slop and anti-slop Effect rules from `tools/oxlint/anti-slop/`.

See [`docs/tooling.md`](docs/tooling.md) for direct commands, installed versions, ignores, anti-slop provenance, and the initial cleanup baseline.

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) after starting the development server. The source `index.html` is a Vite entry point and does not run directly from a `file://` URL; when opened that way, it displays the correct launch instructions.

The source inventory and call-stack research are incomplete until the generated research index and per-feature traces cover every imported package path. See `research/README.md`.

See [`docs/observability.md`](docs/observability.md) for OTLP configuration, signal paths, data limits, shutdown behavior, and verification boundaries.
