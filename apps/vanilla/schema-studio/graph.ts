import { FlowDocumentSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Schema as S } from 'effect'

import {
  areaFor,
  overlaps,
  relationshipSides,
} from '../../shared/schema-studio/model.ts'
import type {
  Item,
  Relationship,
  Studio,
} from '../../shared/schema-studio/model.ts'

export const fieldHandle = (item: Item, field: string, side: string): string =>
  `f${item.kind === 'table' ? item.fields.findIndex((candidate) => candidate.id === field) : 0}-${side}`

export const fieldEndpoint = (
  studio: Studio,
  table: string,
  handle: string | undefined
): Relationship['source'] | undefined => {
  const item = studio.items.find((candidate) => candidate.id === table)

  const index = Number(
    /^f(?<index>\d+)-/u.exec(handle ?? '')?.groups?.index ?? -1
  )

  const field = item?.kind === 'table' ? item.fields[index] : undefined

  return field === undefined ? undefined : { table, field: field.id }
}

export const tableHeight = (item: Item): number =>
  item.kind === 'table'
    ? 44 +
      Math.min(item.fields.length, item.collapsed ? 3 : item.fields.length) *
        28 +
      30
    : item.height

const handlesFor = (item: Item) => {
  if (item.kind === 'view') {
    return [
      { id: 'dependency', kind: 'target', side: 'top', connectable: false },
    ]
  }

  return item.kind === 'table'
    ? [
        ...item.fields.flatMap((_field, index) => [
          { id: `f${index}-left`, kind: 'source', side: 'left' },
          { id: `f${index}-right`, kind: 'source', side: 'right' },
        ]),
        { id: 'dependency', kind: 'source', side: 'top', connectable: false },
      ]
    : []
}

export interface GraphSettings {
  readonly selected: ReadonlySet<string>
  readonly selectedEdges: ReadonlySet<string>
  readonly hiddenTables: ReadonlySet<string>
  readonly dependencies: boolean
  readonly highlightOverlaps: boolean
}

export const projectGraph = (
  studio: Studio,
  settings: GraphSettings
): FlowDocument => {
  const hidden = (item: Item): boolean =>
    item.kind === 'table' && settings.hiddenTables.has(item.id)

  const nodes = studio.items.map((item) => {
    const parent = areaFor(item, studio.items)

    const handles = handlesFor(item)

    const overlap =
      item.kind === 'table' &&
      settings.highlightOverlaps &&
      studio.items.some(
        (other) =>
          other.kind === 'table' &&
          other.id !== item.id &&
          overlaps(item, other)
      )

    return {
      id: item.id,
      label: item.name,
      type: 'studio',
      position:
        parent === undefined
          ? item.position
          : {
              x: item.position.x - parent.position.x,
              y: item.position.y - parent.position.y,
            },
      parentId: parent?.id,
      size: { width: item.width, height: tableHeight(item) },
      selected: settings.selected.has(item.id),
      hidden: hidden(item),
      handles,
      zIndex:
        { area: -10, note: 50, table: 0, view: 0 }[item.kind] +
        (settings.selected.has(item.id) ? 1000 : 0) -
        1,
      className: `studio-node studio-${item.kind}${overlap ? ' studio-overlap' : ''}`,
      dragHandle: '.studio-drag',
      data: {
        item,
        foreignFields: studio.relationships
          .filter((relation) => relation.source.table === item.id)
          .map((relation) => relation.source.field),
      },
    }
  })

  const edges = studio.relationships.flatMap((relation) => {
    const source = studio.items.find(
      (item) => item.id === relation.source.table
    )

    const target = studio.items.find(
      (item) => item.id === relation.target.table
    )

    if (source === undefined || target === undefined) {
      return []
    }

    const sides = relationshipSides(source, target)

    const highlighted =
      settings.selected.has(source.id) || settings.selected.has(target.id)

    return [
      {
        id: relation.id,
        source: source.id,
        target: target.id,
        sourceHandle: fieldHandle(source, relation.source.field, sides.source),
        targetHandle: fieldHandle(target, relation.target.field, sides.target),
        type: 'relationship',
        path: 'smoothstep',
        selected: settings.selectedEdges.has(relation.id),
        hidden: hidden(source) || hidden(target),
        zIndex: highlighted || settings.selectedEdges.has(relation.id) ? 1 : 0,
        animated: highlighted,
        reconnectable: true,
        data: { relation, highlighted },
      },
    ]
  })

  return S.decodeUnknownSync(FlowDocumentSchema)({
    nodes,
    edges: [
      ...edges,
      ...studio.items.flatMap((item) =>
        item.kind === 'view'
          ? item.dependencies.map((source) => ({
              id: `dependency-${item.id}-${source}`,
              source,
              target: item.id,
              sourceHandle: 'dependency',
              targetHandle: 'dependency',
              path: 'smoothstep',
              hidden:
                !settings.dependencies ||
                hidden(
                  studio.items.find((candidate) => candidate.id === source) ??
                    item
                ),
              animated: true,
              stroke: '#7657a8',
              label: 'depends on',
            }))
          : []
      ),
    ],
  })
}
