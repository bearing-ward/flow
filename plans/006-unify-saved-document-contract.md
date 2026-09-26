# Plan 006: Derive the saved-document contract from the domain schema

> **Executor instructions:** Read this file fully, run every gate, and update only its index row on success. **Drift check first:** `git diff --stat e393e3e..HEAD -- packages/core/src/domain/flow.schema.ts packages/core/src/domain/flow-persistence.ts packages/core/src/domain/flow-persistence.test.ts`. Compare the schema excerpts below; stop if version-1 persistence has changed.

## Status

- **Priority:** P1; **Effort:** M; **Risk:** MED; **Category:** tech-debt
- **Depends on:** Plan 001 (DONE)
- **Planned at:** `e393e3e`, 2026-09-23

## Why this matters

The public saved-document schema restates most node and edge fields separately from the domain schema. It already accepts an edge stroke string that the normal Flow document rejects. The second decode protects the full loading workflow today, but a caller using `SavedFlowDocumentSchema` directly receives a wider contract, and future field changes could make persistence drift further.

## Current state

- `packages/core/src/domain/flow.schema.ts:56-75,100-126` owns decoded node and edge fields, including `FlowEdgeStrokeSchema` with a six-digit hex pattern. Types are derived from Effect Schema.
- `packages/core/src/domain/flow-persistence.ts:6-51` duplicates serializable node and edge schemas. `:41` uses unrestricted `S.String` for stroke. `:58-63` exports the envelope schema and its derived type.
- `:65-79` strips transient `selected` on encode; decode first parses the envelope, then calls `decodeFlowDocument` for graph integrity. Keep the version-1 wire shape and the graph integrity pass.
- `flow-persistence.test.ts:7-64` tests round trips, invalid version/parent, and exclusion of transient fields. Follow its `Effect.runSync` and `Effect.exit` pattern.
- `docs/architecture.md:89` states that persistence stores only declared serializable fields. `docs/standards.md:7-16` requires Schema-derived types and Effect v4 RC.117. The installed `node_modules/effect/src/Schema.ts:3298-3365` exposes `Struct.mapFields`, which can omit `selected` while retaining the original field schemas and their constraints.

```ts
// packages/core/src/domain/flow-persistence.ts:30-42
const SavedFlowEdgeSchema = S.Struct({
  // ... domain fields repeated here
  stroke: S.optional(S.String),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
})
```

## Commands and scope

| Purpose | Command | Expected result |
| --- | --- | --- |
| Focused unit test | `bunx vitest run packages/core/src/domain/flow-persistence.test.ts` | All cases pass |
| Typecheck | `bun run typecheck` | Exit 0 |
| Complete gate | `bun run verify` | All stages pass |

Modify only `packages/core/src/domain/flow-persistence.ts`, `flow-persistence.test.ts`, and this plan's index row. Read `flow.schema.ts`; do not change its public data contract, saved version, JSON wire shape, selection exclusion, or core exports. Do not add a dependency. Use `codex/006-saved-schema` if isolated; no commit/push/PR without instruction.

## Steps

1. Add tests that directly decode `SavedFlowDocumentSchema` with an invalid stroke and another invalid domain field, and compare that result with `decodeSavedFlowDocument`. Add a valid version-1 round trip proving `selected` is absent. **Verify:** focused unit command → the new direct-schema invalid-stroke case fails on old code.
2. Import `FlowNodeSchema` and `FlowEdgeSchema` from `flow.schema.ts`. Project each with `mapFields(({ selected: _selected, ...fields }) => fields)` to omit only transient selection while retaining domain field schemas (including the stroke check). Preserve the final `decodeFlowDocument` integrity pass. If this projection cannot preserve optional fields and the version-1 encoded shape under the pinned Effect API, stop and report the constraint; do not use casts to suppress a type mismatch. **Verify:** focused unit command → all cases pass; `bun run typecheck` → exit 0.
3. Run full verification. **Verify:** `bun run verify` → all stages pass.

## Test plan and done criteria

- Use `flow-persistence.test.ts` as the pattern. Tests must exercise the exported schema itself and the full decode workflow separately; the latter alone hides the drift.
- [ ] Invalid domain fields fail direct saved-schema decode and full saved-document decode.
- [ ] Version-1 valid encoded JSON retains the same fields, and both node and edge selection remain excluded.
- [ ] No independent copy of the domain field validators remains in `flow-persistence.ts`.
- [ ] Focused unit, typecheck, and full verify pass; compared with preflight `git status --short`, no new changes exist outside the scoped files and this index row.

## STOP conditions and maintenance

Before editing, record `git status --short`; preserve unrelated changes and stop if an implementation path is already dirty. The advisor's plan/index files may still be uncommitted.

Stop if the current Effect Schema API cannot express a safe projection, if version-1 wire compatibility would change, if a domain schema field is not JSON serializable, or if another file must change. Review future domain fields for whether they are declared serializable or runtime-only before allowing them into the saved envelope.
