import { connectionLinePath } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { waitForTwoFrames } from '../../shared-e2e/performance-calibration.ts'
import {
  centerOf,
  expectBezierPreviewMatchesCore,
  expectCustomEdgeFollowsDrag,
  expectDraggingDuringDrag,
  expectEdgeLabelFollowsZoom,
} from '../../shared-e2e/renderer-props.ts'

const mount = async (page: Page, customPreview: boolean) => {
  await page.goto('/test.html')
  await page.evaluate(async (custom) => {
    const { mountVueRendererPropsFixture } =
      await import('../src/renderer-props-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue renderer props fixture mount point is missing')
    }

    mountVueRendererPropsFixture(root, { customPreview: custom })
  }, customPreview)
}

const bezierLinePath = (
  params: Parameters<typeof connectionLinePath>[1]
): string => connectionLinePath('bezier', params)

const sourceHandle = '[data-node-id="a"] [data-handle-id="out"]'

const probePath = '[data-testid="probe-edge-path"]'

const probeLabel = '[data-testid="probe-edge-label"]'

test('Vue custom renderers receive React Flow style edge and node props', async ({
  page,
}) => {
  await mount(page, false)

  const custom = page.getByTestId('probe-edge-path')

  // The custom edge computes its own path with getBezierPath from the props.
  await expect(custom).toHaveAttribute('d', /^M/u)

  const builtinPath = await page
    .locator('[data-flow-edge-hit="builtin"]')
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
  const preview = page.getByTestId('flow-connection-preview')
  await expect(preview).toHaveAttribute('data-connection-line-type', 'bezier')
  await expectBezierPreviewMatchesCore(preview, bezierLinePath, {
    fromPosition: 'right',
    toPosition: 'left',
  })
  await page.mouse.up()

  const node = page.getByTestId('probe-node-a')
  await expect(node).toHaveAttribute('data-x', '40')
  await expect(node).toHaveAttribute('data-z', '2')
  await expect(node).toHaveAttribute('data-connectable', 'true')
  await expect(node).toHaveAttribute('data-size', /^\d+(?:\.\d+)?x\d+/u)

  await expectDraggingDuringDrag(page, node, node, { x: 40, y: 30 })
  await expect(node).toHaveAttribute('data-x', '80')
  await expect(node).toHaveAttribute('data-selected', 'true')

  // The HTML label layer follows the edge geometry and the viewport.
  await expectEdgeLabelFollowsZoom(
    page,
    { path: probePath, label: probeLabel },
    async () => {
      await page.evaluate(() =>
        window.__flowVueRendererProps?.setViewport({ x: 30, y: 20, zoom: 1.5 })
      )
    },
    1.5
  )
})

test('Vue custom connection previews receive connection line props', async ({
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

test('Vue custom edges using getBezierPath(props) follow a node drag', async ({
  page,
}) => {
  await mount(page, false)

  // Vue moves the dragged node by transform and commits on release, so both
  // edges follow once the drag frames end.
  await expectCustomEdgeFollowsDrag(
    page,
    page.locator('.flow-vue-node[data-node-id="b"]'),
    {
      custom: page.getByTestId('probe-edge-path'),
      builtin: page.locator('[data-flow-edge-hit="builtin"]'),
    },
    { x: -60, y: 70 },
    { duringDrag: false }
  )
})

test('Vue renderers keep prop identity across pan and zoom, and old renderers still work', async ({
  page,
}) => {
  await mount(page, false)

  const legacy = page.getByTestId('legacy-node-c')
  await expect(legacy).toHaveText('C')
  // Renderer props it does not declare never fall through as attributes.
  await expect(legacy).toHaveAttribute('data-fallthrough', '')

  const node = page.getByTestId('probe-node-a')
  const edge = page.getByTestId('probe-edge-path')

  const renders = async () => [
    await node.getAttribute('data-renders'),
    await edge.getAttribute('data-renders'),
  ]

  // Let measurement renders settle before sampling.
  await expect(node).toHaveAttribute('data-size', /^\d+(?:\.\d+)?x\d+/u)
  await waitForTwoFrames(page)
  const settled = await renders()

  await page.evaluate(() =>
    window.__flowVueRendererProps?.setViewport({ x: 30, y: 20, zoom: 1 })
  )
  await page.evaluate(() =>
    window.__flowVueRendererProps?.setViewport({ x: 30, y: 20, zoom: 1.5 })
  )

  await waitForTwoFrames(page)
  await expect(page.getByTestId('probe-edge-label')).toBeVisible()
  expect(await renders()).toStrictEqual(settled)
})
