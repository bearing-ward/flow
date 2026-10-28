# Retained native failure amendment independent design review

Verdict: APPROVE. Design only, 2026-10-02, main/candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`.

Approval applies to the complete amendment with its final primary refinement at lines53-73 governing scope. It approves the one additional production ordering change and the named genuine test repairs. It accepts no final source, retained native result, focused/full profile, integration, member closure or library parity. The independently approved reconnect amendment remains separate. I read source and preserved evidence only; no source edits, builds, gates, browsers, ports or agents were used. Only this review file was written.

## Inputs and hashes

Main root is `/Volumes/Sync/codex/9-19-26/flow`. Candidate root is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Evidence root is its sibling `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence`. References below use Main, Candidate and Evidence with those exact roots.

| Root | Personally read input | SHA256 |
| --- | --- | --- |
| Main | `plans/archive/native-retained-failure-amendment.md` | `86458f2e5569effd5dfe3722d4604064928df417e881382163a79676cee4b5f4` |
| Main | `plans/086-complete-native-parity-acceptance.md` | `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f` |
| Evidence | `retained-failure-amendment-proposal.md` | `8238c7090d135acd8e158e7a65172fb84998cd36fc91b065aaba09811ff8a10b` |
| Evidence | `foldkit-retained-suites.log` | `d4c17a1d9c2e116e1d82d9036bf13b013a48f8d8d6be5aac6424382e82d3a468` |
| Evidence | `foldkit-retained-suites.receipt.json` | `af38e5bb14d93012d222467616d440554138f0fcce53b5018d029ac98dd28e61` |
| Candidate | `packages/foldkit/src/application.ts` | `6f89276cb4958a642244aa022ce5ae3a212cb5a1f5846c2341ac6e892f3e1843` |
| Candidate | `packages/foldkit/src/viewport-client.test.ts` | `1d37bc5ae8fff85d34570e75c25c44d8135cc6f42d95aa0bfc320426f91f8b8f` |
| Candidate | `packages/foldkit/src/snapshot-client.ts` | `f0cdd6de2e4f45bde412568749d4825f42fd56dcd06b55b3d50684ffe9937a18` |
| Candidate | `packages/foldkit/src/public.ts` | `73df026417aeabdd4a47c37aa661176e955274f4762a2c50464308adc17a31d2` |
| Candidate | `packages/foldkit/src/node-measurement-lifecycle.ts` | `5ca1b07fe5f91b520b7651367ca397a4644707e256948ee2d53467c84b8ab0dd` |
| Candidate | `packages/foldkit/src/update-node-internals.ts` | `e9aa70d2cd9a9508183d0617d24a562721fbeb3d42f22ad1861d7ba01a6cb897` |
| Candidate | `apps/foldkit/e2e/test-harness.ts` | `ae37fcf2c1f8b1b6ebf79a8fab2edc5bbc069b18f7549b593a8b69710ee3593c` |
| Candidate | `apps/foldkit/e2e/measured-geometry.e2e.ts` | `bf15898509be179b4d5ace4f81c4b7b1e05847ceeefcd070ea7587512d98f2ba` |
| Candidate | `apps/foldkit/e2e/public-state.e2e.ts` | `19ee445805b257a84b04fd159429675c419e97bfc053ce9a80c1a4c1ef2a402e` |
| Candidate | `apps/foldkit/e2e/handle-refresh-fixture.ts` | `419c7d22a8cef244ec59866381ed3d84a07c9ea34d17263ce87fffc70942091f` |
| Candidate | `apps/foldkit/e2e/conformance.ts` | `4a2a4bdc39371896a4559248beec04dcbcab6bd6c6e2748f299a22fe27d86914` |
| Candidate | `apps/foldkit/e2e/interaction-lifecycle.e2e.ts` | `1ec06bc9ef99cd362a840af6304177528b71b495fdb279cf281e8e22ea2a3f5a` |
| Candidate | `apps/foldkit/src/main.ts` | `b77173542bb1ea87f49b84e9cb8bae7576f1d01c7912d25533aecf385471591c` |
| Candidate | `apps/shared-e2e/handle-refresh-contract.ts` | `b8f9a3ccab0d1d044057629d170310a69933c289022f074dfe3c416d86bd75f2` |

The complete amendment, original proposal and retained log hashes match the requested receipts. The original proposal remains evidence; the primary refinement overrides its earlier suggestion to put the new unit in application.test.ts and its possible shared radius edit. AGENTS.md, docs/standards.md and the improve closing-the-loop workflow were read in this review session's preceding reconnect review and continue to govern this design review.

## Evidence boundary

The receipt identifies an actual nine-file retained Foldkit suite invocation and exit1. `Evidence/foldkit-retained-suites.log:650-671` reports 19 failures and 64 passes, with 13 interaction, three measurement and three public-state failures. Preserve the complete log and receipt, including earlier successful rows and every failure; this amendment does not replace them with a successful subset. These are supplied execution results, not a rerun by this reviewer.

The failures separate into different boundaries. The dead UI fill times out at retained-log `:527-543`. Hardcoded generation1 yields stale at `:547-561`. Dynamic radius preview misses at `:565-585`. The disposed snapshot route times out at `:589-602`. Content-frame output differs by +1,+1 at `:606-627`. Missing current canvas metrics occurs at `:631-646` on the initial reduced-motion call at public-state.e2e.ts:1185, before that test reaches pending disposal. The last failure must not be relabeled as proof of an already-disposed request bug.

## Public and native routes

### Viewport production ordering

`Candidate/packages/foldkit/src/public.ts:1-17` exports createViewportClient from application.ts. Its public request facade at `application.ts:452-460` receives a real metrics callback and viewport. `request` allocates an ID then invokes metrics at `:482-485`, before its disposed early return at `:490-500`. That callback can throw after owner DOM teardown, preventing the existing complete/disposed response. Disposal marks closed, stops the real subscription and settles every outstanding request at `:610-628`.

Moving only metrics acquisition below that early return fixes this source ordering. Keep ID allocation, current viewport, initialized=false/complete=true result, pending map, live metrics and send handling at `:502-531`, reduced-motion behavior at `:504-511`, and all public method signatures at `:534-609` unchanged. The synchronous getViewportForBounds method at `:580-596` is outside this functional delta. There is no reason to alter graph coordinates, animation or other production methods.

The final refinement correctly places the new real-client regression unit in `Candidate/packages/foldkit/src/viewport-client.test.ts`, whose existing unit uses `Parameters<typeof createViewportClient>[0]` at `:8-10`. Use those actual port types, an initially usable metrics callback, real client dispose, subscription-stop/send counters, and repeated post-teardown requests. The callback should throw if called after teardown, so success proves it was never reached. Assert the exact current viewport/disposed/complete response. Preserve all live and animation tests elsewhere; counters alone without a real response assertion are insufficient.

The browser route is separately `Candidate/apps/foldkit/e2e/public-state.e2e.ts:1174` → harness requestViewportClient at `test-harness.ts:1787-1797` → the client created with owned DOM metrics at `:1364-1388`. Its actual pane must exist before the live request; the retained log fails before that request can succeed. After live initiation, `disposePublicState` closes viewport clients synchronously at `:1807-1811`, then awaits registration/Runtime cleanup at `:1831`. Preserve the reduced-motion accepted response, a genuinely initiated pending request that settles disposed, and repeated already-disposed calls through the captured real client after DOM removal. The harness map is cleared on dispose, so late proof must retain the actual client or its bound request before that clearing; binding the current map-lookup helper alone cannot capture it. Any such seam stays inside the allowed harness/test files and uses the existing ViewportClient method types. Never retain a live pane or synthesize a terminal response to conceal the ordering bug.

### Snapshot ownership

The browser starts real public owners and asserts literal-v1, pending disposed and next disposed at `Candidate/apps/foldkit/e2e/public-state.e2e.ts:7`. Runtime ownership is recorded at `test-harness.ts:1361-1363`. disposeHandle closes the actual snapshot client at `:379-386`, then deletes the weak-map entry after drain at `:393-403`, while publicHandles remains queryable after disposePublicState. requestSnapshotResult therefore constructs a new client on the retained closed Runtime at `:492-508`.

The approved public-owner map must retain the same real client created/shared at embed, and retain that disposed instance while its public ID remains queryable. Reset it at the genuine start/replacement boundaries alongside publicHandles at `test-harness.ts:1441-1445` and `:1546-1549`, not during ordinary disposal. Keep weak-map deletion and handle cleanup. Production SnapshotClient already returns its own disposed result without sending at `Candidate/packages/foldkit/src/snapshot-client.ts:226-230` and closes its actual subscriptions/pending requests at `:280-292`. Do not change it or fabricate a harness result. Preserve pending and later assertions, with repeated later requests and real zero reacquisition/send observations where observable.

### Generic native measurement startup and issued refresh

The actual adapter route is `Candidate/apps/foldkit/e2e/conformance.ts:22-28` → generic harness.mount. `test-harness.ts:1029-1088` embeds/subscribes the real program, then returns after one frame at `:1097`; it does not acquire a native measurement producer. The existing helper at `:410-464` locates the owned root, registers the real observer, derives actual zoom and sends native measurements, with concrete setup rollback at `:451-461`. Calling it after actual DOM/subscription acquisition and waiting for accepted snapshot readiness/current declared physical handle IDs is appropriate harness composition. Do not invent readiness or skip a handle. Explicit mountMeasurementDocument at `:1100-1135` remains a separate genuine protocol path so its initially unmeasured assertions survive. Existing interaction callers explicitly restart the helper at interaction-lifecycle.e2e.ts:1496 and :3380; retain those assertions and resource correctness when generic startup is added.

The measured browser test currently hardcodes1/0 at `Candidate/apps/foldkit/e2e/measured-geometry.e2e.ts:307`; its semantic assertions at `:305-317` and pending disposal at `:319-342` remain required. Existing acquireMeasurementLease at `test-harness.ts:348-361` awaits actual prepare then register. Its Schema-derived registration union at `Candidate/packages/foldkit/src/node-measurement-lifecycle.ts:40-85` contains real prepared/registered/terminal outcomes, with registered lease authority and disposal tracking at `:354-366` and `:381-424`.

The approved preparePublicMeasurement(id,nodeId) test method must delegate to that exact function and derive its return type with ReturnType/Awaited as appropriate. Narrow the actual result status before reading lease.generation. Acquire an old actual lease, then a later acknowledged actual lease; send current geometry through existing refreshPublicNode, then the delayed old generation, proving stale without geometry/event/revision change. Do not calculate future generations or modify production ports. refreshPublicNode's current container lookup followed by a global fallback at `test-harness.ts:1597-1606` can measure a foreign owner sharing an ID. Remove only that fallback, keep genuine missing/terminal outcomes and prove independent owner scope. Measurements still flow through the real action at `:1655-1665`.

### UI teardown and content coordinates

Keep the live missing-ID control assertion at `Candidate/apps/foldkit/e2e/measured-geometry.e2e.ts:104`. Main's local refresh wrapper at `Candidate/apps/foldkit/src/main.ts:617-638` is not an exported fixture controller. pagehide disposes its observers/clients/refresher/listeners and empties #app at `:664-686`. Here root removal means its rendered owner children and controls disappear; #app itself is the persistent host declared at :101. Assert that real cleanup and no later owned delivery, without changing main.ts or restoring dead UI.

Retain disposed refresher semantics through the existing real fixture at `Candidate/apps/foldkit/e2e/handle-refresh-fixture.ts:122-135`, capturing its actual callable before teardown, awaiting its real registration drain and Runtime/mount disposal at `:186-201`, then asserting disposed and no new measurements. Production refresher disposal/late behavior is real at `Candidate/packages/foldkit/src/update-node-internals.ts:97-100` and `:140-153`. A narrow fixture receipt for counts/events is allowed; no new production controller/global is allowed. The original shared pending/late disposal assertions at `Candidate/apps/shared-e2e/handle-refresh-contract.ts:386-403` remain unchanged by this amendment.

The scrolled coordinate browser test passes rect+clientLeft/clientTop at `Candidate/apps/foldkit/e2e/public-state.e2e.ts:924` but uses rect alone in reverse input at `:955-957` and forward expectation at `:965-973`. Production conversion uses the supplied physical origins at `Candidate/packages/foldkit/src/application.ts:1308-1334`. Capture the real border offsets in the receipt and use the same content origin in both test directions; retain scrolled top<0, exact forward output and exact round trip. No geometry production edit is approved.

## Exact delta and acceptance

The refined allowlist is application.ts only for the getMetrics ordering, viewport-client.test.ts only for meaningful related units, and apps/foldkit/e2e/test-harness.ts, measured-geometry.e2e.ts, public-state.e2e.ts for the named genuine harness/assertion repairs. Existing apps/foldkit/e2e/handle-refresh-fixture.ts may add only actual resource/event receipt needed for the split teardown proof. Original086 owned execution/provenance and active verification scope may record these changes.

The earlier proposal's application.test.ts destination and shared radius behavior edit are not approved. `Candidate/apps/shared-e2e/handle-refresh-contract.ts:247-250` delivers a fixed12 client-pixel offset; source arithmetic suggests24 graph units at zoom0.5, but actual current target center/delivered pointer evidence still needs the primary checkpoint. Radius work is diagnostic-only. No shared-contract behavior edit, radius/tolerance widening, timeout change, frozen capture change, dependency/lock change or extra production path follows from this verdict.

All semantic assertions survive through the genuine paths named above, including every retained interaction assertion, old lease rejection/current geometry, missing/disposed results, client subscription closure, literal-v1 reads, reduced motion, pending versus already-disposed outcomes and coordinate round trips. A failure needing another production repair returns for an exact amendment. Preserve full failed logs and input receipts before execution, and all subsequent failed/final logs.

Every original gate remains required at `Main/plans/086-complete-native-parity-acceptance.md:80-84`, including selected all-host/native capture/origin, versioned/public edit, actual packed restoration, unchanged ordinary HMR, saved focused verify and full verify, release dry run, docs/traces/member/reconciliation, final quality/diff and freeze, primary independent reproduction and cold final source review. Both endpoint native and packed reconnect proof remain required under their independent amendment. No such gate ran here; this is no substitute for either verification profile or runtime acceptance.

## Conformity and deviations

- Conforming proposed design: real closed clients settle their own protocols without reacquiring DOM/subscriptions, registration receipts supply actual owner generations, owned DOM bounds supply physical content coordinates, and native gesture startup composes the existing producer.
- Intentionally different test routes: explicit protocol measurement remains separate from generic native startup; main UI teardown is asserted where main owns it, and late public refresher behavior is asserted through the existing captured real fixture resource. Production graph semantics remain unchanged.
- Unverified: every new implementation, retained native recovery, actual radius diagnosis, packed/native/full086 closure, integration, library members, CI/device/collector delivery and broad parity. Source inspection explains candidate defects and approves bounded repairs; it does not establish successful native behavior.
