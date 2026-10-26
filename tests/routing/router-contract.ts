import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FlowRouter,
  createFlowRoutingRequest,
  validateFlowRoutingResult,
  routeFlowEdges,
  decodeFlowDocument,
} from '../../packages/core/src/public.ts'
import type {
  FlowRouterService,
  FlowRoutingRequest,
  FlowRoutingPort,
} from '../../packages/core/src/public.ts'

export const routingFixture: FlowRoutingRequest = {
  revision: 'fixture',
  obstacles: [
    { id: 'a', x: 0, y: 75, width: 100, height: 50 },
    { id: 'b', x: 500, y: 75, width: 100, height: 50 },
    { id: 'block', x: 250, y: 50, width: 100, height: 100 },
  ],
  connections: [
    {
      id: 'ab',
      source: { nodeId: 'a', point: { x: 100, y: 100 }, side: 'right' },
      target: { nodeId: 'b', point: { x: 500, y: 100 }, side: 'left' },
    },
  ],
  constraints: { clearance: 8, portOffset: 20 },
}

const rotate = (port: FlowRoutingPort): FlowRoutingPort => ({
  ...port,
  point: { x: -port.point.y, y: port.point.x },
  side: (
    {
      top: 'right',
      right: 'bottom',
      bottom: 'left',
      left: 'top',
    } satisfies Record<FlowRoutingPort['side'], FlowRoutingPort['side']>
  )[port.side],
})

export const routerContract = (
  name: string,
  create: () => FlowRouterService
): void => {
  const run = (request: Parameters<typeof routeFlowEdges>[0]) =>
    Effect.runPromise(
      routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, create()))
    )

  describe(`${name} router capability contract`, () => {
    it('returns a revision-keyed detour with directed ports and obstacle clearance', async () => {
      const result = await run(routingFixture)
      expect(validateFlowRoutingResult(routingFixture, result)).toBeTruthy()
      expect(result.paths[0]?.kind).toBe('routed')
      const [route] = result.paths

      if (route?.kind !== 'routed') {
        throw new Error('Expected routed output')
      }

      {
        expect(route.points[0]).toStrictEqual({ x: 100, y: 100 })
        expect(route.points.at(-1)).toStrictEqual({ x: 500, y: 100 })
        expect(route.points.some(({ y }) => y <= 42 || y >= 158)).toBeTruthy()
      }
    })

    it.each([0, 1, 2, 3])(
      'respects all port directions under rotation %s',
      async (turns) => {
        let request = routingFixture

        for (let index = 0; index < turns; index += 1) {
          request = {
            constraints: request.constraints,
            revision: `rotation-${turns}`,
            obstacles: request.obstacles.map((obstacle) => ({
              id: obstacle.id,
              x: -obstacle.y - obstacle.height,
              y: obstacle.x,
              width: obstacle.height,
              height: obstacle.width,
            })),
            connections: request.connections.map((connection) => ({
              ...connection,
              source: rotate(connection.source),
              target: rotate(connection.target),
            })),
          }
        }

        const result = await run(request)
        expect(validateFlowRoutingResult(request, result)).toBeTruthy()
        expect(result.paths[0]?.kind).toBe('routed')
      }
    )

    it('reroutes changed and resized obstacles without changing its input', async () => {
      const before = structuredClone(routingFixture)
      const first = await run(routingFixture)

      const request = {
        ...routingFixture,
        revision: 'resized',
        obstacles: routingFixture.obstacles.map((obstacle) =>
          obstacle.id === 'block'
            ? { ...obstacle, y: -100, height: 400 }
            : obstacle
        ),
      }

      const second = await run(request)
      expect(validateFlowRoutingResult(request, second)).toBeTruthy()
      expect(second.paths).not.toStrictEqual(first.paths)
      expect(routingFixture).toStrictEqual(before)
    })

    it.each([105, 450])(
      'reports an unreachable port explicitly at x=%s',
      async (x) => {
        const result = await run({
          ...routingFixture,
          obstacles: [
            ...routingFixture.obstacles,
            { id: 'wall', x, y: 80, width: 50, height: 50 },
          ],
        })

        expect(result.paths).toStrictEqual([
          { kind: 'unreachable', id: 'ab', reason: expect.any(String) },
        ])
      }
    )

    it('rejects malformed external inputs with a typed failure', async () => {
      await expect(
        run({
          ...routingFixture,
          constraints: { clearance: -1, portOffset: 20 },
        })
      ).rejects.toMatchObject({ reason: 'invalid-request' })
    })

    it('excludes manual intent from engine input', () => {
      const document = Effect.runSync(
        decodeFlowDocument({
          nodes: [
            { id: 'a', label: 'A', position: { x: 0, y: 0 } },
            { id: 'b', label: 'B', position: { x: 400, y: 0 } },
          ],
          edges: [
            {
              id: 'ab',
              source: 'a',
              target: 'b',
              route: { mode: 'manual', points: [{ x: 200, y: 100 }] },
            },
          ],
        })
      )

      expect(createFlowRoutingRequest(document).connections).toStrictEqual([])
      expect(document.edges[0]?.route).toStrictEqual({
        mode: 'manual',
        points: [{ x: 200, y: 100 }],
      })
    })
  })
}
