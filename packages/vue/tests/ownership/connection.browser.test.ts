import { describe, expect, it } from 'vitest'

import * as fixture from './viewport-fixture.ts'

describe('vue connection viewport ownership', () => {
  it.each(['physical', 'retained'] as const)(
    'connection auto-pan retains its owner %s',
    async (residence) => {
      const result = await fixture.ownershipRoundFiveConnection(residence)
      expect(result.beforeCancel).toMatchObject({
        held: residence === 'physical' ? 1 : 0,
        state: { viewport: { x: 7, y: 9, zoom: 1 } },
      })
      expect(
        result.beforeCancel.events.map((event) => event.name)
      ).toStrictEqual([
        'viewportStart',
        'moveStart',
        'viewportChange',
        'move',
        'viewportChange',
        'move',
      ])
      expect(result.afterCancel).toMatchObject({
        held: 0,
        captures: [
          { action: 'set', target: 'a', id: 7 },
          { action: 'release', target: 'a', id: 7 },
        ],
      })
      expect(
        result.afterCancel.lifecycle.slice(result.beforeCancel.lifecycle.length)
      ).toStrictEqual([
        {
          name: 'connectEnd',
          payload: { status: 'cancelled', reason: 'escape' },
        },
        ...(residence === 'retained'
          ? [
              {
                name: 'clickConnectEnd',
                payload: { status: 'cancelled', reason: 'escape' },
              },
            ]
          : []),
      ])
      expect(result.afterDispose).toStrictEqual(result.afterCancel)
    }
  )
})
