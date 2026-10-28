import { test, expect } from '@playwright/test'

import { representativeCombination } from '../../shared-e2e/representative-cases.ts'
import type * as NodeReentryHarness from './gesture-ownership-harness.ts'

const terminalEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

const terminalNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

const terminalNodeB = {
  id: 'b',
  label: 'B',
  position: { x: 220, y: 20 },
  size: { width: 150, height: 45 },
  handles: [
    { id: 'out', kind: 'source', side: 'right' },
    { id: 'in', kind: 'target', side: 'left' },
  ],
  selected: true,
}

const terminalNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

const terminalOldEdge = {
  id: 'edge',
  source: 'a',
  target: 'b',
  sourceHandle: 'out',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

for (const [axis0, terminal] of (
  ['pointerup', 'pointercancel'] as const
).entries()) {
  for (const [axis1, [actor, threshold]] of (
    [
      ['node', 0],
      ['connection', 5],
      ['connection', 0],
      ['reconnection', 5],
      ['reconnection', 0],
    ] as const
  ).entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`synthetic dispatch ${terminal} to ${actor} ${threshold}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const harness = await import(path)

          return harness.terminalDispatchReentry(...args)
        },
        [actor, threshold, terminal]
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('full-public-stream', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
      await page.screenshot({ path: testInfo.outputPath('public-host.png') })

      const a = {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
      }

      const b = {
        nodeIds: ['b'],
        positions: [{ nodeId: 'b', position: { x: 220, y: 20 } }],
      }

      const bFinal = {
        nodeIds: ['b'],
        positions: [{ nodeId: 'b', position: { x: 232, y: 20 } }],
      }

      const connection = {
        source: 'b',
        sourceHandle: 'out',
        target: 'c',
        targetHandle: 'in',
      }

      const edge = { ...terminalOldEdge, target: 'c' }
      const newEdge = { id: 'edge-2', ...connection }

      const connectionStart = {
        source: 'b',
        sourceHandle: 'out',
        inputKind: 'pointer-connect',
      }

      const reconnectStart = { edgeId: 'edge', endpoint: 'target' }

      const startByActor = {
        node: terminalEvent('nodeStart', b),
        connection: terminalEvent('connectStart', connectionStart),
        reconnection: terminalEvent('reconnectStart', reconnectStart),
      }

      const tailByActor = {
        node: [
          terminalEvent('nodeStop', {
            ...bFinal,
            outcome: 'proposed',
            reason: undefined,
          }),
        ],
        connection: [
          terminalEvent('connect', connection),
          terminalEvent('connectEnd', {
            ...connectionStart,
            outcome: 'proposed',
            reason: undefined,
            target: { nodeId: 'c', handleId: 'in' },
          }),
        ],
        reconnection: [
          terminalEvent('reconnect', edge),
          terminalEvent('reconnectEnd', {
            ...reconnectStart,
            outcome: 'proposed',
            edge,
          }),
        ],
      }

      const changeByActor = {
        node: {
          kind: 'node-position',
          nodeId: 'b',
          position: { x: 232, y: 20 },
        },
        connection: { kind: 'edge-add', edge: newEdge },
        reconnection: { kind: 'edge-reconnect', edge },
      }

      const previewByActor = {
        node: null,
        connection: {
          kind: 'connect',
          from: { x: 369, y: 42.5 },
          to: { x: 369, y: 42.5 },
          candidate: null,
          valid: null,
        },
        reconnection: {
          kind: 'reconnect',
          from: { x: 169, y: 42.5 },
          to: { x: 169, y: 42.5 },
          candidate: null,
          valid: null,
          edgeId: 'edge',
          endpoint: 'target',
        },
      }

      const prefix = [
        terminalEvent('nodeStart', a),
        terminalEvent('nodeStop', {
          ...a,
          ...(terminal === 'pointerup'
            ? { outcome: 'proposed', reason: undefined }
            : { outcome: 'cancelled', reason: 'pointer-cancel' }),
        }),
      ]

      const aChanges =
        terminal === 'pointerup'
          ? [{ kind: 'node-position', nodeId: 'a', position: { x: 20, y: 20 } }]
          : []

      const target = actor === 'node' ? 'b' : 'canvas'

      const captureHistory = [
        { action: 'set', target: 'a', id: 7 },
        { action: 'release', target: 'a', id: 7 },
        { action: 'set', target, id: 7 },
      ]

      const afterDocument = {
        nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
        edges: [terminalOldEdge],
      }

      const finalDocumentByActor = {
        node: {
          nodes: [
            terminalNodeA,
            { ...terminalNodeB, position: { x: 232, y: 20 } },
            terminalNodeC,
          ],
          edges: [terminalOldEdge],
        },
        connection: { ...afterDocument, edges: [terminalOldEdge, newEdge] },
        reconnection: { ...afterDocument, edges: [edge] },
      }

      expect(result.afterA).toStrictEqual({
        events: [...prefix, ...(threshold === 0 ? [startByActor[actor]] : [])],
        changes: aChanges,
        held: 1,
        captures: ['a', target],
        captureHistory,
        document: afterDocument,
        preview: threshold === 0 ? previewByActor[actor] : null,
      })
      expect(result.final).toStrictEqual({
        events: [...prefix, startByActor[actor], ...tailByActor[actor]],
        changes: [...aChanges, changeByActor[actor]],
        held: 0,
        captures: ['a', target],
        captureHistory: [
          ...captureHistory,
          { action: 'release', target, id: 7 },
        ],
        document: finalDocumentByActor[actor],
        preview: null,
      })
    })
  }
}

for (const mode of [
  'ordinary',
  'nested',
  'redispatch',
  'outside',
  'loss',
] as const) {
  test(`captured Escape ${mode}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.escapeDispatchProof(selected)
    }, mode)

    await testInfo.attach('escape-full-stream', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })

    const a = {
      nodeIds: ['a'],
      positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
    }

    const b = {
      nodeIds: ['b'],
      positions: [{ nodeId: 'b', position: { x: 220, y: 20 } }],
    }

    const c = {
      nodeIds: ['c'],
      positions: [{ nodeId: 'c', position: { x: 420, y: 20 } }],
    }

    const beforeDocument = {
      nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
      edges: [terminalOldEdge],
    }

    const startA = terminalEvent('start', a)

    const prefix = [
      startA,
      terminalEvent('stop', { ...a, outcome: 'cancelled', reason: 'escape' }),
      terminalEvent('start', b),
    ]

    const nestedEvents = [
      ...prefix,
      terminalEvent('stop', { ...b, outcome: 'cancelled', reason: 'escape' }),
      terminalEvent('start', c),
    ]

    const firstCaptures = [
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
      { action: 'set', target: 'b', id: 7 },
    ]

    const nestedCaptures = [
      ...firstCaptures,
      { action: 'release', target: 'b', id: 7 },
      { action: 'set', target: 'c', id: 7 },
    ]

    const propagation = mode === 'outside' ? ['window'] : ['canvas', 'window']
    const doubledPropagation = ['canvas', 'window', 'canvas', 'window']

    const ordinary = {
      events: prefix,
      captures: ['a', 'b'],
      captureHistory: firstCaptures,
      held: 1,
      propagation,
      document: beforeDocument,
    }

    const nested = {
      events: nestedEvents,
      captures: ['a', 'b', 'c'],
      captureHistory: nestedCaptures,
      held: 1,
      propagation: doubledPropagation,
      document: beforeDocument,
    }

    const after = mode === 'nested' || mode === 'redispatch' ? nested : ordinary
    const lastId = mode === 'nested' || mode === 'redispatch' ? 'c' : 'b'
    const lastX = lastId === 'c' ? 432 : 232
    expect(result).toStrictEqual({
      competing: {
        events: [startA],
        captures: ['a'],
        captureHistory: [{ action: 'set', target: 'a', id: 7 }],
        held: 1,
        propagation: [],
        document: beforeDocument,
      },
      afterA: mode === 'nested' ? nested : ordinary,
      afterContinuation: after,
      prevented: true,
      final: {
        ...after,
        events: [
          ...after.events,
          terminalEvent('stop', {
            nodeIds: [lastId],
            positions: [{ nodeId: lastId, position: { x: lastX, y: 20 } }],
            outcome: 'proposed',
            reason: undefined,
          }),
          ...(lastId === 'b' ? [terminalEvent('start', c)] : []),
        ],
        captureHistory: [
          ...after.captureHistory,
          { action: 'release', target: lastId, id: 7 },
          ...(lastId === 'b' ? [{ action: 'set', target: 'c', id: 7 }] : []),
        ],
        captures: ['a', 'b', 'c'],
        held: lastId === 'b' ? 1 : 0,
        document: {
          nodes: [
            terminalNodeA,
            lastId === 'b'
              ? { ...terminalNodeB, position: { x: 232, y: 20 } }
              : terminalNodeB,
            lastId === 'c'
              ? { ...terminalNodeC, position: { x: 432, y: 20 } }
              : terminalNodeC,
          ],
          edges: [terminalOldEdge],
        },
      },
    })
  })
}

test('captured preview fanout', async ({ page }, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/gesture-ownership-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.previewFanoutProof()
  })

  await testInfo.attach('preview-full-stream', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  })

  const preview = {
    kind: 'connect',
    from: { x: 369, y: 42.5 },
    to: { x: 369, y: 42.5 },
    candidate: null,
    valid: null,
  }

  expect(result).toStrictEqual({
    events: [
      terminalEvent('first', null),
      terminalEvent('first', preview),
      terminalEvent('second', preview),
      terminalEvent('renderer', {
        value: preview,
        element: 2,
        connected: true,
      }),
      terminalEvent('start', {
        source: 'b',
        sourceHandle: 'out',
        inputKind: 'pointer-connect',
      }),
      terminalEvent('second', null),
      terminalEvent('renderer', { value: null, element: 1, connected: false }),
      terminalEvent('end', {
        source: 'a',
        sourceHandle: 'out',
        inputKind: 'pointer-connect',
        outcome: 'cancelled',
        reason: 'pointer-cancel',
      }),
    ],
    captures: ['canvas', 'canvas'],
    held: 1,
    preview,
    previewElements: [
      { id: 1, connected: false },
      { id: 2, connected: true },
    ],
  })
})

for (const [axis0, actor] of (
  ['keyboard-node', 'keyboard-resize', 'retained', 'touch'] as const
).entries()) {
  for (const [axis1, terminal] of (['escape', 'blur'] as const).entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`aggregate ${actor} ${terminal}`, async ({ page }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.aggregateEntryProof(args.actor, args.terminal)
        },
        { actor, terminal }
      )

      await testInfo.attach('aggregate-entry-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })
      expect(result.after.connecting).toBe(false)
      expect(result.after.held).toBe(1)
      expect(result.held).toBe(0)
      expect(
        result.document.nodes.find((node) => node.id === 'a')?.position
      ).toStrictEqual({ x: actor === 'touch' ? 20 : 32, y: 20 })

      if (actor === 'touch') {
        expect(result.captures).toStrictEqual([
          { action: 'set', target: 'canvas', id: 7 },
          { action: 'release', target: 'canvas', id: 7 },
          { action: 'set', target: 'canvas', id: 7 },
          { action: 'set', target: 'canvas', id: 8 },
          { action: 'release', target: 'canvas', id: 7 },
          { action: 'release', target: 'canvas', id: 8 },
        ])
      }
    })
  }
}

for (const actor of ['connection', 'selection', 'node'] as const) {
  test(`frozen old ${actor} frame cannot advance B`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.frozenFrameProof(selected)
    }, actor)

    await testInfo.attach('frozen-frame-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
    expect(result.oldFrameCount).toBe(1)
    expect(result.before.held).toBe(1)
    expect(result.after).toStrictEqual(result.before)
  })
}

test('old reset timer preserves successor click suppression', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/gesture-ownership-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.suppressionTimerProof()
  })

  await testInfo.attach('suppression-timer-stream', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })
  expect(
    result.first.document.nodes.map((node) => node.selected)
  ).toStrictEqual([false, false, false])
  expect(result.document.nodes.map((node) => node.selected)).toStrictEqual([
    false,
    true,
    false,
  ])
  expect(result.clicks).toStrictEqual([
    'node',
    'parent',
    'window',
    'node',
    'parent',
    'window',
  ])
  expect({ held: result.held, captures: result.captures }).toStrictEqual({
    held: 0,
    captures: [
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
      { action: 'set', target: 'b', id: 7 },
      { action: 'release', target: 'b', id: 7 },
    ],
  })
})

test('matching loss cancels only its original capture owner', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/gesture-ownership-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.matchingLossProof()
  })

  await testInfo.attach('matching-loss-stream', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })

  const a = {
    nodeIds: ['a'],
    positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
  }

  const b = {
    nodeIds: ['b'],
    positions: [{ nodeId: 'b', position: { x: 220, y: 20 } }],
  }

  const beforeDocument = {
    nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
    edges: [terminalOldEdge],
  }

  const initial = {
    events: [terminalEvent('start', a)],
    captures: [{ action: 'set', target: 'a', id: 7 }],
    held: 1,
    document: beforeDocument,
  }

  const afterLoss = {
    events: [
      terminalEvent('start', a),
      terminalEvent('stop', {
        ...a,
        outcome: 'cancelled',
        reason: 'lost-pointer-capture',
      }),
      terminalEvent('start', b),
    ],
    captures: [
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
      { action: 'set', target: 'b', id: 7 },
    ],
    held: 1,
    document: beforeDocument,
  }

  expect(result).toStrictEqual({
    before: initial,
    wrong: initial,
    afterLoss,
    stale: afterLoss,
    final: {
      events: [
        ...afterLoss.events,
        terminalEvent('change', {
          kind: 'node-position',
          nodeId: 'b',
          position: { x: 232, y: 20 },
        }),
        terminalEvent('stop', {
          nodeIds: ['b'],
          positions: [{ nodeId: 'b', position: { x: 232, y: 20 } }],
          outcome: 'proposed',
          reason: undefined,
        }),
      ],
      captures: [
        ...afterLoss.captures,
        { action: 'release', target: 'b', id: 7 },
      ],
      held: 0,
      document: {
        nodes: [
          terminalNodeA,
          { ...terminalNodeB, position: { x: 232, y: 20 } },
          terminalNodeC,
        ],
        edges: [terminalOldEdge],
      },
    },
  })
})

for (const route of [
  'frame',
  'dispose',
  'combined',
  'combined-pending',
] as const) {
  test(`node continuation ${route}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (routeInput) => {
      const path = '/e2e/gesture-ownership-harness.ts'

      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourNode(routeInput)
    }, route)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('full-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })

    // Pinned react/src/hooks/useOnViewportChange.ts:37 emits no initial viewport lifecycle callback.
    // eslint-disable-next-line unicorn/consistent-function-scoping -- Keep the literal event oracle beside this scenario.
    const nodeEvent = (name: string, nodeId: string, x: number) => ({
      name,
      payload: {
        nodeIds: [nodeId],
        positions: [{ nodeId, position: { x, y: 20 } }],
      },
    })

    const start = nodeEvent('nodeStart', 'a', 20)

    const oldStop = {
      name: 'nodeStop',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
        outcome: 'cancelled',
        reason: (() => {
          if (route.startsWith('combined')) {
            return 'escape'
          }

          if (route === 'dispose') {
            return 'host-destroyed'
          }

          return 'pointer-cancel'
        })(),
      },
    }

    const successorId = route.startsWith('combined') ? 'a' : 'b'
    const successorX = route.startsWith('combined') ? 60 : 230

    const prefix = (() => {
      if (route.startsWith('combined')) {
        return [
          {
            name: 'connectStart',
            payload: {
              inputKind: 'click-connect',
              source: 'a',
              sourceHandle: 'out',
            },
          },
          start,
          nodeEvent('nodeMove', 'a', 40),
          ...(route === 'combined-pending'
            ? []
            : [
                nodeEvent('nodeStart', 'a', 20),
                nodeEvent('nodeMove', 'a', 60),
              ]),
          oldStop,
          {
            name: 'connectEnd',
            payload: {
              inputKind: 'click-connect',
              outcome: 'cancelled',
              reason: 'escape',
              source: 'a',
              sourceHandle: 'out',
            },
          },
        ]
      }

      return [
        start,
        nodeEvent('nodeMove', 'a', 365),
        {
          name: 'move',
          payload: {
            kind: 'change',
            source: 'user',
            viewport: { x: -15, y: 0, zoom: 1 },
          },
        },
        oldStop,
        ...(route === 'frame'
          ? [nodeEvent('nodeStart', 'b', 220), nodeEvent('nodeMove', 'b', 230)]
          : []),
      ]
    })()

    expect(result.after.events).toStrictEqual(prefix)
    expect(result.after.a).toStrictEqual({
      transform:
        route === 'combined'
          ? 'translate(60px, 20px)'
          : 'translate(20px, 20px)',
      dragging: route === 'combined',
      connected: route !== 'dispose',
    })
    expect(result.after.b).toStrictEqual({
      transform:
        route === 'frame' ? 'translate(230px, 20px)' : 'translate(220px, 20px)',
      dragging: route === 'frame',
      connected: route !== 'dispose',
    })
    expect(result.after.held).toBe(route === 'dispose' ? 0 : 1)
    expect(result.after.pending).toStrictEqual([])
    expect(result.after.frames).toStrictEqual(
      route.startsWith('combined')
        ? []
        : [
            { action: 'request', id: 101 },
            { action: 'deliver', id: 101 },
            { action: 'cancel', id: 101 },
          ]
    )
    expect(result.finished.events).toStrictEqual([
      ...prefix,
      ...(route === 'dispose' || route === 'combined-pending'
        ? []
        : [
            {
              name: 'nodeStop',
              payload: {
                nodeIds: [successorId],
                positions: [
                  { nodeId: successorId, position: { x: successorX, y: 20 } },
                ],
                outcome: 'proposed',
                reason: undefined,
              },
            },
          ]),
    ])
    expect(result.finished.held).toBe(0)
    expect(result.finished.pending).toStrictEqual([])

    if (route === 'combined-pending') {
      const anchors = {
        nodes: [
          { id: 'a', position: { x: 95, y: 20 } },
          { id: 'b', position: { x: 295, y: 20 } },
          { id: 'c', position: { x: 495, y: 20 } },
        ],
        edges: [{ id: 'edge', position: { x: 195, y: 42.5 } }],
      }

      const pixels = {
        anchors,
        toolbars: [
          {
            id: 'a',
            transform: 'translate(95px, 20px) translate(-50%, -100%)',
            hidden: false,
          },
          {
            id: 'b',
            transform: 'translate(295px, 20px) translate(-50%, -100%)',
            hidden: false,
          },
          {
            id: 'c',
            transform: 'translate(495px, 20px) translate(-50%, -100%)',
            hidden: false,
          },
          {
            id: 'edge',
            transform: 'translate(195px, 42.5px) translate(-50%, -100%)',
            hidden: false,
          },
        ],
        path: 'M 169,42.5L 221,42.5',
        endpoints: [
          { endpoint: 'source', x: '169', y: '42.5' },
          { endpoint: 'target', x: '221', y: '42.5' },
        ],
        label: { text: 'edge-label', x: '195', y: '42.5' },
        previewCount: 0,
      }

      const minimap = [
        {
          nodeId: 'a',
          x: 6,
          y: 53.127272727272725,
          width: 45.81818181818182,
          height: 13.745454545454546,
        },
        {
          nodeId: 'b',
          x: 67.0909090909091,
          y: 53.127272727272725,
          width: 45.81818181818182,
          height: 13.745454545454546,
        },
        {
          nodeId: 'c',
          x: 128.1818181818182,
          y: 53.127272727272725,
          width: 45.81818181818182,
          height: 13.745454545454546,
        },
        {
          nodeId: null,
          x: -0.10909090909090935,
          y: 47.018181818181816,
          width: 305.4545454545455,
          height: 183.27272727272728,
        },
      ]

      const initial = {
        document: {
          nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
          edges: [{ ...terminalOldEdge, label: 'edge-label' }],
        },
        viewport: { x: 0, y: 0, zoom: 1 },
      }

      for (const checkpoint of [result.after, result.finished]) {
        expect(checkpoint.pixels).toMatchObject(pixels)
        expect(checkpoint.pixels?.minimap).toHaveLength(4)

        for (const [index, rectangle] of minimap.entries()) {
          const actual = checkpoint.pixels?.minimap[index]
          expect(actual?.nodeId).toBe(rectangle.nodeId)
          expect(actual?.x).toBeCloseTo(rectangle.x, 10)
          expect(actual?.y).toBeCloseTo(rectangle.y, 10)
          expect(actual?.width).toBeCloseTo(rectangle.width, 10)
          expect(actual?.height).toBeCloseTo(rectangle.height, 10)
        }
      }

      expect(result.after.captures).toStrictEqual([
        { action: 'set', target: 'a', id: 7 },
        { action: 'release', target: 'a', id: 7 },
        { action: 'set', target: 'a', id: 8 },
      ])
      expect(result.finished.captures).toStrictEqual([
        { action: 'set', target: 'a', id: 7 },
        { action: 'release', target: 'a', id: 7 },
        { action: 'set', target: 'a', id: 8 },
        { action: 'release', target: 'a', id: 8 },
      ])
      expect(result.finished.frames).toStrictEqual([])
      expect(result.finished.a).toStrictEqual({
        transform: 'translate(20px, 20px)',
        dragging: false,
        connected: true,
      })
      expect(result.finished.b).toStrictEqual({
        transform: 'translate(220px, 20px)',
        dragging: false,
        connected: true,
      })
      expect(result.finished.a).toStrictEqual(result.after.a)
      expect(result.after.state).toStrictEqual(initial)
      expect(result.after.publications).toStrictEqual([])

      // Pinned react/src/utils/changes.ts:245-257 leaves unchanged unselected C unset.
      const clicked = {
        document: {
          nodes: [
            { ...terminalNodeA, selected: true },
            { ...terminalNodeB, selected: false },
            terminalNodeC,
          ],
          edges: [{ ...terminalOldEdge, label: 'edge-label', selected: false }],
        },
        viewport: { x: 0, y: 0, zoom: 1 },
      }

      expect(result.finished.state).toStrictEqual(clicked)
      expect(result.finished.publications).toStrictEqual([
        {
          name: 'change',
          payload: { kind: 'node-selection', nodeId: 'a', selected: true },
        },
        {
          name: 'state',
          payload: {
            previous: initial,
            current: clicked,
            cause: 'semantic-change',
          },
        },
      ])
    }
  })
}
