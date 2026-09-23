import { Schema } from "effect";

import { EdgeIdSchema } from "./flow-values.ts";

const tagged = Schema.TaggedError;

export class DuplicateEdgeId extends tagged<DuplicateEdgeId>()(
  "DuplicateEdgeId",
  {
    edgeId: EdgeIdSchema,
  }
) {}
