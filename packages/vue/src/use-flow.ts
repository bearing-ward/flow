import type {
  FlowChange,
  FlowCommand,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSnapshot,
  FlowStateChange,
  Viewport,
} from '@flow/core'
import { computed, inject } from 'vue'
import type { ComputedRef, DeepReadonly, InjectionKey } from 'vue'

export interface FlowEditor {
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: ComputedRef<DeepReadonly<FlowSnapshot>>
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
  ) => () => void
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
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly nodes: ComputedRef<readonly DeepReadonly<FlowNode>[]>
  readonly edges: ComputedRef<readonly DeepReadonly<FlowEdge>[]>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: FlowEditor['snapshot']
  readonly getSnapshot: () => DeepReadonly<FlowSnapshot>
  readonly getNode: (id: string) => DeepReadonly<FlowNode> | undefined
  readonly getEdge: (id: string) => DeepReadonly<FlowEdge> | undefined
  readonly subscribeState: FlowEditor['subscribeState']
  readonly dispatch: FlowEditor['dispatch']
  readonly updateDocument: FlowEditor['updateDocument']
  readonly updateViewport: FlowEditor['updateViewport']
}

export const useFlow = (): FlowActions => {
  const editor = inject(FlowEditorKey)

  if (editor === undefined) {
    throw new Error(
      'useFlow must be called in setup() below a mounted FlowCanvas provider'
    )
  }

  const { snapshot } = editor

  const getSnapshot = (): DeepReadonly<FlowSnapshot> => snapshot.value

  const getNode = (id: string): DeepReadonly<FlowNode> | undefined =>
    getSnapshot().document.nodes.find((node) => node.id === id)

  const getEdge = (id: string): DeepReadonly<FlowEdge> | undefined =>
    getSnapshot().document.edges.find((edge) => edge.id === id)

  const document = computed(() => snapshot.value.document)
  const viewport = computed(() => snapshot.value.viewport)

  return {
    document,
    nodes: computed(() => snapshot.value.document.nodes),
    edges: computed(() => snapshot.value.document.edges),
    viewport,
    snapshot,
    getSnapshot,
    getNode,
    getEdge,
    subscribeState: editor.subscribeState,
    dispatch: editor.dispatch,
    updateDocument: editor.updateDocument,
    updateViewport: editor.updateViewport,
  }
}

export const useNodes = (): FlowActions['nodes'] => useFlow().nodes

export const useEdges = (): FlowActions['edges'] => useFlow().edges

export const useViewport = (): FlowActions['viewport'] => useFlow().viewport
