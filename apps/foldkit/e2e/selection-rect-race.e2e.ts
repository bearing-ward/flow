import { expect, test } from '@playwright/test'

import { upstreamChange } from './upstream-changes.ts'

test.use({ viewport: { width: 1280, height: 720 } })

test('upstream readiness waits for fitted DOM before immediate Shift selection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const { setProperty: nativeSetProperty } = CSSStyleDeclaration.prototype
    let held: (() => void) | undefined
    let released = false

    CSSStyleDeclaration.prototype.setProperty = function setProperty(
      property,
      value,
      priority
    ) {
      if (
        !released &&
        property === 'transform' &&
        document.querySelector<HTMLElement>('.flow-foldkit-viewport')?.style ===
          this
      ) {
        held = () => nativeSetProperty.call(this, property, value, priority)
        document.documentElement.dataset.fitPatchHeld = 'true'

        return
      }

      nativeSetProperty.call(this, property, value, priority)
    }

    document.addEventListener('release-fit-patch', () => {
      released = true
      held?.()
      CSSStyleDeclaration.prototype.setProperty = nativeSetProperty
    })
  })
  await page.goto('/upstream/nodes/general')
  await expect(page.locator('html')).toHaveAttribute(
    'data-fit-patch-held',
    'true'
  )
  await page.evaluate(async () => {
    const { promise, resolve } = Promise.withResolvers<number>()
    requestAnimationFrame(() => requestAnimationFrame(resolve))
    await promise
  })
  await expect(page.locator('#app')).not.toHaveAttribute(
    'data-upstream-ready',
    'true'
  )
  await page.evaluate(() =>
    document.dispatchEvent(new Event('release-fit-patch'))
  )
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )

  const nodes = page.locator('.flow-foldkit-node')
  const box = await nodes.first().boundingBox()

  if (box === null) {
    throw new Error('Missing fitted node bounds')
  }

  await page.mouse.move(box.x - 150, box.y - 25)
  await page.keyboard.down('Shift')
  await page.mouse.down()
  await page.mouse.move(box.x + 275, box.y + 200)
  await expect(page.locator('.flow-foldkit-selection-rect')).toBeInViewport()
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await expect
    .poll(() => upstreamChange(page, 'selection-set'))
    .toEqual({
      kind: 'selection-set',
      nodeIds: ['Node-1', 'Node-2', 'Node-3'],
      edgeIds: ['1-2', '1-3'],
    })
  await expect(page.locator('.flow-foldkit-selection-box')).toBeInViewport()
})
