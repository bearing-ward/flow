import { test, expect } from '@playwright/test'

import type { PhysicalActor } from '../../shared-e2e/node-reentry-fixture.ts'
import { nodeThresholdContract } from '../../shared-e2e/node-threshold-contract.ts'
import type * as NodeReentryHarness from './node-reentry-harness.ts'

nodeThresholdContract('vanilla')

for (const [actor, threshold] of [
  ['node', 0],
  ['connection', 5],
  ['connection', 0],
  ['reconnection', 5],
  ['reconnection', 0],
  ['resize', 0],
  ['selection', 0],
  ['pan', 0],
] satisfies readonly (readonly [PhysicalActor, number])[]) {
  for (const complete of [false, true]) {
    test(`round two synthetic capture: Vanilla disposal ${actor} threshold ${threshold} complete ${complete}`, async ({
      page,
    }) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const harness = await import(path)

          return harness.physicalReentry(...args)
        },
        [actor, threshold, complete]
      )

      const expected = {
        events: ['start:a', 'stop:a:host-destroyed'],
        captures: ['a'],
        held: 0,
        changes: [],
      }

      expect(result).toEqual({
        afterTrigger: expected,
        ...expected,
        positions: [
          { id: 'a', position: { x: 20, y: 20 } },
          { id: 'b', position: { x: 220, y: 20 } },
          { id: 'c', position: { x: 420, y: 20 } },
        ],
      })

      const fresh = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const harness = await import(path)

          return harness.physicalReentry(...args, 'fresh')
        },
        [actor, threshold, false]
      )

      expect(fresh.afterTrigger.held).toBe(1)
      expect(fresh.held).toBe(0)
      expect(
        fresh.changes.map((change: { kind: string }) => change.kind)
      ).toEqual(
        {
          node: ['node-position'],
          connection: ['edge-add'],
          reconnection: ['edge-reconnect'],
          resize: ['node-bounds'],
          selection: ['selection-set'],
          pan: ['viewport'],
        }[actor]
      )
    })
  }
}

test('round two synthetic capture: Vanilla mounted Stop preserves node replacement', async ({
  page,
}) => {
  await page.goto('/connection-threshold.html')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const harness = await import(path)

    return harness.physicalReentry('node', 0, false, 'mounted')
  })

  expect(result.events).toEqual([
    'start:a',
    'stop:a:undefined',
    'start:b',
    'stop:b:undefined',
  ])
  expect(result.changes).toEqual([
    { kind: 'node-position', nodeId: 'a', position: { x: 20, y: 20 } },
    { kind: 'node-position', nodeId: 'b', position: { x: 232, y: 20 } },
  ])
  expect(result.afterTrigger.held).toBe(1)
  expect(result.held).toBe(0)
})

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

for (const terminal of ['pointerup', 'pointercancel'] as const) {
  for (const [actor, threshold] of [
    ['node', 0],
    ['connection', 5],
    ['connection', 0],
    ['reconnection', 5],
    ['reconnection', 0],
  ] as const) {
    test(`round three V1 synthetic dispatch ${terminal} to ${actor} ${threshold}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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
  test(`round three V2 V3 captured Escape ${mode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'
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

test('round three V4 captured preview fanout', async ({ page }, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
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

for (const route of [
  'pan',
  'pinch',
  'wheel',
  'doubleclick',
  'start-cancel',
] as const) {
  for (const successor of [false, true]) {
    test(`round three V5 viewport ${route} successor ${successor}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.viewportContinuationProof(args.route, args.successor)
        },
        { route, successor }
      )

      await testInfo.attach('viewport-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })
      const initial = { x: 0, y: 0, zoom: 1 }

      const viewport = {
        pan: { x: 20, y: 30, zoom: 1 },
        pinch: { x: -650, y: -350, zoom: 2 },
        wheel: { x: -20, y: -30, zoom: 1 },
        doubleclick: { x: -130, y: -70, zoom: 1.2 },
        'start-cancel': initial,
      }[route]

      const bViewport = { ...viewport, x: viewport.x + 10, y: viewport.y + 20 }

      const observation = (
        name: string,
        kind: string,
        value: typeof initial
      ) => ({ name, payload: { kind, source: 'user', viewport: value } })

      const change = (value: typeof initial) => ({
        name: 'change',
        payload: { kind: 'viewport', viewport: value },
      })

      const bStart = successor
        ? [
            observation('start', 'start', viewport),
            observation('observe', 'start', viewport),
          ]
        : []

      const end = [
        observation('end', 'end', viewport),
        ...bStart,
        observation('observe', 'end', viewport),
      ]

      const movement = [
        observation('move', 'change', viewport),
        observation('observe', 'change', viewport),
      ]

      // Pinned react/src/hooks/useOnViewportChange.ts:37 registers handlers without a mount event.
      const prefix = [observation('start', 'start', initial)]

      let aEvents

      if (route === 'start-cancel') {
        aEvents = [
          ...prefix,
          ...end,
          ...movement,
          observation('observe', 'start', initial),
        ]
      } else if (route === 'pinch') {
        aEvents = [
          ...prefix,
          observation('observe', 'start', initial),
          ...movement,
          ...end,
          ...movement,
          change(viewport),
        ]
      } else {
        aEvents = [
          ...prefix,
          observation('observe', 'start', initial),
          // The pan fixture moves before release, as pinned packages/system/src/xypanzoom/eventhandler.ts:238 requires.
          ...(route === 'pan' ? movement : []),
          ...movement,
          change(viewport),
          ...end,
        ]
      }

      const captures = (() => {
        if (route === 'pan') {
          return [
            { action: 'set', target: 'canvas', id: 7 },
            { action: 'release', target: 'canvas', id: 7 },
          ]
        }

        if (route === 'pinch') {
          return [
            { action: 'set', target: 'canvas', id: 7 },
            { action: 'set', target: 'canvas', id: 9 },
            { action: 'release', target: 'canvas', id: 7 },
            { action: 'release', target: 'canvas', id: 9 },
          ]
        }

        return []
      })()

      const afterCaptures = [
        ...captures,
        ...(successor ? [{ action: 'set', target: 'canvas', id: 8 }] : []),
      ]

      const suffix = successor
        ? [
            observation('move', 'change', bViewport),
            observation('observe', 'change', bViewport),
            observation('move', 'change', bViewport),
            observation('observe', 'change', bViewport),
            change(bViewport),
            observation('end', 'end', bViewport),
            observation('observe', 'end', bViewport),
          ]
        : []

      expect(result).toStrictEqual({
        afterA: {
          events: aEvents,
          captures: afterCaptures,
          held: successor ? 1 : 0,
          viewport,
        },
        events: [...aEvents, ...suffix],
        captures: [
          ...afterCaptures,
          ...(successor
            ? [{ action: 'release', target: 'canvas', id: 8 }]
            : []),
        ],
        held: 0,
        viewport: successor ? bViewport : viewport,
      })
    })
  }
}

for (const actor of [
  'keyboard-node',
  'keyboard-resize',
  'retained',
  'touch',
] as const) {
  for (const terminal of ['escape', 'blur'] as const) {
    test(`round three V2 aggregate ${actor} ${terminal}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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

test('round three V3 native capture release ordering Vanilla', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)
    await fixture.mountNativeCaptureProof()
  })

  const node = page.locator(
    '#vanilla-native-proof .flow-node[data-node-id="a"]'
  )

  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing node geometry')
  }

  await page.mouse.move(bounds.x + 30, bounds.y + 20)
  await page.mouse.down()
  await page.mouse.up()

  const receipt = await page
    .locator('#vanilla-native-proof')
    .getAttribute('data-receipt')

  if (receipt === null) {
    throw new Error('Missing native receipt')
  }

  await testInfo.attach('native-capture-stream', {
    body: receipt,
    contentType: 'application/json',
  })
  expect(JSON.parse(receipt)).toStrictEqual([
    { name: 'native:set', payload: { id: 1, captured: true }, held: true },
    {
      name: 'nodeStart',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
      },
      held: true,
    },
    { name: 'native:up', payload: { id: 1, trusted: true }, held: true },
    {
      name: 'native:release',
      payload: { id: 1, captured: false },
      held: false,
    },
    {
      name: 'change',
      payload: {
        kind: 'node-position',
        nodeId: 'a',
        position: { x: 20, y: 20 },
      },
      held: false,
    },
    {
      name: 'nodeStop',
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
        outcome: 'proposed',
      },
      held: false,
    },
    { name: 'native:loss', payload: { id: 1, trusted: true }, held: false },
    // Pinned packages/react/src/components/NodeWrapper/index.tsx:109 selects a stationary click with selectNodesOnDrag=false.
    {
      name: 'change',
      payload: { kind: 'node-selection', nodeId: 'a', selected: true },
      held: false,
    },
  ])
  await page.locator('#vanilla-native-proof').dispatchEvent('proof-cleanup')
})

for (const actor of ['connection', 'selection', 'node'] as const) {
  test(`round three V4 frozen old ${actor} frame cannot advance B`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'
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

test('round three V4 old reset timer preserves successor click suppression', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
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

test('round three V3 matching loss cancels only its original capture owner', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
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
  test(`round four node continuation ${route}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (routeInput) => {
      const path = '/e2e/node-reentry-harness.ts'

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

const acquisitionBaseScopes = [
  { label: 'host', state: 'open', parent: null, linked: false },
  { label: 'renderer', state: 'open', parent: 'host', linked: true },
  { label: 'browser', state: 'open', parent: 'host', linked: true },
  { label: 'a-renderer', state: 'open', parent: 'renderer', linked: true },
  { label: 'a-browser', state: 'open', parent: 'browser', linked: true },
  { label: 'b-renderer', state: 'open', parent: 'renderer', linked: true },
  { label: 'b-browser', state: 'open', parent: 'browser', linked: true },
  { label: 'c-renderer', state: 'open', parent: 'renderer', linked: true },
  { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
  { label: 'edge-renderer', state: 'open', parent: 'renderer', linked: true },
]

for (const mode of [
  'cancel-registering',
  'scheduled-sample',
  'executing-sample',
  'early',
  'destroy-registering',
  'request-throw',
  'delivery-cancel-throw',
  'gesture-cancel-throw',
] as const) {
  test(`round four Q-A acquisition ${mode}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (modeInput) => {
      const path = '/e2e/node-reentry-harness.ts'

      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourAcquisition(modeInput)
    }, mode)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('full-acquisition-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })

    // eslint-disable-next-line unicorn/consistent-function-scoping -- This local helper spells the fixed acquisition payloads.
    const node = (name: string, x: number) => ({
      name,
      payload: {
        nodeIds: ['a'],
        positions: [{ nodeId: 'a', position: { x, y: 20 } }],
      },
    })

    const pan = {
      name: 'move',
      payload: {
        kind: 'change',
        source: 'user',
        viewport: { x: -15, y: 0, zoom: 1 },
      },
    }

    // Pinned react/src/hooks/useOnViewportChange.ts:37 registers without an initial delivery.
    expect(result.events).toStrictEqual([
      node('nodeStart', 20),
      node('nodeMove', 365),
      ...(() => {
        if (mode === 'scheduled-sample') {
          return [node('nodeMove', 360), pan, node('nodeMove', 375)]
        }

        if (mode === 'executing-sample') {
          return [pan, node('nodeMove', 365)]
        }

        if (mode === 'early') {
          return [pan, node('nodeMove', 380)]
        }

        return []
      })(),
      {
        name: 'nodeStop',
        payload: {
          nodeIds: ['a'],
          positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
          outcome: 'cancelled',
          reason:
            mode === 'destroy-registering'
              ? 'host-destroyed'
              : 'pointer-cancel',
        },
      },
    ])

    const twoFrames =
      mode === 'scheduled-sample' ||
      mode === 'executing-sample' ||
      mode === 'early'

    expect(result.native).toStrictEqual(
      (() => {
        if (mode === 'request-throw') {
          return [{ op: 'request-throw', message: 'node-raf' }]
        }

        if (mode === 'delivery-cancel-throw') {
          return [
            { op: 'request', handle: 101 },
            { op: 'deliver', handle: 101, timestamp: 100 },
            { op: 'cancel-throw', handle: 101, message: 'node-cancel' },
          ]
        }

        if (mode === 'gesture-cancel-throw') {
          return [
            { op: 'request', handle: 101 },
            { op: 'cancel-throw', handle: 101, message: 'node-cancel' },
          ]
        }

        if (mode === 'cancel-registering' || mode === 'destroy-registering') {
          return [
            { op: 'request-enter', handle: 101 },
            { op: 'return-handle', handle: 101 },
            { op: 'cancel', handle: 101 },
          ]
        }

        return [
          ...(mode === 'early'
            ? [
                { op: 'request-enter', handle: 101 },
                { op: 'early-deliver', handle: 101, timestamp: 100 },
                { op: 'return-handle', handle: 101 },
              ]
            : [
                { op: 'request', handle: 101 },
                { op: 'deliver', handle: 101, timestamp: 100 },
              ]),
          { op: 'cancel', handle: 101 },
          { op: 'request', handle: 102 },
          { op: 'cancel', handle: 102 },
        ]
      })()
    )
    expect(result.captures).toStrictEqual([
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
    ])
    expect(result.afterReplay).toStrictEqual(result.beforeReplay)
    expect(result.pixels).toStrictEqual({
      a: 'translate(20px, 20px)',
      b: 'translate(220px, 20px)',
      dragging: false,
      viewport: 'translate(0px, 0px) scale(1)',
    })
    expect(result.pending).toStrictEqual([])
    expect(result.connected).toBe(false)

    const retiredFrames = [
      { label: 'frame-1', state: 'closed', parent: 'browser', linked: false },
      ...(twoFrames
        ? [
            {
              label: 'frame-2',
              state: 'closed',
              parent: 'browser',
              linked: false,
            },
          ]
        : []),
    ]

    const initialSnapshot = {
      document: {
        nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
        edges: [terminalOldEdge],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const openFrame = {
      label: 'frame-1',
      state: 'open',
      parent: 'browser',
      linked: true,
    }

    const closedFrame = { ...openFrame, state: 'closed', linked: false }

    const nextFrame = {
      label: 'frame-2',
      state: 'open',
      parent: 'browser',
      linked: true,
    }

    const closedBase = acquisitionBaseScopes.map((scope) => ({
      ...scope,
      state: 'closed',
      linked: false,
    }))

    const checkpoint = (
      phase: string,
      x: number,
      viewportX: number,
      active: boolean,
      pending: number[],
      frames: typeof retiredFrames,
      closed = false
    ) => ({
      phase,
      scopes: [...(closed ? closedBase : acquisitionBaseScopes), ...frames],
      a: `translate(${x}px, 20px)`,
      dragging: active,
      viewport: `translate(${viewportX}px, 0px) scale(1)`,
      held: active ? 1 : 0,
      pending,
      state: initialSnapshot,
      accepted: initialSnapshot,
      publications: [],
      captures: [
        { action: 'set', target: 'a', id: 7 },
        ...(active ? [] : [{ action: 'release', target: 'a', id: 7 }]),
      ],
    })

    const settled = (phase: string) =>
      checkpoint(
        phase,
        20,
        0,
        false,
        [],
        retiredFrames,
        mode === 'destroy-registering' || phase === 'destroyed'
      )

    const beforeAfter = {
      'cancel-registering': [
        settled('before-delivery'),
        settled('after-delivery'),
      ],
      'destroy-registering': [
        settled('before-delivery'),
        settled('after-delivery'),
      ],
      'scheduled-sample': [
        checkpoint('before-delivery', 360, 0, true, [101], [openFrame]),
        checkpoint(
          'after-delivery',
          375,
          -15,
          true,
          [102],
          [closedFrame, nextFrame]
        ),
      ],
      'executing-sample': [
        checkpoint('before-delivery', 365, 0, true, [101], [openFrame]),
        checkpoint(
          'after-delivery',
          365,
          -15,
          true,
          [102],
          [closedFrame, nextFrame]
        ),
      ],
      early: [
        checkpoint(
          'before-delivery',
          380,
          -15,
          true,
          [102],
          [closedFrame, nextFrame]
        ),
        checkpoint(
          'after-delivery',
          380,
          -15,
          true,
          [102],
          [closedFrame, nextFrame]
        ),
      ],
      'request-throw': [
        checkpoint('before-delivery', 365, 0, true, [], [closedFrame]),
        checkpoint('after-delivery', 365, 0, true, [], [closedFrame]),
      ],
      'delivery-cancel-throw': [
        checkpoint('before-delivery', 365, 0, true, [101], [openFrame]),
        checkpoint('after-delivery', 365, 0, true, [], [closedFrame]),
      ],
      'gesture-cancel-throw': [
        checkpoint('before-delivery', 365, 0, true, [101], [openFrame]),
        checkpoint('after-delivery', 365, 0, true, [101], [openFrame]),
      ],
    }

    expect(result.checkpoints).toStrictEqual([
      ...(mode === 'cancel-registering' ||
      mode === 'destroy-registering' ||
      mode === 'early'
        ? [
            checkpoint('registering', 365, 0, true, [101], [openFrame]),
            mode === 'early'
              ? checkpoint(
                  'before-handle-return',
                  365,
                  0,
                  true,
                  [101],
                  [openFrame]
                )
              : checkpoint(
                  'before-handle-return',
                  20,
                  0,
                  false,
                  [101],
                  [closedFrame],
                  mode === 'destroy-registering'
                ),
          ]
        : []),
      ...beforeAfter[mode],
      settled('cancelled'),
      settled('destroyed'),
    ])
    expect(result.state).toStrictEqual(initialSnapshot)

    expect(result.beforeReplay.scopes).toStrictEqual([
      ...(mode === 'destroy-registering'
        ? acquisitionBaseScopes.map((scope) => ({
            ...scope,
            state: 'closed',
            linked: false,
          }))
        : acquisitionBaseScopes),
      ...retiredFrames,
    ])
    expect(result.checkpoints.at(-1)?.scopes).toStrictEqual([
      ...acquisitionBaseScopes.map((scope) => ({
        ...scope,
        state: 'closed',
        linked: false,
      })),
      ...retiredFrames,
    ])
    expect(result.errors).toStrictEqual(
      (() => {
        if (mode === 'request-throw') {
          return [
            {
              channel: 'native-event',
              message: 'node-raf',
              containsSentinel: true,
            },
          ]
        }

        if (mode === 'delivery-cancel-throw') {
          return [
            {
              channel: 'frame',
              message: 'node-cancel',
              containsSentinel: true,
            },
          ]
        }

        if (mode === 'gesture-cancel-throw') {
          return [
            {
              channel: 'native-event',
              message: 'node-cancel',
              containsSentinel: true,
            },
          ]
        }

        return []
      })()
    )
  })
}

const rendererNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

const rendererNodeB = {
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

const rendererNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

const rendererEdge = {
  id: 'edge',
  source: 'a',
  target: 'b',
  sourceHandle: 'out',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

const rendererColdA = {
  source: { x: 175.5, y: 42.5 },
  target: { x: -1805.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 175.5,42.5L -1805.5,42.5',
  labelAnchor: { x: -815, y: 42.5 },
}

const rendererColdB = {
  source: { x: 175.5, y: 42.5 },
  target: { x: 214.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 175.5,42.5L 214.5,42.5',
  labelAnchor: { x: 195, y: 42.5 },
}

const rendererMeasuredB = {
  source: { x: 169, y: 42.5 },
  target: { x: 221, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 169,42.5L 221,42.5',
  labelAnchor: { x: 195, y: 42.5 },
}

for (const kind of ['node', 'edge-geometry', 'edge-factory'] as const) {
  for (const action of ['replace', 'destroy', 'throw'] as const) {
    test(`round four Q-R cold ${kind} ${action}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async ({ kind: kindInput, action: actionInput }) => {
          const path = '/e2e/node-reentry-harness.ts'

          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.continuationRoundFourRenderer(kindInput, actionInput)
        },
        { kind, action }
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('full-renderer-receipt', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })

      const off = {
        nodes: [
          kind === 'node'
            ? { ...rendererNodeA, position: { x: -2000, y: 20 }, type: 'A' }
            : { ...rendererNodeA, position: { x: -2000, y: 20 } },
          { ...rendererNodeB, position: { x: -1800, y: 20 } },
          rendererNodeC,
        ],
        edges: [
          kind === 'node'
            ? { ...rendererEdge }
            : { ...rendererEdge, type: 'A' },
        ],
      }

      const replacement = {
        nodes: [
          kind === 'node'
            ? { ...rendererNodeA, type: 'B' }
            : { ...rendererNodeA },
          rendererNodeB,
          rendererNodeC,
        ],
        edges: [
          kind === 'node'
            ? { ...rendererEdge }
            : { ...rendererEdge, type: 'B' },
        ],
      }

      const zero = { x: 0, y: 0, zoom: 1 }
      const edgeA = { ...rendererEdge, type: 'A' }
      const edgeB = { ...rendererEdge, type: 'B' }

      const geometryA = {
        hook: 'geometry',
        edge: edgeA,
        endpoints: {
          source: { x: 175.5, y: 42.5 },
          target: { x: -1805.5, y: 42.5 },
          sourceSide: 'right',
          targetSide: 'left',
        },
      }

      const geometryB = {
        hook: 'geometry',
        edge: edgeB,
        endpoints: {
          source: { x: 175.5, y: 42.5 },
          target: { x: 214.5, y: 42.5 },
          sourceSide: 'right',
          targetSide: 'left',
        },
      }

      const nodeAEnter = {
        hook: 'factory-enter',
        node: { ...rendererNodeA, type: 'A' },
        container: 'N_A',
      }

      const nodeBEnter = {
        hook: 'factory-enter',
        node: { ...rendererNodeA, type: 'B' },
        container: 'N_B',
      }

      const edgeAEnter = {
        hook: 'factory-enter',
        edge: edgeA,
        context: rendererColdA,
        container: 'E_A',
      }

      const edgeBEnter = {
        hook: 'factory-enter',
        edge: edgeB,
        context: rendererColdB,
        container: 'E_B',
      }

      const aReturn = {
        hook: 'factory-return',
        instance: 'A',
        container: kind === 'node' ? 'N_A' : 'E_A',
      }

      const aDestroy = {
        hook: 'destroy',
        instance: 'A',
        container: kind === 'node' ? 'N_A' : 'E_A',
      }

      const bReturn = {
        hook: 'factory-return',
        instance: 'B',
        container: kind === 'node' ? 'N_B' : 'E_B',
      }

      const bDestroy = {
        hook: 'destroy',
        instance: 'B',
        container: kind === 'node' ? 'N_B' : 'E_B',
      }

      const geometryReturn = {
        hook: 'geometry-return',
        instance: 'A',
        value: { pathData: 'M 1,1L 2,2', labelAnchor: { x: 1.5, y: 1.5 } },
      }

      const expectedHooks = (() => {
        if (action === 'replace') {
          if (kind === 'node') {
            return [nodeAEnter, nodeBEnter, bReturn, aReturn, aDestroy]
          }

          if (kind === 'edge-geometry') {
            return [geometryA, geometryB, edgeBEnter, bReturn, geometryReturn]
          }

          return [
            geometryA,
            edgeAEnter,
            geometryB,
            edgeBEnter,
            bReturn,
            aReturn,
            aDestroy,
          ]
        }

        return [
          ...(() => {
            if (kind === 'node') {
              return [nodeAEnter]
            }

            if (kind === 'edge-geometry') {
              return [geometryA]
            }

            return [geometryA, edgeAEnter]
          })(),
          ...(() => {
            if (action === 'destroy') {
              return [
                { hook: 'destroy-host' },
                ...(kind === 'edge-geometry'
                  ? [geometryReturn]
                  : [aReturn, aDestroy]),
              ]
            }

            return []
          })(),
        ]
      })()

      expect(result.initial.hooks).toStrictEqual(expectedHooks)

      const expectedPublic =
        action === 'replace'
          ? [
              {
                name: 'acceptedState',
                payload: {
                  previous: { document: off, viewport: zero },
                  current: { document: replacement, viewport: zero },
                  cause: 'document-update',
                },
              },
              {
                name: 'change',
                payload: {
                  kind: 'node-position',
                  nodeId: 'a',
                  position: { x: 20, y: 20 },
                },
              },
            ]
          : []

      expect(result.initial.publicEvents).toStrictEqual(expectedPublic)
      expect(result.measured.publicEvents).toStrictEqual(expectedPublic)
      expect(result.final.publicEvents).toStrictEqual(expectedPublic)
      expect(result.errors).toStrictEqual(
        action === 'throw'
          ? [{ message: 'renderer-hook', sameCause: true }]
          : []
      )
      expect(result.initial.state).toStrictEqual({
        document: (() => {
          if (action === 'replace') {
            return replacement
          }

          return {
            ...off,
            nodes: [
              kind === 'node'
                ? { ...rendererNodeA, type: 'A' }
                : { ...rendererNodeA },
              { ...rendererNodeB, position: { x: -1800, y: 20 } },
              rendererNodeC,
            ],
          }
        })(),
        viewport: zero,
      })

      if (action === 'replace') {
        expect(result.initial.path).toBe('M 175.5,42.5L 214.5,42.5')
        expect(result.measured.path).toBe('M 169,42.5L 221,42.5')
        expect(result.measured.anchors).toStrictEqual([
          { endpoint: 'source', x: '169', y: '42.5' },
          { endpoint: 'target', x: '221', y: '42.5' },
        ])
        expect(result.rects).toStrictEqual([
          {
            nodeId: 'a',
            handleId: 'out',
            x: 158,
            y: 37,
            width: 11,
            height: 11,
            rectCount: 1,
          },
          {
            nodeId: 'b',
            handleId: 'out',
            x: 358,
            y: 37,
            width: 11,
            height: 11,
            rectCount: 1,
          },
          {
            nodeId: 'b',
            handleId: 'in',
            x: 221,
            y: 37,
            width: 11,
            height: 11,
            rectCount: 1,
          },
          {
            nodeId: 'c',
            handleId: 'in',
            x: 421,
            y: 37,
            width: 11,
            height: 11,
            rectCount: 1,
          },
        ])
        expect(result.refresh).toStrictEqual([
          { nodeId: 'a', status: 'requested' },
          { nodeId: 'b', status: 'requested' },
          { nodeId: 'c', status: 'requested' },
        ])
        expect(result.measured.frames).toStrictEqual([
          { op: 'request', handle: 401 },
          { op: 'deliver', handle: 401, timestamp: 100 },
        ])
        expect(result.final.frames).toStrictEqual([
          { op: 'request', handle: 401 },
          { op: 'deliver', handle: 401, timestamp: 100 },
          { op: 'cancel', handle: 401 },
        ])

        const measurementHooks =
          kind === 'node'
            ? []
            : [
                {
                  hook: 'geometry',
                  edge: edgeB,
                  endpoints: {
                    source: { x: 169, y: 42.5 },
                    target: { x: 221, y: 42.5 },
                    sourceSide: 'right',
                    targetSide: 'left',
                  },
                },
                {
                  hook: 'update',
                  edge: edgeB,
                  context: rendererMeasuredB,
                  instance: 'B',
                  container: 'E_B',
                },
              ]

        expect(result.measured.hooks).toStrictEqual([
          ...expectedHooks,
          ...measurementHooks,
        ])
        expect(result.final.hooks).toStrictEqual([
          ...expectedHooks,
          ...measurementHooks,
          bDestroy,
        ])
        expect(result.measured.internals).toStrictEqual([
          {
            node: replacement.nodes[0],
            absolutePosition: { x: 20, y: 20 },
            width: 150,
            height: 45,
            measurementStatus: 'measured',
            handles: [
              {
                nodeId: 'a',
                handleId: 'out',
                offset: { x: 143.5, y: 22.5 },
                width: 11,
                height: 11,
              },
            ],
          },
          {
            node: rendererNodeB,
            absolutePosition: { x: 220, y: 20 },
            width: 150,
            height: 45,
            measurementStatus: 'measured',
            handles: [
              {
                nodeId: 'b',
                handleId: 'out',
                offset: { x: 143.5, y: 22.5 },
                width: 11,
                height: 11,
              },
              {
                nodeId: 'b',
                handleId: 'in',
                offset: { x: 6.5, y: 22.5 },
                width: 11,
                height: 11,
              },
            ],
          },
          {
            node: rendererNodeC,
            absolutePosition: { x: 420, y: 20 },
            width: 150,
            height: 45,
            measurementStatus: 'measured',
            handles: [
              {
                nodeId: 'c',
                handleId: 'in',
                offset: { x: 6.5, y: 22.5 },
                width: 11,
                height: 11,
              },
            ],
          },
        ])
      } else {
        expect(result.final.hooks).toStrictEqual(expectedHooks)
        expect(result.final.frames).toStrictEqual([])
      }

      const parents = [
        { label: 'host', state: 'open', parent: null, linked: false },
        { label: 'renderer', state: 'open', parent: 'host', linked: true },
        { label: 'browser', state: 'open', parent: 'host', linked: true },
      ]

      const cScopes = [
        {
          label: 'c-renderer',
          state: 'open',
          parent: 'renderer',
          linked: true,
        },
        { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
      ]

      let expectedScopes = [...parents, ...cScopes]

      if (kind === 'node') {
        expectedScopes.push(
          {
            label: 'A-renderer',
            state: 'closed',
            parent: 'renderer',
            linked: false,
          },
          {
            label: 'A-browser',
            state: 'closed',
            parent: 'browser',
            linked: false,
          }
        )

        if (action === 'replace') {
          expectedScopes.push(
            {
              label: 'B-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
            {
              label: 'B-browser',
              state: 'open',
              parent: 'browser',
              linked: true,
            },
            {
              label: 'b-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
            {
              label: 'b-browser',
              state: 'open',
              parent: 'browser',
              linked: true,
            },
            {
              label: 'edge-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            }
          )
        }
      } else {
        expectedScopes.push(
          {
            label: 'a-renderer',
            state: 'open',
            parent: 'renderer',
            linked: true,
          },
          {
            label: 'a-browser',
            state: 'open',
            parent: 'browser',
            linked: true,
          },
          {
            label: 'b-renderer',
            state: 'open',
            parent: 'renderer',
            linked: true,
          },
          {
            label: 'b-browser',
            state: 'open',
            parent: 'browser',
            linked: true,
          },
          {
            label: 'A-edge',
            state: 'closed',
            parent: 'renderer',
            linked: false,
          }
        )

        if (action === 'replace') {
          expectedScopes.push({
            label: 'B-edge',
            state: 'open',
            parent: 'renderer',
            linked: true,
          })
        }
      }

      if (action === 'destroy') {
        expectedScopes = expectedScopes.map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        }))
      }

      if (action === 'destroy') {
        const pixels = {
          node: [
            {
              name: 'N_A',
              connected: false,
              transform: 'translate(20px, 20px)',
              path: null,
              anchors: [],
            },
          ],
          'edge-factory': [
            {
              name: 'E_A',
              connected: false,
              transform: null,
              path: null,
              anchors: [
                { endpoint: 'source', x: null, y: null },
                { endpoint: 'target', x: null, y: null },
              ],
            },
          ],
          'edge-geometry': [],
        }[kind]

        expect(result.shutdownCheckpoints).toStrictEqual([
          {
            phase: 'before-destroy',
            scopes: expectedScopes.map((scope) => ({
              ...scope,
              state: 'open',
              linked: scope.parent !== null,
            })),
            retained: pixels,
          },
          { phase: 'after-destroy', scopes: expectedScopes, retained: pixels },
          ...(kind === 'edge-geometry'
            ? []
            : [
                {
                  phase: 'factory-return',
                  scopes: expectedScopes,
                  retained: pixels,
                },
              ]),
        ])
        expect(result.initial.retained).toStrictEqual(pixels)
        expect(result.measured.retained).toStrictEqual(pixels)
        expect(result.final.retained).toStrictEqual(pixels)
      }

      expect(result.initial.scopes).toStrictEqual(expectedScopes)
      expect(result.final.scopes).toStrictEqual(
        expectedScopes.map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        }))
      )

      if (action === 'replace') {
        expect(result.measured.toolbars).toStrictEqual({
          nodes: [
            { id: 'a', position: { x: 95, y: 20 } },
            { id: 'b', position: { x: 295, y: 20 } },
            { id: 'c', position: { x: 495, y: 20 } },
          ],
          edges: [{ id: 'edge', position: { x: 195, y: 42.5 } }],
        })
        expect(result.measured.minimap).toStrictEqual([
          {
            nodeId: 'a',
            x: '6',
            y: '53.127272727272725',
            width: '45.81818181818182',
            height: '13.745454545454546',
          },
          {
            nodeId: 'b',
            x: '67.0909090909091',
            y: '53.127272727272725',
            width: '45.81818181818182',
            height: '13.745454545454546',
          },
          {
            nodeId: 'c',
            x: '128.1818181818182',
            y: '53.127272727272725',
            width: '45.81818181818182',
            height: '13.745454545454546',
          },
          {
            nodeId: null,
            x: '-0.10909090909090935',
            y: '47.018181818181816',
            width: '305.4545454545455',
            height: '183.27272727272728',
          },
        ])
      }

      expect(result.sameDestroy).toBe(true)
      expect(result.pending).toStrictEqual([])
      expect(
        result.final.scopes.every(
          (scope) => scope.state === 'closed' && !scope.linked
        )
      ).toBe(true)
      expect(
        result.final.containers.every((container) => !container.connected)
      ).toBe(true)
    })
  }
}

for (const kind of ['node', 'edge-geometry', 'edge-update'] as const) {
  for (const action of [
    'throw',
    'replace',
    'remove',
    'remove-replace',
    'queued',
    'queued-throw',
    'destroy-throw',
    'throw-cleanup',
    'factory-throw',
    'remove-throw',
    'state-listener',
  ] as const) {
    // eslint-disable-next-line complexity -- Keep full independent object histories beside each fault row.
    test(`round four Q-H Q-R ready ${kind} ${action}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async ({ kind: kindInput, action: actionInput }) => {
          const path = '/e2e/node-reentry-harness.ts'

          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.continuationRoundFourReadyRenderer(
            kindInput,
            actionInput
          )
        },
        { kind, action }
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('full-ready-renderer-receipt', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })

      const nodeA =
        kind === 'node' ? { ...rendererNodeA, type: 'A' } : { ...rendererNodeA }

      const nodeB =
        kind === 'node' ? { ...rendererNodeA, type: 'B' } : { ...rendererNodeA }

      const edgeA =
        kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'A' }

      const edgeB =
        kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'B' }

      const initial = {
        nodes: [
          nodeA,
          action === 'remove' ||
          action === 'remove-replace' ||
          action === 'remove-throw'
            ? { ...rendererNodeB, position: { x: -1800, y: 20 } }
            : { ...rendererNodeB },
          rendererNodeC,
        ],
        edges: [edgeA],
      }

      const replacement = {
        nodes: [nodeB, rendererNodeB, rendererNodeC],
        edges: [edgeB],
      }

      const outer = {
        ...initial,
        nodes: [{ ...nodeA, label: 'next' }, rendererNodeB, rendererNodeC],
      }

      const moved = {
        ...initial,
        nodes: [
          {
            ...nodeA,
            position: {
              x: action === 'remove' || action === 'remove-throw' ? -2000 : 40,
              y: 20,
            },
          },
          initial.nodes[1],
          rendererNodeC,
        ],
      }

      const zero = { x: 0, y: 0, zoom: 1 }

      const context40 = {
        source: { x: 189, y: 42.5 },
        target: { x: 221, y: 42.5 },
        sourceSide: 'right',
        targetSide: 'left',
        pathData: 'M 189,42.5L 221,42.5',
        labelAnchor: { x: 205, y: 42.5 },
      }

      const geometry40 = {
        hook: 'geometry',
        edge: edgeA,
        endpoints: {
          source: { x: 189, y: 42.5 },
          target: { x: 221, y: 42.5 },
          sourceSide: 'right',
          targetSide: 'left',
        },
      }

      const geometry20 = {
        hook: 'geometry',
        edge: edgeB,
        endpoints: {
          source: { x: 169, y: 42.5 },
          target: { x: 221, y: 42.5 },
          sourceSide: 'right',
          targetSide: 'left',
        },
      }

      expect(result.before.scopes).toStrictEqual(acquisitionBaseScopes)
      expect(result.before.frames).toStrictEqual([
        { op: 'request', handle: 501 },
        { op: 'deliver', handle: 501, timestamp: 100 },
      ])

      const offscreenTarget =
        action === 'remove' ||
        action === 'remove-replace' ||
        action === 'remove-throw'

      const initialCold = offscreenTarget ? rendererColdA : rendererColdB

      const initialMeasured = offscreenTarget
        ? {
            ...rendererMeasuredB,
            target: { x: -1799, y: 42.5 },
            pathData: 'M 169,42.5L -1799,42.5',
            labelAnchor: { x: -815, y: 42.5 },
          }
        : rendererMeasuredB

      expect(result.before.hooks).toStrictEqual(
        kind === 'node'
          ? [
              { hook: 'factory', node: nodeA, instance: 'A' },
              { hook: 'update', node: nodeA, instance: 'A' },
              { hook: 'update-return', instance: 'A' },
            ]
          : [
              {
                hook: 'geometry',
                edge: edgeA,
                endpoints: {
                  source: initialCold.source,
                  target: initialCold.target,
                  sourceSide: 'right',
                  targetSide: 'left',
                },
              },
              {
                hook: 'factory',
                edge: edgeA,
                context: initialCold,
                instance: 'A',
              },
              {
                hook: 'geometry',
                edge: edgeA,
                endpoints: {
                  source: initialCold.source,
                  target: initialCold.target,
                  sourceSide: 'right',
                  targetSide: 'left',
                },
              },
              {
                hook: 'update',
                edge: edgeA,
                context: initialCold,
                instance: 'A',
              },
              { hook: 'update-return', instance: 'A' },
              {
                hook: 'geometry',
                edge: edgeA,
                endpoints: {
                  source: initialMeasured.source,
                  target: initialMeasured.target,
                  sourceSide: 'right',
                  targetSide: 'left',
                },
              },
              {
                hook: 'update',
                edge: edgeA,
                context: initialMeasured,
                instance: 'A',
              },
              { hook: 'update-return', instance: 'A' },
            ]
      )

      const factoryB =
        kind === 'node'
          ? [{ hook: 'factory', node: nodeB, instance: 'B' }]
          : [
              geometry20,
              {
                hook: 'factory',
                edge: edgeB,
                context: rendererMeasuredB,
                instance: 'B',
              },
            ]

      if (action === 'replace') {
        const expectedHooks =
          kind === 'node'
            ? [
                {
                  hook: 'update',
                  node: { ...nodeA, position: { x: 40, y: 20 } },
                  instance: 'A',
                },
                { hook: 'destroy', instance: 'A' },
                ...factoryB,
                { hook: 'update-return', instance: 'A' },
              ]
            : [
                geometry40,
                ...(kind === 'edge-update'
                  ? [
                      {
                        hook: 'update',
                        edge: edgeA,
                        context: context40,
                        instance: 'A',
                      },
                    ]
                  : []),
                { hook: 'destroy', instance: 'A' },
                ...factoryB,
                ...(kind === 'edge-update'
                  ? [{ hook: 'update-return', instance: 'A' }]
                  : []),
              ]

        const refreshHooks =
          kind === 'node'
            ? []
            : [
                geometry20,
                {
                  hook: 'update',
                  edge: edgeB,
                  context: rendererMeasuredB,
                  instance: 'B',
                },
                { hook: 'update-return', instance: 'B' },
              ]

        expect(result.after.hooks).toStrictEqual(expectedHooks)
        expect(result.measured.hooks).toStrictEqual([
          ...expectedHooks,
          ...refreshHooks,
        ])
        expect(result.final.hooks).toStrictEqual([
          ...expectedHooks,
          ...refreshHooks,
          { hook: 'destroy', instance: 'B' },
        ])
        expect(result.after.path).toBe(
          kind === 'node' ? 'M 175.5,42.5L 221,42.5' : 'M 169,42.5L 221,42.5'
        )
        expect(result.measured.path).toBe('M 169,42.5L 221,42.5')
        expect(result.measured.a).toBe('translate(20px, 20px)')
      } else if (action === 'queued' || action === 'queued-throw') {
        const updateA =
          kind === 'node'
            ? [
                {
                  hook: 'update',
                  node: { ...nodeA, label: 'next' },
                  instance: 'A',
                },
                { hook: 'update-return', instance: 'A' },
              ]
            : [
                {
                  hook: 'geometry',
                  edge: edgeA,
                  endpoints: {
                    source: { x: 169, y: 42.5 },
                    target: { x: 221, y: 42.5 },
                    sourceSide: 'right',
                    targetSide: 'left',
                  },
                },
                {
                  hook: 'update',
                  edge: edgeA,
                  context: rendererMeasuredB,
                  instance: 'A',
                },
                { hook: 'update-return', instance: 'A' },
              ]

        const expectedHooks = [
          ...updateA,
          { hook: 'destroy', instance: 'A' },
          ...factoryB,
        ]

        expect(result.after.hooks).toStrictEqual(expectedHooks)
        expect(result.final.hooks).toStrictEqual([
          ...expectedHooks,
          ...(action === 'queued' ? [{ hook: 'destroy', instance: 'B' }] : []),
        ])
      } else if (action === 'remove' || action === 'destroy-throw') {
        expect(result.after.hooks).toStrictEqual([
          { hook: 'destroy', instance: 'A' },
        ])
        expect(result.final.hooks).toStrictEqual([
          { hook: 'destroy', instance: 'A' },
        ])
      } else if (action === 'remove-replace') {
        const replacementHooks =
          kind === 'node'
            ? factoryB
            : [
                {
                  hook: 'geometry',
                  edge: edgeB,
                  endpoints: {
                    source: { x: 175.5, y: 42.5 },
                    target: { x: 214.5, y: 42.5 },
                    sourceSide: 'right',
                    targetSide: 'left',
                  },
                },
                {
                  hook: 'factory',
                  edge: edgeB,
                  context: rendererColdB,
                  instance: 'B',
                },
              ]

        expect(result.after.hooks).toStrictEqual([
          { hook: 'destroy', instance: 'A' },
          ...replacementHooks,
        ])
        expect(result.final.hooks).toStrictEqual([
          { hook: 'destroy', instance: 'A' },
          ...replacementHooks,
          { hook: 'destroy', instance: 'B' },
        ])
      }

      if (action === 'destroy-throw') {
        const phases = acquisitionBaseScopes.map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        }))

        if (kind !== 'node') {
          for (const index of [3, 5, 7]) {
            const scope = phases[index]

            if (scope !== undefined) {
              scope.state = 'open'
            }
          }
        }

        expect(result.destroyPhases).toStrictEqual([
          { instance: 'A', scopes: phases, rootChildren: 1 },
        ])
        expect(result.logs).toStrictEqual([
          {
            message: 'Failed to fully clean up flow host',
            attributes: {
              'flow.document.issue': 'Error: renderer-cleanup',
              'flow.node.count': 1,
            },
            span: 'flow.host.destroy',
          },
        ])
      }

      if (action === 'factory-throw' || action === 'remove-throw') {
        expect(result.after.events).toStrictEqual([])
        expect(result.final.events).toStrictEqual([])
        expect(result.after.state).toStrictEqual({
          document: action === 'factory-throw' ? replacement : moved,
          viewport: zero,
        })

        const factory =
          kind === 'node'
            ? [{ hook: 'factory', node: nodeB, instance: 'B' }]
            : [
                {
                  hook: 'geometry',
                  edge: edgeB,
                  endpoints: {
                    source: { x: 169, y: 42.5 },
                    target: { x: 221, y: 42.5 },
                    sourceSide: 'right',
                    targetSide: 'left',
                  },
                },
                {
                  hook: 'factory',
                  edge: edgeB,
                  context: rendererMeasuredB,
                  instance: 'B',
                },
              ]

        const hooks = [
          { hook: 'destroy', instance: 'A' },
          ...(action === 'factory-throw' ? factory : []),
        ]

        expect(result.after.hooks).toStrictEqual(hooks)
        expect(result.final.hooks).toStrictEqual(hooks)
        expect(result.errors).toStrictEqual([
          {
            same: action === 'factory-throw',
            cause: false,
            message:
              action === 'factory-throw'
                ? 'renderer-primary'
                : 'renderer-cleanup',
            aggregate: false,
          },
        ])
      } else if (action === 'state-listener') {
        const payload = {
          previous: { document: initial, viewport: zero },
          current: { document: replacement, viewport: zero },
          cause: 'document-update',
        }

        expect(result.after.events).toStrictEqual([
          { name: 'firstSubscriber', payload },
          { name: 'secondSubscriber', payload },
        ])
        expect(result.final.events).toStrictEqual([
          { name: 'firstSubscriber', payload },
          { name: 'secondSubscriber', payload },
        ])
        expect(result.after.state).toStrictEqual({
          document: replacement,
          viewport: zero,
        })
        expect(result.errors).toStrictEqual([])
      } else if (action === 'throw' || action === 'throw-cleanup') {
        const hooks = (() => {
          if (kind === 'node') {
            return [
              {
                hook: 'update',
                node: { ...nodeA, position: { x: 40, y: 20 } },
                instance: 'A',
              },
              { hook: 'destroy', instance: 'A' },
            ]
          }

          return [
            geometry40,
            ...(kind === 'edge-update'
              ? [
                  {
                    hook: 'update',
                    edge: edgeA,
                    context: context40,
                    instance: 'A',
                  },
                ]
              : []),
            { hook: 'destroy', instance: 'A' },
          ]
        })()

        expect(result.after.hooks).toStrictEqual(hooks)
        expect(result.final.hooks).toStrictEqual(hooks)
        expect(result.after.events).toStrictEqual([])
        expect(result.final.events).toStrictEqual([])
        expect(result.after.state).toStrictEqual({
          document: moved,
          viewport: zero,
        })
        expect(result.after.containers).toStrictEqual([
          {
            instance: 'A',
            connected: false,
            transform: kind === 'node' ? 'translate(20px, 20px)' : null,
            path: kind === 'node' ? null : 'M 169,42.5L 221,42.5',
          },
        ])
        expect(result.errors).toStrictEqual(
          (() => {
            if (action === 'throw') {
              return [
                {
                  same: true,
                  cause: false,
                  message: 'renderer-primary',
                  aggregate: false,
                },
              ]
            }

            return [
              {
                same: false,
                cause: true,
                message:
                  kind === 'node'
                    ? 'Node renderer and cleanup failed'
                    : 'Edge rendering and cleanup failed',
                aggregate: true,
              },
            ]
          })()
        )
      } else {
        expect(result.errors).toStrictEqual([])

        const events = (() => {
          if (action === 'destroy-throw') {
            return []
          }

          if (action === 'queued' || action === 'queued-throw') {
            return [
              {
                name: 'acceptedState',
                payload: {
                  previous: { document: initial, viewport: zero },
                  current: { document: outer, viewport: zero },
                  cause: 'document-update',
                },
              },
              ...(action === 'queued'
                ? [
                    {
                      name: 'acceptedState',
                      payload: {
                        previous: { document: outer, viewport: zero },
                        current: { document: replacement, viewport: zero },
                        cause: 'document-update',
                      },
                    },
                  ]
                : []),
            ]
          }

          if (action === 'remove') {
            return [
              {
                name: 'change',
                payload: {
                  kind: 'node-position',
                  nodeId: 'a',
                  position: { x: -2000, y: 20 },
                },
              },
              {
                name: 'acceptedState',
                payload: {
                  previous: { document: initial, viewport: zero },
                  current: { document: moved, viewport: zero },
                  cause: 'semantic-change',
                },
              },
            ]
          }

          return [
            {
              name: 'acceptedState',
              payload: {
                previous: { document: initial, viewport: zero },
                current: { document: replacement, viewport: zero },
                cause: 'document-update',
              },
            },
            {
              name: 'change',
              payload: {
                kind: 'node-position',
                nodeId: 'a',
                position: {
                  x: action === 'remove-replace' ? -2000 : 40,
                  y: 20,
                },
              },
            },
          ]
        })()

        expect(result.after.events).toStrictEqual(events)
        expect(result.final.events).toStrictEqual(events)
        expect(result.after.state).toStrictEqual({
          document: (() => {
            if (action === 'remove') {
              return moved
            }

            if (action === 'destroy-throw') {
              return initial
            }

            return replacement
          })(),
          viewport: zero,
        })
      }

      expect(result.after.frames).toStrictEqual(
        action === 'destroy-throw' ? [{ op: 'cancel', handle: 501 }] : []
      )
      expect(result.final.frames).toStrictEqual(
        action === 'replace'
          ? [
              { op: 'request', handle: 502 },
              { op: 'deliver', handle: 502, timestamp: 200 },
              { op: 'cancel', handle: 502 },
              { op: 'cancel', handle: 501 },
            ]
          : [{ op: 'cancel', handle: 501 }]
      )
      expect(result.aggregateErrors).toStrictEqual(
        action === 'throw-cleanup'
          ? [{ primary: true, secondary: true, cause: true }]
          : []
      )
      expect(result.sameDestroy).toBe(true)
      expect(result.pending).toStrictEqual([])

      const replacementScopes = (() => {
        if (
          !(
            action === 'replace' ||
            action === 'remove-replace' ||
            action === 'queued' ||
            action === 'queued-throw' ||
            action === 'factory-throw' ||
            action === 'state-listener'
          )
        ) {
          return []
        }

        if (kind === 'node') {
          return [
            {
              label: 'B-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
            {
              label: 'B-browser',
              state: 'open',
              parent: 'browser',
              linked: true,
            },
          ]
        }

        if (action === 'remove-replace') {
          return [
            {
              label: 'new-a-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
            {
              label: 'new-a-browser',
              state: 'open',
              parent: 'browser',
              linked: true,
            },
            {
              label: 'new-b-renderer',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
            {
              label: 'new-b-browser',
              state: 'open',
              parent: 'browser',
              linked: true,
            },
            {
              label: 'B-edge',
              state: 'open',
              parent: 'renderer',
              linked: true,
            },
          ]
        }

        return [
          { label: 'B-edge', state: 'open', parent: 'renderer', linked: true },
        ]
      })()

      const retiredIndexes = (() => {
        if (action === 'destroy-throw') {
          return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        }

        if (
          action === 'remove' ||
          (kind !== 'node' &&
            (action === 'remove-replace' || action === 'remove-throw'))
        ) {
          return [3, 4, 5, 6, 9]
        }

        return kind === 'node' ? [3, 4] : [9]
      })()

      expect(result.after.scopes).toStrictEqual([
        ...acquisitionBaseScopes.map((scope, index) =>
          retiredIndexes.includes(index)
            ? { ...scope, state: 'closed', linked: false }
            : scope
        ),
        ...replacementScopes.map((scope) =>
          action === 'factory-throw' || action === 'queued-throw'
            ? { ...scope, state: 'closed', linked: false }
            : scope
        ),
      ])
      expect(result.final.scopes).toStrictEqual(
        [...acquisitionBaseScopes, ...replacementScopes].map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        }))
      )
    })
  }
}

for (const kind of ['node', 'edge-geometry', 'edge-factory'] as const) {
  test(`round four Q-H initial mount ${kind}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selectedKind) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourMountError(selectedKind)
    }, kind)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    expect(result.returned).toBe(false)
    expect(result.failure).toStrictEqual({ same: true, message: 'mount-hook' })
    const edge = { ...rendererEdge, type: 'A' }

    const geometry = {
      hook: 'geometry',
      edge,
      endpoints: {
        source: { x: 175.5, y: 42.5 },
        target: { x: 214.5, y: 42.5 },
        sourceSide: 'right',
        targetSide: 'left',
      },
    }

    if (kind === 'node') {
      expect(result.hooks).toStrictEqual([
        { hook: 'factory', node: { ...rendererNodeA, type: 'A' } },
      ])
      expect(result.scopes).toStrictEqual(
        acquisitionBaseScopes
          .slice(0, 5)
          .map((scope) => ({ ...scope, state: 'closed', linked: false }))
      )
    } else {
      expect(result.hooks).toStrictEqual([
        geometry,
        ...(kind === 'edge-factory'
          ? [{ hook: 'factory', edge, context: rendererColdB }]
          : []),
      ])
      expect(result.scopes).toStrictEqual(
        acquisitionBaseScopes.map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        }))
      )
    }

    expect(result.children).toBe(0)
  })
}

for (const mode of [
  'start-throw',
  'error-handler-throw',
  'telemetry-throw',
] as const) {
  test(`round four Q-H callback channel ${mode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selectedMode) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourAcquisition(selectedMode)
    }, mode)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    // Pinned react/src/hooks/useOnViewportChange.ts:37 registers without an initial delivery.
    expect(result.events).toStrictEqual([
      {
        name: 'nodeStart',
        payload: {
          nodeIds: ['a'],
          positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
        },
      },
      ...(mode === 'telemetry-throw'
        ? []
        : [
            {
              name: 'nodeMove',
              payload: {
                nodeIds: ['a'],
                positions: [{ nodeId: 'a', position: { x: 365, y: 20 } }],
              },
            },
          ]),
      {
        name: 'nodeStop',
        payload: {
          nodeIds: ['a'],
          positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
          outcome: 'cancelled',
          reason: 'pointer-cancel',
        },
      },
    ])
    expect(result.errorCallbacks).toStrictEqual(
      mode === 'telemetry-throw' ? [] : [{ message: 'node-start', same: true }]
    )
    expect(result.errors).toStrictEqual(
      mode === 'telemetry-throw'
        ? [
            {
              channel: 'native-event',
              message: 'telemetry',
              containsSentinel: true,
            },
          ]
        : []
    )
    expect(result.logs).toStrictEqual([
      {
        message: 'Node drag start callback failed',
        attributes: {
          'flow.document.issue': 'Error: node-start',
          'flow.input.kind': 'node-drag',
        },
        span: 'flow.viewport.update',
      },
      ...(mode === 'error-handler-throw'
        ? [
            {
              message: 'Flow error callback failed',
              attributes: { 'flow.document.issue': 'onError callback threw' },
              span: 'flow.viewport.update',
            },
          ]
        : []),
    ])
    expect(result.native).toStrictEqual(
      mode === 'telemetry-throw'
        ? []
        : [
            { op: 'request', handle: 101 },
            { op: 'cancel', handle: 101 },
          ]
    )
    expect(result.captures).toStrictEqual([
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
    ])
    expect(result.pixels).toStrictEqual({
      a: 'translate(20px, 20px)',
      b: 'translate(220px, 20px)',
      dragging: false,
      viewport: 'translate(0px, 0px) scale(1)',
    })
    expect(result.state).toStrictEqual({
      document: {
        nodes: [rendererNodeA, rendererNodeB, rendererNodeC],
        edges: [rendererEdge],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    expect(result.pending).toStrictEqual([])
    expect(result.afterReplay).toStrictEqual(result.beforeReplay)
  })
}

for (const keyboard of [false, true]) {
  test(`round four resize primitive restoration keyboard ${keyboard}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (value) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourResizeRestoration(value)
    }, keyboard)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )

    const restored = {
      styles: {
        width: '177px',
        height: '61px',
        minWidth: '40px',
        maxWidth: '300px',
        minHeight: '17px',
        maxHeight: '90px',
        boxSizing: 'content-box',
        transform: 'translate(220px, 20px)',
      },
      resizing: false,
      dataResizing: undefined,
      capture: 0,
      dimensions: { width: 177, height: 61 },
    }

    expect(result.before).toStrictEqual(restored)
    expect(result.after).toStrictEqual(restored)
    expect(Object.hasOwn(result.after, 'dataResizing')).toBe(true)
    expect(result.observations).toStrictEqual([restored])
    expect(result.events).toStrictEqual([])
    expect(result.state).toStrictEqual({
      document: {
        nodes: [rendererNodeA, rendererNodeB, rendererNodeC],
        edges: [rendererEdge],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    expect(result.captures).toStrictEqual(
      keyboard
        ? []
        : [
            { action: 'set', target: 'b', id: 7 },
            { action: 'release', target: 'b', id: 7 },
          ]
    )
    expect(result.connected).toBe(false)
  })
}

const ownershipProjectionDrag = (name: string, x: number) => ({
  name,
  payload: {
    nodeIds: ['a'],
    positions: [{ nodeId: 'a', position: { x, y: 20 } }],
  },
})

for (const route of [
  'plain',
  'node-update',
  'edge-geometry',
  'edge-update',
  'offscreen-control',
  'cancel-control',
  'cancel-restore',
] as const) {
  test(`ownership round five projection ${route}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundFiveProjection(input)
    }, route)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )

    // eslint-disable-next-line complexity -- Literal selection receipts retain every projection route's ownership assertions.
    const lanes = (() => {
      const visibility = [
        'offscreen-control',
        'cancel-control',
        'cancel-restore',
      ].includes(route)

      const restored = route === 'cancel-restore'
      const offscreen = visibility && !restored
      const viewport = { x: offscreen ? -2000 : 0, y: 0, zoom: 1 }

      const movedViewport =
        visibility || route === 'plain' ? viewport : { x: 7, y: 9, zoom: 1 }

      const edge = {
        ...terminalOldEdge,
        label: 'edge-label',
        type: visibility ? undefined : 'probe',
      }

      const initial = {
        nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
        edges: [edge],
      }

      const moved = {
        ...initial,
        nodes: [
          { ...terminalNodeA, position: { x: 40, y: 20 } },
          terminalNodeB,
          terminalNodeC,
        ],
      }

      // Pinned packages/system/src/xydrag/XYDrag.ts:282 selects before drag-start and cancellation callbacks.
      const selectsOnPress = route === 'cancel-control' || restored

      // Pinned react/src/utils/changes.ts:245-257 preserves the absent flag on untouched C.
      const pressedDocument = selectsOnPress
        ? {
            nodes: [
              { ...terminalNodeA, selected: true },
              { ...terminalNodeB, selected: false },
              terminalNodeC,
            ],
            edges: [{ ...edge, selected: false }],
          }
        : initial

      const finalDocument = visibility ? pressedDocument : moved

      const selectionStates = selectsOnPress
        ? [
            {
              previous: {
                document: initial,
                viewport: { x: 0, y: 0, zoom: 1 },
              },
              current: {
                document: pressedDocument,
                viewport: { x: 0, y: 0, zoom: 1 },
              },
              cause: 'semantic-change',
            },
          ]
        : []

      const states = [
        ...selectionStates,
        ...(restored
          ? []
          : [
              {
                previous: {
                  document: pressedDocument,
                  viewport: { x: 0, y: 0, zoom: 1 },
                },
                current: { document: finalDocument, viewport: movedViewport },
                cause:
                  visibility || route === 'plain'
                    ? 'semantic-change'
                    : 'viewport-update',
              },
            ]),
      ]

      const changes = [
        ...(selectsOnPress
          ? [{ kind: 'node-selection', nodeId: 'a', selected: true }]
          : []),
        ...(visibility
          ? [{ kind: 'viewport', viewport: { x: -2000, y: 0, zoom: 1 } }]
          : [
              {
                kind: 'node-position',
                nodeId: 'a',
                position: { x: 40, y: 20 },
              },
            ]),
      ]

      const events =
        visibility && route !== 'offscreen-control'
          ? [
              ownershipProjectionDrag('nodeStart', 20),
              ownershipProjectionDrag('nodeMove', 30),
              {
                name: 'nodeStop',
                payload: {
                  nodeIds: ['a'],
                  positions: [{ nodeId: 'a', position: { x: 20, y: 20 } }],
                  outcome: 'cancelled',
                  reason: 'node-removed',
                },
              },
              ...(restored
                ? [
                    {
                      name: 'restored',
                      payload: {
                        document: pressedDocument,
                        viewport: { x: 0, y: 0, zoom: 1 },
                      },
                    },
                  ]
                : []),
            ]
          : []

      const captures =
        visibility && route !== 'offscreen-control'
          ? [
              { action: 'set', target: 'a', id: 7 },
              { action: 'release', target: 'a', id: 7 },
            ]
          : []

      const source = {
        plain: '195.5',
        'node-update': '195.5',
        'edge-geometry': '195.5',
        'edge-update': '195.5',
        'offscreen-control': '175.5',
        'cancel-control': '175.5',
        'cancel-restore': '175.5',
      }[route]

      const context = {
        source: { x: 195.5, y: 42.5 },
        target: { x: 214.5, y: 42.5 },
        sourceSide: 'right',
        targetSide: 'left',
      }

      const hooks = visibility
        ? []
        : [
            { hook: 'node-update', id: 'a', input: moved.nodes[0] },
            ...(route === 'node-update'
              ? [{ hook: 'viewport-reentry', id: route }]
              : []),
            { hook: 'edge-geometry', id: 'edge', input: edge, context },
            ...(route === 'edge-geometry'
              ? [{ hook: 'viewport-reentry', id: route }]
              : []),
            {
              hook: 'edge-update',
              id: 'edge',
              input: edge,
              context: {
                ...context,
                pathData: 'M 195.5,42.5L 214.5,42.5',
                labelAnchor: { x: 205, y: 42.5 },
              },
            },
            ...(route === 'edge-update'
              ? [{ hook: 'viewport-reentry', id: route }]
              : []),
          ]

      return {
        visibility,
        offscreen,
        movedViewport,
        finalDocument,
        events,
        states,
        changes,
        hooks,
        captures,
        source,
      }
    })()

    const {
      visibility,
      offscreen,
      movedViewport,
      finalDocument,
      events,
      states,
      changes,
      hooks,
      captures,
      source,
    } = lanes

    const expected = {
      state: { document: finalDocument, viewport: movedViewport },
      events,
      states,
      changes,
      hooks,
      captures,
      held: 0,
      nodes: offscreen
        ? []
        : [
            {
              id: 'a',
              transform: visibility
                ? 'translate(20px, 20px)'
                : 'translate(40px, 20px)',
            },
            { id: 'b', transform: 'translate(220px, 20px)' },
            { id: 'c', transform: 'translate(420px, 20px)' },
          ],
      edgeCount: offscreen ? 0 : 1,
      labelCount: offscreen ? 0 : 1,
      retained: {
        nodeConnected: !offscreen,
        edgeConnected: !offscreen,
        sameNode: !offscreen,
        sameEdge: !offscreen,
        nodeTransform: visibility
          ? 'translate(20px, 20px)'
          : 'translate(40px, 20px)',
        path: `M ${source},42.5L 214.5,42.5`,
        source: { x: source, y: '42.5' },
        target: { x: '214.5', y: '42.5' },
        label: { x: String((Number(source) + 214.5) / 2), y: '42.5' },
      },
      viewport: `translate(${movedViewport.x}px, ${movedViewport.y}px) scale(1)`,
    }

    expect(result.afterDispatch).toStrictEqual(expected)
    expect(result.afterBarrier).toStrictEqual(expected)
    expect(result.afterDestroy).toStrictEqual({
      ...expected,
      nodes: [],
      edgeCount: 0,
      labelCount: 0,
      retained: {
        ...expected.retained,
        nodeConnected: false,
        edgeConnected: false,
        sameNode: false,
        sameEdge: false,
      },
      hooks: [
        ...hooks,
        ...(visibility
          ? []
          : [
              { hook: 'edge-destroy', id: 'edge' },
              { hook: 'node-destroy', id: 'c' },
              { hook: 'node-destroy', id: 'b' },
              { hook: 'node-destroy', id: 'a' },
            ]),
      ],
    })
  })
}

for (const mode of [
  'plain-reveal',
  'listen-throw',
  'observe-throw',
  'listen-cleanup-throw',
  'observe-cleanup-throw',
] as const) {
  test(`ownership round six acquisition ${mode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundSixAcquisition(input)
    }, mode)

    await testInfo.attach('acquisition', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    const plain = mode === 'plain-reveal'
    const listen = mode.startsWith('listen')
    const secondary = mode.endsWith('cleanup-throw')

    const off = {
      document: {
        nodes: [
          { ...terminalNodeA, position: { x: -2000, y: 20 } },
          terminalNodeB,
          terminalNodeC,
        ],
        edges: [],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const revealed = {
      document: {
        nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
        edges: [],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const baseScopes = [
      { label: 'host', state: 'open', parent: null, linked: false },
      { label: 'renderer', state: 'open', parent: 'host', linked: true },
      { label: 'browser', state: 'open', parent: 'host', linked: true },
      { label: 'b-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'b-browser', state: 'open', parent: 'browser', linked: true },
      { label: 'c-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
    ]

    const aScopes = [
      { label: 'A-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'A-browser', state: 'open', parent: 'browser', linked: true },
    ]

    const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']
    const acquired = types.slice(0, listen ? 1 : 4)

    const additions = acquired.flatMap((type) => [
      { op: 'listen-attempt', type },
      { op: 'listen-added', type },
    ])

    const removals = acquired
      .toReversed()
      .map((type) => ({ op: 'listen-removed', type }))

    const returned = { op: 'renderer-return', id: 'a' }
    const retired = { op: 'renderer-destroy', id: 'a' }

    const attempted = [
      returned,
      ...additions,
      ...(listen
        ? [{ op: 'listen-attempt', type: 'pointermove' }]
        : [{ op: 'observe-attempt' }]),
      ...(plain ? [{ op: 'observe-added' }] : []),
    ]

    const publicLane = plain
      ? [
          {
            name: 'change',
            payload: {
              kind: 'node-position',
              nodeId: 'a',
              position: { x: 20, y: 20 },
            },
          },
          {
            name: 'state',
            payload: {
              previous: off,
              current: revealed,
              cause: 'semantic-change',
            },
          },
        ]
      : []

    expect(result.before).toStrictEqual({
      operations: [],
      scopes: baseScopes,
      live: [],
      connected: false,
      transform: null,
      nodes: ['b', 'c'],
      state: off,
      accepted: off,
      publications: [],
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })
    expect(result.checkpoints.map(({ phase }) => phase)).toStrictEqual([
      'factory',
      'before-pointerdown',
      'before-pointermove',
      ...(listen
        ? []
        : ['before-pointerup', 'before-pointercancel', 'before-observe']),
    ])

    for (const [index, checkpoint] of result.checkpoints.entries()) {
      const count = Math.max(0, index - 1)
      expect(checkpoint.value).toStrictEqual({
        operations:
          index === 0
            ? []
            : [
                returned,
                ...types.slice(0, count).flatMap((type) => [
                  { op: 'listen-attempt', type },
                  { op: 'listen-added', type },
                ]),
                ...(index === 5
                  ? [{ op: 'observe-attempt' }]
                  : [{ op: 'listen-attempt', type: types[count] }]),
              ],
        scopes: [...baseScopes, ...aScopes],
        live: types.slice(0, count),
        connected: false,
        transform: 'translate(20px, 20px)',
        nodes: ['b', 'c'],
        state: revealed,
        accepted: off,
        publications: [],
        events: [],
        frames: [],
        captures: [],
        held: 0,
      })
    }

    expect(result.after).toStrictEqual({
      operations: plain ? attempted : [...attempted, ...removals, retired],
      scopes: [
        ...baseScopes,
        ...aScopes.map((scope) =>
          plain ? scope : { ...scope, state: 'closed', linked: false }
        ),
      ],
      live: plain ? types : [],
      connected: plain,
      transform: 'translate(20px, 20px)',
      nodes: plain ? ['a', 'b', 'c'] : ['b', 'c'],
      state: revealed,
      accepted: plain ? revealed : off,
      publications: publicLane,
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })
    expect(result.errors).toStrictEqual(
      plain
        ? []
        : [
            {
              samePrimary: !secondary,
              causePrimary: secondary,
              primaryFirst: secondary,
              secondaryRetained: secondary,
              count: secondary ? 2 : 0,
              message: (() => {
                if (secondary) {
                  return 'Node renderer and cleanup failed'
                }

                return listen ? 'acquire-listen-throw' : 'acquire-observe-throw'
              })(),
            },
          ]
    )
    expect(result.destroyed).toStrictEqual({
      operations: [
        ...attempted,
        ...(plain ? [{ op: 'unobserve' }] : []),
        ...removals,
        retired,
        { op: 'renderer-destroy', id: 'c' },
        { op: 'renderer-destroy', id: 'b' },
      ],
      scopes: [...baseScopes, ...aScopes].map((scope) => ({
        ...scope,
        state: 'closed',
        linked: false,
      })),
      live: [],
      connected: false,
      transform: 'translate(20px, 20px)',
      nodes: [],
      state: revealed,
      accepted: plain ? revealed : off,
      publications: publicLane,
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })
    expect(result.shutdownErrors).toStrictEqual([])
    expect(result.repeated).toStrictEqual(result.destroyed)
  })
}

for (const mode of [
  'listen-replace',
  'observe-replace',
  'listen-replace-throw',
] as const) {
  test(`ownership round six native successor ${mode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundSixAcquisition(input)
    }, mode)

    await testInfo.attach('native-successor', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    const fails = mode === 'listen-replace-throw'
    const observe = mode === 'observe-replace'
    const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']

    const off = {
      document: {
        nodes: [
          { ...terminalNodeA, position: { x: -2000, y: 20 } },
          terminalNodeB,
          terminalNodeC,
        ],
        edges: [],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const replacement = {
      document: {
        nodes: [{ ...terminalNodeA, type: 'B' }, terminalNodeB, terminalNodeC],
        edges: [],
      },
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const scopes = [
      { label: 'host', state: 'open', parent: null, linked: false },
      { label: 'renderer', state: 'open', parent: 'host', linked: true },
      { label: 'browser', state: 'open', parent: 'host', linked: true },
      { label: 'b-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'b-browser', state: 'open', parent: 'browser', linked: true },
      { label: 'c-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
      {
        label: 'A-renderer',
        state: 'closed',
        parent: 'renderer',
        linked: false,
      },
      { label: 'A-browser', state: 'closed', parent: 'browser', linked: false },
      { label: 'B-renderer', state: 'open', parent: 'renderer', linked: true },
      { label: 'B-browser', state: 'open', parent: 'browser', linked: true },
    ]

    const beforeReplace = [
      { op: 'renderer-return', id: 'a' },
      ...types.slice(0, observe ? 4 : 1).flatMap((type) => [
        { op: 'listen-attempt', type },
        { op: 'listen-added', type },
      ]),
      ...(observe
        ? [{ op: 'observe-attempt' }]
        : [{ op: 'listen-attempt', type: 'pointermove' }]),
      ...types
        .slice(0, observe ? 4 : 1)
        .toReversed()
        .map((type) => ({ op: 'listen-removed', type })),
      { op: 'renderer-destroy', id: 'a' },
    ]

    const afterReplace = observe
      ? [{ op: 'observe-added' }, { op: 'unobserve' }]
      : [
          { op: 'listen-added', type: 'pointermove' },
          { op: 'listen-removed', type: 'pointermove' },
          ...types.slice(2).flatMap((type) => [
            { op: 'listen-attempt', type },
            { op: 'listen-added', type },
            { op: 'listen-removed', type },
          ]),
          { op: 'observe-attempt' },
          { op: 'observe-added' },
          { op: 'unobserve' },
        ]

    const operations = [...beforeReplace, ...(fails ? [] : afterReplace)]

    const publications = [
      {
        name: 'state',
        payload: {
          previous: off,
          current: replacement,
          cause: 'document-update',
        },
      },
      ...(fails
        ? []
        : [
            {
              name: 'change',
              payload: {
                kind: 'node-position',
                nodeId: 'a',
                position: { x: 20, y: 20 },
              },
            },
          ]),
    ]

    expect(result.after).toStrictEqual({
      operations,
      scopes,
      live: [],
      connected: false,
      transform: 'translate(20px, 20px)',
      nodes: ['a', 'b', 'c'],
      state: replacement,
      accepted: replacement,
      publications,
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })

    const successorOperations = [
      { op: 'renderer-return' },
      ...types.flatMap((type) => [
        { op: 'listen-attempt', type },
        { op: 'listen-added', type },
      ]),
      { op: 'observe-attempt' },
      { op: 'observe-added' },
    ]

    expect(result.successorAfter).toStrictEqual({
      operations: successorOperations,
      live: types,
      connected: true,
      transform: 'translate(20px, 20px)',
    })
    expect(result.successorDestroyed).toStrictEqual({
      operations: [
        ...successorOperations,
        { op: 'unobserve' },
        ...types.toReversed().map((type) => ({ op: 'listen-removed', type })),
        { op: 'renderer-destroy' },
      ],
      live: [],
      connected: false,
      transform: 'translate(20px, 20px)',
    })
    expect(result.errors).toStrictEqual(
      fails
        ? [
            {
              samePrimary: true,
              causePrimary: false,
              primaryFirst: false,
              secondaryRetained: false,
              count: 0,
              message: 'acquire-listen-throw',
            },
          ]
        : []
    )
    expect(result.shutdownErrors).toStrictEqual([])
    expect(result.destroyed).toStrictEqual({
      operations: [
        ...operations,
        { op: 'renderer-destroy', id: 'c' },
        { op: 'renderer-destroy', id: 'b' },
      ],
      scopes: scopes.map((scope) => ({
        ...scope,
        state: 'closed',
        linked: false,
      })),
      live: [],
      connected: false,
      transform: 'translate(20px, 20px)',
      nodes: [],
      state: replacement,
      accepted: replacement,
      publications,
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })
    expect(result.repeated).toStrictEqual(result.destroyed)
    expect(
      result.checkpoints.find(({ phase }) => phase === 'successor-adopted')
        ?.value
    ).toStrictEqual({
      operations: beforeReplace,
      scopes,
      live: [],
      connected: false,
      transform: 'translate(20px, 20px)',
      nodes: ['a', 'b', 'c'],
      state: replacement,
      accepted: replacement,
      publications: [
        {
          name: 'state',
          payload: {
            previous: off,
            current: replacement,
            cause: 'document-update',
          },
        },
      ],
      events: [],
      frames: [],
      captures: [],
      held: 0,
    })
  })
}

const ownershipGeometryEndpoints = (x: number) => ({
  source: { x, y: 42.5 },
  target: { x: 214.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
})

const numericExpectedDrag = (name: string, x: number) => ({
  name,
  payload: {
    nodeIds: ['a'],
    positions: [{ nodeId: 'a', position: { x, y: 20 } }],
  },
})

const numericExpectedPixels = (x: number) => ({
  node: `translate(${x}px, 20px)`,
  path: `M ${x + 155.5} 42.5 L 214.5 42.5`,
  hit: `M ${x + 155.5} 42.5 L 214.5 42.5`,
  visual: `M ${x + 155.5} 42.5 L 214.5 42.5`,
  source: { x: String(x + 155.5), y: '42.5' },
  target: { x: '214.5', y: '42.5' },
  label: { x: String(x + 165.5), y: '99' },
})

for (const route of [
  'settled-geometry',
  'settled-visual',
  'inflight-visual',
] as const) {
  test(`ownership round seven custom geometry ${route}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundSevenGeometry(input)
    }, route)

    await testInfo.attach('custom-geometry', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
    const visual = route !== 'settled-geometry'
    const moving = route === 'inflight-visual'
    const edge = { ...terminalOldEdge, type: 'probe', label: 'edge-label' }

    const initial = {
      nodes: [terminalNodeA, terminalNodeB, terminalNodeC],
      edges: [edge],
    }

    const moved = {
      ...initial,
      nodes: [
        { ...terminalNodeA, position: { x: 40, y: 20 } },
        terminalNodeB,
        terminalNodeC,
      ],
    }

    const zero = { x: 0, y: 0, zoom: 1 }
    const seven = { x: 7, y: 9, zoom: 1 }

    const geometryHook = (x: number) => ({
      hook: 'geometry',
      edge,
      context: ownershipGeometryEndpoints(x),
    })

    const renderHook = (
      hook: string,
      x: number,
      pathData: string,
      labelAnchor: { x: number; y: number }
    ) => ({
      hook,
      edge,
      context: { ...ownershipGeometryEndpoints(x), pathData, labelAnchor },
    })

    const scopes = acquisitionBaseScopes

    const retained = {
      node: true,
      edge: true,
      path: true,
      hit: true,
      label: true,
      custom: true,
      source: true,
      target: true,
    }

    const initialPixels = {
      path: 'M 1 2 L 3 4',
      hit: 'M 1 2 L 3 4',
      custom: visual ? 'M 1 2 L 3 4' : null,
      display: visual ? 'none' : null,
      source: { x: '175.5', y: '42.5' },
      target: { x: '214.5', y: '42.5' },
      label: { x: '11', y: '13', left: '11px', top: '13px' },
      node: 'translate(20px, 20px)',
      viewport: 'translate(0px, 0px) scale(1)',
    }

    const base = {
      state: { document: initial, viewport: zero },
      hooks: [],
      publications: [],
      lifecycle: [],
      captures: [],
      held: 0,
      scopes,
      retained,
      pixels: initialPixels,
      counts: { nodes: 3, edges: 1, labels: 1 },
    }

    const statePublication = {
      name: 'state',
      payload: {
        previous: { document: initial, viewport: zero },
        current: { document: moving ? moved : initial, viewport: seven },
        cause: 'viewport-update',
      },
    }

    const hooks = moving
      ? [
          geometryHook(195.5),
          renderHook('update', 195.5, 'M 21 22 L 23 24', { x: 31, y: 33 }),
        ]
      : []

    const publications = [
      statePublication,
      ...(moving
        ? [
            {
              name: 'change',
              payload: {
                kind: 'node-position',
                nodeId: 'a',
                position: { x: 40, y: 20 },
              },
            },
          ]
        : []),
    ]

    const finalPixels = moving
      ? {
          ...initialPixels,
          viewport: 'translate(7px, 9px) scale(1)',
          path: 'M 21 22 L 23 24',
          hit: 'M 21 22 L 23 24',
          custom: 'M 21 22 L 23 24',
          source: { x: '195.5', y: '42.5' },
          label: { x: '31', y: '33', left: '31px', top: '33px' },
          node: 'translate(40px, 20px)',
        }
      : { ...initialPixels, viewport: 'translate(7px, 9px) scale(1)' }

    const after = {
      ...base,
      state: { document: moving ? moved : initial, viewport: seven },
      hooks,
      publications,
      pixels: finalPixels,
    }

    expect(result.initialHooks).toStrictEqual([
      geometryHook(175.5),
      ...(visual
        ? [renderHook('render', 175.5, 'M 1 2 L 3 4', { x: 11, y: 13 })]
        : []),
    ])
    expect(result.before).toStrictEqual(base)
    expect(result.after).toStrictEqual(after)
    expect(result.afterBarrier).toStrictEqual(after)
    expect(result.checkpoints).toStrictEqual(
      moving
        ? [
            {
              ...base,
              state: { document: moved, viewport: seven },
              hooks: [geometryHook(195.5)],
              publications: [statePublication],
              pixels: {
                ...finalPixels,
                path: 'M 195.5,42.5L 214.5,42.5',
                hit: 'M 195.5,42.5L 214.5,42.5',
                custom: 'M 1 2 L 3 4',
                label: { x: '205', y: '42.5', left: '205px', top: '42.5px' },
              },
            },
          ]
        : []
    )
    expect(result.afterDestroy).toStrictEqual({
      hooks: [...hooks, ...(visual ? [{ hook: 'destroy' }] : [])],
      scopes: scopes.map((scope) => ({
        ...scope,
        state: 'closed',
        linked: false,
      })),
      nodeConnected: false,
      edgeConnected: false,
      customConnected: false,
      publications,
      lifecycle: [],
      captures: [],
      held: 0,
    })
  })
}

for (const kind of ['geometry', 'render'] as const) {
  for (const type of ['explicit', 'defaulted'] as const) {
    test(`ownership round seven renderer currency ${kind} ${type}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (input) => {
          const path = '/e2e/node-reentry-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.ownershipRoundSevenCurrency(input.kind, input.type)
        },
        { kind, type }
      )

      await testInfo.attach('renderer-currency', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })

      const edge =
        type === 'explicit'
          ? { ...terminalOldEdge, type: 'probe', label: 'edge-label' }
          : { ...terminalOldEdge, label: 'edge-label' }

      const state = (x: number) => ({
        document: {
          nodes: [
            { ...terminalNodeA, position: { x, y: 20 } },
            terminalNodeB,
            terminalNodeC,
          ],
          edges: [edge],
        },
        viewport: { x: 0, y: 0, zoom: 1 },
      })

      const initialHooks = [
        {
          hook: 'initial-geometry',
          context: ownershipGeometryEndpoints(175.5),
        },
        {
          hook: 'original-render',
          context: {
            ...ownershipGeometryEndpoints(175.5),
            pathData: 'M 1 2 L 3 4',
            labelAnchor: { x: 11, y: 13 },
          },
        },
      ]

      const staleHooks = [
        ...initialHooks,
        { hook: 'stale-geometry', context: ownershipGeometryEndpoints(195.5) },
      ]

      const nextHooks = [
        ...staleHooks,
        {
          hook: 'current-geometry',
          context: ownershipGeometryEndpoints(215.5),
        },
        {
          hook: 'original-update',
          context: {
            ...ownershipGeometryEndpoints(215.5),
            pathData: 'M 50 60 L 70 80',
            labelAnchor: { x: 61, y: 71 },
          },
        },
      ]

      const scopes = acquisitionBaseScopes

      const publications = (previous: number, current: number) => [
        {
          name: 'change',
          payload: {
            kind: 'node-position',
            nodeId: 'a',
            position: { x: current, y: 20 },
          },
        },
        {
          name: 'state',
          payload: {
            previous: state(previous),
            current: state(current),
            cause: 'semantic-change',
          },
        },
      ]

      const base = {
        state: state(20),
        hooks: initialHooks,
        publications: [],
        scopes,
        retained: {
          edge: true,
          path: true,
          hit: true,
          visual: true,
          label: true,
        },
        pixels: {
          path: 'M 1 2 L 3 4',
          hit: 'M 1 2 L 3 4',
          visual: 'M 1 2 L 3 4',
          source: { x: '175.5', y: '42.5' },
          target: { x: '214.5', y: '42.5' },
          label: { x: '11', y: '13' },
        },
        captures: [],
        held: 0,
      }

      const after = {
        ...base,
        state: state(40),
        hooks: staleHooks,
        publications: publications(20, 40),
      }

      const allPublications = [...publications(20, 40), ...publications(40, 60)]
      expect(result.before).toStrictEqual(base)
      expect(result.after).toStrictEqual(after)
      expect(result.afterBarrier).toStrictEqual(after)
      expect(result.afterNext).toStrictEqual({
        ...base,
        state: state(60),
        hooks: nextHooks,
        publications: allPublications,
        pixels: {
          path: 'M 50 60 L 70 80',
          hit: 'M 50 60 L 70 80',
          visual: 'M 50 60 L 70 80',
          source: { x: '215.5', y: '42.5' },
          target: { x: '214.5', y: '42.5' },
          label: { x: '61', y: '71' },
        },
      })
      expect(result.afterDestroy).toStrictEqual({
        hooks: [...nextHooks, { hook: 'original-destroy' }],
        scopes: scopes.map((scope) => ({
          ...scope,
          state: 'closed',
          linked: false,
        })),
        edgeConnected: false,
        visualConnected: false,
        publications: allPublications,
      })
    })
  }
}

test('ownership round seven numeric position changes within the same production map', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.ownershipRoundSevenNumeric()
  })

  await testInfo.attach('numeric-map', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })
  const edge = { ...terminalOldEdge, type: 'probe', label: 'edge-label' }

  const state = (x: number) => ({
    document: {
      nodes: [
        { ...terminalNodeA, position: { x, y: 20 } },
        terminalNodeB,
        terminalNodeC,
      ],
      edges: [edge],
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  })

  const context = (x: number) => ({
    ...ownershipGeometryEndpoints(x),
    pathData: `M ${x} 42.5 L 214.5 42.5`,
    labelAnchor: { x: x + 10, y: 99 },
  })

  const edgeHooks = (x: number) => [
    { hook: 'geometry', context: ownershipGeometryEndpoints(x) },
    { hook: 'update', context: context(x) },
  ]

  const previewEvents = [
    numericExpectedDrag('start', 20),
    numericExpectedDrag('move', 30),
  ]

  const captures = [{ action: 'set', target: 'a', id: 7 }]

  const base = {
    state: state(20),
    hooks: [],
    events: previewEvents,
    publications: [],
    scopes: acquisitionBaseScopes,
    captures,
    held: 1,
    retained: {
      node: true,
      edge: true,
      visual: true,
      path: true,
      hit: true,
      label: true,
    },
    pixels: numericExpectedPixels(30),
    mapValue: { x: 30, y: 20 },
  }

  const nodeHook = {
    hook: 'node-update',
    id: 'a',
    input: { ...terminalNodeA, position: { x: 40, y: 20 } },
  }

  const hooks = [nodeHook, ...edgeHooks(195.5)]
  const events = [...previewEvents, numericExpectedDrag('move', 40)]

  const publications = [
    {
      name: 'change',
      payload: {
        kind: 'node-position',
        nodeId: 'a',
        position: { x: 40, y: 20 },
      },
    },
    {
      name: 'state',
      payload: {
        previous: state(20),
        current: state(40),
        cause: 'semantic-change',
      },
    },
  ]

  const after = {
    ...base,
    state: state(40),
    hooks,
    events,
    publications,
    pixels: numericExpectedPixels(40),
    mapValue: { x: 40, y: 20 },
  }

  expect(result.writes).toStrictEqual([
    {
      phase: 'initial-preview',
      sameMap: true,
      previous: undefined,
      current: { x: 30, y: 20 },
    },
    {
      phase: 'nested-preview',
      sameMap: true,
      previous: { x: 30, y: 20 },
      current: { x: 40, y: 20 },
    },
  ])
  expect(result.initialHooks).toStrictEqual([
    { hook: 'node-render', id: 'a' },
    { hook: 'node-render', id: 'b' },
    { hook: 'node-render', id: 'c' },
    { hook: 'geometry', context: ownershipGeometryEndpoints(175.5) },
    { hook: 'render', context: context(175.5) },
    ...edgeHooks(185.5),
  ])
  expect(result.before).toStrictEqual(base)
  expect(result.checkpoints).toStrictEqual([
    { ...base, state: state(40), hooks: [nodeHook] },
    { ...after, publications: [] },
  ])
  expect(result.after).toStrictEqual(after)
  expect(result.afterBarrier).toStrictEqual(after)

  const cancelledEvents = [
    ...events,
    {
      name: 'stop',
      payload: {
        ...numericExpectedDrag('stop', 40).payload,
        outcome: 'cancelled',
        reason: 'escape',
      },
    },
  ]

  const finalCaptures = [...captures, { action: 'release', target: 'a', id: 7 }]
  const cancelledHooks = [...hooks, ...edgeHooks(195.5)]
  expect(result.afterCancel).toStrictEqual({
    ...after,
    hooks: cancelledHooks,
    events: cancelledEvents,
    captures: finalCaptures,
    held: 0,
    mapValue: undefined,
  })
  expect(result.afterDestroy).toStrictEqual({
    hooks: [
      ...cancelledHooks,
      { hook: 'edge-destroy' },
      { hook: 'node-destroy', id: 'c' },
      { hook: 'node-destroy', id: 'b' },
      { hook: 'node-destroy', id: 'a' },
    ],
    scopes: acquisitionBaseScopes.map((scope) => ({
      ...scope,
      state: 'closed',
      linked: false,
    })),
    events: cancelledEvents,
    publications,
    captures: finalCaptures,
    held: 0,
    nodeConnected: false,
    edgeConnected: false,
  })
})
