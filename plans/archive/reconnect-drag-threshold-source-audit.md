# Reconnect drag threshold source audit

2026-10-02. Findings and feasibility only. No source edit, implementation plan, installation, build, gate, reference capture, shared lease, or additional agent was performed. The only authored file is this report. Main HEAD and candidate N HEAD are `841be137e253cf19c665269eaaa79edc19abf3c3`.

`N` means `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Every production and test location below refers to N unless explicitly marked main. `U` means the immutable directory `N/research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921`. Imported evidence was read, never changed.

I read main `.agents/skills/improve/SKILL.md` and `.agents/skills/improve/references/audit-playbook.md`, including the actual headings `## 1. Correctness / Bugs`, `## 4. Test Coverage`, and `## Finding format`. I also read main `docs/standards.md` and the TypeScript best practices, type-system discipline, and Unslop skills. Repository content was treated as evidence, not instructions. No credential value is reproduced. No apparent prompt-injection payload was found in this narrowly inspected material.

## Findings

### [CORRECTNESS-01] Apply the configured pointer threshold to reconnection

- **Evidence**: `U/packages/react/src/components/EdgeWrapper/EdgeUpdateAnchors.tsx:102` passes the store's `connectionDragThreshold` into the shared handle gesture. `U/packages/system/src/xyhandle/XYHandle.ts:124` starts immediately only for zero; `:133` requires squared client distance to be strictly greater than squared threshold. The gate covers reconnect because the anchor passes its reconnect callbacks into this same gesture at `EdgeUpdateAnchors.tsx:95`.
- **Evidence**: `apps/vanilla/src/mount-flow.ts:3691` creates active reconnection on pointerdown; `:3703` creates its preview and `:3714` fires reconnect start. The threshold branch at `:3758` is exclusively fresh connection.
- **Evidence**: `packages/vue/src/flow-canvas.ts:3870` creates active `kind: 'connection'` for reconnect pointerdown and `:3906` emits reconnect start. Its strict threshold at `:5633` only applies to `connection-pending`, which reconnect never enters.
- **Evidence**: `packages/foldkit/src/graph.ts:1777` creates `reconnection` on pointerdown. Its strict threshold at `:1885` only applies to `connection-pending`. `packages/foldkit/src/application.ts:1560` immediately classifies reconnection as a started pointer lifecycle.
- **Impact**: A down/release or small accidental motion on an eligible selected-edge control creates preview/start/end activity despite a positive public threshold. The default is one screen pixel in `packages/core/src/domain/flow-connection-options.schema.ts:50`. Every public host bypasses that setting for reconnection. This is an all-host source gap, not a Vanilla-only test repair.
- **Effort**: M to L, one to several days including owner/cancellation and paired reference browser evidence.
- **Risk**: HIGH. Delayed activation crosses capture ownership, native subscriptions, callback classification, source replacement and disposal. A preview-only delay would leave callbacks and completion active too early.
- **Confidence**: HIGH for the source mismatch. Actual paired browser parity remains unverified because this audit ran no browser capture or gates.
- **Fix sketch**: Give pointer reconnection an explicit pending state at positive threshold. Promote only after strict client-pixel distance crossing, using current physical identities and current graph admission. Start the existing reconnect lifecycle once and process that same promoting movement through the existing preview path. Zero threshold keeps immediate activation.

### [TEST-COVERAGE-01] Characterize reconnect threshold behavior through real public owners

- **Evidence**: `apps/vanilla/e2e/canvas.e2e.ts:503` is a reconnect cancellation test. Its candidate addition at `:524` expects no preview immediately after default-threshold down, then moves at `:525`. N's actual reconnect source above still creates preview immediately. The scoped diff shows this addition alongside legitimate pending fresh-connection changes at `:119`.
- **Evidence**: `research/fixtures/interaction-lifecycle.json:242` supplies reconnection completion cases for both endpoints, invalid target and no-op. It specifies no pointer threshold phases. `apps/shared-e2e/interaction-lifecycle-contract.ts:37` imports those cases directly.
- **Evidence**: `research/fixtures/interaction-lifecycle-reference.json:15` contains reference connection, resize, looseConnections, radius and cancellation groups, with no reconnect group. `research/traces/edge-reconnection.md:19` explicitly records the earlier absence of a pinned reconnection browser assertion.
- **Evidence**: `packages/foldkit/src/application.test.ts:1089` tests current reconnect completion admission using separately constructed reducer models. It bypasses public down/capture/pending activation. `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:4788` characterizes fresh-connection pending auto-pan, not reconnect threshold.
- **Impact**: The inherited Vanilla assertion exposes a real mismatch but proves neither reference behavior nor all-host repair. Completion/admission units cannot prove which trusted native control owns capture, whether a down activated too early, or whether a cancelled pending gesture revives on a late move.
- **Effort**: M for meaningful units plus all-host mounted tests; paired reference capture adds its own bounded task.
- **Risk**: MED. Tests can accidentally hide activation errors by moving before asserting, filter out unexpected reconnect events, or mistake graph-space motion for screen-space distance.
- **Confidence**: HIGH for these inspected coverage boundaries; no claim of exhaustive absence across unrelated suites.
- **Fix sketch**: Add independent zero/default/positive-threshold controls and below/exact/above movement phases through both public endpoint controls. Observe canonical reconnect callbacks, public preview and DOM, accepted graph, capture release, cancellation and fresh retry separately. Preserve the failing inherited assertion and its failure receipt rather than reverting it merely to make the current source pass.

The parent reported a focused Vanilla receipt of 225 passed and three failed, including this cancellation assertion. I did not read or reproduce that receipt. It is context from the parent, not a verified result of this audit. Typed cells and aggregate counts establish no particular threshold behavior.

## Pinned public reference path

React edge rendering reaches eligible endpoint anchors through `U/packages/react/src/components/EdgeWrapper/index.tsx:250`. A primary-button anchor down enters `EdgeUpdateAnchors.tsx:44`, selects the opposite fixed physical endpoint at `:107` or `:109`, and calls `XYHandle.onPointerDown` at `:80`. It passes current threshold at `:102`, transform getter at `:100`, and current from-handle getter at `:101`.

`U/packages/system/src/xyhandle/XYHandle.ts:60` records raw event coordinates. After checking bounds and source handle at `:65` and `:69`, it initially holds `connectionStarted = false` at `:63`. Threshold zero calls `startConnection` at `:124`. A positive threshold remains idle through exact equality and activates at `:139` only after `dx² + dy² > threshold²` at `:133`. `startConnection` publishes connection state at `:120` and calls start at `:121`; React's wrapper sets reconnecting and emits reconnect start at `EdgeUpdateAnchors.tsx:74`.

The same promoting movement obtains the current transform and converts client position to renderer coordinates at `XYHandle.ts:147`, selects current handle geometry at `:149`, starts auto-pan at `:156`, validates at `:161`, and updates preview at `:197`. Release at `:207` emits successful connection and terminal callbacks only when `connectionStarted`; reconnect end is inside that guard at `:225`. A release without activation performs cleanup at `:230` without start/end callback. Document mouse/touch listeners are removed at `:237`.

Svelte's actual reconnect anchor chooses the opposite endpoint at `U/packages/svelte/src/lib/components/EdgeReconnectAnchor/EdgeReconnectAnchor.svelte:57`, calls the same XYHandle at `:66`, and passes `dragThreshold ?? store.connectionDragThreshold` at `:103`. Its valid completion updates the store and invokes `onreconnect` at `:93`; reconnect end is forwarded at `:96`. Thus both pinned reference frameworks use the threshold, with different graph-update ownership after completion.

The strict client-distance comparison is independent of zoom. Zoom enters subsequent renderer/handle projection. The audit establishes this source contract, not a measured reference preview/callback receipt.

## Vanilla production and test paths

Public `mountFlow` at `apps/vanilla/src/mount-flow.ts:9634` composes `createFlowHost` at `:1637`. The host owns constructor connection options. The canvas listener routes reconnect controls at `:6451` into `startReconnection` at `:3653`. That function checks primary input, selected edge, allowed endpoint, current control group, and conflicting sessions at `:3664`, then obtains the opposite measured SVG anchor at `:3683`.

It records active core reconnect identity at `:3691`, captures the canvas through FlowBrowser at `:3697`, creates the preview at `:3703`, and invokes start at `:3714`. Preview DOM enters the viewport at `:3403`; the semantic preview snapshot uses the current physical initiator at `:3407` and is published at `:3432`. This is already observable before any movement.

Canvas movement at `:6637` compares raw client distance only for pending fresh connections. Active reconnect enters `:6673`, converts the current pointer to flow space at `:6694`, then updates current measured reconnect preview at `:6698`. Fresh connection auto-pan scheduling is separately guarded at `:6677`; reconnect currently does not share it.

Release at `:7290` verifies pointer ownership, derives current fixed physical identity at `:7302`, resolves current direct/radius target at `:7307`, clears the session/preview/capture at `:7323`, and calls core `reconnectFlowEdge` at `:7327`. Custom validation stays at `:7341`. Core validates the changed edge against the document excluding itself at `packages/core/src/domain/flow-reconnection.schema.ts:70`, retains metadata and the opposite endpoint at `:79`, and returns no change for a same-endpoint drop at `:61`.

Cancellation funnels through `cancelConnectionGestures` at `:4499`, active reconnect clear at `:3602`, and one terminal notification at `:3638`. Document reconciliation cancels removed/hidden/retyped/changed edge participants at `:4526` through `:4590`. Escape and blur reach common cancellation at `:7612` and `:6966`; pointercancel and capture loss enter `:7002` and `:6983`. Host destruction explicitly cancels connection gestures and reconnect at `:8897` and `:8899`.

The fresh connection capture guard in `:6985` checks actual owner target before capture-loss cancellation. Reconnect uses canvas capture and does not enter that guard. A pending reconnect must use an explicit owner, retain it across promotion, and avoid interpreting an old owner's release as a new gesture's loss. Existing canvas capture must not silently become physical-handle capture without a separate reviewed reason and native test.

`apps/vanilla/e2e/canvas.e2e.ts:503` uses actual mouse down, a pre-movement preview assertion, one movement, and a synthetic pointercancel delivered to the canvas. This is a mounted Flow cancellation assertion, not a pinned reference comparison and not a native capture-loss proof.

## Vue production and test paths

Public `FlowCanvas` at `packages/vue/src/flow-canvas.ts:596` resolves the reactive connection options at `:1223`. Its measured edge controls render at `:5323` and native down calls `startReconnection` at `:5336`. Start resolves accepted edge endpoints and measured handles at `:3823`, checks selected/reconnectable/control/session eligibility at `:3835`, and computes measured fixed anchor at `:3854`.

The new session at `:3870` is active immediately. Pointer coordinates use current canvas frame and viewport at `:3878`. Reconnect identity and a declaration signature are retained at `:3884`. Lifecycle identity is set at `:3899`, start callback fires at `:3906`, and the actual SVG anchor owns capture at `:3919`. The render function includes only active `connection` sessions at `:5677`; it builds preview DOM at `:5702`, then includes it in viewport-transformed SVG at `:6088` and `:6099`.

The pending fresh path at `:5619` compares raw client deltas at `:5628` using strict equality exclusion at `:5633`. Promotion at `:5644` currently initializes a fresh-connect lifecycle at `:5648` and logs connection start at `:5661`. Merely putting reconnect into that existing pending kind without adapting this logic would mislabel callback and telemetry. Movement at `:5908` applies current auto-pan/viewport conversion and emits reconnect progress according to retained reconnect identity at `:5931`.

Release at `:4131` clears fresh pending without completion at `:4142`, or routes active connection through `finishConnection` at `:4148`. Reconnect completion at `:3776` resolves current target and validates current boundary admission at `:3273`, calls core at `:3280`, publishes a proposal/accepted change at `:3294`, and terminates through `endConnectionLifecycle` at `:3305`. The second terminal call in the caller is a harmless no-op because `endConnectionLifecycle` clears its identity before emitting at `:1791`.

Cleanup owns capture release at `:2562` and conditionally clears only the same active session at `:2566`. Synchronous declaration watches at `:2586` include pending connection in removal/kind/signature cancellation at `:2682`. Origin acknowledgement cancellation includes pending at `:3526`. Current mode/radius/auto-pan replacement cancellation at `:4430` only admits active `connection`, so a new pending reconnect must be deliberately covered there. Pointercancel and actual owner capture loss route through `:6059` and `:6072`; unmount runs cleanup at `:5615`.

Vue can retain reactive option changes; Vanilla and Foldkit expose constructor-only connection options according to `plans/archive/native-creation-option-test-boundary.md`. Fresh remounts do not prove Vue-style live updates. Existing public integration paths must cover pending reconnect without changing those supported APIs.

## Foldkit production and test paths

Public `createProgram` at `packages/foldkit/src/application.ts:2790` eagerly resolves/snapshots options at `:2818`. Selected-edge buttons are native controls at `packages/foldkit/src/graph.ts:3532`. They retain physical edge/endpoint data at `:3554` and use a separate `ActivateReconnect` keyboard route at `:3563`.

The canvas native pointer mapper at `:4127` requires primary input and this exact nearest canvas. `beginPointer` at `:2930` reads target identity at `:2958`, computes the canvas/viewport projection at `:2966`, and returns canonical PointerDown for reconnect at `:2970`. The reducer checks current edge reconnectability at `:1769` and creates active `reconnection` at `:1777`. Client start coordinates are retained; current position uses actual viewport/frame at `:1783`.

`previewSession` at `:929` admits active reconnection immediately. `currentPhysicalPreview` at `:944` rebuilds graph from accepted measurements and physical endpoint identity at `:946`; `connectionPreviewState` at `:3312` builds detached preview and graph admission at `:3331`. The native view emits preview DOM at `:4025` through `:4073`. `application.ts:1560` maps active pointer reconnect to its start span; `:1747` observes before/after lifecycle and emits start once.

The pointermove subscription at `graph.ts:4745` handles reconnection, maps actual current flow coordinates at `:4759`, and supplies zero reconnection auto-pan delta at `:4776`. `ConnectionPointerMoved` checks pointer identity and variants at `:1871`; only fresh `connection-pending` crosses the threshold at `:1881`. Current active reconnect simply updates flow coordinates at `:1904`.

Pointerup is a document subscription at `:4578`. Active reconnect obtains current fixed physical identity at `:4600` and resolves a current physical target at `:4619`. `finishPointer` at `:1439` verifies owner pointer, clears session, requires current `allowedConnectionTargets` admission at `:1487`, and calls core at `:1496`. Accepted document replacement or controlled proposal follows at `:1515`. `application.ts:1790` derives exactly one terminal outcome, and `:1846` emits proposal callback only for actual accepted/proposed pointer reconnect completion.

Native capture has an independent stable subscription at `graph.ts:4500`, separate from viewport/document/measurement-dependent pointer events at `:4526`. Its descriptor at `:4192` omits active/pending fresh phase so promotion preserves the same acquisition. Lookup restricts physical controls to the actual canvas at `:4317`. The WeakMap owner at `:4405` and identity-checked release at `:4414` prevent an old finalizer from releasing a newer owner. A pending reconnect should map to the same reconnect descriptor as active reconnect; adding phase to its descriptor would unnecessarily reacquire/release capture on promotion.

Current owner capture-loss filtering at `:4677` admits active reconnect, and must admit pending reconnect. `PointerCancelled` at `:2331` and `CancelGesture` at `:2347` clear ownership and suppress trailing clicks. Origin participant discovery at `:1019` recognizes active reconnect and must recognize pending identity too. A pending variant must also follow existing document/handle removal and admitted-target setter cancellation. It must never appear in `previewSession`, active telemetry, terminal proposal logic or auto-pan frame admission before promotion.

Tests at `packages/foldkit/src/application.test.ts:1089` are separately constructed reducer completion controls. Existing mounted tests at `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:930`, `:1342`, and `:3288` cover selected controls, cancellation and replacement/unmount retry. These are useful regression boundaries but do not supply a dedicated positive reconnect threshold sequence.

## Feasibility and ownership

The minimum change is feasible in existing host/adapter ownership. It does not need a new graph meaning, public API, persistence field, browser port, dependency or measured-geometry protocol.

Core already owns finite nonnegative threshold Schema/defaults in `packages/core/src/domain/flow-connection-options.schema.ts:20`, stable reconnect meaning in `flow-reconnection.schema.ts:18`, and active interaction ownership in `flow-runtime.schema.ts:150`. The generic core registry recognizes active reconnect only, reports connection preview at `:353`, and semantic reconnect completion at `:413`. `activateFlowInteraction` at `:318` is specifically for pressed node drag. Reusing that API or representing pending reconnect as active core reconnect would incorrectly make an unactivated gesture eligible for semantic completion.

Vanilla already keeps fresh pointer pending outside that core registry at `mount-flow.ts:2595`. A local Schema-derived pending reconnect identity can similarly stay in the app until promotion, then enter the existing active core registry. Browser event coordinates, DOM capture owner, native lifetime and threshold admission belong in the host. Pending ownership must be included in every conflicting-gesture check and terminal cleanup, because the core registry does not own it before promotion.

Vue's reusable adapter belongs in `packages/vue`; Foldkit's native Model Schema belongs in `packages/foldkit`. An explicit pending reconnect variant there is package-owned adapter state. It is not a reason to add browser coordinates/capture elements or native framework models to core. Derive adapter types from their authoritative Schema; preserve exhaustiveness and avoid casts/optional lifecycle flags. A shared pure client-distance helper in core is optional and presently unnecessary. It would widen scope without eliminating the host-specific lifecycle work.

If the eventual design requires the public core interaction registry to own pending reconnect, STOP for a separate core contract review. That alternative requires updates to ownership extraction, transition/outcome Schema, preview/frame/semantic-event projection, exports and registry tests; it is not this audit's minimum recommendation.

Required state behavior is idle to pending to active to terminal. Positive threshold down captures the existing actual owner, records raw client origin and physical reconnect identity, but emits no reconnect start, preview/progress, proposal or end. A pending release/cancel clears owner without reconnect lifecycle callbacks. Strict crossing rechecks selected/reconnectable identity and current measurements/admission, promotes once, emits exactly one start, and renders the current promoting movement. Zero threshold directly enters active state. Active release keeps existing current admission and core semantics. Repeated terminal events and late moves after cancellation cannot recreate pending/active state.

Capture acquisition failure is a browser failure boundary and may log failure; it must not synthesize an unstarted reconnect-end callback. Admission denial must keep its existing reject/no-proposal behavior after genuine activation. Keyboard activation must remain immediate and separate from pointer distance.

Retain existing no-reconnect-auto-pan policy in Vanilla/Foldkit. `plans/archive/native-promoting-move-autopan-amendment.md:26` explicitly preserves that branch. Vue currently permits active reconnect auto-pan at `flow-canvas.ts:5908`. This audit does not authorize normalizing those separate policies. Under every policy, pending reconnect must not pan or schedule active frames.

## Decisions and dependency order

No inspected decision documents justify bypassing the threshold for pointer reconnect. `plans/083-resolve-native-host-blockers.md:59` explicitly records defaults as one screen pixel, and its capture boundary at `:61` retains actual owner/retry/disposal proof. The later auto-pan amendment intentionally protects reconnect's existing zero-delta behavior, not immediate threshold admission.

`plans/archive/native-keyboard-admission-callback-boundary.md:7` intentionally retains Foldkit keyboard completion's cancelled canonical lifecycle and zero onReconnect callback while preserving one semantic change. Threshold work must leave that existing keyboard policy intact; a pointer pending-state change must not turn into callback parity redesign. Keyboard and pointer units/mounted observations remain separate.

Dependencies are: root reviews this finding and authorizes a bounded source scope; active086 finishes its leased evidence work without concurrent edits to shared files; the new implementation records its own candidate baseline and adds meaningful pending/owner tests; host source repair; reference and all-host browser evidence; focused verification with explicit task scope; independent source/evidence review. No draft Plan093 was written. This report does not grant an executor lease or expand086's approved production allowlist.

Candidate findings only use relevant files. No whole-candidate freeze or hash of all dirty paths is required. The main checkout is older and differs from N in these production paths; N-specific line references and hashes must not be applied to main blindly.

## Candidate source allowlist for root review

This is feasibility scope, not edit authorization.

- `apps/vanilla/src/mount-flow.ts`: pending Schema/state, native down/move/release/cancel, owner routing, reconciliation and lifecycle telemetry.
- `packages/vue/src/flow-canvas.ts`: pending adapter variants, promotion-specific reconnect lifecycle, actual owner cleanup and reactive cancellation.
- `packages/foldkit/src/graph.ts`: pending Schema/reducer, preview/participant/capture descriptor/subscription/exhaustive terminal paths.
- `packages/foldkit/src/application.ts`: suppress pending reconnect lifecycle/telemetry and preserve pointer promotion/one-terminal classification.
- Existing host tests: `apps/vanilla/e2e/canvas.e2e.ts`, `apps/vanilla/e2e/interaction-lifecycle.e2e.ts`, `apps/vue/e2e/interaction-lifecycle.e2e.ts`, `apps/foldkit/e2e/interaction-lifecycle.e2e.ts`, `packages/foldkit/src/application.test.ts`; existing public fixture instrumentation only if needed to select constructor threshold and collect canonical callbacks.
- `research/traces/edge-reconnection.md` for additive production/test/evidence classification; `verification.config.json` for the future focused task scope.

Core production, exports, saves, measured-generation protocol, dependencies/locks, imported artifacts and generated research are excluded from the minimum change. Paired reference capture requires an independently reviewed harness/script/fixture scope. Do not hand-edit upstream evidence or claim an existing fresh-connection capture is a reconnect receipt.

## Test matrix for implementation review

| Boundary | Actual inputs | Required observations |
| --- | --- | --- |
| Pinned React and Svelte source/browser | Native down on source and target reconnect control; threshold 0, default 1, positive 8 | Zero activates on down. Positive below/exact is idle. One greater move starts and renders. Unactivated release emits no reconnect lifecycle callback. Record actual callback order/preview DOM, not inferred source parity. |
| All public Flow hosts | Both endpoints, threshold 0/default/8, zoom 0.5 and 2, direct and diagonal client movements | Down/below/equality have no preview/start/progress/proposal/end and unchanged accepted graph/viewport. Strict crossing uses screen pixels, gives one start and current preview on that move. Later moves never restart. |
| Completion/admission | Active admitted/denied target, same endpoint, invalid drop, controlled/uncontrolled | Exactly one terminal per activated gesture. Zero proposal for denied/no-op. Admitted pointer emits one proposal/change; controlled accepted graph changes only on public acknowledgement. Preserve metadata and opposite physical colon-containing identity. |
| Pending cancellation | Release, Escape, blur, pointercancel, actual owner capture loss, edge/node/handle removal, kind replacement, hide/unselect/reconnectability change, origin acknowledgement, owner disposal | No reconnect callbacks before activation; actual owner release/listener drain, no preview/change, late movement/release ignored, healthy public retry succeeds. |
| Owner and ABA | Same pointer id reused after cancel; two actual owners; old/foreign capture-loss event; remove and re-add same edge/control identity | Old owner cannot release/cancel/promote the new gesture. Current loss cancels only its owner. No historical Model or private state injection proves native capture. |
| Promotion continuity | One pending owner followed by strict crossing; current viewport/measurement change; autoPanOnConnect true at edge band | Same owner retained across phase transition. Current projected preview is rendered. No pending panning. Preserve supported active reconnect auto-pan policy per host. |
| Foldkit reducer/lifecycle | Separately constructed pending models plus canonical messages | Below/exact movement preserves Model; wrong pointer and cancelled late move are no-ops. Promotion creates active reconnect once, lifecycle start/progress are reconnect-specific; pending terminal emits no end/proposal. Admission and controlled receipts remain unchanged. |
| Keyboard isolation | Native Enter/Space reconnect start/target activation with positive pointer threshold and click on/off controls | Keyboard never waits for pointer movement. Preserve existing admission, semantic change and intentional Foldkit terminal/proposal count policy. |

Run `bun run verify` with the reviewed focused task scope after implementation, and report exact profile/files/results. Full verification is separate at integration/release and before broad parity claims. No command was executed here. No CI/device/accessibility/performance/collector result follows from this audit.

## Root STOP risks

STOP before source work if root intends to put these edits inside an existing amendment that expressly prohibits reconnect changes, if another active086 worker owns the same files, or if a required test/harness falls outside the approved scope. This report grants no shared lease.

STOP if promotion needs changing keyboard lifecycle policy, widening reconnect auto-pan behavior, adding a public option setter, reworking measured-generation ownership, new persistence fields/dependencies or bypassing current admission. Those are separate decisions. STOP if actual owner continuity cannot be retained with the existing native subscription topology, or if ABA handling needs a broader runtime message identity redesign. Do not add a guessed generation/token to make a native test pass.

Do not weaken the inherited Vanilla pre-movement assertion, timeout or pointer input to conceal the source gap. Preserve parent failure receipts. Do not use semantic cell counts, starts filtered to hide unexpected events, fixture predecoding, reducer injection, or a fresh remount as proof of live same-owner behavior.

Telemetry must reuse `packages/core/src/telemetry/flow-telemetry.ts:17` for reconnect start, `:18` for completion, `:23` for cancellation, and existing edge/endpoint/pointer/input/control/failure attributes. Record lifecycle transitions and capture/decode/semantic/failure boundaries through existing Effect logging. Pending-to-active start is logged once; pointermove/frame loops stay out of logs. No collector delivery claim is possible here.

## Scoped integrity evidence

Before and after SHA256 snapshots were taken for the following N files around this audit's reads. Every listed pair matched. These are scoped file hashes, not a freeze of the active candidate. No source was written. The mistaken initial guessed path `flow-interaction-session.schema.ts` was absent; the actual core owner is `flow-runtime.schema.ts`.

| N file | Before SHA256 | After SHA256 |
| --- | --- | --- |
| `apps/vanilla/src/mount-flow.ts` | `17bf3a5b5fa4d464766bd6c80ea5cce22a3ed100408838af1816d431403604a3` | `17bf3a5b5fa4d464766bd6c80ea5cce22a3ed100408838af1816d431403604a3` |
| `apps/vanilla/src/edge-renderer.ts` | `5b25acf255aa115d701629d9172330f2d905836b763facfcc1407a4f72ada424` | `5b25acf255aa115d701629d9172330f2d905836b763facfcc1407a4f72ada424` |
| `packages/vue/src/flow-canvas.ts` | `b83469953b2bf3d6874528cd9aacd7eddc122abfd19158db610be9a4981580e5` | `b83469953b2bf3d6874528cd9aacd7eddc122abfd19158db610be9a4981580e5` |
| `packages/foldkit/src/application.ts` | `b43a06591d626d8b269b60c75f022045c42aa97e1ed4b8cbd48455e88464a498` | `b43a06591d626d8b269b60c75f022045c42aa97e1ed4b8cbd48455e88464a498` |
| `packages/foldkit/src/graph.ts` | `22706718973cd709c42c428661a27105f9e8cfc0f50f9c34895ac3ce048d209e` | `22706718973cd709c42c428661a27105f9e8cfc0f50f9c34895ac3ce048d209e` |
| `packages/core/src/domain/flow-connection-options.schema.ts` | `a002fd3d18e2101e0b29353625a71f0a2f78261360167fbe09872dc6358c577d` | `a002fd3d18e2101e0b29353625a71f0a2f78261360167fbe09872dc6358c577d` |
| `packages/core/src/domain/flow-connection-preview.schema.ts` | `7850466137a3a809447c4573b6e6033969781d11b7388ce2f6e8824170651d40` | `7850466137a3a809447c4573b6e6033969781d11b7388ce2f6e8824170651d40` |
| `packages/core/src/telemetry/flow-telemetry.ts` | `ec7b617a412ebab74a6a52590161bebe8087ae868e272e3a5357f52f7f3e432d` | `ec7b617a412ebab74a6a52590161bebe8087ae868e272e3a5357f52f7f3e432d` |
| `apps/vanilla/e2e/canvas.e2e.ts` | `5447ce9b2cefbd4edafe65389044ab95aa14424e84b3e3b8b1a70c847eafd44b` | `5447ce9b2cefbd4edafe65389044ab95aa14424e84b3e3b8b1a70c847eafd44b` |

Additional read-end SHA256 snapshots: N `flow-runtime.schema.ts` is `c07ddc752122ad207f67a6fed25ef9820decc4a020928ca4a70d6613eb9336d0`; N `flow-reconnection.schema.ts` is `b1a2b48ed7e520bc8cda868776f1d5873441a7999a5b97973adc489e02530632`. There is no read-start integrity claim for these supplementary files.

Main comparison snapshots, not candidate acceptance: `apps/vanilla/src/mount-flow.ts` `45e16a2a0dd4d54dfc05f4cf88f8b2c83c60475ddd830a7ee591319b357e37cb`; `packages/vue/src/flow-canvas.ts` `186301ee7a582746175f4108c503124588c7bd564768b5676ef6a2e8aaf34321`; `packages/foldkit/src/application.ts` `b81ec51efe2444066104ccfab2e8d3633cce32f86fab30f2b730e97eb19b17f8`; `packages/foldkit/src/graph.ts` `1704a2b3c91b5e8b893a385b8530544925c4b3074921d53f614d239c9d170e4a`. Main lacks the candidate connection-options Schema. Its test/source expectations must not be confused with N's inherited candidate delta.

The SHA256 of this complete report is returned separately to the root agent, avoiding a self-referential in-file hash. The scoped audit did not inspect unrelated persistence, full member inventories, remaining gate failures, entire callbacks parity, or general security/dependency posture.

## Conformity and deviations

- **Conforming source contract**: React and Svelte both send reconnect down through XYHandle's zero/immediate and positive/strict-client-distance gate. Existing Flow fresh pointer connections follow that comparison, but this is not reconnect browser acceptance.
- **Gap, broader parity unverified**: All three N public pointer reconnect paths bypass configured positive threshold. No inspected by-design decision supports that bypass. Current source certainty does not replace paired reference output or all-host test receipts.
- **Intentionally different retained boundaries**: Flow uses Pointer Events and explicit native capture instead of upstream mouse/touch document listeners. Vanilla/Foldkit connection options are constructor snapshots. Existing Vanilla/Foldkit reconnect auto-pan policy stays separate from Vue. Foldkit keyboard reconnect retains its reviewed cancelled canonical lifecycle/zero proposal callback policy while semantic admission/change remains distinct. This proposed pointer repair must not change any of them.
- **Unverified**: Actual repaired source, owner/ABA pending transitions, paired React/Svelte captures, all-host threshold DOM/callback output, focused/full-suite acceptance, original live option-update cells, release/CI/device/screenreader/performance and OTLP collector delivery. This report closes no semantic member cell or aggregate acceptance claim.
