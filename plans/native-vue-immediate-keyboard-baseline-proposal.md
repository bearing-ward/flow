# Vue immediate keyboard retry baseline proposal

2026-10-02. PLANS ONLY. No source edit is authorized. Same086 candidate C=/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow, evidence E=C sibling native-parity-acceptance-evidence; HEAD841be137e253cf19c665269eaaa79edc19abf3c3. Preserve approved captured-baseline packet8780120c and implemented production95fb43a5e3dc046fb1249229fe8041d005b726c34ebd7a422b2d118db6a9998b, test6809c8dde0f0ab21b5d7106cb9ea6e03a004d03fe58908817947a0e04781d39b. No dependency/core/schema/API/measurement-generation/pointer-render change.

## Actual failure and public timelines

First bounded native18 run passed16 and failed2, logf26e6bb1a7ca1525e7ea7e821e3e28b19fcfe11831b4d18d344852463e18cb3a. Its ten NEW trusted repeat/cancel/refusal/realACK/no-change/bounds controls all pass, but ORIGINAL grouped keyboard test:2993 accepts120 instead110 on immediate retry after Escape. Original two regression bodies remain byte-identical. All source/log/artifacts/84raw attachments are preserved in E/resume-vue-keyboard-native-first-preserved. No readiness was added to either old test.

Authorized EXTERNAL actual public composition is E/resume-vue-immediate-settlement-diagnostic/{index.html,main.js,vite.config.mjs,run.mjs}. It mounts exported FlowCanvas/useFlow and public decodeFlowDocument, subscribes actual public accepted state and receives complete onChange payloads. Callbackless controlled and callback-provided-but-refused controlled are separate rows. It never intercepts private emit, reads private Model, synthesizes ACK or suspends the real producer. Actual trusted key capture listeners take pre-handler and queued post-handler snapshots, with real external ResizeObserver and MutationObserver observations. Plain and own-undefined tagged raw payload strings retain order before projection. Initial failed optimizer launch and first one-row partial diagnostic are preserved, not acceptance.

Complete second diagnostic exited0 with9rows/errors[], raw second-result.json SHA3db73cf8315d47dca137c03b3d84b3a20836b4fa96890bacc9ece9be9d8c871d. second-projection.json is a separate convenience projection, not replacement evidence. All rows first genuinely measure105, then110 before terminal. No condition/frame/sample/readiness occurs between terminal and fresh native key:

- Uncontrolled blur: fresh key PRE-handler physical100/internal110/accepted100, fresh preview115, completed onChange115 and accepted115.
- Controlled callbackless Escape and keyup: fresh PRE-handler100/110/100; fresh proposal115, accepted remains100 and later actual RO returns100.
- Controlled callback-provided/refused Escape, blur and keyup: same100/110/100 and proposal115; real onUpdate:document is recorded without adoption. No accepted change.
- Uncontrolled accepted keyup legitimately retains110 and fresh115. Two other cancellation rows receive actual rollback RO first and correctly retry105. Preserve that scheduling distinction; do not relabel all rows failures.

Original native failure120 uses two5-unit retry keys. External fresh115 uses one5-unit retry. Both expose stale START baseline independently of the repaired cumulative-repeat helper.

## Exact production entry and source cause

Rendered right button onKeydown starts at flow-canvas.ts5034; first activation5096–5135 captures graph.value dimensions after actual element lookup. Repeats now correctly use active.position/size at5071–5078. Escape/blur/keyup use existing cleanupPreview2555–2606: physical active.size is written at2595, session cleared2603, but cached measurement is not updated synchronously. RO1422–1477 eventually reads the CURRENT actual owned element bounds and updates measurementState. graph1245 consumes that cache. Immediate first activation therefore captures110 although actual reset physical node is100.

Actual existing measureNodeHandles1387–1420 already performs an owner-scoped genuine synchronous physical sample. Its exact guard is generation!==undefined, !stateDisposed and nodeElements.get(node.id)===element. It preserves real generation, reads element.getBoundingClientRect, converts using existing active viewport, collects current physical handles, calls existing applyNodeMeasurements and updates measurementRevision only on changed real sample. It sends no fabricated lifecycle result or accepted document proposal.

Current excerpts:

```ts
const element = nodeElements.get(node.id)
const initialSize = graph.value.nodes.get(node.id)?.dimensions
if (
  element === undefined ||
  initialSize === undefined ||
  !(event.currentTarget instanceof HTMLElement)
)
  return
const change = keyboardResize(node, direction, delta, {
  position: node.position,
  size: initialSize,
})
```

```ts
active.element.style.width = `${active.size.width}px`
active.element.style.height = `${active.size.height}px`
if (session.value === active) session.value = undefined
```

## Alternatives and bounded recommendation

Waiting for RO in old tests would conceal the immediate-user-input bug. Explicit declared-size fallback loses legitimate measured nodes, absent declarations, CSS constraints and fractional physical sizes. Restoring a cached captured sample is not a truthful current observation and can carry obsolete handles. A new generation/quarantine/context protocol is disproportionate to this proved synchronous new-key boundary and would change public transient-measurement policy.

Recommend using the EXISTING real measureNodeHandles only at NEW keyboard activation, after proving actual current HTMLElement control and owner node exist and BEFORE reading graph.value starting dimensions. Rearrange only that initial branch to retain its element/control guards, invoke measureNodeHandles(node,element), then acquire current graph dimensions and retain its undefined abort. Pass that genuinely sampled baseline to the already approved helper/session. Never measure on every repeat; repeat retains the original captured baseline. No cleanup, RO, helper calculation, pointer startResize, public measurement API, generation, acceptance/lifecycle/callback or viewport policy changes.

This reads the real physical current owner, not accepted.size. DOM100 becomes actual measured100 before retry, with genuine unchanged generation and current physical handles. Measured-only nodes and CSS/fractional bounds retain their actual physical authority. Existing node.position anchor, parent bounds, origin, minimum40x24, bounds rejection, child compensation and step/delta policies remain exact. No fake cached-success ACK is introduced. StateDisposed/missing/current-owner failure still uses existing producer guard/initial abort; do not silently manufacture readiness.

Current explicit producer conversion uses activeViewport zoom. Preserve that policy in this packet; do not expand into a new DOM-epoch or pending viewport synchronization mechanism. Tests must include committed zoom0.5/2 and actual DOM/public transform readiness before gesture. A proved accepted-before-DOM-commit/new-owner/viewport race requiring another authority or first-pointer-start correction STOPs this packet. Pointer startResize4204 also reads cached dimensions, but no current immediate POINTER retry failure has been proved in this diagnostic; it is explicitly outside this keyboard-only recommendation and pending separate pointer timeline. Public internal geometry following actual previews is not labeled an accepted-document mutation or a defect here.

## Exact requested allowlist and meaningful tests

ONLY packages/vue/src/flow-canvas.ts first keyboard activation branch5096–5135 and existing apps/vue/e2e/interaction-lifecycle.e2e.ts separately titled additions. Preserve the current helper+two callers patch, ten trusted tests, both original synthetic repeat helpers/regressions/110 expectations, retained inputs and all093 controls byte-identically. No other functional source path is requested. Owned input/execution/provenance records may preserve reviewed receipt. Add no dependency, cast, manual scalar contract, public API or suppressed callback.

Machine-checkable native matrix: both modes times Escape/window-blur/controlled-refusal or uncontrolled-accept. Start physical/internal100; actual trusted first/repeated keys measure105 then110. Deliver terminal then fresh native key with NO wait/frame/public sample between inputs. Pre-handler event receipt records physical/internal/accepted baseline and actual trusted target/repeat. Fresh width must105 when accepted/refused baseline100, and115 after real uncontrolled110 acceptance, regardless of whether native RO happened first. Fresh terminal exact one proposal/correct accepted count, six physical/internal/document/viewport stable frames, ignored late keyup and healthy retry. Keep raw conditional stale-cache observations; source similarity or a cache-already-settled row alone does not prove the race. The preserved old regression remains mandatory deterministic regression-first evidence.

Additional native controls: no declared size with actual physical dimensions captured before key; fractional declared size rendered physically; committed zoom0.5/2; real existing controlled acceptDocument110 followed immediately by fresh trusted key and proposal115 while accepted110; parent/child compensation and current handle ID retained during genuine new observation; missing/removed node/disposed owner does not start or emit late proposal. Existing no-change/bounds policy tests remain, with unchanged-axis one existing proposal and bounds rejection zero proposals. Record actual sample/geometry/public accepted counts; never invent measurement ACK for Vue's direct native observer.

Run local check/typecheck/architecture/unit suite, original two regressions plus all new meaningful cases, complete Vue native file and retained host scope. Then every original086/093 reference/archives/samebuild/ordinaryHMR/genuinelegacy/focused/full/release/freeze/primary-reproduction/coldSOURCE gate. Failed original18 log stays failed. STOP extra source/API/policy/lifecycle/late-ACK needs before edit. No known-failing complete/focused rerun before root+cold release.

## Conformity and deviations

Conforming target: each new keyboard gesture captures the actual current physical owned baseline once, then uses cumulative delta. Actual Vue internal samples remain transient physical geometry under existing policy, distinct from the accepted document. Keyboard/grouped acceptance are intentional Flow features, not pinned keyboard parity. Immediate correction, pointer-preview timeline, pointer baseline, precommit/lateACK authority, final SOURCE/integration/full/member/device/collector acceptance remain unverified. This proposal authorizes nothing.
