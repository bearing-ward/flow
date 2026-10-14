import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The recipe starts at this viewport; the drop must go through it. */
const viewport = { x: 30, y: 20, zoom: 0.8 }

const open = async (page: Page) => {
  await page.goto('/ui-recipes/drag-and-drop/')
  await expect(page.locator('[data-node-id="1"]')).toBeVisible()
}

const boxOf = async (page: Page, selector: string): Promise<Box> => {
  const box = await page.locator(selector).first().boundingBox()

  if (box === null) {
    throw new Error(`${selector} is not rendered`)
  }

  return box
}

for (const [kind, label, drop] of [
  ['default', 'default node', { x: 520, y: 320 }],
  ['output', 'output node', { x: 260, y: 420 }],
] as const) {
  test(`a native HTML5 drag of the ${kind} sidebar item creates a node centered at the drop point`, async ({
    page,
  }) => {
    await open(page)

    const pane = await boxOf(page, '.flow-foldkit-canvas')

    // Playwright's dragTo drives Chromium's native drag: dragstart sets
    // dataTransfer, dragover must be accepted, then drop fires on the pane.
    await page
      .getByTestId(`dnd-${kind}`)
      .dragTo(page.locator('.flow-foldkit-canvas'), { targetPosition: drop })

    const created = page.locator('[data-node-id="dndnode_0"]')

    await expect(created).toHaveText(label)

    const flow = {
      x: Math.round((drop.x - viewport.x) / viewport.zoom),
      y: Math.round((drop.y - viewport.y) / viewport.zoom),
    }

    await expect(page.getByTestId('recipe-status')).toContainText(
      `dndnode_0:${label}@${flow.x},${flow.y}`
    )

    // nodeOrigin [0.5, 0.5]: the node is centered on the drop point.
    const box = await boxOf(page, '[data-node-id="dndnode_0"]')

    expect(Math.abs(box.x + box.width / 2 - (pane.x + drop.x))).toBeLessThan(2)
    expect(Math.abs(box.y + box.height / 2 - (pane.y + drop.y))).toBeLessThan(2)
  })
}

test('a drop without the sidebar drag format creates no node', async ({
  page,
}) => {
  await open(page)

  const accepted = await page.evaluate(() => {
    const canvas = document.querySelector('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Missing canvas')
    }

    const bounds = canvas.getBoundingClientRect()
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'not a node')

    const init = {
      bubbles: true,
      cancelable: true,
      clientX: bounds.left + 300,
      clientY: bounds.top + 300,
      dataTransfer,
    }

    const over = new DragEvent('dragover', init)
    canvas.dispatchEvent(over)
    canvas.dispatchEvent(new DragEvent('drop', init))

    return over.defaultPrevented
  })

  // The pane accepts the drag, but only the sidebar format makes a node:
  // the next real drop is still the first created node.
  expect(accepted).toBe(true)
  await page
    .getByTestId('dnd-input')
    .dragTo(page.locator('.flow-foldkit-canvas'), {
      targetPosition: { x: 600, y: 300 },
    })
  await expect(page.locator('[data-node-id="dndnode_0"]')).toHaveText(
    'input node'
  )
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
})
