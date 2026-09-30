import type {
  FlowDocument,
  FlowEdge,
  FlowEditResult,
  FlowNode,
} from '@flow/core'
import { HandleIdSchema, NodeIdSchema } from '@flow/core'
import { FlowCanvas, useFlow, useHandleConnections } from '@flow/vue'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

const node = (id: string, x: number): FlowNode => ({
  id: NodeIdSchema.make(id),
  label: id,
  position: { x, y: 0 },
  handles: [
    { id: HandleIdSchema.make('out'), kind: 'source', side: 'right' },
    { id: HandleIdSchema.make('out-two'), kind: 'source', side: 'right' },
    { id: HandleIdSchema.make('different'), kind: 'source', side: 'right' },
    { id: HandleIdSchema.make('in'), kind: 'target', side: 'left' },
  ],
})

interface HandleConnectionsFixtureApi {
  readonly propose: (edges: readonly FlowEdge[]) => Promise<FlowEditResult>
  readonly accept: () => Promise<void>
  readonly reject: () => void
  readonly updateAccepted: (edges: readonly FlowEdge[]) => Promise<void>
  readonly events: () => readonly string[]
  readonly dispose: () => void
}

declare global {
  interface Window {
    __flowVueHandleConnections?: HandleConnectionsFixtureApi
  }
}

export const mountVueHandleConnectionsFixture = (root: HTMLElement): void => {
  const initial: FlowDocument = {
    nodes: [node('a', 0), node('b', 200), node('c', 400)],
    edges: [],
  }

  const accepted = ref(initial)
  const events: string[] = []
  let pending: FlowDocument | undefined
  let flow: ReturnType<typeof useFlow> | undefined

  const NodeView = defineComponent({
    // SAFETY: FlowCanvas supplies accepted FlowNode values to this renderer.
    props: { node: { type: Object as PropType<FlowNode>, required: true } },
    setup(props) {
      if (props.node.id === NodeIdSchema.make('a')) {
        useHandleConnections({
          type: 'source',
          id: 'out',
          onConnect: (connections) => {
            for (const connection of connections) {
              events.push(`context:connect:${connection.edgeId}`)
            }
          },
          onDisconnect: (connections) => {
            for (const connection of connections) {
              events.push(`context:disconnect:${connection.edgeId}`)
            }
          },
        })
      }

      return () =>
        h('div', { 'data-handle-observer': props.node.id }, props.node.label)
    },
  })

  const Controls = defineComponent({
    setup() {
      flow = useFlow()
      useHandleConnections({
        nodeId: 'a',
        type: 'source',
        id: 'out-two',
        onConnect: (connections) => {
          for (const connection of connections) {
            events.push(`explicit:connect:${connection.edgeId}`)
          }
        },
        onDisconnect: (connections) => {
          for (const connection of connections) {
            events.push(`explicit:disconnect:${connection.edgeId}`)
          }
        },
      })

      return () => null
    },
  })

  const app = createApp({
    render: () =>
      h(
        FlowCanvas,
        {
          document: accepted.value,
          documentMode: 'controlled',
          nodeComponent: NodeView,
          style: { width: '640px', height: '360px' },
          'onUpdate:document': (document: FlowDocument) => {
            pending = document
          },
        },
        { default: () => h(Controls) }
      ),
  })

  app.mount(root)

  window.__flowVueHandleConnections = {
    propose: (edges) => {
      if (flow === undefined) {
        throw new Error('Flow actions are not mounted')
      }

      return flow.setEdges(edges)
    },
    accept: async () => {
      if (pending === undefined) {
        throw new Error('No connection proposal is pending')
      }

      accepted.value = pending
      pending = undefined
      await nextTick()
    },
    reject: () => {
      pending = undefined
    },
    updateAccepted: async (edges) => {
      accepted.value = { ...initial, edges: [...edges] }
      await nextTick()
    },
    events: () => [...events],
    dispose: () => {
      app.unmount()
      delete window.__flowVueHandleConnections
    },
  }
}
