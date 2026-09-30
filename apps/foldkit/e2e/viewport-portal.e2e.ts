import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __flowViewportPortalDispose?: () => void
  }
}

test('Foldkit viewport portal follows its canvas transform and restores caller DOM', async ({
  page,
}) => {
  await page.goto('/')

  const initial = await page.evaluate(async () => {
    const uiPath = '/e2e/package-ui.ts'
    const { mountFlowViewportPortal } = await import(uiPath)
    const canvasA = document.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (canvasA === null) {
      throw new Error('Foldkit playground canvas was not mounted')
    }

    const canvasB = document.createElement('div')
    canvasB.className = 'flow-foldkit-canvas'
    canvasB.dataset.flowInstance = 'portal-isolation-fixture'
    const viewportB = document.createElement('div')
    viewportB.className = 'flow-foldkit-viewport'
    viewportB.style.transform = 'translate(-48px, 22px) scale(1.4)'
    canvasB.append(viewportB)
    document.body.append(canvasB)

    const contents = ['first', 'second'].map((name) => {
      const origin = document.createElement('div')
      origin.dataset.portalOrigin = name
      const before = document.createElement('span')
      before.dataset.order = 'before'
      const content = document.createElement('div')
      content.dataset.portalContent = name
      const button = document.createElement('button')
      button.textContent = `Activate ${name}`
      button.addEventListener('click', () => {
        content.dataset.activated = 'true'
      })
      content.append(button)
      const after = document.createElement('span')
      after.dataset.order = 'after'
      origin.append(before, content, after)
      document.body.append(origin)

      return content
    })

    const [firstContent, secondContent] = contents

    if (firstContent === undefined || secondContent === undefined) {
      throw new Error('Portal content fixtures were not created')
    }

    const mounts = [
      mountFlowViewportPortal(canvasA, firstContent),
      mountFlowViewportPortal(canvasB, secondContent),
    ]

    const duplicateRejections = [canvasA, canvasB].map((canvas) => {
      try {
        const duplicate = mountFlowViewportPortal(canvas, firstContent)
        duplicate.dispose()

        return false
      } catch (error) {
        return (
          error instanceof Error &&
          error.message === 'Foldkit viewport portal content is already mounted'
        )
      }
    })

    window.__flowViewportPortalDispose = () => {
      mounts[0]?.dispose()
      mounts[0]?.dispose()
      canvasA.remove()
      canvasB.remove()
    }

    return {
      firstTransform: canvasA.querySelector<HTMLElement>(
        '.flow-foldkit-viewport'
      )?.style.transform,
      secondTransform: viewportB.style.transform,
      firstScoped:
        mounts[0]?.element.parentElement ===
        canvasA.querySelector('.flow-foldkit-viewport'),
      secondScoped: mounts[1]?.element.parentElement === viewportB,
      interactionBoundary: mounts.every(({ element }) =>
        element.matches(
          '[data-flow-no-pan][data-flow-no-drag][data-flow-no-wheel]'
        )
      ),
      duplicateRejections,
    }
  })

  expect(initial.firstTransform).toContain('scale(')
  expect(initial.secondTransform).toBe('translate(-48px, 22px) scale(1.4)')
  expect(initial.firstScoped).toBe(true)
  expect(initial.secondScoped).toBe(true)
  expect(initial.interactionBoundary).toBe(true)
  expect(initial.duplicateRejections).toEqual([true, true])

  await page.getByRole('button', { name: 'Activate first' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-portal-content="first"]')).toHaveAttribute(
    'data-activated',
    'true'
  )
  await page.getByRole('button', { name: 'Activate second' }).click()
  await expect(page.locator('[data-portal-content="second"]')).toHaveAttribute(
    'data-activated',
    'true'
  )

  await page.getByRole('button', { name: 'Zoom to 1.25' }).click()
  const viewport = page.locator('.flow-foldkit-viewport').first()
  await expect(viewport).toHaveAttribute('style', /scale\(1\.25\)/u)
  const beforeGestures = await viewport.getAttribute('style')

  const bounds = await page
    .locator('[data-portal-content="first"]')
    .boundingBox()

  if (beforeGestures === null || bounds === null) {
    throw new Error('Foldkit portal or viewport transform is missing')
  }

  await page.mouse.move(bounds.x + 5, bounds.y + 5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 45, bounds.y + 5)
  await page.mouse.up()
  await page.locator('[data-portal-content="first"]').dispatchEvent('wheel', {
    deltaY: 120,
    bubbles: true,
    cancelable: true,
  })
  await expect(viewport).toHaveAttribute('style', beforeGestures)

  await page.evaluate(() => {
    window.__flowViewportPortalDispose?.()
  })

  await expect
    .poll(() =>
      page.evaluate(() =>
        ['first', 'second'].map((name) => {
          const origin = document.querySelector<HTMLElement>(
            `[data-portal-origin="${name}"]`
          )

          const content = origin?.querySelector<HTMLElement>(
            `[data-portal-content="${name}"]`
          )

          const siblingOrder = [
            ...(origin?.querySelectorAll<HTMLElement>(':scope > *') ?? []),
          ].map((element) => element.dataset.order ?? 'content')

          return {
            restored: content?.parentElement === origin,
            siblingOrder,
            hostCount: document.querySelectorAll(
              `[data-flow-ui="viewport-portal"]`
            ).length,
          }
        })
      )
    )
    .toEqual([
      {
        restored: true,
        siblingOrder: ['before', 'content', 'after'],
        hostCount: 0,
      },
      {
        restored: true,
        siblingOrder: ['before', 'content', 'after'],
        hostCount: 0,
      },
    ])
})
