import { decodeFlowDocument } from '@flow/core'
import {
  createFoldkitBaseHandle,
  createFoldkitControlButton,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML =
  '<main class="flow-button-handle-recipe"><div class="flow-button-handle-frame"><div class="flow-button-handle-runtime"></div></div></main>'

const mount = root.querySelector<HTMLElement>('.flow-button-handle-runtime')

if (mount === null) {
  throw new Error('Missing Runtime mount')
}

mount.id = 'flow-foldkit-button-handle-runtime'

const graph = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'source-node',
        label: 'Source',
        position: { x: 100, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'button-node',
        label: 'Action node',
        type: 'button-action',
        position: { x: 420, y: 120 },
        size: { width: 200, height: 110 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const registry = {
  nodeTypes: {
    'button-action': (node, h) =>
      h.section(
        [
          h.Class('flow-button-handle-node'),
          h.Role('group'),
          h.AriaLabel(node.label),
        ],
        [
          h.span(
            [h.Attribute('data-button-action-host', 'install')],
            ['Action']
          ),
          ...(node.handles ?? []).map((handle) =>
            createFoldkitBaseHandle(
              { handle, label: handle.kind === 'source' ? 'Output' : 'Input' },
              h
            )
          ),
        ]
      ),
  },
} satisfies NonNullable<Parameters<typeof createProgram>[6]>

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    mount,
    graph,
    { x: 0, y: 0, zoom: 1 },
    ['button-node'],
    'uncontrolled',
    'uncontrolled',
    registry,
    undefined,
    undefined,
    defaultInteractionOptions
  )
)

let actions = 0

root.dataset.actionCount = '0'

const onAction = () => {
  actions += 1
  root.dataset.actionCount = String(actions)
}

const installButton = (scope: ParentNode): boolean => {
  const placeholders = scope.querySelectorAll<HTMLElement>(
    '[data-button-action-host]'
  )

  for (const placeholder of placeholders) {
    const button = createFoldkitControlButton(document, {
      aria: { 'aria-label': 'Run action' },
      children: [document.createTextNode('Run action')],
      onClick: onAction,
    })

    button.dataset.buttonAction = ''
    button.dataset.flowNoDrag = ''
    button.dataset.flowNoPan = ''
    placeholder.replaceWith(button)
  }

  return placeholders.length > 0
}

let recipeFrame = 0

const installWhenRendered = () => {
  if (!installButton(document)) {
    recipeFrame = requestAnimationFrame(installWhenRendered)
  }
}

installWhenRendered()

globalThis.addEventListener(
  'pagehide',
  () => {
    cancelAnimationFrame(recipeFrame)
    runtime.dispose()
    root.replaceChildren()
  },
  { once: true }
)
