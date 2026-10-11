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

Primary read the full [independent review](077-independent-design-review.md) and verified its source boundaries on 2026-09-30. APPROVE exact bounded fields/presence/legacy failure design. Public core snapshots establish retained values; extension-bearing legacy SnapshotRequest intentionally fails and cannot double as a succeeded retention read. Runtime retention can use accepted-state emissions after a replacement with a visible old-field change; own undefined alone need not increment the JSON-based revision. Recovery uses the same mounted Runtime, with client disposed before Runtime. The proof fixture and installed-declaration scope supplement above makes these exact tests executable without changing production ownership. This is design approval, not source acceptance or native rendering closure.

## Executor pre-edit record, 2026-09-30

Isolated base is exact841be13. Frozen install exited0; lockfile is unchanged. Reviewed live/frozen structs and public decode/snapshot, typed Runtime producer and client paths against the independent review. Planned executable inputs are a valid one-node/self-edge document with each approved field missing, own undefined, exact Boolean or String values, and null/wrong primitives. Core assertions inspect full decode, Object.hasOwn, detached frozen snapshots, separate JSON omission, invalid graph integrity, actual decoded-input legacy rejection and unchanged snapshot, old-field undefined/nonempty acceptance, selected omission, frozen-reader stripping/constraint rejection and deterministic origin-first guard. The mounted proof initializes a real public Runtime with extensions, replaces through typed HostAction with a visible label change, inspects accepted-state emissions, requests correlated legacy failure, then restores ordinary old content and requests success on the same Runtime. Disposal starts a pending request and disposes client before Runtime. Installed compile-only probes cover all exact node/edge fields and reject null/wrong primitives/edge ariaDescription in all three existing consumers. No rendering, origin geometry or v2 implementation is proposed.

## Executor checkpoint: stopped at second quality failure

Execution worktree: `/Users/richardmcandrews/.codex/worktrees/native-schema-retention/flow`, exact base841be13. Candidate is uncommitted. Completed orderedsteps1–3 source/tests and authored step4 proof; runtime execution and step5 acceptance remain incomplete.

Actual commands and results:

- `bun install --frozen-lockfile`: exit0; bun.lock unchanged.
- `bun run check:architecture`: exit0, `/tmp/flow-077-architecture.log`.
- First `bun run check`: exit1 for new test spacing/dynamic assertions and lint findings, `/tmp/flow-077-check.log`. Focused repair removed those findings without production changes or casts.
- First `bun run typecheck`: exit2 for encoded port outputs versus branded domain types and heterogeneous it.each input, `/tmp/flow-077-typecheck.log`. Repaired by actual FlowStateChangeSchema decoding at the public outbound boundary and uniform case rows.
- Second `bun run typecheck`: exit0, `/tmp/flow-077-typecheck2.log`; all four package builds and root TypeScript passed.
- `bun run test -- packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/foldkit/src/application.test.ts packages/foldkit/src/snapshot-client.test.ts`: exit0,4files/160tests, `/tmp/flow-077-focused-tests.log`.
- Second `bun run check`: exit1 for three diagnostics at flow.schema.test.ts531, nested/negated ternary in the JSON expected-record assertion, `/tmp/flow-077-check2.log`.

STOP follows the required twice-after-focused-repair quality boundary. No browser, installed consumer, verifier, docs generator, or full-suite run occurred. Browser ports were released to the primary. A specified closing-loop revision can replace that nested conditional with separately computed originalRecord and expectedJsonRecord, then rerun quality and the pending proof gates. No source repair after STOP is claimed.

Authored scope: exact live schemas, full-decode and frozen-legacy matrix tests, two new dedicated Foldkit E2E files, compile-only probes in three existing consumer typecheck files, focused verification configuration and this record. Frozen persistence schemas/guards/fixture, Foldkit production/client code, renderers, origins and v2 remain unchanged. Parent/index/catalog acceptance and all original semantic member cells remain open.

## Independent review revision1 checkpoint

Primary independently inspected the failed conditional and authorized an exact test-only extraction. originalRecord and expectedJsonRecord now replace the nested conditional, with every presence/value assertion preserved and no lint-policy change. `bun run check` then exited1 for readable-spacing before expectedJsonRecord at flow.schema.test.ts526, `/tmp/flow-077-review1-check.log`. The spacing repair was placed before originalRecord; another check still exited1 with the same526diagnostic, `/tmp/flow-077-review1-check-final.log`. This remaining exact diagnostic was reported to primary before further retries. Browser/consumer/verifier runs have not started. No new substantive defect was observed; source acceptance remains pending.

## Final independent review revision2 and frozen blocked result

Primary specified the final revision2 blank line immediately between originalRecord and expectedJsonRecord. Applied exactly, then scoped `oxlint --fix` and oxfmt on flow.schema.test.ts. Prior revision1 placed the blank line before the wrong declaration; the two same526diagnostics are recorded above. No assertion was removed, no semantic source change was made by these revisions, and lint policy is unchanged.

Actual final results:

- Scoped lint/format and `bun run check`: exit0, `/tmp/flow-077-review2-scoped-lint.log` and `/tmp/flow-077-review2-check.log`.
- `bun run test:conformance:foldkit -- native-schema.e2e.ts --workers=1`: exit0,1/1actual public mounted Runtime test, `/tmp/flow-077-native-schema-browser.log`. Assertions cover exact retained values/presence, initialization and typed replacement, exactly matching failure/no success/no accepted notification, unchanged document/viewport after save failure, ordinary successful recovery on the same Runtime, selected omission, zero page/console-error defects and pending client-before-Runtime disposal settling once.
- `bun run docs:generate-api`: exit0, `/tmp/flow-077-generate-api.log`.
- `bun run verify --list`: exit0, `/tmp/flow-077-verify-list.log`; saved focused scope includes baseline quality/architecture/package builds/typecheck/unit tests, docs/catalog/api-members/contracts/traces/consumer, Vanilla/Vue public-state and Foldkit native-schema/public-state.
- `bun run verify`: exit1 at unit tests, `/tmp/flow-077-verify.log`. Quality, architecture, package builds and typecheck passed.46unitfiles had494passed/1failed tests. Existing flow-edge.schema.test.ts197still includes `{ariaLabel:''}` among invalid inputs, and213expects a throw. Approved live String edge labels now accept that input. This file is outside the authorized exact source/test list. No repair or retry followed this substantive failure.
- `git diff --check`: exit0. bun.lock, frozen-v1 production schemas/guard/fixture, Foldkit application/client and renderer production paths are unchanged.

**BLOCKED/frozen candidate**, uncommitted in `/Users/richardmcandrews/.codex/worktrees/native-schema-retention/flow`. Browser/consumer ownership released to primary. Installed consumer, selected public-state browser suites, docs/catalog/API/contracts/traces verifier gates were not reached and are not claimed passed. The dedicated mounted test and160focused tests are positive evidence; mandatory focused acceptance is incomplete. Primary owns any explicit existing-test scope supplement, final diff/evidence review, index and acceptance. No further autonomous retry remains in this closing loop.070round trips,068/074renderers, generic and parent member cells remain open.

## Conformity and deviations

- Intentionally different architecture: Schema-owned stored metadata and frozen Flow envelopes; boundary is canonical decode/public snapshot/frozen reader/client, not React storage.
- Source-grounded approved contract, implementation unverified: Boolean connectability and optional String roles; arbitrary role browser recognition remains unverified.
- Held behavior: effective connectability, computed roles/names/descriptions and all native renderer fields remain 068/074. This supplement does not close parent acceptance.
