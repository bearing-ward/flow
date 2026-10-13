# Plan 088 independent final source review

Verdict: APPROVE the frozen pure path-helper candidate and its exact 32-member / 96-cell acceptance boundary. No blocking correctness, scope, type-contract or evidence-accounting finding remained after this review. This approval does not complete Plan 072 or establish mounted renderer parity.

Reviewed on 2026-10-02 by a fresh source reviewer, separate from the design reviewer and executor. Candidate `/Users/richardmcandrews/.codex/worktrees/path-helper-parity/flow` remains detached at `841be137e253cf19c665269eaaa79edc19abf3c3` and uncommitted. The sole product input is accepted 085, freeze `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`. No source from unaccepted 086 or independent factory 087 was borrowed.

The improve skill, closing-the-loop reference, audit-playbook Correctness / Bugs, Test Coverage and Finding format, project standards, TypeScript discipline and unslop guidance were readable and applied. Repository contents were treated as data. This reviewer changed only this main-checkout review record, ran read-only hash, inventory, semantic-diff and TypeScript-AST inspections, and ran no gate, installation, build, browser server, commit, merge or publication.

## Frozen scope and provenance

I independently verified all 1,495 complete candidate file hashes, all 39 changed/new input records and all 358 frozen evidence hashes. I repeated the complete 1,495/358 checks after the primary's focused reproduction, with zero mismatches. The final freeze remained unchanged. Actual Git HEAD and the complete cached/untracked/non-ignored file inventory match the frozen baseline and manifest, with no unlisted source path or deletion.

The complete accepted 085 manifest comparison gives exactly 21 changed files, 18 new files or approved supplements, and 1,456 unchanged inherited files. I reconstructed the complete `diff-from-accepted085.patch` from actual accepted-input and candidate bytes using the same unified-diff ordering. It matches the saved patch byte-for-byte. All 128 changed input, 1,477 complete input, 40 original evidence and eight initial supplement receipt entries retain equal expected/actual hashes. All 52 recorded command-log hashes in the provenance record resolve to their actual saved logs. Initial failures, pre-fix observations and older proposals remain present.

| Artifact | SHA256 |
| --- | --- |
| final-freeze.json | `7cce368bd085e6eed66bfbd31720f422d941e1224c669344e25624c2bac9e8f6` |
| diff-from-accepted085.patch | `77ddbc3b4d654ad3a8864ee578209dcf38f7dd03c6cbffe3d77cd00090ed25c1` |
| plans/path-helper-parity-provenance.json | `ae851c8c13075d0580a2a4f21aab21d580742fea47d6fa712358176fa0199bdd` |
| plans/path-helper-parity-execution.md | `abd77ff0836fef11e8bbe9d9254d6c4f68fffbb879899f006da340e98102a83d` |
| packages/core/src/domain/flow-edge-path.ts | `2935e850f4d7581d1c5e8a4c822c6cd901d8abb5a6e6c0f5e16b3a9a30f5cb6b` |
| research/fixtures/path-helper-reference.json | `aa2085f4364f63643607024d981ad80da2b3eaaf9ceb08e612751fff16b312eb` |
| member-proof-map-amended.json | `05e9d353dcf7e6c61426adf22d9963d1c8c529af524d3cc3e2ec52b5ec90aa33` |
| primary particular-proof checkpoint | `96ad448a7d10aa00c72339e5ba937c2bd81d7cc0ec55a00730d0207a46184545` |

These artifacts are in the candidate and its sibling `path-helper-parity-evidence` directory. The copied design, original approved packet, final design approval, prefix approval and particular-proof checkpoint match the recorded approval chain. The current packet's clarification permits the exact 32 remainingDecision and 96 equivalent strings only after the reviewed proof checkpoint.

Production changes are limited to the approved private Schema-derived parameter and tuple authorities, reuse of the authoritative side schema, getEdgeCenter type reuse, and the single same-side predicate correction. Core/public barrel, graph schemas, host production code, renderers, persistence, generic data, manifest/lockfile pins, compiler configurations, imported evidence and pre-existing fixtures retain accepted-input bytes. Other changed paths are the approved tests, capture, installed probes, bounded checker exception, member bookkeeping, docs, trace, active verification scope and plans/evidence records. Copied accepted primary prose and the new fixture have recorded format-only normalization; their originals remain frozen and the fixture's decoded observations are identical.

## Correctness and type-contract review

I read the entire real helper implementation and every production diff hunk. `packages/core/src/public.ts:327` exports getEdgeCenter; `:333-346` exposes the four existing path helpers and parameter names. Straight, Bezier, simple Bezier and smooth public calls reach the actual pure algorithms at `packages/core/src/domain/flow-edge-path.ts:141`, `:163`, `:210` and `:662`. There is no state, measurement, DOM or lifecycle boundary in this route.

The only arithmetic change is `!(difference <= offset)` at `packages/core/src/domain/flow-edge-path.ts:415`. Pinned `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/edges/smoothstep-edge.ts:153-164` performs the adjustment only when `diff <= offset`. The new early return preserves that condition when either operand is NaN. Math.min, assignment direction, routing points, labels, offsets, operation order and all other formulas remain unchanged.

I inspected all four pre-fix mismatch records. They concern left target-axis NaN, right source-axis NaN, top target-axis NaN and bottom source-axis NaN. The other 20 BUG-088-01 records retain their actual values, including all 12 below/equal/above finite controls and four NaN-offset cases. Final numeric mismatch records are empty. The original failing regression and primary prefix authorization remain part of the evidence chain.

Private module-level schemas use Number, optionalKey and FlowHandleSchema.fields.side at `packages/core/src/domain/flow-edge-path.ts:8-42`. The five-result mutable tuple authority is at `:44-48`. The existing defaults and synchronous raw arithmetic remain unchanged, with no per-call decoder, clamp, finite guard, new error API, overload or helper. The center reuses the straight coordinate authority and a private mutable four-number tuple at `packages/core/src/domain/flow-change-compatibility.ts:469-488`. Its arithmetic and other compatibility functions are unchanged.

The root retains exactOptionalPropertyTypes:true. Each installed consumer retains its previous permissive optional mode and skipLibCheck:false. All three appended compiler-probe functions are byte-identical, each contains 62 meaningful expected-error sites, and they compile against the real installed declarations. They cover required fields for all five helpers, raw-number positives, readonly parameters, literal sides, own-undefined positives for all optional fields, null/wrong-type/extra-option negatives, and exact mutable five/four tuples. Root-owned tests separately contain all 12 own-undefined negatives. No compiler policy changed to make these pass.

## Reference and test review

I read all capture normalization, descriptor construction, harness execution and capture-runner logic. The runner validates the clean exact upstream revision and React 12.11.6 before the frozen pnpm 10.33.4 build. Two fresh processes import actual built upstream exports; the harness contains no copied Flow algorithm. Callable validation, tagged NaN/infinity/negative-zero/undefined handling, input freezing, repeated-call freshness, tuple mutation isolation and exact result lengths are real assertions.

The two original capture arrays are equal to each other and every current fixture record. The primary's two independent corrected capture arrays also equal all 628 fixture records. Tracked-source before/after receipts are equal. The 504 numeric records comprise Bezier 99, simple Bezier 84, smooth 260, straight 31 and center 30. The remaining 124 records are outside-type diagnostics. Their original and final observation bytes remain equal; two invalid-side differences remain explicitly outside the acceptance boundary.

I read all assertion logic, including dedicated BUG-088-01 tests, global numeric comparisons, all 32 member assertion bodies, branch/default sensitivity assertions, tuple ownership checks, compiler negatives and target-checker tests. Generated literal data was inspected structurally rather than claimed as a manual line-by-line read. A read-only TypeScript-AST traversal checked all 32 core tables and 172 input/expected rows against genuine captured inputs and exact tagged outputs, with zero unmatched records. It also checked each of the three installed tables in declared order against all 504 numeric fixture descriptors, with zero mismatches. No expected value was accepted merely because Flow returned it.

All 32 particular conformance lists match the expanded frozen proof map exactly. Every case exists, belongs to the right helper and numeric domain, and reaches an actual full-outcome comparison. All 12 optional rows include own-undefined; both side rows include independently omitted source, target and both; each of 16 coordinate rows includes NaN, positive/negative infinity, negative zero and a large value. Four function rows enumerate their full numeric families. All source, unit, reference, pinned-result and three-context runtime links resolve to the actual linked assertions/descriptors. Particular declaration links identify the correct field or whole-tuple probe.

Installed probes call actual @flow/core imports, freeze inputs, require distinct stable returned arrays, mutate a returned numeric position, and require subsequent calls to retain their original tuples. `scripts/check-packed-consumer.ts:156-202` loads the genuine fixture and compares every serialized actual numeric tuple from each installed context. Replaced prefix-only checks are superseded by those complete comparisons. All other existing packed behavior/disposal assertions remain. This proves the pure installed API and declarations, not a mounted edge renderer or its attachments.

The checker exception at `scripts/check-api-member-contracts.ts:124-239` requires the fixed full page URL, exact singleton member/group identity, owner072, corresponding helper, core public entry, original operation, unit file and capture file. Existing safe-path, actual export, ownership and general proof rules remain. All other groups retain the original native public-entry rule. Positives cover all 32 groups and 96 contexts; 21 mutations plus the unrelated-group test reject specifically as target failures, rather than passing through a coincidental orphan error.

## Exact member accounting

I independently compared both complete JSON documents to the original accepted inputs by index and identity, not just aggregate totals.

- Exactly 32 group records change only obligation, requiredPlans and targets. Their previous sole `["069"]` prerequisite becomes `[]`; every other group/dependency remains equal. Owners, group IDs, pages, singleton members and ordering remain equal.
- Exactly 96 original cells change implementation-gap to implemented-with-evidence, decision and new proof. Every non-owned cell remains equal, including all original identities, contract IDs and ordering. Proof source/reference fields match their exact frozen member map; all three host identities remain present.
- Exactly 32 catalog members change remainingDecision and their existing three hosts. Exactly 96 hosts change partial to complete, bounded equivalent text and append five evidence links. Every previous evidence prefix remains equal. Original descriptions, anchors, owners, raw evidence, page metadata and every unrelated field remain equal.
- The baseline remains 2,692 original members, 8,076 host cells and 868 groups. Owned acceptance is exactly 32/96 with zero owned unresolved. Total open cells are 7,791. Accepted065 remains exactly 18 implemented and 171 reviewed differences. No getEdgeCenter or new row is fabricated.

I read every changed member's retained original description and new bounded decision/equivalence wording. The wording consistently names pure caller-coordinate math and installed package proof, while preserving the open whole072, native and generic boundaries. Whole-parent require-closed still exits1 for the remaining open work; the owned subset exits0. Those are compatible outcomes.

## Verification evidence

The primary independently ran `bun run verify` on these exact frozen bytes. I read the actual `/tmp/flow-088-primary-focused.log` and verified SHA256 `82f676699dbe2a487edac23586c0bf01bc27a7f14ed5b71586cba610d33c5b98`. The primary reported actual command exit0; the log records the completed focused gate in 25.885 seconds, 1,554 tests across 51 files with no skips, quality across 772 files, architecture across 207 production sources, four package builds, root types, docs, catalog/member/contracts, 2,443 citations across 70 traces, and all three real archive consumers. Each consumer compiled public declarations and matched 504 complete tuples. No mounted browser test files were selected; fullSuite=false.

Executor final focused exit0 in 28.977 seconds and log `ec9ea01590264c8e2d29abfbde9723e599f8779f31a52077427a24dc22b87765` corroborates the independent reproduction. Saved failures are preserved and are not counted as acceptance. The primary's post-run source/evidence hash check and this reviewer's final complete rehash both found zero drift. The primary reported the post-run 4176/4177/4178 listener check exited1 with empty output, then returned the shared slot to086; that is a past release receipt, not a claim about current port availability.

## Conformity and deviations

Conforming within this bounded proof: all captured numeric complete tuples from actual pinned exports, the reviewed NaN predicate, preserved defaults/raw arithmetic, readonly input and fresh mutable-result declaration contracts, and all three installed pure API contexts. The exact 96 original cells have real particular evidence and authorized accounting changes.

Intentionally different: framework-independent @flow/core owns these exports; schemas define static contracts without per-call unknown decoding. Root and installed compiler optional modes retain their respective existing behavior. Outside-type observations preserve existing malformed behavior and do not widen the public contract.

Unverified and excluded: whole072/057/066, mounted renderer/string geometry, attachment measurements, connection previews, gestures, generic data, full-suite integration, CI, devices, performance, OpenTelemetry collector delivery and broad library parity. This approval applies only to the frozen088 source and exact member subset. It authorizes no merge or publication.
