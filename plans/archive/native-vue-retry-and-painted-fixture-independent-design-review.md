# Independent Vue retry and painted fixture design review

2026-10-02. READ_ONLY review of two complete PLANS-ONLY proposals. This is not a final SOURCE review, consumes zero final SOURCE revisions, and authorizes no edit, execution, commit, merge, or release.

## Verdicts

| Proposal | Verdict | Decision |
| --- | --- | --- |
| Immediate keyboard baseline | REVISE | The synchronous physical sample is the right correction for the observed stale start. Tighten the initial-owner abort instructions and the accepted-before-DOM proof boundary before authorizing it. |
| Painted custom preview fixture | APPROVE, design only | Correct the supplied test renderer within the stated allowlist, retain every original input and assertion, and require the proposed numeric SVG and actual painted-output proof. This approval does not establish successful execution. |

The keyboard revision does not request a new measurement protocol, cache restoration, declared-size fallback, pointer change, or lifecycle redesign. It addresses two claims in the plan that presently exceed their supporting evidence.

## Inputs and freeze

Candidate C is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Evidence E is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`. Source references below resolve inside C. Proposal references resolve inside `/Volumes/Sync/codex/9-19-26/flow/plans`.

Read both proposals completely before judgment, main and candidate `AGENTS.md`, `docs/standards.md`, and `.agents/skills/improve/SKILL.md` plus `references/closing-the-loop.md`. The architecture permits reusable Vue lifecycle in `packages/vue`; the test host owns its custom fixture. The closing-loop distinction between plans and actual verified source acceptance applies throughout.

| File | SHA-256 verified by this reviewer |
| --- | --- |
| `plans/archive/native-vue-immediate-keyboard-baseline-proposal.md` | `30ad7424c613592dc1a53bda906bfc0be07ce3040364897c017f9f5c429faa96` |
| `plans/archive/native-vue-custom-preview-painted-fixture-proposal.md` | `141a7dac65d8fbc598a90ad480bfeab87abe13f150b03461d4a00c0542cf32ec` |
| C `packages/vue/src/flow-canvas.ts` | `95fb43a5e3dc046fb1249229fe8041d005b726c34ebd7a422b2d118db6a9998b` |
| C `apps/vue/e2e/interaction-lifecycle.e2e.ts` | `6809c8dde0f0ab21b5d7106cb9ea6e03a004d03fe58908817947a0e04781d39b` |
| C `apps/vue/src/test-harness.ts` | `b9455440779ace6d87cfa2f27b5aaedfef7bff0b34e9c096fb54caacc0ad2a7a` |
| E `resume-vue-keyboard-native-first.log` | `f26e6bb1a7ca1525e7ea7e821e3e28b19fcfe11831b4d18d344852463e18cb3a` |
| E `resume-vue-immediate-settlement-diagnostic/second-result.json` | `3db73cf8315d47dca137c03b3d84b3a20836b4fa96890bacc9ece9be9d8c871d` |
| E `resume-vue-immediate-settlement-diagnostic/custom-result.json` | `b3a33ccae91b5a7ebc70c2ab9a53ebec1bb1a987116f53cf18dfa7ec944505ad` |

The three candidate source hashes were rechecked before writing this review and still matched. Any later drift invalidates this review until reconciled. Only this review file was written.

## Keyboard production path and diagnosis

Production starts at the rendered resize button's `onKeydown`, `packages/vue/src/flow-canvas.ts:5033`. It rejects modifiers and missing selection, resolves a delta at `:5043`, and retains the captured session for repeats at `:5055–5092`. Initial activation reads the owned element and cached graph dimensions at `:5099–5109`; the helper uses that baseline at `:5111–5114`, session capture occurs at `:5117–5132`, and `paintResize` writes physical width and height at `:2544–2549`. The helper's position, origin, parent bounds, minimum, rejection, and child compensation remain at `:4136–4186`.

Escape reaches `cleanupPreview` through the global capture handler at `:4531–4535`; window blur uses `cancelActiveSession` at `:4565–4567`; matching keyup cleans up then publishes at `:4605–4618`. Cleanup writes the captured physical size at `:2595–2596` and clears the session at `:2603–2605`. It does not synchronously restore the measurement record. The graph consumes measurement state at `:1245–1251`. The native ResizeObserver samples the current map owner, current bounds, current generation, and current viewport at `:1439–1477`.

The preserved native log reports 16 expected, two unexpected, no skipped or flaky cases. The original grouped assertion at `apps/vue/e2e/interaction-lifecycle.e2e.ts:2800` receives width 120 instead of 110. Its Escape and retry inputs remain at `:2979–2991`. The old second keyboard regression starts at `:3036`; neither original body should receive readiness waits or revised expectations.

The external diagnostic uses exported FlowCanvas/useFlow and actual public subscription at E `resume-vue-immediate-settlement-diagnostic/main.js:20–28`. It records trusted target receipts at `:30–33`, actual external RO/MO observations at `:34–37`, and terminal-to-fresh native input at `run.mjs:12–14`. I parsed the nested `plain` JSON and read known scalar dimensions only. Tuple order below is accepted width, internal width, physical width.

| Case | Fresh key pre-handler | Actual post-input immediate read | Final settled read |
| --- | --- | --- | --- |
| Uncontrolled Escape | 100, 100, 100 | 100, 105, 105 | 105, 105, 105 |
| Uncontrolled blur | 100, 110, 100 | 100, 110, 115 | 115, 115, 115 |
| Uncontrolled accepted keyup | 110, 110, 110 | 110, 110, 115 | 115, 115, 115 |
| Controlled callbackless Escape | 100, 110, 100 | 100, 110, 115 | 100, 100, 100 |
| Controlled callbackless blur | 100, 100, 100 | 100, 100, 105 | 100, 100, 100 |
| Controlled callbackless keyup | 100, 110, 100 | 100, 110, 115 | 100, 100, 100 |
| Controlled refused Escape | 100, 110, 100 | 100, 115, 115 | 100, 100, 100 |
| Controlled refused blur | 100, 110, 100 | 100, 110, 115 | 100, 100, 100 |
| Controlled refused keyup | 100, 110, 100 | 100, 110, 115 | 100, 100, 100 |

All nine rows have three trusted ArrowRight capture receipts, actual first/repeated physical and internal widths 105/110, six retry and six settled frames, and errors[]. The two cancellation rows already settled by RO are controls; accepted uncontrolled keyup is also correct. Six rows independently demonstrate the stale initial baseline. Refused callbacks record real proposals without adoption. None of this is a measurement ACK or pinned keyboard parity claim.

Calling the existing `measureNodeHandles` before the initial graph read genuinely addresses that physical100/internal110 discrepancy. It samples real bounds and handles, preserves the generation, decodes through `applyNodeMeasurements`, and invalidates the computed graph synchronously only when the sample changes, `packages/vue/src/flow-canvas.ts:1387–1420`. Core rejects missing nodes and stale generations at `packages/core/src/domain/flow-measurement.schema.ts:147–160`; current handle filtering is at `:268–284`. Sampling once at initial activation retains the approved cumulative repeat rule. Sampling every repeat would defeat that rule.

## Required keyboard plan revisions

1. Make the initial-owner requirement executable. Proposal `native-vue-immediate-keyboard-baseline-proposal.md:48–50` says to prove the current control/owner but then retain the existing guards, and says a disposed/current-owner failure aborts through the existing producer. The producer returns `void` on guard failure at `flow-canvas.ts:1390–1395`; it does not erase cached graph dimensions or signal failure. The existing initial guard at `:5103–5108` tests only element presence, dimensions presence, and HTMLElement type. It does not test disposal, connection, control-to-element ownership, or current declared-node membership. A no-op measurement therefore does not itself imply no session. Ordinary synchronous map invariants make several guard failures unlikely; that is not the same as the claimed abort proof. Specify those invariants and test their rejection boundary, or require explicit preflight using existing disposal/map/control ownership inside this same initial branch. Do not change the producer return contract or generation protocol. A current graph dimension may not be treated as evidence that the new sample succeeded. Clearly distinguish trusted input redirected after removal from a separately labeled retained-detached-handler negative control.

2. Tighten the public acceptance and DOM timing evidence. Public accepted state is published by a synchronous watcher at `flow-canvas.ts:1136–1173`, independently of render completion. Node declaration changes also synchronously sample the still-current DOM at `:1481–1502`, with a post-render resample at `:1504–1525`. Keyup restores captured dimensions before publishing at `:4614–4615`. Thus accepted dimensions and committed physical dimensions have distinct boundaries in this source. The actual native diagnostic proves the settled uncontrolled accepted110/physical110 fresh-key case. It does not prove behavior when a public accepted change is still ahead of DOM commit. The external acknowledge method itself awaits `nextTick`, E `main.js:38`; the test-host `acceptDocument` sets parent reactive state, C `apps/vue/src/test-harness.ts:1099–1101`. Define the proposed real controlled ACK test in terms of public accepted receipts, pre-handler physical bounds and viewport transform, and exact callback counts. Record whether a stale physical owner/size actually persists into a trusted activation. Do not label a test that reaches committed DOM as precommit proof. If an actual trusted accepted-before-DOM case produces the wrong baseline, return REVISE and preserve it before any source edit; do not add a wait or improvise an authority policy. No such wrong native precommit result has been proved by the supplied nine rows, and this review does not invent one.

The diagnostic's observation name `keydown-after-handler-before-queued-commit` is also insufficient as a phase guarantee. `main.js:32` schedules it from the external ancestor capture listener. In the supplied raw rows the final named-after ArrowRight physical snapshot is still the pre-target physical value, while `rows[].immediate.plain` records the actual fresh preview. Preserve the raw evidence, correct the phase claim, and use the awaited post-input immediate read for the observed result. Do not infer a Vue commit boundary from that string label.

## Keyboard allowlist and acceptance tests

After the plan revisions and a fresh primary/cold decision, keep production changes within the new-key branch of `packages/vue/src/flow-canvas.ts:5095–5144`. Keep additions in the existing Vue native test file. Preserve the captured-baseline helper, both callers, ten approved trusted cases, original synthetic repeat helpers and two regression bodies, unchanged expectations, all 093 controls, and failed artifacts. Do not add dependencies, schemas, APIs, casts, cache overwrites, lifecycle edits, pointer edits, or alternate viewport conversion.

Required native proof remains the proposal's terminal/retry matrix, including callbackless and refused controlled rows, actual accepted uncontrolled keyup, conditional stale-cache receipts, ignored late keyup, healthy retry and exact proposal/accepted counts. No poll/frame/readiness may intervene between terminal and fresh input. Preserve the old deterministic grouped regression as a mandatory independent check.

Retain the additional controls for measured-only nodes, fractional physical bounds, committed zoom 0.5/2, existing real controlled acceptance, parent/child compensation and current handle declarations. Zoom readiness establishes only a committed-transform case. Include removed/disposed owner rejection and new-owner retry without stale proposals, with exact ownership receipts. The current ref generation/owner transitions are at `flow-canvas.ts:1542–1578`; disposal starts at `:5731–5732`, removes global handlers and disconnects RO at `:5754–5762`. Missing declaration, stale rendered control, and disposed producer must not silently fall through to a cached baseline. Existing unchanged-axis and bounds-policy cases retain their original proposal counts.

No actual pointer retry defect is established here. The first-pointer baseline remains outside this packet. A failure requiring that change or a new authority/generation/late-ACK protocol is a STOP, not permission to widen the edit.

## Custom fixture production and test paths

Production resolves the actual connection session and public preview at `packages/vue/src/flow-canvas.ts:5859–5866`, freezes delivery at `:5873–5882`, and creates the SVG/custom component at `:5885–5917`. The default production path and the supplied component are separate rendering branches. The app installs ConnectionPreviewProbe only when enabled at `apps/vue/src/test-harness.ts:731–735`; the probe records the received public preview and supplies its own `path` at `:585–603`.

The probe's `:600` path is an unstyled collinear segment. It has no stroke. Both independent custom-result rows have a valid public candidate and `d = M 169.5 42 L 260.5 42`, physical width 91, physical height 0, stroke `none`, default black fill, visibility visible, display inline, and opacity 1. The uncontrolled terminal records one change and one accepted state; controlled records one change and zero accepted states. Both remove the preview and dispose with zero mounted elements, late changes, and late accepted states.

The failed native assertion is the exact original `toBeVisible` at `apps/shared-e2e/interaction-lifecycle-contract.ts:258`. Later controlled and cancel visibility assertions are at `:975` and `:1010`. The actual candidate checks at `:922–931`, terminal removal/accepted edge at `:933–944`, controlled refusal at `:975–981`, and cancel cleanup at `:1010–1016` remain essential. Preserve the approved attached/current-invalid promotion at `:890–902`.

I visually inspected E `resume-vue-immediate-settlement-diagnostic/custom-uncontrolled.png`, SHA `3b7bc4550d1ba82712f963ef54a283e16b2cd7dc715309485a0521ca798cbaa4`. It shows nodes and handles with no connection line. This agrees with the real path/style/rect observations. I did not independently inspect the controlled PNG. `custom-probe.mjs:11` reads `playwrightVisible` after teardown; it is not active visibility proof. Its native bbox serialized as an empty object at `:10`; it is not a numeric bbox.

## Approved custom fixture scope and proof

The proposed quadratic path with the real endpoints, arithmetic midpoint control X, midpoint Y plus 12, blue two-unit stroke, and fill none is a justified test-renderer choice. For the current horizontal endpoints the curve reaches six graph units below the endpoints; the control offset is 12, not a promised 12-unit bbox height. It produces geometric area and painted stroke while preserving connection endpoints. The component owns this geometry and style. The correction does not alter the product's candidate, threshold, radius, routing, or control ownership.

Allow only ConnectionPreviewProbe path/style fields in `apps/vue/src/test-harness.ts:585–603` and additive assertions in the existing custom-preview test. Keep test ID, preview-kind receipt, complete public state histories, exact mouse movements, endpoints, original visibility assertions, acceptance, refusal and cancellation checks. No package renderer/style changes or extra gesture inputs.

Require explicit numeric `getBBox` x/y/width/height, physical rect, positive path length, computed stroke/fill/stroke width, and start/end points equal to the current public from/to under existing precision. Use normalized browser color and units in assertions, rather than comparing computed RGB or px output to authoring syntax. Capture these while the active preview exists at invalid promotion and valid target, in both ownership modes and cancellation. Keep each original `toBeVisible` assertion and save/visually inspect actual PNGs. A nonzero bbox alone proves no paint; path receipt alone proves no paint; the required assertions and actual screenshots close those separate gaps. Preserve exact single proposal/accepted edge, controlled unchanged accepted graph, owner identity, and terminal removal. If a painted fixture still fails any original assertion, STOP and return the new result. This narrow repair must not absorb a product failure.

## Verification and limits

No browser, server, compiler, install, build, archive, verification run, source mutation, Git operation, subagent, or external message was performed in this review. Reading preserved logs is not rerunning acceptance. The 16/2 run remains failed. The corrected keyboard and custom fixture remain unexecuted.

Execution must record focused profile and exact Vue/retained host scope, with `bun run verify` and all specified meaningful tests after the design gates release. The config remains focused, documented at C `docs/tooling.md:25–56`. Full integration acceptance requires `bun run verify:full` plus retained 086/093 reference, archive, same-build, HMR, genuine legacy, release, freeze, primary reproduction and cold SOURCE gates. This document neither consumes those gates nor replaces them. No parent/member/device/collector or upstream keyboard acceptance is established.

## Conformity and deviations

- Conforming target: a fresh owned native keyboard gesture captures one truthful physical baseline and repeats use the captured session. The proposed call to the existing producer matches that design for the six observed stale-start rows. Corrected execution, failure-to-sample rejection and trusted accepted-before-DOM behavior remain unverified pending the revised plan and native evidence.
- Intentionally different: grouped keyboard resize and its acceptance policy are Flow features. No actual pinned keyboard proof exists. Public internal physical measurement remains transient geometry distinct from accepted-document state; this review does not call that policy a defect.
- Intentionally different: the test-supplied custom preview uses a deliberate quadratic bend and explicit paint to exercise the original visibility boundary. It is a fixture visual choice, with real public endpoints retained, not upstream path parity.
- Unverified: final SOURCE, integration/full-suite, pointer baseline/preview, late-ACK authority, member-level parity, native device and collector delivery. Source similarity and preserved diagnostics do not close those boundaries.
