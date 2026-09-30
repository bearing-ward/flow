import { expect, test } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import { createFoldkitConformanceAdapter } from './conformance.ts'

test('Foldkit native controls and no-drag regions own nested pointer and keyboard input', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startRendererContract()
  })

  await expect(page.locator('.custom-node-view')).toHaveCount(2)

  await page.evaluate(() => {
    const view = document.querySelector('.custom-node-view')

    if (view === null) {
      throw new Error('Missing custom renderer node')
    }

    view.insertAdjacentHTML(
      'beforeend',
      `<div class="ownership-controls">
        <textarea aria-label="Native textarea">text</textarea>
        <select aria-label="Native select"><option>one</option><option>two</option></select>
        <div contenteditable="true" aria-label="Native editable">editable</div>
        <a href="#native-link">Native link</a>
        <button type="button">Native button</button>
        <div data-flow-no-drag aria-label="Current no drag region">No drag</div>
        <div data-flow-nodrag aria-label="Legacy no drag region">No drag</div>
      </div>`
    )
  })

  const node = page
    .locator('.flow-foldkit-node[data-node-id="renderer-custom"]')
    .first()

  const targets = node.locator(
    '.custom-node-input, .ownership-controls textarea, .ownership-controls select, .ownership-controls [contenteditable="true"], .ownership-controls a, .ownership-controls button, .ownership-controls [data-flow-no-drag], .ownership-controls [data-flow-nodrag]'
  )

  await expect(targets).toHaveCount(8)

  const initial = {
    style: await node.getAttribute('style'),
    selected: await node.getAttribute('data-selected'),
    transform: await page
      .locator('.flow-foldkit-canvas')
      .first()
      .getAttribute('style'),
  }

  /* eslint-disable no-await-in-loop -- Verify ownership independently for each interactive target. */
  for (let index = 0; index < (await targets.count()); index += 1) {
    const target = targets.nth(index)
    const bounds = await target.boundingBox()

    if (bounds === null) {
      throw new Error(`Missing native control geometry at index ${index}`)
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()

    const eventOwnership = await target.evaluate((element) => {
      const arrowKeyNotPrevented = element.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
        })
      )

      const spaceKeyNotPrevented = element.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: ' ',
        })
      )

      const wheelNotPrevented = element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 80,
        })
      )

      return { arrowKeyNotPrevented, spaceKeyNotPrevented, wheelNotPrevented }
    })

    expect(eventOwnership).toEqual({
      arrowKeyNotPrevented: true,
      spaceKeyNotPrevented: true,
      wheelNotPrevented: true,
    })

    await page.mouse.move(bounds.x + bounds.width / 2 + 50, bounds.y + 20)
    await page.mouse.up()

    await expect(node).toHaveAttribute('style', initial.style ?? '')
    expect(await node.getAttribute('data-selected')).toBe(initial.selected)
    expect(
      await page.locator('.flow-foldkit-canvas').first().getAttribute('style')
    ).toBe(initial.transform)
  }
  /* eslint-enable no-await-in-loop */

  await expect(page.getByRole('link', { name: 'Native link' })).toHaveAttribute(
    'href',
    '#native-link'
  )
})

test('Foldkit native controls retain Escape and wheel ownership during an active connection', async ({
  page,
}) => {
  const fixture = conformanceFixtures.find(
    ({ id }) => id === 'connection-validity'
  )

  if (fixture === undefined) {
    throw new Error('Missing Foldkit connection ownership fixture')
  }

  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount({ ...fixture, actions: [] })

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]')
  const target = page.locator('[data-node-id="approved"] [data-handle-id="in"]')
  const sourceBounds = await source.boundingBox()
  const targetBounds = await target.boundingBox()

  if (sourceBounds === null || targetBounds === null) {
    throw new Error('Missing Foldkit connection handle bounds')
  }

  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    sourceBounds.x + sourceBounds.width + 24,
    sourceBounds.y
  )
  await expect(page.locator('.flow-foldkit-connection-preview')).toBeVisible()

  const controlLabels = [
    'Native text input',
    'Native textarea',
    'Native select',
    'Native editable',
    'Native link',
    'Native button',
    'Current no drag region',
    'Legacy no drag region',
  ]

  await page.locator('[data-node-id="source"]').evaluate((node) => {
    node.insertAdjacentHTML(
      'beforeend',
      `<div class="native-controls">
        <input aria-label="Native text input" />
        <textarea aria-label="Native textarea"></textarea>
        <select aria-label="Native select"><option>one</option></select>
        <div contenteditable="true" aria-label="Native editable">editable</div>
        <a href="#native-link" aria-label="Native link">link</a>
        <button type="button" aria-label="Native button">button</button>
        <div data-flow-no-drag aria-label="Current no drag region">No drag</div>
        <div data-flow-nodrag aria-label="Legacy no drag region">No drag</div>
      </div>`
    )
  })

  const canvas = page.locator('.flow-foldkit-canvas').first()
  const initialViewportStyle = await canvas.getAttribute('style')

  /* eslint-disable no-await-in-loop -- Run each ownership probe against one active host gesture. */
  for (const label of controlLabels) {
    const control = page.getByLabel(label, { exact: true })

    const ownership = await control.evaluate((element) => {
      element.focus()

      const escapeNotPrevented = element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        })
      )

      const wheelNotPrevented = element.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 80,
          bubbles: true,
          cancelable: true,
        })
      )

      return { escapeNotPrevented, wheelNotPrevented }
    })

    expect(ownership, label).toEqual({
      escapeNotPrevented: true,
      wheelNotPrevented: true,
    })
    await expect(page.locator('.flow-foldkit-connection-preview')).toBeVisible()
    expect(await canvas.getAttribute('style')).toBe(initialViewportStyle)
  }
  /* eslint-enable no-await-in-loop */

  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2
  )
  await page.mouse.up()
  await expect.poll(() => adapter.changeKinds()).toEqual(['edge-add'])
  await expect
    .poll(() => adapter.snapshot().then(({ edgeIds }) => edgeIds))
    .toEqual(['edge-1'])
  await adapter.destroy()
})
