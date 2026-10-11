import { nestedResizeContainment } from '../../shared-e2e/nested-resize-containment.ts'
import { createVueConformanceAdapter } from './conformance.ts'

nestedResizeContainment(
  'Vue',
  createVueConformanceAdapter,
  'data-direction',
  (page) => page.evaluate(() => window.__flowVueTest?.boundsChanges().at(-1))
)
