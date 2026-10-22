import {
  mountFlow,
  createFlowNodeToolbar,
  createFlowBackground,
} from '@flow/vanilla'

import {
  upstreamGenericConfig,
  applyUpstreamChange,
  toolbarOptions,
} from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  prepareUpstreamRoot,
  colorModeSelect,
  toolbarVisibility,
  toolbarContent,
} from '../../shared/upstream/fixture.ts'

import '@flow/vanilla/style.css'

if (location.pathname.startsWith('/upstream-examples/')) {
  await import('./upstream-examples-fixture.ts')
} else {
  const root = prepareUpstreamRoot()

  const path = location.pathname.slice('/upstream/'.length)

  const config = upstreamGenericConfig(path)

  const {
    defaultViewport,
    minZoom,
    maxZoom,
    panActivationKeyCode,
    panOnDrag,
    ...options
  } = config.options

  const controller = mountFlow(root, config.document, {
    ...options,
    documentMode: 'controlled',
    panOnDrag: panOnDrag ?? true,
    panActivationModifier:
      panActivationKeyCode === undefined ? 'none' : 'control',
    viewport: {
      mode: 'uncontrolled',
      initial: defaultViewport ?? { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
    },
    nodeRenderers: {
      ToolbarNode: (node, content) => {
        content.textContent = node.label

        return {
          update: (next) => {
            content.textContent = next.label
          },
          destroy: () => content.replaceChildren(),
        }
      },
      DragHandleNode: (_node, content) => {
        content.className = 'upstream-drag-content'
        const handle = document.createElement('div')
        handle.className = 'custom-drag-handle'
        content.append(handle)

        return {
          update: () => content.replaceChildren(handle),
          destroy: () => handle.remove(),
        }
      },
    },
  })

  let acceptedDocument = config.document

  const unsubscribe = controller.subscribe((change) => {
    const next = applyUpstreamChange(acceptedDocument, change)

    if (next !== acceptedDocument) {
      acceptedDocument = next
      controller.update(next)
    }
  })

  const disposers: (() => void)[] = [unsubscribe]

  for (const node of config.document.nodes) {
    if (node.type !== 'ToolbarNode') {
      continue
    }

    const data = toolbarOptions(node)
    const visibility = toolbarVisibility(data.toolbarVisible)

    const toolbar = createFlowNodeToolbar(controller, toolbarContent(), {
      nodeId: node.id,
      position: data.toolbarPosition,
      align: data.toolbarAlign ?? 'center',
      ...visibility,
    })

    toolbar.element.dataset.nodeToolbar = node.id
    disposers.push(toolbar.destroy)
  }

  if (path === 'color-mode') {
    colorModeSelect(root, (colorMode) => controller.setColorMode(colorMode))
  }

  if (path === 'backgrounds') {
    for (const backgroundOptions of [
      { id: 'pattern-flow-a0', variant: 'dots' },
      { id: 'pattern-flow-d1', variant: 'lines', gap: 100, offset: 2 },
    ] as const) {
      const background = createFlowBackground(
        root,
        controller,
        backgroundOptions
      )

      disposers.push(background.destroy)
    }
  }

  window.addEventListener(
    'pagehide',
    () => {
      for (const dispose of disposers) {
        dispose()
      }

      controller.destroy()
    },
    { once: true }
  )
}
