# xyflow research

The research tree preserves upstream evidence and records what Flow has verified.

## Product coverage

The [React Flow catalog map](catalogs/react-flow-coverage.md) inventories the API, examples, and UI sidebars against the project's definitive goal. It records partial mappings and open work separately for plain JavaScript, Vue, and Foldkit. The [dated website snapshot](catalogs/react-flow-2026-09-26.json) is a coverage baseline; it is separate from the pinned source artifacts and does not prove behavioral parity.

Run `bun run scripts/check-react-flow-catalog.ts` to check row coverage and local evidence links. Add `--upstream` to compare the current website sidebars and public Pro list with the snapshot. The live check reports drift without rewriting the baseline. Use [project progress](PROGRESS.md) for aggregate status.

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
