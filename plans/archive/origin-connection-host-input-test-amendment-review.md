# Independent 081 input and Vanilla test amendment review

Verdict: **APPROVE** the narrow design amendment. This approves the Schema-derived input signature, three specified existing Vanilla test migrations, and the final single Vue default-preview assertion prerequisite. It does not accept the prepared 081 source or any execution evidence.

Reviewed on 2026-09-30. I read the complete main `plans/081-wire-origin-and-connection-hosts.md`, including its “Own-undefined input signature and existing Vanilla tests” section at lines227-237, then personally rechecked the newly appended “Existing Vue default-path assertion prerequisite.” Final reviewed plan SHA-256: `fea8dd7299591e92bf93b0c547f8dd802828221d7ba8ad385e435bef6cb05793` (the prior input/Vanilla-only revision was `b6395ca28348a103b4f46effd5313546d59424ae12047e465ca41c5b5b912aac`). The previously approved architecture and its acceptance boundaries remain in force.

## Source identities and evidence

The existing production/test source inspected here is the accepted ordered-legacy assembly at `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow`, with Git HEAD `841be137e253cf19c665269eaaa79edc19abf3c3` plus its uncommitted composition. HEAD alone does not identify that assembly. Relevant actual file SHA-256 values:

- `apps/vanilla/src/mount-flow.ts`: `146e153465abf0c113cfd2458d9c559e3de701b4800eba5c25ddbfbe7082434e`.
- `apps/vanilla/e2e/canvas.e2e.ts`: `7ace12e464eb9fc8af1c6097f5a3b869ae393aa62d9c77e2f71d99f9ee8a2142`.
- `apps/vanilla/e2e/viewport-operations.e2e.ts`: `301ae11e8c7f9fe1a1fe8f83cb6d3e448ebd60d4c23be93fe739db4a9abb7154`.
- `apps/vanilla/e2e/gesture-options.e2e.ts`: `2797ec636e2504b86ab4d005d2418f287e3c3ef7ee671820d3eb58a9588c69df`.
- `apps/vue/e2e/connection.e2e.ts`: `7e9955c60a0866abe6dd6d03102702aa1e0b8a56c3bd2743286c81477092efce`.
- `packages/core/src/domain/flow-edge.schema.ts`: `a2c5b5e69dbb88b524d01679a4a30742f2fd934f7ecf20fa736c07b47c5a48f1`.

The draft options file is separately inspected in `/Users/richardmcandrews/.codex/worktrees/origin-connection-hosts/flow`: `packages/core/src/domain/flow-connection-options.schema.ts`, SHA-256 `10f2d5e89c142505aac1992cd5ff55e3edf032169319fadde69e8a3f8bfd0d73`. This is a prepared draft, not an approved source implementation.

## Input contract

The draft required `ConnectionOptionsSchema` and derived resolved type are at `flow-connection-options.schema.ts:22-29`; its optional runtime input schema is at `:31-37`. The resolver at `:50-60` already decodes the optional input before applying defaults and decoding the complete resolved schema. Its `Partial<ConnectionOptions>` parameter at `:51` disagrees with that runtime contract under `tsconfig.json:23` (`exactOptionalPropertyTypes: true`). I read the primary's planning probe and `/tmp/flow-081-input-signature-primary-probe.log`: both owned-radius-undefined and owned-click-undefined calls produce TS2379. I did not rerun that probe.

The installed Effect implementation at draft `node_modules/effect/src/Schema.ts:2343-2359` makes `S.optional(scalar)` an optional key of `UndefinedOr<scalar>`. It accepts missing and explicitly undefined fields without accepting null. Exporting the existing optional schema, deriving `ConnectionOptionsInput` from its `.Type`, using that type for the resolver, and exporting both through `packages/core/src/public.ts` therefore directly fixes the mismatch. The draft currently lacks these public exports at `public.ts:586-587`; their addition remains implementation work.

This introduces no competing contract: the input schema reuses the five authoritative scalar schemas, while the complete schema still owns required resolved output. Valid existing Partial callers remain assignable. Missing and owned undefined inherit the unchanged defaults (strict, graph radius20, screen threshold1, clicktrue, Bezier/default). Zero and false remain supplied values. Optional decoding must continue to reject null and invalid scalar values before nullish default resolution. Compiler and runtime checks should cover the full five-field input contract, including public packed exports, rather than prove only the two reported calls. No casts or parallel interface are needed.

## Actual Vanilla test dependencies

Production starts a pointer connection at accepted `apps/vanilla/src/mount-flow.ts:3345-3385` and immediately creates a preview at `:3378`. The preview currently creates a line with x/y attributes at `:3001-3035`, then updates its endpoint at `:2927-2945`. Physical start centers come from current measurements or inference at `:2545-2584`. Nearby target lookup converts those centers into client space and compares the existing radius in that space at `:2638-2664`; direct closest-handle selection precedes that lookup at `:2587-2598`. These are real existing call paths that 081's already approved threshold, default Bezier path, measured readiness, and graph-radius policies change.

The three test dependencies are concrete and bounded:

- `canvas.e2e.ts:1333-1367` asserts active preview immediately after pointerdown before removing the source. Crossing the delivered threshold first preserves its active cancellation/no-change proof. `:1370-1406` inspects the immediate line and fixed fallback coordinates249/142. The amendment replaces that representation-specific expectation with pending/no-preview, current positive declared-handle readiness, independently observed DOM-center conversion, public preview from coordinates, and the actual default Bezier path start. The successful release and document ownership checks remain required. This does not authorize changing stored edge attachment behavior or merely comparing two values generated by the same production helper.
- `viewport-operations.e2e.ts:252-300` explicitly treats radius as screen pixels, uses unscaled displacements at `:273-275`, and asserts immediate preview at `:279`. Expressing near/far in graph units at both zooms and checking delivered coordinates repairs those stale assumptions. Direct invalid hover, removal of valid hover, invalid release with zero edges, and both zoom cases at `:280-300` must survive. A direct hit must remain the actually hovered invalid handle; the test must not switch to eligible-only selection or enlarge radius.
- `gesture-options.e2e.ts:1016-1071` asserts immediate preview at `:1034` before exercising distant auto-pan. Crossing threshold before visibility retains the original pan beyond550, actual target hit, final edge-add, preview removal, and final viewport assertions at `:1035-1071`. The separate two-click pending/cancel contract at `:1074-1086` remains unchanged.

Adding exactly these three whole files to the explicit allowlist and saved focused browser scope is warranted. The appended amendment makes that addition explicit despite the earlier base lists. It does not authorize blanket threshold0 fixtures, a hidden compatibility line, skips, tolerance/timeout changes, snapshot refreshes, or changes to unrelated pointer tests. Full integration remains required in addition to the saved focused scope.

## Final Vue prerequisite recheck

I read the entire accepted `apps/vue/e2e/connection.e2e.ts:1`. It genuinely moves after pointerdown at `:30-32`; only its preview assertion at `:33-35` expects `/^M /`. The actual current Vue renderer uses `straightEdgePath` for that preview at `packages/vue/src/flow-canvas.ts:5023-5041`. The approved default Bezier builder at `packages/core/src/domain/flow-edge.schema.ts:134-143` emits `M{x},{y} C...`, so the old formatting assertion is a concrete dependency of the already approved default-path change.

Adding only this existing Vue file to the allowlist and saved Vue focused scope is approved. Checking a genuine cubic path plus SVG start/end transformed into client space against measured initiating/hovered DOM centers preserves and strengthens the preview proof. Readiness must precede the endpoint observation; compare observed geometry independently rather than invoking the production path builder to produce expected endpoints. Both accepted edge increments at `connection.e2e.ts:39,70`, the stored-edge assertion at `:40-43`, and second-click workflow at `:45-70` remain unchanged. The stored-edge prefix does not become a preview compatibility requirement: 081 does not change the stored edge default. No cosmetic production formatting fix, permissive any-path prefix, tolerance/timeout/skip/snapshot change, or extra file is approved. Exact five-formula proof remains in the mandatory native contract suites.

## Conformity and deviations

**Conforming design:** the optional input type derives from its runtime schema, defaults follow validation, required resolved options remain authoritative, and each migrated test continues through the actual public browser path while retaining its specific cancellation, geometry, hover, auto-pan, and commit checks.

**Intentional reviewed changes:** owned undefined becomes correctly expressible in the exported input type; existing tests move from immediate pointer preview, line attributes, screen radius, and the Vue straight-preview prefix to the approved threshold1, default Bezier, and graph-radius behavior. Those policies were already approved in 081; this amendment concretizes their type and test dependencies.

**Unverified:** amendment implementation, generated/packed declarations, compiler/runtime rejection assertions, mounted behavior, focused/full/release gates, and final source acceptance. I ran no builds, tests, browsers, or port operations and edited only this record. Original069 generic,074 genuine unnamed/nested,068/074 accessibility rendering, remaining reference/device cases, and parent member acceptance remain held. This approval creates no source parity or semantic closure claim.

## Vanilla drag helper clarification recheck, 2026-09-30

Verdict: **APPROVE** the final helper timing clarification in the already authorized `canvas.e2e.ts`. Latest canonical081 SHA-256: `5c3adaf67a623e82e632b90c0b6ef32264bdefbc1df07f4a5d7e35fdfdf15398`. This supersedes the earlier reviewed plan hash for the appended clarification only; all preceding design approvals and source acceptance boundaries remain intact.

I personally read accepted `canvas.e2e.ts:20-89`, helper `:91-126`, and every actual caller at `:1235,1257,1269,1285,1286,1325` with their assertions through `:1328`. The fixture mounts the real public host with zoom1 and no threshold override. The helper observes physical DOM bounds, presses the source, asserts immediate visibility at `:119`, moves to the existing target center at `:120-123`, releases at `:124`, and checks preview teardown at `:125`. Its visibility assertion is the omitted immediate-activation dependency.

The specified sequence is sound: pending/no preview after pointerdown, the existing target move, active preview before release, then unchanged release/teardown. This retains visibility proof rather than dropping it or adding a fixture override. Activation must follow actual delivered displacement above the configured threshold; source coordinates alone do not prove a browser event was delivered.

Keep all caller checks: exact edge-add payload, one semantic change and one rendered edge, unchanged connected screenshot, duplicate rejection at `:1237-1261`; invalid source-to-source zero changes/edges and unchanged rejected screenshot at `:1265-1277`; two controlled proposals with zero accepted rendered edges, explicit document acknowledgement, one rendered edge, and no extra proposal after the final duplicate at `:1281-1328`. No caller, screenshot, threshold/default, tolerance/timeout, or unrelated case edit is authorized by this recheck. The accepted source file hash remains the previously recorded `7ace12e464eb9fc8af1c6097f5a3b869ae393aa62d9c77e2f71d99f9ee8a2142`.

### Conformity and deviations

**Conforming design:** the common helper now tests the approved pending-to-active threshold boundary while preserving all six callers' semantic, ownership, duplicate, invalid-kind, rendering, and screenshot assertions. **Intentional change:** preview visibility moves after its existing genuine target movement. **Unverified:** delivered runtime displacement and all implementation/gate evidence. This was read-only source review with only this record edited; no gates, browsers, ports, product changes, or original held-cell closure.
