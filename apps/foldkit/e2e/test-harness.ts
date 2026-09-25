import { FlowChangeSchema, decodeFlowDocument, type Viewport } from "@flow/core";
import { Effect } from "effect";
import { Runtime } from "foldkit";
import type { ConformanceFixture } from "../../../packages/conformance/src/index.ts";
import { createProgram, HostAction, ports } from "../src/application.ts";
import "../src/style.css";

type FoldkitHarness = {
  mount(fixture: ConformanceFixture): Promise<void>;
  replaceDocument(document: unknown): void;
  replaceViewport(viewport: Viewport): void;
  changeKinds(): readonly string[];
  changes(): readonly EncodedFlowChange[];
  dispose(): void;
  finishDestroy(): Promise<{ readonly mountedElements: number; readonly changesAfterDestroy: number }>;
  destroy(): Promise<{ readonly mountedElements: number; readonly changesAfterDestroy: number }>;
};

declare global {
  interface Window { __flowFoldkitTest?: FoldkitHarness; }
}

let handle: Runtime.EmbedHandle<typeof ports> | undefined;
let unsubscribe: (() => void) | undefined;
let changesAtDispose = 0;
type EncodedFlowChange = typeof FlowChangeSchema.Encoded;
let changes: EncodedFlowChange[] = [];

const mount = async (fixture: ConformanceFixture): Promise<void> => {
  handle?.dispose();
  const container = document.querySelector<HTMLElement>("#app");
  if (container === null) throw new Error("Missing Foldkit test host");
  const decoded = Effect.runSync(decodeFlowDocument(fixture.document));
  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    fixture.allowedConnectionTargets ?? [],
    fixture.documentMode,
    fixture.viewportMode,
  );
  handle = Runtime.embed<typeof ports, never, "Element">(program);
  changes = [];
  unsubscribe = handle.ports.changes.subscribe((change) => changes.push(change));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const replaceDocument = (input: unknown): void => {
  const active = handle;
  if (active === undefined) throw new Error("Missing Foldkit runtime");
  const document = Effect.runSync(decodeFlowDocument(input));
  active.ports.actions.send(HostAction.ReplaceDocument({ document }));
};

const replaceViewport = (viewport: Viewport): void => {
  const active = handle;
  if (active === undefined) throw new Error("Missing Foldkit runtime");
  active.ports.actions.send(HostAction.ReplaceViewport({ viewport }));
};

const dispose = (): void => {
  changesAtDispose = changes.length;
  handle?.dispose();
  handle = undefined;
};

const finishDestroy = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const changesAfterDestroy = changes.length - changesAtDispose;
  unsubscribe?.();
  unsubscribe = undefined;
  return {
    mountedElements: document.querySelectorAll("[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']").length,
    changesAfterDestroy,
  };
};

const destroy = async () => {
  dispose();
  return finishDestroy();
};

window.__flowFoldkitTest = { mount, replaceDocument, replaceViewport, changeKinds: () => changes.map((change) => change.kind), changes: () => changes, dispose, finishDestroy, destroy };
