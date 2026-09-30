import { readFileSync } from 'node:fs'

import { Schema } from 'effect'

const apiUtilityDeletionEventSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal('before:start'),
    nodes: Schema.Array(Schema.String),
    edges: Schema.Array(Schema.String),
  }),
  Schema.Struct({ type: Schema.Literal('before:resolved') }),
  Schema.Struct({
    type: Schema.Literal('edges'),
    beforeCompleted: Schema.Boolean,
    ids: Schema.Array(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal('nodes'),
    beforeCompleted: Schema.Boolean,
    ids: Schema.Array(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal('delete'),
    beforeCompleted: Schema.Boolean,
    nodes: Schema.Array(Schema.String),
    edges: Schema.Array(Schema.String),
  }),
])

export type ApiUtilityDeletionEvent = Schema.Schema.Type<
  typeof apiUtilityDeletionEventSchema
>

const fixture = Schema.decodeUnknownSync(
  Schema.Struct({
    cases: Schema.Struct({
      deletion: Schema.Struct({
        events: Schema.Array(apiUtilityDeletionEventSchema),
        result: Schema.Struct({
          nodes: Schema.Array(Schema.String),
          edges: Schema.Array(Schema.String),
        }),
      }),
    }),
  })
)(
  JSON.parse(
    readFileSync('research/fixtures/api-utility-reference.json', 'utf-8')
  )
)

/** Pinned upstream async-delete observations, projected to stable IDs. */
export const apiUtilityDeletionReference = {
  requested: { nodes: ['b'], edges: [] },
  events: fixture.cases.deletion.events,
  result: fixture.cases.deletion.result,
} as const

export const apiUtilityDeletionCallbackReference =
  fixture.cases.deletion.events.flatMap<
    | { readonly type: 'edges' | 'nodes'; readonly ids: readonly string[] }
    | {
        readonly type: 'delete'
        readonly nodes: readonly string[]
        readonly edges: readonly string[]
      }
  >((event) => {
    if (event.type === 'edges' || event.type === 'nodes') {
      return [{ type: event.type, ids: event.ids }]
    }

    if (event.type === 'delete') {
      return [{ type: event.type, nodes: event.nodes, edges: event.edges }]
    }

    return []
  })

export const normalizeVueDeletionEvent = (
  event: ApiUtilityDeletionEvent
): ApiUtilityDeletionEvent => {
  if (event.type === 'before:start') {
    return {
      ...event,
      nodes: event.nodes.map((id) => (id === 'left-visible' ? 'b' : id)),
      edges: event.edges.map((id) => (id === 'left-edge' ? 'ab' : id)),
    }
  }

  if (event.type === 'edges' || event.type === 'nodes') {
    return {
      ...event,
      ids:
        event.type === 'nodes'
          ? event.ids.map((id) => (id === 'left-visible' ? 'b' : id))
          : event.ids.map((id) => (id === 'left-edge' ? 'ab' : id)),
    }
  }

  if (event.type === 'delete') {
    return {
      ...event,
      nodes: event.nodes.map((id) => (id === 'left-visible' ? 'b' : id)),
      edges: event.edges.map((id) => (id === 'left-edge' ? 'ab' : id)),
    }
  }

  return event
}
