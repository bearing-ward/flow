# Ordered legacy integration execution

Status: COMPLETE for the bounded source-stage executor gates; primary source acceptance pending. Isolated baseline841be137e253cf19c665269eaaa79edc19abf3c3. No commits or host081 activation.

## Assembly

Complete frozen070 tracked binary patch f68cb5c58ba69ea39683707fc77fa81e7116b2e52a154fcbfc54d2d6e5b84987 and108 tracked/new outputs copied with zero mismatch. Final evidence provenance71d7a191ca5aefb0643b6b8da82183f5d1f571872343b99e6c565f835a14b810 supersedes earlier39d371 checkpoint only in evidence records, as personally verified and authorized by primary. Original candidates and all STOP histories unchanged. Approved plan767e7d06 and independent review faae003e verified before source. Complete identities are in ordered-legacy-integration-provenance.json.

## Initial gate history

- Frozen install passed,320 packages, log /tmp/flow-082-install.log.
- Initial targeted units exited1 because the fresh checkout had no built @flow/core export.165 tests in the two source-only suites passed; four suites could not import. Log /tmp/flow-082-targeted-units.log. Build bootstrap is required before those package-entry imports.
- First build bootstrap exited1 with TS2345 from the heterogeneous Effect.flatMap callback return, cascading unknown error types. Log /tmp/flow-082-bootstrap-build.log. Focused repair1 uses the existing Effect generator workflow so both SchemaError and SavedFlowFormatError infer without casts or policy changes. No assertion changes.

## Bounded verification before browser gates

- Bootstrap build repair1 passed all four packages. Targeted unit rerun after build passed333tests/6files in2.61s, log /tmp/flow-082-targeted-units-built.log.
- Architecture passed206production sources and rule fixtures, log /tmp/flow-082-architecture.log.
- Quality initial failure found new owned test spacing/await/style issues plus inherited fresh-commit graph spacing and copied070 plan/provenance formatting. Primary approved only two graph blank lines and copied metadata formatting; original input remains unchanged. Repair1 fixed owned/metadata items but the attempted graph string replacement did not match the actual validated binding, leaving the same two spacing errors. Corrected exact inspected binding under repair2; quality passed746files, log /tmp/flow-082-quality-repair2.log. Earlier logs preserved: /tmp/flow-082-quality.log and /tmp/flow-082-quality-repair1.log. No semantic graph changes.
- Typecheck first failed TS2379 in the mixed test's heterogeneous document/session reader function array. Focused repair1 executes both typed Effect reads explicitly before combining their failures; no expectation change. All packages and workspace types passed, log /tmp/flow-082-types-repair1.log; initial /tmp/flow-082-types.log retained.
- Saved verify --list passed, fullSuite=false. Complete070 scope retained; three interaction files and ninth actual Runtime projection are included. Log /tmp/flow-082-verify-scope.log. Strict4176/4177/4178 were empty before serial browsers.

## Serial interaction production gates

Vanilla full lifecycle passed37/37 in17.0s, log /tmp/flow-082-vanilla-interaction.log. Vue full lifecycle passed26/26 in12.8s, log /tmp/flow-082-vue-interaction.log. Existing ResizeObserver loop diagnostics appear in Vue's Vite log, but assertions passed.

Foldkit first full lifecycle passed37 existing cases and failed the new38th at nodesInitialized readiness after5s. Log /tmp/flow-082-foldkit-interaction.log. Original error context apps/foldkit/test-results/interaction-lifecycle.e2e.-583eb-s-and-rejects-the-duplicate/error-context.md is preserved at /tmp/flow-082-foldkit-readiness-error-context.md before any rerun. Diagnosis: the existing public test harness creates/embeds Runtime and subscribes result ports but does not attach the native measurement observer; waiting cannot initialize actual handle measurements. Its existing refreshMeasurementNode supplies width/height only, so cannot replace the promised current positive declared handle proof. Primary approved the exact bounded setup method, now composed from the exported observer into the same owner and checked MeasureNode ports, with Runtime-keyed disposal before client/Runtime. Fixture lint/format passed. Browser repair1 passed37 existing cases but failed setup immediately because Runtime replaces the #app mount with its rendered .flow-foldkit-root. Log /tmp/flow-082-foldkit-interaction-repair1.log; context preserved at /tmp/flow-082-foldkit-owner-error-context.md. Primary authorized final browser repair2 to resolve the unique actual rendered root instead of the detached mount ID. Full Foldkit lifecycle passed38/38 in16.5s, including unchanged readiness, measured SVG path/endpoints, exact IDs, duplicate rejection and lifecycle assertions. Log /tmp/flow-082-foldkit-interaction-repair2.log. Targeted owner lint first requested array destructuring; that nonsemantic repair passed. No third browser repair occurred. No readiness assertions, tolerance, production geometry or frozen fixture changes.

## Saved focused acceptance gate

Mandatory saved `bun run verify` exited0 in98.207s, profile focused/fullSuite=false, log /tmp/flow-082-focused-verify.log. Quality746files, architecture206production sources/rule fixtures, allfour package builds and workspace types,708units/50files, generated/authored docs, catalog208entries/200capabilities, API114pages/2692members, original contract8076cells/7887stillopen,2417citations/69traces and allthree packed consumers passed. Selected browsers passed85Vanilla +68Vue +81Foldkit =234, serial strict4176/4177/4178. The Foldkit actual Runtime versioned-persistence case passed with allnine returned JSON projections, including internalNode.node.data; no private accepted-state access replaced it.

Standalone full interaction files also passed37Vanilla/26Vue/38Foldkit. All prior failures and two browser repair rounds remain preserved. No new skip, retry/tolerance/timeout change, frozen fixture change, production measurement/origin/renderer change, dependency/lock change or commit/merge/push occurred. Focused union includes measured geometry, renderer, lifecycle, public state/edits, versioned persistence and catalog states across allthreehosts, plus Foldkit native-schema; docs/catalog/API/contracts/traces/consumer checks remain selected. Exact `verify --list` log is /tmp/flow-082-verify-scope.log.

Final source acceptance is pending primary full-diff review and independent saved verifier reproduction. Plan081 activation/rendered restoration and fullverify/releasedryrun remain separate required future stages; parent067/070/057 and original069/074/member/device/CI/collector requirements are not closed.

## Final scope and freeze

Complete frozen070 composition is retained. Additional082 changes are shared ordered integrity/legacy reader composition and mixed-error tests; separate current native projection; two existing production pointer loops; new actual public Foldkit target-target/duplicate/measured-render test; the explicitly approved test-harness observer setup/unique rendered-owner/disposal; exact two graph whitespace lines; authored docs/trace/progress/scope and copied metadata formatting. No public core export or new error was added. The module's internal legacy decode is absent core public.ts. Allinput candidate patches/files re-audited with zero mismatches. Original frozen070108outputs, its final provenance and tracked patch remain identical.

All task browser processes stopped normally with Playwright completion. Independent lsof checked4176/4177/4178 and found no listeners. Final output inventory, per-file hashes, original oracle/capture/manifests, required command logs and scoped deltas are in ordered-legacy-integration-provenance.json. Evidence records finalized before final freeze; primary will reproduce without candidate mutations.

## Conformity and deviations

Verified bounded Flow contracts: frozen literal1 error tags/payload/order and viewport-first validation, one ordered traversal, generalized live/v2 physical IDs, once-only fresh direction, actual current native gestures and measured Foldkit target-target SVG output, complete persistence/public ownership and client gates. Intentional native rendering difference: pinned target-target callbacks/storage accept while renderer008 produces no path; Flow renders accepted physical IDs. Historical fixtures and frozen oracle remain unchanged. Unverified/held: final081 origins/previews/restoration, full/release, original parent/generic/unnamed/accessibility/device/CI/collector acceptance.
