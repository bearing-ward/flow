import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  ConformanceAction,
  ConformanceAdapter,
  ConformanceFixture,
  ConformanceSnapshot,
} from "../../../packages/conformance/src/index.ts";

export const createFoldkitConformanceAdapter = (page: Page): ConformanceAdapter => ({
  async mount(fixture: ConformanceFixture): Promise<void> {
    await page.goto("/test.html");
    await page.evaluate(async (scenario) => {
      const harnessPath = "/e2e/test-harness.ts";
      await import(harnessPath);
      await window.__flowFoldkitTest?.mount(scenario);
    }, fixture);
  },
  async perform(action: ConformanceAction): Promise<void> {
    if (action.kind === "update-document") {
      await page.evaluate((document) => window.__flowFoldkitTest?.replaceDocument(document), action.document);
      return;
    }
    if (action.kind === "update-viewport") {
      await page.evaluate((viewport) => window.__flowFoldkitTest?.replaceViewport(viewport), action.viewport);
      return;
    }
    if (action.kind === "drag-node") {
      const node = page.locator(`[data-node-id="${action.nodeId}"]`);
      const box = await node.boundingBox();
      if (box === null) throw new Error(`Missing node ${action.nodeId}`);
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + action.dx, startY + action.dy, { steps: 4 });
      if (action.cancel === true) {
        await page.locator("[data-testid='flow-canvas']").focus();
        await page.keyboard.press("Escape");
      }
      await page.mouse.up();
      return;
    }
    const source = page.locator(`[data-node-id="${action.sourceNodeId}"] [data-handle-id="${action.sourceHandleId}"]`);
    const target = page.locator(`[data-node-id="${action.targetNodeId}"] [data-handle-id="${action.targetHandleId}"]`);
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (sourceBox === null || targetBox === null) throw new Error("Missing connection handle");
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
    await page.mouse.up();
  },
  async snapshot(): Promise<ConformanceSnapshot> {
    return page.evaluate(() => {
      const nodes = [...document.querySelectorAll<HTMLElement>(".flow-foldkit-node[data-node-id]")];
      const edges = [...document.querySelectorAll<HTMLElement>("[data-edge-id]")];
      return {
        nodeIds: nodes.map((node) => node.dataset.nodeId ?? ""),
        edgeIds: edges.map((edge) => edge.dataset.edgeId ?? ""),
        positions: nodes.map((node) => ({
          id: node.dataset.nodeId ?? "",
          x: Number.parseFloat(node.style.left),
          y: Number.parseFloat(node.style.top),
        })),
        identityMarkers: nodes.filter((node) => node.dataset.identity === "preserved").map((node) => node.dataset.nodeId ?? ""),
      };
    });
  },
  async markIdentity(nodeId: string, marker: string): Promise<void> {
    await page.locator(`[data-node-id="${nodeId}"]`).evaluate((node, value) => { node.setAttribute("data-identity", value); }, marker);
  },
  async changeKinds(): Promise<readonly string[]> {
    return page.evaluate(() => window.__flowFoldkitTest?.changeKinds() ?? []);
  },
  async destroy() {
    return page.evaluate(async () => window.__flowFoldkitTest?.destroy() ?? { mountedElements: -1, changesAfterDestroy: -1 });
  },
});

export const assertFixtureOutputs = async (adapter: ConformanceAdapter, fixture: ConformanceFixture): Promise<void> => {
  await expect.poll(async () => (await adapter.snapshot()).nodeIds).toEqual(fixture.expected.nodeIds);
  await expect.poll(async () => (await adapter.snapshot()).edgeIds).toEqual(fixture.expected.edgeIds);
  await expect.poll(async () => (await adapter.snapshot()).positions).toEqual(fixture.expected.positions);
  await expect.poll(async () => adapter.changeKinds()).toEqual(fixture.expected.changeKinds);
  const snapshot = await adapter.snapshot();
  expect(snapshot.nodeIds, fixture.id).toEqual(fixture.expected.nodeIds);
  expect(snapshot.edgeIds, fixture.id).toEqual(fixture.expected.edgeIds);
  expect(snapshot.positions, fixture.id).toEqual(fixture.expected.positions);
  expect(snapshot.identityMarkers, fixture.id).toEqual(fixture.expected.preservedIdentityIds ?? []);
  expect(await adapter.changeKinds(), fixture.id).toEqual(fixture.expected.changeKinds);
};
