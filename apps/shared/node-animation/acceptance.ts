import { expect, test as it } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { NodeAnimationDemo } from './demo.ts'

const { describe } = it

const status = (page: Page) => page.locator('#animation-status')

const node = (page: Page, id: string) =>
  page.locator(`[data-testid=flow-node][data-node-id="${id}"]`)

const read = (page: Page): ReturnType<NodeAnimationDemo['read']> =>
  page.evaluate(() => {
    if (globalThis.flowNodeAnimationDemo === undefined) {
      throw new Error('Missing animation API')
    }

    return globalThis.flowNodeAnimationDemo.read()
  })

const past = (page: Page) =>
  page.evaluate(
    async () =>
      await globalThis.flowNodeAnimationDemo
        ?.history()
        .then((value) => value?.pastCount)
  )

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const duration = async (page: Page, value: string) => {
  await page.getByLabel('Animation duration').fill(value)
  await page.getByLabel('Animation duration').press('Tab')
}

const open = async (page: Page) => {
  await page.goto('/node-animation/')
  await expect(status(page)).toHaveAttribute('data-state', 'ready')
  await expect
    .poll(async () => await read(page).then((value) => value.input.unmeasured))
    .toEqual([])
}

const sample = (page: Page) =>
  page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>('[data-testid=flow-node]'),
    ].map((element) => {
      const style = getComputedStyle(element)
      const transform = new DOMMatrixReadOnly(style.transform)

      return {
        id: element.dataset.nodeId,
        x: (Number(style.left.replace(/px$/u, '')) || 0) + transform.e,
        y: (Number(style.top.replace(/px$/u, '')) || 0) + transform.f,
      }
    })

    const path = document.querySelector<SVGPathElement>(
      'path.flow-edge-path[data-edge-id="ab"], [data-testid=flow-edge][data-edge-id="ab"] [data-testid=flow-edge-path], svg.flow-foldkit-edge[data-edge-id="ab"] path'
    )

    const source = document
      .querySelector('[data-node-id="a"] [data-handle-id="out"]')
      ?.getBoundingClientRect()

    const target = document
      .querySelector('[data-node-id="b"] [data-handle-id="in"]')
      ?.getBoundingClientRect()

    const label = [
      ...document.querySelectorAll(
        '[data-testid=flow-edge-label], .flow-foldkit-edge-label'
      ),
    ]
      .find((element) => element.textContent === 'A to B')
      ?.getBoundingClientRect()

    const matrix = path?.getScreenCTM()

    if (
      path === null ||
      source === undefined ||
      target === undefined ||
      label === undefined ||
      matrix === null ||
      matrix === undefined
    ) {
      throw new Error('Missing attached geometry')
    }

    const start = path.getPointAtLength(0).matrixTransform(matrix)

    const end = path
      .getPointAtLength(path.getTotalLength())
      .matrixTransform(matrix)

    const middle = path
      .getPointAtLength(path.getTotalLength() / 2)
      .matrixTransform(matrix)

    return {
      nodes,
      attachment: Math.max(
        Math.hypot(
          start.x - source.right,
          start.y - source.y - source.height / 2
        ),
        Math.hypot(end.x - target.left, end.y - target.y - target.height / 2)
      ),
      label: Math.hypot(
        middle.x - label.x - label.width / 2,
        middle.y - label.y - label.height / 2
      ),
    }
  })

const exact = async (page: Page) => {
  await expect
    .poll(async () => {
      const state = await read(page)
      const drawn = await sample(page)

      return state.document.nodes.flatMap((current) => {
        const actual = drawn.nodes.find(({ id }) => id === current.id)

        return actual !== undefined &&
          Math.abs(actual.x - current.position.x) < 0.001 &&
          Math.abs(actual.y - current.position.y) < 0.001
          ? []
          : [current.id]
      })
    })
    .toEqual([])
  const state = await read(page)
  const drawn = await sample(page)

  for (const current of state.document.nodes) {
    const actual = drawn.nodes.find(({ id }) => id === current.id)
    expect(actual?.x).toBeCloseTo(current.position.x, 3)
    expect(actual?.y).toBeCloseTo(current.position.y, 3)
  }

  expect(drawn.attachment).toBeLessThan(1)
  expect(drawn.label).toBeLessThan(1)
}

const frame = () => {
  const completion = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => completion.resolve(undefined))

  return completion.promise
}

const frames = async (page: Page) => {
  await page.evaluate(frame)
  await page.evaluate(frame)
  await page.evaluate(frame)
  await page.evaluate(frame)
}

export const nodeAnimationAcceptance = (host: string) => {
  describe(`${host} node position animation`, () => {
    it('draws intermediate nodes, attached paths and labels, finishes exactly, and records one undo action', async ({
      page,
    }) => {
      await open(page)
      await duration(page, '1200')
      const initial = await read(page).then((value) => value.document)
      const before = await past(page)
      await button(page, 'Horizontal')
      await expect(status(page)).toHaveAttribute('data-state', 'running')
      await expect
        .poll(async () => {
          const drawn = await sample(page)

          const target = await read(page).then((value) =>
            value.document.nodes.find(({ id }) => id === 'b')
          )

          const b = drawn.nodes.find(({ id }) => id === 'b')

          return (
            b !== undefined &&
            target !== undefined &&
            b.x > 70 &&
            b.x < target.position.x - 5 &&
            drawn.attachment < 1 &&
            drawn.label < 1
          )
        })
        .toBeTruthy()
      await expect(status(page)).toHaveAttribute('data-state', 'finished')
      await exact(page)
      expect(await past(page)).toBe((before ?? 0) + 1)
      const destination = await read(page).then((value) => value.document)
      await button(page, 'Undo')
      await expect
        .poll(
          async () =>
            await read(page).then((value) =>
              value.document.nodes.map(({ position }) => position)
            )
        )
        .toEqual(initial.nodes.map(({ position }) => position))
      await exact(page)
      await button(page, 'Redo')
      await expect
        .poll(
          async () =>
            await read(page).then((value) =>
              value.document.nodes.map(({ position }) => position)
            )
        )
        .toEqual(destination.nodes.map(({ position }) => position))
      await exact(page)
    })

    it('rebases rapid toggles on the displayed position and keeps the final request', async ({
      page,
    }) => {
      await open(page)
      await duration(page, '2000')
      await button(page, 'Horizontal')
      await expect
        .poll(
          async () =>
            (await sample(page).then(
              (value) => value.nodes.find(({ id }) => id === 'b')?.x
            )) ?? 0
        )
        .toBeGreaterThan(90)

      const before = await sample(page).then((value) =>
        value.nodes.find(({ id }) => id === 'b')
      )

      await button(page, 'Vertical')

      const rebased = await sample(page).then((value) =>
        value.nodes.find(({ id }) => id === 'b')
      )

      expect(Math.abs((rebased?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(40)
      await button(page, 'Horizontal')
      await button(page, 'Vertical')
      await expect(status(page)).toHaveAttribute('data-direction', 'TB')
      await expect(status(page)).toHaveAttribute('data-state', 'finished')
      await exact(page)
      const final = await sample(page)
      await frames(page)
      expect(await sample(page)).toEqual(final)
    })

    it('removes a node during animation and keeps paths and labels attached under pan and zoom', async ({
      page,
    }) => {
      await open(page)
      await duration(page, '1200')
      await button(page, 'Horizontal')
      await expect(status(page)).toHaveAttribute('data-state', 'running')
      await button(page, 'Pan and zoom')
      await button(page, 'Remove C')
      await expect(node(page, 'c')).toHaveCount(0)
      await expect
        .poll(async () => await sample(page).then((value) => value.attachment))
        .toBeLessThan(1)
      await expect
        .poll(async () => await sample(page).then((value) => value.label))
        .toBeLessThan(1)
      await expect(status(page)).toHaveAttribute('data-state', 'finished')
      await exact(page)
      await expect(node(page, 'c')).toHaveCount(0)
      expect(
        await read(page).then((value) =>
          value.document.edges.map(({ id }) => id)
        )
      ).toEqual(['ab'])
    })

    it('cancels on manual drag without jumping and keeps the accepted drop as one history action', async ({
      page,
    }) => {
      await open(page)
      await duration(page, '3000')
      const before = await past(page)
      await button(page, 'Horizontal')
      await expect
        .poll(
          async () =>
            (await sample(page).then(
              (value) => value.nodes.find(({ id }) => id === 'b')?.x
            )) ?? 0
        )
        .toBeGreaterThan(90)
      const box = await node(page, 'b').boundingBox()

      if (box === null) {
        throw new Error('Missing drag node')
      }

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await expect(status(page)).toHaveAttribute('data-state', 'cancelled')

      const frozen = await sample(page).then((value) =>
        value.nodes.find(({ id }) => id === 'b')
      )

      await frames(page)
      expect(
        await sample(page).then((value) =>
          value.nodes.find(({ id }) => id === 'b')
        )
      ).toEqual(frozen)
      await page.mouse.move(
        box.x + box.width / 2 + 60,
        box.y + box.height / 2 + 30,
        { steps: 6 }
      )
      await page.mouse.up()

      const dropped = await read(page).then(
        (value) => value.document.nodes.find(({ id }) => id === 'b')?.position
      )

      expect(dropped?.x).toBeCloseTo((frozen?.x ?? 0) + 60, 0)
      expect(dropped?.y).toBeCloseTo((frozen?.y ?? 0) + 30, 0)
      await exact(page)
      await frames(page)
      expect(
        await read(page).then(
          (value) => value.document.nodes.find(({ id }) => id === 'b')?.position
        )
      ).toEqual(dropped)
      expect(await past(page)).toBe((before ?? 0) + 2)

      const destination = await read(page).then((value) =>
        value.document.nodes.map(({ position }) => position)
      )

      await button(page, 'Undo')
      await expect
        .poll(() =>
          read(page).then((value) =>
            value.document.nodes.map(({ position }) => position)
          )
        )
        .not.toEqual(destination)
      await exact(page)
    })

    it('completes immediately under reduced motion and preserves destination fields through clipboard', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page)
      await duration(page, '10000')
      await button(page, 'Horizontal')
      await expect(status(page)).toHaveAttribute('data-state', 'finished')
      await exact(page)
      await node(page, 'b').click()
      await button(page, 'Copy')
      await button(page, 'Paste')
      await expect(page.locator('[data-testid=flow-node]')).toHaveCount(4)
      const state = await read(page)

      const copied = state.document.nodes.find(
        ({ id }) => !['a', 'b', 'c'].includes(id)
      )

      expect(copied?.data).toEqual({
        opaque: { preserved: ['animation', 159] },
      })
      const original = state.document.nodes.find(({ id }) => id === 'b')
      expect(copied?.position).toEqual({
        x: (original?.position.x ?? 0) + 20,
        y: (original?.position.y ?? 0) + 20,
      })
      expect(JSON.stringify(state.document)).not.toContain('elapsed')
    })

    it('disposes pending frames on host teardown and a new mount starts clean', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await open(page)
      await duration(page, '10000')
      await button(page, 'Horizontal')
      await expect(status(page)).toHaveAttribute('data-state', 'running')
      await button(page, 'Dispose')
      await expect(status(page)).toHaveAttribute('data-state', 'disposed')
      const after = await page.locator('#app').innerHTML()
      await frames(page)
      expect(await page.locator('#app').innerHTML()).toBe(after)
      await page.reload()
      await expect(status(page)).toHaveAttribute('data-state', 'ready')
      expect(await past(page)).toBe(0)
      expect(errors).toEqual([])
    })
  })
}
