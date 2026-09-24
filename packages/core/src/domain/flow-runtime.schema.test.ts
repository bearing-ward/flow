import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import {
  ViewportSchema,
  ViewportLimitsSchema,
  FlowInteractionSessionSchema,
  FlowInteractionSessionsSchema,
  ActiveNodeResizeSchema,
  NodeSizeChangeSchema,
  activateFlowInteraction,
  cancelAllFlowInteractions,
  cancelFlowInteraction,
  finishFlowInteraction,
  replaceFlowInteraction,
  startFlowInteraction,
  applyEdgeSelectionChange,
  applyEdgeRemoveChange,
  applyNodePositionChange,
  applyNodePositionsChange,
  applyNodeSizeChange,
  beginNodeDrag,
  beginViewportPan,
  clampViewport,
  commandToChange,
  completeNodeDrag,
  flowToScreenPosition,
  moveNodeDrag,
  moveSelectedNodes,
  resizeNode,
  moveViewportPan,
  panViewport,
  screenToFlowPosition,
  zoomViewportAt,
} from "./flow-runtime.schema.ts";
import { EdgeIdSchema, NodeIdSchema } from "./flow.schema.ts";
import type { FlowDocument } from "./flow.schema.ts";

describe("pointer interaction sessions", () => {
  const decode = (input: unknown) => S.decodeUnknownSync(FlowInteractionSessionSchema)(input);

  it("decodes every active mode and enforces exclusive pointer ownership", () => {
    const sessions = [
      decode({ kind: "node-drag", phase: "pressed", drag: { nodeId: "n", pointerId: 1, pointerOffset: { x: 0, y: 0 } } }),
      decode({ kind: "node-drag", phase: "active", drag: { anchorNodeId: "g", pointerId: 2, pointerStart: { x: 0, y: 0 }, positions: [{ nodeId: "g", position: { x: 0, y: 0 } }] } }),
      decode({ kind: "connection", connection: { pointerId: 3, source: "a", sourceHandle: "out" } }),
      decode({ kind: "reconnection", reconnection: { edgeId: "e", endpoint: "source", pointerId: 4 } }),
      decode({ kind: "pane-pan", pan: { pointerId: 5, pointerStart: { x: 0, y: 0 }, viewportStart: { x: 0, y: 0, zoom: 1 } } }),
      decode({ kind: "pinch", pinch: { firstPointerId: 6, secondPointerId: 7, firstStart: { x: 0, y: 0 }, secondStart: { x: 1, y: 1 }, viewportStart: { x: 0, y: 0, zoom: 1 } } }),
      decode({ kind: "selection", selection: { pointerId: 8, pointerStart: { x: 0, y: 0 }, flowStart: { x: 0, y: 0 } } }),
      decode({ kind: "node-resize", resize: { nodeId: "n", pointerId: 9, pointerStart: { x: 10, y: 20 }, sizeStart: { width: 80, height: 40 } } }),
    ];
    expect(S.decodeSync(FlowInteractionSessionsSchema)(sessions)).toHaveLength(8);
    const invalid = Effect.runSync(Effect.exit(S.decodeUnknownEffect(FlowInteractionSessionsSchema)([
      sessions[0], { kind: "connection", connection: { pointerId: 1, source: "a", sourceHandle: "out" } },
    ])));
    expect(invalid._tag).toBe("Failure");
    const duplicatedPinchPointer = Effect.runSync(
      Effect.exit(
        S.decodeUnknownEffect(FlowInteractionSessionsSchema)([
          { kind: "pinch", pinch: { firstPointerId: 9, secondPointerId: 9, firstStart: { x: 0, y: 0 }, secondStart: { x: 1, y: 1 }, viewportStart: { x: 0, y: 0, zoom: 1 } } },
        ])
      )
    );
    expect(duplicatedPinchPointer._tag).toBe("Failure");
    expect(S.decodeUnknownSync(FlowInteractionSessionsSchema)([])).toEqual([]);
  });

  it("starts, activates, finishes, cancels idempotently, and replaces pane pan with pinch", () => {
    const pressed = decode({ kind: "node-drag", phase: "pressed", drag: { nodeId: "n", pointerId: 11, pointerOffset: { x: 0, y: 0 } } });
    const started = startFlowInteraction([], pressed);
    expect(started.kind).toBe("started");
    if (started.kind !== "started") return;
    expect(startFlowInteraction(started.sessions, pressed)).toMatchObject({ kind: "rejected", reason: "pointer-already-owned" });
    const concurrentConnection = decode({ kind: "connection", connection: { pointerId: 14, source: "a", sourceHandle: "out" } });
    const concurrent = startFlowInteraction(started.sessions, concurrentConnection);
    expect(concurrent).toMatchObject({ kind: "started", sessions: [{ kind: "node-drag" }, { kind: "connection" }] });
    const activated = activateFlowInteraction(started.sessions, 11);
    expect(activated.kind).toBe("activated");
    if (activated.kind !== "activated") return;
    expect(activated.session).toMatchObject({ kind: "node-drag", phase: "active" });
    expect(finishFlowInteraction(activated.sessions, 11)).toMatchObject({ kind: "finished", pointerIds: [11], preview: "node", semanticEvent: "node-position" });
    const cancelled = cancelFlowInteraction(activated.sessions, 11);
    expect(cancelled).toMatchObject({ kind: "cancelled", semanticEvent: undefined });
    if (cancelled.kind !== "cancelled") return;
    expect(cancelFlowInteraction(cancelled.sessions, 11)).toMatchObject({ kind: "unchanged" });

    const pan = decode({ kind: "pane-pan", pan: { pointerId: 12, pointerStart: { x: 0, y: 0 }, viewportStart: { x: 0, y: 0, zoom: 1 } } });
    const pinch = decode({ kind: "pinch", pinch: { firstPointerId: 12, secondPointerId: 13, firstStart: { x: 0, y: 0 }, secondStart: { x: 10, y: 0 }, viewportStart: { x: 0, y: 0, zoom: 1 } } });
    const panStarted = startFlowInteraction([], pan);
    if (panStarted.kind !== "started") throw new Error("pane pan should start");
    expect(replaceFlowInteraction(panStarted.sessions, 12, pinch)).toMatchObject({ kind: "started", sessions: [pinch] });
    expect(cancelAllFlowInteractions([pinch])).toMatchObject([{ kind: "cancelled", pointerIds: [12, 13], preview: "viewport" }]);

    const resize = decode({ kind: "node-resize", resize: { nodeId: "n", pointerId: 15, pointerStart: { x: 10, y: 20 }, sizeStart: { width: 80, height: 40 } } });
    const resizeStarted = startFlowInteraction([], resize);
    if (resizeStarted.kind !== "started") throw new Error("node resize should start");
    expect(finishFlowInteraction(resizeStarted.sessions, 15)).toMatchObject({
      kind: "finished", preview: "node-size", semanticEvent: "node-size", pointerIds: [15],
    });
    expect(cancelFlowInteraction(resizeStarted.sessions, 15)).toMatchObject({
      kind: "cancelled", preview: "node-size", semanticEvent: undefined,
    });
  });
});

describe("node resize contract", () => {
  it("applies finite flow-space deltas with minimum dimensions and unchanged position", () => {
    const nodeId = S.decodeSync(NodeIdSchema)("n");
    const document: FlowDocument = { nodes: [{ id: nodeId, label: "Node", position: { x: 4, y: 5 }, size: { width: 80, height: 40 } }], edges: [] };
    const change = resizeNode(nodeId, { width: 80, height: 40 }, { x: 30, y: -40 });
    expect(change).toStrictEqual({ kind: "node-size", nodeId: "n", size: { width: 110, height: 24 } });
    const resized = applyNodeSizeChange(document, change);
    expect(resized?.nodes[0]).toMatchObject({ position: { x: 4, y: 5 }, size: { width: 110, height: 24 } });
    expect(resizeNode(nodeId, { width: 80, height: 40 }, { x: -100, y: -100 }).size).toStrictEqual({ width: 40, height: 24 });
    expect(() => S.decodeUnknownSync(ActiveNodeResizeSchema)({ nodeId: "n", pointerId: 1, pointerStart: { x: 0, y: 0 }, sizeStart: { width: 0, height: 40 } })).toThrow();
    expect(() => S.decodeUnknownSync(NodeSizeChangeSchema)({ kind: "node-size", nodeId: "n", size: { width: 0, height: 40 } })).toThrow();
    expect(() => resizeNode(nodeId, { width: 80, height: 40 }, { x: Number.POSITIVE_INFINITY, y: 0 })).toThrow();
  });
});

describe("viewport coordinates", () => {
  it("round-trips between flow and screen coordinates", () => {
    const viewport = { x: 40, y: -20, zoom: 2 };
    const flowPosition = { x: 120, y: 80 };

    expect(
      screenToFlowPosition(
        flowToScreenPosition(flowPosition, viewport),
        viewport
      )
    ).toStrictEqual(flowPosition);
  });

  it("rejects a viewport with no usable zoom", () => {
    const result = Effect.runSync(
      Effect.exit(
        S.decodeUnknownEffect(ViewportSchema)({ x: 0, y: 0, zoom: 0 })
      )
    );

    expect(result._tag).toBe("Failure");
  });

  it("rejects inverted zoom limits", () => {
    const result = Effect.runSync(
      Effect.exit(
        S.decodeUnknownEffect(ViewportLimitsSchema)({ maxZoom: 1, minZoom: 2 })
      )
    );

    expect(result._tag).toBe("Failure");
  });

  it("pans in screen pixels and preserves the starting viewport", () => {
    const viewport = { x: 10, y: 20, zoom: 2 };
    const pan = beginViewportPan(viewport, { x: 50, y: 60 }, 4);

    expect(moveViewportPan(pan, { x: 80, y: 100 })).toStrictEqual({
      x: 40,
      y: 60,
      zoom: 2,
    });
    expect(pan.viewportStart).toBe(viewport);
    expect(panViewport(viewport, { x: -5, y: 8 })).toStrictEqual({
      x: 5,
      y: 28,
      zoom: 2,
    });
  });

  it("zooms around the cursor and clamps to the configured range", () => {
    const viewport = { x: 20, y: 40, zoom: 1 };
    const limits = { maxZoom: 2, minZoom: 0.5 };

    expect(
      zoomViewportAt(viewport, 2, { x: 120, y: 140 }, limits)
    ).toStrictEqual({
      x: -80,
      y: -60,
      zoom: 2,
    });
    expect(clampViewport({ ...viewport, zoom: 3 }, limits).zoom).toBe(2);
    expect(zoomViewportAt(viewport, 0.1, { x: 120, y: 140 }, limits).zoom).toBe(
      0.5
    );
  });
});

describe("edge selection", () => {
  it("selects one edge and preserves the input document", () => {
    const first = S.decodeSync(EdgeIdSchema)("first-edge");
    const second = S.decodeSync(EdgeIdSchema)("second-edge");
    const source = S.decodeSync(NodeIdSchema)("source");
    const target = S.decodeSync(NodeIdSchema)("target");

    const document: FlowDocument = {
      nodes: [
        { id: source, label: "Source", position: { x: 0, y: 0 } },
        { id: target, label: "Target", position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: first, source, target },
        { id: second, source, target, selected: true },
      ],
    };

    const selected = applyEdgeSelectionChange(document, {
      kind: "edge-selection",
      edgeId: first,
      selected: true,
    });

    expect(selected?.edges.map((edge) => edge.selected)).toStrictEqual([
      true,
      false,
    ]);
    expect(document.edges[0]?.selected).toBeUndefined();
    expect(document.edges[1]?.selected).toBeTruthy();

    const cleared =
      selected &&
      applyEdgeSelectionChange(selected, {
        kind: "edge-selection",
        edgeId: first,
        selected: false,
      });

    expect(cleared?.edges.map((edge) => edge.selected)).toStrictEqual([
      false,
      false,
    ]);
  });

  it("removes one edge without mutating other records", () => {
    const first = S.decodeSync(EdgeIdSchema)("first-edge");
    const second = S.decodeSync(EdgeIdSchema)("second-edge");
    const source = S.decodeSync(NodeIdSchema)("source");
    const target = S.decodeSync(NodeIdSchema)("target");

    const document: FlowDocument = {
      nodes: [
        { id: source, label: "Source", position: { x: 0, y: 0 } },
        { id: target, label: "Target", position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: first, source, target, selected: true },
        { id: second, source, target, deletable: false },
      ],
    };

    const removed = applyEdgeRemoveChange(document, {
      kind: "edge-remove",
      edgeId: first,
    });

    expect(removed?.edges).toStrictEqual([document.edges[1]]);
    expect(removed?.edges[0]).toBe(document.edges[1]);
    expect(removed?.nodes).toBe(document.nodes);
    expect(document.edges).toHaveLength(2);
    expect(
      applyEdgeRemoveChange(document, { kind: "edge-remove", edgeId: second })
    ).toBeUndefined();
  });

  it("does not select an edge marked unselectable", () => {
    const edgeId = S.decodeSync(EdgeIdSchema)("edge-1");
    const source = S.decodeSync(NodeIdSchema)("source");
    const target = S.decodeSync(NodeIdSchema)("target");

    const document: FlowDocument = {
      nodes: [
        { id: source, label: "Source", position: { x: 0, y: 0 } },
        { id: target, label: "Target", position: { x: 100, y: 0 } },
      ],
      edges: [{ id: edgeId, source, target, selectable: false }],
    };

    expect(
      applyEdgeSelectionChange(document, {
        kind: "edge-selection",
        edgeId,
        selected: true,
      })
    ).toBeUndefined();
  });

  it("rejects selection of an absent edge", () => {
    expect(
      applyEdgeSelectionChange(
        { nodes: [], edges: [] },
        {
          kind: "edge-selection",
          edgeId: S.decodeSync(EdgeIdSchema)("missing"),
          selected: true,
        }
      )
    ).toBeUndefined();
  });
});

describe("node dragging", () => {
  it("keeps locked nodes selectable but omits them from single and mixed movement", () => {
    const lockedId = S.decodeSync(NodeIdSchema)("locked");
    const movableId = S.decodeSync(NodeIdSchema)("movable");
    const document: FlowDocument = { edges: [], nodes: [
      { id: lockedId, label: "Locked", position: { x: 0, y: 0 }, selected: true, draggable: false },
      { id: movableId, label: "Movable", position: { x: 20, y: 0 }, selected: true },
    ] };
    expect(moveSelectedNodes({ ...document, nodes: [document.nodes[0]!] }, { x: 5, y: 0 }).positions).toEqual([]);
    expect(moveSelectedNodes(document, { x: 5, y: 0 }).positions).toEqual([
      { nodeId: movableId, position: { x: 25, y: 0 } },
    ]);
    const nested: FlowDocument = { edges: [], nodes: [
      { id: lockedId, label: "Locked parent", position: { x: 0, y: 0 }, selected: true, draggable: false },
      { id: movableId, label: "Selected child", position: { x: 20, y: 0 }, parentId: lockedId, selected: true },
    ] };
    expect(moveSelectedNodes(nested, { x: 5, y: 0 }).positions).toEqual([
      { nodeId: movableId, position: { x: 25, y: 0 } },
    ]);
    expect(applyNodePositionChange(document, { kind: "node-position", nodeId: lockedId, position: { x: 5, y: 0 } })).toBeUndefined();
    expect(applyNodePositionsChange(document, { kind: "node-positions", positions: [{ nodeId: lockedId, position: { x: 5, y: 0 } }, { nodeId: movableId, position: { x: 25, y: 0 } }] })).toBeUndefined();
  });

  it("preserves the pointer offset and emits a semantic final position", () => {
    const nodeId = S.decodeSync(NodeIdSchema)("node-1");

    const drag = beginNodeDrag(
      nodeId,
      { x: 120, y: 80 },
      { x: 135, y: 100 },
      7
    );

    expect(moveNodeDrag(drag, { x: 200, y: 175 })).toStrictEqual({
      x: 185,
      y: 155,
    });
    expect(completeNodeDrag(drag, { x: 200, y: 175 })).toStrictEqual({
      kind: "node-position",
      nodeId: "node-1",
      position: { x: 185, y: 155 },
    });
  });

  it("applies a position command without copying unaffected nodes", () => {
    const firstId = S.decodeSync(NodeIdSchema)("first");
    const secondId = S.decodeSync(NodeIdSchema)("second");

    const second = {
      id: secondId,
      label: "Second",
      position: { x: 50, y: 60 },
    };

    const document: FlowDocument = {
      edges: [],
      nodes: [
        { id: firstId, position: { x: 10, y: 20 }, label: "First" },
        second,
      ],
    };

    const change = commandToChange({
      kind: "set-node-position",
      nodeId: firstId,
      position: { x: 30, y: 40 },
    });

    if (change.kind !== "node-position") {
      throw new Error("Expected node position change");
    }

    const updated = applyNodePositionChange(document, change);

    expect(updated?.nodes[0]?.position).toStrictEqual({ x: 30, y: 40 });
    expect(updated?.nodes[1]).toBe(second);
  });

  it("turns a viewport command into a semantic viewport change", () => {
    expect(
      commandToChange({
        kind: "set-viewport",
        viewport: { x: 12, y: 34, zoom: 1.5 },
      })
    ).toStrictEqual({
      kind: "viewport",
      viewport: { x: 12, y: 34, zoom: 1.5 },
    });
  });

  it("does not apply a position change for a missing node", () => {
    const missingId = S.decodeSync(NodeIdSchema)("missing");
    const document: FlowDocument = { edges: [], nodes: [] };

    expect(
      applyNodePositionChange(document, {
        kind: "node-position",
        nodeId: missingId,
        position: { x: 1, y: 2 },
      })
    ).toBeUndefined();
  });
});
