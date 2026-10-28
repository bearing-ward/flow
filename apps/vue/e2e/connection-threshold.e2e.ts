import { test, expect } from '@playwright/test'

import { connectionThresholdTests } from '../../shared-e2e/connection-threshold-contract.ts'
import type * as NodeReentryHarness from './viewport-ownership-harness.ts'

connectionThresholdTests('vue')

for (const residence of ['physical', 'retained'] as const) {
  test(`connection auto-pan retains its owner ${residence}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/')

    const result = await page.evaluate(async (input) => {
      const path = '/e2e/viewport-ownership-harness.ts'
      const fixture: typeof NodeReentryHarness = await import(path)

      return fixture.ownershipRoundFiveConnection(input)
    }, residence)

    process.stdout.write(
      `${JSON.stringify({ receipt: testInfo.title, result })}\n`
    )
    const zero = { x: 0, y: 0, zoom: 1 }
    const seven = { x: 7, y: 9, zoom: 1 }

    const a = {
      id: 'a',
      label: 'A',
      position: { x: 20, y: 20 },
      size: { width: 150, height: 45 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    }

    const document = {
      nodes: [
        a,
        {
          id: 'b',
          label: 'B',
          selected: true,
          position: { x: 220, y: 20 },
          size: { width: 150, height: 45 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 420, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'edge',
          selected: true,
          reconnectable: true,
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
        },
      ],
    }

    const captureSet = { action: 'set', target: 'a', id: 7 }
    const captureRelease = { action: 'release', target: 'a', id: 7 }

    const events = [
      { name: 'viewportStart', payload: zero },
      { name: 'moveStart', payload: zero },
      { name: 'viewportChange', payload: { x: -15, y: 0, zoom: 1 } },
      { name: 'move', payload: { x: -15, y: 0, zoom: 1 } },
      { name: 'viewportChange', payload: seven },
      { name: 'move', payload: seven },
    ]

    const lifecycle = [
      {
        name: 'connectStart',
        payload: { node: a, handleId: 'out', activation: 'pointer' },
      },
      ...(residence === 'retained'
        ? [{ name: 'clickConnectStart', payload: { node: a, handleId: 'out' } }]
        : []),
    ]

    const common = {
      events,
      lifecycle,
      states: [
        {
          previous: { document, viewport: zero },
          current: { document, viewport: seven },
          cause: 'viewport-update',
        },
      ],
      state: { document, viewport: seven },
      captures:
        residence === 'physical' ? [captureSet] : [captureSet, captureRelease],
      held: residence === 'physical' ? 1 : 0,
    }

    expect(result.beforeCancel).toStrictEqual(common)

    const cancelled = {
      ...common,
      events: [
        ...events,
        {
          name: 'viewportEnd',
          payload: { viewport: seven, status: 'superseded' },
        },
        { name: 'moveEnd', payload: { viewport: seven, status: 'superseded' } },
      ],
      lifecycle: [
        ...lifecycle,
        {
          name: 'connectEnd',
          payload: { status: 'cancelled', reason: 'escape' },
        },
        ...(residence === 'retained'
          ? [
              {
                name: 'clickConnectEnd',
                payload: { status: 'cancelled', reason: 'escape' },
              },
            ]
          : []),
      ],
      captures: [captureSet, captureRelease],
      held: 0,
    }

    expect(result.afterCancel).toStrictEqual(cancelled)
    expect(result.afterDispose).toStrictEqual(cancelled)
  })
}
