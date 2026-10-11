# 096 edge description correction independent design review

Verdict: APPROVE the exact two-expression correction in proposal SHA256 `c99793daa25e80f8a310e54866d8025e6882850724e3fe2749a24fbd58ad9254`. Reviewed independently on 2026-10-02 at main HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. No design revision is required for this bounded correction. This verdict is pre-freeze DESIGN approval only. The coordinator retains primary approval and executor release; this review releases neither.

## Review inputs and integrity

I fully read the correction proposal, the complete 352-line revised096 design, the paused native proof route, improve/SKILL.md, the correctness/test-coverage/finding-format playbook sections and closing-the-loop.md. I inspected the actual affected candidate code and pinned reference code directly. Repository content was treated as evidence. No credential value was reproduced.

Path identities used below:

- C = `/Users/richardmcandrews/.codex/worktrees/096-native-appearance-accessibility/flow`, the stopped candidate.
- A = `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, accepted087 source.
- E = `/Users/richardmcandrews/.codex/worktrees/096-native-appearance-accessibility/096-evidence`.
- M = `/Volumes/Sync/codex/9-19-26/flow`, main planning checkout.
- P = M's `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921`, immutable imported reference.

I independently calculated these complete file hashes. Every supplied expected hash matched.

| Input | SHA256 |
| --- | --- |
| M `plans/appearance-edge-description-source-correction-proposal.md` | `c99793daa25e80f8a310e54866d8025e6882850724e3fe2749a24fbd58ad9254` |
| M `plans/appearance-accessibility-resumption-design-revision.md` | `fbf3c3ab36ae84fd2d13b82dc92f672aa090a70a0c6878212d8d5c0efc1ea47b` |
| M `plans/appearance-paused-native-proof-route.md` | `288fbf653b834617d032b9fa1e29847579db14217458dba093eab8b1cc91ec3a` |
| M `plans/appearance-accessibility-primary-stage3-stop-integrity.json` | `bc76d59062f1d4c69281ca213c953265c7fe4dc5fa63d993b0b4720499b701b4` |
| E `resume-1/stopped-freeze.json` | `a27d98228621783b76520aae94516d6ad0fd3b80d1fd7505a2cd2cf734bf1909` |
| E `resume-1/candidate-source-manifest.json` | `3515de72280e3680362bf439d69d0dd1ff5e99794e6369f7def7ac3d85726bc1` |
| E `resume-1/evidence-manifest.json` | `13666d5092c6b81583d870c3b2f44df7dab145b55bf96fb045e84dc19bb462d7` |
| E `resume-1/stage3-typecheck-1.log` | `ddb8ba5323029d16534038fae8ed9111a8f8f97cdd1229f6e3ce0af0d40e9d53` |
| M `plans/appearance-accessibility-resumption-hunk-inventory.json` | `e22d5f4233a44f3f395b6c2b8d122715c64d0207d0684ba9adb7fa4eed933e35` |

The source/evidence manifests contain 1498/3302 entries. The primary receipt records its complete rehash with zero mismatches. I did not repeat that entire rehash. Independently, all 13 inspected source inputs listed below matched both their source-manifest hashes and the complete copied `E/resume-1/source-snapshot` bytes. The three initially cited pin files also matched M's imported bytes.

| Candidate source input | SHA256 |
| --- | --- |
| `packages/core/src/domain/flow.schema.ts` | `b765bb46f60e0470f710907ab61ee9b5403dfff556b658d6bb2fa6e4537a547d` |
| `apps/vanilla/src/edge-renderer.ts` | `af27687df6b6a851317cf5f275fbfa5408b9b9f80aeeb1a98adba2724f1cab63` |
| `packages/vue/src/flow-canvas.ts` | `6c61021806f07a562f111e6dfdf2764dd7223d8f2d5fbb8cb423293aabf39308` |
| `packages/foldkit/src/graph.ts` | `2b57a86e76f42ea5eddb3c888f3d7676ec8133a572be80892c8dd1cbe4c90ea9` |
| `packages/core/src/domain/flow-accessibility.schema.ts` | `20d0badb9ebb0df8a6239fa6f4d16ca7579a2b1c3860b7183dd045d163b1b20e` |
| `packages/core/src/domain/flow-appearance.schema.ts` | `b25aeeaa2df32feb53c908479a0870979f6f071978c8e6721cc9b6c2bbd00853` |
| `apps/vanilla/src/mount-flow.ts` | `7b23ad5e58e476973ff1d1b36461755a2188eb51eee65130bbd0938b3fe9584b` |
| `apps/vanilla/src/appearance.ts` | `567bd4323a3adab52d29fa342c661d3ad191ab3450cd25bbcc3dc1138dacfd52` |
| Pin `packages/react/src/components/EdgeWrapper/index.tsx` | `93aa5feb60f1b3d7363abad1f2fd4b196f0591442b6dc8f089a41a9d7f0e7dda` |
| Pin `packages/react/src/components/A11yDescriptions/index.tsx` | `dd1f312d822649e8a619d0cf2fb11dc6f5ca14be84ead059b9aa04754316f62a` |
| Pin `packages/system/src/types/edges.ts` | `8e69102383bb49310946dc0277516a33b66eb22ef94d2691ad0f67a69e817acb` |
| Pin `packages/react/src/types/edges.ts` | `7c7e8f335a4bacaeffa5912cc4974c3cfd71d9ecb10f087dbaefde5dd5b9ea38` |
| Pin `packages/system/src/constants.ts` | `9cbd02240221527c39280e43c6bbfcb568e7a2db5f7bc5fcd7c95b49fb7e7644` |

A's actual `flow.schema.ts` has the same hash as C's. Main's schema and renderers differ from C; this review does not substitute main source for the accepted baseline or stopped candidate.

## Independently confirmed finding

### [CORRECTNESS-01] Remove the unsupported per-edge description read

- Evidence: C `apps/vanilla/src/edge-renderer.ts:500-504` reads `edge.ariaDescription`; C `packages/vue/src/flow-canvas.ts:4764-4786` types its argument as FlowEdge and reads the same absent property. C `packages/core/src/domain/flow.schema.ts:115-141` defines that schema-derived edge type with ariaRole and ariaLabel, without ariaDescription. Node's separate field is at `:84`. The preserved actual compiler log E `resume-1/stage3-typecheck-1.log:17-20` reports TS2339 at Vanilla `503` and terminates package typechecking.
- Impact: The actual stage3 package build fails. Vue has the same source mismatch, but the logged run stopped before testing that package. Earlier stage2 successes do not cover this source.
- Effort: S for the two expression replacements. Existing096 proof assembly and verification retain their original larger scope.
- Risk: LOW for the selected correction. It removes an unsupported lookup while leaving the same global string, element, attributes and behavior owners. Computed accessible output still requires native proof.
- Confidence: HIGH for the source/type mismatch and the proposed description authority. No runtime success is inferred.
- Fix sketch: Replace the Vanilla value with `config.ariaLabelConfig['edge.a11yDescription.default']` and the Vue value with `appearance.value.ariaLabelConfig['edge.a11yDescription.default']`. Preserve Foldkit and node behavior exactly.

P `packages/system/src/types/edges.ts:3-43` has no per-edge ariaDescription. The React Edge extension at P `packages/react/src/types/edges.ts:54-80` adds ariaRole and domAttributes, without that field. The pinned built-in wrapper uses the global description ID for focusable edges at P `packages/react/src/components/EdgeWrapper/index.tsx:207-214`. Its shared text comes from only the global edge label key at P `packages/react/src/components/A11yDescriptions/index.tsx:37-48`. The later domAttributes spread at EdgeWrapper `:216` is a separate upstream escape hatch; this review makes no broad claim about arbitrary custom DOM attributes.

The approved field list is M `plans/appearance-accessibility-resumption-design-revision.md:17` and `:92`. Its explicit precedence statement at `:108` assigns descriptions specifically to nodes. C `packages/core/src/domain/flow-accessibility.schema.ts:3-17` accepts the global edge string through S.String, including empty strings, and C `packages/core/src/domain/flow-appearance.schema.ts:15-39` selects that label configuration. No schema or persistence widening is needed. Foldkit already reads only the global string at C `packages/foldkit/src/graph.ts:2972-2976`.

## Production and test paths

The Vanilla public entry is C `apps/vanilla/src/mount-flow.ts:9220-9253`. It decodes mount configuration and creates the native host. That host owns appearance at `:1584-1590` and passes the current appearance reader to the edge renderer at `:1702-1707`. A public appearance update's commit callback reconciles the existing graph geometry at `:8026-8036`; the renderer captures configuration at C `apps/vanilla/src/edge-renderer.ts:173-190`, preserves its existing path and measurement calculations, then assigns role/focusability/description/name at `:489-509`. The proposed correction changes only that description value.

Vue's public FlowCanvas entry is C `packages/vue/src/flow-canvas.ts:488`. Its setup at `:760-797` decodes the complete reactive appearance replacement into one last-valid projection. Geometry remains calculated at `:4737-4761`, then the existing edge rendering path calls the hit target at `:4888-4899`. The hit target consumes the projection at `:4779-4786`. The correction changes only the description value. Node-specific descriptions remain independently supported at C `apps/vanilla/src/mount-flow.ts:1330-1339` and C `packages/vue/src/flow-canvas.ts:4319-4329`.

Test entry points are separate. The immutable hunk inventory contains 21 original test bodies, seven per host. I read each host's full original relabel body and confirmed its `toHaveAccessibleDescription('First edge help')` assertion plus the explicit node-description assertion. The already approved Vanilla locator adaptation and preservation of all bodies are at M `plans/appearance-accessibility-resumption-design-revision.md:50`, `:116` and `:329`. The correction proposal at `:24` retains actual computed-description assertions and adds canonical/custom/empty/replacement/invalid-recovery obligations through public native compositions with no accepted graph events. Existing empty-label tests only assert handle output, so they cannot substitute for the required empty edge-description proof.

The paused proof route M `plans/appearance-paused-native-proof-route.md:3-11` remains separate from this correction. It retains actual public runtime controls, captured responses or honest absence, live/historical DOM, explicit owner close and crash evidence. Nothing in the two expression changes affects those contracts or permits acknowledgment to stand in for committed output.

## Approved scope and remaining gates

Approval is limited to proposal `:19-22`: exactly two replacements in the stopped candidate. Keep node descriptions, Foldkit's expression, role/focusability/name policies, handlers, attribute topology, graph/viewport authority and defaults unchanged. Do not add edge fields, casts, alternate interfaces, property guards, suppressions or truthiness fallbacks. Preserve the complete STOP and before/after source bodies. Revalidate the entire stopped source/evidence inventory before resuming the same executor.

The existing LOCAL work resumes under proposal `:28-30`. It still requires actual full package typecheck, scoped meaningful units, quality and architecture, plus completion of the original proof-source assembly. A further substantive source/API mismatch must STOP for a separately reviewed decision. Shared pinned compilation/capture, browser/server, installed archives, focused/full verifier and release gates remain pending coordinator lease. This correction neither resets original068 revisions nor consumes a formal final SOURCE acceptance round.

No child agent, source edit, formatter, install, build, compiler, server, browser or test ran in this review. Only this review file was written. I did not audit unrelated parity work or independently rerun all 1498 source and 3302 evidence files. No LOCAL_READY, SOURCE, native runtime, archive, focused/full, CI, device, assistive-technology or collector acceptance follows. All 189 cells remain OPEN.

## Conformity and deviations

Conforming at the inspected source-contract boundary: the proposed edge description uses the same global key as the pinned built-in edge path and stays within accepted FlowEdge and the approved096 field list. This is source evidence, with no computed-output parity claim.

Intentionally different, unchanged native policy: Flow currently places aria-description directly on its existing edge group or hit target, while the pinned built-in React edge uses a shared aria-describedby target when focusable. The correction preserves the separately reviewed native attribute policy and native lifecycle architecture. Its test boundary remains actual mounted computed accessible description across all three hosts, including empty/replacement/invalid recovery and independent accepted graph state.

Unverified: successful correction compilation, all original and additive native proofs, real Model processing versus paused/crashed/disposed rendered output, installed consumers, focused/full integration, external CI/device/assistive-technology/collector evidence and all 189 member cells. Final SOURCE review remains required after the complete candidate and evidence freeze.
