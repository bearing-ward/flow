import { test, expect } from '@playwright/test'

import type * as NodeReentryHarness from './renderer-ownership-harness.ts'

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
  test(`projection ${route}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/renderer-ownership-harness.ts'
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

const ownershipGeometryEndpoints = (x: number) => ({
  source: { x, y: 42.5 },
  target: { x: 214.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
})

for (const route of [
  'settled-geometry',
  'settled-visual',
  'inflight-visual',
] as const) {
  test(`custom geometry ${route}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/renderer-ownership-harness.ts'
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
    test(`renderer currency ${kind} ${type}`, async ({ page }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (input) => {
          const path = '/e2e/renderer-ownership-harness.ts'
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

test('numeric position changes within the same production map', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/renderer-ownership-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.ownershipRoundSevenNumeric()
  })

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
  expect(result.after).toMatchObject({
    state: {
      document: {
        nodes: [
          { ...terminalNodeA, position: { x: 40, y: 20 } },
          terminalNodeB,
          terminalNodeC,
        ],
      },
    },
    pixels: {
      node: 'translate(40px, 20px)',
      path: 'M 195.5 42.5 L 214.5 42.5',
      hit: 'M 195.5 42.5 L 214.5 42.5',
      visual: 'M 195.5 42.5 L 214.5 42.5',
      source: { x: '195.5', y: '42.5' },
      target: { x: '214.5', y: '42.5' },
      label: { x: '205.5', y: '99' },
    },
    mapValue: { x: 40, y: 20 },
    held: 1,
  })
  expect(result.afterBarrier).toStrictEqual(result.after)
  expect(result.afterCancel).toMatchObject({ held: 0, mapValue: undefined })
  expect(result.afterCancel.events.at(-1)).toStrictEqual({
    name: 'stop',
    payload: {
      nodeIds: ['a'],
      positions: [{ nodeId: 'a', position: { x: 40, y: 20 } }],
      outcome: 'cancelled',
      reason: 'escape',
    },
  })
  expect(result.afterDestroy).toMatchObject({
    held: 0,
    nodeConnected: false,
    edgeConnected: false,
    scopes: acquisitionBaseScopes.map((scope) => ({
      ...scope,
      state: 'closed',
      linked: false,
    })),
    captures: [
      { action: 'set', target: 'a', id: 7 },
      { action: 'release', target: 'a', id: 7 },
    ],
  })
})
