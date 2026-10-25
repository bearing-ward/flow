import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

test.use({ viewport: { width: 500, height: 500 } })

const position = (node: Locator) =>
  node.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)

    return { x: matrix.m41, y: matrix.m42 }
  })

// Diagnostic for UP-128-053. Preserve its original assertion in the shared
// contract; here replay Cypress's synthetic transport to locate the failure.
test('the pinned default threshold rebases on the sole Cypress mousemove', async ({
  page,
}) => {
  await page.goto('/upstream-component/53')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )
  const node = page.locator('.react-flow__node').first()
  await expect(node).toBeVisible()
  await node.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    element.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        clientX: centerX,
        clientY: centerY,
      })
    )
    element.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: bounds.x + centerX + 200,
        clientY: bounds.y + centerY + 25,
      })
    )
  })
  await page.waitForTimeout(50)
  expect(await position(node)).toEqual({ x: 0, y: 0 })

  // A second move, absent from the pinned helper, produces only the new delta.
  await node.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: bounds.x * 2 + bounds.width / 2 + 210,
        clientY: bounds.y * 2 + bounds.height / 2 + 25,
      })
    )
  })
  await expect.poll(() => position(node)).toEqual({ x: 10, y: 0 })
  await node.evaluate((element) =>
    element.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      })
    )
  )
})
