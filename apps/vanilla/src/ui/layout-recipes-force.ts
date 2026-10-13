import { applyFlowLayoutPositions, layoutCenterToTopLeft } from '@flow/core'
import type { XYPosition } from '@flow/core'
import type { JavaScriptFlowController } from '@flow/vanilla'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

import { measuredNode } from './recipe-page.ts'

/*
 * Force Layout: a d3-force simulation over measured node sizes. A
 * requestAnimationFrame loop ticks it and writes every position through one
 * public edit per frame until it cools. Dropping a dragged node pins it there
 * and reheats the simulation.
 */

interface ForceNode extends SimulationNodeDatum {
  readonly id: string
  readonly width: number
  readonly height: number
}

type ForceLink = SimulationLinkDatum<ForceNode>

const center = { x: 450, y: 270 }

export interface ForceDrop {
  readonly nodeId: string
  readonly position: XYPosition
}

/** Drag hooks for the page's mount options. */
export interface ForceLayoutControl {
  /** Stop ticking while the user drags. */
  readonly pause: () => void
  /** Pin dropped nodes at their drop positions and reheat. */
  readonly drop: (drops: readonly ForceDrop[]) => void
}

interface SimulationHandle {
  pause: (() => void) | undefined
  drop: ((drops: readonly ForceDrop[]) => void) | undefined
}

/** Wait for every node to be measured, then run the simulation. */
export const startForceLayout = (
  controller: JavaScriptFlowController,
  status: HTMLElement
): ForceLayoutControl => {
  const handle: SimulationHandle = { pause: undefined, drop: undefined }
  let ticks = 0
  let running = false
  let writing = false
  let frame = 0

  const report = (): void => {
    status.dataset.running = String(running)
    status.dataset.ticks = String(ticks)
  }

  report()

  const start = (): void => {
    const nodes: ForceNode[] = controller.getNodes().flatMap((node) => {
      const internal = measuredNode(controller, node.id)

      return internal === undefined
        ? []
        : [
            {
              id: node.id,
              width: internal.width,
              height: internal.height,
              x: internal.absolutePosition.x + internal.width / 2,
              y: internal.absolutePosition.y + internal.height / 2,
            },
          ]
    })

    const links: ForceLink[] = controller
      .getEdges()
      .map(({ source, target }) => ({ source, target }))

    const simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(links)
          .id(({ id }) => id)
          .distance(140)
      )
      .force('charge', forceManyBody<ForceNode>().strength(-500))
      .force('x', forceX<ForceNode>(center.x).strength(0.05))
      .force('y', forceY<ForceNode>(center.y).strength(0.05))
      .force(
        'collide',
        forceCollide<ForceNode>(
          ({ width, height }) => Math.hypot(width, height) / 2 + 6
        ).iterations(2)
      )
      .alphaDecay(0.04)
      .stop()

    const write = async (): Promise<void> => {
      writing = true

      const positions = new Map<string, XYPosition>(
        nodes.map((node) => [
          node.id,
          layoutCenterToTopLeft({ x: node.x ?? 0, y: node.y ?? 0 }, node),
        ])
      )

      await controller.setNodes((current) =>
        applyFlowLayoutPositions(current, positions)
      )
      writing = false
    }

    const loop = (): void => {
      if (simulation.alpha() < simulation.alphaMin()) {
        running = false
        report()

        return
      }

      if (!writing) {
        simulation.tick()
        ticks += 1
        report()
        void write()
      }

      frame = globalThis.requestAnimationFrame(loop)
    }

    const run = (): void => {
      globalThis.cancelAnimationFrame(frame)
      running = true
      report()
      frame = globalThis.requestAnimationFrame(loop)
    }

    // The simulation pauses during a drag and pins the dropped node.
    handle.pause = () => {
      globalThis.cancelAnimationFrame(frame)
    }

    handle.drop = (drops) => {
      for (const { nodeId, position } of drops) {
        const node = nodes.find(({ id }) => id === nodeId)

        if (node !== undefined) {
          node.fx = position.x + node.width / 2
          node.fy = position.y + node.height / 2
          node.x = node.fx
          node.y = node.fy
        }
      }

      simulation.alpha(0.3)
      run()
    }

    run()
  }

  const waitForMeasurement = (): void => {
    if (controller.nodesInitialized()) {
      start()

      return
    }

    frame = globalThis.requestAnimationFrame(waitForMeasurement)
  }

  waitForMeasurement()

  return {
    pause: () => handle.pause?.(),
    drop: (drops) => handle.drop?.(drops),
  }
}
