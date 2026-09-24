import { decodeFlowDocument, type FlowDocument } from "@flow/core";
import { Effect } from "effect";
import { createApp, defineComponent, h, ref } from "vue";
import { FlowCanvas } from "./FlowCanvas.ts";
import "./style.css";

const initial = Effect.runSync(decodeFlowDocument({
  nodes: [
    { id: "input", label: "Input", position: { x: 80, y: 120 }, handles: [{ id: "out", kind: "source", side: "right" }] },
    { id: "output", label: "Output", position: { x: 360, y: 220 }, handles: [{ id: "in", kind: "target", side: "left" }] },
  ],
  edges: [],
}));

const Demo = defineComponent({
  setup() {
    const document = ref<FlowDocument>(initial);
    const blocked = ref(false);
    return () => h("main", [
      h("header", [h("h1", "Flow Vue adapter"), h("p", "Vue owns rendering and lifetime; Flow core owns graph types and transitions.")]),
      h("div", { class: "flow-vue-actions" }, [
        h("button", { onClick: () => { blocked.value = !blocked.value; } }, blocked.value ? "Allow connections" : "Block connections"),
        h("button", { onClick: () => { document.value = Effect.runSync(decodeFlowDocument({ ...document.value, nodes: [...document.value.nodes, { id: `node-${document.value.nodes.length}`, label: "New node", position: { x: 600, y: 120 } }] })); } }, "Add node"),
      ]),
      h(FlowCanvas, {
        document: document.value,
        documentMode: "controlled",
        "onUpdate:document": (next) => { document.value = next; },
        isValidConnection: (target: string) => !blocked.value || target !== "output",
      }),
    ]);
  },
});

createApp(Demo).mount("#app");
