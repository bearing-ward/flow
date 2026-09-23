import type * as CoreModule from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Scenario =
  | "extent-single"
  | "extent-group"
  | "fit"
  | "radius"
  | "validator"
  | "keyboard";

const mountScenario = async (page: Page, scenario: Scenario): Promise<void> => {
  await page.goto("/");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await expect(page.locator(".flow-demo-panel")).toBeVisible();
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await expect(page.getByTestId("flow-canvas")).toHaveCount(0);
  await expect(page.locator(".flow-demo-panel")).toHaveCount(0);
  await page.evaluate(async (kind) => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");

    if (root === null) {
      throw new Error("Missing flow host");
    }

    const connectionScenario =
      kind === "radius" || kind === "validator" || kind === "keyboard";

    const controller = mountFlow(
      root,
      {
        nodes: connectionScenario
          ? [
              {
                id: "source",
                label: "Source",
                position: { x: 100, y: 200 },
                handles: [{ id: "out", kind: "source", side: "right" }],
              },
              {
                id: "rejected",
                label: "Rejected",
                position: { x: 350, y: 200 },
                handles: [{ id: "in", kind: "target", side: "left" }],
              },
              {
                id: "approved",
                label: "Approved",
                position: { x: 600, y: 200 },
                handles: [{ id: "in", kind: "target", side: "left" }],
              },
            ]
          : [
              {
                id: "a",
                label: "Alpha",
                position: { x: 100, y: 100 },
                selected: kind === "extent-group",
              },
              {
                id: "b",
                label: "Beta",
                position: {
                  x: kind === "fit" ? 1500 : 300,
                  y: kind === "fit" ? 300 : 100,
                },
                selected: kind === "extent-group",
              },
            ],
        edges: [],
      },
      {
        documentMode: "uncontrolled",
        nodeExtent: kind.startsWith("extent")
          ? { minX: 0, minY: 0, maxX: 500, maxY: 400 }
          : undefined,
        connectionRadius: kind === "radius" ? 30 : undefined,
        isValidConnection:
          kind === "validator"
            ? (candidate: CoreModule.FlowConnection) =>
                candidate.target === "approved"
            : undefined,
        connectOnClick: kind === "keyboard" || kind === "validator",
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.25, maxZoom: 2 },
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

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
};

const position = (page: Page, nodeId: string) =>
  page.locator(`[data-node-id="${nodeId}"]`).evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(
      globalThis.getComputedStyle(element).transform
    );

    return { x: matrix.m41, y: matrix.m42 };
  });

test("node extent keeps a complete node inside its bounds during drag", async ({
  page,
}) => {
  await mountScenario(page, "extent-single");
  const start = await centerOf(page, '[data-node-id="a"]');
  await drag(page, start, { x: start.x + 500, y: start.y + 500 });
  await expect
    .poll(() => position(page, "a"))
    .toStrictEqual({ x: 350, y: 356 });
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)))
    .toStrictEqual({
      kind: "node-position",
      nodeId: "a",
      position: { x: 350, y: 356 },
    });
});

test("node extent preserves group spacing and constrains keyboard movement", async ({
  page,
}) => {
  await mountScenario(page, "extent-group");
  const start = await centerOf(page, '[data-node-id="a"]');
  await drag(page, start, { x: start.x + 500, y: start.y });
  await expect
    .poll(() => position(page, "a"))
    .toStrictEqual({ x: 150, y: 100 });
  await expect
    .poll(() => position(page, "b"))
    .toStrictEqual({ x: 350, y: 100 });

  await page.locator('[data-node-id="a"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => position(page, "a"))
    .toStrictEqual({ x: 150, y: 100 });
  await expect
    .poll(() => position(page, "b"))
    .toStrictEqual({ x: 350, y: 100 });
});

test("fitView shows measured distant nodes and supports selected-node fit", async ({
  page,
}) => {
  await mountScenario(page, "fit");
  await expect(page.locator('[data-node-id="a"]')).toHaveAttribute(
    "data-measured-width",
    "150"
  );
  await expect(page.locator('[data-node-id="b"]')).toHaveAttribute(
    "data-measured-width",
    "150"
  );
  await page.evaluate(() => globalThis.flowController?.fitView());
  const canvas = await page.getByTestId("flow-canvas").boundingBox();
  const first = await page.locator('[data-node-id="a"]').boundingBox();
  const second = await page.locator('[data-node-id="b"]').boundingBox();

  if (canvas === null || first === null || second === null) {
    throw new Error("Missing fitView bounds");
  }

  expect(first.x).toBeGreaterThanOrEqual(canvas.x);
  expect(second.x + second.width).toBeLessThanOrEqual(canvas.x + canvas.width);
  await page.locator('[data-node-id="a"]').click();
  await page.evaluate(() =>
    globalThis.flowController?.fitView({ nodes: "selected" })
  );
  const selected = await page.locator('[data-node-id="a"]').boundingBox();

  if (selected === null) {
    throw new Error("Missing selected node bounds");
  }

  expect(selected.x).toBeGreaterThan(canvas.x + canvas.width / 4);
  expect(selected.x + selected.width).toBeLessThan(
    canvas.x + (canvas.width * 3) / 4
  );
});

test("Fit graph demo action fits the current graph", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Fit graph" });
  await expect(button).toBeVisible();
  await button.click();
  await expect
    .poll(() =>
      page
        .getByTestId("flow-viewport")
        .evaluate(
          (element) =>
            new DOMMatrixReadOnly(
              globalThis.getComputedStyle(element).transform
            ).a
        )
    )
    .toBeLessThan(1);
  await expect(page.locator(".flow-demo-note")).toContainText(
    "Fit graph uses measured sizes"
  );
  await expect(button).toHaveAttribute("aria-current", "true");

  const block = page.getByRole("button", { name: "Block Output connections" });
  await block.click();
  await expect(
    page.getByRole("button", { name: "Allow Output connections" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".flow-demo-description")).toContainText(
    "new links into Output are rejected"
  );
  await expect(page.locator(".flow-demo-note")).toContainText(
    "The rule rejects that new edge"
  );
  await page.getByRole("button", { name: "Allow Output connections" }).click();
  await expect(
    page.getByRole("button", { name: "Block Output connections" })
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".flow-demo-description")).toContainText(
    "Connection rule off"
  );
  await expect(page.locator(".flow-demo-note")).toContainText(
    "A duplicate endpoint pair is still rejected"
  );
});

test("connection radius accepts a nearby release outside a target handle", async ({
  page,
}) => {
  await mountScenario(page, "radius");

  const source = await centerOf(
    page,
    '[data-node-id="source"] [data-handle-id="out"]'
  );

  const target = await centerOf(
    page,
    '[data-node-id="rejected"] [data-handle-id="in"]'
  );

  await drag(page, source, { x: target.x, y: target.y + 35 });
  await expect(page.locator(".flow-edge-group")).toHaveCount(0);

  const near = { x: target.x, y: target.y + 20 };
  expect(
    await page.evaluate(
      ({ x, y }) =>
        globalThis.document.elementFromPoint(x, y)?.closest(".flow-handle") ===
        null,
      near
    )
  ).toBe(true);
  await drag(page, source, near);
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe("edge-add");
});

test("custom connection validator rejects one target and accepts another", async ({
  page,
}) => {
  await mountScenario(page, "validator");

  const source = await centerOf(
    page,
    '[data-node-id="source"] [data-handle-id="out"]'
  );

  const rejected = await centerOf(
    page,
    '[data-node-id="rejected"] [data-handle-id="in"]'
  );

  await drag(page, source, rejected);
  await expect(page.locator(".flow-edge-group")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.flowChanges?.length)).toBe(0);

  const approved = await centerOf(
    page,
    '[data-node-id="approved"] [data-handle-id="in"]'
  );

  await drag(page, source, approved);
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe("edge-add");
});

test("custom connection validator also applies to two-click connections", async ({
  page,
}) => {
  await mountScenario(page, "validator");
  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]');

  const rejected = page.locator(
    '[data-node-id="rejected"] [data-handle-id="in"]'
  );

  const approved = page.locator(
    '[data-node-id="approved"] [data-handle-id="in"]'
  );

  await source.click();
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await rejected.click();
  await expect(page.locator(".flow-edge-group")).toHaveCount(0);

  await source.click();
  await approved.click();
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe("edge-add");
});

test("keyboard activates focused source and target handles in click mode", async ({
  page,
}) => {
  await mountScenario(page, "keyboard");
  await expect(
    page.locator('.flow-node[data-node-id="source"]')
  ).toHaveAttribute("data-measured-width", "150");
  await expect(
    page.locator('.flow-node[data-node-id="rejected"]')
  ).toHaveAttribute("data-measured-width", "150");

  const source = page.locator('[data-node-id="source"] [data-handle-id="out"]');

  const target = page.locator(
    '[data-node-id="rejected"] [data-handle-id="in"]'
  );

  await source.focus();
  await expect(source).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await expect(source).toHaveClass(/connecting/u);
  await expect(source).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("flow-connection-preview")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.locator('.flow-node[data-node-id="rejected"]')
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("flow-connection-preview")).toHaveCount(0);
  await expect(page.locator(".flow-edge-group")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => globalThis.flowChanges?.at(-1)?.kind))
    .toBe("edge-add");
});
