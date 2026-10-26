import { decodeFlowForceSettings, layoutCenterToTopLeft } from '@flow/core'
import type {
  FlowDocument,
  FlowForceSettings,
  FlowLayoutInput,
  XYPosition,
} from '@flow/core'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'
import { Effect } from 'effect'

interface ForceNode extends SimulationNodeDatum {
  readonly id: string
  readonly width: number
  readonly height: number
}

/** No timer or DOM ownership. The browser host schedules each explicit tick. */
export const createForceSimulation = (
  input: FlowLayoutInput,
  document: FlowDocument,
  center: XYPosition
) => {
  const nodes: ForceNode[] = input.nodes.map((node) => {
    const position = document.nodes.find(({ id }) => id === node.id)
      ?.position ?? { x: 0, y: 0 }

    return {
      ...node,
      x: position.x + node.width / 2,
      y: position.y + node.height / 2,
    }
  })

  const link = forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(
    input.edges.map(({ source, target }) => ({ source, target }))
  ).id(({ id }) => id)

  const charge = forceManyBody<ForceNode>()

  const simulation = forceSimulation(nodes)
    .stop()
    .alphaDecay(0.05)
    .alphaMin(0.01)
    .force('link', link)
    .force('charge', charge)
    .force('x', forceX<ForceNode>(center.x).strength(0.1))
    .force('y', forceY<ForceNode>(center.y).strength(0.1))
    .force(
      'collide',
      forceCollide<ForceNode>(
        ({ width, height }) => Math.hypot(width, height) / 2 + 6
      ).iterations(3)
    )

  return {
    configure: (value: FlowForceSettings) =>
      decodeFlowForceSettings(value).pipe(
        Effect.map((settings) => {
          link.distance(settings.distance)
          charge.strength(settings.strength)
          simulation.alpha(1)

          return settings
        })
      ),
    tick: () => {
      simulation.tick()

      return new Map(
        nodes.map((node) => [
          node.id,
          layoutCenterToTopLeft({ x: node.x ?? 0, y: node.y ?? 0 }, node),
        ])
      )
    },
    settled: () => simulation.alpha() < simulation.alphaMin(),
    pin: (id: string, position: XYPosition) => {
      const node = nodes.find((n) => n.id === id)

      if (node !== undefined) {
        node.fx = position.x + node.width / 2
        node.fy = position.y + node.height / 2
        node.x = node.fx
        node.y = node.fy
      }

      simulation.alpha(0.3)
    },
    restore: (accepted: FlowDocument) => {
      const positions = new Map<string, XYPosition>(
        accepted.nodes.map(({ id, position }) => [id, position])
      )

      for (const node of nodes) {
        const position = positions.get(node.id)

        if (position === undefined) {
          continue
        }

        node.x = position.x + node.width / 2
        node.y = position.y + node.height / 2
        node.vx = 0
        node.vy = 0

        if (node.fx !== undefined && node.fx !== null) {
          node.fx = node.x
        }

        if (node.fy !== undefined && node.fy !== null) {
          node.fy = node.y
        }
      }
    },
    dispose: () => simulation.stop(),
  }
}
