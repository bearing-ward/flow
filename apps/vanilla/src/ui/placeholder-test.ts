import { createFlowPlaceholder, mountFlow } from '@flow/vanilla'

import '../style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Placeholder root')
}

root.innerHTML =
  '<main class="flow-placeholder-page"><div data-empty-state></div><div id="canvas"></div><output aria-live="polite"></output></main>'

const emptyState = root.querySelector<HTMLElement>('[data-empty-state]')

const canvas = root.querySelector<HTMLElement>('#canvas')

if (emptyState === null || canvas === null) {
  throw new Error('Missing Placeholder route elements')
}

const controller = mountFlow(
  canvas,
  { nodes: [], edges: [] },
  {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

const status = root.querySelector<HTMLOutputElement>('output')

if (status === null) {
  throw new Error('Missing Placeholder status output')
}

let activating = false

const action = createFlowPlaceholder(document, {
  onActivate: async () => {
    if (activating) {
      return
    }

    activating = true
    action.disabled = true

    try {
      const accepted = await controller.addNodes({
        id: 'placeholder-created',
        label: 'Created from empty state',
        position: { x: 120, y: 120 },
      })

      emptyState.replaceChildren()
      status.value = `accepted:${accepted.document.nodes.length}`
    } catch {
      activating = false
      action.disabled = false
      status.value = 'rejected'
    }
  },
})

emptyState.append(action)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
