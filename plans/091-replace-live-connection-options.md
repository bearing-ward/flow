# Plan 091: Replace live connection mode and preview styles on the same native owner

2026-10-02. **DESIGN REVIEW REQUIRED. No executor or source dispatch is authorized by this file.** Root and an independent cold reviewer must approve this exact numbered contract, scope and selected source before execution. The design advisor writes only this plan and `plans/live-connection-options-design.md`; main source and existing plans/reviews remain untouched.

## First review and bounded correction

The first independent review was REVISE for TEST-COVERAGE-091-01: the plan incorrectly said Vanilla had no packaged adapter boundary. Exact original plan/design and review bytes are immutable in `plans/091-first-review-plan.md` (SHA256 `834707c1ee4c83bd8323aea2f952fcf6d0871e22942a77ae2b9de6e216eb2cc5`), `plans/091-first-review-design.md` (`ba881ae962572084cb0434c31390cca0e8c95d973edc71eb63c8fdc818de46e3`) and `plans/091-first-review-verdict.md` (`28bab168856a6c4125668982fdc5ddc5bf7c296ebedc7ed7903ee1e9cf59c531`). The original review `plans/live-connection-options-independent-design-review.md` is unchanged; `plans/091-first-review-inputs.md` records preservation. This revision adds only the already-allowlisted installed Vanilla proof and fixes that premise. All other input/domain/lifecycle/assembly contracts remain unchanged; root and fresh cold residual approval are still required.

## Status and purpose

- Priority P1; effort M/L; risk HIGH; category direction/correctness/test coverage.
- Planned at main `841be137e253cf19c665269eaaa79edc19abf3c3`.
- Selected assembly baseline is accepted 087, not main or moving 086: `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`.
- Foundation: accepted 085 origin/native lineage inherited by 087 and accepted 087 typed factory. This plan implements no typed actor/host adaptation.
- Dependencies: approved callback/field design decomposition; root plus cold 091 design approval; exact accepted 087 assembly. If any required native implementation instead depends on 086 repairs, STOP for separately accepted 086/native integration and a reviewed assembly amendment. Reading 086 is not permission to import it.
- Plans 067/071/072/074, all original live-update cells and generic roles remain OPEN. Plan 091 grants no ledger closure, whole-family parity or full-suite acceptance.

Vanilla and Foldkit currently retain connection options from construction; rebuilding either owner does not prove live replacement. Vue already consumes a reactive mode prop, but has no accepted style props on the selected 087 baseline. This plan adds a bounded same-owner replacement capability for exactly `connectionMode`, `connectionLineStyle` and `connectionLineContainerStyle`. It separates native operational configuration from graph/document meaning and supplies actual result, failure, cancellation, rendering and isolation contracts.

## Frozen input and assembly

The accepted 087 external freeze is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json`, SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. Its `completeCandidateManifest` has 1,492 files; `evidenceFiles` has 122. During authoring every listed source/evidence file was rehashed against the manifest: zero mismatches. Candidate provenance SHA256 is `f6e9a44c7a743af5e98585ecfd8f0a80ffbad1a90b5caea33cd27c3bf976820a`; execution SHA256 is `8d8708faf2b6d236ee494720173988fe5ee95303150d285123002c91573b7eb7`. The external freeze's historical pending acceptance text is resolved by main `plans/typed-factory-primary-source-review.md` SHA256 `ca6f5eceb19463141c7015532f4acb44c7469aeca2b0bc468ec979be628c5960` and independent review SHA256 `c6c7b6214c68266dfb50cd345a3f03d0b4adce74ac91ee683eeb208564859b47`.

After design approval, a separately dispatched executor creates a fresh detached worktree at the main SHA, name `live-connection-options`. Reconstruct exactly the complete accepted 087 manifest using its frozen bytes, including nonignored new files. Compare every original/copy SHA and the assembled path inventory; record the full receipt externally before any 091 edit. Do not copy node_modules/dist/ignored caches, do not overwrite 087 or old stopped candidates, and do not infer an assembly from only its 23 factory delta paths. Record both main and selected-baseline identities. The 122 original evidence files remain external immutable inputs. Root supplies frozen 091 plan/design approvals; only copies of those explicit records plus owned `plans/091-execution.md` and `plans/091-provenance.json` may be added as execution records. Root maintains the index.

Read-only frozen-input check, to run before copying and again on original inputs before dispatch (the source author already ran the equivalent inventory check, not product tests):

```sh
python3 - <<'PYCHECK'
import hashlib, json
from pathlib import Path
freeze = Path('/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json')
assert hashlib.sha256(freeze.read_bytes()).hexdigest() == '2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917'
packet = json.loads(freeze.read_text())
for key, root, count in [('completeCandidateManifest', Path(packet['checkout']), 1492), ('evidenceFiles', Path(packet['evidenceDirectory']), 122)]:
    assert len(packet[key]) == count
    for item in packet[key]:
        assert hashlib.sha256((root / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
print('PASS accepted087:1492 source/122 evidence hashes')
PYCHECK
```

Expected exit 0 with that exact PASS line. Apply the same manifest/path comparison to copied bytes in the fresh checkout before adding owned 091 records; name the destination root explicitly in the receipt. No missing-hash fallback to main/085/086 is permitted.

Use a task branch only if root asks, with prefix `codex/`; source remains uncommitted unless explicitly authorized. No commit, merge, push, cleanup or publication follows from this plan. Installation/build/test work is permitted only after source dispatch in that isolated checkout. Pin existing Effect `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`; manifests, lock and peer/compiler policies remain unchanged.

## Current production facts and drift finding

All relative native citations below resolve under the selected accepted 087 root, not main and not 086:

| Host | Public → state → geometry → DOM → output |
| --- | --- |
| Vanilla | `apps/vanilla/src/public.ts:8` exports mountFlow. `mount-flow.ts:9082` decodes public creation input; FlowController `:964` and facade `:9725` update only documents. Gesture validation reads construction mode at `:2664`/`:2718`; preview coordinates use the current accepted graph/handles at `:2545` and graph projection `:2247`; `showConnectionPreview` at `:3001` creates owner-local SVG/line; `:3036` publishes preview; CSS `apps/vanilla/src/style.css:483`/`:493` renders its defaults. `cancelConnectionGestures` at `:6326` targets connect/reconnect/click cleanup. |
| Foldkit | Package `packages/foldkit/src/public.ts:2` exports createProgram. `application.ts:2558` builds one Runtime program; `:2573` captures Graph.makeView and initial options. HostAction at `:152` has no option replacement. Graph Model connectionMode is declared at `graph.ts:192`; `:2655` builds preview state from current model/geometry; `:3252` chooses preview; `:3257` custom renderer or `:3258` own SVG/`:3275` path yields output. `CancelGesture` at `:1779` is broad, so do not reuse it blindly to cancel unrelated pan/node/resize sessions. |
| Vue | `packages/vue/src/public.ts:1` exports FlowCanvas. `flow-canvas.ts:530` declares connectionMode default strict. Computed decoding at `:1041` follows props; geometry/preview at `:3095` uses current accepted document/handles; existing watcher `:3876` cancels an active connection on mode/radius/auto-pan changes. Render at `:5029` chooses local path/component; `:5378` places previews inside the existing edge SVG. Existing `error` at `:664` covers connection-validator only, so add a distinct typed result event rather than silently widening that payload. Disposal at `:4988` owns resource cleanup. |

Core `packages/core/src/domain/flow-connection.schema.ts:23` defines strict/loose; `:77` normalizes against the accepted document, not a second graph store. Keep existing graph authority, measurements, auto-pan/resource ownership and default-edge protocols. Standards require Effect-owned workflows, Schema-derived contracts and one unknown decode boundary; preserve the existing telemetry names in `packages/core/src/telemetry/flow-telemetry.ts`.

**Drift finding:** none of the accepted 087 host files exposes either style field. Moving `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow` is UNACCEPTED evidence only. Its Vanilla `mount-flow.ts:347`–`:348` decodes string records and `:3383`/`:3394` uses CSSStyleDeclaration.setProperty; Foldkit `graph.ts:499`–`:503` and `:2942` use readonly string records and `application.ts:2705`–`:2734` snapshots them at creation. Vue `flow-canvas.ts:354` uses the broader CSSProperties and `:668`–`:675` adds style props. Those declarations are observations, not accepted source or code to transplant.

Cumulative integration STOP: moving086 already owns `packages/core/src/domain/flow-connection-options.schema.ts:26`–`:42`, proposed as NEW here on accepted087. Do not overlay or overwrite that schema or a later accepted broader Vue API. Cumulative assembly/integration waits for accepted086/native integration and a root+cold reviewed exact assembly/domain amendment selecting one canonical schema. The standalone accepted087 design imports none of those moving bytes.

The proposed 091 portable boundary uses the exact string-valued CSS declaration domain already observed for Vanilla/Foldkit. Vue's new 091 props use that same bounded Schema-derived record; this does not claim the broader moving Vue CSSProperties contract is implemented. CSSProperties, numeric CSS values, arbitrary native content/functions and all 074 full-CSS fields stay OPEN. If root selects an accepted 086 integration or preserves a broader already-accepted Vue style API later, its exact domain/precedence must receive an assembly/contract amendment before execution.

Accepted `apps/vanilla/package.json:2`, `:12`–`:20` defines the real `@flow/vanilla` archive exports; `apps/vanilla/src/public.ts:1`–`:9`, `:38`–`:56` exports mountFlow/createFlow and both controller types. `scripts/check-packed-consumer.ts:653`–`:675` packs/selects Vanilla, and `:774`–`:813` copies its fixtures, installs/compiles the actual archive and verifies its browser. `tests/consumer/consumer.typecheck.ts:39`–`:57` imports `@flow/vanilla`; protected `tests/consumer/main.ts:19`–`:44` imports that same archive and exposes `window.__flowConsumerController`. Local public-entry proof and actual archived-controller proof are distinct required boundaries.

Short existing exemplars: `createViewportClient` at `packages/foldkit/src/application.ts:437` stores per-owner request IDs/pending resolvers and settles disposal; `:466`–`:514` checks the real port send Exit. Match this structure without mapping every send failure to disposal. Vanilla `cancelConnection` at `mount-flow.ts:3092` clears preview/capture and emits the actual connection terminal callback; do not manufacture a generic terminal callback for other sessions.

## Complete proposed contract

These names are proposed for approval, not APIs claimed to exist:

- Core exports: `FlowConnectionStyleSchema`, `FlowConnectionOptionsInputSchema`, `FlowConnectionOptionsSnapshotSchema`, `FlowConnectionOptionsErrorSchema`, `FlowConnectionOptionsResultSchema`, their `typeof Schema.Type` aliases, and `decodeFlowConnectionOptionsReplacement`.
- Vanilla: `FlowController.replaceConnectionOptions(input: unknown): Promise<FlowConnectionOptionsResult>` and matching JavaScriptFlowController facade. Also `getConnectionOptions(): FlowConnectionOptionsSnapshot` for detached readback. Existing document update remains document-only.
- Foldkit: `createConnectionOptionsClient(handle)` returning `replaceConnectionOptions(input: unknown): Promise<FlowConnectionOptionsResult>`, `getConnectionOptions(): Promise<FlowConnectionOptionsResult>`, and `dispose(): void`; new `connectionOptionsRequests` inbound and `connectionOptionsResults` outbound ports. Requests have generated owner-local IDs and discriminated `replace`/`get` operation; normalized replace payload never contains functions/DOM events. The client is tied to one existing Runtime EmbedHandle; createProgram's return shape and embedding identity stay compatible.
- Vue: retain actual `connectionMode` prop; add Schema-derived `connectionLineStyle` and `connectionLineContainerStyle` props. One tuple watcher with pre-render batched scheduling decodes the complete current three-prop snapshot and commits atomically after all parent props in the batch are installed, before that owner render. Initialize with the same decoder in setup. Watch bag replacement identity, not caller in-place mutation. Emit a new `connectionOptionsResult` event of the exact result schema for each processed batch; add read-only `getConnectionOptions` to FlowEditor and its useFlow forwarding surface (`packages/vue/src/use-flow.ts:135`, `:249`, `:428`), alongside the existing exposed editor at flow-canvas.ts:2684. No imperative Vue setter that fights parent prop authority.

Authoritative schema shape (implementation must derive all value types from these schemas):

```ts
const FlowConnectionStyleSchema = S.Record(S.String, S.String)
const FlowConnectionOptionsInputSchema = S.Struct({
  connectionMode: S.optional(S.Union([ConnectionModeSchema, S.Undefined])),
  connectionLineStyle: S.optional(
    S.Union([FlowConnectionStyleSchema, S.Undefined])
  ),
  connectionLineContainerStyle: S.optional(
    S.Union([FlowConnectionStyleSchema, S.Undefined])
  ),
})
const FlowConnectionOptionsSnapshotSchema = S.Struct({
  connectionMode: ConnectionModeSchema,
  connectionLineStyle: FlowConnectionStyleSchema,
  connectionLineContainerStyle: FlowConnectionStyleSchema,
})
```

The input and style bag schemas additionally require plain records (Object.prototype or null prototype), own enumerable string-keyed data properties, and no accessor/symbol keys; this excludes DOM/class/accessor objects that an empty Struct might otherwise admit. Check that shape through own property descriptors before Struct/Record reads could invoke accessors. Apply that boundary refinement only to configuration inputs/bags, never to arbitrary codec-decoded graph values. Decode unknown once with an Effectful parser using `onExcessProperty:error`; own undefined is explicitly permitted only for the three optional top-level fields. Resolve absence/undefined to strict and empty bags, then independently copy/freeze both bags. The snapshot has all three keys. No JSON roundtrip, document decoder, class coercion, brand cast or caller input mutation. Core only owns portable scalar/configuration contracts and normalization; DOM mutation/scheduling/framework lifecycle remain in their hosts.

Result/error schemas are explicit discriminated unions, with types derived from Schema:

- Accepted: `{ requestId, status:'applied'|'unchanged', revision:nonnegative integer, options:FlowConnectionOptionsSnapshot, cancelledPreview:boolean }`.
- Rejected: `{ requestId, status:'rejected', revision:nonnegative integer|null, options:last delivered accepted snapshot|null, error }`.
- Error tags: `FlowConnectionOptionsInvalid` with `fields: readonly ('connectionMode'|'connectionLineStyle'|'connectionLineContainerStyle'|'input')[]` and sanitized diagnostic `message`; `FlowConnectionOptionsDisposed`; `FlowConnectionOptionsHostUnavailable`. All errors are Schema-derived. Host-acknowledged invalid input returns the exact current host snapshot/revision; a locally disposed or unavailable client returns only its last delivered snapshot/revision, or null before any delivery, and does not claim that cache is the current host state. Ordinary malformed input and supported client disposal return rejected results rather than hanging or throwing synchronously; direct raw Runtime disposal has the explicit limitation below. An unexpected Effect defect remains a defect reported through the existing native lifecycle failure boundary, not falsely classified as validation.

Foldkit exports `ConnectionOptionsRequestSchema` as an adapter Schema union: `{requestId, kind:'replace', options:FlowConnectionOptionsSnapshot}`, `{requestId, kind:'get'}`, or `{requestId, kind:'reject', error:FlowConnectionOptionsInvalid}`. The public client decodes unknown input once before sending; malformed input sends only its normalized sanitized error so the live host can acknowledge rejection with its actual latest snapshot, not a stale cached authority. A caller directly sending malformed raw port input gets Foldkit's real SchemaError Exit and no transition/result; this is a separate raw-port boundary. Native port Schema validation of trusted normalized payloads is framework transport validation, not a second caller-data/business decode. Each client generates a distinct request namespace plus counter, so two auxiliary clients on the same Runtime cannot consume each other's acknowledgements. No timeout is used to infer liveness.

`decodeFlowConnectionOptionsReplacement(input)` is `Effect<FlowConnectionOptionsSnapshot, FlowConnectionOptionsInvalid>` with no new services; map Schema failures without embedding raw input/style values in logs/errors. Revision starts at 0 per owner, increments once per effective changed snapshot, and stays unchanged on semantic equality or rejection. Compare complete bags by key/value equality independent of object/key order. Results and readbacks are independently detached, preventing mutation of current configuration or a different delivery.

At construction, extend Vanilla FlowHostOptions/JavaScript creation Schema and Foldkit GraphInteractionOptions with only the two proposed string-bag fields, using the same Schema-derived field types. Extract this exact three-field subset from larger existing creation option records and decode/isolate it eagerly before lazy Runtime init; never pass an entire existing option bag into the excess-key-rejecting replacement decoder or reset unrelated constructor fields. Vue initialization uses the same resolved subset. Public replace methods snapshot/decode the fixed service-free input at invocation before returning/queuing its Promise so immediate later caller bag mutation cannot change the submitted request. The commit queue stores only detached normalized values. This sealed primitive decoder is not a synchronous adapter for arbitrary serviceful/suspending graph codecs.

All request/result contracts and pending lifecycle channels belong in native host configuration; graph data, graph snapshots, SavedFlowSession/versioned persistence and typed data codecs acquire no fields. Foldkit may keep presentation string bags/revision in its existing operational Model schema next to current connectionMode, outside document/snapshot projections. Newly added fields must accept missing keys in older valid operational Model values and resolve those to empty bags/revision 0, preserving existing model/schema acceptance without inventing an HMR proof. Current connectionMode remains the single authority; do not add a second mode field inside an aggregate snapshot. Graph reads mode from that one authority; rendering reads the bags from the same committed operational snapshot. Do not retain a stale renderer-closure copy or duplicate option store. Ports carry only the normalized serializable configuration, never callbacks, CSSStyleDeclaration, DOM events or native renderer objects. Do not add these requests to document-edit or graph-data commands.

| Input | Resolved replacement / expected outcome |
| --- | --- |
| `{}` or all three keys absent | strict + empty line/container bags; clears prior caller styles and resets previous loose mode |
| Top-level field own undefined | same field's absence/default/clear meaning; never patch carryover |
| Empty style bag | clears all prior caller declarations on its exact preview element, restoring native defaults |
| Style `opacity:'0'`, `'stroke-width':'0'`, custom property string | accepted; read exact inline/computed value; numeric zero is rejected because values must be strings |
| `null`, array, false, zero, function, DOM object as whole input/bag/value; unknown top-level key | rejected atomically; preserve old options/revision/document/viewport/active preview/resources |
| Own undefined inside a style bag | rejected; bag values are required strings, unlike optional top-level bags |
| Invalid mode literal or non-string style value | rejected even if another field is valid; no partial default/style/mode commit |
| Unknown CSS property or syntactically ignored CSS string | accepted string-domain value; browser CSS rules determine visual application. Do not fabricate a full CSS grammar validator. Compare portable tested declarations only. |
| Same canonical snapshot, different bag/key identity/order | unchanged result, no revision/preview/capture/resource transition |

Whole replacement concerns only this three-field subset. Radius, thresholds, line type, auto-pan, nodeOrigin, validators, callbacks, renderer registries and any unrelated options retain their existing current values. They are neither reset nor configurable through this method. Top-level unknown keys reject instead of being stripped.

## Atomic state and preview policy

Validation and snapshot isolation happen before any cancellation, revision change, DOM mutation, pending-result registration or public option installation. Schedule host commits in request order; reentrant requests enter the owner's queue instead of nesting halfway through a commit. A rejected replacement does not cancel a valid current preview. Read latest accepted document/viewport immediately before committing; preserve independently acknowledged earlier changes, not the document at gesture start.

- If mode changes, cancel only an active connect/reconnect/click/keyboard connection preview using the host's actual resource/terminal path, reason `configuration-replacement`, then install the complete new snapshot and increment revision once. Remove preview/hover/auto-pan/capture/stale connection work; retain latest accepted graph/viewport and owner identity. Do not cancel unrelated pan/node drag/resize/selection or revoke an already-emitted controlled proposal awaiting its owner's independent acknowledgment.
- If only styles change, install the complete bags and reconcile the currently rendered preview in place without restarting its connection session, resetting coordinates or emitting connect-start/end. Remove all previous caller declarations before applying the new complete bags. Update line/path only for lineStyle and the dedicated preview SVG only for containerStyle. Vue must add a dedicated preview container; styling its existing shared edge SVG would incorrectly style accepted edges. Native default rules reappear after clear. Custom renderer function identity and signature remain unchanged; its existing error/cleanup contract remains authoritative. This slice guarantees the native built-in line/path plus dedicated native container style outcome. Styles inside arbitrary custom renderer content and richer callback/style context contracts remain 067/074 work; do not widen callback arguments or claim those outcomes here. Reconcile built-in styles without republishing an identical semantic preview to unrelated preview subscribers.
- If the snapshot is equal, do nothing beyond an unchanged acknowledgement/readback.
- For mixed mode/style change, mode cancellation completes before a new preview can start; the next gesture renders the new bags. Existing operation-specific terminal notifications are observed, not replaced with a universal event promise.

The result acknowledges the state/view reconciliation turn: Vanilla resolves after its synchronous DOM reconciliation; Foldkit emits after committing its Model and scheduling its normal view turn, with browser tests awaiting actual rendered DOM separately; Vue emits after its batched pre-render commit and tests await nextTick/render output. None implies a browser paint/collector delivery. If an existing user renderer callback throws, retain the existing error boundary and distinguish that rendering failure from prior input rejection; do not fabricate transactional rollback across caller code.

Vanilla owner disposal invalidates new requests before decoding, settles pending controller requests as disposed once and uses its existing preview/capture/auto-pan teardown. Foldkit auxiliary client disposal synchronously settles only that client's pending operations as disposed, detaches its result subscription and ignores its late results; it must not dispose the Runtime, mutate mode/styles or cancel another client's operations. Owner composition explicitly calls every owned auxiliary client's dispose before calling the same Runtime handle.dispose; the new fixture and documentation must demonstrate that order. Two clients on one live Runtime remain independent when one closes, and the surviving client still replaces options/connects. Vue unmount stops its prop watcher/native resources; a prop batch unprocessed at unmount is abandoned without a Promise/event acknowledgement claim because Vue owns no imperative replacement request.

Installed Foldkit `node_modules/foldkit/dist/runtime/hostConnector.d.ts:41` exposes only ports/dispose, with no disposal subscription. Its `hostConnector.js:9`–`:10` returns Exit.void after disposal and `:71`–`:75` clears listeners. Thus successful send Exit proves neither host liveness nor disposal. Direct external raw Runtime.dispose bypassing auxiliary client close can leave a client pending request unacknowledged; that lifecycle gap is explicitly unverified/outside 091's supported composition boundary. Do not fake a disposal event, timeout or automatic settlement. If automatic raw-disposal detection is required, STOP for a separately reviewed real owner hook. Transport Schema/send failure returns host-unavailable, not disposed. Two owners with identical node IDs/request counters and two clients on one owner cannot consume each other's results or mutate each other's detached bags.

Telemetry uses existing `FlowSpan.controllerUpdate`, `FlowSpan.domReconcile`, `FlowSpan.gestureCancel`, `FlowAttribute.browserOperation`, `FlowAttribute.failureName`, `FlowAttribute.failureMessage`, `FlowAttribute.cancellationReason` and `FlowAttribute.inputKind`. Add boundary spans/logs with operation `replace-connection-options`; no pointer-move logging or new telemetry vocabulary. Optional exporter and shutdown flushing remain application-owned; no collector claim follows.

## Exact executor file scope

Only after both design approvals, source/test edits are restricted to the following literal paths. New paths are marked NEW; no directory wildcard/adjacent-file permission.

- NEW `packages/core/src/domain/flow-connection-options.schema.ts`
- NEW `packages/core/src/domain/flow-connection-options.ts`
- NEW `packages/core/src/domain/flow-connection-options.test.ts`
- `packages/core/src/public.ts`
- `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`
- NEW `apps/vanilla/src/live-connection-options.test.ts`
- `packages/vue/src/flow-canvas.ts`, `packages/vue/src/use-flow.ts`, `packages/vue/src/public.ts`
- NEW `packages/vue/src/live-connection-options.test.ts`
- `packages/foldkit/src/application.ts`, `packages/foldkit/src/graph.ts`, `packages/foldkit/src/public.ts`
- NEW `packages/foldkit/src/live-connection-options.test.ts`
- NEW `apps/vanilla/src/live-connection-options-test.ts`, NEW `apps/vanilla/live-connection-options-test.html`, NEW `apps/vanilla/e2e/live-connection-options.e2e.ts`
- NEW `apps/vue/src/live-connection-options-test.ts`, NEW `apps/vue/live-connection-options-test.html`, NEW `apps/vue/e2e/live-connection-options.e2e.ts`
- NEW `apps/foldkit/src/live-connection-options-test.ts`, NEW `apps/foldkit/live-connection-options-test.html`, NEW `apps/foldkit/e2e/live-connection-options.e2e.ts`
- NEW `tests/consumer/live-connection-options.types.ts`, NEW `tests/consumer/live-connection-options.runtime.ts`
- `tests/consumer/consumer.typecheck.ts`, `tests/consumer/vue/consumer.typecheck.ts`, `tests/consumer/foldkit/consumer.typecheck.ts` — additive host/public assertions only; no old assertion changes. Vanilla imports both FlowController and JavaScriptFlowController from the actual @flow/vanilla archive and proves their exact unknown-input replacement/result and readback signatures
- `tests/consumer/tsconfig.json`, `tests/consumer/vue/tsconfig.json`, `tests/consumer/foldkit/tsconfig.json` — add only the two new common fixture filenames to includes; compilerOptions unchanged
- `scripts/check-packed-consumer.ts` — copy/run the two new common fixtures in every actual archive and add the explicit Vanilla archived-controller browser exercise before existing destruction, preserving all old operations/assertions and tarball/peer rules
- `docs/public-api.md`, `docs/api-reference.md` — bounded public API documentation and generated export text only
- `verification.config.json` — only the 091 active-work/check/browser scope defined below
- Copied approved 091 plan/design and NEW `plans/091-execution.md`, NEW `plans/091-provenance.json` for execution receipts; no edits to main index/reviews

Protected: every file outside this list, particularly manifests/lock, root tsconfig/lint/Vitest/Playwright/Vite configs, `packages/core/src/domain/flow.schema.ts`, `flow-edit*`, `flow-persistence*`, data-contract/typed-actor modules, existing telemetry vocabulary, all CSS files, existing host/browser test fixtures/assertions, installed compilerOptions/old probes, imported artifacts/catalogs/generated research, original member ledgers, prior freezes/reviews and README. Do not borrow moving 086 code, dependencies or logs. If default style removal needs a global CSS edit, stop for a separately reviewed exact amendment; inline/native reconciliation must restore existing defaults within the named implementation files.

## Steps and commands

Commands below are for a separately authorized isolated executor, not commands run by this design author. Preserve each failure and fix cause; do not weaken assertions, raise timeouts, increase tolerances, add skips or alter quality policy.

| Purpose | Command | Expected |
| --- | --- | --- |
| Initial HEAD | `git rev-parse HEAD` | main baseline SHA before exact accepted087 assembly |
| Frozen dependencies | `bun install --frozen-lockfile` | exit 0; manifest/lock hashes unchanged |
| Contract/unit slice | `bun run test packages/core/src/domain/flow-connection-options.test.ts apps/vanilla/src/live-connection-options.test.ts packages/vue/src/live-connection-options.test.ts packages/foldkit/src/live-connection-options.test.ts` | exit 0, all new named cases pass, no skips |
| Preview focused selection | `bun run verify --list` | focused; only named 091 checks/browser suites after scope installation |
| Required focused acceptance | `bun run verify` | exit 0; quality/architecture/build/types/all units/explicit checks/three real archive consumers/named mounted suites pass |
| Final scope/whitespace | `git diff --check` and literal changed-path inventory comparison to scope | exit 0; no unapproved path |
| Integration/release | `bun run verify:full` | required later, not inferred from this focused source acceptance |

1. Rehash the freeze, 1,492 candidate paths, 122 evidence paths, acceptance/design records; assemble the exact baseline and initial receipt. Compare the current-state excerpts and all selected input hashes. Stop for drift/missing source/086 dependency before implementation. Frozen install may run only in the isolated checkout after this check.
2. Add Schema contracts, Effectful decoder, public exports and meaningful core tests. Reject excess keys, allow explicit top-level undefined, clone bags, compare key-order-independent equality and roundtrip result/errors. Verify `bun run test packages/core/src/domain/flow-connection-options.test.ts` → exit 0/all contract cases pass. Run the four-file unit slice only after all host tests exist; do not skip placeholder tests or run against invented files.
3. Implement Vanilla controller/facade replacement against its existing closure authority and targeted connection lifecycle. Add get/readback and result handling without changing document update. Implement Foldkit normalized request/result ports/client, ordered operational transition and detached view config with one mode authority. Add Vue three-prop atomic snapshot/result handling and dedicated preview SVG. Match existing resource ownership and preserve unrelated gestures. Verify units, typecheck/build through focused verification, and actual per-host fixture cases.
4. Add additive common installed probes and actual host declaration assertions. Packed core proof covers normalization/result exports; all three actual host archive surfaces must compile. In `tests/consumer/consumer.typecheck.ts`, import both `FlowController` and `JavaScriptFlowController` from `@flow/vanilla` and the authoritative result/snapshot Schema types from `@flow/core`. Independently assert `Parameters<Controller['replaceConnectionOptions']>[0]` is exactly unknown, `ReturnType` exactly `Promise<FlowConnectionOptionsResult>`, and `getConnectionOptions` exactly the Schema-derived snapshot for BOTH controllers. Positive calls pass unknown values; malformed runtime inputs remain legal unknown arguments and are not manufactured compiler negatives. Type-only negatives instead reject wrong return/readback/result discriminants. Preserve all existing fixture assertions/compiler options.

   In the already-allowlisted `scripts/check-packed-consumer.ts`, add a named Vanilla archive helper invoked in `verifyVanilla` before its existing controller destruction at current `:223`, using the protected fixture's real `window.__flowConsumerController`. Extend only the runner's local Window declaration with the actual exported controller method types; no any/cast/workspace-alias substitute for actual archive type assertions. The archived browser exercise records the same controller object and accepted snapshot, then covers: get/default snapshot; replace loose plus string style bags; caller and result/readback isolation; equal canonical replacement returning unchanged with equal revision; mixed invalid mode/style returning typed atomic rejection with equal revision/options/accepted document; healthy replacement recovery; `{}` and explicit top-level undefined default/clear; independent detached readbacks/results. Restore strict/empty defaults before the unchanged destruction block and preserve every existing browser assertion. Execute this helper against the controller created by the real archived `@flow/vanilla`, not a newly local-imported controller.

   Protected `tests/consumer/main.ts` must remain byte-identical; it already exposes the needed controller at `:44`. If that exposure cannot support the exercise, STOP for an exact reviewed fixture amendment. Keep the separate three local public-entry suites for active preview/capture/style/gesture and same-owner lifecycle cases; the archive exercise proves the public replacement/result/readback contract and does not replace those native proofs. Preserve all three archive install/peer/runtime/type/behavior/cleanup paths and all common negative/positive compiler-mode cases.

5. Add actual public browser fixtures/suites and run full 091 focused acceptance after setting exact saved scope. Do not touch existing tests; run them as regressions. Each new fixture mounts one owner once, stores its identity, and invokes only public APIs/Runtime ports/actual Vue parent props. Await the actual render/current physical handles, never predicted measurement tokens or private Model state. Finish owned receipts before final quality/diff success; freeze complete source/evidence inventories externally and perform no source/record writes after successful final checks.
6. Root independently reviews every source delta/assertion/scope/hash and reproduces the required focused gate on the same freeze; a fresh cold source reviewer assesses actual public→state→geometry→DOM/render paths and evidence independently. At most two formal source-review corrective revisions are allowed after the initial review. Mechanical formatter/type/gate diagnosis has no arbitrary attempt-count limit while fixes stay in approved scope. An unresolved semantic or out-of-scope defect stops acceptance/dispatch of dependent work; do not disguise it as a mechanical retry.

Saved `verification.config.json`: `defaultProfile:'focused'`, `activeWork:'091 live connection mode and preview style replacement'`; checks exactly `docs`, `contracts`, `api-members`, `traces`, `consumer`. For each Vanilla/Vue/Foldkit host, browserTests exactly `live-connection-options.e2e.ts`, `interaction-lifecycle.e2e.ts`, `renderer-contract.e2e.ts`, `versioned-persistence.e2e.ts`. All those existing regression names were found in the selected baseline. The new filename is validated only after creation. CLI scope merges with saved scope, so replace the prior 087 persistence-only scope; do not accidentally retain unrelated scopes or claim `--list` executes tests. Root quality/architecture/package builds/typechecks/all unit suites remain the baseline. Shared strict browser ports require root's execution lease; no server reuse/foreign termination or concurrently shared build dirs.

## Exact required assertions

Use descriptive stable case IDs `091::<host>::<case>` in owned receipt maps; tests must assert real values, not only counts/mount success.

| Case | Required observation |
| --- | --- |
| same-owner-mode | One Vanilla controller/Foldkit EmbedHandle/Vue component UID remains identical through strict→loose→strict; real opposite-kind/same-kind eligible handle actions distinguish mode; accepted document/viewport remain current except independently accepted gesture effects |
| style-live | During one active preview replace stroke/container opacity with strings, then change/remove/empty/default them without restarting connection; inspect actual line/path style and dedicated container, preview geometry, initiating event count and capture; accepted edge SVG stays unaffected |
| absent-undefined-clear | Whole `{}` resets strict/empty; own undefined and absent top-level have explicit same semantics; own undefined inside bag rejects; omitted bag removes stale caller declarations and restores native defaults |
| atomic-reject | Invalid mode plus valid style, valid mode plus numeric/null/function bag value, array/DOM/full-input invalid and excess key reject with last options/revision unchanged; preview, accepted graph/viewport, DOM styles and resource ownership unchanged; healthy next replacement succeeds |
| mode-cancel | Pointer connect/reconnect, click-connect and keyboard connection where actually supported: record latest accepted state and real active preview/capture/auto-pan, replace mode, observe operation-specific termination/cleanup once; next gesture uses new mode. No rollback of prior accepted pan/edit; no unrelated node/resize/pan/selection cancellation |
| controlled-baseline | Record accepted owner document/viewport just before replace; an unacknowledged connection proposal remains governed by document owner, and replacement does not secretly commit/revoke it. Cancellation assertions concern actual active previews only |
| equal-ordered | Equivalent reordered bag keys return unchanged without cancellation; back-to-back and reentrant public requests acknowledge ordered revisions with no partially mixed mode/styles |
| detach-two-owner | Same node IDs and request counters in two owners, different mode/styles; mutate caller bag and a prior result/readback after decode; live config and other owner remain unchanged; result IDs stay local |
| dispose | Dispose one auxiliary client on a still-live Foldkit Runtime: its pending calls settle once, the other client/Runtime still operate. Explicit owner close calls both clients before Runtime.dispose and removes actual preview/capture/frame resources. Vanilla destroy settles its own pending/later calls; Vue unmount has its prop-event boundary. Raw Runtime.dispose bypass stays unverified, with no invented acknowledgement |
| persistence-boundary | Existing literal-v1/versioned snapshot outputs contain no mode/style/requests/revisions; typed data and arbitrary decoded classes remain untouched; old regression suites retain all assertions |
| installed-core | All three real archives run common public decoder/result checks and intended negatives under unchanged compiler policies; this establishes the common @flow/core boundary only |
| installed-vanilla-types | Actual @flow/vanilla imports prove BOTH FlowController and JavaScriptFlowController exact unknown replacement parameter, Promise of Schema result and Schema snapshot readback; no workspace aliases or source-only type proxy |
| installed-vanilla-runtime | Runner uses the protected fixture's exposed archived controller before unchanged destruction: replacement/get/default-clear/equality-revision/typed atomic rejection/healthy recovery/detached results and readback, same controller and accepted document preserved |
| installed-vue-foldkit | Actual @flow/vue and @flow/foldkit public declarations compile in their archive contexts and all old browser/install/peer/cleanup assertions remain |
| local-native-preview | Each new local public-entry suite separately proves active preview/capture/style/gesture/current geometry and owner identity; archived method/core probes do not stand in for these cases |

Do not turn the generic NodeData/EdgeData extraction IDs into runtime properties. This plan does not transport, normalize or encode graph subtype values.

## Done criteria and stopping conditions

Acceptance requires all literal changed paths in scope; unchanged protected/baseline/input hashes; exact effective snapshot/result/error contract; no extra operation fields; all named new cases passing; three unchanged archive consumer paths plus additive probes, exact BOTH-controller @flow/vanilla signature assertions and the actual archived-controller browser case map; existing named regressions; `bun run verify` exit 0 with the exact recorded focused scope; final quality/diff success after receipts; root and cold source approval on one immutable final freeze. Save actual profile, suite/assertion mapping, logs, exit statuses and source/evidence hashes. Report focused pass separately from full integration/reference/CI/devices/collector/member closure.

STOP the affected step and report exact evidence if accepted087 hashes/excerpts drift, style/native implementation requires unaccepted086 or any unlisted path, the shared string domain changes, Vue prop authority would require an imperative mirror, targeted preview cleanup cannot preserve unrelated/current accepted state, a port/client cannot distinguish disposal/transport failure or settle pending requests, custom renderer integration requires callback API widening, compiler/service channels require casts/any/JSON coercion, protected assertion/policy changes seem necessary, or the archived Vanilla exercise requires modifying protected tests/consumer/main.ts, or a formal review leaves unresolved semantic/out-of-scope findings after its permitted revisions. No arbitrary two-attempt mechanical gate stop rule applies. No API behavior is accepted by a passed typecheck alone.

## Audit limitations and maintenance

Authoring used read-only source/review/hash inspection only, with complete accepted087 inventory validation. No install, build, compiler/product probe, gate, browser, port, executor or additional agent ran. Baseline recorded tests were not rerun. Pinned source was read; no new executable paired sample exists. Broad CSS, path types, radius/thresholds, callback/renderer registry replacement, restoration/HMR, typed native adaptation, full integration and original family closure are deliberately separate work. Future 067/071/072/074 additions must extend a separately reviewed exact field subset and preserve whole replacement/default/clear/atomicity semantics; do not silently make this API a generic option patcher.

## Conformity and deviations

Conforming target: native same-owner mode replacement, bounded string style add/change/clear, actual owner cancellation/cleanup/results and isolated public lifecycle, demonstrated by the named future tests. Pinned React has broader CSSProperties and reactive connection rendering; 091's portable string bags and native acknowledgements are intentional bounded adaptations awaiting design/source proof, not CSS/API parity. Style-only in-place reconciliation is a precise refinement of the earlier generic prerequisite proposal; mode changes use targeted preview cancellation with latest accepted baseline. Moving086 observations are unaccepted evidence and confer no assembly authority. All 067/071/072/074 and generic/native/persistence/reference/full claims remain OPEN/unverified; this document authorizes no source dispatch before root plus cold design approval.
