import { expect } from 'vitest'

import type * as fixture from './renderer-fixture.ts'

export const terminalNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

export const terminalNodeB = {
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

export const terminalNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

export const terminalOldEdge = {
  id: 'edge',
  source: 'a',
  target: 'b',
  sourceHandle: 'out',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

export const acquisitionBaseScopes = [
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

export const rendererNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

export const rendererNodeB = {
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

export const rendererNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

export const rendererEdge = {
  id: 'edge',
  source: 'a',
  target: 'b',
  sourceHandle: 'out',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

export const rendererColdA = {
  source: { x: 175.5, y: 42.5 },
  target: { x: -1805.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 175.5,42.5L -1805.5,42.5',
  labelAnchor: { x: -815, y: 42.5 },
}

export const rendererColdB = {
  source: { x: 175.5, y: 42.5 },
  target: { x: 214.5, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 175.5,42.5L 214.5,42.5',
  labelAnchor: { x: 195, y: 42.5 },
}

export const rendererMeasuredB = {
  source: { x: 169, y: 42.5 },
  target: { x: 221, y: 42.5 },
  sourceSide: 'right',
  targetSide: 'left',
  pathData: 'M 169,42.5L 221,42.5',
  labelAnchor: { x: 195, y: 42.5 },
}

export const axisCases0: readonly {
  kind: 'node' | 'edge-geometry' | 'edge-factory'
  action: 'replace' | 'destroy' | 'throw'
}[] = [
  { kind: 'node', action: 'replace' },
  { kind: 'node', action: 'destroy' },
  { kind: 'node', action: 'throw' },
  { kind: 'edge-geometry', action: 'replace' },
  { kind: 'edge-factory', action: 'replace' },
]

export const axisCases1: readonly {
  kind: 'node' | 'edge-geometry' | 'edge-update'
  action:
    | 'throw'
    | 'replace'
    | 'remove'
    | 'remove-replace'
    | 'queued'
    | 'queued-throw'
    | 'destroy-throw'
    | 'throw-cleanup'
    | 'factory-throw'
    | 'remove-throw'
    | 'state-listener'
}[] = [
  { kind: 'node', action: 'throw' },
  { kind: 'node', action: 'replace' },
  { kind: 'node', action: 'remove' },
  { kind: 'node', action: 'remove-replace' },
  { kind: 'node', action: 'queued' },
  { kind: 'node', action: 'queued-throw' },
  { kind: 'node', action: 'destroy-throw' },
  { kind: 'node', action: 'throw-cleanup' },
  { kind: 'node', action: 'factory-throw' },
  { kind: 'node', action: 'remove-throw' },
  { kind: 'node', action: 'state-listener' },
  { kind: 'edge-geometry', action: 'throw' },
  { kind: 'edge-update', action: 'throw' },
]

export const caseRows0 = (
  [
    'cancel-registering',
    'scheduled-sample',
    'executing-sample',
    'early',
    'destroy-registering',
    'request-throw',
    'delivery-cancel-throw',
    'gesture-cancel-throw',
  ] as const
).map((mode) => ({ mode }))

export const caseRows3 = (
  ['node', 'edge-geometry', 'edge-factory'] as const
).map((kind) => ({ kind }))

export const caseRows4 = (
  ['start-throw', 'error-handler-throw', 'telemetry-throw'] as const
).map((mode) => ({ mode }))

export const caseRows5 = [false, true].map((keyboard) => ({ keyboard }))

export const caseRows6 = (
  [
    'plain-reveal',
    'listen-throw',
    'observe-throw',
    'listen-cleanup-throw',
    'observe-cleanup-throw',
  ] as const
).map((mode) => ({ mode }))

export const caseRows7 = (
  ['listen-replace', 'observe-replace', 'listen-replace-throw'] as const
).map((mode) => ({ mode }))

export const assertAcquisition0 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourAcquisition>>,
  { mode }: (typeof caseRows0)[number]
) => {
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
          mode === 'destroy-registering' ? 'host-destroyed' : 'pointer-cancel',
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
}

export const assertCold1 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourRenderer>>,
  { kind, action }: (typeof axisCases0)[number]
) => {
  const off = {
    nodes: [
      kind === 'node'
        ? { ...rendererNodeA, position: { x: -2000, y: 20 }, type: 'A' }
        : { ...rendererNodeA, position: { x: -2000, y: 20 } },
      { ...rendererNodeB, position: { x: -1800, y: 20 } },
      rendererNodeC,
    ],
    edges: [
      kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'A' },
    ],
  }

  const replacement = {
    nodes: [
      kind === 'node' ? { ...rendererNodeA, type: 'B' } : { ...rendererNodeA },
      rendererNodeB,
      rendererNodeC,
    ],
    edges: [
      kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'B' },
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
    action === 'throw' ? [{ message: 'renderer-hook', sameCause: true }] : []
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

  const assertHooks = () => {
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
  }

  assertHooks()

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

  const assertPublication = () => {
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
  }

  assertPublication()

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
}

export const assertReady2 = (
  result: Awaited<
    ReturnType<typeof fixture.continuationRoundFourReadyRenderer>
  >,
  { kind, action }: (typeof axisCases1)[number]
) => {
  const nodeA = (() =>
    kind === 'node' ? { ...rendererNodeA, type: 'A' } : { ...rendererNodeA })()

  const nodeB = (() =>
    kind === 'node' ? { ...rendererNodeA, type: 'B' } : { ...rendererNodeA })()

  const edgeA = (() =>
    kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'A' })()

  const edgeB = (() =>
    kind === 'node' ? { ...rendererEdge } : { ...rendererEdge, type: 'B' })()

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

  const assertHooks = () => {
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
  }

  assertHooks()

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

  const assertPublication = () => {
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
  }

  assertPublication()

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
}

export const assertInitialMount3 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourMountError>>,
  { kind }: (typeof caseRows3)[number]
) => {
  expect(result.returned).toBe(false)
  expect(result.failure).toStrictEqual({
    same: true,
    message: 'mount-hook',
  })
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
}

export const assertCallbackChannel4 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourAcquisition>>,
  { mode }: (typeof caseRows4)[number]
) => {
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
}

export const assertResizePrimitiveRestorationKeyboard5 = (
  result: Awaited<
    ReturnType<typeof fixture.continuationRoundFourResizeRestoration>
  >,
  { keyboard }: (typeof caseRows5)[number]
) => {
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
}

export const assertAcquisition6 = (
  result: Awaited<ReturnType<typeof fixture.ownershipRoundSixAcquisition>>,
  { mode }: (typeof caseRows6)[number]
) => {
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
    {
      label: 'b-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
    { label: 'b-browser', state: 'open', parent: 'browser', linked: true },
    {
      label: 'c-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
    { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
  ]

  const aScopes = [
    {
      label: 'A-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
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
}

export const assertNativeSuccessor7 = (
  result: Awaited<ReturnType<typeof fixture.ownershipRoundSixAcquisition>>,
  { mode }: (typeof caseRows7)[number]
) => {
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
    {
      label: 'b-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
    { label: 'b-browser', state: 'open', parent: 'browser', linked: true },
    {
      label: 'c-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
    { label: 'c-browser', state: 'open', parent: 'browser', linked: true },
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
    },
    {
      label: 'B-renderer',
      state: 'open',
      parent: 'renderer',
      linked: true,
    },
    { label: 'B-browser', state: 'open', parent: 'browser', linked: true },
  ]

  const beforeReplace = (() => [
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
  ])()

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
    result.checkpoints.find(({ phase }) => phase === 'successor-adopted')?.value
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
}
