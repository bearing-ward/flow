import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decodeFlowDocument } from "./flow.schema.ts";
import {
  createFlowGraph,
  graphAncestors,
  graphBounds,
  graphDescendants,
  graphIncomers,
  graphNode,
  graphNodesIntersecting,
  graphOutgoers,
} from "./flow-graph.ts";

describe("flow graph view", () => {
  it("derives three-level absolute positions independently of array order", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "leaf", label: "Leaf", parentId: "child", position: { x: 3, y: 4 } },
          { id: "root", label: "Root", position: { x: 100, y: 200 } },
          { id: "child", label: "Child", parentId: "root", position: { x: 10, y: 20 } },
        ],
        edges: [],
      })
    );
    const graph = createFlowGraph(document);

    expect(graphNode(graph, "leaf" as never)?.absolutePosition).toEqual({ x: 113, y: 224 });
    expect(graphAncestors(graph, "leaf" as never).map((node) => node.id)).toEqual(["child", "root"]);
    expect(graphDescendants(graph, "root" as never).map((node) => node.id)).toEqual(["child", "leaf"]);
  });

  it("orders siblings by zIndex and document order with parents before descendants", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "late", label: "Late", position: { x: 0, y: 0 }, zIndex: 5 },
          { id: "child", label: "Child", parentId: "root", position: { x: 0, y: 0 }, zIndex: -10 },
          { id: "root", label: "Root", position: { x: 0, y: 0 }, zIndex: 10 },
          { id: "early", label: "Early", position: { x: 0, y: 0 }, zIndex: 1 },
        ],
        edges: [],
      })
    );

    expect(createFlowGraph(document).orderedNodes.map((node) => node.id)).toEqual([
      "early", "late", "root", "child",
    ]);
  });

  it("inherits hidden state and uses measured dimensions over declared dimensions", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "root", label: "Root", position: { x: 0, y: 0 }, size: { width: 300, height: 200 }, hidden: true },
          { id: "child", label: "Child", parentId: "root", position: { x: 10, y: 15 }, size: { width: 80, height: 50 } },
        ],
        edges: [],
      })
    );
    const graph = createFlowGraph(document, new Map([
      ["child" as never, { nodeId: "child" as never, width: 120, height: 70 }],
    ]));

    expect(graphNode(graph, "child" as never)).toMatchObject({
      absolutePosition: { x: 10, y: 15 },
      dimensions: { width: 120, height: 70 },
      hidden: true,
    });
    expect(graphBounds(graph)).toBeUndefined();
  });

  it("uses declared sizes before measurements and the 150 by 44 fallback otherwise", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "declared", label: "Declared", position: { x: 0, y: 0 }, size: { width: 90, height: 60 } },
          { id: "fallback", label: "Fallback", position: { x: 100, y: 0 } },
        ],
        edges: [],
      })
    );
    const graph = createFlowGraph(document);

    expect(graphNode(graph, "declared" as never)?.dimensions).toEqual({ width: 90, height: 60 });
    expect(graphNode(graph, "fallback" as never)?.dimensions).toEqual({ width: 150, height: 44 });
  });

  it("computes bounds, intersections, and directed neighboring edges", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          { id: "a", label: "A", position: { x: 0, y: 0 }, size: { width: 20, height: 20 } },
          { id: "b", label: "B", position: { x: 50, y: 0 }, size: { width: 20, height: 20 } },
          { id: "c", label: "C", position: { x: 100, y: 0 }, size: { width: 20, height: 20 } },
        ],
        edges: [
          { id: "ab", source: "a", target: "b" },
          { id: "ba", source: "b", target: "a" },
          { id: "bc", source: "b", target: "c" },
        ],
      })
    );
    const graph = createFlowGraph(document);

    expect(graphBounds(graph)).toEqual({ x: 0, y: 0, width: 120, height: 20 });
    expect(graphNodesIntersecting(graph, { x: 45, y: 0, width: 10, height: 20 }).map((node) => node.id)).toEqual(["b"]);
    expect(graphIncomers(graph, "b" as never).map((edge) => edge.id)).toEqual(["ab"]);
    expect(graphOutgoers(graph, "b" as never).map((edge) => edge.id)).toEqual(["ba", "bc"]);
    expect(graphBounds(createFlowGraph(Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))))).toBeUndefined();
  });

  it("keeps invalid cyclic ancestry at the decode boundary", () => {
    const result = Effect.runSync(
      Effect.exit(decodeFlowDocument({
        nodes: [
          { id: "a", label: "A", parentId: "b", position: { x: 0, y: 0 } },
          { id: "b", label: "B", parentId: "a", position: { x: 0, y: 0 } },
        ],
        edges: [],
      }))
    );

    expect(result._tag).toBe("Failure");
  });
});
