export type ConformanceDocument = {
  readonly nodes: readonly Record<string, unknown>[];
  readonly edges: readonly Record<string, unknown>[];
};

export type ConformanceViewport = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
};

export type ConformanceAction =
  | { readonly kind: "update-document"; readonly document: ConformanceDocument }
  | { readonly kind: "drag-node"; readonly nodeId: string; readonly dx: number; readonly dy: number; readonly cancel?: boolean }
  | { readonly kind: "connect"; readonly sourceNodeId: string; readonly sourceHandleId: string; readonly targetNodeId: string; readonly targetHandleId: string }
  | { readonly kind: "update-viewport"; readonly viewport: ConformanceViewport };

export type ConformanceFixture = {
  readonly version: 1;
  readonly id: string;
  readonly description: string;
  readonly documentMode: "controlled" | "uncontrolled";
  readonly viewportMode: "controlled" | "uncontrolled";
  readonly renderOnlyVisible?: boolean;
  readonly allowedConnectionTargets?: readonly string[];
  readonly document: ConformanceDocument;
  readonly actions: readonly ConformanceAction[];
  readonly expected: {
    readonly nodeIds: readonly string[];
    readonly edgeIds: readonly string[];
    readonly positions: readonly { readonly id: string; readonly x: number; readonly y: number }[];
    readonly changeKinds: readonly string[];
    readonly preservedIdentityIds?: readonly string[];
  };
};

export type ConformanceSnapshot = {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly positions: readonly { readonly id: string; readonly x: number; readonly y: number }[];
  readonly identityMarkers: readonly string[];
};

/** DOM selectors and browser-specific mechanics belong in an adapter implementation. */
export interface ConformanceAdapter {
  mount(fixture: ConformanceFixture): Promise<void>;
  perform(action: ConformanceAction): Promise<void>;
  snapshot(): Promise<ConformanceSnapshot>;
  markIdentity(nodeId: string, marker: string): Promise<void>;
  changeKinds(): Promise<readonly string[]>;
  destroy(): Promise<{ readonly mountedElements: number; readonly changesAfterDestroy: number }>;
}

export const conformanceFixtures: readonly ConformanceFixture[] = [
  {
    version: 1, id: "keyed-update", description: "Preserve keyed identity while replacing node order and labels.",
    documentMode: "controlled", viewportMode: "controlled",
    document: { edges: [], nodes: [
      { id: "first", label: "First", position: { x: 40, y: 50 } },
      { id: "second", label: "Second", position: { x: 260, y: 90 } },
    ] },
    actions: [{ kind: "update-document", document: { edges: [], nodes: [
      { id: "third", label: "Third", position: { x: 420, y: 150 } },
      { id: "first", label: "First updated", position: { x: 70, y: 65 } },
    ] } }],
    expected: { nodeIds: ["third", "first"], edgeIds: [], positions: [{ id: "third", x: 420, y: 150 }, { id: "first", x: 70, y: 65 }], changeKinds: [], preservedIdentityIds: ["first"] },
  },
  {
    version: 1, id: "nested-absolute-position", description: "Render a child at parent plus local position.",
    documentMode: "uncontrolled", viewportMode: "uncontrolled",
    document: { edges: [], nodes: [
      { id: "parent", label: "Parent", position: { x: 100, y: 110 } },
      { id: "child", label: "Child", parentId: "parent", position: { x: 25, y: 35 } },
    ] }, actions: [],
    expected: { nodeIds: ["parent", "child"], edgeIds: [], positions: [{ id: "parent", x: 100, y: 110 }, { id: "child", x: 125, y: 145 }], changeKinds: [] },
  },
  {
    version: 1, id: "controlled-acknowledgement", description: "Emit a drag candidate, wait for authoritative acknowledgement, then render it.",
    documentMode: "controlled", viewportMode: "controlled",
    document: { edges: [], nodes: [{ id: "move", label: "Move", position: { x: 80, y: 100 } }] },
    actions: [{ kind: "drag-node", nodeId: "move", dx: 40, dy: 20 }, { kind: "update-document", document: { edges: [], nodes: [{ id: "move", label: "Move", position: { x: 120, y: 120 } }] } }],
    expected: { nodeIds: ["move"], edgeIds: [], positions: [{ id: "move", x: 120, y: 120 }], changeKinds: ["node-position"] },
  },
  {
    version: 1, id: "connection-validity", description: "Reject a disallowed connection and accept the allowed target.",
    documentMode: "uncontrolled", viewportMode: "uncontrolled", allowedConnectionTargets: ["approved"],
    document: { edges: [], nodes: [
      { id: "source", label: "Source", position: { x: 80, y: 120 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "rejected", label: "Rejected", position: { x: 300, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
      { id: "approved", label: "Approved", position: { x: 520, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ] },
    actions: [
      { kind: "connect", sourceNodeId: "source", sourceHandleId: "out", targetNodeId: "rejected", targetHandleId: "in" },
      { kind: "connect", sourceNodeId: "source", sourceHandleId: "out", targetNodeId: "approved", targetHandleId: "in" },
    ],
    expected: { nodeIds: ["source", "rejected", "approved"], edgeIds: ["edge-1"], positions: [{ id: "source", x: 80, y: 120 }, { id: "rejected", x: 300, y: 120 }, { id: "approved", x: 520, y: 120 }], changeKinds: ["edge-add"] },
  },
  {
    version: 1, id: "gesture-cancellation", description: "Cancel a node drag without a semantic position change.",
    documentMode: "uncontrolled", viewportMode: "uncontrolled",
    document: { edges: [], nodes: [{ id: "cancel", label: "Cancel", position: { x: 100, y: 120 } }] },
    actions: [{ kind: "drag-node", nodeId: "cancel", dx: 80, dy: 40, cancel: true }],
    expected: { nodeIds: ["cancel"], edgeIds: [], positions: [{ id: "cancel", x: 100, y: 120 }], changeKinds: [] },
  },
  {
    version: 1, id: "viewport-culling", description: "Cull offscreen nodes and render them after viewport movement.",
    documentMode: "uncontrolled", viewportMode: "uncontrolled", renderOnlyVisible: true,
    document: { edges: [], nodes: [
      { id: "near", label: "Near", position: { x: 100, y: 100 } },
      { id: "far", label: "Far", position: { x: 1500, y: 100 } },
    ] },
    actions: [{ kind: "update-viewport", viewport: { x: -1300, y: 0, zoom: 1 } }],
    expected: { nodeIds: ["far"], edgeIds: [], positions: [{ id: "far", x: 1500, y: 100 }], changeKinds: [] },
  },
];

export const validateConformanceFixtures = (fixtures: readonly ConformanceFixture[]): void => {
  const ids = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.version !== 1 || fixture.id.length === 0 || ids.has(fixture.id)) {
      throw new Error(`Invalid or duplicate conformance fixture id: ${fixture.id}`);
    }
    ids.add(fixture.id);
  }
};
