# Native promoting-move auto-pan independent design review

2026-10-02. Verdict: APPROVE, DESIGN only.

Approve the bounded amendment at SHA256 `fbafeec2245aff560489f05c72b4bdafd077ab78488b3f6dc6b9558517020e19`. Its single production predicate expansion addresses the actual first-movement defect and leaves threshold, viewport control, reconnection, frame ownership and lifecycle policy intact. No blocking design findings. This is permission to execute the reviewed amendment, not source acceptance, a passing-gate receipt, member closure or a parity claim.

## Inputs and integrity

The sole candidate is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, abbreviated N below. I read the full amendment, Improve SKILL.md, audit-playbook Finding format, closing-the-loop, `docs/standards.md`, and the TypeScript, type-system discipline and Unslop skills. I independently inspected the cited candidate production/test paths and the actual retained diagnostic JSON. Repository content was treated as evidence, not instructions. No secret values are reproduced.

The four specifically held candidate paths matched their supplied hashes before inspection and after inspection. The amendment and diagnostic also matched before and after inspection.

| Held path | Before and after SHA256 |
| --- | --- |
| N `packages/foldkit/src/graph.ts` | `6b17f513f62c7f5822b4c89bd6e3cd683824003b7c6df40db34470c3cf39a012` |
| N `packages/foldkit/src/application.test.ts` | `a1e07670f257d80a64446186589128885dec0b76b9fe6612d5c01c86c43dba13` |
| N `apps/foldkit/e2e/interaction-lifecycle.e2e.ts` | `7f3a398f4b69fd9cdb6a52bf48dd04d1f023d04b33548edba2da4f6555d9c26a` |
| N `research/traces/connection-auto-pan.md` | `332a2bd1043d202152abaa846db249dd93cd1c2f43338bd28ee7ebffa7a7b8e0` |
| Main `plans/native-promoting-move-autopan-amendment.md` | `fbafeec2245aff560489f05c72b4bdafd077ab78488b3f6dc6b9558517020e19` |
| N sibling `../native-parity-acceptance-evidence/resume-retained-autopan-diagnostic-second.json` | `3d9fdaab4ff4053a97c97ef2fbc3185444d5dc379b54153dc932969f153a85f2` |

Integrity count is 4/4 held source paths, 1/1 diagnostic and 1/1 amendment, each checked twice with zero drift. The candidate as a whole is not a final immutable freeze. The executor may be repairing an unheld packed-script compiler mechanical failure under separate authorization. This review does not hash or approve that repair or all other candidate files. I did not install, build, compile, run tests, start listeners, acquire shared gates, change evidence or edit source. I spawned no agents. The only write is this new main `plans/` report.

## Confirmed diagnosis

### [CORRECTNESS-01] Supply the promoting movement's real edge delta

- Evidence: N `packages/foldkit/src/graph.ts:4775` computes a real delta only for the captured `connection` variant. The same subscription admits `connection-pending` at `:4745`, so its promoting movement currently supplies `{ x: 0, y: 0 }`.
- Evidence: N `packages/foldkit/src/graph.ts:1881` rejects squared screen movement at or below the threshold, then promotes and stores the supplied delta at `:1889`. The frame subscription at `:4935` and frame reducer at `:1912` both require an active connection with a nonzero delta.
- Evidence: The retained diagnostic at `../native-parity-acceptance-evidence/resume-retained-autopan-diagnostic-second.json:216` contains eight first-movement frames with accepted viewport `{ x: 0, y: 0, zoom: 1 }`, one `onConnectStart`, a real preview pointer `{ x: 918, y: 269 }`, and no semantic changes. Its active timeline at `:1397` contains five second-movement frames with viewport x `-15, -30, -45, -60, -75`. `:2119` records no errors.
- Impact: A source-handle drag which crosses the threshold and reaches the edge with one movement creates a connection preview but fails to start panning. It requires another movement despite a nonzero geometric edge delta being available on the promoting movement.
- Effort: S for the predicate; M including the mounted controls and required evidence collection.
- Risk: LOW for the production edit because the existing reducer and frame guards retain authority. Execution acceptance remains broader because timing and cleanup must be observed in the mounted host.
- Confidence: HIGH for the mapper gap, from direct source inspection and retained public browser output. The proposed correction has not been executed in this review.
- Fix sketch: Expand only `pointerSession.kind === 'connection'` to admit `connection-pending` at the existing delta mapper. Preserve reconnection's zero delta and every downstream guard. Keep the original single-movement regression unchanged and add independent controls.

## Production trace

The real mounted entry is the graph canvas's `h.OnPointerDown` at N `packages/foldkit/src/graph.ts:4115`. It accepts a primary-button event only when the nearest canvas is this instance at `:4127`. `beginPointer` reads the actual handle target and owning canvas at `:2958`, then creates canonical `Message.PointerDown` at `:3019`. The reducer creates `connection-pending` for positive thresholds and `connection` for threshold zero at `:1835`, both with initial zero delta.

The pointer subscription projects the current viewport, document, measurements, pointer session and instance into stream dependencies at N `packages/foldkit/src/graph.ts:4539`. Its event mapper captures that session at `:4550`, listens on the document at `:4751`, derives the canvas from the captured instance at `:4755`, and converts the actual event point through the canvas frame/current viewport at `:4763`. `nativeCanvasFrame` includes client border offsets and client dimensions at `:291`; `flowPoint` applies that frame and viewport at `:1540`. These calculations remain untouched.

The failure occurs at N `packages/foldkit/src/graph.ts:4776`, before reduction. The pending capture selects the zero branch. `ConnectionPointerMoved` checks pointer identity and permissible session variants at `:1871`, checks the strict threshold at `:1885`, and promotes at `:1895`. It stores the mapper's supplied delta at `:1898`. The proposed OR predicate changes that one input while leaving promotion authority here.

Once promoted with a nonzero delta, `connectionAutoPan` becomes active only when enabled and uncontrolled at N `packages/foldkit/src/graph.ts:4939`. The installed Foldkit animation helper uses an Effect acquire/release scope and cancels its requested frame on finalization at `node_modules/foldkit/dist/subscription/animationFrame.js:2`; its active dependency is Boolean at `:40`. The frame reducer repeats enabled/uncontrolled/connection/nonzero checks at graph `:1915`, pans via the unchanged core helper at `:1928`, and publishes an accepted viewport replacement at `:1924`/`:721`. Core `selectionAutoPanDelta` still owns the 40-pixel band and constant speed 15 at `packages/core/src/domain/flow-runtime.schema.ts:1174`.

Application composition routes accepted state to the existing publication command at N `packages/foldkit/src/application.ts:1051`. Pending sessions do not produce active lifecycle telemetry at `:1546`; promotion produces one start transition through `foldkitLifecycleEvents` at `:1747` and the ordinary `GraphMessage` fold at `:1924`. The graph renders the accepted viewport transform at N `packages/foldkit/src/graph.ts:4145`. Cancellation clears the matching session at `:2331`, so queued frame messages still encounter the reducer guard. No new high-frequency logs or telemetry schema changes are needed.

Reconnection remains a distinct Schema union variant without `autoPanDelta` at N `packages/foldkit/src/graph.ts:167`. The OR expression must admit exactly the two existing connection variants. It must retain reconnection's zero branch and introduce no cast, widened type, duplicated state or new API.

## Reference and original test boundary

I inspected the immutable pinned file at N `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/xyhandle/XYHandle.ts`. Its `onPointerMove` checks strict greater-than threshold at `:128`, starts the connection at `:139`, updates position at `:148`, and starts auto-pan in that same call at `:156`. The loop at `:81` computes from the latest position, calls `panBy`, then schedules a frame. There is no source-level requirement for a second movement. The existing authored trace's wording "On subsequent movement" does not override that branch; the required additive Foldkit trace should state the same-call ordering explicitly.

The original N test at `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:1854` mounts the public fixture, measures a rendered source handle, delivers one document movement to the measured canvas edge, and asserts the public viewport moves. It delivers cancellation afterward. It contains exactly one `pointermove`. I extracted its entire test text through the next test boundary, including trailing blank separation: 1420 bytes, SHA256 `539e51a2b8256b9c502883d96adbc2c80d74ea9de2e5e9be17fc6bb2f3e28bd7`. It is byte-identical to the same main test body. Preserve this body hash during execution. This review inspected its source and retained failure diagnosis; it did not rerun it.

The diagnostic proves public accepted state and preview delivery for the actual mounted Flow host. Its recorded event has `trusted: false`; this is delivered PointerEvent browser integration, not physical input/device proof. It records `domZoom`, not a full translation measurement, so it does not independently prove post-pan rendered transform alignment. The amendment correctly requires mounted DOM output in the added proof and does not claim a paired executable reference run.

## Test design and achievable implementation

The required unit controls fit existing application-test structure. N `packages/foldkit/src/application.test.ts:985` uses `initialModel`, canonical Graph messages and `Schema.decodeUnknownSync` to construct explicit reducer inputs at `:998`/`:1014`. New controls can use separately constructed Schema-derived models and canonical `ConnectionPointerMoved`/`ConnectionAutoPanFrame`/`PointerCancelled` messages. They must prove model identity or full unchanged state below/at threshold despite a nonzero supplied delta; promotion must store that delta; enabled uncontrolled frames must move the accepted viewport; disabled/controlled frames and frames after cancellation must preserve it. These are reducer proofs, not mapper/browser proofs.

The native controls require no new harness file or private Model. Existing adapter mounting goes through `/test.html`, the ordinary harness module and `mount` at N `apps/foldkit/e2e/conformance.ts:22`; harness `mount` creates the program with fixture control modes at `apps/foldkit/e2e/test-harness.ts:1109`, embeds it at `:1154`, subscribes to real accepted states at `:1161`, and starts genuine native measurement ownership/readiness at `:1186`.

The following execution obligations are concrete and remain mandatory:

1. Place the source's measured center strictly inside the canvas client edge band using existing public `ReplaceViewport` through N `apps/foldkit/e2e/conformance.ts:136` and `test-harness.ts:1425`. Confirm both accepted viewport and DOM translation, then remeasure source/canvas bounds. Use the client frame, including border offsets, rather than a fixed page coordinate.
2. For a positive configured threshold, deliver below-threshold and exact-threshold movements while the pointer stays inside that band. Assert no preview/start and an unchanged accepted viewport over actual frames. Then deliver one greater-than-threshold movement on the same owner and assert promotion, exactly one start, nonzero accepted viewport movement and the corresponding DOM transform. This prevents the non-pan control from passing merely because the pointer was central.
3. Build zero-threshold, disabled auto-pan and controlled-viewport cases independently. Zero threshold must start through its ordinary pointerdown path and pan after one move. Disabled and controlled cases must actually promote and render a preview with one start, then keep the accepted viewport unchanged over actual frames. Preserve the accepted document and semantic change count in each case.
4. For release and cancellation, first prove an active pan, deliver the actual owner event, wait for settled public preview/lifecycle state, and sample the public viewport and DOM over real frames to show no further mutation. Do not read private session state as browser proof.
5. For owner disposal, retain accepted-state collection and use existing real teardown receipts. Harness disposal captures accepted-state counts at `test-harness.ts:1435`; `finishDestroy` observes two actual frames and reports `acceptedStatesAfterDestroy` at `:1442`/`:1454`. Assert zero late accepted-state and semantic publications, absent owned DOM, and retained document correctness. A disposed snapshot request is expected to fail at `:451`; do not invent a successful post-disposal snapshot. Preserve the existing late-event/owner and isolation controls.
6. Keep the original one-move body byte-identical. Select every new authored title in the actual native command scope, with positive executed-case counts. The amendment's instruction to expand precise grep titles prevents cleanup cases from being accidentally omitted by `'auto-pan|auto-pans'`.

These tests are meaningful and achievable within the existing four-path allowance. They must await real accepted state and DOM/native readiness, not fabricated ACKs, timeout increases or a second movement in the original regression. If any control needs another source API, harness edit or changed lifecycle policy, the amendment's STOP condition applies.

## Scope, gates and unresolved admission

The only production change is the one predicate at graph `:4776`. Additive units, additive native cases and the additive trace fit the other three held paths. Original assertions, timeouts, tolerances, compiler/test policy, manifests, lock, exports, schemas, imported artifacts and capture helper stay protected. Original086 `plans/086-complete-native-parity-acceptance.md:17` retains the exact Effect `4.0.0-rc.116`, Foldkit `0.163.0` and Vue `3.5.43` pins; the amendment does not authorize their alteration.

The amendment retains targeted units/native cases, nine rendered-context controls, 24 admission/resize controls, all eight retained Foldkit suites, three actual consumer archives, genuine same-build active and settled HMR, ordinary unchanged HMR, all original quality/architecture/build/type/docs/contracts/catalog/traces/reconciliation gates, exact focused verification, full verification and release milestones. Original086 `:82` requires `bun run verify`, `bun run verify:full` and `bun run release:dry-run`, with strict serial host ownership and complete final records. This approval grants no gate waiver. Report profile and selected browser/check scope separately from full/release results.

Genuine older-build-to-current public Runtime restoration is still a separate unverified admission gate. Same-build HMR and old-shaped Schema units cannot establish it. Amendment `:48` expressly forbids preservation injection, private Models, fake old-module schemas and migration bypass. Its phrase "if the original packet requires it" is not authority to waive a required original admission gate. Before final acceptance, the coordinator must resolve the original contract with a bounded genuine older-build proof or an explicit reviewed contract change. This auto-pan approval closes neither path.

Final freeze, empty owned ports, complete source/evidence manifests, primary reproduction and fresh independent SOURCE approval remain required. I audited the amendment and relevant call paths only. I did not re-audit all protected files, unheld mechanical compiler work, broader member cells, unrelated owners, the complete original candidate diff or any execution gate.

## Conformity and deviations

- Conforming, proposed: The promoting movement will supply the real edge delta and enable pan without a second movement. This matches pinned same-call source behavior. Actual conformity remains unverified until the unchanged regression and added mounted output controls pass.
- Intentionally different: Flow retains Pointer Events, constant 15-pixel velocity in the 40-pixel band, existing reconnection zero-delta behavior and controlled-viewport policy. This amendment repairs event mapping without redesigning those contracts. Their broader parity is not established here.
- Unverified: Implemented source behavior, targeted/full/release gates, paired reference browser output, physical/native-device input, older-build Runtime restoration, whole-member/parent closure, CI and collector delivery. Units will test reducer guards; the existing mounted public path will test mapping, accepted viewport, DOM and teardown. DESIGN approval is limited to that plan and those boundaries.
