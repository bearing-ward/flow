# 091 repair the public Foldkit reconnect control layer

2026-10-02. PLANS ONLY. Root and a fresh independent cold design reviewer must approve this exact successor before SAME091 may edit source. Main HEAD is `841be137e253cf19c665269eaaa79edc19abf3c3`. Formal SOURCE rounds remain zero; all original 51 new native cases and member cells remain unaccepted. This proposal grants no lease, source acceptance, Git operation or member transition.

## Status, intent and governing packet

Priority P1, effort M, risk MED, categories correctness, architecture and test coverage. W is `/Users/richardmcandrews/.codex/worktrees/live-connection-options/flow`; E is its sibling `live-connection-options-evidence`. Reuse SAME executor `/root/callback_field_matrix/executor_091` after separate release. Do not create another owner or executor. Root retains the sole 091 shared lease pending decision, but the design author runs reads/hashes only.

Preserve the complete original 091 three-field whole-replacement contract, exact Schema boundaries, invocation-time isolation, ordered detached acknowledgements, operational authority, mode-only cancellation, style-only reconciliation, owner/client lifetime and installed/native proof requirements. Original plan SHA256 `583b914a1fd7e2ef946fcf44daefd605ed774d830bb8179084edaabe63f180f7`, companion `9b2be8b638117ed47d4f33bf18e9463922272d0d2f276cc0d66bc69ab5dd983a`, spatial design `35fdbea76cb9f9af2f90fefe646c45d4fdba9aff4b49344abe6aa981b8811c34`, cold `743388d5ec48cc98da50b70915edd158c59a64aafa8aea97078f2a3ffa41d099`, spatial root release `5bf74d7ce6c3ea9731059fd9c7bf121b7aeb8bcd564bb0938a7002ebe3fd0428`, binding release `24448e431c3279ad7bfb1990c84774eee69e0643d13685687018255c6aeefa8e`, approved test-boundary amendment `bb8aed7f6dfa78a9386217accff784a888261ecad8d99b3b649f6450e6879734` with primary `41a44e6d11c1ae838b1720567b7080577de5352171b9115e1c8e7fa2c4161ca7` and independent `8614e8a40ba54d6e87b5be1895d58ff08cefd12b7454b7e498b8f2fbf70611ee`, and every approved prior amendment remain governing. Moving086 is never an input; its canonical-schema collision remains a cumulative-integration STOP. This successor changes presentation hit routing only.

## Exact immutable failure input

Latest E/reconnect-physical-hit-diagnostic-04-final-failure-freeze.json SHA256 `e09fb6154c62b4f207fc89e84d373cea3f96013e76b4632d9f39696bf40d46bf` contains 1,516 source and 669 evidence files. Full outside copies are `/Users/richardmcandrews/.codex/worktrees/live-connection-options/preserved-091-reconnect-physical-hit-diagnostic-04-final/source` and `/evidence` under that same preservation root. The prior official spatial stop freeze `9290fe17068ece5ccf539f0d4be73d7361a0cf4ce6bf291ce77603be40e6e5f8` preserves 1,516 source and 653 evidence files. During this design authoring, a read-only complete rehash matched all 1,516 current source and 1,516 outside source copies plus all 669 current and 669 outside evidence copies against the latest freeze, zero mismatches. That establishes byte integrity only; no product gate ran. All earlier 548/608/653/669 failure and local-ready corpora, raw traces, proposals and current metadata remain immutable.

The official physical same-owner candidate/SVG/terminal case and 960x640 root/canvas with 150x60 node observations passed. The subsequent run had four cases pass, reconnect fail before replacement, and twelve cases unrun. None is full 091 acceptance. The authorized observational diagnostic added asynchronous public reads after down; those reads are diagnostic timing differences and do not retroactively prove the original immediate official sequence. It performed no CSS experiment.

Raw diagnostic 374,122 bytes SHA256 `2ef9fe95c944ce9e9add5e11cc834dca85ff7876eaeeb7d5d345c4d64d08cbc7`; summary 8,026 bytes `eaa224c8589962f1116ad6e459633e6b44799ef0807b06d8759a0bbe22e176d8`; findings 4,674 bytes `20442d43183e2c3a0edf274c2c0d5aa0d4fee079786930809b02124a4c8412d0`. The author read the full summary/findings and parsed all four complete public responses, phase geometry/options/event histories and complete computed ancestor/composed-path records. Repeated outerHTML copies describe the same DOM and stylesheet, not separate experiments. The diagnostic reports all 82 inspected historical owned groups and six listener ports empty; this is retained historical evidence, not a new author process inspection.

### [CORRECTNESS-091-RECONNECT-01] Render interactive reconnect controls outside the label stacking context

- Evidence: W `packages/foldkit/src/graph.ts:2928` creates the real endpoint button; `:3196` mixes it into edgeLabels; `:3378` parents that collection under the label overlay. `packages/foldkit/src/style.css:241` gives the parent z-index 1 and pointer-events none; `:257` gives the button z-index 1001 with no pointer override. Selected edge SVG at graph `:3252` has edge-derived selected level 1000; its hit path at `:2853` permits stroke hit testing.
- Evidence: actual target center 99.5,163 belongs to `path.flow-foldkit-edge-hit-target` in elementFromPoint and the trusted capture listener. The intended button computes pointer-events none, parent z-index 1, selected SVG z-index 1000. Public responses retain preview null, no pointer capture holders, same owner, accepted document/viewport 5,-7,1 and no proposals; events show onMoveStart/onMove/onMoveEnd rather than reconnect.
- Evidence: retained `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:871` and `:1033` dispatch directly to the controls, bypassing physical hit testing. Those assertions are preserved and do not constitute trusted routing proof.
- Impact: users pressing a visible reconnect endpoint can begin viewport interaction and never reach the existing reconnection transition. Whole options replacement cannot cancel a reconnection that never started.
- Effort: M including trusted tests and preserved-suite verification. Risk MED because stacking affects physical routing and focus, while labels/custom renderers and high-z siblings must retain their current policies. Confidence HIGH for the measured obstruction and source cause; repaired behavior is unverified.
- Fix sketch: collect the existing buttons into a separate noninteractive HTML overlay without a stacking context. Give each existing button an explicit pointer override and its own edge-derived layer. Retain the real canvas pointerdown event route and all semantic state/lifecycle code.

## Actual production and test paths

Production starts at `packages/foldkit/src/public.ts` createProgram to `application.ts` Runtime program, Graph view and official Runtime DOM. Graph `edgeReconnectControls:2907` keeps selected/canReconnectEdge endpoint eligibility and existing HTML/ARIA/keyboard attributes. The view calculates the current accepted edge geometry at `:3178` and the button positions from geometry.start/end, then places its viewport under the existing accepted transform. Real canvas OnPointerDown at `:3341` passes the actual event target through `beginPointer:2227` and `readTarget:2150`; only a closest data-edge-endpoint yields the existing PointerDown reconnection branch `:1267`. That branch keeps canReconnectEdge and real current geometry. `connectionPreviewState:2545` and the native SVG at `:3268` render the actual session. No new semantic transition or fake target is needed.

Public test entry is `apps/foldkit/src/live-connection-options-test.ts:71` actual Runtime.embed/createProgram with controlled document and official ports. Existing snapshot client at `:94` returns real `connectionPreview` and accepted snapshot; native read at e2e `:24` keeps both separate. New trusted tests use real `page.mouse`, actual elementFromPoint and a once-only document capture listener that observes isTrusted/target/pointerId. They never dispatch pointerdown to a chosen target, invoke private Model, inject SVG/CSS, or alter intended physical inputs to bypass the bug. Pointer-capture holder observations are recorded honestly; the current graph does not call setPointerCapture, so this proposal adds no positive capture-acquisition promise. Existing false-after-cancel assertions stay intact.

## Compared control layers and z-index contract

Vanilla `apps/vanilla/src/edge-renderer.ts:373` creates a separate SVG anchorGroup, with anchors appended at `:416`; `style.css:259` explicitly enables pointer-events all only for selected available anchors. Vue `packages/vue/src/flow-canvas.ts:4839` appends selected SVG circle controls to its edge children, and `packages/vue/src/style.css:370` explicitly enables pointer-events all. Neither puts interactive HTML buttons inside its noninteractive label overlay. They support keeping labels separate, but they do not prove future Foldkit output. Their implementations and CSS remain protected.

Core `flow.schema.ts:138` accepts edge zIndex as optional Finite. `flow-visibility.schema.ts:148` orders using `(zIndex ?? 0) + selected1000` with original index ties; the current Foldkit SVG and label use that same level. No integer restriction, clamp, finite-range conversion or CSS coercion is added. The button uses exactly that existing arithmetic plus 1, passed as a CSS string. Absence remains base zero. Ordinary tested integer levels -20,0,37,2000 must compute above their corresponding selected SVG; this is the bounded hit-routing guarantee. Fractional/extreme finite values can be ignored, rounded or clamped by browser CSS integer rules and are not promised universal ordering. Do not alter their Schema acceptance, normalize user values or invent a clamp in this repair. Full 074 field semantics remain OPEN.

The parent overlay has position absolute, inset 0 and pointer-events none only. No z-index, transform, opacity reduction, isolation, containment, filter or other stacking-context rule is added. Thus positioned button descendants participate in the existing transformed viewport stacking context. The parent itself must compute z-index auto. Existing label parent and children, their z-index/pointer behavior, selected edge SVG levels, visible-edge order and node levels remain unchanged. A button is above its own selected SVG at the exercised CSS-representable levels, not above every unrelated higher user-z edge or foreground node. The test competitor is a real public, selectable, unselected edge at the same computed SVG level as the selected primary; it has no reconnect controls. No arbitrary maximum overlay z-index is introduced.

## Exact successor scope

Only these three source/test paths may change after approval:

1. `packages/foldkit/src/graph.ts`, only edgeReconnectControls style, separate reconnectControls collection/push and sibling overlay rendering shown in the full patch below.
2. `apps/foldkit/src/live-connection-options-test.ts`, only the appended configureReconnectLayers helper shown below. It constructs additional new-test data through the actual public decodeFlowDocument and HostAction.ReplaceDocument, leaving all existing methods and original graphDocument bytes unchanged.
3. `apps/foldkit/e2e/live-connection-options.e2e.ts`, only the additive typed DOM observation helpers, guard/observation calls in the existing reconnect branch and eight appended both-endpoint layer cases shown below. Existing actions, names, expected values, timeouts, tolerances, skips, all seventeen original case bodies and four activation paths retain every old assertion in order.

After gates, existing owned `plans/091-execution.md` and `plans/091-provenance.json` may append accurate receipts. Exact approved packet copies and external evidence/complete preservation copies are permitted. No main/index/review/history update by executor.

Every other current 1,516 source path remains protected, particularly `packages/foldkit/src/style.css`, all fixture HTML/CSS, core schema/geometry/semantic/Model/reducer/lifecycle/subscription code, application.ts, public exports/ports/clients, Vanilla/Vue, inherited tests and shared fixtures, manifests/lock/dependencies/pins/compiler/lint/Vitest/Playwright/Vite/verification policy, ledgers/research imports and prior records. This explicitly lifts the original protection for only the named presentation regions and new test-host/native additions. It authorizes no broad graph.ts or fixture waiver.

Protected comparison bytes personally read and hashed:

| Path | Current SHA256 |
| --- | --- |
| packages/foldkit/src/style.css | `4a0f3a44ddedefbe9be0fda6b5e7b45338fb427ff42f13bd7fe8d506537fbbed` |
| apps/foldkit/e2e/interaction-lifecycle.e2e.ts | `15ce38d560cc99748dfc0a7744de9575ea8e782d57ce509be2aa6877203b8024` |
| apps/vanilla/src/edge-renderer.ts | `5b25acf255aa115d701629d9172330f2d905836b763facfcc1407a4f72ada424` |
| packages/vue/src/flow-canvas.ts | `baf210e5075c40dd1051ec22126409ac4c02251b0e794f221580b89007acaa61` |
| packages/core/src/domain/flow.schema.ts | `b765bb46f60e0470f710907ab61ee9b5403dfff556b658d6bb2fa6e4537a547d` |
| packages/core/src/domain/flow-visibility.schema.ts | `edacee99f7d41af4c993d57a4b299568c2573a0d5c117596a0ab60687141778d` |
| verification.config.json | `a8a9d9edac4f4db3a72bf3a05ebbc8e4a3db476373d9f7db25246a265dabad31` |
| package.json | `4c944ecead5be19031213069cd6ef22285aa5e199146d4fb686e922c9d65880c` |

## Complete proposed changed bytes

The following unified patches were generated in memory against personally read current bytes. Source was never written. Every added line is proposed, not executed or typechecked. Existing formatter trivia may be normalized within these exact regions after preserving its first output; no semantic/test-policy rewrite follows. The current and proposed content hashes bound the complete strings, including unchanged contexts, used to produce these patches.

| Path | Current SHA256 | Proposed SHA256 |
| --- | --- | --- |
| packages/foldkit/src/graph.ts | `83c4fd4484e18d5f1406c206bda06a93c9cab39f50152530dfe7d8ae710e15b1` | `004ead24c763acbc9e1db18a4b1b9b29b826d2bbac85f3509d688a40f04bc79c` |
| apps/foldkit/src/live-connection-options-test.ts | `2b18d205a90facbea645734bd48fa76bb104bf199e867b719aa132ebe8ac2dd0` | `b942c51e8d01df202825136356fd9b62954e10fe610ca29822a4bb624aeb6cd8` |
| apps/foldkit/e2e/live-connection-options.e2e.ts | `c82606b15ee06e515ffed2acabb87c95450626ec85ee739e8a95840b215189b0` | `cef15119d07ff30e68f402aa074f214caa12ab52cb1bd7ea5ce176805c14a4f9` |

### Proposed patch for packages/foldkit/src/graph.ts

```diff
--- a/packages/foldkit/src/graph.ts
+++ b/packages/foldkit/src/graph.ts
@@ -2931,7 +2931,14 @@
       h.DataAttribute('edge-endpoint', endpoint),
       h.Attribute('type', 'button'),
       h.AriaLabel(`Reconnect ${endpoint} of ${ariaLabel}`),
-      h.Style({ left: `${point.x}px`, top: `${point.y}px` }),
+      h.Style({
+        left: `${point.x}px`,
+        top: `${point.y}px`,
+        pointerEvents: 'auto',
+        zIndex: String(
+          (edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0) + 1
+        ),
+      }),
       h.OnKeyDownPreventDefault((key) =>
         key === 'Enter' || key === ' '
           ? Option.some(
@@ -3157,6 +3164,7 @@
       })

     const edgeLabels: NonNullable<FoldHtml.Html>[] = []
+    const reconnectControls: NonNullable<FoldHtml.Html>[] = []

     const visibleEdges = orderFlowEdges(
       model.document.edges.map((edge) =>
@@ -3193,7 +3201,9 @@

         const ariaLabel = edge.ariaLabel ?? edge.label ?? `Edge ${edge.id}`

-        edgeLabels.push(...edgeReconnectControls(edge, geometry, ariaLabel, h))
+        reconnectControls.push(
+          ...edgeReconnectControls(edge, geometry, ariaLabel, h)
+        )

         if (edge.label !== undefined) {
           const label = h.keyed('div')(
@@ -3380,6 +3390,17 @@
               ],
               edgeLabels
             ),
+            h.div(
+              [
+                h.Class('flow-foldkit-reconnect-controls'),
+                h.Style({
+                  position: 'absolute',
+                  inset: '0',
+                  pointerEvents: 'none',
+                }),
+              ],
+              reconnectControls
+            ),
             ...nodes,
             ...(connectionPreview === null ? [] : [connectionPreview]),
           ]
```

### Proposed patch for apps/foldkit/src/live-connection-options-test.ts

```diff
--- a/apps/foldkit/src/live-connection-options-test.ts
+++ b/apps/foldkit/src/live-connection-options-test.ts
@@ -161,6 +161,36 @@
         HostAction.ReplaceViewport({ viewport: { x: 5, y: -7, zoom: 1 } })
       )
     },
+    configureReconnectLayers: (zIndex: number) => {
+      const document = Effect.runSync(
+        decodeFlowDocument({
+          ...graphDocument,
+          nodes: graphDocument.nodes.map((node) =>
+            node.id === 'a' ? { ...node, label: 'Latest accepted' } : node
+          ),
+          edges: [
+            ...graphDocument.edges.map((edge) => ({
+              ...edge,
+              zIndex,
+              label: 'Reconnect primary',
+            })),
+            {
+              id: 'layer-competitor',
+              source: 'c',
+              sourceHandle: 'edge-out',
+              target: 'a',
+              targetHandle: 'in',
+              selected: false,
+              selectable: true,
+              zIndex: zIndex + 1000,
+              label: 'Competing selectable edge',
+            },
+          ],
+        })
+      )
+
+      runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
+    },
     closeFirst: () => firstClient.dispose(),
     close: () => {
       firstClient.dispose()
```

### Proposed patch for apps/foldkit/e2e/live-connection-options.e2e.ts

```diff
--- a/apps/foldkit/e2e/live-connection-options.e2e.ts
+++ b/apps/foldkit/e2e/live-connection-options.e2e.ts
@@ -1,4 +1,7 @@
-import type { FlowConnectionOptionsResult } from '@flow/core'
+import type {
+  FlowConnectionOptionsResult,
+  ReconnectEndpoint,
+} from '@flow/core'
 import { FlowConnectionOptionsErrorSchema } from '@flow/core'
 import { expect, test } from '@playwright/test'
 import type { Page } from '@playwright/test'
@@ -41,6 +44,172 @@
       sameOwner: owner.sameOwner(),
     }
   })
+
+
+declare global {
+  interface Window {
+    __flowReconnectPhysicalDown?: {
+      readonly trusted: boolean
+      readonly exactControl: boolean
+      readonly edgeId: string | null
+      readonly endpoint: string | null
+      readonly pointerId: number
+      readonly pointerType: string
+      readonly x: number
+      readonly y: number
+      readonly captureHolders: readonly string[]
+    }[]
+  }
+}
+
+const prepareReconnectHit = async (
+  page: Page,
+  endpoint: ReconnectEndpoint
+) => {
+  const anchor = page.locator(
+    `#first .flow-foldkit-reconnect-handle[data-edge-id="edge"][data-edge-endpoint="${endpoint}"]`
+  )
+
+  await expect(anchor).toBeVisible()
+  const bounds = await anchor.boundingBox()
+
+  if (bounds === null) {
+    throw new Error('Missing trusted reconnect control geometry')
+  }
+
+  const point = {
+    x: bounds.x + bounds.width / 2,
+    y: bounds.y + bounds.height / 2,
+  }
+
+  const proof = await anchor.evaluate((control, center) => {
+    const parent = control.parentElement
+    const viewport = control.closest('.flow-foldkit-viewport')
+    const edge = viewport?.querySelector(
+      'svg.flow-foldkit-edge[data-edge-id="edge"]'
+    )
+    const competitor = viewport?.querySelector(
+      'svg.flow-foldkit-edge[data-edge-id="layer-competitor"]'
+    )
+    const labels = viewport?.querySelector('.flow-foldkit-edge-labels')
+
+    if (parent === null || edge === undefined || edge === null || labels === undefined || labels === null) {
+      throw new Error('Missing production reconnect or label layer')
+    }
+
+    const parentStyle = getComputedStyle(parent)
+
+    return {
+      point: center,
+      exactHit: document.elementFromPoint(center.x, center.y) === control,
+      control: control.outerHTML,
+      actualHit: document.elementFromPoint(center.x, center.y)?.outerHTML ?? null,
+      pointerEvents: getComputedStyle(control).pointerEvents,
+      controlZ: getComputedStyle(control).zIndex,
+      edgeZ: getComputedStyle(edge).zIndex,
+      competitorZ: competitor === undefined || competitor === null ? null : getComputedStyle(competitor).zIndex,
+      parentClass: parent.className,
+      parentPointerEvents: parentStyle.pointerEvents,
+      parentZ: parentStyle.zIndex,
+      parentTransform: parentStyle.transform,
+      parentOpacity: parentStyle.opacity,
+      parentIsolation: parentStyle.isolation,
+      parentContain: parentStyle.contain,
+      labelParentZ: getComputedStyle(labels).zIndex,
+      labelPointerEvents: getComputedStyle(labels).pointerEvents,
+      labels: [...labels.querySelectorAll('.flow-foldkit-edge-label')].map((label) => ({
+        text: label.textContent,
+        parentClass: label.parentElement?.className ?? null,
+      })),
+    }
+  }, point)
+
+  await test.info().attach(`reconnect-${endpoint}-physical-layer`, {
+    body: JSON.stringify(proof),
+    contentType: 'application/json',
+  })
+  expect(proof.exactHit, JSON.stringify(proof)).toBe(true)
+  expect(proof.pointerEvents).toBe('auto')
+  expect(proof.parentClass).toBe('flow-foldkit-reconnect-controls')
+  expect(proof.parentPointerEvents).toBe('none')
+  expect(proof.parentZ).toBe('auto')
+  expect(proof.parentTransform).toBe('none')
+  expect(proof.parentOpacity).toBe('1')
+  expect(proof.parentIsolation).toBe('auto')
+  expect(proof.parentContain).toBe('none')
+  expect(proof.controlZ).toBe(String(Number(proof.edgeZ) + 1))
+  expect(proof.labelParentZ).toBe('1')
+  expect(proof.labelPointerEvents).toBe('none')
+
+  if (proof.competitorZ !== null) {
+    expect(proof.competitorZ).toBe(proof.edgeZ)
+    expect(proof.labels).toEqual([
+      { text: 'Reconnect primary', parentClass: 'flow-foldkit-edge-labels' },
+      { text: 'Competing selectable edge', parentClass: 'flow-foldkit-edge-labels' },
+    ])
+  }
+
+  await page.evaluate(() => {
+    const observed: NonNullable<Window['__flowReconnectPhysicalDown']> = []
+    window.__flowReconnectPhysicalDown = observed
+    document.addEventListener('pointerdown', (event) => {
+      const target = event.target
+      const control = target instanceof Element
+        ? target.closest('.flow-foldkit-reconnect-handle')
+        : null
+      observed.push({
+        trusted: event.isTrusted,
+        exactControl: target === control && control !== null,
+        edgeId: control?.getAttribute('data-edge-id') ?? null,
+        endpoint: control?.getAttribute('data-edge-endpoint') ?? null,
+        pointerId: event.pointerId,
+        pointerType: event.pointerType,
+        x: event.clientX,
+        y: event.clientY,
+        captureHolders: [...document.querySelectorAll('*')]
+          .filter((element) => element.hasPointerCapture(event.pointerId))
+          .map((element) => element.outerHTML),
+      })
+    }, { capture: true, once: true })
+  })
+
+  return point
+}
+
+const assertTrustedReconnectDown = async (
+  page: Page,
+  endpoint: ReconnectEndpoint
+) => {
+  const observed = await page.evaluate(() => window.__flowReconnectPhysicalDown)
+  await test.info().attach(`reconnect-${endpoint}-trusted-down`, {
+    body: JSON.stringify(observed),
+    contentType: 'application/json',
+  })
+  expect(observed).toHaveLength(1)
+  expect(observed?.[0]).toMatchObject({
+    trusted: true,
+    exactControl: true,
+    edgeId: 'edge',
+    endpoint,
+    pointerType: 'mouse',
+  })
+}
+
+const startTrustedReconnect = async (
+  page: Page,
+  endpoint: ReconnectEndpoint
+) => {
+  const point = await prepareReconnectHit(page, endpoint)
+  await page.mouse.move(point.x, point.y)
+  await page.mouse.down()
+  await assertTrustedReconnectDown(page, endpoint)
+  await page.mouse.move(300, 240)
+  await expect(page.locator(previewSelector)).toHaveCount(1)
+  const active = await read(page)
+  expect(active.preview).toMatchObject({ kind: 'reconnect' })
+  expect(active.events.filter((event) => event.startsWith('start:onReconnectStart:'))).toHaveLength(1)
+  expect(active.events.filter((event) => event.startsWith('start:onMoveStart:'))).toHaveLength(0)
+}

 const startPointer = async (page: Page) => {
   const bounds = await page.locator(sourceSelector).first().boundingBox()
@@ -402,11 +571,13 @@
         throw new Error('Missing public reconnect anchor')
       }

+      await prepareReconnectHit(page, 'target')
       await page.mouse.move(
         bounds.x + bounds.width / 2,
         bounds.y + bounds.height / 2
       )
       await page.mouse.down()
+      await assertTrustedReconnectDown(page, 'target')
       await page.mouse.move(300, 240)
     } else if (activation === 'click') {
       await page.locator(sourceSelector).first().click()
@@ -1172,3 +1343,82 @@
   expect(proof.after).toEqual(proof.before)
   expect(proof.sameOwner).toBe(true)
 })
+
+for (const endpoint of ['source', 'target'] as const) {
+  for (const zIndex of [-20, 0, 37, 2000]) {
+    test(`091::foldkit::reconnect-control-layer ${endpoint} z${zIndex}`, async ({ page }) => {
+      await page.evaluate((level) => {
+        const owner = window.__flowLiveFoldkit?.first
+
+        if (owner === undefined) {
+          throw new Error('Missing actual reconnect layer owner')
+        }
+
+        owner.acceptLatest()
+        owner.configureReconnectLayers(level)
+      }, zIndex)
+      const before = await read(page)
+      expect(before.sameOwner).toBe(true)
+      expect(before.snapshot.document.edges).toHaveLength(2)
+      expect(before.snapshot.document.edges.find((edge) => edge.id === 'edge')?.zIndex).toBe(zIndex)
+
+      await startTrustedReconnect(page, endpoint)
+      const active = await read(page)
+      expect(active.snapshot).toEqual(before.snapshot)
+      expect(active.proposals).toEqual(before.proposals)
+      expect(active.sameOwner).toBe(true)
+
+      const replaced = await replace(page, {
+        connectionMode: 'loose',
+        connectionLineStyle: { stroke: 'purple' },
+      })
+      expect(replaced.status).toBe('applied')
+      expect(replaced.status === 'rejected' ? false : replaced.cancelledPreview).toBe(true)
+      await expect(page.locator(previewSelector)).toHaveCount(0)
+      expect(await capture(page)).toBe(false)
+      const cancelled = await read(page)
+      expect(cancelled.preview).toBeNull()
+      expect(cancelled.snapshot).toEqual(before.snapshot)
+      expect(cancelled.proposals).toEqual(before.proposals)
+      expect(cancelled.sameOwner).toBe(true)
+      expect(cancelled.events.filter((event) => event.startsWith('end:onReconnectEnd:') && event.includes('configuration-replacement'))).toHaveLength(1)
+      await page.mouse.up()
+
+      const retryBefore = await read(page)
+      const retryPoint = await prepareReconnectHit(page, endpoint)
+      await page.mouse.move(retryPoint.x, retryPoint.y)
+      await page.mouse.down()
+      await assertTrustedReconnectDown(page, endpoint)
+      await page.mouse.move(300, 240)
+      await expect(page.locator(previewSelector)).toHaveCSS('stroke', 'rgb(128, 0, 128)')
+      const retried = await read(page)
+      expect(retried.preview).toMatchObject({ kind: 'reconnect' })
+      const handleId = endpoint === 'source' ? 'out' : 'in'
+      const target = page.locator(`#first [data-node-id="b"] [data-handle-id="${handleId}"]`).first()
+      const bounds = await target.boundingBox()
+
+      if (bounds === null) {
+        throw new Error('Missing physical reconnect retry destination')
+      }
+
+      const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
+      const exactTarget = await target.evaluate((handle, center) => document.elementFromPoint(center.x, center.y) === handle, point)
+      expect(exactTarget).toBe(true)
+      await page.mouse.move(point.x, point.y)
+      await page.mouse.up()
+      await expect(page.locator(previewSelector)).toHaveCount(0)
+      const after = await read(page)
+      expect(after.preview).toBeNull()
+      expect(after.proposals.filter((kind) => kind === 'edge-reconnect')).toHaveLength(retryBefore.proposals.filter((kind) => kind === 'edge-reconnect').length + 1)
+      expect(after.snapshot).toEqual(before.snapshot)
+      expect(after.sameOwner).toBe(true)
+      expect(after.options).toEqual({
+        connectionMode: 'loose',
+        connectionLineStyle: { stroke: 'purple' },
+        connectionLineContainerStyle: {},
+      })
+      expect(after.events.filter((event) => event.startsWith('start:onMoveStart:'))).toHaveLength(0)
+      expect(await capture(page)).toBe(false)
+    })
+  }
+}
```

## Ordered executor release and verification

This draft authorizes no source work. Root and a fresh cold design reviewer must fully read the entire proposal, patches and actual current sources. Root then releases the exact hash in full plaintext to SAME091. Before edits, independently match HEAD, governing packet and current 1,516 source/669 evidence freeze, every complete current and outside copy, all historical 653/669 inputs and original 1,473 protected baseline hashes. Preserve fresh full source and entire evidence OUTSIDE E without overwriting previous preservation roots, and send full-read/hash/copy/pre-edit ACK. Record exact new graph-only/test-host/native exceptions. Do not reset to earlier main/087/086 bytes or omit failed evidence.

1. Apply only the proposed three-file patch to the current uncommitted candidate after release. The unrelated labels collection still contains only labels, and its old markup/CSS is byte-identical. Controls retain classes, data IDs, endpoint/ARIA/type, geometry positions, keyboard handlers and existing construction behavior. There were no per-button keyed wrappers before this proposal; do not invent keys or replace HTML button kind. The existing selected/canReconnectEdge checks remain unchanged.
2. Run local checks below with separate actual logs and exit receipts. Capture first failure and STOP for substantive type/quality/architecture/scope/retention/semantic defects; propose an exact bounded amendment instead of changing another file. Formatter-only trivia within the proposed regions can be corrected after preserving the first failure. No arbitrary mechanical attempt counter replaces this STOP policy.
3. Only after root's separate shared-phase instruction and full owned-process/strict-port prechecks, rerun the unchanged original reconnect activation case first. Before its existing real mouse actions the additive guard must observe the actual intended target; after down the observer must report one trusted exact-control event. Retain the original movement300,240, preview-count assertion, options replacement/cancelledPreview, terminal count/current snapshot and fresh connection retry assertions. Failure before replacement stays a failure, not a skipped API case.
4. Run all eight appended trusted source/target layer cases. Each new test receives its own original beforeEach owner. Public test-host configuration adds a real selected primary and real selectable equal-level SVG competitor, with labels. Physical center hit, exact trusted target, auto parent context, own-level arithmetic and unchanged label ownership must pass at -20/0/37/2000. Actual reconnect preview and onReconnectStart, no viewport-start, current accepted state, replacement cancellation exactly once, same Runtime and actual fresh reconnect retry through b/out or b/in must pass. Capture holder lists are attached, not invented from private state; after cancellation/completion none remain. The controlled accepted document must not change when one real edge-reconnect proposal appears. Existing original reconnect case is neither replaced nor renamed by these added cases.
5. Run all seventeen original Foldkit live-options cases plus eight new ones, retained selected Foldkit lifecycle/renderer/persistence suites, then all three hosts' unchanged twelve saved suites with the additive cases included. Retained lifecycle source/target/controlled/keyboard/cancel-on-removal reconnect cases and renderer labels/identity/owner assertions remain valuable regression coverage. Their synthetic dispatch remains labelled as such; the new trusted route supplies the missing boundary. Run three fresh actual archive consumers, including both Vanilla controller declarations and actual archived controller helper, and unchanged docs/contracts/api-members/traces plus focused verifier. Preserve Vanilla auto-pan attachments and all new failures under nonoverwriting names.
6. Finish owned receipts, final required quality/diff and whole-corpus retention. Freeze complete final current/copied source and all evidence externally, record exact test counts/saved profile and explicit unrun statuses, and write nothing after successful final checks/freeze. Inspect only actual owned groups and strict4176/4177/4178 plus diagnostic4191/4192/4193 listeners and produce an explicit empty cleanup receipt. Root retains the shared lease for independent reproduction until explicit handoff. No implicit release/transfer or foreign termination.

| Phase | Actual command | Expected result |
| --- | --- | --- |
| Local types/builds | `bun run typecheck` | exit 0, unchanged manifest/lock and exact proposed source scope |
| Local quality | `bun run check` | exit 0, no assertion/policy weakening |
| Architecture | `bun run check:architecture` | exit 0 |
| Meaningful core regression | `bun run test packages/core/src/domain/flow-connection.schema.test.ts packages/core/src/domain/flow-connection-radius.schema.test.ts` | exit 0, complete existing connection/radius bodies retained |
| Original amended local slice | `bun run test packages/core/src/domain/flow-connection-options.test.ts packages/foldkit/src/live-connection-options.test.ts` | exit 0, complete approved two-file core/Foldkit scope; historical 9 tests is not substitute for actual execution |
| Complete original local scope | `bun run test` | exit 0, record actual scope/count; historical 774/53 is not a quota |
| Whitespace/retention | `git diff --check` and full current/copy/source/evidence hash/path/body comparison | exit 0, only three approved implementation/test paths plus named owned receipts differ |
| Leased original activation | `bunx playwright test -c apps/foldkit/playwright.config.ts live-connection-options.e2e.ts --grep '091::foldkit::mode-cancel reconnect' --workers=1` | actual trusted target, one reconnect preview and all original assertions pass |
| Leased new physical layer | `bunx playwright test -c apps/foldkit/playwright.config.ts live-connection-options.e2e.ts --grep '091::foldkit::reconnect-control-layer' --workers=1` | all eight appended real endpoint/z cases pass |
| Leased Foldkit original/new scope | `bunx playwright test -c apps/foldkit/playwright.config.ts live-connection-options.e2e.ts interaction-lifecycle.e2e.ts renderer-contract.e2e.ts versioned-persistence.e2e.ts --workers=1` | original seventeen plus eight appended and all retained selected bodies actually pass |
| Leased archives | `bun run test:consumer` | all three genuine archive installations/types/runtime/browser/disposal pass |
| Saved focused list | `bun run verify --list` | current exact091 focused checks and four suites per host, no accidental scope merge; list is not execution |
| Required focused acceptance | `bun run verify` | exit 0, all baseline/explicit checks/three archives/twelve saved native suites actually pass |
| Final quality/diff | `bun run check` and `git diff --check` | exit 0 after accurate owned receipts; complete freeze and no later writes |
| Integration/release | `bun run verify:full` | later separate integration milestone before broad parity claims, not implied by focused pass |

The approved test-boundary amendment removed the impossible Vanilla/Vue Node-unit placement. Those two original unit files do not exist. Their actual mounted controller/prop assertions remain mandatory native proof. The exact existing two-file core/Foldkit slice above is confirmed by current owned execution records; no compiler/include/policy changes follow. Root and fresh cold SOURCE review of one final immutable packet plus independent reproduction remain mandatory. At most two formal SOURCE corrective revisions follow its initial formal source review, with no blanket source waiver or arbitrary mechanical retry limit. No commit, merge, push, cleanup of foreign work, publication or ledger update is authorized.

## Acceptance, stopping and maintenance

Done means actual trusted routing to both existing endpoint buttons at the exercised ordinary integer levels, dedicated parent without a stacking context, complete public reconnect preview and real lifecycle, current controlled same-owner state, options cancellation once and fresh retry, retained labels/renderers and all named actual verification plus root/cold SOURCE approval. Local compilation, visible buttons, computed styles, synthetic legacy dispatch or the previous four passes alone are insufficient.

STOP for full baseline/history/hash mismatch, unexpected source outside the exact regions, label CSS/order/ownership changes, new stacking context or arbitrary fixed maximum layer, semantic/Core/Model/lifecycle/port change, private state/fake event/CSS masking, lost canReconnectEdge/ARIA/keyboard/event route, no exact center hit, invalid expected capture promise, changed controlled snapshot, missing/falsely doubled reconnect terminal/proposal, an overlapping unrelated higher-z target requiring a new global priority rule, substantive failed gate, renderer/type requirement beyond this patch, ownership/port conflict or absent shared release. Preserve actual raw result and complete failure freeze, clean only actual owned groups, and obtain a concrete reviewed successor. Do not retry with alternate ports/coordinates/timeouts/tolerances or weaken assertions.

Future label, edge-order, custom-renderer, reconnect-handle and node-layer changes must preserve the noninteractive parent and per-edge child policy. Controls can intentionally remain below unrelated higher user-z elements. Broad fractional/extreme-z behavior, overlap priority, target-origin/click/keyboard eligibility, fullCSS074 and whole handle-library parity stay separate. No moving086 overlay or canonical-schema resolution is authorized here.

## Audit limitations

The author used improve Architecture/Correctness/Test Coverage/Finding format, plan template/closing loop, standards, TypeScript/type-system and writing guidance. Repository and dependency content were data. No secret values were reproduced. Only read/search/hash and this single plans write ran; no source, install/build/compiler/product probe, test, gate, browser/server/port, Git mutation, executor or additional agent ran. Proposed test code and renderer patches are uncompiled/unexecuted. Source-based stacking reasoning requires the specified future trusted verification and fresh design review. No collector or upstream paired runtime proof occurred.

## Conformity and deviations

Conforming target: real public Foldkit reconnection controls receive trusted input, preserve current accepted geometry/state and route through the existing semantic/lifecycle path; actual mounted candidate/SVG/cancellation/controlled proposal observations are required. Separate noninteractive labels and explicit interactive controls match the compared hosts conceptually, not their exact DOM or proven output.

Intentionally different: HTML reconnect buttons in an independent non-stacking viewport overlay, with the existing edge selected/user-z arithmetic plus one for corresponding controls. Ordinary tested integer levels and equal-level real competing SVGs define this proof boundary. Existing labels, core finite acceptance, deterministic order and unrelated higher-z priorities remain unchanged.

Unverified: all proposed implementation and new cases, reconnect trusted success, remaining native cases, complete twelve-suite/three-archive/focused/root/cold SOURCE acceptance, all original51 and proposed8 native/member cells, full suite, cumulative integration, native devices, CI, performance and collector delivery. Formal SOURCE rounds remain zero. This proposal alone releases no source or shared operation.
