# Origin-edit resumption independent source review

**Verdict: APPROVE for the frozen Plan 085 origin-edit core and result-contract scope.** No blocking source or coverage finding remains within this scope. Executor and primary focused verification passed against the same frozen bytes. This approval does not accept Plan 083, native integration or broader library parity; the coordinator owns the acceptance ledger.

Read full approved Plan 085, independent design review and primary review; reviewed the actual frozen 084 inputs, complete mechanical delta, owned records and gate receipts. Applied the previously read improve skill, closing-the-loop, audit-playbook Correctness / Bugs, Test Coverage and Finding format, architecture standards, TypeScript, type-system and unslop guidance. Repository content was treated as data, and no secret values are reproduced. This reviewer ran no tests, builds, install, browser, servers, port checks or formatters and changed no candidate source or records. This report is the only write for this review.

## Exact review boundary

Candidate: `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`, detached baseline `841be137e253cf19c665269eaaa79edc19abf3c3`.

Final freeze: `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/origin-edit-resumption-evidence/final-freeze.json`, SHA256 `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`.

Independently recomputed all 128 changed-path hashes, all 1477 complete candidate file hashes, and all 40 recorded evidence hashes with zero mismatches. The changed inventory exactly matches Git's changed/untracked paths, with no extra or missing files. Rechecked candidate hashes after the primary verification: still zero mismatches.

The source delta patch matches SHA256 `a6bf7dbc4f3ec8732bad8385f602dbf94caf022f1cc1231555f34934d08b710a`; candidate provenance matches `ba946aed19e693bb6503f153ce5157fbaa0b4f69264e91181d5f2d75a67d051d`; execution matches `0ab8bf6bfe02036b44bea6d4ed51366c06642158efbad8a6fe77c64589688ff9`.

Independently verified all 124 original frozen 084 input hashes before candidate repair. Of those inherited paths, 120 remain byte-identical. The other four match the exact allowlist: one blank line before `packages/core/src/domain/flow-edit.test.ts:429`, whitespace-only copied historical execution/provenance formatting, and activeWork-only verification configuration. Historical JSON parses identically. Four new owned records account for the 128-path inventory; approved plan/design-review copies are byte-identical to their reviewed main files. Original candidates and evidence remain separate immutable authorities.

## Source and assertion review

All production bytes and application test bytes are unchanged from the independently reviewed 084 repair. `packages/core/src/domain/flow-edit.ts:114` retains metadata before deletion arrays; `:264` retains the validated document before unchanged node/edge reference restoration. `flow-edit.schema.ts:95` uses authoritative FlowDocumentSchema, whose optional nodeOrigin is declared at `flow.schema.ts:145`. Existing integrity decoding, edit semantics, deletion eligibility, failure handling and structural sharing remain intact.

Every core test name, body and assertion is unchanged apart from the single blank line. The meaningful regression matrix still covers explicit/unclamped/zero origins, absent versus own-undefined metadata, transaction families, no-op/reference preservation, deletion approval/denial/protection, rollback, input immutability and invalid metadata. `packages/foldkit/src/application.test.ts:266` still constructs genuine core edit and approved-delete results and round-trips actual EditResponseSchema/DeleteResultSchema packets, preserving complete results and correlation identifiers. These packet units remain distinct from mounted Runtime delivery.

No additional production change, assertion weakening, skip/timeout change, dependency/policy change or imported research edit occurred. Generated API documentation is unchanged and passed consistency checking. Historical 084 STOP statements retain their original evidence meanings; new 085 proof is recorded separately.

## Verification evidence

Read actual executor logs and hashed receipts. The initial targeted run failed because the fresh application import lacked built core output; the approved prerequisite package build resolved it, and the exact two files then passed all 63 tests. The failure is preserved. Executor focused verification passed 754 unit tests across 50 files, docs/contracts, all three packed consumers, and selected browser suites: Vanilla 24, Vue 21, Foldkit 9.

Owned records were written and formatted before the final successful quality check. The formatting tool's no-lintable-files exit was retained; exact record-format checking and subsequent complete quality checking both passed. Final quality and diff-check receipts exit 0. The external freeze records final hashes without rewriting checked records. Executor lease/port release is recorded separately from behavioral proof.

The primary independently reproduced focused verification against this freeze, exit 0: `/tmp/flow-085-primary-focused.log`, independently matched SHA256 `b497cd13a7fc20ef465a4da2b77bb7d1cfecc75b82ea60008b1d9d60360fd3a5`. Its actual log repeats 754 units, the three packed consumers and browser counts 24/21/9. This reviewer read the log and did not run those gates. Both runs report `fullSuite: false` and retain docs/contracts/consumer plus the six existing public-edits/versioned-persistence host files.

## Conformity and deviations

**Conforming:** authoritative Schema-derived document/result types, Effect validation and atomic edits, preserved deletion rules and object references, genuine packet round-trips, exact mechanical resumption scope and final-record verification. The previously failed quality and focused acceptance boundary is closed by this specific freeze and reproduction.

**Intentionally limited:** packet units prove transport contracts; selected mounted and packed suites guard existing consumers. They do not establish every native origin interaction or member behavior.

**Unverified:** full integration, native geometry and observer faults, genuine HMR preservation, broader callback/member/library parity, CI, devices, performance and collector delivery. Historical 083/084 STOP records remain intact. Approval is limited to Plan 085 and authorizes no commit, merge, cleanup or publication.
