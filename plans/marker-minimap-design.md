# Plan 073 architecture prerequisite: marker and MiniMap member contracts

Status: proposed architecture for independent review, 2026-09-30. This report covers all 101 original member records in 30 groups and 303 host cells assigned to 073. It approves no source, closes no cell, and does not complete 073. Plan 064 remains stopped and untouched. The only write for this task is this supplemental document, now named `plans/marker-minimap-design.md`; the primary executable coordinator plan remains073. Final focused planning revision: endpoint presence correction; two planning revisions exhausted.

## Evidence boundary and recommendation

Flow citations below resolve against `/Users/richardmcandrews/.codex/worktrees/accepted-public-prerequisites/flow` (HEAD `de36b4f64fe80d99886c0b7a9fb505258b872ac9`). Pinned citations resolve against `/tmp/flow-063-provider-reference`, verified clean at `0a1f9575b25679f2880175de8d3eae21aedde921`. The accepted tree contains coordinator metadata/provider evidence changes; the plan's commit-range source diff is empty. Its uncommitted metadata is part of the inspected snapshot, rather than evidence of an otherwise clean tree. The coordinator plan was read in full from the cumulative worktree, and the original catalog and closure manifest were read from the accepted prerequisite tree.

The catalog capture/source-check date is 2026-09-28 for the five assigned type pages. A row saying “Current site row” is dated imported text, not a current-site verification performed here. Joined rows do not establish defaults. This review uses local pinned primary source, not a live website or executable capture. No installation, browser, capture, generator, typecheck or full verify was run.

Recommend preserving existing built-in string markers and existing default MiniMap presentation, adding the full marker-object contract and native custom MiniMap renderer props, and independently reviewing the marker persistence amendment before any live schema widening. Functions remain native; pure graph-space geometry and validated data remain core. The design must retain all original union and callback cases, including the string reference branch, `shapeRendering`, CSSProperties and MouseEvent variants.

Three choices are available:

| Choice | Benefit | Cost / acceptance limit |
| --- | --- | --- |
| **A: additive full member support with frozen legacy behavior (recommended)** | Old saved `arrow`/`arrowclosed` retain their built-in meaning; object markers receive pinned field/default behavior; native custom MiniMap renderers receive full graph-space props | Requires explicit string-policy differences, separate native markerDefinitions API approval, lossless endpoint/color-presence review, 070/075 amendment, and native renderer lifecycle assertions |
| B: reinterpret all strings and replace every native default with pinned behavior | Closest literal reference semantics for new callers | Old `arrow` strings become external IDs rather than generated arrows; existing Vue/Foldkit marker geometry and all MiniMap default appearance change. Requires a separately approved breaking migration; not authorized here |
| C: restrict objects, refs or styles to a convenient subset / keep them in a parallel presentation graph | Smaller initial implementation | Fails named original members or one accepted graph. Not a valid completion of 073 without explicit independent scope decisions; do not relabel gaps as reviewed differences |

## Pinned public paths and complete semantics

The real marker entry is `packages/react/src/index.ts:1` → `container/ReactFlow/index.tsx:24` (default marker color `#b1b1b7` at `:93`, `rfId = id || '1'` at `:157`) → `container/GraphView/index.tsx:158` → `container/EdgeRenderer/index.tsx:64`. `components/EdgeWrapper/index.tsx:39` selects the owner edge; `:41` spreads global defaults then edge fields. Geometry/elevated z are computed at `:71`, hidden/missing endpoints suppress output at `:120`; `:110` and `:115` create marker URLs. `:244` and `:245` pass those URL strings to the native custom edge renderer. The object marker's graph value is not the custom renderer's marker URL prop.

`packages/system/src/types/edges.ts:92` declares required `type: MarkerType | \`${MarkerType}\``and optional color, width, height, markerUnits, orient, strokeWidth;`:102`declares`string | EdgeMarker`; `:110` declares Arrow=`arrow`, ArrowClosed=`arrowclosed`. The enum and template-literal branch share runtime literals but require separate positive consumer assertions.

`packages/system/src/utils/marker.ts:3` returns raw strings unchanged and returns an empty ID for falsy inputs. Thus **pinned `markerEnd: 'arrow'` is an external SVG definition reference**, not shorthand for a generated arrow. `:38` uses endpoint-or-default truthiness for definition collection; only objects generate definitions. Object IDs sort raw own keys (`:14`), optionally prefixed by rfId. `:42` constructs `{ id, color: marker.color || defaultColor, ...marker }`. Do not substitute nullish coalescing: the final spread distinguishes missing color, own undefined, null and empty string. Endpoint URL creation is a separate path: EdgeWrapper's spread at `:41` lets an absent own key inherit the default, but an own undefined or empty value shadows that default. The effective undefined/empty value yields no URL at `:111,116`, even when the truthiness-based collector independently generates an unused default-object definition. Capture the effective value, URL and collected definitions separately.

| Case / proof identity | Exact pinned contract and proposed native treatment |
| --- | --- |
| M1 endpoint / outer union | Both start and end accept object or string. An absent own endpoint key inherits the default through `{ ...defaultEdgeOptions, ...edge }`; an own endpoint key with undefined shadows that default and yields no resolved URL; an own empty string also shadows the default and yields no URL. The separate definition collector uses endpoint-or-default truthiness and can still generate an unused default-object definition for own undefined or empty string. Never infer an effective URL from the existence of a definition. Null endpoint is outside the type. Preserve Flow legacy built-in string behavior as an explicit difference; propose other logical string refs through an owner registry only after separate native API approval, described below |
| M2 object type / enum / template branch | Type is required; `arrow` and `arrowclosed` are the two runtime values. Unknown symbol calls error009 and produces no symbol (`MarkerSymbols.tsx:48`). Proposed Flow boundary rejects invalid type atomically before accepted graph/DOM change, rather than emulating error rendering |
| M3 color presence / union | Missing color inherits defaultColor; own undefined survives the spread and the symbol destructuring defaults to `none`; own null/empty suppress truthy color styles. A nonempty string is forwarded, including CSS color strings beyond Flow's existing edge-stroke hex restriction. Arrow has explicit fill `none`; closed arrow has truthy color-driven fill/stroke. Assert generated style and computed SVG output separately |
| M4 width / height | Optional numbers, defaults 12.5 only for undefined (`MarkerDefinitions.tsx:16`). Explicit zero must stay zero. Pinned types do not reject negative/nonfinite numbers; propose finite nonnegative boundary constraints, with the rejection recorded as a native difference pending review. Null is invalid, not default |
| M5 markerUnits / orient | Optional strings; defaults `strokeWidth` / `auto-start-reverse` only for undefined (`MarkerDefinitions.tsx:18`). Preserve exact strings, including `userSpaceOnUse`, numeric orientation text, empty and nonstandard strings; avoid narrowing to an enum. Browser handling of invalid SVG strings is separate from typed acceptance. Null is invalid |
| M6 strokeWidth | Optional number, symbol default 1 only for undefined (`MarkerSymbols.tsx:8,26`); explicit zero stays zero. Proposed finite nonnegative boundary constraint as M4; width/height and edge stroke width are separate properties |
| M7 geometry, IDs, ownership and lifecycle | Pinned object viewBox `-10 -10 20 20`, refX/refY 0, round caps/joins, open points `-5,-4 0,0 -5,4`, closed points include final `-5,-4` (`MarkerDefinitions.tsx:29`, `MarkerSymbols.tsx:15,33`). IDs identify definitions, not graph authority. Compare placement/orientation and actual definition ownership, not exact allocated ID text |
| M8 EdgeProps | Optional **resolved URL strings** or undefined, not marker configuration objects (`EdgeWrapper/index.tsx:244`). Default and custom native edge paths must receive consistent endpoint URL projections. Zero graph mutation from reading renderer props |

The real MiniMap path is the public additional component → `packages/react/src/additional-components/MiniMap/MiniMap.tsx:170` → `:201` MiniMapNodes → `MiniMapNodes.tsx:86` owner lookup → `:94` absolute position and `:95` dimensions → `:111` native NodeComponent → `MiniMapNode.tsx:26` SVG output. The component viewBox is graph-space (`MiniMap.tsx:192`), rather than scaled node props. `MiniMap.tsx:158` resolves the clicked node from its own lookup and forwards the event/current user node to the whole-component callback; the assigned NodeProps callback itself is `(event, id) => void`.

| Case / proof identity | Exact pinned contract and proposed native treatment |
| --- | --- |
| N1 id / geometry | Required id:string and x/y/width/height:number (`types.ts:116`). Use owner graph node identity and absolute graph coordinates, not scaled pixels. Dimensions prefer measured, then width/height, then initial width/height, then 0 (`system/src/utils/general.ts:351`). Missing node, hidden node, or unknown dimensions suppress rendering (`MiniMapNodes.tsx:106`); explicit zero dimensions are known, not missing. Flow's declared/default measurement rules remain its own reviewed boundary, with 065/074 integration before final proof |
| N2 color | Optional string. Default renderer fill is `color |  | style.background |  | style.backgroundColor` (`MiniMapNode.tsx:22`), so empty color falls through; custom renderer receives the original optional/empty value. Missing/undefined are not injected literal defaults. Null is invalid typed input |
| N3 strokeColor / strokeWidth | Optional string/number. Passed directly as native style (`MiniMapNode.tsx:34`). No per-node strokeWidth initializer (`MiniMapNodes.tsx:23`). Preserve explicit zero and empty stroke strings; proposed finite nonnegative numeric validation. Missing is CSS fallback, not an injected number |
| N4 borderRadius / className | Required props. Runtime border radius default 5, class default empty (`MiniMapNodes.tsx:21`). `rx` and `ry` map radius; base class + selected class + supplied class. Native current default presentation differs; preserve that compatibility and use exact props for the new custom renderer path, rather than silently asserting old default parity |
| N5 style / CSSProperties | Optional original node.style is forwarded to **custom** NodeComponent (`MiniMapNodes.tsx:116`). Default renderer only reads background/backgroundColor and builds fill/stroke/strokeWidth; it does not spread arbitrary CSSProperties onto its rectangle. Do not fake complete style support by implementing only two keys for custom props. Native style equivalent and original graph style source require the 074 contract described below |
| N6 selected | Required boolean, projected with `!!node.selected` (`MiniMapNodes.tsx:117`), controls selected class. Transient selection is excluded from saved data. Controlled rejected proposals must not change accepted-derived custom props |
| N7 shapeRendering | Required string, selected as `crispEdges` on server or window.chrome, otherwise `geometricPrecision` (`MiniMapNodes.tsx:36`); forwarded to SVG attr. This field is assigned even though the plan prose's shorter list omitted it. Propose the same native feature-detection default; do not persist it or narrow string inputs to two literals |
| N8 onClick / arguments / result | Optional host-local `(MouseEvent, id:string) => void`; missing handler attaches no node callback (`MiniMapNode.tsx:40`). Native DOM MouseEvent differs from React's synthetic event wrapper. Callback return is void; no graph action from arbitrary return values. Event origin, id, ordering and teardown require real browser tests; do not serialize callbacks or claim React scheduling parity |

The light CSS fallback is fill `#e2e2e2`, stroke transparent, strokeWidth 2; dark fill is `#2b2b2b` (`packages/system/src/styles/init.css:19,43`). The fallback chain is at `:383`, and whole-MiniMap literal option CSS variables are at `MiniMap.tsx:181`. Those values are computed CSS behavior, not necessarily props delivered to a custom renderer. Whole-MiniMap sizing, mask, navigation, option callbacks and UI defaults remain 058; this review does not reopen them.

## Current Flow production paths

**Vanilla markers:** `apps/vanilla/src/public.ts:7` → `mount-flow.ts:8950` mountFlow → options and document decoding at `:8962,8966` → core `flow.schema.ts:420` decode plus integrity validation/spans → `mount-flow.ts:1483` native owner → `:1616` createEdgeRenderer. Public update re-decodes at `:9592`; host accepted replacement is detached then committed/reconciled/published at `:8795`. `edge-renderer.ts:455` owns interaction/DOM state; endpoint geometry/renderer context is supplied through the existing renderer path, and `:473` resolves stroke/markers → `:489` marker-start/end → `:89` generated definitions. Owner scope is allocated at `:49`; removal destroys native renderer at `:539`, dead definitions are removed at `:565`, and teardown clears markers at `:636`. Existing marker size is 12.5 with pinned-looking polyline geometry, but color follows edge stroke and there is no object/member proof. `mount-flow.ts:593` custom edge context lacks resolved marker URL props: explicit M8 extension is needed.

**Vanilla MiniMap:** mountFlow owner above → `mount-flow.ts:7816` createCanvasUI → `:2192` graphFor using accepted document, measurements and rendered positions → `:2199` update passes visible node absolute geometry → `canvas-ui.ts:421` bounds/scale → `:451` scaled rectangles, minimum 1-pixel dimensions, radius 1 at `:464`, class at `:465`. Owner destroy is `canvas-ui.ts:563`. Current CanvasUINode at `:5` has only geometry, no selected/style/custom renderer. Style at `apps/vanilla/src/style.css:153` is fill #93c5fd, stroke #1d4ed8, width .8px. Those are native defaults, not pinned defaults.

**Vue markers:** `packages/vue/src/public.ts:1` FlowCanvas → `flow-canvas.ts:731` canvas-scoped ID → `:792` initial document boundary / `:806` accepted/controlled owner selection → `:1023` core graph projection → `:4358` owned definitions and `:4504` resolved URLs → native default SVG renderer at `:386` or custom renderer props at `:4566`. IDs include owner/kind/stroke (`:400`). Definitions use size10, ref9/5, viewBox0..10 and paths (`:4383`), so source is visibly different from pinned object geometry. VNode removal/unmount owns cleanup; source alone does not establish lifecycle parity.

**Vue MiniMap:** `packages/vue/src/public.ts:5` FlowMiniMap mounted inside FlowCanvas → `flow-canvas.ts:2536` accepted document + transient measurement graph → `:2557` owner context → `minimap.ts:28` injection / `:40` core selectFlowMiniMapProjection → `:114` rectangles. Current props are scaled and radius2 (`:121,125`); selected/style/custom-node props are absent. Recenter uses owner useFlow at `:37` and point conversion at `:53`; whole navigation stays058. Current style at `packages/vue/src/style.css:421` is #64748b / #334155 / .75px with non-scaling stroke.

**Foldkit markers:** `packages/foldkit/src/public.ts:1` createProgram → `application.ts:2459` native Runtime → owner instance at `:2472` → `Graph.makeView` at `:2474` → one validated model/view at `:2482,2502`. HostAction.ReplaceDocument's schema is at `:149`; accepted routing/publication occurs at `:1744`. `graph.ts:2601` uses the owner model, resolved handles and transient measurements for endpoints; `:2655` builds owner/edge/endpoint IDs → `:2683` marker definitions → `:2710` edgeVisuals → edge SVG/defs at `:3107,3144`. Size6, ref10/5, viewBox0..10 and path geometry differ from pinned objects. Custom Foldkit renderer receives marker IDs in FoldkitEdgeGeometry (`:2277`), so add resolved URL strings without silently replacing existing ID fields.

**Foldkit MiniMap:** `packages/foldkit/src/public.ts:37` createFlowMiniMap → actual demo composition `apps/foldkit/src/main.ts:346` with ownerDocument, Runtime viewport client and derived graph → accepted snapshot decode at `:381`, graph creation at `:391`, update at `:392` → `packages/foldkit/src/ui.ts:406` native owner → `:427` pure projection → `:464` scaled rectangles. Measurement and viewport updates remain projections, not a second authoritative graph. Root click at `:489` and owner disposal at `:525` remove native listeners/DOM; actual Runtime teardown invokes disposal at `main.ts:588`. Style at `packages/foldkit/src/style.css:19` is #94a3b8 / #475569 / .5.

**Shared geometry:** `packages/core/src/domain/flow-minimap.ts:46` returns bounded scaled node rectangles (`:77`) and pointToGraph (`:95`). The new renderer-props projection must take the same accepted FlowGraphView and expose absolute graph-space values separately; do not repurpose these existing scaled fields while calling them upstream props. `flow-edge.schema.ts:37` resolves accepted owner nodes/handles; `:55` pure attachment geometry remains shared. No host imports DOM into core.

## Proposed public contracts and ownership

All names in this section are proposals for independent review, not exports already present. Serial types derive from Effect4rc116 schemas; installed repository manifests pin Effect/platform rc116, Foldkit0.163.0, Vue3.5.43. No new dependency is needed.

1. Retain existing `FlowEdgeMarkerSchema` / `FlowEdgeMarker` as the two-value kind contract for compatibility. Add `FlowEdgeMarkerConfigurationSchema` with required type using that kind schema, optional `String | null` color, optional finite-nonnegative width/height/strokeWidth, optional String markerUnits/orient; add a live marker value union of String and that configuration. Both enum-style exported named constants and literal strings map to the same kind schema. Widen the live edge fields only after the persistence stage below. Do not derive frozen v1 schemas from this union. Inputs null/arrays/wrong primitives/type omissions/nonfinite numbers are decoded atomically; explicit zero and empty strings remain meaningful. Numeric restriction is a proposed native difference requiring review, not upstream type parity.

2. Detach decoded marker configurations from caller objects at the public boundary. Pure helpers resolve effective values, endpoint placement data and a canonical descriptor while retaining endpoint and nested color presence. Flow already applies defaults by the same spread at `packages/core/src/domain/flow-default-edge-options.ts:82-85`: absent endpoint inherits, own undefined shadows. Preserve that distinction through accepted public reads; do not implement endpoint defaults with `??` or `||`. Empty string also shadows for the proposed live union. Allocate DOM IDs from an opaque owner-local descriptor map, rather than concatenating unsanitized user color/ref strings or publishing IDs into accepted graph. Equivalent descriptors may share definitions within one owner; different owners never share DOM. Drop definitions only after the owner no longer references them. Runtime updates replace references consistently before unused-definition removal; hidden/deleted edges and late callbacks must not retain active references. Flow's owner-local collection may omit pinned unused default definitions as a documented collection difference, but must match the reviewed effective endpoint/URL behavior and prove that one owner does not collect another owner's definitions. Edge z-order stays existing graph/native owner policy.

3. Preserve `arrow` / `arrowclosed` strings as **legacy generated built-ins**, including current per-host geometry/color until an explicit appearance change is independently reviewed. Object type values use the exact new M2–M7 behavior/defaults. Recommend treating other strings as logical names for caller-owned definitions, with empty string producing no URL. The proposed owner-local `markerDefinitions` registration is an **explicit new native API requiring independent scope and design approval**; the upstream raw string union does not authorize adding it. Its proposed native factories/slots/components own mount/update/dispose, and the adapter translates a logical name to its unique SVG ID without resolving a foreign canvas through a global selector. The proposed unresolved-name policy is no usable marker URL plus a structured owner-local diagnostic, leaving the valid accepted graph unchanged. Whether unresolved registrations instead reject a configuration update remains a review choice. Functions never enter core graph or saved JSON. The independent reviewer must approve exact interfaces, option/slot names, definition ownership, missing-name behavior, disposal rules and affected public/native source paths before implementation. Until then the string-reference cells remain open; no registry or automatic reinterpretation is authorized by this report. Literal `arrow` registration cannot override the legacy meaning. A tagged reference value solely to reference a caller marker named `arrow` would be another new API branch beyond the original union and needs separate approval; none is proposed for implementation here.

4. Add readonly resolved markerStart/markerEnd URL strings to Vanilla custom edge context; retain Vue existing URL props; add URL fields to Foldkit geometry while keeping existing marker ID fields. The accepted edge object still contains the serial marker input. URL allocation is view-local, never persisted. Preserve custom renderer lifecycle and default endpoint geometry from054.

5. Add a schema-derived readonly MiniMap node data projection with required NodeId, absolute x/y, actual width/height, boolean selected, borderRadius, className, shapeRendering; optional color/strokeColor/strokeWidth/style representation. Numeric geometry is finite; dimensions/radius/stroke width are nonnegative. All local option functions/resolvers receive only this owner's accepted readonly node. A separate native props type adds optional `(event: globalThis.MouseEvent, id: NodeId) => void` and renderer integration. The event isn't a schema field. Missing/undefined optional strings remain absent; null is invalid. Required id/geometry/selected cannot be caller-overridden to misrepresent graph identity.

6. Keep existing MiniMap screen projection for existing default UI. Deliver graph-space values to custom renderers inside a scoped SVG group applying the projection transform, so node x/y/dimensions need no hidden scale. Keep the mask/background/viewport/navigation owned058. Existing default minimum-pixel size and radii/colors are native compatibility differences, not evidence for N1/N4 parity. Custom shape hit-testing uses native composedPath/owner-root containment and actual rendered node identity; root recenter behavior/callback ordering remains058 and must be recorded in browser comparison. Native point-to-graph conversion stays the same pure projection, and graph coordinates do not change with canvas CSS size or viewport zoom.

7. Use a keyed native renderer lifecycle: Vanilla and Foldkit accept a local SVG factory returning owned element plus update/dispose; Vue accepts its native component/slot. Props update on accepted graph/measurement/presentation changes; hidden/deleted nodes remove and dispose their instance once; changing renderer replaces each owned instance once; owner teardown is idempotent, suppresses later callbacks and disposes children before releasing the parent context. Unchanged node IDs preserve custom instance identity. Reentrant callback update/removal/disposal rechecks active owner and generation before any subsequent action; capture callback generation for one dispatch. The adapter supplies a guarded onClick thunk for the node identity; the default renderer attaches it and a custom renderer chooses whether to invoke it, as the pinned custom component does. Do not also install a second delegated callback that double-delivers the same click. With normal bubbling, the node callback precedes the owning root handler; native stopPropagation is respected. Root navigation stays058 and must recheck owner activity after a reentrant node callback. Deleted, foreign or disposed node thunks become silent. No renderer registry, MouseEvent, function, element or DOM state goes through Foldkit ports or persistence.

8. **Style source is an explicit 074 dependency.** The current FlowNode schema has no style (`flow.schema.ts:63`); `types/node::074::style` owns the original field. 073 may consume the reviewed 074 schema/projection, not invent a graph style field or place an alternate style document beside the graph. Native presentation resolvers can provide a local style during a partial implementation, but cannot close the original node.style → MiniMapNodeProps.style mapping. Proposed serial style contract supports the full reviewed CSS property representation (string, finite number, optional undefined, custom properties); reject functions/DOM/cyclic data before native configuration publication. Vue's native CSSProperties and Vanilla/Foldkit native style equivalents must be mapped without casts or a two-key-only custom renderer restriction. The default rect reads only background/backgroundColor as pinned; a custom renderer receives the full detached style. Exact CSS property/unit typing comes from 074's reviewed contract, not a new dependency or improvised CSS whitelist. Consumer tests must include background, backgroundColor, numeric dimensions, another unrelated valid CSS property and a custom property, plus invalid function/DOM values. The final CSSProperties member remains open until this shape and propagation are independently reviewed.

Proposed public usage, illustrative only:

```ts
// All three accepted-document hosts consume the same schema-decoded marker value.
const edge = {
  id: 'e',
  source: 'a',
  target: 'b',
  markerStart: { type: 'arrow', color: null, width: 0 },
  markerEnd: {
    type: 'arrowclosed',
    color: '#336699',
    width: 16,
    height: 14,
    markerUnits: 'userSpaceOnUse',
    orient: '45',
    strokeWidth: 0,
  },
}
// Existing callers may continue markerEnd: 'arrowclosed'.
// New caller-owned definitions may be referenced by markerEnd: 'local-annotation'.
```

Vanilla proposes `mountFlow(root, document, { minimap: true, miniMapNodeRenderer, miniMapNodePresentation, onMiniMapNodeClick, markerDefinitions })`. Vue proposes `<FlowMiniMap :node-component="NativeMiniMapNode" :node-presentation="presentation" @node-click="onNodeClick" />` inside the owner FlowCanvas, and an owner-local marker-definition slot/registry on FlowCanvas. Foldkit proposes an optional native configuration argument to `createFlowMiniMap(ownerDocument, canvas, viewportClient, graph, viewport, nativeOptions)` plus markerDefinitions in the existing renderer registry. Each markerDefinitions registration/slot is the new native API described above and requires its own independent scope/design approval, even where its proposed source path is already listed by073. Spellings are review proposals: do not implement conflicting parallel option names if058 already accepts the relevant native option. Both normal and controlled production examples must show actual public accepted props and disposal; the examples above are not executed consumer evidence.

Malformed input is rejected before an accepted document/viewport notification or partial DOM/configuration change. Stage native registration changes before replacing old owned resources; dispose the failed staged resources while retaining accepted graph and the previous registration. Core graph decode is already `flow.schema.ts:420`; reuse that workflow and its documentDecode/documentIntegrity spans. Native mount/dispose/reconcile/failure boundaries use FlowSpan.hostMount, hostDestroy, browserLifecycleClose, domReconcile and FlowAttribute.failureName/failureMessage/edgeId/nodeId/controlMode (`telemetry/flow-telemetry.ts:1,34`). Do not introduce pointer-move logs or claim OTLP delivery. Renderer exceptions are native resource failures, not permission to mutate/drop accepted graph.

## Frozen persistence seam: required separate review before source

Current `flow-persistence.ts:13` and `:17` derive saved schemas from the live node/edge schemas; the v1 body at `:21` inherits those fields. `:43` and `:61` encode current fields directly, and `:55` / `:70` decode through normal graph integrity. Live marker objects or newly accepted non-built-in string references would therefore leak into v1 or fail the synchronous legacy encoder. A raw Foldkit snapshot request must not defect its Runtime or leave a correlated request pending.

075's reviewed stage freezes all v1 field sets and constraints; its exact extension predicate at `plans/075-review-native-field-persistence.md:112` includes only origins, new connectable/roles and empty existing ARIA branches. Marker objects/references are **not** in that predicate or approved failure-code union. Do not silently append them. Legacy fields must remain optional literal `arrow | arrowclosed`, with old v1 decode unknown-key stripping and literal-v1 return types unchanged. Absent and own-undefined existing endpoints each retain their old legacy optional-field/encoding policy; this does **not** mean they produce equivalent effective marker URLs or that JSON preserves an own undefined key. Under caller-restored defaults, omission can change the resulting marker. That existing v1 limitation is frozen, not retroactively repaired by a new rejection rule.

Request an independently reviewed staged amendment to070/075, owned by the coordinator:

1. Consume the checked frozen-v1 prerequisite before live marker widening. Propose a marker-extension predicate for values outside frozen v1: any defined markerStart/markerEnd object or nonempty non-built-in logical reference requires the supported versioned format; empty string also needs a stated rule (recommend extension-format representation since legacy v1 cannot encode it). Own undefined on these **existing** endpoint keys must not become a new legacy failure simply by copying the new-role own-key predicate. Separately, recommend that the additive versioned encoder choose v2 for any own-undefined endpoint so it can preserve effective behavior through JSON; that version choice and its presence encoding require independent review. It must not depend on whether current default-edge options happen to define a marker: the caller may restore with or later apply different defaults. This intentionally separates a proposed additive lossless-format choice from the frozen legacy encoder's acceptance policy. Check the validated raw shape before legacy projection and JSON omission. Combine actual legacy rejection reasons with origins/native fields deterministically, retaining origin precedence and reviewed native precedence. No predicate, encoder, schema or failure enum changes are approved or implemented by this report.
2. Propose extending the same unreleased v2 once rather than releasing an intermediate format and then silently changing it. Add dedicated saved marker codecs, explicit legacy format rejection and precise additive reader rules. The reviewer must choose a marker-specific failure code versus an existing code; recommend `marker-fields-require-versioned-session`, after existing origin/native codes in deterministic priority. This code is a proposal, **not** part of approved075. Consume the reusable correlated snapshot client and snapshotFailures protocol after **075 stage1 independently reviews and accepts that client integration** (`plans/075-review-native-field-persistence.md:171,184` and `plans/075-legacy-prerequisite-execution.md`). The client originated in064 but this accepted component seam does not require acceptance of all stopped064 selector/observer work. Never copy the remaining064 partial source or add a competing request owner. Pending requests settle once on success/failure/disposal; late/duplicate replies are ignored; graph/viewport remain unchanged after save failure. Marker source remains blocked on checked075 stage1 and the separately reviewed marker codec/predicate/failure amendment.
3. Color presence requires stronger review than075 roles. Role own undefined and restored absence both inherit, so075 explicitly declines own-key JSON round-trip. Marker own `color: undefined` instead renders symbol-default `none`, while missing color can inherit global color. Omitting undefined would change rendered behavior on restore. Missing, own undefined, null, empty and concrete strings need separate encode/decode and post-restore computed SVG assertions under a nonempty global color.
4. Endpoint presence is another semantic own-undefined case, separate from nested color. For each start/end endpoint, absent key plus a default object/string inherits a URL; own undefined shadows that same default and suppresses the URL; own empty string also suppresses the URL but survives JSON as a concrete value. A plain JSON round trip turns own undefined into absence and can activate a caller-restored default marker. The proposed v2 codec must decide and test this explicitly; color-only presence encoding is insufficient. Keep the existing v1 optional endpoint policy frozen and mark the added saved-endpoint representation as a separately reviewed requirement, not an approved schema or failure-enum expansion.

For color, compare these precise alternatives:

| Alternative | Exact behavior | Assessment |
| --- | --- | --- |
| **Lossless saved-marker-only presence encoding (recommended)** | A dedicated v2 encoded object reserves optional `colorPresence: 'explicit-undefined'`; it is mutually exclusive with a color value. Encode own undefined as that discriminator, missing as neither key, null/empty/string as the actual color. Decode discriminator into an own undefined color before normal graph decode. Reject malformed flag/color combinations and forged extension semantics in a v1 envelope | Retains the original optional undefined API behavior and computed output. Requires explicit saved codec/schema review; the discriminator is never an accepted live marker prop or DOM attribute |
| Boundary semantic normalization | Decode explicit undefined into a concrete `color: 'none'` and save that string | Can retain basic symbol visual output but changes accepted/public field values, raw IDs and custom edge input. Does not conform to original optional-value identity without a reviewed native difference. Test CSS overrides and both symbols before adopting |
| Boundary rejection of own undefined | Reject an own undefined color, while permitting missing/null/empty | Simpler JSON, but drops a legitimate original optional branch. Not recommended; requires explicit difference review and negative boundary tests, never silent normalization |

For endpoint presence, compare these further independently reviewable choices:

| Alternative | Exact behavior | Assessment |
| --- | --- | --- |
| **Lossless saved-edge-only endpoint presence encoding (recommended)** | Propose optional saved-edge `markerEndpointPresence: { start?: 'explicit-undefined', end?: 'explicit-undefined' }`. A flagged endpoint must have no encoded marker value; absence without a flag means inherit. Decode each flag into an own undefined endpoint before normal graph decode/default application. Preserve explicit empty strings and valid marker values in their own fields. Reject flag/value conflicts and malformed metadata; distinguish additive rejection of known forged v1 semantics from the unchanged frozen v1 reader | Preserves both endpoints under the same caller-restored defaults and after later default-option changes. Requires an independently reviewed v2 codec and additive format-selection rule; metadata never becomes a live edge field, renderer prop or port-side function |
| Normalize own undefined to empty string in the versioned codec | Encodes a persistent concrete suppression value that produces no URL after restore | Changes accepted/public value and key semantics; empty string is outside frozen v1. Requires an explicitly reviewed native difference and a versioned-only rule. Does not authorize changing legacy input/output |
| Permit omission or reject own undefined only in the additive boundary | Omission changes own undefined into inheritance; rejection declines a valid original optional branch | Omission loses effective behavior under restored defaults; rejection drops supported input for that new API. Neither is recommended. Any selected limitation needs explicit review and real restore/default-update tests, while legacy APIs stay unchanged |

All choices require a reference capture of actual own-property endpoint and nested color cases, not JSON-generated inputs that already erased undefined. Within a marker object, own-undefined width/height/markerUnits/orient/strokeWidth take the same defaults as omitted fields; that statement does **not** apply to outer markerStart/markerEnd or nested color. Raw object-ID differences may be normalized only with recorded reasons. If raw public own-key identity must persist for all fields, extend the saved codec losslessly for those exact fields under independent review rather than making an implicit promise. The reference needs are effective endpoint URL and computed color output, not reproducing pinned sorted-key ID text or mistaking unused definitions for active markers.

Styles, renderer registrations, callbacks, owner IDs/URLs, current selection, transient measurement and shapeRendering decisions remain outside saved graph state. Accepted node.style, if added by074, has its own persistence review; it is not authorized as part of this marker amendment. No implementation may choose an easier host-local parallel document to evade this seam.

## Dependencies, exact scope amendments and STOP boundaries

Required design decisions before source: independent review of this complete matrix;075 checked frozen legacy stage and independently accepted reusable correlated client integration; independent marker predicate/endpoint-and-color presence codec/additive format-selection/failure amendment; separate scope/design approval for the proposed native markerDefinitions API;068 global default-color precedence snapshot;074 accepted node.style representation for final N5; existing058 option names/ownership;069 generic integration before final acceptance. 065's accepted measurement projection and067/070 origin projection may change composite node coordinates/dimensions; consuming tests must rerun when those accepted snapshots integrate. Existing054 renderer ownership is reused, not reopened wholesale. Distinguish the reusable client seam accepted through075 stage1 from064 selector/observer ownership closure, which remains stopped/open. Marker migration may consume the former without accepting all of064; do not copy064's other partial source.

Plan073 already permits listed schemas, mount/canvas-ui, Vue canvas/minimap, Foldkit graph/ui, barrels, named new routes/suites, capture/harness/fixture/conformance, consumers and docs. Exact additional scope needed for independent approval:

- `apps/vanilla/src/edge-renderer.ts` and adjacent focused test: it owns marker defs/URLs/GC, not mount-flow alone.
- `packages/core/src/domain/flow-minimap.ts` and adjacent focused test: add the pure graph-space node-props projection without changing old scaled projection meanings. Keep schema contracts here or in already authorized core domain files; do not invent another package.
- Native markerDefinitions registration/slot APIs: obtain independent scope/design approval for the exact Vanilla mount options, Vue FlowCanvas slot/registry and Foldkit renderer-registry changes, including public exports and their lifecycle. Existing073 file scope alone does not approve this new API.
- Marker saved-codec/failure/client files stay in the separately reviewed070/075 scope, not a blanket073 persistence expansion.
- `apps/foldkit/src/main.ts` only if integration of new public native options requires its existing Runtime/MiniMap composition and teardown; request this exact extension before editing. New production route fixtures do not substitute for this actual demo composition.

Stop before live schema widening if checked075 stage1 or the separately reviewed persistence amendment is absent; before registry implementation if independent native markerDefinitions scope/design approval is absent; before N5 closure if074 style is absent; before generic closure if069 remains blocked; before any source outside exact approved scope; on unsafe casts/private stores/cross-owner DOM/second graph; on required repeated gate failure per073. Do not claim complete073 from this design, a structural checker, an existing page status, old renderer fixture, or source similarity. All original gaps remain open until their own evidence/review exists.

## Production, reference and consumer assertions

Existing production paths are separate: Vanilla `apps/vanilla/e2e/renderer-contract.e2e.ts:43` imports public mountFlow and mounts two real owners at `:127`; Vue e2e `:18` imports the native fixture, whose `apps/vue/src/renderer-contract.ts:9,203` uses public FlowCanvas; Foldkit e2e `:23` imports test-harness, whose `apps/foldkit/e2e/test-harness.ts:19,626` creates the real Runtime. Existing marker ownership assertions are Vanilla `:170`, Vue renderer-contract e2e `:357`, Foldkit `:111`. They do not assert all new object/color/MiniMap fields.

Existing pinned fixture is a different route: `scripts/capture-renderer-contract-reference.ts:13` fixes SHA, verifies checkout at `:87`, and asserts stable two-sample capture at `:187`; `research/harnesses/renderer-contract/main.tsx:263` mounts pinned ReactFlow via createRoot at `:284`. It is an exemplar, not the required073 comparison. No fixture was generated/modified in this review.

Prerequisite reconciliation: the status records at053/054/055/056 plan line16 record accepted measured geometry, native renderer ownership, viewport operations and interaction lifecycles; use those paths rather than replacing them. This review did not rerun their recorded checks. 058 line16 remains IN PROGRESS despite its accepted reusable-UI slice, so whole-MiniMap option completion is not inherited. 059 line16 leaves recipe implementations open and supplies no named073 proof. 061 line16 records packed adapter acceptance, but every new export/renderer prop still needs a fresh consuming archive probe. Parent057/066 remain open; none of these statuses replaces the exact101-member evidence.

After approval, add the three named NEW marker-minimap-members test entries/HTML routes/suites from Plan073. They import published host exports, not private graph publication. Each scenario emits identity-bearing observations mapped to the exact appendix member and host. M1–M8 and N1–N8 are behavioral case families; each member still needs its own proof record rather than a shared generic claim.

Required observations:

- M1–M8: every endpoint × symbol kind × outer value branch; enum-style and literal positive typing; raw external refs including `arrow`, empty and missing definitions; missing/ownundefined/null/empty/concrete color under nonempty global color; default and explicit zero/dimensions/units/orient/stroke width; marker DOM attrs, computed stroke/fill, endpoint direction, resolved custom-edge URL strings and owner definition containment. For both start/end, cross absent own key, own undefined, own empty string and explicit string/object against absent, string and object default-edge markers. Assert raw accepted own-key/value, spread-resolved endpoint, custom-edge URL and default-path marker attribute separately from the pinned collector's possibly unused default definition. Update default options after each case: absent inherits changes while own undefined/empty suppresses. Invalid type/null numeric/null strings/nonfinite/negative tests verify atomic boundary behavior and distinguish proposed native differences.
- Two mounted owners with colliding node/edge/logical marker IDs: update one, remove/hide edge, replace options, change z and destroy first owner while second markers remain. Shared-in-owner definition refcounts and keyed custom renderer cleanup must be asserted. No ID text parity; canonicalize owner tokens only after checking owner separation.
- N1–N8: actual graph-space positions/dimensions under nesting/measurement/viewport changes, no hidden/missing node, explicit zero handling, required class/radius/shapeRendering/selected, optional colors/stroke defaults versus computed CSS, full style forwarded to custom component and restricted default rect consumption, and actual native event origin/id/void callback. Update accepted document/style/selection, reject controlled proposal then acknowledge once, replace callback/renderer, unsubscribe/reentrant removal, node deletion and idempotent owner teardown; no foreign events or post-disposal notifications.
- Frozen persistence: old fixture/string arrows/v1 types/readers and unchanged legacy own-undefined endpoint acceptance/JSON limitation; marker-extension legacy failure without graph change; combined origin/native/marker v2; exact nested-color semantic round-trip with global color; both endpoints' absent/own-undefined/empty/explicit-value round trips restored under the same and changed caller default-edge options, then updated defaults; raw own-key presence, effective URLs and actual SVG output remain separate assertions. Cover malformed endpoint presence flag/value conflicts, color presence conflicts, version/object rejection atomically; no legacy failure-code expansion for own-undefined endpoints alone. Verify the additive encoder's independently reviewed v2 selection without treating that rule as the frozen legacy rejection predicate. Cover correlated Foldkit response/disposal/late reply paths. These tests belong the reviewed migration scope plus consuming production suites.
- Packed consumers: positive/negative marker unions/type enums/CSS/native event props/resolved URL types; generic069 inference on custom node/edge data. No `as` escape to force an unsound event/style/renderer type. Negative wrong-type null, missing required type, function/DOM serial payload and wrong callback arguments.

NEW `capture-marker-minimap-reference.ts --checkout /absolute/clean/pinned/tree` uses the full verified checkout and its real React public entries. Capture two independent stable runs after harness type/quality preflight; normalize only owner allocation tokens, measured tolerances and synthetic/native event representation with explicit explanations. Preserve own-property construction for undefined cases and CSS computed values. NEW conformance test compares that fixture's public payloads with normalized actual production outputs; it must not reconstruct reducer/state or turn React timing into a native guarantee. Date current official page drift separately if later browsing is requested; it is not executable proof.

Implementation gates remain the complete073 commands (frozen install, check, typecheck, architecture, unit, three serial new production suites, pinned capture, conformance, consumer, docs generation/check, trace/member/catalog checks, full `bun run verify`, diff check). Coordinate strict browser ports with the root. No new skips; existing two native-device skips remain reported. Local, hosted CI, devices, upstream runtime and collector evidence stay distinct. These are intended gates, not results of this read-only task.

## Complete assigned matrix

Every group below is primary owner073 on Vanilla/Vue/Foldkit. The manifest currently targets mountFlow / FlowCanvas / createProgram respectively, named NEW per-host marker-minimap-members production tests, and NEW capture-marker-minimap-reference.ts. Those are entry roots, not existing implementation evidence. MiniMap rows additionally need actual FlowMiniMap/createFlowMiniMap/mountFlow minimap paths above; core schema exports and native props consumer probes are necessary type targets. Coordinator accounting changes are deferred to reviewed integration.

The full exact IDs follow. M/N cases refer to the concrete field/default/lifecycle rules above, not completion statuses. Dated text rows below transcribe the original descriptions/rawSourceRow; formatting ticks and obsolete source-citation tokens are omitted where noted. The original catalog remains authoritative, and no defaults are inferred from joined/unparsed rows. Counts: Edge40 + EdgeMarker22 + EdgeProps4 + MarkerType1 + MiniMapNodeProps34 =101; 30 groups × their members ×3 hosts =303 cells.

### `types/edge::073::Edge` — 38 records

```text
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd → M1/M7/M8
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType> → M1
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:1> → M1 string
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2> → M2–M7 object
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker> → M2–M7
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color → M3
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color.<union:1> → M3 string
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color.<union:2> → M3 null
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.height → M4
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.markerUnits → M5
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.orient → M5
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.strokeWidth → M6
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type → M2
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1> → M2 enum
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType> → M2 enum
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType>.Arrow → M2 Arrow
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType>.ArrowClosed → M2 ArrowClosed
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:2> → M2 template-literal
Edge#1.<intersection:1>.<type:EdgeBase>.markerEnd.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.width → M4
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart → M1/M7/M8
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType> → M1
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:1> → M1 string
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2> → M2–M7 object
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker> → M2–M7
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color → M3
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color.<union:1> → M3 string
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.color.<union:2> → M3 null
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.height → M4
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.markerUnits → M5
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.orient → M5
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.strokeWidth → M6
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type → M2
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1> → M2 enum
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType> → M2 enum
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType>.Arrow → M2 Arrow
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:1>.<type:MarkerType>.ArrowClosed → M2 ArrowClosed
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.type.<union:2> → M2 template-literal
Edge#1.<intersection:1>.<type:EdgeBase>.markerStart.<type:EdgeMarkerType>.<union:2>.<type:EdgeMarker>.width → M4
```

### `types/edge::073::markerend` — 1

`markerend` → M1/M7/M8. Dated row: `markerEndEdgeMarkerTypeSet the marker on the end of an edge.`

### `types/edge::073::markerstart` — 1

`markerstart` → M1/M7/M8. Dated row: `markerStartEdgeMarkerTypeSet the marker on the beginning of an edge.`

### `types/edge-marker::073::color` — 1

`color` → M3. Raw row: `colorstring | null Current site row: color | string | null |` (inline-table separators in original rawSourceRow do not imply extra variants/defaults).

### `types/edge-marker::073::EdgeMarker` — 15

```text
EdgeMarker → M2–M7
EdgeMarker#1.color → M3
EdgeMarker#1.color.<union:1> → M3 string
EdgeMarker#1.color.<union:2> → M3 null
EdgeMarker#1.height → M4
EdgeMarker#1.markerUnits → M5
EdgeMarker#1.orient → M5
EdgeMarker#1.strokeWidth → M6
EdgeMarker#1.type → M2
EdgeMarker#1.type.<union:1> → M2 enum
EdgeMarker#1.type.<union:1>.<type:MarkerType> → M2 enum
EdgeMarker#1.type.<union:1>.<type:MarkerType>.Arrow → M2 Arrow
EdgeMarker#1.type.<union:1>.<type:MarkerType>.ArrowClosed → M2 ArrowClosed
EdgeMarker#1.type.<union:2> → M2 template-literal
EdgeMarker#1.width → M4
```

The authoritative pinned declaration is the optional/required field matrix above (`system/src/types/edges.ts:92`); the original named-type record links that same declaration. All nested type-reference and union records retain their own identities.

### `types/edge-marker::073::height` — 1

`height` → M4. Dated row text: `heightnumber Current site row: height | number |`.

### `types/edge-marker::073::markerunits` — 1

`markerunits` → M5. Dated row text: `markerUnitsstring Current site row: markerUnits | string |`.

### `types/edge-marker::073::orient` — 1

`orient` → M5. Dated row text: `orientstring Current site row: orient | string |`.

### `types/edge-marker::073::strokewidth` — 1

`strokewidth` → M6. Dated row text: `strokeWidthnumber Current site row: strokeWidth | number |`.

### `types/edge-marker::073::type` — 1

`type` → M2. Dated row text: `typeMarkerType | "arrow" | "arrowclosed" Current site row: type | MarkerType | "arrow" | "arrowclosed" |` (the catalog contains a source citation token for MarkerType; not interpreted as a runtime value).

### `types/edge-marker::073::width` — 1

`width` → M4. Dated row text: `widthnumber Current site row: width | number |`.

### `types/edge-props::073::EdgeProps` — 2

```text
EdgeProps#1.<intersection:4>.markerEnd → M8 optional string
EdgeProps#1.<intersection:4>.markerStart → M8 optional string
```

### `types/edge-props::073::markerend` — 1

`markerend` → M8. Dated row: `markerEndstring`.

### `types/edge-props::073::markerstart` — 1

`markerstart` → M8. Dated row: `markerStartstring`.

### `types/marker-type::073::MarkerType` — 1

`MarkerType` → M2. Named enum record links `Arrow = 'arrow'`, `ArrowClosed = 'arrowclosed'`; test both named and literal branches rather than merely exporting a named object.

### `types/mini-map-node-props::073::borderradius` — 1

`borderradius` → N4. Dated row: `borderRadiusnumber Current site row: borderRadius | number |`.

### `types/mini-map-node-props::073::classname` — 1

`classname` → N4. Dated row: `classNamestring Current site row: className | string |`.

### `types/mini-map-node-props::073::color` — 1

`color` → N2. Dated row: `colorstring Current site row: color | string |`.

### `types/mini-map-node-props::073::height` — 1

`height` → N1. Dated row: `heightnumber Current site row: height | number |`.

### `types/mini-map-node-props::073::id` — 1

`id` → N1. Dated row: `idstring Current site row: id | string |`.

### `types/mini-map-node-props::073::MiniMapNodeProps` — 20

```text
MiniMapNodeProps → N1–N8
MiniMapNodeProps#1.borderRadius → N4 required number
MiniMapNodeProps#1.className → N4 required string
MiniMapNodeProps#1.color → N2 optional string
MiniMapNodeProps#1.height → N1 required number
MiniMapNodeProps#1.id → N1 required string
MiniMapNodeProps#1.onClick → N8 optional callback
MiniMapNodeProps#1.onClick.arg:event → N8 MouseEvent argument
MiniMapNodeProps#1.onClick.arg:event.<type:MouseEvent> → N8 native/React difference
MiniMapNodeProps#1.onClick.arg:id → N8 string identity argument
MiniMapNodeProps#1.onClick.result → N8 void
MiniMapNodeProps#1.selected → N6 required boolean
MiniMapNodeProps#1.shapeRendering → N7 required string
MiniMapNodeProps#1.strokeColor → N3 optional string
MiniMapNodeProps#1.strokeWidth → N3 optional number
MiniMapNodeProps#1.style → N5 optional CSSProperties
MiniMapNodeProps#1.style.<type:CSSProperties> → N5 full native style equivalent/074
MiniMapNodeProps#1.width → N1 required number
MiniMapNodeProps#1.x → N1 required number
MiniMapNodeProps#1.y → N1 required number
```

### `types/mini-map-node-props::073::onclick` — 1

`onclick` → N8. Dated row: `onClick(event: MouseEvent<Element, MouseEvent>, id: string) => void`.

### `types/mini-map-node-props::073::selected` — 1

`selected` → N6. Dated row: `selectedboolean Current site row: selected | boolean |`.

### `types/mini-map-node-props::073::shaperendering` — 1

`shaperendering` → N7. Dated row: `shapeRenderingstring Current site row: shapeRendering | string |`.

### `types/mini-map-node-props::073::strokecolor` — 1

`strokecolor` → N3. Dated row: `strokeColorstring Current site row: strokeColor | string |`.

### `types/mini-map-node-props::073::strokewidth` — 1

`strokewidth` → N3. Dated row: `strokeWidthnumber Current site row: strokeWidth | number |`.

### `types/mini-map-node-props::073::style` — 1

`style` → N5. Dated row text: `styleCSSProperties Current site row: style | CSSProperties |` (catalog source citation token retained in the original rawSourceRow; no subset inferred).

### `types/mini-map-node-props::073::width` — 1

`width` → N1. Dated row: `widthnumber Current site row: width | number |`.

### `types/mini-map-node-props::073::x` — 1

`x` → N1. Dated row: `xnumber Current site row: x | number |`.

### `types/mini-map-node-props::073::y` — 1

`y` → N1. Dated row: `ynumber Current site row: y | number |`.

## Conformity and deviations

**Conforming design targets, runtime unverified:** object marker fields/defaults, start/end placement and absent/own-undefined/empty effective endpoint distinctions, enum/literal branches, nested color-presence distinctions, resolved custom edge URL props, graph-space custom MiniMap node props, default rect style precedence and full custom style forwarding. Pinned source establishes the reference contracts; NEW per-host production suites plus independent pinned captures/conformance/consumers must establish implementation behavior. None of those comparisons was executed here. The definition collector's unused default objects are a separate observation, not a conforming effective URL.

**Existing native differences to preserve and explicitly review:** string `arrow`/`arrowclosed` creates built-in Flow shapes while pinned strings reference external IDs; native Vue/Foldkit marker geometry and all default MiniMap appearance differ; CSS scaling/minimum dimensions, owner-scoped ref registration, DOM MouseEvent versus React synthetic event and atomic typed rejection are native policies with the test boundaries described above. Their source descriptions are not cell-level reviewed-difference acceptance.

**Unverified / blocked:** global-color068 integration, complete node.style074/CSSProperties and generic069 propagation, measurement/origin composite output, lossless endpoint-and-color marker persistence/additive format-selection amendment, independently checked075 stage1/client integration, separate native markerDefinitions API approval, all new lifecycle/malformed/production/reference/generic/fullverify evidence. Reusable client acceptance through075 stage1 is separate from the stopped064 selector/observer ownership closure; the whole064 plan is not a marker-migration prerequisite. Source implementation remains blocked pending independent architectural review and the exact prerequisite seams. No hosted/device/collector/current-site claim is made; imported upstream evidence and Plan064 partial work remain untouched.
