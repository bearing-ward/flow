# Flow project standards

This project adopts the architecture rules from HVS Template commit `275c2013b54920055db091be00ca29ef096af3b8` and narrows them for a graph-canvas library.

## Invariants

1. Graph meaning does not depend on a UI framework, browser API, or storage implementation.
2. Effect owns effectful workflows, capabilities, typed failures, resources, concurrency, and observability.
3. Effect Schema owns runtime data contracts. TypeScript types are derived from those schemas.
4. External JavaScript and TypeScript values enter as `unknown` and are decoded once at a boundary.
5. Applications own browser and framework lifecycle. Packages own domain knowledge and supported contracts.
6. The pinned xyflow artifacts are evidence. They are not the architecture of the replacement.
7. A parity claim requires a test against reference behavior or output.
8. `bun run verify` is the complete local verification command.
9. Every researched behavior is classified as reference-conforming, intentionally different, or unverified. An intentional difference records its reason and test boundary.
10. Effect workflows use named spans and structured logs at decode, lifecycle, semantic-change, and failure boundaries. Application composition owns OpenTelemetry export and shutdown flushing.

## Initial layout

```text
packages/
  core/
    src/
      domain/
      ports/
      use-cases/
      adapters/
      interfaces/
      composition/

apps/
  vanilla/

research/
  artifacts/
  generated/
  traces/
```

Start each role with one cohesive file. Add a package or directory only when it owns a contract, dependency boundary, lifecycle, or body of graph knowledge.

## Research before redesign

For each feature, record:

1. the public entry point;
2. the complete production call path;
3. input, internal, and output types;
4. state ownership and mutation points;
5. DOM and scheduler effects;
6. React and Svelte seams;
7. all relevant upstream tests and fixtures;
8. observed output and behavior;
9. gaps or unverified assumptions.
10. conformity with the reference and each intentional deviation;
11. useful span names, attributes, logs, and failure context.

Only then compare the reference structure with candidate Effect-first designs.

Do not treat a source-level similarity as parity. A conformity claim names the matching behavior and evidence. A deviation names the reason. Missing behavior stays unverified.

## Dependency policy

Every dependency needs a recorded owner, purpose, alternatives considered, and removal boundary in `docs/dependencies.md`. Prefer platform and browser APIs when they provide the required behavior and a test can prove it.
