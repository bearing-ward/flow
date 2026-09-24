import { expect, test } from "@playwright/test";
import { conformanceFixtures } from "../../../packages/conformance/src/index.ts";
import { createVueConformanceAdapter } from "./conformance.ts";

test("Vue adapter satisfies every shared conformance fixture", async ({ page }) => {
  const adapter = createVueConformanceAdapter(page);
  for (const fixture of conformanceFixtures) {
    await test.step(fixture.id, async () => {
      await adapter.mount(fixture);
      for (const id of fixture.expected.preservedIdentityIds ?? []) await adapter.markIdentity(id, "preserved");
      for (const action of fixture.actions) {
        await adapter.perform(action);
        if (fixture.id === "controlled-acknowledgement" && action.kind === "drag-node") {
          expect((await adapter.snapshot()).positions).toEqual([{ id: "move", x: 80, y: 100 }]);
          expect(await adapter.changeKinds()).toEqual(["node-position"]);
        }
      }
      await expect.poll(async () => (await adapter.snapshot()).nodeIds).toEqual(fixture.expected.nodeIds);
      const snapshot = await adapter.snapshot();
      expect(snapshot.nodeIds, fixture.id).toEqual(fixture.expected.nodeIds);
      expect(snapshot.edgeIds, fixture.id).toEqual(fixture.expected.edgeIds);
      expect(snapshot.positions, fixture.id).toEqual(fixture.expected.positions);
      expect(snapshot.identityMarkers, fixture.id).toEqual(fixture.expected.preservedIdentityIds ?? []);
      expect(await adapter.changeKinds(), fixture.id).toEqual(fixture.expected.changeKinds);
      const cleanup = await adapter.destroy();
      expect(cleanup.mountedElements, fixture.id).toBe(0);
      expect(cleanup.changesAfterDestroy, fixture.id).toBe(0);
    });
  }
});

test("Vue injection stays canvas-scoped and keyed custom components survive updates", async ({ page }) => {
  await page.goto("/test.html");
  const result = await page.evaluate(async () => {
    const harnessPath: string = "/src/test-harness.ts";
    await import(harnessPath);
    return window.__flowVueTest?.smoke();
  });
  expect(result).toEqual({ leftCount: "2", rightCount: "1", labelUpdated: true, edgeUpdated: true, identityPreserved: true, mounted: 3, unmounted: 3, edgeMounted: 1, edgeUnmounted: 1, remaining: 0 });
});

test("Vue nodes and edges bindings render caller state and acknowledge emitted updates", async ({ page }) => {
  await page.goto("/test.html");
  await page.evaluate(async () => {
    const harnessPath: string = "/src/test-harness.ts";
    await import(harnessPath);
    window.__flowVueTest?.startSplitModel();
  });
  await expect(page.locator("[data-node-id='split-a']")).toContainText("Split A");
  await expect(page.locator("[data-node-id='split-b']")).toHaveCount(1);
  await page.locator("[data-node-id='split-a']").evaluate((node: HTMLElement) => { node.dataset.identity = "caller-node"; });
  const node = page.locator("[data-node-id='split-a']");
  const nodeBox = await node.boundingBox();
  if (nodeBox === null) throw new Error("Missing split model node");
  const nodeX = nodeBox.x + nodeBox.width / 2;
  const nodeY = nodeBox.y + nodeBox.height / 2;
  await page.mouse.move(nodeX, nodeY);
  await page.mouse.down();
  await page.mouse.move(nodeX + 40, nodeY + 40, { steps: 3 });
  await page.mouse.up();
  await expect(node).toHaveCSS("left", "60px");
  const source = page.locator("[data-node-id='split-a'] [data-handle-id='out']");
  const target = page.locator("[data-node-id='split-b'] [data-handle-id='in']");
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (sourceBox === null || targetBox === null) throw new Error("Missing split model connection handle");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator("[data-edge-id]")).toHaveCount(1);
  await page.evaluate(() => window.__flowVueTest?.updateSplitDocument({
    nodes: [
      { id: "split-a", label: "Updated split A", position: { x: 90, y: 100 }, handles: [{ id: "out", kind: "source", side: "right" }] },
      { id: "split-b", label: "Split B", position: { x: 240, y: 30 }, handles: [{ id: "in", kind: "target", side: "left" }] },
    ],
    edges: [{ id: "split-replacement-edge", source: "split-a", target: "split-b", label: "Replacement edge" }],
  }));
  await expect(node).toContainText("Updated split A");
  await expect(node).toHaveCSS("left", "90px");
  await expect(page.locator("[data-edge-id='split-replacement-edge']")).toHaveCount(1);
  const result = await page.evaluate(() => window.__flowVueTest?.splitModelSnapshot());
  expect(result).toEqual({ initialRendered: true, nodeUpdateAcknowledged: true, edgeUpdateAcknowledged: true, documentUpdateAcknowledged: true, identityPreserved: true });
});
