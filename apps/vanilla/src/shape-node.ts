import { flowFigureData, flowFigurePath } from '@flow/core'
import type { FlowMiniMapNodeProps, FlowNode } from '@flow/core'

import type { FlowNodeRenderer } from './mount-flow.ts'

const svgNamespace = 'http://www.w3.org/2000/svg'

/** Custom minimap node using the same normalized path as the canvas node. */
export const createFlowFigureMiniMapNode = (
  props: FlowMiniMapNodeProps,
  node: FlowNode | undefined,
  owner: Document = document
): SVGElement => {
  const svg = owner.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('x', String(props.x))
  svg.setAttribute('y', String(props.y))
  svg.setAttribute('width', String(props.width))
  svg.setAttribute('height', String(props.height))
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.dataset['shapeMinimap'] = props.id
  const figure = flowFigureData(node)

  if (figure !== undefined) {
    const path = owner.createElementNS(svgNamespace, 'path')
    path.setAttribute('d', flowFigurePath(figure.type))
    path.setAttribute('fill', figure.color)
    svg.dataset['shape'] = figure.type
    svg.append(path)
  }

  return svg
}

/** One renderer for every decoded figure. The host retains handles and resize controls. */
export const flowFigureNodeRenderer: FlowNodeRenderer = (node, content) => {
  const svg = content.ownerDocument.createElementNS(svgNamespace, 'svg')
  const path = content.ownerDocument.createElementNS(svgNamespace, 'path')
  const label = content.ownerDocument.createElement('span')
  content.style.cssText = 'position:absolute;inset:0'
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.style.cssText = 'position:absolute;inset:0;overflow:visible'
  svg.dataset['shapeSvg'] = ''
  svg.append(path)
  label.style.cssText =
    'position:absolute;inset:0;display:grid;place-items:center;pointer-events:none'
  content.append(svg, label)

  const paint = (current: FlowNode) => {
    const figure = flowFigureData(current)

    if (figure !== undefined) {
      svg.dataset['shape'] = figure.type
      path.setAttribute('d', flowFigurePath(figure.type))
      path.setAttribute('fill', figure.color)
    }

    label.textContent = current.label
  }

  paint(node)

  return {
    update: paint,
    destroy: () => {
      svg.remove()
      label.remove()
    },
  }
}
