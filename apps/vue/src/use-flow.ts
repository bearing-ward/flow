import type {
  FlowChange,
  FlowCommand,
  FlowDocument,
  FlowNode,
  Viewport,
} from '@flow/core'
import { computed, inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'

export interface FlowEditor {
  readonly document: ComputedRef<FlowDocument>
  readonly viewport: ComputedRef<Viewport>
  readonly dispatch: (command: FlowCommand) => void
  readonly updateDocument: (document: FlowDocument) => void
  readonly updateViewport: (viewport: Viewport) => void
  readonly publish: (change: FlowChange) => void
}

export const FlowEditorKey: InjectionKey<FlowEditor> = Symbol('FlowEditor')

export interface FlowNodeSlot {
  readonly node: FlowNode
}

export interface FlowActions {
  readonly document: FlowEditor['document']
  readonly nodes: ComputedRef<readonly FlowNode[]>
  readonly viewport: FlowEditor['viewport']
  readonly dispatch: FlowEditor['dispatch']
  readonly updateDocument: FlowEditor['updateDocument']
  readonly updateViewport: FlowEditor['updateViewport']
}

export const useFlow = (): FlowActions => {
  const editor = inject(FlowEditorKey)

  if (editor === undefined) {
    throw new Error('useFlow must be called below FlowCanvas')
  }

  return {
    document: editor.document,
    nodes: computed(() => editor.document.value.nodes),
    viewport: editor.viewport,
    dispatch: editor.dispatch,
    updateDocument: editor.updateDocument,
    updateViewport: editor.updateViewport,
  }
}
