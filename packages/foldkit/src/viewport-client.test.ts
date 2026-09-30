import { Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import { createViewportClient } from './application.ts'

describe('Foldkit viewport client', () => {
  test('calculates validated bounds with configured limits', () => {
    const handle: Parameters<typeof createViewportClient>[0] = {
      viewportResults: { subscribe: () => () => {} },
      viewportRequests: { send: () => Exit.void },
    }

    const client = createViewportClient(
      handle,
      () => ({ width: 800, height: 600, originX: 0, originY: 0 }),
      { x: 0, y: 0, zoom: 1 },
      { minZoom: 0.25, maxZoom: 4 }
    )

    expect(
      client.getViewportForBounds(
        { x: 100, y: 50, width: 200, height: 100 },
        { top: 20, right: 40, bottom: 60, left: 80 }
      )
    ).toStrictEqual({ x: -260, y: -40, zoom: 3.4 })
    expect(
      client.getViewportForBounds({ x: 0, y: 0, width: 0, height: 10 })
    ).toBeUndefined()
    expect(() =>
      client.getViewportForBounds({ x: 0, y: 0, width: -1, height: 10 })
    ).toThrow('greater than or equal to 0')
  })
})
