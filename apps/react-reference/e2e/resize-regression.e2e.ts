import { expect, test } from '@playwright/test'
import { Schema as S } from 'effect'

const ResizeEvents = S.Array(
  S.Struct({
    name: S.Literals(['start', 'resize', 'end']),
    params: S.Struct({
      x: S.Number,
      y: S.Number,
      width: S.Number,
      height: S.Number,
      direction: S.optional(S.Tuple([S.Number, S.Number])),
    }),
  })
)

for (const scenario of ['no movement', 'veto only', 'accepted then vetoed']) {
  test(`12.12.0 resize ends with the last accepted bounds: ${scenario}`, async ({
    page,
  }) => {
    await page.goto('/resize-regression')

    const resizeControl = page.locator('.react-flow__resize-control.line.left')

    const box = await resizeControl.boundingBox()

    if (box === null) {
      throw new Error('Missing resize control')
    }

    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()

    if (scenario === 'accepted then vetoed') {
      await page.mouse.move(x - 20, y)
    }

    if (scenario !== 'no movement') {
      await page.mouse.move(x - 60, y)
    }

    await page.mouse.up()
    const start = { x: 100, y: 100, width: 150, height: 80 }
    const accepted = scenario === 'accepted then vetoed'
    const params = accepted ? { x: 80, y: 100, width: 170, height: 80 } : start
    await expect
      .poll(async () =>
        S.decodeUnknownSync(ResizeEvents)(
          JSON.parse(
            (await page.getByTestId('resize-events').textContent()) ?? 'null'
          )
        )
      )
      .toEqual([
        { name: 'start', params: start },
        ...(accepted
          ? [{ name: 'resize', params: { ...params, direction: [-1, 0] } }]
          : []),
        { name: 'end', params },
      ])
    await expect(page.locator('.react-flow__node')).toHaveCSS(
      'width',
      `${params.width}px`
    )
  })
}
