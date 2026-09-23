import type { XYPosition } from "./flow-values.ts";
import type { FlowHandle } from "./flow.schema.ts";

type Side = FlowHandle["side"];

const direction = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
} satisfies Record<Side, XYPosition>;

const gap = 20;

const routeBends = (
  sourceGap: XYPosition,
  targetGap: XYPosition,
  sourceSide: Side,
  targetSide: Side,
  axis: "x" | "y"
): [XYPosition] | [XYPosition, XYPosition] => {
  const sourceDirection = direction[sourceSide];
  const targetDirection = direction[targetSide];
  const otherAxis = axis === "x" ? "y" : "x";
  const routeSign = sourceGap[axis] < targetGap[axis] ? 1 : -1;
  const sourceSign = sourceDirection[axis];
  const targetSign = targetDirection[axis];

  if (sourceSign * targetSign === -1) {
    const centerX = (sourceGap.x + targetGap.x) / 2;
    const centerY = (sourceGap.y + targetGap.y) / 2;

    const verticalSplit: [XYPosition, XYPosition] = [
      { x: centerX, y: sourceGap.y },
      { x: centerX, y: targetGap.y },
    ];

    const horizontalSplit: [XYPosition, XYPosition] = [
      { x: sourceGap.x, y: centerY },
      { x: targetGap.x, y: centerY },
    ];

    return (axis === "x") === (sourceSign === routeSign)
      ? verticalSplit
      : horizontalSplit;
  }

  const sourceTarget: [XYPosition] = [{ x: sourceGap.x, y: targetGap.y }];
  const targetSource: [XYPosition] = [{ x: targetGap.x, y: sourceGap.y }];

  const initial =
    (axis === "x") === (sourceSign === routeSign) ? targetSource : sourceTarget;

  if (sourceSide === targetSide) {
    return initial;
  }

  const sameDirection = sourceSign === targetDirection[otherAxis];
  const sourceGreater = sourceGap[otherAxis] > targetGap[otherAxis];
  const sourceLess = sourceGap[otherAxis] < targetGap[otherAxis];

  const flip =
    (sourceSign === 1 &&
      ((!sameDirection && sourceGreater) || (sameDirection && sourceLess))) ||
    (sourceSign === -1 &&
      ((!sameDirection && sourceLess) || (sameDirection && sourceGreater)));

  if (!flip) {
    return initial;
  }

  return axis === "x" ? sourceTarget : targetSource;
};

const routeGeometry = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: Side,
  targetSide: Side
) => {
  const sourceDirection = direction[sourceSide];
  const targetDirection = direction[targetSide];

  const sourceGap = {
    x: source.x + sourceDirection.x * gap,
    y: source.y + sourceDirection.y * gap,
  };

  const targetGap = {
    x: target.x + targetDirection.x * gap,
    y: target.y + targetDirection.y * gap,
  };

  const axis = sourceDirection.x === 0 ? "y" : "x";
  const bends = routeBends(sourceGap, targetGap, sourceSide, targetSide, axis);
  let sourceGapAdjustment = 0;
  let targetGapAdjustment = 0;

  if (sourceSide === targetSide) {
    const separation = Math.abs(source[axis] - target[axis]);

    if (separation <= gap) {
      const adjustment = Math.min(gap - 1, gap - separation);
      const routeSign = sourceGap[axis] < targetGap[axis] ? 1 : -1;

      if (sourceDirection[axis] === routeSign) {
        sourceGapAdjustment =
          (sourceGap[axis] > source[axis] ? -1 : 1) * adjustment;
      } else {
        targetGapAdjustment =
          (targetGap[axis] > target[axis] ? -1 : 1) * adjustment;
      }
    }
  }

  const adjustedSourceGap = {
    ...sourceGap,
    [axis]: sourceGap[axis] + sourceGapAdjustment,
  };

  const adjustedTargetGap = {
    ...targetGap,
    [axis]: targetGap[axis] + targetGapAdjustment,
  };

  const [firstBend] = bends;
  const lastBend = bends.at(-1) ?? firstBend;

  let label: XYPosition;

  if (bends.length === 2) {
    label = {
      x: (firstBend.x + lastBend.x) / 2,
      y: (firstBend.y + lastBend.y) / 2,
    };
  } else if (
    Math.max(
      Math.abs(adjustedSourceGap.x - firstBend.x),
      Math.abs(adjustedTargetGap.x - firstBend.x)
    ) >=
    Math.max(
      Math.abs(adjustedSourceGap.y - firstBend.y),
      Math.abs(adjustedTargetGap.y - firstBend.y)
    )
  ) {
    label = {
      x: (adjustedSourceGap.x + adjustedTargetGap.x) / 2,
      y: firstBend.y,
    };
  } else {
    label = {
      x: firstBend.x,
      y: (adjustedSourceGap.y + adjustedTargetGap.y) / 2,
    };
  }

  const points = [
    source,
    ...(adjustedSourceGap.x !== firstBend.x ||
    adjustedSourceGap.y !== firstBend.y
      ? [adjustedSourceGap]
      : []),
    ...bends,
    ...(adjustedTargetGap.x !== lastBend.x || adjustedTargetGap.y !== lastBend.y
      ? [adjustedTargetGap]
      : []),
    target,
  ];

  return { points, label };
};

const bend = (
  previous: XYPosition,
  current: XYPosition,
  next: XYPosition,
  radius: number
): string => {
  const size = Math.min(
    Math.hypot(current.x - previous.x, current.y - previous.y) / 2,
    Math.hypot(next.x - current.x, next.y - current.y) / 2,
    radius
  );

  const { x, y } = current;

  if (
    (previous.x === x && x === next.x) ||
    (previous.y === y && y === next.y)
  ) {
    return `L${x} ${y}`;
  }

  if (previous.y === y) {
    const xDirection = previous.x < next.x ? -1 : 1;
    const yDirection = previous.y < next.y ? 1 : -1;

    return `L ${x + size * xDirection},${y}Q ${x},${y} ${x},${y + size * yDirection}`;
  }

  const xDirection = previous.x < next.x ? 1 : -1;
  const yDirection = previous.y < next.y ? -1 : 1;

  return `L ${x},${y + size * yDirection}Q ${x},${y} ${x + size * xDirection},${y}`;
};

const routedEdgePath = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: Side,
  targetSide: Side,
  radius: number
): string => {
  const { points } = routeGeometry(source, target, sourceSide, targetSide);
  let path = `M${source.x} ${source.y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (previous !== undefined && current !== undefined && next !== undefined) {
      path += bend(previous, current, next, radius);
    }
  }

  return `${path}L${target.x} ${target.y}`;
};

export const stepEdgePath = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: Side,
  targetSide: Side
): string => routedEdgePath(source, target, sourceSide, targetSide, 0);

export const smoothStepEdgePath = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: Side,
  targetSide: Side
): string => routedEdgePath(source, target, sourceSide, targetSide, 5);

export const stepEdgeLabelPosition = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: Side,
  targetSide: Side
): XYPosition => routeGeometry(source, target, sourceSide, targetSide).label;
