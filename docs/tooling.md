# Code-quality tooling

Flow uses Ultracite with the Oxlint and Oxfmt toolchain. All four direct development dependencies use exact versions:

- `ultracite@7.12.0`
- `oxlint@1.89.0`
- `@oxlint/plugins@1.89.0`
- `oxfmt@0.74.0`

`oxlint.config.ts` extends the Ultracite core and Vitest presets. It also loads the vendored anti-slop generic and Effect plugins. `oxfmt.config.ts` uses the Ultracite Oxfmt preset. Both configurations ignore imported research evidence, generated research indexes, build output, agent directories, and the vendored plugin source. Oxfmt also skips `docs/api-reference.md` because it is generated; `bun run docs:check` verifies its freshness and links without rewriting generated TypeScript code blocks.

## Commands

Use these read-only checks:

```sh
bun run lint
bun run format:check
bun run check
bunx ultracite doctor
```

## Verification profiles

Local verification defaults to `focused`. Its baseline runs quality checks, architecture checks, one build of all eight packages, workspace typechecking, and unit tests. Browser scope combines changed e2e files, optional pinned files, and CLI selections.

```sh
bun run verify
bun run verify --vue measured-geometry.e2e.ts --check catalogs
bun run verify --vanilla advanced-gestures.e2e.ts --foldkit measured-geometry.e2e.ts
bun run verify --list
bun run verify --full --list
bun run verify:full
```

Changed browser files come from `git diff` against `git merge-base HEAD main`, including staged and unstaged changes, plus untracked files. Deleted files are excluded. Only files under `apps/vanilla/e2e/`, `apps/vue/e2e/`, and `apps/foldkit/e2e/` select browser tests. Changes to shared acceptance modules do not select their host wrappers automatically. Add those wrappers with CLI flags or pins. A missing `main` merge base fails selection with the Git diagnostic.

Keep optional checks and a short pinned browser scope in the root `verification.config.json`:

```json
{
  "defaultProfile": "focused",
  "checks": [],
  "pinned": {
    "vanilla": [],
    "vue": [],
    "foldkit": []
  }
}
```

`pinned` is optional. Browser flags accept exact filenames relative to the host's `e2e` directory. Repeat a flag to select several files. Selection deduplicates changed files, pins, and CLI additions. The verifier rejects nonexistent pinned or requested files before running checks. Both profiles use one browser worker and isolated test servers. `--list` prints the resolved checks and browser files without running them.

`--check` accepts `docs`, `catalogs`, `calibration`, `inventory`, `traces`, `consumer`, `build`, `vue-build`, `foldkit-build`, `upstream-ledger`, `collaboration`, `reference-host`, and `site`. `catalogs` runs catalog coverage, API member inventory, contract ownership, proof matrix, and example recipe rules in one process with shared JSON parsing. `inventory` compares generated output in memory. `bun run research:inventory` still writes that output.

The full profile retains every extra check except the opt-in React reference host, all three app builds, packed consumers, and every host browser file. It ignores focused filters. `--focused` overrides a full configured default. Full verification is required at integration and release milestones. A focused pass proves only its reported selection.

After the baseline package build passes, verification passes `FLOW_PACKAGES_PREBUILT=1` to later commands. App builds, browser servers, and nested package build scripts reuse those eight package outputs. Standalone commands build normally. The Vanilla app emits to `apps/vanilla/dist/app`, preserving the package exports beside that directory. `scripts/build-packages.ts [package...]` builds selected packages and their core dependency in dependency order, then rewrites declaration import extensions. With no arguments it builds all eight packages.

CI runs only when started manually (automatic pull request and `main` push runs are muted for now) and defaults to `full`. Manual runs can choose either profile; manual full runs also run the release dry run. Local defaults remain controlled by `defaultProfile` in `verification.config.json`. Logs report each check's duration and the total execution time, excluding browser-lock wait time.

## Browser test servers

Playwright starts a fresh Vite server for each suite and binds it to a test-only loopback port: vanilla uses `4176`, Vue uses `4177`, and Foldkit uses `4178`. Development servers keep their existing ports (`4173`, `4174`, and `4175`); for example, `bun run dev` still serves vanilla at `http://127.0.0.1:4173/`.

The Vue test config also accepts `FLOW_VUE_TEST_PORT` for a fresh isolated port when another checkout occupies its default. The override keeps the same tests, Vite config, strict port binding and `reuseExistingServer: false`. Shared upstream helpers and the mobile gesture context use the selected URL. It does not attach to another server.

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

Both verification profiles start with `bun run check`. Keep the quality gate read-only; use targeted formatter or lint-fix commands only when the files being changed need cleanup.

## Anti-slop provenance

The anti-slop source is vendored at `tools/oxlint/anti-slop/`. Its `UPSTREAM.md` records the exact upstream commit and installed entry points. Update it through the installed `install-anti-slop` skill. Do not replace local source without reviewing upstream and preserving local changes.

## Upstream executable test ledger

`bun run scripts/check-upstream-test-ledger.ts` enumerates executable `test` and `it` declarations in the pinned artifacts, including declared `skip` and `only` tests. Inline conditional skips belong to their parent test as guard metadata. The check validates case identity, nested titles, guards, phase, host status and reason, and the exact port location. It prints per-phase host counts. `unmappedProps` records fixture options that a host public API cannot represent.

The three `upstream-playwright.e2e.ts` runners use shared assertions and public host fixtures at `/upstream/<config-path>`. Selector adapters map host wrappers, handles, positioning styles, and edge SVG ancestry. Literal upstream assertions and thresholds remain in the shared contracts. Ledger failures use Playwright expected failures and become errors if they unexpectedly pass.

Serialize browser commands with the owner-token wrapper and select one worker:

```sh
scripts/with-flow-browser-lock.sh bun run playwright test apps/vanilla/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/vue/playwright.config.ts apps/vue/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/foldkit/playwright.config.ts apps/foldkit/e2e/upstream-playwright.e2e.ts --workers=1
scripts/with-flow-browser-lock.sh bun run verify
```

The wrapper waits for `/tmp/flow-browser.lock`, writes its owner token, sets `OTEL_SDK_DISABLED=true`, and releases only its own lock on exit. Both verification profiles supply `--workers=1` to each selected host suite.

### React reference host

Plan 148 adds a private reference app on `4180`. It mounts the pinned generic fixtures and example pages, and extracts the setup and `cy.mount` expressions from the pinned component tests. The shared Playwright bodies drive all browser gestures and assertions. The 31 utility ports use Flow-specific APIs in Vitest; their reference runner executes the original pinned utility bodies in Chromium against the matching published xyflow packages. Imported evidence stays unchanged.

Each ledger case has a `reference` result with `status` equal to `pass`, `fail`, or `not-run`, and a nonempty `reason`. React never inherits a Flow host's skips or expected failures. A recorded React failure remains an expected failure with its assertion intact and fails verification if it unexpectedly passes.

The reference host is an opt-in verification check. Both default profiles keep their existing scope. Run it under the browser lock:

```sh
scripts/with-flow-browser-lock.sh bun run verify --check reference-host
scripts/with-flow-browser-lock.sh bun run playwright test --config apps/react-reference/playwright.config.ts --workers=1
```

The opt-in check typechecks and builds the private app, then runs all reference cases with one worker. `plans/148-react-reference-results.md` records failures, classifications, Flow status changes, and the measured boundary. A passing focused Flow verification does not establish React reference acceptance.

## Adapter unit tests

Vitest has two projects. The node project runs the DOM-independent unit tests. The ownership project runs direct Vue and Vanilla adapter tests in Chromium, with the real adapter stylesheet and DOM lifecycle. These tests mount source APIs directly and require no application navigation or Vite application server. They keep synthetic callback ordering separate from native host acceptance.

Run commands that include the ownership project through the browser lock. Use bun run vitest run --project node for Node-only tests, scripts/with-flow-browser-lock.sh bun run vitest run --project ownership for adapter tests, or scripts/with-flow-browser-lock.sh bun run test for both.

The normal verifier includes both projects in its unit-test step. Take the lock around the verifier once; its child commands run under that lock.

## Product site

The [product site](https://bearing-ward.github.io/flow/) contains a static landing page and the Vanilla, Vue, and Foldkit demos under `/flow/<host>/`. Build it with Bun 1.4.3:

```sh
export PATH="$HOME/.bun/bin:$PATH"
bun run site:build
scripts/with-flow-browser-lock.sh bun run site:check
```

`site:build` builds the eight distributable packages once, builds each host with `FLOW_SITE_BASE=/flow/<host>/`, assembles `dist-site/`, adds `.nojekyll`, and checks local HTML links, CSS assets, and module imports. It needs no browser. Local dev, ordinary app builds, e2e, and packed consumers retain Vite's `/` base. The Pages build forces telemetry export off, including when local environment files configure a collector.

`site:check` rebuilds and serves only `dist-site/` under `/flow/` on strict loopback port 4186. Its one-worker Playwright smoke tests cover the landing page in light and dark themes, each playground and its Workflow link, and both service notices. Run it under the browser lock. The `site` verification check runs this same command and is included in the full profile; select it explicitly with `bun run verify --check site`.

The site includes all public HTML recipe entries, including the Pro examples, Schema Studio on Vanilla and Foldkit, and the base and offline AI editors on each host's Workflow page. Vue has no Schema Studio entry. The landing page links every published demo and identifies recipes without all three hosts. Collaboration and server image export show local-server setup notices instead of starting clients. Client-side download-image recipes remain available.

Test-only entries are excluded: `upstream.html`, `test.html`, `*-test.html`, `connection-threshold.html`, `routing-preflight/`, `workflow-contracts/`, `workflow-ai-capability/`, and Foldkit's `live-internal-node/` resize harness. The upstream development middleware is not registered in the site build. Imported research evidence is not published.

To enable deployment, a maintainer must open **Settings > Pages > Build and deployment** in `bearing-ward/flow` and select **GitHub Actions** as the source. Push the site changes to `main`, or run **Product site** from the Actions tab after the workflow is on the default branch. The workflow uploads `dist-site/` and deploys to `https://bearing-ward.github.io/flow/`; it also runs on later pushes to `main`. The separate CI workflow remains manual-only. No repository setting is changed by the build.
