import { HandleIdSchema } from '@flow/core'
import type { FlowNode } from '@flow/core'
import { createFlowDatabaseSchema, mountFlow } from '@flow/vanilla'
import type { DatabaseSchemaTable, FlowNodeRenderer } from '@flow/vanilla'
import { Schema } from 'effect'

import '../style.css'

const requireElement = <ElementType extends Element>(
  element: ElementType | null,
  label: string
): ElementType => {
  if (element === null) {
    throw new Error(`Missing ${label}`)
  }

  return element
}

const root = requireElement(
  document.querySelector<HTMLElement>('#app'),
  'Database Schema root'
)

root.innerHTML =
  '<div class="flow-database-controls"><button data-edit-schema>Update schema</button><button data-edit-schema-again>Update schema again</button><button data-connect>Connect display name</button><output data-edge-count>0</output></div><div id="canvas"></div>'

const decodeHandleId = Schema.decodeUnknownSync(HandleIdSchema)

const schema = (revision: number): DatabaseSchemaTable => {
  let fields: DatabaseSchemaTable['fields']

  if (revision === 2) {
    fields = [
      {
        id: 'display-out',
        name: 'display_name',
        type: 'text',
        kind: 'source',
        side: 'right',
      },
      {
        id: 'audit-in',
        name: 'audit_at',
        type: 'timestamp',
        kind: 'target',
        side: 'left',
      },
    ]
  } else if (revision === 1) {
    fields = [
      {
        id: 'email-out',
        name: 'email',
        type: 'text',
        kind: 'source',
        side: 'right',
      },
      {
        id: 'created-in',
        name: 'created_at',
        type: 'timestamp',
        kind: 'target',
        side: 'left',
      },
    ]
  } else {
    fields = [
      {
        id: 'name-out',
        name: 'name',
        type: 'text',
        kind: 'source',
        side: 'right',
      },
      {
        id: 'legacy-in',
        name: 'legacy_id',
        type: 'integer',
        kind: 'target',
        side: 'left',
      },
    ]
  }

  return { name: 'users', fields }
}

const schemaRevision = (node: FlowNode): number => {
  const revision = node.data?.revision

  if (revision === 1 || revision === 2) {
    return revision
  }

  return 0
}

const renderer: FlowNodeRenderer = (node, content) => {
  let view = createFlowDatabaseSchema(document, schema(schemaRevision(node)))

  content.append(view)

  return {
    update: (next) => {
      const nextView = createFlowDatabaseSchema(
        document,
        schema(schemaRevision(next))
      )

      view.replaceWith(nextView)
      view = nextView
    },
    destroy: () => view.remove(),
  }
}

const controller = mountFlow(
  requireElement(root.querySelector<HTMLElement>('#canvas'), 'schema canvas'),
  {
    nodes: [
      {
        id: 'users',
        label: 'users',
        type: 'schema',
        position: { x: 100, y: 100 },
        data: { revision: 0 },
        handles: [
          { id: decodeHandleId('name-out'), kind: 'source', side: 'right' },
          { id: decodeHandleId('legacy-in'), kind: 'target', side: 'left' },
        ],
      },
      {
        id: 'consumer',
        label: 'consumer',
        position: { x: 500, y: 100 },
        handles: [
          { id: decodeHandleId('input'), kind: 'target', side: 'left' },
        ],
      },
    ],
    edges: [],
  },
  {
    documentMode: 'uncontrolled',
    nodeRenderers: { schema: renderer },
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

const count = requireElement(
  root.querySelector<HTMLOutputElement>('[data-edge-count]'),
  'edge count output'
)

controller.subscribeState(({ current }) => {
  count.value = String(current.document.edges.length)
})

requireElement(
  root.querySelector<HTMLButtonElement>('[data-edit-schema]'),
  'schema edit button'
).addEventListener('click', async () => {
  await controller.updateNode('users', {
    data: { revision: 1 },
    handles: [
      { id: decodeHandleId('email-out'), kind: 'source', side: 'bottom' },
      { id: decodeHandleId('created-in'), kind: 'target', side: 'top' },
    ],
  })
})

requireElement(
  root.querySelector<HTMLButtonElement>('[data-edit-schema-again]'),
  'second schema edit button'
).addEventListener('click', async () => {
  await controller.updateNode('users', {
    data: { revision: 2 },
    handles: [
      { id: decodeHandleId('display-out'), kind: 'source', side: 'right' },
      { id: decodeHandleId('audit-in'), kind: 'target', side: 'left' },
    ],
  })
})

requireElement(
  root.querySelector<HTMLButtonElement>('[data-connect]'),
  'schema connection button'
).addEventListener('click', async () => {
  await controller.addEdges({
    id: 'email-edge',
    source: 'users',
    sourceHandle: decodeHandleId('display-out'),
    target: 'consumer',
    targetHandle: decodeHandleId('input'),
  })
})

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
