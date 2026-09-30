import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

export type DatabaseSchemaField = Readonly<{
  id: string
  name: string
  type: string
  kind: 'source' | 'target'
  side: 'top' | 'right' | 'bottom' | 'left'
}>

export type DatabaseSchemaTable = Readonly<{
  name: string
  fields: readonly DatabaseSchemaField[]
}>

/** Render caller-owned schema data in a native table. */
export const DatabaseSchema = defineComponent({
  name: 'DatabaseSchema',
  props: {
    // SAFETY: The required table prop is supplied through this typed Vue component boundary.
    table: { type: Object as PropType<DatabaseSchemaTable>, required: true },
  },
  setup(props) {
    return () =>
      h(
        'section',
        {
          class: 'flow-vue-database-schema',
          'aria-label': `${props.table.name} schema`,
        },
        [
          h('h2', props.table.name),
          h('table', [
            h(
              'tbody',
              props.table.fields.map((field) =>
                h(
                  'tr',
                  {
                    key: field.id,
                    'data-schema-field-id': field.id,
                    'data-handle-kind': field.kind,
                    'data-handle-side': field.side,
                  },
                  [h('th', { scope: 'row' }, field.name), h('td', field.type)]
                )
              )
            ),
          ]),
        ]
      )
  },
})
