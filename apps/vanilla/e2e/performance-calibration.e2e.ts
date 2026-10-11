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

test('records a warmed Vanilla performance calibration run', async ({
  browser,
  page,
}) => {
  test.setTimeout(900_000)
  await page.goto('/')
  const workloads = calibrationWorkloads('vanilla')
  const measurements: CalibrationMeasurement[] = []

  for (const workload of workloads) {
    // oxlint-disable-next-line no-await-in-loop -- Capture each workload serially to avoid host and registry cross-contamination.
    measurements.push(await captureWorkload(page, 'vanilla', workload))
  }

  for (const measurement of measurements) {
    expect(measurement.teardown).toMatchObject({
      domDescendants: 0,
      edgeElements: 0,
      minimapElements: 0,
      nodeElements: 0,
    })
  }

  const source = sourceRevision()

  const run = {
    runId: newRunId(),
    host: 'vanilla' as const,
    command: 'bun run test:browser -- performance-calibration.e2e.ts',
    sourceRevision: source.revision,
    sourceTreeState: source.treeState,
    environment: await calibrationEnvironment(browser, page),
    measurements,
  }

  await appendCalibrationRun(run)
  console.log(`FLOW_PERFORMANCE_CALIBRATION ${JSON.stringify(run)}`)
  expect(measurements).toHaveLength(workloads.length)
})
