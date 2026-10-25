# Plan 151: refresh the upstream pin to @xyflow/react 12.12.0

Starting point: main at `e4e74b3`, which already has Plans 147 and 148.

The current pin is `0a1f9575b25679f2880175de8d3eae21aedde921`, which is `@xyflow/react` 12.11.6 and `@xyflow/system` 0.0.82. The new target is the release commit `3d35b57317576b0916c0bfeaaedd573aaacc2839`, tagged `@xyflow/react@12.12.0` and `@xyflow/system@0.0.83`.

Pin the release tag, not the moving `main` branch.

## Scope and acceptance

1. **Import.** Run `bun run research:import` for the new commit. Imported artifacts are regenerated and never hand-edited. Decide, with a reason, whether the old revision's artifacts stay alongside the new ones, as the immutable evidence for existing citations, or whether every citation moves to the new revision.
2. **Upstream diff.** Write `plans/151-upstream-delta.md` covering everything between the two revisions in `packages/system`, `packages/react`, `tests/playwright` and `examples/react`. It must list:
   - behaviour changes;
   - new, changed and deleted public API;
   - new, changed and deleted tests. Cite changelog entries and commits.
3. **Tests.**
   - Port every new or changed upstream test into the ledger, using the existing phase scheme or a new phase, with a reason.
   - Retire deleted tests explicitly; never delete them silently.
   - Run all three Flow hosts and the React reference host, with its `@xyflow/react` and `@xyflow/system` bumped to 12.12.0 and 0.0.83.
   - Record every status change.
4. **Behaviour changes.** For each upstream behaviour change that a Flow host doesn't yet match, either:
   - fix it, if it is small and contained;
   - or list it as a follow-up plan in the delta file. The maintainer's standing direction is to match upstream.
5. **Citations.** Remap every research trace citation that points at a changed file, then run `bun run research:check-traces`. Traces whose conclusions change get an updated "Conformity and deviations" section.
6. **Catalog.** Re-check `research/catalogs/react-flow-2026-09-26.json` and the API member inventory (`scripts/inventory-xyflow.ts`) for new public API. Add any new entries to the parity audit, with ratings.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Run browser tests under `scripts/with-flow-browser-lock.sh` with one worker.
- Finish with the locked `bun run verify --check reference-host`, then `bun run verify:full`.
- Commit on `plan/151-upstream-12.12` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
