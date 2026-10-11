# Independent callback and field semantic design review

2026-10-02. **REVISE.** The accounting is intact, but the generated semantics and child assignments need correction before architecture approval. No source dispatch or original member closure follows from this review.

Reviewed against main `841be137e253cf19c665269eaaa79edc19abf3c3`. The frozen inputs are:

| Input | SHA256 |
| --- | --- |
| `interaction-field-continuation-matrix.json` | `33f5c3bc5f6efc386163cd96cf5c456110bf22ed4708542af272ba1482d94972` |
| `interaction-field-continuation-matrix.md` | `764bf32434bd90d07538da325540b86889cf02f071a0ca7149c71cbcfb4f7319` |
| `native-node-edge-field-continuation-matrix.json` | `feac94294bce8295c5a3dbd10ea0bf443957acc15a919949aabd826e7f421d39` |
| `native-node-edge-field-continuation-matrix.md` | `d5be4afc9f24c8cc2ae308fffd6f76ecb570e5231b058936194fc45e6922087a` |
| `callback-field-matrix-design.py` | `8d5815b838c8886bc28905a72195ddc4635be58340446570600a69da7059ee8d` |
| `callback-field-matrix-design-receipt.json` | `f468d9c36f65444eb7a0bf4962ba89dd0e407fe48137f88037a616df783af3d2` |

I read the complete generator, every one of the 217 interaction and 294 native-field original descriptions and their generated policy assignments through structured readers, and the shared policy and branch-assertion rules that produce their full contracts. I inspected all 1,533 cell records programmatically for open state, ten dimensions, and consistency of the shared host-normalized variant templates. This is a semantic review of every policy assignment, not a claim to have independently executed every member or read all 205,744 repeated JSON lines individually. All 25 recorded lineage/reference hashes in each matrix match current bytes. No install, build, browser, port use, product gate or compiler probe ran in this review.

The reference prefix below means `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. `085/` means `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow/`; `087/` means `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow/`. These distinguish accepted candidate source from main. Acceptance of those bounded foundations does not establish their inherited field/callback parity. No moving 086 source was used to approve behavior.

## Findings

### [CORRECTNESS-01] Preserve callback and measurement ancestry when assigning policies

- **Evidence:** `plans/callback-field-matrix-design.py:123` chooses the last recognized field name, while `:228` assigns the options child by the resulting ownership. Consequently 19 callback argument leaves enter `071-options-keys`, including `OnConnect#1.arg:connection.<type:Connection>.source`, its handle/null branches, the equivalent OnReconnect leaves, and the three OnConnectStart handleId records. Their proposed ownership is document identity rather than callback payload. Pinned `packages/system/src/types/general.ts:130` and `:136` describe actual callback arguments. In 074, the two exact `Node#1.<intersection:1>.<type:NodeBase>.<intersection:1>.measured.height/width` records become document-dimension members of `074-field-format-policy`, although their enclosing measured record is runtime-derived.
- **Impact:** A child can test a host option or persisted dimension and appear to satisfy a callback output or live measurement obligation. Its source scope and prerequisites no longer follow the exact member being proved. Measured leaf tests can bypass the generation and detachment assertions required by the parent.
- **Effort:** S, for the design generator and regression checks.
- **Risk:** MED. Preserve every original identity, owner and requiredPlans field while changing proposed ownership and child assignments.
- **Confidence:** HIGH. The generated JSON child sets contain all 19 misrouted callback leaves and both measured dimension leaves.
- **Fix sketch:** Select the semantic container before its leaf name. Keep callback source/target/handle identity observations under the corresponding callback operation and native connection prerequisite. Give measured.width/height an explicit runtime measurement projection policy, with actual current lease/generation, optional leaf behavior, detached output and no persistence. Normalize the `e` parameter alias in `OnNodeDrag#2.arg:e` and its four event branches to the local-event policy rather than handler-registration policy. Recompute exact child sets and keep all original cells open.

### [TEST-COVERAGE-02] Generate assertions for the actual declaration branch

- **Evidence:** `plans/callback-field-matrix-design.py:173` takes the first tuple index. The record ending `.extent.<union:2>.<type:CoordinateExtent>.tuple[0].tuple[1]` says to assert component 0, and the record ending `.tuple[1].tuple[0]` says component 1. Pinned `packages/system/src/types/utils.ts:58` defines the nested tuple. At generator `:178`, every descendant containing an intersection token gets a requirement to reject omission of each constituent. For example `Edge#1.<intersection:3>.className` receives that requirement even though pinned `packages/react/src/types/edges.ts:58` declares an entirely optional presentation constituent. Generator `:175` similarly describes tuple leaves below a union as if their leaf description were the union alternative.
- **Impact:** The two asymmetric extent leaves can test the wrong coordinate. Negative compiler probes can demand rejection of legal optional omissions or of valid sibling alternatives accepted by the complete public union. That encourages false negatives or weakening probes to make the plan pass.
- **Effort:** S.
- **Risk:** LOW. This changes assertion precision, not the original declarations.
- **Confidence:** HIGH.
- **Fix sketch:** Record the full tuple path and expected leaf role: `[0][0]` minX, `[0][1]` minY, `[1][0]` maxX and `[1][1]` maxY. Attach intersection construction assertions to the intersection declaration itself; only missing required leaves are negative tests. Use a deliberately branch-specific type for sibling-union negative probes, while requiring the complete API union to accept every permitted branch. Keep optional omission positive. Add read-only generator checks for these exact IDs.

### [CORRECTNESS-03] Derive applicability from input, output and type roles

- **Evidence:** `plans/callback-field-matrix-design.py:190` infers booleans and numbers from words in the case string. At `:196` and `:197`, absent and ownUndefined are applicable for every declaration and return record, with a required-field rejection instruction. Every callback `.result` therefore receives these input rejection rules despite its void result. At `:198`, all seven dragging/resizing records receive "explicit false ... override inherited true", although their policy says they are runtime-derived observations. Pinned `packages/react/src/components/NodeWrapper/index.tsx:242` supplies dragging from its real drag hook. Pinned `packages/react/src/types/nodes.ts:55` defines the callback return as void.
- **Impact:** The matrix conflates configurable booleans, observed lifecycle flags, callback returns and type declarations. A renderer false value can be tested as an input gate, and ordinary undefined callback completion can be treated as malformed required input. Current `applicable` flags are not trustworthy per-member closure requirements.
- **Effort:** M, because the complete variants need an explicit role classification.
- **Risk:** MED. Do not reduce the ten dimensions or discard original type branches while correcting applicability.
- **Confidence:** HIGH.
- **Fix sketch:** Add a reviewable per-record role such as caller input, callback/renderer output, return contract or type-only declaration. For void results, absence/undefined is ordinary completion and arbitrary callback returns do not become acceptance signals. For derived dragging/resizing, false is an observed idle or terminal state; caller-supplied flags require their separately reviewed mapping. Boolean/style/ARIA false and coordinate/threshold/zoom zero need distinct expected outcomes. State the cancellation baseline and mode per consuming gesture: controlled rejection, active preview cancellation, supersession, and disposal must not share an invented rollback or terminal-event contract. Keep an explicit consuming-operation link for type-only lifecycle dimensions.

### [CORRECTNESS-04] Preserve attribute categories and nested event presence

- **Evidence:** Generator `:135` describes `keyof DOMAttributes` as event keys only. Pinned `packages/react/src/types/nodes.ts:40` excludes the full key set. The installed React 18.3.29 declaration at `/tmp/flow-088-xyflow/node_modules/.pnpm/@types+react@18.3.29/node_modules/@types/react/index.d.ts:2397` includes children and dangerouslySetInnerHTML as well as events. Generator `:138` and `:141` specify generic "boolean false removal" for allowed attributes. The actual React DOM 18.3.1 renderer at `/tmp/flow-088-xyflow/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom.development.js:411` retains boolean data-/aria- values, and `:798` writes their string value. Pinned `packages/react/src/components/EdgeWrapper/index.tsx:199` installs built-in onClick before `:216` spreads domAttributes.
- **Impact:** Permitting Node domAttributes.children widens an explicitly excluded API. Removing aria-hidden=false or data-state=false changes actual semantics. Treating `{onClick: undefined}` as removal of the key can incorrectly restore built-in edge selection, although the spread explicitly overrides that handler with undefined.
- **Effort:** S for policy correction; M for the eventual browser captures.
- **Risk:** MED. Avoid narrowing permitted Edge local event handlers while fixing Node exclusions.
- **Confidence:** HIGH for source/type behavior; executable pinned comparison remains unrun.
- **Fix sketch:** Name the complete Node exclusion set, including children, and preserve the six Edge exclusions. Split false cases into actual boolean HTML properties, ARIA/data attributes and string/enumerated SVG attributes. Require separate outcomes for an absent Edge handler key, own undefined handler key, replacement function, deleting the key, and replacing/clearing the entire bag. Actual edge DOM events remain owner-local and prohibited only at serialized graph/checkpoint boundaries. Preserve target/currentTarget and any overridden built-in selection behavior in the reference capture. Root props need their own precedence: pinned `ReactFlow/index.tsx:172` spreads rest before its owned onScroll/style/className/id/role attributes.

### [CORRECTNESS-05] Split deletable from flags that inherit host defaults

- **Evidence:** Generator `:22` groups deletable with draggable/selectable/focusable/connectable and gives all of them the default "Inherited host default". Pinned `packages/react/src/components/NodeWrapper/index.tsx:64` resolves four separate host-inherited flags, but `:238` resolves deletable as `node.deletable ?? true`. Pinned `packages/react/src/components/EdgeWrapper/index.tsx:52` resolves focusable/selectable from host options, while `:227` resolves deletable as `edge.deletable ?? true`.
- **Impact:** All seven deletable records and their 21 host cells inherit a nonexistent global deletion default. A false override test can target the wrong option rather than proving actual deletion and renderer behavior.
- **Effort:** S.
- **Risk:** LOW. Keep explicit per-element false and actual keyboard/API deletion tests.
- **Confidence:** HIGH.
- **Fix sketch:** Give deletable its own exact default and resolution policy. Distinguish resolved renderer output from document input and record null only where an exact declared input permits it. Continue to compare controlled deletion refusal and independent-owner behavior through their real public paths.

### [CORRECTNESS-06] Label proposed native differences before calling their updates reference behavior

- **Evidence:** The hidden policy at generator `:23` requires hidden parents to hide descendants. Accepted `085/packages/core/src/domain/flow-graph.ts:110` does that. Pinned `packages/react/src/components/NodeWrapper/index.tsx:83` returns null for the node's own hidden field, and the adoption/child path in pinned `packages/system/src/utils/store.ts:156` and `:214` does not inherit parent hidden into the child. The parentId policy requires atomic missing-parent failure, whereas pinned `store.ts:225` warns and returns. The key observer policies require options/target replacement to reattach listeners, while pinned `packages/react/src/hooks/useKeyPress.ts:100` captures options and `:163` excludes options from the effect dependencies.
- **Impact:** These are reasonable native policies, but the current matrix can ask a capture to prove matching output where Flow deliberately differs or where the pinned options-only update is stale. Existing accepted architecture must not be changed to imitate a reference defect just to satisfy a generic parity instruction.
- **Effort:** S for design classification; M for bounded paired observations.
- **Risk:** MED. Preserve known Flow graph integrity and owner lifecycle rules.
- **Confidence:** HIGH for the compared source paths; their full paired runtime observations are unverified.
- **Fix sketch:** Keep reference observation and proposed native outcome in separate fields. Mark these source-indicated differences as candidates for explicit intentional-difference review, with a reason and exact native/reference test boundary. Capture parent hidden/unhidden with a visible child and initialized incident edge; missing-parent input separately; target-only and options-only key observer changes separately from keyCode changes. Do not close any of these cells from source comparison alone.

### [ARCHITECTURE-07] Freeze concrete prerequisite scope before dispatching the live-option child

- **Evidence:** `plans/callback-field-matrix-design.py:227` assigns `071-live-options` only non-on root members owned by 071, but its mandatory assertion is strict/loose mode and connection style replacement. Those inputs are the explicitly coordinated 067/072/074 work described by `plans/interaction-field-continuation-matrix.md:1031`, not members of that child allowlist. The same paragraph correctly states that the new command name and shape still require review. Accepted `085/apps/vanilla/src/mount-flow.ts:9082` decodes construction options; accepted `085/packages/foldkit/src/application.ts:2558` captures interaction options and renderer registry when creating the program. The current matrix explicitly keeps 086 unaccepted and promises no source dispatch.
- **Impact:** A future executor cannot infer a public command, cross-owner input scope or cancellation behavior from the member list. Implementing the assertion directly would modify semantics beyond the assigned071 records, even though no original ledger cell is promoted.
- **Effort:** M for a bounded prerequisite design, then its separately estimated execution.
- **Risk:** HIGH. Public lifetime and input replacement affect active gestures, queued callbacks and renderer teardown.
- **Confidence:** HIGH that the source child is not yet executable; this is not a request to reject its useful dependency ordering.
- **Fix sketch:** Retain the live-update prerequisite, but freeze a separate numbered command design with exact cross-owner option and local registry fields, construction versus replacement behavior, absent/ownUndefined patch or whole-replacement rules, atomic rejection, active-gesture cancellation policy, error channel and source/test allowlist. Require actual same Vanilla controller/Foldkit Runtime identity and Vue reactive props. Do not use remount, input bag mutation, private Model reads or a second graph store as proof. The final reference/type child must name actual installed consumer and reference capture files before execution.

## Accepted boundaries and revision requirements

The accounting and original retention are suitable. 071 retains 108 groups, 217 members and 651 cells. 074 retains 121 groups, 294 members and 882 cells. All remain OPEN/unverified. Complete CSS/custom content, current measurement generation, exact public native events, independent owners, default registry fallback and separate persistence review are necessary obligations. The full CSS type, ReactNode and upstream any path-options contracts must remain open until an explicit native mapping and paired proof exist. An implementation of a smaller useful subset cannot close those parent contracts.

The accepted 087 factory correctly retains codec-derived types and a supplied isolation capability. `087/packages/core/src/domain/flow-data-contract.schema.ts:24` allows arbitrary decoded data through the graph codec, and `:56` requires explicit detachment. Future native callbacks carrying decoded subtype data must depend on the actual 069 actor/host propagation design. A general assertion that every callback graph value is already JSON-serializable would erase accepted non-JSON decoded data. Local native events/functions still stay outside Foldkit serialized ports. No new persisted field or saved representation is authorized by the matrices.

Revision must preserve old input bytes/receipt as historical evidence, all original IDs/targets/decisions/requiredPlans, and all 1,533 open cells. Update only the proposed policies, explicit applicability and child scope, then regenerate/check the full matrices. Add read-only regression checks for callback ancestry, measured ancestry, nested tuple paths, optional intersection constituents, void return applicability, Node children exclusion, attribute false categories, deletable defaults and the source-indicated native differences. An exact accounting check alone cannot validate those meanings. Re-submit frozen hashes for cold semantic review; numbered source packets still require their own complete public API, file scope and verification acceptance.

## Conformity and deviations

Conforming accounting: all original assignments and open cells remain intact. Source comparison supports the separate Edge versus Node attribute contracts, explicit per-element flags, actual nullable callback arguments, tuple ordering and the distinction between local native presentation and saved documents. The corrected policies still require executable paired comparisons.

Intentionally different candidates: native event identity, detached graph values, atomic graph integrity, parent-hidden propagation and reliable owner-local option replacement need explicit reasons and their named tests. This review preserves the accepted Flow architecture; it does not approve those original host cells as differences.

Unverified: all 1,533 member/host cells, every new live replacement API, full typed host/renderer/callback integration, widened persistence, original captures, native browser behavior, packed consumer proof, focused/full integration, CI, devices and telemetry collector delivery. No source implementation, matrix edit, product verification or broader parity acceptance occurred in this review.
