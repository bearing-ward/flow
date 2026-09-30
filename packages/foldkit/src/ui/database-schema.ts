import type { Html as FoldHtml } from 'foldkit'

export type FoldkitDatabaseSchemaField = Readonly<{
  id: string
  name: string
  type: string
  kind: 'source' | 'target'
  side: 'top' | 'right' | 'bottom' | 'left'
}>

export type FoldkitDatabaseSchemaTable = Readonly<{
  name: string
  fields: readonly FoldkitDatabaseSchemaField[]
}>

/** Render caller-owned schema values; Runtime owns actual connection handles. */
export const createFoldkitDatabaseSchema = <Message>(
  table: FoldkitDatabaseSchemaTable,
  h: FoldHtml.HtmlBuilder<Message>
): FoldHtml.Html =>
  h.section(
    [
      h.Class('flow-foldkit-database-schema'),
      h.Role('group'),
      h.AriaLabel(`${table.name} schema`),
    ],
    [
      h.h2([], [table.name]),
      h.div(
        [h.Class('flow-foldkit-database-schema-table'), h.Role('table')],
        table.fields.map((field) =>
          h.div(
            [
              h.DataAttribute('schema-field-id', field.id),
              h.DataAttribute('handle-kind', field.kind),
              h.DataAttribute('handle-side', field.side),
              h.Role('row'),
            ],
            [
              h.span([h.Role('rowheader')], [field.name]),
              h.span([h.Role('cell')], [field.type]),
            ]
          )
        )
      ),
    ]
  )
