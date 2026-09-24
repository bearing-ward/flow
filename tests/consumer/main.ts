import { Effect } from "effect";
import { decodeFlowDocument } from "@flow/core";
import { createFlow } from "@flow/vanilla";
import "@flow/vanilla/style.css";

const document = Effect.runSync(decodeFlowDocument({
  nodes: [{ id: "packed-node", label: "Packed consumer", position: { x: 45, y: 60 } }],
  edges: [],
}));
const root = globalThis.document.querySelector<HTMLElement>("#root");
if (root === null) throw new Error("Missing consumer root");

const controller = await createFlow(root, document, {
  documentMode: "uncontrolled",
  viewport: {
    mode: "uncontrolled",
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
});

const browserState = globalThis as typeof globalThis & {
  __flowConsumerResult?: { readonly decodedNodeId: string; readonly canvasCount: number };
  __flowConsumerController?: typeof controller;
};
browserState.__flowConsumerController = controller;
browserState.__flowConsumerResult = {
  decodedNodeId: document.nodes[0]?.id ?? "missing",
  canvasCount: root.querySelectorAll("[data-testid='flow-canvas']").length,
};
