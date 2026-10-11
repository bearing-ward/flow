# Plan089 snapshot inference amendment

Status: proposed bounded design correction, ready for independent review. The stopped candidate remains `STOPPED_NO_SOURCE_ACCEPTANCE`. This document authorizes neither source resumption nor acceptance of the actor.

Use a singleton `S.Union([S.toType(document)])` for the snapshot's document field. This is a real Schema constructor that gives the container field required, readonly markers while retaining exactly `C['Type']` on both Schema sides. Keep the inferred `ReturnType` type alias. The bounded diagnostic compiles the actual actor with this expression, without narrowing `FlowGraphCodec`, changing the factory or overriding the compiler.

## Frozen inputs and scope

The inspected candidate is `/Users/richardmcandrews/.codex/worktrees/typed-flow-actor/flow`, abbreviated `A` below. Its evidence directory is the sibling `/Users/richardmcandrews/.codex/worktrees/typed-flow-actor/typed-flow-actor-evidence`, abbreviated `E`. Installed library citations below are under `A/node_modules`, not upstream documentation from another release.

| Input | SHA-256 or verified version |
| --- | --- |
| `E/stopped-freeze.json` | `c2d387d00033fbc3eb02ff2391eef223dbebabed97afba10ce2ac8f73bae2f2e` |
| Main `plans/typed-flow-actor-design.md` | `56b7f9f6d66a245f4113a6a96d1ce495f1cd87c2a2677788919cf489c1363c82` |
| Main `plans/089-create-isolated-typed-flow-actor.md` | `a8e1b2f3b504916c2cc90c7d571480970123a34f52e6b66593eeb9187ee4296f` |
| Effect | `4.0.0-rc.116` |
| Foldkit | `0.163.0` |
| TypeScript | `5.9.3` |

After the diagnostic, all 1,503 candidate source receipts and nine evidence receipts were rehashed against the stopped manifest with zero mismatches. The two approved main packets retain the hashes above. The accepted087 factory present in the candidate was read, remains unchanged and is included in that source verification. Its builders remain the actual fixture dependency, not a replacement graph schema.

This pass applied the improve skill, its closing-the-loop reference, and audit-playbook Correctness / Bugs, Test Coverage and Finding format. Repository contents were treated as evidence. Only new diagnostic and amendment files under main `plans/` were written. No product source, existing frozen packet, dependency, configuration, build output, member ledger or external stopped receipt changed. No build, shared verifier, archive install, browser, port or actual actor was run.

## [CORRECTNESS-089-SNAPSHOT] Give the snapshot container its own required field markers

- **Evidence**: `A/packages/core/src/domain/flow-typed-actor.schema.ts:16-17` builds `Struct` directly from `toType(C)` and derives its public alias from that result. `A/packages/core/src/domain/flow-data-contract.schema.ts:24-29` accepts the complete `ConstraintCodec` domain. `A/node_modules/effect/src/Schema.ts:2468-2490` retains the input's generic key markers in `toType`; `:3173-3222` conditionally computes optional and mutable Struct keys. `E/actor-typecheck-1.log:9` onward records actual actor construction/access failures.
- **Impact**: generic actor construction and access fail TypeScript. A concrete optional-key graph also incorrectly makes the snapshot document key optional, although the accepted089 snapshot contract requires it. The unresolved conditional affects sibling revision access in the generic actor.
- **Effort**: S for the expression and meaningful regression assertions, followed by all existing089 acceptance gates.
- **Risk**: LOW for the intended required snapshot value contract; MED for consumers inspecting the newly proposed document field's Schema metadata. That field becomes a Union instead of a direct toType wrapper.
- **Confidence**: HIGH for this compiler/Schema boundary. The actual actor source passed virtual strict compilation; runtime parser tests confirm key behavior. Actor lifecycle and installed public declaration acceptance remain separate.
- **Fix sketch**: put the decoded document schema inside a singleton Union, then let the authoritative Struct infer the snapshot type. Keep every actor method, failure, service channel and checkpoint lifecycle from the approved packet.

The original failure is not evidence that arbitrary graph codecs need a narrower constraint. `Constraint` permits optional and mutable field markers at `Schema.ts:798-802`; those wrappers do not change the underlying graph Type. The factory at `flow-data-contract.ts:16-24,33-80` correctly retains its input schemas and correlated node/edge payloads. The correction belongs to the snapshot container.

Actual production uses are `flow-typed-actor.ts:65-69` detached delivery, `:125-127` accepted capture, `:180-183` observer publication, `:243-261` reads and updater delivery, and `:275-276` listener delivery. None requires an alternate graph authority or a callback cast.

## Exact proposed Schema representation

Apply only this expression change at `flow-typed-actor.schema.ts:16`. The alias at line17 stays unchanged.

```ts
export const createFlowTypedSnapshotSchema = <C extends FlowGraphCodec>(
  document: C
) =>
  S.Struct({
    revision: RevisionSchema,
    document: S.Union([S.toType(document)]),
    viewport: ViewportSchema,
  })

export type FlowTypedSnapshot<C extends FlowGraphCodec> = ReturnType<
  typeof createFlowTypedSnapshotSchema<C>
>['Type']
```

Do not introduce a parallel handwritten snapshot type. The equivalent resulting shape is three readonly, required keys: revision from `RevisionSchema.Type`, document exactly `C.Type`, and viewport from `ViewportSchema.Type`. `Encoded` has those same values and required keys because `toType(C).Encoded` is `C.Type`, not `C.Encoded`. Both snapshot services are `never`. The snapshot Schema is a decoded-value boundary, not the document's asynchronous encoder or the finite JSON checkpoint Schema.

The installed Union interface at `Schema.ts:4673-4688` derives Type, Encoded, Iso and services from its members. It inherits the fixed required/readonly/no-default marker defaults at `:401-419`. Its constructor at `:4756-4760` calls `SchemaAST.union`, which creates a new Union AST with no field context at `SchemaAST.ts:3214-3220`. The runtime diagnostic confirms this AST is retained even with one member and that missing document is rejected for plain, optionalKey, mutableKey and constructor-default graph schemas.

This wrapper changes only the snapshot container key semantics. Nested node/edge optionality, default/no-data branches, brands, Date values and private class values remain under the same `toType(C)`. A constructor default on the whole C does not fill a missing snapshot document. A mutableKey on C does not make snapshot.document assignable. This is intentional and matches the approved089 required snapshot contract at main `typed-flow-actor-design.md:98-116`. Explicit undefined is rejected because the accepted graph Type is a graph object, not an undefined union.

Public Schema metadata is an explicit amendment: `snapshot.fields.document` is now a singleton Union; `.members[0]` is the decoded wrapper and `.members[0].schema` is the original C. Direct `.fields`, genuine Struct identity and the inferred Type/Encoded remain available. Consumers must not expect `snapshot.fields.document.schema` directly. No Model, port, saved-v1/v2 representation, JSON document grammar or concrete API changes.

The snapshot's viewport continues to use the existing `ViewportSchema` at `flow-runtime.schema.ts:42-48`. This amendment does not replace its Number coordinates with finite coordinates. The approved checkpoint viewport refinement and actual actor initialization/write validation remain required unchanged at `flow-typed-actor.schema.ts:10-15` and the approved089 packet. The diagnostic's successful parser inputs use finite coordinates; they do not substitute for those six actual actor rejection proofs.

The existing stopped log also records a distinct unused `FlowTypedCommitResult` type import at actor line4. The virtual compilation removed that unused import in memory so TS6196 did not obscure the inference result. A later authorized correction may remove that single import under the existing actor allowlist. No other actor expression changed in the diagnostic.

## Alternatives considered

| Option | Actual evidence and decision |
| --- | --- |
| Singleton Union | Recommended. Strict generic construction/access, real actor virtual compilation, Type/Encoded witnesses and runtime required-key behavior pass. The metadata change is disclosed above. |
| `S.requiredKey(S.toType(document))` | Rejected for the full accepted C domain. Installed `requiredKey` at `Schema.ts:2320-2336` only unwraps a real optionalKey wrapper. The bounded compiler reports TS2345 for this generic call. A branch/cast pretending all C are optionalKey would be dishonest. |
| Force `Struct.Type` with explicit optional/mutable key sets | Rejected as a substitute for the Schema correction. A type-only forced key view would disagree with the original runtime optionalKey parser, which permits missing document. It would also replace the public Schema's own inference with a second claimed authority. No such implementation was used. |
| Narrow C to required/readonly codecs | Rejected. The approved factory constraint accepts optionalKey/mutableKey wrappers and alternate whole-document Encoded types. Narrowing would change the accepted domain. |
| Private validating Declaration delegated through a Struct | Not required and not claimed proven in this pass. It would add an opaque parser/API boundary when the installed Union constructor already supplies the exact needed field semantics. No custom guard, declaration parser or forced annotations were used. |

## Diagnostic commands and actual receipts

Run from main `/Volumes/Sync/codex/9-19-26/flow` after checking the stopped freeze and installed versions. The script resolves types from candidate dependencies and writes only the named main plans receipts.

```sh
bun run plans/typed-flow-actor-snapshot-inference-probe.ts > plans/typed-flow-actor-snapshot-inference-run.log
```

Final execution exited0. `typed-flow-actor-snapshot-inference-compiler.json` records all compiler options and diagnostics; the original-generic diagnostic contains TS2322 and TS2339, the corrected candidate contains zero diagnostics, the requiredKey alternative contains TS2345, and all N01-N14 negative IDs have actual diagnostics. `typed-flow-actor-snapshot-inference-runtime.json` contains:

```json
{ "runtimeAssertions": 64, "documentTransforms": 0, "realActorRuntime": false }
```

The compiler uses installed TypeScript5.9.3 and the candidate's unchanged root options, including strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess and noUnusedLocals/Parameters. `noEmit` is already true. A compiler host supplies a virtual diagnostic source and two in-memory replacements: the Schema expression and the unused type import removal. The virtual filename `A/.089-snapshot-inference-probe.ts` is never written. Actual `flow-typed-actor.ts` is a compiler root and its real imports are followed. This is strict source compilation, not the stopped build/declaration command or the installed archive consumer gate.

Ambient generic values in the virtual source are static assignability witnesses only. They are not executed or used to produce an actor/schema value. The runtime tests use actual Schema constructors and unknown-input parsers. No cast, unchecked predicate, fabricated actor state, narrowed codec bound, altered compiler option or broad snapshot type is used.

| Negative ID | Required compiler rejection |
| --- | --- |
| N01 | Missing document even when C is optionalKey |
| N02 | Missing revision |
| N03 | Missing viewport |
| N04 | Missing document on snapshot Encoded side |
| N05 | Undefined graph |
| N06 | Assigning readonly document even when C is mutableKey |
| N07 | Incorrect node discriminator/data pairing |
| N08 | Unbranded NodeId |
| N09 | Missing read RI |
| N10 | Missing encoded input RC after RD/RE/RI are supplied |
| N11 | Missing updater RU after RE/RI are supplied |
| N12 | Missing listener RL after RI/Scope are supplied |
| N13 | Incorrect no-data branch payload |
| N14 | Encoded Date string supplied to the decoded snapshot Encoded view |

Each negative was first checked with a consumed `@ts-expect-error`, then independently compiled with the directive removed. The exposed log and JSON retain actual diagnostics and mapped IDs. The diagnostic does not replace Plan089's minimum18 archive/compiler cases.

Positive compiler witnesses retain arbitrary generic C.Type on construction and access, the singleton field's required/readonly flags on Type and Encoded sides, zero snapshot Schema services, original document RD/RE and independent actor channels. Reads require RI; decoded writes RE|RI; encoded writes RD|RE|RI|RC; update RE|RI|RU; observe RI|RL|Scope; encode RE|RI. Decoded construction requires RE|RI|Scope while encoded construction requires RD|RE|RI|RC|Scope. Equality witnesses use those exact channel unions, not broadened environments. Runtime fixtures retain Date and Counter private-class values without executing document encoding/decoding transforms, reject encoded Date strings and fake class shapes, retain omitted nested optional/no-data fields, reject wrong nested payloads, and exercise a whole-document string Encoded codec through its decoded snapshot view. Required valid ordinary values retain the same normal-equivalence self-result and JSON-derived encoding as the original Schema. These checks do not prove deep class isolation or arbitrary equivalence laws.

First failed receipts are preserved. The initial diagnostic fixture had unused imports under noUnusedLocals; its `first-compiler` and `first-original` logs/JSON remain. The first expanded fixture omitted the canonical node label on its positive node value; `expanded-first-compiler` log/JSON remain. Only fixture imports/labels were corrected. The genuine original TS2322/TS2339 failure remains separately in the final original log. No failing product gate was rerun or relabeled successful.

## Source execution handoff and STOPs

Primary and independent review must accept this amendment before the executor resumes. Preserve the original stopped snapshot and failure receipts. The bounded future product correction is only `flow-typed-actor.schema.ts:16` plus the unused import at `flow-typed-actor.ts:4`; regression additions belong existing owned `flow-typed-actor.test.ts` and `tests/consumer/typed-flow-actor.types.ts`. No new product file or allowlist enlargement is needed. Archive consumer assertions must compare actual public Type/Encoded and services under each existing compiler configuration; root exact-optional negatives remain in owned core tests.

Add required-key/mutable-key/constructor-default C regressions and generic construction/access to the existing089 tests without removing any baseline assertions. Rerun the original required declaration/root typecheck, real scoped actor units, three installed archive consumer compiler/runtime paths, and focused verification exactly as frozen089 requires. Continue the full ownership, context, class-isolation, cancellation, terminal gate, viewport and observer matrix. A virtual compile and parser pass cannot accept those paths.

STOP on a metadata dependency outside the owned source/test files, declaration emit disagreement, optional missing document reappearing, exact C.Type or service loss, changed factory/domain/compiler policy, casts/unchecked guards, test weakening, frozen input drift or any original089 STOP. Do not fix another blocker during source execution without reviewed scope. Do not update069 members or any host parity cells from this amendment.

## Conformity and deviations

Conforming: authoritative Schema-derived snapshot values, full accepted codec domain, exact node/data correlation and service channels, required document/revision/viewport, unchanged087 factory and concrete APIs. This evidence is installed compiler and Schema parser evidence only.

Intentionally different: the new snapshot field has its own required/readonly/no-default container markers rather than inheriting optional/mutable/default markers from C. Its document Schema metadata is a singleton Union. Missing document now fails for optionalKey C, as the approved actor contract already required.

Unverified: actual actor execution, cancellation/ownership/gate races, deep class isolation, declaration emission, installed tarballs, focused/full verification, native projection/Foldkit reload and member-level parity. These retain their original089 or later-plan owners and acceptance boundaries. The candidate remains stopped until the amendment is reviewed and the original execution gates pass.
