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
      {
        id: 'third',
        label: 'Third',
        position: { x: 400, y: 0 },
        handles: [{ id: 'in-2', kind: 'target', side: 'left' }],
      },
    ],
  })
)

const first = document.nodes.find((node) => node.id === 'first')

const second = document.nodes.find((node) => node.id === 'second')

const third = document.nodes.find((node) => node.id === 'third')

const out = first?.handles?.find((handle) => handle.id === 'out')

const out2 = first?.handles?.find((handle) => handle.id === 'out-2')

const input = second?.handles?.find((handle) => handle.id === 'in')

const alsoOut = second?.handles?.find((handle) => handle.id === 'also-out')

const thirdInput = third?.handles?.find((handle) => handle.id === 'in-2')

if (
  first === undefined ||
  second === undefined ||
  out === undefined ||
  out2 === undefined ||
  input === undefined ||
  alsoOut === undefined ||
  third === undefined ||
  thirdInput === undefined
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

  it('allows same-kind endpoints in loose mode and keeps gesture direction', () => {
    const sourceToSource = Effect.runSync(
      validateFlowConnection(
        document,
        { ...connection, targetHandle: alsoOut.id },
        'loose'
      )
    )

    expect(sourceToSource).toStrictEqual({
      ...connection,
      targetHandle: alsoOut.id,
    })

    const targetOrigin = Effect.runSync(
      validateFlowConnection(
        document,
        {
          source: second.id,
          sourceHandle: input.id,
          target: first.id,
          targetHandle: out.id,
        },
        'loose'
      )
    )

    expect(targetOrigin).toStrictEqual({
      source: first.id,
      sourceHandle: out.id,
      target: second.id,
      targetHandle: input.id,
    })
  })

  it('keeps strict mode as the default and rejects a loose same-handle loop', () => {
    const strictSourceToSource = Effect.runSync(
      Effect.result(
        validateFlowConnection(document, {
          ...connection,
          targetHandle: alsoOut.id,
        })
      )
    )

    expect(
      Option.getOrThrow(Result.getFailure(strictSourceToSource)).reason
    ).toBe('missing-target-handle')

    const sameHandle = Effect.runSync(
      Effect.result(
        validateFlowConnection(
          document,
          {
            source: second.id,
            sourceHandle: input.id,
            target: second.id,
            targetHandle: input.id,
          },
          'loose'
        )
      )
    )

    expect(Option.getOrThrow(Result.getFailure(sameHandle)).reason).toBe(
      'same-handle'
    )
  })

  it('rejects stale endpoints and duplicates in loose mode after normalization', () => {
    const loose = Effect.runSync(
      validateFlowConnection(
        document,
        { ...connection, targetHandle: alsoOut.id },
        'loose'
      )
    )

    const duplicate = Effect.runSync(
      Effect.result(
        validateFlowConnection(
          { ...document, edges: [nextConnectionEdge(document, loose)] },
          { ...connection, targetHandle: alsoOut.id },
          'loose'
        )
      )
    )

    expect(Option.getOrThrow(Result.getFailure(duplicate)).reason).toBe(
      'duplicate-connection'
    )

    const stale = Effect.runSync(
      Effect.result(
        validateFlowConnection(
          {
            ...document,
            nodes: document.nodes.map((node) =>
              node.id === 'second'
                ? {
                    ...node,
                    handles: node.handles?.filter(
                      (handle) => handle.id !== alsoOut.id
                    ),
                  }
                : node
            ),
          },
          { ...connection, targetHandle: alsoOut.id },
          'loose'
        )
      )
    )

    expect(Option.getOrThrow(Result.getFailure(stale)).reason).toBe(
      'missing-target-handle'
    )
  })

  it('rejects loose target-to-target connections that cannot render', () => {
    const targetOrigin = {
      source: second.id,
      sourceHandle: input.id,
      target: third.id,
      targetHandle: thirdInput.id,
    }

    const invalid = Effect.runSync(
      Effect.result(validateFlowConnection(document, targetOrigin, 'loose'))
    )

    expect(Option.getOrThrow(Result.getFailure(invalid)).reason).toBe(
      'unsupported-handle-combination'
    )
  })
})
