import { describe, expect, it } from 'vitest'

import {
  areaFor,
  canConnect,
  exportStudio,
  history,
  importStudio,
  moveItems,
  overlaps,
  record,
  redo,
  relationshipSides,
  undo,
} from './model.ts'
import sample from './sample-schema.dbml?raw'
import { seedFromDbml } from './seed.ts'

const seed = seedFromDbml(sample)

describe('Schema Studio domain', () => {
  it('loads every fixed DBML table, field, relationship and canvas element', () => {
    expect(
      seed.items
        .filter((item) => item.kind === 'table')
        .map((item) => item.name)
    ).toStrictEqual([
      'authors',
      'books',
      'book_authors',
      'publishers',
      'genres',
      'book_genres',
      'customers',
      'addresses',
      'orders',
      'order_items',
      'reviews',
      'inventory',
    ])
    expect(seed.relationships).toHaveLength(14)
    expect(
      seed.items
        .filter((item) => item.kind === 'table')
        .reduce((count, item) => count + item.fields.length, 0)
    ).toBe(51)
  })

  it('adds the canvas annotations and round trips through JSON', () => {
    expect(seed.items.filter((item) => item.kind === 'area')).toHaveLength(2)
    expect(
      seed.items.filter((item) => item.kind === 'note').map((item) => item.text)
    ).toStrictEqual([
      'Prices are stored in cents.',
      'Reviews are moderated before display.',
    ])
    expect(seed.items.find((item) => item.kind === 'view')).toMatchObject({
      name: 'bestsellers',
      dependencies: ['books', 'order_items'],
    })
    expect(importStudio(exportStudio(seed))).toStrictEqual(seed)
  })

  it('matches the area membership specified in the DBML canvas annotations', () => {
    const members = (areaId: string): string[] =>
      seed.items
        .filter((item) => areaFor(item, seed.items)?.id === areaId)
        .map((item) => item.id)

    expect(members('catalog-area')).toStrictEqual([
      'authors',
      'books',
      'book_authors',
      'publishers',
      'genres',
      'book_genres',
    ])
    expect(members('sales-area')).toStrictEqual([
      'customers',
      'addresses',
      'orders',
      'order_items',
    ])
    expect(
      new Set(
        seed.items
          .filter((item) => item.kind === 'table')
          .map((item) => item.schema)
      )
    ).toStrictEqual(new Set(['public']))
  })

  it('preserves primary, required, unique, nullable and one-to-one definitions', () => {
    const books = seed.items.find((item) => item.id === 'books')
    expect(books?.kind === 'table' ? books.fields : []).toContainEqual({
      id: 'isbn',
      name: 'isbn',
      type: 'varchar',
      primary: false,
      nullable: true,
      unique: true,
    })
    expect(seed.relationships.at(-1)).toMatchObject({
      source: { table: 'inventory', field: 'book_id' },
      target: { table: 'books', field: 'id' },
      sourceCardinality: 'one',
      targetCardinality: 'one',
    })
  })

  it('distinguishes touching, overlapping, and disjoint bounds', () => {
    const a = { position: { x: 0, y: 0 }, width: 100, height: 100 }
    expect(overlaps(a, { ...a, position: { x: 100, y: 0 } })).toBeFalsy()
    expect(overlaps(a, { ...a, position: { x: 99, y: 99 } })).toBeTruthy()
    expect(overlaps(a, { ...a, position: { x: -101, y: 0 } })).toBeFalsy()
  })

  it('uses full containment for membership and moves each member once', () => {
    const authors = seed.items.find((item) => item.id === 'authors')
    expect(authors && areaFor(authors, seed.items)?.id).toBe('catalog-area')

    const moved = moveItems(
      seed,
      new Set(['catalog-area', 'authors']),
      { x: 5, y: 20 },
      false
    )

    expect(
      moved.items.find((item) => item.id === 'authors')?.position
    ).toStrictEqual({ x: 85, y: 140 })
    expect(
      moved.items.find((item) => item.id === 'customers')?.position
    ).toStrictEqual({ x: 1120, y: 120 })
    expect(
      authors && areaFor({ ...authors, position: { x: 0, y: 0 } }, seed.items)
    ).toBeUndefined()
  })

  it('chooses sides from centres including unequal widths and equality', () => {
    const a = { position: { x: 100, y: 0 }, width: 100, height: 20 }
    expect(
      relationshipSides(a, { ...a, position: { x: 0, y: 0 } })
    ).toStrictEqual({ source: 'left', target: 'right' })
    expect(
      relationshipSides(a, { ...a, width: 500, position: { x: 0, y: 0 } })
    ).toStrictEqual({ source: 'right', target: 'left' })
    expect(relationshipSides(a, a)).toStrictEqual({
      source: 'right',
      target: 'left',
    })
  })

  it('validates both endpoints and rejects reverse duplicates and self fields', () => {
    expect(
      canConnect(
        seed,
        { table: 'books', field: 'id' },
        { table: 'authors', field: 'id' }
      )
    ).toBeTruthy()
    expect(
      canConnect(
        seed,
        { table: 'books', field: 'id' },
        { table: 'books', field: 'id' }
      )
    ).toBeFalsy()
    expect(
      canConnect(
        seed,
        { table: 'publishers', field: 'id' },
        { table: 'books', field: 'publisher_id' }
      )
    ).toBeFalsy()
    expect(
      canConnect(
        seed,
        { table: 'unknown', field: 'id' },
        { table: 'books', field: 'id' }
      )
    ).toBeFalsy()
  })

  it('undoes, redoes, ignores noops and clears abandoned future commands', () => {
    const initial = history(seed)

    const changed = record(
      initial,
      moveItems(seed, new Set(['authors']), { x: 5, y: 0 }, false)
    )

    expect(undo(changed).present).toStrictEqual(seed)
    expect(redo(undo(changed))).toStrictEqual(changed)
    expect(record(changed, changed.present)).toBe(changed)
    expect(
      record(undo(changed), { ...seed, relationships: [] }).future
    ).toStrictEqual([])
  })

  it('snaps the resulting position on a 20px grid', () => {
    expect(
      moveItems(seed, new Set(['authors']), { x: 13, y: 7 }, true).items.find(
        (item) => item.id === 'authors'
      )?.position
    ).toStrictEqual({ x: 100, y: 120 })
  })

  it('rejects invalid JSON, malformed models, duplicate ids and broken links', () => {
    expect(() => importStudio('{')).toThrow(/./u)
    expect(() => importStudio('{"version":2}')).toThrow(/./u)
    expect(() =>
      importStudio(
        JSON.stringify({ ...seed, items: [...seed.items, seed.items[0]] })
      )
    ).toThrow('Duplicate diagram identifiers')
    expect(() =>
      importStudio(
        JSON.stringify({
          ...seed,
          items: seed.items.filter((item) => item.id !== 'books'),
        })
      )
    ).toThrow(/./u)
    expect(() =>
      importStudio(
        JSON.stringify({
          ...seed,
          relationships: [
            ...seed.relationships,
            { ...seed.relationships[0], id: 'duplicate' },
          ],
        })
      )
    ).toThrow('Invalid relationship')
  })
})
