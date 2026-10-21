import { readFileSync } from 'node:fs'

import { expect } from '@playwright/test'
import { Schema as S } from 'effect'

import { MeasuredGeometryContractSchema } from '../../packages/conformance/src/index.ts'
import type {
  MeasuredGeometryAdapter,
  MeasuredGeometryCase,
} from '../../packages/conformance/src/index.ts'
import { runSerially } from './run-serially.ts'

const contract = S.decodeUnknownSync(MeasuredGeometryContractSchema)(
  JSON.parse(
    readFileSync('research/fixtures/measurement-contract.json', 'utf-8')
  )
)

const documentFor = (scenario: MeasuredGeometryCase) => ({
  edges: [],
  nodes: scenario.nodes.map((node) => ({ ...node, label: node.id })),
})

const closeSize = (
  actual: { readonly width: number; readonly height: number },
  expected: { readonly width: number; readonly height: number }
): void => {
  expect(actual.width).toBeCloseTo(expected.width)
  expect(actual.height).toBeCloseTo(expected.height)
}

const assertNested = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  const [parentNode] = scenario.nodes

  if (parentNode === undefined || parentNode.size === undefined) {
    throw new Error('Nested geometry case is missing parent dimensions')
  }

  await adapter.resizeAndRefresh('parent', parentNode.size)
  const child = await adapter.internalNode('child')
  expect(child?.absolutePosition).toEqual(scenario.expectedAbsolutePosition)
  await expect
    .poll(() =>
      adapter.internalNode('parent').then((node) => node?.measurementStatus)
    )
    .toBe('measured')
  const size = scenario.expectedMeasurement

  if (size === undefined) {
    throw new Error('Nested geometry case is missing expected dimensions')
  }

  const result = await adapter.resizeAndRefresh('child', size)
  expect(result.status).toBe('requested')
  expect(result.width).not.toBeNull()
  expect(result.height).not.toBeNull()
  closeSize({ width: result.width ?? -1, height: result.height ?? -1 }, size)
}

const assertHidden = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  const ready = scenario.expectedReady

  if (ready === undefined) {
    throw new Error('Hidden geometry case is missing readiness expectations')
  }

  expect(await adapter.nodesInitialized(false)).toBe(ready.excludeHidden)
  expect(await adapter.nodesInitialized(true)).toBe(ready.includeHidden)
  expect(await adapter.renderedNodeExists('hidden')).toBe(false)
}

const assertZeroSize = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  const size = scenario.measurement

  if (size === undefined) {
    throw new Error('Zero-sized geometry case is missing dimensions')
  }

  const result = await adapter.resizeAndRefresh('zero', size)
  expect(result.status).toBe('requested')
  closeSize({ width: result.width ?? -1, height: result.height ?? -1 }, size)
  const internal = await adapter.internalNode('zero')
  expect(internal?.measurementStatus).toBe('measured')
}

const assertCulled = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  const [node] = scenario.nodes
  const dimensions = scenario.fitDimensions

  if (node === undefined || dimensions === undefined) {
    throw new Error('Culled geometry case is incomplete')
  }

  const internal = await adapter.internalNode(node.id)
  await expect.poll(() => adapter.renderedNodeExists(node.id)).toBe(false)
  expect(internal?.measurementStatus).toBe('unmeasured')
  expect(internal?.width).toBe(dimensions.width)
  expect(internal?.height).toBe(dimensions.height)
  expect(await adapter.nodesInitialized(false)).toBe(true)
}

const assertReplacement = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  const { nodeId } = scenario
  const [node] = scenario.nodes

  if (nodeId === undefined || node === undefined) {
    throw new Error('Replacement geometry case is incomplete')
  }

  const dimensions = { width: 90, height: 40 }
  await adapter.resizeAndRefresh(nodeId, dimensions)
  await adapter.removeAndReadd(nodeId)
  const result = await adapter.resizeAndRefresh(nodeId, dimensions)

  expect(result.status).toBe('requested')
  closeSize(
    { width: result.width ?? -1, height: result.height ?? -1 },
    dimensions
  )
}

const assertMeasurementCase = async (
  adapter: MeasuredGeometryAdapter,
  scenario: MeasuredGeometryCase
): Promise<void> => {
  await adapter.mountMeasurementDocument(
    documentFor(scenario),
    scenario.name === 'culled-node-fit-fallback'
  )

  switch (scenario.name) {
    case 'nested-visible-node': {
      await assertNested(adapter, scenario)
      break
    }

    case 'hidden-node-readiness': {
      await assertHidden(adapter, scenario)
      break
    }

    case 'zero-sized-node': {
      await assertZeroSize(adapter, scenario)
      break
    }

    case 'culled-node-fit-fallback': {
      await assertCulled(adapter, scenario)
      break
    }

    case 'remove-readd-same-id': {
      await assertReplacement(adapter, scenario)
      break
    }

    default: {
      throw new Error(`Unknown geometry case: ${scenario.name}`)
    }
  }

  await adapter.destroyMeasurementDocument()
}

export const assertSharedMeasurementContract = async (
  adapter: MeasuredGeometryAdapter
): Promise<void> => {
  await runSerially(contract.cases, (scenario) =>
    assertMeasurementCase(adapter, scenario)
  )
}
