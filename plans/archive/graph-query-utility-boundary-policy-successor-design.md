# 092 tighten the actual reference invocation boundary

Design successor, 2026-10-02, main commit `841be137e253cf19c665269eaaa79edc19abf3c3`. P1, small, low implementation risk. This supplements the full existing approved092 packet and does not reopen its production contracts. Source execution requires primary and independent design approval. The original executor is resumable in its existing isolated worktree. Root writes plans only.

W is `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`; E is its sibling `graph-query-utility-evidence`; U is its sibling `graph-query-reference-xyflow`. Main is `/Volumes/Sync/codex/9-19-26/flow`. Keep implementation uncommitted. No Git mutation or cleanup is authorized. All33 cells remain OPEN; particular approval and focused verification remain held until the successor evidence is reviewed.

## Problem and personally inspected source

Root read all368 lines of W `research/harnesses/graph-query/cases.ts`, all64 lines of `main.ts`, all226 lines of the conformance test, and all185 lines of the capture script. Root read the original092 plan, canonical-input approval, dead-unit approval, standards and the entire bounded policy preflight. Necessary research exceptions are judged on merit under the improve closing-the-loop rule. This work removes unnecessary exceptions and makes the real external result boundary explicit.

Current exact source hashes, verified by the independent preflight and required again before editing:

| File | SHA256 |
| --- | --- |
| research/harnesses/graph-query/cases.ts | b027c2f21aa907a37661229053401ad4ff1e401767012cc95eefb911af3b3363 |
| research/harnesses/graph-query/main.ts | 806cd2c8d98fa6d56a3960bdfd90252951f5190fe66cb0160a3ec6e1e29fe847 |
| packages/conformance/src/graph-query-reference.test.ts | 4f07b0858cfc2eddf642305f43c7d958ea0f86fabaf7c8a665876250baaeef4f |
| scripts/capture-graph-query-reference.ts, protected | 86c175cbfd1771a0bf4c7f044d486e7a3c0dd84946af9617bc9143776b916ad5 |

At cases.ts:73 the current declaration checks `typeof value === 'function'` but intentionally describes only `(...args: never[]) => unknown`. It proves representation, not parameters, invocation success or arrays. At :248 a no-unknown-returns comment surrounds Object.keys even though snapshot explicitly returns string. At main.ts:39 the call callback constructs a record directly from three Reflect.apply results. TypeScript's broad Function fallback returns any; explicit unknown assignments will quarantine that uncertainty. At conformance:89 the provenance test has seven real expectations under a whole-file max-expects suppression.

The actual capture script authenticates U HEAD `0a1f9575b25679f2880175de8d3eae21aedde921`, clean697 tracked source files and @xyflow/react12.11.6. It frozen-installs pnpm10.33.4, builds system/react, invokes main.ts in two separate Bun processes and checks complete observations and all tracked hashes. This command regenerates an owned Flow fixture, never imported upstream evidence. Standards require unknown external entry, Schema-derived own contracts and real reference proof.

## Exact edits and justified exceptions

Only THREE existing authored source files may change in this correction.

1. In cases.ts change the existing Effect import to `import { Predicate, Schema as S } from 'effect'`. In CallableSchema replace only `typeof value === 'function'` with `Predicate.isFunction(value)`. Retain the exact conservative predicate signature and declaration. Restrict the surrounding disable/enable to `anti-slop/no-unknown-returns` alone. Explain that function representation leaves return values unknown until the actual observation array guard. Remove only the redundant snapshot suppression comment. Preserve every Schema, all22 descriptors, raw/canonical input preparation, identity/order pools, withHandles and all observation bodies.
2. In main.ts replace only the current expression-body call callback with the following block-body form. Retain each existing narrow no-reflect-apply exception immediately before the actual corresponding call, with an honest external-boundary explanation. Do not introduce a wrapper or fabricate upstream argument/result signatures.

```ts
const call = () => {
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Actual pinned public export; its raw external return is observed as unknown.
  const incoming: unknown = Reflect.apply(helpers.getIncomers, undefined, [
    selected,
    nodes,
    edges,
  ])
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Actual pinned public export with the same owned input objects.
  const outgoing: unknown = Reflect.apply(helpers.getOutgoers, undefined, [
    selected,
    nodes,
    edges,
  ])
  // oxlint-disable-next-line anti-slop/no-reflect-apply -- Actual pinned public export; selected IDs remain separate from the identity pool.
  const connected: unknown = Reflect.apply(
    helpers.getConnectedEdges,
    undefined,
    [connectedNodes, edges]
  )

  return { incoming, outgoing, connected }
}
```

Pure formatting within this block may follow the unchanged formatter. Preserve selected/canonical ordering, module import/decode, three export names, undefined thisArg and every argument identity/order. Every raw result reaches unchanged observeCalls and its actual mutable unknown-array guard before element observation. The three Reflect.apply comments and one opaque unknown-return exception are expressly justified harness-only deviations. They grant no production or installed-helper exception, broad Function alias, any annotation, cast, `.call`/`.apply` substitution or config change. Do not claim zero inferred-any in TypeScript's standard library. 3. In conformance remove the first disable and final enable lines. Replace ONLY the seven-expect provenance test with TWO tests. The first, named `preserves complete case identity and manifest provenance`, retains descriptor strict equality, unique count22 and manifest SHA expectations. The second, named `authenticates the pinned package and genuine two-process metadata`, retains the original SHA/package/version/twoProcessEqual expectations verbatim. Keep every expected value, both suites, all20 accepted cases, outside-domain assertions, all11 member mappings and full ordered equality/freshness assertions. Do not hide expects in a helper. This adds one test by organization; scoped count should be87 instead of86 if no other difference exists. Report actual counts.

No other source edit is allowed. The only subsequent generated source artifact is `research/fixtures/graph-query-reference.json`, produced by the unchanged real capture command after successful local gates. Update only existing owned plans execution/provenance records to distinguish historical and successor bytes; trace line citations may be refreshed only in existing owned `research/traces/graph-query-utilities.md` if they actually moved. No imported artifacts, consumer type/runtime fixtures, product helper/test, checker, ledger/catalog, configs, dependencies, lockfile or native host changes.

## Ordered execution and commands

1. Read/hash/copy complete governing packet and this design plus primary/cold approval. Before editing independently rehash all1513source/3919E entries of dead-unit-correction-freeze `1e18501c8d5bfde6bdac3810debe760b9ea6c563de292aba58f61636eda42dca` and every corresponding preserved copy. Save complete new preedit source and entire currentE OUTSIDE E, including all historical failures, actual three consumer successes and19-negative persistent replay. Require zero mismatches and exact four hashes above. ACK preservation and source edit still false before edits.
2. Apply the exact three-file correction. Run `bun run typecheck`, `bun run check`, `bun run check:architecture`, and `bun run test -- packages/core/src/domain/flow-graph.test.ts packages/conformance/src/graph-query-reference.test.ts scripts/check-api-member-contracts.test.ts`. All must exit0 with no skips. Run `git diff --check`. Record the first failed result and STOP on substantive failure; only ordinary spacing within these exact edits may be corrected after preservation. Audit all original seven provenance assertions and every22 descriptor/order/domain/handle instruction unchanged, product source/unit and19-negative fixture unchanged, no new suppressions beyond the four bounded exceptions.
3. The existing092 sole lease permits the actual reference capture. Run `bun run scripts/capture-graph-query-reference.ts --checkout /Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/graph-query-reference-xyflow --evidence=<NEW absolute E successor capture directory>` in W. Save command, stdout/stderr, actual two distinct process execution and complete five capture/hash files. Expected exit0,22 cases,697 identical tracked sources and complete first/second observations equal. Separately record exact successor cases/main/tool byte hashes against the process receipts. Old captures and source provenance remain immutable. Compare old/new case descriptors and semantic outcomes exhaustively, excluding only authentic capturedAt metadata. STOP on any semantic difference or pin drift. No hand-edit of fixture or output sorting.
4. Rerun exact targeted units and existing docs/trace/member/catalog checks from the original packet. Prepare a refreshed EXTERNAL particular11/33 proof proposal with current actual path:line, successor capture provenance, unchanged19 type obligations and explicit necessary IO deviations. Preserve v2 proposal as history. No ledger transition or focused verification is released by this successor design. Actual installed consumers and focused/root/cold SOURCE remain the next acceptance gates, never replaced by local compilation or old captures.
5. Freeze complete source/current copies and entireE/current copies externally with exact allowed delta, retention and all failed receipts. Report actual commands/counts and STOP or LOCAL_READY. Do not modify main index, release lease implicitly, commit, merge, push, delete or clean up.

## Conformity and deviations

The external path is module URL import into unknown, Schema callable representation decode, three real upstream invocations, explicit unknown results, actual array guard and complete ordered original-element observation. The Flow path remains separately typed public core helpers with no actor, geometry, DOM or lifecycle guarantee. Canonical case inputs are conforming design structure; successor execution is unverified until real gates run.

The four narrow research exceptions preserve honest uncertainty for declaration-outside observations. Flow's branded IDs, minimal own Schema types, readonly inputs and JSON default edge domain remain separately reviewed intentional differences. All33 cells, whole072/069, focused acceptance, full suite, integration, CI, devices and collector delivery remain unverified. Future capture-source edits must regenerate actual paired capture provenance even when descriptors and outputs are unchanged.
