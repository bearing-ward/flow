import { Effect, Option, Result } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  validateFlowConnection,
  nextConnectionEdge,
} from './flow-connection.schema.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    edges: [],
    nodes: [
      {
        id: 'first',
        label: 'First',
        position: { x: 0, y: 0 },
        handles: [
          { id: 'out', kind: 'source', side: 'right' },
          { id: 'out-2', kind: 'source', side: 'bottom' },
        ],
      },
      {
        id: 'second',
        label: 'Second',
        position: { x: 200, y: 0 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'also-out', kind: 'source', side: 'right' },
        ],
      },
    ],
  })
)

const first = document.nodes.find((node) => node.id === 'first')

const second = document.nodes.find((node) => node.id === 'second')

const out = first?.handles?.find((handle) => handle.id === 'out')

const out2 = first?.handles?.find((handle) => handle.id === 'out-2')

const input = second?.handles?.find((handle) => handle.id === 'in')

const alsoOut = second?.handles?.find((handle) => handle.id === 'also-out')

if (
  first === undefined ||
  second === undefined ||
  out === undefined ||
  out2 === undefined ||
  input === undefined ||
  alsoOut === undefined
) {
  throw new Error('Invalid connection test document')
}

const connection = {
  source: first.id,
  sourceHandle: out.id,
  target: second.id,
  targetHandle: input.id,
}

describe('flow connections', () => {
  it('accepts a declared source-to-target pair and creates a unique edge', () => {
    const valid = Effect.runSync(validateFlowConnection(document, connection))
    const firstEdge = nextConnectionEdge(document, valid)

    const nextEdge = nextConnectionEdge(
      { ...document, edges: [firstEdge] },
      {
        ...connection,
        sourceHandle: out2.id,
      }
    )

    expect(firstEdge).toStrictEqual({ id: 'edge-1', ...connection })
    expect(nextEdge.id).toBe('edge-2')
  })

  it('rejects same-type and duplicate endpoint pairs', () => {
    const sameType = Effect.runSync(
      Effect.result(
        validateFlowConnection(document, {
          ...connection,
          targetHandle: alsoOut.id,
        })
      )
    )

    expect(Option.getOrThrow(Result.getFailure(sameType)).reason).toBe(
      'missing-target-handle'
    )

    const duplicate = Effect.runSync(
      Effect.result(
        validateFlowConnection(
          { ...document, edges: [nextConnectionEdge(document, connection)] },
          connection
        )
      )
    )

    expect(Option.getOrThrow(Result.getFailure(duplicate)).reason).toBe(
      'duplicate-connection'
    )
  })
})
