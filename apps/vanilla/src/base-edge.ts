import { edgeTextLayout } from '@flow/core'

const svgNamespace = 'http://www.w3.org/2000/svg'

export type FlowEdgeLabel = string | number

export type FlowEdgeStyle = Readonly<Record<string, string>>

export interface FlowEdgeTextOptions {
  readonly x: number
  readonly y: number
  readonly label?: FlowEdgeLabel | undefined
  readonly labelStyle?: FlowEdgeStyle | undefined
  readonly labelShowBg?: boolean | undefined
  readonly labelBgStyle?: FlowEdgeStyle | undefined
  readonly labelBgPadding?: readonly [number, number] | undefined
  readonly labelBgBorderRadius?: number | undefined
  readonly className?: string | undefined
  /** Extra SVG content rendered after the text, like React children. */
  readonly children?: readonly SVGElement[] | undefined
}

export interface FlowBaseEdgeOptions extends Omit<
  FlowEdgeTextOptions,
  'x' | 'y' | 'children' | 'className'
> {
  readonly path: string
  readonly labelX?: number | undefined
  readonly labelY?: number | undefined
  readonly interactionWidth?: number | undefined
  readonly markerStart?: string | undefined
  readonly markerEnd?: string | undefined
  readonly className?: string | undefined
  readonly style?: FlowEdgeStyle | undefined
  /** Extra SVG attributes for the visible path, such as `stroke`. */
  readonly attributes?: Readonly<Record<string, string>> | undefined
}

export interface FlowEdgeTextMount {
  readonly element: SVGGElement
  readonly update: (options: FlowEdgeTextOptions) => void
  readonly dispose: () => void
}

export interface FlowBaseEdgeMount {
  readonly element: SVGGElement
  readonly update: (options: FlowBaseEdgeOptions) => void
  readonly dispose: () => void
}

const hasLabel = (label: FlowEdgeLabel | undefined): label is FlowEdgeLabel =>
  label !== undefined && label !== '' && label !== 0

const applyStyle = (
  element: SVGElement,
  style: FlowEdgeStyle | undefined
): void => {
  element.removeAttribute('style')

  for (const [name, value] of Object.entries(style ?? {})) {
    const property = name.startsWith('--')
      ? name
      : name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)

    element.style.setProperty(property, value)
  }
}

const setOptionalAttribute = (
  element: Element,
  name: string,
  value: string | undefined
): void => {
  if (value === undefined) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

/** Create an SVG edge label centered on a flow-space point with an optional background. */
export const createFlowEdgeText = (
  document: Document,
  initial: FlowEdgeTextOptions
): FlowEdgeTextMount => {
  const group = document.createElementNS(svgNamespace, 'g')
  const background = document.createElementNS(svgNamespace, 'rect')
  const text = document.createElementNS(svgNamespace, 'text')

  background.setAttribute('class', 'flow-edge-textbg')
  text.setAttribute('class', 'flow-edge-text')
  text.setAttribute('dy', '0.3em')

  let options = initial
  let measuredLabel: string | undefined
  let size = { width: 0, height: 0 }
  let children: readonly SVGElement[] = []

  const measure = (label: string): void => {
    if (!text.isConnected) {
      return
    }

    const box = text.getBBox()
    size = { width: box.width, height: box.height }
    measuredLabel = label
  }

  const layout = (): void => {
    const [paddingX, paddingY] = options.labelBgPadding ?? [2, 4]

    const placed = edgeTextLayout({ x: options.x, y: options.y, ...size }, [
      paddingX,
      paddingY,
    ])

    group.setAttribute(
      'transform',
      `translate(${placed.translate.x} ${placed.translate.y})`
    )
    group.setAttribute('visibility', placed.visible ? 'visible' : 'hidden')
    background.setAttribute('x', String(placed.background.x))
    background.setAttribute('y', String(placed.background.y))
    background.setAttribute('width', String(placed.background.width))
    background.setAttribute('height', String(placed.background.height))
    text.setAttribute('y', String(placed.textY))
  }

  const update = (next: FlowEdgeTextOptions): void => {
    options = next

    if (!hasLabel(next.label)) {
      group.setAttribute('display', 'none')

      return
    }

    group.removeAttribute('display')
    group.setAttribute(
      'class',
      ['flow-edge-textwrapper', next.className].filter(Boolean).join(' ')
    )

    const label = String(next.label)
    text.textContent = label
    applyStyle(text, next.labelStyle)
    applyStyle(background, next.labelBgStyle)

    const radius = String(next.labelBgBorderRadius ?? 2)
    background.setAttribute('rx', radius)
    background.setAttribute('ry', radius)

    if (next.labelShowBg === false) {
      background.remove()
    } else if (background.parentNode !== group) {
      group.prepend(background)
    }

    for (const child of children) {
      child.remove()
    }

    children = next.children ?? []
    group.append(...children)

    if (measuredLabel !== label || size.width === 0) {
      measure(label)
    }

    layout()
  }

  group.append(background, text)
  update(initial)

  return {
    element: group,
    update,
    dispose: () => group.remove(),
  }
}

/** Create the visible path, interaction path and optional label of a custom edge. */
export const createFlowBaseEdge = (
  document: Document,
  initial: FlowBaseEdgeOptions
): FlowBaseEdgeMount => {
  const group = document.createElementNS(svgNamespace, 'g')
  const visible = document.createElementNS(svgNamespace, 'path')
  const interaction = document.createElementNS(svgNamespace, 'path')
  const label = createFlowEdgeText(document, { x: 0, y: 0 })
  let attributeNames: readonly string[] = []

  group.setAttribute('class', 'flow-base-edge')
  interaction.setAttribute('class', 'flow-edge-interaction')
  interaction.setAttribute('fill', 'none')
  interaction.setAttribute('stroke-opacity', '0')
  group.append(visible, interaction, label.element)

  const update = (options: FlowBaseEdgeOptions): void => {
    for (const name of attributeNames) {
      visible.removeAttribute(name)
    }

    // Default presentation matches the built-in edge; caller attributes and styles override it.
    visible.setAttribute('stroke', '#64748b')
    visible.setAttribute('stroke-width', '2')

    for (const [name, value] of Object.entries(options.attributes ?? {})) {
      visible.setAttribute(name, value)
    }

    attributeNames = Object.keys(options.attributes ?? {})
    visible.setAttribute('d', options.path)
    visible.setAttribute('fill', 'none')
    visible.setAttribute(
      'class',
      ['flow-edge-path', options.className].filter(Boolean).join(' ')
    )
    setOptionalAttribute(visible, 'marker-start', options.markerStart)
    setOptionalAttribute(visible, 'marker-end', options.markerEnd)
    applyStyle(visible, options.style)

    const interactionWidth = options.interactionWidth ?? 20

    if (interactionWidth) {
      interaction.setAttribute('d', options.path)
      interaction.setAttribute('stroke-width', String(interactionWidth))

      if (interaction.parentNode !== group) {
        visible.after(interaction)
      }
    } else {
      interaction.remove()
    }

    const { labelX } = options
    const { labelY } = options

    label.update({
      ...options,
      className: undefined,
      x: labelX ?? 0,
      y: labelY ?? 0,
      label:
        labelX !== undefined &&
        labelY !== undefined &&
        Number.isFinite(labelX) &&
        Number.isFinite(labelY)
          ? options.label
          : undefined,
    })
  }

  update(initial)

  return {
    element: group,
    update,
    dispose: () => group.remove(),
  }
}
