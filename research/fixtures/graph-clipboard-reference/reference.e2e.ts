import { expect, test } from '@playwright/test'

const it = test

const { describe } = test

describe('public graph clipboard reference', () => {
  it('selects multiple nodes with Shift and copies their internal edges', async ({
    page,
  }) => {
    await page.goto(
      'https://example-apps.xyflow.com/react/pro/copy-paste/index.html'
    )
    const nodes = page.locator('.react-flow__node')
    const edges = page.locator('.react-flow__edge')
    await expect(nodes.first()).toBeVisible()
    const initialNodes = await nodes.count()
    const initialEdges = await edges.count()
    expect(initialNodes).toBeGreaterThan(1)
    expect(initialEdges).toBeGreaterThan(0)

    const bounds = await nodes.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()

        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom }
      })
    )

    await page.keyboard.down('Shift')
    await page.mouse.move(
      Math.min(...bounds.map(({ x }) => x)) - 20,
      Math.min(...bounds.map(({ y }) => y)) - 20
    )
    await page.mouse.down()
    await page.mouse.move(
      Math.max(...bounds.map(({ right }) => right)) + 20,
      Math.max(...bounds.map(({ bottom }) => bottom)) + 20,
      { steps: 12 }
    )
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(
      initialNodes
    )
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await expect(nodes).toHaveCount(initialNodes * 2)
    await expect(edges).toHaveCount(initialEdges * 2)

    const firstPaste = await nodes.evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.dataset.id,
        transform:
          element instanceof HTMLElement ? element.style.transform : '',
      }))
    )

    expect(new Set(firstPaste.map(({ id }) => id)).size).toBe(initialNodes * 2)
    await page.keyboard.press('Control+v')
    await expect(nodes).toHaveCount(initialNodes * 3)
    await test.info().attach('public-reference-observation', {
      body: JSON.stringify({ initialNodes, initialEdges, firstPaste }, null, 2),
      contentType: 'application/json',
    })
  })
})
