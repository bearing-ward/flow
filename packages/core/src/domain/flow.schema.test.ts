import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  DuplicateEdgeId,
  DuplicateHandleId,
  DuplicateNodeId,
  MissingEdgeEndpoint,
  MissingEdgeHandle,
  MissingParentNode,
  ParentCycle,
  ParentExtentWithoutParent,
  SelfParentNode,
  decodeFlowDocument,
  validateFlowDocument,
} from "./flow.schema.ts";

describe("FlowDocumentSchema", () => {
  it("decodes a document with one node", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [],
        nodes: [
          { id: "node-1", position: { x: 120, y: 80 }, label: "First node" },
        ],
      })
    );

    expect(document.nodes[0]?.label).toBe("First node");
  });

  it("rejects an empty node identifier", () => {
    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: "", position: { x: 120, y: 80 }, label: "Invalid node" },
          ],
        })
      )
    );

    expect(result._tag).toBe("Failure");
  });

  it("accepts a reordered nested graph with declared renderer fields", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [{ id: "edge", source: "child", target: "root", type: "custom" }],
        nodes: [
          {
            id: "child",
            label: "Child",
            position: { x: 5, y: 7 },
            parentId: "root",
            extent: "parent",
            size: { width: 80, height: 40 },
            type: "card",
            data: { status: "ready", values: [1, true, null] },
            zIndex: 2,
          },
          { id: "root", label: "Root", position: { x: 10, y: 20 } },
        ],
      })
    );

    expect(document.nodes[0]?.parentId).toBe("root");
    expect(document.nodes[0]?.position).toEqual({ x: 5, y: 7 });
    expect(document.edges[0]?.type).toBe("custom");
  });

  it("accepts nonempty custom descriptions and per-node drag locking", () => {
    const document = Effect.runSync(decodeFlowDocument({
      edges: [], nodes: [{ id: "locked", label: "Locked", position: { x: 0, y: 0 }, draggable: false, ariaDescription: "Cannot be moved" }],
    }));
    expect(document.nodes[0]).toMatchObject({ draggable: false, ariaDescription: "Cannot be moved" });
    expect(Effect.runSync(Effect.exit(decodeFlowDocument({
      edges: [], nodes: [{ id: "bad", label: "Bad", position: { x: 0, y: 0 }, ariaDescription: "" }],
    })))._tag).toBe("Failure");
  });

  it("rejects missing, self, and cyclic parents and root parent extents", () => {
    const invalidCases = [
      {
        nodes: [{ id: "child", label: "Child", position: { x: 0, y: 0 }, parentId: "absent" }],
        error: MissingParentNode,
      },
      {
        nodes: [{ id: "self", label: "Self", position: { x: 0, y: 0 }, parentId: "self" }],
        error: SelfParentNode,
      },
      {
        nodes: [
          { id: "one", label: "One", position: { x: 0, y: 0 }, parentId: "two" },
          { id: "two", label: "Two", position: { x: 0, y: 0 }, parentId: "three" },
          { id: "three", label: "Three", position: { x: 0, y: 0 }, parentId: "one" },
        ],
        error: ParentCycle,
      },
      {
        nodes: [{ id: "root", label: "Root", position: { x: 0, y: 0 }, extent: "parent" }],
        error: ParentExtentWithoutParent,
      },
    ];

    for (const invalid of invalidCases) {
      const error = Effect.runSync(
        Effect.flip(decodeFlowDocument({ edges: [], nodes: invalid.nodes }))
      );
      expect(error).toBeInstanceOf(invalid.error);
    }
  });

  it("rejects non-JSON node data", () => {
    const data: Record<string, unknown> = { valid: true };
    data.self = data;
    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          edges: [],
          nodes: [{ id: "node", label: "Node", position: { x: 0, y: 0 }, data }],
        })
      )
    );

    expect(result._tag).toBe("Failure");
  });

  it("rejects duplicate node identifiers", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: "node-1", position: { x: 0, y: 0 }, label: "First" },
            { id: "node-1", position: { x: 10, y: 10 }, label: "Duplicate" },
          ],
        })
      )
    );

    if (!(error instanceof DuplicateNodeId)) {
      throw new Error("Expected DuplicateNodeId");
    }

    expect(error.nodeId).toBe("node-1");
  });

  it("rejects ambiguous handle declarations on one node", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [],
          nodes: [
            {
              id: "node-1",
              label: "One",
              position: { x: 0, y: 0 },
              handles: [
                { id: "port", kind: "source", side: "right" },
                { id: "port", kind: "target", side: "left" },
              ],
            },
          ],
        })
      )
    );

    expect(error).toBeInstanceOf(DuplicateHandleId);
  });

  it("rejects an edge referencing a missing or wrong-kind handle", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [
            {
              id: "edge-1",
              source: "first",
              sourceHandle: "in",
              target: "second",
              targetHandle: "in",
            },
          ],
          nodes: [
            {
              id: "first",
              label: "First",
              position: { x: 0, y: 0 },
              handles: [{ id: "in", kind: "target", side: "left" }],
            },
            {
              id: "second",
              label: "Second",
              position: { x: 100, y: 0 },
              handles: [{ id: "in", kind: "target", side: "left" }],
            },
          ],
        })
      )
    );

    expect(error).toBeInstanceOf(MissingEdgeHandle);
  });

  it("rejects duplicate edge identifiers", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [
            { id: "edge-1", source: "source", target: "target" },
            { id: "edge-1", source: "target", target: "source" },
          ],
          nodes: [
            { id: "source", position: { x: 0, y: 0 }, label: "Source" },
            { id: "target", position: { x: 10, y: 10 }, label: "Target" },
          ],
        })
      )
    );

    if (!(error instanceof DuplicateEdgeId)) {
      throw new Error("Expected DuplicateEdgeId");
    }

    expect(error.edgeId).toBe("edge-1");
  });

  it("rejects an edge with a missing source node", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [{ id: "edge-1", source: "missing", target: "target" }],
          nodes: [
            { id: "target", position: { x: 10, y: 10 }, label: "Target" },
          ],
        })
      )
    );

    if (!(error instanceof MissingEdgeEndpoint)) {
      throw new Error("Expected MissingEdgeEndpoint");
    }

    expect(error.edgeId).toBe("edge-1");
    expect(error.endpoint).toBe("source");
    expect(error.nodeId).toBe("missing");
  });

  it("rejects an edge with a missing target node", () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [{ id: "edge-1", source: "source", target: "missing" }],
          nodes: [{ id: "source", position: { x: 0, y: 0 }, label: "Source" }],
        })
      )
    );

    if (!(error instanceof MissingEdgeEndpoint)) {
      throw new Error("Expected MissingEdgeEndpoint");
    }

    expect(error.edgeId).toBe("edge-1");
    expect(error.endpoint).toBe("target");
    expect(error.nodeId).toBe("missing");
  });

  it("preserves the identity of a valid typed document", () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [{ id: "edge-1", source: "node-1", target: "node-1" }],
        nodes: [{ id: "node-1", position: { x: 0, y: 0 }, label: "Node" }],
      })
    );

    const validated = Effect.runSync(validateFlowDocument(document));

    expect(validated).toBe(document);
  });
});
