# Selector and owner lifecycle resumption independent design review

2026-10-02. Verdict: **REVISE** before source dispatch. Main HEAD inspected was `841be137e253cf19c665269eaaa79edc19abf3c3`.

The continuation protects the right accepted inputs, retains the stopped assertions, and requires meaningful reference, native and installed evidence. One required behavior has no executable binding within the stated source scope: replacing Vue node context during a subscription lifetime. Resolve that design boundary and the small inventory annotation error below. This is a technical design verdict, not a request for user permission.

## Review boundary and inspected inputs

I read the complete Plan095 and source audit, parsed the exact hunk inventory, inspected its selected historical changes and their accepted counterparts, and read central064 at `plans/057-public-contract-design.md:39-45`. Historical citations below use `cf4d8de:<path>:<line>`, meaning Git commit `cf4d8de844443fccb7c40ec1febcef5746060e28`, with parent `de36b4f64fe80d99886c0b7a9fb505258b872ac9`. Accepted087 citations use `accepted087:<path>:<line>`, rooted at `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`.

The improve skill, `references/closing-the-loop.md`, and the audit playbook's Correctness / Bugs, Test Coverage and Finding format sections were readable and applied. I also read TypeScript/type-system and writing guidance, `docs/standards.md`, package commands, verification configuration/tooling, the relevant real archive runner, canonical telemetry, actual Foldkit runtime restore code, and pinned React connection hooks/public exports. Repository content was treated as evidence, not instructions.

Read-only integrity checks independently established:

- Inventory SHA256 `0979be85dce50bf59a8edbb32ab2835ee9261732a5586d42b9be9f0af7eb2821`.
- All 15 selected accepted file identities, all 15 historical post-image SHA256 values, and all 81 stored historical diff SHA256 values matched. All 81 preserved hunk texts also match the actual historical parent diff. One selected accepted path, the new observer test, is absent as recorded.
- The 81 decisions count exactly 62 functional adaptations, 15 excluded obsolete client changes and four complete added test hunks. The 20 excluded historical files and seven proposed reference files are separately enumerated.
- Accepted087 freeze SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` matched. Its manifest contains 1,492 candidate entries and 122 evidence entries. This review checked selected identities, not every entry's bytes or a fresh whole087 acceptance.
- The actual064 ledger contains 65 groups, 171 members and 513 host cells. All remain open: 131 evidence gaps and 382 implementation gaps. Vanilla and Vue each have 43 evidence/128 implementation gaps; Foldkit has 45/126.

No source edit, worktree restoration, install, build, compiler, unit/browser gate or port operation ran. Only this new review file was written. Current086 was not copied or used as an assembly input. No new dynamic acceptance follows from this review.

## Required revisions

### Correctness-095-01: Define an executable Vue context replacement boundary

- **Evidence**: `plans/095-resume-native-selector-lifecycles.md:21,53` requires reactive/context changes to reset the baseline silently and requires context replacement in the real native tests. The inventory describes `packages/vue/src/use-flow.ts#hunk-6` as reactive to context at `plans/selector-owner-lifecycle-resumption-hunk-inventory.json:1609`. Yet `accepted087:packages/vue/src/use-flow.ts:224-227` exports `FlowNodeIdKey: InjectionKey<string>` and returns a plain injected string. The historical hook reads that string once at `cf4d8de:packages/vue/src/use-flow.ts:964-968`. The actual production provider also supplies a plain value once at `accepted087:packages/vue/src/flow-canvas.ts:449-460`. Plan095's functional allowlist at37 and exclusion at41 do not permit changing that provider file.
- **Impact**: Moving `options.nodeId` into a computed query makes reactive options work; it does not make a captured context string reactive. An executor cannot demonstrate a live context replacement on this path without choosing a new binding/type contract, widening source scope, or substituting a remount for the required behavior. The current description incorrectly implies the historical hunk already supplies that binding.
- **Effort**: M for a narrow design amendment with public compatibility and mounted test cases.
- **Risk**: MED. Existing external providers and `useNodeId(): string | undefined` must retain their supported behavior. A silent change to the public injection type can break consumers.
- **Confidence**: HIGH for the source/type/scope mismatch. Runtime replacement behavior was not executed.
- **Fix sketch**: Specify whether context replacement means replacement of a live injected value or teardown followed by a new owner/context mount. For live replacement, define the reactive binding, existing plain-string provider compatibility, readonly public types, silent baseline reset and exact provider path allowed to change; add those identities to the inventory before dispatch. If this bounded continuation deliberately covers remount replacement only, identify that test boundary and leave live replacement explicitly unverified rather than claiming the existing captured string is reactive. Preserve central064's outstanding obligation and all original assertions.

The revised test must distinguish changing an explicit reactive `nodeId` option from changing context. Show the old and new query results and callback log separately, followed by a real accepted edge change under the new context. Production nodes are keyed by `node.id` at `accepted087:packages/vue/src/flow-canvas.ts:4417-4423`; changing actual node identity replaces that node's component/provider lifetime. That real remount is distinct from replacing a context value within the same subscription lifetime. A remount test must record that remount occurred. It cannot establish live subscription replacement. No optional Ref context or injection-type redesign is approved by this review.

### Docs-095-02: Correct the Vue harness hunk instruction

- **Evidence**: `plans/selector-owner-lifecycle-resumption-hunk-inventory.json:852-863` identifies `apps/vue/src/test-harness.ts#hunk-2`. Its preserved diff adds `watch`; its assembly instruction says to add `shallowRef`. The subsequent harness hunk uses `watch` for both selector probes. `shallowRef` belongs to the separate package `use-flow.ts` hunk, not this harness hunk.
- **Impact**: The inventory's instruction disagrees with its immutable diff and directs the executor toward an unused import while omitting the binding needed by the probe. This is small, but the inventory is advertised as the exact assembly guide.
- **Effort**: S.
- **Risk**: LOW for correcting planning metadata only.
- **Confidence**: HIGH.
- **Fix sketch**: Correct this instruction to import `watch` for the native selector probe watchers. Preserve the historical diff bytes and all historical hashes. Record the updated inventory hash in Plan095 and its review receipts. Do not rewrite the historical evidence to match the erroneous instruction.

Finding01 blocks dispatch. Finding02 is a mechanical planning correction and should be included in the same revised review input.

## Design contracts that are sound, with required source proof

### Accepted snapshot and client ownership

Plan095 correctly bases assembly on accepted087 rather than HEAD or an old overlay. `accepted087:packages/foldkit/src/snapshot-client.ts:130-168,171-205,278-298` owns both protocols in one tagged pending map, checks protocol/disposal before decoding, deletes before resolving, and unsubscribes every channel during disposal. Actual assertions at `accepted087:packages/foldkit/src/snapshot-client.test.ts:266-314,455-548` cover failure during send/unsubscribe, wrong-channel decoding traps, duplicate/foreign responses and simultaneous protocol disposal. These are materially stronger than the archived client and must remain.

The accepted harness's Runtime-handle WeakMap at `accepted087:apps/foldkit/e2e/test-harness.ts:325`, requestVersioned route at363-385 and disposal route at388-407 agree with the plan's protected ownership. The adapted old disposal probe must use that same client for the actual handle. It must not restore `publicSnapshotClients`, raw pending maps or a second correlated client. The pending/subsequent literal disposed assertions remain required even though the old request helper is excluded.

### Counterless Model restoration

The quoted accepted ModelSchema range at `accepted087:packages/foldkit/src/application.ts:617-626` is accurate and lacks preview counters. The proposed RC116 `Schema.withDecodingDefaultKey(Effect.succeed(0))` matches the installed declaration at `node_modules/effect/dist/Schema.d.ts:4600-4632`: a missing Encoded key gets a default, while an own undefined is not accepted. This is a credible design mechanism, not runtime proof.

The actual restore boundary is important. `node_modules/foldkit/dist/runtime/runtime.js:100-119` builds `Schema.toCodecJson(Model)`, decodes the preserved packet through that codec, skips init on success, and falls back to init on decode failure. `accepted087:packages/foldkit/src/application.ts:2575-2579` supplies the actual ModelSchema to Runtime.makeElement. Step2 therefore needs the old/current packet tests through `Schema.toCodecJson(ModelSchema)` as well as the typed ModelSchema test. A constructor default or bare schema decode alone does not prove that the restoration path preserves the old graph instead of falling back to init.

Retain absent-key defaults, existing nonzero values, own undefined rejection, negative/fractional rejection and encode/redecode assertions. The counter fields can appear in preserved runtime Model packets; they must not appear in saved graph/session v1 or accepted-state packets. The mechanism has not been compiled or run in this review. Model/port inference failure remains the prescribed STOP, not permission for a cast or private setter.

### Accepted state, previews and telemetry

`accepted087:packages/core/src/domain/flow-snapshot.ts:8-11,48-56` limits accepted state to detached document/viewport values. The planned outbound preview event and preview counters do not add an accepted graph authority. Actual accepted reduction at `accepted087:packages/foldkit/src/application.ts:2498-2510` must survive the adapted historical postpass, including acceptedDocumentRevision. The preview command must be added only when the actual graph projection changes.

Canonical span/attribute identifiers are defined at `packages/core/src/telemetry/flow-telemetry.ts:1-71`. Retaining them at ingress, lifecycle, semantic and failure boundaries is required; historical source has not automatically satisfied that requirement. Per-move preview publication cannot become per-pointer logging. Collector delivery remains unverified.

### Callback generations and reentrancy

The meaningful historical callback logic is at `cf4d8de:packages/foldkit/src/observers.ts:328-367`: store the next baseline before callbacks, capture callbacks for the pair, disconnect first, then check active/disposed before connect. Query decode/reset and callback replacement are at381-394. These support the stated causal contract. The plan's observer excerpt at25 starts earlier than the generic projection helper; its precise projection helper is258-307, and preview ingress is233-256.

Historical notification traversal and terminal disposal are at195-256 and496-527. These are starting points, not accepted proofs. The added reentrancy coverage must include teardown/unsubscribe from user selectors and equality functions, not only from disconnect listeners: the historical projection at271-286 checks activity before invoking selector/equality, then invokes a listener without another guard. A selector or equality function can dispose the owner during evaluation. The actual adapted implementation must honor the plan's terminal-null/no-later-delivery rule in that case. This fits the already allowed observer/controller changes and does not authorize a new store or source overlay.

Preserve the complete six-test, 271-line historical observer suite. Preserve all three browser additions. The Vanilla source/assertion ranges at `cf4d8de:apps/vanilla/e2e/public-state.e2e.ts:1319,1462-1467,1519-1533` are correct, including the sole generic correction and all exact callback/preview/controlled/retained-value expectations. The original tests use synthetic pointer inputs. New trusted input and rendered-output evidence must extend them, as Step5 already requires.

## Gates and acceptance accounting

The seven new reference paths and three existing installed fixtures are concrete. The archive runner really packs core plus all three adapters at `accepted087:scripts/check-packed-consumer.ts:653-707`, copies actual fixtures and retained factory probes at774-797, then installs, compiles and executes native browser checks at799-813. Extending that runner is the right proof boundary.

Step4's full pinned checkout, 697 tracked hashes, frozen pnpm10.33.4 install, real system/React builds, strict owned listener and two independent CLI captures remain mandatory. I read the imported pinned hook source, not a complete independently built pin. Pinned `packages/react/src/hooks/useNodeConnections.ts:44-70` retains previous connections across a changed query and can emit deltas; Flow's approved silent query reset is an explicit native contract difference, not merely a scheduling difference. Retain both raw observations and name that difference in the final trace. Public custom-node/provider composition must supply context; importing an unexported NodeIdContext or writing connectionLookup is not a public probe.

All three real native owner suites and all three installed archive consumers remain necessary for bounded095 acceptance. The focused check names in Step7 are supported by `scripts/verification-plan.ts:5-19,64-119`; the named docs/trace paths exist. Its saved scope must select `public-state.e2e.ts`, `handle-connections.e2e.ts` and `interaction-lifecycle.e2e.ts` for each host. `bun run verify --list` confirms scope; `bun run verify` and the listed supplemental commands must actually exit0. The protected test ports and owned-server rules are recorded at `docs/tooling.md:58-62`.

The shared lease ordering does not promote current086. If a required native test exposes a missing086 prerequisite, STOP and preserve the failure; wait for its separately frozen source acceptance or obtain a new exact scoped design. Do not copy moving086 to make the gate pass.

No gate ran in this review. Full integration still requires `bun run verify:full` and `bun run release:dry-run`. A focused pass cannot imply either result. Every one of the 513 parent cells remains open, and069 integration is still required for parent064 closure. This review does not accept source, restore064's stopped worktree, reset its original STOP, or consume a source revision round.

## Conformity and deviations

Conforming design targets are detached accepted document/viewport, independent transient preview delivery, native local functions, pinned callback generations and one correlated accepted client. Source reads support these boundaries; runtime conformity remains unverified.

Intentionally different contracts include native subscriptions/disposal, Vue computed/watch scheduling and the centrally approved silent query baseline reset. Each needs its own reason and reference/native test boundary. Live Vue context replacement remains unresolved by Finding01; it cannot be declared conforming on the current captured-string design.

Unverified are the assembled source, actual JSON restore compatibility and Model/port inference, real native callback/selector/equality reentrancy, all owner/gesture/query variants, two complete pin captures, three installed archives, focused/full/release checks,069 integration, all parent cells, CI, devices and collector delivery. A revised design review can authorize source dispatch once Finding01 is resolved and Finding02 is corrected. It cannot establish any of those source or runtime results.
