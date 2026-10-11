# 095 independent canonical validator decomposition v2 design review

2026-10-02. Verdict: **APPROVE_DESIGN** for the exact v2 packet. The sole TEST-01 revision is resolved by one independent additive same-parent duplicate-child first-error test. The validator algorithm is unchanged. This is a narrow design follow-up to `plans/selector-canonical-validator-decomposition-independent-design-review.md`, not executed source acceptance.

Main and candidate HEAD remain `841be137e253cf19c665269eaaa79edc19abf3c3`. Same095 remains STOPPED until a separate root LOCAL release. The sole shared lease remains with 092; all 513 parent cells remain OPEN; formal SOURCE rounds remain zero. This review releases no source, shared/focused/member gate or acceptance boundary.

## Exact reads and independent byte checks

Main is `/Volumes/Sync/codex/9-19-26/flow`; W is `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`; E is its sibling `selector095-evidence`. `plans/` references resolve in main; `flat-validator-proposal-v2/` references resolve in E; actual source references resolve in W.

I personally read all 234 lines of v2 `proposal.md`, the complete 13-line additive test block, the complete additive conformance diff, the complete 156-line proposed predicate, the complete canonical schema diff, the exact proposed test-file tail and the baseline probe receipt. The prior complete actual schema/test reads and algorithm/narrowing/mechanical-control review remain in the unchanged first review. I independently verified the current candidate source and test identities, every artifact listed in the v2 manifest, exact block-removal restoration and the exact predicate replacement. I did not rely on the manifest's restoration claim alone.

| Input | Bytes | Independently matched SHA256 |
| --- | --: | --- |
| E/flat-validator-proposal-v2/proposal.md | 16587 | `bdb18f2540c702eb73a0f466db30d62b8ace744d0a208a151128d6b878f13d96` |
| E/flat-validator-proposal-v2/proposal-manifest.json | 4703 | `8c42138c824c8ceb49bcaef2cc44330442867059eb25df0fd0327db111c04de1` |
| E/flat-validator-proposal-v2/proposed-canonical-predicate.ts.txt | 4073 | `17c759bfa2ade3d64647dcf76b832cb470bc9c4679c88a0598541054fc9fd672` |
| E/flat-validator-proposal-v2/additive-same-parent-test.ts.txt | 368 | `2b2178ff64c0c72661ad139e5e809a13f1cf780403549d36d68faf3c393fc8b5` |
| E/flat-validator-proposal-v2/additive-conformance.diff | 602 | `491e6745ace3fb44c609ee732cc368479468a5ea5196f510aacd1b7ef174d19a` |
| E/flat-validator-proposal-v2/proposed-conformance.test.ts.txt | 17443 | `4599148f0677c1dfbf749cf17074c590d844e400e272430a7c1264a1d45fcefa` |
| E/flat-validator-proposal-v2/proposed-fixture-schema.ts.txt | 13870 | `98fbc3c628bc1a342967e079daa522dfcf0302b8d7d4c2e5aead65860975a347` |
| W/research/harnesses/selector-lifecycle/fixture-schema.ts | 12601 | `325f0f8a1e6bf6293da69cb6797809cbcec7895889ffdbdb4fb509df64f01cdb` |
| W/packages/conformance/src/selector-lifecycle-reference.test.ts | 17074 | `861cd77b3ded37e965672172e76b2e375e5e1c5f527eb3818575de82f2497d65` |
| plans/selector-canonical-validator-decomposition-independent-design-review.md | 19169 | `27b143f9ef9cdc54a4967bb2a296366a6eedb6d9087f9bccd331e54f4d136ffc` |
| plans/selector-same-parent-duplicate-baseline-probe.json | 442 | `ae8f2f0d42c200b85d9a00300c66cf4589fc238eab1d7d6c6d2cae874b5218b4` |

Every listed v2 manifest artifact matches its recorded byte count and hash. The unchanged prior review and baseline probe copies match main exactly. The v2 predicate matches v1 byte-for-byte.

## Sole revision resolved

V2 `proposal.md:190` now accurately states that the existing 13 independent controls cover earlier-parent reuse, while containing no same-parent repeated child. It distinguishes the actual table at `selector-lifecycle-reference.test.ts:508-515` from repeated object keys with distinct children at `:518-529`. The false v1 coverage claim is corrected rather than carried forward.

The distinct new body at `proposal.md:196-214` and `proposed-conformance.test.ts.txt:562-574` uses the exact root-1 table with a string at node 0 and array values `[0,0]` at node 1. It calls the real `S.decodeUnknownSync(NativeEvidenceValueSchema)` directly and asserts `.toThrow('a node must have exactly one parent')`. It uses no encoder-generated expectation, JSON pretransport, internal exported helper, fixture or new dependency.

This assertion distinguishes the required first failure from later generic rejection. At the first child the proposed helper sees parent count zero, records child 0 in its local set, and advances cursor to 1. At the repeated child, the set check at `proposed-canonical-predicate.ts.txt:73-75` produces the parent-reuse string before contiguity. If that check were removed, childStart would still be 0 while cursor is 1, and `:81-82` would produce the different contiguity string. A generic exception or `S.SchemaError` assertion would pass both behaviors; this message-specific assertion does not. The previous algorithm-equivalence proof explains why the unchanged monolithic predicate produces the same original parent-reuse string first.

I independently located exactly one inserted block, including its separating newline. Removing it from the complete proposed conformance bytes yields the entire actual current W test file exactly, with SHA256 `861cd77b3ded37e965672172e76b2e375e5e1c5f527eb3818575de82f2497d65`. The packet's current-conformance copy also matches that actual file exactly. Thus every existing expected table, all 13 independent bodies, imports, helpers and the genuine fixture-dependent body are byte-preserved in this additive proposal. The complete file contains 14 current test bodies including the one genuine case, and 15 proposed bodies including that same genuine case. The independent transport count changes from 13 to 14. No source test body has yet changed.

Root's baseline probe receipt records `CURRENT_UNCHANGED_MONOLITHIC_VALIDATOR`, the same literal table, rejection true and exactly the required parent-reuse message. Root reports actual read-only exit 0. I read and rehashed the receipt; I did not rerun the probe. It supports the original first-error behavior only. It does not establish a proposed-source test pass, compilation, quality or native acceptance.

TEST-01 is resolved in the design. No further revision finding was identified in this narrow follow-up.

## Unchanged structural merit and scope

The complete proposed schema text reconstructs exactly by replacing the actual current predicate block once with the unchanged 4073-byte replacement plus its separating newline. All other schema bytes remain identical. The complete schema diff confirms there is no additional structural change. The local finite Tree Struct, Schema-derived Index/Node/Tree types, keys/subtree/root/orchestration helpers, same-parent seen set, earlier-parent readonly counts and deferred parent commit are precisely the same reviewed design.

The initial review's conclusions remain binding: every canonical invariant and first-failure order is preserved by inspection; successful parent/start maps are equivalent; failed invocation-local temporary state does not escape; genuine installed `S.is(S.String)` and `S.makeFilter` supply the real narrowing/filter contracts without casts; and the ten-path mechanical import/destructuring/braces/spacing/bare-return corrections need not alter assertions or accepted lifecycle sequence. No new wire field, source helper path, interface, Class, recursive Schema dependency, mutable holder, algorithm variant, compiler/dependency/config waiver or production/public/reference change is introduced by v2.

V2 `proposal.md:220-230` retains the same bounded mechanical corrections, first-structural-failure STOP, future preservation/native types/complete quality/architecture/filtered and preserved units/retention/diff/freeze requirements, and withheld shared operations. The future filtered transport scope now expects the additional 14th independent control. Its actual executed count and final source identity must be recorded after a separate release. Existing 13 bodies and the required genuine reference body remain intact; genuine acquisition stays `UNRUN_REFERENCE_ACQUISITION_WITHHELD`.

I ran only read-only inspection and byte/hash comparisons. No source/E/protected corpus/config edit, compiler, build, formatter, quality, architecture, unit, verifier, browser, native/reference, archive, install, pin/listener, Git mutation or child occurred. This new main `plans/` review is the only write. The previous review remains unchanged. Exact proposal compilation, actual helper complexity and the new test's runtime pass remain unverified; no successful complexity score is inferred.

## Conformity and deviations

Conforming by inspected design: v2 supplies the precise missing independent same-parent duplicate-child first-error control, corrects the coverage claim and preserves all existing test-file bytes outside that additive block. The unchanged canonical decomposition retains the previously reviewed invariants, failure order and real Schema-derived contracts. Its future local test boundary is the filtered 14-control transport scope plus preserved units after separate release.

Intentionally different: one independent 14th body is appended to the evidence transport describe. The internal helper decomposition and successful-node parent-count commit remain the previously justified organization changes. Neither addition changes production/reference contracts, expected values in existing bodies, accepted lifecycle sequences or immutable failed evidence.

Unverified: proposed-source compilation, quality/helper complexity, the new test's executed result, actual native/host attachment/reference/React/retention/final-freeze behavior, installed archives, focused/full/root/SOURCE/member/parent acceptance, all 513 cells, CI/devices and collector delivery. Current complete quality remains exit 1. This APPROVE_DESIGN verdict resolves the sole design revision and grants no executable acceptance or lease release.
