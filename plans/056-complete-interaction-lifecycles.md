# Plan 056: Complete shared gestures, connections, and lifecycle events

> Executor: read this file completely, execute in order, and record evidence before changing status. This file contains the contracts and commands needed without the planning conversation.
>
> Drift check: run `git diff --stat f8b73f2..HEAD -- packages/core/src/domain/ packages/core/src/telemetry/ packages/core/src/public.ts packages/conformance/src/` and inspect `git status --short`. Expected prerequisite changes are not an automatic stop: compare them against the contract below and record their landed SHAs. If ownership, public contracts, or scope differ, revise this plan before implementation. Check every remaining in-scope path listed below as well.

## Status

- Priority: P1
- Effort: L, execute in the bounded work packages below
- Risk: HIGH
- Category: direction
- Execution mode: Implementation
- Depends on: 053, 054, 055
- Planned at: `f8b73f2`, 2026-09-27
- Status: DONE

## Why this matters

Vanilla has broader gestures than Vue and Foldkit. Portable examples need common connection/reconnection, resizing, selection, input options, and lifecycle outcomes, with cancellation and keyboard ownership proven before adding more UI.

## Current state and exemplars

At the planning baseline, core had drag/session/resize schemas in `packages/core/src/domain/flow-runtime.schema.ts:64-105`, and Foldkit cleared only the pointer session directly. Current status: Foldkit routes cancellation and lifecycle outcomes through graph messages and the application event port; see the implementation evidence below and `research/traces/shared-interaction-lifecycle.md`. Vue now validates the complete candidate rather than the baseline target-ID-only argument. The remaining host-specific gaps are listed below; they are not treated as parity.

The original `advanced-gestures.e2e.ts`, `gesture-options.e2e.ts`, and `validator-followups.e2e.ts` are Vanilla characterization sources, not proof of another host. New host production evidence and the separate trusted native pointer/touch boundary are recorded in the current matrix and trace.

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

- packages/core/src/domain/, packages/core/src/telemetry/, packages/core/src/public.ts, packages/conformance/src/
- Adapter-local gesture/lifecycle files under `apps/vanilla/src/`, `packages/vue/src/`, `apps/foldkit/src/`; production browser capability boundaries and test drivers.
- Three playground gesture scenes/styles and E2Es, new `interaction-lifecycle.e2e.ts` per host, `research/fixtures/interaction-lifecycle.json`, `research/traces/shared-interaction-lifecycle.md`.
- `docs/guides/gestures.md`, `docs/browser-and-accessibility.md` for actual capabilities only.
- New `scripts/capture-interaction-lifecycle-reference.ts`, `research/harnesses/interaction-lifecycle/`, and `research/fixtures/interaction-lifecycle-reference.json` for this plan's bounded upstream capture.
- Out of scope: async pre-delete hooks and change utilities (057), full UI catalog (058), device-farm provisioning/performance optimization (060), package moves.

Every implementation plan may update its own plan/status row, `research/PROGRESS.md`, `docs/react-flow-api-correspondence.md`, `research/catalogs/react-flow-coverage.md`, `research/fixtures/README.md`, the named trace, and generated `docs/api-reference.md`/`research/generated/` through their generators. No imported evidence edits. New files named below are proposals, not existing APIs.

## Ordered work packages

### 1. Specify gesture and event tables before extending adapters

Inventory every pointer/keyboard option and callback in `docs/react-flow-api-correspondence.md`: pane/node/edge mouse events; drag and selection lifecycle; connect/click-connect/reconnect; Escape, blur, capture loss, element removal, configuration replacement, and unmount. Define transient preview, semantic proposal, accepted notification, terminal event, and cancellation order separately. Host callbacks may receive native events; serialized core/Foldkit messages carry decoded identifiers/coordinates, never DOM events. Keep this framework difference explicit. Add connection-state and node/handle-connection query observations without copying a mutable upstream store.

**Verify:** `bun run research:check-traces` passes; the matrix assigns every listed family to a work package and fixed test scenario.

### 2. Port connection behavior through shared core contracts

Support pointer/touch/click/keyboard connections, strict/loose endpoint modes, full candidate validation, radius, auto-pan, reconnection, custom connection previews, and valid/invalid terminal payloads. Define handle connection limits as caller policy using public connection queries; don't hard-code demo rules in core. Replace target-only Vue validation via an explicit compatibility/migration decision. Make all hosts reject stale/removed endpoints and report completion exactly once.

**Verify:** new core connection/reconnection unit cases pass in `bun run test`; each host's `interaction-lifecycle.e2e.ts` covers connection success/rejection/cancellation, reconnect, dynamic handles, and two-host isolation.

### 3. Port movement, selection, resize, and input ownership

Use existing core extent/snap/resize math for nested node/group drag, rectangle full/partial selection, auto-pan, eight resize directions, aspect/min/max constraints, parent-child compensation, custom drag handles, and keyboard equivalents. Add pane/key/wheel activation and exclusion options from the table. Preserve native input/select/textarea/contenteditable/buttons/links. Classify every combination that is deliberately unsupported; do not copy raw event loops between hosts without their lifecycle owners.

**Verify:** run new interaction suites and vanilla `advanced-gestures.e2e.ts`, `node-movement.e2e.ts`, `gesture-options.e2e.ts`, and `graph-renderers.e2e.ts` serially. Assert preview DOM, final accepted documents, focus, and event order.

### 4. Complete cancellation and structured failure diagnostics

Drive cancellation through one terminal transition per active operation. Release pointer capture, frame loops, observers specific to gestures, and temporary overlays; restore controlled preview and keep unaccepted changes out of documents. Removal by Plan 052 edits must cancel affected gestures. Emit named cancellation reason and invalid-input diagnostics at boundaries, with no pointer-move log flood. Provide onInit/onError equivalents scoped to lifecycle, without treating Effect defects as normal edit errors.

**Verify:** fixed fixtures exercise every cancellation reason in every host, an immediate subsequent valid gesture, reentrant handlers, and queued disposal. `bun run test -- packages/conformance/src/index.test.ts` and all new browser suites pass. Existing native-device skips remain explicitly open for 060.

### 5. Compare selected reference lifecycles and close docs

Extend pinned captures for connection terminal outcomes, resize directions with hierarchy, and cancellation events. Run equivalent Flow inputs; compare normalized public observations and geometry. Add connection-events, resize, drag-handle, and touch-ready playground controls with desktop/narrow keyboard tests.

**Verify:** repeat captures produce stable outputs; `bun run verify` and other common gates pass. Record exact per-direction and per-input evidence rather than closing all gesture parity from one case.

### Reference capture command

Create `scripts/capture-interaction-lifecycle-reference.ts` by following the existing graph-edit capture script's pinned-checkout validation, isolated build/server lifetime, normalization, and cleanup. Mount real upstream public components and replay the selected cases through their public entry points. Run `bun run scripts/capture-interaction-lifecycle-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout` twice against commit `0a1f9575b25679f2880175de8d3eae21aedde921`; both runs must exit 0 and produce matching normalized observations. The checkout path is supplied by the executor, never the immutable imported artifact directory. Keep volatile timings out of equality assertions, but retain raw evidence with environment metadata. Flow fixtures must observe its production APIs separately and compare the same inputs. A missing reference result blocks a conforming claim, not the ability to test Flow behavior.

## Plan-specific done criteria

- [x] All gesture families in the frozen table have explicit per-host implementation and evidence status, including host-specific unsupported and unverified cells.
- [x] Implemented connection, selection, drag, resize, and lifecycle paths pass shared fixtures through production APIs.
- [x] Cancellation never commits a preview and permits an immediate new gesture; removal/unmount cleanup is exercised through production hosts. Trusted native capture remains separate for Plan 060.
- [x] Native-device evidence remains separate from synthetic browser evidence.

## Plan-specific STOP conditions

- A port requires weakening protected deletion, accepted-state ordering, or control-mode ownership: stop.
- Raw DOM events or callbacks would enter a core Schema or Foldkit Model: keep them at the host boundary.
- Native capture cannot be reproduced in the available environment: preserve an explicit unverified cell for 060, not a synthetic replacement claim.

## Maintenance and follow-up

This is several sequential implementation slices inside one capability chunk: connections first, movement/resize next, lifecycle closure last. Plan 057 adds change compatibility and asynchronous deletion hooks after terminal behavior is stable. Plan 060 closes external-device and broad accessibility evidence.

## Common completion gate

- [x] Every step's targeted tests passes through production APIs, with no test-side replacement store or reducer generating the observed result.
- [x] `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run docs:check`, and `bun run research:check-traces` exit 0.
- [x] The offline catalog checker and `bun run verify` exit 0. Upstream drift is recorded separately.
- [x] `git diff --check` exits 0; changed files stay inside plan scope, with generated output produced by its generator.
- [x] Supported claims are recorded in `research/PROGRESS.md`, the API correspondence matrix, and catalog coverage, with implementation, reference, hosted CI, package availability, and external-device evidence kept separate.
- [x] Commands, results, remaining host-specific limits, and status are recorded in this plan and its row in `plans/README.md`.

## Common STOP conditions

Stop the affected step and report the concrete gap if a required check fails twice after focused repairs, an unrelated subsystem or dependency upgrade is needed, the plan would create a second authoritative document store, or a new reference claim cannot be reproduced. Preserve completed independent work and explicit unverified cells. Do not widen scope, weaken assertions, or label unavailable evidence as success.

## Executor evidence (2026-09-28)

- Prerequisite checkout: `d39f0f59f0f9b3178ee4fa6179efac3d19db1f17`, with Plans 053–055 landed. The separately authorized roadmap-checker repair is commit `5d6505b84c58e455bc4b6534b8c2611eb9b776e1`, cherry-picked as `ce9210e`; it only changes `plans/check-next-chunks.mjs`. No changes were made on main, and this worktree remains uncommitted.
- Work package 1: the API matrix assigns gesture families to work packages and fixed host scenarios, with transient preview, proposal, acceptance, terminal, and cancellation boundaries. Vanilla invokes native host callbacks; Vue emits decoded component payloads; Foldkit serializes schema-validated lifecycle records through a typed port and excludes DOM events from its Model/messages. This is a host boundary distinction, not callback parity.
- Work package 2: core now exports strict/loose connection mode, candidate validation/normalization, radius selection, reconnection validation, and ordered `getHandleConnections`. Vue validates a full candidate. Vue and Foldkit production suites exercise pointer and keyboard connection/reconnection, strict/loose fixtures, radius, auto-pan, custom preview renderers, controlled/uncontrolled outcomes, and dynamic handle replacement. Vanilla covers pointer/click/keyboard activation, validation, radius, auto-pan, custom preview callbacks, reconnection, and dynamic handle replacement during active reconnect. The pinned source reports target-to-target as valid before edge rendering error 008; Flow rejects that candidate because its renderer cannot produce a renderable edge. Current-site documentation drift is recorded separately.
- Work packages 3/4: all hosts have production pointer selection and eight-direction resize cases with accepted geometry and nested child compensation. Vue and Foldkit have keyboard rectangle selection and grouped/repeated keyboard resize evidence. Shared cancellation fixture rows cover seven reasons and immediate retries through each host's production API; the full operation/reason callback-order product remains outside the bounded evidence. Reentrant edits and queued disposal remain covered by public edit suites. Native trusted capture stays unverified for Plan 060.
- Follow-up input/lifecycle cases: Foldkit `input-ownership.e2e.ts` exercises six native controls and both no-drag marker spellings across pointer/key/wheel ownership, then verifies Escape and wheel do not terminate an active connection for all eight targets. That case exposed and fixed canvas-level Escape handling that intercepted native input; Escape cancellation now runs in an active-session document listener and leaves native controls untouched. Vue and Foldkit keyboard resize suites cover blur and owner removal/document replacement, stale-keyup suppression, and a fresh accepted keyboard resize. Foldkit `ReplaceDocument` now clears `keyboardResizeSession`.
- Lifecycle evidence: Vanilla `gesture-options.e2e.ts` asserts drag, connection, selection, and pointer UI callback cases. Foldkit `interaction-lifecycle.e2e.ts` asserts `onInit`, connection proposal/terminal ordering for accepted and rejected cases, and selected pointer event records. Vue `activation-callbacks.e2e.ts` asserts click-connect/reconnect change → adoption → terminal ordering, drag and pointer rectangle-selection ordering for controlled/uncontrolled modes, and uncontrolled keyboard rectangle-selection change → adoption → terminal ordering. Callback outputs are not compared across hosts.
- Bounded remainder: the unrequired native-control × every active gesture product and operation × every cancellation-reason product remain unverified. Vue has no pane double-click event; Foldkit's serialized event schema omits pane/node/edge double-click and context-menu records. Foldkit represents click connection on shared operation records tagged `inputKind: click`, without click-only lifecycle names; `ReplaceDocument` cancellation clears active reconnect sessions and suppresses stale release proposals, as covered by its retry E2E. Its `onError` record is currently scoped to edit failures. Foldkit programmatic viewport operations emit start/change/end through `viewportEvents`; that schema carries no controlled proposal/acknowledgement status, and programmatic viewport requests do not create `interactionEvents` move lifecycle records. Vanilla keyboard reconnection remains unsupported. Trusted pointer/touch capture remains reserved for Plan 060.
- Input-option residuals: Vue has no `zoomOnPinch` prop and accepts Boolean `panOnDrag` only; Foldkit has no pinch option, button-array `panOnDrag`, `selectNodesOnDrag`, or pan/zoom activation-keycode props (its `keyboardActivation` is Boolean). Vue defaults `selectNodesOnDrag` to false to preserve existing shared conformance semantics, with explicit true coverage; Vanilla enables it unless false, so these defaults are intentionally host-specific. Vanilla declares `zoomOnPinch`, but active execution and trusted pinch behavior have not been established. Canvas-wide `nodesConnectable` exists in Vanilla only. Preserve each cell as a host-specific open boundary; fixed gesture tests do not establish option parity.
- Work package 5: `scripts/capture-interaction-lifecycle-reference.ts` ran twice against `0a1f9575b25679f2880175de8d3eae21aedde921`; normalized outputs matched. The capture fixture and trace separate pinned observations, current-site drift, Flow production behavior, and synthetic host tests.
- Focused host results after the final bounded follow-up: Vue `interaction-lifecycle.e2e.ts` 25/25; Foldkit `interaction-lifecycle.e2e.ts` 28/28, `input-ownership.e2e.ts` 2/2, and `renderer-contract.e2e.ts` 3/3. The idle canvas Escape assertion reflects the scoped contract; separate tests cover cancellation during an active gesture and native-control Escape ownership.
- Final root `bun run verify` exited 0: 176 unit tests, Vanilla 261 passed / 2 existing native-device skips, Vue 74 passed, Foldkit 73 passed; quality, architecture, docs, catalog, generated research inventory, trace citations, typecheck, builds, and packed consumer passed. The Foldkit two-host isolation assertion is in `renderer-contract.e2e.ts`. The upstream catalog check passed with 208 entries / 200 capabilities; docs checked 19 Markdown files and traces verified 2,141 citations across 53 traces. `git diff --check` passed. Hosted CI and trusted device behavior were not tested.
- Accepted evidence boundaries: each host has fixed production cases for all six native controls and documented no-drag markers across pointer, key, and wheel ownership; combinations with every control nested inside every possible active gesture remain unverified. Vue has direct ordering assertions for click-connect, reconnect, drag, pointer selection, and uncontrolled keyboard selection; the full operation × cancellation-reason callback matrix and controlled keyboard-selection acknowledgement order remain unverified. Foldkit's serial event schema omits several pane/node/edge callback kinds. Preserve native Vanilla callbacks, decoded Vue emits, and Foldkit's typed serializable port as distinct contracts. Host-specific activation gaps, Vanilla keyboard reconnection, controlled Foldkit viewport notification status, and Foldkit edit-failure-only `onError` remain explicitly documented. Synthetic touch connection and dynamic-handle reconnect are covered in all three host suites. Native trusted pointer/touch capture remains unverified for Plan 060. These bounded and host-specific gaps do not represent a cross-host parity claim.
