# Native reconnect stacking independent design review

Verdict: REVISE. Cold design review, 2026-10-02, main/candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`.

The proposed layering repair is sound for the reproduced stacking-context obstruction and has a bounded production scope. One existing packed preview assertion contradicts the supported source reconnect semantics. Explicitly authorize its endpoint-aware correction in the amendment before execution; keep its physical-target and untouched-identity requirements. This is a design verdict only. No native, packed, source, focused/full, integration, member,073/074 or broad parity acceptance follows. No source edits, gates, builds, browsers, ports or agents were used. Only this review file was written.

## Inputs and hashes

Main root is `/Volumes/Sync/codex/9-19-26/flow`. Candidate root is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Evidence root is its sibling `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`. Citations below use those root names.

| Root | Personally read input | SHA256 |
| --- | --- | --- |
| Main | `plans/archive/native-reconnect-stacking-amendment.md` | `25facb18a7cfc9a7d744ec847577d05963cddefa7004e5b34b48018d7a22f62e` |
| Candidate | `packages/foldkit/src/style.css` | `e2b463fea0fc40dc79f79a783841851dfee7e1511c827c8b7bc2a5b65827e578` |
| Candidate | `packages/foldkit/src/graph.ts` | `d1e13b9b575550b25f9a8f02f22defb05019a5311864859175cfb5750997bf20` |
| Candidate | `packages/core/src/domain/flow-visibility.schema.ts` | `edacee99f7d41af4c993d57a4b299568c2573a0d5c117596a0ab60687141778d` |
| Candidate | `apps/foldkit/e2e/origin-connection-contract.e2e.ts` | `64fc9e89b2e601c6ba12ca5278571e758c7f007b6be227839301ece206ca155e` |
| Candidate | `scripts/check-packed-consumer.ts` | `c379bc5dfcd2843d4170507cc6aa665a6d8cee32438f2999e1619d71111ea363` |
| Candidate | `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/styles/init.css` | `2458f7ae49969a3eaa04f43af179fec02b28a2453cb693f05ca9b6cb77df1faa` |
| Evidence | `reconnect-both-endpoints.log` | `87ff9379e5da98c74a74d7264d818b78d948e9c9f1ab30b48601929ce9dd755e` |
| Evidence | `consumer-reconnect-both.log` | `f772446e96286e70c5dc0f7f957fc5281e7d4e64506cf6aa42e3f1228a83a6eb` |
| Evidence | `reconnect-hit-ancestor-final.log` | `3e8fbc4a2af516f35e07020cabaa653c0efee120328729469daf740db74e168d` |
| Evidence | `reconnect-hit-ancestor-final.json` | `8a1d183d5faedb6c30f28dee2a49b09aa09cdb142ab7ecb1e6443d8b1b9c56de` |

All stated amendment/source/log/JSON hashes match the actual inputs. The preceding review reads of AGENTS.md, docs/standards.md, the improve skill and its closing-the-loop workflow continue to govern this scoped review. Imported pinned evidence was read without modification. Unrelated main/candidate work was preserved.

## Failure and production layering

`Evidence/reconnect-both-endpoints.log:46-49` records both native endpoint failures. At `:54` and `:86`, the control computes auto but the selected edge hit path owns the center and reconnectStarts is0. `Evidence/consumer-reconnect-both.log:108-112` separately records both archive endpoint failures with auto, starts0 and preview null. Archive installation and real restored correlated sizing appear at `:96-107`; these successes do not establish reconnect success.

The final JSON records the top hit as a same-document, same-owner edge path at `Evidence/reconnect-hit-ancestor-final.json:4-25`, the visible auto button second at `:27-54`, and the physical handle third at `:56-83`. The control ancestor chain has button zIndex1001 at `:230-258`, then passive labels zIndex1 at `:260-287`, then the shared transformed viewport at `:289-316`. The actual hit's SVG ancestor is same-owner and zIndex1000 at `:484-504`, with that same viewport at `:506-533`. This is strong supplied evidence for a stacking-context obstruction, not clipping, opacity, foreign-owner selection or the earlier pointer-events inheritance failure. It is not a reproduction run by this reviewer.

The actual package route agrees:

- Selected/capable endpoints become real source/target buttons at `Candidate/packages/foldkit/src/graph.ts:3417-3447`. Their only inline geometry is left/top at :3437. They still have the original native canvas/readTarget/reducer route inspected in the preceding reconnect review; no event or semantic change is needed for this layer defect.
- Edges receive defaults, stable order, visibility filtering and actual geometry at `graph.ts:3796-3824`. The same effective edge object supplies both controls and labels at `:3831-3845`, and the SVG's existing caller-plus-selected formula at `:3885-3889`.
- Controls/labels render in the full-size labels div after visible edge SVGs and before nodes within the same transformed viewport at `graph.ts:4020-4037`.
- The labels div is positioned with explicit z-index1 at `Candidate/packages/foldkit/src/style.css:242-246`. Its controls have fixed1001 at `:258-265`. A child stacking level cannot escape the labels context to outrank sibling SVG1000.
- Node zIndex remains its own caller value at `graph.ts:3624-3637`. Core orderFlowEdges uses the same effective edge formula and input-index tie break at `Candidate/packages/core/src/domain/flow-visibility.schema.ts:148-160`.

Removing only labels z-index1 leaves its positioned inset geometry and passive pointer behavior intact, allowing positioned descendants to participate in the shared viewport context. Removing fixed control1001 and supplying `String(effectiveEdgeZIndex(edge) + 1)` inline makes each control one level above its own effective edge, including positive caller values exceeding the old constant. A private Foldkit helper may deduplicate the existing label/SVG formula without changing its arithmetic. Do not change core ordering, selection elevation1000, graph geometry or public types.

The important limitation is relative order. A node or edge above the computed control level may intentionally cover it. Negative effective edge/control levels can also sit below ordinary nodes. Tests must calculate the actual effective levels and make reachable fixtures unobstructed; they must not force every supported caller layer to yield globally topmost controls. For occlusion regressions, place a real sibling strictly above the computed control level and retain its hit/paint order. At equal levels, retain the current document-order behavior. Keep stable edge-index ties at equal effective edge levels. This is bounded layering proof, not a general graph stacking redesign.

Pinned `Candidate/research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/styles/init.css:339-347` has a passive full-size label overlay without a fixed z-index. That comparison supports the design choice only; no upstream paint capture or073/074 parity was performed.

## Required amendment correction

The real packed runner's source endpoint cannot pass its retained preview check after stacking is repaired:

1. `Candidate/scripts/check-packed-consumer.ts:700-715` installs the actual public edge `a/out:fixed → b/out:old` with colon IDs and current accepted handles. Both endpoint probes target physical `a/in:next` at `:844-855`.
2. During either probe, `:892-898` requires `during.connectionPreview.candidate?.targetHandle === 'in:next'` unconditionally.
3. For target reconnect, production preview puts the physical hover in targetHandle at `Candidate/packages/foldkit/src/graph.ts:3155-3162`. For source reconnect, it puts that hover in sourceHandle and preserves targetHandle `out:old` at `:3163-3168`. The unconditional packed assertion therefore rejects the correct source preview.
4. The runner's accepted-edge expectation already distinguishes source/target correctly at `scripts/check-packed-consumer.ts:909-924`. Both probes execute and preserve their failures independently at `:939-953`. The first failed reachability log did not reach a successful preview, so it could not expose this additional assertion mismatch.

Revise `Main/plans/native-reconnect-stacking-amendment.md:28-30` to expressly allow correcting this existing packed assertion inside the already named script. Require exact endpoint-aware preview identity, rather than removing or reducing the assertion:

| Reconnected endpoint | Expected candidate source | sourceHandle | target | targetHandle |
| --- | --- | --- | --- | --- |
| source | a | in:next | b | out:old |
| target | a | out:fixed | a | in:next |

Also retain reconnect preview kind, selected endpoint/edge identity, valid=true, exactly one canonical start, actual native center ownership and the existing accepted edge assertions. The browser native file currently checks both real endpoint paths and valid preview at `Candidate/apps/foldkit/e2e/origin-connection-contract.e2e.ts:2805-2813`, `:2986-3015` and exact endpoint-aware accepted identity at `:3016-3044`; adding the same meaningful preview identity is within its stated scope. This is an assertion correction preserving the contract, not permission to change graph normalization or untouched-handle semantics.

## Scope and acceptance boundaries

Once the correction is incorporated and reviewed, production scope should remain only package style.css's two specified z-index removals and graph.ts's control inline elevation plus optional private reuse of the unchanged existing effective edge formula. Test scope remains existing Foldkit origin-connection-contract.e2e.ts and scripts/check-packed-consumer.ts. No additional geometry, core schema/order, reducer/session/validation, capture, measurement, package/dependency, reset stylesheet or public API delta is justified.

The proposed below-zero/default/above-zero/>1001 fixtures, both endpoints, labels and deliberately higher sibling node/edge, stable ties and zoom0.5/2 regressions are appropriate. Assert computed overlay zIndex auto, label/SVG unchanged effective values, control exact+1, auto pointer events, real hit ownership in unobstructed cases, intended occlusion in obstructed cases, and passive labels/pane. Actual label paint order requires paint observation because passive labels are intentionally absent from pointer hit ownership. Retain ordinary connection/selection, every colon identity/result assertion, keyboard/Escape/disposal and original owner matrix.

The packed route is genuine public Runtime/embed/client/observer composition at `Candidate/scripts/check-packed-consumer.ts:610-658`, imports the exported stylesheet at :615, uses public snapshots/current measurements at `:700-718`, and creates no-reset index HTML at `:1436-1442`. Preserve these and all reload/versioned/origin/options/correlated sizing gates. Native and packed hit proof remain distinct.

The supplied measured centers are119.5/0.5 offsets at `Evidence/reconnect-hit-ancestor-final.json:697-716` and `:752-761`, while the recorded path/control locations differ. That remains explicitly outside this repair at `Main/plans/native-reconnect-stacking-amendment.md:32`. Preserve existing measurement/endpoint assertions and stop with exact evidence if interaction then fails; do not adjust coordinates or tolerances to manufacture success.

Copy/hash approved amended inputs and this review into owned receipts before edits; preserve every failed file.088 owns shared browser/build/consumer verification until explicit root lease return. This review does not authorize lease use. Every original086 all-host/native, packed restoration/reconnect, ordinary HMR, focused/full, release/docs/traces/member/reconciliation, final quality/diff/freeze and independent primary/cold source review remains mandatory under amendment :34 and original086. Nothing ran here and no identity/count/state promotion is accepted.

## Conformity and deviations

- Conforming proposed design: actual endpoint controls can outrank their own rendered edge within the same owner; passive labels and caller relative order survive. This requires actual native/packed evidence after the corrected design is approved.
- Intentionally different: Flow retains its current selected-edge1000 formula, stable ordering and framework overlay representation. The repair removes one unnecessary context rather than transplanting upstream graph structure.
- Unverified: repaired stacking/hit behavior, endpoint-aware preview/runtime results, measured endpoint discrepancy, complete073/074/reference layering, all086 gates, integration and broader native/full/library-member parity. Revise the packed proof contract first; this verdict accepts no source execution.
