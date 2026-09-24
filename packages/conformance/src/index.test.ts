import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { decodeFlowDocument } from "../../core/src/domain/flow.schema.ts";
import {
  conformanceFixtures,
  validateConformanceFixtures,
} from "./index.ts";

describe("shared conformance fixtures", () => {
  it("uses unique versioned fixture identifiers for the six shared scenarios", () => {
    expect(conformanceFixtures.map(({ id }) => id)).toEqual([
      "keyed-update",
      "nested-absolute-position",
      "controlled-acknowledgement",
      "connection-validity",
      "gesture-cancellation",
      "viewport-culling",
    ]);
    expect(() => validateConformanceFixtures(conformanceFixtures)).not.toThrow();
    expect(() => validateConformanceFixtures([conformanceFixtures[0]!, conformanceFixtures[0]!])).toThrow(/duplicate/u);
    expect(conformanceFixtures.every(({ version }) => version === 1)).toBe(true);
  });

  it("rejects duplicate node ids through the core document boundary", () => {
    const fixture = conformanceFixtures[0]!;
    const result = Effect.runSync(Effect.exit(decodeFlowDocument({
      ...fixture.document,
      nodes: [
        { id: "duplicate", label: "First", position: { x: 0, y: 0 } },
        { id: "duplicate", label: "Second", position: { x: 10, y: 10 } },
      ],
    })));
    expect(result._tag).toBe("Failure");
  });

  it("reloads pinned reference captures and validates normalized outcomes", () => {
    const captures = JSON.parse(readFileSync("research/fixtures/reference-captures.json", "utf8")) as {
      readonly fixtureVersion: number;
      readonly reference: { readonly commit: string };
      readonly captures: readonly {
        readonly id: string;
        readonly observed: Readonly<Record<string, unknown>>;
      }[];
    };
    expect(captures.fixtureVersion).toBe(1);
    expect(captures.reference.commit).toBe("0a1f9575b25679f2880175de8d3eae21aedde921");
    expect(captures.captures).toHaveLength(2);
    const locked = captures.captures.find(({ id }) => id === "xyflow-draggable-false");
    const customHandle = captures.captures.find(({ id }) => id === "xyflow-custom-drag-handle");
    expect(locked?.observed.before).toBe(locked?.observed.after);
    expect(locked?.observed.transformChanged).toBe(false);
    expect(customHandle?.observed.initial).toBe(customHandle?.observed.afterOutsideHandle);
    expect(customHandle?.observed.outsideHandleTransformChanged).toBe(false);
    expect(customHandle?.observed.initial).not.toBe(customHandle?.observed.afterHandle);
    expect(customHandle?.observed.handleTransformChanged).toBe(true);
  });
});
