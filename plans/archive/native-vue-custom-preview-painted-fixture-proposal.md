# Vue custom preview painted fixture proposal

2026-10-02. PLANS ONLY, fresh primary/cold decision required. Same086 C=/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow and E=sibling native-parity-acceptance-evidence. No product/test edit is authorized by this proposal. Keep original visibility assertions and earlier readiness approval288f0cc1 immutable.

## Actual independent diagnosis

Native18 logf26e6bb1a7ca1525e7ea7e821e3e28b19fcfe11831b4d18d344852463e18cb3a fails ORIGINAL target toBeVisible at interaction-lifecycle.e2e.ts916. Newly approved positive promotion attached/current invalidfalse passes. Preserve earlier5pass1fail log31af0e20 and both complete source/artifact sets.

Real unchanged public browser fixture is ConnectionPreviewProbe at apps/vue/src/test-harness.ts585–603, enabled by the existing public test method and mounted through FlowCanvas. It records complete received public ConnectionPreviewState and returns:

```ts
return h('path', {
  'data-testid': 'flow-custom-connection-preview',
  'data-preview-kind': props.preview.kind,
  d: `M ${props.preview.from.x} ${props.preview.from.y} L ${props.preview.to.x} ${props.preview.to.y}`,
})
```

The fixture supplies NO stroke; SVG default fill cannot paint an open collinear segment. This is fixture rendering, not candidate threshold/preview state semantics.

Authorized EXTERNAL custom-probe.mjs ran actual unchanged source/target down/+2 promotion/target movement/up in both controlled/uncontrolled modes against C/apps/vue's actual Vite conformance host. E/resume-vue-immediate-settlement-diagnostic/custom-result.json SHAb3a33ccae91b5a7ebc70c2ab9a53ebec1bb1a987116f53cf18dfa7ec944505ad has2rows/errors[]. Both actual valid public candidate/renderer states exist and lifecycle/accepted outcomes remain distinct. Exact path d='M 169.5 42 L 260.5 42', physical rect190.5/43/91/0, computed stroke='none', fill black, visibility visible, display inline, opacity1. Source and target handles both at y43. Bounding getBBox was recorded as native opaque {} in this first diagnostic; the explicit rect and d preserve the actual zero height. A later proof must explicitly serialize getBBox fields. Its playwrightVisible field was queried AFTER teardown and is honestly a post-teardown observation, not active visibility evidence.

Actual custom-uncontrolled.png and custom-controlled.png show nodes/handles but no connection line; executor visually inspected uncontrolled PNG. Preserve raw PNG/source/config/server/commands and actual owner cleanup. Do not substitute programmatically invented pixels or modify the old fixture for a diagnosis.

## Alternatives and minimal honest fixture recommendation

Removing the original visibility assertion or substituting attached state would weaken its painted-output boundary. Moving the actual target changes protected input and radius/geometry obligations. Adding stroke alone would paint the line but leave geometric height0, so Playwright's existing visibility assertion can still reject it. A product-wide geometry/style change is unjustified: this supplied custom component owns its rendering.

Recommend correcting ONLY this existing TEST custom component into a visibly painted SVG quadratic path, with actual from/to endpoints unchanged. Keep testID, data-preview-kind, structured public preview receipt and every old input/assertion. Supply stroke='#2563eb', stroke-width2, fill='none'. Its path is `M from.x from.y Q midpoint.x (midpoint.y+12) to.x to.y`, where midpoint is the arithmetic mean of the real public endpoints. This deliberately bends a custom test renderer by12graph units to give a real nonzero painted/bounding height for the existing horizontal source/target. It is a fixture visual choice, not production routing, threshold, radius or tolerance. No new core path helper/schema/API is needed.

The new promotion attached/currentinvalidfalse condition remains as approved; all ORIGINAL later target/controlled/cancel toBeVisible assertions remain unchanged. This packet asks no callback/input/default change and changes no package renderer or stylesheet.

## Requested scope and machine-checkable proof

ONLY apps/vue/src/test-harness.ts ConnectionPreviewProbe585–603 path/style fields, plus additive assertions in the already scoped custom-preview test in apps/vue/e2e/interaction-lifecycle.e2e.ts. This NEW fixture scope is not silently covered by093 constructor-option plumbing. Root/cold must explicitly authorize it before editing. Original state histories/accepted edge/controlled refusal/cancel cleanup tests remain protected.

At invalid promotion and valid target, actual computed stroke must equal intended color, fill none and stroke-width2; getBBox numeric width/height and native path getTotalLength must be positive. getPointAtLength(0) and getPointAtLength(totalLength) must equal actual public from/to, with the existing coordinate precision retained. Both existing native toBeVisible assertions must pass. Save raw path d, bbox/rect/style/public from/to/candidate and actual PNG for controlled/uncontrolled and cancel; visually inspect paint. Require original exact accepted edge/single proposal/controlled unchanged accepted graph/current owner/preview removal at terminal. No looser visibility criterion, extra input, synthetic pointer, threshold override, tolerance or screenshot replacement.

Run quality/types/architecture, exact old custom test and both original keyboard regressions only after independently approved immediate-baseline repair, then complete Vue/combined086+093 gates. Preserve all previous failed CLI outputs. STOP if the genuinely painted fixture still fails original assertions or needs another production/fixture policy.

## Conformity and deviations

Conforming test boundary is a custom renderer that actually paints the public candidate it receives, retaining exact current endpoints and terminal ownership. The fixture's deliberate curved path is an intentional test visual; it makes no upstream route or library parity claim. Corrected fixture/native results, pointer preview, immediate baseline repair, full/SOURCE/member/device/collector acceptance remain unverified. This proposal authorizes no source edit.
