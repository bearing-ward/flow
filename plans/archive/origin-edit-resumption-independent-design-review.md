# Independent design review of origin-edit resumption

Verdict APPROVE for execution. This is design approval, not source acceptance or a claim that verification passed.

Reviewed on 2026-10-02 against main HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. Exact reviewed plan is `plans/085-accept-origin-edit-resumption.md`, SHA256 `c1f702f785e834da6974d847a9653c1630c7f26539c6d360049c7891cc5a1055`.

## Review scope and evidence

Read the Improve skill, its closing-the-loop requirements, plan template, and audit-playbook Finding format, Correctness / Bugs, and Test Coverage sections. Read repository architecture and verification standards, current plan index, the frozen source excerpts, result packet tests, and verification selection code. This was a focused cold design review. No source, verification gates, installs, builds, browsers, or ports were changed or run. The primary reviewer retains the final source verdict.

Independently hashed `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/edit-origin-preservation-evidence/final-freeze.json`. It matches the plan's SHA256 `109a4474797b0d34ebd6bac7c5773a25a8a0c423c13ce0e8c8e9d3b531b4a692`. Every one of its 124 listed actual files matched its recorded hash. The actual external `source-delta.patch` matches `550d58810042c1a63570e2bf7a7848d723030031d2f832a147c4267880f0db66`. Actual copied provenance and execution files match the plan's named hashes. The provenance describes 117 accepted-082 input paths, no input drift or deletions, and the two permitted inherited deltas. The frozen inventory contains no 083 repair input.

The 63-test reproduction and final three quality diagnostics are supplied primary-review evidence, not a new test run by this reviewer. The historical 084 record correctly retains its STOP and earlier 36-test boundary. Keeping that historical result while recording newer proof separately is sound.

## Correctness and scope

No blocking correctness finding.

The plan's source citations are accurate on its frozen input. `packages/core/src/domain/flow.schema.ts:143-149` owns the document Schema and optional origin. `packages/core/src/domain/flow-edit.ts:114` spreads the existing document before deletion arrays, and `:264` spreads the validated document before the unchanged reference-restoring mappings. `packages/core/src/domain/flow-edit.schema.ts:95` uses the authoritative document Schema. The remaining assertion at `packages/core/src/domain/flow-edit.test.ts:428` lacks the blank line specified by the narrow repair. No new production algorithm is necessary for this resumption.

Actual production preparation sites match the plan: Vanilla `apps/vanilla/src/mount-flow.ts:8978`, Vue `packages/vue/src/flow-canvas.ts:2182`, and Foldkit `packages/foldkit/src/graph.ts:669,719`. Their presence establishes the shared contract's consumers, not mounted origin behavior. The plan preserves that distinction.

The allowlist permits only the diagnosed test whitespace, copied historical record formatting, active verification scope, and new owned records. All other imported bytes must remain unchanged. Formatting copied records preserves their historical statuses and hash meanings; new output hashes belong to the new external freeze and resumption provenance. The immutable original checkout and evidence remain the input authority. The new checkout and sibling evidence directory remove write sharing with the old candidate.

The implementation and verification instructions are sufficiently self-contained for this bounded mechanical task. If the targeted Foldkit test cannot resolve a fresh workspace distribution after install, `bun run build:packages` is the diagnosed prerequisite documented in the copied execution record and the verifier baseline. It does not permit dependency or source changes. Preserve that failure and build receipt before retrying.

## Tests and final record verification

No blocking test-coverage finding for the declared core and result-contract boundary.

The existing core suite contains meaningful origin assertions, identity and input-immutability checks, deletion eligibility/denial and rollback cases, absent and own-undefined cases, and actual result Schema encode/decode coverage. `packages/foldkit/src/application.test.ts:266-343` builds genuine edit and approved-delete results, round-trips the real `EditResponseSchema` and `DeleteResultSchema`, and checks full packets. These are protocol units rather than mounted Runtime tests.

The saved configuration selects docs, contracts, and consumer checks and the six public-edits/versioned-persistence host suites described by the plan. `scripts/verification-plan.ts:64-70` also supplies quality, architecture, package builds, typechecking, and all unit tests. `scripts/verify.ts:67-89` executes checks serially and fails on a nonzero result. The cited tooling and Playwright configuration agree with the strict host ports and fresh-server policy.

Ordered step 5 fixes the historical record-verification hole: all owned records are written and formatted before the last successful quality and diff checks. No source or record may change afterward. External freeze hashes and logs avoid self-hashing. Step 6 requires primary verification on those same bytes and an independent source review before acceptance. Generated API consistency is checked without authorizing regeneration. Full verification is reserved for the subsequent integration milestone, consistent with the focused scope here.

## Continuation and review limits

The current explicit continuation authorizes this new candidate while preserving 083/084 historical STOP records and consumed budgets. The plan does not reopen or rewrite either candidate. Removing an arbitrary retry cap for diagnosed, reversible mechanical work follows the current authorization. It does not grant functional scope expansion or permit failed proof to be accepted.

The separate limit of two formal source-review revisions remains explicit. Exhaustion preserves and blocks that candidate, requires design refinement, and leaves independent authorized backlog work actionable. Unknown architecture, functional changes beyond the allowlist, evidence/dependency drift, foreign resources, and unexplained repeated environment failure still require primary review. This policy is clear enough to prevent routine formatting from becoming an artificial end to the user's broader task.

## Conformity and deviations

Conforming design preserves one authoritative Schema, derived types, Effect validation and observability, atomic edits, deletion rules, and structural sharing. There is no intentional semantic difference introduced by this resumption.

Core and real packet units support the narrow origin-retention boundary. Existing mounted edit/persistence and packed-consumer suites are consumer regression guards. Native origin rendering and geometry, observer failures, genuine HMR, full integration, member-level closure, CI, devices, collector delivery, and broad library parity remain unverified by this plan. The plan explicitly continues toward those requirements after bounded acceptance rather than declaring the user's parity objective complete.
