# Plan 084 execution record

STATUS STOPPED. The second focused repair of the quality gate still fails `anti-slop(require-readable-spacing)` at `packages/core/src/domain/flow-edit.test.ts:428`. The plan permits two focused repairs per concrete required-check cause. No third repair, dependent gate, adapter change, or 083 continuation was performed.

## Receipt and inputs

Owned detached checkout is `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. Main remained read-only. The accepted 082 provenance record hashes `143fc0430e8dee2da7bd6a2c02404162d268f992f0475b6fbca6f5d784caa9ce`. All 116 output hashes matched before and after copying; that unchanged record is path 117. No missing paths, deletions, or extra source inputs were accepted. The copied plan and design review retain receipt hashes `9d88ad5738b55eb66e6f40c93d0073a1cd965cec49683ba0b3300dda38a68622` and `8077d771ee9436384a628e5568f7178ce4a27b43f6b9be14e9e14cbb2c34d8a7`.

Initial receipt, complete input hashes, manifest/lock hashes, command logs, and freeze artifacts are outside the source inventory in `/Users/richardmcandrews/.codex/worktrees/edit-origin-preservation/edit-origin-preservation-evidence`. Owned provenance is `plans/edit-origin-preservation-provenance.json`. Effect `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`, all recorded manifests, and `bun.lock` remain unchanged.

## Steps and actual results

1. Completed exact input assembly and matched the diagnosed source excerpts. `bun install --frozen-lockfile`, `bun run check`, and `git diff --check` exited 0. Logs are `install.log`, `preflight-check.log`, and `preflight-diff-check.log`.
2. Completed regression-first proof. With unchanged production, `bun run test -- packages/core/src/domain/flow-edit.test.ts` exited 1 with eight existing tests passing and exactly four new failures at retained-origin assertions. They cover ordinary label/position edits, prepared and approved deletion, direct result Schema decode, and direct result Schema encode. This intentional failure is saved separately in `intentional-pre-fix-regression.log`.
3. Completed the exact production delta: spread `document` before deletion arrays and `validated` before mapped result arrays, then use authoritative `FlowDocumentSchema` in the result field. Existing mappings, spans, integrity/deletion logic, failures, and public methods are untouched. Initial fixed regression run exited 0 with 12 tests passing in `initial-fixed-regression.log`.
4. Added transaction, optional-key, failure/rollback, identity, and transport coverage in the two authorized test files. The first combined run passed 24 core tests but could not resolve fresh `@flow/core` without its built distribution, saved in `targeted-tests.log`. `bun run build:packages` exited 0. The required combined named-file command then exited 0 with 36 tests passing in `targeted-tests-built.log`.
5. Partially completed. Saved the exact focused 084 config with docs, contracts, consumer, and only public-edits/versioned-persistence files on all three hosts. API generation exited 0 and did not change generated API documentation relative to 082. `bun run verify --list` exited 0. Ports 4176, 4177, 4178 were free before verification. `bun run verify` exited 1 at its first quality check; architecture, package-build, typecheck, all-unit, docs, contracts, packed-consumer, and browser gates were not started by that verifier.

   Quality repair 1 applied owned spacing/braces and config formatting. Its attempted split script failed before its intended mutations because its string selector did not match formatted source. The subsequent check still failed assertion limits, helper type, exception expectation, and spacing. Quality repair 2 split the broad core case into smaller tests, retained all assertions, typed the fixture helper, matched the real error class, supplied a SchemaError matcher, grouped complete packet assertions, and formatted only owned files. Its check still exited 1 with one spacing error at line 428. Both checks and tool outputs remain in the evidence directory. No lint configuration, assertion, skip, timeout, or tolerance was weakened.

   The last 36-test pass precedes these test-shape repairs. Final test files were not rerun by the executor after STOP. Production is identical to the last passing targeted checkpoint. Final test behavior and the required focused profile remain unaccepted.

6. Completed STOP freeze, exact delta/inherited hash audit, patch, external log inventory, and port release receipt. Final `git diff --check` exited 0. All three ports are free and were never claimed by executor browser servers. Primary source review and independent reruns remain pending; no completion verdict is delegated.

## Files changed relative to approved inputs

- `packages/core/src/domain/flow-edit.ts`
- `packages/core/src/domain/flow-edit.schema.ts`
- `packages/core/src/domain/flow-edit.test.ts`
- `packages/foldkit/src/application.test.ts`
- `verification.config.json`
- The exact copied plan and design review, this execution record, and owned provenance under `plans/`.

115 of 117 inherited paths remain byte-identical. Only inherited `packages/foldkit/src/application.test.ts` and `verification.config.json` differ within the approved allowlist. The three core delta files are from the exact baseline rather than additional imported checkouts. Generated API documentation remains byte-identical to accepted 082. No imported research, generated research summary, browser suite, adapter production source, dependency, manifest, lockfile, main/index, or stopped candidate was edited. No commits, pushes, merges, publication, or cleanup occurred.

## Production and test boundaries

Actual callers retain the existing routes into this core contract: core command preparation at `packages/core/src/domain/flow-runtime.schema.ts:1377`, Vanilla public edit resolution at `apps/vanilla/src/mount-flow.ts:8978` and publication at `:8981`, Vue edit preparation at `packages/vue/src/flow-canvas.ts:2182` and proposal at `:2190`, and Foldkit Graph requests at `packages/foldkit/src/graph.ts:719`, semantic proposal at `:739`, and uncontrolled document selection at `:747`. Approved deletion still calls core preparation at `packages/core/src/domain/flow-edit.ts:380`.

The result Schema consumers remain Graph out-message/result fields at `packages/foldkit/src/graph.ts:291` and `:330`, edit response at `packages/foldkit/src/application.ts:189`, and delete result at `packages/foldkit/src/delete-approval.ts:79`. The added Foldkit tests encode and decode genuine results from public core helpers through these two real packet schemas. They are protocol units. They do not mount Runtime, exercise ports, or establish DOM output. The core tests decode fixtures through the authoritative document boundary. No new mounted origin rendering, geometry, browser acceptance, HMR restoration, or collector delivery was established.

## Conformity and deviations

Conforming in source: graph metadata remains owned by core Schema, and document transformations retain the authoritative document contract. The narrow repair leaves Effect validation, atomicity, deletion eligibility/order, unaffected reference restoration, and observability unchanged. Initial targeted tests prove the four diagnosed losses and their repair, with broader transaction and packet coverage passing before final test formatting changes.

Intentionally different: this is a narrow metadata repair with saved edit/persistence browser scope. It does not resume the frozen 083 host candidate or establish native lifetime or preservation proof. This separation follows the approved plan and avoids carrying its exhausted repair budget into a new host candidate.

Unverified: the frozen final test shape, completed focused verification, mounted origin rendering, genuine HMR restoration, full host integration, full-suite acceptance, CI, native devices, collector delivery, broad parity, and primary acceptance. Quality is explicitly failed. No source similarity is treated as parity.
