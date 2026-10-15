import {
  FlowDocumentSchema,
  ViewportSchema,
  FlowSpan,
  FlowAttribute,
} from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { Message } from 'foldkit'
import type { Html, Update } from 'foldkit'

import {
  history,
  record,
  redo,
  undo,
  ItemSchema,
  TableSchema,
  FieldSchema,
  StudioSchema,
  canConnect,
} from '../../shared/schema-studio/model.ts'
import type {
  Item,
  Studio,
  Relationship,
} from '../../shared/schema-studio/model.ts'
import { tableHeight } from './graph.ts'

const point = S.Struct({ x: S.Finite, y: S.Finite })

const endpoint = S.Struct({ table: S.String, field: S.String })

export const MenuSchema = S.Union([
  S.Struct({ kind: S.Literal('closed') }),
  S.Struct({ kind: S.Literal('pane'), point, screen: point }),
  S.Struct({ kind: S.Literal('node'), id: S.String, point, screen: point }),
  S.Struct({ kind: S.Literal('cardinality'), id: S.String, screen: point }),
])

const EditorItemSchema = S.Union([
  S.Struct({
    ...TableSchema.fields,
    fields: S.Array(
      S.Struct({ ...FieldSchema.fields, name: S.String, type: S.String })
    ),
  }),
  ItemSchema,
])

export const ModelSchema = S.Struct({
  history: S.Struct({
    past: S.Array(StudioSchema),
    present: StudioSchema,
    future: S.Array(StudioSchema),
  }),
  selected: S.Array(S.String),
  selectedEdges: S.Array(S.String),
  hiddenTables: S.Array(S.String),
  filter: S.String,
  snap: S.Boolean,
  shift: S.Boolean,
  panScroll: S.Boolean,
  visibleOnly: S.Boolean,
  dependencies: S.Boolean,
  dark: S.Boolean,
  minimap: S.Boolean,
  overlaps: S.Boolean,
  busy: S.Number,
  viewport: ViewportSchema,
  flow: FlowDocumentSchema,
  announcement: S.String,
  reconnect: S.String,
  menu: MenuSchema,
  editor: S.NullOr(EditorItemSchema),
  clipboard: S.Array(ItemSchema),
  floating: S.NullOr(S.Struct({ source: endpoint, position: point })),
  lost: S.Boolean,
})

export type Model = typeof ModelSchema.Type

export const Msg = Message.defineMessageUnion({
  Ready: {},
  Done: {},
  Failure: { message: S.String },
  Filter: { value: S.String },
  Focus: { id: S.String },
  Toggle: {
    key: S.Literals([
      'snap',
      'panScroll',
      'visibleOnly',
      'dependencies',
      'dark',
      'minimap',
      'overlaps',
    ]),
  },
  Shift: { pressed: S.Boolean },
  Viewport: { viewport: ViewportSchema, lost: S.Boolean },
  Selection: { nodes: S.Array(S.String), edges: S.Array(S.String) },
  Flow: { document: FlowDocumentSchema },
  Accepted: { document: FlowDocumentSchema },
  Visibility: { id: S.String },
  ShowAll: {},
  Zoom: { direction: S.Literals(['in', 'out']) },
  Layout: {},
  Undo: {},
  Redo: {},
  Copy: {},
  Paste: {},
  Delete: {},
  DeleteItem: { id: S.String },
  Intersections: {},
  OpenMenu: { menu: MenuSchema },
  CloseMenu: {},
  Add: { kind: S.Literals(['table', 'note', 'area']), id: S.String, point },
  Edit: { id: S.String },
  Draft: {
    value: S.String,
    field: S.String,
    property: S.Literals(['name', 'type', 'color']),
  },
  Save: {},
  Cancel: {},
  Note: { id: S.String, text: S.String },
  Collapse: { id: S.String },
  Duplicate: { ids: S.Array(S.String), suffix: S.String },
  Cardinality: {
    id: S.String,
    source: S.Literals(['one', 'many']),
    target: S.Literals(['one', 'many']),
  },
  Connect: {
    source: endpoint,
    target: endpoint,
    id: S.String,
    replacing: S.NullOr(S.String),
  },
  Reconnect: { value: S.String },
  Float: { source: endpoint, position: point },
  Pointer: { position: point },
  FinishFloat: { target: endpoint, id: S.String },
  Escape: {},
  Import: { studio: StudioSchema },
  Export: { kind: S.Literals(['png', 'json']) },
  ImportFile: {},
})

export type StudioMessage = typeof Msg.Type

export const initialModel = (studio: Studio): Model => ({
  history: history(studio),
  selected: [],
  selectedEdges: [],
  hiddenTables: [],
  filter: '',
  snap: false,
  shift: false,
  panScroll: true,
  visibleOnly: true,
  dependencies: true,
  dark: false,
  minimap: true,
  overlaps: false,
  busy: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  flow: { nodes: [], edges: [] },
  announcement: '',
  reconnect: '',
  menu: { kind: 'closed' },
  editor: null,
  clipboard: [],
  floating: null,
  lost: false,
})

export interface Host {
  readonly paint: (model: Model) => void
  readonly settings: (model: Model) => void
  readonly fit: (id?: string) => Promise<void>
  readonly zoom: (direction: 'in' | 'out') => Promise<void>
  readonly delete: (
    ids: readonly string[],
    edges: readonly string[]
  ) => Promise<void>
  readonly intersections: () => Promise<readonly string[]>
  readonly layout: (studio: Studio) => Studio
  readonly persist: (studio: Studio) => void
  readonly export: (kind: 'png' | 'json', model: Model) => Promise<void>
  readonly import: () => void
}

const effect = (run: () => Promise<StudioMessage> | StudioMessage) => ({
  name: 'SchemaStudioBoundary',
  effect: Effect.tryPromise({
    try: async () => await run(),
    catch: (cause) => cause,
  }).pipe(
    Effect.tapError((cause) =>
      Effect.logError('Schema Studio command failed', cause).pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]:
            cause instanceof Error ? cause.name : 'Unknown',
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    ),
    Effect.match({
      onFailure: (error) =>
        Msg.Failure({
          message: error instanceof Error ? error.message : String(error),
        }),
      onSuccess: (message) => message,
    })
  ),
})

export const createUpdate = (host: Host) => {
  const paint = (model: Model): Update.Return<Model, StudioMessage> => ({
    model,
    commands: [
      effect(() => {
        host.paint(model)

        return Msg.Done()
      }),
    ],
  })

  const commit = (model: Model, studio: Studio) => {
    const next = { ...model, history: record(model.history, studio) }

    return {
      model: next,
      commands: [
        effect(() => {
          host.persist(studio)
          host.paint(next)

          return Msg.Done()
        }),
      ],
    }
  }

  const replace = (model: Model, item: Item) =>
    commit(model, {
      ...model.history.present,
      items: model.history.present.items.map((current) =>
        current.id === item.id ? item : current
      ),
    })

  const fit = (model: Model, id?: string) => ({
    model: { ...model, busy: model.busy + 1 },
    commands: [
      effect(async () => {
        await host.fit(id)

        return Msg.Ready()
      }),
    ],
  })

  const duplicate = (model: Model, items: readonly Item[], suffix: string) => {
    const ids = new Map(items.map((item) => [item.id, `${item.id}-${suffix}`]))

    const copies = items.map((item) => ({
      ...item,
      id: ids.get(item.id) ?? item.id,
      name: `${item.name} copy`,
      position: { x: item.position.x + 40, y: item.position.y + 40 },
    }))

    const relations = model.history.present.relationships.flatMap(
      (relation) => {
        const source = ids.get(relation.source.table)
        const target = ids.get(relation.target.table)

        return source === undefined || target === undefined
          ? []
          : [
              {
                ...relation,
                id: `${relation.id}-${suffix}`,
                source: { ...relation.source, table: source },
                target: { ...relation.target, table: target },
              },
            ]
      }
    )

    return commit(
      {
        ...model,
        selected: copies.map((item) => item.id),
        menu: { kind: 'closed' },
      },
      {
        ...model.history.present,
        items: [...model.history.present.items, ...copies],
        relationships: [...model.history.present.relationships, ...relations],
      }
    )
  }

  const connect = (
    model: Model,
    source: Relationship['source'],
    target: Relationship['target'],
    id: string,
    replacing: string | null
  ) => {
    if (
      !canConnect(model.history.present, source, target, replacing ?? undefined)
    ) {
      return { model }
    }

    const relationships =
      replacing === null
        ? [
            ...model.history.present.relationships,
            {
              id,
              source,
              target,
              sourceCardinality: 'one' as const,
              targetCardinality: 'one' as const,
            },
          ]
        : model.history.present.relationships.map((relation) =>
            relation.id === replacing
              ? { ...relation, source, target }
              : relation
          )

    return commit(
      { ...model, floating: null },
      { ...model.history.present, relationships }
    )
  }

  return (
    model: Model,
    message: StudioMessage
  ): Update.Return<Model, StudioMessage> =>
    Msg.match(message, {
      Done: () => ({ model }),
      Ready: () => ({ model: { ...model, busy: Math.max(0, model.busy - 1) } }),
      Failure: ({ message: text }) => ({
        model: { ...model, busy: 0, announcement: text },
      }),
      Filter: ({ value }) => ({ model: { ...model, filter: value } }),
      Focus: ({ id }) => {
        const next = { ...model, selected: [id], selectedEdges: [] }

        return {
          model: { ...next, busy: model.busy + 1 },
          commands: [
            effect(async () => {
              host.paint(next)
              await host.fit(id)

              return Msg.Ready()
            }),
          ],
        }
      },
      Toggle: ({ key }) => {
        const next = { ...model, [key]: !model[key] }

        return {
          model: next,
          commands: [
            effect(() => {
              host.settings(next)
              host.paint(next)

              return Msg.Done()
            }),
          ],
        }
      },
      Shift: ({ pressed }) => {
        const next = { ...model, shift: pressed }

        return {
          model: next,
          commands: [
            effect(() => {
              host.settings(next)

              return Msg.Done()
            }),
          ],
        }
      },
      Viewport: ({ viewport, lost }) => ({
        model: { ...model, viewport, lost },
      }),
      Selection: ({ nodes, edges }) =>
        paint({ ...model, selected: nodes, selectedEdges: edges }),
      Flow: ({ document }) => ({ model: { ...model, flow: document } }),
      Accepted: ({ document }) => {
        const nodes = new Map<string, (typeof document.nodes)[number]>(
          document.nodes.map((node) => [node.id, node])
        )

        const items = model.history.present.items.flatMap((item) => {
          const node = nodes.get(item.id)

          if (node === undefined) {
            return []
          }

          const parent =
            node.parentId === undefined ? undefined : nodes.get(node.parentId)

          return [
            {
              ...item,
              position: {
                x: node.position.x + (parent?.position.x ?? 0),
                y: node.position.y + (parent?.position.y ?? 0),
              },
              width: node.size?.width ?? item.width,
              height:
                item.kind === 'table'
                  ? item.height
                  : (node.size?.height ?? item.height),
            },
          ]
        })

        const ids = new Set(items.map((item) => item.id))
        const edges = new Set<string>(document.edges.map((edge) => edge.id))

        const studio = {
          ...model.history.present,
          items: items.map((item) =>
            item.kind === 'view'
              ? {
                  ...item,
                  dependencies: item.dependencies.filter((id) => ids.has(id)),
                }
              : item
          ),
          relationships: model.history.present.relationships.filter(
            (relation) =>
              ids.has(relation.source.table) &&
              ids.has(relation.target.table) &&
              edges.has(relation.id)
          ),
        }

        const next = {
          ...model,
          flow: document,
          selected: document.nodes
            .filter((node) => node.selected)
            .map((node) => node.id),
          selectedEdges: document.edges
            .filter((edge) => edge.selected)
            .map((edge) => edge.id),
        }

        return JSON.stringify(studio) === JSON.stringify(model.history.present)
          ? paint(next)
          : commit(next, studio)
      },
      Visibility: ({ id }) => {
        const next = {
          ...model,
          hiddenTables: model.hiddenTables.includes(id)
            ? model.hiddenTables.filter((value) => value !== id)
            : [...model.hiddenTables, id],
          busy: model.busy + 1,
        }

        return {
          model: next,
          commands: [
            effect(async () => {
              host.paint(next)
              await host.fit()

              return Msg.Ready()
            }),
          ],
        }
      },
      ShowAll: () => fit(model),
      Zoom: ({ direction }) => ({
        model: { ...model, busy: model.busy + 1 },
        commands: [
          effect(async () => {
            await host.zoom(direction)

            return Msg.Ready()
          }),
        ],
      }),
      Layout: () => {
        const next = {
          ...model,
          history: record(model.history, host.layout(model.history.present)),
          busy: model.busy + 1,
        }

        return {
          model: next,
          commands: [
            effect(async () => {
              host.persist(next.history.present)
              host.paint(next)
              await host.fit()

              return Msg.Ready()
            }),
          ],
        }
      },
      Undo: () => {
        const next = {
          ...model,
          history: undo(model.history),
          announcement: 'Undid change',
        }

        return {
          model: next,
          commands: [
            effect(() => {
              host.persist(next.history.present)
              host.paint(next)

              return Msg.Done()
            }),
          ],
        }
      },
      Redo: () => {
        const next = {
          ...model,
          history: redo(model.history),
          announcement: 'Redid change',
        }

        return {
          model: next,
          commands: [
            effect(() => {
              host.persist(next.history.present)
              host.paint(next)

              return Msg.Done()
            }),
          ],
        }
      },
      Copy: () => ({
        model: {
          ...model,
          clipboard: model.history.present.items.filter(
            (item) => item.kind === 'table' && model.selected.includes(item.id)
          ),
          announcement: `Copied ${model.selected.length} tables`,
        },
      }),
      Paste: () => duplicate(model, model.clipboard, crypto.randomUUID()),
      Duplicate: ({ ids, suffix }) =>
        duplicate(
          model,
          model.history.present.items.filter((item) => ids.includes(item.id)),
          suffix
        ),
      Delete: () => ({
        model: {
          ...model,
          menu: { kind: 'closed' },
          announcement: 'Deleted selected items',
        },
        commands: [
          effect(async () => {
            await host.delete(model.selected, model.selectedEdges)

            return Msg.Done()
          }),
        ],
      }),
      DeleteItem: ({ id }) => ({
        model: { ...model, menu: { kind: 'closed' } },
        commands: [
          effect(async () => {
            await host.delete([id], [])

            return Msg.Done()
          }),
        ],
      }),
      Intersections: () => ({
        model,
        commands: [
          effect(async () => {
            const ids = await host.intersections()
            await host.delete(ids, [])

            return Msg.Failure({
              message: `${ids.length} intersecting tables deleted`,
            })
          }),
        ],
      }),
      OpenMenu: ({ menu }) =>
        menu.kind === 'cardinality'
          ? paint({ ...model, selectedEdges: [menu.id], menu })
          : { model: { ...model, menu } },
      CloseMenu: () => ({ model: { ...model, menu: { kind: 'closed' } } }),
      Add: ({ kind, id, point: position }) => {
        const base = {
          id,
          position,
          name: `New ${kind}`,
          color: '#428a94',
          width: kind === 'area' ? 600 : 250,
          height: kind === 'area' ? 400 : 160,
        }

        let item: Item

        if (kind === 'table') {
          item = {
            ...base,
            kind,
            schema: 'public',
            collapsed: false,
            fields: [
              {
                id: 'id',
                name: 'id',
                type: 'integer',
                primary: true,
                nullable: false,
                unique: false,
              },
            ],
          }
        } else if (kind === 'note') {
          item = { ...base, kind, color: '#edcd70', text: 'Write a note…' }
        } else {
          item = { ...base, kind }
        }

        return commit(
          { ...model, selected: [id], menu: { kind: 'closed' } },
          {
            ...model.history.present,
            items: [...model.history.present.items, item],
          }
        )
      },
      Edit: ({ id }) => ({
        model: {
          ...model,
          editor:
            model.history.present.items.find(
              (candidate) => candidate.id === id
            ) ?? null,
          menu: { kind: 'closed' },
        },
      }),
      Draft: ({ value, field, property }) => {
        const item = model.editor

        if (item === null) {
          return { model }
        }

        let editor = item

        if (field === '') {
          editor = { ...item, [property]: value }
        } else if (item.kind === 'table') {
          editor = {
            ...item,
            fields: item.fields.map((entry) =>
              entry.id === field ? { ...entry, [property]: value } : entry
            ),
          }
        }

        return { model: { ...model, editor } }
      },
      Save: () => {
        const item = model.editor

        if (item === null) {
          return { model }
        }

        const original = model.history.present.items.find(
          (candidate) => candidate.id === item.id
        )

        const saved =
          item.kind === 'table'
            ? {
                ...item,
                fields: item.fields.map((field) => {
                  const previous =
                    original?.kind === 'table'
                      ? original.fields.find(
                          (candidate) => candidate.id === field.id
                        )
                      : undefined

                  return {
                    ...field,
                    name: field.name.trim() || previous?.name || field.id,
                    type: field.type.trim() || previous?.type || 'text',
                  }
                }),
              }
            : item

        return replace(
          { ...model, editor: null },
          S.decodeUnknownSync(ItemSchema)(saved)
        )
      },
      Cancel: () => ({ model: { ...model, editor: null } }),
      Note: ({ id, text }) => {
        const item = model.history.present.items.find(
          (candidate) => candidate.id === id
        )

        return item?.kind === 'note'
          ? replace(model, { ...item, text })
          : { model }
      },
      Collapse: ({ id }) => {
        const item = model.history.present.items.find(
          (candidate) => candidate.id === id
        )

        return item?.kind === 'table'
          ? replace(model, {
              ...item,
              collapsed: !item.collapsed,
              height: tableHeight({ ...item, collapsed: !item.collapsed }),
            })
          : { model }
      },
      Cardinality: ({ id, source, target }) =>
        commit(
          { ...model, menu: { kind: 'closed' } },
          {
            ...model.history.present,
            relationships: model.history.present.relationships.map(
              (relation) =>
                relation.id === id
                  ? {
                      ...relation,
                      sourceCardinality: source,
                      targetCardinality: target,
                    }
                  : relation
            ),
          }
        ),
      Connect: ({ source, target, id, replacing }) =>
        connect(model, source, target, id, replacing),
      Reconnect: ({ value }) => ({ model: { ...model, reconnect: value } }),
      Float: ({ source, position }) =>
        paint({
          ...model,
          floating: { source, position },
          menu: { kind: 'closed' },
          announcement: 'Click a destination field. Escape cancels.',
        }),
      Pointer: ({ position }) =>
        model.floating === null
          ? { model }
          : paint({ ...model, floating: { ...model.floating, position } }),
      FinishFloat: ({ target, id }) =>
        model.floating === null
          ? { model }
          : connect(model, model.floating.source, target, id, null),
      Escape: () =>
        paint({ ...model, floating: null, menu: { kind: 'closed' } }),
      Import: ({ studio }) => {
        const result = commit(model, studio)

        return {
          ...result,
          model: { ...result.model, busy: model.busy + 1 },
          commands: [
            ...(result.commands ?? []),
            effect(async () => {
              await host.fit()

              return Msg.Ready()
            }),
          ],
        }
      },
      Export: ({ kind }) => ({
        model,
        commands: [
          effect(async () => {
            await host.export(kind, model)

            return Msg.Failure({
              message: kind === 'png' ? 'PNG exported' : 'JSON exported',
            })
          }),
        ],
      }),
      ImportFile: () => ({
        model,
        commands: [
          effect(() => {
            host.import()

            return Msg.Done()
          }),
        ],
      }),
    })
}

export const view = (
  model: Model,
  h: Html.HtmlBuilder<StudioMessage>
): Html.Html => {
  const button = (
    label: string,
    message: StudioMessage,
    attributes: readonly Html.Attribute<StudioMessage>[] = []
  ) => h.button([h.Type('button'), h.OnClick(message), ...attributes], [label])

  const studio = model.history.present

  const checkbox = (
    label: string,
    checked: boolean,
    key: Extract<StudioMessage, { _tag: 'Toggle' }>['key']
  ) =>
    h.label(
      [],
      [
        h.input([
          h.Type('checkbox'),
          h.Checked(checked),
          h.OnClick(Msg.Toggle({ key })),
        ]),
        label,
      ]
    )

  const { editor } = model
  const { menu } = model

  const menuButton = (label: string, message: StudioMessage) =>
    button(label, message, [h.Role('menuitem')])

  const menuItems = (() => {
    if (menu.kind === 'closed') {
      return []
    }

    if (menu.kind === 'pane') {
      return (['table', 'note', 'area'] as const).map((kind) =>
        menuButton(
          `Add ${kind}`,
          Msg.Add({
            kind,
            id: `${kind}-${crypto.randomUUID()}`,
            point: menu.point,
          })
        )
      )
    }

    if (menu.kind === 'cardinality') {
      return (['one', 'many'] as const).flatMap((source) =>
        (['one', 'many'] as const).map((target) =>
          menuButton(
            `${source} to ${target}`,
            Msg.Cardinality({ id: menu.id, source, target })
          )
        )
      )
    }

    const item = studio.items.find((candidate) => candidate.id === menu.id)

    return [
      menuButton('Edit item', Msg.Edit({ id: menu.id })),
      menuButton(
        'Duplicate item',
        Msg.Duplicate({ ids: [menu.id], suffix: crypto.randomUUID() })
      ),
      menuButton('Delete item', Msg.DeleteItem({ id: menu.id })),
      ...(item?.kind === 'table'
        ? item.fields.map((field) =>
            menuButton(
              `Relate ${field.name}`,
              Msg.Float({
                source: { table: item.id, field: field.id },
                position: menu.point,
              })
            )
          )
        : []),
    ]
  })()

  return h.div(
    [h.Class(model.dark ? 'studio-dark' : '')],
    [
      h.header(
        [h.Class('studio-top')],
        [
          h.div(
            [],
            [
              h.strong([], ['Schema Studio']),
              h.span([], ['Bookshop / local diagram']),
            ]
          ),
          h.nav(
            [h.AriaLabel('Document actions')],
            [
              button('Undo', Msg.Undo()),
              button('Redo', Msg.Redo()),
              button('Export PNG', Msg.Export({ kind: 'png' })),
              button('Export JSON', Msg.Export({ kind: 'json' })),
              button('Import JSON', Msg.ImportFile()),
            ]
          ),
        ]
      ),
      h.main(
        [h.Class('studio-workspace')],
        [
          h.aside(
            [],
            [
              h.h2([], ['Tables']),
              h.input([
                h.Type('search'),
                h.AriaLabel('Filter tables'),
                h.Placeholder('Filter schema or table…'),
                h.Value(model.filter),
                h.OnInput((value) => Msg.Filter({ value })),
              ]),
              h.div(
                [h.Class('studio-list')],
                studio.items
                  .filter(
                    (item) =>
                      item.kind === 'table' &&
                      `${item.schema}.${item.name}`
                        .toLowerCase()
                        .includes(model.filter.toLowerCase())
                  )
                  .map((item) =>
                    h.keyed('div')(
                      item.id,
                      [h.Class('studio-list-row')],
                      [
                        button(item.name, Msg.Focus({ id: item.id }), [
                          h.DataAttribute('table', item.id),
                          h.AriaPressed(
                            String(model.selected.includes(item.id))
                          ),
                        ]),
                        button('◉', Msg.Visibility({ id: item.id }), [
                          h.AriaLabel(`Canvas visibility for ${item.name}`),
                          h.AriaPressed(
                            String(!model.hiddenTables.includes(item.id))
                          ),
                        ]),
                      ]
                    )
                  )
              ),
              h.section(
                [h.Class('studio-settings')],
                [
                  h.h2([], ['Canvas']),
                  checkbox('Dark mode', model.dark, 'dark'),
                  checkbox('Minimap', model.minimap, 'minimap'),
                  checkbox('Zoom on scroll', !model.panScroll, 'panScroll'),
                  checkbox(
                    'Render only visible',
                    model.visibleOnly,
                    'visibleOnly'
                  ),
                  checkbox(
                    'View dependencies',
                    model.dependencies,
                    'dependencies'
                  ),
                  button('Show overlaps', Msg.Toggle({ key: 'overlaps' })),
                  button('Delete intersecting', Msg.Intersections()),
                ]
              ),
            ]
          ),
        ]
      ),
      h.div(
        [h.Class('studio-controls')],
        [
          button('Snap 20', Msg.Toggle({ key: 'snap' }), [
            h.AriaPressed(String(model.snap)),
          ]),
          button('Show all', Msg.ShowAll()),
          button('Zoom in', Msg.Zoom({ direction: 'in' })),
          button('Zoom out', Msg.Zoom({ direction: 'out' })),
          button('Auto-arrange', Msg.Layout()),
          button('Lost in canvas · Show all', Msg.ShowAll(), [
            h.Class('studio-lost'),
            h.Hidden(!model.lost),
          ]),
        ]
      ),
      h.footer(
        [],
        [
          h.output(
            [
              h.DataAttribute('testid', 'studio-status'),
              h.DataAttribute('model', JSON.stringify(studio)),
              h.DataAttribute('viewport', JSON.stringify(model.viewport)),
              h.DataAttribute('selected', JSON.stringify(model.selected)),
              h.DataAttribute('edges', JSON.stringify(model.flow.edges)),
              h.DataAttribute('snap', String(model.snap || model.shift)),
              h.DataAttribute('undo', String(model.history.past.length)),
              h.DataAttribute('redo', String(model.history.future.length)),
              h.DataAttribute('busy', String(model.busy > 0)),
              h.DataAttribute('reconnect', model.reconnect),
            ],
            [
              `${studio.items.filter((item) => item.kind === 'table').length} tables · ${studio.relationships.length} relationships · ${Math.round(model.viewport.zoom * 100)}%`,
            ]
          ),
          h.span(
            [
              h.Class('studio-announcement'),
              h.Role('status'),
              h.AriaLive('polite'),
            ],
            [model.announcement]
          ),
        ]
      ),
      editor === null
        ? null
        : h.dialog(
            [
              h.Attribute('open', ''),
              h.AriaLabel('Edit item'),
              h.Class('studio-editor'),
            ],
            [
              h.h2([], [`Edit ${editor.kind}`]),
              h.input([
                h.AriaLabel('Name'),
                h.Value(editor.name),
                h.OnInput((value) =>
                  Msg.Draft({ value, field: '', property: 'name' })
                ),
              ]),
              h.input([
                h.Type('color'),
                h.AriaLabel('Color'),
                h.Value(editor.color),
                h.OnInput((value) =>
                  Msg.Draft({ value, field: '', property: 'color' })
                ),
              ]),
              ...(editor.kind === 'table'
                ? editor.fields.map((field) =>
                    h.div(
                      [h.Class('studio-edit-field')],
                      [
                        h.input([
                          h.AriaLabel(`Field ${field.id}`),
                          h.Value(field.name),
                          h.OnInput((value) =>
                            Msg.Draft({
                              value,
                              field: field.id,
                              property: 'name',
                            })
                          ),
                        ]),
                        h.input([
                          h.AriaLabel(`Type ${field.id}`),
                          h.Value(field.type),
                          h.OnInput((value) =>
                            Msg.Draft({
                              value,
                              field: field.id,
                              property: 'type',
                            })
                          ),
                        ]),
                      ]
                    )
                  )
                : []),
              button('Save changes', Msg.Save()),
              button('Cancel', Msg.Cancel()),
            ]
          ),
      h.div(
        [
          h.Class('studio-menu'),
          h.Role('menu'),
          h.Hidden(menu.kind === 'closed'),
          h.Style({
            left: `${menu.kind === 'closed' ? 0 : Math.min(menu.screen.x, window.innerWidth - 190)}px`,
            top: `${menu.kind === 'closed' ? 0 : Math.min(menu.screen.y, window.innerHeight - 260)}px`,
          }),
        ],
        menuItems
      ),
    ]
  )
}
