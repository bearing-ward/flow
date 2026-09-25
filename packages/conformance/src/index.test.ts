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
        readonly input?: { readonly viewport?: { readonly width: number; readonly height: number } };
        readonly observed: Readonly<Record<string, unknown>>;
      }[];
    };
    expect(captures.fixtureVersion).toBe(1);
    expect(captures.reference.commit).toBe("0a1f9575b25679f2880175de8d3eae21aedde921");
    expect(captures.captures).toHaveLength(3);
    const locked = captures.captures.find(({ id }) => id === "xyflow-draggable-false");
    const customHandle = captures.captures.find(({ id }) => id === "xyflow-custom-drag-handle");
    expect(locked?.observed.before).toBe(locked?.observed.after);
    expect(locked?.observed.transformChanged).toBe(false);
    expect(customHandle?.observed.initial).toBe(customHandle?.observed.afterOutsideHandle);
    expect(customHandle?.observed.outsideHandleTransformChanged).toBe(false);
    expect(customHandle?.observed.initial).not.toBe(customHandle?.observed.afterHandle);
    expect(customHandle?.observed.handleTransformChanged).toBe(true);

    const leftResize = captures.captures.find(({ id }) => id === "xyflow-left-resize-direct-child");
    expect(leftResize?.input?.viewport).toEqual({ width: 960, height: 640 });
    const leftResizeCaptures = leftResize?.observed.captures as readonly {
      readonly normalized: {
        readonly parent: { readonly position: { readonly x: number; readonly y: number }; readonly size: { readonly width: number; readonly height: number } };
        readonly child: { readonly worldPosition: { readonly x: number; readonly y: number }; readonly localPosition: { readonly x: number; readonly y: number } };
      };
    }[] | undefined;
    expect(leftResizeCaptures).toHaveLength(2);
    const normalized = leftResizeCaptures!.map(({ normalized: result }) => result);
    expect(normalized[0]).toEqual(normalized[1]);
    expect(normalized[0]).toEqual({
      parent: { position: { x: 100, y: 100 }, size: { width: 70, height: 60 } },
      child: { worldPosition: { x: 95, y: 115 }, localPosition: { x: -5, y: 15 } },
    });
  });
});
