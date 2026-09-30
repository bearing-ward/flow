# Database Schema recipe trace

## Scope

This trace records the three Flow host paths for caller-owned schema values and graph-owned connection handles. The implementation presents a native table-like schema; it does not add a schema store. The app's validated edit API changes both the node data used by the presenter and the node's declared `handles`.

## Vanilla production and test path

`apps/vanilla/ui-recipes/database-schema/index.html:10` loads `apps/vanilla/src/ui/database-schema-test.ts`. The fixture owns the initial schema and Flow document at `apps/vanilla/src/ui/database-schema-test.ts:120`; the renderer calls the public `createFlowDatabaseSchema` helper at `apps/vanilla/src/ui/database-schema-test.ts:99`. The helper renders the table and fields using caller values in `apps/vanilla/src/ui/database-schema.ts:15`. The renderer retains the currently mounted element and replaces that reference after every update at `apps/vanilla/src/ui/database-schema-test.ts:105`, so successive app-owned edits target the live element. The first and second public `controller.updateNode` calls submit the new revision and matching handle set at `apps/vanilla/src/ui/database-schema-test.ts:168` and `apps/vanilla/src/ui/database-schema-test.ts:181`; the canvas renders controls from accepted `FlowNode.handles`. The Connect Display Name action uses public `controller.addEdges` at `apps/vanilla/src/ui/database-schema-test.ts:193`.

`apps/vanilla/e2e/database-schema-recipe.e2e.ts:3` loads the direct route, checks the initial field and native source/side controls, applies the schema edit, verifies removal/addition and changed kind/side, then checks that the new connection is accepted.

## Vue production and test path

`apps/vue/ui-recipes/database-schema/index.html:10` loads `apps/vue/src/database-schema-test.ts`. The fixture creates a schema-decoded initial document at `apps/vue/src/database-schema-test.ts:107` and registers the custom node through public `FlowCanvas` at `apps/vue/src/database-schema-test.ts:132`. `NodeView` sends the app-owned edit through `useFlow().updateNode` and the accepted connection through `useFlow().addEdges` at `apps/vue/src/database-schema-test.ts:68`; `DatabaseSchema` renders reactive caller props as native table markup in `packages/vue/src/ui/database-schema.ts:18`. FlowCanvas owns the actual connection controls and updates them from the edited node handles.

`apps/vue/e2e/database-schema-recipe.e2e.ts:3` verifies the table changes, old controls disappear, new native `data-handle-kind` and side controls match the updated handles, and the public connection edit creates an edge.

## Foldkit production and test path

`apps/foldkit/ui-recipes/database-schema/index.html:10` loads `apps/foldkit/ui-recipes/database-schema/main.ts`. The app owns its decoded document and field values at `apps/foldkit/ui-recipes/database-schema/main.ts:30`; its `createProgram` node renderer composes the package helper at `apps/foldkit/ui-recipes/database-schema/main.ts:100`. `createFoldkitDatabaseSchema` creates the native table-like view at `packages/foldkit/src/ui/database-schema.ts:17`. The Update Schema action sends a validated `update-node` operation through the public Runtime edit request port at `apps/foldkit/ui-recipes/database-schema/main.ts:134`; Foldkit's graph adapter projects accepted node data and handles to the runtime view. The Connect Email action submits `add-edges` through the same public port at `apps/foldkit/ui-recipes/database-schema/main.ts:193` and displays the accepted document edge count.

`apps/foldkit/e2e/database-schema-recipe.e2e.ts:3` checks changed schema fields and actual runtime controls. Foldkit's host-native button exposes handle kind in its accessible name, plus `data-handle-side` and a side class; the test checks those actual identifiers rather than assuming a shared host DOM contract. The final accepted connection assertion uses the edit response's validated document.

## Ownership and mutation boundaries

The reusable components render the passed field list and do not mutate graph structures. The demo owns all table rows and issues public validated edits for node `data` and `handles`; host adapters retain control ownership, graph validation, and rendered connection controls. Vanilla/Vue prove a public `addEdges` result after the changed schema. Foldkit proves an accepted Runtime `add-edges` response. No UI recipe reads or mutates internal graph maps.

## Conformity and deviations

- Vanilla caller-owned field rendering and live edit behavior: conforming to this Flow recipe's declared outcome; checked through `mountFlow`, its public edit methods, and rendered native handle controls in the focused production E2E.
- Vue caller-owned field rendering and live edit behavior: conforming to this Flow recipe's declared outcome; checked through `FlowCanvas`/`useFlow` and rendered native controls in the focused production E2E.
- Foldkit caller-owned field rendering and live edit behavior: conforming to this Flow recipe's declared outcome; checked through the app-owned `Runtime` edit port and rendered native controls in the focused production E2E.
- React Flow visual, option, and behavior parity: unverified. The implementation uses original markup; no pinned or current reference comparison was performed.
- Exhaustive nested schemas, keyboard/screen-reader table navigation, responsive bounds, and packed-consumer imports: unverified. The test boundary is the direct host production routes, three sequential schema states for Vanilla and two states for Vue/Foldkit, and one accepted connection per host.
