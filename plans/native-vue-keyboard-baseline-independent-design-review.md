# Independent review of Vue keyboard resize baseline

2026-10-02. Verdict: APPROVE the bounded design for primary-reviewer consideration. This is a source-readonly prefreeze design review, not implementation authorization, an executor release, final SOURCE review, runtime acceptance, or parity cell closure.

Main HEAD independently read as `841be137e253cf19c665269eaaa79edc19abf3c3`. Proposal fully read and independently hashed as `8780120cb333d7ff0ba62e3808317f9a77c2fbc8a058e8e0de28cb24193ec23b` at `plans/native-vue-keyboard-baseline-proposal.md`. Reviewed candidate is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`; evidence directory E is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`. Candidate path:line references below refer to that actual checkout. Upstream references refer to immutable imported artifacts in main.

I fully read Improve `SKILL.md`, `references/closing-the-loop.md`, and `references/audit-playbook.md`, including correctness, test coverage, and Finding format; `docs/standards.md`; and the TypeScript, type-system-discipline, technical-writing, and Unslop skills. I performed source and retained-evidence reads only. I started no child, browser, server, install, build, verification gate, or archive operation. Only this report was written.

## Finding and design judgment

### Correctness: calculate each repeat from the captured baseline

- Evidence: `packages/vue/src/flow-canvas.ts:327` and `:328` already require captured position and size in the private `KeyboardResizeSession`. Initial activation captures them at `:5127` and `:5128`.
- Evidence: `packages/vue/src/flow-canvas.ts:5076` accumulates the next delta; `:5081` passes it to `keyboardResize`, whose `:4141` rereads current measured dimensions and whose `:4170` uses those dimensions as the calculation's starting size.
- Evidence: `packages/vue/src/flow-canvas.ts:2547` paints the preview width; `:1449` and `:1461` measure that physical width; `:1469` and `:1476` update measurement state/revision; `:1245` rebuilds the graph from accepted document plus measurements. The next calculation can therefore add cumulative 10 to preview width 105, producing 115.
- Impact: two 5-unit keys oversize the physical preview and uncontrolled accepted result by 5. Controlled proposals contain the same wrong result even though accepted document ownership remains controlled.
- Effort: S for the helper and two callers, plus browser controls and full relevant verification.
- Risk: LOW for the production delta because the required baseline already exists and the pointer calculation already uses that shape. Proof risk is MED until cancellation, refusal, real controlled acknowledgement, and fresh input settle through the actual measurement/render path.
- Confidence: HIGH in the feedback cause, from actual source and trusted-input receipts. Runtime success of the proposed correction remains unverified.

The proposed `Pick<KeyboardResizeSession, 'position' | 'size'>` parameter expresses exactly the existing private baseline requirement. It avoids a duplicated scalar type, a cast, optional fields, a public contract, or another state owner. On initial activation, the already validated `initialSize` and `node.position` form the baseline. On repeat, the existing active session supplies it. There is no intervening asynchronous step between initial-size validation at `:5107` and the existing initial call at `:5117`.

Use `baseline.position` and `baseline.size` for `positionStart` and `sizeStart`. Remove the helper's target-dimension reread as the starting-size source. Its two current calls are `:5081` and `:5117`; both must supply a required baseline. The existing session already guarantees those fields. No migration, fallback, optional baseline, or special missing-baseline guard is justified.

The helper may continue to read current parent bounds at `:4149`, resolve node origin at `:4168`, reject bounds issues at `:4176`, and derive direct-child compensation at `:4185`. These are separate inputs/policies, not the target's measured starting size. Preserve minimum 40 by 24, payload shape, step captured on first key, cumulative delta, direction/key ownership, modifier handling, repeat-without-session rejection, and callback ordering. Do not turn this into a parent/child authority redesign.

## Actual production and test paths

The production entry is the rendered selected-node resize button at `packages/vue/src/flow-canvas.ts:5023`. Its `onKeydown` starts at `:5040`, derives a 5-unit or shifted 20-unit step at `:5050`, and branches on current session at `:5062`. Initial activation validates the element and measured size at `:5105`, calculates a change at `:5117`, installs the required baseline/session at `:5120`, and paints at `:5146`. Repeat accumulates delta at `:5076`, calculates at `:5081`, replaces only delta/change at `:5088`, and paints at `:5095`.

`paintResize` at `:2532` projects child/world positions and writes width/height. Native ResizeObserver at `:1422` measures physical elements into state, feeding the computed graph at `:1245`. Render also explicitly uses the keyboard session's projected result at `:4960` and `:4967`, consumed at `:4980`. That explains why keyboard preview persists through a reactive render while ordinary pointer preview remains a distinct question.

Matching window keyup at `:4612` calls `cleanupPreview` at `:4621`, then `publish(active.change)` at `:4622`. Cleanup restores captured size at `:2595` and removes the session at `:2603`. Publication emits the change at `:1629`; controlled/split ownership returns without adopting it at `:1631` through `:1663`; uncontrolled node-bounds acceptance updates owned document at `:1696`. Accepted snapshots derive from `activeDocument`, whose ownership switch is at `:1014`, rather than the transient measured graph. Window blur cancels at `:4572`. These owners and ordering must stay unchanged.

The existing regression tests at `apps/vue/e2e/interaction-lifecycle.e2e.ts:2796` and `:2885` run the real Vue adapter and production path, but generate their second key through the synthetic `KeyboardEvent` helper at `:55`. Their meaningful 110 expectations at `:2823` and `:2909` must remain unchanged. The synthetic repeat is a separate input boundary, not native-repeat evidence.

External diagnostic2 independently uses two `page.keyboard.down('ArrowRight')` calls at `E/resume-093-vue-retained-diagnostic-second.ts:25`. The event collector at `:8` records `isTrusted`; the reader at `:9` captures accepted state, internal node geometry, physical DOM bounds/styles, change/accepted counts, and events; `:10` takes six animation-frame samples. This is trusted repeated browser input. The retained event collector does not record `event.repeat`, so do not claim these receipts alone prove OS autorepeat flag behavior. Original synthetic-repeat tests retain their role for that branch.

Real controlled acknowledgement is available through the existing test host `apps/vue/src/test-harness.ts:1099`, which decodes into reactive `documentState`. Existing test `:2874` calls it. New proof must drive that actual path and observe resulting accepted state, physical bounds, and internal measurements; a constructed expected document or a proposal receipt alone does not prove acknowledgement rendering.

## Independently inspected retained evidence

I independently hashed `E/resume-093-vue-retained-diagnostic-second.json` as `c35a10a5cc15419360d10034dd2d7e93d5b0d044969a5c48d879d78e6acdab61`. It contains 14 rows and `errors: []`. Each row contains the plain result and an `ownUndefinedTagged` serialized string. I inspected plain phase samples and event receipts without dumping the tagged strings.

All six samples in each keyboard phase agree on the following widths. Accepted size is 100 by 80 during both first and second keys, and delivery counts stay zero until a terminal action.

| JSON row | Mode / terminal | First DOM/internal | Second DOM/internal | Terminal accepted/DOM/internal | Change / accepted deliveries at terminal | Fresh retry accepted/DOM/internal |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | controlled / Escape | 105 / 105 | 115 / 115 | 100 / 100 / 100 | 0 / 0 | 100 / 100 / 100, one later proposal |
| 9 | controlled / keyup | 105 / 105 | 115 / 115 | 100 / 100 / 100 | 1 / 0 | 100 / 100 / 100, second proposal |
| 12 | uncontrolled / Escape | 105 / 105 | 115 / 115 | 100 / 100 / 100 | 0 / 0 | 105 / 105 / 105, one acceptance |
| 13 | uncontrolled / keyup | 105 / 105 | 115 / 115 | 115 / 115 / 115 | 1 / 1 | 120 / 120 / 120, second acceptance |

First/second keyboard phases have one/two trusted ArrowRight keydown receipts respectively. These four rows support a real repeated-input product defect independently of the old synthetic helper. Controlled retries in this diagnostic remain proposals; the table does not imply that their widths were accepted. This diagnostic never invokes `acceptDocument`, so post-acknowledgement geometry is unverified here.

The first retained diagnostic JSON independently hashes to `f5c382ef32e2e0dea7832a04a6a517b1ccc1889852ea5dfbf0422d394b841b02`, with 11 rows and no errors. Its external script `E/resume-093-vue-retained-diagnostic.ts:23` explicitly dispatches a synthetic second key. Preserve both original evidence sets without rewriting or relabeling them.

The complete retained Vue log independently hashes to `326f92712436d975976be5c29a84269937f0eda72b04f14785dfd9e2f2610f1e`. Its parsed stats are 127 expected passes, 7 unexpected failures, zero skipped/flaky, and top-level errors empty. The two keyboard tests fail at the expected 110 versus observed 115 boundaries. I did not audit every one of the reported 272 raw attachments or hash the entire evidence archive. This report makes no new claim about the other five failures or their concurrently reviewed mechanical-input corrections.

## Required proof before source acceptance

Keep the two original keyboard regressions and their helper/expectations unchanged. Add separately titled controls in the existing Vue interaction test file after the primary reviewer freezes that test scope. Use actual trusted keyboard input in both document modes and inspect accepted document, emitted changes, accepted-state delivery counts, physical DOM, and public internal measurements at explicit condition/frame boundaries.

1. Start at measured/physical/accepted 100 by 80. First 5-unit key yields physical 105, cumulative second key yields physical 110, with exact proposed height/position and no accepted document or delivery changes during preview. Wait for and record ResizeObserver measurement at each preview; the test must allow the first preview to enter measurement state before the second key, or it could miss this bug.
2. Escape and window blur restore accepted/physical/internal 100, emit no completed resize proposal or accepted delivery, and do not commit on subsequent keyup. Fresh 5-unit retry starts from 100 and proposes/accepts 105 as appropriate. Preserve existing removal/cancellation coverage as well.
3. Uncontrolled keyup publishes one 110 node-bounds change and accepts it exactly once. Physical and internal dimensions settle to 110. Fresh input starts from 110 and accepts 115 once.
4. Controlled keyup publishes one 110 proposal, leaves accepted document at 100, and settles physical/internal dimensions to the accepted 100. Withhold acceptance across the existing frame/condition boundary to exercise refusal, then retry from that retained baseline. Use the real existing `acceptDocument` to accept 110, prove physical/internal/accepted 110 after rendering/measurement, and prove fresh 5-unit input then proposes 115 while retaining controlled ownership.
5. Exercise no-change and bounds rejection using existing policy. Assert accepted baseline and geometry remain correct. Preserve existing callback semantics rather than inventing a new callback-suppression policy: the current helper rejects only `boundsIssues` at `:4176`, and publication emits an existing change at `:1629`. If the desired no-change/refusal contract requires an extra production guard, STOP and return a separate design correction.

These controls are required evidence, not outcomes established by this review. Existing native selection, pointer resize, and 093 threshold controls must stay protected. The concurrently authorized mechanical input corrections do not authorize altering either keyboard regression or widening this production change.

The implementation review must inspect the exact diff and final frozen code, rerun both original regressions and complete Vue native files, and run `bun run verify --vue interaction-lifecycle.e2e.ts` with the relevant active scope from `docs/tooling.md:23`. Record profile, saved plus CLI scope, and actual results; the current focused default alone is insufficient. Type/quality/architecture checks are required. Subsequent original 086/093 native, archives, legacy/reference, HMR, focused/full, release, freeze, reproduction, and cold SOURCE obligations remain with the primary reviewer. Integration requires `bun run verify:full`; no focused pass can establish broad parity. No such gate was run in this design review.

## Scope and stop boundaries

Production scope is only the existing private Vue helper and its two callers. No new API/export, Schema, model metadata, measurement protocol, public setter, dependency, CSS, type cast, pointer behavior, core calculation, callback classification, telemetry classification, lifecycle policy, or timeout belongs in this correction. The existing telemetry boundaries remain intact; no collector delivery claim is made.

Two distinct actual gaps stay OPEN. Pointer diagnostic rows 6, 7, 10, and 11 show physical/internal width 100 during active 5/10-unit movement across the sampled frames; uncontrolled finish in row 11 correctly accepts/renders/measures 110. Keyboard rows show public internal measurements follow preview 105/115 while the accepted document remains 100. Fixing the repeated-key baseline does not quarantine those public internal measurements, repair pointer preview persistence, or settle general geometry authority.

Those open gaps do not require widening this helper correction. The keyboard calculation can stop consulting its target's changing measured width while ResizeObserver continues its existing job. Captured-baseline calculation already exists in Vue's pointer `resizeCandidate` at `packages/vue/src/flow-canvas.ts:4108`. The corrected keyboard renderer can continue projecting `active.change`; acceptance and cleanup remain separate.

STOP if proof needs measurement quarantine, additional state/authority, late-ack handling, a changed cleanup order, a new accepted-document API, CSS, a core calculation change, or a production cancellation/refusal guard. A late accepted-measurement or acknowledgement race is not disproved by the six-frame cancellation receipts. Report its exact reproduction and observed boundary, preserve failed evidence, and design it separately. Do not force a bounded helper patch to satisfy a broader contract.

## Conformity and deviations

- Conforming in baseline shape, runtime success unverified: Vue pointer calculation uses captured position/size plus total pointer delta at `packages/vue/src/flow-canvas.ts:4105`. Candidate Vanilla's private helper derives its baseline through `Pick` at `apps/vanilla/src/mount-flow.ts:4278`, uses it at `:4311`, captures it at `:7916`, and uses active-session cumulative delta at `:7859`. Candidate Foldkit captures position/size at `packages/foldkit/src/graph.ts:2767`, uses captured values at completion `:2805`, and exposes them to preview calculation at `:3749`. These are source exemplars only, not acceptance or cross-host parity evidence.
- Intentionally different keyboard feature: pinned upstream React `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/additional-components/NodeResizer/NodeResizeControl.tsx:71` installs XYResizer and renders a `div` at `:211`; that inspected control has no keyboard handler. Pinned system `packages/system/src/xyresizer/XYResizer.ts:141` installs D3 drag, captures `startValues` at `:165`, and calculates drag output from those values at `:238`. Flow adds focusable keyboard buttons and grouped keyboard completion for keyboard access. The captured-baseline arithmetic is consistent with that pointer calculation shape; it is not upstream keyboard parity. Native/synthetic Flow test boundaries are separately identified above.
- Intentionally different acceptance policy: inspected upstream React control publishes dimension changes during `onChange` at `NodeResizeControl.tsx:135` and `:160`, with terminal resizing=false at `:162`. Flow's grouped keyboard path retains accepted document until terminal publication/owner acknowledgement. This is existing Flow policy and must remain unchanged; current diagnostic receipts prove retained acceptance only for their actual tested sessions.
- Unverified: corrected trusted-key result, real controlled ACK plus fresh retry, late measurement/ACK races, pointer preview persistence, general measurement quarantine, complete resize/member/library parity, integration, final cold SOURCE acceptance, and OpenTelemetry collector delivery. The bounded design approval closes none of these evidence boundaries.
