import { getSmoothStepPath } from '@flow/core'
import { Schema as S } from 'effect'

import {
  ItemSchema,
  relationshipSides,
  RelationshipSchema,
} from '../../shared/schema-studio/model.ts'
import type { Item } from '../../shared/schema-studio/model.ts'
import { createFlowBaseEdge } from '../src/public.ts'
import type {
  FlowEdgeRenderer,
  FlowNodeRenderer,
  JavaScriptFlowController,
} from '../src/public.ts'
import { fieldHandle } from './graph.ts'

export const button = (
  label: string,
  action: () => void
): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.textContent = label
  element.addEventListener('click', action)

  return element
}

export const nodeRenderer =
  (actions: {
    readonly contents: Map<string, HTMLElement>
    readonly edit: (item: Item) => void
    readonly collapse: (item: Item) => void
  }): FlowNodeRenderer =>
  (node, content) => {
    actions.contents.set(node.id, content)
    let fingerprint = ''

    const paint = (next: typeof node): void => {
      const item = S.decodeUnknownSync(ItemSchema)(next.data?.item)

      const key = JSON.stringify({
        ...item,
        foreignFields: next.data?.foreignFields,
        position: undefined,
        width: undefined,
        height: undefined,
      })

      if (key === fingerprint) {
        return
      }

      fingerprint = key
      const card = document.createElement('section')
      card.className = 'studio-card'
      card.dataset.item = item.id
      card.style.setProperty('--item-color', item.color)
      const header = document.createElement('header')
      header.className = 'studio-drag'
      header.textContent =
        item.kind === 'view' ? `View · ${item.name}` : item.name
      header.dataset.testid = `heading-${item.id}`

      card.append(header)

      if (item.kind === 'table') {
        const rows = document.createElement('div')
        rows.className = 'studio-fields'

        for (const field of item.fields.slice(
          0,
          item.collapsed ? 3 : item.fields.length
        )) {
          const row = document.createElement('div')
          row.className = 'studio-field'
          const foreign = next.data?.foreignFields
          row.textContent = `${field.primary ? 'PK ' : ''}${Array.isArray(foreign) && foreign.includes(field.id) ? 'FK ' : ''}${field.name} · ${field.type}${field.nullable ? ' ?' : ''}`
          row.title = 'Double-click to edit fields'

          rows.append(row)
        }

        card.append(rows)

        const toggle = button(
          item.collapsed ? 'Show more' : 'Collapse fields',
          () => actions.collapse(item)
        )

        toggle.className = 'studio-collapse nodrag nopan'
        toggle.dataset.testid = `collapse-${item.id}`
        card.append(toggle)
      } else if (item.kind === 'note') {
        const text = document.createElement('textarea')
        text.className = 'nodrag nopan nowheel'
        text.setAttribute('aria-label', `Note ${item.name}`)
        text.value = item.text
        text.addEventListener('change', () =>
          actions.edit({ ...item, text: text.value })
        )
        card.append(text)
      } else if (item.kind === 'view') {
        const text = document.createElement('p')
        text.textContent = item.dependencies.join(' + ')
        card.append(text)
      }

      content.replaceChildren(card)
    }

    paint(node)

    return {
      update: paint,
      destroy: () => {
        if (actions.contents.get(node.id) === content) {
          actions.contents.delete(node.id)
        }

        content.replaceChildren()
      },
    }
  }

const namespace = 'http://www.w3.org/2000/svg'

export const relationshipRenderer = (
  controller: () => JavaScriptFlowController | undefined,
  open: (id: string, x: number, y: number) => void
): FlowEdgeRenderer => {
  const geometry: NonNullable<FlowEdgeRenderer['geometry']> = (
    edge,
    fallback
  ) => {
    const relation = S.decodeUnknownSync(RelationshipSchema)(
      edge.data?.relation
    )

    const source = controller()?.getInternalNode(edge.source)
    const target = controller()?.getInternalNode(edge.target)

    if (source === undefined || target === undefined) {
      const [pathData, x, y] = getSmoothStepPath({
        sourceX: fallback.source.x,
        sourceY: fallback.source.y,
        targetX: fallback.target.x,
        targetY: fallback.target.y,
        sourcePosition: fallback.sourceSide,
        targetPosition: fallback.targetSide,
      })

      return { pathData, labelAnchor: { x, y } }
    }

    const sides = relationshipSides(
      {
        position: source.absolutePosition,
        width: source.width,
        height: source.height,
      },
      {
        position: target.absolutePosition,
        width: target.width,
        height: target.height,
      }
    )

    const sourceItem = S.decodeUnknownSync(ItemSchema)(source.node.data?.item)
    const targetItem = S.decodeUnknownSync(ItemSchema)(target.node.data?.item)

    const start = source.handles.find(
      (handle) =>
        handle.handleId ===
        fieldHandle(sourceItem, relation.source.field, sides.source)
    )

    const end = target.handles.find(
      (handle) =>
        handle.handleId ===
        fieldHandle(targetItem, relation.target.field, sides.target)
    )

    const [pathData, x, y] = getSmoothStepPath({
      sourceX: source.absolutePosition.x + (start?.offset.x ?? source.width),
      sourceY: source.absolutePosition.y + (start?.offset.y ?? 58),
      targetX: target.absolutePosition.x + (end?.offset.x ?? 0),
      targetY: target.absolutePosition.y + (end?.offset.y ?? 58),
      sourcePosition: sides.source,
      targetPosition: sides.target,
      borderRadius: 8,
    })

    return { pathData, labelAnchor: { x, y } }
  }

  return {
    geometry,
    render: (edge, context, visual) => {
      const definitions = document.createElementNS(namespace, 'defs')
      const prefix = `studio-${edge.id}`

      for (const cardinality of ['one', 'many']) {
        const marker = document.createElementNS(namespace, 'marker')
        marker.id = `${prefix}-${cardinality}`
        marker.setAttribute('viewBox', '0 0 16 16')
        marker.setAttribute('refX', '15')
        marker.setAttribute('refY', '8')
        marker.setAttribute('markerWidth', '16')
        marker.setAttribute('markerHeight', '16')
        marker.setAttribute('orient', 'auto-start-reverse')
        marker.setAttribute('markerUnits', 'userSpaceOnUse')
        const path = document.createElementNS(namespace, 'path')
        path.setAttribute(
          'd',
          cardinality === 'one'
            ? 'M8 2V14 M13 2V14'
            : 'M1 8L15 2 M1 8H15 M1 8L15 14'
        )
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', 'context-stroke')
        path.setAttribute('stroke-width', '1.5')
        marker.append(path)
        definitions.append(marker)
      }

      let currentPath = context.pathData
      const base = createFlowBaseEdge(document, { path: currentPath })
      visual.append(definitions, base.element)

      const label = button('', () => {
        const rect = label.getBoundingClientRect()
        open(edge.id, rect.x, rect.bottom)
      })

      label.addEventListener('click', (event) => event.stopPropagation())
      label.className = 'studio-edge-label nodrag nopan'
      label.dataset.testid = `cardinality-${edge.id}`
      context.edgeLabelRenderer.append(label)

      const paint = (next: typeof edge, nextContext: typeof context): void => {
        currentPath = nextContext.pathData

        const relation = S.decodeUnknownSync(RelationshipSchema)(
          next.data?.relation
        )

        const highlighted = next.data?.highlighted === true
        base.update({
          path: nextContext.pathData,
          markerStart: `url(#${prefix}-${relation.sourceCardinality})`,
          markerEnd: `url(#${prefix}-${relation.targetCardinality})`,
          style: {
            stroke: highlighted ? '#dd5a24' : '#648593',
            strokeWidth: highlighted ? '3' : '1.5',
          },
          attributes: {
            'data-testid': `relationship-${edge.id}`,
            'data-highlighted': String(highlighted),
          },
        })
        label.textContent = `${relation.sourceCardinality === 'one' ? '1' : 'N'} : ${relation.targetCardinality === 'one' ? '1' : 'N'}`
        label.style.left = `${nextContext.labelAnchor.x}px`
        label.style.top = `${nextContext.labelAnchor.y}px`
      }

      paint(edge, context)

      return {
        update: paint,
        updateProps: (_props, next) =>
          paint(controller()?.getEdge(edge.id) ?? edge, next),
        interactionPath: () => currentPath,
        destroy: () => {
          base.dispose()
          definitions.remove()
          label.remove()
        },
      }
    },
  }
}
