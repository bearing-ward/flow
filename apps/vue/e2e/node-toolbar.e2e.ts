import { expect, test } from '@playwright/test'

test('Vue FlowNodeToolbar follows measured nodes in a per-canvas screen layer', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueNodeToolbarFixture } =
      await import('../src/node-toolbar-test.ts')

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue node toolbar fixture mount point is missing')
    }

    const cleanup = mountVueNodeToolbarFixture(root)
    root.addEventListener('flow-node-toolbar-fixture-destroy', cleanup, {
      once: true,
    })
  })

  const canvas = page.locator('.flow-vue-canvas').first()
  const toolbar = page.getByTestId('toolbar-default')
  const forced = page.getByTestId('toolbar-forced')
  const isolated = page.getByTestId('toolbar-isolated')

  await expect(page.locator('.flow-vue-canvas')).toHaveCount(2)
  await expect(toolbar).toBeVisible()
  await expect(forced).toBeVisible()
  await expect(isolated).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__flowVueNodeToolbar?.internalNode('toolbar-a')
            ?.measurementStatus
      )
    )
    .toBe('measured')

  const owners = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('.flow-vue-canvas')]

    const toolbarElements = [
      ...document.querySelectorAll('.flow-vue-node-toolbar'),
    ]

    const layers = [
      ...document.querySelectorAll('.flow-vue-node-toolbar-layer'),
    ]

    const ownerIndex = (element: Element): number => {
      const owner = element.closest('.flow-vue-canvas')

      return owner === null ? -1 : canvases.indexOf(owner)
    }

    return {
      toolbarOwners: toolbarElements.map(ownerIndex),
      targetsDistinct: layers.length === 2 && layers[0] !== layers[1],
      targetOwners: layers.map(ownerIndex),
    }
  })

  expect(owners).toEqual({
    toolbarOwners: [0, 0, 1],
    targetsDistinct: true,
    targetOwners: [0, 1],
  })

  const node = page.locator('.flow-vue-node[data-node-id="toolbar-a"]')
  const nodeBox = await node.boundingBox()
  const toolbarBox = await toolbar.boundingBox()
  expect(nodeBox).not.toBeNull()
  expect(toolbarBox).not.toBeNull()

  if (nodeBox === null || toolbarBox === null) {
    throw new Error('Node or toolbar bounds are unavailable')
  }

  expect(toolbarBox.x + toolbarBox.width / 2).toBeCloseTo(
    nodeBox.x + nodeBox.width / 2,
    0
  )
  expect(nodeBox.y - toolbarBox.y - toolbarBox.height).toBeCloseTo(10, 0)

  const initialMeasuredWidth = await page.evaluate(
    () => window.__flowVueNodeToolbar?.internalNode('toolbar-a')?.width
  )

  expect(initialMeasuredWidth).toBeDefined()
  await page.evaluate(() =>
    window.__flowVueNodeToolbar?.resizeNodeDom('toolbar-a', 230, 110)
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__flowVueNodeToolbar?.internalNode('toolbar-a')?.width
      )
    )
    .toBeGreaterThan(initialMeasuredWidth ?? 0)
  const resizedNodeBox = await node.boundingBox()
  const resizedToolbarBox = await toolbar.boundingBox()
  expect(resizedNodeBox).not.toBeNull()
  expect(resizedToolbarBox).not.toBeNull()

  if (resizedNodeBox === null || resizedToolbarBox === null) {
    throw new Error('Resized node or toolbar bounds are unavailable')
  }

  expect(resizedToolbarBox.x + resizedToolbarBox.width / 2).toBeCloseTo(
    resizedNodeBox.x + resizedNodeBox.width / 2,
    0
  )

  const initialSize = { width: toolbarBox.width, height: toolbarBox.height }
  await page.evaluate(() =>
    window.__flowVueNodeToolbar?.setViewport({ x: 60, y: 45, zoom: 1.5 })
  )
  await expect
    .poll(async () => {
      const currentBox = await node.boundingBox()

      return currentBox?.x
    })
    .not.toBe(nodeBox.x)

  const zoomedNodeBox = await node.boundingBox()
  const zoomedToolbarBox = await toolbar.boundingBox()
  expect(zoomedNodeBox).not.toBeNull()
  expect(zoomedToolbarBox).not.toBeNull()

  if (zoomedNodeBox === null || zoomedToolbarBox === null) {
    throw new Error('Zoomed node or toolbar bounds are unavailable')
  }

  expect(zoomedToolbarBox.width).toBeCloseTo(initialSize.width, 0)
  expect(zoomedToolbarBox.height).toBeCloseTo(initialSize.height, 0)
  expect(zoomedToolbarBox.x + zoomedToolbarBox.width / 2).toBeCloseTo(
    zoomedNodeBox.x + zoomedNodeBox.width / 2,
    0
  )
  expect(
    zoomedNodeBox.y - zoomedToolbarBox.y - zoomedToolbarBox.height
  ).toBeCloseTo(10, 0)

  const forcedNode = page.locator('.flow-vue-node[data-node-id="toolbar-b"]')
  const forcedBox = await forced.boundingBox()
  const forcedNodeBox = await forcedNode.boundingBox()
  expect(forcedBox).not.toBeNull()
  expect(forcedNodeBox).not.toBeNull()

  if (forcedBox === null || forcedNodeBox === null) {
    throw new Error('Forced toolbar or target node bounds are unavailable')
  }

  expect(forcedBox.x).toBeCloseTo(forcedNodeBox.x + forcedNodeBox.width + 12, 0)
  expect(forcedBox.y + forcedBox.height).toBeCloseTo(
    forcedNodeBox.y + forcedNodeBox.height,
    0
  )

  const beforeNativeInteraction = await page.evaluate(() =>
    window.__flowVueNodeToolbar?.getViewport()
  )

  await page.getByTestId('toolbar-action').click()
  await expect
    .poll(() => page.evaluate(() => window.__flowVueNodeToolbar?.clicks()))
    .toBe(1)
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="toolbar-action"]')
    button?.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 })
    )
    button?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      })
    )
    button?.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 20,
        clientY: 20,
      })
    )
    button?.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      })
    )
  })

  const afterNativeInteraction = await page.evaluate(() =>
    window.__flowVueNodeToolbar?.getViewport()
  )

  expect(afterNativeInteraction).toEqual(beforeNativeInteraction)

  await page.evaluate(() =>
    window.__flowVueNodeToolbar?.select(['toolbar-a', 'toolbar-b'])
  )
  await expect(toolbar).toBeHidden()
  await expect(forced).toBeVisible()
  await page.evaluate(() => window.__flowVueNodeToolbar?.select(['toolbar-a']))
  await expect(toolbar).toBeVisible()

  await page.evaluate(() => window.__flowVueNodeToolbar?.hide('toolbar-b'))
  await expect(forced).toBeHidden()
  await page.evaluate(() =>
    window.__flowVueNodeToolbar?.updateNode('toolbar-b', { hidden: false })
  )
  await expect(forced).toBeVisible()
  await page.evaluate(() => window.__flowVueNodeToolbar?.remove('toolbar-b'))
  await expect(forced).toHaveCount(0)

  await page.evaluate(() => window.__flowVueNodeToolbar?.hide('toolbar-a'))
  await expect(toolbar).toBeHidden()
  await page.evaluate(() =>
    window.__flowVueNodeToolbar?.updateNode('toolbar-a', { hidden: false })
  )
  await expect(toolbar).toBeVisible()
  await page.evaluate(() => window.__flowVueNodeToolbar?.remove('toolbar-a'))
  await expect(toolbar).toHaveCount(0)

  await page.evaluate(() => window.__flowVueNodeToolbar?.showToolbar(false))
  await expect(toolbar).toHaveCount(0)
  await page.evaluate(() => window.__flowVueNodeToolbar?.showToolbar(true))
  await expect(toolbar).toHaveCount(0)

  await page.evaluate(() => window.__flowVueNodeToolbar?.unmount())
  await expect(canvas).toHaveCount(0)
})
