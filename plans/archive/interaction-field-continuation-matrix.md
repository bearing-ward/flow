# Interaction fields and callback continuation

2026-10-02. Read-only design pending primary and independent cold review. Source execution is a later dispatch. Planned against main `841be137e253cf19c665269eaaa79edc19abf3c3`.

This document and `interaction-field-continuation-matrix.json` retain every exact assigned record: 108 groups, 217 members, 651 host cells. Original group IDs, targets, catalog ownership, original descriptions/rawSourceRow, dependencies and cell decisions are copied unchanged. Every generated cell remains OPEN and unverified. No ledger or product files changed. First- and second-review packet bytes are preserved in deterministic `plans/callback-field-matrix-first-review-inputs.tar.gz` and `plans/callback-field-matrix-second-review-inputs.tar.gz`; both independent REVISE reviews remain unchanged.

Original dependency edges remain 0 at group level, 0 at member level, 0 at host-cell level. `python3 plans/callback-field-matrix-design.py --check` recomputes exact identity sets, copies, dependencies, source hashes and outputs. It establishes accounting, never semantic acceptance.

## Input and source boundaries

Accepted 085 origin lineage is `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`, external freeze `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef`. Accepted 087 schema factory is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, freeze `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. Main lacks the accepted origin additions. These matrices hash the selected read source separately and name its root; do not read main line numbers as accepted-candidate line numbers.

085 accepts bounded origin edit/schema round-trip work. It does not accept inherited native field/callback parity. 087 accepts schema factory, codec identity/services/isolation and ordered integrity. It does not accept generic actor/host/renderer/callback integration or any original member closure. 086 remains UNACCEPTED; the verified construction-only observation in `plans/archive/native-creation-option-test-boundary.md` is a scoped source fact, not candidate approval. Preserve historical 081/083/084 stops.

Pinned source is immutable `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. Current dated catalog rows remain requirement text, including extraction failures. No default is parsed from a joined row or silently invented. New proposed behavior is a separate field, and must be checked against pinned executable output before closure.

## Production paths

- vanilla, in accepted 085 source lineage: `apps/vanilla/src/public.ts:1` → `apps/vanilla/src/mount-flow.ts:9082` → `apps/vanilla/src/mount-flow.ts:8922` → `packages/core/src/domain/flow-graph.ts:85` → `apps/vanilla/src/mount-flow.ts:4139` → `apps/vanilla/src/mount-flow.ts:4907`. Edge render is `apps/vanilla/src/edge-renderer.ts:169`; bounded callback path is `apps/vanilla/src/mount-flow.ts:2955`. These citations show the current route, not that every proposed member is implemented.
- vue, in accepted 085 source lineage: `packages/vue/src/public.ts:1` → `packages/vue/src/flow-canvas.ts:475` → `packages/vue/src/flow-canvas.ts:812` → `packages/vue/src/flow-canvas.ts:1032` → `packages/vue/src/flow-canvas.ts:1193` → `packages/vue/src/flow-canvas.ts:4208`. Edge render is `packages/vue/src/flow-canvas.ts:4657`; bounded callback path is `packages/vue/src/flow-canvas.ts:1566`. These citations show the current route, not that every proposed member is implemented.
- foldkit, in accepted 085 source lineage: `packages/foldkit/src/public.ts:1` → `packages/foldkit/src/application.ts:2558` → `packages/foldkit/src/graph.ts:1166` → `packages/foldkit/src/graph.ts:2939` → `packages/foldkit/src/graph.ts:3396` → `packages/foldkit/src/graph.ts:3108`. Edge render is `packages/foldkit/src/graph.ts:3216`; bounded callback path is `packages/foldkit/src/application.ts:1618`. These citations show the current route, not that every proposed member is implemented.

Core graph meaning stays in `packages/`; native DOM/lifecycle stays in the owning adapter. Origin graph computation at `packages/core/src/domain/flow-graph.ts:85` uses measured/declared dimensions, origin-adjusted top-left and parent absolute position. Runtime measurement is transient. Exact per-member construction/update sources must be added at source review; these shared routes are the existing public path, not a fabricated implementation location for a missing member. Controlled changes stay proposals until owner acknowledgment; uncontrolled changes validate and publish once.

## Separate test and reference paths

Existing production examples are real public fixtures: Vanilla `apps/vanilla/e2e/interaction-lifecycle.e2e.ts:458` dynamically imports `/src/public.ts` and mounts `mountFlow`; Vue `apps/vue/e2e/renderer-contract.e2e.ts:20` calls `apps/vue/src/renderer-contract.ts:203` using `@flow/vue` FlowCanvas; Foldkit `apps/foldkit/e2e/renderer-contract.e2e.ts:22` calls `apps/foldkit/e2e/test-harness.ts:816` using package-public createProgram. Those are exemplars with bounded assertions, not proof for all rows below.

Each JSON cell retains its original production test and capture target, and proposes the exact assertion identity `contractId::member::host`. A test must record its own production operation, exact expected payload/accepted state/DOM value and pinned comparison. NEW `scripts/capture-interaction-member-reference.ts` and relevant per-host member suites may not exist yet; no command was run against invented files.

- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/container/ReactFlow/index.tsx:68`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:92`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/EdgeWrapper/index.tsx:138`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/general.ts:130`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/nodes.ts:53`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useDrag.ts:41`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/container/ZoomPane/index.tsx:68`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:56`.

Capture through a verified full xyflow checkout at the pinned SHA, with two stable normalized samples and exact expected differences; imported source alone is not reference execution. New traces end with Conformity and deviations, keeping current production, test helper and pinned reference paths separate.

## Ownership and compatibility policy

Native event objects and caller callback functions stay local to Vanilla/Vue/Foldkit lifecycle. Foldkit Schema ports carry serializable semantic notifications; arbitrary codec-decoded graph subtype values require actual 069 host propagation and supplied isolation rather than an assumed JSON channel; native presentation/event callbacks are captured by an owner-local API and never encoded as DOM Events or functions. No model mirror or cross-owner DOM lookup is permitted.

Separate serializable document meaning from native CSS/class/DOM attributes and callback/component presentation. Full CSSProperties is wider than Flow stroke/strokeWidth. Arbitrary label content is wider than a document string. Runtime dragging/resizing/absolute geometry/measurements/internals stay derived and detached. Source/target sides and declared handles stay distinct from measured centers. Renderer registries require built-in/default/unknown/custom behavior and replacement cleanup.

Saved literal-v1 and versioned 070 remain backward compatible. Before adding animated/extent/expandParent/dragHandle/path-options or any persisted field, independently review the exact old/new encode/decode/rejection policy and fixture compatibility. This matrix does not select a new persisted format or authorize production schema edits. Native presentation records must not leak into persistence. Dependencies 063 SSR, 065 measurements, 067 origins/connections, 068 ARIA/global color and 069 typed integration remain exact original owners; accepted foundations do not close composites.

## Complete assigned member matrix

Generic parameter records are compiler-only. NodeData and EdgeData retain their exact Record<string, unknown> bound/default; their ten dimensions are linked to actual node.data/edge.data consuming operations, never standalone runtime properties. NodeBase data is required and EdgeBase data optional; arbitrary codec-decoded classes use supplied isolation and actual069 propagation, never forced JSON. Every nongeneric record/cell policy and child assignment is checked unchanged against the preserved second-review packet.

The JSON enumerates all ten required variant dimensions for every member × host: default, absent, own undefined, explicit false, explicit zero, live update, cancel, dispose, order and independent owner. Applicability is explicit. Explicit caller-input, callback-output, renderer-output, return-contract and type-only roles control each dimension. Optional omission remains positive; void completion is ordinary undefined; type-only lifecycle dimensions link to the consuming operation without fabricated standalone inputs. Each member below keeps its original text in JSON and adds a member-specific proposed observation.

### `react-flow::071::autopanonconnect`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `autopanonconnect` | caller-input → caller-input. host-serializable-option. Gate actual viewport auto-pan only for the member-named active gesture. Before threshold no start/preview/auto-pan; edge proximity after promotion moves viewport when true; stop/reject/cancel/dispose ends scheduling. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; under threshold; promoted edge proximity; owner update; Escape; dispose; same-ID second owner |

### `react-flow::071::autopanonnodedrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `autopanonnodedrag` | caller-input → caller-input. host-serializable-option. Gate actual viewport auto-pan only for the member-named active gesture. Before threshold no start/preview/auto-pan; edge proximity after promotion moves viewport when true; stop/reject/cancel/dispose ends scheduling. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; under threshold; promoted edge proximity; owner update; Escape; dispose; same-ID second owner |

### `react-flow::071::autopanonselection`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `autopanonselection` | caller-input → caller-input. host-serializable-option. Gate actual viewport auto-pan only for the member-named active gesture. Before threshold no start/preview/auto-pan; edge proximity after promotion moves viewport when true; stop/reject/cancel/dispose ends scheduling. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; under threshold; promoted edge proximity; owner update; Escape; dispose; same-ID second owner |

### `react-flow::071::autopanspeed`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `autopanspeed` | caller-input → caller-input. host-serializable-option. Scale automatic viewport displacement during node/selection auto-pan with a fixed observed frame interval; zero must not fall back to default. Include connection use if pinned call path consumes the same value. Assert this exact member through its named consuming operation and role. | absent; own undefined; 15; 0; nondefault positive; invalid nonfinite; live replace during gesture |

### `react-flow::071::deletekeycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletekeycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `react-flow::071::edgesreconnectable`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `edgesreconnectable` | caller-input → caller-input. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |

### `react-flow::071::multiselectionkeycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `multiselectionkeycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `react-flow::071::nodedragthreshold`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodedragthreshold` | caller-input → caller-input. host-serializable-option. Compare physical drag displacement before node promotion. Assert below/exactly/above threshold and zero; below threshold produces no node drag start/progress or moved accepted document, while promotion starts once. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; default; just below; exact; just above; live replacement; cancel |

### `react-flow::071::nodeextent`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodeextent` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Assert this exact member through its named consuming operation and role. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |

### `react-flow::071::nodragclassname`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodragclassname` | caller-input → caller-input. host-native-option. Suppress only the member-named gesture for descendants matching configured class in this owner. Replacement removes old policy without dropping unrelated listeners. Assert this exact member through its named consuming operation and role. | absent; own undefined; default class; custom class; matching descendant; other owner; live replace; empty class |

### `react-flow::071::nopanclassname`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nopanclassname` | caller-input → caller-input. host-native-option. Suppress only the member-named gesture for descendants matching configured class in this owner. Replacement removes old policy without dropping unrelated listeners. Assert this exact member through its named consuming operation and role. | absent; own undefined; default class; custom class; matching descendant; other owner; live replace; empty class |

### `react-flow::071::nowheelclassname`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nowheelclassname` | caller-input → caller-input. host-native-option. Suppress only the member-named gesture for descendants matching configured class in this owner. Replacement removes old policy without dropping unrelated listeners. Assert this exact member through its named consuming operation and role. | absent; own undefined; default class; custom class; matching descendant; other owner; live replace; empty class |

### `react-flow::071::onclickconnectend`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onclickconnectend` | caller-input → caller-input. host-local-callback. Second eligible click or cancelled click connection terminates once with final candidate state; keep pointer and click chains distinct. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onclickconnectstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onclickconnectstart` | caller-input → caller-input. host-local-callback. First eligible handle click starts click-connect with the initiating native event; no pointer-drag start duplication. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onconnect`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onconnect` | caller-input → caller-input. host-local-callback. Valid completed candidate invokes once with source/target and nullable handle IDs; reference onConnect itself does not accept an edge. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onconnectend`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onconnectend` | caller-input → caller-input. host-local-callback. Every promoted attempt ends once, including invalid/no-target/validator false/cancel, carrying FinalConnectionState. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onconnectstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onconnectstart` | caller-input → caller-input. host-local-callback. Start only after connection promotion; receive initiating native event plus nullable node/handle/kind, once per attempt. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgeclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgeclick` | caller-input → caller-input. host-local-callback. Deliver actual click on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgecontextmenu`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgecontextmenu` | caller-input → caller-input. host-local-callback. Deliver actual contextmenu on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgedoubleclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgedoubleclick` | caller-input → caller-input. host-local-callback. Deliver actual doubleclick on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgemouseenter`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgemouseenter` | caller-input → caller-input. host-local-callback. Deliver actual mouseenter on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgemouseleave`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgemouseleave` | caller-input → caller-input. host-local-callback. Deliver actual mouseleave on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onedgemousemove`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onedgemousemove` | caller-input → caller-input. host-local-callback. Deliver actual mousemove on the owning edge only, with native event and its current detached edge record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onlyrendervisibleelements`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onlyrendervisibleelements` | caller-input → caller-input. host-serializable-option. Cull DOM using actual viewport and measured bounds while retaining accepted graph/document. Returning into view remounts only this owner, refreshes measurements and keeps active gesture policy explicit. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; pan out/in; partially visible node/edge; renderer cleanup; dispose |

### `react-flow::071::onmove`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onmove` | caller-input → caller-input. host-local-callback. Pan/zoom progress receives x/y/zoom and native event or programmatic null; keep accepted/proposed boundary explicit. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onmoveend`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onmoveend` | caller-input → caller-input. host-local-callback. Pan/zoom completion or cancellation receives final viewport and event/null; animations and supersession require one terminal observation. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onmovestart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onmovestart` | caller-input → caller-input. host-local-callback. Pan/zoom start receives current viewport plus user native event, or null for programmatic movement. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodeclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodeclick` | caller-input → caller-input. host-local-callback. Deliver actual click on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodecontextmenu`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodecontextmenu` | caller-input → caller-input. host-local-callback. Deliver actual contextmenu on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodedoubleclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodedoubleclick` | caller-input → caller-input. host-local-callback. Deliver actual doubleclick on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodedrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodedrag` | caller-input → caller-input. host-local-callback. Deliver current grabbed node and complete dragged-node array for actual progress, retaining per-node local coordinates. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodedragstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodedragstart` | caller-input → caller-input. host-local-callback. Cross drag threshold once before first node-drag change, with grabbed node and ordered dragged-node array. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodedragstop`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodedragstop` | caller-input → caller-input. host-local-callback. Finish once after progress or cancellation with final node(s); no accepted owner change on cancelled/rejected proposal. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodemouseenter`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodemouseenter` | caller-input → caller-input. host-local-callback. Deliver actual mouseenter on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodemouseleave`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodemouseleave` | caller-input → caller-input. host-local-callback. Deliver actual mouseleave on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onnodemousemove`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onnodemousemove` | caller-input → caller-input. host-local-callback. Deliver actual mousemove on the owning node only, with native event and its current detached node record. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpaneclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpaneclick` | caller-input → caller-input. host-local-callback. Deliver actual click on the owning pane only, with native event and no invented node/edge argument. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpanecontextmenu`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpanecontextmenu` | caller-input → caller-input. host-local-callback. Deliver actual contextmenu on the owning pane only, with native event and no invented node/edge argument. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpanemouseenter`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpanemouseenter` | caller-input → caller-input. host-local-callback. Deliver actual mouseenter on the owning pane only, with native event and no invented node/edge argument. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpanemouseleave`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpanemouseleave` | caller-input → caller-input. host-local-callback. Deliver actual mouseleave on the owning pane only, with native event and no invented node/edge argument. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpanemousemove`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpanemousemove` | caller-input → caller-input. host-local-callback. Deliver actual mousemove on the owning pane only, with native event and no invented node/edge argument. Nested content bubbling, click versus double-click order and enter/leave relatedTarget require pinned browser comparison. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onpanescroll`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onpanescroll` | caller-input → caller-input. host-local-callback. Pane scroll invokes with actual WheelEvent, including optional undefined programmatic branch only if pinned path provides it. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onreconnect`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onreconnect` | caller-input → caller-input. host-local-callback. Receive oldEdge and newConnection even when a valid reconnection returns the same endpoints; controlled proposal remains unaccepted. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onreconnectend`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onreconnectend` | caller-input → caller-input. host-local-callback. Release/cancel terminates once even without edge change, with original edge, endpoint kind and FinalConnectionState. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onreconnectstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onreconnectstart` | caller-input → caller-input. host-local-callback. Start on the actual source/target reconnect control, carrying original edge, endpoint kind and native event. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectionchange`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectionchange` | caller-input → caller-input. host-local-callback. Emit exact selected node/edge arrays after selection changes; empty deselection is significant; controlled acknowledgment timing needs reference capture. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectioncontextmenu`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectioncontextmenu` | caller-input → caller-input. host-local-callback. Context menu on selection carries native event and current selected-node array without a fabricated graph mutation. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectiondrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectiondrag` | caller-input → caller-input. host-local-callback. Selection drag progress carries the complete ordered selected-node array and native event; no unselected items. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectiondragstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectiondragstart` | caller-input → caller-input. host-local-callback. Dragging the existing selection starts once with selected nodes; rectangle creation start is a separate callback. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectiondragstop`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectiondragstop` | caller-input → caller-input. host-local-callback. Selection drag terminates once after success/cancel; distinguish accepted coordinates from cancelled proposal. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectionend`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectionend` | caller-input → caller-input. host-local-callback. Rectangle selection ends with terminal native event; observe selected nodes/edges independently of drag stop. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::onselectionstart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `onselectionstart` | caller-input → caller-input. host-local-callback. Rectangle selection begins with initiating native event; existing-selection drag has its own start callback. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |

### `react-flow::071::panactivationkeycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `panactivationkeycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `react-flow::071::panondrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `panondrag` | caller-input → caller-input. host-serializable-option. True allows drag pan, false disables mouse and touch pan, button arrays restrict mouse buttons while retaining reference touch pan. Selection activation and excluded descendants remain separate. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; []; [0]; [1,2]; mouse versus touch; modifier selection; live replacement |

### `react-flow::071::panonscroll`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `panonscroll` | caller-input → caller-input. host-serializable-option. Apply exactly the wheel/pinch/double-click behavior named by this member; preserve cursor anchor and viewport limits. Wheel pan and zoom precedence plus activation keys require composed assertions. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; wheel; ctrl-wheel pinch; double-click; axis modifier; live replacement; cancel/dispose |

### `react-flow::071::panonscrollmode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `panonscrollmode` | caller-input → caller-input. host-serializable-option. Free pans both axes, horizontal only x and vertical only y. Compare wheel normalization and noWheel exclusions. Assert this exact member through its named consuming operation and role. | absent; own undefined; free; horizontal; vertical; zero dx/dy; unknown literal rejection; live replacement |

### `react-flow::071::panonscrollspeed`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `panonscrollspeed` | caller-input → caller-input. host-serializable-option. Scale actual wheel pan displacement, independently of zoom and auto-pan speed. Reference zero produces zero pan; current Vanilla positive schema is an explicit gap until reviewed. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; 0.5; nondefault positive; negative/nonfinite capture/rejection; live replacement |

### `react-flow::071::props`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `props` | caller-input → caller-input. host-local-root-attributes. Root props type excludes onError. Pinned root spreads rest before owned onScroll/style/className/id/role: root role/application, composed class, wrapper geometry style and onScroll reset/caller callback take their explicit later precedence. Other allowed local event props follow their own slot. ARIA/data false retain textual false; actual allowed boolean HTML properties false unset. Native functions stay outside graph/checkpoint serialization. Assert this exact member through its named consuming operation and role. | rest role/style/class/id/onScroll conflict; caller scroll after wrapper reset; local allowed event; aria/data false text; actual boolean false unset; zero text; absent/ownundefined/rest-bag replacement; onError exclusion; two owners |

### `react-flow::071::reconnectradius`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `reconnectradius` | caller-input → caller-input. host-serializable-option. Set hit/control radius around source/target edge reconnect endpoints. Compare pointer activation just inside/on/outside radius, actual measured handle centers and both endpoint directions. Reconnect radius is independent of connectionRadius and nodeDragThreshold. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; 10; custom radius; just inside; exact boundary; just outside; endpoint side replacement; cancel/dispose |

### `react-flow::071::selectionkeycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectionkeycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `react-flow::071::selectionmode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectionmode` | caller-input → caller-input. host-serializable-option. Full mode requires the whole node bounds within the selection rectangle; partial mode accepts intersection. Use measured origin-adjusted bounds and edges separately. Assert this exact member through its named consuming operation and role. | absent; own undefined; full; partial; boundary touch; nested node; zero-size rectangle; owner replace |

### `react-flow::071::selectionondrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectionondrag` | caller-input → caller-input. host-serializable-option. For selectionOnDrag enable unmodified rectangle selection; for selectNodesOnDrag select the grabbed node at promotion. Preserve explicit false and modifier/multi-selection behavior. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; unmodified input; selection key; unselected/selected node; controlled reject; cancel |

### `react-flow::071::selectnodesondrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectnodesondrag` | caller-input → caller-input. host-serializable-option. For selectionOnDrag enable unmodified rectangle selection; for selectNodesOnDrag select the grabbed node at promotion. Preserve explicit false and modifier/multi-selection behavior. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; unmodified input; selection key; unselected/selected node; controlled reject; cancel |

### `react-flow::071::snapgrid`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `snapgrid` | caller-input → caller-input. host-serializable-option. snapToGrid controls snapping independently of snapGrid. Tuple [xStep,yStep] snaps distinct coordinates through viewport zoom and parent/origin geometry. Zero grid entry follows reviewed validation/reference behavior; do not silently use fallback. Assert this exact member through its named consuming operation and role. | absent; own undefined; false/true for enable; [15,15]; [8,20]; tuple entry 0; negative/nonfinite rejection; zoom; live replace |

### `react-flow::071::snaptogrid`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `snaptogrid` | caller-input → caller-input. host-serializable-option. snapToGrid controls snapping independently of snapGrid. Tuple [xStep,yStep] snaps distinct coordinates through viewport zoom and parent/origin geometry. Zero grid entry follows reviewed validation/reference behavior; do not silently use fallback. Assert this exact member through its named consuming operation and role. | absent; own undefined; false/true for enable; [15,15]; [8,20]; tuple entry 0; negative/nonfinite rejection; zoom; live replace |

### `react-flow::071::translateextent`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `translateextent` | caller-input → caller-input. host-serializable-option. Constrain viewport translation with pane size and zoom. Reference infinite extent is implicit native absence, never encoded nonfinite JSON. Keep nodeExtent distinct. Assert this exact member through its named consuming operation and role. | absent; own undefined; unbounded; [[0,0],[200,100]]; zero boundary; zoom and resize; live replace; invalid record |

### `react-flow::071::zoomactivationkeycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zoomactivationkeycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `react-flow::071::zoomondoubleclick`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zoomondoubleclick` | caller-input → caller-input. host-serializable-option. Apply exactly the wheel/pinch/double-click behavior named by this member; preserve cursor anchor and viewport limits. Wheel pan and zoom precedence plus activation keys require composed assertions. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; wheel; ctrl-wheel pinch; double-click; axis modifier; live replacement; cancel/dispose |

### `react-flow::071::zoomonpinch`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zoomonpinch` | caller-input → caller-input. host-serializable-option. Apply exactly the wheel/pinch/double-click behavior named by this member; preserve cursor anchor and viewport limits. Wheel pan and zoom precedence plus activation keys require composed assertions. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; wheel; ctrl-wheel pinch; double-click; axis modifier; live replacement; cancel/dispose |

### `react-flow::071::zoomonscroll`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zoomonscroll` | caller-input → caller-input. host-serializable-option. Apply exactly the wheel/pinch/double-click behavior named by this member; preserve cursor anchor and viewport limits. Wheel pan and zoom precedence plus activation keys require composed assertions. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; wheel; ctrl-wheel pinch; double-click; axis modifier; live replacement; cancel/dispose |

### `hooks/use-key-press::071::keycode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `keycode` | caller-input → caller-input. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `hooks/use-key-press::071::optionsactinsideinputwithmodifier`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `optionsactinsideinputwithmodifier` | caller-input → caller-input. host-native-key-option. When true a configured modifier chord may activate inside input/select/textarea/contenteditable; false suppresses it. Plain input typing remains unaffected. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; plain key in input; modifier chord; shadow-root input; blur/reset |

### `hooks/use-key-press::071::optionspreventdefault`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `optionspreventdefault` | caller-input → caller-input. host-native-key-option. Observe actual event.defaultPrevented on matched key, modifier and button/link cases without preventing unrelated typing. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; matched/unmatched key; button/link; input |

### `hooks/use-key-press::071::optionstarget`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `optionstarget` | caller-input → caller-input. host-native-key-option. Attach listeners to the supplied Window/Document/HTMLElement/ShadowRoot target; detach on disposal/replacement. Current observer and pinned useKeyPress.ts:112 use nullish default document for explicit null. Record that source-level agreement, then compare actual listeners before closure. Assert this exact member through its named consuming operation and role. | absent; own undefined; Window; Document; HTMLElement; ShadowRoot; null; replacement; detached element; two owners |

### `hooks/use-key-press::071::useKeyPress`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `useKeyPress` | caller-input → caller-input. host-native-key-observer. Use the real owner-scoped public key observer/composable to expose false initially, true on matched down and false on release/blur/contextmenu. Target and options updates use genuine public lifecycle; creation of a fresh observer is distinct from a mounted input update. Assert this exact member through its named consuming operation and role. | absent/null key; own undefined; key string; chord; alternatives; matched down/up; blur; target replacement; dispose; two owners |

### `types/edge-mouse-handler::071::edge`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `edge` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/edge-mouse-handler::071::EdgeMouseHandler`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `EdgeMouseHandler` | type-only-declaration → type-only-declaration. declaration-contract. Validate exact EdgeMouseHandler description through the actual consuming public operation and an exported branch-specific type probe. Assert this exact member through its named consuming operation and role. | permitted exact branch; required leaf; optional omission; generic/union/tuple alternatives |
| `EdgeMouseHandler#1.arg:edge` | callback-output → callback-output. callback-decoded-value-owner-069. Actual edge-mouse-handler callback output, argument edge, exact descendant EdgeMouseHandler#1.arg:edge: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type EdgeType; edge: EdgeType | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `EdgeMouseHandler#1.arg:event` | callback-output → callback-output. host-local-event. Actual edge-mouse-handler callback output, argument event, exact descendant EdgeMouseHandler#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type ReactMouseEvent; event: ReactMouseEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `EdgeMouseHandler#1.arg:event.<type:ReactMouseEvent>` | callback-output → callback-output. host-local-event. Actual edge-mouse-handler callback output, argument event, exact descendant EdgeMouseHandler#1.arg:event.<type:ReactMouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `EdgeMouseHandler#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/edge-mouse-handler::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/key-code::071::KeyCode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `KeyCode` | type-only-declaration → type-only-declaration. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Assert this exact member through its named consuming operation and role. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |
| `KeyCode#1.<union:1>` | type-only-declaration → type-only-declaration. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |
| `KeyCode#1.<union:2>` | type-only-declaration → type-only-declaration. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. Exercise exact union alternative union-variant; type Array<string>. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |
| `KeyCode#1.<union:2>.<type:Array>` | type-only-declaration → type-only-declaration. host-native-key-option. Support literal keys, + chords, arrays of alternatives, and null disabling where the public option permits it. Platform modifier defaults are captured separately. Keep target/listeners owner-local. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | absent/default when optional; own undefined; null disable when allowed; string; + chord; two alternatives; repeat; input/contenteditable; shadow DOM; blur; live target replace |

### `types/node-mouse-handler::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/node-mouse-handler::071::node`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `node` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/node-mouse-handler::071::NodeMouseHandler`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `NodeMouseHandler` | type-only-declaration → type-only-declaration. declaration-contract. Validate exact NodeMouseHandler description through the actual consuming public operation and an exported branch-specific type probe. Assert this exact member through its named consuming operation and role. | permitted exact branch; required leaf; optional omission; generic/union/tuple alternatives |
| `NodeMouseHandler#1.arg:event` | callback-output → callback-output. host-local-event. Actual node-mouse-handler callback output, argument event, exact descendant NodeMouseHandler#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type ReactMouseEvent; event: ReactMouseEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `NodeMouseHandler#1.arg:event.<type:ReactMouseEvent>` | callback-output → callback-output. host-local-event. Actual node-mouse-handler callback output, argument event, exact descendant NodeMouseHandler#1.arg:event.<type:ReactMouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `NodeMouseHandler#1.arg:node` | callback-output → callback-output. callback-decoded-value-owner-069. Actual node-mouse-handler callback output, argument node, exact descendant NodeMouseHandler#1.arg:node: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType; node: NodeType | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `NodeMouseHandler#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-connect::071::connection`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `connection` | callback-output → callback-output. callback-serializable-value. Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Assert this exact member through its named consuming operation and role. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |

### `types/on-connect::071::OnConnect`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnConnect` | type-only-declaration → type-only-declaration. host-local-callback. Valid completed candidate invokes once with source/target and nullable handle IDs; reference onConnect itself does not accept an edge. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnConnect#1.arg:connection` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type Connection; connection: Connection | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.source` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.source: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string; source: string; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.sourceHandle` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.sourceHandle: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; sourceHandle: string \| null; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.sourceHandle.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.sourceHandle.<union:1>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.sourceHandle.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.sourceHandle.<union:2>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.target` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.target: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string; target: string; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.targetHandle` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.targetHandle: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; targetHandle: string \| null; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.targetHandle.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.targetHandle.<union:1>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.arg:connection.<type:Connection>.targetHandle.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect callback output, argument connection, exact descendant OnConnect#1.arg:connection.<type:Connection>.targetHandle.<union:2>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnConnect#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-connect-end::071::connectionstate`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `connectionstate` | callback-output → callback-output. callback-serializable-value-owner-067. Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Assert this exact member through its named consuming operation and role. | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |

### `types/on-connect-end::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/on-connect-end::071::OnConnectEnd`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnConnectEnd` | type-only-declaration → type-only-declaration. host-local-callback. Every promoted attempt ends once, including invalid/no-target/validator false/cancel, carrying FinalConnectionState. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnConnectEnd#1.arg:connectionState` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-end callback output, argument connectionState, exact descendant OnConnectEnd#1.arg:connectionState: Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type FinalConnectionState<InternalNodeBase<NodeType>>; connectionState: FinalConnectionState<InternalNodeBase<NodeType>> | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |
| `OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-end callback output, argument connectionState, exact descendant OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>: Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |
| `OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-end callback output, argument connectionState, exact descendant OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:1>: Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type (Omit<ConnectionInProgress<NodeType>, 'inProgress' \| 'toPosition'> & { toPosition: Position \| null }). A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |
| `OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-end callback output, argument connectionState, exact descendant OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:2>: Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type Omit<NoConnection, 'inProgress'>. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |
| `OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:2>.<type:Omit>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-end callback output, argument connectionState, exact descendant OnConnectEnd#1.arg:connectionState.<type:FinalConnectionState>.<union:2>.<type:Omit>: Expose FinalConnectionState after completion whether valid, invalid or cancelled, distinguishing null/valid branch and Omit shape. Preserve start handle/node, resolved endpoint and validity; do not report accepted edge before acknowledgment. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Honor this exact Omit key set, not a broader exclusion. | valid; invalid target; null union branch; validator false; Escape; pointercancel; outside canvas; source/target reconnect |
| `OnConnectEnd#1.arg:event` | callback-output → callback-output. host-local-event. Actual on-connect-end callback output, argument event, exact descendant OnConnectEnd#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type MouseEvent \| TouchEvent; event: MouseEvent \| TouchEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectEnd#1.arg:event.<union:1>` | callback-output → callback-output. host-local-event. Actual on-connect-end callback output, argument event, exact descendant OnConnectEnd#1.arg:event.<union:1>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type MouseEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectEnd#1.arg:event.<union:1>.<type:MouseEvent>` | callback-output → callback-output. host-local-event. Actual on-connect-end callback output, argument event, exact descendant OnConnectEnd#1.arg:event.<union:1>.<type:MouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectEnd#1.arg:event.<union:2>` | callback-output → callback-output. host-local-event. Actual on-connect-end callback output, argument event, exact descendant OnConnectEnd#1.arg:event.<union:2>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type TouchEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectEnd#1.arg:event.<union:2>.<type:TouchEvent>` | callback-output → callback-output. host-local-event. Actual on-connect-end callback output, argument event, exact descendant OnConnectEnd#1.arg:event.<union:2>.<type:TouchEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectEnd#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-connect-start::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/on-connect-start::071::OnConnectStart`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnConnectStart` | type-only-declaration → type-only-declaration. host-local-callback. Start only after connection promotion; receive initiating native event plus nullable node/handle/kind, once per attempt. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnConnectStart#1.arg:event` | callback-output → callback-output. host-local-event. Actual on-connect-start callback output, argument event, exact descendant OnConnectStart#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type MouseEvent \| TouchEvent; event: MouseEvent \| TouchEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectStart#1.arg:event.<union:1>` | callback-output → callback-output. host-local-event. Actual on-connect-start callback output, argument event, exact descendant OnConnectStart#1.arg:event.<union:1>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type MouseEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectStart#1.arg:event.<union:1>.<type:MouseEvent>` | callback-output → callback-output. host-local-event. Actual on-connect-start callback output, argument event, exact descendant OnConnectStart#1.arg:event.<union:1>.<type:MouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectStart#1.arg:event.<union:2>` | callback-output → callback-output. host-local-event. Actual on-connect-start callback output, argument event, exact descendant OnConnectStart#1.arg:event.<union:2>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type TouchEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectStart#1.arg:event.<union:2>.<type:TouchEvent>` | callback-output → callback-output. host-local-event. Actual on-connect-start callback output, argument event, exact descendant OnConnectStart#1.arg:event.<union:2>.<type:TouchEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnConnectStart#1.arg:params` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type OnConnectStartParams; params: OnConnectStartParams | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; handleId: string \| null; | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId.<union:1>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleId.<union:2>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type HandleType \| null; handleType: HandleType \| null; | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type HandleType. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>.<union:1>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type 'source'. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:1>.<type:HandleType>.<union:2>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type 'target'. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.handleType.<union:2>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; nodeId: string \| null; | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId.<union:1>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-connect-start callback output, argument params, exact descendant OnConnectStart#1.arg:params.<type:OnConnectStartParams>.nodeId.<union:2>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnConnectStart#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-connect-start::071::params`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `params` | callback-output → callback-output. callback-serializable-value. OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Assert this exact member through its named consuming operation and role. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |

### `types/on-move::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/on-move::071::OnMove`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnMove` | type-only-declaration → type-only-declaration. host-local-callback. Pan/zoom progress receives x/y/zoom and native event or programmatic null; keep accepted/proposed boundary explicit. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnMove#1.arg:event` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type MouseEvent \| TouchEvent \| null; event: MouseEvent \| TouchEvent \| null | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:event.<union:1>` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event.<union:1>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type MouseEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:event.<union:1>.<type:MouseEvent>` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event.<union:1>.<type:MouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:event.<union:2>` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event.<union:2>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type TouchEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:event.<union:2>.<type:TouchEvent>` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event.<union:2>.<type:TouchEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:event.<union:3>` | callback-output → callback-output. host-local-event. Actual on-move callback output, argument event, exact descendant OnMove#1.arg:event.<union:3>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnMove#1.arg:viewport` | callback-output → callback-output. callback-output-value. Actual on-move callback output, argument viewport, exact descendant OnMove#1.arg:viewport: Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type Viewport; viewport: Viewport | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |
| `OnMove#1.arg:viewport.<type:Viewport>` | callback-output → callback-output. callback-output-value. Actual on-move callback output, argument viewport, exact descendant OnMove#1.arg:viewport.<type:Viewport>: Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |
| `OnMove#1.arg:viewport.<type:Viewport>.x` | callback-output → callback-output. callback-output-value. Actual on-move callback output, argument viewport, exact descendant OnMove#1.arg:viewport.<type:Viewport>.x: Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type number; x: number; | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |
| `OnMove#1.arg:viewport.<type:Viewport>.y` | callback-output → callback-output. callback-output-value. Actual on-move callback output, argument viewport, exact descendant OnMove#1.arg:viewport.<type:Viewport>.y: Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type number; y: number; | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |
| `OnMove#1.arg:viewport.<type:Viewport>.zoom` | callback-output → callback-output. callback-output-value. Actual on-move callback output, argument viewport, exact descendant OnMove#1.arg:viewport.<type:Viewport>.zoom: Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type number; zoom: number; | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |
| `OnMove#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-move::071::viewport`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `viewport` | callback-output → callback-output. callback-serializable-value. Expose exact x/y/zoom for start/change/end from user or programmatic movement; all zeros retained and end status separate from accepted owner state. Assert this exact member through its named consuming operation and role. | x:0,y:0; nonzero; zoom; programmatic null event; controlled rejection; animation supersession; disposal |

### `types/on-node-drag::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/on-node-drag::071::node`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `node` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/on-node-drag::071::nodes`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodes` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/on-node-drag::071::OnNodeDrag`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnNodeDrag` | type-only-declaration → type-only-declaration. host-local-callback. Deliver current grabbed node and complete dragged-node array for actual progress, retaining per-node local coordinates. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnNodeDrag#1.arg:event` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type MouseEvent \| TouchEvent; event: MouseEvent \| TouchEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#1.arg:event.<union:1>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#1.arg:event.<union:1>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type MouseEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#1.arg:event.<union:1>.<type:MouseEvent>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#1.arg:event.<union:1>.<type:MouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#1.arg:event.<union:2>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#1.arg:event.<union:2>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type TouchEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#1.arg:event.<union:2>.<type:TouchEvent>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#1.arg:event.<union:2>.<type:TouchEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#1.arg:node` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument node, exact descendant OnNodeDrag#1.arg:node: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType; node: NodeType | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#1.arg:nodes` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument nodes, exact descendant OnNodeDrag#1.arg:nodes: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType[]; nodes: NodeType[] | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#1.arg:nodes.<array-element>` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument nodes, exact descendant OnNodeDrag#1.arg:nodes.<array-element>: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Each array element preserves the codec-derived NodeType/EdgeType and detached identity; negative probe uses incompatible subtype, not JSON coercion. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |
| `OnNodeDrag#2.arg:e` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#2.arg:e: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type MouseEvent \| TouchEvent; e: MouseEvent \| TouchEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#2.arg:e.<union:1>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#2.arg:e.<union:1>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type MouseEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#2.arg:e.<union:1>.<type:MouseEvent>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#2.arg:e.<union:1>.<type:MouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#2.arg:e.<union:2>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#2.arg:e.<union:2>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type TouchEvent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#2.arg:e.<union:2>.<type:TouchEvent>` | callback-output → callback-output. host-local-event. Actual on-node-drag callback output, argument event, exact descendant OnNodeDrag#2.arg:e.<union:2>.<type:TouchEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `OnNodeDrag#2.arg:node` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument node, exact descendant OnNodeDrag#2.arg:node: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType; node: NodeType | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#2.arg:nodes` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument nodes, exact descendant OnNodeDrag#2.arg:nodes: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType[]; nodes: NodeType[] | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#2.arg:nodes.<array-element>` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-node-drag callback output, argument nodes, exact descendant OnNodeDrag#2.arg:nodes.<array-element>: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Each array element preserves the codec-derived NodeType/EdgeType and detached identity; negative probe uses incompatible subtype, not JSON coercion. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnNodeDrag#2.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-reconnect::071::newconnection`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `newconnection` | callback-output → callback-output. callback-serializable-value. Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Assert this exact member through its named consuming operation and role. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |

### `types/on-reconnect::071::oldedge`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `oldedge` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/on-reconnect::071::OnReconnect`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnReconnect` | type-only-declaration → type-only-declaration. host-local-callback. Receive oldEdge and newConnection even when a valid reconnection returns the same endpoints; controlled proposal remains unaccepted. Assert this exact member through its named consuming operation and role. | omitted handler; own undefined removes handler; registered handler; replacement; throwing handler; native event; accepted/proposed value; cancellation; owner disposal; same-ID independent mount |
| `OnReconnect#1.arg:newConnection` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type Connection; newConnection: Connection | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.source` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.source: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string; source: string; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; sourceHandle: string \| null; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle.<union:1>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.sourceHandle.<union:2>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.target` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.target: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string; target: string; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type string \| null; targetHandle: string \| null; | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle.<union:1>` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle.<union:1>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle.<union:2>` | callback-output → callback-output. callback-output-connection-value. Actual on-reconnect callback output, argument newConnection, exact descendant OnReconnect#1.arg:newConnection.<type:Connection>.targetHandle.<union:2>: Callback provides exact source/target/sourceHandle/targetHandle candidate; nullable handles are retained in reference comparison. No edge ID is fabricated and controlled proposal is not accepted state. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | complete named handles; null handles; unchanged connection; rejected validator; controlled accept/reject; detached callback mutation |
| `OnReconnect#1.arg:oldEdge` | callback-output → callback-output. callback-decoded-value-owner-069. Actual on-reconnect callback output, argument oldEdge, exact descendant OnReconnect#1.arg:oldEdge: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type EdgeType; oldEdge: EdgeType | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `OnReconnect#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-selection-change-func::071::OnSelectionChangeFunc`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `OnSelectionChangeFunc` | type-only-declaration → type-only-declaration. declaration-contract. Validate exact OnSelectionChangeFunc description through the actual consuming public operation and an exported branch-specific type probe. Assert this exact member through its named consuming operation and role. | permitted exact branch; required leaf; optional omission; generic/union/tuple alternatives |
| `OnSelectionChangeFunc#1.arg:params` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type OnSelectionChangeParams<NodeType, EdgeType>; params: OnSelectionChangeParams<NodeType, EdgeType> | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.edges` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.edges: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type EdgeType[]; edges: EdgeType[]; | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.edges.<array-element>` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.edges.<array-element>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Each array element preserves the codec-derived NodeType/EdgeType and detached identity; negative probe uses incompatible subtype, not JSON coercion. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.nodes` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.nodes: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: field; required; type NodeType[]; nodes: NodeType[]; | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.nodes.<array-element>` | callback-output → callback-output. callback-output-value. Actual on-selection-change-func callback output, argument params, exact descendant OnSelectionChangeFunc#1.arg:params.<type:OnSelectionChangeParams>.nodes.<array-element>: OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Each array element preserves the codec-derived NodeType/EdgeType and detached identity; negative probe uses incompatible subtype, not JSON coercion. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |
| `OnSelectionChangeFunc#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/on-selection-change-func::071::params`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `params` | callback-output → callback-output. callback-serializable-value. OnConnectStart params carries nullable nodeId/handleId/handleType; OnSelectionChange params carries exact selected nodes/edges. The page determines shape; never merge these two types. Assert this exact member through its named consuming operation and role. | named identity; null identity where declared; source/target kind; empty selected arrays; mixed selected arrays; cancellation; two owners |

### `types/pan-on-scroll-mode::071::PanOnScrollMode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `PanOnScrollMode` | type-only-declaration → type-only-declaration. host-serializable-option. Free pans both axes, horizontal only x and vertical only y. Compare wheel normalization and noWheel exclusions. Assert this exact member through its named consuming operation and role. | absent; own undefined; free; horizontal; vertical; zero dx/dy; unknown literal rejection; live replacement |

### `types/selection-drag-handler::071::event`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `event` | callback-output → callback-output. host-local-event. Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |

### `types/selection-drag-handler::071::nodes`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodes` | callback-output → callback-output. callback-graph-value-owner-069. Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Assert this exact member through its named consuming operation and role. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |

### `types/selection-drag-handler::071::SelectionDragHandler`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `SelectionDragHandler` | type-only-declaration → type-only-declaration. declaration-contract. Validate exact SelectionDragHandler description through the actual consuming public operation and an exported branch-specific type probe. Assert this exact member through its named consuming operation and role. | permitted exact branch; required leaf; optional omission; generic/union/tuple alternatives |
| `SelectionDragHandler#1.arg:event` | callback-output → callback-output. host-local-event. Actual selection-drag-handler callback output, argument event, exact descendant SelectionDragHandler#1.arg:event: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Exact declared leaf constraint: parameter; required; type ReactMouseEvent; event: ReactMouseEvent | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `SelectionDragHandler#1.arg:event.<type:ReactMouseEvent>` | callback-output → callback-output. host-local-event. Actual selection-drag-handler callback output, argument event, exact descendant SelectionDragHandler#1.arg:event.<type:ReactMouseEvent>: Use actual native MouseEvent/TouchEvent/Keyboard/Wheel where declared, programmatic move null, and pane-scroll optional undefined. React synthetic event differences require explicit native rationale and exact browser assertions; DOM events never enter Foldkit Schema ports. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Assert this exact member through its named consuming operation and role. | native mouse; native touch; null only where declared; undefined only where declared; target/currentTarget; button/modifiers; preventDefault; cancellation |
| `SelectionDragHandler#1.arg:nodes` | callback-output → callback-output. callback-decoded-value-owner-069. Actual selection-drag-handler callback output, argument nodes, exact descendant SelectionDragHandler#1.arg:nodes: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Exact declared leaf constraint: parameter; required; type NodeType[]; nodes: NodeType[] | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `SelectionDragHandler#1.arg:nodes.<array-element>` | callback-output → callback-output. callback-decoded-value-owner-069. Actual selection-drag-handler callback output, argument nodes, exact descendant SelectionDragHandler#1.arg:nodes.<array-element>: Preserve the exact node/edge subtype in the member-named callback argument. Single item differs from nodes/edges arrays and each array element needs a positive/negative typed probe. Expose detached accepted/proposed values per event phase without owner authority. Leaf identity/coordinate/nullability is observed in this callback, never satisfied by a document option/field test. Preserve arbitrary codec-decoded subtype data with its supplied isolation capability. Do not assume JSON serializability or erase class/service/type channels; actual 069 host propagation determines permitted transport. Each array element preserves the codec-derived NodeType/EdgeType and detached identity; negative probe uses incompatible subtype, not JSON coercion. | single item; empty/nonempty array when declared; correct identity; typed subtype; mutation isolation; cancelled gesture; controlled acknowledgment; two owners |
| `SelectionDragHandler#1.result` | return-contract → return-contract. callback-return-contract. Callback completes with void/undefined as declared. No missing-input rejection exists for a void result. Arbitrary ignored callback return values must not become acceptance/rejection signals; throws use the native error boundary. Void result is ordinary undefined completion, not a malformed required input. | ordinary undefined completion; callback with ignored return; throw observable; no graph authority from return |

### `types/selection-mode::071::SelectionMode`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `SelectionMode` | type-only-declaration → type-only-declaration. host-serializable-option. Full mode requires the whole node bounds within the selection rectangle; partial mode accepts intersection. Use measured origin-adjusted bounds and edges separately. Assert this exact member through its named consuming operation and role. | absent; own undefined; full; partial; boundary touch; nested node; zero-size rectangle; owner replace |

### `types/snap-grid::071::SnapGrid`

Original owner 071; required plans none. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `SnapGrid` | type-only-declaration → type-only-declaration. host-serializable-option. snapToGrid controls snapping independently of snapGrid. Tuple [xStep,yStep] snaps distinct coordinates through viewport zoom and parent/origin geometry. Zero grid entry follows reviewed validation/reference behavior; do not silently use fallback. Assert this exact member through its named consuming operation and role. | absent; own undefined; false/true for enable; [15,15]; [8,20]; tuple entry 0; negative/nonfinite rejection; zoom; live replace |
| `SnapGrid#1.tuple[0]` | type-only-declaration → type-only-declaration. host-serializable-option. snapToGrid controls snapping independently of snapGrid. Tuple [xStep,yStep] snaps distinct coordinates through viewport zoom and parent/origin geometry. Zero grid entry follows reviewed validation/reference behavior; do not silently use fallback. Full tuple path [0] is x grid spacing. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; false/true for enable; [15,15]; [8,20]; tuple entry 0; negative/nonfinite rejection; zoom; live replace |
| `SnapGrid#1.tuple[1]` | type-only-declaration → type-only-declaration. host-serializable-option. snapToGrid controls snapping independently of snapGrid. Tuple [xStep,yStep] snaps distinct coordinates through viewport zoom and parent/origin geometry. Zero grid entry follows reviewed validation/reference behavior; do not silently use fallback. Full tuple path [1] is y grid spacing. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; false/true for enable; [15,15]; [8,20]; tuple entry 0; negative/nonfinite rejection; zoom; live replace |

## Separate reference observations and native difference candidates

These source-indicated differences are unapproved candidates. The native outcome never substitutes for a pinned observation. Actual paired tests remain unrun.

| Exact representative member | Pinned source observation | Proposed native outcome and test boundary |
| --- | --- | --- |
| `optionsactinsideinputwithmodifier` | Pinned effect captures options but depends on keyCode/setKeyPressed only; target-only/options-only updates do not reattach until keyCode changes. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:100`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:163` | Propose reliable owner-local observer replacement through an explicit native lifecycle/API. Current new-observer creation is not mounted options-update proof. Reason: Reliable native option replacement without stale listeners, preserve reference observation rather than imitate staleness. Boundary: Separate target-only, preventDefault-only, input-modifier-only and keyCode-change public scenarios; observe old/new target events, defaultPrevented and disposal in native/pinned hosts. |
| `optionspreventdefault` | Pinned effect captures options but depends on keyCode/setKeyPressed only; target-only/options-only updates do not reattach until keyCode changes. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:100`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:163` | Propose reliable owner-local observer replacement through an explicit native lifecycle/API. Current new-observer creation is not mounted options-update proof. Reason: Reliable native option replacement without stale listeners, preserve reference observation rather than imitate staleness. Boundary: Separate target-only, preventDefault-only, input-modifier-only and keyCode-change public scenarios; observe old/new target events, defaultPrevented and disposal in native/pinned hosts. |
| `optionstarget` | Pinned effect captures options but depends on keyCode/setKeyPressed only; target-only/options-only updates do not reattach until keyCode changes. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:100`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:163` | Propose reliable owner-local observer replacement through an explicit native lifecycle/API. Current new-observer creation is not mounted options-update proof. Reason: Reliable native option replacement without stale listeners, preserve reference observation rather than imitate staleness. Boundary: Separate target-only, preventDefault-only, input-modifier-only and keyCode-change public scenarios; observe old/new target events, defaultPrevented and disposal in native/pinned hosts. |
| `useKeyPress` | Pinned effect captures options but depends on keyCode/setKeyPressed only; target-only/options-only updates do not reattach until keyCode changes. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:100`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useKeyPress.ts:163` | Propose reliable owner-local observer replacement through an explicit native lifecycle/API. Current new-observer creation is not mounted options-update proof. Reason: Reliable native option replacement without stale listeners, preserve reference observation rather than imitate staleness. Boundary: Separate target-only, preventDefault-only, input-modifier-only and keyCode-change public scenarios; observe old/new target events, defaultPrevented and disposal in native/pinned hosts. |

Each JSON policy also includes the original role, proposed native role, presence, complete tuple path, exact union/intersection probe scope, consumingOperation and four separate cancellation baselines. Type-only lifecycle dimensions execute through that consuming operation. Controlled refusal, active preview cancel, supersession and disposal never imply one shared rollback or terminal-event behavior.

## Dependency-ordered bounded source proposals

These are proposed child boundaries. Primary review assigns final plan numbers and freezes exact input/allowlist/assertion records before dispatch. Source executors must not treat this list as blanket approval.

1. Separate numbered public live-option API prerequisite, effort M, risk HIGH. It has no assigned071 member allowance and grants no source execution. Primary must assign a distinct plan number and freeze its cross-owner API packet before dispatch. First review a serializable interaction-options command and host-local callback/style registry replacement API. Vanilla needs a public update method beyond document-only update; Foldkit needs a serializable options command plus local presentation callback path; Vue retains actual reactive props. Start with the verified missing connection mode/style live replacement, coordinated with 067/072/074; prove same-owner strict→loose→strict and style add→remove without remount. Proposed separate API file scope only `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`, `packages/vue/src/flow-canvas.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`, adjacent unit tests and the three existing `interaction-lifecycle.e2e.ts` suites. Do not expand into recipes or persisted state. A proposed native command name/shape requires review before source implementation.

2. Native input and option semantics, effort L, risk MED. Use exact rows for keys, thresholds, pan/zoom, class exclusions, grid, extents and visible culling. Scope original 071 option hosts plus their existing key-press observer files, `packages/core/src/domain/flow-node-extent.schema.ts`, relevant adjacent tests and NEW three `interaction-members.e2e.ts` suites with named public HTML/entry fixtures. Assert explicit false/zero and arrays/chords/null on actual DOM input; preserve reference defaults versus current-host difference until reviewed. Do not replace owner authority or reference scheduler.

3. Host-local event callbacks, effort L, risk HIGH. Add pane/node/edge mouse/context/scroll native event callbacks separately from serializable gesture notifications. Scope original 071 host files/barrels and NEW named interaction member tests/fixtures only. Assert currentTarget/target/button/modifier identity, start/progress/end order, handler replacement and throw behavior, callback cleanup and owner isolation. Foldkit local native event callbacks never serialize DOM events into its ports.

4. Generic and lifecycle reconciliation after 069 host integration, effort M, risk HIGH. Exact NodeType/EdgeType/array/FinalConnectionState rows consume accepted typed host APIs, not factory-only 087. Add positive/negative exported and installed probes in `scripts/check-packed-consumer.ts` and its existing fixtures; capture with NEW `scripts/capture-interaction-member-reference.ts`, `research/harnesses/interaction-member/`, `research/fixtures/interaction-member-reference.json`, `packages/conformance/src/interaction-member-reference.test.ts`. Reconcile only original 071 cells after actual per-ID review.

### Separate numbered API prerequisite

JSON `separateNumberedApiPrerequisite` is a non-executable cross-owner scope proposal. Its plan number and public command name are null, and primary must assign a separate numbered plan before source dispatch. It is not inferred from any071 member allowlist. The first proposed packet is exactly connectionMode plus host-local connectionLineStyle/connectionLineContainerStyle whole replacement; its local registry fields are exactly those two style bags. Other listed cross-owner option/callback/renderer fields are deferred to separately numbered packets.

Proposed whole replacement uses reviewed construction defaults for missing scalars and clears missing local style bags; own undefined follows exact decoder/presence policy. Validate the full replacement before resource mutation, then cancel the affected preview through its actual recorded operation/mode baseline and install options. Accepted prior progress is not rolled back. Host error/result/service channels and real public API name remain to be frozen in the numbered packet. Exact candidate source/test file proposals are enumerated in JSON, with same-owner identity, malformed atomicity, style clearing, disposal and independent-owner assertions. No approved command exists.

### Exact proposed file and member allowlists

JSON `boundedSourceChildren` enumerates each proposed file, flags genuinely NEW files, and lists every exact selected member key. These records supplement the ordered sketches above; no directory-wide/adjacent-file phrase grants source scope. Exact capture harness and installed consumer filenames are listed in JSON; final numbered source packets still freeze their API/probe/capture assertions before dispatch. Product, dependencies, lockfiles, gates, imported evidence, recipes and member-ledger changes stay outside this authoring task.

- `API-PREREQUISITE-UNNUMBERED`: 0 selected member records / 0 proposed host cells. Files: .
- `071-options-keys`: 45 selected member records / 135 proposed host cells. Files: `apps/foldkit/e2e/interaction-members.e2e.ts`, `apps/foldkit/interaction-members-test.html`, `apps/foldkit/src/interaction-members-test.ts`, `apps/vanilla/e2e/interaction-members.e2e.ts`, `apps/vanilla/interaction-members-test.html`, `apps/vanilla/src/interaction-members-test.ts`, `apps/vanilla/src/key-press-observer.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`, `apps/vue/e2e/interaction-members.e2e.ts`, `apps/vue/interaction-members-test.html`, `apps/vue/src/interaction-members-test.ts`, `packages/core/src/domain/flow-interactions.schema.test.ts`, `packages/core/src/domain/flow-node-extent.schema.test.ts`, `packages/core/src/domain/flow-node-extent.schema.ts`, `packages/foldkit/src/application.test.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.test.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/key-press-observer.ts`, `packages/foldkit/src/observers.ts`, `packages/foldkit/src/public.ts`, `packages/vue/src/flow-canvas.test.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/key-press-observer.ts`, `packages/vue/src/public.ts`, `packages/vue/src/use-flow.ts`.
- `071-local-callbacks`: 172 selected member records / 516 proposed host cells. Files: `apps/foldkit/e2e/interaction-members.e2e.ts`, `apps/foldkit/interaction-members-test.html`, `apps/foldkit/src/interaction-members-test.ts`, `apps/vanilla/e2e/interaction-members.e2e.ts`, `apps/vanilla/interaction-members-test.html`, `apps/vanilla/src/interaction-members-test.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`, `apps/vue/e2e/interaction-members.e2e.ts`, `apps/vue/interaction-members-test.html`, `apps/vue/src/interaction-members-test.ts`, `packages/foldkit/src/application.test.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.test.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`, `packages/vue/src/flow-canvas.test.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`.
- `071-reference-type-proof`: 217 selected member records / 651 proposed host cells. Files: `packages/conformance/src/interaction-member-reference.test.ts`, `research/fixtures/interaction-member-reference.json`, `research/harnesses/interaction-member/index.html`, `research/harnesses/interaction-member/main.tsx`, `research/harnesses/interaction-member/vite.config.ts`, `scripts/capture-interaction-member-reference.ts`, `scripts/check-packed-consumer.ts`, `tests/consumer/consumer.typecheck.ts`, `tests/consumer/foldkit/consumer.typecheck.ts`, `tests/consumer/foldkit/main.ts`, `tests/consumer/main.ts`, `tests/consumer/vue/consumer.typecheck.ts`, `tests/consumer/vue/main.ts`.

## Finding and acceptance boundary

- Evidence: document-only Vanilla update and construction-only Foldkit options, plus the verified native-creation test boundary, leave same-owner option replacement missing while Vue uses live props. Impact: remount cannot establish update semantics or preserve ongoing owner state. Effort M; fix risk HIGH because active gestures/listeners need atomic reconciliation. Confidence HIGH for the missing public path in the reviewed snapshots. Fix sketch: review a bounded public native replacement path, then prove live toggles and cleanup through the actual mounted host.

- Evidence: pinned Node/Edge/CSS/DOM/renderer declarations and current concrete Flow schemas/context show contracts wider than bounded existing fields. Impact: composite member cells cannot close from text labels, stroke subsets, count checkers or schema factory success. Effort L; risk HIGH for persistence and generic host channels. Confidence HIGH for declared gap, unverified for full reference behavior. Fix sketch: retain exact requirements, split native presentation from document/runtime ownership and require member-specific source/browser/type/reference tests.

Future execution gates are the relevant exact host suites, installed public probes and pinned captures, plus `bun run verify` with focused active-work scope set to those suites/checks. Expected exit 0 with no new skips; record profile and exact scope. `bun run verify:full` is required at integration/release and before broad parity claims. No install, build, test, browser or gate ran in this authoring task. Source review and independent cold review must precede dispatch; logs/counts are never semantic proof.

## Audit limitations

All assigned original member identities/descriptions/raw rows were mechanically read and preserved; selected source declarations/defaults/wrappers and public host paths were personally read. Not audited here: all upstream tests, every live browser branch, CI, native devices, collector delivery, or product semantics outside these families. Empty/missing/new target test files are proposals, not passed evidence. Current-site extraction text is dated drift information; joined-row defaults are not reconstructed. Current source paths and acceptance boundaries do not imply all original operations exist.

## Conformity and deviations

Conforming target: exact serializable value meaning, absence/undefined/false/zero distinctions, owner acknowledgment, order, cancellation, cleanup and native rendered output when pinned executable comparison proves them. Framework-native events/components, detached codec-decoded values, ancestor-hidden propagation, atomic graph integrity and reliable key-option replacement are intentional-difference candidates with separate source observations/native proposals, reasons and named paired/native test boundaries. None is approved as a closed cell. Construction-only Vanilla/Foldkit modes/styles are a current bounded native limitation; live replacement remains actionable and unverified, not a reason to close original cells. All rows stay unverified/OPEN until their exact production, compiler where applicable, pinned reference and independent review evidence is complete.
