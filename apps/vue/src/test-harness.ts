import { decodeFlowDocument } from '@flow/core'
import type {
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSnapshot,
  FlowStateChange,
  Viewport,
  FlowDocumentSchema,
} from '@flow/core'
import { FlowCanvas, useEdges, useFlow, useNodes, useViewport } from '@flow/vue'
import { Effect } from 'effect'
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import type { App, PropType, Ref } from 'vue'

import type {
  ConformanceFixture,
  PublicStateQuery,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'

import '@flow/vue/style.css'
import './style.css'

interface TestApi {
  mount: (fixture: ConformanceFixture) => void
  updateDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  updateViewport: (viewport: Viewport) => void
  changeKinds: () => readonly string[]
  readState: (query: PublicStateQuery) => PublicStateRead
  acceptedStates: () => readonly FlowStateChange[]
  destroy: () => {
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }
  smoke: () => Promise<{
    readonly leftCount: string | null
    readonly rightCount: string | null
    readonly labelUpdated: boolean
    readonly edgeUpdated: boolean
    readonly identityPreserved: boolean
    readonly mounted: number
    readonly unmounted: number
    readonly edgeMounted: number
    readonly edgeUnmounted: number
    readonly remaining: number
  }>
  startSplitModel: () => void
  updateSplitDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  splitModelSnapshot: () => {
    readonly initialRendered: boolean
    readonly nodeUpdateAcknowledged: boolean
    readonly edgeUpdateAcknowledged: boolean
    readonly documentUpdateAcknowledged: boolean
    readonly identityPreserved: boolean
  }
  readonly changes: string[]
  readonly positionChanges: {
    readonly nodeId: string
    readonly position: { readonly x: number; readonly y: number }
  }[]
  startNestedDragCase: (mode: 'controlled' | 'uncontrolled') => void
  updateNestedDragDocument: (
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  startPublicState: () => void
  publicState: (id: 'left' | 'right') => {
    readonly nodeIds: readonly string[]
    readonly edgeIds: readonly string[]
    readonly viewport: Viewport
    readonly firstNodeX: number | null
    readonly missingNode: boolean
    readonly missingEdge: boolean
    readonly frozen: boolean
    readonly mutationRejected: boolean
    readonly notifications: number
    readonly events: readonly string[]
  }
  updatePublicDocument: (
    id: 'left' | 'right',
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  updatePublicViewport: (viewport: Viewport) => void
  proposePublicViewport: () => void
  proposePublicPosition: (id: 'left' | 'right') => void
  acceptPublicProposals: () => void
  exercisePublicNotificationPolicy: () => readonly string[]
  unmountPublicObserver: () => void
  destroyPublicCanvases: () => void
  outsideProviderError: () => string
}

declare global {
  interface Window {
    __flowVueTest?: TestApi
  }
}

let app: App | undefined

const documentState = ref<FlowDocument>(
  Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))
)

const viewportState = ref<Viewport>({ x: 0, y: 0, zoom: 1 })

const allowedTargets = ref<readonly string[]>()

const cullOffscreen = ref(false)

const documentMode = ref<'controlled' | 'uncontrolled'>('controlled')

const viewportMode = ref<'controlled' | 'uncontrolled'>('controlled')

let changes: string[] = []

let positionChanges: {
  readonly nodeId: string
  readonly position: { readonly x: number; readonly y: number }
}[] = []

let conformanceSnapshot: (() => FlowSnapshot) | undefined

let conformanceNode: ((id: string) => FlowNode | undefined) | undefined

let conformanceEdge: ((id: string) => FlowEdge | undefined) | undefined

let conformanceAcceptedStates: FlowStateChange[] = []

let splitNodeUpdates = 0

let splitEdgeUpdates = 0

let splitDocumentUpdater: ((document: FlowDocument) => void) | undefined

interface PublicProbe {
  readonly flow: ReturnType<typeof useFlow>
  readonly nodes: ReturnType<typeof useNodes>
  readonly edges: ReturnType<typeof useEdges>
  readonly viewport: ReturnType<typeof useViewport>
  readonly notifications: number
  readonly unsubscribe: () => void
}

const publicProbes = new Map<'left' | 'right', PublicProbe>()

const publicDocuments = new Map<'left' | 'right', Ref<FlowDocument>>()

const publicViewports = new Map<'left' | 'right', Ref<Viewport>>()

const publicEvents = new Map<'left' | 'right', string[]>()

let publicAcceptLeft = false

const publicProbeMounted = ref(true)

const Component = defineComponent({
  name: 'FlowVueTestRoot',
  setup() {
    const Probe = defineComponent({
      setup() {
        const flow = useFlow()

        conformanceSnapshot = () => flow.getSnapshot()
        conformanceNode = (id) => flow.getNode(id)
        conformanceEdge = (id) => flow.getEdge(id)

        const unsubscribe = flow.subscribeState((change) => {
          conformanceAcceptedStates.push(change)
        })

        onUnmounted(unsubscribe)

        return () => null
      },
    })

    return () =>
      h(
        FlowCanvas,
        {
          document: documentState.value,
          documentMode: documentMode.value,
          viewport: viewportState.value,
          viewportMode: viewportMode.value,
          renderOnlyVisible: cullOffscreen.value,
          onChange: (change: { kind: string }) => {
            changes.push(change.kind)
          },
          isValidConnection: (target: string) =>
            allowedTargets.value === undefined ||
            allowedTargets.value.includes(target),
        },
        { default: () => h(Probe) }
      )
  },
})

const api: TestApi = {
  mount(fixture) {
    app?.unmount()
    documentState.value = Effect.runSync(decodeFlowDocument(fixture.document))
    allowedTargets.value = fixture.allowedConnectionTargets
    cullOffscreen.value = fixture.renderOnlyVisible === true
    documentMode.value = fixture.documentMode
    viewportMode.value = fixture.viewportMode
    viewportState.value = { x: 0, y: 0, zoom: 1 }
    changes = []
    positionChanges = []
    conformanceAcceptedStates = []
    conformanceSnapshot = undefined
    conformanceNode = undefined
    conformanceEdge = undefined
    app = createApp(Component)
    app.mount('#app')
  },
  updateDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
  },
  updateViewport(viewport) {
    viewportState.value = viewport
  },
  changeKinds() {
    return [...changes]
  },
  readState(query) {
    if (
      conformanceSnapshot === undefined ||
      conformanceNode === undefined ||
      conformanceEdge === undefined
    ) {
      throw new Error('Missing Vue conformance state probe')
    }

    return {
      snapshot: conformanceSnapshot(),
      node:
        query.nodeId === undefined
          ? null
          : (conformanceNode(query.nodeId) ?? null),
      edge:
        query.edgeId === undefined
          ? null
          : (conformanceEdge(query.edgeId) ?? null),
    }
  },
  acceptedStates() {
    return [...conformanceAcceptedStates]
  },
  destroy() {
    const changesBeforeDestroy = changes.length
    const acceptedBeforeDestroy = conformanceAcceptedStates.length
    app?.unmount()
    app = undefined
    document
      .querySelector('#app')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    const mountedElements = document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length

    return {
      mountedElements,
      changesAfterDestroy: changes.length - changesBeforeDestroy,
      acceptedStatesAfterDestroy:
        conformanceAcceptedStates.length - acceptedBeforeDestroy,
    }
  },
  async smoke() {
    app?.unmount()

    const left = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            { id: 'left-a', label: 'Left A', position: { x: 20, y: 30 } },
            { id: 'left-b', label: 'Left B', position: { x: 240, y: 30 } },
          ],
          edges: [
            {
              id: 'left-edge',
              source: 'left-a',
              target: 'left-b',
              label: 'Edge old',
            },
          ],
        })
      )
    )

    const right = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            { id: 'right-a', label: 'Right A', position: { x: 20, y: 120 } },
          ],
          edges: [],
        })
      )
    )

    let mounted = 0
    let unmounted = 0
    let edgeMounted = 0
    let edgeUnmounted = 0

    // SAFETY: Vue receives node values from the decoded initial FlowDocument in this test.
    const Visual = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        const flow = useFlow()
        onMounted(() => {
          mounted += 1
        })
        onUnmounted(() => {
          unmounted += 1
        })

        return () =>
          h(
            'span',
            { 'data-flow-count': flow.nodes.value.length },
            props.node.label
          )
      },
    })

    // SAFETY: Vue receives edge values from the decoded initial FlowDocument in this test.
    const EdgeVisual = defineComponent({
      props: { edge: { type: Object as PropType<FlowEdge>, required: true } },
      setup(props) {
        onMounted(() => {
          edgeMounted += 1
        })
        onUnmounted(() => {
          edgeUnmounted += 1
        })

        return () => h('text', { 'data-edge-label': true }, props.edge.label)
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(FlowCanvas, {
              document: left.value,
              documentMode: 'controlled',
              nodeComponent: Visual,
              edgeComponent: EdgeVisual,
              'onUpdate:document': (value) => {
                left.value = value
              },
            }),
            h(FlowCanvas, {
              document: right.value,
              documentMode: 'controlled',
              nodeComponent: Visual,
              'onUpdate:document': (value) => {
                right.value = value
              },
            }),
          ])
      },
    })

    app = createApp(Root)
    app.mount('#app')

    const identity = document.querySelector<HTMLElement>(
      "[data-node-id='left-a']"
    )

    if (identity !== null) {
      identity.dataset.identity = 'left'
    }

    const firstNode = left.value.nodes.at(0)
    const secondNode = left.value.nodes.at(1)
    const firstEdge = left.value.edges.at(0)

    if (
      firstNode === undefined ||
      secondNode === undefined ||
      firstEdge === undefined
    ) {
      throw new Error('Expected populated left canvas fixture')
    }

    left.value = {
      ...left.value,
      nodes: [{ ...firstNode, label: 'Left A updated' }, secondNode],
      edges: [{ ...firstEdge, label: 'Edge updated' }],
    }
    await nextTick()

    const results = {
      leftCount:
        document.querySelector<HTMLElement>(
          "[data-node-id='left-a'] [data-flow-count]"
        )?.dataset.flowCount ?? null,
      rightCount:
        document.querySelector<HTMLElement>(
          "[data-node-id='right-a'] [data-flow-count]"
        )?.dataset.flowCount ?? null,
      labelUpdated:
        document
          .querySelector("[data-node-id='left-a']")
          ?.textContent?.includes('Left A updated') ?? false,
      edgeUpdated:
        document.querySelector("[data-edge-id='left-edge'] [data-edge-label]")
          ?.textContent === 'Edge updated',
      identityPreserved:
        document.querySelector<HTMLElement>("[data-node-id='left-a']")?.dataset
          .identity === 'left',
      mounted,
    }

    app.unmount()
    app = undefined
    await nextTick()

    return {
      ...results,
      unmounted,
      edgeMounted,
      edgeUnmounted,
      remaining: document.querySelectorAll(
        "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
      ).length,
    }
  },
  startSplitModel() {
    app?.unmount()

    const initial = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'split-a',
            label: 'Split A',
            position: { x: 20, y: 30 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          },
          {
            id: 'split-b',
            label: 'Split B',
            position: { x: 240, y: 30 },
            handles: [{ id: 'in', kind: 'target', side: 'left' }],
          },
        ],
        edges: [],
      })
    )

    const nodes = ref<readonly FlowNode[]>(initial.nodes)
    const edges = ref<readonly FlowEdge[]>([])
    splitNodeUpdates = 0
    splitEdgeUpdates = 0
    splitDocumentUpdater = undefined

    // SAFETY: Vue receives split-node values from the decoded initial FlowDocument in this test.
    const SplitNode = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        splitDocumentUpdater = useFlow().updateDocument

        return () => h('span', props.node.label)
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h(FlowCanvas, {
            nodes: nodes.value,
            edges: edges.value,
            nodeComponent: SplitNode,
            'onUpdate:nodes': (next: readonly FlowNode[]) => {
              splitNodeUpdates += 1
              nodes.value = next
            },
            'onUpdate:edges': (next: readonly FlowEdge[]) => {
              splitEdgeUpdates += 1
              edges.value = next
            },
          })
      },
    })

    app = createApp(Root)
    app.mount('#app')
  },
  updateSplitDocument(document) {
    const update = splitDocumentUpdater

    if (update === undefined) {
      throw new Error('Split FlowCanvas updateDocument action is unavailable')
    }

    update(Effect.runSync(decodeFlowDocument(document)))
  },
  startNestedDragCase(mode) {
    app?.unmount()
    documentMode.value = mode
    viewportMode.value = 'uncontrolled'
    viewportState.value = { x: 0, y: 0, zoom: 1 }
    documentState.value = Effect.runSync(
      decodeFlowDocument({
        edges: [],
        nodes: [
          {
            id: 'child:[]',
            label: 'Nested Child',
            parentId: 'parent',
            position: { x: 20, y: 30 },
          },
          { id: 'parent', label: 'Parent', position: { x: 100, y: 120 } },
        ],
      })
    )
    changes = []
    positionChanges = []

    const DragRoot = defineComponent({
      setup() {
        return () =>
          h(FlowCanvas, {
            ...(mode === 'controlled'
              ? { document: documentState.value }
              : { defaultDocument: documentState.value }),
            documentMode: mode,
            defaultViewport: { x: 0, y: 0, zoom: 1 },
            viewportMode: 'uncontrolled',
            onChange: (change: {
              kind: string
              nodeId?: string
              position?: { x: number; y: number }
            }) => {
              changes.push(change.kind)

              if (
                change.kind === 'node-position' &&
                change.nodeId !== undefined &&
                change.position !== undefined
              ) {
                positionChanges.push({
                  nodeId: change.nodeId,
                  position: change.position,
                })
              }
            },
            'onUpdate:document': (next: FlowDocument) => {
              documentState.value = next
            },
          })
      },
    })

    app = createApp(DragRoot)
    app.mount('#app')
  },
  updateNestedDragDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document))
  },
  startPublicState() {
    app?.unmount()
    publicProbes.clear()
    publicDocuments.clear()
    publicViewports.clear()
    publicEvents.clear()
    publicAcceptLeft = false
    publicProbeMounted.value = true

    const leftDocument = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            {
              id: 'left-visible',
              label: 'Left visible',
              position: { x: 20, y: 30 },
            },
            {
              id: 'left-hidden',
              label: 'Left hidden',
              hidden: true,
              position: { x: 240, y: 30 },
            },
          ],
          edges: [
            { id: 'left-edge', source: 'left-visible', target: 'left-hidden' },
          ],
        })
      )
    )

    const rightDocument = ref(
      Effect.runSync(
        decodeFlowDocument({
          nodes: [
            {
              id: 'right-node',
              label: 'Right node',
              position: { x: 20, y: 120 },
            },
          ],
          edges: [],
        })
      )
    )

    const leftViewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 })
    const rightViewport = ref<Viewport>({ x: 15, y: 25, zoom: 1.25 })
    publicDocuments.set('left', leftDocument)
    publicDocuments.set('right', rightDocument)
    publicViewports.set('left', leftViewport)
    publicViewports.set('right', rightViewport)
    publicEvents.set('left', [])
    publicEvents.set('right', [])

    const Probe = defineComponent({
      props: {
        // SAFETY: The harness only mounts this probe with the two declared ids below.
        id: { type: String as PropType<'left' | 'right'>, required: true },
      },
      setup(props) {
        const flow = useFlow()
        const nodes = useNodes()
        const edges = useEdges()
        const viewport = useViewport()

        if (props.id !== 'left' && props.id !== 'right') {
          throw new Error(`Unknown public state probe ${props.id}`)
        }

        let notificationCount = 0

        const unsubscribe = flow.subscribeState(() => {
          notificationCount += 1
          publicEvents.get(props.id)?.push('accepted')
        })

        const probe: PublicProbe = {
          flow,
          nodes,
          edges,
          viewport,
          get notifications() {
            return notificationCount
          },
          unsubscribe,
        }

        publicProbes.set(props.id, probe)
        onUnmounted(() => probe.unsubscribe())

        return () =>
          h(
            'output',
            {
              'data-testid': `state-probe-${props.id}`,
              'data-node-count': nodes.value.length,
              'data-edge-count': edges.value.length,
              'data-viewport-x': viewport.value.x,
            },
            flow.snapshot.value.document.nodes
              .map(({ label }) => label)
              .join(',')
          )
      },
    })

    const Root = defineComponent({
      setup() {
        return () =>
          h('section', [
            h(
              FlowCanvas,
              {
                document: leftDocument.value,
                documentMode: 'controlled',
                viewport: leftViewport.value,
                viewportMode: 'controlled',
                renderOnlyVisible: true,
                onChange: () => publicEvents.get('left')?.push('proposal'),
                'onUpdate:document': (next: FlowDocument) => {
                  if (publicAcceptLeft) {
                    leftDocument.value = next
                  }
                },
                'onUpdate:viewport': (next: Viewport) => {
                  leftViewport.value = next
                },
              },
              {
                default: () =>
                  publicProbeMounted.value ? h(Probe, { id: 'left' }) : null,
              }
            ),
            h(
              FlowCanvas,
              {
                defaultDocument: rightDocument.value,
                documentMode: 'uncontrolled',
                defaultViewport: rightViewport.value,
                viewportMode: 'uncontrolled',
                onChange: () => publicEvents.get('right')?.push('proposal'),
              },
              {
                default: () =>
                  publicProbeMounted.value ? h(Probe, { id: 'right' }) : null,
              }
            ),
          ])
      },
    })

    app = createApp(Root)
    app.mount('#app')
  },
  publicState(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    const snapshot = probe.flow.getSnapshot()
    const [firstNode] = snapshot.document.nodes

    return {
      nodeIds: snapshot.document.nodes.map(({ id: nodeId }) => nodeId),
      edgeIds: snapshot.document.edges.map(({ id: edgeId }) => edgeId),
      viewport: probe.viewport.value,
      firstNodeX: snapshot.document.nodes[0]?.position.x ?? null,
      missingNode: probe.flow.getNode('missing') === undefined,
      missingEdge: probe.flow.getEdge('missing') === undefined,
      frozen:
        Object.isFrozen(snapshot) &&
        Object.isFrozen(snapshot.document) &&
        Object.isFrozen(snapshot.document.nodes) &&
        Object.isFrozen(snapshot.document.nodes[0]),
      mutationRejected:
        firstNode === undefined || !Reflect.set(firstNode, 'label', 'mutated'),
      notifications: probe.notifications,
      events: publicEvents.get(id) ?? [],
    }
  },
  updatePublicDocument(id, document) {
    const state = publicDocuments.get(id)

    if (state === undefined) {
      throw new Error(`Missing ${id} owner document`)
    }

    state.value = Effect.runSync(decodeFlowDocument(document))
  },
  updatePublicViewport(viewport) {
    const state = publicViewports.get('left')

    if (state === undefined) {
      throw new Error('Missing left owner viewport')
    }

    state.value = viewport
  },
  proposePublicViewport() {
    const probe = publicProbes.get('left')

    if (probe === undefined) {
      throw new Error('Missing left state probe')
    }

    probe.flow.updateViewport({ x: 35, y: 45, zoom: 1.2 })
  },
  proposePublicPosition(id) {
    const probe = publicProbes.get(id)

    if (probe === undefined) {
      throw new Error(`Missing ${id} state probe`)
    }

    const [node] = probe.nodes.value

    if (node === undefined) {
      throw new Error(`Missing ${id} graph node`)
    }

    probe.flow.dispatch({
      kind: 'set-node-position',
      nodeId: node.id,
      position: { x: 90, y: 100 },
    })
  },
  acceptPublicProposals() {
    publicAcceptLeft = true
  },
  exercisePublicNotificationPolicy() {
    const probe = publicProbes.get('right')

    if (probe === undefined) {
      throw new Error('Missing right state probe')
    }

    const order: string[] = []
    let reentered = false

    const unsubscribeFirst = probe.flow.subscribeState(({ current }) => {
      order.push(`first:${current.viewport.x}`)

      if (!reentered) {
        reentered = true
        probe.flow.updateViewport({ x: 101, y: 25, zoom: 1.25 })
      }
    })

    const unsubscribeFailure = probe.flow.subscribeState(({ current }) => {
      order.push(`failure:${current.viewport.x}`)
      throw new Error('expected test listener failure')
    })

    const unsubscribeLast = probe.flow.subscribeState(({ current }) => {
      order.push(`last:${current.viewport.x}`)
    })

    probe.flow.updateViewport({ x: 100, y: 25, zoom: 1.25 })
    probe.flow.updateViewport({ x: 101, y: 25, zoom: 1.25 })
    unsubscribeFirst()
    unsubscribeFailure()
    unsubscribeLast()

    return order
  },
  unmountPublicObserver() {
    publicProbeMounted.value = false
  },
  destroyPublicCanvases() {
    app?.unmount()
    app = undefined
  },
  outsideProviderError() {
    let message = ''

    const Outside = defineComponent({
      setup() {
        try {
          useFlow()
        } catch (error) {
          message = error instanceof Error ? error.message : String(error)
        }

        return () => h('span')
      },
    })

    const outsideApp = createApp(Outside)
    const container = document.createElement('div')
    document.body.append(container)
    outsideApp.mount(container)
    outsideApp.unmount()
    container.remove()

    return message
  },
  splitModelSnapshot() {
    const node = document.querySelector<HTMLElement>("[data-node-id='split-a']")

    return {
      initialRendered: document.querySelectorAll('[data-node-id]').length === 2,
      nodeUpdateAcknowledged:
        splitNodeUpdates >= 1 &&
        node?.getAttribute('style')?.includes('left: 90px') === true,
      edgeUpdateAcknowledged:
        splitEdgeUpdates >= 1 &&
        document.querySelector('[data-edge-id]') !== null,
      documentUpdateAcknowledged:
        splitNodeUpdates === 2 &&
        splitEdgeUpdates === 2 &&
        node?.textContent?.includes('Updated split A') === true &&
        node?.getAttribute('style')?.includes('left: 90px') === true &&
        document.querySelector("[data-edge-id='split-replacement-edge']") !==
          null,
      identityPreserved: node?.dataset.identity === 'caller-node',
    }
  },
  get changes() {
    return changes
  },
  get positionChanges() {
    return [...positionChanges]
  },
}

window.__flowVueTest = api
