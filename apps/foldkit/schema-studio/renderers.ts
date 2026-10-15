import { getSmoothStepPath } from '@flow/core'
import { createFoldkitNodeResizer } from '@flow/foldkit'
import type { FoldkitRendererRegistry, FoldkitNodeResizer } from '@flow/foldkit'
import { Schema as S } from 'effect'

import {
  ItemSchema,
  RelationshipSchema,
  relationshipSides,
} from '../../shared/schema-studio/model.ts'
import { fieldHandle, tableHeight } from './graph.ts'

export const createRenderers = () => {
  const resizers = new Map<string, FoldkitNodeResizer>()

  const registry: FoldkitRendererRegistry = {
    handleAttributes: (node, handle, h) => {
      if (node.type !== 'studio') {
        return []
      }

      const item = S.decodeUnknownSync(ItemSchema)(node.data?.item)

      if (item.kind !== 'table' || !handle.id.startsWith('f')) {
        return []
      }

      const index = Number(
        /^f(?<index>\d+)/u.exec(handle.id)?.groups?.index ?? 0
      )

      return [
        h.Style({
          top: `${44 + Math.min(index, item.collapsed ? 2 : index) * 28 + 14}px`,
        }),
        h.DataAttribute('testid', `field-${node.id}-${handle.id}`),
        h.DataAttribute('studio-field', item.fields[index]?.id ?? ''),
        h.DataAttribute('studio-table', node.id),
      ]
    },
    nodeTypes: {
      studio: (node, h, props) => {
        const item = S.decodeUnknownSync(ItemSchema)(node.data?.item)
        const key = `${item.id}-${tableHeight(item)}`
        let resizer = resizers.get(key)

        if (resizer === undefined) {
          resizer = createFoldkitNodeResizer(
            item.kind === 'table'
              ? {
                  minWidth: 224,
                  maxWidth: 450,
                  minHeight: tableHeight(item),
                  maxHeight: tableHeight(item),
                  handleStyle: { display: 'none' },
                  lineClassName: 'studio-table-resize',
                }
              : {
                  minWidth: item.kind === 'note' ? 200 : 100,
                  minHeight: item.kind === 'note' ? 150 : 100,
                }
          )
          resizers.set(key, resizer)
        }

        const action = (label: string, kind: string) =>
          h.button(
            [
              h.Type('button'),
              h.Class('nodrag nopan'),
              h.DataAttribute('studio-action', kind),
              h.DataAttribute('studio-id', item.id),
            ],
            [label]
          )

        const foreign = node.data?.foreignFields

        return h.div(
          [h.Class('studio-node-content')],
          [
            h.section(
              [
                h.Class('studio-card'),
                h.DataAttribute('item', item.id),
                h.Style({ '--item-color': item.color }),
              ],
              [
                h.header(
                  [
                    h.Class('studio-drag'),
                    h.DataAttribute('testid', `heading-${item.id}`),
                    h.DataAttribute('studio-id', item.id),
                  ],
                  [item.kind === 'view' ? `View · ${item.name}` : item.name]
                ),
                ...(item.kind === 'table'
                  ? [
                      h.div(
                        [h.Class('studio-fields')],
                        item.fields
                          .slice(0, item.collapsed ? 3 : item.fields.length)
                          .map((field) =>
                            h.div(
                              [h.Class('studio-field')],
                              [
                                `${field.primary ? 'PK ' : ''}${Array.isArray(foreign) && foreign.includes(field.id) ? 'FK ' : ''}${field.name} · ${field.type}${field.nullable ? ' ?' : ''}`,
                              ]
                            )
                          )
                      ),
                      h.button(
                        [
                          h.Type('button'),
                          h.Class('studio-collapse nodrag nopan'),
                          h.DataAttribute('testid', `collapse-${item.id}`),
                          h.DataAttribute('studio-action', 'collapse'),
                          h.DataAttribute('studio-id', item.id),
                        ],
                        [item.collapsed ? 'Show more' : 'Collapse fields']
                      ),
                    ]
                  : []),
                ...(item.kind === 'note'
                  ? [
                      h.textarea([
                        h.Class('nodrag nopan nowheel'),
                        h.AriaLabel(`Note ${item.name}`),
                        h.DataAttribute('studio-note', item.id),
                        h.Value(item.text),
                      ]),
                    ]
                  : []),
                ...(item.kind === 'view'
                  ? [h.p([], [item.dependencies.join(' + ')])]
                  : []),
              ]
            ),
            ...resizer.view(h, { zoom: props.zoom, isVisible: props.selected }),
            ...(item.kind !== 'table' || !props.selected
              ? []
              : [
                  h.div(
                    [
                      h.Class('studio-node-toolbar nodrag nopan'),
                      h.DataAttribute('node-toolbar', item.id),
                    ],
                    [
                      action('Edit', 'edit'),
                      action('Duplicate', 'duplicate'),
                      action('Relate', 'relate'),
                    ]
                  ),
                ]),
          ]
        )
      },
    },
    edgeTypes: {
      relationship: (edge, geometry, h, labels, interaction) => {
        const relation = S.decodeUnknownSync(RelationshipSchema)(
          edge.data?.relation
        )

        const source = geometry.sourceNode
        const target = geometry.targetNode

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

        const sourceItem = S.decodeUnknownSync(ItemSchema)(
          source.node.data?.item
        )

        const targetItem = S.decodeUnknownSync(ItemSchema)(
          target.node.data?.item
        )

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

        const [path, x, y] = getSmoothStepPath({
          sourceX:
            source.absolutePosition.x +
            (start?.offset.x ?? (sides.source === 'right' ? source.width : 0)),
          sourceY: source.absolutePosition.y + (start?.offset.y ?? 58),
          targetX:
            target.absolutePosition.x +
            (end?.offset.x ?? (sides.target === 'right' ? target.width : 0)),
          targetY: target.absolutePosition.y + (end?.offset.y ?? 58),
          sourcePosition: sides.source,
          targetPosition: sides.target,
          borderRadius: 8,
        })

        interaction(path)
        const prefix = `studio-${edge.id}`
        const variant = edge.selected ? 'selected' : 'normal'
        labels(
          h.button(
            [
              h.Type('button'),
              h.Class('studio-edge-label nodrag nopan'),
              h.DataAttribute('testid', `cardinality-${edge.id}`),
              h.DataAttribute('studio-cardinality', edge.id),
              h.Style({ left: `${x}px`, top: `${y}px` }),
            ],
            [
              `${relation.sourceCardinality === 'one' ? '1' : 'N'} : ${relation.targetCardinality === 'one' ? '1' : 'N'}`,
            ]
          )
        )

        return h.g(
          [],
          [
            h.defs(
              [],
              ['one', 'many'].flatMap((cardinality) =>
                ['left', 'right'].flatMap((side) =>
                  [false, true].map((selected) =>
                    h.marker(
                      [
                        h.Id(
                          `${prefix}-${cardinality}-${side}-${selected ? 'selected' : 'normal'}`
                        ),
                        h.ViewBox('0 0 16 16'),
                        h.RefX('15'),
                        h.RefY('8'),
                        h.MarkerWidth('16'),
                        h.MarkerHeight('16'),
                        h.Orient('auto-start-reverse'),
                        h.MarkerUnits('userSpaceOnUse'),
                      ],
                      [
                        h.path([
                          h.D(
                            cardinality === 'one'
                              ? 'M8 2V14 M13 2V14'
                              : 'M1 8L15 2 M1 8H15 M1 8L15 14'
                          ),
                          h.Fill('none'),
                          h.Stroke(selected ? '#dd5a24' : '#648593'),
                          h.StrokeWidth('1.5'),
                        ]),
                      ]
                    )
                  )
                )
              )
            ),
            h.path([
              h.Class('studio-relationship flow-foldkit-edge-path'),
              h.DataAttribute('testid', `relationship-${edge.id}`),
              h.DataAttribute(
                'highlighted',
                String(edge.data?.highlighted === true)
              ),
              h.D(path),
              h.Fill('none'),
              h.Stroke(edge.selected ? '#dd5a24' : '#648593'),
              h.Style({
                stroke: edge.selected ? '#dd5a24' : '#648593',
                'stroke-width': '1.5px',
              }),
              h.StrokeWidth('1.5'),
              h.MarkerStart(
                `url(#${prefix}-${relation.sourceCardinality}-${sides.source}-${variant})`
              ),
              h.MarkerEnd(
                `url(#${prefix}-${relation.targetCardinality}-${sides.target}-${variant})`
              ),
            ]),
          ]
        )
      },
    },
    connectionPreview: (preview, h) =>
      h.path([
        h.D(
          `M${preview.from.x} ${preview.from.y} L${preview.to.x} ${preview.to.y}`
        ),
        h.Stroke('#dd5a24'),
        h.StrokeWidth('3'),
        h.Attribute('stroke-dasharray', '6 4'),
      ]),
  }

  return {
    registry,
    dispose: () => {
      for (const resizer of resizers.values()) {
        resizer.dispose()
      }
    },
  }
}
