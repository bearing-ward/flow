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

/**
 * Collect declared prop names from `props`, `extends` and `mixins`, the way
 * Vue normalizes props options. An async component contributes the props of
 * its resolved inner component once it has loaded.
 */
const collectPropNames = (
  component: Component,
  names: Set<string>,
  seen: Set<Component>
): void => {
  if (seen.has(component)) {
    return
  }

  seen.add(component)

  const declared: unknown = 'props' in component ? component.props : undefined

  if (Array.isArray(declared)) {
    for (const name of declared.filter(Predicate.isString)) {
      names.add(name)
    }
  } else if (Predicate.isObject(declared)) {
    for (const name of Object.keys(declared)) {
      names.add(name)
    }
  }

  const extended: unknown =
    'extends' in component ? component.extends : undefined

  const mixins: unknown = 'mixins' in component ? component.mixins : undefined

  const resolved: unknown =
    '__asyncResolved' in component ? component.__asyncResolved : undefined

  const parents = [extended, resolved, ...(Array.isArray(mixins) ? mixins : [])]

  for (const parent of parents) {
    if (Predicate.isObject(parent) || Predicate.isFunction(parent)) {
      // SAFETY: Vue stores only component options or functions in extends, mixins and the resolved async component.
      const next = parent as Component
      collectPropNames(next, names, seen)
    }
  }
}

/** Whether an async component (`defineAsyncComponent`) has not loaded yet. */
const pendingAsyncComponent = (component: Component): boolean =>
  '__asyncLoader' in component &&
  !('__asyncResolved' in component && component.__asyncResolved !== undefined)

type DeclaredProps = { readonly kind: 'all' } | readonly string[]

const declaredPropsCache = new WeakMap<Component, DeclaredProps>()

const declaredProps = (component: Component): DeclaredProps => {
  const cached = declaredPropsCache.get(component)

  if (cached !== undefined) {
    return cached
  }

  const names = new Set<string>()
  collectPropNames(component, names, new Set())

  // Functional components without declared props receive every attribute as a prop.
  const result: DeclaredProps =
    names.size === 0 && Predicate.isFunction(component)
      ? { kind: 'all' }
      : [...names]

  // An async component that has not loaded yet is resolved again next render.
  if (!pendingAsyncComponent(component)) {
    declaredPropsCache.set(component, result)
  }

  return result
}

/**
 * Keep only the renderer props a component declares, including props from
 * `extends` and `mixins`. Undeclared props would otherwise fall through as DOM
 * attributes, such as `id` on the root element. Functional components without
 * a props declaration receive them all. An async component
 * (`defineAsyncComponent`) receives only `node`, `edge` or `preview` until
 * it has loaded; the next canvas render after loading passes its declared
 * props. The declared names are cached per component.
 */
export const declaredRendererProps = <Props extends object>(
  component: Component,
  props: Props
): Partial<Props> => {
  const declared = declaredProps(component)

  if ('kind' in declared) {
    return props
  }

  const picked: Partial<Props> = {}

  for (const name of declared) {
    if (name in props) {
      // SAFETY: `name` was just checked to be a key of `props`.
      const key = name as keyof Props
      picked[key] = props[key]
    }
  }

  return picked
}

/**
 * Keep the previous props object per renderer id while it is equal to the
 * next one, so Vue sees unchanged props and skips the child render.
 */
export const createRendererPropsCache = <Props>(
  same: (previous: Props | undefined, next: Props) => boolean
) => {
  const entries = new Map<string, Props>()

  return {
    keep: (id: string, next: Props): Props => {
      const previous = entries.get(id)

      if (previous !== undefined && same(previous, next)) {
        return previous
      }

      entries.set(id, next)

      return next
    },
    /** Drop entries for ids that are no longer in the document. */
    retain: (ids: ReadonlySet<string>): void => {
      for (const id of entries.keys()) {
        if (!ids.has(id)) {
          entries.delete(id)
        }
      }
    },
  }
}
