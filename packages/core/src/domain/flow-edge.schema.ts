import { Schema as S } from "effect";

import { stepEdgeLabelPosition } from "./flow-step-edge.schema.ts";
import {
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from "./flow-values.ts";
import type { HandleId, XYPosition } from "./flow-values.ts";
import type {
  FlowDocument,
  FlowEdge,
  FlowEdgePath,
  FlowHandle,
  FlowNode,
} from "./flow.schema.ts";

export const MeasuredHandleSchema = S.Struct({
  nodeId: NodeIdSchema,
  handleId: HandleIdSchema,
  offset: XYPositionSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
});

export type MeasuredHandle = typeof MeasuredHandleSchema.Type;

const selectHandle = (
  node: FlowNode,
  kind: FlowHandle["kind"],
  id: HandleId | undefined
): FlowHandle | undefined =>
  node.handles?.find(
    (handle) => handle.kind === kind && (id === undefined || handle.id === id)
  );

export const resolveEdgeHandles = (document: FlowDocument, edge: FlowEdge) => {
  const sourceNode = document.nodes.find((node) => node.id === edge.source);
  const targetNode = document.nodes.find((node) => node.id === edge.target);

  if (sourceNode === undefined || targetNode === undefined) {
    return;
  }

  const sourceHandle = selectHandle(sourceNode, "source", edge.sourceHandle);
  const targetHandle = selectHandle(targetNode, "target", edge.targetHandle);

  if (sourceHandle === undefined || targetHandle === undefined) {
    return;
  }

  return { sourceNode, sourceHandle, targetNode, targetHandle };
};

export const edgeAttachmentPosition = (
  nodePosition: XYPosition,
  handle: FlowHandle,
  measured: MeasuredHandle
): XYPosition => {
  const center = {
    x: nodePosition.x + measured.offset.x,
    y: nodePosition.y + measured.offset.y,
  };

  const displacement = {
    top: { x: 0, y: -measured.height / 2 },
    right: { x: measured.width / 2, y: 0 },
    bottom: { x: 0, y: measured.height / 2 },
    left: { x: -measured.width / 2, y: 0 },
  } satisfies Record<FlowHandle["side"], XYPosition>;

  return {
    x: center.x + displacement[handle.side].x,
    y: center.y + displacement[handle.side].y,
  };
};

export const straightEdgePath = (
  source: XYPosition,
  target: XYPosition
): string => `M ${source.x},${source.y}L ${target.x},${target.y}`;

const sideDirection = {
  top: { axis: "y", sign: -1 },
  right: { axis: "x", sign: 1 },
  bottom: { axis: "y", sign: 1 },
  left: { axis: "x", sign: -1 },
} as const satisfies Record<
  FlowHandle["side"],
  { readonly axis: keyof XYPosition; readonly sign: number }
>;

const bezierControl = (
  point: XYPosition,
  other: XYPosition,
  side: FlowHandle["side"]
): XYPosition => {
  const { axis, sign } = sideDirection[side];
  const distance = (other[axis] - point[axis]) * sign;

  const offset =
    distance >= 0 ? distance / 2 : 0.25 * 25 * Math.sqrt(-distance);

  const coordinate = point[axis] + offset * sign;

  return axis === "x"
    ? { x: coordinate, y: point.y }
    : { x: point.x, y: coordinate };
};

export const bezierEdgePath = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: FlowHandle["side"],
  targetSide: FlowHandle["side"]
): string => {
  const sourceControl = bezierControl(source, target, sourceSide);
  const targetControl = bezierControl(target, source, targetSide);

  return `M${source.x},${source.y} C${sourceControl.x},${sourceControl.y} ${targetControl.x},${targetControl.y} ${target.x},${target.y}`;
};

const simpleBezierControl = (
  point: XYPosition,
  other: XYPosition,
  side: FlowHandle["side"]
): XYPosition =>
  side === "left" || side === "right"
    ? { x: (point.x + other.x) / 2, y: point.y }
    : { x: point.x, y: (point.y + other.y) / 2 };

export const simpleBezierEdgePath = (
  source: XYPosition,
  target: XYPosition,
  sourceSide: FlowHandle["side"],
  targetSide: FlowHandle["side"]
): string => {
  const sourceControl = simpleBezierControl(source, target, sourceSide);
  const targetControl = simpleBezierControl(target, source, targetSide);

  return `M${source.x},${source.y} C${sourceControl.x},${sourceControl.y} ${targetControl.x},${targetControl.y} ${target.x},${target.y}`;
};

export const edgeLabelPosition = (
  source: XYPosition,
  target: XYPosition,
  path: FlowEdgePath,
  sourceSide: FlowHandle["side"],
  targetSide: FlowHandle["side"]
): XYPosition => {
  if (path === "straight") {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  if (path === "step" || path === "smoothstep") {
    return stepEdgeLabelPosition(source, target, sourceSide, targetSide);
  }

  const control = path === "simplebezier" ? simpleBezierControl : bezierControl;
  const sourceControl = control(source, target, sourceSide);
  const targetControl = control(target, source, targetSide);

  return {
    x:
      (source.x + target.x) / 8 + (3 * (sourceControl.x + targetControl.x)) / 8,
    y:
      (source.y + target.y) / 8 + (3 * (sourceControl.y + targetControl.y)) / 8,
  };
};
