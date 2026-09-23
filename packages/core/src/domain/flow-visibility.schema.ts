import { Schema as S } from "effect";

import type {
  MeasuredNode,
  SelectionSetChange,
  Viewport,
} from "./flow-runtime.schema.ts";
import type { EdgeId, NodeId, XYPosition } from "./flow-values.ts";
import type { FlowDocument, FlowEdge, FlowNode } from "./flow.schema.ts";

export const FlowRectSchema = S.Struct({
  x: S.Number,
  y: S.Number,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
});

export type FlowRect = typeof FlowRectSchema.Type;

export const SelectionModeSchema = S.Literals(["full", "partial"]);

export type SelectionMode = typeof SelectionModeSchema.Type;

export const viewportFlowRect = (
  viewport: Viewport,
  screenWidth: number,
  screenHeight: number,
  overscan = 32
): FlowRect => ({
  x: (-viewport.x - overscan) / viewport.zoom,
  y: (-viewport.y - overscan) / viewport.zoom,
  width: (screenWidth + 2 * overscan) / viewport.zoom,
  height: (screenHeight + 2 * overscan) / viewport.zoom,
});

export const intersectsFlowRect = (
  first: FlowRect,
  second: FlowRect
): boolean =>
  first.x <= second.x + second.width &&
  first.x + first.width >= second.x &&
  first.y <= second.y + second.height &&
  first.y + first.height >= second.y;

const nodeBounds = (
  node: FlowNode,
  measurement?: MeasuredNode,
  renderedPosition?: XYPosition
): FlowRect => ({
  x: (renderedPosition ?? node.position).x,
  y: (renderedPosition ?? node.position).y,
  width: measurement?.width ?? 150,
  height: measurement?.height ?? 44,
});

export const nodeIntersectsViewport = (
  node: FlowNode,
  viewportRect: FlowRect,
  measurement?: MeasuredNode,
  renderedPosition?: XYPosition
): boolean =>
  node.hidden !== true &&
  intersectsFlowRect(
    nodeBounds(node, measurement, renderedPosition),
    viewportRect
  );

export const edgeIntersectsViewport = (
  document: FlowDocument,
  edge: FlowEdge,
  viewportRect: FlowRect,
  measurements: ReadonlyMap<NodeId, MeasuredNode>,
  renderedPositions: ReadonlyMap<NodeId, XYPosition>
): boolean => {
  if (edge.hidden === true) {
    return false;
  }

  const source = document.nodes.find((node) => node.id === edge.source);
  const target = document.nodes.find((node) => node.id === edge.target);

  if (
    source === undefined ||
    target === undefined ||
    source.hidden === true ||
    target.hidden === true
  ) {
    return false;
  }

  const sourceBounds = nodeBounds(
    source,
    measurements.get(source.id),
    renderedPositions.get(source.id)
  );

  const targetBounds = nodeBounds(
    target,
    measurements.get(target.id),
    renderedPositions.get(target.id)
  );

  const x = Math.min(sourceBounds.x, targetBounds.x);
  const y = Math.min(sourceBounds.y, targetBounds.y);

  const right = Math.max(
    sourceBounds.x + sourceBounds.width,
    targetBounds.x + targetBounds.width
  );

  const bottom = Math.max(
    sourceBounds.y + sourceBounds.height,
    targetBounds.y + targetBounds.height
  );

  return intersectsFlowRect(
    { x, y, width: right - x, height: bottom - y },
    viewportRect
  );
};

export const selectionInRect = (
  document: FlowDocument,
  rect: FlowRect,
  measurements: ReadonlyMap<NodeId, MeasuredNode>,
  renderedPositions: ReadonlyMap<NodeId, XYPosition>,
  mode: SelectionMode = "full"
): SelectionSetChange => {
  const nodeIds: NodeId[] = [];

  for (const node of document.nodes) {
    if (node.hidden === true || node.selectable === false) {
      continue;
    }

    const bounds = nodeBounds(
      node,
      measurements.get(node.id),
      renderedPositions.get(node.id)
    );

    const matches =
      mode === "partial"
        ? bounds.x < rect.x + rect.width &&
          bounds.x + bounds.width > rect.x &&
          bounds.y < rect.y + rect.height &&
          bounds.y + bounds.height > rect.y
        : bounds.x >= rect.x &&
          bounds.y >= rect.y &&
          bounds.x + bounds.width <= rect.x + rect.width &&
          bounds.y + bounds.height <= rect.y + rect.height;

    if (matches) {
      nodeIds.push(node.id);
    }
  }

  const selectedNodes = new Set(nodeIds);

  const edgeIds: EdgeId[] = document.edges
    .filter(
      (edge) =>
        edge.hidden !== true &&
        edge.selectable !== false &&
        document.nodes.some(
          (node) => node.id === edge.source && node.hidden !== true
        ) &&
        document.nodes.some(
          (node) => node.id === edge.target && node.hidden !== true
        ) &&
        (selectedNodes.has(edge.source) || selectedNodes.has(edge.target))
    )
    .map((edge) => edge.id);

  return { kind: "selection-set", nodeIds, edgeIds };
};

export const orderFlowEdges = (edges: readonly FlowEdge[]): FlowEdge[] =>
  edges
    .map((edge, index) => ({ edge, index }))
    .toSorted((first, second) => {
      const firstLevel =
        (first.edge.zIndex ?? 0) + (first.edge.selected === true ? 1000 : 0);

      const secondLevel =
        (second.edge.zIndex ?? 0) + (second.edge.selected === true ? 1000 : 0);

      return firstLevel - secondLevel || first.index - second.index;
    })
    .map(({ edge }) => edge);
