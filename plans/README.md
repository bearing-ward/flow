# Implementation plans

Plan 001 was written against the original unborn `main` and is complete at
`e393e3e`. Plans 002-010 were written with the improve skill on 2026-09-23
against that commit after a standard audit; the user selected all nine vetted
findings. Read each plan fully, run its drift check and STOP conditions, and
update its status row after the complete verification gate passes. Preserve
unrelated work. Do not commit, push, or open a PR without operator instruction.
Plan 011 was added on 2026-09-23 against `5274aef` and is complete. Plans
012-021 were written against `6e84008` as the next ten bounded scopes from
`research/PROGRESS.md` and the Plan 011 baseline. The former handoff is a dated
snapshot in `docs/archive/`; current status lives in `research/PROGRESS.md`. Later
plans must re-read the contracts produced by earlier plans before executing;
their drift checks and STOP conditions make that dependency explicit.

Plans 022-029 were written on 2026-09-24 against `5e5d496` using the open
items in `research/PROGRESS.md`. They form one interaction and canvas UI chunk:
reference boundaries, deterministic browser proof, multi-direction resize,
gesture cancellation, custom drag handles, panel placement, and focused
verification. They do not promise full xyflow or framework-adapter parity.
Plan 029's keyboard proof exposed a native renderer-control activation defect;
Plan 032 fixed native key ownership before Plan 029's proof resumed.
The advisor checkout had uncommitted documentation changes when these plans
were written; each executor must inspect live status and preserve them.

## Execution order and status

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-stabilize-graph-and-rendering-contracts.md) | Stabilize the graph document and extensible rendering contracts | P1 | L | none | DONE — `bun run verify` passed in the isolated worktree |
| [002](002-reposition-descendants-on-update.md) | Reposition descendants after an authoritative parent update | P1 | S | 001 | DONE — `0f4fef2`, reviewed; verify passed |
| [003](003-render-graph-stacking-order.md) | Render nodes in the graph's stacking order | P1 | S | 002 | DONE — `090aeb1`, reviewed; verify passed |
| [004](004-cancel-invalid-group-drag.md) | Cancel a group drag when any participant becomes invalid | P1 | S | 002 | DONE — `7e31770`, reviewed; verify passed |
| [005](005-clean-up-failed-renderer-mount.md) | Clean up a host when its initial renderer mount fails | P1 | M | 001 | DONE — `ed89b4b`, reviewed; verify passed |
| [006](006-unify-saved-document-contract.md) | Derive the saved-document contract from the domain schema | P1 | M | 001 | DONE — `2bb0933`, reviewed; verify passed |
| [007](007-cancel-gestures-on-lifecycle-loss.md) | Cancel active gestures on Escape, blur, and pointer capture loss | P1 | M | 004, 005 | DONE — `a44a5df`, reviewed; verify passed |
| [008](008-refresh-project-status-docs.md) | Refresh the handoff, progress checklist, and dependency record | P2 | S | 001; schedule after 002-007 | DONE — `72db1db`, reviewed; verify passed |
| [009](009-index-visible-edge-endpoints.md) | Remove repeated edge scans from viewport culling | P2 | S | 003, 004 | DONE — `a58a3a5`, reviewed; verify passed |
| [010](010-update-only-affected-edges-during-drag.md) | Update only affected edges during a node drag | P2 | M | 002-005, 009 | DONE — `a1e1e3a`, reviewed; verify passed |
| [011](011-characterize-spatial-and-gesture-contracts.md) | Establish spatial and gesture baselines before changing core state | P1 | M | 001-010 | DONE — `b41072a`, reviewed; verify passed |
| [012](012-decide-spatial-state-from-core-prototype.md) | Decide spatial state from a core-only prototype | P1 | M | 011 | DONE — `94a5850` + `e709097`, reviewed; verify passed |
| [013](013-model-pointer-gesture-lifecycle.md) | Model pointer gesture states and finish cancellation boundaries | P1 | L | 011 | DONE — reviewed; `bun run verify` passed; native concurrent-pointer and pinch cases remain unverified |
| [014](014-add-first-node-resize-contract.md) | Add a first node resize contract through core and vanilla | P1 | L | 013 | DONE — reviewed; `bun run verify` passed; PROGRESS 116 remains open |
| [015](015-finish-node-movement-and-descriptions.md) | Finish node movement edges and custom descriptions | P1 | L | 013, 014 | DONE — reviewed; `bun run verify` passed; auto-pan, locking, and description scope proven |
| [016](016-establish-shared-adapter-proof.md) | Establish shared adapter proof on vanilla | P1 | L | 013-015 | DONE — reviewed; `bun run verify` passed; vanilla fixtures and 2 reference captures verified |
| [017](017-settle-javascript-api-and-package-consumer.md) | Settle JavaScript facade and prove packed consumer | P1 | L | 014-016 | DONE — reviewed; packed consumer typecheck and Chromium mount passed; verify passed |
| [018](018-build-reusable-canvas-ui.md) | Build the first reusable canvas UI layer | P2 | L | 015-017 | DONE — reviewed; verify passed; general overlay portals remain open |
| [019](019-build-foldkit-adapter-first-slice.md) | Build a Foldkit adapter against the shared contract | P2 | L | 016-018 | DONE — reviewed; Effect/platform aligned to rc.116; verify passed; shared and active-disposal tests passed |
| [020](020-build-vue-adapter-first-slice.md) | Build a Vue adapter against the shared contract | P2 | L | 016-018 | DONE — reviewed; Vue build and 3 browser tests passed; `bun run verify` passed (142 browser passed, 2 skipped) |
| [021](021-prepare-delivery-gates-and-release-decisions.md) | Establish delivery checks and a release dry run | P2 | L | 016-020 | DONE — architecture/docs/consumer gates and internal dry run pass; Flow license deferred; no publish or hosted CI claim |
| [022](022-map-interaction-parity-boundaries.md) | Map the next interaction parity boundaries | P1 | M | none | DONE — reviewed in isolated worktree; trace/fixture matrix gates passed |
| [023](023-isolate-browser-test-servers.md) | Isolate browser test servers from development servers | P1 | S | none | DONE — reviewed in isolated worktree; full verify and occupied-port proof passed |
| [024](024-define-multidirection-resize-geometry.md) | Define multi-direction node resize geometry in core | P1 | L | 022 | DONE — reviewed in isolated worktree; core contract and full verify passed with Plan 023's isolated browser ports |
| [025](025-wire-multidirection-resize-in-vanilla.md) | Wire multi-direction resize through vanilla | P1 | L | 023, 024 | DONE — reviewed isolated worktree; 8-direction, controlled-child, nested-bounds, culling/UI and removal cases; full verify passed (2 native skips) |
| [026](026-complete-gesture-cancellation-proof.md) | Complete deterministic gesture cancellation proof | P1 | L | 022, 023, 025 | DONE — reviewed isolated worktree; exact session and cancellation matrix; zero-frame, capture, fresh-gesture gates passed; native cases remain skipped |
| [027](027-support-custom-drag-handles.md) | Support custom drag handles in the vanilla renderer | P2 | M | 022, 025, 026 | DONE — reviewed; keyed markers, no-drag, focus/keyboard/group drag and normalized fixture comparison; full verify passed (2 native skips) |
| [028](028-add-canvas-overlay-placement.md) | Add placed panels and overlay portals to vanilla | P2 | L | 022, 023 | DONE — reviewed in isolated worktree; six placements, validation, focus/selection restoration, host-local portal, docs, and full verify passed |
| [029](029-prove-interaction-ui-boundaries.md) | Prove the new interaction and UI boundaries | P2 | L | 023, 025-028 | DONE — reviewed; focused screenshots, keyboard/accessibility, capability matrix, parity trace and full verification passed |
| [030](030-render-canvas-panel-placements.md) | Complete canvas panel placement wiring | P1 | M | 028 | DONE — reviewed; typed host API, six visible placements, teardown restoration and full verify passed |
| [031](031-enable-keyboard-node-resizing.md) | Enable keyboard resizing for directional controls | P1 | M | 024-026, 030 | DONE — reviewed; arrow mapping, atomic controlled/uncontrolled resize, focus/cancellation and ancestor-hidden lifecycle pass full verify |
| [032](032-preserve-native-keyboard-activation-in-custom-nodes.md) | Preserve native keyboard activation in custom nodes | P1 | S | 027, 031 | DONE — reviewed; native keyboard ownership, focus, editing, no-drag, controlled state, node movement, and resize regressions pass full verify |

Status values: TODO, IN PROGRESS, DONE, BLOCKED with a reason, or REJECTED with
a reason.

Plans 002-010 were executed and reviewed in the isolated worktree
`/Users/richardmcandrews/.codex/worktrees/flow-plans-002-010/flow`, based on
`e393e3e`. Their nine commits are now on `main` through fast-forward `a1e1e3a`.

## Dependency notes

- Land 002 before 003 and 004: all three touch node reconciliation, and 002
  establishes the absolute-position update behavior they must preserve.
- Land 004 and 005 before 007: general gesture cancellation should build on
  correct group cancellation and guaranteed mount cleanup.
- Run 008 after the P1 implementation plans if its handoff should describe
  their results; it can be moved earlier for a documentation-only handoff.
- Land 003 and 004 before 009, then 009 before 010, to keep the culling and
  drag-edge performance work grounded in a stable browser reconciliation path.
- 006 is independent of the browser plans and should land before freezing or
  distributing the public persistence contract.
- Foldkit and Vue adapter work should wait for the graph/browser contract fixes
  and shared conformance design. The separate direction suggestions from the
  audit were not part of the nine selected defect/maintenance findings.
- 011 characterized spatial and gesture paths. Its 4,000-node local timings
  did not justify an index, so 012 compares a core-only candidate with the
  current scan before any production index integration.
- 013 stabilizes gesture state before 014 adds resize and 015 adds node
  auto-pan. 016 then captures the shared behavioral contract. 017 settles
  package and JavaScript consumption before 018's optional UI layer.
- 019 and 020 run the same suite on Foldkit and Vue. 021 adds delivery checks
  after package and adapter contracts exist. The plans are numbered in
  recommended order; 012 can run independently of 013-015 in separate
  isolated checkouts, but their implementation changes must be reconciled
  before landing.
- 022 defines observable boundaries before the resize, gesture, drag-handle,
  and overlay slices. 023 fixes a reproduced stale-Vite test-server problem;
  it can run alongside 022 but must land before browser-heavy 025-029.
- 024 keeps signed resize and extent math in core. 025 wires one atomic
  position/size result through vanilla; 026 then tests cancellation against
  the final resize gesture. 027 builds on those node interaction rules.
- 028 is independent of resize after 022-023 and can execute in a separate
  worktree. 029 follows the feature slices and records what the three
  adapters and pinned reference actually prove.
- Plan 029's renderer-button test found that the canvas node key handler
  prevented native Enter activation. Plan 032 fixed native key ownership;
  Plan 029 then completed its keyboard and capability evidence.

## Coverage recorded for Plans 012-021

`research/PROGRESS.md` is authoritative. This table records the scope and
limits of the earlier 012-021 rollout; a checklist box closes only when its
whole contract and test boundary pass.

| Open checklist area | Planned scope | Completion limit |
| --- | --- | --- |
| Spatial and gesture research/state (46 is done; 48, 52-53, 71-72 open) | 012, 013, 016 | 012 is a prototype decision; a winning index needs a separate integration plan. Full input mapping and stable performance budgets may need follow-up. |
| Canvas and node interactions (82, 88, 105, 110, 116, 119, 133) | 013-015, 018 | 014 is a first lower-right resize contract; broader resize parity remains separate. |
| Built-in canvas UI (155-160) | 018 | Check individual UI items only after browser proof and license decision. |
| Effect/public API and vanilla consumer (167, 169, 175, 177, 188) | 013, 015, 017 | Collector processing/storage/query at 167 is separate from browser OTLP transport. |
| Foldkit and Vue (192-208) | 019, 020 | Both must run Plan 016's shared fixtures; scaffolds alone do not close adapter conformance. |
| Shared proof (216-225) | 012, 016-020 | 216 and the suite start in 016; visual, touch, accessibility, property, lifecycle, and large-graph budgets remain open until their full matrices pass. Packed consumer proof is 017. |
| Delivery (22-25, 232-237) | 021 | Ultracite cleanup at 22 and actual publication at 237 require later scoped work; 021 configures checks, docs, and a dry run without claiming hosted CI or a release. |

## Coverage of the next interaction and UI chunk

| Open checklist area | Planned scope | Completion limit |
| --- | --- | --- |
| Input/UI reference traces and test mapping (47-48, 52) | 022 | Classify every selected cell; leave whole-checklist items open until their full coverage is demonstrated. |
| Resize nodes (116) | 024-025 | Eight directions, local position, extents, controlled ownership, browser geometry, and cancellation; record any remaining hierarchy semantics before checking 116. |
| Gesture cancellation and input tests (133, 219, 223) | 026 | Native concurrent pointer and two-contact capture remain unverified until exercised in a suitable device/browser harness. |
| Panels and overlay portals (158) | 028 | Close only after placement, caller ownership, pointer exclusion, and destroy restoration are browser-tested. |
| Visual and accessibility checks (218, 221) | 029 | Focused checks for this chunk are not whole-project visual coverage or a complete accessibility audit. |
| Reference drag-handle deviation | 027 | This is a feature parity gap from the two pinned captures, not a currently unchecked PROGRESS row. |
| Browser proof isolation | 023 | Fixes a reproduced local test-server contamination path; it does not imply hosted CI is green. |

## Findings considered and rejected

- Split the 3,556-line vanilla host immediately: structural cost is real, but
  a broad extraction before these contract fixes would add high regression
  risk. Reconsider after interaction characterization and a shared suite.
- Broad full-adapter feature parity in this chunk: Foldkit and Vue still have
  bounded surfaces, and adding vanilla gestures to them before the contracts
  settle would duplicate unstable behavior. Plan 029 records capability gaps
  for a later adapter chunk.
- No security issue met the evidence threshold in the audited host and core
  paths. Imported upstream artifacts and dependency advisories were not audited.
