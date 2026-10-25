# Plan 147: TypeScript 7 and ultracite 8

Starting point: main after Plans 145 and 146. TypeScript is held at 5.9.3 and ultracite at 7.12.0 (see `docs/dependencies.md`). The maintainer has asked for the held upgrades to proceed.

## Scope and acceptance

- Upgrade `typescript` to the latest 7.x and `ultracite` to the latest 8.x, along with the `oxlint`/`oxfmt` versions that ultracite 8 expects. Read the release notes and migration guides first, and cite them in `docs/dependencies.md`.
- Check every TypeScript consumer for compatibility with the TypeScript 7 native compiler:
  - `vue-tsc` and Volar;
  - the Vite plugins;
  - `@foldkit/vite-plugin`;
  - the scripts that import the `typescript` API, such as `scripts/check-upstream-test-ledger.ts`, which uses `ScriptTarget.Latest`, and the docs checker.
- If a consumer can't run on TypeScript 7, keep a pinned `typescript` 5.x API package only for that consumer and document why. Don't silently downgrade.
- Fix new type and lint errors in the code itself. Don't add blanket rule disables, `any` casts or `@ts-expect-error`. If a new lint rule conflicts with `docs/standards.md`, add a targeted config override and record the reason.
- Keep Effect at 4.0.0, because Foldkit 0.169 pins it exactly.

## Execution

- Only add to `verification.config.json`; never remove entries.
- Run `bun install`, `bun run build:packages`, `bun run check`, typecheck, the unit tests and `bun run docs:check`. Then run the locked `bun run verify:full` (`scripts/with-flow-browser-lock.sh`, one worker), because a toolchain change affects every file.
- Commit on `plan/147-toolchain` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
