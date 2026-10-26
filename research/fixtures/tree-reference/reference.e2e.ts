import { expect, test as it } from '@playwright/test'

const { describe } = it

describe('public dynamic tree references', () => {
  it('collapses and restores visible descendants and adds a child through public controls', async ({
    page,
  }) => {
    await page.goto(
      'https://example-apps.xyflow.com/react/pro/expand-collapse/index.html'
    )
    const nodes = page.locator('.react-flow__node')
    await expect(nodes.first()).toBeVisible()

    const initial = await nodes.evaluateAll((elements) =>
      elements.map((element) => element.dataset.id)
    )

    const parent = nodes.first()
    const id = await parent.getAttribute('data-id')
    const stableParent = page.locator(`.react-flow__node[data-id="${id}"]`)
    await stableParent.click({ position: { x: 40, y: 12 } })
    await expect.poll(() => nodes.count()).toBeLessThan(initial.length)
    await stableParent.click({ position: { x: 40, y: 12 } })
    await expect
      .poll(() =>
        nodes.evaluateAll((elements) =>
          elements.map((element) => element.dataset.id)
        )
      )
      .toEqual(initial)
    await stableParent
      .getByRole('button', { name: '+ add child node', exact: true })
      .click()
    await expect.poll(() => nodes.count()).toBeGreaterThan(initial.length)
    await it.info().attach('public-tree-output', {
      body: JSON.stringify(await nodes.allTextContents()),
      contentType: 'application/json',
    })
  })

  it('grows through node and placeholder actions, inserts on an edge, and animates the layout', async ({
    page,
  }) => {
    await page.goto(
      'https://example-apps.xyflow.com/react/pro/dynamic-layouting/index.html'
    )
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2)
    await page.locator('.react-flow__node-workflow').first().click()
    await expect(nodes).toHaveCount(3)
    const placeholder = page.locator('.react-flow__node-placeholder').first()
    const id = await placeholder.getAttribute('data-id')
    await placeholder.click()
    await expect(
      page.locator(`.react-flow__node-workflow[data-id="${id}"]`)
    ).toBeVisible()
    await expect(nodes).toHaveCount(4)

    const capture = page.evaluate(() => {
      const completion = Promise.withResolvers<readonly string[]>()
      const samples: string[] = []

      const frame = () => {
        samples.push(
          JSON.stringify(
            [...document.querySelectorAll('.react-flow__node')].map((node) =>
              node.getAttribute('style')
            )
          )
        )

        if (samples.length < 60) {
          requestAnimationFrame(frame)
        } else {
          completion.resolve(samples)
        }
      }

      requestAnimationFrame(frame)

      return completion.promise
    })

    await page.getByRole('button', { name: '+', exact: true }).first().click()
    await expect(nodes).toHaveCount(5)
    const samples = await capture
    expect(new Set(samples).size).toBeGreaterThan(2)
    await it.info().attach('public-tree-frames', {
      body: JSON.stringify(samples),
      contentType: 'application/json',
    })
  })
})
