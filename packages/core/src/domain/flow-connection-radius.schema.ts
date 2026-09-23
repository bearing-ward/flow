import { Schema as S } from "effect";

import type { ActiveClickConnection } from "./flow-connection.schema.ts";
import {
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from "./flow-values.ts";
import type { XYPosition } from "./flow-values.ts";
import { FlowHandleSchema } from "./flow.schema.ts";

/** Maximum pointer distance in the coordinate space of the supplied centers. */
export const ConnectionRadiusSchema = S.Finite.check(
  S.isGreaterThanOrEqualTo(0)
);

export type ConnectionRadius = typeof ConnectionRadiusSchema.Type;

export const MeasuredConnectionHandleSchema = S.Struct({
  nodeId: NodeIdSchema,
  handleId: HandleIdSchema,
  kind: FlowHandleSchema.fields.kind,
  center: XYPositionSchema,
});

export type MeasuredConnectionHandle =
  typeof MeasuredConnectionHandleSchema.Type;

export const nearestConnectionTarget = ({
  source,
  point,
  candidates,
  radius,
}: {
  source: ActiveClickConnection;
  point: XYPosition;
  candidates: readonly MeasuredConnectionHandle[];
  radius: ConnectionRadius;
}): MeasuredConnectionHandle | undefined => {
  let nearest: MeasuredConnectionHandle | undefined;
  let nearestDistance = radius;

  for (const candidate of candidates) {
    if (
      candidate.kind !== "target" ||
      (candidate.nodeId === source.source &&
        candidate.handleId === source.sourceHandle)
    ) {
      continue;
    }

    const dx = candidate.center.x - point.x;
    const dy = candidate.center.y - point.y;
    const distance = Math.hypot(dx, dy);

    if (
      !Number.isFinite(distance) ||
      distance > nearestDistance ||
      (distance === nearestDistance &&
        nearest !== undefined &&
        (candidate.nodeId > nearest.nodeId ||
          (candidate.nodeId === nearest.nodeId &&
            candidate.handleId >= nearest.handleId)))
    ) {
      continue;
    }

    nearest = candidate;
    nearestDistance = distance;
  }

  return nearest;
};
