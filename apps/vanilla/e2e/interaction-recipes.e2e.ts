import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/closing/?scene=${scene}`)
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    /\[/u
  )
}

const center = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing rendered element')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const drag = async (
  page: Page,
  from: Locator,
  to: Locator | { x: number; y: number }
) => {
  const start = await center(from)
  const end = 'boundingBox' in to ? await center(to) : to
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 3, start.y + 3)
  await page.mouse.move(end.x, end.y, { steps: 8 })
  await page.mouse.up()
}

const handle = (page: Page, id: string, kind: string) =>
  page.locator(`.flow-handle[data-node-id="${id}"][data-kind="${kind}"]`)

const edgeCount = async (page: Page): Promise<number> => {
  const text = await page
    .getByTestId('recipe-status')
    .getAttribute('data-edges')

  return JSON.parse(text ?? '[]').length
}

test('Delete Edge on Drop retains a successful reconnect, then deletes an empty-pane drop', async ({
  page,
}) => {
  await open(page, 'delete-edge-on-drop')

  const anchor = page.locator(
    '.flow-edge-reconnect-anchor[data-endpoint="target"]'
  )

  await drag(page, anchor, handle(page, 'c', 'target'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-events',
    'start,reconnect,end'
  )
  await expect.poll(() => edgeCount(page)).toBe(1)
  await drag(page, anchor, { x: 800, y: 450 })
  await expect.poll(() => edgeCount(page)).toBe(0)
  await expect(page.locator('.flow-edge-group')).toHaveCount(0)
})

test('Contextual Zoom selects node content at each zoom level', async ({
  page,
}) => {
  await open(page, 'contextual-zoom')
  await expect(page.getByTestId('zoom-content')).toHaveText(
    'Detailed node content'
  )
  await page.getByTestId('summary').click()
  await expect(page.getByTestId('zoom-content')).toHaveText('Summary')
  await page.getByTestId('overview').click()
  await expect(page.getByTestId('zoom-content')).toHaveText('Overview')
  await page.getByTestId('detail').click()
  await expect(page.getByTestId('zoom-content')).toHaveText(
    'Detailed node content'
  )
})

test('Drag and Drop accepts a native HTML5 sidebar drag at the transformed drop point', async ({
  page,
}) => {
  await open(page, 'drag-and-drop')
  const pane = page.locator('.flow-canvas')
  const bounds = await pane.boundingBox()

  if (bounds === null) {
    throw new Error('Missing canvas')
  }

  await page
    .getByTestId('sidebar-node')
    .dragTo(pane, { targetPosition: { x: 370, y: 230 } })
  const node = page.locator('.flow-node[data-node-id="dropped-0"]')
  await expect(node).toBeVisible()
  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Missing dropped node')
  }

  expect(box.x).toBeCloseTo(bounds.x + 370, 0)
  expect(box.y).toBeCloseTo(bounds.y + 230, 0)

  const text = await page
    .getByTestId('recipe-status')
    .getAttribute('data-nodes')

  const nodes = JSON.parse(text ?? '[]')
  expect(nodes[0].position).toEqual({ x: 200, y: 400 / 3 })
})

test('Preventing Cycles rejects c-to-a and accepts the acyclic a-to-c shortcut', async ({
  page,
}) => {
  await open(page, 'preventing-cycles')
  await drag(page, handle(page, 'c', 'source'), handle(page, 'a', 'target'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-outcome',
    'rejected'
  )
  expect(await edgeCount(page)).toBe(2)
  await drag(page, handle(page, 'a', 'source'), handle(page, 'c', 'target'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-outcome',
    'proposed'
  )
  expect(await edgeCount(page)).toBe(3)
})

test('Turbo Flow renders gradient custom nodes and SVG gradient custom edges that follow dragging', async ({
  page,
}) => {
  await open(page, 'turbo-flow')
  await expect(page.locator('.turbo-node')).toHaveCount(3)

  const background = await page
    .locator('.turbo-node')
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundImage)

  expect(background).toContain('linear-gradient')
  await expect(
    page.locator('.flow-edge-custom-visual defs linearGradient')
  ).toHaveCount(2)
  const path = page.locator('.flow-edge-custom-visual .flow-edge-path').first()
  const before = await path.getAttribute('d')
  await drag(page, page.locator('.turbo-node').first(), { x: 200, y: 250 })
  await expect(path).not.toHaveAttribute('d', before ?? '')
  await expect(path).toHaveCSS('stroke', /url\(/u)
})

test('Download Image exports a decodable 1024 by 768 PNG and starts a download', async ({
  page,
}) => {
  await open(page, 'download-image')
  const download = page.waitForEvent('download')
  await page.getByTestId('download-image').click()
  const result = await download
  expect(result.suggestedFilename()).toBe('flow.png')

  const dimensions = await page
    .getByTestId('recipe-status')
    .evaluate(async (element) => {
      const url = element.dataset.png ?? ''
      const image = new Image()
      image.src = url
      await image.decode()

      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')

      if (context === null) {
        throw new Error('Missing image decoder canvas')
      }

      context.drawImage(image, 0, 0)

      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data

      let painted = 0

      for (let index = 0; index < pixels.length; index += 4) {
        if (
          pixels[index] !== 255 ||
          pixels[index + 1] !== 255 ||
          pixels[index + 2] !== 255
        ) {
          painted += 1
        }
      }

      return {
        painted,
        prefix: url.slice(0, 22),
        width: image.naturalWidth,
        height: image.naturalHeight,
        bytes: url.length,
      }
    })

  expect(dimensions.prefix).toBe('data:image/png;base64,')
  expect(dimensions.width).toBe(1024)
  expect(dimensions.height).toBe(768)
  expect(dimensions.bytes).toBeGreaterThan(5000)
  expect(dimensions.painted).toBeGreaterThan(1000)
})
