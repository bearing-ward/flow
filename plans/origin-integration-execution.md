# 079 origin integration execution record

Worktree `/Users/richardmcandrews/.codex/worktrees/origin-integration/flow`; baseline `841be137e253cf19c665269eaaa79edc19abf3c3`. This is the separately scoped 079 executor, not a restart of the stopped 067 executor. Its historical exhausted review record remains unchanged in the copied `origin-core-execution.md` and original frozen worktree.

## Assembly and source boundary

Read complete 079 plan, AGENTS.md and docs/standards.md, TypeScript and prove-it-works instructions. Inspected full frozen candidate diff. Applied its six changed source/config paths via checked binary git patch, SHA256 `56b28e8c6ee80337401655ae22c22430b601adce0b0a9949f81f7a348fe2d1e5`. Copied both complete new origin files and historical execution plan. Exact hashes/path provenance are in `origin-assembly-provenance.json`. Original stopped candidate was not modified.

Generated `docs/api-reference.md` with `bun run docs:generate-api`; did not hand-copy or hand-edit generated output. Byte comparison confirms every candidate production/config/new-origin file and generated API doc matches the frozen original exactly. Only additional source edits are:

- `packages/core/src/domain/flow-persistence.test.ts`: construct exactly [0,0] and [-0.5,1.5] via NodeOriginSchema decode; preserve own undefined and combined-origin/native precedence assertions unchanged.
- `packages/foldkit/src/application.test.ts`: exact [0,0] via public exported NodeOriginSchema; comment distinguishes live origin fields from reserved native fields and remains explicit constructed-model unit evidence.

No casts, weakened expectations, skips, v1/schema/geometry changes beyond copied candidate, host origin/v2/connections, main source edits, commits/merge/push or dependency or lock changes. Frozen install exited 0; lock diff empty.

## Gates already reproduced

- Frozen install: `bun install --frozen-lockfile` → 0.
- Targeted first invocation (origin/persistence/application3 files):55 core tests passed, Foldkit import failed because fresh worktree's @flow/core dist did not yet exist. Focused repair was the required real package build/typecheck; no source repair.
- Initial `bun run check` found formatting only in the changed persistence fixture. Local installed oxfmt formatted that one authorized test file; subsequent quality passed.
- `bun run typecheck` → 0, all four package builds then workspace noEmit passed.
- Targeted repaired invocation: `bun run test -- packages/core/src/domain/flow-origin.schema.test.ts packages/core/src/domain/flow-graph.test.ts packages/core/src/domain/flow-node-extent.schema.test.ts packages/core/src/domain/flow-runtime.schema.test.ts packages/core/src/domain/flow-measurement.schema.test.ts packages/core/src/domain/flow-visibility.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/foldkit/src/application.test.ts` → 0,8 files / 131 tests, no skips.
- Repaired `bun run check` → 0; formatting 699 files checked.
- `bun run check:architecture` → 0;199 production files / all rule fixtures.
- `bun run docs:generate-api` → 0; output byte-equal to candidate generated doc.
- `git diff --check` → 0; unchanged lock and candidate semantic/config/newfile byte comparisons passed.
- `bun run verify --list` → 0; saved focused selection validated (below).

Each initial failed gate received exactly one focused repair and then passed. Historical 067 repair limits were not reset or erased. Logs are `/tmp/flow-079-targeted.log`, `/tmp/flow-079-targeted-rerun.log`, `/tmp/flow-079-quality.log`, `/tmp/flow-079-quality-rerun.log`, `/tmp/flow-079-typecheck.log`, `/tmp/flow-079-architecture.log`, `/tmp/flow-079-doc-generation.log`, `/tmp/flow-079-verify-scope.log`.

## Mandatory verification reservation

Parent released all ports and the first mandatory saved focused `bun run verify` ran. Quality, architecture, all package builds, typecheck, 47 unit files / 419 tests, docs, catalog and API inventory passed. It stopped at public contract ownership before any browser/packed consumer: the copied `plans/067-origin-core-execution.md` shares numeric067 prefix with the executable067 plan. The checker collects each numeric prefix into one Map (`scripts/check-api-member-contracts.ts:412-416`); the record shadows executable ownership and lacks required step/done/scope sections. This is a planning-metadata collision, not a source failure. Parent was asked to approve the exact record rename while preserving its bytes/history. No checker, contract scope or production source change is proposed. Final repaired verifier remains required; no browser or packed consumer started. Full log: `/tmp/flow-079-focused-verify.log`. Profile activeWork is "067 bounded node origin core geometry; origin-free host regression". Checks: quality, architecture, package builds, workspace types, all units, docs/catalog/API inventory/member contracts/traces, packed consumer and all three host browsers. Every host browser scope: measured-geometry.e2e.ts, renderer-contract.e2e.ts, interaction-lifecycle.e2e.ts, one worker and strict ports.

## Conformity and deviations

Accepted finite tuple construction and unchanged origin core assertions are proven at unit/type boundaries. Origin-free production host paths, packed consumers and mandatory focusedverify remain unverified until their actual gates run. Host origin activation,070 v2,078 connections,069 generics / 074 original members, broad parity, full-suite/remote CI/device/collector acceptance remain separate. This report does not claim final 067/070 completion or source acceptance; primary owns independent full-diff/verifier review.

Primary approved exact metadata repair: copied historical record renamed to `plans/origin-core-execution.md` without changing its content;079 record/provenance likewise use nonnumeric prefixes. Checker and canonical executable plans unchanged. New required focused rerun also includes Vanilla public-state.e2e.ts through CLI so the frozen candidate config remains intact and the real public dispatch path is covered.

## Final verdict: STOPPED, frozen for independent review

Second mandatory verifier command: `bun run verify --vanilla public-state.e2e.ts`. Exit 1 at Vanilla interaction lifecycle. The authorized metadata repair succeeded: public ownership checker passed 2,692 members / 8,076 cells / 868 groups, all original cells still open. Before browsers, quality, architecture, all four builds, workspace types,47 files / 419 units, docs, catalog, API inventory,2,289 citations / 67 traces and all three packed consumer install/typecheck/browser/disposal gates passed.

Vanilla selected 58 browser cases: 57 passed, 1 failed. Every added Vanilla public-state test passed, including immutable public dispatch and controlled restore/acknowledgement. Failed existing case: `apps/vanilla/e2e/interaction-lifecycle.e2e.ts:448`, "reconnection cancellation preserves the edge and permits a fresh reconnection"; assertion at 477 after Escape expected original SVG `M 255.5,162L 354.5,162`, received `M 255,162L 355,162`, timeout 5 seconds. Actual output and Playwright context preserved at `test-results/interaction-lifecycle.e2e.-297a3-ermits-a-fresh-reconnection/error-context.md`; complete repaired verifier log `/tmp/flow-079-focused-verify-rerun.log`. No claim is made that the failure is preexisting, a flake, or caused by origins; identifying that requires a separately reviewed boundary.

Vue/Foldkit browser scopes were not reached after Vanilla failure. Full verification was not run. The mandatory focused verifier remains failed, so079/067 source acceptance is not established. This was the second required verifier failure after its focused metadata repair; further browser/source repair is outside 079's two-test scope. Executor stopped without reruns, expectation changes, skips, or source edits. No 077 integration/070 work began.

Final byte comparison: copied candidate source/config/new origin files, regenerated API doc and renamed historical record remain identical to frozen origin-contracts candidate. Lock diff empty; `git diff --check` passed. No listeners remained on 4176/4177/4178 at final lsof inspection. Candidate frozen with steps 1/2 complete, step 3 partial/failed mandatory acceptance, step 4 preserved for primary independent diff/reproduction; no commit/merge/push/main-source changes.
