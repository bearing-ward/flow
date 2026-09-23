import type * as CoreModule from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const mountGraph = async (
  page: Page,
  options: {
    documentMode?: "controlled" | "uncontrolled";
    selectionMode?: "full" | "partial";
    selected?: boolean;
  } = {}
): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await page.evaluate(async ({ documentMode, selectionMode, selected }) => {
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
            position: { x: 100, y: 180 },
            selected,
          },
          {
            id: "b",
            label: "Beta",
            position: { x: 350, y: 180 },
            selected,
          },
          { id: "c", label: "Gamma", position: { x: 650, y: 180 } },
        ],
        edges: [],
      },
      {
        documentMode: documentMode ?? "uncontrolled",
        selectionMode,
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
  }, options);
};

const touch = (x: number, y: number) => ({ x, y });

test("arrow keys move the selected group by 5 or 20 flow units", async ({
  page,
}) => {
  await mountGraph(page, { selected: true });
  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const beta = page.locator('.flow-node[data-node-id="b"]');
  const gamma = page.locator('.flow-node[data-node-id="c"]');

  await alpha.focus();
  await expect(alpha).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 105, y: 180 } },
        { nodeId: "b", position: { x: 355, y: 180 } },
      ],
    });
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 105, 180)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 355, 180)");

  await page.keyboard.press("Shift+ArrowDown");
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 105, y: 200 } },
        { nodeId: "b", position: { x: 355, y: 200 } },
      ],
    });
  await expect(gamma).toHaveCSS("transform", "matrix(1, 0, 0, 1, 650, 180)");
});

test("controlled keyboard movement waits for document acknowledgement", async ({
  page,
}) => {
  await mountGraph(page, { documentMode: "controlled", selected: true });
  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const beta = page.locator('.flow-node[data-node-id="b"]');

  await alpha.focus();
  await expect(alpha).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 105, y: 180 } },
        { nodeId: "b", position: { x: 355, y: 180 } },
      ],
    });
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 100, 180)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 350, 180)");

  await page.evaluate(() =>
    globalThis.flowController?.update({
      nodes: [
        {
          id: "a",
          label: "Alpha",
          position: { x: 105, y: 180 },
          selected: true,
        },
        {
          id: "b",
          label: "Beta",
          position: { x: 355, y: 180 },
          selected: true,
        },
        { id: "c", label: "Gamma", position: { x: 650, y: 180 } },
      ],
      edges: [],
    })
  );
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 105, 180)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 355, 180)");
});

test("dragging one selected node moves the selected group", async ({
  page,
}) => {
  await mountGraph(page, { selected: true });
  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const beta = page.locator('.flow-node[data-node-id="b"]');
  const box = await alpha.boundingBox();

  if (box === null) {
    throw new Error("Missing node bounds");
  }

  await page.mouse.move(box.x + 40, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 60);
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 160, 220)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 410, 220)");
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 160, y: 220 } },
        { nodeId: "b", position: { x: 410, y: 220 } },
      ],
    });
  await expect(page.locator('.flow-node[data-node-id="c"]')).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 650, 180)"
  );
});

test("partial rectangle selects a node with positive overlap", async ({
  page,
}) => {
  await mountGraph(page, { selectionMode: "partial" });
  const alpha = page.locator('.flow-node[data-node-id="a"]');

  await page.keyboard.down("Shift");
  await page.mouse.move(85, 165);
  await page.mouse.down();
  await page.mouse.move(115, 195);
  await expect(page.getByTestId("flow-selection-rect")).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect(alpha).toHaveClass(/selected/u);
  await expect(page.locator('.flow-node[data-node-id="b"]')).not.toHaveClass(
    /selected/u
  );
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({ kind: "selection-set", nodeIds: ["a"], edgeIds: [] });
});

test("selection near the pane edge pans until released", async ({ page }) => {
  await mountGraph(page);
  const canvas = page.getByTestId("flow-canvas");
  const box = await canvas.boundingBox();

  if (box === null) {
    throw new Error("Missing canvas bounds");
  }

  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + 450, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, box.y + 250);
  await expect
    .poll(() =>
      page
        .getByTestId("flow-viewport")
        .evaluate(
          (element) =>
            new DOMMatrixReadOnly(getComputedStyle(element).transform).m41
        )
    )
    .toBeLessThan(-15);
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.flowChanges?.some(
          (change) => change.kind === "viewport" && change.viewport.x < -15
        )
      )
    )
    .toBe(true);
});

test("real touch pan and pinch publish viewport changes", async ({ page }) => {
  await mountGraph(page);
  const session = await page.context().newCDPSession(page);

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(520, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [touch(550, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toMatchObject({ kind: "viewport", viewport: { x: 30, zoom: 1 } });

  await page.evaluate(() => {
    globalThis.flowChanges = [];
    globalThis.flowController?.updateViewport({ x: 0, y: 0, zoom: 1 });
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(400, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(400, 100), touch(600, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [touch(350, 100), touch(650, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [touch(650, 100)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toMatchObject({ kind: "viewport", viewport: { x: -250, zoom: 1.5 } });
});
