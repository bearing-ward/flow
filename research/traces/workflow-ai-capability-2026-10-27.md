# Offline workflow AI capability

Plan 174 implements Unit 6 of Plan 168 with its adopted D1 through D8 decisions. The upstream outcome evidence remains the [Plan 168 audit](workflow-templates-audit-2026-10-26.md). Imported artifacts are unchanged. This trace describes Flow's deterministic local contract and its acceptance boundaries.

## Contract and design decision

The public entry exports schema-derived capability, request, result, event and projection types, the `WorkflowAiProvider` Effect service, provider constructor and Layer, scoped sessions, reducer and local fixture. The data contract is at `packages/workflow/src/workflow-ai.schema.ts:14`. Model IDs and settings come from decoded capabilities. Runtime inputs and provider outputs cross explicit Schema boundaries at `packages/workflow/src/workflow-ai-provider.ts:48`. Unknown properties, including credential fields, reject rather than disappearing into saved data.

Two shapes were considered: exposing raw streams directly to each app, or retaining typed streams inside a provider service with a shared scoped session. The session shape was selected because cancellation, identity tagging and terminal-event handling otherwise repeat across hosts. The direct Stream API remains available through the service for Effect consumers. Provider implementation results remain unknown until the wrapper decodes them. The wrapper delays successful text completion until it has checked the whole protocol, including the absence of trailing events, at `packages/workflow/src/workflow-ai-provider.ts:131`.

The implementation uses separate AI modules so Plan 173 can continue editing base workflow persistence and editor composition. It does not change base node semantics, saved schemas, geometry, framework adapters or the existing offline runner. Unit 7 owns generation-node evaluator wiring, provider-generated UI options and integrated text-to-image workflow controls.

## Production path

Each real app route starts at its application entry point: `apps/vanilla/workflow-ai-capability/main.ts:1`, `apps/vue/workflow-ai-capability/main.ts:1` and `apps/foldkit/workflow-ai-capability/main.ts:1`. Each constructs the same local Effect service and mounts the shared application composition. These are separate capability routes, not framework-specific graph-rendering paths.

`mountWorkflowAiCapability` owns browser controls, listeners, scope replacement and DOM projection at `apps/shared/workflow/ai-capability.ts:12`. It derives request settings from decoded provider capabilities, allocates a fresh run identity and supplies the service to `startWorkflowAiSession`. The public session entry decodes its envelope before starting work at `packages/workflow/src/workflow-ai-session.ts:24`. Requests and emitted events are detached and recursively frozen. The session owns a scoped fiber, emits identities with every event, translates typed failures to codes and interrupts provider work on cancellation or scope closure at `packages/workflow/src/workflow-ai-session.ts:62`.

`WorkflowAiProvider` declares the service at `packages/workflow/src/workflow-ai-provider.ts:21`. The wrapper validates model/temperature and model/dimension membership before calling the implementation. Text results pass schema and stream protocol checks. Image results pass schema and requested-dimension checks. Unexpected provider defects become `provider-failure` without their raw messages.

The deterministic local implementation is at `packages/workflow/src/workflow-ai-local.ts:34`. It emits literal text chunks and a final string, and returns metadata for the embedded original PNG at `packages/workflow/src/workflow-ai-local.ts:13`. Effect clock delays and injected failures are fixture controls. There are no network calls, browser globals, credential objects, provider SDKs or URL allocation inside the package.

The transient reducer rejects stale run, revision and node identities, obsolete accepted revisions and terminal-session updates at `packages/workflow/src/workflow-ai-session.ts:133`. The app adds a generation check during scope replacement and disposal. It projects text with `textContent` and resolves the image asset to an embedded data URL. Disposal closes the scope and removes listeners and the image source. No geometry operation occurs on this route. Existing workflow documents retain their separate geometry and host ownership paths.

Central observability registers AI operation and decode spans in `packages/core/src/telemetry/flow-telemetry.ts:33`. Sessions annotate run ID, revision and node ID. Lifecycle and failure logs contain codes and identities, without prompts, system text, output, credentials or raw exception messages. Chunks do not log. Export and shutdown are application responsibilities; no collector-side delivery is claimed.

## Test paths and acceptance

`packages/workflow/src/workflow-ai.test.ts:1` imports the public package source and exercises the real provider, Schema boundaries, session and reducer with Effect's controlled clock. It blocks unexpected fetch and WebSocket traffic. Assertions cover literal stream order and final text, image metadata and actual PNG header dimensions, invalid capabilities/requests/results, credential canaries, unsupported settings before driver invocation, stream termination rules, typed failure injection, defects, cancellation, disposal, immutability, stale text/image events and redacted diagnostics. A custom native tracer verifies central span names and run/node attributes.

The same test file executes sessions beside an AI document carrying groups, trees, shapes, rotation, routes and bundles. It checks unchanged documents, persistence, history, clipboard and room projections and validates the pasted workflow references. Existing real WebSocket workflow tests remain the transport proof; provider sessions add no room or distributed-run behavior.

The real browser entries are each host's `workflow-ai-capability.e2e.ts`; all call `apps/shared/workflow/ai-capability-acceptance.ts:1`. These tests drive the shipped capability route, observe an intermediate chunk, literal final text, exact chunk list, the decoded image's actual dimensions, cancellation, replacement, stale-output exclusion and disposal. A separate timer counter verifies release on cancellation and disposal. Browser tests abort unexpected external traffic and fetch/XHR calls. The local Vite development socket remains allowed. This browser path exercises app composition and visible capability output, not AI graph editing or upstream template execution.

Packed archive acceptance is `tests/consumer/workflow-ai.runtime.ts:1`. The packed-consumer gate copies and executes it beside each host archive, and typechecks the imported public contracts. The architecture gate now includes provider import and subpath fixtures that must fail inside core and reusable adapters. The verification configuration only appends Plan 174 and its three browser files, preserving all previous checks and selections.

The final required command is `scripts/with-flow-browser-lock.sh bun run verify --check reference-host`. It uses the saved focused profile, all previously selected checks and browser files, the three added AI capability files and the reference-host check. The command result is reported in the implementation handoff. A focused pass does not establish full-suite or complete-template acceptance.

## Conformity and deviations

- Conforming to Flow's adopted Unit 6 contract: provider-supplied settings, schema-decoded boundaries, literal local streaming, image metadata, typed failures, scope cancellation, disposal, stale-output rejection, diagnostics redaction and shared app composition. The acceptance boundary is the package tests, three real capability routes and packed public consumers.
- Intentionally different from the observed upstream service: text is a fixed fixture and the image is an original embedded local asset. D7 requires deterministic offline providers and excludes keys, live APIs and provider SDKs. Streaming and cancellation are explicit Flow requirements, not proven upstream behavior.
- Intentionally separate from Unit 7: the capability routes do not wire AI node evaluators or claim integrated AI editor outcomes. The base runner retains its existing generation-node failure until that unit. Optional graph extensions, clipboard, history and room document projection remain independent of transient provider state.
- Unverified: upstream subscription behavior, commercial model/settings parity, provider delivery, OTLP collector delivery, integrated Unit 7 template outcomes and full-profile integration acceptance. No catalog entry is promoted by this unit.
