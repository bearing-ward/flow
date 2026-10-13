# Native optional input signature amendment

Design review pending. Applies only to the active isolated 081 candidate at `/Users/richardmcandrews/.codex/worktrees/origin-connection-hosts/flow`, based on canonical 081 hash `7175c38bdb575672d4f6c12ecfadc50be6b9fbc4e150d232b9a472835290c1b0` and main `841be137e253cf19c665269eaaa79edc19abf3c3`.

## Reproduced boundary

Primary `plans/native-owned-undefined-probe.ts` imports actual candidate public FlowCanvas and Vue 3.5.43. Strict `tsc --noEmit --target ESNext --module ESNext --moduleResolution bundler --strict --exactOptionalPropertyTypes --skipLibCheck --allowImportingTsExtensions plans/native-owned-undefined-probe.ts` fails with TS2769 for all five owned undefined connection options and nodeOrigin, plus TS2375 for Foldkit's owned undefined connectOnClick. Actual compiler exit is 2, retained in `/tmp/flow-081-primary-native-owned-undefined-probe.log`. The shell output wrapper completed successfully; this is not a successful compiler check.

The approved `ConnectionOptionsInputSchema` in `packages/core/src/domain/flow-connection-options.schema.ts` already derives optional fields with explicit undefined and rejects null before resolving defaults. Vue `flow-canvas.ts:639-662,684` currently uses resolved scalar PropTypes or inferred Boolean, excluding undefined from external h calls. Foldkit `graph.ts:490` still declares `connectOnClick?: boolean`. Vue `flow-canvas.ts:886-897` already decodes `S.optional(NodeOriginSchema)` and rejects defined origin with split model binding.

## Exact correction

Use the existing exported Schema-derived `ConnectionOptionsInput` indexed field types for all five Vue external option PropTypes, including connectOnClick's Boolean constructor, and for Foldkit's existing connectOnClick option. Do not weaken the resolved required ConnectionOptions or Model. Preserve every current runtime prop default and the approved decode-before-default policy. Null remains invalid at compile time and runtime.

For Vue nodeOrigin use one local authoritative `S.optional(NodeOriginSchema)` schema and derive its native input type from that schema. Reuse that schema for requestedOrigin decoding. No handwritten duplicate union, any cast, new core public origin-input symbol, omitted owned fields, or new state ownership. Existing native PropType framework boundary remains allowed. If Vue's actual inferred public signature still rejects undefined or admits null, STOP with the exact public-call compiler evidence instead of adding a broad cast.

Vue fixtures must use actual public accepted snapshots/notifications and owner acknowledgment. Do not add a public revision API or restore baseRevision field merely because a draft test assumed those existed. Internal editor getDocumentRevision does not imply it is a useFlow public method. Preserve positive DOM geometry and versioned restoration proof.

## Verification and scope

Add positive strict public and packed Vue h calls containing all six owned undefined fields; Foldkit createProgram input must accept owned undefined connectOnClick. Retain negative null checks for all six Vue fields and Foldkit connectOnClick, enum rejection, required resolved shape, runtime null rejection, default values, split binding rejection for defined origin, and unchanged accepted controlled state until owner acknowledgment. The existing approved consumer files, Vue canvas/public if necessary, Foldkit graph, native fixture/test files, generated API docs, and execution record are the only source paths affected. No new product source files, dependencies, lock changes, assertions weakened, or gate counter reset.

After implementation primary reruns the exact probe against source and reviews actual packed declarations and mounted evidence. All existing 081 final focused, full, release, scope, ownership, capture and cleanup gates still apply.
