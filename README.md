# Flow

Flow is an Effect v4 graph canvas with a shared core and plain JavaScript, Foldkit, and Vue browser hosts. The vanilla host has the broadest rendering and interaction surface. Foldkit and Vue implement the six shared adapter conformance scenarios; their feature surfaces are documented separately in [architecture](docs/architecture.md).

Flow's definitive goal is to match the [React Flow public API](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI components and templates](https://reactflow.dev/ui) as closely as each supported framework permits. This is the project ambition, separate from the capabilities demonstrated today; see the [definitive project goal](research/PROGRESS.md#definitive-project-goal) for its milestones and evidence requirements.

Use [project progress](research/PROGRESS.md) for the current checklist and open work, and the [plan index](plans/README.md) for completed implementation slices and their verification boundaries. See [architecture](docs/architecture.md) for ownership and behavior decisions, [browser support](docs/browser-and-accessibility.md) for test limits, and [release process](docs/release-process.md) for delivery status. [Research fixtures](research/fixtures/README.md) distinguish Flow behavior from direct comparison with the pinned xyflow source.

## Current capabilities

The core validates and queries nested graph documents, computes geometry and edge paths, and provides a versioned persistence envelope. The vanilla host adds custom node and edge renderers, measurement, selection, movement, connections, viewport interactions, backgrounds, controls, minimap, and anchored toolbars. Its JavaScript facade supports mount, update, commands, subscriptions, and destruction. These capabilities have local tests; they do not establish full xyflow feature or visual parity.

## Commands

```sh
bun install
bun run research:import
bun run dev
bun run check
bun run fix
bun run verify
```

`bun run check` runs Ultracite Oxlint and Oxfmt checks. `bun run fix` applies supported fixes and formatting. See [tooling](docs/tooling.md) for versions and direct commands. `bun run verify` runs the complete local project gate.

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) after starting the development server. The source `index.html` is a Vite entry point; a `file://` URL displays launch instructions.

See [research](research/README.md) for the pinned source and trace coverage, and [observability](docs/observability.md) for telemetry configuration and verification limits.
