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
    )
)
