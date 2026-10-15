import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type {
  FlowInternalNode,
  FlowNode,
} from '../../packages/core/src/public.ts'

export interface LiveInternalFixture {
  readonly internal: (id: string) => FlowInternalNode | undefined
  readonly node: (id: string) => Readonly<FlowNode> | undefined
  readonly nodes: () => readonly Readonly<FlowNode>[]
}

declare global {
  interface Window {
    __flowLiveInternal?: LiveInternalFixture
  }
}

const node = (page: Page, id: string) =>
  page.locator(`[data-testid="flow-node"][data-node-id="${id}"]`)

const box = async (page: Page, id: string) => {
  const rect = await node(page, id).boundingBox()

  if (rect === null) {
    throw new Error(`Missing node ${id}`)
  }

  return rect
}

const edge = async (page: Page, id: string, key: 'x' | 'width') => {
  const rect = await box(page, id)

  return rect[key]
}

const read = (page: Page, id: string) =>
  page.evaluate((nodeId) => {
    const fixture = window.__flowLiveInternal
    const internal = fixture?.internal(nodeId)
    const publicNode = fixture?.node(nodeId)
    const listed = fixture?.nodes().find((value) => value.id === nodeId)

    if (
      internal === undefined ||
      publicNode === undefined ||
      listed === undefined
    ) {
      throw new Error(`Missing instance node ${nodeId}`)
    }

    return {
      internal,
      node: publicNode,
      listed,
      frozen:
        Object.isFrozen(internal) &&
        Object.isFrozen(internal.absolutePosition) &&
        Object.isFrozen(internal.node),
    }
  }, id)

export const runLiveInternalNodeTests = (
  mount: (page: Page) => Promise<void>
) => {
  for (const id of ['solo', 'parent']) {
    test(`instance reads follow ${id} and descendants during drag and after Escape`, async ({
      page,
    }) => {
      await mount(page)
      await expect(node(page, 'child')).toBeVisible()
      const before = await box(page, id)
      const childBefore = await box(page, 'child')
      const accepted = await read(page, id)
      const acceptedChild = await read(page, 'child')
      const start = { x: before.x + 40, y: before.y + 15 }
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 60, start.y + 50, { steps: 8 })
      await expect.poll(() => edge(page, id, 'x')).toBeCloseTo(before.x + 60, 0)
      const during = await read(page, id)
      const absolute = accepted.internal.absolutePosition
      const { position } = accepted.node
      expect(during.internal.absolutePosition).toEqual({
        x: absolute.x + 60,
        y: absolute.y + 50,
      })
      expect(during.internal.node.position).toEqual({
        x: position.x + 60,
        y: position.y + 50,
      })
      expect(during.node.position).toEqual(during.internal.node.position)
      expect(during.listed.position).toEqual(during.internal.node.position)
      expect(during.frozen).toBe(true)

      if (id === 'parent') {
        const child = await read(page, 'child')
        const childAbsolute = acceptedChild.internal.absolutePosition
        expect(child.internal.absolutePosition).toEqual({
          x: childAbsolute.x + 60,
          y: childAbsolute.y + 50,
        })
        expect(child.internal.node.position).toEqual(
          acceptedChild.internal.node.position
        )
        expect(await edge(page, 'child', 'x')).toBeCloseTo(
          childBefore.x + 60,
          0
        )
      }

      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect.poll(() => edge(page, id, 'x')).toBeCloseTo(before.x, 0)
      const restored = await read(page, id)
      const restoredChild = await read(page, 'child')
      expect(restored.internal.absolutePosition).toEqual(
        accepted.internal.absolutePosition
      )
      expect(restoredChild.internal.absolutePosition).toEqual(
        acceptedChild.internal.absolutePosition
      )
    })
  }

  test('instance geometry reports resize dimensions before release', async ({
    page,
  }) => {
    await mount(page)
    await node(page, 'solo').click()
    const before = await box(page, 'solo')

    const control = node(page, 'solo').locator(
      '[data-direction="bottom-right"]'
    )

    const handle = await control.boundingBox()

    if (handle === null) {
      throw new Error('Missing resize handle')
    }

    const start = {
      x: handle.x + handle.width / 2,
      y: handle.y + handle.height / 2,
    }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 50, start.y + 40, { steps: 6 })
    await expect
      .poll(() => edge(page, 'solo', 'width'))
      .toBeGreaterThan(before.width)
    const during = await read(page, 'solo')
    const drawn = await box(page, 'solo')
    expect(during.internal.width).toBeCloseTo(drawn.width, 0)
    expect(during.internal.height).toBeCloseTo(drawn.height, 0)
    expect(during.internal.node.size?.width).toBeCloseTo(drawn.width, 0)
    expect(during.node.measured?.width).toBeCloseTo(drawn.width, 0)
    expect(during.listed.measured?.height).toBeCloseTo(drawn.height, 0)
    await page.mouse.up()
  })

  test('instance reads keyboard resize previews and restores geometry on Escape', async ({
    page,
  }) => {
    await mount(page)
    await node(page, 'solo').click()
    const before = await box(page, 'solo')
    const accepted = await read(page, 'solo')
    await node(page, 'solo').locator('[data-direction="top-left"]').focus()
    await page.keyboard.down('ArrowLeft')
    await expect
      .poll(() => edge(page, 'solo', 'width'))
      .toBeGreaterThan(before.width)
    const during = await read(page, 'solo')
    const drawn = await box(page, 'solo')
    expect(during.internal.width).toBeCloseTo(drawn.width, 0)
    expect(during.internal.height).toBeCloseTo(drawn.height, 0)
    expect(during.internal.absolutePosition.x).toBeCloseTo(
      accepted.internal.absolutePosition.x + drawn.x - before.x,
      0
    )
    expect(during.internal.node.position.x).toBeCloseTo(
      accepted.internal.node.position.x + drawn.x - before.x,
      0
    )
    await page.keyboard.press('Escape')
    await page.keyboard.up('ArrowLeft')
    await expect
      .poll(() => edge(page, 'solo', 'width'))
      .toBeCloseTo(before.width, 0)
    const restored = await read(page, 'solo')
    expect(restored.internal).toEqual(accepted.internal)
  })
}
