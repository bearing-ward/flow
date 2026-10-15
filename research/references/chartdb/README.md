# ChartDB reference capture

Plan 121 reference evidence only. ChartDB stays outside Flow at `/tmp/chartdb-ref/src`, pinned to `c24936a402bb3e24b4858f05282d69a04fcfe25b`. No ChartDB implementation, stylesheet, or asset is vendored here. The screenshots and exported image are observations of its UI.

From the Flow root, run:

```sh
bash research/references/chartdb/capture.sh
```

The command requires Git, npm, Bun, Node, curl, and lsof. It clones the missing reference checkout, installs its locked npm dependencies, installs Flow's locked tools and Chromium, starts Vite strictly on `127.0.0.1:4190`, runs the capture, validates the evidence, regenerates REFERENCE.md, and stops the Vite process it started. An occupied port or modified/wrong reference checkout fails the command. It never uses ports 4173–4178 or Flow's browser lock.

When already running the pinned server on 4190, run just the harness:

```sh
bunx playwright test -c research/references/chartdb/playwright.config.mjs
node research/references/chartdb/source-evidence.mjs
node research/references/chartdb/enrich-results.mjs
node research/references/chartdb/validate-results.mjs
node research/references/chartdb/write-reference.mjs
```

The dedicated config discovers only `scenarios.spec.mjs`. One serial Playwright test runs S1 through S16 as named steps; per-scenario JSON records provide the individual outcomes. Flow's Playwright configs discover host `e2e/*.e2e.ts`; Vitest and TypeScript also have explicit source lists that exclude this folder. Only these external research scripts are excluded from the application lint rules. Markdown and JSON remain formatted by Oxfmt. No application dependency was added.

The setup uses the UI to create an empty PostgreSQL diagram, chooses Actions → Import → DBML, types the original sample into the editable Monaco editor, and imports it. It creates two areas, moves their named member tables through context menus, edits two notes, enables database views, and creates `bestsellers` with two pointer-drawn dependencies. Name changes wait for the production debounce to save. The star request is dismissed with its "Not now" button after its 30-second timer.

Each scenario restores a browser storage snapshot of that UI-built fixture in a fresh context. Subsequent edits use Playwright mouse, wheel, and keyboard events, plus locator actions for editable controls. Page evaluation reads DOM geometry, computed styles, local settings, and IndexedDB through read-only transactions. A one-shot pointer observer records the actual trusted context-menu input and its click-time camera. It does not call React internals, import ChartDB modules, or mutate application state. Fixture restoration is a test initialization path, distinct from the UI setup and production input paths traced in [REFERENCE.md](REFERENCE.md).

`results/S1.json` through `results/S16.json` contain before/after observations and scenario-specific intermediate results. DOM nodes are the rendered subset because ChartDB enables viewport culling. The `persisted` section includes offscreen entities but is not proof of their rendered output. Positions are graph coordinates; `screen` rectangles are CSS pixels. SVG marker URLs encode both cardinality and endpoint side. Markerless dependency sides are derived from the recorded SVG path's outward terminal segments by enrich-results.mjs. The JSON records that derivation separately from marker-based sides. Z-indices are read from node wrappers and each edge's SVG wrapper. Measurements round to three decimals; IDs and timestamps change on rerun.

`results/screenshots/` contains light and dark captures. `results/export.png` is the actual UI download. `results/sources.json` identifies the reference commit, installed React Flow versions, sample and lockfile hashes, and hashes of cited source files. Generated output is overwritten on rerun. Playwright scratch files and reports stay under `/tmp/chartdb-ref/`.

The harness is outside Flow's test globs and is not part of `bun run verify`; its scripts are excluded from lint in `oxlint.config.ts`.
