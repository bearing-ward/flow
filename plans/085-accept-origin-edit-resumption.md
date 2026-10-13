# Plan 085: Complete origin-edit acceptance after explicit continuation

## Status and authorization

Priority P1, effort S, risk MED. Planned at main841be137e253cf19c665269eaaa79edc19abf3c3 on2026-10-02. Depends on accepted082; frozen084 is unaccepted repair input, not an accepted prerequisite. Design review pending. The maintainer explicitly requested continuing all known issues and backlog toward closest possible library parity. This authorizes a fresh resumption, including the known mechanical failures, without another permission question. Historical083/084 STOP limits and snapshots remain intact. Do not reset or edit those historical candidates.

Primary edits only main plans/. One separate executor owns a new detached checkout. No commits, merge, push, cleanup or publication. This stage closes only origin-edit core/result-contract acceptance. Immediately after acceptance, the coordinator continues native host integration and the wider backlog; this plan alone is not the requested parity endpoint.

## Exact input and drift checks

Create detached `parity-origin-edit` checkout at841be137e253cf19c665269eaaa79edc19abf3c3. Assemble all124 paths listed in `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/edit-origin-preservation-evidence/final-freeze.json`, SHA256109a4474797b0d34ebd6bac7c5773a25a8a0c423c13ce0e8c8e9d3b531b4a692. Its source root is `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/flow`. Independently rehash every listed actual file before copying. The final frozen source patch is550d58810042c1a63570e2bf7a7848d723030031d2f832a147c4267880f0db66. Provenance5dbfb1a90c589cde9042580d3e5093dd63bddf712f58bbc14d6ba3ffb9ea1378, executionbf1a782be55d9635a21f5f0485919d6b582717bd0fbf078b855b72b7b1e28ee6. No deletes or additional repair inputs are authorized.

Preserve accepted082 source root and provenance143fc0430e8dee2da7bd6a2c02404162d268f992f0475b6fbca6f5d784caa9ce. It supplies the117-path prerequisite underneath084. No083 source is imported at this stage. Compare and record all input hashes, HEAD, lock/manifests and initial Git inventory; stop for primary review on actual drift. `bun install --frozen-lockfile` must succeed without lock/manifests changing.

## Actual defect, existing repair and remaining failure

The authoritative FlowDocumentSchema at `packages/core/src/domain/flow.schema.ts:143-149` owns optional nodeOrigin. Frozen084 repairs three actual losses: deletion result at flow-edit.ts:114 spreads the document before filtered arrays; final result at:264 spreads the validated document before unchanged identity-preserving node/edge mappings; FlowEditResultSchema at flow-edit.schema.ts:95 uses the authoritative FlowDocumentSchema instead of a nodes/edges-only projection. These production changes are already independently reviewed as sound. Retain them exactly; no additional production change is needed here.

The frozen core/application tests pass63/2files in the primary reproduction. Original eight core and all prior application assertions are unchanged. New tests prove explicit/unclamped/[0,0] and absent/own-undefined origins, all transaction families, accepted/denied/protected deletion, rollback, structural sharing/input immutability, actual result encode/decode, and production EditResponseSchema/DeleteResultSchema packet retention. The original four failing-before-fix regressions remain historical evidence. Actual public production callers use prepareFlowEdit in Vanilla mount-flow.ts:8978, Vue flow-canvas.ts:2181-2183 and Foldkit graph.ts:669,719 on the accepted082-based snapshot. Graph meaning and Effect workflows remain in core; application/framework composition stays in its current adapter.

Final084 `bun run check` fails exactly three issues: require-readable-spacing before the untouched-reference assertion at flow-edit.test.ts:428, plus formatting of copied plans/archive/edit-origin-preservation-execution.md and edit-origin-preservation-provenance.json. The final owned reports were written after its earlier check. Correct copied bytes in this fresh checkout, preserving originals and assertions. Never count a report written after the last quality check as verified.

## Hard scope

All124 input paths may be copied unchanged. New edits are limited to:

- `packages/core/src/domain/flow-edit.test.ts`: whitespace only for the exact remaining spacing diagnostic; retain all test bodies/assertions and names.
- Copied `plans/archive/edit-origin-preservation-execution.md` and `plans/edit-origin-preservation-provenance.json`: formatting only; historical contents/statuses/hashes remain historical.
- `verification.config.json`: change activeWork to085; preserve focused profile, docs/contracts/consumer checks and the six existing public-edits.e2e.ts/versioned-persistence.e2e.ts host files.
- Owned `plans/085-accept-origin-edit-resumption.md`, `plans/archive/origin-edit-resumption-execution.md`, `plans/origin-edit-resumption-provenance.json`, and exact copied independent design review.

No other source, adapter or browser tests, origin/lifecycle/HMR implementation, manifests/lockfile/dependencies, compiler/lint policies, imported research, frozen evidence or old candidate edits. No casts,any,private Runtime setters, extra graph authority, weakened assertions/skips/timeouts or dependency changes. Primary owns main/index/acceptance updates. Existing generated API documentation is unchanged; `bun run docs:check` proves its consistency without editing it.

## Ordered execution

1. Verify/copy input hashes in the new checkout, frozen install, save receipts/logs in a sibling evidence directory. The old candidates remain unchanged.
2. Repair only the three mechanical diagnostics. Installed CLI supports `bunx --no-install ultracite fix <files...>`; use it on exactly the three named paths, and manually insert the diagnosed blank line if this vendored rule does not autofix. Run `bun run check` and `git diff --check`, both exit0. Preserve first failures; do not weaken lint or broaden formatting.
3. Run `bun run test -- packages/core/src/domain/flow-edit.test.ts packages/foldkit/src/application.test.ts`: all pass. Read failures before editing. Any functional change needed is a primary design review, not permission to modify the sound frozen core patch.
4. Update the activeWork scope, then run `bun run verify --list` and `bun run verify`, exit0. Baseline quality/architecture/builds/typecheck/all units plus docs/contracts/packed consumers and the six existing host edit/persistence suites are required. Hosts remain serial, strict4176/4177/4178, reuseExistingServer=false. Verify ports free before/after; do not stop or reuse a foreign server.
5. Write all owned execution/provenance records before the final quality check. Format those new files with the existing tool, then rerun `bun run check` and `git diff --check`, both exit0. Do not modify source or records after this last successful check. Freeze the exact complete inventory and hashes in the external evidence directory, including owned records, with a source delta patch and all gate logs. No self-referential hash inside a file it hashes.
6. Release executor ports/build ownership and hand back final packet. Primary independently verifies scope/all inherited hashes and exact production/test delta, reruns the required focused verifier against the same frozen bytes, and obtains independent source review. Only then mark085 DONE and record084's origin-edit requirement accepted through this exact resumption.083 remains unaccepted until its separate integration gates pass.

## Acceptance and escalation

Every named gate must exit0, with final records included in quality verification. Existing assertions/input provenance are unchanged except approved whitespace and activeWork. Full verification is required at the subsequent native integration milestone; this focused core result is not broad parity.

User continuation supersedes the earlier operational stop for these mechanical failures. Do not impose a new arbitrary two-attempt stop on formatting, missing prerequisite builds or a diagnosed reversible fixture issue. Preserve each failure, fix its actual cause within scope, and continue. Stop the affected operation for primary review only on unknown architecture, out-of-scope functional requirements, dependency/evidence drift, a foreign resource or a repeatedly unexplained environmental failure; continue independent backlog work while that boundary is reviewed. Improve still permits at most two formal source-review revisions per candidate; after them preserve/block that candidate and refine the actual design while continuing other authorized work. Never claim failed proof accepted.

## Conformity and deviations

Conforming repair retains the existing authoritative Schema, Effect validation/observability, atomic edit/delete rules and structural sharing. Core and actual packet units provide origin-edit evidence; mounted existing edit/persistence and packed checks guard consumers. Native origin geometry, observer faults, genuine HMR, full integration, generic/appearance/callback/member closure, CI/devices/collector and broad library parity remain separate requirements for subsequent work.

## Accepted resumption result

2026-10-02: DONE for this narrow scope. Primary and independent source reviews APPROVE frozen candidate7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef. Primary independently reproduced saved focused verification (754units/50files,54selected browsers,3packed consumers, quality/docs/contracts), exit0/fullSuite=false, with all1477 frozen candidate hashes unchanged. Original dispatched plan SHA c1f702f785e834da6974d847a9653c1630c7f26539c6d360049c7891cc5a1055 remains recorded in the frozen candidate; this main-only status appendix is subsequent evidence. See primary/source review records for exact hashes/logs.084's origin-edit requirement accepted through085; native integration and whole-library parity remain open.
