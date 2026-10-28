# Native reconnect hit amendment independent design review

Verdict: APPROVE. Reviewed 2026-10-02 against main and candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`.

This approves the amendment's one-rule package CSS repair and narrowly related assertions for execution by the existing sole086executor. It does not accept the repaired source, native behavior, packed behavior, Plan086, any member closure, integration, or full library parity. No source edits, builds, installs, runtime verification commands, browser sessions, servers, port operations, or other agents were used in this review. Only this review file was written.

## Exact inputs

Main root is `/Volumes/Sync/codex/9-19-26/flow`. Candidate root is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Evidence root is the candidate's sibling `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`.

These SHA256 values identify the bytes personally read, rather than a commit-only approximation of the dirty candidate:

| Root | Path | SHA256 |
| --- | --- | --- |
| Main | `plans/archive/native-reconnect-hit-amendment.md` | `2859bc4a760a6c2beaf2fb8e44270a3029ef38a1dc22963d81e166c7093f11ff` |
| Main | `plans/086-complete-native-parity-acceptance.md` | `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f` |
| Main | `AGENTS.md` | `ecd02ae0f1afb52141a9dcba2564653fd0857e05a33579eeb4835c9dd1b96e4b` |
| Main | `docs/standards.md` | `900c20dde3c23d173866db1853a8070cb9893bab7687ccb767e57aedb8bfd430` |
| Candidate | `packages/foldkit/src/style.css` | `898b00dc8c85e635747a31e2d96b8d1dab7b20855e3e7e132b8b81d5f394c8a3` |
| Candidate | `packages/foldkit/src/graph.ts` | `d1e13b9b575550b25f9a8f02f22defb05019a5311864859175cfb5750997bf20` |
| Candidate | `packages/core/src/domain/flow-edge.schema.ts` | `a2c5b5e69dbb88b524d01679a4a30742f2fd934f7ecf20fa736c07b47c5a48f1` |
| Candidate | `packages/core/src/domain/flow-reconnection.schema.ts` | `b1a2b48ed7e520bc8cda868776f1d5873441a7999a5b97973adc489e02530632` |
| Candidate | `apps/foldkit/e2e/origin-connection-fixture.ts` | `528bd0f8388e54af28632b0e1610d589625462861951e2f5e68f9cc24ade7f40` |
| Candidate | `apps/foldkit/e2e/origin-connection-contract.e2e.ts` | `8fbd604f5fe859216ba0da0bcf401ebe403cec721db7c8743f6d5088d58748df` |
| Candidate | `scripts/check-packed-consumer.ts` | `002df837e548aa32032d23718c13db5bcf35585b617e0ff580c307fa89a1ed92` |
| Evidence | `foldkit-reconnect-hit.log` | `0bc8c87c48db9cd881858e0441c480ba3f8417778342ce94120ab62ef0ef618c` |
| Evidence | `foldkit-reconnect-hit-receipt.log` | `a20cbb722567730a841e73e78d25d5e14e5094d259ff2eea67edcfed473aa55d` |

The amendment's four pre-repair source/evidence hashes at `plans/archive/native-reconnect-hit-amendment.md:11` match these reads. Main and candidate already contain substantial unrelated work; neither was cleaned or rewritten. The improve skill and its closing-the-loop review workflow were read. This is the requested design review, so their source acceptance gates were inspected, not executed.

## Reproduced boundary and production route

The supplied failure log records the actual native reconnect test failing with missing endpoint ownership and zero reconnect starts at `Evidence/foldkit-reconnect-hit.log:56-65`, then reports one failed and one passed test at `:78-81`. Its passing styled Escape/disposal test at `:45` is a distinct boundary.

The diagnostic rerun records at `Evidence/foldkit-reconnect-hit-receipt.log:50` the actual button rect `{x:443,y:172,width:12,height:12}`, computed `pointerEvents: "none"`, an `elementFromPoint` result containing the transparent edge path with `pointer-events="stroke"`, zero reconnect starts, and accepted handle IDs `child[out:fixed,in:next]` and `other[out:old]`. It then fails the retained endpoint/start assertions at `:58-65`. This is supplied browser evidence, not a browser reproduction run by this reviewer.

The package source explains that receipt without an identity or geometry rewrite:

1. Native browser pointerdown enters the canvas handler at `Candidate/packages/foldkit/src/graph.ts:3990-4014`. Its closest-canvas check requires the actual owner returned by `canvasForModel(model)` before calling `beginPointer`.
2. `readTarget` finds the closest `[data-edge-endpoint]`, decodes the endpoint and complete edge ID, and returns them at `graph.ts:2751-2779`. `beginPointer` admits the interaction control through the native-control exclusion and emits `PointerDown` with that complete identity at `:2825-2864`. It does not split colon IDs.
3. The reducer verifies the edge and endpoint capability and owns the reconnection pointer session at `graph.ts:1683-1716`. Native document pointermove converts through the owned canvas frame at `:4620-4650`; the reducer updates the session at `:1788-1828`.
4. Render geometry resolves explicit physical handles and measured positions at `graph.ts:3022-3050`. Both source and target controls use `geometry.start/end`, remain gated by selection and `canReconnectEdge`, and become real buttons with edge/endpoint data and keyboard activation at `:3417-3447`.
5. The buttons enter `edgeLabels` at `graph.ts:3831` and render inside `.flow-foldkit-edge-labels` at `:4029-4035`. That ancestor explicitly has `pointer-events: none` at `Candidate/packages/foldkit/src/style.css:242-246`. The reconnect rule at `:258-269` has no pointer-events declaration. The receipt confirms the child computes to none despite its z-index. The transparent edge hit path explicitly accepts strokes at `:237-240`.
6. Once a reachable button starts the existing session, preview validation retains the opposite physical handle and validates the intended hover through `reconnectFlowEdge` at `graph.ts:3154-3187`; valid preview output uses the measured hover center at `:3222-3238` and renders actual SVG/path output at `:3901-3949`. Document pointerup reads physical target ownership at `:4453-4495`. Completion calls the same core workflow and applies its edge result at `:1439-1478`.
7. Core explicit-ID selection uses exact handle equality irrespective of default kind at `Candidate/packages/core/src/domain/flow-edge.schema.ts:52-76`. Core reconstruction preserves the untouched resolved ID at `Candidate/packages/core/src/domain/flow-reconnection.schema.ts:54-58` and returns an edge changing only the selected endpoint at `:79-89`. These are source observations, not successful native identity proof.

## Allowed repair and test boundaries

Adding only `pointer-events: auto` to `.flow-foldkit-reconnect-handle` directly overrides the inherited passive value on the intended controls. The shared rule covers both endpoints without enabling the whole overlay. Keep `style.css:242-256` passive, all geometry/z-index rules intact, and the separately approved node border-box declaration at `:125-126` unchanged. No graph, core validation, port, lifecycle, dependency, or application CSS change is justified by this evidence.

The current native test uses the real fixture/public program route, measures accepted handles, reads computed style and `elementFromPoint`, and uses `page.mouse` down/move/up at `Candidate/apps/foldkit/e2e/origin-connection-contract.e2e.ts:2859`. The fixture passes decoded public document/options to the real `createProgram` boundary at `Candidate/apps/foldkit/e2e/origin-connection-fixture.ts:107-108` and `:175-180`. Its retained accepted-snapshot assertion demands `edge:colon`, unchanged `out:fixed`, and changed `in:next` at `origin-connection-contract.e2e.ts:2919-2941`. Those later assertions were not reached in the supplied failure.

The amendment at `Main/plans/native-reconnect-hit-amendment.md:17` requires computed auto and native hit ownership for both source and target controls, plus real canonical start exactly once, valid physical preview and accepted untouched-ID results. Both endpoint checks must use the actual generated DOM under the intended canvas owner, not merely class presence or computed style. Ordinary passive label/pane hits, ordinary selection/connection controls, and the original keyboard, Escape and disposal proofs remain required. Keyboard activation alone cannot close the pointer failure.

The packed extension must stay in the existing `Candidate/scripts/check-packed-consumer.ts`. It already packs actual archives at `:1059-1080`, installs archive dependencies without workspace aliases at `:1174-1202`, and uses a generated native preservation probe importing `@flow/foldkit/style.css` at `:599-604`. The generated `index.html` at `:1272-1278` contains owner sizing and a mount, with no playground reset. Its actual public `Runtime.embed(createProgram(...))`, public snapshot client, and native measurement observer are at `:632-644`; accepted public reads are at `:684-687`. Existing repeated correlated measurement and border-box assertions at `:653-681`, both creation-option probe variants at `:1248-1255`, and real reload runner invocation at `:1293-1300` must remain.

There is currently no reconnect proof in that packed runner. The amendment at `Main/plans/native-reconnect-hit-amendment.md:19` correctly requires extending its genuine consumer to hit a generated reconnect endpoint and inspect the accepted public snapshot through exported package CSS, without reset CSS, synthetic events, private Runtime mutation, or an alternate runner/server policy. A workspace native pass or archive contents alone cannot satisfy that gate.

## Acceptance limits

The new functional production delta is only the single CSS property. Assertion delta is limited to the existing native contract file and packed script under the original086 scope. Preserve all prior failures and input bytes; before editing, the sole executor must copy/hash the complete approved amendment and this review into its owned receipts as required at `Main/plans/native-reconnect-hit-amendment.md:23`. If exact inputs drift or a second production change is needed, return for a precise amendment.

All original gates and ownership rules survive. `Main/plans/086-complete-native-parity-acceptance.md:80-84` requires actual packed consumer, unchanged HMR, selected native proofs, focused `bun run verify`, full verification, release dry run, docs/traces/member/reconciliation, frozen final evidence, primary independent reproduction, and cold source review. This review ran none of those commands and accepts no profile or runtime scope. This CSS amendment cannot promote a member identity, count, or status.

## Conformity and deviations

- Conforming design: the repair keeps graph meaning in core and native rendering in the reusable Foldkit adapter, and enables the existing supported reconnect buttons while preserving passive labels. Both endpoint ownership and accepted public behavior still need the named native and packed tests.
- Intentionally different: Flow retains its owning-canvas event routing, core-issued graph semantics and existing framework reducer/lifecycle. No upstream implementation is transplanted, and no unrelated semantic change is approved.
- Unverified: repaired pointer reachability, both endpoint native behavior, packed no-reset reconnect results, full086 gate closure, integration and every broader library parity claim. The supplied logs establish a failure and explain the proposed repair; they do not establish successful parity.
