import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Missing recipe element')
  }

  return box
}

const mount = async (page: Page, recipe: string) => {
  await page.goto(`/ui-recipes/closing-gaps/?recipe=${recipe}`)
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    '3'
  )
}

const dragBetween = async (page: Page, source: Locator, target: Locator) => {
  const from = await boxOf(source)
  const to = await boxOf(target)
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 3, from.y + from.height / 2)
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 })
  await page.mouse.up()
}

const handle = (page: Page, node: string, id: string) =>
  page.locator(`[data-node-id="${node}"] [data-handle-id="${id}"]`)

test('Delete Edge on Drop keeps a successful reconnect and deletes only an empty-pane drop', async ({
  page,
}) => {
  await mount(page, 'delete-edge-on-drop')

  const anchor = page.locator(
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'
  )

  await dragBetween(page, anchor, handle(page, 'c', 'in'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    '1'
  )
  expect(
    await page.evaluate(
      () => window.__flowVueClosingRecipes?.flow().getEdges()[0]?.target
    )
  ).toBe('c')
  expect(
    await page.evaluate(() => window.__flowVueClosingRecipes?.lifecycle())
  ).toEqual(['start', 'reconnect', 'end'])
  const box = await boxOf(anchor)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(430, 480, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    '0'
  )
  expect(
    await page.evaluate(() => window.__flowVueClosingRecipes?.lifecycle())
  ).toEqual(['start', 'reconnect', 'end', 'start', 'end'])
})

test('Contextual Zoom changes custom node content at three zoom levels', async ({
  page,
}) => {
  await mount(page, 'contextual-zoom')

  const content = page
    .locator('[data-node-id="a"]')
    .getByTestId('contextual-content')

  await page.getByRole('button', { name: 'Zoom 0.3', exact: true }).click()
  await expect(content).toHaveAttribute('data-band', 'summary')
  await expect(content).toHaveText('•')
  await page.getByRole('button', { name: 'Zoom 1', exact: true }).click()
  await expect(content).toHaveText('A')
  await page.getByRole('button', { name: 'Zoom 2', exact: true }).click()
  await expect(content).toHaveAttribute('data-band', 'details')
  await expect(content).toHaveText('A: detailed node content')
})

test('HTML5 sidebar drag creates a node at the drop point under a translated and zoomed viewport', async ({
  page,
}) => {
  await mount(page, 'drag-and-drop')
  await page.evaluate(() =>
    window.__flowVueClosingRecipes
      ?.flow()
      .setViewport({ x: 50, y: -30, zoom: 1.5 })
  )
  const sidebar = await boxOf(page.getByTestId('sidebar-node'))
  const canvas = await boxOf(page.getByTestId('flow-canvas'))
  const drop = { x: canvas.x + 420, y: canvas.y + 450 }
  await page.mouse.move(
    sidebar.x + sidebar.width / 2,
    sidebar.y + sidebar.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    sidebar.x + sidebar.width / 2 - 15,
    sidebar.y + sidebar.height / 2 + 15,
    { steps: 4 }
  )
  await page.mouse.move(drop.x, drop.y, { steps: 15 })
  await page.mouse.up()
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    '4'
  )

  const position = await page.evaluate(
    () =>
      window.__flowVueClosingRecipes
        ?.flow()
        .getNodes()
        .find(({ id }) => id === 'dropped-1')?.position
  )

  expect(position?.x).toBeCloseTo((420 - 50) / 1.5, 5)
  expect(position?.y).toBeCloseTo((450 + 30) / 1.5, 5)
  const node = await boxOf(page.locator('[data-node-id="dropped-1"]'))
  expect(node.x).toBeCloseTo(drop.x, 0)
  expect(node.y).toBeCloseTo(drop.y, 0)
  // A native drop back onto the sidebar is outside the pane.
  await page.mouse.move(
    sidebar.x + sidebar.width / 2,
    sidebar.y + sidebar.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(sidebar.x + 20, sidebar.y + sidebar.height / 2 + 20, {
    steps: 6,
  })
  await page.mouse.up()
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-nodes',
    '4'
  )
})

test('Preventing Cycles rejects a transitive cycle and accepts a forward connection', async ({
  page,
}) => {
  await mount(page, 'preventing-cycles')
  await dragBetween(page, handle(page, 'c', 'out'), handle(page, 'a', 'in'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    '2'
  )
  await dragBetween(page, handle(page, 'a', 'out'), handle(page, 'c', 'in'))
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-edges',
    '3'
  )

  const edges = await page.evaluate(() =>
    window.__flowVueClosingRecipes
      ?.flow()
      .getEdges()
      .map(({ source, target }) => `${source}:${target}`)
  )

  expect(edges).toEqual(['a:b', 'b:c', 'a:c'])
})

test('Turbo Flow renders gradient custom nodes and an edge with local SVG gradient definitions', async ({
  page,
}) => {
  await mount(page, 'turbo-flow')
  await expect(page.getByTestId('turbo-node')).toHaveCount(3)
  await expect(page.getByTestId('turbo-node').first()).toHaveCSS(
    'background-image',
    /linear-gradient/u
  )
  const edge = page.getByTestId('turbo-edge')
  await expect(edge).toHaveCSS('stroke', 'url("#turbo-gradient-ab")')
  const gradient = page.locator('linearGradient[id="turbo-gradient-ab"]')
  await expect(gradient).toHaveCount(1)
  await expect(gradient.locator('stop')).toHaveCount(2)
  await expect(gradient.locator('stop').first()).toHaveAttribute(
    'stop-color',
    '#ff0072'
  )
  const path = await edge.getAttribute('d')
  expect(path).toMatch(/^M.+C/u)
})

test('Download Image exports and downloads an 800 by 500 PNG containing the graph', async ({
  page,
}) => {
  await mount(page, 'download-image')
  // The export transform fits all graph nodes independently of the current zoom.
  await page.evaluate(() =>
    window.__flowVueClosingRecipes
      ?.flow()
      .setViewport({ x: -900, y: -700, zoom: 0.3 })
  )
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const downloaded = await download
  expect(downloaded.suggestedFilename()).toBe('flow.png')
  await expect(page.getByTestId('export-error')).toHaveText('')
  const png = await page.getByTestId('png-result').getAttribute('href')
  expect(png).toMatch(/^data:image\/png;base64,/u)

  const dimensions = await page
    .getByTestId('png-result')
    .evaluate(async (element) => {
      const image = new Image()
      image.src = element.getAttribute('href') ?? ''
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')

      if (context === null) {
        throw new Error('Missing PNG inspection context')
      }

      context.drawImage(image, 0, 0)

      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data

      let darkPixels = 0

      for (let index = 0; index < pixels.length; index += 4) {
        if (
          (pixels[index] ?? 255) < 200 &&
          (pixels[index + 1] ?? 255) < 200 &&
          (pixels[index + 2] ?? 255) < 200
        ) {
          darkPixels += 1
        }
      }

      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        darkPixels,
      }
    })

  expect(dimensions.width).toBe(800)
  expect(dimensions.height).toBe(500)
  expect(dimensions.darkPixels).toBeGreaterThan(100)
  expect(
    await page.evaluate(
      () => window.__flowVueClosingRecipes?.flow().viewport.value
    )
  ).toEqual({ x: -900, y: -700, zoom: 0.3 })
})
