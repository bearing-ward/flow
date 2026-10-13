import type { FlowNode } from '@flow/core'
import type { FoldkitNodeRenderer } from '@flow/foldkit'
import { Option, Schema as S } from 'effect'

import { mountRecipeHost } from '../recipe-host.ts'

import './computing-flows.css'

const TextDataSchema = S.Struct({ text: S.String })

const ResultDataSchema = S.Struct({ values: S.Array(S.String) })

const textOf = (data: FlowNode['data']): string =>
  Option.match(S.decodeUnknownOption(TextDataSchema)(data), {
    onNone: () => '',
    onSome: ({ text }) => text,
  })

const valuesOf = (data: FlowNode['data']): readonly string[] =>
  Option.match(S.decodeUnknownOption(ResultDataSchema)(data), {
    onNone: () => [],
    onSome: ({ values }) => values,
  })

const source = { id: 'out', kind: 'source', side: 'right' } as const

const target = { id: 'in', kind: 'target', side: 'left' } as const

/** Text node: an input bound to the node's own `data.text`. */
const textNode: FoldkitNodeRenderer = (node, h) =>
  h.div(
    [h.Class('compute-node')],
    [
      h.div([h.Class('compute-node-title')], ['text']),
      h.input([
        h.Class('nodrag compute-input'),
        h.DataAttribute('testid', `text-input-${node.id}`),
        h.AriaLabel(`Text for ${node.id}`),
        h.Value(textOf(node.data)),
      ]),
    ]
  )

/** Uppercase node: shows the value the page computed from its upstream node. */
const uppercaseNode: FoldkitNodeRenderer = (node, h) =>
  h.div(
    [h.Class('compute-node')],
    [
      h.div([h.Class('compute-node-title')], ['uppercase transform']),
      h.output([h.DataAttribute('testid', 'upper-value')], [textOf(node.data)]),
    ]
  )

/** Result node: lists the texts of every connected source. */
const resultNode: FoldkitNodeRenderer = (node, h) =>
  h.div(
    [h.Class('compute-node')],
    [
      h.div([h.Class('compute-node-title')], ['incoming texts']),
      h.output(
        [h.DataAttribute('testid', 'result-value')],
        [valuesOf(node.data).join(', ')]
      ),
    ]
  )

const host = mountRecipeHost({
  page: 'computing-flows-page',
  document: {
    nodes: [
      {
        id: 'text-1',
        label: 'text-1',
        type: 'text',
        data: { text: 'hello' },
        position: { x: 60, y: 60 },
        handles: [source],
      },
      {
        id: 'upper',
        label: 'upper',
        type: 'uppercase',
        data: { text: '' },
        position: { x: 340, y: 60 },
        handles: [target, source],
      },
      {
        id: 'text-2',
        label: 'text-2',
        type: 'text',
        data: { text: 'world' },
        position: { x: 340, y: 280 },
        handles: [source],
      },
      {
        id: 'result',
        label: 'result',
        type: 'result',
        data: { values: [] },
        position: { x: 640, y: 160 },
        handles: [target],
      },
    ],
    edges: [
      {
        id: 'e-text-1-upper',
        source: 'text-1',
        sourceHandle: 'out',
        target: 'upper',
        targetHandle: 'in',
      },
      {
        id: 'e-upper-result',
        source: 'upper',
        sourceHandle: 'out',
        target: 'result',
        targetHandle: 'in',
      },
      {
        id: 'e-text-2-result',
        source: 'text-2',
        sourceHandle: 'out',
        target: 'result',
        targetHandle: 'in',
      },
    ],
  },
  registry: {
    nodeTypes: { text: textNode, uppercase: uppercaseNode, result: resultNode },
  },
})

/**
 * Source node data for a node's incoming connections, through the public
 * snapshot port: `connections` is `useNodeConnections`, `nodeIds` is
 * `useNodesData`.
 */
const incomingData = async (nodeId: string) => {
  const connections = await host.snapshots.request({
    connections: { nodeId, type: 'target' },
  })

  if (connections.status !== 'succeeded') {
    return []
  }

  const sources = connections.response.nodeConnections.map(
    (connection) => connection.source
  )

  if (sources.length === 0) {
    return []
  }

  const data = await host.snapshots.request({ nodeIds: sources })

  if (data.status !== 'succeeded') {
    return []
  }

  const byId = new Map(
    data.response.nodesData.map((entry) => [entry.id, entry.data])
  )

  return sources.map((id) => textOf(byId.get(id)))
}

let syncing = false

let stale = false

/** Write the uppercase and result data when they no longer match their inputs. */
const syncOnce = async (): Promise<void> => {
  const [upstream] = await incomingData('upper')
  const upper = (upstream ?? '').toUpperCase()

  const upperState = host.document().nodes.find(({ id }) => id === 'upper')

  if (upperState !== undefined && textOf(upperState.data) !== upper) {
    await host.edit([
      { kind: 'update-node-data', nodeId: 'upper', data: { text: upper } },
    ])
  }

  const values = await incomingData('result')

  const resultState = host.document().nodes.find(({ id }) => id === 'result')

  if (
    resultState !== undefined &&
    valuesOf(resultState.data).join('\u0000') !== values.join('\u0000')
  ) {
    await host.edit([
      { kind: 'update-node-data', nodeId: 'result', data: { values } },
    ])
  }
}

const renderStatus = (): void => {
  const { nodes, edges } = host.document()

  const resultState = nodes.find(({ id }) => id === 'result')

  const upperState = nodes.find(({ id }) => id === 'upper')

  host.status.dataset.upper = textOf(upperState?.data)
  host.status.dataset.result = valuesOf(resultState?.data).join(', ')
  host.status.dataset.edges = edges.map(({ id }) => id).join(',')
  host.status.value = `result:${host.status.dataset.result}`
}

/**
 * Foldkit node views cannot write node data, so the page computes derived
 * data from accepted state and writes it back through typed edits when stale.
 */
const sync = async (): Promise<void> => {
  if (syncing) {
    stale = true

    return
  }

  syncing = true
  stale = false

  try {
    await syncOnce()
  } finally {
    syncing = false
  }

  if (stale) {
    await sync()

    return
  }

  renderStatus()
}

host.onAccepted(() => {
  void sync()
})

// A text node writes its own data: the page maps input events back to the node.
host.frame.addEventListener('input', (event) => {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const nodeId = input.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

  if (nodeId !== undefined) {
    void host.edit([
      { kind: 'update-node-data', nodeId, data: { text: input.value } },
    ])
  }
})

host
  .button('disconnect-text-2', 'Disconnect text-2')
  .addEventListener('click', () => {
    void host.edit([{ kind: 'delete-elements', edgeIds: ['e-text-2-result'] }])
  })

void sync()
