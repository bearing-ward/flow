# Optional layout engines

`@flow/layout` is a private workspace integration. Its only package entry exports `runLayoutEngine`, `createForceSimulation`, and `hierarchyRoot` from `src/public.ts`. It has no built or packed distribution contract.

`runLayoutEngine(request)` takes core's measured `FlowLayoutRequest` and returns an Effect of top-left positions. It supports Dagre, d3-hierarchy, and ELK. `createForceSimulation(input, document, center)` owns a manually ticked d3-force solver and returns `configure`, `tick`, `settled`, `pin`, `restore`, and `dispose`. `hierarchyRoot(input)` rejects multiple parents before constructing the D3 hierarchy. It is a low-level helper; `runLayoutEngine` reports hierarchy failures through its Effect.

Apps and `@flow/recipe-shared` opt in. Core defines settings, measured input, revision identity, and position application, and has no engine dependency. See [layout engines](../../docs/layout-engines.md) for the host recipes and acceptance boundary and [dependency ownership](../../docs/dependencies.md#plan-157-optional-layout-integration) for alternatives and removal policy.
