# Native render eligibility and handle delivery independent design review

2026-10-02. Verdict: APPROVE DESIGN ONLY. The complete revised design resolves the preceding design counterexample within an explicit adapter boundary. This grants no implementation authorization, source acceptance, member closure, or library parity. No product, compiler, build, test, browser, server, port, formatter, installation, or verification gate was run. Shared gates remain with089. Only the two requested main plans reviews were authored.

## Inputs and evidence boundary

Main and candidate HEAD are `841be137e253cf19c665269eaaa79edc19abf3c3`. Main is `/Volumes/Sync/codex/9-19-26/flow`. All production source citations below refer to the personally inspected dirty candidate `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, abbreviated C. External evidence is its sibling `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`, abbreviated E. HEAD does not identify the assembled source bytes.

Read the complete 150-line amendment and complete primary review, the complete preserved resize amendment and independent REVISE, and original086. These reads were completed through bounded output, including rereads of portions obscured by initial combined-output truncation. I do not claim every inspected source file was read in full: exact cited production bodies, entry points, and installed runtime seams were read personally. Read the full improve skill, closing-the-loop, docs/standards.md, audit playbook sections `## 1. Correctness / Bugs`, `## 4. Test Coverage`, and `## Finding format`, plus TypeScript, type-system, and unslop skills. Repository material was treated as evidence; no secret values were reproduced.

The six main input hashes were independently checked before source inspection and again at report completion:

| Main plans input | SHA256 |
| --- | --- |
| native-render-eligibility-and-handle-delivery-amendment.md | `3b25e3179bfc98b02090fc92a2c4b3cc14d052e7bf025f3e6d8357b744e5b0e4` |
| native-render-eligibility-and-handle-delivery-primary-design-review.md | `108db7b31d27ac9ee4078aab981ceec6b2feaf4a5eb025849c58a7a8729d6b9f` |
| native-resize-production-amendment.md | `470a57903896adf85843fbe494dd61542bb4f4379f82faac4d2650efb3c63c84` |
| native-resize-independent-design-review.md | `d7a1487958921f92d95e3c629255944cd4d3d4837e63da0da202a56fee4e9d95` |
| native-reconnect-admission-amendment.md | `96a566177f272c306517ac228a0d1120b1862aa0fa83c139f59ff40133421909` |
| native-reconnect-admission-primary-design-review.md | `c055fc155fb195c0c080beb59207aa00c20c5a1cc2bf1b7524601c3ef9db6f68` |

E/native-resize-timelines.json hashes to `f302cf124565daf27b5512fa41be491bf059a65342039bf015e6db965080c367`. I parsed all eight rows and inspected their nine phases, accepted/public size, measured size, DOM bounds, response counts, accepted-state counts and terminal outcomes. They retain keyboard feedback150→160→170→190 with accepted150, pointer cancel retaining158 against accepted150, controlled refusals, and accepted keyboard finishes classified cancelled. E/native-resize-clean-server.log hashes to `77d39a5a814cde7ecb5f70526d493d047757999f0bbbfea348d828b89c5c1171`. These are preserved prior diagnostics, not tests performed by this reviewer or acceptance of a repair. The separately read reconnect failure remains independently open.

The preserved post-input unit log hashes to `0f98ea60f27452b9c6e908213378f8ea09f14a80fc427b963f4e21b3703fd847`; its receipt hashes to `add74b1bdffaa24bc6d596c1a3b00454c8a9773b730e7f53553ff85ec0293437`. The log says54 files/806 tests passed. Those pre-amendment units do not settle the native failures or supply final source acceptance. Retain every original failed gate, imported083/085 boundary, amendment, assertion, protected input, and source-review policy.

## Production path and commit ownership

Public `createProgram` supplies the actual nested Model, update and graph view at `packages/foldkit/src/application.ts:2734`. The application view passes `model.graph` through its existing submodel slot at `application.ts:2628`; `application.ts:634` nests `Graph.ModelSchema`. Actual installed `node_modules/foldkit/dist/html/submodel.js:175` derives the boundary from slotId and `:197` invokes the child view with that child Model. Adapter metadata can therefore live in the existing Graph.Model without introducing another document or changing the parent/child handoff.

Installed runtime reduction updates liveModel at `node_modules/foldkit/dist/runtime/runtime.js:271` and then schedules rendering at `:277`. The renderer marks a pending commit at `node_modules/foldkit/dist/runtime/renderer.js:436` and schedules its later rAF at `:437`. I read render/commit.js, commit.d.ts, render/render.js, render.d.ts and render/index.js/.d.ts completely. `render/render.js:17` combines the pending check and callback registration synchronously; `:54` obtains the optional runtime service. `runtime/runtime.js:378` provides that service. This is a real commit wait in runtime commands. An externally forked producer has no proof that it receives that service. The revised design correctly does not rely on an external afterCommit call.

Current native observer `measurement-observer.ts:165` first verifies its exact active slot, then reads physical bounds and zoom at `:181`, handles at `:184`, and sends its actual issued generation at `:217`. REGISTER stores the real acknowledged lease at `:283`, checks ownership, starts RO and immediately measures at `:303`. `graph.ts:2304` currently accepts matching generation alone. The current application response at `application.ts:1122` can infer measured from an existing same-generation cache. These exact paths explain both the old-DOM/current-generation race and the cached-success hazard.

The revised design gates two different moments. The guarded producer reads valid committed epoch/zoom and current transient marker from exact owned DOM before its synchronous physical sample. It cannot know a newer accepted Model from DOM alone. The new action's reduction gate compares instance, current issued generation, current accepted node epoch, current viewport zoom and active resize before folding measurement. Thus an old settled DOM sample can be requested and then truthfully answered stale. Transient or invalid metadata instead returns false without a request, yielding the existing manual failed outcome at `update-node-internals.ts:71`. Neither outcome may be reported as a measured cached success.

This resolves the prior counterexample: after public accepted size150→158 but before patch, old DOM carries the previous epoch; a pending actual REGISTER may have the new generation but still has the old epoch. Both samples fail reduction against the new accepted epoch. A sample captured before acceptance and delivered after acceptance fails the same comparison. A committed zoom sample differs from the current accepted zoom while a transform patch is pending. The later actual epoch/zoom DOM mutation supplies a new sample even when physical size stays equal and RO does not fire. Start/finish coalesced before a render cannot rely on marker history; accepted epoch reconciliation and current-state checks cover that case separately.

## Accepted transitions, schemas and restoration

Current public replacement routes through `application.ts:1105` and `graph.ts:1594`; public commands use `application.ts:1112`, `graph.ts:1643` and `graph.ts:1093`; public edits use `application.ts:2023` and `graph.ts:1644`; approved deletion uses `application.ts:2332` and `graph.ts:1646`. Accepted pointer/keyboard bounds return through Graph.update and its existing postpass at `graph.ts:2623`. `application.ts:995` is the actual Graph.update fold. Lifecycle direct graph assignment at `application.ts:2362` changes registration; viewport-frame assignment at `:2390` changes viewport. Neither bypasses accepted document reconciliation. Versioned snapshot at `application.ts:2007` is read/save only; `graph.ts:549` decodes rather than installs a restored document. Public restore acceptance uses the existing edit/controller/replacement path. Testing replacement alone is insufficient proof for public edits, deletion and actual restored document installation.

Dropping only structurally changed authoritative sizes in the same accepted postpass is appropriate. It preserves genuine generations and unrelated samples, while existing removal retirement and pruning remain intact. `packages/core/src/domain/flow-graph.ts:84` otherwise gives a positive measured size priority over declared size. Current measurement pruning increments revision only when a record disappears at `flow-measurement.schema.ts:228`. The new size invalidation must have the same bounded revision behavior, including simultaneous removals and changed sizes. Controlled refusal is not accepted document change and must preserve cache/epochs; later actual ACK is accepted change and must reconcile once. Application accepted revision remains its content comparison at `application.ts:2580`.

The proposed canonical decimal string is adequate without Number overflow or JSON BigInt serialization. The allocator is private adapter metadata, not a core generation. Implementation proof must reject malformed decimal strings, numeric epochs, leading zeros, negative values, positive-entry epoch0, duplicate node IDs/epochs, missing or foreign entries and entries above lastEpoch through the actual nested Graph/application Model decoder. Empty initialized state may retain lastEpoch0; an issued node entry may not. Preserve monotonic lastEpoch across accepted remove/re-add and ABA, keep unchanged siblings stable, refresh global origin deliberately, and derive recursive postpass results from the previous owner rather than accepting reduced metadata as an allocator reset. Required allocator and model tests must exercise values above Number.MAX_SAFE_INTEGER, exact encoded JSON strings, and one deterministic allocation per changed accepted node, with no duplicate allocation through recursive updates.

The legacy migration is bounded and truthful. Existing keyboard session lacks baseline fields at `graph.ts:220`; current finish recomputes from measurement at `:2567` and preview does so at `:3483`. Making both baseline fields optional for old private JSON, enforcing paired presence, capturing both for every new activation, and cancelling only the uncaptured legacy session avoids inventing a baseline or discarding its accepted graph. Missing native metadata must be initialized from the already restored accepted document on actual update and actual lifecycle prepare/register; present invalid metadata must fail nested decode rather than reset. That normalization may drop only the legacy session target's potentially contaminated sample and preserve its real generation and all unrelated state.

The application must observe normalization before it loses the old session and merge exactly one existing cancelled keyboard terminal before any new start. Current lifecycle generation at `application.ts:1654` compares actual before/after sessions, and the publish command at `:980` owns ordered event delivery. A metadata-only normalization must emit no node-bounds proposal or accepted-state/revision change. Same-build captured sessions and initialized allocator must survive genuine HMR. Installed runtime restored Model skips init at `runtime/runtime.js:114`; malformed preserved JSON still follows its pinned decode-failure/init policy. The design explicitly distinguishes that policy from supported legacy migration.

Ordinary unchanged HMR script proves semantic status restoration at `scripts/check-foldkit-hmr.ts:331` and `:380`; it does not by itself prove the new native allocator or captured resize. The allowed real packed probe already has genuine revision change/second boot/WS flush at `scripts/check-packed-consumer.ts:1170` and `:1214`. Add the native metadata and active/settled same-build resize preservation assertions there through real ports/DOM and genuine runtime preservation. Unit old-JSON decode and mounted normalization remain separate tests. No manufactured preservation packet, private setter, guessed physical measurement, or dispose/reembed substitution is acceptable.

## Automatic observer delivery and compatibility

The current same-size replacement proof explicitly measures through the public native helper before expecting out-replaced at `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:1087`. That is manual proof. Existing MutationObserver only filters data-node-id at `measurement-observer.ts:409`, so same-element handle replacement need not produce an automatic sample. The revised affected-slot set after real DOM patch closes that bounded gap without node registration churn.

Whole-node removal and data-node-id lifetime retirement must happen first, as current removed-node handling does at `measurement-observer.ts:363`; reconciliation then selects exact current active slots. Epoch mutation refreshes its node, committed zoom refreshes owned nodes, and marker settlement refreshes the exact settled node. Handle childList and the listed current physical handle attribute changes refresh only the record target's current owner node, with text targets resolved by parentElement. A pending slot waits for its real ACK and then samples current metadata. Unrelated owner/subtree mutations supply no geometry. CSS-only changes without the specified relevant mutations or node resize remain outside this automatic guarantee.

There is a credible bounded feedback argument, not a guarantee from intent alone. Existing native handle attributes/classes are at `graph.ts:3648`; node style is at `:3766` and viewport transform at `:4025`. Installed `snabbdom/dataset.js:28`, `attributes.js:76`, and `style.js:81` only write changed values; unchanged measurement-only updates do not change accepted epochs. Core duplicate comparison at `flow-measurement.schema.ts:172` keeps unchanged measurements from advancing revision. Actual tests must still count native sends/ACKs, prove bounded mutation delivery and confirm that node position/style during pointer movement is not treated as physical handle change. Existing reporter, retirement, late-ACK, disconnected ownership and teardown fault cases remain mandatory.

The new required-context factory and packet separate guarantees clearly. Preserve the existing plain factory, zoom callback, two-field base request construction and callback annotations. The guarded factory cannot fall back to plain mode when metadata is absent. Current native forwarding sites personally checked are `apps/foldkit/src/main.ts:574`, `apps/foldkit/e2e/origin-connection-fixture.ts:297`, `handle-refresh-fixture.ts:85`, `test-harness.ts:507`, `tests/consumer/foldkit/main.ts:279`, `consumer.typecheck.ts:132`, and generated `scripts/check-packed-consumer.ts:657`. Each new guarded callback must forward its required context to MeasureRenderedNode. Both existing HostAction matches in application must include the additive action. Installed declarations must prove old literal/callback compatibility and new missing-context rejection without casts. Existing direct explicit MeasureNode fixtures remain their deliberately separate caller-owned protocol.

The literal source/test/doc allowlist is adequate for the design as written, including new Schema files and the seven composition files, while preserving opaque update-node-internals facade tests and immutable capture. No existing fake-DOM observer unit was found or assumed. If implementation needs another functional path, public policy, private Model access, or fixture contract, STOP and obtain a separately bounded amendment rather than expanding this approval.

## Required proof and gates

Require current-context reducer units before any native gate. Negative tests must leave accepted graph, measurement state/revision, accepted-document revision, semantic events and readiness untouched, including stale delivery with a valid cached measurement. Exercise missing/current owner, matching and stale generation, epoch and zoom, transient participant versus unrelated node, positive huge decimal allocation, ABA, reordered unchanged siblings and accepted size field transitions.

Real native proof must then use actual port hold and REGISTER seams for captured-before-acceptance delivery, accepted-before-patch old DOM, a new real lease before patch, pending zoom transform, coalesced start/finish, controlled later ACK, and removal/reuse. Read, send, reduction, response and patch must be distinguishable in the receipts. Automatic same-size handle replacement must pass with no manual measure invocation; ID, side, visibility, position, remove/re-add, healthy unrelated owner and transient controls retain genuine ACK correlation. Rerun all eight resize rows and origin/nested child bounds, exact lifecycle outcome ordering, manual failed refresh and healthy retry. Decode-only units, mounted observer tests, actual installed consumer and genuine HMR evidence remain separately labeled.

All original086 commands remain mandatory against the same final candidate: `bun install --frozen-lockfile`, `bun run check`, `bun run check:architecture`, `bun run typecheck`, `bun run test`, `bun run test:consumer`, unchanged `bun run test:foldkit:hmr`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, API member/contract scripts,065 reconciliation, `bun run verify --list`, saved focused `bun run verify`, `bun run verify:full`, `bun run release:dry-run` and `git diff --check`. Only the reviewed active work/check/browser scope may change. No timeout, tolerance, assertion, skip, compiler, dependency, manifest, imported reference or member-policy weakening. No such gate ran in this review. Root must explicitly return the089 lease before086 uses shared resources. Final source review, primary reproduction, records/quality and immutable freeze remain outstanding.

## Inventory and hash checks

E/native-render-eligibility-and-handle-delivery-executable-design-final.receipt.json hashes to `0ac4ed3682cb148048c8481e3afd67b42656606ab1fa4ea8dd345971162b45e1`. I independently hashed every sourceInventory entry against C both before and after source inspection. Twenty-two existing functional/test/doc/config entries match the receipt, and both requested new files are absent. Two owned records already differed at the first check and stayed unchanged through the second check. Preserve that history instead of calling the entire receipt current or source accepted.

| Receipt entry | Actual SHA256 at both checks |
| --- | --- |
| packages/foldkit/src/native-render-context.ts | absent, requested new |
| packages/foldkit/src/native-render-context.test.ts | absent, requested new |
| packages/foldkit/src/graph.ts | `5fb02b9bbb802f9b3626f8e20b00d41553c3987b3a57278970801a8e15cfcf8d` |
| packages/foldkit/src/application.ts | `a2300ae9dee80fd10a518d49e3c285c080ce74033ef14b645c87337d9978805f` |
| packages/foldkit/src/measurement-observer.ts | `2c4d09403a7c18c85deb68bbd61beb3b81ada0b14f8cec75963143ebb59c4c44` |
| packages/foldkit/src/public.ts | `73df026417aeabdd4a47c37aa661176e955274f4762a2c50464308adc17a31d2` |
| apps/foldkit/src/main.ts | `b77173542bb1ea87f49b84e9cb8bae7576f1d01c7912d25533aecf385471591c` |
| apps/foldkit/e2e/origin-connection-fixture.ts | `528bd0f8388e54af28632b0e1610d589625462861951e2f5e68f9cc24ade7f40` |
| apps/foldkit/e2e/handle-refresh-fixture.ts | `dca6e35eaef31712ac52ddfc3cd33370365d5ac835455ab612bc228f44b95346` |
| apps/foldkit/e2e/test-harness.ts | `1952ee7b19acc96a7bd751b73e038ab66a6734a0df2a4bbc96d0fe2b3a07c0b9` |
| tests/consumer/foldkit/main.ts | `a59246daa473c23aa58334bbcdbcfb127afdeae99bae319de508cdbb41da5010` |
| scripts/check-packed-consumer.ts | `66436e67a6a43834d941e8604d226e7b00335d9e25e44361e1feed7ef525b873` |
| tests/consumer/foldkit/consumer.typecheck.ts | `d59459593d62a1903926b84a1ad00e188e815220f41e96848a6b133df9c7bde4` |
| packages/foldkit/src/application.test.ts | `00b77aa7574894268db6028e9ff3a0bc700ca616abedde6d4e4d2fb46de6ef82` |
| packages/foldkit/src/graph-measurement-lifecycle.test.ts | `8ed1ecd3ee81ff63fd1dc0662d6be9272a6f107ba533142764e34e10f330c728` |
| packages/foldkit/src/node-measurement-lifecycle.test.ts | `c6b1162d183a1bc76d966036fd6a29dd5d3e06fa84a88f6b24c49857139f653a` |
| apps/foldkit/e2e/origin-connection-contract.e2e.ts | `e38d89e329a1117e7c283582d9582c1bc2505784d032f23bc9882b0791f3c0e8` |
| apps/foldkit/e2e/interaction-lifecycle.e2e.ts | `2c96e2755100d86c3b20d77c35c1de8c7baff74e59268a3ed248d257f25e57c2` |
| apps/foldkit/e2e/measured-geometry.e2e.ts | `5139c2a36c26e975148636c44f124875cb2909d4075ccbdcbfce60f61d474e81` |
| docs/public-api.md | `df87f9498f7a52d7503f14c2912eb4172794153ea4156f627f207a1e425ee2d5` |
| docs/api-reference.md | `b1e6a54e25cd6a5db9ccff4b2f50eca204139e699de0fc273ac5cf6e7062af3e` |
| research/traces/origin-connection-hosts.md | `9ddd33fd4415337e873b6d644be96dd800b83dd4099ee9a33faace43d87adba3` |
| research/PROGRESS.md | `1537e350beeaeb513fe841a4c76adaf84983359ae7f39ac5d3d77da105ed6a12` |
| verification.config.json | `a275d2b95777447e63fa79fcdf5f67f152a30aa9f9d7b5879244be4eacf92d92` |
| plans/native-parity-acceptance-execution.md | `f08857053a063c1e2ed2848b1980cee552c9d423551cf2d7470f3bcd23d5de81`, differs from receipt `c6185ff071c0aec32b4f4d8be6d696326763264328a29e255a3b3d04a88e5f97` |
| plans/native-parity-acceptance-provenance.json | `403afa9c9e9ee9213a8e8766eeef6a388cc9769e02136766d7ec3fba670a46f8`, differs from receipt `d05b82e0227a827af1d9521165ad8f6071e05360aede80e1e0705895953a82ea` |

The later interim-stopped-source-freeze/manifest.json independently hashes to `f963abb7a37b020c5ddbb41509865de366140f6e0114774774ad023eaaa2c1c2`; its recordHashes identify those current two owned records. This explains the explicit receipt supersession for records only. It is an interim STOPPED inventory, not accepted/final086 source. I did not independently audit all1529 freeze entries. The protected capture helper independently hashes to `7803c8c6510c68c313d249ad0282f92ddc4c02b73ddb0686880dab7ae57bc71c`.

The installed runtime files used for commit/submodel reasoning were also independently hashed:

| Installed path | SHA256 |
| --- | --- |
| node_modules/foldkit/dist/runtime/runtime.js | `d1afbbe2ed1572df14b64a83c3b2a6ba5237e6ff848730ddd4299bcd28d9fefc` |
| node_modules/foldkit/dist/runtime/renderer.js | `d91150044207cebf4f1f3c4fec3791b23a36051c2ced8eacf97827ef796eb37e` |
| node_modules/foldkit/dist/html/submodel.js | `e2f15358a565b585ca167e9c8d46615c6426c0483a80776f0706fca336738c00` |
| node_modules/foldkit/dist/render/commit.js | `56145ebbe5c01a5ab9bf9481e1bd9e7c6ee0acecab8e538244cd0c3fb296f2ac` |
| node_modules/foldkit/dist/render/commit.d.ts | `4d651bdaaddf054a0e56cc43b48f1ced7cc8aa16d2f3abbaeccf386cac843162` |
| node_modules/foldkit/dist/render/render.js | `5bae0d895a86d1b15c59ff993236a4d5f6c438ce8043b83d00f462004aa419eb` |
| node_modules/foldkit/dist/render/render.d.ts | `9d2a9dc7a648656f448181427eccb6f5d689ceff920f44e8fbd675c496218bcc` |
| node_modules/foldkit/dist/render/index.js | `f4cb3012f694be8c5cc0c8ca7c0e6d5c141950812fd6916b217678f098384931` |
| node_modules/foldkit/dist/render/index.d.ts | `8de618c627a20646eef1ff867046560f6420137fed660cb4cb2f2699a53399c6` |

## Conformity and deviations

- Conforming design constraints: Schema-derived adapter metadata; core-owned genuine generation/graph meaning; committed owned physical sampling validated again at reduction; unchanged explicit public MeasureNode; preserved positive baseline and exact accepted document paths. These are source-grounded design conclusions, not reference parity results.
- Intentionally different: guarded native sampling suppresses transient preview and rejects stale representation context; the legacy plain factory retains caller-owned explicit semantics. Bounded native DOM mutation delivery covers the enumerated physical handle mutations, while CSS-only changes without those mutations or resize remain outside its guarantee. These boundaries require real browser observers and ports, with units labeled separately.
- Intentionally different legacy compatibility: preserve accepted private Model state while cancelling only an uncaptured old keyboard resize and dropping only its possibly contaminated target sample. The reason is missing baseline authority. Actual older JSON decode/normalization and genuine same-build captured-session HMR are separate proof obligations; this does not establish general cross-version active-session parity.
- Unverified: implementation, automatic no-manual handle delivery, real stale-sample/rAF/REGISTER/zoom races, all repaired resize outcomes, legacy normalization, same-build native HMR, original focused/full/packed/release gates, final source freeze, primary reproduction, member closure, CI/device/performance/collector delivery. Approval of this design changes none of those statuses. The separate reconnect admission design retains its own independent verdict.
