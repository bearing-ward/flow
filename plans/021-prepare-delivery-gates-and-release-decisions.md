# Plan 021: Establish delivery checks and a release dry run

> **Executor:** Work in an isolated worktree. Read `docs/standards.md`, `docs/tooling.md`, `docs/dependencies.md`, `docs/observability.md`, `research/PROGRESS.md`, and final package/adapter manifests. **Drift check first:** `git diff --stat 6e84008..HEAD -- package.json scripts/verify.ts packages/core/package.json apps/vanilla/package.json docs research/PROGRESS.md`. This plan intentionally follows adapter and package work; inspect their final commands and STOP if no clean packed-consumer gate exists.

## Status

- **Priority:** P2; **Effort:** L; **Risk:** MED; **Depends on:** 016-020
- **Category:** delivery, DX, docs; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`research/PROGRESS.md:22-25,227-237` leaves the Ultracite baseline, architecture-boundary checks, CI, release automation, API docs, tutorials, browser/a11y expectations, and versioned packages open. The root `scripts/verify.ts:5-12` currently runs research inventory and citations, typecheck, unit tests, build, and browser tests; it does not include a lint gate or package consumer at this plan stamp. `packages/core/package.json` and `apps/vanilla/package.json` are `private: true`, version `0.0.0` at this plan stamp. `docs/observability.md:97-107` distinguishes browser OTLP transport from collector processing/storage/query; `PROGRESS.md:167` remains open. Publishing is outside this plan until a user approves a concrete release.

```ts
// scripts/verify.ts:5-12
const checks = [
  ['research inventory', ['bun', 'run', 'research:inventory']],
  ['research trace citations', ['bun', 'run', 'research:check-traces']],
  ['typecheck', ['bun', 'run', 'typecheck']],
  ['tests', ['bun', 'run', 'test']],
  ['build', ['bun', 'run', 'build']],
  ['browser', ['bun', 'run', 'test:browser']],
] as const
```

## Scope and gates

Only edit root `package.json`/lockfile, `scripts/verify.ts`, add focused architecture and doc-generation scripts under `scripts/`, add CI config under `.github/workflows/`, edit package manifests and generated declaration/build configuration from Plan 017, add documentation under `docs/` and tutorials under `examples/`, edit `research/PROGRESS.md`, regenerate summary via inventory, and update index row. Do not publish packages, create tags, or change application behavior. Do not edit imported research artifacts. Use `codex/021-delivery-gates` if needed; no commit/push/merge/PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Boundaries | `bun run check:architecture` | exit 0; deliberate forbidden import fails its test |
| Consumer | `bun run test:consumer` | exit 0 |
| Docs | `bun run docs:check` | exit 0; links and snippets resolve |
| Release dry run | `bun run release:dry-run` | exit 0; no publish or tag |
| Complete | `bun run verify` | exit 0 including the new read-only gates |

## Steps

1. Add an architecture-boundary script that rejects `apps/` imports from `packages/core/src/domain/`, browser globals in core, and direct imports from `research/artifacts/` into production. Test the checker with fixture imports that must fail and allowed imports that must pass. Wire it into `verify`. **Verify:** boundary test and full gate pass locally.
2. Add CI that runs the complete local gate and packed-consumer check on a clean install with exact Bun/Effect versions. Record CI as configured, not hosted green until a real CI run succeeds. **Verify:** inspect the workflow and run its commands locally; `bun run verify` and `bun run test:consumer` exit 0.
3. Generate schema-based API reference for document, commands/changes, and saved envelope. Write a first-canvas tutorial, custom node/edge and gesture guides, and adapter integration pages using the runnable examples from earlier plans. Document supported browsers, keyboard/pointer/touch expectations, and a measured accessibility test boundary. Link each guide to a real test or runnable demo. **Verify:** `bun run docs:check` exits 0 for links/snippets; full gate passes.
4. Add a dry-run release/changelog workflow that builds and packs all publishable packages, runs the clean consumer test, checks exact versions and notices/licensing, and emits a release manifest. Document versioning and migration rules. Do not publish, tag, or make packages public in this plan. Leave `PROGRESS.md:167` open: this plan does not test collector processing, storage, or queries; HTTP 200 alone is insufficient. **Verify:** dry run exits 0 with package archive names and no network publish call.
5. Check only fully proved PROGRESS items; regenerate summary via inventory. **Verify:** `bun run verify`, `bun run test:consumer`, `git diff --check`, and `git status --short` show success and no unexpected generated files.

## Test plan and done criteria

- [ ] Boundary checks are read-only, pass locally, and fail a known forbidden-import fixture; the Ultracite baseline remains an explicit follow-up because its existing findings span files outside this plan.
- [ ] CI workflow executes the same complete gate and package consumer; a hosted result is reported separately from local configuration.
- [ ] Docs checker validates API links and runnable snippets; release dry run packs packages with version/notice manifest and performs no publish.
- [ ] `bun run verify` passes; only scoped files changed; PROGRESS claims match actual gates and collector-side evidence.

## STOP and maintenance

STOP if CI cannot run the browser suite reliably, package archives fail the clean consumer, or release notice obligations are unresolved. Do not substitute a partial gate or HTTP transport success for full delivery evidence. Future release work should use the manifest and consumer test, clear the Ultracite baseline in a separately scoped plan, then seek explicit approval for publication.
