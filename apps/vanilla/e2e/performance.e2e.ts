import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type BenchmarkResult = {
  fixtureSize: number;
  edgeCount: number;
  minimap: boolean;
  renderOnlyVisible: boolean;
  operation: string;
  warmupCount: number;
  sampleCount: number;
  medianMs: number;
  p95Ms: number;
  addedNodes: number;
  removedNodes: number;
};

const percentile = (values: readonly number[], fraction: number): number =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)!
  ]!;

const fixture = (size: number, edgeCount: number) => ({
  nodes: Array.from({ length: size }, (_, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    position: { x: (index % 80) * 180, y: Math.floor(index / 80) * 100 },
    size: { width: 120, height: 48 },
    handles: [
      { id: "out", kind: "source" as const, side: "right" as const },
      { id: "in", kind: "target" as const, side: "left" as const },
    ],
  })),
  edges: Array.from({ length: edgeCount }, (_, index) => ({
    id: `e${index}`,
    source: `n${index}`,
    target: `n${index + 1}`,
  })),
});

const mountFixture = async (
  page: Page,
  size: number,
  edgeCount: number,
  minimap: boolean
): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  await page.evaluate(
    async ({ documentInput, showMinimap, cullToViewport }) => {
      await import("/src/public.ts").then(({ mountFlow }) => {
        const root = document.querySelector<HTMLElement>("#app");
        if (root === null) throw new Error("Missing benchmark host");
        const controller = mountFlow(root, documentInput, {
          documentMode: "uncontrolled",
          renderOnlyVisible: cullToViewport,
          viewport: {
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
            mode: "uncontrolled",
          },
          ui: { controls: false, minimap: showMinimap },
        });
        globalThis.flowController = controller;
      });
    },
    {
      documentInput: fixture(size, edgeCount),
      showMinimap: minimap,
      cullToViewport: size >= 4000,
    }
  );
  const renderedNodeCount = await page.locator(".flow-node").count();
  if (size >= 4000) {
    expect(renderedNodeCount).toBeGreaterThan(0);
    expect(renderedNodeCount).toBeLessThan(size);
    expect(await page.locator(".flow-edge-group").count()).toBeLessThanOrEqual(
      edgeCount
    );
  } else {
    expect(renderedNodeCount).toBe(size);
    await expect(page.locator(".flow-edge-group")).toHaveCount(edgeCount);
  }
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );
};

const measureUpdates = async (
  page: Page,
  size: number,
  edgeCount: number,
  minimap: boolean
): Promise<BenchmarkResult> => {
  const input = fixture(size, edgeCount);
  const warmupCount = size >= 4000 ? 0 : 1;
  const sampleCount = size >= 4000 ? 1 : 4;
  const samples = await page.evaluate(
    ({ documentInput, warmups, count }) => {
      const controller = globalThis.flowController;
      if (controller === undefined)
        throw new Error("Missing benchmark controller");
      const root = document.querySelector<HTMLElement>("#app");
      if (root === null) throw new Error("Missing benchmark host");
      const measure = () => {
        let addedNodes = 0;
        let removedNodes = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            addedNodes += record.addedNodes.length;
            removedNodes += record.removedNodes.length;
          }
        });
        const consume = (records: readonly MutationRecord[]) => {
          for (const record of records) {
            addedNodes += record.addedNodes.length;
            removedNodes += record.removedNodes.length;
          }
        };
        const minimap = root.querySelector(".flow-minimap");
        if (minimap !== null) {
          observer.observe(minimap, { childList: true, subtree: true });
        }
        const start = performance.now();
        controller.update(documentInput);
        const elapsed = performance.now() - start;
        consume(observer.takeRecords());
        observer.disconnect();
        return { elapsed, addedNodes, removedNodes };
      };
      for (let index = 0; index < warmups; index += 1) measure();
      return Array.from({ length: count }, measure);
    },
    { documentInput: input, warmups: warmupCount, count: sampleCount }
  );
  const times = samples.map(({ elapsed }) => elapsed);
  if (times.some((sample) => !Number.isFinite(sample))) {
    throw new Error("Full reconciliation produced a non-finite timing");
  }
  const mutations = samples[0]!;
  if (mutations.addedNodes !== 0 || mutations.removedNodes !== 0) {
    throw new Error("No-op reconciliation unexpectedly changed minimap DOM");
  }
  for (const sample of samples) {
    if (
      sample.addedNodes !== mutations.addedNodes ||
      sample.removedNodes !== mutations.removedNodes
    ) {
      throw new Error("Reconciliation DOM mutation counts were not stable");
    }
  }
  return {
    fixtureSize: size,
    edgeCount,
    minimap,
    renderOnlyVisible: size >= 4000,
    operation: "fullDocumentReconciliation",
    warmupCount,
    sampleCount: times.length,
    medianMs: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    addedNodes: mutations.addedNodes,
    removedNodes: mutations.removedNodes,
  };
};

const measureDragFrames = async (
  page: Page,
  minimap: boolean
): Promise<BenchmarkResult> => {
  const node = page.locator('.flow-node[data-node-id="n0"]');
  const bounds = await node.boundingBox();
  if (bounds === null) throw new Error("Benchmark node has no bounds");
  await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>(
      '.flow-node[data-node-id="n0"]'
    );
    const root = document.querySelector<HTMLElement>("#app");
    if (node === null || root === null) throw new Error("Missing drag fixture");
    globalThis.flowPointerMoveDurations = [];
    globalThis.flowDragMutationCounts = { added: 0, removed: 0 };
    let startedAt: number | undefined;
    document.addEventListener(
      "pointermove",
      () => {
        startedAt = performance.now();
        queueMicrotask(() => {
          if (startedAt !== undefined) {
            globalThis.flowPointerMoveDurations?.push(
              performance.now() - startedAt
            );
            startedAt = undefined;
          }
        });
      },
      true
    );
    globalThis.flowDragMutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        globalThis.flowDragMutationCounts!.added += record.addedNodes.length;
        globalThis.flowDragMutationCounts!.removed +=
          record.removedNodes.length;
      }
    });
    const minimap = root.querySelector(".flow-minimap");
    if (minimap !== null) {
      globalThis.flowDragMutationObserver.observe(minimap, {
        childList: true,
        subtree: true,
      });
    }
  });
  const times: number[] = [];
  for (let index = 0; index < 7; index += 1) {
    const moveStart = await page.evaluate(
      () => globalThis.flowPointerMoveDurations?.length ?? 0
    );
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 12, y + 8, { steps: 2 });
    await page.mouse.up();
    const gestureFrames = await page.evaluate((start) => {
      const values = globalThis.flowPointerMoveDurations ?? [];
      return values.slice(start);
    }, moveStart);
    if (gestureFrames.length === 0) {
      throw new Error("No drag pointer-move frame was observed");
    }
    times.push(percentile(gestureFrames, 0.95));
  }
  const mutationCounts = await page.evaluate(() => {
    const observer = globalThis.flowDragMutationObserver;
    const counts = globalThis.flowDragMutationCounts;
    if (observer === undefined || counts === undefined) {
      throw new Error("Missing drag mutation observer");
    }
    for (const record of observer.takeRecords()) {
      counts.added += record.addedNodes.length;
      counts.removed += record.removedNodes.length;
    }
    observer.disconnect();
    return counts;
  });
  if (times.some((sample) => !Number.isFinite(sample))) {
    throw new Error("Drag frame measurement produced a non-finite timing");
  }
  return {
    fixtureSize: 1000,
    edgeCount: 25,
    minimap,
    renderOnlyVisible: false,
    operation: "singleNodeDragPointerMoveFrame",
    warmupCount: 0,
    sampleCount: times.length,
    medianMs: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    addedNodes: mutationCounts.added,
    removedNodes: mutationCounts.removed,
  };
};

test("reports browser reconciliation and drag frame performance budgets", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await page.evaluate(() =>
    globalThis.dispatchEvent(new Event("beforeunload"))
  );
  const results: BenchmarkResult[] = [];
  for (const size of [250, 1000, 4000]) {
    const edgeCount = Math.floor(size / 40);
    for (const minimap of [false, true]) {
      await mountFixture(page, size, edgeCount, minimap);
      results.push(await measureUpdates(page, size, edgeCount, minimap));
    }
    if (size === 1000) {
      for (const showMinimap of [false, true]) {
        await mountFixture(page, 1000, edgeCount, showMinimap);
        results.push(await measureDragFrames(page, showMinimap));
      }
    }
  }
  for (const edgeCount of [125, 500]) {
    await mountFixture(page, 1000, edgeCount, false);
    results.push(await measureUpdates(page, 1000, edgeCount, false));
  }
  for (const minimap of [false, true]) {
    const dragResult = results.find(
      (result) =>
        result.operation === "singleNodeDragPointerMoveFrame" &&
        result.minimap === minimap
    );
    if (
      dragResult === undefined ||
      (minimap &&
        (dragResult.addedNodes < 1 ||
          dragResult.addedNodes !== dragResult.removedNodes)) ||
      (!minimap &&
        (dragResult.addedNodes !== 0 || dragResult.removedNodes !== 0))
    ) {
      throw new Error(
        `Drag minimap mutation count did not match enabled=${minimap}`
      );
    }
  }
  console.log(
    `FLOW_BROWSER_PERFORMANCE ${JSON.stringify({
      browser: await page.evaluate(() => navigator.userAgent),
      os: process.platform,
      results,
    })}`
  );
  expect(results).toHaveLength(10);
  expect(
    results.every(
      ({ medianMs, p95Ms }) =>
        Number.isFinite(medianMs) && Number.isFinite(p95Ms)
    )
  ).toBe(true);
});
