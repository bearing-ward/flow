import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { mountModelStyling } from './model-styling-shared.ts'

const viewport = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitModelStyling?.viewport())

const drag = async (page: Page, button: 'left' | 'middle' | 'right') => {
  const box = await page.getByTestId('flow-canvas').boundingBox()

  if (box === null) {
    throw new Error('Missing pane')
  }

  const start = { x: box.x + 20, y: box.y + 20 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down({ button })
  await page.mouse.move(start.x + 60, start.y + 30, { steps: 4 })
  await page.mouse.up({ button })
  await page.evaluate(() => window.__flowFoldkitModelStyling?.edit([]))
}

for (const panOnDrag of [false, true, [1], [1, 2]]) {
  test(`Foldkit pan activation adds to panOnDrag ${JSON.stringify(panOnDrag)}`, async ({
    page,
  }) => {
    await mountModelStyling(page, {
      document: {
        nodes: [{ id: 'a', label: 'A', position: { x: 200, y: 200 } }],
        edges: [],
      },
      options: {
        panOnDrag,
        selectionOnDrag: false,
        panActivationKeyCode: 'Control',
      },
    })
    // Pinned FlowRenderer/index.tsx:81 combines the key and configured button policy.
    await drag(page, 'left')
    const plainX = panOnDrag === true ? 60 : 0
    const plainY = panOnDrag === true ? 30 : 0
    await expect
      .poll(() => viewport(page))
      .toEqual({ x: plainX, y: plainY, zoom: 1 })
    await page.keyboard.down('Control')
    await drag(page, 'left')
    await page.keyboard.up('Control')
    await expect
      .poll(() => viewport(page))
      .toEqual({ x: plainX + 60, y: plainY + 30, zoom: 1 })
  })
}

for (const button of ['middle', 'right'] satisfies ('middle' | 'right')[]) {
  test(`Foldkit button arrays admit ${button} pane drags`, async ({ page }) => {
    await mountModelStyling(page, {
      document: {
        nodes: [{ id: 'a', label: 'A', position: { x: 200, y: 200 } }],
        edges: [],
      },
      options: { panOnDrag: [1, 2], selectionOnDrag: true },
    })
    await drag(page, button)
    await expect.poll(() => viewport(page)).toEqual({ x: 60, y: 30, zoom: 1 })
  })
}
