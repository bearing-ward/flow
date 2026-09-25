import type { FlowChange } from "@flow/core";

import type { JavaScriptFlowController } from "../src/public.ts";

declare global {
  var detachedCanvas: HTMLElement | undefined;
  var detachedNode: HTMLElement | undefined;
  var flowChanges: FlowChange[] | undefined;
  var flowController: JavaScriptFlowController | undefined;
  var flowTestPendingFrames: Set<number> | undefined;
  var flowAuthoritativeNodes: Array<{ id: string; position: { x: number; y: number }; size?: { width: number; height: number } }> | undefined;
}
