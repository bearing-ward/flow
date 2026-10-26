import { Cause, Effect, Exit } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  getEdgeGeometry,
  getEdgesGeometry,
  getEdgeDistanceToPoint,
  isEdgeIntersectingRect,
} from './flow-edge-geometry.ts'
import { flowRoutingRevision } from './flow-routing-geometry.ts'
import { FlowRouter, FlowRoutingFailure } from './flow-routing.schema.ts'
import type {
  FlowRouterService,
  FlowRoutingResult,
} from './flow-routing.schema.ts'
import {
  createFlowRoutingRequest,
  createFlowRoutingSession,
  routeFlowEdges,
  validateFlowRoutingResult,
} from './flow-routing.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 400, y: 0 },
        size: { width: 100, height: 50 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'block',
        label: 'Obstacle',
        position: { x: 250, y: -25 },
        size: { width: 50, height: 100 },
      },
    ],
    edges: [
      {
        id: 'ab',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
        label: 'Route',
      },
    ],
  })
)

const request = createFlowRoutingRequest(document)

const result: FlowRoutingResult = {
  revision: request.revision,
  paths: [
    {
      kind: 'routed',
      id: 'ab',
      points: [
        { x: 105.5, y: 25 },
        { x: 133.5, y: 25 },
        { x: 133.5, y: -40 },
        { x: 366.5, y: -40 },
        { x: 366.5, y: 25 },
        { x: 394.5, y: 25 },
      ],
    },
  ],
}

const router: FlowRouterService = {
  route: (input) => Effect.succeed({ ...result, revision: input.revision }),
}

describe('derived edge routing', () => {
  it('uses one path for rendering, labels, distance and intersections', () => {
    expect(validateFlowRoutingResult(request, result)).toBeTruthy()
    const geometry = getEdgeGeometry(document, 'ab', { edgeRouting: result })
    expect(geometry?.path).toBe(
      'M105.5,25 L133.5,25 L133.5,-40 L366.5,-40 L366.5,25 L394.5,25'
    )
    expect(geometry?.label).toStrictEqual({ x: 250, y: -40 })

    if (geometry === undefined) {
      throw new Error('Missing geometry')
    }

    {
      expect(getEdgeDistanceToPoint(geometry, { x: 250, y: -40 })).toBe(0)
      expect(
        isEdgeIntersectingRect(geometry, {
          x: 249,
          y: -41,
          width: 2,
          height: 2,
        })
      ).toBeTruthy()
      expect(
        isEdgeIntersectingRect(geometry, {
          x: 251,
          y: -24,
          width: 48,
          height: 98,
        })
      ).toBeFalsy()
    }
  })

  it('rejects stale geometry when any obstacle changes and preserves manual intent', () => {
    const moved = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === 'block' ? { ...node, position: { x: 270, y: -25 } } : node
      ),
    }

    expect(getEdgesGeometry(moved, { edgeRouting: result })[0]?.path).toBe(
      getEdgesGeometry(moved)[0]?.path
    )

    const manual = Effect.runSync(
      decodeFlowDocument({
        ...document,
        edges: document.edges.map((edge) => ({
          ...edge,
          route: { mode: 'manual', points: [{ x: 200, y: 90 }] },
        })),
      })
    )

    expect(
      getEdgesGeometry(manual, {
        edgeRouting: {
          ...result,
          revision: createFlowRoutingRequest(manual).revision,
        },
      })[0]?.path
    ).toBe('M105.5,25 L200,90 L394.5,25')
    expect(manual.edges[0]?.route).toStrictEqual({
      mode: 'manual',
      points: [{ x: 200, y: 90 }],
    })
  })

  it('gives equivalent measurements the same key regardless of property order', () => {
    const node = document.nodes.find(({ id }) => id === 'a')

    if (node === undefined) {
      throw new Error('Missing fixture node')
    }

    const first = new Map([
      [node.id, { nodeId: node.id, width: 100, height: 50, handles: [] }],
    ])

    const second = new Map([
      [node.id, { handles: [], height: 50, nodeId: node.id, width: 100 }],
    ])

    expect(flowRoutingRevision(document, { measurements: first })).toBe(
      flowRoutingRevision(document, { measurements: second })
    )
  })

  it('enforces the requested port offset even without endpoint obstacles', () => {
    const portsOnly = { ...request, obstacles: [] }

    const shortExit: FlowRoutingResult = {
      revision: request.revision,
      paths: [
        {
          kind: 'routed',
          id: 'ab',
          points: [
            { x: 105.5, y: 25 },
            { x: 106.5, y: 25 },
            { x: 106.5, y: -40 },
            { x: 393.5, y: -40 },
            { x: 393.5, y: 25 },
            { x: 394.5, y: 25 },
          ],
        },
      ],
    }

    expect(validateFlowRoutingResult(portsOnly, shortExit)).toBeFalsy()
  })

  it('rejects a router that violates obstacle clearance', async () => {
    const invalid: FlowRouterService = {
      route: () =>
        Effect.succeed({
          revision: request.revision,
          paths: [
            {
              kind: 'routed',
              id: 'ab',
              points: [
                { x: 105.5, y: 25 },
                { x: 394.5, y: 25 },
              ],
            },
          ],
        }),
    }

    await expect(
      Effect.runPromise(
        routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, invalid))
      )
    ).rejects.toMatchObject({ reason: 'invalid-result' })
  })

  it('discards late requests after a newer accepted result', async () => {
    const session = createFlowRoutingSession()
    const deferred = Promise.withResolvers<FlowRoutingResult>()
    const oldRequest = { ...request, revision: 'old' }

    const old = Effect.runPromise(
      session
        .run(oldRequest, () => request.revision)
        .pipe(
          Effect.provideService(FlowRouter, {
            route: () => Effect.promise(() => deferred.promise),
          })
        )
    )

    await expect(
      Effect.runPromise(
        session
          .run(request, () => request.revision)
          .pipe(Effect.provideService(FlowRouter, router))
      )
    ).resolves.toStrictEqual({ kind: 'accepted', result })
    deferred.resolve({ ...result, revision: 'old' })
    await expect(old).resolves.toStrictEqual({
      kind: 'cancelled',
      revision: 'old',
    })
  })

  it.each(['cancel', 'dispose'] as const)(
    'discards pending output after %s',
    async (operation) => {
      const session = createFlowRoutingSession()
      const deferred = Promise.withResolvers<FlowRoutingResult>()

      const pending = Effect.runPromise(
        session
          .run(request, () => request.revision)
          .pipe(
            Effect.provideService(FlowRouter, {
              route: () => Effect.promise(() => deferred.promise),
            })
          )
      )

      session[operation]()
      deferred.resolve(result)
      await expect(pending).resolves.toStrictEqual({
        kind: 'cancelled',
        revision: request.revision,
      })
    }
  )

  it('discards a late engine failure after cancellation', async () => {
    const session = createFlowRoutingSession()
    const deferred = Promise.withResolvers<FlowRoutingResult>()

    const pending = Effect.runPromise(
      session
        .run(request, () => request.revision)
        .pipe(
          Effect.provideService(FlowRouter, {
            route: () =>
              Effect.tryPromise({
                try: () => deferred.promise,
                catch: (error) =>
                  new FlowRoutingFailure({
                    reason: 'engine',
                    message: String(error),
                  }),
              }),
          })
        )
    )

    session.cancel()
    deferred.reject(new Error('Late failure'))
    await expect(pending).resolves.toStrictEqual({
      kind: 'cancelled',
      revision: request.revision,
    })
  })

  it('supports native Effect interruption', async () => {
    const abort = new AbortController()

    const pending = Effect.runPromiseExit(
      createFlowRoutingSession()
        .run(request, () => request.revision)
        .pipe(
          Effect.provideService(FlowRouter, {
            route: () => Effect.sleep(10_000).pipe(Effect.as(result)),
          })
        ),
      { signal: abort.signal }
    )

    abort.abort()
    const exit = await pending
    expect(Exit.isFailure(exit)).toBeTruthy()

    if (!Exit.isFailure(exit)) {
      throw new Error('Expected interrupted result')
    }

    {
      expect(Cause.hasInterrupts(exit.cause)).toBeTruthy()
    }
  })
})
