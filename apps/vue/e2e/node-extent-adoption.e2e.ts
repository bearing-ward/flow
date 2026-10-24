import { expect, test } from '@playwright/test'

import { nodeExtentAdoptionContract } from '../../shared-e2e/node-extent-adoption-contract.ts'

test.use({ viewport: { width: 500, height: 500 } })

nodeExtentAdoptionContract('vue')

test.describe('expanded parent adoption', () => {
  test.use({ viewport: { width: 960, height: 640 } })

  // Pinned system/src/utils/store.ts:157,459. Preview ownership must survive until commit.
  test('parent preview measurement stays provisional until the child drop commits', async ({
    page,
  }, info) => {
    await page.goto('/test.html')
    await page.evaluate(async () => {
      const { mountFinalWiringFixture } =
        await import('../src/final-wiring-test.ts')

      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing fixture root')
      }

      mountFinalWiringFixture(root, { scene: 'extents', model: 'controlled' })
    })
    const child = page.locator('.flow-vue-node[data-node-id="grower"]')

    const startDrag = async () => {
      const box = await child.boundingBox()

      if (box === null) {
        throw new Error('Missing grower box')
      }

      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
      await page.mouse.move(point.x + 3, point.y + 3, { steps: 2 })

      return point
    }

    const census = async (stage: string) => {
      const actors = await page.evaluate(() => {
        const api = window.__flowVueFinal

        if (api === undefined) {
          throw new Error('Missing fixture API')
        }

        const flow = api.flow()

        return {
          accepted: api
            .ownerNodes()
            .map(({ id, position, size }) => ({ id, position, size })),
          displayed: ['group', 'grower', 'clamped'].map((id) => ({
            id,
            position: flow.getInternalNode(id)?.absolutePosition,
          })),
          events: api.events(),
        }
      })

      await info.attach(stage, {
        body: JSON.stringify(actors, null, 2),
        contentType: 'application/json',
      })

      return actors
    }

    const first = await startDrag()
    await page.mouse.move(first.x + 150, first.y + 100, { steps: 8 })
    await page.mouse.up()
    await expect
      .poll(async () => {
        const snapshot = await census('first-drop')

        return snapshot.accepted.find(({ id }) => id === 'grower')?.position
      })
      .toEqual({ x: 280, y: 210 })
    const second = await startDrag()
    await page.mouse.move(second.x - 350, second.y - 260, { steps: 8 })
    const preview = await census('before-drop')
    expect(
      preview.accepted.find(({ id }) => id === 'grower')?.position
    ).toEqual({ x: 280, y: 210 })
    expect(
      preview.displayed.find(({ id }) => id === 'grower')?.position
    ).toEqual({ x: 230, y: 30 })
    await page.mouse.up()
    const dropped = await census('after-drop')
    expect(
      dropped.accepted.find(({ id }) => id === 'grower')?.position
    ).toEqual({ x: 0, y: 0 })
    expect(dropped.accepted.find(({ id }) => id === 'group')?.position).toEqual(
      { x: 230, y: 30 }
    )
  })
})
