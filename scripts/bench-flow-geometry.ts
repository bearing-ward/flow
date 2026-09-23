import { Effect } from "effect";
import {
  createFlowGraph,
  decodeFlowDocument,
  graphBounds,
  graphNodesIntersecting,
  selectionInRect,
} from "../packages/core/src/public.ts";

const sizes = [250, 1000, 4000] as const;
const sampleCount = 31;
const rect = { x: 0, y: 0, width: 1600, height: 1000 };

const percentile = (values: readonly number[], fraction: number): number =>
  [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)]!;

const measure = (size: number, operation: string, run: () => unknown): object => {
  for (let index = 0; index < 5; index += 1) run();
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const start = performance.now();
    const result = run();
    samples.push(performance.now() - start);
    if (result === undefined) throw new Error(`${operation} returned no measurement`);
  }
  if (samples.some((sample) => !Number.isFinite(sample))) {
    throw new Error(`${operation} produced a non-finite timing`);
  }
  return {
    fixtureSize: size,
    operation,
    sampleCount,
    medianMs: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
  };
};

const results: object[] = [];
for (const size of sizes) {
  const nodes = Array.from({ length: size }, (_, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    parentId: index > 0 && index % 2 === 0 ? "n0" : undefined,
    position: index === 0 ? { x: 0, y: 0 } : { x: (index % 100) * 24, y: Math.floor(index / 100) * 60 },
    size: { width: 40 + (index % 3) * 5, height: 28 + (index % 2) * 4 },
  }));
  const edges = Array.from({ length: Math.floor(size / 2) }, (_, index) => ({
    id: `e${index}`,
    source: `n${index * 2}`,
    target: `n${index * 2 + 1}`,
  }));
  const document = Effect.runSync(decodeFlowDocument({ nodes, edges }));
  const measurements = new Map(nodes.filter((_, index) => index % 4 === 0).map((node, index) => [
    node.id as never,
    { nodeId: node.id as never, width: 60 + (index % 2) * 10, height: 36 + (index % 2) * 6 },
  ]));
  const graph = createFlowGraph(document, measurements);
  results.push(measure(size, "createFlowGraph", () => createFlowGraph(document, measurements)));
  results.push(measure(size, "graphBounds", () => graphBounds(graph)));
  results.push(measure(size, "graphNodesIntersecting", () => graphNodesIntersecting(graph, rect)));
  results.push(measure(size, "selectionInRect", () => selectionInRect(graph, rect, "partial")));
}

console.log(JSON.stringify(results, null, 2));
