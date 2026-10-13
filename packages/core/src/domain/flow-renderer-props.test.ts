import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { ConnectionPreviewStateSchema } from './flow-connection-preview.schema.ts'
import { getBezierPath, getSmoothStepPath } from './flow-edge-path.ts'
import { bezierEdgePath } from './flow-edge.schema.ts'
import { createFlowGraph } from './flow-graph.ts'
import {
  connectionLinePath,
  flowConnectionLineProps,
  flowEdgeRendererProps,
  flowNodeBounds,
  flowNodeRendererProps,
} from './flow-renderer-props.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    {
      id: 'a',
      label: 'A',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 40 },
      handles: [{ id: 'a-out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 300, y: 100 },
      size: { width: 100, height: 40 },
      zIndex: 3,
      selected: true,
      connectable: false,
      data: { tone: 'warm' },
      handles: [{ id: 'b-in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'e',
      source: 'a',
      target: 'b',
      path: 'bezier',
      label: 'link',
      selected: true,
      data: { weight: 2 },
    },
  ],
})

const graph = createFlowGraph(document, new Map())

const graphNode = (id: string) => {
  const found = graph.orderedNodes.find((item) => item.id === id)

  if (found === undefined) {
    throw new Error(`missing ${id}`)
  }

  return found
}

describe('renderer props', () => {
  it('gives custom edges the endpoint geometry the core path helpers need', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('missing edge')
    }

    const source = { x: 100, y: 20 }
    const target = { x: 300, y: 120 }

    const props = flowEdgeRendererProps({
      edge,
      source,
      target,
      sourcePosition: 'right',
      targetPosition: 'left',
      sourceHandleId: null,
      targetHandleId: null,
      sourceNode: flowNodeBounds(graphNode('a')),
      targetNode: flowNodeBounds(graphNode('b')),
      markerStart: undefined,
      markerEnd: 'url(#end)',
      defaultInteractionWidth: 20,
    })

    expect(props).toMatchObject({
      id: 'e',
      type: 'default',
      pathType: 'bezier',
      sourceX: 100,
      sourceY: 20,
      targetX: 300,
      targetY: 120,
      selected: true,
      data: { weight: 2 },
      label: 'link',
      markerEnd: 'url(#end)',
      interactionWidth: 20,
      targetNode: { id: 'b', x: 300, y: 100, width: 100, height: 40 },
    })

    const [path, labelX, labelY] = getBezierPath(props)

    expect(path).toBe(bezierEdgePath(source, target, 'right', 'left'))
    expect([props.labelX, props.labelY]).toStrictEqual([labelX, labelY])
  })

  it('reports node state, absolute position and size', () => {
    const { node } = graphNode('b')

    expect(
      flowNodeRendererProps(node, {
        positionAbsolute: { x: 310, y: 90 },
        dragging: true,
        size: { width: 120, height: 50 },
      })
    ).toMatchObject({
      id: 'b',
      type: 'default',
      data: { tone: 'warm' },
      selected: true,
      dragging: true,
      isConnectable: false,
      zIndex: 3,
      positionAbsoluteX: 310,
      positionAbsoluteY: 90,
      width: 120,
      height: 50,
    })
    expect(
      flowNodeRendererProps(graphNode('a').node, {
        positionAbsolute: { x: 0, y: 0 },
        dragging: false,
        nodesConnectable: false,
      })
    ).toMatchObject({ isConnectable: false, width: 100, zIndex: 0 })
  })

  it('builds connection line props and the typed built-in path', () => {
    const props = flowConnectionLineProps({
      graph,
      connectionLineType: 'bezier',
      origin: { nodeId: 'a', handleId: 'a-out' },
      preview: {
        kind: 'connect',
        from: { x: 100, y: 20 },
        to: { x: 200, y: 80 },
        candidate: null,
        valid: null,
      },
    })

    expect(props).toMatchObject({
      fromNode: { id: 'a' },
      fromHandle: { id: 'a-out' },
      fromPosition: 'right',
      toPosition: 'left',
      toNode: null,
      toHandle: null,
      connectionStatus: null,
      path: getBezierPath({
        sourceX: 100,
        sourceY: 20,
        sourcePosition: 'right',
        targetX: 200,
        targetY: 80,
        targetPosition: 'left',
      })[0],
    })
  })

  it('resolves the hovered end and the fixed end of a reconnection', () => {
    const props = flowConnectionLineProps({
      graph,
      connectionLineType: 'straight',
      preview: S.decodeUnknownSync(ConnectionPreviewStateSchema)({
        kind: 'reconnect',
        edgeId: 'e',
        endpoint: 'target',
        from: { x: 100, y: 20 },
        to: { x: 290, y: 120 },
        candidate: {
          source: 'a',
          sourceHandle: 'a-out',
          target: 'b',
          targetHandle: 'b-in',
        },
        valid: false,
      }),
    })

    expect(props).toMatchObject({
      fromNode: { id: 'a' },
      toNode: { id: 'b' },
      toHandle: { id: 'b-in' },
      toPosition: 'left',
      connectionStatus: 'invalid',
      path: 'M 100,20L 290,120',
    })
    expect(
      connectionLinePath('step', {
        fromX: 0,
        fromY: 0,
        toX: 10,
        toY: 10,
        fromPosition: 'right',
        toPosition: 'left',
      })
    ).toBe(
      getSmoothStepPath({
        sourceX: 0,
        sourceY: 0,
        sourcePosition: 'right',
        targetX: 10,
        targetY: 10,
        targetPosition: 'left',
        borderRadius: 0,
      })[0]
    )
  })
})
