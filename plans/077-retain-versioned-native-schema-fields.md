# Plan 077: Retain approved native fields at the canonical document boundary

> Execute only after independent architecture review. Work in an isolated worktree. The coordinator owns the index and parent acceptance. No commits, merges, push or publication without user authorization. Drift check: `git diff --stat 841be13..HEAD -- packages/core/src/domain/flow.schema.ts packages/core/src/domain/flow-persistence.ts packages/foldkit/src/application.ts packages/foldkit/src/snapshot-client.ts` and `git status --short`. Accepted origin additions are expected; compare the quoted field contracts and stop on disagreement.

## Status

- Priority P1; effort M; risk HIGH; category migration.
- Planned at `841be137e253cf19c665269eaaa79edc19abf3c3`, 2026-09-30.
- Required bounded dependency of 070 and staged source step of approved 075; parent 057/066 remains open.
- Status: ARCHITECTURE APPROVED — independent `review_077` source review, 2026-09-30; implementation and primary source/evidence acceptance pending.
- Depends on accepted 075 frozen-v1 projection and correlated failure client already integrated on main. Can follow 067 core origins; does not require completed 068/074 renderers.

## Problem and current state

070's approved single v2 body includes native metadata and origins. Restoring it through the normal live decoder would presently strip unknown connectable/ariaRole and reject explicit empty labels/descriptions. The live schemas must retain the exact approved fields before v2 implementation; adding a serializer alone would lose accepted intent.

Personally inspected baseline excerpts:

```ts
// packages/core/src/domain/flow.schema.ts:63-82 (node)
focusable: S.optional(S.Boolean),
draggable: S.optional(S.Boolean),
deletable: S.optional(S.Boolean),
ariaLabel: S.optional(S.NonEmptyString),
ariaDescription: S.optional(S.NonEmptyString),
// :111-134 (edge)
ariaLabel: S.optional(S.NonEmptyString),
```

The live structs have no connectable or ariaRole. FlowNode/FlowEdge types derive from these structs (:84,136), and FlowDocument composes them (:138-141). Frozen saved-v1 structs are independently defined in `flow-persistence.ts:17-78`, not derived from expanded live fields. `assertLegacyFormat:102-124` already rejects own origin first, then own connectable/ariaRole and empty labels/descriptions. Foldkit's actual `SnapshotRequest` update branch at `application.ts:1811-1831` catches SavedFlowFormatError and emits exactly one correlated failure command. The existing snapshot client removes pending entries before settling and owns disposal (`snapshot-client.ts:89-118,146-175`). Preserve those boundaries.

Follow `docs/standards.md:7-16`: framework-independent meaning, Effect workflows and Schema-derived types, unknown inputs decoded at boundaries, one accepted document. Exact role policy was approved in 075: optional String, including empty, whitespace and custom strings. This is stored metadata; recognition by a browser and effective inherited connectability remain separate renderer evidence.

## Exact source scope and contract

Allowed: `packages/core/src/domain/flow.schema.ts`, `flow.schema.test.ts`, focused `flow-persistence.test.ts`; narrowly `packages/foldkit/src/application.test.ts` and a dedicated public typed-Runtime proof using existing public APIs if required. The reviewed implementation proof supplement permits new `apps/foldkit/e2e/native-schema-fixture.ts` and `native-schema.e2e.ts` using actual public `createProgram`/`Runtime.embed`/typed ports; existing `handle-refresh-fixture.ts:1-70` is the public mount pattern and the existing strict-port Playwright config remains unchanged. Add exact field positive/negative probes to each existing `tests/consumer/**/consumer.typecheck.ts`; keep them compile-only and preserve runtime probes. Update verification scope, relevant documentation/PROGRESS and this execution record. Coordinator owns parent/index/catalog status. Do not change app production/renderers, dependencies/lockfile, measurement policy, frozen-v1 schemas/fixtures, effective global defaults, v2 implementation or arbitrary DOM metadata. An unforeseen production-path edit requires a reviewed supplement before coding.

Implement exactly these authoritative Schema fields:

```ts
// existing FlowNodeSchema
connectable: S.optional(S.Boolean),
ariaRole: S.optional(S.String),
ariaLabel: S.optional(S.String),
ariaDescription: S.optional(S.String),
// existing FlowEdgeSchema
ariaRole: S.optional(S.String),
ariaLabel: S.optional(S.String),
```

No edge ariaDescription. Missing new fields remain missing; own undefined new fields are accepted and retain own presence in validated in-memory full documents/public snapshots. Explicit true/false, empty/whitespace/custom roles and labels/descriptions retain exact values. Reject null and wrong primitive values. Do not inject effective global defaults into stored records. JSON omits undefined and promises no own-presence restoration. Existing patch transports have their own presence limitations; do not change them in this slice.

Legacy save continues to reject supported new semantics, including own undefined connectable/ariaRole, through the existing native-fields-require-versioned-session failure. Empty strings reject; existing old-field own undefined/nonempty values retain legacy acceptance. Origin-requires-versioned-session deterministically wins when both extension families exist. Frozen v1 old readers retain old acceptance and unknown-key stripping. Retention is not native rendering acceptance and closes no 068/074 original cells.

## Ordered execution and required proofs

1. Compare live/frozen structs, public full-document decoder and existing failure/client branches. Record exact inputs/outputs and proposed tests before source edits. Run frozen install; lockfile unchanged.
2. Extend only the live structs. Test full decode, raw own-presence, detached public snapshot, wrong types, false/true/empty/whitespace/custom values and no materialized defaults. Use real `decodeFlowDocument` and snapshot entry points rather than Struct-only assertions. All existing schema/unit paths stay green.
3. Test the exact live-input/legacy-writer/frozen-old-reader matrix without modifying the independent frozen fixture. Inspect error codes and origin precedence; rejected saves must not mutate accepted snapshots. Raw own undefined and JSON omission are separate assertions.
4. Exercise actual mounted Foldkit Runtime via public initialization and typed update ports using the expanded ordinary document. Request legacy save via the existing public snapshot client: exactly one matching failure, zero success, zero Runtime defect, no accepted document/viewport mutation or accepted-state notification. Request an ordinary old-field document afterward and get success. Disposal and duplicate/foreign/late response cases settle once without leaks. Fabricated `application.update` model tests are supplementary, not a replacement for the producer proof.
5. Update only applicable docs/traces and focused verification scope. Primary reviews every changed hunk and reruns the required verifier before acceptance.

## Verification and done criteria

From isolated root: `bun install --frozen-lockfile`; `bun run test -- packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/foldkit/src/application.test.ts packages/foldkit/src/snapshot-client.test.ts`; `bun run check`; `bun run typecheck`; `bun run check:architecture`; relevant actual Runtime/browser proof; `bun run verify --list`; `bun run verify`; `git diff --check`. Every command exits zero, no new skips, unchanged lockfile. Include docs/catalog/api-members/contracts/traces/consumer checks when those artifacts change. Use meaningful installed positive/negative field probes when public declarations change. All browser suites run serially on strict owned ports coordinated with other executors.

- [ ] Independent design review approves exact fields/presence/legacy matrix before coding.
- [ ] Full decoder and public snapshot retain exact supported metadata and reject invalid values.
- [ ] Frozen v1 and its guard/error precedence remain unchanged.
- [ ] Actual typed Runtime producer/client failure and recovery/disposal assertions pass.
- [ ] Focused verifier with recorded profile/scope passes and primary reviews the full diff.
- [ ] 070 versioned round trips and 068/074 renderers remain explicitly pending; integration later runs `bun run verify:full`.

STOP on unsafe casts, validation bypass, a second graph, field loss at a Runtime boundary, expanding fields beyond this matrix, frozen-v1 changes, or a required gate failing twice after focused repair. Report exact evidence and preserve independent completed work. Native renderer behavior is not proved by retained metadata.

## Maintenance and conformity

Future live fields require an explicit version predicate/reader policy before schema extension. Use existing FlowSpan/FlowAttribute names at decode/lifecycle/failure boundaries; no pointer logs or collector-delivery claim. Production traces start at public entry, separate actual Runtime/browser evidence from fabricated unit paths and end with Conformity and deviations. Imported research artifacts remain immutable.

## Independent architecture acceptance

Primary read the full [independent review](archive/native-schema-independent-design-review.md) and verified its source boundaries on 2026-09-30. APPROVE exact bounded fields/presence/legacy failure design. Public core snapshots establish retained values; extension-bearing legacy SnapshotRequest intentionally fails and cannot double as a succeeded retention read. Runtime retention can use accepted-state emissions after a replacement with a visible old-field change; own undefined alone need not increment the JSON-based revision. Recovery uses the same mounted Runtime, with client disposed before Runtime. The proof fixture and installed-declaration scope supplement above makes these exact tests executable without changing production ownership. This is design approval, not source acceptance or native rendering closure.

## Conformity and deviations

- Intentionally different architecture: Schema-owned stored metadata and frozen Flow envelopes; boundary is canonical decode/public snapshot/frozen reader/client, not React storage.
- Source-grounded approved contract, implementation unverified: Boolean connectability and optional String roles; arbitrary role browser recognition remains unverified.
- Held behavior: effective connectability, computed roles/names/descriptions and all native renderer fields remain 068/074. This supplement does not close parent acceptance.
