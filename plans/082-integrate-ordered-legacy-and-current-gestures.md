# Plan 082: Preserve frozen reader error order and migrate current gesture expectations

Separate executor in a new isolated worktree. No commits, merge, push, dependency changes or publication. Primary owns the index and final acceptance. Planned at main `841be137e253cf19c665269eaaa79edc19abf3c3`, 2026-09-30. Priority P1, effort M, risk medium. Status PENDING independent architecture review.

## Input and purpose

The complete 070 candidate at `/Users/richardmcandrews/.codex/worktrees/complete-persistence-integration/flow` is frozen and unaccepted. Obtain its final patch and every tracked/untracked file hash from the executor before copying it. It contains independently accepted 065 proof, 080 origin/native source, 078 directed named-handle core and the bounded pinned origin/connection capture, plus complete additive persistence/method/client work and reviewed fresh-commit caller migration. Preserve all input histories and hashes. This plan repairs two explicit integration dependencies; it does not activate Plan 081.

070 individually passed mounted public persistence tests in Vanilla, Vue and actual Foldkit Runtime. Its saved focused run passed 655 units in 50 files, quality/architecture, builds/types, docs/contracts and three packed consumers, then stopped on the Vanilla shared connection test. Fresh commit callers were migrated to the accepted gesture constructor, preserving the correct reversed opposite-kind assertion. The next targeted run stopped on the old target-target rejection expectation. A separate read-only reviewer then found the inherited frozen-reader error-order defect, reproduced by the primary. No candidate is accepted by these partial passes.

Follow `docs/standards.md`, AGENTS and `docs/tooling.md`. Keep graph meaning and Effect workflows in core and framework lifecycle in adapters/apps. Exact existing Effect/Foldkit/Vue pins and lockfile remain unchanged. Frozen `bun install --frozen-lockfile` is allowed only in the new isolated checkout. Immutable `research/artifacts/` and frozen legacy oracle are never edited. The advisor edits only plans; source changes belong to this executor.

## Verified current defects

Primary read `packages/core/src/domain/flow.schema.ts:185-438`, the frozen oracle `packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js:367-418`, the current legacy helper and persistence reader, all three fresh commit routes and the two fixture records.

The current `decodeLegacyDocumentBody` in `flow-persistence.ts:144-165` calls `findLegacyEndpointKindIssue` before normal integrity. The helper scans every explicit noncanonical handle across edges before checking missing nodes, duplicate IDs or parent errors. A literal1 graph with source node `a`, target-kind source handle `in`, and missing target `missing` currently yields MissingEdgeHandle(source,a,in). The actual frozen reader yields MissingEdgeEndpoint(target,missing). Primary reproduced both current legacy and additive readers giving the wrong error. Moving complete live validation before the guard also fails: an earlier noncanonical edge must still win over an ordinary error on a later edge.

The frozen order is duplicate node indexing, parent reference/extent/self checks, parent cycles, duplicate edges, duplicate handles, then each edge in document order: source node, target node, source handle identity/kind, target handle identity/kind. Preserve exact tags and payload IDs. Live/v2 integrity intentionally accepts any existing explicitly named physical handle kind.

The immutable historical `research/fixtures/interaction-lifecycle.json` case `loose-rejects-target-to-target-rendering-gap` expects rejection for `loose-source/in` to `target/in`. The independently accepted new capture `research/fixtures/origin-connection-reference.json`, sample `loose-target-target`, released phase records callback and stored edge `b/in -> a/in`, native error008 and zero native rendered paths. These observations are distinct. The accepted Flow constructor directs by initiating kind and permits distinct named target-target physical endpoints; the current Flow result `target/in -> loose-source/in` is correct. The old rejection is a historical Flow limitation, not the current accepted contract. Preserve both fixture files unchanged and document the transition.

## Design

Use one existing integrity traversal with a private discriminated endpoint-handle policy, physical-ID integrity for live/v2 and frozen canonical kind integrity for literal1 readers. Thread that policy only through existing ordered integrity helpers and the existing decode/validation workflow. Keep public `validateFlowDocument` and `decodeFlowDocument` signatures and default semantics unchanged. Add one module-local exported legacy decode entry point for persistence only, absent from `packages/core/src/public.ts`; it shares the same Schema decode, ordered integrity checks, errors, logging and spans. Avoid copying the frozen validator, whole-document validation twice, a separate graph authority or a pre-scan of all edges. The exact helper name is a routine implementation choice; its scope is private package composition, not a new public contract.

The existing narrow `findLegacyEndpointKindIssue` may remain a format-capability predicate for writers after ordinary graph validation. It must no longer choose reader failure order. Additive literal1 precheck continues decoding the stored plus known-extension projection, then uses the ordered legacy decoder before deciding supported-format reasons. Known origins/native fields do not mask ordinary legacy integrity. Existing frozen projection and unknown/transient-key stripping remain unchanged; v2 still uses generalized live integrity.

For host tests, keep the original `interactionConnectionCases` export and historical fixture untouched. Add a separate current native connection-case projection in `apps/shared-e2e/interaction-lifecycle-contract.ts`, derived from the existing Schema type. It differs only for the exact historical target-target case: accepted, literal directed endpoints `target/in -> loose-source/in`, edge1 and existing accepted event order. Preserve unrelated cases unchanged. Give the current case a truthful name, retain an explicit link/name to the historical case in documentation, and omit the obsolete rejection reason. Do not compute expected endpoints by calling production connection constructors.

Only the existing exhaustive Vanilla and Vue production connection loops consume the new current projection. Other tests continue using their original fixture cases. Add an actual public Foldkit target-target pointer test using the existing harness and named physical handles. It asserts exact directed accepted edge, source/target handle identity, no duplicate acceptance on a repeated gesture, and public read/render endpoints after measured readiness. Flow rendering accepted target-target physical IDs is an intentional difference from native008; do not assert upstream rendered parity. Use actual public owner/client APIs, no test-only internal model setters.

The reviewed three fresh commit routes already call `connectionFromHandleGesture` once and use its successful directed result. Preserve them unchanged. Preview payloads, radius, thresholds, strict target start eligibility, origin activation and reconnect changes remain Plan 081-owned. No tolerance, skip, rejection guard or shared fixture rewrite may force a gate green.

## Exact editable scope

- `packages/core/src/domain/flow.schema.ts`, only the shared ordered integrity/decode policy.
- `packages/core/src/domain/flow-persistence.ts`, only composing that legacy policy in the existing legacy/additive1 reader path.
- `packages/core/src/domain/flow-origin-persistence.test.ts`, exact mixed-error oracle matrix.
- `apps/shared-e2e/interaction-lifecycle-contract.ts`, the distinct current native case projection.
- `apps/vanilla/e2e/interaction-lifecycle.e2e.ts` and `apps/vue/e2e/interaction-lifecycle.e2e.ts`, only the current-case import/exhaustive loop and assertions needed for exact current semantics.
- `apps/foldkit/e2e/interaction-lifecycle.e2e.ts`, only the public target-target acceptance/duplicate/measured-render test.
- `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, `research/traces/complete-versioned-persistence.md`, `research/PROGRESS.md`, `verification.config.json`, `plans/archive/ordered-legacy-integration-execution.md`, `plans/ordered-legacy-integration-provenance.json`.

Copying complete frozen input is allowed before edits and separately hashed. No other source edits, public exports, new error types, manifest/lockfile changes, imported/generated/frozen fixture edits or member/parent closure. Stop for primary scope review if a new actual dependency is needed. Main plan/index and old candidate are never changed by the executor.

## Execution and tests

1. Read this full plan and canonical 070/078/081 plus all accepted input reviews. Check frozen input hashes, install unchanged dependencies in the new worktree, assemble complete source and record every overlap and input/output identity. Confirm old worktree and frozen fixtures are unchanged.
2. Implement the shared ordered policy and compose all literal1 readers through it. Add an oracle matrix across frozen/current/additive document and session readers. Compare error tag and every payload key, excluding stack/traces, then assert new current errors use the actual current error classes. Cases include noncanonical source with missing target; duplicate node/parent/cycle/duplicate edge/duplicate handle plus wrong kind; missing source handle plus noncanonical target; earlier ordinary edge error versus later wrong kind; earlier wrong kind versus later missing node/handle; both endpoint nodes missing; source/target kind ordering; absent/own-undefined handles and unrelated invalid transient/excess keys. Keep the existing valid-v1/v2, own-undefined, forged-known-extension, identity, ownership and version matrices.
3. Introduce the distinct current native projection and migrate only the two real exhaustive production loops. Assert five historical identities remain unchanged, four unaffected current cases equal originals, and the one current target-target acceptance is explicit. The existing conformance units keep historical evidence. Add the actual Foldkit test with public measured endpoint assertions and repeated-gesture duplicate rejection. Preserve old strict, reverse-kind, duplicate, cancellation and reconnect assertions.
4. Run focused tests and all three production connection files serially on owned strict ports4176/4177/4178. Preserve every failure; at most two focused repair attempts per required gate, then freeze and report. Do not rebuild packages concurrently with browsers. No timeout increases, weakened comparisons or arbitrary readiness sleeps. Poll accepted public nodesInitialized and positive current handle sizes where relevant.
5. Update the production/test trace with exact current path:line citations and Conformity and deviations. Label the frozen-error repair, historical fixture transition and target-target rendered difference. Keep original member cells and remaining081/069/074 dependencies open.
6. Save the focused verification scope from complete070, adding all three interaction files and new applicable checks without reducing the existing scope. Run all required gates below; freeze final hashes and report actual results, limitations and earlier failures. Primary independently reads every changed hunk and reproduces the saved verifier before source acceptance or081 activation.

```sh
bun run test -- packages/core/src/domain/flow-origin-persistence.test.ts packages/core/src/domain/flow-persistence.test.ts packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-directed-handle.schema.test.ts packages/foldkit/src/application.test.ts packages/foldkit/src/snapshot-client.test.ts
bun run check
bun run check:architecture
bun run typecheck
bun run verify --list
bun run verify
git diff --check
```

Package builds, three packed consumers, docs/catalog/member/contracts/traces and all selected host suites must pass through saved verify. Final combined full verification and release dry run remain required after081, not acceptance claims from this source stage.

Done means complete070 plus these two bounded dependencies passes its saved source-stage verification and independent source review, frozen reader error identity/order matches the oracle, actual current gestures have exact directed endpoints across all hosts, and all historical inputs remain unchanged. It does not close067/070 parents or establish generic/unnamed/accessibility/device/CI/collector parity.

## Conformity and deviations

Conforming after required tests: exact frozen literal1 integrity order, generalized live/v2 named-ID integrity, one shared graph traversal and once-only fresh gesture direction. Intentionally different: Flow renders accepted named target-target edges where pinned React callback/storage accepts but native rendering reports008. Unverified: this plan's execution, final081 geometry/preview/restoration, full integration/release gates and remaining original member requirements.

## Approved review implementation clarification, 2026-09-30

Independent review APPROVED the design at plan hash `2927da8beb18cf47ff8fd991d3488e7b9ee35d5112ead5834ff748010f807a88`, record `ordered-legacy-independent-design-review.md`. Primary read the complete review and verified its cited pipeline. Its single-traversal clarification is binding: the current additive1 precheck must return its validated document rather than void followed by a second full legacy decode. Reuse that validated document through the format decision and frozen Schema projection/session construction. Schema field projection is allowed; a second graph integrity traversal is not.

Primary also reproduced malformed session viewport zoom0 combined with a noncanonical source handle. Frozen/current legacy readers report SchemaError at viewport.zoom; current additive1 incorrectly reports MissingEdgeHandle. The existing complete envelope's schema validation must precede integrity for legacy-representable fields. In additive1, validate the complete known-extension stored envelope, including the unchanged viewport schema for sessions, before its one ordered legacy traversal. Private expanded literal1 document/session boundary schemas may compose the existing fields; they are not new exported formats or public types. Keep known origin/native detection before frozen stripping and its established format policy. Add malformed/missing viewport plus graph errors to the oracle matrix and compare Schema issue paths as well as tagged integrity payloads. Do not merely move a viewport decode after graph validation.

Execution worktree is `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow`, clean at the stated baseline. Frozen070 input provenance hash is `39d371d41438c3936c3d32f8cb75654ee04657e2bedc79ff67bf9b5c33620ac0`; tracked patch hash is `f68cb5c58ba69ea39683707fc77fa81e7116b2e52a154fcbfc54d2d6e5b84987`; all108 output files were independently hash-checked with zero mismatches. Original candidate stays unchanged. Source activation still requires primary acceptance of the independent clarification.

## Assembly quality clarification, 2026-09-30

Primary inspected the initial quality failure and the inherited Foldkit fresh-commit branch at graph.ts:818/821. The executor may add exactly the two required blank lines around its existing failure branch/validated connection binding; no semantic edit is authorized there. Formatting copied plans/070-migrate-origin-aware-persistence.md and plans/complete-persistence-provenance.json is also allowed only in the new082 checkout. Preserve the byte-identical frozen070 input, original assembly hashes and recorded history; record these output-only formatting deltas separately. Owned082 lint/format repairs stay within the existing scope and preserve every assertion. This clarification creates no additional gate repair allowance.

## Actual Foldkit measurement fixture prerequisite, 2026-09-30

The first Foldkit interaction run passed37 existing tests and failed the new target-target case because its Runtime mount does not compose the native measurement observer. Primary traced test-harness.ts:887-972 and the public DOM-handle producer createFoldkitNodeMeasurementObserver at measurement-observer.ts:31-132; waiting or node-only refresh cannot establish measured handles. Add apps/foldkit/e2e/test-harness.ts to the hard allowlist solely for startMountedMeasurementObserver():void on the existing harness. Import the public observer/value type, resolve the existing Runtime and #app owner, and compose actual native DOM measurement with that owner at the fixture's existing viewport zoom1. Forward its returned measurements through the existing HostAction.MeasureNode ports and check send failure. Store the observer by captured Runtime in a WeakMap; dispose/delete it in existing disposeHandle before the snapshot client and Runtime. The new test invokes this method after its final loose mount and before unchanged readiness/positive-handle assertions. Existing mount defaults, other tests, product source, measurements, tolerances and expected SVG output remain unchanged. This is focused browser repair1 and grants no extra repair allowance. Preserve /tmp/flow-082-foldkit-interaction.log.

## Final fixture owner-resolution clarification

Browser repair1 exposed that the native Runtime replaces the mount element with application.ts:2543's rendered .flow-foldkit-root. Primary inspected that real view and the failed setup evidence. The observer helper must resolve the actual rendered .flow-foldkit-root, assert there is exactly one such root in this single-Runtime fixture, and retain the captured existing Runtime. This supersedes the #app lookup only inside that helper; the unique-root guard rejects ambiguous/foreign owners. Public producer, WeakMap, checked ports, zoom1, disposal and every behavioral assertion stay unchanged. This is browser repair2, the final permitted attempt; preserve the first two failure logs/contexts and STOP if the required browser gate still fails.
