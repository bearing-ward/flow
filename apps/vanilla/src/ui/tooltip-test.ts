import { createFlowTooltip, mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'

import '../style.css'

const canvas = document.querySelector<HTMLElement>('#canvas')

const remountButton = document.querySelector<HTMLButtonElement>('#remount')

if (canvas === null || remountButton === null) {
  throw new Error('Missing Tooltip fixture root')
}

const renderer: FlowNodeRenderer = (node, content) => {
  const shell = document.createElement('section')
  shell.className = 'flow-tooltip-recipe-node'
  const title = document.createElement('h2')
  title.textContent = node.label

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'flow-tooltip-trigger'
  trigger.textContent = 'Import settings'

  const triggerAnchor = document.createElement('span')
  triggerAnchor.className = 'flow-tooltip-anchor'
  triggerAnchor.append(trigger)

  const tooltip = createFlowTooltip(document, {
    trigger,
    text: 'Choose which customer fields to import.',
  })

  const secondaryTrigger = document.createElement('button')
  secondaryTrigger.type = 'button'
  secondaryTrigger.className = 'flow-tooltip-trigger'
  secondaryTrigger.textContent = 'Export settings'

  const secondaryTriggerAnchor = document.createElement('span')
  secondaryTriggerAnchor.className = 'flow-tooltip-anchor'
  secondaryTriggerAnchor.append(secondaryTrigger)

  const secondaryTooltip = createFlowTooltip(document, {
    trigger: secondaryTrigger,
    text: 'Choose a destination for exported records.',
  })

  shell.append(title, triggerAnchor, secondaryTriggerAnchor)
  content.append(shell)

  return {
    update: (next) => {
      title.textContent = next.label
    },
    destroy: () => {
      tooltip.destroy()
      secondaryTooltip.destroy()
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
          id: 'tooltip-node',
          label: 'Import customer records',
          type: 'tooltip-recipe',
          position: { x: 220, y: 180 },
        },
      ],
      edges: [],
    },
    {
      documentMode: 'uncontrolled',
      nodeRenderers: { 'tooltip-recipe': renderer },
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
