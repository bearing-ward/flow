import { Schema } from "effect";

import { NodeIdSchema } from "./flow-values.ts";

const tagged = Schema.TaggedError;

export class ParentCycle extends tagged<ParentCycle>()("ParentCycle", {
  nodeId: NodeIdSchema,
}) {}
