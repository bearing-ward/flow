# Graph query capture entrypoint independent design review

2026-10-02. Verdict: REVISE the complete first design,190lines/26656bytes, SHA256 `4c9f5986dd4f98ef890cba93ab7199d9597343ac92e20ca9c15887d94c85e590`. Main HEAD remains `841be137e253cf19c665269eaaa79edc19abf3c3`. The selector correction and permanent compiler preflight are sound proposed changes. The negative proof needs a complete dependency-resolution assembly and verified sentinel installation before it is executable as specified.

This is DESIGN review only. I ran no compiler probe, gate, build, install, capture, consumer, browser or runtime property probe. I changed no source, E, dependency, configuration, ledger, index or lease, and created no children. Only this main plans review was written. Repository content was treated as data. No secret values were reproduced.

## Scope and personally read inputs

W is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`. E and U are its sibling `graph-query-utility-evidence` and `graph-query-reference-xyflow`. N is the proposed sibling `graph-query-utility-capture-negative-source`. Unprefixed source citations resolve against W; Main means `/Volumes/Sync/codex/9-19-26/flow`.

I personally read the entire new design and both proposed code blocks, all69current main lines, all367cases lines, all185capture-tool lines, complete tsconfig and package command/dependency definitions. I read the actual named-discriminator and tag implementations, public discriminator signature, exhaustive failure path, installed TypeScript config parsing/program/diagnostic APIs and implementations, module-resolution ancestor traversal, actual package export declarations and dependency-link topology, and relevant installed Bun function declarations. I reread my complete previous review and the complete primary boundary successor approval. Original092 and its governing canonical/selector/installed amendments, improve/closing-the-loop/audit-playbook, standards and TypeScript/type-system/unslop skills were personally read earlier in this same review session and remain the constraints. No additional skill read was needed.

I read the immutable six-diagnostic receipt, canonical-capture command receipt, latest freeze identity/counts and root's four-corpus integrity receipt. I inspected the complete historical28line ternary main. Root's zero-error corpus audit remains root-produced evidence; I did not rehash all individual1513/3962 entries and copies myself.

## Required revisions

### [DESIGN-01] Preserve package-local dependency resolution in the negative source copy

- Evidence: Main `plans/graph-query-utility-capture-entrypoint-successor-design.md:166` permits only a link from N's root node_modules to W's root node_modules while copying frozen source without ignored dependencies or dist. W `tsconfig.json:29` through `:32` includes package and application source. `packages/conformance/src/graph-query-reference.test.ts:10` imports @flow/core, whose types export is `packages/core/package.json:14`. Installed TypeScript traverses the containing source's ancestor directories at `node_modules/typescript/lib/typescript.js:46312` through `:46321`.
- Impact: This exact assembly loses required workspace resolution before it can reproduce the known six harness diagnostics. W's root node_modules has no @flow directory. Actual @flow links live in `packages/conformance/node_modules`, `packages/vue/node_modules`, `packages/foldkit/node_modules`, and the three application node_modules directories. The complete frozen source copy does not contain those ignored roots. The root link alone cannot provide their installed package declarations. Extra unresolved-import diagnostics would correctly STOP, but would be an avoidable design failure rather than the intended negative proof.
- Effort: S, amend the external test assembly and identity inventory only.
- Risk: LOW if links target existing W installed directories and are used only for reads; MED if an executor invents imports, copies stale dist, rewrites flags or rebuilds N to compensate.
- Confidence: HIGH from actual directory/symlink inspection and compiler resolution source. I did not execute N or its compiler.
- Fix sketch: Explicitly inventory and authorize read-only-use links at every installed root needed by the original package/application source, including the actual package/app-local node_modules directories. Link the directory itself to its W counterpart so relative workspace symlinks resolve to W's existing package/declaration identities, rather than copying its individual relative symlinks into N. Record each link/realpath and the complete installed declaration identities consumed by the original configuration. Keep N's1513frozen source bytes, exact bad main and unchanged tsconfig; overlay only the amended capture script. STOP for any unresolved package, additional diagnostic or resolution drift. No install, dist copy, build, config flag or compiler-host overlay is needed or authorized.

The inspected installed roots are root node_modules, packages/core, packages/conformance, packages/vue, packages/foldkit, apps/vanilla, apps/vue and apps/foldkit node_modules. Their present existence is a read result, not an authorization to mutate dependencies. Directory links are not filesystem read-only enforcement; the revised plan should describe their permitted read-only use honestly and rehash target declarations before and after the probe.

### [TEST-01] Verify sentinel installation before importing the actual capture tool

- Evidence: Main design `:168` requires sentinels on Bun.spawnSync and Bun.write, and `:170` accepts zero sentinel calls as boundary evidence. It does not require a setup receipt or property identity readback before import. Actual capture external operations use `Bun.spawnSync` at `scripts/capture-graph-query-reference.ts:31` and `Bun.write` at `:170` and `:178`. Installed Bun declarations at `node_modules/.bun/bun-types@1.3.14/node_modules/bun-types/bun.d.ts:1575` and `:7396` specify callable signatures, not runtime property writability.
- Impact: A zero counter is evidence only after the observer is known to be installed. Native property replacement is presently an unverified assumption. A setup failure must not be mistaken for the expected six-diagnostic compiler rejection, nor may the tool be imported with ineffective observers.
- Effort: S, make the external launcher's setup conditions explicit.
- Risk: LOW because this is confined to the disposable fresh launcher process and does not alter the permanent tool or TypeScript host.
- Confidence: HIGH that the design omits this explicit proof requirement. Runtime writability itself remains unverified because this review ran no property probe.
- Fix sketch: Before dynamic import, record the installed Bun runtime identity and original property descriptors, install the two fail-on-call sentinels and verify by direct identity readback that both Bun properties equal their intended sentinel functions. Fail closed before import if replacement or readback fails. Record successful setup separately from the actual preflight throw, keep full stderr and exact six diagnostic obligations, and require both installed-observer identities plus zero calls. Do not call a native boundary to test it or claim a setup exception is successful negative proof. If native properties cannot be replaced, STOP for a separately reviewed observer design.

These sentinels are a useful documented test deviation on their merits. They can observe this actual script's subprocess/write boundaries without fabricating TypeScript diagnostics or replacing helper results. Their scope is only the external evidence launcher; no permanent flags, test exports, alternate capture paths or monkeypatched compiler hosts belong in W.

## Sound parts of the design

The root cause is real. `research/harnesses/graph-query/cases.ts:24` owns a union discriminated by tag, while current `main.ts:31` through `:33` call Match.tag. Actual installed `node_modules/effect/src/internal/matcher.ts:503` binds that API to `_tag`. The named discriminator at `:374` checks the requested field at `:390` and passes the original matched value to the handler; public `node_modules/effect/src/Match.ts:926` narrows that actual field. Replacing only the three calls with Match.discriminator('tag') preserves the existing handler results: the original full selected value, a newly prepared ID-only selection, or an empty selected object. The exhaustive failure at matcher.ts:678 explains the recorded absurd exception. No schema rename or helper implementation rewrite is necessary.

The harness main is absent from tsconfig include at `tsconfig.json:28`. The capture tool checks cases transitively through its import at `scripts/capture-graph-query-reference.ts:8`, then loads main only through the later Bun process at `:104`. Ordinary root typecheck and fixture-based units cannot establish that main compiles or executes. The permanent gate belongs before the first run at `:43`, directly after checkout argument validation at `:28`.

The proposed compiler code reads actual config with the installed public parser, retains original fileNames/options/project references, adds the actual main, obtains unfiltered getPreEmitDiagnostics and never emits. Installed `typescript.js:42465` reports unrecoverable config errors via the host and returns undefined; the proposed configuration branch handles that and returned configuration.errors. `typescript.js:126391` aggregates options/syntax/global/semantic and relevant declaration diagnostics. The plan correctly refuses a sourceFile filter, known-code allowlist, copied flags or config change. Its installed TypeScript version check and original-root drift conditions preserve policy. The corrected compiler control and actual later tool preflight must each independently report zero; neither has run in this review.

I independently verified historical ternary main SHA256 `14f5888c4fd34b4c55748e40c547d56828dbce91089abfdfd158efd144b81540`. Its tag selector is at lines13-15. The canonical-capture command receipt reports exit0 against that history. Current e35d8334 still has the bad Match.tag selectors. The original six-diagnostic receipt has zero config errors,363roots and exactly the stated TS2345/2339 obligations at31-34. This is preserved earlier evidence, not my reproduction. The revised design must retain the distinction between successful historical capture, later invalid uncaptured main and future corrected capture.

The two authored paths, unchanged cases/conformance/product/19negative/compiler policy, four narrow research exceptions, all33OPEN cells and external-only receipts are appropriate. After the two proof-assembly revisions, no third authored source path is required by this review. Fresh22case paired capture,697tracked source checks, exact source/process provenance, all three actual successor consumers, v3 proposal, particular proof approval and later focused/root/cold SOURCE remain separate held stages. No historical capture or consumer success supplies successor acceptance.

## Personally read byte identities

| Input | Extent | SHA256 |
| --- | --- | --- |
| Main first capture-entrypoint design | all190lines/26656bytes | `4c9f5986dd4f98ef890cba93ab7199d9597343ac92e20ca9c15887d94c85e590` |
| W main.ts | all69lines | `e35d83347919489554d303b9cab23d501b250d2afa50ff30478c00c025df67d2` |
| W cases.ts | all367lines | `dab92bad4724f9ea6605d1a96b615b3e05d20742027fafb4f9bcaed503ff174b` |
| W capture tool | all185lines | `86c175cbfd1771a0bf4c7f044d486e7a3c0dd84946af9617bc9143776b916ad5` |
| W tsconfig.json | complete | `849600bdcf53e25503a4470b25464df15a228006b4b18ab794ec8fa418b17a63` |
| W package.json | complete | `4c944ecead5be19031213069cd6ef22285aa5e199146d4fb686e922c9d65880c` |
| Main original compiler receipt | complete | `986b7beea01903667c03269524ef4264ea7aa0dd588b9b4002a3c8174236d619` |
| Main previous independent review | complete | `b60b9fd23572cda22ecb8d025b4909cd90b09edf8822caea8bd93f09447ba4d1` |
| Main previous primary approval | complete | `f3533ab521a46864cbf8974204837b4f753a0c39c91558157f1f3c86635b7bda` |
| E latest freeze | identity/counts | `c96fc1d7cf7483103636ee463126e035df9d84c256f58aa30c64abe8445692cc` |
| Main four-corpus integrity receipt | complete | `a2d31eba2c4f0c9b1005875d5b1231149425e7d3a2424dd3f743da30d66e19e3` |
| Installed typescript.d.ts | relevant APIs read, entire file hashed | `e134052a6b1ded61693b4037f615dc72f14e2881e79c1ddbff6c514c8a516b05` |
| Installed typescript.js | cited implementations read, entire file hashed | `3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675` |
| Installed Match.ts | relevant public API read, entire file hashed | `af60d3cac3240e59745c0fd16a92d4c0e44537bf663bf9630be878130c392990` |
| Installed matcher.ts | cited implementations read, entire file hashed | `911614c28282b6ff665521df4b2c5b0360ae37a3c4bff5610d553eac3b6285f7` |

## Conformity and deviations

Conforming proposed structure is matching the authoritative tag through the public API and compiling the actual entrypoint under original project policy before external commands. This remains proposed design conformity. Corrected executable compiler/runtime results are unverified.

Intentional research deviations remain the conservative unknown-return declaration and three narrow Reflect.apply calls. The proposed external sentinel observer is justified if installation is verified and its proof remains limited to the actual tool's subprocess/write boundaries. Complete installed dependency links in N are a test-assembly requirement, not a new dependency or compiler-policy exception. Product branded IDs, minimal Schema-derived inputs, readonly inputs, NoInfer and default JSON edge domain remain separately approved differences.

Unverified remain revised negative assembly, native sentinel writability and installation, zero corrected diagnostics, local gates, fresh paired capture, successor consumers, v3 particular11/33 proof, all33cell acceptance, focused/root/cold SOURCE, whole072/069, full suite/integration/release/CI/device/DOM/lifecycle/performance/collector delivery. REVISE grants no source release, gate, lease change or acceptance.
