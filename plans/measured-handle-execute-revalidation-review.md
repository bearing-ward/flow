# Plan 065 fresh execution revalidation

Date: 2026-09-30. Reviewer: independent source reviewer. Verdict: **existing bounded acceptance remains supported; no repeated implementation is needed**. This record concerns the frozen `/Users/richardmcandrews/.codex/worktrees/contract-acceptance/flow` candidate at HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. It does not integrate its changes onto main or accept Plan 081.

## Reads and scope

Read the complete current main `plans/065-complete-measured-handle-refresh.md` and candidate `plans/065-primary-source-review.md` and `plans/065-acceptance-design.md`. The superseding acceptance at main plan lines 204-206 and candidate primary review lines 3-13 governs the older open/pending wording. Main plan lines 21, 32, 192 and 202 and the design's pending-review language retain earlier checkpoints; those statements are superseded historical prose, not a fresh unresolved-cell count.

Current status contains 29 tracked modified paths and two untracked acceptance records, consistent with the primary review's 29-file tracked scope. The tracked paths comprise mounted measurement fixtures and browser assertions, two core unit test files, pinned capture/harness/fixture/conformance evidence, three installed type probes, docs/traces/PROGRESS, verification configuration and 065 accounting/checker updates. No product implementation, public production facade, dependency manifest, lockfile, imported artifact, central architecture file or plans/README change is present. Files under apps/*/src in this diff are the named handle-refresh fixtures. The existing accepted measurement production authority is unchanged.

The primary record did not store a historical patch hash. Therefore this review establishes the matching path scope, current contracts and exact accounting, rather than claiming a byte-for-byte comparison with an archived acceptance patch.

## Fresh accounting evidence

Only the following checkers were executed by this reviewer; both exited 0:

- `bun run plans/check-065-reconciliation.mjs`: five groups, 63 original members, 189 retained host cells, zero unresolved owned cells. The checker explicitly limits its verdict to accounting and citations.
- `bun run scripts/check-api-member-contracts.ts`: 2,692 original members, 8,076 host cells, 868 owned groups and 7,887 required open cells. Structural ownership does not establish semantic closure.

A separate read-only JSON comparison against candidate HEAD confirmed identical closure identity sets, all groups and baseline/version metadata. Exactly 189 changed cells belong to owner 065: 18 `implemented-with-evidence` and 171 `reviewed-native-difference`. Catalog identity sets and document/page metadata also match HEAD; exactly the same 63 original 065 member records change. Other members and cells remain unchanged.

## Actual assertion boundaries

Production authority and mounted proof remain distinct. The unchanged public projection is `packages/core/src/domain/flow-measurement.schema.ts:233-305,335-383`; native public refresh routes are `apps/vanilla/src/mount-flow.ts:8609-8643`, `packages/vue/src/flow-canvas.ts:2485-2508`, `packages/vue/src/use-flow.ts:210-212` and `packages/foldkit/src/update-node-internals.ts:37-155`.

Mounted browser evidence in `apps/shared-e2e/handle-refresh-contract.ts:407-718` observes public dimensions, exact absence of React internal wrappers, eight distinct handles, declaration-derived source/target partitions and all four sides. Lines 485-499 collect actual DOM rectangles in graph units; lines 604-618 compare owner, dimensions, centers and reconstructed top-left coordinates. Lines 514-549 assert public malformed-ID rejection with unchanged accepted snapshot; lines 707-717 assert retained-current hidden dimensions for Vanilla/Foldkit and Vue's invalidated-generation fallback. Actual public callback references are captured in Vanilla fixture lines 27-40, Vue fixture lines 38-51 and Foldkit fixture lines 91-126. All three measured-geometry suites register the member case at zoom 0.5 and 2: Vanilla lines 290-299, Vue lines 125-132 and Foldkit lines 400-409.

Installed probes remain compile-time evidence, separately exercised by the packed gate. For example `tests/consumer/consumer.typecheck.ts:342-502` binds the public measured shape and positive/negative branches; lines 505-523 bind the asynchronous refresh result and reject the void/numeric-ID alternatives. Corresponding Vue/Foldkit probes are retained. Core unit paths separately prove explicit generation advancement/stale delivery (`flow-measurement.schema.test.ts:166-184,234-255`), same-ID kind/side filtering (`:319-354`) and current-hidden/unmeasured dimension branches (`:395-451`). None of these unit assertions proves that every native mount replacement advances its generation correctly.

The shared mounted replacement case (`handle-refresh-contract.ts:288-383`) adds/removes/restores handle declarations while the node remains present, then explicitly refreshes. It does not cover the additional same-ID Foldkit native node remove/restore registration case now recorded at main `plans/081-wire-origin-and-connection-hosts.md:9`. That 081 failing readiness boundary remains separate and unproved by 065's existing evidence; this revalidation does not repair or reinterpret it.

## Primary verification and remaining common criteria

Primary freshly ran the saved focused `bun run verify`, exit 0 in 52.599 seconds, log `/tmp/flow-065-execute-revalidation-verify.log`. This reviewer read that log: 414 unit tests across 46 files, 21 Vanilla + 15 Vue + 26 Foldkit browser tests, all three packed consumers and quality/architecture/builds/types/docs/catalog/member/contracts/traces passed. The log explicitly states `fullSuite: false`. Primary separately reports diff-check exit 0. This reviewer ran no builds, browsers, consumer processes or port operations.

The exact-pin two-capture reproduction remains the historical primary evidence at candidate `plans/065-primary-source-review.md:9`; it was not rerun this turn. Full-profile integration/release verification, current upstream refresh, hosted CI, native devices and collector delivery remain outside this fresh focused evidence. The plan's unticked common checklists do not establish those broader gates. Parents 057/066 remain open, and main closure data still awaits integration. No commit, merge, push or cleanup occurred in this review.

## Current identities

SHA256 values captured by this review. Primary subsequently appended the fresh execution evidence to the main plan; that appendix was reread, and its updated hash is included separately. The candidate tracked patch hash was rechecked unchanged at the end of this review.

| Artifact | SHA256 |
| --- | --- |
| Current tracked binary diff | `c5f7b2df19af5037a5baea740bcab5b35139a486ca57acc954587d514a9af528` |
| Candidate primary review | `54a52db3a27d53cf7ccb7116f3d3af308086effd6344924c85231c71c5a86017` |
| Candidate acceptance design | `beb5ef046f4d8ab627724548f74587f2fe7b383ca0a3b02f5b25d295978b7ecf` |
| Main 065 plan at initial full read | `31f5d28af31694aac4c5e862eea3ebb65a2f62996e8a270e5738cbcb55b77261` |
| Main 065 plan after primary's fresh-evidence appendix | `2c1b5a0eb64bd3f1af7ae0d752bd6340d138141f508601c2dcb1627a91fc8134` |
| Candidate closure JSON | `8e8308d47924a031b4a911192c78be9244cadc376613fcad60b16c223f43330b` |
| Candidate reconciliation JSON | `9f0946fc665264c1f90dd35c9c0224582c33b7c83ca4472c4673c0938945210d` |
| Shared mounted assertion file | `75faf8ddc03bf469d70a03f712a2fbed947935409ac2d47543387b4d77b60acf` |
| Core measurement implementation | `eacde0ccadffe9e2925bed39f936b698fd021f2258a4c7a4842355dd6a515c5b` |
| Core measurement unit file | `94501641c275d203e606061642e49001a4a9b9c1f41fb493a32ba20f320d3af6` |
| Saved verification scope | `1b31579fe4ff9cff69609893e276eaefcedfe34d8e68fc90ae9c200d08385db7` |

## Conformity and deviations

- Conforming within accepted and freshly passing tests: named handle owner/size geometry, DOM centers/top-left reconstruction, all sides/kinds, unchanged authority after malformed public input, batch results, handle declaration changes and explicit disposal settlement.
- Intentionally different under the named primary architecture review: total numeric dimensions with status, flat frozen center geometry, required nonempty branded declaration IDs, graph-owned side/kind and owner-scoped asynchronous refresh. All original union/array/parent identities remain present with their reviewed assertions. Nullable connection requests retain separate 067 ownership.
- Unverified by this review: the additional 081 same-ID native registration boundary, exact React callback/frame scheduling, broad parent/member parity and full-profile integration/release acceptance. No source-contract or accounting drift was found in this bounded revalidation.
