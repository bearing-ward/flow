import type { FlowChange } from "@flow/core";

import type { JavaScriptFlowController } from "../src/public.ts";

declare global {
  var detachedCanvas: HTMLElement | undefined;
  var detachedNode: HTMLElement | undefined;
  var flowChanges: FlowChange[] | undefined;
  var flowController: JavaScriptFlowController | undefined;
}
