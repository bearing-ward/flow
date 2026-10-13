import { edgeTextLayout } from '@flow/core'
import { Effect, Stream } from 'effect'
import type { Html as FoldHtml, Mount } from 'foldkit'

export type FlowEdgeLabel = string | number

export interface FlowEdgeTextOptions {
  readonly x: number
  readonly y: number
  readonly label?: FlowEdgeLabel | undefined
  readonly labelStyle?: Record<string, string> | undefined
  readonly labelShowBg?: boolean | undefined
  readonly labelBgStyle?: Record<string, string> | undefined
  readonly labelBgPadding?: readonly [number, number] | undefined
  readonly labelBgBorderRadius?: number | undefined
  readonly className?: string | undefined
}

export interface FlowBaseEdgeOptions extends Omit<
  FlowEdgeTextOptions,
  'x' | 'y' | 'className'
> {
  readonly path: string
  readonly labelX?: number | undefined
  readonly labelY?: number | undefined
  readonly interactionWidth?: number | undefined
  readonly markerStart?: string | undefined
  readonly markerEnd?: string | undefined
  readonly className?: string | undefined
  readonly style?: Record<string, string> | undefined
  /** Extra SVG attributes for the visible path, such as `stroke`. */
  readonly attributes?: Readonly<Record<string, string>> | undefined
}

const hasLabel = (label: FlowEdgeLabel | undefined): label is FlowEdgeLabel =>
  label !== undefined && label !== '' && label !== 0

const observedAttributes = [
  'data-label-x',
  'data-label-y',
  'data-padding-x',
  'data-padding-y',
]

/** Measures the label text and writes the geometry the virtual DOM leaves unset. */
const layoutEdgeText = (element: Element): void => {
  const text = element.querySelector(':scope > text')

  const background = element.querySelector(
    ':scope > rect.flow-foldkit-edge-textbg'
  )

  if (!(element instanceof SVGElement) || !(text instanceof SVGTextElement)) {
    return
  }

  const box = text.getBBox()

  const placed = edgeTextLayout(
    {
      x: Number(element.dataset.labelX),
      y: Number(element.dataset.labelY),
      width: box.width,
      height: box.height,
    },
    [Number(element.dataset.paddingX), Number(element.dataset.paddingY)]
  )

  element.setAttribute(
    'transform',
    `translate(${placed.translate.x} ${placed.translate.y})`
  )
  element.setAttribute('visibility', placed.visible ? 'visible' : 'hidden')
  text.setAttribute('y', String(placed.textY))
  background?.setAttribute('x', String(placed.background.x))
  background?.setAttribute('y', String(placed.background.y))
  background?.setAttribute('width', String(placed.background.width))
  background?.setAttribute('height', String(placed.background.height))
}

/**
 * Owns measured label geometry for the element's lifetime. It re-lays out when
 * the label point, padding or text changes and emits no messages.
 */
const edgeTextMount: Mount.MountAction<never> = {
  name: 'FlowEdgeTextLayout',
  f: (element) =>
    Stream.callback<never>(() =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const observer = new MutationObserver(() => layoutEdgeText(element))
          layoutEdgeText(element)
          observer.observe(element, {
            attributes: true,
            attributeFilter: observedAttributes,
            characterData: true,
            childList: true,
            subtree: true,
          })

          return observer
        }),
        (observer) => Effect.sync(() => observer.disconnect())
      )
    ),
}

/** An SVG edge label centered on a flow-space point with an optional background. */
export const flowEdgeText = <Message>(
  h: FoldHtml.HtmlBuilder<Message>,
  options: FlowEdgeTextOptions,
  children: readonly FoldHtml.Html[] = []
): FoldHtml.Html | null => {
  if (!hasLabel(options.label)) {
    return null
  }

  const [paddingX, paddingY] = options.labelBgPadding ?? [2, 4]
  const radius = String(options.labelBgBorderRadius ?? 2)

  return h.g(
    [
      h.Class(
        ['flow-foldkit-edge-textwrapper', options.className]
          .filter(Boolean)
          .join(' ')
      ),
      h.DataAttribute('label-x', String(options.x)),
      h.DataAttribute('label-y', String(options.y)),
      h.DataAttribute('padding-x', String(paddingX)),
      h.DataAttribute('padding-y', String(paddingY)),
      h.OnMount(edgeTextMount),
    ],
    [
      ...(options.labelShowBg === false
        ? []
        : [
            h.rect([
              h.Class('flow-foldkit-edge-textbg'),
              h.Rx(radius),
              h.Ry(radius),
              h.Style(options.labelBgStyle ?? {}),
            ]),
          ]),
      h.text(
        [
          h.Class('flow-foldkit-edge-text'),
          h.Dy('0.3em'),
          h.Style(options.labelStyle ?? {}),
        ],
        [String(options.label)]
      ),
      ...children,
    ]
  )
}

/** The visible path, interaction path and optional label of a custom edge. */
export const flowBaseEdge = <Message>(
  h: FoldHtml.HtmlBuilder<Message>,
  options: FlowBaseEdgeOptions
): FoldHtml.Html => {
  const interactionWidth = options.interactionWidth ?? 20
  const { labelX, labelY } = options

  const label =
    labelX !== undefined &&
    labelY !== undefined &&
    Number.isFinite(labelX) &&
    Number.isFinite(labelY)
      ? flowEdgeText(h, {
          ...options,
          className: undefined,
          x: labelX,
          y: labelY,
        })
      : null

  return h.g(
    [h.Class('flow-foldkit-base-edge')],
    [
      h.path([
        // Default presentation matches the built-in edge; caller attributes override it.
        h.Stroke('#64748b'),
        h.StrokeWidth('2'),
        ...Object.entries(options.attributes ?? {}).map(([name, value]) =>
          h.Attribute(name, value)
        ),
        h.Class(
          ['flow-foldkit-base-edge-path', options.className]
            .filter(Boolean)
            .join(' ')
        ),
        h.D(options.path),
        h.Fill('none'),
        ...(options.markerStart === undefined
          ? []
          : [h.Attribute('marker-start', options.markerStart)]),
        ...(options.markerEnd === undefined
          ? []
          : [h.Attribute('marker-end', options.markerEnd)]),
        h.Style(options.style ?? {}),
      ]),
      ...(interactionWidth
        ? [
            h.path([
              h.Class('flow-foldkit-edge-interaction'),
              h.D(options.path),
              h.Fill('none'),
              h.Attribute('stroke-opacity', '0'),
              h.StrokeWidth(String(interactionWidth)),
            ]),
          ]
        : []),
      ...(label === null ? [] : [label]),
    ]
  )
}
