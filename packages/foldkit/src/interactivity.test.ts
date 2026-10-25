import { decodeFlowDocument, HandleIdSchema, NodeIdSchema } from '@flow/core'
import { Effect } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { AppMessage, HostAction, initialModel, update } from './application.ts'
import type { Model } from './application.ts'
import { registerConnectionRule } from './connection-rules.ts'
import * as Graph from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 300, y: 0 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const nodeA = NodeIdSchema.make('a')

const nodeB = NodeIdSchema.make('b')

const out = HandleIdSchema.make('out')

const into = HandleIdSchema.make('in')

const graphStep = (model: Model, message: Graph.GraphMessageData) =>
  update(model, AppMessage.GraphMessage({ message }))

const locked = (model: Model) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.SetInteractivity({
        nodesDraggable: false,
        nodesConnectable: false,
        elementsSelectable: false,
      }),
    })
  ).model

const interactionNames = (result: ReturnType<typeof update>) =>
  (result.outMessage ?? []).flatMap((item) =>
    item.kind === 'interaction' ? item.events.map(({ name }) => name) : []
  )

const keyboardConnect = (model: Model) => {
  const started = graphStep(
    model,
    Graph.Message.ActivateHandle({ nodeId: nodeA, handleId: out })
  )

  return graphStep(
    started.model,
    Graph.Message.ActivateHandle({ nodeId: nodeB, handleId: into })
  )
}

describe('Foldkit interaction switches', () => {
  afterEach(() => registerConnectionRule('rule-instance'))

  it('the host action sets the switches the gates read', () => {
    const model = locked(initialModel(document, { x: 0, y: 0, zoom: 1 }, ['b']))

    expect(Graph.selectInteractivity(model.graph)).toStrictEqual({
      nodesDraggable: false,
      nodesConnectable: false,
      elementsSelectable: false,
    })

    const press = graphStep(
      model,
      Graph.Message.PointerDown({
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        nodeId: 'a',
        handleId: null,
        direction: null,
        edgeId: null,
        endpoint: null,
      })
    )

    expect(press.model.graph.pointerSession).toBeNull()
    expect(
      graphStep(model, Graph.Message.ToggleNodeSelection({ nodeId: nodeA }))
        .model.graph.document.nodes[0]?.selected
    ).toBeUndefined()
    expect(keyboardConnect(model).model.graph.document.edges).toHaveLength(0)
  })

  it('a keyboard connection publishes an add delta and honours isValidConnection', () => {
    const open = initialModel(document, { x: 0, y: 0, zoom: 1 }, ['b'])
    const connected = keyboardConnect(open)

    const deltas = (connected.outMessage ?? []).flatMap((item) =>
      item.kind === 'change' && item.elementChanges !== undefined
        ? [item.elementChanges]
        : []
    )

    expect(deltas).toMatchObject([
      {
        nodes: [],
        edges: [{ type: 'add', item: { source: 'a', target: 'b' } }],
      },
    ])

    registerConnectionRule('rule-instance', () => false)

    const ruled: Model = {
      ...open,
      graph: { ...open.graph, instanceId: 'rule-instance' },
    }

    expect(keyboardConnect(ruled).model.graph.document.edges).toHaveLength(0)
  })

  it('selection changes publish onSelectionChange with the selected ids', () => {
    const model = initialModel(document, { x: 0, y: 0, zoom: 1 })

    const result = graphStep(
      model,
      Graph.Message.ToggleNodeSelection({ nodeId: nodeA })
    )

    expect(interactionNames(result)).toContain('onSelectionChange')
    expect(
      (result.outMessage ?? []).flatMap((item) =>
        item.kind === 'interaction'
          ? item.events.filter(({ name }) => name === 'onSelectionChange')
          : []
      )
    ).toMatchObject([{ nodeIds: ['a'], edgeIds: [] }])
  })
})
