import { Schema as S } from "effect";

import type {
  MeasuredNode,
  Viewport,
  ViewportLimits,
} from "./flow-runtime.schema.ts";
import type { FlowNode, NodeId } from "./flow.schema.ts";

export interface FitViewInput {
  readonly nodes: readonly FlowNode[];
  readonly measurements: ReadonlyMap<NodeId, MeasuredNode>;
  readonly currentViewport: Viewport;
  readonly paneWidth: number;
  readonly paneHeight: number;
  readonly limits: ViewportLimits;
  /** Fraction of each pane dimension reserved on each side. */
  readonly padding?: FitViewPadding | undefined;
  /** Dimensions used until a visible node has a positive DOM measurement. */
  readonly fallbackDimensions?: FitViewNodeDimensions | undefined;
}

export const FitViewPaddingSchema = S.Finite.check(
  S.isGreaterThanOrEqualTo(0),
  S.isLessThan(0.5)
);

export type FitViewPadding = typeof FitViewPaddingSchema.Type;

export const FitViewNodeDimensionsSchema = S.Struct({
  width: S.Finite.check(S.isGreaterThan(0)),
  height: S.Finite.check(S.isGreaterThan(0)),
});

export type FitViewNodeDimensions = typeof FitViewNodeDimensionsSchema.Type;

/** Center visible nodes with measured or fallback dimensions within the pane. */
export const fitViewportToNodes = ({
  nodes,
  measurements,
  currentViewport,
  paneWidth,
  paneHeight,
  limits,
  padding = 0.1,
  fallbackDimensions,
}: FitViewInput): Viewport => {
  if (paneWidth <= 0 || paneHeight <= 0) {
    return currentViewport;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const measurement = measurements.get(node.id);

    const dimensions =
      measurement !== undefined &&
      measurement.width > 0 &&
      measurement.height > 0
        ? measurement
        : fallbackDimensions;

    if (node.hidden === true || dimensions === undefined) {
      continue;
    }

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + dimensions.width);
    maxY = Math.max(maxY, node.position.y + dimensions.height);
  }

  if (minX === Infinity) {
    return currentViewport;
  }

  const usableWidth = paneWidth * (1 - padding * 2);
  const usableHeight = paneHeight * (1 - padding * 2);

  const fitZoom = Math.min(
    usableWidth / (maxX - minX),
    usableHeight / (maxY - minY)
  );

  const zoom = Math.min(limits.maxZoom, Math.max(limits.minZoom, fitZoom));

  return {
    x: paneWidth / 2 - ((minX + maxX) / 2) * zoom,
    y: paneHeight / 2 - ((minY + maxY) / 2) * zoom,
    zoom,
  };
};
