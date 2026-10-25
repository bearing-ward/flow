import { Schema as S } from 'effect'

export const FlowTransactionOriginSchema = S.Struct({
  kind: S.Literals(['local', 'remote', 'system']),
  actorId: S.NonEmptyString,
})

export type FlowTransactionOrigin = typeof FlowTransactionOriginSchema.Type

export const FlowTransactionContextSchema = S.Struct({
  transactionId: S.NonEmptyString,
  origin: FlowTransactionOriginSchema,
  gestureId: S.optional(S.NonEmptyString),
})

export type FlowTransactionContext = typeof FlowTransactionContextSchema.Type
