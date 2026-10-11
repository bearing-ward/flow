import { readFileSync } from 'node:fs'

import {
  decodeFlowDocument,
  edgeAttachmentPosition,
  NodeIdSchema,
  HandleIdSchema,
} from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { HandleRefreshFixtureSchema } from '../../../research/harnesses/handle-refresh/fixture-schema.ts'

const fixture = S.decodeUnknownSync(HandleRefreshFixtureSchema)(
  JSON.parse(
    readFileSync('research/fixtures/handle-refresh-reference.json', 'utf-8')
  )
)

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'parent', label: 'Parent', position: { x: 30, y: 40 } },
      {
        id: 'source',
        label: 'Source',
        parentId: 'parent',
        position: { x: 20, y: 30 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 350, y: 110 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

describe('pinned measured handle refresh reference', () => {
  it('records two stable captures of the full pinned reference', () => {
    expect(fixture.metadata.upstreamSha).toBe(
      '0a1f9575b25679f2880175de8d3eae21aedde921'
    )
    expect(fixture.metadata.version).toBe('12.11.6')
    expect(fixture.metadata.captureRuns).toBe(2)
    expect(fixture.repeatedCaptureMatches).toBeTruthy()
  })

  it.each(['initial', 'moved'] as const)(
    'matches side attachment endpoints for equivalent caller geometry: %s',
    (phase) => {
      const observation = fixture.cases[phase]

      for (const [nodeId, handleId, geometry, endpoint] of [
        ['source', 'out', observation.source, observation.endpoints.start],
        ['target', 'in', observation.target, observation.endpoints.end],
      ] as const) {
        const declaration = document.nodes
          .find(({ id }) => id === nodeId)
          ?.handles?.find(({ id }) => id === handleId)

        if (declaration === undefined) {
          throw new Error('Missing accepted declaration')
        }

        expect(
          edgeAttachmentPosition(geometry.absolutePosition, declaration, {
            nodeId: NodeIdSchema.make(nodeId),
            handleId: HandleIdSchema.make(handleId),
            offset: geometry.center,
            width: 10,
            height: 10,
          })
        ).toStrictEqual(endpoint)
      }
    }
  )

  it('preserves graph and viewport while adding/removing handle bounds', () => {
    expect(fixture.cases.added).toStrictEqual(['in', 'added'])
    expect(fixture.cases.removed).toStrictEqual(['in'])
    expect(fixture.cases.nodePositions).toStrictEqual(
      document.nodes.map(({ id, position }) => ({ id, position }))
    )
    expect(fixture.cases.viewport).toStrictEqual({ x: 10, y: 20, zoom: 1 })
    expect([
      fixture.cases.initial.source.width,
      fixture.cases.initial.source.height,
    ]).toStrictEqual([
      fixture.cases.moved.source.width,
      fixture.cases.moved.source.height,
    ])
  })
})

describe('captured original handle fields', () => {
  it.each(['initial', 'moved'] as const)(
    'retains actual pinned owner/size and top-left fields: %s',
    (phase) => {
      const observation = fixture.cases[phase]

      for (const [handle, nodeId, kind, geometry] of [
        [observation.sourceHandle, 'source', 'source', observation.source],
        [observation.targetHandle, 'target', 'target', observation.target],
      ] as const) {
        expect({
          nodeId: handle.nodeId,
          kind: handle.type,
          width: handle.width,
          height: handle.height,
          center: {
            x: handle.x + handle.width / 2,
            y: handle.y + handle.height / 2,
          },
        }).toStrictEqual({
          nodeId,
          kind,
          width: 10,
          height: 10,
          center: geometry.center,
        })
      }
    }
  )
})
