import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const it = test

const { describe } = test

const read = (page: Page) =>
  page.evaluate(() => {
    if (globalThis.flowWireTiesDemo === undefined) {
      throw new Error('Missing wire tie demo')
    }

    return globalThis.flowWireTiesDemo.snapshot()
  })

const history = (page: Page) =>
  page.evaluate(() => globalThis.flowWireTiesDemo?.history())

const bundles = (page: Page) =>
  read(page).then(({ document }) => document.bundles)

const ties = (page: Page) => bundles(page).then((values) => values?.[0]?.ties)

const pastCount = (page: Page) =>
  history(page).then((status) => status?.pastCount)

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const path = (page: Page, id = 'coral') =>
  page
    .locator(`[data-edge-id="${id}"]`)
    .locator('.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path')
    .first()

const marker = (page: Page, index = 0) =>
  page.locator(`.wire-tie-marker[data-tie-index="${index}"]`)

const screen = async (page: Page, x: number, y: number) => {
  const snapshot = await read(page)
  const bounds = await page.locator('#app').boundingBox()

  if (bounds === null) {
    throw new Error('Missing canvas')
  }

  return {
    x: bounds.x + snapshot.viewport.x + x * snapshot.viewport.zoom,
    y: bounds.y + snapshot.viewport.y + y * snapshot.viewport.zoom,
  }
}

const slash = async (page: Page, x = 480, reverse = false, release = true) => {
  const start = await screen(page, x - 20, reverse ? 450 : 50)
  const end = await screen(page, x + 20, reverse ? 50 : 450)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 12 })

  if (release) {
    await page.mouse.up()
  }
}

const createTie = async (page: Page) => {
  const original = await path(page).getAttribute('d')
  await button(page, 'Tie wires')
  await slash(page)
  await expect(marker(page)).toHaveCount(1)
  await expect(path(page)).not.toHaveAttribute('d', original ?? '')
}

const center = async (page: Page, index = 0) => {
  const bounds = await marker(page, index).boundingBox()

  if (bounds === null) {
    throw new Error('Missing tie marker')
  }

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

export const wireTiesAcceptance = (host: string) =>
  describe(`wire ties ${host}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1120, height: 800 })
      await page.goto('/wire-ties/')
      await expect(
        page.getByRole('button', { name: 'Tie wires', exact: true })
      ).toBeVisible()
      await expect(path(page)).toBeVisible()
      await expect
        .poll(() => read(page).then(({ document }) => document.edges.length))
        .toBe(3)
    })

    it('shows the live guide/count, crosses mixed endpoints/colors in order and saves the ribbon', async ({
      page,
    }, info) => {
      const old = await path(page).getAttribute('d')
      await button(page, 'Tie wires')
      await slash(page, 480, false, false)
      await expect(
        page.getByRole('status', { name: 'Wire tie guide' })
      ).toHaveText('Tie 3 wires')
      await expect(page.locator('[data-wire-guide]')).toBeVisible()
      await page.screenshot({
        path: `/tmp/plan163/${info.project.name || host}-guide.png`,
      })
      await page.mouse.up()
      await expect(marker(page)).toHaveCount(1)
      const snapshot = await read(page)
      expect(snapshot.document.bundles?.[0]?.edgeIds).toEqual([
        'coral',
        'purple',
        'teal',
      ])
      await expect(path(page)).not.toHaveAttribute('d', old ?? '')

      await Promise.all(
        [
          ['coral', '#fa957e'],
          ['purple', '#a59bfa'],
          ['teal', '#49d6b1'],
        ].map(([id, stroke]) =>
          expect(path(page, id)).toHaveAttribute('stroke', stroke ?? '')
        )
      )

      await expect(marker(page)).toHaveAttribute('tabindex', '0')
      await expect(
        page.getByRole('status', { name: 'Wire tie guide' })
      ).toBeHidden()
      await slash(page, 650)
      await expect(marker(page, 1)).toHaveCount(1)
      await page.mouse.move(1000, 700)
      await page.screenshot({
        path: `/tmp/plan163/${info.project.name || host}-ribbon.png`,
      })
    })

    it('reverses lane order when the slash direction reverses', async ({
      page,
    }) => {
      await button(page, 'Tie wires')
      await slash(page, 480, true)
      await expect
        .poll(() =>
          read(page).then(({ document }) => document.bundles?.[0]?.edgeIds)
        )
        .toEqual(['teal', 'purple', 'coral'])
    })

    it('adds a second tie with its live hint and keeps the same bundle', async ({
      page,
    }) => {
      await createTie(page)
      await slash(page, 600, false, false)
      await expect(
        page.getByRole('status', { name: 'Wire tie guide' })
      ).toHaveText('Add a second tie')
      await page.mouse.up()
      await expect(marker(page, 1)).toHaveCount(1)
      const snapshot = await read(page)
      expect(snapshot.document.bundles).toHaveLength(1)
      expect(snapshot.document.bundles?.[0]?.ties).toHaveLength(2)
    })

    it('reroutes live during drag and commits a single undo step', async ({
      page,
    }) => {
      await createTie(page)
      const before = await read(page)
      const count = (await pastCount(page)) ?? 0
      const start = await center(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 80, start.y + 70, { steps: 6 })
      await expect(page.locator('[data-preview-edge]')).toHaveCount(3)
      expect(await bundles(page)).toEqual(before.document.bundles)

      const preview = await page
        .locator('[data-preview-edge="coral"]')
        .getAttribute('d')

      expect(preview).not.toBe(await path(page).getAttribute('d'))
      await page.mouse.up()
      await expect(page.locator('[data-preview-edge]')).toHaveCount(0)
      await expect
        .poll(() => history(page).then((status) => status?.pastCount))
        .toBe(count + 1)
      await expect
        .poll(() =>
          read(page).then(({ document }) => document.bundles?.[0]?.ties[0]?.x)
        )
        .toBeCloseTo((before.document.bundles?.[0]?.ties[0]?.x ?? 0) + 80, 5)
      await button(page, 'Undo')
      await expect
        .poll(() => read(page).then(({ document }) => document.bundles))
        .toEqual(before.document.bundles)
      await button(page, 'Redo')
      await expect
        .poll(() =>
          read(page).then(({ document }) => document.bundles?.[0]?.ties[0]?.x)
        )
        .toBeCloseTo((before.document.bundles?.[0]?.ties[0]?.x ?? 0) + 80, 5)
    })

    for (const kind of ['escape', 'capture', 'cancel', 'blur']) {
      it(`cancels tie previews on ${kind} without history`, async ({
        page,
      }) => {
        await createTie(page)
        const before = await read(page)
        const count = await pastCount(page)
        const start = await center(page)
        await page.mouse.move(start.x, start.y)
        await page.mouse.down()
        await page.mouse.move(start.x + 80, start.y + 40)
        await (kind === 'escape'
          ? page.keyboard.press('Escape')
          : page.evaluate((value) => {
              if (value === 'blur') {
                window.dispatchEvent(new Event('blur'))

                return
              }

              if (value === 'capture') {
                const owner = document.querySelector('.wire-tie-overlay')

                if (
                  owner instanceof SVGSVGElement &&
                  owner.hasPointerCapture(1)
                ) {
                  owner.releasePointerCapture(1)
                }

                return
              }

              document
                .querySelector('.wire-tie-overlay')
                ?.dispatchEvent(
                  new PointerEvent(
                    value === 'capture'
                      ? 'lostpointercapture'
                      : 'pointercancel',
                    { bubbles: true, pointerId: 1 }
                  )
                )
            }, kind))
        await page.mouse.up()
        await expect(page.locator('[data-preview-edge]')).toHaveCount(0)
        expect(await bundles(page)).toEqual(before.document.bundles)
        expect(await pastCount(page)).toBe(count)
      })
    }

    it('cancels a slash on Escape without creating a bundle', async ({
      page,
    }) => {
      await button(page, 'Tie wires')
      await slash(page, 480, false, false)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      expect(await bundles(page)).toBeUndefined()
    })

    it('keeps graph-space ties and lane geometry stable through pan and zoom', async ({
      page,
    }) => {
      await createTie(page)
      const before = await read(page)
      const original = await path(page).getAttribute('d')
      const location = await center(page)
      await button(page, 'Transform viewport')
      await expect
        .poll(() => read(page).then(({ viewport }) => viewport.zoom))
        .toBe(0.8)
      expect(await bundles(page)).toEqual(before.document.bundles)
      await expect(path(page)).toHaveAttribute('d', original ?? '')
      await expect
        .poll(() => center(page).then(({ x }) => x))
        .not.toBe(location.x)
    })

    it('reroutes endpoint motion and reconnection while retaining membership and ties', async ({
      page,
    }) => {
      await createTie(page)
      const before = await read(page)
      const old = await path(page).getAttribute('d')
      await button(page, 'Move endpoint')
      await expect(path(page)).not.toHaveAttribute('d', old ?? '')
      await button(page, 'Reconnect')
      await expect
        .poll(() =>
          read(page).then(
            ({ document }) =>
              document.edges.find(({ id }) => id === 'purple')?.target
          )
        )
        .toBe('b')
      expect(await bundles(page)).toEqual(before.document.bundles)
    })

    it('removes focused markers with Delete and undoes the removal', async ({
      page,
    }) => {
      await createTie(page)
      await slash(page, 600)
      await expect(marker(page, 1)).toHaveCount(1)
      await marker(page, 1).focus()
      await page.keyboard.press('Delete')
      await expect(marker(page, 1)).toHaveCount(0)
      expect(await ties(page)).toHaveLength(1)
      await button(page, 'Undo')
      await expect(marker(page, 1)).toHaveCount(1)
    })

    it('supports explicit edge removal and prunes bundles below two edges on deletion', async ({
      page,
    }) => {
      await createTie(page)
      await page.evaluate(async () => {
        await globalThis.flowWireTiesDemo?.apply({
          operations: [
            {
              kind: 'update-edge',
              edgeId: 'purple',
              patch: { selected: true },
            },
          ],
        })
      })
      await button(page, 'Remove selected edge from bundle')
      await expect
        .poll(() =>
          read(page).then(({ document }) => document.bundles?.[0]?.edgeIds)
        )
        .toEqual(['coral', 'teal'])
      await page.evaluate(async () => {
        await globalThis.flowWireTiesDemo?.apply({
          operations: [{ kind: 'delete-elements', edgeIds: ['teal'] }],
        })
      })
      await expect(marker(page)).toHaveCount(0)
      expect(await bundles(page)).toEqual([])
    })

    it('saves/loads v5 bundles and remaps their edge IDs and ties on clipboard paste', async ({
      page,
    }) => {
      await createTie(page)
      const before = await read(page)

      const object = await page.evaluate(() =>
        globalThis.flowWireTiesDemo?.object()
      )

      expect(object?.bundles).toEqual(before.document.bundles)
      await button(page, 'Save')
      await marker(page).focus()
      await page.keyboard.press('Delete')
      await expect(marker(page)).toHaveCount(0)
      await button(page, 'Load')
      await expect(marker(page)).toHaveCount(1)
      expect(await bundles(page)).toEqual(before.document.bundles)
      await page.evaluate(async () => {
        const snapshot = await globalThis.flowWireTiesDemo?.snapshot()

        if (snapshot !== undefined) {
          await globalThis.flowWireTiesDemo?.apply({
            operations: [
              {
                kind: 'set-nodes',
                nodes: snapshot.document.nodes.map((node) => ({
                  ...node,
                  selected: true,
                })),
              },
            ],
          })
        }
      })
      await button(page, 'Copy')
      await button(page, 'Paste')
      await expect
        .poll(() => read(page).then(({ document }) => document.bundles?.length))
        .toBe(2)
      const after = await read(page)
      expect(after.document.bundles?.[1]?.edgeIds).toEqual([
        'coral-copy-1',
        'purple-copy-1',
        'teal-copy-1',
      ])
      expect(after.document.bundles?.[1]?.ties[0]?.x).toBe(
        (before.document.bundles?.[0]?.ties[0]?.x ?? 0) + 20
      )
      await button(page, 'Undo')
      await expect
        .poll(() => read(page).then(({ document }) => document.edges.length))
        .toBe(3)
      expect(await bundles(page)).toEqual(before.document.bundles)
    })

    it('routes the ribbon around an obstacle with the configured capability, including drag previews', async ({
      page,
    }) => {
      await page.goto('/wire-ties/?router')
      await expect(
        page.getByRole('button', { name: 'Tie wires', exact: true })
      ).toBeVisible()
      await createTie(page)
      await page.evaluate(async () => {
        const snapshot = await globalThis.flowWireTiesDemo?.snapshot()

        if (snapshot === undefined) {
          throw new Error('Missing snapshot')
        }

        await globalThis.flowWireTiesDemo?.apply({
          operations: [
            {
              kind: 'set-nodes',
              nodes: [
                ...snapshot.document.nodes,
                {
                  id: 'obstacle',
                  label: 'Obstacle',
                  position: { x: 300, y: 180 },
                  size: { width: 100, height: 160 },
                },
              ],
            },
          ],
        })
        await globalThis.flowWireTiesDemo?.refresh()
      })
      await expect(page.locator('#wire-routing-state')).toHaveAttribute(
        'data-state',
        'ready'
      )

      const clear = (
        selector = '.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path'
      ) =>
        page.locator(selector).evaluateAll(
          (elements) =>
            elements.length === 3 &&
            elements.every((element) => {
              if (!(element instanceof SVGPathElement)) {
                return false
              }

              const length = element.getTotalLength()

              for (let distance = 0; distance <= length; distance += 1) {
                const point = element.getPointAtLength(distance)

                if (
                  point.x > 292 &&
                  point.x < 408 &&
                  point.y > 172 &&
                  point.y < 348
                ) {
                  return false
                }
              }

              return true
            })
        )

      await expect.poll(clear).toBeTruthy()
      const start = await center(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 70, start.y + 50, { steps: 4 })
      await expect(page.locator('#wire-routing-state')).toHaveAttribute(
        'data-state',
        'ready'
      )
      await expect(page.locator('[data-preview-edge]')).toHaveCount(3)
      await expect.poll(() => clear('[data-preview-edge]')).toBeTruthy()
      await page.mouse.up()
      await expect(page.locator('#wire-routing-state')).toHaveAttribute(
        'data-state',
        'ready'
      )
      await expect.poll(clear).toBeTruthy()
    })

    it('keeps one four-unit ribbon corridor around an obstacle between two ties', async ({
      page,
    }) => {
      await page.goto('/wire-ties/?router')
      await expect(
        page.getByRole('button', { name: 'Tie wires', exact: true })
      ).toBeVisible()
      await createTie(page)
      await slash(page, 650)
      await expect(marker(page, 1)).toHaveCount(1)
      await page.evaluate(async () => {
        const snapshot = await globalThis.flowWireTiesDemo?.snapshot()

        if (snapshot === undefined) {
          throw new Error('Missing snapshot')
        }

        await globalThis.flowWireTiesDemo?.apply({
          operations: [
            {
              kind: 'set-nodes',
              nodes: [
                ...snapshot.document.nodes,
                {
                  id: 'obstacle',
                  label: 'Ribbon obstacle',
                  position: { x: 550, y: 160 },
                  size: { width: 40, height: 200 },
                },
              ],
            },
          ],
        })
        await globalThis.flowWireTiesDemo?.refresh()
      })
      await test.info().attach('two-tie-routing-scene', {
        body: JSON.stringify(await read(page)),
        contentType: 'application/json',
      })
      await expect(page.locator('#wire-routing-state')).toHaveAttribute(
        'data-state',
        'ready'
      )

      const ribbon = () =>
        page
          .locator(
            '.flow-edge-path, .flow-vue-edge-path, .flow-foldkit-edge-path'
          )
          .evaluateAll((elements) => {
            const ordinates: number[] = []
            let clear = elements.length === 3

            for (const element of elements) {
              if (!(element instanceof SVGPathElement)) {
                clear = false
                continue
              }

              const length = element.getTotalLength()
              let previous = element.getPointAtLength(0)
              let crossing: number | undefined

              for (
                let distance = 1;
                distance <= Math.ceil(length);
                distance += 1
              ) {
                const point = element.getPointAtLength(
                  Math.min(distance, length)
                )

                if (
                  point.x > 542 &&
                  point.x < 598 &&
                  point.y > 152 &&
                  point.y < 368
                ) {
                  clear = false
                }

                if (
                  crossing === undefined &&
                  ((previous.x < 570 && point.x >= 570) ||
                    (previous.x > 570 && point.x <= 570))
                ) {
                  crossing =
                    previous.y +
                    ((point.y - previous.y) * (570 - previous.x)) /
                      (point.x - previous.x)
                }

                previous = point
              }

              if (crossing !== undefined) {
                ordinates.push(crossing)
              }
            }

            return { clear, ordinates: ordinates.toSorted((a, b) => a - b) }
          })

      await expect.poll(() => ribbon().then(({ clear }) => clear)).toBe(true)
      await expect
        .poll(() => ribbon().then(({ ordinates }) => ordinates.length))
        .toBe(3)
      const { ordinates } = await ribbon()
      expect((ordinates[1] ?? 0) - (ordinates[0] ?? 0)).toBeCloseTo(4, 4)
      expect((ordinates[2] ?? 0) - (ordinates[1] ?? 0)).toBeCloseTo(4, 4)
    })

    it('auto-pans a captured tie preview and cancels without a semantic edit', async ({
      page,
    }) => {
      await createTie(page)
      const before = await read(page)
      const count = await pastCount(page)
      const start = await center(page)
      const bounds = await page.locator('#app').boundingBox()

      if (bounds === null) {
        throw new Error('Missing owner')
      }

      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width - 10, start.y)
      await expect
        .poll(() => read(page).then(({ viewport }) => viewport.x))
        .toBeLessThan(before.viewport.x)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      expect(await bundles(page)).toEqual(before.document.bundles)
      expect(await pastCount(page)).toBe(count)
    })

    it('preserves ordinary pane pan and edge selection outside tie mode', async ({
      page,
    }) => {
      await createTie(page)
      await button(page, 'Tie wires')
      const before = await read(page)
      const start = await screen(page, 600, 500)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 50, start.y + 30, { steps: 4 })
      await page.mouse.up()
      await expect
        .poll(() => read(page).then(({ viewport }) => viewport.x))
        .toBeGreaterThan(before.viewport.x)

      const point = await path(page).evaluate((element) => {
        if (!(element instanceof SVGPathElement)) {
          throw new TypeError('Missing edge path')
        }

        const position = element.getPointAtLength(
          element.getTotalLength() * 0.3
        )

        const screenPosition = new DOMPoint(
          position.x,
          position.y
        ).matrixTransform(element.getScreenCTM() ?? undefined)

        return { x: screenPosition.x, y: screenPosition.y }
      })

      await page.mouse.click(point.x, point.y)
      await expect
        .poll(() =>
          read(page).then(
            ({ document }) =>
              document.edges.find(({ id }) => id === 'coral')?.selected
          )
        )
        .toBe(true)
      expect(await bundles(page)).toEqual(before.document.bundles)
    })

    it('leaves pan/selection available outside tie mode and disposes active previews', async ({
      page,
    }) => {
      await createTie(page)
      await button(page, 'Tie wires')
      await expect(page.locator('.wire-tie-overlay')).not.toHaveClass(/tying/u)
      const start = await center(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 80, start.y + 60)
      await page.evaluate(() => globalThis.flowWireTiesDemo?.dispose())
      await page.mouse.up()
      await expect(page.locator('.wire-tie-overlay')).toHaveCount(0)
      await expect(page.locator('[data-preview-edge]')).toHaveCount(0)
    })
  })
