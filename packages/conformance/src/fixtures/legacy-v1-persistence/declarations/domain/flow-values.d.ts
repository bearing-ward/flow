import { Schema as S } from 'effect'
export declare const NodeIdSchema: S.brand<S.NonEmptyString, 'NodeId'>
export type NodeId = typeof NodeIdSchema.Type
export declare const EdgeIdSchema: S.brand<S.NonEmptyString, 'EdgeId'>
export type EdgeId = typeof EdgeIdSchema.Type
export declare const HandleIdSchema: S.brand<S.NonEmptyString, 'HandleId'>
export type HandleId = typeof HandleIdSchema.Type
export declare const XYPositionSchema: S.Struct<{
  readonly x: S.Number
  readonly y: S.Number
}>
export type XYPosition = typeof XYPositionSchema.Type
