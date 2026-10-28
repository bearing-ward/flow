import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const openHistory = async (page: Page, query = ''): Promise<void> => {
  await page.goto(`/history/${query}`)
  await page.waitForFunction(() => globalThis.flowHistoryFixture !== undefined)
  await expect(page.locator('#app .flow-node')).toHaveCount(2)
  await expect(
    page.locator('#app .flow-edge-group[data-edge-id="ab"]')
  ).toHaveCount(1)
}

const read = async (page: Page) => {
  const expectedEdges = await page.evaluate(async () => {
    const fixture = globalThis.flowHistoryFixture

    if (fixture === undefined) {
      throw new Error('Missing history fixture')
    }

    await fixture.controller.updateNodeInternals(
      fixture.controller.getNodes().map(({ id }) => id)
    )

    return fixture.controller
      .getSnapshot()
      .document.edges.map(({ id }) => id)
      .toSorted()
  })

  await expect
    .poll(
      async () =>
        await page
          .locator('#app .flow-edge-group')
          .evaluateAll((groups) =>
            groups.map((group) => group.dataset.edgeId).toSorted()
          )
    )
    .toEqual(expectedEdges)

  return page.evaluate(() => {
    const fixture = globalThis.flowHistoryFixture
    const canvas = document.querySelector('#app .flow-canvas')

    if (fixture === undefined || canvas === null) {
      throw new Error('Missing history fixture')
    }

    const accepted = fixture.controller.getSnapshot().document
    const bounds = canvas.getBoundingClientRect()

    return {
      document: {
        ...accepted,
        nodes: accepted.nodes.map(
          ({ selected: _selected, measured: _measured, ...node }) => node
        ),
        edges: accepted.edges.map(({ selected: _selected, ...edge }) => edge),
      },
      positions: [...canvas.querySelectorAll<HTMLElement>('.flow-node')]
        .map((node) => {
          const rect = node.getBoundingClientRect()

          return {
            id: node.dataset.nodeId,
            x: rect.x - bounds.x,
            y: rect.y - bounds.y,
          }
        })
        .toSorted((a, b) => (a.id ?? '').localeCompare(b.id ?? '')),
      edges: [...canvas.querySelectorAll<SVGGElement>('.flow-edge-group')]
        .map((edge) => edge.dataset.edgeId)
        .toSorted(),
      edgePaths: [...canvas.querySelectorAll<SVGGElement>('.flow-edge-group')]
        .map((edge) => ({
          id: edge.dataset.edgeId,
          path: edge.querySelector('.flow-edge-path')?.getAttribute('d') ?? '',
        }))
        .toSorted((a, b) => (a.id ?? '').localeCompare(b.id ?? '')),
      history: fixture.controller.getHistoryStatus(),
    }
  })
}

type Saved = Awaited<ReturnType<typeof read>>

const readPart = async <Key extends keyof Saved>(
  page: Page,
  key: Key
): Promise<Saved[Key]> => {
  const snapshot = await read(page)

  return snapshot[key]
}

const historyPart = async <Key extends keyof Saved['history']>(
  page: Page,
  key: Key
): Promise<Saved['history'][Key]> => {
  const status = await readPart(page, 'history')

  return status[key]
}

const restored = async (page: Page, saved: Saved): Promise<void> => {
  await expect
    .poll(async () => await readPart(page, 'document'))
    .toEqual(saved.document)
  await expect
    .poll(async () => await readPart(page, 'positions'))
    .toEqual(saved.positions)
  await expect
    .poll(async () => await readPart(page, 'edges'))
    .toEqual(saved.edges)
  await expect
    .poll(async () => await readPart(page, 'edgePaths'))
    .toEqual(saved.edgePaths)
}

const replay = (page: Page, direction: 'undo' | 'redo') =>
  page.evaluate(async (action) => {
    const fixture = globalThis.flowHistoryFixture

    if (fixture === undefined) {
      throw new Error('Missing history fixture')
    }

    await fixture.controller[action]()
  }, direction)

const move = (page: Page, x: number) =>
  page.evaluate(async (nextX) => {
    const fixture = globalThis.flowHistoryFixture

    if (fixture === undefined) {
      throw new Error('Missing history fixture')
    }

    await fixture.controller.updateNode('a', { position: { x: nextX, y: 160 } })
  }, x)

for (const action of [
  'add-node',
  'add-edge',
  'move-node',
  'reconnect-edge',
  'delete-edge',
  'delete-node',
]) {
  test(`public ${action} restores the exact accepted document and rendered output`, async ({
    page,
  }) => {
    await openHistory(page)
    const initial = await read(page)
    expect(initial.positions).toEqual([
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 400, y: 100 },
    ])
    expect(initial.edges).toEqual(['ab'])

    if (action !== 'add-node') {
      await page.evaluate(async () => {
        const fixture = globalThis.flowHistoryFixture

        if (fixture === undefined) {
          throw new Error('Missing history fixture')
        }

        await fixture.controller.addNodes([
          {
            id: 'c',
            label: 'Gamma',
            position: { x: 260, y: 260 },
            size: { width: 150, height: 60 },
            handles: [
              { id: 'in', kind: 'target', side: 'left' },
              { id: 'out', kind: 'source', side: 'right' },
            ],
          },
        ])
      })
    }

    if (action === 'delete-edge') {
      await page.evaluate(async () => {
        const fixture = globalThis.flowHistoryFixture

        if (fixture === undefined) {
          throw new Error('Missing history fixture')
        }

        await fixture.controller.addEdges([
          { id: 'bc', source: 'b', target: 'c' },
        ])
      })
    }

    const before = await read(page)
    await page.evaluate(async (operation) => {
      const fixture = globalThis.flowHistoryFixture

      if (fixture === undefined) {
        throw new Error('Missing history fixture')
      }

      const { controller } = fixture

      switch (operation) {
        case 'add-node': {
          await controller.addNodes([
            {
              id: 'c',
              label: 'Gamma',
              position: { x: 260, y: 260 },
              size: { width: 150, height: 60 },
              handles: [
                { id: 'in', kind: 'target', side: 'left' },
                { id: 'out', kind: 'source', side: 'right' },
              ],
            },
          ])
          break
        }

        case 'add-edge': {
          await controller.addEdges([{ id: 'bc', source: 'b', target: 'c' }])
          break
        }

        case 'move-node': {
          await controller.updateNode('a', { position: { x: 180, y: 160 } })
          break
        }

        case 'reconnect-edge': {
          await controller.applyEdit({
            operations: [
              {
                kind: 'update-edge',
                edgeId: 'ab',
                patch: { source: 'b', target: 'c' },
              },
            ],
          })
          break
        }

        case 'delete-edge': {
          await controller.deleteElements({ edgeIds: ['bc'] })
          break
        }

        case 'delete-node': {
          await controller.deleteElements({ nodeIds: ['b'] })
          break
        }

        default: {
          throw new Error('Unknown public edit')
        }
      }
    }, action)

    if (action === 'reconnect-edge') {
      await expect
        .poll(async () => await readPart(page, 'edgePaths'))
        .not.toEqual(before.edgePaths)
    }

    const after = await read(page)
    expect(after.document).not.toEqual(before.document)
    expect(after.history.pastCount).toBe(before.history.pastCount + 1)

    if (action === 'add-edge') {
      expect(after.edges).toEqual(['ab', 'bc'])
    } else if (action === 'delete-node') {
      expect(after.edges).toEqual([])
    } else {
      expect(after.edges).toEqual(['ab'])
    }

    for (const edge of after.edgePaths) {
      expect(edge.path).toMatch(/^M/u)
    }

    if (action === 'reconnect-edge') {
      expect(
        after.document.edges.find((edge) => edge.id === 'ab')
      ).toMatchObject({ source: 'b', target: 'c' })
    }

    await replay(page, 'undo')
    await restored(page, before)
    await replay(page, 'redo')
    await restored(page, after)
  })
}

test('toolbar disables empty stacks, restores moves, and clears a redo branch on new edits', async ({
  page,
}) => {
  await openHistory(page)
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Redo', exact: true })
  ).toBeDisabled()
  const initial = await read(page)
  await replay(page, 'undo')
  await replay(page, 'redo')
  await restored(page, initial)
  await page.getByRole('button', { name: 'Move node', exact: true }).click()
  await expect.poll(async () => await historyPart(page, 'pastCount')).toBe(1)
  const moved = await read(page)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await restored(page, initial)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await restored(page, moved)
  await replay(page, 'undo')
  await page.getByRole('button', { name: 'Add node', exact: true }).click()
  await expect.poll(async () => await historyPart(page, 'futureCount')).toBe(0)
  const branched = await read(page)
  expect(branched.document.nodes.map((node) => node.id)).toEqual([
    'a',
    'b',
    'new-1',
  ])
  await replay(page, 'redo')
  await restored(page, branched)
})

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier} shortcuts undo and redo only the focused canvas`, async ({
    page,
  }) => {
    await openHistory(page)
    const initial = await read(page)
    await move(page, 180)
    const changed = await read(page)
    await page.locator('#app .flow-canvas').focus()
    await page.keyboard.press(`${modifier}+z`)
    await restored(page, initial)
    await page.keyboard.press(`${modifier}+Shift+z`)
    await restored(page, changed)
    await page.keyboard.press(`${modifier}+z`)
    await page.keyboard.press(`${modifier}+y`)
    await restored(page, changed)

    const isolated = await page.evaluate(() =>
      globalThis.flowHistoryFixture?.isolated.getHistoryStatus()
    )

    expect(isolated).toMatchObject({
      pastCount: 0,
      futureCount: 0,
      canUndo: false,
    })
    await page.locator('#isolated .flow-canvas').focus()
    await page.keyboard.press(`${modifier}+z`)
    await restored(page, changed)
  })
}

for (const mode of ['uncontrolled', 'controlled']) {
  test(`${mode} pointer drag and repeated keyboard movement each make one undo step`, async ({
    page,
  }) => {
    await openHistory(page, mode === 'controlled' ? '?controlled' : '')
    const node = page.locator('#app .flow-node[data-node-id="a"]')
    const initial = await read(page)
    const bounds = await node.boundingBox()

    if (bounds === null) {
      throw new Error('Missing node bounds')
    }

    await page.mouse.move(bounds.x + 70, bounds.y + 25)
    await page.mouse.down()
    await page.mouse.move(bounds.x + 150, bounds.y + 85, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => await historyPart(page, 'pastCount')).toBe(1)
    const dragged = await read(page)
    expect(dragged.document.nodes[0]?.position).toEqual({ x: 180, y: 160 })
    await replay(page, 'undo')
    await restored(page, initial)
    await replay(page, 'redo')
    await restored(page, dragged)
    await node.click()
    await expect(node).toHaveAttribute('aria-pressed', 'true')
    await expect(node).toBeFocused()
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              globalThis.flowHistoryFixture?.controller.getNode('a')?.selected
          )
      )
      .toBe(true)
    expect(await historyPart(page, 'pastCount')).toBe(1)

    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.up('ArrowRight')
    const keyboardMoved = await read(page)
    expect(keyboardMoved.document.nodes[0]?.position).toEqual({
      x: 205,
      y: 160,
    })
    expect(keyboardMoved.history.pastCount).toBe(2)
    await replay(page, 'undo')
    await restored(page, dragged)
    await replay(page, 'redo')
    await restored(page, keyboardMoved)
  })
}

test('cancelled previews and failed or cancelled public edits never enter history', async ({
  page,
}) => {
  await openHistory(page)
  const initial = await read(page)
  const node = page.locator('#app .flow-node[data-node-id="a"]')
  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing node bounds')
  }

  await page.mouse.move(bounds.x + 70, bounds.y + 25)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 150, bounds.y + 85, { steps: 6 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await restored(page, initial)

  const result = await page.evaluate(async () => {
    const fixture = globalThis.flowHistoryFixture

    if (fixture === undefined) {
      throw new Error('Missing history fixture')
    }

    const { controller } = fixture

    const invalid = await controller
      .addEdges([{ id: 'bad', source: 'a', target: 'missing' }])
      .then(
        () => false,
        () => true
      )

    const declined = await controller.deleteElements(
      { nodeIds: ['b'] },
      { onBeforeDelete: () => Promise.resolve(false) }
    )

    const abort = new AbortController()
    abort.abort()

    const cancelled = await controller
      .deleteElements({ nodeIds: ['b'] }, { signal: abort.signal })
      .then(
        () => false,
        () => true
      )

    return { invalid, declined, cancelled }
  })

  expect(result).toEqual({
    invalid: true,
    declined: { deletedNodeIds: [], deletedEdgeIds: [] },
    cancelled: true,
  })
  await restored(page, initial)
  expect(await historyPart(page, 'pastCount')).toBe(0)
})

test('undo cancels a live pointer preview and its later release cannot commit stale positions', async ({
  page,
}) => {
  await openHistory(page)
  const initial = await read(page)
  await move(page, 180)

  const bounds = await page
    .locator('#app .flow-node[data-node-id="a"]')
    .boundingBox()

  if (bounds === null) {
    throw new Error('Missing node bounds')
  }

  await page.mouse.move(bounds.x + 70, bounds.y + 25)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 180, bounds.y + 85, { steps: 6 })
  await replay(page, 'undo')
  await restored(page, initial)
  await page.mouse.up()
  await restored(page, initial)
  expect(await readPart(page, 'history')).toMatchObject({
    pastCount: 0,
    futureCount: 1,
  })
})

test('controlled replay requires context echo, rejects without moving stacks, and accepts undo and redo', async ({
  page,
}) => {
  await openHistory(page, '?controlled')
  const initial = await read(page)
  await move(page, 180)
  const moved = await read(page)
  expect(moved.history.pastCount).toBe(1)
  await page.evaluate(() =>
    globalThis.flowHistoryFixture?.setAcceptProposals(false)
  )
  await replay(page, 'undo')
  await restored(page, moved)
  expect(await readPart(page, 'history')).toMatchObject({
    pending: true,
    pastCount: 1,
    futureCount: 0,
  })
  await page.getByRole('button', { name: 'Reject edit', exact: true }).click()
  expect(await readPart(page, 'history')).toMatchObject({
    pending: false,
    pastCount: 1,
    futureCount: 0,
  })
  await replay(page, 'undo')
  await page.evaluate(() => globalThis.flowHistoryFixture?.acceptLatest())
  await restored(page, initial)
  expect(await readPart(page, 'history')).toMatchObject({
    pending: false,
    pastCount: 0,
    futureCount: 1,
  })
  await replay(page, 'redo')
  await restored(page, initial)
  expect(await historyPart(page, 'pending')).toBe(true)
  await page.evaluate(() => globalThis.flowHistoryFixture?.acceptLatest())
  await restored(page, moved)
  expect(await readPart(page, 'history')).toMatchObject({
    pending: false,
    pastCount: 1,
    futureCount: 0,
  })
  // An ignored ordinary proposal has no accepted history entry.
  await move(page, 260)
  await restored(page, moved)
  expect(await historyPart(page, 'pastCount')).toBe(1)
})

test('an owner update without the replay context is an ordinary accepted edit', async ({
  page,
}) => {
  await openHistory(page, '?controlled')
  const initial = await read(page)
  await move(page, 180)
  await page.evaluate(() =>
    globalThis.flowHistoryFixture?.setAcceptProposals(false)
  )
  await replay(page, 'undo')
  await page.evaluate(() => globalThis.flowHistoryFixture?.acceptLatest(false))
  await restored(page, initial)
  expect(await readPart(page, 'history')).toMatchObject({
    pending: false,
    pastCount: 2,
    futureCount: 0,
  })
})

test('capacity zero disables retention, positive capacity bounds undo, and malformed capacity rejects at mount', async ({
  page,
}) => {
  await openHistory(page, '?capacity=0')
  await move(page, 180)
  expect(await readPart(page, 'history')).toMatchObject({
    capacity: 0,
    canUndo: false,
    pastCount: 0,
  })
  await openHistory(page, '?capacity=2')
  await move(page, 180)
  const oldestRetained = await read(page)
  await move(page, 200)
  await move(page, 220)
  expect(await historyPart(page, 'pastCount')).toBe(2)
  await replay(page, 'undo')
  await replay(page, 'undo')
  await restored(page, oldestRetained)
  await replay(page, 'undo')
  await restored(page, oldestRetained)

  const malformed = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)

    return Promise.all(
      [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY].map(
        async (historyCapacity) => {
          const root = document.createElement('div')
          document.body.append(root)

          try {
            const controller = await createFlow(
              root,
              { nodes: [], edges: [] },
              {
                documentMode: 'uncontrolled',
                historyCapacity,
                viewport: {
                  mode: 'uncontrolled',
                  initial: { x: 0, y: 0, zoom: 1 },
                  limits: { minZoom: 0.5, maxZoom: 2 },
                },
              }
            )

            controller.destroy()

            return false
          } catch {
            return true
          } finally {
            root.remove()
          }
        }
      )
    )
  })

  expect(malformed).toEqual([true, true, true, true])
})

test('selection and viewport noise stay outside history and replay preserves current selection', async ({
  page,
}) => {
  await openHistory(page)
  await move(page, 180)
  await page.locator('#app .flow-node[data-node-id="b"]').click()

  const selected = await page.evaluate(
    () => globalThis.flowHistoryFixture?.controller.getNode('b')?.selected
  )

  expect(selected).toBe(true)
  expect(await historyPart(page, 'pastCount')).toBe(1)
  await replay(page, 'undo')
  expect(
    await page.evaluate(
      () => globalThis.flowHistoryFixture?.controller.getNode('b')?.selected
    )
  ).toBe(true)
  await expect(
    page.locator('#app .flow-node[data-node-id="b"]')
  ).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() =>
    globalThis.flowHistoryFixture?.controller.updateViewport({
      x: 10,
      y: 20,
      zoom: 1,
    })
  )
  expect(await readPart(page, 'history')).toMatchObject({
    pastCount: 0,
    futureCount: 1,
  })
})

test('native text undo and composing shortcuts leave graph history intact', async ({
  page,
}) => {
  await openHistory(page)
  await move(page, 180)
  const moved = await read(page)
  const input = page.getByRole('textbox', { name: 'Native undo text' })
  await input.focus()
  await page.keyboard.type('native edit')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(input).toHaveValue('')
  await restored(page, moved)
  expect(await historyPart(page, 'pastCount')).toBe(1)
  await page
    .locator('#app .flow-canvas')
    .dispatchEvent('keydown', { key: 'z', ctrlKey: true, isComposing: true })
  await restored(page, moved)
})

test('disposal releases history, settles queued replay, and reload starts a new session', async ({
  page,
}) => {
  await openHistory(page)
  const initial = await read(page)
  await move(page, 180)

  const result = await page.evaluate(async () => {
    const fixture = globalThis.flowHistoryFixture

    if (fixture === undefined) {
      throw new Error('Missing history fixture')
    }

    const { controller, isolated } = fixture
    let queued: Promise<void> | undefined
    let notifications = 0
    controller.subscribeHistory(() => {
      notifications += 1
    })

    const stop = controller.subscribeState(() => {
      queued = controller.undo()
      controller.destroy()
    })

    await controller.updateNode('a', { position: { x: 220, y: 180 } })

    const outcome = await queued?.then(
      () => 'resolved',
      () => 'disposed'
    )

    stop()
    const atDisposal = notifications
    await controller.undo()
    await controller.redo()
    await isolated.updateNode('peer', { position: { x: 200, y: 30 } })

    return {
      outcome,
      status: controller.getHistoryStatus(),
      atDisposal,
      notifications,
      isolated: isolated.getHistoryStatus(),
    }
  })

  expect(result.outcome).toBe('disposed')
  expect(result.status).toMatchObject({
    disposed: true,
    canUndo: false,
    canRedo: false,
    pending: false,
    pastCount: 0,
    futureCount: 0,
  })
  expect(result.notifications).toBe(result.atDisposal)
  expect(result.isolated.pastCount).toBe(1)
  await page.reload()
  await page.waitForFunction(() => globalThis.flowHistoryFixture !== undefined)
  await restored(page, initial)
  expect(await readPart(page, 'history')).toMatchObject({
    pastCount: 0,
    futureCount: 0,
    capacity: 100,
    disposed: false,
  })
})
