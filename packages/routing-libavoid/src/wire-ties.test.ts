import { fileURLToPath } from 'node:url'

import {
  FlowBundleSchema,
  NodeIdSchema,
  createFlowRoutingRequest,
  decodeFlowDocument,
  routeFlowEdges,
  FlowRouter,
  intersectFlowWireSlash,
  getEdgeDistanceToPoint,
  getEdgesGeometry,
  getEdgePolylines,
  flowBundleEndpoints,
  flowBundleFrame,
} from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createLibavoidRouter } from './public.ts'

const router = createLibavoidRouter({
  wasmUrl: fileURLToPath(
    new URL('../node_modules/libavoid-js/dist/libavoid.wasm', import.meta.url)
  ),
})

const document = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 0, y: 100 },
          size: { width: 100, height: 100 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 700, y: 100 },
          size: { width: 100, height: 100 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'block',
          label: 'Obstacle',
          position: { x: 260, y: 70 },
          size: { width: 100, height: 160 },
        },
      ],
      edges: [
        {
          id: 'red',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#ff0000',
        },
        {
          id: 'green',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#00ff00',
        },
      ],
      bundles: [
        { id: 'ribbon', edgeIds: ['red', 'green'], ties: [{ x: 480, y: 150 }] },
      ],
    })
  )

describe('wire bundles with the configured libavoid capability', () => {
  it('routes lanes through ties with obstacle clearance and renders the same paths', async () => {
    const graph = document()
    const request = createFlowRoutingRequest(graph)

    const result = await Effect.runPromise(
      routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, router))
    )

    expect(result.bundlePaths).toHaveLength(2)
    const geometries = getEdgesGeometry(graph, { edgeRouting: result })

    for (const geometry of geometries) {
      expect(geometry.path).toBe(
        result.bundlePaths?.find(({ id }) => id === geometry.id)?.path
      )

      for (const point of getEdgePolylines(geometry).flat()) {
        expect(
          point.x > 252 && point.x < 368 && point.y > 62 && point.y < 238
        ).toBeFalsy()
      }
    }

    const bundle = graph.bundles?.[0]

    if (bundle === undefined) {
      throw new Error('Missing bundle')
    }

    const frame = flowBundleFrame(
      bundle,
      0,
      flowBundleEndpoints(graph, bundle),
      true
    )

    expect(frame.normal).toStrictEqual({ x: -0, y: 1 })
    expect(
      geometries[0] && getEdgeDistanceToPoint(geometries[0], { x: 480, y: 148 })
    ).toBeCloseTo(0, 8)
    expect(
      geometries[1] && getEdgeDistanceToPoint(geometries[1], { x: 480, y: 152 })
    ).toBeCloseTo(0, 8)
  })

  it('keeps one four-unit ribbon corridor when an obstacle lies between two ties', async () => {
    const graph = document()

    const tied = {
      ...graph,
      bundles: graph.bundles?.map((bundle) =>
        S.decodeUnknownSync(FlowBundleSchema)({
          ...bundle,
          ties: [
            { x: 200, y: 150 },
            { x: 500, y: 150 },
          ],
        })
      ),
    }

    const result = await Effect.runPromise(
      routeFlowEdges(createFlowRoutingRequest(tied)).pipe(
        Effect.provideService(FlowRouter, router)
      )
    )

    const geometries = getEdgesGeometry(tied, { edgeRouting: result })

    const crossings = intersectFlowWireSlash(
      geometries,
      { x: 310, y: -500 },
      { x: 310, y: 500 }
    )

    expect(crossings).toHaveLength(2)
    expect(
      (crossings[1]?.position.y ?? 0) - (crossings[0]?.position.y ?? 0)
    ).toBeCloseTo(4, 8)

    for (const geometry of geometries) {
      for (const point of getEdgePolylines(geometry).flat()) {
        expect(
          point.x > 252 && point.x < 368 && point.y > 62 && point.y < 238
        ).toBeFalsy()
      }
    }
  })

  it('lets the router own the straight exit near a tie beside an obstacle', async () => {
    const graph = document()

    const tied = {
      ...graph,
      bundles: graph.bundles?.map((bundle) =>
        S.decodeUnknownSync(FlowBundleSchema)({
          ...bundle,
          ties: [
            { x: 200, y: 150 },
            { x: 400, y: 150 },
          ],
        })
      ),
    }

    const result = await Effect.runPromise(
      routeFlowEdges(createFlowRoutingRequest(tied)).pipe(
        Effect.provideService(FlowRouter, router)
      )
    )

    expect(result.bundlePaths).toHaveLength(2)

    for (const geometry of getEdgesGeometry(tied, { edgeRouting: result })) {
      for (const point of getEdgePolylines(geometry).flat()) {
        expect(
          point.x > 252 && point.x < 368 && point.y > 62 && point.y < 238
        ).toBeFalsy()
      }
    }
  })

  it('routes close straight ties without artificial virtual-port loops', async () => {
    const graph = document()

    const tied = {
      ...graph,
      bundles: graph.bundles?.map((bundle) =>
        S.decodeUnknownSync(FlowBundleSchema)({
          ...bundle,
          ties: [
            { x: 200, y: 150 },
            { x: 210, y: 150 },
          ],
        })
      ),
    }

    const result = await Effect.runPromise(
      routeFlowEdges(createFlowRoutingRequest(tied)).pipe(
        Effect.provideService(FlowRouter, router)
      )
    )

    const crossings = intersectFlowWireSlash(
      getEdgesGeometry(tied, { edgeRouting: result }),
      { x: 205, y: 0 },
      { x: 205, y: 300 }
    )

    expect(result.bundlePaths).toHaveLength(2)
    expect(crossings).toHaveLength(2)
    expect(
      (crossings[1]?.position.y ?? 0) - (crossings[0]?.position.y ?? 0)
    ).toBeCloseTo(4, 8)
  })

  it('retains hidden lane intent while only drawing visible bundle members', async () => {
    const graph = document()

    const hidden = {
      ...graph,
      edges: graph.edges.map((edge) => ({
        ...edge,
        hidden: edge.id === 'green',
      })),
    }

    const request = createFlowRoutingRequest(hidden)

    const result = await Effect.runPromise(
      routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, router))
    )

    expect(request.connections.map(({ id }) => id)).toStrictEqual([
      'red',
      'green',
    ])
    expect(result.bundlePaths).toHaveLength(2)
    expect(
      getEdgesGeometry(hidden, { edgeRouting: result }).map(({ id }) => id)
    ).toStrictEqual(['red'])
    expect(hidden.edges.find(({ id }) => id === 'green')?.hidden).toBeTruthy()
  })

  it('keeps unrelated obstacle IDs out of virtual bundle port roles', async () => {
    const graph = document()

    const collision = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === 'block'
          ? { ...node, id: NodeIdSchema.make('wire-tie:ribbon:0') }
          : node
      ),
    }

    const ports: string[] = []

    const observed = {
      route: (request: Parameters<typeof router.route>[0]) => {
        ports.push(
          ...request.connections.flatMap(({ source, target }) => [
            source.nodeId,
            target.nodeId,
          ])
        )

        return router.route(request)
      },
    }

    await Effect.runPromise(
      routeFlowEdges(createFlowRoutingRequest(collision)).pipe(
        Effect.provideService(FlowRouter, observed)
      )
    )
    expect(ports).not.toContain('wire-tie:ribbon:0')
  })

  it('retains the configured physical endpoint exit distances in bundled paths', async () => {
    const graph = document()
    const request = createFlowRoutingRequest(graph)

    const result = await Effect.runPromise(
      routeFlowEdges(request).pipe(Effect.provideService(FlowRouter, router))
    )

    for (const geometry of getEdgesGeometry(graph, { edgeRouting: result })) {
      const points = getEdgePolylines(geometry).flat()

      const firstTurn = points.find(
        (point) => Math.abs(point.y - geometry.source.y) > 0.01
      )

      const lastTurn = points
        .toReversed()
        .find((point) => Math.abs(point.y - geometry.target.y) > 0.01)

      expect(
        (firstTurn?.x ?? geometry.source.x) - geometry.source.x
      ).toBeGreaterThanOrEqual(28)
      expect(
        geometry.target.x - (lastTurn?.x ?? geometry.target.x)
      ).toBeGreaterThanOrEqual(28)
    }
  })

  it('marks a tie inside an obstacle unreachable without persisting generated routes', async () => {
    const graph = document()

    const blocked = {
      ...graph,
      bundles: graph.bundles?.map((bundle) =>
        S.decodeUnknownSync(FlowBundleSchema)({
          ...bundle,
          ties: [{ x: 300, y: 150 }],
        })
      ),
    }

    const result = await Effect.runPromise(
      routeFlowEdges(createFlowRoutingRequest(blocked)).pipe(
        Effect.provideService(FlowRouter, router)
      )
    )

    expect(
      result.paths.every(({ kind }) => kind === 'unreachable')
    ).toBeTruthy()
    expect(result.bundlePaths).toStrictEqual([])
    expect(graph.edges.every(({ route }) => route === undefined)).toBeTruthy()
  })
})
