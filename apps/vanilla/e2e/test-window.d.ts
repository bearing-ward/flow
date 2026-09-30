import type { ConnectionPreviewSnapshot, FlowChange } from '@flow/core'

import type { JavaScriptFlowController } from '../src/public.ts'

declare global {
  var detachedCanvas: HTMLElement | undefined
  var detachedNode: HTMLElement | undefined
  var flowChanges: FlowChange[] | undefined
  var flowPreviewNotifications: ConnectionPreviewSnapshot[] | undefined
  var flowController: JavaScriptFlowController | undefined
  var nativeActivationCounts: { button: number; link: number } | undefined
  var nativeKeyboardPrevented: string[] | undefined
  var secondPortalController: JavaScriptFlowController | undefined
  var flowTestPendingFrames: Set<number> | undefined
  var flowPointerMoveDurations: number[] | undefined
  var flowDragMutationCounts: { added: number; removed: number } | undefined
  var flowDragMutationObserver: MutationObserver | undefined
  var panelRefs: { element: HTMLElement }[] | undefined
  var __conformanceUnsubscribe: (() => void) | undefined

  var flowAuthoritativeNodes:
    | {
        id: string
        position: { x: number; y: number }
        size?: { width: number; height: number }
      }[]
    | undefined
}
