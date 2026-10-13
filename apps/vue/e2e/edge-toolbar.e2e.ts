import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a rendered element')
  }

  return box
}

test('Vue FlowEdgeToolbar anchors fixed-size content to a flow point and follows edge state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueEdgeToolbarFixture } =
      await import('../src/edge-toolbar-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue edge toolbar fixture mount point is missing')
    }

    mountVueEdgeToolbarFixture(root)
  })

  // Toolbars are positioned inside the canvas's screen-space toolbar layer.
  const layer = page.locator('.flow-vue-node-toolbar-layer').first()
  const selected = page.getByTestId('edge-toolbar-default')
  const forced = page.getByTestId('edge-toolbar-forced')
  const isolated = page.getByTestId('edge-toolbar-isolated')

  await expect(page.locator('.flow-vue-canvas')).toHaveCount(2)
  await expect(selected).toBeVisible()
  await expect(forced).toBeVisible()
  await expect(isolated).toBeVisible()

  expect(
    await page.evaluate(() => {
      const canvases = [...document.querySelectorAll('.flow-vue-canvas')]

      return [...document.querySelectorAll('.flow-vue-edge-toolbar')].map(
        (element) => {
          const owner = element.closest('.flow-vue-canvas')

          return owner === null ? -1 : canvases.indexOf(owner)
        }
      )
    })
  ).toEqual([0, 0, 1])

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.setViewport({ x: 0, y: 0, zoom: 1 })
  )

  const origin = await boxOf(layer)
  const initialSelected = await boxOf(selected)
  const initialForced = await boxOf(forced)

  // Centered alignment puts the toolbar's center on the flow point.
  expect(initialSelected.x + initialSelected.width / 2 - origin.x).toBeCloseTo(
    300,
    0
  )
  expect(initialSelected.y + initialSelected.height / 2 - origin.y).toBeCloseTo(
    180,
    0
  )
  // Right/bottom alignment puts the toolbar's bottom-right corner on the point.
  expect(initialForced.x + initialForced.width - origin.x).toBeCloseTo(200, 0)
  expect(initialForced.y + initialForced.height - origin.y).toBeCloseTo(260, 0)

  await expect(forced).toHaveCSS('z-index', '5')
  await expect(selected).toHaveCSS('z-index', '1')

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.setViewport({ x: 40, y: 20, zoom: 2 })
  )
  await expect
    .poll(async () => {
      const box = await boxOf(selected)

      return Math.round(box.x + box.width / 2 - origin.x)
    })
    .toBe(640)

  const zoomedSelected = await boxOf(selected)
  expect(
    Math.round(zoomedSelected.y + zoomedSelected.height / 2 - origin.y)
  ).toBe(380)
  // The toolbar keeps its screen size while the viewport zooms.
  expect(zoomedSelected.width).toBeCloseTo(initialSelected.width, 0)
  expect(zoomedSelected.height).toBeCloseTo(initialSelected.height, 0)

  const zoomedForced = await boxOf(forced)
  expect(Math.round(zoomedForced.x + zoomedForced.width - origin.x)).toBe(440)
  expect(Math.round(zoomedForced.y + zoomedForced.height - origin.y)).toBe(540)

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.setViewport({ x: 10, y: 30, zoom: 0.5 })
  )
  await expect
    .poll(async () => {
      const box = await boxOf(selected)

      return [
        Math.round(box.x + box.width / 2 - origin.x),
        Math.round(box.y + box.height / 2 - origin.y),
      ]
    })
    .toEqual([160, 120])

  const shrunkSelected = await boxOf(selected)
  expect(shrunkSelected.width).toBeCloseTo(initialSelected.width, 0)
  expect(shrunkSelected.height).toBeCloseTo(initialSelected.height, 0)

  await page.getByTestId('edge-toolbar-action').click()
  expect(await page.evaluate(() => window.__flowVueEdgeToolbar?.clicks())).toBe(
    1
  )

  await page.evaluate(() => window.__flowVueEdgeToolbar?.selectEdges([]))
  await expect(selected).toHaveCount(0)
  await expect(forced).toBeVisible()

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.selectEdges(['selected-edge'])
  )
  await expect(selected).toBeVisible()

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.updateEdge('forced-edge', { hidden: true })
  )
  await expect(forced).toHaveCount(0)

  await page.evaluate(() =>
    window.__flowVueEdgeToolbar?.removeEdge('selected-edge')
  )
  await expect(selected).toHaveCount(0)
  await expect(isolated).toBeVisible()
})
