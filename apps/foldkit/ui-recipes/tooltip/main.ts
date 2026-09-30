import { decodeFlowDocument } from '@flow/core'
import {
  createFoldkitTooltip,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './tooltip.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML = `<main class="flow-tooltip-recipe">
  <h1>Node tooltip</h1>
  <p>Hover or focus the app-owned help control. Its description is part of the node data.</p>
  <div class="flow-tooltip-canvas-frame">
    <div class="flow-tooltip-runtime-wrapper"><div class="flow-tooltip-runtime"></div></div>
  </div>
</main>`

const runtimeMount = root.querySelector<HTMLElement>('.flow-tooltip-runtime')

if (runtimeMount === null) {
  throw new Error('Missing tooltip recipe runtime mount')
}

runtimeMount.id = 'flow-foldkit-tooltip-runtime'

const tooltipScope = runtimeMount.parentElement ?? runtimeMount

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'tooltip-task',
        label: 'Review changes',
        type: 'tooltip-task',
        position: { x: 120, y: 100 },
        data: {
          tooltip:
            'Review the changed files before publishing. Text such as <script> remains plain text.',
        },
      },
    ],
    edges: [],
  })
)

const rendererRegistry = {
  nodeTypes: {
    'tooltip-task': (node, h) =>
      h.section(
        [
          h.Class('flow-tooltip-recipe-node'),
          h.Role('group'),
          h.AriaLabel(node.label),
        ],
        [
          h.h2([], [node.label]),
          h.span(
            [
              h.Class('flow-tooltip-trigger'),
              h.Role('img'),
              h.AriaLabel('Node guidance'),
            ],
            ['?']
          ),
        ]
      ),
  },
} satisfies NonNullable<Parameters<typeof createProgram>[6]>

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    runtimeMount,
    documentModel,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    rendererRegistry,
    undefined,
    undefined,
    defaultInteractionOptions
  )
)

let unmounted = false

let tooltip: ReturnType<typeof createFoldkitTooltip> | undefined

let triggerObserver: MutationObserver | undefined

const attachTooltip = (): boolean => {
  const trigger =
    runtimeMount.querySelector<HTMLElement>('.flow-tooltip-trigger') ??
    tooltipScope.querySelector<HTMLElement>('.flow-tooltip-trigger')

  if (trigger === null || unmounted) {
    return false
  }

  if (tooltip?.element.contains(trigger)) {
    return true
  }

  tooltip?.destroy()

  tooltip = createFoldkitTooltip(
    trigger,
    String(documentModel.nodes[0]?.data?.['tooltip'] ?? '')
  )

  return true
}

triggerObserver = new MutationObserver(attachTooltip)

triggerObserver.observe(tooltipScope, { childList: true, subtree: true })

attachTooltip()

const unmount = (): void => {
  if (unmounted) {
    return
  }

  unmounted = true
  triggerObserver?.disconnect()
  triggerObserver = undefined
  tooltip?.destroy()
  runtime.dispose()
  root.replaceChildren()
  globalThis.removeEventListener('flow-recipe:unmount', unmount)
  globalThis.removeEventListener('pagehide', unmount)
}

globalThis.addEventListener('flow-recipe:unmount', unmount)

globalThis.addEventListener('pagehide', unmount, { once: true })
