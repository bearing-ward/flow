import type { FlowChange } from '@flow/core'
import { FlowCanvas, FlowNodeToolbar, FlowBackground } from '@flow/vue'
import type { FlowNodeSlot } from '@flow/vue'
import { createApp, defineComponent, h, ref } from 'vue'

import {
  upstreamGenericConfig,
  applyUpstreamChange,
  toolbarOptions,
} from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  prepareUpstreamRoot,
  colorModeSelect,
  toolbarVisibility,
} from '../../shared/upstream/fixture.ts'

import '@flow/vue/style.css'

const ToolbarNode = (slot: FlowNodeSlot) => h('div', slot.node.label)

if (location.pathname.startsWith('/upstream-examples/')) {
  await import('./upstream-examples-fixture.ts')
} else {
  const root = prepareUpstreamRoot()

  const path = location.pathname.slice('/upstream/'.length)

  const config = upstreamGenericConfig(path)

  const { defaultViewport, minZoom, maxZoom, ...options } = config.options

  type ActivationOptions = Pick<
    InstanceType<typeof FlowCanvas>['$props'],
    'panActivationKeyCode' | 'multiSelectionKeyCode'
  >

  const panKeyOptions: ActivationOptions = {}

  if (options.panActivationKeyCode !== undefined) {
    panKeyOptions.panActivationKeyCode = options.panActivationKeyCode
  }

  if (options.multiSelectionKeyCode !== undefined) {
    panKeyOptions.multiSelectionKeyCode = options.multiSelectionKeyCode
  }

  const document = ref(config.document)

  const colorMode = ref<'light' | 'dark' | 'system'>('light')

  const DragHandleNode = defineComponent({
    setup: () => () =>
      h(
        'div',
        { class: 'upstream-drag-content' },
        h('div', { class: 'custom-drag-handle' })
      ),
  })

  const canvasProps = () =>
    ({
      deleteKeyCode: options.deleteKeyCode ?? 'Backspace',
      ...panKeyOptions,
      panOnDrag: options.panOnDrag ?? true,
      nodeDragThreshold: options.nodeDragThreshold ?? 1,
      panOnScroll: options.panOnScroll ?? false,
      zoomOnScroll: options.zoomOnScroll ?? true,
      selectionOnDrag: options.selectionOnDrag ?? false,
      autoPanOnConnect: options.autoPanOnConnect ?? true,
      autoPanOnNodeDrag: options.autoPanOnNodeDrag ?? true,
      fitView: options.fitView ?? false,
      document: document.value,
      onChange: (change: FlowChange) => {
        document.value = applyUpstreamChange(document.value, change)
      },
      defaultViewport: defaultViewport ?? { x: 0, y: 0, zoom: 1 },
      viewportLimits: { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
      colorMode: colorMode.value,
      style: { width: '100%', height: '100%' },
      nodeTypes: { DragHandleNode, ToolbarNode },
    }) satisfies InstanceType<typeof FlowCanvas>['$props']

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(FlowCanvas, canvasProps(), {
          default: () => [
            ...config.document.nodes
              .filter((node) => node.type === 'ToolbarNode')
              .map((node) => {
                const data = toolbarOptions(node)
                const visibility = toolbarVisibility(data.toolbarVisible)

                return h(
                  FlowNodeToolbar,
                  {
                    nodeId: node.id,
                    position: data.toolbarPosition,
                    align: data.toolbarAlign ?? 'center',
                    ...visibility,
                  },
                  () =>
                    ['delete', 'copy', 'expand'].map((label) =>
                      h('button', label)
                    )
                )
              }),
            ...(path === 'backgrounds'
              ? [
                  h(FlowBackground, { id: 'pattern-flow-a0', variant: 'dots' }),
                  h(FlowBackground, {
                    id: 'pattern-flow-d1',
                    variant: 'lines',
                    gap: 100,
                    offset: 2,
                  }),
                ]
              : []),
          ],
        }),
    })
  )

  app.mount(root)

  if (path === 'color-mode') {
    colorModeSelect(root, (mode) => {
      colorMode.value = mode
    })
  }

  window.addEventListener('pagehide', () => app.unmount(), { once: true })
}
