import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { conformanceFixtures } from '../../packages/conformance/src/index.ts'
import type {
  ConformanceAdapter,
  MeasuredGeometryAdapter,
} from '../../packages/conformance/src/index.ts'
import type {
  FlowChangeSchema,
  NodeSize,
} from '../../packages/core/src/public.ts'

const geometry = (node: Locator) =>
  node.evaluate((element) => {
    const style = getComputedStyle(element)
    const bounds = element.getBoundingClientRect()

    return {
      x: Number(style.left.replace('px', '')),
      y: Number(style.top.replace('px', '')),
      width: bounds.width,
      height: bounds.height,
    }
  })

export const nestedResizeContainment = (
  host: string,
  adapterFor: (
    page: Page
  ) => ConformanceAdapter &
    Pick<MeasuredGeometryAdapter, 'internalNode' | 'resizeAndRefresh'>,
  directionAttribute: string,
  readProposal: (
    page: Page
  ) => Promise<typeof FlowChangeSchema.Encoded | undefined>,
  settleHostPreview: (page: Page, expected: NodeSize) => Promise<void>
): void => {
  for (const input of ['pointer', 'keyboard']) {
    for (const direction of ['top-left', 'bottom-right']) {
      for (const documentMode of [
        'controlled',
        'uncontrolled',
      ] satisfies readonly ('controlled' | 'uncontrolled')[]) {
        for (const axis of input === 'pointer' ? ['both'] : ['x', 'y']) {
          test(`${host} measured contained child survives ${input} ${direction} ${axis} preview, cancellation, and ${documentMode} acceptance`, async ({
            page,
          }) => {
            const base = conformanceFixtures.find(
              ({ id }) => id === 'keyed-update'
            )

            if (base === undefined) {
              throw new Error('Missing keyed-update fixture')
            }

            const fixture = {
              ...base,
              documentMode,
              actions: [],
              document: {
                edges: [],
                nodes: [
                  {
                    id: 'ancestor',
                    label: 'Ancestor',
                    position: { x: 60, y: 50 },
                    size: { width: 800, height: 500 },
                  },
                  {
                    id: 'parent',
                    label: 'Parent',
                    parentId: 'ancestor',
                    extent: 'parent',
                    position: { x: 100, y: 100 },
                    size: { width: 300, height: 190 },
                    selected: true,
                  },
                  {
                    id: 'child',
                    label: 'Child',
                    parentId: 'parent',
                    extent: 'parent',
                    position: { x: 20, y: 30 },
                    size: { width: 20, height: 10 },
                  },
                  {
                    id: 'ordinary',
                    label: 'Ordinary',
                    parentId: 'parent',
                    position: { x: 400, y: 10 },
                    size: { width: 80, height: 50 },
                  },
                ],
              },
            } satisfies Parameters<ConformanceAdapter['mount']>[0]

            const adapter = adapterFor(page)
            await adapter.mount(fixture)
            const parent = page.locator('[data-node-id="parent"]')
            const child = page.locator('[data-node-id="child"]')
            const ordinary = page.locator('[data-node-id="ordinary"]')
            await page.addStyleTag({
              content:
                '[data-node-id="child"] { width: 160px !important; height: 72px !important; min-width: 0 !important; min-height: 0 !important; box-sizing: border-box !important; }',
            })
            await adapter.resizeAndRefresh('child', { width: 160, height: 72 })
            await expect
              .poll(() =>
                adapter.internalNode('child').then((node) => ({
                  width: node?.width,
                  height: node?.height,
                }))
              )
              .toEqual({ width: 160, height: 72 })

            if (host === 'Foldkit') {
              await page.evaluate(() =>
                window.__flowFoldkitTest?.attachResizeMeasurementObserver()
              )
              await expect
                .poll(() =>
                  adapter.internalNode('parent').then((node) => node?.width)
                )
                .toBe(300)
            }

            const parentBefore = await geometry(parent)
            const childBefore = await geometry(child)
            const ordinaryBefore = await geometry(ordinary)
            expect(parentBefore).toEqual({
              x: 160,
              y: 150,
              width: 300,
              height: 190,
            })
            expect(childBefore).toEqual({
              x: 180,
              y: 180,
              width: 160,
              height: 72,
            })

            const expected =
              direction === 'top-left'
                ? { x: 180, y: 180, width: 280, height: 160 }
                : { x: 160, y: 150, width: 180, height: 102 }

            const control = parent.locator(
              `[${directionAttribute}="${direction}"]`
            )

            const forwardKey = axis === 'y' ? 'ArrowDown' : 'ArrowRight'
            const backwardKey = axis === 'y' ? 'ArrowUp' : 'ArrowLeft'
            const key = direction === 'top-left' ? forwardKey : backwardKey

            const startGesture = async () => {
              if (input === 'pointer') {
                const box = await control.boundingBox()

                if (box === null) {
                  throw new Error('Missing resize control')
                }

                const start = {
                  x: box.x + box.width / 2,
                  y: box.y + box.height / 2,
                }

                await page.mouse.move(start.x, start.y)
                await page.mouse.down()
                await page.mouse.move(
                  start.x + (direction === 'top-left' ? 100 : -240),
                  start.y + (direction === 'top-left' ? 100 : -160),
                  { steps: 8 }
                )
              } else {
                await control.focus()
                await page.keyboard.down(key)
                await control.evaluate((element, repeatedKey) => {
                  for (let step = 0; step < 60; step += 1) {
                    element.dispatchEvent(
                      new KeyboardEvent('keydown', {
                        key: repeatedKey,
                        repeat: true,
                        bubbles: true,
                        cancelable: true,
                      })
                    )
                  }
                }, key)
              }
            }

            const finishGesture = async () => {
              await (input === 'pointer'
                ? page.mouse.up()
                : page.keyboard.up(key))
            }

            const horizontalExpected = { ...expected }

            if (axis === 'x') {
              horizontalExpected.y = 150
              horizontalExpected.height = 190
            }

            if (axis === 'y') {
              horizontalExpected.x = 160
              horizontalExpected.width = 300
            }

            const settlePreviewMeasurements = async () => {
              await settleHostPreview(page, horizontalExpected)

              await expect
                .poll(() =>
                  adapter.internalNode('parent').then((node) => ({
                    width: node?.width,
                    height: node?.height,
                  }))
                )
                .toEqual({ width: 300, height: 190 })
            }

            await startGesture()
            await expect
              .poll(() => geometry(parent))
              .toEqual(horizontalExpected)
            await settlePreviewMeasurements()
            await expect.poll(() => geometry(child)).toEqual(childBefore)
            await expect.poll(() => geometry(ordinary)).toEqual(ordinaryBefore)
            const previewState = await adapter.readState({ nodeId: 'parent' })
            expect(previewState.node?.position).toEqual({ x: 100, y: 100 })
            await page.keyboard.press('Escape')
            await finishGesture()
            await expect.poll(() => geometry(parent)).toEqual(parentBefore)
            await expect.poll(() => geometry(child)).toEqual(childBefore)
            expect(await adapter.changeKinds()).toEqual([])
            await startGesture()
            await expect
              .poll(() => geometry(parent))
              .toEqual(horizontalExpected)
            await settlePreviewMeasurements()

            await finishGesture()
            await expect
              .poll(() => adapter.changeKinds())
              .toEqual(['node-bounds'])

            const proposal = await readProposal(page)

            if (proposal?.kind !== 'node-bounds') {
              throw new Error('Missing emitted resize proposal')
            }

            const dx = horizontalExpected.x - parentBefore.x
            const dy = horizontalExpected.y - parentBefore.y
            expect(proposal).toEqual({
              kind: 'node-bounds',
              nodeId: 'parent',
              position: { x: 100 + dx, y: 100 + dy },
              size: {
                width: horizontalExpected.width,
                height: horizontalExpected.height,
              },
              childPositions: [
                { nodeId: 'child', position: { x: 20 - dx, y: 30 - dy } },
                { nodeId: 'ordinary', position: { x: 400 - dx, y: 10 - dy } },
              ],
            })

            if (documentMode === 'controlled') {
              await expect.poll(() => geometry(parent)).toEqual(parentBefore)

              const rejectedState = await adapter.readState({
                nodeId: 'parent',
              })

              expect(rejectedState.node?.size).toEqual({
                width: 300,
                height: 190,
              })
              expect(await adapter.internalNode('parent')).toMatchObject({
                width: 300,
                height: 190,
              })
              await adapter.perform({
                kind: 'update-document',
                document: {
                  ...fixture.document,
                  nodes: fixture.document.nodes.map((node) => {
                    if (node.id === 'parent') {
                      return {
                        ...node,
                        position: proposal.position,
                        size: proposal.size,
                      }
                    }

                    const childPosition = proposal.childPositions.find(
                      ({ nodeId }) => nodeId === node.id
                    )

                    if (childPosition !== undefined) {
                      return { ...node, position: childPosition.position }
                    }

                    return node
                  }),
                },
              })
            }

            await expect
              .poll(() => geometry(parent))
              .toEqual(horizontalExpected)
            await expect.poll(() => geometry(child)).toEqual(childBefore)
            await expect.poll(() => geometry(ordinary)).toEqual(ordinaryBefore)

            await expect
              .poll(() =>
                adapter.internalNode('parent').then((node) => ({
                  width: node?.width,
                  height: node?.height,
                  status: node?.measurementStatus,
                }))
              )
              .toEqual({
                width: horizontalExpected.width,
                height: horizontalExpected.height,
                status: 'measured',
              })

            if (host === 'Foldkit') {
              await page.evaluate(() =>
                window.__flowFoldkitTest?.stopResizeMeasurementObserver()
              )
            }

            await adapter.destroy()
          })
        }
      }
    }
  }
}
