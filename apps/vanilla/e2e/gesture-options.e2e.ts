import type * as CoreModule from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Scenario = "threshold" | "snap" | "extent" | "connection";

const mountScenario = async (page: Page, scenario: Scenario): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await page.evaluate(async (kind) => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing flow host");
    }

    const controller = mountFlow(
      root,
      {
        nodes:
          kind === "connection"
            ? [
                {
                  id: "source",
                  label: "Source",
                  position: { x: 120, y: 270 },
                  handles: [{ id: "out", kind: "source", side: "right" }],
                },
                {
                  id: "target",
                  label: "Target",
                  position: { x: 1250, y: 270 },
                  handles: [{ id: "in", kind: "target", side: "left" }],
                },
              ]
            : [
                {
                  id: "a",
                  label: "Alpha",
                  position: { x: kind === "snap" ? 103 : 120, y: 180 },
                  selected: kind === "snap",
                },
                {
                  id: "b",
                  label: "Beta",
                  position: { x: kind === "snap" ? 307 : 360, y: 180 },
                  selected: kind === "snap",
                },
              ],
        edges: [],
      },
      {
        documentMode: "uncontrolled",
        nodeDragThreshold: kind === "threshold" ? 8 : undefined,
        snapGrid: kind === "snap" ? { x: 10, y: 20 } : undefined,
        connectOnClick: kind === "connection",
        autoPanOnConnect: kind === "connection",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
          extent:
            kind === "extent"
              ? { minX: 0, minY: 0, maxX: 1200, maxY: 900 }
              : undefined,
        },
      }
    );

    globalThis.flowChanges = [];
    controller.subscribe((change: CoreModule.FlowChange) =>
      globalThis.flowChanges?.push(change)
    );
    globalThis.flowController = controller;
  }, scenario);
};

const centerOf = async (
  page: Page,
  selector: string
): Promise<{ x: number; y: number }> => {
  const box = await page.locator(selector).boundingBox();

  if (box === null) {
    throw new Error(`Missing bounds for ${selector}`);
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const viewport = (page: Page) =>
  page.getByTestId("flow-viewport").evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(
      globalThis.getComputedStyle(element).transform
    );

    return { x: matrix.m41, y: matrix.m42, zoom: matrix.a };
  });

test("node drag threshold keeps clicks and subthreshold movement semantic", async ({
  page,
}) => {
  await mountScenario(page, "threshold");
  const node = page.locator('[data-node-id="a"]');
  const start = await centerOf(page, '[data-node-id="a"]');

  await page.mouse.click(start.x, start.y);
  await expect(node).toHaveClass(/selected/u);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toStrictEqual([{ kind: "node-selection", nodeId: "a", selected: true }]);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y);
  await page.mouse.up();
  await expect(node).toHaveCSS("transform", "matrix(1, 0, 0, 1, 120, 180)");
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(1);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 9, start.y);
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-position",
      nodeId: "a",
      position: { x: 129, y: 180 },
    });
});

test("snap grid applies to selected group drag and keyboard movement", async ({
  page,
}) => {
  await mountScenario(page, "snap");
  const a = page.locator('[data-node-id="a"]');
  const start = await centerOf(page, '[data-node-id="a"]');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 17, start.y + 22);
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 120, y: 200 } },
        { nodeId: "b", position: { x: 324, y: 200 } },
      ],
    });
  await a.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-positions",
      positions: [
        { nodeId: "a", position: { x: 130, y: 200 } },
        { nodeId: "b", position: { x: 330, y: 200 } },
      ],
    });
});

test("pan extent constrains pointer pan and anchored wheel zoom", async ({
  page,
}) => {
  await mountScenario(page, "extent");
  const canvas = page.getByTestId("flow-canvas");
  const box = await canvas.boundingBox();

  if (box === null) {
    throw new Error("Missing canvas bounds");
  }

  const { width, height } = box;
  await page.mouse.move(700, 500);
  await page.mouse.down();
  await page.mouse.move(900, 590);
  await page.mouse.up();
  await expect
    .poll(() => viewport(page))
    .toStrictEqual({ x: 0, y: 0, zoom: 1 });

  await page.mouse.move(800, 500);
  await page.mouse.down();
  await page.mouse.move(100, 100);
  await page.mouse.up();
  await expect
    .poll(() => viewport(page))
    .toStrictEqual({
      x: width - 1200,
      y: height - 900,
      zoom: 1,
    });

  await page.mouse.move(820, 520);
  await page.mouse.wheel(0, -1000);
  await expect
    .poll(async () => {
      const current = await viewport(page);

      return current.zoom;
    })
    .toBe(2);
  const zoomed = await viewport(page);
  expect(zoomed.x).toBeGreaterThanOrEqual(width - 2400);
  expect(zoomed.x).toBeLessThanOrEqual(0);
  expect(zoomed.y).toBeGreaterThanOrEqual(height - 1800);
  expect(zoomed.y).toBeLessThanOrEqual(0);
});

test("connection auto-pan reaches a distant target and commits an edge", async ({
  page,
}) => {
  await mountScenario(page, "connection");

  const source = await centerOf(
    page,
    '[data-node-id="source"] [data-handle-id="out"]'
  );

  const canvas = await page.getByTestId("flow-canvas").boundingBox();

  if (canvas === null) {
    throw new Error("Missing canvas bounds");
  }

  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await page.mouse.move(canvas.x + canvas.width - 8, source.y);
  await expect
    .poll(async () => {
      const current = await viewport(page);

      return current.x;
    })
    .toBeLessThan(-550);

  await page.mouse.move(canvas.x + canvas.width / 2, source.y);

  const target = await centerOf(
    page,
    '[data-node-id="target"] [data-handle-id="in"]'
  );

  expect(
    await page.evaluate(
      ({ x, y }) =>
        globalThis.document
          .elementFromPoint(x, y)
          ?.closest<HTMLElement>(".flow-handle")?.dataset.handleId,
      target
    )
  ).toBe("in");

  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.flowChanges?.map((change) => change.kind))
    )
    .toContain("edge-add");
  const finalViewport = await viewport(page);
  expect(finalViewport.x).toBeLessThan(-550);
});

test("two-click connection exposes pending state and supports cancellation", async ({
  page,
}) => {
  await mountScenario(page, "connection");
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]');
  const target = page.locator('[data-node-id="target"] [data-handle-id="in"]');
  await source.click();
  await expect(source).toHaveClass(/connecting/u);
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(source).not.toHaveClass(/connecting/u);
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0);

  await source.click();
  await source.click();
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
  await source.click();
  await page.evaluate(() =>
    globalThis.flowController?.updateViewport({ x: -500, y: 0, zoom: 1 })
  );
  await target.click();
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe("edge-add");
});
