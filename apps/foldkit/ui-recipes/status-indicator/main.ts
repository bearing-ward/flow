import { decodeFlowDocument } from '@flow/core'
import {
  createFoldkitStatusIndicator,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { EditResponse, FlowNodeStatus, ports } from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './status-indicator.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML = `<main class="flow-status-recipe">
  <h1>Node status</h1>
  <p>Status is app-owned data submitted through the Foldkit Runtime edit port.</p>
  <div class="flow-status-recipe-controls" role="group" aria-label="Set node status">
    <button type="button" data-status="ready">Mark ready</button>
    <button type="button" data-status="error">Mark error</button>
    <button type="button" data-status="waiting">Reset to waiting</button>
  </div>
  <div class="flow-status-recipe-canvas" data-status-canvas>
    <div class="flow-status-recipe-runtime"></div>
  </div>
  <output class="flow-status-recipe-result" aria-live="polite"></output>
</main>`

const canvas = root.querySelector<HTMLElement>('.flow-status-recipe-runtime')

const resultOutput = root.querySelector<HTMLOutputElement>(
  '.flow-status-recipe-result'
)

if (canvas === null || resultOutput === null) {
  throw new Error('Missing status recipe elements')
}

canvas.id = 'flow-foldkit-status-runtime'

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'status-task',
        label: 'Build workflow',
        type: 'status-task',
        position: { x: 80, y: 80 },
        data: { status: 'waiting' },
      },
    ],
    edges: [],
  })
)

const rendererRegistry = {
  nodeTypes: {
    'status-task': (node, h) => {
      const status = node.data?.['status']

      const acceptedStatus =
        status === 'ready' || status === 'error' || status === 'waiting'
          ? status
          : 'waiting'

      return h.section(
        [
          h.Class('flow-status-recipe-node'),
          h.Role('group'),
          h.AriaLabel(node.label),
        ],
        [
          h.h2([], [node.label]),
          createFoldkitStatusIndicator(acceptedStatus, h),
        ]
      )
    },
  },
} satisfies NonNullable<Parameters<typeof createProgram>[6]>

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    canvas,
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

let requestNumber = 0

const pending = new Map<string, (response: EditResponse) => void>()

runtime.ports.editResults.subscribe((response) => {
  pending.get(response.requestId)?.(response)
  pending.delete(response.requestId)
})

globalThis.addEventListener('pagehide', () => runtime.dispose(), {
  once: true,
})

const updateStatus = (status: FlowNodeStatus): Promise<EditResponse> => {
  requestNumber += 1
  const requestId = `status-${requestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()
  pending.set(requestId, resolve)

  const sent = runtime.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'update-node-data',
          nodeId: 'status-task',
          data: { status },
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    pending.delete(requestId)
    throw new Error('Foldkit rejected the status update')
  }

  return promise
}

for (const button of root.querySelectorAll<HTMLButtonElement>(
  '[data-status]'
)) {
  button.addEventListener('click', async () => {
    const { status } = button.dataset

    if (status !== 'waiting' && status !== 'ready' && status !== 'error') {
      return
    }

    const response = await updateStatus(status)
    resultOutput.value =
      'result' in response ? `Status changed to ${status}` : response.error._tag
  })
}
