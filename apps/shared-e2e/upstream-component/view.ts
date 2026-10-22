import { test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  expect,
  componentMount,
  latestViewport,
  drag,
  dragPane,
  zoomPane,
  isWithinViewport,
  transform,
  boundingBox,
} from './helpers.ts'

export const viewContract = (adapter: UpstreamHostAdapter) => {
  const get = (page: Page, selector: string) => adapter.locator(page, selector)
  // examples/react/cypress/components/reactflow/view-props.cy.tsx:24
  test('[UP-128-055] uses fitView', async ({ page }) => {
    await componentMount(page, adapter, 55)
    await page.waitForTimeout(200)
    await isWithinViewport(page, get(page, '.react-flow__node').first())
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:29
  test('[UP-128-056] uses fitViewOptions', async ({ page }) => {
    await componentMount(page, adapter, 56)
    await page.waitForTimeout(200)
    await isWithinViewport(page, get(page, '.react-flow__node').first())
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:37
  test('[UP-128-057] minZoom: 0.2', async ({ page }) => {
    await componentMount(page, adapter, 57)
    await zoomPane(page, get(page, '.react-flow__pane'), 10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(0.2)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:46
  test('[UP-128-058] minZoom: 1', async ({ page }) => {
    await componentMount(page, adapter, 58)
    await zoomPane(page, get(page, '.react-flow__pane'), 10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(1)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:55
  test('[UP-128-059] sets invalid defaultZoom', async ({ page }) => {
    await componentMount(page, adapter, 59)
    await zoomPane(page, get(page, '.react-flow__pane'), 10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(1)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:67
  test('[UP-128-060] maxZoom: 1', async ({ page }) => {
    await componentMount(page, adapter, 60)
    await zoomPane(page, get(page, '.react-flow__pane'), -10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(1)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:76
  test('[UP-128-061] maxZoom: 2', async ({ page }) => {
    await componentMount(page, adapter, 61)
    await zoomPane(page, get(page, '.react-flow__pane'), -10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(2)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:85
  test('[UP-128-062] sets invalid defaultZoom', async ({ page }) => {
    await componentMount(page, adapter, 62)
    await zoomPane(page, get(page, '.react-flow__pane'), -10_000)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(1.5)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:97
  test('[UP-128-063] defaultViewport: { x: 0, y: 0, zoom: 1 }', async ({
    page,
  }) => {
    await componentMount(page, adapter, 63)
    await expect
      .poll(() => latestViewport(page))
      .toEqual({ x: 0, y: 0, zoom: 1 })
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:106
  test('[UP-128-064] defaultViewport: { x: 0, y: 0, zoom: 1.5 }', async ({
    page,
  }) => {
    await componentMount(page, adapter, 64)
    await expect
      .poll(() => latestViewport(page))
      .toEqual({ x: 0, y: 0, zoom: 1.5 })
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:115
  test('[UP-128-065] defaultViewport: { x: 100, y: 100, zoom: 1.5 }', async ({
    page,
  }) => {
    await componentMount(page, adapter, 65)
    await expect
      .poll(() => latestViewport(page))
      .toEqual({ x: 100, y: 100, zoom: 1.5 })
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:124
  test('[UP-128-066] defaultViewport: invalid { x: 0, y: 0, zoom: -1 }', async ({
    page,
  }) => {
    await componentMount(page, adapter, 66)
    await expect
      .poll(() =>
        get(page, '.react-flow__viewport').evaluateAll((elements) => {
          const [element] = elements

          return element
            ? new DOMMatrixReadOnly(getComputedStyle(element).transform).a
            : undefined
        })
      )
      .toBe(0.5)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(0.5)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:134
  test('[UP-128-067] defaultViewport: invalid { x: 0, y: 0, zoom: 100 }', async ({
    page,
  }) => {
    await componentMount(page, adapter, 67)
    await expect
      .poll(async () => {
        const viewport = await latestViewport(page)

        return viewport?.zoom
      })
      .toBe(2)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:145
  test('[UP-128-068] uses snapGrid and snapToGrid', async ({ page }) => {
    await componentMount(page, adapter, 68)
    await drag(page, get(page, '.react-flow__node').first(), { x: 125, y: 125 })
    expect(
      await get(page, '.react-flow__node')
        .first()
        .evaluate((el) => {
          const style = getComputedStyle(el)
          const matrix = new DOMMatrixReadOnly(style.transform)

          return [
            matrix.m41 + (Number(style.left.replace('px', '')) || 0),
            matrix.m42 + (Number(style.top.replace('px', '')) || 0),
          ]
        })
    ).toEqual([100, 100])
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:158
  test('[UP-128-069] displays no nodes', async ({ page }) => {
    await componentMount(page, adapter, 69)
    await expect(get(page, '.react-flow__node')).toHaveCount(0)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:164
  test('[UP-128-070] displays one node', async ({ page }) => {
    await componentMount(page, adapter, 70)
    await expect(get(page, '.react-flow__node')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:177
  test('[UP-128-071] uses translateExtent', async ({ page }) => {
    await componentMount(page, adapter, 71)
    const before = await transform(get(page, '.react-flow__viewport'))
    await dragPane(
      page,
      get(page, '.react-flow__pane'),
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    )
    expect(await transform(get(page, '.react-flow__viewport'))).toEqual(before)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:193
  test('[UP-128-072] uses nodeExtent', async ({ page }) => {
    await componentMount(page, adapter, 72)
    await page.waitForTimeout(500)

    const point = await get(page, '.react-flow__node')
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el)
        const matrix = new DOMMatrixReadOnly(style.transform)

        return {
          x: matrix.m41 + (Number(style.left.replace('px', '')) || 0),
          y: matrix.m42 + (Number(style.top.replace('px', '')) || 0),
        }
      })

    expect(point.x).toBe(50)
    expect(point.y).toBe(50)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:228
  test('[UP-128-073] lets user scroll', async ({ page }) => {
    await componentMount(page, adapter, 73)
    await get(page, '.react-flow__pane').dispatchEvent('wheel', {
      wheelDelta: 240,
      wheelDeltaX: 0,
      wheelDeltaY: 240,
    })
    // Upstream scrollY assertion is commented out at view-props.cy.tsx:241.
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:246
  test('[UP-128-074] does not user scroll', async ({ page }) => {
    await componentMount(page, adapter, 74)
    await get(page, '.react-flow__pane').dispatchEvent('wheel', {
      wheelDelta: 240,
      wheelDeltaX: 0,
      wheelDeltaY: 240,
    })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:264
  test('[UP-128-075] displays it on the bottom right', async ({ page }) => {
    await componentMount(page, adapter, 75)
    const attribution = page.locator('[class*="attribution"]')
    await expect(attribution).toHaveCount(1)
    const bounds = await boundingBox(attribution)
    const size = page.viewportSize()
    expect(bounds.x).toBe((size?.width ?? 0) - bounds.width)
    expect(bounds.y).toBe((size?.height ?? 0) - bounds.height)
  })

  // examples/react/cypress/components/reactflow/view-props.cy.tsx:275
  test('[UP-128-076] displays it on the top left', async ({ page }) => {
    await componentMount(page, adapter, 76)
    const attribution = page.locator('[class*="attribution"]')
    await expect(attribution).toHaveCount(1)
    const bounds = await boundingBox(attribution)
    expect(bounds.x).toBe(0)
    expect(bounds.y).toBe(0)
  })
}
