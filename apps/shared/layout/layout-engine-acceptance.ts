import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { LayoutRecipeOwner } from './browser.ts'

const status = (page: Page) => page.getByTestId('recipe-status')

const open = async (page: Page, scene = 'auto-layout') => {
  await page.goto(`/ui-recipes/layout/?scene=${scene}`)
  await expect
    .poll(() => page.evaluate(() => globalThis.flowLayoutRecipe !== undefined))
    .toBeTruthy()
}

const positions = (page: Page) =>
  page.locator('[data-testid=flow-node]').evaluateAll((nodes) =>
    nodes.map((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new TypeError('Missing HTML node')
      }

      return {
        id: node.dataset.nodeId,
        left: node.style.left,
        top: node.style.top,
        transform: node.style.transform,
      }
    })
  )

const documentState = (
  page: Page
): Promise<Awaited<ReturnType<LayoutRecipeOwner['read']>>['document']> =>
  page.evaluate(async () => {
    if (globalThis.flowLayoutRecipe === undefined) {
      throw new Error('Missing recipe API')
    }

    const state = await globalThis.flowLayoutRecipe.read()

    return state.document
  })

const count = async (page: Page) =>
  Number(await status(page).getAttribute('data-layouts'))

const structuralViolations = (page: Page, direction: 'TB' | 'LR') =>
  page.evaluate(async (axis) => {
    if (globalThis.flowLayoutRecipe === undefined) {
      throw new Error('Missing recipe API')
    }

    const state = await globalThis.flowLayoutRecipe.read()

    const rects = new Map(
      [
        ...document.querySelectorAll<HTMLElement>('[data-testid=flow-node]'),
      ].map((node) => [node.dataset.nodeId, node.getBoundingClientRect()])
    )

    return state.document.edges.flatMap((edge) => {
      const source = rects.get(edge.source)
      const target = rects.get(edge.target)

      if (source === undefined || target === undefined) {
        return ['missing bounds']
      }

      return (
        axis === 'TB'
          ? target.top < source.bottom - 0.5
          : target.left < source.right - 0.5
      )
        ? [edge.id]
        : []
    })
  }, direction)

const nextFrame = () => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve(undefined))

  return promise
}

const nextFrames = async (page: Page) => {
  await page.evaluate(nextFrame)
  await page.evaluate(nextFrame)
  await page.evaluate(nextFrame)
  await page.evaluate(nextFrame)
}

export const layoutEngineAcceptance = (host: string, forceNode: string) => {
  it.describe(`${host} layout engines and force controls`, () => {
    it('switches the same measured graph among all engines and controls direction and spacing', async ({
      page,
    }) => {
      await open(page)
      await expect(status(page)).toHaveAttribute('data-layouts', '1')
      const initial = await documentState(page)
      const ids = initial.nodes.map(({ id }) => id)
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('hierarchy')
      await expect(status(page)).toHaveAttribute('data-engine', 'hierarchy')
      await expect.poll(() => structuralViolations(page, 'TB')).toEqual([])
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('elk')
      await expect(status(page)).toHaveAttribute('data-engine', 'elk')
      await page
        .getByLabel('Layout direction', { exact: true })
        .selectOption('LR')
      await expect(status(page)).toHaveAttribute('data-direction', 'LR')
      await expect.poll(() => structuralViolations(page, 'LR')).toEqual([])
      const before = await positions(page)
      await page.getByLabel('Rank spacing', { exact: true }).fill('140')
      await page.getByLabel('Rank spacing', { exact: true }).press('Tab')
      await expect.poll(() => positions(page)).not.toEqual(before)
      await page.getByLabel('Node spacing', { exact: true }).fill('80')
      await page.getByLabel('Node spacing', { exact: true }).press('Tab')
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('dagre')
      await expect(status(page)).toHaveAttribute('data-engine', 'dagre')
      await expect.poll(() => structuralViolations(page, 'LR')).toEqual([])
      const final = await documentState(page)
      expect(final.nodes.map(({ id }) => id)).toEqual(ids)
    })

    it('relayouts measured-size and edge-only public edits', async ({
      page,
    }) => {
      await open(page)
      await expect(status(page)).toHaveAttribute('data-layouts', '1')
      const initial = await count(page)
      await page.evaluate(async () => {
        await globalThis.flowLayoutRecipe?.edit({
          operations: [
            {
              kind: 'update-node',
              nodeId: '1',
              patch: {
                style: {
                  boxSizing: 'border-box',
                  width: '300px',
                  height: '120px',
                },
              },
            },
          ],
        })
      })
      await expect
        .poll(() =>
          page
            .locator('[data-testid=flow-node][data-node-id="1"]')
            .evaluate((node) => {
              if (!(node instanceof HTMLElement)) {
                throw new TypeError('Missing measured node')
              }

              return node.offsetWidth
            })
        )
        .toBe(300)
      await expect.poll(() => count(page)).toBeGreaterThan(initial)
      await expect.poll(() => structuralViolations(page, 'TB')).toEqual([])
      const sized = await count(page)
      const sizedPositions = await positions(page)
      await page.evaluate(async () => {
        await globalThis.flowLayoutRecipe?.edit({
          operations: [
            {
              kind: 'add-edges',
              edges: [
                {
                  id: 'edge-only',
                  source: '2a',
                  target: '3b',
                  sourceHandle: 'out',
                  targetHandle: 'in',
                },
              ],
            },
          ],
        })
      })
      await expect.poll(() => count(page)).toBeGreaterThan(sized)
      await expect.poll(() => structuralViolations(page, 'TB')).toEqual([])
      await page.keyboard.press('Control+z')
      await expect.poll(() => positions(page)).toEqual(sizedPositions)
      const restored = await documentState(page)
      expect(restored.edges.some(({ id }) => id === 'edge-only')).toBeFalsy()
    })

    it('visibly rejects multi-root and cyclic hierarchy inputs and recovers', async ({
      page,
    }) => {
      await open(page)
      await expect(status(page)).toHaveAttribute('data-layouts', '1')
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('hierarchy')
      await expect(status(page)).toHaveAttribute('data-engine', 'hierarchy')
      await page.evaluate(async () => {
        const fixture = globalThis.flowLayoutRecipe

        if (fixture === undefined) {
          throw new Error('Missing recipe API')
        }

        const { document } = await fixture.read()
        await fixture.edit({
          operations: [
            {
              kind: 'set-edges',
              edges: document.edges.filter(({ source }) => source !== '1'),
            },
          ],
        })
      })
      await expect(status(page)).toHaveAttribute(
        'data-error',
        /multiple roots/u
      )
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect(status(page)).toHaveAttribute('data-error', '')
      await page.evaluate(async () => {
        await globalThis.flowLayoutRecipe?.edit({
          operations: [
            {
              kind: 'add-edges',
              edges: [
                {
                  id: 'cycle',
                  source: '2a',
                  target: '1',
                  sourceHandle: 'out',
                  targetHandle: 'in',
                },
              ],
            },
          ],
        })
      })
      await expect(status(page)).toHaveAttribute('data-error', /no root|cycle/u)
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('dagre')
      await expect(status(page)).toHaveAttribute('data-error', '')
      await page.evaluate(async () => {
        await globalThis.flowLayoutRecipe?.edit({
          operations: [
            { kind: 'set-edges', edges: [] },
            { kind: 'set-nodes', nodes: [] },
          ],
        })
      })
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('hierarchy')
      await expect(status(page)).toHaveAttribute(
        'data-error',
        /measured nodes/u
      )
    })

    it('rejects invalid spacing without changing positions', async ({
      page,
    }) => {
      await open(page)
      await expect(status(page)).toHaveAttribute('data-layouts', '1')
      const before = await positions(page)
      await page.getByLabel('Rank spacing', { exact: true }).fill('-1')
      await page.getByLabel('Rank spacing', { exact: true }).press('Tab')
      await expect(status(page)).toHaveAttribute('data-error', /500|0|range/u)
      expect(await positions(page)).toEqual(before)
    })

    it('keeps the final request after rapid ELK switches and undoes a layout in one step', async ({
      page,
    }) => {
      await open(page)
      await expect(status(page)).toHaveAttribute('data-layouts', '1')
      const original = await positions(page)
      await page
        .getByLabel('Layout direction', { exact: true })
        .selectOption('LR')
      await expect(status(page)).toHaveAttribute('data-direction', 'LR')
      const horizontal = await positions(page)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => positions(page)).toEqual(original)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect.poll(() => positions(page)).toEqual(horizontal)
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('elk')
      await page
        .getByLabel('Layout engine', { exact: true })
        .selectOption('hierarchy')
      await page
        .getByLabel('Layout direction', { exact: true })
        .selectOption('TB')
      await expect(status(page)).toHaveAttribute('data-engine', 'hierarchy')
      await expect(status(page)).toHaveAttribute('data-direction', 'TB')
      await expect.poll(() => structuralViolations(page, 'TB')).toEqual([])
      const final = await positions(page)
      await nextFrames(page)
      expect(await positions(page)).toEqual(final)
    })

    it('changes live force parameters, settles, and undoes the run in one step', async ({
      page,
    }) => {
      await open(page, 'force-layout')
      await expect(status(page)).toHaveAttribute('data-strength', '-1000')
      await expect(status(page)).toHaveAttribute('data-distance', '150')
      await expect
        .poll(async () => Number(await status(page).getAttribute('data-ticks')))
        .toBeGreaterThan(0)
      await expect(status(page)).toHaveAttribute('data-running', 'false', {
        timeout: 15_000,
      })
      const before = await positions(page)
      await page.getByLabel('Link distance', { exact: true }).fill('300')
      await page.getByLabel('Link distance', { exact: true }).press('Tab')
      await expect(status(page)).toHaveAttribute('data-distance', '300')
      await expect(status(page)).toHaveAttribute('data-running', 'false', {
        timeout: 15_000,
      })
      const stretched = await positions(page)
      expect(stretched).not.toEqual(before)
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => positions(page)).toEqual(before)
      await page.getByRole('button', { name: 'Redo', exact: true }).click()
      await expect.poll(() => positions(page)).toEqual(stretched)
      await page.getByLabel('Force strength', { exact: true }).fill('-100')
      await page.getByLabel('Force strength', { exact: true }).press('Tab')
      await expect(status(page)).toHaveAttribute('data-strength', '-100')
      await expect(status(page)).toHaveAttribute('data-running', 'false', {
        timeout: 15_000,
      })
      expect(await positions(page)).not.toEqual(stretched)
      await page.getByLabel('Link distance', { exact: true }).fill('0')
      await page.getByLabel('Link distance', { exact: true }).press('Tab')
      await expect(status(page)).toHaveAttribute('data-error', /20|400/u)
    })

    it('pauses during an active drag, pins the drop and disposes its scheduler', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await open(page, 'force-layout')
      await expect
        .poll(async () => Number(await status(page).getAttribute('data-ticks')))
        .toBeGreaterThan(30)

      const node = page.locator(
        `[data-testid=flow-node][data-node-id="${forceNode}"]`
      )

      const box = await node.boundingBox()

      if (box === null) {
        throw new Error('Missing force node')
      }

      await expect
        .poll(() =>
          node.evaluate((element) => {
            const rect = element.getBoundingClientRect()

            return document
              .elementsFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2
              )
              .some((hit) => element.contains(hit))
          })
        )
        .toBeTruthy()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2)
      const ticks = await status(page).getAttribute('data-ticks')
      await nextFrames(page)
      expect(await status(page).getAttribute('data-ticks')).toBe(ticks)
      await page.mouse.move(
        box.x + box.width / 2 + 60,
        box.y + box.height / 2 + 35,
        { steps: 6 }
      )
      await page.mouse.up()
      await expect(status(page)).toHaveAttribute(
        'data-pinned',
        new RegExp(`^${forceNode}@`, 'u')
      )
      await expect(status(page)).toHaveAttribute('data-running', 'false', {
        timeout: 15_000,
      })

      const beforeDrop = await positions(page)
      const settledBox = await node.boundingBox()

      if (settledBox === null) {
        throw new Error('Missing settled force node')
      }

      await page.mouse.move(
        settledBox.x + settledBox.width / 2,
        settledBox.y + settledBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        settledBox.x + settledBox.width / 2 + 4,
        settledBox.y + settledBox.height / 2
      )
      await page.mouse.move(
        settledBox.x + settledBox.width / 2 + 40,
        settledBox.y + settledBox.height / 2 + 30,
        { steps: 6 }
      )
      await page.mouse.up()
      await expect(status(page)).toHaveAttribute('data-running', 'false', {
        timeout: 15_000,
      })
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      await expect.poll(() => positions(page)).toEqual(beforeDrop)
      await page.getByLabel('Force strength', { exact: true }).fill('-500')
      await page.getByLabel('Force strength', { exact: true }).press('Tab')

      const disposal = await page.evaluate(async () => {
        const element = document.querySelector<HTMLElement>(
          '[data-testid=recipe-status]'
        )

        if (element === null) {
          throw new Error('Missing force status')
        }

        globalThis.dispatchEvent(new Event('pagehide'))
        const before = element.dataset.ticks
        const { promise, resolve } = Promise.withResolvers<undefined>()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(undefined))
        )
        await promise

        return {
          before,
          after: element.dataset.ticks,
          running: element.dataset.running,
        }
      })

      expect(disposal.after).toBe(disposal.before)
      expect(disposal.running).toBe('false')
      expect(errors).toEqual([])
    })
  })
}
