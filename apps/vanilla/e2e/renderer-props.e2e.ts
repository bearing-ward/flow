import { connectionLinePath } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  centerOf,
  expectBezierPreviewMatchesCore,
  expectCustomEdgeFollowsDrag,
  expectDraggingDuringDrag,
  expectEdgeLabelFollowsZoom,
} from '../../shared-e2e/renderer-props.ts'

declare global {
  interface Window {
    __flowVanillaRendererProps?: {
      readonly updateViewport: (viewport: {
        readonly x: number
        readonly y: number
        readonly zoom: number
      }) => void
    }
  }
}

const mount = async (page: Page, customPreview: boolean) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async (custom) => {
    const modulePath = '/src/renderer-props-fixture.ts'
    const { mountVanillaRendererPropsFixture } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing host')
    }

    const controller = mountVanillaRendererPropsFixture(root, {
      customPreview: custom,
    })

    window.__flowVanillaRendererProps = {
      updateViewport: (viewport) => controller.updateViewport(viewport),
    }
  }, customPreview)
}

const bezierLinePath = (
  params: Parameters<typeof connectionLinePath>[1]
): string => connectionLinePath('bezier', params)

const sourceHandle = '.flow-handle[data-node-id="a"][data-handle-id="out"]'

const probePath = '[data-testid="probe-edge-path"]'

const probeLabel = '[data-testid="probe-edge-label"]'

test('Vanilla custom renderers receive React Flow style edge and node props', async ({
  page,
}) => {
  await mount(page, false)

  const custom = page.getByTestId('probe-edge-path')

  // The custom edge computes its own path with getBezierPath from the props.
  await expect(custom).toHaveAttribute('d', /^M/u)

  const builtinPath = await page
    .locator('.flow-edge-path[data-edge-id="builtin"]')
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
  const preview = page.locator('.flow-connection-preview-path')
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
  await node.click()
  await expect(node).toHaveAttribute('data-selected', 'true')

  // The HTML label layer follows the edge geometry and the viewport.
  await expectEdgeLabelFollowsZoom(
    page,
    { path: probePath, label: probeLabel },
    async () => {
      await page.evaluate(() =>
        window.__flowVanillaRendererProps?.updateViewport({
          x: 30,
          y: 20,
          zoom: 1.5,
        })
      )
    },
    1.5
  )
})

test('Vanilla custom connection previews receive connection line props', async ({
  page,
}) => {
  await mount(page, true)

  const from = await centerOf(page.locator(sourceHandle))

  const to = await centerOf(
    page.locator('.flow-handle[data-node-id="c"][data-handle-id="in"]')
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

test('Vanilla custom edges using getBezierPath(props) follow a node drag', async ({
  page,
}) => {
  await mount(page, false)

  const custom = page.getByTestId('probe-edge-path')
  const grip = page.locator('[data-testid="flow-node"][data-node-id="b"]')
  let updatesInDrag: string | null = null

  await expectCustomEdgeFollowsDrag(
    page,
    grip,
    {
      custom,
      builtin: page.locator('.flow-edge-path[data-edge-id="builtin"]'),
    },
    { x: -60, y: 70 },
    {
      duringDrag: true,
      onDragStarted: async () => {
        await expect(grip).toHaveClass(/dragging/u)
        updatesInDrag = await custom.getAttribute('data-updates')
      },
      // The opted-in edge follows through updateProps, not update.
      whileDragging: () =>
        expect(custom).toHaveAttribute('data-updates', updatesInDrag ?? ''),
    }
  )
})

test('Vanilla renderers written against the original contract still work and skip drag frames', async ({
  page,
}) => {
  await mount(page, false)

  const legacy = page.getByTestId('legacy-node-c')
  const frame = page.locator('[data-testid="flow-node"][data-node-id="c"]')
  await expect(legacy).toHaveText('C')

  const start = await centerOf(legacy)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y + 3)
  await page.mouse.move(start.x + 10, start.y + 8, { steps: 2 })
  await expect(frame).toHaveClass(/dragging/u)

  // Drag start may select the node, a document change; count from here.
  const updatesInDrag = Number(await legacy.getAttribute('data-updates'))
  const boxBefore = await frame.boundingBox()
  await page.mouse.move(start.x + 60, start.y + 40, { steps: 8 })
  await expect
    .poll(async () => {
      const box = await frame.boundingBox()

      return box?.x
    })
    .toBeGreaterThan((boxBefore?.x ?? 0) + 40)

  // Drag frames move the node without re-running update(node).
  await expect(legacy).toHaveAttribute('data-updates', String(updatesInDrag))
  await page.mouse.up()
  await expect(frame).not.toHaveClass(/dragging/u)

  // The committed position is a document change, which reaches update.
  await expect
    .poll(async () => Number(await legacy.getAttribute('data-updates')))
    .toBeGreaterThan(updatesInDrag)
  await expect(legacy).toHaveText('C')
})
