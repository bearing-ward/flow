import type * as CoreModule from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const resetDemo = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
};

test("controlled node selection waits for acknowledgement and keeps focus", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            position: { x: 100, y: 160 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          {
            id: "b",
            label: "Beta",
            position: { x: 380, y: 160 },
            handles: [{ id: "in", kind: "target", side: "left" }],
          },
        ],
        edges: [{ id: "ab", source: "a", target: "b", selected: true }],
      },
      {
        documentMode: "controlled",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );

    globalThis.flowChanges = [];
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    );
    globalThis.flowController = controller;
  });

  const node = page.locator('.flow-node[data-node-id="a"]');
  const edge = page.locator('.flow-edge-group[data-edge-id="ab"]');
  await expect(edge).toHaveClass(/selected/u);
  await node.click();
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toStrictEqual([{ kind: "node-selection", nodeId: "a", selected: true }]);
  await expect(node).not.toHaveClass(/selected/u);
  await expect(edge).toHaveClass(/selected/u);

  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: "a",
          label: "Alpha",
          position: { x: 100, y: 160 },
          handles: [{ id: "out", kind: "source", side: "right" }],
          selected: true,
        },
        {
          id: "b",
          label: "Beta",
          position: { x: 380, y: 160 },
          handles: [{ id: "in", kind: "target", side: "left" }],
        },
      ],
      edges: [{ id: "ab", source: "a", target: "b", selected: false }],
    })
  );
  await expect(node).toHaveClass(/selected/u);
  await expect(node).toHaveAttribute("aria-pressed", "true");
  await expect(edge).not.toHaveClass(/selected/u);
  await expect(node).toBeFocused();
});

test("selected edge rises in keyed order and retains focus", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            position: { x: 100, y: 160 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          {
            id: "b",
            label: "Beta",
            position: { x: 430, y: 160 },
            handles: [{ id: "in", kind: "target", side: "left" }],
          },
        ],
        edges: [
          { id: "low", source: "a", target: "b", zIndex: 0 },
          { id: "high", source: "a", target: "b", zIndex: 2 },
        ],
      },
      {
        documentMode: "uncontrolled",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );

    globalThis.flowController = controller;
  });

  const low = page.locator('.flow-edge-group[data-edge-id="low"]');

  const order = () =>
    page
      .locator(".flow-edges .flow-edge-group")
      .evaluateAll((groups) => groups.map((group) => group.dataset.edgeId));

  await expect.poll(order).toStrictEqual(["low", "high"]);
  await low.focus();
  await page.keyboard.press("Enter");
  await expect(low).toHaveClass(/selected/u);
  await expect.poll(order).toStrictEqual(["high", "low"]);
  await expect(low).toBeFocused();

  const high = page.locator('.flow-edge-group[data-edge-id="high"]');
  await high.focus();
  await page.keyboard.down("Control");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Control");
  await expect(low).toHaveClass(/selected/u);
  await expect(high).toHaveClass(/selected/u);
});

test("culling responds to zoom, drag completion, and viewport return", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    globalThis.flowController = mountFlow(
      root,
      {
        nodes: [
          { id: "near", label: "Near", position: { x: 100, y: 180 } },
          { id: "middle", label: "Middle", position: { x: 700, y: 180 } },
          {
            id: "cross-source",
            label: "Cross source",
            position: { x: -300, y: 420 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          {
            id: "cross-target",
            label: "Cross target",
            position: { x: 1400, y: 420 },
            handles: [{ id: "in", kind: "target", side: "left" }],
          },
          ...Array.from({ length: 200 }, (_, index) => ({
            id: `far-${index}`,
            label: `Far ${index}`,
            position: { x: 3000 + index * 200, y: 180 },
          })),
        ],
        edges: [
          {
            id: "crossing",
            source: "cross-source",
            sourceHandle: "out",
            target: "cross-target",
            targetHandle: "in",
          },
        ],
      },
      {
        documentMode: "uncontrolled",
        renderOnlyVisible: true,
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );
  });

  const near = page.locator('.flow-node[data-node-id="near"]');
  const middle = page.locator('.flow-node[data-node-id="middle"]');
  const crossing = page.locator('.flow-edge-group[data-edge-id="crossing"]');
  const crossSource = page.locator('.flow-node[data-node-id="cross-source"]');
  const crossTarget = page.locator('.flow-node[data-node-id="cross-target"]');
  const unrelated = page.locator('.flow-node[data-node-id="far-0"]');
  await expect(middle).toHaveCount(1);
  await expect(crossing).toHaveCount(1);
  await expect(crossSource).toHaveAttribute("data-measured-width", "150");
  await expect(crossTarget).toHaveAttribute("data-measured-width", "150");
  await expect(page.locator(".flow-node")).toHaveCount(4);
  await expect(unrelated).toHaveCount(0);
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 2 })
  );
  await expect(middle).toHaveCount(0);
  await expect(crossing).toHaveCount(0);
  await expect(page.locator(".flow-node")).toHaveCount(1);
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -3000, y: 0, zoom: 1 })
  );
  await expect(crossing).toHaveCount(0);
  await expect(unrelated).toHaveCount(1);
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 })
  );
  await expect(crossing).toHaveCount(1);
  await expect(unrelated).toHaveCount(0);
  await expect(middle).toHaveCount(1);
  await expect(crossing).toHaveCount(1);
  await expect(page.locator(".flow-node")).toHaveCount(4);

  const box = await near.boundingBox();

  if (box === null) {
    throw new Error("Missing near node bounds");
  }

  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 1100, box.y + 20);
  await page.mouse.up();
  await expect(near).toHaveCount(0);
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -1000, y: 0, zoom: 1 })
  );
  await expect(near).toHaveCount(1);
});

test("culling keeps the semantic visible set for a 1,000-node graph", async ({ page }) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");

    globalThis.flowController = mountFlow(root, {
      nodes: [
        { id: "near", label: "Near", position: { x: 100, y: 180 } },
        { id: "cross-source", label: "Cross source", position: { x: -300, y: 420 }, handles: [{ id: "out", kind: "source", side: "right" }] },
        { id: "cross-target", label: "Cross target", position: { x: 1400, y: 420 }, handles: [{ id: "in", kind: "target", side: "left" }] },
        ...Array.from({ length: 997 }, (_, index) => ({
          id: `far-${index}`, label: `Far ${index}`, position: { x: 3000 + index * 200, y: 180 },
        })),
      ],
      edges: [{ id: "crossing", source: "cross-source", sourceHandle: "out", target: "cross-target", targetHandle: "in" }],
    }, {
      documentMode: "uncontrolled",
      renderOnlyVisible: true,
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
  });

  const near = page.locator('.flow-node[data-node-id="near"]');
  const far = page.locator('.flow-node[data-node-id="far-0"]');
  const source = page.locator('.flow-node[data-node-id="cross-source"]');
  const target = page.locator('.flow-node[data-node-id="cross-target"]');
  const crossing = page.locator('.flow-edge-group[data-edge-id="crossing"]');
  await expect(near).toHaveCount(1);
  await expect(far).toHaveCount(0);
  await expect(source).toHaveCount(1);
  await expect(target).toHaveCount(1);
  await expect(crossing).toHaveCount(1);

  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: -3000, y: 0, zoom: 1 }));
  await expect(far).toHaveCount(1);
  await expect(near).toHaveCount(0);
  await expect(crossing).toHaveCount(0);

  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 }));
  await expect(near).toHaveCount(1);
  await expect(far).toHaveCount(0);
  await expect(source).toHaveCount(1);
  await expect(target).toHaveCount(1);
  await expect(crossing).toHaveCount(1);
});

test("hidden nodes suppress connected edges and return after update", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    globalThis.flowController = mountFlow(
      root,
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            position: { x: 100, y: 180 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          {
            id: "b",
            label: "Beta",
            position: { x: 420, y: 180 },
            handles: [{ id: "in", kind: "target", side: "left" }],
            hidden: true,
          },
        ],
        edges: [{ id: "ab", source: "a", target: "b" }],
      },
      {
        documentMode: "controlled",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );
  });

  const beta = page.locator('.flow-node[data-node-id="b"]');
  const edge = page.locator('.flow-edge-group[data-edge-id="ab"]');
  await expect(beta).toHaveCount(0);
  await expect(edge).toHaveCount(0);

  const updateVisibility = async (hidden: boolean): Promise<void> => {
    await page.evaluate(
      (nextHidden) =>
        globalThis.flowController?.update({
          nodes: [
            {
              id: "a",
              label: "Alpha",
              position: { x: 100, y: 180 },
              handles: [{ id: "out", kind: "source", side: "right" }],
            },
            {
              id: "b",
              label: "Beta",
              position: { x: 420, y: 180 },
              handles: [{ id: "in", kind: "target", side: "left" }],
              hidden: nextHidden,
            },
          ],
          edges: [{ id: "ab", source: "a", target: "b" }],
        }),
      hidden
    );
  };

  await updateVisibility(false);
  await expect(beta).toHaveCount(1);
  await expect(edge).toHaveCount(1);
  await beta.focus();
  await updateVisibility(true);
  await expect(beta).toHaveCount(0);
  await expect(edge).toHaveCount(0);
  await expect(page.getByTestId("flow-canvas")).toBeFocused();
});

test("modifier clicks toggle nodes and Shift rectangle selects enclosed nodes and edges", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: "a",
            label: "Alpha",
            position: { x: 100, y: 200 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          {
            id: "b",
            label: "Beta",
            position: { x: 350, y: 200 },
            handles: [{ id: "in", kind: "target", side: "left" }],
          },
          { id: "c", label: "Gamma", position: { x: 650, y: 200 } },
        ],
        edges: [{ id: "ab", source: "a", target: "b" }],
      },
      {
        documentMode: "uncontrolled",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );

    globalThis.flowChanges = [];
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    );
  });

  const a = page.locator('.flow-node[data-node-id="a"]');
  const b = page.locator('.flow-node[data-node-id="b"]');
  const c = page.locator('.flow-node[data-node-id="c"]');
  const edge = page.locator('.flow-edge-group[data-edge-id="ab"]');

  await a.click();
  await page.keyboard.down("Control");
  await b.click();
  await expect(a).toHaveClass(/selected/u);
  await expect(b).toHaveClass(/selected/u);
  await a.click();
  await page.keyboard.up("Control");
  await expect(a).not.toHaveClass(/selected/u);
  await expect(b).toHaveClass(/selected/u);

  await page.keyboard.down("Shift");
  await page.mouse.move(80, 160);
  await page.mouse.down();
  await page.mouse.move(550, 290);
  await expect(page.getByTestId("flow-selection-rect")).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect(page.getByTestId("flow-selection-rect")).toHaveCount(0);
  await expect(a).toHaveClass(/selected/u);
  await expect(b).toHaveClass(/selected/u);
  await expect(c).not.toHaveClass(/selected/u);
  await expect(edge).toHaveClass(/selected/u);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "selection-set",
      nodeIds: ["a", "b"],
      edgeIds: ["ab"],
    });

  await page.mouse.click(850, 400);
  await expect(a).not.toHaveClass(/selected/u);
  await expect(b).not.toHaveClass(/selected/u);
  await expect(edge).not.toHaveClass(/selected/u);
});

test("controlled rectangle selection waits for a document update", async ({
  page,
}) => {
  await resetDemo(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing host");
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          { id: "a", label: "Alpha", position: { x: 120, y: 200 } },
          { id: "b", label: "Beta", position: { x: 370, y: 200 } },
        ],
        edges: [],
      },
      {
        documentMode: "controlled",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );

    globalThis.flowChanges = [];
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    );
    globalThis.flowController = controller;
  });

  await page.keyboard.down("Shift");
  await page.mouse.move(80, 160);
  await page.mouse.down();
  await page.mouse.move(560, 290);
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toStrictEqual([
      {
        kind: "selection-set",
        nodeIds: ["a", "b"],
        edgeIds: [],
      },
    ]);
  await expect(page.locator(".flow-node.selected")).toHaveCount(0);
  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: "a",
          label: "Alpha",
          position: { x: 120, y: 200 },
          selected: true,
        },
        {
          id: "b",
          label: "Beta",
          position: { x: 370, y: 200 },
          selected: true,
        },
      ],
      edges: [],
    })
  );
  await expect(page.locator(".flow-node.selected")).toHaveCount(2);
});
