import { describe, expect, it } from 'vitest'

import reference from '../../../../research/fixtures/viewport-contract-reference.json'
import contract from '../../../../research/fixtures/viewport-contract.json'
import {
  flowToScreenPosition,
  screenToFlowPosition,
} from './flow-runtime.schema.ts'
import { getViewportForBounds } from './flow-viewport-operation.schema.ts'

describe('shared viewport contract fixture', () => {
  it('round trips client coordinates through pane offsets at fractional zoom', () => {
    for (const testCase of contract.coordinateCases) {
      const paneLocal = {
        x: testCase.client.x - testCase.hostRect.left,
        y: testCase.client.y - testCase.hostRect.top,
      }

      const flow = screenToFlowPosition(paneLocal, testCase.viewport)
      const localScreen = flowToScreenPosition(flow, testCase.viewport)

      expect(flow).toStrictEqual(testCase.flow)
      expect({
        x: localScreen.x + testCase.hostRect.left,
        y: localScreen.y + testCase.hostRect.top,
      }).toStrictEqual(testCase.screen)
    }
  })

  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it('calculates shared fit viewport targets from both padding forms', () => {
    for (const testCase of contract.fitCases) {
      const viewport = getViewportForBounds({
        bounds: testCase.bounds,
        width: testCase.pane.width,
        height: testCase.pane.height,
        limits: testCase.limits,
        padding: testCase.padding,
      })

      expect(viewport).toStrictEqual(testCase.viewport)
    }
  })

  // Pinned xyflow 0a1f9575, packages/system/src/utils/general.ts:196-259,304-343.
  it('matches the pinned upstream result for asymmetric side padding', () => {
    const testCase = contract.fitCases.find(
      ({ id }) => id === 'fit-bounds-asymmetric-pixel-padding'
    )

    expect(testCase).toBeDefined()

    if (testCase === undefined) {
      return
    }

    expect(
      getViewportForBounds({
        bounds: testCase.bounds,
        width: testCase.pane.width,
        height: testCase.pane.height,
        limits: testCase.limits,
        padding: testCase.padding,
      })
    ).toStrictEqual(reference.cases.asymmetricFit)
  })
})
