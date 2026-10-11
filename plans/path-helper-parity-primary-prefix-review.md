# Plan 088 primary pre-fix checkpoint

Verdict: APPROVE the bounded predicate correction and previously reviewed parameter/tuple typing. This is a pre-fix evidence checkpoint, not source acceptance.

The primary reviewer directly inspected all four mismatching full tuples, all 24 BUG-088-01 case identities and outcomes, the preserved failing regression, and both compared predicates. Every hash in the checkpoint matched its actual file. The unchanged Flow helper SHA256 is `c66f5ba19244840626df00500c9439ce85bbdb0483db6d76493e179bbc9e1697`.

Pinned xyflow `0a1f9575b25679f2880175de8d3eae21aedde921`, built React package 12.11.6, adjusts only when `diff <= offset` at `/tmp/flow-088-xyflow/packages/system/src/utils/edges/smoothstep-edge.ts:153`. Flow returns early only for `difference > offset` at `/Users/richardmcandrews/.codex/worktrees/path-helper-parity/flow/packages/core/src/domain/flow-edge-path.ts:418`. For NaN, both comparisons are false, so Flow enters adjustment while upstream does not. Authorize only changing that early-return predicate to `!(difference <= offset)`.

Two fresh upstream captures agree on 628 observations, 504 numeric and 124 outside the declared type. Both hashes are `27c6baa8ce00f4fb31a725633a6fc3d787a1e276ff28e8d76f00ec3c774eda17`. Exactly four numeric mismatches occur: left target-axis NaN, right source-axis NaN, top target-axis NaN, bottom source-axis NaN. All twelve finite below/equal/above controls pass, as do the other endpoint-NaN and all four NaN-offset controls.

The four-difference file SHA256 is `46597f289cbd786e90d24bcf6853388343bf323854b4d5fe5f133408987d2db3`. Full comparison SHA256 is `00d5223868cb314f8d413a8196e92689f7d8586215d5d604ea695cff9b64dd51`. BUG subset SHA256 is `608ada993cfcd82a6f5fe4ec9d3eac871428683eb9699732f1820ad24fb92e9b`. These files live in `/Users/richardmcandrews/.codex/worktrees/path-helper-parity/path-helper-parity-evidence/`.

The intentional pre-fix regression exited 1, with 8 failures representing the same four mismatches in dedicated and generic cases, 41 passes and 482 name-filtered tests. Log SHA256 is `de2f8858447569749ce192f04e5ec087c36cf0485efc267c47573ff444f7bae4`. The outside-type invalid-side observations remain diagnostic. No source acceptance, native renderer, full Plan 072, or original member closure follows from this checkpoint.

## Conformity and deviations

### Independent upstream rerun, 2026-10-02

After the bounded implementation checkpoint, primary independently invoked the actual capture harness twice in fresh Bun processes against the built public exports of the clean pinned `/tmp/flow-088-xyflow` checkout. Both exited0. All628 complete normalized descriptor/outcome records equal the preserved fixture, including504numeric and124outside-type records. Both primary raw outputs have SHA256 `c649e495395f506e3fe2b589f6b0261d2f04262ec346c30caba8444b58f4ee43`, saved at `/tmp/flow-088-primary-upstream-first.json` and `-second.json`. The harness also checks actual fresh mutable upstream results with frozen inputs and repeated calls. This rerun uses the previously built exact pinned exports and makes no new full install/build claim. Installed Flow archives, particular member closure and final source acceptance still await their named checkpoints.

The four cases are verified divergences requiring the bounded correction. The remaining captured numeric outcomes conform for these inputs. Outside-type behavior, native rendering, and final public archive/compiler/member proofs remain unverified until the approved final gates and independent source review.
