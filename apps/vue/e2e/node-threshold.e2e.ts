import { test, expect } from '@playwright/test'

import type { PhysicalActor } from '../../shared-e2e/node-reentry-fixture.ts'
import { nodeThresholdContract } from '../../shared-e2e/node-threshold-contract.ts'
import { representativeCombination } from '../../shared-e2e/representative-cases.ts'
import type * as NodeReentryHarness from './node-reentry-harness.ts'

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
  }, testInfo) => {
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

    await testInfo.attach('remount-admission', {
      body: JSON.stringify(remounted),
      contentType: 'application/json',
    })

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

for (const [axis0, phase] of ['end', 'stop'].entries()) {
  for (const [axis1, [actor, threshold]] of (
    [
      ['node', 0],
      ['connection', 5],
      ['connection', 0],
      ['reconnection', 5],
      ['reconnection', 0],
      ['resize', 0],
      ['selection', 0],
      ['pan', 0],
    ] satisfies readonly (readonly [PhysicalActor, number])[]
  ).entries()) {
    for (const [axis2, complete] of [false, true].entries()) {
      if (!representativeCombination([axis0, axis1, axis2])) {
        continue
      }

      test(`synthetic capture: Vue disposal ${phase} ${actor} threshold ${threshold} complete ${complete}`, async ({
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
    test(`synthetic capture: Vue pointercancel ${phase} retains ${actor} completion`, async ({
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
  test(`synthetic capture: Vue connection cancellation detaches before ${actor} callback reentry`, async ({
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

for (const disposeOnLoss of [false, true]) {
  test(`native capture release ordering Vue dispose ${disposeOnLoss}`, async ({
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
