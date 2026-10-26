# Optional libavoid routing adapter

`@flow/routing-libavoid` is a separately packed integration. Install it explicitly beside `@flow/core` and `effect@4.0.0`. Core and the Vanilla, Vue and Foldkit packages do not depend on it.

```ts
import { FlowRouter, routeFlowEdges } from '@flow/core'
import { createLibavoidRouter } from '@flow/routing-libavoid'
import wasmUrl from '@flow/routing-libavoid/libavoid.wasm?url'
import { Effect } from 'effect'

const router = createLibavoidRouter({ wasmUrl })
// request comes from createFlowRoutingRequest(document, geometryOptions).
const route = (request: unknown) =>
  Effect.runPromise(
    routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, router))
  )
```

`libavoidRouterLayer({ wasmUrl })` supplies the same service as an Effect Layer. Applications own the asset URL. Vite's `?url` import emits a replaceable asset. The JavaScript module and WASM load asynchronously on the first request. One module initialization is shared per JavaScript realm. Reload the realm to replace its library build. Native routers, connectors and temporary geometry belong to each request and are released before settlement.

The adapter pins unmodified `libavoid-js@0.5.0-beta.5`. Its exported declaration path is missing, and its declarations describe older constants. The adapter decodes the actual Embind namespace at the boundary without patching the dependency. The beta package is 813,186 bytes unpacked; its WASM is 492,029 bytes. The built adapter keeps `effect`, `@flow/core` and `libavoid-js` external and exports the unmodified WASM separately. `COPYING.LIB` contains the upstream licence text.

Port exits follow the requested side for `clearance + portOffset` units. libavoid routes orthogonally between those exits around expanded obstacle rectangles. A blocked exit returns `unreachable`. Native transaction processing is synchronous; Effect cancellation stops pending asynchronous work and prevents publication, but cannot preempt a WASM transaction already executing on the main thread. Latest-result and geometry-revision checks remain required.

## Licence and replacement

The dependency is LGPL-2.1-or-later. Distributors must retain notices and licence text, supply corresponding library source including build scripts as required, and let recipients replace or relink the library. Application terms must permit modification for personal use and reverse engineering to debug it. Library modifications retain LGPL obligations. A separate adapter does not remove application bundling obligations. Keep replaceable modules/assets or provide suitable relinking materials. Sources and terms: [pinned upstream](https://github.com/Aksem/libavoid-js/tree/5062a42fbd82fff562afeebcbb7b1ed45eed8e75), [licence](https://github.com/Aksem/libavoid-js/blob/5062a42fbd82fff562afeebcbb7b1ed45eed8e75/LICENSE). This is not legal advice.

## Replacement engines and removal

The reusable suite in `tests/routing/router-contract.ts` accepts any `FlowRouter` factory. It checks directed ports, clearance, revisions, changed obstacles, unreachable ports and invalid input. Core tests cover cancellation, races and common geometry. The owner is `packages/routing-libavoid`; remove the package and recipe dependency when replacing this integration. An ELK adapter or a new router can implement `FlowRouter` without host API changes.
