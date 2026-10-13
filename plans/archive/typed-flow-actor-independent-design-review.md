# Typed Flow actor independent design review

Verdict: REVISE before dispatch. The proposed core ownership and concurrency design is implementable using the installed Effect APIs, but two checkpoint policies need explicit decisions and tests. This is a design verdict only. No actor source or original069 member is accepted.

Reviewed 2026-10-02 against main baseline `841be137e253cf19c665269eaaa79edc19abf3c3`. Read both complete packets, the accepted087 primary and independent source approvals, project AGENTS/standards, improve/closing-loop, TypeScript/type-system and unslop instructions. Only this review file was written. No compiler probe, install, build, unit/browser/consumer/verifier gate, server or source edit was performed.

## Frozen identity and inspection boundary

| Input | Independently matched SHA256 |
| --- | --- |
| Main `plans/archive/typed-flow-actor-design.md` | `0e0f408e448a3886d8de4e07bfc564db7e01f78cd6fcce8649fa2c631623855a` |
| Main `plans/089-create-isolated-typed-flow-actor.md` | `95d3320ee8a7680540b72a8a4a4004f17416eafc0b86c950176fc0ac54f9951a` |
| Accepted087 external `typed-factory-evidence/final-freeze.json` | `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` |
| Selected `packages/core/src/domain/flow-data-contract.schema.ts` | `68cf6be77dba34b213e2470df77be9e6ab3420ad1e4e7c4e9272af099d59d51a` |
| Selected `packages/core/src/domain/flow-data-contract.ts` | `1cf9e6284e9e3bc6c1580a6e4d84e84e0dde44866a671b697f0d9a24ecb21f02` |
| Selected `packages/core/src/domain/flow.schema.ts` | `b765bb46f60e0470f710907ab61ee9b5403dfff556b658d6bb2fa6e4537a547d` |
| Selected `packages/core/src/public.ts` | `3ebe97996606ee5056dfa5db6e104a704ec2d1121e9cfefdb8be0ab7fecb29a3` |
| Selected `scripts/check-packed-consumer.ts` | `1d43b65b88b69f5b5d971a19745679aac9c82fe87080cf363a0d324b17161fe6` |
| Selected `packages/core/src/domain/flow-runtime.schema.ts` | `fef418a926ead3231f06134faafa104385345764a9217d5fe64d2282a0c892db` |
| Installed `node_modules/effect/src/Schema.ts` | `1c969eeb708dba22d44f3e4b4090566e36a07f19031171aba77867c27b08c11f` |
| Installed `node_modules/effect/src/Scope.ts` | `d1f31095954a8348853620ac102ae665acb86afbac54189d99e57c37757ddf18` |
| Installed `node_modules/effect/src/Queue.ts` | `bb95bd88b5674987f84e6ec13b47e1a67d237dfdab2c0b36a0368f4234d4a2d7` |
| Installed `node_modules/effect/src/Deferred.ts` | `3cb80cc3c17148d8c6cc264e80f196ca7799c49423497ca7929d98179c797198` |
| Installed `node_modules/effect/src/Effect.ts` | `a4b7de531f5c21b174be0db3a6d2ee10cb2ad1afd08fc74be149f99d68d7de29` |

Selected source paths resolve under `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`; the external freeze resolves in its sibling `typed-factory-evidence` directory. Independently rehashed all1492 selected candidate files and all122 evidence files with zero mismatches. That inventory check is separate from this narrower architectural source read. Read complete factory and failure/contract modules, the actual shared integrity entry and ordered traversal, authoritative viewport/telemetry contracts, installed consumer copy/execute sequence, and the installed parser/context/queue/Deferred/scope declarations cited below. This review does not repeat the earlier full087 unit/probe audit or verification run.

## Required revisions

### 1. Make the complete checkpoint's JSON guarantee true

High-confidence correctness gap; bounded design effort S, implementation risk low if contained in the new actor Schema and preparation boundary.

`typed-flow-actor-design.md:85-109` proposes a checkpoint with `document:S.Json` and `viewport:ViewportSchema`. At `:188,196,208-212` it promises a mandatory frozen JSON checkpoint and validates that complete value through this Schema. The unchanged selected `flow-runtime.schema.ts:42-45` uses `S.Number` for viewport.x/y. Installed `Schema.ts:2999-3012` explicitly accepts NaN and both infinities; installed `SchemaAST.ts:5056-5058,5132-5142` rejects those values as JSON. Thus a valid document plus `{x:NaN,y:0,zoom:1}` passes the proposed checkpoint Struct while violating its claimed JSON contract. Ordinary JSON serialization would also replace that numeric state with null.

Decide this at the new public actor/checkpoint boundary. Recommended policy: retain authoritative ViewportSchema and its exact derived type, but require the entire checkpoint to pass the plain finite JSON capture/validation policy before initialization or a write can stage or accept. The exported new checkpoint Schema must enforce the same guarantee, rather than accepting values that the preparation path alone rejects. Reject nonfinite x/y explicitly with the reviewed existing FlowCodecFailure operation and a useful message; do not change existing ViewportSchema, concrete viewport APIs, saved formats or silently encode strings/null. The author should freeze the exact error operation and validation order in both packets.

Add exported-checkpoint-Schema and actual makeTypedFlow tests for NaN, positive infinity and negative infinity in both x and y, including typed values received from JavaScript. Verify no gate stage, activation, accepted notification or live owner is created on initial failure. Include finite negative/zero x/y and positive finite zoom controls. Existing concrete numeric behavior remains untouched. A parser test alone does not prove initialization used the new boundary.

### 2. Settle reservations and in-flight writes when activation fails

High-confidence lifecycle specification gap; bounded design effort S, implementation risk medium because acceptance, publication and cleanup are concurrent.

`typed-flow-actor-design.md:218` terminates the ordered publication worker after an accepted activation fails, marks its gate unhealthy and rejects subsequent attached writes. `:230-232` settles pending requests and aborts leases on actor closure. Neither defines what happens immediately to already accepted reservations waiting behind the failed activation while the actor remains open, or whether a prepared write checks gate health again at final CAS. `:202,216` names final phase/revision/cancellation/lease checks but omits that health check. The plan's matrix at `089-create-isolated-typed-flow-actor.md:108-111` lacks this schedule.

The schedule is concrete: hold revision1 activation; accept revisions2 and3 so their reservations enter the publication queue; prepare revision4 and pause it before CAS; fail revision1 activation. Merely terminating the worker leaves revisions2/3 reservations without activation or immediate release. Checking health only when revision4 starts permits its later CAS despite the now-failed mandatory gate.

Freeze a terminal gate-failure policy in both packets. Recommended policy: record gate failure as actor-owned metadata through a short serialized transition; reject new attached preparations and recheck health at final CAS; preserve every core revision already accepted; terminate the publication worker and release the failed and queued reservations exactly once using their identity-scoped, non-reverting abort contract. Never invoke a queued accepted callback to manufacture a successful publication. A reservation currently held by an unaccepted preparation must be aborted when that preparation fails the health check. A late stage return after failure must also be rejected and released. Keep reads and independent observers usable, reporting accepted core revisions. The precise FlowProjectionFailure revision/message used for rejected writes must be frozen, including initialization failure if relevant. No rollback or native success claim is allowed.

Add a real actor/fiber/Deferred test for that complete schedule. Assert accepted core state/revision, each staged reservation identity and exact release count, no queued activation after failure, no revision4 acceptance/notification, the exact rejection tag, and later read/observer behavior. Add stage-in-flight-at-failure and concurrent scope-close controls so gate failure plus closure cannot double-release, leave request Deferreds unresolved or erase a different generation. These tests fit the approved new core unit files and abstract gate capability; no native or adapter source expansion is required.

## Architecture findings that pass

The exact C.Type/C.Encoded/node/edge views remain available from accepted `flow-data-contract.schema.ts:24-33`; FlowIsolation RI and failure tags are already authoritative at `:35-66`. The new signatures at design `:123-169` keep independent RD, RE, RI, RC, RU and RL. Installed `Schema.ts:2468-2502` confirms toType retains exact Type and has never decoding/encoding services. Installed `Schema.ts:14892-14922` confirms toCodecJson retains the declared RD/RE channels; undeclared hook services remain explicitly unsupported. Decoded initialization can omit RD/RC, encoded and dynamic initialization retain them, and RC-bearing capture does not contaminate reads/decoded writes. R=never bridge Effects are an explicit application composition contract, not hidden service erasure. No RG generic is needed for already provided bridge Effects.

The preparation policy at design `:178-204` isolates encoded input before decoder hooks and decoded input before checks, gives custom validation and encoding private working copies, and seals authority only through trusted isolation. Its trust limitation for Date/private classes is explicit. S.toType does not certify universal isolation, and the packet does not claim it does. Separate encoded capture is necessary because C.Encoded need not be C.Type. Default descriptor-based finite JSON capture and explicit custom capture preserve that distinction without changing the accepted factory.

Outside-writer user preparation with one final CAS is the right choice here. It permits an awaited nested write to finish and makes the outer write conflict without replay. User codecs, updater, selector, isolation, stage and listener never hold the writer. `Queue.unbounded<Effect.Effect<void>>` plus lexical typed Deferred closures can retain result types without an erased command payload. Installed `Effect.ts:11413,11793-11840` supports per-execution Context capture/provision; `Deferred.ts:172-187,499-535` supports typed outcome and cancelled waiter removal; `Scope.ts:240,456,567` and `Effect.ts:17430-17540` support explicit child ownership/forking. Queue shutdown clears buffered actions but cannot settle application Deferreds, which the plan correctly handles separately.

A short non-yielding CAS and terminal reply protected from interruption is compatible with that model. Initialization revision0, always-changed successful writes, no implicit retries, old captured read delivery and finite revision exhaustion are explicit policies rather than inferred reference parity. The unbounded per-observer FIFO trades retained versions for ordered, nonblocking delivery; the packet names this memory cost. Initial delivery, per-registration Context, failure isolation, caller interruption and normal actor-close completion are defined. Ordered owner cleanup before child interruption avoids relying on automatic LIFO fork cleanup to set lifecycle state.

Staging ACK before core acceptance, a trusted synchronous lifetime predicate and identity-scoped abort are sufficient for the proposed abstract core protocol. They do not establish native transactional visibility. Postcommit activation remains a separate observable action. The policy explicitly prevents failed activation from rolling back accepted graph state and assigns real rendering/ACK/reload to later work. The required revisions above complete the failure branch rather than changing this architecture.

## Scope and verification

The hard allowlist at plan `:64-77` is concrete: five new cohesive core files, additive public exports, two installed public fixtures, the existing runner's copy/runtime additions, three include-only compiler changes, owned documentation/config/planning records. It preserves factory087, shared validator, concrete runtime/edit/persistence, adapters, dependency/compiler policies and all member records. The shared integrity path at selected `flow.schema.ts:360-379,429-452` remains one ordered traversal and returns exact D. Existing telemetry names at `flow-telemetry.ts:1-71` can cover the new boundary logs without exporter changes.

The matrix and gates at plan `:95-142` require meaningful real product operations, independent service contexts, correlated class/optional/default variants, successful/failing mutating hooks, original error ordering, real fiber cancellation, nested writes, stages, observations and pending settlement. Installed shared fixtures are copied and executed after actual tarball installation through selected `scripts/check-packed-consumer.ts:785-813`. Compiler modes stay unchanged; exact-optional negatives stay at the root boundary. Required focused verification includes unchanged versioned persistence on each host and is explicitly fullSuite=false. Full integration remains later work. Declaration inference, type-safe submission closures and every claimed race still need real source/compiler/runtime proof after design approval.

## Conformity and deviations

Conforming planned path is exported makeTypedFlow/public method to private capture/preparation, mandatory checkpoint staging, short core CAS and independent delivery workers. It follows packages-owned Effect workflows, accepted087 Schema-derived variants and one shared integrity traversal. Unit and real installed archive paths exercise this core protocol; unchanged concrete browser tests are a separate regression boundary.

Intentionally different proposed policies are trusted arbitrary-class capture/isolation, Effectful public operations, per-call Context, revision conflict without callback replay, always-changed replacement, initial observer delivery and explicit separation of core acceptance from native activation. These policies are architecturally sound within the named core boundary, subject to the two failure amendments above.

Unverified remain declaration compilation, implementation/source acceptance, native rendering/DOM/ports/preservation/reload, typed transitions/persistence, pinned behavior, all original100069 members/300 host cells, full-suite integration, CI/devices/performance and collector delivery. REVISE grants no execution or product approval.
