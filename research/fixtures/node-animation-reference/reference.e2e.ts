import { writeFile } from 'node:fs/promises'

import { expect, test as it } from '@playwright/test'

const { describe } = it

describe('public node animation reference', () => {
  it('toggles layouts through intermediate DOM positions', async ({ page }) => {
    await page.goto(
      'https://example-apps.xyflow.com/react/pro/node-position-animation/index.html'
    )
    const nodes = page.locator('.react-flow__node')
    await expect(nodes.first()).toBeVisible()

    const initial = await nodes.evaluateAll((elements) =>
      elements.map((node) => node.getAttribute('style'))
    )

    const capture = page.evaluate(() => {
      const completion = Promise.withResolvers<
        readonly {
          readonly positions: readonly (string | null)[]
          readonly paths: readonly (string | null)[]
        }[]
      >()

      const samples: {
        positions: (string | null)[]
        paths: (string | null)[]
      }[] = []

      const frame = () => {
        samples.push({
          positions: [...document.querySelectorAll('.react-flow__node')].map(
            (node) => node.getAttribute('style')
          ),
          paths: [...document.querySelectorAll('svg path')].map((path) =>
            path.getAttribute('d')
          ),
        })

        if (samples.length < 90) {
          requestAnimationFrame(frame)
        } else {
          completion.resolve(samples)
        }
      }

      requestAnimationFrame(frame)

      return completion.promise
    })

    await page.getByRole('button', { name: /toggle layout/iu }).click()
    const samples = await capture

    const final = await nodes.evaluateAll((elements) =>
      elements.map((node) => node.getAttribute('style'))
    )

    expect(final).not.toEqual(initial)
    expect(
      samples.some(
        ({ positions }) =>
          JSON.stringify(positions) !== JSON.stringify(initial) &&
          JSON.stringify(positions) !== JSON.stringify(final)
      )
    ).toBeTruthy()
    await it.info().attach('path-samples.json', {
      body: JSON.stringify(samples, null, 2),
      contentType: 'application/json',
    })
    const edges = await page.locator('.react-flow__edge').count()
    expect(edges).toBe(0)
    await writeFile(
      it.info().outputPath('public-reference.json'),
      JSON.stringify({ initial, final, samples, edges }, null, 2)
    )
    await it.info().attach('public-reference.json', {
      body: JSON.stringify({ initial, final, samples }, null, 2),
      contentType: 'application/json',
    })
    await page.screenshot({
      path: 'test-results/node-animation-reference/public-demo.png',
    })
    await page.getByRole('button', { name: /toggle layout/iu }).click()
    await expect
      .poll(() =>
        nodes.evaluateAll((elements) =>
          elements.map((node) => node.getAttribute('style'))
        )
      )
      .toEqual(initial)
  })
})
