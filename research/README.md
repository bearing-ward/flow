# xyflow research

The research tree preserves upstream evidence and records what Flow has verified.

## Artifact layout

`artifacts/xyflow/<commit>/` contains verbatim copies of:

- `packages/system`
- `packages/react`
- `packages/svelte`
- `tests/playwright`
- `examples/react`
- `examples/svelte`
- root license, package, workspace, lockfile, and build metadata

`SOURCE.json` records the repository and commit. `FILES.tsv` records the upstream Git object ID and path for every imported file.

Run `bun run research:import` to reproduce the import. The script replaces only the directory for its pinned commit.

## Research output

Generated inventories belong in `generated/`. Human-reviewed call paths belong in `traces/`. A trace is complete only when it identifies the production entry point, types, state transitions, external effects, rendered result, and relevant tests.

The first trace will cover initial canvas and node rendering. Later traces will cover viewport initialization, pan and zoom, node measurement, dragging, selection, handles, connection creation, edge rendering, and auxiliary controls.
