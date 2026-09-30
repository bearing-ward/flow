import { expect, test } from '@playwright/test'

test('Foldkit Runtime snapshot port reads directional handle connections', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    await window.__flowFoldkitTest?.startPublicState()
  })

  const result = await page.evaluate(async () => {
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Foldkit test harness did not initialize')
    }

    harness.replacePublicDocument('uncontrolled', {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: [
            { id: 'out-a', kind: 'source', side: 'right' },
            { id: 'out-b', kind: 'source', side: 'right' },
            { id: 'in-a', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 200, y: 0 },
          handles: [
            { id: 'out-t', kind: 'source', side: 'right' },
            { id: 'in-a', kind: 'target', side: 'left' },
            { id: 'in-b', kind: 'target', side: 'left' },
          ],
        },
        { id: 'other', label: 'Other', position: { x: 400, y: 0 } },
      ],
      edges: [
        {
          id: 'source-a',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-a',
          targetHandle: 'in-a',
        },
        {
          id: 'source-b',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-b',
          targetHandle: 'in-b',
        },
        {
          id: 'incoming-source',
          source: 'other',
          target: 'source',
          targetHandle: 'in-a',
        },
        {
          id: 'outgoing-target',
          source: 'target',
          target: 'other',
          sourceHandle: 'out-t',
        },
      ],
    })

    const request = (query: {
      readonly nodeId: string
      readonly type: 'source' | 'target'
      readonly id?: string | null
    }) =>
      harness
        .requestSnapshot('uncontrolled', { handleConnections: query })
        .then(({ handleConnections }) => handleConnections.map(({ id }) => id))

    await harness.requestSnapshot('uncontrolled')

    return {
      sourceExplicit: await request({
        nodeId: 'source',
        type: 'source',
        id: 'out-a',
      }),
      sourceNull: await request({ nodeId: 'source', type: 'source', id: null }),
      sourceEmpty: await request({ nodeId: 'source', type: 'source', id: '' }),
      sourceOmitted: await request({ nodeId: 'source', type: 'source' }),
      targetExplicit: await request({
        nodeId: 'target',
        type: 'target',
        id: 'in-b',
      }),
      targetNull: await request({ nodeId: 'target', type: 'target', id: null }),
      incoming: await request({ nodeId: 'source', type: 'target' }),
      outgoing: await request({ nodeId: 'target', type: 'source' }),
      zeroMatch: await request({
        nodeId: 'target',
        type: 'target',
        id: 'missing',
      }),
    }
  })

  expect(result).toEqual({
    sourceExplicit: ['source-a'],
    sourceNull: ['source-a', 'source-b'],
    sourceEmpty: ['source-a', 'source-b'],
    sourceOmitted: ['source-a', 'source-b'],
    targetExplicit: ['source-b'],
    targetNull: ['source-a', 'source-b'],
    incoming: ['incoming-source'],
    outgoing: ['outgoing-target'],
    zeroMatch: [],
  })
})

test('Foldkit Runtime observer emits accepted handle-filtered deltas and stops cleanly', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/e2e/test-harness.ts'
    await import(harnessPath)
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit harness')
    }

    await harness.startPublicState()
    await harness.startPublicObservers('uncontrolled', document.body)
    await harness.startPublicObservers('controlled', document.body)
    harness.replacePublicDocument('uncontrolled', {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: [
            { id: 'out-a', kind: 'source', side: 'right' },
            { id: 'out-b', kind: 'source', side: 'right' },
          ],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 200, y: 0 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [],
    })
    await harness.requestSnapshot('uncontrolled')
    harness.observePublicNodeConnections('uncontrolled', 'source', false, {
      type: 'source',
      handleId: 'out-a',
    })
    harness.observePublicNodeConnections('controlled', 'visible')
  })

  const outcome = await page.evaluate(async () => {
    const harness = window.__flowFoldkitTest

    if (harness === undefined) {
      throw new Error('Missing Foldkit harness')
    }

    // A controlled edit is only a proposal until the owner replaces accepted state.
    await harness.requestPublicEdit('controlled', {
      operations: [
        {
          kind: 'add-edges',
          edges: [{ id: 'proposal', source: 'visible', target: 'hidden' }],
        },
      ],
    })
    const afterProposal = [...harness.publicNodeConnectionEvents('controlled')]

    harness.replacePublicDocument('uncontrolled', {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: [
            { id: 'out-a', kind: 'source', side: 'right' },
            { id: 'out-b', kind: 'source', side: 'right' },
          ],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 200, y: 0 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'matching',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-a',
          targetHandle: 'in',
        },
        {
          id: 'other-handle',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-b',
          targetHandle: 'in',
        },
      ],
    })
    await harness.requestSnapshot('uncontrolled')
    const afterConnect = [...harness.publicNodeConnectionEvents('uncontrolled')]

    harness.replacePublicDocument('uncontrolled', {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: [
            { id: 'out-a', kind: 'source', side: 'right' },
            { id: 'out-b', kind: 'source', side: 'right' },
          ],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 200, y: 0 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'other-handle',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-b',
          targetHandle: 'in',
        },
      ],
    })
    await harness.requestSnapshot('uncontrolled')

    const afterDisconnect = [
      ...harness.publicNodeConnectionEvents('uncontrolled'),
    ]

    harness.stopPublicNodeConnections('uncontrolled')
    harness.replacePublicDocument('uncontrolled', {
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: [{ id: 'out-a', kind: 'source', side: 'right' }],
        },
        { id: 'target', label: 'Target', position: { x: 200, y: 0 } },
      ],
      edges: [
        {
          id: 'after-stop',
          source: 'source',
          target: 'target',
          sourceHandle: 'out-a',
        },
      ],
    })
    await harness.requestSnapshot('uncontrolled')

    const controlledEvents = [
      ...harness.publicNodeConnectionEvents('controlled'),
    ]

    const controlledSnapshot = await harness.requestSnapshot('controlled')

    const accepted = controlledSnapshot.snapshot.document.edges.map(
      ({ id }) => id
    )

    harness.disposePublicObservers('controlled')

    return {
      afterProposal,
      afterConnect,
      afterDisconnect,
      afterStop: harness.publicNodeConnectionEvents('uncontrolled'),
      controlledEvents,
      accepted,
    }
  })

  expect(outcome.afterProposal).toEqual([])
  expect(outcome.afterConnect).toEqual(['connect:matching'])
  expect(outcome.afterDisconnect).toEqual([
    'connect:matching',
    'disconnect:matching',
  ])
  expect(outcome.afterStop).toEqual(['connect:matching', 'disconnect:matching'])
  expect(outcome.controlledEvents).toEqual([])
  expect(outcome.accepted).toEqual(['visible-edge', 'culled-edge'])
})
