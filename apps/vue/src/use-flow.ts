import type { FlowChange, FlowCommand, FlowDocument, FlowNode, Viewport } from "@flow/core";
import { computed, inject, type ComputedRef, type InjectionKey } from "vue";

export type FlowEditor = {
  readonly document: ComputedRef<FlowDocument>;
  readonly viewport: ComputedRef<Viewport>;
  readonly dispatch: (command: FlowCommand) => void;
  readonly updateDocument: (document: FlowDocument) => void;
  readonly updateViewport: (viewport: Viewport) => void;
  readonly publish: (change: FlowChange) => void;
};

export const FlowEditorKey: InjectionKey<FlowEditor> = Symbol("FlowEditor");

export type FlowNodeSlot = { readonly node: FlowNode };

export const useFlow = (): {
  readonly document: FlowEditor["document"];
  readonly nodes: ComputedRef<readonly FlowNode[]>;
  readonly viewport: FlowEditor["viewport"];
  readonly dispatch: FlowEditor["dispatch"];
  readonly updateDocument: FlowEditor["updateDocument"];
  readonly updateViewport: FlowEditor["updateViewport"];
} => {
  const editor = inject(FlowEditorKey);
  if (editor === undefined) throw new Error("useFlow must be called below FlowCanvas");
  return {
    document: editor.document,
    nodes: computed(() => editor.document.value.nodes),
    viewport: editor.viewport,
    dispatch: editor.dispatch,
    updateDocument: editor.updateDocument,
    updateViewport: editor.updateViewport,
  };
};
