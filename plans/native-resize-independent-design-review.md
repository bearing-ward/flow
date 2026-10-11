# Native resize independent design review

2026-10-02. Verdict: REVISE. This is a cold design review of an unimplemented amendment. It grants no source approval, implementation authorization, member acceptance, or parity claim. No install, build, test, browser, consumer, or verification command was run. The sole086 worktree and shared leases remain with their existing owner.

## Reviewed inputs and ownership

The complete amendment reviewed was `/Volumes/Sync/codex/9-19-26/flow/plans/native-resize-production-amendment.md`, SHA256 `470a57903896adf85843fbe494dd61542bb4f4379f82faac4d2650efb3c63c84`. Binding original086 was `/Volumes/Sync/codex/9-19-26/flow/plans/086-complete-native-parity-acceptance.md`, SHA256 `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f`. Both hashes were checked again immediately before this review was written.

Root and actual isolated candidate HEAD both report `841be137e253cf19c665269eaaa79edc19abf3c3`. Source citations below refer exclusively to the actual isolated candidate `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, including its installed Foldkit files when named. HEAD alone does not identify the assembled dirty candidate. The source hashes recorded below identify the reviewed bytes. The root checkout supplied plans, AGENTS.md, and docs/standards.md only.

Read the improve skill and audit playbook correctness and finding format sections. Applied TypeScript schema/type guidance and writing guidance. Repository content was treated as evidence. No source or other author's plan was edited. This review is the only authored output.

Original086 assembly, protected inputs, capture helper identity, frozen prerequisites, amendments, gates, and failure history remain binding. The original proposal SHA256 `3fe6bf00a69e4c50efc0b2562b78a01e2668e58e95ed58282f5f9657f3041c3a`, reported native log SHA256 `77d39a5a814cde7ecb5f70526d493d047757999f0bbbfea348d828b89c5c1171`, and reported timelines SHA256 `f302cf124565daf27b5512fa41be491bf059a65342039bf015e6db965080c367` remain receipts from the amendment. This review did not reopen or revalidate those runtime artifacts. Every prior failed gate and proposal revision must remain; a design revision cannot replace failed proof. Max two formal source-review revisions does not cap mechanical gate diagnosis. Original focused/full, packed consumer, HMR, release, docs, traces, reconciliation, final quality, and evidence freeze are still required.

## Production and test paths personally checked

The browser conformance adapter loads `/test.html`, imports the real harness, and invokes mount at `apps/foldkit/e2e/conformance.ts:22`. The harness acquires the actual owned canvas and constructs the real native observer at `apps/foldkit/e2e/test-harness.ts:496`; its onMeasure sends `HostAction.MeasureNode` at `:523`. The origin fixture independently constructs the observer and synchronously submits actual geometry at `apps/foldkit/e2e/origin-connection-fixture.ts:296` and `:312`. Its existing held REGISTER response seam is at `:274` and `:285`. These paths differ from direct reducer-unit delivery and must retain separate evidence.

The production demo creates the same observer at `apps/foldkit/src/main.ts:574`, sends native samples through the real action port at `:578`, and wires the manual refresher to `measurementObserver.measure` at `:596` and `:606`. `packages/foldkit/src/update-node-internals.ts:49` schedules its flush with requestAnimationFrame; `:71` maps false from measure to the existing failed result. Suppression therefore must return false, rather than invent a successful cached sample or measurement response.

`packages/foldkit/src/application.ts:1113` routes the public measurement action through Graph. `packages/foldkit/src/graph.ts:2304` accepts a submitted sample when its generation equals the current issued generation. Application reports measured from the accepted record and internal status at `application.ts:1122`; it does not certify that the DOM sample belonged to the currently accepted document size. A genuine old physical sample accepted under the current generation is an obsolete measurement problem, not necessarily a fabricated response. Keep this distinction.

Keyboard session currently stores node/direction/delta at `graph.ts:220`; repeated same-node/same-direction accumulation is at `:2530`. Finish recomputes size and position from current measured graph/document at `:2567` and `:2572`. Keyboard preview uses current dimensions and node position at `:3483`. Pointer preview already uses captured position/size at `:3465`. Capturing keyboard position/size once and sharing them between preview and finish addresses that feedback path.

Cancel clears sessions at `graph.ts:2279` while leaving measurements untouched. Preview graph and rendered width/height consume measurement authority at `:3535`, `:3600`, and `:3641`. The proposed producer marker belongs on the keyed node at `:3759`, alongside existing native data attributes, and must remain transient output.

The current post-accepted-document pass at `graph.ts:2622` advances removed-node generations before pruning at `:2640`. Comparing structurally changed accepted sizes here can invalidate only old node records while preserving current generation authority and removal behavior. `packages/core/src/domain/flow-graph.ts:84` gives a positive measured size priority over declared size; absence of the old record supplies the declared fallback at `:89`. This works only until another obsolete same-generation physical sample is accepted.

Observer slot identity/connected ownership is checked at `measurement-observer.ts:94`; measure requires exact active ownership before sequence increment and geometry read at `:165`, `:178`, and `:181`. It sends the real lease generation at `:217`. REGISTER stores acknowledged authority before fallible native acquisition at `:283`, transitions active before observe at `:303`, and then measures current DOM at `:305`. Pending retired slots release the returned actual lease at `:277`. ResizeObserver entries identify the target at `:296`; geometry is read fresh by measure, rather than copied from entry dimensions. MutationObserver currently retires any filtered attribute record at `:371`, reconciles at `:383`, and filters only data-node-id at `:409`. The proposed attribute distinction is necessary and correctly specified.

Keyboard keyup dispatches FinishKeyboardResize at `graph.ts:4836`; blur dispatches cancellation at `:4842`. `application.ts:1629` currently omits keyboard finish from release; active-to-none defaults to cancel at `:1658`. Existing terminal outcome calculation distinguishes controlled proposals, accepted changes, rejected releases, and cancellation at `:1726` through `:1740`. Adding arrow-key finish to release classification corrects the mislabeled terminal path without deriving acceptance from session disappearance.

Keep the existing rejected-bounds detail explicit: `graph.ts:2584` returns noChange(model), leaving the keyboard session active. It must not acquire an invented terminal event merely because FinishKeyboardResize was classified release. Irrelevant key and no-active finish remain no-change at `:2546` and `:2553`. Canonical terminal events are emitted only when the actual before/after session transition and result permit them at `application.ts:1711`. This is a test obligation, not a second design blocker.

## Required revision

### [CORRECTNESS-01] Define native measurement ownership across accepted size and DOM commit

- **Evidence**: Amendment `native-resize-production-amendment.md:43` suppresses only elements whose current transient marker is true. `:45` invalidates old records at accepted size change while preserving generations; its explicit stale-sample ordering case concerns a sample submitted before preview activation. Actual `node_modules/foldkit/dist/runtime/runtime.js:256` updates liveModel at `:271` and then schedules rendering at `:277`; `node_modules/foldkit/dist/runtime/renderer.js:428` patches through a later requestAnimationFrame at `:437`. Actual `update-node-internals.ts:49` can already have a manual measurement frame queued. `graph.ts:2307` accepts its current-generation input, and `core/src/domain/flow-graph.ts:84` lets that physical size override the new declared size.
- **Impact**: Removing an old record does not fence measurement delivery between accepted state change and DOM commit. An external accepted size update, later controlled ACK, or start/finish coalesced before a render can have no marker transition at all. A queued refresh can read old unmarked DOM and reinsert obsolete dimensions before the first render of the accepted size. That can prevent the new declared size from reaching DOM; the settlement-marker measurement cannot repair a marker transition that never occurred.
- **Effort**: M for a bounded revised ordering contract and faithful tests; architecture expansion may increase this estimate.
- **Risk**: HIGH. A fix can affect explicit caller measurement semantics, lease lifetime, native readiness, manual refresh, and ordinary document updates. No transport/core/public change is authorized by this review.
- **Confidence**: HIGH that the proposed producer marker and invalidation alone do not encode this ordering boundary; MED on actual native scheduler reproduction because no browser or runtime probe was run in this review.
- **Fix sketch**: Extend the reviewed design to cover accepted-document-before-DOM-commit sampling and previously submitted samples separately. Identify the actual mechanism that prevents obsolete native geometry from regaining authority until the accepted render commits, including marker-absent-to-marker-absent cases. If an existing real render/port ordering guarantee excludes a timeline, cite its actual path and require a faithful native test. If protection requires a broader path or transport policy, stop and submit the exact narrowly bounded amendment before source implementation.

Required timeline to resolve, using real native/public seams rather than a private model or forged sample:

1. A node has accepted/measured/rendered width150 with its actual current lease and no marker.
2. Queue an ordinary manual refresh through the real native refresher, retaining its scheduled frame.
3. Accept width158 through the ordinary public document update or a later controlled ACK before that queued frame runs. The proposed accepted-size pass removes the old record, retains the issued generation, and schedules DOM rendering.
4. Run the previously queued refresh before the newly scheduled render. It reads physical width150 from unmarked DOM and sends the actual current generation. Distinguish read, action-port submission, application reduction, response, and DOM patch in the evidence.
5. Assert that this sample cannot restore width150 as authority over accepted width158, that the final physical/queried geometry reaches158 through real measurement, and that manual readiness/response status is truthful. Capture any actual stale sample and failure; never change expected size or suppress the negative assertion.

Also cover a keyboard/pointer start and accepted finish before one render, so no transient marker is ever emitted. For submitted-before-acceptance geometry, the host's synchronous onMeasure does not mean synchronous application reduction: installed `node_modules/foldkit/dist/port/port.js:102` offers to a Stream callback queue, while DOM event dispatch uses `renderer.js:159` and the message queue preserves arrival only after enqueue at `runtime/messageQueue.js:23`. A source-backed ordering proof must cross that queue boundary; claiming serialized reduction alone does not settle submission order. The amendment's existing STOP requirement remains applicable to that separate timeline.

Add a distinct pending-registration control: accept the new document size, then let a genuine pending REGISTER acquire its new current generation before the physical patch. `graph.ts:2688` checks the current generation and `:2696` allocates a fresh one; `measurement-observer.ts:283` stores the acknowledged lease, then `:305` immediately measures current physical DOM after native observe. That DOM can still have the old settled dimensions with no transient marker. A newly issued lease therefore does not prove the sample reflects the newly accepted layout. Retain the exact actual REGISTER ACK, physical sample, current authority, application response, and eventual DOM patch. Never manufacture a lease or count registration itself as settled readiness.

The smallest acceptable revision should first specify correlation between a native sample's actually committed layout and current application authority, with native delivery gated or rejected until that correlation is valid. Prefer an existing render-commit mechanism if the actual adapter path can own it. A generation-based alternative must also order registration and native sampling after the corresponding physical commit; advancing generation alone leaves the pending-registration control open. A DOM size fingerprint alone cannot establish freshness when old and new layouts share dimensions or when handle layout differs. Either alternative needs a narrowly reviewed scope if the three named functional paths cannot express it. Explicit caller-owned public MeasureNode remains its separate existing protocol boundary.

## Parts that need no redesign from this review

The captured keyboard baseline, exact marker spelling, active-slot suppression before reads/count/sequence, explicit failed manual refresh, unaffected other slots, structural accepted-size comparison, generation preservation, and current-DOM settlement measurement are coherent within their stated boundaries. Mutation delivery must process identity removals/replacements first, reconcile ownership, and measure each exact current settled active element once using its current marker. Marker start/settle coalescence requires current-state reading, not old mutation-record interpretation. Marker changes never retire/re-register. A pending REGISTER response reads the current marker/current DOM upon genuine activation; retirement stays conditional on its actual lease. Disposal remains closed before cleanup. These details were checked against the actual candidate and should remain in the revision.

The proposed settlement measurement correctly addresses an accepted pointer finish whose physical dimensions already equal the preview, so ResizeObserver need not fire. It also provides a real cancel/refusal baseline measurement after marker removal. Neither establishes the missing marker-absent accepted-size ordering case above. Public caller-owned MeasureNode semantics must remain unchanged unless separately reviewed.

## Source hashes

All SHA256 values below identify personally inspected files under the actual isolated candidate root.

| Path | SHA256 |
| --- | --- |
| packages/foldkit/src/graph.ts | `5fb02b9bbb802f9b3626f8e20b00d41553c3987b3a57278970801a8e15cfcf8d` |
| packages/foldkit/src/measurement-observer.ts | `2c4d09403a7c18c85deb68bbd61beb3b81ada0b14f8cec75963143ebb59c4c44` |
| packages/foldkit/src/application.ts | `a2300ae9dee80fd10a518d49e3c285c080ce74033ef14b645c87337d9978805f` |
| packages/foldkit/src/update-node-internals.ts | `e9aa70d2cd9a9508183d0617d24a562721fbeb3d42f22ad1861d7ba01a6cb897` |
| packages/core/src/domain/flow-graph.ts | `5b229ed00e07ac47d80fcd513a3ab977fc7c7cec6d7c352526cfa7a800a4ad44` |
| packages/core/src/domain/flow-runtime.schema.ts | `c07ddc752122ad207f67a6fed25ef9820decc4a020928ca4a70d6613eb9336d0` |
| apps/foldkit/e2e/conformance.ts | `4a2a4bdc39371896a4559248beec04dcbcab6bd6c6e2748f299a22fe27d86914` |
| apps/foldkit/e2e/test-harness.ts | `734b77dd90a7f9f17aefc7d5804f8fd13422f42a32be1a026f983bba24631d4d` |
| apps/foldkit/e2e/origin-connection-fixture.ts | `528bd0f8388e54af28632b0e1610d589625462861951e2f5e68f9cc24ade7f40` |
| apps/foldkit/src/main.ts | `b77173542bb1ea87f49b84e9cb8bae7576f1d01c7912d25533aecf385471591c` |
| node_modules/foldkit/dist/runtime/runtime.js | `d1afbbe2ed1572df14b64a83c3b2a6ba5237e6ff848730ddd4299bcd28d9fefc` |
| node_modules/foldkit/dist/runtime/renderer.js | `d91150044207cebf4f1f3c4fec3791b23a36051c2ced8eacf97827ef796eb37e` |
| node_modules/foldkit/dist/runtime/messageQueue.js | `eea7d798f6b9f489e10b6e2682ddc600e1064b542346282edb65c910a045ac96` |
| node_modules/foldkit/dist/port/port.js | `ebe4b57305d4ea9f6864cdbefd91528d4a55509615831db8d59aafbf7f9801f6` |

## Conformity and deviations

- Conforming design constraints: authoritative Schema-derived keyboard capture, existing core-issued generation authority, conditional release of actual late leases, truthful manual failure and real current-DOM measurement. This is architectural/source review only, not native reference parity proof.
- Intentionally different proposed native boundary: suppress transient resize DOM measurements while retaining registration and genuine baseline authority. The reason is to prevent preview feedback and rollback contamination. The required boundary is real observer/browser action delivery, with direct reducer units recorded separately.
- Unverified: accepted-size-to-DOM-commit ordering, already-submitted sample ordering, all actual resize rows and canonical terminal event outputs after implementation. The required revised design and native tests must settle these without fake ACKs or private state injection. Existing bounds rejection retains an active session; irrelevant/no-active keyup must not invent a terminal event.
- Unverified acceptance: no focused/full/consumer/HMR/release/docs/traces/member/reconciliation/final-freeze gate ran here. No member or whole-library parity status changes. Primary must independently recheck this finding and all reviewed hashes, approve a complete bounded revision, and retain every earlier failure before sole086 source execution resumes.
