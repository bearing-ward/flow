# Flow

Flow is an Effect v4 graph canvas with a shared core and plain JavaScript, Foldkit, and Vue browser hosts. The vanilla host has the broadest rendering and interaction surface. All three hosts run the eight shared rendering scenarios and four public-state contract fixtures; their feature surfaces are documented separately in [architecture](docs/architecture.md).

Flow's definitive goal is to match the [React Flow public API](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI components and templates](https://reactflow.dev/ui) as closely as each supported framework permits. This is the project ambition, separate from the capabilities demonstrated today; see the [definitive project goal](research/PROGRESS.md#definitive-project-goal) for its milestones and evidence requirements.

Use [project progress](research/PROGRESS.md) for the current checklist and open work, and the [plan index](plans/README.md) for completed implementation slices and their verification boundaries. See [architecture](docs/architecture.md) for ownership and behavior decisions, [browser support](docs/browser-and-accessibility.md) for test limits, and [release process](docs/release-process.md) for delivery status. [Research fixtures](research/fixtures/README.md) distinguish Flow behavior from direct comparison with the pinned xyflow source.

## Acknowledgements

Flow is built on the incredible work of the team behind [React Flow](https://reactflow.dev) and the [xyflow](https://github.com/xyflow/xyflow) libraries. Their API design, examples, documentation and tests are the reference Flow measures itself against, and much of this project would not exist without them. Flow is an independent project and is not affiliated with or endorsed by xyflow. If you build with React or Svelte, use their libraries directly, and consider [supporting their work](https://reactflow.dev/pro).

## Current capabilities

The core validates and queries nested graph documents, computes geometry and edge paths, and provides a versioned persistence envelope. The vanilla host adds custom node and edge renderers, measurement, selection, movement, connections, viewport interactions, backgrounds, controls, minimap, and anchored toolbars. Its JavaScript facade supports mount, update, commands, subscriptions, and destruction. These capabilities have local tests; they do not establish full xyflow feature or visual parity.

The Vue host exports `FlowViewportPortal` for graph-positioned slot content that follows its canvas pan and zoom transform, `FlowNodeToolbar` for fixed-size screen-space controls anchored to measured nodes, and `FlowEdgeToolbar` for the same kind of controls anchored to a flow-space point on an edge. Each portal/overlay target is owned by its `FlowCanvas`; see the reusable UI trace and Vue E2Es for their tested scope.

## Commands

```sh
bun install
bun run research:import
bun run dev
bun run check
bun run fix
bun run verify
bun run verify:full
```

`bun run check` runs Ultracite Oxlint and Oxfmt checks. `bun run fix` applies supported fixes and formatting. `bun run verify` temporarily runs a focused development gate; add checks for the active work in `verification.config.json` or with CLI options. `bun run verify:full` retains the complete local suite. See [tooling](docs/tooling.md) for profiles, scope selection, and restoration of the full default.

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) after starting the development server. The source `index.html` is a Vite entry point; a `file://` URL displays launch instructions.

See [research](research/README.md) for the pinned source and trace coverage, and [observability](docs/observability.md) for telemetry configuration and verification limits.

## Workflow editor

Each host provides `/workflow/` with a palette, typed configuration, validation, an offline simulator, measured ELK layout, history, clipboard, themes, and versioned local JSON export/import. See the [workflow package contract](packages/workflow/README.md#base-editor-and-local-persistence) for public APIs, the save policy, and acceptance boundaries.

The [workflow guide](docs/workflows.md) covers keyboard operations, simulation, and local saves. The [optional integration index](docs/optional-integrations.md) links routing, collaborative rooms, server image export, measured layout, and workflow contracts.
