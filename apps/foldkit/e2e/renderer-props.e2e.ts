import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  centerOf,
  expectDraggingDuringDrag,
  expectEdgeLabelFollowsZoom,
} from '../../shared-e2e/renderer-props.ts'
import type { FoldkitRendererPropsFixture } from './renderer-props-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitRendererProps?: FoldkitRendererPropsFixture
  }
}

const mount = async (page: Page, customPreview: boolean) => {
  await page.goto('/test.html')
  await page.evaluate(async (custom) => {
    const modulePath = '/e2e/renderer-props-fixture.ts'
    const { mountFoldkitRendererPropsFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    host.innerHTML = '<div id="renderer-props-fixture"></div>'

    const container = document.querySelector<HTMLElement>(
      '#renderer-props-fixture'
    )

    if (container === null) {
      throw new Error('Missing Foldkit renderer props fixture container')
    }

    window.__flowFoldkitRendererProps = mountFoldkitRendererPropsFixture(
      container,
      { customPreview: custom }
    )
  }, customPreview)
}

const sourceHandle = '[data-node-id="a"] [data-handle-id="out"]'

const probePath = '[data-testid="probe-edge-path"]'

const probeLabel = '[data-testid="probe-edge-label"]'

test('Foldkit custom renderers receive React Flow style edge and node props', async ({
  page,
}) => {
  await mount(page, false)

  const custom = page.getByTestId('probe-edge-path')

  // The custom edge computes its own path with getBezierPath from the props.
  await expect(custom).toHaveAttribute('d', /^M/u)

  const builtinPath = await page
    .locator(
      '.flow-foldkit-edge[data-edge-id="builtin"] .flow-foldkit-edge-path'
    )
    .getAttribute('d')

  await expect(custom).toHaveAttribute('d', builtinPath ?? '')
  await expect(custom).toHaveAttribute('data-target-node', /^b:\d+/u)
  await expect(custom).toHaveAttribute('data-selected', 'false')
  await expect(custom).toHaveAttribute('marker-end', /^url\(#/u)

  // The built-in preview honours connectionLineType.
  const from = await centerOf(page.locator(sourceHandle))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 120, from.y + 90, { steps: 5 })
  const preview = page.locator('.flow-foldkit-connection-preview-path')
  await expect(preview).toHaveAttribute('data-connection-line-type', 'bezier')
  await expect(preview).toHaveAttribute('d', /^M[\d.-]+,[\d.-]+ C/u)
  await page.mouse.up()

  const node = page.getByTestId('probe-node-a')
  await expect(node).toHaveAttribute('data-x', '40')
  await expect(node).toHaveAttribute('data-z', '2')
  await expect(node).toHaveAttribute('data-connectable', 'true')
  await expect(node).toHaveAttribute('data-size', /^\d+(?:\.\d+)?x\d+/u)

  await expectDraggingDuringDrag(page, node, node, { x: 40, y: 30 })
  await expect(node).toHaveAttribute('data-x', '80')
  await page.getByRole('button', { name: 'Toggle selection for A' }).click()
  await expect(node).toHaveAttribute('data-selected', 'true')

  // The HTML label layer follows the edge geometry and the viewport.
  await expectEdgeLabelFollowsZoom(
    page,
    { path: probePath, label: probeLabel },
    async () => {
      await page.evaluate(() =>
        window.__flowFoldkitRendererProps?.setViewport({
          x: 30,
          y: 20,
          zoom: 1.5,
        })
      )
    },
    1.5
  )
})

test('Foldkit custom connection previews receive connection line props', async ({
  page,
}) => {
  await mount(page, true)

  const from = await centerOf(page.locator(sourceHandle))

  const to = await centerOf(
    page.locator('[data-node-id="c"] [data-handle-id="in"]')
  )

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(from.x + 60, from.y + 60, { steps: 4 })

  const preview = page.getByTestId('probe-preview')
  await expect(preview).toHaveAttribute('data-from', 'a:out')
  await expect(preview).toHaveAttribute('data-positions', 'right-left')
  await expect(preview).toHaveAttribute('data-line-type', 'step')
  await expect(preview).toHaveAttribute('data-to-node', '')
  await expect(preview).toHaveAttribute('d', /^M/u)

  await page.mouse.move(to.x, to.y, { steps: 6 })
  await expect(preview).toHaveAttribute('data-to-node', 'c')
  await expect(preview).toHaveAttribute('data-status', 'valid')
  await page.mouse.up()
})
