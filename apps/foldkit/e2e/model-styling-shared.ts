import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import type {
  FoldkitModelStylingFixture,
  FoldkitModelStylingInput,
} from './model-styling-fixture.ts'

declare global {
  interface Window {
    __flowFoldkitModelStyling?: FoldkitModelStylingFixture
  }
}

export const mountModelStyling = async (
  page: Page,
  input: FoldkitModelStylingInput
): Promise<void> => {
  await page.goto('/test.html')
  await page.evaluate(async (fixtureInput) => {
    const modulePath = '/e2e/model-styling-fixture.ts'
    const { mountFoldkitModelStylingFixture } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing Foldkit fixture host')
    }

    if (fixtureInput.shadowCanvas) {
      const shadowHost = document.createElement('div')
      host.append(shadowHost)
      const root = shadowHost.attachShadow({ mode: 'open' })
      const owner = document.createElement('div')
      owner.innerHTML = '<div id="model-styling-fixture"></div>'
      root.append(owner)
      const container = owner.firstElementChild

      if (!(container instanceof HTMLElement)) {
        throw new TypeError('Missing shadow fixture container')
      }

      window.__flowFoldkitModelStyling = mountFoldkitModelStylingFixture(
        container,
        fixtureInput
      )

      return
    }

    host.innerHTML = '<div id="model-styling-fixture"></div>'

    const container = document.querySelector<HTMLElement>(
      '#model-styling-fixture'
    )

    if (container === null) {
      throw new Error('Missing Foldkit model styling container')
    }

    window.__flowFoldkitModelStyling = mountFoldkitModelStylingFixture(
      container,
      fixtureInput
    )
  }, input)
  await expect(page.locator('[data-testid="flow-node"]').first()).toHaveCount(1)

  if (input.initialPaneSize?.width !== 0) {
    await expect(
      page.locator('[data-testid="flow-node"]').first()
    ).toBeVisible()
  }

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const id =
          document.querySelector<HTMLElement>('[data-testid="flow-node"]')
            ?.dataset.nodeId ??
          document
            .querySelector('#app > div')
            ?.shadowRoot?.querySelector<HTMLElement>(
              '[data-testid="flow-node"]'
            )?.dataset.nodeId

        const measured =
          id === undefined
            ? undefined
            : await window.__flowFoldkitModelStyling?.node(id)

        return measured?.measured !== undefined
      })
    )
    .toBe(true)
}

export const nodeLocator = (page: Page, nodeId: string): Locator =>
  page.locator(`.flow-foldkit-node[data-node-id="${nodeId}"]`)

export const centreOf = async (locator: Locator) => {
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error('Element is not rendered')
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** A real mouse drag from the element's centre by `dx`/`dy`. */
export const dragBy = async (
  page: Page,
  locator: Locator,
  dx: number,
  dy: number
): Promise<void> => {
  const start = await centreOf(locator)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + dx / 2, start.y + dy / 2, { steps: 4 })
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 4 })
  await page.mouse.up()
}

/** The node as the public snapshot port reads it (`getNode`). */
export const readNode = (page: Page, nodeId: string) =>
  page.evaluate(
    (id) => window.__flowFoldkitModelStyling?.node(id) ?? null,
    nodeId
  )
