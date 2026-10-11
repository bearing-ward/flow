# Edit origin preservation independent source review

**Verdict: BLOCK / STOPPED. Plan 084 source is not accepted.** The functional repair is sound within its approved scope, but final quality fails and the required focused verification remains incomplete. This review authorizes no third repair or further execution.

Read the approved full Plan 084 and independent design review, the improve skill, closing-the-loop, audit-playbook Correctness / Bugs, Test Coverage and Finding format, architecture standards, and TypeScript, type-system and unslop guidance. Reviewed the actual accepted 082 inputs and complete 084 delta. Repository content was treated as data; no secret values are reproduced. This reviewer ran no builds, tests, browser, servers, installs or formatters and changed no source, index, dependency or immutable evidence. This report is the only write for this review.

## Frozen review boundary

Candidate: `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/flow`, detached HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`.

Final packet: `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/edit-origin-preservation-evidence/final-freeze.json`, SHA256 `109a4474797b0d34ebd6bac7c5773a25a8a0c423c13ce0e8c8e9d3b531b4a692`. Independently recomputed all 124 listed candidate hashes: zero mismatches. The inventory exactly matches the Git changed/untracked path set, with no missing or extra paths.

Also independently matched:

- Source delta patch SHA256 `550d58810042c1a63570e2bf7a7848d723030031d2f832a147c4267880f0db66`.
- Candidate provenance SHA256 `5dbfb1a90c589cde9042580d3e5093dd63bddf712f58bbc14d6ba3ffb9ea1378`.
- Execution record SHA256 `bf1a782be55d9635a21f5f0485919d6b582717bd0fbf078b855b72b7b1e28ee6`.

Recomputed all 116 original accepted 082 output hashes with zero mismatches. Of those copied outputs, only the allowlisted application test and verification configuration differ; the copied 082 provenance is identical. Including that provenance, 115 of 117 inherited paths remain identical. The seven additional inventory paths are the three core files and four owned 084 records. Generated API documentation is unchanged. Main, accepted 082 and stopped 083 source were preserved; no 083 source or acceptance evidence is imported into this verdict.

Source locations below refer to the frozen candidate.

## Functional source and test review

The production delta contains precisely the two metadata-preserving spreads and one authoritative Schema substitution. `packages/core/src/domain/flow-edit.ts:114` retains the existing document before replacing deletion collections. `:264` retains the validated document before the existing node/edge identity restoration. `packages/core/src/domain/flow-edit.schema.ts:95` now uses FlowDocumentSchema, whose optional nodeOrigin is declared at `flow.schema.ts:145`. Both loss points and the narrower transport contract are therefore addressed. Existing integrity decoding, operation semantics, deletion eligibility, error handling and unaffected node/edge reference restoration remain intact. No parallel type or additional runtime fallback was introduced.

The actual transport consumers continue to use that result Schema: `packages/foldkit/src/application.ts:189` and `delete-approval.ts:79`. The added application test at `application.test.ts:266` constructs genuine core edits and approved deletions, then encodes and decodes those actual response Schemas, retaining full packets and correlation identifiers. This is meaningful protocol coverage, distinct from mounted public API delivery.

The original core tests and existing application assertions remain unchanged apart from imports. The new core matrix covers explicit, unclamped and zero origins; ordinary/data/collection edits; compound deletion; empty and missing-target operations; untouched references; denial, rollback and protected deletion; absent versus own-undefined metadata; and malformed origin rejection. Four initial regressions failed against the unfixed implementation while the original eight core tests passed, as recorded in `intentional-pre-fix-regression.log`.

No additional implementation correctness finding was identified in this narrow final delta. That conclusion does not establish mandatory gate completion.

## Findings

### [TEST-COVERAGE-01] Final quality fails and focused verification has not completed

- **Evidence:** The final primary reproduction `/tmp/flow-084-primary-quality.log` exits 1 with require-readable-spacing at `packages/core/src/domain/flow-edit.test.ts:428:7`, plus formatting failures in `plans/edit-origin-preservation-execution.md` and `plans/edit-origin-preservation-provenance.json`. The executor's earlier `quality-repair-2-check.log` contained only the test spacing failure; the two record formatting failures appeared in the later frozen records. `verify-1.log` stopped at quality before its dependent gates. The two authorized focused repairs have been exhausted.
- **Impact:** Passing targeted units cannot satisfy Plan 084 acceptance. Final architecture, package builds, typechecking, complete unit selection, docs/contracts, packed consumer and the selected public-edits/versioned-persistence browser suites have not completed through the required focused verifier against this freeze.
- **Effort:** S for mechanical corrections; M for completing and reviewing the required verification.
- **Risk:** MED. Treating a prior checkpoint as final verification or silently starting a third repair would violate the approved STOP boundary.
- **Confidence:** HIGH. Final source, records and both primary reproduction logs were read directly.
- **Fix sketch:** Preserve this freeze and STOP without further edits. A separately authorized resumption must address all three final quality issues, retain existing assertions and scope, complete the required focused gates, and supply a new exact freeze with independent reproduction. This report grants no such resumption.

## Evidence limits

The primary reviewer reproduced the frozen targeted tests in `/tmp/flow-084-primary-targeted-tests.log`: 63 passed across two files, exit 0. This reviewer read that log but did not run the tests. It establishes final narrow core and packet unit behavior. The earlier 36-test checkpoint predates the final test split and is not the final result.

The approved verification selection is focused, with docs/contracts/consumer checks and existing public-edits/versioned-persistence files for Vanilla, Vue and Foldkit. The saved selection does not itself establish execution. Root reports diff-check success and released ports; those receipts are separate from behavioral acceptance. Plan 083 remains stopped independently.

## Conformity and deviations

**Conforming in source and targeted units:** Graph meaning stays in core; metadata comes from the authoritative Schema; edit/delete semantics and reference restoration remain unchanged; actual result packet Schemas retain origin through encode/decode. Scope and accepted input hashes conform to the approved design.

**Intentionally limited test boundary:** Core workflows and genuine packet Schema units establish edit/transport behavior. They do not exercise mounted browser delivery, native observer lifetime, HMR preservation or external collectors.

**Unverified or deviating:** Final quality fails in three places and the required focused verifier has not completed. No full-suite, host integration, release, CI, device, performance, collector delivery, semantic parity or parent-plan closure is established. The candidate remains isolated, unaccepted and stopped.
