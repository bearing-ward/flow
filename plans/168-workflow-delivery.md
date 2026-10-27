# Plan 168: Workflow template delivery

Research baseline: [outcome audit and source access record](../research/traces/workflow-templates-audit-2026-10-26.md), inspected at `a6c4eab7c50d3178b5483ecf2a5d346102dfe73a`. Both templates remain G in Vanilla, Vue, and Foldkit. This document proposes work. It implements none of it and approves no dependency or external service.

Units are ordered by dependency and each is smaller than one page. Units 1 through 5 deliver the base editor. Unit 6 establishes the offline AI boundary before unit 7 adds its UI. Unit 8 finishes acceptance. Reuse the audit's E1 through E7 paths and existing history, clipboard, layout, status, routing, and collaboration contracts. Do not reimplement those capabilities as workflow-specific engines.

## Unit 1: workflow document and port contracts

Depends on no later unit. Closes the contract gaps behind W2, W4, W5, W9, A1, A2, and A5.

- Shared core: propose `packages/workflow` for workflow schemas, projections, validation, and execution contracts. Depend on core graph types. Derive TypeScript types from Effect Schema. Define versioned node-kind variants, configuration, named port roles, connections, and typed validation issues. Project the accepted workflow into Flow geometry without putting execution meaning into canvas code. Reuse the typed document contract seam. Keep run state and credentials outside saved graph data.
- Vanilla: prepare a public-controller document owner. Vue: prepare a `FlowProvider` owner with accepted-document bindings. Foldkit: prepare a model and runtime-port owner. Each app decodes fixtures through the shared boundary; reusable framework integration belongs in its adapter package.
- Acceptance: decode valid base and AI fixtures; reject unknown versions, invalid kind/config combinations, duplicate IDs, missing endpoints, incompatible ports, and cyclic executable dependencies. Assert exact issue codes and node/port IDs. Round-trip opaque allowed metadata. Prove generic Flow documents remain usable without workflow dependencies.
- Maintainer D1: package ownership. Recommend a separate `@flow/workflow` package because execution has its own contracts and lifecycle; core stays a graph canvas.
- Maintainer D2: initial kinds. Recommend the five observed base kinds and four observed AI kinds, with versioned configuration. Typed base panels are a Flow delivery choice, not established upstream behavior.

## Unit 2: palette, insertion, and typed configuration

Depends on unit 1. Delivers W2 through W4, A1, and A2.

- Shared core: node factories, port-preserving add/append/delete transactions, and configuration edits. Keep ID allocation behind an explicit capability. Append on an edge preserves its branch role and replaces it atomically. Reuse history and clipboard extensions to remap workflow-owned references.
- Vanilla: compose sidebar drops, accessible add buttons, custom renderers, and configuration controls through the public controller. Vue: compose equivalent components and `useFlow` edits. Foldkit: compose equivalent views/messages and public edit ports. Convert client coordinates with each host's viewport API. Browser controls and focus management stay in apps. Controls must not initiate node drags or canvas shortcuts while typing.
- Acceptance: on each real host route, add every kind by palette and keyboard, drop after pan/zoom, append on an edge, edit each configuration, and delete/reconnect. Assert graph JSON, port identities, rendered membership, and coordinates. One undo restores an append. Copy/paste remaps workflow references without corrupting the source. Exercise Text Input lock/unlock as an explicitly specified Flow behavior; upstream lock semantics remain unverified.
- Maintainer D2: configuration scope. Recommend small typed controls for each implemented operation, plus text/system editors and a read-only run-output area. Do not build a general form generator in this unit.
- Maintainer D3: insertion semantics. Recommend preserving connected edge roles in one accepted transaction. Capture the upstream edge-plus behavior before claiming that gesture conforms.

## Unit 3: validation reports and execution preparation

Depends on units 1 and 2. Completes W5 and the validation part of A5.

- Shared core: pure workflow validation and deterministic execution-plan creation. Distinguish document decode errors, invalid executable graphs, and runtime failures. Define required inputs, reachable nodes, branch outputs, joins, and data/trigger compatibility. Return schema-derived issues with stable node and port IDs. Revalidate the accepted revision before a run. Use existing decode/integrity/edit span names; register workflow-specific names centrally when needed.
- Vanilla: show inline issues and focus the affected control. Vue: expose the same issues through computed app state and accessible components. Foldkit: store the same report in the app model and route focus effects through the host. All hosts prevent invalid runs with visible reasons.
- Acceptance: exact reports for missing inputs, invalid settings, type mismatches, unreachable nodes, and cycles. A rejected connection leaves document/history unchanged. Editing a field clears its issue after acceptance. Keyboard activation focuses the correct node/control. Import validation and interactive validation agree.
- Maintainer D3: workflow semantics. Recommend finite acyclic workflows, explicit true/false branch roles, joins over active predecessor outputs, and stable node-ID ordering for simultaneously ready nodes. Specify skipped-branch handling so a join cannot wait forever. Loops, executable groups, and parallel scheduling require separate plans. These choices are not reverse-engineered upstream semantics.

## Unit 4: deterministic offline runner and status

Depends on unit 3. Delivers W8 and the shared runtime behind A6.

- Shared core: an Effect-owned runner with a scoped lifetime, cancellation, a run ID, an immutable accepted-document snapshot, typed failures, and schema-derived events. Execute one ready node at a time. Implement deterministic initial, transform, branch, join, and output evaluators. Separate queued, running, succeeded, failed, cancelled, and skipped states. Reject stale events by run ID and revision. Emit lifecycle and failure logs without content or pointer noise.
- Vanilla: subscribe and render node status/results, with Run and Cancel controls. Vue: bind the same events to scope-owned state and dispose the run on unmount. Foldkit: reduce the same events into its app model and cancel through runtime lifecycle. Map run states to existing status UI with accessible text for states it does not encode directly.
- Acceptance: use an in-memory evaluator and controlled clock. Assert literal event order and branch/join outputs, failure stops, cancellation, rerun, and late-event rejection. In each host, observe running and terminal states, inspect output, cancel, and unmount mid-run without residual work. Tests block unexpected network requests.
- Maintainer D4: run ownership. Recommend transient app-owned run sessions over immutable snapshots. Edits invalidate the active run; no run event enters graph history, clipboard, room sync, or saved configuration. Durable jobs and run resume are separate scope.

## Unit 5: layout, persistence, and complete base editor

Depends on units 2 through 4. Integrates W1, W6, W7, and W9 into one usable Workflow Editor.

- Shared core: reuse measured ELK layout and versioned graph persistence. Add a workflow envelope/migration policy around semantic configuration. Exclude transient status, credentials, provider objects, and browser measurements. Preserve port roles and config across layout/history/clipboard operations.
- Vanilla: compose layout/fit, theme settings, export/import, and history controls on its workflow route. Vue: provide equivalent controls with lifecycle-owned subscriptions. Foldkit: use accepted port responses and measured-render readiness before reporting layout completion. Each host uses public APIs and labels the local runner as simulation.
- Acceptance: each host adds, configures, validates, runs, lays out, exports, reloads, and restores the same fixture. Assert exact saved configuration, restored connectivity, visible results, non-overlap, stable handle attachment, and theme changes. Undo layout and configuration edits. Reject malformed imports without replacing the accepted workflow. Verify focus and narrow-screen controls.
- Maintainer D5: persistence. Recommend a versioned local import/export format first, with no backend service and no run resumption. Saved generic Flow graph JSON alone does not close W9.
- Maintainer D6: optional existing capabilities. Recommend reuse of history and clipboard now. Keep spatial grouping, custom shapes, animation, obstacle routing, and collaborative workflow editing optional. Their recipe availability does not establish executable subworkflows or distributed runs.

## Unit 6: provider-agnostic offline AI capability

Depends on units 1, 3, and 4. Establishes A3, A4, A6 through A8 before any provider UI is wired.

- Shared core: define text and image capabilities using Effect services, schema-decoded requests/results, and a typed text-event stream. Model IDs and supported settings come from provider capabilities, not hard-coded commercial model names. Supply a deterministic local provider with chunked fixture text, a local image asset, controlled delays, typed failure injection, and cancellation. Register run/node observability centrally. Redact content and secrets from diagnostics.
- Vanilla, Vue, and Foldkit: compose the same offline service at their app entry points. Adapters project events only; they do not own credentials or vendor SDKs. No keys, fetch fallback, or remote calls are needed for default demos and tests.
- Acceptance: literal stream chunks and final output, image metadata, invalid request/result decoding, unsupported settings, provider failure, cancellation, disposal, and late-output rejection. Fail tests on unexpected network traffic. Stream tests prove Flow's offline contract, not upstream streaming behavior.
- Maintainer D7: external services. The observed demo needs OpenAI text/image APIs and a key; its page also names AI SDK. Recommend neither dependency for offline delivery. Any future live adapter needs separate approval of provider, server-side credential ownership, access limits, cancellation, cost, and dependency/removal records. Never serialize keys or accept them into graph JSON. Do not call real APIs for acceptance.

## Unit 7: AI editor configuration and output

Depends on units 2, 5, and 6. Delivers the integrated AI template outcomes A1 through A8.

- Shared core: wire Text Input, Generate Text, Generate Image, and Workflow Trigger evaluators to the provider boundary. Keep data and trigger edges distinct. Validate text/system/prompt/image ports and provider-supported model settings. Generate UI options from decoded capabilities; preserve workflow configuration independently of run output.
- Vanilla: render prompt/system editors, model/temperature/image-size controls, text output, local image preview, and trigger controls. Vue: provide equivalent components and subscription teardown. Foldkit: provide equivalent typed messages/views and runtime cancellation. All hosts show an offline-provider label and accessible per-node progress. Do not copy an API-key settings field into offline demos.
- Acceptance: in every host, drop all four kinds, edit prompts, select supported settings, connect system/prompt inputs, and execute a deterministic text-to-image fixture. Observe intermediate text, exact final text, image rendering, status, failure, cancellation, and rerun. A stale image/text event cannot overwrite a newer run. Revoke temporary image URLs and release listeners on replacement/unmount.
- Maintainer D7: output scope. Recommend both text and image simulation because both are visible upstream outcomes. Incremental output and cancellation are explicit Flow requirements pending upstream confirmation. Keep provider-specific model parity unverified.

## Unit 8: reference checks, catalog closure, and documentation

Depends on units 5 and 7.

- Shared core: no new execution semantics. Review public exports, dependency ownership, schemas, and telemetry names against standards. Document configuration and provider contracts plus simulation boundaries.
- Vanilla, Vue, and Foldkit: finish discoverable workflow routes and accessible keyboard operations. Add dedicated workflow and AI workflow browser acceptance files to `verification.config.json` without removing any existing selection. Keep separate production and test traces from browser entry through accepted state, geometry, effects, and visible output.
- Acceptance: drive one identical offline fixture through each host. Cover every observed upstream outcome, document each intentional difference, and keep unobserved subscription/runtime behavior unverified. Use a controlled local reference fixture where licensed and available. Run docs, catalog, trace, packed-consumer, and focused checks for each unit. At template integration, run locked `bun run verify:full` with one worker before broad parity claims. Provider delivery requires a separate service-side test; OTLP delivery requires collector-side proof.
- Maintainer D8: parity and licensing. Recommend original implementations of public functional outcomes and an explicitly documented offline execution difference. Obtain licensed template source only if source-level comparison is needed. Promote an entry to C only after its primary outcomes pass in all three hosts; do not promote it from shared building-block tests or this audit. Recompute catalog counts from entries at promotion.

## Maintainer decisions

| Decision | Recommendation | Needed before |
| --- | --- | --- |
| D1: ownership | Put workflow contracts and Effect execution in `packages/workflow`; keep browser composition in apps and reusable framework integration in adapters. | Unit 1 |
| D2: kinds and configuration | Implement five base kinds and four AI kinds. Use small typed controls, including text and image settings. Avoid a general form builder. | Units 1 and 2 |
| D3: insertion and execution semantics | Atomic append, typed ports, finite DAGs, explicit branches, joins over active inputs, sequential stable ordering. Document choices until reference behavior is available. | Units 2 through 4 |
| D4: run state | Keep runs transient and separate from graph history/persistence/collaboration. Invalidate a run on edits and discard stale events. | Unit 4 |
| D5: persistence | Versioned local import/export first; no backend or resumable jobs. | Unit 5 |
| D6: optional composition | Integrate history and clipboard; defer executable groups and distributed execution. Reuse other presentation capabilities only where needed. | Unit 5 |
| D7: AI service boundary | Default to deterministic local text and image providers. A future live adapter uses server-owned keys and a separate service/cost decision. | Units 6 and 7 |
| D8: acceptance and source access | Original public-outcome equivalents, explicit offline difference, three-host acceptance, then full-profile integration verification. Licensed source is optional research, not permission to infer runtime parity. | Unit 8 |

## Research verification record

The Plan 168 change adds this plan, the audit, and catalog re-audit evidence. It changes no product code, calls no workflow or generation service, and preserves imported artifacts. The verification configuration only appends this task to `activeWork`; all checks and browser selections remain intact. There are no new template tests because the templates do not yet exist.

Checks before final verification passed: `bun run docs:check`, `bun run scripts/check-react-flow-catalog.ts`, `bun run scripts/check-proof-matrix.ts`, and `bun run research:check-traces`. Additional inspection verified all new local links and catalog outcome citations, recomputed unchanged summary counts, and confirmed that only the two template entries changed. The previous re-audit records are retained.

The final command is `scripts/with-flow-browser-lock.sh bun run verify`. The selected profile is focused. The verification runner passes `--workers=1` to all host and mixed-host browser commands. All previous checks and browser files remain selected. The final result is reported in the task handoff. A focused pass does not establish full-suite or template acceptance.
