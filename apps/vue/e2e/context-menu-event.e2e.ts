import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const mount = async (
  page: Page,
  panOnDrag: boolean | readonly number[],
  preventDefault: boolean
) => {
  await page.goto('/test.html')
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
    { panOnDrag, preventDefault }
  )
}

const observations = async (page: Page) =>
  JSON.parse(
    (await page.getByTestId('context-observations').textContent()) ?? '{}'
  )

const paneContextMenu = async (page: Page) => {
  const bounds = await page.getByTestId('flow-canvas').boundingBox()

  if (bounds === null) {
    throw new Error('Missing pane')
  }

  await page.mouse.click(bounds.x + 800, bounds.y + 400, { button: 'right' })
}

test('paneContextMenu retains its position and adds the cancellable browser event', async ({
  page,
}) => {
  await mount(page, true, true)
  await paneContextMenu(page)
  expect(await observations(page)).toEqual({
    calls: [
      {
        position: { x: 800, y: 400 },
        mouseEvent: true,
        type: 'contextmenu',
        defaultPrevented: true,
      },
    ],
    defaults: [true],
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
          position: { x: 800, y: 400 },
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
  })
}

for (const button of ['left', 'right'] as const) {
  test(`panOnDrag [2] admits only right-button panning, using ${button}`, async ({
    page,
  }) => {
    await mount(page, [2], false)
    const canvas = page.getByTestId('flow-canvas')
    const bounds = await canvas.boundingBox()

    if (bounds === null) {
      throw new Error('Missing pane')
    }

    const viewport = page.locator('.flow-vue-viewport')
    const before = await viewport.getAttribute('style')
    await page.mouse.move(bounds.x + 100, bounds.y + 100)
    await page.mouse.down({ button })
    await page.mouse.move(bounds.x + 160, bounds.y + 130, { steps: 4 })
    await page.mouse.up({ button })

    await (button === 'right'
      ? expect(viewport).not.toHaveAttribute('style', before ?? '')
      : expect(viewport).toHaveAttribute('style', before ?? ''))
  })
}
