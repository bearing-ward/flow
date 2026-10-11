# Typed actor activation interruption primary repair authorization

2026-10-02. Root authorizes sole089 to repair the observed failure within the original approved actor contract and literal source/test scope. No new API, failure payload or semantic policy is added. Source acceptance remains pending.

Root read actual activation-self-interruption-first-failure.log and the complete public-operation regression in packages/core/src/domain/flow-typed-actor.test.ts. A genuine accepted callback1 waits on Deferred and then interrupts itself while its actor owner remains live. Core had accepted revisions2/3; actual faulty worker continues activations2/3/4, invokes a subsequent updater and accepts revision4 instead of retaining sticky failure at accepted revision1. The selected test fails its exact outcome assertion;70 other tests are deliberately unselected, not waived in the final gate.

Root read current activationWorker, terminalGateFailure and close in full. activationWorker excludes interruption-only failure from terminalGateFailure. The original Plan089 requires every failed accepted activation to stop subsequent admission and retain exact FlowProjectionFailure revision1. Public operation interruption remains interruption; this actor-owned callback is a separate postacceptance failure boundary. Existing terminalGateFailure already returns when closed; close sets closed before interrupting activationScope, so normal owner teardown retains its original path.

Authorize only removing the interruption-only exclusion from activationWorker's Exit.isFailure branch. Every activation failure calls the existing terminal transition; that transition preserves the owner-close guard, serialized sticky metadata and exactly-once release. Retain the regression and all existing true caller-interruption, owner-close, queued and late-return tests. No weakening, replacement payload, new wrapper or changed public failure semantics. Preserve original failed receipt, add exact repair diff/results to owned records, run actual typecheck and the complete owned unit files with no selected-out tests before broader gates. Original copied planning inputs remain immutable pending any separately approved display-format equivalence.

This is focused implementation feedback within original source scope, not approval of the complete candidate. Final source freeze, primary rerun, independent SOURCE review and actual installed/focused gates remain mandatory. Sole shared lease still belongs to089. No commits, merge or publication.

## Conformity and deviations

Conforming is sticky failure for an accepted actor-owned callback that fails while the owner remains live, with subsequent queued activation barred and already accepted core state preserved. Owner-close and public caller interruption remain their original scope semantics. Abstract actor proof does not establish native rendering, restoration, durability or original generic-member parity.
