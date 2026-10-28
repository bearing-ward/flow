# Appearance and accessibility resumption source audit

Read-only correctness and test-coverage audit, 2026-10-02. Main baseline is `841be137e253cf19c665269eaaa79edc19abf3c3`. This is an evidence packet for a later approved resumption, not a numbered implementation plan, dispatch approval, repaired candidate, or parity verdict. Only this new report was written. No installation, build, test, compiler, gate, port action, source edit, restoration, or child dispatch ran.

## Inputs and evidence boundaries

The full improve skill and its absolute `references/audit-playbook.md` were readable. Correctness / Bugs, Test Coverage, Finding format, standards, TypeScript and unslop guidance were read. Full 068 and the central 057 contract design were read. 054 renderer acceptance and 058 component ownership constrain the recommendation. Repository contents were treated as evidence. No credentials were reproduced.

The genuine historical snapshot is `43f3a4dbc123ab2cc99cc550c086439f5cad03df`, parent `de36b4f64fe80d99886c0b7a9fb505258b872ac9`. Every historical source citation below refers to that Git object, not main and not a fabricated restored checkout. The primary recovery inventory SHA256 was independently checked as `41d41c45391e862e0f052c8be08cf2d65236f64314df7fad2a5f73eb58df5f25`. It records 51 changed paths, 23 matching patch postimages and eight preserved logs. Historical patch SHA256 is `eb096aef6b7598e98d5641485df3f69f6f8ac2fe8755a1d31916916f311cab24`. The archived patch and logs remain immutable evidence; the child `appearance-accessibility/flow` is absent and was not restored.

Original STOP remains `plans/068-complete-appearance-accessibility-config.md:166-172`. The second Vanilla browser attempt passed six and failed one, its computed edge-description locator. Its preserved log SHA256 is `fab831b728399a80f3133414a291f60000ba01608fda3bd4a684a70856d22dd5`. The root verifier failed quality with 34 diagnostics before later stages, preserved log SHA256 `9ced599b47b150dc226c99190bb2f273728c39bdbc81322866adecbf27ce0926`. Earlier ten focused core/client tests and intermediate type/check passes do not supersede this final artifact failure. Vue/Foldkit browsers, reference captures, archives and final full acceptance never ran.

Accepted 087 is a separate source input, checkout `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, external freeze `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json`, independently hashed `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. Its executor-time pending acceptance label must be interpreted with primary/cold acceptance records supplied by the coordinator. Nine scoped production/factory file hashes match its complete manifest; this audit does not claim to have revalidated all 1492 manifest files or rerun its gates. Both 087 and current 086 use main HEAD with uncommitted candidates, so HEAD equality does not imply equal artifacts.

Current 086 at `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow` is moving and UNACCEPTED. Six relevant file reads were bracketed by matching before/after SHA256 values. Those observations identify future merge conflicts only; they authorize neither import nor acceptance. There are no accepted native generic bindings in 087. Its real factory contracts are `packages/core/src/domain/flow-data-contract.schema.ts:11-33,56-67` and `flow-data-contract.ts:16-85`, with Effectful isolation and geometry-derived fields. The concrete host configurations remain concrete. Do not fabricate `data-bindings.ts`, phantom generic configuration, or typed canvas acceptance.

## Vetted findings

### [CORRECTNESS-068-01] Restore the approved exact edge-description default

- Evidence: historical `packages/core/src/domain/flow-accessibility.schema.ts:56-57` says "and escape"; pinned `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/constants.ts:49-50` and current `plans/057-public-contract-design.md:68` require "or escape". Historical `flow-appearance.schema.test.ts:77-92` compares the defaults to themselves and checks label count, not each literal.
- Impact: every edge relying on the default receives text differing from the approved pinned contract; the existing units cannot detect it.
- Effort: S. Risk: LOW, localized label plus real literal/DOM assertions. Confidence: HIGH, direct source comparison.
- Resumption requirement: cover every exact default independently and retain the computed accessible-description assertion. This audit makes no source repair.

### [COVERAGE-068-02] Repair the locator while preserving the failed behavior assertion

- Evidence: historical `apps/vanilla/e2e/appearance-config.e2e.ts:47` expects `flow-edge`; actual historical `apps/vanilla/src/edge-renderer.ts:354-358` creates `flow-edge-group`, appends hit/path/visual at `:402`, and applies description at `:489-495`.
- Impact: the required suite cannot reach its edge description. Six passing cases do not establish that description or any whole-068 acceptance.
- Effort: S. Risk: LOW if the future repair selects the actual focusable edge element and preserves `toHaveAccessibleDescription('First edge help')`; HIGH if changed to an attribute-only or count assertion. Confidence: HIGH.
- Resumption requirement: inspect actual renderer role/description ownership and assert computed description on that element. Do not remove, skip, weaken, or substitute away this failed check. The historical repeated-gate STOP prohibits another automatic repair on the stopped artifact.

### [COVERAGE-068-03] Expand the matrix beyond the repeated seven-case suite

- Evidence: each historical `apps/{vanilla,vue,foldkit}/e2e/appearance-config.e2e.ts:8-149` contains the same seven scenarios. Fixtures are uncontrolled at Vanilla `appearance-config-test.ts:45-55`, Vue `:72`, and Foldkit `:60-77`. Vue's interactive proposal/acknowledgment controls exist at `:85-90,162-171` but the suite never exercises them. Vanilla's snap route at `:59-61` and invalid/manual actions at `:130-136` are also unexercised.
- Impact: the suite omits controlled graph/viewport acknowledgment, custom live formatter, nested selected movement, ancestor coordinates, snap grid, focused autopan, native-input exclusion, per-element flag reversal, click-distance defaults/zero/thresholds, interactive pending/failure/acknowledgment, marker null/default paint, attribution, debug/error delivery, exact default names, and actual edge/node paint order. The 63-member target cannot close from these seven cases.
- Effort: L. Risk: MED/HIGH, assertions must observe public owner state and real DOM rather than fixture-side reducers. Confidence: HIGH for absent coverage; unexecuted product behavior remains unverified.
- Resumption requirement: use separate bounded acceptance slices below, retaining every original assignment. Active native-schema 075 and 074 dependencies stay explicit, including ariaRole; do not claim complete element-native configuration from existing label fields.

### [COVERAGE-068-04] Prove active system-listener disposal and mixed-owner isolation

- Evidence: the historical disposal case switches first owner to light before removing it, `appearance-config.e2e.ts:132-145`. Vanilla explicitly removes its media listener in `appearance.ts:43-54,141-146`; Vue cleans the watch and listener at `flow-canvas.ts:5251-5252`; Foldkit uses a dependency-scoped subscription at `graph.ts:3714-3737`. None of the suites measures listener registration/removal or triggers a late media event on a disposed active-system owner.
- Evidence: click filters use only their own host CSS class at Vanilla `mount-flow.ts:6003`, Vue `flow-canvas.ts:1037`, Foldkit `graph.ts:3593-3594`. A different host canvas nested under an owner can still appear nearest under that class-specific query. Moving 086 `packages/foldkit/src/graph.ts:289` already recognizes all three canvas classes, but is unaccepted context.
- Impact: sibling owner themes are partly tested, while active disposal, late delivery, nested same-host and nested different-host exclusion remain unverified. Class-specific click ownership can capture a nested foreign host's pane/node event.
- Effort: M. Risk: MED, cleanup and event ownership touch existing 054/056/058 behavior. Confidence: HIGH for test gap; MED for mixed-host runtime effect pending mounted reproduction.
- Resumption requirement: characterize registrations/removals, dispose while still system, change media afterward, and preserve another live system owner. Mount nested same-host and different-host graphs and observe native pointer/keyboard/wheel output and graph proposals. Preserve existing no-drag/no-pan/native UI exceptions.

### [COVERAGE-068-05] Characterize native update atomicity, correlation and reentrancy

- Evidence: core `flow-appearance.schema.test.ts:130-151` rejects own undefined, invalid modes/distances and labels without mutating its previous input. Vanilla `appearance.ts:62-81` decodes before assignment but notifies at `:90-106` before host `mount-flow.ts:8619-8631` rerenders node/edge/UI output. Foldkit `appearance-client.ts:35-67` deletes pending identity, publishes current configuration, calls listeners, then settles the response. Tests `appearance-client.test.ts:62-117` cover an unrelated result and an older invalid result, not two out-of-order successful responses or disposal/update from inside a listener.
- Impact: invalid core decode is characterized, but real mounted update failure, observable getter-versus-DOM timing, reentrant update/disposal, stale successful results, duplicate results and runtime-only shutdown remain uncovered. Client IDs correlate requests; they do not independently establish accepted-result ordering.
- Effort: M. Risk: MED/HIGH, preserve current accepted ownership and native synchronous/port contracts. Confidence: HIGH for omitted cases; MED for runtime failure implications.
- Resumption requirement: establish the approved publication/timing semantics through real APIs and ports before changing them. Invalid input must retain accepted config, DOM, graph, viewport, listeners and request settlement. Do not introduce an unapproved second store, new scheduler, or failure-status redesign. Any changed response/status contract needs separate review.

## Production and test paths

All following paths are historical snapshot traces and source-grounded; they are not current running proof.

Vanilla public `apps/vanilla/src/public.ts` exports mount/controller APIs. `mount-flow.ts:9245-9273` decodes mount configuration/document, constructs the accepted appearance input, and retains the live formatter locally. `:1567-1576` creates one canvas-owned appearance owner. Update `:8601-8633` decodes through `appearance.ts:62-81`, keeps graph configuration separate, then reapplies node wrapper descriptions/flags, handles, graph positions, edge reconcile, UI labels and attribution. Core flag resolution uses per-element nullish precedence, `flow-appearance.schema.ts:143-152`; node names/descriptions preserve explicit element text at `mount-flow.ts:1316-1331`. Keyboard `:7375-7440` uses accepted node projections, grid-or-5 per-axis steps and shift factor four, announces pre-move absolute truncated coordinates and publishes via existing operations. Wheel `:7770,7818-7822` changes default prevention while following existing viewport publication. Destroy `:8530` disposes the appearance owner. Test route `appearance-config-test.ts:57-68,85-87` calls public mount/update; suite observes colors, computed accessible names/descriptions, snapshots and wheel events.

Vue public package exports FlowCanvas and native UI. `packages/vue/src/flow-canvas.ts:826-858` derives configuration from reactive props using the shared decoder and provides one native appearance injection; `use-flow.ts:969-975` exposes that value to UI. Controls `ui.ts:115-121,191-204` derive interactivity by OR and emit a proposal, with callbackless button disabled. MiniMap uses the injection in `minimap.ts:95-106,151-154`. Node wrapper `flow-canvas.ts:4335-4345` keeps explicit text; keyboard `:4625-4677` requires direct wrapper target, effective draggable and enabled policy, moves through the existing change path and announces pre-move absolute position. Focus `:4567-4614` requires focus-visible and submits an unchanged-zoom viewport update. Wheel `:4186-4188` honors accepted reactive prevention. The test fixture supplies uncontrolled defaultDocument, public subscription, reactive config and explicit acknowledgment, `apps/vue/src/appearance-config-test.ts:67-118,162-171`; its suite does not exercise acknowledgment. Own undefined is invalid in the core boundary; Vue prop-default behavior is a separate native boundary that requires tests, not an inferred equivalence.

Foldkit public `createProgram` accepts serializable config plus a local formatter, `application.ts:2586-2598`. Appearance config is stored on the existing graph model, `graph.ts:193-194,4371-4375`; no second graph is introduced. `application.ts:292-310,346,356,930-933` defines schema-derived get/update and result ports. `:1828-1895` decodes first, leaves model unchanged on invalid input and otherwise updates graph appearance before responding. Client `appearance-client.ts:35-67,85-113` validates JSON at the local boundary, correlates IDs, accepts responses, notifies detached/frozen projections and settles requests; disposal settles pending operations. Graph keyboard `graph.ts:2036-2110` applies core selected movement, keeps controlled document unchanged while reporting a proposal, and carries pre-move absolute live announcement. Theme `:3714-3737` is native subscription lifecycle; wheel `:4133-4168` checks instance ownership. UI factories consume the client's native source at `ui.ts:447-451,650-742`. Test route embeds the program publicly but imperatively appends controls/MiniMap into runtime DOM and uses a MutationObserver to reappend them, `apps/foldkit/src/appearance-config-test.ts:205-251`. That fixture's composition is app-specific; it does not prove reusable UI ownership or lifecycle across arbitrary consumers.

The exact 11-key matrix is ten serializable string keys plus native `node.a11yDescription.ariaLiveMessage`. Static keys are node default and keyboardDisabled descriptions, edge default description, control panel, zoom in, zoom out, fit view, interactive, MiniMap and handle. Pinned defaults are in immutable `constants.ts:42-63`; snapshot `flow-accessibility.schema.ts:3-45,51-81` models all keys but has the edge literal error above. `flowNodeAriaDescription:84-92` intentionally follows upstream's counterintuitive key selection. Empty strings remain valid. Omitted partial keys retain previous/default text; own undefined rejects at the serializable boundary. Element ariaLabel/ariaDescription overrides win, including empty strings where element schema permits. Do not silently apply config optionalKey rules to edge default spread or native props without separate proofs.

## Smallest resumption slices and exact assembly requirements

A later primary-approved source packet should select an immutable accepted base by complete candidate manifest, not either checkout HEAD. Accepted 087 can supply the core factory foundation and inherited accepted prerequisites. Before using it, independently match its full 1492-file candidate manifest, 147 changed inventory paths and primary/cold acceptance records to the exact external freeze. If native 086 becomes the selected base later, require its completed frozen source acceptance first. Never copy the current moving 086.

Historical snapshot has 33 changed production/test source paths. The reusable additions are the two core schemas and their test, native appearance owner/client and client test, and three host appearance routes/fixtures/suites. Existing-file changes must be ported as reviewed semantic hunks against current accepted owners, never replaced wholesale. Historical mount/FlowCanvas/graph files predate accepted current measurement, origin, directed connection and typed foundation changes. Preserve those current authorities. Do not overlay historical `plans/057-member-closure.json`, catalog, 066 routing/checkers, metadata or old public exports as a full patch.

The bounded configuration-and-label slice includes only new `packages/core/src/domain/flow-accessibility.schema.ts`, `flow-appearance.schema.ts`, `flow-appearance.schema.test.ts`; core public exports; Vanilla `appearance.ts`, mount/public/edge renderer/controls/canvas-ui/styles; Vue flow-canvas/use-flow/public/ui/minimap/styles; Foldkit appearance-client/client tests/application/graph/public/ui/styles; host appearance HTML/fixture/E2E routes. Keep native formatter functions outside ports and persisted schemas. First prove exact labels/defaults, partial/empty/own-undefined handling, invalid atomicity, live media lifecycle and public output. Keep current 054 renderer lifetimes, stable keys, label portals, measured handles, caller children and native input ownership intact.

A distinct keyboard-and-controlled slice reuses the existing moveSelectedNodes/applyNodePositionsChange authority and host proposal/acknowledgment paths. It covers per-element flags, nested coordinates, custom formatter, focus-visible autopan and disposal. Vanilla grid support exists; historical Vue/Foldkit accept only 5/20 movement. Do not smuggle grid configuration into these hosts. Decide the missing native grid contract through an approved design amendment or retain the grid cells open. Accepted current origin geometry must supply absolute positions, extents and parent behavior.

A distinct remaining-options slice covers distances, scrolling, attribution/proOptions, marker default/null color, elevation, debug/onError and native ariaRole dependencies. Numeric z-order and stable edge-to-edge SVG sort do not prove edge-over-HTML-node paint interleaving. Require overlapping actual rendered output, screenshot or hit-test observation and pinned comparison. Cross-layer painter redesign belongs a separately reviewed architecture change if required. 058 interactive controls stay connected to accepted appearance state; callbackless Vue remains an intentional native contract pending its acknowledgment test. Whole 058 remains open.

Permitted evidence additions in a later reviewed packet are `scripts/capture-appearance-config-reference.ts`, `research/harnesses/appearance-config/`, `research/fixtures/appearance-config-reference.json`, `packages/conformance/src/appearance-config-reference.test.ts`, scoped member/trace/PROGRESS/docs updates and `verification.config.json`. The capture files do not exist now. Do not run a proposed path or replace full pinned runtime captures with imported evidence. No dependency, lockfile, compiler, lint, browser port or test policy changes are needed or authorized by this audit.

The later execution gate must repair quality without weakening assertions, obtain the shared browser/archive lease, and run each host appearance suite plus affected renderer/input/canvas UI regressions serially. Include public-state and relevant native-schema/measurement/origin regressions from the selected accepted base. Exercise interactive failure/acknowledgment, raw Foldkit requests, formatter and configuration mounting through all three installed archives with `bun run test:consumer`; source imports cannot substitute. Scope the saved focused verifier to the actual task per `docs/tooling.md:25-56`, including all three appearance suites, affected regressions, docs/contracts/member/traces/consumer checks and adapter builds. Run `bun run verify` for that exact scope and `bun run verify:full` at integration before broad acceptance, recording profile/counts/skips separately. Neither ran in this audit.

Capture the actual pinned full checkout at `0a1f9575b25679f2880175de8d3eae21aedde921`, React 12.11.6, through public ReactFlow controls/props. After the proposed capture exists, require two stable `bun run scripts/capture-appearance-config-reference.ts --checkout /absolute/disposable-xyflow-checkout` runs and the product conformance test. Normalize only volatile IDs/timing, retaining raw captures and exact literals, coordinates, keyboard proposals, wheel default prevention and paint output. Real assistive technology/native device, hosted CI and collector delivery remain separate external evidence.

STOP on selected-source/manifest drift, failed approval provenance, twice-failed required gate after focused repair, incomplete capture, missing shared lease, unchecked casts, private mutable store access, second graph authority, persisted function/DOM/measurement state, cross-owner queries, or a required out-of-scope painter/grid/generic redesign. Preserve independent completed work and exact logs. Historical STOP is immutable; any successor requires its own approved scope and fresh gates.

## Original member preservation

The current closure manifest has 46 owner-068 groups, 63 original raw member assignments and 189 host cells. All remain `implementation-gap`. This audit changes none of their IDs, owners, raw assignments or states. The following table retains exact group IDs and raw member strings; each member retains Vanilla, Vue and Foldkit obligations.

| Contract ID | Raw member assignments |
| --- | --- |
| `react-flow::068::arialabelconfig` | `arialabelconfig` |
| `react-flow::068::attributionposition` | `attributionposition` |
| `react-flow::068::autopanonnodefocus` | `autopanonnodefocus` |
| `react-flow::068::colormode` | `colormode` |
| `react-flow::068::debug` | `debug` |
| `react-flow::068::defaultmarkercolor` | `defaultmarkercolor` |
| `react-flow::068::disablekeyboarda11y` | `disablekeyboarda11y` |
| `react-flow::068::edgesfocusable` | `edgesfocusable` |
| `react-flow::068::elementsselectable` | `elementsselectable` |
| `react-flow::068::elevateedgesonselect` | `elevateedgesonselect` |
| `react-flow::068::elevatenodesonselect` | `elevatenodesonselect` |
| `react-flow::068::nodeclickdistance` | `nodeclickdistance` |
| `react-flow::068::nodesconnectable` | `nodesconnectable` |
| `react-flow::068::nodesdraggable` | `nodesdraggable` |
| `react-flow::068::nodesfocusable` | `nodesfocusable` |
| `react-flow::068::onerror` | `onerror` |
| `react-flow::068::paneclickdistance` | `paneclickdistance` |
| `react-flow::068::preventscrolling` | `preventscrolling` |
| `react-flow::068::prooptions` | `prooptions` |
| `react-flow::068::zindexmode` | `zindexmode` |
| `types/aria-label-config::068::AriaLabelConfig` | `AriaLabelConfig` |
| `types/aria-label-config::068::controlsarialabel` | `controlsarialabel` |
| `types/aria-label-config::068::controlsfitviewarialabel` | `controlsfitviewarialabel` |
| `types/aria-label-config::068::controlsinteractivearialabel` | `controlsinteractivearialabel` |
| `types/aria-label-config::068::controlszoominarialabel` | `controlszoominarialabel` |
| `types/aria-label-config::068::controlszoomoutarialabel` | `controlszoomoutarialabel` |
| `types/aria-label-config::068::edgea11ydescriptiondefault` | `edgea11ydescriptiondefault` |
| `types/aria-label-config::068::handlearialabel` | `handlearialabel` |
| `types/aria-label-config::068::minimaparialabel` | `minimaparialabel` |
| `types/aria-label-config::068::nodea11ydescriptionarialivemessage` | `nodea11ydescriptionarialivemessage` |
| `types/aria-label-config::068::nodea11ydescriptiondefault` | `nodea11ydescriptiondefault` |
| `types/aria-label-config::068::nodea11ydescriptionkeyboarddisabled` | `nodea11ydescriptionkeyboarddisabled` |
| `types/color-mode::068::ColorMode` | `ColorMode`, `ColorMode#1.<union:1>`, `ColorMode#1.<union:1>.<type:ColorModeClass>`, `ColorMode#1.<union:1>.<type:ColorModeClass>.<union:1>`, `ColorMode#1.<union:1>.<type:ColorModeClass>.<union:2>`, `ColorMode#1.<union:2>` |
| `types/edge::068::arialabel` | `arialabel` |
| `types/edge::068::ariarole` | `ariarole` |
| `types/edge::068::Edge` | `Edge#1.<intersection:1>.<type:EdgeBase>.ariaLabel`, `Edge#1.<intersection:3>.ariaRole`, `Edge#1.<intersection:3>.ariaRole.<type:AriaRole>` |
| `types/node::068::arialabel` | `arialabel` |
| `types/node::068::ariarole` | `ariarole` |
| `types/node::068::Node` | `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.ariaLabel`, `Node#1.<intersection:2>.ariaRole`, `Node#1.<intersection:2>.ariaRole.<type:AriaRole>` |
| `types/on-error::068::id` | `id` |
| `types/on-error::068::message` | `message` |
| `types/on-error::068::OnError` | `OnError`, `OnError#1.arg:id`, `OnError#1.arg:message`, `OnError#1.result` |
| `types/pro-options::068::account` | `account` |
| `types/pro-options::068::hideattribution` | `hideattribution` |
| `types/pro-options::068::ProOptions` | `ProOptions`, `ProOptions#1.account`, `ProOptions#1.hideAttribution` |
| `types/z-index-mode::068::ZIndexMode` | `ZIndexMode`, `ZIndexMode#1.<union:1>`, `ZIndexMode#1.<union:2>`, `ZIndexMode#1.<union:3>` |

## Scoped conflict hashes

Each row was read with identical before/after hashes. 087 rows also matched its frozen complete-candidate manifest. 086 rows are observations of unaccepted work only.

| Path | Accepted 087 SHA256 | Moving 086 SHA256 |
| --- | --- | --- |
| `apps/vanilla/src/mount-flow.ts` | `146e153465abf0c113cfd2458d9c559e3de701b4800eba5c25ddbfbe7082434e` | `17bf3a5b5fa4d464766bd6c80ea5cce22a3ed100408838af1816d431403604a3` |
| `packages/vue/src/flow-canvas.ts` | `611c202d65f81340790f047c421b5e612791aa035a993df5e5fc1b1a26a01350` | `b83469953b2bf3d6874528cd9aacd7eddc122abfd19158db610be9a4981580e5` |
| `packages/vue/src/use-flow.ts` | `abf4c45476d3dceb659035bf06ae29b1d04390a9ba32c715b74454058e90c2dc` | `abf4c45476d3dceb659035bf06ae29b1d04390a9ba32c715b74454058e90c2dc` |
| `packages/foldkit/src/application.ts` | `09041a59a48e0f6c3e4dbaa97a86320083a5e3af3c312a5c8bae5efd2af6cdb7` | `b43a06591d626d8b269b60c75f022045c42aa97e1ed4b8cbd48455e88464a498` |
| `packages/foldkit/src/graph.ts` | `3cbcb104203db2385b193fc16ff02c1a0faadf5d8942c082cfd69d1ddf92b100` | `22706718973cd709c42c428661a27105f9e8cfc0f50f9c34895ac3ce048d209e` |
| `packages/core/src/domain/flow.schema.ts` | `b765bb46f60e0470f710907ab61ee9b5403dfff556b658d6bb2fa6e4537a547d` | `e16ec445c9cdb041ca1da01633a2a041f43498cb9a52ba85640014aaab7379a6` |

These conflicts overlap configuration decoding, current origin coordinates/extents, measured-handle publication, native render context, port schemas and controlled proposals. The accepted factory builders derive the complete authoritative node/edge/document fields; adding future persisted native fields requires their separate schema/compatibility ownership. Appearance remains native config and must not enter document data. This report does not audit all 086 source or the entire 087 implementation, mutate metadata, or claim its focused gates as appearance acceptance.

## Conformity and deviations

Conforming by source structure only: ten static labels plus a native formatter, Schema-derived serializable input, one existing graph authority, per-element flags/text precedence, detached config reads and host-owned media lifecycle follow the approved design. Executable cross-host/ref acceptance remains unverified. The exact edge default is a confirmed deviation requiring correction in a later successor. The reversed-looking node description keys and pre-move absolute integer announcement are pinned behavior, not a defect to rename or retime.

Intentionally different by approved architecture: functions and component lifecycles stay native; Foldkit carries serializable correlated requests/results; Vue controlled interactive changes require owner acknowledgment and callbackless controls are disabled. Their production acknowledgment, failure and disposal boundaries still require tests. Appearance is outside persisted documents and accepted graph events.

Unverified: every original 068 semantic cell, full 058 component closure, native ariaRole dependencies, controlled ownership variants, all-key exact DOM output, mixed-canvas isolation, active system disposal, reentrancy, stale successful response ordering, custom formatter/native assistive output, grid variants, actual edge/node paint interleaving, captures, installed consumers and focused/full successor acceptance. Historical six browser passes and ten focused units establish only their exercised stopped-candidate cases. No current runtime, integration, generic native binding, native device, CI or collector proof is claimed.
