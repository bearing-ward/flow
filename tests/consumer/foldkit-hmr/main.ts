import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { createFoldkitBaseNode, createProgram } from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import { revision } from './revision'

declare global {
  interface Window {
    __flowFoldkitHmr?: {
      readonly setStatus: (status: string) => Promise<void>
      readonly runtimeId: string
    }
  }
}

const graphDocument: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'hmr-node',
        label: 'HMR node',
        type: 'hmr-node',
        position: { x: 40, y: 50 },
        data: { status: 'initial' },
      },
    ],
    edges: [],
  })
)

const rendererRegistry: Parameters<typeof createProgram>[6] = {
  nodeTypes: {
    'hmr-node': (node, h) =>
      createFoldkitBaseNode(
        node.label,
        h,
        h.output(
          [h.DataAttribute('status', node.id)],
          [String(node.data?.['status'] ?? '')]
        )
      ),
  },
}

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing HMR consumer root')
}

root.innerHTML = `<output data-revision>${revision}</output><div id="canvas" style="width:640px;height:420px"><div id="hmr-runtime-mount"></div></div>`

const canvas = root.querySelector<HTMLElement>('#canvas')

if (canvas === null) {
  throw new Error('Missing HMR canvas root')
}

const runtimeMount = canvas.querySelector<HTMLElement>('#hmr-runtime-mount')

if (runtimeMount === null) {
  throw new Error('Missing HMR Runtime mount')
}

const bootCount =
  Number(sessionStorage.getItem('flow-hmr-boot-count') ?? '0') + 1

sessionStorage.setItem('flow-hmr-boot-count', String(bootCount))

const runtimeId = crypto.randomUUID()

canvas.dataset['bootCount'] = String(bootCount)

canvas.dataset['runtimeId'] = runtimeId

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    runtimeMount,
    graphDocument,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    rendererRegistry
  )
)

const setStatus = (status: string): Promise<void> => {
  const requestId = `hmr-edit-${crypto.randomUUID()}`

  const { promise, resolve, reject } = Promise.withResolvers<undefined>()

  const unsubscribe = runtime.ports.editResults.subscribe((response) => {
    if (response.requestId !== requestId) {
      return
    }

    unsubscribe()

    if ('error' in response) {
      reject(new Error(`Packed Foldkit edit failed: ${response.error._tag}`))

      return
    }

    resolve()
  })

  const sent = runtime.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'update-node-data',
          nodeId: 'hmr-node',
          data: { status },
          replace: true,
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    unsubscribe()
    reject(new Error('Packed Foldkit rejected HMR edit request'))
  }

  return promise
}

window.__flowFoldkitHmr = { setStatus, runtimeId }
