import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import {
  ViewportSchema,
  ViewportLimitsSchema,
  applyEdgeSelectionChange,
  applyEdgeRemoveChange,
  applyNodePositionChange,
  beginNodeDrag,
  beginViewportPan,
  clampViewport,
  commandToChange,
  completeNodeDrag,
  flowToScreenPosition,
  moveNodeDrag,
  moveViewportPan,
  panViewport,
  screenToFlowPosition,
  zoomViewportAt,
} from "./flow-runtime.schema.ts";
import { EdgeIdSchema, NodeIdSchema } from "./flow.schema.ts";
import type { FlowDocument } from "./flow.schema.ts";

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
