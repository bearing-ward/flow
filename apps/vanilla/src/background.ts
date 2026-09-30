import * as S from 'effect/Schema'

import type { FlowController } from './mount-flow.ts'

const PositivePairSchema = S.Tuple([
  S.Finite.check(S.isGreaterThan(0)),
  S.Finite.check(S.isGreaterThan(0)),
])

const OffsetPairSchema = S.Tuple([S.Finite, S.Finite])

const BackgroundOptionsSchema = S.Struct({
  variant: S.optional(S.Literals(['dots', 'lines', 'cross'])),
  gap: S.optional(
    S.Union([S.Finite.check(S.isGreaterThan(0)), PositivePairSchema])
  ),
  size: S.optional(S.Finite.check(S.isGreaterThan(0))),
  offset: S.optional(S.Union([S.Finite, OffsetPairSchema])),
  color: S.optional(S.NonEmptyString),
  bgColor: S.optional(S.NonEmptyString),
  id: S.optional(S.NonEmptyString),
  className: S.optional(S.String),
  patternClassName: S.optional(S.String),
  style: S.optional(S.Record(S.String, S.String)),
  lineWidth: S.optional(S.Finite.check(S.isGreaterThan(0))),
})

export type FlowBackgroundOptions = typeof BackgroundOptionsSchema.Encoded

export interface FlowBackgroundMount {
  readonly element: SVGSVGElement
  readonly destroy: () => void
}

let generatedId = 0

const pair = (
  value: number | readonly [number, number] | undefined,
  fallback: number
): readonly [number, number] => {
  if (value === undefined) {
    return [fallback, fallback]
  }

  // eslint-disable-next-line anti-slop/no-runtime-typeof -- numeric spacing and offsets are the documented public union; the schema validated this value immediately above.
  if (typeof value === 'number') {
    return [value, value]
  }

  return [value[0], value[1]]
}

const backgroundStyleName = (name: string): string =>
  name.startsWith('--')
    ? name
    : name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)

/** Mount a canvas-aligned SVG pattern in a caller-owned element. */
export const createFlowBackground = (
  container: HTMLElement,
  controller: FlowController,
  input: FlowBackgroundOptions = {}
): FlowBackgroundMount => {
  const options = S.decodeUnknownSync(BackgroundOptionsSchema)(input)
  const variant = options.variant ?? 'dots'
  const [gapX, gapY] = pair(options.gap, 20)
  const [offsetX, offsetY] = pair(options.offset, 0)
  const size = options.size ?? (variant === 'cross' ? 6 : 1)
  generatedId += 1
  const id = options.id ?? `flow-background-${generatedId}`
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('flow-background')

  if (options.className) {
    svg.classList.add(...options.className.split(/\s+/u).filter(Boolean))
  }

  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.dataset.variant = variant

  for (const [name, value] of Object.entries(options.style ?? {})) {
    svg.style.setProperty(backgroundStyleName(name), value)
  }

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

  const pattern = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'pattern'
  )

  pattern.id = id
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')

  if (options.patternClassName) {
    pattern.classList.add(
      ...options.patternClassName.split(/\s+/u).filter(Boolean)
    )
  }

  if (variant === 'dots') {
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    )

    circle.setAttribute('fill', options.color ?? '#cbd5e1')
    pattern.append(circle)
  } else if (variant === 'lines') {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', options.color ?? '#cbd5e1')
    path.setAttribute('stroke-width', String(options.lineWidth ?? 1))
    pattern.append(path)
  } else {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', options.color ?? '#cbd5e1')
    path.setAttribute('stroke-width', String(options.lineWidth ?? 1))
    pattern.append(path)
  }

  defs.append(pattern)
  svg.append(defs)

  if (options.bgColor) {
    const background = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    )

    background.setAttribute('width', '100%')
    background.setAttribute('height', '100%')
    background.setAttribute('fill', options.bgColor)
    svg.append(background)
  }

  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  fill.setAttribute('width', '100%')
  fill.setAttribute('height', '100%')
  fill.setAttribute('fill', `url(#${id})`)
  svg.append(fill)
  container.prepend(svg)

  const renderViewport = (
    viewport: ReturnType<FlowController['getViewport']>
  ): void => {
    const scaledGapX = gapX * viewport.zoom || 1
    const scaledGapY = gapY * viewport.zoom || 1
    const scaledSize = size * viewport.zoom
    const patternWidth = variant === 'cross' ? scaledSize : scaledGapX
    const patternHeight = variant === 'cross' ? scaledSize : scaledGapY
    const scaledOffsetX = offsetX * viewport.zoom + patternWidth / 2
    const scaledOffsetY = offsetY * viewport.zoom + patternHeight / 2

    pattern.setAttribute('width', String(scaledGapX))
    pattern.setAttribute('height', String(scaledGapY))
    pattern.setAttribute('x', String(viewport.x % scaledGapX))
    pattern.setAttribute('y', String(viewport.y % scaledGapY))
    pattern.setAttribute(
      'patternTransform',
      `translate(-${scaledOffsetX},-${scaledOffsetY})`
    )

    if (variant === 'dots') {
      const circle = pattern.querySelector('circle')
      circle?.setAttribute('cx', String(scaledSize / 2))
      circle?.setAttribute('cy', String(scaledSize / 2))
      circle?.setAttribute('r', String(scaledSize / 2))
    } else {
      const path = pattern.querySelector('path')
      path?.setAttribute(
        'd',
        `M ${patternWidth / 2} 0 V ${patternHeight} M 0 ${patternHeight / 2} H ${patternWidth}`
      )
    }
  }

  renderViewport(controller.getViewport())

  const unsubscribe = controller.subscribeViewport(({ viewport }) => {
    renderViewport(viewport)
  })

  let destroyed = false

  return {
    element: svg,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true
      unsubscribe()
      svg.remove()
    },
  }
}
