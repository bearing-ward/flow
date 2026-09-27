import { expect, test } from '@playwright/test'

test('Foldkit snapshot requests read complete accepted graph state', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'child',
      edgeId: 'visible-edge',
    })
  )

  expect(initial?.snapshot.document.nodes.map(({ id }) => id)).toEqual([
    'visible',
    'hidden',
    'culled',
    'parent',
    'child',
  ])
  expect(initial?.snapshot.document.edges.map(({ id }) => id)).toEqual([
    'visible-edge',
    'culled-edge',
  ])
  expect(initial?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(initial?.node).toMatchObject({
    id: 'child',
    parentId: 'parent',
    position: { x: 10, y: 15 },
  })
  expect(initial?.edge?.id).toBe('visible-edge')
  await expect(page.locator('.flow-foldkit-node')).toHaveCount(6)
  await expect(page.locator('.flow-foldkit-edge')).toHaveCount(2)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled')
    )
  ).toEqual([])

  const missing = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'missing-node',
      edgeId: 'missing-edge',
    })
  )

  expect(missing?.node).toBeUndefined()
  expect(missing?.edge).toBeUndefined()
})

test('Foldkit ports separate proposals from accepted updates and cancellation', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('uncontrolled', {
      kind: 'set-node-position',
      nodeId: 'visible',
      position: { x: 80, y: 90 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const uncontrolled = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled', {
      nodeId: 'visible',
    })
  )

  expect(uncontrolled?.node?.position).toEqual({ x: 80, y: 90 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicChanges('uncontrolled').length
    )
  ).toBe(1)
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('controlled', {
      kind: 'set-node-position',
      nodeId: 'visible',
      position: { x: 120, y: 130 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const proposal = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled', {
      nodeId: 'visible',
    })
  )

  if (proposal === undefined) {
    throw new Error('Missing controlled snapshot response')
  }

  expect(proposal?.node?.position).toEqual({ x: 20, y: 30 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicChanges('controlled').length
    )
  ).toBe(1)
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(0)

  const acceptedDocument = {
    ...proposal.snapshot.document,
    nodes: proposal.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, position: { x: 120, y: 130 } } : node
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'controlled',
        documentInput
      )
    }
  }, acceptedDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const acknowledged = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled', {
      nodeId: 'visible',
    })
  )

  expect(acknowledged?.node?.position).toEqual({ x: 120, y: 130 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('controlled', {
      kind: 'set-viewport',
      viewport: { x: 90, y: 95, zoom: 1.1 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewportProposal = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(viewportProposal?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(1)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.replacePublicViewport('controlled', {
      x: 90,
      y: 95,
      zoom: 1.1,
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewportAcknowledged = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(viewportAcknowledged?.snapshot.viewport).toEqual({
    x: 90,
    y: 95,
    zoom: 1.1,
  })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(2)

  await page.evaluate(() => {
    window.__flowFoldkitTest?.dispatchPublicCommand('uncontrolled', {
      kind: 'set-viewport',
      viewport: { x: 25, y: 35, zoom: 1.5 },
    })
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  const viewport = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  expect(viewport?.snapshot.viewport).toEqual({ x: 25, y: 35, zoom: 1.5 })

  const acceptedBeforeCancellation = await page.evaluate(
    () => window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
  )

  await page
    .locator('[data-node-id="visible"]')
    .first()
    .dispatchEvent('pointerdown', {
      button: 0,
      pointerId: 41,
      clientX: 20,
      clientY: 30,
    })
  await page.evaluate(() => {
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 41 })
    )
  })
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(async () => {
      const snapshot =
        await window.__flowFoldkitTest?.requestSnapshot('uncontrolled')

      return {
        acceptedCount:
          window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length,
        node: snapshot?.snapshot.document.nodes.find(
          ({ id }) => id === 'visible'
        ),
      }
    })
  ).toMatchObject({
    acceptedCount: acceptedBeforeCancellation,
    node: { position: { x: 80, y: 90 } },
  })
})

test('Foldkit accepted-state ports isolate programs, deduplicate, and dispose', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  if (initial === undefined) {
    throw new Error('Missing initial Foldkit snapshot')
  }

  await page.evaluate((documentInput) => {
    window.__flowFoldkitTest?.replacePublicDocument(
      'uncontrolled',
      documentInput
    )
  }, initial.snapshot.document)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(0)

  const reorderedDataDocument = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, data: { beta: 2, alpha: 1 } } : node
    ),
  }

  await page.evaluate((documentInput) => {
    window.__flowFoldkitTest?.replacePublicDocument(
      'uncontrolled',
      documentInput
    )
  }, reorderedDataDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  expect(
    await page.evaluate(
      () =>
        window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length
    )
  ).toBe(0)

  const equalWithUpdatedLabel = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible' ? { ...node, label: 'Updated' } : node
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'uncontrolled',
        documentInput
      )
    }
  }, equalWithUpdatedLabel)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())

  expect(
    await page.evaluate(async () => {
      const uncontrolled = await window.__flowFoldkitTest?.requestSnapshot(
        'uncontrolled',
        { nodeId: 'visible' }
      )

      const controlled = await window.__flowFoldkitTest?.requestSnapshot(
        'controlled',
        { nodeId: 'visible' }
      )

      return {
        uncontrolledLabel: uncontrolled?.node?.label,
        controlledLabel: controlled?.node?.label,
        acceptedCount:
          window.__flowFoldkitTest?.publicAcceptedStates('uncontrolled').length,
      }
    })
  ).toEqual({
    uncontrolledLabel: 'Updated',
    controlledLabel: 'Visible',
    acceptedCount: 1,
  })

  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicUnsubscribe()
    )
  ).toBe(0)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicListenerFailure()
    )
  ).toBe(1)
  expect(
    await page.evaluate(() =>
      window.__flowFoldkitTest?.exercisePublicReentrancy()
    )
  ).toEqual(['50', '77'])

  await page.evaluate(() => window.__flowFoldkitTest?.disposePublicState())

  const disposed = await page.evaluate(() =>
    window.__flowFoldkitTest?.probeAfterPublicDisposal('uncontrolled')
  )

  expect(disposed).toEqual({
    acceptedCount: 0,
    changeCount: 0,
    mountedElements: 0,
  })
})
