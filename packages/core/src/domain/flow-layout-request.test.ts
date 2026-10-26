import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowHistory, reduceFlowHistory } from './flow-history.ts'
import {
  createFlowLayoutSession,
  decodeFlowForceSettings,
  decodeFlowLayoutSettings,
  defaultFlowLayoutSettings,
  flowLayoutRevision,
  flowLayoutInputKey,
} from './flow-layout-request.ts'
import type { FlowLayoutResult } from './flow-layout-request.ts'
import { FlowDocumentSchema } from './flow.schema.ts'

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
  edges: [],
})

const request = {
  revision: 'one',
  settings: defaultFlowLayoutSettings,
  input: { nodes: [], edges: [], unmeasured: [] },
}

const result: FlowLayoutResult = {
  ...request,
  positions: new Map([['a', { x: 10, y: 20 }]]),
}

describe('layout request ownership', () => {
  it('keeps identity stable across fit measurement noise without changing engine input', () => {
    const input = {
      nodes: [{ id: 'a', width: 61.125, height: 44, handles: [] }],
      edges: [],
      unmeasured: [],
    }

    const noisy = {
      ...input,
      nodes: input.nodes.map((node) => ({ ...node, width: 61.12500000000001 })),
    }

    const resized = {
      ...input,
      nodes: input.nodes.map((node) => ({ ...node, width: 90 })),
    }

    expect(flowLayoutInputKey(noisy)).toBe(flowLayoutInputKey(input))
    expect(flowLayoutRevision(document, noisy)).toBe(
      flowLayoutRevision(document, input)
    )
    expect(flowLayoutInputKey(resized)).not.toBe(flowLayoutInputKey(input))
    expect(noisy.nodes[0]?.width).toBe(61.12500000000001)
  })

  it('discards a late async result after a newer request', async () => {
    const session = createFlowLayoutSession()
    const delayed = Promise.withResolvers<FlowLayoutResult>()

    const old = Effect.runPromise(
      session.run(
        request,
        () => Effect.promise(() => delayed.promise),
        () => 'one'
      )
    )

    await expect(
      Effect.runPromise(
        session.run(
          request,
          () => Effect.succeed(result),
          () => 'one'
        )
      )
    ).resolves.toMatchObject({ kind: 'accepted' })
    delayed.resolve(result)
    await expect(old).resolves.toStrictEqual({ kind: 'discarded' })
  })

  it.each(['cancel', 'dispose'] as const)(
    'discards results after document edits and %s',
    async (action) => {
      const session = createFlowLayoutSession()
      await expect(
        Effect.runPromise(
          session.run(
            request,
            () => Effect.succeed(result),
            () => 'two'
          )
        )
      ).resolves.toStrictEqual({ kind: 'discarded' })
      const delayed = Promise.withResolvers<FlowLayoutResult>()

      const pending = Effect.runPromise(
        session.run(
          request,
          () => Effect.promise(() => delayed.promise),
          () => 'one'
        )
      )

      session[action]()
      delayed.resolve(result)
      await expect(pending).resolves.toStrictEqual({ kind: 'discarded' })
    }
  )

  it('decodes finite output and compares settings by value', async () => {
    const session = createFlowLayoutSession()

    const reordered = {
      ...request,
      settings: {
        rankSpacing: 60,
        nodeSpacing: 30,
        direction: 'TB',
        engine: 'dagre',
      } as const,
    }

    await expect(
      Effect.runPromise(
        session.run(
          reordered,
          () => Effect.succeed(result),
          () => 'one'
        )
      )
    ).resolves.toMatchObject({ kind: 'accepted' })
    await expect(
      Effect.runPromise(
        session.run(
          request,
          () =>
            Effect.succeed({
              ...result,
              positions: new Map([['a', { x: Number.NaN, y: 0 }]]),
            }),
          () => 'one'
        )
      )
    ).rejects.toBeDefined()
    await expect(
      Effect.runPromise(
        session.run(
          request,
          () => Effect.succeed({ ...result, revision: 'other' }),
          () => 'other'
        )
      )
    ).resolves.toStrictEqual({ kind: 'discarded' })
  })

  it('invalidates authored changes but ignores selection and measurement noise', () => {
    const revision = flowLayoutRevision(document, request.input)
    expect(
      flowLayoutRevision(
        {
          ...document,
          nodes: document.nodes.map((node) => ({ ...node, selected: true })),
        },
        request.input
      )
    ).toBe(revision)
    expect(
      flowLayoutRevision(
        {
          ...document,
          nodes: document.nodes.map((node) => ({
            ...node,
            position: { x: 2, y: 3 },
          })),
        },
        request.input
      )
    ).not.toBe(revision)
  })

  it('rejects nonfinite, out of range and unknown engine settings', async () => {
    await Promise.all(
      [Number.NaN, Infinity, -1, 501].map(async (value) => {
        await expect(
          Effect.runPromise(
            decodeFlowLayoutSettings({
              ...defaultFlowLayoutSettings,
              rankSpacing: value,
            })
          )
        ).rejects.toBeDefined()
      })
    )

    await expect(
      Effect.runPromise(
        decodeFlowLayoutSettings({
          ...defaultFlowLayoutSettings,
          engine: 'other',
        })
      )
    ).rejects.toBeDefined()

    await Promise.all(
      [
        { strength: -2001, distance: 150 },
        { strength: -1000, distance: 0 },
        { strength: Number.NaN, distance: 150 },
      ].map(async (settings) => {
        await expect(
          Effect.runPromise(decodeFlowForceSettings(settings))
        ).rejects.toBeDefined()
      })
    )
  })

  it('coalesces accepted force frames and starts a new undo step for a new gesture', () => {
    let state = createFlowHistory(document)

    for (const [gestureId, x] of [
      ['force-one', 10],
      ['force-one', 20],
      ['force-two', 30],
    ] as const) {
      ;({ state } = reduceFlowHistory(state, {
        kind: 'accepted',
        document: {
          ...document,
          nodes: document.nodes.map((node) => ({
            ...node,
            position: { x, y: 0 },
          })),
        },
        context: {
          transactionId: String(x),
          origin: { kind: 'local', actorId: 'force' },
          gestureId,
          gestureMode: 'continuous',
        },
      }))
    }

    expect(
      state.past.map((snapshot) => snapshot.nodes[0]?.position)
    ).toStrictEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ])
  })

  it('joins force relaxation to the preceding accepted drag without another undo step', () => {
    const moved = {
      ...document,
      nodes: document.nodes.map((node) => ({
        ...node,
        position: { x: 30, y: 40 },
      })),
    }

    const drag = reduceFlowHistory(createFlowHistory(document), {
      kind: 'accepted',
      document: moved,
    }).state

    const relaxed = {
      ...moved,
      nodes: moved.nodes.map((node) => ({
        ...node,
        position: { x: 60, y: 70 },
      })),
    }

    const { state } = reduceFlowHistory(drag, {
      kind: 'accepted',
      document: relaxed,
      context: {
        transactionId: 'relax',
        origin: { kind: 'local', actorId: 'force' },
        gestureId: 'after-drag',
        gestureMode: 'continuation',
      },
    })

    expect(state.past).toStrictEqual([document])
  })
})
