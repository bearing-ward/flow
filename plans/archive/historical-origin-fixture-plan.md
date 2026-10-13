# Plan 079: Migrate anticipatory origin guard fixtures to the accepted tuple

## Status and boundary

Priority P1, effort S, risk LOW; planned at841be13, 2026-09-30. Required verification dependency of067 core candidate and070. Architecture APPROVED by primary source inspection. Source execution must use an isolated integration worktree and a different executor; the stopped origin candidate's exhausted review rounds remain recorded, not reset.

The067 core candidate in `/Users/richardmcandrews/.codex/worktrees/origin-contracts/flow` passes118 targeted units, quality and allfour package builds. Workspace typecheck rejects old speculative origin guard fixtures now that live origin is an exact finite pair. It has no accepted source verdict yet. No browsers/focusedverify ran. Source semantic changes are reviewed in `plans/067-origin-core-execution.md`; this required follow-up fixes their exact external test dependency before rerunning acceptance.

Personally inspected `packages/core/src/domain/flow-persistence.test.ts:397-431`: parameterized guards construct `[0,0]` and `[-0.5,1.5]` without tuple context, producing number[]. `packages/foldkit/src/application.test.ts:24-77` includes the same inferred document origin in a constructed update model. These tests anticipated unsupported origin keys before live schemas existed. Their tested values and expected format errors remain correct; their type construction is now stale.

## Exact execution

1. Assemble the frozen067 origin candidate into a new isolated worktree by applying its inspected diff and copying its two new corefiles and executionplan; preserve the original stopped worktree. No commits/merge/push/main edits. Record exact source paths and patch provenance. Do not omit source or test hunks or alter reviewed origin semantics.
2. Change ONLY `packages/core/src/domain/flow-persistence.test.ts` and `packages/foldkit/src/application.test.ts` fixture construction. Obtain valid origins through exported `NodeOriginSchema` decode/make (Schema-derived finite tuple), preserving `[0,0]`, `[-0.5,1.5]`, own undefined, absent fields and original error precedence. Do not cast values, weaken function types, skip guards, change test expectations or broaden persisted v1. These are unit constructed-model paths, not actual Runtime evidence. Test comments must distinguish now-live origins from other reserved fields.
3. Run targeted persistence/application/origin tests, `bun run check`, `bun run typecheck`, `bun run check:architecture`, then the candidate's saved focused `bun run verify` with allhost measured-geometry/renderer-contract/public dispatch paths and consumer/docs/contracts/traces. All exit0, no new skips. Generate authorized API docs only through generator; imported evidence immutable. Coordinate strictbrowser/consumer ports with primary. Record exact profile/scope/results and `git diff --check`.
4. Freeze candidate for primary full-diff and verifier reproduction. 067 source acceptance follows actual green evidence, not this small-plan design approval. 070/host activation/connections and generic069/074 original cells remain open.

Stop on any additional production source requirement, fixture values failing the actual schema, changed frozenv1 contract, casts/secondauthority/dependency edits, or two required-gate failures after one focused repair. Report exact failure; preserve completed work. No unrelated application behavior or native renderer changes are authorized.

## Done and maintenance

- All prior origin semantic assertions remain intact; only the two stale test fixture constructors change.
- Workspace typecheck and saved focusedverify pass, including publicorigin-free regressions, and independentprimary review accepts assembled candidate.
- All failures and stopped source limits remain in their historical execution record. This child does not close067 or070 finalacceptance.

Future typedfield additions must migrate anticipatory test values through authoritative schema constructors. Conformity: finite tuple/type discipline is the acceptedFlow contract; no upstream runtime/parity claim. Production/test boundary: the fixtures are unit-only, and the required browser/packed gates remain separate acceptance evidence.
