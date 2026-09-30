import { expect, test } from '@playwright/test'

test('Button Handle activates its app action without dragging or changing connection targeting', async ({
  page,
}) => {
  await page.goto('/ui-recipes/button-handle/')
  const button = page.getByRole('button', { name: 'Run action' })
  const node = page.locator('.flow-foldkit-node[data-node-id="button-node"]')
  const initial = await node.getAttribute('style')
  await button.focus()
  await expect(button).toBeFocused()
  await button.press('Enter')
  await expect(button).toBeFocused()
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '1')
  await button.press('Space')
  await expect(button).toBeFocused()
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '2')
  const box = await button.boundingBox()
  expect(box).not.toBeNull()

  if (box === null) {
    throw new Error('Button Handle is not visible')
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '3')
  await expect(node).toHaveAttribute('style', initial ?? '')
  const buttonBox = await button.boundingBox()

  if (buttonBox === null) {
    throw new Error('Button Handle is not visible for pointer drag')
  }

  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2,
    buttonBox.y + buttonBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    buttonBox.x + buttonBox.width / 2 + 70,
    buttonBox.y + buttonBox.height / 2 + 35,
    { steps: 5 }
  )
  await page.mouse.up()

  await expect(node).toHaveAttribute('style', initial ?? '')
  await expect(page.locator('#app')).toHaveAttribute('data-action-count', '3')
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(0)
  await page.reload()

  const source = page.locator(
    '[data-node-id="source-node"] [data-handle-id="out"]'
  )

  const target = page.locator(
    '[data-node-id="button-node"] [data-handle-id="in"]'
  )

  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Connection handles are not visible after reload')
  }

  const hitTargets = await page.evaluate(
    ({ sourcePoint, targetPoint }) => {
      const sourceHit = document.elementFromPoint(sourcePoint.x, sourcePoint.y)
      const targetHit = document.elementFromPoint(targetPoint.x, targetPoint.y)

      return {
        source:
          sourceHit instanceof HTMLElement ? sourceHit.dataset.handleId : null,
        target:
          targetHit instanceof HTMLElement ? targetHit.dataset.handleId : null,
      }
    },
    {
      sourcePoint: {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2,
      },
      targetPoint: {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2,
      },
    }
  )

  expect(hitTargets.source).toBe('out')
  expect(hitTargets.target).toBe('in')

  const edgePaths = page.locator('.flow-foldkit-edge')
  const initialCount = await edgePaths.count()
  await source.focus()
  await page.keyboard.press('Enter')
  await target.focus()
  await page.keyboard.press('Space')
  await expect(edgePaths).toHaveCount(initialCount + 1)
})
