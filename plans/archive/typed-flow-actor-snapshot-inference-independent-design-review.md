# Typed actor snapshot inference independent design review

Verdict: REVISE the diagnostic proof before source resumption. The proposed singleton Union representation is architecturally sound and fixes the intended container markers without narrowing C. One bounded compiler-fixture defect prevents accepting the claimed complete negative inventory. Correct it in new planning diagnostic artifacts, preserve the original freeze and failures, then request the final amendment review. No candidate source or original packet change is authorized by this verdict.

Reviewed 2026-10-02. Read the complete amendment and238-line probe, complete final compiler JSON, first/expanded compiler JSON, runtime receipt, requiredKey diagnostic, actual stopped typecheck log, stopped Schema module, selected actor usage/import sites and installed Effect4.0.0-rc.116 Schema/AST declarations. Applied improve/closing-loop, audit-playbook Correctness / Bugs, Test Coverage and Finding format, project standards and TypeScript/type-system guidance. The only write is this review file. No diagnostic rerun, install, build, compiler gate, actor runtime, archive/browser/verifier gate, source edit or shared-port operation was performed.

## Exact inspected identity

| Record | Independently matched SHA256 |
| --- | --- |
| Main snapshot inference amendment | `57148a0f3d79bd695a18fb69bd0f8eaa21ca30830283f161cf313f9df8e71c23` |
| Main snapshot inference probe | `194936fa8e41e96dca6586d850a29b5202a4495852cf31272376a9387aa13364` |
| Main snapshot inference freeze | `2f8c3c40e323c18fe3d651b7fd413bce1f488f9380dff051de008583a2b65312` |
| Actual candidate stopped freeze | `c2d387d00033fbc3eb02ff2391eef223dbebabed97afba10ce2ac8f73bae2f2e` |
| Original approved full design | `56b7f9f6d66a245f4113a6a96d1ce495f1cd87c2a2677788919cf489c1363c82` |
| Original approved Plan089 | `a8e1b2f3b504916c2cc90c7d571480970123a34f52e6b66593eeb9187ee4296f` |

Independently matched all14 artifact hashes and both original packet hashes in the diagnostic freeze. Rehashed all1503 stopped candidate files and all9 stopped evidence files with zero mismatches. Candidate paths below resolve under `/Users/richardmcandrews/.codex/worktrees/typed-flow-actor/flow`; stopped evidence resolves in sibling `typed-flow-actor-evidence`. The candidate still has the original failing expression and remains stopped. These hashes verify provenance, not actor acceptance.

## Required bounded revision

### [TEST-089-SNAPSHOT] Remove unrelated compiler failures from N07 and N14

- Evidence: main `plans/typed-flow-actor-snapshot-inference-probe.ts:88,146` creates the branded node ID through `Document.fields.nodes.element.members[0].fields.id`. Installed `node_modules/effect/src/Schema.ts:4427-4440` exposes Array member schema as `.value`, not `.element`. The final compiler JSON and exposed negative log show TS2339 on both negative lines in addition to the intended payload/Date TS2322. The probe's negative checker at `:165-174` accepts any diagnostic on each mapped ID, so this unrelated error is counted as valid coverage.
- Impact: both `@ts-expect-error` directives remain consumed if node discriminator/data correlation or decoded Date typing later becomes permissive. The nonexistent `.element` still rejects each line, and its ID expression becomes TypeScript's diagnostic `any`. The exposed TS2322 currently confirms the intended restrictions do exist; it does not make the regression assertion reliable.
- Effort: S, two valid ID expressions and stricter diagnostic validation in a new planning probe/revision record.
- Risk: LOW. This changes diagnostic fixtures only and keeps the proposed product expression unchanged.
- Confidence: HIGH, supported by the actual installed Array interface and final diagnostics.
- Fix sketch: derive the branded ID from actual `Nodes.members[0].fields.id.make('n')`, or the real `.value` member path. Retain the exact wrong count payload and string Date as independent negatives. Require the exposed negative inventory to reject unexpected diagnostics such as TS2339, rather than merely count nearby IDs.

Add unsuppressed positive controls using the same ID expression and the correctly correlated Date payload so the fixture proves all unrelated fields/schema access compile. Retain the14 intended negatives and channel equalities. Recompile the actual virtual actor with only the singleton expression and unused import correction, expose the directives again, and record the intended error per ID. N07 must fail for the wrong dated/count pair and N14 for string-versus-Date alone; no nonexistent member or implicit diagnostic-any can supply their rejection. Preserve this probe/freeze/log set unchanged and write revised artifacts under new names. The root/compiler/installed product acceptance matrix remains unchanged.

## Representation and scope findings that pass

The actual stopped source at `flow-typed-actor.schema.ts:16-17` derives its snapshot directly from `Struct(toType(C))`. Installed `Schema.ts:2468-2487` carries C's optional/mutable/default markers into toType. `Struct` computes those conditional keys at `:3173-3223`, so the full approved ConstraintCodec domain at `flow-data-contract.schema.ts:24-29` causes a genuine generic inference problem. The actual stopped typecheck log preserves TS2322/TS2339 construction/access failures and the separate unused import TS6196. This is not a reason to narrow the accepted factory domain.

Installed `Schema.ts:4673-4686` defines Union Type/Encoded/services from its members and inherits the required/readonly/no-default defaults at `:401-419`. `Union([toType(C)])` therefore retains exactly C.Type on both snapshot sides, with never snapshot Schema services, while giving the enclosing document key its own fixed markers. Its AST constructor at `Schema.ts:4756-4760` and `SchemaAST.ts:3214-3220` creates a real Union with no inherited field context. The saved64 runtime parser assertions cover ordinary/optionalKey/mutableKey/constructor-default graphs, missing/undefined keys, nested variants, Date/private Counter validation, zero document transforms and alternate whole-document Encoded shape. These are inspected saved results, not tests independently rerun by this reviewer.

The metadata change is explicit and appropriate for this proposed new API. `snapshot.fields.document` becomes a singleton Union, and original C is available through `.members[0].schema`; direct `.fields.document.schema` is no longer the shape. Snapshot Struct identity, exact inferred public alias, nested document fields and factory domain remain intact. The amendment does not promise general equivalence laws from the self-equivalence checks, arbitrary class isolation or actual actor execution.

The bounded source correction remains one Schema expression plus removal of the unused FlowTypedCommitResult import at `flow-typed-actor.ts:4`. Generic construction/access and exact actor channel witnesses have a zero-diagnostic virtual compile in the saved result. Its compiler host follows actual actor imports and changes only those two in-memory bytes; it is not a declaration emit or installed archive run. The revised negative proof above must not broaden that production correction or alter the stopped files before approval.

Snapshot viewport continues to use unchanged ViewportSchema Number x/y. The separately approved finite checkpoint Schema at stopped `flow-typed-actor.schema.ts:10-15` and the original initialization/write finite validation policy remain mandatory. This inference amendment cannot waive finite actor rejection tests, trusted ownership, services, cancellation, CAS, terminal gate cleanup, observations, archive/compiler/runtime gates or focused verification. The actual actor source is not fully reviewed or accepted by this narrow amendment pass.

## Conformity and deviations

Conforming proposed correction uses one authoritative Schema-derived snapshot and the full accepted C domain, keeps required document/revision/viewport, retains decoded C.Type on snapshot Type/Encoded, and leaves every original actor service channel and concrete API unchanged. Current evidence comprises saved installed compiler and Schema parser diagnostics only.

Intentionally different proposed field representation is a singleton Union that resets only the outer key's optional/mutable/default metadata. That metadata change is disclosed and matches the approved required readonly snapshot contract. It does not change nested data/default branches or the finite checkpoint policy.

Unverified remain the repaired negative inventory, independent diagnostic rerun, real actor execution/ownership/races, declaration emit, real installed tarballs, required focused/full verification, native rendering/Foldkit reload and every original069 parity cell. REVISE concerns only the diagnostic defect above; it does not reject the singleton design or accept the stopped source.
