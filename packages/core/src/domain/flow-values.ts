import { Schema as S } from "effect";

export const NodeIdSchema = S.NonEmptyString.pipe(S.brand("NodeId"));

export type NodeId = typeof NodeIdSchema.Type;

export const EdgeIdSchema = S.NonEmptyString.pipe(S.brand("EdgeId"));

export type EdgeId = typeof EdgeIdSchema.Type;

export const HandleIdSchema = S.NonEmptyString.pipe(S.brand("HandleId"));

export type HandleId = typeof HandleIdSchema.Type;

export const XYPositionSchema = S.Struct({
  x: S.Number,
  y: S.Number,
});

export type XYPosition = typeof XYPositionSchema.Type;
