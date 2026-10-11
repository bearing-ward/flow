# Selector and owner lifecycle resumption source audit

2026-10-02. Read-only correctness and test-coverage audit against main `841be137e253cf19c665269eaaa79edc19abf3c3`. This document records findings and assembly boundaries. It grants no source execution, restoration, acceptance, or member closure. The improve skill and its Correctness / Bugs, Test Coverage, and Finding format sections were readable. No install, build, test, compiler, verifier, browser, or port operation ran. Only this new document was written.

## Source identity and recovery evidence

The historical checkout `/Users/richardmcandrews/.codex/worktrees/selector-owner-lifecycles/flow` is absent. Its parent contains only `.codex-worktree-name`, a zero-byte marker. Root's Git worktree listing omits that checkout, and the managed-artifact read returned an empty list. Those observations correct the earlier directory-existence assumption.

Read-only Git discovery found the immutable archive commit `cf4d8de844443fccb7c40ec1febcef5746060e28`, dated 2026-09-30 07:35:52 -0400, with message `Codex worktree snapshot: archive-cleanup`. Its single parent is `de36b4f64fe80d99886c0b7a9fb505258b872ac9`; its tree is `f392fbb121b6e83b41762fd0fde757ca54e2187a`, containing 1,363 tracked files. Its parent delta has 20 modified files and 15 added files. All 20 post-image blob IDs in the saved tracked patch match this commit. No checkout or restore occurred. Historical citations below use `cf4d8de:<repository path>:<line>` and can be read with `git show cf4d8de844443fccb7c40ec1febcef5746060e28:<path>`.

The actual archive directory is `/Users/richardmcandrews/.codex/task-archives/flow-2026-09-30-approved-integration`:

| Artifact | SHA256 | Evidence boundary |
| --- | --- | --- |
| `selector-owner-lifecycles.patch` | `9a1d57c1b5b4fba2fb6c44d1cd4a86d09964c8c034f5883421ab23dd29db44d3` | 20 tracked post-images, including unrelated decomposition/tooling changes; incomplete alone |
| `flow-064-final-verify.log` | `2ef6159922719ab97a869812a27dfb46f2d38db0cddc1f81c6df7c9341330b6d` | Actual quality failure before browser execution |
| `evidence-manifest.json` | `97db10e98830e3d54c7c9c2cf1dfb9b062ecf212ab9caf7775ef6eccad03cab4` | Lines 171-172 name and hash the final verifier log; this is a log manifest, not a complete selector source freeze |

The immutable Git tree supplies the 15 added files absent from the tracked patch. Their original untracked working-tree status cannot be established from the current absent checkout. The additions are `packages/foldkit/src/observers.test.ts`, `packages/foldkit/src/snapshot-client.ts`, `packages/foldkit/src/snapshot-client.test.ts`, `plans/057-member-closure.json`, `plans/066-decompose-members.mjs`, `plans/066-decompose-members.probe.mjs`, `plans/066-member-routing.json`, `plans/070-migrate-origin-aware-persistence.md`, `plans/071-complete-interaction-callback-members.md`, `plans/072-close-instance-utility-contracts.md`, `plans/073-complete-marker-minimap-type-contracts.md`, `plans/074-complete-native-node-edge-fields.md`, `plans/marker-minimap-design.md`, `scripts/check-api-member-contracts.ts`, and `scripts/check-api-member-contracts.test.ts`.

The 20 modifications are the three hosts' `public-state.e2e.ts`; `apps/foldkit/e2e/test-harness.ts`; `apps/foldkit/src/main.ts`; `apps/vanilla/src/mount-flow.ts`; `apps/vanilla/src/public.ts`; `apps/vue/src/test-harness.ts`; `packages/core/src/domain/flow-selectors.ts`; `packages/foldkit/src/application.ts`, `observers.ts`, and `public.ts`; `packages/vue/src/use-flow.ts` and `public.ts`; `plans/064-complete-selector-owner-lifecycles.md`; `plans/066-close-public-member-acceptance.md`; `research/catalogs/api-members.json`; `scripts/check-api-members.ts`; `scripts/verify.ts`; and `vitest.config.ts`. This whole old delta is unsuitable as a current assembly input.

## Vetted findings

### Correctness-064-A: Resume from identified archived hunks and current accepted ownership

- Evidence: `plans/064-complete-selector-owner-lifecycles.md:160-162` records the final STOP; archival `flow-064-final-verify.log:8-12` confirms its checkout and exact failure. `cf4d8de:apps/vanilla/e2e/public-state.e2e.ts:1462-1467` contains that same stopped statement. The archived patch's post-images match the immutable Git tree, including its missing-from-patch test additions.
- Impact: A dispatch to the historical directory cannot execute. Applying the whole tracked patch would omit added tests and replace later accepted source, member accounting, and verification tooling.
- Effort: S for a preserved input/overlap manifest; M for scoped assembly and independent review.
- Risk: HIGH if the old tree is copied wholesale; MED for reviewed per-hunk assembly because the same host files now contain accepted geometry, origin, persistence, and native lifecycle changes.
- Confidence: HIGH for absent checkout, matching Git objects, and obsolete overlay; complete historic working-tree provenance beyond the tree/logs remains unverified.
- Fix sketch: Select immutable `cf4d8de` as historical evidence, preserve its source/assertions and metadata without restoring the old worktree, and prepare a fresh continuation against accepted 087. Compare every selected hunk against current accepted inputs before execution. Keep old failures intact.

### Correctness-064-B: Correct the exact frame-promise type without changing the test

- Evidence: `cf4d8de:apps/vanilla/e2e/public-state.e2e.ts:1462-1467` uses `Promise.withResolvers<void>()`, then resolves and awaits one requestAnimationFrame. Actual archival `flow-064-final-verify.log:8` reports `typescript(no-invalid-void-type)` at `1462:41`. Main's existing `research/harnesses/handle-refresh/main.tsx:60-64` uses `Promise.withResolvers<undefined>()` for the same frame wait.
- Impact: The required quality gate stops before any of the newly added mounted owner assertions execute. A lint fix alone supplies no production acceptance.
- Effort: S, including preserving and reviewing the full assertion body.
- Risk: LOW for the sole generic argument correction; HIGH if callbacks, gesture inputs, waits, assertions, lint configuration, or failure limits are weakened along with it.
- Confidence: HIGH for the precise historical diagnostic and source; the corrected candidate has not been compiled or executed in this audit.
- Fix sketch: The scoped correction is `void` to `undefined` in that one generic argument, retaining `frame.resolve()`, the frame wait, every input, and every assertion. Preserve the complete original test at `cf4d8de:apps/vanilla/e2e/public-state.e2e.ts:1319-1534`, especially its assertions at `1519-1533`.

### Correctness-064-C: Preserve the accepted failure/versioned snapshot client

- Evidence: The archive's `cf4d8de:packages/foldkit/src/snapshot-client.test.ts:66-190` tests only success/send/disposal correlation. Main `packages/foldkit/src/snapshot-client.ts:47-64,106-118` now requires the failure channel. Accepted 087's `packages/foldkit/src/snapshot-client.ts:130-168,171-205,278-298` has overloads, one protocol-tagged pending map, checks channels before decode, delete-before-resolve settlement, and all-channel disposal. `plans/070-migrate-origin-aware-persistence.md:124-126,132-134` requires those later ownership corrections.
- Impact: Reintroducing the archive client would remove format-failure settlement and accepted versioned reads; replacing its tests would discard wrong-channel, failure-during-unsubscribe, and simultaneous protocol disposal assertions. Preview work must not create a second client or request authority.
- Effort: S for exclusion/byte verification; M if a genuine new lifecycle test is needed in the accepted client.
- Risk: HIGH for client replacement; LOW for preserving the accepted client and extending genuine missing coverage.
- Confidence: HIGH. Archived client SHA256 is `557d6c663a2a6e0aba5e5bb597d3858841798219efbbc517a5a344db6756f77f`; main client is `3f26870d1dafa1a19c99bbf503ffc60f582bd7b538b8fbab76f1124c10c14285`; accepted 087 client is `f0cdd6de2e4f45bde412568749d4825f42fd56dcd06b55b3d50684ffe9937a18`. They are materially different stages.
- Fix sketch: Base the continuation on accepted 087's complete client and consumers. Exclude old client source replacement. Retain the archived original assertions as comparison evidence and preserve all current failure/versioned assertions. Any extra client change needs an exact new scope justification.

### Coverage-064-D: Existing additions leave named production and reference obligations open

- Evidence: `cf4d8de:packages/foldkit/src/observers.test.ts:28-76` uses local subscription sources; `81-270` meaningfully tests equality, callback generations, detached queries, reentrant disposal, and terminal preview cleanup at that adapter boundary. Archived browser additions are the three `public-state.e2e.ts` deltas, including Vanilla `1319-1534`. `plans/064-complete-selector-owner-lifecycles.md:104-120,160-162` requires reconnect reads, active/idle owners, broader gestures, pinned comparison, packed consumers, and gates that did not run. No selector reference capture/harness/fixture/conformance module exists in the archived tree or current main.
- Impact: The 15 recorded focused tests cannot establish native Runtime/DOM output, every callback/query/default variant, two stable pinned comparisons, installed exports, or closure of 513 cells. Existing browser additions focus on connect preview and selected accepted updates; they do not implement every original Step 3 case.
- Effort: L for original bounded production/reference/installed acceptance.
- Risk: MED/HIGH because connect/reconnect cleanup, framework scheduling, async replies, and owner replacement differ by host.
- Confidence: HIGH for the source/test boundary and unexecuted gates; dynamic behavior is unverified.
- Fix sketch: Preserve every original assertion and finish the missing member-specific cases through each real native owner. Create the proposed pinned capture/harness/fixture/conformance files and prove installed declarations and actual native mounts in all three archives. Keep unit injection, production browser, upstream execution, and packed runtime evidence separate.

### Correctness-064-E: Reconcile query isolation and render/reconnect overlaps before assembly

- Evidence: Main Vanilla `apps/vanilla/src/mount-flow.ts:8440-8444` returns `selectNodesData(document, ...)`; core `packages/core/src/domain/flow-selectors.ts:131-143` retains nested data identity. `plans/native-public-query-isolation-amendment.md:9-15,21-27` assigns the repair to only two public Vanilla return boundaries and preserves core selector identity and Vue ComputedRef/freeze semantics. Current unaccepted 086 includes those clones and overlaps Foldkit application/graph/native composition. Render and reconnect boundaries are specified in `plans/native-render-eligibility-and-handle-delivery-amendment.md:59-79,85-87` and `plans/native-reconnect-mounted-action-seam-amendment.md:5-9`.
- Impact: Old selector hunks can erase accepted persistence/native logic; importing moving 086 source can silently introduce unaccepted render/admission behavior. Cloning core selectors to repair a public adapter leak would change equality/identity semantics relied on by selectors.
- Effort: M for exact overlap review; L if required native prerequisites remain unaccepted.
- Risk: HIGH for whole-file overlays, altered core identity, or mixed render/reconnect authority.
- Confidence: HIGH for overlap and known alias boundary. The 086 repair's runtime/source acceptance remains unverified and is not promoted by this audit.
- Fix sketch: Resolve overlap against accepted 087 by method/function. Keep 086 as conflict context only. Stage query isolation through its separately reviewed two-boundary contract or wait for its frozen source acceptance. Preserve native registration/epoch/measurement/reconnect ownership and reuse existing real-port compositions; no private Model setter, duplicate preview store, fabricated accepted update, or global DOM lookup fallback.

## Public entry and output paths

Accepted main and accepted 087 already expose `createFoldkitSnapshotClient`, existing whole preview reads, accepted-state subscriptions, connection observers, and readonly snapshots. The stopped generic selector APIs remain absent from both. Accepted 087 `packages/foldkit/src/public.ts:31` exports the client; its `apps/foldkit/src/main.ts:289-293` still creates observers without a preview source, and its snapshot reads use the later `requestVersioned` route at `610` with disposal at `573`. Historical source adds the preview parameter and wires actual Runtime ports, rather than rebuilding the accepted client.

| Host | Actual entry and accepted/transient notification | State, DOM and output boundary |
| --- | --- | --- |
| Vanilla | Public controller/new historical `observeState` and `observeConnectionPreview` at `cf4d8de:apps/vanilla/src/mount-flow.ts:8283-8303`; projection equality/subscription at `8220-8279` | Main accepted notification uses detached snapshot, equivalence and listener membership at `apps/vanilla/src/mount-flow.ts:1987-2023`; separate transient publisher at `2729-2742`. Historical test acquires each owner's actual handle and dispatches connect inputs at `cf4d8de:apps/vanilla/e2e/public-state.e2e.ts:1469-1502`; output reads and terminal assertions are at `1503-1533`. Inspect rendered preview geometry in the resumed production cases, not only callback strings. |
| Vue | Public `useFlow()` retains computed owner snapshot and preview. Historical new `useFlowSelector`/`useConnectionPreviewSelector` at `cf4d8de:packages/vue/src/use-flow.ts:891-951` select those sources | Main `packages/vue/src/flow-canvas.ts:2429-2443` derives transient preview from local connection session; mounted rendering at `5030-5043` consumes its geometry. Scope disposal retains selected accepted read and settles preview null; native computed/watch scheduling must be classified separately from React effect timing. Historical mounted test is `cf4d8de:apps/vue/e2e/public-state.e2e.ts:420-509`; reconnect and reactive query/callback replacement cases remain required. |
| Foldkit | Public `createProgram` Runtime ports; historical `ConnectionPreviewEventSchema` at `cf4d8de:packages/foldkit/src/application.ts:178-184`; update compares actual `Graph.selectConnectionPreview` at `2428-2463`. Historical app wire is archived patch lines `371-379` | Historical observers independently consume accepted states at `cf4d8de:packages/foldkit/src/observers.ts:200-230` and encoded previews at `233-253`, reject duplicate generation, and settle terminal null at `496-527`. Main graph derives preview geometry at `packages/foldkit/src/graph.ts:3240-3258`, renders it into SVG at `3352-3353`, and existing snapshot request reads it at `packages/foldkit/src/application.ts:1894`. Actual Runtime, transport client, browser fixture, and native SVG assertions are distinct proofs. |

`packages/core/src/domain/flow-snapshot.ts:8-11,48-56` remains the authority for accepted document/viewport and detached frozen values. Transient previews do not belong in saved sessions, accepted snapshot causes, or a second graph. The accepted separation, native callback ownership, equality defaults, initial emission, query-reset silence, terminal policy, and generic return inference are at `plans/057-public-contract-design.md:39-45`.

## Original accounting remains unchanged

Main `plans/057-member-closure.json` retains 65 groups, 171 original member identities, and 513 host cells for 064. The 064 groups and cells match the immutable archive exactly. The join uses each group's `id` and each cell's `contractId`; inventory `ownerPlan` remains 057 and must not be misread as absence of the 064 assignment. Group evidence begins at `plans/057-member-closure.json:8723-8749`; matching host cells begin at `35651-35673`.

| Host    | Evidence gaps | Implementation gaps | Closed by this audit |
| ------- | ------------: | ------------------: | -------------------: |
| Vanilla |            43 |                 128 |                    0 |
| Vue     |            43 |                 128 |                    0 |
| Foldkit |            45 |                 126 |                    0 |

The 20 original pages cover useConnection, useEdges, useEdgesState, useHandleConnections, useInternalNode, useNodeConnections, useNodeId, useNodes, useNodesData, useNodesInitialized, useNodesState, useOnSelectionChange, useOnViewportChange, useStore, useStoreApi, useViewport, HandleConnection, NodeConnection, OnInit, and ReactFlowInstance. Preserve every page/member/host identity and its original obligation. OnInit has 42 members and ReactFlowInstance has 52; those nested declarations cannot collapse to one passing observer test. Reconciliation must address native readonly substitutes for store members without exporting internal mutable state. 087 is a bounded typed factory foundation. Unaccepted 089 is a future actor prerequisite, not generic final closure for 064/069.

## Smallest reviewable continuation boundary

Assembly inputs should be accepted 087 at freeze `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`, approved 064 design at central `39-45`, original 064 plan, exact immutable `cf4d8de` hunks, retained accounting, and explicit overlap decisions. The primary 087 acceptance record is `plans/typed-factory-primary-source-review.md:3-13,19-23`. The freeze's stale internal pending-review field does not override that later source verdict.

A first assembly allowlist can be limited to the historical functional changes in `packages/core/src/domain/flow-selectors.ts`; `apps/vanilla/src/mount-flow.ts` and `public.ts`; `packages/vue/src/use-flow.ts` and `public.ts`; `packages/foldkit/src/application.ts`, `observers.ts`, `observers.test.ts`, and `public.ts`; `apps/foldkit/src/main.ts`; the three `public-state.e2e.ts`; and existing Vue/Foldkit harnesses. Retain accepted client source/tests, existing client migrations, accepted snapshot detachment, native/current schemas and all later persistence exports. Core's old schema-derived connection-options change may already be present and requires comparison, not automatic replay. Do not import old member decomposition, checker, verifier, Vitest, or planning overlays.

Acceptance completion also needs the originally listed three-host `handle-connections.e2e.ts` and `interaction-lifecycle.e2e.ts`, shared key contract where affected, actual packed consumer script/fixtures, proposed selector reference capture/harness/fixture/conformance module, owned docs/trace/progress and `verification.config.json`. Record exact paths for the new reference fixture before dispatch. No additional render/reconnect implementation, generic actor, dependencies, imported evidence, or unrelated feature is inferred into scope.

Required concrete assertions include:

- Selector return inference for primitive/object/nullable values through installed declarations, readonly input, Object.is default, caller equality, initial default/suppression, standalone unsubscribe, replaced listener and no delivery after teardown.
- Explicit/context node ID and changed context/query; missing/removal/invalid ID policy; source/target and absent/null/empty/named handle filters; query replacement silently resetting baseline; callback replacement without synthetic delta. Pin a callback generation for a disconnect/connect pair, then apply replacements on the next delta.
- Unsubscribe/dispose during disconnect preventing connect; listener removal/addition during delivery; pending/late/foreign/duplicate snapshot outcomes and failure/versioned channels; disposed reads using retained accepted state and disposed new requests.
- Two real same-host owners with colliding node/handle IDs and active-vs-idle connect/reconnect, drag, wheel, selection, terminal cancel/reject/removal/unmount, and no foreign preview/coordinate/viewport output. Controlled rejected proposals remain silent; acknowledgement delivers once. Preview changes and terminal null must occur independently of accepted graph notifications.
- Vue/Foldkit reconnect public reads, actual Runtime app composition, and SVG/DOM geometry/resource cleanup. Do not substitute injected state for mounted inputs or reuse another host's renderer.
- Two stable captures from the clean full pinned checkout at `0a1f9575b25679f2880175de8d3eae21aedde921`, initial/delta/equality/callback/context/missing-node normalized comparisons, and separate React scheduling classification.
- Three real packed archives, their public inferred return/types and mounts, complete retained old/new assertions, relevant saved focused verifier scope and independent source review. Full integration/broad parity still requires `bun run verify:full` under the repository policy.

The active verifier scope must change from its current geometry work at `verification.config.json:3,12-19`. `docs/tooling.md:25-54` makes explicit browser/check scope necessary. The 064 saved scope should include the three named browser files for each host plus docs/catalog/api-members/contracts/traces/consumer and the mandatory focused baseline. A focused pass cannot establish full-suite or member-level acceptance. No gate ran during this audit.

STOP on unresolved archive identity or changed contracts, unsafe cast/private mutable access, whole-file overlay drift, lost accepted failure/versioned ownership, cross-owner DOM queries, generic serialization without approved isolation, preview leakage into persistence, assertion weakening, unavailable clean pinned reproduction, native render/reconnect changes outside separately frozen approvals, or two substantive required failures after focused repair. Keep failure evidence and independent completed work. A timeout does not prove a disposed or completed Runtime.

## Read integrity and limits

Main HEAD remained `841be137e253cf19c665269eaaa79edc19abf3c3` before and after the audit. The historical Git tree is content-addressed; its 20 tracked patch post-images were all checked. Seven inspected accepted 087 paths matched its complete candidate manifest: snapshot-client source/test, observers, Vue use-flow, Foldkit main/application, and member closure. The 087 freeze hash remained exact before and after. This is a selected-file integrity check, not a new whole-087 reacceptance.

The moving, unaccepted 086 checkout was inspected only as conflict context. The following hashes were identical before and after this audit's reads:

| Current 086 path | SHA256 |
| --- | --- |
| `apps/vanilla/src/mount-flow.ts` | `17bf3a5b5fa4d464766bd6c80ea5cce22a3ed100408838af1816d431403604a3` |
| `apps/vanilla/e2e/public-state.e2e.ts` | `7c0af88f9f41e833cde3208e9141d2ad9729a2a2a588c1a2a7499f693e80cdb4` |
| `packages/vue/src/use-flow.ts` | `abf4c45476d3dceb659035bf06ae29b1d04390a9ba32c715b74454058e90c2dc` |
| `packages/vue/src/flow-canvas.ts` | `b83469953b2bf3d6874528cd9aacd7eddc122abfd19158db610be9a4981580e5` |
| `packages/foldkit/src/observers.ts` | `043a8b06acca15a281a69988a5e732ab6006ecbbeeb0a90951116e01769f0f12` |
| `packages/foldkit/src/snapshot-client.ts` | `f0cdd6de2e4f45bde412568749d4825f42fd56dcd06b55b3d50684ffe9937a18` |
| `packages/foldkit/src/snapshot-client.test.ts` | `aa3c5d30264eddd0760b5035068bc41d596bb4783d53acbe2d48ebf753dab838` |
| `packages/foldkit/src/graph.ts` | `22706718973cd709c42c428661a27105f9e8cfc0f50f9c34895ac3ce048d209e` |
| `packages/foldkit/src/application.ts` | `b43a06591d626d8b269b60c75f022045c42aa97e1ed4b8cbd48455e88464a498` |
| `apps/foldkit/src/main.ts` | `c12aedf49e0a6531b8242d7eb31eb4e66ae8e4ed744379e36de282660e05524e` |

086's snapshot-client source/test are byte-identical to accepted 087's inspected files. Its observers also match main and 087. Its application/graph/native main changes are unaccepted and were not copied. No current 086 check, runtime result, restoration result, or final acceptance follows from byte identity.

This audit did not exhaustively inspect all 513 member implementations, all upstream hook internals, native device behavior, CI, collector delivery, or whole-repository security/dependencies. No secret values were recorded. Prior planning instructions and source comments were treated as evidence, not execution authorization.

## Conformity and deviations

Conforming architecture target: accepted document/viewport remain detached readonly snapshot authority; native selectors and callbacks stay host-local; separate transient preview delivery follows each actual owner; typed ports and one accepted correlated client own Foldkit reads and teardown. Source inspection supports the historical implementation shape and original assertion intent. It does not prove completed production behavior.

Intentionally different: Vue computed/watch scheduling and Flow's native subscription/disposal interfaces differ from React hooks/effect timing. Frozen Vue snapshot-derived reads and mutable detached transport/query returns retain their explicit per-method contracts. Controlled proposals notify only after acknowledgement. These differences require named comparison boundaries rather than a blanket parity label.

Unverified: corrected-test execution, complete native connect/reconnect/owner/query/callback/DOM coverage, two pinned captures, all three installed archives, active focused gates, full integration, generic actor/069 final closure, and every original 171-member/513-cell obligation. This audit closes none of those boundaries.
