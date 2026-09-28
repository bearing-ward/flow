import { readFileSync } from 'node:fs'

import { Schema as S } from 'effect'

import { RendererContractFixtureSchema } from '../../packages/conformance/src/index.ts'
import type { RendererContractFixture } from '../../packages/conformance/src/index.ts'

export const rendererContractFixture: RendererContractFixture =
  S.decodeUnknownSync(RendererContractFixtureSchema)(
    JSON.parse(
      readFileSync(
        new URL(
          '../../research/fixtures/renderer-contract.json',
          import.meta.url
        ),
        'utf-8'
      )
    )
  )

export interface RendererContractObservedHandle {
  readonly nodeId: string
  readonly handleId: string
  readonly side: 'left' | 'right' | 'top' | 'bottom'
  readonly bounds: {
    readonly left: number
    readonly top: number
    readonly right: number
    readonly bottom: number
  }
}

export interface RendererContractObservedEdge {
  readonly id: string
  readonly type: string
  readonly path: string
  readonly label: string | null
  readonly markerStart: string | null
  readonly markerEnd: string | null
  readonly source: string
  readonly sourceHandle: string
  readonly target: string
  readonly targetHandle: string
  readonly start: { readonly x: number; readonly y: number }
  readonly end: { readonly x: number; readonly y: number }
}

export interface RendererContractObservedOutput {
  readonly nodeIds: readonly string[]
  readonly handles: readonly RendererContractObservedHandle[]
  readonly edges: readonly RendererContractObservedEdge[]
}

const fixtureEdges = rendererContractFixture.document.edges

export const expectedRendererContractSemantics = {
  nodeIds: rendererContractFixture.expected.nodeTypes
    .map(({ id }) => id)
    .toSorted(),
  edges: fixtureEdges
    .map((edge) => ({
      id: edge.id,
      type: edge.type ?? 'default',
      path: edge.path ?? 'straight',
      label: edge.label ?? null,
      markerStart: edge.markerStart ?? null,
      markerEnd: edge.markerEnd ?? null,
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id)),
  builtInPaths: rendererContractFixture.expected.builtInPaths.toSorted(),
}

const expectedHandleBoundary = (handle: RendererContractObservedHandle) => {
  const { bounds, side } = handle
  const middleX = (bounds.left + bounds.right) / 2
  const middleY = (bounds.top + bounds.bottom) / 2

  switch (side) {
    case 'left': {
      return { x: bounds.left, y: middleY }
    }

    case 'right': {
      return { x: bounds.right, y: middleY }
    }

    case 'top': {
      return { x: middleX, y: bounds.top }
    }

    case 'bottom': {
      return { x: middleX, y: bounds.bottom }
    }

    default: {
      throw new TypeError(`Unknown handle side: ${side}`)
    }
  }
}

const samePoint = (
  actual: { readonly x: number; readonly y: number },
  expected: { readonly x: number; readonly y: number }
): boolean =>
  Math.abs(actual.x - expected.x) <= 1 && Math.abs(actual.y - expected.y) <= 1

export const normalizeRendererContractOutput = (
  observed: RendererContractObservedOutput
) => {
  const handleByKey = new Map(
    observed.handles.map((handle) => [
      `${handle.nodeId}:${handle.handleId}`,
      handle,
    ])
  )

  const edges = observed.edges
    .map((edge) => {
      const source = handleByKey.get(`${edge.source}:${edge.sourceHandle}`)
      const target = handleByKey.get(`${edge.target}:${edge.targetHandle}`)

      const geometryAttachesToMeasuredHandles =
        source !== undefined &&
        target !== undefined &&
        samePoint(edge.start, expectedHandleBoundary(source)) &&
        samePoint(edge.end, expectedHandleBoundary(target))

      return {
        id: edge.id,
        type: edge.type,
        path: edge.path,
        label: edge.label,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
        geometryAttachesToMeasuredHandles,
      }
    })
    .toSorted((left, right) => left.id.localeCompare(right.id))

  return {
    nodeIds: observed.nodeIds.toSorted(),
    edges,
    builtInPaths: edges
      .filter(({ type }) => type === 'builtin')
      .map(({ path }) => path)
      .filter((path, index, all) => all.indexOf(path) === index)
      .toSorted(),
    allEdgesAttachToMeasuredHandles: edges.every(
      ({ geometryAttachesToMeasuredHandles }) =>
        geometryAttachesToMeasuredHandles
    ),
  }
}
