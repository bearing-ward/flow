# Plan 008: Refresh the handoff, progress checklist, and dependency record

> **Executor instructions:** This is a documentation-only correction. Read the current code and tests before changing a status claim. Run the checks below and update only this plan's row in `plans/README.md` after success. **Drift check first:** `git diff --stat e393e3e..HEAD -- HANDOFF.md research/PROGRESS.md research/generated/SUMMARY.md docs/dependencies.md package.json apps/vanilla/e2e/viewport-operations.e2e.ts`. Recheck every claim against live evidence if any path changed.

## Status

- **Priority:** P2; **Effort:** S; **Risk:** LOW; **Category:** docs
- **Depends on:** Plan 001 (DONE); execute after Plans 002-007 if their results should appear in the handoff
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

The handoff says the repository has no commits and nested graph work is next, although Plan 001 landed at `e393e3e`. The progress checklist marks unmeasured fit incomplete even though a browser test covers that behavior. The dependency record describes `@effect/vitest` as installed although it is absent from the manifest. These statements misdirect the next executor.

## Current state

- `HANDOFF.md:302-304,333,341` says there is no committed baseline; `:316-320,341` still asks for nested graphs next. `research/PROGRESS.md:5,112` records nested graph completion.
- `research/PROGRESS.md:91` leaves unmeasured fit unchecked, while `apps/vanilla/e2e/viewport-operations.e2e.ts:161` mounts a culled, initially unmeasured distant node and verifies fit; `docs/architecture.md:110` explains fallback dimensions.
- `docs/dependencies.md:16-17` and `HANDOFF.md:292` describe a pinned `@effect/vitest`; `package.json` has `vitest` but no `@effect/vitest` dependency. Do not install it for a documentation fix.
- `scripts/verify.ts:6` runs the research inventory generator. It embeds `research/PROGRESS.md` in tracked `research/generated/SUMMARY.md`; regenerate that file through the command only.
- `docs/standards.md:7-16` distinguishes verified behavior from reference parity and requires `bun run verify`. Retain any accurate open gaps and the policy against hand-editing imported research artifacts.

```text
# HANDOFF.md:304
The directory is a Git repository on branch `main`, but it has no commits.

# research/PROGRESS.md:91
- [ ] Fit initially unmeasured content into view
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Status evidence | `git log -1 --oneline` | Shows the current commit, at least `e393e3e` |
| Dependency evidence | `rg -n '"@effect/vitest"' package.json` | No match, unless dependency was independently added before execution |
| Browser evidence | `bunx playwright test apps/vanilla/e2e/viewport-operations.e2e.ts` | All cases pass |
| Complete gate | `bun run verify` | All stages pass |

Modify only `HANDOFF.md`, `research/PROGRESS.md`, `docs/dependencies.md`, the generated `research/generated/SUMMARY.md` **through `bun run research:inventory` only**, and this plan's index row. Read code/tests, but do not modify source, `research/artifacts/**`, or any generated file by hand. Use `codex/008-status-docs` if isolated; no commit/push/PR without instruction.

## Steps

1. Confirm the current branch, HEAD, Plan 001 status, manifest dependencies, and fit browser test. **Verify:** the first three commands above yield the stated results.
2. Replace obsolete handoff Git state and next-slice claims with the current nested graph/renderer milestone, remaining interaction and adapter prerequisites, and accurate verification limits. Update both the prose and copyable continuation prompt. Remove claims about untracked-only history and the absent `@effect/vitest` dependency. **Verify:** `! rg -n 'no commits|no committed|Next address nested|Next address.*nested|@effect/vitest' HANDOFF.md` → exit 0.
3. Mark unmeasured fit complete only after the cited browser test passes; make the checklist wording match its actual fallback/culling boundary. Remove or correct the obsolete `@effect/vitest` rationale without changing dependencies. **Verify:** `! rg -n '@effect/vitest' docs/dependencies.md` → exit 0; browser command → pass.
4. Regenerate the embedded progress summary and run full verification; review the generated diff rather than hand-editing it. **Verify:** `bun run research:inventory` and `bun run verify` → all stages pass; `git diff --check` → exit 0.

## Test plan and done criteria

- This plan adds no test; it relies on the existing `viewport-operations.e2e.ts:157-190` browser test and current manifest/Git facts.
- [ ] Handoff Git state, next work, and continuation prompt reflect the current checkout and completed graph milestone.
- [ ] The fit checklist claim is supported by a passing browser test; `@effect/vitest` is not described as installed unless it actually is.
- [ ] Full verify and `git diff --check` pass; compared with preflight `git status --short`, no new changes exist outside the scoped documentation, generated summary, and index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the fit browser test fails, if the manifest changed to include `@effect/vitest`, if another task changed the milestone, or if a status claim cannot be supported by code/test evidence. Keep future handoffs anchored to a commit and distinguish recorded previous gates from freshly run gates.
