# Selector095 design revision: live native context and exact evidence

2026-10-02. This additive revision is proposed for independent review with complete original095, original hunk inventory0979be85 and cold REVISE. Those originals/failures stay immutable. No source implementation is approved until primary and cold review approve the combined packet.

The first cold review identified that captured string context is not live. Primary independently read accepted087 use-flow224–227 and flow-canvas449–460/4417–4423: the public injection key holds string, useNodeId returns it, the provider captures scopeProps.node.id once, and real nodes are keyed by node.id. A node ID replacement remounts that provider. This plan now distinguishes and proves both live native context changes and real remounts; it does not substitute remount for live replacement.

## Chosen proposed native binding

Existing plain-string providers remain supported. Widen only the native injection binding to `string | Readonly<Ref<string>>` (the Ref is Vue's existing native framework contract, never serialized). Keep exported `useNodeId(): string | undefined`; it reads/unrefs the injected value at call time, preserving its current synchronous API. No newly exported fake reactive string or mutable store appears.

In useNodeConnections, capture the raw injected binding ONCE during setup, not its resolved string. Inside the already proposed computed query, resolve explicit reactive options.nodeId first, otherwise unref that retained binding. Validate the resolved query at the actual external ID/filter boundary. This tracks ref changes within the same scope. Capture callbacks per accepted delta; query/context changes silently reset previous comparison before any later accepted edge delta. No event is fabricated by changing context. The public option and callback objects remain host-local.

Extend095 functional scope ONLY to `packages/vue/src/flow-canvas.ts` NodeWithIdContext provider449–460: provide a computed readonly current scopeProps.node.id. Preserve its render key, visual component, geometry, origin, measurement, capture/reconnect, editor and all other source bytes. Other FlowCanvas changes are forbidden. Existing string consumers and every existing useNodeId caller retain their types. A separate native binding alias may be named locally; do not create a new public API solely to hide inference failures. Ref input is readonly to observers.

New planning inventory `plans/selector-owner-lifecycle-resumption-hunk-inventory-revision.json` preserves all81 raw old hunks/hashes and fixes ONLY the incorrect apps/vue/src/test-harness.ts#hunk-2 instruction to `watch`; the historical diff remains identical. It adds current FlowCanvas hash plus the explicit native binding scope as new design proposals, not historical hunks. Original15 hash inventory is unchanged and new provider hash must also match accepted087's actual complete freeze before assembly.

## Required compatibility and actual tests

Before full functional source changes, test/compile existing string provider and new readonly ref provider, useNodeId read-on-call inference, actual computed query and both connection hooks, with no casts/any/overloads/declaration stubs. Reuse existing Vue/harness source and scope; if inference fails, preserve actual diagnostics for design review. Do not widen NodeId schema or export private component/state.

Production tests must separately show:

- Plain string provider returns current string; a mounted readonly ref context changes a→b in the SAME component/subscription scope. Track setup/unmount counters to prove no remount. Public node/handle queries reflect b, callback history stays unchanged on context replacement, and a subsequent real accepted edge update produces exactly the b-directed delta. Exercise valid missing ID and invalid ID policy separately; explicit reactive option wins over context and its replacement is a distinct case.
- Real public custom-node slot composition supplies the context. Replacing actual node identity records old scope cleanup and new setup due to existing node.id key, with no late old-owner callbacks. Preserve selected accepted graph ownership, colliding owner isolation and original assertions. A fixture-controlled PUBLIC context ref is an input contract; it must not write private accepted state/Model or fabricate port replies.
- Scope disposal during selector execution or equality evaluation causes no subsequent ordinary listener delivery. Recheck activity after those caller functions before notifying. Active preview disposal still emits canonical terminal null once; dispose/unsubscribe/listener replacement from terminal delivery is idempotent. Add meaningful cases in existing allowed native observer/controller tests and real mounts, preserving old disconnect reentrancy cases.

Foldkit counter migration Step2 must additionally use the ACTUAL `Schema.toCodecJson(ModelSchema)` old/current preservation packet decode/encode/redecode, because installed Foldkit runtime100–119 restores through that codec. Test absent counters0, preserve nonzero, reject own undefined/negative/fractional, unchanged old accepted graph/viewport and saved-v1/accepted-state exclusion. Bare Schema constructor/decode is insufficient. No fake Model setter or old packet edit.

Correct original observer excerpt citations for review: historical projection helper is258–307, callback generation/order328–367, query/callback replacement381–394. Earlier ranges in095 are historical leads, not the exact helper span.

## Reference and acceptance interpretation

Pinned React useNodeConnections44–70 retains previous connections across changed queries and may emit deltas. Flow centrally approved064 silently resets query/context baselines. Record this as an explicit native contract difference with reason and named test, retaining full raw reference/native callback histories. Do not normalize away deltas to claim equality. Public custom-node/provider composition must be used; unexported React NodeIdContext or connectionLookup injection is forbidden. Initial/accepted delta/equality/owner separation remain comparable where the values/orders actually match.

All095 original input/protected-client, gates, full-pin two genuine captures, three actual native/installed host proofs, local/focused/source review and source revision limits remain. New context tests are added; original tests are not replaced. All513parent cells remain OPEN, and069 integration/full milestones remain separate. This is new combined DESIGN review only.
