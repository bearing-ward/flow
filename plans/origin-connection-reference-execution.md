# Origin and connection upstream capture

Baseline841be13. Product source is untouched. This stage observes the public pinned React12.11.6 runtime at clean full SHA0a1f9575b25679f2880175de8d3eae21aedde921. No Flow parity or original member closure follows from upstream-only captures.

The harness mounts actual ReactFlow/ReactFlowProvider, custom public Handle nodes, public useReactFlow/useNodesInitialized/useConnection and native custom ConnectionLine. The script drives real Playwright mouse events, polls public measurement readiness and captures two independent runs. Capture schema derives all stored observation types. Normalization rounds physical coordinates only, excludes timestamps from sample equality, and preserves nullable IDs versus omitted serialization fields explicitly. Custom renderer callbacks stay in the harness.

| Boundary | Scenarios | Evidence |
| --- | --- | --- |
| Origins and geometry | global[0,0], [.5,.5], [1,1], [-.5,1.5]; per-nodeoverride; nestedparent | public internal absolute positions/measured handles, DOM bounds, SVG endpoints, toObject anchors/origins |
| Directed eligibility | strict/loose, source/target initiation, opposite/samekind, same physical handle | actual pointer callbacks and accepted toObject edges, separate rendered path/error008 |
| Nullable identities | named and genuinely unnamed physical handles | callbacknull, actual handle IDs, stored own-key presence |
| Threshold | 0 immediate,1 exact and above | native pointer movement and public inProgress snapshots |
| Radius | graph radius20 atzoom.5/2, delivered inside/boundary20/outside22 | actual mouse positions and public validity/target projections |
| Line default/type | absent default and five explicit enum values | actual default SVG paths and status |
| Custom line payload | valid/invalid/free pointer under pan/zoom | actual callback geometry/style/status/nullabletarget and public hook, container-local pointer |

Source leads inspected before coding: pinned XYHandle.ts124-154 threshold/radius,298-315 directedeligibility; useConnection.ts7-10 publicgraph projection; ConnectionLine/index.tsx79-96 customprops and111-131 nativepath switch; positions.ts34-57 source-kind-only lookup. Target-target connection acceptance does not imply rendered edge acceptance. The actual captured error/path count retains this distinction.

The final matrix adds actual custom absent-style delivery and forward/backward path captures. Source/target sides beyond the caller right/left pair remain unverified.

Port4196 is strict and owned by this script; script closes page/browser and server in finally. Disposable checkout builds may change ignored build output only; clean tracked checkout is verified before and after. Required gates are targeted capture conformance, quality/type/architecture and focused verify with no host browser gates, plus two stable capture samples. Blocked or uncaptured variants remain unverified.

## Conformity and deviations

This artifact describes pinned upstream behavior only. Flow's named-ID ownership, frozen v1/v2 envelopes, class-data contract, host adapters and origin activation are independent stages. Public runtime capture and schema validation are the evidence boundary; production Flow behavior, current upstream website and final067 acceptance remain unverified.

## Execution evidence

Frozen install passed with unchanged lockfile. Initial public capture passed30 scenarios twice; strengthening added delivered graph radius boundary/outside cases, backward path geometry, real custom style absence and stored parentId, bringing final capture to33 scenarios twice. Both normalized samples match. An independent TSX compiler probe initially rejected a readonly Schema tuple assigned to upstream mutable NodeOrigin; explicit `[origin[0], origin[1]]` copying repaired this with no assertion or cast. The rerunnable capture now owns this separate TSX type gate and passed. First targeted conformance run passed22 tests; added optionalstyle assertion is verified in final gates. No host browser gates apply to this upstream-only artifact. Workspace quality/type/architecture passed before final metadata coverage additions; final focused verification below supersedes that intermediate pass.

Final gates: capture command exited0 with33 scenarios × two independently mounted stable samples. Pinned producer TSX compile passed inside capture. Targeted conformance passed23/23. `bun run verify --list` selected focused quality, architecture, package builds, workspace types, unit suite432tests/47files, documentation, original member ownership and research trace citations, with no host browser gates. `bun run verify` exited0 in19.493seconds. The log is `/tmp/flow-origin-reference-verify.log`; capture log `/tmp/flow-origin-reference-capture.log`. The full integration/release profile was not run for this capture-only stage. No semantic member closure was recorded. Final whitespace check passed; pin is still clean and owned4196 has no listener.
