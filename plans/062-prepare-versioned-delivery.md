# Plan 062: Prepare versioned delivery and the first reviewed release

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- .github/workflows/ scripts/release-dry-run.ts scripts/check-packed-consumer.ts docs/release-process.md` and inspect `git status --short`. Check the remaining in-scope paths below as well. Prerequisite changes are expected: record their SHAs and compare their contracts against this plan. Stop for an ownership or scope mismatch; revise later-stage details against the landed implementation before writing code.

## Status

- Priority: P2
- Effort: L, execute in the bounded work packages below
- Risk: MED
- Category: direction
- Execution mode: Release preparation; publication is a separate authorized action
- Depends on: 060 proof for declared support, 061 packed adapters; 057-059 coverage determines permissible release claims
- Planned at: `f8b73f2`, 2026-09-27
- Status: TODO

## Why this matters

The repository has CI configuration and a local dry run, but no published packages or chosen Flow license. Prepare a concrete release candidate with consumer evidence, changelog/migration docs, reproducible archives, and a publication workflow that the maintainer can approve after reviewing the result.

## Current state and exemplars

`scripts/release-dry-run.ts:23-27` deliberately encodes the current boundary:

```ts
effectVersion: S.Literal('4.0.0-rc.116'),
flowLicenseStatus: S.Literal('deferred'),
publishCalled: S.Literal(false),
upstreamResearchLicense: S.Literal('MIT'),
status: S.Literal('dry-run'),
```

`docs/release-process.md:9-11` says Flow packages are private 0.0.0, the maintainer must choose license/version/metadata, and document envelope version 1 is independent. `.github/workflows/ci.yml` already runs verify, consumer, and release dry-run on macOS; configuration alone is not a hosted successful run. Match schema-validated manifest generation and temporary-consumer cleanup in the existing scripts.

## Architecture and evidence rules

The product target is every capability in the React Flow API, examples, and UI sidebars across plain JavaScript, Vue, and Foldkit. The dated inventory is `research/catalogs/react-flow-2026-09-26.json`; `research/PROGRESS.md` owns current status. Catalog ownership in `plans/next-chunks-coverage.json` is planning coverage, never a parity percentage.

Follow `docs/standards.md`: Effect v4 owns workflows and scoped resources; Effect Schema owns data contracts and derived types. Decode external unknown values once. Keep graph meaning, geometry calculations, and serializable transitions in `packages/core`; keep DOM, framework rendering, callbacks, and scheduling in their adapter. Vue integration already lives in `packages/vue`; Foldkit remains in `apps/foldkit` until its packaging plan. Do not mount the vanilla DOM renderer inside another framework. Preserve the exact Effect/platform `4.0.0-rc.116`, Foldkit `0.163.0`, and Vue `3.5.43` baseline unless a separately reviewed dependency change is required.

`docs/architecture.md:5-16` separates caller documents, viewport sessions, host-fed measured geometry, and transient gestures. Controlled operations propose changes; only owner acknowledgement changes accepted state. Uncontrolled operations validate, commit, and notify. Preserve Plan 052 atomic edits, protected deletion, FIFO/reentrancy, frozen updater inputs, and disposal settlement. Do not serialize functions, DOM nodes, measured geometry, or transient previews into the saved document.

Use the existing `FlowSpan` and `FlowAttribute` constants in `packages/core/src/telemetry/flow-telemetry.ts:1-56`; add named constants only for new boundaries. Trace decode, lifecycle, semantic change, and failure; do not log each pointer move. Application composition owns optional export and shutdown flushing.

A trace starts at the actual public/browser entry point and follows accepted state, geometry, scheduling, DOM effects, and rendered output with exact file:line citations. Describe test paths separately. End it with `Conformity and deviations`, classifying selected comparisons as conforming, intentionally different with a reason, or unverified. Pinned upstream source is `0a1f9575b25679f2880175de8d3eae21aedde921`; it is distinct from the current website contract. Leave `research/artifacts/` immutable. Use a disposable full upstream checkout for executable comparisons, following `scripts/capture-graph-edit-reference.ts`; imported research files alone are not a runnable upstream build.

## Commands and execution discipline

Run from the repository root. These scripts exist at the planning baseline; proposed new test files are named in the steps.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Fresh executor dependencies | `bun install --frozen-lockfile` | Exit 0, unchanged lockfile unless the plan explicitly adds a dependency |
| Quality | `bun run check` | Exit 0 |
| Architecture | `bun run check:architecture` | Exit 0 |
| Build-aware types | `bun run typecheck` | Exit 0 |
| Unit suite | `bun run test` | All tests pass |
| Vanilla browser | `bun run test:browser -- <test-basename>` | Selected tests pass, no new skips |
| Vue browser | `bun run test:conformance:vue -- <test-basename>` | Selected tests pass |
| Foldkit browser | `bun run test:conformance:foldkit -- <test-basename>` | Selected tests pass |
| Docs and traces | `bun run docs:check` and `bun run research:check-traces` | Both exit 0 |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0, every dated entry retained |
| Packed consumer | `bun run test:consumer` | Exit 0; currently core/vanilla only until Plan 061 |
| Complete local gate | `bun run verify` | Exit 0 |

After exported schemas change, run `bun run docs:generate-api` before the docs check. Let `verify` regenerate research inventory; never hand-edit generated research output. Run browser suites serially, with strict ports and no foreign server reuse. Keep the two existing native-pointer skips explicit; never add skips to make a gate green. At milestone closure run the catalog checker with `--upstream`; record drift without deleting the dated baseline or dropping capabilities.

Use an isolated checkout on `codex/<plan-number>-<slug>` when execution is dispatched. Preserve unrelated changes. Do not commit, merge, push, publish, or open a PR unless separately instructed. The latest recorded baseline is `f8b73f2`: Plan 052 records a successful full gate on 2026-09-27, with 146 unit tests and 203 vanilla browser passes plus two existing skips. This planning pass did not rerun that implementation gate. Reproduce a clean baseline before implementation and record actual counts afterward.

## Scope

- .github/workflows/, scripts/release-dry-run.ts, scripts/check-packed-consumer.ts, docs/release-process.md
- New release-candidate validation/dry-run scripts/tests; package metadata files and root lockfile only for release tooling/approved metadata.
- `docs/migrations/`, `docs/tutorials/`, `CHANGELOG.md`, draft release notes/candidate manifests, and license/notice files after an explicit maintainer decision.
- Existing public guides/examples for verified consumer snippets; registry/version configuration after approval.
- Out of scope: silently choosing a Flow license, making packages public as part of planning, actual publish/tag/push without authorization, claiming total parity from a preview release, deploying hosted examples.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New file names below describe proposed artifacts, not existing APIs.

## Ordered work packages

### 1. Assemble the release candidate and decision record

Collect package export inventories, peer versions, archive manifests, supported browser/device matrix, catalog/member/recipe completion, known differences, and unresolved proof. Propose a pre-1.0 release level based on actual compatibility and intended audience; draft version numbers and migration notes without mutating visibility. Prepare license/notice options with the repository's copied-code/asset inventory; do not infer a Flow license from the upstream MIT evidence license. Ask the maintainer for the unresolved license/version/publication choices only after this candidate record is reviewable.

**Verify:** `bun run release:dry-run` and `bun run test:consumer` pass; the record contains archive hashes, exact commit, supported claims, and unresolved decisions. Pending decisions remain explicitly pending.

### 2. Add deterministic versioning and changelog preparation

Implement a minimal release manifest and validation script, using an existing tool only if its maintenance benefit justifies the dependency. Keep package versions and saved-document schema versions independent. Generate changelog/migration drafts from reviewed changes; validate cross-package ranges and exact Effect peers. Provide a non-publishing dry-run command that calculates planned changes and rejects missing decision fields. Do not include install-time scripts or unexpected package files.

**Verify:** new release-script unit tests cover missing approval metadata, incompatible peers, wrong archive versions, missing migration note, and package allowlist violations. `bun run release:dry-run` exits 0 without registry writes, tags, or pushes.

### 3. Finish consumer-facing documentation

Write installation/first-canvas/custom-renderer/interaction/editing/control-mode/lifecycle guides for each native adapter, including CSS and optional integrations. Link the complete example/UI galleries and precise support matrix. Compile executable snippets against tarballs. Explain known deviations and saved-document migration policy. Keep research detail out of basic product setup unless it changes a consumer decision.

**Verify:** `bun run docs:check`, executable snippet tests wired through `bun run test:consumer`, and all new-consumer browser journeys pass. No documented import depends on a workspace path.

### 4. Prepare guarded CI release automation

Keep ordinary PR/push CI read-only with respect to publication. Add an explicit release workflow with minimal permissions, environment protection, selected immutable commit, archive checksum validation, and approved registry authentication. Reuse tested archives or prove rebuild equivalence; never silently rebuild a different commit. Produce a dry-run artifact before enabling publication. If remote execution is not authorized/available, leave hosted status unverified instead of triggering a release to test it.

**Verify:** workflow validation and local dry-run pass; when authorized, an actual hosted validation run records its URL and downloadable artifacts. Failure-path tests show missing approvals/credentials/version choices fail closed without partial publication.

### 5. Obtain approval for the concrete release, then publish only when authorized

Present exact packages/versions/license/notices, candidate commit and hashes, migration notes, test evidence, registry target, and remaining limitations. Planning/executing this preparation plan alone does not authorize publication. After explicit publication approval, use the prepared workflow, verify registry metadata and tarball hashes, install each published package in clean native consumers, and link the release record. Do not create tags or push from the advisor.

**Verify:** before approval, preparation status is READY FOR RELEASE REVIEW with publication pending. After authorized publication, clean registry consumers pass, versions/hashes match, and the release/tag/registry URLs are recorded. Only then mark actual publication complete in PROGRESS.

## Plan-specific done criteria

- [ ] A concrete release candidate includes all package artifacts, hashes, support claims, license/version decisions, and migration notes.
- [ ] Read-only CI, native packed consumers, docs snippets, and release dry-run pass.
- [ ] Release preparation completion and actual publication are separate status fields in the execution record.
- [ ] Public release remains pending until explicitly approved; a released claim requires registry-installed consumer proof.

## Plan-specific STOP conditions

- License, version, registry destination, or publication authorization is missing: complete reversible preparation, then leave the release pending with the exact missing decision.
- Candidate archive contains imported research, credentials, private app files, or unexpected dependencies: reject it before publication.
- Required support/parity evidence is missing: narrow a proposed preview claim explicitly or defer that release; never convert missing proof into a success.

## Maintenance and follow-up

Automate future upstream catalog review at release milestones, preserve migration notes, and pin the evidence to each release. Full parity remains the definitive goal even if the maintainer chooses a clearly scoped preview release first. Scheduling monitoring or publishing new versions requires its own authorization.

## Common completion gate

- [ ] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [ ] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [ ] The offline catalog checker and `bun run verify` exit 0. Record upstream drift separately.
- [ ] `git diff --check` exits 0; `git diff --name-only` stays inside scope, including generated output only where authorized below.
- [ ] Update only supported claims in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage. Keep implementation proof, reference proof, hosted CI, package availability, and external-device evidence separate.
- [ ] Append commands/results and remaining limits to this plan; update its row in `plans/README.md`. A required missing result means BLOCKED or IN PROGRESS, never DONE.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.
