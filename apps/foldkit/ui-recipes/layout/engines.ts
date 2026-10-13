import { Graph, layout } from '@dagrejs/dagre'
import { layoutCenterToTopLeft } from '@flow/core'
import type {
  FlowLayoutDirection,
  FlowLayoutInput,
  XYPosition,
} from '@flow/core'
import type { ElkNode, ElkPort } from 'elkjs/lib/elk-api'
import ELK from 'elkjs/lib/elk.bundled.js'

export type Positions = ReadonlyMap<string, XYPosition>

interface DagreNode {
  readonly width: number
  readonly height: number
  readonly x?: number
  readonly y?: number
}

/** Dagre lays out measured node boxes and reports centers. */
export const dagreLayout = (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection
): Positions => {
  const graph = new Graph<object, DagreNode, object>()
  graph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 60 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const { id, width, height } of input.nodes) {
    graph.setNode(id, { width, height })
  }

  for (const { source, target } of input.edges) {
    graph.setEdge(source, target)
  }

  layout(graph)

  return new Map(
    input.nodes.map((node) => {
      const { x = 0, y = 0 } = graph.node(node.id)

      return [node.id, layoutCenterToTopLeft({ x, y }, node)]
    })
  )
}

const elk = new ELK()

const elkDirection = (direction: FlowLayoutDirection) =>
  direction === 'TB' ? 'DOWN' : 'RIGHT'

const portSide = (side: 'top' | 'right' | 'bottom' | 'left') => {
  switch (side) {
    case 'top': {
      return 'NORTH'
    }

    case 'right': {
      return 'EAST'
    }

    case 'bottom': {
      return 'SOUTH'
    }

    default: {
      return 'WEST'
    }
  }
}

/** Ports for every measured handle box, keyed `nodeId:handleId`. */
const elkPorts = (node: FlowLayoutInput['nodes'][number]): ElkPort[] =>
  node.handles.map((handle) => ({
    id: `${node.id}:${handle.id}`,
    x: handle.x,
    y: handle.y,
    width: handle.width,
    height: handle.height,
    layoutOptions: { 'elk.port.side': portSide(handle.side) },
  }))

/**
 * ELK `layered` reports top-left positions. With `fixedPorts`, every measured
 * handle becomes a fixed port and edges attach to their handle ports.
 */
export const elkLayout = async (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection,
  fixedPorts = false
): Promise<Positions> => {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection(direction),
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    },
    children: input.nodes.map((node) => {
      const child = { id: node.id, width: node.width, height: node.height }

      return fixedPorts
        ? {
            ...child,
            ports: elkPorts(node),
            layoutOptions: { 'org.eclipse.elk.portConstraints': 'FIXED_POS' },
          }
        : child
    }),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      sources: [
        fixedPorts && edge.sourceHandle !== undefined
          ? `${edge.source}:${edge.sourceHandle}`
          : edge.source,
      ],
      targets: [
        fixedPorts && edge.targetHandle !== undefined
          ? `${edge.target}:${edge.targetHandle}`
          : edge.target,
      ],
    })),
  }

  const result = await elk.layout(graph)

  return new Map(
    (result.children ?? []).map(({ id, x = 0, y = 0 }) => [id, { x, y }])
  )
}
