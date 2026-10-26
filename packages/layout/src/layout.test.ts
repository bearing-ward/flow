import {
  createFlowLayoutSession,
  defaultFlowLayoutSettings,
  defaultFlowForceSettings,
  decodeFlowDocument,
} from '@flow/core'
import type { FlowLayoutInput, FlowLayoutRequest } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createForceSimulation, runLayoutEngine } from './public.ts'

const input: FlowLayoutInput = {
  nodes: [
    { id: 'a', width: 240, height: 60, handles: [] },
    { id: 'b', width: 100, height: 40, handles: [] },
    { id: 'c', width: 170, height: 90, handles: [] },
  ],
  edges: [
    {
      id: 'ab',
      source: 'a',
      target: 'b',
      sourceHandle: undefined,
      targetHandle: undefined,
    },
    {
      id: 'ac',
      source: 'a',
      target: 'c',
      sourceHandle: undefined,
      targetHandle: undefined,
    },
  ],
  unmeasured: [],
}

describe('optional measured layout engines', () => {
  it('discards a delayed real ELK result after hierarchy completes', async () => {
    const session = createFlowLayoutSession()
    const release = Promise.withResolvers<undefined>()

    const elkRequest: FlowLayoutRequest = {
      revision: 'same-document',
      input,
      settings: { ...defaultFlowLayoutSettings, engine: 'elk' },
    }

    const pending = Effect.runPromise(
      session.run(
        elkRequest,
        (request) =>
          runLayoutEngine(request).pipe(
            Effect.flatMap((result) =>
              Effect.promise(async () => {
                await release.promise

                return result
              })
            )
          ),
        () => 'same-document'
      )
    )

    const latest = await Effect.runPromise(
      session.run(
        {
          ...elkRequest,
          settings: { ...defaultFlowLayoutSettings, engine: 'hierarchy' },
        },
        runLayoutEngine,
        () => 'same-document'
      )
    )

    expect(latest.kind).toBe('accepted')
    release.resolve(undefined)
    await expect(pending).resolves.toStrictEqual({ kind: 'discarded' })
  })

  it.each(['dagre', 'hierarchy', 'elk'] as const)(
    '%s orders measured boxes in both directions without overlap',
    async (engine) => {
      await Promise.all(
        (['TB', 'LR'] as const).map(async (direction) => {
          const result = await Effect.runPromise(
            runLayoutEngine({
              revision: 'r1',
              input,
              settings: { ...defaultFlowLayoutSettings, engine, direction },
            })
          )

          const a = result.positions.get('a')
          const b = result.positions.get('b')
          const c = result.positions.get('c')
          expect(result.revision).toBe('r1')
          expect(result.positions.size).toBe(3)

          if (a === undefined || b === undefined || c === undefined) {
            throw new Error('Missing positions')
          }

          const depth = direction === 'TB' ? 'y' : 'x'
          const breadth = direction === 'TB' ? 'x' : 'y'
          const size = direction === 'TB' ? 60 : 240
          expect(b[depth]).toBeGreaterThanOrEqual(a[depth] + size)
          expect(c[depth]).toBeGreaterThanOrEqual(a[depth] + size)
          expect(Math.abs(b[breadth] - c[breadth])).toBeGreaterThanOrEqual(
            direction === 'TB' ? 100 : 40
          )
        })
      )
    }
  )

  it('hierarchy rejects multiple roots, multiple parents, cycles and empty input', async () => {
    await Promise.all(
      [
        [],
        [
          ...input.edges,
          {
            sourceHandle: undefined,
            targetHandle: undefined,
            id: 'bc',
            source: 'b',
            target: 'c',
          },
        ],
        [
          ...input.edges,
          {
            sourceHandle: undefined,
            targetHandle: undefined,
            id: 'ca',
            source: 'c',
            target: 'a',
          },
        ],
      ].map(async (edges) => {
        await expect(
          Effect.runPromise(
            runLayoutEngine({
              revision: 'x',
              input: { ...input, edges },
              settings: { ...defaultFlowLayoutSettings, engine: 'hierarchy' },
            })
          )
        ).rejects.toBeDefined()
      })
    )

    await expect(
      Effect.runPromise(
        runLayoutEngine({
          revision: 'x',
          input: { nodes: [], edges: [], unmeasured: [] },
          settings: defaultFlowLayoutSettings,
        })
      )
    ).rejects.toBeDefined()
  })

  it('force settings alter visible destinations, settle and preserve a pinned drop', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: input.nodes.map(({ id }) => ({
          id,
          label: id,
          position: { x: 0, y: 0 },
        })),
        edges: input.edges,
      })
    )

    const run = (distance: number) => {
      const force = createForceSimulation(input, document, { x: 400, y: 300 })
      Effect.runSync(force.configure({ ...defaultFlowForceSettings, distance }))
      let positions = force.tick()

      for (let i = 0; i < 200 && !force.settled(); i += 1) {
        positions = force.tick()
      }

      expect(force.settled()).toBeTruthy()
      force.pin('a', { x: 123, y: 456 })
      positions = force.tick()
      expect(positions.get('a')).toStrictEqual({ x: 123, y: 456 })
      force.dispose()

      return positions.get('b')
    }

    expect(run(50)).not.toStrictEqual(run(350))
  })
})
