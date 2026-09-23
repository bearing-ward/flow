import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { simpleBezierEdgePath } from "./flow-edge.schema.ts";
import {
  applyNodeSelectionChange,
  applySelectionSetChange,
} from "./flow-runtime.schema.ts";
import {
  edgeIntersectsViewport,
  nodeIntersectsViewport,
  orderFlowEdges,
  selectionInRect,
  viewportFlowRect,
} from "./flow-visibility.schema.ts";
import { decodeFlowDocument } from "./flow.schema.ts";
import { createFlowGraph } from "./flow-graph.ts";

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: "near",
        label: "Near",
        position: { x: 20, y: 20 },
        selected: false,
      },
      { id: "far", label: "Far", position: { x: 500, y: 20 } },
    ],
    edges: [
      { id: "low", source: "near", target: "far", zIndex: -1 },
      { id: "high", source: "near", target: "far", zIndex: 2 },
      { id: "selected", source: "near", target: "far", selected: true },
    ],
  })
);

describe("node selection", () => {
  it("selects one node and clears edge selection", () => {
    const [node] = document.nodes;

    if (node === undefined) {
      throw new Error("Missing fixture node");
    }

    const next = applyNodeSelectionChange(document, {
      kind: "node-selection",
      nodeId: node.id,
      selected: true,
    });

    expect(next?.nodes[0]?.selected).toBeTruthy();
    expect(next?.edges[2]?.selected).toBeFalsy();
  });

  it("replaces selection atomically and preserves multiple nodes", () => {
    const [near, far] = document.nodes;
    const [edge] = document.edges;

    if (near === undefined || far === undefined || edge === undefined) {
      throw new Error("Missing fixture selection values");
    }

    const next = applySelectionSetChange(document, {
      kind: "selection-set",
      nodeIds: [near.id, far.id],
      edgeIds: [edge.id],
    });

    expect(next?.nodes.map((node) => node.selected)).toStrictEqual([
      true,
      true,
    ]);
    expect(next?.edges.map((item) => item.selected === true)).toStrictEqual([
      true,
      false,
      false,
    ]);
  });

  it("selects fully enclosed nodes and their connected edges", () => {
    const change = selectionInRect(
      createFlowGraph(document),
      { x: 0, y: 0, width: 200, height: 100 },
    );

    expect(change.nodeIds.map(String)).toStrictEqual(["near"]);
    expect(change.edgeIds.map(String)).toStrictEqual([
      "low",
      "high",
      "selected",
    ]);
  });

  it("excludes hidden and nonselectable nodes and hidden-endpoint edges", () => {
    const restricted = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "visible", label: "Visible", position: { x: 20, y: 20 } },
          {
            id: "hidden",
            label: "Hidden",
            position: { x: 80, y: 20 },
            hidden: true,
          },
          {
            id: "locked",
            label: "Locked",
            position: { x: 140, y: 20 },
            selectable: false,
          },
        ],
        edges: [{ id: "to-hidden", source: "visible", target: "hidden" }],
      })
    );

    const change = selectionInRect(
      createFlowGraph(restricted),
      { x: 0, y: 0, width: 400, height: 100 },
    );

    expect(change.nodeIds.map(String)).toStrictEqual(["visible"]);
    expect(change.edgeIds).toStrictEqual([]);
  });
});

describe("simple Bezier and viewport visibility", () => {
  it("uses midpoint controls for mixed attachment sides", () => {
    expect(
      simpleBezierEdgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, "right", "top")
    ).toBe("M0,0 C50,0 100,50 100,100");
  });

  it("culls distant nodes but retains a crossing edge", () => {
    const rect = viewportFlowRect({ x: 0, y: 0, zoom: 1 }, 300, 200, 0);

    const [near, far] = document.nodes;
    const [edge] = document.edges;

    if (near === undefined || far === undefined || edge === undefined) {
      throw new Error("Missing fixture node or edge");
    }

    const graph = createFlowGraph(document);
    expect(nodeIntersectsViewport(graph, near.id, rect)).toBeTruthy();
    expect(nodeIntersectsViewport(graph, far.id, rect)).toBeFalsy();
    expect(
      edgeIntersectsViewport(graph, edge, rect)
    ).toBeTruthy();
  });

  it("orders explicit stacking below selected edges", () => {
    expect(orderFlowEdges(document.edges).map((edge) => edge.id)).toStrictEqual(
      ["low", "high", "selected"]
    );
  });
});
