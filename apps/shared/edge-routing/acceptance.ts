import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const it = test

const { describe } = test

const path = (page: Page) =>
  page
    .locator('[data-edge-id="ab"]')
    .locator('.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path')
    .first()

const action = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const read = (page: Page) =>
  page.evaluate(async () => ({
    document: await globalThis.flowRoutingDemo?.document(),
    result: globalThis.flowRoutingDemo?.result(),
    request: globalThis.flowRoutingDemo?.request(),
    geometry: globalThis.flowRoutingDemo?.geometry(),
  }))

const observed = async <A>(
  page: Page,
  select: (state: Awaited<ReturnType<typeof read>>) => A
): Promise<A> => select(await read(page))

const sameInputs = (state: Awaited<ReturnType<typeof read>>): boolean => {
  const { document, request, geometry } = state

  if (document === undefined || request === undefined) {
    return false
  }

  const portsMatch = request.connections.every((connection) => {
    const source = document.nodes.find(
      ({ id }) => id === connection.source.nodeId
    )

    const target = document.nodes.find(
      ({ id }) => id === connection.target.nodeId
    )

    return (
      source?.handles?.find(({ kind }) => kind === 'source')?.side ===
        connection.source.side &&
      target?.handles?.find(({ kind }) => kind === 'target')?.side ===
        connection.target.side
    )
  })

  const obstaclesMatch = request.obstacles.every((obstacle) => {
    const node = document.nodes.find(({ id }) => id === obstacle.id)

    return (
      node !== undefined &&
      node.size !== undefined &&
      node.position.x === obstacle.x &&
      node.position.y === obstacle.y &&
      node.size.width === obstacle.width &&
      node.size.height === obstacle.height
    )
  })

  return (
    geometry?.[0]?.edge.target === document.edges[0]?.target &&
    request.obstacles.length === document.nodes.length &&
    portsMatch &&
    obstaclesMatch
  )
}

const matched = async (page: Page) => {
  await expect(page.locator('#routing-status')).toHaveText('Routed')
  await expect
    .poll(async () => {
      const state = await read(page)
      const geometry = state.geometry?.find(({ id }) => id === 'ab')
      const actual = await path(page).getAttribute('d')
      const consistent = sameInputs(state)

      return consistent &&
        geometry !== undefined &&
        state.result?.revision === state.request?.revision &&
        actual === geometry.path
        ? true
        : {
            actual,
            expected: geometry?.path,
            revisionMatch: state.result?.revision === state.request?.revision,
            obstacles: state.request?.obstacles,
            nodes: state.document?.nodes.map(({ id, position, size }) => ({
              id,
              position,
              size,
            })),
          }
    })
    .toBe(true)

  return read(page)
}

export const edgeRoutingAcceptance = (host: string): void => {
  describe(`${host} obstacle-aware edge routing`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/edge-routing/')
      await matched(page)
    })

    it('renders the common detour, label and interaction path', async ({
      page,
    }) => {
      const state = await matched(page)
      const route = state.result?.paths[0]
      expect(route?.kind).toBe('routed')

      if (route?.kind === 'routed') {
        expect(route.points[0]).toEqual(state.geometry?.[0]?.source)
        expect(route.points.at(-1)).toEqual(state.geometry?.[0]?.target)
        expect(route.points.some(({ y }) => y < 130 || y > 270)).toBe(true)
      }

      const obstacle = await page
        .locator('[data-node-id="obstacle"]')
        .first()
        .boundingBox()

      if (obstacle === null) {
        throw new Error('Missing obstacle bounds')
      }

      const intersectsObstacle = await path(page).evaluate(
        (element, bounds) => {
          if (!(element instanceof SVGPathElement)) {
            throw new TypeError('Missing SVG path')
          }

          const matrix = element.getScreenCTM()

          if (matrix === null) {
            throw new Error('Missing screen transform')
          }

          const length = element.getTotalLength()

          return Array.from({ length: Math.ceil(length) + 1 }, (_, index) => {
            const point = element.getPointAtLength(Math.min(index, length))

            return new DOMPoint(point.x, point.y).matrixTransform(matrix)
          }).some(
            (point) =>
              point.x > bounds.x &&
              point.x < bounds.x + bounds.width &&
              point.y > bounds.y &&
              point.y < bounds.y + bounds.height
          )
        },
        obstacle
      )

      expect(intersectsObstacle).toBe(false)

      const hit = page
        .locator('[data-edge-id="ab"]')
        .locator(
          '.flow-edge-hit, .flow-vue-edge-hit-target, .flow-foldkit-edge-hit-target'
        )
        .first()

      await expect(hit).toHaveAttribute(
        'd',
        (await path(page).getAttribute('d')) ?? ''
      )

      const label = await page
        .locator(
          '.flow-edge-label, .flow-vue-edge-label, .flow-foldkit-edge-label'
        )
        .filter({ hasText: /^Routed edge$/u })
        .first()
        .boundingBox()

      const canvas = await page
        .locator('.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas')
        .first()
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect()

          return {
            x: bounds.x + element.clientLeft,
            y: bounds.y + element.clientTop,
          }
        })

      if (label === null || canvas === null) {
        throw new Error('Missing rendered label')
      }

      expect(label.x + label.width / 2 - canvas.x).toBeCloseTo(
        state.geometry?.[0]?.label.x ?? Number.NaN,
        0
      )
      expect(
        Math.abs(
          label.y +
            label.height / 2 -
            canvas.y -
            (state.geometry?.[0]?.label.y ?? Number.NaN)
        )
      ).toBeLessThan(4)

      const hitPoint = await path(page).evaluate((element) => {
        if (!(element instanceof SVGPathElement)) {
          throw new TypeError('Missing SVG path')
        }

        const point = element.getPointAtLength(element.getTotalLength() * 0.3)

        const screen = new DOMPoint(point.x, point.y).matrixTransform(
          element.getScreenCTM() ?? undefined
        )

        return { x: screen.x, y: screen.y }
      })

      await page.mouse.click(hitPoint.x, hitPoint.y)
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (current) => current.document?.edges[0]?.selected
            )
        )
        .toBe(true)
    })

    it('reroutes after a native obstacle drag', async ({ page }) => {
      const before = await path(page).getAttribute('d')
      const node = page.locator('[data-node-id="obstacle"]').first()
      const bounds = await node.boundingBox()

      if (bounds === null) {
        throw new Error('Missing obstacle')
      }

      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 25)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 225, {
        steps: 8,
      })
      await page.mouse.up()
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')
                  ?.position.y
            )
        )
        .toBeGreaterThan(300)
      await matched(page)
      await expect(path(page)).not.toHaveAttribute('d', before ?? '')
    })

    it('reroutes resized obstacles and reconnected endpoints', async ({
      page,
    }) => {
      const before = await path(page).getAttribute('d')
      await action(page, 'Resize obstacle')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')?.size
                  ?.height
            )
        )
        .toBe(330)
      await matched(page)
      await expect(path(page)).not.toHaveAttribute('d', before ?? '')
      await action(page, 'Reconnect')
      await expect
        .poll(
          async () =>
            await observed(page, (state) => state.document?.edges[0]?.target)
        )
        .toBe('c')
      const after = await matched(page)
      expect(after.result?.paths[0]?.kind).toBe('routed')
      expect(after.geometry?.[0]?.target.y).toBeGreaterThan(350)
    })

    it('follows changed handle directions', async ({ page }) => {
      await action(page, 'Vertical ports')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'a')?.handles?.[0]
                  ?.side
            )
        )
        .toBe('bottom')
      const state = await matched(page)
      const route = state.result?.paths[0]
      expect(route?.kind).toBe('routed')

      if (route?.kind === 'routed') {
        expect(route.points[1]?.y).toBeGreaterThan(
          route.points[0]?.y ?? Infinity
        )
        expect(route.points.at(-2)?.y).toBeLessThan(
          route.points.at(-1)?.y ?? -Infinity
        )
      }
    })

    it('shows an unreachable fallback and recovers without changing engines', async ({
      page,
    }) => {
      await action(page, 'Block port')
      await expect(page.locator('#routing-status')).toHaveText(
        'Unreachable; standard path fallback'
      )
      expect(
        await observed(page, (state) => state.result?.paths[0]?.kind)
      ).toBe('unreachable')
      await action(page, 'Reset')
      await matched(page)
    })

    it('shows an engine-failure fallback and recovers', async ({ page }) => {
      await page.evaluate(() => globalThis.flowRoutingDemo?.fail(true))
      await expect(page.locator('#routing-status')).toHaveText(
        'Routing failed; standard path fallback'
      )
      await page.evaluate(() => globalThis.flowRoutingDemo?.fail(false))
      await matched(page)
    })

    it('preserves authored manual points through move, resize, reconnect and reload', async ({
      page,
    }) => {
      await action(page, 'Manual route')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) => state.document?.edges[0]?.route?.mode
            )
        )
        .toBe('manual')

      await action(page, 'Move obstacle')
      await action(page, 'Resize obstacle')
      await action(page, 'Reconnect')
      await action(page, 'Save')
      await expect
        .poll(() => page.evaluate(() => globalThis.flowRoutingDemo?.saved()))
        .not.toBeUndefined()
      await action(page, 'Reset')
      await expect
        .poll(() => observed(page, (state) => state.document?.edges[0]?.route))
        .toBeUndefined()
      await action(page, 'Load')
      await matched(page)
      const state = await read(page)
      expect(state.document?.edges[0]?.route).toEqual({
        mode: 'manual',
        points: [
          { x: 270, y: 330 },
          { x: 540, y: 330 },
        ],
      })
      expect(state.document?.edges[0]?.data).toEqual({ opaque: ['keep', 162] })
      expect(state.request?.connections).toEqual([])
    })

    it('reconstructs automatic routes from saved intent without saving generated points', async ({
      page,
    }) => {
      const before = await path(page).getAttribute('d')
      await action(page, 'Save')
      await expect
        .poll(() => page.evaluate(() => globalThis.flowRoutingDemo?.saved()))
        .not.toBeUndefined()

      const saved = await page.evaluate(() =>
        JSON.stringify(globalThis.flowRoutingDemo?.saved())
      )

      expect(saved).not.toContain('"paths"')
      await action(page, 'Move obstacle')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')
                  ?.position.y
            )
        )
        .toBe(320)
      await action(page, 'Load')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')
                  ?.position.y
            )
        )
        .toBe(130)
      await matched(page)
      await expect(path(page)).toHaveAttribute('d', before ?? '')
    })

    it('rejects stale async results after rapid changes and cancellation', async ({
      page,
    }) => {
      await page.evaluate(() => globalThis.flowRoutingDemo?.delay(600))
      await action(page, 'Move obstacle')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')
                  ?.position.y
            )
        )
        .toBe(320)
      await page.evaluate(() => globalThis.flowRoutingDemo?.delay(0))
      await action(page, 'Resize obstacle')
      await expect
        .poll(
          async () =>
            await observed(
              page,
              (state) =>
                state.document?.nodes.find(({ id }) => id === 'obstacle')?.size
                  ?.height
            )
        )
        .toBe(330)
      await matched(page)
      const before = await path(page).getAttribute('d')
      await page.waitForTimeout(700)
      await expect(path(page)).toHaveAttribute('d', before ?? '')
    })

    it('keeps graph-space output through pan and zoom', async ({ page }) => {
      await action(page, 'Transform viewport')
      await matched(page)
      expect(
        await observed(page, (state) => state.result?.paths[0]?.kind)
      ).toBe('routed')
    })

    it('cancels pending routing when the host is disposed', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.evaluate(() => globalThis.flowRoutingDemo?.delay(600))
      await action(page, 'Move obstacle')
      await action(page, 'Dispose')
      await expect(page.locator('#routing-status')).toHaveText('Disposed')
      await page.waitForTimeout(700)
      expect(errors).toEqual([])
    })
  })
}
