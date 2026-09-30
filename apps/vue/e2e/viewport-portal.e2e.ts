import { expect, test } from '@playwright/test'

test('FlowViewportPortal follows the canvas transform and stays canvas-scoped', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueViewportPortalFixture } =
      await import('../src/viewport-portal-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue viewport portal fixture mount point is missing')
    }

    const cleanup = mountVueViewportPortalFixture(root)
    root.addEventListener('flow-viewport-portal-fixture-destroy', cleanup, {
      once: true,
    })
  })

  const canvases = page.locator('.flow-vue-canvas')
  const portals = page.locator('.portal-fixture-content')
  const firstPortal = page.getByTestId('portal-first')
  const firstCanvas = canvases.nth(0)

  await expect(canvases).toHaveCount(2)
  await expect(portals).toHaveCount(2)
  await expect(page.locator('.flow-vue-viewport-portal-target')).toHaveCount(2)
  await expect(firstPortal.locator('xpath=..')).toHaveClass(
    /flow-vue-viewport-portal/u
  )
  await expect(firstPortal.locator('xpath=..')).toHaveClass(/portal-no-pan/u)
  await expect(firstPortal.locator('xpath=..')).toHaveClass(/portal-no-drag/u)
  await expect(firstPortal.locator('xpath=..')).toHaveClass(/portal-no-wheel/u)
  await expect(
    page.getByTestId('portal-second').locator('xpath=..')
  ).toHaveClass(/flow-vue-viewport-portal/u)
  await expect(
    page.getByTestId('portal-second').locator('xpath=..')
  ).toHaveClass(/flow-vue-no-pan/u)

  const portalOwners = await page.evaluate(() => {
    const canvasElements = [...document.querySelectorAll('.flow-vue-canvas')]

    const targets = [
      ...document.querySelectorAll('.flow-vue-viewport-portal-target'),
    ]

    const first = document.querySelector('[data-testid="portal-first"]')
    const second = document.querySelector('[data-testid="portal-second"]')

    return {
      distinctTargets: targets.length === 2 && targets[0] !== targets[1],
      owners: [first, second].map((portal) => {
        const owner = portal?.closest('.flow-vue-canvas')

        return owner === null || owner === undefined
          ? -1
          : canvasElements.indexOf(owner)
      }),
      targetOwners: targets.map((target) => {
        const owner = target.closest('.flow-vue-canvas')

        return owner === null ? -1 : canvasElements.indexOf(owner)
      }),
    }
  })

  expect(portalOwners).toEqual({
    distinctTargets: true,
    owners: [0, 1],
    targetOwners: [0, 1],
  })

  const initialCanvasBox = await firstCanvas.boundingBox()
  const initialPortalBox = await firstPortal.boundingBox()

  expect(initialCanvasBox).not.toBeNull()
  expect(initialPortalBox).not.toBeNull()

  if (initialCanvasBox === null || initialPortalBox === null) {
    throw new Error('Canvas or initial portal bounds are unavailable')
  }

  expect(initialPortalBox.x - initialCanvasBox.x).toBeCloseTo(101, 0)
  expect(initialPortalBox.y - initialCanvasBox.y).toBeCloseTo(81, 0)

  const clippedTarget = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('.flow-vue-canvas')

    const portal = document.querySelector<HTMLElement>(
      '[data-testid="portal-overflow-first"]'
    )

    if (canvas === null || portal === null) {
      throw new Error('Canvas or portal content is missing')
    }

    const canvasBounds = canvas.getBoundingClientRect()
    const portalBounds = portal.getBoundingClientRect()
    const probeY = portalBounds.top + 27

    const outsidePoint = document.elementFromPoint(
      canvasBounds.right + 2,
      probeY
    )

    return {
      overflowsCanvas: portalBounds.right > canvasBounds.right,
      outsidePointIsPortal:
        outsidePoint !== null && portal.contains(outsidePoint),
      ownerMatches: portal.closest('.flow-vue-canvas') === canvas,
      overflowStyle: getComputedStyle(canvas).overflow,
    }
  })

  expect(clippedTarget).toEqual({
    overflowsCanvas: true,
    outsidePointIsPortal: false,
    ownerMatches: true,
    overflowStyle: 'hidden',
  })

  const portalButton = page.getByRole('button', { name: 'Portal action first' })
  await portalButton.click()
  await portalButton.focus()
  await portalButton.press('Enter')
  await firstPortal.dispatchEvent('wheel', {
    deltaY: 120,
    bubbles: true,
    cancelable: true,
  })
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-click',
    '2'
  )
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-keydown',
    '1'
  )
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-wheel',
    '1'
  )
  await expect(page.getByTestId('events-first')).toHaveAttribute('data-x', '0')
  await expect(page.getByTestId('events-first')).toHaveAttribute('data-y', '0')
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-zoom',
    '1'
  )

  const beforeGesturePortalBox = await firstPortal.boundingBox()
  expect(beforeGesturePortalBox).not.toBeNull()

  if (beforeGesturePortalBox === null) {
    throw new Error('Portal bounds are unavailable before gesture')
  }

  await page.mouse.move(
    beforeGesturePortalBox.x + 10,
    beforeGesturePortalBox.y + 10
  )
  await page.mouse.down()
  await page.mouse.move(
    beforeGesturePortalBox.x + 90,
    beforeGesturePortalBox.y + 70
  )
  await page.mouse.up()
  const afterGesturePortalBox = await firstPortal.boundingBox()
  expect(afterGesturePortalBox).not.toBeNull()

  if (afterGesturePortalBox === null) {
    throw new Error('Portal bounds are unavailable after gesture')
  }

  expect(afterGesturePortalBox.x).toBeCloseTo(beforeGesturePortalBox.x, 0)
  expect(afterGesturePortalBox.y).toBeCloseTo(beforeGesturePortalBox.y, 0)
  await expect(page.getByTestId('events-first')).toHaveAttribute('data-x', '0')
  await expect(page.getByTestId('events-first')).toHaveAttribute('data-y', '0')

  await page.getByTestId('toggle-first').dispatchEvent('click')
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-mounted',
    'false'
  )
  await expect(firstPortal).toHaveCount(0)
  await expect(page.getByTestId('portal-second')).toHaveCount(1)
  await page.getByTestId('toggle-first').dispatchEvent('click')
  await expect(firstPortal).toHaveCount(1)
  await expect(firstPortal.locator('xpath=..')).toHaveClass(
    /flow-vue-viewport-portal/u
  )

  await page.getByTestId('viewport-first').dispatchEvent('click')
  await expect(page.getByTestId('events-first')).toHaveAttribute('data-x', '40')
  await expect(page.getByTestId('events-first')).toHaveAttribute(
    'data-zoom',
    '2'
  )
  await expect
    .poll(async () => {
      const canvasBox = await firstCanvas.boundingBox()
      const portalBox = await firstPortal.boundingBox()

      if (canvasBox === null || portalBox === null) {
        return null
      }

      return {
        x: portalBox.x - canvasBox.x,
        y: portalBox.y - canvasBox.y,
        width: portalBox.width,
        height: portalBox.height,
      }
    })
    .toEqual({ x: 241, y: 211, width: 80, height: 60 })
  await expect(page.getByTestId('portal-second')).toHaveAttribute(
    'style',
    /left: 100px/u
  )

  await page.locator('#app').evaluate((root) => {
    root.dispatchEvent(new Event('flow-viewport-portal-fixture-destroy'))
  })
  await expect(canvases).toHaveCount(0)
  await expect(portals).toHaveCount(0)
})
