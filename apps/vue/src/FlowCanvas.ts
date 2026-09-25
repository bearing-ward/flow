import {
  applyNodePositionChange,
  createFlowGraph,
  decodeFlowDocument,
  nextConnectionEdge,
  validateFlowConnection,
  type FlowChange,
  type FlowCommand,
  type FlowDocument,
  type FlowEdge,
  type FlowNode,
  type Viewport,
} from "@flow/core";
import { computed, defineComponent, h, onBeforeUnmount, provide, shallowRef, watch, type Component, type PropType, type SlotsType, type VNode } from "vue";
import { Effect, Exit } from "effect";
import { FlowEditorKey, type FlowEditor } from "./use-flow.ts";

type DragSession = { readonly kind: "node"; readonly pointerId: number; readonly node: FlowNode; readonly startX: number; readonly startY: number; readonly originX: number; readonly originY: number };
type ConnectionSession = { readonly kind: "connection"; readonly pointerId: number; readonly sourceNode: FlowNode; readonly sourceHandle: string };
type Session = DragSession | ConnectionSession;
type NodeVisual = Component<{ readonly node: FlowNode }>;
type EdgeVisual = Component<{ readonly edge: FlowEdge }>;

const DefaultNode = defineComponent({
  name: "FlowDefaultNode",
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => h("span", { class: "flow-vue-node-label" }, props.node.label);
  },
});

export const FlowCanvas = defineComponent({
  name: "FlowCanvas",
  props: {
    document: { type: Object as PropType<FlowDocument>, default: undefined },
    defaultDocument: { type: Object as PropType<FlowDocument>, default: undefined },
    documentMode: { type: String as PropType<"controlled" | "uncontrolled">, default: "uncontrolled" },
    nodes: { type: Array as PropType<readonly FlowNode[]>, default: undefined },
    edges: { type: Array as PropType<readonly FlowEdge[]>, default: undefined },
    viewport: { type: Object as PropType<Viewport>, default: undefined },
    defaultViewport: { type: Object as PropType<Viewport>, default: () => ({ x: 0, y: 0, zoom: 1 }) },
    viewportMode: { type: String as PropType<"controlled" | "uncontrolled">, default: "uncontrolled" },
    nodeComponent: { type: [Object, Function] as PropType<NodeVisual>, default: undefined },
    edgeComponent: { type: [Object, Function] as PropType<EdgeVisual>, default: undefined },
    isValidConnection: { type: Function as PropType<(targetNodeId: string) => boolean>, default: () => true },
    renderOnlyVisible: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: Record<string, never>;
    node: { readonly node: FlowNode };
    edge: { readonly edge: FlowEdge };
  }>,
  emits: {
    change: (_change: FlowChange) => true,
    "update:document": (_document: FlowDocument) => true,
    "update:nodes": (_nodes: readonly FlowNode[]) => true,
    "update:edges": (_edges: readonly FlowEdge[]) => true,
    "update:viewport": (_viewport: Viewport) => true,
  },
  setup(props, { emit, slots, expose }) {
    const initialDocument = props.document ?? props.defaultDocument;
    const hasSplitModel = props.nodes !== undefined || props.edges !== undefined;
    if (hasSplitModel && (props.nodes === undefined || props.edges === undefined)) throw new Error("FlowCanvas requires both nodes and edges for split model binding");
    if (hasSplitModel && initialDocument !== undefined) throw new Error("FlowCanvas accepts either document or nodes/edges binding, not both");
    if (initialDocument === undefined && !hasSplitModel) throw new Error("FlowCanvas requires document/defaultDocument or nodes and edges");
    if (!hasSplitModel && props.documentMode === "controlled" && props.document === undefined) throw new Error("Controlled FlowCanvas requires document");
    const initialOwnedDocument = initialDocument ?? (hasSplitModel
      ? Effect.runSync(decodeFlowDocument({ nodes: props.nodes ?? [], edges: props.edges ?? [] }))
      : undefined);
    if (initialOwnedDocument === undefined) throw new Error("FlowCanvas has no initial document state");
    const ownedDocument = shallowRef(initialOwnedDocument);
    const ownedViewport = shallowRef(props.viewport ?? props.defaultViewport);
    const activeDocument = computed(() => hasSplitModel
      ? { ...ownedDocument.value, nodes: props.nodes ?? [], edges: props.edges ?? [] }
      : props.documentMode === "controlled" ? (props.document ?? ownedDocument.value) : ownedDocument.value);
    const activeViewport = computed(() => props.viewportMode === "controlled" ? (props.viewport ?? ownedViewport.value) : ownedViewport.value);
    const graph = computed(() => createFlowGraph(activeDocument.value));
    const session = shallowRef<Session>();
    const canvas = shallowRef<HTMLElement>();
    const canvasWidth = shallowRef(960);
    const canvasHeight = shallowRef(640);
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        canvasWidth.value = entry.contentRect.width;
        canvasHeight.value = entry.contentRect.height;
      }
    });

    watch(() => props.document, (next) => { if (next !== undefined) ownedDocument.value = next; });
    watch(() => props.viewport, (next) => { if (next !== undefined) ownedViewport.value = next; });
    const publish = (change: FlowChange): void => {
      emit("change", change);
      if (hasSplitModel || props.documentMode === "controlled") {
        const next = change.kind === "node-position"
          ? applyNodePositionChange(activeDocument.value, change)
          : change.kind === "edge-add"
            ? { ...activeDocument.value, edges: [...activeDocument.value.edges, change.edge] }
            : undefined;
        if (next !== undefined && hasSplitModel) {
          if (change.kind === "node-position") emit("update:nodes", next.nodes);
          if (change.kind === "edge-add") emit("update:edges", next.edges);
        } else if (next !== undefined) {
          emit("update:document", next);
        }
        return;
      }
      if (change.kind === "node-position") {
        const updated = applyNodePositionChange(activeDocument.value, change);
        if (updated !== undefined) ownedDocument.value = updated;
      } else if (change.kind === "edge-add") {
        ownedDocument.value = { ...activeDocument.value, edges: [...activeDocument.value.edges, change.edge] };
      }
    };
    const updateDocument = (next: FlowDocument): void => {
      if (hasSplitModel) {
        emit("update:nodes", next.nodes);
        emit("update:edges", next.edges);
      } else if (props.documentMode === "controlled") emit("update:document", next);
      else ownedDocument.value = next;
    };
    const updateViewport = (next: Viewport): void => {
      if (props.viewportMode === "controlled") emit("update:viewport", next);
      else ownedViewport.value = next;
    };
    const dispatch = (command: FlowCommand): void => {
      if (command.kind === "set-viewport") updateViewport(command.viewport);
      if (command.kind === "set-node-position") {
        const node = activeDocument.value.nodes.find((candidate) => candidate.id === command.nodeId);
        if (node !== undefined) publish({ kind: "node-position", nodeId: node.id, position: command.position });
      }
    };
    const editor: FlowEditor = { document: activeDocument, viewport: activeViewport, dispatch, updateDocument, updateViewport, publish };
    provide(FlowEditorKey, editor);
    expose({ editor });

    const nodePosition = (node: FlowNode): { x: number; y: number } =>
      graph.value.nodes.get(node.id)?.absolutePosition ?? node.position;
    const visible = (node: FlowNode): boolean => {
      if (graph.value.nodes.get(node.id)?.hidden === true) return false;
      if (!props.renderOnlyVisible) return true;
      const position = nodePosition(node);
      const viewport = activeViewport.value;
      const left = position.x * viewport.zoom + viewport.x;
      const top = position.y * viewport.zoom + viewport.y;
      return left < canvasWidth.value && top < canvasHeight.value && left + 150 * viewport.zoom > 0 && top + 44 * viewport.zoom > 0;
    };
    const onPointerDown = (event: PointerEvent, node: FlowNode): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const handleId = target.closest<HTMLElement>("[data-handle-id]")?.dataset.handleId;
      if (handleId !== undefined) {
        session.value = { kind: "connection", pointerId: event.pointerId, sourceNode: node, sourceHandle: handleId };
      } else {
        session.value = { kind: "node", pointerId: event.pointerId, node, startX: event.clientX, startY: event.clientY, originX: nodePosition(node).x, originY: nodePosition(node).y };
      }
      const currentTarget = event.currentTarget;
      if (currentTarget instanceof HTMLElement) currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = (event: PointerEvent): void => {
      const active = session.value;
      if (active === undefined || active.pointerId !== event.pointerId) return;
      session.value = undefined;
      if (active.kind === "node") {
        canvas.value?.querySelector<HTMLElement>(`[data-node-id="${active.node.id}"]`)?.style.removeProperty("transform");
        const dx = (event.clientX - active.startX) / activeViewport.value.zoom;
        const dy = (event.clientY - active.startY) / activeViewport.value.zoom;
        if (Math.hypot(dx, dy) < 8) return;
        publish({ kind: "node-position", nodeId: active.node.id, position: { x: active.originX + dx, y: active.originY + dy } });
        return;
      }
      const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-handle-id]");
      const targetNodeElement = targetElement?.closest<HTMLElement>("[data-node-id]");
      const targetNodeId = targetNodeElement?.dataset.nodeId;
      const targetHandleId = targetElement?.dataset.handleId;
      if (targetNodeId === undefined || targetHandleId === undefined || targetNodeId === active.sourceNode.id || !props.isValidConnection(targetNodeId)) return;
      const targetNode = activeDocument.value.nodes.find((node) => node.id === targetNodeId);
      const sourceHandle = active.sourceNode.handles?.find((handle) => handle.id === active.sourceHandle && handle.kind === "source");
      const targetHandle = targetNode?.handles?.find((handle) => handle.id === targetHandleId && handle.kind === "target");
      if (targetNode === undefined || sourceHandle === undefined || targetHandle === undefined) return;
      const connection = { source: active.sourceNode.id, sourceHandle: sourceHandle.id, target: targetNode.id, targetHandle: targetHandle.id };
      if (Exit.isFailure(Effect.runSyncExit(validateFlowConnection(activeDocument.value, connection)))) return;
      publish({ kind: "edge-add", edge: nextConnectionEdge(activeDocument.value, connection) });
    };
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === "Escape") session.value = undefined; };

    const renderNode = (node: FlowNode): VNode | null => {
      if (graph.value.nodes.get(node.id)?.hidden === true || !visible(node)) return null;
      const position = nodePosition(node);
      const Node: NodeVisual = props.nodeComponent ?? DefaultNode;
      const nodeSlots = slots.node === undefined ? undefined : { default: () => slots.node?.({ node }) };
      const handleChildren = (node.handles ?? []).map((handle) => h("button", {
        key: handle.id, type: "button", class: ["flow-vue-handle", `flow-vue-handle-${handle.side}`],
        "data-handle-id": handle.id, "aria-label": `${handle.kind} handle ${handle.id}`,
      }));
      return h("div", {
        key: node.id, class: "flow-vue-node", "data-testid": "flow-node", "data-node-id": node.id,
        style: { left: `${position.x}px`, top: `${position.y}px` },
        onPointerdown: (event: PointerEvent) => onPointerDown(event, node),
      }, [h(Node, { node, key: `visual-${node.id}` }, nodeSlots), ...handleChildren]);
    };
    const renderEdge = (edge: FlowEdge): VNode | null => {
      const source = graph.value.nodes.get(edge.source);
      const target = graph.value.nodes.get(edge.target);
      if (edge.hidden === true || source?.hidden === true || target?.hidden === true) return null;
      const Edge = props.edgeComponent;
      const edgeSlots = slots.edge === undefined ? undefined : { default: () => slots.edge?.({ edge }) };
      return h("g", { key: edge.id, "data-testid": "flow-edge", "data-edge-id": edge.id }, Edge === undefined ? [] : [h(Edge, { edge }, edgeSlots)]);
    };

    onBeforeUnmount(() => {
      if (canvas.value !== undefined) resizeObserver.unobserve(canvas.value);
      resizeObserver.disconnect();
      globalThis.removeEventListener("keydown", onKeyDown, true);
      session.value = undefined;
    });

    return () => h("div", {
      ref: (element: unknown) => {
        if (element instanceof HTMLElement && canvas.value !== element) {
          if (canvas.value !== undefined) resizeObserver.unobserve(canvas.value);
          canvas.value = element;
          resizeObserver.observe(element);
          globalThis.addEventListener("keydown", onKeyDown, true);
        }
      },
      class: "flow-vue-canvas", "data-testid": "flow-canvas",
      onPointermove: (event: PointerEvent) => {
        const active = session.value;
        if (active?.kind !== "node" || active.pointerId !== event.pointerId) return;
        const dx = (event.clientX - active.startX) / activeViewport.value.zoom;
        const dy = (event.clientY - active.startY) / activeViewport.value.zoom;
        const current = canvas.value?.querySelector<HTMLElement>(`[data-node-id="${active.node.id}"]`);
        if (current !== null && current !== undefined) current.style.transform = `translate(${Math.max(0, dx)}px, ${Math.max(0, dy)}px)`;
      },
      onPointerup: onPointerUp,
      onPointercancel: () => { session.value = undefined; },
    }, [
      h("svg", { class: "flow-vue-edges", "aria-hidden": "true" }, activeDocument.value.edges.map(renderEdge)),
      h("div", { class: "flow-vue-viewport", style: { transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})` } }, graph.value.orderedNodes.map(({ node }) => renderNode(node))),
      slots.default?.({}),
    ]);
  },
});
