import { Schema as S } from 'effect'

const tagged = S.TaggedError

export class InvalidEdgeRoute extends tagged<InvalidEdgeRoute>()(
  'InvalidEdgeRoute',
  {
    edgeId: S.String,
    reason: S.Literals([
      'missing-edge',
      'unresolved-edge',
      'invalid-index',
      'degenerate-route',
    ]),
  }
) {}
