# Dependency decisions

## Runtime dependencies

| Package | Owner | Reason | Removal boundary |
| --- | --- | --- | --- |
| `effect` | `packages/core` and application composition | Provides Schema-derived contracts, typed effects, services, resources, concurrency, structured logs, tracing, and release-matched OTLP modules. This is a project requirement. | None while Flow remains Effect-first. |
| `@effect/platform-bun` | Tooling applications | Supplies Effect implementations for files, paths, child processes, and the Bun runtime. It keeps tooling effects behind Effect services instead of direct host calls. | Replace when tooling moves to another supported runtime. |
| `vue` | `packages/vue` peer; `apps/vue` demo | Renders the Vue adapter and owns reactive component lifetimes, injection, and keyed DOM updates. The adapter uses Vue 3.5.43; Flow graph schemas and transitions remain in `@flow/core`. | Remove if the Vue adapter is retired; keep the runtime dependency scoped to Vue consumers rather than the core package. |
| `foldkit` | `apps/foldkit` | Provides the Elm-style typed Model/Message/update/view runtime for the Foldkit adapter. Version 0.163.0 requires exact `effect` and `@effect/platform-browser` 4.0.0-rc.116 peers; the workspace uses the highest Effect RC accepted by that release. | Remove if the Foldkit adapter is retired; keep the runtime dependency out of `@flow/core` and other adapter packages. |
| `@effect/platform-browser` | Workspace root / `apps/foldkit` | Satisfies Foldkit 0.163.0's exact browser-platform peer. It is pinned at 4.0.0-rc.116 to share one Effect release. | Remove with Foldkit if that adapter is retired. |
| `@effect/platform-node-shared` | Workspace tooling resolution | Pins the transitive platform shared module to 4.0.0-rc.116. `@effect/platform-bun@4.0.0-rc.116` accepts a range that also admits rc.117, which would otherwise create a mixed Effect release in the lockfile. The exact Bun package override keeps the transitive package aligned without changing any peer-dependency range. | Remove the explicit pin and override when all direct dependencies resolve matching platform modules without them. |

## Workspace package outputs

`@flow/core` ships its public JavaScript and declarations from `dist/` and declares the exact `effect` release `4.0.0-rc.116`. `@flow/vanilla` ships its public JavaScript, declarations, and stylesheet; it depends on the same exact Effect release and `@flow/core`. `@flow/vue` builds a public workspace entry point and stylesheet, depends on `@flow/core` and Effect, and declares Vue 3.5.43 as a peer. The private `apps/vue` demo consumes `@flow/vue` through the package export. The consumer install currently resolves the core and vanilla tarballs; Vue package packing remains a separate release decision. The workspace root pins `@effect/platform-bun`, `@effect/platform-browser`, `@effect/platform-node-shared`, and `effect` to `4.0.0-rc.116`, matching Foldkit 0.163.0's exact peers and preventing a mixed platform lockfile. Vite, TypeScript, Bun, and Playwright remain workspace build or verification tools rather than runtime dependencies of the core package.

## Development dependencies

| Package | Reason | Alternatives considered |
| --- | --- | --- |
| `typescript` | Compiles strict contracts and will power source analysis without another AST dependency. | Babel and ts-morph add dependencies without supplying stronger TypeScript semantics. |
| `vite` | Builds and serves the browser host with a stable URL for Playwright. | Bun HTML serving is smaller, but Vite gives predictable browser transforms and reload behavior for the first visual slices. Reassess after the renderer stabilizes. |
| `vitest` | Runs unit and contract tests in the Vite TypeScript environment, including browser-adjacent tests. | Bun test is smaller, but Vitest integrates directly with Vite and Playwright. |
| `@playwright/test` | Verifies the real browser output, interaction path, accessibility state, and later pixel parity. | DOM emulators cannot prove layout, pointer behavior, SVG output, or screenshots. |
| `@types/bun` | Types the selected tooling runtime. | Handwritten declarations would drift from Bun. |
| `oxlint` | Runs the Ultracite lint preset and repository-local anti-slop rules. | ESLint provides a larger plugin ecosystem but adds more startup time and dependencies than this workspace needs. |
| `@oxlint/plugins` | Loads the vendored anti-slop and anti-slop Effect JavaScript plugins. Its version matches Oxlint exactly. | Publishing or consuming anti-slop as an npm dependency would conflict with its vendored-source model. |
| `oxfmt` | Applies and checks the Ultracite formatting preset. | Prettier is mature, but Oxfmt keeps the formatter in the same Oxc toolchain as Oxlint. |
| `ultracite` | Supplies the shared Oxlint, Vitest, and Oxfmt policy used by workspace scripts. | Hand-maintained base rules would duplicate a large policy and make upgrades harder to audit. |
