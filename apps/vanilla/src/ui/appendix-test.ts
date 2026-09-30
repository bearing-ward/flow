import { createFlowAppendix, mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'

import '../style.css'

const canvas = document.querySelector<HTMLElement>('#canvas')

const remountButton = document.querySelector<HTMLButtonElement>('#remount')

if (canvas === null || remountButton === null) {
  throw new Error('Missing Appendix fixture root')
}

const renderer: FlowNodeRenderer = (node, content) => {
  const shell = document.createElement('section')
  shell.className = 'flow-appendix-recipe-node'
  const title = document.createElement('h2')
  title.textContent = node.label

  const details = document.createElement('p')
  details.textContent =
    'The workflow validates customer records before importing them.'
  details.className = 'flow-appendix-recipe-detail'

  const appendix = createFlowAppendix(document, {
    label: 'Import details',
    content: details,
  })

  shell.append(title, appendix.element)

  content.append(shell)

  return {
    update: (next) => {
      title.textContent = next.label
    },
    destroy: () => {
      appendix.destroy()
      shell.remove()
    },
  }
}

const mount = () =>
  mountFlow(
    canvas,
    {
      nodes: [
        {
          id: 'appendix-node',
          label: 'Import customer records',
          type: 'appendix-recipe',
          position: { x: 200, y: 160 },
        },
      ],
      edges: [],
    },
    {
      documentMode: 'uncontrolled',
      nodeRenderers: { 'appendix-recipe': renderer },
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    }
  )

let controller = mount()

remountButton.addEventListener('click', () => {
  controller.destroy()
  controller = mount()
})

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
