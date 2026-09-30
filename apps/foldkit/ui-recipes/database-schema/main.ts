import { decodeFlowDocument } from '@flow/core'
import {
  createFoldkitDatabaseSchema,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { EditResponse, ports } from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './database-schema.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing schema recipe root')
}

root.innerHTML =
  '<main class="flow-foldkit-schema-page"><button data-edit-schema>Update schema</button><button data-connect>Connect email</button><output data-schema-result></output><div data-schema-canvas><div class="flow-schema-runtime"></div></div></main>'

const canvas = root.querySelector<HTMLElement>('.flow-schema-runtime')

if (canvas === null) {
  throw new Error('Missing schema runtime mount')
}

canvas.id = 'flow-foldkit-schema-runtime'

const result = root.querySelector<HTMLOutputElement>('[data-schema-result]')

if (result === null) {
  throw new Error('Missing schema result output')
}

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'users',
        label: 'users',
        type: 'schema',
        position: { x: 80, y: 80 },
        data: { revision: 0 },
        handles: [
          { id: 'name-out', kind: 'source', side: 'right' },
          { id: 'legacy-in', kind: 'target', side: 'left' },
        ],
      },
      {
        id: 'consumer',
        label: 'consumer',
        position: { x: 500, y: 100 },
        handles: [{ id: 'input', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const schema = (revision: number) => ({
  name: 'users',
  fields:
    revision === 0
      ? [
          {
            id: 'name-out',
            name: 'name',
            type: 'text',
            kind: 'source' as const,
            side: 'right' as const,
          },
          {
            id: 'legacy-in',
            name: 'legacy_id',
            type: 'integer',
            kind: 'target' as const,
            side: 'left' as const,
          },
        ]
      : [
          {
            id: 'email-out',
            name: 'email',
            type: 'text',
            kind: 'source' as const,
            side: 'bottom' as const,
          },
          {
            id: 'created-in',
            name: 'created_at',
            type: 'timestamp',
            kind: 'target' as const,
            side: 'top' as const,
          },
        ],
})

const registry = {
  nodeTypes: {
    schema: (node, h) =>
      createFoldkitDatabaseSchema(
        schema(node.data?.['revision'] === 1 ? 1 : 0),
        h
      ),
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
    registry,
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

const edit = (): Promise<EditResponse> => {
  requestNumber += 1
  const requestId = `schema-${requestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()
  pending.set(requestId, resolve)

  const sent = runtime.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'update-node',
          nodeId: 'users',
          patch: {
            data: { revision: 1 },
            handles: [
              { id: 'email-out', kind: 'source', side: 'bottom' },
              { id: 'created-in', kind: 'target', side: 'top' },
            ],
          },
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    pending.delete(requestId)
    throw new Error('Foldkit rejected schema edit')
  }

  return promise
}

const editButton = root.querySelector<HTMLButtonElement>('[data-edit-schema]')

const connectButton = root.querySelector<HTMLButtonElement>('[data-connect]')

if (editButton === null || connectButton === null) {
  throw new Error('Missing schema recipe controls')
}

editButton.addEventListener('click', async () => {
  const response = await edit()
  result.value =
    'result' in response
      ? `accepted:${response.result.document.nodes.find((node) => node.id === 'users')?.handles?.length ?? 0}`
      : response.error._tag
})

connectButton.addEventListener('click', async () => {
  requestNumber += 1
  const requestId = `schema-${requestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()
  pending.set(requestId, resolve)

  const sent = runtime.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'add-edges',
          edges: [
            {
              id: 'email-edge',
              source: 'users',
              sourceHandle: 'email-out',
              target: 'consumer',
              targetHandle: 'input',
            },
          ],
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    pending.delete(requestId)
    throw new Error('Foldkit rejected connection')
  }

  const response = await promise
  result.value =
    'result' in response
      ? `accepted-edges:${response.result.document.edges.length}`
      : response.error._tag
})

globalThis.addEventListener('pagehide', () => runtime.dispose(), { once: true })
