# Plan 162: obstacle-aware edge routing

Plan 162 at commit `dde2dd6` implements unit 10 and adopted D10 from Plan 149. Imported `research/artifacts/` evidence is unchanged. This trace separates real production entry points from test composition. Catalog C means achievable functional closeness, not private Pro implementation or exact-coordinate parity.

## Public reference and engine pre-flight

The [public Edge Routing description](https://reactflow.dev/examples/edges/edge-routing) was read on 2026-10-26. It identifies automatic custom-edge routing with libavoid and links the routing guide. Flow tests compare that promised obstacle-routing outcome. Subscription source was not accessed. The linked Pro demo was inaccessible to the web reader; no live reference interaction is claimed.

Before implementation, the unmodified `libavoid-js@0.5.0-beta.5` loaded its WASM and routed orthogonally around a rectangle in Chromium under each actual host's Vite config. The separately locked three-project command passed **3/3**, with one worker and fresh strict ports 4186–4188. The shared raw probe begins at `apps/shared/routing-preflight/main.js:1`; transaction processing and native route extraction are in that module. Its acceptance starts at `apps/shared/routing-preflight/acceptance.ts:13`. Host HTML enters through each host-local `routing-preflight.js`. This proves engine loading/routing, not production Flow integration. A separate earlier Foldkit command also passed one test.

The initial Vanilla/Vue probes waited behind live runs, then were replaced by the dedicated command. A later lock was stale: recorded PID 95193 no longer existed, and no other Playwright test process was running. Only that stale lock was removed after checking its unchanged owner. The command then acquired a fresh lock normally. Its first attempt stopped at occupied port 4177 before engine execution. Dedicated unused ports resolved that harness conflict; the other checkout's server was left alone. No engine was switched.

The [published metadata](https://registry.npmjs.org/libavoid-js/0.5.0-beta.5) pins git head `5062a42fbd82fff562afeebcbb7b1ed45eed8e75`. Package size is 813,186 unpacked bytes; WASM size is 492,029 bytes. Installed JavaScript and WASM compare byte-for-byte with the published tarball. SHA-256 values are `b37ef71a879c786edd03895891a55df2288427ce21f3a00e79e92e9ade205c16` and `65deb7172894049eb554cf6e02c520274ac117a1992d3d16a3f346c09ceb41e5` respectively.

## Shared production contract and geometry

`packages/core/src/domain/flow-routing.schema.ts:20` defines finite obstacle rectangles, directed ports, clearance, port offset and a revision. `FlowRouter` is a typed Effect service; its service object type is `FlowRouterService`. Output is revision-keyed and contains exactly one routed or unreachable outcome per connection. Typed failures distinguish invalid requests, engine failures and invalid results. Native Effect interruption applies; session cancellation returns an explicit cancelled outcome.

`packages/core/src/domain/flow-routing.ts:73` starts with the accepted document and measured geometry. It resolves visible bounds and current handle anchors, omitting manual edges. Pure port exits and rectangle intersection helpers define the shared constraints. `packages/core/src/domain/flow-routing.ts:185` schema-decodes input, invokes the capability and validates revision, IDs, endpoints, orthogonality, directions, port offset and obstacle clearance. `packages/core/src/domain/flow-routing.ts:234` owns latest-request identity, cancellation and disposal.

`packages/core/src/domain/flow-routing-geometry.ts:5` builds a canonical geometry key from explicit fields. Measurements with reordered object properties have the same key. Position, size, handles and route mode invalidate it; selection, viewport and opaque data do not. The renderer checks the current key and current anchors before accepting a generated path. Session ownership discards both stale successes and stale failures, while preserving native interruption. A missing, stale, unreachable or failed result falls back to the existing path algorithm.

`packages/core/src/domain/flow-routing-geometry.ts:60` returns the same polyline and arc-length label midpoint used by manual geometry. `packages/core/src/domain/flow-edge-geometry.ts:178` accepts the derived `edgeRouting` option. Distance and intersection queries consume that resulting path. Manual points always take precedence. Generated points never enter document edits, history, persistence or clipboard state. Save/load reconstructs automatic geometry from current intent and measurements.

## Optional adapter and distribution

`packages/routing-libavoid/src/public.ts:91` implements the service. The separately packed package leaves core, Effect and libavoid JavaScript external, and exports the original WASM as a separate asset. The caller supplies its replaceable URL. Initialization is asynchronous and lazy, shared once per realm. Each request owns native routers, connectors and temporary geometry, released before settlement.

The pinned package exports a nonexistent declaration path and stale constants. The adapter supplies only an unchecked vendor namespace declaration, then decodes the actual Embind API without editing libavoid. Enum namespaces are functions, which the boundary decoder handles. Port exit stubs follow the requested side; libavoid routes between those exits around expanded rectangles. Blocked ports are explicit unreachable outcomes. Synchronous native transactions cannot be interrupted mid-call. Effect cancellation stops pending work and revision/session checks reject late publication.

[Dependency notes](../../docs/dependencies.md) and the [adapter README](../../packages/routing-libavoid/README.md) record owner, exact beta version, size, maturity, alternatives, removal boundary and LGPL obligations, including replacement/relinking rights. The upstream licence is included. Separate packaging does not waive a consuming application's obligations. No Flow licence was changed, and this is not legal advice.

Architecture checks reject both source imports and dependency declarations in core and published Vanilla/Vue/Foldkit packages, with negative fixtures for every protected owner. The private shared recipe opts in. A separately packed consumer installs only tarballs and registry dependencies, typechecks with library checking enabled, compares the exported WASM bytes and executes a real route.

## Vanilla production path

The JavaScript public setter enters at `apps/vanilla/src/mount-flow.ts:15132`. It schema-decodes the incoming result and the typed host setter at `apps/vanilla/src/mount-flow.ts:14022` stores a copy outside document state. The setter reconciles the existing graph projection. Captured measured nodes and presentation positions reach `apps/vanilla/src/edge-renderer.ts:733`, which checks revision and anchors before supplying visible SVG, hit path and label geometry. Route editing reads the same derived geometry. Destroy retains the host's existing lifecycle cleanup.

## Vue production path

`FlowCanvas.edgeRouting` is a reactive optional result prop, with `null` or omission clearing it. The accepted prop is schema-decoded once at `packages/vue/src/flow-canvas.ts:1847`. Current measurements and live position overrides feed `packages/vue/src/flow-canvas.ts:1853`. Visible path, interaction path, label and Enter insertion use that common result. Parent document ownership and authored manual points remain unchanged. The demo scopes observation/cancellation to Vue unmount.

## Foldkit production path

`packages/foldkit/src/host-action.ts:45` enters through the public Runtime action port. Application composition forwards it at `packages/foldkit/src/application.ts:2561`; graph update stores derived state separately from the document. `packages/foldkit/src/graph.ts:5534` uses current live document/measurement geometry and the common automatic resolver for SVG, hit targets and labels. Snapshot responses expose derived results separately from saved state, and `instance.getEdgesGeometry()` includes them. Point editing reads that same geometry.

The browser resize fixture exposed retained measurements after an uncontrolled public edit changed declared dimensions. `requestEdit` now reuses `packages/foldkit/src/document-measurements.ts:57`, the existing replacement lifecycle, to invalidate only mismatched size samples. Both existing measurement helpers moved intact into this framework module. Core measurement IO was not changed, preserving the parallel Plan 161 boundary.

## Test paths and acceptance

The raw engine pre-flight is separate from production integration. Each host's `edge-routing.e2e.ts:3` invokes the shared acceptance at `apps/shared/edge-routing/acceptance.ts:106`. Real HTML entry points mount each host and use the shared application recipe, which observes measurements, debounces changes, cancels old work and publishes derived results through that host's public API. Test hooks inject latency and failures, not a substitute routing engine.

Latest targeted results: **11/11 Vanilla, 11/11 Vue, 11/11 Foldkit**. Cases cover the common rendered route, label midpoint and native hit selection; native obstacle drag; resized obstacles and reconnection; changed handle directions; unreachable and engine failures with visible fallback; manual points/data through edits and save/load; automatic reconstruction without stored generated points; async races; viewport transforms; disposal.

`tests/routing/router-contract.ts:47` is reusable by any engine factory. Ten real libavoid cases cover four port rotations, detours, changed/resized obstacles, blocked source/target ports, invalid input and manual exclusion. Ten core cases cover shared path/label/distance/intersection output, manual precedence, stale geometry, canonical keys, port-offset validation, invalid router output, races, cancellation/disposal, stale engine failures and native interruption. One isolated packed-consumer case verifies distribution. The targeted core/engine/package suite passes **21/21**. The required verifier passes **2,802 tests across 128 files**; its browser totals are recorded below.

Initial failures found and corrected an object-property-order revision mismatch, the Foldkit measurement invalidation bug, and fixture assumptions about HTML labels and Vue's inset canvas origin. Assertions now compare actual graph-space geometry and the public path output. No upstream assertion was weakened. The raw engine, generated paths and authored manual points remain separate.

## Catalog and command evidence

`Edge Routing · Pro` changes **G→C in all three hosts** after the named acceptance passes. The prior reaudit is retained. A new Plan 162 reaudit cites the capability and public gesture evidence; counts are recomputed from entries: **193/195** in-scope entries close in all hosts, and each host's Pro counts are **C14/P0/G2** across 16 entries. The example registry now points to runnable `/edge-routing/` routes and the tests, retaining unverified exact-reference comparison.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed |
| `bun add --dev --exact libavoid-js@0.5.0-beta.5`; workspace `bun install` | Exact dependency and optional workspace installed |
| `cmp` against published JS/WASM; `shasum -a 256` | Identical bytes; hashes above |
| Separately locked original Vanilla/Vue pre-flight commands | Terminated while waiting, exit 143, superseded by combined projects |
| Locked Foldkit raw pre-flight | One passed |
| Retired standalone three-host pre-flight config | Three passed after strict-port isolation; earlier attempt stopped before tests on occupied 4177 |
| `bun run build:packages` and `bun run tsc --noEmit` | Passed; an initial direct typecheck before build outputs failed, then passed after building |
| Targeted Vitest core/engine contracts and isolated package test | 21/21; included in the final 2,802-unit pass |
| `bun run test` | 2,802 passed, 128 files in the required verifier; earlier baseline 2,801 before the stale-failure case |
| Retired standalone three-host edge-routing config | 33 passed on final source; an additional three-host native SVG/DOM clearance assertion also passed |
| Scoped `oxlint --fix`, `oxfmt`; `bun run check` | Passed on owned changes |
| `bun run check:architecture` | Passed source/dependency boundaries and negative fixtures |
| `bun run docs:generate-api` | Generated current API reference |
| `bun run research:check-traces`; `bun run docs:check` | Passed, including current source citations and API docs |
| `FLOW_VUE_TEST_PORT=4187 scripts/with-flow-browser-lock.sh bun run verify --check reference-host` | Passed focused profile: 2,802 unit tests; reference 238 classified cases; Vanilla 979 passed / 4 skipped; Vue 1,113 passed / 2 skipped; Foldkit 737 passed |

Verification scope is additive: every previous check and browser file remains, with `routing-preflight.e2e.ts` and `edge-routing.e2e.ts` added for each host. The Vue port override uses a new strict server on 4187 rather than the other checkout's occupied 4177. It changes no tests or checks. Every browser command acquires the shared lock separately; no interactive shell is wrapped in it. No push or merge is authorized or performed.

The first required verifier passed all non-browser gates, 238 classified React reference cases, and Vanilla's 979 passed / 4 skipped cases. It was stopped during Vue after discovering two hard-coded Vue test URLs. The shared upstream adapter now follows `FLOW_VUE_TEST_PORT`; the mobile gesture context follows Playwright's configured `baseURL`. Assertions are unchanged. No Vue result from that attempt is claimed. A detached baseline was installed while investigating red reference markers, then its queued browser command was cancelled before execution after confirming those were existing expected-failure classifications. The temporary worktree was removed.

## Observability and verification boundary

Core request decoding uses `FlowSpan.documentDecode`; routing uses `FlowSpan.editPrepare`; engine failures log structured failure names/messages under `FlowSpan.editFailure`. Derived changes use the existing change/count attributes. Host mount, destroy and geometry observers retain their lifecycle spans. Pointer moves are not logged. Application composition still owns optional OTLP export and flushing. Collector delivery was not tested.

The required final locked verifier passed the **focused** profile with every preserved check and browser file: **2,802 unit tests across 128 files; 238 classified React reference cases; Vanilla 979 passed / 4 skipped across 68 selected files; Vue 1,113 passed / 2 skipped across 66 selected files; Foldkit 737 passed across 78 selected files**. This includes all three raw pre-flights and all 33 routing acceptance cases on final source. The six skipped cases are existing suite classifications; no assertion or scope was weakened. No full-profile acceptance is claimed.

## Plan 177 command consolidation

The standalone configs are retired. Each host still invokes the same shared acceptance modules from `apps/<host>/e2e/routing-preflight.e2e.ts` and `apps/<host>/e2e/edge-routing.e2e.ts`. Run the host wrappers with `scripts/with-flow-browser-lock.sh bun run verify --vanilla edge-routing.e2e.ts --vanilla routing-preflight.e2e.ts --vue edge-routing.e2e.ts --vue routing-preflight.e2e.ts --foldkit edge-routing.e2e.ts --foldkit routing-preflight.e2e.ts`. The historical counts above describe the original three-host runs.

## Conformity and deviations

- **Conforming to adopted D10 and Plan 162 outcomes:** an optional unmodified libavoid adapter, typed Effect capability, measured obstacle/port constraints, revision-keyed derived paths, manual precedence, explicit failures/fallbacks, cancellation and shared rendered geometry. Boundary: real engine contracts, isolated packed consumer and eleven browser cases in each host.
- **Intentionally different policy:** Flow uses orthogonal polylines, eight-unit clearance, twenty-unit port offset and the existing automatic edge algorithm as an explicitly labelled fallback. Generated paths are presentation state, not saved manual points. These are Flow policies, not claims about private Pro constants or architecture.
- **Unverified:** private Pro source and exact path/nudging parity, arbitrary custom-renderer geometry, full-profile acceptance and collector delivery. Synchronous WASM transaction preemption is unsupported; cancellation prevents pending/late publication instead.
