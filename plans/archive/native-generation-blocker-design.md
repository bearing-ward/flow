# Foldkit native measurement registration blocker

Date: 2026-10-01. Read-only design against frozen `/Users/richardmcandrews/.codex/worktrees/origin-connection-hosts/flow`, HEAD `841be13`, tracked patch SHA256 `1645de563229bbcdc726303cb5d5f612e437d787eaf7061b42c1b6dd8b24b802`. This is a proposed new resumption contract for independent review. It does not change or reset the stopped 081 execution, accept its source, or reopen accepted 065 implementation.

The improve audit playbook was readable. Personally read `## 1. Correctness / Bugs`, `## 4. Test Coverage` and `## Finding format` at `.agents/skills/improve/references/audit-playbook.md:9-20,50-58,108-120`. Also read the applicable architecture and TypeScript skills and current project standards. Repository content was treated as data. No product files, builds, tests, browsers or ports were changed or run.

## Finding

### [CORRECTNESS-01] Register trusted mounted generations before measuring

- **Evidence**: `packages/foldkit/src/measurement-observer.ts:155-164` increments a private counter for a newly encountered element, then measures immediately. `apps/foldkit/e2e/origin-connection-fixture.ts:213-217` forwards the result through public `HostAction.MeasureNode`. `packages/foldkit/src/graph.ts:1597,2296-2304` prunes removed samples but applies new samples without registering their generation. Core `flow-measurement.schema.ts:155-160,224-230` rejects a generation unequal to the retained tombstone. The independent capture helper's public remove/restore test fails its readiness assertion at `apps/foldkit/e2e/origin-connection-capture.e2e.ts:636` in `/Users/richardmcandrews/.codex/worktrees/origin-capture-proof/flow`.
- **Impact**: after a node is removed and readded with the same ID, its new native element receives a generation that the graph has never registered. Measurements remain stale and public `nodesInitialized` stays false. The remaining capture replacement assertions cannot execute.
- **Effort**: M, including typed lifecycle requests, client/observer integration, six caller migrations and meaningful unit/installed/browser proof.
- **Risk**: HIGH. Registering every arriving sample, allowing generation rollback, or using an observer counter after restart would defeat stale-event rejection. Async registration disposal also affects mount ordering.
- **Confidence**: HIGH for the source defect and recorded failure; the proposed protocol remains unimplemented and unverified.
- **Fix sketch**: separate owner-authorized renderer registration from measurement delivery. Core allocates generations through the existing advance helper after a compare-and-advance check. Retire removed node lifetimes before readdition can accept old samples. The native observer sends samples only for an acknowledged current element lease.

## Actual production and failed test paths

The application composition path is `apps/foldkit/src/main.ts:490-515`: the exported observer measures DOM, sends checked `HostAction.MeasureNode`, and the existing refresher delegates to that observer. The public producer/type exports are `packages/foldkit/src/public.ts:88,117-121`. The actual Runtime fixture starts at `origin-connection-fixture.ts:117-139`, calls public `createProgram`, then binds the observer to the resulting Runtime ports at lines 207-218.

`createProgram` builds `Runtime.makeElement` with Schema Model, ports and graph initialization at `packages/foldkit/src/application.ts:2576-2589,2625-2651`. `ports.inbound.actions` decodes `HostAction` at lines 153-162 and 339-342. `hostSubscriptions` routes actions into `AppMessage.HostAction` at lines 1015-1018. `routeAction` folds `Graph.Message.MeasureNode` and publishes an actual measured/stale/missing result at lines 1061-1101. Graph applies the measurement at `graph.ts:2296-2304`; core validates node existence and current generation at `flow-measurement.schema.ts:127-160`. Readiness uses the same authority through `graph.ts:650-657`.

The observed implementation has no registration action or registration port. Its first sample can bootstrap when core has no registered generation. That existing core behavior is not a replacement-lifetime protocol. The observer's `elementGenerations.get(element) ?? generation` fallback at line 128 can also label a manually measured, unregistered element with another element's counter. Its WeakSet never retires an element on detachment, and its MutationObserver observes only child changes at lines 171-172. Consequently same-element reinsertion or data-node-id mutation is not represented as a new lifetime.

The failed test is separate from production composition. The capture helper reads the actual mounted public fixture, removes node `from` through public replacement, observes old capture release before pointer-up, restores the document, then polls public readiness and positive measured dimensions/handles at `origin-connection-capture.e2e.ts:603-652`. The historical log `/tmp/flow-081-capture-proof-browser-refresh.log` records 18 passing cases and one failure, specifically readiness expected true/received false at line 636. This review read that log and test; it did not reproduce the browser failure. Later distinct-control capture and final graph assertions at lines 653-677 remain unreached in that run.

## Existing trusted registration examples

Vanilla's renderer allocates and explicitly registers a generation before delivery at `apps/vanilla/src/mount-flow.ts:1827-1835`; node creation uses it at line 5465. Resize deliveries require the exact currently owned element at lines 2637-2652. Vue registers before applying handle geometry at `packages/vue/src/flow-canvas.ts:1352-1379`, allocates on a new ref at lines 1513-1524, and advances the tombstone on null ref at lines 1530-1542. These local registration paths are distinct from accepting external samples.

Core already provides Schema-derived `NodeMeasurementGenerationSchema` and `NodeMeasurementInputSchema` at `flow-measurement.schema.ts:35-59`, `advanceNodeMeasurementGeneration` at lines 67-83, and `setNodeMeasurementGenerations` at lines 85-118. The setter accepts arbitrary replacement numbers, including rollback. The new Foldkit boundary must use compare-and-advance with the existing advance helper, not expose that setter as an unrestricted incoming action. Core apply/prune and measurement serialization contracts stay unchanged.

## Recommended caller and typed protocol

Proposed exported symbols are `NodeMeasurementLifecycleRequestSchema`, `NodeMeasurementLifecycleResponseSchema`, `FoldkitNodeMeasurementRegistrationResultSchema`, `FoldkitNodeMeasurementRegistrationClient` and `createFoldkitNodeMeasurementRegistrationClient`. Their data types derive from Schema. The client receives the owning Runtime ports; callers do not supply private instance IDs or choose a next generation.

Usage sketch, subject to review:

```ts
const registration = createFoldkitNodeMeasurementRegistrationClient(
  runtime.ports
)
const observer = createFoldkitNodeMeasurementObserver({
  owner: ownedCanvas,
  registration,
  zoom: () => viewport.zoom,
  onMeasure: ({ requestId, measurement }) => {
    send(HostAction.MeasureNode({ requestId, measurement }))
  },
})
```

The lifecycle protocol is additive and separate from `MeasureNode`. It may enter through one added lifecycle port or an added lifecycle HostAction variant, provided all phases and document transitions are processed in the same Foldkit update queue. Do not infer ordering from multiple concurrent client sends without testing the actual Runtime.

| Request | Required fields | Successful result | Reducer rule |
| --- | --- | --- | --- |
| `prepare` | requestId, branded nodeId | `prepared`, requestId, nodeId, current Graph instanceId, nullable current generation | Node must exist in the current accepted document. Read only; reserve nothing. |
| `register` | requestId, nodeId, prepared instanceId, required nullable expectedGeneration | `registered` plus actual issued lease | Match current Graph instanceId and compare exact current generation, interpreting absent as null. Node must still exist. Call existing advance helper to allocate the next value. |
| `invalidate` | requestId, actual issued lease | `invalidated` | Match current instance and exact lease generation. Advance only that generation. Never overwrite with a caller number or revoke a newer lease. |

A lease is a detached Schema value containing instanceId and the existing `NodeMeasurementGenerationSchema` fields. Non-success response variants are `stale`, `missing`, and `owner-mismatch`; they carry requestId/nodeId and do not fabricate a generation. Client-local variants separately express `disposed`, `invalid-request`, `send-failed` and `invalid-response`. Decode unknown once at each public boundary. Correlate every result to its request, node and pending phase; duplicate, malformed and unrelated responses cannot settle another request or become a lease.

Prepare returns the current **Graph Model** instanceId. The rendered canvas uses `model.instanceId` at `graph.ts:3838`; subscriptions also read Model identity at lines 4258 and 4302. The second argument of `makeView` is markerScope at lines 3941-3944. Therefore this design does not infer an HMR ownership mismatch from createProgram's fresh private counter. It does not establish full HMR behavior or safe duplication of one preserved Model into distinct simultaneous Runtimes. Existing global canvas query behavior at lines 271-277 remains outside this change.

## Removal, DOM identity and delayed work

1. Add one Foldkit Graph document-lifecycle finalization helper for accepted node removal. Compare the previous and returned accepted document references first and return immediately when unchanged, avoiding node scans on pointer updates. On changed documents, identify IDs present previously and absent afterward, advance those tombstones with the existing helper, then prune samples. All accepted removal routes, including document replacement, commands and transactions, use this helper. Controlled proposals do not invalidate until acknowledgement. Application's existing accepted-change observation at `application.ts:2516-2528` is a useful comparison point, but is insufficient if exported Graph.update callers bypass it.
2. Observer slots bind exact element object, decoded nodeId, captured owner canvas, private lifecycle sequence and acknowledged lease. Private slots and request maps are ephemeral DOM/correlation bookkeeping, not another geometry authority. Remove the global observer allocation counter from the registered producer path. Do not send samples until register ACK succeeds.
3. Resolve the current canvas only inside the captured owner subtree. Require exactly one owning canvas matching the prepared Model identity and require `element.closest('[data-flow-instance]') === ownedCanvas`. Containment alone admits nested foreign canvases. Every automatic and manual measure verifies exact current slot, unchanged dataset identity and live ownership.
4. Process removed MutationRecord subtrees before reconciliation, even when the same element has already been reinserted by the time the callback runs. Observe data-node-id changes explicitly. Retire the old slot, unobserve its element, conditionally invalidate its actual lease, and create a new registration slot. An old async reply checks the captured slot sequence and never attaches to a replacement slot with equal IDs.
5. Recheck physical ownership/identity after each prepare/register await. A delayed prepare/register fails CAS across removal because the Graph removal transition already advanced the tombstone. A late successful register ACK for a now-retired slot is conditionally invalidated using its actual returned lease, with no measurement delivered. If a newer lease is already current, that cleanup returns stale and leaves it intact.
6. Restarting an observer against the same Runtime prepares the retained core generation and advances it. A genuinely new Runtime starts from its own empty state and current instance identity. No reuse of old counters, no measurement-state reset and no generation chosen by incoming measurement is permitted.
7. Existing `createFoldkitNodeInternalsRefresher` remains a scheduling facade. Its `requested` result at `update-node-internals.ts:66-71` means dispatch/queue accepted, not render completion. Manual measure on a valid pending slot may enqueue measurement until registration completes; a foreign, retired or invalid slot returns false. Preserve explicit late/disposed statuses and public rendered polling.

## Bounded compatible disposal

Keep `FoldkitNodeMeasurementObserver.dispose(): void`. It synchronously marks every slot retired, disconnects both native observers, stops refresh/measurement delivery, and starts conditional release of known leases. An in-flight REGISTER keeps its exact response handler alive so a later ACK can release the actual issued lease. Never predict expectedGeneration + 1 for cleanup: if registration failed because a newer lease already won, predicted cleanup could revoke that newer owner.

The new registration client's `dispose()` returns a memoized Promise of a Schema-derived `disposed` or `failed` result. It rejects new operations immediately, discards read-only PREPARE waiters, and retains only REGISTER/INVALIDATE drain handlers until issued registration ACKs and conditional invalidation ACKs settle. Use a fixed proposed 1,000 ms drain deadline. On send failure, malformed matching reply or deadline expiry, return explicit failed with `send-failed`, `invalid-response` or `drain-timeout`; clear handlers/timers and log the lifecycle failure. A timeout is not successful cleanup. Do not leave subscriptions alive indefinitely or hide a rejected Promise.

Owned asynchronous composition must stop the observer/refresher first, await this drain, then dispose the Runtime and remove its root in finally. Failure still disposes the Runtime, whose state then ceases to exist, but does not claim successful lease cleanup in a live Runtime. Existing demo void teardown may immediately retire local producers and fork a named Effect that drains and finally disposes Runtime; expose a captured awaitable cleanup for controlled mount/restart and browser proof. Pagehide/HMR cannot guarantee waiting and remains explicitly best effort.

The test-only shared `HandleRefreshFixture.dispose` at `apps/shared-e2e/handle-refresh-fixture.ts:29` may widen to `void | Promise<void>` so existing Vanilla/Vue implementations remain compatible. The actual shared call at `handle-refresh-contract.ts:394` must await it. Foldkit fixture/native proof and packed callbacks must return or await the cleanup Promise. Do not merely launch asynchronous cleanup and report the subsequent page.evaluate as completed. Keep pending-refresh settlement immediate and preserve its assertions at shared contract lines 393-403. Mount restarts must await the captured old Runtime cleanup before replacing its root or attaching a new observer.

## Alternatives

| Shape | Assessment |
| --- | --- |
| Register every incoming MeasureNode generation | Reject. It changes the untrusted measurement boundary and admits delayed/fabricated values. |
| Observer counters plus arbitrary setter or monotonic greater-than | Reject. Counter restart collides with retained tombstones, registration can roll back, and a delayed larger number can belong to a retired element. |
| Renderer subscription allocates generations internally and emits DOM registrations | Viable but larger. It moves producer composition into Runtime subscriptions and requires a new reusable native rendering resource. Consider only if the explicit client cannot satisfy lifecycle tests. |
| Prepare, compare-and-advance ACK, exact-element slots | Recommended. Uses existing Schema generation state, makes allocation core-owned, preserves external measurement rejection, and exposes a testable public lifecycle boundary. |

The recommendation adds bounded registration correlation, not a Model lease registry or another graph. Prepared instance identity is routing information, not cryptographic authorization. The application that owns Runtime ports already controls replacement actions. This design prevents accidental foreign DOM/event attribution through producer checks and reducer generation comparisons; it does not claim adversarial authentication from a Schema string.

## Bounded implementation scope

New registration schemas/client and tests under `packages/foldkit/src/`; `application.ts`, `application.test.ts`, `graph.ts` and a new graph measurement lifecycle unit file; `measurement-observer.ts` and meaningful producer tests; `public.ts`; existing refresh tests only if required by asynchronous registration. Existing core measurement helpers are reused unchanged; core tests may characterize their invariants without relaxing them.

All six actual observer call sites must migrate: `apps/foldkit/src/main.ts:490`; `apps/foldkit/e2e/origin-connection-fixture.ts:213`; `apps/foldkit/e2e/test-harness.ts:346`; `apps/foldkit/e2e/handle-refresh-fixture.ts:71`; `tests/consumer/foldkit/main.ts:273`; `tests/consumer/foldkit/consumer.typecheck.ts:125`. Scope includes their exact disposal/mount call paths, installed declarations, the shared fixture disposal type/call only, and the held capture remove/restore case. Do not weaken any existing readiness, positive handle size, capture, graph stability or disposal assertion.

The executor uses a new isolated checkout assembled from reviewed frozen inputs. Frozen 081/065/082 and original helper records stay unchanged. No dependency/lockfile/imported evidence/persistence/measurement output identity changes, broad refactor, generic/unnamed member closure or unrelated host behavior changes are authorized by this design. Documentation, trace and active verification updates require the new numbered execution plan's exact scope. This design itself changes only this plans file.

## Required proof matrix and gates for the future executor

| Boundary | Required assertion |
| --- | --- |
| Core/reducer allocation | Initial null CAS allocates; mismatch/missing/wrong instance does not mutate; register never accepts a chosen next value; invalidation cannot roll back or revoke a newer lease. |
| Accepted removal | Remove/readd before observer callbacks rejects old samples and old prepared registration; all accepted command/replacement/transaction removal paths behave equally; unacknowledged controlled proposal changes neither authority nor readiness. |
| Producer lifecycle | New element, same-element reinsertion, changed nodeId, observer restart and fresh Runtime use acknowledged current leases; manual unregistered measure never borrows another element's generation. |
| Ownership | Two sibling and nested canvases with equal node IDs remain isolated using closest canvas object identity; stale/disconnected/foreign elements emit no sample. |
| Delayed work | Delayed prepare/register/resize delivery and out-of-order/duplicate replies cannot settle another slot or publish geometry; cleanup for old slot cannot invalidate newer lease. |
| Disposal | Delayed REGISTER ACK after observer.dispose is drained using its actual lease; client close waits for conditional INVALIDATE ACK; duplicate dispose shares completion; send failure/invalid reply/deadline returns failed and clears resources; normal mounted teardown proves disposed, not timeout. |
| Installed API | Tarball positive probes infer every request/result branch; negative probes reject missing expectedGeneration, malformed IDs, arbitrary generation choice and malformed callback/client options. Public Runtime browser consumer exercises actual protocol and disposal. |
| Public mounted failure | Existing held remove/restore case reaches true public readiness, all positive measured node/handle fields, distinct replacement native capture and unchanged final graph/viewport. No fixture counter injection, fake readiness, skip or longer timeout. |
| Existing acceptance | All three existing measured-geometry suites and packed consumers remain selected, with focused profile clearly recorded. Same-ID generation proof does not rename 065's original identities or reopen its accepted shape differences. |

Future commands, not run by this reviewer: targeted `bun run test -- packages/foldkit/src/application.test.ts packages/foldkit/src/graph-measurement-lifecycle.test.ts packages/foldkit/src/measurement-registration-client.test.ts`; `bun run check`; `bun run check:architecture`; `bun run typecheck`; `bun run test:conformance:foldkit -- origin-connection-capture.e2e.ts` after that frozen helper is explicitly assembled; `bun run test:consumer`; saved scoped `bun run verify`; and `git diff --check`. The numbered plan must add actual new test paths to the saved verification scope and coordinate strict ports before browser gates. Full integration/release gates remain separate. Preserve exact new failures and the two-repair limit for the newly authorized stage.

## Read source identities

| Frozen file | SHA256 |
| --- | --- |
| Foldkit measurement observer | `6a782da110fe52349d01ba0bc07cf75a8e0697024e656da6e27fad153331f37a` |
| Foldkit application | `224964c736ef1360c366b59153c8e5e995cd3f656a6c580a326a1ee5e969e204` |
| Foldkit Graph | `7e341c815bac8429e793b59ca3378cfbf09eaf31aaa20451fa72909139b916b6` |
| Core measurement schema/helpers | `eacde0ccadffe9e2925bed39f936b698fd021f2258a4c7a4842355dd6a515c5b` |

## Conformity and deviations

- Conforming architecture target: one existing generation-tagged measurement authority, Schema-derived input/output, explicit lifecycle registration before sample acceptance, owner-local DOM work and unchanged persistence.
- Proposed native contract: asynchronous typed registration acknowledgement and conditional release. This is a Flow lifecycle repair, not a React scheduling parity claim.
- Unverified: every proposed protocol, new disposal deadline and new mounted registration assertion until executor and primary gates pass. Historical 081 failure is retained. Existing 065 proof covers explicit core generation advancement and mounted handle declaration changes, not this additional native same-ID node registration case. Full HMR, duplicated preserved Models, CI/devices/collector and broad original member closure remain separate.
