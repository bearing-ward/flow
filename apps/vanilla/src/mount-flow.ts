import {
  FlowAttribute,
  FlowCommandSchema,
  FlowControlModeSchema,
  FitViewPaddingSchema,
  FitViewNodeDimensionsSchema,
  PanExtentSchema,
  NodeExtentSchema,
  SnapGridSchema,
  ConnectionRadiusSchema,
  SelectionModeSchema,
  FlowSpan,
  ViewportLimitsSchema,
  ViewportSchema,
  applyEdgeSelectionChange,
  applyEdgeReconnectChange,
  applyEdgeRemoveChange,
  applyNodeSelectionChange,
  applySelectionSetChange,
  applyNodePositionChange,
  applyNodePositionsChange,
  beginNodeDrag,
  beginViewportPan,
  clampViewport,
  constrainViewportToExtent,
  constrainNodePosition,
  constrainNodeGroupDelta,
  fitViewportToNodes,
  createFlowGraph,
  flowToolbarAnchors,
  commandToChange,
  completeNodeDrag,
  moveViewportPan,
  movePinch,
  moveNodeDrag,
  moveNodeGroupDrag,
  moveSelectedNodes,
  nextConnectionEdge,
  findConnectionIssue,
  nearestConnectionTarget,
  reconnectFlowEdge,
  canReconnectEdge,
  screenToFlowPosition,
  selectionInRect,
  selectionAutoPanDelta,
  flowToScreenPosition,
  panViewport,
  zoomViewportAt,
  decodeFlowDocument,
  edgeIntersectsViewport,
  nodeIntersectsViewport,
  viewportFlowRect,
  validateFlowConnection,
} from "@flow/core";
import type {
  ActiveNodeDrag,
  ActiveNodeGroupDrag,
  ActiveConnection,
  ActiveClickConnection,
  ActiveEdgeReconnect,
  ActiveViewportPan,
  ActivePinch,
  ActiveSelectionRect,
  FlowChange,
  FlowCommand,
  FlowConnection,
  FlowControlMode,
  FlowDocument,
  FlowDocumentSchema,
  FlowEdge,
  FlowNode,
  FlowToolbarAnchor,
  NodePositionChange,
  NodePositionsChange,
  MeasuredNode,
  FlowHandle,
  ReconnectEndpoint,
  NodeId,
  Viewport,
  ViewportLimits,
  PanExtent,
  NodeExtent,
  SnapGrid,
  ConnectionRadius,
  MeasuredConnectionHandle,
  XYPosition,
  SelectionMode,
} from "@flow/core";
import { Effect, Exit, Result, Schema as S, Scope } from "effect";

import { createEdgeRenderer } from "./edge-renderer.ts";
import { FlowBrowser, FlowBrowserLive } from "./flow-browser.ts";

export const FlowMountOptionsSchema = S.Struct({
  documentMode: FlowControlModeSchema,
  nodeDragThreshold: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  connectOnClick: S.optional(S.Boolean),
  autoPanOnConnect: S.optional(S.Boolean),
  snapGrid: S.optional(SnapGridSchema),
  connectionRadius: S.optional(ConnectionRadiusSchema),
  nodeExtent: S.optional(NodeExtentSchema),
  renderOnlyVisible: S.optional(S.Boolean),
  selectionMode: S.optional(SelectionModeSchema),
  viewport: S.Struct({
    extent: S.optional(PanExtentSchema),
    initial: ViewportSchema,
    limits: ViewportLimitsSchema,
    mode: FlowControlModeSchema,
  }),
});

export const FitViewOptionsSchema = S.Struct({
  nodes: S.optional(S.Literals(["all", "selected"])),
  padding: S.optional(FitViewPaddingSchema),
  fallbackDimensions: S.optional(FitViewNodeDimensionsSchema),
});

export type FitViewOptions = typeof FitViewOptionsSchema.Type;

export type FlowMountOptions = typeof FlowMountOptionsSchema.Type;

export type FlowConnectionCandidate = Pick<
  FlowEdge,
  "source" | "sourceHandle" | "target" | "targetHandle"
>;

export type FlowConnectionValidator = (
  connection: FlowConnectionCandidate
) => boolean;

export interface FlowNodeRendererInstance {
  readonly update: (node: FlowNode) => void;
  readonly destroy: () => void;
}

export type FlowNodeRenderer = (
  node: FlowNode,
  content: HTMLElement
) => FlowNodeRendererInstance;

export interface FlowEdgeRenderContext {
  readonly source: XYPosition;
  readonly target: XYPosition;
  readonly sourceSide: FlowHandle["side"];
  readonly targetSide: FlowHandle["side"];
  readonly pathData: string;
  readonly labelAnchor: XYPosition;
}

export interface FlowEdgeRendererInstance {
  readonly update: (edge: FlowEdge, context: FlowEdgeRenderContext) => void;
  readonly destroy: () => void;
}

export interface FlowEdgeRenderer {
  readonly geometry?: (
    edge: FlowEdge,
    endpoints: Omit<FlowEdgeRenderContext, "pathData" | "labelAnchor">
  ) => { readonly pathData: string; readonly labelAnchor: XYPosition };
  readonly render?: (
    edge: FlowEdge,
    context: FlowEdgeRenderContext,
    visual: SVGGElement
  ) => FlowEdgeRendererInstance;
}

export interface FlowHostOptions {
  readonly documentMode: FlowControlMode;
  readonly nodeDragThreshold?: number | undefined;
  readonly connectOnClick?: boolean | undefined;
  readonly autoPanOnConnect?: boolean | undefined;
  readonly snapGrid?: SnapGrid | undefined;
  readonly connectionRadius?: ConnectionRadius | undefined;
  readonly isValidConnection?: FlowConnectionValidator | undefined;
  readonly nodeExtent?: NodeExtent | undefined;
  readonly renderOnlyVisible?: boolean | undefined;
  readonly selectionMode?: SelectionMode | undefined;
  readonly nodeRenderers?: Readonly<Record<string, FlowNodeRenderer>> | undefined;
  readonly edgeRenderers?: Readonly<Record<string, FlowEdgeRenderer>> | undefined;
  readonly onToolbarAnchors?: ((anchors: { readonly nodes: readonly FlowToolbarAnchor[]; readonly edges: readonly FlowToolbarAnchor[] }) => void) | undefined;
  readonly viewport: {
    readonly extent?: PanExtent | undefined;
    readonly mode: FlowControlMode;
    readonly initial: Viewport;
    readonly limits: ViewportLimits;
  };
  readonly runEffect: <A>(effect: Effect.Effect<A>) => A;
}

export interface FlowController {
  readonly fitView: (options?: FitViewOptions) => boolean;
  readonly update: (document: FlowDocument) => void;
  readonly updateViewport: (viewport: Viewport) => void;
  readonly dispatch: (command: FlowCommand) => void;
  readonly subscribe: (listener: (change: FlowChange) => void) => () => void;
  readonly destroy: () => void;
}

export type FlowDocumentInput = typeof FlowDocumentSchema.Encoded;

export type FlowCommandInput = typeof FlowCommandSchema.Encoded;

export type ViewportInput = typeof ViewportSchema.Encoded;

export type FlowMountOptionsInput = typeof FlowMountOptionsSchema.Encoded & {
  readonly isValidConnection?: FlowConnectionValidator | undefined;
  readonly nodeRenderers?: Readonly<Record<string, FlowNodeRenderer>> | undefined;
  readonly edgeRenderers?: Readonly<Record<string, FlowEdgeRenderer>> | undefined;
  readonly onToolbarAnchors?: ((anchors: { readonly nodes: readonly FlowToolbarAnchor[]; readonly edges: readonly FlowToolbarAnchor[] }) => void) | undefined;
};

export interface JavaScriptFlowController {
  readonly fitView: (options?: typeof FitViewOptionsSchema.Encoded) => boolean;
  readonly update: (document: FlowDocumentInput) => void;
  readonly updateViewport: (viewport: ViewportInput) => void;
  readonly dispatch: (command: FlowCommandInput) => void;
  readonly subscribe: (listener: (change: FlowChange) => void) => () => void;
  readonly destroy: () => void;
}

interface NodeEntry {
  readonly element: HTMLElement;
  readonly content: HTMLElement;
  readonly handles: HTMLElement;
  readonly release: () => void;
  rendererType: string | undefined;
  renderer: FlowNodeRendererInstance | undefined;
}

const dragAnchorId = (drag: ActiveNodeDrag | ActiveNodeGroupDrag): NodeId =>
  "nodeId" in drag ? drag.nodeId : drag.anchorNodeId;

const keyboardArrowDelta = (key: string): XYPosition | null => {
  switch (key) {
    case "ArrowLeft": {
      return { x: -1, y: 0 };
    }

    case "ArrowRight": {
      return { x: 1, y: 0 };
    }

    case "ArrowUp": {
      return { x: 0, y: -1 };
    }

    case "ArrowDown": {
      return { x: 0, y: 1 };
    }

    default: {
      return null;
    }
  }
};

const applyNodePosition = (
  element: HTMLElement,
  position: XYPosition
): void => {
  element.style.transform = `translate(${position.x}px, ${position.y}px)`;
};

const applyViewport = (element: HTMLElement, viewport: Viewport): void => {
  element.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
  element.dataset.x = String(viewport.x);
  element.dataset.y = String(viewport.y);
  element.dataset.zoom = String(viewport.zoom);
};

const sameNode = (left: FlowNode | undefined, right: FlowNode): boolean =>
  left?.label === right.label &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  left.parentId === right.parentId &&
  left.type === right.type &&
  left.zIndex === right.zIndex &&
  JSON.stringify(left.size) === JSON.stringify(right.size) &&
  JSON.stringify(left.data) === JSON.stringify(right.data) &&
  left.extent === right.extent &&
  JSON.stringify(left.handles ?? []) === JSON.stringify(right.handles ?? []) &&
  left.selected === right.selected &&
  left.selectable === right.selectable &&
  left.focusable === right.focusable &&
  left.ariaLabel === right.ariaLabel &&
  left.hidden === right.hidden;

const applyNodeInteractionState = (
  element: HTMLElement,
  node: FlowNode
): void => {
  element.classList.toggle("selected", node.selected === true);
  element.tabIndex = node.focusable === false ? -1 : 0;
  element.setAttribute("role", node.selectable === false ? "img" : "button");
  element.setAttribute("aria-roledescription", "node");
  element.setAttribute("aria-label", node.ariaLabel ?? node.label);

  if (node.selectable === false) {
    element.removeAttribute("aria-pressed");
  } else {
    element.setAttribute("aria-pressed", String(node.selected === true));
  }
};

const renderDefaultNodeContents = (content: HTMLElement, node: FlowNode): void => {
  const label = globalThis.document.createElement("span");
  label.textContent = node.label;
  content.replaceChildren(label);
};

const renderNodeHandles = (handles: HTMLElement, node: FlowNode): void => {
  handles.replaceChildren();
  for (const handle of node.handles ?? []) {
    const button = globalThis.document.createElement("button");
    button.type = "button";
    button.className = `flow-handle flow-handle-${handle.side} flow-handle-${handle.kind}`;
    button.dataset.nodeId = node.id;
    button.dataset.handleId = handle.id;
    button.dataset.kind = handle.kind;
    button.dataset.testid = "flow-handle";
    button.setAttribute("aria-label", `${handle.kind} handle ${handle.id}`);
    handles.append(button);
  }
};

const applyDeclaredNodeSize = (element: HTMLElement, node: FlowNode): void => {
  if (node.size === undefined) {
    element.style.removeProperty("width");
    element.style.removeProperty("height");
    element.style.removeProperty("box-sizing");
    element.removeAttribute("data-sized");
    return;
  }
  element.style.width = `${node.size.width}px`;
  element.style.height = `${node.size.height}px`;
  element.style.boxSizing = "border-box";
  element.dataset.sized = "true";
};

export const createFlowHost = (
  root: HTMLElement,
  initialDocument: FlowDocument,
  options: FlowHostOptions
) =>
  Effect.gen(function* buildFlowHost() {
    const browser = yield* FlowBrowser;
    const hostScope = yield* Scope.make("sequential");
    const { documentMode, runEffect } = options;

    const runTelemetry = (effect: Effect.Effect<void>): void => {
      runEffect(effect);
    };

    const viewportMode = options.viewport.mode;
    const viewportLimits = options.viewport.limits;
    const canvas = globalThis.document.createElement("section");
    canvas.className = "flow-canvas";
    canvas.tabIndex = -1;
    canvas.setAttribute("aria-label", "Flow canvas");
    canvas.dataset.testid = "flow-canvas";
    const connectionStatus = globalThis.document.createElement("span");
    connectionStatus.className = "flow-connection-status";
    connectionStatus.dataset.testid = "flow-connection-status";
    connectionStatus.setAttribute("role", "status");
    connectionStatus.setAttribute("aria-live", "polite");
    connectionStatus.setAttribute("aria-atomic", "true");

    const announceConnection = (message: string): void => {
      connectionStatus.textContent = message;
    };

    const constrainViewport = (candidate: Viewport): Viewport => {
      const zoomBounded = clampViewport(candidate, viewportLimits);
      const { extent } = options.viewport;

      return extent === undefined
        ? zoomBounded
        : constrainViewportToExtent(
            zoomBounded,
            extent,
            canvas.clientWidth,
            canvas.clientHeight
          );
    };

    const viewport = globalThis.document.createElement("div");
    viewport.className = "flow-viewport";
    viewport.dataset.testid = "flow-viewport";
    const edgeRenderer = createEdgeRenderer(viewport, options.edgeRenderers);

    let authoritativeViewport = clampViewport(
      options.viewport.initial,
      viewportLimits
    );

    let renderedViewport = authoritativeViewport;
    applyViewport(viewport, renderedViewport);

    const entries = new Map<NodeId, NodeEntry>();
    const measurements = new Map<NodeId, MeasuredNode>();
    const renderedNodePositions = new Map<NodeId, XYPosition>();

    const boundedNodePosition = (
      nodeId: NodeId,
      position: XYPosition
    ): XYPosition => {
      const node = findNode(nodeId);
      if (node === undefined) return position;
      const measured = measurements.get(nodeId);
      const dimensions = {
        width: measured?.width && measured.width > 0 ? measured.width : node.size?.width ?? 150,
        height: measured?.height && measured.height > 0 ? measured.height : node.size?.height ?? 44,
      };

      if (node.parentId !== undefined) {
        if (node.extent !== "parent") return position;
        const parent = findNode(node.parentId);
        if (parent === undefined) return position;
        const parentMeasurement = measurements.get(parent.id);
        const parentDimensions = {
          width: parentMeasurement?.width && parentMeasurement.width > 0 ? parentMeasurement.width : parent.size?.width ?? 150,
          height: parentMeasurement?.height && parentMeasurement.height > 0 ? parentMeasurement.height : parent.size?.height ?? 44,
        };
        return constrainNodePosition(position, dimensions, {
          minX: 0,
          minY: 0,
          maxX: parentDimensions.width,
          maxY: parentDimensions.height,
        });
      }

      if (options.nodeExtent === undefined) return position;

      return constrainNodePosition(
        position,
        dimensions,
        options.nodeExtent
      );
    };

    const boundedGroupChange = (
      drag: ActiveNodeGroupDrag,
      change: NodePositionsChange
    ): NodePositionsChange => {
      const [first] = drag.positions;
      const [movedFirst] = change.positions;

      if (first === undefined || movedFirst === undefined) {
        return change;
      }

      const proposedDelta = {
        x: movedFirst.position.x - first.position.x,
        y: movedFirst.position.y - first.position.y,
      };

      const rootItems = drag.positions.flatMap(({ nodeId, position }) => {
          const node = findNode(nodeId);
          if (node?.parentId !== undefined) return [];
          const measured = measurements.get(nodeId);

          return [{
            position,
            width: measured?.width ?? node?.size?.width ?? 0,
            height: measured?.height ?? node?.size?.height ?? 0,
          }];
        });
      const delta = options.nodeExtent === undefined || rootItems.length === 0
        ? proposedDelta
        : constrainNodeGroupDelta(rootItems, proposedDelta, options.nodeExtent);

      return {
        kind: "node-positions",
        positions: drag.positions.map(({ nodeId, position }) => ({
          nodeId,
          position: boundedNodePosition(nodeId, { x: position.x + delta.x, y: position.y + delta.y }),
        })),
      };
    };

    const listeners = new Set<(change: FlowChange) => void>();
    let document = initialDocument;
    let activeDrag: ActiveNodeDrag | ActiveNodeGroupDrag | null = null;

    const adoptedPosition = (node: FlowNode): XYPosition =>
      boundedNodePosition(node.id, node.position);

    const graphFor = (
      target: FlowDocument = document,
      overrides: ReadonlyMap<NodeId, XYPosition> = renderedNodePositions
    ) => createFlowGraph(target, measurements, overrides);

    const absolutePosition = (nodeId: NodeId): XYPosition =>
      graphFor().nodes.get(nodeId)?.absolutePosition ?? { x: 0, y: 0 };

    const updateToolbarAnchors = (target: FlowDocument = document): void => {
      const anchors = flowToolbarAnchors(graphFor(target), renderedViewport);
      const visibleNodes = new Set<string>(entries.keys());
      const edgeIds = new Set<string>(target.edges.filter((edge) => visibleNodes.has(edge.source) && visibleNodes.has(edge.target)).map((edge) => edge.id));
      options.onToolbarAnchors?.({
        nodes: anchors.nodes.filter((anchor) => visibleNodes.has(anchor.id)),
        edges: anchors.edges.filter((anchor) => edgeIds.has(anchor.id)),
      });
    };

    const localPositionFromAbsolute = (nodeId: NodeId, absolute: XYPosition): XYPosition => {
      const node = findNode(nodeId);
      const parent = node?.parentId === undefined ? undefined : graphFor().nodes.get(node.parentId);
      return parent === undefined
        ? absolute
        : { x: absolute.x - parent.absolutePosition.x, y: absolute.y - parent.absolutePosition.y };
    };

    const renderGraphPositions = (target: FlowDocument = document): void => {
      const graph = graphFor(target);
      for (const [nodeId, entry] of entries) {
        const resolved = graph.nodes.get(nodeId);
        if (resolved !== undefined) applyNodePosition(entry.element, resolved.absolutePosition);
      }
      updateToolbarAnchors(target);
    };

    const restoreAdoptedPosition = (node: FlowNode): XYPosition => {
      const position = adoptedPosition(node);

      if (position.x === node.position.x && position.y === node.position.y) {
        renderedNodePositions.delete(node.id);
      } else {
        renderedNodePositions.set(node.id, position);
      }

      return position;
    };

    const isDraggingNode = (nodeId: NodeId): boolean =>
      activeDrag !== null &&
      ("positions" in activeDrag
        ? activeDrag.positions.some((item) => item.nodeId === nodeId)
        : activeDrag.nodeId === nodeId);

    let dragPointerStart: XYPosition | null = null;
    let dragActivated = false;
    let activeConnection: ActiveConnection | null = null;
    let connectionPointer: XYPosition | null = null;
    let connectionPointerStart: XYPosition | null = null;
    let connectionFrame: number | null = null;
    let hoveredConnectionHandle: HTMLElement | null = null;
    let activeClickConnection: ActiveClickConnection | null = null;
    let activeReconnection: ActiveEdgeReconnect | null = null;
    let connectionPreview: SVGSVGElement | null = null;
    let connectionLine: SVGLineElement | null = null;
    let activeViewportPan: ActiveViewportPan | null = null;
    let activePinch: ActivePinch | null = null;
    const touchPointers = new Map<number, XYPosition>();
    let activeSelectionRect: ActiveSelectionRect | null = null;
    let selectionOverlay: HTMLDivElement | null = null;
    let selectionPointer: XYPosition | null = null;
    let selectionFrame: number | null = null;
    let suppressCanvasClick = false;
    let destroyed = false;
    // eslint-disable-next-line prefer-const -- Assigned after the operations object is initialized.
    let reconcileVisible: (() => void) | undefined;

    const resizeObserver = yield* browser
      .observeResize((observedEntries) => {
        for (const entry of observedEntries) {
          if (!(entry.target instanceof HTMLElement)) {
            continue;
          }

          const element = entry.target;
          const measurement = browser.measure(element);
          element.dataset.measuredWidth = String(measurement.width);
          element.dataset.measuredHeight = String(measurement.height);
          element.style.visibility = "visible";

          const node = document.nodes.find(
            (candidate) => candidate.id === element.dataset.nodeId
          );

          if (node !== undefined) {
            measurements.set(node.id, { nodeId: node.id, ...measurement });

            if (!isDraggingNode(node.id)) {
              restoreAdoptedPosition(node);
              renderGraphPositions();
            }

            edgeRenderer.measureNode(node, element, renderedViewport.zoom);
          }
        }

        if (options.renderOnlyVisible === true) {
          reconcileVisible?.();
        } else {
          edgeRenderer.reconcile(document, renderedNodePositions);
        }

        runTelemetry(
          Effect.logDebug("Measured flow nodes").pipe(
            Effect.annotateLogs(
              FlowAttribute.measurementCount,
              observedEntries.length
            ),
            Effect.withSpan(FlowSpan.geometryMeasure, {
              attributes: {
                [FlowAttribute.measurementCount]: observedEntries.length,
              },
            })
          )
        );
      })
      .pipe(
        Scope.provide(hostScope),
        Effect.tapError(() => Scope.close(hostScope, Exit.void))
      );

    const pointerInFlow = (event: PointerEvent): XYPosition => {
      const bounds = canvas.getBoundingClientRect();

      return screenToFlowPosition(
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        renderedViewport
      );
    };

    const pointerInCanvas = (event: MouseEvent): XYPosition => {
      const bounds = canvas.getBoundingClientRect();

      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const renderViewport = (next: Viewport): void => {
      renderedViewport = constrainViewport(next);
      applyViewport(viewport, renderedViewport);
      updateToolbarAnchors();

      if (options.renderOnlyVisible === true) {
        reconcileVisible?.();
      }
    };

    const findNode = (nodeId: NodeId): FlowNode | undefined =>
      document.nodes.find((node) => node.id === nodeId);

    const hasSelectedAncestor = (node: FlowNode): boolean => {
      let parentId = node.parentId;
      while (parentId !== undefined) {
        const parent = findNode(parentId);
        if (parent?.selected === true) return true;
        parentId = parent?.parentId;
      }
      return false;
    };

    const selectedMovableNodes = (): readonly FlowNode[] =>
      document.nodes.filter(
        (candidate) =>
          candidate.selected === true &&
          candidate.hidden !== true &&
          !hasSelectedAncestor(candidate)
      );

    const handleCenterInFlow = (element: HTMLElement): XYPosition => {
      const bounds = element.getBoundingClientRect();
      const canvasBounds = canvas.getBoundingClientRect();

      return screenToFlowPosition(
        {
          x: bounds.left + bounds.width / 2 - canvasBounds.left,
          y: bounds.top + bounds.height / 2 - canvasBounds.top,
        },
        renderedViewport
      );
    };

    const connectionTargetAt = (
      source: ActiveClickConnection,
      clientX: number,
      clientY: number
    ): HTMLElement | null => {
      const direct = globalThis.document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>(".flow-handle");

      if (direct instanceof HTMLElement) {
        return direct;
      }

      const elements = [
        ...viewport.querySelectorAll<HTMLElement>(".flow-handle"),
      ];

      const candidates: MeasuredConnectionHandle[] = [];

      for (const element of elements) {
        const node = document.nodes.find(
          (item) => item.id === element.dataset.nodeId
        );

        const handle = node?.handles?.find(
          (item) => item.id === element.dataset.handleId
        );

        if (
          node === undefined ||
          handle === undefined ||
          node.hidden === true
        ) {
          continue;
        }

        const bounds = element.getBoundingClientRect();

        candidates.push({
          nodeId: node.id,
          handleId: handle.id,
          kind: handle.kind,
          center: {
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          },
        });
      }

      const nearest = nearestConnectionTarget({
        source,
        point: { x: clientX, y: clientY },
        candidates,
        radius: (options.connectionRadius ?? 20) * renderedViewport.zoom,
      });

      if (nearest === undefined) {
        return null;
      }

      return (
        elements.find(
          (element) =>
            element.dataset.nodeId === nearest?.nodeId &&
            element.dataset.handleId === nearest.handleId
        ) ?? null
      );
    };

    const clearConnectionHover = (): void => {
      hoveredConnectionHandle?.classList.remove(
        "connection-valid",
        "connection-invalid"
      );
      hoveredConnectionHandle = null;
    };

    const validConnectionTarget = (
      source: ActiveClickConnection,
      targetElement: HTMLElement
    ): boolean => {
      const targetNode = document.nodes.find(
        (node) => node.id === targetElement.dataset.nodeId
      );

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetElement.dataset.handleId
      );

      if (targetNode === undefined || targetHandle?.kind !== "target") {
        return false;
      }

      const candidate: FlowConnection = {
        source: source.source,
        sourceHandle: source.sourceHandle,
        target: targetNode.id,
        targetHandle: targetHandle.id,
      };

      if (findConnectionIssue(document, candidate) !== undefined) {
        return false;
      }

      try {
        return options.isValidConnection?.(candidate) ?? true;
      } catch {
        return false;
      }
    };

    const updatePointerConnectionPreview = (
      source: ActiveClickConnection,
      clientX: number,
      clientY: number
    ): void => {
      const target = connectionTargetAt(source, clientX, clientY);
      const valid = target !== null && validConnectionTarget(source, target);

      if (hoveredConnectionHandle !== target) {
        clearConnectionHover();
        hoveredConnectionHandle = target;
      }

      target?.classList.toggle("connection-valid", valid);
      target?.classList.toggle("connection-invalid", !valid);

      const canvasBounds = canvas.getBoundingClientRect();

      const position =
        target !== null && valid
          ? handleCenterInFlow(target)
          : screenToFlowPosition(
              { x: clientX - canvasBounds.left, y: clientY - canvasBounds.top },
              renderedViewport
            );

      connectionLine?.setAttribute("x2", String(position.x));
      connectionLine?.setAttribute("y2", String(position.y));
    };

    const removeConnectionPreview = (): void => {
      connectionPreview?.remove();
      connectionPreview = null;
      connectionLine = null;
    };

    const showConnectionPreview = (start: XYPosition): void => {
      const preview = globalThis.document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );

      preview.classList.add("flow-connection-preview");
      preview.dataset.testid = "flow-connection-preview";

      const line = globalThis.document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

      line.setAttribute("x1", String(start.x));
      line.setAttribute("y1", String(start.y));
      line.setAttribute("x2", String(start.x));
      line.setAttribute("y2", String(start.y));
      preview.append(line);
      viewport.append(preview);
      connectionPreview = preview;
      connectionLine = line;
    };

    const clearConnection = (): ActiveConnection | null => {
      if (activeConnection === null) {
        return null;
      }

      const connection = activeConnection;
      activeConnection = null;
      connectionPointer = null;
      connectionPointerStart = null;

      if (connectionFrame !== null) {
        globalThis.cancelAnimationFrame(connectionFrame);
        connectionFrame = null;
      }

      clearConnectionHover();
      removeConnectionPreview();
      runEffect(browser.releasePointer(canvas, connection.pointerId));

      return connection;
    };

    const cancelConnection = (reason: string): void => {
      const connection = clearConnection();

      if (connection === null) {
        return;
      }

      if (reason !== "no-target") {
        renderViewport(authoritativeViewport);
      }

      runTelemetry(
        Effect.logDebug("Cancelled connection gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: connection.source,
            [FlowAttribute.handleId]: connection.sourceHandle,
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.handleId]: connection.sourceHandle,
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      );
    };

    const clearClickConnection = (): ActiveClickConnection | null => {
      if (activeClickConnection === null) {
        return null;
      }

      const connection = activeClickConnection;
      activeClickConnection = null;
      removeConnectionPreview();

      const source = entries.get(connection.source);

      for (const handle of source?.element.querySelectorAll<HTMLElement>(
        ".flow-handle"
      ) ?? []) {
        if (handle.dataset.handleId === connection.sourceHandle) {
          handle.classList.remove("connecting");
        }
      }

      return connection;
    };

    const clickSourceElement = (
      connection: ActiveClickConnection
    ): HTMLElement | undefined =>
      [
        ...(entries
          .get(connection.source)
          ?.element.querySelectorAll<HTMLElement>(".flow-handle") ?? []),
      ].find((element) => element.dataset.handleId === connection.sourceHandle);

    const cancelClickConnection = (reason: string): void => {
      const connection = clearClickConnection();

      if (connection === null) {
        return;
      }

      if (reason !== "host-destroyed" && reason !== "window-blur") {
        announceConnection(
          reason === "source-removed"
            ? "Connection cancelled because its source was removed."
            : "Connection cancelled."
        );

        const source = clickSourceElement(connection);

        if (
          reason === "source-removed" ||
          source === undefined ||
          source === null
        ) {
          canvas.focus();
        } else {
          source.focus();
        }
      }

      runTelemetry(
        Effect.logDebug("Cancelled click connection").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: connection.source,
            [FlowAttribute.handleId]: connection.sourceHandle,
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: "click-connect",
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.handleId]: connection.sourceHandle,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: "click-connect",
            },
          })
        )
      );
    };

    const clearReconnection = (): ActiveEdgeReconnect | null => {
      if (activeReconnection === null) {
        return null;
      }

      const reconnect = activeReconnection;
      activeReconnection = null;
      removeConnectionPreview();
      runEffect(browser.releasePointer(canvas, reconnect.pointerId));

      return reconnect;
    };

    const cancelReconnection = (reason: string): void => {
      const reconnect = clearReconnection();

      if (reconnect === null) {
        return;
      }

      const attributes = {
        [FlowAttribute.edgeId]: reconnect.edgeId,
        [FlowAttribute.edgeEndpoint]: reconnect.endpoint,
        [FlowAttribute.cancellationReason]: reason,
      };

      runTelemetry(
        Effect.logDebug("Cancelled edge reconnection").pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.gestureCancel, { attributes })
        )
      );
    };

    const startReconnection = (
      anchor: SVGCircleElement,
      event: PointerEvent
    ): void => {
      const group = anchor.closest<SVGGElement>(".flow-edge-anchor-group");
      const { endpoint } = anchor.dataset;

      const edge = document.edges.find(
        (candidate) => candidate.id === group?.dataset.edgeId
      );

      if (
        event.button !== 0 ||
        edge?.selected !== true ||
        (endpoint !== "source" && endpoint !== "target") ||
        !canReconnectEdge(edge, endpoint) ||
        group === null ||
        activeReconnection !== null ||
        activeConnection !== null ||
        activeClickConnection !== null ||
        activeDrag !== null ||
        activeViewportPan !== null
      ) {
        return;
      }

      const fixedEndpoint: ReconnectEndpoint =
        endpoint === "source" ? "target" : "source";

      const fixedAnchor = group.querySelector<SVGCircleElement>(
        `.flow-edge-reconnect-anchor[data-endpoint="${fixedEndpoint}"]`
      );

      if (fixedAnchor === null) {
        return;
      }

      activeReconnection = {
        edgeId: edge.id,
        endpoint,
        pointerId: event.pointerId,
      };

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelReconnection("pointer-capture-failed");

        return;
      }

      showConnectionPreview({
        x: Number(fixedAnchor.getAttribute("cx")),
        y: Number(fixedAnchor.getAttribute("cy")),
      });
      event.preventDefault();
      event.stopPropagation();

      const attributes = {
        [FlowAttribute.edgeId]: edge.id,
        [FlowAttribute.edgeEndpoint]: endpoint,
      };

      runTelemetry(
        Effect.logDebug("Started edge reconnection").pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.edgeReconnectStart, { attributes })
        )
      );
    };

    const startConnection = (
      node: FlowNode,
      handle: FlowHandle,
      handleElement: HTMLElement,
      event: PointerEvent
    ): void => {
      if (
        event.button !== 0 ||
        handle.kind !== "source" ||
        activeConnection !== null ||
        activeClickConnection !== null ||
        activeReconnection !== null ||
        activeDrag !== null ||
        activeViewportPan !== null
      ) {
        return;
      }

      activeConnection = {
        pointerId: event.pointerId,
        source: node.id,
        sourceHandle: handle.id,
      };

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelConnection("pointer-capture-failed");

        return;
      }

      const start = handleCenterInFlow(handleElement);

      showConnectionPreview(start);
      connectionPointer = pointerInCanvas(event);
      connectionPointerStart = connectionPointer;
      event.preventDefault();
      event.stopPropagation();
      runTelemetry(
        Effect.logDebug("Started connection gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: node.id,
            [FlowAttribute.handleId]: handle.id,
          }),
          Effect.withSpan(FlowSpan.connectionStart, {
            attributes: {
              [FlowAttribute.nodeId]: node.id,
              [FlowAttribute.handleId]: handle.id,
            },
          })
        )
      );
    };

    const tickConnectionAutoPan = (): void => {
      connectionFrame = null;

      if (activeConnection === null || connectionPointer === null) {
        return;
      }

      const delta = selectionAutoPanDelta(
        connectionPointer,
        canvas.clientWidth,
        canvas.clientHeight
      );

      if (delta.x === 0 && delta.y === 0) {
        return;
      }

      const previous = renderedViewport;
      renderViewport(panViewport(renderedViewport, delta));

      if (
        renderedViewport.x === previous.x &&
        renderedViewport.y === previous.y
      ) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      updatePointerConnectionPreview(
        activeConnection,
        bounds.left + connectionPointer.x,
        bounds.top + connectionPointer.y
      );
      connectionFrame = globalThis.requestAnimationFrame(tickConnectionAutoPan);
    };

    const cancelActiveDrag = (reason: string): void => {
      if (activeDrag === null) {
        return;
      }

      const drag = activeDrag;
      const anchorId = dragAnchorId(drag);
      const entry = entries.get(anchorId);
      const node = findNode(anchorId);

      if (entry !== undefined) {
        entry.element.classList.remove("dragging");
        runEffect(browser.releasePointer(entry.element, drag.pointerId));

        if (node !== undefined) restoreAdoptedPosition(node);
      }

      activeDrag = null;
      dragPointerStart = null;
      dragActivated = false;

      const movedIds =
        "positions" in drag
          ? drag.positions.map(({ nodeId }) => nodeId)
          : [drag.nodeId];

      for (const nodeId of movedIds) {
          const authoritative = findNode(nodeId);

        if (authoritative !== undefined) restoreAdoptedPosition(authoritative);
      }

      renderGraphPositions();
      edgeRenderer.reconcile(document, renderedNodePositions);
      runTelemetry(
        Effect.logDebug("Cancelled node gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: anchorId,
            [FlowAttribute.pointerId]: drag.pointerId,
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.nodeId]: anchorId,
              [FlowAttribute.pointerId]: drag.pointerId,
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      );
    };

    const cancelViewportPan = (reason: string): void => {
      if (activeViewportPan === null) {
        return;
      }

      const pan = activeViewportPan;
      activeViewportPan = null;
      canvas.classList.remove("panning");
      runEffect(browser.releasePointer(canvas, pan.pointerId));
      renderViewport(authoritativeViewport);
      runTelemetry(
        Effect.logDebug("Cancelled viewport gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.pointerId]: pan.pointerId,
            [FlowAttribute.cancellationReason]: reason,
            [FlowAttribute.inputKind]: "pointer-pan",
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.pointerId]: pan.pointerId,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: "pointer-pan",
            },
          })
        )
      );
    };

    const cancelStaleReconnection = (
      next: FlowDocument,
      previous?: FlowDocument
    ): void => {
      if (activeReconnection === null) {
        return;
      }

      const { edgeId } = activeReconnection;
      const activeEdge = previous?.edges.find((edge) => edge.id === edgeId);
      const nextEdge = next.edges.find((edge) => edge.id === edgeId);

      if (nextEdge === undefined) {
        cancelReconnection("edge-removed");

        return;
      }

      if (
        nextEdge.selected !== true ||
        !canReconnectEdge(nextEdge, activeReconnection.endpoint) ||
        (activeEdge !== undefined &&
          (nextEdge.source !== activeEdge.source ||
            nextEdge.sourceHandle !== activeEdge.sourceHandle ||
            nextEdge.target !== activeEdge.target ||
            nextEdge.targetHandle !== activeEdge.targetHandle))
      ) {
        cancelReconnection("edge-changed");
      }
    };

    const operations = {
      // eslint-disable-next-line complexity -- Reconciliation owns DOM, measurement, and focus lifecycle.
      reconcile(
        next: FlowDocument,
        previous?: FlowDocument,
        quiet = false
      ): void {
        const nextIds = new Set(next.nodes.map((node) => node.id));

        for (const node of next.nodes) {
          if (!isDraggingNode(node.id)) {
            restoreAdoptedPosition(node);
          }
        }

        const visibleNodes = new Set<NodeId>();
        let visibleEdges: Set<(typeof next.edges)[number]["id"]> | null = null;
        let graph = createFlowGraph(next, measurements, renderedNodePositions);

        if (options.renderOnlyVisible === true) {
          const rect = viewportFlowRect(
            renderedViewport,
            canvas.clientWidth,
            canvas.clientHeight
          );

          visibleEdges = new Set(
            next.edges
              .filter((edge) =>
                edgeIntersectsViewport(graph, edge, rect)
              )
              .map((edge) => edge.id)
          );

          for (const node of next.nodes) {
            const graphNode = graph.nodes.get(node.id);
            if (graphNode === undefined || graphNode.hidden) {
              continue;
            }

            if (
              !measurements.has(node.id) ||
              nodeIntersectsViewport(graph, node.id, rect) ||
              next.edges.some(
                (edge) =>
                  visibleEdges?.has(edge.id) &&
                  (edge.source === node.id || edge.target === node.id)
              )
            ) {
              visibleNodes.add(node.id);
            }
          }
        } else {
          for (const node of next.nodes) {
            if (graph.nodes.get(node.id)?.hidden === false) {
              visibleNodes.add(node.id);
            }
          }
        }

        edgeRenderer.setVisibleEdges(visibleEdges);

        const previousNodes = new Map(
          previous?.nodes.map((node) => [node.id, node])
        );

        let added = 0;
        let updated = 0;
        let removed = 0;

        if (activeDrag !== null) {
          const participantIds =
            "positions" in activeDrag
              ? activeDrag.positions.map(({ nodeId }) => nodeId)
              : [activeDrag.nodeId];

          if (participantIds.some((nodeId) => !visibleNodes.has(nodeId))) {
            cancelActiveDrag("node-removed");
            graph = createFlowGraph(next, measurements, renderedNodePositions);
          }
        }

        if (activeConnection !== null) {
          const source = next.nodes.find(
            (node) => node.id === activeConnection?.source
          );

          const sourceStillExists = source?.handles?.some(
            (handle) =>
              handle.id === activeConnection?.sourceHandle &&
              handle.kind === "source"
          );

          if (!sourceStillExists || source?.hidden === true) {
            cancelConnection("source-removed");
          }
        }

        if (activeClickConnection !== null) {
          const source = next.nodes.find(
            (node) => node.id === activeClickConnection?.source
          );

          const handleExists = source?.handles?.some(
            (handle) =>
              handle.id === activeClickConnection?.sourceHandle &&
              handle.kind === "source"
          );

          if (!handleExists || source?.hidden === true) {
            cancelClickConnection("source-removed");
          }
        }

        cancelStaleReconnection(next, previous);

        const focusedElement = globalThis.document.activeElement;

        const focusedNode =
          focusedElement instanceof HTMLElement
            ? focusedElement.closest<HTMLElement>(".flow-node")
            : null;

        for (const [nodeId, entry] of entries) {
          if (nextIds.has(nodeId) && visibleNodes.has(nodeId)) {
            continue;
          }

          resizeObserver.unobserve(entry.element);
          entry.release();
          entry.element.remove();
          entries.delete(nodeId);

          const nextNode = next.nodes.find((node) => node.id === nodeId);

          if (nextNode === undefined || nextNode.hidden === true) {
            edgeRenderer.forgetNode(nodeId);
            renderedNodePositions.delete(nodeId);
            measurements.delete(nodeId);
          }

          removed += 1;
        }

        for (const graphNode of graph.orderedNodes) {
          const node = graphNode.node;
          if (!visibleNodes.has(node.id)) {
            continue;
          }

          let entry = entries.get(node.id);

          if (entry === undefined) {
            entry = operations.makeNodeEntry(node);
            entries.set(node.id, entry);
            added += 1;
          } else if (!sameNode(previousNodes.get(node.id), node)) {
            const previousNode = previousNodes.get(node.id);
            const nextRenderer = options.nodeRenderers?.[node.type ?? "default"];
            const nextRendererType = nextRenderer === undefined ? undefined : node.type ?? "default";

            if (entry.rendererType !== nextRendererType) {
              entry.renderer?.destroy();
              entry.content.replaceChildren();
              entry.renderer = nextRenderer?.(node, entry.content);
              entry.rendererType = nextRendererType;
              if (nextRenderer === undefined) renderDefaultNodeContents(entry.content, node);
            } else if (entry.renderer !== undefined) {
              entry.renderer.update(node);
            } else if (previousNode?.label !== node.label) {
              renderDefaultNodeContents(entry.content, node);
            }

            if (JSON.stringify(previousNode?.handles ?? []) !== JSON.stringify(node.handles ?? [])) {
              renderNodeHandles(entry.handles, node);
            }
            applyDeclaredNodeSize(entry.element, node);

            updated += 1;
          }

          applyNodePosition(entry.element, graphNode.absolutePosition);

          applyNodeInteractionState(entry.element, node);
          viewport.append(entry.element);

          if (entry.element.dataset.measuredWidth !== undefined) {
            edgeRenderer.measureNode(
              node,
              entry.element,
              renderedViewport.zoom
            );
          }
        }

        const focusedEdge =
          globalThis.document.activeElement?.closest<SVGGElement>(
            ".flow-edge-group"
          ) ?? null;

        const focusedEdgeRemoved =
          focusedEdge !== null &&
          !next.edges.some((edge) => edge.id === focusedEdge?.dataset.edgeId);

        const edgeStats = edgeRenderer.reconcile(next, renderedNodePositions);

        if (focusedEdgeRemoved) {
          canvas.focus();
        } else if (focusedNode !== null) {
          const focusedNodeRecord = next.nodes.find(
            (node) => node.id === focusedNode.dataset.nodeId
          );

          const focusedEntry =
            focusedNodeRecord === undefined
              ? undefined
              : entries.get(focusedNodeRecord.id);

          if (focusedEntry === undefined) {
            canvas.focus();
          } else if (
            focusedElement instanceof HTMLElement &&
            focusedElement.isConnected
          ) {
            focusedElement.focus();
          } else {
            focusedEntry.element.focus();
          }
        }

        const attributes = {
          [FlowAttribute.nodesAdded]: added,
          [FlowAttribute.nodesUpdated]: updated,
          [FlowAttribute.nodesRemoved]: removed,
          [FlowAttribute.edgesAdded]: edgeStats.added,
          [FlowAttribute.edgesUpdated]: edgeStats.updated,
          [FlowAttribute.edgesRemoved]: edgeStats.removed,
          [FlowAttribute.edgesDeferred]: edgeStats.deferred,
        };

        if (!quiet) {
          runTelemetry(
            Effect.logDebug("Reconciled flow nodes").pipe(
              Effect.annotateLogs(attributes),
              Effect.withSpan(FlowSpan.domReconcile, { attributes })
            )
          );
        }
        updateToolbarAnchors(next);
      },

      // eslint-disable-next-line complexity -- The change union has one branch per public operation.
      publishChange(change: FlowChange): void {
        let publishedChange = change;

        switch (change.kind) {
          case "node-position": {
            const updated = applyNodePositionChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              const previous = document;
              document = updated;
              operations.reconcile(document, previous);
            } else {
              const authoritative = findNode(change.nodeId);

              if (authoritative !== undefined) restoreAdoptedPosition(authoritative);

              renderGraphPositions();
              edgeRenderer.reconcile(document, renderedNodePositions);
            }

            break;
          }

          case "node-positions": {
            const updated = applyNodePositionsChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              const previous = document;
              document = updated;
              operations.reconcile(document, previous);
            } else {
              for (const { nodeId } of change.positions) {
                const authoritative = findNode(nodeId);

                if (authoritative !== undefined) restoreAdoptedPosition(authoritative);
              }

              renderGraphPositions();
              edgeRenderer.reconcile(document, renderedNodePositions);
            }

            break;
          }

          case "viewport": {
            const candidate = constrainViewport(change.viewport);

            if (viewportMode === "uncontrolled") {
              authoritativeViewport = candidate;
            }

            renderViewport(authoritativeViewport);
            publishedChange = { kind: "viewport", viewport: candidate };
            break;
          }

          case "edge-add": {
            if (documentMode === "uncontrolled") {
              document = {
                ...document,
                edges: [...document.edges, change.edge],
              };
              edgeRenderer.reconcile(document, renderedNodePositions);
            }

            break;
          }

          case "edge-selection": {
            const updated = applyEdgeSelectionChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              document = updated;
              edgeRenderer.reconcile(document, renderedNodePositions);
            }

            const attributes = {
              [FlowAttribute.edgeId]: change.edgeId,
              [FlowAttribute.edgeSelected]: change.selected,
              [FlowAttribute.controlMode]: documentMode,
            };

            runTelemetry(
              Effect.logDebug("Changed edge selection").pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.edgeSelection, { attributes })
              )
            );

            break;
          }

          case "node-selection": {
            const updated = applyNodeSelectionChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              const previous = document;
              document = updated;
              operations.reconcile(document, previous);
            }

            const attributes = {
              [FlowAttribute.nodeId]: change.nodeId,
              [FlowAttribute.nodeSelected]: change.selected,
              [FlowAttribute.controlMode]: documentMode,
            };

            runTelemetry(
              Effect.logDebug("Changed node selection").pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.nodeSelection, { attributes })
              )
            );

            break;
          }

          case "selection-set": {
            const updated = applySelectionSetChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              const previous = document;
              document = updated;
              operations.reconcile(document, previous);
            }

            const attributes = {
              [FlowAttribute.nodeCount]: change.nodeIds.length,
              [FlowAttribute.edgeCount]: change.edgeIds.length,
              [FlowAttribute.controlMode]: documentMode,
            };

            runTelemetry(
              Effect.logDebug("Changed flow selection").pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.selectionSet, { attributes })
              )
            );

            break;
          }

          case "edge-reconnect": {
            const updated = applyEdgeReconnectChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              document = updated;
              edgeRenderer.reconcile(document, renderedNodePositions);
            }

            break;
          }

          case "edge-remove": {
            const updated = applyEdgeRemoveChange(document, change);

            if (updated === undefined) {
              return;
            }

            if (documentMode === "uncontrolled") {
              document = updated;
              edgeRenderer.reconcile(document, renderedNodePositions);
              canvas.focus();
            }

            const attributes = {
              [FlowAttribute.edgeId]: change.edgeId,
              [FlowAttribute.controlMode]: documentMode,
            };

            runTelemetry(
              Effect.logDebug("Removed edge").pipe(
                Effect.annotateLogs(attributes),
                Effect.withSpan(FlowSpan.edgeRemove, { attributes })
              )
            );

            break;
          }

          default: {
            const exhaustive: never = change;
            void exhaustive;
          }
        }

        for (const listener of listeners) {
          listener(publishedChange);
        }
      },

      toggleNodeSelection(node: FlowNode): void {
        operations.publishChange({
          kind: "selection-set",
          nodeIds: [
            ...document.nodes
              .filter(
                (candidate) =>
                  candidate.selected === true && candidate.id !== node.id
              )
              .map((candidate) => candidate.id),
            ...(node.selected === true ? [] : [node.id]),
          ],
          edgeIds: document.edges
            .filter((edge) => edge.selected === true)
            .map((edge) => edge.id),
        });
      },

      toggleEdgeSelection(edge: FlowEdge): void {
        operations.publishChange({
          kind: "selection-set",
          nodeIds: document.nodes
            .filter((node) => node.selected === true)
            .map((node) => node.id),
          edgeIds: [
            ...document.edges
              .filter(
                (candidate) =>
                  candidate.selected === true && candidate.id !== edge.id
              )
              .map((candidate) => candidate.id),
            ...(edge.selected === true ? [] : [edge.id]),
          ],
        });
      },

      makeNodeEntry(node: FlowNode): NodeEntry {
        const element = globalThis.document.createElement("article");
        const content = globalThis.document.createElement("div");
        content.className = "flow-node-content";
        const handles = globalThis.document.createElement("div");
        handles.className = "flow-node-handles";
        element.className = "flow-node";
        element.dataset.nodeId = node.id;
        element.dataset.testid = "flow-node";
        element.append(content, handles);
        const renderer = options.nodeRenderers?.[node.type ?? "default"];
        const rendererType = renderer === undefined ? undefined : node.type ?? "default";
        const rendererInstance = renderer?.(node, content);
        if (renderer === undefined) renderDefaultNodeContents(content, node);
        renderNodeHandles(handles, node);
        applyDeclaredNodeSize(element, node);
        applyNodePosition(element, absolutePosition(node.id));

        const activateNodeDrag = (event: PointerEvent): boolean => {
          if (activeDrag === null || dragPointerStart === null) {
            return false;
          }

          if (dragActivated) {
            return true;
          }

          const position = pointerInCanvas(event);

          const distance = Math.hypot(
            position.x - dragPointerStart.x,
            position.y - dragPointerStart.y
          );

          const threshold = options.nodeDragThreshold ?? 1;

          if (threshold > 0 && distance <= threshold) {
            return false;
          }

          dragActivated = true;
          element.classList.add("dragging");
          runTelemetry(
            Effect.logDebug("Started node drag").pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.pointerId]: event.pointerId,
              }),
              Effect.withSpan(FlowSpan.nodeDragStart, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                },
              })
            )
          );

          return true;
        };

        const onPointerDown = (event: PointerEvent): void => {
          const handleElement =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLElement>(".flow-handle")
              : null;

          if (handleElement !== null) {
            const current = findNode(node.id);

            const handle = current?.handles?.find(
              (item) => item.id === handleElement.dataset.handleId
            );

            if (current !== undefined && handle !== undefined) {
              startConnection(current, handle, handleElement, event);
            }

            return;
          }

          if (
            event.button !== 0 ||
            activeDrag !== null ||
            activeReconnection !== null
          ) {
            return;
          }

          const current = findNode(node.id);

          if (current === undefined) {
            return;
          }

          const selectedNodes =
            current.selected === true
              ? selectedMovableNodes()
              : [];
          const draggingSelectedAncestor = selectedNodes.some(
            (candidate) => candidate.id !== current.id
          );

          activeDrag =
            selectedNodes.length > 1 || draggingSelectedAncestor
              ? {
                  anchorNodeId: current.id,
                  pointerId: event.pointerId,
                  pointerStart: pointerInFlow(event),
                  positions: selectedNodes.map((candidate) => ({
                    nodeId: candidate.id,
                    position: adoptedPosition(candidate),
                  })),
                }
              : beginNodeDrag(
                  node.id,
                  absolutePosition(current.id),
                  pointerInFlow(event),
                  event.pointerId
                );
          dragPointerStart = pointerInCanvas(event);
          dragActivated = false;

          if (!runEffect(browser.capturePointer(element, event.pointerId))) {
            cancelActiveDrag("pointer-capture-failed");

            return;
          }

          event.preventDefault();

          if (options.nodeDragThreshold === 0) {
            activateNodeDrag(event);
          }
        };

        const onPointerMove = (event: PointerEvent): void => {
          if (
            activeDrag?.pointerId !== event.pointerId ||
            dragAnchorId(activeDrag) !== node.id
          ) {
            return;
          }

          if (!activateNodeDrag(event)) {
            return;
          }

          if ("positions" in activeDrag) {
            const change = boundedGroupChange(
              activeDrag,
              moveNodeGroupDrag(
                activeDrag,
                pointerInFlow(event),
                options.snapGrid
              )
            );

            for (const { nodeId, position } of change.positions) {
              renderedNodePositions.set(nodeId, position);
            }
            renderGraphPositions();
          } else {
            const absolute = moveNodeDrag(
              activeDrag,
              pointerInFlow(event),
              options.snapGrid
            );
            const position = boundedNodePosition(
              node.id,
              localPositionFromAbsolute(node.id, absolute)
            );

            renderedNodePositions.set(node.id, position);
            renderGraphPositions();
          }

          edgeRenderer.reconcile(document, renderedNodePositions);
        };

        const finishDrag = (event: PointerEvent): void => {
          if (
            activeDrag?.pointerId !== event.pointerId ||
            dragAnchorId(activeDrag) !== node.id
          ) {
            return;
          }

          const wasActivated = activateNodeDrag(event);

          const candidate =
            "positions" in activeDrag
              ? moveNodeGroupDrag(
                  activeDrag,
                  pointerInFlow(event),
                  options.snapGrid
                )
              : completeNodeDrag(
                  activeDrag,
                  pointerInFlow(event),
                  options.snapGrid
                );

          let change: NodePositionChange | NodePositionsChange = candidate;

          if (
            candidate.kind === "node-positions" &&
            "positions" in activeDrag
          ) {
            change = boundedGroupChange(activeDrag, candidate);
          } else if (candidate.kind === "node-position") {
            change = {
              ...candidate,
              position: boundedNodePosition(
                candidate.nodeId,
                localPositionFromAbsolute(candidate.nodeId, candidate.position)
              ),
            };
          }

          activeDrag = null;
          dragPointerStart = null;
          dragActivated = false;

          const changedPositions =
            change.kind === "node-position"
              ? [{ nodeId: change.nodeId, position: change.position }]
              : change.positions;

          for (const { nodeId } of changedPositions) {
            const authoritative = findNode(nodeId);

            if (authoritative !== undefined) {
              restoreAdoptedPosition(authoritative);
            }
          }

          element.classList.remove("dragging");
          runEffect(browser.releasePointer(element, event.pointerId));
          suppressCanvasClick = true;
          globalThis.setTimeout(() => {
            suppressCanvasClick = false;
          }, 0);

          const current = findNode(node.id);

          if (current !== undefined && !wasActivated) {
            if (current.focusable !== false) {
              element.focus();
            }

            if (
              current.selectable !== false &&
              (event.metaKey || event.ctrlKey)
            ) {
              operations.toggleNodeSelection(current);
            } else if (
              current.selectable !== false &&
              current.selected !== true
            ) {
              operations.publishChange({
                kind: "node-selection",
                nodeId: current.id,
                selected: true,
              });
            }

            return;
          }

          if (!wasActivated) {
            return;
          }

          operations.publishChange(change);
          runTelemetry(
            Effect.logDebug("Completed node drag").pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: node.id,
                [FlowAttribute.nodeCount]: changedPositions.length,
              }),
              Effect.withSpan(FlowSpan.nodeDragComplete, {
                attributes: {
                  [FlowAttribute.nodeId]: node.id,
                  [FlowAttribute.pointerId]: event.pointerId,
                  [FlowAttribute.nodeCount]: changedPositions.length,
                },
              })
            )
          );
        };

        const onPointerCancel = (event: PointerEvent): void => {
          if (
            activeDrag?.pointerId === event.pointerId &&
            dragAnchorId(activeDrag) === node.id
          ) {
            cancelActiveDrag("pointer-cancel");
          }
        };

        const nodeScope = runEffect(Scope.make("sequential"));
        runEffect(
          Scope.addFinalizer(hostScope, Scope.close(nodeScope, Exit.void))
        );
        runEffect(
          Scope.provide(
            browser.listen(element, "pointerdown", onPointerDown),
            nodeScope
          )
        );
        runEffect(
          Scope.provide(
            browser.listen(element, "pointermove", onPointerMove),
            nodeScope
          )
        );
        runEffect(
          Scope.provide(
            browser.listen(element, "pointerup", finishDrag),
            nodeScope
          )
        );
        runEffect(
          Scope.provide(
            browser.listen(element, "pointercancel", onPointerCancel),
            nodeScope
          )
        );
        resizeObserver.observe(element);

        let released = false;
        let nodeEntry: NodeEntry;
        nodeEntry = {
          element,
          content,
          handles,
          rendererType,
          renderer: rendererInstance,
          release: () => {
            if (released) {
              return;
            }
            released = true;
            nodeEntry.renderer?.destroy();
            runEffect(Scope.close(nodeScope, Exit.void));
          },
        };
        return nodeEntry;
      },
    };

    reconcileVisible = () => operations.reconcile(document, document, true);

    const clearSelectionRect = (): void => {
      if (selectionFrame !== null) {
        globalThis.cancelAnimationFrame(selectionFrame);
        selectionFrame = null;
      }

      if (activeSelectionRect !== null) {
        runEffect(
          browser.releasePointer(canvas, activeSelectionRect.pointerId)
        );
      }

      activeSelectionRect = null;
      selectionPointer = null;
      selectionOverlay?.remove();
      selectionOverlay = null;
    };

    const updateSelectionRect = (position: XYPosition): void => {
      if (activeSelectionRect === null || selectionOverlay === null) {
        return;
      }

      selectionPointer = position;

      const start = flowToScreenPosition(
        activeSelectionRect.flowStart,
        renderedViewport
      );

      selectionOverlay.style.left = `${Math.min(start.x, position.x)}px`;
      selectionOverlay.style.top = `${Math.min(start.y, position.y)}px`;
      selectionOverlay.style.width = `${Math.abs(start.x - position.x)}px`;
      selectionOverlay.style.height = `${Math.abs(start.y - position.y)}px`;
    };

    const tickSelectionAutoPan = (): void => {
      selectionFrame = null;

      if (activeSelectionRect === null || selectionPointer === null) {
        return;
      }

      const delta = selectionAutoPanDelta(
        selectionPointer,
        canvas.clientWidth,
        canvas.clientHeight
      );

      if (delta.x === 0 && delta.y === 0) {
        return;
      }

      renderViewport(panViewport(renderedViewport, delta));
      updateSelectionRect(selectionPointer);
      selectionFrame = globalThis.requestAnimationFrame(tickSelectionAutoPan);
    };

    const finishSelectionRect = (event: PointerEvent): void => {
      if (activeSelectionRect?.pointerId !== event.pointerId) {
        return;
      }

      const { flowStart } = activeSelectionRect;
      const start = activeSelectionRect.pointerStart;
      const end = pointerInCanvas(event);

      const panned =
        renderedViewport.x !== authoritativeViewport.x ||
        renderedViewport.y !== authoritativeViewport.y;

      clearSelectionRect();

      if (Math.hypot(end.x - start.x, end.y - start.y) < 2) {
        if (panned) {
          operations.publishChange({
            kind: "viewport",
            viewport: renderedViewport,
          });
        }

        return;
      }

      suppressCanvasClick = true;
      globalThis.setTimeout(() => {
        suppressCanvasClick = false;
      }, 0);

      const flowEnd = screenToFlowPosition(end, renderedViewport);

      const graph = createFlowGraph(document, measurements, renderedNodePositions);
      const change = selectionInRect(
        graph,
        {
          x: Math.min(flowStart.x, flowEnd.x),
          y: Math.min(flowStart.y, flowEnd.y),
          width: Math.abs(flowStart.x - flowEnd.x),
          height: Math.abs(flowStart.y - flowEnd.y),
        },
        options.selectionMode ?? "full"
      );

      operations.publishChange(change);

      if (panned) {
        operations.publishChange({
          kind: "viewport",
          viewport: renderedViewport,
        });
      }
    };

    const startPinch = (event: PointerEvent): boolean => {
      if (
        !(
          event.pointerType === "touch" &&
          activeViewportPan !== null &&
          activePinch === null &&
          event.pointerId !== activeViewportPan.pointerId
        )
      ) {
        return false;
      }

      const first = touchPointers.get(activeViewportPan.pointerId);

      if (
        first !== undefined &&
        runEffect(browser.capturePointer(canvas, event.pointerId))
      ) {
        const second = pointerInCanvas(event);
        activePinch = {
          firstPointerId: activeViewportPan.pointerId,
          secondPointerId: event.pointerId,
          firstStart: first,
          secondStart: second,
          viewportStart: renderedViewport,
        };
        touchPointers.set(event.pointerId, second);
        activeViewportPan = null;
        canvas.classList.remove("panning");
        event.preventDefault();
        runTelemetry(
          Effect.logDebug("Started pinch gesture").pipe(
            Effect.annotateLogs(FlowAttribute.inputKind, "touch-pinch"),
            Effect.withSpan(FlowSpan.viewportPanStart, {
              attributes: { [FlowAttribute.inputKind]: "touch-pinch" },
            })
          )
        );
      }

      return true;
    };

    const onCanvasPointerDown = (event: PointerEvent): void => {
      const { target } = event;

      if (startPinch(event)) {
        return;
      }

      const reconnectAnchor =
        target instanceof Element
          ? target.closest<SVGCircleElement>(".flow-edge-reconnect-anchor")
          : null;

      if (reconnectAnchor !== null) {
        startReconnection(reconnectAnchor, event);

        return;
      }

      if (
        event.button !== 0 ||
        activeDrag !== null ||
        activeConnection !== null ||
        activeClickConnection !== null ||
        activeReconnection !== null ||
        activeViewportPan !== null ||
        activePinch !== null ||
        activeSelectionRect !== null ||
        (target instanceof Element &&
          (target.closest(".flow-node") !== null ||
            target.closest(".flow-edge-group") !== null))
      ) {
        return;
      }

      if (event.shiftKey) {
        const pointerStart = pointerInCanvas(event);

        if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
          return;
        }

        activeSelectionRect = {
          pointerId: event.pointerId,
          pointerStart,
          flowStart: screenToFlowPosition(pointerStart, renderedViewport),
        };
        selectionOverlay = globalThis.document.createElement("div");
        selectionOverlay.className = "flow-selection-rect";
        selectionOverlay.dataset.testid = "flow-selection-rect";
        canvas.append(selectionOverlay);
        updateSelectionRect(pointerStart);
        event.preventDefault();

        runTelemetry(
          Effect.logDebug("Started selection rectangle").pipe(
            Effect.annotateLogs(FlowAttribute.pointerId, event.pointerId),
            Effect.withSpan(FlowSpan.selectionRectStart, {
              attributes: { [FlowAttribute.pointerId]: event.pointerId },
            })
          )
        );

        return;
      }

      activeViewportPan = beginViewportPan(
        renderedViewport,
        pointerInCanvas(event),
        event.pointerId
      );

      if (!runEffect(browser.capturePointer(canvas, event.pointerId))) {
        cancelViewportPan("pointer-capture-failed");

        return;
      }

      if (event.pointerType === "touch") {
        touchPointers.set(event.pointerId, pointerInCanvas(event));
      }

      canvas.classList.add("panning");
      event.preventDefault();
      runTelemetry(
        Effect.logDebug("Started viewport pan").pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.pointerId]: event.pointerId,
            [FlowAttribute.inputKind]: "pointer-pan",
          }),
          Effect.withSpan(FlowSpan.viewportPanStart, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.pointerId]: event.pointerId,
              [FlowAttribute.inputKind]: "pointer-pan",
            },
          })
        )
      );
    };

    const moveConnectionPreview = (event: PointerEvent): boolean => {
      if (
        activeConnection?.pointerId === event.pointerId ||
        activeReconnection?.pointerId === event.pointerId
      ) {
        if (activeConnection?.pointerId === event.pointerId) {
          connectionPointer = pointerInCanvas(event);

          if (options.autoPanOnConnect !== false && connectionFrame === null) {
            connectionFrame = globalThis.requestAnimationFrame(
              tickConnectionAutoPan
            );
          }
        }

        if (activeConnection?.pointerId === event.pointerId) {
          updatePointerConnectionPreview(
            activeConnection,
            event.clientX,
            event.clientY
          );
        } else {
          const position = pointerInFlow(event);
          connectionLine?.setAttribute("x2", String(position.x));
          connectionLine?.setAttribute("y2", String(position.y));
        }

        return true;
      }

      if (activeClickConnection !== null) {
        const position = pointerInFlow(event);
        connectionLine?.setAttribute("x2", String(position.x));
        connectionLine?.setAttribute("y2", String(position.y));

        return true;
      }

      return false;
    };

    const onCanvasPointerMove = (event: PointerEvent): void => {
      if (activePinch !== null && touchPointers.has(event.pointerId)) {
        touchPointers.set(event.pointerId, pointerInCanvas(event));
        const first = touchPointers.get(activePinch.firstPointerId);
        const second = touchPointers.get(activePinch.secondPointerId);

        if (first !== undefined && second !== undefined) {
          renderViewport(movePinch(activePinch, first, second, viewportLimits));
        }

        return;
      }

      if (activeSelectionRect?.pointerId === event.pointerId) {
        updateSelectionRect(pointerInCanvas(event));

        if (selectionFrame === null) {
          selectionFrame =
            globalThis.requestAnimationFrame(tickSelectionAutoPan);
        }

        return;
      }

      if (moveConnectionPreview(event)) {
        return;
      }

      if (activeViewportPan?.pointerId !== event.pointerId) {
        return;
      }

      if (event.pointerType === "touch") {
        touchPointers.set(event.pointerId, pointerInCanvas(event));
      }

      renderViewport(
        moveViewportPan(activeViewportPan, pointerInCanvas(event))
      );
    };

    const finishViewportPan = (event: PointerEvent): void => {
      if (activeViewportPan?.pointerId !== event.pointerId) {
        return;
      }

      const change: FlowChange = {
        kind: "viewport",
        viewport: moveViewportPan(activeViewportPan, pointerInCanvas(event)),
      };

      activeViewportPan = null;
      touchPointers.delete(event.pointerId);
      canvas.classList.remove("panning");
      runEffect(browser.releasePointer(canvas, event.pointerId));
      operations.publishChange(change);
      runTelemetry(
        Effect.logDebug("Completed viewport pan").pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.viewportX]: change.viewport.x,
            [FlowAttribute.viewportY]: change.viewport.y,
            [FlowAttribute.viewportZoom]: change.viewport.zoom,
          }),
          Effect.withSpan(FlowSpan.viewportPanComplete, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.pointerId]: event.pointerId,
              [FlowAttribute.viewportX]: change.viewport.x,
              [FlowAttribute.viewportY]: change.viewport.y,
              [FlowAttribute.viewportZoom]: change.viewport.zoom,
            },
          })
        )
      );
    };

    const cancelPinch = (reason: string): void => {
      if (activePinch === null) {
        return;
      }

      const pinch = activePinch;
      activePinch = null;
      touchPointers.clear();
      runEffect(browser.releasePointer(canvas, pinch.firstPointerId));
      runEffect(browser.releasePointer(canvas, pinch.secondPointerId));
      renderViewport(authoritativeViewport);
      runTelemetry(
        Effect.logDebug("Cancelled pinch gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: "touch-pinch",
            [FlowAttribute.cancellationReason]: reason,
          }),
          Effect.withSpan(FlowSpan.gestureCancel, {
            attributes: {
              [FlowAttribute.inputKind]: "touch-pinch",
              [FlowAttribute.cancellationReason]: reason,
            },
          })
        )
      );
    };

    const cancelActiveGestures = (
      reason: string,
      pointerId?: number
    ): boolean => {
      const hasActiveGesture =
        (activeDrag !== null &&
          (pointerId === undefined || activeDrag.pointerId === pointerId)) ||
        (activeConnection !== null &&
          (pointerId === undefined ||
            activeConnection.pointerId === pointerId)) ||
        (activeReconnection !== null &&
          (pointerId === undefined ||
            activeReconnection.pointerId === pointerId)) ||
        (activeViewportPan !== null &&
          (pointerId === undefined ||
            activeViewportPan.pointerId === pointerId)) ||
        (activePinch !== null &&
          (pointerId === undefined ||
            activePinch.firstPointerId === pointerId ||
            activePinch.secondPointerId === pointerId)) ||
        (activeSelectionRect !== null &&
          (pointerId === undefined ||
            activeSelectionRect.pointerId === pointerId)) ||
        (pointerId === undefined && activeClickConnection !== null);

      if (!hasActiveGesture) {
        return false;
      }

      if (
        activeDrag !== null &&
        (pointerId === undefined || activeDrag.pointerId === pointerId)
      ) {
        cancelActiveDrag(reason);
      }
      if (
        activeConnection !== null &&
        (pointerId === undefined || activeConnection.pointerId === pointerId)
      ) {
        cancelConnection(reason);
      }
      if (
        activeReconnection !== null &&
        (pointerId === undefined || activeReconnection.pointerId === pointerId)
      ) {
        cancelReconnection(reason);
      }
      if (
        activeViewportPan !== null &&
        (pointerId === undefined || activeViewportPan.pointerId === pointerId)
      ) {
        cancelViewportPan(reason);
      }
      if (
        activePinch !== null &&
        (pointerId === undefined ||
          activePinch.firstPointerId === pointerId ||
          activePinch.secondPointerId === pointerId)
      ) {
        cancelPinch(reason);
      }
      if (
        activeSelectionRect !== null &&
        (pointerId === undefined || activeSelectionRect.pointerId === pointerId)
      ) {
        const selection = activeSelectionRect;
        clearSelectionRect();
        runTelemetry(
          Effect.logDebug("Cancelled selection rectangle gesture").pipe(
            Effect.annotateLogs({
              [FlowAttribute.pointerId]: selection.pointerId,
              [FlowAttribute.cancellationReason]: reason,
              [FlowAttribute.inputKind]: "selection-rectangle",
            }),
            Effect.withSpan(FlowSpan.gestureCancel, {
              attributes: {
                [FlowAttribute.pointerId]: selection.pointerId,
                [FlowAttribute.cancellationReason]: reason,
                [FlowAttribute.inputKind]: "selection-rectangle",
              },
            })
          )
        );
      }
      if (pointerId === undefined) {
        cancelClickConnection(reason);
        touchPointers.clear();
      } else {
        touchPointers.delete(pointerId);
      }

      return true;
    };

    const onWindowBlur = (): void => {
      cancelActiveGestures("window-blur");
    };

    const onLostPointerCapture = (event: PointerEvent): void => {
      cancelActiveGestures("lost-pointer-capture", event.pointerId);
    };

    const onCanvasPointerCancel = (event: PointerEvent): void => {
      cancelActiveGestures("pointer-cancel", event.pointerId);
    };

    const finishPinch = (event: PointerEvent): void => {
      if (
        activePinch === null ||
        (event.pointerId !== activePinch.firstPointerId &&
          event.pointerId !== activePinch.secondPointerId)
      ) {
        return;
      }

      const pinch = activePinch;
      activePinch = null;
      touchPointers.clear();
      runEffect(browser.releasePointer(canvas, pinch.firstPointerId));
      runEffect(browser.releasePointer(canvas, pinch.secondPointerId));
      suppressCanvasClick = true;
      globalThis.setTimeout(() => {
        suppressCanvasClick = false;
      }, 0);
      operations.publishChange({
        kind: "viewport",
        viewport: renderedViewport,
      });
      runTelemetry(
        Effect.logDebug("Completed pinch gesture").pipe(
          Effect.annotateLogs({
            [FlowAttribute.inputKind]: "touch-pinch",
            [FlowAttribute.viewportZoom]: renderedViewport.zoom,
          }),
          Effect.withSpan(FlowSpan.viewportPanComplete, {
            attributes: {
              [FlowAttribute.inputKind]: "touch-pinch",
              [FlowAttribute.viewportZoom]: renderedViewport.zoom,
            },
          })
        )
      );
    };

    const acceptsCustomConnection = (
      connection: FlowConnectionCandidate
    ): boolean => {
      if (options.isValidConnection === undefined) {
        return true;
      }

      let accepted = false;

      try {
        accepted = options.isValidConnection(connection);
      } catch {
        runTelemetry(
          Effect.logWarning("Connection validator failed").pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.cancellationReason]: "validator-threw",
            }),
            Effect.withSpan(FlowSpan.connectionValidate)
          )
        );

        return false;
      }

      if (!accepted) {
        runTelemetry(
          Effect.logDebug("Connection rejected by validator").pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeId]: connection.source,
              [FlowAttribute.cancellationReason]: "custom-validator",
            }),
            Effect.withSpan(FlowSpan.connectionValidate)
          )
        );
      }

      return accepted;
    };

    const commitConnection = (
      started: ActiveClickConnection,
      targetNode: FlowNode,
      targetHandle: FlowHandle,
      inputKind: "pointer-connect" | "click-connect"
    ): void => {
      const candidate: FlowConnection = {
        source: started.source,
        sourceHandle: started.sourceHandle,
        target: targetNode.id,
        targetHandle: targetHandle.id,
      };

      const result = runEffect(
        Effect.result(validateFlowConnection(document, candidate))
      );

      if (
        Result.isFailure(result) ||
        !acceptsCustomConnection(result.success)
      ) {
        if (inputKind === "click-connect") {
          announceConnection("Connection rejected.");
        }

        return;
      }

      const edge = nextConnectionEdge(document, result.success);
      operations.publishChange({ kind: "edge-add", edge });

      if (inputKind === "click-connect") {
        announceConnection("Connection completed.");
      }

      runTelemetry(
        Effect.logDebug("Completed connection").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: edge.source,
            [FlowAttribute.edgeId]: edge.id,
            [FlowAttribute.changeKind]: "edge-add",
            [FlowAttribute.inputKind]: inputKind,
          }),
          Effect.withSpan(FlowSpan.connectionComplete, {
            attributes: {
              [FlowAttribute.nodeId]: edge.source,
              [FlowAttribute.edgeId]: edge.id,
              [FlowAttribute.changeKind]: "edge-add",
              [FlowAttribute.inputKind]: inputKind,
            },
          })
        )
      );
    };

    const beginClickConnection = (
      node: FlowNode,
      handle: FlowHandle,
      element: HTMLElement
    ): void => {
      activeClickConnection = { source: node.id, sourceHandle: handle.id };
      element.classList.add("connecting");
      announceConnection(
        `Connection started from ${node.label}. Choose a target handle or press Escape to cancel.`
      );

      if (globalThis.document.activeElement !== element) {
        canvas.focus();
      }

      showConnectionPreview(handleCenterInFlow(element));
      runTelemetry(
        Effect.logDebug("Started click connection").pipe(
          Effect.annotateLogs({
            [FlowAttribute.nodeId]: node.id,
            [FlowAttribute.handleId]: handle.id,
            [FlowAttribute.inputKind]: "click-connect",
          }),
          Effect.withSpan(FlowSpan.connectionStart, {
            attributes: {
              [FlowAttribute.nodeId]: node.id,
              [FlowAttribute.handleId]: handle.id,
              [FlowAttribute.inputKind]: "click-connect",
            },
          })
        )
      );
    };

    const finishConnection = (event: PointerEvent): void => {
      if (activeConnection?.pointerId !== event.pointerId) {
        return;
      }

      const started = activeConnection;
      const pointerStart = connectionPointerStart;

      const panned =
        renderedViewport.x !== authoritativeViewport.x ||
        renderedViewport.y !== authoritativeViewport.y;

      const targetElement = connectionTargetAt(
        started,
        event.clientX,
        event.clientY
      );

      const targetNode = document.nodes.find(
        (node) => node.id === targetElement?.dataset.nodeId
      );

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetElement?.dataset.handleId
      );

      if (
        options.connectOnClick === true &&
        targetNode?.id === started.source &&
        targetHandle?.id === started.sourceHandle &&
        pointerStart !== null &&
        Math.hypot(
          pointerInCanvas(event).x - pointerStart.x,
          pointerInCanvas(event).y - pointerStart.y
        ) <= 3 &&
        targetElement instanceof HTMLElement
      ) {
        clearConnection();
        beginClickConnection(targetNode, targetHandle, targetElement);
        suppressCanvasClick = true;
        globalThis.setTimeout(() => {
          suppressCanvasClick = false;
        }, 0);

        return;
      }

      if (targetNode === undefined || targetHandle?.kind !== "target") {
        cancelConnection("no-target");

        if (panned) {
          operations.publishChange({
            kind: "viewport",
            viewport: renderedViewport,
          });
        }

        return;
      }

      clearConnection();
      commitConnection(started, targetNode, targetHandle, "pointer-connect");

      if (panned) {
        operations.publishChange({
          kind: "viewport",
          viewport: renderedViewport,
        });
      }
    };

    const finishReconnection = (event: PointerEvent): void => {
      if (activeReconnection?.pointerId !== event.pointerId) {
        return;
      }

      suppressCanvasClick = true;
      globalThis.setTimeout(() => {
        suppressCanvasClick = false;
      }, 0);

      const active = activeReconnection;

      const handleElement = globalThis.document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(".flow-handle");

      const node = document.nodes.find(
        (item) => item.id === handleElement?.dataset.nodeId
      );

      const handle = node?.handles?.find(
        (item) => item.id === handleElement?.dataset.handleId
      );

      if (node === undefined || handle?.kind !== active.endpoint) {
        cancelReconnection("invalid-target");

        return;
      }

      clearReconnection();

      const result = runEffect(
        Effect.result(
          reconnectFlowEdge(
            document,
            active.edgeId,
            active.endpoint,
            node.id,
            handle.id
          )
        )
      );

      if (
        Result.isFailure(result) ||
        result.success === undefined ||
        !acceptsCustomConnection(result.success)
      ) {
        return;
      }

      operations.publishChange({
        kind: "edge-reconnect",
        edge: result.success,
      });

      const attributes = {
        [FlowAttribute.edgeId]: active.edgeId,
        [FlowAttribute.edgeEndpoint]: active.endpoint,
        [FlowAttribute.nodeId]: node.id,
        [FlowAttribute.handleId]: handle.id,
      };

      runTelemetry(
        Effect.logDebug("Completed edge reconnection").pipe(
          Effect.annotateLogs(attributes),
          Effect.withSpan(FlowSpan.edgeReconnectComplete, { attributes })
        )
      );
    };

    const onHandleClick = (target: EventTarget | null): boolean => {
      const handleElement =
        target instanceof Element
          ? target.closest<HTMLElement>(".flow-handle")
          : null;

      if (handleElement === null) {
        return false;
      }

      if (options.connectOnClick !== true) {
        return true;
      }

      const node = document.nodes.find(
        (candidate) => candidate.id === handleElement.dataset.nodeId
      );

      const handle = node?.handles?.find(
        (candidate) => candidate.id === handleElement.dataset.handleId
      );

      if (node === undefined || handle === undefined) {
        return true;
      }

      if (handle.kind === "source") {
        const sameSource =
          activeClickConnection?.source === node.id &&
          activeClickConnection.sourceHandle === handle.id;

        cancelClickConnection("source-changed");

        if (sameSource) {
          return true;
        }

        beginClickConnection(node, handle, handleElement);

        return true;
      }

      const started = clearClickConnection();

      if (started !== null) {
        commitConnection(started, node, handle, "click-connect");
        clickSourceElement(started)?.focus();
      }

      return true;
    };

    // eslint-disable-next-line complexity -- Canvas activation covers pane, node, edge, and modifier selection.
    const onCanvasClick = (event: MouseEvent): void => {
      if (suppressCanvasClick) {
        suppressCanvasClick = false;

        return;
      }

      const { target } = event;

      if (onHandleClick(target)) {
        return;
      }

      cancelClickConnection("canvas-click");

      const edgeGroup =
        target instanceof Element
          ? target.closest<SVGGElement>(".flow-edge-group")
          : null;

      if (edgeGroup !== null) {
        const edge = document.edges.find(
          (candidate) => candidate.id === edgeGroup.dataset.edgeId
        );

        if (edge !== undefined) {
          if (edge.focusable !== false) {
            edgeGroup.focus();
          }

          if (edge.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleEdgeSelection(edge);
          } else if (edge.selectable !== false && edge.selected !== true) {
            operations.publishChange({
              kind: "edge-selection",
              edgeId: edge.id,
              selected: true,
            });
          }
        }

        return;
      }

      const nodeElement =
        target instanceof Element
          ? target.closest<HTMLElement>(".flow-node")
          : null;

      if (nodeElement !== null) {
        if (target instanceof Element && target.closest(".flow-handle")) {
          return;
        }

        const node = document.nodes.find(
          (candidate) => candidate.id === nodeElement.dataset.nodeId
        );

        if (node !== undefined) {
          if (node.focusable !== false) {
            nodeElement.focus();
          }

          if (node.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleNodeSelection(node);
          } else if (node.selectable !== false && node.selected !== true) {
            operations.publishChange({
              kind: "node-selection",
              nodeId: node.id,
              selected: true,
            });
          }
        }

        return;
      }

      const selectedNodes = document.nodes.filter(
        (node) => node.selected === true
      );

      const selectedEdges = document.edges.filter(
        (edge) => edge.selected === true
      );

      if (selectedNodes.length + selectedEdges.length > 1) {
        operations.publishChange({
          kind: "selection-set",
          nodeIds: [],
          edgeIds: [],
        });

        return;
      }

      const [selected] = selectedEdges;

      if (selected !== undefined) {
        operations.publishChange({
          kind: "edge-selection",
          edgeId: selected.id,
          selected: false,
        });
      }

      const [selectedNode] = selectedNodes;

      if (selectedNode !== undefined) {
        operations.publishChange({
          kind: "node-selection",
          nodeId: selectedNode.id,
          selected: false,
        });
      }
    };

    // eslint-disable-next-line complexity -- Keyboard actions cover nodes, handles, edges, and the pane.
    const onCanvasKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && cancelActiveGestures("escape")) {
        event.preventDefault();

        return;
      }

      const { target } = event;

      const nodeElement =
        target instanceof Element && target.closest(".flow-handle") === null
          ? target.closest<HTMLElement>(".flow-node")
          : null;

      if (nodeElement !== null) {
        const node = document.nodes.find(
          (candidate) => candidate.id === nodeElement.dataset.nodeId
        );

        if (node === undefined) {
          return;
        }

        const arrowDelta = keyboardArrowDelta(event.key);

        if (
          arrowDelta !== null &&
          node.selected === true &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          const stepX = (options.snapGrid?.x ?? 5) * (event.shiftKey ? 4 : 1);
          const stepY = (options.snapGrid?.y ?? 5) * (event.shiftKey ? 4 : 1);

          const movementDocument = {
            ...document,
            nodes: document.nodes.map((candidate) => ({
              ...candidate,
              position: adoptedPosition(candidate),
            })),
          };

          const change = moveSelectedNodes(
            movementDocument,
            {
              x: arrowDelta.x * stepX,
              y: arrowDelta.y * stepY,
            },
            options.snapGrid
          );

          const keyboardDrag: ActiveNodeGroupDrag = {
            anchorNodeId: node.id,
            pointerId: 0,
            pointerStart: { x: 0, y: 0 },
            positions: selectedMovableNodes().map((candidate) => ({
              nodeId: candidate.id,
              position: movementDocument.nodes.find((item) => item.id === candidate.id)?.position ?? candidate.position,
            })),
          };
          const bounded: NodePositionsChange = options.nodeExtent === undefined
            ? {
                ...change,
                positions: change.positions.map(({ nodeId, position }) => ({
                  nodeId,
                  position: boundedNodePosition(nodeId, position),
                })),
              }
            : boundedGroupChange(keyboardDrag, change);

          operations.publishChange(bounded);
          runTelemetry(
            Effect.logDebug("Moved selected nodes with keyboard").pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeCount]: change.positions.length,
                [FlowAttribute.inputKind]: "keyboard",
              }),
              Effect.withSpan(FlowSpan.nodeDragComplete, {
                attributes: {
                  [FlowAttribute.nodeCount]: change.positions.length,
                  [FlowAttribute.inputKind]: "keyboard",
                },
              })
            )
          );

          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          nodeElement.blur();

          if (node.selected === true) {
            operations.publishChange({
              kind: "node-selection",
              nodeId: node.id,
              selected: false,
            });
          }
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();

          if (node.selectable !== false && (event.metaKey || event.ctrlKey)) {
            operations.toggleNodeSelection(node);
          } else if (node.selectable !== false && node.selected !== true) {
            operations.publishChange({
              kind: "node-selection",
              nodeId: node.id,
              selected: true,
            });
          }
        }

        return;
      }

      const edgeGroup =
        target instanceof Element
          ? target.closest<SVGGElement>(".flow-edge-group")
          : null;

      if (edgeGroup === null) {
        return;
      }

      const edge = document.edges.find(
        (candidate) => candidate.id === edgeGroup.dataset.edgeId
      );

      if (edge === undefined) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        edgeGroup.blur();

        if (edge.selected === true) {
          operations.publishChange({
            kind: "edge-selection",
            edgeId: edge.id,
            selected: false,
          });
        }
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        edge.selected === true &&
        edge.deletable !== false
      ) {
        event.preventDefault();

        if (!event.repeat) {
          operations.publishChange({ kind: "edge-remove", edgeId: edge.id });
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        if (edge.selectable !== false && (event.metaKey || event.ctrlKey)) {
          operations.toggleEdgeSelection(edge);
        } else if (edge.selectable !== false && edge.selected !== true) {
          operations.publishChange({
            kind: "edge-selection",
            edgeId: edge.id,
            selected: true,
          });
        }
      }
    };

    const onCanvasWheel = (event: WheelEvent): void => {
      if (activeViewportPan !== null) {
        return;
      }

      let deltaFactor = 0.002;

      if (event.deltaMode === 1) {
        deltaFactor = 0.05;
      } else if (event.deltaMode === 2) {
        deltaFactor = 1;
      }

      const factor = event.ctrlKey ? deltaFactor * 10 : deltaFactor;

      const requestedZoom =
        renderedViewport.zoom * 2 ** (-event.deltaY * factor);

      const candidate = zoomViewportAt(
        renderedViewport,
        requestedZoom,
        pointerInCanvas(event),
        viewportLimits
      );

      event.preventDefault();
      operations.publishChange({ kind: "viewport", viewport: candidate });
      runTelemetry(
        Effect.logDebug("Zoomed viewport").pipe(
          Effect.annotateLogs({
            [FlowAttribute.controlMode]: viewportMode,
            [FlowAttribute.inputKind]: "wheel",
            [FlowAttribute.viewportZoom]: candidate.zoom,
            [FlowAttribute.viewportZoomClamped]:
              candidate.zoom !== requestedZoom,
          }),
          Effect.withSpan(FlowSpan.viewportZoom, {
            attributes: {
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.inputKind]: "wheel",
              [FlowAttribute.viewportX]: candidate.x,
              [FlowAttribute.viewportY]: candidate.y,
              [FlowAttribute.viewportZoom]: candidate.zoom,
              [FlowAttribute.viewportZoomClamped]:
                candidate.zoom !== requestedZoom,
            },
          })
        )
      );
    };

    yield* Scope.provide(
      browser.listen(canvas, "pointerdown", onCanvasPointerDown),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointermove", onCanvasPointerMove),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointerup", finishViewportPan),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointerup", finishPinch),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointerup", finishSelectionRect),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointerup", finishConnection),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointerup", finishReconnection),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "pointercancel", onCanvasPointerCancel),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "lostpointercapture", onLostPointerCapture),
      hostScope
    );
    yield* Scope.provide(
      browser.listenWindow(globalThis.window, "blur", onWindowBlur),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "click", onCanvasClick),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "keydown", onCanvasKeyDown),
      hostScope
    );
    yield* Scope.provide(
      browser.listen(canvas, "wheel", onCanvasWheel, { passive: false }),
      hostScope
    );

    canvas.append(viewport, connectionStatus);
    const cleanupFailures: unknown[] = [];
    yield* Scope.addFinalizer(
      hostScope,
      Effect.sync(() => {
        for (const entry of entries.values()) {
          try {
            entry.release();
          } catch (error) {
            cleanupFailures.push(error);
          }
        }
        entries.clear();
        renderedNodePositions.clear();
        try {
          edgeRenderer.destroy();
        } catch (error) {
          cleanupFailures.push(error);
        }
        listeners.clear();
        try {
          root.replaceChildren();
        } catch (error) {
          cleanupFailures.push(error);
        }
        if (cleanupFailures.length > 0) {
          try {
            runTelemetry(
              Effect.logError("Failed to fully clean up flow host").pipe(
                Effect.annotateLogs({
                  [FlowAttribute.documentIssue]: cleanupFailures.map((error) => String(error)).join("; "),
                  [FlowAttribute.nodeCount]: cleanupFailures.length,
                }),
                Effect.withSpan(FlowSpan.hostDestroy)
              )
            );
          } catch {
            // Cleanup reporting must not replace the mount or destroy outcome.
          }
        }
      })
    );

    try {
      root.replaceChildren(canvas);
      authoritativeViewport = constrainViewport(authoritativeViewport);
      renderViewport(authoritativeViewport);
      operations.reconcile(document);
    } catch (error) {
      try {
        runEffect(Scope.close(hostScope, Exit.fail(error)));
      } catch (cleanupError) {
        try {
          runTelemetry(
            Effect.logError("Failed to close flow host after mount failure").pipe(
              Effect.annotateLogs({
                [FlowAttribute.documentIssue]: String(cleanupError),
              }),
              Effect.withSpan(FlowSpan.hostMount)
            )
          );
        } catch {
          // Preserve the renderer error even if cleanup reporting fails.
        }
      }
      throw error;
    }

    return {
      destroy: (): void => {
        if (destroyed) {
          return;
        }

        cancelActiveDrag("host-destroyed");
        cancelConnection("host-destroyed");
        cancelClickConnection("host-destroyed");
        cancelReconnection("host-destroyed");
        cancelViewportPan("host-destroyed");
        cancelPinch("host-destroyed");
        clearSelectionRect();
        destroyed = true;
        runTelemetry(
          Scope.close(hostScope, Exit.void).pipe(
            Effect.tap(() => Effect.logDebug("Destroyed flow host")),
            Effect.withSpan(FlowSpan.browserLifecycleClose),
            Effect.withSpan(FlowSpan.hostDestroy)
          )
        );
      },
      fitView: (fitOptions = {}): boolean => {
        if (destroyed) {
          return false;
        }

        const nodeIds = fitOptions.nodes === "selected"
          ? new Set(document.nodes.filter((node) => node.selected === true).map((node) => node.id))
          : undefined;
        const fitNodeCount = nodeIds?.size ?? document.nodes.length;

        const fitted = fitViewportToNodes({
          document,
          nodeIds,
          measurements,
          positionOverrides: renderedNodePositions,
          currentViewport: authoritativeViewport,
          paneWidth: canvas.clientWidth,
          paneHeight: canvas.clientHeight,
          limits: viewportLimits,
          padding: fitOptions.padding,
          fallbackDimensions: fitOptions.fallbackDimensions ?? {
            width: 150,
            height: 44,
          },
        });

        const candidate = constrainViewport(fitted);

        if (
          candidate.x === authoritativeViewport.x &&
          candidate.y === authoritativeViewport.y &&
          candidate.zoom === authoritativeViewport.zoom
        ) {
          return false;
        }

        operations.publishChange({
          kind: "viewport",
          viewport: candidate,
        });
        runTelemetry(
          Effect.logDebug("Fitted viewport to measured nodes").pipe(
            Effect.annotateLogs({
              [FlowAttribute.inputKind]: "fit-view",
              [FlowAttribute.nodeCount]: fitNodeCount,
              [FlowAttribute.viewportZoom]: candidate.zoom,
            }),
            Effect.withSpan(FlowSpan.viewportUpdate, {
              attributes: {
                [FlowAttribute.inputKind]: "fit-view",
                [FlowAttribute.nodeCount]: fitNodeCount,
                [FlowAttribute.viewportZoom]: candidate.zoom,
              },
            })
          )
        );

        return true;
      },
      dispatch: (command): void => {
        if (destroyed) {
          return;
        }

        const change = commandToChange(command);
        operations.publishChange(change);
        runTelemetry(
          Effect.logDebug("Dispatched flow command").pipe(
            Effect.annotateLogs({
              [FlowAttribute.changeKind]: change.kind,
            }),
            Effect.withSpan(FlowSpan.controllerDispatch, {
              attributes: {
                [FlowAttribute.changeKind]: change.kind,
              },
            })
          )
        );
      },
      subscribe: (listener): (() => void) => {
        listeners.add(listener);

        return () => listeners.delete(listener);
      },
      update: (nextDocument): void => {
        if (destroyed) {
          return;
        }

        const previous = document;
        document = nextDocument;
        operations.reconcile(document, previous);
        runTelemetry(
          Effect.logDebug("Updated flow controller").pipe(
            Effect.annotateLogs({
              [FlowAttribute.controlMode]: documentMode,
              [FlowAttribute.nodeCount]: document.nodes.length,
            }),
            Effect.withSpan(FlowSpan.controllerUpdate, {
              attributes: {
                [FlowAttribute.controlMode]: documentMode,
                [FlowAttribute.nodeCount]: document.nodes.length,
              },
            })
          )
        );
      },
      updateViewport: (nextViewport): void => {
        if (destroyed) {
          return;
        }

        authoritativeViewport = constrainViewport(nextViewport);
        renderViewport(authoritativeViewport);
        runTelemetry(
          Effect.logDebug("Updated authoritative viewport").pipe(
            Effect.annotateLogs({
              [FlowAttribute.controlMode]: viewportMode,
              [FlowAttribute.viewportX]: authoritativeViewport.x,
              [FlowAttribute.viewportY]: authoritativeViewport.y,
              [FlowAttribute.viewportZoom]: authoritativeViewport.zoom,
            }),
            Effect.withSpan(FlowSpan.viewportUpdate, {
              attributes: {
                [FlowAttribute.controlMode]: viewportMode,
                [FlowAttribute.viewportX]: authoritativeViewport.x,
                [FlowAttribute.viewportY]: authoritativeViewport.y,
                [FlowAttribute.viewportZoom]: authoritativeViewport.zoom,
              },
            })
          )
        );
      },
    } satisfies FlowController;
  }).pipe(
    Effect.tap(() =>
      Effect.logDebug("Mounted flow host").pipe(
        Effect.annotateLogs({
          [FlowAttribute.controlMode]: options.documentMode,
          [FlowAttribute.nodeCount]: initialDocument.nodes.length,
          [FlowAttribute.viewportX]: options.viewport.initial.x,
          [FlowAttribute.viewportY]: options.viewport.initial.y,
          [FlowAttribute.viewportZoom]: options.viewport.initial.zoom,
        })
      )
    ),
    Effect.withSpan(FlowSpan.hostMount, {
      attributes: {
        [FlowAttribute.controlMode]: options.documentMode,
        [FlowAttribute.nodeCount]: initialDocument.nodes.length,
        [FlowAttribute.viewportX]: options.viewport.initial.x,
        [FlowAttribute.viewportY]: options.viewport.initial.y,
        [FlowAttribute.viewportZoom]: options.viewport.initial.zoom,
      },
    })
  );

export const acquireFlowHost = (
  root: HTMLElement,
  initialDocument: FlowDocument,
  options: FlowHostOptions
) =>
  Effect.acquireRelease(
    createFlowHost(root, initialDocument, options),
    (host) => Effect.sync(() => host.destroy())
  );

export const mountFlow = (
  root: HTMLElement,
  input: FlowDocumentInput,
  inputOptions: FlowMountOptionsInput
): JavaScriptFlowController => {
  const options = Effect.runSync(
    S.decodeUnknownEffect(FlowMountOptionsSchema)(inputOptions)
  );

  const document = Effect.runSync(decodeFlowDocument(input));

  const host = Effect.runSync(
    createFlowHost(root, document, {
      ...options,
      isValidConnection: inputOptions.isValidConnection,
      nodeRenderers: inputOptions.nodeRenderers,
      edgeRenderers: inputOptions.edgeRenderers,
      onToolbarAnchors: inputOptions.onToolbarAnchors,
      runEffect: Effect.runSync,
    }).pipe(Effect.provide(FlowBrowserLive))
  );

  return {
    destroy: host.destroy,
    fitView: (fitOptions): boolean =>
      host.fitView(
        Effect.runSync(
          S.decodeUnknownEffect(FitViewOptionsSchema)(fitOptions ?? {})
        )
      ),
    dispatch: (commandInput): void => {
      host.dispatch(
        Effect.runSync(S.decodeUnknownEffect(FlowCommandSchema)(commandInput))
      );
    },
    subscribe: host.subscribe,
    update: (nextInput): void => {
      host.update(Effect.runSync(decodeFlowDocument(nextInput)));
    },
    updateViewport: (viewportInput): void => {
      host.updateViewport(
        Effect.runSync(S.decodeUnknownEffect(ViewportSchema)(viewportInput))
      );
    },
  };
};
