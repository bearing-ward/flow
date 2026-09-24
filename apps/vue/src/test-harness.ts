import { decodeFlowDocument, type FlowDocument, type FlowEdge, type FlowNode, type Viewport } from "@flow/core";
import { Effect } from "effect";
import { createApp, defineComponent, h, nextTick, onMounted, onUnmounted, ref, type App, type PropType } from "vue";
import type { ConformanceFixture } from "../../../packages/conformance/src/index.ts";
import { FlowCanvas } from "./FlowCanvas.ts";
import { useFlow } from "./use-flow.ts";
import "./style.css";

type TestApi = {
  mount(fixture: ConformanceFixture): void;
  updateDocument(document: unknown): void;
  updateViewport(viewport: Viewport): void;
  changeKinds(): readonly string[];
  destroy(): { readonly mountedElements: number; readonly changesAfterDestroy: number };
  smoke(): Promise<{ readonly leftCount: string | null; readonly rightCount: string | null; readonly labelUpdated: boolean; readonly edgeUpdated: boolean; readonly identityPreserved: boolean; readonly mounted: number; readonly unmounted: number; readonly edgeMounted: number; readonly edgeUnmounted: number; readonly remaining: number }>;
  startSplitModel(): void;
  updateSplitDocument(document: unknown): void;
  splitModelSnapshot(): { readonly initialRendered: boolean; readonly nodeUpdateAcknowledged: boolean; readonly edgeUpdateAcknowledged: boolean; readonly documentUpdateAcknowledged: boolean; readonly identityPreserved: boolean };
  readonly changes: string[];
};

declare global {
  interface Window { __flowVueTest?: TestApi; }
}

let app: App | undefined;
let documentState = ref<FlowDocument>(Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] })));
let viewportState = ref<Viewport>({ x: 0, y: 0, zoom: 1 });
let allowedTargets = ref<readonly string[]>();
let cullOffscreen = ref(false);
let documentMode = ref<"controlled" | "uncontrolled">("controlled");
let viewportMode = ref<"controlled" | "uncontrolled">("controlled");
let changes: string[] = [];
let splitNodeUpdates = 0;
let splitEdgeUpdates = 0;
let splitDocumentUpdater: ((document: FlowDocument) => void) | undefined;

const Component = defineComponent({
  name: "FlowVueTestRoot",
  setup() {
    return () => h(FlowCanvas, {
      document: documentState.value,
      documentMode: documentMode.value,
      viewport: viewportState.value,
      viewportMode: viewportMode.value,
      renderOnlyVisible: cullOffscreen.value,
      onChange: (change: { kind: string }) => { changes.push(change.kind); },
      isValidConnection: (target: string) => allowedTargets.value === undefined || allowedTargets.value.includes(target),
    });
  },
});

const api: TestApi = {
  mount(fixture) {
    app?.unmount();
    documentState.value = Effect.runSync(decodeFlowDocument(fixture.document));
    allowedTargets.value = fixture.allowedConnectionTargets;
    cullOffscreen.value = fixture.renderOnlyVisible === true;
    documentMode.value = fixture.documentMode;
    viewportMode.value = fixture.viewportMode;
    viewportState.value = { x: 0, y: 0, zoom: 1 };
    changes = [];
    app = createApp(Component);
    app.mount("#app");
  },
  updateDocument(document) {
    documentState.value = Effect.runSync(decodeFlowDocument(document));
  },
  updateViewport(viewport) { viewportState.value = viewport; },
  changeKinds() { return [...new Set(changes)]; },
  destroy() {
    const changesBeforeDestroy = changes.length;
    app?.unmount();
    app = undefined;
    document.querySelector("#app")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const mountedElements = document.querySelectorAll("[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']").length;
    return { mountedElements, changesAfterDestroy: changes.length - changesBeforeDestroy };
  },
  async smoke() {
    app?.unmount();
    const left = ref(Effect.runSync(decodeFlowDocument({ nodes: [{ id: "left-a", label: "Left A", position: { x: 20, y: 30 } }, { id: "left-b", label: "Left B", position: { x: 240, y: 30 } }], edges: [{ id: "left-edge", source: "left-a", target: "left-b", label: "Edge old" }] })));
    const right = ref(Effect.runSync(decodeFlowDocument({ nodes: [{ id: "right-a", label: "Right A", position: { x: 20, y: 120 } }], edges: [] })));
    let mounted = 0;
    let unmounted = 0;
    let edgeMounted = 0;
    let edgeUnmounted = 0;
    const Visual = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        const flow = useFlow();
        onMounted(() => { mounted += 1; });
        onUnmounted(() => { unmounted += 1; });
        return () => h("span", { "data-flow-count": flow.nodes.value.length }, props.node.label);
      },
    });
    const EdgeVisual = defineComponent({
      props: { edge: { type: Object as PropType<FlowEdge>, required: true } },
      setup(props) {
        onMounted(() => { edgeMounted += 1; });
        onUnmounted(() => { edgeUnmounted += 1; });
        return () => h("text", { "data-edge-label": true }, props.edge.label);
      },
    });
    const Root = defineComponent({
      setup() { return () => h("div", [
        h(FlowCanvas, { document: left.value, documentMode: "controlled", nodeComponent: Visual, edgeComponent: EdgeVisual, "onUpdate:document": (value) => { left.value = value; } }),
        h(FlowCanvas, { document: right.value, documentMode: "controlled", nodeComponent: Visual, "onUpdate:document": (value) => { right.value = value; } }),
      ]); },
    });
    app = createApp(Root);
    app.mount("#app");
    const identity = document.querySelector("[data-node-id='left-a']");
    identity?.setAttribute("data-identity", "left");
    left.value = { ...left.value, nodes: [{ ...left.value.nodes[0]!, label: "Left A updated" }, left.value.nodes[1]!], edges: [{ ...left.value.edges[0]!, label: "Edge updated" }] };
    await nextTick();
    const results = {
      leftCount: document.querySelector("[data-node-id='left-a'] [data-flow-count]")?.getAttribute("data-flow-count") ?? null,
      rightCount: document.querySelector("[data-node-id='right-a'] [data-flow-count]")?.getAttribute("data-flow-count") ?? null,
      labelUpdated: document.querySelector("[data-node-id='left-a']")?.textContent?.includes("Left A updated") ?? false,
      edgeUpdated: document.querySelector("[data-edge-id='left-edge'] [data-edge-label]")?.textContent === "Edge updated",
      identityPreserved: document.querySelector("[data-node-id='left-a']")?.getAttribute("data-identity") === "left",
      mounted,
    };
    app.unmount();
    app = undefined;
    await nextTick();
    return { ...results, unmounted, edgeMounted, edgeUnmounted, remaining: document.querySelectorAll("[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']").length };
  },
  startSplitModel() {
    app?.unmount();
    const initial = Effect.runSync(decodeFlowDocument({ nodes: [
      { id: "split-a", label: "Split A", position: { x: 20, y: 30 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "split-b", label: "Split B", position: { x: 240, y: 30 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ], edges: [] }));
    const nodes = ref<readonly FlowNode[]>(initial.nodes);
    const edges = ref<readonly FlowEdge[]>([]);
    splitNodeUpdates = 0;
    splitEdgeUpdates = 0;
    splitDocumentUpdater = undefined;
    const SplitNode = defineComponent({
      props: { node: { type: Object as PropType<FlowNode>, required: true } },
      setup(props) {
        splitDocumentUpdater = useFlow().updateDocument;
        return () => h("span", props.node.label);
      },
    });
    const Root = defineComponent({
      setup() {
        return () => h(FlowCanvas, {
          nodes: nodes.value,
          edges: edges.value,
          nodeComponent: SplitNode,
          "onUpdate:nodes": (next: readonly FlowNode[]) => { splitNodeUpdates += 1; nodes.value = next; },
          "onUpdate:edges": (next: readonly FlowEdge[]) => { splitEdgeUpdates += 1; edges.value = next; },
        });
      },
    });
    app = createApp(Root);
    app.mount("#app");
  },
  updateSplitDocument(document) {
    const update = splitDocumentUpdater;
    if (update === undefined) throw new Error("Split FlowCanvas updateDocument action is unavailable");
    update(Effect.runSync(decodeFlowDocument(document)));
  },
  splitModelSnapshot() {
    const node = document.querySelector("[data-node-id='split-a']");
    return {
      initialRendered: document.querySelectorAll("[data-node-id]").length === 2,
      nodeUpdateAcknowledged: splitNodeUpdates >= 1 && node?.getAttribute("style")?.includes("left: 90px") === true,
      edgeUpdateAcknowledged: splitEdgeUpdates >= 1 && document.querySelector("[data-edge-id]") !== null,
      documentUpdateAcknowledged: splitNodeUpdates === 2 && splitEdgeUpdates === 2
        && node?.textContent?.includes("Updated split A") === true
        && node?.getAttribute("style")?.includes("left: 90px") === true
        && document.querySelector("[data-edge-id='split-replacement-edge']") !== null,
      identityPreserved: node?.getAttribute("data-identity") === "caller-node",
    };
  },
  get changes() { return changes; },
};

window.__flowVueTest = api;
