import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path } from 'effect'

/* oxlint-disable anti-slop/no-runtime-typeof -- This checker parses arbitrary JSON primitives at its external input boundary. */
/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- Dynamic JSON objects are inspected field-by-field to report precise validation failures. */
/* oxlint-disable anti-slop/no-known-value-widening -- Boundary guards begin with unknown and narrow only after runtime checks. */
/* oxlint-disable anti-slop/no-unknown-parameters -- The public checker deliberately receives untrusted decoded JSON for negative validation. */

export type CalibrationHost = 'vanilla' | 'vue' | 'foldkit'

const hosts: readonly CalibrationHost[] = ['vanilla', 'vue', 'foldkit']

const isCalibrationHost = (value: unknown): value is CalibrationHost =>
  typeof value === 'string' && hosts.some((host) => host === value)

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

const percentile = (values: readonly number[], fraction: number): number => {
  const ordered = values.toSorted((left, right) => left - right)

  const index = Math.min(
    values.length - 1,
    Math.ceil(values.length * fraction) - 1
  )

  return ordered[index] ?? Number.NaN
}

// oxlint-disable-next-line complexity -- Keeping the cross-field registry contract together makes each diagnostic cite the affected host/workload cell.
export const checkBenchmarkCalibration = (input: unknown): string[] => {
  const failures: string[] = []

  if (!record(input)) {
    return ['Calibration registry must be an object']
  }

  const registry = input
  const { policy } = registry
  const registryHosts = registry.hosts
  const { workloads } = registry
  const { runs } = registry

  if (registry.schemaVersion !== 1) {
    failures.push('Unsupported calibration schema version')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(registry.capturedOn))) {
    failures.push('Invalid calibration capture date')
  }

  if (
    !nonEmpty(registry.baselineSourceRevision) ||
    !/^(?:[0-9a-f]{40}|working-tree@[0-9a-f]{40})$/u.test(
      registry.baselineSourceRevision
    )
  ) {
    failures.push('Invalid calibration baseline source revision')
  }

  if (!record(policy)) {
    return [...failures, 'Calibration policy must be an object']
  }

  const minimumRuns = policy.minimumIndependentRunsPerHostWorkload
  const minimumWarmups = policy.minimumWarmupSamplesPerRun
  const minimumSamples = policy.minimumTimedSamplesPerRun

  if (!integer(minimumRuns) || minimumRuns < 3) {
    failures.push('Minimum independent runs must be at least 3')
  }

  if (!integer(minimumWarmups) || minimumWarmups < 1) {
    failures.push('Minimum warmups must be positive')
  }

  if (!integer(minimumSamples) || minimumSamples < 20) {
    failures.push('Minimum timed samples must be at least 20')
  }

  const minimumRunCount = integer(minimumRuns) ? minimumRuns : 3

  const minimumWarmupCount = integer(minimumWarmups) ? minimumWarmups : 5

  const minimumSampleCount = integer(minimumSamples) ? minimumSamples : 20

  if (
    !Array.isArray(registryHosts) ||
    hosts.some((host) => !registryHosts.includes(host))
  ) {
    failures.push(
      'Registry must declare all supported hosts: vanilla, vue, foldkit'
    )
  }

  if (!Array.isArray(workloads) || workloads.length === 0) {
    failures.push('Calibration registry has no workload definitions')

    return failures
  }

  if (!Array.isArray(runs)) {
    failures.push('Calibration runs must be an array')

    return failures
  }

  const workloadById = new Map<string, Record<string, unknown>>()

  for (const [index, candidate] of workloads.entries()) {
    if (!record(candidate)) {
      failures.push(`Workload ${index} must be an object`)
      continue
    }

    const workload = candidate
    const { id } = workload

    if (!nonEmpty(id)) {
      failures.push(`Workload ${index} has no id`)
      continue
    }

    if (workloadById.has(id)) {
      failures.push(`Duplicate workload id: ${id}`)
    }

    workloadById.set(id, workload)

    if (
      !nonEmpty(workload.operation) ||
      !integer(workload.nodeCount) ||
      workload.nodeCount < 1 ||
      !integer(workload.edgeCount) ||
      workload.edgeCount < 0
    ) {
      failures.push(`Invalid operation or density for workload ${id}`)
    }

    if (!nonEmpty(workload.inputLatencyDefinition)) {
      failures.push(`Missing input latency definition for workload ${id}`)
    }

    if (!record(workload.hostCoverage)) {
      failures.push(`Missing host coverage map for workload ${id}`)
      continue
    }

    for (const host of hosts) {
      const coverage = workload.hostCoverage[host]

      if (!record(coverage)) {
        failures.push(`Missing host/workload coverage for ${host}/${id}`)
        continue
      }

      if (coverage.status === 'required') {
        if (!['enabled', 'disabled'].includes(String(coverage.cullingMode))) {
          failures.push(`Missing culling mode for ${host}/${id}`)
        }

        if (
          !['enabled', 'disabled', 'unavailable'].includes(
            String(coverage.minimapMode)
          )
        ) {
          failures.push(`Missing minimap mode for ${host}/${id}`)
        }
      } else if (coverage.status === 'not-applicable') {
        if (!nonEmpty(coverage.reason)) {
          failures.push(`Missing not-applicable reason for ${host}/${id}`)
        }
      } else {
        failures.push(`Invalid coverage status for ${host}/${id}`)
      }
    }
  }

  const runIdsByHost = new Map<CalibrationHost, Set<string>>(
    hosts.map((host) => [host, new Set<string>()])
  )

  const measurementRunIds = new Map<string, Set<string>>()

  for (const [runIndex, candidate] of runs.entries()) {
    if (!record(candidate)) {
      failures.push(`Run ${runIndex} must be an object`)
      continue
    }

    const run = candidate
    const { runId } = run
    const { host } = run

    if (
      !nonEmpty(runId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        String(runId)
      )
    ) {
      failures.push(`Run ${runIndex} has invalid independent run id`)
      continue
    }

    if (!isCalibrationHost(host)) {
      failures.push(`Run ${runId} has unknown host`)
      continue
    }

    const typedHost = host
    const hostRunIds = runIdsByHost.get(typedHost)

    if (hostRunIds === undefined) {
      failures.push(`Missing run identity set for host ${typedHost}`)
      continue
    }

    if (hostRunIds.has(runId)) {
      failures.push(`Duplicate run id for host ${typedHost}: ${runId}`)
    }

    hostRunIds.add(runId)
    const runKey = `${typedHost}/${runId}`

    if (!nonEmpty(run.command)) {
      failures.push(`Missing command for run ${runKey}`)
    }

    if (
      !nonEmpty(run.sourceRevision) ||
      !/^(?:[0-9a-f]{40}|working-tree@[0-9a-f]{40})$/u.test(run.sourceRevision)
    ) {
      failures.push(`Missing or invalid source revision for run ${runKey}`)
    }

    if (!['clean', 'dirty'].includes(String(run.sourceTreeState))) {
      failures.push(`Missing source tree state for run ${runKey}`)
    }

    // oxlint-disable-next-line no-use-before-define -- Helpers are grouped below validation for readability.
    if (!checkEnvironment(run.environment)) {
      failures.push(`Incomplete environment metadata for run ${runKey}`)
    }

    if (!Array.isArray(run.measurements)) {
      failures.push(`Missing measurements for run ${runKey}`)
      continue
    }

    const measurementWorkloads = new Set<string>()

    for (const measurementCandidate of run.measurements) {
      if (!record(measurementCandidate)) {
        failures.push(`Invalid measurement in run ${runKey}`)
        continue
      }

      const measurement = measurementCandidate
      const { workloadId } = measurement

      if (!nonEmpty(workloadId)) {
        failures.push(`Measurement without workload id in run ${runKey}`)
        continue
      }

      if (measurementWorkloads.has(workloadId)) {
        failures.push(
          `Duplicate workload measurement in run ${runKey}: ${workloadId}`
        )
      }

      measurementWorkloads.add(workloadId)
      const workload = workloadById.get(workloadId)

      if (workload === undefined) {
        failures.push(`Unknown workload in run ${runKey}: ${workloadId}`)
        continue
      }

      const hostCoverage = record(workload.hostCoverage)
        ? workload.hostCoverage[typedHost]
        : undefined

      if (!record(hostCoverage) || hostCoverage.status !== 'required') {
        failures.push(
          `Unexpected measurement for unsupported ${typedHost}/${workloadId}`
        )
        continue
      }

      // oxlint-disable-next-line no-use-before-define -- Measurement validation helper is grouped below the registry traversal.
      validateMeasurement(
        measurement,
        workload,
        hostCoverage,
        runKey,
        minimumWarmupCount,
        minimumSampleCount,
        failures
      )
      const pairKey = `${typedHost}/${workloadId}`
      const pairRuns = measurementRunIds.get(pairKey) ?? new Set<string>()
      pairRuns.add(runId)
      measurementRunIds.set(pairKey, pairRuns)
    }

    for (const workload of workloadById.values()) {
      const coverage = record(workload.hostCoverage)
        ? workload.hostCoverage[typedHost]
        : undefined

      if (
        record(coverage) &&
        coverage.status === 'required' &&
        !measurementWorkloads.has(String(workload.id))
      ) {
        failures.push(
          `Missing host/workload measurement in run ${runKey}: ${String(workload.id)}`
        )
      }
    }
  }

  // oxlint-disable-next-line no-use-before-define -- Coverage helper is grouped below the registry traversal.
  const required = requiredPairs(workloadById)

  const pendingWithoutRuns =
    runs.length === 0 && policy.timingBudgetStatus === 'pending-calibration'

  if (!pendingWithoutRuns) {
    for (const [host, workloadId] of required) {
      const count = measurementRunIds.get(`${host}/${workloadId}`)?.size ?? 0

      if (count < minimumRunCount) {
        failures.push(
          `Insufficient independent runs for ${host}/${workloadId}: ${count}/${minimumRunCount}`
        )
      }
    }
  }

  const budgetStatus = policy.timingBudgetStatus
  const budgets = policy.timingBudgets

  if (Array.isArray(budgets)) {
    if (
      !['pending-calibration', 'pending-budget-review', 'approved'].includes(
        String(budgetStatus)
      )
    ) {
      failures.push('Invalid timing budget status')
    }

    if (budgetStatus === 'pending-calibration' && budgets.length !== 0) {
      failures.push(
        'Pending calibration must not contain numeric timing budgets'
      )
    }

    if (budgetStatus !== 'pending-calibration' && budgets.length === 0) {
      failures.push('Declared timing budget status requires budget records')
    }

    const seenBudgetKeys = new Set<string>()
    const knownRunKeys = new Set<string>()
    const runByIdAndHost = new Map<string, Record<string, unknown>>()

    const budgetsByKey = new Map<
      string,
      { readonly medianMs: number; readonly p95Ms: number }
    >()

    for (const candidate of runs) {
      if (!record(candidate)) {
        continue
      }

      const { runId } = candidate
      const { host } = candidate

      if (nonEmpty(runId) && isCalibrationHost(host)) {
        const key = `${host}/${runId}`
        knownRunKeys.add(key)
        runByIdAndHost.set(key, candidate)
      }
    }

    for (const [index, candidate] of budgets.entries()) {
      if (!record(candidate)) {
        failures.push(`Timing budget ${index} must be an object`)
        continue
      }

      const { host } = candidate
      const { workloadId } = candidate
      const { medianMs } = candidate
      const { p95Ms } = candidate
      const { basisRunIds } = candidate

      if (!isCalibrationHost(host)) {
        failures.push(`Timing budget ${index} has unknown host`)
        continue
      }

      if (!nonEmpty(workloadId) || !workloadById.has(workloadId)) {
        failures.push(`Timing budget ${index} has unknown workload`)
        continue
      }

      const key = `${host}/${workloadId}`

      if (seenBudgetKeys.has(key)) {
        failures.push(`Duplicate timing budget for ${key}`)
      }

      seenBudgetKeys.add(key)
      const coverage = workloadById.get(workloadId)?.hostCoverage

      if (
        !record(coverage) ||
        !record(coverage[host]) ||
        coverage[host].status !== 'required'
      ) {
        failures.push(`Timing budget declared for unsupported ${key}`)
      }

      if (
        !finite(medianMs) ||
        medianMs <= 0 ||
        !finite(p95Ms) ||
        p95Ms < medianMs
      ) {
        failures.push(`Invalid timing budget values for ${key}`)
      } else {
        budgetsByKey.set(key, { medianMs, p95Ms })
      }

      if (
        !Array.isArray(basisRunIds) ||
        basisRunIds.length < minimumRunCount ||
        basisRunIds.some((runId) => !nonEmpty(runId)) ||
        new Set(basisRunIds).size !== basisRunIds.length
      ) {
        failures.push(`Invalid basis run IDs for timing budget ${key}`)
        continue
      }

      for (const runId of basisRunIds) {
        const runKey = `${host}/${runId}`
        const run = runByIdAndHost.get(runKey)

        if (!knownRunKeys.has(runKey) || !record(run)) {
          failures.push(`Unknown basis run ${runKey} for timing budget ${key}`)
          continue
        }

        const { measurements } = run

        if (
          !Array.isArray(measurements) ||
          !measurements.some(
            (measurement) =>
              record(measurement) && measurement.workloadId === workloadId
          )
        ) {
          failures.push(
            `Basis run ${runKey} lacks workload ${workloadId} for timing budget`
          )
        }
      }
    }

    if (budgetStatus === 'approved') {
      for (const [host, workloadId] of required) {
        if (!seenBudgetKeys.has(`${host}/${workloadId}`)) {
          failures.push(
            `Approved timing budget missing required cell: ${host}/${workloadId}`
          )
        }
      }
    }

    for (const candidate of runs) {
      if (!record(candidate) || !isCalibrationHost(candidate.host)) {
        continue
      }

      if (!Array.isArray(candidate.measurements)) {
        continue
      }

      for (const measurement of candidate.measurements) {
        if (!record(measurement) || !nonEmpty(measurement.workloadId)) {
          continue
        }

        const key = `${candidate.host}/${measurement.workloadId}`
        const budget = budgetsByKey.get(key)

        if (budget === undefined) {
          continue
        }

        const exceeded: string[] = []

        if (
          finite(measurement.medianMs) &&
          measurement.medianMs > budget.medianMs
        ) {
          exceeded.push(`median ${measurement.medianMs} > ${budget.medianMs}`)
        }

        if (finite(measurement.p95Ms) && measurement.p95Ms > budget.p95Ms) {
          exceeded.push(`p95 ${measurement.p95Ms} > ${budget.p95Ms}`)
        }

        if (exceeded.length > 0) {
          failures.push(
            `Timing budget breached for ${key} in run ${candidate.runId}: ${exceeded.join('; ')}`
          )
        }
      }
    }
  } else {
    failures.push('Timing budgets must be an array')
  }

  return failures
}

// oxlint-disable-next-line complexity -- Environment completeness checks keep the required metadata contract explicit.
const checkEnvironment = (candidate: unknown): boolean => {
  if (!record(candidate)) {
    return false
  }

  const { browser } = candidate
  const { os } = candidate
  const { runtime } = candidate
  const { hardware } = candidate
  const { viewport } = candidate

  return (
    record(browser) &&
    nonEmpty(browser.name) &&
    nonEmpty(browser.version) &&
    record(os) &&
    nonEmpty(os.name) &&
    nonEmpty(os.release) &&
    nonEmpty(os.architecture) &&
    record(runtime) &&
    nonEmpty(runtime.node) &&
    nonEmpty(runtime.bun) &&
    nonEmpty(runtime.playwright) &&
    record(hardware) &&
    nonEmpty(hardware.cpuModel) &&
    integer(hardware.logicalCpuCount) &&
    hardware.logicalCpuCount > 0 &&
    finite(hardware.totalMemoryBytes) &&
    hardware.totalMemoryBytes > 0 &&
    record(viewport) &&
    integer(viewport.width) &&
    viewport.width > 0 &&
    integer(viewport.height) &&
    viewport.height > 0 &&
    finite(viewport.deviceScaleFactor) &&
    viewport.deviceScaleFactor > 0
  )
}

// oxlint-disable-next-line complexity -- Each contract branch adds the exact workload-specific diagnostic required by the registry gate.
const validateMeasurement = (
  measurement: Record<string, unknown>,
  workload: Record<string, unknown>,
  coverage: Record<string, unknown>,
  runKey: string,
  minimumWarmups: number,
  minimumSamples: number,
  failures: string[]
): void => {
  const workloadId = String(workload.id)

  for (const field of [
    'operation',
    'nodeCount',
    'edgeCount',
    'inputLatencyDefinition',
  ] as const) {
    if (measurement[field] !== workload[field]) {
      failures.push(
        `Workload metadata mismatch for ${runKey}/${workloadId}: ${field}`
      )
    }
  }

  for (const field of ['cullingMode', 'minimapMode'] as const) {
    if (measurement[field] !== coverage[field]) {
      failures.push(
        `Host option mismatch for ${runKey}/${workloadId}: ${field}`
      )
    }
  }

  if (
    !integer(measurement.warmupCount) ||
    measurement.warmupCount < minimumWarmups
  ) {
    failures.push(`Insufficient warmups for ${runKey}/${workloadId}`)
  }

  const samples = measurement.samplesMs

  if (
    !Array.isArray(samples) ||
    samples.length < minimumSamples ||
    samples.some((sample) => !finite(sample) || sample < 0)
  ) {
    failures.push(
      `Insufficient or invalid raw samples for ${runKey}/${workloadId}`
    )
  } else {
    if (measurement.medianMs !== percentile(samples, 0.5)) {
      failures.push(
        `Median does not match raw samples for ${runKey}/${workloadId}`
      )
    }

    if (measurement.p95Ms !== percentile(samples, 0.95)) {
      failures.push(
        `p95 does not match raw samples for ${runKey}/${workloadId}`
      )
    }
  }

  const { teardown } = measurement

  if (
    !record(teardown) ||
    teardown.retainedResourceScope !==
      'observable-dom-only; active listener/frame handles are not introspectable' ||
    ![
      'domDescendants',
      'nodeElements',
      'edgeElements',
      'minimapElements',
    ].every((key) => integer(teardown[key]) && teardown[key] >= 0)
  ) {
    failures.push(
      `Missing teardown resource evidence for ${runKey}/${workloadId}`
    )
  }
}

const requiredPairs = (
  workloads: ReadonlyMap<string, Record<string, unknown>>
): (readonly [CalibrationHost, string])[] => {
  const pairs: (readonly [CalibrationHost, string])[] = []

  for (const [id, workload] of workloads) {
    if (!record(workload.hostCoverage)) {
      continue
    }

    for (const host of hosts) {
      const coverage = workload.hostCoverage[host]

      if (record(coverage) && coverage.status === 'required') {
        pairs.push([host, id])
      }
    }
  }

  return pairs
}

const program = Effect.gen(function* checkBenchmarkCalibrationEffect() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(new URL('..', import.meta.url))

  const registry = JSON.parse(
    yield* fileSystem.readFileString(
      path.join(root, 'research/benchmarks/calibration.json')
    )
  )

  const failures = checkBenchmarkCalibration(registry)

  if (failures.length > 0) {
    return yield* Effect.die(new Error(failures.join('\n')))
  }

  if (
    registry.policy?.timingBudgetStatus === 'pending-calibration' &&
    registry.runs.length === 0
  ) {
    const pendingCells = requiredPairs(
      new Map(
        registry.workloads.map((workload: Record<string, unknown>) => [
          workload.id,
          workload,
        ])
      )
    ).length

    yield* Effect.log(
      `Validated benchmark calibration registry: ${pendingCells} host/workload cells pending calibration; 0 runs and 0 timing budgets`
    )
  } else {
    yield* Effect.log(
      `Validated benchmark calibration evidence for ${registry.runs.length} host runs; timing budget status: ${registry.policy?.timingBudgetStatus}`
    )
  }
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}
