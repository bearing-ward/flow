import { decodeFlowDocument } from "@flow/core";
import { Effect } from "effect";
import { Runtime } from "foldkit";
import { createProgram } from "./application.ts";
import "./style.css";

const document = Effect.runSync(decodeFlowDocument({
  nodes: [
    { id: "source", label: "Source", position: { x: 100, y: 120 }, handles: [{ id: "out", kind: "source", side: "right" }] },
    { id: "target", label: "Target", position: { x: 420, y: 250 }, handles: [{ id: "in", kind: "target", side: "left" }] },
  ],
  edges: [],
}));

const container = globalThis.document.querySelector<HTMLElement>("#app");
const program = createProgram(container, document, { x: 0, y: 0, zoom: 1 }, ["target"]);
Runtime.run(program);
