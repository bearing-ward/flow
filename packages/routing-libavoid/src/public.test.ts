import { fileURLToPath } from 'node:url'

import { routerContract } from '../../../tests/routing/router-contract.ts'
import { createLibavoidRouter } from './public.ts'

routerContract('libavoid-js', () =>
  createLibavoidRouter({
    wasmUrl: fileURLToPath(
      new URL('../node_modules/libavoid-js/dist/libavoid.wasm', import.meta.url)
    ),
  })
)
