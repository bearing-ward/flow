# Plan 091 independent design revision review

2026-10-02. Verdict: **APPROVE the exact amended bounded design.** TEST-COVERAGE-091-01 is resolved in the design contract. No residual blocking design finding remains. This approves neither implementation nor source dispatch, and closes no original member or parity family.

## Exact packet and preserved first review

Read the full amended 231-line Plan 091 and full 155-line companion, their complete diffs against the preserved first packet, the preservation manifest, and the corrected primary review. Independently matched these SHA256 identities:

| Record | SHA256 |
| --- | --- |
| `plans/091-replace-live-connection-options.md` | `583b914a1fd7e2ef946fcf44daefd605ed774d830bb8179084edaabe63f180f7` |
| `plans/archive/live-connection-options-design.md` | `9b2be8b638117ed47d4f33bf18e9463922272d0d2f276cc0d66bc69ab5dd983a` |
| `plans/archive/live-connection-options-primary-design-revision-review.md` | `42806442fd00d220ce49e41f57923c017f338a9eaca8db2be1ad9aaa7f8711a7` |
| Original `plans/archive/live-connection-options-independent-design-review.md` and exact `plans/091-first-review-verdict.md` copy | `28bab168856a6c4125668982fdc5ddc5bf7c296ebedc7ed7903ee1e9cf59c531` |
| `plans/091-first-review-plan.md` | `834707c1ee4c83bd8323aea2f952fcf6d0871e22942a77ae2b9de6e216eb2cc5` |
| `plans/091-first-review-design.md` | `ba881ae962572084cb0434c31390cca0e8c95d973edc71eb63c8fdc818de46e3` |
| `plans/091-first-review-inputs.md` | `37fbbe1378f1498a5f08c9046c3db83c1464c5843c187b2e150036ffc8ee0b54` |

The original independent REVISE report is unchanged. The corrected primary review explicitly withdraws the false no-packaged-Vanilla premise; approval here comes from the actual amended contract and source reads, not the primary verdict. The full first review retains the original source/lifecycle assessment. This residual review changes only its named installed-proof finding.

Rehashed `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json`, matching `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. Rehashed all 1,492 accepted candidate files and all 122 evidence files against the packet again, with zero mismatches. Every relative accepted-source location below resolves under `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`; plan/design locations resolve under main.

## Installed Vanilla finding resolved

Amended Plan 091 `:159-161`, `:185-189`, `:211-215`, `:221-223` and companion `:91-99` now require all three distinct proof boundaries: common installed core contracts, actual archived Vanilla methods, and local native preview/gesture behavior. The former app-only package premise has been removed from both current documents.

Both exported Vanilla controller types must be imported from actual `@flow/vanilla` in the already-allowlisted `tests/consumer/consumer.typecheck.ts`. The plan separately requires exact unknown replacement parameter, Promise of authoritative Schema-derived result and snapshot readback signatures for FlowController and JavaScriptFlowController. Positive unknown-input calls and incompatible result/readback/discriminant negatives are appropriate; malformed runtime input is correctly allowed by the unknown signature and tested as a runtime rejection instead of a fabricated compiler negative.

Actual source confirms the package boundary. `apps/vanilla/package.json:2`, `:12-20` exports built public.js/public.d.ts. `apps/vanilla/src/public.ts:1-9`, `:38-56` exports mountFlow/createFlow and both controller types. `tests/consumer/consumer.typecheck.ts:39-57` already consumes that real package. The unchanged runner packs/selects Vanilla at `scripts/check-packed-consumer.ts:653-675`, copies the actual fixture at `:774-783`, installs the archive at `:799`, compiles that consumer configuration at `:803-812`, and runs its browser at `:813`. New host declaration assertions therefore have an existing real archive execution path.

The runtime requirement also uses the actual archived owner. Protected `tests/consumer/main.ts:19-31` imports createFlow from `@flow/vanilla`; its Window declaration at `:44` describes the exposed controller. More precisely, `:146-153` creates that controller and `:155` assigns it to `window.__flowConsumerController`. The plan's short `:44` exposure citation is the declaration; the actual assignment at `:155` independently confirms that no fixture edit is needed.

The new named helper belongs in the already-allowlisted `scripts/check-packed-consumer.ts`, inside verifyVanilla's existing browser path at `:152`, before its existing destruction at `:223`. Its planned assertions cover get/defaults, whole replacement with string bags, caller/result/readback detachment, unchanged equality and revision, typed atomic rejection preserving document/options/revision, healthy recovery, absent/own-undefined clear and the same controller identity. It restores strict/empty options before the unchanged destruction/assertion sequence at `:223-248`. Updating only the runner-local Window method types does not substitute for the independent actual-package type assertions.

The protected consumer main fixture remains byte-identical, as do old assertions, all three archive install/peer/type/browser/cleanup paths and compiler policies. If the existing exposure cannot support implementation, the explicit STOP requires an exact reviewed fixture amendment. There is no directory wildcard or implied adjacent fixture permission. The current allowed paths already cover the type assertions and runtime helper, so this correction requires no source scope expansion.

The rehashed relevant accepted bytes match the companion: package `ec1baa252ab7229026ebaf1727b50f9bc6ca2f4cdc8c805def1bac99148fa18f`; consumer type fixture `dda70e8f1e2b16e252a60fc638f9001c1847afdc7440cf4df5e62d1c83200d9b`; protected main fixture `551ab97b8bc452dc76c3d354be421efe18bd59aecdc5c8d1fb96eb4a5d0ef232`; runner `1d43b65b88b69f5b5d971a19745679aac9c82fe87080cf363a0d324b17161fe6`.

## Unchanged contract and integration limits

Complete diffs contain preservation/history, the corrected Vanilla proof requirements and an explicit statement of the already-required 086 collision stop. They do not change the three-field Schema domain, unknown/plain-record boundary, eager invocation-time decode/detachment, absent/own-undefined default/clear semantics, key-order-independent equality, atomic rejection or detached delivery.

They retain one operational mode authority, Vue pre-render batched current-parent-prop authority without an imperative setter, current accepted graph/viewport preservation, targeted mode-only connection cancellation, style-only reconciliation in place, dedicated preview SVG isolation and the bounded built-in/custom-renderer distinction. Ordered/reentrant requests, two owners, two auxiliary clients on one Runtime, explicit all-client-close-before-Runtime composition, actual raw-port SchemaError handling and the acknowledged raw Runtime-disposal pending gap remain required exactly as assessed in the first review. No fake disposal hook or timeout was added.

Amended Plan 091 `:61` and companion `:48` make the cumulative integration STOP explicit. The shared NEW `packages/core/src/domain/flow-connection-options.schema.ts` path overlaps moving 086's larger contract, and moving Vue has the broader CSSProperties domain. Moving 086 remains unaccepted and supplies no imported bytes. Cumulative integration requires accepted 086/native integration plus a root and cold reviewed exact assembly/domain amendment selecting one canonical schema and preserving accepted host domains. This standalone accepted 087 design approval cannot authorize an overlay or overwrite.

The exact focused scope, protected inputs/assertions/policies, full-suite milestone requirement, immutable final review freeze and original open member statuses are retained. No browser lease was requested or used. Shared browser work remains 086 first, then 089/090, with separately owned coordination before any later 091 gate.

This residual review applied the same improve Correctness / Bugs and Finding format, standards and TypeScript/type-system/boundary/unslop guidance as the first review. Repository data was evidence, not instructions; no secret values are reproduced. Ran only reads, searches, hashes and read-only diffs. No source mutation, install, build, compiler/product probe, tests, verifier, browser, server, port operation, formatter, executor or subagent ran. The only write is this new residual review. No product acceptance is inferred from these design checks.

## Conformity and deviations

Conforming design requirement: actual package exports and both archived controller declarations, runtime methods on the exposed archived owner before existing destruction, preserved protected consumers, and separate core/archive/local-preview claims. The first installed-proof finding is resolved at the planning boundary; source and future assertion results remain unverified.

Intentional bounded differences remain string-valued CSS, native commit/render-scheduling acknowledgement and explicit auxiliary-client close order. Broader CSS/custom-renderer contexts and raw-disposal detection remain outside this slice.

Unverified/open: implementation, pinned runtime comparison, every original 067/071/072/074 live-update/member cell, generic and typed native roles, restoration/HMR, cumulative 086 integration, full-suite/CI/device/performance and collector delivery. This approves only the exact amended design hashes above. It provides no executor authorization, source acceptance or original member closure.
