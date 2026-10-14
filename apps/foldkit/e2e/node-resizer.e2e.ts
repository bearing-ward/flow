import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  dragBy,
  mountModelStyling,
  nodeLocator,
  readNode,
} from './model-styling-shared.ts'

const resizable = (id: string, type: string, extra = {}) => ({
  id,
  label: id.toUpperCase(),
  type,
  position: { x: 100, y: 100 },
  size: { width: 150, height: 80 },
  ...extra,
})

const control = (
  page: Page,
  nodeId: string,
  position: string,
  variant = 'handle'
) =>
  nodeLocator(page, nodeId).locator(
    `.flow-foldkit-resize-control-${variant}${position
      .split('-')
      .map((part) => `.flow-foldkit-resize-control-${part}`)
      .join('')}`
  )

const size = async (page: Page, nodeId: string) =>
  await readNode(page, nodeId).then((node) => node?.size)

const resizeLog = (page: Page) =>
  page.evaluate(() => window.__flowFoldkitModelStyling?.resizeLog() ?? [])

test('Node Resizer: NodeResizer resizes within limits and reports ResizeParams', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: { nodes: [resizable('r', 'resizable')], edges: [] },
  })

  await expect(
    nodeLocator(page, 'r').locator('.flow-foldkit-resize-control')
  ).toHaveCount(8)
  await expect(control(page, 'r', 'bottom-right')).toHaveCSS(
    'background-color',
    'rgb(255, 0, 113)'
  )
  await expect(control(page, 'r', 'right', 'line')).toHaveCSS(
    'border-right-color',
    'rgb(255, 0, 113)'
  )
  // handleStyle/handleClassName and lineStyle/lineClassName per variant.
  await expect(control(page, 'r', 'bottom-right')).toHaveCSS('width', '12px')
  await expect(control(page, 'r', 'bottom-right')).toHaveClass(
    /\bfixture-handle\b/u
  )
  await expect(control(page, 'r', 'right', 'line')).toHaveCSS(
    'border-right-style',
    'dashed'
  )
  await expect(control(page, 'r', 'right', 'line')).toHaveClass(
    /\bfixture-line\b/u
  )

  await dragBy(page, control(page, 'r', 'bottom-right'), 60, 40)
  await expect.poll(() => size(page, 'r')).toEqual({ width: 210, height: 120 })

  const log = await resizeLog(page)
  expect(log[0]).toEqual({
    name: 'onResizeStart',
    nodeId: 'r',
    params: { x: 100, y: 100, width: 150, height: 80 },
  })
  expect(log.some(({ name }) => name === 'onResize')).toBe(true)
  expect(log.at(-1)).toEqual({
    name: 'onResizeEnd',
    nodeId: 'r',
    params: { x: 100, y: 100, width: 210, height: 120 },
  })

  // maxWidth/maxHeight clamp the bottom-right handle.
  await dragBy(page, control(page, 'r', 'bottom-right'), 300, 300)
  await expect.poll(() => size(page, 'r')).toEqual({ width: 260, height: 200 })

  // minWidth/minHeight clamp the top-left handle, which moves the node.
  await dragBy(page, control(page, 'r', 'top-left'), 400, 400)
  await expect.poll(() => size(page, 'r')).toEqual({ width: 80, height: 40 })
  expect(await readNode(page, 'r').then((node) => node?.position)).toEqual({
    x: 280,
    y: 260,
  })
})

test('Node Resizer: keepAspectRatio and a horizontal NodeResizeControl line', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        resizable('aspect', 'aspect', { size: { width: 100, height: 50 } }),
        resizable('line', 'line', { position: { x: 400, y: 260 } }),
      ],
      edges: [],
    },
  })

  await dragBy(page, control(page, 'aspect', 'right', 'line'), 100, 0)
  await expect
    .poll(() => size(page, 'aspect'))
    .toEqual({ width: 200, height: 100 })

  await expect(
    nodeLocator(page, 'line').locator('.flow-foldkit-resize-control')
  ).toHaveCount(1)
  await dragBy(page, control(page, 'line', 'right', 'line'), 50, 60)
  await expect
    .poll(() => size(page, 'line'))
    .toEqual({ width: 200, height: 80 })
  const log = await resizeLog(page)
  expect(log.at(-1)?.name).toBe('controlEnd')
})

test('Node Resizer: shouldResize vetoes, isVisible follows selection, handles auto-scale', async ({
  page,
}) => {
  await mountModelStyling(page, {
    document: {
      nodes: [
        resizable('r', 'resizable'),
        resizable('hidden', 'hidden', { position: { x: 420, y: 260 } }),
      ],
      edges: [],
    },
  })

  await page.evaluate(() => window.__flowFoldkitModelStyling?.vetoResize(true))
  await dragBy(page, control(page, 'r', 'bottom-right'), 60, 40)
  expect(await size(page, 'r')).toEqual({ width: 150, height: 80 })
  const vetoed = await resizeLog(page)
  expect(vetoed.map(({ name }) => name)).toEqual(['onResizeStart'])

  const hidden = nodeLocator(page, 'hidden')
  await expect(hidden.locator('.flow-foldkit-resize-control')).toHaveCount(0)
  await hidden.click()
  await expect(hidden.locator('.flow-foldkit-resize-control')).toHaveCount(8)

  await page.evaluate(() =>
    window.__flowFoldkitModelStyling?.setViewport({ x: 0, y: 0, zoom: 0.5 })
  )
  await expect(control(page, 'r', 'bottom-right')).toHaveCSS('scale', '2')
  await expect(control(page, 'r', 'right', 'line')).toHaveCSS('scale', 'none')
  // `autoScale: false` keeps handles unscaled.
  await expect(control(page, 'hidden', 'bottom-right')).toHaveCSS(
    'scale',
    'none'
  )
})
