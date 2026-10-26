import type { FlowResizeParams } from '../../packages/core/src/public.ts'

export interface ResizeCompletionFixture {
  readonly changes: () => readonly (readonly unknown[])[]
  readonly clear: () => void
  readonly bounds: () =>
    | FlowResizeParams
    | null
    | Promise<FlowResizeParams | null>
  readonly geometryChangeCount: () => number
  readonly endCount: () => number
  readonly callbackFailures: () => number
  readonly remove: () => void
  readonly unmount: () => void
}

declare global {
  interface Window {
    __resizeCompletion: ResizeCompletionFixture
  }
}
