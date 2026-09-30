import { expect, test } from '@playwright/test'

import type { JavaScriptFlowController } from '../src/public.ts'

type PortalTestController = Pick<
  JavaScriptFlowController,
  'mountViewportPortal' | 'setViewport' | 'destroy'
>

declare global {
  var __viewportPortalControllers:
    | { first: PortalTestController; second: PortalTestController }
    | undefined

  var __viewportPortalState:
    | {
        readonly activations: { value: number }
        readonly before: HTMLElement
        readonly after: HTMLElement
        readonly original: HTMLElement
        readonly parent: HTMLElement
        readonly detached: HTMLElement
        readonly duplicateRejections: readonly boolean[]
        readonly disposeExtra: () => void
        readonly disposeFirst: () => void
        readonly disposeDetached: () => void
      }
    | undefined
}

test('Vanilla graph-space viewport portals follow transforms and restore caller DOM', async ({
  page,
}) => {
  await page.goto('/')

  await page.evaluate(async () => {
    const { mountFlow } = await import('../src/public.ts')
    const firstRoot = document.querySelector<HTMLElement>('#app')

    if (!firstRoot) {
      throw new Error('Missing app root')
    }

    const graph = { nodes: [], edges: [] }

    const options = {
      documentMode: 'uncontrolled' as const,
      viewport: {
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 3 },
        mode: 'uncontrolled' as const,
      },
    }

    const first = mountFlow(firstRoot, graph, options)
    const secondRoot = document.createElement('div')
    secondRoot.id = 'second-flow'
    secondRoot.style.cssText =
      'position:absolute;left:0;top:1000px;width:300px;height:240px'
    document.body.append(secondRoot)
    const second = mountFlow(secondRoot, graph, options)

    const original = document.createElement('div')
    original.id = 'portal-original'
    const before = document.createElement('span')
    before.id = 'portal-before'
    const after = document.createElement('span')
    after.id = 'portal-after'
    const parent = document.createElement('div')
    parent.id = 'portal-parent'
    parent.append(before, original, after)
    document.body.append(parent)

    const child = document.createElement('button')
    child.id = 'viewport-portal-button'
    child.textContent = 'Portal action'
    child.style.cssText = 'position:absolute;left:40px;top:50px'
    const activations = { value: 0 }
    child.addEventListener('click', () => {
      activations.value += 1
    })
    original.append(child)
    const disposeFirst = first.mountViewportPortal(original)

    const duplicateRejections = [first, second].map((controller) => {
      try {
        controller.mountViewportPortal(original)

        return false
      } catch (error) {
        return (
          error instanceof Error &&
          error.message === 'ViewportPortalElementAlreadyMounted'
        )
      }
    })

    const firstExtra = document.createElement('div')
    firstExtra.id = 'first-extra-portal'
    document.body.append(firstExtra)
    const disposeExtra = first.mountViewportPortal(firstExtra)

    const secondContent = document.createElement('div')
    secondContent.id = 'second-viewport-portal'
    second.mountViewportPortal(secondContent)

    const detached = document.createElement('div')
    detached.id = 'detached-portal'
    const disposeDetached = first.mountViewportPortal(detached)

    Object.assign(globalThis, {
      __viewportPortalControllers: { first, second },
      __viewportPortalState: {
        parent,
        original,
        before,
        after,
        child,
        firstExtra,
        detached,
        duplicateRejections,
        disposeFirst,
        disposeExtra,
        disposeDetached,
        activations,
      },
    })
  })

  const portal = page.locator('#viewport-portal-button')
  await expect(portal).toBeVisible()
  await expect(page.locator('#app .flow-viewport-portal-layer')).toHaveCount(3)

  const firstPortalLayer = page
    .locator('#app .flow-viewport-portal-layer')
    .first()

  await expect(firstPortalLayer).toHaveClass(/\bnopan\b/u)
  await expect(firstPortalLayer).toHaveClass(/\bnodrag\b/u)
  await expect(firstPortalLayer).toHaveClass(/\bnowheel\b/u)
  await expect(firstPortalLayer).toHaveAttribute('data-flow-no-pan', '')
  await expect(firstPortalLayer).toHaveAttribute('data-flow-no-drag', '')
  await expect(firstPortalLayer).toHaveAttribute('data-flow-no-wheel', '')

  await expect(
    page.locator('#second-flow .flow-viewport-portal-layer')
  ).toHaveCount(1)
  await expect(page.locator('#app #second-viewport-portal')).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__viewportPortalState?.duplicateRejections)
    )
    .toEqual([true, true])

  const initialBox = await portal.boundingBox()

  if (!initialBox) {
    throw new Error('Missing portal child bounds')
  }

  const canvasBox = await page.locator('#app .flow-canvas').boundingBox()

  if (!canvasBox) {
    throw new Error('Missing first canvas bounds')
  }

  await page.evaluate(async () => {
    if (!globalThis.__viewportPortalControllers) {
      throw new Error('Missing portal controllers')
    }

    await globalThis.__viewportPortalControllers.first.setViewport({
      x: 23,
      y: 31,
      zoom: 1.75,
    })
  })
  const transformedBox = await portal.boundingBox()

  if (!transformedBox) {
    throw new Error('Missing transformed portal child bounds')
  }

  const graphOffsetX = initialBox.x - canvasBox.x
  expect(transformedBox.x - initialBox.x).toBeCloseTo(
    23 + graphOffsetX * 0.75,
    0
  )
  expect(transformedBox.width / initialBox.width).toBeCloseTo(1.75, 1)

  const viewportBeforeInput = await page
    .locator('#app .flow-viewport')
    .getAttribute('style')

  await portal.click()
  await portal.focus()
  await page.keyboard.press('Enter')

  const interactionBox = await portal.boundingBox()

  if (!interactionBox) {
    throw new Error('Missing portal interaction bounds')
  }

  await page.mouse.move(interactionBox.x + 10, interactionBox.y + 10)
  await page.mouse.down()
  await page.mouse.move(interactionBox.x + 50, interactionBox.y + 45)
  await page.mouse.up()

  const viewportAfterPointer = await page
    .locator('#app .flow-viewport')
    .getAttribute('style')

  await page.mouse.move(
    interactionBox.x + interactionBox.width / 2,
    interactionBox.y + interactionBox.height / 2
  )
  await page.mouse.wheel(0, 180)

  const viewportAfterWheel = await page
    .locator('#app .flow-viewport')
    .getAttribute('style')

  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__viewportPortalState?.activations.value)
    )
    .toBe(2)

  expect(viewportAfterPointer).toBe(viewportBeforeInput)
  expect(viewportAfterWheel).toBe(viewportBeforeInput)

  await page.evaluate(() => {
    const state = globalThis.__viewportPortalState
    const controllers = globalThis.__viewportPortalControllers

    if (!state || !controllers) {
      throw new Error('Missing portal test state')
    }

    controllers.first.destroy()
    controllers.second.destroy()
    state.disposeFirst()
    state.disposeFirst()
    state.disposeExtra()
    state.disposeExtra()
    state.disposeDetached()
    state.disposeDetached()
  })
  await expect(page.locator('#portal-parent')).toHaveJSProperty(
    'children.length',
    3
  )
  await expect(page.locator('#portal-before')).toHaveJSProperty(
    'nextElementSibling.id',
    'portal-original'
  )
  await expect(page.locator('#portal-original')).toHaveJSProperty(
    'nextElementSibling.id',
    'portal-after'
  )
  await expect(page.locator('body > #first-extra-portal')).toHaveCount(1)
  await expect(page.locator('#second-viewport-portal')).toHaveCount(0)
  expect(
    await page.evaluate(() => {
      const detached = globalThis.__viewportPortalState?.detached

      return detached !== undefined && detached.parentNode === null
    })
  ).toBe(true)
})
