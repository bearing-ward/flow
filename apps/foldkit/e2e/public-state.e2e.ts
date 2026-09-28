import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

const viewportContract: {
  coordinateCases: readonly {
    hostRect: { left: number; top: number }
    client: { x: number; y: number }
    viewport: { x: number; y: number; zoom: number }
    flow: { x: number; y: number }
    screen: { x: number; y: number }
  }[]
  fitCases: readonly {
    bounds: { x: number; y: number; width: number; height: number }
    pane: { width: number; height: number }
    limits: { minZoom: number; maxZoom: number }
    padding:
      | number
      | { top: number; right: number; bottom: number; left: number }
    viewport: { x: number; y: number; zoom: number }
  }[]
  operationContract: {
    controlled: { finalStatus: string }
    uncontrolled: { finalStatus: string }
    superseded: { previousStatus: string; replacementFinalStatus: string }
    disposed: { inFlightStatus: string }
    observationKinds: readonly string[]
  }
} = JSON.parse(
  readFileSync('research/fixtures/viewport-contract.json', 'utf-8')
)

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

test('Foldkit viewport requests return controlled proposals and drive the rendered transform', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })
  const [coordinate] = viewportContract.coordinateCases

  if (coordinate === undefined) {
    throw new Error('Missing viewport coordinate fixture')
  }

  const request = {
    width: 600,
    height: 400,
    originX: coordinate.hostRect.left,
    originY: coordinate.hostRect.top,
  }

  const converted = await page.evaluate(
    async ({ coordinate: fixtureCoordinate, ...base }) => {
      const api = window.__flowFoldkitTest
      await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'set',
        viewport: fixtureCoordinate.viewport,
      })

      const updated = await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'flowToScreen',
        point: fixtureCoordinate.flow,
      })

      const screen = await api?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'screenToFlow',
        point: fixtureCoordinate.screen,
      })

      return { updated, screen }
    },
    { ...request, coordinate }
  )

  expect(converted.updated?.status).toBe('unchanged')
  expect(converted.updated?.point).toEqual(coordinate.screen)
  expect(converted.screen?.point).toEqual(coordinate.flow)
  await expect(page.locator('.flow-foldkit-viewport').first()).toBeVisible()
  await expect(page.locator('.flow-foldkit-viewport').first()).toHaveCSS(
    'transform',
    `matrix(${coordinate.viewport.zoom}, 0, 0, ${coordinate.viewport.zoom}, ${coordinate.viewport.x}, ${coordinate.viewport.y})`
  )

  const scrolled = await page.evaluate(async (base) => {
    document.body.style.minHeight = '1800px'
    window.scrollTo(0, 180)
    const pane = document.querySelector('.flow-foldkit-canvas')

    if (!(pane instanceof HTMLElement)) {
      throw new Error('Missing Foldkit pane')
    }

    const rect = pane.getBoundingClientRect()
    const point = { x: 110, y: 60 }

    const requestBase = {
      width: rect.width,
      height: rect.height,
      originX: rect.left,
      originY: rect.top,
    }

    await window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
      ...requestBase,
      kind: 'set',
      viewport: base.viewport,
    })

    return {
      rect: { left: rect.left, top: rect.top },
      forward: await window.__flowFoldkitTest?.requestPublicViewport(
        'uncontrolled',
        {
          ...requestBase,
          kind: 'flowToScreen',
          point,
        }
      ),
      reverse: await window.__flowFoldkitTest?.requestPublicViewport(
        'uncontrolled',
        {
          ...requestBase,
          kind: 'screenToFlow',
          point: {
            x: rect.left + base.viewport.x + point.x * base.viewport.zoom,
            y: rect.top + base.viewport.y + point.y * base.viewport.zoom,
          },
        }
      ),
    }
  }, coordinate)

  expect(scrolled.rect.top).toBeLessThan(0)
  expect(scrolled.forward?.point).toEqual({
    x:
      scrolled.rect.left +
      coordinate.viewport.x +
      coordinate.flow.x * coordinate.viewport.zoom,
    y:
      scrolled.rect.top +
      coordinate.viewport.y +
      coordinate.flow.y * coordinate.viewport.zoom,
  })
  expect(scrolled.reverse?.point).toEqual(coordinate.flow)
  const [fitFixture] = viewportContract.fitCases

  if (fitFixture === undefined) {
    throw new Error('Missing viewport fit fixture')
  }

  const fit = await page.evaluate(
    (fixture) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        kind: 'fitBounds',
        bounds: fixture.bounds,
        width: fixture.pane.width,
        height: fixture.pane.height,
        originX: 0,
        originY: 0,
        padding: fixture.padding,
      }),
    fitFixture
  )

  expect(fit?.viewport).toEqual(fitFixture.viewport)

  const controlled = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('controlled', {
        ...base,
        kind: 'center',
        point: { x: 100, y: 80 },
      }),
    request
  )

  expect(controlled?.status).toBe(
    viewportContract.operationContract.controlled.finalStatus
  )
  expect(controlled?.viewport).toEqual({ x: 200, y: 120, zoom: 1 })

  const controlledSnapshot = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('controlled')
  )

  expect(controlledSnapshot?.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(
    await page.evaluate(
      () => window.__flowFoldkitTest?.publicAcceptedStates('controlled').length
    )
  ).toBe(0)

  const unchanged = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'get',
      }),
    request
  )

  expect(unchanged?.viewport).toEqual(fitFixture.viewport)
})

test('Foldkit viewport animation supersedes requests and fitView renders selected nodes', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const request = { width: 600, height: 400, originX: 0, originY: 0 }

  const animated = await page.evaluate(async (base) => {
    const api = window.__flowFoldkitTest

    const first = api?.requestPublicViewport('uncontrolled', {
      ...base,
      kind: 'set',
      viewport: { x: 200, y: 120, zoom: 1.5 },
      animation: { duration: 160, easing: 'ease-in-out' },
    })

    const second = api?.requestPublicViewport('uncontrolled', {
      ...base,
      kind: 'set',
      viewport: { x: 100, y: 80, zoom: 1.25 },
      animation: { duration: 64 },
    })

    return { first: await first, second: await second }
  }, request)

  expect(animated.first?.status).toBe(
    viewportContract.operationContract.superseded.previousStatus
  )
  expect(animated.second).toMatchObject({
    status:
      viewportContract.operationContract.superseded.replacementFinalStatus,
    viewport: { x: 100, y: 80, zoom: 1.25 },
  })
  await expect(page.locator('.flow-foldkit-viewport').first()).toHaveCSS(
    'transform',
    'matrix(1.25, 0, 0, 1.25, 100, 80)'
  )

  const observationKinds = await page.evaluate(() =>
    window.__flowFoldkitTest
      ?.publicViewportEvents('uncontrolled')
      .map(({ kind }) => kind)
  )

  const finalEnd = observationKinds?.lastIndexOf('end') ?? -1
  const animationStart = observationKinds?.lastIndexOf('start') ?? -1
  const animationChange = observationKinds?.lastIndexOf('change') ?? -1
  expect(viewportContract.operationContract.observationKinds).toEqual([
    'start',
    'change',
    'end',
  ])
  expect(animationStart).toBeGreaterThan(0)
  expect(animationChange).toBeGreaterThan(animationStart)
  expect(finalEnd).toBeGreaterThan(animationChange)
  expect(observationKinds?.[animationStart - 1]).toBe('end')
})

test('Foldkit fitView measures and fits selected nodes', async ({ page }) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const request = { width: 600, height: 400, originX: 0, originY: 0 }

  const initial = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestSnapshot('uncontrolled')
  )

  if (initial === undefined) {
    throw new Error('Missing document for selected fit')
  }

  const selectedDocument = {
    ...initial.snapshot.document,
    nodes: initial.snapshot.document.nodes.map((node) =>
      node.id === 'visible'
        ? { ...node, selected: true }
        : { ...node, selected: false }
    ),
  }

  await page.evaluate((documentInput) => {
    if (documentInput !== undefined) {
      window.__flowFoldkitTest?.replacePublicDocument(
        'uncontrolled',
        documentInput
      )
    }
  }, selectedDocument)
  await page.evaluate(() => window.__flowFoldkitTest?.settlePublicState())
  await page.evaluate(() =>
    window.__flowFoldkitTest?.refreshPublicNode('uncontrolled', 'visible')
  )

  const selectedFit = await page.evaluate(
    (base) =>
      window.__flowFoldkitTest?.requestPublicViewport('uncontrolled', {
        ...base,
        kind: 'fitView',
        nodes: 'selected',
        padding: 0.1,
      }),
    request
  )

  expect(selectedFit).toMatchObject({ status: 'accepted', complete: true })
  expect(selectedFit?.viewport.zoom).toBeGreaterThan(0)

  const transform = await page
    .locator('.flow-foldkit-viewport')
    .first()
    .evaluate((element) => getComputedStyle(element).transform)

  const matrix = transform
    .match(/^matrix\((?<values>.*)\)$/u)
    ?.groups?.values?.split(',')
    .map(Number)

  expect(matrix).toHaveLength(6)
  expect(matrix?.[0]).toBeCloseTo(selectedFit?.viewport.zoom ?? 0, 4)
  expect(matrix?.[1]).toBeCloseTo(0, 4)
  expect(matrix?.[2]).toBeCloseTo(0, 4)
  expect(matrix?.[3]).toBeCloseTo(selectedFit?.viewport.zoom ?? 0, 4)
  expect(matrix?.[4]).toBeCloseTo(selectedFit?.viewport.x ?? 0, 4)
  expect(matrix?.[5]).toBeCloseTo(selectedFit?.viewport.y ?? 0, 4)
})

test('Foldkit viewport client honors reduced motion and settles pending work on disposal', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const reduced = await page.evaluate(() =>
    window.__flowFoldkitTest?.requestViewportClient('uncontrolled', {
      kind: 'set',
      viewport: { x: 70, y: 45, zoom: 1.2 },
      animation: { duration: 400, easing: 'ease-in-out' },
    })
  )

  expect(reduced).toMatchObject({
    status: 'accepted',
    complete: true,
    viewport: { x: 70, y: 45, zoom: 1.2 },
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  const pending = await page.evaluate(() => {
    const request = window.__flowFoldkitTest?.requestViewportClient(
      'uncontrolled',
      {
        kind: 'set',
        viewport: { x: 200, y: 180, zoom: 1.7 },
        animation: { duration: 1000 },
      }
    )

    window.__flowFoldkitTest?.disposePublicState()

    return request
  })

  expect(pending).toMatchObject({ status: 'disposed', complete: true })
})
