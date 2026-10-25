import { expect, test } from '@playwright/test'
import type {
  BrowserContext,
  ElementHandle,
  Locator,
  Page,
} from '@playwright/test'

import ledger from '../../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }
import { boundingBox } from '../upstream/adapter.ts'
import type { UpstreamHostAdapter } from '../upstream/adapter.ts'

declare global {
  interface Window {
    __upstreamEvents?: {
      type: string
      x: number
      y: number
      buttons: number
      shift: boolean
      meta: boolean
      target: string
      hits: string[]
    }[]
  }
}

export const persistentExample = (
  adapter: UpstreamHostAdapter,
  name: string
) => {
  let context: BrowserContext
  let page: Page
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    })

    await context.addInitScript(() => {
      const events: NonNullable<Window['__upstreamEvents']> = []
      window.__upstreamEvents = events

      const record = (event: MouseEvent) => {
        const target = event.target instanceof Element ? event.target : null
        events.push({
          type: event.type,
          x: event.clientX,
          y: event.clientY,
          buttons: event.buttons,
          shift: event.shiftKey,
          meta: event.metaKey,
          target: target?.outerHTML.slice(0, 400) ?? '',
          hits: document
            .elementsFromPoint(event.clientX, event.clientY)
            .slice(0, 5)
            .map((element) => element.outerHTML.slice(0, 220)),
        })

        if (window.__upstreamEvents && window.__upstreamEvents.length > 100) {
          window.__upstreamEvents.shift()
        }
      }

      for (const eventName of [
        'pointerdown',
        'pointermove',
        'pointerup',
        'mousedown',
        'mouseup',
        'click',
      ]) {
        window.addEventListener(
          eventName,
          (event) => {
            if (event instanceof MouseEvent) {
              record(event)
            }
          },
          true
        )
      }

      for (const keyEvent of ['keydown', 'keyup']) {
        window.addEventListener(keyEvent, (event) => {
          if (event instanceof KeyboardEvent) {
            document.documentElement.dataset.upstreamModifiers = String(
              Number(event.altKey) +
                Number(event.ctrlKey) * 2 +
                Number(event.metaKey) * 4 +
                Number(event.shiftKey) * 8
            )
          }
        })
      }
    })

    context.setDefaultTimeout(4000)
    context.setDefaultNavigationTimeout(30_000)

    // Seed only Empty's random node creation. Preserve its original formula.
    if (name === 'empty') {
      await context.addInitScript(() => {
        let seed = 134
        Math.random = () => {
          seed = (seed * 16_807) % 2_147_483_647

          return seed / 2_147_483_647
        }
      })
    }

    page = await context.newPage()
    await adapter.goto(page, `/upstream-examples/${name}`, false)
  })
  test.beforeEach(async ({ page: unusedPage }, info) => {
    void unusedPage
    await page.evaluate(() => {
      if (window.__upstreamEvents) {
        window.__upstreamEvents.length = 0
      }
    })
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )

    const entry = ledger.cases.find((candidate) =>
      info.title.startsWith(`[${candidate.id}]`)
    )

    if (!entry) {
      throw new Error(`Missing Cypress port: ${info.title}`)
    }

    const result =
      adapter.host === 'react' ? entry.reference : entry.hosts[adapter.host]

    test.fail(
      result.status === 'fail' || result.status === 'intentional-difference',
      'reason' in result ? result.reason : entry.id
    )
  })
  test.afterEach(async () => {
    if (test.info().status === 'failed' || test.info().status === 'timedOut') {
      const evidence = await page.evaluate(() => ({
        events: window.__upstreamEvents,
        ready:
          document.querySelector<HTMLElement>('#app')?.dataset.upstreamReady,
        nodes: document
          .querySelectorAll<HTMLElement>(
            '.flow-node,.flow-vue-node,.flow-foldkit-node,.react-flow__node'
          )
          .values()
          .filter((element) =>
            element.matches(
              '.flow-node,.flow-vue-node,.flow-foldkit-node,.react-flow__node'
            )
          )
          .map((element) => ({
            id: element.dataset.nodeId ?? element.dataset.id,
            class: element.className,
            style: element.getAttribute('style'),
            pointerEvents: getComputedStyle(element).pointerEvents,
            bounds: element.getBoundingClientRect().toJSON(),
          }))
          .toArray(),
        edges: [
          ...document.querySelectorAll<SVGElement>(
            '[data-edge-id],.react-flow__edge'
          ),
        ].map((element) => ({
          id: element.dataset.edgeId ?? element.dataset.id,
          class: element.getAttribute('class'),
          pointerEvents: getComputedStyle(element).pointerEvents,
        })),
        viewports: [
          ...document.querySelectorAll(
            '[class$="-viewport"],.react-flow__viewport'
          ),
        ].map((element) => element.getAttribute('style')),
        controls: [
          ...document.querySelectorAll<HTMLInputElement>(
            '[data-upstream-control]'
          ),
        ].map((element) => ({ id: element.id, checked: element.checked })),
      }))

      await test.info().attach('upstream-input-evidence', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      })
    }

    // Cypress releases held keyboard modifiers between cases, including failures.
    await page.keyboard.up('Shift')
    await page.keyboard.up('Meta')
  })
  test.afterAll(async () => {
    await context?.close()
  })

  return {
    page: () => page,
    get: (selector: string) => adapter.locator(page, selector),
  }
}

type Position =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'center'
  | 'bottom'
  | { x: number; y: number }

export const point = async (
  element: Locator,
  position: Position = 'center'
) => {
  const b = await boundingBox(element)

  // Cypress 13.6.6 packages/driver/src/dom/coordinates.ts:174-280.
  switch (position) {
    case 'topLeft': {
      return { x: Math.ceil(b.x), y: Math.ceil(b.y) }
    }

    case 'topRight': {
      return { x: Math.floor(b.x + b.width) - 1, y: Math.ceil(b.y) }
    }

    case 'bottomLeft': {
      return { x: Math.ceil(b.x), y: Math.floor(b.y + b.height) - 1 }
    }

    case 'bottomRight': {
      return {
        x: Math.floor(b.x + b.width) - 1,
        y: Math.floor(b.y + b.height) - 1,
      }
    }

    case 'center': {
      return {
        x: Math.floor(b.x + b.width / 2),
        y: Math.floor(b.y + b.height / 2),
      }
    }

    case 'bottom': {
      return {
        x: Math.floor(b.x + b.width / 2),
        y: Math.floor(b.y + b.height) - 1,
      }
    }

    default: {
      return { x: Math.ceil(b.x + position.x), y: Math.ceil(b.y + position.y) }
    }
  }
}

// Cypress 13.6.6 click.ts:151-166 and actionability.ts:14 perform a
// 50ms post-action delay, including for forced clicks. Preserve that command
// behavior here, independently of the explicit waits in the upstream bodies.
// https://github.com/cypress-io/cypress/blob/v13.6.6/packages/driver/src/cy/commands/actions/click.ts#L151
export const click = async (
  page: Page,
  element: Locator,
  position: Position = 'center',
  options?: Parameters<Locator['click']>[0]
) => {
  const coordinates = await point(element, position)
  const bounds = await boundingBox(element)

  const border = await element.evaluate((el) => ({
    x: el.clientLeft,
    y: el.clientTop,
  }))

  // Cypress mouse.click(forceEl) dispatches to that subject even when covered.
  if (options?.force === true) {
    const nativeTarget = await element.evaluate(
      (el, at) => el.contains(document.elementFromPoint(at.x, at.y)),
      coordinates
    )

    // An unobstructed subject can use native input, including active pointer capture.
    if (nativeTarget) {
      await page.mouse.click(coordinates.x, coordinates.y)
      await page.waitForTimeout(50)

      return
    }

    // Covered forced subjects retain Cypress's targeted synthetic dispatch.
    const modifiers = Number(
      await page.locator('html').getAttribute('data-upstream-modifiers')
    )

    await element.evaluate(
      (el, input) => {
        const init = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: input.coordinates.x,
          clientY: input.coordinates.y,
          button: 0,
          buttons: 1,
          detail: 1,
          altKey: Math.floor(input.modifiers / 1) % 2 === 1,
          ctrlKey: Math.floor(input.modifiers / 2) % 2 === 1,
          metaKey: Math.floor(input.modifiers / 4) % 2 === 1,
          shiftKey: Math.floor(input.modifiers / 8) % 2 === 1,
        }

        el.dispatchEvent(
          new PointerEvent('pointerdown', {
            ...init,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
          })
        )
        el.dispatchEvent(new MouseEvent('mousedown', init))
        el.dispatchEvent(
          new PointerEvent('pointerup', {
            ...init,
            buttons: 0,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
          })
        )
        el.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }))
        el.dispatchEvent(new MouseEvent('click', { ...init, buttons: 0 }))
      },
      { coordinates, modifiers }
    )
    await page.waitForTimeout(50)

    return
  }

  // Cypress 13.6.6 visibility.ts:109-154 does not reject a painted SVG
  // solely because its geometric box has zero width or height. Playwright does.
  const zeroBoxSvg = await element.evaluate((el) => {
    if (!(el instanceof SVGGraphicsElement)) {
      return false
    }

    const box = el.getBBox()

    return box.width === 0 || box.height === 0
  })

  if (zeroBoxSvg) {
    await expect
      .poll(
        () =>
          element.evaluate((el, at) => {
            const hit = document.elementFromPoint(at.x, at.y)

            return hit !== null && el.contains(hit)
          }, coordinates),
        { timeout: 4000 }
      )
      .toBe(true)

    await page.mouse.click(coordinates.x, coordinates.y)
  } else {
    await element.click({
      ...options,
      position: {
        x: coordinates.x - bounds.x - border.x,
        y: coordinates.y - bounds.y - border.y,
      },
    })
  }

  await page.waitForTimeout(50)
}

export const doubleClick = async (page: Page, element: Locator) => {
  const coordinates = await point(element)
  const bounds = await boundingBox(element)

  const border = await element.evaluate((el) => ({
    x: el.clientLeft,
    y: el.clientTop,
  }))

  await element.dblclick({
    position: {
      x: coordinates.x - bounds.x - border.x,
      y: coordinates.y - bounds.y - border.y,
    },
  })
  await page.waitForTimeout(50)
}

// Cypress trigger coordinates are element-relative. CDP emits native pointer and
// compatibility mouse events, including release at a different coordinate without
// inserting a move. A default trigger('mouseup') uses the subject's current center.
export const trigger = async (
  page: Page,
  element: Locator,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  position: Position = 'center',
  button: 'left' | 'right' = 'left'
) => {
  const coordinates = await point(element, position)

  const modifiers = Number(
    await page.locator('html').getAttribute('data-upstream-modifiers')
  )

  const session = await page.context().newCDPSession(page)

  const types = {
    mousedown: 'mousePressed',
    mousemove: 'mouseMoved',
    mouseup: 'mouseReleased',
  } satisfies Record<
    typeof type,
    'mousePressed' | 'mouseMoved' | 'mouseReleased'
  >

  let buttons = button === 'right' ? 2 : 1

  if (type === 'mouseup') {
    buttons = 0
  }

  await session.send('Input.dispatchMouseEvent', {
    type: types[type],
    ...coordinates,
    modifiers,
    button,
    buttons,
    clickCount: type === 'mousemove' ? 0 : 1,
  })
  await session.detach()
}

// Cypress.$ and .then subjects retain the original DOM object across updates.
export const retain = async (locator: Locator) => {
  const element = await locator.elementHandle()

  if (element === null) {
    throw new Error('Missing Cypress subject')
  }

  return element
}

// Upstream: examples/react/cypress/support/commands.ts:1-18.
// nextX/nextY are intentionally passed as offsets, as Cypress trigger does.
export const drag = async (
  page: Page,
  element: Locator,
  delta: { x: number; y: number }
) => {
  const subject = await retain(element)
  const b = await boundingBox(element)
  await trigger(page, element, 'mousedown')
  await trigger(page, element, 'mousemove', {
    x: b.x + b.width / 2 + delta.x,
    y: b.y + b.height / 2 + delta.y,
  })
  await page.waitForTimeout(50)
  await trigger(page, element, 'mouseup')

  return subject
}

// Upstream: examples/react/cypress/support/commands.ts:20-34.
export const dragPane = async (
  page: Page,
  pane: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await trigger(page, pane, 'mousedown', from)
  await trigger(page, pane, 'mousemove', to)
  await trigger(page, pane, 'mouseup')
}

export const zoomPane = async (page: Page, pane: Locator, deltaY: number) => {
  const coordinates = await point(pane)
  await pane.dispatchEvent('wheel', {
    clientX: coordinates.x,
    clientY: coordinates.y,
    deltaY,
  })
  await page.waitForTimeout(250)
}

export const wheel = async (element: Locator, deltaY: number) => {
  const coordinates = await point(element, 'topLeft')
  await element.dispatchEvent('wheel', {
    clientX: coordinates.x,
    clientY: coordinates.y,
    deltaY,
  })
}

const readTransform = (el: HTMLElement | SVGElement) => {
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('Expected transform element')
  }

  return el.style.transform || `translate(${el.style.left},${el.style.top})`
}

export const transform = (element: Locator) => element.evaluate(readTransform)

export const transformRetained = (
  element: ElementHandle<HTMLElement | SVGElement>
) => element.evaluate(readTransform)

// Upstream: examples/react/cypress/support/commands.ts:36-58. These .then
// assertions do not retry and require every side inside, or the entire node outside.
export const isWithinViewport = async (page: Page, element: Locator) => {
  const b = await boundingBox(element)
  const size = page.viewportSize()

  if (!size) {
    throw new Error('Missing viewport')
  }

  expect(b.y).toBeGreaterThanOrEqual(0)
  expect(b.y).toBeLessThanOrEqual(size.height)
  expect(b.x + b.width).toBeGreaterThanOrEqual(0)
  expect(b.x + b.width).toBeLessThanOrEqual(size.width)
  expect(b.y + b.height).toBeGreaterThanOrEqual(0)
  expect(b.y + b.height).toBeLessThanOrEqual(size.height)
  expect(b.x).toBeGreaterThanOrEqual(0)
  expect(b.x).toBeLessThanOrEqual(size.width)
}

export const isOutsideViewport = async (page: Page, element: Locator) => {
  const b = await boundingBox(element)
  const size = page.viewportSize()

  if (!size) {
    throw new Error('Missing viewport')
  }

  expect(
    size.height < b.y ||
      b.y + b.height < 0 ||
      size.width < b.x ||
      b.x + b.width < 0
  ).toBe(true)
}

export const handleSelector = (
  adapter: UpstreamHostAdapter,
  kind: 'source' | 'target'
) => {
  if (adapter.host === 'react') {
    return `.react-flow__handle.${kind}`
  }

  return adapter.host === 'vanilla'
    ? `.flow-handle[data-kind="${kind}"]`
    : `.flow-${adapter.host}-handle[aria-label^="${kind} handle"]`
}
