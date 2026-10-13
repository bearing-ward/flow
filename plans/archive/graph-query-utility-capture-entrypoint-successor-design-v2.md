# 092 check and correct the actual graph-query capture entrypoint — v2

DRAFT v2 for primary and fresh independent design follow-up, 2026-10-02, main HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. P1, correctness and verification, effort S, risk LOW for the selector correction and MED for the new compiler gate. No source execution, capture retry, consumer command, bookkeeping, or focused verification is authorized by this draft. Root must approve the complete design and explicitly release the same stopped executor. Keep implementation uncommitted. Root owns the index.

This complete v2 supersedes the first draft for proposed execution only; preserve that first draft,190lines/26656bytes, SHA256 `4c9f5986dd4f98ef890cba93ab7199d9597343ac92e20ca9c15887d94c85e590`, and its complete cold REVISE report at Main `plans/archive/graph-query-utility-capture-entrypoint-independent-design-review.md`, SHA256 `41572a25277170c1e9124a24e482e9b128c0d9b9018bbf0c56499431ea26de8e`, unchanged. This author full-read/hash-verified that review. DESIGN-01 is addressed by the eight actual dependency-directory links and scoped inventory plus future observed program closure below. TEST-01 is addressed by verified, fail-closed sentinel setup before import. No compiler or native property probe occurred during this revision. Neither revision broadens the two authored source paths.

## Exact input and preservation

W is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`. E is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-utility-evidence`. U is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-reference-xyflow`. Main is `/Volumes/Sync/codex/9-19-26/flow`. Source citations without another prefix resolve against W.

The sole proposed input is the complete latest STOP at E `successor-boundary-stop-freeze.json`, SHA256 `c96fc1d7cf7483103636ee463126e035df9d84c256f58aa30c64abe8445692cc`, containing1513source/3962E entries. Its complete outside-E copy is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-utility-successor-boundary-stop-preservation`, with `source/`, `evidence/`, and the freeze. This author independently rehashed every current and corresponding preserved entry before drafting:1513current source,1513copied source,3962current E,3962copied E, zero mismatches. Root separately reports a full zero-error audit at Main `plans/graph-query-successor-boundary-primary-integrity.json`. These are preservation checks, not runtime acceptance.

The entire original092 packet remains governing, with all approved amendments retained. Main original092 SHA256 is `1d409e895b7ea113eb336bc41ffaaff373465d5f6bf1aaea5e0f320e4015ff6c`. The immediate preceding boundary-policy successor design/review/primary approval are Main `plans/archive/graph-query-utility-boundary-policy-successor-design.md`, `plans/archive/graph-query-utility-boundary-policy-successor-independent-design-review.md`, and `plans/archive/graph-query-utility-boundary-policy-successor-primary-approval.md`, respectively SHA256 `72e0b02fe6872e865d3c829e9bfd8eeabeffbbc84978da0a582d5cb2389fb35a`, `b60b9fd23572cda22ecb8d025b4909cd90b09edf8822caea8bd93f09447ba4d1`, and `f3533ab521a46864cbf8974204837b4f753a0c39c91558157f1f3c86635b7bda`. This correction preserves their four narrow harness exceptions and explicit unknown external returns.

Before source edits, SAME092 must full-read/hash/copy the complete governing packet and approvals, independently rehash all latest1513/3962 current/copied entries, rehash accepted087's1492source/122E and protected inputs, and save complete new preedit source plus ENTIRE current E outside E. Preserve all historical failures, successful consumers, persistent19-negative replay, canonical captures and v2 proposal. ACK the actual preservation receipts to root with `sourceEdit=false`. No edits before this ACK and explicit source release. No Git mutation, new worktree, dependency copying, network acquisition, deletion, or cleanup.

| Protected current input | SHA256 |
| --- | --- |
| research/harnesses/graph-query/main.ts,69lines | e35d83347919489554d303b9cab23d501b250d2afa50ff30478c00c025df67d2 |
| scripts/capture-graph-query-reference.ts,185lines | 86c175cbfd1771a0bf4c7f044d486e7a3c0dd84946af9617bc9143776b916ad5 |
| research/harnesses/graph-query/cases.ts | dab92bad4724f9ea6605d1a96b615b3e05d20742027fafb4f9bcaed503ff174b |
| tsconfig.json | 849600bdcf53e25503a4470b25464df15a228006b4b18ab794ec8fa418b17a63 |
| package.json | 4c944ecead5be19031213069cd6ef22285aa5e199146d4fb686e922c9d65880c |

## Finding and actual history

### [CORRECTNESS-092] Match the authoritative discriminator and compile the capture entrypoint

- Evidence: `research/harnesses/graph-query/cases.ts:24` defines selected variants with `tag`; `research/harnesses/graph-query/main.ts:31` through `:33` use Match.tag. Installed `node_modules/effect/src/internal/matcher.ts:481` through `:503` binds that API to `_tag`. Its public `node_modules/effect/src/Match.ts:926` accepts a named discriminator. `tsconfig.json:28` includes packages/apps/scripts but omits the harness main. The capture tool imports cases at `scripts/capture-graph-query-reference.ts:8`, so cases are checked transitively while main is loaded only in the later Bun capture process at `:104`.
- Impact: the real upstream harness cannot select its first case and throws `effect/match/Match/exhaustive: absurd`. Normal workspace typecheck passes because it never checks this entrypoint. Upstream installation/build occurs before discovering the invalid harness.
- Effort: S, including negative preflight and fresh reference proof.
- Risk: MED. Compiler preflight must preserve actual root options/files and fail before external work without broadening config policy. The three selector edits themselves are low risk.
- Confidence: HIGH for the traced source mismatch and existing actual failure; corrected executable results remain unverified.
- Fix sketch: replace only three Match.tag calls with Match.discriminator('tag'), and add a permanent actual-config TypeScript preflight in the existing capture tool before its first external command. First prove the real preflight rejects the frozen bad main, then prove the corrected entrypoint has zero diagnostics before any newly authorized capture.

The historical successful canonical capture at E `canonical-capture.result.json` exited0. It used the earlier ternary selector source SHA256 `14f5888c4fd34b4c55748e40c547d56828dbce91089abfdfd158efd144b81540`, preserved at `graph-query-utility-runtime-stop-preservation/source/research/harnesses/graph-query/main.ts` under W's parent. That source reads `descriptor.selected.tag` at its lines13-15. Later source SHA256 `806cd2c8d98fa6d56a3960bdfd90252951f5190fe66cb0160a3ec6e1e29fe847`, preserved in the dead-unit-correction outside copy, introduced the three incorrect Match.tag calls. Historical successful capture is valid evidence for those earlier executed bytes; it does not validate this later harness.

Current main SHA256 e35d8334 includes the approved unknown-return boundary changes but retains the same bad selector. E `successor-boundary-stop-report.json:3` and actual `successor-capture.result.json` record exit1 in the first upstream harness process, no second capture, no generated capture files and no fixture write. Local typecheck and87targeted tests passed against their covered paths. They did not execute or typecheck the omitted main. Preserve that distinction and every failed receipt; do not retroactively call the Match.tag source captured successfully.

Root's actual TypeScript5.9.3 program parsed the original config and added this main entrypoint. Main `plans/graph-query-harness-entrypoint-original-compiler-diagnostics.json`, SHA256 `986b7beea01903667c03269524ef4264ea7aa0dd588b9b4002a3c8174236d619`, records363original root files, zero config errors and exactly6diagnostics, all in main:31 TS2345/2339,32 TS2345/2339,33 TS2345,34 TS2345. The final exhaustiveness diagnostic follows from the same unmatched discriminator. This author read the receipt and source; no compiler probe or gate was run while drafting.

## Exact two authored source paths

Only these TWO EXISTING authored source files may change:

1. `research/harnesses/graph-query/main.ts`: replace exactly the three calls at31-33 with the public named-discriminator API. Preserve the current surrounding pipeline and handlers:

```ts
const selected = Match.value(descriptor.selected).pipe(
  Match.discriminator('tag')('full', (selection) => selection.value),
  Match.discriminator('tag')('id-only', (selection) => ({ id: selection.id })),
  Match.discriminator('tag')('missing-id', () => ({})),
  Match.exhaustive
)
```

No Schema rename, `_tag` migration, ternary rewrite, helper extraction or other main edit. Preserve module import/decode, canonical preparation, all argument arrays/order/identity, connected selections, three raw Reflect.apply calls, their three exceptions, immediate unknown assignments, observeCalls, output decode and serialization byte-for-byte outside those three replacements.

2. `scripts/capture-graph-query-reference.ts`: add `import ts from 'typescript'`, following the existing default-import convention in `scripts/check-api-member-contracts.ts:3`. Insert a compiler preflight after existing absolute checkout argument validation/resolution at:28 and before the run helper/any external command. Preserve every existing pin check, build, capture, observation/manifest/fixture field and write afterward. The preflight parses W's ACTUAL `tsconfig.json` with installed TypeScript5.9.3 using public API, unchanged options and original fileNames plus actual main. Do not manually copy compiler flags, read config with JSON.parse, add project scripts, alter tsconfig, weaken diagnostics, emit code or add a dependency.

The following is the load-bearing code shape. Formatting may follow the unchanged formatter; any API or semantic change requires root review. It creates no artifact, subprocess, fixture, metadata field, or alternate validation policy. Its observations go only to stderr for the external recorder.

```ts
assert.equal(ts.version, '5.9.3', 'Use the frozen workspace TypeScript')

const configFile = path.join(root, 'tsconfig.json')
const harnessFile = path.join(root, 'research/harnesses/graph-query/main.ts')
const configDiagnostics: ts.Diagnostic[] = []
const diagnosticHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => root,
  getCanonicalFileName: (fileName) =>
    ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
  getNewLine: () => ts.sys.newLine,
}

const configuration = ts.getParsedCommandLineOfConfigFile(
  configFile,
  undefined,
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      configDiagnostics.push(diagnostic)
    },
  }
)

if (configuration !== undefined) {
  configDiagnostics.push(...configuration.errors)
}

if (configuration === undefined || configDiagnostics.length > 0) {
  process.stderr.write(
    `${JSON.stringify({
      stage: 'graph-query-harness-preflight',
      compilerVersion: ts.version,
      config: configFile,
      configurationDiagnostics: configDiagnostics.length,
      configurationParsed: configuration !== undefined,
    })}\n`
  )
  process.stderr.write(ts.formatDiagnostics(configDiagnostics, diagnosticHost))
  throw new Error('Graph query harness compiler configuration failed')
}

const rootNames = configuration.fileNames.includes(harnessFile)
  ? [...configuration.fileNames]
  : [...configuration.fileNames, harnessFile]
const program = ts.createProgram({
  rootNames,
  options: configuration.options,
  ...(configuration.projectReferences === undefined
    ? {}
    : { projectReferences: configuration.projectReferences }),
})
const compilerDiagnostics = ts.getPreEmitDiagnostics(program)

process.stderr.write(
  `${JSON.stringify({
    stage: 'graph-query-harness-preflight',
    compilerVersion: ts.version,
    config: configFile,
    entrypoint: harnessFile,
    configuredRoots: configuration.fileNames.length,
    programRoots: rootNames.length,
    configurationDiagnostics: 0,
    compilerDiagnostics: compilerDiagnostics.length,
  })}\n`
)

if (compilerDiagnostics.length > 0) {
  process.stderr.write(
    ts.formatDiagnostics(compilerDiagnostics, diagnosticHost)
  )
  throw new Error('Graph query harness compiler preflight failed')
}
```

The actual installed public declarations are `node_modules/typescript/lib/typescript.d.ts:9223` for config parsing, `:9285` for unrecoverable config reporting, `:7242` for program creation and `:9520` for getPreEmitDiagnostics. Implementation at `node_modules/typescript/lib/typescript.js:42465` reports unreadable config through the host and returns undefined; recoverable parser errors appear in configuration.errors. Both must fail. Its `:126391` aggregates config/options/syntax/global/semantic diagnostics; do not pass a sourceFile filter or retain only the known six. Keep options and project references derived from the parser, with no emit invocation. Missing package declarations or another actual diagnostic is a failure, not permission to weaken the check. Preserve original root membership; an unexpected empty original file list is input drift and must STOP.

## Protected artifacts and proof boundary

Cases.ts, all22descriptors,20accepted/twooutside domains, canonical decode, identity pools, withHandles own-undefined behavior, original-element observations and all strict result arrays/fields/keys remain unchanged. Keep the one opaque callable unknown-return exception and three actual-call exceptions. No any/cast/false callable signature, invented DTO, output sorting, public testing seam or hidden assertion helper.

All product helpers/tests, conformance assertions and87test organization,19consumer negatives, consumer runtime/compiler configs, existing archive runner, policy/config/dependencies/lockfile, telemetry, native/app adapters, imported artifacts, catalog, ledger and all33OPEN cells are protected. This draft permits no source trace/doc/metadata edit. It preserves original provenance and does not broaden research typecheck scope globally.

After the separately authorized real capture succeeds, its existing command may regenerate ONLY the owned `research/fixtures/graph-query-reference.json`. This is generated output of genuine execution, never a manual authored change or alteration to imported evidence. Existing fixture schema/metadata/normalization remains unchanged; preflight observations stay outside it. All owned execution receipts/proposals are external under NEW E names, preserving v2 and every STOP. Trace line-citation changes, if later needed, require a separately bounded root release rather than expanding these two authored paths.

## Actual dependency topology and negative assembly inventory

The cold DESIGN-01 finding is source-backed: original config includes package/app source at `tsconfig.json:29` through `:32`; `packages/conformance/src/graph-query-reference.test.ts:10` imports @flow/core, and `packages/core/package.json:14` exports actual built declarations. Installed TypeScript searches containing-source ancestor directories at `node_modules/typescript/lib/typescript.js:46312`. Root W node_modules has no @flow directory. A root-only link cannot preserve this resolution.

Author read-only directory inspection found exactly these EIGHT existing roots. At execution, N must link each entire directory at the same relative position to its absolute W counterpart. The link itself does not enforce read-only permissions: authorization permits reads only, no dependency writes. Linking each whole directory preserves the real W context of its internal relative workspace symlinks. Do not copy individual relative links into N, copy ignored dist/dependency bytes, create missing roots, or install/build in N.

| N relative directory → identical W relative directory | Direct nonhidden package entries | Actual entries |
| --- | --- | --- |
| node_modules | 16 | @effect/language-service, @effect/platform-browser, @effect/platform-bun, @effect/platform-node-shared, @oxlint/plugins, @playwright/test, @types/bun, effect, foldkit, oxfmt, oxlint, typescript, ultracite, vite, vitest, vue |
| packages/core/node_modules | 1 | effect |
| packages/vue/node_modules | 3 | @flow/core, effect, vue |
| packages/foldkit/node_modules | 4 | @effect/platform-browser, @flow/core, effect, foldkit |
| packages/conformance/node_modules | 1 | @flow/core |
| apps/vue/node_modules | 5 | @flow/core, @flow/vue, effect, vite, vue |
| apps/vanilla/node_modules | 3 | @flow/core, effect, vite |
| apps/foldkit/node_modules | 7 | @effect/platform-browser, @flow/core, @flow/foldkit, @foldkit/vite-plugin, effect, foldkit, vite |

These are40logical nonhidden package entries, not40distinct installed packages. Whole-directory links retain existing hidden entries including conformance's two historical compatibility directories without executing or altering them. There is no packages/vanilla dependency root: @flow/vanilla is the self-named package at apps/vanilla, whose own package export supplies its declaration entry. Do not invent an @flow/core link at root.

The eight scoped @flow routes are packages/{vue,foldkit,conformance}/node_modules/@flow/core → W packages/core; apps/vue/node_modules/@flow/{core,vue} → W packages/{core,vue}; apps/vanilla/node_modules/@flow/core → W packages/core; apps/foldkit/node_modules/@flow/{core,foldkit} → W packages/{core,foldkit}. The package-local core links contain `../../../core`; app links contain `../../../../packages/<name>`. Record each actual logical path, symlink text, resolved realpath, owning package.json hash and selected declaration entry hash before and after.

| Present local declaration entry | Declaration count in its full existing dist tree | Current entry SHA256 |
| --- | --- | --- |
| packages/core/dist/public.d.ts | 54 | b060530664b2a1a13e4187ea37804117fee9f3db1f1e87024434b28c2de3f913 |
| packages/vue/dist/public.d.ts | 16 | ad5890bc3f5b264aae5ae96055377d7dff57245cd6bbb327757f592ab89bbdc6 |
| packages/foldkit/dist/public.d.ts | 20 | 293e38e98fc27acec7f857b84281f61efe58d32d33c0483848d4d1773858f80b |
| apps/vanilla/dist/public.d.ts | 19 | 1a66fa0532eec3a9f937c9dbeefca63a88522191ce66035b52acf5f7250b5d79 |

Installed effect4.0.0-rc.116 package.json has `.` → `./dist/index.js` and `./*` → `./dist/*.js`, no types/typesVersions; @effect/platform-browser uses the same export structure. Each local @flow package has a `types` export `./dist/public.d.ts` and import export `./dist/public.js`. TypeScript5.9.3's package main is `./lib/typescript.js`. These read declarations guide the inventory; they are not a claim that package.json/declaration enumeration equals complete compiler closure. The compiler may resolve actual .ts sources or other source files.

A scoped read-only dependency snapshot below hashes all physical package.json and .d.ts/.d.mts/.d.cts files under the eight roots without following directory symlinks, plus all declarations in those four local existing dist trees and their package.json. It also inventories every physical symlink under the eight roots. Author observed457symlink records,2183distinct physical files:194package.json and1989declarations, including109local dist declarations. Canonical serialized manifest is683536bytes, SHA256 `58973513880f2e66da3282bd41db3f4e151a6cdf442487efde72e78f39892e16`. This is a precisely scoped dependency snapshot, NOT a complete actual compiler closure. It was calculated in memory without writing W/E or running TypeScript.

The following exact inventory algorithm makes those counts reproducible. After release, its complete output belongs in a NEW external E receipt, not N/W. Compare exact before/after manifests, not just counts. Ordinary approved local package builds precede the probe; if they alter these protected identities, preserve and STOP for root review rather than silently updating the baseline.

```python
import pathlib, os, hashlib, json
w = pathlib.Path('/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow')
roots = ['node_modules', 'packages/core/node_modules',
         'packages/vue/node_modules', 'packages/foldkit/node_modules',
         'packages/conformance/node_modules', 'apps/vue/node_modules',
         'apps/vanilla/node_modules', 'apps/foldkit/node_modules']
files, links = {}, []
for rel in roots:
    for parent, dirs, names in os.walk(w / rel, followlinks=False):
        for name in sorted(dirs + names):
            p = pathlib.Path(parent) / name
            if p.is_symlink():
                links.append({'path': str(p.relative_to(w)),
                              'link': os.readlink(p), 'resolved': str(p.resolve())})
        for name in names:
            p = pathlib.Path(parent) / name
            if not p.is_symlink() and (name == 'package.json' or
                    name.endswith(('.d.ts', '.d.mts', '.d.cts'))):
                data = p.read_bytes()
                files[str(p.resolve())] = {'path': str(p.resolve()),
                    'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
for rel in ['packages/core', 'packages/vue', 'packages/foldkit', 'apps/vanilla']:
    for p in sorted((w / rel / 'dist').rglob('*')):
        if p.is_file() and p.name.endswith(('.d.ts', '.d.mts', '.d.cts')):
            data = p.read_bytes()
            files[str(p.resolve())] = {'path': str(p.resolve()),
                'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    p = w / rel / 'package.json'
    data = p.read_bytes()
    files[str(p.resolve())] = {'path': str(p.resolve()),
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
manifest = {'roots': roots, 'symlinks': sorted(links, key=lambda x: x['path']),
            'files': sorted(files.values(), key=lambda x: x['path'])}
serialized = (json.dumps(manifest, sort_keys=True, separators=(',', ':')) + '\n').encode()
print(serialized.decode(), end='')
```

After source release, supplementary external original-config compiler observations must record EVERY actual `program.getSourceFiles()` entry, including libraries, declarations and .ts/.tsx or other resolved source, with compiler filename, logical classification, actual realpath, bytes and SHA256. Record N's frozen program before actual negative import and W's corrected program for the positive control; use identical installed5.9.3 parser/options/root membership. Never override compiler-host reads or instrument the permanent tool to expose its program. The N observation must itself show the exact original6diagnostics, while the real amended tool's negative result is separately required. Compare N and W closure membership after normalizing only copied source prefix; all actual installed/declaration paths and hashes must be identical, and all copied source must match the frozen manifest except identical amended script and the explicitly corrected live main. Record main differences by their actual hashes rather than concealing them. Require complete closure identity rehash immediately before and after the actual negative/positive processes, including any resolved source file not in the scoped dependency snapshot. No inference from snapshot counts replaces this observed compiler closure. Any unexpected resolution, missing source, additional diagnostic, membership difference or target mutation STOPs without install, alternate flags or policy changes.

## Ordered execution and actual commands

Run every command in W. The executor already owns installed dependencies and U; reverify their frozen versions and authority. Normal local typecheck runs package builds before tsc, as `package.json:26` defines. This supplies real local package declarations needed by the permanent preflight. Do not make capture install/build Flow packages or change parsing options to compensate for missing prerequisites.

| Stage | Actual command | Required observed result |
| --- | --- | --- |
| Existing local build/root prerequisite | `bun run typecheck` | exit0; original config/package declaration builds, no claim that omitted main is checked |
| Authored policy | `bun run check` | exit0; four existing bounded exceptions retained, no new waiver |
| Architecture | `bun run check:architecture` | exit0 |
| Targeted real assertions | `bun run test -- packages/core/src/domain/flow-graph.test.ts packages/conformance/src/graph-query-reference.test.ts scripts/check-api-member-contracts.test.ts` | exit0,87actual tests, no skips or assertion changes |
| Docs | `bun run docs:check` | exit0 without hand-editing generated docs |
| Traces | `bun run research:check-traces` | exit0; shifted citations needing source edits require root release |
| Structural member checks | `bun run scripts/check-api-members.ts` and `bun run scripts/check-api-member-contracts.ts` | both exit0; all33OPEN preserved |
| Diff | `git diff --check` | exit0 |
| Later genuine capture, only after release | `bun run scripts/capture-graph-query-reference.ts --checkout /Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-reference-xyflow --evidence=<NEW absolute E capture directory>` | preflight0 then actual22case/697tracked paired capture, exit0 |
| Later original three consumers, only after release | `bun run test:consumer` | all3actual archives/compiler/runtime/peer/styles/Chromium/disposal pass and19negative obligations remain independently evidenced |
| Later focused gate, only after particular approval/release | `bun run verify --list`, then `bun run verify` | exact existing active092 focused scope and fullSuitefalse, both exit0 |

The table lists actual existing commands, not results of this authoring turn. Required package commands are read from package.json, not guessed. Catalog checking is included in check-api-members and the later existing focused catalog scope. No package script is added. No full-suite/integration/release gate is granted.

1. Preserve complete current/copied source/E and governing inputs as above. Record exact preedit hashes, receipt sourceEdit=false and all holds. Obtain explicit same-executor release for the exact two local source edits. Apply the three named-discriminator replacements and the capture-tool preflight. Never restore bad bytes over live W for testing.
2. Run the original `bun run typecheck` prerequisite, quality, architecture,87targeted units and diff from the table. This checks the newly included script and supplies real package declarations. Preserve actual commands/results and the exact two-file delta. A substantive failure stops work. Prepare the meaningful negative against a NEW complete disposable SOURCE COPY, not a standalone clone of the checker and not a rollback of W.
3. The exact proposed negative root N is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-utility-capture-negative-source`. Executor creates it only after source release and preservation; it is not a new Git worktree. Copy the full1513source frozen latest STOP into N from the verified outside-E preservation, retaining frozen bad main e35d8334 and exact original tsconfig. Overlay ONLY the exact newly amended capture script bytes at N `scripts/capture-graph-query-reference.ts`; record all1513input/copy hashes and this one test-assembly delta. Create exactly the EIGHT whole dependency-directory links from the topology table at matching N relative paths to their absolute W counterparts. These links are authorized for read-only use only; they are not filesystem read-only enforcement. Record actual link targets/realpaths, complete scoped dependency snapshot, four local declaration trees, and actual N original-config programSourceFiles closure as specified above. Every target remains an existing W installed identity, with before/after full hash comparison. Do not copy/install ignored dependencies or dist, rebuild anything in N, or mutate W's dependencies. Actual original-config module resolution must use the same installed packages/declaration/source bytes as W. Relative source references resolve against complete N. Normalize only the diagnostic root path prefix N versus W when comparing the original receipt. Any extra diagnostic or resolution difference STOPs this test assembly; do not compensate with flags, source overlays or new dependencies.

Use a NEW E external diagnostic launcher in a fresh Bun process to import that actual N capture script. Set its process.argv to the existing --checkout/--evidence command shape, using absent absolute `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-preflight-must-not-exist` and a NEW absent E negative-output path. Before any dynamic import, record Bun.version, process.execPath/actual runtime binary identity and original property descriptors for BOTH Bun.spawnSync and Bun.write, including descriptor owner/prototype if inherited, data/accessor kind and writable/configurable flags where present. Install the two distinct fail-on-call sentinel functions in this one fresh process. Require installation to succeed and DIRECT IDENTITY READBACK `Bun.spawnSync === spawnSentinel` AND `Bun.write === writeSentinel` before import. Readback merely reads properties; never call a native boundary to test the observer. Record a separate successful `sentinel-setup` receipt containing both verified identities and installed descriptors. Property replacement can throw, return failure, or fail identity readback: in every such case record `sentinel-setup-failed`, ABORT WITHOUT IMPORT, and STOP for a separately reviewed observer design. Never label that setup failure as the expected compiler rejection, and never proceed using only one installed sentinel. Native writability is unverified at design time. No fallback to unobserved import is authorized.

Each sentinel records the attempted boundary and throws before performing it. They observe only forbidden external command/file-write boundaries; they neither implement the preflight, alter TypeScript hosts or diagnostics, nor invent helper functions/results. The launcher records observations through stdout/stderr for its external recorder; it cannot use intercepted Bun.write for its own evidence. This is an external evidence observer, not a permanent module/CLI flag or public test seam. Preserve exact observer source/setup/probe receipts separately. Only after verified setup may it dynamically import the actual amended N capture script. Require the sentinel identity readbacks still hold after that import rejects. The expected compiler throw is recorded with nonzero exit and the exact known6diagnostics; any sentinel hit, lost identity, setup exception or other import failure is a failed proof. Do not suppress tool stderr diagnostics. No actual external work is permitted in this negative.

Require the ACTUAL permanent guard to report EXACTLY6known diagnostics with zero config errors and363configured/364program roots under the frozen input. Match codes/relative files/lines/message obligations to the immutable root receipt. Record frozen bad-main/amended-tool/config/installed version hashes and full stdout/stderr/exit externally. Require separately verified successful sentinel setup, both direct identities retained and zero sentinel calls; unchanged current/copied fixture/source/E hashes except the stated external receipts, no capture files, and absent negative-output path. Source-order inspection must also show the preflight dominates every run/Bun.spawnSync/build/capture/write. This test proves the actual amended capture tool rejects the historical defect before crossing its external boundary. Its expected rejection is a result, not permission to retry or repair anything. Preserve N as evidence rather than cleaning it up. 4. Independently observe the corrected actual W entrypoint using installed TypeScript5.9.3 public config parser/ts.sys, unchanged W tsconfig options/fileNames plus real W main, and getPreEmitDiagnostics. This NEW external output-only compiler observation emits no code, rewrites no source, supplies no compiler-host virtual source or alternate flags, and records actual zero config/compiler diagnostics plus complete programSourceFiles identities and the closure comparisons/rehashes above. It is a positive compiler control; the actual permanent guard is independently required to print0 again at the start of the later real capture. Keep the negative observation, full copied bad input and all prior receipts immutable. Submit exact source deltas, complete negative/positive/local receipts to root for subsequent capture release. Do not introduce a check-only/alternate-config/test-export API to the permanent tool. 5. After explicit capture release under the existing sole lease, run the unchanged actual command shape above against U. Its first stage must print preflight0 before any upstream command. Require exact SHA/package12.11.6, frozen pnpm10.33.4 install/system/react builds, all697tracked hashes unchanged after build and after capture,22unchanged descriptors,20accepted/twooutside boundaries, two genuinely distinct actual Bun processes and complete equal observations. Preserve all five new capture/hash files and exact new main/tool/cases source hashes with process receipts. Compare historical canonical and successor descriptors and outcomes exhaustively, excluding only capturedAt. STOP on any semantic difference. The corrected selector must prepare exactly the previous valid ternary values by identity, not new normalized copies. 6. Rerun targeted units/docs/traces/member checks without status changes. Root then reviews actual capture and releases fresh original3consumer execution separately. Preserve actual complete consumers and all19negative obligations per existing original compiler modes. Do not reuse historical archive successes as successor acceptance. Refresh a NEW external v3 particular11/33 proposal against actual new source/capture/consumer receipts; preserve v2 as history. Root approves particular proof before any provisional ledger transition, and separately releases the original focused verifier. This correction does not authorize either. Later root reproduction and fresh cold SOURCE review remain mandatory. 7. Freeze complete current/copied source and ENTIRE E externally with exact two-file authored delta, any genuine generated fixture delta, all failed/negative/successful receipts and protected identities. Report STOPPED or LOCAL_READY with actual counts and which later holds remain. No main index edit, implicit lease release, commit, merge, push, deletion or cleanup. A later authorized final gate must be followed by no unverified source edits.

## Done criteria, STOP and maintenance

The bounded local correction is ready for root review only when the complete negative source copy's frozen-bad entrypoint produces the exact known6diagnostics through the actual amended tool with fail-closed verified sentinel setup, both retained identities, zero external boundary sentinel hits and complete actual installed source/declaration closure preservation, the corrected actual W entrypoint produces zero diagnostics under the unchanged parsed configuration, local gates pass, and only the two authored W paths differ. Runtime acceptance additionally requires separately released real paired capture, all22descriptor/semantic equality, fresh3consumer proof, later particular/root/cold SOURCE and focused gates. A pass of ordinary root tsc or old fixture units alone cannot establish that the harness runs.

STOP for missing/drifted complete input or copy, unexpected bad-main diagnostics, missing/drifted dependency root or actual program closure, sentinel installation/readback failure or ineffective observer, config/parse failure, wrong installed TS version, compiler flags copied/changed, unexpected root membership, any external work on failed preflight, weakened or filtered diagnostics, needed third authored source path, changed discriminator schema, any altered Reflect.apply argument/exception/result guard, changed22case/order/presence/domain/identity semantics, fixture manual edit, pin697 drift, output mismatch, fake oracle, assertion/19negative weakening, consumer/compiler/metadata/bookkeeping change or new broad source requirement. Preserve the first actual failed result. Only ordinary formatting inside the approved edits may be repaired after saving its failed receipt; substantive problems require new root review and explicit reopening.

This puts the omitted entrypoint check at the place that executes it. Future harness edits must keep this preflight before external work and regenerate actual paired capture provenance even if descriptors are unchanged. Do not expand tsconfig include or substitute flags as a shortcut. The test boundary is the real capture tool with frozen bad/current main, actual installed TS config and genuine upstream export process. Product query semantics remain independently covered by public core/unit/installed tests.

## Conformity and deviations

Conforming proposed behavior is selecting the actual Schema `tag` variants with the public named discriminator, followed by unchanged canonical inputs, real upstream invocations, unknown-return guard and complete ordered original-element observation. Compiler preflight uses the original project policy and explicitly includes the real omitted entrypoint without globally changing that policy. Corrected compiler and runtime execution is unverified in this draft.

Intentional retained research deviations are the one conservative unknown-return declaration and three narrowly justified Reflect.apply calls. Flow's branded IDs, minimal Schema-derived inputs, readonly input arrays, NoInfer selector and JSON default edge domain remain separately approved differences. Pure utility aliases remain distinct from native actors/DOM/lifecycle guarantees. The eight read-only-use dependency links and verified external sentinels are bounded negative test-assembly deviations; they do not alter installed dependencies, compiler policy or permanent tool APIs.

Unverified are actual dependency/source closure comparison, native sentinel writability/setup, this correction's compiler/gates/capture/consumer results, particular11/33proof and all33cell acceptance, focused/root/cold SOURCE acceptance, whole072/069, full-suite/integration/release/CI/devices/performance/collector delivery. This author performed read-only source/API/receipt/integrity investigation and wrote this main plans document only, with no source edit, compiler probe, gate or capture retry.
