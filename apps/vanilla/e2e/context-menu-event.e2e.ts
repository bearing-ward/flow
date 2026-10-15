import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const mount = async (
  page: Page,
  panOnDrag: boolean | readonly number[] = true,
  preventDefault = true,
  selection = false
) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(
    async (options) => {
      const path = '/src/context-menu-event-fixture.ts'
      const { mountContextMenuEventFixture } = await import(path)
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing host')
      }

      mountContextMenuEventFixture(root, options)
    },
    { panOnDrag, preventDefault, selection }
  )
  await expect(page.locator('.flow-node[data-node-id="a"]')).toBeVisible()
}

const observations = async (page: Page) =>
  JSON.parse(
    (await page.getByTestId('context-observations').textContent()) ?? '{}'
  )

const paneContextMenu = (page: Page) =>
  page
    .getByTestId('flow-canvas')
    .click({ position: { x: 800, y: 400 }, button: 'right' })

test('pane, node and edge callbacks receive the cancellable browser event', async ({
  page,
}) => {
  await mount(page)
  await paneContextMenu(page)
  await page.locator('.flow-node[data-node-id="a"]').click({ button: 'right' })
  const edge = await page.getByTestId('flow-edge-hit').boundingBox()

  if (edge === null) {
    throw new Error('Missing edge hit path')
  }

  await page.mouse.click(edge.x + edge.width / 2, edge.y + edge.height / 2, {
    button: 'right',
  })

  expect(await observations(page)).toEqual({
    calls: [
      {
        name: 'pane',
        mouseEvent: true,
        type: 'contextmenu',
        defaultPrevented: true,
      },
      {
        name: 'node',
        mouseEvent: true,
        type: 'contextmenu',
        nodeId: 'a',
        defaultPrevented: true,
      },
      {
        name: 'edge',
        mouseEvent: true,
        type: 'contextmenu',
        edgeId: 'ab',
        defaultPrevented: true,
      },
    ],
    defaults: [true, true, true],
  })
})

for (const panOnDrag of [true, false, [0]]) {
  test(`pane leaves native menu to the callback for panOnDrag ${JSON.stringify(panOnDrag)}`, async ({
    page,
  }) => {
    await mount(page, panOnDrag, false)
    await paneContextMenu(page)
    expect(await observations(page)).toEqual({
      calls: [
        {
          name: 'pane',
          mouseEvent: true,
          type: 'contextmenu',
          defaultPrevented: false,
        },
      ],
      defaults: [false],
    })
  })
}

for (const panOnDrag of [[2], [0, 2]]) {
  test(`right-button pan suppresses the pane menu for ${JSON.stringify(panOnDrag)}`, async ({
    page,
  }) => {
    await mount(page, panOnDrag, false)
    await paneContextMenu(page)
    expect(await observations(page)).toEqual({ calls: [], defaults: [true] })
    await page
      .locator('.flow-node[data-node-id="a"]')
      .click({ button: 'right' })
    expect(await observations(page)).toEqual({
      calls: [
        {
          name: 'node',
          mouseEvent: true,
          type: 'contextmenu',
          nodeId: 'a',
          defaultPrevented: false,
        },
      ],
      defaults: [true, false],
    })
  })
}

test('selection context menu carries the browser event', async ({ page }) => {
  await mount(page, true, false, true)
  await paneContextMenu(page)
  expect(await observations(page)).toEqual({
    calls: [
      {
        name: 'pane',
        mouseEvent: true,
        type: 'contextmenu',
        defaultPrevented: false,
      },
      { name: 'selection', mouseEvent: true, defaultPrevented: true },
    ],
    defaults: [true],
  })
})
