# Independent architecture review of Plan 077

Date: 2026-09-30. Source inspected at `841be137e253cf19c665269eaaa79edc19abf3c3`. Reviewed plan: `plans/077-retain-versioned-native-schema-fields.md`.

**Verdict: APPROVE the bounded live-schema retention design.** No architectural amendment is required before implementing its exact field matrix. This approval covers canonical retention and the legacy failure boundary. It does not approve completed native rendering, versioned persistence, parent acceptance, or semantic member closure.

This was a read-only source review. No source, fixture, dependency, verification configuration, or index was changed. No install, test, build, browser run, or verifier was executed. This review file is the only authored artifact.

## Approved contract

Plan 077's fields at `plans/077-retain-versioned-native-schema-fields.md:39-54` agree with the exact approved matrix at `plans/075-review-native-field-persistence.md:91-112` and the amended pending v2 contract at `plans/070-migrate-origin-aware-persistence.md:45-52,112-118`.

| Live field | Approved schema | Retained intent | Legacy save |
| --- | --- | --- | --- |
| Node connectable | optional Boolean | missing stays missing; own undefined stays present in a raw full document; true and false remain exact | reject any own key |
| Node and edge ariaRole | optional String | missing stays missing; own undefined stays present; empty, whitespace, and custom strings remain exact | reject any own key |
| Node ariaDescription | optional String | missing, own undefined, and exact nonempty strings retain prior behavior; empty becomes accepted live intent | reject empty; preserve original old-field behavior otherwise |
| Node and edge ariaLabel | optional String | missing, own undefined, and exact nonempty strings retain prior behavior; empty becomes accepted live intent | reject empty; preserve original old-field behavior otherwise |

Null and wrong primitive values fail the live decode. This adds no edge ariaDescription, role enum, global default injection, arbitrary DOM attributes, origin schema, or second metadata store. Existing origin semantics remain the separately approved 067 contract.

The pending single v2 body must eventually carry these values together with origins. Its implementation and all-host round trips remain 070/075. A raw own undefined new key requires legacy rejection and future v2 selection before projection. JSON omits that value and cannot restore its own-key presence. The old ariaLabel and ariaDescription fields retain their original own-undefined acceptance. These are separate assertions, not one JSON roundtrip assertion.

## Source-grounded ownership and production paths

Core owns the live schemas, their derived types, graph integrity, snapshots, and the format guard. Foldkit owns its typed messages, producer, ports, and request correlation. Applications own mounting and disposal. This follows `docs/standards.md:7-16,52-54`; the adapter remains downstream of core.

1. Public full-document decode uses `decodeFlowDocument`, whose input type derives from the unknown decoder at `packages/core/src/domain/flow.schema.ts:418-422`. Its decoder is constructed from the complete document schema at `:138-160`, then applies graph integrity and existing decode telemetry at `:420-437`. Node and edge types derive from the authoritative structs at `:84,136`; no parallel interface is needed. Extending those existing structs is the smallest design that makes the fields accepted public graph content.
2. Public detached snapshots are exported at `packages/core/src/public.ts:362-373`. `createFlowSnapshot` uses structuredClone and recursive freezing at `packages/core/src/domain/flow-snapshot.ts:31-56`. `FlowSnapshotSchema` composes the live document schema at `:8-13`. This keeps exact declared values and raw undefined presence within the in-memory snapshot boundary without turning serialization into another graph owner.
3. Literal-v1 node and edge schemas are independently defined at `packages/core/src/domain/flow-persistence.ts:17-78`. The original nonempty aria constraints remain at `:47-48,75`. Their literal-v1 envelopes and encoded types remain at `:126-145`. They no longer derive their field list from the live structs.
4. Public legacy encoders reach `assertLegacyFormat` before selection omission or schema encoding at `packages/core/src/domain/flow-persistence.ts:147-159,181-187`. The guard checks own origin first at `:102-108`, then own connectable/ariaRole and exact empty old fields at `:110-123`. Its ordering matches 075. Current legacy reads first decode the frozen envelope and only then use the normal live graph decoder at `:163-178,190-208`, so newly accepted live fields cannot be recovered from keys the frozen reader has stripped.
5. Real Foldkit initialization is public `createProgram`, exported at `packages/foldkit/src/public.ts:1-15`, with `Runtime.makeElement`, the existing ModelSchema, ports, graph init, update, view, and subscriptions at `packages/foldkit/src/application.ts:2509-2561`. `Graph.ModelSchema` contains the same core FlowDocumentSchema at `packages/foldkit/src/graph.ts:181-209`. Public typed replacement uses HostAction.ReplaceDocument at `packages/foldkit/src/application.ts:151-154`, the action port at `:323`, subscriptions at `:913-920`, and routing at `:945-948`. Graph replacement installs that document into the existing graph at `packages/foldkit/src/graph.ts:1154-1167`.
6. A legacy client request registers pending before send at `packages/foldkit/src/snapshot-client.ts:146-149`, enters the typed snapshot request port/subscription at `packages/foldkit/src/application.ts:324,917-920`, then calls `Graph.selectSavedSession` at `:1811-1817`. The selector passes the accepted document directly to core encoding at `packages/foldkit/src/graph.ts:462-463`. The update branch catches only SavedFlowFormatError and returns the same model plus one failure command at `packages/foldkit/src/application.ts:1818-1831`. It constructs no success response in that branch.
7. The actual failure command emits the configured outbound failure port at `packages/foldkit/src/application.ts:695-711`. The client decodes and correlates that failure at `packages/foldkit/src/snapshot-client.ts:106-118`, deletes pending before resolving at `:91-95`, and unsubscribes both channels before settling disposal at `:170-181`. Success and failure use the same request owner. The terminal SnapshotPublished update is a no-op at `packages/foldkit/src/application.ts:2236`.

Installed Effect supports this shape. `node_modules/effect/src/Schema.ts:2343-2381` defines optional as missing or undefined. Its object parser copies present declared values at `node_modules/effect/src/SchemaAST.ts:3162-3169`, and its missing sentinel is distinct from undefined at `:3133-3158`. This is source evidence for the proposed retention mechanism, not a substitute for the plan's full-decoder assertions.

Installed Foldkit has real boundaries worth testing. Inbound ports decode at `node_modules/foldkit/dist/runtime/hostConnector.js:8-26`; outbound Port.emit schema-encodes at `node_modules/foldkit/dist/port/port.js:144-154`; delivery occurs in a microtask at `node_modules/foldkit/dist/runtime/hostConnector.js:39-61`. A fabricated update invocation bypasses these boundaries.

## Caller inventory and prior evidence

The historical legacy prerequisite warning is superseded for the two named callers in this exact checkout. The delete harness now creates the shared client at `apps/foldkit/e2e/delete-approval-harness.ts:283`; the Placeholder route does so at `apps/foldkit/ui-recipes/placeholder/main.ts:66`. The demo, public harness, measured-handle fixture, and installed consumer also use the shared client at `apps/foldkit/src/main.ts:562`, `apps/foldkit/e2e/test-harness.ts:327`, `apps/foldkit/e2e/handle-refresh-fixture.ts:50`, and `tests/consumer/foldkit/main.ts:148,170`. The remaining direct after-disposal send at `apps/foldkit/e2e/test-harness.ts:1892` is a disposal assertion, not an active success-only waiter. No new client migration was identified by this inventory.

Current failure application tests deliberately construct models at `packages/foldkit/src/application.test.ts:68-107`. They verify branch construction and a manually supplied terminal message, not mounted failure delivery. Current persistence tests likewise add reserved keys after baseline decode at `packages/core/src/domain/flow-persistence.test.ts:397-488`. Plan 077 correctly requires normal live decoding followed by the actual Runtime/client path to replace that missing production evidence.

The frozen reader/output/type tests already use the independently captured baseline at `packages/core/src/domain/flow-persistence.test.ts:277-395,509-608`. Preserve that fixture and its provenance. Do not regenerate it from expanded live schemas or change its old unknown-key behavior.

## Execution requirements within the approval

The ordered plan is safe: inspect the exact live/frozen/public paths; extend only live schemas; prove retention and frozen compatibility; exercise the mounted producer/client; then run the recorded focused scope. Frozen projection and failure transport already precede activation, so neither 070 nor completed 068/074 rendering is a prerequisite.

The following details make the required assertions reviewable without changing the architecture:

- Test every listed node and edge field through the full public decoder. Inspect Object.hasOwn before JSON, then the detached public core snapshot. Test missing, own undefined, defined valid values, null, wrong primitives, and invalid graph integrity separately. Retention must not alter selection omission, measurement policy, or graph validation.
- The extension-bearing legacy Foldkit request returns a typed failure, so it cannot also provide a succeeded public SnapshotResponse for inspecting retention. Use public accepted-state emissions from a deliberate full replacement for the Runtime value/presence assertion, or the public core snapshot for its own boundary. Keep the save-failure request separate and assert that it emits no new accepted-state event. Do not inspect private Runtime state or fabricate a successful response.
- Use both public initialization and the typed action replacement path. A replacement can include a real visible old-field change to produce an accepted-state event when checking own undefined. Existing application revision comparison uses JSON at `packages/foldkit/src/application.ts:2449-2461`; this review does not authorize changing that comparison or asserting that own presence alone increments the revision. Graph replacement retains the supplied current model even when no notification is produced at `packages/foldkit/src/graph.ts:608-617`.
- Subscribe before request, record the exact matching failure ID/code and success count, then replace with an ordinary old-field document and request successfully on the same Runtime. That recovery must not remount the Runtime. Check accepted graph/viewport snapshots through public emissions, failure-request notification counts, and mounted crash/defect diagnostics. Expected format-failure telemetry is not itself a Runtime defect.
- Keep real producer delivery and direct typed-transport duplicate/foreign/late-response tests labeled separately. Existing client tests can prove settle-once and both unsubscriptions; the mounted producer test must prove actual command execution and recovery. Dispose the shared client before Runtime teardown and prove a pending request settles.
- Record exact browser proof files and installed positive/negative field probes before editing. The plan permits a dedicated public typed-Runtime proof, but does not grant broad application or consumer edits. If a proof needs an additional production path or test fixture outside its allowed scope, use the plan's reviewed supplement rule rather than expanding scope during implementation.

Plan 077 requires `bun run verify` with the active work and browser proof recorded in verification.config.json. The current config still names snapshot callers and measured-handle refresh, so implementation must replace that active scope. A focused pass proves only its listed baseline/checks/browser files. Final integration and broader parity still require `bun run verify:full`.

## Alternatives and held work

The chosen design extends one canonical live schema and preserves independent frozen persistence. A host-local field store would create another authority and lose full-document identity. Widening v1 would change existing reader/writer contracts. Implementing v2 first while live decode strips its fields would lose restored intent. None of those alternatives improves this bounded step.

No additional authority, dependency, live role enum, or semantic normalizer is needed. The guard remains the existing core format owner; the failure channel remains the existing Foldkit correlation owner. The architecture contains no identified blocking gap.

Plan 070 versioned schemas, additive APIs, reader guard, versioned ports, all-host round trips and rendered restoration remain pending. Plan 068 roles, names and descriptions, and Plan 074 effective connectability, NodeProps and other renderer fields remain held under their original member IDs. Core retention does not close any original renderer cell, generic contract, or parent 057/066 requirement.

## Conformity and deviations

- Conforming to the approved Flow contract by source inspection: optional Boolean connectable, optional String roles, empty live labels/descriptions, Schema-derived types, raw presence distinction, frozen legacy constraints, origin-first guard and one correlated failure owner. Execution evidence remains unverified until the required tests and focused verifier pass.
- Intentionally different architecture: Flow's frozen v1 envelope and explicit legacy format failure are Flow contracts. The test boundary is public full decode/snapshot, independent frozen reader/writer, actual Foldkit producer/client and installed public types.
- Intentionally different native policy, rendering unverified: Flow's explicit empty edge label and dedicated node description are the previously approved 075 policies. This review proves no computed role, name, description, inherited connectability, connection gesture, or cross-host renderer behavior.
- Unverified and held: 070 JSON round trips and restored rendering, 068/074 original member evidence, generic integration, full-suite acceptance, device/CI evidence and collector-side OpenTelemetry delivery. No closure claim follows from this approval.
