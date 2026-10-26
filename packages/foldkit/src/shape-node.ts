import { flowFigureData, flowFigurePath } from '@flow/core'
import type { FlowMiniMapNodeProps, FlowNode } from '@flow/core'

import type { FoldkitNodeRenderer } from './graph.ts'

/** One registry renderer for the decoded figure recipe, with selected-node resizing. */
export const foldkitFigureNodeRenderer: FoldkitNodeRenderer = (node, h) => {
  const figure = flowFigureData(node)

  return h.div(
    [h.Style({ position: 'absolute', inset: '0' })],
    [
      ...(figure === undefined
        ? []
        : [
            h.svg(
              [
                h.Attribute('data-shape-svg', ''),
                h.Attribute('data-shape', figure.type),
                h.ViewBox('0 0 100 100'),
                h.Attribute('preserveAspectRatio', 'none'),
                h.Attribute('width', '100%'),
                h.Attribute('height', '100%'),
                h.Style({
                  position: 'absolute',
                  inset: '0',
                  overflow: 'visible',
                }),
              ],
              [h.path([h.D(flowFigurePath(figure.type)), h.Fill(figure.color)])]
            ),
          ]),
      h.span(
        [
          h.Style({
            position: 'absolute',
            inset: '0',
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }),
        ],
        [node.label]
      ),
    ]
  )
}

/** DOM minimap renderer used by Foldkit's optional overview mount. */
export const createFoldkitFigureMiniMapNode = (
  props: FlowMiniMapNodeProps,
  node: FlowNode | undefined,
  owner: Document
): SVGElement => {
  const svg = owner.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('x', String(props.x))
  svg.setAttribute('y', String(props.y))
  svg.setAttribute('width', String(props.width))
  svg.setAttribute('height', String(props.height))
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.dataset['shapeMinimap'] = props.id
  const figure = flowFigureData(node)

  if (figure !== undefined) {
    const path = owner.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', flowFigurePath(figure.type))
    path.setAttribute('fill', figure.color)
    svg.dataset['shape'] = figure.type
    svg.append(path)
  }

  return svg
}
