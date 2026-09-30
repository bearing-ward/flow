import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  applyEdgeChanges,
  applyNodeChanges,
  decodeFlowDocument,
  decodeSavedFlowSession,
  EdgeIdSchema,
  FlowNodeSchema,
  encodeSavedFlowSession,
  NodeIdSchema,
  selectNodesData,
} from '@flow/core'
import type { EdgeChange, NodeChange } from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { isFlowTraceSourcePath } from '../../../scripts/check-research-traces'

const NodeSchema = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  position: S.Struct({ x: S.Number, y: S.Number }),
  data: S.optional(S.Struct({ label: S.String, value: S.Number })),
})

const EdgeSchema = S.Struct({
  id: S.String,
  source: S.String,
  target: S.String,
  data: S.optional(S.Struct({ label: S.String })),
})

const GraphSchema = S.Struct({
  nodes: S.Array(NodeSchema),
  edges: S.Array(EdgeSchema),
  viewport: S.Struct({ x: S.Number, y: S.Number, zoom: S.Number }),
})

const FixtureSchema = S.Struct({
  metadata: S.Struct({
    upstreamSha: S.String,
    version: S.String,
    captureRuns: S.Literal(2),
    captureRunDigests: S.Array(S.String),
    normalizedSha256: S.String,
  }),
  cases: S.Struct({
    contextIds: S.Array(S.NullOr(S.String)),
    selectors: S.Struct({
      nodes: S.Array(NodeSchema),
      nodesData: S.Array(
        S.Struct({
          id: S.String,
          type: S.optional(S.String),
          data: S.optional(S.Struct({ label: S.String, value: S.Number })),
        })
      ),
    }),
    saved: GraphSchema,
    changed: GraphSchema,
    restored: GraphSchema,
    initialization: S.Array(
      S.Struct({
        id: S.String,
        phase: S.Literals(['provider-only', 'settled-controlled-child']),
        value: S.Struct({
          nodeIds: S.Array(S.String),
          edgeIds: S.Array(S.String),
          viewport: S.Struct({ x: S.Number, y: S.Number, zoom: S.Number }),
          renderedNodeIds: S.Array(S.String),
          renderedViewportTransform: S.NullOr(S.String),
        }),
      })
    ),
  }),
})

const readFixture = () =>
  S.decodeUnknownSync(FixtureSchema)(
    JSON.parse(
      readFileSync('research/fixtures/provider-session-reference.json', 'utf-8')
    )
  )

const toFlowNode = (node: typeof NodeSchema.Type) => ({
  ...node,
  label: node.data?.label ?? node.id,
})

const toProjectedNode = (node: {
  readonly id: string
  readonly type?: string | undefined
  readonly label: string
  readonly position: { readonly x: number; readonly y: number }
  readonly data?: S.JsonObject | undefined
}) => ({
  id: node.id,
  type: node.type,
  label: node.label,
  position: node.position,
  data: node.data,
})

const toFlowDocument = (fixture: typeof FixtureSchema.Type) =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: fixture.cases.saved.nodes.map(toFlowNode),
      edges: fixture.cases.saved.edges,
    })
  )

const makeChangedGraph = (fixture: typeof FixtureSchema.Type) => {
  const document = toFlowDocument(fixture)
  const [changedNode] = fixture.cases.changed.nodes

  if (changedNode === undefined) {
    throw new Error('Missing upstream changed node')
  }

  const nodeChanges: NodeChange[] = [
    { id: S.decodeUnknownSync(NodeIdSchema)('b'), type: 'remove' },
    {
      id: S.decodeUnknownSync(NodeIdSchema)('a'),
      type: 'replace',
      item: S.decodeUnknownSync(FlowNodeSchema)(toFlowNode(changedNode)),
    },
  ]

  const edgeChanges: EdgeChange[] = fixture.cases.saved.edges.map(({ id }) => ({
    id: S.decodeUnknownSync(EdgeIdSchema)(id),
    type: 'remove',
  }))

  return {
    nodes: applyNodeChanges(nodeChanges, document.nodes),
    edges: applyEdgeChanges(edgeChanges, document.edges),
  }
}

describe('pinned provider and session reference', () => {
  it('keeps conformance test citations local and pinned React sources upstream', () => {
    expect(
      isFlowTraceSourcePath(
        'packages/conformance/src/provider-session-reference.test.ts'
      )
    ).toBeTruthy()
    expect(
      isFlowTraceSourcePath('packages/react/src/store/initialState.ts')
    ).toBeFalsy()
  })

  it('validates the two-run pinned capture and its durable digests', () => {
    const fixture = readFixture()

    const fixtureDigest = createHash('sha256')
      .update(JSON.stringify(fixture.cases))
      .digest('hex')

    expect(fixture.metadata).toMatchObject({
      upstreamSha: '0a1f9575b25679f2880175de8d3eae21aedde921',
      version: '12.11.6',
      captureRuns: 2,
    })
    expect(fixture.metadata.captureRunDigests).toStrictEqual([
      fixtureDigest,
      fixtureDigest,
    ])
    expect(fixture.metadata.normalizedSha256).toBe(fixtureDigest)
    expect(fixture.cases.contextIds).toStrictEqual(['a', 'b'])
    expect(fixture.cases.changed).toMatchObject({
      nodes: [{ id: 'a', data: { label: 'A changed', value: 9 } }],
      edges: [],
      viewport: { x: 99, y: 101, zoom: 2 },
    })
  })

  it.each([
    {
      id: 'empty-fit',
      nodeIds: [],
      edgeIds: [],
      viewport: { x: 400, y: 300, zoom: 2 },
    },
    {
      id: 'all-unsized-fit',
      nodeIds: ['unsized'],
      edgeIds: [],
      viewport: { x: 400, y: 300, zoom: 2 },
    },
    {
      id: 'mixed-fit',
      nodeIds: ['sized', 'unsized'],
      edgeIds: [],
      viewport: { x: 100, y: 150, zoom: 2 },
    },
    {
      id: 'sized-fit',
      nodeIds: ['sized'],
      edgeIds: [],
      viewport: { x: 100, y: 150, zoom: 2 },
    },
    {
      id: 'initial-node-dimensions-fit',
      nodeIds: ['initial-size'],
      edgeIds: [],
      viewport: { x: 100, y: 150, zoom: 2 },
    },
    {
      id: 'empty-max-zoom',
      nodeIds: [],
      edgeIds: [],
      viewport: { x: 400, y: 300, zoom: 1.25 },
    },
    {
      id: 'minimum-zoom',
      nodeIds: ['sized'],
      edgeIds: [],
      viewport: { x: -425, y: -487.5, zoom: 0.75 },
    },
    {
      id: 'missing-pane-dimensions',
      nodeIds: ['sized'],
      edgeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'fit-disabled',
      nodeIds: ['sized'],
      edgeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'initial-fit-padding',
      nodeIds: ['sized'],
      edgeIds: [],
      viewport: { x: -401, y: -100.5, zoom: 5.34 },
    },
    {
      id: 'default-collection-precedence',
      nodeIds: ['default-a', 'default-b'],
      edgeIds: ['default-edge'],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'empty-default-collection-precedence',
      nodeIds: [],
      edgeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  ])(
    'records provider-only $id through public hooks without claiming Flow initialization',
    ({ id, ...expected }) => {
      // initialState.ts:55-82: nullish default precedence and fit even for empty filtered bounds.
      const observation = readFixture().cases.initialization.find(
        (candidate) =>
          candidate.id === id && candidate.phase === 'provider-only'
      )

      expect(observation?.value).toStrictEqual({
        ...expected,
        renderedNodeIds: [],
        renderedViewportTransform: null,
      })
    }
  )

  it('records controlled StoreUpdater and viewport output only after hooks, current public reads and rendered output settle', () => {
    const observations = readFixture().cases.initialization

    const expected = [
      {
        id: 'controlled-after-provider-defaults',
        viewport: { x: 13, y: 17, zoom: 1.25 },
        transform: 'translate(13px, 17px) scale(1.25)',
      },
      {
        id: 'controlled-viewport-over-default',
        viewport: { x: 31, y: 37, zoom: 0.75 },
        transform: 'translate(31px, 37px) scale(0.75)',
      },
      {
        id: 'child-fit-over-default-viewport',
        viewport: { x: 100, y: 250, zoom: 2 },
        transform: 'translate(100px, 250px) scale(2)',
      },
    ]

    for (const { id, viewport, transform } of expected) {
      const provider = observations.find(
        (candidate) =>
          candidate.id === id && candidate.phase === 'provider-only'
      )

      const child = observations.find(
        (candidate) =>
          candidate.id === id && candidate.phase === 'settled-controlled-child'
      )

      expect(provider?.value).toStrictEqual({
        nodeIds: ['default-a', 'default-b'],
        edgeIds: ['default-edge'],
        viewport: { x: 100, y: 250, zoom: 2 },
        renderedNodeIds: [],
        renderedViewportTransform: null,
      })
      expect(child?.value).toStrictEqual({
        nodeIds: ['controlled-a', 'controlled-b'],
        edgeIds: ['controlled-edge'],
        viewport,
        renderedNodeIds: ['controlled-a', 'controlled-b'],
        renderedViewportTransform: transform,
      })
    }

    expect(
      observations.filter(({ phase }) => phase === 'settled-controlled-child')
    ).toHaveLength(3)
    expect(observations).toHaveLength(18)
  })

  it('matches Flow decoded nodes and selector output to the pinned hooks', () => {
    const fixture = readFixture()
    const document = toFlowDocument(fixture)

    expect(document.nodes.map(toProjectedNode)).toStrictEqual(
      fixture.cases.selectors.nodes.map((node) =>
        toProjectedNode(toFlowNode(node))
      )
    )
    expect(
      selectNodesData(
        document,
        S.decodeUnknownSync(S.Array(NodeIdSchema))(['b', 'a', 'missing'])
      )
    ).toStrictEqual(fixture.cases.selectors.nodesData)
  })

  it('matches Flow edit utilities to the pinned changed graph', () => {
    const fixture = readFixture()
    const changed = makeChangedGraph(fixture)

    expect(changed.nodes.map(toProjectedNode)).toStrictEqual(
      fixture.cases.changed.nodes.map((node) =>
        toProjectedNode(toFlowNode(node))
      )
    )
    expect(changed.edges).toStrictEqual(fixture.cases.changed.edges)
  })

  it('matches Flow saved-session encoding to the pinned saved graph', () => {
    const fixture = readFixture()
    const document = toFlowDocument(fixture)

    const session = encodeSavedFlowSession(
      document,
      fixture.cases.saved.viewport
    )

    expect({
      nodes: session.document.nodes.map((node) =>
        toProjectedNode({ ...node, label: node.label })
      ),
      edges: session.document.edges,
      viewport: session.viewport,
    }).toStrictEqual({
      nodes: fixture.cases.saved.nodes.map((node) =>
        toProjectedNode(toFlowNode(node))
      ),
      edges: fixture.cases.saved.edges,
      viewport: fixture.cases.saved.viewport,
    })
  })

  it('restores the Flow saved session to the pinned saved graph and viewport', async () => {
    const fixture = readFixture()
    const document = toFlowDocument(fixture)

    const session = encodeSavedFlowSession(
      document,
      fixture.cases.saved.viewport
    )

    const restored = await Effect.runPromise(decodeSavedFlowSession(session))

    expect({
      nodes: restored.document.nodes.map((node) =>
        toProjectedNode({ ...node, label: node.label })
      ),
      edges: restored.document.edges,
      viewport: restored.viewport,
    }).toStrictEqual({
      nodes: fixture.cases.restored.nodes.map((node) =>
        toProjectedNode(toFlowNode(node))
      ),
      edges: fixture.cases.restored.edges,
      viewport: fixture.cases.restored.viewport,
    })
  })
})
