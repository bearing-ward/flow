# Plan 084: Preserve document origin through edits and result transport

## Status and authorization

Execution status BLOCKED on2026-10-01. Two focused quality repairs exhausted; final check still fails require-readable-spacing at flow-edit.test.ts:428. No third repair or dependent gate advancement is authorized. Exact isolated source fix remains unaccepted, with its logs and final inventory preserved. Historical design approval and dispatched9d88ad57 plan identity remain below; stop does not alter083's separate frozen budget.

Priority P1, effort S, risk MED. Planned at main841be137e253cf19c665269eaaa79edc19abf3c3 on2026-10-01. Depends only on accepted082. Architecture review pending. The user's Resolve blockers request authorizes execution of this newly diagnosed core defect in a separate isolated checkout after design review. Primary edits only plans/. No commits, merges, pushes, publication or cleanup. This is a narrow core repair, not a third083 quality repair or resumption of its stopped host candidate.

083 remains frozen and unaccepted after its permitted quality repairs. Its native lifetime and preservation proof remain separate. Do not import any083 source or continue its browser/check sequence. The accepted082 prerequisite is a frozen117-path composition with116 hashed outputs plus its provenance record, not main source acceptance or final081 activation.

## Inputs and drift gate

Create a detached disposable checkout at the exact main commit, named edit-origin-preservation. Assemble only the accepted082 output paths from `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow/plans/ordered-legacy-integration-provenance.json`. That record must hash143fc0430e8dee2da7bd6a2c02404162d268f992f0475b6fbca6f5d784caa9ce. Its `outputFiles` list has116 hashed source/plan/evidence paths; independently verify every actual input hash before copying. Copy the provenance record itself as the117th path without editing it. Stop on missing paths, deletes, extra inputs or hash drift. Do not modify accepted082 or stopped081/083 checkouts.

Record baseline, all input hashes, manifest/lock identities, actual copied inventory and input verification in the owned084 provenance. Install with `bun install --frozen-lockfile`. Match these source excerpts before editing.

## Defect and architecture

The authoritative `packages/core/src/domain/flow.schema.ts:143-149` defines `FlowDocumentSchema` with nodes,edges and optional nodeOrigin. Node origins are finite two-number tuples, unclamped; explicit[0,0] remains metadata. Types derive from Schema. Graph meaning belongs in core. Existing edit spans and integrity/deletion behavior must remain unchanged.

`packages/core/src/domain/flow-edit.ts:113-116` constructs a deletion document with only filtered nodes/edges, dropping global origin before final validation. The other operation branches spread the current document. `:259-285` validates the final candidate, then constructs the returned document with only mapped nodes/edges, again losing origin after ordinary edits, no-ops and collection updates. The mappings intentionally restore original unaffected node/edge references; preserve them exactly.

`packages/core/src/domain/flow-edit.schema.ts:93-101` independently redeclares the result document as nodes/edges only. Even a corrected runtime value loses Schema-owned metadata through result decoding/encoding. Use the already authoritative FlowDocumentSchema for this field. Do not add a second metadata schema, manual type or custom encoder.

Actual call paths include core `flow-runtime.schema.ts:1377`, Vanilla `mount-flow.ts:8978`, Vue `flow-canvas.ts:2181-2183` and Foldkit `graph.ts:669,719` on the accepted082 snapshot. Approved deletion calls prepareFlowEdit through `flow-edit.ts:378`. Foldkit Graph result schemas at `graph.ts:291,330`, delete approval schema at `delete-approval.ts:79` and public edit-result schema at `application.ts:189` consume FlowEditResultSchema. Source locations will differ in the separately frozen083 candidate. The packed083 probe observed origin absent after ordinary public node edits, before preservation could be established. Repairing this core bug does not establish genuine HMR restoration.

## Exact scope

Inherited117 paths may be copied unchanged. New deltas may touch only:

- `packages/core/src/domain/flow-edit.ts`: add `...document` before filtered deletion arrays and `...validated` before final mapped arrays. No other behavioral changes.
- `packages/core/src/domain/flow-edit.schema.ts`: import existing FlowDocumentSchema and replace only the narrower result-document struct with it.
- `packages/core/src/domain/flow-edit.test.ts`: meaningful regression tests and Schema result transport tests.
- `packages/foldkit/src/application.test.ts`: actual existing EditResponseSchema and DeleteResultSchema packet decode/encode regressions only. Use public core edit/delete helpers to construct genuine results, not a private Runtime setter. Label these as protocol units rather than mounted runtime evidence.
- `verification.config.json`: focused activeWork084; checks docs,contracts,consumer; all three hosts select only existing public-edits.e2e.ts and versioned-persistence.e2e.ts.
- Regenerated `docs/api-reference.md` only if the existing generator changes it for this authoritative result contract.
- Owned `plans/084-preserve-origin-through-edits.md`, `plans/archive/edit-origin-preservation-execution.md`, `plans/edit-origin-preservation-provenance.json` and copied exact design review.

No adapter production source or browser source/test edits; only the named packet-unit addition is allowed. No HMR runner, lifecycle client/observer, dependency/lock/compiler/lint policy, imported research, generated research summary, frozen oracle or main/index edits. Do not change legacy saved payloads, integrity priorities, deletion eligibility, failure/error schemas or public methods. No casts,any,test-only API, weakened assertions/skips/timeouts. Primary owns the main index.

## Steps and tests

1. Verify/copy exact082 inputs, save receipt and frozen install. Before edits run `bun run check` and `git diff --check`, both exit0. Save every log outside the source inventory. Do not reformat inherited inputs.
2. Add tests in the existing Effect/Vitest flow-edit.test.ts style. Decode fixtures through decodeFlowDocument. Reproduce ordinary label/position edits and result Schema transport losing nonzero origin, and accepted deletion losing origin. A test-only run should fail at these exact assertions against unchanged production. Keep this intentional pre-fix regression separate from required gate failures.
3. Apply only the two document spreads and authoritative result Schema. No validator/metadata owner is added. Preserve existing reference restoration and spans. Targeted existing formatter is allowed for owned changed files only.
4. Prove nonzero and unclamped origin plus explicit[0,0] survive: node label/position edit, node/edge data merge/replace, collection replacement/addition, empty transaction/missing-target no-op, deletion, delete+edit compound transaction and prepare/finalize approved deletion. Cover absent and own-undefined using actual Schema semantics, asserting absent inputs do not gain an origin key. Preserve unchanged node/edge identity, original input immutability, deletion IDs/order, protected-delete failure, invalid final graph rollback and denial returning original document. Existing eight tests/assertions remain. Add direct FlowEditResultSchema decode/encode assertions for retained origin and malformed/null/nonfinite-origin rejection; this is a real serialization boundary regression. In the existing Foldkit application test, encode/decode genuine prepared edit and finalized delete results using application EditResponseSchema and delete-approval DeleteResultSchema, asserting retained origin and unchanged correlation/result contents. No transport wrapper or production change is needed.
5. Run `bun run test -- packages/core/src/domain/flow-edit.test.ts packages/foldkit/src/application.test.ts` all pass. Save scope as specified, regenerate API docs, and run `bun run verify --list`, `bun run verify`, and `git diff --check`, all exit0. Verification includes all unit tests, quality, architecture, package builds, typecheck, selected existing edit/persistence browser suites on all three strict isolated ports, docs/contracts and three packed consumers. Check4176/4177/4178 free before starting and after completion. Do not reuse or terminate a foreign server.
6. Freeze exact changed/new file inventory, input versus delta hashes, source patch, gate logs/profile/counts and port release. Primary independently reads complete production/test delta, Schema consumers and verification scope; reruns required gates; and obtains independent source approval before marking084 complete. No083/full-integration/parent parity acceptance follows.

## Required acceptance and STOP rules

All input hashes match and only approved deltas differ. Intentional regression fails before fix, then focused tests and saved focused verify pass with meaningful assertions, existing browser tests unchanged and packed consumers passing. Primary independently reproduces the focused verifier and checks exact frozen hashes/diff. Full verification remains required for later083 integration; this isolated core repair is not that milestone.

Stop on input drift, different source excerpts, an unowned port, out-of-scope requirements or new architecture. For a concrete required-check failure, diagnose and allow at most two focused repairs, then STOP/freeze/report. At most two formal review revisions. Do not carry083's spacing fixes into this checkout or reset its exhausted budget. Preserve all failed logs. Acceptance of084 permits a future reviewed host integration to consume its exact core delta; it does not authorize editing the frozen083 candidate.

## Conformity and deviations

Conforming by design: existing document Schema remains authoritative; Effect validation, transaction atomicity, protected deletion, structural sharing and observability retain their existing ownership. Core unit and Schema transport boundaries will prove the defect repair. Existing mounted edit/persistence tests guard adapter consumers, without claiming new origin rendering or genuine preserved-runtime proof. Full host integration, CI/devices/collector and broad parity remain unverified.

Maintenance: when FlowDocumentSchema gains metadata, document transformations and FlowEditResultSchema should preserve that same authoritative document contract. Keep explicit-origin and absent-key regressions so a narrower result projection cannot silently return.
