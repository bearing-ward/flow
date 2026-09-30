import { decodeFlowDocument } from '@flow/core'
import {
  createFoldkitAppendix,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './appendix.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML = `<main class="flow-appendix-recipe">
  <header><h1>Appendix</h1><p>Expand the app-owned workflow notes while keeping the canvas available.</p></header>
  <section class="flow-appendix-panel" aria-label="Workflow appendix">
    <div data-appendix></div>
  </section>
  <div class="flow-appendix-canvas-frame"><div class="flow-appendix-runtime-wrapper"><div class="flow-appendix-runtime"></div></div></div>
</main>`

const appendixHost = root.querySelector<HTMLElement>('[data-appendix]')

const runtimeMount = root.querySelector<HTMLElement>('.flow-appendix-runtime')

if (appendixHost === null || runtimeMount === null) {
  throw new Error('Missing Appendix recipe elements')
}

runtimeMount.id = 'flow-foldkit-appendix-runtime'

const appendix = createFoldkitAppendix(appendixHost, {
  id: 'flow-appendix-content',
  title: 'Implementation notes',
  content:
    'The workflow uses a retry step after validation. The retry policy is owned by this example and can be edited without changing the graph runtime.',
})

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'appendix-task',
        label: 'Validate workflow',
        position: { x: 100, y: 80 },
      },
    ],
    edges: [],
  })
)

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    runtimeMount,
    documentModel,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    undefined,
    undefined,
    undefined,
    defaultInteractionOptions
  )
)

let unmounted = false

const unmount = (): void => {
  if (unmounted) {
    return
  }

  unmounted = true
  appendix.destroy()
  runtime.dispose()
  root.replaceChildren()
  globalThis.removeEventListener('flow-recipe:unmount', unmount)
  globalThis.removeEventListener('pagehide', unmount)
}

globalThis.addEventListener('flow-recipe:unmount', unmount)

globalThis.addEventListener('pagehide', unmount, { once: true })
