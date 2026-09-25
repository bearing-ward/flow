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
  it("resolves deterministic generated trees independent of document order", () => {
    const seeds = [0x13579bdf, 0x2468ace0, 0xdeadbeef, 0x10203040];
    for (const seed of seeds) {
      let state = seed >>> 0;
      const random = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x1_0000_0000;
      };
      const nodes: { id: string; label: string; position: { x: number; y: number }; parentId?: string; hidden?: boolean }[] = [];
      const expected = new Map<string, { x: number; y: number; hidden: boolean }>();
      const depth = 1 + Math.floor(random() * 5);
      for (let index = 0; index < depth; index += 1) {
        const id = `seed-${seed}-node-${index}`;
        const position = { x: Math.floor(random() * 201) - 100, y: Math.floor(random() * 201) - 100 };
        const ownHidden = random() < 0.25;
        const parentIndex = index === 0 ? undefined : Math.floor(random() * index);
        const parentId = parentIndex === undefined ? undefined : `seed-${seed}-node-${parentIndex}`;
        const parent = parentId === undefined ? undefined : expected.get(parentId);
        nodes.push({ id, label: id, position, ...(parentId === undefined ? {} : { parentId }), ...(ownHidden ? { hidden: true } : {}) });
        expected.set(id, {
          x: (parent?.x ?? 0) + position.x,
          y: (parent?.y ?? 0) + position.y,
          hidden: ownHidden || (parent?.hidden ?? false),
        });
      }
      nodes.reverse();
      try {
        const document = Effect.runSync(decodeFlowDocument({ nodes, edges: [] }));
        const graph = createFlowGraph(document);
        for (const [id, position] of expected) {
          expect(graphNode(graph, id as never), `seed ${seed}, node ${id}`).toMatchObject({ absolutePosition: { x: position.x, y: position.y }, hidden: position.hidden });
        }
        expect(new Set(graph.orderedNodes.map((node) => node.id)), `seed ${seed}: stable IDs`)
          .toEqual(new Set(expected.keys()));
      } catch (error) {
        throw new Error(`Generated graph property failed for seed ${seed}`, { cause: error });
      }
    }
  });

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

  it("resolves child-local positions with overrides and size precedence in spatial queries", () => {
    const document = Effect.runSync(decodeFlowDocument({
      nodes: [
        { id: "parent", label: "Parent", position: { x: 100, y: 80 }, size: { width: 10, height: 10 } },
        { id: "child", label: "Child", parentId: "parent", position: { x: 5, y: 7 }, size: { width: 20, height: 12 } },
        { id: "measured", label: "Measured", position: { x: 200, y: 0 }, size: { width: 10, height: 10 } },
        { id: "fallback", label: "Fallback", position: { x: 300, y: 0 } },
      ], edges: [],
    }));
    const graph = createFlowGraph(document, new Map([
      ["measured" as never, { nodeId: "measured" as never, width: 40, height: 30 }],
    ]), new Map([["child" as never, { x: 9, y: 11 }]]));

    expect(graphNode(graph, "child" as never)?.absolutePosition).toEqual({ x: 109, y: 91 });
    expect(graphNode(graph, "child" as never)?.dimensions).toEqual({ width: 20, height: 12 });
    expect(graphNode(graph, "measured" as never)?.dimensions).toEqual({ width: 40, height: 30 });
    expect(graphNode(graph, "fallback" as never)?.dimensions).toEqual({ width: 150, height: 44 });
    expect(graphNodesIntersecting(graph, { x: 108, y: 91, width: 22, height: 12 }).map((node) => node.id)).toEqual(["child"]);
    expect(graphNodesIntersecting(graph, { x: 239, y: 25, width: 1, height: 1 }).map((node) => node.id)).toEqual(["measured"]);
    expect(graphNodesIntersecting(graph, { x: 449, y: 43, width: 1, height: 1 }).map((node) => node.id)).toEqual(["fallback"]);
    expect(graphBounds(graph)).toEqual({ x: 100, y: 0, width: 350, height: 103 });
  });

  it("excludes hidden descendants from spatial results while directed edges use document topology", () => {
    const document = Effect.runSync(decodeFlowDocument({
      nodes: [
        { id: "hidden", label: "Hidden", position: { x: 0, y: 0 }, hidden: true },
        { id: "descendant", label: "Descendant", parentId: "hidden", position: { x: 10, y: 10 } },
        { id: "visible", label: "Visible", position: { x: 30, y: 30 } },
      ],
      edges: [{ id: "hidden-to-visible", source: "descendant", target: "visible" }],
    }));
    const graph = createFlowGraph(document);

    expect(graphNodesIntersecting(graph, { x: 0, y: 0, width: 200, height: 100 }).map((node) => node.id)).toEqual(["visible"]);
    expect(graphIncomers(graph, "visible" as never).map((edge) => edge.id)).toEqual(["hidden-to-visible"]);
    expect(graphOutgoers(graph, "descendant" as never).map((edge) => edge.id)).toEqual(["hidden-to-visible"]);
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
