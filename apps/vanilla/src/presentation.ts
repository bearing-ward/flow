import { flowClassNames, flowStyleDeclarations } from '@flow/core'
import type { FlowStyle } from '@flow/core'

/*
 * Node and edge presentation from the Plan 114 contracts: user `style` and
 * `className` are applied next to the host's own inline styles and classes.
 * Each element remembers what it received last, so a removed property or
 * class is taken off again without touching host-owned values.
 */

const appliedStyles = new WeakMap<Element, ReadonlySet<string>>()

const appliedClasses = new WeakMap<Element, ReadonlySet<string>>()

/**
 * Apply a style record to an element, removing properties the previous
 * record set. `skip` keeps host-owned properties (node `transform`, or the
 * declared size React puts above `style`).
 */
export const applyFlowStyle = (
  element: HTMLElement | SVGElement,
  style: FlowStyle | undefined,
  skip: ReadonlySet<string> = new Set()
): void => {
  const next = new Set<string>()

  for (const { property, value } of flowStyleDeclarations(style)) {
    if (skip.has(property)) {
      continue
    }

    next.add(property)
    element.style.setProperty(property, value)
  }

  for (const property of appliedStyles.get(element) ?? []) {
    if (!next.has(property) && !skip.has(property)) {
      element.style.removeProperty(property)
    }
  }

  appliedStyles.set(element, next)
}

/** Apply a space-separated class list, removing classes it no longer has. */
export const applyFlowClassName = (
  element: Element,
  className: string | undefined
): void => {
  const next = new Set(
    flowClassNames(className)
      .split(' ')
      .filter((name) => name !== '')
  )

  for (const name of appliedClasses.get(element) ?? []) {
    if (!next.has(name)) {
      element.classList.remove(name)
    }
  }

  for (const name of next) {
    element.classList.add(name)
  }

  appliedClasses.set(element, next)
}

const nodeOwnedProperties = new Set(['transform'])

const nodeSizedProperties = new Set(['transform', 'width', 'height'])

/**
 * React `NodeWrapper`: `style` spreads below the node position and its
 * declared `width`/`height`, and `className` joins the wrapper classes.
 * `zIndex` is the stacking `computeFlowStacking` resolved for the node.
 */
export const applyNodePresentation = (
  element: HTMLElement,
  node: {
    readonly style?: FlowStyle | undefined
    readonly className?: string | undefined
    readonly size?: unknown
  },
  zIndex: number | undefined
): void => {
  element.dataset.widthDeclared = String(
    node.size !== undefined || node.style?.width !== undefined
  )
  element.dataset.heightDeclared = String(
    node.size !== undefined || node.style?.height !== undefined
  )

  applyFlowStyle(
    element,
    node.style,
    node.size === undefined ? nodeOwnedProperties : nodeSizedProperties
  )
  applyFlowClassName(element, node.className)

  if (zIndex === undefined) {
    element.style.removeProperty('z-index')
  } else {
    element.style.zIndex = String(zIndex)
  }
}

/**
 * SVG paint keys React applies to the label `<text>` and `<rect>`, mapped to
 * the CSS the HTML label uses: text `fill` is `color`, background `fill` is
 * `background-color` and its `stroke` is the border color.
 */
const labelPaint = (
  style: FlowStyle | undefined,
  mapping: Readonly<Record<string, string>>
): FlowStyle | undefined =>
  style === undefined
    ? undefined
    : Object.fromEntries(
        Object.entries(style).map(([key, value]) => [
          mapping[key] ?? key,
          value,
        ])
      )

const labelTextPaint = { fill: 'color' } as const satisfies Readonly<
  Record<string, string>
>

const labelBackgroundPaint = {
  fill: 'backgroundColor',
  stroke: 'borderColor',
} as const satisfies Readonly<Record<string, string>>

const labelTexts = new WeakMap<HTMLElement, HTMLSpanElement>()

const labelOwnedProperties = new Set([
  'left',
  'top',
  'transform',
  'padding',
  'border-radius',
])

/**
 * React `EdgeText`: `labelStyle` on the text and, unless `labelShowBg` is
 * false, a background with `labelBgStyle`, `labelBgPadding` (`[x, y]`,
 * default `[2, 4]`) and `labelBgBorderRadius` (default 2).
 */
export const applyEdgeLabelPresentation = (
  label: HTMLElement,
  edge: {
    readonly label?: string | undefined
    readonly labelStyle?: FlowStyle | undefined
    readonly labelShowBg?: boolean | undefined
    readonly labelBgStyle?: FlowStyle | undefined
    readonly labelBgPadding?: readonly [number, number] | undefined
    readonly labelBgBorderRadius?: number | undefined
  }
): void => {
  let text = labelTexts.get(label)

  if (text === undefined) {
    text = label.ownerDocument.createElement('span')
    text.className = 'flow-edge-label-text'
    label.replaceChildren(text)
    labelTexts.set(label, text)
  }

  text.textContent = edge.label ?? ''
  applyFlowStyle(text, labelPaint(edge.labelStyle, labelTextPaint))

  const showBackground = edge.labelShowBg !== false
  const [paddingX, paddingY] = edge.labelBgPadding ?? [2, 4]
  label.classList.toggle('flow-edge-label-no-bg', !showBackground)
  label.style.padding = showBackground ? `${paddingY}px ${paddingX}px` : '0'
  label.style.borderRadius = `${edge.labelBgBorderRadius ?? 2}px`
  applyFlowStyle(
    label,
    showBackground
      ? labelPaint(edge.labelBgStyle, labelBackgroundPaint)
      : undefined,
    labelOwnedProperties
  )
}
