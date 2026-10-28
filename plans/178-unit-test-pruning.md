# Plan 178: unit test pruning

The maintainer approved removing low-value tests on 2026-10-28. The unit suite has 2,959 tests and runs in about 7.5 s. The goal is lower maintenance cost, not speed. A test is low value when another test already makes the same assertion, when it tests Effect or TypeScript rather than Flow, or when it only restates a constant.

## Rules

Every deleted test must fall into one of two groups:

1. Its distinct assertion is covered elsewhere. Cite the covering test.
2. It is intentionally dropped as tautological.

Record this in `research/traces/178-unit-test-pruning.md` as one table per file. End the trace with a Conformity and deviations section. Do not weaken any test of rejection, canonical encoding, legacy v1 compatibility or React parity values.

## Changes

1. **`packages/core/src/domain/flow-edge.schema.test.ts`.**
   - The `markerCase` generator (about line 347) produces 436 of the file's 449 tests. It includes 81 "caller-owned recursive Struct" cases, which test Effect itself.
   - Keep one representative case per distinct behaviour, about 10–20 in all. The kept cases must cover:
     - rejection;
     - canonical encoding;
     - absent, undefined and null presence;
     - the handle-identity boundary.
2. **Path-helper values, which are currently pinned three times.**
   - The fixture replay in `packages/conformance/src/path-helper-reference.test.ts` is the source of truth.
   - Remove the hand-pinned tuples in `packages/core/src/domain/flow-edge-path.test.ts`, about lines 83–3214, wherever the fixture replay asserts the same output.
   - Remove the 32 hand-written "pinned full-tuple boundary" tests in the conformance file wherever the replay already covers them.
   - Keep the behavioural tests.
   - `scripts/check-api-member-contracts.ts` (about line 209) names this file as `productionTest`. Keep the file, and update the contract catalog if the test titles it relies on change.
   - The compile-only `@ts-expect-error` block (about lines 3272–3345) should move to a type-only file that `tsc` covers, or be deleted if an existing type test covers it.
3. **`flow-origin-persistence.test.ts`.** The "literal1 integrity traversal" block has 53 tests. Collapse them into table-driven cases where they re-check the same frozen reader output. Every distinct legacy shape must stay covered.
4. **The test pinned to the Bun 1.4.3 environment** (`flow-persistence.test.ts`, about lines 300–340).
   - It spawns `scripts/capture-legacy-v1-persistence.ts`, which refuses to run on any Bun other than 1.4.3.
   - Move that provenance comparison into a full-profile verify check named `persistence-provenance` in `scripts/verification-plan.ts`.
   - Keep the parts of the unit test that need no spawn.
   - Note: Plan 177 may move the capture scripts into `scripts/capture/`. Keep your change minimal so the merge can resolve the path.
5. **Integration tests in the unit suite.**
   - `packages/routing-libavoid/src/package.test.ts` runs `bun install` and typechecking, and it fails offline.
   - `apps/react-reference/fixture-source.test.ts` is also integration work.
   - Move both into the packed-consumer check or another existing full-profile check.
6. **Code that ships nowhere.** If nothing else uses `createFlowSpatialPrototype`, delete it, its test (`flow-spatial-prototype.test.ts`) and `scripts/bench-flow-geometry.ts`.
7. **Tautologies and misfiled tests.**
   - Remove the span-name constant restatements in `packages/workflow/src/workflow-ai.test.ts` (about lines 441 and 772). Span emission tests stay.
   - Move `packages/conformance/src/research-trace-path.test.ts` next to the script it tests.
8. **Names.** Rename the plan-, round- and ticket-named titles to describe behaviour, for example "original 065 …", "BUG-088-01", "literal1", "owner072" and "precisely32". Keep `[UP-128-…]` upstream IDs. First grep for checkers that match on titles, and update them in the same commit.

## Execution

- Prepend `$HOME/.bun/bin` to `PATH`, so that Bun 1.4.3 is used.
- Do not edit `scripts/*.test.ts` except as item 4 requires; Plan 177 owns those files.
- Take the browser lock separately for each browser command, and stop only the processes you started, using their PIDs.
- Report the before and after counts of tests and lines per package.
- Finish with a locked `bun run verify --full`.
- Commit on `plan/178-unit-test-pruning` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
