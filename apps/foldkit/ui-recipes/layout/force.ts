import { getFlowLayoutInput } from '@flow/core'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

import type { RecipeHost } from '../recipe-host.ts'

interface ForceNode extends SimulationNodeDatum {
  readonly id: string
  readonly width: number
  readonly height: number
}

/**
 * Force Layout: a d3-force simulation over measured node sizes. Every animation
 * frame ticks once and writes all positions in one public edit; it stops once
 * cool. A dropped node is pinned at its drop position and the simulation reheats.
 */
export const startForceLayout = (host: RecipeHost): void => {
  const { status } = host
  let nodes: ForceNode[] = []
  let ticks = 0
  let running = false
  let started = false

  const simulation = forceSimulation<ForceNode>()
    .alphaDecay(0.05)
    .alphaMin(0.01)
    .stop()

  status.dataset.running = 'false'
  status.dataset.ticks = '0'

  const step = async (): Promise<void> => {
    if (simulation.alpha() < simulation.alphaMin()) {
      running = false
      status.dataset.running = 'false'

      return
    }

    simulation.tick()
    ticks += 1

    await host.edit(
      nodes.map(({ id, x = 0, y = 0, width, height }) => ({
        kind: 'update-node' as const,
        nodeId: id,
        patch: { position: { x: x - width / 2, y: y - height / 2 } },
      }))
    )
    status.dataset.ticks = String(ticks)
    requestAnimationFrame(() => {
      void step()
    })
  }

  const run = (): void => {
    if (running) {
      return
    }

    running = true
    status.dataset.running = 'true'
    requestAnimationFrame(() => {
      void step()
    })
  }

  const start = async (): Promise<void> => {
    if (started) {
      return
    }

    const { document, internals } = await host.measuredState()
    const input = getFlowLayoutInput(document, (id) => internals.get(id))

    if (started || input.unmeasured.length > 0) {
      return
    }

    started = true

    const positions = new Map<string, { x: number; y: number }>(
      document.nodes.map(({ id, position }) => [id, position])
    )

    nodes = input.nodes.map(({ id, width, height }) => {
      const position = positions.get(id) ?? { x: 0, y: 0 }

      return {
        id,
        width,
        height,
        x: position.x + width / 2,
        y: position.y + height / 2,
      }
    })

    const links: SimulationLinkDatum<ForceNode>[] = input.edges.map(
      ({ source, target }) => ({ source, target })
    )

    simulation
      .nodes(nodes)
      .force(
        'link',
        forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(links)
          .id(({ id }) => id)
          .distance(110)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('x', forceX(0).strength(0.08))
      .force('y', forceY(0).strength(0.08))
      .force(
        'collide',
        forceCollide<ForceNode>(
          ({ width, height }) => Math.hypot(width, height) / 2 + 6
        ).iterations(3)
      )
      .alpha(1)
    run()
  }

  host.onMeasured(() => {
    void start()
  })
  void start()

  // Pin a dropped node and reheat.
  host.onChange((change) => {
    if (change.kind !== 'node-position') {
      return
    }

    const dropped = nodes.find(({ id }) => id === change.nodeId)

    if (dropped === undefined) {
      return
    }

    dropped.fx = change.position.x + dropped.width / 2
    dropped.fy = change.position.y + dropped.height / 2
    dropped.x = dropped.fx
    dropped.y = dropped.fy
    status.dataset.pinned = `${dropped.id}@${Math.round(change.position.x)},${Math.round(change.position.y)}`
    simulation.alpha(0.3)
    run()
  })
}
