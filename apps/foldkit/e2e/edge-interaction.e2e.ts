import { expect, test } from '@playwright/test'

test('edge hit paths honor configured width and the upstream default', async ({
  page,
}) => {
  await page.goto('/upstream/edges/general')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )

  const edge = page.locator(
    '.flow-foldkit-edge[data-edge-id="interaction-width"]'
  )

  const hit = edge.locator('.flow-foldkit-edge-hit-target')

  await expect(hit).toHaveCSS('stroke-width', '42px')
  await expect(
    page.locator(
      '.flow-foldkit-edge[data-edge-id="edge-with-class"] .flow-foldkit-edge-hit-target'
    )
  ).toHaveCSS('stroke-width', '20px')

  const point = await hit.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) {
      throw new TypeError('Expected an SVG path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Path has no screen transform')
    }

    const middle = element.getPointAtLength(element.getTotalLength() / 2)
    const screen = new DOMPoint(middle.x + 15, middle.y).matrixTransform(matrix)

    return { x: screen.x, y: screen.y }
  })

  await page.mouse.click(point.x, point.y)
  await expect(edge).toHaveClass(/selected/u)
})
