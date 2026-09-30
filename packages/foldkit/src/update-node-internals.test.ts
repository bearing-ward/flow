import { NodeIdSchema } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { createFoldkitNodeInternalsRefresher } from './update-node-internals.ts'

describe('node internals refresh facade', () => {
  it.each([false, true])(
    'settles a failed host measurement dispatch without retrying it, thrown %s',
    async (throwing) => {
      let dispatchAttempts = 0

      // SAFETY: the facade treats this value as an opaque host element.
      const mountedElement = {} as Element

      const refresher = createFoldkitNodeInternalsRefresher({
        schedule: (run) => {
          queueMicrotask(run)

          return () => {}
        },
        resolveElement: () => mountedElement,
        measure: () => {
          dispatchAttempts += 1

          if (throwing) {
            throw new Error('measurement failure')
          }

          return false
        },
      })

      await expect(
        refresher.refresh(NodeIdSchema.make('node'))
      ).resolves.toStrictEqual([{ nodeId: 'node', status: 'failed' }])
      expect(dispatchAttempts).toBe(1)
    }
  )

  it('does not dispatch after disposal', async () => {
    let dispatchAttempts = 0

    const refresher = createFoldkitNodeInternalsRefresher({
      // SAFETY: the facade treats this value as an opaque host element.
      schedule: (run) => {
        queueMicrotask(run)

        return () => {}
      },
      // SAFETY: this unit only exercises dispatch/disposal and the facade never reads this opaque element.
      resolveElement: () => ({}) as Element,
      measure: () => {
        dispatchAttempts += 1

        return true
      },
    })

    refresher.dispose()

    await expect(
      refresher.refresh(NodeIdSchema.make('node'))
    ).resolves.toStrictEqual([{ nodeId: 'node', status: 'disposed' }])
    expect(dispatchAttempts).toBe(0)
  })

  it('batches duplicate IDs and settles every waiter when a host callback fails', async () => {
    let flush: (() => void) | undefined
    let frames = 0
    const mountedElements = new Map<string, Element>()
    const ids = [NodeIdSchema.make('bad'), NodeIdSchema.make('missing')]

    const refresher = createFoldkitNodeInternalsRefresher({
      schedule: (run) => {
        frames += 1
        flush = run

        return () => {}
      },
      resolveElement: (id) => {
        if (id === ids[0]) {
          throw new Error('host lookup failure')
        }

        return mountedElements.get(id)
      },
      measure: () => {
        throw new Error('unexpected measurement')
      },
    })

    const first = refresher.refresh(
      [ids[0], ids[0], ids[1]].filter((id) => id !== undefined)
    )

    const second = refresher.refresh(ids[0] ?? NodeIdSchema.make('bad'))
    expect(frames).toBe(1)
    flush?.()
    await expect(first).resolves.toStrictEqual([
      { nodeId: 'bad', status: 'failed' },
      { nodeId: 'missing', status: 'missing' },
    ])
    await expect(second).resolves.toStrictEqual([
      { nodeId: 'bad', status: 'failed' },
    ])
  })

  it('settles scheduler failures and supports synchronous schedulers without sticking', async () => {
    const id = NodeIdSchema.make('node')

    const failed = createFoldkitNodeInternalsRefresher({
      schedule: () => {
        throw new Error('scheduler failure')
      },
      resolveElement: () => new Map<string, Element>().get(id),
      measure: () => true,
    })

    await expect(failed.refresh(id)).resolves.toStrictEqual([
      { nodeId: id, status: 'failed' },
    ])
    await expect(failed.refresh(id)).resolves.toStrictEqual([
      { nodeId: id, status: 'failed' },
    ])

    const synchronous = createFoldkitNodeInternalsRefresher({
      schedule: (run) => {
        run()

        return () => {}
      },
      resolveElement: () => new Map<string, Element>().get(id),
      measure: () => true,
    })

    await expect(synchronous.refresh(id)).resolves.toStrictEqual([
      { nodeId: id, status: 'missing' },
    ])
    await expect(synchronous.refresh(id)).resolves.toStrictEqual([
      { nodeId: id, status: 'missing' },
    ])
    synchronous.dispose()
    synchronous.dispose()
    await expect(synchronous.refresh(id)).resolves.toStrictEqual([
      { nodeId: id, status: 'disposed' },
    ])
  })

  it.each(['success', 'removed', 'disposed'] as const)(
    'coalesces two pending callers and settles the %s lifecycle',
    async (lifecycle) => {
      const id = NodeIdSchema.make('node')
      let flush: (() => void) | undefined
      let frames = 0
      let cancellations = 0
      let measurements = 0
      // SAFETY: the facade never reads this opaque host value.
      let element: Element | undefined = {} as Element

      const refresher = createFoldkitNodeInternalsRefresher({
        schedule: (run) => {
          frames += 1
          flush = run

          return () => {
            cancellations += 1
          }
        },
        resolveElement: () => element,
        measure: () => {
          measurements += 1

          return true
        },
      })

      const first = refresher.refresh([id, id])
      const second = refresher.refresh(id)
      expect(frames).toBe(1)

      if (lifecycle === 'removed') {
        element = undefined
      }

      if (lifecycle === 'disposed') {
        refresher.dispose()
      } else {
        flush?.()
      }

      const statuses = {
        success: 'requested',
        removed: 'missing',
        disposed: 'disposed',
      } as const

      const status = statuses[lifecycle]

      await expect(first).resolves.toStrictEqual([{ nodeId: id, status }])
      await expect(second).resolves.toStrictEqual([{ nodeId: id, status }])
      expect(measurements).toBe(lifecycle === 'success' ? 1 : 0)
      expect(cancellations).toBe(lifecycle === 'disposed' ? 1 : 0)
    }
  )
})
