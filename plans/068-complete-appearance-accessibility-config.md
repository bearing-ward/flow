# Plan 068: Complete appearance, accessibility, and native configuration members

> Executor: read this entire file, execute steps in order and record every result. This is a required child of 057; completion of this bounded child does not close the parent. The coordinator maintains the index when dispatch says so.
>
> Drift check: `git diff --stat ce9210e61a7dcb370a45b91632c19d7e017e4898..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/src apps/vue/e2e apps/foldkit/src apps/foldkit/e2e scripts research/catalogs/api-members.json research/traces/public-api-completion.md docs plans` and `git status --short`. This plan was written over an uncommitted implementation snapshot, so inspect working-tree differences too. Compare quoted contracts, not just SHA. Existing accepted prerequisites are expected; source-contract disagreement is STOP.

## Status

- Priority: P1
- Effort: L, execute sequential bounded steps
- Risk: HIGH
- Category: direction
- Execution mode: Implementation after architectural contract review
- Parent:057; parent remains IN PROGRESS
- Depends on: 054/056 accepted rendering and input baselines; 066 decomposition phase; coordinate UI primitives with 058
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: BLOCKED — final source revision exhausted; second Vanilla appearance browser suite failed its edge-description assertion; no complete production/reference/packed/full acceptance

## Why this matters

ColorMode and global accessible labels remain gaps while individual labels and CSS already exist. Add reusable native configuration with clear lifecycle and precedence so applications can localize, theme and configure interaction behavior across all hosts. Every dated configuration member remains an acceptance item.

## Current state and source excerpts

- `docs/react-flow-api-correspondence.md:35-37` has colorMode gap, debug/telemetry difference, and ariaLabelConfig partial labels/global configuration gap.
- `packages/core/src/domain/flow.schema.ts:79-80` supports per-node ariaLabel/ariaDescription. Do not replace explicit per-node accessible names with global defaults.
- `docs/react-flow-api-correspondence.md:41-62` names click distance, scroll policy, attribution, selection elevation, marker color and canvas policy gaps. These require inventory grouping and exact current source inspection rather than inferred options.
- `packages/core/src/telemetry/flow-telemetry.ts:1-34` defines FlowSpan/FlowAttribute; high-frequency UI callbacks must not become pointer logs.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- New core flow-appearance.schema.ts / flow-accessibility.schema.ts and tests for serializable reusable contracts, core public exports; existing node/edge schemas only for required validated fields.
- Vanilla mount/public/UI plus `apps/vanilla/src/style.css`; Vue canvas/use-flow/public/UI plus `packages/vue/src/style.css`, `apps/vue/src/style.css`; Foldkit application/graph/public/UI plus `packages/foldkit/src/style.css`, `apps/foldkit/src/playground.css`. Styles remain their existing package/app ownership; no new global cross-owner stylesheet authority.
- Existing `apps/vanilla/e2e/renderer-contract.e2e.ts`, `gesture-options.e2e.ts`, `canvas-ui-contract.e2e.ts`; `apps/vue/e2e/renderer-contract.e2e.ts`, `gesture-controls.e2e.ts`, `canvas-ui-contract.e2e.ts`; `apps/foldkit/e2e/renderer-contract.e2e.ts`, `input-ownership.e2e.ts`, `canvas-ui-contract.e2e.ts`, and their actual production fixtures. NEW `appearance-config.e2e.ts` in each host with new `appearance-config-test` entry fixture/HTML route; these are proposals, not existing accessibility suites. Packed-consumer script/fixtures.
- New appearance-config capture/harness/fixture/conformance tests; catalog/member docs/trace/PROGRESS; this plan/index/057/066 manifest and generated API docs.

Out of scope: other feature families, renderer replacement, second graph/store authority, dependency upgrades, backend collaboration, publication, imported evidence, and unrelated dirty work. New required architecture discovered here gets a numbered child under 066; neither this child nor 057 closes before its required follow-up does.

## Architecture, evidence, and execution rules

The destination is every dated API capability across Vanilla, Vue and Foldkit, not the currently passing subset. Follow `docs/standards.md:7-16`: “Graph meaning does not depend on a UI framework”; “Effect Schema owns runtime data contracts”; “A parity claim requires a test against reference behavior or output.” Derive types from Effect Schema. Decode external unknown once. Core owns graph/geometry/serializable transitions; adapter packages own framework integration; apps own DOM/application composition and demonstrations. `packages/foldkit` is the current reusable adapter; do not move it back into apps. Vanilla's public adapter remains in `apps/vanilla`; Plan 061 packages it without relocating that source.

Pin the existing manifest baseline: Effect and platform `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`; do not change dependencies or lockfile for this plan. Keep saved-document v1 compatible. Controlled actions are proposals until owner acknowledgement; uncontrolled actions validate, commit, notify. No second document authority, mutable store exports, private store setters, or mounting the Vanilla renderer inside Vue/Foldkit. Caller functions remain host-local; Foldkit ports carry schema-derived serializable requests/results.

Use spans/attributes from `packages/core/src/telemetry/flow-telemetry.ts`; trace decode/lifecycle/semantic-change/failure boundaries, not pointer moves. A research trace starts at the actual public/browser entry, follows state/geometry/DOM/rendered output, separates production/test paths, cites exact lines, and ends with `Conformity and deviations`. Leave imported `research/artifacts/` immutable. Pinned upstream SHA is `0a1f9575b25679f2880175de8d3eae21aedde921`, React 12.11.6; source inspection is distinct from current-site contract and executable comparison. Use disposable full checkouts and existing `scripts/capture-provider-session-reference.ts` / `scripts/capture-graph-edit-reference.ts` patterns. Do not publish generic parity claims or mark partial gaps intentional merely to close this plan.

## Commands and required expected results

Run from repository root. Browser suites run serially and alone with strict configured ports; do not reuse foreign servers.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Fresh dependencies | `bun install --frozen-lockfile` | Exit 0; unchanged lockfile |
| Quality | `bun run check` | Exit 0 |
| Public builds/types | `bun run typecheck` | Exit 0 |
| Architecture | `bun run check:architecture` | Exit 0 |
| Unit suite | `bun run test` | All pass |
| Vanilla production browser | `bun run test:browser -- public-state.e2e.ts` | All selected pass, no new skips |
| Vue production browser | `bun run test:conformance:vue -- public-state.e2e.ts` | All selected pass |
| Foldkit production browser | `bun run test:conformance:foldkit -- public-state.e2e.ts` | All selected pass |
| Packed artifacts | `bun run test:consumer` | Every host install/typecheck/mount passes |
| Generated API | `bun run docs:generate-api` | Exit 0 |
| Docs | `bun run docs:check` | Exit 0 |
| Trace | `bun run research:check-traces` | Exit 0 |
| Member inventory | `bun run scripts/check-api-members.ts` | Exit 0; every dated API page retained |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0 |
| Final local gate | `bun run verify` | Exit 0; no newly skipped tests |
| Diff whitespace | `git diff --check` | Exit 0 |

Record actual commands/counts, failures and environment limits. A hung or stopped verify is incomplete. Let generators update generated outputs; never hand-edit `research/generated/`. Existing two native-pointer skips stay explicit. Hosted CI, trusted devices, upstream runtime and collector-side telemetry are separate evidence.

## Git workflow and common done criteria

Use an isolated `codex/068-complete-appearance-accessibility-config` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 068 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Confirm the independently approved configuration matrix

Use 066 groups to list ColorMode, AriaLabelConfig, debug/error callbacks, attribution/pro options, click distances, preventScrolling, elevation/defaultMarkerColor, canvas draggable/connectable/focus/select configuration and precedence. Map any cells already owned 055/056/058 to those actual acceptance gates. Define schema-backed data options and native style/event callbacks with default/explicit/update/disposal semantics. System mode listeners and media queries stay host-local. Attribution is a product option; do not invent paid capability gates.

**Verify:** inventory/trace checkers exit 0 with every listed field assigned an executable implementation owner; typed config tests reject malformed enum/labels/distances. Stop and create required child for an unrelated subsystem, preserving scope.

### 2. Implement theming and accessible labels across hosts

The independently approved artifact 068 enumerates all 11 pinned keys, exact default text including live formatter, empty-string override rules, element precedence, native config exports and light/dark/system default. Implement that entire field matrix; functions stay host-local. Create the NEW production `appearance-config.e2e.ts` route/suite in each host. Exact commands: `bun run test:browser -- appearance-config.e2e.ts`, `bun run test:conformance:vue -- appearance-config.e2e.ts`, `bun run test:conformance:foldkit -- appearance-config.e2e.ts`; all pass serially with no skips.

Implement light/dark/system, runtime changes and scoped media listener cleanup. Forward every captured applicable global ARIA label to the actual focusable node/edge/control/live-region output, retaining explicit per-element overrides and caller text. Localize strings without changing graph identity or persisted data. Match native component lifecycle; reusable UI 058 consumes host config through public contracts.

**Verify:** new configuration unit tests pass; each host's existing renderer-contract and NEW appearance-config browser suites pass. Assert computed theme/colors, exact accessible names, changed config, independent owner configs, media listener disposal and keyboard focus behavior, not merely CSS classes.

### 3. Complete remaining native configuration matrix

Implement unowned named distance/scroll/elevation/marker/canvas policy members via current production adapter paths. Test defaults, explicit false/zero values, per-node/per-edge overrides and controlled owners. Debug/error behavior uses existing structured boundary instrumentation and native error delivery; no pointer-move logs. Fields owned existing plans must be proven there before this step closes.

**Verify:** Vanilla `bun run test:browser -- gesture-options.e2e.ts renderer-contract.e2e.ts canvas-ui-contract.e2e.ts`, Vue `bun run test:conformance:vue -- gesture-controls.e2e.ts renderer-contract.e2e.ts canvas-ui-contract.e2e.ts`, Foldkit `bun run test:conformance:foldkit -- input-ownership.e2e.ts renderer-contract.e2e.ts canvas-ui-contract.e2e.ts` pass serially; exact wheel default prevention, click-vs-drag thresholds, elevation ordering and flag overrides are asserted. Packed public config checks pass.

### 4. Compare representative reference and close full field matrix

Capture pinned appearance/ARIA/default-vs-explicit combinations with actual DOM/accessibility output. Record framework-specific callback shape reasons separately from configuration behavior. Every global label/member needs exact source/test mapping; representative reference tests do not establish every missing field.

**Verify:** stable two-run capture, conformance tests and common final gates pass; 066 manifest retains no unexplained required gaps in this family's field matrix.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-appearance-config-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/appearance-config-reference.test.ts`; expect every comparison assertion to pass. For 068, the named capture/test is a proposed new file and must be created before these commands run.

## Plan-specific done criteria and STOP boundaries

- [ ] 066 decomposition approval and this section's independent architecture approval are recorded; any requested contract revision is independently reviewed before source changes.
- [ ] 063/064/067 final acceptance includes 069 integration where typed contracts affect their public outputs; implementation may start against accepted concrete schemas without claiming final generic closure.

- [ ] Every behavior/case named in Steps has exact implementation and public production test evidence; existing passing cases alone do not satisfy new variants.
- [ ] Every API/member family named in Current state and Steps is reconciled in 066's closure manifest with no dropped records.
- [ ] Selected upstream comparisons named in Steps are executable/reproduced, with explicit normalizations and native lifecycle limits.
- [ ] Every common done criterion holds and independent review approves the source, assertions and scope.

STOP if achieving these contracts requires unchecked casts, private mutable store access, unsafe graph publication, cross-owner DOM queries, persisting measurements/functions/DOM, or redefining the original API target as the currently easy subset. Report exact blocker and next required child.

## Maintenance

Coordinator scope/ownership amendment, 2026-09-29: existing Vue/Foldkit node keydown and focus handlers may wire the068 live formatter, disabled keyboard policy and focus autopan. Reuse core moveSelectedNodes/applyNodePositionsChange plus existing validation/publication and controlled acknowledgement. No second movement calculator or document authority. Broader callback member closure remains071. Pinned useMoveSelectedNodes.ts31–35 uses5px, or snapGrid per axis, multiplied by factor1/shift4 (NodeWrapper158), giving5/20px without a grid. NodeWrapper149–159 announces pre-move absolute integer coordinates; Vanilla's current path announces proposed post-move relative coordinates. That timing/coordinate difference requires capture and explicit classification, not a parity claim. Tests must distinguish proposal from accepted state, respect resolved draggable/keyboard flags and native input exclusion, cover nested selection/teardown, and prove focus-visible-only autopan through the existing viewport proposal/acceptance path without changing zoom.

Revisit this child when public defaults/options/schemas, owner lifecycle or pinned/current upstream contract changes. Record capture dates and revisions independently. Evidence links require semantic review after line changes; count/checker success does not establish member behavior.

## Round1 pinned distance defaults

Pinned ReactFlow/index.tsx:107-108 defaults paneClickDistance to1, nodeClickDistance to0. Implement/test those distinct defaults and explicit zero/false override behavior; any intentional legacy host default retained has a separate mapped option and test boundary, never a claimed same default.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: TODO — architecture APPROVED Round2; source execution awaits 066 checked decomposition and coordinator dispatch

Required next action:066 checked field decomposition and accepted prerequisite snapshot. Architecture is approved; all global labels/theme/config implementation and production/reference gates remain required.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.

## Focused source review revision1, 2026-09-30

The first required typecheck repeated failure after focused repair because the linter removed an explicit undefined argument needed by the public update boundary test (`appearance-client.test.ts:150`). Root authorized revision1: restore direct `client.update(undefined)` with a line-specific lint rationale rather than introducing a Schema decoder workaround; rerun typecheck/check and the original gates. Root independently reviewed the new config/ARIA schemas, client, application port and edge-renderer diffs and passed ten focused tests. Root also requested that edge reconciliation compute one config/z-index map per reconcile rather than recomputing it per edge. No complete source acceptance, production appearance assertion, capture or full verification is claimed at this checkpoint.

Root additionally approved a bounded interactive-control mapping in existing native UI files: derive state from accepted nodesDraggable/nodesConnectable/elementsSelectable with OR, matching the pinned selector; invert all three flags together. Vue emits one optional onInteractiveChange proposal and relies on parent reactive-prop acknowledgment, with the button disabled when that callback is absent; no separate interactive prop or local configuration override. Foldkit uses the existing correlated appearance client update when available, with pending/disposed/failed outcomes preventing a fabricated toggle. Both expose showInteractive and the global interactive label. The callbackless Vue difference from pinned direct-store toggling must be classified and tested. Whole058 component acceptance remains open. Root also identified unfinished click guards applying paneClickDistance to controls/edges and missing nearest-canvas ownership in Vue; revision1 must preserve owned node/pane thresholds, existing UI/edge behavior, keyboard activation and foreign/nested owner isolation through meaningful production/reference tests.

## Focused source recovery revision2 FINAL, 2026-09-30

Revision1 stopped after a second required quality failure. An unsafe substring edit accidentally removed the Vue renderEdge return and roughly485lines through edge-label helpers, unmount cleanup and root pointer/render handlers (HEAD region starts4778), leaving a syntax error near5138. Root inspected the actual deletion diff and authorized the final bounded recovery: use a known verified backup or the exact unchanged HEAD region, then reapply only approved appearance/theme/ARIA/ownership/ordering additions through uniquely asserted anchors or a reviewed patch. Preserve original labels, lifecycle and pointer/keyboard/viewport handlers; inspect the complete resulting diff before continuing. Required typecheck/check and all original production/reference/packed/docs/architecture/full verification gates remain required. Historical325unit tests and earlier check/typecheck passes are not current recovered-artifact proof. A required gate failing twice after focused repair must STOP with no third review round.

Root also approved an optional pure endpoint-node lookup in flowEdgeZIndex, derived once from the same current document as the config/z map. Known expected pinned numeric cases must cover both paths. Stable SVG edge ordering is in scope; actual edge-over-HTML-node interleaving remains unverified and cannot be claimed from SVGgroup style values.

## Final execution STOP, 2026-09-30

The recovered Vue artifact passed typecheck, quality (653 files), architecture and ten focused core/client tests before the final fixture/test additions. Root fullverify is the current whole-artifact result below. The required Vanilla appearance suite then failed three cases; a focused locator repair made node movement and disabled-policy assertions pass, but the second run still failed because its edge-description locator did not find the edge. Six cases passed and one failed. The executor stopped under the repeated-required-gate rule in final revision2. No third automatic repair is authorized; this source candidate is unaccepted and remains isolated in `appearance-accessibility/flow`. Vue/Foldkit browser, reference capture, packed consumers, docs and executor full verification did not run. Root ran mandatory `bun run verify` on the preserved final artifact:exit1 at quality, before type/build/browser stages, with current formatting/lint errors in the newly added appearance suites. Log:`/tmp/flow-068-final-verify.log`. No repair or third round followed.

The inspected rendering design also leaves edge-over-HTML-node paint ordering unverified; SVG group style and stable edge-to-edge ordering do not prove it. Vanilla has the grid-based keyboard path, while Vue/Foldkit currently expose no grid configuration path and retain only 5/20 movement. Those variants, held075 native fields, reference comparisons and semantic cells remain open.

Exact stopped browser command: `bun run test:browser -- appearance-config.e2e.ts`. First log:`/tmp/flow-068-vanilla-appearance-browser.log`, four passes and three failures. Focused rerun:`/tmp/flow-068-vanilla-appearance-browser-repaired.log`, six passes and one failure. Source inspection confirms the test expects `flow-edge` while actual Vanilla output exposes `flow-edge-group` at `apps/vanilla/src/edge-renderer.ts:358`; the edge exists, but computed description remains unverified. Current root fullverify reports34lint diagnostics in the new suites/fixture. No further source/test edit or retry followed STOP.
