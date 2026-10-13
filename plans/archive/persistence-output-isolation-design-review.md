# Independent design review: persistence output isolation

2026-09-30, main `841be137e253cf19c665269eaaa79edc19abf3c3`.

**APPROVE the narrow 070 saved-output ownership correction.** Detaching encoded saves in the existing persistence module is a routine correction to output ownership. It preserves the approved format and one accepted document authority. This verdict accepts the amendment's design/scope only; the moving complete-persistence-integration source and its required gates remain subject to primary review.

Only this nonnumeric planning record was authored. No product source, frozen candidate, dependencies, oracle or evidence was changed; no tests, builds, browsers or verification gates ran. The architect/type-system/TypeScript/unslop rules and `docs/standards.md` govern this review. No memory-derived implementation claim is used.

## Personally inspected alias and public paths

The current frozen-v1 schemas declare node/edge data as `S.optional(S.JsonObject)` at `packages/core/src/domain/flow-persistence.ts:25,63`. Installed Effect rc.116 defines `JsonObject = Record(String, Json)` at `node_modules/effect/src/Schema.ts:15405`; Json uses its AST declaration at :15379. That declaration validates a JSON tree then returns `InternalParser.sameExit`, preserving the nested input value (`node_modules/effect/src/SchemaAST.ts:5137-5142`). Its validator rejects cycles and non-JSON prototypes/leaves at :5075-5092 and :5056-5058. Schema validation is therefore not a deep isolation boundary. Copying the outer record or node alone does not remove nested object/array aliases.

Production paths inspected separately:

- **Vanilla:** public `mountFlow` comes from `apps/vanilla/src/public.ts:8`. `mount-flow.ts:8426-8431` makes the public snapshot detached, but legacy `getSavedSession` passes the accepted closure document/viewport directly to `encodeSavedFlowSession`. That calls `encodeSavedFlowDocument`, whose selected-field removal is shallow and whose schema result is returned directly (`flow-persistence.ts:148-159,181-187`). A nested saved-data alias can therefore reach accepted authority without a command.
- **Foldkit:** public `createProgram` is exported by `packages/foldkit/src/public.ts:2`. `graph.ts:462-463` passes the Runtime model document directly to the same encoder. `application.ts:1811-1817` decodes that returned save into the response and later responds through the existing port/client. Another JsonObject decode does not create independent nested values. The client success path similarly decodes `SnapshotResponseSchema` at `snapshot-client.ts:97-102`; it cannot repair an ownership alias by validation alone.
- **Vue:** `use-flow.ts:359-364` encodes the provider snapshot. The provider builds it through `createFlowSnapshot` (`flow-canvas.ts:833-837`; `flow-snapshot.ts:49-56` performs structuredClone and recursive freeze). This differs from direct accepted-authority input in the other two hosts, but the common writer should still return detached saved values with consistent ownership. A Vue-only throw from mutating frozen nested data would not prove the direct-authority cases are fixed.

The moving `/Users/richardmcandrews/.codex/worktrees/complete-persistence-integration/flow` was inspected as data, not an accepted source snapshot. At inspection, `flow-persistence.ts:189-200` still returned the legacy encoded projection directly; additive :306-317 already used structuredClone on both branches. Session composition was :222-228 and :320-326. These lines and contents may move while the preparer works. No claim is made that the additive alias remained reproducible in this inspected intermediate state, or that its current cloning was finally accepted.

Its real additive consumers were also inspected: Vanilla `mount-flow.ts:8433-8440`, Vue `use-flow.ts:438-445`, Foldkit `graph.ts:465-471` and both Runtime producers `application.ts:1902-1946`. They consume the same persistence writers, so the core output boundary is the appropriate shared owner. A host-only clone would leave direct core callers and other hosts inconsistent.

## Approved correction and invariants

Keep authoritative schemas, projection, graph-integrity/format guard, version selection and synchronous error behavior unchanged. After successful schema encoding, detach the projected returned value before it escapes. Existing structuredClone is appropriate for this supported concrete JSON/tuple/scalar envelope and preserves raw own undefined; no new dependency, hand-written recursive JSON implementation or generic abstraction is needed. Applying this policy in the existing persistence file covers legacy document/session and additive version1/version2 output. A session can compose an already detached document with its schema-encoded scalar viewport; avoid unnecessary repeated cloning when isolation is already established.

Do not use JSON.stringify/parse as an isolation mechanism: JSON omission would erase raw own-undefined distinctions, and JSON conversion is a different contract from returning the encoded JavaScript envelope. Do not substitute deep freezing of shared references: that would freeze accepted inputs and could change caller behavior while retaining aliasing. Returned output need not gain a new runtime immutability promise; detachment lets a caller mutate its own copy without altering input/accepted authority. Preserve current Schema-derived readonly declaration types and literal-v1 return inference.

Clone the encoded projection rather than replacing encoding with a clone of the live document. Otherwise selection, host/transient fields or unapproved excess fields could leak. Format predicates must still see original presence before projection/JSON omission. Legacy rejection precedence and exact approved errors remain origin → native → noncanonical for valid accepted extensions; invalid graph identity remains ordinary failure. The frozen reader/writer fixture remains untouched and continues to compare values/field presence, not original object identity. Version selection is still exactly the approved single complete v2 policy; detachment introduces no new format/code.

The amendment is confined to the already authorized persistence module and its meaningful tests plus existing authorized public-owner proof files. It does not authorize unrelated snapshot/node/selectors/client payload isolation changes, a second accepted graph, imported oracle changes, host geometry, dependency changes or another client. Existing client-overload approval remains unchanged.

## Required implementation evidence

For legacy document and session and additive document/session in both v1/v2 branches, construct valid graphs with meaningful nested **node and edge** objects and arrays. Assert returned nested identities differ from input, then mutate the actual returned nested object properties and array contents and prove the input remains unchanged. Compare exact output values/presence with the expected projection before mutation, retaining raw own-undefined assertions and old-oracle/literal-v1/version/failure matrices. Include repeated saves so one returned value cannot alter another independently produced value. Shallow top-level inequality or mutation of a test-created clone is insufficient.

Use actual public ownership proof: Vanilla controller save and the real Foldkit createProgram → Runtime.embed → typed ports/shared-client path. Mutate returned **savedSession data**, then reread accepted state through the public owner and prove unchanged nested values, viewport/document revision where exposed, and zero accepted-state notifications. Exercise canonical legacy/additive1 and accepted extension additive2; unsupported legacy format failures must still emit exactly the existing failure and no success/mutation. A frozen detached snapshot or externally cloned fixture supplied to the writer alone cannot reproduce the direct-authority risk. Preserve client-before-Runtime disposal and existing failure/recovery assertions. Vue's path may supplement these direct-owner tests.

No production private setter, unchecked cast, any, swallowed mutation exception or changed expected format is needed. Readonly declarations do not prevent a JavaScript consumer from attempting mutation; test that actual returned data can change while authority cannot. The public test should retain an independent before-value snapshot so an alias cannot silently change both expected and observed values.

Required focused/full source acceptance gates remain those of the complete 070 stage. This review ran none and makes no final source acceptance claim. The source owner must record the concrete correction, actual tests and exact frozen diff before primary approval.

## Reviewed identities

- Main amended 070 plan SHA-256: `de0d5f02850240326e0e4f380b95e2a16ea7ee7946aad393d155f410fbf1be58`.
- Main persistence source SHA-256: `0e2d96a75ff22718d02c1a3768b02b1875eddfdef23c8f65eef1b9e1f0227a1b`.
- Moving integration persistence source at inspection SHA-256: `4193b1c33d5cbd0aa8d28c9912748b1881bc53555a526964b8e68b837c5a3fd2`.

These identify read inputs only, not accepted implementation artifacts.

## Conformity and deviations

**Conforming design:** shared encoded-output detachment enforces the existing one-authority/public-copy ownership contract while preserving exact supported values, raw presence, schema projection, literal1, version choice and typed failures. Boundary: future core mutation tests and actual public Vanilla/Foldkit owner proof.

**Intentional difference from the historical writer:** nested saved-output object identity is independent of caller/accepted input. The frozen historical oracle remains authoritative for serialized fields/values; its incidental nested aliases are not a desired mutation capability.

**Unverified/held:** implementation source and required gates, all-host rendered restoration and 081 activation, arbitrary generic/transformed/class codecs and isolation capabilities under original069, genuine unnamed/nested074, native accessibility068/074, full original member closure, CI/device/collector evidence. This concrete JSON correction cannot establish general class/function codec isolation or broader persistence completion.
