# Plan 035: Enforce the package-to-app boundary across core source

> **Executor:** Use an isolated worktree; read `AGENTS.md`, `docs/standards.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- scripts/architecture-rules.ts scripts/check-architecture.ts`. STOP if the scanner or rule structure changed in a way this plan does not cover.

## Status

- **Priority:** P1; **Effort:** S; **Risk:** LOW; **Category:** dx, architecture
- **Depends on:** none; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** TODO

## Why this matters

The architecture scanner visits all app and package source files, but the rule rejecting a core import from an app applies only to `packages/core/src/domain/`. An accidental dependency from `public.ts` or another core directory could pass a gate intended to protect the framework-independent package.

## Current state and conventions

- `scripts/check-architecture.ts:65-80` scans `{packages,apps}/**/src/**/*.{ts,tsx,js,jsx}` and calls `findArchitectureViolations` for each file.
- `scripts/architecture-rules.ts:117-129` sets `coreDomain` only for paths starting `packages/core/src/domain/` before checking app imports. `docs/standards.md:5-11` requires graph meaning and packages to stay independent of apps.
- Follow the existing in-process fixture table in `scripts/check-architecture.ts:8-52`; keep the AST-based module-specifier inspection rather than adding text grep.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Rule fixtures and architecture check | `bun run check:architecture` | exit 0 after the fix |
| Full gate | `bun run verify` | exit 0 |

**In scope:** `scripts/architecture-rules.ts`, fixture cases in `scripts/check-architecture.ts`, and this index row. **Out of scope:** production imports, package boundary redesign, lint configuration, imported research artifacts.

## Steps

1. Add failing fixtures for an app import from `packages/core/src/public.ts` and a non-domain core subdirectory, plus a passing app-to-core import. Test relative paths and `@flow/*` app specifiers already recognized by the rule. **Verify:** `bun run check:architecture` fails before the rule change and names the two new fixture paths.
2. Apply the forbidden-app-import rule to all `packages/core/src/` sources while preserving research-artifact and existing package rules. **Verify:** `bun run check:architecture` exits 0.
3. Run the full gate and check the diff scope. **Verify:** `bun run verify` and `git diff --check` exit 0; only in-scope files changed.

## Test plan and done criteria

- [ ] Both non-domain core fixtures are rejected; app-to-core remains allowed.
- [ ] Existing architecture fixtures and full verify pass.
- [ ] No production source was edited to satisfy the rule.

## STOP conditions and maintenance

STOP if an existing core-to-app import is found: report its path and caller before changing production code. Keep future package additions under the same boundary rule.
