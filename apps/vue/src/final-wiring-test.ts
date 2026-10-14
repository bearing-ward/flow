import { decodeFlowDocument } from '@flow/core'
import type {
  FlowDocument,
  FlowMiniMapNodeProps,
  FlowNode,
  FlowResizeParams,
  FlowResizeParamsWithDirection,
  Viewport,
} from '@flow/core'
import {
  FlowCanvas,
  FlowControls,
  FlowLabeledGroupNode,
  FlowMiniMap,
  FlowNodeResizeControl,
  FlowNodeResizer,
  FlowPanel,
  FlowProvider,
  useFlow,
  useKeyPress,
  useStore,
} from '@flow/vue'
import type {
  FlowActions,
  FlowColorMode,
  FlowStoreState,
  FlowZIndexMode,
} from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, ref, shallowRef } from 'vue'
import type { PropType } from 'vue'

import '@flow/vue/style.css'
import './style.css'

/** Everything the final-wiring e2e tests read back from the page. */
export interface FinalWiringFixture {
  readonly flow: () => FlowActions
  readonly events: () => readonly string[]
  readonly resizes: () => readonly (FlowResizeParams & {
    readonly name: string
  })[]
  readonly storeRenders: () => number
  readonly setColorMode: (mode: FlowColorMode) => void
  readonly setZIndexMode: (mode: FlowZIndexMode) => void
}

export interface FinalWiringOptions {
  readonly scene:
    | 'provider'
    | 'presentation'
    | 'extents'
    | 'minimap'
    | 'resizer'
    | 'labeled-group'
  readonly colorMode?: FlowColorMode
  readonly snapToGrid?: boolean
}

declare global {
  interface Window {
    __flowVueFinal?: FinalWiringFixture
  }
}

const decode = (input: Parameters<typeof decodeFlowDocument>[0]) =>
  Effect.runSync(decodeFlowDocument(input))

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const presentationDocument = (): FlowDocument =>
  decode({
    nodes: [
      {
        id: 'styled',
        label: 'Styled',
        position: { x: 60, y: 60 },
        style: { backgroundColor: '#ff0072', color: 'white', borderWidth: 3 },
        className: 'custom-node extra',
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      {
        id: 'handled',
        label: 'Default handles',
        position: { x: 360, y: 60 },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      },
      {
        id: 'grip',
        label: 'Grip',
        type: 'grip',
        position: { x: 60, y: 260 },
        size: { width: 160, height: 70 },
        dragHandle: '.grip-handle',
        handles,
      },
      {
        id: 'below',
        label: 'Below',
        position: { x: 380, y: 280 },
        size: { width: 150, height: 60 },
        zIndex: 5,
        handles,
      },
    ],
    edges: [
      {
        id: 'e-styled',
        source: 'styled',
        target: 'handled',
        label: 'styled edge',
        style: { stroke: '#ff0072', strokeWidth: 3 },
        className: 'custom-edge',
        animated: true,
        labelStyle: { fill: '#0041d0', fontWeight: 700 },
        labelBgStyle: { fill: '#ffcc00' },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 6,
        markerEnd: {
          type: 'arrowclosed',
          color: '#ff0072',
          width: 20,
          height: 20,
          strokeWidth: 2,
        },
      },
      {
        id: 'e-plain',
        source: 'grip',
        sourceHandle: 'out',
        target: 'below',
        targetHandle: 'in',
        label: 'no background',
        labelShowBg: false,
        markerEnd: 'arrow',
      },
    ],
  })

const extentsDocument = (): FlowDocument =>
  decode({
    nodes: [
      {
        id: 'root',
        label: 'Root',
        position: { x: 103, y: 97 },
        size: { width: 100, height: 50 },
      },
      {
        id: 'group',
        label: 'Group',
        position: { x: 300, y: 80 },
        size: { width: 240, height: 180 },
      },
      {
        id: 'clamped',
        label: 'Clamped',
        parentId: 'group',
        extent: 'parent',
        position: { x: 20, y: 40 },
        size: { width: 80, height: 40 },
      },
      {
        id: 'grower',
        label: 'Grower',
        parentId: 'group',
        expandParent: true,
        position: { x: 130, y: 110 },
        size: { width: 80, height: 40 },
      },
    ],
    edges: [],
  })

const resizerDocument = (): FlowDocument =>
  decode({
    nodes: [
      {
        id: 'resizable',
        label: 'NodeResizer',
        type: 'resizer',
        position: { x: 60, y: 60 },
        size: { width: 160, height: 80 },
        selected: true,
        data: { minWidth: 100, minHeight: 50, maxWidth: 260, maxHeight: 200 },
      },
      {
        id: 'ratio',
        label: 'Aspect ratio',
        type: 'resizer',
        position: { x: 340, y: 60 },
        size: { width: 160, height: 80 },
        data: { keepAspectRatio: true },
      },
      {
        id: 'control',
        label: 'Single control',
        type: 'control',
        position: { x: 60, y: 300 },
        size: { width: 140, height: 60 },
      },
      {
        id: 'vetoed',
        label: 'Vetoed',
        type: 'resizer',
        position: { x: 600, y: 60 },
        size: { width: 120, height: 60 },
        data: { veto: true },
      },
      {
        id: 'plain',
        label: 'Canvas switch',
        position: { x: 340, y: 300 },
        size: { width: 140, height: 60 },
      },
      {
        id: 'parent',
        label: 'Parent',
        position: { x: 560, y: 260 },
        size: { width: 200, height: 160 },
      },
      {
        id: 'child',
        label: 'Child',
        type: 'resizer',
        parentId: 'parent',
        expandParent: true,
        position: { x: 60, y: 60 },
        size: { width: 100, height: 60 },
      },
    ],
    edges: [],
  })

const labeledGroupDocument = (): FlowDocument =>
  decode({
    nodes: [
      {
        id: 'group',
        label: 'Group',
        type: 'labeled-group',
        position: { x: 80, y: 60 },
        size: { width: 380, height: 240 },
        data: { label: 'Labeled Group' },
      },
      {
        id: 'child-a',
        label: 'Child A',
        parentId: 'group',
        extent: 'parent',
        position: { x: 40, y: 60 },
        handles,
      },
      {
        id: 'child-b',
        label: 'Child B',
        parentId: 'group',
        extent: 'parent',
        position: { x: 200, y: 150 },
        handles,
      },
    ],
    edges: [
      {
        id: 'e-ab',
        source: 'child-a',
        sourceHandle: 'out',
        target: 'child-b',
        targetHandle: 'in',
      },
    ],
  })

const providerDocument = (): FlowDocument =>
  decode({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 40, y: 40 },
        size: { width: 120, height: 60 },
      },
      {
        id: 'b',
        label: 'B',
        position: { x: 120, y: 80 },
        size: { width: 120, height: 60 },
      },
      {
        id: 'c',
        label: 'C',
        position: { x: 500, y: 320 },
        size: { width: 120, height: 60 },
      },
    ],
    edges: [],
  })

const numberData = (node: FlowNode, key: string): number | undefined => {
  const value = node.data?.[key]

  return Number.isFinite(value) ? Number(value) : undefined
}

export const mountFinalWiringFixture = (
  root: HTMLElement,
  options: FinalWiringOptions
): void => {
  const events: string[] = []

  const resizes: (FlowResizeParams & { readonly name: string })[] = []

  let actions: FlowActions | undefined
  let storeRenders = 0
  const colorMode = ref<FlowColorMode>(options.colorMode ?? 'light')
  const zIndexMode = ref<FlowZIndexMode>('basic')

  const record = (
    name: string,
    params: FlowResizeParams | FlowResizeParamsWithDirection
  ): void => {
    resizes.push({
      name,
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
    })
  }

  /** Captures `useFlow()` for the page. */
  const Probe = defineComponent({
    setup() {
      actions = useFlow()

      return () => null
    },
  })

  /** Example "Node Resizer": `FlowNodeResizer` inside a custom node. */
  const ResizerNode = defineComponent({
    props: {
      // SAFETY: FlowCanvas passes the accepted node to node renderers.
      node: { type: Object as PropType<FlowNode>, required: true },
    },
    setup(props) {
      return () =>
        h('div', { class: 'resizer-node' }, [
          h(FlowNodeResizer, {
            minWidth: numberData(props.node, 'minWidth') ?? 10,
            minHeight: numberData(props.node, 'minHeight') ?? 10,
            maxWidth: numberData(props.node, 'maxWidth') ?? Number.MAX_VALUE,
            maxHeight: numberData(props.node, 'maxHeight') ?? Number.MAX_VALUE,
            keepAspectRatio: props.node.data?.['keepAspectRatio'] === true,
            isVisible:
              props.node.selected === true || props.node.id !== 'resizable',
            color: '#ff0071',
            shouldResize: (params: FlowResizeParamsWithDirection) =>
              props.node.data?.['veto'] !== true || params.width < 150,
            onResizeStart: (params: FlowResizeParams) =>
              record(`start:${props.node.id}`, params),
            onResize: (params: FlowResizeParamsWithDirection) =>
              record(`resize:${props.node.id}`, params),
            onResizeEnd: (params: FlowResizeParams) =>
              record(`end:${props.node.id}`, params),
          }),
          h('span', props.node.label),
        ])
    },
  })

  /** Example "Node Resizer": one custom `FlowNodeResizeControl`. */
  const ControlNode = defineComponent({
    props: {
      // SAFETY: FlowCanvas passes the accepted node to node renderers.
      node: { type: Object as PropType<FlowNode>, required: true },
    },
    setup(props) {
      return () =>
        h('div', { class: 'control-node' }, [
          h(
            FlowNodeResizeControl,
            {
              position: 'right',
              variant: 'handle',
              resizeDirection: 'horizontal',
              minWidth: 80,
              style: { width: '14px', height: '14px' },
              onResize: (params: FlowResizeParamsWithDirection) =>
                record(`resize:${props.node.id}`, params),
            },
            { default: () => h('span', { class: 'custom-control' }, '↔') }
          ),
          h('span', props.node.label),
        ])
    },
  })

  const GripNode = defineComponent({
    props: {
      // SAFETY: FlowCanvas passes the accepted node to node renderers.
      node: { type: Object as PropType<FlowNode>, required: true },
    },
    setup(props) {
      return () =>
        h('div', { class: 'grip-node' }, [
          h('div', { class: 'grip-handle' }, 'drag here'),
          h('div', { class: 'grip-body' }, props.node.label),
        ])
    },
  })

  /** A sibling of the canvas below the provider: reads and edits the graph. */
  const Sidebar = defineComponent({
    setup() {
      const flow = useFlow()
      const shift = useKeyPress('Shift')
      const combo = useKeyPress(['Meta+k', 'Control+k'])

      const nodeCount = useStore((state: FlowStoreState) => state.nodes.length)

      const zoomBand = useStore(
        (state: FlowStoreState) => state.transform[2],
        (previous, next) => Math.abs(previous - next) < 0.5
      )

      const intersections = shallowRef('')
      const bounds = shallowRef('')

      return () => {
        storeRenders += 1

        return h('aside', { class: 'final-sidebar' }, [
          h('output', { 'data-testid': 'node-count' }, String(nodeCount.value)),
          h('output', { 'data-testid': 'zoom-band' }, String(zoomBand.value)),
          h('output', { 'data-testid': 'shift' }, String(shift.value)),
          h('output', { 'data-testid': 'combo' }, String(combo.value)),
          h('output', { 'data-testid': 'intersections' }, intersections.value),
          h('output', { 'data-testid': 'bounds' }, bounds.value),
          h(
            'button',
            {
              type: 'button',
              onClick: async () => {
                await flow.addNodes({
                  id: `added-${nodeCount.value}`,
                  label: 'Added',
                  position: { x: 300, y: 40 },
                })
              },
            },
            'Add node'
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                intersections.value = flow
                  .getIntersectingNodes({ id: 'a' })
                  .map(({ id }) => id)
                  .join(',')
                const box = flow.getNodesBounds(['a', 'b'])
                bounds.value = `${box.x},${box.y},${box.width},${box.height}`
              },
            },
            'Inspect'
          ),
        ])
      }
    },
  })

  const sceneDocument = (): FlowDocument => {
    switch (options.scene) {
      case 'presentation': {
        return presentationDocument()
      }

      case 'extents': {
        return extentsDocument()
      }

      case 'resizer': {
        return resizerDocument()
      }

      case 'labeled-group': {
        return labeledGroupDocument()
      }

      default: {
        return providerDocument()
      }
    }
  }

  const document = sceneDocument()

  const nodeTypes = {
    resizer: ResizerNode,
    control: ControlNode,
    grip: GripNode,
    'labeled-group': FlowLabeledGroupNode,
  }

  const MiniMapNode = defineComponent({
    props: {
      id: { type: String, required: true },
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      selected: { type: Boolean, required: true },
    },
    setup(props) {
      return () =>
        h('circle', {
          class: 'custom-minimap-node',
          'data-custom-minimap-node': props.id,
          cx: props.x + props.width / 2,
          cy: props.y + props.height / 2,
          r: Math.min(props.width, props.height) / 2,
        })
    },
  })

  const canvasChildren = () => {
    const children = [h(Probe)]

    if (options.scene === 'presentation') {
      children.push(
        h(FlowControls, { position: 'center-left' }),
        h(
          FlowPanel,
          { position: 'center-right', 'data-testid': 'center-right-panel' },
          { default: () => 'Center right' }
        ),
        h(FlowMiniMap, {
          position: 'top-right',
          ariaLabel: null,
        })
      )
    }

    if (options.scene === 'minimap') {
      children.push(
        h(FlowMiniMap, {
          'data-testid': 'options-minimap',
          position: 'bottom-left',
          nodeColor: (node: FlowNode) =>
            node.id === 'a' ? '#ff0072' : '#00ff00',
          nodeStrokeColor: '#222222',
          nodeClassName: (node: FlowNode) => `mini-${node.id}`,
          nodeBorderRadius: 7,
          nodeStrokeWidth: 3,
          bgColor: '#eeeeee',
          maskColor: 'rgba(10, 20, 30, 0.5)',
          maskStrokeColor: '#ff0000',
          maskStrokeWidth: 2,
          pannable: true,
          zoomable: true,
          ariaLabel: 'Overview',
        }),
        h(
          FlowMiniMap,
          { position: 'top-right', 'data-testid': 'slot-minimap' },
          {
            node: (node: FlowMiniMapNodeProps) =>
              h('rect', {
                key: node.id,
                class: 'slot-minimap-node',
                'data-slot-minimap-node': node.id,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
              }),
          }
        ),
        h(FlowMiniMap, {
          position: 'top-left',
          'data-testid': 'component-minimap',
          nodeComponent: MiniMapNode,
        })
      )
    }

    return children
  }

  const viewport: Viewport = { x: 0, y: 0, zoom: 1 }

  /** Scene-specific canvas props. */
  const sceneProps = () => {
    const props = {}

    if (options.scene === 'extents') {
      Object.assign(props, {
        nodeExtent: [
          [0, 0],
          [700, 500],
        ],
        translateExtent: [
          [-100, -100],
          [1200, 900],
        ],
      })
    }

    if (options.scene === 'provider') {
      Object.assign(props, {
        fitView: true,
        fitViewOptions: { maxZoom: 1, padding: 0.1 },
      })
    }

    if (options.scene === 'presentation') {
      Object.assign(props, {
        ariaLabelConfig: {
          'controls.zoomIn.ariaLabel': 'Vergrößern',
          'node.a11yDescription.default': 'Knoten auswählen',
          'edge.a11yDescription.default': 'Kante auswählen',
        },
        defaultMarkerColor: '#123456',
        defaultEdgeOptions: {
          className: 'from-defaults',
          style: { strokeDasharray: '4 2' },
          labelBgPadding: [6, 6],
        },
      })
    }

    return props
  }

  const canvas = () =>
    h(
      FlowCanvas,
      {
        defaultDocument: document,
        defaultViewport: viewport,
        nodeTypes,
        colorMode: colorMode.value,
        zIndexMode: zIndexMode.value,
        nodesResizable: options.scene === 'resizer',
        snapToGrid: options.snapToGrid === true,
        snapGrid: [25, 25],
        ...sceneProps(),
        onNodeDragStop: () => events.push('nodeDragStop'),
      },
      { default: canvasChildren }
    )

  const App = defineComponent({
    setup() {
      return () =>
        options.scene === 'provider'
          ? h(FlowProvider, null, {
              default: () => [h(Sidebar), canvas()],
            })
          : canvas()
    },
  })

  window.__flowVueFinal = {
    flow: () => {
      if (actions === undefined) {
        throw new Error('Final wiring fixture is not mounted')
      }

      return actions
    },
    events: () => [...events],
    resizes: () => [...resizes],
    storeRenders: () => storeRenders,
    setColorMode: (mode) => {
      colorMode.value = mode
    },
    setZIndexMode: (mode) => {
      zIndexMode.value = mode
    },
  }

  createApp(App).mount(root)
}
