import { expect, test } from '@playwright/test'

export const interactionPolicyContract = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/upstream-examples/interaction')
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
  })

  test('disabled nodes pass native drags through to the pane', async ({
    page,
  }) => {
    const node = page.locator(`.${prefix}-node`).first()
    const viewport = page.locator(`.${prefix}-viewport`).first()
    await expect(node).toHaveCSS('pointer-events', 'none')
    const bounds = await node.boundingBox()

    if (bounds === null) {
      throw new Error('Missing disabled node geometry')
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 45,
      bounds.y + bounds.height / 2 + 30
    )
    await page.mouse.up()
    await expect(viewport).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 45, 30)')
  })

  test('callback presence changes hit testing and disabled Shift selection never pans', async ({
    page,
  }) => {
    const node = page.locator(`.${prefix}-node`).first()

    const edge = page
      .locator(host === 'vanilla' ? '.flow-edge-group' : `.${prefix}-edge`)
      .first()

    const viewport = page.locator(`.${prefix}-viewport`).first()

    const capture = page.locator(
      '[data-upstream-control="captureelementclick"]'
    )

    await expect(node).toHaveCSS('pointer-events', 'none')
    await expect(edge).toHaveCSS('pointer-events', 'none')
    await capture.click()
    await expect(node).toHaveCSS('pointer-events', 'all')
    await expect(edge).toHaveCSS('pointer-events', 'visiblestroke')
    await node.click()
    await expect(page.locator('#app')).toHaveAttribute('data-clicks', '1')

    const edgePoint = await page
      .locator(`.${prefix}-edge-path`)
      .last()
      .evaluate((element) => {
        if (!(element instanceof SVGPathElement)) {
          throw new TypeError('Missing native edge path')
        }

        const transform = element.getScreenCTM()

        if (transform === null) {
          throw new Error('Missing edge screen transform')
        }

        const point = element
          .getPointAtLength(element.getTotalLength() / 2)
          .matrixTransform(transform)

        return { x: point.x, y: point.y }
      })

    await page.mouse.click(edgePoint.x, edgePoint.y)
    await expect(page.locator('#app')).toHaveAttribute('data-clicks', '2')

    // Pinned packages/react/src/container/FlowRenderer/index.tsx:99 disables pane pan,
    // independently of packages/react/src/container/Pane/index.tsx:94 selection admission.
    await page.keyboard.down('Shift')
    await expect(page.locator(`.${prefix}-canvas`)).toHaveClass(/selection/u)
    await page.mouse.move(1000, 50)
    await page.mouse.down()
    await page.mouse.move(1, 400)
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await expect(viewport).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
    await expect(page.locator(`.${prefix}-selection-rect`)).toHaveCount(0)

    await capture.click()
    await expect(node).toHaveCSS('pointer-events', 'none')
    await expect(edge).toHaveCSS('pointer-events', 'none')
  })
}
