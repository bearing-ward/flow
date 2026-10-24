import { decodeFlowDocument, NodeIdSchema } from '@flow/core'
import type { FlowDocumentSchema, FlowResizeParams } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { initialModel, update, wrapGraphMessage } from './application.ts'
import { dragItemExtent, placeDraggedNodes } from './drag-constraints.ts'
import * as Graph from './graph.ts'
import { createFoldkitNodeResizer } from './node-resizer.ts'

type DocumentInput = typeof FlowDocumentSchema.Encoded

const flowDocument = (input: DocumentInput) =>
  Effect.runSync(decodeFlowDocument(input))

const start = (
  input: DocumentInput,
  options: Partial<Graph.GraphInteractionOptions> = {}
) =>
  initialModel(
    flowDocument(input),
    { x: 0, y: 0, zoom: 1 },
    [],
    undefined,
    'full',
    {
      ...Graph.defaultInteractionOptions,
      nodeDragThreshold: 0,
      ...options,
    }
  )

type AppModel = ReturnType<typeof start>

const step = (model: AppModel, message: Graph.GraphMessageData) =>
  update(model, wrapGraphMessage({ message }))

const drag = (model: AppModel, nodeId: string, dx: number, dy: number) => {
  const pressed = step(
    model,
    Graph.Message.PointerDown({
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      nodeId,
      handleId: null,
      edgeId: null,
      endpoint: null,
      direction: null,
    })
  ).model

  const moved = step(
    pressed,
    Graph.Message.NodeDragMoved({
      pointerId: 1,
      clientX: dx,
      clientY: dy,
      flowX: dx,
      flowY: dy,
    })
  ).model

  return {
    moved,
    released: step(
      moved,
      Graph.Message.PointerReleased({
        pointerId: 1,
        clientX: dx,
        clientY: dy,
        targetNodeId: null,
        targetHandleId: null,
      })
    ),
  }
}

const position = (model: AppModel, id: string) =>
  model.graph.document.nodes.find((node) => node.id === id)?.position

describe(placeDraggedNodes, () => {
  const origin = {
    nodeId: NodeIdSchema.make('a'),
    x: 10,
    y: 10,
    absoluteX: 10,
    absoluteY: 10,
    width: 50,
    height: 20,
    originX: 0,
    originY: 0,
    parentX: 0,
    parentY: 0,
    extent: null,
  }

  it('snaps the absolute top-left to the grid', () => {
    const [placed] = placeDraggedNodes(
      [origin],
      { x: 7, y: 3 },
      { x: 15, y: 15 }
    )

    expect(placed?.position).toStrictEqual({ x: 15, y: 15 })
  })

  it('clamps to the extent with the node size, as clampPosition', () => {
    const [placed] = placeDraggedNodes(
      [{ ...origin, extent: { minX: 0, minY: 0, maxX: 100, maxY: 50 } }],
      { x: 500, y: -500 }
    )

    expect(placed?.positionAbsolute).toStrictEqual({ x: 50, y: 0 })
  })

  it('shifts nodeExtent per item for multi-node drags', () => {
    expect(
      dragItemExtent({
        parentBox: undefined,
        extentParent: false,
        expandParent: false,
        nodeExtent: { minX: 0, minY: 0, maxX: 300, maxY: 300 },
        item: { x: 100, y: 100, width: 50, height: 50 },
        groupBox: { x: 0, y: 0, x2: 200, y2: 200 },
      })
    ).toStrictEqual({ minX: 100, minY: 100, maxX: 250, maxY: 250 })
  })

  it('leaves expandParent children unclamped, as React', () => {
    expect(
      dragItemExtent({
        parentBox: { x: 0, y: 0, width: 100, height: 100 },
        extentParent: true,
        expandParent: true,
        nodeExtent: undefined,
        item: { x: 0, y: 0, width: 10, height: 10 },
        groupBox: undefined,
      })
    ).toBeUndefined()
  })
})

describe('Foldkit canvas options', () => {
  const nested: DocumentInput = {
    nodes: [
      {
        id: 'parent',
        label: 'Parent',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
      },
      {
        id: 'child',
        label: 'Child',
        parentId: 'parent',
        extent: 'parent',
        position: { x: 10, y: 10 },
        size: { width: 50, height: 20 },
      },
    ],
    edges: [],
  }

  it('snaps node drags with snapToGrid and snapGrid', () => {
    const model = start(
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 50, height: 20 },
          },
        ],
        edges: [],
      },
      { snapToGrid: true, snapGrid: [20, 20] }
    )

    const { released } = drag(model, 'a', 27, 12)

    expect(position(released.model, 'a')).toStrictEqual({ x: 20, y: 20 })
  })

  it("clamps extent: 'parent' children inside the parent", () => {
    const { moved, released } = drag(start(nested), 'child', 500, 500)

    expect(
      Graph.selectLiveDocument(moved.graph).nodes.find(
        ({ id }) => id === 'child'
      )?.position
    ).toStrictEqual({ x: 150, y: 80 })
    expect(position(released.model, 'child')).toStrictEqual({ x: 150, y: 80 })
  })

  // Pinned system/src/utils/store.ts:157,459 and general.ts:20-29.
  it('projects provisional and measured extent positions through the public internal-node read', () => {
    const model = start(
      {
        nodes: [{ id: 'a', label: 'A', position: { x: 200, y: 200 } }],
        edges: [],
      },
      {
        nodeExtent: [
          [0, 0],
          [50, 50],
        ],
      }
    )

    expect(
      Graph.selectInternalNode(model.graph, 'a')?.absolutePosition
    ).toStrictEqual({ x: 50, y: 50 })

    const measured = step(
      model,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: NodeIdSchema.make('a'),
          generation: 0,
          width: 150,
          height: 44,
        },
      })
    ).model

    expect(
      Graph.selectInternalNode(measured.graph, 'a')?.absolutePosition
    ).toStrictEqual({ x: -100, y: 6 })
    expect(position(measured, 'a')).toStrictEqual({ x: 200, y: 200 })
  })

  it('clamps root nodes to nodeExtent', () => {
    const model = start(
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 50, height: 20 },
          },
        ],
        edges: [],
      },
      {
        nodeExtent: [
          [0, 0],
          [100, 100],
        ],
      }
    )

    const { released } = drag(model, 'a', 500, -30)

    expect(position(released.model, 'a')).toStrictEqual({ x: 50, y: 0 })
  })

  it('grows an expandParent parent during the drag and on release', () => {
    const model = start({
      ...nested,
      nodes: nested.nodes.map(({ extent: _extent, ...node }) =>
        node.id === 'child' ? { ...node, expandParent: true } : node
      ),
    })

    const { moved, released } = drag(model, 'child', 300, 0)

    const live = Graph.selectLiveDocument(moved.graph)

    expect(live.nodes.find(({ id }) => id === 'parent')?.size).toStrictEqual({
      width: 360,
      height: 100,
    })
    expect(released.model.graph.document.nodes[0]?.size).toStrictEqual({
      width: 360,
      height: 100,
    })
    expect(position(released.model, 'child')).toStrictEqual({ x: 310, y: 10 })
  })

  it('decodes colorMode, zIndexMode, extents and aria labels into the model', () => {
    const model = start(nested, {
      colorMode: 'dark',
      zIndexMode: 'auto',
      translateExtent: { minX: 0, minY: 0, maxX: 500, maxY: 400 },
      ariaLabelConfig: { 'handle.ariaLabel': 'Port' },
      defaultMarkerColor: '#ff0000',
    })

    expect(model.graph.colorMode).toBe('dark')
    expect(model.graph.zIndexMode).toBe('auto')
    expect(model.graph.translateExtent).toStrictEqual({
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 400,
    })
    expect(model.graph.ariaLabelConfig).toStrictEqual({
      'handle.ariaLabel': 'Port',
    })
    expect(model.graph.defaultMarkerColor).toBe('#ff0000')
  })

  it('constrains viewports to translateExtent', () => {
    expect(
      Graph.constrainViewportToTranslateExtent(
        { translateExtent: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 } },
        { x: 300, y: -5000, zoom: 1 },
        { width: 500, height: 500 }
      )
    ).toStrictEqual({ x: 0, y: -500, zoom: 1 })
  })

  it('reports measured sizes on node reads', () => {
    const model = start(nested)

    const measured = step(
      model,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: NodeIdSchema.make('parent'),
          generation: 1,
          width: 210,
          height: 110,
        },
      })
    ).model

    expect(Graph.selectNode(measured.graph, 'parent')?.measured).toStrictEqual({
      width: 210,
      height: 110,
    })
  })
})

const resize = (
  model: AppModel,
  resizerId: string,
  moves: readonly (readonly [number, number])[],
  constraints = {}
) => {
  let current = step(
    model,
    Graph.Message.GestureDown({
      pointerId: 3,
      clientX: 100,
      clientY: 50,
      nodeId: 'a',
      direction: 'bottom-right',
      allowPan: false,
      screenX: 100,
      screenY: 50,
      resizer: { resizerId, constraints },
    })
  )

  const reductions = [current]

  for (const [x, y] of moves) {
    current = step(
      current.model,
      Graph.Message.GestureMoved({
        pointerId: 3,
        flowX: x,
        flowY: y,
        screenX: x,
        screenY: y,
      })
    )
    reductions.push(current)
  }

  const released = step(
    current.model,
    Graph.Message.GestureReleased({
      pointerId: 3,
      flowX: 0,
      flowY: 0,
      clientX: 0,
      clientY: 0,
    })
  )

  return { reductions, released }
}

const events = (reduction: ReturnType<typeof step>) =>
  (reduction.outMessage ?? []).flatMap((item) =>
    item.kind === 'interaction' ? item.events : []
  )

describe('Foldkit NodeResizer gesture', () => {
  const single = {
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
      },
    ],
    edges: [],
  }

  it('resizes with max size and publishes onResizeStart, onResize and onResizeEnd', () => {
    const resizer = createFoldkitNodeResizer({ maxWidth: 150 })

    const { reductions, released } = resize(
      start(single),
      resizer.id,
      [[200, 80]],
      { maxWidth: 150 }
    )

    expect(released.model.graph.document.nodes[0]?.size).toStrictEqual({
      width: 150,
      height: 80,
    })
    expect(events(reductions[0] ?? released).map(({ name }) => name)).toContain(
      'onResizeStart'
    )
    expect(
      events(reductions[1] ?? released).find(({ name }) => name === 'onResize')
        ?.resize
    ).toStrictEqual({
      x: 0,
      y: 0,
      width: 150,
      height: 80,
      direction: [1, 1],
    })
    expect(events(released).map(({ name }) => name)).toContain('onResizeEnd')
    resizer.dispose()
  })

  it('keeps the size when shouldResize vetoes every step', () => {
    const calls: FlowResizeParams[] = []

    const resizer = createFoldkitNodeResizer({
      shouldResize: (_id, params) => {
        calls.push(params)

        return false
      },
    })

    const { released } = resize(start(single), resizer.id, [[180, 90]])

    expect(calls).toHaveLength(1)
    expect(released.model.graph.document.nodes[0]?.size).toStrictEqual({
      width: 100,
      height: 50,
    })
    expect(events(released).map(({ name }) => name)).not.toContain(
      'onResizeEnd'
    )
    resizer.dispose()
  })

  it('publishes resize events and no node-drag events, as React', () => {
    const resizer = createFoldkitNodeResizer()

    const { reductions, released } = resize(start(single), resizer.id, [
      [130, 60],
      [150, 70],
    ])

    const names = [...reductions, released].flatMap((reduction) =>
      events(reduction).map(({ name }) => name)
    )

    expect(names).toStrictEqual(
      expect.arrayContaining(['onResizeStart', 'onResize', 'onResizeEnd'])
    )
    expect(names.filter((name) => name.startsWith('onNodeDrag'))).toStrictEqual(
      []
    )
    resizer.dispose()
  })

  it('publishes no node-drag events for a keyboard resize', () => {
    const model = start(
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
            selected: true,
          },
        ],
        edges: [],
      },
      { nodesResizable: true }
    )

    const pressed = step(
      model,
      Graph.Message.ResizeByKeyboard({
        nodeId: NodeIdSchema.make('a'),
        direction: 'right',
        delta: { x: 5, y: 0 },
      })
    )

    const finished = step(
      pressed.model,
      Graph.Message.FinishKeyboardResize({ key: 'ArrowRight' })
    )

    const names = [pressed, finished].flatMap((reduction) =>
      events(reduction).map(({ name }) => name)
    )

    expect(names.filter((name) => name.startsWith('onNodeDrag'))).toStrictEqual(
      []
    )
    expect(finished.model.graph.document.nodes[0]?.size?.width).toBe(105)
  })

  it('keeps the aspect ratio and snaps the pointer to the grid', () => {
    const resizer = createFoldkitNodeResizer({ keepAspectRatio: true })

    const { released } = resize(
      start(single, { snapToGrid: true, snapGrid: [20, 20] }),
      resizer.id,
      [[147, 50]],
      { keepAspectRatio: true }
    )

    expect(released.model.graph.document.nodes[0]?.size).toStrictEqual({
      width: 140,
      height: 70,
    })
    resizer.dispose()
  })
})

const proposalsOf = (reduction: ReturnType<typeof step>) =>
  (reduction.outMessage ?? []).flatMap((item) =>
    item.kind === 'change' && item.change !== undefined ? [item.change] : []
  )

/** What an owner that applies only the latest proposal ends up with. */
const ownedNode = (reduction: ReturnType<typeof step>, id: string) => {
  const latest = proposalsOf(reduction).at(-1)

  return latest?.kind === 'edit-proposal'
    ? latest.document.nodes.find((candidate) => candidate.id === id)
    : undefined
}

describe('Foldkit expandParent resize (React NodeResizeControl.tsx:88-120)', () => {
  const family: DocumentInput = {
    nodes: [
      {
        id: 'parent',
        label: 'Parent',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
      },
      {
        id: 'child',
        label: 'Child',
        parentId: 'parent',
        expandParent: true,
        position: { x: 20, y: 20 },
        size: { width: 60, height: 40 },
      },
    ],
    edges: [],
  }

  /** A controlled Runtime whose owner applies only the latest proposal. */
  const controlled = () => {
    const model = start(family)

    return {
      ...model,
      graph: { ...model.graph, documentMode: 'controlled' as const },
    }
  }

  const resizeChild = (
    direction: 'top-left' | 'left',
    moves: readonly (readonly [number, number])[]
  ) => {
    const resizer = createFoldkitNodeResizer()

    let current = step(
      controlled(),
      Graph.Message.GestureDown({
        pointerId: 4,
        clientX: 200,
        clientY: 200,
        nodeId: 'child',
        direction,
        allowPan: false,
        screenX: 200,
        screenY: 200,
        resizer: { resizerId: resizer.id, constraints: {} },
      })
    )

    for (const [dx, dy] of moves) {
      current = step(
        current.model,
        Graph.Message.GestureMoved({
          pointerId: 4,
          flowX: 0,
          flowY: 0,
          screenX: 200 + dx,
          screenY: 200 + dy,
        })
      )
    }

    const released = step(
      current.model,
      Graph.Message.GestureReleased({
        pointerId: 4,
        flowX: 0,
        flowY: 0,
        clientX: 0,
        clientY: 0,
      })
    )

    resizer.dispose()

    return { live: current.model, released }
  }

  it('grows the parent and clamps the child for a top-left resize, in one proposal', () => {
    const { live, released } = resizeChild('top-left', [
      [-25, -15],
      [-50, -30],
    ])

    // The preview already shows the grown parent.
    expect(
      Graph.selectLiveDocument(live.graph).nodes.find(
        ({ id }) => id === 'parent'
      )
    ).toMatchObject({
      position: { x: -30, y: -10 },
      size: { width: 230, height: 110 },
    })

    // Controlled: the Runtime keeps its document until the owner applies.
    expect(released.model.graph.document.nodes[0]?.size).toStrictEqual({
      width: 200,
      height: 100,
    })
    expect(proposalsOf(released)).toHaveLength(1)
    expect(ownedNode(released, 'parent')).toMatchObject({
      position: { x: -30, y: -10 },
      size: { width: 230, height: 110 },
    })
    expect(ownedNode(released, 'child')).toMatchObject({
      position: { x: 0, y: 0 },
      size: { width: 110, height: 70 },
    })
  })

  it('grows the parent leftwards for a left-edge resize, in one proposal', () => {
    const { released } = resizeChild('left', [[-30, 0]])

    expect(proposalsOf(released)).toHaveLength(1)
    expect(ownedNode(released, 'parent')).toMatchObject({
      position: { x: -10, y: 0 },
      size: { width: 210, height: 100 },
    })
    expect(ownedNode(released, 'child')).toMatchObject({
      position: { x: 0, y: 20 },
      size: { width: 90, height: 40 },
    })
  })

  it('keeps the proposed size pending in controlled mode', () => {
    const { released } = resizeChild('left', [[-30, 0]])

    expect(released.model.graph.pendingResizeAcceptance).toMatchObject({
      change: {
        nodeId: 'child',
        position: { x: 0, y: 20 },
        size: { width: 90, height: 40 },
      },
    })
  })

  it('keeps edits accepted mid-gesture and patches only position and size', () => {
    const resizer = createFoldkitNodeResizer()

    const pressed = step(
      start(family),
      Graph.Message.GestureDown({
        pointerId: 5,
        clientX: 200,
        clientY: 200,
        nodeId: 'child',
        direction: 'left',
        allowPan: false,
        screenX: 200,
        screenY: 200,
        resizer: { resizerId: resizer.id, constraints: {} },
      })
    ).model

    const moved = step(
      pressed,
      Graph.Message.GestureMoved({
        pointerId: 5,
        flowX: 0,
        flowY: 0,
        screenX: 170,
        screenY: 200,
      })
    ).model

    const edited = step(
      moved,
      Graph.Message.EditRequest({
        requestId: 'mid-gesture',
        transaction: {
          operations: [
            {
              kind: 'update-node',
              nodeId: NodeIdSchema.make('parent'),
              patch: { label: 'Renamed parent' },
            },
          ],
        },
      })
    ).model

    const released = step(
      edited,
      Graph.Message.GestureReleased({
        pointerId: 5,
        flowX: 0,
        flowY: 0,
        clientX: 0,
        clientY: 0,
      })
    )

    resizer.dispose()

    expect(
      released.model.graph.document.nodes.find(({ id }) => id === 'parent')
    ).toMatchObject({
      label: 'Renamed parent',
      position: { x: -10, y: 0 },
      size: { width: 210, height: 100 },
    })
  })

  it('publishes one proposal for an expandParent drag that grows the parent', () => {
    const { released } = drag(controlled(), 'child', 300, 0)

    expect(proposalsOf(released)).toHaveLength(1)
    expect(ownedNode(released, 'parent')).toMatchObject({
      size: { width: 380, height: 100 },
    })
    expect(ownedNode(released, 'child')).toMatchObject({
      position: { x: 320, y: 20 },
    })
  })
})
