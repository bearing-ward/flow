import { Effect } from "effect";
import {
  decodeFlowDocument,
  type FlowChange,
  type FlowDocument,
} from "@flow/core";
import {
  createFlow,
  mountFlow,
  type JavaScriptFlowController,
} from "@flow/vanilla";

const document: FlowDocument = Effect.runSync(decodeFlowDocument({
  nodes: [{ id: "consumer-node", label: "Consumer", position: { x: 10, y: 20 } }],
  edges: [],
}));

const viewport = {
  mode: "uncontrolled" as const,
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.5, maxZoom: 2 },
};
const options = { documentMode: "controlled" as const, viewport };
const onChange = (_change: FlowChange): void => undefined;

export const syncMount: typeof mountFlow = mountFlow;
export const asyncMount: typeof createFlow = createFlow;
export const controllerPromise: Promise<JavaScriptFlowController> = createFlow(
  globalThis.document.body,
  document,
  { ...options, onChange }
);
