import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { cpus, release, totalmem, type } from 'node:os'
import path from 'node:path'

import type { Browser, Page } from '@playwright/test'
import { Schema } from 'effect'
import { format } from 'oxfmt'

import formatterConfig from '../../oxfmt.config.ts'

const RequiredHostCoverageSchema = Schema.Struct({
  status: Schema.Literal('required'),
  cullingMode: Schema.Literals(['enabled', 'disabled']),
  minimapMode: Schema.Literals(['enabled', 'disabled', 'unavailable']),
})

const NotApplicableHostCoverageSchema = Schema.Struct({
  status: Schema.Literal('not-applicable'),
  reason: Schema.String,
})

const HostCoverageSchema = Schema.Union([
  RequiredHostCoverageSchema,
  NotApplicableHostCoverageSchema,
])

const CalibrationWorkloadSchema = Schema.Struct({
  id: Schema.String,
  operation: Schema.String,
  nodeCount: Schema.Number,
  edgeCount: Schema.Number,
  inputLatencyDefinition: Schema.String,
  hostCoverage: Schema.Struct({
    vanilla: HostCoverageSchema,
    vue: HostCoverageSchema,
    foldkit: HostCoverageSchema,
  }),
})

const CalibrationRegistrySchema = Schema.Struct({
  workloads: Schema.Array(CalibrationWorkloadSchema),
})

export type CalibrationWorkload = Schema.Schema.Type<
  typeof CalibrationWorkloadSchema
> & {
  readonly coverage: Schema.Schema.Type<typeof RequiredHostCoverageSchema>
}

export const calibrationRegistryPath = path.resolve(
  import.meta.dirname,
  '../../research/benchmarks/calibration.json'
)

export const minimumWarmupSamplesPerRun = 5

export const minimumTimedSamplesPerRun = 20

export const minimumIndependentRunsPerHostWorkload = 3

export type CalibrationHost = 'vanilla' | 'vue' | 'foldkit'

export const calibrationWorkloads = (host: CalibrationHost) => {
  const registry = Schema.decodeUnknownSync(CalibrationRegistrySchema)(
    JSON.parse(readFileSync(calibrationRegistryPath, 'utf-8'))
  )

  return registry.workloads.flatMap((candidate) => {
    const hostCoverage = candidate.hostCoverage[host]

    if (hostCoverage.status === 'not-applicable') {
      return []
    }

    return [{ ...candidate, coverage: hostCoverage }]
  })
}

export const calibrationNode = (index: number) => ({
  id: `n${index}`,
  label: `Node ${index}`,
  position: {
    x: (index % 80) * 180,
    y: Math.floor(index / 80) * 100,
  },
  size: { width: 120, height: 48 },
  handles: [
    { id: 'out', kind: 'source' as const, side: 'right' as const },
    { id: 'in', kind: 'target' as const, side: 'left' as const },
  ],
})

export const calibrationDocument = (nodeCount: number, edgeCount: number) => ({
  nodes: Array.from({ length: nodeCount }, (_, index) =>
    calibrationNode(index)
  ),
  edges: Array.from({ length: edgeCount }, (_, index) => ({
    id: `e${index}`,
    source: `n${index}`,
    target: `n${index + 1}`,
  })),
})

export const percentile = (
  values: readonly number[],
  fraction: number
): number => {
  if (values.length === 0) {
    throw new Error('Cannot summarize an empty sample set')
  }

  const ordered = values.toSorted((left, right) => left - right)

  const index = Math.min(
    values.length - 1,
    Math.ceil(values.length * fraction) - 1
  )

  const value = ordered[index]

  if (value === undefined) {
    throw new Error('Percentile index is outside the sample range')
  }

  return value
}

export const newRunId = (): string => randomUUID()

export interface CalibrationSourceRevision {
  readonly revision: string
  readonly treeState: 'clean' | 'dirty'
}

export const sourceRevision = (): CalibrationSourceRevision => {
  const root = path.resolve(import.meta.dirname, '../..')

  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf-8',
  }).trim()

  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf-8',
  })

  return {
    revision: status.length === 0 ? revision : `working-tree@${revision}`,
    treeState: status.length === 0 ? 'clean' : 'dirty',
  }
}

export const environmentMetadata = (
  browserName: string,
  browserVersion: string,
  viewport: { readonly width: number; readonly height: number },
  deviceScaleFactor: number,
  playwrightVersion: string
) => ({
  browser: { name: browserName, version: browserVersion },
  os: { name: type(), release: release(), architecture: process.arch },
  runtime: {
    node: process.versions.node,
    bun: execFileSync('bun', ['--version'], { encoding: 'utf-8' }).trim(),
    playwright: playwrightVersion,
  },
  hardware: {
    cpuModel: cpus()[0]?.model ?? 'unreported',
    logicalCpuCount: cpus().length,
    totalMemoryBytes: totalmem(),
  },
  viewport: {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor,
  },
})

export const waitForTwoFrames = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    // oxlint-disable-next-line promise/avoid-new -- Awaiting rAF is the browser's frame-completion signal.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })

    // oxlint-disable-next-line promise/avoid-new -- Awaiting the next rAF confirms a second settled frame.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })

export const calibrationEnvironment = async (
  browser: Browser,
  page: Page
): Promise<ReturnType<typeof environmentMetadata>> => {
  const viewport = page.viewportSize()

  if (viewport === null) {
    throw new Error('Calibration requires a fixed viewport')
  }

  const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio)
  const root = path.resolve(import.meta.dirname, '../..')

  // SAFETY: The declared @playwright/test package manifest contains its required string version field.
  const playwrightPackage = JSON.parse(
    readFileSync(
      path.join(root, 'node_modules/@playwright/test/package.json'),
      'utf-8'
    )
  ) as { readonly version: string }

  return environmentMetadata(
    browser.browserType().name(),
    browser.version(),
    viewport,
    deviceScaleFactor,
    playwrightPackage.version
  )
}

export interface CalibrationMeasurement {
  readonly workloadId: string
  readonly operation: string
  readonly nodeCount: number
  readonly edgeCount: number
  readonly cullingMode: 'enabled' | 'disabled'
  readonly minimapMode: 'enabled' | 'disabled' | 'unavailable'
  readonly warmupCount: number
  readonly samplesMs: readonly number[]
  readonly medianMs: number
  readonly p95Ms: number
  readonly inputLatencyDefinition: string
  readonly teardown: {
    readonly retainedResourceScope: 'observable-dom-only; active listener/frame handles are not introspectable'
    readonly domDescendants: number
    readonly nodeElements: number
    readonly edgeElements: number
    readonly minimapElements: number
  }
}

export interface CalibrationRun {
  readonly runId: string
  readonly host: 'vanilla' | 'vue' | 'foldkit'
  readonly command: string
  readonly sourceRevision: string
  readonly sourceTreeState: 'clean' | 'dirty'
  readonly environment: ReturnType<typeof environmentMetadata>
  readonly measurements: readonly CalibrationMeasurement[]
}

export const appendCalibrationRun = async (
  run: CalibrationRun
): Promise<void> => {
  // SAFETY: The checked-in calibration registry is loaded from its own validated file and owns this versioned run list.
  const original = JSON.parse(
    readFileSync(calibrationRegistryPath, 'utf-8')
  ) as {
    readonly runs: readonly CalibrationRun[]
  }

  if (original.runs.some(({ runId }) => runId === run.runId)) {
    throw new Error(`Calibration run id already exists: ${run.runId}`)
  }

  const updated = { ...original, runs: [...original.runs, run] }

  const temp = path.join(
    path.dirname(calibrationRegistryPath),
    `.calibration.${run.runId}.tmp`
  )

  const formatted = await format(
    calibrationRegistryPath,
    `${JSON.stringify(updated, null, 2)}\n`,
    formatterConfig
  )

  if (formatted.errors.length > 0) {
    throw new Error('Unable to format calibration registry')
  }

  writeFileSync(temp, formatted.code)
  renameSync(temp, calibrationRegistryPath)
}
