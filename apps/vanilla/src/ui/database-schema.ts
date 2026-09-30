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

/** Render caller-owned schema data; canvas handle controls remain canvas-owned. */
export const createFlowDatabaseSchema = (
  owner: Document,
  table: DatabaseSchemaTable
): HTMLElement => {
  const section = owner.createElement('section')
  section.className = 'flow-database-schema'
  section.setAttribute('aria-label', `${table.name} schema`)
  const heading = owner.createElement('h2')
  heading.textContent = table.name
  const rows = owner.createElement('table')
  const body = owner.createElement('tbody')

  for (const field of table.fields) {
    const row = owner.createElement('tr')
    row.dataset.schemaFieldId = field.id
    row.dataset.handleKind = field.kind
    row.dataset.handleSide = field.side
    const name = owner.createElement('th')
    name.scope = 'row'
    name.textContent = field.name
    const type = owner.createElement('td')
    type.textContent = field.type
    row.append(name, type)
    body.append(row)
  }

  rows.append(body)
  section.append(heading, rows)

  return section
}
