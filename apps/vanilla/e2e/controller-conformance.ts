import type { FlowChange } from "@flow/core";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const documentWith = (
  nodes: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly label: string;
  }[]
) => ({
  edges: [],
  nodes: nodes.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    label: node.label,
  })),
});

export const mountControllerScenario = async (
  page: Page,
  mode: "controlled" | "uncontrolled",
  viewportMode: "controlled" | "uncontrolled" = mode
): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await page.evaluate(
    async ({
      initial,
      mode: selectedMode,
      viewportMode: selectedViewportMode,
    }) => {
      const modulePath = "/src/public.ts";
      const { mountFlow } = await import(modulePath);
      const root = globalThis.document.querySelector<HTMLElement>("#app");

      if (root === null) {
        throw new Error("Missing conformance host");
      }

      const controller = mountFlow(root, initial, {
        documentMode: selectedMode,
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { maxZoom: 2, minZoom: 0.5 },
          mode: selectedViewportMode,
        },
      });

      globalThis.flowChanges = [];
      controller.subscribe((change: FlowChange) =>
        globalThis.flowChanges?.push(change)
      );
      globalThis.flowController = controller;
    },
    {
      initial: documentWith([
        { id: "first", label: "First", x: 40, y: 50 },
        { id: "second", label: "Second", x: 260, y: 90 },
      ]),
      mode,
      viewportMode,
    }
  );
};

export const updateScenario = async (
  page: Page,
  nodes: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly label: string;
  }[]
): Promise<void> => {
  await page.evaluate((next) => {
    const controller = globalThis.flowController;

    if (controller === undefined) {
      throw new Error("Missing conformance controller");
    }

    controller.update(next);
  }, documentWith(nodes));
};

export const assertTwoNodeControllerConformance = async (
  page: Page
): Promise<void> => {
  await expect(page.getByTestId("flow-node")).toHaveCount(2);
  await expect(page.locator('[data-node-id="first"]')).toHaveAttribute(
    "data-measured-width",
    "150"
  );
  await expect(page.locator('[data-node-id="second"]')).toHaveAttribute(
    "data-measured-width",
    "150"
  );

  await page.locator('[data-node-id="first"]').evaluate((element) => {
    element.dataset.identity = "preserved";
  });
  await updateScenario(page, [
    { id: "third", label: "Third", x: 420, y: 150 },
    { id: "first", label: "First updated", x: 70, y: 65 },
  ]);

  await expect(page.getByTestId("flow-node")).toHaveCount(2);
  await expect(page.locator('[data-node-id="second"]')).toHaveCount(0);
  await expect(page.locator('[data-node-id="first"]')).toHaveAttribute(
    "data-identity",
    "preserved"
  );
  await expect(page.locator('[data-node-id="first"]')).toHaveText(
    "First updated"
  );
  await expect(page.locator('[data-node-id="first"]')).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 70, 65)"
  );
  await expect(page.getByTestId("flow-node").nth(0)).toHaveAttribute(
    "data-node-id",
    "third"
  );
  await expect(page.getByTestId("flow-node").nth(1)).toHaveAttribute(
    "data-node-id",
    "first"
  );
};
