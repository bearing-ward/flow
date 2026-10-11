import { expect } from '@playwright/test'

import { nestedResizeContainment } from '../../shared-e2e/nested-resize-containment.ts'
import { createFoldkitConformanceAdapter } from './conformance.ts'

nestedResizeContainment(
  'Foldkit',
  createFoldkitConformanceAdapter,
  'data-resize-direction',
  (page) =>
    page.evaluate(() =>
      window.__flowFoldkitTest
        ?.changes()
        .findLast(({ kind }) => kind === 'node-bounds')
    ),
  async (page, expected) => {
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__flowFoldkitTest
            ?.resizeMeasurements()
            .findLast(({ nodeId }) => nodeId === 'parent')
        )
      )
      .toEqual({
        nodeId: 'parent',
        width: expected.width,
        height: expected.height,
      })
  }
)
