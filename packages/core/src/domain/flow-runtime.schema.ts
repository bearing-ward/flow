import { Schema as S } from "effect";

import { canReconnectEdge } from "./flow-reconnection.schema.ts";
import { snapGroupDelta, snapPosition } from "./flow-snap-grid.schema.ts";
import type { SnapGrid } from "./flow-snap-grid.schema.ts";
import {
  FlowEdgeSchema,
  EdgeIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from "./flow.schema.ts";
import type { FlowDocument, NodeId, XYPosition } from "./flow.schema.ts";

export const FlowControlModeSchema = S.Literals(["controlled", "uncontrolled"]);

export type FlowControlMode = typeof FlowControlModeSchema.Type;

export const ViewportSchema = S.Struct({
  x: S.Number,
  y: S.Number,
  zoom: S.Finite.check(S.isGreaterThan(0)),
});

export type Viewport = typeof ViewportSchema.Type;

export const ViewportLimitsSchema = S.Struct({
  maxZoom: S.Finite.check(S.isGreaterThan(0)),
  minZoom: S.Finite.check(S.isGreaterThan(0)),
}).check(
  S.makeFilter((limits) =>
    limits.minZoom <= limits.maxZoom
      ? undefined
      : "minZoom must be less than or equal to maxZoom"
  )
);

export type ViewportLimits = typeof ViewportLimitsSchema.Type;

export const MeasuredNodeSchema = S.Struct({
  height: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
  nodeId: NodeIdSchema,
  width: S.Finite.check(S.isGreaterThanOrEqualTo(0)),
});

export type MeasuredNode = typeof MeasuredNodeSchema.Type;

export const ActiveNodeDragSchema = S.Struct({
  nodeId: NodeIdSchema,
  pointerId: S.Number,
  pointerOffset: XYPositionSchema,
});

export type ActiveNodeDrag = typeof ActiveNodeDragSchema.Type;

export const ActiveNodeGroupDragSchema = S.Struct({
  anchorNodeId: NodeIdSchema,
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  positions: S.Array(
    S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
});

export type ActiveNodeGroupDrag = typeof ActiveNodeGroupDragSchema.Type;

export const ActiveViewportPanSchema = S.Struct({
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  viewportStart: ViewportSchema,
});

export type ActiveViewportPan = typeof ActiveViewportPanSchema.Type;

export const ActivePinchSchema = S.Struct({
  firstPointerId: S.Number,
  secondPointerId: S.Number,
  firstStart: XYPositionSchema,
  secondStart: XYPositionSchema,
  viewportStart: ViewportSchema,
});

export type ActivePinch = typeof ActivePinchSchema.Type;

export const ActiveSelectionRectSchema = S.Struct({
  pointerId: S.Number,
  pointerStart: XYPositionSchema,
  flowStart: XYPositionSchema,
});

export type ActiveSelectionRect = typeof ActiveSelectionRectSchema.Type;

export const NodePositionChangeSchema = S.Struct({
  kind: S.Literal("node-position"),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
});

export type NodePositionChange = typeof NodePositionChangeSchema.Type;

export const NodePositionsChangeSchema = S.Struct({
  kind: S.Literal("node-positions"),
  positions: S.Array(
    S.Struct({ nodeId: NodeIdSchema, position: XYPositionSchema })
  ),
});

export type NodePositionsChange = typeof NodePositionsChangeSchema.Type;

export const ViewportChangeSchema = S.Struct({
  kind: S.Literal("viewport"),
  viewport: ViewportSchema,
});

export type ViewportChange = typeof ViewportChangeSchema.Type;

export const EdgeAddChangeSchema = S.Struct({
  kind: S.Literal("edge-add"),
  edge: FlowEdgeSchema,
});

export type EdgeAddChange = typeof EdgeAddChangeSchema.Type;

export const EdgeSelectionChangeSchema = S.Struct({
  kind: S.Literal("edge-selection"),
  edgeId: EdgeIdSchema,
  selected: S.Boolean,
});

export type EdgeSelectionChange = typeof EdgeSelectionChangeSchema.Type;

export const NodeSelectionChangeSchema = S.Struct({
  kind: S.Literal("node-selection"),
  nodeId: NodeIdSchema,
  selected: S.Boolean,
});

export type NodeSelectionChange = typeof NodeSelectionChangeSchema.Type;

export const SelectionSetChangeSchema = S.Struct({
  kind: S.Literal("selection-set"),
  nodeIds: S.Array(NodeIdSchema),
  edgeIds: S.Array(EdgeIdSchema),
});

export type SelectionSetChange = typeof SelectionSetChangeSchema.Type;

export const EdgeReconnectChangeSchema = S.Struct({
  kind: S.Literal("edge-reconnect"),
  edge: FlowEdgeSchema,
});

export type EdgeReconnectChange = typeof EdgeReconnectChangeSchema.Type;

export const EdgeRemoveChangeSchema = S.Struct({
  kind: S.Literal("edge-remove"),
  edgeId: EdgeIdSchema,
});

export type EdgeRemoveChange = typeof EdgeRemoveChangeSchema.Type;

export const FlowChangeSchema = S.Union([
  NodePositionChangeSchema,
  NodePositionsChangeSchema,
  ViewportChangeSchema,
  EdgeAddChangeSchema,
  EdgeSelectionChangeSchema,
  NodeSelectionChangeSchema,
  SelectionSetChangeSchema,
  EdgeReconnectChangeSchema,
  EdgeRemoveChangeSchema,
]);

export type FlowChange = typeof FlowChangeSchema.Type;

export const applyEdgeSelectionChange = (
  document: FlowDocument,
  change: EdgeSelectionChange
): FlowDocument | undefined => {
  const target = document.edges.find((edge) => edge.id === change.edgeId);

  if (
    target === undefined ||
    (change.selected && (target.selectable === false || target.hidden === true))
  ) {
    return;
  }

  return {
    ...document,
    nodes: change.selected
      ? document.nodes.map((node) =>
          node.selected === true ? { ...node, selected: false } : node
        )
      : document.nodes,
    edges: document.edges.map((edge) => {
      let selected = edge.selected === true;

      if (edge.id === change.edgeId) {
        const { selected: nextSelected } = change;
        selected = nextSelected;
      } else if (change.selected) {
        selected = false;
      }

      return edge.selected === selected ? edge : { ...edge, selected };
    }),
  };
};

export const applyNodeSelectionChange = (
  document: FlowDocument,
  change: NodeSelectionChange
): FlowDocument | undefined => {
  const target = document.nodes.find((node) => node.id === change.nodeId);

  if (
    target === undefined ||
    (change.selected && (target.selectable === false || target.hidden === true))
  ) {
    return;
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      let selected = node.selected === true;
      const { nodeId, selected: changeSelected } = change;

      if (node.id === nodeId) {
        selected = changeSelected;
      } else if (changeSelected) {
        selected = false;
      }

      return node.selected === selected ? node : { ...node, selected };
    }),
    edges: change.selected
      ? document.edges.map((edge) =>
          edge.selected === true ? { ...edge, selected: false } : edge
        )
      : document.edges,
  };
};

export const applySelectionSetChange = (
  document: FlowDocument,
  change: SelectionSetChange
): FlowDocument | undefined => {
  const nodeIds = new Set(change.nodeIds);
  const edgeIds = new Set(change.edgeIds);

  if (
    change.nodeIds.some(
      (id) =>
        !document.nodes.some(
          (node) =>
            node.id === id && node.selectable !== false && node.hidden !== true
        )
    ) ||
    change.edgeIds.some(
      (id) =>
        !document.edges.some(
          (edge) =>
            edge.id === id &&
            edge.selectable !== false &&
            edge.hidden !== true &&
            document.nodes.some(
              (node) => node.id === edge.source && node.hidden !== true
            ) &&
            document.nodes.some(
              (node) => node.id === edge.target && node.hidden !== true
            )
        )
    )
  ) {
    return;
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const selected = nodeIds.has(node.id);

      return node.selected === selected ? node : { ...node, selected };
    }),
    edges: document.edges.map((edge) => {
      const selected = edgeIds.has(edge.id);

      return edge.selected === selected ? edge : { ...edge, selected };
    }),
  };
};

export const applyEdgeReconnectChange = (
  document: FlowDocument,
  change: EdgeReconnectChange
): FlowDocument | undefined => {
  const previous = document.edges.find((edge) => edge.id === change.edge.id);

  const sourceChanged =
    previous?.source !== change.edge.source ||
    previous?.sourceHandle !== change.edge.sourceHandle;

  const targetChanged =
    previous?.target !== change.edge.target ||
    previous?.targetHandle !== change.edge.targetHandle;

  if (
    previous === undefined ||
    sourceChanged === targetChanged ||
    (sourceChanged && !canReconnectEdge(previous, "source")) ||
    (targetChanged && !canReconnectEdge(previous, "target"))
  ) {
    return;
  }

  return {
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === change.edge.id ? change.edge : edge
    ),
  };
};

export const applyEdgeRemoveChange = (
  document: FlowDocument,
  change: EdgeRemoveChange
): FlowDocument | undefined => {
  const edge = document.edges.find((item) => item.id === change.edgeId);

  if (edge === undefined || edge.deletable === false) {
    return;
  }

  return {
    ...document,
    edges: document.edges.filter((item) => item.id !== change.edgeId),
  };
};

export const SetNodePositionCommandSchema = S.Struct({
  kind: S.Literal("set-node-position"),
  nodeId: NodeIdSchema,
  position: XYPositionSchema,
});

export type SetNodePositionCommand = typeof SetNodePositionCommandSchema.Type;

export const SetViewportCommandSchema = S.Struct({
  kind: S.Literal("set-viewport"),
  viewport: ViewportSchema,
});

export type SetViewportCommand = typeof SetViewportCommandSchema.Type;

export const FlowCommandSchema = S.Union([
  SetNodePositionCommandSchema,
  SetViewportCommandSchema,
]);

export type FlowCommand = typeof FlowCommandSchema.Type;

export const screenToFlowPosition = (
  position: XYPosition,
  viewport: Viewport
): XYPosition => ({
  x: (position.x - viewport.x) / viewport.zoom,
  y: (position.y - viewport.y) / viewport.zoom,
});

export const flowToScreenPosition = (
  position: XYPosition,
  viewport: Viewport
): XYPosition => ({
  x: position.x * viewport.zoom + viewport.x,
  y: position.y * viewport.zoom + viewport.y,
});

export const clampViewport = (
  viewport: Viewport,
  limits: ViewportLimits
): Viewport => ({
  ...viewport,
  zoom: Math.min(limits.maxZoom, Math.max(limits.minZoom, viewport.zoom)),
});

export const panViewport = (
  viewport: Viewport,
  delta: XYPosition
): Viewport => ({
  ...viewport,
  x: viewport.x + delta.x,
  y: viewport.y + delta.y,
});

export const selectionAutoPanDelta = (
  pointer: XYPosition,
  width: number,
  height: number,
  band = 40,
  speed = 15
): XYPosition => {
  const x = pointer.x < band ? speed : 0;
  const y = pointer.y < band ? speed : 0;

  return {
    x: pointer.x > width - band ? -speed : x,
    y: pointer.y > height - band ? -speed : y,
  };
};

export const zoomViewportAt = (
  viewport: Viewport,
  requestedZoom: number,
  anchor: XYPosition,
  limits: ViewportLimits
): Viewport => {
  const zoom = Math.min(
    limits.maxZoom,
    Math.max(limits.minZoom, requestedZoom)
  );

  const flowAnchor = screenToFlowPosition(anchor, viewport);

  return {
    x: anchor.x - flowAnchor.x * zoom,
    y: anchor.y - flowAnchor.y * zoom,
    zoom,
  };
};

export const beginViewportPan = (
  viewport: Viewport,
  pointerPosition: XYPosition,
  pointerId: number
): ActiveViewportPan => ({
  pointerId,
  pointerStart: pointerPosition,
  viewportStart: viewport,
});

export const moveViewportPan = (
  pan: ActiveViewportPan,
  pointerPosition: XYPosition
): Viewport =>
  panViewport(pan.viewportStart, {
    x: pointerPosition.x - pan.pointerStart.x,
    y: pointerPosition.y - pan.pointerStart.y,
  });

export const movePinch = (
  pinch: ActivePinch,
  first: XYPosition,
  second: XYPosition,
  limits: ViewportLimits
): Viewport => {
  const startMidpoint = {
    x: (pinch.firstStart.x + pinch.secondStart.x) / 2,
    y: (pinch.firstStart.y + pinch.secondStart.y) / 2,
  };

  const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

  const startDistance = Math.hypot(
    pinch.secondStart.x - pinch.firstStart.x,
    pinch.secondStart.y - pinch.firstStart.y
  );

  const distance = Math.hypot(second.x - first.x, second.y - first.y);

  const zoom = Math.min(
    limits.maxZoom,
    Math.max(
      limits.minZoom,
      startDistance === 0
        ? pinch.viewportStart.zoom
        : (pinch.viewportStart.zoom * distance) / startDistance
    )
  );

  const anchor = screenToFlowPosition(startMidpoint, pinch.viewportStart);

  return {
    x: midpoint.x - anchor.x * zoom,
    y: midpoint.y - anchor.y * zoom,
    zoom,
  };
};

export const beginNodeDrag = (
  nodeId: NodeId,
  nodePosition: XYPosition,
  pointerPosition: XYPosition,
  pointerId: number
): ActiveNodeDrag => ({
  nodeId,
  pointerId,
  pointerOffset: {
    x: pointerPosition.x - nodePosition.x,
    y: pointerPosition.y - nodePosition.y,
  },
});

export const moveNodeDrag = (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): XYPosition => {
  const position = {
    x: pointerPosition.x - drag.pointerOffset.x,
    y: pointerPosition.y - drag.pointerOffset.y,
  };

  return grid === undefined ? position : snapPosition(position, grid);
};

export const completeNodeDrag = (
  drag: ActiveNodeDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): NodePositionChange => ({
  kind: "node-position",
  nodeId: drag.nodeId,
  position: moveNodeDrag(drag, pointerPosition, grid),
});

export const moveNodeGroupDrag = (
  drag: ActiveNodeGroupDrag,
  pointerPosition: XYPosition,
  grid?: SnapGrid
): NodePositionsChange => {
  const unsnappedDelta = {
    x: pointerPosition.x - drag.pointerStart.x,
    y: pointerPosition.y - drag.pointerStart.y,
  };

  const [first] = drag.positions;

  const delta =
    grid === undefined || first === undefined
      ? unsnappedDelta
      : snapGroupDelta(first.position, unsnappedDelta, grid);

  return {
    kind: "node-positions",
    positions: drag.positions.map(({ nodeId, position }) => ({
      nodeId,
      position: { x: position.x + delta.x, y: position.y + delta.y },
    })),
  };
};

export const moveSelectedNodes = (
  document: FlowDocument,
  delta: XYPosition,
  grid?: SnapGrid
): NodePositionsChange => ({
  kind: "node-positions",
  positions: document.nodes
    .filter((node) => node.selected === true && node.hidden !== true)
    .map((node) => ({
      nodeId: node.id,
      position:
        grid === undefined
          ? { x: node.position.x + delta.x, y: node.position.y + delta.y }
          : snapPosition(
              { x: node.position.x + delta.x, y: node.position.y + delta.y },
              grid
            ),
    })),
});

export const commandToChange = (command: FlowCommand): FlowChange => {
  switch (command.kind) {
    case "set-node-position": {
      return {
        kind: "node-position",
        nodeId: command.nodeId,
        position: command.position,
      };
    }

    case "set-viewport": {
      return { kind: "viewport", viewport: command.viewport };
    }

    default: {
      const exhaustive: never = command;

      return exhaustive;
    }
  }
};

export const applyNodePositionChange = (
  document: FlowDocument,
  change: NodePositionChange
): FlowDocument | undefined => {
  let found = false;

  const nodes = document.nodes.map((node) => {
    if (node.id !== change.nodeId) {
      return node;
    }

    found = true;

    return { ...node, position: change.position };
  });

  return found ? { ...document, nodes } : undefined;
};

export const applyNodePositionsChange = (
  document: FlowDocument,
  change: NodePositionsChange
): FlowDocument | undefined => {
  const positions = new Map(
    change.positions.map(({ nodeId, position }) => [nodeId, position])
  );

  if (
    positions.size !== change.positions.length ||
    [...positions.keys()].some(
      (id) => !document.nodes.some((node) => node.id === id)
    )
  ) {
    return;
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const position = positions.get(node.id);

      return position === undefined ? node : { ...node, position };
    }),
  };
};
