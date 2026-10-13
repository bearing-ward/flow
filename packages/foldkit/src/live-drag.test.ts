import { decodeFlowDocument, NodeIdSchema } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  AppMessage,
  HostAction,
  initialModel,
  update,
  wrapGraphMessage,
} from './application.ts'
import * as Graph from './graph.ts'
import { updateNodeData } from './node-data.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 40 },
        selected: true,
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 200, y: 0 },
        size: { width: 100, height: 40 },
        selected: true,
      },
      {
        id: 'c',
        label: 'C',
        position: { x: 0, y: 200 },
        size: { width: 100, height: 40 },
        data: { text: 'old', keep: 1 },
      },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b' }],
  })
)

const start = () =>
  initialModel(document, { x: 0, y: 0, zoom: 2 }, [], undefined, 'full', {
    ...Graph.defaultInteractionOptions,
    nodeDragThreshold: 1,
  })

type AppModel = ReturnType<typeof start>

const step = (model: AppModel, message: Graph.GraphMessageData) =>
  update(model, wrapGraphMessage({ message }))

const down = (nodeId: string, x = 10, y = 10) =>
  Graph.Message.PointerDown({
    pointerId: 1,
    clientX: x,
    clientY: y,
    nodeId,
    handleId: null,
    edgeId: null,
    endpoint: null,
    direction: null,
  })

const move = (x: number, y: number) =>
  Graph.Message.NodeDragMoved({
    pointerId: 1,
    clientX: x,
    clientY: y,
    flowX: x / 2,
    flowY: y / 2,
  })

const up = (x: number, y: number) =>
  Graph.Message.PointerReleased({
    pointerId: 1,
    clientX: x,
    clientY: y,
    targetNodeId: null,
    targetHandleId: null,
  })

const click = (nodeId: string, modifier: 'none' | 'meta' | 'ctrl' = 'none') =>
  Graph.Message.ObserveMouse({
    name: 'onNodeClick',
    nodeId,
    edgeId: null,
    select: true,
    pointer: {
      clientX: 0,
      clientY: 0,
      button: 0,
      altKey: false,
      ctrlKey: modifier === 'ctrl',
      metaKey: modifier === 'meta',
      shiftKey: false,
    },
  })

const interactions = (result: ReturnType<typeof update>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'interaction' ? item.events : []
  ) ?? []

const positions = (model: AppModel) =>
  Object.fromEntries(
    Graph.selectLiveDocument(model.graph).nodes.map(({ id, position }) => [
      id,
      position,
    ])
  )

const selected = (model: AppModel) =>
  model.graph.document.nodes
    .filter((node) => node.selected === true)
    .map(({ id }) => id)

/** Press `a` (selected with `b`) and drag 20 by 40 client pixels at zoom 2. */
const dragSelection = () => step(step(start(), down('a')).model, move(30, 50))

const semanticChanges = (result: ReturnType<typeof update>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'change' && item.change !== undefined ? [item.change] : []
  )

describe('Foldkit live node drag', () => {
  it('previews every selected node live without accepting it', () => {
    const result = dragSelection()

    expect(result.model.graph.pointerSession).toMatchObject({
      kind: 'node-drag',
      nodeIds: ['a', 'b'],
    })
    // Zoom 2: 20 by 40 client pixels move the nodes 10 by 20 flow units.
    expect(positions(result.model)).toStrictEqual({
      a: { x: 10, y: 20 },
      b: { x: 210, y: 20 },
      c: { x: 0, y: 200 },
    })
    // The accepted document keeps its positions until release.
    expect(result.model.graph.document.nodes[0]?.position).toStrictEqual({
      x: 0,
      y: 0,
    })
  })

  it('reports node and selection drag events with live node positions', () => {
    const progress = interactions(dragSelection())

    expect(progress.map(({ name }) => name)).toStrictEqual([
      'onNodeDragStart',
      'onSelectionDragStart',
      'onNodeDrag',
      'onSelectionDragMove',
    ])
    expect(progress[0]).toMatchObject({
      nodeId: 'a',
      nodeIds: ['a', 'b'],
      position: { x: 0, y: 0 },
    })
    expect(progress[2]).toMatchObject({
      nodeId: 'a',
      nodeIds: ['a', 'b'],
      x: 15,
      y: 25,
      position: { x: 10, y: 20 },
      positionAbsolute: { x: 10, y: 20 },
      nodePositions: [
        {
          nodeId: 'a',
          position: { x: 10, y: 20 },
          positionAbsolute: { x: 10, y: 20 },
        },
        {
          nodeId: 'b',
          position: { x: 210, y: 20 },
          positionAbsolute: { x: 210, y: 20 },
        },
      ],
    })
  })

  it('commits every dragged node together on release', () => {
    const result = step(dragSelection().model, up(50, 50))

    expect(semanticChanges(result)).toStrictEqual([
      {
        kind: 'node-positions',
        positions: [
          { nodeId: 'a', position: { x: 20, y: 20 } },
          { nodeId: 'b', position: { x: 220, y: 20 } },
        ],
      },
    ])
    expect(interactions(result).map(({ name }) => name)).toStrictEqual([
      'onNodeDragStop',
      'onSelectionDragStop',
    ])
    expect(positions(result.model)).toMatchObject({
      a: { x: 20, y: 20 },
      b: { x: 220, y: 20 },
    })
  })

  it('drags an unselected node alone', () => {
    let result = step(start(), down('c'))
    result = step(result.model, move(14, 10))

    expect(result.model.graph.pointerSession).toMatchObject({
      kind: 'node-drag',
      nodeIds: ['c'],
    })
    expect(positions(result.model).c).toStrictEqual({ x: 2, y: 200 })
    expect(
      interactions(result).some(({ name }) => name.startsWith('onSelection'))
    ).toBeFalsy()
  })
})

describe('Foldkit click selection', () => {
  it('selects only the clicked node, and Meta or Control toggles it', () => {
    let result = step(start(), click('c'))

    expect(selected(result.model)).toStrictEqual(['c'])

    result = step(result.model, click('a', 'meta'))
    expect(selected(result.model)).toStrictEqual(['a', 'c'])

    result = step(result.model, click('c', 'ctrl'))
    expect(selected(result.model)).toStrictEqual(['a'])

    // Controls inside the node do not select through the node click.
    result = step(
      result.model,
      Graph.Message.ObserveMouse({
        name: 'onNodeClick',
        nodeId: 'b',
        edgeId: null,
        select: false,
      })
    )
    expect(selected(result.model)).toStrictEqual(['a'])
  })

  it('consumes the click that ends a node drag', () => {
    let result = step(start(), down('c'))
    result = step(result.model, move(30, 10))
    result = step(result.model, up(30, 10))
    result = step(result.model, click('c'))

    expect(selected(result.model)).toStrictEqual(['a', 'b'])

    // A plain press and release without a drag selects on click.
    result = step(result.model, down('c'))
    result = step(result.model, up(10, 10))
    result = step(result.model, click('c'))
    expect(selected(result.model)).toStrictEqual(['c'])
  })
})

const measure = (model: AppModel, width: number) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.MeasureNode({
        requestId: `m-${width}`,
        measurement: {
          nodeId: NodeIdSchema.make('c'),
          width,
          height: 40,
          generation: 1,
        },
      }),
    })
  )

const dimensions = (result: ReturnType<typeof update>) =>
  result.outMessage?.flatMap((item) =>
    item.kind === 'change' && item.elementChanges !== undefined
      ? item.elementChanges.nodes
      : []
  ) ?? []

const startWith = (
  options: Partial<Graph.GraphInteractionOptions>,
  documentMode: 'controlled' | 'uncontrolled' = 'uncontrolled'
): AppModel => {
  const model = initialModel(
    document,
    { x: 0, y: 0, zoom: 2 },
    [],
    undefined,
    'full',
    { ...Graph.defaultInteractionOptions, ...options }
  )

  return { ...model, graph: { ...model.graph, documentMode } }
}

const selectionChanges = (result: ReturnType<typeof update>) =>
  semanticChanges(result)?.filter(({ kind }) => kind === 'selection-set')

describe('Foldkit click selection edge cases', () => {
  it('selects on click at nodeDragThreshold 0 when the pointer did not move', () => {
    let result = step(startWith({ nodeDragThreshold: 0 }), down('c'))

    expect(result.model.graph.pointerSession?.kind).toBe('node-drag')

    result = step(result.model, up(10, 10))
    result = step(result.model, click('c'))
    expect(selected(result.model)).toStrictEqual(['c'])

    result = step(result.model, down('a'))
    result = step(result.model, up(10, 10))
    result = step(result.model, click('a', 'meta'))
    expect(selected(result.model)).toStrictEqual(['a', 'c'])
  })

  it('swallows the click at nodeDragThreshold 0 once the pointer moved', () => {
    let result = step(startWith({ nodeDragThreshold: 0 }), down('c'))
    result = step(result.model, move(12, 10))
    result = step(result.model, up(12, 10))
    result = step(result.model, click('c'))

    expect(selected(result.model)).toStrictEqual(['a', 'b'])
  })

  it('proposes Meta-click and toggle-button selections in controlled mode', () => {
    const controlled = startWith({}, 'controlled')
    const toggled = step(controlled, click('c', 'meta'))

    expect(selectionChanges(toggled)).toStrictEqual([
      { kind: 'selection-set', nodeIds: ['a', 'b', 'c'], edgeIds: [] },
    ])
    expect(selected(toggled.model)).toStrictEqual(['a', 'b'])

    const button = step(
      controlled,
      Graph.Message.ToggleNodeSelection({ nodeId: NodeIdSchema.make('a') })
    )

    expect(selectionChanges(button)).toStrictEqual([
      { kind: 'selection-set', nodeIds: ['b'], edgeIds: [] },
    ])
    expect(selected(button.model)).toStrictEqual(['a', 'b'])
  })
})

describe('Foldkit measurement and data changes', () => {
  it('reports dimensions changes for first and changed measurements only', () => {
    const first = measure(start(), 120)

    expect(dimensions(first)).toStrictEqual([
      { id: 'c', type: 'dimensions', dimensions: { width: 120, height: 40 } },
    ])
    expect(dimensions(measure(first.model, 120))).toStrictEqual([])
    expect(dimensions(measure(first.model, 160))).toStrictEqual([
      { id: 'c', type: 'dimensions', dimensions: { width: 160, height: 40 } },
    ])
  })

  it('lets a node view merge or replace its data', () => {
    const merged = step(start(), updateNodeData('c', { text: 'new' }))

    expect(merged.model.graph.document.nodes[2]?.data).toStrictEqual({
      text: 'new',
      keep: 1,
    })

    const replaced = step(
      merged.model,
      updateNodeData('c', { text: 'only' }, { replace: true })
    )

    expect(replaced.model.graph.document.nodes[2]?.data).toStrictEqual({
      text: 'only',
    })
  })
})

const resizeSession = (model: AppModel) =>
  step(
    model,
    Graph.Message.ResizeByKeyboard({
      nodeId: NodeIdSchema.make('a'),
      direction: 'right',
      delta: { x: 5, y: 0 },
    })
  ).model.graph.keyboardResizeSession

describe('Foldkit nodesResizable', () => {
  it('ignores resize input by default and accepts it when enabled', () => {
    expect(resizeSession(startWith({}))).toBeNull()
    expect(resizeSession(startWith({ nodesResizable: true }))).toMatchObject({
      nodeId: 'a',
      direction: 'right',
    })
  })
})
