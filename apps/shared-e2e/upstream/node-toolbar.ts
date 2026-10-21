import { test, expect } from '@playwright/test'

import { boundingBox } from './adapter.ts'
import type { UpstreamHostAdapter } from './adapter.ts'

export const node_toolbarContract = (adapter: UpstreamHostAdapter): void => {
  type Position = 'top' | 'right' | 'bottom' | 'left'

  const positions: Position[] = ['top', 'right', 'bottom', 'left']

  type Alignment = 'start' | 'center' | 'end'

  const alignments: Alignment[] = ['start', 'center', 'end']

  interface Permutation {
    id: string
    position: Position
    align: Alignment
  }

  const permutations: Permutation[] = []

  for (const position of positions) {
    for (const align of alignments) {
      permutations.push({
        id: `node-${align}-${position}`,
        position,
        align,
      })
    }
  }

  test.describe('Node Toolbar', () => {
    test.beforeEach(async ({ page }) => {
      // Go to the starting url before each test.
      await adapter.goto(page, '/upstream/node-toolbar/general')
      // Wait till the edges are rendered
      await adapter
        .locator(page, '[data-id="first-edge"]')
        .waitFor({ state: 'visible', timeout: 5000 })
    })

    // Upstream: tests/playwright/e2e/node-toolbar.spec.ts:34
    test('[UP-126-019] all toolbars are positioned correctly', async ({
      page,
    }) => {
      const tests = permutations.map((permutation) => async () => {
        const toolbar = adapter
          .locator(page, `[data-id="${permutation.id}"]`)
          .and(adapter.locator(page, `.react-flow__node-toolbar`))

        const node = adapter
          .locator(page, `[data-id="${permutation.id}"]`)
          .and(adapter.locator(page, `.react-flow__node`))

        await expect(toolbar).toBeAttached({ timeout: 5000 })
        await expect(node).toBeAttached({ timeout: 5000 })

        const toolbarBox = await boundingBox(toolbar)
        const nodeBox = await boundingBox(node)

        switch (permutation.position) {
          case 'top': {
            expect(toolbarBox.y).toBeLessThan(nodeBox.y)
            break
          }

          case 'right': {
            expect(toolbarBox.x).toBeGreaterThan(nodeBox.x)
            break
          }

          case 'bottom': {
            expect(toolbarBox.y).toBeGreaterThan(nodeBox.y)
            break
          }

          case 'left': {
            expect(toolbarBox.x).toBeLessThan(nodeBox.x)
            break
          }

          default: {
            const exhaustive: never = permutation.position
            throw new Error(exhaustive)
          }
        }

        const dimension =
          permutation.position === 'top' || permutation.position === 'bottom'
            ? 'x'
            : 'y'

        const extent =
          permutation.position === 'top' || permutation.position === 'bottom'
            ? 'width'
            : 'height'

        switch (permutation.align) {
          case 'start': {
            expect(Math.floor(toolbarBox[dimension])).toBe(
              Math.floor(nodeBox[dimension])
            )
            break
          }

          case 'center': {
            expect(
              Math.floor(toolbarBox[dimension] + toolbarBox[extent] * 0.5)
            ).toBe(Math.floor(nodeBox[dimension] + nodeBox[extent] * 0.5))
            break
          }

          case 'end': {
            expect(Math.floor(toolbarBox[dimension] + toolbarBox[extent])).toBe(
              Math.floor(nodeBox[dimension] + nodeBox[extent])
            )
            break
          }

          default: {
            const exhaustive: never = permutation.align
            throw new Error(exhaustive)
          }
        }
      })

      await Promise.all(tests.map((t) => t()))
    })

    // Upstream: tests/playwright/e2e/node-toolbar.spec.ts:84
    test('[UP-126-020] toolbar default behaviour', async ({ page }) => {
      const node = adapter
        .locator(page, '[data-id="default-node"]')
        .and(adapter.locator(page, `.react-flow__node`))

      const toolbar = adapter
        .locator(page, '[data-id="default-node"]')
        .and(adapter.locator(page, `.react-flow__node-toolbar`))

      await expect(node).toBeAttached()
      await expect(toolbar).not.toBeAttached()

      await node.click()
      await expect(toolbar).toBeAttached()
    })
  })
}
