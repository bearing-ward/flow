import { Exit } from 'effect'

import { createFlowHost } from '../../../apps/vanilla/src/public.ts'
// Composition harness deliberately exercises the application's real runtime factory.
// oxlint-disable-next-line anti-slop-effect/no-service-constructor-imports
import { makeBrowserRuntime } from '../../../apps/vanilla/src/telemetry.ts'
import { decodeFlowDocument } from '../../../packages/core/src/public.ts'

let cleanup: (() => Promise<void>) | undefined

export const start = async (endpoint: string, serviceName: string) => {
  const runtime = makeBrowserRuntime({
    VITE_OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
    // Keep every batch buffered until explicit disposal, proving shutdown flush.
    VITE_OTEL_EXPORT_INTERVAL_MS: '3600000',
    VITE_OTEL_SERVICE_NAME: serviceName,
    VITE_OTEL_SERVICE_VERSION: 'collector-gate',
  })

  try {
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing collector gate mount')
    }

    const initial = await runtime.runPromise(
      decodeFlowDocument({
        edges: [],
        nodes: [
          {
            id: 'collector-node',
            label: 'Gate fixture',
            position: { x: 10, y: 20 },
          },
        ],
      })
    )

    const host = await runtime.runPromise(
      createFlowHost(root, initial, {
        documentMode: 'uncontrolled',
        viewport: {
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { maxZoom: 2, minZoom: 0.5 },
          mode: 'uncontrolled',
        },
        runEffect: runtime.runSync,
        runPromise: runtime.runPromise,
        runTelemetry: (effect) => {
          runtime.runFork(effect)
        },
      })
    )

    try {
      const failure = await runtime.runPromiseExit(
        decodeFlowDocument({
          edges: [],
          nodes: [
            {
              id: 'duplicate',
              label: 'Fixture duplicate',
              position: { x: 0, y: 0 },
            },
            {
              id: 'duplicate',
              label: 'Fixture duplicate',
              position: { x: 1, y: 1 },
            },
          ],
        })
      )

      if (Exit.isSuccess(failure)) {
        throw new Error('Decode failure did not reject')
      }

      const result = await host.applyEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'collector-node',
            patch: { label: 'Edited fixture' },
          },
        ],
      })

      host.update(result.document)

      const node = root.querySelector<HTMLElement>(
        '[data-node-id="collector-node"]'
      )

      if (node === null || !node.textContent?.includes('Edited fixture')) {
        throw new Error('Public edit did not render')
      }

      cleanup = async () => {
        try {
          await host.destroyAsync()
        } finally {
          await runtime.dispose()
        }
      }
    } catch (error) {
      await host.destroyAsync()
      throw error
    }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}

export const finish = async () => {
  if (cleanup === undefined) {
    throw new Error('Collector fixture is not mounted')
  }

  const close = cleanup
  cleanup = undefined
  await close()
}
