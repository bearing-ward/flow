# Native Node and Edge field continuation

2026-10-02. Read-only design pending primary and independent cold review. Source execution is a later dispatch. Planned against main `841be137e253cf19c665269eaaa79edc19abf3c3`.

This document and `native-node-edge-field-continuation-matrix.json` retain every exact assigned record: 121 groups, 294 members, 882 host cells. Original group IDs, targets, catalog ownership, original descriptions/rawSourceRow, dependencies and cell decisions are copied unchanged. Every generated cell remains OPEN and unverified. No ledger or product files changed. First- and second-review packet bytes are preserved in deterministic `plans/callback-field-matrix-first-review-inputs.tar.gz` and `plans/callback-field-matrix-second-review-inputs.tar.gz`; both independent REVISE reviews remain unchanged.

Original dependency edges remain 126 at group level, 363 at member level, 1089 at host-cell level. `python3 plans/callback-field-matrix-design.py --check` recomputes exact identity sets, copies, dependencies, source hashes and outputs. It establishes accounting, never semantic acceptance.

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

Each JSON cell retains its original production test and capture target, and proposes the exact assertion identity `contractId::member::host`. A test must record its own production operation, exact expected payload/accepted state/DOM value and pinned comparison. NEW `scripts/capture-node-edge-field-reference.ts` and relevant per-host member suites may not exist yet; no command was run against invented files.

- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:11`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:90`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:114`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/nodes.ts:16`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:33`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:151`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/EdgeWrapper/index.tsx:40`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:56`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/BaseEdge.tsx:34`.
- Source comparison only: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/EdgeText.tsx:7`.

Capture through a verified full xyflow checkout at the pinned SHA, with two stable normalized samples and exact expected differences; imported source alone is not reference execution. New traces end with Conformity and deviations, keeping current production, test helper and pinned reference paths separate.

## Ownership and compatibility policy

Native event objects and caller callback functions stay local to Vanilla/Vue/Foldkit lifecycle. Foldkit Schema ports carry serializable semantic notifications; arbitrary codec-decoded graph subtype values require actual 069 host propagation and supplied isolation rather than an assumed JSON channel; native presentation/event callbacks are captured by an owner-local API and never encoded as DOM Events or functions. No model mirror or cross-owner DOM lookup is permitted.

Separate serializable document meaning from native CSS/class/DOM attributes and callback/component presentation. Full CSSProperties is wider than Flow stroke/strokeWidth. Arbitrary label content is wider than a document string. Runtime dragging/resizing/absolute geometry/measurements/internals stay derived and detached. Source/target sides and declared handles stay distinct from measured centers. Renderer registries require built-in/default/unknown/custom behavior and replacement cleanup.

Saved literal-v1 and versioned 070 remain backward compatible. Before adding animated/extent/expandParent/dragHandle/path-options or any persisted field, independently review the exact old/new encode/decode/rejection policy and fixture compatibility. This matrix does not select a new persisted format or authorize production schema edits. Native presentation records must not leak into persistence. Dependencies 063 SSR, 065 measurements, 067 origins/connections, 068 ARIA/global color and 069 typed integration remain exact original owners; accepted foundations do not close composites.

## Complete assigned member matrix

Generic parameter records are compiler-only. NodeData and EdgeData retain their exact Record<string, unknown> bound/default; their ten dimensions are linked to actual node.data/edge.data consuming operations, never standalone runtime properties. NodeBase data is required and EdgeBase data optional; arbitrary codec-decoded classes use supplied isolation and actual069 propagation, never forced JSON. Every nongeneric record/cell policy and child assignment is checked unchanged against the preserved second-review packet.

The JSON enumerates all ten required variant dimensions for every member × host: default, absent, own undefined, explicit false, explicit zero, live update, cancel, dispose, order and independent owner. Applicability is explicit. Explicit caller-input, callback-output, renderer-output, return-contract and type-only roles control each dimension. Optional omission remains positive; void completion is ordinary undefined; type-only lifecycle dimensions link to the consuming operation without fabricated standalone inputs. Each member below keeps its original text in JSON and adds a member-specific proposed observation.

### `react-flow::074::edgetypes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `edgetypes` | caller-input → caller-input. host-local-renderer-registry. Owner-scoped edge registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |

### `react-flow::074::nodetypes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `nodetypes` | caller-input → caller-input. host-local-renderer-registry. Owner-scoped node registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |

### `types/edge::074::animated`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `animated` | caller-input → caller-input. document-semantic-persistence-review. Drive visible SVG animation on the correct path; changing false removes animation while the hit path and accepted edge stay intact. Animation is presentation derived from a serializable flag. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; true-to-false; hidden; reduced-motion observation recorded separately |

### `types/edge::074::classname`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `classname` | caller-input → caller-input. native-presentation. Attach caller classes to the owning node HTML wrapper or edge SVG group; retain Flow-owned classes. Remove only prior caller classes on replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty string; two classes; replacement; removal; identical IDs in independent owners |

### `types/edge::074::deletable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletable` | caller-input → caller-input. document-semantic. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. Assert this exact member through its named consuming operation and role. | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |

### `types/edge::074::domattributes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `domattributes` | caller-input → caller-input. host-local-presentation-attributes. Apply edge SVG attributes after the built-in handlers. Edge permits local event handlers and exactly six excluded keys. Absent onClick key preserves built-in callback/selection; own onClick:undefined overrides built-in handler and suppresses it; a replacement function wins; deleting the key or replacing the bag with one lacking the key restores built-in behavior. Whole-bag replacement {} differs from retaining a bag containing an own undefined key. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. Assert this exact member through its named consuming operation and role. | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |

### `types/edge::074::Edge`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `Edge` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:1>.<type:EdgeBase>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:1>.<type:EdgeBase>.animated` | caller-input → caller-input. document-semantic-persistence-review. Drive visible SVG animation on the correct path; changing false removes animation while the hit path and accepted edge stay intact. Animation is presentation derived from a serializable flag. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; animated?: boolean; | absent; own undefined; true; false; true-to-false; hidden; reduced-motion observation recorded separately |
| `Edge#1.<intersection:1>.<type:EdgeBase>.deletable` | caller-input → caller-input. document-semantic. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; deletable?: boolean; | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |
| `Edge#1.<intersection:1>.<type:EdgeBase>.hidden` | caller-input → caller-input. document-semantic. Hide the owning node/edge and its interaction targets. Parent-hidden descendants and incident edges stay hidden; restore returns owner-scoped geometry and targets. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; hidden?: boolean; | absent; own undefined; false; true; hidden parent; hide while dragging; unhide; rejected controlled proposal |
| `Edge#1.<intersection:1>.<type:EdgeBase>.id` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Exact declared leaf constraint: field; required; type string; id: string; | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |
| `Edge#1.<intersection:1>.<type:EdgeBase>.interactionWidth` | caller-input → caller-input. document-semantic. Set the invisible edge hit path width independently of visible stroke width. Upstream BaseEdge omits the path for zero; current native positive schema rejects zero, so preserve that gap until a reviewed extension and test proves it. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; interactionWidth?: number; | absent; own undefined; 20; 0; positive narrow/wide; negative/nonfinite rejection; hidden; pointer hit outside visible stroke |
| `Edge#1.<intersection:1>.<type:EdgeBase>.selectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; selectable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Edge#1.<intersection:1>.<type:EdgeBase>.selected` | caller-input → caller-input. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; selected?: boolean; | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |
| `Edge#1.<intersection:1>.<type:EdgeBase>.source` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Exact declared leaf constraint: field; required; type string; source: string; | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |
| `Edge#1.<intersection:1>.<type:EdgeBase>.sourceHandle` | caller-input → caller-input. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string \| null; sourceHandle?: string \| null; | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.sourceHandle.<union:1>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.sourceHandle.<union:2>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.target` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Exact declared leaf constraint: field; required; type string; target: string; | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |
| `Edge#1.<intersection:1>.<type:EdgeBase>.targetHandle` | caller-input → caller-input. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string \| null; targetHandle?: string \| null; | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.targetHandle.<union:1>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.targetHandle.<union:2>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `Edge#1.<intersection:1>.<type:EdgeBase>.type` | caller-input → caller-input. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type EdgeType; type?: EdgeType; | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |
| `Edge#1.<intersection:1>.<type:EdgeBase>.zIndex` | caller-input → caller-input. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; zIndex?: number; | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |
| `Edge#1.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; empty object is a positive probe because every field is optional. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.label` | caller-input → caller-input. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type ReactNode; label?: ReactNode; | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.label.<type:ReactNode>` | type-only-declaration → type-only-declaration. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. Native content mapping needs paired interactive/falsy/zero/empty render proof; string-only support leaves full ReactNode OPEN. | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgBorderRadius` | caller-input → caller-input. native-presentation. Set actual label background rx/ry radius; retain explicit zero and clear stale attributes after replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; labelBgBorderRadius?: number; | absent; own undefined; 0; positive; update/remove; malformed failure |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgPadding` | caller-input → caller-input. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type [number, number]; labelBgPadding?: [number, number]; | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgPadding.tuple[0]` | caller-input → caller-input. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Full tuple path [0] is horizontal label padding. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgPadding.tuple[1]` | caller-input → caller-input. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Full tuple path [1] is vertical label padding. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgStyle` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; labelBgStyle?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelBgStyle.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelShowBg` | caller-input → caller-input. native-presentation. Toggle actual background rect around the edge label; false retains label content and hit controls. Inspect SVG geometry and computed style after update. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; labelShowBg?: boolean; | absent; own undefined; true; false; update/remove |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelStyle` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; labelStyle?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.<intersection:2>.<type:EdgeLabelOptions>.labelStyle.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.<intersection:3>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Edge declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; empty object is a positive probe because every field is optional. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Edge#1.<intersection:3>.className` | caller-input → caller-input. native-presentation. Attach caller classes to the owning node HTML wrapper or edge SVG group; retain Flow-owned classes. Remove only prior caller classes on replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string; className?: string; | absent; own undefined; empty string; two classes; replacement; removal; identical IDs in independent owners |
| `Edge#1.<intersection:3>.domAttributes` | caller-input → caller-input. host-local-presentation-attributes. Apply edge SVG attributes after the built-in handlers. Edge permits local event handlers and exactly six excluded keys. Absent onClick key preserves built-in callback/selection; own onClick:undefined overrides built-in handler and suppresses it; a replacement function wins; deleting the key or replacing the bag with one lacking the key restores built-in behavior. Whole-bag replacement {} differs from retaining a bag containing an own undefined key. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type Omit< SVGAttributes<SVGGElement>, 'id' \| 'style' \| 'className' \| 'role' \| 'aria-label' \| 'dangerouslySetInnerHTML' >; domAttributes?: Omit< SVGAttributes<SVGGElement>, 'id' \| 'style' \| 'className' \| 'role' \| 'aria-label' \| 'dangerouslySetInnerHTML' >; | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |
| `Edge#1.<intersection:3>.domAttributes.<type:Omit>` | type-only-declaration → type-only-declaration. host-local-presentation-attributes. Apply edge SVG attributes after the built-in handlers. Edge permits local event handlers and exactly six excluded keys. Absent onClick key preserves built-in callback/selection; own onClick:undefined overrides built-in handler and suppresses it; a replacement function wins; deleting the key or replacing the bag with one lacking the key restores built-in behavior. Whole-bag replacement {} differs from retaining a bag containing an own undefined key. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. Honor this exact Omit key set, not a broader exclusion. | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |
| `Edge#1.<intersection:3>.focusable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; focusable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Edge#1.<intersection:3>.reconnectable` | caller-input → caller-input. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean \| HandleType; reconnectable?: boolean \| HandleType; | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.reconnectable.<union:1>` | type-only-declaration → type-only-declaration. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Exercise exact union alternative union-variant; type boolean. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.reconnectable.<union:2>` | type-only-declaration → type-only-declaration. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Exercise exact union alternative union-variant; type HandleType. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.reconnectable.<union:2>.<type:HandleType>` | type-only-declaration → type-only-declaration. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.reconnectable.<union:2>.<type:HandleType>.<union:1>` | type-only-declaration → type-only-declaration. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Exercise exact union alternative union-variant; type 'source'. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.reconnectable.<union:2>.<type:HandleType>.<union:2>` | type-only-declaration → type-only-declaration. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Exercise exact union alternative union-variant; type 'target'. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |
| `Edge#1.<intersection:3>.style` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; style?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.<intersection:3>.style.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Edge#1.EdgeData` | type-only-declaration → type-only-declaration. composite-generic-type-parameter. EdgeData is a compiler type parameter, not an own runtime property. Prove its exact Record<string, unknown> constraint and Record<string, unknown> default type through exported/installed positive and negative consuming-type probes. Real edge.data carries the instantiated subtype through public accepted-document replacement/update and actual native renderer output after 069 integration. Preserve arbitrary codec-decoded class/service/type channels and supplied isolation; no JSON coercion or invented EdgeData field. Compiler-only EdgeData constraint/default/subtype obligations; lifecycle observations belong to edge.data through typed-edge-data-document-update-and-renderer, never a property named after this type parameter. | omitted type argument uses default type; compatible structural subtype positive; incompatible constraint negative; exact data subtype propagation; real data presence according to NodeBase/EdgeBase; isolated update/renderer through consuming operation |

### `types/edge::074::focusable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `focusable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/edge::074::hidden`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `hidden` | caller-input → caller-input. document-semantic. Hide the owning node/edge and its interaction targets. Parent-hidden descendants and incident edges stay hidden; restore returns owner-scoped geometry and targets. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; hidden parent; hide while dragging; unhide; rejected controlled proposal |

### `types/edge::074::id`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `id` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge::074::interactionwidth`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `interactionwidth` | caller-input → caller-input. document-semantic. Set the invisible edge hit path width independently of visible stroke width. Upstream BaseEdge omits the path for zero; current native positive schema rejects zero, so preserve that gap until a reviewed extension and test proves it. Assert this exact member through its named consuming operation and role. | absent; own undefined; 20; 0; positive narrow/wide; negative/nonfinite rejection; hidden; pointer hit outside visible stroke |

### `types/edge::074::label`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `label` | caller-input → caller-input. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |

### `types/edge::074::labelbgborderradius`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgborderradius` | caller-input → caller-input. native-presentation. Set actual label background rx/ry radius; retain explicit zero and clear stale attributes after replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; positive; update/remove; malformed failure |

### `types/edge::074::labelbgpadding`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgpadding` | caller-input → caller-input. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Assert this exact member through its named consuming operation and role. | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |

### `types/edge::074::labelbgstyle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgstyle` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge::074::labelshowbg`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelshowbg` | caller-input → caller-input. native-presentation. Toggle actual background rect around the edge label; false retains label content and hit controls. Inspect SVG geometry and computed style after update. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; update/remove |

### `types/edge::074::labelstyle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelstyle` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge::074::pathoptions`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `pathoptions` | caller-input → caller-input. document-geometry-persistence-review. Decode path-type-specific settings rather than accepting any. Compare smoothstep/step offset and borderRadius and Bezier curvature against pinned path output; fields unused by a path type require an explicit policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; offset:0; borderRadius:0; curvature:0; positive values; change path type; malformed/unknown record; no partial publication |

### `types/edge::074::reconnectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `reconnectable` | caller-input → caller-input. document-semantic-or-host-option. Resolve edge reconnectable boolean/source/target before global edgesReconnectable; reference requires onReconnect registration for enabled reconnection. Exercise both endpoints, unchanged valid connection, rejection and unconditional terminal callback. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; source; target; global false with edge override; no callback; replacement during capture; Escape |

### `types/edge::074::selectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/edge::074::selected`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selected` | caller-input → caller-input. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |

### `types/edge::074::source`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `source` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge::074::sourcehandle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourcehandle` | caller-input → caller-input. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Assert this exact member through its named consuming operation and role. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |

### `types/edge::074::style`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `style` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge::074::target`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `target` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge::074::targethandle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targethandle` | caller-input → caller-input. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Assert this exact member through its named consuming operation and role. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |

### `types/edge::074::type`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `type` | caller-input → caller-input. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. Assert this exact member through its named consuming operation and role. | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |

### `types/edge::074::zindex`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zindex` | caller-input → caller-input. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |

### `types/edge-props::074::animated`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `animated` | renderer-output → renderer-output. document-semantic-persistence-review. Drive visible SVG animation on the correct path; changing false removes animation while the hit path and accepted edge stay intact. Animation is presentation derived from a serializable flag. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; true-to-false; hidden; reduced-motion observation recorded separately |

### `types/edge-props::074::deletable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletable` | renderer-output → renderer-output. resolved-renderer-flag. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. Assert this exact member through its named consuming operation and role. | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |

### `types/edge-props::074::EdgeProps`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `EdgeProps` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:1>.<type:Pick>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Exact declared leaf constraint: field; required; type Position; sourcePosition: Position; | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition.<type:Position>` | type-only-declaration → type-only-declaration. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition.<type:Position>.Bottom` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition.<type:Position>.Left` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition.<type:Position>.Right` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourcePosition.<type:Position>.Top` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourceX` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; sourceX: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.sourceY` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; sourceY: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Exact declared leaf constraint: field; required; type Position; targetPosition: Position; | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition.<type:Position>` | type-only-declaration → type-only-declaration. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition.<type:Position>.Bottom` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition.<type:Position>.Left` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition.<type:Position>.Right` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetPosition.<type:Position>.Top` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetX` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; targetX: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `EdgeProps#1.<intersection:2>.<type:EdgePosition>.targetY` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; targetY: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `EdgeProps#1.<intersection:3>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; empty object is a positive probe because every field is optional. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.label` | renderer-output → renderer-output. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type ReactNode; label?: ReactNode; | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.label.<type:ReactNode>` | type-only-declaration → type-only-declaration. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. Native content mapping needs paired interactive/falsy/zero/empty render proof; string-only support leaves full ReactNode OPEN. | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgBorderRadius` | renderer-output → renderer-output. native-presentation. Set actual label background rx/ry radius; retain explicit zero and clear stale attributes after replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; labelBgBorderRadius?: number; | absent; own undefined; 0; positive; update/remove; malformed failure |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgPadding` | renderer-output → renderer-output. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type [number, number]; labelBgPadding?: [number, number]; | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgPadding.tuple[0]` | renderer-output → renderer-output. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Full tuple path [0] is horizontal label padding. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgPadding.tuple[1]` | renderer-output → renderer-output. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Full tuple path [1] is vertical label padding. Use asymmetric values and change only this exact component; outer index alone is insufficient. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgStyle` | renderer-output → renderer-output. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; labelBgStyle?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelBgStyle.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelShowBg` | renderer-output → renderer-output. native-presentation. Toggle actual background rect around the edge label; false retains label content and hit controls. Inspect SVG geometry and computed style after update. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; labelShowBg?: boolean; | absent; own undefined; true; false; update/remove |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelStyle` | renderer-output → renderer-output. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; labelStyle?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `EdgeProps#1.<intersection:3>.<type:EdgeLabelOptions>.labelStyle.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `EdgeProps#1.<intersection:4>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact EdgeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; empty object is a positive probe because every field is optional. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `EdgeProps#1.<intersection:4>.interactionWidth` | renderer-output → renderer-output. document-semantic. Set the invisible edge hit path width independently of visible stroke width. Upstream BaseEdge omits the path for zero; current native positive schema rejects zero, so preserve that gap until a reviewed extension and test proves it. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; interactionWidth?: number; | absent; own undefined; 20; 0; positive narrow/wide; negative/nonfinite rejection; hidden; pointer hit outside visible stroke |
| `EdgeProps#1.<intersection:4>.pathOptions` | renderer-output → renderer-output. document-geometry-persistence-review. Decode path-type-specific settings rather than accepting any. Compare smoothstep/step offset and borderRadius and Bezier curvature against pinned path output; fields unused by a path type require an explicit policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type any; pathOptions?: any; | absent; own undefined; offset:0; borderRadius:0; curvature:0; positive values; change path type; malformed/unknown record; no partial publication |
| `EdgeProps#1.<intersection:4>.sourceHandleId` | renderer-output → renderer-output. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string \| null; sourceHandleId?: string \| null; | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `EdgeProps#1.<intersection:4>.sourceHandleId.<union:1>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `EdgeProps#1.<intersection:4>.sourceHandleId.<union:2>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `EdgeProps#1.<intersection:4>.targetHandleId` | renderer-output → renderer-output. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string \| null; targetHandleId?: string \| null; | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `EdgeProps#1.<intersection:4>.targetHandleId.<union:1>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type string. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |
| `EdgeProps#1.<intersection:4>.targetHandleId.<union:2>` | type-only-declaration → type-only-declaration. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |

### `types/edge-props::074::id`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `id` | renderer-output → renderer-output. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge-props::074::interactionwidth`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `interactionwidth` | renderer-output → renderer-output. document-semantic. Set the invisible edge hit path width independently of visible stroke width. Upstream BaseEdge omits the path for zero; current native positive schema rejects zero, so preserve that gap until a reviewed extension and test proves it. Assert this exact member through its named consuming operation and role. | absent; own undefined; 20; 0; positive narrow/wide; negative/nonfinite rejection; hidden; pointer hit outside visible stroke |

### `types/edge-props::074::label`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `label` | renderer-output → renderer-output. native-presentation-with-document-text. Support serializable text labels through the document and native custom label content through an owner-local renderer. ReactNode is not a graph value; callback/component ownership needs review with a concrete native mapping, while arbitrary content stays open. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty string; 0 reference ReactNode; text; custom interactive content; update/remove; cancel/dispose |

### `types/edge-props::074::labelbgborderradius`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgborderradius` | renderer-output → renderer-output. native-presentation. Set actual label background rx/ry radius; retain explicit zero and clear stale attributes after replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; positive; update/remove; malformed failure |

### `types/edge-props::074::labelbgpadding`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgpadding` | renderer-output → renderer-output. native-presentation. Preserve tuple order [horizontal,vertical]; measure label and assert each rect inset separately. Changing one entry must not change the other. Assert this exact member through its named consuming operation and role. | absent; own undefined; [0,0]; [8,3]; update first; update second; invalid tuple rejection |

### `types/edge-props::074::labelbgstyle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelbgstyle` | renderer-output → renderer-output. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge-props::074::labelshowbg`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelshowbg` | renderer-output → renderer-output. native-presentation. Toggle actual background rect around the edge label; false retains label content and hit controls. Inspect SVG geometry and computed style after update. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false; update/remove |

### `types/edge-props::074::labelstyle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `labelstyle` | renderer-output → renderer-output. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge-props::074::pathoptions`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `pathoptions` | renderer-output → renderer-output. document-geometry-persistence-review. Decode path-type-specific settings rather than accepting any. Compare smoothstep/step offset and borderRadius and Bezier curvature against pinned path output; fields unused by a path type require an explicit policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; offset:0; borderRadius:0; curvature:0; positive values; change path type; malformed/unknown record; no partial publication |

### `types/edge-props::074::selectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/edge-props::074::selected`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selected` | renderer-output → renderer-output. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |

### `types/edge-props::074::source`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `source` | renderer-output → renderer-output. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge-props::074::sourcehandleid`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourcehandleid` | renderer-output → renderer-output. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Assert this exact member through its named consuming operation and role. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |

### `types/edge-props::074::sourceposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourceposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/edge-props::074::sourcex`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourcex` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/edge-props::074::sourcey`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourcey` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/edge-props::074::style`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `style` | renderer-output → renderer-output. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/edge-props::074::target`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `target` | renderer-output → renderer-output. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/edge-props::074::targethandleid`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targethandleid` | renderer-output → renderer-output. document-handle-identity. Keep absent, null and named handle identity distinct in the reference payload. Native concrete schema currently has optional branded handle strings; null/default-handle mapping requires explicit review. Endpoint ID mapping stays distinct from measured side/center. Assert this exact member through its named consuming operation and role. | absent; own undefined; null; named string; empty string reference comparison; missing/duplicate handle; replace/reorder declarations; controlled rejection |

### `types/edge-props::074::targetposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targetposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/edge-props::074::targetx`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targetx` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/edge-props::074::targety`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targety` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/edge-props::074::type`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `type` | renderer-output → renderer-output. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. Assert this exact member through its named consuming operation and role. | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |

### `types/edge-types::074::EdgeTypes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `EdgeTypes` | type-only-declaration → type-only-declaration. host-local-renderer-registry. Owner-scoped edge registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |
| `EdgeTypes#1.<type:Record>` | type-only-declaration → type-only-declaration. host-local-renderer-registry. Owner-scoped edge registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |

### `types/internal-node::074::arialabel`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `arialabel` | renderer-output → renderer-output. document-semantic-owner-068. Preserve label override including empty string. InternalNode inherits the node label contract; native wrapper ARIA precedence remains owned by 068. Read actual accessible name and scoped description IDs after accepted update. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty string; custom text; fallback configuration; update/remove; same-ID independent owner |

### `types/internal-node::074::connectable`

Original owner 074; required plans 069, 075. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `connectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/internal-node::074::deletable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletable` | renderer-output → renderer-output. resolved-renderer-flag. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. Assert this exact member through its named consuming operation and role. | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |

### `types/internal-node::074::draggable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draggable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/internal-node::074::dragging`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `dragging` | renderer-output → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Assert this exact member through its named consuming operation and role. | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |

### `types/internal-node::074::draghandle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draghandle` | renderer-output → renderer-output. document-semantic-persistence-review. Match the supplied class/selector within this node only; descendants of matching handle can start dragging. Input/noDrag guards and pointer capture still apply. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty selector; matching descendant; nonmatching content; invalid selector atomic failure; replace during gesture; independent owner |

### `types/internal-node::074::expandparent`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `expandparent` | renderer-output → renderer-output. document-semantic-persistence-review. When dragging a child beyond parent bounds, propose the reference parent dimension/position and child-coordinate changes together through one validated edit. Include origin and measured dimension effects; no mutation before controlled acknowledgment. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; all four edges; nested parent; origin center; reject/cancel atomicity |

### `types/internal-node::074::extent`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `extent` | renderer-output → renderer-output. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Assert this exact member through its named consuming operation and role. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |

### `types/internal-node::074::handles`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `handles` | renderer-output → renderer-output. document-semantic-owner-063-065-067. Preserve declared handle ID/kind/side separately from observed physical center/size. Reorder/replace same-owner declarations and wait for exact current measured generation before endpoint/pointer assertions. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty list; ID reorder; side/kind replacement; duplicate ID atomic failure; zero coordinate; owner disposal |

### `types/internal-node::074::hidden`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `hidden` | renderer-output → renderer-output. document-semantic. Hide the owning node/edge and its interaction targets. Parent-hidden descendants and incident edges stay hidden; restore returns owner-scoped geometry and targets. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; hidden parent; hide while dragging; unhide; rejected controlled proposal |

### `types/internal-node::074::id`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `id` | renderer-output → renderer-output. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/internal-node::074::InternalNode`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `InternalNode` | type-only-declaration → type-only-declaration. composite-contract. Retain exact InternalNode declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `InternalNode#1.<type:InternalNodeBase>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact InternalNode declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact InternalNode declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:1>.<type:Omit>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact InternalNode declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Honor this exact Omit key set, not a broader exclusion. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact InternalNode declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type { positionAbsolute: XYPosition; z: number; rootParentIndex?: number; /** * Holds a reference to the original node object provided by the user. * Used as an optimization to avoid certain operations. _/ userNode: NodeType; handleBounds?: NodeHandleBounds; bounds?: NodeBounds; }; internals: { positionAbsolute: XYPosition; z: number; rootParentIndex?: number; /_* * Holds a reference to the original node object provided by the user. * Used as an optimization to avoid certain operations. */ userNode: NodeType; handleBounds?: NodeHandleBounds; bounds?: NodeBounds; }; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type NodeBounds; bounds?: NodeBounds; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>` | type-only-declaration → type-only-declaration. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>.<intersection:1>` | type-only-declaration → type-only-declaration. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>.<intersection:1>.<type:XYPosition>` | type-only-declaration → type-only-declaration. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>.<intersection:1>.<type:XYPosition>.x` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; x: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>.<intersection:1>.<type:XYPosition>.y` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; y: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.bounds.<type:NodeBounds>.<intersection:2>` | type-only-declaration → type-only-declaration. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.positionAbsolute` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type XYPosition; positionAbsolute: XYPosition; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.positionAbsolute.<type:XYPosition>` | type-only-declaration → type-only-declaration. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.positionAbsolute.<type:XYPosition>.x` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; x: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.positionAbsolute.<type:XYPosition>.y` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; y: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.rootParentIndex` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; rootParentIndex?: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.userNode` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type NodeType; userNode: NodeType; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |
| `InternalNode#1.<type:InternalNodeBase>.<intersection:2>.internals.z` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Exact declared leaf constraint: field; required; type number; z: number; | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/internal-node::074::internals`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `internals` | renderer-output → renderer-output. runtime-derived-owner-065-067. Read the accepted current graph and current measurement generation; expose detached read-only derived values. Absolute node coordinates include origin and parents, edge coordinates resolve the correct named handle. Internals include z/rootParentIndex/userNode/handleBounds/bounds without mutable authority. Assert this exact member through its named consuming operation and role. | zero coordinate; negative coordinate; nested parent; origin; missing/stale measurement; side change; document replacement; mutate detached projection; cancellation; disposal |

### `types/internal-node::074::origin`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `origin` | renderer-output → renderer-output. document-semantic-owner-067. Use accepted origin geometry and 070 persistence policy. Assert per-node origin versus document default precedence without reopening exhausted 081/083/084 candidates. Assert this exact member through its named consuming operation and role. | absent; own undefined; [0,0]; [0.5,0.5]; [1,1]; nested parent; resize/drag; accepted update; saved-format compatibility |

### `types/internal-node::074::parentid`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `parentid` | renderer-output → renderer-output. document-semantic. Retain parent ID; compute child absolute position from the accepted parent chain. Missing/self/cyclic parent failures preserve previous accepted document and rendered output. Assert this exact member through its named consuming operation and role. | absent; own undefined; valid parent; reparent; missing parent; self parent; cycle; hidden ancestor; zero parent coordinates |

### `types/internal-node::074::position`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `position` | renderer-output → renderer-output. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Assert this exact member through its named consuming operation and role. | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |

### `types/internal-node::074::resizing`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `resizing` | renderer-output → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Assert this exact member through its named consuming operation and role. | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |

### `types/internal-node::074::selectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/internal-node::074::selected`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selected` | renderer-output → renderer-output. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |

### `types/internal-node::074::sourceposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourceposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/internal-node::074::targetposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targetposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/internal-node::074::type`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `type` | renderer-output → renderer-output. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. Assert this exact member through its named consuming operation and role. | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |

### `types/internal-node::074::zindex`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zindex` | renderer-output → renderer-output. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |

### `types/node::074::classname`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `classname` | caller-input → caller-input. native-presentation. Attach caller classes to the owning node HTML wrapper or edge SVG group; retain Flow-owned classes. Remove only prior caller classes on replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty string; two classes; replacement; removal; identical IDs in independent owners |

### `types/node::074::connectable`

Original owner 074; required plans 069, 075. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `connectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node::074::deletable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletable` | caller-input → caller-input. document-semantic. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. Assert this exact member through its named consuming operation and role. | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |

### `types/node::074::domattributes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `domattributes` | caller-input → caller-input. host-local-presentation-attributes. Apply node HTML attributes with the full keyof DOMAttributes exclusion, including children, dangerouslySetInnerHTML and every event/capture key, plus the explicit excluded keys. No node.domAttributes child-content or event override is permitted. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. Assert this exact member through its named consuming operation and role. | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |

### `types/node::074::draggable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draggable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node::074::dragging`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `dragging` | caller-input → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Assert this exact member through its named consuming operation and role. | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |

### `types/node::074::draghandle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draghandle` | caller-input → caller-input. document-semantic-persistence-review. Match the supplied class/selector within this node only; descendants of matching handle can start dragging. Input/noDrag guards and pointer capture still apply. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty selector; matching descendant; nonmatching content; invalid selector atomic failure; replace during gesture; independent owner |

### `types/node::074::expandparent`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `expandparent` | caller-input → caller-input. document-semantic-persistence-review. When dragging a child beyond parent bounds, propose the reference parent dimension/position and child-coordinate changes together through one validated edit. Include origin and measured dimension effects; no mutation before controlled acknowledgment. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; all four edges; nested parent; origin center; reject/cancel atomicity |

### `types/node::074::extent`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `extent` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Assert this exact member through its named consuming operation and role. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |

### `types/node::074::focusable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `focusable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node::074::height`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `height` | caller-input → caller-input. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. Assert this exact member through its named consuming operation and role. | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |

### `types/node::074::hidden`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `hidden` | caller-input → caller-input. document-semantic. Hide the owning node/edge and its interaction targets. Parent-hidden descendants and incident edges stay hidden; restore returns owner-scoped geometry and targets. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; hidden parent; hide while dragging; unhide; rejected controlled proposal |

### `types/node::074::id`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `id` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/node::074::measured`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `measured` | caller-input → renderer-output. runtime-measurement-projection-owner-065. Observe measured record from the current physical measurement lease/generation. NodeBase permits caller measured input upstream; Flow proposes a transient detached renderer/read projection and needs an explicit mapping review. Optional width/height can be absent before measurement; stale/removed owner results do not publish. Never persist measurements or satisfy a measured leaf with a declared size test. Assert this exact member through its named consuming operation and role. | optional absent width/height; own undefined upstream input mapping; current positive/zero physical observation as reference permits; stale generation; replacement; detached mutation; dispose |

### `types/node::074::Node`

Original owner 074; required plans 069, 075. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `Node` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:1>.<type:NodeBase>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.connectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; connectable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.deletable` | caller-input → caller-input. document-semantic. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; deletable?: boolean; | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.draggable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; draggable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.dragging` | caller-input → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; dragging?: boolean; | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.dragHandle` | caller-input → caller-input. document-semantic-persistence-review. Match the supplied class/selector within this node only; descendants of matching handle can start dragging. Input/noDrag guards and pointer capture still apply. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string; dragHandle?: string; | absent; own undefined; empty selector; matching descendant; nonmatching content; invalid selector atomic failure; replace during gesture; independent owner |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.expandParent` | caller-input → caller-input. document-semantic-persistence-review. When dragging a child beyond parent bounds, propose the reference parent dimension/position and child-coordinate changes together through one validated edit. Include origin and measured dimension effects; no mutation before controlled acknowledgment. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; expandParent?: boolean; | absent; own undefined; false; true; all four edges; nested parent; origin center; reject/cancel atomicity |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type 'parent' \| CoordinateExtent \| null; extent?: 'parent' \| CoordinateExtent \| null; | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:1>` | type-only-declaration → type-only-declaration. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Exercise exact union alternative union-variant; type 'parent'. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>` | type-only-declaration → type-only-declaration. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Exercise exact union alternative union-variant; type CoordinateExtent. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>` | type-only-declaration → type-only-declaration. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[0]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [0] is minimum-corner pair. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type [number, number] | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[0].tuple[0]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [0][0] is minX. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[0].tuple[1]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [0][1] is minY. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[1]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [1] is maximum-corner pair. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type [number, number] | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[1].tuple[0]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [1][0] is maxX. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:2>.<type:CoordinateExtent>.tuple[1].tuple[1]` | caller-input → caller-input. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Full tuple path [1][1] is maxY. Use asymmetric values and change only this exact component; outer index alone is insufficient. This is a descendant within an enclosing union branch, not a new union alternative. Assert this exact leaf after narrowing the branch; full API accepts all allowed siblings. Exact declared leaf constraint: tuple-element; type number | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.extent.<union:3>` | type-only-declaration → type-only-declaration. document-semantic. Preserve per-node parent/coordinate/null extent and global coordinate boundary as distinct inputs. Clamp using effective origin, parent absolute position and measured dimensions. Parent constraint requires a valid parent. Exercise exact union alternative union-variant; type null. A sibling-only value is negative ONLY for a branch-specific derived type alias; the full API union accepts every permitted sibling. | absent; own undefined; null where allowed; parent; [[0,0],[200,100]]; zero boundaries; reversed/nonfinite boundary failure; nested parent; negative coordinates; controlled rejection |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.height` | caller-input → caller-input. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; height?: number; | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.hidden` | caller-input → caller-input. document-semantic. Hide the owning node/edge and its interaction targets. Parent-hidden descendants and incident edges stay hidden; restore returns owner-scoped geometry and targets. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; hidden?: boolean; | absent; own undefined; false; true; hidden parent; hide while dragging; unhide; rejected controlled proposal |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.id` | caller-input → caller-input. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Exact declared leaf constraint: field; required; type string; id: string; | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.measured` | caller-input → renderer-output. runtime-measurement-projection-owner-065. Observe measured record from the current physical measurement lease/generation. NodeBase permits caller measured input upstream; Flow proposes a transient detached renderer/read projection and needs an explicit mapping review. Optional width/height can be absent before measurement; stale/removed owner results do not publish. Never persist measurements or satisfy a measured leaf with a declared size test. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type { width?: number; height?: number; }; measured?: { width?: number; height?: number; }; | optional absent width/height; own undefined upstream input mapping; current positive/zero physical observation as reference permits; stale generation; replacement; detached mutation; dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.measured.height` | caller-input → renderer-output. runtime-measurement-projection-owner-065. Observe height from the current physical measurement lease/generation. NodeBase permits caller measured input upstream; Flow proposes a transient detached renderer/read projection and needs an explicit mapping review. Optional width/height can be absent before measurement; stale/removed owner results do not publish. Never persist measurements or satisfy a measured leaf with a declared size test. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; height?: number; | optional absent width/height; own undefined upstream input mapping; current positive/zero physical observation as reference permits; stale generation; replacement; detached mutation; dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.measured.width` | caller-input → renderer-output. runtime-measurement-projection-owner-065. Observe width from the current physical measurement lease/generation. NodeBase permits caller measured input upstream; Flow proposes a transient detached renderer/read projection and needs an explicit mapping review. Optional width/height can be absent before measurement; stale/removed owner results do not publish. Never persist measurements or satisfy a measured leaf with a declared size test. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; width?: number; | optional absent width/height; own undefined upstream input mapping; current positive/zero physical observation as reference permits; stale generation; replacement; detached mutation; dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.parentId` | caller-input → caller-input. document-semantic. Retain parent ID; compute child absolute position from the accepted parent chain. Missing/self/cyclic parent failures preserve previous accepted document and rendered output. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string; parentId?: string; | absent; own undefined; valid parent; reparent; missing parent; self parent; cycle; hidden ancestor; zero parent coordinates |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.position` | caller-input → caller-input. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Exact declared leaf constraint: field; required; type XYPosition; position: XYPosition; | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.position.<type:XYPosition>` | type-only-declaration → type-only-declaration. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Assert this exact member through its named consuming operation and role. | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.position.<type:XYPosition>.x` | caller-input → caller-input. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Exact declared leaf constraint: field; required; type number; x: number; | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.position.<type:XYPosition>.y` | caller-input → caller-input. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Exact declared leaf constraint: field; required; type number; y: number; | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.selectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; selectable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.selected` | caller-input → caller-input. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; selected?: boolean; | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type Position; sourcePosition?: Position; | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition.<type:Position>` | type-only-declaration → type-only-declaration. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition.<type:Position>.Bottom` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition.<type:Position>.Left` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition.<type:Position>.Right` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.sourcePosition.<type:Position>.Top` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type Position; targetPosition?: Position; | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition.<type:Position>` | type-only-declaration → type-only-declaration. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition.<type:Position>.Bottom` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition.<type:Position>.Left` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition.<type:Position>.Right` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.targetPosition.<type:Position>.Top` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.width` | caller-input → caller-input. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; width?: number; | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.zIndex` | caller-input → caller-input. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type number; zIndex?: number; | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact Node declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; empty object is a positive probe because every field is optional. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `Node#1.<intersection:2>.className` | caller-input → caller-input. native-presentation. Attach caller classes to the owning node HTML wrapper or edge SVG group; retain Flow-owned classes. Remove only prior caller classes on replacement. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type string; className?: string; | absent; own undefined; empty string; two classes; replacement; removal; identical IDs in independent owners |
| `Node#1.<intersection:2>.domAttributes` | caller-input → caller-input. host-local-presentation-attributes. Apply node HTML attributes with the full keyof DOMAttributes exclusion, including children, dangerouslySetInnerHTML and every event/capture key, plus the explicit excluded keys. No node.domAttributes child-content or event override is permitted. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type Omit< HTMLAttributes<HTMLDivElement>, \| 'id' \| 'style' \| 'className' \| 'draggable' \| 'role' \| 'aria-label' \| 'defaultValue' \| 'dangerouslySetInnerHTML' \| keyof DOMAttributes<HTMLDivElement> >; domAttributes?: Omit< HTMLAttributes<HTMLDivElement>, \| 'id' \| 'style' \| 'className' \| 'draggable' \| 'role' \| 'aria-label' \| 'defaultValue' \| 'dangerouslySetInnerHTML' \| keyof DOMAttributes<HTMLDivElement> >; | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |
| `Node#1.<intersection:2>.domAttributes.<type:Omit>` | type-only-declaration → type-only-declaration. host-local-presentation-attributes. Apply node HTML attributes with the full keyof DOMAttributes exclusion, including children, dangerouslySetInnerHTML and every event/capture key, plus the explicit excluded keys. No node.domAttributes child-content or event override is permitted. ARIA/data false is textual false, true is textual true and zero is textual 0. Actual boolean HTML properties false are removed/unset; enumerated/string SVG values follow their property metadata and string false where accepted, never generic removal. Native Edge event functions remain owner-local; serialization rejects them. Honor this exact Omit key set, not a broader exclusion. | absent bag; own undefined bag; aria-hidden:false => "false"; data-state:false => "false"; data-count:0 => "0"; true boolean property then false unset where allowed; enumerated SVG false metadata case; forbidden exact key; local Edge event key absent/undefined/function/delete/full-bag replacement; two owners |
| `Node#1.<intersection:2>.focusable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; focusable?: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |
| `Node#1.<intersection:2>.resizing` | caller-input → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type boolean; resizing?: boolean; | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |
| `Node#1.<intersection:2>.style` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. This optional leaf omission is a positive compiler/input case; never reject it merely because an ancestor is an intersection. Exact declared leaf constraint: field; optional; type CSSProperties; style?: CSSProperties; | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Node#1.<intersection:2>.style.<type:CSSProperties>` | type-only-declaration → type-only-declaration. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Full CSS/custom-property and removal proof is required; stroke/strokeWidth subset leaves this branch OPEN. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |
| `Node#1.NodeData` | type-only-declaration → type-only-declaration. composite-generic-type-parameter. NodeData is a compiler type parameter, not an own runtime property. Prove its exact Record<string, unknown> constraint and Record<string, unknown> default type through exported/installed positive and negative consuming-type probes. Real node.data carries the instantiated subtype through public accepted-document replacement/update and actual native renderer output after 069 integration. Preserve arbitrary codec-decoded class/service/type channels and supplied isolation; no JSON coercion or invented NodeData field. Compiler-only NodeData constraint/default/subtype obligations; lifecycle observations belong to node.data through typed-node-data-document-update-and-renderer, never a property named after this type parameter. | omitted type argument uses default type; compatible structural subtype positive; incompatible constraint negative; exact data subtype propagation; real data presence according to NodeBase/EdgeBase; isolated update/renderer through consuming operation |

### `types/node::074::parentid`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `parentid` | caller-input → caller-input. document-semantic. Retain parent ID; compute child absolute position from the accepted parent chain. Missing/self/cyclic parent failures preserve previous accepted document and rendered output. Assert this exact member through its named consuming operation and role. | absent; own undefined; valid parent; reparent; missing parent; self parent; cycle; hidden ancestor; zero parent coordinates |

### `types/node::074::position`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `position` | caller-input → caller-input. document-semantic. Preserve caller anchor coordinates; derive absolute/top-left coordinates through accepted origin and parent transforms. Dragging proposes accepted owner changes; renderer uses current geometry. Assert this exact member through its named consuming operation and role. | x:0,y:0; negative coordinates; nested parent; origin [0.5,0.5]; update; reject; cancel; detached returned value |

### `types/node::074::resizing`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `resizing` | caller-input → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Assert this exact member through its named consuming operation and role. | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |

### `types/node::074::selectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectable` | caller-input → caller-input. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node::074::selected`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selected` | caller-input → caller-input. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |

### `types/node::074::sourceposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourceposition` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/node::074::style`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `style` | caller-input → caller-input. native-presentation. Preserve the complete framework-native CSS property contract, including custom properties, numeric zero and string values. Apply style to the exact wrapper/path/label/background named by this member. Record precedence against position/size/zIndex owned by Flow; require review before choosing a conflicting-value policy. Assert this exact member through its named consuming operation and role. | absent; own undefined; opacity:0; CSS variable; transform/left/width conflict; add/change/remove property; reject function/DOM payload at serialization boundary |

### `types/node::074::targetposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targetposition` | caller-input → caller-input. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/node::074::type`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `type` | caller-input → caller-input. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. Assert this exact member through its named consuming operation and role. | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |

### `types/node::074::width`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `width` | caller-input → caller-input. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. Assert this exact member through its named consuming operation and role. | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |

### `types/node::074::zindex`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zindex` | caller-input → caller-input. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |

### `types/node-props::074::deletable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `deletable` | renderer-output → renderer-output. resolved-renderer-flag. Resolve per-element deletable as value ?? true. There is no inherited host deletion default. Explicit false prohibits real keyboard/public deletion; true permits it, subject to controlled owner approval and graph integrity. Renderer output must receive the resolved boolean. Assert this exact member through its named consuming operation and role. | absent => true; own undefined => true where optional input permits; false; true; keyboard deletion; public deletion; controlled refusal; two owners |

### `types/node-props::074::draggable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draggable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node-props::074::dragging`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `dragging` | renderer-output → renderer-output. runtime-derived. Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Assert this exact member through its named consuming operation and role. | before gesture false; promotion true; progress true; success false; Escape false; pointercancel false; owner replacement false; dispose no later notification |

### `types/node-props::074::draghandle`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `draghandle` | renderer-output → renderer-output. document-semantic-persistence-review. Match the supplied class/selector within this node only; descendants of matching handle can start dragging. Input/noDrag guards and pointer capture still apply. Assert this exact member through its named consuming operation and role. | absent; own undefined; empty selector; matching descendant; nonmatching content; invalid selector atomic failure; replace during gesture; independent owner |

### `types/node-props::074::height`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `height` | renderer-output → renderer-output. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. Assert this exact member through its named consuming operation and role. | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |

### `types/node-props::074::id`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `id` | renderer-output → renderer-output. document-identity. Preserve the exact branded identity in accepted document, callback and renderer context. Node ID differs from Edge source/target node IDs. Unknown endpoint and duplicate identity fail at the public validation boundary without partial publication. Assert this exact member through its named consuming operation and role. | valid identity; missing required field; own undefined rejection; empty ID rejection; duplicate ID; same ID on two owners; endpoint replacement |

### `types/node-props::074::isconnectable`

Original owner 074; required plans 069, 075. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `isconnectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node-props::074::NodeProps`

Original owner 074; required plans 069, 075. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `NodeProps` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#1.<type:NodePropsBase>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:1>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:1>.<type:Pick>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Assert this exact member through its named consuming operation and role. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:2>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:2>.<type:Required>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Only Required-selected fields must be resolved; optional fields outside this utility remain optional. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:3>` | type-only-declaration → type-only-declaration. composite-contract. Retain exact NodeProps declaration constituents and their own optional/required leaves. Generic type/data propagation, inherited flag resolution and detached runtime values require actual native renderer and exported compiler proof. Construct this exact intersection constituent; required leaves must exist. Optional omission stays positive; negative omission applies only to declared required leaves. | all required leaves; optional omission is positive; exact generic subtype; actual native context; detached values |
| `NodeProps#2.<intersection:3>.isConnectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Exact declared leaf constraint: field; required; type boolean; isConnectable: boolean; | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node-props::074::parentid`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `parentid` | renderer-output → renderer-output. document-semantic. Retain parent ID; compute child absolute position from the accepted parent chain. Missing/self/cyclic parent failures preserve previous accepted document and rendered output. Assert this exact member through its named consuming operation and role. | absent; own undefined; valid parent; reparent; missing parent; self parent; cycle; hidden ancestor; zero parent coordinates |

### `types/node-props::074::selectable`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selectable` | renderer-output → renderer-output. document-semantic. Resolve per-element explicit flag before host default and expose the resolved boolean to renderer props. Prove the corresponding drag/selection/tab focus/delete/connection operation changes, including keyboard paths. Assert this exact member through its named consuming operation and role. | absent; own undefined; true; false overriding enabled host; true overriding disabled host; replacement during gesture; rejected controlled proposal; cancel/dispose |

### `types/node-props::074::selected`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `selected` | renderer-output → renderer-output. document-semantic. Expose accepted selection and derived renderer flag; distinguish gesture proposal from accepted owner acknowledgment. Selection order and edge/node identity survive replacement. Assert this exact member through its named consuming operation and role. | absent; own undefined; false; true; selection proposal; owner accept/reject; mixed node/edge selection; deselect |

### `types/node-props::074::sourceposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `sourceposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/node-props::074::targetposition`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `targetposition` | renderer-output → renderer-output. document-side-or-derived-renderer. For Node/InternalNode/NodeProps these are built-in handle defaults. For EdgeProps they are resolved endpoint directions. Compare all top/right/bottom/left values with physical handle centers and rendered SVG, keeping named-handle override precedence. Assert this exact member through its named consuming operation and role. | absent; own undefined; top; right; bottom; left; replace side; unknown side atomic failure; independent owners |

### `types/node-props::074::type`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `type` | renderer-output → renderer-output. document-discriminator-owner-069. Retain decoded type discriminator and route to owner-scoped native renderer. Undefined/default, known type and unknown type require separate fallback/error assertions. Required literal subtype branches remain dependent on typed host integration. Assert this exact member through its named consuming operation and role. | absent when declaration optional; own undefined; default; known custom; unknown type; registry update; same ID two owners |

### `types/node-props::074::width`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `width` | renderer-output → renderer-output. document-dimension-owner-063-065. Separate declared/SSR/initial dimensions from measured dimensions. Document.size currently requires positive dimensions. Any upstream zero/initial/width mapping must be reviewed and tested, including origin geometry and first visible render. Assert this exact member through its named consuming operation and role. | absent; own undefined; positive; zero reference capture versus explicit native rejection; initial-only; declared/measured precedence; observer refresh; reject; dispose |

### `types/node-props::074::zindex`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `zindex` | renderer-output → renderer-output. document-semantic. Retain finite zIndex and resolve computed node/edge stacking using stable document order for ties, parent ordering and selected elevation. Inspect computed CSS and SVG group order, not class presence. Assert this exact member through its named consuming operation and role. | absent; own undefined; 0; negative; positive; equal tie; selected; nested parent; replacement |

### `types/node-types::074::NodeTypes`

Original owner 074; required plans 069. All three original targets remain unchanged.

| Exact member | Role, proposed ownership and observation | Named value cases |
| --- | --- | --- |
| `NodeTypes` | type-only-declaration → type-only-declaration. host-local-renderer-registry. Owner-scoped node registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |
| `NodeTypes#1.<type:Record>` | type-only-declaration → type-only-declaration. host-local-renderer-registry. Owner-scoped node registry routes decoded subtype to a native renderer. Missing/default/custom/unknown/error fallback, live registry replacement and single cleanup each require actual rendered proof and typed host propagation. Assert this exact member through its named consuming operation and role. | absent; ownundefined; empty; built-ins; custom; unknown; default override; live replace; throw; dispose; two owners |

## Separate reference observations and native difference candidates

These source-indicated differences are unapproved candidates. The native outcome never substitutes for a pinned observation. Actual paired tests remain unrun.

| Exact representative member | Pinned source observation | Proposed native outcome and test boundary |
| --- | --- | --- |
| `Edge#1.<intersection:1>.<type:EdgeBase>.hidden` | Pinned edge wrapper returns null for edge.hidden or null endpoint coordinates. Parent hidden is not propagated into child hidden during adoption; initialized incident-edge behavior requires its own paired capture. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:83`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:156`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:214`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/EdgeWrapper/index.tsx:119` | Flow graph propagates hidden ancestor state to descendants and incident edge rendering, preserving its accepted visibility architecture. Reason: Consistent native ancestor visibility and owner interaction cleanup. Boundary: Real parent hidden/unhidden replacement with visible initialized child and incident edge, per host; same scenario in pinned capture. |
| `hidden` | Pinned node wrapper checks its own hidden field. Child adoption does not inherit parent hidden into child.hidden; parent-hidden child/initialized incident-edge output needs paired capture. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:83`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:156`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:214` | Flow graph propagates hidden ancestor state to descendants and incident edge rendering, preserving its accepted visibility architecture. Reason: Consistent native ancestor visibility and owner interaction cleanup. Boundary: Real parent hidden/unhidden replacement with visible initialized child and incident edge, per host; same scenario in pinned capture. |
| `parentid` | Missing parent warns and returns from child update; does not atomically reject the entire reference input. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:225` | Flow public boundary atomically rejects missing/self/cyclic parents and preserves last accepted document/rendered output. Reason: Validated graph integrity and single accepted authority. Boundary: Malformed missing-parent public replacement with captured previous snapshot and rendered output, separately paired with pinned warning/child behavior. |
| `dragging` | The exact retained declaration/pinned path defines allowed values. This proposed native policy is not itself a reference observation. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:11`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:90`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:114`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/nodes.ts:16`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:33`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:151`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/EdgeWrapper/index.tsx:40`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:56`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/BaseEdge.tsx:34`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/EdgeText.tsx:7` | Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Reason: Caller-supplied upstream flag versus native transient runtime authority must have explicit reviewed input/output mapping. Boundary: Caller true/false replacement separately from actual start/progress/idle/cancel renderer observations; no persistence or inherited host default. |
| `hidden` | Pinned node wrapper checks its own hidden field. Child adoption does not inherit parent hidden into child.hidden; parent-hidden child/initialized incident-edge output needs paired capture. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:83`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:156`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:214` | Flow graph propagates hidden ancestor state to descendants and incident edge rendering, preserving its accepted visibility architecture. Reason: Consistent native ancestor visibility and owner interaction cleanup. Boundary: Real parent hidden/unhidden replacement with visible initialized child and incident edge, per host; same scenario in pinned capture. |
| `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.parentId` | Missing parent warns and returns from child update; does not atomically reject the entire reference input. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:225` | Flow public boundary atomically rejects missing/self/cyclic parents and preserves last accepted document/rendered output. Reason: Validated graph integrity and single accepted authority. Boundary: Malformed missing-parent public replacement with captured previous snapshot and rendered output, separately paired with pinned warning/child behavior. |
| `Node#1.<intersection:2>.resizing` | The exact retained declaration/pinned path defines allowed values. This proposed native policy is not itself a reference observation. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:11`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:90`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/types/nodes.ts:114`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/nodes.ts:16`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:33`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/types/edges.ts:151`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/EdgeWrapper/index.tsx:40`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/NodeWrapper/index.tsx:56`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/BaseEdge.tsx:34`, `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/components/Edges/EdgeText.tsx:7` | Expose transient gesture state to the native renderer context, true only during its actual active gesture. Never add transient flags to saved v1/v2 documents or a second graph store. Reconcile caller-supplied upstream flags through a reviewed mapping rather than silently discarding them. Reason: Caller-supplied upstream flag versus native transient runtime authority must have explicit reviewed input/output mapping. Boundary: Caller true/false replacement separately from actual start/progress/idle/cancel renderer observations; no persistence or inherited host default. |
| `parentid` | Missing parent warns and returns from child update; does not atomically reject the entire reference input. Sources `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/store.ts:225` | Flow public boundary atomically rejects missing/self/cyclic parents and preserves last accepted document/rendered output. Reason: Validated graph integrity and single accepted authority. Boundary: Malformed missing-parent public replacement with captured previous snapshot and rendered output, separately paired with pinned warning/child behavior. |

Each JSON policy also includes the original role, proposed native role, presence, complete tuple path, exact union/intersection probe scope, consumingOperation and four separate cancellation baselines. Type-only lifecycle dimensions execute through that consuming operation. Controlled refusal, active preview cancel, supersession and disposal never imply one shared rollback or terminal-event behavior.

## Dependency-ordered bounded source proposals

These are proposed child boundaries. Primary review assigns final plan numbers and freezes exact input/allowlist/assertion records before dispatch. Source executors must not treat this list as blanket approval.

1. Native presentation registry and live replacement, effort M, risk HIGH. Review owner-local node/edge presentation records for full CSS, className, permitted DOM attributes and native label content. Scope `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/edge-renderer.ts`, `apps/vanilla/src/public.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/public.ts`, relevant adjacent unit tests and NEW three `node-edge-fields.e2e.ts` suites plus public fixtures. Coordinate missing Vanilla/Foldkit public live replacement with 071/067/072. Assert exact computed CSS, property/attribute removal, native interactive label behavior and DOM event/serialization boundary. No new document fields before separate format review.

2. Serializable field policy, effort M design plus L execution, risk HIGH. Review animated, dragHandle, coordinate/null extent, expandParent, path options and absent/null handle identities through exact schema, accepted edit, versioned/literal-v1 persistence policy and public renderer. Source allowlist after review is original 074 core `flow.schema.ts`, `flow-edit.schema.ts`, `flow-runtime.schema.ts`, `flow.schema.test.ts`, adjacent explicitly approved geometry/edit tests, owning hosts and named field fixtures. Saved-format source remains 070-owned and needs explicit additional reviewed allowlist before any edit. Prove malformed atomic rejection and full legacy compatibility before native output assertions.

3. Derived renderer context and registries after dependencies, effort L, risk HIGH. Consume 063 declared/SSR dimensions, 065 current measured geometry, 067 parent/origin/handle semantics and 068 resolved ARIA/color fields; preserve original requiredPlans 069 even where additional semantic dependencies are needed. Expose detached dragging/resizing/absolute/endpoint/internal values and resolved flags, with all four sides, zero coordinates, stale generation rejection and real renderer replacement cleanup. Scope original 074 host/core runtime files and named fields suites; generic renderer subtype rows require actual 069 host integration beyond 087.

4. Per-member pinned comparisons, effort M, risk MED. Scope NEW `scripts/capture-node-edge-field-reference.ts`, `research/harnesses/node-edge-field/`, `research/fixtures/node-edge-field-reference.json`, `packages/conformance/src/node-edge-field-reference.test.ts`, existing installed-consumer probes. Each retained exact nested field/union/intersection has its own assertion identity. Mark no original cell complete until production, reference and independent semantic review agree.

### Separate numbered API prerequisite

JSON `separateNumberedApiPrerequisite` is a non-executable cross-owner scope proposal. Its plan number and public command name are null, and primary must assign a separate numbered plan before source dispatch. It is not inferred from any071 member allowlist. The first proposed packet is exactly connectionMode plus host-local connectionLineStyle/connectionLineContainerStyle whole replacement; its local registry fields are exactly those two style bags. Other listed cross-owner option/callback/renderer fields are deferred to separately numbered packets.

Proposed whole replacement uses reviewed construction defaults for missing scalars and clears missing local style bags; own undefined follows exact decoder/presence policy. Validate the full replacement before resource mutation, then cancel the affected preview through its actual recorded operation/mode baseline and install options. Accepted prior progress is not rolled back. Host error/result/service channels and real public API name remain to be frozen in the numbered packet. Exact candidate source/test file proposals are enumerated in JSON, with same-owner identity, malformed atomicity, style clearing, disposal and independent-owner assertions. No approved command exists.

### Exact proposed file and member allowlists

JSON `boundedSourceChildren` enumerates each proposed file, flags genuinely NEW files, and lists every exact selected member key. These records supplement the ordered sketches above; no directory-wide/adjacent-file phrase grants source scope. Exact capture harness and installed consumer filenames are listed in JSON; final numbered source packets still freeze their API/probe/capture assertions before dispatch. Product, dependencies, lockfiles, gates, imported evidence, recipes and member-ledger changes stay outside this authoring task.

- `074-presentation`: 57 selected member records / 171 proposed host cells. Files: `apps/foldkit/e2e/node-edge-fields.e2e.ts`, `apps/foldkit/node-edge-fields-test.html`, `apps/foldkit/src/node-edge-fields-test.ts`, `apps/vanilla/e2e/node-edge-fields.e2e.ts`, `apps/vanilla/node-edge-fields-test.html`, `apps/vanilla/src/edge-renderer.ts`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/node-edge-fields-test.ts`, `apps/vanilla/src/public.ts`, `apps/vue/e2e/node-edge-fields.e2e.ts`, `apps/vue/node-edge-fields-test.html`, `apps/vue/src/node-edge-fields-test.ts`, `packages/foldkit/src/application.test.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.test.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`, `packages/vue/src/flow-canvas.test.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`.
- `074-field-format-policy`: 84 selected member records / 252 proposed host cells. Files: `apps/foldkit/e2e/node-edge-fields.e2e.ts`, `apps/foldkit/node-edge-fields-test.html`, `apps/foldkit/src/node-edge-fields-test.ts`, `apps/vanilla/e2e/node-edge-fields.e2e.ts`, `apps/vanilla/node-edge-fields-test.html`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/node-edge-fields-test.ts`, `apps/vanilla/src/public.ts`, `apps/vue/e2e/node-edge-fields.e2e.ts`, `apps/vue/node-edge-fields-test.html`, `apps/vue/src/node-edge-fields-test.ts`, `packages/core/src/domain/flow-edit.schema.ts`, `packages/core/src/domain/flow-edit.test.ts`, `packages/core/src/domain/flow-runtime.schema.ts`, `packages/core/src/domain/flow.schema.test.ts`, `packages/core/src/domain/flow.schema.ts`, `packages/foldkit/src/application.test.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.test.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`, `packages/vue/src/flow-canvas.test.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`.
- `074-derived-context`: 152 selected member records / 456 proposed host cells. Files: `apps/foldkit/e2e/node-edge-fields.e2e.ts`, `apps/foldkit/node-edge-fields-test.html`, `apps/foldkit/src/node-edge-fields-test.ts`, `apps/vanilla/e2e/node-edge-fields.e2e.ts`, `apps/vanilla/node-edge-fields-test.html`, `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/node-edge-fields-test.ts`, `apps/vanilla/src/public.ts`, `apps/vue/e2e/node-edge-fields.e2e.ts`, `apps/vue/node-edge-fields-test.html`, `apps/vue/src/node-edge-fields-test.ts`, `packages/core/src/domain/flow-runtime.schema.ts`, `packages/foldkit/src/application.test.ts`, `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.test.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`, `packages/vue/src/flow-canvas.test.ts`, `packages/vue/src/flow-canvas.ts`, `packages/vue/src/public.ts`.
- `074-reference-type-proof`: 294 selected member records / 882 proposed host cells. Files: `packages/conformance/src/node-edge-field-reference.test.ts`, `research/fixtures/node-edge-field-reference.json`, `research/harnesses/node-edge-field/index.html`, `research/harnesses/node-edge-field/main.tsx`, `research/harnesses/node-edge-field/vite.config.ts`, `scripts/capture-node-edge-field-reference.ts`, `scripts/check-packed-consumer.ts`, `tests/consumer/consumer.typecheck.ts`, `tests/consumer/foldkit/consumer.typecheck.ts`, `tests/consumer/foldkit/main.ts`, `tests/consumer/main.ts`, `tests/consumer/vue/consumer.typecheck.ts`, `tests/consumer/vue/main.ts`.

## Finding and acceptance boundary

- Evidence: document-only Vanilla update and construction-only Foldkit options, plus the verified native-creation test boundary, leave same-owner option replacement missing while Vue uses live props. Impact: remount cannot establish update semantics or preserve ongoing owner state. Effort M; fix risk HIGH because active gestures/listeners need atomic reconciliation. Confidence HIGH for the missing public path in the reviewed snapshots. Fix sketch: review a bounded public native replacement path, then prove live toggles and cleanup through the actual mounted host.

- Evidence: pinned Node/Edge/CSS/DOM/renderer declarations and current concrete Flow schemas/context show contracts wider than bounded existing fields. Impact: composite member cells cannot close from text labels, stroke subsets, count checkers or schema factory success. Effort L; risk HIGH for persistence and generic host channels. Confidence HIGH for declared gap, unverified for full reference behavior. Fix sketch: retain exact requirements, split native presentation from document/runtime ownership and require member-specific source/browser/type/reference tests.

Future execution gates are the relevant exact host suites, installed public probes and pinned captures, plus `bun run verify` with focused active-work scope set to those suites/checks. Expected exit 0 with no new skips; record profile and exact scope. `bun run verify:full` is required at integration/release and before broad parity claims. No install, build, test, browser or gate ran in this authoring task. Source review and independent cold review must precede dispatch; logs/counts are never semantic proof.

## Audit limitations

All assigned original member identities/descriptions/raw rows were mechanically read and preserved; selected source declarations/defaults/wrappers and public host paths were personally read. Not audited here: all upstream tests, every live browser branch, CI, native devices, collector delivery, or product semantics outside these families. Empty/missing/new target test files are proposals, not passed evidence. Current-site extraction text is dated drift information; joined-row defaults are not reconstructed. Current source paths and acceptance boundaries do not imply all original operations exist.

## Conformity and deviations

Conforming target: exact serializable value meaning, absence/undefined/false/zero distinctions, owner acknowledgment, order, cancellation, cleanup and native rendered output when pinned executable comparison proves them. Framework-native events/components, detached codec-decoded values, ancestor-hidden propagation, atomic graph integrity and reliable key-option replacement are intentional-difference candidates with separate source observations/native proposals, reasons and named paired/native test boundaries. None is approved as a closed cell. Construction-only Vanilla/Foldkit modes/styles are a current bounded native limitation; live replacement remains actionable and unverified, not a reason to close original cells. All rows stay unverified/OPEN until their exact production, compiler where applicable, pinned reference and independent review evidence is complete.
