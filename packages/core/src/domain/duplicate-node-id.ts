import { Schema } from "effect";

import { NodeIdSchema } from "./flow-values.ts";

const tagged = Schema.TaggedError;

export class DuplicateNodeId extends tagged<DuplicateNodeId>()(
  "DuplicateNodeId",
  {
    nodeId: NodeIdSchema,
  }
) {}
