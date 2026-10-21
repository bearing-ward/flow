import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { conformanceFixtures } from '../../../packages/conformance/src/index.ts'
import type { ConformanceFixture } from '../../../packages/conformance/src/index.ts'
import { createFoldkitConformanceAdapter } from './conformance.ts'

const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

if (base === undefined) {
  throw new Error('Missing keyed-update fixture')
}

const fixture = {
  ...base,
  documentMode: 'controlled',
  actions: [],
  document: {
    edges: [],
    nodes: [
      {
        id: 'parent',
        label: 'Parent',
        position: { x: 100, y: 100 },
        size: { width: 300, height: 190 },
        selected: true,
      },
      {
        id: 'child',
        label: 'Child',
        parentId: 'parent',
        extent: 'parent',
        position: { x: 20, y: 30 },
        size: { width: 20, height: 10 },
      },
    ],
  },
} satisfies ConformanceFixture

const geometry = (node: Locator) =>
  node.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const style = getComputedStyle(element)

    return {
      x: Number(style.left.replace('px', '')),
      y: Number(style.top.replace('px', '')),
      width: bounds.width,
      height: bounds.height,
    }
  })

const mount = async (page: Page) => {
  const adapter = createFoldkitConformanceAdapter(page)
  await adapter.mount(fixture)
  const parent = page.locator('[data-node-id="parent"]')
  await expect(parent).toBeVisible()
  await page.addStyleTag({
    content:
      '[data-node-id="child"] { width: 160px !important; height: 72px !important; min-width: 0 !important; min-height: 0 !important; box-sizing: border-box !important; }',
  })
  await page.evaluate(() =>
    window.__flowFoldkitTest?.attachResizeMeasurementObserver()
  )
  await expect
    .poll(() => adapter.internalNode('parent'))
    .toMatchObject({ width: 300, height: 190, measurementStatus: 'measured' })
  await expect
    .poll(() => adapter.internalNode('child'))
    .toMatchObject({ width: 160, height: 72, measurementStatus: 'measured' })
  await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)

  return { adapter, parent, child: page.locator('[data-node-id="child"]') }
}

const preview = async (page: Page, parent: Locator, input: string) => {
  const control = parent.locator('[data-resize-direction="bottom-right"]')

  if (input === 'pointer') {
    const box = await control.boundingBox()

    if (box === null) {
      throw new Error('Missing resize control')
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      box.x + box.width / 2 - 240,
      box.y + box.height / 2 - 160,
      {
        steps: 8,
      }
    )
  } else {
    await control.focus()
    await page.keyboard.down('ArrowLeft')
    await control.evaluate((element) => {
      for (const key of ['ArrowLeft', 'ArrowUp']) {
        for (let step = 0; step < 60; step += 1) {
          element.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              repeat: true,
              bubbles: true,
              cancelable: true,
            })
          )
        }
      }
    })
  }
}

for (const input of ['pointer', 'keyboard']) {
  test(`Foldkit ${input} immediate controlled acknowledgement retains measured readiness without a rejected render`, async ({
    page,
  }) => {
    const { adapter, parent, child } = await mount(page)
    const acceptedBeforeGesture = await adapter.acceptedStates()
    await preview(page, parent, input)
    await expect
      .poll(() => geometry(parent))
      .toEqual({ x: 100, y: 100, width: 180, height: 102 })
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__flowFoldkitTest
            ?.resizeMeasurements()
            .findLast(({ nodeId }) => nodeId === 'parent')
        )
      )
      .toEqual({ nodeId: 'parent', width: 180, height: 102 })
    expect(await adapter.internalNode('parent')).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'measured',
    })
    expect(await adapter.acceptedStates()).toEqual(acceptedBeforeGesture)
    await page.evaluate(
      (document) => window.__flowFoldkitTest?.acknowledgeNextResize(document),
      fixture.document
    )
    await (input === 'pointer'
      ? page.mouse.up()
      : page.keyboard.up('ArrowLeft'))
    await expect
      .poll(() => adapter.readState({ nodeId: 'parent' }))
      .toMatchObject({ node: { size: { width: 180, height: 102 } } })
    await expect
      .poll(() => geometry(parent))
      .toEqual({ x: 100, y: 100, width: 180, height: 102 })
    await expect
      .poll(() => geometry(child))
      .toEqual({ x: 120, y: 130, width: 160, height: 72 })
    await expect
      .poll(() => adapter.internalNode('parent'))
      .toMatchObject({ width: 180, height: 102, measurementStatus: 'measured' })
    await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)
    expect(await adapter.changeKinds()).toEqual(['node-bounds'])
    await adapter.destroy()
  })
}

test('Foldkit fixed CSS child remains measured after declared size changes and constrains a fresh parent resize', async ({
  page,
}) => {
  const { adapter, parent, child } = await mount(page)

  const document = {
    ...fixture.document,
    nodes: fixture.document.nodes.map((node) =>
      node.id === 'child' ? { ...node, size: { width: 30, height: 10 } } : node
    ),
  }

  await adapter.perform({ kind: 'update-document', document })
  await expect
    .poll(() => adapter.readState({ nodeId: 'child' }))
    .toMatchObject({ node: { size: { width: 30, height: 10 } } })
  await expect
    .poll(() => geometry(child))
    .toEqual({ x: 120, y: 130, width: 160, height: 72 })
  await preview(page, parent, 'pointer')
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => window.__flowFoldkitTest?.changes().at(-1)))
    .toMatchObject({ kind: 'node-bounds', size: { width: 180, height: 102 } })
  await expect
    .poll(() => adapter.internalNode('child'))
    .toMatchObject({ width: 160, height: 72, measurementStatus: 'measured' })
  await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)
  await expect
    .poll(() => geometry(parent))
    .toEqual({ x: 100, y: 100, width: 300, height: 190 })
  await adapter.destroy()
})

test('Foldkit acknowledgement preserves a production observer measurement delivered after release without a preview sample', async ({
  page,
}) => {
  const { adapter, parent, child } = await mount(page)
  await page.addStyleTag({
    content:
      '[data-node-id="parent"] { width: 300px !important; height: 190px !important; }',
  })
  await preview(page, parent, 'keyboard')
  await page.evaluate(() => {
    const { promise, resolve } = Promise.withResolvers<null>()

    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))

    return promise
  })
  await page.keyboard.up('ArrowLeft')
  await expect
    .poll(() => page.evaluate(() => window.__flowFoldkitTest?.changes().at(-1)))
    .toMatchObject({ kind: 'node-bounds', size: { width: 180, height: 102 } })
  await expect
    .poll(() => geometry(parent))
    .toEqual({ x: 100, y: 100, width: 300, height: 190 })
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest
        ?.resizeMeasurements()
        .filter(
          ({ nodeId, width, height }) =>
            nodeId === 'parent' && width === 180 && height === 102
        )
    )
  ).toEqual([])
  await page.addStyleTag({
    content:
      '[data-node-id="parent"] { width: 180px !important; height: 102px !important; }',
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__flowFoldkitTest
          ?.resizeMeasurements()
          .findLast(({ nodeId }) => nodeId === 'parent')
      )
    )
    .toEqual({ nodeId: 'parent', width: 180, height: 102 })
  await expect
    .poll(() => adapter.internalNode('parent'))
    .toMatchObject({ width: 180, height: 102, measurementStatus: 'measured' })
  await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)
  expect(await adapter.readState({ nodeId: 'parent' })).toMatchObject({
    node: { size: { width: 300, height: 190 } },
  })
  await adapter.perform({
    kind: 'update-document',
    document: {
      ...fixture.document,
      nodes: fixture.document.nodes.map((node) =>
        node.id === 'parent'
          ? { ...node, size: { width: 180, height: 102 } }
          : node
      ),
    },
  })
  await expect
    .poll(() => adapter.readState({ nodeId: 'parent' }))
    .toMatchObject({ node: { size: { width: 180, height: 102 } } })
  await expect
    .poll(() => adapter.internalNode('parent'))
    .toMatchObject({ width: 180, height: 102, measurementStatus: 'measured' })
  await expect.poll(() => adapter.nodesInitialized(false)).toBe(true)
  await expect
    .poll(() => geometry(parent))
    .toEqual({ x: 100, y: 100, width: 180, height: 102 })
  await expect
    .poll(() => geometry(child))
    .toEqual({ x: 120, y: 130, width: 160, height: 72 })
  expect(await adapter.changeKinds()).toEqual(['node-bounds'])
  await adapter.destroy()
})
