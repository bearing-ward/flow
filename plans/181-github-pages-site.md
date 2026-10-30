# Plan 181: GitHub Pages product site

On 2026-10-29 the maintainer asked for a product page. The repository is public at `bearing-ward/flow`, and Pages is not enabled yet. The maintainer will enable it, with GitHub Actions as the source, and will push. This plan only prepares the site and the workflow.

## Site

The site is published at `https://bearing-ward.github.io/flow/`.

- **Landing page:** `/flow/` is a single static page and needs no framework. It holds:
  - a one-paragraph pitch: an Effect v4 graph canvas with Vanilla, Vue and Foldkit hosts;
  - a feature grid, with one card per demo that links to all three hosts;
  - install and quick-start snippets, taken from `docs/public-api.md` and `docs/tutorials`;
  - links to the docs on GitHub (`docs/`, `docs/api-reference.md`, `packages/workflow/README.md`, `docs/optional-integrations.md`);
  - the acknowledgements from `README.md`, including the React Flow and xyflow links and the line that Flow is not affiliated with them.

  Use plain HTML and CSS in `site/`. It must be accessible and work in light and dark themes.
- **Demos:** each host's production build is published under `/flow/vanilla/`, `/flow/vue/` and `/flow/foldkit/`. Include every recipe page these builds already produce: the playground, the Workflow Editor, the AI Workflow Editor, Schema Studio, and the Pro examples.
  - Do not publish the test-only pages: `upstream.html`, `test.html`, `*-test.html`, `connection-threshold.html`, `routing-preflight`, and the `workflow-contracts` and `workflow-ai-capability` harness pages if they are test harnesses.
  - Collaboration and the server image service need a running server, so on the static site their pages show a short "requires a local server — see docs" notice and link to the docs. Do not let them fail silently.
  - Telemetry export stays disabled in the Pages build.

## Build

- **Base path:** add `FLOW_SITE_BASE`, which defaults to `/`, so each app's Vite `base` becomes `/flow/<host>/`. Local dev, the e2e suites and the packed consumer must keep working unchanged.
  - Fix any absolute asset URLs or `fetch('/…')` calls that would break under a sub-path.
  - `upstreamFixtureRoute` and other dev-only routes must not leak into the Pages build.
- **Assembly:** add `scripts/build-site.ts`, exposed as `bun run site:build`. It builds the packages once, builds the three apps with the base, copies `site/` and the app outputs into `dist-site/`, and adds `.nojekyll`.
- **Link check:** add a check, run by `site:build` or a separate script, that every local link and asset in `dist-site` resolves. Add it as a verify check named `site` in the full profile.
- **Smoke test:** add a short Playwright test that serves `dist-site` under `/flow/` and opens the landing page and one demo per host. Wire it into the `site` check.

## Workflow

Add `.github/workflows/pages.yml`:

- It runs on `workflow_dispatch` and on `push` to `main`. Pages builds are cheap, so the automatic trigger is fine, unlike CI, whose automatic runs stay muted.
- It runs on `ubuntu-latest` with Bun 1.4.3 and uses `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.
- Permissions are `pages: write` and `id-token: write`, with a concurrency group so a newer deploy replaces an older one.
- Install Playwright Chromium only if the site build needs it.

## Docs

- In `README.md`, add a link to the site near the top, and update the stale `bun run verify` "temporarily focused" wording in the Commands section to describe the changed-files model.
- In `docs/release-process.md` or `docs/tooling.md`, add a short "Product site" section covering how to build it locally, how to enable Pages with GitHub Actions as the source, and what is excluded from the site.
- Add `"homepage": "https://bearing-ward.github.io/flow/"` to the publishable package manifests where the archive checks allow it.

## Execution

- Prepend `$HOME/.bun/bin` to `PATH` so that the pinned Bun 1.4.3 is used.
- Take the browser lock separately for each browser command (`scripts/with-flow-browser-lock.sh`). Stop only processes you started, by their recorded PIDs. Never kill processes by name or port.
- Finish with `bun run site:build`, the `site` check, and a locked `bun run verify --full`.
- Commit on `plan/181-github-pages-site` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push, do not change repository settings, and do not merge.
