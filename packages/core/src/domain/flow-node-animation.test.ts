import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowNodeAnimator } from '../use-cases/node-animation.ts'
import { createFlowHistory, reduceFlowHistory } from './flow-history.ts'
import { defaultFlowLayoutSettings } from './flow-layout-request.ts'
import {
  createFlowNodeTransition,
  decodeFlowNodeAnimationRequest,
  finishFlowNodeTransition,
  stepFlowNodeTransition,
} from './flow-node-animation.ts'
import { FlowDocumentSchema } from './flow.schema.ts'
import type { XYPosition } from './flow.schema.ts'

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 20 } }],
  edges: [],
})

const request = {
  result: {
    revision: 'target-1',
    settings: defaultFlowLayoutSettings,
    positions: new Map([['a', { x: 300, y: 80 }]]),
  },
}

const from = new Map([['a', { x: 0, y: 20 }]])

const owner = (mode: 'accept' | 'reject' | 'fail' = 'accept') => {
  let accepted = document
  let display: ReadonlyMap<string, XYPosition> = from
  let history = createFlowHistory(document)
  let step: ((delta: number) => void) | undefined
  let reduced = false
  let commits = 0

  const animator = createFlowNodeAnimator({
    document: () => accepted,
    displayed: () => display,
    draw: (positions) => {
      display = positions
    },
    commit: (next) => {
      if (mode === 'fail') {
        return Promise.reject(new Error('Rejected destination'))
      }

      if (mode === 'reject') {
        return Promise.resolve()
      }

      accepted = next
      commits += 1
      history = reduceFlowHistory(history, {
        kind: 'accepted',
        document: next,
        context: {
          transactionId: String(commits),
          origin: { kind: 'local', actorId: 'test' },
        },
      }).state

      return Promise.resolve()
    },
    reducedMotion: () => reduced,
    schedule: (next) => {
      step = next

      return () => {
        if (step === next) {
          step = undefined
        }
      }
    },
  })

  return {
    animator,
    frame: (delta: number) => step?.(delta),
    read: () => ({ accepted, display, history, commits }),
    reduced: () => {
      reduced = true
    },
    replace: (next: typeof document) => {
      accepted = next
    },
  }
}

describe('node position animation', () => {
  it('interpolates by ID linearly for 300 ms and finishes at exact targets', () => {
    const transition = createFlowNodeTransition(request, from)
    expect(transition.duration).toBe(300)
    const middle = stepFlowNodeTransition(transition, 150)
    expect(middle.kind).toBe('running')
    expect(middle.positions.get('a')).toStrictEqual({ x: 150, y: 50 })
    const end = stepFlowNodeTransition(middle.transition, 500)
    expect(end.kind).toBe('finished')
    expect(end.positions.get('a')).toStrictEqual({ x: 300, y: 80 })
  })

  it('reports cancellation and supersession with the target revision', () => {
    const transition = createFlowNodeTransition(request, from)
    expect(finishFlowNodeTransition(transition, 'cancelled')).toStrictEqual({
      revision: 'target-1',
      kind: 'cancelled',
    })
    expect(finishFlowNodeTransition(transition, 'superseded')).toStrictEqual({
      revision: 'target-1',
      kind: 'superseded',
    })
    expect(stepFlowNodeTransition(transition, -30).positions).toStrictEqual(
      from
    )
  })

  it('decodes unknown settings and rejects invalid durations and nonfinite points', () => {
    expect(() =>
      Effect.runSync(
        decodeFlowNodeAnimationRequest({ ...request, duration: -1 })
      )
    ).toThrow(/Expected|greater|finite|number/u)
    expect(() =>
      Effect.runSync(
        decodeFlowNodeAnimationRequest({
          result: {
            ...request.result,
            positions: new Map([['a', { x: Number.NaN, y: 0 }]]),
          },
        })
      )
    ).toThrow(/Expected|greater|finite|number/u)
    expect(
      stepFlowNodeTransition(createFlowNodeTransition(request, from, true), 0)
        .kind
    ).toBe('finished')
  })

  it('commits one history destination while frames remain presentation only', async () => {
    const host = owner()
    const completion = host.animator.animate(request)
    await Promise.resolve()
    expect(host.read().accepted.nodes[0]?.position).toStrictEqual({
      x: 300,
      y: 80,
    })
    host.frame(100)
    expect(host.read().display.get('a')).toStrictEqual({ x: 100, y: 40 })
    host.frame(100)
    expect(host.read().history.past).toHaveLength(1)
    host.frame(100)
    await expect(completion).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'finished',
    })
    expect(host.read().display.size).toBe(0)
  })

  it('rebases a superseding transition on the displayed position', async () => {
    const host = owner()
    const first = host.animator.animate(request)
    await Promise.resolve()
    host.frame(150)

    const second = host.animator.animate({
      ...request,
      result: {
        ...request.result,
        revision: 'target-2',
        positions: new Map([['a', { x: 0, y: 20 }]]),
      },
    })

    await Promise.resolve()
    await expect(first).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'superseded',
    })
    expect(host.read().display.get('a')).toStrictEqual({ x: 150, y: 50 })
    host.frame(150)
    expect(host.read().display.get('a')).toStrictEqual({ x: 75, y: 35 })
    host.frame(150)
    await expect(second).resolves.toStrictEqual({
      revision: 'target-2',
      kind: 'finished',
    })
    expect(host.read().history.past).toHaveLength(2)
  })

  it('cancels manual takeover at the displayed position, then clears held geometry on a semantic change', async () => {
    const host = owner()
    const completion = host.animator.animate(request)
    await Promise.resolve()
    host.frame(100)
    host.animator.cancel('cancelled', true)
    await expect(completion).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'cancelled',
    })
    expect(host.read().display.get('a')).toStrictEqual({ x: 100, y: 40 })
    host.replace({ nodes: [], edges: [] })
    host.animator.reconcile()
    expect(host.read().display.size).toBe(0)
  })

  it('finishes under reduced motion without affecting another instance', async () => {
    const first = owner()
    const second = owner()
    second.reduced()
    await expect(second.animator.animate(request)).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'finished',
    })
    expect(first.read().commits).toBe(0)
    expect(first.read().display).toStrictEqual(from)
  })

  it('prunes removed nodes without resurrecting them at completion', async () => {
    const host = owner()
    const completion = host.animator.animate(request)
    await Promise.resolve()
    host.replace({ nodes: [], edges: [] })
    host.frame(300)
    await expect(completion).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'finished',
    })
    expect(host.read().display.size).toBe(0)
    expect(host.read().accepted.nodes).toStrictEqual([])
  })

  it('does not animate or record a rejected controlled proposal', async () => {
    const host = owner('reject')
    await expect(host.animator.animate(request)).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'cancelled',
    })
    expect(host.read().history.past).toHaveLength(0)
    expect(host.read().display.size).toBe(0)
  })

  it('releases presentation and preserves history when the semantic commit fails', async () => {
    const host = owner('fail')
    await expect(host.animator.animate(request)).rejects.toThrow(
      'Rejected destination'
    )
    expect(host.read().history.past).toHaveLength(0)
    expect(host.read().display.size).toBe(0)
  })

  it('leaves presentation untouched when an unused animator is cancelled or disposed', () => {
    const host = owner()
    host.animator.cancel('cancelled', true)
    host.animator.reconcile()
    host.animator.dispose()
    expect(host.read().display).toStrictEqual(from)
    expect(host.read().commits).toBe(0)
  })

  it('settles disposal and disables subsequent runs', async () => {
    const host = owner()
    const pending = host.animator.animate(request)
    await Promise.resolve()
    host.animator.dispose()
    await expect(pending).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'disposed',
    })
    await expect(host.animator.animate(request)).resolves.toStrictEqual({
      revision: 'target-1',
      kind: 'disposed',
    })
    expect(host.read().commits).toBe(1)
  })
})
