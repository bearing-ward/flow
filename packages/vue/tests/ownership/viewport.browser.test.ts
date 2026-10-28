import { describe, expect, it } from 'vitest'

import * as fixture from './viewport-fixture.ts'

const requestCases = [
  {
    route: 'matching',
    requestId: 1,
    status: 'proposed',
    viewport: { x: 20, y: 30, zoom: 1 },
    frames: 0,
  },
  {
    route: 'nonmatching',
    requestId: 1,
    status: 'superseded',
    viewport: { x: 3, y: 4, zoom: 1 },
    frames: 0,
  },
  {
    route: 'animation',
    requestId: 1,
    status: 'accepted',
    viewport: { x: 20, y: 30, zoom: 1 },
    frames: 6,
  },
  {
    route: 'stale-frame',
    requestId: 2,
    status: 'accepted',
    viewport: { x: 70, y: 90, zoom: 1 },
    frames: 8,
  },
] satisfies {
  route: Parameters<typeof fixture.viewportRequestProof>[0]
  requestId: number
  status: string
  viewport: { x: number; y: number; zoom: number }
  frames: number
}[]

describe('vue viewport ordering', () => {
  it.each(requestCases)(
    'request resource $route',
    async ({ route, requestId, status, viewport, frames }) => {
      const result = await fixture.viewportRequestProof(route)
      expect(result).toMatchObject({
        pendingFrames: 0,
        staleQuiet: true,
        viewport,
      })
      expect(
        route === 'stale-frame' ? result.next : result.result
      ).toStrictEqual({ requestId, status, viewport })
      expect(result.afterReplay).toStrictEqual(result.beforeReplay)
      expect(result.frames).toHaveLength(frames)
      expect(result.states.map((state) => state.viewport)).toStrictEqual([
        { x: 0, y: 0, zoom: 1 },
        ...(route === 'animation' ? [{ x: 10, y: 15, zoom: 1 }] : []),
        viewport,
      ])
    }
  )

  it.each([1, 2, 65] as const)(
    'acknowledgement bound64 key %s',
    async (acknowledge) => {
      const result = await fixture.viewportAcknowledgementProof(acknowledge)
      expect(result.before.viewport).toStrictEqual({ x: 0, y: 0, zoom: 1 })
      expect(result.results).toHaveLength(65)
      expect(result.results.map((value) => value.status)).toStrictEqual(
        Array.from({ length: 65 }, () => 'proposed')
      )
      expect(result.viewport).toStrictEqual({ x: acknowledge, y: 0, zoom: 1 })
      expect(
        result.events
          .slice(result.before.events.length)
          .map((event) => event.name)
      ).toStrictEqual(
        acknowledge === 1
          ? [
              'viewportStart',
              'moveStart',
              'viewportChange',
              'move',
              'viewportEnd',
              'moveEnd',
            ]
          : []
      )
    }
  )
})
