import { expect, test } from '@playwright/test'

test('Drag Handle moves only from its marker and keeps button keyboard behavior', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Drag handle' }).click()

  const node = page.locator('.flow-foldkit-node[data-node-id="validate"]')
  const handle = node.locator('[data-flow-drag-handle]')

  const keyboardControl = handle.getByRole('button', {
    name: 'Drag Validate node',
  })

  const details = node.locator('[data-demo-details]')

  await expect(handle).toHaveAttribute('data-flow-drag-handle', '')
  await expect(keyboardControl).toHaveAttribute('data-flow-no-drag', '')
  const initial = await node.boundingBox()

  if (initial === null) {
    throw new Error('Validate node is not rendered')
  }

  const initialStyle = await node.evaluate((element) => ({
    left: getComputedStyle(element).left,
    top: getComputedStyle(element).top,
  }))

  const content = node.locator('p')
  const contentBounds = await content.boundingBox()

  if (contentBounds === null) {
    throw new Error('Validate node content is not rendered')
  }

  await page.mouse.move(
    contentBounds.x + contentBounds.width / 2,
    contentBounds.y + contentBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    contentBounds.x + contentBounds.width / 2 + 70,
    contentBounds.y + contentBounds.height / 2 + 45,
    { steps: 6 }
  )
  await page.mouse.up()
  await expect(node).toHaveCSS('left', initialStyle.left)
  await expect(node).toHaveCSS('top', initialStyle.top)

  const observeClick = async (locator: typeof details): Promise<void> => {
    await locator.evaluate((element) => {
      element.addEventListener(
        'click',
        () => {
          element.dataset.clickObserved = 'true'
        },
        { once: true }
      )
    })
  }

  await details.focus()
  await expect(details).toBeFocused()
  await observeClick(details)
  const detailsBounds = await details.boundingBox()

  if (detailsBounds === null) {
    throw new Error('Details control is not rendered')
  }

  await page.mouse.move(
    detailsBounds.x + detailsBounds.width / 2,
    detailsBounds.y + detailsBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    detailsBounds.x + detailsBounds.width / 2 + 60,
    detailsBounds.y + detailsBounds.height / 2 + 36,
    { steps: 6 }
  )
  await page.mouse.up()
  await expect(node).toHaveCSS('left', initialStyle.left)
  await expect(node).toHaveCSS('top', initialStyle.top)

  await details.click()
  await expect(details).toHaveAttribute('data-click-observed', 'true')

  await keyboardControl.focus()
  await expect(keyboardControl).toBeFocused()
  await observeClick(keyboardControl)
  const keyboardBounds = await keyboardControl.boundingBox()

  if (keyboardBounds === null) {
    throw new Error('Keyboard control is not rendered')
  }

  await page.mouse.move(
    keyboardBounds.x + keyboardBounds.width / 2,
    keyboardBounds.y + keyboardBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    keyboardBounds.x + keyboardBounds.width / 2 + 60,
    keyboardBounds.y + keyboardBounds.height / 2 + 36,
    { steps: 6 }
  )
  await page.mouse.up()
  await expect(node).toHaveCSS('left', initialStyle.left)
  await expect(node).toHaveCSS('top', initialStyle.top)

  await keyboardControl.click()
  await expect(keyboardControl).toHaveAttribute('data-click-observed', 'true')

  const handleBounds = await handle.boundingBox()

  if (handleBounds === null) {
    throw new Error('Drag handle is not rendered')
  }

  await page.mouse.move(
    handleBounds.x + 2,
    handleBounds.y + handleBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    handleBounds.x + 66,
    handleBounds.y + handleBounds.height / 2 + 32,
    { steps: 8 }
  )
  await page.mouse.up()

  await expect
    .poll(async () => {
      const bounds = await node.boundingBox()

      return bounds?.x
    })
    .toBeGreaterThan(initial.x + 40)
  await expect
    .poll(async () => {
      const bounds = await node.boundingBox()

      return bounds?.y
    })
    .toBeGreaterThan(initial.y + 15)

  const afterPointer = await node.boundingBox()

  if (afterPointer === null) {
    throw new Error('Validate node disappeared after pointer drag')
  }

  await keyboardControl.focus()
  await expect(keyboardControl).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => {
      const bounds = await node.boundingBox()

      return bounds?.x
    })
    .toBeGreaterThan(afterPointer.x + 10)

  await page.reload()
  const resetNode = page.locator('.flow-foldkit-node[data-node-id="validate"]')
  await expect(resetNode).toHaveCSS('left', initialStyle.left)
  await expect(resetNode).toHaveCSS('top', initialStyle.top)
})
