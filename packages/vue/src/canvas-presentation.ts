import {
  flowColorModeMediaQuery,
  flowStyleDeclarations,
  flowThemeStylesheet,
  flowThemeValue,
  resolveFlowColorMode,
} from '@flow/core'
import type {
  FlowColorMode,
  FlowColorModeClass,
  FlowEdge,
  FlowStyle,
  ResolvedFlowEdgeMarker,
} from '@flow/core'
import { computed, h, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef, VNode } from 'vue'

/** Kebab-case CSS declarations keyed by property, as Vue style bindings take. */
export type FlowVueStyleObject = Record<string, string>

/** A Vue style object from a Flow style record, with React DOM units. */
export const flowVueStyle = (
  style: FlowStyle | undefined
): FlowVueStyleObject =>
  Object.fromEntries(
    flowStyleDeclarations(style).map(({ property, value }) => [property, value])
  )

/**
 * An SVG-flavoured style record (React `labelStyle`/`labelBgStyle` target SVG
 * `text`/`rect`) as HTML label styles: `fill` becomes the text colour or
 * the background colour, `stroke` the border colour.
 */
export const flowVueLabelStyle = (
  style: FlowStyle | undefined,
  role: 'text' | 'background'
) =>
  Object.fromEntries(
    flowStyleDeclarations(style).flatMap(
      ({ property, value }): (readonly [string, string])[] => {
        if (property === 'fill') {
          return [[role === 'text' ? 'color' : 'background-color', value]]
        }

        if (property === 'stroke') {
          return role === 'background' ? [['border', `1px solid ${value}`]] : []
        }

        return [[property, value]]
      }
    )
  )

/** Theme defaults are declared once per document, scoped to the canvas root. */
const themeStyleAttribute = 'data-flow-vue-theme'

export const ensureFlowVueThemeStylesheet = (owner: Document): void => {
  if (owner.head.querySelector(`style[${themeStyleAttribute}]`) !== null) {
    return
  }

  const style = owner.createElement('style')
  style.setAttribute(themeStyleAttribute, '')
  style.textContent = flowThemeStylesheet('.flow-vue-canvas')
  owner.head.prepend(style)
}

/**
 * React `useColorModeClass`: the class for `colorMode`, following
 * `prefers-color-scheme` while the mode is `system`.
 */
export const useFlowColorModeClass = (
  mode: () => FlowColorMode
): ComputedRef<FlowColorModeClass> => {
  const prefersDark = shallowRef(false)
  let release: (() => void) | undefined

  watch(
    mode,
    (current) => {
      release?.()
      release = undefined

      if (current !== 'system' || globalThis.matchMedia === undefined) {
        return
      }

      const query = globalThis.matchMedia(flowColorModeMediaQuery)

      const onChange = (event: MediaQueryListEvent): void => {
        prefersDark.value = event.matches
      }

      prefersDark.value = query.matches
      query.addEventListener('change', onChange)
      release = () => query.removeEventListener('change', onChange)
    },
    { immediate: true }
  )

  onScopeDispose(() => release?.())

  return computed(() => resolveFlowColorMode(mode(), prefersDark.value))
}

/**
 * React `MarkerDefinitions`: one `<marker>` per resolved marker. A missing
 * colour draws with the themed edge stroke.
 */
export const renderFlowEdgeMarker = (marker: ResolvedFlowEdgeMarker): VNode => {
  const color = marker.color ?? flowThemeValue('edge-stroke')

  return h(
    'marker',
    {
      key: marker.id,
      id: marker.id,
      class: 'flow-vue-arrowhead',
      'data-marker-type': marker.type,
      markerWidth: `${marker.width}`,
      markerHeight: `${marker.height}`,
      viewBox: '-10 -10 20 20',
      markerUnits: marker.markerUnits,
      orient: marker.orient,
      refX: '0',
      refY: '0',
    },
    [
      h('polyline', {
        style:
          marker.type === 'arrowclosed'
            ? { stroke: color, fill: color, strokeWidth: marker.strokeWidth }
            : { stroke: color, strokeWidth: marker.strokeWidth },
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: marker.type === 'arrowclosed' ? undefined : 'none',
        points:
          marker.type === 'arrowclosed'
            ? '-5,-4 0,0 -5,4 -5,-4'
            : '-5,-4 0,0 -5,4',
      }),
    ]
  )
}

/** Classes of an edge group: React `react-flow__edge` state classes. */
export const flowVueEdgeClasses = (
  edge: Pick<FlowEdge, 'animated' | 'className' | 'selected'>
): (string | Record<string, boolean>)[] => [
  'flow-vue-edge',
  { selected: edge.selected === true, animated: edge.animated === true },
  ...(edge.className === undefined ? [] : [edge.className]),
]

/** React `labelBgPadding` default `[2, 4]` and `labelBgBorderRadius` 2. */
export const flowVueEdgeLabelBox = (
  edge: Pick<FlowEdge, 'labelBgPadding' | 'labelBgBorderRadius' | 'labelShowBg'>
) => {
  const [horizontal, vertical] = edge.labelBgPadding ?? [2, 4]

  return {
    padding: `${vertical}px ${horizontal}px`,
    borderRadius: `${edge.labelBgBorderRadius ?? 2}px`,
  }
}
