# Plan 043: Establish the definitive React Flow parity goal across frameworks

> Follow the steps and verification gates below. Update this plan's row in `plans/README.md` after verification. Preserve unrelated edits.
>
> Drift check: `git diff --stat 77836e4..HEAD -- README.md CONTEXT.md research/PROGRESS.md plans/README.md`. Compare changed passages with the excerpts below before proceeding. Reconcile compatible wording changes; stop if a newer product decision contradicts this plan.

## Status

- Priority: P1
- Effort: S
- Risk: LOW
- Depends on: none
- Category: direction, docs
- Planned at: commit `77836e4`, 2026-09-26

## Why this matters

The maintainer has made comprehensive React Flow parity the definitive project goal. Existing milestones describe bounded adapter capabilities and can be mistaken for the intended endpoint. Record the full destination and its proof requirements in the project overview and authoritative checklist, while preserving honest statements of current capability. This is a documentation scope; individual API designs and feature implementations follow in later plans.

## Product decision to record

Flow aims to match React Flow's public interfaces as closely as each supported framework permits. Across every supported framework, Flow must be capable of producing every example, UI component, and template listed in these catalogs:

| Target | Authoritative scope | What completion means |
| --- | --- | --- |
| Public interfaces | [API reference](https://reactflow.dev/api-reference), including the complete sidebar | Closest practical correspondence for the main canvas, provider, components, hooks, types, and utilities, including their public options, data, events, and behavior. |
| Example capabilities | [Examples](https://reactflow.dev/examples), including the complete sidebar and listed Pro capabilities | Every demonstrated outcome is achievable through supported Flow APIs and an idiomatic integration in each framework. |
| Reusable UI and templates | [UI](https://reactflow.dev/ui), including all sidebar components and templates | Equivalent component behavior and composed editor experiences can be produced in each framework. |

The catalogs were inspected on 2026-09-26. Their entries define coverage; their landing-page introductions alone do not. Keep a dated catalog baseline when detailed mapping starts, and review upstream additions at milestone boundaries. The existing code reference is pinned separately in `research/UPSTREAM.json`; current website content must not be presented as behavior proven by that older pin.

Plain JavaScript, Vue, and Foldkit are the current delivery targets. New supported adapters inherit the same goal. Translate React-specific hooks, providers, component composition, reactivity, and lifecycle into framework-native equivalents. Preserve familiar names and contracts where practical, and record each necessary adaptation. Using a different framework does not by itself justify a missing capability.

Keep graph meaning independent of frameworks, retain Effect workflows and schema-derived contracts, and place framework-specific behavior in adapters. Review existing intentional differences against this goal. A reference-compatible adapter API may sit over a different internal contract. For example, `docs/architecture.md:35-36` records final-only change events and exclusion of style/DOM fields from core schemas; future API mapping must assess their public equivalents without prematurely changing core ownership.

Examples may use optional layout, collaboration, export, or other integrations. Assign each capability to core, adapter, reusable UI, or an example integration when detailed planning begins. The goal does not require putting every integration into core. Include publicly listed Pro capabilities in the target; unavailable source or evidence remains an explicit gap. Follow `docs/ui-licensing.md` for any later reuse of source or assets.

Track implementation status and reference conformity separately for each framework. Use the repository's conforming, intentionally different, and unverified classifications with a reason and a test boundary. A framework adaptation can fulfill the goal when equivalent user capability is demonstrated. A missing capability remains open. A working vanilla example or a shared smoke suite does not establish completion in Vue or Foldkit.

## Current state and conventions

- `README.md:3` says the vanilla host has the broadest rendering and interaction coverage and points to separate adapter documentation. `README.md:5` directs readers to `research/PROGRESS.md` for current status.
- `research/PROGRESS.md:3` states: "Checked items work in the repository today. Unchecked items are still part of the planned project."
- `research/PROGRESS.md:5` describes eight shared adapter scenarios and three pinned interaction captures, and explicitly limits their parity claims. Preserve that evidence boundary.
- `CONTEXT.md:15` defines parity as "a behavior or rendered output that a test proves equivalent to the pinned reference." Keep this definition; add the product ambition alongside it.
- `docs/standards.md:7-16` requires framework-independent graph meaning, Effect workflows, Schema contracts, and evidence for parity claims. Match these constraints.
- `plans/README.md` now records the definitive goal. Its earlier deferrals describe sequencing for completed chunks, not permanent exclusions.
- The repository uses Bun, TypeScript, Vitest, and Playwright. `package.json` defines the commands below. CI calls `bun run verify` on macOS. This planning pass did not rerun the runtime gates.
- At planning time, `apps/vanilla/e2e/node-movement.e2e.ts` and `docs/api-reference.md` had unrelated uncommitted changes. Preserve them and inspect current status before execution.

## Scope

Modify only `README.md`, `CONTEXT.md`, `research/PROGRESS.md`, and the status row for this plan in `plans/README.md`.

Keep runtime code, generated API docs, tests, dependencies, imported research artifacts, `research/generated/`, and archived handoffs out of scope. Do not build the full item-by-item catalog or a new tracking system in this documentation step. `research/PROGRESS.md` remains the authoritative current-status checklist.

## Commands you will need

| Purpose | Command | Expected result |
| --- | --- | --- |
| Inspect existing work | `git status --short` | Existing edits identified and preserved |
| Check the documentation | `bun run docs:check` | Exit 0 |
| Full local gate | `bun run verify` | Exit 0; existing skipped or unverified cases remain disclosed |
| Review whitespace | `git diff --check` | Exit 0 |
| Inspect scope | `git diff --name-only` | Only the four allowed files added to the initial dirty-file set |

`bun run check` is the configured lint and format check. Its quality-baseline work is tracked separately in Plan 036. Inspect current results if needed; do not expand this plan into that cleanup. Run full browser gates serially using the repository's configured test ports.

## Steps

1. Add a short project-goal paragraph to `README.md` after the introduction. Link all three catalogs and the definitive-goal section in `research/PROGRESS.md`. State the ambition separately from the existing capability summary. Verify with `rg -n 'reactflow.dev/(api-reference|examples|ui)|Definitive project goal' README.md`; expect all three URLs and the goal text.
2. Add `### Definitive project goal` after the current milestone in `research/PROGRESS.md`. Include the decision above in concise prose and the seven unchecked milestones below. Keep the existing feature checklist and its evidence limits intact. Verify with `rg -n 'Definitive project goal|Catalog baseline|API correspondence|Example coverage|UI coverage|Framework coverage|Parity evidence|Upstream review' research/PROGRESS.md`; expect the heading and all seven labels.
3. Add `## Project goal` to `CONTEXT.md`, with the same ambition and a link to `research/PROGRESS.md`. Preserve the distinction between a host, a reference, and proven parity. Verify with `rg -n 'Project goal|PROGRESS.md|Parity' CONTEXT.md`; expect all three concepts.
4. Run `bun run docs:check`, then `bun run verify`, then `git diff --check`. Expect exit 0 from each. Inspect the final diff and update Plan 043 to DONE only after the gates pass. Record failures without modifying unrelated code.

Use these high-level checklist milestones, with detailed scope planning deferred:

- Catalog baseline: map every API, example, and UI entry to a dated upstream URL.
- API correspondence: map each public contract to its closest practical equivalent and document necessary framework adaptations.
- Example coverage: demonstrate every catalog example through supported APIs, including required optional integrations.
- UI coverage: provide equivalents for every catalog component and template.
- Framework coverage: prove the mapped capabilities separately in plain JavaScript, Vue, Foldkit, and future supported adapters.
- Parity evidence: connect each claim to reference comparisons, runnable examples, and applicable interaction, visual, accessibility, and lifecycle checks.
- Upstream review: review catalog changes at milestone boundaries and keep omissions visible in the checklist.

Record the recommended sequence as catalog baseline, API mapping, shared capability work, framework and UI delivery, then catalog-wide proof. Deliver examples during each capability slice to expose missing contracts early. This sequence guides future plans without superseding unfinished correctness work.

## Test plan and done criteria

No new runtime tests are needed for this documentation change. Use the existing documentation checker and full project gate. Confirm all of the following:

- The goal and all three upstream links appear in the project overview and progress checklist.
- The seven milestones exist as unchecked entries; this documentation plan does not mark feature parity complete.
- The context document links to the authoritative progress checklist and retains its evidence-based parity definition.
- `bun run docs:check`, `bun run verify`, and `git diff --check` pass.
- The diff stays within scope, preserves pre-existing edits, and records Plan 043's completion.

## STOP conditions

- A newer maintainer decision conflicts with the full catalog goal. Report the conflicting text rather than narrowing coverage.
- A gate requires runtime, generated API, or unrelated quality-baseline edits. Report the exact failure and leave this plan incomplete.
- A source cannot be inspected. Preserve the catalog target and report the evidence gap rather than guessing its behavior.

## Git workflow and maintenance

Use `codex/react-flow-parity-goal` if a separate branch is needed. Do not commit or publish without user authorization. A suitable eventual commit message is `docs: define comprehensive React Flow parity goal`.

Future feature plans must name the catalog capabilities and framework gaps they advance. Detailed mapping must retain stable upstream links and per-framework evidence; avoid a single parity percentage based on completed plan counts. Documentation of a chosen implementation difference does not automatically exempt that capability from the target. Keep current status in `research/PROGRESS.md` and implementation history in `plans/README.md`.
