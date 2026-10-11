# Selector095 independent design revision review

2026-10-02. Verdict: **REVISE**. This is a read-only review of the combined original095 and additive revision, not source acceptance. Main HEAD remains `841be137e253cf19c665269eaaa79edc19abf3c3`. The original independent REVISE file was not changed.

The revision resolves the original missing context design decision and corrects the inventory annotation. Its proposed computed provider introduces a concrete regression in another accepted public component. Review and include that consumer migration before dispatch.

## Inputs and integrity

I read the complete original095 again, the complete additive design revision, and the revised inventory. I compared the entire parsed revised inventory against the original rather than inferring preservation from its status text.

- Revision `plans/selector-owner-lifecycle-resumption-design-revision.md` SHA256 is `7365a31852d820bef7c23c04d4f352ee13a1f682d549a06716e16d3453b53095`, as supplied.
- Revised inventory SHA256 is `cf5063a0dc2b2e850c0c2ea8046d470f017b5b045e9769f9010716300b24c403`, as supplied.
- Original inventory remains `0979be85dce50bf59a8edbb32ab2835ee9261732a5586d42b9be9f0af7eb2821`. The only changed existing field is the Vue harness hunk2 assembly instruction, from `shallowRef` to `watch`. All 81 historical hunk bytes, hashes, decisions, accepted identities, reference paths, exclusions and accounting are unchanged. Two additional metadata fields identify the preserved original and new proposed context binding/provider scope.
- Actual accepted087 FlowCanvas SHA256 is `611c202d65f81340790f047c421b5e612791aa035a993df5e5fc1b1a26a01350`, matching both the revised inventory and the actual complete accepted087 manifest entry.
- Original independent review SHA256 remains `762a9beaf2988462baff5e3286971532fc20f671f2133d16ecf238b015f46d3c`.

Accepted087 citations below are rooted at `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`. I searched actual packages, apps and installed fixtures for every direct `FlowNodeIdKey` and `useNodeId` consumer, then opened the affected source myself. No source, dependency, compiler, build, gate, browser or port operation ran. Only this new review file was written.

## Blocking finding

### Correctness-095-R1: Migrate the direct contextual toolbar consumer within reviewed scope

- **Evidence**: The revision at `plans/selector-owner-lifecycle-resumption-design-revision.md:9-13` widens the injection binding and changes the actual NodeWithIdContext provider to a computed readonly ref, while preserving every other FlowCanvas byte. `accepted087:packages/vue/src/node-toolbar.ts:107-121` directly injects `FlowNodeIdKey`, selects `props.nodeId ?? contextualNodeId`, and returns null when `S.is(NodeIdSchema)(nodeId)` fails. The contextual value is never unrefed. The public toolbar is exported at `accepted087:packages/vue/src/public.ts:9`. NodeIdSchema is a branded nonempty string at `accepted087:packages/core/src/domain/flow-values.ts:3`. Neither original095's allowlist at37-41 nor the revised provider-only addition at13 includes `packages/vue/src/node-toolbar.ts`.
- **Impact**: Every FlowNodeToolbar inside a real custom node that relies on node context instead of an explicit nodeId receives a ComputedRef from the revised actual provider. Its string validation fails, so it renders null even when the node is selected and visible. Updating useNodeId cannot repair this direct injection consumer. This is an accepted public behavior regression, not a compiler-only concern.
- **Effort**: S for a narrow reviewed binding read migration and focused regression assertions.
- **Risk**: MED. Preserve explicit nodeId precedence, missing/invalid ID handling, contextual reactivity, visibility, measured anchor geometry, per-canvas target ownership and existing plain-string providers. Exported raw injection consumers also now see a union type; preserving useNodeId's return alone does not imply every raw injection read remains a string.
- **Confidence**: HIGH from the actual provider proposal and actual guard. The changed source was not implemented or executed.
- **Fix sketch**: Add the exact accepted toolbar file/hash and narrowly scoped context resolution/import changes to the design inventory, then require raw binding capture during setup and native unref inside the render/computed read before the existing NodeId guard. Preserve explicit nodeId precedence and every other toolbar path. Alternatively, propose another reviewed binding shape that keeps this direct consumer working; do not silently invent a second context key or lie about the injected type. Recheck every direct injection consumer before freezing that design.

The accepted toolbar SHA256 inspected is `112514be55ecac458025b58f0e0f45a13910015ded70cd89b577112218726e70`.

Required regression evidence must mount the actual public FlowNodeToolbar beneath a real custom node without an explicit nodeId, prove it renders and anchors to that node, and preserve explicit override behavior. The current toolbar fixture supplies an explicit nodeId at `accepted087:apps/vue/src/node-toolbar-test.ts:109-112`; its visibility assertions at `accepted087:apps/vue/e2e/node-toolbar.e2e.ts:23-31` therefore do not establish contextual fallback compatibility. Add a contextual case through reviewed fixture/test paths or the already allowed public-state harness and installed Vue fixture. Include the relevant browser file in the saved focused scope. No private editor/state/Model injection is needed.

## Resolved original findings and retained proof boundaries

Original Finding01 now has a concrete proposed design. Capturing the raw native injection once and unrefing inside the computed query can track same-scope context updates; resolving an explicit reactive nodeId first preserves option precedence. Existing plain-string providers still fit the proposed union, and useNodeId remains a synchronous string/undefined read at each call. The same-scope setup/unmount counters and separate actual node.id-keyed remount tests at revision23-24 distinguish the two lifecycles. No private component export, fake reactive string or second accepted-state authority is necessary. Approval is withheld for the consumer regression above, not because live context is still unspecified.

Original Finding02 is resolved in the revised inventory. The `watch` instruction now agrees with the preserved old diff. Original historical evidence and all assertions stay immutable.

The added actual `Schema.toCodecJson(ModelSchema)` packet tests at revision27 match the real Foldkit runtime restore boundary identified in the original review. The RC116 missing-key mechanism remains plausible. Counterless old packet restoration, nonzero preservation, own undefined/negative/fractional rejection, encode/redecode, graph/viewport retention and saved-v1/accepted-state exclusion still need actual candidate tests and type inference. This review ran neither.

The activity checks and tests after caller selector/equality evaluation at revision25 address the historical reentrancy gap. Final null must remain exactly once; no ordinary delivery may resume after disposal. These cases extend the original observer and native mount evidence. They do not weaken disconnect/connect callback generation, query-reset silence or current snapshot-client tests.

The revised historical observer citation ranges at29 are accurate. The explicit classification at33 correctly distinguishes pinned React query-change deltas from Flow's approved silent baseline reset. Keep full raw histories and compare only the behavior actually shared. A public provider/custom-node composition can prove context; unexported React NodeIdContext or connectionLookup writes cannot.

Protected accepted087 failure/versioned client source, Runtime-handle WeakMap ownership, requestVersioned and disposeHandle remain unchanged design requirements. Current086 is still unaccepted and is not an input. No whole historical overlay is authorized.

## Gates and acceptance

All original local integrity/quality/architecture/type/unit checks, full-pin provenance and two genuine captures, three actual production owner suites, three installed archives, complete focused scope, docs/trace checks and primary plus fresh SOURCE review remain required. The revised context compatibility and reentrancy tests are additional gates. A source implementation must retain each original assertion and the sole frame generic correction.

A design with the reviewed toolbar migration can remain within native framework ownership and use existing Vue dependencies. It needs installed declaration compatibility and real contextual runtime evidence because a typecheck can leave the current toolbar guard compiling while its behavior regresses.

The original 65 groups, 171 members and all 513 parent cells remain OPEN.069 integration and full/release milestones remain required for their respective acceptance boundaries. No dynamic result, source acceptance, parity claim or source revision round follows from this review. User authorization is already present; the missing item is a technical design correction.

## Conformity and deviations

Conforming targets remain accepted snapshot ownership, independent previews, local callbacks, immutable reference evidence and the single accepted correlated client. The additive live context design supports those targets but currently breaks contextual toolbar reads.

Intentional native differences remain computed/watch scheduling, native lifecycle APIs and silent query/context baseline reset. The revision names those differences and preserves reference histories. Same-scope context replacement and actual keyed remount are distinct test boundaries.

Unverified are the corrected combined source, Model JSON restoration/type inference, callback/selector/equality reentrancy, native and installed contextual toolbar behavior, all original native variants, complete pin captures, every focused/full/release gate,069 integration, parent cells, CI/devices and collector delivery. Resolve FindingR1 through a new reviewed design addition before source dispatch.
