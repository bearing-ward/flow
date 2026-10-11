# Plan089 snapshot inference diagnostic revision

Status: proposed diagnostic revision, ready for final independent review. The stopped candidate remains `STOPPED_NO_SOURCE_ACCEPTANCE`. No product source correction or execution resumption occurred.

The proposed source amendment is unchanged: use `document: S.Union([S.toType(document)])` inside the authoritative snapshot Struct and retain its inferred Type alias. This revision repairs the compiler fixtures and the negative checker. The original claim that all14 negative cases were accepted is withdrawn. N07 and N14 in that frozen packet also failed on nonexistent Schema API access, so their expected-error directives could mask loss of the intended restrictions.

## Preserved inputs and failure history

Candidate `A` is `/Users/richardmcandrews/.codex/worktrees/typed-flow-actor/flow`. Evidence `E` is `/Users/richardmcandrews/.codex/worktrees/typed-flow-actor/typed-flow-actor-evidence`.

| Preserved input | SHA-256 |
| --- | --- |
| Original amendment | `57148a0f3d79bd695a18fb69bd0f8eaa21ca30830283f161cf313f9df8e71c23` |
| Original probe | `194936fa8e41e96dca6586d850a29b5202a4495852cf31272376a9387aa13364` |
| Original diagnostic freeze | `2f8c3c40e323c18fe3d651b7fd413bce1f488f9380dff051de008583a2b65312` |
| Candidate stopped freeze | `c2d387d00033fbc3eb02ff2391eef223dbebabed97afba10ce2ac8f73bae2f2e` |
| Approved full089 design | `56b7f9f6d66a245f4113a6a96d1ce495f1cd87c2a2677788919cf489c1363c82` |
| Approved Plan089 | `a8e1b2f3b504916c2cc90c7d571480970123a34f52e6b66593eeb9187ee4296f` |

Before any revision write, the original diagnostic freeze and every one of its14 artifact hashes matched. All original artifacts, historical first failures and primary-owned reproduction records remain unchanged. The original failed fixture receipts for unused imports and omitted canonical node label remain preserved. This new revision does not overwrite those logs, the actual stopped typecheck failure or the original erroneous negative inventory.

The complete independent review `plans/typed-flow-actor-snapshot-inference-independent-design-review.md` was read. Its verdict is REVISE the diagnostic proof before source resumption. It accepts the proposed representation's reasoning but does not accept product source, actor execution or the original negative inventory. Its frozen hash is recorded in the new revision manifest.

Installed versions remain Effect4.0.0-rc.116, Foldkit0.163.0 and TypeScript5.9.3. Candidate source and evidence are rehashed again when freezing this revision. The manifest records all1,503 source files and nine evidence files, with zero mismatches. The approved full design/plan retain the hashes above.

## [TEST-089-SNAPSHOT-REVISION] Isolate each intended compiler rejection

- **Evidence**: original `typed-flow-actor-snapshot-inference-probe.ts:88,146` accesses `Document.fields.nodes.element`, which is absent from installed Effect's Array Schema. `A/node_modules/effect/src/Schema.ts:4427-4440` exposes `.value`. Original exposed diagnostics show both TS2339 and TS2322 on N07/N14. The original checker only counted nearby negative IDs.
- **Impact**: those directives could still pass if discriminator/data or Date typing became permissive, because the unrelated API failure would consume the directive.
- **Effort**: S for valid ID setup, positive controls and an exact diagnostic inventory.
- **Risk**: LOW, only new plans diagnostics change. The product expression remains unchanged.
- **Confidence**: HIGH, the original diagnostics and new corrected compiler results identify both failure causes.
- **Fix sketch**: derive the branded ID once from the existing `Nodes.members[0].fields.id.make` outside negative directives. Compile valid dated/count payloads and decoded Encoded-Date controls unsuppressed. Require exactly one intended diagnostic per negative and no ancillary diagnostics.

The revision uses `datedId=Nodes.members[0].fields.id.make('n')`. A dated node with real Date, its snapshot Encoded counterpart, and a counted node all compile. N07 reuses that same branded ID with the deliberately wrong count payload; N14 reuses it with a deliberately wrong string Date. No Schema access or ID construction happens under either negative directive.

The revision adds complete positive environment controls for N09-N12 by supplying precisely the service omitted in the paired negative. Those runPromise expressions are virtual compile-only witnesses. It also adds a valid explicit no-data node and generic required Encoded-snapshot construction. Existing complete snapshot controls cover required keys, defined document and branded node IDs. Generic read and field-marker witnesses confirm readonly snapshot access rather than attempted readonly assignment. No runtime actor or fabricated authority is involved.

The checker no longer searches loosely near an error. For each declared negative it locates one unique source statement, requires exactly one diagnostic on that statement, compares the exact TypeScript code and diagnostic source span, and checks the intended message. The total exposed diagnostic count must be14. Any extra error, including TS2339, any missing case, wrong span/code/message or diagnostic outside the virtual source fails the probe. Compiler JSON retains the specification, line, column, actual span and full diagnostic for each case.

## Unchanged exact proposed product representation

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

The sole proposed expression change is at `A/packages/core/src/domain/flow-typed-actor.schema.ts:16`; its alias at line17 remains. The unrelated unused `FlowTypedCommitResult` import at actor line4 may be removed under the existing allowed actor file when source correction is separately authorized. These are the only two in-memory source substitutions in the diagnostic.

Installed `Schema.ts:2468-2490` retains C's generic optional/mutable/default markers in toType. `:3173-3222` computes Struct keys through conditional views. The approved `FlowGraphCodec` at `flow-data-contract.schema.ts:24-29` accepts that full ConstraintCodec domain, including optionalKey/mutableKey graph wrappers. The original source therefore has a real inference error; narrowing the bound would change the accepted factory domain.

Installed `Schema.ts:4673-4688` derives Union Type/Encoded/services from members, with required/readonly/no-default outer markers from `:401-419`. `Schema.ts:4756-4760` and `SchemaAST.ts:3214-3220` construct a real Union AST without inherited field context. Both snapshot Type and Encoded retain exact `C.Type`, required readonly document/revision/viewport, and never snapshot Schema services. C.Encoded is deliberately not the decoded snapshot's Encoded view. Document encoding/checkpoint preparation remain explicit Effectful actor operations.

Public Schema metadata changes exactly as previously disclosed: `.fields.document` becomes the singleton Union, `.members[0]` is toType(C), and `.members[0].schema` is C. The parent snapshot remains a genuine Struct with `.fields` and an authoritative inferred alias. Missing document fails even for optionalKey/default C; mutableKey C does not permit assigning snapshot.document. Nested node/edge optionality, defaults, no-data branches, brands and class types remain under the unchanged C. No factory, codec constraint, concrete API, Model, port or persisted grammar changes.

All original actor channels stay exact: reads RI; decoded writes RE|RI; encoded writes RD|RE|RI|RC; updates RE|RI|RU; observe RI|RL|Scope; encode RE|RI; decoded construction RE|RI|Scope; encoded construction RD|RE|RI|RC|Scope. RD/RE are the original C decoding/encoding services. This revision keeps the channel equality witnesses and adds complete service-supply controls. No channel is widened or erased.

Snapshot viewport still uses unchanged `ViewportSchema` at `flow-runtime.schema.ts:42-48`. The separately approved finite checkpoint Schema and actual actor finite initialization/write rules remain mandatory. No lifecycle, writer/CAS, gate/lease, ownership, callback, disposal or observation policy changes.

The prior alternative analysis also remains: `requiredKey(toType(C))` fails TS2345 for full generic C because installed requiredKey only unwraps optionalKey at `Schema.ts:2320-2336`; a forced static Struct view would disagree with runtime optional-key parsing; narrowing C changes the domain; an opaque custom Declaration adds an unnecessary parser boundary. The new requiredKey receipt reproduces that failure.

## Reproduction and actual results

Run from main `/Volumes/Sync/codex/9-19-26/flow` using the unchanged stopped candidate/dependencies:

```sh
bun run plans/typed-flow-actor-snapshot-inference-revision-probe.ts > plans/typed-flow-actor-snapshot-inference-revision-run.log
```

The final revision command exited0. The strict compiler takes the candidate's unchanged root configuration, including exactOptionalPropertyTypes, noUncheckedIndexedAccess and noUnusedLocals/Parameters. It uses installed TypeScript5.9.3. The existing noEmit option stays true. A compiler host supplies only a virtual diagnostic file plus the two declared in-memory source substitutions. The real actor and its imports are compiled; no file is created in the candidate and no declaration output is emitted.

| Case | Actual error code | Required exact diagnostic source span |
| --- | --- | --- |
| N01 missing document under optionalKey C | 2741 | `missingDocument` |
| N02 missing revision | 2741 | `missingRevision` |
| N03 missing viewport | 2741 | `missingViewport` |
| N04 missing Encoded document | 2741 | `missingEncoded` |
| N05 undefined graph | 2322 | `document` |
| N06 readonly document assignment under mutableKey C | 2540 | `document` |
| N07 wrong dated/count pairing | 2322 | `count` |
| N08 unbranded NodeId | 2322 | `id` |
| N09 missing RI | 2379 | `read` argument |
| N10 missing RC with RD/RE/RI supplied | 2379 | encoded operation argument |
| N11 missing RU with RE/RI supplied | 2379 | update operation argument |
| N12 missing RL with RI/Scope supplied | 2379 | scoped observer argument |
| N13 wrong no-data branch payload | 2322 | `data` |
| N14 string Date on snapshot Encoded view | 2322 | `date` |

The three longer operation spans in the table are recorded as exact full strings in the probe/JSON. Every case produces exactly one diagnostic; total exposed diagnostics are14. N07's message specifically says count does not exist in the readonly Date data object. N14 says string is not assignable to Date. No TS2339 occurs in the revised negative inventory. A second compile with consumed expected-error directives produces zero diagnostics, including all unsuppressed positive controls and the actual actor source.

The original generic helper still independently fails TS2322/TS2339. The full-bound requiredKey alternative still fails TS2345. The original product unused-import diagnostic is handled only by the explicitly disclosed virtual import removal.

The unchanged runtime parser portion passes64 assertions. Its result is `{"runtimeAssertions":64,"documentTransforms":0,"realActorRuntime":false}`. It checks required/missing/undefined keys for ordinary, optionalKey, mutableKey and constructor-default C; Date/private Counter constructors; encoded Date/fake class rejection; no document transforms; optional/no-data nested behavior; alternate whole-document string Encoded schema; and ordinary self-equivalence/JSON-encoding controls. No new actor assertion or class-isolation claim follows from these parser checks.

## Handoff, acceptance and STOPs

This revision supersedes only the original negative-inventory claim and its fixture/checker evidence. The original amendment's representation, metadata disclosure, service contract and narrow proposed source correction stay unchanged. Primary and final independent review must approve the revised packet before source resumption.

After approval, product correction remains within the already owned actor Schema/import files and existing owned tests. Preserve and rerun every original089 requirement: declaration/root typecheck, real scoped actor units, three installed archive consumer compiler/runtime paths and focused verification, with the original minimum18 meaningful compiler cases and full finite-viewport, ownership, class isolation, per-operation Context, callback/reentrant update, cancellation, disposal, terminal gate and observer matrix. These14 diagnostic negatives supplement that matrix and cannot replace or waive it.

STOP on frozen source drift, any ancillary/missing compiler diagnostic, unused expected-error directive, source correction beyond the reviewed expression/import, Type/Encoded or service disagreement, metadata dependency outside the allowed files, casts/unchecked guards, narrower C/factory/compiler policy, test weakening or any original089 STOP. No069 member or native parity cell changes.

## Conformity and deviations

Conforming proposed representation retains one authoritative Schema-derived snapshot, the full accepted C domain, required readonly keys, exact decoded Type/Encoded and independent service channels. Revised diagnostic evidence now isolates all14 intended negatives with valid unsuppressed controls.

Intentionally different proposed container field resets only C's outer optional/mutable/default markers through a singleton Union and exposes that Union metadata. This matches the required snapshot contract and preserves nested graph schemas.

Unverified remain real actor execution/ownership/races, declaration emit, installed tarball consumption, required focused/full verification, native projection/Foldkit reload and original069 member-level parity. The candidate remains stopped. This bounded revision changes diagnostic evidence, not product acceptance.
