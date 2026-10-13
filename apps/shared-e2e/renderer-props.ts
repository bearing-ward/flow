import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/**
 * Screen distance between an HTML edge label's center and the flow point it
 * declares in `data-label-x`/`data-label-y`, mapped through the SVG edge
 * path's screen matrix. Zero means the HTML layer and the edge layer agree.
 */
export const readEdgeLabelOffset = (
  page: Page,
  pathSelector: string,
  labelSelector: string
) =>
  page.evaluate(
    ([pathTarget, labelTarget]) => {
      const path = document.querySelector(pathTarget)
      const label = document.querySelector<HTMLElement>(labelTarget)

      if (!(path instanceof SVGGraphicsElement) || label === null) {
        throw new Error('Missing probe edge path or HTML label')
      }

      const matrix = path.getScreenCTM()

      if (matrix === null) {
        throw new Error('Probe edge path has no screen matrix')
      }

      const expected = new DOMPoint(
        Number(label.dataset.labelX),
        Number(label.dataset.labelY)
      ).matrixTransform(matrix)

      const box = label.getBoundingClientRect()

      return {
        dx: box.x + box.width / 2 - expected.x,
        dy: box.y + box.height / 2 - expected.y,
        width: box.width,
      }
    },
    [pathSelector, labelSelector] as const
  )

/** Assert the HTML label sits on its flow point and scales with zoom. */
export const expectEdgeLabelOnFlowPoint = async (
  page: Page,
  pathSelector: string,
  labelSelector: string
) => {
  await expect
    .poll(async () => {
      const { dx, dy } = await readEdgeLabelOffset(
        page,
        pathSelector,
        labelSelector
      )

      return Math.round(Math.hypot(dx, dy))
    })
    .toBeLessThanOrEqual(1)

  return readEdgeLabelOffset(page, pathSelector, labelSelector)
}

/**
 * Check the label on its flow point, apply a zoom change, wait for the label
 * to scale by `scale`, and check it is still on its flow point.
 */
export const expectEdgeLabelFollowsZoom = async (
  page: Page,
  selectors: { readonly path: string; readonly label: string },
  applyZoom: () => Promise<void>,
  scale: number
) => {
  const before = await expectEdgeLabelOnFlowPoint(
    page,
    selectors.path,
    selectors.label
  )

  await applyZoom()
  await expect
    .poll(async () => {
      const { width } = await readEdgeLabelOffset(
        page,
        selectors.path,
        selectors.label
      )

      return width / before.width
    })
    .toBeCloseTo(scale, 1)
  await expectEdgeLabelOnFlowPoint(page, selectors.path, selectors.label)
}

/** Center of a locator's box in client coordinates. */
export const centerOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Expected a visible element')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Drag a node by its center, checking the custom renderer reports
 * `dragging` during the gesture and not after it.
 */
export const expectDraggingDuringDrag = async (
  page: Page,
  grip: Locator,
  probe: Locator,
  delta: { readonly x: number; readonly y: number }
) => {
  const start = await centerOf(grip)

  await expect(probe).toHaveAttribute('data-dragging', 'false')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  // Thresholds are strict; cross them by 2px before expecting a drag.
  await page.mouse.move(start.x + 3, start.y + 3)
  await page.mouse.move(start.x + delta.x / 2, start.y + delta.y / 2, {
    steps: 4,
  })
  await expect(probe).toHaveAttribute('data-dragging', 'true')
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 4 })
  await page.mouse.up()
  await expect(probe).toHaveAttribute('data-dragging', 'false')
}
