import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  ConnectionRadiusSchema,
  nearestConnectionTarget,
} from './flow-connection-radius.schema.ts'
import type { MeasuredConnectionHandle } from './flow-connection-radius.schema.ts'
import { ActiveClickConnectionSchema } from './flow-connection.schema.ts'
import { HandleIdSchema, NodeIdSchema } from './flow-values.ts'

const source = S.decodeSync(ActiveClickConnectionSchema)({
  source: 'source',
  sourceHandle: 'out',
})

const candidate = (
  nodeId: string,
  handleId: string,
  x: number,
  y: number,
  kind: 'source' | 'target' = 'target'
): MeasuredConnectionHandle => ({
  nodeId: S.decodeSync(NodeIdSchema)(nodeId),
  handleId: S.decodeSync(HandleIdSchema)(handleId),
  kind,
  center: { x, y },
})

describe('connection radius', () => {
  it('accepts finite nonnegative screen-pixel distances', () => {
    expect(S.decodeSync(ConnectionRadiusSchema)(0)).toBe(0)
    expect(S.decodeSync(ConnectionRadiusSchema)(25)).toBe(25)

    for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => S.decodeSync(ConnectionRadiusSchema)(invalid)).toThrow(
        /Expected/u
      )
    }
  })

  it('chooses the nearest target including one exactly on the radius', () => {
    const far = candidate('far', 'in', 10, 0)
    const boundary = candidate('boundary', 'in', 3, 4)
    const near = candidate('near', 'in', 2, 1)

    expect(
      nearestConnectionTarget({
        source,
        point: { x: 0, y: 0 },
        candidates: [far, boundary, near],
        radius: 5,
      })
    ).toBe(near)
    expect(
      nearestConnectionTarget({
        source,
        point: { x: 0, y: 0 },
        candidates: [far, boundary],
        radius: 5,
      })
    ).toBe(boundary)
  })

  it('rejects source handles and permits a target on the source node', () => {
    expect(
      nearestConnectionTarget({
        source,
        point: { x: 0, y: 0 },
        candidates: [
          candidate('source', 'in', 0, 0),
          candidate('other', 'out', 0, 0, 'source'),
          candidate('valid', 'in', 4, 0),
        ],
        radius: 5,
      })?.nodeId
    ).toBe('source')
  })

  it('allows either endpoint kind in loose mode but excludes the origin endpoint', () => {
    const sourceHandle = candidate('other', 'out', 1, 0, 'source')
    const targetHandle = candidate('target', 'in', 3, 0)

    expect(
      nearestConnectionTarget({
        source,
        point: { x: 0, y: 0 },
        candidates: [
          candidate('source', 'out', 0, 0, 'source'),
          sourceHandle,
          targetHandle,
        ],
        radius: 5,
        mode: 'loose',
      })
    ).toBe(sourceHandle)
  })

  it('breaks equal-distance ties by node then handle ID regardless of input order', () => {
    const choices = [
      candidate('b', 'a', 0, 1),
      candidate('a', 'z', 0, -1),
      candidate('a', 'b', 1, 0),
    ]

    for (const candidates of [choices, choices.toReversed()]) {
      expect(
        nearestConnectionTarget({
          source,
          point: { x: 0, y: 0 },
          candidates,
          radius: 1,
        })
      ).toBe(choices[2])
    }
  })

  it('returns no target outside the radius or with no candidates', () => {
    for (const candidates of [[], [candidate('other', 'in', 0.1, 0)]]) {
      expect(
        nearestConnectionTarget({
          source,
          point: { x: 0, y: 0 },
          candidates,
          radius: 0,
        })
      ).toBeUndefined()
    }
  })
})
