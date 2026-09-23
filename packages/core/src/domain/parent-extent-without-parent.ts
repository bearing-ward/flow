import { Schema } from "effect";

import { NodeIdSchema } from "./flow-values.ts";

const tagged = Schema.TaggedError;

export class ParentExtentWithoutParent extends tagged<ParentExtentWithoutParent>()(
  "ParentExtentWithoutParent",
  { nodeId: NodeIdSchema }
) {}
