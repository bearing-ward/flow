import type { FlowChange } from "@flow/core";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const reset = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => globalThis.dispatchEvent(new Event("beforeunload")));
};

test("initial renderer failure cleans up mounted entries and preserves the error", async ({ page }) => {
  await reset(page);
  const result = await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const events: string[] = [];
    let caught = "";
    let caughtOriginalError = false;
    const failure = new Error("renderer exploded");
    try {
      mountFlow(root, {
        nodes: [
          { id: "first", label: "First", position: { x: 20, y: 20 }, type: "working" },
          { id: "second", label: "Second", position: { x: 180, y: 20 }, type: "failing" },
        ],
        edges: [],
      }, {
        documentMode: "uncontrolled",
        nodeRenderers: {
          working: () => ({ update: () => undefined, destroy: () => { events.push("destroy:first"); throw new Error("cleanup exploded"); } }),
          failing: () => { throw failure; },
        },
        viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
      });
    } catch (error) {
      caught = error instanceof Error ? error.message : String(error);
      caughtOriginalError = error === failure;
    }
    const failedMount = { caught, caughtOriginalError, events: [...events], childCount: root.childElementCount };
    const controller = mountFlow(root, { nodes: [], edges: [] }, {
      documentMode: "uncontrolled",
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    controller.destroy();
    controller.destroy();
    return { ...failedMount, recoveredRootCount: root.childElementCount, events };
  });

  expect(result.caught).toBe("renderer exploded");
  expect(result.caughtOriginalError).toBe(true);
  expect(result.events).toEqual(["destroy:first"]);
  expect(result.childCount).toBe(0);
  expect(result.recoveredRootCount).toBe(0);
});

test("controlled update cancels a group drag when a participant is removed", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const graph = {
      nodes: [
        { id: "a", label: "Alpha", position: { x: 100, y: 150 }, selected: true },
        { id: "b", label: "Beta", position: { x: 350, y: 150 }, selected: true },
      ],
      edges: [],
    };
    const controller = mountFlow(root, graph, {
      documentMode: "controlled",
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowController = controller;
    globalThis.flowChanges = [];
    controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
    (globalThis as typeof globalThis & { groupDragGraph?: typeof graph }).groupDragGraph = graph;
  });

  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const beta = page.locator('.flow-node[data-node-id="b"]');
  const box = await alpha.boundingBox();
  if (box === null) throw new Error("Missing anchor bounds");
  await page.mouse.move(box.x + 40, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 60);
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 160, 190)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 410, 190)");

  await page.evaluate(() => {
    const graph = (globalThis as typeof globalThis & { groupDragGraph?: { nodes: Array<{ id: string; label: string; position: { x: number; y: number }; selected?: boolean }>; edges: [] } }).groupDragGraph;
    if (graph === undefined) throw new Error("Missing controlled graph");
    globalThis.flowController?.update({ ...graph, nodes: graph.nodes.filter((node) => node.id !== "b") });
  });
  await expect(beta).toHaveCount(0);
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 100, 150)");
  await page.mouse.up();
  expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([]);
});

test("controlled group drag completes when every participant remains", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const controller = mountFlow(root, {
      nodes: [
        { id: "a", label: "Alpha", position: { x: 100, y: 150 }, selected: true },
        { id: "b", label: "Beta", position: { x: 350, y: 150 }, selected: true },
      ],
      edges: [],
    }, {
      documentMode: "controlled",
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowChanges = [];
    controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
    globalThis.flowController = controller;
  });

  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const box = await alpha.boundingBox();
  if (box === null) throw new Error("Missing anchor bounds");
  await page.mouse.move(box.x + 40, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 60);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => globalThis.flowChanges)).toEqual([{
    kind: "node-positions",
    positions: [
      { nodeId: "a", position: { x: 160, y: 190 } },
      { nodeId: "b", position: { x: 410, y: 190 } },
    ],
  }]);
});

test("custom drag handle gates pointer movement and keeps its visual state stable", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const controller = mountFlow(root, {
      nodes: [
        { id: "a", label: "Alpha", position: { x: 100, y: 120 }, selected: true, type: "custom", data: { text: "Handle v1" } },
        { id: "b", label: "Beta", position: { x: 350, y: 120 }, selected: true },
        { id: "outside", label: "Outside", position: { x: 600, y: 120 } },
      ], edges: [],
    }, {
      documentMode: "uncontrolled",
      nodeRenderers: {
        custom: (node: { data?: { text?: string } }, content: HTMLElement) => {
          const body = globalThis.document.createElement("span");
          body.className = "custom-body";
          body.textContent = "Body";
          const dragRegion = globalThis.document.createElement("div");
          dragRegion.dataset.flowDragHandle = "";
          const handle = globalThis.document.createElement("button");
          handle.setAttribute("aria-label", "Drag selected group");
          handle.textContent = node.data?.text ?? "Handle";
          const nestedNoDrag = globalThis.document.createElement("button");
          nestedNoDrag.dataset.flowNoDrag = "";
          nestedNoDrag.setAttribute("aria-label", "Nested no-drag control");
          nestedNoDrag.textContent = "No drag";
          dragRegion.append(handle, nestedNoDrag);
          const action = globalThis.document.createElement("button");
          action.dataset.flowNoDrag = "";
          action.textContent = "Renderer action";
          action.onclick = () => { action.dataset.clickCount = String(Number(action.dataset.clickCount ?? "0") + 1); };
          content.append(body, dragRegion, action);
          return { update: (next: typeof node) => { handle.textContent = next.data?.text ?? "Handle"; }, destroy: () => undefined };
        },
      },
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowController = controller;
    globalThis.flowChanges = [];
    controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
  });

  const alpha = page.locator('.flow-node[data-node-id="a"]');
  const beta = page.locator('.flow-node[data-node-id="b"]');
  const handle = page.getByRole("button", { name: "Drag selected group" });
  await expect(handle).toBeVisible();
  await expect(alpha).toHaveScreenshot("custom-drag-handle-idle.png", { animations: "disabled" });
  const alphaBefore = await alpha.getAttribute("style");
  const alphaTransformBefore = await alpha.evaluate((element) => (element as HTMLElement).style.transform);
  const betaBefore = await beta.getAttribute("style");
  const body = await alpha.locator(".custom-body").boundingBox();
  if (body === null) throw new Error("Missing custom renderer body");
  await page.mouse.move(body.x + body.width / 2, body.y + body.height / 2);
  await page.mouse.down();
  await page.mouse.move(body.x + body.width / 2 + 32, body.y + body.height / 2 + 16);
  await page.mouse.up();
  const outsideHandleTransformChanged = await alpha.evaluate((element) => (element as HTMLElement).style.transform) !== alphaTransformBefore;
  expect(outsideHandleTransformChanged).toBe(false);
  expect(await alpha.getAttribute("style")).toBe(alphaBefore);
  expect(await beta.getAttribute("style")).toBe(betaBefore);

  const nestedNoDrag = page.getByRole("button", { name: "Nested no-drag control" });
  const nestedBounds = await nestedNoDrag.boundingBox();
  if (nestedBounds === null) throw new Error("Missing nested no-drag control bounds");
  const changesBeforeNestedNoDrag = await page.evaluate(() => globalThis.flowChanges?.length ?? -1);
  await page.mouse.move(nestedBounds.x + nestedBounds.width / 2, nestedBounds.y + nestedBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(nestedBounds.x + nestedBounds.width / 2 + 32, nestedBounds.y + nestedBounds.height / 2 + 16);
  await page.mouse.up();
  expect(await alpha.evaluate((element) => (element as HTMLElement).style.transform)).toBe(alphaTransformBefore);
  expect(await beta.getAttribute("style")).toBe(betaBefore);
  await expect(alpha).not.toHaveClass(/dragging/u);
  expect(await page.evaluate(() => globalThis.flowChanges?.length ?? -1)).toBe(changesBeforeNestedNoDrag);

  const handleBounds = await handle.boundingBox();
  if (handleBounds === null) throw new Error("Missing custom drag handle bounds");
  await page.mouse.move(handleBounds.x + handleBounds.width / 2, handleBounds.y + handleBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBounds.x + handleBounds.width / 2 + 30, handleBounds.y + handleBounds.height / 2 + 10);
  await expect(alpha).toHaveClass(/dragging/u);
  await expect(alpha).toHaveScreenshot("custom-drag-handle-active.png", { animations: "disabled" });
  await page.mouse.up();
  const handleTransformChanged = await alpha.evaluate((element) => (element as HTMLElement).style.transform) !== alphaTransformBefore;
  expect(handleTransformChanged).toBe(true);
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 130, 130)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 380, 130)");

  const action = page.getByRole("button", { name: "Renderer action" });
  const actionState = {
    alphaStyle: await alpha.getAttribute("style"),
    betaStyle: await beta.getAttribute("style"),
    changeCount: await page.evaluate(() => globalThis.flowChanges?.length ?? -1),
  };
  await action.focus();
  await expect(action).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(action).toHaveAttribute("data-click-count", "1");
  await expect(action).toBeFocused();
  await page.keyboard.press("Space");
  await expect(action).toHaveAttribute("data-click-count", "2");
  await expect(action).toBeFocused();
  expect(await alpha.getAttribute("style")).toBe(actionState.alphaStyle);
  expect(await beta.getAttribute("style")).toBe(actionState.betaStyle);
  expect(await page.evaluate(() => globalThis.flowChanges?.length ?? -1)).toBe(actionState.changeCount);
  await expect(alpha).toHaveAttribute("aria-pressed", "true");
  await expect(alpha).not.toHaveClass(/dragging/u);
  await page.evaluate(() => globalThis.flowController?.update({
    nodes: [
      { id: "a", label: "Alpha", position: { x: 130, y: 130 }, selected: true, type: "custom", data: { text: "Handle v2" } },
      { id: "b", label: "Beta", position: { x: 380, y: 130 }, selected: true },
      { id: "outside", label: "Outside", position: { x: 600, y: 120 } },
    ], edges: [],
  }));
  await expect(handle).toHaveText("Handle v2");
  await expect(alpha).toHaveAttribute("aria-pressed", "true");
  await alpha.focus();
  await page.keyboard.press("ArrowRight");
  await expect(alpha).toHaveCSS("transform", "matrix(1, 0, 0, 1, 135, 130)");
  await expect(beta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 385, 130)");
  expect(await page.evaluate(() => globalThis.flowChanges?.filter((change) => change.kind === "node-positions"))).toHaveLength(2);
});

for (const documentMode of ["uncontrolled", "controlled"] as const) {
  test(`native renderer controls own keyboard input in ${documentMode} mode`, async ({ page }) => {
    await reset(page);
    await page.evaluate(async (mode) => {
      const modulePath = "/src/public.ts";
      const { mountFlow } = await import(modulePath);
      const root = globalThis.document.querySelector<HTMLElement>("#app");
      if (root === null) throw new Error("Missing host");
      root.replaceChildren();
      const controller = mountFlow(root, {
        nodes: [{ id: "custom", label: "Custom", position: { x: 120, y: 120 }, selected: true, type: "interactive" }],
        edges: [],
      }, {
        documentMode: mode,
        nodeRenderers: {
          interactive: (_node: unknown, content: HTMLElement) => {
            const counts = { button: 0, link: 0 };
            Reflect.set(globalThis, "nativeActivationCounts", counts);

            const dragHandle = globalThis.document.createElement("div");
            dragHandle.dataset.flowDragHandle = "";
            const button = globalThis.document.createElement("button");
            button.type = "button";
            button.dataset.flowNoDrag = "";
            button.setAttribute("aria-label", "Nested renderer action");
            button.addEventListener("click", () => { counts.button += 1; });
            dragHandle.append(button);

            const link = globalThis.document.createElement("a");
            link.href = "#native-renderer-action";
            link.id = "native-renderer-action";
            link.textContent = "Renderer link";
            link.addEventListener("click", () => { counts.link += 1; });

            const input = globalThis.document.createElement("input");
            input.type = "text";
            input.value = "abc";
            input.setAttribute("aria-label", "Renderer input");
            input.dataset.flowNoDrag = "";

            const select = globalThis.document.createElement("select");
            select.setAttribute("aria-label", "Renderer select");
            select.dataset.flowNoDrag = "";
            for (const value of ["first", "second"]) {
              const option = globalThis.document.createElement("option");
              option.value = value;
              option.textContent = value;
              select.append(option);
            }

            const textarea = globalThis.document.createElement("textarea");
            textarea.value = "abc\ndef";
            textarea.setAttribute("aria-label", "Renderer textarea");
            textarea.dataset.flowNoDrag = "";

            const editingHost = globalThis.document.createElement("div");
            editingHost.contentEditable = "true";
            editingHost.dataset.flowNoDrag = "";
            const inheritedEditor = globalThis.document.createElement("span");
            inheritedEditor.tabIndex = 0;
            inheritedEditor.textContent = "editable";
            inheritedEditor.setAttribute("aria-label", "Inherited editor");
            editingHost.append(inheritedEditor);

            content.append(dragHandle, link, input, select, textarea, editingHost);
            return { update: () => undefined, destroy: () => undefined };
          },
        },
        viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
      });
      globalThis.flowController = controller;
      globalThis.flowChanges = [];
      Reflect.set(globalThis, "nativeKeyboardPrevented", [] as string[]);
      globalThis.document.body.addEventListener("keydown", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !event.defaultPrevented) return;
        const control = target.closest<HTMLElement>(".flow-node-content [aria-label]");
        if (control !== null) {
          const prevented = Reflect.get(globalThis, "nativeKeyboardPrevented");
          if (Array.isArray(prevented)) prevented.push(`${control.getAttribute("aria-label")}:${event.key}`);
        }
      });
      controller.subscribe((change: FlowChange) => globalThis.flowChanges?.push(change));
    }, documentMode);

    const node = page.locator('.flow-node[data-node-id="custom"]');
    const initialTransform = await node.evaluate((element) => (element as HTMLElement).style.transform);
    const button = page.getByRole("button", { name: "Nested renderer action" });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => Reflect.get(globalThis, "nativeActivationCounts"))).toEqual({ button: 1, link: 0 });
    await expect(button).toBeFocused();
    await page.keyboard.press("Space");
    expect(await page.evaluate(() => Reflect.get(globalThis, "nativeActivationCounts"))).toEqual({ button: 2, link: 0 });
    await expect(button).toBeFocused();

    const link = page.getByRole("link", { name: "Renderer link" });
    await link.focus();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => Reflect.get(globalThis, "nativeActivationCounts"))).toEqual({ button: 2, link: 1 });
    await expect(link).toBeFocused();

    const input = page.getByRole("textbox", { name: "Renderer input" });
    await input.focus();
    await page.keyboard.press("Home");
    await page.keyboard.type("z");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("zabc");

    const select = page.getByRole("combobox", { name: "Renderer select" });
    await select.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(select).toBeFocused();
    await expect(select).toHaveValue("first");

    const textarea = page.getByRole("textbox", { name: "Renderer textarea" });
    await textarea.focus();
    await textarea.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(7, 7));
    await page.keyboard.press("ArrowUp");
    await expect(textarea).toHaveJSProperty("selectionStart", 3);
    await page.keyboard.type("z");
    await expect(textarea).toHaveValue("abcz\ndef");
    await page.keyboard.press("Escape");
    await expect(textarea).toBeFocused();

    const inheritedEditor = page.locator('[aria-label="Inherited editor"]');
    await inheritedEditor.evaluate((element) => {
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = document.getSelection();
      if (selection === null) throw new Error("Missing text selection");
      selection.removeAllRanges();
      selection.addRange(range);
    });
    expect(await inheritedEditor.evaluate((element) => (element as HTMLElement).isContentEditable)).toBe(true);
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await page.keyboard.press("ArrowLeft");
    const editingHost = page.locator('[contenteditable="true"]');
    expect(await editingHost.evaluate((host) => host.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(inheritedEditor).toContainText("!");
    expect(await page.evaluate(() => Reflect.get(globalThis, "nativeKeyboardPrevented"))).toEqual([]);

    const initialWidth = await node.evaluate((element) => getComputedStyle(element).width);
    const resizeButton = node.locator('.flow-node-resize-handle[data-direction="right"]');
    await resizeButton.focus();
    await page.keyboard.down("ArrowRight");
    await expect(node).toHaveClass(/resizing/u);
    await input.focus();
    await page.keyboard.press("Escape");
    await page.keyboard.up("ArrowRight");
    await expect(node).not.toHaveClass(/resizing/u);
    await expect.poll(() => node.evaluate((element) => getComputedStyle(element).width)).toBe(initialWidth);
    expect(await page.evaluate(() => Reflect.get(globalThis, "nativeKeyboardPrevented"))).toEqual(["Renderer input:Escape"]);

    await expect(node).toHaveAttribute("aria-pressed", "true");
    expect(await node.evaluate((element) => (element as HTMLElement).style.transform)).toBe(initialTransform);
    expect(await page.evaluate(() => globalThis.flowChanges)).toEqual([]);
  });
}

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

test("overlapping nodes follow graph order and controlled zIndex updates retain elements and focus", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const graph = {
      nodes: [
        { id: "sibling", label: "Sibling", position: { x: 100, y: 100 }, size: { width: 200, height: 100 }, zIndex: -1, type: "focusable" },
        { id: "child", label: "Child", parentId: "parent", position: { x: 0, y: 0 }, size: { width: 200, height: 100 }, zIndex: 99 },
        { id: "parent", label: "Parent", position: { x: 100, y: 100 }, size: { width: 200, height: 100 }, zIndex: 0 },
      ],
      edges: [],
    };
    globalThis.flowController = mountFlow(root, graph, {
      documentMode: "controlled",
      nodeRenderers: {
        focusable: (_node: unknown, content: HTMLElement) => {
          const button = globalThis.document.createElement("button");
          button.id = "sibling-focus";
          button.textContent = "focus";
          content.append(button);
          return { update: () => undefined, destroy: () => undefined };
        },
      },
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    const testGlobal = globalThis as typeof globalThis & { stackingGraph?: typeof graph };
    testGlobal.stackingGraph = graph;
  });

  const parent = page.locator('.flow-node[data-node-id="parent"]');
  await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & { originalNodeElements?: Element[] };
    testGlobal.originalNodeElements = [...globalThis.document.querySelectorAll(".flow-node")];
  });
  const overlap = await parent.boundingBox();
  if (overlap === null) throw new Error("Missing overlap bounds");
  expect(await page.locator(".flow-node").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-node-id"))))
    .toEqual(["sibling", "parent", "child"]);
  expect(await page.evaluate(({ x, y }) => globalThis.document.elementFromPoint(x, y)?.closest(".flow-node")?.getAttribute("data-node-id"), {
    x: overlap.x + 20,
    y: overlap.y + 20,
  })).toBe("child");

  await page.locator("#sibling-focus").focus();
  await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & {
      stackingGraph?: {
        nodes: Array<{ id: string; label: string; position: { x: number; y: number }; [key: string]: unknown }>;
        edges: [];
      };
    };
    const graph = testGlobal.stackingGraph;
    if (graph === undefined) throw new Error("Missing controlled graph");
    globalThis.flowController?.update({
      ...graph,
      nodes: graph.nodes.map((node) => node.id === "sibling" ? { ...node, zIndex: 10 } : node),
    });
  });

  await expect.poll(() => page.locator(".flow-node").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-node-id"))))
    .toEqual(["parent", "child", "sibling"]);
  expect(await page.evaluate(() => globalThis.document.elementFromPoint(120, 120)?.closest(".flow-node")?.getAttribute("data-node-id"))).toBe("sibling");
  expect(await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & { originalNodeElements?: Element[] };
    return testGlobal.originalNodeElements?.every((node) => node.isConnected && [...globalThis.document.querySelectorAll(".flow-node")].includes(node));
  })).toBe(true);
  await expect(page.locator("#sibling-focus")).toBeFocused();
});

test("controlled parent updates reposition unchanged descendants and edge endpoints", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const document = {
      nodes: [
        { id: "parent", label: "Parent", position: { x: 100, y: 120 }, size: { width: 220, height: 160 }, handles: [{ id: "out", kind: "source", side: "right" }] },
        { id: "child", label: "Child", parentId: "parent", position: { x: 20, y: 30 }, type: "child-custom", data: { text: "child" }, size: { width: 80, height: 40 }, handles: [{ id: "out", kind: "source", side: "right" }] },
        { id: "other", label: "Other", position: { x: 400, y: 120 }, handles: [{ id: "in", kind: "target", side: "left" }] },
      ],
      edges: [{ id: "edge", source: "child", sourceHandle: "out", target: "other", targetHandle: "in" }],
    };
    const controller = mountFlow(root, document, {
      documentMode: "controlled",
      nodeRenderers: {
        "child-custom": (_node: unknown, content: HTMLElement) => {
          const testGlobal = globalThis as typeof globalThis & { childRendererUpdates?: number };
          testGlobal.childRendererUpdates = 0;
          content.textContent = "child";
          return { update: () => { testGlobal.childRendererUpdates = (testGlobal.childRendererUpdates ?? 0) + 1; }, destroy: () => undefined };
        },
      },
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    globalThis.flowController = controller;
    const testGlobal = globalThis as typeof globalThis & {
      controlledDocument?: {
        nodes: Array<{ id: string; label: string; position: { x: number; y: number }; [key: string]: unknown }>;
        edges: Array<{ id: string; source: string; target: string; [key: string]: unknown }>;
      };
    };
    testGlobal.controlledDocument = document;
  });

  const parent = page.locator('.flow-node[data-node-id="parent"]');
  const child = page.locator('.flow-node[data-node-id="child"]');
  const edgePath = page.locator('[data-edge-id="edge"] .flow-edge-hit');
  const beforeParent = await parent.boundingBox();
  const beforeChild = await child.boundingBox();
  if (beforeParent === null || beforeChild === null) throw new Error("Missing nested node bounds");
  const beforePath = await edgePath.getAttribute("d");
  if (beforePath === null) throw new Error("Missing edge path");

  await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & {
      controlledDocument?: {
        nodes: Array<{ id: string; label: string; position: { x: number; y: number }; [key: string]: unknown }>;
        edges: Array<{ id: string; source: string; target: string; [key: string]: unknown }>;
      };
    };
    const document = testGlobal.controlledDocument;
    if (document === undefined) throw new Error("Missing controlled document");
    globalThis.flowController?.update({
      ...document,
      nodes: document.nodes.map((node) => node.id === "parent" ? { ...node, position: { x: 150, y: 160 } } : node),
    });
  });

  await expect.poll(async () => (await parent.boundingBox())?.x).toBe(beforeParent.x + 50);
  await expect.poll(async () => (await child.boundingBox())?.x).toBe(beforeChild.x + 50);
  await expect.poll(async () => (await parent.boundingBox())?.y).toBe(beforeParent.y + 40);
  await expect.poll(async () => (await child.boundingBox())?.y).toBe(beforeChild.y + 40);
  expect(await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & {
      controlledDocument?: {
        nodes: Array<{ id: string; label: string; position: { x: number; y: number }; [key: string]: unknown }>;
        edges: Array<{ id: string; source: string; target: string; [key: string]: unknown }>;
      };
    };
    return testGlobal.controlledDocument?.nodes.find((node) => node.id === "child")?.position;
  })).toEqual({ x: 20, y: 30 });
  await expect.poll(async () => edgePath.getAttribute("d")).not.toBe(beforePath);
  await expect(edgePath).toHaveAttribute("d", /^M 255,210/u);
  expect(await page.evaluate(() => (globalThis as typeof globalThis & { childRendererUpdates?: number }).childRendererUpdates)).toBe(0);
});

test("parent updates place a previously culled child when it becomes visible", async ({ page }) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const graph = {
      nodes: [
        { id: "parent", label: "Parent", position: { x: 100, y: 120 }, size: { width: 220, height: 160 } },
        { id: "child", label: "Child", parentId: "parent", position: { x: 1300, y: 30 }, size: { width: 80, height: 40 } },
      ],
      edges: [],
    };
    globalThis.flowController = mountFlow(root, graph, {
      documentMode: "controlled",
      renderOnlyVisible: true,
      viewport: { mode: "uncontrolled", initial: { x: 0, y: 0, zoom: 1 }, limits: { minZoom: 0.5, maxZoom: 2 } },
    });
    const testGlobal = globalThis as typeof globalThis & { culledGraph?: typeof graph };
    testGlobal.culledGraph = graph;
  });

  await expect(page.locator('.flow-node[data-node-id="child"]')).toHaveCount(0);
  await page.evaluate(() => {
    const testGlobal = globalThis as typeof globalThis & {
      culledGraph?: { nodes: Array<{ id: string; label: string; position: { x: number; y: number }; [key: string]: unknown }>; edges: [] };
    };
    const graph = testGlobal.culledGraph;
    if (graph === undefined) throw new Error("Missing controlled graph");
    globalThis.flowController?.update({
      ...graph,
      nodes: graph.nodes.map((node) => node.id === "parent" ? { ...node, position: { x: -800, y: 120 } } : node),
    });
  });
  const child = page.locator('.flow-node[data-node-id="child"]');
  await expect(child).toBeVisible();
  const childBounds = await child.boundingBox();
  expect(childBounds?.x).toBe(500);
  expect(childBounds?.y).toBe(150);
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
test("node drag updates only incident custom edge renderers", async ({
  page,
}) => {
  await reset(page);
  await page.evaluate(async () => {
    const modulePath = "/src/public.ts";
    const { mountFlow } = await import(modulePath);
    const root = globalThis.document.querySelector<HTMLElement>("#app");
    if (root === null) throw new Error("Missing host");
    root.replaceChildren();
    const nodes = [
      {
        id: "moving",
        label: "Moving",
        position: { x: 100, y: 140 },
        size: { width: 100, height: 60 },
        handles: [{ id: "out", kind: "source", side: "right" }],
      },
      {
        id: "target",
        label: "Target",
        position: { x: 320, y: 140 },
        size: { width: 100, height: 60 },
        handles: [{ id: "in", kind: "target", side: "left" }],
      },
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `n${index}`,
        label: `N${index}`,
        position: {
          x: 100 + (index % 6) * 180,
          y: 400 + Math.floor(index / 6) * 120,
        },
        size: { width: 100, height: 60 },
        handles: [
          { id: "out", kind: "source", side: "right" },
          { id: "in", kind: "target", side: "left" },
        ],
      })),
    ];
    const edges = [
      {
        id: "connected",
        source: "moving",
        sourceHandle: "out",
        target: "target",
        targetHandle: "in",
        label: "Connected",
        type: "counted",
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `unrelated${index}`,
        source: `n${index * 2}`,
        sourceHandle: "out",
        target: `n${index * 2 + 1}`,
        targetHandle: "in",
        label: `U${index}`,
        type: "counted",
      })),
    ];
    const state = globalThis as typeof globalThis & {
      edgeUpdates?: Record<string, number>;
      flowController?: { destroy(): void; update(graph: unknown): void };
    };
    state.edgeUpdates = {};
    state.flowController = mountFlow(
      root,
      { nodes, edges },
      {
        documentMode: "uncontrolled",
        edgeRenderers: {
          counted: {
            render: (
              edge: { id: string },
              _context: unknown,
              visual: SVGGElement
            ) => {
              const counter = globalThis.document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
              );
              counter.dataset.edgeVisual = edge.id;
              counter.setAttribute(
                "cx",
                String((_context as { source: { x: number } }).source.x)
              );
              visual.append(counter);
              return {
                update: (
                  _next: unknown,
                  context: { source: { x: number } }
                ) => {
                  state.edgeUpdates![edge.id] =
                    (state.edgeUpdates![edge.id] ?? 0) + 1;
                  counter.setAttribute("cx", String(context.source.x));
                },
                destroy: () => undefined,
              };
            },
          },
        },
        viewport: {
          mode: "uncontrolled",
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    );
  });
  await expect(page.locator(".flow-edge-label")).toHaveCount(13);
  const initialPath = await page
    .locator('[data-edge-id="connected"] .flow-edge-hit')
    .getAttribute("d");
  const initialLabelX = await page
    .locator('[data-testid="flow-edge-label"][data-edge-id="connected"]')
    .getAttribute("x");
  const initialAnchorX = await page
    .locator(
      '[data-edge-id="connected"] .flow-edge-reconnect-anchor[data-endpoint="source"]'
    )
    .getAttribute("cx");
  const initialVisualX = await page
    .locator('[data-edge-visual="connected"]')
    .getAttribute("cx");
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & { edgeUpdates?: Record<string, number> }
    ).edgeUpdates = {};
  });
  const moving = page.locator('.flow-node[data-node-id="moving"]');
  const bounds = await moving.boundingBox();
  if (bounds === null) throw new Error("Missing moving node bounds");
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2 + 35,
    { steps: 5 }
  );
  await expect
    .poll(() =>
      page
        .locator('[data-edge-id="connected"] .flow-edge-hit')
        .getAttribute("d")
    )
    .not.toBe(initialPath);
  await expect(
    page.locator('[data-testid="flow-edge-label"][data-edge-id="connected"]')
  ).not.toHaveAttribute("x", initialLabelX ?? "");
  await expect(
    page.locator(
      '[data-edge-id="connected"] .flow-edge-reconnect-anchor[data-endpoint="source"]'
    )
  ).not.toHaveAttribute("cx", initialAnchorX ?? "");
  await expect(
    page.locator('[data-edge-visual="connected"]')
  ).not.toHaveAttribute("cx", initialVisualX ?? "");
  const dragUpdates = await page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          edgeUpdates?: Record<string, number>;
        }
      ).edgeUpdates
  );
  expect(dragUpdates?.connected).toBeGreaterThan(0);
  expect(
    Object.keys(dragUpdates ?? {}).filter((id) => id !== "connected")
  ).toEqual([]);
  await page.mouse.up();
  await page.evaluate(() => {
    const state = globalThis as typeof globalThis & {
      edgeUpdates?: Record<string, number>;
      flowController?: { update(graph: unknown): void };
    };
    state.edgeUpdates = {};
    state.flowController?.update({
      nodes: [
        {
          id: "moving",
          label: "Moving",
          position: { x: 200, y: 180 },
          size: { width: 100, height: 60 },
          handles: [{ id: "out", kind: "source", side: "right" }],
        },
        {
          id: "target",
          label: "Target",
          position: { x: 320, y: 140 },
          size: { width: 100, height: 60 },
          handles: [{ id: "in", kind: "target", side: "left" }],
        },
        ...Array.from({ length: 24 }, (_, index) => ({
          id: `n${index}`,
          label: `N${index}`,
          position: {
            x: 100 + (index % 6) * 180,
            y: 400 + Math.floor(index / 6) * 120,
          },
          size: { width: 100, height: 60 },
          handles: [
            { id: "out", kind: "source", side: "right" },
            { id: "in", kind: "target", side: "left" },
          ],
        })),
      ],
      edges: [
        {
          id: "connected",
          source: "moving",
          sourceHandle: "out",
          target: "target",
          targetHandle: "in",
          label: "Connected",
          type: "counted",
        },
        ...Array.from({ length: 12 }, (_, index) => ({
          id: `unrelated${index}`,
          source: `n${index * 2}`,
          sourceHandle: "out",
          target: `n${index * 2 + 1}`,
          targetHandle: "in",
          label: `U${index}`,
          type: "counted",
        })),
      ],
    });
  });
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            edgeUpdates?: Record<string, number>;
          }
        ).edgeUpdates?.unrelated0
    )
  ).toBe(1);
  await page.evaluate(() =>
    (
      globalThis as typeof globalThis & { flowController?: { destroy(): void } }
    ).flowController?.destroy()
  );
});
