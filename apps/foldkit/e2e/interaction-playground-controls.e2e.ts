import { expect, test } from '@playwright/test'

test('Foldkit desktop interaction demos are keyboard accessible and expose their graph behavior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const connectionMode = page.getByRole('button', { name: 'Connection events' })
  await connectionMode.focus()
  await page.keyboard.press('Enter')
  await expect(connectionMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-demo-status]')).toContainText('Drag Source')

  const sourceHandle = page.locator(
    '[data-node-id="source"] [data-handle-id="out"]'
  )

  const targetHandle = page.locator(
    '[data-node-id="target"] [data-handle-id="in"]'
  )

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Missing Foldkit connection handles')
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 5 }
  )
  await page.mouse.up()
  await expect(page.locator('[data-demo-status]')).toContainText(
    'Connection event: edge-add'
  )

  const resizeMode = page.getByRole('button', { name: 'Resize', exact: true })
  await resizeMode.focus()
  await page.keyboard.press('Space')
  await expect(resizeMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-resize-direction]')).toHaveCount(8)
  await expect(
    page.getByRole('button', { name: 'Resize Validate from top left' })
  ).toBeVisible()

  const dragMode = page.getByRole('button', { name: 'Drag handle' })
  await dragMode.focus()
  await page.keyboard.press('Enter')

  const dragHandle = page.getByRole('button', { name: 'Drag Validate node' })
  await expect(dragHandle).toBeVisible()

  const validateNode = page.locator('[data-node-id="validate"]')

  const positionBefore = await validateNode.evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError('Missing Validate node element')
    }

    return node.style.left
  })

  await dragHandle.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() =>
      validateNode.evaluate((node) => {
        if (!(node instanceof HTMLElement)) {
          throw new TypeError('Missing Validate node element')
        }

        return node.style.left
      })
    )
    .not.toBe(positionBefore)
})

test('Foldkit narrow interaction controls remain keyboard operable in touch-ready mode', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const controls = page.getByRole('group', { name: 'Interaction demo modes' })
  await expect(controls).toBeVisible()
  const touchMode = page.getByRole('button', { name: 'Touch ready' })
  await touchMode.focus()
  await page.keyboard.press('Space')
  await expect(touchMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#app')).toHaveClass(/flow-touch-ready/u)
  await expect(page.locator('[data-demo-status]')).toContainText(
    'Touch input is enabled'
  )

  await touchMode.focus()
  await page.keyboard.press('Enter')
  await expect(touchMode).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#app')).not.toHaveClass(/flow-touch-ready/u)
})

test('Foldkit touch-ready scene offers larger targets and completes a touch pointer drag', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Touch ready' }).click()

  const sourceHandle = page.locator(
    '[data-node-id="source"] [data-handle-id="out"]'
  )

  await expect(sourceHandle).toHaveCSS('width', '28px')
  await expect(sourceHandle).toHaveCSS('height', '28px')

  const node = page.locator('[data-node-id="validate"]')

  const positionBefore = await node.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Missing touch drag node')
    }

    return element.style.left
  })

  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing touch drag target bounds')
  }

  await page.evaluate(
    ({ pointerId, start, end }) => {
      const target = document.querySelector('[data-node-id="validate"]')

      if (!(target instanceof HTMLElement)) {
        throw new TypeError('Missing live touch drag node')
      }

      const originalCapture = HTMLElement.prototype.setPointerCapture
      const originalHasCapture = HTMLElement.prototype.hasPointerCapture
      // Synthetic touch pointers cannot hold real capture, so emulate it for
      // the admission check that verifies capture after acquiring it.
      HTMLElement.prototype.setPointerCapture = (id) => {
        if (id !== pointerId) {
          throw new Error('Unexpected synthetic pointer capture id')
        }
      }

      HTMLElement.prototype.hasPointerCapture = (id) => id === pointerId

      const touch = (type: string, point: { x: number; y: number }) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId,
          pointerType: 'touch',
          isPrimary: true,
          clientX: point.x,
          clientY: point.y,
        })

      try {
        target.dispatchEvent(touch('pointerdown', start))
        // Move past the default one-pixel node drag threshold before release.
        document.dispatchEvent(touch('pointermove', end))
        document.dispatchEvent(touch('pointerup', end))
      } finally {
        HTMLElement.prototype.setPointerCapture = originalCapture
        HTMLElement.prototype.hasPointerCapture = originalHasCapture
      }
    },
    {
      pointerId: 71,
      start: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      end: { x: box.x + box.width / 2 + 16, y: box.y + box.height / 2 },
    }
  )

  await expect
    .poll(() =>
      node.evaluate((element) => {
        if (!(element instanceof HTMLElement)) {
          throw new TypeError('Missing touch drag node')
        }

        return element.style.left
      })
    )
    .not.toBe(positionBefore)
})
