import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

const it = test

const { describe } = test

const ResultSchema = Schema.Struct({
  points: Schema.Array(Schema.Struct({ x: Schema.Finite, y: Schema.Finite })),
  state: Schema.Literal('routed'),
})

export const routingPreflightAcceptance = (): void => {
  describe('libavoid-js Vite Chromium pre-flight', () => {
    it('loads the unmodified WASM and routes around a rectangle', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/routing-preflight/')
      await expect(page.locator('#result')).toContainText('"state":"routed"')

      const result = Schema.decodeUnknownSync(ResultSchema)(
        JSON.parse((await page.locator('#result').textContent()) ?? '')
      )

      expect(result.points[0]).toEqual({ x: 0, y: 100 })
      expect(result.points.at(-1)).toEqual({ x: 300, y: 100 })
      expect(result.points.length).toBeGreaterThan(2)

      for (const [index, point] of result.points.entries()) {
        const previous = result.points[index - 1]

        if (previous === undefined) {
          continue
        }

        expect(point.x === previous.x || point.y === previous.y).toBe(true)

        const crossesInterior =
          point.x === previous.x
            ? point.x > 100 &&
              point.x < 200 &&
              Math.max(point.y, previous.y) > 50 &&
              Math.min(point.y, previous.y) < 150
            : point.y > 50 &&
              point.y < 150 &&
              Math.max(point.x, previous.x) > 100 &&
              Math.min(point.x, previous.x) < 200

        expect(crossesInterior).toBe(false)
      }

      expect(errors).toEqual([])
    })
  })
}
