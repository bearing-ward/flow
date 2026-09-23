# Dependency decisions

## Runtime dependencies

| Package | Owner | Reason | Removal boundary |
| --- | --- | --- | --- |
| `effect` | `packages/core` and application composition | Provides Schema-derived contracts, typed effects, services, resources, concurrency, structured logs, tracing, and release-matched OTLP modules. This is a project requirement. | None while Flow remains Effect-first. |
| `@effect/platform-bun` | Tooling applications | Supplies Effect implementations for files, paths, child processes, and the Bun runtime. It keeps tooling effects behind Effect services instead of direct host calls. | Replace when tooling moves to another supported runtime. |

## Development dependencies

| Package | Reason | Alternatives considered |
| --- | --- | --- |
| `typescript` | Compiles strict contracts and will power source analysis without another AST dependency. | Babel and ts-morph add dependencies without supplying stronger TypeScript semantics. |
| `vite` | Builds and serves the browser host with a stable URL for Playwright. | Bun HTML serving is smaller, but Vite gives predictable browser transforms and reload behavior for the first visual slices. Reassess after the renderer stabilizes. |
| `vitest` | Runs unit and contract tests in the Vite TypeScript environment. Its major version matches the peer range required by the pinned `@effect/vitest` release. | Bun test is smaller, but `@effect/vitest` and browser-adjacent tests fit Vitest directly. |
| `@effect/vitest` | Runs Effect tests with native Effect test helpers and service lifecycles. | Plain Vitest wrappers would duplicate Effect test setup. |
| `@playwright/test` | Verifies the real browser output, interaction path, accessibility state, and later pixel parity. | DOM emulators cannot prove layout, pointer behavior, SVG output, or screenshots. |
| `@types/bun` | Types the selected tooling runtime. | Handwritten declarations would drift from Bun. |
| `oxlint` | Runs the Ultracite lint preset and repository-local anti-slop rules. | ESLint provides a larger plugin ecosystem but adds more startup time and dependencies than this workspace needs. |
| `@oxlint/plugins` | Loads the vendored anti-slop and anti-slop Effect JavaScript plugins. Its version matches Oxlint exactly. | Publishing or consuming anti-slop as an npm dependency would conflict with its vendored-source model. |
| `oxfmt` | Applies and checks the Ultracite formatting preset. | Prettier is mature, but Oxfmt keeps the formatter in the same Oxc toolchain as Oxlint. |
| `ultracite` | Supplies the shared Oxlint, Vitest, and Oxfmt policy used by workspace scripts. | Hand-maintained base rules would duplicate a large policy and make upgrades harder to audit. |
