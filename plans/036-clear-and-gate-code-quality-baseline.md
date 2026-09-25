# Plan 036: Clear the quality baseline and add it to verification

> **Executor:** Use an isolated worktree. Read `AGENTS.md`, `docs/tooling.md`, and this plan. Do not push, merge, or open a PR without operator instruction. Update the index row after review.
>
> **Drift check first:** `git diff --stat f9b2b13..HEAD -- package.json scripts/verify.ts oxlint.config.ts oxfmt.config.ts docs/tooling.md`. Re-run the read-only baseline if any changed; STOP if policy changed substantially.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Category:** dx
- **Depends on:** 033, 034, 035 for low-conflict sequencing; **Planned at:** `f9b2b13`, 2026-09-25
- **Execution:** BLOCKED — formatting slice `04e8368` is available in its isolated worktree. The initial check found 1,999 diagnostics across 55 files; after formatting the core and conformance slice, 204 diagnostics remained there and required code or test changes beyond this plan's safe cleanup boundary. The overall diagnostic count was not rerun after formatting; `bun run check` and the full gate remain incomplete.

## Why this matters

`bun run verify` and CI can pass while the configured Ultracite check fails. `docs/tooling.md` records the initial lint/format backlog and deliberately defers gating; a read-only `bun run check` still exits 1 at planning time. Clear the current baseline in reviewed slices, then make the check a required part of the complete gate.

## Current state and conventions

- `package.json` defines `check` as `ultracite check`, `lint` as `oxlint .`, and `format:check` as `oxfmt --check .`; `scripts/verify.ts:5-20` omits `check`.
- `.github/workflows/ci.yml:18-22` runs `bun run verify`, while `research/PROGRESS.md:22` remains open. `docs/tooling.md:37-41` records an older baseline; do not treat its counts as current.
- `oxlint.config.ts:5-25` ignores imported research evidence and generated indexes. Keep `research/artifacts/`, `research/generated/`, build outputs, and vendored plugin source out of bulk cleanup. Match existing Effect and Schema conventions in `docs/standards.md:5-11`.

## Commands and scope

| Purpose | Command | Expected |
| --- | --- | --- |
| Baseline and final check | `bun run check` | final exit 0 |
| Stability | `bun run check && bun run check` | both exit 0 |
| Full gate | `bun run verify` | exit 0 |

**In scope:** repository-owned files reported by the current `bun run check`, `scripts/verify.ts`, `docs/tooling.md`, `research/PROGRESS.md`, and this index row. **Out of scope:** imported `research/artifacts/`, generated indexes, `dist/`, vendored anti-slop source, dependency upgrades, semantic feature changes, and disabling rules to make the gate green.

## Steps

1. Run read-only `bun run check`; record current failing file/rule groups in the worktree review. Fix formatting and lint in small logical groups. Review each group for unintended runtime changes before proceeding. **Verify:** `bun run check` reports fewer diagnostics after each group; `git diff --check` exits 0.
2. Resolve the remaining owned-file diagnostics without broad rule suppression. If a rule asks for a semantic rewrite, isolate it and prove behavior with relevant tests before accepting it. **Verify:** `bun run check` exits 0 twice without further file changes.
3. Add the read-only `check` command to `scripts/verify.ts` and update `docs/tooling.md` plus checklist item 22 only after the full gate passes. **Verify:** `bun run verify` and `git diff --check` exit 0; the check is visible in verifier output.

## Test plan and done criteria

- [ ] Current Ultracite diagnostics reach zero without disabling the agreed rules.
- [ ] Two consecutive `bun run check` calls and `bun run verify` exit 0.
- [ ] `scripts/verify.ts` runs the quality check, and checklist item 22 closes with accurate evidence.
- [ ] Review finds no runtime change hidden in formatting cleanup.

## STOP conditions and maintenance

STOP if any diagnostic requires a broad semantic change or a rule waiver; report that file and diagnostic as a separate scope. Do not format immutable or generated files. Keep the read-only quality gate in the verifier after future formatter or lint upgrades.
