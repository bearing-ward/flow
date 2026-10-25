import {
  FlowDocumentSchema,
  FlowHistoryStatusSchema,
  ViewportSchema,
} from '@flow/core'
import type { FlowHistoryStatus } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { Schema as S } from 'effect'

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true })

const node = (page: Page, id: string) =>
  page.locator(`main .flow-vue-node[data-node-id="${id}"]`)

const edge = (page: Page, id: string) =>
  page.locator(`main .flow-vue-edge[data-edge-id="${id}"]`)

const documentOf = async (page: Page, selector = '#history-document') =>
  S.decodeUnknownSync(FlowDocumentSchema)(
    JSON.parse((await page.locator(selector).textContent()) ?? '')
  )

const status = async (page: Page) =>
  S.decodeUnknownSync(FlowHistoryStatusSchema)(
    JSON.parse((await page.locator('#history-status').textContent()) ?? '')
  )

const historyValue = async <K extends keyof FlowHistoryStatus>(
  page: Page,
  key: K
): Promise<FlowHistoryStatus[K]> => {
  const current = await status(page)

  return current[key]
}

const position = async (page: Page, id = 'a') => {
  const document = await documentOf(page)

  return document.nodes.find((candidate) => candidate.id === id)?.position
}

const box = async (locator: Locator) => {
  const bounds = await locator.boundingBox()

  if (bounds === null) {
    throw new Error('Expected a rendered graph element')
  }

  return bounds
}

const expectRenderedPosition = async (
  page: Page,
  scope: 'main' | '#isolated',
  id: string,
  expected: { x: number; y: number }
) => {
  const element = page.locator(`${scope} .flow-vue-node[data-node-id="${id}"]`)
  const viewportElement = page.locator(`${scope} .flow-vue-viewport`)

  await expect(element).toHaveCSS('left', `${expected.x}px`)
  await expect(element).toHaveCSS('top', `${expected.y}px`)

  const viewport = S.decodeUnknownSync(ViewportSchema)(
    await page.evaluate((isolated) => {
      const fixture = globalThis.vueHistoryFixture
      const flow = isolated ? fixture?.isolated() : fixture?.flow

      return flow?.getViewport()
    }, scope === '#isolated')
  )

  await expect(viewportElement).toHaveCSS(
    'transform',
    `matrix(${viewport.zoom}, 0, 0, ${viewport.zoom}, ${viewport.x}, ${viewport.y})`
  )

  const [rendered, origin] = await Promise.all([
    box(element),
    box(viewportElement),
  ])

  expect(rendered.x).toBeCloseTo(origin.x + expected.x * viewport.zoom, 5)
  expect(rendered.y).toBeCloseTo(origin.y + expected.y * viewport.zoom, 5)
}

const expectPosition = async (
  page: Page,
  expected: { x: number; y: number }
) => {
  await expect.poll(() => position(page)).toEqual(expected)
  await expectRenderedPosition(page, 'main', 'a', expected)
}

const open = async (page: Page, query = '') => {
  await page.goto(`/history/${query}`)
  await expect(node(page, 'a')).toBeVisible()
}

for (const action of [
  'Add node',
  'Add edge',
  'Delete node',
  'Delete edge',
  'Move node',
  'Move edge',
]) {
  test(`${action} restores exact saved graphs and rendered membership`, async ({
    page,
  }) => {
    await open(page)
    const baseline = await documentOf(page)
    await expectPosition(page, { x: 100, y: 100 })
    await expect(button(page, 'Undo')).toBeDisabled()
    await expect(button(page, 'Redo')).toBeDisabled()

    await button(page, action).click()
    await expect(button(page, 'Undo')).toBeEnabled()
    const edited = await documentOf(page)
    expect(edited).not.toEqual(baseline)

    if (action === 'Add node') {
      await expect(node(page, 'new-1')).toBeVisible()
    }

    if (action === 'Add edge') {
      await expect(edge(page, 'new-edge-1')).toHaveCount(1)
    }

    if (action === 'Delete node') {
      await expect(node(page, 'b')).toHaveCount(0)
      await expect(edge(page, 'ab')).toHaveCount(0)
    }

    if (action === 'Delete edge') {
      await expect(edge(page, 'ab')).toHaveCount(0)
    }

    if (action === 'Move node') {
      await expectPosition(page, { x: 180, y: 180 })
    }

    if (action === 'Move edge') {
      expect(
        edited.edges.find((candidate) => candidate.id === 'ab')?.target
      ).toBe('c')
    }

    await button(page, 'Undo').click()
    await expect.poll(() => documentOf(page)).toEqual(baseline)
    await expect(node(page, 'b')).toBeVisible()
    await expect(edge(page, 'ab')).toHaveCount(1)
    await expectPosition(page, { x: 100, y: 100 })
    await button(page, 'Redo').click()
    await expect.poll(() => documentOf(page)).toEqual(edited)
    await button(page, 'Undo').click()
    await expect.poll(() => documentOf(page)).toEqual(baseline)

    await button(page, 'Add node').click()
    await expect(button(page, 'Redo')).toBeDisabled()
  })
}

test('one drag, cancelled preview and repeated arrow movement form semantic history steps', async ({
  page,
}) => {
  await open(page)
  const baseline = await documentOf(page)
  const before = await box(node(page, 'a'))
  await page.mouse.move(before.x + 30, before.y + 20)
  await page.mouse.down()
  await page.mouse.move(before.x + 90, before.y + 60, { steps: 8 })
  await page.mouse.up()
  await expectPosition(page, { x: 160, y: 140 })
  expect(await historyValue(page, 'pastCount')).toBe(1)
  await button(page, 'Undo').click()
  await expect.poll(() => documentOf(page)).toEqual(baseline)
  const restored = await box(node(page, 'a'))
  await page.mouse.move(restored.x + 30, restored.y + 20)
  await page.mouse.down()
  await page.mouse.move(restored.x + 90, restored.y + 60, { steps: 4 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect.poll(() => documentOf(page)).toEqual(baseline)
  expect(await historyValue(page, 'pastCount')).toBe(0)
  await node(page, 'a').click({ position: { x: 30, y: 20 } })
  await node(page, 'a').focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.down('ArrowRight')
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expectPosition(page, { x: 115, y: 100 })
  expect(await historyValue(page, 'pastCount')).toBe(1)
  await button(page, 'Undo').click()
  await expectPosition(page, { x: 100, y: 100 })
})

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier} undo/redo shortcuts remain scoped to the focused canvas`, async ({
    page,
  }) => {
    await open(page)
    await button(page, 'Move node').click()
    await node(page, 'a').focus()
    await page.keyboard.press(`${modifier}+z`)
    await expectPosition(page, { x: 100, y: 100 })
    await page.keyboard.press(`${modifier}+Shift+z`)
    await expectPosition(page, { x: 180, y: 180 })
    await page.keyboard.press(`${modifier}+z`)
    await page.keyboard.press(`${modifier}+y`)
    await expectPosition(page, { x: 180, y: 180 })
    expect(await page.locator('#isolated-status').textContent()).toContain(
      '"pastCount":0'
    )
  })
}

test('native input undo and invalid edits preserve canvas history', async ({
  page,
}) => {
  await open(page)
  await button(page, 'Move node').click()
  const input = page.getByRole('textbox', { name: 'Native text' })
  await node(page, 'a').focus()
  await node(page, 'a').dispatchEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    isComposing: true,
  })
  await expectPosition(page, { x: 180, y: 180 })
  await input.focus()
  await input.pressSequentially('native undo')
  await input.press('ControlOrMeta+z')
  await expect(input).toHaveValue('')
  await expectPosition(page, { x: 180, y: 180 })
  expect(await historyValue(page, 'pastCount')).toBe(1)
  const saved = await documentOf(page)
  await button(page, 'Reject edit').click()
  await expect(page.locator('#history-error')).not.toBeEmpty()
  expect(await documentOf(page)).toEqual(saved)
  expect(await historyValue(page, 'pastCount')).toBe(1)
})

for (const binding of ['controlled', 'split']) {
  test(`${binding} rejection and replay require owner acceptance and matching receipt`, async ({
    page,
  }) => {
    await open(page, `?${binding}`)
    const baseline = await documentOf(page)
    await button(page, 'Pause acceptance').click()
    await button(page, 'Move node').click()
    await button(page, 'Reject proposal').click()
    expect(await documentOf(page)).toEqual(baseline)
    expect(await historyValue(page, 'pastCount')).toBe(0)
    await button(page, 'Resume acceptance').click()
    await button(page, 'Move node').click()
    await expectPosition(page, { x: 180, y: 180 })
    await button(page, 'Pause acceptance').click()
    await button(page, 'Undo').click()
    await expect.poll(() => historyValue(page, 'pending')).toBe(true)
    await expectPosition(page, { x: 180, y: 180 })
    await button(page, 'Reject proposal').click()
    await expect.poll(() => historyValue(page, 'pending')).toBe(false)
    expect(await historyValue(page, 'pastCount')).toBe(1)
    await button(page, 'Undo').click()
    await button(page, 'Accept without context').click()
    await expectPosition(page, { x: 100, y: 100 })
    await expect.poll(() => historyValue(page, 'pending')).toBe(false)
    expect(await historyValue(page, 'pastCount')).toBe(2)
    expect(await historyValue(page, 'futureCount')).toBe(0)
    const afterMissingReceipt = await status(page)
    await button(page, 'Accept proposal').click()
    expect(await status(page)).toEqual(afterMissingReceipt)
    await button(page, 'Move node').click()
    await button(page, 'Accept proposal').click()
    await expectPosition(page, { x: 180, y: 180 })
    expect(await historyValue(page, 'pastCount')).toBe(3)
    await button(page, 'Undo').click()
    await button(page, 'Accept proposal').click()
    await expectPosition(page, { x: 100, y: 100 })
    expect(await historyValue(page, 'pastCount')).toBe(2)
    expect(await historyValue(page, 'futureCount')).toBe(1)
    await button(page, 'Redo').click()
    await button(page, 'Accept proposal').click()
    await expectPosition(page, { x: 180, y: 180 })
    expect(await historyValue(page, 'pastCount')).toBe(3)
    expect(await historyValue(page, 'futureCount')).toBe(0)
    await button(page, 'Resume acceptance').click()
    await node(page, 'a').click({ position: { x: 30, y: 20 } })
    expect(await historyValue(page, 'pastCount')).toBe(3)
  })
}

test('bounded capacity, canvas isolation, disposal and reload reset', async ({
  page,
}) => {
  await open(page, '?capacity=1')
  await button(page, 'Move node').click()
  await button(page, 'Add node').click()
  expect(await historyValue(page, 'pastCount')).toBe(1)
  await button(page, 'Move isolated').click()
  await expect
    .poll(() => page.locator('#isolated-status').textContent())
    .toContain('"pastCount":1')
  await button(page, 'Undo').click()
  await expectPosition(page, { x: 180, y: 180 })
  await expect(button(page, 'Undo')).toBeDisabled()
  await button(page, 'Dispose').click()
  await expect(page.locator('main .flow-vue-canvas')).toHaveCount(0)
  await expect.poll(() => historyValue(page, 'disposed')).toBe(true)
  await page.keyboard.press('Control+z')
  await expectRenderedPosition(page, '#isolated', 'peer', { x: 140, y: 30 })
  await page.reload()
  await expectPosition(page, { x: 100, y: 100 })
  expect(await historyValue(page, 'pastCount')).toBe(0)
  expect(await historyValue(page, 'futureCount')).toBe(0)
  await open(page, '?capacity=0')
  await button(page, 'Move node').click()
  await expectPosition(page, { x: 180, y: 180 })
  expect(await historyValue(page, 'capacity')).toBe(0)
  await expect(button(page, 'Undo')).toBeDisabled()
})

for (const capacity of ['-1', '1.5', 'NaN']) {
  test(`invalid capacity ${capacity} is rejected at mount`, async ({
    page,
  }) => {
    const failures: string[] = []
    page.on('pageerror', (error) => failures.push(error.message))
    await page.goto(`/history/?capacity=${capacity}`)
    await expect.poll(() => failures.length).toBeGreaterThan(0)
    await expect(page.locator('main .flow-vue-canvas')).toHaveCount(0)
  })
}

test('queued public replay settles when its Vue scope is synchronously disposed', async ({
  page,
}) => {
  await open(page)
  await button(page, 'Move node').click()
  await expectPosition(page, { x: 180, y: 180 })
  await button(page, 'Dispose queued replay').click()
  await expect(page.locator('#queued-replay-result')).toHaveText('settled')
  await expect(page.locator('.flow-vue-canvas')).toHaveCount(0)
})

test('endpoint reconnection is one reversible edge move with restored rendered path', async ({
  page,
}) => {
  await open(page)
  const baseline = await documentOf(page)

  const originalPath = await edge(page, 'ab')
    .locator('.flow-vue-edge-path')
    .getAttribute('d')

  const source = await box(node(page, 'a'))
  const target = await box(node(page, 'b'))
  await page.mouse.click(
    (source.x + source.width + target.x) / 2,
    source.y + source.height / 2
  )

  const anchor = page.getByRole('button', {
    name: 'Reconnect target of edge ab',
    exact: true,
  })

  await expect(anchor).toBeVisible()
  const from = await box(anchor)
  const to = await box(node(page, 'c').locator('[data-handle-id="in"]'))
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    from.x + from.width / 2 + 4,
    from.y + from.height / 2 + 4
  )
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(async () => {
      const document = await documentOf(page)

      return document.edges.map((candidate) => ({
        id: candidate.id,
        target: candidate.target,
        targetHandle: candidate.targetHandle,
      }))
    })
    .toEqual([{ id: 'ab', target: 'c', targetHandle: 'in' }])
  expect(await historyValue(page, 'pastCount')).toBe(1)
  const moved = await documentOf(page)

  const movedPath = await edge(page, 'ab')
    .locator('.flow-vue-edge-path')
    .getAttribute('d')

  expect(movedPath).not.toEqual(originalPath)
  await button(page, 'Undo').click()
  await expect.poll(() => documentOf(page)).toEqual(baseline)
  await expect(edge(page, 'ab').locator('.flow-vue-edge-path')).toHaveAttribute(
    'd',
    originalPath ?? ''
  )
  await button(page, 'Redo').click()
  await expect.poll(() => documentOf(page)).toEqual(moved)
  await expect(edge(page, 'ab').locator('.flow-vue-edge-path')).toHaveAttribute(
    'd',
    movedPath ?? ''
  )
})

for (const receiptControl of ['Accept proposal', 'Accept without context']) {
  test(`ignored remote update cannot label later local acceptance through ${receiptControl}`, async ({
    page,
  }) => {
    await open(page, '?controlled')
    const baseline = await documentOf(page)

    await button(page, 'Move node').click()
    await expectPosition(page, { x: 180, y: 180 })
    const moved = await documentOf(page)

    expect(await historyValue(page, 'pastCount')).toBe(1)
    await button(page, 'Pause acceptance').click()
    await button(page, 'Propose remote document').click()
    const remote = await documentOf(page, '#history-remote-proposal')

    expect(
      remote.nodes.find((candidate) => candidate.id === 'a')?.position
    ).toEqual({ x: 300, y: 220 })
    expect(await documentOf(page)).toEqual(moved)
    expect(await historyValue(page, 'pastCount')).toBe(1)
    await button(page, 'Add node').click()
    await button(page, receiptControl).click()
    await expect
      .poll(() => documentOf(page))
      .toEqual({
        ...moved,
        nodes: [
          ...moved.nodes,
          { id: 'new-1', label: 'Added', position: { x: 160, y: 300 } },
        ],
      })
    await expect(node(page, 'new-1')).toBeVisible()
    expect(await historyValue(page, 'pastCount')).toBe(2)
    await button(page, 'Undo').click()
    await button(page, 'Accept proposal').click()
    await expect.poll(() => documentOf(page)).toEqual(moved)
    await expect(node(page, 'new-1')).toHaveCount(0)
    await expectPosition(page, { x: 180, y: 180 })
    expect(await historyValue(page, 'pastCount')).toBe(1)

    if (receiptControl === 'Accept proposal') {
      await button(page, 'Propose remote document').click()
      await button(page, 'Accept remote as local').click()
      await expectPosition(page, { x: 300, y: 220 })
      expect(await historyValue(page, 'pastCount')).toBe(2)
      await button(page, 'Undo').click()
      await button(page, 'Accept proposal').click()
      await expect.poll(() => documentOf(page)).toEqual(moved)
      expect(await historyValue(page, 'pastCount')).toBe(1)
    }

    await button(page, 'Undo').click()
    await button(page, 'Accept proposal').click()
    await expect.poll(() => documentOf(page)).toEqual(baseline)
    await expectPosition(page, { x: 100, y: 100 })
    expect(await historyValue(page, 'pastCount')).toBe(0)
  })
}
