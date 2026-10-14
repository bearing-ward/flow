import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/*
 * Plan 115 examples on the public Vanilla API: Updating Nodes, Base Style,
 * Dark Mode, Node Resizer and the Labeled Group Node.
 */

const open = async (page: Page, scene: string) => {
  await page.goto(`/ui-recipes/styling/?scene=${scene}`)
  await expect(page.locator('.flow-node').first()).toHaveAttribute(
    'data-measured-width',
    /\d+/u
  )
}

const node = (page: Page, id: string) =>
  page.locator(`.flow-node[data-node-id="${id}"]`)

const box = async (locator: Locator) => {
  const bounds = await locator.boundingBox()

  if (bounds === null) {
    throw new Error('Expected a rendered element')
  }

  return bounds
}

const centre = async (locator: Locator) => {
  const bounds = await box(locator)

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 3, from.y + 3)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

interface ReportedNode {
  readonly id: string
  readonly size?: { readonly width: number; readonly height: number }
  readonly position: { readonly x: number; readonly y: number }
}

const reportedNodes = async (page: Page): Promise<readonly ReportedNode[]> =>
  JSON.parse(
    (await page.getByTestId('recipe-status').getAttribute('data-nodes')) ?? '[]'
  )

const reported = async (page: Page, id: string) => {
  const nodes = await reportedNodes(page)

  return nodes.find((item) => item.id === id)
}

const reportedSize = async (page: Page, id: string) => {
  const found = await reported(page, id)

  return found?.size
}

const reportedWidth = async (page: Page, id: string) => {
  const size = await reportedSize(page, id)

  return size?.width
}

const reportedPosition = async (page: Page, id: string) => {
  const found = await reported(page, id)

  return found?.position
}

const boxX = async (locator: Locator) => {
  const bounds = await box(locator)

  return bounds.x
}

test('Updating Nodes: label, background and visibility edits re-render the node', async ({
  page,
}) => {
  await open(page, 'updating-nodes')

  await page.getByTestId('node-label').fill('Renamed')
  await expect(node(page, '1')).toHaveText('Renamed')

  await page.getByTestId('node-background').fill('#ff0000')
  await expect(node(page, '1')).toHaveCSS('background-color', 'rgb(255, 0, 0)')

  await page.getByTestId('node-hidden').check()
  await expect(node(page, '1')).toHaveCount(0)
  await expect(
    page.locator('.flow-edge-group[data-edge-id="e1-2"]')
  ).toHaveCount(0)
  await page.getByTestId('node-hidden').uncheck()
  await expect(node(page, '1')).toBeVisible()
  await expect(node(page, '1')).toHaveCSS('background-color', 'rgb(255, 0, 0)')
})

test('Base Style: theme defaults, inline styles, class names and styled edges', async ({
  page,
}) => {
  await open(page, 'base-style')

  await expect(node(page, 'default')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )
  await expect(node(page, 'styled')).toHaveCSS(
    'background-color',
    'rgb(253, 230, 138)'
  )
  await expect(node(page, 'styled')).toHaveCSS('border-top-left-radius', '12px')
  await expect(node(page, 'classed')).toHaveCSS(
    'background-color',
    'rgb(237, 233, 254)'
  )
  await expect(page.locator('.flow-edge-group[data-edge-id="a"]')).toHaveClass(
    /animated/u
  )
  await expect(page.locator('.flow-edge-path[data-edge-id="b"]')).toHaveCSS(
    'stroke',
    'rgb(180, 83, 9)'
  )
})

test('Dark Mode: colorMode switches canvas, nodes, controls and minimap', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await open(page, 'dark-mode')

  const canvas = page.locator('.flow-canvas')
  await expect(canvas).toHaveClass(/dark/u)
  await expect(node(page, 'a')).toHaveCSS('background-color', 'rgb(30, 30, 30)')
  await expect(page.getByTestId('flow-minimap-panel')).toHaveCSS(
    'background-color',
    'rgb(20, 20, 20)'
  )
  await expect(
    page.locator('.flow-controls-public .flow-control-button').first()
  ).toHaveCSS('background-color', 'rgb(43, 43, 43)')

  await page.getByTestId('color-mode').selectOption('light')
  await expect(canvas).not.toHaveClass(/dark/u)
  await expect(node(page, 'a')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )

  await page.getByTestId('color-mode').selectOption('system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(canvas).toHaveClass(/dark/u)
})

test('Node Resizer: constrained resizers, a custom control and axis-locked lines', async ({
  page,
}) => {
  await open(page, 'node-resizer')

  const control = (id: string, position: string) =>
    page.locator(
      `.flow-node[data-node-id="${id}"] .flow-resize-control[data-direction="${position}"]`
    )

  const corner = await centre(control('resizer', 'bottom-right'))
  await drag(page, corner, { x: corner.x + 400, y: corner.y + 30 })
  await expect.poll(async () => await reportedWidth(page, 'resizer')).toBe(320)
  await expect(page.getByTestId('recipe-status')).toHaveAttribute(
    'data-resize-events',
    /^start,resize:.*,end$/u
  )

  const custom = await centre(control('control', 'bottom-right'))
  await drag(page, custom, { x: custom.x + 40, y: custom.y + 20 })
  await expect
    .poll(async () => await reportedSize(page, 'control'))
    .toEqual({ width: 200, height: 80 })

  const horizontal = await centre(control('horizontal', 'right'))
  await drag(page, horizontal, { x: horizontal.x + 50, y: horizontal.y + 50 })
  await expect
    .poll(async () => await reportedSize(page, 'horizontal'))
    .toEqual({ width: 210, height: 60 })

  const vertical = await centre(control('vertical', 'bottom'))
  await drag(page, vertical, { x: vertical.x + 50, y: vertical.y + 30 })
  await expect
    .poll(async () => await reportedSize(page, 'vertical'))
    .toEqual({ width: 160, height: 90 })
})

test('Labeled Group: a titled group keeps its children inside and moves them', async ({
  page,
}) => {
  await open(page, 'labeled-group')

  const group = node(page, 'group')
  const title = group.getByTestId('labeled-group-title')
  await expect(title).toHaveText('Group label')

  const groupBox = await box(group)
  const titleBox = await box(title)
  expect(titleBox.x - groupBox.x).toBeLessThan(4)
  expect(titleBox.y - groupBox.y).toBeLessThan(4)

  const children = await Promise.all(
    ['child-a', 'child-b'].map((id) => box(node(page, id)))
  )

  for (const child of children) {
    expect(child.x).toBeGreaterThanOrEqual(groupBox.x)
    expect(child.y).toBeGreaterThanOrEqual(groupBox.y)
    expect(child.x + child.width).toBeLessThanOrEqual(
      groupBox.x + groupBox.width
    )
    expect(child.y + child.height).toBeLessThanOrEqual(
      groupBox.y + groupBox.height
    )
  }

  // Children use `extent: 'parent'`: a drag past the group edge stops there.
  const child = await centre(node(page, 'child-b'))
  await drag(page, child, { x: child.x + 400, y: child.y + 400 })
  await expect
    .poll(async () => await reportedPosition(page, 'child-b'))
    .toEqual({ x: 260, y: 216 })

  // Dragging the group by its title moves the children with it.
  const before = await box(node(page, 'child-a'))
  const grip = await centre(title)
  await drag(page, grip, { x: grip.x + 100, y: grip.y + 50 })
  await expect
    .poll(async () => await boxX(node(page, 'child-a')))
    .toBeCloseTo(before.x + 100, 0)
  expect(await reportedPosition(page, 'child-a')).toEqual({ x: 30, y: 60 })
})
