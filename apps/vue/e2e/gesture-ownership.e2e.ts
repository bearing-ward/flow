import { test, expect } from '@playwright/test'

import { representativeCombination } from '../../shared-e2e/representative-cases.ts'
import type * as NodeReentryHarness from './gesture-ownership-harness.ts'

const claimNodeA = {
  id: 'a',
  label: 'A',
  position: { x: 20, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'out', kind: 'source', side: 'right' }],
}

const claimNodeB = {
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

const claimNodeC = {
  id: 'c',
  label: 'C',
  position: { x: 420, y: 20 },
  size: { width: 150, height: 45 },
  handles: [{ id: 'in', kind: 'target', side: 'left' }],
}

const claimOldEdge = {
  id: 'edge',
  source: 'a',
  sourceHandle: 'out',
  target: 'b',
  targetHandle: 'in',
  selected: true,
  reconnectable: true,
}

const claimViewport = { x: 0, y: 0, zoom: 1 }

const cancelledClaim = { status: 'cancelled', reason: 'superseded' }

const claimEvent = <Payload>(name: string, payload: Payload, held = 0) => ({
  name,
  payload,
  held,
})

const claimStart = (node: typeof claimNodeA) =>
  claimEvent(
    'connectStart',
    { node, handleId: 'out', activation: 'pointer' },
    1
  )

const clickStart = (node: typeof claimNodeA) =>
  claimEvent('clickConnectStart', { node, handleId: 'out' })

const reconnectStart = (activation: 'pointer' | 'keyboard') =>
  claimEvent(
    'reconnectStart',
    { edge: claimOldEdge, endpoint: 'target', activation },
    activation === 'pointer' ? 1 : 0
  )

const capturePair = (target: string, id: number) => [
  { action: 'set', target, id },
  { action: 'release', target, id },
]

for (const phase of [
  'connect',
  'change',
  'reconnect',
  'connectEnd',
  'reconnectEnd',
] as const) {
  test(`synthetic successful ${phase} reentry`, async ({ page }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'

      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.completionReentry(selected)
    }, phase)

    await testInfo.attach('full-public-stream', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    await page.screenshot({ path: testInfo.outputPath('public-host.png') })
    const first = phase.startsWith('reconnect') ? 'reconnect' : 'connect'
    const prefix = [`${first}Start`, 'validate', first, 'change', `${first}End`]
    prefix.splice(prefix.indexOf(phase) + 1, 0, 'connectStart')
    expect(
      result.afterA.events.map((event: { name: string }) => event.name)
    ).toEqual(prefix)
    expect(result.afterA.held).toBe(1)
    expect(
      result.final.events.map((event: { name: string }) => event.name)
    ).toEqual([...prefix, 'validate', 'connect', 'change', 'connectEnd'])
    expect(result.final.held).toBe(0)
    expect(result.final.accepted.document.edges).toEqual(
      first === 'connect'
        ? [
            {
              id: 'old',
              source: 'a',
              sourceHandle: 'out',
              target: 'b',
              targetHandle: 'in',
              selected: true,
              reconnectable: true,
            },
            {
              id: 'edge-2',
              source: 'a',
              sourceHandle: 'out',
              target: 'c',
              targetHandle: 'in',
            },
            {
              id: 'edge-3',
              source: 'b',
              sourceHandle: 'out',
              target: 'd',
              targetHandle: 'in',
            },
          ]
        : [
            {
              id: 'old',
              source: 'a',
              sourceHandle: 'out',
              target: 'c',
              targetHandle: 'in',
              selected: true,
              reconnectable: true,
            },
            {
              id: 'edge-2',
              source: 'b',
              sourceHandle: 'out',
              target: 'd',
              targetHandle: 'in',
            },
          ]
    )
  })
}

for (const phase of [
  'validation',
  'connect',
  'change',
  'connectEnd',
] as const) {
  test(`synthetic disposal in ${phase}`, async ({ page }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'

      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.completionReentry(selected, true)
    }, phase)

    await testInfo.attach('full-public-stream', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    await page.screenshot({ path: testInfo.outputPath('public-host.png') })
    expect(
      result.final.events.map((event: { name: string }) => event.name)
    ).toEqual(
      {
        validation: ['connectStart', 'validate', 'dispose', 'connectEnd'],
        connect: [
          'connectStart',
          'validate',
          'connect',
          'dispose',
          'connectEnd',
        ],
        change: [
          'connectStart',
          'validate',
          'connect',
          'change',
          'dispose',
          'connectEnd',
        ],
        connectEnd: [
          'connectStart',
          'validate',
          'connect',
          'change',
          'connectEnd',
          'dispose',
        ],
      }[phase]
    )
    expect(result.final.accepted.document.edges).toEqual(
      phase === 'connectEnd'
        ? [
            {
              id: 'edge-1',
              source: 'a',
              sourceHandle: 'out',
              target: 'c',
              targetHandle: 'in',
            },
          ]
        : []
    )
    expect(
      result.final.events.filter(
        (event: { name: string }) => event.name === 'connectEnd'
      )
    ).toEqual([
      {
        name: 'connectEnd',
        held: 0,
        payload:
          phase === 'connectEnd'
            ? {
                status: 'accepted',
                reason: 'valid-connection',
                connection: {
                  source: 'a',
                  sourceHandle: 'out',
                  target: 'c',
                  targetHandle: 'in',
                },
              }
            : { status: 'cancelled', reason: 'superseded' },
      },
    ])
    expect(result.final.held).toBe(0)
  })
}

for (const [axis0, route] of (
  [
    'physical-connect',
    'physical-reconnect',
    'retained-click',
    'keyboard-reconnect',
    'node-control',
  ] as const
).entries()) {
  for (const [axis1, recursive] of [false, true].entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`synthetic public watcher ${route} recursive ${recursive}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'

          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.reactiveDisposal(...args)
        },
        [route, recursive] as const
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('full-public-stream', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
      await page.screenshot({ path: testInfo.outputPath('public-host.png') })

      const sourcePreview = {
        kind: 'connect',
        from: { x: 175, y: 42.5 },
        to: { x: 175, y: 42.5 },
        candidate: {
          source: 'a',
          sourceHandle: 'out',
          target: 'a',
          targetHandle: 'out',
        },
        valid: false,
      }

      const reconnectPreview = {
        ...sourcePreview,
        kind: 'reconnect',
        edgeId: 'edge',
        endpoint: 'target',
      }

      const nodeEnd = { node: claimNodeA, ...cancelledClaim }

      const variants = {
        'physical-connect': {
          start: [claimStart(claimNodeA)],
          end: [claimEvent('connectEnd', cancelledClaim)],
          held: 1,
          captures: capturePair('a', 7),
          initial: sourcePreview,
        },
        'physical-reconnect': {
          start: [
            claimEvent(
              'reconnectStart',
              { edge: claimOldEdge, endpoint: 'target', activation: 'pointer' },
              1
            ),
          ],
          end: [claimEvent('reconnectEnd', cancelledClaim)],
          held: 1,
          captures: capturePair('target', 7),
          initial: reconnectPreview,
        },
        'retained-click': {
          start: [claimStart(claimNodeA), clickStart(claimNodeA)],
          end: [
            claimEvent('connectEnd', cancelledClaim),
            claimEvent('clickConnectEnd', cancelledClaim),
          ],
          held: 0,
          captures: capturePair('a', 7),
          initial: sourcePreview,
        },
        'keyboard-reconnect': {
          start: [
            claimEvent('reconnectStart', {
              edge: claimOldEdge,
              endpoint: 'target',
              activation: 'keyboard',
            }),
          ],
          end: [claimEvent('reconnectEnd', cancelledClaim)],
          held: 0,
          captures: [],
          initial: reconnectPreview,
        },
        'node-control': {
          start: [claimEvent('nodeDragStart', claimNodeA, 1)],
          end: [
            claimEvent('nodeDragEnd', nodeEnd),
            claimEvent('nodeDragStop', nodeEnd),
          ],
          held: 1,
          captures: capturePair('a', 7),
          initial: null,
        },
      }

      const variant = variants[route]

      const prefix = [
        ...variant.start,
        claimEvent(
          'watch:armed',
          route === 'node-control' ? 'null' : 'nonnull',
          variant.held
        ),
        claimEvent('outer:enter', null, variant.held),
        claimEvent('beforeUnmount', 1, variant.held),
      ]

      const nested = recursive && route !== 'node-control'

      const ordinary = [
        ...prefix,
        ...(route === 'node-control' ? [] : [claimEvent('watch:null', null)]),
        ...variant.end,
        claimEvent('outer:return', null),
      ]

      const recursiveEvents = [
        ...prefix,
        claimEvent('watch:null', null),
        claimEvent('nested:enter', null),
        claimEvent('beforeUnmount', 2),
        ...variant.end,
        claimEvent('nested:return', null),
        claimEvent('outer:return', null),
      ]

      expect(result).toStrictEqual({
        initial: variant.initial,
        events: nested ? recursiveEvents : ordinary,
        captures: variant.captures,
        held: 0,
        accepted: {
          document: {
            nodes: [claimNodeA, claimNodeB, claimNodeC],
            edges: [claimOldEdge],
          },
          viewport: claimViewport,
        },
        frameworkError: null,
      })
    })
  }
}

for (const mode of ['selectionChange', 'change', 'pan', 'auto-pan'] as const) {
  test(`synthetic ${mode} continuation`, async ({ page }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'

      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationReentry(selected)
    }, mode)

    await testInfo.attach('full-public-stream', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    await page.screenshot({ path: testInfo.outputPath('public-host.png') })
    expect(result.afterA.held).toBe(1)
    expect(result.final.held).toBe(0)

    const names = result.final.events.map(
      (event: { name: string }) => event.name
    )

    if (mode === 'selectionChange' || mode === 'change') {
      expect(names).toEqual(
        mode === 'selectionChange'
          ? [
              'selectionStart',
              'selectionDragStart',
              'selectionChange',
              'selectionStart',
              'selectionDragStart',
              'change',
              'selectionEnd',
              'selectionDragStop',
              'selectionChange',
              'change',
              'selectionEnd',
              'selectionDragStop',
            ]
          : [
              'selectionStart',
              'selectionDragStart',
              'selectionChange',
              'change',
              'selectionStart',
              'selectionDragStart',
              'selectionEnd',
              'selectionDragStop',
              'selectionChange',
              'change',
              'selectionEnd',
              'selectionDragStop',
            ]
      )
      expect(result.final.changes).toEqual([
        { kind: 'selection-set', nodeIds: [], edgeIds: [] },
        { kind: 'selection-set', nodeIds: [], edgeIds: [] },
      ])
    } else if (mode === 'pan') {
      expect(names).toEqual([
        'viewportStart',
        'moveStart',
        'viewportChange',
        'move',
        'viewportEnd',
        'moveEnd',
        'viewportStart',
        'moveStart',
        'viewportChange',
        'move',
        'viewportEnd',
        'moveEnd',
      ])
      // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 retains the transform when no move preceded release.
      expect(result.final.accepted.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    } else {
      expect(names).toEqual([
        'connectStart',
        'viewportStart',
        'viewportEnd',
        'connectEnd',
        'connectStart',
        'connect',
        'change',
        'connectEnd',
      ])
      expect(result.final.changes).toEqual([
        {
          kind: 'edge-add',
          edge: {
            id: 'edge-2',
            source: 'b',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          },
        },
      ])
    }
  })
}

for (const [axis0, live] of (
  [
    'physical-connect',
    'physical-reconnect',
    'retained-click',
    'keyboard-reconnect',
    'node-control',
    'none',
    'selection',
    'pan',
  ] as const
).entries()) {
  for (const [axis1, recursive] of [false, true].entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`claims physical ${live} recursive ${recursive}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.disposalClaimsProof(
            args.live,
            'physical',
            ['none', 'selection', 'pan'].includes(args.live)
              ? 'terminal'
              : 'watch',
            args.recursive,
            false
          )
        },
        { live, recursive }
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('full-claims-stream', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
      expect(result.held).toBe(0)
      expect(
        result.events.filter((event) => event.name === 'validate')
      ).toHaveLength(2)
      expect(
        result.events.filter((event) =>
          ['connect', 'change', 'reconnect'].includes(event.name)
        )
      ).toEqual([])
      expect(
        result.events
          .filter(
            (event) => event.name.endsWith('End') || event.name.endsWith('Stop')
          )
          .every((event) => event.held === 0)
      ).toBe(true)
      expect(
        result.events.filter((event) => event.name === 'connectEnd')
      ).toHaveLength(
        live === 'physical-connect' || live === 'retained-click' ? 3 : 2
      )
      expect(result.repeat.before).toEqual(result.repeat.after)
      expect(result.frameworkError).toBeNull()
    })
  }
}

for (const [axis0, threshold] of [0, 5].entries()) {
  for (const [axis1, route] of (
    [
      'physical-connect',
      'physical-reconnect',
      'retained-click',
      'keyboard-reconnect',
    ] as const
  ).entries()) {
    for (const [axis2, mounted] of [false, true].entries()) {
      for (const [axis3, controlled] of [false, true].entries()) {
        if (!representativeCombination([axis0, axis1, axis2, axis3])) {
          continue
        }

        // eslint-disable-next-line complexity -- Keep complete literal streams for all route, promotion, watcher and control combinations together.
        test(`completion watcher ${route} mounted ${mounted} controlled ${controlled} threshold ${threshold}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/gesture-ownership-harness.ts'
              const fixture: typeof NodeReentryHarness = await import(path)

              return fixture.reactiveCompletionProof(
                args.route,
                args.mounted,
                args.controlled,
                args.threshold
              )
            },
            { route, mounted, controlled, threshold }
          )

          process.stdout.write(
            `${JSON.stringify({ receipt: testInfo.title, result })}\n`
          )
          await testInfo.attach('full-completion-watcher-stream', {
            body: JSON.stringify(result, null, 2),
            contentType: 'application/json',
          })
          const reconnect = route.endsWith('reconnect')
          const retained = route === 'retained-click'
          const held = route.startsWith('physical') ? 1 : 0

          const connection = {
            source: 'a',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          }

          const sourcePreview = {
            kind: 'connect',
            from: { x: 175, y: 42.5 },
            to: { x: 175, y: 42.5 },
            candidate: {
              source: 'a',
              sourceHandle: 'out',
              target: 'a',
              targetHandle: 'out',
            },
            valid: false,
          }

          const reconnectPreview = {
            ...sourcePreview,
            kind: 'reconnect',
            edgeId: 'edge',
            endpoint: 'target',
          }

          const initialByRoute = {
            'physical-connect':
              threshold === 0
                ? sourcePreview
                : {
                    ...sourcePreview,
                    to: { x: 176.5, y: 43.5 },
                    candidate: null,
                    valid: null,
                  },
            'physical-reconnect':
              threshold === 0
                ? reconnectPreview
                : {
                    ...reconnectPreview,
                    to: { x: 212, y: 43.5 },
                    candidate: {
                      source: 'a',
                      sourceHandle: 'out',
                      target: 'b',
                      targetHandle: 'in',
                    },
                  },
            'retained-click': sourcePreview,
            'keyboard-reconnect': reconnectPreview,
          }

          const retainedStart =
            threshold === 0
              ? claimStart(claimNodeA)
              : claimEvent('connectStart', {
                  node: claimNodeA,
                  handleId: 'out',
                  activation: 'click',
                })

          const starts = {
            'physical-connect': [claimStart(claimNodeA)],
            'physical-reconnect': [
              ...(threshold === 0
                ? []
                : [
                    claimEvent(
                      'threshold:equality',
                      { events: [], preview: null },
                      1
                    ),
                  ]),
              claimEvent(
                'reconnectStart',
                {
                  edge: claimOldEdge,
                  endpoint: 'target',
                  activation: 'pointer',
                },
                1
              ),
            ],
            'retained-click': [retainedStart, clickStart(claimNodeA)],
            'keyboard-reconnect': [
              claimEvent('reconnectStart', {
                edge: claimOldEdge,
                endpoint: 'target',
                activation: 'keyboard',
              }),
            ],
          }

          const endName = reconnect ? 'reconnectEnd' : 'connectEnd'

          const edge = reconnect
            ? { ...claimOldEdge, ...connection }
            : { id: 'edge-2', ...connection }

          const status = controlled ? 'proposed' : 'accepted'
          const reason = reconnect ? 'valid-reconnection' : 'valid-connection'

          const prefix = [
            ...starts[route],
            ...(() => {
              if (threshold === 5 && route.startsWith('physical')) {
                return [
                  claimEvent(
                    reconnect ? 'reconnectProgress' : 'connectProgress',
                    { preview: initialByRoute[route] },
                    1
                  ),
                ]
              }

              return []
            })(),
            claimEvent('watch:armed', 'nonnull', held),
            claimEvent('complete:target', null, held),
            ...(retained && threshold === 5
              ? [claimEvent('watch:preview', sourcePreview, 1)]
              : []),
            claimEvent('watch:null', null),
          ]

          const success = [
            claimEvent('validate', connection),
            claimEvent(
              reconnect ? 'reconnect' : 'connect',
              reconnect ? { edge, connection } : connection
            ),
            claimEvent('change', {
              kind: reconnect ? 'edge-reconnect' : 'edge-add',
              edge,
            }),
            claimEvent(endName, { status, reason, connection }),
            ...(retained
              ? [claimEvent('clickConnectEnd', { status, reason })]
              : []),
          ]

          const cancelled = [
            claimEvent('watcher:enter', null),
            claimEvent('beforeUnmount', 1),
            claimEvent(endName, cancelledClaim),
            ...(retained
              ? [claimEvent('clickConnectEnd', cancelledClaim)]
              : []),
            claimEvent('watcher:return', null),
          ]

          const captures = {
            'physical-connect': capturePair('a', 7),
            'physical-reconnect': capturePair('target', 7),
            'retained-click': [
              ...capturePair('a', 7),
              ...(threshold === 5 ? capturePair('c', 7) : []),
            ],
            'keyboard-reconnect': [],
          }

          const acceptedEdges = reconnect ? [edge] : [claimOldEdge, edge]
          expect(result).toStrictEqual({
            initial: initialByRoute[route],
            lateQuiet: true,
            events: [
              ...prefix,
              ...(mounted ? success : cancelled),
              claimEvent('complete:return', null),
            ],
            captures: captures[route],
            held: 0,
            accepted: {
              document: {
                nodes: [claimNodeA, claimNodeB, claimNodeC],
                edges: mounted && !controlled ? acceptedEdges : [claimOldEdge],
              },
              viewport: claimViewport,
            },
          })
        })
      }
    }
  }
}

const liveClaimCases = [
  {
    live: 'physical-connect',
    starts: [claimStart(claimNodeA)],
    ends: [claimEvent('connectEnd', cancelledClaim)],
    capture: 'a',
    held: 1,
    entry: 'release',
  },
  {
    live: 'node-control',
    starts: [claimEvent('nodeDragStart', claimNodeA, 1)],
    ends: [
      claimEvent('nodeDragEnd', { node: claimNodeA, ...cancelledClaim }),
      claimEvent('nodeDragStop', { node: claimNodeA, ...cancelledClaim }),
    ],
    capture: 'a',
    held: 1,
    entry: 'release',
  },

  {
    live: 'physical-connect',
    starts: [claimStart(claimNodeA)],
    ends: [claimEvent('connectEnd', cancelledClaim)],
    capture: 'a',
    held: 1,
    entry: 'watch',
  },
  {
    live: 'physical-reconnect',
    starts: [reconnectStart('pointer')],
    ends: [claimEvent('reconnectEnd', cancelledClaim)],
    capture: 'target',
    held: 1,
    entry: 'watch',
  },
  {
    live: 'retained-click',
    starts: [claimStart(claimNodeA), clickStart(claimNodeA)],
    ends: [
      claimEvent('connectEnd', cancelledClaim),
      claimEvent('clickConnectEnd', cancelledClaim),
    ],
    capture: 'a',
    held: 0,
    entry: 'watch',
  },
  {
    live: 'keyboard-reconnect',
    starts: [reconnectStart('keyboard')],
    ends: [claimEvent('reconnectEnd', cancelledClaim)],
    capture: null,
    held: 0,
    entry: 'watch',
  },
  {
    live: 'node-control',
    starts: [claimEvent('nodeDragStart', claimNodeA, 1)],
    ends: [
      claimEvent('nodeDragEnd', { node: claimNodeA, ...cancelledClaim }),
      claimEvent('nodeDragStop', { node: claimNodeA, ...cancelledClaim }),
    ],
    capture: 'a',
    held: 1,
    entry: 'watch',
  },
  {
    live: 'node-control',
    starts: [claimEvent('nodeDragStart', claimNodeA, 1)],
    ends: [
      claimEvent('nodeDragEnd', { node: claimNodeA, ...cancelledClaim }),
      claimEvent('nodeDragStop', { node: claimNodeA, ...cancelledClaim }),
    ],
    capture: 'a',
    held: 1,
    entry: 'terminal',
  },
  {
    live: 'none',
    starts: [],
    ends: [],
    capture: null,
    held: 0,
    entry: 'terminal',
  },
  {
    live: 'selection',
    starts: [
      claimEvent(
        'selectionStart',
        { position: { x: 460, y: 255 }, activation: 'pointer' },
        1
      ),
      claimEvent('selectionDragStart', { position: { x: 460, y: 255 } }, 1),
    ],
    ends: [
      claimEvent('selectionEnd', cancelledClaim),
      claimEvent('selectionDragStop', cancelledClaim),
    ],
    capture: 'canvas',
    held: 1,
    entry: 'terminal',
  },
  {
    live: 'pan',
    starts: [
      claimEvent('viewportStart', claimViewport, 1),
      claimEvent('moveStart', claimViewport, 1),
    ],
    ends: [
      claimEvent('viewportEnd', {
        viewport: claimViewport,
        status: 'disposed',
      }),
      claimEvent('moveEnd', { viewport: claimViewport, status: 'disposed' }),
    ],
    capture: 'canvas',
    held: 1,
    entry: 'terminal',
  },
] as const

for (const [axis0, liveCase] of liveClaimCases.entries()) {
  for (const [axis1, recursive] of [false, true].entries()) {
    for (const [axis2, claimRoute] of (
      ['physical', 'click', 'reconnect'] as const
    ).entries()) {
      for (const [axis3, controlled] of [false, true].entries()) {
        if (!representativeCombination([axis0, axis1, axis2, axis3])) {
          continue
        }

        // eslint-disable-next-line complexity -- The matrix keeps registration, resource and per-port notification order in one assertion.
        test(`literal drain ${claimRoute} ${liveCase.live} ${liveCase.entry} controlled ${controlled} recursive ${recursive}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/gesture-ownership-harness.ts'
              const fixture: typeof NodeReentryHarness = await import(path)

              return fixture.disposalClaimsProof(
                args.live,
                args.claimRoute,
                args.entry,
                args.recursive,
                args.controlled
              )
            },
            {
              live: liveCase.live,
              entry: liveCase.entry,
              claimRoute,
              controlled,
              recursive,
            }
          )

          await testInfo.attach('literal-drain-receipt', {
            body: JSON.stringify(result, null, 2),
            contentType: 'application/json',
          })

          const startA = (() => {
            if (claimRoute === 'reconnect') {
              return [reconnectStart('pointer')]
            }

            return [
              claimEvent(
                'connectStart',
                {
                  node: claimNodeA,
                  handleId: 'out',
                  activation: claimRoute === 'click' ? 'keyboard' : 'pointer',
                },
                claimRoute === 'click' ? 0 : 1
              ),
            ]
          })()

          const startB = (() => {
            if (claimRoute === 'reconnect') {
              return [reconnectStart('pointer')]
            }

            return [
              claimEvent(
                'connectStart',
                {
                  node: claimNodeB,
                  handleId: 'out',
                  activation: claimRoute === 'click' ? 'keyboard' : 'pointer',
                },
                claimRoute === 'click' ? 0 : 1
              ),
            ]
          })()

          const ends =
            claimRoute === 'reconnect'
              ? [claimEvent('reconnectEnd', cancelledClaim)]
              : [claimEvent('connectEnd', cancelledClaim)]

          const extraA = claimRoute === 'click' ? [clickStart(claimNodeA)] : []
          const extraB = claimRoute === 'click' ? [clickStart(claimNodeB)] : []

          const extraEnd =
            claimRoute === 'click'
              ? [claimEvent('clickConnectEnd', cancelledClaim)]
              : []

          const candidateA = {
            source: 'a',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          }

          const candidateB = {
            source: claimRoute === 'reconnect' ? 'a' : 'b',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          }

          const prefix = [
            ...startA,
            ...extraA,
            claimEvent('validate', candidateA),
            ...startB,
            ...extraB,
            claimEvent('validate', candidateB),
            ...liveCase.starts,
          ]

          const terminals = [
            ...liveCase.ends,
            ...ends,
            ...extraEnd,
            ...ends,
            ...extraEnd,
          ]

          const nestedPrefix = [
            claimEvent('nested:enter', null),
            claimEvent('beforeUnmount', 2),
          ]

          const nestedTail = [
            claimEvent('nested:return', null),
            claimEvent('outer:return', null),
          ]

          const ordinaryEntry = [
            claimEvent('outer:enter', null, liveCase.held),
            claimEvent('beforeUnmount', 1, liveCase.held),
          ]

          let expected

          if (liveCase.entry === 'watch' && liveCase.live === 'node-control') {
            expected = [
              ...prefix,
              claimEvent('watch:armed', 'null', 1),
              ...ordinaryEntry,
              ...terminals,
              claimEvent('outer:return', null),
            ]
          } else if (recursive && liveCase.entry === 'release') {
            expected = [
              ...prefix,
              ...ordinaryEntry,
              ...nestedPrefix,
              ...terminals,
              ...nestedTail,
            ]
          } else if (!recursive && liveCase.entry === 'watch') {
            expected = [
              ...prefix,
              claimEvent('watch:armed', 'nonnull', liveCase.held),
              ...ordinaryEntry,
              claimEvent('watch:null', null),
              ...terminals,
              claimEvent('outer:return', null),
            ]
          } else if (!recursive) {
            expected = [
              ...prefix,
              ...ordinaryEntry,
              ...terminals,
              claimEvent('outer:return', null),
            ]
          } else if (liveCase.entry === 'watch') {
            expected = [
              ...prefix,
              claimEvent('watch:armed', 'nonnull', liveCase.held),
              ...ordinaryEntry,
              claimEvent('watch:null', null),
              ...nestedPrefix,
              ...terminals,
              ...nestedTail,
            ]
          } else {
            expected = [
              ...prefix,
              ...ordinaryEntry,
              terminals[0],
              ...nestedPrefix,
              ...terminals.slice(1),
              ...nestedTail,
            ]
          }

          const baseCaptures = (() => {
            if (claimRoute === 'click') {
              return []
            }

            if (claimRoute === 'reconnect') {
              return [...capturePair('target', 7), ...capturePair('target', 8)]
            }

            return [...capturePair('a', 7), ...capturePair('b', 8)]
          })()

          const liveCaptures =
            liveCase.capture === null ? [] : capturePair(liveCase.capture, 9)

          expect({
            events: result.events,
            captures: result.captures,
            held: result.held,
            accepted: result.accepted,
          }).toStrictEqual({
            events: expected,
            captures: [...baseCaptures, ...liveCaptures],
            held: 0,
            accepted: {
              document: {
                nodes: [claimNodeA, claimNodeB, claimNodeC],
                edges: [claimOldEdge],
              },
              viewport: claimViewport,
            },
          })
          expect(result.repeat.after).toStrictEqual(result.repeat.before)
        })
      }
    }
  }
}

for (const [axis0, entry] of (['editor', 'renderer'] as const).entries()) {
  for (const [axis1, mode] of (
    ['ordinary', 'escape', 'error', 'dispose', 'error-dispose'] as const
  ).entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`keyboard preview ${entry} ${mode}`, async ({ page }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.keyboardPreviewProof(args.entry, args.mode)
        },
        { entry, mode }
      )

      await testInfo.attach('keyboard-preview-receipt', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
      expect(result.captures).toStrictEqual([])
      expect(result.held).toBe(0)
      expect(result.measuredTarget).toStrictEqual({ node: 'c', handle: 'out' })
      expect(result.frameworkError).toStrictEqual(
        entry === 'renderer' && mode.includes('dispose')
          ? {
              name: 'TypeError',
              message:
                "Cannot read properties of null (reading 'insertBefore')",
            }
          : null
      )
      expect(
        result.events
          .filter((event) => event.name === 'validate')
          .map((event) => event.payload)
      ).toStrictEqual([
        {
          source: 'c',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
        },
      ])

      if (mode !== 'ordinary') {
        expect(result.preview).toBeNull()
        expect(result.rendered).toBeNull()
        expect(
          result.events
            .filter((event) => event.name === 'reconnectEnd')
            .map((event) => event.payload)
        ).toStrictEqual([
          {
            status: 'cancelled',
            reason: mode.includes('dispose') ? 'superseded' : 'escape',
          },
        ])
      }
    })
  }
}

for (const [axis0, phase] of (
  ['connect', 'change', 'reconnect', 'connectEnd', 'reconnectEnd'] as const
).entries()) {
  for (const [axis1, controlled] of [false, true].entries()) {
    for (const [axis2, reconnectB] of [false, true].entries()) {
      if (!representativeCombination([axis0, axis1, axis2])) {
        continue
      }

      // eslint-disable-next-line complexity -- Each phase asserts its complete literal stream, including controlled and reconnect successor variants.
      test(`complete stream ${phase} controlled ${controlled} reconnectB ${reconnectB}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/gesture-ownership-harness.ts'
            const fixture: typeof NodeReentryHarness = await import(path)

            return fixture.completionReentry(
              args.phase,
              false,
              args.controlled,
              args.reconnectB
            )
          },
          { phase, controlled, reconnectB }
        )

        await testInfo.attach('complete-reentry-stream', {
          body: JSON.stringify(result, null, 2),
          contentType: 'application/json',
        })
        const reconnectA = phase.startsWith('reconnect')

        const nodeB = {
          id: 'b',
          label: 'B',
          position: { x: 220, y: 20 },
          size: { width: 150, height: 45 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        }

        const nodeD = {
          id: 'd',
          label: 'D',
          position: { x: 620, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        }

        const old = { ...claimOldEdge, id: 'old' }

        const connectionA = {
          source: 'a',
          sourceHandle: 'out',
          target: 'c',
          targetHandle: 'in',
        }

        const connectionB = {
          source: reconnectB ? 'a' : 'b',
          sourceHandle: 'out',
          target: 'd',
          targetHandle: 'in',
        }

        const edgeA = reconnectA
          ? { ...old, target: 'c' }
          : { id: 'edge-2', ...connectionA }

        const edgeB = (() => {
          if (reconnectB) {
            return { ...old, target: 'd' }
          }

          return {
            id: !controlled && !reconnectA ? 'edge-3' : 'edge-2',
            ...connectionB,
          }
        })()

        const changeA = {
          kind: reconnectA ? 'edge-reconnect' : 'edge-add',
          edge: edgeA,
        }

        const changeB = {
          kind: reconnectB ? 'edge-reconnect' : 'edge-add',
          edge: edgeB,
        }

        const status = controlled ? 'proposed' : 'accepted'

        const first = reconnectA
          ? claimEvent(
              'reconnectStart',
              { edge: old, endpoint: 'target', activation: 'pointer' },
              1
            )
          : claimStart(claimNodeA)

        const bEdgeAtStart =
          phase === 'reconnectEnd' && !controlled
            ? { ...old, target: 'c' }
            : old

        const startB = reconnectB
          ? claimEvent(
              'reconnectStart',
              { edge: bEdgeAtStart, endpoint: 'target', activation: 'pointer' },
              1
            )
          : claimStart(nodeB)

        const proposalA = claimEvent(
          reconnectA ? 'reconnect' : 'connect',
          reconnectA ? { edge: edgeA, connection: connectionA } : connectionA
        )

        const changedA = claimEvent(
          'change',
          changeA,
          phase === 'connect' || phase === 'reconnect' ? 1 : 0
        )

        const endedA = claimEvent(
          reconnectA ? 'reconnectEnd' : 'connectEnd',
          {
            status,
            reason: reconnectA ? 'valid-reconnection' : 'valid-connection',
            connection: connectionA,
          },
          phase.endsWith('End') ? 0 : 1
        )

        const before = [first, claimEvent('validate', connectionA), proposalA]
        let aEvents

        if (phase === 'connect' || phase === 'reconnect') {
          aEvents = [...before, startB, changedA, endedA]
        } else if (phase === 'change') {
          aEvents = [...before, changedA, startB, endedA]
        } else {
          aEvents = [...before, changedA, endedA, startB]
        }

        const events = [
          ...aEvents,
          claimEvent('validate', connectionB),
          claimEvent(
            reconnectB ? 'reconnect' : 'connect',
            reconnectB ? { edge: edgeB, connection: connectionB } : connectionB
          ),
          claimEvent('change', changeB),
          claimEvent(reconnectB ? 'reconnectEnd' : 'connectEnd', {
            status,
            reason: reconnectB ? 'valid-reconnection' : 'valid-connection',
            connection: connectionB,
          }),
        ]

        const aCaptures = capturePair(reconnectA ? 'target' : 'a', 7)
        const bCaptures = capturePair(reconnectB ? 'target' : 'b', 8)

        const aEdges = (() => {
          if (controlled) {
            return [old]
          }

          return reconnectA ? [edgeA] : [old, edgeA]
        })()

        const finalEdges = (() => {
          if (controlled) {
            return [old]
          }

          if (reconnectB) {
            return reconnectA ? [edgeB] : [edgeB, edgeA]
          }

          return [...aEdges, edgeB]
        })()

        const nodes = [claimNodeA, nodeB, claimNodeC, nodeD]

        const previewB = reconnectB
          ? {
              kind: 'reconnect',
              from: { x: 175, y: 42.5 },
              to: { x: 175, y: 42.5 },
              candidate: {
                source: 'a',
                sourceHandle: 'out',
                target: 'a',
                targetHandle: 'out',
              },
              valid: false,
              edgeId: 'old',
              endpoint: 'target',
            }
          : {
              kind: 'connect',
              from: { x: 375, y: 42.5 },
              to: { x: 375, y: 42.5 },
              candidate: {
                source: 'b',
                sourceHandle: 'out',
                target: 'b',
                targetHandle: 'out',
              },
              valid: false,
            }

        expect(result).toStrictEqual({
          afterA: {
            events: aEvents,
            changes: [changeA],
            captures: [...aCaptures, bCaptures[0]],
            held: 1,
            accepted: {
              document: { nodes, edges: aEdges },
              viewport: claimViewport,
            },
            preview: previewB,
          },
          final: {
            events,
            changes: [changeA, changeB],
            captures: [...aCaptures, ...bCaptures],
            held: 0,
            accepted: {
              document: { nodes, edges: finalEdges },
              viewport: claimViewport,
            },
            preview: null,
          },
        })
      })
    }
  }
}

for (const scenario of [
  { actor: 'node', action: 'ordinary' },
  { actor: 'node', action: 'dispose-change' },
  { actor: 'node', action: 'switch-mode' },
  { actor: 'selection', action: 'ordinary' },
  { actor: 'selection', action: 'dispose-selectionChange' },
  { actor: 'selection', action: 'dispose-change' },
  { actor: 'selection', action: 'switch-mode' },
  { actor: 'connection', action: 'switch-mode' },
  { actor: 'connection', action: 'nested' },
  { actor: 'connection', action: 'defaults' },
  { actor: 'connection', action: 'invalid-endpoint' },
  { actor: 'reconnection', action: 'metadata' },
  { actor: 'reconnection', action: 'invalid-endpoint' },
] as const) {
  test(`semantic ${scenario.actor} ${scenario.action}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (args) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.semanticBoundaryProof(args.actor, args.action)
    }, scenario)

    await testInfo.attach('semantic-boundary-stream', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    const nodes = [claimNodeA, claimNodeB, claimNodeC]
    const unchanged = { nodes, edges: [claimOldEdge] }

    const connection = {
      source: 'a',
      sourceHandle: 'out',
      target: 'c',
      targetHandle: 'in',
    }

    const nestedConnection = { ...connection, source: 'b' }
    const edge2 = { id: 'edge-2', label: 'before-connect', ...connection }
    const nestedEdge = { ...edge2, ...nestedConnection }
    const outerEdge = { ...edge2, id: 'edge-3' }
    const defaultsEdge = { ...edge2, label: 'after-connect' }

    const reconnectEdge = {
      ...claimOldEdge,
      ...connection,
      label: 'after-validation',
    }

    const rejectedNodes = [
      claimNodeA,
      claimNodeB,
      { ...claimNodeC, handles: [{ id: 'in', kind: 'source', side: 'left' }] },
    ]

    const rejected = claimEvent(
      scenario.actor === 'reconnection' ? 'reconnectEnd' : 'connectEnd',
      { status: 'rejected', reason: 'invalid-target' }
    )

    const nodeStart = claimEvent('nodeStart', claimNodeA, 1)

    const nodeChange = claimEvent('change', {
      kind: 'node-position',
      nodeId: 'a',
      position: { x: 32, y: 26 },
    })

    const nodeEnd = {
      node: claimNodeA,
      status: 'accepted',
      reason: 'drag-complete',
    }

    const nodeProposed = { ...nodeEnd, status: 'proposed' }

    const selectionStart = [
      claimEvent(
        'selectionStart',
        { position: { x: 560, y: 300 }, activation: 'pointer' },
        1
      ),
      claimEvent('selectionDragStart', { position: { x: 560, y: 300 } }, 1),
    ]

    const selected = claimEvent('selectionChange', { nodes: [], edges: [] })

    const selectionChange = claimEvent('change', {
      kind: 'selection-set',
      nodeIds: [],
      edgeIds: [],
    })

    const selectionEnd = { status: 'accepted', reason: 'selection-complete' }
    const selectionProposed = { ...selectionEnd, status: 'proposed' }

    const connectionPrefix = [
      claimStart(claimNodeA),
      claimEvent('validate', connection),
      claimEvent('connect', connection),
    ]

    const connectionEnd = claimEvent('connectEnd', {
      status: 'accepted',
      reason: 'valid-connection',
      connection,
    })

    const reconnectPrefix = [
      claimEvent(
        'reconnectStart',
        { edge: claimOldEdge, endpoint: 'target', activation: 'pointer' },
        1
      ),
      claimEvent('validate', connection),
    ]

    const expected = {
      'node-ordinary': {
        events: [
          nodeStart,
          nodeChange,
          claimEvent('nodeEnd', nodeEnd),
          claimEvent('nodeStop', nodeEnd),
        ],
        document: {
          ...unchanged,
          nodes: [
            { ...claimNodeA, position: { x: 32, y: 26 } },
            claimNodeB,
            claimNodeC,
          ],
        },
        captures: capturePair('a', 7),
      },
      'node-dispose-change': {
        events: [
          nodeStart,
          nodeChange,
          claimEvent('dispose', 'dispose-change'),
        ],
        document: unchanged,
        captures: capturePair('a', 7),
      },
      'node-switch-mode': {
        events: [
          nodeStart,
          nodeChange,
          claimEvent('nodeEnd', nodeProposed),
          claimEvent('nodeStop', nodeProposed),
        ],
        document: unchanged,
        captures: capturePair('a', 7),
      },
      'selection-ordinary': {
        events: [
          ...selectionStart,
          selected,
          selectionChange,
          claimEvent('selectionEnd', selectionEnd),
          claimEvent('selectionStop', selectionEnd),
        ],
        document: {
          // Pinned react/src/utils/changes.ts:245-257 leaves untouched A/C unset.
          nodes: [claimNodeA, { ...claimNodeB, selected: false }, claimNodeC],
          edges: [{ ...claimOldEdge, selected: false }],
        },
        captures: capturePair('canvas', 7),
      },
      'selection-dispose-selectionChange': {
        events: [
          ...selectionStart,
          selected,
          claimEvent('dispose', 'dispose-selectionChange'),
        ],
        document: unchanged,
        captures: capturePair('canvas', 7),
      },
      'selection-dispose-change': {
        events: [
          ...selectionStart,
          selected,
          selectionChange,
          claimEvent('dispose', 'dispose-change'),
        ],
        document: unchanged,
        captures: capturePair('canvas', 7),
      },
      'selection-switch-mode': {
        events: [
          ...selectionStart,
          selected,
          selectionChange,
          claimEvent('selectionEnd', selectionProposed),
          claimEvent('selectionStop', selectionProposed),
        ],
        document: unchanged,
        captures: capturePair('canvas', 7),
      },
      'connection-switch-mode': {
        events: [
          ...connectionPrefix,
          claimEvent('change', { kind: 'edge-add', edge: edge2 }),
          connectionEnd,
        ],
        document: unchanged,
        captures: capturePair('a', 7),
      },
      'connection-nested': {
        events: [
          ...connectionPrefix,
          claimStart(claimNodeB),
          claimEvent('validate', nestedConnection),
          claimEvent('connect', nestedConnection),
          claimEvent('change', { kind: 'edge-add', edge: nestedEdge }),
          claimEvent('connectEnd', {
            status: 'accepted',
            reason: 'valid-connection',
            connection: nestedConnection,
          }),
          claimEvent('change', { kind: 'edge-add', edge: outerEdge }),
          connectionEnd,
        ],
        document: { nodes, edges: [claimOldEdge, nestedEdge, outerEdge] },
        captures: [...capturePair('a', 7), ...capturePair('b', 8)],
      },
      'connection-defaults': {
        events: [
          ...connectionPrefix,
          claimEvent('change', { kind: 'edge-add', edge: defaultsEdge }),
          connectionEnd,
        ],
        document: { nodes, edges: [claimOldEdge, defaultsEdge] },
        captures: capturePair('a', 7),
      },
      'connection-invalid-endpoint': {
        events: [...connectionPrefix, rejected],
        document: { nodes: rejectedNodes, edges: [claimOldEdge] },
        captures: capturePair('a', 7),
      },
      'reconnection-metadata': {
        events: [
          ...reconnectPrefix,
          claimEvent('reconnect', { edge: reconnectEdge, connection }),
          claimEvent('change', { kind: 'edge-reconnect', edge: reconnectEdge }),
          claimEvent('reconnectEnd', {
            status: 'accepted',
            reason: 'valid-reconnection',
            connection,
          }),
        ],
        document: { nodes, edges: [reconnectEdge] },
        captures: capturePair('target', 7),
      },
      'reconnection-invalid-endpoint': {
        events: [...reconnectPrefix, rejected],
        document: { nodes: rejectedNodes, edges: [claimOldEdge] },
        captures: capturePair('target', 7),
      },
    }

    const key = `${scenario.actor}-${scenario.action}`
    const match = Object.entries(expected).find(([name]) => name === key)

    if (match === undefined) {
      throw new Error(`Missing semantic expectation ${key}`)
    }

    const [, value] = match
    expect(result).toStrictEqual({
      events: value.events,
      held: 0,
      captures: value.captures,
      accepted: { document: value.document, viewport: claimViewport },
    })
  })
}

for (const recursive of [false, true]) {
  test(`frozen resources recursive ${recursive}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (value) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.disposalResourceProof(value)
    }, recursive)

    await testInfo.attach('resource-drain-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    expect(result.after).toStrictEqual(result.before)
    expect(result.afterFrozen).toBe(result.beforeFrozen)
    expect(result.frozenResizeCount).toBeGreaterThan(0)
    expect(
      result.events.filter((event) => event.name.endsWith(':result'))
    ).toStrictEqual([
      {
        name: 'request:result',
        payload: {
          requestId: 1,
          status: 'disposed',
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
      {
        name: 'internals:result',
        payload: [{ nodeId: 'a', status: 'disposed' }],
      },
    ])
    expect(
      result.events.filter(
        (event) => event.name === 'viewportEnd' || event.name === 'moveEnd'
      )
    ).toStrictEqual([
      {
        name: 'viewportEnd',
        payload: { viewport: { x: 0, y: 0, zoom: 1 }, status: 'disposed' },
      },
      {
        name: 'moveEnd',
        payload: { viewport: { x: 0, y: 0, zoom: 1 }, status: 'disposed' },
      },
    ])
    expect(result.frameworkError).toBeNull()
  })
}

for (const promoted of [false, true]) {
  test(`retained target candidate promoted ${promoted}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (promotion) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.retainedPressProof(promotion)
    }, promoted)

    await testInfo.attach('retained-press-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })

    const connection = {
      source: 'a',
      sourceHandle: 'out',
      target: 'c',
      targetHandle: 'in',
    }

    const edge = { id: 'edge-2', ...connection }

    const start = [
      claimEvent('connectStart', {
        node: claimNodeA,
        handleId: 'out',
        activation: 'click',
      }),
      clickStart(claimNodeA),
    ]

    const pendingPreview = {
      kind: 'connect',
      from: { x: 175, y: 42.5 },
      to: { x: 175, y: 42.5 },
      candidate: {
        source: 'a',
        sourceHandle: 'out',
        target: 'a',
        targetHandle: 'out',
      },
      valid: false,
    }

    const activePreview = {
      kind: 'connect',
      from: { x: 175, y: 42.5 },
      to: { x: 427.5, y: 43.5 },
      candidate: connection,
      valid: true,
    }

    const progress = promoted
      ? [
          claimEvent('validate', connection, 1),
          claimEvent('connectProgress', { preview: activePreview }, 1),
        ]
      : []

    expect(result).toStrictEqual({
      pending: { events: start, held: 1, preview: pendingPreview },
      crossing: {
        events: [...start, ...progress],
        held: 1,
        preview: promoted ? activePreview : pendingPreview,
      },
      events: [
        ...start,
        ...progress,
        ...(promoted ? [claimEvent('validate', connection, 1)] : []),
        claimEvent('validate', connection),
        claimEvent('connect', connection),
        claimEvent('change', { kind: 'edge-add', edge }),
        claimEvent('connectEnd', {
          status: 'accepted',
          reason: 'valid-connection',
          connection,
        }),
        claimEvent('clickConnectEnd', {
          status: 'accepted',
          reason: 'valid-connection',
        }),
      ],
      captures: [...capturePair('a', 7), ...capturePair('c', 7)],
      held: 0,
      accepted: {
        document: {
          nodes: [claimNodeA, claimNodeB, claimNodeC],
          edges: [claimOldEdge, edge],
        },
        viewport: claimViewport,
      },
      sourcePoint: { x: 210.5, y: 43.5 },
      targetPoint: { x: 461.5, y: 43.5 },
    })
  })
}

for (const [axis0, route] of (['physical', 'retained'] as const).entries()) {
  for (const [axis1, phase] of (
    [
      'ordinary',
      'validate',
      'error',
      'viewportChange',
      'move',
      'update:viewport',
    ] as const
  ).entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`continuation ${route} ${phase}`, async ({ page }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.previewContinuationProof(args.route, args.phase)
        },
        { route, phase }
      )

      await testInfo.attach('preview-continuation-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })
      const heldA = route === 'physical' ? 1 : 0

      const connection = {
        source: 'a',
        sourceHandle: 'out',
        target: 'c',
        targetHandle: 'in',
      }

      const initial = [
        claimEvent(
          'connectStart',
          {
            node: claimNodeA,
            handleId: 'out',
            activation: route === 'physical' ? 'pointer' : 'keyboard',
          },
          heldA
        ),
        ...(route === 'retained' ? [clickStart(claimNodeA)] : []),
      ]

      const ordinaryPreview = {
        kind: 'connect',
        from: { x: 175, y: 42.5 },
        to: { x: 421.5, y: 43.5 },
        candidate: connection,
        valid: true,
      }

      const viewportPhase =
        phase === 'viewportChange' ||
        phase === 'move' ||
        phase === 'update:viewport'

      const body = (() => {
        if (viewportPhase) {
          return [
            claimEvent('viewportStart', claimViewport, heldA),
            claimEvent('moveStart', claimViewport, heldA),
            claimEvent('viewportChange', { x: -15, y: 0, zoom: 1 }, heldA),
            ...(phase === 'viewportChange'
              ? []
              : [claimEvent('move', { x: -15, y: 0, zoom: 1 }, heldA)]),
            ...(phase === 'update:viewport'
              ? [
                  claimEvent(
                    'update:viewport',
                    { x: -15, y: 0, zoom: 1 },
                    heldA
                  ),
                ]
              : []),
            claimEvent('viewportEnd', {
              viewport: claimViewport,
              status: 'superseded',
            }),
            claimEvent('moveEnd', {
              viewport: claimViewport,
              status: 'superseded',
            }),
          ]
        }

        return [
          claimEvent('validate', connection, heldA),
          ...(phase === 'error'
            ? [
                claimEvent(
                  'error',
                  {
                    name: 'Error',
                    message: 'preview-check',
                    boundary: 'connection-validator',
                  },
                  heldA
                ),
              ]
            : []),
        ]
      })()

      const tail = (() => {
        if (phase === 'ordinary') {
          return [
            claimEvent('connectProgress', { preview: ordinaryPreview }, heldA),
            claimEvent('validate', connection, heldA),
          ]
        }

        return [
          claimEvent('connectEnd', {
            status: 'cancelled',
            reason: 'escape',
          }),
          ...(route === 'retained'
            ? [
                claimEvent('clickConnectEnd', {
                  status: 'cancelled',
                  reason: 'escape',
                }),
              ]
            : []),
          claimStart(claimNodeB),
        ]
      })()

      const captures =
        phase === 'ordinary'
          ? [{ action: 'set', target: 'a', id: 7 }]
          : [...capturePair('a', 7), { action: 'set', target: 'b', id: 7 }]

      const retainedCaptures =
        phase === 'ordinary' ? [] : [{ action: 'set', target: 'b', id: 7 }]

      expect(result).toStrictEqual({
        events: [...initial, ...body, ...tail],
        captures: route === 'physical' ? captures : retainedCaptures,
        held: phase === 'ordinary' ? heldA : 1,
        preview:
          phase === 'ordinary'
            ? ordinaryPreview
            : {
                kind: 'connect',
                from: { x: 375, y: 42.5 },
                to: { x: 375, y: 42.5 },
                candidate: {
                  source: 'b',
                  sourceHandle: 'out',
                  target: 'b',
                  targetHandle: 'out',
                },
                valid: false,
              },
        accepted: {
          document: {
            nodes: [claimNodeA, claimNodeB, claimNodeC],
            edges: [claimOldEdge],
          },
          viewport: claimViewport,
        },
      })
    })
  }
}

for (const [axis0, input] of (['pointer', 'keyboard'] as const).entries()) {
  for (const [axis1, trigger] of (
    ['none', 'start', 'progress', 'end'] as const
  ).entries()) {
    for (const [axis2, moved] of (trigger === 'progress'
      ? [true]
      : [false, true]
    ).entries()) {
      if (!representativeCombination([axis0, axis1, axis2])) {
        continue
      }

      test(`selection ${input} ${trigger} moved ${moved}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/gesture-ownership-harness.ts'
            const fixture: typeof NodeReentryHarness = await import(path)

            return fixture.selectionContinuationProof(
              args.input,
              args.trigger,
              args.moved
            )
          },
          { input, trigger, moved }
        )

        await testInfo.attach('selection-continuation-stream', {
          body: JSON.stringify(result),
          contentType: 'application/json',
        })
        const held = input === 'pointer' ? 1 : 0

        const position =
          input === 'pointer' ? { x: 650, y: 350 } : { x: 295, y: 42.5 }

        const rect =
          input === 'pointer'
            ? { ...position, width: 10, height: 10 }
            : { ...position, width: 5, height: 0 }

        const start = claimEvent(
          'selectionStart',
          { position, activation: input },
          held
        )

        const dragStart = claimEvent('selectionDragStart', { position }, held)
        const progress = claimEvent('selectionProgress', { rect }, held)

        const progressPair = moved
          ? [progress, claimEvent('selectionDrag', { rect }, held)]
          : []

        const changes = moved
          ? [
              claimEvent('selectionChange', { nodes: [], edges: [] }),
              claimEvent('change', {
                kind: 'selection-set',
                nodeIds: [],
                edgeIds: [],
              }),
            ]
          : []

        const quietReason =
          input === 'keyboard'
            ? 'selection-below-minimum-size'
            : 'no-selection-movement'

        const end = {
          status: moved ? 'accepted' : 'cancelled',
          reason: moved ? 'selection-complete' : quietReason,
        }

        const escape = { status: 'cancelled', reason: 'escape' }
        const nodeStart = claimEvent('nodeStart', claimNodeA, 1)

        const streams = {
          none: [
            start,
            dragStart,
            ...progressPair,
            ...changes,
            claimEvent('selectionEnd', end),
            claimEvent('selectionDragStop', end),
          ],
          start: [
            start,
            claimEvent('selectionEnd', escape),
            claimEvent('selectionDragStop', escape),
            nodeStart,
          ],
          progress: [
            start,
            dragStart,
            progress,
            claimEvent('selectionEnd', escape),
            claimEvent('selectionDragStop', escape),
            nodeStart,
          ],
          end: [
            start,
            dragStart,
            ...progressPair,
            ...changes,
            claimEvent('selectionEnd', end),
            nodeStart,
            claimEvent('selectionDragStop', end, 1),
          ],
        }

        const changed = moved && (trigger === 'none' || trigger === 'end')
        const nodes = [claimNodeA, claimNodeB, claimNodeC]
        expect(result).toStrictEqual({
          events: streams[trigger],
          captures: [
            ...(input === 'pointer' ? capturePair('canvas', 7) : []),
            ...(trigger === 'none'
              ? []
              : [{ action: 'set', target: 'a', id: 7 }]),
          ],
          held: trigger === 'none' ? 0 : 1,
          accepted: {
            document: {
              // Pinned react/src/utils/changes.ts:245-257 changes only previously selected B.
              nodes: changed
                ? [claimNodeA, { ...claimNodeB, selected: false }, claimNodeC]
                : nodes,
              edges: [
                changed ? { ...claimOldEdge, selected: false } : claimOldEdge,
              ],
            },
            viewport: claimViewport,
          },
        })
      })
    }
  }
}

test('aggregate cancellation retains entry owners across node End', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/gesture-ownership-harness.ts'
    const fixture: typeof NodeReentryHarness = await import(path)

    return fixture.retainedNodeCancellationProof()
  })

  await testInfo.attach('retained-node-cancellation-stream', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })
  expect(result.after.events.map((event) => event.name)).toStrictEqual([
    'connectStart',
    'clickConnectStart',
    'nodeStart',
    'nodeEnd',
    'connectStart',
    'nodeStop',
    'connectEnd',
    'clickConnectEnd',
  ])
  expect(result.after.preview?.from).toStrictEqual({ x: 375, y: 42.5 })
  expect(result.held).toBe(0)
  expect(result.accepted.document.edges.at(-1)).toStrictEqual({
    id: 'edge-2',
    source: 'b',
    sourceHandle: 'out',
    target: 'c',
    targetHandle: 'in',
  })
})

for (const [axis0, controlled] of [false, true].entries()) {
  for (const click of [false, true]) {
    test(`consumed successful first End admits B then disposal click ${click} controlled ${controlled}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.completionReentry(
            'connectEnd',
            false,
            args.controlled,
            false,
            args.click ? 'click-dispose' : 'dispose'
          )
        },
        { controlled, click }
      )

      await testInfo.attach('consumed-success-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })

      const connection = {
        source: 'a',
        sourceHandle: 'out',
        target: 'c',
        targetHandle: 'in',
      }

      const nodeB = {
        id: 'b',
        label: 'B',
        position: { x: 220, y: 20 },
        size: { width: 150, height: 45 },
        handles: [
          { id: 'out', kind: 'source', side: 'right' },
          { id: 'in', kind: 'target', side: 'left' },
        ],
      }

      expect(result.final.events).toStrictEqual([
        claimEvent(
          'connectStart',
          {
            node: claimNodeA,
            handleId: 'out',
            activation: click ? 'keyboard' : 'pointer',
          },
          click ? 0 : 1
        ),
        ...(click ? [clickStart(claimNodeA)] : []),
        claimEvent('validate', connection),
        claimEvent('connect', connection),
        claimEvent('change', {
          kind: 'edge-add',
          edge: { id: 'edge-2', ...connection },
        }),
        claimEvent('connectEnd', {
          status: controlled ? 'proposed' : 'accepted',
          reason: 'valid-connection',
          connection,
        }),
        claimStart(nodeB),
        claimEvent('dispose', 'after-B', 1),
        claimEvent('connectEnd', cancelledClaim),
      ])
      expect(result.final.captures).toStrictEqual([
        ...(click ? [] : capturePair('a', 7)),
        ...capturePair('b', 8),
      ])
      expect(result.final.accepted.document.edges).toStrictEqual([
        { ...claimOldEdge, id: 'old' },
        ...(controlled ? [] : [{ id: 'edge-2', ...connection }]),
      ])
      expect(result.final.held).toBe(0)
    })
  }

  for (const [axis1, phase] of (
    ['validation', 'connect', 'change', 'connectEnd'] as const
  ).entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`disposal boundary ${phase} controlled ${controlled}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.completionReentry(args.phase, true, args.controlled)
        },
        { phase, controlled }
      )

      await testInfo.attach('disposal-semantic-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })

      const connection = {
        source: 'a',
        sourceHandle: 'out',
        target: 'c',
        targetHandle: 'in',
      }

      const edge = { id: 'edge-1', ...connection }
      const change = { kind: 'edge-add', edge }

      const prefix = [
        claimStart(claimNodeA),
        claimEvent('validate', connection),
        ...(phase === 'validation' ? [] : [claimEvent('connect', connection)]),
        ...(phase === 'change' || phase === 'connectEnd'
          ? [claimEvent('change', change)]
          : []),
      ]

      const end = claimEvent('connectEnd', {
        status: controlled ? 'proposed' : 'accepted',
        reason: 'valid-connection',
        connection,
      })

      const expected =
        phase === 'connectEnd'
          ? [...prefix, end, claimEvent('dispose', phase)]
          : [
              ...prefix,
              claimEvent('dispose', phase),
              claimEvent('connectEnd', cancelledClaim),
            ]

      expect(result.final.events).toStrictEqual(expected)
      expect(result.final.changes).toStrictEqual(
        phase === 'change' || phase === 'connectEnd' ? [change] : []
      )
      expect(result.final.accepted.document.edges).toStrictEqual(
        phase === 'connectEnd' && !controlled ? [edge] : []
      )
      expect({
        captures: result.final.captures,
        held: result.final.held,
      }).toStrictEqual({ captures: capturePair('a', 7), held: 0 })
    })
  }
}

for (const [axis0, route] of (
  ['physical-reconnect', 'keyboard-reconnect', 'retained-click'] as const
).entries()) {
  for (const [axis1, threshold] of [0, 5].entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`rejected target Enter ${route} threshold ${threshold}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/gesture-ownership-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.reactiveCompletionProof(
            args.route,
            true,
            false,
            args.threshold,
            false
          )
        },
        { route, threshold }
      )

      await testInfo.attach('rejected-enter-stream', {
        body: JSON.stringify(result),
        contentType: 'application/json',
      })

      if (route === 'physical-reconnect' && threshold === 5) {
        expect(result.events[0]).toStrictEqual(
          claimEvent('threshold:equality', { events: [], preview: null }, 1)
        )
      }

      expect(
        result.events.filter((event) =>
          [
            'validate',
            'connect',
            'reconnect',
            'change',
            'connectEnd',
            'clickConnectEnd',
            'reconnectEnd',
          ].includes(event.name)
        )
      ).toStrictEqual([
        claimEvent('validate', {
          source: 'a',
          sourceHandle: 'out',
          target: 'c',
          targetHandle: 'in',
        }),
        claimEvent(route === 'retained-click' ? 'connectEnd' : 'reconnectEnd', {
          status: 'rejected',
          reason: 'invalid-target',
        }),
        ...(route === 'retained-click'
          ? [
              claimEvent('clickConnectEnd', {
                status: 'rejected',
                reason: 'invalid-target',
              }),
            ]
          : []),
      ])
      expect({
        held: result.held,
        lateQuiet: result.lateQuiet,
        accepted: result.accepted,
      }).toStrictEqual({
        held: 0,
        lateQuiet: true,
        accepted: {
          document: {
            nodes: [claimNodeA, claimNodeB, claimNodeC],
            edges: [claimOldEdge],
          },
          viewport: claimViewport,
        },
      })
    })
  }
}

for (const entry of ['editor', 'renderer'] as const) {
  test(`keyboard error ownership successor ${entry}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.keyboardPreviewProof(selected, 'error-successor')
    }, entry)

    await testInfo.attach('keyboard-error-successor-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })

    const start = {
      name: 'reconnectStart',
      payload: {
        edge: claimOldEdge,
        endpoint: 'source',
        activation: 'keyboard',
      },
    }

    const validate = {
      name: 'validate',
      payload: {
        source: 'c',
        sourceHandle: 'out',
        target: 'b',
        targetHandle: 'in',
      },
    }

    const error = {
      name: 'error',
      payload: {
        boundary: 'connection-validator',
        name: 'Error',
        message: 'preview-check',
      },
    }

    const end = {
      name: 'reconnectEnd',
      payload: { status: 'cancelled', reason: 'escape' },
    }

    expect(result.events).toStrictEqual([
      start,
      validate,
      error,
      end,
      start,
      validate,
      error,
      end,
    ])
    expect({
      held: result.held,
      captures: result.captures,
      preview: result.preview,
      rendered: result.rendered,
      frameworkError: result.frameworkError,
    }).toStrictEqual({
      held: 0,
      captures: [],
      preview: null,
      rendered: null,
      frameworkError: null,
    })
  })
}

for (const [axis0, route] of (
  ['physical-connect', 'retained-click'] as const
).entries()) {
  for (const [axis1, autoPan] of (['partial', 'full'] as const).entries()) {
    for (const [axis2, mounted] of [false, true].entries()) {
      for (const [axis3, controlled] of [false, true].entries()) {
        if (!representativeCombination([axis0, axis1, axis2, axis3])) {
          continue
        }

        test(`open observation ${route} ${autoPan} mounted ${mounted} controlled ${controlled}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/gesture-ownership-harness.ts'
              const fixture: typeof NodeReentryHarness = await import(path)

              return fixture.reactiveCompletionProof(
                args.route,
                args.mounted,
                args.controlled,
                0,
                true,
                args.autoPan
              )
            },
            { route, autoPan, mounted, controlled }
          )

          await testInfo.attach('completion-observation-stream', {
            body: JSON.stringify(result),
            contentType: 'application/json',
          })

          const retained = route === 'retained-click'
          const held = retained ? 0 : 1

          const viewport =
            autoPan === 'full' && !controlled
              ? { x: -15, y: 0, zoom: 1 }
              : claimViewport

          const completionStatus = controlled ? 'proposed' : 'accepted'
          const status = mounted ? completionStatus : 'disposed'

          const initial = {
            kind: 'connect',
            from: { x: 175, y: 42.5 },
            to: { x: 175, y: 42.5 },
            candidate: {
              source: 'a',
              sourceHandle: 'out',
              target: 'a',
              targetHandle: 'out',
            },
            valid: false,
          }

          const emptyPreview = { ...initial, candidate: null, valid: null }

          const progressPreview = {
            ...emptyPreview,
            to: { x: controlled ? 995 : 1010, y: 300 },
          }

          const connection = {
            source: 'a',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          }

          const edge = { id: 'edge-2', ...connection }

          const prefix = [
            claimStart(claimNodeA),
            ...(retained ? [clickStart(claimNodeA)] : []),
            claimEvent('watch:armed', 'nonnull', held),
            claimEvent('complete:target', null, held),
            claimEvent('viewportStart', claimViewport, held),
          ]

          const moves = (() => {
            if (autoPan === 'full') {
              return [
                claimEvent('moveStart', claimViewport, held),
                claimEvent('viewportChange', { x: -15, y: 0, zoom: 1 }, held),
                claimEvent('move', { x: -15, y: 0, zoom: 1 }, held),
                ...(controlled
                  ? [
                      claimEvent(
                        'update:viewport',
                        { x: -15, y: 0, zoom: 1 },
                        held
                      ),
                    ]
                  : [claimEvent('watch:preview', emptyPreview, held)]),
                claimEvent('watch:preview', progressPreview, held),
                claimEvent(
                  'connectProgress',
                  { preview: progressPreview },
                  held
                ),
              ]
            }

            return []
          })()

          const observationEnd = [
            claimEvent('viewportEnd', { viewport, status }),
            ...(autoPan === 'full'
              ? [claimEvent('moveEnd', { viewport, status })]
              : []),
          ]

          const success = [
            ...observationEnd,
            claimEvent('validate', connection),
            claimEvent('connect', connection),
            claimEvent('change', { kind: 'edge-add', edge }),
            claimEvent('connectEnd', {
              status: completionStatus,
              reason: 'valid-connection',
              connection,
            }),
            ...(retained
              ? [
                  claimEvent('clickConnectEnd', {
                    status: completionStatus,
                    reason: 'valid-connection',
                  }),
                ]
              : []),
          ]

          const cancelled = [
            claimEvent('watcher:enter', null),
            claimEvent('beforeUnmount', 1),
            ...observationEnd,
            claimEvent('connectEnd', cancelledClaim),
            ...(retained
              ? [claimEvent('clickConnectEnd', cancelledClaim)]
              : []),
            claimEvent('watcher:return', null),
          ]

          expect(result).toStrictEqual({
            initial,
            lateQuiet: true,
            events: [
              ...prefix,
              ...moves,
              claimEvent('watch:null', null),
              ...(mounted ? success : cancelled),
              claimEvent('complete:return', null),
            ],
            captures: capturePair('a', 7),
            held: 0,
            accepted: {
              document: {
                nodes: [claimNodeA, claimNodeB, claimNodeC],
                edges:
                  mounted && !controlled
                    ? [claimOldEdge, edge]
                    : [claimOldEdge],
              },
              viewport,
            },
          })
        })
      }
    }
  }
}

const publicEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

for (const [axis0, mode] of (
  ['selectionChange', 'change', 'pan', 'auto-pan'] as const
).entries()) {
  for (const [axis1, controlled] of [false, true].entries()) {
    for (const [axis2, cancelPhase] of (mode === 'auto-pan'
      ? (['viewportStart', 'moveStart'] as const)
      : (['viewportStart'] as const)
    ).entries()) {
      if (!representativeCombination([axis0, axis1, axis2])) {
        continue
      }

      test(`literal ${mode} controlled ${controlled} cancellation ${cancelPhase}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/gesture-ownership-harness.ts'
            const fixture: typeof NodeReentryHarness = await import(path)

            return fixture.continuationReentry(
              args.mode,
              args.controlled,
              args.cancelPhase
            )
          },
          { mode, controlled, cancelPhase }
        )

        await testInfo.attach('literal-continuation-stream', {
          body: JSON.stringify(result),
          contentType: 'application/json',
        })
        const status = controlled ? 'proposed' : 'accepted'

        if (mode === 'pan') {
          // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 retains the last transform, not the release point.
          const terminal = claimViewport

          expect(result.final.events).toStrictEqual([
            publicEvent('viewportStart', claimViewport),
            publicEvent('moveStart', claimViewport),
            publicEvent('viewportChange', { x: 0, y: 0, zoom: 1 }),
            publicEvent('move', { x: 0, y: 0, zoom: 1 }),
            publicEvent('viewportEnd', {
              viewport: claimViewport,
              status: 'superseded',
            }),
            publicEvent('moveEnd', {
              viewport: claimViewport,
              status: 'superseded',
            }),
            publicEvent('viewportStart', claimViewport),
            publicEvent('moveStart', claimViewport),
            publicEvent('viewportChange', { x: 0, y: 0, zoom: 1 }),
            publicEvent('move', { x: 0, y: 0, zoom: 1 }),
            publicEvent('viewportEnd', {
              viewport: terminal,
              status: 'accepted',
            }),
            publicEvent('moveEnd', { viewport: terminal, status: 'accepted' }),
          ])
          expect(result.final.accepted.viewport).toStrictEqual(terminal)
        } else if (mode === 'auto-pan') {
          const connection = {
            source: 'b',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          }

          expect(result.final.events).toStrictEqual([
            publicEvent('connectStart', {
              node: claimNodeA,
              handleId: 'out',
              activation: 'pointer',
            }),
            publicEvent('viewportStart', claimViewport),
            ...(cancelPhase === 'moveStart'
              ? [publicEvent('moveStart', claimViewport)]
              : []),
            publicEvent('viewportEnd', {
              viewport: claimViewport,
              status: 'superseded',
            }),
            ...(cancelPhase === 'moveStart'
              ? [
                  publicEvent('moveEnd', {
                    viewport: claimViewport,
                    status: 'superseded',
                  }),
                ]
              : []),
            publicEvent('connectEnd', {
              status: 'cancelled',
              reason: 'pointer-cancel',
            }),
            publicEvent('connectStart', {
              node: claimNodeB,
              handleId: 'out',
              activation: 'pointer',
            }),
            publicEvent('connect', connection),
            publicEvent('change', {
              kind: 'edge-add',
              edge: { id: 'edge-2', ...connection },
            }),
            publicEvent('connectEnd', {
              status,
              reason: 'valid-connection',
              connection,
            }),
          ])
          expect(result.afterA.preview?.from).toStrictEqual({ x: 375, y: 42.5 })
        } else {
          const startA = [
            publicEvent('selectionStart', {
              position: { x: 560, y: 300 },
              activation: 'pointer',
            }),
            publicEvent('selectionDragStart', { position: { x: 560, y: 300 } }),
          ]

          const startB = [
            publicEvent('selectionStart', {
              position: { x: 660, y: 400 },
              activation: 'pointer',
            }),
            publicEvent('selectionDragStart', { position: { x: 660, y: 400 } }),
          ]

          const selected = publicEvent('selectionChange', {
            nodes: [],
            edges: [],
          })

          const change = publicEvent('change', {
            kind: 'selection-set',
            nodeIds: [],
            edgeIds: [],
          })

          const ends = [
            publicEvent('selectionEnd', {
              status,
              reason: 'selection-complete',
            }),
            publicEvent('selectionDragStop', {
              status,
              reason: 'selection-complete',
            }),
          ]

          const middle =
            mode === 'selectionChange'
              ? [...startB, change]
              : [change, ...startB]

          expect(result.final.events).toStrictEqual([
            ...startA,
            selected,
            ...middle,
            ...ends,
            selected,
            change,
            ...ends,
          ])
        }

        expect({
          afterHeld: result.afterA.held,
          held: result.final.held,
          captures: result.final.captureHistory,
        }).toStrictEqual({
          afterHeld: 1,
          held: 0,
          captures:
            mode === 'auto-pan'
              ? [...capturePair('a', 7), ...capturePair('b', 8)]
              : [...capturePair('canvas', 7), ...capturePair('canvas', 8)],
        })
      })
    }
  }
}

const continuationEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

for (const mutation of ['remove', 'kind', 'metadata'] as const) {
  test(`reconnect current endpoint ${mutation}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (mutationInput) => {
      const path = '/e2e/gesture-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourReconnect(mutationInput)
    }, mutation)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('full-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    expect(result.validationsAtCallback).toBeGreaterThan(0)
    expect(result.validations).toBe(result.validationsAtCallback)
    const edge = { ...claimOldEdge, target: 'c' }

    const connection = {
      source: 'a',
      sourceHandle: 'out',
      target: 'c',
      targetHandle: 'in',
    }

    expect(result.events).toStrictEqual([
      continuationEvent('reconnectStart', {
        edge: claimOldEdge,
        endpoint: 'target',
        activation: 'pointer',
      }),
      continuationEvent('reconnect', { edge, connection }),
      continuationEvent(
        'reconnectEnd',
        mutation === 'metadata'
          ? { status: 'accepted', reason: 'valid-reconnection', connection }
          : { status: 'rejected', reason: 'invalid-target' }
      ),
    ])
    expect(result.changes).toStrictEqual(
      mutation === 'metadata' ? [{ kind: 'edge-reconnect', edge }] : []
    )
    expect(result.document).toStrictEqual({
      nodes: [
        claimNodeA,
        claimNodeB,
        (() => {
          if (mutation === 'metadata') {
            return claimNodeC
          }

          return {
            ...claimNodeC,
            handles:
              mutation === 'remove'
                ? []
                : [{ id: 'in', kind: 'source', side: 'left' }],
          }
        })(),
      ],
      edges: [mutation === 'metadata' ? edge : claimOldEdge],
    })
    expect(result.captures).toStrictEqual([
      { action: 'set', target: 'target', id: 7 },
      { action: 'release', target: 'target', id: 7 },
    ])
    expect(result.held).toBe(0)
  })
}
