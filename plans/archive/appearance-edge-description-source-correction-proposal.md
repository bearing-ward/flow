# 096 edge description source correction

Bounded design proposal for fresh independent review, 2026-10-02. No repair is released until primary and cold approval. Baseline `841be137e253cf19c665269eaaa79edc19abf3c3`; same isolated `codex/096-native-appearance-accessibility` checkout. Preserve every original068/096 design, failed source and diagnostic.

## Actual stopped input

Checkout `/Users/richardmcandrews/.codex/worktrees/096-native-appearance-accessibility/flow`; evidence `/Users/richardmcandrews/.codex/worktrees/096-native-appearance-accessibility/096-evidence`. New STOP `resume-1/stopped-freeze.json` SHA `a27d98228621783b76520aae94516d6ad0fd3b80d1fd7505a2cd2cf734bf1909`; source manifest `3515de72280e3680362bf439d69d0dd1ff5e99794e6369f7def7ac3d85726bc1` (1498 files), evidence manifest `13666d5092c6b81583d870c3b2f44df7dab145b55bf96fb045e84dc19bb462d7` (3302 files). Root independently matched both current and complete copied1498source plus3302evidence with zero mismatches in `appearance-accessibility-primary-stage3-stop-integrity.json` SHA `bc76d59062f1d4c69281ca213c953265c7fe4dc5fa63d993b0b4720499b701b4`.

First actual stage3 typecheck failed during Vanilla package build, TS2339 at `apps/vanilla/src/edge-renderer.ts:503`. Raw `resume-1/stage3-typecheck-1.log` SHA `ddb8ba5323029d16534038fae8ed9111a8f8f97cdd1229f6e3ce0af0d40e9d53`. This is a production source/API mismatch, distinct from prior mechanical tests. Vue has the same unsupported read at `packages/vue/src/flow-canvas.ts:4781`, but that package was not reached by this compiler run. Previous stage2 checks do not establish stage3 success. All189cells remain OPEN.

## Source evidence and selected correction

Root read the actual accepted087 `packages/core/src/domain/flow.schema.ts:115-143`: FlowEdge has ariaLabel and ariaRole but no ariaDescription; FlowNode's separate schema has ariaDescription. Root read the two current candidate expressions and Foldkit's already-correct edge hit target at `packages/foldkit/src/graph.ts:2967-2976`.

Immutable pin paths below resolve under main `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. Actual `packages/react/src/components/EdgeWrapper/index.tsx:207-214` uses the global edge description ID for its focusable edge. `packages/react/src/components/A11yDescriptions/index.tsx:37-48` populates that description from only `ariaLabelConfig['edge.a11yDescription.default']`. Public `packages/system/src/types/edges.ts:37` has ariaLabel; its EdgeBase has no per-edge ariaDescription. The approved096 field list includes global ariaLabelConfig, not a new edge field. The source mismatch therefore does not require schema, persistence or API widening.

Propose ONLY these two production expression replacements:

1. Vanilla existing aria-description value: replace `edge.ariaDescription ?? config.ariaLabelConfig['edge.a11yDescription.default']` with `config.ariaLabelConfig['edge.a11yDescription.default']`.
2. Vue existing aria-description value: replace `edge.ariaDescription ?? appearance.value.ariaLabelConfig['edge.a11yDescription.default']` with `appearance.value.ariaLabelConfig['edge.a11yDescription.default']`.

Keep the actual element, role, focusability, labels, event handlers, all flags, graph/viewport authority, attribute topology and Foldkit expression unchanged. Node-specific ariaDescription behavior remains unchanged. No casts, property guards, alternate edge interface, new field/default, duplicated schema, suppressions or fallback that conceals a failure. Empty global description is a value; do not replace nullish lookup with truthiness fallback. Do not change the broader aria-describedby versus aria-description native policy here.

Preserve every original21 appearance browser body and its full computed description assertion. The already approved future mounted/native tests must prove canonical edge description, complete custom label replacement, explicit empty description and valid→invalid→valid last-valid output independently of accepted graph events, using actual public compositions. Do not manufacture a per-edge override test for an unsupported API or claim compiler success proves computed description.

## Resumption and gates

After cold and primary approval, send the exact full correction to the SAME096 executor. Revalidate the entire STOP, source snapshot and evidence before changing those two expressions; preserve exact before/after bodies and a two-expression-only diff. Continue the original approved LOCAL native assembly/proof-source work. Rerun actual full package typecheck, applicable scoped units, quality and architecture. A further substantive source/API mismatch stops for its own reviewed decision; it is not permission to widen this correction. Shared pin/compiler/browser/archive/focused/full/release execution remains withheld pending root lease. No additional child, main source edit, commit, merge, push, publication or member promotion.

This is a pre-freeze bounded design correction, not a reset of original068 revisions or consumption of a formal final SOURCE acceptance round. Keep the original full design `fbf3c3ab36ae84fd2d13b82dc92f672aa090a70a0c6878212d8d5c0efc1ea47b`, public paused route `288fbf653b834617d032b9fa1e29847579db14217458dba093eab8b1cc91ec3a`, combined cold and primary reviews, Model JSON narrowing and Vue constructor clarifications authoritative.

## Conformity and deviations

The selected global edge description authority conforms to the inspected pinned source and accepted Flow edge contract. The native attribute mechanism remains the existing separately reviewed policy. Compiler/native output/actual Model processing, paused/disposed behavior, installed consumers, source/full integration, AT/CI/device/collector and all189cells remain unverified.
