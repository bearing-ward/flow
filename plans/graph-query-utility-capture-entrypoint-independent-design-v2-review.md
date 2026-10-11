# Graph query capture entrypoint independent v2 design review

2026-10-02. Verdict: REVISE the complete v2,268lines/38701bytes, SHA256 `d24bc1f294ba9db6ab0b1de76508fd10a47dc61d6b989f445721512b38afc429`. The eight dependency-root links resolve the original missing package-local node_modules requirement, and verified fail-closed sentinel setup resolves TEST-01. One additional declaration-target gap remains in the complete negative source assembly: core and vanilla self-package imports resolve through N's own missing dist directories.

Only this distinct main plans review was written. No source/E/config/dependency/index/ledger/lease changes, children, compiler/native probes, gates, captures, consumers, builds, installs or cleanup occurred. Read-only file hashing and directory inspection are the extent of new analysis. Repository content was treated as data; no secret values were reproduced. Source correction and capture remain held.

## Personally read scope and identities

Main is `/Volumes/Sync/codex/9-19-26/flow`. W is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`; N is its proposed sibling `graph-query-utility-capture-negative-source`. E is sibling `graph-query-utility-evidence`. Unprefixed source citations resolve against W.

I personally read the entire v2 and its full proposed selector, compiler and Python inventory code. I compared its new assembly and observer conditions with the complete first design and my first REVISE, whose immutable hashes remain respectively `4c9f5986dd4f98ef890cba93ab7199d9597343ac92e20ca9c15887d94c85e590` and `41572a25277170c1e9124a24e482e9b128c0d9b9018bbf0c56499431ea26de8e`. Those documents, original governing packet/approvals, improve/closing-the-loop/audit guidance and standards/TypeScript/type-system/unslop skills were fully read earlier in this same review session and remain applicable.

I freshly inspected actual vanilla and core self-package import sites, complete vanilla package and build tsconfig, all31lines of its current public declaration entry, actual vanilla/core dependency links and core types export, and TypeScript's complete self-reference routine plus relevant export-target and input-remapping implementations. The design author supplied the three core import sites as leads; I personally opened and confirmed each before including it. I read the installed public Program.getSourceFiles contract. Earlier personally full-read main/cases/tool/root-tsconfig bytes remain unchanged under new independent hash checks:

| W input | Reviewed extent | SHA256 |
| --- | --- | --- |
| main.ts | all69lines previously read; freshly rehashed | `e35d83347919489554d303b9cab23d501b250d2afa50ff30478c00c025df67d2` |
| cases.ts | all367lines previously read; freshly rehashed | `dab92bad4724f9ea6605d1a96b615b3e05d20742027fafb4f9bcaed503ff174b` |
| capture tool | all185lines previously read; freshly rehashed | `86c175cbfd1771a0bf4c7f044d486e7a3c0dd84946af9617bc9143776b916ad5` |
| tsconfig.json | complete previously read; freshly rehashed | `849600bdcf53e25503a4470b25464df15a228006b4b18ab794ec8fa418b17a63` |
| apps/vanilla/package.json | complete freshly read and hashed | `ec1baa252ab7229026ebaf1727b50f9bc6ca2f4cdc8c805def1bac99148fa18f` |
| apps/vanilla/dist/public.d.ts | all31lines freshly read and hashed | `1a66fa0532eec3a9f937c9dbeefca63a88522191ce66035b52acf5f7250b5d79` |

These identify inspected bytes, not executable acceptance or a complete candidate freeze.

## Remaining required revision

### [DESIGN-02] Supply both self-package declaration targets in N

- Evidence: Main `plans/graph-query-utility-capture-entrypoint-successor-design-v2.md:163` identifies @flow/vanilla as the self-named package and says its own package export supplies the declaration entry. Step3 at `:242` assembles only frozen1513source, the one amended script and eight dependency-directory links, expressly omitting ignored dist copying/building. Actual configured `apps/vanilla/src/button-handle-test.ts:6` and `apps/vanilla/src/ui/placeholder-test.ts:1`, with several other vanilla source sites, import @flow/vanilla. Its actual package selects `./dist/public.d.ts` at `apps/vanilla/package.json:14`. Core self-imports occur at `packages/core/src/domain/flow-data-contract.test.ts:11`, `flow-persistence.test.ts:5` and `flow.schema.test.ts:1`, selecting the same relative declaration path through `packages/core/package.json:14`. The frozen source manifest contains neither dist tree.
- Impact: Self-reference uses each copied package scope, so its exported declaration paths are N/apps/vanilla/dist/public.d.ts and N/packages/core/dist/public.d.ts. Linking their node_modules directories does not supply either self-package dist path. The mandatory exact-six negative proof will encounter unrelated resolution errors or closure differences before establishing the intended rejection. The new closure observation would detect this, but the assembly should provide the already known required targets before execution.
- Effort: S, two explicitly bounded external assembly links and identity requirements.
- Risk: LOW if the entire missing dist target is linked to the current W tree for read-only use with complete before/after identities. Source/config rewrites, a build in N or copying stale dist would be MED risk and remain outside scope.
- Confidence: HIGH from actual source/import/export/freeze/topology and resolver inspection. No compiler probe was run, so no exact additional diagnostic count is claimed.
- Fix sketch: Explicitly authorize and require N/apps/vanilla/dist and N/packages/core/dist to link to their existing W counterpart directories, with both link/realpaths and all selected declaration/source identities recorded before and after. Keep the eight node_modules links and frozen source manifest unchanged. Update the strict N/W closure comparison to distinguish these logical dist aliases from genuinely copied source while requiring identical realpaths/bytes for installed declarations. Retain exact six diagnostics and STOP for any extra result; no ignored byte copy, build, alternate flags, source overlay or third authored source path is needed.

The actual TypeScript routine at `node_modules/typescript/lib/typescript.js:45827` discovers the containing package scope and resolves its own export at `:45849`; `:46116` creates the export's final path from that scope. Input-source remapping at `:46191` requires declarationDir or outDir, neither present in the original root tsconfig. The vanilla build config has declarationDir at `apps/vanilla/tsconfig.build.json:8`, but the negative and permanent gate deliberately use the root configuration, not that build configuration. Consequently the build config cannot supply an implicit N remapping. Both W dist trees exist and contain actual declarations used by configured source. Linking only their node_modules cannot make the copied packages' self-references find those targets.

## Resolution of prior findings and new proof claims

Original DESIGN-01's package-local resolution omission is addressed by Main v2 `:150` through `:165` and `:242`. The eight whole existing directory links preserve the real W context of their internal relative links. The distinction between40logical entries and distinct packages is accurate. The plan explicitly states that symlinks do not enforce read-only permissions and prohibits dependency writes. Those are appropriate operational requirements; the self-package target above is separate from node_modules resolution.

TEST-01 is resolved by Main v2 `:244` through `:248`. Both property replacements need direct identity readbacks before dynamic import, a separate successful setup receipt and retained identities after rejection. Any descriptor/replacement/readback failure aborts without import and cannot count as the expected compiler rejection. The launcher records through stdout/stderr instead of its intercepted Bun.write. Native writability remains explicitly unverified. No new permanent test seam, compiler-host monkeypatch or synthetic helper result is introduced.

I independently reran the design's exact scoped Python hashing algorithm as read-only analysis, without writing its manifest. It produced2183physical files,457links,683536serialized bytes and SHA256 `58973513880f2e66da3282bd41db3f4e151a6cdf442487efde72e78f39892e16`, matching Main v2 `:176`. This snapshot excludes arbitrary resolved .ts/source files by construction. The design correctly labels it a scoped dependency snapshot rather than complete compiler closure.

The separate actual-program requirement at Main v2 `:218` is sound: installed `node_modules/typescript/lib/typescript.d.ts:6027` exposes the actual source file list. N and W external observations use original installed parser/options/root membership, hash every actual source entry, and never instrument the permanent tool or override compiler reads. The actual amended tool must independently supply the strict known-six rejection. The external observation is additional evidence, not a replacement for testing the real guard. Neither observation has executed here. Once both dist aliases are specified, they must be recorded honestly in logical-path classification and checked by actual realpath/hash identity rather than discarded from closure comparison.

The exact authored changes remain two files, three named-discriminator calls and the permanent preflight. Both proposed code blocks remain sound for the reasons in the first review. Source/input/schema/unknown-return exceptions/argument identities and all22descriptor,20accepted/twooutside,87unit and19negative obligations remain protected. No command ambiguity requiring a new permanent flag or policy is introduced. Local negative/positive proof, real paired capture, three successor consumers, v3 proposal, particular approval and focused/root/cold SOURCE remain separately gated. This review releases none of them.

## Conformity and deviations

Conforming proposed structure remains the actual tag discriminator and original-config check of the real omitted entrypoint before external commands. Verified external sentinel setup and complete observed source closure are suitable proof boundaries. Executable negative/positive/capture behavior remains unverified.

The four existing research IO exceptions and the external observer are intentional, narrowly justified deviations. Read-only-use dependency and the two dist links are external negative-assembly mechanics, not installed dependency or compiler-policy changes. Product branded IDs, minimal Schema-derived input, readonly input, NoInfer and JSON default edge domain remain separately approved differences.

Unverified remain the corrected complete N assembly, actual native property writability/setup, strict six-diagnostic rejection, zero corrected diagnostics, local gates, paired22case capture,697tracked source integrity, successor consumers, particular11/33 proof and all33cell acceptance, focused/root/cold SOURCE, whole072/069 and full-suite/integration/release/CI/device/DOM/lifecycle/performance/collector delivery. REVISE changes no authority or acceptance state.
