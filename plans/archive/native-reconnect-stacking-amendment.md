# Native086 reconnect stacking amendment

2026-10-02. Draft for primary and cold design review. No additional source change is authorized by this draft. Sole086executor is local-only while088 owns the strict browser/consumer/build verification lease. Preserve the first approved pointer-events repair and every failed native/packed result.

## Actual failure and source path

Candidate `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, main841be137e253cf19c665269eaaa79edc19abf3c3. First CSS override makes controls compute pointerEvents auto, but both real native endpoint tests and both actual no-reset archive endpoints still hit the selected edge SVG and emit reconnectStarts0. Native log `reconnect-both-endpoints.log` SHA25687ff9379e5da98c74a74d7264d818b78d948e9c9f1ab30b48601929ce9dd755e; packed log `consumer-reconnect-both.log` SHA256f772446e96286e70c5dc0f7f957fc5281e7d4e64506cf6aa42e3f1228a83a6eb. No further production change occurred.

Actual final diagnostic `reconnect-hit-ancestor-final.log` SHA2563e8fbc4a2af516f35e07020cabaa653c0efee120328729469daf740db74e168d and `.json` SHA2568a1d183d5faedb6c30f28dee2a49b09aa09cdb142ab7ecb1e6443d8b1b9c56de live under sibling native-parity-acceptance-evidence. The hit path, control and ancestors belong to the same document and intended canvas owner. elementsFromPoint orders edge path first, visible auto control second, physical handle third. Button computes zIndex1001, rect443/172/12/12; its full-size passive labels ancestor computes zIndex1. The actual selected edge SVG computes zIndex1000. Both share the transformed viewport; clipping/visibility/opacity are not the observed cause.

Primary read the real package CSS and graph routes. `packages/foldkit/src/style.css:242-246` makes the labels container positioned with z-index1, trapping all descendants in that stacking context. The control's1001 cannot outrank its sibling selected SVG1000. `graph.ts:3417-3452` builds real endpoint controls; `:3831` collects them into labels and `:4029-4035` renders that overlay. Existing labels at3843-3845 and edges at3887-3889 both derive their zIndex from `(edge.zIndex ?? 0) + (edge.selected === true ? 1000 : 0)`. Fixed control1001 also cannot stay above its own selected edge for positive caller edge zIndex. Current CSS SHA256e2b463fea0fc40dc79f79a783841851dfee7e1511c827c8b7bc2a5b65827e578; graph SHA256d1e13b9b575550b25f9a8f02f22defb05019a5311864859175cfb5750997bf20.

Pinned source `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/styles/init.css:339-347` keeps its full-size label overlay passive without a fixed z-index. This is source comparison, not a performed upstream paint-order capture or parity claim.

## Alternatives and bounded recommended repair

Raising the whole labels container to a large fixed number would flatten caller label/node/edge layering under another unrelated floor. Moving reconnect controls to another DOM layer adds ownership/layout code without removing the extra label stacking context. Recommend removing the overlay's fixed stacking context and deriving each reconnect control elevation from the same current edge formula.

After approval only:

- In existing `.flow-foldkit-edge-labels`, remove only `z-index: 1`; retain position/inset and pointer-events none. No replacement fixed elevation, transform, isolation or new wrapper. Keep the approved control pointer-events auto and node border-box.
- In existing `.flow-foldkit-reconnect-handle`, remove only fixed `z-index: 1001`; preserve geometry/style. In `packages/foldkit/src/graph.ts`, supply inline control zIndex equal to its own effective edge zIndex plus1. A private function deriving the existing effective edge formula may be reused by the two existing label/edge style expressions and control, without changing that formula. Use existing FlowEdge Schema-derived type; no new core API/schema or invented graph field. Existing selected elevation1000, caller zIndex, stable ordering, coordinates and endpoint validation stay intact.

Control elevation is relative to its own edge, not a guarantee that it outranks every deliberately higher sibling node/edge. Tests must preserve that relative ordering rather than make all controls globally topmost. No graph geometry, reducer/validation/session, event capture, style reset, dependency, measurement or public API change is authorized.

## Required meaningful proofs

Only existing086 Foldkit native origin-connection-contract.e2e.ts and actual packed scripts/check-packed-consumer.ts gain relevant assertions. Preserve both endpoint real pointerdown/move/up, actual elementFromPoint ownership, one canonical reconnect start, valid current physical preview, exact opposite colon-handle identity and accepted changed endpoint assertions. Retain genuine package stylesheet/no reset, correlated measurement/reload/origin/versioned/options assertions and actual public snapshot route. Keyboard/Escape/disposal cannot replace pointer proof.

The existing packed preview assertion at scripts/check-packed-consumer.ts:892-898 incorrectly requires targetHandle `in:next` for both reconnect endpoints. Correct it to assert the complete endpoint-aware candidate for the existing real edge `a/out:fixed → b/out:old` and hovered physical handle `a/in:next`:

| Reconnected endpoint | candidate source | sourceHandle | target | targetHandle |
| --- | --- | --- | --- | --- |
| source | a | in:next | b | out:old |
| target | a | out:fixed | a | in:next |

Explicitly authorize this assertion correction in the existing packed script and add the same complete candidate identity to the existing native endpoint probes. Preserve reconnect kind, selected endpoint and edge identity, valid=true, exactly one canonical start, actual control-center hit ownership, physical hover and accepted-edge identity. Do not remove the preview assertion or normalize the untouched handle. Production semantics already construct these endpoint-aware candidates at graph.ts:3155-3168; the existing accepted packed edge expectations are already endpoint-aware at scripts/check-packed-consumer.ts:909-924.

Add caller zIndex cases below/default/above zero and a value above1001. For both endpoints, own-edge zIndex and control zIndex must have the exact+1 relation; real hit ownership must work where no deliberately higher sibling obstructs it. Check a deliberately higher node/edge retains its own configured order, and equal edge-index ties retain stable order. Existing label's inline effective zIndex must track its own edge rather than the discarded container floor; passive label region must not take pane/edge pointer ownership. Use actual computed style/DOM hit/paint observations and public documents, not a test CSS override or private Runtime setter. Preserve ordinary node/handle/edge selection and healthy connection proofs across zoom0.5/2 and existing ownership/disposal matrix. No general074 stacking acceptance follows from these bounded regressions.

The earlier declared/measured handle endpoint-center versus path endpoint difference is not repaired by this stacking scope. Retain actual measurements and endpoint assertions; stop with evidence if that difference prevents a supported interaction after reachability is fixed. Do not adjust coordinates/tolerances to hide it.

Before edits, copy/hash the complete approved amendment and cold review into owned input receipts, preserving all current failed files and source hashes. Run local quality/types/units while088 owns shared ports; wait for explicit root lease return before native/packed gates. All original086 selected all-host, packed restoration, unchanged ordinary HMR, focused/full verification, release dry run, docs/traces/member/reconciliation, final quality/diff/freeze and primary/cold source acceptance remain mandatory. No cells/identities/counts promote from this repair.

## Conformity and deviations

Conforming proposed target: reachable real endpoint controls, passive labels, relative caller edge elevation and current owner geometry. The native overlay representation remains framework-specific; removing an extra stacking context is supported by actual native failure/source evidence, with pinned CSS similarity only secondary source context. Unverified: repaired native/packed interaction, complete stacking semantics/reference parity, measured endpoint discrepancy, all086 full gates, integration and broader library/member closure. This draft authorizes no source execution.

## Design revision history

The first cold review, native-reconnect-stacking-independent-design-review.md SHA2568a259a0e44be593e8763e9f4d31b56575cfcebe4a4b8ca506669bc54b7f2177b, returned REVISE against draft25facb18a7cfc9a7d744ec847577d05963cddefa7004e5b34b48018d7a22f62e. Its stacking design was sound; its requested endpoint-aware preview correction is incorporated above. Preserve the first review and all failed results. This revised draft still requires cold approval before source execution.

## Primary execution approval

Primary personally read the complete revised design and final cold revision review cf38fa509dc2062fc89423b981ac6fb486c33e8309bf74604317dfe90d3cd6da and verified both review hashes. Approve the exact bounded production/test repair above for the sole086 executor. Native fixture IDs remain child/other, packed a/b; apply the same endpoint-aware identity semantics to each actual fixture. Copy/hash this complete approved packet, both cold reviews and pre-change source/failure receipts before edits.088 still owns shared verification. Local quality/types/units may proceed; no browser/consumer/focused/full/HMR/release gate before explicit root lease return. No source or parity acceptance follows.
