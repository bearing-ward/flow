import { expect, test } from '@playwright/test'

import { captureWorkload } from '../../shared-e2e/performance-calibration-capture.ts'
import {
  appendCalibrationRun,
  calibrationEnvironment,
  calibrationWorkloads,
  newRunId,
  sourceRevision,
} from '../../shared-e2e/performance-calibration.ts'
import type { CalibrationMeasurement } from '../../shared-e2e/performance-calibration.ts'

test('records a warmed Vue performance calibration run', async ({
  browser,
  page,
}, testInfo) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
  })
  const workloads = calibrationWorkloads('vue')
  const measurements: CalibrationMeasurement[] = []

  for (const workload of workloads) {
    testInfo.setTimeout(testInfo.timeout + 600_000)
    const started = performance.now()
    console.log(`FLOW_CALIBRATION_START vue/${workload.id}`)
    // oxlint-disable-next-line no-await-in-loop -- Capture each workload serially to avoid host and registry cross-contamination.
    measurements.push(await captureWorkload(page, 'vue', workload))
    console.log(
      `FLOW_CALIBRATION_COMPLETE vue/${workload.id} ${Math.round(performance.now() - started)}ms`
    )
  }

  const source = sourceRevision()

  const run = {
    runId: newRunId(),
    host: 'vue' as const,
    command: 'bun run test:conformance:vue -- performance-calibration.e2e.ts',
    sourceRevision: source.revision,
    sourceTreeState: source.treeState,
    environment: await calibrationEnvironment(browser, page),
    measurements,
  }

  await appendCalibrationRun(run)
  console.log(`FLOW_PERFORMANCE_CALIBRATION ${JSON.stringify(run)}`)
  expect(measurements).toHaveLength(workloads.length)
})
