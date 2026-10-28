import { test, expect } from '@playwright/test'

import { representativeCombination } from '../../shared-e2e/representative-cases.ts'
import type * as NodeReentryHarness from './viewport-ownership-harness.ts'

for (const [axis0, route] of (
  ['pan', 'pinch', 'wheel', 'doubleclick', 'start-cancel'] as const
).entries()) {
  for (const [axis1, successor] of [false, true].entries()) {
    if (!representativeCombination([axis0, axis1])) {
      continue
    }

    test(`viewport ${route} successor ${successor}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/')

      const result = await page.evaluate(
        async (args) => {
          const path = '/e2e/viewport-ownership-harness.ts'
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
