## Architecture

Follow `docs/standards.md`. Keep graph meaning and Effect workflows in `packages/`. Keep browser and framework lifecycle code in `apps/`.

## Research evidence

Treat `research/artifacts/` as immutable upstream evidence. Regenerate it with `bun run research:import`. Do not hand-edit imported files.

For call paths, start at the real browser or public API entry point and trace through state, geometry, DOM effects, and rendered output. Cite exact `path:line` locations. Document production and test paths separately when they differ.

End every research trace with a `Conformity and deviations` section. Label compared behavior as conforming, intentionally different, or unverified. State why Flow differs and name the test boundary. Do not turn source similarity into a parity claim.

## Observability

Use the span names and attributes in `packages/core/src/telemetry/flow-telemetry.ts`. Add Effect spans and structured logs at decode, lifecycle, semantic-change, and failure boundaries. Keep high-frequency pointer moves out of logs. Application composition owns optional OTLP export and shutdown flushing. Do not claim OpenTelemetry delivery without a collector-side test.

## Verification

Run `bun run verify`. A build or typecheck alone is not completion evidence.

Temporarily, verification defaults to the focused profile: quality, architecture, package builds, typechecking, and unit tests. Add checks and browser test files relevant to the active work in `verification.config.json` or through the CLI options documented in `docs/tooling.md`. Update that scope when changing tasks. Use `bun run verify:full` at integration or release milestones and before broad parity claims. Report which profile and scope passed; a focused pass does not establish full-suite acceptance. Restore the full default by changing `defaultProfile` to `full` in the config.
