import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { checkBenchmarkCalibration } from './check-benchmark-calibration.ts'

const hosts = ['vanilla', 'vue', 'foldkit'] as const

type TestHost = (typeof hosts)[number]

type TestCoverage =
  | {
      status: 'required'
      cullingMode: 'enabled' | 'disabled'
      minimapMode: 'enabled' | 'disabled' | 'unavailable'
    }
  | { status: 'not-applicable'; reason: string }

interface TestWorkload {
  id: string
  operation: string
  nodeCount: number
  edgeCount: number
  inputLatencyDefinition: string
  hostCoverage: Partial<Record<TestHost, TestCoverage>>
}

interface TestMeasurement {
  workloadId: string
  operation: string
  nodeCount: number
  edgeCount: number
  cullingMode: 'enabled' | 'disabled'
  minimapMode: 'enabled' | 'disabled' | 'unavailable'
  warmupCount: number
  samplesMs: number[]
  medianMs: number
  p95Ms: number
  inputLatencyDefinition: string
  teardown: {
    retainedResourceScope: string
    domDescendants: number
    nodeElements: number
    edgeElements: number
    minimapElements: number
  }
}

interface TestEnvironment {
  browser: { name: string; version: string }
  os: { name: string; release: string; architecture: string }
  runtime: { node: string; bun: string; playwright: string }
  hardware: {
    cpuModel: string
    logicalCpuCount: number
    totalMemoryBytes: number
  }
  viewport: { width: number; height: number; deviceScaleFactor: number }
}

interface TestRun {
  runId: string
  host: TestHost
  command: string
  sourceRevision: string
  sourceTreeState: 'clean' | 'dirty'
  environment: TestEnvironment
  measurements: TestMeasurement[]
}

interface TestBudget {
  host: TestHost
  workloadId: string
  medianMs: number
  p95Ms: number
  basisRunIds: string[]
}

interface TestRegistry {
  schemaVersion: number
  capturedOn: string
  baselineSourceRevision: string
  reference: {
    existingVanillaWorkload: string
    hostWorkloadBoundary: string
  }
  policy: {
    minimumIndependentRunsPerHostWorkload: number
    minimumWarmupSamplesPerRun: number
    minimumTimedSamplesPerRun: number
    timingBudgetStatus: string
    timingBudgets: TestBudget[]
  }
  hosts: TestHost[]
  workloads: TestWorkload[]
  runs: TestRun[]
}

// SAFETY: This fixture is the checked-in calibration registry and its shape is verified by the validator tests below.
const baseline = JSON.parse(
  readFileSync('research/benchmarks/calibration.json', 'utf-8')
) as TestRegistry

const sampleValues = Array.from({ length: 20 }, (_, index) => index + 1)

const environment: TestEnvironment = {
  browser: { name: 'chromium', version: 'test-version' },
  os: { name: 'test-os', release: 'test-release', architecture: 'x64' },
  runtime: { node: '22.0.0', bun: '1.3.14', playwright: '1.62.1' },
  hardware: {
    cpuModel: 'test-cpu',
    logicalCpuCount: 8,
    totalMemoryBytes: 16_000_000_000,
  },
  viewport: { width: 960, height: 640, deviceScaleFactor: 1 },
}

const median = 10

const p95 = 19

const validRegistry = (): TestRegistry => {
  const registry = structuredClone(baseline)
  registry.runs = hosts.flatMap((host) =>
    Array.from({ length: 3 }, (_, runNumber) => {
      const runId = `00000000-0000-4000-8000-${String(runNumber + hosts.indexOf(host) * 3 + 1).padStart(12, '0')}`

      const measurements = registry.workloads.flatMap(
        (workload: TestWorkload) => {
          const coverage = workload.hostCoverage[host]

          if (coverage?.status !== 'required') {
            return []
          }

          return [
            {
              workloadId: workload.id,
              operation: workload.operation,
              nodeCount: workload.nodeCount,
              edgeCount: workload.edgeCount,
              cullingMode: coverage.cullingMode,
              minimapMode: coverage.minimapMode,
              warmupCount: 5,
              samplesMs: sampleValues,
              medianMs: median,
              p95Ms: p95,
              inputLatencyDefinition: workload.inputLatencyDefinition,
              teardown: {
                retainedResourceScope:
                  'observable-dom-only; active listener/frame handles are not introspectable',
                domDescendants: 0,
                nodeElements: 0,
                edgeElements: 0,
                minimapElements: 0,
              },
            },
          ]
        }
      )

      return {
        runId,
        host,
        command: 'bun run test:browser -- performance-calibration.e2e.ts',
        sourceRevision: 'working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898',
        sourceTreeState: 'dirty',
        environment,
        measurements,
      }
    })
  )

  return registry
}

const approvedRegistry = (): TestRegistry => {
  const registry = validRegistry()

  const additionalRun = structuredClone(
    registry.runs.find((run) => run.host === 'vanilla')
  )

  if (additionalRun === undefined) {
    throw new Error('Missing Vanilla run fixture')
  }

  additionalRun.runId = '00000000-0000-4000-8000-000000000010'
  registry.runs.push(additionalRun)
  registry.policy.timingBudgetStatus = 'approved'
  registry.policy.timingBudgets = registry.workloads.flatMap((workload) =>
    hosts.flatMap((host) => {
      if (workload.hostCoverage[host]?.status !== 'required') {
        return []
      }

      const runIds = registry.runs
        .filter((run) => run.host === host)
        .slice(0, 3)
        .map(({ runId }) => runId)

      return [
        {
          host,
          workloadId: workload.id,
          medianMs: 15,
          p95Ms: 25,
          basisRunIds: runIds,
        },
      ]
    })
  )

  return registry
}

describe('benchmark calibration validation', () => {
  it('validates the real repository', () => {
    expect(() =>
      execFileSync('bun', ['run', 'scripts/check-benchmark-calibration.ts'], {
        stdio: 'pipe',
      })
    ).not.toThrow()
  })

  it('accepts an empty pending registry without inventing thresholds', () => {
    const pendingRegistry = { ...baseline, runs: [] }

    expect(checkBenchmarkCalibration(pendingRegistry)).toStrictEqual([])
  })

  it('accepts complete warmed evidence for every required host/workload cell', () => {
    expect(checkBenchmarkCalibration(validRegistry())).toStrictEqual([])
  })

  it('rejects a missing host/workload coverage declaration', () => {
    const registry = validRegistry()
    delete registry.workloads[0]?.hostCoverage.vue
    expect(checkBenchmarkCalibration(registry)).toContain(
      'Missing host/workload coverage for vue/reconcile-250-sparse'
    )
  })

  it('rejects incomplete environment metadata', () => {
    const registry = validRegistry()
    const [run] = registry.runs

    if (run === undefined) {
      throw new Error('Missing test run')
    }

    run.environment.hardware.cpuModel = ''
    expect(checkBenchmarkCalibration(registry)).toContain(
      `Incomplete environment metadata for run ${registry.runs[0]?.host}/${registry.runs[0]?.runId}`
    )
  })

  it('rejects fewer than three independent runs per supported host/workload', () => {
    const registry = validRegistry()
    registry.runs = registry.runs.filter(
      (run) => !(run.host === 'vanilla' && run.runId.endsWith('000000000003'))
    )
    expect(checkBenchmarkCalibration(registry)).toContain(
      'Insufficient independent runs for vanilla/reconcile-250-sparse: 2/3'
    )
  })

  it('rejects insufficient raw samples and mismatched summaries', () => {
    const registry = validRegistry()
    const measurement = registry.runs[0]?.measurements[0]

    if (measurement === undefined) {
      throw new Error('Missing test measurement')
    }

    measurement.samplesMs = sampleValues.slice(0, 19)
    expect(
      checkBenchmarkCalibration(registry).some((failure) =>
        failure.startsWith('Insufficient or invalid raw samples for ')
      )
    ).toBeTruthy()
  })

  it('rejects fabricated numeric budgets while status is pending', () => {
    const registry = validRegistry()
    registry.policy.timingBudgets = [
      {
        host: 'vanilla',
        workloadId: 'reconcile-250-sparse',
        medianMs: 1,
        p95Ms: 2,
        basisRunIds: [],
      },
    ]
    expect(checkBenchmarkCalibration(registry)).toContain(
      'Pending calibration must not contain numeric timing budgets'
    )
  })

  it('rejects malformed declared budget records', () => {
    const registry = validRegistry()
    registry.policy.timingBudgetStatus = 'approved'
    registry.policy.timingBudgets = [
      {
        host: 'vanilla',
        workloadId: 'reconcile-250-sparse',
        medianMs: 10,
        p95Ms: 9,
        basisRunIds: ['missing-run'],
      },
    ]
    const failures = checkBenchmarkCalibration(registry)
    expect(failures).toContain(
      'Invalid timing budget values for vanilla/reconcile-250-sparse'
    )
    expect(failures).toContain(
      'Invalid basis run IDs for timing budget vanilla/reconcile-250-sparse'
    )
  })

  it('fails a budget breach in a non-basis run', () => {
    const registry = approvedRegistry()

    const additionalRun = registry.runs.find(
      (run) => run.runId === '00000000-0000-4000-8000-000000000010'
    )

    const measurement = additionalRun?.measurements.find(
      (candidate) => candidate.workloadId === 'reconcile-250-sparse'
    )

    if (measurement === undefined) {
      throw new Error('Missing non-basis test measurement')
    }

    measurement.samplesMs = Array.from({ length: 20 }, () => 30)
    measurement.medianMs = 30
    measurement.p95Ms = 30
    expect(checkBenchmarkCalibration(registry)).toContain(
      'Timing budget breached for vanilla/reconcile-250-sparse in run 00000000-0000-4000-8000-000000000010: median 30 > 15; p95 30 > 25'
    )
  })

  it('requires approved budgets for every required host/workload cell', () => {
    const registry = approvedRegistry()
    registry.policy.timingBudgets = registry.policy.timingBudgets.filter(
      (budget) =>
        !(budget.host === 'vanilla' && budget.workloadId === 'drag-1000-sparse')
    )
    expect(checkBenchmarkCalibration(registry)).toContain(
      'Approved timing budget missing required cell: vanilla/drag-1000-sparse'
    )
  })
})
