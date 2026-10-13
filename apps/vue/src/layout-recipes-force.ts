import { applyFlowLayoutPositions } from '@flow/core'
import type { FlowLayoutInput, FlowNode } from '@flow/core'
import type { FlowActions } from '@flow/vue'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import { onScopeDispose, ref } from 'vue'
import type { Ref } from 'vue'

import { whenMeasured } from './layout-recipes-engines.ts'

interface ForceNode extends SimulationNodeDatum {
  readonly id: string
  readonly width: number
  readonly height: number
}

type ForceLink = SimulationLinkDatum<ForceNode>

export interface ForceLayoutState {
  readonly running: Ref<boolean>
  readonly ticks: Ref<number>
  readonly onNodeDragStart: () => void
  readonly onNodeDragStop: (node: FlowNode) => void
}

/**
 * Example "Force Layout": a d3-force simulation over measured node sizes.
 * Every animation frame ticks once and writes all positions in one public
 * edit; the loop stops when the simulation cools below `alphaMin`. A dropped
 * node is pinned at its drop position and the simulation is reheated.
 */
export const useForceLayout = (
  flow: FlowActions,
  center: { readonly x: number; readonly y: number }
): ForceLayoutState => {
  const running = ref(false)
  const ticks = ref(0)
  let frame = 0
  let dragging = false
  let writing = false

  const simulation = forceSimulation<ForceNode, ForceLink>()
    .alphaDecay(0.03)
    .stop()

  const nodesById = new Map<string, ForceNode>()

  const write = async (): Promise<void> => {
    const positions = new Map(
      simulation.nodes().map((node) => [
        node.id,
        {
          x: (node.x ?? 0) - node.width / 2,
          y: (node.y ?? 0) - node.height / 2,
        },
      ])
    )

    writing = true

    try {
      await flow.setNodes((nodes) => applyFlowLayoutPositions(nodes, positions))
      ticks.value += 1
    } finally {
      writing = false
    }
  }

  const step = (): void => {
    frame = requestAnimationFrame(step)

    if (dragging || writing) {
      return
    }

    if (simulation.alpha() < simulation.alphaMin()) {
      running.value = false
      cancelAnimationFrame(frame)

      return
    }

    simulation.tick()
    void write()
  }

  const run = (): void => {
    running.value = true
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(step)
  }

  const start = (input: FlowLayoutInput): void => {
    const nodes = input.nodes.map(({ id, width, height }) => {
      const position = flow.getNode(id)?.position ?? { x: 0, y: 0 }

      const node: ForceNode = {
        id,
        width,
        height,
        x: position.x + width / 2,
        y: position.y + height / 2,
      }

      nodesById.set(id, node)

      return node
    })

    simulation
      .nodes(nodes)
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(
          input.edges.map(({ source, target }) => ({ source, target }))
        )
          .id(({ id }) => id)
          .distance(160)
      )
      .force('charge', forceManyBody<ForceNode>().strength(-400))
      .force('x', forceX<ForceNode>(center.x).strength(0.05))
      .force('y', forceY<ForceNode>(center.y).strength(0.05))
      .force(
        'collide',
        forceCollide<ForceNode>(
          ({ width, height }) => Math.hypot(width, height) / 2 + 6
        ).iterations(3)
      )
      .alpha(1)

    run()
  }

  whenMeasured(flow, start)
  onScopeDispose(() => cancelAnimationFrame(frame))

  return {
    running,
    ticks,
    onNodeDragStart: () => {
      dragging = true
    },
    onNodeDragStop: (dropped) => {
      // Vue commits the drop position on release; pin it on the next frame.
      requestAnimationFrame(() => {
        const internal = flow.getInternalNode(dropped.id)
        const node = nodesById.get(dropped.id)

        if (internal !== undefined && node !== undefined) {
          node.fx = internal.absolutePosition.x + node.width / 2
          node.fy = internal.absolutePosition.y + node.height / 2
        }

        dragging = false
        simulation.alpha(0.3)
        run()
      })
    },
  }
}
