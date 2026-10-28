import { expect } from 'vitest'

import type * as fixture from './viewport-fixture.ts'

export const viewportAt = (x: number, y: number, zoom = 1) => ({ x, y, zoom })

export const claimEvent = <Payload>(
  name: string,
  payload: Payload,
  held = 0
) => ({
  name,
  payload,
  held,
})

export const claimNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

export const claimNodeB = {
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

export const claimNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

export const claimOldEdge = {
  id: 'edge',
  source: 'a',
  sourceHandle: 'out',
  target: 'b',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

export const claimViewport = { x: 0, y: 0, zoom: 1 }

export const capturePair = (target: string, id: number) => [
  { action: 'set', target, id },
  { action: 'release', target, id },
]

export const continuationCallbackOracles = {
  'viewportStart:false': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
  ],
  'moveStart:false': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
  ],
  'viewportChange:false': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
  ],
  'move:false': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('move', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
  ],
  'viewportEnd:false': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('move', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(20, 30),
      status: 'accepted',
    }),
    claimEvent('viewportStart', viewportAt(20, 30)),
    claimEvent('moveStart', viewportAt(20, 30)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(20, 30),
      status: 'accepted',
    }),
  ],
  'viewportStart:true': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('update:viewport', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
  ],
  'moveStart:true': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('update:viewport', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
  ],
  'viewportChange:true': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('update:viewport', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
  ],
  'move:true': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('move', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'superseded',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('update:viewport', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
  ],
  'viewportEnd:true': [
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(20, 30)),
    claimEvent('move', viewportAt(20, 30)),
    claimEvent('update:viewport', viewportAt(20, 30)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(20, 30),
      status: 'proposed',
    }),
    claimEvent('viewportStart', viewportAt(0, 0)),
    claimEvent('moveStart', viewportAt(0, 0)),
    claimEvent('viewportChange', viewportAt(70, 90)),
    claimEvent('move', viewportAt(70, 90)),
    claimEvent('update:viewport', viewportAt(70, 90)),
    claimEvent('viewportEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(70, 90),
      status: 'proposed',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(20, 30),
      status: 'proposed',
    }),
  ],
  'pan-nested:false': [
    claimEvent('viewportStart', viewportAt(0, 0), 1),
    claimEvent('moveStart', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(0, 0), 1),
    claimEvent('move', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(7, 9), 1),
    claimEvent('move', viewportAt(7, 9), 1),
    claimEvent('viewportEnd', {
      viewport: viewportAt(7, 9),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(7, 9),
      status: 'accepted',
    }),
  ],
  'pan-nested:true': [
    claimEvent('viewportStart', viewportAt(0, 0), 1),
    claimEvent('moveStart', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(0, 0), 1),
    claimEvent('move', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(7, 9), 1),
    claimEvent('move', viewportAt(7, 9), 1),
    claimEvent('update:viewport', viewportAt(7, 9), 1),
    claimEvent('viewportEnd', {
      viewport: viewportAt(0, 0),
      status: 'accepted',
    }),
    claimEvent('moveEnd', {
      viewport: viewportAt(0, 0),
      status: 'accepted',
    }),
  ],
}

export const continuationJoinedOracles = {
  false: [
    claimEvent('viewportStart', viewportAt(0, 0), 1),
    claimEvent('moveStart', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(0, 0), 1),
    claimEvent('move', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(70, 90), 1),
    claimEvent('move', viewportAt(70, 90), 1),
    claimEvent(
      'viewportEnd',
      {
        viewport: viewportAt(70, 90),
        status: 'accepted',
      },
      1
    ),
    claimEvent(
      'moveEnd',
      {
        viewport: viewportAt(70, 90),
        status: 'accepted',
      },
      1
    ),
  ],
  true: [
    claimEvent('viewportStart', viewportAt(0, 0), 1),
    claimEvent('moveStart', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(0, 0), 1),
    claimEvent('move', viewportAt(0, 0), 1),
    claimEvent('viewportChange', viewportAt(70, 90), 1),
    claimEvent('move', viewportAt(70, 90), 1),
    claimEvent('update:viewport', viewportAt(70, 90), 1),
    claimEvent(
      'viewportEnd',
      {
        viewport: viewportAt(70, 90),
        status: 'proposed',
      },
      1
    ),
    claimEvent(
      'moveEnd',
      {
        viewport: viewportAt(70, 90),
        status: 'proposed',
      },
      1
    ),
  ],
}

export const continuationResourceOracles = {
  matching: [
    {
      name: 'viewportStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'moveStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(20, 30),
    },
    {
      name: 'move',
      payload: viewportAt(20, 30),
    },
    {
      name: 'update:viewport',
      payload: viewportAt(20, 30),
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: viewportAt(20, 30),
        status: 'proposed',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: viewportAt(20, 30),
        status: 'proposed',
      },
    },
  ],
  nonmatching: [
    {
      name: 'viewportStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'moveStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(20, 30),
    },
    {
      name: 'move',
      payload: viewportAt(20, 30),
    },
    {
      name: 'update:viewport',
      payload: viewportAt(20, 30),
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: viewportAt(3, 4),
        status: 'superseded',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: viewportAt(3, 4),
        status: 'superseded',
      },
    },
  ],
  animation: [
    {
      name: 'viewportStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'moveStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(0, 0),
    },
    {
      name: 'move',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(10, 15),
    },
    {
      name: 'move',
      payload: viewportAt(10, 15),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(20, 30),
    },
    {
      name: 'move',
      payload: viewportAt(20, 30),
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: viewportAt(20, 30),
        status: 'accepted',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: viewportAt(20, 30),
        status: 'accepted',
      },
    },
  ],
  'stale-frame': [
    {
      name: 'viewportStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'moveStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(0, 0),
    },
    {
      name: 'move',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(10, 15),
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: viewportAt(0, 0),
        status: 'superseded',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: viewportAt(0, 0),
        status: 'superseded',
      },
    },
    {
      name: 'viewportStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'moveStart',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(0, 0),
    },
    {
      name: 'move',
      payload: viewportAt(0, 0),
    },
    {
      name: 'viewportChange',
      payload: viewportAt(70, 90),
    },
    {
      name: 'move',
      payload: viewportAt(70, 90),
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: viewportAt(70, 90),
        status: 'accepted',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: viewportAt(70, 90),
        status: 'accepted',
      },
    },
  ],
}

export const axisCases0: readonly {
  phase:
    | 'viewportStart'
    | 'moveStart'
    | 'viewportChange'
    | 'move'
    | 'viewportEnd'
    | 'pan-nested'
  controlled: false | true
}[] = [
  { phase: 'viewportStart', controlled: false },
  { phase: 'viewportStart', controlled: true },
  { phase: 'moveStart', controlled: false },
  { phase: 'viewportChange', controlled: false },
  { phase: 'move', controlled: false },
  { phase: 'viewportEnd', controlled: false },
  { phase: 'pan-nested', controlled: false },
]

export const publicEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

export const axisCases1: readonly {
  route: 'wheel' | 'doubleclick' | 'editor'
  joined: false | true
  controlled: false | true
}[] = [
  { route: 'wheel', joined: false, controlled: false },
  { route: 'wheel', joined: false, controlled: true },
  { route: 'wheel', joined: true, controlled: false },
  { route: 'doubleclick', joined: false, controlled: false },
  { route: 'editor', joined: false, controlled: false },
]

export const continuationEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

export const continuationStart = [
  continuationEvent('viewportStart', { x: 0, y: 0, zoom: 1 }),
  continuationEvent('moveStart', { x: 0, y: 0, zoom: 1 }),
]

export const continuationEnd = (
  status: string,
  viewport: { x: number; y: number; zoom: number }
) => [
  continuationEvent('viewportEnd', { viewport, status }),
  continuationEvent('moveEnd', { viewport, status }),
]

export const continuationProgress = (viewport: {
  x: number
  y: number
  zoom: number
}) => [
  continuationEvent('viewportChange', viewport),
  continuationEvent('move', viewport),
]

export const caseRows1 = [false, true].map((controlled) => ({ controlled }))

export const caseRows2 = (
  ['matching', 'nonmatching', 'animation', 'stale-frame'] as const
).map((route) => ({ route }))

export const caseRows3 = ([1, 2, 65] as const).map((acknowledge) => ({
  acknowledge,
}))

export const caseRows5 = (
  [
    'editor',
    'wheel',
    'doubleclick',
    'triple',
    'partial',
    'quiet-start',
    'quiet-move',
    'historical',
    'own',
    'nonmatching',
    'mode-historical',
    'mode-nonmatching',
    'pan',
  ] as const
).map((route) => ({ route }))

export const caseRows6 = (
  [
    'cancel',
    'retained',
    'end-C',
    'end-dispose',
    'cancel-C',
    'cancel-dispose',
    'media-get',
    'media-call',
    'media-matches',
    'initial-raf',
    'late-raf',
    'late-raf-throw',
    'late-dispose',
    'reschedule',
    'dispose',
    'terminal-handled',
    'terminal-unhandled',
    'dispose-terminal-handled',
    'dispose-terminal-unhandled',
  ] as const
).map((mode) => ({ mode }))

export const caseRows7 = (
  [
    'decode-target',
    'decode-duration',
    'decode-duration-type',
    'decode-id',
  ] as const
).map((mode) => ({ mode }))

export const caseRows8 = (
  [
    'plain-pan',
    'request-during-pan',
    'plain-instant',
    'state-nested-animated',
    'nested-start',
    'nested-move',
    'nested-twice',
    'nested-throw',
    'plain-animation',
    'frame-change-throw',
    'frame-move-throw',
  ] as const
).map((route) => ({ route }))

export const caseRows9 = [false, true].map((switchMode) => ({ switchMode }))

export const assertViewportCallbackControlled0 = (
  result: Awaited<ReturnType<typeof fixture.viewportOwnershipProof>>,
  { phase, controlled }: (typeof axisCases0)[number]
) => {
  expect(result.held).toBe(0)

  const finalViewport = controlled
    ? { x: 0, y: 0, zoom: 1 }
    : { x: 70, y: 90, zoom: 1 }

  expect(result.viewport).toStrictEqual(
    phase === 'pan-nested' && !controlled
      ? { x: 7, y: 9, zoom: 1 }
      : finalViewport
  )
  expect(result.events).toStrictEqual(
    continuationCallbackOracles[`${phase}:${controlled}`]
  )

  if (phase === 'pan-nested') {
    expect(result.outerResult).toBeNull()
    expect(result.nestedResult).toBeNull()
  } else {
    expect(result.nestedResult).toStrictEqual({
      requestId: 2,
      status: controlled ? 'proposed' : 'accepted',
      viewport: { x: 70, y: 90, zoom: 1 },
    })
    const completedStatus = controlled ? 'proposed' : 'accepted'
    expect(result.outerResult).toStrictEqual({
      requestId: 1,
      status: phase === 'viewportEnd' ? completedStatus : 'superseded',
      viewport:
        phase === 'viewportEnd'
          ? { x: 20, y: 30, zoom: 1 }
          : { x: 0, y: 0, zoom: 1 },
    })
  }
}

export const assertPanJoinsRequestControlled1 = (
  result: Awaited<ReturnType<typeof fixture.viewportOwnershipProof>>,
  { controlled }: (typeof caseRows1)[number]
) => {
  expect(result.events).toStrictEqual(
    continuationJoinedOracles[`${controlled}`]
  )
  expect(result.nestedResult).toStrictEqual({
    requestId: 1,
    status: controlled ? 'proposed' : 'accepted',
    viewport: { x: 70, y: 90, zoom: 1 },
  })
  expect(result.held).toBe(0)
}

export const assertRequestResource2 = (
  result: Awaited<ReturnType<typeof fixture.viewportRequestProof>>,
  { route }: (typeof caseRows2)[number]
) => {
  expect(result.events).toStrictEqual(continuationResourceOracles[route])

  const requestDocument = {
    nodes: [claimNodeA, claimNodeB, claimNodeC],
    edges: [
      {
        id: 'edge',
        source: 'a',
        target: 'b',
        sourceHandle: 'out',
        targetHandle: 'in',
        selected: true,
        reconnectable: true,
      },
    ],
  }

  const initialState = {
    document: requestDocument,
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  if (route === 'animation') {
    expect(result.frames).toStrictEqual([
      { action: 'request', id: 101 },
      { action: 'deliver', id: 101, timestamp: 0 },
      { action: 'request', id: 102 },
      { action: 'deliver', id: 102, timestamp: 50 },
      { action: 'request', id: 103 },
      { action: 'deliver', id: 103, timestamp: 100 },
    ])
    expect(result.states).toStrictEqual([
      initialState,
      { document: requestDocument, viewport: { x: 10, y: 15, zoom: 1 } },
      { document: requestDocument, viewport: { x: 20, y: 30, zoom: 1 } },
    ])
  } else if (route === 'stale-frame') {
    expect(result.frames).toStrictEqual([
      { action: 'request', id: 101 },
      { action: 'deliver', id: 101, timestamp: 0 },
      { action: 'request', id: 102 },
      { action: 'deliver', id: 102, timestamp: 50 },
      { action: 'request', id: 103 },
      { action: 'deliver', id: 103, timestamp: 200 },
      { action: 'request', id: 104 },
      { action: 'deliver', id: 104, timestamp: 300 },
    ])
    expect(result.states).toStrictEqual([
      initialState,
      { document: requestDocument, viewport: { x: 70, y: 90, zoom: 1 } },
    ])
    expect(result.beforeReplay).toStrictEqual(result.afterReplay)
  } else {
    expect(result.frames).toStrictEqual([])
    expect(result.states).toStrictEqual([
      initialState,
      {
        document: requestDocument,
        viewport:
          route === 'matching'
            ? { x: 20, y: 30, zoom: 1 }
            : { x: 3, y: 4, zoom: 1 },
      },
    ])
  }

  expect(result.pendingFrames).toBe(0)
  expect(result.staleQuiet).toBe(true)

  if (route === 'matching') {
    expect(result.result).toStrictEqual({
      requestId: 1,
      status: 'proposed',
      viewport: { x: 20, y: 30, zoom: 1 },
    })
  } else if (route === 'nonmatching') {
    expect(result.result).toStrictEqual({
      requestId: 1,
      status: 'superseded',
      viewport: { x: 3, y: 4, zoom: 1 },
    })
  } else if (route === 'animation') {
    expect(result.result).toStrictEqual({
      requestId: 1,
      status: 'accepted',
      viewport: { x: 20, y: 30, zoom: 1 },
    })
  } else {
    expect(result.next).toStrictEqual({
      requestId: 2,
      status: 'accepted',
      viewport: { x: 70, y: 90, zoom: 1 },
    })
  }
}

export const assertAcknowledgementBound64Key3 = (
  result: Awaited<ReturnType<typeof fixture.viewportAcknowledgementProof>>,
  { acknowledge }: (typeof caseRows3)[number]
) => {
  const proposals = Array.from({ length: 65 }, (_, index) => ({
    x: index + 1,
    y: 0,
    zoom: 1,
  }))

  const history = proposals.flatMap((viewport) => [
    publicEvent('viewportStart', claimViewport),
    publicEvent('moveStart', claimViewport),
    publicEvent('viewportChange', viewport),
    publicEvent('move', viewport),
    publicEvent('update:viewport', viewport),
    publicEvent('viewportEnd', { viewport, status: 'proposed' }),
    publicEvent('moveEnd', { viewport, status: 'proposed' }),
  ])

  const viewport = { x: acknowledge, y: 0, zoom: 1 }

  const external =
    acknowledge === 1
      ? [
          publicEvent('viewportStart', claimViewport),
          publicEvent('moveStart', claimViewport),
          publicEvent('viewportChange', viewport),
          publicEvent('move', viewport),
          publicEvent('viewportEnd', { viewport, status: 'accepted' }),
          publicEvent('moveEnd', { viewport, status: 'accepted' }),
        ]
      : []

  expect(result).toStrictEqual({
    before: { events: history, viewport: claimViewport },
    events: [...history, ...external],
    results: proposals.map((value, index) => ({
      requestId: index + 1,
      status: 'proposed',
      viewport: value,
    })),
    viewport,
  })
}

export const assertOrdinaryJoinedControlled4 = (
  result: Awaited<ReturnType<typeof fixture.ordinaryViewportProof>>,
  { route, joined, controlled }: (typeof axisCases1)[number]
) => {
  const target = {
    wheel: { x: -10, y: -20, zoom: 1 },
    // Pinned d3-zoom@3.0.0 src/zoom.js:308 doubles around the pointer.
    doubleclick: { x: -100, y: -50, zoom: 2 },
    editor: { x: 7, y: 9, zoom: 1 },
  }[route]

  const status = controlled ? 'proposed' : 'accepted'

  const before = [
    publicEvent('viewportStart', claimViewport),
    publicEvent('moveStart', claimViewport),
    publicEvent('viewportChange', target),
    publicEvent('move', target),
    ...(controlled ? [publicEvent('update:viewport', target)] : []),
  ]

  const instantTail = [
    publicEvent('viewportEnd', { viewport: target, status }),
    publicEvent('moveEnd', { viewport: target, status }),
  ]

  // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 keeps the current transform after a joined write.
  const afterViewport = controlled ? claimViewport : target

  const panTail = [
    publicEvent('viewportChange', afterViewport),
    publicEvent('move', afterViewport),
    ...(controlled ? [publicEvent('update:viewport', claimViewport)] : []),
    publicEvent('viewportEnd', {
      viewport: afterViewport,
      status: 'accepted',
    }),
    publicEvent('moveEnd', {
      viewport: afterViewport,
      status: 'accepted',
    }),
  ]

  expect(result).toStrictEqual({
    afterWrite: {
      events: joined ? before : [...before, ...instantTail],
      held: joined ? 1 : 0,
      viewport: afterViewport,
    },
    events: [...before, ...(joined ? panTail : instantTail)],
    captures: joined ? capturePair('canvas', 7) : [],
    held: 0,
    viewport: afterViewport,
  })
}

export const assertViewportContinuation5 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourViewport>>,
  { route }: (typeof caseRows5)[number]
) => {
  const zero = { x: 0, y: 0, zoom: 1 }

  const firstProposal = [
    ...continuationStart,
    ...continuationProgress({ x: 10, y: 0, zoom: 1 }),
    continuationEvent('update:viewport', { x: 10, y: 0, zoom: 1 }),
    ...continuationEnd('proposed', { x: 10, y: 0, zoom: 1 }),
  ]

  const assertHooks = () => {
    if (route === 'editor' || route === 'wheel' || route === 'doubleclick') {
      const target = (() => {
        if (route === 'editor') {
          return { x: 7, y: 9, zoom: 1 }
        }

        if (route === 'wheel') {
          return { x: -10, y: -20, zoom: 1 }
        }

        // Pinned d3-zoom@3.0.0 src/zoom.js:308 doubles around the pointer.
        return { x: -100, y: -50, zoom: 2 }
      })()

      expect(result.events).toStrictEqual([
        ...continuationStart,
        ...continuationEnd('superseded', zero),
        ...continuationStart,
        ...continuationProgress(target),
        ...continuationEnd('accepted', target),
      ])
      expect(result.results).toStrictEqual({
        A: { requestId: 1, status: 'superseded', viewport: zero },
      })
      expect(result.viewport).toStrictEqual(target)
      expect(result.frames).toStrictEqual([
        { action: 'request', id: 101 },
        { action: 'cancel', id: 101 },
      ])
    } else if (route === 'triple') {
      expect(result.events).toStrictEqual([
        ...continuationStart,
        continuationEvent('viewportEnd', {
          viewport: zero,
          status: 'superseded',
        }),
        ...continuationStart,
        continuationEvent('moveEnd', {
          viewport: zero,
          status: 'superseded',
        }),
        ...continuationProgress(zero),
        ...continuationProgress({ x: 80, y: 90, zoom: 1 }),
        ...continuationEnd('accepted', { x: 80, y: 90, zoom: 1 }),
      ])
      expect(result.results).toStrictEqual({
        A: { requestId: 1, status: 'superseded', viewport: zero },
        B: { requestId: 2, status: 'superseded', viewport: zero },
        C: {
          requestId: 3,
          status: 'accepted',
          viewport: { x: 80, y: 90, zoom: 1 },
        },
      })
      expect(result.viewport).toStrictEqual({ x: 80, y: 90, zoom: 1 })
      expect(result.frames).toStrictEqual([
        { action: 'request', id: 101 },
        { action: 'cancel', id: 101 },
        { action: 'request', id: 102 },
        { action: 'deliver', id: 102, time: 0 },
        { action: 'request', id: 103 },
        { action: 'deliver', id: 103, time: 100 },
      ])
    } else if (route === 'partial' || route === 'pan') {
      // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 retains the editor's latest transform.
      const settled = { partial: { x: 7, y: 9, zoom: 1 }, pan: zero }[route]
      expect(result.events).toStrictEqual([
        ...(route === 'pan'
          ? [...continuationStart, ...continuationEnd('superseded', zero)]
          : []),
        ...continuationStart,
        ...(route === 'partial'
          ? continuationProgress({ x: 7, y: 9, zoom: 1 })
          : []),
        ...continuationProgress(settled),
        ...continuationEnd('accepted', settled),
      ])
      expect(result.results).toStrictEqual(
        route === 'pan'
          ? { A: { requestId: 1, status: 'superseded', viewport: zero } }
          : {}
      )
      expect(result.viewport).toStrictEqual(settled)
      expect(result.frames).toStrictEqual(
        route === 'pan'
          ? [
              { action: 'request', id: 101 },
              { action: 'cancel', id: 101 },
            ]
          : []
      )
    } else if (route === 'quiet-start' || route === 'quiet-move') {
      expect(result.events).toStrictEqual([
        ...continuationStart,
        ...continuationProgress({ x: 7, y: 9, zoom: 1 }),
        ...continuationEnd('accepted', { x: 7, y: 9, zoom: 1 }),
      ])
      expect(result.results).toStrictEqual({
        quiet: { requestId: 1, status: 'unchanged', viewport: zero },
      })
      expect(result.viewport).toStrictEqual({ x: 7, y: 9, zoom: 1 })
      expect(result.frames).toStrictEqual([])
    } else {
      const ack = (() => {
        if (route === 'nonmatching' || route === 'mode-nonmatching') {
          return 7
        }

        if (route === 'own') {
          return 20
        }

        return 10
      })()

      const target = { x: ack, y: 0, zoom: 1 }
      expect(result.events).toStrictEqual([
        ...firstProposal,
        ...(route.startsWith('mode-')
          ? continuationStart
          : [continuationEvent('viewportStart', zero)]),
        ...(route === 'own'
          ? [
              continuationEvent('moveStart', zero),
              ...continuationProgress({ x: 20, y: 0, zoom: 1 }),
              continuationEvent('update:viewport', { x: 20, y: 0, zoom: 1 }),
            ]
          : []),
        ...(route.startsWith('mode-')
          ? []
          : [continuationEvent('supplied', target)]),
        ...(() => {
          if (route === 'own' || route.startsWith('mode-')) {
            return continuationEnd(
              route === 'own' ? 'proposed' : 'superseded',
              target
            )
          }

          return [
            continuationEvent('viewportEnd', {
              viewport: target,
              status: 'superseded',
            }),
          ]
        })(),
      ])
      expect(result.results).toStrictEqual({
        A: {
          requestId: 1,
          status: 'proposed',
          viewport: { x: 10, y: 0, zoom: 1 },
        },
        B: {
          requestId: 2,
          status: route === 'own' ? 'proposed' : 'superseded',
          viewport: target,
        },
      })
      expect(result.viewport).toStrictEqual(target)
      expect(result.frames).toStrictEqual(
        route.startsWith('mode-')
          ? [
              { action: 'request', id: 101 },
              { action: 'cancel', id: 101 },
            ]
          : []
      )
    }
  }

  assertHooks()

  expect(result.held).toBe(0)
  expect(result.pending).toStrictEqual([])
  expect(result.captures).toStrictEqual(
    route === 'partial' || route === 'pan'
      ? [
          { action: 'set', target: 'canvas', id: 7 },
          { action: 'release', target: 'canvas', id: 7 },
        ]
      : []
  )
}

export const assertRequestError6 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourRequestError>>,
  { mode }: (typeof caseRows6)[number]
) => {
  const zero = { x: 0, y: 0, zoom: 1 }
  const disposed = continuationEnd('disposed', zero)
  const superseded = continuationEnd('superseded', zero)
  const successor = mode === 'end-C' || mode === 'cancel-C'
  const disposal = mode.startsWith('dispose')
  const late = mode.startsWith('late')

  const firstEndOnly = mode === 'end-dispose' || mode === 'terminal-unhandled'

  const error = (() => {
    if (mode.startsWith('media')) {
      return { message: 'media-B', identity: 'media' }
    }

    if (mode === 'initial-raf') {
      return { message: 'raf-B', identity: 'raf' }
    }

    if (mode === 'late-raf-throw' || mode === 'late-dispose') {
      return { message: 'late-B', identity: 'raf' }
    }

    if (
      mode === 'terminal-unhandled' ||
      mode === 'dispose-terminal-unhandled'
    ) {
      return { message: 'terminal-A', identity: 'terminal' }
    }

    return { message: 'cancel-A', identity: 'resource' }
  })()

  const beforeEvents = (() => {
    if (successor) {
      return [
        ...continuationStart,
        ...(mode === 'end-C'
          ? [superseded[0], ...continuationStart, superseded[1]]
          : [...continuationStart, ...superseded]),
        ...continuationProgress(zero),
        ...continuationProgress({ x: 80, y: 90, zoom: 1 }),
        ...continuationEnd('accepted', { x: 80, y: 90, zoom: 1 }),
      ].filter((value) => value !== undefined)
    } else if (disposal) {
      return [
        ...continuationStart,
        ...(mode === 'dispose-terminal-unhandled'
          ? [
              continuationEvent('viewportEnd', {
                viewport: zero,
                status: 'disposed',
              }),
            ]
          : disposed),
      ]
    } else if (mode === 'reschedule') {
      return [...continuationStart, ...continuationProgress(zero)]
    } else if (late) {
      return [
        ...continuationStart,
        ...superseded,
        ...continuationStart,
        ...(mode === 'late-dispose'
          ? disposed
          : [...superseded, ...continuationStart]),
      ]
    }

    return [
      ...continuationStart,
      ...(() => {
        if (mode === 'cancel-dispose') {
          return []
        }

        if (firstEndOnly) {
          return [
            continuationEvent('viewportEnd', {
              viewport: zero,
              status: 'superseded',
            }),
          ]
        }

        return superseded
      })(),
      ...(mode === 'initial-raf' ? continuationStart : []),
    ]
  })()

  expect(result.beforeDispose.events).toStrictEqual(beforeEvents)
  expect(result.events).toStrictEqual([
    ...beforeEvents,
    ...(mode === 'initial-raf' ||
    mode === 'reschedule' ||
    mode === 'late-raf' ||
    mode === 'late-raf-throw'
      ? disposed
      : []),
  ])
  expect(result.direct).toStrictEqual(
    mode === 'reschedule' ||
      mode === 'dispose' ||
      mode === 'dispose-terminal-handled' ||
      mode === 'late-raf'
      ? []
      : [error]
  )

  const resolvedA = {
    name: 'A',
    value: {
      requestId: 1,
      status: disposal ? 'disposed' : 'superseded',
      viewport: zero,
    },
  }

  expect(result.results).toStrictEqual(
    (() => {
      if (mode === 'reschedule') {
        return [{ name: 'A', value: { message: 'raf-next', identity: 'raf' } }]
      }

      return [
        resolvedA,
        ...(mode === 'late-raf'
          ? [
              {
                name: 'B',
                value: {
                  requestId: 2,
                  status: 'superseded',
                  viewport: zero,
                },
              },
            ]
          : []),
        ...(() => {
          if (successor) {
            return [
              {
                name: 'C',
                value: {
                  requestId: 3,
                  status: 'accepted',
                  viewport: { x: 80, y: 90, zoom: 1 },
                },
              },
            ]
          }

          if (mode === 'late-raf' || mode === 'late-raf-throw') {
            return [
              {
                name: 'C',
                value: {
                  requestId: 3,
                  status: 'disposed',
                  viewport: zero,
                },
              },
            ]
          }

          return []
        })(),
      ]
    })()
  )
  expect(result.beforeDispose.returnedB).toBe(mode === 'late-raf')
  expect(result.handlers).toStrictEqual(
    (() => {
      if (mode === 'dispose') {
        return [
          {
            message: 'dispose-cancel',
            identity: 'resource',
            info: 'beforeUnmount hook',
          },
        ]
      }

      if (mode === 'terminal-handled') {
        return [
          {
            message: 'terminal-A',
            identity: 'terminal',
            info: 'component event handler',
          },
        ]
      }

      if (mode === 'dispose-terminal-handled') {
        return [
          {
            message: 'terminal-A',
            identity: 'terminal',
            info: 'component event handler',
          },
          {
            message: 'dispose-cancel',
            identity: 'resource',
            info: 'beforeUnmount hook',
          },
        ]
      }

      return []
    })()
  )
  expect(result.rejections).toStrictEqual([])
  expect(result.captures).toStrictEqual([])
  expect(result.held).toBe(0)
  expect(result.pending).toStrictEqual([])
  expect(result.dom).toBe(
    successor
      ? 'translate(80px, 90px) scale(1)'
      : 'translate(0px, 0px) scale(1)'
  )
  expect(result.beforeDispose.viewport).toStrictEqual(
    successor ? { x: 80, y: 90, zoom: 1 } : zero
  )

  if (mode !== 'dispose-terminal-unhandled') {
    expect(result.connected).toBe(false)
  }

  expect(result.states).toStrictEqual(
    successor
      ? [
          {
            previous: {
              document: {
                nodes: [claimNodeA, claimNodeB, claimNodeC],
                edges: [claimOldEdge],
              },
              viewport: zero,
            },
            current: {
              document: {
                nodes: [claimNodeA, claimNodeB, claimNodeC],
                edges: [claimOldEdge],
              },
              viewport: { x: 80, y: 90, zoom: 1 },
            },
            cause: 'viewport-update',
          },
        ]
      : []
  )
  const request101 = { op: 'request', handle: 101 }
  const cancel101 = { op: 'cancel', handle: 101 }

  const throwingCancel = {
    op: 'cancel',
    handle: 101,
    deleted: mode !== 'retained',
    throws: disposal ? 'dispose-cancel' : 'cancel-A',
  }

  expect(result.native).toStrictEqual(
    (() => {
      if (successor) {
        return [
          request101,
          throwingCancel,
          { op: 'request', handle: 102 },
          { op: 'deliver', handle: 102, timestamp: 0 },
          { op: 'request', handle: 103 },
          { op: 'deliver', handle: 103, timestamp: 100 },
        ]
      }

      if (mode.startsWith('media')) {
        return [request101, cancel101]
      }

      if (mode === 'initial-raf') {
        return [
          request101,
          cancel101,
          { op: 'request-throw', message: 'raf-B' },
        ]
      }

      if (mode === 'reschedule') {
        return [
          request101,
          { op: 'deliver', handle: 101, timestamp: 0 },
          { op: 'request-throw', message: 'raf-next' },
        ]
      }

      if (late) {
        return [
          request101,
          cancel101,
          { op: 'request-enter', handle: 102 },
          ...(mode === 'late-dispose' ? [] : [{ op: 'request', handle: 103 }]),
          { op: 'return-handle', handle: 102 },
          mode === 'late-raf'
            ? { op: 'cancel', handle: 102 }
            : {
                op: 'cancel',
                handle: 102,
                deleted: true,
                throws: 'late-B',
              },
          ...(mode === 'late-dispose' ? [] : [{ op: 'cancel', handle: 103 }]),
        ]
      }

      return [
        request101,
        throwingCancel,
        ...(mode === 'retained'
          ? [
              {
                op: 'deliver-retained',
                handle: 101,
                timestamp: 100,
              },
            ]
          : []),
      ]
    })()
  )
}

export const assertDecodeOwnership7 = (
  result: Awaited<ReturnType<typeof fixture.continuationRoundFourRequestError>>,
  { mode }: (typeof caseRows7)[number]
) => {
  const zero = { x: 0, y: 0, zoom: 1 }

  const start = [
    { name: 'viewportStart', payload: zero },
    { name: 'moveStart', payload: zero },
  ]

  const terminal = (status: string) => [
    { name: 'viewportEnd', payload: { viewport: zero, status } },
    { name: 'moveEnd', payload: { viewport: zero, status } },
  ]

  if (mode === 'decode-id') {
    expect(result.beforeDispose.events).toStrictEqual([
      ...start,
      ...terminal('superseded'),
      ...start,
    ])
    expect(result.events).toStrictEqual([
      ...start,
      ...terminal('superseded'),
      ...start,
      ...terminal('disposed'),
    ])
    expect(result.results).toStrictEqual([
      {
        name: 'A',
        value: { requestId: 1, status: 'superseded', viewport: zero },
      },
      {
        name: 'B',
        value: { requestId: 2, status: 'disposed', viewport: zero },
      },
    ])
    expect(result.native).toStrictEqual([
      { op: 'request', handle: 101 },
      { op: 'cancel', handle: 101 },
      { op: 'request', handle: 102 },
      { op: 'cancel', handle: 102 },
    ])
    expect(result.direct).toStrictEqual([])
    expect(result.failedDecodes).toStrictEqual([
      {
        message: 'Viewport request x must be finite\n  at ["x"]',
        identity: 'other',
      },
      {
        message:
          'Expected a value greater than or equal to 0\n  at ["duration"]',
        identity: 'other',
      },
    ])
  } else {
    expect(result.beforeDispose.events).toStrictEqual(start)
    expect(result.beforeDispose.native).toStrictEqual([
      { op: 'request', handle: 101 },
    ])
    expect(result.beforeDispose.results).toStrictEqual([])
    expect(result.beforeDispose.pending).toStrictEqual([101])
    expect(result.beforeDispose.returnedB).toBe(false)
    expect(result.events).toStrictEqual([...start, ...terminal('disposed')])
    expect(result.results).toStrictEqual([
      {
        name: 'A',
        value: { requestId: 1, status: 'disposed', viewport: zero },
      },
    ])
    expect(result.native).toStrictEqual([
      { op: 'request', handle: 101 },
      { op: 'cancel', handle: 101 },
    ])

    const message = (() => {
      if (mode === 'decode-target') {
        return 'Viewport request x must be finite\n  at ["x"]'
      }

      if (mode === 'decode-duration') {
        return 'Expected a value greater than or equal to 0\n  at ["duration"]'
      }

      return 'Expected number | undefined\n  at ["duration"]'
    })()

    expect(result.direct).toStrictEqual([{ message, identity: 'other' }])
  }

  expect(result.states).toStrictEqual([])
  expect(result.rejections).toStrictEqual([])
  expect(result.handlers).toStrictEqual([])
  expect(result.captures).toStrictEqual([])
  expect(result.held).toBe(0)
  expect(result.pending).toStrictEqual([])
  expect(result.beforeDispose.viewport).toStrictEqual(zero)
  expect(result.beforeDispose.dom).toBe('translate(0px, 0px) scale(1)')
  expect(result.dom).toBe('translate(0px, 0px) scale(1)')
  expect(result.connected).toBe(false)
}

export const assertViewport8 = (
  result: Awaited<ReturnType<typeof fixture.ownershipRoundFiveViewport>>,
  { route }: (typeof caseRows8)[number]
) => {
  const zero = { x: 0, y: 0, zoom: 1 }
  const seven = { x: 7, y: 9, zoom: 1 }
  const outer = { x: 20, y: 30, zoom: 1 }
  const eleven = { x: 11, y: 13, zoom: 1 }
  const pan = { x: 20, y: 10, zoom: 1 }
  const animated = { x: 50, y: 60, zoom: 1 }
  const target = { x: 80, y: 90, zoom: 1 }

  const start = (viewport: typeof zero) => [
    { name: 'viewportStart', payload: viewport },
    { name: 'moveStart', payload: viewport },
  ]

  const move = (viewport: typeof zero) => [
    { name: 'viewportChange', payload: viewport },
    { name: 'move', payload: viewport },
  ]

  const end = (viewport: typeof zero, status = 'accepted') => [
    { name: 'viewportEnd', payload: { viewport, status } },
    { name: 'moveEnd', payload: { viewport, status } },
  ]

  const document = {
    nodes: [claimNodeA, claimNodeB, claimNodeC],
    edges: [claimOldEdge],
  }

  const state = (viewport: typeof zero) => ({ document, viewport })

  const change = (previous: typeof zero, current: typeof zero) => ({
    previous: state(previous),
    current: state(current),
    cause: 'viewport-update',
  })

  const expected = (() => {
    const failedFrame =
      route === 'frame-change-throw' || route === 'frame-move-throw'

    const isPan = route === 'plain-pan' || route === 'request-during-pan'

    const isAnimation =
      route === 'plain-animation' || route === 'state-nested-animated'

    const finalViewport = {
      'plain-pan': pan,
      'request-during-pan': pan,
      'plain-instant': seven,
      'state-nested-animated': target,
      'nested-start': seven,
      'nested-move': seven,
      'nested-twice': eleven,
      'nested-throw': seven,
      'plain-animation': animated,
      'frame-change-throw': zero,
      'frame-move-throw': zero,
    }[route]

    const prefix = [
      ...start(zero),
      ...(route === 'nested-move' ||
      route === 'nested-twice' ||
      route === 'nested-throw'
        ? move(outer)
        : []),
      ...move(seven),
    ]

    const workEvents = (() => {
      if (isPan) {
        return [
          ...start(zero),
          ...(route === 'request-during-pan'
            ? [...move(seven), ...end(seven), ...start(seven)]
            : []),
          ...move(pan),
          // The fixture now moves before release, as pinned packages/system/src/xypanzoom/eventhandler.ts:238 requires.
          ...move(pan),
          ...end(pan),
        ]
      }

      if (failedFrame) {
        return [
          ...start(zero),
          { name: 'viewportChange', payload: zero },
          ...(route === 'frame-move-throw'
            ? [{ name: 'move', payload: zero }]
            : []),
        ]
      }

      if (isAnimation) {
        return [
          ...start(zero),
          ...(route === 'state-nested-animated' ? move(seven) : []),
          ...move(route === 'state-nested-animated' ? seven : zero),
          ...move(finalViewport),
          ...end(finalViewport),
        ]
      }

      return [
        ...prefix,
        ...(route === 'nested-twice' ? move(eleven) : []),
        ...(route === 'nested-throw' ? [] : end(finalViewport)),
      ]
    })()

    const expectedStates = {
      'plain-pan': [change(zero, pan)],
      'request-during-pan': [change(zero, seven), change(seven, pan)],
      'plain-instant': [change(zero, seven)],
      'state-nested-animated': [change(zero, seven), change(seven, target)],
      'nested-start': [change(zero, seven)],
      'nested-move': [change(zero, seven)],
      'nested-twice': [change(zero, seven), change(seven, eleven)],
      'nested-throw': [change(zero, seven)],
      'plain-animation': [change(zero, animated)],
      'frame-change-throw': [],
      'frame-move-throw': [],
    }[route]

    const expectedFrames =
      failedFrame || isAnimation
        ? [
            { action: 'request', id: 101 },
            { action: 'deliver', id: 101, time: 0 },
            ...(isAnimation
              ? [
                  { action: 'request', id: 102 },
                  { action: 'deliver', id: 102, time: 100 },
                ]
              : []),
          ]
        : []

    const expectedResults =
      route === 'request-during-pan' || isAnimation
        ? [
            {
              requestId: 1,
              status: 'accepted',
              viewport: route === 'request-during-pan' ? seven : finalViewport,
            },
          ]
        : []

    const expectedErrors =
      failedFrame || route === 'nested-throw'
        ? [{ message: `listener-${route}`, sameSentinel: true }]
        : []

    const captures = isPan
      ? [
          { action: 'set', target: 'canvas', id: 7 },
          { action: 'release', target: 'canvas', id: 7 },
        ]
      : []

    const work = {
      events: workEvents,
      states: expectedStates,
      frames: expectedFrames,
      results: expectedResults,
      errors: expectedErrors,
      rejected: [],
      pending: [],
      captures,
      held: 0,
      state: state(finalViewport),
      transform: `translate(${finalViewport.x}px, ${finalViewport.y}px) scale(1)`,
    }

    return {
      failedFrame,
      isPan,
      prefix,
      workEvents,
      expectedResults,
      finalViewport,
      work,
    }
  })()

  expect(result.afterWork).toStrictEqual(expected.work)
  expect(result.afterDispose).toStrictEqual({
    ...expected.work,
    events: [
      ...expected.workEvents,
      ...(expected.failedFrame || route === 'nested-throw'
        ? end(expected.finalViewport, 'disposed')
        : []),
    ],
    results: expected.failedFrame
      ? [{ requestId: 1, status: 'disposed', viewport: zero }]
      : expected.expectedResults,
  })
  expect(result.connected).toBe(false)

  const checkpoints = {
    'plain-pan': [],
    'request-during-pan': [],
    'plain-instant': [],
    'state-nested-animated': [],
    'nested-start': [],
    'nested-move': [expected.prefix],
    'nested-twice': [expected.prefix, [...expected.prefix, ...move(eleven)]],
    'nested-throw': [expected.prefix],
    'plain-animation': [],
    'frame-change-throw': [],
    'frame-move-throw': [],
  }[route]

  expect(result.checkpoints).toStrictEqual(checkpoints)

  if (route === 'state-nested-animated') {
    expect(result.afterCall).toStrictEqual({
      ...expected.work,
      events: expected.prefix,
      states: [change(zero, seven)],
      frames: [{ action: 'request', id: 101 }],
      results: [],
      pending: [101],
      state: state(seven),
      transform: 'translate(7px, 9px) scale(1)',
    })
  } else if (expected.failedFrame || route === 'plain-animation') {
    expect(result.afterCall).toStrictEqual({
      ...expected.work,
      events: start(zero),
      states: [],
      frames: [{ action: 'request', id: 101 }],
      results: [],
      errors: [],
      pending: [101],
      state: state(zero),
      transform: 'translate(0px, 0px) scale(1)',
    })
  } else if (expected.isPan) {
    const requested = route === 'request-during-pan'
    expect(result.afterCall).toStrictEqual({
      ...expected.work,
      events: [
        ...start(zero),
        ...(requested ? [...move(seven), ...end(seven)] : []),
      ],
      states: requested ? [change(zero, seven)] : [],
      captures: [{ action: 'set', target: 'canvas', id: 7 }],
      held: 1,
      state: state(requested ? seven : zero),
      transform: requested
        ? 'translate(7px, 9px) scale(1)'
        : 'translate(0px, 0px) scale(1)',
    })
  } else {
    expect(result.afterCall).toStrictEqual(expected.work)
  }
}

export const assertExternalObservationNestedProducingWriteSwitchMode9 = (
  result: Awaited<ReturnType<typeof fixture.externalNestedViewportProof>>,
  { switchMode }: (typeof caseRows9)[number]
) => {
  const one = { x: 1, y: 0, zoom: 1 }
  const seven = { x: 7, y: 9, zoom: 1 }

  const prefix = [
    publicEvent('viewportStart', claimViewport),
    publicEvent('moveStart', claimViewport),
    publicEvent('viewportChange', one),
    publicEvent('move', one),
    publicEvent('viewportChange', seven),
    publicEvent('move', seven),
    publicEvent('update:viewport', seven),
  ]

  const events = (() => [
    ...prefix,
    publicEvent('viewportEnd', {
      viewport: switchMode ? one : seven,
      status: switchMode ? 'accepted' : 'proposed',
    }),
    publicEvent('moveEnd', {
      viewport: switchMode ? one : seven,
      status: switchMode ? 'accepted' : 'proposed',
    }),
  ])()

  expect(result).toStrictEqual({
    beforeDispose: {
      events,
      checkpoints: [prefix],
      state: {
        document: {
          nodes: [claimNodeA, claimNodeB, claimNodeC],
          edges: [claimOldEdge],
        },
        viewport: one,
      },
      captures: [],
      held: 0,
    },
    afterDispose: events,
  })
}
