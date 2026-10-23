import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema } from 'effect'

import { NodeChangeSchema } from '../../packages/core/src/public.ts'

// examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:25,36.
// Isolate dimensions from the separately retained replace-item assertion.
export const assertComponentMeasurements = async (page: Page) => {
  await page.setViewportSize({ width: 500, height: 500 })
  await page.goto('/upstream-component/44')
  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )

  const dimensions = async () => {
    const changes = Schema.decodeUnknownSync(
      Schema.Array(Schema.Array(NodeChangeSchema))
    )(await page.evaluate(() => window.__component.nodeChanges))

    return changes
      .map((batch) => batch.filter((change) => change.type === 'dimensions'))
      .filter((batch) => batch.length > 0)
  }

  const initial = [
    { id: '1', type: 'dimensions', dimensions: { width: 100, height: 40 } },
    { id: '2', type: 'dimensions', dimensions: { width: 80, height: 50 } },
  ]

  await expect.poll(dimensions).toEqual([initial])
  await page.locator('[data-id=update-btn]').click()
  await expect.poll(dimensions).toEqual([
    initial,
    [
      {
        id: '1',
        type: 'dimensions',
        dimensions: { width: 200, height: 100 },
      },
    ],
  ])
  await expect(
    page.locator('[data-testid=flow-node][data-node-id="1"]')
  ).toHaveCSS('width', '200px')
  await expect(
    page.locator('[data-testid=flow-node][data-node-id="1"]')
  ).toHaveCSS('height', '100px')
}
