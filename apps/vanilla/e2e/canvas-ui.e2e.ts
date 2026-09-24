import { expect, test } from "@playwright/test";

const mount = async (page: import("@playwright/test").Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => globalThis.dispatchEvent(new Event("beforeunload")));
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing app root");
    const controller = mountFlow(root, {
      nodes: [
        { id: "a", label: "Alpha", position: { x: 100, y: 120 }, size: { width: 140, height: 60 } },
        { id: "b", label: "Beta", position: { x: 620, y: 420 } },
      ], edges: [],
    }, {
      documentMode: "uncontrolled",
      background: { pattern: "lines", spacing: 32, color: "#abc" },
      ui: { controls: true, minimap: true },
      viewport: { initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 1.25 }, mode: "uncontrolled" },
    });
    globalThis.flowController = controller;
  });
};

test("optional canvas controls, minimap, background, and zoom affordances", async ({ page }) => {
  await mount(page);
  const canvas = page.getByTestId("flow-canvas");
  await expect(canvas).toHaveAttribute("data-background", "lines");
  await expect(canvas).toHaveCSS("--flow-background-spacing", "32px");
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit view" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch to pan mode" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("img", { name: "Graph minimap" })).toBeVisible();
  await expect(page.locator(".flow-minimap-node")).toHaveCount(2);
  await expect(page.getByTestId("flow-minimap-viewport")).toBeVisible();
  await expect(page).toHaveScreenshot("canvas-ui.png", { animations: "disabled" });
  const initial = await page.getByTestId("flow-viewport").evaluate((element) => ({
    x: Number(element.getAttribute("data-x")), y: Number(element.getAttribute("data-y")), zoom: Number(element.getAttribute("data-zoom")),
  }));
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("Canvas has no bounds");
  const anchor = { x: box.width * 0.7, y: box.height * 0.7 };
  const flowAnchor = { x: (anchor.x - initial.x) / initial.zoom, y: (anchor.y - initial.y) / initial.zoom };
  await page.mouse.dblclick(box.x + anchor.x, box.y + anchor.y);
  await expect(page.getByTestId("flow-viewport")).toHaveAttribute("data-zoom", "1.2");
  await expect(page.getByTestId("flow-viewport")).toHaveAttribute("data-x", String(anchor.x - flowAnchor.x * 1.2));
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByTestId("flow-viewport")).toHaveAttribute("data-zoom", "1.25");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByTestId("flow-viewport")).toHaveAttribute("data-zoom", "1.25");

  const minimap = page.locator(".flow-minimap");
  await minimap.click({ position: { x: 160, y: 20 } });
  await expect(page.getByTestId("flow-viewport")).not.toHaveAttribute("data-x", "0");
  await page.getByRole("button", { name: "Fit view" }).click();
  await expect(page.getByTestId("flow-viewport")).not.toHaveAttribute("data-x", "0");
});

test("interaction mode pans over nodes without starting node gestures and keeps controls active", async ({ page }) => {
  await mount(page);
  const mode = page.getByRole("button", { name: "Switch to pan mode" });
  await mode.click();
  const panMode = page.getByRole("button", { name: "Switch to select mode" });
  await expect(panMode).toHaveAttribute("aria-pressed", "true");

  const node = page.getByTestId("flow-node").filter({ hasText: "Alpha" });
  const beforeTransform = await node.evaluate((element) => (element as HTMLElement).style.transform);
  const beforeSelection = await node.getAttribute("aria-pressed");
  const beforeViewport = await page.getByTestId("flow-viewport").evaluate((element) => ({
    x: Number(element.getAttribute("data-x")), y: Number(element.getAttribute("data-y")),
  }));
  const box = await node.boundingBox();
  if (box === null) throw new Error("Node has no bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 45, { steps: 4 });
  await page.mouse.up();

  await expect.poll(() => page.getByTestId("flow-viewport").getAttribute("data-x")).not.toBe(String(beforeViewport.x));
  await expect.poll(() => page.getByTestId("flow-viewport").getAttribute("data-y")).not.toBe(String(beforeViewport.y));
  await expect(node).toHaveAttribute("aria-pressed", beforeSelection ?? "false");
  await expect.poll(() => node.evaluate((element) => (element as HTMLElement).style.transform)).toBe(beforeTransform);

  const zoomBeforeControlClick = await page.getByTestId("flow-viewport").getAttribute("data-zoom");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByTestId("flow-viewport")).not.toHaveAttribute("data-zoom", zoomBeforeControlClick ?? "1");
  await panMode.click();
  await expect(page.getByRole("button", { name: "Switch to pan mode" })).toHaveAttribute("aria-pressed", "false");
});

test("canvas UI stays optional and caller panel survives keyed document updates", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => globalThis.dispatchEvent(new Event("beforeunload")));
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = document.querySelector<HTMLElement>("#app")!;
    const panel = document.createElement("aside");
    panel.textContent = "Caller panel";
    const nodeToolbar = document.createElement("div");
    nodeToolbar.id = "node-toolbar-container";
    nodeToolbar.className = "caller-toolbar focus-target";
    nodeToolbar.style.transform = "rotate(3deg)";
    nodeToolbar.hidden = true;
    nodeToolbar.setAttribute("data-toolbar-kind", "caller-node-kind");
    nodeToolbar.setAttribute("data-toolbar-id", "caller-node-id");
    nodeToolbar.append(Object.assign(document.createElement("button"), { textContent: "Node action" }));
    const edgeToolbar = document.createElement("div");
    edgeToolbar.id = "edge-toolbar-container";
    edgeToolbar.append(Object.assign(document.createElement("button"), { textContent: "Edge action" }));
    const culledToolbar = document.createElement("div");
    culledToolbar.append(Object.assign(document.createElement("button"), { textContent: "Remote node action" }));
    document.body.append(panel);
    document.body.append(nodeToolbar, edgeToolbar, culledToolbar);
    const initial = { nodes: [
      { id: "a", label: "Alpha", position: { x: 0, y: 0 } },
      { id: "b", label: "Beta", position: { x: 240, y: 100 } },
      { id: "c", label: "Remote", position: { x: 2200, y: 700 } },
    ], edges: [{ id: "ab", source: "a", target: "b" }] };
    const controller = mountFlow(root, initial, {
      documentMode: "uncontrolled", panel,
      renderOnlyVisible: true,
      toolbarContainers: { nodes: { a: nodeToolbar, c: culledToolbar }, edges: { ab: edgeToolbar } },
      viewport: { initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 }, mode: "uncontrolled" },
    });
    controller.update({ nodes: [{ ...initial.nodes[0]!, label: "Renamed" }, initial.nodes[1]!, initial.nodes[2]!], edges: initial.edges });
    globalThis.flowController = controller;
  });
  await expect(page.locator(".flow-controls")).toHaveCount(0);
  await expect(page.locator(".flow-minimap")).toHaveCount(0);
  await expect(page.getByText("Caller panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Renamed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Node action", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edge action" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remote node action" })).toBeHidden();
  const anchorBeforeZoom = await page.locator("[data-toolbar-kind=node][data-toolbar-id=a]").evaluate((element) => (element as HTMLElement).style.transform);
  const edgeAnchorBeforeZoom = await page.locator("[data-toolbar-kind=edge][data-toolbar-id=ab]").evaluate((element) => (element as HTMLElement).style.transform);
  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: -100, y: -60, zoom: 1.5 }));
  await expect.poll(() => page.locator("[data-toolbar-kind=node][data-toolbar-id=a]").evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(anchorBeforeZoom);
  await expect.poll(() => page.locator("[data-toolbar-kind=edge][data-toolbar-id=ab]").evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(edgeAnchorBeforeZoom);
  await page.evaluate(() => globalThis.flowController?.updateViewport({ x: -2000, y: -500, zoom: 1 }));
  await expect(page.getByRole("button", { name: "Remote node action" })).toBeVisible();
  await page.evaluate(() => globalThis.flowController?.destroy());
  await expect(page.getByText("Caller panel")).toBeVisible();
  await expect.poll(() => page.locator("#node-toolbar-container").evaluate((element) => {
    const toolbar = element as HTMLElement;
    return JSON.stringify({
      parent: toolbar.parentElement?.tagName,
      next: toolbar.nextElementSibling instanceof HTMLElement ? toolbar.nextElementSibling.id : null,
      childCount: toolbar.childElementCount,
      className: toolbar.getAttribute("class"),
      hidden: toolbar.getAttribute("hidden"),
      transform: toolbar.style.getPropertyValue("transform"),
      transformPriority: toolbar.style.getPropertyPriority("transform"),
      kind: toolbar.getAttribute("data-toolbar-kind"),
      id: toolbar.getAttribute("data-toolbar-id"),
    });
  })).toBe(JSON.stringify({
    parent: "BODY", next: "edge-toolbar-container", childCount: 1, className: "caller-toolbar focus-target",
    hidden: "", transform: "rotate(3deg)", transformPriority: "", kind: "caller-node-kind", id: "caller-node-id",
  }));
});
