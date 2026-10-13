import type {
  FlowConnectionLineProps,
  FlowEdge,
  FlowEdgeRendererProps,
  FlowNode,
  FlowNodeRendererProps,
} from '@flow/core'
import { Predicate } from 'effect'
import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onUpdated,
  shallowReactive,
  shallowRef,
} from 'vue'
import type { Component, InjectionKey, PropType, ShallowRef, VNode } from 'vue'

type EdgeLabelRender = () => VNode[]

interface EdgeLabelEntry {
  readonly render: EdgeLabelRender
  readonly version: ShallowRef<number>
}

interface FlowEdgeLabelRendererContext {
  readonly register: (key: symbol, render: EdgeLabelRender) => void
  /** Re-render one entry after its edge re-rendered with new slot content. */
  readonly refresh: (key: symbol) => void
  readonly unregister: (key: symbol) => void
}

export const FlowEdgeLabelRendererContextKey: InjectionKey<FlowEdgeLabelRendererContext> =
  Symbol('FlowEdgeLabelRendererContext')

/**
 * Renders one registered entry. Its own render scope reads the entry's version,
 * so an edge update re-renders just this label, after the edge has passed its
 * new slot content, without re-rendering the canvas.
 */
const EdgeLabelEntryView = defineComponent({
  name: 'FlowEdgeLabelEntry',
  props: {
    // SAFETY: The registry passes only entries it created.
    entry: { type: Object as PropType<EdgeLabelEntry>, required: true },
  },
  setup(props) {
    return () => {
      const { render, version } = props.entry

      // Reading the version subscribes this view to the entry's refreshes.
      return version.value >= 0 ? render() : []
    }
  },
})

/** Canvas-side registry; the canvas renders every entry inside its HTML label layer. */
export const createEdgeLabelRegistry = () => {
  const entries = shallowReactive(new Map<symbol, EdgeLabelEntry>())

  const context: FlowEdgeLabelRendererContext = {
    register: (key, render) => {
      entries.set(key, { render, version: shallowRef(0) })
    },
    refresh: (key) => {
      const entry = entries.get(key)

      if (entry !== undefined) {
        entry.version.value += 1
      }
    },
    unregister: (key) => {
      entries.delete(key)
    },
  }

  const render = (): VNode[] =>
    [...entries].map(([key, entry]) => h(EdgeLabelEntryView, { key, entry }))

  return { context, render }
}

/**
 * Render HTML edge labels in a graph-space layer above the edges, like React
 * Flow's `<EdgeLabelRenderer />`. Children position themselves in flow
 * coordinates, typically with `translate(-50%, -50%) translate(labelX, labelY)`.
 * The canvas renders the slot itself, so children are HTML even though the
 * edge component renders inside SVG.
 */
export const FlowEdgeLabelRenderer = defineComponent({
  name: 'FlowEdgeLabelRenderer',
  setup(_props, { slots }) {
    const context = inject(FlowEdgeLabelRendererContextKey)

    if (context === undefined) {
      throw new Error(
        'FlowEdgeLabelRenderer must be rendered inside FlowCanvas'
      )
    }

    const key = Symbol('FlowEdgeLabelRenderer')

    context.register(key, () => slots.default?.() ?? [])
    // The edge passed new slot content; the canvas rendered the label layer before it.
    onUpdated(() => context.refresh(key))
    onBeforeUnmount(() => context.unregister(key))

    return () => null
  },
})

/** Props a `nodeTypes` component may declare, modeled on React Flow `NodeProps`. */
export type FlowNodeProps = FlowNodeRendererProps & { readonly node: FlowNode }

/** Props an `edgeTypes` component may declare, modeled on React Flow `EdgeProps`. */
export type FlowEdgeProps = FlowEdgeRendererProps & {
  readonly edge: FlowEdge
  readonly path: string
}

/** Props a `connectionPreview` component may declare, modeled on `ConnectionLineComponentProps`. */
export type FlowConnectionLineComponentProps =
  Partial<FlowConnectionLineProps> & Pick<FlowConnectionLineProps, 'preview'>

export type FlowNodeTypes = Readonly<Record<string, Component>>

export type FlowEdgeTypes = Readonly<Record<string, Component>>

export type FlowConnectionLineComponent = Component

const declaredPropNames = (component: Component): ReadonlySet<string> => {
  const declared: unknown = 'props' in component ? component.props : undefined

  if (declared === undefined) {
    return new Set()
  }

  if (Array.isArray(declared)) {
    return new Set(declared.filter(Predicate.isString))
  }

  return Predicate.isObject(declared)
    ? new Set(Object.keys(declared))
    : new Set()
}

/**
 * Keep only the renderer props a component declares. Undeclared props would
 * otherwise fall through as DOM attributes, such as `id` on the root element.
 * Functional components without a props declaration receive them all.
 */
export const declaredRendererProps = <Props extends object>(
  component: Component,
  props: Props
): Partial<Props> => {
  const names = declaredPropNames(component)

  // Functional components without declared props receive every attribute as a prop.
  if (names.size === 0 && Predicate.isFunction(component)) {
    return props
  }

  // SAFETY: The entries are filtered from Props by key, so each kept value retains its Props type.
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => names.has(key))
  ) as Partial<Props>
}
