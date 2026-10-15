import type { Field, Item, Relationship, Studio } from './model.ts'

/** Parser for the fixed, original sample DBML subset, not a general DBML importer. */
export const seedFromDbml = (dbml: string): Studio => {
  const items: Item[] = []

  const catalog = new Set([
    'authors',
    'books',
    'book_authors',
    'publishers',
    'genres',
    'book_genres',
  ])

  let catalogIndex = 0
  let salesIndex = 0

  for (const match of dbml.matchAll(
    /Table (?<name>\w+)\s*\{(?<body>[^}]+)\}/gu
  )) {
    const name = match.groups?.name ?? ''

    const fields: Field[] = [
      ...(match.groups?.body ?? '').matchAll(
        /^\s*(?<name>\w+)\s+(?<type>[\w()]+)(?<flags>[^\n]*)/gmu
      ),
    ].map((field) => ({
      id: field.groups?.name ?? '',
      name: field.groups?.name ?? '',
      type: field.groups?.type ?? '',
      primary: (field.groups?.flags ?? '').includes('pk'),
      nullable:
        !(field.groups?.flags ?? '').includes('not null') &&
        !(field.groups?.flags ?? '').includes('pk'),
      unique: (field.groups?.flags ?? '').includes('unique'),
    }))

    const isCatalog = catalog.has(name)
    const index = isCatalog ? catalogIndex : salesIndex

    if (isCatalog) {
      catalogIndex += 1
    } else {
      salesIndex += 1
    }

    items.push({
      kind: 'table',
      id: name,
      name,
      schema: 'public',
      position: {
        x: (isCatalog ? 80 : 1120) + (index % 3) * 320,
        y: index >= 4 && !isCatalog ? 840 : 120 + Math.floor(index / 3) * 340,
      },
      width: 250,
      height: 44 + fields.length * 28 + 30,
      color: isCatalog ? '#327b88' : '#98602d',
      collapsed: false,
      fields,
    })
  }

  const relationships: Relationship[] = [
    ...dbml.matchAll(
      /Ref: (?<source>\w+)\.(?<sourceField>\w+) (?<cardinality>[>-]) (?<target>\w+)\.(?<targetField>\w+)/gu
    ),
  ].map((match, index) => ({
    id: `relation-${index}`,
    source: {
      table: match.groups?.source ?? '',
      field: match.groups?.sourceField ?? '',
    },
    target: {
      table: match.groups?.target ?? '',
      field: match.groups?.targetField ?? '',
    },
    sourceCardinality: match.groups?.cardinality === '-' ? 'one' : 'many',
    targetCardinality: 'one',
  }))

  return {
    version: 1,
    relationships,
    items: [
      {
        kind: 'area',
        id: 'catalog-area',
        name: 'Catalog',
        position: { x: 40, y: 40 },
        width: 980,
        height: 720,
        color: '#327b88',
      },
      {
        kind: 'area',
        id: 'sales-area',
        name: 'Sales',
        position: { x: 1080, y: 40 },
        width: 980,
        height: 720,
        color: '#98602d',
      },
      ...items,
      {
        kind: 'view',
        id: 'bestsellers',
        name: 'bestsellers',
        position: { x: 760, y: 850 },
        width: 250,
        height: 100,
        color: '#7657a8',
        dependencies: ['books', 'order_items'],
      },
      {
        kind: 'note',
        id: 'prices-note',
        name: 'Pricing',
        position: { x: 1160, y: 840 },
        width: 260,
        height: 150,
        color: '#edcd70',
        text: 'Prices are stored in cents.',
      },
      {
        kind: 'note',
        id: 'reviews-note',
        name: 'Moderation',
        position: { x: 1540, y: 1160 },
        width: 280,
        height: 150,
        color: '#e5bacd',
        text: 'Reviews are moderated before display.',
      },
    ],
  }
}
