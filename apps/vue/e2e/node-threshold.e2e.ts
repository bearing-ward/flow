import { test, expect } from '@playwright/test'

import type { PhysicalActor } from '../../shared-e2e/node-reentry-fixture.ts'
import { nodeThresholdContract } from '../../shared-e2e/node-threshold-contract.ts'
import type * as NodeReentryHarness from './node-reentry-harness.ts'

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

const frameworkRecursion = {
  name: 'TypeError',
  message: "Cannot read properties of null (reading 'component')",
}

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

nodeThresholdContract('vue')

for (const phase of ['end', 'stop']) {
  test(`synthetic capture: Vue ${phase} callback can begin a replacement with the same pointer ID`, async ({
    page,
  }) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(
      async ({ path, phase: terminal }) => {
        const harness = await import(path)

        return harness.terminalReentry(terminal)
      },
      { path: '/e2e/node-reentry-harness.ts', phase }
    )

    expect(result).toEqual({
      events:
        phase === 'end'
          ? [
              'start:source',
              'end:source',
              'start:target',
              'stop:source',
              'end:target',
              'stop:target',
            ]
          : [
              'start:source',
              'end:source',
              'stop:source',
              'start:target',
              'end:target',
              'stop:target',
            ],
      replacementCaptured: true,
      released: true,
      proposals: [
        { nodeId: 'source', position: { x: 60, y: 70 } },
        { nodeId: 'target', position: { x: 302, y: 220 } },
      ],
    })
  })
}

for (const phase of ['end', 'stop']) {
  test(`synthetic capture: Vue unmount ${phase} reentry cannot acquire replacement`, async ({
    page,
  }) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(
      async ({ path, phase: terminal }) => {
        const harness = await import(path)

        return harness.terminalReentry(terminal, true)
      },
      { path: '/e2e/node-reentry-harness.ts', phase }
    )

    expect(result).toEqual({
      events: ['start:source', 'end:source', 'stop:source'],
      captures: ['source'],
      sourceReleased: true,
      changes: [],
      replacementCaptured: false,
      released: true,
      proposals: [],
    })

    const remounted = await page.evaluate(
      async ({ path, phase: terminal }) => {
        const harness = await import(path)

        return harness.terminalReentry(terminal)
      },
      { path: '/e2e/node-reentry-harness.ts', phase }
    )

    expect({
      captured: remounted.replacementCaptured,
      released: remounted.released,
      proposals: remounted.proposals,
    }).toEqual({
      captured: true,
      released: true,
      proposals: [
        { nodeId: 'source', position: { x: 60, y: 70 } },
        { nodeId: 'target', position: { x: 302, y: 220 } },
      ],
    })
  })
}

for (const phase of ['end', 'stop']) {
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
      test(`round two synthetic capture: Vue disposal ${phase} ${actor} threshold ${threshold} complete ${complete}`, async ({
        page,
      }) => {
        await page.goto('/connection-threshold.html')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
            const harness = await import(path)

            return harness.physicalReentry(...args)
          },
          [phase, actor, threshold, complete]
        )

        const expected = {
          events: [
            'start:a',
            'end:a:cancelled:superseded',
            'stop:a:cancelled:superseded',
          ],
          captures: ['a'],
          held: 0,
          changes: [],
        }

        expect(result).toEqual({ afterTrigger: expected, ...expected })

        const fresh = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
            const harness = await import(path)

            return harness.physicalReentry(...args, 'fresh')
          },
          [phase, actor, threshold, false]
        )

        expect(fresh.afterTrigger.held).toBe(1)
        expect(fresh.held).toBe(0)

        if (actor === 'pan') {
          expect(fresh.events).toEqual(['moveStart', 'moveEnd'])
        }

        expect(
          fresh.changes.map((change: { kind: string }) => change.kind)
        ).toEqual(
          {
            node: ['node-position'],
            connection: ['edge-add'],
            reconnection: ['edge-reconnect'],
            resize: ['node-bounds'],
            selection: ['selection-set'],
            pan: [],
          }[actor]
        )
      })
    }
  }

  for (const actor of ['connection', 'reconnection']) {
    test(`round two synthetic capture: Vue pointercancel ${phase} retains ${actor} completion`, async ({
      page,
    }) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const harness = await import(path)

          return harness.physicalReentry(...args, 0, false, 'cancel')
        },
        [phase, actor]
      )

      const start = actor === 'connection' ? 'connectStart' : 'reconnectStart'

      const nodeEvents =
        phase === 'end'
          ? [
              'start:a',
              'end:a:cancelled:pointer-cancel',
              start,
              'stop:a:cancelled:pointer-cancel',
            ]
          : [
              'start:a',
              'end:a:cancelled:pointer-cancel',
              'stop:a:cancelled:pointer-cancel',
              start,
            ]

      expect(result.afterTrigger).toEqual({
        events: nodeEvents,
        captures: ['a', actor === 'connection' ? 'b' : 'target'],
        held: 1,
        changes: [],
      })
      expect(result.events).toEqual([
        ...nodeEvents,
        actor === 'connection' ? 'connect:b-c' : 'reconnect:a-c',
        actor === 'connection'
          ? 'connectEnd:accepted:valid-connection'
          : 'reconnectEnd:accepted:valid-reconnection',
      ])
      expect(result.held).toBe(0)
      expect(result.changes).toEqual(
        actor === 'connection'
          ? [
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
            ]
          : [
              {
                kind: 'edge-reconnect',
                edge: {
                  id: 'edge',
                  selected: true,
                  reconnectable: true,
                  source: 'a',
                  sourceHandle: 'out',
                  target: 'c',
                  targetHandle: 'in',
                },
              },
            ]
      )
    })
  }
}

for (const actor of ['connection', 'reconnection']) {
  test(`round two synthetic capture: Vue connection cancellation detaches before ${actor} callback reentry`, async ({
    page,
  }) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (replacement) => {
      const path = '/e2e/node-reentry-harness.ts'
      const harness = await import(path)

      return harness.physicalReentry(
        'connection-end',
        replacement,
        0,
        false,
        'cancel'
      )
    }, actor)

    const start = actor === 'connection' ? 'connectStart' : 'reconnectStart'
    expect(result.afterTrigger).toEqual({
      events: ['connectStart', 'connectEnd:cancelled:pointer-cancel', start],
      captures: ['a', actor === 'connection' ? 'b' : 'target'],
      held: 1,
      changes: [],
    })
    expect(result.events).toEqual([
      'connectStart',
      'connectEnd:cancelled:pointer-cancel',
      start,
      actor === 'connection' ? 'connect:b-c' : 'reconnect:a-c',
      actor === 'connection'
        ? 'connectEnd:accepted:valid-connection'
        : 'reconnectEnd:accepted:valid-reconnection',
    ])
    expect(result.held).toBe(0)
    expect(
      result.changes.map((change: { kind: string }) => change.kind)
    ).toEqual([actor === 'connection' ? 'edge-add' : 'edge-reconnect'])
  })
}

for (const phase of [
  'connect',
  'change',
  'reconnect',
  'connectEnd',
  'reconnectEnd',
] as const) {
  test(`round three C1 synthetic successful ${phase} reentry`, async ({
    page,
  }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'

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
  test(`round three D1 synthetic disposal in ${phase}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'

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

for (const route of [
  'physical-connect',
  'physical-reconnect',
  'retained-click',
  'keyboard-reconnect',
  'node-control',
] as const) {
  for (const recursive of [false, true]) {
    test(`round three D2-R synthetic public watcher ${route} recursive ${recursive}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/connection-threshold.html')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'

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
        claimEvent('outer:error', frameworkRecursion),
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
        frameworkError: nested ? frameworkRecursion : null,
      })
    })
  }
}

for (const mode of ['selectionChange', 'change', 'pan', 'auto-pan'] as const) {
  test(`round three S1 P1 synthetic ${mode} continuation`, async ({
    page,
  }, testInfo) => {
    await page.goto('/connection-threshold.html')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'

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
      expect(result.final.accepted.viewport).toEqual({ x: 40, y: 40, zoom: 1 })
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

for (const live of [
  'physical-connect',
  'physical-reconnect',
  'retained-click',
  'keyboard-reconnect',
  'node-control',
  'none',
  'selection',
  'pan',
] as const) {
  for (const recursive of [false, true]) {
    test(`round three D2 claims physical ${live} recursive ${recursive}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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
      expect(result.frameworkError).toEqual(
        recursive && live !== 'node-control'
          ? {
              name: 'TypeError',
              message: "Cannot read properties of null (reading 'component')",
            }
          : null
      )
    })
  }
}

for (const threshold of [0, 5]) {
  for (const route of [
    'physical-connect',
    'physical-reconnect',
    'retained-click',
    'keyboard-reconnect',
  ] as const) {
    for (const mounted of [false, true]) {
      for (const controlled of [false, true]) {
        // eslint-disable-next-line complexity -- Keep complete literal streams for all route, promotion, watcher and control combinations together.
        test(`round three D2-R2 completion watcher ${route} mounted ${mounted} controlled ${controlled} threshold ${threshold}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/node-reentry-harness.ts'
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
                    to: { x: 210, y: 43.5 },
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

for (const liveCase of liveClaimCases) {
  for (const recursive of [false, true]) {
    for (const claimRoute of ['physical', 'click', 'reconnect'] as const) {
      for (const controlled of [false, true]) {
        // eslint-disable-next-line complexity -- The matrix keeps registration, resource and per-port notification order in one assertion.
        test(`round three D2 literal drain ${claimRoute} ${liveCase.live} ${liveCase.entry} controlled ${controlled} recursive ${recursive}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/node-reentry-harness.ts'
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
            claimEvent('outer:error', frameworkRecursion),
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

for (const disposeOnLoss of [false, true]) {
  test(`round three native capture release ordering Vue dispose ${disposeOnLoss}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')
    await page.evaluate(async (dispose) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)
      await fixture.mountNativeTerminalProof(dispose)
    }, disposeOnLoss)

    const source = page.locator(
      '#native-terminal-proof [data-node-id="a"] [data-handle-id="out"]'
    )

    const destination = page.locator(
      '#native-terminal-proof [data-node-id="c"] [data-handle-id="in"]'
    )

    const sourceBox = await source.boundingBox()
    const targetBox = await destination.boundingBox()

    if (sourceBox === null || targetBox === null) {
      throw new Error('Missing native handle geometry')
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2
    )
    await page.mouse.up()

    const receipt = await page
      .locator('#native-terminal-proof')
      .getAttribute('data-receipt')

    if (receipt === null) {
      throw new Error('Missing native receipt')
    }

    await testInfo.attach('native-release-receipt', {
      body: receipt,
      contentType: 'application/json',
    })
    const result = JSON.parse(receipt)
    expect(
      result.events.filter((event: { name: string }) =>
        event.name.startsWith('native:')
      )
    ).toStrictEqual([
      {
        name: 'native:set',
        payload: { target: 'a', id: 1, captured: true },
        held: 1,
      },
      { name: 'native:up:capture', payload: { id: 1, trusted: true }, held: 1 },
      {
        name: 'native:release',
        payload: { target: 'a', id: 1, captured: false },
        held: 0,
      },
      { name: 'native:loss', payload: { id: 1, trusted: true }, held: 0 },
      ...(disposeOnLoss
        ? [
            { name: 'native:dispose:enter', payload: null, held: 0 },
            { name: 'native:dispose:return', payload: null, held: 0 },
          ]
        : []),
    ])
    expect(
      result.events.filter(
        (event: { name: string }) => event.name === 'connectEnd'
      )
    ).toStrictEqual([
      {
        name: 'connectEnd',
        payload: {
          status: 'accepted',
          reason: 'valid-connection',
          connection: {
            source: 'a',
            sourceHandle: 'out',
            target: 'c',
            targetHandle: 'in',
          },
        },
        held: 0,
      },
    ])
    expect(result.held).toBe(0)
    await page.locator('#native-terminal-proof').dispatchEvent('proof-cleanup')
  })
}

const continuationCallbackOracles = {
  'viewportStart:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'moveStart:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'viewportChange:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'move:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'viewportEnd:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'viewportStart:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
  ],
  'moveStart:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
  ],
  'viewportChange:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
  ],
  'move:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
  ],
  'viewportEnd:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 0,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 0,
    },
  ],
  'pan-nested:false': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 7,
        y: 9,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 7,
        y: 9,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 7,
          y: 9,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 7,
          y: 9,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
  'pan-nested:true': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 7,
        y: 9,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 7,
        y: 9,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 7,
        y: 9,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 0,
    },
  ],
}

const continuationJoinedOracles = {
  false: [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 1,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
      held: 1,
    },
  ],
  true: [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 50,
        y: 50,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'update:viewport',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
      held: 1,
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 1,
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'proposed',
      },
      held: 1,
    },
  ],
}

const continuationResourceOracles = {
  matching: [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'update:viewport',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'proposed',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'proposed',
      },
    },
  ],
  nonmatching: [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'update:viewport',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 3,
          y: 4,
          zoom: 1,
        },
        status: 'superseded',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 3,
          y: 4,
          zoom: 1,
        },
        status: 'superseded',
      },
    },
  ],
  animation: [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 10,
        y: 15,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 10,
        y: 15,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 20,
        y: 30,
        zoom: 1,
      },
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'accepted',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 20,
          y: 30,
          zoom: 1,
        },
        status: 'accepted',
      },
    },
  ],
  'stale-frame': [
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 10,
        y: 15,
        zoom: 1,
      },
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        status: 'superseded',
      },
    },
    {
      name: 'viewportStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'moveStart',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
    {
      name: 'viewportChange',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
    },
    {
      name: 'move',
      payload: {
        x: 70,
        y: 90,
        zoom: 1,
      },
    },
    {
      name: 'viewportEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
    },
    {
      name: 'moveEnd',
      payload: {
        viewport: {
          x: 70,
          y: 90,
          zoom: 1,
        },
        status: 'accepted',
      },
    },
  ],
}

for (const phase of [
  'viewportStart',
  'moveStart',
  'viewportChange',
  'move',
  'viewportEnd',
  'pan-nested',
] as const) {
  for (const controlled of [false, true]) {
    test(`round three P2 P3 viewport callback ${phase} controlled ${controlled}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
          const fixture: typeof NodeReentryHarness = await import(path)

          return fixture.viewportOwnershipProof(args.phase, args.controlled)
        },
        { phase, controlled }
      )

      process.stdout.write(
        `${JSON.stringify({ receipt: testInfo.title, result })}\n`
      )
      await testInfo.attach('viewport-full-stream', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
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
    })
  }
}

for (const entry of ['editor', 'renderer'] as const) {
  for (const mode of [
    'ordinary',
    'escape',
    'error',
    'dispose',
    'error-dispose',
  ] as const) {
    test(`round three P4 keyboard preview ${entry} ${mode}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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
      ).toStrictEqual(
        entry === 'renderer' && mode === 'ordinary'
          ? [
              {
                source: 'c',
                sourceHandle: 'out',
                target: 'b',
                targetHandle: 'in',
              },
              {
                source: 'c',
                sourceHandle: 'out',
                target: 'b',
                targetHandle: 'in',
              },
            ]
          : [
              {
                source: 'c',
                sourceHandle: 'out',
                target: 'b',
                targetHandle: 'in',
              },
            ]
      )

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

for (const phase of [
  'connect',
  'change',
  'reconnect',
  'connectEnd',
  'reconnectEnd',
] as const) {
  for (const controlled of [false, true]) {
    for (const reconnectB of [false, true]) {
      // eslint-disable-next-line complexity -- Each phase asserts its complete literal stream, including controlled and reconnect successor variants.
      test(`round three C1 complete stream ${phase} controlled ${controlled} reconnectB ${reconnectB}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
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
  test(`round three C4 S2 D3 semantic ${scenario.actor} ${scenario.action}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (args) => {
      const path = '/e2e/node-reentry-harness.ts'
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
          nodes: nodes.map((node) => ({ ...node, selected: false })),
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
  test(`round three D2-R3 frozen resources recursive ${recursive}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (value) => {
      const path = '/e2e/node-reentry-harness.ts'
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
    expect(result.frameworkError).toStrictEqual(
      recursive ? frameworkRecursion : null
    )
  })
}

for (const promoted of [false, true]) {
  test(`round three C2 retained target candidate promoted ${promoted}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (promotion) => {
      const path = '/e2e/node-reentry-harness.ts'
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

for (const route of ['physical', 'retained'] as const) {
  for (const phase of [
    'ordinary',
    'validate',
    'error',
    'viewportChange',
    'move',
    'update:viewport',
  ] as const) {
    test(`round three P4 continuation ${route} ${phase}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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

for (const controlled of [false, true]) {
  test(`round three P3 pan joins request controlled ${controlled}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (control) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.viewportOwnershipProof('pan-nested-request', control)
    }, controlled)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('joined-request-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
    expect(result.events).toStrictEqual(
      continuationJoinedOracles[`${controlled}`]
    )
    expect(result.nestedResult).toStrictEqual({
      requestId: 1,
      status: controlled ? 'proposed' : 'accepted',
      viewport: { x: 70, y: 90, zoom: 1 },
    })
    expect(result.held).toBe(0)
  })
}

for (const input of ['pointer', 'keyboard'] as const) {
  for (const trigger of ['none', 'start', 'progress', 'end'] as const) {
    for (const moved of trigger === 'progress' ? [true] : [false, true]) {
      test(`round three S2 selection ${input} ${trigger} moved ${moved}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
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
              nodes: changed
                ? nodes.map((node) => ({ ...node, selected: false }))
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

test('round three C2 aggregate cancellation retains entry owners across node End', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const path = '/e2e/node-reentry-harness.ts'
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

for (const controlled of [false, true]) {
  for (const click of [false, true]) {
    test(`round three D2 consumed successful first End admits B then disposal click ${click} controlled ${controlled}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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

  for (const phase of [
    'validation',
    'connect',
    'change',
    'connectEnd',
  ] as const) {
    test(`round three D1 disposal boundary ${phase} controlled ${controlled}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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

for (const route of [
  'matching',
  'nonmatching',
  'animation',
  'stale-frame',
] as const) {
  test(`round three P3 request resource ${route}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.viewportRequestProof(selected)
    }, route)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('request-resource-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
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
  })
}

for (const route of [
  'physical-reconnect',
  'keyboard-reconnect',
  'retained-click',
] as const) {
  for (const threshold of [0, 5]) {
    test(`round three C3 rejected target Enter ${route} threshold ${threshold}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/node-reentry-harness.ts'
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
  test(`round three P4 keyboard error ownership successor ${entry}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'
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

for (const route of ['physical-connect', 'retained-click'] as const) {
  for (const autoPan of ['partial', 'full'] as const) {
    for (const mounted of [false, true]) {
      for (const controlled of [false, true]) {
        test(`round three D2-R2 open observation ${route} ${autoPan} mounted ${mounted} controlled ${controlled}`, async ({
          page,
        }, testInfo) => {
          await page.goto('/')

          const result = await page.evaluate(
            async (args) => {
              const path = '/e2e/node-reentry-harness.ts'
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

for (const mode of ['selectionChange', 'change', 'pan', 'auto-pan'] as const) {
  for (const controlled of [false, true]) {
    for (const cancelPhase of mode === 'auto-pan'
      ? (['viewportStart', 'moveStart'] as const)
      : (['viewportStart'] as const)) {
      test(`round three S1 P1 P2 literal ${mode} controlled ${controlled} cancellation ${cancelPhase}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
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
          const terminal = controlled
            ? claimViewport
            : { x: 40, y: 40, zoom: 1 }

          expect(result.final.events).toStrictEqual([
            publicEvent('viewportStart', claimViewport),
            publicEvent('moveStart', claimViewport),
            publicEvent('viewportChange', { x: 50, y: 50, zoom: 1 }),
            publicEvent('move', { x: 50, y: 50, zoom: 1 }),
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
            publicEvent('viewportChange', { x: 40, y: 40, zoom: 1 }),
            publicEvent('move', { x: 40, y: 40, zoom: 1 }),
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

for (const acknowledge of [1, 2, 65] as const) {
  test(`round three P3 acknowledgement bound64 key ${acknowledge}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (selected) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.viewportAcknowledgementProof(selected)
    }, acknowledge)

    await testInfo.attach('bounded-acknowledgement-stream', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })

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
  })
}

for (const route of ['wheel', 'doubleclick', 'editor'] as const) {
  for (const joined of [false, true]) {
    for (const controlled of [false, true]) {
      test(`round three P3 ordinary ${route} joined ${joined} controlled ${controlled}`, async ({
        page,
      }, testInfo) => {
        await page.goto('/')

        const result = await page.evaluate(
          async (args) => {
            const path = '/e2e/node-reentry-harness.ts'
            const fixture: typeof NodeReentryHarness = await import(path)

            return fixture.ordinaryViewportProof(
              args.route,
              args.joined,
              args.controlled
            )
          },
          { route, joined, controlled }
        )

        await testInfo.attach('ordinary-viewport-stream', {
          body: JSON.stringify(result),
          contentType: 'application/json',
        })

        const target = {
          wheel: { x: -10, y: -20, zoom: 1 },
          doubleclick: { x: -20, y: -10, zoom: 1.2 },
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

        const panTail = [
          publicEvent('viewportChange', claimViewport),
          publicEvent('move', claimViewport),
          ...(controlled
            ? [publicEvent('update:viewport', claimViewport)]
            : []),
          publicEvent('viewportEnd', {
            viewport: claimViewport,
            status: 'accepted',
          }),
          publicEvent('moveEnd', {
            viewport: claimViewport,
            status: 'accepted',
          }),
        ]

        const afterViewport = controlled ? claimViewport : target
        expect(result).toStrictEqual({
          afterWrite: {
            events: joined ? before : [...before, ...instantTail],
            held: joined ? 1 : 0,
            viewport: afterViewport,
          },
          events: [...before, ...(joined ? panTail : instantTail)],
          captures: joined ? capturePair('canvas', 7) : [],
          held: 0,
          viewport: joined ? claimViewport : afterViewport,
        })
      })
    }
  }
}

const continuationEvent = <Payload>(name: string, payload: Payload) => ({
  name,
  payload,
})

const continuationStart = [
  continuationEvent('viewportStart', { x: 0, y: 0, zoom: 1 }),
  continuationEvent('moveStart', { x: 0, y: 0, zoom: 1 }),
]

const continuationEnd = (
  status: string,
  viewport: { x: number; y: number; zoom: number }
) => [
  continuationEvent('viewportEnd', { viewport, status }),
  continuationEvent('moveEnd', { viewport, status }),
]

const continuationProgress = (viewport: {
  x: number
  y: number
  zoom: number
}) => [
  continuationEvent('viewportChange', viewport),
  continuationEvent('move', viewport),
]

for (const route of [
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
] as const) {
  test(`round four viewport continuation ${route}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (routeInput) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourViewport(routeInput)
    }, route)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('full-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
    const zero = { x: 0, y: 0, zoom: 1 }

    const firstProposal = [
      ...continuationStart,
      ...continuationProgress({ x: 10, y: 0, zoom: 1 }),
      continuationEvent('update:viewport', { x: 10, y: 0, zoom: 1 }),
      ...continuationEnd('proposed', { x: 10, y: 0, zoom: 1 }),
    ]

    if (route === 'editor' || route === 'wheel' || route === 'doubleclick') {
      const target = (() => {
        if (route === 'editor') {
          return { x: 7, y: 9, zoom: 1 }
        }

        if (route === 'wheel') {
          return { x: -10, y: -20, zoom: 1 }
        }

        return { x: -20, y: -10, zoom: 1.2 }
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
        continuationEvent('moveEnd', { viewport: zero, status: 'superseded' }),
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
      expect(result.events).toStrictEqual([
        ...(route === 'pan'
          ? [...continuationStart, ...continuationEnd('superseded', zero)]
          : []),
        ...continuationStart,
        ...(route === 'partial'
          ? continuationProgress({ x: 7, y: 9, zoom: 1 })
          : []),
        ...continuationProgress(zero),
        ...continuationEnd('accepted', zero),
      ])
      expect(result.results).toStrictEqual(
        route === 'pan'
          ? { A: { requestId: 1, status: 'superseded', viewport: zero } }
          : {}
      )
      expect(result.viewport).toStrictEqual(zero)
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
  })
}

for (const mutation of ['remove', 'kind', 'metadata'] as const) {
  test(`round four reconnect current endpoint ${mutation}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (mutationInput) => {
      const path = '/e2e/node-reentry-harness.ts'
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

for (const mode of [
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
] as const) {
  // eslint-disable-next-line complexity -- Assert each error and disposal schedule with its complete literal histories.
  test(`round four Q-E request error ${mode}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (modeInput) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourRequestError(modeInput)
    }, mode)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    await testInfo.attach('full-error-receipt', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    })
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

    let beforeEvents: { name: string; payload: unknown }[]

    if (successor) {
      beforeEvents = [
        ...continuationStart,
        ...(mode === 'end-C'
          ? [superseded[0], ...continuationStart, superseded[1]]
          : [...continuationStart, ...superseded]),
        ...continuationProgress(zero),
        ...continuationProgress({ x: 80, y: 90, zoom: 1 }),
        ...continuationEnd('accepted', { x: 80, y: 90, zoom: 1 }),
      ].filter((value) => value !== undefined)
    } else if (disposal) {
      beforeEvents = [
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
      beforeEvents = [...continuationStart, ...continuationProgress(zero)]
    } else if (late) {
      beforeEvents = [
        ...continuationStart,
        ...superseded,
        ...continuationStart,
        ...(mode === 'late-dispose'
          ? disposed
          : [...superseded, ...continuationStart]),
      ]
    } else {
      beforeEvents = [
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
    }

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
          return [
            { name: 'A', value: { message: 'raf-next', identity: 'raf' } },
          ]
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
            ...(mode === 'late-dispose'
              ? []
              : [{ op: 'request', handle: 103 }]),
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
  })
}

for (const mode of [
  'decode-target',
  'decode-duration',
  'decode-duration-type',
  'decode-id',
] as const) {
  test(`round four Q-E5 decode ownership ${mode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.continuationRoundFourRequestError(input)
    }, mode)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
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
  })
}

for (const route of [
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
] as const) {
  test(`ownership round five viewport ${route}`, async ({ page }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundFiveViewport(input)
    }, route)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
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
                viewport:
                  route === 'request-during-pan' ? seven : finalViewport,
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
  })
}

for (const switchMode of [false, true]) {
  test(`ownership round seven external observation nested producing write switch mode ${switchMode}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (modeInput) => {
      const path = '/e2e/node-reentry-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.externalNestedViewportProof(modeInput)
    }, switchMode)

    await testInfo.attach('external-nested-family', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
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

    const events = [
      ...prefix,
      publicEvent('viewportEnd', {
        viewport: switchMode ? one : seven,
        status: switchMode ? 'accepted' : 'proposed',
      }),
      publicEvent('moveEnd', {
        viewport: switchMode ? one : seven,
        status: switchMode ? 'accepted' : 'proposed',
      }),
    ]

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
  })
}
