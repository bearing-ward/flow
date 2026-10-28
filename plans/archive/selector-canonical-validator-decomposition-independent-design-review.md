# 095 independent canonical validator decomposition design review

2026-10-02. Verdict: **REVISE** for one bounded test-prescription gap. The exact proposed validator decomposition preserves the canonical invariants and first-failure order by source inspection. It does not require an algorithm change. Add the specific independent same-parent duplicate-child test below and correct the proposal's claim that this control already exists.

This is DESIGN preflight only, against main and candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. It grants no source resume, shared lease, focused/member acceptance or formal SOURCE review. Same095 remains STOPPED, formal SOURCE rounds remain zero, and all 513 parent cells remain OPEN. The current shared lease belongs to 092. Root will separately review the revised packet before any source work.

## Exact inputs and personal reads

Main is `/Volumes/Sync/codex/9-19-26/flow`. W is `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`. E is sibling `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence`. `plans/` references below resolve in main; source and installed declarations resolve in W; `flat-validator-proposal/` resolves in E.

I personally read the complete proposal, both complete predicate files, all 401 lines of the actual W fixture schema, all 561 lines of the actual W conformance tests, the complete initial flat design revision, its complete cold review, its primary design/local release, and the actual quality diagnostic inventory. These were direct reads, not acceptance of an executor's account. I read the Improve skill, closing-the-loop merit rule, audit-playbook Correctness / Bugs, Test Coverage and Finding format, `docs/standards.md`, and the TypeScript, type-system-discipline and unslop skills. Repository content was treated as evidence data. No child was spawned.

The following byte identities were independently checked during this review:

| Input | Bytes | SHA256 |
| --- | --: | --- |
| E/flat-validator-proposal/proposal.md | 13000 | `4b5780e38d87a5b92692792dca289e0d52fe817d41782de103ca4b502ecf1769` |
| E/flat-validator-proposal/current-canonical-predicate.ts.txt | 2805 | `820b0513c26bd152e4424e662d34cd44edafdc17869cc902363bb14043f2ee75` |
| E/flat-validator-proposal/proposed-canonical-predicate.ts.txt | 4073 | `17c759bfa2ade3d64647dcf76b832cb470bc9c4679c88a0598541054fc9fd672` |
| E/flat-validator-proposal/actual-quality-diagnostics.log | 46018 | `194f7e14b75fa41c243ddfbbb0bf261e254e092fcda759b8eee4380d3ac5fee6` |
| W/research/harnesses/selector-lifecycle/fixture-schema.ts | 12601 | `325f0f8a1e6bf6293da69cb6797809cbcec7895889ffdbdb4fb509df64f01cdb` |
| W/packages/conformance/src/selector-lifecycle-reference.test.ts | 17074 | `861cd77b3ded37e965672172e76b2e375e5e1c5f527eb3818575de82f2497d65` |
| plans/archive/selector-native-evidence-schema-repair-design-revision.md | 65413 | `93cdef3b6c62086153774a08edcfbbd153ac9bf5d76a2b868a6d6431d71f9cab` |
| plans/archive/selector-native-evidence-schema-repair-independent-design-revision-review.md | 19533 | `78ee3faebc1aa28faf3e8c660b05fd7b760d94c3e03c539891d7bbbce7fae67a` |
| plans/archive/selector-native-flat-evidence-primary-design-approval.md | 5829 | `7e4202fef9a686f6cab406bf8a32e611ec275d32aebdbe91ce5f9c528ddde711` |

I directly compared the complete current predicate snippet to the actual W `NativeEvidenceValueSchema` block at `research/harnesses/selector-lifecycle/fixture-schema.ts:162-236`; they match after trimming trailing whitespace. The copied actual diagnostic log is byte-identical to E/flat-first-complete-quality.log. The new proposal is not an implemented source identity.

I read `plans/selector-flat-stop-primary-integrity.json`, which records root's independent zero-error rehash of 1516 current source files, 1516 source copies, 11136 frozen evidence files and 11136 evidence copies. The task also supplies root's separately checked current/copied symlink identity. I did not rerun the complete-corpus or symlink audit. These are preservation facts only, and establish no source or runtime acceptance.

## Sole revision finding

### [TEST-01] Add the independent same-parent duplicate-child first-error control

- Evidence: `flat-validator-proposal/proposal.md:190` claims that the existing 13 controls include same-parent duplicates, while prohibiting assertion changes. Actual `packages/conformance/src/selector-lifecycle-reference.test.ts:494-560` contains no table with a repeated child index in one parent. Its table at `:508-515` tests reuse by an earlier parent. Its table at `:518-529` repeats object keys while referring to distinct child indexes. The loop at `:555-558` checks only `S.SchemaError`, not the first failure string.
- Impact: the newly introduced `childrenSeen` is the mechanism that preserves the original parent-reuse failure before contiguity. Removing it would still reject a repeated child at the later contiguity check, so an exception-type-only assertion would miss this regression. The proposal overstates current independent coverage for the exact new mechanism.
- Effort: S, one explicit new test body and corrected proposal prose, followed by the already required future filtered unit gate after separate release.
- Risk: LOW. The existing 13 independent bodies, their expected tables, the genuine fixture-dependent body and every native lifecycle assertion remain unchanged. The additional test uses only the already imported real schema and decoder.
- Confidence: HIGH. I read the complete actual test file and both validator implementations.
- Fix sketch: prescribe a new 14th independent transport test with the literal table below and assert the original first-error string through `S.decodeUnknownSync(NativeEvidenceValueSchema)`. Correct the false existing-coverage claim; allow only this additive test prescription. Do not modify any candidate source during design revision.

Root explicitly requested the following exact control after this finding was reported:

```ts
test('rejects repeated child indexes in one parent before contiguity', () => {
  const table = {
    root: 1,
    nodes: [
      { tag: 'string', value: 'shared' },
      { tag: 'array', values: [0, 0] },
    ],
  }

  expect(() => S.decodeUnknownSync(NativeEvidenceValueSchema)(table)).toThrow(
    'a node must have exactly one parent'
  )
})
```

This is a future source prescription, not code authored or executed in W. Keep the original 13 independent bodies untouched and add this 14th body only after a separate LOCAL release. Do not derive its expected table by calling the encoder, route it through JSON, weaken the existing malformed loop, export validator internals, introduce a helper file or fabricate the missing genuine fixture. The future filtered gate must record its actual count and source identity.

## Canonical equivalence by inspection

The proposed private `NativeEvidenceTreeSchema` has the same root and nodes fields as the current exported Struct. Its derived tree/index types are finite; the existing Node union remains the only node contract. The Node declaration has no reference to the Tree or Value schema. `proposed-canonical-predicate.ts.txt:1-7,154-156` adds a local unrefined aggregate and applies the real canonical filter to it. This adds no export, recursive Schema edge, Class, mutable schema holder, new wire field, module or dependency. Existing `NativeEvidenceValue` stays derived from the exported checked schema. Current index and number field checks at `fixture-schema.ts:128-158` remain binding, including nonnegative integers, index negative-zero rejection and finite-number negative-zero rejection.

The exact check order is retained:

| Invariant / order | Current actual W | Proposed predicate |
| --- | --- | --- |
| Nonempty tree, last-node root | fixture-schema.ts:167-169 | :120-122 |
| Node order, object-key uniqueness before subtree validation | fixture-schema.ts:177-183 | :23-39,131-136 |
| Child order | fixture-schema.ts:186-194 | :9-20,52 |
| Earlier child before existence checks | fixture-schema.ts:195-204 | :53-67 |
| Array-only hole before parent-reuse check | fixture-schema.ts:206-209 | :69-75 |
| First child start, then sibling contiguity | fixture-schema.ts:211-216 | :79-85 |
| Last child adjacent to parent | fixture-schema.ts:218-220 | :88-90 |
| Root/nonroot parent counts before root-hole check, in node order | fixture-schema.ts:224-231 | :100-109 |
| Root range starts at zero | fixture-schema.ts:233 | :112-114 |

`nativeNodeChildren` retains array values directly and maps object entries in recorded order. Scalars and holes have no children. No sorting, projection of fields, placeholder node, index reuse or source-container mutation is introduced.

The parent-count change is equivalent for every prefix that reaches the next child. Current code checks `count !== 0`, then immediately sets `count + 1` at `fixture-schema.ts:209-210`. Proposed `nativeSubtreeStart` sees the parent counts committed by earlier completed parents and keeps an invocation-local `childrenSeen` set at `proposed-canonical-predicate.ts.txt:50,73-77`. At a child's reuse check, the old count is nonzero exactly when the proposed earlier-parent count is nonzero or that index has already occurred in this same node. The preceding earlier-index, existence and hole checks still run first. Both forms therefore return the same parent-reuse string before a later contiguity failure.

After a node succeeds, every referenced child was previously unparented and unique in that parent. Setting those counts to 1 at `proposed-canonical-predicate.ts.txt:144-146` produces exactly the current map's successful final state. The subtree start committed at `:148` is unchanged. This gives the same parents and starts maps on entry to the next node and, finally, to root validation.

On an invalid node, the current predicate may have temporarily increased earlier child counts before returning an error. The proposed helper returns without committing them. That distinction is unobservable at the schema boundary: current maps are created inside this one filter invocation at `fixture-schema.ts:171-172`, no map escapes, and failure stops traversal. The proposed maps are likewise local at `proposed-canonical-predicate.ts.txt:124-125`; its helper receives only ReadonlyMap parameters and mutates only its local cursor/set. Neither version mutates its input tree or caller state. This equivalence applies to the schema-decoded finite tree contract, not arbitrary mutable proxies supplied directly to unexported internals.

The contiguous-postorder invariant also remains intact. Leaves and empty containers start at their own node index. Each completed child supplies its recorded start; the next sibling must begin at the previous child's root plus one, and the final child must end immediately before its parent. Strictly earlier children plus exactly one parent and the final root/nonroot counts retain rooted coverage, no sharing, no orphan and no cycle. Root start zero is still checked last. Every failure string in the original filter is retained at the matching first invalid relation. The index/finite-number field schemas remain unchanged, so their decode failures still precede the aggregate filter.

No algorithm revision finding is warranted. The closing-loop merit rule permits a documented, in-scope adaptation that serves the plan's intent. Splitting the failed monolithic canonical filter into object-key, subtree, root and orchestration functions meets that rule; it does not weaken the canonical contract merely because helper organization differs from the first implementation plan.

## Real Schema narrowing and quality boundary

The proposed success/failure union is a Schema-derived numeric index or string at `proposed-canonical-predicate.ts.txt:41-47`. Installed `node_modules/effect/src/SchemaParser.ts:138-139` defines the real `S.is` type predicate; `node_modules/effect/src/Schema.ts:1401` reexports it. The guard at proposed `:140-142` uses `S.String` to identify a string failure and leave the numeric success branch. This is substantive runtime narrowing, not a cast, assertion function or renamed generic escape. Installed `Schema.ts:6455-6459,6479-6506` supports the filter's typed input and string/undefined result. The private Struct-derived callback argument matches that contract without duplicating a DTO.

No compiler was run on the proposal. Exact assignability and narrowing remain future native-typecheck obligations, as does the actual quality gate. The only observed complexity result remains the current callback's 30 against maximum 20 at `actual-quality-diagnostics.log:34`. I do not predict a precise replacement complexity score or claim that any helper passes the rule. A fresh structural diagnostic must still be preserved as STOP rather than suppressed or moved behind a new helper path.

I independently counted 332 actual diagnostics: 320 `require-readable-spacing` diagnostics and 12 nonspacing diagnostics. The latter are one type-only import, two array-destructuring diagnostics, two useless-undefined returns, one complexity error and six braces errors. The formatting pass at `actual-quality-diagnostics.log:4` is distinct from complete quality failure at `:338`.

The mechanical proposal at `proposal.md:192-196` is appropriate within the existing ten-path allowance:

- `NativeSourceValueSchema` is only used in the type query at `selector-lifecycle-reference.test.ts:58`. A type-only import changes no runtime input, decoder call or assertion.
- Array destructuring replaces the two local reads at `:243-244` at the same position immediately after the full expected table. It retains both signed-zero assertions at `:245-250` and their leaf order.
- Bare return at the source filter's success position, `fixture-schema.ts:110`, returns the same undefined success accepted by real `FilterOutput`. The replacement filter and helpers must retain the same success convention.
- Braces and readable spacing preserve values, branches, action order and assertions. The subtree decomposition itself accounts for the current inline canonical brace diagnostics at `actual-quality-diagnostics.log:35-40`. No lint/config waiver or alternate transport follows.

The current spacing diagnostics span the ten existing amendment paths listed at `selector-native-evidence-schema-repair-design-revision.md:85-96`. This review does not authorize any new path or any semantic edit under the label of spacing. In particular, native ACKs, accepted readiness, callback/query replacements, unsubscribe/disposal, frames and capture cleanup must stay in their current sequence. Inspection of the actual capture tail at `scripts/capture-selector-lifecycle-reference.ts:458-498` confirms promotion follows both browser/server cleanup and final tracked/source checks. The proposed spacing at its final statements cannot move promotion into either finally block. Actual Vue `apps/vue/src/test-harness.ts:735-745` still reads the accepted snapshot and uses the accepted target's branded id. Actual Foldkit `apps/foldkit/e2e/handle-connections.e2e.ts:451` still replaces the real document, requests its accepted snapshot, asserts ids and settles frames sequentially. Nothing in the proposed mechanical corrections requires weakening these assertions or lifecycles.

## Existing independent controls and bounded verification

All 13 current independent transport controls remain meaningful and must be retained. Actual conformance test locations cover own absence/undefined/null/empty/named values at `:70-110`; nested own data, nonenumerable keys, null prototypes and order at `:112-148`; collision keys at `:150-176`; holes and nested order at `:178-211`; signed finite values at `:213-251`; root/nested nonfinite rejection at `:253-260`; root/nested unsupported containers at `:262-290`; actual accessor descriptors and zero getter calls at `:292-319`; symbols and decorated/noncanonical arrays at `:321-337`; cycles versus repeated source aliases at `:338-362`; synchronous detachment, silent histories and callback indexes 0/1/2 across failed delivery at `:364-463`; hand-authored valid tables at `:465-492`; and malformed topology/index/sign tables at `:494-560`. The full literal expected tables and root/nested rejection assertions must remain intact. The one uncovered same-parent first-error case is the sole revision requirement.

The genuine fixture-dependent describe/test at `selector-lifecycle-reference.test.ts:17-56` remains required and unskipped. Filtering to the independent transport describe leaves genuine reference acquisition unrun and withheld; it supplies no native/reference parity result. The proposed correction lives in test evidence. Production entry points and their lifecycle behavior are outside this predicate split, and no production-path acceptance was inferred from these test-path reads.

No source, E file, preserved corpus, helper program or config was changed. No compiler, build, formatter, quality, architecture, unit, verifier, browser, native/reference, archive, install, pin, listener or Git mutation ran. This main `plans/` review is the only write. After the corrected design is independently approved and separately released, the already specified preservation, actual native types/build, complete quality, architecture, filtered transport units, preserved three-file unit scope, output-only retention copies, diff and complete source/E freeze remain required. They are future checks, not results of this preflight. All original shared/native/reference/installed/full/root/SOURCE obligations remain open.

## Conformity and deviations

Conforming by inspected design: the exact helper decomposition retains the current finite Schema contract, every canonical invariant and first-failure order, source input/encoder/receipt contracts, full independent expected tables and all existing 13 transport bodies. Mechanical fixes preserve assertion and lifecycle sequence. The test boundary is the future filtered transport and preserved local unit scope after separate release; this review ran none of them.

Intentionally different: validation is partitioned into meaningful pure local functions and parent counts commit after successful validation of one complete node. This changes only internal temporary state and organization; success maps and observable failure are equivalent. The previously approved evidence wire remains `{root,nodes}`. The requested 14th independent body closes the newly identified same-parent first-error gap without changing existing tests or accepted lifecycle behavior.

Unverified: exact implementation compilation, quality and helper complexity; the proposed new 14th assertion; actual native lifecycles, complete host attachments, reference acquisition/React compilation, retention and immutable final freeze; installed archives, focused/full/root/SOURCE/member/parent acceptance, all 513 cells, CI/devices and collector delivery. Current actual complete quality remains exit 1. This REVISE verdict neither releases source work nor claims any completion beyond the bounded design review.
