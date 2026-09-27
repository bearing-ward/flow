# Code-quality tooling

Flow uses Ultracite with the Oxlint and Oxfmt toolchain. All four direct development dependencies use exact versions:

- `ultracite@7.12.0`
- `oxlint@1.85.0`
- `@oxlint/plugins@1.85.0`
- `oxfmt@0.70.0`

`oxlint.config.ts` extends the Ultracite core and Vitest presets. It also loads the vendored anti-slop generic and Effect plugins. `oxfmt.config.ts` uses the Ultracite Oxfmt preset. Both configurations ignore imported research evidence, generated research indexes, build output, agent directories, and the vendored plugin source. Oxfmt also skips `docs/api-reference.md` because it is generated; `bun run docs:check` verifies its freshness and links without rewriting generated TypeScript code blocks.

## Commands

Use these read-only checks:

```sh
bun run lint
bun run format:check
bun run check
bunx ultracite doctor
```

## Browser test servers

Playwright starts a fresh Vite server for each suite and binds it to a test-only loopback port: vanilla uses `4176`, Vue uses `4177`, and Foldkit uses `4178`. Development servers keep their existing ports (`4173`, `4174`, and `4175`); for example, `bun run dev` still serves vanilla at `http://127.0.0.1:4173/`.

Each test server uses strict port binding. If a test reports that its port is already in use, identify the process and stop only a process you own, or rerun after its owner releases that port. Do not change the test URL to reuse an existing server; the browser gate must exercise the checkout under test.

`bun run check` runs both Ultracite checks. Use the write commands only when formatting or lint cleanup is the current task:

```sh
bun run lint:fix
bun run format
bun run fix
```

## Browser performance benchmark

Run the focused benchmark with:

```sh
bunx playwright test apps/vanilla/e2e/performance.e2e.ts --workers=1
```

The test reports median and p95 durations, sample counts, browser user agent, and minimap SVG child counts. It measures public `controller.update` reconciliation for 250 nodes / 6 edges and 1,000 nodes / 25 edges with the minimap off and on. It also compares 1,000-node fixtures with 125 and 500 edges. The 4,000-node fixture uses 100 edges and viewport culling to keep the browser gate tractable; its single sample is informational. A separate 1,000-node drag fixture records seven pointer-move frame samples and minimap subtree mutations with the minimap enabled and disabled.

No absolute latency threshold is enforced. On the initial Darwin / HeadlessChrome 151.0.7922.34 runs, the 1,000-node / 125-edge p95 varied from 430.3 to 499 ms, and the 500-edge p95 varied from 431.9 to 602.1 ms. The four-sample timings and single un-warmed 4,000-node timings do not establish a stable large-graph latency budget. Stable assertions cover finite timings, repeatable per-sample mutation counts, no minimap DOM writes for unchanged-document updates, and no minimap subtree mutations when minimap UI is disabled during drag. Keep the large-graph latency budget open until target-hardware runs provide enough repeat samples to justify a threshold.

## Initial baseline

Ultracite Doctor reports eight passing setup checks with no warnings or failures. The first repository check found 465 lint errors across 18 owned files and formatting changes in 22 files after the generated configuration was normalized. The largest groups are readable-spacing, sorted-key, curly-brace, array-type, type-assertion-comment, generator-name, and Vitest findings.

`bun run verify` starts with `bun run check`, before documentation, research, build, test, and browser work. Keep this gate read-only; use targeted formatter or lint-fix commands only when the files being changed need cleanup.

## Anti-slop provenance

The anti-slop source is vendored at `tools/oxlint/anti-slop/`. Its `UPSTREAM.md` records the exact upstream commit and installed entry points. Update it through the installed `install-anti-slop` skill. Do not replace local source without reviewing upstream and preserving local changes.
