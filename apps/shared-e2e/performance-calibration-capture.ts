import type { Page } from '@playwright/test'

import {
  calibrationDocument,
  percentile,
  waitForTwoFrames,
} from './performance-calibration.ts'
import type {
  CalibrationHost,
  CalibrationMeasurement,
  CalibrationWorkload,
} from './performance-calibration.ts'

const mount = async (
  page: Page,
  host: CalibrationHost,
  workload: CalibrationWorkload
): Promise<void> => {
  const documentInput = calibrationDocument(
    workload.nodeCount,
    workload.edgeCount
  )

  await page.evaluate(
    async ({ hostName, input, culling, minimap }) => {
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing calibration host root')
      }

      if (hostName === 'vanilla') {
        // SAFETY: This E2E page installs the Vanilla public controller before capture and this property is optional until then.
        const target = globalThis as typeof globalThis & {
          flowController?: { destroy: () => void }
        }

        target.flowController?.destroy()
        root.replaceChildren()
        const modulePath = '/src/public.ts'
        const { mountFlow } = await import(modulePath)
        target.flowController = mountFlow(root, input, {
          documentMode: 'uncontrolled',
          renderOnlyVisible: culling,
          viewport: {
            initial: { x: 0, y: 0, zoom: 1 },
            limits: { minZoom: 0.5, maxZoom: 2 },
            mode: 'uncontrolled',
          },
          ui: { controls: false, minimap },
        })
      } else if (hostName === 'vue') {
        // SAFETY: Vue's E2E harness is mounted by this capture before any measurement operation.
        const target = window as Window & {
          __flowVueTest?: {
            mountMeasurementDocument: (
              doc: typeof input,
              cull: boolean
            ) => Promise<void>
            destroyMeasurementDocument: () => void
          }
        }

        target.__flowVueTest?.destroyMeasurementDocument()
        await target.__flowVueTest?.mountMeasurementDocument(input, culling)
      } else {
        // SAFETY: Foldkit's E2E harness is mounted by this capture before any measurement operation.
        const target = window as Window & {
          __flowFoldkitTest?: {
            mountMeasurementDocument: (
              doc: typeof input,
              cull: boolean
            ) => Promise<void>
            destroyMeasurementDocument: () => Promise<void>
          }
        }

        await target.__flowFoldkitTest?.destroyMeasurementDocument()
        await target.__flowFoldkitTest?.mountMeasurementDocument(input, culling)
      }
    },
    {
      hostName: host,
      input: documentInput,
      culling: workload.coverage.cullingMode === 'enabled',
      minimap: workload.coverage.minimapMode === 'enabled',
    }
  )
  await waitForTwoFrames(page)
}

const replaceDocument = async (
  page: Page,
  host: CalibrationHost,
  documentInput: ReturnType<typeof calibrationDocument>
): Promise<void> => {
  await page.evaluate(
    ({ hostName, input }) => {
      if (hostName === 'vanilla') {
        // SAFETY: This E2E page mounts the public Vanilla controller before replacement is measured.
        const controller = (
          globalThis as typeof globalThis & {
            flowController?: { update: (doc: typeof input) => void }
          }
        ).flowController

        if (controller === undefined) {
          throw new Error('Missing Vanilla public controller')
        }

        controller.update(input)
      } else if (hostName === 'vue') {
        // SAFETY: Vue's harness method is checked before invocation and delegates to public useFlow.updateDocument.
        const flow = (
          window as Window & {
            __flowVueTest?: { updateDocument: (doc: typeof input) => void }
          }
        ).__flowVueTest

        if (flow === undefined) {
          throw new Error('Missing Vue public editor')
        }

        flow.updateDocument(input)
      } else {
        // SAFETY: Foldkit's public runtime is checked before invoking its document replacement action.
        const flow = (
          window as Window & {
            __flowFoldkitTest?: { replaceDocument: (doc: typeof input) => void }
          }
        ).__flowFoldkitTest

        if (flow === undefined) {
          throw new Error('Missing Foldkit public runtime')
        }

        flow.replaceDocument(input)
      }
    },
    { hostName: host, input: documentInput }
  )
}

const measureDocumentReplacement = (
  page: Page,
  host: CalibrationHost,
  workload: CalibrationWorkload
): Promise<number[]> => {
  const documentInput = calibrationDocument(
    workload.nodeCount,
    workload.edgeCount
  )

  return page.evaluate(
    async ({ hostName, input, warmups, sampleCount }) => {
      const replace = () => {
        if (hostName === 'vanilla') {
          // SAFETY: This E2E page mounts the public Vanilla controller before replacement is measured.
          const controller = (
            globalThis as typeof globalThis & {
              flowController?: { update: (doc: typeof input) => void }
            }
          ).flowController

          if (controller === undefined) {
            throw new Error('Missing Vanilla public controller')
          }

          controller.update(input)
        } else if (hostName === 'vue') {
          // SAFETY: Vue's harness method is checked before invocation and delegates to public useFlow.updateDocument.
          const flow = (
            window as Window & {
              __flowVueTest?: { updateDocument: (doc: typeof input) => void }
            }
          ).__flowVueTest

          if (flow === undefined) {
            throw new Error('Missing Vue public editor')
          }

          flow.updateDocument(input)
        } else {
          // SAFETY: Foldkit's public runtime is checked before invoking its document replacement action.
          const flow = (
            window as Window & {
              __flowFoldkitTest?: {
                replaceDocument: (doc: typeof input) => void
              }
            }
          ).__flowFoldkitTest

          if (flow === undefined) {
            throw new Error('Missing Foldkit public runtime')
          }

          flow.replaceDocument(input)
        }
      }

      const framesAfterUpdate = 2

      const afterPaint = async () => {
        /* oxlint-disable no-await-in-loop -- The measured workload requires two consecutive animation frames. */
        for (let frame = 0; frame < framesAfterUpdate; frame += 1) {
          // oxlint-disable-next-line promise/avoid-new -- rAF is the browser's only frame-completion signal.
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              resolve()
            })
          })
        }
        /* oxlint-enable no-await-in-loop */
      }

      for (let index = 0; index < warmups; index += 1) {
        replace()
        // oxlint-disable-next-line no-await-in-loop -- Each replacement must settle across two frames before the next warmup.
        await afterPaint()
      }

      const samples: number[] = []

      for (let index = 0; index < sampleCount; index += 1) {
        const start = performance.now()
        replace()
        samples.push(performance.now() - start)
        // oxlint-disable-next-line no-await-in-loop -- Samples are intentionally sequential to prevent overlapping DOM updates.
        await afterPaint()
      }

      return samples
    },
    {
      hostName: host,
      input: documentInput,
      warmups: 5,
      sampleCount: 20,
    }
  )
}

const measurePointerLatency = async (
  page: Page,
  host: CalibrationHost,
  warmups: number,
  sampleCount: number
): Promise<number[]> => {
  const target = page.locator('[data-node-id="n0"]').first()
  const bounds = await target.boundingBox()

  if (bounds === null) {
    throw new Error(`${host} calibration drag node is not rendered`)
  }

  await page.evaluate(() => {
    // SAFETY: This capture owns the temporary window fields and creates them before the first pointer event.
    const latencyStateWindow = window as Window & {
      __flowCalibrationPointerLatency?: number[]
      __flowCalibrationPointerLatencyCleanup?: () => void
    }

    latencyStateWindow.__flowCalibrationPointerLatencyCleanup?.()
    latencyStateWindow.__flowCalibrationPointerLatency = []

    const listener = () => {
      const started = performance.now()
      requestAnimationFrame(() =>
        latencyStateWindow.__flowCalibrationPointerLatency?.push(
          performance.now() - started
        )
      )
    }

    latencyStateWindow.__flowCalibrationPointerLatencyCleanup = () => {
      document.removeEventListener('pointermove', listener, true)
      delete latencyStateWindow.__flowCalibrationPointerLatencyCleanup
    }

    document.addEventListener('pointermove', listener, true)
  })

  try {
    /* oxlint-disable no-await-in-loop -- Every synthetic drag must finish before the next can begin. */
    for (let index = 0; index < warmups; index += 1) {
      const current = await target.boundingBox()

      if (current === null) {
        throw new Error('Warmup drag node has no bounds')
      }

      const x = current.x + current.width / 2
      const y = current.y + current.height / 2
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + 2, y + 1, { steps: 1 })
      await page.mouse.up()
      await waitForTwoFrames(page)
    }
    /* oxlint-enable no-await-in-loop */

    const current = await target.boundingBox()

    if (current === null) {
      throw new Error('Measured drag node has no bounds')
    }

    const x = current.x + current.width / 2
    const y = current.y + current.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()

    /* oxlint-disable no-await-in-loop -- Pointer samples must be dispatched and awaited one at a time. */
    for (let index = 0; index < sampleCount; index += 1) {
      await page.mouse.move(x + (index % 2 === 0 ? 2 : 3), y + 1, {
        steps: 1,
      })
      await waitForTwoFrames(page)
    }
    /* oxlint-enable no-await-in-loop */

    await page.mouse.up()
    await waitForTwoFrames(page)

    return await page.evaluate((count) => {
      // SAFETY: The listener setup above owns and initializes this temporary window state.
      const capturedLatencyState = window as Window & {
        __flowCalibrationPointerLatency?: number[]
        __flowCalibrationPointerLatencyCleanup?: () => void
      }

      const samples = capturedLatencyState.__flowCalibrationPointerLatency ?? []
      capturedLatencyState.__flowCalibrationPointerLatencyCleanup?.()
      delete capturedLatencyState.__flowCalibrationPointerLatency

      return samples.slice(-count)
    }, sampleCount)
  } finally {
    await page.evaluate(() => {
      // SAFETY: The listener setup above owns these optional temporary fields; optional access makes cleanup idempotent.
      const capturedLatencyState = window as Window & {
        __flowCalibrationPointerLatency?: number[]
        __flowCalibrationPointerLatencyCleanup?: () => void
      }

      capturedLatencyState.__flowCalibrationPointerLatencyCleanup?.()
      delete capturedLatencyState.__flowCalibrationPointerLatency
    })
  }
}

const teardown = async (
  page: Page,
  host: CalibrationHost
): Promise<CalibrationMeasurement['teardown']> => {
  const teardownHandle = await page.evaluateHandle(async (hostName) => {
    if (hostName === 'vanilla') {
      // SAFETY: The Vanilla public controller was mounted by this capture and its destroy method is optional during cleanup.
      const target = globalThis as typeof globalThis & {
        flowController?: { destroyAsync: () => Promise<void> }
      }

      await target.flowController?.destroyAsync()
    } else if (hostName === 'vue') {
      // SAFETY: The Vue test harness exposes its idempotent measurement teardown method.
      const vueWindow = window as Window & {
        __flowVueTest?: { destroyMeasurementDocument: () => void }
      }

      vueWindow.__flowVueTest?.destroyMeasurementDocument()
    } else {
      // SAFETY: The Foldkit test harness exposes its asynchronous measurement teardown method.
      await (
        window as Window & {
          __flowFoldkitTest?: {
            destroyMeasurementDocument: () => Promise<void>
          }
        }
      ).__flowFoldkitTest?.destroyMeasurementDocument()
    }
  }, host)

  await teardownHandle.dispose()

  await waitForTwoFrames(page)

  return page.locator('#app').evaluate((root) => ({
    retainedResourceScope:
      'observable-dom-only; active listener/frame handles are not introspectable' as const,
    domDescendants: root.querySelectorAll('*').length,
    nodeElements: root.querySelectorAll('[data-node-id]').length,
    edgeElements: root.querySelectorAll(
      '.flow-edge-group, [data-testid="flow-edge"]'
    ).length,
    minimapElements: root.querySelectorAll('.flow-minimap').length,
  }))
}

export const captureWorkload = async (
  page: Page,
  host: CalibrationHost,
  workload: CalibrationWorkload
): Promise<CalibrationMeasurement> => {
  await mount(page, host, workload)
  const warmupCount = 5

  const samplesMs =
    workload.operation === 'synchronousDocumentReplacement'
      ? await measureDocumentReplacement(page, host, workload)
      : await measurePointerLatency(page, host, warmupCount, 20)

  if (
    samplesMs.length < 20 ||
    samplesMs.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(
      `Invalid raw timing samples for ${host}/${workload.id}: ${samplesMs.length}`
    )
  }

  const retained = await teardown(page, host)

  return {
    workloadId: workload.id,
    operation: workload.operation,
    nodeCount: workload.nodeCount,
    edgeCount: workload.edgeCount,
    cullingMode: workload.coverage.cullingMode,
    minimapMode: workload.coverage.minimapMode,
    warmupCount,
    samplesMs,
    medianMs: percentile(samplesMs, 0.5),
    p95Ms: percentile(samplesMs, 0.95),
    inputLatencyDefinition: workload.inputLatencyDefinition,
    teardown: retained,
  }
}

export const updateByHost = replaceDocument
