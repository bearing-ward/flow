# Plan 177: build and verification consolidation

The maintainer approved consolidation on 2026-10-28, including narrowing `verification.config.json`. A read-only audit found the following:

- One `verify:full` pass runs 24 package builds; 16 of those repeat earlier builds.
- The focused profile lists 82/88, 79/87 and 91/95 browser files, so it has become the full suite under another name.
- `inventory` writes files and checks nothing.
- Five catalog checkers each parse the same catalogs in separate processes.
- Several scripts and configs are dead.

This plan removes that cost without weakening what the full profile proves.

## Changes

1. **One package build script.**
   - Add `scripts/build-packages.ts [package...]`. It builds the named packages in dependency order, then applies the declaration `.ts`→`.js` specifier rewrite. That rewrite currently sits inline three times in `package.json`. `rewriteRelativeImportExtensions` only affects emitted JS, so the rewrite stays, but in one place.
   - Point `build:packages`, `build:vue:packages` and `build:foldkit:package` at this script.
2. **Build once per verify.**
   - After the `package builds` check passes, `scripts/verify.ts` sets `FLOW_PACKAGES_PREBUILT=1` for every later child process.
   - `build-packages.ts` exits early when that variable is set.
   - Playwright web servers, app builds, the packed-consumer check and `release:dry-run` then reuse the built `dist/`.
   - Running a script on its own, without verify, still builds.
   - Report the build count per full pass before and after; the target is 8.
3. **Foldkit app typecheck.** If the root `tsc --noEmit` covers every file that `apps/foldkit/tsconfig.json` includes, drop the `tsc` step from the Foldkit app `build`. Otherwise add the missing paths to the root include first, then drop it.
4. **Verification profile model.**
   - Delete `activeWork` and the per-host focused lists.
   - `focused` runs:
     - the baseline checks;
     - every e2e file under `apps/<host>/e2e/` that changed against `git merge-base HEAD main`, including uncommitted changes;
     - an optional short `pinned` list in the config;
     - the CLI flags.
   - `full` runs every extra check and every browser file, as it does now.
   - `--list` shows the resolved selection.
   - Update `docs/tooling.md`, and update the Verification section of `AGENTS.md` to describe the new model in the same terse style.
   - CI (`.github/workflows/ci.yml`) defaults to `full`. Set `timeout-minutes` to 1.5× the measured full wall-clock, rounded up to 10 minutes.
5. **Inventory as a real check.**
   - `scripts/inventory-xyflow.ts --check` regenerates the files in memory and fails on any diff with `research/generated/*`.
   - The verify check uses `--check`; `research:inventory` still writes.
6. **One catalog check.** Merge `catalog`, `proof`, `api-members`, `contracts` and `examples` into a single `catalogs` check. One process parses each shared catalog once and runs every existing rule; the individual scripts may remain as thin entry points. Keep `calibration`, `upstream-ledger` and `traces` as they are.
7. **Checker tests.**
   - Trim `scripts/*.test.ts` to two kinds of test:
     - one test per checker that runs it against the real repository;
     - tests of real logic: parsing, matching and diffing.
   - Delete mutation tables and fixture copies that only re-check plan IDs or document paths.
   - Keep `verification-plan`, `package-archive` and `collector-delivery-query`; extend `verification-plan.test.ts` for the new model.
8. **Dead and one-off tooling.**
   - Delete `scripts/edge-routing.config.ts`, `scripts/routing-preflight.config.ts` and `scripts/wire-ties.config.ts`, plus the `apps/shared/*` entry files only they use. First confirm each acceptance module is still run by every host's e2e suite.
   - Delete `scripts/remap-upstream-citations.py` and `scripts/audit-upstream-refresh.py`.
   - Move the `capture-*-reference.ts` scripts into `scripts/capture/`, with a short README saying what each one regenerates.
   - Update the citations in `research/traces/*`, `research/fixtures/README.md` and `oxlint.config.ts`. Leave historical `plans/` text alone.
9. **Data out of plans.** Move `plans/057-member-closure.json` and `plans/066-member-routing.json` to `research/catalogs/` and update their readers.
10. **Root dependencies.**
    - Remove root `vue`, `foldkit`, `@effect/platform-browser`, `libavoid-js` and `@flow/workflow` when nothing at the root imports them; checker fixtures that only name them as strings do not count.
    - Confirm with `bun install`, `tsc --noEmit` and `vitest run`.

## Execution

- Prepend `$HOME/.bun/bin` to `PATH`. The repository pins Bun 1.4.3, and a newer vite-plus shim shadows it.
- Take the browser lock separately for each browser command (`scripts/with-flow-browser-lock.sh`). Stop only the processes you started, using their recorded PIDs. Never kill processes by name or port, and never wrap an interactive shell in the lock.
- Compiler-API code imports `typescript-api`. Tests use `it` inside `describe`.
- The full profile must still run every check and browser file it runs today, minus only the deleted standalone configs. Prove this by comparing `verify --full --list` before and after.
- Finish with a locked `bun run verify --full` and report its wall-clock, then run `bun run verify` (focused) and report what it selected.
- Commit on `plan/177-build-verify-consolidation` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
