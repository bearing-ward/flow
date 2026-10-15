import { Schema as S } from 'effect'

const point = S.Struct({ x: S.Finite, y: S.Finite })

const bounds = {
  id: S.NonEmptyString,
  name: S.String,
  position: point,
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
  color: S.String,
}

export const FieldSchema = S.Struct({
  id: S.NonEmptyString,
  name: S.NonEmptyString,
  type: S.NonEmptyString,
  primary: S.Boolean,
  nullable: S.Boolean,
  unique: S.Boolean,
})

export const TableSchema = S.Struct({
  ...bounds,
  kind: S.Literal('table'),
  schema: S.NonEmptyString,
  collapsed: S.Boolean,
  fields: S.Array(FieldSchema),
})

const AreaSchema = S.Struct({ ...bounds, kind: S.Literal('area') })

const NoteSchema = S.Struct({
  ...bounds,
  kind: S.Literal('note'),
  text: S.String,
})

const ViewSchema = S.Struct({
  ...bounds,
  kind: S.Literal('view'),
  dependencies: S.Array(S.NonEmptyString),
})

export const ItemSchema = S.Union([
  TableSchema,
  AreaSchema,
  NoteSchema,
  ViewSchema,
])

const endpoint = S.Struct({ table: S.NonEmptyString, field: S.NonEmptyString })

export const CardinalitySchema = S.Literals(['one', 'many'])

export const RelationshipSchema = S.Struct({
  id: S.NonEmptyString,
  source: endpoint,
  target: endpoint,
  sourceCardinality: CardinalitySchema,
  targetCardinality: CardinalitySchema,
})

export const StudioSchema = S.Struct({
  version: S.Literal(1),
  items: S.Array(ItemSchema),
  relationships: S.Array(RelationshipSchema),
})

export type Studio = typeof StudioSchema.Type

export type Item = typeof ItemSchema.Type

export type Table = typeof TableSchema.Type

export type Field = typeof FieldSchema.Type

export type Relationship = typeof RelationshipSchema.Type

export type Point = typeof point.Type

export interface Rect {
  readonly position: Point
  readonly width: number
  readonly height: number
}

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.position.x < b.position.x + b.width &&
  a.position.x + a.width > b.position.x &&
  a.position.y < b.position.y + b.height &&
  a.position.y + a.height > b.position.y

export const areaFor = (
  item: Item,
  items: readonly Item[]
): Item | undefined =>
  item.kind === 'table'
    ? items.find(
        (area) =>
          area.kind === 'area' &&
          item.position.x >= area.position.x &&
          item.position.y >= area.position.y &&
          item.position.x + item.width <= area.position.x + area.width &&
          item.position.y + item.height <= area.position.y + area.height
      )
    : undefined

export const relationshipSides = (
  source: Rect,
  target: Rect
): {
  readonly source: 'left' | 'right'
  readonly target: 'left' | 'right'
} => {
  const pairs = [
    { source: 'left', target: 'left' },
    { source: 'left', target: 'right' },
    { source: 'right', target: 'left' },
    { source: 'right', target: 'right' },
  ] satisfies ReturnType<typeof relationshipSides>[]

  const distance = (pair: ReturnType<typeof relationshipSides>): number => {
    const x =
      source.position.x +
      (pair.source === 'right' ? source.width : 0) -
      target.position.x -
      (pair.target === 'right' ? target.width : 0)

    const y =
      source.position.y +
      source.height / 2 -
      target.position.y -
      target.height / 2

    return x * x + y * y
  }

  let nearest: ReturnType<typeof relationshipSides> = {
    source: 'left',
    target: 'left',
  }

  for (const pair of pairs) {
    if (distance(pair) < distance(nearest)) {
      nearest = pair
    }
  }

  return nearest
}

export const canConnect = (
  studio: Studio,
  source: Relationship['source'],
  target: Relationship['target'],
  except?: string
): boolean => {
  const exists = (end: Relationship['source']): boolean =>
    studio.items.some(
      (item) =>
        item.kind === 'table' &&
        item.id === end.table &&
        item.fields.some((field) => field.id === end.field)
    )

  const same = (
    a: Relationship['source'],
    b: Relationship['source']
  ): boolean => a.table === b.table && a.field === b.field

  return (
    exists(source) &&
    exists(target) &&
    !same(source, target) &&
    !studio.relationships.some(
      (relation) =>
        relation.id !== except &&
        ((same(relation.source, source) && same(relation.target, target)) ||
          (same(relation.source, target) && same(relation.target, source)))
    )
  )
}

export const exportStudio = (studio: Studio): string =>
  JSON.stringify(studio, null, 2)

export const importStudio = (json: string): Studio => {
  const studio = S.decodeUnknownSync(S.fromJsonString(StudioSchema))(json)
  const ids = studio.items.map((item) => item.id)

  if (
    new Set(ids).size !== ids.length ||
    new Set(studio.relationships.map((relation) => relation.id)).size !==
      studio.relationships.length
  ) {
    throw new Error('Duplicate diagram identifiers')
  }

  for (const item of studio.items) {
    if (
      item.kind === 'table' &&
      new Set(item.fields.map((field) => field.id)).size !== item.fields.length
    ) {
      throw new Error('Duplicate field identifiers')
    }

    if (
      item.kind === 'view' &&
      item.dependencies.some(
        (id) =>
          !studio.items.some(
            (candidate) => candidate.kind === 'table' && candidate.id === id
          )
      )
    ) {
      throw new Error('Unknown view dependency')
    }
  }

  for (const relation of studio.relationships) {
    if (!canConnect(studio, relation.source, relation.target, relation.id)) {
      throw new Error('Invalid relationship')
    }
  }

  return studio
}

export interface History {
  readonly past: readonly Studio[]
  readonly present: Studio
  readonly future: readonly Studio[]
}

export const history = (present: Studio): History => ({
  past: [],
  present,
  future: [],
})

export const record = (state: History, next: Studio): History =>
  JSON.stringify(state.present) === JSON.stringify(next)
    ? state
    : {
        past: [...state.past, state.present].slice(-100),
        present: next,
        future: [],
      }

export const undo = (state: History): History => {
  const previous = state.past.at(-1)

  return previous === undefined
    ? state
    : {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      }
}

export const redo = (state: History): History => {
  const [next] = state.future

  return next === undefined
    ? state
    : {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      }
}

const snapPosition = (value: number, snap: boolean): number =>
  snap ? Math.round(value / 20) * 20 : value

export const moveItems = (
  studio: Studio,
  ids: ReadonlySet<string>,
  delta: Point,
  snap: boolean
): Studio => ({
  ...studio,
  items: studio.items.map((item) => {
    const area = areaFor(item, studio.items)

    if (!ids.has(item.id) && (area === undefined || !ids.has(area.id))) {
      return item
    }

    return {
      ...item,
      position: {
        x: snapPosition(item.position.x + delta.x, snap),
        y: snapPosition(item.position.y + delta.y, snap),
      },
    }
  }),
})
