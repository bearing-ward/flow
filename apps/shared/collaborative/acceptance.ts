import type { FlowEditTransactionInput } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const it = test

const { describe } = test

export const readRoom = (page: Page) =>
  page.evaluate(() => globalThis.flowCollaborativeDemo?.snapshot())

const nodes = (page: Page) =>
  readRoom(page).then((snapshot) => snapshot?.document.nodes)

export const applyRoom = (
  page: Page,
  operations: FlowEditTransactionInput['operations']
) =>
  page.evaluate(async (input) => {
    if (globalThis.flowCollaborativeDemo === undefined) {
      throw new Error('Missing room binding')
    }

    await globalThis.flowCollaborativeDemo.apply({ operations: input })
  }, operations)

export const readyRoom = async (page: Page, url: string) => {
  await page.goto(url)
  await expect(page.locator('#room-status')).toHaveText('connected')
  await page.waitForFunction(
    () => globalThis.flowCollaborativeDemo !== undefined
  )
}

export const seedRoom = (page: Page) =>
  applyRoom(page, [
    {
      kind: 'add-nodes',
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 70, y: 80 },
          size: { width: 140, height: 60 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 460, y: 120 },
          size: { width: 140, height: 60 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
      ],
    },
    {
      kind: 'add-edges',
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
      ],
    },
  ])

const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click()

const sameRoom = async (page: Page) => {
  const peer = await page.context().newPage()
  await readyRoom(peer, page.url())
  await expect(peer.locator('#room-peers')).toHaveText('1 peers')

  return peer
}

const history = (page: Page) =>
  page.evaluate(() => globalThis.flowCollaborativeDemo?.history())

const dispose = (page: Page) =>
  page.evaluate(() => globalThis.flowCollaborativeDemo?.dispose())

export const collaborativeAcceptance = (host: string) =>
  describe(`collaborative rooms ${host}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 800 })
      await readyRoom(page, '/collaborative/')
    })

    it('creates isolated default share URLs and right-click nodes in graph space', async ({
      page,
    }) => {
      const isolated = await page.context().newPage()

      const peer = await sameRoom(page)

      try {
        await readyRoom(isolated, '/collaborative/')
        expect(new URL(isolated.url()).searchParams.get('room')).not.toBe(
          new URL(page.url()).searchParams.get('room')
        )
        await expect(page.locator('#room-share')).toHaveAttribute(
          'href',
          page.url()
        )
        const bounds = await page.locator('#app').boundingBox()

        if (bounds === null) {
          throw new Error('Missing owner')
        }

        await page.mouse.click(bounds.x + 150, bounds.y + 150, {
          button: 'right',
        })
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id]')
        ).toHaveCount(1)
        await expect(
          peer.locator('[data-testid="flow-node"][data-node-id]')
        ).toHaveCount(1)
        await expect
          .poll(() => nodes(page).then((values) => values?.[0]?.position))
          .toEqual({ x: 150, y: 150 })
        expect(await nodes(isolated)).toEqual([])
        const status = await history(page)
        expect(status?.pastCount).toBe(1)
      } finally {
        await dispose(peer)
        await peer.close()
        await dispose(isolated)
        await isolated.close()
      }
    })

    it('shows live remote drag before release, presence, attached edges and one local undo step', async ({
      page,
    }) => {
      await seedRoom(page)
      const peer = await sameRoom(page)

      try {
        await expect(
          peer.locator('[data-testid="flow-node"][data-node-id="a"]')
        ).toBeVisible()

        const node = page
          .locator('[data-testid="flow-node"][data-node-id="a"]')
          .first()

        const bounds = await node.boundingBox()

        if (bounds === null) {
          throw new Error('Missing node')
        }

        const oldPath = await peer
          .locator('[data-edge-id="ab"] path')
          .first()
          .getAttribute('d')

        await page.mouse.move(bounds.x + 40, bounds.y + 25)
        await page.mouse.down()
        await page.mouse.move(bounds.x + 140, bounds.y + 85, { steps: 6 })
        await expect
          .poll(() =>
            nodes(peer).then(
              (values) => values?.find(({ id }) => id === 'a')?.position
            )
          )
          .toEqual({ x: 170, y: 140 })
        await expect(peer.locator('.room-presence span')).toHaveCount(1)
        await expect(
          peer.locator('[data-edge-id="ab"] path').first()
        ).not.toHaveAttribute('d', oldPath ?? '')
        const beforeRelease = await history(page)
        expect(beforeRelease?.pastCount).toBe(1)
        await page.mouse.up()
        await expect
          .poll(() => history(page).then((value) => value?.pastCount))
          .toBe(2)
        await click(page, 'Undo')
        await expect
          .poll(() =>
            nodes(peer).then(
              (values) => values?.find(({ id }) => id === 'a')?.position
            )
          )
          .toEqual({ x: 70, y: 80 })
        await click(page, 'Redo')
        await expect
          .poll(() =>
            nodes(peer).then(
              (values) => values?.find(({ id }) => id === 'a')?.position
            )
          )
          .toEqual({ x: 170, y: 140 })

        // Accepted snapshots precede DOM reconciliation in the two canvases.
        await expect
          .poll(async () => {
            const [local, remote] = await Promise.all([
              node.boundingBox(),
              peer
                .locator('[data-testid="flow-node"][data-node-id="a"]')
                .first()
                .boundingBox(),
            ])

            if (local === null || remote === null) {
              return Number.POSITIVE_INFINITY
            }

            return Math.max(
              Math.abs(local.x - bounds.x - 100),
              Math.abs(local.y - bounds.y - 60),
              Math.abs(remote.x - bounds.x - 100),
              Math.abs(remote.y - bounds.y - 60)
            )
          })
          .toBeLessThan(0.0005)

        const local = await page
          .locator('[data-testid="flow-node"][data-node-id="a"]')
          .first()
          .boundingBox()

        const remote = await peer
          .locator('[data-testid="flow-node"][data-node-id="a"]')
          .first()
          .boundingBox()

        expect(remote?.x).toBeCloseTo(local?.x ?? 0, 3)
        expect(remote?.y).toBeCloseTo(local?.y ?? 0, 3)
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('clears a cancelled live preview without a durable edit or undo step', async ({
      page,
    }) => {
      await seedRoom(page)
      const peer = await sameRoom(page)

      try {
        const bounds = await page
          .getByTestId('flow-node')
          .filter({ hasText: 'A' })
          .boundingBox()

        if (bounds === null) {
          throw new Error('Missing node')
        }

        await page.mouse.move(bounds.x + 40, bounds.y + 25)
        await page.mouse.down()
        await page.mouse.move(bounds.x + 140, bounds.y + 85, { steps: 6 })
        await expect
          .poll(() =>
            nodes(peer).then(
              (values) => values?.find(({ id }) => id === 'a')?.position
            )
          )
          .toEqual({ x: 170, y: 140 })
        await page.keyboard.press('Escape')
        await page.mouse.up()
        await expect
          .poll(() =>
            nodes(peer).then(
              (values) => values?.find(({ id }) => id === 'a')?.position
            )
          )
          .toEqual({ x: 70, y: 80 })
        const status = await history(page)
        expect(status?.pastCount).toBe(1)
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('merges simultaneous fields after disconnect/rejoin and undoes only local origins', async ({
      page,
    }) => {
      await seedRoom(page)
      const peer = await sameRoom(page)

      try {
        await page.evaluate(() =>
          globalThis.flowCollaborativeDemo?.disconnect()
        )
        await expect(page.locator('#room-status')).toHaveText('disconnected')
        await Promise.all([
          applyRoom(page, [
            {
              kind: 'update-node',
              nodeId: 'a',
              patch: { position: { x: 200, y: 180 } },
            },
          ]),
          applyRoom(peer, [
            { kind: 'update-node', nodeId: 'a', patch: { label: 'Peer edit' } },
          ]),
        ])
        await page.evaluate(() => globalThis.flowCollaborativeDemo?.reconnect())
        await expect(page.locator('#room-status')).toHaveText('connected')
        await expect
          .poll(() =>
            nodes(page).then((values) => values?.find(({ id }) => id === 'a'))
          )
          .toMatchObject({ label: 'Peer edit', position: { x: 200, y: 180 } })
        await page.keyboard.press('Control+z')
        await expect
          .poll(() =>
            nodes(peer).then((values) => values?.find(({ id }) => id === 'a'))
          )
          .toMatchObject({ label: 'Peer edit', position: { x: 70, y: 80 } })
        await click(peer, 'Undo')
        await expect
          .poll(() =>
            nodes(page).then(
              (values) => values?.find(({ id }) => id === 'a')?.label
            )
          )
          .toBe('A')
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('keeps delete-versus-move convergent with no resurrected nodes or dangling edges', async ({
      page,
    }) => {
      await seedRoom(page)
      const peer = await sameRoom(page)

      try {
        await peer.evaluate(() =>
          globalThis.flowCollaborativeDemo?.disconnect()
        )
        await applyRoom(page, [{ kind: 'delete-elements', nodeIds: ['a'] }])
        await applyRoom(peer, [
          {
            kind: 'update-node',
            nodeId: 'a',
            patch: { position: { x: 900, y: 800 } },
          },
        ])
        await peer.evaluate(() => globalThis.flowCollaborativeDemo?.reconnect())
        await expect(
          peer.locator('[data-testid="flow-node"][data-node-id="a"]')
        ).toHaveCount(0)
        await expect
          .poll(() => readRoom(peer).then((value) => value?.document.edges))
          .toEqual([])
        await click(peer, 'Undo')
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id="a"]')
        ).toHaveCount(0)
        await expect
          .poll(() => nodes(peer).then((values) => values?.map(({ id }) => id)))
          .toEqual(['b'])
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('copies collision-free IDs concurrently and keeps selection and viewport local', async ({
      page,
    }) => {
      await seedRoom(page)
      const peer = await sameRoom(page)

      try {
        await Promise.all(
          [page, peer].map(async (client) => {
            await applyRoom(client, [
              { kind: 'update-node', nodeId: 'a', patch: { selected: true } },
            ])
            await click(client, 'Copy')
          })
        )

        await Promise.all([click(page, 'Paste'), click(peer, 'Paste')])
        await expect
          .poll(() => nodes(page).then((values) => values?.length))
          .toBe(4)
        await expect
          .poll(() => nodes(peer).then((values) => values?.length))
          .toBe(4)
        const localNodes = await nodes(page)
        const ids = localNodes?.map(({ id }) => id)
        expect(new Set(ids).size).toBe(4)
        const peerNodes = await nodes(peer)
        expect(peerNodes?.map(({ id }) => id).toSorted()).toEqual(
          ids?.toSorted()
        )
        await click(page, 'Undo')
        await expect
          .poll(() => nodes(peer).then((values) => values?.length))
          .toBe(3)
        await applyRoom(page, [
          { kind: 'update-node', nodeId: 'b', patch: { selected: true } },
        ])
        const selection = await nodes(peer)
        expect(selection?.find(({ id }) => id === 'b')?.selected).not.toBe(true)
        await page.keyboard.press('Control+c')
        await page.keyboard.press('Control+v')
        await expect
          .poll(() => nodes(peer).then((values) => values?.length))
          .toBe(4)
        const peerSnapshot = await readRoom(peer)
        const before = peerSnapshot?.viewport
        await page.mouse.move(800, 500)
        await page.mouse.wheel(0, -300)
        await expect
          .poll(() => readRoom(page).then((value) => value?.viewport.zoom))
          .not.toBe(before?.zoom)
        const after = await readRoom(peer)
        expect(after?.viewport).toEqual(before)
        const statusBeforeText = await history(page)
        await page.evaluate(() => {
          const editor = document.createElement('div')
          editor.id = 'room-text-input'
          editor.setAttribute('contenteditable', '')
          document.querySelector('#room-controls')?.append(editor)
        })
        const editor = page.locator('#room-text-input')
        await editor.focus()
        await editor.pressSequentially('native undo')
        await editor.press('ControlOrMeta+z')
        await expect(editor).toHaveText('')
        const statusAfterText = await history(page)
        expect(statusAfterText?.pastCount).toBe(statusBeforeText?.pastCount)
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('preserves group/tree/shape/manual-route/v5 bundle data as one undoable edit', async ({
      page,
    }) => {
      const peer = await sameRoom(page)

      try {
        await applyRoom(page, [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: 'group',
                label: 'Group',
                handles: [{ id: 'out', kind: 'source', side: 'right' }],
                position: { x: 30, y: 30 },
                size: { width: 300, height: 250 },
              },
              {
                id: 'shape',
                label: 'Shape',
                handles: [{ id: 'out', kind: 'source', side: 'right' }],
                parentId: 'group',
                extent: 'parent',
                type: 'shape',
                position: { x: 30, y: 30 },
                size: { width: 100, height: 80 },
                data: {
                  type: 'diamond',
                  color: '#ff0071',
                  opaque: ['keep', 164],
                  tree: { version: 1, kind: 'node', expanded: false },
                },
              },
              {
                id: 'target',
                label: 'Target',
                handles: [{ id: 'in', kind: 'target', side: 'left' }],
                position: { x: 600, y: 100 },
                size: { width: 100, height: 80 },
              },
            ],
          },
          {
            kind: 'add-edges',
            edges: [
              {
                id: 'e1',
                source: 'shape',
                sourceHandle: 'out',
                target: 'target',
                targetHandle: 'in',
                route: { mode: 'manual', points: [{ x: 400, y: 160 }] },
                data: { opaque: ['edge', 164] },
              },
              {
                id: 'e2',
                source: 'group',
                target: 'target',
                sourceHandle: 'out',
                targetHandle: 'in',
              },
            ],
          },
          {
            kind: 'set-bundles',
            bundles: [
              {
                id: 'bundle',
                edgeIds: ['e1', 'e2'],
                ties: [
                  { x: 440, y: 170 },
                  { x: 500, y: 170 },
                ],
              },
            ],
          },
        ])
        await expect
          .poll(() =>
            readRoom(peer).then((value) => value?.document.bundles?.[0]?.ties)
          )
          .toEqual([
            { x: 440, y: 170 },
            { x: 500, y: 170 },
          ])
        await expect(
          peer.locator('[data-testid="flow-node"][data-node-id="shape"]')
        ).toBeVisible()
        await expect(
          peer.locator('[data-edge-id="e1"] path').first()
        ).toBeVisible()
        const peerNodes = await nodes(peer)
        expect(peerNodes?.find(({ id }) => id === 'shape')).toMatchObject({
          parentId: 'group',
          type: 'shape',
          data: { tree: { expanded: false }, opaque: ['keep', 164] },
        })
        const peerSnapshot = await readRoom(peer)
        expect(
          peerSnapshot?.document.edges.find(({ id }) => id === 'e1')
        ).toMatchObject({
          route: { mode: 'manual', points: [{ x: 400, y: 160 }] },
          data: { opaque: ['edge', 164] },
        })
        const status = await history(page)
        expect(status?.pastCount).toBe(1)
        await click(page, 'Undo')
        await expect.poll(() => nodes(peer)).toEqual([])
        await click(page, 'Redo')
        await expect
          .poll(() => nodes(peer).then((values) => values?.length))
          .toBe(3)
      } finally {
        await dispose(peer)
        await peer.close()
      }
    })

    it('removes peer presence on disconnect, rejoin and disposal', async ({
      page,
    }) => {
      const peer = await sameRoom(page)
      await peer.mouse.move(200, 220)
      await expect(page.locator('.room-presence span')).toHaveCount(1)
      await click(peer, 'Disconnect')
      await expect(page.locator('#room-peers')).toHaveText('0 peers')
      await expect(page.locator('.room-presence span')).toHaveCount(0)
      await click(peer, 'Reconnect')
      await expect(page.locator('#room-peers')).toHaveText('1 peers')
      await dispose(peer)
      await expect(page.locator('#room-peers')).toHaveText('0 peers')
      await expect(peer.locator('.room-presence')).toHaveCount(0)
      await peer.close()
      await dispose(page)
      expect(
        await page.evaluate(() => globalThis.flowCollaborativeDemo?.status())
      ).toBe('disposed')
    })
  })
