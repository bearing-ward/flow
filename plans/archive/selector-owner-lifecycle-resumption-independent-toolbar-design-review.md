# Selector095 independent contextual toolbar design review

2026-10-02. Verdict: **APPROVE the combined DESIGN** consisting of original095, its live-context revision, revised hunk inventory, and contextual toolbar addition with its exact input inventory. This approval resolves the preceding design findings. It does not accept source, execute a gate, close a parent cell or consume a SOURCE revision round. Primary design approval remains required before source dispatch.

Main HEAD inspected remains `841be137e253cf19c665269eaaa79edc19abf3c3`. Both earlier independent REVISE files remain immutable.

## Inspected packet and integrity

I read the complete contextual toolbar addition and its inputs, the original095 and live-context revision, and both preceding reviews. I rechecked the original/revised inventory preservation. I independently read the full actual accepted087 toolbar, complete existing fixture and complete existing browser test, then searched package/app/installed-fixture callers of FlowNodeIdKey and useNodeId again. Accepted087 citations below are rooted at `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`.

The new supplied hashes match:

- `plans/archive/selector-owner-lifecycle-contextual-toolbar-design-addition.md`: `3433961173c7fa812dc35b8d44199c98bfb6d2b4fcdf2a36e5aab9ef998c4963`.
- `plans/selector-owner-lifecycle-contextual-toolbar-design-inputs.json`: `9b94bb17b7c7c51d37db63a801ce1d19eced5654e560a6f3b0633e9768ca324f`.

All three new input paths match both actual accepted087 bytes and that candidate's complete manifest:

| Path | SHA256 |
| --- | --- |
| `packages/vue/src/node-toolbar.ts` | `112514be55ecac458025b58f0e0f45a13910015ded70cd89b577112218726e70` |
| `apps/vue/src/node-toolbar-test.ts` | `4c1b24f96561efac8c821ad63281e0aaf76a431feff5cadf115c3d45554c8de2` |
| `apps/vue/e2e/node-toolbar.e2e.ts` | `597b881ab3366057e5e43056daf229c3d4656fe61d0b17156e9f5a2ec549aab7` |

Original inventory remains `0979be85dce50bf59a8edbb32ab2835ee9261732a5586d42b9be9f0af7eb2821`; revised inventory remains `cf5063a0dc2b2e850c0c2ea8046d470f017b5b045e9769f9010716300b24c403`. Both contain the same 81 historical hunk texts and hashes. The revised instruction correctly imports watch; no historical evidence is changed.

Original independent REVISE remains `762a9beaf2988462baff5e3286971532fc20f671f2133d16ecf238b015f46d3c`; revision REVISE remains `cba738506617218656d8b5ab72734c6dff5e3d679751702aab7a5fc6c5a55d3a`.

No source edit, restore, install, compiler, build, test, verifier, browser or port operation ran. Only this new review file was written. Selected identity checks do not constitute a whole087 reacceptance. No secret values were recorded.

## Findings resolved

The latest addition at `plans/archive/selector-owner-lifecycle-contextual-toolbar-design-addition.md:9` scopes the actual toolbar migration to importing unref and resolving the setup-captured binding inside render, after explicit props.nodeId precedence and before the existing guard. This directly repairs the gap identified in `accepted087:packages/vue/src/node-toolbar.ts:107-121`. Setup remains the injection boundary. Render reads track native ref changes without changing toolbar graph ownership.

The preserved downstream behavior is concrete: graph/node lookup and hidden handling at124-128, selected-count/visibility at131-139, measured anchor calculation at142-149, per-canvas Teleport at152-154, native interaction exclusion classes at159-164, style/attributes and `data-node-toolbar` at167-178. The addition permits no changes to these policies. Missing/invalid context remains a null result; explicit override remains authoritative.

Direct consumer search found no additional raw injection consumer beyond this toolbar and useNodeId in use-flow. The remaining identified entries are the FlowCanvas provider at `accepted087:packages/vue/src/flow-canvas.ts:449-460`, the exported key at `accepted087:packages/vue/src/public.ts:20`, the connection hook useNodeId read at `accepted087:packages/vue/src/use-flow.ts:898`, and the public harness read at `accepted087:apps/vue/src/test-harness.ts:1296`. These are covered by the combined design. Recheck the search before assembly and freeze; an additional required migration is still a STOP.

The public binding union is now described honestly at addition11. Existing string providers remain supported, while raw inject returns the advertised string-or-readonly-ref union. The design does not claim that every direct-inject result remains statically string. useNodeId retains its string/undefined return at call time. Installed declarations must prove string/ref providers and intended readonly behavior without casts or declaration stubs. No second context authority is approved.

Original Finding01 remains resolved by raw setup capture followed by unref inside the computed connection query, with explicit reactive option precedence. The actual provider change remains limited to NodeWithIdContext; `accepted087:packages/vue/src/flow-canvas.ts:4417-4423` keeps its node.id key. Same-scope ref replacement and real node-identity remount are separately asserted. Neither substitutes for the other.

Original Finding02 remains resolved by the watch instruction. The first revision's toolbar finding is resolved by the exact migration, input identities and additive real-runtime proof described above. No remaining blocking design finding was identified within this scope.

## Test and acceptance contract

The added fixture/test paths are realizable using current public composition. Addition15 requires a separate fixture export and separate browser cases. The entire existing fixture export and browser body remain unchanged, including `accepted087:apps/vue/e2e/node-toolbar.e2e.ts:67-71`, which asserts toolbar owners `[0,0,1]`, two distinct targets and target owners `[0,1]`. A new contextual toolbar cannot be inserted into that old fixture and accommodated by changing its assertions.

Addition17 supplies the missing production proof through the real public FlowNodeToolbar beneath a real FlowCanvas custom node with no explicit nodeId. It requires actual output/ID, per-canvas ownership and DOM-relative measured geometry, followed by trusted interaction exclusion, accepted node movement, zoom, selection and cleanup. Separate public provider inputs prove string/ref compatibility, same-scope replacement using setup/unmount counters, conflicting explicit override, missing/invalid context and late work after disposal. These inputs use the exported native context contract and inherit the real canvas composition; private graph/Model writes or fabricated replies remain prohibited.

The existing toolbar fixture's explicit nodeId at `accepted087:apps/vue/src/node-toolbar-test.ts:109-112` remains useful regression evidence for its original behavior, but cannot replace the new contextual case. Addition19 requires installed Vue contextual fallback and override runtime proof plus installed declarations. It also adds `node-toolbar.e2e.ts` to the saved focused Vue scope beside the three original095 owner suites. Root typechecking alone does not prove the corrected toolbar output.

The combined design retains actual `Schema.toCodecJson(ModelSchema)` old/current packet proof, RC116 missing-key semantics and counter rejection/retention tests, selector/equality teardown activity guards, canonical terminal null, callback generation and query baseline contracts. Accepted087 snapshot-client failure/versioned source/tests, Runtime-handle WeakMap ownership, requestVersioned and disposeHandle remain protected. Current086 remains unaccepted and is not an assembly input.

All original local, full-pin provenance/two genuine captures, three native hosts, three installed archives, docs/trace and focused gates remain mandatory. `bun run verify --list` must show the intended scope; `bun run verify` and all required commands must actually exit0 before bounded source acceptance. Full integration additionally requires `bun run verify:full` and `bun run release:dry-run`. Preserve every original assertion and old failure record, including the sole frame generic correction. Primary reproduction and a fresh independent SOURCE review still inspect actual candidate hunks and evidence.

The combined design can proceed to primary approval and isolated source dispatch. Its execution must still STOP on identity drift, inference failure, additional source migration, unapproved functional changes, missing genuine evidence or the defined substantive failure limit. This design approval grants no source exception and does not relax the two SOURCE revision rounds.

## Conformity and deviations

Conforming design targets are detached accepted state, independent owner previews, contextual toolbar fallback, explicit precedence, measured screen-space anchoring, native callbacks and one correlated accepted client. These are approved design contracts; actual runtime conformity remains unverified.

Intentional native differences include readonly-ref context support with an honest injection union, computed/watch scheduling, native subscriptions/disposal and Flow's silent query/context baseline reset compared with pinned React deltas. Preserve complete raw histories and name each comparison boundary. Public same-scope provider replacement and actual keyed remount remain separate evidence.

Unverified are the implementation, Model codec/inference, selector/callback/equality reentrancy, contextual native/installed toolbar output, all original variants, pinned captures and every focused/full/release gate. All 65 groups, 171 members and 513 parent cells remain OPEN.069 integration, CI, devices and collector delivery retain their separate acceptance boundaries. This approval closes design findings only.
