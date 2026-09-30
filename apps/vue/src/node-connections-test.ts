import type {
  FlowDocument,
  FlowEdge,
  FlowEditResult,
  FlowNode,
} from '@flow/core'
import { EdgeIdSchema, NodeIdSchema } from '@flow/core'
import { FlowCanvas, useNodeConnections, useFlow } from '@flow/vue'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'

const node = (
  id: string,
  label: string,
  x: number,
  owner?: string
): FlowNode => {
  if (owner === undefined) {
    return {
      id: NodeIdSchema.make(id),
      label,
      position: { x, y: 0 },
    }
  }

  return {
    id: NodeIdSchema.make(id),
    label,
    position: { x, y: 0 },
    data: { owner },
  }
}

const edge = (id: string, source: string, target: string): FlowEdge => ({
  id: EdgeIdSchema.make(id),
  source: NodeIdSchema.make(source),
  target: NodeIdSchema.make(target),
})

interface ConnectionFixtureApi {
  readonly propose: (edges: readonly FlowEdge[]) => Promise<FlowEditResult>
  readonly accept: () => Promise<void>
  readonly reject: () => void
  readonly failNextDisconnect: () => void
  readonly updateSecond: (edges: readonly FlowEdge[]) => Promise<void>
  readonly events: () => readonly string[]
  readonly errors: () => readonly string[]
  readonly dispose: () => void
}

declare global {
  interface Window {
    __flowVueNodeConnections?: ConnectionFixtureApi
  }
}

export const mountVueNodeConnectionsFixture = (root: HTMLElement): void => {
  const initial: FlowDocument = {
    nodes: [node('a', 'A', 0), node('b', 'B', 200), node('c', 'C', 400)],
    edges: [edge('ab', 'a', 'b')],
  }

  const secondInitial: FlowDocument = {
    nodes: [
      node('a', 'A2', 0, 'second'),
      node('b', 'B2', 200, 'second'),
      node('c', 'C2', 400, 'second'),
    ],
    edges: [edge('ab', 'a', 'b')],
  }

  const accepted = ref(initial)
  const secondAccepted = ref(secondInitial)
  let pending: FlowDocument | undefined
  let flow: ReturnType<typeof useFlow> | undefined
  const events: string[] = []
  const observerErrors: string[] = []
  let failNextDisconnect = false

  const NodeView = defineComponent({
    // SAFETY: FlowCanvas supplies accepted FlowNode values to this renderer.
    props: { node: { type: Object as PropType<FlowNode>, required: true } },
    setup(props) {
      const owner = props.node.data?.owner === 'second' ? 'second' : 'first'

      useNodeConnections({
        onConnect: (connections) => {
          for (const connection of connections) {
            events.push(
              `connect:${owner}:${props.node.id}:${connection.edgeId}`
            )
          }
        },
        onDisconnect: (connections) => {
          for (const connection of connections) {
            events.push(
              `disconnect:${owner}:${props.node.id}:${connection.edgeId}`
            )
          }

          if (failNextDisconnect) {
            failNextDisconnect = false
            throw new Error('Vue observer disconnect failed')
          }
        },
      })

      return () =>
        h(
          'div',
          { 'data-node-connections-node': props.node.id },
          props.node.label
        )
    },
  })

  const Controls = defineComponent({
    setup() {
      flow = useFlow()

      return () => null
    },
  })

  const app = createApp({
    render: () =>
      h('main', [
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
        h(FlowCanvas, {
          document: secondAccepted.value,
          documentMode: 'controlled',
          nodeComponent: NodeView,
          style: { width: '640px', height: '360px' },
        }),
      ]),
  })

  app.config.errorHandler = (error) => {
    observerErrors.push(error instanceof Error ? error.message : String(error))
  }

  app.mount(root)

  window.__flowVueNodeConnections = {
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
    failNextDisconnect: () => {
      failNextDisconnect = true
    },
    updateSecond: async (edges) => {
      secondAccepted.value = { ...secondInitial, edges: [...edges] }
      await nextTick()
    },
    events: () => [...events],
    errors: () => [...observerErrors],
    dispose: () => {
      app.unmount()
      delete window.__flowVueNodeConnections
    },
  }
}
