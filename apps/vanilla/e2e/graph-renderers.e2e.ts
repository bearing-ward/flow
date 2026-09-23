import type { FlowChange } from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const reset = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => globalThis.dispatchEvent(new Event("beforeunload")));
};

test("nested nodes move in absolute space and publish local positions", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const controller = mountFlow(root, {
      nodes: [
        { id: "parent", label: "Parent", position: { x: 100, y: 120 }, size: { width: 220, height: 160 }, selected: true },
        { id: "child", label: "Child", parentId: "parent", position: { x: 20, y: 30 }, size: { width: 80, height: 40 }, selected: true },
      ],
      edges: [],
    }, {
      documentMode: "uncontrolled",
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowChanges = [];
    controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
    globalThis.flowController = controller;
  });

  const parent = page.locator('[data-node-id="parent"]');
  const child = page.locator('[data-node-id="child"]');
  await expect(parent).toHaveCSS("width", "220px");
  await expect(child).toHaveCSS("width", "80px");
  const beforeParent = await parent.boundingBox();
  const beforeChild = await child.boundingBox();
  if (beforeParent === null || beforeChild === null) throw new Error("Missing nested node bounds");
  await page.mouse.move(beforeParent.x + 80, beforeParent.y + 50);
  await page.mouse.down();
  await page.mouse.move(beforeParent.x + 105, beforeParent.y + 70);
  await page.mouse.up();
  await expect.poll(async () => (await parent.boundingBox())?.x).toBe(beforeParent.x + 25);
  await expect.poll(async () => (await child.boundingBox())?.x).toBe(beforeChild.x + 25);
  await expect.poll(() => page.evaluate(() => globalThis.flowChanges)).toContainEqual({
    kind: "node-positions",
    positions: [{ nodeId: "parent", position: { x: 125, y: 140 } }],
  });
  await expect.poll(() => page.evaluate(() => globalThis.flowChanges)).toHaveLength(1);
});

test("typed node and edge renderers keep host interactions and clean up by key", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const testGlobal = globalThis as typeof globalThis & { rendererLifecycle?: string[] };
    testGlobal.rendererLifecycle = [];
    globalThis.flowChanges = [];
    const renderNode = (name: string) => (node: { id: string; data?: { text?: string } }, content: HTMLElement) => {
      testGlobal.rendererLifecycle?.push(`mount:${name}:${node.id}`);
      const label = globalThis.document.createElement("strong");
      label.dataset.customNode = name;
      content.append(label);
      const update = (next: { data?: { text?: string } }) => {
        label.textContent = next.data?.text ?? "custom";
        testGlobal.rendererLifecycle?.push(`update:${name}`);
      };
      update(node);
      return {
        update,
        destroy: () => testGlobal.rendererLifecycle?.push(`destroy:${name}`),
      };
    };
    const controller = mountFlow(root, {
      nodes: [
        { id: "source", label: "Source", position: { x: 100, y: 120 }, type: "alpha", data: { text: "first" }, size: { width: 120, height: 70 }, handles: [{ id: "out", kind: "source", side: "right" }] },
        { id: "target", label: "Target", position: { x: 360, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
      ],
      edges: [{ id: "edge", source: "source", sourceHandle: "out", target: "target", targetHandle: "in", type: "custom" }],
    }, {
      documentMode: "controlled",
      connectOnClick: true,
      renderOnlyVisible: true,
      nodeRenderers: { alpha: renderNode("alpha"), beta: renderNode("beta") },
      edgeRenderers: {
        custom: {
          geometry: (_edge: never, endpoints: { source: { x: number; y: number }; target: { x: number; y: number } }) => ({ pathData: `M${endpoints.source.x},${endpoints.source.y}L${endpoints.target.x},${endpoints.target.y}`, labelAnchor: { x: 250, y: 155 } }),
          render: (edge: { id: string }, context: { source: { x: number; y: number }; target: { x: number; y: number } }, visual: SVGGElement) => {
            testGlobal.rendererLifecycle?.push(`mount:edge:${edge.id}`);
            const circle = globalThis.document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", String((context.source.x + context.target.x) / 2));
            circle.setAttribute("cy", String((context.source.y + context.target.y) / 2));
            circle.setAttribute("r", "5");
            visual.append(circle);
            return {
              update: (_next: never, nextContext: typeof context) => circle.setAttribute("cx", String((nextContext.source.x + nextContext.target.x) / 2)),
              destroy: () => testGlobal.rendererLifecycle?.push(`destroy:edge:${edge.id}`),
            };
          },
        },
      },
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
    globalThis.flowController = controller;
  });

  const source = page.locator('.flow-node[data-node-id="source"]');
  const edgePath = page.locator('[data-edge-id="edge"] .flow-edge-hit');
  await expect(source).toHaveCSS("width", "120px");
  await expect(source.locator("[data-custom-node='alpha']")).toHaveText("first");
  await expect(source.locator(".flow-handle")).toHaveCount(1);
  await expect(edgePath).toHaveAttribute("d", /^M/u);
  await expect(page.locator(".flow-edge-custom-visual circle")).toHaveCount(1);

  await source.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => globalThis.flowChanges)).toContainEqual({ kind: "node-selection", nodeId: "source", selected: true });
  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [
      { id: "source", label: "Source", position: { x: 100, y: 120 }, type: "alpha", data: { text: "updated" }, size: { width: 120, height: 70 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "target", label: "Target", position: { x: 360, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ],
    edges: [],
  }));
  const sourceHandle = await source.locator('[data-kind="source"]').boundingBox();
  const targetHandle = await page.locator('.flow-node[data-node-id="target"] [data-kind="target"]').boundingBox();
  if (sourceHandle === null || targetHandle === null) throw new Error("Missing connection handles");
  await page.mouse.move(sourceHandle.x + sourceHandle.width / 2, sourceHandle.y + sourceHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetHandle.x + targetHandle.width / 2, targetHandle.y + targetHandle.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => globalThis.flowChanges)).toContainEqual(expect.objectContaining({ kind: "edge-add" }));

  await source.locator("[data-custom-node='alpha']").evaluate((element) => {
    (element as HTMLElement).dataset.identity = "kept";
  });
  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [
      { id: "source", label: "Source", position: { x: 100, y: 120 }, type: "alpha", data: { text: "updated" }, size: { width: 120, height: 70 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "target", label: "Target", position: { x: 360, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ],
    edges: [{ id: "edge", source: "source", sourceHandle: "out", target: "target", targetHandle: "in", type: "custom" }],
  }));
  await expect(source.locator("[data-custom-node='alpha']")).toHaveText("updated");
  await expect(source.locator("[data-custom-node='alpha']")).toHaveAttribute("data-identity", "kept");

  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [
      { id: "source", label: "Source fallback", position: { x: 100, y: 120 }, type: "beta", data: { text: "second" }, size: { width: 120, height: 70 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "target", label: "Target", position: { x: 360, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ],
    edges: [{ id: "edge", source: "source", sourceHandle: "out", target: "target", targetHandle: "in", type: "custom" }],
  }));
  await expect(source.locator("[data-custom-node='beta']")).toHaveText("second");
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { rendererLifecycle?: string[] }).rendererLifecycle)).toContain("destroy:alpha");

  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: -2000, y: -2000, zoom: 1 }));
  await expect(page.locator(".flow-node")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { rendererLifecycle?: string[] }).rendererLifecycle)).toContain("destroy:beta");
  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 }));
  await expect(page.locator('.flow-node[data-node-id="source"] [data-custom-node="beta"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { rendererLifecycle?: string[] }).rendererLifecycle?.filter((entry) => entry === "mount:beta:source").length)).toBe(2);

  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [
      { id: "source", label: "Unknown fallback", position: { x: 100, y: 120 }, type: "unknown", size: { width: 120, height: 70 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "target", label: "Target", position: { x: 360, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ],
    edges: [{ id: "edge", source: "source", sourceHandle: "out", target: "target", targetHandle: "in", type: "custom" }],
  }));
  await expect(source).toContainText("Unknown fallback");
  await expect(source.locator("[data-custom-node]")).toHaveCount(0);
  await page.evaluate(() => globalThis.flowController?.destroy());
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { rendererLifecycle?: string[] }).rendererLifecycle)).toContain("destroy:edge:edge");
});

test("toolbar anchors follow viewport, drag, culling, and graph removal", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const testGlobal = globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string; position: { x: number; y: number } }[]; edges: { id: string; position: { x: number; y: number } }[] } };
    const controller = mountFlow(root, {
      nodes: [
        { id: "a", label: "A", position: { x: 100, y: 100 }, size: { width: 100, height: 60 } },
        { id: "b", label: "B", position: { x: 300, y: 100 }, size: { width: 100, height: 60 } },
      ],
      edges: [{ id: "ab", source: "a", target: "b" }],
    }, {
      documentMode: "uncontrolled",
      renderOnlyVisible: true,
      onToolbarAnchors: (anchors: NonNullable<typeof testGlobal.toolbarAnchors>) => { testGlobal.toolbarAnchors = anchors; },
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowController = controller;
  });
  const initial = await page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string; position: { x: number; y: number } }[]; edges: { id: string; position: { x: number; y: number } }[] } }).toolbarAnchors);
  expect(initial?.nodes.find((anchor) => anchor.id === "a")?.position).toEqual({ x: 150, y: 100 });
  expect(initial?.edges.find((anchor) => anchor.id === "ab")?.position).toEqual({ x: 250, y: 130 });

  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: 20, y: 30, zoom: 2 }));
  const zoomed = await page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string; position: { x: number; y: number } }[]; edges: { id: string; position: { x: number; y: number } }[] } }).toolbarAnchors);
  expect(zoomed?.nodes.find((anchor) => anchor.id === "a")?.position).toEqual({ x: 320, y: 230 });
  expect(zoomed?.edges.find((anchor) => anchor.id === "ab")?.position).toEqual({ x: 520, y: 290 });

  const node = page.locator('.flow-node[data-node-id="a"]');
  const box = await node.boundingBox();
  if (box === null) throw new Error("Missing node bounds");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.up();
  await expect.poll(async () => page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string; position: { x: number; y: number } }[] } }).toolbarAnchors?.nodes.find((anchor) => anchor.id === "a")?.position.x)).toBe(330);

  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: 2000, y: 2000, zoom: 1 }));
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string }[]; edges: { id: string }[] } }).toolbarAnchors)).toEqual({ nodes: [], edges: [] });
  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: 20, y: 30, zoom: 2 }));

  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [{ id: "a", label: "A", position: { x: 110, y: 110 }, hidden: true, size: { width: 100, height: 60 } }, { id: "b", label: "B", position: { x: 300, y: 100 }, size: { width: 100, height: 60 } }],
    edges: [{ id: "ab", source: "a", target: "b" }],
  }));
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string; position: { x: number; y: number } }[]; edges: { id: string }[] } }).toolbarAnchors)).toEqual({ nodes: [{ id: "b", position: { x: 720, y: 230 } }], edges: [] });
  await page.evaluate(() => globalThis.flowController?.update({ nodes: [], edges: [] }));
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { toolbarAnchors?: { nodes: { id: string }[]; edges: { id: string }[] } }).toolbarAnchors)).toEqual({ nodes: [], edges: [] });
  await page.evaluate(() => globalThis.flowController?.destroy());
});
