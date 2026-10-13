import { Graph, layout } from '@dagrejs/dagre'
import type { EdgeLabel, GraphLabel, NodeLabel } from '@dagrejs/dagre'
import { layoutCenterToTopLeft } from '@flow/core'
import type {
  FlowLayoutDirection,
  FlowLayoutInput,
  XYPosition,
} from '@flow/core'
import type { ElkNode } from 'elkjs/lib/elk-api'
import ELK from 'elkjs/lib/elk.bundled.js'

/*
 * Example-only layout engine adapters. Each takes measured engine input from
 * `getFlowLayoutInput` and returns top-left flow positions by node id.
 */

export type LayoutPositions = ReadonlyMap<string, XYPosition>

/** Dagre with measured node sizes; Dagre returns centers. */
export const dagreLayout = (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection
): LayoutPositions => {
  const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>()

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

      return [node.id, layoutCenterToTopLeft({ x, y }, node)] as const
    })
  )
}

const elk = new ELK()

const elkPositions = (result: ElkNode): LayoutPositions =>
  new Map((result.children ?? []).map(({ id, x = 0, y = 0 }) => [id, { x, y }]))

/** ELK layered with measured node sizes; ELK returns top-left corners. */
export const elkLayout = async (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection
): Promise<LayoutPositions> =>
  elkPositions(
    await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
        'elk.spacing.nodeNode': '40',
        'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      },
      children: input.nodes.map(({ id, width, height }) => ({
        id,
        width,
        height,
      })),
      edges: input.edges.map(({ id, source, target }) => ({
        id,
        sources: [source],
        targets: [target],
      })),
    })
  )

export const portId = (nodeId: string, handleId: string): string =>
  `${nodeId}:${handleId}`

/**
 * ELK layered with one fixed port per measured handle, so the engine orders
 * nodes by where their handles really sit and edges do not cross.
 */
export const elkPortLayout = async (
  input: FlowLayoutInput
): Promise<LayoutPositions> =>
  elkPositions(
    await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '30',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      },
      children: input.nodes.map(({ id, width, height, handles }) => ({
        id,
        width,
        height,
        layoutOptions: { 'org.eclipse.elk.portConstraints': 'FIXED_POS' },
        ports: handles.map((handle) => ({
          id: portId(id, handle.id),
          x: handle.x,
          y: handle.y,
          width: handle.width,
          height: handle.height,
        })),
      })),
      edges: input.edges.map(
        ({ id, source, target, sourceHandle, targetHandle }) => ({
          id,
          sources: [
            sourceHandle === undefined ? source : portId(source, sourceHandle),
          ],
          targets: [
            targetHandle === undefined ? target : portId(target, targetHandle),
          ],
        })
      ),
    })
  )
