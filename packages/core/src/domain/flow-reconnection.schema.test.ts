import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import {
  canReconnectEdge,
  reconnectFlowEdge,
} from "./flow-reconnection.schema.ts";
import { applyEdgeReconnectChange } from "./flow-runtime.schema.ts";
import { EdgeIdSchema, HandleIdSchema, NodeIdSchema } from "./flow-values.ts";
import { decodeFlowDocument } from "./flow.schema.ts";
import type { FlowEdge } from "./flow.schema.ts";

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: "first",
        label: "First",
        position: { x: 0, y: 0 },
        handles: [{ id: "out", kind: "source", side: "right" }],
      },
      {
        id: "second",
        label: "Second",
        position: { x: 100, y: 0 },
        handles: [{ id: "in", kind: "target", side: "left" }],
      },
      {
        id: "third",
        label: "Third",
        position: { x: 200, y: 0 },
        handles: [{ id: "in", kind: "target", side: "left" }],
      },
      {
        id: "fourth",
        label: "Fourth",
        position: { x: 300, y: 0 },
        handles: [{ id: "out", kind: "source", side: "right" }],
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "first",
        sourceHandle: "out",
        target: "second",
        targetHandle: "in",
        label: "Message",
        markerEnd: "arrowclosed",
        path: "bezier",
        selected: true,
      },
      {
        id: "edge-2",
        source: "first",
        sourceHandle: "out",
        target: "third",
        targetHandle: "in",
      },
    ],
  })
);

const firstEdgeId = S.decodeSync(EdgeIdSchema)("edge-1");

const inHandle = S.decodeSync(HandleIdSchema)("in");

const outHandle = S.decodeSync(HandleIdSchema)("out");

describe("edge reconnection", () => {
  it("replaces a source while preserving ID and edge metadata", () => {
    const replacement = Effect.runSync(
      reconnectFlowEdge(
        document,
        firstEdgeId,
        "source",
        S.decodeSync(NodeIdSchema)("fourth"),
        outHandle
      )
    );

    expect(replacement).toMatchObject({
      id: "edge-1",
      source: "fourth",
      sourceHandle: "out",
      target: "second",
      label: "Message",
      markerEnd: "arrowclosed",
      path: "bezier",
      selected: true,
    });

    if (replacement === undefined) {
      throw new Error("Expected edge replacement");
    }

    const updated = applyEdgeReconnectChange(document, {
      kind: "edge-reconnect",
      edge: replacement,
    });

    expect(updated?.edges[0]).toBe(replacement);
    expect(updated?.edges[1]).toBe(document.edges[1]);
    expect(document.edges[0]?.source).toBe("first");
  });

  it("rejects a duplicate or wrong-kind endpoint", () => {
    const third = S.decodeSync(NodeIdSchema)("third");

    expect(
      Effect.runSync(
        Effect.flip(
          reconnectFlowEdge(document, firstEdgeId, "target", third, inHandle)
        )
      ).reason
    ).toBe("duplicate-connection");
    expect(
      Effect.runSync(
        Effect.flip(
          reconnectFlowEdge(document, firstEdgeId, "target", third, outHandle)
        )
      ).reason
    ).toBe("missing-target-handle");
  });

  it("limits reconnection to the declared endpoint", () => {
    const [edge, other] = document.edges;

    if (edge === undefined || other === undefined) {
      throw new Error("Expected two edges");
    }

    const sourceOnly: FlowEdge = { ...edge, reconnectable: "source" };

    expect(canReconnectEdge(sourceOnly, "source")).toBeTruthy();
    expect(canReconnectEdge(sourceOnly, "target")).toBeFalsy();
    expect(
      Effect.runSync(
        reconnectFlowEdge(
          { ...document, edges: [sourceOnly, other] },
          firstEdgeId,
          "target",
          S.decodeSync(NodeIdSchema)("third"),
          inHandle
        )
      )
    ).toBeUndefined();
  });

  it("treats the same endpoint and missing edge as no-ops", () => {
    expect(
      Effect.runSync(
        reconnectFlowEdge(
          document,
          firstEdgeId,
          "target",
          S.decodeSync(NodeIdSchema)("second"),
          inHandle
        )
      )
    ).toBeUndefined();

    expect(
      Effect.runSync(
        reconnectFlowEdge(
          document,
          S.decodeSync(EdgeIdSchema)("missing"),
          "target",
          S.decodeSync(NodeIdSchema)("second"),
          inHandle
        )
      )
    ).toBeUndefined();
  });
});
