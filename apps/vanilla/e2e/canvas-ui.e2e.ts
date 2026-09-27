import type { FlowChange } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const viewportData = (page: Page, key: 'x' | 'y' | 'zoom') =>
  page.getByTestId('flow-viewport').evaluate((element, datasetKey) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected the viewport to be an HTML element')
    }

    return element.dataset[datasetKey]
  }, key)

const mount = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing app root')
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'Alpha',
            position: { x: 100, y: 120 },
            size: { width: 140, height: 60 },
          },
          { id: 'b', label: 'Beta', position: { x: 620, y: 420 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        background: { pattern: 'lines', spacing: 32, color: '#abc' },
        ui: { controls: true, minimap: true },
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 1.25 },
          mode: 'uncontrolled',
        },
      }
    )

    globalThis.flowController = controller
  })
}

test('optional canvas controls, minimap, background, and zoom affordances', async ({
  page,
}) => {
  await mount(page)
  const canvas = page.getByTestId('flow-canvas')
  await expect(canvas).toHaveAttribute('data-background', 'lines')
  await expect(canvas).toHaveCSS('--flow-background-spacing', '32px')
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fit view' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Switch to pan mode' })
  ).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('img', { name: 'Graph minimap' })).toBeVisible()
  await expect(page.locator('.flow-minimap-node')).toHaveCount(2)
  await expect(page.getByTestId('flow-minimap-viewport')).toBeVisible()
  await expect(page).toHaveScreenshot('canvas-ui.png', {
    animations: 'disabled',
  })

  const initial = await page
    .getByTestId('flow-viewport')
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected the viewport to be an HTML element')
      }

      return {
        x: Number(element.dataset.x),
        y: Number(element.dataset.y),
        zoom: Number(element.dataset.zoom),
      }
    })

  const box = await canvas.boundingBox()

  if (box === null) {
    throw new Error('Canvas has no bounds')
  }

  const anchor = { x: box.width * 0.7, y: box.height * 0.7 }

  const flowAnchor = {
    x: (anchor.x - initial.x) / initial.zoom,
    y: (anchor.y - initial.y) / initial.zoom,
  }

  await page.mouse.dblclick(box.x + anchor.x, box.y + anchor.y)
  await expect(page.getByTestId('flow-viewport')).toHaveAttribute(
    'data-zoom',
    '1.2'
  )
  await expect(page.getByTestId('flow-viewport')).toHaveAttribute(
    'data-x',
    String(anchor.x - flowAnchor.x * 1.2)
  )
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByTestId('flow-viewport')).toHaveAttribute(
    'data-zoom',
    '1.25'
  )
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByTestId('flow-viewport')).toHaveAttribute(
    'data-zoom',
    '1.25'
  )

  const minimap = page.locator('.flow-minimap')
  await minimap.click({ position: { x: 160, y: 20 } })
  await expect(page.getByTestId('flow-viewport')).not.toHaveAttribute(
    'data-x',
    '0'
  )
  await page.getByRole('button', { name: 'Fit view' }).click()
  await expect(page.getByTestId('flow-viewport')).not.toHaveAttribute(
    'data-x',
    '0'
  )
})

test('interaction mode pans over nodes without starting node gestures and keeps controls active', async ({
  page,
}) => {
  await mount(page)
  const mode = page.getByRole('button', { name: 'Switch to pan mode' })
  await mode.click()
  const panMode = page.getByRole('button', { name: 'Switch to select mode' })
  await expect(panMode).toHaveAttribute('aria-pressed', 'true')

  const node = page.getByTestId('flow-node').filter({ hasText: 'Alpha' })

  const beforeTransform = await node.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Expected HTML element')
    }

    return element.style.transform
  })

  const beforeSelection = await node.getAttribute('aria-pressed')

  const beforeViewport = await page
    .getByTestId('flow-viewport')
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected the viewport to be an HTML element')
      }

      return { x: Number(element.dataset.x), y: Number(element.dataset.y) }
    })

  const box = await node.boundingBox()

  if (box === null) {
    throw new Error('Node has no bounds')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 45,
    { steps: 4 }
  )
  await page.mouse.up()

  await expect
    .poll(() => viewportData(page, 'x'))
    .not.toBe(String(beforeViewport.x))
  await expect
    .poll(() => viewportData(page, 'y'))
    .not.toBe(String(beforeViewport.y))
  await expect(node).toHaveAttribute('aria-pressed', beforeSelection ?? 'false')
  await expect
    .poll(() =>
      node.evaluate((element) => {
        if (!(element instanceof HTMLElement)) {
          throw new Error('Expected HTML element')
        }

        return element.style.transform
      })
    )
    .toBe(beforeTransform)

  const zoomBeforeControlClick = await page
    .getByTestId('flow-viewport')
    .getAttribute('data-zoom')

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByTestId('flow-viewport')).not.toHaveAttribute(
    'data-zoom',
    zoomBeforeControlClick ?? '1'
  )
  await panMode.click()
  await expect(
    page.getByRole('button', { name: 'Switch to pan mode' })
  ).toHaveAttribute('aria-pressed', 'false')
})

test('canvas UI stays optional and caller panel survives keyed document updates', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing canvas root')
    }

    const panel = document.createElement('aside')
    panel.textContent = 'Caller panel'
    const nodeToolbar = document.createElement('div')
    nodeToolbar.id = 'node-toolbar-container'
    nodeToolbar.className = 'caller-toolbar focus-target'
    nodeToolbar.style.transform = 'rotate(3deg)'
    nodeToolbar.hidden = true
    nodeToolbar.dataset.toolbarKind = 'caller-node-kind'
    nodeToolbar.dataset.toolbarId = 'caller-node-id'
    nodeToolbar.append(
      Object.assign(document.createElement('button'), {
        textContent: 'Node action',
      })
    )
    const edgeToolbar = document.createElement('div')
    edgeToolbar.id = 'edge-toolbar-container'
    edgeToolbar.append(
      Object.assign(document.createElement('button'), {
        textContent: 'Edge action',
      })
    )
    const culledToolbar = document.createElement('div')
    culledToolbar.append(
      Object.assign(document.createElement('button'), {
        textContent: 'Remote node action',
      })
    )
    document.body.append(panel)
    document.body.append(nodeToolbar, edgeToolbar, culledToolbar)

    const initial = {
      nodes: [
        { id: 'a', label: 'Alpha', position: { x: 0, y: 0 } },
        { id: 'b', label: 'Beta', position: { x: 240, y: 100 } },
        { id: 'c', label: 'Remote', position: { x: 2200, y: 700 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }

    const controller = mountFlow(root, initial, {
      documentMode: 'uncontrolled',
      panel,
      renderOnlyVisible: true,
      toolbarContainers: {
        nodes: { a: nodeToolbar, c: culledToolbar },
        edges: { ab: edgeToolbar },
      },
      viewport: {
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
        mode: 'uncontrolled',
      },
    })

    const [firstNode, secondNode, thirdNode] = initial.nodes

    if (
      firstNode === undefined ||
      secondNode === undefined ||
      thirdNode === undefined
    ) {
      throw new Error('Expected three initial canvas nodes')
    }

    controller.update({
      nodes: [{ ...firstNode, label: 'Renamed' }, secondNode, thirdNode],
      edges: initial.edges,
    })
    globalThis.flowController = controller
  })
  await expect(page.locator('.flow-controls')).toHaveCount(0)
  await expect(page.locator('.flow-minimap')).toHaveCount(0)
  await expect(page.getByText('Caller panel')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Renamed' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Node action', exact: true })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edge action' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Remote node action' })
  ).toBeHidden()

  const anchorBeforeZoom = await page
    .locator('[data-toolbar-kind=node][data-toolbar-id=a]')
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected HTML element')
      }

      return element.style.transform
    })

  const edgeAnchorBeforeZoom = await page
    .locator('[data-toolbar-kind=edge][data-toolbar-id=ab]')
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected HTML element')
      }

      return element.style.transform
    })

  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -100, y: -60, zoom: 1.5 })
  )
  await expect
    .poll(() =>
      page
        .locator('[data-toolbar-kind=node][data-toolbar-id=a]')
        .evaluate((element) => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Expected HTML element')
          }

          return element.style.transform
        })
    )
    .not.toBe(anchorBeforeZoom)
  await expect
    .poll(() =>
      page
        .locator('[data-toolbar-kind=edge][data-toolbar-id=ab]')
        .evaluate((element) => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Expected HTML element')
          }

          return element.style.transform
        })
    )
    .not.toBe(edgeAnchorBeforeZoom)
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -2000, y: -500, zoom: 1 })
  )
  await expect(
    page.getByRole('button', { name: 'Remote node action' })
  ).toBeVisible()
  await page.evaluate(() => globalThis.flowController?.destroy())
  await expect(page.getByText('Caller panel')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('#node-toolbar-container').evaluate((element) => {
        if (!(element instanceof HTMLElement)) {
          throw new Error('Expected node toolbar element')
        }

        const toolbar = element

        return JSON.stringify({
          parent: toolbar.parentElement?.tagName,
          next:
            toolbar.nextElementSibling instanceof HTMLElement
              ? toolbar.nextElementSibling.id
              : null,
          childCount: toolbar.childElementCount,
          className: toolbar.getAttribute('class'),
          hidden: toolbar.getAttribute('hidden'),
          transform: toolbar.style.getPropertyValue('transform'),
          transformPriority: toolbar.style.getPropertyPriority('transform'),
          kind: toolbar.dataset.toolbarKind,
          id: toolbar.dataset.toolbarId,
        })
      })
    )
    .toBe(
      JSON.stringify({
        parent: 'BODY',
        next: 'edge-toolbar-container',
        childCount: 1,
        className: 'caller-toolbar focus-target',
        hidden: '',
        transform: 'rotate(3deg)',
        transformPriority: '',
        kind: 'caller-node-kind',
        id: 'caller-node-id',
      })
    )
})

test('placed panels preserve identity, focus, actions, and exact restoration', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing canvas root')
    }

    const placements = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const

    const panels = placements.map((placement, index) => {
      const element = document.createElement('aside')
      element.id = `panel-${index}`
      element.className = `caller-panel-${index}`
      element.style.color = 'rgb(1, 2, 3)'
      element.hidden = index === 5

      if (index === 0) {
        const input = document.createElement('input')
        input.value = 'panel focus'
        element.append(input)
      } else {
        const button = document.createElement('button')
        button.textContent = `Action ${index}`
        button.addEventListener('click', () => {
          element.dataset.clicked = 'true'
        })

        element.append(button)
      }

      document.body.append(element)

      return { id: `panel-${index}`, element, placement }
    })

    const firstPanel = panels.at(0)

    if (firstPanel === undefined) {
      throw new Error('Missing first caller panel')
    }

    const input = firstPanel.element.querySelector('input')

    if (input === null) {
      throw new Error('Missing first panel input')
    }

    input.focus()
    input.setSelectionRange(1, 5)

    const controller = mountFlow(
      root,
      {
        nodes: [
          { id: 'n', label: 'Node', position: { x: 20, y: 30 } },
          { id: 'far', label: 'Far', position: { x: 2200, y: 700 } },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        panels,
        ui: { controls: true },
        renderOnlyVisible: true,
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    globalThis.flowController = controller
    globalThis.panelRefs = panels
    globalThis.flowChanges = []
    controller.subscribe((change: FlowChange) =>
      globalThis.flowChanges?.push(change)
    )
  })
  await expect(page.locator('.flow-panel-slot')).toHaveCount(6)
  await expect(
    page.locator(".flow-panel-slot[data-placement='top-left'] #panel-0")
  ).toBeVisible()
  await expect(
    page.locator(".flow-panel-slot[data-placement='top-center'] #panel-1")
  ).toBeVisible()
  await expect(
    page.locator(".flow-panel-slot[data-placement='top-right'] #panel-2")
  ).toBeVisible()
  await expect(
    page.locator(".flow-panel-slot[data-placement='bottom-left'] #panel-3")
  ).toBeVisible()
  await expect(
    page.locator(".flow-panel-slot[data-placement='bottom-center'] #panel-4")
  ).toBeVisible()
  await expect(
    page.locator(".flow-panel-slot[data-placement='bottom-right'] #panel-5")
  ).toBeHidden()
  await expect(page.locator('#panel-0 input')).toBeFocused()
  expect(
    await page.locator('#panel-0 input').evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error('Expected panel input')
      }

      return { start: element.selectionStart, end: element.selectionEnd }
    })
  ).toEqual({ start: 1, end: 5 })
  await expect(page.locator('.flow-canvas-ui')).toHaveScreenshot(
    'panels-six-positions.png',
    { animations: 'disabled' }
  )
  const originalPanel = await page.locator('#panel-0').elementHandle()

  if (originalPanel === null) {
    throw new Error('Expected the caller panel to mount')
  }

  await page.evaluate(() => {
    globalThis.flowController?.update({
      nodes: [
        { id: 'n', label: 'Renamed', position: { x: 20, y: 30 } },
        { id: 'far', label: 'Far', position: { x: 2200, y: 700 } },
      ],
      edges: [],
    })
    globalThis.flowController?.updateViewport({ x: -2200, y: -700, zoom: 1 })
  })
  await expect(page.getByRole('button', { name: 'Renamed' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Far' })).toBeVisible()
  await expect(page.locator('#panel-0 input')).toBeFocused()
  expect(
    await page.locator('#panel-0 input').evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error('Expected panel input')
      }

      return { start: element.selectionStart, end: element.selectionEnd }
    })
  ).toEqual({ start: 1, end: 5 })
  await expect(page.locator('#panel-0')).toBeVisible()

  const placementAndIdentity = await page.evaluate(
    (original) => ({
      sameElement: document.querySelector('#panel-0') === original,
      placement:
        document.querySelector('#panel-0')?.parentElement?.dataset.placement,
    }),
    originalPanel
  )

  expect(placementAndIdentity).toEqual({
    sameElement: true,
    placement: 'top-left',
  })

  const beforeNode = await page
    .locator('[data-node-id="far"]')
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected HTML element')
      }

      return element.style.transform
    })

  const beforeViewport = await page
    .getByTestId('flow-viewport')
    .getAttribute('data-x')

  const panelAction = page.getByRole('button', { name: 'Action 2' })
  await panelAction.focus()
  await expect(panelAction).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#panel-2')).toHaveAttribute('data-clicked', 'true')
  await expect(page.getByTestId('flow-viewport')).toHaveAttribute(
    'data-x',
    beforeViewport ?? '0'
  )
  expect(
    await page.locator('[data-node-id="far"]').evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('Expected HTML element')
      }

      return element.style.transform
    })
  ).toBe(beforeNode)
  expect(await page.evaluate(() => globalThis.flowChanges?.length ?? -1)).toBe(
    0
  )
  await page.locator('#panel-0 input').evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('Expected panel input')
    }

    element.focus()
    element.setSelectionRange(2, 6)
  })
  await page.evaluate(() => globalThis.flowController?.destroy())
  await expect(page.locator('#panel-0 input')).toBeFocused()
  expect(
    await page.locator('#panel-0 input').evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error('Expected panel input')
      }

      return { start: element.selectionStart, end: element.selectionEnd }
    })
  ).toEqual({ start: 2, end: 6 })

  const restored = await page.evaluate(() =>
    globalThis.panelRefs?.map(({ element }) => ({
      parent: element.parentElement?.tagName,
      className: element.getAttribute('class'),
      style: element.getAttribute('style'),
      hidden: element.getAttribute('hidden'),
    }))
  )

  const restoredOrder = await page.evaluate(() =>
    globalThis.panelRefs?.map(({ element }) =>
      [...document.body.children].indexOf(element)
    )
  )

  const firstRestoredOrder = restoredOrder?.at(0)
  expect(
    firstRestoredOrder !== undefined &&
      restoredOrder?.every(
        (index, offset) => index === firstRestoredOrder + offset
      )
  ).toBe(true)
  expect(restored).toEqual(
    Array.from({ length: 6 }, (_, index) => ({
      parent: 'BODY',
      className: `caller-panel-${index}`,
      style: 'color: rgb(1, 2, 3);',
      hidden: index === 5 ? '' : null,
    }))
  )
  await expect(page.locator('.flow-canvas-ui')).toHaveCount(0)
})

test('overlay option validation rejects duplicate ids, elements, and legacy panel conflict', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))

  const messages = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing canvas root')
    }

    const base = {
      documentMode: 'uncontrolled' as const,
      viewport: {
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
        mode: 'uncontrolled' as const,
      },
    }

    const element = document.createElement('aside')

    const attempt = (options: {
      readonly panel?: HTMLElement
      readonly panels?: readonly {
        readonly id: string
        readonly element: HTMLElement
        readonly placement: string
      }[]
    }): string => {
      try {
        // SAFETY: The public schema decoder validates this raw document or options value before use in the test.
        mountFlow(root, { nodes: [], edges: [] }, {
          ...base,
          ...options,
        } as never)

        return 'mounted'
      } catch (error) {
        return error instanceof Error
          ? `${error.name}:${error.message}`
          : String(error)
      }
    }

    return [
      attempt({
        panels: [
          { id: 'dup', element, placement: 'top-left' },
          {
            id: 'dup',
            element: document.createElement('aside'),
            placement: 'top-right',
          },
        ],
      }),
      attempt({
        panels: [
          { id: 'one', element, placement: 'top-left' },
          { id: 'two', element, placement: 'bottom-right' },
        ],
      }),
      attempt({
        panel: element,
        panels: [
          {
            id: 'one',
            element: document.createElement('aside'),
            placement: 'top-left',
          },
        ],
      }),
    ]
  })

  expect(
    messages.every((message) => message.startsWith('CanvasUIOptionsError:'))
  ).toBe(true)
  await expect(page.locator('.flow-canvas')).toHaveCount(0)
})

test('overlay portals are host-local and disappear from the canvas on destroy', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const firstRoot = document.createElement('div')
    firstRoot.id = 'portal-test-first-root'
    const secondRoot = document.createElement('div')
    secondRoot.id = 'portal-test-second-root'
    document.body.append(firstRoot, secondRoot)

    const options = {
      documentMode: 'uncontrolled' as const,
      viewport: {
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
        mode: 'uncontrolled' as const,
      },
    }

    const first = mountFlow(firstRoot, { nodes: [], edges: [] }, options)
    const second = mountFlow(secondRoot, { nodes: [], edges: [] }, options)
    const firstContent = document.createElement('button')
    firstContent.textContent = 'Portal action'
    firstContent.setAttribute('aria-label', 'Portal action')
    firstContent.addEventListener('click', () => {
      firstContent.dataset.activated = 'true'
    })

    first.overlayPortal.append(firstContent)

    const separate =
      first.overlayPortal !== second.overlayPortal &&
      first.overlayPortal.parentElement !== second.overlayPortal.parentElement

    const attachedBefore = first.overlayPortal.isConnected
    globalThis.flowController = first
    globalThis.secondPortalController = second

    return {
      separate,
      attachedBefore,
      retainedCallerNode: firstContent.parentElement === first.overlayPortal,
    }
  })

  expect(result).toEqual({
    separate: true,
    attachedBefore: true,
    retainedCallerNode: true,
  })
  const portalAction = page.getByRole('button', { name: 'Portal action' })
  await portalAction.focus()
  await expect(portalAction).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(portalAction).toHaveAttribute('data-activated', 'true')

  const teardown = await page.evaluate(() => {
    const controller = globalThis.flowController
    controller?.destroy()
    globalThis.secondPortalController?.destroy()

    const removedFromFirstRoot =
      document.querySelector('#portal-test-first-root .flow-canvas-ui') === null

    const portalDetached =
      controller === undefined || !controller.overlayPortal.isConnected

    document.querySelector('#portal-test-first-root')?.remove()
    document.querySelector('#portal-test-second-root')?.remove()

    return { removedFromFirstRoot, portalDetached }
  })

  expect(teardown).toEqual({ removedFromFirstRoot: true, portalDetached: true })
})

test('placed panels render at all six canvas-relative positions without overlap', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing app root')
    }

    const placements = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const

    const panels = placements.map((placement) => {
      const element = document.createElement('aside')
      element.textContent = placement
      element.style.width = '100px'
      element.style.height = '40px'
      element.style.boxSizing = 'border-box'
      element.style.background = '#e2e8f0'
      document.body.append(element)

      return { id: placement, element, placement }
    })

    globalThis.flowController = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        panels,
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )
  })

  const canvas = await page.getByTestId('flow-canvas').boundingBox()

  if (canvas === null) {
    throw new Error('Missing canvas bounds')
  }

  const panelBounds = await page
    .locator('.flow-panel-slot')
    .evaluateAll((slots) =>
      slots.map((slot) => {
        const rect = slot.getBoundingClientRect()

        return {
          placement: slot.dataset.placement,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
        }
      })
    )

  expect(panelBounds).toHaveLength(6)
  const inset = 12
  const tolerance = 1

  const expectNear = (actual: number, expected: number): void => {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
  }

  const byPlacement = new Map(
    panelBounds.map((bounds) => [bounds.placement, bounds])
  )

  for (const placement of [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ] as const) {
    const bounds = byPlacement.get(placement)

    if (bounds === undefined) {
      throw new Error(`Missing panel placement ${placement}`)
    }

    if (placement.startsWith('top-')) {
      expectNear(bounds.top, canvas.y + inset)
    } else {
      expectNear(bounds.bottom, canvas.y + canvas.height - inset)
    }

    if (placement.endsWith('left')) {
      expectNear(bounds.left, canvas.x + inset)
    } else if (placement.endsWith('right')) {
      expectNear(bounds.right, canvas.x + canvas.width - inset)
    } else {
      expectNear(bounds.centerX, canvas.x + canvas.width / 2)
    }
  }

  for (let first = 0; first < panelBounds.length; first += 1) {
    for (let second = first + 1; second < panelBounds.length; second += 1) {
      const a = panelBounds[first]
      const b = panelBounds[second]

      if (a === undefined || b === undefined) {
        throw new Error('Missing measured panel bounds')
      }

      const overlaps =
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top

      expect(
        overlaps,
        `${a.placement} and ${b.placement} should not overlap`
      ).toBe(false)
    }
  }

  await expect(
    page.locator(".flow-panel-slot[data-placement='top-left']")
  ).toHaveScreenshot('placed-panel-top-left.png', { animations: 'disabled' })
  await expect(
    page.locator(".flow-panel-slot[data-placement='bottom-right']")
  ).toHaveScreenshot('placed-panel-bottom-right.png', {
    animations: 'disabled',
  })
})

test('panels originally inside the mount root restore their element order after destroy', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))

  const result = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing app root')
    }

    const before = document.createElement('aside')
    before.id = 'root-panel-before'
    const input = document.createElement('input')
    input.value = 'root panel'
    before.append(input)
    const after = document.createElement('aside')
    after.id = 'root-panel-after'
    after.textContent = 'After'
    root.append(before, after)
    input.focus()
    input.setSelectionRange(2, 7)

    const controller = mountFlow(
      root,
      { nodes: [], edges: [] },
      {
        documentMode: 'uncontrolled',
        panels: [
          { id: 'before', element: before, placement: 'top-left' },
          { id: 'after', element: after, placement: 'bottom-right' },
        ],
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          mode: 'uncontrolled',
        },
      }
    )

    const mountedOrder = [...root.children].map((element) => element.className)
    controller.destroy()

    return {
      mountedOrder,
      restoredOrder: [...root.children].map((element) => element.id),
      sameFirst: root.children[0] === before,
      sameSecond: root.children[1] === after,
      firstParentIsRoot: before.parentElement === root,
      secondParentIsRoot: after.parentElement === root,
      focused: document.activeElement === input,
      selection: { start: input.selectionStart, end: input.selectionEnd },
    }
  })

  expect(result).toEqual({
    mountedOrder: ['flow-canvas'],
    restoredOrder: ['root-panel-before', 'root-panel-after'],
    sameFirst: true,
    sameSecond: true,
    firstParentIsRoot: true,
    secondParentIsRoot: true,
    focused: true,
    selection: { start: 2, end: 7 },
  })
})
