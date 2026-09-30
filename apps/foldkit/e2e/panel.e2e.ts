import { expect, test } from '@playwright/test'

test('Foldkit Panel positions caller content and restores it on disposal', async ({
  page,
}) => {
  await page.goto('/')

  const positions = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ] as const

  const result = await page.evaluate(async (panelPositions) => {
    const uiModulePath = '/e2e/package-ui.ts'
    const { mountFlowPanel } = await import(uiModulePath)
    const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Foldkit playground canvas was not mounted')
    }

    const bounds = canvas.getBoundingClientRect()

    const panels = panelPositions.map((position) => {
      const content = document.createElement('div')
      content.style.width = '90px'
      content.style.height = '40px'
      content.textContent = position
      const mount = mountFlowPanel(canvas, content, { position })

      const panelBounds = mount.element.getBoundingClientRect()

      const measured = {
        position,
        left: panelBounds.left - bounds.left,
        top: panelBounds.top - bounds.top,
        right: bounds.right - panelBounds.right,
        bottom: bounds.bottom - panelBounds.bottom,
        centerX: panelBounds.left + panelBounds.width / 2,
        canvasCenterX: bounds.left + bounds.width / 2,
        isCanvasScoped: mount.element.parentElement === canvas,
        interactionBoundary: mount.element.matches(
          '[data-flow-no-pan][data-flow-no-drag][data-flow-no-wheel]'
        ),
      }

      mount.dispose()

      return measured
    })

    const before = document.createElement('span')
    before.dataset.order = 'before'
    const content = document.createElement('div')
    content.dataset.order = 'content'
    content.setAttribute('aria-label', 'Caller content')
    const action = document.createElement('button')
    action.textContent = 'Caller action'
    content.append(action)
    const after = document.createElement('span')
    after.dataset.order = 'after'
    const owner = document.createElement('div')
    owner.append(before, content, after)
    document.body.append(owner)

    const mount = mountFlowPanel(canvas, content, {
      position: 'top-center',
      className: 'caller-panel-class',
      ariaLabel: 'Caller panel',
    })

    const role = mount.element.getAttribute('role')
    const ariaLabel = mount.element.getAttribute('aria-label')
    const { className } = mount.element

    mount.dispose()
    mount.dispose()

    const restored = {
      owner: content.parentElement === owner,
      order: [...owner.querySelectorAll<HTMLElement>(':scope > *')].map(
        ({ dataset }) => dataset.order
      ),
      contentAttribute: content.getAttribute('aria-label'),
      buttonCount: content.querySelectorAll('button').length,
      canvasPanelCount: canvas.querySelectorAll('[data-flow-ui="panel"]')
        .length,
    }

    owner.remove()

    return { panels, role, ariaLabel, className, restored }
  }, positions)

  expect(result.role).toBe('group')
  expect(result.ariaLabel).toBe('Caller panel')
  expect(result.className).toContain('caller-panel-class')
  expect(result.restored).toEqual({
    owner: true,
    order: ['before', 'content', 'after'],
    contentAttribute: 'Caller content',
    buttonCount: 1,
    canvasPanelCount: 0,
  })

  for (const panel of result.panels) {
    expect(panel.isCanvasScoped).toBe(true)
    expect(panel.interactionBoundary).toBe(true)

    if (panel.position.startsWith('top-')) {
      expect(panel.top).toBeCloseTo(13, 0)
    } else {
      expect(panel.bottom).toBeCloseTo(13, 0)
    }

    if (panel.position.endsWith('-left')) {
      expect(panel.left).toBeCloseTo(13, 0)
    } else if (panel.position.endsWith('-right')) {
      expect(panel.right).toBeCloseTo(13, 0)
    } else {
      expect(panel.centerX).toBeCloseTo(panel.canvasCenterX, 0)
    }
  }

  await page.evaluate(async () => {
    const uiModulePath = '/e2e/package-ui.ts'
    const { mountFlowPanel } = await import(uiModulePath)
    const canvas = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvas === null) {
      throw new Error('Foldkit playground canvas was not mounted')
    }

    const content = document.createElement('div')
    content.id = 'flow-panel-interaction-content'
    content.style.width = '140px'
    content.style.height = '56px'

    const surface = document.createElement('div')
    surface.id = 'flow-panel-gesture-surface'
    surface.textContent = 'Panel interaction surface'
    surface.style.height = '28px'

    const action = document.createElement('button')
    action.textContent = 'Activate panel action'
    action.addEventListener('click', () => {
      content.dataset.activated = 'true'
    })

    content.append(surface, action)
    mountFlowPanel(canvas, content, {
      position: 'top-center',
      ariaLabel: 'Interactive panel',
    })
  })

  const action = page.getByRole('button', { name: 'Activate panel action' })
  await action.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#flow-panel-interaction-content')).toHaveAttribute(
    'data-activated',
    'true'
  )

  const viewport = page.locator('.flow-foldkit-viewport')
  const beforeGestures = await viewport.getAttribute('style')

  if (beforeGestures === null) {
    throw new Error('Foldkit viewport has no rendered transform')
  }

  const surface = page.locator('#flow-panel-gesture-surface')
  const surfaceBounds = await surface.boundingBox()

  if (surfaceBounds === null) {
    throw new Error('Panel gesture surface has no measurable bounds')
  }

  const point = {
    x: surfaceBounds.x + surfaceBounds.width / 2,
    y: surfaceBounds.y + surfaceBounds.height / 2,
  }

  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 80, point.y + 40)
  await page.mouse.up()
  await page.mouse.move(point.x, point.y)
  await page.mouse.wheel(0, 120)
  await expect(viewport).toHaveAttribute('style', beforeGestures)
})
