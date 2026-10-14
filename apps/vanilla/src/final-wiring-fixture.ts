import {
  applyFlowChangeToDocument,
  defaultFlowAriaLabelConfig,
} from '@flow/core'
import type {
  FlowChange,
  FlowMiniMapNodeProps,
  FlowResizeParams,
  NodeChange,
} from '@flow/core'

import { createFlowControls } from './controls.ts'
import { createFlowMiniMap } from './minimap.ts'
import type { FlowMiniMapMount, FlowMiniMapOptions } from './minimap.ts'
import type { FlowDocumentInput, FlowMountOptionsInput } from './mount-flow.ts'
import { mountFlow } from './mount-flow.ts'
import {
  createFlowNodeResizeControl,
  createFlowNodeResizer,
} from './node-resizer.ts'
import type {
  FlowNodeResizerCallbacks,
  FlowNodeResizeControlOptions,
  FlowNodeResizerMount,
  FlowNodeResizerOptions,
} from './node-resizer.ts'
import type { JavaScriptFlowController } from './public.ts'

import './style.css'

/*
 * Plan 115 browser fixture: mounts a document with serializable options and
 * adds the function-valued pieces (minimap node attributes, resizer
 * callbacks, custom renderers) from flags, recording what they observe.
 */

type SerializableMountOptions = Omit<
  FlowMountOptionsInput,
  | 'documentMode'
  | 'viewport'
  | 'ariaLabelConfig'
  | `on${string}`
  | 'nodeRenderers'
  | 'edgeRenderers'
>

export interface WiringResizerInput {
  readonly nodeId: string
  readonly kind: 'resizer' | 'control'
  readonly options?:
    | Omit<FlowNodeResizerOptions, `on${string}` | 'shouldResize'>
    | Omit<
        FlowNodeResizeControlOptions,
        `on${string}` | 'shouldResize' | 'content'
      >
    | undefined
  /** `shouldResize` vetoes steps wider than this. */
  readonly vetoWidthAbove?: number | undefined
}

export interface WiringFixtureInput {
  readonly document: FlowDocumentInput
  readonly documentMode?: 'controlled' | 'uncontrolled' | undefined
  readonly options?: SerializableMountOptions | undefined
  readonly zoom?: number | undefined
  /** Partial text labels plus a custom keyboard live message. */
  readonly ariaLabels?: Readonly<Record<string, string>> | undefined
  readonly customLiveMessage?: boolean | undefined
  readonly controls?: { readonly position?: string } | undefined
  readonly minimap?:
    | (Omit<
        FlowMiniMapOptions,
        'nodeColor' | 'nodeComponent' | 'onClick' | 'onNodeClick'
      > & {
        readonly nodeColorById?: Readonly<Record<string, string>> | undefined
        readonly customNode?: boolean | undefined
      })
    | undefined
  readonly resizers?: readonly WiringResizerInput[] | undefined
  /** Node type `grip`: a `.grip` span and a `.body` span. */
  readonly gripRenderer?: boolean | undefined
  /**
   * Controlled owner that applies only the latest proposal of each task, as
   * an owner keeping one pending change would.
   */
  readonly ownerAppliesLatest?: boolean | undefined
}

export interface WiringFixture {
  readonly controller: JavaScriptFlowController
  readonly changes: FlowChange[]
  readonly nodeChanges: NodeChange[][]
  readonly resizeEvents: string[]
  readonly resizeParams: FlowResizeParams[]
  readonly minimapClicks: string[]
  readonly minimapPoints: { readonly x: number; readonly y: number }[]
  readonly minimap: FlowMiniMapMount | undefined
  readonly resizers: FlowNodeResizerMount<FlowNodeResizerOptions>[]
  readonly errors: string[]
}

/** Options assembled field by field from the serializable fixture input. */
type MutableMiniMapOptions = {
  -readonly [Key in keyof FlowMiniMapOptions]: FlowMiniMapOptions[Key]
}

type MutableResizerCallbacks = {
  -readonly [
    Key in keyof FlowNodeResizerCallbacks
  ]: FlowNodeResizerCallbacks[Key]
}

const customMiniMapNode = (props: FlowMiniMapNodeProps): SVGElement => {
  const circle = globalThis.document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  )

  circle.classList.add('custom-minimap-node')
  circle.setAttribute('cx', String(props.x + props.width / 2))
  circle.setAttribute('cy', String(props.y + props.height / 2))
  circle.setAttribute('r', String(Math.min(props.width, props.height) / 2))
  circle.setAttribute('fill', props.fill ?? 'black')

  return circle
}

export const mountWiringFixture = (
  root: HTMLElement,
  input: WiringFixtureInput
): WiringFixture => {
  root.replaceChildren()
  root.style.width = '800px'
  root.style.height = '500px'

  const changes: FlowChange[] = []
  const nodeChanges: NodeChange[][] = []
  const resizeEvents: string[] = []
  const resizeParams: FlowResizeParams[] = []
  const minimapClicks: string[] = []
  const minimapPoints: { readonly x: number; readonly y: number }[] = []
  const errors: string[] = []
  const zoom = input.zoom ?? 1

  const controller = mountFlow(root, input.document, {
    ...input.options,
    documentMode: input.documentMode ?? 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    ariaLabelConfig: {
      ...input.ariaLabels,
      'node.a11yDescription.ariaLiveMessage':
        input.customLiveMessage === true
          ? ({ direction, x, y }) => `moved ${direction} to ${x},${y}`
          : defaultFlowAriaLabelConfig['node.a11yDescription.ariaLiveMessage'],
    },
    onError: (error) => errors.push(error.message),
    onNodesChange: (next) => nodeChanges.push([...next]),
    nodeRenderers:
      input.gripRenderer === true
        ? {
            grip: (node, content) => {
              const grip = globalThis.document.createElement('span')
              const body = globalThis.document.createElement('span')
              grip.className = 'grip'
              grip.textContent = 'grip'
              body.className = 'body'
              body.textContent = node.label
              content.append(grip, body)

              return {
                update: (next) => {
                  body.textContent = next.label
                },
                destroy: () => {
                  content.replaceChildren()
                },
              }
            },
          }
        : undefined,
  })

  controller.subscribe((change) => changes.push(change))

  if (input.ownerAppliesLatest === true) {
    let latest: FlowChange | undefined

    controller.subscribe((change) => {
      const scheduled = latest !== undefined
      latest = change

      if (scheduled) {
        return
      }

      queueMicrotask(() => {
        const proposal = latest
        latest = undefined

        const next =
          proposal === undefined
            ? undefined
            : applyFlowChangeToDocument(
                controller.getSnapshot().document,
                proposal
              )

        if (next !== undefined) {
          controller.update(next)
        }
      })
    })
  }

  if (input.controls !== undefined) {
    createFlowControls(controller, {
      // SAFETY: tests pass a React PanelPosition literal; the controls schema validates it.
      position: input.controls.position as 'top-left',
    })
  }

  let minimap: FlowMiniMapMount | undefined

  if (input.minimap !== undefined) {
    const { nodeColorById, customNode, ...minimapOptions } = input.minimap

    const options: MutableMiniMapOptions = {
      ...minimapOptions,
      onNodeClick: (_event, node) => minimapClicks.push(node.id),
      onClick: (_event, position) => minimapPoints.push(position),
    }

    if (nodeColorById !== undefined) {
      options.nodeColor = (node) => nodeColorById[node.id]
    }

    if (customNode === true) {
      options.nodeComponent = customMiniMapNode
    }

    minimap = createFlowMiniMap(controller, options)
  }

  const resizers: FlowNodeResizerMount<FlowNodeResizerOptions>[] = []

  for (const resizer of input.resizers ?? []) {
    const callbacks: MutableResizerCallbacks = {
      onResizeStart: (_event: PointerEvent, params: FlowResizeParams) => {
        resizeEvents.push(`start:${resizer.nodeId}`)
        resizeParams.push(params)
      },
      onResize: (_event: PointerEvent, params: FlowResizeParams) => {
        resizeEvents.push(`resize:${resizer.nodeId}`)
        resizeParams.push(params)
      },
      onResizeEnd: (_event: PointerEvent, params: FlowResizeParams) => {
        resizeEvents.push(`end:${resizer.nodeId}`)
        resizeParams.push(params)
      },
    }

    const { vetoWidthAbove } = resizer

    if (vetoWidthAbove !== undefined) {
      callbacks.shouldResize = (_event, params) =>
        params.width <= vetoWidthAbove
    }

    if (resizer.kind === 'resizer') {
      resizers.push(
        createFlowNodeResizer(controller, resizer.nodeId, {
          ...resizer.options,
          ...callbacks,
        })
      )
    } else {
      createFlowNodeResizeControl(controller, resizer.nodeId, {
        ...resizer.options,
        ...callbacks,
      })
    }
  }

  return {
    controller,
    changes,
    nodeChanges,
    resizeEvents,
    resizeParams,
    minimapClicks,
    minimapPoints,
    minimap,
    resizers,
    errors,
  }
}
