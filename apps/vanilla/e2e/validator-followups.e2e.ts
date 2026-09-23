import type * as CoreModule from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const mountValidatorScenario = async (
  page: Page,
  initialEdge: boolean
): Promise<void> => {
  await page.goto("/");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await expect(page.getByTestId("flow-canvas")).toHaveCount(0);

  await page.evaluate(async (withInitialEdge) => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing flow host");
    }

    const controller = mountFlow(
      root,
      {
        nodes: [
          {
            id: "source",
            label: "Source",
            position: { x: 100, y: 120 },
            handles: [{ id: "out", kind: "source", side: "right" }],
          },
          ...[
            { id: "original", x: 350, y: 120 },
            { id: "blocked", x: 600, y: 120 },
            { id: "throws", x: 600, y: 300 },
            { id: "allowed", x: 350, y: 300 },
          ].map(({ id, x, y }) => ({
            id,
            label: id,
            position: { x, y },
            handles: [
              { id: "in", kind: "target" as const, side: "left" as const },
            ],
          })),
        ],
        edges: withInitialEdge
          ? [
              {
                id: "edge-1",
                source: "source",
                target: "original",
                selected: true,
              },
            ]
          : [],
      },
      {
        documentMode: "uncontrolled",
        connectOnClick: true,
        isValidConnection: (candidate: CoreModule.FlowConnection) => {
          if (candidate.target === "throws") {
            throw new Error("validator failure");
          }

          return candidate.target === "allowed";
        },
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
  }, initialEdge);
};

const centerOf = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox();

  if (box === null) {
    throw new Error(`Missing bounds for ${selector}`);
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const reconnectTarget = async (page: Page, nodeId: string): Promise<void> => {
  const start = await centerOf(
    page,
    '[data-testid="flow-edge-reconnect-anchor"][data-endpoint="target"]'
  );

  const target = await centerOf(
    page,
    `[data-node-id="${nodeId}"] [data-handle-id="in"]`
  );

  expect(
    await page.evaluate(
      ({ x, y }) => globalThis.document.elementFromPoint(x, y)?.outerHTML,
      start
    )
  ).toContain("flow-edge-reconnect-anchor");

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
};

test("validator rejection and failure preserve the edge during reconnection", async ({
  page,
}) => {
  await mountValidatorScenario(page, true);
  const path = page.getByTestId("flow-edge-path");
  const initialPath = await path.getAttribute("d");

  await reconnectTarget(page, "blocked");
  await expect(path).toHaveAttribute("d", initialPath ?? "");
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([]);

  await reconnectTarget(page, "throws");
  await expect(path).toHaveAttribute("d", initialPath ?? "");
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([]);

  await reconnectTarget(page, "allowed");
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([
      {
        kind: "edge-reconnect",
        edge: { id: "edge-1", source: "source", target: "allowed" },
      },
    ]);
  expect(await path.getAttribute("d")).not.toBe(initialPath);
});

test("throwing click validator leaves the canvas usable for a later connection", async ({
  page,
}) => {
  await mountValidatorScenario(page, false);

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]');

  const failing = page.locator('[data-node-id="throws"] [data-handle-id="in"]');

  const allowed = page.locator(
    '[data-node-id="allowed"] [data-handle-id="in"]'
  );

  await source.click();
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await failing.click();
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
  await expect(page.locator(".flow-edge-group")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([]);

  await source.click();
  await allowed.click();
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges))
    .toMatchObject([
      {
        kind: "edge-add",
        edge: { source: "source", target: "allowed" },
      },
    ]);
});
