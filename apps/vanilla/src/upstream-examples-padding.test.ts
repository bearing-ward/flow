import { getViewportForBounds } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { upstreamExampleConfig } from '../../../packages/conformance/src/upstream-examples/index.ts'
import { exampleOptions } from '../../shared/upstream/examples.ts'

describe('upstream Basic padding migration', () => {
  // Pinned xyflow 0a1f9575, examples/react/src/examples/Basic/index.tsx:58-60;
  // packages/system/src/utils/general.ts:196-259,304-343.
  // These literal viewports are the old adapter's numeric-pixel gutters.
  it.each([
    [960, 640, { x: -336, y: -80, zoom: 4 }],
    [803, 607, { x: -361.5, y: -58, zoom: 3.615 }],
  ])(
    'preserves the previous viewport for pane %s x %s',
    (width, height, viewport) => {
      const options = exampleOptions('basic', upstreamExampleConfig('basic'))
      expect(
        getViewportForBounds({
          bounds: { x: 100, y: 50, width: 200, height: 100 },
          width,
          height,
          limits: { minZoom: 0.25, maxZoom: 4 },
          padding: options.fitViewOptions.padding,
        })
      ).toStrictEqual(viewport)
    }
  )
})
