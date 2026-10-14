import { expect, test } from '@playwright/test'

declare global {
  var flowUi: {
    dot: { destroy: () => void }
    lines: { destroy: () => void }
    crosses: { destroy: () => void }
    controls: { destroy: () => void }
    secondControls: { destroy: () => void }
    calls: { zoomIn: number; fit: number }
  }

  var remountedControls: { destroy: () => void }

  var viewportBackground: {
    readonly element: SVGSVGElement
    readonly destroy: () => void
  }
}

test('public backgrounds and controls operate per host and clean up on remount', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'

    const { createFlowBackground, createFlowControls, mountFlow } =
      await import(modulePath)

    const root = document.querySelector<HTMLElement>('#app')

    if (!root) {
      throw new Error('Missing app root')
    }

    const graph = {
      nodes: [{ id: 'n', label: 'Node', position: { x: 20, y: 30 } }],
      edges: [],
    }

    const options = {
      documentMode: 'uncontrolled' as const,
      viewport: {
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 1.2 },
        mode: 'uncontrolled' as const,
      },
    }

    const first = mountFlow(root, graph, options)
    const secondRoot = document.createElement('div')
    secondRoot.id = 'second-flow'
    secondRoot.style.cssText =
      'position:absolute;inset:0;width:300px;height:240px'
    document.body.append(secondRoot)
    const second = mountFlow(secondRoot, graph, options)
    const firstCanvas = root.querySelector<HTMLElement>('.flow-canvas')

    if (!firstCanvas) {
      throw new Error('Missing first canvas')
    }

    const dot = createFlowBackground(firstCanvas, first, {
      variant: 'dots',
      gap: [24, 30],
      offset: [3, 5],
      color: '#123456',
      size: 2,
      bgColor: '#fafafa',
      id: 'first-pattern',
      className: 'decor',
      patternClassName: 'marks',
      style: { opacity: '0.8' },
    })

    const lines = createFlowBackground(firstCanvas, first, {
      variant: 'lines',
      gap: 16,
      lineWidth: 2,
    })

    const secondCanvas = secondRoot.querySelector<HTMLElement>('.flow-canvas')

    if (!secondCanvas) {
      throw new Error('Missing second canvas')
    }

    const crosses = createFlowBackground(secondCanvas, second, {
      variant: 'cross',
      gap: [18, 20],
      size: 4,
    })

    const calls = { zoomIn: 0, fit: 0 }
    const customParent = document.createElement('div')
    customParent.id = 'custom-parent'
    const customA = document.createElement('button')
    customA.id = 'custom-a'
    customA.className = 'caller-control alpha'
    const spacerA = document.createElement('span')
    spacerA.id = 'spacer-a'
    const customB = document.createElement('button')
    customB.id = 'custom-b'
    customB.className = 'caller-control beta'
    const spacerB = document.createElement('i')
    spacerB.id = 'spacer-b'
    const customC = document.createElement('button')
    customC.id = 'custom-c'
    const spacerC = document.createElement('span')
    spacerC.id = 'spacer-c'
    customParent.append(customA, spacerA, customB, spacerB, customC, spacerC)
    document.body.append(customParent)

    const controls = createFlowControls(first, {
      position: 'top-center',
      orientation: 'horizontal',
      ariaLabel: 'First flow',
      showFitView: true,
      fitViewOptions: { padding: 0.1, duration: 0 },
      onZoomIn: () => {
        calls.zoomIn += 1
      },
      onFitView: () => {
        calls.fit += 1
      },
      children: [customA, customB, customC],
      style: { borderColor: 'rgb(1, 2, 3)' },
    })

    const secondControls = createFlowControls(second, {
      position: 'bottom-right',
      showZoom: true,
      showFitView: false,
    })

    globalThis.flowController = first
    Object.assign(globalThis, {
      secondPortalController: second,
      flowUi: { dot, lines, crosses, controls, secondControls, calls },
    })
  })

  await expect(
    page.locator('.flow-background[data-variant="dots"] circle')
  ).toHaveAttribute('r', '1')
  await expect(page.locator('#app .flow-background.decor')).toHaveCSS(
    'opacity',
    '0.8'
  )
  await expect(
    page.locator('#app .flow-background.decor pattern')
  ).toHaveAttribute('id', 'first-pattern')
  await expect(page.locator('#app .flow-background.decor pattern')).toHaveClass(
    'marks'
  )
  await expect(
    page.locator('#app .flow-background.decor circle')
  ).toHaveAttribute('fill', '#123456')
  await expect(
    page.locator('#app .flow-background.decor rect').first()
  ).toHaveAttribute('fill', '#fafafa')
  await expect(
    page.locator('#app .flow-background.decor rect').last()
  ).toHaveAttribute('fill', 'url(#first-pattern)')
  await expect(
    page.locator('.flow-background[data-variant="dots"] pattern')
  ).toHaveAttribute('width', '24')
  await expect(
    page.locator('.flow-background[data-variant="dots"] pattern')
  ).toHaveAttribute('height', '30')
  await expect(
    page.locator('.flow-background[data-variant="dots"] pattern')
  ).toHaveAttribute('patternTransform', 'translate(-15,-20)')
  await expect(
    page.locator('#app .flow-canvas > .flow-background')
  ).toHaveCount(2)
  await expect
    .poll(() =>
      page
        .locator('#app .flow-canvas > .flow-background')
        .last()
        .evaluate((element) =>
          element.nextElementSibling?.getAttribute('class')
        )
    )
    .toBe('flow-viewport')
  await expect(
    page.locator('.flow-background[data-variant="lines"] path')
  ).toHaveAttribute('stroke-width', '2')
  await expect(
    page.locator('#second-flow .flow-background[data-variant="cross"] path')
  ).toHaveAttribute('d', 'M 2 0 V 4 M 0 2 H 4')
  const firstControls = page.getByRole('group', { name: 'First flow' })
  await expect(firstControls).toHaveAttribute('data-position', 'top-center')
  await expect(firstControls).toHaveAttribute('data-orientation', 'horizontal')
  await expect(firstControls).toHaveCSS('border-color', 'rgb(1, 2, 3)')
  await expect(
    page.locator('#second-flow').getByRole('button', { name: 'Zoom In' })
  ).toBeVisible()
  await expect(
    page.locator('#second-flow').getByRole('button', { name: 'Fit View' })
  ).toHaveCount(0)
  await firstControls.getByRole('button', { name: 'Zoom In' }).click()
  await expect(
    firstControls.getByRole('button', { name: 'Zoom In' })
  ).toBeDisabled()
  await expect
    .poll(() =>
      page
        .locator('#app')
        .getByTestId('flow-viewport')
        .evaluate((element) => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Expected viewport element')
          }

          return element.dataset.zoom
        })
    )
    .toBe('1.2')
  await firstControls.getByRole('button', { name: 'Fit View' }).click()
  await expect
    .poll(() => page.evaluate(() => globalThis.flowUi.calls.fit))
    .toBe(1)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowUi.calls.zoomIn))
    .toBe(1)

  await page.evaluate(async () => {
    globalThis.flowUi.dot.destroy()
    globalThis.flowUi.lines.destroy()
    globalThis.flowUi.crosses.destroy()
    globalThis.flowUi.controls.destroy()
    globalThis.flowUi.secondControls.destroy()
    await globalThis.flowController?.destroyAsync()
    await globalThis.secondPortalController?.destroyAsync()
  })
  await expect(page.locator('.flow-background')).toHaveCount(0)
  await expect(page.locator('.flow-controls-public')).toHaveCount(0)
  await expect
    .poll(() =>
      page.locator('#custom-parent').evaluate((element) =>
        Array.from(element.children, (child) => ({
          id: child.id,
          tag: child.tagName.toLowerCase(),
          className: child.getAttribute('class'),
        }))
      )
    )
    .toEqual([
      { id: 'custom-a', tag: 'button', className: 'caller-control alpha' },
      { id: 'spacer-a', tag: 'span', className: null },
      { id: 'custom-b', tag: 'button', className: 'caller-control beta' },
      { id: 'spacer-b', tag: 'i', className: null },
      { id: 'custom-c', tag: 'button', className: null },
      { id: 'spacer-c', tag: 'span', className: null },
    ])

  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlowControls, mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (!root) {
      throw new Error('Missing app root')
    }

    const controller = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    globalThis.flowController = controller
    Object.assign(globalThis, {
      remountedControls: createFlowControls(controller),
    })
  })
  await page.getByRole('button', { name: 'Zoom In' }).click()
  await expect
    .poll(() =>
      page
        .locator('#app')
        .getByTestId('flow-viewport')
        .evaluate((element) => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Expected viewport element')
          }

          return element.dataset.zoom
        })
    )
    .toBe('1.2')
  await page.evaluate(async () => {
    globalThis.remountedControls.destroy()
    await globalThis.flowController?.destroyAsync()
  })
})

test('background follows real pan and wheel zoom, then unsubscribes on destroy', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlowBackground, mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (!root) {
      throw new Error('Missing app root')
    }

    const controller = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 4 },
          mode: 'uncontrolled',
        },
      }
    )

    const canvas = root.querySelector<HTMLElement>('.flow-canvas')

    if (!canvas) {
      throw new Error('Missing canvas')
    }

    globalThis.flowController = controller
    globalThis.viewportBackground = createFlowBackground(canvas, controller, {
      variant: 'dots',
      gap: [24, 32],
      size: 2,
      offset: [3, 5],
    })
  })

  const readState = () =>
    page.evaluate(() => {
      const pattern =
        globalThis.viewportBackground.element.querySelector('pattern')

      const viewport = document.querySelector<HTMLElement>('.flow-viewport')

      if (!pattern || !viewport) {
        throw new Error('Missing pattern or viewport')
      }

      return {
        x: Number(viewport.dataset.x),
        y: Number(viewport.dataset.y),
        zoom: Number(viewport.dataset.zoom),
        patternX: Number(pattern.getAttribute('x')),
        patternY: Number(pattern.getAttribute('y')),
        width: Number(pattern.getAttribute('width')),
        height: Number(pattern.getAttribute('height')),
        transform: pattern.getAttribute('patternTransform'),
        radius: Number(pattern.querySelector('circle')?.getAttribute('r')),
      }
    })

  const initial = await readState()
  expect(initial).toMatchObject({ zoom: 1, width: 24, height: 32, radius: 1 })
  expect(initial.transform).toBe('translate(-15,-21)')

  await page.mouse.move(780, 500)
  await page.mouse.down()
  await page.mouse.move(847, 537, { steps: 4 })
  await page.mouse.up()

  await expect
    .poll(async () => {
      const state = await readState()

      return state.x
    })
    .not.toBe(0)
  const panned = await readState()
  expect(panned.patternX).toBe(panned.x % (24 * panned.zoom))
  expect(panned.patternY).toBe(panned.y % (32 * panned.zoom))
  expect(panned.patternX).not.toBe(initial.patternX)

  await page.mouse.move(600, 400)
  await page.mouse.wheel(0, -180)
  await expect
    .poll(async () => {
      const state = await readState()

      return state.zoom
    })
    .not.toBe(panned.zoom)
  const zoomed = await readState()
  expect(zoomed.width).toBe(24 * zoomed.zoom)
  expect(zoomed.height).toBe(32 * zoomed.zoom)
  expect(zoomed.radius).toBe(zoomed.zoom)
  expect(zoomed.transform).toBe(
    `translate(-${3 * zoomed.zoom + (24 * zoomed.zoom) / 2},-${5 * zoomed.zoom + (32 * zoomed.zoom) / 2})`
  )
  expect(zoomed.patternX).toBe(zoomed.x % (24 * zoomed.zoom))
  expect(zoomed.patternY).toBe(zoomed.y % (32 * zoomed.zoom))

  await page.evaluate(() => globalThis.viewportBackground.destroy())

  const detachedPatternState = await page.evaluate(() => {
    const pattern =
      globalThis.viewportBackground.element.querySelector('pattern')

    if (!pattern) {
      throw new Error('Missing detached pattern')
    }

    return {
      x: pattern.getAttribute('x'),
      y: pattern.getAttribute('y'),
      width: pattern.getAttribute('width'),
      height: pattern.getAttribute('height'),
      transform: pattern.getAttribute('patternTransform'),
    }
  })

  await page.mouse.wheel(0, -180)
  await page.waitForTimeout(50)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const pattern =
          globalThis.viewportBackground.element.querySelector('pattern')

        if (!pattern) {
          throw new Error('Missing detached pattern')
        }

        return {
          x: pattern.getAttribute('x'),
          y: pattern.getAttribute('y'),
          width: pattern.getAttribute('width'),
          height: pattern.getAttribute('height'),
          transform: pattern.getAttribute('patternTransform'),
        }
      })
    )
    .toEqual(detachedPatternState)

  await page.evaluate(() => globalThis.flowController?.destroyAsync())
})

test('background preserves pinned subpixel spacing and negative remainder behavior', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlowBackground, mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (!root) {
      throw new Error('Missing app root')
    }

    const controller = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: -1.3, y: -0.6, zoom: 0.5 },
          limits: { minZoom: 0.25, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    const canvas = root.querySelector<HTMLElement>('.flow-canvas')

    if (!canvas) {
      throw new Error('Missing canvas')
    }

    globalThis.flowController = controller
    globalThis.viewportBackground = createFlowBackground(canvas, controller, {
      variant: 'dots',
      gap: 0.5,
    })
  })

  const state = await page.evaluate(() => {
    const pattern =
      globalThis.viewportBackground.element.querySelector('pattern')

    const circle = pattern?.querySelector('circle')
    const viewport = document.querySelector<HTMLElement>('.flow-viewport')

    if (!pattern || !circle || !viewport) {
      throw new Error('Missing pattern, dot, or viewport')
    }

    return {
      x: Number(viewport.dataset.x),
      y: Number(viewport.dataset.y),
      zoom: Number(viewport.dataset.zoom),
      patternX: Number(pattern.getAttribute('x')),
      patternY: Number(pattern.getAttribute('y')),
      width: Number(pattern.getAttribute('width')),
      height: Number(pattern.getAttribute('height')),
      transform: pattern.getAttribute('patternTransform'),
      radius: Number(circle.getAttribute('r')),
    }
  })

  expect(state.zoom).toBeLessThan(1)
  expect(state.width).toBe(0.25)
  expect(state.height).toBe(0.25)
  expect(state.patternX).toBe(state.x % 0.25)
  expect(state.patternY).toBe(state.y % 0.25)
  expect(state.patternX).toBeCloseTo(-0.05)
  expect(state.patternY).toBeCloseTo(-0.1)
  expect(state.transform).toBe('translate(-0.125,-0.125)')
  expect(state.radius).toBe(0.25)

  await page.evaluate(() => globalThis.viewportBackground.destroy())
  await page.evaluate(() => globalThis.flowController?.destroyAsync())
})
